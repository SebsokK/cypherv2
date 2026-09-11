import {describe, expect, it, vi} from "vitest";

import type {NpcModificationData, NpcTargetLike, WeaponItemLike} from "../../src/combat/combat-types";
import {registerCoreRuleModule} from "../../src/rules/core-rule-module";
import {RuleRegistry} from "../../src/rules/rule-registry";
import type {RollPolicyRequest} from "../../src/rolls/roll-types";
import {CombatService, type CombatCharacterLike} from "../../src/services/combat-service";
import {RollService} from "../../src/services/roll-service";
import {SkillService, type SkillItemLike} from "../../src/services/skill-service";
import {TargetResolver} from "../../src/services/target-resolver";
import {WoundService} from "../../src/services/wound-service";
import type {CombatFeedbackService} from "../../src/services/combat-feedback-service";
import type {CombatStatusService} from "../../src/services/combat-status-service";
import {ShieldService} from "../../src/services/shield-service";
import {character} from "../helpers/core-fixtures";

const policy: RollPolicyRequest = {
  base: {difficultyCeiling: 10, assetLimit: 0},
  enabledRuleModuleIds: []
};

function weapon(category: "light" | "medium" | "heavy", overrides: Partial<WeaponItemLike["system"]> = {}): WeaponItemLike {
  let item!: WeaponItemLike;
  const update = vi.fn(async (changes: Record<string, unknown>): Promise<unknown> => {
    if (typeof changes["system.ammo.value"] === "number") {
      (item.system.ammo as {value: number}).value = changes["system.ammo.value"] as number;
    }
    return undefined;
  });
  item = {
    id: `weapon-${category}`,
    name: `${category} weapon`,
    type: "weapon",
    system: {
      slug: `weapon-${category}`,
      category,
      attackType: "melee",
      rangeCategory: "immediate",
      rangeNotes: "",
      damageOverride: null,
      baseDamage: category === "light" ? 2 : category === "medium" ? 4 : 6,
      attackModifier: 0,
      bonusDamage: 0,
      freelyUsed: false,
      equipped: true,
      description: "",
      ammo: {enabled: false, value: 0, max: 0, perAttack: 1},
      depletion: {enabled: false, die: "d6", threshold: 1},
      ...overrides
    },
    update
  };
  return item;
}

function npc(level = 4, armorBase = 0, modifications: readonly NpcModificationData[] = []): NpcTargetLike & {updates: Record<string, unknown>[]} {
  return {
    id: `npc-${level}`,
    name: `Level ${level} NPC`,
    type: "npc",
    system: {
      level,
      armorBase,
      health: {value: 20, baseMax: 20},
      damage: {
        amount: 4,
        woundSeverity: "moderate",
        defense: {allowBlock: true, allowDodge: true},
        notes: ""
      },
      modifications
    },
    updates: [],
    async update(changes): Promise<unknown> {
      this.updates.push(changes);
      if (typeof changes["system.health.value"] === "number") {
        (this.system.health as {value: number}).value = changes["system.health.value"];
      }
      return this;
    }
  };
}

function skill(rank: SkillItemLike["system"]["rank"]): SkillItemLike {
  return {
    id: `skill-${rank}`,
    name: "Melee attacks",
    type: "skill",
    system: {rank, defaultPool: "might", description: "", contexts: ["attack.melee"]}
  };
}

function setup(
  naturalRoll = 12,
  feedback?: CombatFeedbackService,
  statuses?: CombatStatusService
): {actor: CombatCharacterLike; combat: CombatService; roller: ReturnType<typeof vi.fn>} {
  const base = character({effortBase: 4, poolValues: {might: 20, speed: 20}});
  const actor = Object.assign(base, {items: []}) as unknown as CombatCharacterLike;
  actor.system.proficiencies.weaponCategories.splice(0, Infinity, "light", "medium", "heavy");
  actor.system.derived.packages.weaponCategories.splice(0, Infinity, "light", "medium", "heavy");
  const rules = new RuleRegistry();
  registerCoreRuleModule(rules);
  const roller = vi.fn(async () => ({naturalRoll}));
  const rolls = new RollService(rules, roller);
  const skills = new SkillService(rules);
  const targets = new TargetResolver(rules);
  const wounds = new WoundService(() => "wound-1");
  return {
    actor,
    combat: new CombatService(
      rules,
      rolls,
      skills,
      targets,
      wounds,
      feedback,
      statuses,
      new ShieldService(wounds)
    ),
    roller
  };
}

function setWeaponFamiliarity(
  actor: CombatCharacterLike,
  categories: readonly ("light" | "medium" | "heavy")[]
): void {
  actor.system.proficiencies.weaponCategories.splice(0, Infinity, ...categories);
  actor.system.derived.packages.weaponCategories.splice(0, Infinity, ...categories);
}

describe("CombatService weapon attacks", () => {
  it.each(["axes", "knives", "swords"] as const)(
    "treats the lightweight %s Type family grant as Weapon familiarity",
    (family) => {
      const {actor, combat} = setup();
      setWeaponFamiliarity(actor, []);
      actor.system.derived.packages.weaponFamilies = [family];
      expect(combat.weaponFreelyUsed(actor, weapon("heavy", {family}))).toBe(true);
      expect(combat.weaponFamiliarityContribution(actor, weapon("heavy", {
        family: family === "axes" ? "knives" : "axes"
      }))).not.toBeNull();
    }
  );

  it("matches custom Weapon families by normalized identifier without changing category familiarity", () => {
    const {actor, combat} = setup();
    setWeaponFamiliarity(actor, []);
    actor.system.derived.packages.weaponFamilies = [" energy-blades "];
    expect(combat.weaponFreelyUsed(actor, weapon("heavy", {family: "Energy Blades"}))).toBe(true);
    expect(combat.weaponFreelyUsed(actor, weapon("heavy", {family: "Firearms"}))).toBe(false);
    expect(combat.weaponFamiliarityContribution(actor, weapon("heavy", {family: "Firearms"}))).not.toBeNull();
  });

  it("keeps category familiarity authoritative even when a Weapon has an unrelated family", () => {
    const {actor, combat} = setup();
    setWeaponFamiliarity(actor, ["heavy"]);
    actor.system.derived.packages.weaponFamilies = ["axes"];
    expect(combat.weaponFreelyUsed(actor, weapon("heavy", {family: "firearms"}))).toBe(true);
  });

  it.each([["light", 2], ["medium", 4], ["heavy", 6]] as const)(
    "uses Core %s weapon damage %i",
    (category, damage) => {
      const {combat} = setup();
      expect(combat.weaponBaseDamage(weapon(category))).toBe(damage);
    }
  );

  it.each(["might", "speed", "intellect"] as const)(
    "uses configured Weapon default Pool %s when no explicit Pool is supplied",
    (defaultPool) => {
      const {actor, combat} = setup();
      const plan = combat.buildWeaponAttackPlan(actor, weapon("medium", {defaultPool}));
      expect(plan.requests[0]?.pool).toBe(defaultPool);
    }
  );

  it("keeps explicit Pool selection above Weapon default and attack-type fallback", () => {
    const {actor, combat} = setup();
    const configured = weapon("medium", {attackType: "melee", defaultPool: "speed"});
    expect(combat.buildWeaponAttackPlan(actor, configured).requests[0]?.pool).toBe("speed");
    expect(combat.buildWeaponAttackPlan(actor, configured, {pool: "intellect"}).requests[0]?.pool)
      .toBe("intellect");
    expect(combat.buildWeaponAttackPlan(actor, weapon("medium", {
      attackType: "ranged",
      defaultPool: "none"
    })).requests[0]?.pool).toBe("speed");
  });

  it.each(["light", "medium", "heavy"] as const)(
    "does not hinder a familiar %s Weapon",
    (category) => {
      const {actor, combat} = setup();
      setWeaponFamiliarity(actor, [category]);
      const plan = combat.buildWeaponAttackPlan(actor, weapon(category));
      expect(plan.freelyUsed).toBe(true);
      expect(plan.requests[0]?.contributions?.filter(
        (entry) => entry.id === `weapon.weapon-${category}.unfamiliar`
      )).toHaveLength(0);
    }
  );

  it("routes contextual manual Skill steps through the Weapon request", () => {
    const {actor, combat} = setup();
    const plan = combat.buildWeaponAttackPlan(actor, weapon("medium"), {skillSteps: -1});
    expect(plan.requests[0]).toMatchObject({skillSteps: -1});
  });

  it("routes dedicated Free Damage Effort through the shared Weapon roll request", () => {
    const {actor, combat} = setup();
    const request = combat.buildWeaponAttackPlan(actor, weapon("medium"), {
      damageEffort: 2,
      freeDamageEffort: 1
    }).requests[0];
    expect(request).toMatchObject({damageEffort: 2, freeDamageEffort: 1});
  });

  it("adds Paid and Free Damage Effort to Weapon damage while charging only Paid Effort", async () => {
    const {actor, combat} = setup();
    actor.system.stats.effortBase = 1;
    actor.system.derived.effort.max = 1;
    const [outcome] = await combat.executeWeaponAttack(actor, weapon("medium"), {
      damageEffort: 1,
      freeDamageEffort: 2
    }, policy);
    expect(outcome).toMatchObject({categoryDamage: 4, effortDamage: 9, grossDamage: 13});
    expect(outcome?.execution.result.prepared).toMatchObject({
      paidEffortApplied: 1,
      freeEffortApplied: 2,
      damageEffortApplied: 3,
      effortCostBeforeEdge: 3,
      poolCost: 3
    });
    expect(actor.system.stats.might.value).toBe(17);
  });

  it.each(["light", "medium", "heavy"] as const)(
    "hinders an unfamiliar %s Weapon by exactly one step",
    (category) => {
      const {actor, combat} = setup();
      setWeaponFamiliarity(actor, []);
      const plan = combat.buildWeaponAttackPlan(actor, weapon(category, {freelyUsed: true}));
      expect(plan.freelyUsed).toBe(false);
      expect(plan.requests[0]?.contributions).toContainEqual(expect.objectContaining({
        id: `weapon.weapon-${category}.unfamiliar`,
        label: `CYPHERV2.Combat.Weapon.Unfamiliar.${category}`,
        direction: "hinder",
        steps: 1
      }));
    }
  );

  it("uses current effective Character familiarity for every subsequent attack", () => {
    const {actor, combat} = setup();
    setWeaponFamiliarity(actor, []);
    expect(combat.buildWeaponAttackPlan(actor, weapon("medium")).freelyUsed).toBe(false);
    setWeaponFamiliarity(actor, ["medium"]);
    expect(combat.buildWeaponAttackPlan(actor, weapon("medium")).freelyUsed).toBe(true);
  });

  it("reads Armor familiarity from effective Character categories rather than the legacy Item flag", () => {
    const {actor, combat} = setup();
    const armor = {
      id: "armor-heavy", name: "Plate", type: "armor",
      system: {category: "heavy", equipped: false, freelyUsed: true, description: ""}
    } as const;
    actor.system.derived.packages.armorCategories.splice(0, Infinity);
    expect(combat.armorFreelyUsed(actor, armor)).toBe(false);
    actor.system.derived.packages.armorCategories.push("heavy");
    expect(combat.armorFreelyUsed(actor, armor)).toBe(true);
  });

  it("uses the same familiarity contribution for manual and targeted attacks", () => {
    const {actor, combat} = setup();
    setWeaponFamiliarity(actor, []);
    const manual = combat.buildWeaponAttackPlan(actor, weapon("heavy"));
    const targeted = combat.buildWeaponAttackPlan(actor, weapon("heavy"), {targets: [npc()]});
    const unfamiliar = (plan: typeof manual) => plan.requests[0]?.contributions?.filter(
      (entry) => entry.id === "weapon.weapon-heavy.unfamiliar"
    );
    expect(unfamiliar(manual)).toEqual(unfamiliar(targeted));
    expect(unfamiliar(manual)).toHaveLength(1);
  });

  it("deduplicates the familiarity contribution while preserving other modifiers", () => {
    const {actor, combat} = setup();
    setWeaponFamiliarity(actor, []);
    const duplicate = combat.weaponFamiliarityContribution(actor, weapon("medium"))!;
    const plan = combat.buildWeaponAttackPlan(actor, weapon("medium"), {
      otherHindrance: 1,
      contributions: [duplicate, {
        id: "test.attack-hindrance",
        label: "Test attack Hindrance",
        direction: "hinder",
        steps: 1,
        source: "other",
        sourceId: "test"
      }]
    });
    expect(plan.requests[0]?.contributions?.filter(
      (entry) => entry.id === "weapon.weapon-medium.unfamiliar"
    )).toHaveLength(1);
    expect(plan.requests[0]?.contributions).toContainEqual(expect.objectContaining({
      id: "test.attack-hindrance"
    }));
  });

  it.each([-2, -1, 0, 1, 2] as const)(
    "adds Weapon Attack Modifier %i through the contribution pipeline",
    (modifier) => {
      const {actor, combat} = setup();
      const plan = combat.buildWeaponAttackPlan(actor, weapon("medium", {
        freelyUsed: true,
        attackModifier: modifier
      }));
      const contribution = plan.requests[0]?.contributions?.find(
        (entry) => entry.id === "weapon.weapon-medium.attack-modifier"
      );
      if (modifier === 0) expect(contribution).toBeUndefined();
      else expect(contribution).toMatchObject({
        direction: modifier > 0 ? "ease" : "hinder",
        steps: Math.abs(modifier),
        sourceId: "weapon-medium"
      });
    }
  );

  it("adds Weapon bonus damage to its category damage", () => {
    const {combat} = setup();
    expect(combat.weaponBaseDamage(weapon("heavy", {bonusDamage: 2}))).toBe(8);
  });

  it("selects the strongest matching Skill as the automatic combat default", () => {
    const {actor, combat} = setup();
    const trained = skill("trained");
    const expert = skill("expert");
    (expert as {id: string}).id = "skill-expert-2";
    (actor.items as unknown[]) = [trained, expert, skill("inability")];
    expect(combat.applicableWeaponSkills(actor, weapon("medium"))).toEqual([expert, trained, expect.anything()]);
    expect(combat.applicableDefenseSkills(actor, "block")).toEqual([]);
  });

  it("builds an unknown attack without a target", () => {
    const {actor, combat} = setup();
    const plan = combat.buildWeaponAttackPlan(actor, weapon("medium", {freelyUsed: true}));
    expect(plan.requests).toHaveLength(1);
    expect(plan.requests[0]?.difficulty).toEqual({mode: "unknown"});
    expect(plan.requests[0]).not.toHaveProperty("target");
  });

  it("hinders an attack at the weapon's extreme range", () => {
    const {actor, combat} = setup();
    const plan = combat.buildWeaponAttackPlan(actor, weapon("medium", {freelyUsed: true}), {
      extremeRange: true
    });
    expect(plan.requests[0]?.contributions).toContainEqual(expect.objectContaining({
      id: "weapon.weapon-medium.extreme-range",
      direction: "hinder",
      steps: 1
    }));
  });

  it("uses hidden NPC Level and structured defense modifications", () => {
    const {actor, combat} = setup();
    const target = npc(4, 0, [{
      id: "speed-defense",
      label: "Speed Defense as Level 6",
      contexts: ["defense.speed"],
      mode: "levelOverride",
      value: 6,
      visibility: "gm",
      predicate: {},
      description: ""
    }]);
    const plan = combat.buildWeaponAttackPlan(actor, weapon("medium", {freelyUsed: true}), {targets: [target]});
    expect(plan.requests[0]?.difficulty).toEqual({mode: "hidden", value: 6});
    expect(plan.requests[0]?.target).toMatchObject({actorId: target.id, type: "npc"});
  });

  it("combines Skill, Assets, Effort, and shared multi-target resolution without double charging", async () => {
    const {actor, combat, roller} = setup(15);
    const outcomes = await combat.executeWeaponAttack(actor, weapon("medium", {freelyUsed: true}), {
      targets: [npc(3), npc(6)],
      skill: skill("trained"),
      assets: 1,
      paidEffort: 1
    }, policy);

    expect(outcomes).toHaveLength(2);
    expect(outcomes.map((outcome) => outcome.execution.result.success)).toEqual([true, true]);
    expect(outcomes[0]?.execution.result.prepared.totalEase).toBe(3);
    expect(actor.system.stats.might.value).toBe(17);
    expect(roller).toHaveBeenCalledTimes(1);
  });

  it("does not change ammunition when tracking is disabled", async () => {
    const {actor, combat} = setup();
    const item = weapon("medium", {ammo: {enabled: false, value: 8, max: 12, perAttack: 2}});
    await combat.executeWeaponAttack(actor, item, {}, policy);
    expect(item.system.ammo.value).toBe(8);
    expect(item.update).not.toHaveBeenCalled();
  });

  it("consumes ammunition exactly once per executed attack, including a miss and multiple targets", async () => {
    const {actor, combat} = setup(1);
    const item = weapon("medium", {ammo: {enabled: true, value: 8, max: 12, perAttack: 2}});
    const outcomes = await combat.executeWeaponAttack(actor, item, {targets: [npc(4), npc(6)]}, policy);
    expect(outcomes.every((outcome) => outcome.execution.result.success === false)).toBe(true);
    expect(item.system.ammo.value).toBe(6);
    expect(item.update).toHaveBeenCalledTimes(1);
    expect(outcomes[0]?.weaponUse?.ammo).toEqual({previous: 8, current: 6, spent: 2});
    expect(outcomes[1]?.weaponUse).toBeUndefined();
  });

  it("reaches but never passes below zero", async () => {
    const {actor, combat} = setup();
    const item = weapon("medium", {ammo: {enabled: true, value: 3, max: 12, perAttack: 3}});
    await combat.executeWeaponAttack(actor, item, {}, policy);
    expect(item.system.ammo.value).toBe(0);
  });

  it("prevents an attack when Current ammunition is below Per Attack", async () => {
    const {actor, combat, roller} = setup();
    const item = weapon("medium", {ammo: {enabled: true, value: 1, max: 12, perAttack: 2}});
    await expect(combat.executeWeaponAttack(actor, item, {}, policy)).rejects.toThrow("Insufficient Ammunition");
    expect(roller).not.toHaveBeenCalled();
    expect(item.system.ammo.value).toBe(1);
    expect(item.update).not.toHaveBeenCalled();
  });

  it("never automatically rolls Depletion and does not block a Depleted Weapon", async () => {
    const {actor, combat, roller} = setup();
    const item = weapon("medium", {
      depleted: true,
      depletion: {enabled: true, die: "d20", threshold: 3}
    });
    await combat.executeWeaponAttack(actor, item, {}, policy);
    expect(roller).toHaveBeenCalledTimes(1);
    expect(item.update).not.toHaveBeenCalled();
  });

  it.each([[17, 1], [18, 2]] as const)("adds natural %i weapon damage", async (natural, bonus) => {
    const {actor, combat} = setup(natural);
    const [outcome] = await combat.executeWeaponAttack(actor, weapon("medium", {freelyUsed: true}), {
      targets: [npc(2)]
    }, policy);
    expect(outcome?.grossDamage).toBe(4 + bonus);
  });

  it.each([[19, 3], [20, 4]] as const)("resolves natural %i damage/effect choice", async (natural, bonus) => {
    const {actor, combat} = setup(natural);
    const outcomes = await combat.executeWeaponAttack(actor, weapon("medium", {freelyUsed: true}), {
      targets: [npc(2)]
    }, policy);
    expect(combat.chooseAttackOutcomes(outcomes, "damage")[0]?.grossDamage).toBe(4 + bonus);
    expect(combat.chooseAttackOutcomes(outcomes, "effect")[0]?.grossDamage).toBe(4);
  });

  it("adds +3 damage per damage Effort and charges combined Effort once", async () => {
    const {actor, combat} = setup(12);
    const [outcome] = await combat.executeWeaponAttack(actor, weapon("medium", {freelyUsed: true}), {
      targets: [npc(2)],
      paidEffort: 1,
      damageEffort: 1
    }, policy);
    expect(outcome?.grossDamage).toBe(7);
    expect(actor.system.stats.might.value).toBe(15);
  });

  it("combines category, Weapon bonus, Damage Effort, and natural damage", async () => {
    const {actor, combat} = setup(17);
    const [outcome] = await combat.executeWeaponAttack(actor, weapon("heavy", {
      freelyUsed: true,
      bonusDamage: 2
    }), {
      targets: [npc(2)],
      damageEffort: 1
    }, policy);

    expect(outcome).toMatchObject({
      categoryDamage: 6,
      weaponBonusDamage: 2,
      effortDamage: 3,
      naturalDamage: 1,
      grossDamage: 12
    });
  });
});

describe("CombatService defense and damage", () => {
  it("builds a hidden requested defense roll from NPC Level without rolling for the NPC", () => {
    const {actor, combat} = setup();
    const source = npc(5);
    const request = combat.buildDefenseAgainstNpcRequest(actor, source, "dodge");
    expect(request).toMatchObject({
      pool: "speed",
      difficulty: {mode: "hidden", value: 5},
      origin: {kind: "defense", defenseType: "dodge", sourceActorId: source.id}
    });
  });

  it("builds Block from Might and Dodge from Speed with armor contributions", () => {
    const {actor, combat} = setup();
    actor.system.derived.combat.armor = {
      itemId: "armor-heavy",
      category: "heavy",
      freelyUsed: true,
      blockEase: 3,
      dodgeHindrance: 3,
      speedTaskHindrance: 0,
      blockContributions: [{id: "armor.block", sourceId: "armor-heavy", sourceType: "item", label: "", value: 3}],
      dodgeContributions: [{id: "armor.dodge", sourceId: "armor-heavy", sourceType: "item", label: "", value: 3}],
      speedTaskContributions: []
    };
    expect(combat.buildDefenseRequest(actor, "block", {difficulty: {mode: "known", value: 4}})).toMatchObject({
      pool: "might",
      contributions: [expect.objectContaining({direction: "ease", steps: 3})]
    });
    expect(combat.buildDefenseRequest(actor, "dodge", {difficulty: {mode: "known", value: 4}})).toMatchObject({
      pool: "speed",
      contributions: [expect.objectContaining({direction: "hinder", steps: 3})]
    });
  });

  it("routes contextual manual Skill steps through Defense requests", () => {
    const {actor, combat} = setup();
    expect(combat.buildDefenseRequest(actor, "dodge", {
      difficulty: {mode: "unknown"},
      skillSteps: 2
    })).toMatchObject({skillSteps: 2});
  });

  it.each([["light", 1], ["medium", 2], ["heavy", 3]] as const)(
    "uses existing %s Armor contributions for manual Dodge and Block",
    (category, steps) => {
      const {actor, combat} = setup();
      actor.system.derived.combat.armor = {
        itemId: `armor-${category}`,
        category,
        freelyUsed: true,
        blockEase: steps,
        dodgeHindrance: steps,
        speedTaskHindrance: 0,
        blockContributions: [{id: `armor.${category}.block`, sourceId: `armor-${category}`, sourceType: "item", label: "", value: steps}],
        dodgeContributions: [{id: `armor.${category}.dodge`, sourceId: `armor-${category}`, sourceType: "item", label: "", value: steps}],
        speedTaskContributions: []
      };
      expect(combat.buildDefenseRequest(actor, "dodge", {difficulty: {mode: "unknown"}})).toMatchObject({
        pool: "speed",
        contributions: [expect.objectContaining({direction: "hinder", steps})]
      });
      expect(combat.buildDefenseRequest(actor, "block", {difficulty: {mode: "unknown"}})).toMatchObject({
        pool: "might",
        contributions: [expect.objectContaining({direction: "ease", steps})]
      });
    }
  );

  it("does not apply unfamiliar Armor Speed-task Hindrance twice to Dodge", () => {
    const {actor, combat} = setup();
    actor.system.derived.combat.armor = {
      itemId: "armor-medium",
      category: "medium",
      freelyUsed: false,
      blockEase: 2,
      dodgeHindrance: 2,
      speedTaskHindrance: 2,
      blockContributions: [],
      dodgeContributions: [{id: "armor.medium.dodge", sourceId: "armor-medium", sourceType: "item", label: "", value: 2}],
      speedTaskContributions: [{id: "armor.medium.speed", sourceId: "armor-medium", sourceType: "item", label: "", value: 2}]
    };
    const request = combat.buildDefenseRequest(actor, "dodge", {difficulty: {mode: "known", value: 4}});
    const rules = new RuleRegistry();
    registerCoreRuleModule(rules);
    const preview = new RollService(rules, async () => ({naturalRoll: 10})).preview(actor, request, policy);
    expect(preview.totalHindrance).toBe(2);
    expect(preview.breakdown.filter((entry) => entry.id.startsWith("armor.medium"))).toHaveLength(1);
  });

  it("makes Dodge avoid a Wound and successful Block reduce it one severity", () => {
    const {actor, combat} = setup();
    const success = new RollService(new RuleRegistry(), async () => ({naturalRoll: 12}));
    void success;
    const result = {
      success: true,
      naturalEffects: [],
      naturalRoll: 12,
      naturalMarkers: [],
      poolCostPaid: 0,
      poolCostRefunded: 0,
      beatsDifficulty: 4,
      prepared: combat.buildDefenseRequest(actor, "block", {difficulty: {mode: "known", value: 2}})
    } as unknown as import("../../src/rolls/roll-types").RollResult;
    expect(combat.woundAfterDefense(result, "dodge", "major")).toBe("none");
    expect(combat.woundAfterDefense(result, "block", "major")).toBe("moderate");
    expect(combat.woundAfterDefense(result, "block", "minor")).toBe("none");
    expect(combat.woundAfterDefense({...result, success: false}, "block", "major")).toBe("major");
  });

  it("applies damage to NPC Health after NPC Armor", async () => {
    const {combat} = setup();
    const target = npc(3, 2);
    const result = await combat.applyNpcDamage(target, 6);
    expect(result).toMatchObject({requestedDamage: 6, armor: 2, appliedDamage: 4, health: 16});
    expect(target.system.health.value).toBe(16);
  });

  it("keeps two unlinked Token Actors from one NPC source independent", async () => {
    const npcDamage = vi.fn(async () => undefined);
    const feedback: CombatFeedbackService = {npcDamage, characterWound: vi.fn(async () => undefined)};
    const syncNpcDead = vi.fn(async () => undefined);
    const {combat} = setup(12, feedback, {syncNpcDead});
    const first = Object.assign(npc(3), {
      id: "shared-npc",
      tokenId: "token-a",
      tokenUuid: "Scene.scene.Token.token-a"
    });
    const second = Object.assign(npc(3), {
      id: "shared-npc",
      tokenId: "token-b",
      tokenUuid: "Scene.scene.Token.token-b"
    });

    const firstResult = await combat.applyNpcDamage(first, 4);
    expect(first.system.health.value).toBe(16);
    expect(second.system.health.value).toBe(20);
    const secondResult = await combat.applyNpcDamage(second, 20);
    expect(first.system.health.value).toBe(16);
    expect(second.system.health.value).toBe(0);
    expect(firstResult.dead).toBe(false);
    expect(secondResult.dead).toBe(true);
    expect(npcDamage).toHaveBeenNthCalledWith(1, first, expect.objectContaining({appliedDamage: 4}));
    expect(npcDamage).toHaveBeenNthCalledWith(2, second, expect.objectContaining({health: 0}));
    expect(syncNpcDead).toHaveBeenNthCalledWith(1, first, false);
    expect(syncNpcDead).toHaveBeenNthCalledWith(2, second, true);
  });

  it("preserves each Token identity in a multi-target attack from one NPC source", () => {
    const {actor, combat} = setup();
    const first = Object.assign(npc(3), {
      id: "shared-npc",
      tokenId: "token-a",
      tokenUuid: "Scene.scene.Token.token-a"
    });
    const second = Object.assign(npc(3), {
      id: "shared-npc",
      tokenId: "token-b",
      tokenUuid: "Scene.scene.Token.token-b"
    });
    const plan = combat.buildWeaponAttackPlan(actor, weapon("medium", {freelyUsed: true}), {
      targets: [first, second]
    });

    expect(plan.requests.map((entry) => entry.target?.tokenUuid)).toEqual([
      "Scene.scene.Token.token-a",
      "Scene.scene.Token.token-b"
    ]);
    expect(plan.targetResolutions.map((entry) => entry?.targetIdentity.tokenId)).toEqual([
      "token-a",
      "token-b"
    ]);
  });

  it("applies a structured Wound to a Character without HP conversion", async () => {
    const {actor, combat} = setup();
    await combat.applyCharacterWound(actor, "moderate", {id: "npc-1", name: "Sentinel"});
    expect(actor.system.wounds.moderate).toHaveLength(1);
    expect(actor.system.wounds.moderate[0]).toMatchObject({label: "Sentinel attack", sourceUuid: "Actor.npc-1"});
  });
});
