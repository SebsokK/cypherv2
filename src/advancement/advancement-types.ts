import type {PoolKey} from "../rules/core/core-types";

export const CORE_ADVANCEMENT_KINDS = [
  "increaseCapabilities",
  "moveTowardPerfection",
  "extraEffort",
  "skillTraining"
] as const;

export const OTHER_ADVANCEMENT_KINDS = [
  "recovery",
  "focus",
  "armor",
  "weapons",
  "genre"
] as const;

export const ADVANCEMENT_RECORD_KINDS = [...CORE_ADVANCEMENT_KINDS, "other"] as const;
export const FOCUS_CHOICE_SOURCES = [
  "characterCreation",
  "additionalFocus",
  "otherAdvancement",
  "newTier"
] as const;
export const GENRE_CHOICE_SOURCES = ["otherAdvancement", "newTier"] as const;

export type CoreAdvancementKind = (typeof CORE_ADVANCEMENT_KINDS)[number];
export type OtherAdvancementKind = (typeof OTHER_ADVANCEMENT_KINDS)[number];
export type AdvancementRecordKind = (typeof ADVANCEMENT_RECORD_KINDS)[number];
export type FocusChoiceSource = (typeof FOCUS_CHOICE_SOURCES)[number];
export type GenreChoiceSource = (typeof GENRE_CHOICE_SOURCES)[number];

export interface AdvancementPurchaseRecord {
  readonly id: string;
  readonly kind: AdvancementRecordKind;
  readonly otherKind: OtherAdvancementKind | "none";
  readonly tier: number;
  readonly xpCost: number;
  readonly resourcePointsGranted: number;
  readonly timestamp: number;
}

export interface PendingFocusChoice {
  readonly id: string;
  readonly source: FocusChoiceSource;
  readonly grantTier: number;
  /** Empty means that the choice may be spent in any one attached Focus. */
  readonly focusUuid: string;
}

export interface PendingGenreChoice {
  readonly id: string;
  readonly source: GenreChoiceSource;
  readonly grantTier: number;
}

export interface CharacterAdvancementData {
  readonly cycle: number;
  readonly purchases: readonly AdvancementPurchaseRecord[];
  readonly initializedFocusUuids: readonly string[];
  readonly pendingFocusChoices: readonly PendingFocusChoice[];
  readonly pendingGenreChoices: readonly PendingGenreChoice[];
  /** Explicit user acknowledgement only; never inferred from owned content. */
  readonly guidanceCompletedTiers?: readonly number[];
  readonly notes: string;
}

export interface AdvancementPolicy {
  readonly xpCost: number;
  readonly purchasesPerTier: number;
  readonly capabilityPoints: number;
  readonly effortMaximum: number;
  readonly recoveryBonus: number;
  readonly resourcePointsForTier: (tier: number) => number;
  readonly genreChoiceForTier: (tier: number) => boolean;
  readonly attackDefenseTrainingTier: number;
  readonly attackDefenseSpecializationTier: number;
}

export type AdvancementRequest =
  | {readonly kind: "increaseCapabilities"; readonly allocation: Readonly<Record<PoolKey, number>>}
  | {readonly kind: "moveTowardPerfection"; readonly pool: PoolKey}
  | {readonly kind: "extraEffort"}
  | {readonly kind: "skillTraining"; readonly mode: "improve"; readonly skillId: string}
  | {
    readonly kind: "skillTraining";
    readonly mode: "learn";
    readonly sourceUuid?: string;
    readonly customName?: string;
    readonly customCategory?: "general" | "attack" | "defense";
  }
  | {readonly kind: "other"; readonly otherKind: OtherAdvancementKind};

export const CORE_ADVANCEMENT_POLICY: AdvancementPolicy = Object.freeze({
  xpCost: 4,
  purchasesPerTier: 4,
  capabilityPoints: 4,
  effortMaximum: 6,
  recoveryBonus: 2,
  resourcePointsForTier: (tier: number) => tier >= 5 ? 3 : tier >= 3 ? 2 : 1,
  genreChoiceForTier: (tier: number) => tier >= 3 && tier % 3 === 0,
  attackDefenseTrainingTier: 2,
  attackDefenseSpecializationTier: 4
});
