import type {
  ArmorCategory,
  DefenseType,
  SkillRank,
  WeaponAttackType,
  WeaponCategory,
  WoundSeverity
} from "../constants/system";
import type {PoolKey} from "../rules/core/core-types";
import type {RollStepContribution} from "../rolls/roll-types";

export interface CombatPolicy {
  readonly weaponDamage: Readonly<Record<WeaponCategory, number>>;
  readonly lightWeaponEase: number;
  readonly unfamiliarWeaponHindrance: number;
  readonly armorDefenseSteps: Readonly<Record<ArmorCategory, number>>;
  readonly blockSeverityReduction: number;
  readonly damageEffortBonus: number;
}

export interface CombatRollContext {
  readonly tags: readonly string[];
  readonly pool?: PoolKey;
  readonly attackType?: WeaponAttackType;
  readonly weaponCategory?: WeaponCategory;
  readonly defenseType?: DefenseType;
}

export type NpcModificationMode = "levelOverride" | "levelDelta" | "ease" | "hinder";

export interface NpcModificationData {
  readonly id: string;
  readonly label: string;
  readonly contexts: readonly string[];
  readonly mode: NpcModificationMode;
  readonly value: number;
  readonly visibility: "public" | "gm";
  readonly predicate: Readonly<Record<string, unknown>>;
  readonly description: string;
}

export interface CombatTargetIdentity {
  readonly actorId: string;
  readonly actorUuid?: string;
  readonly tokenId?: string;
  readonly tokenUuid?: string;
}

export interface CombatTargetDocumentIdentity {
  readonly actorUuid?: string;
  readonly tokenId?: string;
  readonly tokenUuid?: string;
  readonly token?: {readonly id: string; readonly uuid: string};
}

export interface NpcTargetLike extends CombatTargetDocumentIdentity {
  readonly id: string;
  readonly uuid?: string;
  readonly actorUuid?: string;
  readonly tokenId?: string;
  readonly tokenUuid?: string;
  readonly name: string;
  readonly type: string;
  readonly system: {
    readonly level: number;
    readonly armorBase: number;
    readonly health: {readonly value: number; readonly baseMax: number; readonly max?: number};
    readonly dead?: boolean;
    readonly modifications: readonly NpcModificationData[];
    readonly damage: {
      readonly amount: number;
      readonly woundSeverity: WoundSeverity;
      readonly defense: {readonly allowBlock: boolean; readonly allowDodge: boolean};
      readonly notes: string;
    };
  };
  update(changes: Record<string, unknown>, options?: Record<string, unknown>): Promise<unknown>;
}

export interface TargetResolution {
  readonly targetId: string;
  readonly targetIdentity: CombatTargetIdentity;
  readonly targetName: string;
  readonly baseLevel: number;
  readonly difficulty: number;
  readonly contributions: readonly RollStepContribution[];
  readonly appliedModificationIds: readonly string[];
}

export interface WeaponItemLike {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly system: {
    readonly slug?: string;
    readonly category: WeaponCategory;
    readonly attackType: WeaponAttackType;
    readonly rangeCategory: string;
    readonly rangeNotes: string;
    readonly skillLevel?: SkillRank;
    readonly defaultPool?: PoolKey | "none";
    readonly damageOverride: number | null;
    readonly baseDamage: number;
    readonly attackModifier: number;
    readonly bonusDamage: number;
    /** @deprecated Retained only so legacy Weapon data remains readable. */
    readonly freelyUsed: boolean;
    readonly equipped: boolean;
    readonly description: string;
    readonly ammo: {
      readonly enabled: boolean;
      readonly value: number;
      readonly max: number;
      readonly perAttack: number;
    };
    readonly depletion: import("../depletion/depletion-types").DepletionRule;
    readonly depleted?: boolean;
  };
  update?(changes: Record<string, unknown>, options?: Record<string, unknown>): Promise<unknown>;
}

export function combatTargetIdentity(target: NpcTargetLike): CombatTargetIdentity {
  const tokenId = target.tokenId ?? target.token?.id;
  const tokenUuid = target.tokenUuid ?? target.token?.uuid;
  return {
    actorId: target.id,
    ...(target.actorUuid ?? target.uuid ? {actorUuid: target.actorUuid ?? target.uuid} : {}),
    ...(tokenId ? {tokenId} : {}),
    ...(tokenUuid ? {tokenUuid} : {})
  };
}

export interface ArmorItemLike {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly system: {
    readonly slug?: string;
    readonly category: ArmorCategory;
    readonly equipped: boolean;
    readonly freelyUsed: boolean;
    readonly description: string;
    readonly depletion?: import("../depletion/depletion-types").DepletionRule;
    readonly depleted?: boolean;
  };
}

export const WOUND_SEVERITY_ORDER: readonly (WoundSeverity | "none")[] = [
  "none",
  "minor",
  "moderate",
  "major"
];

export function reduceWoundSeverity(
  severity: WoundSeverity,
  steps: number
): WoundSeverity | "none" {
  const index = WOUND_SEVERITY_ORDER.indexOf(severity);
  return WOUND_SEVERITY_ORDER[Math.max(0, index - Math.max(0, Math.trunc(steps)))] ?? "none";
}
