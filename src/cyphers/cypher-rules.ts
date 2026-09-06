import {
  CYPHER_MANIFESTATIONS,
  CYPHER_POWERS,
  type CypherManifestation,
  type CypherPower
} from "../constants/system";

export interface CypherRuleData {
  readonly manifestation?: unknown;
  readonly power?: unknown;
  readonly level?: unknown;
  readonly levelOverride?: unknown;
}

export function normalizeCypherManifestation(value: unknown): CypherManifestation {
  return CYPHER_MANIFESTATIONS.includes(value as CypherManifestation)
    ? value as CypherManifestation
    : "subtle";
}

export function normalizeCypherPower(value: unknown): CypherPower {
  return CYPHER_POWERS.includes(value as CypherPower) ? value as CypherPower : "low";
}

export function cypherLevel(data: CypherRuleData): number {
  const override = Number(data.level);
  if (data.levelOverride === true && Number.isInteger(override) && override >= 1) return override;
  return normalizeCypherManifestation(data.manifestation) === "manifest" ? 6 : 4;
}
