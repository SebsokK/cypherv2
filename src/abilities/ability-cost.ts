import {POOL_KEYS, type PoolKey} from "../rules/core/core-types";

export const ALL_ABILITY_COST_POOLS: readonly PoolKey[] = [...POOL_KEYS];

export function normalizeAbilityAllowedPools(
  allowedPools: unknown,
  legacyPool: unknown = "none"
): PoolKey[] {
  if (Array.isArray(allowedPools)) {
    return POOL_KEYS.filter((pool) => allowedPools.includes(pool));
  }
  if (legacyPool === "choose" || legacyPool === "any") return [...POOL_KEYS];
  return POOL_KEYS.includes(legacyPool as PoolKey) ? [legacyPool as PoolKey] : [];
}

export function abilityAllowedPools(ability: {
  readonly system: {
    readonly pool?: unknown;
    readonly cost: {readonly allowedPools?: unknown};
  };
}): readonly PoolKey[] {
  return normalizeAbilityAllowedPools(ability.system.cost.allowedPools, ability.system.pool);
}

export interface AbilityPoolListSeparators {
  readonly pair: string;
  readonly middle: string;
  readonly final: string;
}

/** Format one legal whole-cost Pool choice without implying that the cost may be split. */
export function formatAbilityPoolList(
  pools: readonly PoolKey[],
  poolLabel: (pool: PoolKey) => string,
  separators: AbilityPoolListSeparators
): string {
  const normalized = POOL_KEYS.filter((pool) => pools.includes(pool));
  if (normalized.length === 0) return "";
  if (normalized.length === 1) return poolLabel(normalized[0]!);
  if (normalized.length === 2) {
    return `${poolLabel(normalized[0]!)}${separators.pair}${poolLabel(normalized[1]!)}`;
  }
  return `${poolLabel(normalized[0]!)}${separators.middle}${poolLabel(normalized[1]!)}${separators.final}${poolLabel(normalized[2]!)}`;
}

export function formatAbilityCost(
  amount: number,
  pools: readonly PoolKey[],
  poolLabel: (pool: PoolKey) => string,
  separators: AbilityPoolListSeparators
): string {
  if (!Number.isInteger(amount) || amount <= 0 || pools.length === 0) return "";
  return `${amount} ${formatAbilityPoolList(pools, poolLabel, separators)}`;
}
