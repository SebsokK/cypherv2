import {
  ARMOR_CATEGORIES,
  WOUND_SEVERITIES,
  type ArmorCategory,
  type WoundSeverity
} from "../../constants/system";
import {
  POOL_KEYS,
  availableRecoveryTypes,
  type CharacterDerivedData,
  type CharacterOverrides,
  type CharacterPools,
  type DerivedContribution,
  type PoolKey,
  type RecoveryUsage,
  type WoundCollection
} from "./core-types";
import {emptyCharacterOverrides, resolveNumericOverride} from "./character-overrides";

export interface CharacterDerivedExtensions {
  poolMax?: Partial<Record<PoolKey, readonly DerivedContribution[]>>;
  poolEdge?: Partial<Record<PoolKey, readonly DerivedContribution[]>>;
  woundCapacity?: Partial<Record<WoundSeverity, readonly DerivedContribution[]>>;
  hindrance?: readonly DerivedContribution[];
  effortMax?: readonly DerivedContribution[];
  recoveryBonus?: readonly DerivedContribution[];
  cypherLimit?: readonly DerivedContribution[];
}

export interface ArmorItemDataLike {
  readonly id: string;
  readonly type: string;
  readonly system: {
    readonly category: ArmorCategory;
    readonly equipped: boolean;
    /** @deprecated Retained only so legacy Armor data remains readable. */
    readonly freelyUsed: boolean;
    readonly slug?: string;
  };
}

export interface CharacterProficienciesLike {
  readonly armorCategories: readonly string[];
  readonly freelyUse: readonly string[];
}

const ARMOR_STEPS: Readonly<Record<ArmorCategory, number>> = Object.freeze({
  light: 1,
  medium: 2,
  heavy: 3
});

function total(contributions: readonly DerivedContribution[]): number {
  return contributions.reduce((sum, contribution) => sum + contribution.value, 0);
}

function contribution(
  id: string,
  sourceId: string,
  sourceType: DerivedContribution["sourceType"],
  label: string,
  value: number
): DerivedContribution {
  return {id, sourceId, sourceType, label, value};
}

export function deriveCharacterData(
  stats: CharacterPools & {effortBase?: number},
  wounds: WoundCollection,
  recoveryUsage: RecoveryUsage,
  extensions: CharacterDerivedExtensions = {},
  armorItems: readonly ArmorItemDataLike[] = [],
  proficiencies: CharacterProficienciesLike = {armorCategories: [], freelyUse: []},
  recoveryBonus = 0,
  packagePresentation: CharacterDerivedData["packages"] = {
    weaponCategories: [], armorCategories: [], genre: "none", genreUuid: "", totalEffortCapMode: "core",
    typeNames: [], descriptorNames: [], speciesNames: [], characterSentence: ""
  },
  cypherLimitBase = 2,
  tier = 1,
  overrides: CharacterOverrides = emptyCharacterOverrides()
): CharacterDerivedData {
  const pools = {} as CharacterDerivedData["pools"];

  for (const pool of POOL_KEYS) {
    const maxContributions = [
      contribution(
        `pool.${pool}.max.base`,
        `system.stats.${pool}.baseMax`,
        "base",
        `${pool} base maximum`,
        stats[pool].baseMax
      ),
      ...(extensions.poolMax?.[pool] ?? [])
    ];
    const edgeContributions = [
      contribution(
        `pool.${pool}.edge.base`,
        `system.stats.${pool}.baseEdge`,
        "base",
        `${pool} base Edge`,
        stats[pool].baseEdge
      ),
      ...(extensions.poolEdge?.[pool] ?? [])
    ];
    const calculatedMax = total(maxContributions);
    const calculatedEdge = total(edgeContributions);
    pools[pool] = {
      calculatedMax,
      calculatedEdge,
      max: resolveNumericOverride(calculatedMax, overrides.stats?.[pool]?.max),
      edge: resolveNumericOverride(calculatedEdge, overrides.stats?.[pool]?.edge),
      maxContributions,
      edgeContributions
    };
  }

  const effortContributions = [
    contribution(
      "effort.max.base",
      "system.stats.effortBase",
      "base",
      "Base Effort",
      stats.effortBase ?? 0
    ),
    ...(extensions.effortMax ?? [])
  ];
  const calculatedEffort = Math.max(0, total(effortContributions));
  const recoveryBonusContributions = [
    contribution(
      "recovery.bonus.base",
      "system.recovery.bonus",
      "base",
      "Permanent Recovery bonus",
      recoveryBonus
    ),
    ...(extensions.recoveryBonus ?? [])
  ];
  const derivedRecoveryBonus = total(recoveryBonusContributions);
  const cypherLimitContributions = [
    contribution("cypher-limit.base", "system.cypherLimitBase", "base", "Base Cypher Limit", cypherLimitBase),
    ...(extensions.cypherLimit ?? [])
  ];

  const capacityContributions = {} as CharacterDerivedData["wounds"]["capacityContributions"];
  const capacities = {} as CharacterDerivedData["wounds"]["capacities"];
  for (const severity of WOUND_SEVERITIES) {
    const contributions = [
      contribution(
        `wound.${severity}.capacity.core`,
        "cypherv2.core",
        "core",
        `${severity} Wound capacity`,
        3
      ),
      ...(extensions.woundCapacity?.[severity] ?? [])
    ];
    capacityContributions[severity] = contributions;
    capacities[severity] = Math.max(0, total(contributions));
  }

  const hindranceContributions: DerivedContribution[] = [];
  if (wounds.moderate.length >= capacities.moderate) {
    hindranceContributions.push(
      contribution(
        "wound.moderate.full.hindrance",
        "cypherv2.core",
        "core",
        "Moderate Wounds full",
        1
      )
    );
  }
  for (const wound of wounds.major) {
    hindranceContributions.push(
      contribution(
        `wound.major.${wound.id}.hindrance`,
        wound.id,
        "wound",
        wound.label || "Major Wound",
        1
      )
    );
  }
  hindranceContributions.push(...(extensions.hindrance ?? []));

  const armor = [...armorItems]
    .filter((item) => item.type === "armor" && item.system.equipped)
    .filter((item) => ARMOR_CATEGORIES.includes(item.system.category))
    .sort((left, right) => (
      ARMOR_STEPS[right.system.category] - ARMOR_STEPS[left.system.category]
      || left.id.localeCompare(right.id)
    ))[0];
  const armorCategory = armor?.system.category ?? "none";
  const armorSteps = armor ? ARMOR_STEPS[armor.system.category] : 0;
  const freelyUsed = armor
    ? proficiencies.armorCategories.includes(armor.system.category)
    : true;
  const armorContribution = (
    suffix: string,
    label: string,
    value: number
  ): DerivedContribution[] => armor && value > 0 ? [contribution(
    `armor.${armor.id}.${suffix}`,
    armor.id,
    "item",
    label,
    value
  )] : [];
  const blockContributions = armorContribution("block", "Armor: Block", armorSteps);
  const dodgeContributions = armorContribution("dodge", "Armor: Dodge", armorSteps);
  const speedTaskContributions = armorContribution(
    "speed-task",
    "Unfamiliar armor: Speed task",
    freelyUsed ? 0 : armorSteps
  );

  return {
    tier: {
      calculated: tier,
      value: resolveNumericOverride(tier, overrides.tier)
    },
    pools,
    effort: {
      calculatedMax: calculatedEffort,
      max: Math.max(0, resolveNumericOverride(calculatedEffort, overrides.effort)),
      contributions: effortContributions
    },
    wounds: {
      capacities,
      capacityContributions,
      hindrance: total(hindranceContributions),
      hindranceContributions,
      dead: wounds.major.length >= capacities.major
    },
    recovery: {
      formula: derivedRecoveryBonus === 0
        ? "1d6 + Tier"
        : `1d6 + Tier + ${derivedRecoveryBonus}`,
      bonus: derivedRecoveryBonus,
      bonusContributions: recoveryBonusContributions,
      availableTypes: availableRecoveryTypes(recoveryUsage)
    },
    cypherLimit: {max: Math.max(0, total(cypherLimitContributions)), contributions: cypherLimitContributions},
    combat: {
      armor: {
        itemId: armor?.id ?? "",
        category: armorCategory,
        freelyUsed,
        blockEase: total(blockContributions),
        dodgeHindrance: total(dodgeContributions),
        speedTaskHindrance: total(speedTaskContributions),
        blockContributions,
        dodgeContributions,
        speedTaskContributions
      }
    },
    packages: packagePresentation
  };
}
