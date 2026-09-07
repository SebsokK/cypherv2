import {
  type ArmorCategory,
  RECOVERY_TYPES,
  type RecoveryKind,
  type RecoveryType,
  type RestType,
  type WoundSeverity
} from "../../constants/system";
import type {FocusProgress} from "../../focus/focus-types";
import type {CharacterAppearanceData} from "../../themes/character-appearance";
import type {CharacterAdvancementData} from "../../advancement/advancement-types";
import type {GenreAssociationData, GenreEffortCapMode} from "../../genre/genre-types";

export const POOL_KEYS = ["might", "speed", "intellect"] as const;

export type PoolKey = (typeof POOL_KEYS)[number];

export const RECOVERY_USAGE_KEYS = {
  "one-action": "oneAction",
  "10-minutes": "tenMinutes",
  "1-hour": "oneHour",
  "10-hours": "tenHours"
} as const satisfies Record<RecoveryType, string>;

export type RecoveryUsageKey = (typeof RECOVERY_USAGE_KEYS)[RecoveryType];
export type RecoveryUsage = Record<RecoveryUsageKey, boolean>;

export interface RecoverySlotData {
  id: string;
  type: RecoveryType;
  used: boolean;
}

export function createRecoveryUsage(used = false): RecoveryUsage {
  return {oneAction: used, tenMinutes: used, oneHour: used, tenHours: used};
}

export function availableRecoveryTypes(usage: RecoveryUsage): RecoveryType[] {
  return RECOVERY_TYPES.filter((type) => !usage[RECOVERY_USAGE_KEYS[type]]);
}

export interface StatPoolData {
  value: number;
  baseMax: number;
  baseEdge: number;
  /** Non-persisted Foundry compatibility projection. */
  max?: number;
  /** Non-persisted Foundry compatibility projection. */
  edge?: number;
}

export type CharacterPools = Record<PoolKey, StatPoolData>;

export interface CharacterNumericOverride {
  max: number | null;
  edge: number | null;
}

export interface CharacterOverrides {
  tier: number | null;
  effort: number | null;
  stats: Record<PoolKey, CharacterNumericOverride>;
  wounds?: WoundCapacities;
}

export interface WoundRecordData {
  id: string;
  label: string;
  description: string;
  sourceUuid: string;
  treated: boolean;
}

export type WoundCollection = Record<WoundSeverity, WoundRecordData[]>;
export type WoundCapacities = Record<WoundSeverity, number>;

export type ContributionSourceType = "base" | "core" | "rule-module" | "wound" | "item";

export interface DerivedContribution {
  id: string;
  sourceId: string;
  sourceType: ContributionSourceType;
  label: string;
  value: number;
}

export interface DerivedPoolData {
  calculatedMax: number;
  calculatedEdge: number;
  max: number;
  edge: number;
  maxContributions: DerivedContribution[];
  edgeContributions: DerivedContribution[];
}

export interface CharacterDerivedData {
  tier: {
    calculated: number;
    value: number;
  };
  pools: Record<PoolKey, DerivedPoolData>;
  effort: {
    calculatedMax: number;
    max: number;
    contributions: DerivedContribution[];
  };
  wounds: {
    calculatedCapacities: WoundCapacities;
    capacities: WoundCapacities;
    capacityContributions: Record<WoundSeverity, DerivedContribution[]>;
    hindrance: number;
    hindranceContributions: DerivedContribution[];
    dead: boolean;
  };
  recovery: {
    formula: string;
    calculatedFormula: string;
    calculatedBonus: number;
    manualModifier: number;
    bonus: number;
    bonusContributions: DerivedContribution[];
    availableTypes: RecoveryType[];
  };
  cypherLimit: {
    max: number;
    contributions: DerivedContribution[];
  };
  combat: {
    armor: {
      itemId: string;
      category: ArmorCategory | "none";
      freelyUsed: boolean;
      blockEase: number;
      dodgeHindrance: number;
      speedTaskHindrance: number;
      blockContributions: DerivedContribution[];
      dodgeContributions: DerivedContribution[];
      speedTaskContributions: DerivedContribution[];
    };
  };
  packages: {
    weaponCategories: string[];
    armorCategories: string[];
    genre: string;
    genreUuid: string;
    totalEffortCapMode: GenreEffortCapMode;
    typeNames: string[];
    descriptorNames: string[];
    speciesNames: string[];
    characterSentence: string;
  };
}

export interface RecoveryHistoryEntry {
  id: string;
  slotId: string;
  kind: RecoveryKind;
  type: RecoveryType;
  rolled: boolean;
  dieResult: number;
  tier: number;
  bonus: number;
  total: number;
  might: number;
  speed: number;
  intellect: number;
  timestamp: number;
}

export interface RestHistoryEntry {
  id: string;
  type: RestType;
  choice: string;
  majorTaskSucceeded: boolean;
  removedWoundIds: string[];
  timestamp: number;
}

export interface CharacterCoreSystemData {
  tier: number;
  overrides: CharacterOverrides;
  xp: number;
  resourcePoints: number;
  cypherLimitBase: number;
  focusProgress: FocusProgress[];
  genre: GenreAssociationData;
  appearance: CharacterAppearanceData;
  creation: {
    coreInitialized: boolean;
    mode: "uninitialized" | "completed" | "skipped" | "manual";
    initializedAt: number;
  };
  advancement: CharacterAdvancementData;
  proficiencies: {
    weaponCategories: string[];
    armorCategories: string[];
    freelyUse: string[];
  };
  stats: CharacterPools & {effortBase: number};
  wounds: WoundCollection;
  derived: CharacterDerivedData;
  recovery: {
    bonus: number;
    used: RecoveryUsage;
    slots: RecoverySlotData[];
    customized: boolean;
    rollModifier: number;
    history: RecoveryHistoryEntry[];
  };
  presentation: {
    hideFocusInSentence: boolean;
  };
  rest: {
    lastType: string;
    history: RestHistoryEntry[];
  };
}

export interface CharacterDocumentLike {
  type: string;
  system: CharacterCoreSystemData;
  update(changes: Record<string, unknown>): Promise<unknown>;
}

export type IdFactory = () => string;

let fallbackId = 0;

export const defaultIdFactory: IdFactory = () => {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (randomUUID) return randomUUID.call(globalThis.crypto);
  fallbackId += 1;
  return `cypherv2-${Date.now()}-${fallbackId}`;
};

export function assertCharacter(actor: CharacterDocumentLike): void {
  if (actor.type !== "character") throw new Error("Core Character services require a Character Actor.");
}

export function assertLiving(actor: CharacterDocumentLike): void {
  assertCharacter(actor);
  if (actor.system.derived.wounds.dead) throw new Error("A dead Character cannot use this service.");
}

export function cloneWounds(wounds: WoundCollection): WoundCollection {
  return {
    minor: wounds.minor.map((wound) => ({...wound})),
    moderate: wounds.moderate.map((wound) => ({...wound})),
    major: wounds.major.map((wound) => ({...wound}))
  };
}
