import type {
  CharacterCoreSystemData,
  CharacterOverrides,
  PoolKey
} from "./core-types";

export const CHARACTER_OVERRIDE_KEYS = [
  "tier",
  "effort",
  "mightMax",
  "mightEdge",
  "speedMax",
  "speedEdge",
  "intellectMax",
  "intellectEdge"
] as const;

export type CharacterOverrideKey = (typeof CHARACTER_OVERRIDE_KEYS)[number];

export interface CharacterOverrideView {
  readonly key: CharacterOverrideKey;
  readonly path: string;
  readonly calculated: number;
  readonly override: number | null;
  readonly effective: number;
  readonly minimum: number;
}

export interface CharacterProgressionDelta {
  readonly path: string;
  readonly value: number;
  readonly overrideActive: boolean;
}

export function emptyCharacterOverrides(): CharacterOverrides {
  return {
    tier: null,
    effort: null,
    stats: {
      might: {max: null, edge: null},
      speed: {max: null, edge: null},
      intellect: {max: null, edge: null}
    }
  };
}

export function resolveNumericOverride(calculated: number, override: number | null | undefined): number {
  return Number.isInteger(override) ? Number(override) : calculated;
}

function poolKey(key: CharacterOverrideKey): PoolKey | null {
  if (key.startsWith("might")) return "might";
  if (key.startsWith("speed")) return "speed";
  if (key.startsWith("intellect")) return "intellect";
  return null;
}

export function characterOverridePath(key: CharacterOverrideKey): string {
  if (key === "tier" || key === "effort") return `system.overrides.${key}`;
  const pool = poolKey(key)!;
  return `system.overrides.stats.${pool}.${key.endsWith("Max") ? "max" : "edge"}`;
}

/**
 * Route a permanent progression delta to the Character's authoritative value.
 * An active override remains authoritative; otherwise progression changes the
 * ordinary persisted base field.
 */
export function characterProgressionDelta(
  system: Pick<CharacterCoreSystemData, "tier" | "overrides" | "stats">,
  key: CharacterOverrideKey,
  delta: number
): CharacterProgressionDelta {
  if (!Number.isFinite(delta)) throw new Error("Character progression delta must be finite.");
  if (key === "tier") {
    const overrideActive = Number.isInteger(system.overrides?.tier);
    return {
      path: overrideActive ? characterOverridePath(key) : "system.tier",
      value: (overrideActive ? Number(system.overrides.tier) : system.tier) + delta,
      overrideActive
    };
  }
  if (key === "effort") {
    const overrideActive = Number.isInteger(system.overrides?.effort);
    return {
      path: overrideActive ? characterOverridePath(key) : "system.stats.effortBase",
      value: (overrideActive ? Number(system.overrides.effort) : system.stats.effortBase) + delta,
      overrideActive
    };
  }
  const pool = poolKey(key)!;
  const field = key.endsWith("Max") ? "max" : "edge";
  const override = system.overrides?.stats?.[pool]?.[field];
  const overrideActive = Number.isInteger(override);
  const base = field === "max" ? system.stats[pool].baseMax : system.stats[pool].baseEdge;
  return {
    path: overrideActive
      ? characterOverridePath(key)
      : `system.stats.${pool}.${field === "max" ? "baseMax" : "baseEdge"}`,
    value: (overrideActive ? Number(override) : base) + delta,
    overrideActive
  };
}

export function effectiveTier(system: {
  readonly tier: number;
  readonly overrides?: {readonly tier?: number | null};
  readonly derived?: {readonly tier?: {readonly value: number}};
}): number {
  return system.derived?.tier?.value
    ?? resolveNumericOverride(system.tier, system.overrides?.tier);
}

export function characterOverrideView(
  system: CharacterCoreSystemData,
  key: CharacterOverrideKey
): CharacterOverrideView {
  if (key === "tier") return {
    key,
    path: characterOverridePath(key),
    calculated: system.derived.tier.calculated,
    override: system.overrides?.tier ?? null,
    effective: system.derived.tier.value,
    minimum: 1
  };
  if (key === "effort") return {
    key,
    path: characterOverridePath(key),
    calculated: system.derived.effort.calculatedMax,
    override: system.overrides?.effort ?? null,
    effective: system.derived.effort.max,
    minimum: 0
  };
  const pool = poolKey(key)!;
  const field = key.endsWith("Max") ? "max" : "edge";
  const derived = system.derived.pools[pool];
  return {
    key,
    path: characterOverridePath(key),
    calculated: field === "max" ? derived.calculatedMax : derived.calculatedEdge,
    override: system.overrides?.stats?.[pool]?.[field] ?? null,
    effective: derived[field],
    minimum: field === "max" ? 1 : -20
  };
}
