import {
  FocusGraphValidationError,
  validateFocusGraph
} from "./focus-graph-validator";
import type {
  FocusConnection,
  FocusGraph,
  FocusGraphDiagnostic,
  FocusNode
} from "./focus-types";

export type FocusTreeEditorErrorCode =
  | "not-ability"
  | "ability-uuid-missing"
  | "node-not-found"
  | "connection-not-found"
  | "invalid-tier"
  | "self-connection"
  | "duplicate-connection"
  | "ability-source-mismatch"
  | "node-not-selected"
  | "unique-id-unavailable";

export class FocusTreeEditorError extends Error {
  constructor(
    readonly code: FocusTreeEditorErrorCode,
    message: string
  ) {
    super(message);
    this.name = "FocusTreeEditorError";
  }
}

export interface FocusEditorAbilityLike {
  readonly uuid: string;
  readonly name: string;
  readonly type: string;
  readonly system?: {readonly description?: unknown};
  readonly _source?: {readonly system?: {readonly description?: unknown}};
}

export interface FocusTreeSaveResult {
  readonly graph: FocusGraph;
  readonly diagnostics: readonly FocusGraphDiagnostic[];
}

export type FocusTreeIdFactory = () => string;
export type FocusTreePersist = (graph: FocusGraph) => Promise<unknown>;

/** Ephemeral selection/connection state. It is never part of system.graph. */
export class FocusTreeEditorInteractionState {
  #selectedNodeId: string | null = null;
  #connectionSourceNodeId: string | null = null;

  get selectedNodeId(): string | null {
    return this.#selectedNodeId;
  }

  get connectionSourceNodeId(): string | null {
    return this.#connectionSourceNodeId;
  }

  select(nodeId: string): void {
    this.#selectedNodeId = nodeId;
  }

  clearSelection(nodeId?: string): void {
    if (nodeId === undefined || this.#selectedNodeId === nodeId) this.#selectedNodeId = null;
    if (nodeId === undefined || this.#connectionSourceNodeId === nodeId) {
      this.#connectionSourceNodeId = null;
    }
  }

  startConnection(): string {
    if (!this.#selectedNodeId) {
      throw new FocusTreeEditorError("node-not-selected", "Select a Focus node before connecting.");
    }
    this.#connectionSourceNodeId = this.#selectedNodeId;
    return this.#connectionSourceNodeId;
  }

  connectionTo(destinationNodeId: string): {readonly from: string; readonly to: string} {
    if (!this.#connectionSourceNodeId) {
      throw new FocusTreeEditorError("node-not-selected", "No source node is selected for the connection.");
    }
    return {from: this.#connectionSourceNodeId, to: destinationNodeId};
  }

  finishConnection(destinationNodeId: string): void {
    this.#selectedNodeId = destinationNodeId;
    this.#connectionSourceNodeId = null;
  }

  cancelConnection(): void {
    this.#connectionSourceNodeId = null;
  }

  reset(): void {
    this.#selectedNodeId = null;
    this.#connectionSourceNodeId = null;
  }
}

function defaultIdFactory(): string {
  return globalThis.crypto?.randomUUID?.().replaceAll("-", "")
    ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

/** Explicit cloning keeps Foundry DataModel proxies out of the editor working copy. */
export function cloneFocusGraph(graph: FocusGraph): FocusGraph {
  return {
    version: graph.version,
    nodes: graph.nodes.map((node) => ({
      id: node.id,
      abilityUuid: node.abilityUuid,
      abilitySnapshot: {
        name: node.abilitySnapshot.name,
        ...(node.abilitySnapshot.description !== undefined
          ? {description: node.abilitySnapshot.description}
          : {})
      },
      tier: node.tier,
      position: {x: node.position.x, y: node.position.y}
    })),
    connections: graph.connections.map((connection) => ({...connection}))
  };
}

function abilitySnapshot(ability: FocusEditorAbilityLike): FocusNode["abilitySnapshot"] {
  const description = ability._source?.system?.description ?? ability.system?.description;
  return {
    name: ability.name,
    description: typeof description === "string" ? description : ""
  };
}

function assertAbility(ability: FocusEditorAbilityLike): void {
  if (ability.type !== "ability") {
    throw new FocusTreeEditorError("not-ability", "Only Ability Items can be added to a Focus Tree.");
  }
  if (!ability.uuid.trim()) {
    throw new FocusTreeEditorError("ability-uuid-missing", "The Ability must have a resolvable UUID.");
  }
}

function assertTier(tier: number): void {
  if (!Number.isInteger(tier) || tier < 1 || tier > 6) {
    throw new FocusTreeEditorError("invalid-tier", "Focus node Tier must be an integer from 1 to 6.");
  }
}

function sortedTierNodes(graph: FocusGraph, tier: number): FocusNode[] {
  return graph.nodes
    .filter((node) => node.tier === tier)
    .sort((left, right) => {
      const leftX = left.position.x ?? Number.MAX_SAFE_INTEGER;
      const rightX = right.position.x ?? Number.MAX_SAFE_INTEGER;
      return leftX - rightX || left.id.localeCompare(right.id);
    });
}

/**
 * A pure Focus Tree editing transaction. All commands mutate only a detached
 * graph copy until save is explicitly asked to persist it.
 */
export class FocusTreeEditorSession {
  readonly #idFactory: FocusTreeIdFactory;
  #persisted: FocusGraph;
  #working: FocusGraph;
  #dirty = false;

  constructor(graph: FocusGraph, idFactory: FocusTreeIdFactory = defaultIdFactory) {
    this.#idFactory = idFactory;
    this.#persisted = cloneFocusGraph(graph);
    this.#working = cloneFocusGraph(graph);
  }

  get graph(): FocusGraph {
    return cloneFocusGraph(this.#working);
  }

  get dirty(): boolean {
    return this.#dirty;
  }

  diagnostics(): readonly FocusGraphDiagnostic[] {
    return validateFocusGraph(this.#working);
  }

  addAbility(ability: FocusEditorAbilityLike, tier = 1): FocusNode {
    assertAbility(ability);
    assertTier(tier);
    const nodes = sortedTierNodes(this.#working, tier);
    const lastX = nodes.reduce((maximum, node) => Math.max(maximum, node.position.x ?? -1), -1);
    const node: FocusNode = {
      id: this.#uniqueId("node", new Set(this.#working.nodes.map((entry) => entry.id))),
      abilityUuid: ability.uuid,
      abilitySnapshot: abilitySnapshot(ability),
      tier,
      position: {x: lastX + 1, y: null}
    };
    this.#working = {...this.#working, nodes: [...this.#working.nodes, node]};
    this.#dirty = true;
    return cloneFocusGraph({...this.#working, nodes: [node]}).nodes[0]!;
  }

  setTier(nodeId: string, tier: number): FocusNode {
    assertTier(tier);
    return this.#replaceNode(nodeId, (node) => ({...node, tier}));
  }

  moveNode(nodeId: string, direction: "left" | "right"): FocusNode {
    const node = this.#node(nodeId);
    const ordered = sortedTierNodes(this.#working, node.tier);
    const currentIndex = ordered.findIndex((entry) => entry.id === nodeId);
    const targetIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= ordered.length) return cloneFocusGraph({
      version: this.#working.version,
      nodes: [node],
      connections: []
    }).nodes[0]!;

    const neighbor = ordered[targetIndex]!;
    const beyond = ordered[direction === "left" ? targetIndex - 1 : targetIndex + 1];
    const neighborX = neighbor.position.x ?? targetIndex;
    const beyondX = beyond?.position.x;
    const x = direction === "left"
      ? beyondX === undefined || beyondX === null ? neighborX - 1 : (beyondX + neighborX) / 2
      : beyondX === undefined || beyondX === null ? neighborX + 1 : (neighborX + beyondX) / 2;
    return this.#replaceNode(nodeId, (entry) => ({
      ...entry,
      position: {...entry.position, x}
    }));
  }

  deleteNode(nodeId: string): {readonly node: FocusNode; readonly removedConnections: number} {
    const node = this.#node(nodeId);
    const connections = this.#working.connections.filter((entry) => (
      entry.from !== nodeId && entry.to !== nodeId
    ));
    const removedConnections = this.#working.connections.length - connections.length;
    this.#working = {
      ...this.#working,
      nodes: this.#working.nodes.filter((entry) => entry.id !== nodeId),
      connections
    };
    this.#dirty = true;
    return {node, removedConnections};
  }

  connect(from: string, to: string): FocusConnection {
    this.#node(from);
    this.#node(to);
    if (from === to) {
      throw new FocusTreeEditorError("self-connection", "A Focus node cannot connect to itself.");
    }
    if (this.#working.connections.some((entry) => entry.from === from && entry.to === to)) {
      throw new FocusTreeEditorError(
        "duplicate-connection",
        `Focus connection '${from}' -> '${to}' already exists.`
      );
    }
    const connection: FocusConnection = {
      id: this.#uniqueId(
        "connection",
        new Set(this.#working.connections.map((entry) => entry.id))
      ),
      from,
      to
    };
    this.#working = {
      ...this.#working,
      connections: [...this.#working.connections, connection]
    };
    this.#dirty = true;
    return {...connection};
  }

  deleteConnection(connectionId: string): FocusConnection {
    const connection = this.#working.connections.find((entry) => entry.id === connectionId);
    if (!connection) {
      throw new FocusTreeEditorError(
        "connection-not-found",
        `Focus connection '${connectionId}' was not found.`
      );
    }
    this.#working = {
      ...this.#working,
      connections: this.#working.connections.filter((entry) => entry.id !== connectionId)
    };
    this.#dirty = true;
    return {...connection};
  }

  clearConnections(): number {
    const removed = this.#working.connections.length;
    if (removed === 0) return 0;
    this.#working = {...this.#working, connections: []};
    this.#dirty = true;
    return removed;
  }

  refreshSnapshot(nodeId: string, ability: FocusEditorAbilityLike): FocusNode {
    assertAbility(ability);
    const node = this.#node(nodeId);
    if (ability.uuid !== node.abilityUuid) {
      throw new FocusTreeEditorError(
        "ability-source-mismatch",
        "The refreshed Ability does not match the node source UUID."
      );
    }
    return this.#replaceNode(nodeId, (entry) => ({
      ...entry,
      abilitySnapshot: abilitySnapshot(ability)
    }));
  }

  cancel(): FocusGraph {
    this.#working = cloneFocusGraph(this.#persisted);
    this.#dirty = false;
    return this.graph;
  }

  async save(persist: FocusTreePersist): Promise<FocusTreeSaveResult> {
    const diagnostics = validateFocusGraph(this.#working);
    const errors = diagnostics.filter((entry) => entry.severity === "error");
    if (errors.length > 0) throw new FocusGraphValidationError(errors);
    const graph = this.graph;
    await persist(graph);
    this.#persisted = cloneFocusGraph(graph);
    this.#working = cloneFocusGraph(graph);
    this.#dirty = false;
    return {graph, diagnostics};
  }

  #node(nodeId: string): FocusNode {
    const node = this.#working.nodes.find((entry) => entry.id === nodeId);
    if (!node) {
      throw new FocusTreeEditorError("node-not-found", `Focus node '${nodeId}' was not found.`);
    }
    return node;
  }

  #replaceNode(nodeId: string, replacement: (node: FocusNode) => FocusNode): FocusNode {
    const original = this.#node(nodeId);
    const updated = replacement(original);
    this.#working = {
      ...this.#working,
      nodes: this.#working.nodes.map((entry) => entry.id === nodeId ? updated : entry)
    };
    this.#dirty = true;
    return cloneFocusGraph({version: this.#working.version, nodes: [updated], connections: []}).nodes[0]!;
  }

  #uniqueId(prefix: string, existing: ReadonlySet<string>): string {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const suffix = this.#idFactory().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24);
      const candidate = `${prefix}-${suffix}`;
      if (suffix && !existing.has(candidate)) return candidate;
    }
    throw new FocusTreeEditorError(
      "unique-id-unavailable",
      `Unable to generate a unique ${prefix} ID.`
    );
  }
}
