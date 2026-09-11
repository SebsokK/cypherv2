import type {
  AbilityActivation,
  AbilityPool,
  AbilityRollType,
  AbilityTargetMode,
  WoundSeverity
} from "../constants/system";
import type {CombatTargetDocumentIdentity, NpcTargetLike, TargetResolution} from "../combat/combat-types";
import type {CharacterDocumentLike, PoolKey} from "../rules/core/core-types";
import type {RollDifficulty, RollExecution, RollStepContribution} from "../rolls/roll-types";
import type {SkillItemLike} from "../services/skill-service";

export interface AbilityItemLike {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly system: {
    readonly archived?: boolean;
    readonly activation: AbilityActivation;
    readonly pool: AbilityPool;
    readonly cost: {
      readonly amount: number;
      readonly scalable?: boolean;
      readonly ignoresEdge: boolean;
      readonly allowedPools?: readonly PoolKey[];
    };
    readonly roll: AbilityRollType;
    readonly rollModifier: number;
    readonly attackModifier: number;
    readonly damage: number;
    readonly woundSeverity: WoundSeverity | "none";
    readonly range: string;
    readonly targetMode: AbilityTargetMode;
    readonly description: string;
    readonly grantedBy?: unknown;
  };
}

export interface AbilityCharacterTargetLike extends CharacterDocumentLike, CombatTargetDocumentIdentity {
  readonly id: string;
  readonly uuid?: string;
  readonly name: string;
  readonly type: "character";
}

export type AbilityTargetLike = NpcTargetLike | AbilityCharacterTargetLike;

export interface AbilityUseOptions {
  readonly pool?: PoolKey;
  readonly targets?: readonly AbilityTargetLike[];
  readonly difficulty?: RollDifficulty;
  readonly skill?: SkillItemLike;
  readonly skillSteps?: number;
  readonly assets?: number;
  readonly paidEffort?: number;
  readonly damageEffort?: number;
  readonly freeDamageEffort?: number;
  readonly freeEffort?: number;
  readonly otherEase?: number;
  readonly otherHindrance?: number;
  readonly contributions?: readonly RollStepContribution[];
  readonly enabledRuleModuleIds?: readonly string[];
}

export interface AbilityRollPlan {
  readonly ability: AbilityItemLike;
  readonly pool: PoolKey;
  readonly requests: readonly import("../rolls/roll-types").CharacterRollRequest[];
  readonly targets: readonly (AbilityTargetLike | null)[];
  readonly targetResolutions: readonly (TargetResolution | null)[];
  readonly damage: number;
}

export interface AbilityRollOutcome {
  readonly ability: AbilityItemLike;
  readonly target: AbilityTargetLike | null;
  readonly targetResolution: TargetResolution | null;
  readonly execution: RollExecution;
  readonly baseDamage: number;
  readonly effortDamage: number;
  readonly naturalDamage: number;
  readonly grossDamage: number;
  readonly woundSeverity: WoundSeverity | "none";
}

export interface AbilityNoRollOutcome {
  readonly ability: AbilityItemLike;
  readonly actor: {readonly id: string; readonly name: string};
  readonly pool: PoolKey | null;
  readonly costPaid: number;
  readonly edgeApplied: number;
  readonly targets: readonly AbilityTargetLike[];
}

export interface AbilityPaymentPreview {
  readonly ability: AbilityItemLike;
  readonly pool: PoolKey;
  readonly listedCost: number;
  readonly ignoresEdge: boolean;
  readonly edge: number;
  readonly edgeApplied: number;
  readonly costPaid: number;
  readonly currentBefore: number;
  readonly currentAfter: number;
  readonly canPay: boolean;
}

export type AbilityPaymentOutcome = AbilityPaymentPreview;
