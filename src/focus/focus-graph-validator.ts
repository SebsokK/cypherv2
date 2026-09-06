import type {FocusGraph, FocusGraphDiagnostic} from "./focus-types";

export class FocusGraphValidationError extends Error {
  readonly diagnostics: readonly FocusGraphDiagnostic[];

  constructor(diagnostics: readonly FocusGraphDiagnostic[]) {
    super(diagnostics.map((entry) => entry.message).join("; "));
    this.name = "FocusGraphValidationError";
    this.diagnostics = diagnostics;
  }
}

function complexDirectedCycle(graph: FocusGraph, nodeIds: ReadonlySet<string>): boolean {
  const adjacency = new Map<string, string[]>();
  for (const id of nodeIds) adjacency.set(id, []);
  for (const connection of graph.connections) {
    if (connection.from === connection.to) continue;
    adjacency.get(connection.from)?.push(connection.to);
  }
  const activeAt = new Map<string, number>();
  const path: string[] = [];
  const complete = new Set<string>();
  const visit = (id: string): boolean => {
    const existingIndex = activeAt.get(id);
    if (existingIndex !== undefined) return path.length - existingIndex > 2;
    if (complete.has(id)) return false;
    activeAt.set(id, path.length);
    path.push(id);
    for (const next of adjacency.get(id) ?? []) if (visit(next)) return true;
    path.pop();
    activeAt.delete(id);
    complete.add(id);
    return false;
  };
  return [...nodeIds].some((id) => visit(id));
}

export function validateFocusGraph(graph: FocusGraph): readonly FocusGraphDiagnostic[] {
  const diagnostics: FocusGraphDiagnostic[] = [];
  if (!Number.isInteger(graph.version) || graph.version < 1) {
    diagnostics.push({severity: "error", code: "invalid-version", message: "Focus graph version must be at least 1."});
  }

  const nodeIds = new Set<string>();
  for (const node of graph.nodes) {
    if (!node.id.trim()) {
      diagnostics.push({severity: "error", code: "blank-node-id", message: "Focus node IDs cannot be blank."});
      continue;
    }
    if (nodeIds.has(node.id)) {
      diagnostics.push({severity: "error", code: "duplicate-node-id", nodeId: node.id, message: `Duplicate Focus node ID '${node.id}'.`});
    }
    nodeIds.add(node.id);
    if (!Number.isInteger(node.tier) || node.tier < 1 || node.tier > 6) {
      diagnostics.push({severity: "error", code: "invalid-tier", nodeId: node.id, message: `Focus node '${node.id}' must use a Tier from 1 to 6.`});
    }
    for (const [axis, value] of Object.entries(node.position ?? {})) {
      if (value !== null && !Number.isFinite(value)) {
        diagnostics.push({severity: "error", code: "invalid-position", nodeId: node.id, message: `Focus node '${node.id}' has an invalid ${axis} position.`});
      }
    }
  }

  const connectionIds = new Set<string>();
  const directedEdges = new Set<string>();
  for (const connection of graph.connections) {
    if (!connection.id.trim() || connectionIds.has(connection.id)) {
      diagnostics.push({severity: "error", code: "duplicate-connection-id", connectionId: connection.id, message: `Duplicate or blank Focus connection ID '${connection.id}'.`});
    }
    connectionIds.add(connection.id);
    const edge = `${connection.from}\u0000${connection.to}`;
    if (directedEdges.has(edge)) {
      diagnostics.push({severity: "error", code: "duplicate-connection", connectionId: connection.id, message: `Duplicate Focus connection '${connection.from}' -> '${connection.to}'.`});
    }
    directedEdges.add(edge);
    if (!nodeIds.has(connection.from) || !nodeIds.has(connection.to)) {
      diagnostics.push({severity: "error", code: "missing-connection-node", connectionId: connection.id, message: `Focus connection '${connection.id}' references a missing node.`});
    }
    if (connection.from === connection.to) {
      diagnostics.push({severity: "error", code: "self-connection", connectionId: connection.id, message: `Focus connection '${connection.id}' cannot target itself.`});
    }
  }

  if (!diagnostics.some((entry) => entry.severity === "error") && complexDirectedCycle(graph, nodeIds)) {
    diagnostics.push({
      severity: "warning",
      code: "directed-cycle",
      message: "Focus graph contains a directed cycle; evaluation remains direct and deterministic."
    });
  }
  return diagnostics;
}

export function assertValidFocusGraph(graph: FocusGraph): readonly FocusGraphDiagnostic[] {
  const diagnostics = validateFocusGraph(graph);
  const errors = diagnostics.filter((entry) => entry.severity === "error");
  if (errors.length > 0) throw new FocusGraphValidationError(errors);
  return diagnostics;
}
