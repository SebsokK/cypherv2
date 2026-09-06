import {describe, expect, it} from "vitest";

import fixture from "../../fixtures/abides-in-stone-focus.json";
import {FocusEvaluator} from "../../src/focus/focus-evaluator";
import type {FocusGraph} from "../../src/focus/focus-types";

const graph = fixture.system.graph as unknown as FocusGraph;
const evaluator = new FocusEvaluator();

function states(result: ReturnType<FocusEvaluator["evaluate"]>): Record<string, string> {
  return Object.fromEntries(result.nodes.map((entry) => [entry.node.id, entry.state]));
}

describe("FocusEvaluator", () => {
  it("makes every Tier 1 node available before any Ability is owned", () => {
    const result = evaluator.evaluate(graph, {tier: 1, ownedNodeIds: []});
    expect(result.nodes.filter((entry) => entry.reason === "tier-one-choice").map((entry) => entry.state))
      .toEqual(["available", "available", "available"]);
  });

  it("keeps every other Tier 1 node available after the first acquisition", () => {
    const result = evaluator.evaluate(graph, {
      tier: 1,
      ownedNodeIds: ["intimidating-presence"]
    });
    expect(states(result)).toMatchObject({
      "intimidating-presence": "owned",
      "stoneknowing": "available",
      "stone-body": "available",
      "stone-bash": "future",
      "field-of-stones": "locked",
      "golem-grip": "locked"
    });
    expect(result.nodes.find((entry) => entry.node.id === "stone-body")).toMatchObject({
      reason: "tier-one-choice",
      requiredTier: 1,
      reachableFrom: []
    });
  });

  it("makes the directly connected Tier 2 nodes available at Tier 2", () => {
    const result = evaluator.evaluate(graph, {
      tier: 2,
      ownedNodeIds: ["intimidating-presence", "stoneknowing"]
    });
    expect(states(result)).toMatchObject({
      "stone-bash": "available",
      "field-of-stones": "available",
      "golem-grip": "locked"
    });
  });

  it("changes a directly reachable node from future to available at its required Tier", () => {
    const ownedNodeIds = ["intimidating-presence", "stone-bash"];
    expect(states(evaluator.evaluate(graph, {tier: 2, ownedNodeIds}))["improved-stone-body"])
      .toBe("future");
    expect(states(evaluator.evaluate(graph, {tier: 3, ownedNodeIds}))["improved-stone-body"])
      .toBe("available");
  });

  it("keeps an unconnected Tier 1 node available at every Character Tier", () => {
    const disconnected: FocusGraph = {
      ...graph,
      nodes: [...graph.nodes, {
        id: "isolated",
        abilityUuid: "",
        abilitySnapshot: {name: "Isolated"},
        tier: 1,
        position: {x: null, y: null}
      }]
    };
    expect(states(evaluator.evaluate(disconnected, {
      tier: 6,
      ownedNodeIds: ["intimidating-presence"]
    })).isolated).toBe("available");
  });

  it("reports an owned Tier 2+ node whose owned path has been broken", () => {
    const result = evaluator.evaluate(graph, {
      tier: 2,
      ownedNodeIds: ["stone-bash"]
    });
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      code: "invalid-owned-progression",
      nodeId: "stone-bash",
      severity: "warning"
    }));
  });

  it("keeps multiple Focus progressions isolated by Focus UUID", () => {
    const character = {
      tier: 2,
      focusProgress: [
        {focusUuid: "Item.focus-a", ownedNodeIds: ["intimidating-presence"]},
        {focusUuid: "Item.focus-b", ownedNodeIds: ["stoneknowing"]}
      ]
    };
    const first = evaluator.evaluateCharacterFocus(graph, character, "Item.focus-a");
    const second = evaluator.evaluateCharacterFocus(graph, character, "Item.focus-b");
    expect(first.ownedNodeIds).toEqual(["intimidating-presence"]);
    expect(second.ownedNodeIds).toEqual(["stoneknowing"]);
  });

  it("is independent of node and connection array order", () => {
    const reversed: FocusGraph = {
      ...graph,
      nodes: [...graph.nodes].reverse(),
      connections: [...graph.connections].reverse()
    };
    const character = {tier: 2, ownedNodeIds: ["intimidating-presence", "stoneknowing"]};
    expect(evaluator.evaluate(reversed, character)).toEqual(evaluator.evaluate(graph, character));
  });
});
