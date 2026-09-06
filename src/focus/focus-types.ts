export interface FocusAbilitySnapshot {
  readonly name: string;
  readonly description?: string;
}

export interface FocusNodePosition {
  readonly x: number | null;
  readonly y: number | null;
}

export interface FocusNode {
  readonly id: string;
  readonly abilityUuid: string;
  readonly abilitySnapshot: FocusAbilitySnapshot;
  readonly tier: number;
  /** Presentation only. Never participates in graph evaluation. */
  readonly position: FocusNodePosition;
}

export interface FocusConnection {
  readonly id: string;
  readonly from: string;
  readonly to: string;
}

export interface FocusGraph {
  readonly version: number;
  readonly nodes: readonly FocusNode[];
  readonly connections: readonly FocusConnection[];
}

export interface FocusProgress {
  readonly focusUuid: string;
  readonly ownedNodeIds: readonly string[];
  readonly acquisitions?: readonly FocusAcquisitionRecord[];
  readonly provenance?: "creation" | "additional";
  readonly initialChoicesGranted?: boolean;
  readonly attachedAt?: number;
}

export type FocusAcquisitionMode =
  | "choice"
  | "manualOverride"
  | "gmOverride"
  | "gmManual"
  | "legacy";

/**
 * Audit data required to reverse one acquisition. This is not a campaign
 * history: the record exists only while its node remains owned.
 */
export interface FocusAcquisitionRecord {
  readonly nodeId: string;
  readonly mode: FocusAcquisitionMode;
  readonly choiceId: string;
  readonly choiceSource: "none" | "characterCreation" | "additionalFocus" | "otherAdvancement" | "newTier";
  readonly choiceGrantTier: number;
  readonly choiceFocusUuid: string;
  readonly acquiredAt: number;
}

export interface FocusDocumentLike {
  readonly id: string;
  readonly uuid: string;
  readonly name: string;
  readonly type: string;
  readonly system: {readonly graph: FocusGraph};
}

export type FocusNodeState = "owned" | "available" | "locked" | "future";
export type FocusNodeReason =
  | "owned"
  | "tier-one-choice"
  | "connected-from-owned"
  | "tier-too-low"
  | "no-owned-prerequisite";

export interface EvaluatedFocusNode {
  readonly node: FocusNode;
  readonly state: FocusNodeState;
  readonly reason: FocusNodeReason;
  readonly requiredTier: number;
  readonly reachableFrom: readonly string[];
}

export interface FocusGraphDiagnostic {
  readonly severity: "warning" | "error";
  readonly code: string;
  readonly message: string;
  readonly nodeId?: string;
  readonly connectionId?: string;
}

export interface FocusEvaluation {
  readonly characterTier: number;
  readonly ownedNodeIds: readonly string[];
  readonly nodes: readonly EvaluatedFocusNode[];
  readonly diagnostics: readonly FocusGraphDiagnostic[];
}
