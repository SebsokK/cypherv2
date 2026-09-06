import {describe, expect, it, vi} from "vitest";

import {FocusEvaluator} from "../../src/focus/focus-evaluator";
import {FocusGraphValidationError} from "../../src/focus/focus-graph-validator";
import {
  FocusTreeEditorInteractionState,
  FocusTreeEditorError,
  FocusTreeEditorSession,
  type FocusEditorAbilityLike
} from "../../src/focus/focus-tree-editor";
import type {FocusGraph} from "../../src/focus/focus-types";

const emptyGraph = (): FocusGraph => ({version: 1, nodes: [], connections: []});

function ability(
  uuid: string,
  name = uuid,
  description = `<p>${name} description</p>`
): FocusEditorAbilityLike {
  return {uuid, name, type: "ability", system: {description}};
}

function sequentialIds(...ids: string[]): () => string {
  let index = 0;
  return () => ids[index++] ?? `generated-${index}`;
}

describe("FocusTreeEditorSession", () => {
  it("starts with a valid empty Focus graph and does not persist merely by opening", () => {
    const session = new FocusTreeEditorSession(emptyGraph());
    expect(session.graph).toEqual({version: 1, nodes: [], connections: []});
    expect(session.diagnostics()).toEqual([]);
    expect(session.dirty).toBe(false);
  });

  it("clears only working-copy connections, restores them on Cancel, and persists on Save", async () => {
    const initial: FocusGraph = {
      version: 1,
      nodes: [
        {id: "a", abilityUuid: "Item.a", abilitySnapshot: {name: "A"}, tier: 1, position: {x: 0, y: null}},
        {id: "b", abilityUuid: "Item.b", abilitySnapshot: {name: "B"}, tier: 2, position: {x: 0, y: null}}
      ],
      connections: [{id: "a-b", from: "a", to: "b"}]
    };
    const session = new FocusTreeEditorSession(initial);
    expect(session.clearConnections()).toBe(1);
    expect(session.graph.nodes).toEqual(initial.nodes);
    expect(session.graph.connections).toEqual([]);
    expect(initial.connections).toHaveLength(1);

    expect(session.cancel()).toEqual(initial);
    session.clearConnections();
    let persisted: FocusGraph | undefined;
    await session.save(async (graph) => { persisted = graph; });
    expect(persisted).toEqual({...initial, connections: []});
    expect(session.dirty).toBe(false);
  });

  it("adds only Abilities with unique stable node IDs and a current snapshot", () => {
    const session = new FocusTreeEditorSession(
      emptyGraph(),
      sequentialIds("first", "second")
    );
    const sourceA = ability("Item.a", "Ability A", "<p>Original A</p>");
    const sourceB = ability("Item.b", "Ability B", "<p>Original B</p>");
    const first = session.addAbility(sourceA, 2);
    const second = session.addAbility(sourceB, 2);

    expect(first).toMatchObject({
      id: "node-first",
      abilityUuid: "Item.a",
      abilitySnapshot: {name: "Ability A", description: "<p>Original A</p>"},
      tier: 2,
      position: {x: 0, y: null}
    });
    expect(second.id).toBe("node-second");
    expect(second.id).not.toBe(first.id);

    session.setTier(first.id, 4);
    session.refreshSnapshot(first.id, ability("Item.a", "Ability A revised"));
    expect(session.graph.nodes.find((node) => node.id === first.id)).toMatchObject({
      id: first.id,
      abilityUuid: "Item.a",
      tier: 4
    });
  });

  it("rejects a dropped Item that is not an Ability", () => {
    const session = new FocusTreeEditorSession(emptyGraph());
    expect(() => session.addAbility({
      uuid: "Item.weapon",
      name: "Not an Ability",
      type: "weapon"
    })).toThrowError(expect.objectContaining<Partial<FocusTreeEditorError>>({code: "not-ability"}));
    expect(session.graph.nodes).toEqual([]);
  });

  it("changes Tier and horizontal order without changing node identity, links, or source Ability", () => {
    const sourceA = ability("Item.a", "A");
    const sourceB = ability("Item.b", "B");
    const sourceBefore = structuredClone(sourceA);
    const session = new FocusTreeEditorSession(emptyGraph(), sequentialIds("a", "b", "ab"));
    const a = session.addAbility(sourceA, 1);
    const b = session.addAbility(sourceB, 1);
    const link = session.connect(a.id, b.id);

    session.moveNode(b.id, "left");
    const moved = session.graph.nodes.find((node) => node.id === b.id)!;
    expect(moved.id).toBe(b.id);
    expect(moved.abilityUuid).toBe("Item.b");
    expect(moved.position.x).toBeLessThan(a.position.x!);
    expect(session.graph.connections).toEqual([link]);

    session.setTier(b.id, 6);
    expect(session.graph.nodes.find((node) => node.id === b.id)?.tier).toBe(6);
    expect(session.graph.connections).toEqual([link]);
    expect(sourceA).toEqual(sourceBefore);
  });

  it("creates explicit A -> B and B -> A links and rejects duplicates and self-links", () => {
    const session = new FocusTreeEditorSession(
      emptyGraph(),
      sequentialIds("a", "b", "ab", "ba")
    );
    const a = session.addAbility(ability("Item.a"));
    const b = session.addAbility(ability("Item.b"));
    expect(session.connect(a.id, b.id)).toMatchObject({
      id: "connection-ab",
      from: a.id,
      to: b.id
    });
    expect(session.connect(b.id, a.id)).toMatchObject({
      id: "connection-ba",
      from: b.id,
      to: a.id
    });
    expect(() => session.connect(a.id, b.id)).toThrowError(
      expect.objectContaining<Partial<FocusTreeEditorError>>({code: "duplicate-connection"})
    );
    expect(() => session.connect(a.id, a.id)).toThrowError(
      expect.objectContaining<Partial<FocusTreeEditorError>>({code: "self-connection"})
    );
  });

  it("deletes one connection without affecting its nodes", () => {
    const session = new FocusTreeEditorSession(
      emptyGraph(),
      sequentialIds("a", "b", "ab")
    );
    const a = session.addAbility(ability("Item.a"));
    const b = session.addAbility(ability("Item.b"));
    const connection = session.connect(a.id, b.id);
    session.deleteConnection(connection.id);
    expect(session.graph.nodes.map((node) => node.id)).toEqual([a.id, b.id]);
    expect(session.graph.connections).toEqual([]);
  });

  it("deletes a node and every incident connection but no unrelated connection", () => {
    const session = new FocusTreeEditorSession(
      emptyGraph(),
      sequentialIds("a", "b", "c", "ab", "ba", "bc")
    );
    const a = session.addAbility(ability("Item.a"));
    const b = session.addAbility(ability("Item.b"));
    const c = session.addAbility(ability("Item.c"));
    session.connect(a.id, b.id);
    session.connect(b.id, a.id);
    const unrelated = session.connect(b.id, c.id);

    const result = session.deleteNode(a.id);
    expect(result.removedConnections).toBe(2);
    expect(session.graph.nodes.map((node) => node.id)).toEqual([b.id, c.id]);
    expect(session.graph.connections).toEqual([unrelated]);
  });

  it("refreshes only the stored snapshot", () => {
    const source = ability("Item.a", "Original", "<p>Original</p>");
    const sourceBefore = structuredClone(source);
    const session = new FocusTreeEditorSession(emptyGraph(), sequentialIds("a"));
    const node = session.addAbility(source, 3);
    const refreshedSource = ability("Item.a", "Revised", "<p>Revised</p>");
    const refreshedBefore = structuredClone(refreshedSource);

    const refreshed = session.refreshSnapshot(node.id, refreshedSource);
    expect(refreshed).toMatchObject({
      id: node.id,
      abilityUuid: node.abilityUuid,
      tier: 3,
      position: node.position,
      abilitySnapshot: {name: "Revised", description: "<p>Revised</p>"}
    });
    expect(source).toEqual(sourceBefore);
    expect(refreshedSource).toEqual(refreshedBefore);
  });

  it("cancels all working-copy changes without persistence", async () => {
    const persist = vi.fn(async () => undefined);
    const session = new FocusTreeEditorSession(emptyGraph(), sequentialIds("a"));
    session.addAbility(ability("Item.a"));
    expect(session.dirty).toBe(true);
    expect(session.cancel()).toEqual(emptyGraph());
    expect(session.dirty).toBe(false);
    expect(persist).not.toHaveBeenCalled();
  });

  it("validates and persists the entire graph with one coherent Save Tree update", async () => {
    const persist = vi.fn(async () => undefined);
    const session = new FocusTreeEditorSession(
      emptyGraph(),
      sequentialIds("a", "b", "ab")
    );
    const a = session.addAbility(ability("Item.a"));
    const b = session.addAbility(ability("Item.b"));
    session.connect(a.id, b.id);

    const result = await session.save(persist);
    expect(result.diagnostics).toEqual([]);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith(result.graph);
    expect(session.dirty).toBe(false);
  });

  it("refuses an invalid graph and does not call persistence", async () => {
    const duplicateNode = {
      id: "duplicate",
      abilityUuid: "Item.a",
      abilitySnapshot: {name: "A"},
      tier: 1,
      position: {x: 0, y: null}
    } as const;
    const invalid: FocusGraph = {
      version: 1,
      nodes: [duplicateNode, {...duplicateNode}],
      connections: []
    };
    const persist = vi.fn(async () => undefined);
    const session = new FocusTreeEditorSession(invalid);
    await expect(session.save(persist)).rejects.toBeInstanceOf(FocusGraphValidationError);
    expect(persist).not.toHaveBeenCalled();
  });

  it("shows a longer directed-cycle warning but allows Save Tree", async () => {
    const persist = vi.fn(async () => undefined);
    const session = new FocusTreeEditorSession(
      emptyGraph(),
      sequentialIds("a", "b", "c", "ab", "bc", "ca")
    );
    const a = session.addAbility(ability("Item.a"));
    const b = session.addAbility(ability("Item.b"));
    const c = session.addAbility(ability("Item.c"));
    session.connect(a.id, b.id);
    session.connect(b.id, c.id);
    session.connect(c.id, a.id);

    const result = await session.save(persist);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      severity: "warning",
      code: "directed-cycle"
    }));
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("leaves Character progress and Ability sources untouched when a node becomes orphaned", async () => {
    const source = ability("Item.a", "A");
    const sourceBefore = structuredClone(source);
    const character = {
      tier: 3,
      focusProgress: [{focusUuid: "Item.focus", ownedNodeIds: ["node-a"]}]
    };
    const characterBefore = structuredClone(character);
    const initial: FocusGraph = {
      version: 1,
      nodes: [{
        id: "node-a",
        abilityUuid: source.uuid,
        abilitySnapshot: {name: source.name},
        tier: 1,
        position: {x: 0, y: null}
      }],
      connections: []
    };
    const session = new FocusTreeEditorSession(initial);
    session.deleteNode("node-a");
    await session.save(async () => undefined);

    const evaluation = new FocusEvaluator().evaluateCharacterFocus(
      session.graph,
      character,
      "Item.focus"
    );
    expect(evaluation.ownedNodeIds).toEqual(["node-a"]);
    expect(evaluation.diagnostics).toContainEqual(expect.objectContaining({
      severity: "warning",
      code: "unknown-owned-node",
      nodeId: "node-a"
    }));
    expect(character).toEqual(characterBefore);
    expect(source).toEqual(sourceBefore);
  });
});

describe("FocusTreeEditorInteractionState", () => {
  it("selects exactly one node at a time without changing the working graph", () => {
    const session = new FocusTreeEditorSession(emptyGraph(), sequentialIds("a", "b"));
    const a = session.addAbility(ability("Item.a"));
    const b = session.addAbility(ability("Item.b"));
    const graphBefore = session.graph;
    const state = new FocusTreeEditorInteractionState();

    state.select(a.id);
    expect(state.selectedNodeId).toBe(a.id);
    state.select(b.id);
    expect(state.selectedNodeId).toBe(b.id);
    expect(session.graph).toEqual(graphBefore);
  });

  it("uses the selected node as connection source", () => {
    const state = new FocusTreeEditorInteractionState();
    state.select("node-a");
    expect(state.startConnection()).toBe("node-a");
    expect(state.connectionTo("node-b")).toEqual({from: "node-a", to: "node-b"});
    state.finishConnection("node-b");
    expect(state.selectedNodeId).toBe("node-b");
    expect(state.connectionSourceNodeId).toBeNull();
  });

  it("cancels connection targeting without changing graph or selection", () => {
    const session = new FocusTreeEditorSession(emptyGraph());
    const graphBefore = session.graph;
    const state = new FocusTreeEditorInteractionState();
    state.select("node-a");
    state.startConnection();
    state.cancelConnection();
    expect(state.selectedNodeId).toBe("node-a");
    expect(state.connectionSourceNodeId).toBeNull();
    expect(session.graph).toEqual(graphBefore);
  });
});
