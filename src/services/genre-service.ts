import type {PendingGenreChoice} from "../advancement/advancement-types";
import type {
  GenreAbilityEntry,
  GenreAssociationData,
  GenreAssociationProvenance,
  GenreDocumentLike
} from "../genre/genre-types";
import {
  findGrantConflict,
  grantIdentity,
  GrantConflictCancelledError,
  type GrantConflict,
  type GrantConflictDocument,
  type GrantConflictResolver,
  type GrantDocumentLike
} from "../packages/grant-conflicts";
import type {GrantedByData} from "../packages/package-types";
import {effectiveTier} from "../rules/core/character-overrides";

export type GenreAssociationErrorCode = "not-character" | "not-genre" | "duplicate" | "missing";
export type GenreChoiceErrorCode =
  | "not-character" | "genre-required" | "genre-unavailable" | "choice-missing"
  | "entry-missing" | "entry-ineligible" | "ability-unavailable" | "duplicate-grant";

export class GenreAssociationError extends Error {
  constructor(readonly code: GenreAssociationErrorCode, message: string) {
    super(message);
    this.name = "GenreAssociationError";
  }
}

export class GenreChoiceError extends Error {
  constructor(readonly code: GenreChoiceErrorCode, message: string) {
    super(message);
    this.name = "GenreChoiceError";
  }
}

export interface GenreCharacterLike {
  readonly id: string;
  readonly uuid?: string;
  readonly name?: string;
  readonly type: string;
  readonly items: Iterable<GenreEmbeddedAbilityLike>;
  readonly system: {
    readonly tier: number;
    readonly genre: GenreAssociationData;
    readonly advancement: {readonly pendingGenreChoices: readonly PendingGenreChoice[]};
  };
  update(changes: Record<string, unknown>): Promise<unknown>;
  createEmbeddedDocuments(
    type: string,
    data: Record<string, unknown>[],
    operation?: Record<string, unknown>
  ): Promise<unknown[]>;
}

export interface GenreEmbeddedAbilityLike extends GrantDocumentLike {
  readonly id?: string;
  update?(changes: Record<string, unknown>): Promise<unknown>;
  delete?(): Promise<unknown>;
}

export interface GenreAbilitySourceLike {
  readonly uuid: string;
  readonly name: string;
  readonly type: string;
  readonly img?: string;
  readonly system: Record<string, unknown>;
}

export interface GenreChoiceResult {
  readonly entry: GenreAbilityEntry;
  readonly abilityCreated: boolean;
  readonly conflictOverridden: boolean;
}

export interface GenreManualCatalogEntry {
  readonly id: string;
  readonly name: string;
  readonly minimumTier: number;
  readonly normallyAvailable: boolean;
  readonly owned: boolean;
}

export interface GenreManualUndoResult {
  readonly abilityDeleted: boolean;
  readonly abilityRetained: boolean;
}

type GenreResolver = (uuid: string) => Promise<GenreDocumentLike | null>;
type AbilityResolver = (uuid: string) => Promise<GenreAbilitySourceLike | null>;

function replacement(): GrantedByData["replacement"] {
  return {
    active: false,
    originalName: "",
    originalContentUuid: "",
    originalContentKey: "",
    replacementName: "",
    replacementContentUuid: "",
    replacementContentKey: "",
    selectionKind: "none"
  };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class GenreService {
  readonly #resolveGenre: GenreResolver;
  readonly #resolveAbility: AbilityResolver;
  readonly #idFactory: () => string;
  readonly #now: () => number;
  readonly #operations = new Map<string, Promise<unknown>>();

  constructor(
    resolveGenre: GenreResolver = async (uuid) => await fromUuid(uuid) as GenreDocumentLike | null,
    resolveAbility: AbilityResolver = async (uuid) => await fromUuid(uuid) as GenreAbilitySourceLike | null,
    idFactory: () => string = () => globalThis.crypto?.randomUUID?.() ?? `genre-${Date.now()}-${Math.random()}`,
    now: () => number = Date.now
  ) {
    this.#resolveGenre = resolveGenre;
    this.#resolveAbility = resolveAbility;
    this.#idFactory = idFactory;
    this.#now = now;
  }

  async attach(
    actor: GenreCharacterLike,
    genre: GenreDocumentLike,
    provenance: GenreAssociationProvenance = "manual"
  ): Promise<GenreAssociationData> {
    return this.#exclusive(actor, async () => {
      this.#assertCharacter(actor);
      if (genre.type !== "genre" || !genre.uuid) {
        throw new GenreAssociationError("not-genre", "Only a Genre Item can be attached.");
      }
      if (actor.system.genre.sourceUuid === genre.uuid) {
        throw new GenreAssociationError("duplicate", "This Genre is already attached.");
      }
      const association: GenreAssociationData = {
        sourceUuid: genre.uuid,
        instanceId: this.#idFactory(),
        provenance,
        attachedAt: this.#now()
      };
      await actor.update({"system.genre": association});
      return association;
    });
  }

  async remove(actor: GenreCharacterLike): Promise<GenreAssociationData> {
    return this.#exclusive(actor, async () => {
      this.#assertCharacter(actor);
      const previous = clone(actor.system.genre);
      if (!previous.sourceUuid) throw new GenreAssociationError("missing", "No Genre is attached.");
      await actor.update({
        "system.genre.sourceUuid": "",
        "system.genre.instanceId": "",
        "system.genre.provenance": "manual",
        "system.genre.attachedAt": 0
      });
      return previous;
    });
  }

  async active(actor: GenreCharacterLike): Promise<GenreDocumentLike | null> {
    return actor.system.genre.sourceUuid ? this.#resolveGenre(actor.system.genre.sourceUuid) : null;
  }

  eligibleEntries(
    actor: GenreCharacterLike,
    genre: GenreDocumentLike,
    choice: PendingGenreChoice
  ): readonly GenreAbilityEntry[] {
    return genre.system.abilityCatalog.filter((entry) => (
      entry.minimumTier <= effectiveTier(actor.system) && entry.minimumTier <= choice.grantTier
    ));
  }

  manualCatalog(
    actor: GenreCharacterLike,
    genre: GenreDocumentLike
  ): readonly GenreManualCatalogEntry[] {
    return genre.system.abilityCatalog.map((entry) => ({
      id: entry.id,
      name: entry.snapshot.name || entry.id,
      minimumTier: entry.minimumTier,
      normallyAvailable: entry.minimumTier <= effectiveTier(actor.system),
      owned: Boolean(this.#provenanceAbility(actor, genre, actor.system.genre, entry, "active"))
    })).sort((left, right) => left.minimumTier - right.minimumTier || left.name.localeCompare(right.name));
  }

  async acquireManual(
    actor: GenreCharacterLike,
    entryId: string,
    conflictResolver?: GrantConflictResolver
  ): Promise<GenreChoiceResult> {
    return this.#exclusive(actor, async () => {
      this.#assertCharacter(actor);
      const association = actor.system.genre;
      if (!association.sourceUuid) throw new GenreChoiceError("genre-required", "Attach a Genre before acquiring an Ability.");
      const genre = await this.#resolveGenre(association.sourceUuid);
      if (!genre || genre.type !== "genre") throw new GenreChoiceError("genre-unavailable", "The active Genre source is unavailable.");
      const entry = genre.system.abilityCatalog.find((candidate) => candidate.id === entryId);
      if (!entry) throw new GenreChoiceError("entry-missing", "The Genre Ability is no longer in the active Genre catalog.");

      const active = this.#provenanceAbility(actor, genre, association, entry, "active");
      if (active) return {entry, abilityCreated: false, conflictOverridden: false};
      const retained = this.#provenanceAbility(actor, genre, association, entry, "retained");
      if (retained?.update) {
        await retained.update({"system.grantedBy.status": "active"});
        return {entry, abilityCreated: false, conflictOverridden: false};
      }

      const data = await this.#abilityData(genre, association, entry);
      const conflict = this.#conflict(actor, genre, entry, data);
      let conflictOverridden = false;
      if (conflict) {
        if (!conflictResolver) throw new GenreChoiceError("duplicate-grant", "This Ability is already present on the Character.");
        const resolution = await conflictResolver(conflict);
        if (resolution.action === "cancel") throw new GrantConflictCancelledError();
        if (resolution.action !== "gmOverride") {
          throw new GenreChoiceError("duplicate-grant", "A Genre acquisition must use an Ability from its Genre catalog.");
        }
        conflictOverridden = true;
      }
      const created = conflict
        ? undefined
        : (await actor.createEmbeddedDocuments("Item", [data]))[0];
      return {entry, abilityCreated: Boolean(created), conflictOverridden};
    });
  }

  async undoManual(
    actor: GenreCharacterLike,
    entryId: string,
    deleteAbility: boolean
  ): Promise<GenreManualUndoResult> {
    return this.#exclusive(actor, async () => {
      this.#assertCharacter(actor);
      const association = actor.system.genre;
      if (!association.sourceUuid) throw new GenreChoiceError("genre-required", "No active Genre is attached.");
      const genre = await this.#resolveGenre(association.sourceUuid);
      if (!genre || genre.type !== "genre") throw new GenreChoiceError("genre-unavailable", "The active Genre source is unavailable.");
      const entry = genre.system.abilityCatalog.find((candidate) => candidate.id === entryId);
      if (!entry) throw new GenreChoiceError("entry-missing", "The Genre Ability is no longer in the active Genre catalog.");
      const ability = this.#provenanceAbility(actor, genre, association, entry, "active");
      if (!ability) throw new GenreChoiceError("entry-missing", "This Genre Ability is not currently owned.");
      if (deleteAbility) {
        if (!ability.delete) throw new GenreChoiceError("ability-unavailable", "The embedded Genre Ability cannot be deleted.");
        await ability.delete();
        return {abilityDeleted: true, abilityRetained: false};
      }
      if (!ability.update) throw new GenreChoiceError("ability-unavailable", "The embedded Genre Ability cannot be retained.");
      await ability.update({"system.grantedBy.status": "retained"});
      return {abilityDeleted: false, abilityRetained: true};
    });
  }

  async acquire(
    actor: GenreCharacterLike,
    choiceId: string,
    entryId: string,
    conflictResolver?: GrantConflictResolver
  ): Promise<GenreChoiceResult> {
    return this.#exclusive(actor, async () => {
      this.#assertCharacter(actor);
      const association = actor.system.genre;
      if (!association.sourceUuid) throw new GenreChoiceError("genre-required", "Attach a Genre before spending this choice.");
      const genre = await this.#resolveGenre(association.sourceUuid);
      if (!genre || genre.type !== "genre") throw new GenreChoiceError("genre-unavailable", "The active Genre source is unavailable.");
      const choice = actor.system.advancement.pendingGenreChoices.find((entry) => entry.id === choiceId);
      if (!choice) throw new GenreChoiceError("choice-missing", "The pending Genre Choice no longer exists.");
      const entry = genre.system.abilityCatalog.find((candidate) => candidate.id === entryId);
      if (!entry) throw new GenreChoiceError("entry-missing", "The Genre Ability is no longer in the active Genre catalog.");
      if (!this.eligibleEntries(actor, genre, choice).some((candidate) => candidate.id === entry.id)) {
        throw new GenreChoiceError("entry-ineligible", "This Genre Ability is not eligible for the selected choice.");
      }

      const data = await this.#abilityData(genre, association, entry);
      const conflict = this.#conflict(actor, genre, entry, data);
      let conflictOverridden = false;
      if (conflict) {
        if (!conflictResolver) throw new GenreChoiceError("duplicate-grant", "This Ability is already present on the Character.");
        const resolution = await conflictResolver(conflict);
        if (resolution.action === "cancel") throw new GrantConflictCancelledError();
        if (resolution.action !== "gmOverride") {
          throw new GenreChoiceError("duplicate-grant", "A Genre choice must grant an Ability from its Genre catalog.");
        }
        conflictOverridden = true;
      }

      let created: {delete?(): Promise<unknown>} | undefined;
      if (!conflict) {
        created = (await actor.createEmbeddedDocuments("Item", [data]))[0] as {delete?(): Promise<unknown>} | undefined;
      }
      try {
        await actor.update({
          "system.advancement.pendingGenreChoices": actor.system.advancement.pendingGenreChoices
            .filter((candidate) => candidate.id !== choice.id)
        });
      } catch (error) {
        await created?.delete?.();
        throw error;
      }
      return {entry, abilityCreated: Boolean(created), conflictOverridden};
    });
  }

  async #abilityData(
    genre: GenreDocumentLike,
    association: GenreAssociationData,
    entry: GenreAbilityEntry
  ): Promise<Record<string, unknown>> {
    const resolvedSource = entry.abilityUuid ? await this.#resolveAbility(entry.abilityUuid) : null;
    const source = resolvedSource?.type === "ability" ? resolvedSource : null;
    const snapshot = entry.snapshot;
    if (!source && (!snapshot.name || !snapshot.system)) {
      throw new GenreChoiceError("ability-unavailable", "The Genre Ability source and snapshot are unavailable.");
    }
    const name = source?.name ?? snapshot.name;
    const img = source?.img ?? snapshot.img ?? "";
    const sourceSystem = source?.system ?? snapshot.system;
    const identity = grantIdentity("ability", name, entry.abilityUuid || source?.uuid || "");
    const grantedBy: GrantedByData = {
      kind: "genre",
      sourceUuid: genre.uuid,
      instanceId: association.instanceId,
      grantId: entry.id,
      status: "active",
      contentUuid: identity.contentUuid,
      contentKey: identity.contentKey,
      replacement: replacement()
    };
    return {name, img, type: "ability", system: {...clone(sourceSystem), grantedBy}};
  }

  #provenanceAbility(
    actor: GenreCharacterLike,
    genre: GenreDocumentLike,
    association: GenreAssociationData,
    entry: GenreAbilityEntry,
    status: "active" | "retained"
  ): GenreEmbeddedAbilityLike | null {
    return [...actor.items].find((item) => {
      if (item.type !== "ability") return false;
      const provenance = (item.system.grantedBy ?? {}) as Partial<GrantedByData>;
      return provenance.kind === "genre"
        && provenance.sourceUuid === genre.uuid
        && provenance.instanceId === association.instanceId
        && provenance.grantId === entry.id
        && provenance.status === status;
    }) ?? null;
  }

  #conflict(
    actor: GenreCharacterLike,
    genre: GenreDocumentLike,
    entry: GenreAbilityEntry,
    data: Record<string, unknown>
  ): GrantConflict | null {
    const system = data.system as Record<string, unknown>;
    const provenance = system.grantedBy as GrantedByData;
    const identity = grantIdentity("ability", String(data.name), provenance.contentUuid);
    const existing = findGrantConflict(actor.items, identity);
    if (!existing) return null;
    const existingProvenance = (existing.system.grantedBy ?? {}) as Partial<GrantedByData>;
    const existingIdentity = grantIdentity("ability", existing.name, String(existingProvenance.contentUuid ?? ""));
    const document = (value: GrantDocumentLike, id: string, valueIdentity: typeof identity): GrantConflictDocument => ({
      id,
      name: value.name,
      type: "ability",
      rank: "",
      contentUuid: valueIdentity.contentUuid,
      contentKey: valueIdentity.contentKey
    });
    return {
      id: `${genre.uuid}:${entry.id}`,
      type: "ability",
      packageName: genre.name,
      packageSourceUuid: genre.uuid,
      grantId: entry.id,
      existing: document(existing, String((existing as {id?: string}).id ?? existingIdentity.contentKey), existingIdentity),
      proposed: document({type: "ability", name: String(data.name), system}, entry.id, identity),
      suggestions: [],
      allowCustom: false,
      allowSuppress: false,
      allowGmOverride: true,
      context: "genre"
    };
  }

  #assertCharacter(actor: GenreCharacterLike): void {
    if (actor.type !== "character") throw new GenreAssociationError("not-character", "Genre association requires a Character.");
  }

  async #exclusive<T>(actor: GenreCharacterLike, operation: () => Promise<T>): Promise<T> {
    const key = actor.uuid ?? actor.id;
    const previous = this.#operations.get(key) ?? Promise.resolve();
    const current = previous.catch(() => undefined).then(operation);
    this.#operations.set(key, current);
    try { return await current; }
    finally { if (this.#operations.get(key) === current) this.#operations.delete(key); }
  }
}
