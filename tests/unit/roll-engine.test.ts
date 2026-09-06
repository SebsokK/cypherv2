import {describe, expect, it} from "vitest";

import {effortCost, prepareRoll, resolveRoll} from "../../src/rolls/roll-engine";
import type {RollContext, RollStepContribution} from "../../src/rolls/roll-types";
import {CORE_TOTAL_EFFORT_CAP} from "../../src/rules/core/effort-rules";

function step(
  id: string,
  direction: "ease" | "hinder",
  steps: number
): RollStepContribution {
  return {id, label: id, direction, steps, source: "other"};
}

function context(overrides: Partial<RollContext> = {}): RollContext {
  return {
    actor: {id: "actor-1", name: "Ada"},
    label: "CYPHERV2.Roll.Task",
    pool: "might",
    difficulty: {mode: "known", value: 5},
    assets: 0,
    paidEffort: 0,
    freeEffort: 0,
    edge: 0,
    poolValue: 10,
    limits: {difficultyCeiling: 10, assetLimit: 2, paidEffortMaximum: 3, totalEffortMaximum: CORE_TOTAL_EFFORT_CAP},
    contributions: [],
    ...overrides
  };
}

describe("Roll Engine", () => {
  it("resolves known difficulty success and failure from the unmodified d20", () => {
    const prepared = prepareRoll(context({
      assets: 1,
      paidEffort: 1,
      contributions: [step("skill", "ease", 1)]
    }));

    expect(prepared.finalDifficulty).toBe(2);
    expect(prepared.targetNumber).toBe(6);
    expect(resolveRoll(prepared, 6).success).toBe(true);
    expect(resolveRoll(prepared, 5).success).toBe(false);
    expect(resolveRoll(prepared, 5).naturalRoll).toBe(5);
  });

  it("reports one simple BEATS DIFFICULTY value when difficulty is absent", () => {
    const prepared = prepareRoll(context({
      difficulty: {mode: "unknown"},
      assets: 1,
      paidEffort: 1,
      contributions: [step("skill", "ease", 1)]
    }));
    const result = resolveRoll(prepared, 14);

    expect(result.success).toBeNull();
    expect(prepared.finalDifficulty).toBeNull();
    expect(prepared.targetNumber).toBeNull();
    expect(result.beatsDifficulty).toBe(7);
  });

  it("calculates but structurally distinguishes a hidden difficulty", () => {
    const result = resolveRoll(prepareRoll(context({
      difficulty: {mode: "hidden", value: 6},
      contributions: [step("training", "ease", 1)]
    })), 14);

    expect(result.prepared.finalDifficulty).toBe(5);
    expect(result.prepared.targetNumber).toBe(15);
    expect(result.success).toBe(false);
    expect(result.beatsDifficulty).toBe(5);
  });

  it("represents final difficulty 0 as an explicit automatic success without a d20", () => {
    const prepared = prepareRoll(context({
      difficulty: {mode: "hidden", value: 1},
      contributions: [step("training", "ease", 1)]
    }));
    const result = resolveRoll(prepared, 17);

    expect(result).toMatchObject({
      automaticSuccess: true,
      success: true,
      naturalRoll: null,
      beatsDifficulty: null,
      naturalMarkers: [],
      naturalEffects: []
    });
  });

  it("keeps Ease and Hindrance as difficulty steps", () => {
    const prepared = prepareRoll(context({
      contributions: [step("ease", "ease", 3), step("hinder", "hinder", 2)]
    }));

    expect(prepared.totalEase).toBe(3);
    expect(prepared.totalHindrance).toBe(2);
    expect(prepared.netSteps).toBe(1);
    expect(prepared.finalDifficulty).toBe(4);
  });

  it("never reduces final difficulty or BEATS DIFFICULTY below zero", () => {
    const known = prepareRoll(context({
      difficulty: {mode: "known", value: 1},
      contributions: [step("ease", "ease", 9)]
    }));
    const unknown = prepareRoll(context({
      difficulty: {mode: "unknown"},
      contributions: [step("hinder", "hinder", 9)]
    }));

    expect(known.finalDifficulty).toBe(0);
    expect(resolveRoll(unknown, 2).beatsDifficulty).toBe(0);
  });

  it("uses a configurable ceiling and clamps added Hindrance to it", () => {
    const high = prepareRoll(context({
      difficulty: {mode: "known", value: 15},
      limits: {difficultyCeiling: 15, assetLimit: 2, paidEffortMaximum: 3, totalEffortMaximum: CORE_TOTAL_EFFORT_CAP},
      contributions: [step("hinder", "hinder", 2)]
    }));
    expect(high.finalDifficulty).toBe(15);
    expect(high.targetNumber).toBe(45);

    expect(() => prepareRoll(context({difficulty: {mode: "known", value: 11}}))).toThrow(
      "ceiling of 10"
    );
  });

  it("supports zero to two Assets and rejects values above the policy limit", () => {
    expect(prepareRoll(context({assets: 0})).totalEase).toBe(0);
    expect(prepareRoll(context({assets: 2})).totalEase).toBe(2);
    expect(() => prepareRoll(context({assets: 3}))).toThrow("limit of 2");
  });

  it.each([
    [0, 0],
    [1, 3],
    [2, 5],
    [3, 7]
  ])("prices Effort %i at %i Pool points", (levels, cost) => {
    expect(effortCost(levels)).toBe(cost);
    const prepared = prepareRoll(context({paidEffort: levels}));
    expect(prepared.effortCostBeforeEdge).toBe(cost);
    expect(prepared.totalEase).toBe(levels);
  });

  it("applies Edge once to the total action cost and never below zero", () => {
    const partial = prepareRoll(context({paidEffort: 3, edge: 2}));
    const complete = prepareRoll(context({paidEffort: 1, edge: 9}));

    expect(partial).toMatchObject({effortCostBeforeEdge: 7, edgeApplied: 2, poolCost: 5});
    expect(complete).toMatchObject({effortCostBeforeEdge: 3, edgeApplied: 3, poolCost: 0});
  });

  it("tracks Free Effort separately and never adds it to Pool cost", () => {
    const prepared = prepareRoll(context({paidEffort: 1, freeEffort: 2}));
    expect(prepared.totalEase).toBe(3);
    expect(prepared.effortCostBeforeEdge).toBe(3);
    expect(prepared.poolCost).toBe(3);
    expect(prepared.breakdown.map((entry) => entry.source)).toContain("free-effort");
  });

  it("limits only paid allocations by Character Effort Rating", () => {
    const limits = {
      difficultyCeiling: 10,
      assetLimit: 2,
      paidEffortMaximum: 1,
      totalEffortMaximum: CORE_TOTAL_EFFORT_CAP
    };
    expect(prepareRoll(context({paidEffort: 1, limits})))
      .toMatchObject({paidEffortApplied: 1, totalEffortApplied: 1});
    expect(() => prepareRoll(context({paidEffort: 1, damageEffort: 1, limits})))
      .toThrow("Paid Effort cannot exceed the Character maximum of 1");
    expect(prepareRoll(context({paidEffort: 1, freeEffort: 1, limits})))
      .toMatchObject({paidEffortApplied: 1, freeEffortApplied: 1, totalEffortApplied: 2});
    expect(prepareRoll(context({paidEffort: 1, freeEffort: 2, limits})))
      .toMatchObject({paidEffortApplied: 1, freeEffortApplied: 2, totalEffortApplied: 3});
    expect(prepareRoll(context({damageEffort: 1, freeDamageEffort: 2, limits})))
      .toMatchObject({paidEffortApplied: 1, freeEffortApplied: 2, damageEffortApplied: 3});
  });

  it("accepts six total applied Effort levels and rejects seven", () => {
    const limits = {
      difficultyCeiling: 10,
      assetLimit: 2,
      paidEffortMaximum: 10,
      totalEffortMaximum: CORE_TOTAL_EFFORT_CAP
    };
    const valid = prepareRoll(context({paidEffort: 4, damageEffort: 2, limits}));
    expect(valid).toMatchObject({
      totalEffortApplied: 6,
      totalEffortMaximum: CORE_TOTAL_EFFORT_CAP
    });
    expect(() => prepareRoll(context({paidEffort: 4, damageEffort: 3, limits})))
      .toThrow(`Maximum total Effort: ${CORE_TOTAL_EFFORT_CAP}`);
  });

  it("counts Free Effort toward the Core cap even though it does not cost Pool points", () => {
    const limits = {
      difficultyCeiling: 10,
      assetLimit: 2,
      paidEffortMaximum: 10,
      totalEffortMaximum: CORE_TOTAL_EFFORT_CAP
    };
    const partlyFree = prepareRoll(context({paidEffort: 1, damageEffort: 1, freeEffort: 4, limits}));
    expect(partlyFree).toMatchObject({totalEffortApplied: 6, freeEffortApplied: 4, paidEffortApplied: 2});

    const allFree = prepareRoll(context({freeEffort: 6, limits}));
    expect(allFree).toMatchObject({totalEffortApplied: 6, freeEffortApplied: 6, paidEffortApplied: 0, poolCost: 0});
    expect(() => prepareRoll(context({freeEffort: 7, limits})))
      .toThrow(`Maximum total Effort: ${CORE_TOTAL_EFFORT_CAP}`);
  });

  it.each([1, 2])("allows %i Free Damage Effort with no Paid Damage Effort", (freeDamageEffort) => {
    const prepared = prepareRoll(context({
      damageEffort: 0,
      freeDamageEffort,
      limits: {
        difficultyCeiling: 10,
        assetLimit: 2,
        paidEffortMaximum: 6,
        totalEffortMaximum: CORE_TOTAL_EFFORT_CAP
      }
    }));
    expect(prepared).toMatchObject({
      damageEffortApplied: freeDamageEffort,
      totalEffortApplied: freeDamageEffort,
      paidEffortApplied: 0,
      freeEffortApplied: freeDamageEffort,
      effortCostBeforeEdge: 0,
      poolCost: 0
    });
  });

  it("adds Paid and Free Damage Effort while pricing only the paid allocation", () => {
    const prepared = prepareRoll(context({damageEffort: 1, freeDamageEffort: 1}));
    expect(prepared).toMatchObject({
      damageEffortApplied: 2,
      totalEffortApplied: 2,
      paidEffortApplied: 1,
      freeEffortApplied: 1,
      effortCostBeforeEdge: 3,
      poolCost: 3
    });
  });

  it("counts independent Free Damage Effort toward the Core total cap", () => {
    const limits = {
      difficultyCeiling: 10,
      assetLimit: 2,
      paidEffortMaximum: 10,
      totalEffortMaximum: CORE_TOTAL_EFFORT_CAP
    };
    expect(prepareRoll(context({paidEffort: 3, damageEffort: 1, freeDamageEffort: 2, limits})))
      .toMatchObject({totalEffortApplied: 6, damageEffortApplied: 3});
    expect(() => prepareRoll(context({paidEffort: 3, damageEffort: 2, freeDamageEffort: 2, limits})))
      .toThrow(`Maximum total Effort: ${CORE_TOTAL_EFFORT_CAP}`);
  });

  it("reserves natural special markers without applying their future effects", () => {
    const prepared = prepareRoll(context({difficulty: {mode: "known", value: 10}}));
    const result = resolveRoll(prepared, 20);

    expect(result.naturalRoll).toBe(20);
    expect(result.naturalMarkers).toEqual(["natural-20"]);
    expect(result.success).toBe(false);
  });
});
