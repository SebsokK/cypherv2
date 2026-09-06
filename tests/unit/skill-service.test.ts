import {describe, expect, it} from "vitest";

import type {SkillRank} from "../../src/constants/system";
import {registerCoreRuleModule} from "../../src/rules/core-rule-module";
import {RuleRegistry} from "../../src/rules/rule-registry";
import {RollService} from "../../src/services/roll-service";
import {SkillService, type SkillItemLike} from "../../src/services/skill-service";
import {character} from "../helpers/core-fixtures";
import {buildPublicRollCardData} from "../../src/services/roll-chat-service";

function services(): {skills: SkillService; rolls: RollService} {
  const rules = new RuleRegistry();
  registerCoreRuleModule(rules);
  return {skills: new SkillService(rules), rolls: new RollService(rules, async () => ({naturalRoll: 12}))};
}

function skill(rank: SkillRank, defaultPool: SkillItemLike["system"]["defaultPool"] = "choose"): SkillItemLike {
  return {
    id: `skill-${rank}`,
    name: "Climbing",
    type: "skill",
    system: {rank, defaultPool, description: "Scale difficult surfaces."}
  };
}

const policy = {base: {difficultyCeiling: 10, assetLimit: 0}, enabledRuleModuleIds: []};

describe("SkillService", () => {
  it.each([
    ["inability", -1],
    ["untrained", 0],
    ["trained", 1],
    ["specialized", 2],
    ["expert", 3]
  ] as const)("maps %s through the Rule Registry to %i steps", (rank, expected) => {
    const {skills, rolls} = services();
    const request = skills.buildRollRequest(skill(rank), {
      pool: "might",
      difficulty: {mode: "known", value: 5}
    });
    const preview = rolls.preview(character(), request, policy);

    expect(preview.netSteps).toBe(expected);
    expect(request.origin).toMatchObject({kind: "skill", name: "Climbing", rank});
  });

  it("uses the configured Pool, permits an explicit override, and requires a choice otherwise", () => {
    const {skills} = services();
    expect(skills.buildRollRequest(skill("trained", "speed"), {
      difficulty: {mode: "unknown"}
    }).pool).toBe("speed");
    expect(skills.buildRollRequest(skill("trained", "speed"), {
      pool: "intellect",
      difficulty: {mode: "unknown"}
    }).pool).toBe("intellect");
    expect(() => skills.buildRollRequest(skill("trained"), {
      difficulty: {mode: "unknown"}
    })).toThrow("Choose a Pool");
  });

  it("supports a contextual rank override without mutating the Skill Item", () => {
    const {skills, rolls} = services();
    const source = skill("trained", "speed");
    const rollRequest = skills.buildRollRequest(source, {
      difficulty: {mode: "known", value: 5},
      rankOverride: "inability"
    });
    const preview = rolls.preview(character(), rollRequest, policy);

    expect(source.system.rank).toBe("trained");
    expect(rollRequest.origin).toMatchObject({kind: "skill", rank: "inability"});
    expect(preview.netSteps).toBe(-1);
  });

  it("combines Skill rank, Assets, and paid/free Effort in the normal roll pipeline", () => {
    const {skills, rolls} = services();
    const actor = character({effortBase: 3});
    const request = skills.buildRollRequest(skill("specialized", "might"), {
      difficulty: {mode: "known", value: 8},
      assets: 2,
      paidEffort: 2,
      freeEffort: 1
    });
    const preview = rolls.preview(actor, request, policy);

    expect(preview.totalEase).toBe(7);
    expect(preview.finalDifficulty).toBe(1);
    expect(preview.effortCostBeforeEdge).toBe(5);
  });

  it("executes a roll built directly from a Skill", async () => {
    const {skills, rolls} = services();
    const actor = character();
    const execution = await rolls.execute(actor, skills.buildRollRequest(skill("trained", "speed"), {
      difficulty: {mode: "known", value: 5}
    }), policy);

    expect(execution.result).toMatchObject({naturalRoll: 12, success: true});
    expect(execution.result.prepared.context).toMatchObject({
      pool: "speed",
      origin: {kind: "skill", rank: "trained"}
    });
  });

  it("builds a Pool-less, zero-cost Quick Roll while retaining Skill mastery", async () => {
    const {skills, rolls} = services();
    const actor = character();
    const request = skills.buildQuickRollRequest(skill("specialized"));
    const preview = rolls.preview(actor, request, policy);
    const execution = await rolls.execute(actor, request, policy);

    expect(request).toMatchObject({
      pool: null,
      assets: 0,
      paidEffort: 0,
      freeEffort: 0
    });
    expect(request).not.toHaveProperty("actionCost");
    expect(preview).toMatchObject({poolCost: 0, netSteps: 2});
    expect(execution.result.prepared.context.origin).toMatchObject({kind: "skill", rank: "specialized"});
    expect(actor.updates).toHaveLength(0);
  });

  it("retains shared automatic modifiers and privacy for Quick Rolls", async () => {
    const {skills, rolls} = services();
    const actor = character({wounds: {
      minor: [],
      moderate: [
        {id: "m1", label: "m1", description: "", sourceUuid: "test", treated: false},
        {id: "m2", label: "m2", description: "", sourceUuid: "test", treated: false},
        {id: "m3", label: "m3", description: "", sourceUuid: "test", treated: false}
      ],
      major: []
    }});
    const request = skills.buildQuickRollRequest(skill("trained"), {
      difficulty: {mode: "hidden", value: 5}
    });
    const execution = await rolls.execute(actor, request, policy);
    const card = buildPublicRollCardData(execution.result, "resultOnly");

    expect(execution.result.prepared.breakdown).toEqual(expect.arrayContaining([
      expect.objectContaining({source: "skill", direction: "ease", steps: 1}),
      expect.objectContaining({source: "wound", direction: "hinder", steps: 1})
    ]));
    expect(card.presentation).toBe("concealed");
    expect(card).not.toHaveProperty("poolLabel");
    expect(card).not.toHaveProperty("finalDifficulty");
    expect(card).not.toHaveProperty("targetNumber");
  });

  it("applies unfamiliar Armor to a Speed Skill through the shared RollService pipeline", () => {
    const {skills, rolls} = services();
    const actor = character();
    actor.system.derived.combat.armor = {
      itemId: "armor-medium",
      category: "medium",
      freelyUsed: false,
      blockEase: 2,
      dodgeHindrance: 2,
      speedTaskHindrance: 2,
      blockContributions: [],
      dodgeContributions: [],
      speedTaskContributions: [{
        id: "armor.medium.speed-task",
        sourceId: "armor-medium",
        sourceType: "item",
        label: "",
        value: 2
      }]
    };

    const speedSkill = skills.buildQuickRollRequest(skill("untrained", "speed"), {
      difficulty: {mode: "known", value: 5}
    });
    const preview = rolls.preview(actor, speedSkill, policy);

    expect(preview.totalHindrance).toBe(2);
    expect(preview.breakdown).toContainEqual(expect.objectContaining({
      id: "armor.medium.speed-task",
      label: "CYPHERV2.Combat.Armor.Unfamiliar.medium"
    }));
  });
});
