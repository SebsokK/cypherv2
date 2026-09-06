import type {DepletionRule} from "./depletion-types";

export const DEPLETION_DIE_MIN = 2;
export const DEPLETION_DIE_MAX = 1000;

export function depletionDieSides(rule: Pick<DepletionRule, "die">): number {
  const match = String(rule.die).trim().match(/^d(\d+)$/i);
  const sides = Number(match?.[1]);
  if (!Number.isInteger(sides) || sides < DEPLETION_DIE_MIN || sides > DEPLETION_DIE_MAX) {
    throw new Error(`Depletion die must have ${DEPLETION_DIE_MIN} to ${DEPLETION_DIE_MAX} sides.`);
  }
  return sides;
}

export function depletionRollFormula(rule: Pick<DepletionRule, "die">): string {
  return `1d${depletionDieSides(rule)}`;
}

export function depletionLabel(rule: Pick<DepletionRule, "die" | "threshold">): string {
  const sides = depletionDieSides(rule);
  const threshold = Number(rule.threshold);
  if (!Number.isInteger(threshold) || threshold < 1 || threshold > sides) {
    throw new Error(`Depletion threshold must be between 1 and ${sides}.`);
  }
  return `${depletionThresholdLabel(threshold)} in 1d${sides}`;
}

export function depletionThresholdLabel(threshold: number): string {
  return threshold === 1 ? "1" : `1-${threshold}`;
}
