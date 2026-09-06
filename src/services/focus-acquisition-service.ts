import {FocusEvaluator} from "../focus/focus-evaluator";
import {FocusGraphValidationError} from "../focus/focus-graph-validator";
import type {
  FocusAcquisitionRecord,
  FocusDocumentLike,
  FocusNode,
  FocusProgress
} from "../focus/focus-types";
import type {PendingFocusChoice} from "../advancement/advancement-types";
import {effectiveTier} from "../rules/core/character-overrides";
import {
  findGrantConflict,
  grantIdentity,
  hasGrantConflict,
  GrantConflictCancelledError,
  type GrantConflict,
  type GrantConflictResolver,
  type GrantDocumentLike
} from "../packages/grant-conflicts";

export interface EmbeddedFocusAbilityLike {
  readonly id: string;
  readonly type: string;
  readonly name?: string;
  readonly system: {
    readonly sourceFocusUuid?: string;
    readonly sourceNodeId?: string;
    readonly grantedBy?: {
      readonly contentUuid?: string;
      readonly contentKey?: string;
    };
  };
  delete?(): Promise<unknown>;
}

export interface FocusCharacterLike {
  readonly id: string;
  readonly uuid: string;
  readonly type: string;
  readonly system: {
    readonly tier: number;
    readonly xp: number;
    readonly focusProgress: readonly FocusProgress[];
    readonly advancement: {
      readonly pendingFocusChoices: readonly PendingFocusChoice[];
    };
  };
  readonly items: Iterable<EmbeddedFocusAbilityLike>;
  update(changes: Record<string, unknown>): Promise<unknown>;
  createEmbeddedDocuments(
    type: string,
    data: Record<string, unknown>[],
    operation?: Record<string, unknown>
  ): Promise<unknown[]>;
}

export interface FocusSourceAbilityLike {
  readonly type: string;
  readonly name: string;
  readonly img?: string;
  readonly system: Record<string, unknown>;
  toObject?(): Record<string, unknown>;
}

export type FocusSourceAbilityResolver = (uuid: string) => Promise<FocusSourceAbilityLike | null>;

export type FocusAcquisitionErrorCode =
  | "not-character"
  | "node-not-found"
  | "progress-missing"
  | "progress-duplicated"
  | "not-eligible"
  | "choice-required"
  | "restore-not-owned"
  | "undo-not-owned"
  | "undo-dependent-nodes"
  | "duplicate-grant"
  | "ability-data-unavailable";

export class FocusAcquisitionError extends Error {
  readonly code: FocusAcquisitionErrorCode;
  readonly dependentNodeIds: readonly string[];

  constructor(code: FocusAcquisitionErrorCode, message: string, dependentNodeIds: readonly string[] = []) {
    super(message);
    this.name = "FocusAcquisitionError";
    this.code = code;
    this.dependentNodeIds = dependentNodeIds;
  }
}

export interface FocusAcquisitionResult {
  readonly status: "acquired" | "already-owned";
  readonly abilityCreated: boolean;
}

export interface FocusRestorationResult {
  readonly status: "restored" | "already-present";
  readonly abilityCreated: boolean;
}

export interface FocusUndoOptions {
  readonly deleteAbility?: boolean;
  readonly force?: boolean;
}

export interface FocusUndoResult {
  readonly choiceRestored: PendingFocusChoice | null;
  readonly abilityDeleted: boolean;
  readonly invalidOwnedNodeIds: readonly string[];
}

const foundrySourceResolver: FocusSourceAbilityResolver = async (uuid) => {
  if (!uuid) return null;
  try {
    const document = await fromUuid(uuid);
    if (!document || typeof document !== "object" || !("type" in document)) return null;
    const item = document as FocusSourceAbilityLike;
    return item.type === "ability" ? item : null;
  } catch {
    return null;
  }
};

function progressionMatches(progress: FocusProgress, focus: FocusDocumentLike): boolean {
  return progress.focusUuid === focus.uuid || progress.focusUuid === focus.id;
}

function provenanceMatches(
  ability: EmbeddedFocusAbilityLike,
  focusUuid: string,
  nodeId: string
): boolean {
  return ability.type === "ability"
    && ability.system.sourceFocusUuid === focusUuid
    && ability.system.sourceNodeId === nodeId;
}

/** Stable Foundry embedded-document ID scoped by the provenance pair. */
export function focusAbilityDocumentId(focusUuid: string, nodeId: string): string {
  const input = `${focusUuid}\u0000${nodeId}`;
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193) >>> 0;
    second = Math.imul(second ^ (code + index), 0x85ebca6b) >>> 0;
  }
  return `${first.toString(16).padStart(8, "0")}${second.toString(16).padStart(8, "0")}`;
}

export class FocusAcquisitionService {
  readonly #evaluator: FocusEvaluator;
  readonly #resolveSource: FocusSourceAbilityResolver;
  readonly #now: () => number;
  readonly #operations = new Map<string, Promise<unknown>>();

  constructor(
    evaluator = new FocusEvaluator(),
    resolveSource: FocusSourceAbilityResolver = foundrySourceResolver,
    now: () => number = Date.now
  ) {
    this.#evaluator = evaluator;
    this.#resolveSource = resolveSource;
    this.#now = now;
  }

  missingOwnedNodeIds(
    actor: FocusCharacterLike,
    focus: FocusDocumentLike,
    progress: FocusProgress
  ): ReadonlySet<string> {
    const embedded = [...actor.items];
    return new Set(progress.ownedNodeIds.filter((nodeId) => !embedded.some((ability) => (
      provenanceMatches(ability, focus.uuid, nodeId)
    ))));
  }

  async acquire(
    actor: FocusCharacterLike,
    focus: FocusDocumentLike,
    nodeId: string,
    conflictResolver?: GrantConflictResolver
  ): Promise<FocusAcquisitionResult> {
    return this.#exclusive(this.#key(actor), () => (
      this.#acquireLocked(actor, focus, nodeId, false, true, conflictResolver)
    ));
  }

  /** Character-facing permissive acquisition. Pending choices remain untouched. */
  async acquireManual(
    actor: FocusCharacterLike,
    focus: FocusDocumentLike,
    nodeId: string,
    conflictResolver?: GrantConflictResolver
  ): Promise<FocusAcquisitionResult> {
    return this.#exclusive(this.#key(actor), () => (
      this.#acquireLocked(actor, focus, nodeId, false, false, conflictResolver)
    ));
  }

  /** Explicit GM-only sheet action; callers must enforce GM authorization. */
  async acquireWithGmOverride(
    actor: FocusCharacterLike,
    focus: FocusDocumentLike,
    nodeId: string
  ): Promise<FocusAcquisitionResult> {
    return this.#exclusive(this.#key(actor), () => (
      this.#acquireLocked(actor, focus, nodeId, true, false)
    ));
  }

  /** GM repair/import action. It intentionally bypasses both eligibility and choices. */
  async markOwnedWithGmOverride(
    actor: FocusCharacterLike,
    focus: FocusDocumentLike,
    nodeId: string
  ): Promise<FocusAcquisitionResult> {
    return this.#exclusive(this.#key(actor), () => (
      this.#markOwnedLocked(actor, focus, nodeId)
    ));
  }

  async undo(
    actor: FocusCharacterLike,
    focus: FocusDocumentLike,
    nodeId: string,
    options: FocusUndoOptions = {}
  ): Promise<FocusUndoResult> {
    return this.#exclusive(this.#key(actor), () => (
      this.#undoLocked(actor, focus, nodeId, options)
    ));
  }

  hasEmbeddedAbility(actor: FocusCharacterLike, focusUuid: string, nodeId: string): boolean {
    return Boolean(this.#embeddedAbility(actor, focusUuid, nodeId));
  }

  async restoreAbility(
    actor: FocusCharacterLike,
    focus: FocusDocumentLike,
    nodeId: string
  ): Promise<FocusRestorationResult> {
    return this.#exclusive(this.#key(actor), () => (
      this.#restoreLocked(actor, focus, nodeId)
    ));
  }

  async #acquireLocked(
    actor: FocusCharacterLike,
    focus: FocusDocumentLike,
    nodeId: string,
    gmOverride: boolean,
    consumeChoice: boolean,
    conflictResolver?: GrantConflictResolver
  ): Promise<FocusAcquisitionResult> {
    this.#assertCharacter(actor);
    const node = this.#node(focus, nodeId);
    const progress = this.#progress(actor, focus);
    if (progress.ownedNodeIds.includes(nodeId)) {
      return {status: "already-owned", abilityCreated: false};
    }

    let evaluated;
    try {
      evaluated = this.#evaluator.evaluateProgress(focus.system.graph, effectiveTier(actor.system), progress)
        .nodes.find((entry) => entry.node.id === nodeId);
    } catch (error) {
      if (!(error instanceof FocusGraphValidationError)) throw error;
      // A malformed graph remains diagnostic information, not a blocker for
      // explicit Character ownership changes.
    }
    const choice = actor.system.advancement.pendingFocusChoices.find((entry) => (
      entry.focusUuid === ""
      || entry.focusUuid === focus.uuid
      || entry.focusUuid === focus.id
    ));
    // Availability remains fully evaluated for guidance, diagnostics, and normal
    // choice consumption. An authorized sheet action may still acquire an
    // advisory-unavailable node, but it is recorded explicitly as an override.
    const normalAcquisition = consumeChoice && !gmOverride
      && evaluated?.state === "available" && Boolean(choice);

    let abilityCreated = false;
    let conflictOverridden = false;
    let createdDocument: EmbeddedFocusAbilityLike | null = null;
    if (!this.#embeddedAbility(actor, focus.uuid, nodeId)) {
      const data = await this.#abilityData(focus, node);
      // Source resolution is asynchronous: check again before creating.
      if (!this.#embeddedAbility(actor, focus.uuid, nodeId)) {
        const conflict = this.#focusConflict(actor, focus, node, data);
        if (conflict) {
          if (!conflictResolver) {
            throw new FocusAcquisitionError(
              "duplicate-grant",
              `Focus node '${nodeId}' grants an Ability already present on this Character; choose a replacement with the GM.`
            );
          }
          const resolution = await conflictResolver(conflict);
          if (resolution.action === "cancel") throw new GrantConflictCancelledError();
          if (resolution.action !== "gmOverride") {
            throw new FocusAcquisitionError(
              "duplicate-grant",
              "A Focus node cannot be replaced by an arbitrary Ability. Choose another valid node or use an explicit GM Override."
            );
          }
          conflictOverridden = true;
        } else {
          createdDocument = await this.#createAbility(actor, focus, nodeId, data);
          abilityCreated = Boolean(createdDocument);
        }
      }
    }

    const latestProgress = this.#progress(actor, focus);
    if (!latestProgress.ownedNodeIds.includes(nodeId)) {
      const nextProgress = actor.system.focusProgress.map((entry) => (
        progressionMatches(entry, focus)
          ? {
            ...entry,
            ownedNodeIds: [...entry.ownedNodeIds, nodeId],
            acquisitions: [
              ...(entry.acquisitions ?? []),
              this.#acquisitionRecord(
                nodeId,
                gmOverride || conflictOverridden
                  ? "gmOverride"
                  : normalAcquisition
                    ? "choice"
                    : "manualOverride",
                normalAcquisition ? choice : null
              )
            ]
          }
          : {...entry, ownedNodeIds: [...entry.ownedNodeIds], acquisitions: [...(entry.acquisitions ?? [])]}
      ));
      try {
        await actor.update({
          "system.focusProgress": nextProgress,
          ...(normalAcquisition && !conflictOverridden && choice ? {
            "system.advancement.pendingFocusChoices": actor.system.advancement.pendingFocusChoices
              .filter((entry) => entry.id !== choice.id)
          } : {})
        });
      } catch (error) {
        if (createdDocument?.delete) await createdDocument.delete();
        throw error;
      }
    }
    return {status: "acquired", abilityCreated};
  }

  async #markOwnedLocked(
    actor: FocusCharacterLike,
    focus: FocusDocumentLike,
    nodeId: string
  ): Promise<FocusAcquisitionResult> {
    this.#assertCharacter(actor);
    const node = this.#node(focus, nodeId);
    const progress = this.#progress(actor, focus);
    if (progress.ownedNodeIds.includes(nodeId)) {
      return {status: "already-owned", abilityCreated: false};
    }

    let createdDocument: EmbeddedFocusAbilityLike | null = null;
    if (!this.#embeddedAbility(actor, focus.uuid, nodeId)) {
      const data = await this.#abilityData(focus, node);
      if (!this.#embeddedAbility(actor, focus.uuid, nodeId)) {
        createdDocument = await this.#createAbility(actor, focus, nodeId, data);
      }
    }
    const nextProgress = actor.system.focusProgress.map((entry) => progressionMatches(entry, focus)
      ? {
        ...entry,
        ownedNodeIds: [...entry.ownedNodeIds, nodeId],
        acquisitions: [
          ...(entry.acquisitions ?? []),
          this.#acquisitionRecord(nodeId, "gmManual", null)
        ]
      }
      : {...entry, ownedNodeIds: [...entry.ownedNodeIds], acquisitions: [...(entry.acquisitions ?? [])]});
    try {
      await actor.update({"system.focusProgress": nextProgress});
    } catch (error) {
      if (createdDocument?.delete) await createdDocument.delete();
      throw error;
    }
    return {status: "acquired", abilityCreated: Boolean(createdDocument)};
  }

  async #undoLocked(
    actor: FocusCharacterLike,
    focus: FocusDocumentLike,
    nodeId: string,
    options: FocusUndoOptions
  ): Promise<FocusUndoResult> {
    this.#assertCharacter(actor);
    this.#node(focus, nodeId);
    const progress = this.#progress(actor, focus);
    if (!progress.ownedNodeIds.includes(nodeId)) {
      throw new FocusAcquisitionError("undo-not-owned", `Focus node '${nodeId}' is not owned.`);
    }
    const remainingOwnedNodeIds = progress.ownedNodeIds.filter((id) => id !== nodeId);
    const beforeInvalid = new Set(this.#invalidOwnedNodeIds(
      focus, effectiveTier(actor.system), progress.ownedNodeIds
    ));
    const afterInvalid = this.#invalidOwnedNodeIds(focus, effectiveTier(actor.system), remainingOwnedNodeIds);
    const dependentNodeIds = afterInvalid.filter((id) => !beforeInvalid.has(id));
    if (dependentNodeIds.length > 0 && !options.force) {
      throw new FocusAcquisitionError(
        "undo-dependent-nodes",
        `Undo would invalidate acquired descendant nodes: ${dependentNodeIds.join(", ")}.`,
        dependentNodeIds
      );
    }

    const record = (progress.acquisitions ?? []).find((entry) => entry.nodeId === nodeId);
    const choiceRestored = record && record.choiceSource !== "none" && record.choiceId
      ? {
        id: record.choiceId,
        source: record.choiceSource,
        grantTier: record.choiceGrantTier,
        focusUuid: record.choiceFocusUuid
      } satisfies PendingFocusChoice
      : null;
    const nextProgress = actor.system.focusProgress.map((entry) => progressionMatches(entry, focus)
      ? {
        ...entry,
        ownedNodeIds: remainingOwnedNodeIds,
        acquisitions: (entry.acquisitions ?? []).filter((acquisition) => acquisition.nodeId !== nodeId)
      }
      : {...entry, ownedNodeIds: [...entry.ownedNodeIds], acquisitions: [...(entry.acquisitions ?? [])]});
    const nextChoices = choiceRestored
      && !actor.system.advancement.pendingFocusChoices.some((choice) => choice.id === choiceRestored.id)
      ? [...actor.system.advancement.pendingFocusChoices, choiceRestored]
      : [...actor.system.advancement.pendingFocusChoices];
    await actor.update({
      "system.focusProgress": nextProgress,
      "system.advancement.pendingFocusChoices": nextChoices
    });

    let abilityDeleted = false;
    if (options.deleteAbility) {
      const ability = this.#embeddedAbility(actor, focus.uuid, nodeId);
      if (ability?.delete) {
        await ability.delete();
        abilityDeleted = true;
      }
    }
    return {choiceRestored, abilityDeleted, invalidOwnedNodeIds: afterInvalid};
  }

  #invalidOwnedNodeIds(
    focus: FocusDocumentLike,
    tier: number,
    ownedNodeIds: readonly string[]
  ): readonly string[] {
    try {
      return this.#evaluator.invalidOwnedNodeIds(focus.system.graph, tier, ownedNodeIds);
    } catch (error) {
      if (error instanceof FocusGraphValidationError) return [];
      throw error;
    }
  }

  async #restoreLocked(
    actor: FocusCharacterLike,
    focus: FocusDocumentLike,
    nodeId: string
  ): Promise<FocusRestorationResult> {
    this.#assertCharacter(actor);
    const node = this.#node(focus, nodeId);
    const progress = this.#progress(actor, focus);
    if (!progress.ownedNodeIds.includes(nodeId)) {
      throw new FocusAcquisitionError(
        "restore-not-owned",
        `Focus node '${nodeId}' is not owned and cannot be restored.`
      );
    }
    if (this.#embeddedAbility(actor, focus.uuid, nodeId)) {
      return {status: "already-present", abilityCreated: false};
    }

    const data = await this.#abilityData(focus, node);
    if (this.#embeddedAbility(actor, focus.uuid, nodeId)) {
      return {status: "already-present", abilityCreated: false};
    }
    const abilityCreated = Boolean(await this.#createAbility(actor, focus, nodeId, data));
    return {
      status: abilityCreated ? "restored" : "already-present",
      abilityCreated
    };
  }

  async #abilityData(
    focus: FocusDocumentLike,
    node: FocusNode
  ): Promise<Record<string, unknown>> {
    const source = await this.#resolveSource(node.abilityUuid);
    if (source?.type === "ability" && source.name.trim()) {
      const raw = source.toObject?.() ?? {};
      const rawSystem = raw.system && typeof raw.system === "object"
        ? raw.system as Record<string, unknown>
        : source.system;
      return {
        _id: focusAbilityDocumentId(focus.uuid, node.id),
        name: source.name,
        type: "ability",
        ...(typeof source.img === "string" ? {img: source.img} : {}),
        system: {
          ...structuredClone(rawSystem),
          sourceFocusUuid: focus.uuid,
          sourceNodeId: node.id,
          grantedBy: {kind: "focus", sourceUuid: focus.uuid, instanceId: focus.uuid, grantId: node.id, status: "active", contentUuid: node.abilityUuid, contentKey: `ability:${source.name.trim().toLocaleLowerCase()}`}
        }
      };
    }

    const snapshotName = node.abilitySnapshot.name.trim();
    if (!snapshotName) {
      throw new FocusAcquisitionError(
        "ability-data-unavailable",
        `Focus node '${node.id}' has neither a valid source Ability nor a usable snapshot.`
      );
    }
    return {
      _id: focusAbilityDocumentId(focus.uuid, node.id),
      name: snapshotName,
      type: "ability",
      system: {
        tier: node.tier,
        description: node.abilitySnapshot.description ?? "",
        sourceFocusUuid: focus.uuid,
        sourceNodeId: node.id,
        grantedBy: {kind: "focus", sourceUuid: focus.uuid, instanceId: focus.uuid, grantId: node.id, status: "active", contentUuid: node.abilityUuid, contentKey: `ability:${snapshotName.toLocaleLowerCase()}`}
      }
    };
  }

  #embeddedAbility(
    actor: FocusCharacterLike,
    focusUuid: string,
    nodeId: string
  ): EmbeddedFocusAbilityLike | null {
    return [...actor.items].find((ability) => provenanceMatches(ability, focusUuid, nodeId)) ?? null;
  }

  #acquisitionRecord(
    nodeId: string,
    mode: FocusAcquisitionRecord["mode"],
    choice: PendingFocusChoice | null | undefined
  ): FocusAcquisitionRecord {
    return {
      nodeId,
      mode,
      choiceId: choice?.id ?? "",
      choiceSource: choice?.source ?? "none",
      choiceGrantTier: choice?.grantTier ?? 1,
      choiceFocusUuid: choice?.focusUuid ?? "",
      acquiredAt: this.#now()
    };
  }

  #focusConflict(
    actor: FocusCharacterLike,
    focus: FocusDocumentLike,
    node: FocusNode,
    data: Record<string, unknown>
  ): GrantConflict | null {
    const system = (data.system ?? {}) as Record<string, unknown>;
    const provenance = (system.grantedBy ?? {}) as {contentUuid?: string; contentKey?: string};
    const identity = grantIdentity("ability", String(data.name ?? node.abilitySnapshot.name), String(provenance.contentUuid ?? node.abilityUuid));
    const existing = findGrantConflict(actor.items as unknown as Iterable<GrantDocumentLike>, identity);
    if (!existing) return null;
    const existingSystem = existing.system ?? {};
    const existingProvenance = (existingSystem.grantedBy ?? {}) as {contentUuid?: string; contentKey?: string};
    const existingIdentity = grantIdentity("ability", existing.name ?? "", String(existingProvenance.contentUuid ?? ""));
    return {
      id: `${focus.uuid}:${node.id}`,
      type: "ability",
      packageName: focus.name,
      packageSourceUuid: focus.uuid,
      grantId: node.id,
      existing: {
        id: String((existing as {id?: string}).id ?? existingIdentity.contentKey),
        name: String(existing.name ?? ""),
        type: "ability",
        rank: "",
        contentUuid: String(existingProvenance.contentUuid ?? existingIdentity.contentUuid),
        contentKey: String(existingProvenance.contentKey ?? existingIdentity.contentKey)
      },
      proposed: {
        id: focusAbilityDocumentId(focus.uuid, node.id),
        name: String(data.name ?? node.abilitySnapshot.name),
        type: "ability",
        rank: "",
        contentUuid: identity.contentUuid,
        contentKey: identity.contentKey
      },
      suggestions: [],
      allowCustom: false,
      allowSuppress: false,
      allowGmOverride: true,
      context: "focus"
    };
  }

  async #createAbility(
    actor: FocusCharacterLike,
    focus: FocusDocumentLike,
    nodeId: string,
    data: Record<string, unknown>
  ): Promise<EmbeddedFocusAbilityLike | null> {
    const system = (data.system ?? {}) as Record<string, unknown>;
    const provenance = (system.grantedBy ?? {}) as {contentUuid?: string; contentKey?: string};
    if (hasGrantConflict(actor.items as unknown as Iterable<GrantDocumentLike>, {
      type: "ability",
      contentUuid: String(provenance.contentUuid ?? ""),
      contentKey: String(provenance.contentKey ?? `ability:${String(data.name ?? "").trim().toLocaleLowerCase()}`)
    })) {
      throw new FocusAcquisitionError(
        "duplicate-grant",
        `Focus node '${nodeId}' grants an Ability already present on this Character; choose a replacement with the GM.`
      );
    }
    try {
      const created = await actor.createEmbeddedDocuments("Item", [data], {keepId: true});
      return created[0] as EmbeddedFocusAbilityLike | undefined ?? null;
    } catch (error) {
      // A concurrent owner may have won the same deterministic-ID creation.
      if (this.#embeddedAbility(actor, focus.uuid, nodeId)) return null;
      throw error;
    }
  }

  #progress(actor: FocusCharacterLike, focus: FocusDocumentLike): FocusProgress {
    const matches = actor.system.focusProgress.filter((entry) => progressionMatches(entry, focus));
    if (matches.length === 0) {
      throw new FocusAcquisitionError(
        "progress-missing",
        `Character has no progression entry for Focus '${focus.uuid}'.`
      );
    }
    if (matches.length > 1) {
      throw new FocusAcquisitionError(
        "progress-duplicated",
        `Character has duplicate progression entries for Focus '${focus.uuid}'.`
      );
    }
    return matches[0]!;
  }

  #node(focus: FocusDocumentLike, nodeId: string): FocusNode {
    const node = focus.system.graph.nodes.find((entry) => entry.id === nodeId);
    if (!node) {
      throw new FocusAcquisitionError("node-not-found", `Focus node '${nodeId}' was not found.`);
    }
    return node;
  }

  #assertCharacter(actor: FocusCharacterLike): void {
    if (actor.type !== "character") {
      throw new FocusAcquisitionError("not-character", "Focus acquisition requires a Character.");
    }
  }

  #key(actor: FocusCharacterLike): string {
    // All progression writes for one Character are serialized so simultaneous
    // acquisitions from different Foci cannot overwrite each other's arrays.
    return actor.uuid;
  }

  async #exclusive<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.#operations.get(key) ?? Promise.resolve();
    const current = previous.catch(() => undefined).then(operation);
    this.#operations.set(key, current);
    try {
      return await current;
    } finally {
      if (this.#operations.get(key) === current) this.#operations.delete(key);
    }
  }
}
