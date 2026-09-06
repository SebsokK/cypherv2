import {ARMOR_CATEGORIES, WEAPON_CATEGORIES, type ArmorCategory, type WeaponCategory, type WoundSeverity} from "../constants/system";
import type {CharacterDerivedExtensions} from "../rules/core/derived-data";
import {POOL_KEYS, type DerivedContribution, type PoolKey} from "../rules/core/core-types";
import type {CharacterPackageItemLike, CharacterTypeSystemData, DescriptorSystemData, SpeciesSystemData} from "./package-types";

export interface ResolvedPoolBonusChoice {
  readonly groupId: string;
  readonly pool: PoolKey;
  readonly amount: number;
}

export interface PackageDerivedData {
  readonly extensions: CharacterDerivedExtensions;
  readonly weaponCategories: readonly WeaponCategory[];
  readonly armorCategories: readonly ArmorCategory[];
  readonly typeNames: readonly string[];
  readonly descriptorNames: readonly string[];
  readonly speciesNames: readonly string[];
  readonly characterSentence: string;
}

function contribution(item: CharacterPackageItemLike, key: string, value: number): DerivedContribution {
  const instanceId = item.system.instance.instanceId || item.id;
  return {
    id: `package.${instanceId}.${key}`,
    sourceId: item.id,
    sourceType: "item",
    label: item.name,
    value
  };
}

function positiveInteger(value: unknown): number {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : 0;
}

/** Resolve the persisted Descriptor selections into deterministic derived bonuses. */
export function resolvedPoolBonusChoices(item: CharacterPackageItemLike): readonly ResolvedPoolBonusChoice[] {
  if (item.type !== "descriptor") return [];
  const system = item.system as DescriptorSystemData;
  const selections = system.instance?.selections?.poolChoices ?? [];
  return (system.poolBonusChoiceGroups ?? []).flatMap((group) => {
    const amount = positiveInteger(group.amount);
    const allowed = new Set(group.pools.filter((pool): pool is PoolKey => POOL_KEYS.includes(pool)));
    const selected = selections.find((entry) => entry.groupId === group.id)?.pools ?? [];
    const pools = [...new Set(selected)]
      .filter((pool): pool is PoolKey => allowed.has(pool))
      .slice(0, positiveInteger(group.choose));
    return amount ? pools.map((pool) => ({groupId: group.id, pool, amount})) : [];
  });
}

export function characterSentence(
  descriptorNames: readonly string[],
  typeNames: readonly string[],
  focusNames: readonly string[] = []
): string {
  const identity = [...descriptorNames, ...typeNames].join(" ").trim();
  const focus = focusNames.length > 0 ? `who ${focusNames.join(" and ")}` : "";
  return [identity, focus].filter(Boolean).join(" ");
}

export function collectPackageDerivedData(
  items: readonly CharacterPackageItemLike[],
  baseWeaponCategories: readonly string[] = [],
  baseArmorCategories: readonly string[] = [],
  focusNames: readonly string[] = []
): PackageDerivedData {
  const poolMax: Partial<Record<PoolKey, DerivedContribution[]>> = {};
  const poolEdge: Partial<Record<PoolKey, DerivedContribution[]>> = {};
  const woundCapacity: Partial<Record<WoundSeverity, DerivedContribution[]>> = {};
  const weaponCategories = new Set(baseWeaponCategories.filter((entry): entry is WeaponCategory => WEAPON_CATEGORIES.includes(entry as WeaponCategory)));
  const armorCategories = new Set(baseArmorCategories.filter((entry): entry is ArmorCategory => ARMOR_CATEGORIES.includes(entry as ArmorCategory)));
  const typeNames: string[] = [];
  const descriptorNames: string[] = [];
  const speciesNames: string[] = [];
  const cypherLimit: DerivedContribution[] = [];

  for (const item of items) {
    if (item.type === "characterType" || item.type === "species") {
      const system = item.system as CharacterTypeSystemData | SpeciesSystemData;
      if (item.type === "characterType") {
        typeNames.push(item.name);
        const typeSystem = system as CharacterTypeSystemData;
      } else {
        speciesNames.push(item.name);
        const value = positiveInteger((system as SpeciesSystemData).cypherLimitBonus);
        if (value) cypherLimit.push(contribution(item, "cypher-limit", value));
      }
      for (const severity of ["minor", "moderate", "major"] as const) {
        const value = positiveInteger(system.woundBonuses[severity]);
        if (value) (woundCapacity[severity] ??= []).push(contribution(item, `wound.${severity}`, value));
      }
      const selectedPool = system.edgeGrant.mode === "choice"
        ? system.instance.selections.edgePool
        : system.edgeGrant.pool;
      if (selectedPool !== "none" && POOL_KEYS.includes(selectedPool)) {
        const value = positiveInteger(system.edgeGrant.amount);
        if (value) (poolEdge[selectedPool] ??= []).push(contribution(item, `edge.${selectedPool}`, value));
      }
      for (const category of WEAPON_CATEGORIES) if (system.weaponUse[category]) weaponCategories.add(category);
      for (const category of ARMOR_CATEGORIES) if (system.armorUse[category]) armorCategories.add(category);
    } else {
      descriptorNames.push(item.name);
    }
    const poolBonuses = item.system.poolBonuses;
    for (const pool of POOL_KEYS) {
      const value = positiveInteger(poolBonuses[pool]);
      if (value) (poolMax[pool] ??= []).push(contribution(item, `pool.${pool}`, value));
    }
    for (const selected of resolvedPoolBonusChoices(item)) {
      (poolMax[selected.pool] ??= []).push(contribution(
        item,
        `pool-choice.${selected.groupId}.${selected.pool}`,
        selected.amount
      ));
    }
  }

  return {
    extensions: {poolMax, poolEdge, woundCapacity, cypherLimit},
    weaponCategories: [...weaponCategories],
    armorCategories: [...armorCategories],
    typeNames,
    descriptorNames,
    speciesNames,
    characterSentence: characterSentence(descriptorNames, typeNames, focusNames)
  };
}

export function packagePoolBonuses(item: CharacterPackageItemLike): Record<PoolKey, number> {
  const system = item.system as CharacterTypeSystemData | DescriptorSystemData | SpeciesSystemData;
  const bonuses = Object.fromEntries(POOL_KEYS.map((pool) => [pool, positiveInteger(system.poolBonuses[pool])])) as Record<PoolKey, number>;
  for (const selected of resolvedPoolBonusChoices(item)) bonuses[selected.pool] += selected.amount;
  return bonuses;
}

export function preservePoolDeficit(value: number, oldMax: number, newMax: number): number {
  const deficit = Math.max(0, oldMax - value);
  return Math.max(0, Math.min(newMax, newMax - deficit));
}
