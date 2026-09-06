import {describe, expect, it} from "vitest";

import type {CharacterAdvancementData} from "../../src/advancement/advancement-types";
import {registerCoreRuleModule} from "../../src/rules/core-rule-module";
import {RuleRegistry} from "../../src/rules/rule-registry";
import {
  AdvancementService,
  type AdvancementCharacterLike,
  type AdvancementSkillLike
} from "../../src/services/advancement-service";

class TestSkill implements AdvancementSkillLike {
  readonly type = "skill";
  readonly updates: Record<string, unknown>[] = [];
  constructor(
    readonly id: string,
    readonly name: string,
    readonly system: {
      rank: "inability" | "untrained" | "trained" | "specialized" | "expert";
      category: string;
      contexts: string[];
      acquisition: {grantedByUuid: string};
    }
  ) {}
  async update(changes: Record<string, unknown>): Promise<unknown> {
    this.updates.push(changes);
    if (typeof changes["system.rank"] === "string") {
      this.system.rank = changes["system.rank"] as TestSkill["system"]["rank"];
    }
    return this;
  }

}

function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  let cursor = target;
  for (const part of parts.slice(0, -1)) cursor = cursor[part] as Record<string, unknown>;
  cursor[parts.at(-1)!] = value;
}

class TestCharacter implements AdvancementCharacterLike {
  readonly id = "character";
  readonly uuid = "Actor.character";
  readonly type = "character";
  readonly updates: Record<string, unknown>[] = [];
  readonly items: TestSkill[];
  failNextUpdate = false;
  system: AdvancementCharacterLike["system"] & {advancement: CharacterAdvancementData};

  constructor(options: {
    tier?: number;
    xp?: number;
    effort?: number;
    skills?: TestSkill[];
    overrides?: Partial<{
      tier: number | null;
      effort: number | null;
      mightMax: number | null;
      speedMax: number | null;
      intellectMax: number | null;
      mightEdge: number | null;
      speedEdge: number | null;
      intellectEdge: number | null;
    }>;
  } = {}) {
    this.items = options.skills ?? [];
    this.system = {
      tier: options.tier ?? 1,
      overrides: {
        tier: options.overrides?.tier ?? null,
        effort: options.overrides?.effort ?? null,
        stats: {
          might: {max: options.overrides?.mightMax ?? null, edge: options.overrides?.mightEdge ?? null},
          speed: {max: options.overrides?.speedMax ?? null, edge: options.overrides?.speedEdge ?? null},
          intellect: {max: options.overrides?.intellectMax ?? null, edge: options.overrides?.intellectEdge ?? null}
        }
      },
      xp: options.xp ?? 40,
      resourcePoints: 0,
      stats: {
        effortBase: options.effort ?? 1,
        might: {value: 8, baseMax: 10, baseEdge: 0},
        speed: {value: 7, baseMax: 10, baseEdge: 0},
        intellect: {value: 6, baseMax: 10, baseEdge: 0}
      },
      derived: {
        tier: {value: options.overrides?.tier ?? options.tier ?? 1},
        effort: {max: options.overrides?.effort ?? options.effort ?? 1},
        pools: {
          might: {max: options.overrides?.mightMax ?? 10},
          speed: {max: options.overrides?.speedMax ?? 10},
          intellect: {max: options.overrides?.intellectMax ?? 10}
        }
      },
      recovery: {bonus: 0},
      advancement: {
        cycle: 1,
        purchases: [], initializedFocusUuids: [], pendingFocusChoices: [], pendingGenreChoices: [],
        guidanceCompletedTiers: [], notes: ""
      },
      proficiencies: {weaponCategories: [], armorCategories: [], freelyUse: []}
    };
  }

  async update(changes: Record<string, unknown>): Promise<unknown> {
    if (this.failNextUpdate) {
      this.failNextUpdate = false;
      throw new Error("Injected Actor update failure");
    }
    this.updates.push(changes);
    for (const [path, value] of Object.entries(changes)) {
      setPath(this.system as unknown as Record<string, unknown>, path.replace(/^system\./, ""), value);
    }
    for (const pool of ["might", "speed", "intellect"] as const) {
      (this.system.derived.pools[pool] as {max: number}).max = this.system.overrides.stats[pool].max
        ?? this.system.stats[pool].baseMax;
    }
    (this.system.derived.tier as {value: number}).value = this.system.overrides.tier ?? this.system.tier;
    (this.system.derived.effort as {max: number}).max = this.system.overrides.effort
      ?? this.system.stats.effortBase;
    return this;
  }

  async createEmbeddedDocuments(
    _type: string,
    data: Record<string, unknown>[]
  ): Promise<unknown[]> {
    return data.map((entry) => {
      const system = entry.system as TestSkill["system"];
      const created = new TestSkill(`skill-${this.items.length + 1}`, String(entry.name), system);
      this.items.push(created);
      return created;
    });
  }
}

function makeService(): AdvancementService {
  const rules = new RuleRegistry();
  registerCoreRuleModule(rules);
  let id = 0;
  return new AdvancementService(rules, () => `id-${++id}`, () => 1234);
}

function skill(
  rank: TestSkill["system"]["rank"],
  contexts: string[] = [],
  grantedByUuid = ""
): TestSkill {
  return new TestSkill("skill-1", "Test Skill", {
    rank, category: "general", contexts, acquisition: {grantedByUuid}
  });
}

async function completeCycle(actor: TestCharacter, service: AdvancementService): Promise<void> {
  await service.purchase(actor, {kind: "other", otherKind: "recovery"});
  await service.purchase(actor, {kind: "extraEffort"});
  await service.purchase(actor, {kind: "moveTowardPerfection", pool: "might"});
  await service.purchase(actor, {
    kind: "increaseCapabilities", allocation: {might: 4, speed: 0, intellect: 0}
  });
}

describe("AdvancementService", () => {
  it("spends 4 XP, marks the slot, grants Resource Points, and applies the benefit atomically", async () => {
    const actor = new TestCharacter({xp: 8});
    const result = await makeService().purchase(actor, {kind: "extraEffort"});
    expect(actor.system).toMatchObject({xp: 4, resourcePoints: 1, stats: {effortBase: 2}});
    expect(result.record).toMatchObject({kind: "extraEffort", xpCost: 4, resourcePointsGranted: 1});
    expect(actor.updates).toHaveLength(1);
  });

  it("rejects insufficient XP without partial changes", async () => {
    const actor = new TestCharacter({xp: 3});
    await expect(makeService().purchase(actor, {kind: "extraEffort"}))
      .rejects.toMatchObject({code: "insufficient-xp"});
    expect(actor.system.stats.effortBase).toBe(1);
    expect(actor.system.advancement.purchases).toEqual([]);
    expect(actor.updates).toEqual([]);
  });

  it("distributes exactly +4 Pool maximum and current Pool points", async () => {
    const actor = new TestCharacter();
    await makeService().purchase(actor, {
      kind: "increaseCapabilities", allocation: {might: 1, speed: 0, intellect: 3}
    });
    expect(actor.system.stats.might).toMatchObject({baseMax: 11, value: 9});
    expect(actor.system.stats.speed).toMatchObject({baseMax: 10, value: 7});
    expect(actor.system.stats.intellect).toMatchObject({baseMax: 13, value: 9});
  });

  it("rejects invalid capability allocations", async () => {
    const actor = new TestCharacter();
    await expect(makeService().purchase(actor, {
      kind: "increaseCapabilities", allocation: {might: 2, speed: 1, intellect: 0}
    })).rejects.toMatchObject({code: "invalid-allocation"});
    expect(actor.updates).toEqual([]);
  });

  it("adds +1 Base Edge to the chosen Pool and caps Core Effort at 6", async () => {
    const edgeActor = new TestCharacter();
    await makeService().purchase(edgeActor, {kind: "moveTowardPerfection", pool: "speed"});
    expect(edgeActor.system.stats.speed.baseEdge).toBe(1);
    await expect(makeService().purchase(new TestCharacter({effort: 6}), {kind: "extraEffort"}))
      .rejects.toMatchObject({code: "effort-maximum"});
  });

  it("routes capability, Edge, and Effort progression to active overrides only", async () => {
    const actor = new TestCharacter({overrides: {
      effort: 4,
      mightMax: 22,
      speedMax: 19,
      intellectMax: 17,
      mightEdge: 3,
      speedEdge: 2,
      intellectEdge: 4
    }});
    (actor.system.stats.might as {baseMax: number; value: number}).baseMax = 18;
    (actor.system.stats.might as {baseMax: number; value: number}).value = 17;
    const bases = structuredClone(actor.system.stats);

    await makeService().purchase(actor, {
      kind: "increaseCapabilities", allocation: {might: 2, speed: 1, intellect: 1}
    });
    expect(actor.system.overrides.stats.might.max).toBe(24);
    expect(actor.system.overrides.stats.speed.max).toBe(20);
    expect(actor.system.overrides.stats.intellect.max).toBe(18);
    expect(actor.system.stats.might.baseMax).toBe(bases.might.baseMax);
    expect(actor.system.stats.speed.baseMax).toBe(bases.speed.baseMax);
    expect(actor.system.stats.intellect.baseMax).toBe(bases.intellect.baseMax);
    expect(actor.system.stats.might.value).toBe(19);
    expect(actor.system.stats.might.value).toBeLessThanOrEqual(actor.system.derived.pools.might.max);

    const edge = new TestCharacter({overrides: {mightEdge: 3}});
    await makeService().purchase(edge, {kind: "moveTowardPerfection", pool: "might"});
    expect(edge.system.overrides.stats.might.edge).toBe(4);
    expect(edge.system.stats.might.baseEdge).toBe(0);

    const effort = new TestCharacter({effort: 2, overrides: {effort: 4}});
    await makeService().purchase(effort, {kind: "extraEffort"});
    expect(effort.system.overrides.effort).toBe(5);
    expect(effort.system.stats.effortBase).toBe(2);
    expect(effort.system.derived.effort?.max).toBe(5);
  });

  it.each(["might", "speed", "intellect"] as const)(
    "routes %s Edge progression to its independent active override",
    async (pool) => {
      const key = `${pool}Edge` as "mightEdge" | "speedEdge" | "intellectEdge";
      const actor = new TestCharacter({overrides: {[key]: 3}});
      await makeService().purchase(actor, {kind: "moveTowardPerfection", pool});
      expect(actor.system.overrides.stats[pool].edge).toBe(4);
      expect(actor.system.stats[pool].baseEdge).toBe(0);
    }
  );

  it.each([
    ["inability", "untrained"], ["untrained", "trained"], ["trained", "specialized"]
  ] as const)("improves Skill %s to %s", async (before, after) => {
    const item = skill(before);
    await makeService().purchase(new TestCharacter({skills: [item]}), {
      kind: "skillTraining", mode: "improve", skillId: item.id
    });
    expect(item.system.rank).toBe(after);
  });

  it("supports Ability-linked Skills but never grants Expert through Core training", async () => {
    const linked = skill("untrained", [], "Item.ability");
    expect(makeService().skillTrainingOptions(new TestCharacter({skills: [linked]}))[0])
      .toMatchObject({eligible: true, abilityLinked: true});
    const specialized = skill("specialized");
    await expect(makeService().purchase(new TestCharacter({skills: [specialized]}), {
      kind: "skillTraining", mode: "improve", skillId: specialized.id
    })).rejects.toMatchObject({code: "skill-maximum"});
  });

  it("gates attack/defense Trained at Tier 2 and Specialized at Tier 4", () => {
    const service = makeService();
    const attack = skill("untrained", ["attack.weapon"]);
    expect(service.skillTrainingOptions(new TestCharacter({tier: 1, skills: [attack]}))[0])
      .toMatchObject({eligible: false, reason: "tier"});
    expect(service.skillTrainingOptions(new TestCharacter({tier: 2, skills: [attack]}))[0])
      .toMatchObject({eligible: true, nextRank: "trained"});
    attack.system.rank = "trained";
    expect(service.skillTrainingOptions(new TestCharacter({tier: 3, skills: [attack]}))[0])
      .toMatchObject({eligible: false, reason: "tier"});
    expect(service.skillTrainingOptions(new TestCharacter({tier: 4, skills: [attack]}))[0])
      .toMatchObject({eligible: true, nextRank: "specialized"});
  });

  it("learns a new custom Skill as a real trained embedded Item", async () => {
    const actor = new TestCharacter();
    await makeService().purchase(actor, {
      kind: "skillTraining", mode: "learn", customName: "Cartography", customCategory: "general"
    });
    expect(actor.items).toHaveLength(1);
    expect(actor.items[0]).toMatchObject({name: "Cartography", type: "skill", system: {rank: "trained"}});
  });

  it("learns a world Skill source and preserves its source provenance", async () => {
    const actor = new TestCharacter({tier: 2});
    const rules = new RuleRegistry();
    registerCoreRuleModule(rules);
    const source = {
      uuid: "Item.archery",
      name: "Archery",
      type: "skill",
      system: {
        rank: "untrained" as const,
        category: "attack",
        contexts: ["attack.ranged"],
        acquisition: {grantedByUuid: ""}
      }
    };
    const service = new AdvancementService(rules, () => "record", () => 0, async () => source);
    await service.purchase(actor, {kind: "skillTraining", mode: "learn", sourceUuid: source.uuid});
    expect(actor.items[0]).toMatchObject({
      name: "Archery",
      system: {rank: "trained", acquisition: {grantedByUuid: "Item.archery"}}
    });
  });

  it("prevents accidental duplicate learned Skills by normalized name", async () => {
    const actor = new TestCharacter({skills: [new TestSkill("known", "Cartography", {
      rank: "trained", category: "general", contexts: [], acquisition: {grantedByUuid: ""}
    })]});
    await expect(makeService().purchase(actor, {
      kind: "skillTraining", mode: "learn", customName: "  CARTOGRAPHY  ", customCategory: "general"
    })).rejects.toMatchObject({code: "duplicate-skill"});
    expect(actor.items).toHaveLength(1);
  });

  it("applies Tier 2 restriction when learning a new attack/defense Skill", async () => {
    await expect(makeService().purchase(new TestCharacter({tier: 1}), {
      kind: "skillTraining", mode: "learn", customName: "Sword", customCategory: "attack"
    })).rejects.toMatchObject({code: "skill-tier"});
    const actor = new TestCharacter({tier: 2});
    await makeService().purchase(actor, {
      kind: "skillTraining", mode: "learn", customName: "Dodge", customCategory: "defense"
    });
    expect(actor.items[0]?.system.rank).toBe("trained");
  });

  it("rolls back the Skill when the Actor write fails", async () => {
    const item = skill("untrained");
    const actor = new TestCharacter({skills: [item]});
    actor.failNextUpdate = true;
    await expect(makeService().purchase(actor, {kind: "skillTraining", mode: "improve", skillId: item.id})).rejects.toThrow();
    expect(item.system.rank).toBe("untrained");
    expect(actor.system.xp).toBe(40);
  });

  it("prevents duplicate normal slots and permits only one Other slot", async () => {
    const actor = new TestCharacter();
    const service = makeService();
    await service.purchase(actor, {kind: "extraEffort"});
    await expect(service.purchase(actor, {kind: "extraEffort"}))
      .rejects.toMatchObject({code: "already-purchased"});
    await service.purchase(actor, {kind: "other", otherKind: "focus"});
    await expect(service.purchase(actor, {kind: "other", otherKind: "recovery"}))
      .rejects.toMatchObject({code: "other-already-purchased"});
  });

  it("lets Other replace one normal slot and completes at four purchases", async () => {
    const actor = new TestCharacter();
    const service = makeService();
    await completeCycle(actor, service);
    expect(service.view(actor)).toMatchObject({purchasedCount: 4, remainingCount: 0, canAdvanceTier: true});
    await expect(service.purchase(actor, {kind: "skillTraining", mode: "improve", skillId: "missing"}))
      .rejects.toMatchObject({code: "cycle-complete"});
  });

  it.each([[1, 1], [2, 1], [3, 2], [4, 2], [5, 3], [8, 3]])(
    "uses Resource Point threshold at Tier %i",
    async (tier, expected) => {
      const result = await makeService().purchase(new TestCharacter({tier}), {kind: "extraEffort"});
      expect(result.resourcePointsGranted).toBe(expected);
    }
  );

  it("applies the Recovery, Focus, armor, and weapon Other benefits", async () => {
    const recovery = new TestCharacter();
    await makeService().purchase(recovery, {kind: "other", otherKind: "recovery"});
    expect(recovery.system.recovery.bonus).toBe(2);
    const focus = new TestCharacter();
    await makeService().purchase(focus, {kind: "other", otherKind: "focus"});
    expect(focus.system.advancement.pendingFocusChoices[0]).toMatchObject({source: "otherAdvancement", grantTier: 1});
    const armor = new TestCharacter();
    await makeService().purchase(armor, {kind: "other", otherKind: "armor"});
    expect(armor.system.proficiencies.armorCategories).toEqual(["light", "medium", "heavy"]);
    const weapons = new TestCharacter();
    await makeService().purchase(weapons, {kind: "other", otherKind: "weapons"});
    expect(weapons.system.proficiencies.weaponCategories).toEqual(["light", "medium", "heavy"]);
  });

  it("requires Tier 3 for Other: Genre and creates a structured choice", async () => {
    await expect(makeService().purchase(new TestCharacter({tier: 2}), {
      kind: "other", otherKind: "genre"
    })).rejects.toMatchObject({code: "genre-tier"});
    const actor = new TestCharacter({tier: 3});
    await makeService().purchase(actor, {kind: "other", otherKind: "genre"});
    expect(actor.system.advancement.pendingGenreChoices[0]).toMatchObject({source: "otherAdvancement", grantTier: 3});
  });

  it("advances only after four purchases, resets the cycle, and grants a Focus Choice", async () => {
    const actor = new TestCharacter({tier: 1});
    const service = makeService();
    await expect(service.advanceTier(actor)).rejects.toMatchObject({code: "tier-not-ready"});
    await completeCycle(actor, service);
    const result = await service.advanceTier(actor);
    expect(result).toMatchObject({tier: 2, genreChoice: null});
    expect(actor.system.advancement.purchases).toEqual([]);
    expect(actor.system.advancement.cycle).toBe(2);
    expect(actor.system.advancement.pendingFocusChoices[0]).toMatchObject({source: "newTier", grantTier: 2});
  });

  it("advances an active Tier override without changing the hidden calculated Tier", async () => {
    const actor = new TestCharacter({tier: 3, overrides: {tier: 6}});
    const service = makeService();
    await completeCycle(actor, service);
    const result = await service.advanceTier(actor);
    expect(result.tier).toBe(7);
    expect(actor.system.overrides.tier).toBe(7);
    expect(actor.system.tier).toBe(3);
    expect(actor.system.derived.tier?.value).toBe(7);
    expect(result.focusChoice.grantTier).toBe(7);
  });

  it.each([3, 6, 9])("adds milestone Genre Choice at Tier %i", async (newTier) => {
    const actor = new TestCharacter({tier: newTier - 1});
    (actor.system.advancement as unknown as {purchases: unknown[]}).purchases = Array.from({length: 4}, (_, index) => ({
      id: `p-${index}`, kind: "extraEffort", otherKind: "none", tier: newTier - 1,
      xpCost: 4, resourcePointsGranted: 1, timestamp: 0
    }));
    expect((await makeService().advanceTier(actor)).genreChoice)
      .toMatchObject({source: "newTier", grantTier: newTier});
  });

  it("keeps GM override separate and still validates duplicate slots", async () => {
    const actor = new TestCharacter({xp: 0});
    const service = makeService();
    expect((await service.purchaseWithGmOverride(actor, {kind: "extraEffort"})).record.xpCost).toBe(0);
    await expect(service.purchaseWithGmOverride(actor, {kind: "extraEffort"}))
      .rejects.toMatchObject({code: "already-purchased"});
  });

  it("treats progression guidance as explicit persistent user state", async () => {
    const actor = new TestCharacter({tier: 1});
    const service = makeService();

    expect(service.progressionGuidance(actor)).toEqual({
      tier: 1, completed: false, focusAbilityCount: 2, includesGenreAbility: false
    });
    await service.completeProgressionGuidance(actor);
    expect(actor.system.advancement.guidanceCompletedTiers).toEqual([1]);
    expect(service.progressionGuidance(actor).completed).toBe(true);

    await service.purchase(actor, {kind: "extraEffort"});
    expect(service.progressionGuidance(actor).completed).toBe(true);
  });

  it("keeps completed Tier guidance across Tier changes until explicitly reset", async () => {
    const actor = new TestCharacter({tier: 1});
    const service = makeService();
    await service.completeProgressionGuidance(actor);
    (actor.system as {tier: number}).tier = 3;
    (actor.system.derived.tier as {value: number}).value = 3;

    expect(service.progressionGuidance(actor)).toMatchObject({
      tier: 3, completed: false, focusAbilityCount: 1, includesGenreAbility: true
    });
    await service.completeProgressionGuidance(actor);
    expect(actor.system.advancement.guidanceCompletedTiers).toEqual([1, 3]);
    (actor.system as {tier: number}).tier = 1;
    (actor.system.derived.tier as {value: number}).value = 1;
    expect(service.progressionGuidance(actor).completed).toBe(true);
    (actor.system as {tier: number}).tier = 3;
    (actor.system.derived.tier as {value: number}).value = 3;
    await service.resetProgressionGuidance(actor);
    expect(service.progressionGuidance(actor).completed).toBe(false);
    expect(actor.system.advancement.guidanceCompletedTiers).toEqual([1]);
  });
});
