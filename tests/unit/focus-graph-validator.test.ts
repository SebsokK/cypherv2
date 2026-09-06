import {describe, expect, it} from "vitest";

import fixture from "../../fixtures/abides-in-stone-focus.json";
import {
  assertValidFocusGraph,
  FocusGraphValidationError,
  validateFocusGraph
} from "../../src/focus/focus-graph-validator";
import type {FocusGraph} from "../../src/focus/focus-types";

const graph = fixture.system.graph as unknown as FocusGraph;

function changed(overrides: Partial<FocusGraph>): FocusGraph {
  return {...graph, ...overrides};
}

describe("Focus graph validation", () => {
  it("accepts the explicit reciprocal Tier 1 links in Abides in Stone", () => {
    expect(assertValidFocusGraph(graph)).toEqual([]);
  });

  it("rejects duplicate node IDs", () => {
    const duplicate = changed({nodes: [...graph.nodes, {...graph.nodes[0]!}]});
    expect(() => assertValidFocusGraph(duplicate)).toThrow(FocusGraphValidationError);
    expect(validateFocusGraph(duplicate).map((entry) => entry.code)).toContain("duplicate-node-id");
  });

  it("rejects duplicate directed connections, including different IDs", () => {
    const first = graph.connections[0]!;
    const duplicate = changed({connections: [
      ...graph.connections,
      {...first, id: "another-id"}
    ]});
    expect(validateFocusGraph(duplicate).map((entry) => entry.code)).toContain("duplicate-connection");
  });

  it("rejects dangling connections", () => {
    const dangling = changed({connections: [
      ...graph.connections,
      {id: "dangling", from: "stone-body", to: "missing-node"}
    ]});
    expect(() => assertValidFocusGraph(dangling)).toThrow(/missing node/i);
  });

  it("reports a non-reciprocal directed cycle without making direct evaluation ambiguous", () => {
    const cyclic: FocusGraph = {
      version: 1,
      nodes: ["a", "b", "c"].map((id) => ({
        id,
        abilityUuid: "",
        abilitySnapshot: {name: id},
        tier: 1,
        position: {x: null, y: null}
      })),
      connections: [
        {id: "ab", from: "a", to: "b"},
        {id: "bc", from: "b", to: "c"},
        {id: "ca", from: "c", to: "a"}
      ]
    };
    expect(assertValidFocusGraph(cyclic)).toEqual([
      expect.objectContaining({severity: "warning", code: "directed-cycle"})
    ]);
  });

  it("accepts missing presentation coordinates", () => {
    const withoutCoordinates = changed({nodes: graph.nodes.map((node) => ({
      ...node,
      position: {x: null, y: null}
    }))});
    expect(assertValidFocusGraph(withoutCoordinates)).toEqual([]);
  });

  it("rejects Focus node Tiers outside the 1 to 6 editor contract", () => {
    const invalidTier = changed({nodes: graph.nodes.map((node, index) => ({
      ...node,
      tier: index === 0 ? 7 : node.tier
    }))});
    expect(validateFocusGraph(invalidTier)).toContainEqual(expect.objectContaining({
      severity: "error",
      code: "invalid-tier"
    }));
  });
});
