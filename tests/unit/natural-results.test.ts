import {describe, expect, it} from "vitest";

import {coreNaturalEffects, prepareRoll, resolveRoll} from "../../src/rolls/roll-engine";
import type {RollContext} from "../../src/rolls/roll-types";
import {CORE_TOTAL_EFFORT_CAP} from "../../src/rules/core/effort-rules";

function result(
  naturalRoll: number,
  difficulty: RollContext["difficulty"] = {mode: "known", value: 3},
  purpose: RollContext["purpose"] = "task",
  paidEffort = 0,
  horrorIntrusionRange = 1
) {
  const context: RollContext = {
    actor: {id: "actor-1", name: "Ada"},
    label: "Task",
    pool: "might",
    difficulty,
    assets: 0,
    paidEffort,
    freeEffort: 0,
    edge: 0,
    poolValue: 10,
    limits: {difficultyCeiling: 10, assetLimit: 2, paidEffortMaximum: 3, totalEffortMaximum: CORE_TOTAL_EFFORT_CAP},
    contributions: [],
    purpose
  };
  const resolved = resolveRoll(prepareRoll(context), naturalRoll);
  return {...resolved, naturalEffects: coreNaturalEffects(resolved, horrorIntrusionRange)};
}

describe("Core natural results", () => {
  it("turns natural 1 into a free GM Intrusion independently from task failure", () => {
    const rolled = result(1, {mode: "known", value: 1});
    expect(rolled.success).toBe(false);
    expect(rolled.naturalEffects).toContainEqual(expect.objectContaining({
      kind: "gm-intrusion",
      status: "applied",
      triggersGMIntrusion: true,
      intrusionProvenance: "natural-1"
    }));
  });

  it("expands only the Free GM Intrusion range under Horror Mode and preserves provenance", () => {
    expect(result(1, {mode: "known", value: 1}, "task", 0, 4).naturalEffects)
      .toContainEqual(expect.objectContaining({intrusionProvenance: "natural-1"}));
    for (const natural of [2, 3, 4]) {
      expect(result(natural, {mode: "known", value: 1}, "task", 0, 4).naturalEffects)
        .toContainEqual(expect.objectContaining({
          kind: "gm-intrusion",
          intrusionProvenance: "horror-mode",
          horrorIntrusionRange: 4
        }));
    }
    expect(result(5, {mode: "known", value: 1}, "task", 0, 4).naturalEffects)
      .not.toContainEqual(expect.objectContaining({kind: "gm-intrusion"}));
  });

  it("keeps range 1 normal and supports Horror Mode through natural 20", () => {
    expect(result(2).naturalEffects).not.toContainEqual(expect.objectContaining({kind: "gm-intrusion"}));
    const maximum = result(20, {mode: "known", value: 1}, "task", 0, 20).naturalEffects;
    expect(maximum).toContainEqual(expect.objectContaining({
        kind: "gm-intrusion",
        intrusionProvenance: "horror-mode",
        horrorIntrusionRange: 20
      }));
    expect(maximum).toContainEqual(expect.objectContaining({kind: "major-effect"}));
  });

  it.each([[17, 1], [18, 2]] as const)(
    "applies natural %i only to a successful damage roll for +%i damage",
    (natural, bonus) => {
      expect(result(natural, {mode: "known", value: 3}, "damage").naturalEffects[0]).toMatchObject({
        kind: "damage-bonus",
        status: "applied",
        damageBonus: bonus
      });
      expect(result(natural, {mode: "known", value: 3}, "task").naturalEffects[0]?.status).toBe("inapplicable");
      expect(result(natural, {mode: "known", value: 10}, "damage").naturalEffects[0]?.status).toBe("inapplicable");
    }
  );

  it("offers the natural 19 choice between +3 damage and a minor effect on a successful attack", () => {
    const rolled = result(19, {mode: "known", value: 3}, "damage");
    expect(rolled.success).toBe(true);
    expect(rolled.naturalEffects).toHaveLength(2);
    expect(rolled.naturalEffects.map((effect) => effect.kind)).toEqual(["damage-bonus", "minor-effect"]);
    expect(rolled.naturalEffects.every((effect) => effect.status === "available")).toBe(true);
  });

  it("applies a minor effect on a successful non-damage natural 19 and none on failure", () => {
    expect(result(19).naturalEffects[0]?.status).toBe("applied");
    expect(result(19, {mode: "known", value: 10}).naturalEffects[0]?.status).toBe("inapplicable");
  });

  it("offers the natural 20 damage/effect choice and refunds the action Pool cost", () => {
    const rolled = result(20, {mode: "known", value: 3}, "damage", 1);
    expect(rolled.naturalEffects).toEqual(expect.arrayContaining([
      expect.objectContaining({kind: "damage-bonus", damageBonus: 4, status: "available"}),
      expect.objectContaining({kind: "major-effect", status: "available"}),
      expect.objectContaining({kind: "pool-cost-refund", status: "applied"})
    ]));
  });

  it("keeps success and natural effects separate and marks unknown outcomes unresolved", () => {
    const rolled = result(19, {mode: "unknown"});
    expect(rolled.success).toBeNull();
    expect(rolled.naturalEffects[0]?.status).toBe("unresolved");
    expect(rolled.beatsDifficulty).toBeTypeOf("number");
  });
});
