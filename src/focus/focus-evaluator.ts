import {assertValidFocusGraph} from "./focus-graph-validator";
import type {
  EvaluatedFocusNode,
  FocusEvaluation,
  FocusGraph,
  FocusProgress
} from "./focus-types";

export class FocusEvaluator {
  evaluate(
    graph: FocusGraph,
    character: {readonly tier: number; readonly ownedNodeIds: readonly string[]}
  ): FocusEvaluation {
    if (!Number.isInteger(character.tier) || character.tier < 1) {
      throw new Error("Character Tier must be an integer of at least 1.");
    }
    const diagnostics = [...assertValidFocusGraph(graph)];
    const nodeIds = new Set(graph.nodes.map((node) => node.id));
    const owned = new Set(character.ownedNodeIds);
    for (const nodeId of owned) {
      if (!nodeIds.has(nodeId)) diagnostics.push({
        severity: "warning",
        code: "unknown-owned-node",
        nodeId,
        message: `Focus progression references unknown node '${nodeId}'.`
      });
    }
    const incoming = new Map<string, string[]>();
    for (const node of graph.nodes) incoming.set(node.id, []);
    for (const connection of graph.connections) {
      incoming.get(connection.to)!.push(connection.from);
    }

    const validOwned = new Set(graph.nodes
      .filter((node) => node.tier === 1 && owned.has(node.id))
      .map((node) => node.id));
    let changed = true;
    while (changed) {
      changed = false;
      for (const connection of graph.connections) {
        if (validOwned.has(connection.from) && owned.has(connection.to) && !validOwned.has(connection.to)) {
          validOwned.add(connection.to);
          changed = true;
        }
      }
    }
    for (const node of graph.nodes) {
      if (node.tier > 1 && owned.has(node.id) && !validOwned.has(node.id)) diagnostics.push({
        severity: "warning",
        code: "invalid-owned-progression",
        nodeId: node.id,
        message: `Owned node '${node.abilitySnapshot.name || node.id}' is no longer connected to an owned Tier 1 path.`
      });
    }

    const evaluated: EvaluatedFocusNode[] = graph.nodes.map((node) => {
      const reachableFrom = [...new Set((incoming.get(node.id) ?? []).filter((id) => validOwned.has(id)))]
        .sort((left, right) => left.localeCompare(right));
      if (owned.has(node.id)) return {
        node,
        state: "owned" as const,
        reason: "owned" as const,
        requiredTier: node.tier,
        reachableFrom
      };
      // Cypher V2 creation and later Focus choices may select any unowned
      // Tier 1 Ability. Tier 1 graph links remain presentational only.
      if (node.tier === 1) return {
        node,
        state: "available" as const,
        reason: "tier-one-choice" as const,
        requiredTier: node.tier,
        reachableFrom: []
      };
      if (reachableFrom.length > 0 && node.tier > character.tier) return {
        node,
        state: "future" as const,
        reason: "tier-too-low" as const,
        requiredTier: node.tier,
        reachableFrom
      };
      if (reachableFrom.length > 0) return {
        node,
        state: "available" as const,
        reason: "connected-from-owned" as const,
        requiredTier: node.tier,
        reachableFrom
      };
      return {
        node,
        state: "locked" as const,
        reason: "no-owned-prerequisite" as const,
        requiredTier: node.tier,
        reachableFrom: []
      };
    }).sort((left, right) => (
      left.node.tier - right.node.tier || left.node.id.localeCompare(right.node.id)
    ));
    return {
      characterTier: character.tier,
      ownedNodeIds: [...owned].sort((left, right) => left.localeCompare(right)),
      nodes: evaluated,
      diagnostics
    };
  }

  evaluateProgress(
    graph: FocusGraph,
    characterTier: number,
    progress: FocusProgress
  ): FocusEvaluation {
    return this.evaluate(graph, {tier: characterTier, ownedNodeIds: progress.ownedNodeIds});
  }

  evaluateCharacterFocus(
    graph: FocusGraph,
    character: {readonly tier: number; readonly focusProgress: readonly FocusProgress[]},
    focusUuid: string
  ): FocusEvaluation {
    const progress = character.focusProgress.find((entry) => entry.focusUuid === focusUuid);
    return this.evaluate(graph, {
      tier: character.tier,
      ownedNodeIds: progress?.ownedNodeIds ?? []
    });
  }

  invalidOwnedNodeIds(
    graph: FocusGraph,
    characterTier: number,
    ownedNodeIds: readonly string[]
  ): readonly string[] {
    return this.evaluate(graph, {tier: characterTier, ownedNodeIds}).diagnostics
      .filter((entry) => entry.code === "invalid-owned-progression" && entry.nodeId)
      .map((entry) => entry.nodeId!);
  }
}
