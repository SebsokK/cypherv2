import {describe, expect, it, vi} from "vitest";

import {registerCoreRuleModule} from "../../src/rules/core-rule-module";
import {RuleRegistry} from "../../src/rules/rule-registry";
import type {CharacterRollRequest, RollPolicyRequest} from "../../src/rolls/roll-types";
import {RollService, type RollCharacterDocumentLike} from "../../src/services/roll-service";
import {character, wounds} from "../helpers/core-fixtures";

const policy: RollPolicyRequest = {
  base: {difficultyCeiling: 10, assetLimit: 0},
  enabledRuleModuleIds: []
};

function request(overrides: Partial<CharacterRollRequest> = {}): CharacterRollRequest {
  return {
    pool: "might",
    difficulty: {mode: "known", value: 5},
    skillSteps: 0,
    assets: 0,
    paidEffort: 0,
    freeEffort: 0,
    otherEase: 0,
    otherHindrance: 0,
    ...overrides
  };
}

function serviceWithRoll(naturalRoll: number): RollService {
  const rules = new RuleRegistry();
  registerCoreRuleModule(rules);
  return new RollService(rules, async () => ({naturalRoll}));
}

function equipArmor(
  actor: ReturnType<typeof character>,
  category: "light" | "medium" | "heavy",
  familiar: boolean
): void {
  const steps = {light: 1, medium: 2, heavy: 3}[category];
  actor.system.derived.combat.armor = {
    itemId: `armor-${category}`,
    category,
    freelyUsed: familiar,
    blockEase: steps,
    dodgeHindrance: steps,
    speedTaskHindrance: familiar ? 0 : steps,
    blockContributions: [{
      id: `armor.${category}.block`,
      sourceId: `armor-${category}`,
      sourceType: "item",
      label: "",
      value: steps
    }],
    dodgeContributions: [{
      id: `armor.${category}.dodge`,
      sourceId: `armor-${category}`,
      sourceType: "item",
      label: "",
      value: steps
    }],
    speedTaskContributions: familiar ? [] : [{
      id: `armor.${category}.speed-task`,
      sourceId: `armor-${category}`,
      sourceType: "item",
      label: "",
      value: steps
    }]
  };
}

describe("RollService", () => {
  it.each([[
    "light", 1
  ], [
    "medium", 2
  ], [
    "heavy", 3
  ]] as const)("applies unfamiliar %s Armor to every generic Speed task", (category, steps) => {
    const actor = character();
    equipArmor(actor, category, false);

    const preview = serviceWithRoll(10).preview(
      actor as RollCharacterDocumentLike,
      request({pool: "speed"}),
      policy
    );

    expect(preview.totalHindrance).toBe(steps);
    expect(preview.breakdown).toContainEqual(expect.objectContaining({
      id: `armor.${category}.speed-task`,
      label: `CYPHERV2.Combat.Armor.Unfamiliar.${category}`,
      direction: "hinder",
      steps
    }));
  });

  it("leaves Might and Intellect tasks unaffected by unfamiliar Armor", () => {
    const actor = character();
    equipArmor(actor, "heavy", false);

    for (const pool of ["might", "intellect"] as const) {
      const preview = serviceWithRoll(10).preview(
        actor as RollCharacterDocumentLike,
        request({pool}),
        policy
      );
      expect(preview.totalHindrance).toBe(0);
      expect(preview.breakdown.some((entry) => entry.id.includes("speed-task"))).toBe(false);
    }
  });

  it("uses current effective Armor familiarity for each subsequent roll", () => {
    const actor = character();
    equipArmor(actor, "medium", false);
    const rolls = serviceWithRoll(10);

    expect(rolls.preview(actor as RollCharacterDocumentLike, request({pool: "speed"}), policy).totalHindrance).toBe(2);

    equipArmor(actor, "medium", true);
    expect(rolls.preview(actor as RollCharacterDocumentLike, request({pool: "speed"}), policy).totalHindrance).toBe(0);
  });

  it("excludes the global Speed-task contribution from Dodge by origin as well as tag", () => {
    const actor = character();
    equipArmor(actor, "medium", false);
    const armor = actor.system.derived.combat.armor;

    const preview = serviceWithRoll(10).preview(
      actor as RollCharacterDocumentLike,
      request({
        pool: "speed",
        contributions: [{
          id: "armor.medium.dodge",
          label: "CYPHERV2.Combat.Armor.Dodge",
          direction: "hinder",
          steps: 2,
          source: "other"
        }],
        origin: {kind: "defense", defenseType: "dodge"}
      }),
      policy
    );

    expect(preview.totalHindrance).toBe(2);
    expect(preview.breakdown.filter((entry) => entry.id.startsWith("armor.medium"))).toHaveLength(1);
    expect(armor.speedTaskHindrance).toBe(2);
  });

  it("automatically includes derived Wound Hindrance", () => {
    const actor = character({wounds: wounds({moderate: 3, major: 1})});
    const preview = serviceWithRoll(10).preview(
      actor as RollCharacterDocumentLike,
      request(),
      policy
    );

    expect(preview.totalHindrance).toBe(2);
    expect(preview.finalDifficulty).toBe(7);
    expect(preview.breakdown).toContainEqual(expect.objectContaining({
      id: "core.wounds.hindrance",
      source: "wound",
      steps: 2
    }));
  });

  it("uses the Character derived Effort maximum", () => {
    const actor = character({effortBase: 1});
    const service = serviceWithRoll(10);

    expect(() => service.preview(
      actor as RollCharacterDocumentLike,
      request({paidEffort: 2}),
      policy
    )).toThrow("maximum of 1");
  });

  it("allows generic Free Effort beyond Rating while combining paid Task and Damage Effort", async () => {
    const actor = character({effortBase: 1, poolValues: {might: 10}});
    const service = serviceWithRoll(10);
    const rollRequest = request({paidEffort: 1, freeEffort: 2});
    const preview = service.preview(
      actor as RollCharacterDocumentLike,
      rollRequest,
      policy
    );
    expect(preview).toMatchObject({paidEffortApplied: 1, freeEffortApplied: 2, totalEffortApplied: 3});
    const execution = await service.execute(actor as RollCharacterDocumentLike, rollRequest, policy);
    expect(execution.result.prepared).toMatchObject({
      paidEffortApplied: preview.paidEffortApplied,
      freeEffortApplied: preview.freeEffortApplied,
      totalEffortApplied: preview.totalEffortApplied,
      poolCost: preview.poolCost
    });
    expect(() => service.preview(
      actor as RollCharacterDocumentLike,
      request({paidEffort: 1, damageEffort: 1}),
      policy
    )).toThrow("Paid Effort cannot exceed the Character maximum of 1");
  });

  it("enforces the same Core total Effort cap in preview and execute", async () => {
    const actor = character({effortBase: 10, poolValues: {might: 50}});
    const service = serviceWithRoll(12);
    const valid = request({paidEffort: 3, damageEffort: 2, freeDamageEffort: 1});

    const preview = service.preview(actor as RollCharacterDocumentLike, valid, policy);
    const execution = await service.execute(actor as RollCharacterDocumentLike, valid, policy);
    expect(preview).toMatchObject({totalEffortApplied: 6, damageEffortApplied: 3, paidEffortApplied: 5, freeEffortApplied: 1});
    expect(execution.result.prepared).toMatchObject({
      totalEffortApplied: preview.totalEffortApplied,
      effortCostBeforeEdge: preview.effortCostBeforeEdge,
      poolCost: preview.poolCost
    });

    const invalid = request({paidEffort: 3, damageEffort: 2, freeDamageEffort: 2});
    expect(() => service.preview(actor as RollCharacterDocumentLike, invalid, policy))
      .toThrow("Maximum total Effort: 6");
    await expect(service.execute(actor as RollCharacterDocumentLike, invalid, policy))
      .rejects.toThrow("Maximum total Effort: 6");
  });

  it("uses the Character active Genre's generic Effort cap option", async () => {
    const actor = character({effortBase: 10, poolValues: {might: 50}});
    const rules = new RuleRegistry();
    registerCoreRuleModule(rules);
    let capMode: "core" | "unlimited" = "core";
    const rolls = new RollService(rules, async () => ({naturalRoll: 12}), () => capMode);
    const sevenLevels = request({paidEffort: 1, freeEffort: 6});

    expect(() => rolls.preview(actor as RollCharacterDocumentLike, sevenLevels, policy))
      .toThrow("Maximum total Effort: 6");

    capMode = "unlimited";
    const preview = rolls.preview(actor as RollCharacterDocumentLike, sevenLevels, policy);
    expect(preview).toMatchObject({totalEffortApplied: 7, totalEffortMaximum: null});
    const execution = await rolls.execute(actor as RollCharacterDocumentLike, sevenLevels, policy);
    expect(execution.result.prepared).toMatchObject({totalEffortApplied: 7, totalEffortMaximum: null});

    actor.system.derived.effort.max = 1;
    expect(rolls.preview(
      actor as RollCharacterDocumentLike,
      request({paidEffort: 1, freeEffort: 8}),
      policy
    )).toMatchObject({paidEffortApplied: 1, freeEffortApplied: 8, totalEffortMaximum: null});
    expect(() => rolls.preview(
      actor as RollCharacterDocumentLike,
      request({paidEffort: 2}),
      policy
    )).toThrow("Paid Effort cannot exceed the Character maximum of 1");

    capMode = "core";
    expect(() => rolls.preview(actor as RollCharacterDocumentLike, sevenLevels, policy))
      .toThrow("Maximum total Effort: 6");
  });

  it("blocks an insufficient Pool before updating or rolling", async () => {
    const actor = character({poolValues: {might: 2}, effortBase: 1});
    const roller = vi.fn(async () => ({naturalRoll: 12}));
    const rules = new RuleRegistry();
    registerCoreRuleModule(rules);
    const service = new RollService(rules, roller);

    await expect(service.execute(
      actor as RollCharacterDocumentLike,
      request({paidEffort: 1}),
      policy
    )).rejects.toThrow("costs 3");
    expect(actor.updates).toHaveLength(0);
    expect(roller).not.toHaveBeenCalled();
  });

  it("debits the Edge-reduced cost before rolling and preserves the natural result", async () => {
    const actor = character({poolValues: {might: 10}, mightEdge: 1, effortBase: 3});
    const roller = vi.fn(async () => {
      expect(actor.system.stats.might.value).toBe(6);
      return {naturalRoll: 14};
    });
    const rules = new RuleRegistry();
    registerCoreRuleModule(rules);
    const service = new RollService(rules, roller);

    const execution = await service.execute(
      actor as RollCharacterDocumentLike,
      request({paidEffort: 2}),
      policy
    );

    expect(execution.result.prepared).toMatchObject({
      effortCostBeforeEdge: 5,
      edgeApplied: 1,
      poolCost: 4
    });
    expect(execution.result.naturalRoll).toBe(14);
    expect(actor.system.stats.might.value).toBe(6);
    expect(actor.updates).toHaveLength(1);
  });

  it("refunds the action Pool cost after a natural 20", async () => {
    const actor = character({poolValues: {might: 10}, effortBase: 1});
    const execution = await serviceWithRoll(20).execute(
      actor as RollCharacterDocumentLike,
      request({paidEffort: 1}),
      policy
    );

    expect(execution.result).toMatchObject({poolCostPaid: 0, poolCostRefunded: 3});
    expect(actor.system.stats.might.value).toBe(10);
    expect(actor.updates).toHaveLength(2);
  });

  it("does not invoke the d20 roller for an automatic success", async () => {
    const actor = character();
    const roller = vi.fn(async () => ({naturalRoll: 1}));
    const rules = new RuleRegistry();
    registerCoreRuleModule(rules);
    const execution = await new RollService(rules, roller).execute(
      actor as RollCharacterDocumentLike,
      request({difficulty: {mode: "hidden", value: 1}, skillSteps: 1}),
      policy
    );

    expect(roller).not.toHaveBeenCalled();
    expect(execution).not.toHaveProperty("chatRoll");
    expect(execution.result).toMatchObject({automaticSuccess: true, naturalRoll: null, success: true});
  });

  it("rolls once for a mixed batch while preserving the automatic target", async () => {
    const actor = character();
    const roller = vi.fn(async () => ({naturalRoll: 6}));
    const rules = new RuleRegistry();
    registerCoreRuleModule(rules);
    const results = await new RollService(rules, roller).executeBatch(
      actor as RollCharacterDocumentLike,
      [
        request({difficulty: {mode: "hidden", value: 1}, skillSteps: 1}),
        request({difficulty: {mode: "hidden", value: 2}})
      ],
      policy
    );

    expect(roller).toHaveBeenCalledTimes(1);
    expect(results.map((entry) => entry.result.automaticSuccess)).toEqual([true, false]);
    expect(results.map((entry) => entry.result.success)).toEqual([true, true]);
  });

  it("snapshots the World Horror range in the shared roll pipeline", async () => {
    const actor = character();
    const rules = new RuleRegistry();
    registerCoreRuleModule(rules);
    const rolls = new RollService(
      rules,
      async () => ({naturalRoll: 3}),
      () => "core",
      () => 4
    );

    const execution = await rolls.execute(actor as RollCharacterDocumentLike, request(), policy);

    expect(execution.result.prepared.context.horrorIntrusionRange).toBe(4);
    expect(execution.result.naturalEffects).toContainEqual(expect.objectContaining({
      kind: "gm-intrusion",
      intrusionProvenance: "horror-mode",
      horrorIntrusionRange: 4
    }));
  });
});
