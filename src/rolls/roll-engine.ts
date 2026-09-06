import type {
  NaturalRollMarker,
  NaturalEffect,
  PreparedRoll,
  RollContext,
  RollResult,
  RollStepContribution
} from "./roll-types";
import {normalizeHorrorIntrusionRange} from "../horror/horror-mode";

function integer(value: number, label: string, minimum = 0): number {
  if (!Number.isInteger(value) || value < minimum) {
    throw new Error(`${label} must be an integer of at least ${minimum}.`);
  }
  return value;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function effortCost(levels: number): number {
  const safeLevels = integer(levels, "Paid Effort");
  return safeLevels === 0 ? 0 : 3 + ((safeLevels - 1) * 2);
}

export interface PoolCostCalculation {
  readonly actionCostBeforeEdge: number;
  readonly effortCostBeforeEdge: number;
  readonly totalCostBeforeEdge: number;
  readonly edgeApplied: number;
  readonly poolCost: number;
}

export function calculatePoolCost(
  actionCost: number,
  effortCostBeforeEdge: number,
  edge: number,
  actionCostIgnoresEdge = false
): PoolCostCalculation {
  const safeActionCost = integer(actionCost, "Action cost");
  const safeEffortCost = integer(effortCostBeforeEdge, "Effort cost");
  const totalCostBeforeEdge = safeActionCost + safeEffortCost;
  const edgeEligibleCost = safeEffortCost + (actionCostIgnoresEdge ? 0 : safeActionCost);
  const edgeApplied = Math.min(edgeEligibleCost, Math.max(0, Math.trunc(edge)));
  return {
    actionCostBeforeEdge: safeActionCost,
    effortCostBeforeEdge: safeEffortCost,
    totalCostBeforeEdge,
    edgeApplied,
    poolCost: Math.max(0, totalCostBeforeEdge - edgeApplied)
  };
}

export function naturalRollMarkers(naturalRoll: number): readonly NaturalRollMarker[] {
  integer(naturalRoll, "Natural d20 result", 1);
  if (naturalRoll > 20) throw new Error("Natural d20 result cannot exceed 20.");
  return ([1, 17, 18, 19, 20] as const).includes(naturalRoll as 1 | 17 | 18 | 19 | 20)
    ? [`natural-${naturalRoll}` as NaturalRollMarker]
    : [];
}

/** Convert a natural d20 result to its unmodified Cypher difficulty value. */
export function naturalDifficultyForRoll(naturalRoll: number): number {
  naturalRollMarkers(naturalRoll);
  return Math.floor(naturalRoll / 3);
}

function contribution(
  id: string,
  label: string,
  direction: RollStepContribution["direction"],
  steps: number,
  source: RollStepContribution["source"]
): RollStepContribution {
  return {id, label, direction, steps, source};
}

export function prepareRoll(context: RollContext): PreparedRoll {
  const difficultyCeiling = integer(context.limits.difficultyCeiling, "Difficulty ceiling");
  const assetLimit = integer(context.limits.assetLimit, "Asset limit");
  const paidEffortMaximum = integer(context.limits.paidEffortMaximum, "Maximum Effort");
  const assets = integer(context.assets, "Assets");
  const paidEffort = integer(context.paidEffort, "Paid Effort");
  const damageEffort = integer(context.damageEffort ?? 0, "Damage Effort");
  const freeDamageEffort = integer(context.freeDamageEffort ?? 0, "Free Damage Effort");
  const freeEffort = integer(context.freeEffort, "Free Effort");
  const totalEffortMaximum = context.limits.totalEffortMaximum === null
    ? null
    : integer(context.limits.totalEffortMaximum, "Maximum total Effort");
  integer(context.poolValue, "Pool value");

  if (assets > assetLimit) throw new Error(`Assets cannot exceed the current limit of ${assetLimit}.`);
  const damageEffortApplied = damageEffort + freeDamageEffort;
  const totalEffortApplied = paidEffort + damageEffortApplied + freeEffort;
  const paidEffortApplied = paidEffort + damageEffort;
  const freeEffortApplied = freeEffort + freeDamageEffort;
  if (totalEffortMaximum !== null && totalEffortApplied > totalEffortMaximum) {
    throw new Error(`Maximum total Effort: ${totalEffortMaximum}.`);
  }
  if (paidEffortApplied > paidEffortMaximum) {
    throw new Error(`Paid Effort cannot exceed the Character maximum of ${paidEffortMaximum}.`);
  }

  const breakdown: RollStepContribution[] = [];
  if (assets > 0) {
    breakdown.push(contribution(
      "core.assets",
      "CYPHERV2.Roll.Breakdown.Assets",
      "ease",
      assets,
      "asset"
    ));
  }
  if (paidEffort > 0) {
    breakdown.push(contribution(
      "core.effort.paid",
      "CYPHERV2.Roll.Breakdown.PaidEffort",
      "ease",
      paidEffort,
      "effort"
    ));
  }
  if (freeEffort > 0) {
    breakdown.push(contribution(
      "core.effort.free",
      "CYPHERV2.Roll.Breakdown.FreeEffort",
      "ease",
      freeEffort,
      "free-effort"
    ));
  }
  for (const entry of context.contributions) {
    integer(entry.steps, `Steps for '${entry.id}'`);
    if (entry.steps > 0) breakdown.push({...entry});
  }

  const totalEase = breakdown
    .filter((entry) => entry.direction === "ease")
    .reduce((total, entry) => total + entry.steps, 0);
  const totalHindrance = breakdown
    .filter((entry) => entry.direction === "hinder")
    .reduce((total, entry) => total + entry.steps, 0);
  const netSteps = totalEase - totalHindrance;
  const costs = calculatePoolCost(
    context.actionCost ?? 0,
    effortCost(paidEffortApplied),
    context.edge,
    context.actionCostIgnoresEdge ?? false
  );

  let finalDifficulty: number | null = null;
  let targetNumber: number | null = null;
  if (context.difficulty.mode !== "unknown") {
    const baseDifficulty = integer(context.difficulty.value, "Difficulty");
    if (baseDifficulty > difficultyCeiling) {
      throw new Error(`Difficulty cannot exceed the current ceiling of ${difficultyCeiling}.`);
    }
    finalDifficulty = clamp(baseDifficulty - netSteps, 0, difficultyCeiling);
    targetNumber = finalDifficulty * 3;
  }

  return {
    context,
    breakdown,
    totalEase,
    totalHindrance,
    netSteps,
    damageEffortApplied,
    totalEffortApplied,
    paidEffortApplied,
    freeEffortApplied,
    totalEffortMaximum,
    ...costs,
    finalDifficulty,
    targetNumber
  };
}

export function resolveRoll(prepared: PreparedRoll, naturalRoll: number): RollResult {
  if (prepared.finalDifficulty === 0) return resolveAutomaticSuccess(prepared);
  const markers = naturalRollMarkers(naturalRoll);
  const success = prepared.targetNumber === null ? null : naturalRoll >= prepared.targetNumber;
  const naturalDifficulty = naturalDifficultyForRoll(naturalRoll);
  const beatsDifficulty = clamp(
    naturalDifficulty + prepared.netSteps,
    0,
    prepared.context.limits.difficultyCeiling
  );

  return {
    prepared,
    naturalRoll,
    naturalDifficulty,
    automaticSuccess: false,
    naturalMarkers: markers,
    naturalEffects: [],
    success,
    beatsDifficulty,
    poolCostPaid: prepared.poolCost,
    poolCostRefunded: 0
  };
}

export function resolveAutomaticSuccess(prepared: PreparedRoll): RollResult {
  if (prepared.finalDifficulty !== 0 || prepared.targetNumber !== 0) {
    throw new Error("Automatic success requires a known final difficulty of 0.");
  }
  return {
    prepared,
    naturalRoll: null,
    naturalDifficulty: null,
    automaticSuccess: true,
    naturalMarkers: [],
    naturalEffects: [],
    success: true,
    beatsDifficulty: null,
    poolCostPaid: prepared.poolCost,
    poolCostRefunded: 0
  };
}

function effectStatus(success: boolean | null): NaturalEffect["status"] {
  if (success === null) return "unresolved";
  return success ? "applied" : "inapplicable";
}

export function coreNaturalEffects(
  result: RollResult,
  horrorIntrusionRange = 1
): readonly NaturalEffect[] {
  const natural = result.naturalRoll;
  if (natural === null) return [];
  const base = {sourceId: "cypherv2.core", naturalRoll: natural} as const;
  const horrorRange = normalizeHorrorIntrusionRange(horrorIntrusionRange);
  if (natural === 1) {
    return [{
      ...base,
      id: "core.natural-1.intrusion",
      kind: "gm-intrusion",
      status: "applied",
      label: "CYPHERV2.Roll.NaturalEffects.GMIntrusion",
      triggersGMIntrusion: true,
      intrusionProvenance: "natural-1"
    }];
  }
  const intrusionEffects: NaturalEffect[] = natural <= horrorRange ? [{
    id: `core.horror-mode.natural-${natural}.intrusion`,
    sourceId: "cypherv2.horror-mode",
    naturalRoll: natural,
    kind: "gm-intrusion",
    status: "applied",
    label: "CYPHERV2.Roll.NaturalEffects.GMIntrusion",
    triggersGMIntrusion: true,
    intrusionProvenance: "horror-mode",
    horrorIntrusionRange: horrorRange
  }] : [];
  if (natural === 17 || natural === 18) {
    const damageRoll = result.prepared.context.purpose === "damage";
    return [...intrusionEffects, {
      ...base,
      id: `core.natural-${natural}.damage`,
      kind: "damage-bonus",
      status: damageRoll ? effectStatus(result.success) : "inapplicable",
      label: `CYPHERV2.Roll.NaturalEffects.Damage${natural}`,
      damageBonus: natural === 17 ? 1 : 2
    }];
  }
  if (natural === 19) {
    const status = effectStatus(result.success);
    if (result.prepared.context.purpose === "damage") {
      const choiceStatus = status === "applied" ? "available" : status;
      return [...intrusionEffects, {
        ...base,
        id: "core.natural-19.damage",
        kind: "damage-bonus",
        status: choiceStatus,
        label: "CYPHERV2.Roll.NaturalEffects.Damage19",
        damageBonus: 3,
        choiceGroup: "core.natural-19.choice"
      }, {
        ...base,
        id: "core.natural-19.minor",
        kind: "minor-effect",
        status: choiceStatus,
        label: "CYPHERV2.Roll.NaturalEffects.Minor",
        choiceGroup: "core.natural-19.choice"
      }];
    }
    return [...intrusionEffects, {
      ...base,
      id: "core.natural-19.minor",
      kind: "minor-effect",
      status,
      label: "CYPHERV2.Roll.NaturalEffects.Minor"
    }];
  }
  if (natural === 20) {
    const status = effectStatus(result.success);
    const effects: NaturalEffect[] = result.prepared.context.purpose === "damage"
      ? [{
          ...base,
          id: "core.natural-20.damage",
          kind: "damage-bonus",
          status: status === "applied" ? "available" : status,
          label: "CYPHERV2.Roll.NaturalEffects.Damage20",
          damageBonus: 4,
          choiceGroup: "core.natural-20.choice"
        }, {
          ...base,
          id: "core.natural-20.major",
          kind: "major-effect",
          status: status === "applied" ? "available" : status,
          label: "CYPHERV2.Roll.NaturalEffects.Major",
          choiceGroup: "core.natural-20.choice"
        }]
      : [{
          ...base,
          id: "core.natural-20.major",
          kind: "major-effect",
          status,
          label: "CYPHERV2.Roll.NaturalEffects.Major"
        }];
    if (result.prepared.poolCost > 0) {
      effects.push({
        ...base,
        id: "core.natural-20.refund",
        kind: "pool-cost-refund",
        status: "applied",
        label: "CYPHERV2.Roll.NaturalEffects.Refund",
        refundsPoolCost: true
      });
    }
    return [...intrusionEffects, ...effects];
  }
  return intrusionEffects;
}
