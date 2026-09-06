import {FocusEvaluator} from "./focus-evaluator";
import {FocusGraphValidationError} from "./focus-graph-validator";
import type {
  EvaluatedFocusNode,
  FocusDocumentLike,
  FocusEvaluation,
  FocusNode,
  FocusProgress
} from "./focus-types";

const NODE_WIDTH = 124;
const NODE_HEIGHT = 58;
const TIER_HEIGHT = 108;
const PADDING = 10;

export interface FocusTreeNodeView {
  readonly id: string;
  readonly abilityUuid: string;
  readonly abilityName: string;
  readonly descriptionExcerpt: string;
  readonly descriptionHtml: string;
  readonly tier: number;
  readonly state: EvaluatedFocusNode["state"];
  readonly stateLabel: string;
  readonly reason: EvaluatedFocusNode["reason"];
  readonly requiredTier: number;
  readonly reachableFrom: readonly string[];
  readonly missingAbility: boolean;
  readonly missingOwnedAbility: boolean;
  readonly isOwned: boolean;
  readonly advisoryUnavailable: boolean;
  readonly tierLocked: boolean;
  readonly prerequisiteLocked: boolean;
  readonly invalidProgression: boolean;
  readonly canAcquire: boolean;
  readonly canRestoreAbility: boolean;
  readonly canUndoAcquisition: boolean;
  readonly canGmMarkOwned: boolean;
  readonly canGmRemoveOwned: boolean;
  readonly primaryAction:
    | "openFocusNode"
    | "acquireFocusNode"
    | "undoFocusAcquisition"
    | "selectFocusEditorNode"
    | "completeFocusConnection";
  readonly selected: boolean;
  readonly connectionSource: boolean;
  readonly xPercent: number;
  readonly width: number;
  readonly height: number;
}

export interface FocusTreeView {
  readonly focusUuid: string;
  readonly focusName: string;
  readonly markerId: string;
  readonly mode: "focus" | "progression" | "editor";
  readonly editor: boolean;
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly FocusTreeNodeView[];
  readonly connections: readonly {
    readonly id: string;
    readonly from: string;
    readonly to: string;
  }[];
  readonly tiers: readonly {
    readonly tier: number;
    readonly top: number;
    readonly nodes: readonly FocusTreeNodeView[];
  }[];
  readonly diagnostics: readonly {readonly severity: string; readonly message: string}[];
  readonly invalid: boolean;
}

export type FocusAbilityResolver = (uuid: string) => Promise<{
  readonly name: string;
  readonly description?: string;
  readonly relativeTo?: unknown;
  readonly sheet?: {render(force?: boolean): unknown};
} | null>;

const foundryAbilityResolver: FocusAbilityResolver = async (uuid) => {
  if (!uuid) return null;
  try {
    const document = await fromUuid(uuid);
    if (!document || typeof document !== "object" || !("name" in document)) return null;
    const ability = document as {
      name: string;
      _source?: {system?: {description?: unknown}};
      system?: {description?: unknown};
      sheet?: {render(force?: boolean): unknown};
    };
    const description = ability._source?.system?.description;
    return {
      name: ability.name,
      ...(typeof description === "string" ? {description} : {}),
      relativeTo: document,
      ...(ability.sheet ? {sheet: ability.sheet} : {})
    };
  } catch {
    return null;
  }
};

export type FocusDescriptionEnricher = (
  description: string,
  relativeTo?: unknown
) => Promise<string>;

const foundryDescriptionEnricher: FocusDescriptionEnricher = async (description, relativeTo) => {
  if (typeof foundry === "undefined" || !foundry.applications?.ux?.TextEditor?.implementation) {
    return description;
  }
  return foundry.applications.ux.TextEditor.implementation.enrichHTML(description, relativeTo
    ? {async: true, relativeTo: relativeTo as Item}
    : {async: true});
};

/** Responsive slots ordered by the logical position.x preference. */
export function horizontalPercentages(nodes: readonly FocusNode[]): ReadonlyMap<string, number> {
  const result = new Map<string, number>();
  const byTier = new Map<number, FocusNode[]>();
  for (const node of nodes) {
    const entries = byTier.get(node.tier) ?? [];
    entries.push(node);
    byTier.set(node.tier, entries);
  }
  for (const entries of byTier.values()) {
    const sorted = [...entries].sort((left, right) => {
      const leftX = left.position?.x;
      const rightX = right.position?.x;
      if (leftX !== null && leftX !== undefined && rightX !== null && rightX !== undefined) {
        return leftX - rightX || left.id.localeCompare(right.id);
      }
      if (leftX !== null && leftX !== undefined) return -1;
      if (rightX !== null && rightX !== undefined) return 1;
      return left.id.localeCompare(right.id);
    });
    sorted.forEach((node, index) => result.set(node.id, ((index + 1) / (sorted.length + 1)) * 100));
  }
  return result;
}

export function focusDescriptionExcerpt(description: string, maximumLength = 120): string {
  const text = description
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maximumLength) return text;
  return `${text.slice(0, Math.max(0, maximumLength - 1)).trimEnd()}…`;
}

export class FocusTreeRenderer {
  readonly #evaluator: FocusEvaluator;
  readonly #resolveAbility: FocusAbilityResolver;
  readonly #enrichDescription: FocusDescriptionEnricher;

  constructor(
    evaluator = new FocusEvaluator(),
    resolveAbility: FocusAbilityResolver = foundryAbilityResolver,
    enrichDescription: FocusDescriptionEnricher = foundryDescriptionEnricher
  ) {
    this.#evaluator = evaluator;
    this.#resolveAbility = resolveAbility;
    this.#enrichDescription = enrichDescription;
  }

  async prepare(
    focus: FocusDocumentLike,
    options: {
      readonly characterTier?: number;
      readonly progress?: FocusProgress;
      readonly editable?: boolean;
      readonly missingOwnedNodeIds?: ReadonlySet<string>;
      /** Legacy input retained for callers; normal presentation intentionally ignores it. */
      readonly pendingFocusChoices?: readonly unknown[];
      readonly gmOverrideAllowed?: boolean;
      readonly gmProgressionEdit?: boolean;
      readonly editor?: {
        readonly selectedNodeId?: string | null;
        readonly connectionSourceNodeId?: string | null;
      };
    } = {}
  ): Promise<FocusTreeView> {
    const tier = options.characterTier ?? Number.MAX_SAFE_INTEGER;
    const progress = options.progress ?? {focusUuid: focus.uuid, ownedNodeIds: []};
    const missingOwnedNodeIds = options.missingOwnedNodeIds ?? new Set<string>();
    let evaluation: FocusEvaluation;
    try {
      evaluation = this.#evaluator.evaluateProgress(focus.system.graph, tier, progress);
    } catch (error) {
      if (!(error instanceof FocusGraphValidationError)) throw error;
      if (options.progress) {
        const owned = new Set(progress.ownedNodeIds);
        evaluation = {
          characterTier: tier,
          ownedNodeIds: [...owned],
          diagnostics: error.diagnostics,
          nodes: focus.system.graph.nodes.map((node): EvaluatedFocusNode => ({
            node,
            state: owned.has(node.id) ? "owned" : node.tier > tier ? "future" : "available",
            reason: owned.has(node.id) ? "owned" : node.tier > tier ? "tier-too-low" : "tier-one-choice",
            requiredTier: node.tier,
            reachableFrom: []
          })).sort((left, right) => left.node.tier - right.node.tier || left.node.id.localeCompare(right.node.id))
        };
      } else {
      return {
        focusUuid: focus.uuid,
        focusName: focus.name,
        markerId: `focus-arrow-${focus.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`,
        mode: options.editor ? "editor" : options.progress ? "progression" : "focus",
        editor: Boolean(options.editor),
        width: 0,
        height: 0,
        nodes: [],
        connections: [],
        tiers: [],
        diagnostics: error.diagnostics,
        invalid: true
      };
      }
    }

    const positions = horizontalPercentages(evaluation.nodes.map((entry) => entry.node));
    const maximumTier = options.editor
      ? 6
      : Math.max(1, ...evaluation.nodes.map((entry) => entry.node.tier));
    const nodesPerTier = new Map<number, number>();
    for (const entry of evaluation.nodes) {
      nodesPerTier.set(entry.node.tier, (nodesPerTier.get(entry.node.tier) ?? 0) + 1);
    }
    const width = Math.max(440, ...[...nodesPerTier.values()].map((count) => (
      count * NODE_WIDTH + (count + 1) * PADDING
    )));
    const nodeViews = await Promise.all(evaluation.nodes.map(async (entry): Promise<FocusTreeNodeView> => {
      const ability = await this.#resolveAbility(entry.node.abilityUuid);
      const missingOwnedAbility = entry.state === "owned" && missingOwnedNodeIds.has(entry.node.id);
      const description = ability?.description ?? entry.node.abilitySnapshot.description ?? "";
      const invalidProgression = evaluation.diagnostics.some((diagnostic) => (
        (diagnostic.code === "invalid-owned-progression" && diagnostic.nodeId === entry.node.id)
        || (diagnostic.severity === "error" && (!diagnostic.nodeId || diagnostic.nodeId === entry.node.id))
      ));
      const tierLocked = entry.state !== "owned" && entry.node.tier > tier;
      const prerequisiteLocked = entry.state !== "owned" && entry.reason === "no-owned-prerequisite";
      const advisoryUnavailable = entry.state !== "owned" && (
        entry.state !== "available" || invalidProgression
      );
      const progressionPrimaryAction = options.editable && options.progress && !options.gmProgressionEdit
        ? entry.state === "owned" ? "undoFocusAcquisition" : "acquireFocusNode"
        : "openFocusNode";
      return {
        id: entry.node.id,
        abilityUuid: entry.node.abilityUuid,
        abilityName: ability?.name || entry.node.abilitySnapshot.name || entry.node.id,
        descriptionExcerpt: focusDescriptionExcerpt(description),
        descriptionHtml: await this.#enrichDescription(description, ability?.relativeTo ?? focus),
        tier: entry.node.tier,
        state: entry.state,
        stateLabel: `CYPHERV2.Focus.State.${entry.state}`,
        reason: entry.reason,
        requiredTier: entry.requiredTier,
        reachableFrom: entry.reachableFrom,
        missingAbility: !ability,
        missingOwnedAbility,
        isOwned: entry.state === "owned",
        advisoryUnavailable,
        tierLocked,
        prerequisiteLocked,
        invalidProgression,
        canAcquire: Boolean(
          options.editable && options.progress && !options.gmProgressionEdit
          && entry.state !== "owned"
        ),
        canRestoreAbility: Boolean(options.editable && options.progress && missingOwnedAbility),
        canUndoAcquisition: Boolean(
          options.editable && options.progress && entry.state === "owned" && !options.gmProgressionEdit
        ),
        canGmMarkOwned: Boolean(
          options.editable && options.progress && options.gmOverrideAllowed
          && options.gmProgressionEdit && entry.state !== "owned"
        ),
        canGmRemoveOwned: Boolean(
          options.editable && options.progress && options.gmOverrideAllowed
          && options.gmProgressionEdit && entry.state === "owned"
        ),
        primaryAction: options.editor?.connectionSourceNodeId
          ? "completeFocusConnection"
          : options.editor
            ? "selectFocusEditorNode"
            : progressionPrimaryAction,
        selected: options.editor?.selectedNodeId === entry.node.id,
        connectionSource: options.editor?.connectionSourceNodeId === entry.node.id,
        xPercent: positions.get(entry.node.id) ?? 50,
        width: NODE_WIDTH,
        height: NODE_HEIGHT
      };
    }));
    const connections = focus.system.graph.connections.map(({id, from, to}) => ({id, from, to}));
    return {
      focusUuid: focus.uuid,
      focusName: focus.name,
      markerId: `focus-arrow-${focus.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`,
      mode: options.editor ? "editor" : options.progress ? "progression" : "focus",
      editor: Boolean(options.editor),
      width,
      height: maximumTier * TIER_HEIGHT,
      nodes: nodeViews,
      connections,
      tiers: Array.from({length: maximumTier}, (_, index) => {
        const tier = index + 1;
        return {
          tier,
          top: index * TIER_HEIGHT,
          nodes: nodeViews
            .filter((node) => node.tier === tier)
            .sort((left, right) => left.xPercent - right.xPercent || left.id.localeCompare(right.id))
        };
      }),
      diagnostics: evaluation.diagnostics,
      invalid: false
    };
  }
}
