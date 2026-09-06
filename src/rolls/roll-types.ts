import type {PoolKey} from "../rules/core/core-types";

export type RollDifficulty =
  | {mode: "known"; value: number}
  | {mode: "hidden"; value: number}
  | {mode: "unknown"};

export type RollStepDirection = "ease" | "hinder";

export type RollStepSource =
  | "skill"
  | "asset"
  | "effort"
  | "free-effort"
  | "wound"
  | "other"
  | "rule-module";

export interface RollStepContribution {
  readonly id: string;
  readonly label: string;
  readonly direction: RollStepDirection;
  readonly steps: number;
  readonly source: RollStepSource;
  readonly sourceId?: string;
}

export interface RollPolicy {
  readonly difficultyCeiling: number;
  readonly assetLimit: number;
}

export interface RollContext {
  readonly actor: {id: string; name: string};
  readonly label: string;
  /** Null only for a Pool-less, zero-cost roll such as a Skill Quick Roll. */
  readonly pool: PoolKey | null;
  readonly difficulty: RollDifficulty;
  readonly assets: number;
  readonly paidEffort: number;
  /** Paid Effort assigned to damage rather than easing the task. */
  readonly damageEffort?: number;
  /** Independent Damage Effort levels which are applied normally and cost no Pool points. */
  readonly freeDamageEffort?: number;
  readonly freeEffort: number;
  readonly edge: number;
  readonly poolValue: number;
  /** Fixed Pool cost of the action before Edge, separate from Effort. */
  readonly actionCost?: number;
  /** When true, Edge may still reduce Effort but never this fixed action cost. */
  readonly actionCostIgnoresEdge?: boolean;
  readonly limits: RollPolicy & {
    /** Character Effort Rating: maximum number of paid Effort levels. */
    paidEffortMaximum: number;
    /** Absolute maximum across paid and free applied Effort levels. */
    /** Null means the active Character Genre removes the Core absolute cap. */
    totalEffortMaximum: number | null;
  };
  readonly contributions: readonly RollStepContribution[];
  /** World-state snapshot used by Core natural-result resolution for this roll. */
  readonly horrorIntrusionRange?: number;
  readonly purpose?: "task" | "damage";
  readonly tags?: readonly string[];
  readonly target?: {
    readonly actorId: string;
    readonly actorUuid?: string;
    readonly tokenId?: string;
    readonly tokenUuid?: string;
    readonly name: string;
    readonly type: "npc" | "character";
  };
  readonly origin?:
    | {
        readonly kind: "skill";
        readonly itemId: string;
        readonly name: string;
        readonly rank: import("../constants/system").SkillRank;
      }
    | {
        readonly kind: "weapon";
        readonly itemId: string;
        readonly name: string;
        readonly category: import("../constants/system").WeaponCategory;
        readonly attackType: import("../constants/system").WeaponAttackType;
        readonly baseDamage: number;
      }
    | {
        readonly kind: "defense";
        readonly defenseType: import("../constants/system").DefenseType;
        readonly sourceActorId?: string;
        readonly sourceName?: string;
      }
    | {
        readonly kind: "ability";
        readonly itemId: string;
        readonly name: string;
        readonly activation: import("../constants/system").AbilityActivation;
        readonly rollType: import("../constants/system").AbilityRollType;
        readonly damage: number;
        readonly woundSeverity: import("../constants/system").WoundSeverity | "none";
      };
}

export interface PreparedRoll {
  readonly context: RollContext;
  readonly breakdown: readonly RollStepContribution[];
  readonly totalEase: number;
  readonly totalHindrance: number;
  /** Positive values ease the task; negative values hinder it. */
  readonly netSteps: number;
  readonly effortCostBeforeEdge: number;
  readonly damageEffortApplied: number;
  readonly totalEffortApplied: number;
  readonly paidEffortApplied: number;
  readonly freeEffortApplied: number;
  readonly totalEffortMaximum: number | null;
  readonly actionCostBeforeEdge: number;
  readonly totalCostBeforeEdge: number;
  readonly edgeApplied: number;
  readonly poolCost: number;
  readonly finalDifficulty: number | null;
  readonly targetNumber: number | null;
}

export type NaturalRollMarker =
  | "natural-1"
  | "natural-17"
  | "natural-18"
  | "natural-19"
  | "natural-20";

export type NaturalEffectKind =
  | "gm-intrusion"
  | "damage-bonus"
  | "minor-effect"
  | "major-effect"
  | "pool-cost-refund";

export type NaturalEffectStatus = "applied" | "available" | "unresolved" | "inapplicable";

export interface NaturalEffect {
  readonly id: string;
  readonly sourceId: string;
  readonly naturalRoll: number;
  readonly kind: NaturalEffectKind;
  readonly status: NaturalEffectStatus;
  readonly label: string;
  readonly damageBonus?: number;
  readonly triggersGMIntrusion?: boolean;
  readonly intrusionProvenance?: "natural-1" | "horror-mode";
  readonly horrorIntrusionRange?: number;
  readonly refundsPoolCost?: boolean;
  readonly choiceGroup?: string;
}

export interface RollResult {
  readonly prepared: PreparedRoll;
  /** Null when final difficulty 0 makes the action an automatic success. */
  readonly naturalRoll: number | null;
  /** Difficulty represented by the unmodified natural d20 result. */
  readonly naturalDifficulty: number | null;
  readonly automaticSuccess: boolean;
  readonly naturalMarkers: readonly NaturalRollMarker[];
  readonly naturalEffects: readonly NaturalEffect[];
  /** Calculated for known and hidden difficulties; null when no difficulty was supplied. */
  readonly success: boolean | null;
  /** Player-facing maximum difficulty this roll beats after all Ease/Hindrance steps. */
  readonly beatsDifficulty: number | null;
  /** Actual Pool cost after natural-result processing. */
  readonly poolCostPaid: number;
  readonly poolCostRefunded: number;
}

export interface CharacterRollRequest {
  readonly label?: string;
  /** Null represents an explicitly Pool-less, zero-cost roll. */
  readonly pool: PoolKey | null;
  readonly difficulty: RollDifficulty;
  /** Positive values ease; negative values hinder. */
  readonly skillSteps: number;
  readonly assets: number;
  readonly paidEffort: number;
  readonly damageEffort?: number;
  readonly freeDamageEffort?: number;
  readonly freeEffort: number;
  readonly actionCost?: number;
  readonly actionCostIgnoresEdge?: boolean;
  readonly otherEase: number;
  readonly otherHindrance: number;
  readonly contributions?: readonly RollStepContribution[];
  readonly purpose?: "task" | "damage";
  readonly tags?: readonly string[];
  readonly target?: RollContext["target"];
  readonly origin?: RollContext["origin"];
}

export interface RollPolicyRequest {
  readonly base: RollPolicy;
  readonly enabledRuleModuleIds?: readonly string[];
}

export interface RollExecution {
  readonly result: RollResult;
  /** Evaluated Foundry Roll instance when the runtime roller provides one. */
  readonly chatRoll?: unknown;
}
