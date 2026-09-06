export const SYSTEM_ID = "cypherv2" as const;
export const SYSTEM_VERSION = "0.1.0" as const;
export const SYSTEM_SCHEMA_VERSION = 1 as const;

export const ACTOR_TYPES = ["character", "npc"] as const;

export const ITEM_TYPES = [
  "ability",
  "skill",
  "weapon",
  "armor",
  "shield",
  "equipment",
  "cypher",
  "artifact",
  "descriptor",
  "characterType",
  "focus",
  "genre",
  "species"
] as const;

export const SKILL_RANKS = [
  "inability",
  "untrained",
  "trained",
  "specialized",
  "expert"
] as const;

export const SKILL_DEFAULT_POOLS = ["choose", "might", "speed", "intellect"] as const;

export const WEAPON_CATEGORIES = ["light", "medium", "heavy"] as const;

export const WEAPON_ATTACK_TYPES = ["melee", "ranged"] as const;

export const RANGE_CATEGORIES = ["immediate", "short", "long", "very-long", "specified"] as const;

export const ARMOR_CATEGORIES = ["light", "medium", "heavy"] as const;

export const DEFENSE_TYPES = ["block", "blockWithShield", "dodge"] as const;

export const DEPLETION_DICE = ["d6", "d10", "d20"] as const;

export const CYPHER_MANIFESTATIONS = ["subtle", "manifest"] as const;

export const CYPHER_POWERS = ["low", "medium", "advanced", "high", "ultra"] as const;

export const WOUND_SEVERITIES = ["minor", "moderate", "major"] as const;

export const ABILITY_ACTIVATIONS = ["action", "passive", "reaction", "special"] as const;

export const ABILITY_POOLS = ["none", "might", "speed", "intellect", "choose"] as const;

export const ABILITY_ROLL_TYPES = ["none", "task", "attack", "defense"] as const;

export const ABILITY_TARGET_MODES = ["none", "single", "multiple"] as const;

export const RECOVERY_TYPES = ["one-action", "10-minutes", "1-hour", "10-hours"] as const;

export const RECOVERY_KINDS = ["normal", "nonRest"] as const;

export const REST_TYPES = ["10-minutes", "1-hour", "10-hours"] as const;

export const DURATION_TRIGGERS = [
  "recovery",
  "10-minute-or-longer",
  "1-hour-or-longer",
  "10-hour",
  "non-rest-recovery"
] as const;

export type ActorType = (typeof ACTOR_TYPES)[number];
export type ItemType = (typeof ITEM_TYPES)[number];
export type SkillRank = (typeof SKILL_RANKS)[number];
export type SkillDefaultPool = (typeof SKILL_DEFAULT_POOLS)[number];
export type WeaponCategory = (typeof WEAPON_CATEGORIES)[number];
export type WeaponAttackType = (typeof WEAPON_ATTACK_TYPES)[number];
export type RangeCategory = (typeof RANGE_CATEGORIES)[number];
export type ArmorCategory = (typeof ARMOR_CATEGORIES)[number];
export type DefenseType = (typeof DEFENSE_TYPES)[number];
export type DepletionDie = (typeof DEPLETION_DICE)[number];
export type CypherManifestation = (typeof CYPHER_MANIFESTATIONS)[number];
export type CypherPower = (typeof CYPHER_POWERS)[number];
export type WoundSeverity = (typeof WOUND_SEVERITIES)[number];
export type AbilityActivation = (typeof ABILITY_ACTIVATIONS)[number];
export type AbilityPool = (typeof ABILITY_POOLS)[number];
export type AbilityRollType = (typeof ABILITY_ROLL_TYPES)[number];
export type AbilityTargetMode = (typeof ABILITY_TARGET_MODES)[number];
export type RecoveryType = (typeof RECOVERY_TYPES)[number];
export type RecoveryKind = (typeof RECOVERY_KINDS)[number];
export type RestType = (typeof REST_TYPES)[number];
export type DurationTrigger = (typeof DURATION_TRIGGERS)[number];
