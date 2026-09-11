import type {SkillRank} from "../constants/system";
import type {PoolKey} from "../rules/core/core-types";

export const PACKAGE_GENRES = ["none", "fantasy", "scienceFiction", "superhero", "custom"] as const;
export const PACKAGE_ROLES = ["primary", "additional", "speciesGranted", "custom"] as const;
export const EDGE_GRANT_MODES = ["none", "fixed", "choice"] as const;
export const GRANT_KINDS = ["type", "descriptor", "focus", "genre", "species", "other"] as const;
export const GRANT_STATUSES = ["active", "retained"] as const;
export const PACKAGE_CHOICE_SOURCE_MODES = ["fixed", "catalog"] as const;
export const PACKAGE_CHOICE_CATALOG_ITEM_TYPES = ["none", "descriptor"] as const;

export type PackageGenre = (typeof PACKAGE_GENRES)[number];
export type PackageRole = (typeof PACKAGE_ROLES)[number];
export type EdgeGrantMode = (typeof EDGE_GRANT_MODES)[number];
export type GrantKind = (typeof GRANT_KINDS)[number];
export type GrantStatus = (typeof GRANT_STATUSES)[number];
export type PackageChoiceSourceMode = (typeof PACKAGE_CHOICE_SOURCE_MODES)[number];
export type PackageChoiceCatalogItemType = (typeof PACKAGE_CHOICE_CATALOG_ITEM_TYPES)[number];

export interface ItemSnapshot {
  readonly name: string;
  readonly img?: string;
  readonly system: Record<string, unknown>;
}

export interface AbilityGrant {
  readonly id: string;
  readonly abilityUuid: string;
  readonly notes?: string;
  readonly snapshot: ItemSnapshot;
  readonly alternatives?: readonly GrantAlternative[];
}

export interface GrantAlternative {
  readonly id: string;
  readonly itemUuid: string;
  readonly customName: string;
  readonly snapshot: ItemSnapshot;
}

export interface AbilityChoiceGroup {
  readonly id: string;
  readonly choose: number;
  readonly options: readonly AbilityGrant[];
}

export interface DescriptorGrant {
  readonly id: string;
  readonly descriptorUuid: string;
  readonly snapshot: ItemSnapshot;
}

export interface DescriptorChoiceGroup {
  readonly id: string;
  readonly choose: number;
  readonly sourceMode?: PackageChoiceSourceMode;
  readonly catalogItemType?: PackageChoiceCatalogItemType;
  readonly options: readonly DescriptorGrant[];
}

export interface SkillGrantOption {
  readonly id: string;
  readonly skillUuid: string;
  readonly customName: string;
  readonly notes?: string;
  readonly snapshot: ItemSnapshot;
}

export interface SkillGrant extends SkillGrantOption {
  readonly rank: SkillRank;
  readonly alternatives?: readonly GrantAlternative[];
}

export interface SkillChoiceGroup {
  readonly id: string;
  readonly choose: number;
  readonly rank: SkillRank;
  readonly options: readonly SkillGrantOption[];
}

export interface PoolBonusChoiceGroup {
  readonly id: string;
  readonly amount: number;
  readonly choose: number;
  readonly pools: readonly PoolKey[];
}

export interface PackageInstanceData {
  readonly sourceUuid: string;
  readonly instanceId: string;
  readonly role: PackageRole;
  readonly attachedAt: number;
  readonly selections: {
    readonly edgePool: PoolKey | "none";
    readonly superheroicsPool?: PoolKey | "none";
    readonly powerShifts?: readonly string[];
    readonly poolChoices: readonly {readonly groupId: string; readonly pools: readonly PoolKey[]}[];
    readonly skillChoices: readonly {readonly groupId: string; readonly optionIds: readonly string[]}[];
    readonly abilityChoices: readonly {readonly groupId: string; readonly optionIds: readonly string[]}[];
    readonly descriptorChoices?: readonly {readonly groupId: string; readonly optionIds: readonly string[]}[];
    readonly suppressedGrantIds: readonly string[];
  };
  readonly parent: GrantedByData;
}

export interface GrantedByData {
  readonly kind: GrantKind;
  readonly sourceUuid: string;
  readonly instanceId: string;
  readonly grantId: string;
  readonly status: GrantStatus;
  readonly contentUuid: string;
  readonly contentKey: string;
  readonly replacement: {
    readonly active: boolean;
    readonly originalName: string;
    readonly originalContentUuid: string;
    readonly originalContentKey: string;
    readonly replacementName: string;
    readonly replacementContentUuid: string;
    readonly replacementContentKey: string;
    readonly selectionKind: "none" | "suggested" | "world" | "compendium" | "custom";
  };
}

export interface CharacterTypeSystemData {
  readonly poolBonuses: Record<PoolKey, number>;
  readonly woundBonuses: {readonly minor: number; readonly moderate: number; readonly major: number};
  readonly edgeGrant: {readonly mode: EdgeGrantMode; readonly pool: PoolKey | "none"; readonly amount: number};
  readonly weaponUse: {readonly light: boolean; readonly medium: boolean; readonly heavy: boolean};
  readonly weaponFamilies?: readonly string[];
  /** @deprecated Unreleased beta.3 compatibility; migrated to weaponFamilies. */
  readonly weaponFamilyUse?: Readonly<Record<string, boolean>>;
  readonly armorUse: {readonly light: boolean; readonly medium: boolean; readonly heavy: boolean};
  readonly abilityGrants: readonly AbilityGrant[];
  readonly abilityChoiceGroups: readonly AbilityChoiceGroup[];
  readonly skillGrants: readonly SkillGrant[];
  readonly choiceGroups: readonly SkillChoiceGroup[];
  readonly genre: PackageGenre;
  readonly superhero?: {
    readonly rank: number;
    readonly powerShiftCount: number;
    readonly superheroics: {readonly enabled: boolean; readonly poolBonus: number};
  };
  readonly customGenreId: string;
  readonly backgroundOptions: string;
  readonly equipmentNotes: string;
  readonly equipmentBundleUuid: string;
  readonly instance: PackageInstanceData;
  readonly description: string;
}

export interface DescriptorSystemData {
  readonly poolBonuses: Record<PoolKey, number>;
  readonly poolBonusChoiceGroups: readonly PoolBonusChoiceGroup[];
  readonly skillGrants: readonly SkillGrant[];
  readonly choiceGroups: readonly SkillChoiceGroup[];
  readonly instance: PackageInstanceData;
  readonly description: string;
}

export interface SpeciesSystemData {
  readonly poolBonuses: Record<PoolKey, number>;
  readonly woundBonuses: {readonly minor: number; readonly moderate: number; readonly major: number};
  readonly edgeGrant: {readonly mode: EdgeGrantMode; readonly pool: PoolKey | "none"; readonly amount: number};
  readonly weaponUse: {readonly light: boolean; readonly medium: boolean; readonly heavy: boolean};
  readonly weaponFamilies?: readonly string[];
  /** @deprecated Unreleased beta.3 compatibility; migrated to weaponFamilies. */
  readonly weaponFamilyUse?: Readonly<Record<string, boolean>>;
  readonly armorUse: {readonly light: boolean; readonly medium: boolean; readonly heavy: boolean};
  readonly cypherLimitBonus: number;
  readonly skillGrants: readonly SkillGrant[];
  readonly choiceGroups: readonly SkillChoiceGroup[];
  readonly abilityGrants: readonly AbilityGrant[];
  readonly abilityChoiceGroups: readonly AbilityChoiceGroup[];
  readonly descriptorGrants: readonly DescriptorGrant[];
  readonly descriptorChoiceGroups: readonly DescriptorChoiceGroup[];
  readonly instance: PackageInstanceData;
  readonly description: string;
}

export interface CharacterPackageItemLike {
  readonly id: string;
  readonly uuid: string;
  readonly name: string;
  readonly type: "characterType" | "descriptor" | "species";
  readonly img?: string;
  readonly system: CharacterTypeSystemData | DescriptorSystemData | SpeciesSystemData;
  toObject?(): Record<string, unknown>;
  update?(changes: Record<string, unknown>): Promise<unknown>;
  delete?(): Promise<unknown>;
}
