import {describe, expect, it, vi} from "vitest";

import type {AbilityItemLike, AbilityTargetLike} from "../../src/abilities/ability-types";
import type {NpcTargetLike} from "../../src/combat/combat-types";
import {registerCoreRuleModule} from "../../src/rules/core-rule-module";
import {RuleRegistry} from "../../src/rules/rule-registry";
import type {RollPolicyRequest} from "../../src/rolls/roll-types";
import {AbilityService} from "../../src/services/ability-service";
import {CombatService, type CombatCharacterLike} from "../../src/services/combat-service";
import {RollService} from "../../src/services/roll-service";
import {SkillService} from "../../src/services/skill-service";
import {TargetResolver} from "../../src/services/target-resolver";
import {WoundService} from "../../src/services/wound-service";
import {character} from "../helpers/core-fixtures";

const policy: RollPolicyRequest = {
  base: {difficultyCeiling: 10, assetLimit: 2},
  enabledRuleModuleIds: []
};

function ability(overrides: Partial<AbilityItemLike["system"]> = {}): AbilityItemLike {
  return {
    id: "ability-1",
    name: "Stone Body",
    type: "ability",
    system: {
      activation: "action",
      pool: "none",
      cost: {amount: 0, ignoresEdge: false},
      roll: "none",
      rollModifier: 0,
      attackModifier: 0,
      damage: 0,
      woundSeverity: "none",
      range: "",
      targetMode: "none",
      description: "<p>Descriptive text.</p>",
      grantedBy: {kind: "focus"},
      ...overrides
    }
  };
}

function npc(level = 4, tokenId = "token-npc"): NpcTargetLike {
  return {
    id: "npc-1",
    uuid: "Actor.npc-1",
    actorUuid: "Actor.npc-1",
    tokenId,
    tokenUuid: `Scene.scene.Token.${tokenId}`,
    name: "Sentinel",
    type: "npc",
    system: {
      level,
      armorBase: 1,
      health: {value: 20, baseMax: 20},
      modifications: [],
      damage: {
        amount: 4,
        woundSeverity: "moderate",
        defense: {allowBlock: true, allowDodge: true},
        notes: ""
      }
    },
    async update(): Promise<unknown> { return this; }
  };
}

function setup(naturalRoll = 12, edge = 0, poolValue = 20) {
  const base = character({
    effortBase: 4,
    mightEdge: edge,
    poolValues: {might: poolValue, speed: poolValue, intellect: poolValue}
  });
  const actor = Object.assign(base, {items: []}) as unknown as CombatCharacterLike;
  const rules = new RuleRegistry();
  registerCoreRuleModule(rules);
  const roller = vi.fn(async () => ({naturalRoll}));
  const rolls = new RollService(rules, roller);
  const skills = new SkillService(rules);
  const targets = new TargetResolver(rules);
  const combat = new CombatService(rules, rolls, skills, targets, new WoundService());
  return {actor, roller, service: new AbilityService(rolls, skills, targets, combat)};
}

describe("AbilityService", () => {
  it("pays a single allowed Pool immediately through the existing Edge cost math", async () => {
    const {actor, roller, service} = setup(12, 2, 10);
    const result = await service.payCost(actor, ability({
      cost: {amount: 4, ignoresEdge: false, allowedPools: ["might"]}
    }), "might");
    expect(result).toMatchObject({pool: "might", listedCost: 4, edgeApplied: 2, costPaid: 2, currentBefore: 10, currentAfter: 8});
    expect((actor as unknown as {updates: unknown[]}).updates).toEqual([{"system.stats.might.value": 8}]);
    expect(roller).not.toHaveBeenCalled();
  });

  it("pays a multi-Pool Ability wholly from the selected allowed Pool without splitting", async () => {
    const {actor, service} = setup(12, 1, 10);
    const result = await service.payCost(actor, ability({
      cost: {amount: 7, ignoresEdge: false, allowedPools: ["might", "intellect"]}
    }), "intellect");
    expect(result).toMatchObject({pool: "intellect", costPaid: 7, currentAfter: 3});
    expect(actor.system.stats.might.value).toBe(10);
    expect(actor.system.stats.intellect.value).toBe(3);
    await expect(service.payCost(actor, ability({
      cost: {amount: 7, ignoresEdge: false, allowedPools: ["might", "intellect"]}
    }), "speed")).rejects.toThrow("not an allowed Pool");
  });

  it("honors ignoresEdge, floors ordinary cost at zero, and blocks insufficient Pools", async () => {
    const ordinary = setup(12, 5, 3);
    await expect(ordinary.service.payCost(ordinary.actor, ability({
      cost: {amount: 2, ignoresEdge: false, allowedPools: ["might"]}
    }), "might")).resolves.toMatchObject({costPaid: 0, currentAfter: 3});
    expect((ordinary.actor as unknown as {updates: unknown[]}).updates).toEqual([]);

    const fixed = setup(12, 5, 3);
    await expect(fixed.service.payCost(fixed.actor, ability({
      cost: {amount: 4, ignoresEdge: true, allowedPools: ["might"]}
    }), "might")).rejects.toThrow("has 3 points");
    expect((fixed.actor as unknown as {updates: unknown[]}).updates).toEqual([]);
  });

  it("rejects zero-cost and Pool-less Abilities from the isolated payment path", async () => {
    const {actor, service} = setup();
    expect(() => service.previewPayment(actor, ability({
      cost: {amount: 0, ignoresEdge: false, allowedPools: ["might"]}
    }), "might")).toThrow("no payable Pool cost");
    expect(() => service.previewPayment(actor, ability({
      cost: {amount: 2, ignoresEdge: false, allowedPools: []}, pool: "none"
    }), "might")).toThrow("no payable Pool cost");
  });

  it("keeps descriptive and passive Abilities valid without making passive content usable", async () => {
    const {actor, roller, service} = setup();
    const descriptive = ability();
    expect(service.canUse(descriptive)).toBe(true);
    await expect(service.executeNoRoll(actor, descriptive)).resolves.toMatchObject({costPaid: 0, pool: null});
    expect(roller).not.toHaveBeenCalled();
    expect(service.canUse(ability({activation: "passive"}))).toBe(false);
    await expect(service.executeNoRoll(actor, ability({activation: "passive"}))).rejects.toThrow("Passive");
  });

  it("routes contextual manual Skill steps through Ability roll requests", () => {
    const {actor, service} = setup();
    const plan = service.buildRollPlan(actor, ability({roll: "task", pool: "speed"}), {
      skillSteps: 3,
      difficulty: {mode: "unknown"}
    });
    expect(plan.requests[0]).toMatchObject({pool: "speed", skillSteps: 3});
  });

  it("routes dedicated Free Damage Effort only through attack Ability requests", () => {
    const {actor, service} = setup();
    const attack = service.buildRollPlan(actor, ability({roll: "attack", pool: "might"}), {
      damageEffort: 2,
      freeDamageEffort: 1
    }).requests[0];
    const task = service.buildRollPlan(actor, ability({roll: "task", pool: "might"}), {
      damageEffort: 2,
      freeDamageEffort: 1
    }).requests[0];
    expect(attack).toMatchObject({damageEffort: 2, freeDamageEffort: 1});
    expect(task).toMatchObject({damageEffort: 0, freeDamageEffort: 0});
  });

  it("adds Paid and Free Damage Effort to Ability damage while charging only Paid Effort", async () => {
    const {actor, service} = setup();
    actor.system.stats.effortBase = 1;
    actor.system.derived.effort.max = 1;
    const [outcome] = await service.executeRoll(actor, ability({
      roll: "attack",
      pool: "might",
      damage: 4
    }), {
      damageEffort: 1,
      freeDamageEffort: 2
    }, policy);
    expect(outcome).toMatchObject({baseDamage: 4, effortDamage: 9, grossDamage: 13});
    expect(outcome?.execution.result.prepared).toMatchObject({
      paidEffortApplied: 1,
      freeEffortApplied: 2,
      damageEffortApplied: 3,
      effortCostBeforeEdge: 3,
      poolCost: 3
    });
    expect(actor.system.stats.might.value).toBe(17);
  });

  it("pays a no-roll Ability cost once after Edge", async () => {
    const {actor, service} = setup(12, 1, 10);
    const outcome = await service.executeNoRoll(actor, ability({
      pool: "might",
      cost: {amount: 3, ignoresEdge: false}
    }));
    expect(outcome).toMatchObject({pool: "might", costPaid: 2, edgeApplied: 1});
    expect(actor.system.stats.might.value).toBe(8);
    expect((actor as unknown as {updates: unknown[]}).updates).toHaveLength(1);
  });

  it("supports Might, Speed, Intellect, choose Pool, and cost 0", async () => {
    for (const pool of ["might", "speed", "intellect"] as const) {
      const {actor, service} = setup();
      await service.executeNoRoll(actor, ability({pool, cost: {amount: 1, ignoresEdge: false}}));
      expect(actor.system.stats[pool].value).toBe(19);
    }
    const {actor, service} = setup();
    const chosen = await service.executeNoRoll(actor, ability({
      pool: "choose",
      cost: {amount: 2, ignoresEdge: false}
    }), {pool: "speed"});
    expect(chosen.pool).toBe("speed");
    expect(actor.system.stats.speed.value).toBe(18);
    await expect(service.executeNoRoll(actor, ability())).resolves.toMatchObject({costPaid: 0});
  });

  it("uses one allowed Pool directly and asks callers to select among multiple allowed Pools", async () => {
    const single = setup(12, 1, 10);
    single.actor.system.derived.pools.intellect.edge = 1;
    await expect(single.service.executeNoRoll(single.actor, ability({
      pool: "none",
      cost: {amount: 3, ignoresEdge: false, allowedPools: ["intellect"]}
    }))).resolves.toMatchObject({pool: "intellect", costPaid: 2, edgeApplied: 1});
    expect(single.actor.system.stats.intellect.value).toBe(8);

    const multiple = setup(12, 1, 10);
    multiple.actor.system.derived.pools.intellect.edge = 1;
    const earthshake = ability({
      pool: "none",
      cost: {amount: 7, ignoresEdge: false, allowedPools: ["might", "intellect"]}
    });
    await expect(multiple.service.executeNoRoll(multiple.actor, earthshake))
      .rejects.toThrow("Pool is required");
    await expect(multiple.service.executeNoRoll(multiple.actor, earthshake, {pool: "intellect"}))
      .resolves.toMatchObject({pool: "intellect", costPaid: 6, edgeApplied: 1});
    expect(multiple.actor.system.stats.intellect.value).toBe(4);
    expect(multiple.actor.system.stats.might.value).toBe(10);
  });

  it("supports Any Pool, rejects a Pool outside the explicit set, and makes No Pool free", async () => {
    const any = setup(12, 0, 10);
    const anyPool = ability({
      pool: "none",
      cost: {amount: 2, ignoresEdge: false, allowedPools: ["might", "speed", "intellect"]}
    });
    await any.service.executeNoRoll(any.actor, anyPool, {pool: "speed"});
    expect(any.actor.system.stats.speed.value).toBe(8);

    const restricted = setup();
    await expect(restricted.service.executeNoRoll(restricted.actor, ability({
      pool: "none",
      cost: {amount: 2, ignoresEdge: false, allowedPools: ["might", "intellect"]}
    }), {pool: "speed"})).rejects.toThrow("not an allowed Pool");

    const noPool = setup(12, 0, 10);
    await expect(noPool.service.executeNoRoll(noPool.actor, ability({
      pool: "might",
      cost: {amount: 7, ignoresEdge: false, allowedPools: []}
    }))).resolves.toMatchObject({pool: null, costPaid: 0});
    expect((noPool.actor as unknown as {updates: unknown[]}).updates).toHaveLength(0);
  });

  it("uses the selected allowed Pool for both Ability cost and Effort Edge", async () => {
    const selected = setup(12, 0, 10);
    selected.actor.system.derived.pools.intellect.edge = 2;
    const [outcome] = await selected.service.executeRoll(selected.actor, ability({
      pool: "none",
      cost: {amount: 2, ignoresEdge: false, allowedPools: ["might", "intellect"]},
      roll: "task"
    }), {
      pool: "intellect",
      paidEffort: 1,
      difficulty: {mode: "known", value: 3}
    }, policy);
    expect(outcome?.execution.result.prepared).toMatchObject({
      actionCostBeforeEdge: 2,
      effortCostBeforeEdge: 3,
      edgeApplied: 2,
      poolCost: 3
    });
    expect(outcome?.execution.result.prepared.context.pool).toBe("intellect");
    expect(selected.actor.system.stats.intellect.value).toBe(7);
    expect(selected.actor.system.stats.might.value).toBe(10);
  });

  it("honors ignoresEdge and blocks an insufficient Pool before updating", async () => {
    const ignored = setup(12, 2, 5);
    await expect(ignored.service.executeNoRoll(ignored.actor, ability({
      pool: "might",
      cost: {amount: 3, ignoresEdge: true}
    }))).resolves.toMatchObject({costPaid: 3, edgeApplied: 0});
    const insufficient = setup(12, 0, 2);
    await expect(insufficient.service.executeNoRoll(insufficient.actor, ability({
      pool: "might",
      cost: {amount: 3, ignoresEdge: false}
    }))).rejects.toThrow("costs 3");
    expect((insufficient.actor as unknown as {updates: unknown[]}).updates).toHaveLength(0);
  });

  it("builds a task roll through RollService with Ability, Assets, Effort, and Wound contributions", async () => {
    const {actor, service} = setup(12);
    actor.system.wounds.major.push({id: "major", label: "", description: "", sourceUuid: "", treated: false});
    actor.system.derived.wounds.hindrance = 1;
    const [outcome] = await service.executeRoll(actor, ability({
      pool: "intellect",
      roll: "task",
      rollModifier: 1,
      cost: {amount: 2, ignoresEdge: false}
    }), {
      difficulty: {mode: "known", value: 5},
      assets: 1,
      paidEffort: 1
    }, policy);
    expect(outcome?.execution.result.prepared).toMatchObject({
      actionCostBeforeEdge: 2,
      effortCostBeforeEdge: 3,
      poolCost: 5,
      totalEase: 3,
      totalHindrance: 1
    });
    expect(actor.system.stats.intellect.value).toBe(15);
  });

  it("uses hidden NPC difficulty, synthetic Token identity, attack modifier, and automatic success", async () => {
    const {actor, service, roller} = setup(12);
    const target = npc(1, "synthetic-a");
    const plan = service.buildRollPlan(actor, ability({
      pool: "intellect",
      roll: "attack",
      attackModifier: 1,
      damage: 4,
      targetMode: "single"
    }), {targets: [target]});
    expect(plan.requests[0]).toMatchObject({
      difficulty: {mode: "hidden", value: 1},
      target: {tokenId: "synthetic-a", tokenUuid: "Scene.scene.Token.synthetic-a"}
    });
    expect(plan.requests[0]?.contributions).toContainEqual(expect.objectContaining({
      id: "ability.ability-1.attack-modifier",
      direction: "ease",
      steps: 1
    }));
    const [outcome] = await service.executeRoll(actor, plan.ability, {targets: [target]}, policy);
    expect(roller).not.toHaveBeenCalled();
    expect(outcome?.execution.result).toMatchObject({automaticSuccess: true, success: true});
  });

  it("adds fixed Damage, Damage Effort, and natural attack damage", async () => {
    const {actor, service} = setup(17);
    const [outcome] = await service.executeRoll(actor, ability({
      pool: "might",
      roll: "attack",
      damage: 5,
      targetMode: "single"
    }), {targets: [npc(2)], damageEffort: 1}, policy);
    expect(outcome).toMatchObject({baseDamage: 5, effortDamage: 3, naturalDamage: 1, grossDamage: 9});
  });

  it.each([[17, 1], [18, 2], [19, 3], [20, 4]] as const)(
    "supports natural %i attack damage/effects",
    async (natural, bonus) => {
      const {actor, service} = setup(natural);
      let outcomes = await service.executeRoll(actor, ability({
        pool: "might",
        roll: "attack",
        damage: 4,
        targetMode: "single"
      }), {targets: [npc(2)]}, policy);
      if (natural >= 19) outcomes = service.chooseAttackOutcomes(outcomes, "damage");
      expect(outcomes[0]?.naturalDamage).toBe(bonus);
      expect(outcomes[0]?.grossDamage).toBe(4 + bonus);
    }
  );

  it("refunds the complete Edge-adjusted Ability action cost on a natural 20", async () => {
    const {actor, service} = setup(20, 0, 10);
    const [outcome] = await service.executeRoll(actor, ability({
      pool: "might",
      cost: {amount: 2, ignoresEdge: false},
      roll: "attack",
      damage: 4,
      targetMode: "single"
    }), {targets: [npc(2)]}, policy);
    expect(outcome?.execution.result).toMatchObject({poolCostPaid: 0, poolCostRefunded: 2});
    expect(actor.system.stats.might.value).toBe(10);
  });

  it("uses Wound consequences for Character targets and ignores provenance during execution", async () => {
    const {actor, service} = setup(12);
    const target = Object.assign(character(), {
      id: "character-target",
      uuid: "Actor.character-target",
      name: "Arthur",
      type: "character" as const,
      tokenId: "token-character",
      tokenUuid: "Scene.scene.Token.token-character"
    }) as unknown as AbilityTargetLike;
    const retained = ability({
      pool: "speed",
      roll: "task",
      woundSeverity: "moderate",
      targetMode: "single",
      grantedBy: {kind: "descriptor", status: "retained"}
    });
    const [outcome] = await service.executeRoll(actor, retained, {
      targets: [target],
      difficulty: {mode: "known", value: 2}
    }, policy);
    expect(outcome).toMatchObject({target: {id: "character-target"}, woundSeverity: "moderate"});
    expect(retained.system.grantedBy).toEqual({kind: "descriptor", status: "retained"});
  });

  it("rejects multiple targets for a single-target Ability and shares one cost across multiple targets", async () => {
    const {actor, service, roller} = setup(12);
    const single = ability({pool: "might", roll: "attack", targetMode: "single"});
    expect(() => service.buildRollPlan(actor, single, {targets: [npc(2, "a"), npc(3, "b")]})).toThrow("only one");
    const multiple = ability({
      pool: "might",
      roll: "attack",
      targetMode: "multiple",
      cost: {amount: 2, ignoresEdge: false}
    });
    const outcomes = await service.executeRoll(actor, multiple, {targets: [npc(2, "a"), npc(3, "b")]}, policy);
    expect(outcomes).toHaveLength(2);
    expect(actor.system.stats.might.value).toBe(18);
    expect(roller).toHaveBeenCalledTimes(1);
  });
});
