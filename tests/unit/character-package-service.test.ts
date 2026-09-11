import {describe, expect, it} from "vitest";
import {collectPackageDerivedData, preservePoolDeficit} from "../../src/packages/package-derived";
import type {CharacterPackageItemLike} from "../../src/packages/package-types";
import {
  CharacterPackageService,
  type PackageCharacterLike,
  type PackageSourceLike
} from "../../src/services/character-package-service";
import {deriveCharacterData} from "../../src/rules/core/derived-data";
import {GrantConflictCancelledError, type GrantConflictResolver} from "../../src/packages/grant-conflicts";

function baseItemSystem(): Record<string, unknown> {
  return {
    schemaVersion: 1, slug: "", description: "", source: {uuid: "", book: "", page: "", license: "original"},
    automation: {mode: "descriptive", duration: {enabled: false, trigger: "recovery"}, rollDefaults: {}},
    ruleElements: [], tags: [], grantedBy: {kind: "other", sourceUuid: "", instanceId: "", grantId: "", status: "active"}
  };
}

function typeSource(overrides: Record<string, unknown> = {}): PackageSourceLike {
  return {
    id: "type-source", uuid: "Item.type-source", name: "Monk Test", type: "characterType",
    system: {
      ...baseItemSystem(),
      poolBonuses: {might: 2, speed: 2, intellect: 0},
      woundBonuses: {minor: 3, moderate: 1, major: 0},
      edgeGrant: {mode: "choice", pool: "none", amount: 1},
      weaponUse: {light: false, medium: true, heavy: false},
      armorUse: {light: true, medium: false, heavy: false},
      abilityGrants: [], genre: "fantasy", customGenreId: "", backgroundOptions: "", equipmentNotes: "", equipmentBundleUuid: "",
      instance: {sourceUuid: "", instanceId: "", role: "primary", attachedAt: 0, selections: {edgePool: "none", skillChoices: []}},
      ...overrides
    }
  };
}

function descriptorSource(id = "fast", overrides: Record<string, unknown> = {}): PackageSourceLike {
  return {
    id, uuid: `Item.${id}`, name: id === "fast" ? "Fast Test" : "Bookish Test", type: "descriptor",
    system: {
      ...baseItemSystem(), poolBonuses: {might: 0, speed: 2, intellect: 0}, poolBonusChoiceGroups: [], skillGrants: [], choiceGroups: [],
      instance: {sourceUuid: "", instanceId: "", role: "primary", attachedAt: 0, selections: {edgePool: "none", poolChoices: [], skillChoices: []}},
      ...overrides
    }
  };
}

function speciesSource(overrides: Record<string, unknown> = {}): PackageSourceLike {
  return {
    id: "species-source", uuid: "Item.species-source", name: "Species Test", type: "species",
    system: {
      ...baseItemSystem(),
      poolBonuses: {might: 2, speed: 0, intellect: 1},
      woundBonuses: {minor: 1, moderate: 0, major: 1},
      edgeGrant: {mode: "choice", pool: "none", amount: 1},
      weaponUse: {light: false, medium: true, heavy: false},
      weaponFamilies: [],
      armorUse: {light: true, medium: false, heavy: false},
      cypherLimitBonus: 1,
      skillGrants: [], choiceGroups: [], abilityGrants: [], abilityChoiceGroups: [], descriptorGrants: [], descriptorChoiceGroups: [],
      instance: {
        sourceUuid: "", instanceId: "", role: "primary", attachedAt: 0,
        selections: {edgePool: "none", skillChoices: [], abilityChoices: [], suppressedGrantIds: []}
      },
      ...overrides
    }
  };
}

function source(id: string, type: "ability" | "skill", name: string): PackageSourceLike {
  return {id, uuid: `Item.${id}`, name, type, system: {...baseItemSystem(), ...(type === "skill" ? {rank: "untrained", defaultPool: "choose", category: "general", contexts: [], initiative: false, acquisition: {minimumTier: 1, grantedByUuid: "", notes: ""}} : {tier: 1})}};
}

function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.replace(/^system\./, "").split(".");
  let cursor = target;
  for (const part of parts.slice(0, -1)) cursor = cursor[part] as Record<string, unknown>;
  cursor[parts.at(-1)!] = value;
}

function actor(): PackageCharacterLike & {documents: any[]; creation: {coreInitialized: boolean; mode: string}} {
  const stats = {
    might: {value: 8, baseMax: 10, baseEdge: 0}, speed: {value: 10, baseMax: 10, baseEdge: 0}, intellect: {value: 10, baseMax: 10, baseEdge: 0}
  };
  const documents: any[] = [];
  const creation = {coreInitialized: true, mode: "completed"};
  const system: any = {
    stats, wounds: {minor: [], moderate: [], major: []}, recovery: {used: {oneAction: false, tenMinutes: false, oneHour: false, tenHours: false}},
    proficiencies: {weaponCategories: ["light"], weaponFamilies: [], armorCategories: [], freelyUse: []},
    presentation: {hideFocusInSentence: false, powerShiftsEnabled: false}, powerShifts: [], creation,
    derived: deriveCharacterData(stats, {minor: [], moderate: [], major: []}, {oneAction: false, tenMinutes: false, oneHour: false, tenHours: false})
  };
  const recalculate = (): void => {
    const packages = collectPackageDerivedData(
      documents.filter((item) => item.type === "characterType" || item.type === "descriptor" || item.type === "species"),
      system.proficiencies.weaponCategories,
      system.proficiencies.armorCategories,
      [],
      system.proficiencies.weaponFamilies
    );
    system.derived = deriveCharacterData(stats, system.wounds, system.recovery.used, packages.extensions, [], {armorCategories: packages.armorCategories, freelyUse: []}, 0, {
      weaponCategories: [...packages.weaponCategories], weaponFamilies: [...packages.weaponFamilies], armorCategories: [...packages.armorCategories], genre: "none",
      genreUuid: "", totalEffortCapMode: "core",
      typeNames: [...packages.typeNames], descriptorNames: [...packages.descriptorNames], speciesNames: [...packages.speciesNames], characterSentence: packages.characterSentence
    });
  };
  const items = documents as any;
  items.get = (id: string) => documents.find((item) => item.id === id);
  return {
    id: "actor", type: "character", system, items, documents, creation,
    async createEmbeddedDocuments(_type: string, data: Record<string, unknown>[]) {
      const created = data.map((entry: Record<string, unknown>, index: number) => {
        const id = `embedded-${documents.length + index + 1}`;
        const item: any = {
          ...structuredClone(entry), id, uuid: `Actor.actor.Item.${id}`,
          async update(changes: Record<string, unknown>) { for (const [path, value] of Object.entries(changes)) setPath(item.system, path, value); },
          async delete() { const at = documents.indexOf(item); if (at >= 0) documents.splice(at, 1); recalculate(); }
        };
        return item;
      });
      documents.push(...created); recalculate(); return created;
    },
    async deleteEmbeddedDocuments(_type: string, ids: string[]) { const removed = documents.filter((item) => ids.includes(item.id)); for (const item of removed) documents.splice(documents.indexOf(item), 1); recalculate(); return removed; },
    async update(changes: Record<string, unknown>) { for (const [path, value] of Object.entries(changes)) setPath(system, path, value); recalculate(); return this; }
  } as any;
}

describe("CharacterPackageService", () => {
  it("accepts an empty custom Type and preserves the canonical creation state", async () => {
    const target = actor();
    const empty = typeSource({poolBonuses: {might: 0, speed: 0, intellect: 0}, woundBonuses: {minor: 0, moderate: 0, major: 0}, edgeGrant: {mode: "none", pool: "none", amount: 1}});
    await new CharacterPackageService(async () => null, () => "instance-empty", () => 10).attachType(target, empty);
    expect(target.documents).toHaveLength(1);
    expect(target.creation).toEqual({coreInitialized: true, mode: "completed"});
  });

  it("requires and persists a Superheroics Pool, derives its bonus, and creates guided Power Shift slots", async () => {
    const target = actor();
    const superhero = typeSource({
      genre: "superhero",
      poolBonuses: {might: 0, speed: 0, intellect: 0},
      superhero: {
        rank: 3,
        powerShiftCount: 4,
        superheroics: {enabled: true, poolBonus: 4}
      }
    });
    const service = new CharacterPackageService(async () => null, () => "hero-instance");
    await expect(service.attachType(target, superhero, {edgePool: "might"}))
      .rejects.toThrow("requires a Superheroics Pool choice");
    expect(target.documents).toHaveLength(0);

    await service.attachType(target, superhero, {
      edgePool: "might",
      superheroicsPool: "speed",
      powerShifts: ["Strength", "Flight"]
    });
    const embedded = target.documents.find((item) => item.type === "characterType");
    expect(embedded.system.superhero).toMatchObject({rank: 3, powerShiftCount: 4});
    expect(embedded.system.instance.selections).toMatchObject({
      superheroicsPool: "speed",
      powerShifts: ["Strength", "Flight", "", ""]
    });
    expect(target.system.derived.pools.speed.max).toBe(14);

    await service.remove(target, embedded.id, "delete");
    expect(target.system.derived.pools.speed.max).toBe(10);
  });

  it("keeps ordinary Types neutral and preserves Superhero selections across explicit replacement", async () => {
    const target = actor();
    const ids = ["ordinary-instance", "hero-instance"];
    const service = new CharacterPackageService(async () => null, () => ids.shift()!);
    await service.attachType(target, typeSource(), {edgePool: "might"});
    const ordinary = target.documents.find((item) => item.type === "characterType");
    expect(ordinary.system.instance.selections).toMatchObject({
      superheroicsPool: "none",
      powerShifts: []
    });
    expect(target.system.derived.pools.intellect.max).toBe(10);

    const replacement = {
      ...typeSource({
        genre: "superhero",
        poolBonuses: {might: 0, speed: 0, intellect: 0},
        superhero: {rank: 2, powerShiftCount: 3, superheroics: {enabled: true, poolBonus: 2}}
      }),
      id: "hero-type",
      uuid: "Item.hero-type",
      name: "Enhanced Hero"
    };
    await service.attachType(target, replacement, {
      edgePool: "might",
      superheroicsPool: "intellect",
      powerShifts: ["Armor", "Strength", "Speed"],
      replaceItemId: ordinary.id,
      replaceGrantedItemsMode: "delete"
    });
    expect(target.documents.filter((item) => item.type === "characterType")).toHaveLength(1);
    expect(target.documents.find((item) => item.type === "characterType").system.instance.selections)
      .toMatchObject({superheroicsPool: "intellect", powerShifts: ["Armor", "Strength", "Speed"]});
    expect(target.system.derived.pools.intellect.max).toBe(12);
  });

  it("preserves Character-owned Power Shift allocations when a Type is replaced or removed", async () => {
    const target = actor();
    (target.system as any).powerShifts = [{
      id: "shift-1", category: "Accuracy", shifts: 2, specification: "", description: "Guide only"
    }];
    const ids = ["hero-one", "hero-two"];
    const service = new CharacterPackageService(async () => null, () => ids.shift()!);
    const first = typeSource({
      genre: "superhero",
      superhero: {rank: 2, powerShiftCount: 4, superheroics: {enabled: false, poolBonus: 0}}
    });
    await service.attachType(target, first, {edgePool: "might"});
    const firstId = target.documents.find((item) => item.type === "characterType").id;
    await service.attachType(target, {
      ...first, id: "replacement", uuid: "Item.replacement", name: "Replacement Hero",
      system: {...first.system, superhero: {rank: 1, powerShiftCount: 2, superheroics: {enabled: false, poolBonus: 0}}}
    }, {edgePool: "might", replaceItemId: firstId});
    expect((target.system as any).powerShifts).toEqual([{
      id: "shift-1", category: "Accuracy", shifts: 2, specification: "", description: "Guide only"
    }]);
    const replacementId = target.documents.find((item) => item.type === "characterType").id;
    await service.remove(target, replacementId, "delete");
    expect((target.system as any).powerShifts).toEqual([{
      id: "shift-1", category: "Accuracy", shifts: 2, specification: "", description: "Guide only"
    }]);
  });

  it("preserves assignment notes, snapshots, and provenance while granting a shared Ability", async () => {
    const target = actor();
    const shared = source("shared", "ability", "Shared Ability");
    const service = new CharacterPackageService(async () => shared, () => "notes-instance");
    await service.attachType(target, typeSource({
      abilityGrants: [{
        id: "shared-grant",
        abilityUuid: shared.uuid,
        notes: "Use the Type-specific defensive reading.",
        snapshot: {name: shared.name, system: shared.system}
      }]
    }), {edgePool: "might"});
    const embeddedType = target.documents.find((item) => item.type === "characterType");
    const granted = target.documents.find((item) => item.type === "ability");
    expect(embeddedType.system.abilityGrants[0]).toMatchObject({
      notes: "Use the Type-specific defensive reading.",
      snapshot: {name: "Shared Ability"}
    });
    expect(granted.system.grantedBy).toMatchObject({
      kind: "type",
      instanceId: "notes-instance",
      grantId: "shared-grant",
      contentUuid: shared.uuid
    });
  });

  it("derives Pools, Wounds, chosen Edge and familiarity without making the Type Genre authoritative", async () => {
    const target = actor();
    const result = await new CharacterPackageService(async () => null, () => "instance-monk", () => 10).attachType(target, typeSource(), {edgePool: "speed"});
    const item = target.documents[0] as CharacterPackageItemLike;
    const derived = collectPackageDerivedData([item], ["light"], []);
    expect(result.instanceId).toBe("instance-monk");
    expect(derived.extensions.poolMax?.might?.[0]).toMatchObject({sourceId: item.id, label: "Monk Test", value: 2});
    expect(derived.extensions.poolEdge?.speed?.[0]?.value).toBe(1);
    expect(derived.extensions.woundCapacity?.minor?.[0]?.value).toBe(3);
    expect(derived.weaponCategories).toEqual(["light", "medium"]);
    expect(derived.armorCategories).toEqual(["light"]);
    expect(derived).not.toHaveProperty("genre");
    expect(target.system.stats.might.value).toBe(10);
    expect(target.system.derived.pools.might.max).toBe(12);
  });

  it("preserves extensible and legacy Type Weapon-family grants on attachment", async () => {
    const extensible = actor();
    await new CharacterPackageService(async () => null, () => "energy-instance").attachType(
      extensible,
      typeSource({weaponFamilies: ["energy-blades"]}),
      {edgePool: "might"}
    );
    expect(extensible.documents[0].system.weaponFamilies).toEqual(["energy-blades"]);
    expect((extensible.system.derived as any).packages.weaponFamilies).toEqual(["energy-blades"]);

    const legacy = actor();
    await new CharacterPackageService(async () => null, () => "axe-instance").attachType(
      legacy,
      typeSource({weaponFamilyUse: {axes: true, knives: false, swords: false}}),
      {edgePool: "might"}
    );
    expect((legacy.system.derived as any).packages.weaponFamilies).toEqual(["axes"]);
  });

  it("supports a fixed Edge Pool independently from a chosen Edge Pool", async () => {
    const target = actor();
    await new CharacterPackageService(async () => null, () => "fixed-edge").attachType(target, typeSource({edgeGrant: {mode: "fixed", pool: "intellect", amount: 1}}));
    expect((target.system.derived as any).pools.intellect.edge).toBe(1);
    expect((target.system.derived as any).pools.might.edge).toBe(0);
  });

  it("creates three Ability grants identified by grant, not by name", async () => {
    const target = actor();
    const abilities = [source("a1", "ability", "Same Name"), source("a2", "ability", "Same Name"), source("a3", "ability", "Third")];
    const grants = abilities.map((ability, index) => ({id: `grant-${index}`, abilityUuid: ability.uuid, snapshot: {name: ability.name, system: ability.system}}));
    const service = new CharacterPackageService(async (uuid) => abilities.find((entry) => entry.uuid === uuid) ?? null, () => "instance-monk");
    await service.attachType(target, typeSource({abilityGrants: grants}), {edgePool: "might"});
    const createdAbilities = target.documents.filter((item) => item.type === "ability");
    expect(createdAbilities).toHaveLength(3);
    expect(createdAbilities.map((item) => item.system.grantedBy.grantId)).toEqual(["grant-0", "grant-1", "grant-2"]);
    expect(createdAbilities.every((item) => item.system.grantedBy.instanceId === "instance-monk")).toBe(true);
  });

  it("uses a stored snapshot when an Ability source disappears and aborts before mutation without one", async () => {
    const valid = actor();
    const service = new CharacterPackageService(async () => null, () => "snapshot-instance");
    await service.attachType(valid, typeSource({abilityGrants: [{id: "lost", abilityUuid: "Item.lost", snapshot: {name: "Lost Ability", system: {tier: 1}}}]}), {edgePool: "might"});
    expect(valid.documents.some((item) => item.name === "Lost Ability")).toBe(true);
    const invalid = actor();
    await expect(service.attachType(invalid, typeSource({abilityGrants: [{id: "bad", abilityUuid: "Item.bad", snapshot: {name: "", system: {}}}]}), {edgePool: "might"})).rejects.toThrow(/usable snapshot/);
    expect(invalid.documents).toHaveLength(0);
  });

  it("rejects duplicate grant IDs before creating embedded documents", async () => {
    const target = actor();
    const duplicate = {id: "same", abilityUuid: "", snapshot: {name: "A", system: {}}};
    await expect(new CharacterPackageService(async () => null).attachType(target, typeSource({abilityGrants: [duplicate, duplicate]}), {edgePool: "might"})).rejects.toThrow(/unique/);
    expect(target.documents).toHaveLength(0);
  });

  it("creates fixed, source-backed, custom, and choice Skills with Descriptor provenance", async () => {
    const target = actor();
    const initiative = source("initiative", "skill", "Initiative");
    const descriptor = descriptorSource("fast", {
      skillGrants: [{id: "fixed-custom", skillUuid: "", customName: "Running", rank: "trained", snapshot: {name: "Running", system: {}}}],
      choiceGroups: [{id: "appealing-choice", choose: 1, rank: "trained", options: [
        {id: "initiative", skillUuid: initiative.uuid, customName: "", snapshot: {name: "Initiative", system: initiative.system}},
        {id: "custom", skillUuid: "", customName: "Charm", snapshot: {name: "Charm", system: {}}}
      ]}]
    });
    await new CharacterPackageService(async (uuid) => uuid === initiative.uuid ? initiative : null, () => "descriptor-instance").attachDescriptor(target, descriptor, {role: "primary", skillChoices: {"appealing-choice": ["initiative"]}});
    const skills = target.documents.filter((item) => item.type === "skill");
    expect(skills.map((item) => item.name)).toEqual(["Running", "Initiative"]);
    expect(skills.map((item) => item.system.grantedBy.grantId)).toEqual(["fixed-custom", "appealing-choice:initiative"]);
    expect(target.system.stats.speed.value).toBe(12);
  });

  it("creates a custom Skill selected from a Descriptor choice group", async () => {
    const target = actor();
    const descriptor = descriptorSource("appealing", {choiceGroups: [{id: "choice", choose: 1, rank: "trained", options: [
      {id: "charm", skillUuid: "", customName: "Charm", snapshot: {name: "Charm", system: {}}}
    ]}]});
    await new CharacterPackageService(async () => null, () => "appealing-instance").attachDescriptor(target, descriptor, {role: "primary", skillChoices: {choice: ["charm"]}});
    expect(target.documents.find((item) => item.type === "skill")).toMatchObject({name: "Charm", system: {rank: "trained", grantedBy: {grantId: "choice:charm"}}});
  });

  it("applies a Descriptor Pool choice through the same derived Max and deficit-preserving Current path", async () => {
    const fixedTarget = actor();
    const choiceTarget = actor();
    const service = new CharacterPackageService(async () => null, () => "gloomy-instance");
    await service.attachDescriptor(fixedTarget, descriptorSource("fixed"), {role: "primary"});
    const result = await service.attachDescriptor(choiceTarget, descriptorSource("gloomy", {
      poolBonuses: {might: 0, speed: 0, intellect: 0},
      poolBonusChoiceGroups: [{id: "pool-choice", amount: 2, choose: 1, pools: ["might", "speed"]}]
    }), {role: "primary", poolChoices: {"pool-choice": ["speed"]}});

    const descriptor = choiceTarget.documents.find((item) => item.type === "descriptor") as CharacterPackageItemLike;
    const first = collectPackageDerivedData([descriptor]);
    const second = collectPackageDerivedData([descriptor]);
    const reloaded = collectPackageDerivedData([{
      ...descriptor,
      system: structuredClone(descriptor.system)
    }]);
    expect(result.instanceId).toBe("gloomy-instance");
    expect(descriptor.system.instance.selections.poolChoices).toEqual([{groupId: "pool-choice", pools: ["speed"]}]);
    expect(first.extensions.poolMax?.speed).toEqual([
      expect.objectContaining({
        id: `package.${result.instanceId}.pool-choice.pool-choice.speed`,
        sourceId: descriptor.id,
        value: 2
      })
    ]);
    expect(second.extensions.poolMax?.speed).toHaveLength(1);
    expect(reloaded.extensions.poolMax?.speed).toHaveLength(1);
    expect(first.extensions.poolMax?.might).toBeUndefined();
    expect(first.extensions.poolMax?.intellect).toBeUndefined();
    expect(choiceTarget.system.derived.pools.speed.max).toBe(fixedTarget.system.derived.pools.speed.max);
    expect(choiceTarget.system.stats.speed.value).toBe(fixedTarget.system.stats.speed.value);
  });

  it("can choose Might without granting Speed or Intellect", async () => {
    const target = actor();
    await new CharacterPackageService(async () => null, () => "might-choice").attachDescriptor(target, descriptorSource("gloomy", {
      poolBonuses: {might: 0, speed: 0, intellect: 0},
      poolBonusChoiceGroups: [{id: "pool-choice", amount: 2, choose: 1, pools: ["might", "speed"]}]
    }), {role: "primary", poolChoices: {"pool-choice": ["might"]}});
    expect(target.system.derived.pools.might.max).toBe(12);
    expect(target.system.derived.pools.speed.max).toBe(10);
    expect(target.system.derived.pools.intellect.max).toBe(10);
    expect(target.system.stats.might.value).toBe(10);
  });

  it("removes only the selected Descriptor Pool contribution and preserves unrelated bonuses", async () => {
    const target = actor();
    const ids = ["gloomy-instance", "other-instance"];
    const service = new CharacterPackageService(async () => null, () => ids.shift()!);
    await service.attachDescriptor(target, descriptorSource("gloomy", {
      poolBonuses: {might: 0, speed: 0, intellect: 0},
      poolBonusChoiceGroups: [{id: "pool-choice", amount: 2, choose: 1, pools: ["might", "speed"]}]
    }), {role: "primary", poolChoices: {"pool-choice": ["speed"]}});
    await service.attachDescriptor(target, descriptorSource("other", {
      poolBonuses: {might: 0, speed: 2, intellect: 0}
    }), {role: "additional"});
    expect(target.system.derived.pools.speed.max).toBe(14);

    const gloomy = target.documents.find((item) => item.type === "descriptor" && item.system.instance.instanceId === "gloomy-instance");
    await service.remove(target, gloomy.id, "delete");
    expect(target.system.derived.pools.speed.max).toBe(12);
    expect(target.system.stats.speed.value).toBe(12);
    expect(target.documents.some((item) => item.system.instance?.instanceId === "other-instance")).toBe(true);
  });

  it("validates Pool choices without weakening existing Skill choice validation", async () => {
    const definition = descriptorSource("gloomy", {
      poolBonuses: {might: 0, speed: 0, intellect: 0},
      poolBonusChoiceGroups: [{id: "pool-choice", amount: 2, choose: 1, pools: ["might", "speed"]}]
    });
    const missing = actor();
    await expect(new CharacterPackageService(async () => null).attachDescriptor(missing, definition, {role: "primary"})).rejects.toThrow(/exactly 1 valid Pool/);
    expect(missing.documents).toHaveLength(0);
    const invalid = actor();
    await expect(new CharacterPackageService(async () => null).attachDescriptor(invalid, definition, {
      role: "primary", poolChoices: {"pool-choice": ["intellect"]}
    })).rejects.toThrow(/exactly 1 valid Pool/);
    expect(invalid.documents).toHaveLength(0);
  });

  it("supports choosing two Pools from a generic three-Pool group", async () => {
    const target = actor();
    await new CharacterPackageService(async () => null, () => "two-pools").attachDescriptor(target, descriptorSource("broad", {
      poolBonuses: {might: 0, speed: 0, intellect: 0},
      poolBonusChoiceGroups: [{id: "two", amount: 2, choose: 2, pools: ["might", "speed", "intellect"]}]
    }), {role: "primary", poolChoices: {two: ["might", "intellect"]}});
    expect(target.system.derived.pools.might.max).toBe(12);
    expect(target.system.derived.pools.speed.max).toBe(10);
    expect(target.system.derived.pools.intellect.max).toBe(12);
  });

  it("supports multiple independent Descriptors but refuses the same source twice", async () => {
    const target = actor();
    const ids = ["one", "two"];
    const service = new CharacterPackageService(async () => null, () => ids.shift()!);
    const fast = descriptorSource("fast");
    await service.attachDescriptor(target, fast, {role: "primary"});
    await service.attachDescriptor(target, descriptorSource("bookish", {poolBonuses: {might: 0, speed: 0, intellect: 2}}), {role: "additional"});
    expect(target.documents.filter((item) => item.type === "descriptor")).toHaveLength(2);
    expect((target.system.derived as any).packages.characterSentence).toBe("Fast Test Bookish Test");
    await expect(service.attachDescriptor(target, fast, {role: "additional"})).rejects.toThrow(/already attached/);
  });

  it("preserves Pool deficit on add and remove", async () => {
    expect(preservePoolDeficit(8, 10, 12)).toBe(10);
    expect(preservePoolDeficit(10, 12, 10)).toBe(8);
    const target = actor();
    const service = new CharacterPackageService(async () => null, () => "instance");
    await service.attachType(target, typeSource(), {edgePool: "might"});
    expect(target.system.stats.might.value).toBe(10);
    await service.remove(target, target.documents.find((item) => item.type === "characterType").id, "delete");
    expect(target.system.stats.might.value).toBe(8);
    expect(target.system.derived.pools.might.max).toBe(10);
  });

  it("replaces the current Type explicitly without accumulating its benefits", async () => {
    const target = actor();
    const ids = ["old-instance", "new-instance"];
    const service = new CharacterPackageService(async () => null, () => ids.shift()!);
    await service.attachType(target, typeSource(), {edgePool: "might"});
    const oldId = target.documents.find((item) => item.type === "characterType").id;
    await service.attachType(target, {...typeSource({poolBonuses: {might: 0, speed: 0, intellect: 3}}), id: "new", uuid: "Item.new", name: "Scholar Test"}, {edgePool: "intellect", replaceItemId: oldId});
    expect(target.documents.filter((item) => item.type === "characterType")).toHaveLength(1);
    expect(target.system.derived.pools.might.max).toBe(10);
    expect(target.system.derived.pools.intellect.max).toBe(13);
    expect(target.creation).toEqual({coreInitialized: true, mode: "completed"});
  });

  it("deletes only exact grants or retains them as orphaned on package removal", async () => {
    const ability = source("a", "ability", "Granted");
    const definition = typeSource({abilityGrants: [{id: "grant", abilityUuid: ability.uuid, snapshot: {name: ability.name, system: ability.system}}]});
    const deleteTarget = actor();
    await new CharacterPackageService(async () => ability, () => "delete-instance").attachType(deleteTarget, definition, {edgePool: "might"});
    await new CharacterPackageService(async () => ability).remove(deleteTarget, deleteTarget.documents.find((item) => item.type === "characterType").id, "delete");
    expect(deleteTarget.documents).toHaveLength(0);
    const keepTarget = actor();
    const service = new CharacterPackageService(async () => ability, () => "keep-instance");
    await service.attachType(keepTarget, definition, {edgePool: "might"});
    await service.remove(keepTarget, keepTarget.documents.find((item) => item.type === "characterType").id, "keep");
    expect(keepTarget.documents).toHaveLength(1);
    expect(keepTarget.documents[0].system.grantedBy).toMatchObject({instanceId: "keep-instance", grantId: "grant", status: "retained"});
  });

  it("attaches Species through the generic package pipeline and derives every supported numeric contribution", async () => {
    const target = actor();
    const skill = source("survival", "skill", "Survival");
    const ability = source("sense-danger", "ability", "Sense Danger");
    const definition = speciesSource({
      skillGrants: [{id: "species-skill", skillUuid: skill.uuid, customName: "", rank: "trained", snapshot: {name: skill.name, system: skill.system}}],
      abilityGrants: [{id: "species-ability", abilityUuid: ability.uuid, snapshot: {name: ability.name, system: ability.system}}]
    });
    const service = new CharacterPackageService(async (uuid) => [skill, ability].find((entry) => entry.uuid === uuid) ?? null, () => "species-instance", () => 20);
    const result = await service.attachSpecies(target, definition, {edgePool: "intellect"});
    const embedded = target.documents.find((item) => item.type === "species") as CharacterPackageItemLike;
    const derived = collectPackageDerivedData([embedded], ["light"], []);
    const actorDerived = target.system.derived as any;

    expect(result.instanceId).toBe("species-instance");
    expect(embedded.system.instance).toMatchObject({sourceUuid: definition.uuid, instanceId: "species-instance", role: "primary", attachedAt: 20});
    expect(actorDerived.pools.might.max).toBe(12);
    expect(actorDerived.pools.intellect.edge).toBe(1);
    expect(actorDerived.wounds.capacities).toMatchObject({minor: 4, moderate: 3, major: 4});
    expect(actorDerived.cypherLimit.max).toBe(3);
    expect(derived.weaponCategories).toEqual(["light", "medium"]);
    expect(derived.armorCategories).toEqual(["light"]);
    expect(derived.speciesNames).toEqual(["Species Test"]);
    expect(actorDerived.packages.characterSentence).toBe("");
    expect(target.documents.filter((item) => item.type === "skill")[0]?.system.grantedBy).toMatchObject({kind: "species", instanceId: "species-instance", grantId: "species-skill", contentUuid: skill.uuid});
    expect(target.documents.filter((item) => item.type === "ability")[0]?.system.grantedBy).toMatchObject({kind: "species", instanceId: "species-instance", grantId: "species-ability", contentUuid: ability.uuid});
    expect(target.creation).toEqual({coreInitialized: true, mode: "completed"});
  });

  it("persists Species Skill and Ability choices and grants only the selected options", async () => {
    const target = actor();
    const skillA = source("skill-a", "skill", "Skill A");
    const skillB = source("skill-b", "skill", "Skill B");
    const abilityA = source("ability-a", "ability", "Ability A");
    const abilityB = source("ability-b", "ability", "Ability B");
    const definition = speciesSource({
      edgeGrant: {mode: "none", pool: "none", amount: 1},
      choiceGroups: [{id: "skill-choice", choose: 1, rank: "specialized", options: [
        {id: "skill-a", skillUuid: skillA.uuid, customName: "", snapshot: {name: skillA.name, system: skillA.system}},
        {id: "skill-b", skillUuid: skillB.uuid, customName: "", snapshot: {name: skillB.name, system: skillB.system}}
      ]}],
      abilityChoiceGroups: [{id: "ability-choice", choose: 1, options: [
        {id: "ability-a", abilityUuid: abilityA.uuid, snapshot: {name: abilityA.name, system: abilityA.system}},
        {id: "ability-b", abilityUuid: abilityB.uuid, snapshot: {name: abilityB.name, system: abilityB.system}}
      ]}]
    });
    const sources = [skillA, skillB, abilityA, abilityB];
    await new CharacterPackageService(async (uuid) => sources.find((entry) => entry.uuid === uuid) ?? null, () => "species-choice").attachSpecies(target, definition, {
      skillChoices: {"skill-choice": ["skill-b"]},
      abilityChoices: {"ability-choice": ["ability-a"]}
    });

    expect(target.documents.filter((item) => item.type === "skill")).toEqual([expect.objectContaining({name: "Skill B", system: expect.objectContaining({rank: "specialized"})})]);
    expect(target.documents.filter((item) => item.type === "ability")).toEqual([expect.objectContaining({name: "Ability A"})]);
    expect(target.documents.find((item) => item.type === "species").system.instance.selections).toMatchObject({
      skillChoices: [{groupId: "skill-choice", optionIds: ["skill-b"]}],
      abilityChoices: [{groupId: "ability-choice", optionIds: ["ability-a"]}]
    });
  });

  it("derives extensible Species Weapon families and recalculates them on replacement and removal", async () => {
    const target = actor();
    const ids = ["first-species", "replacement-species"];
    const service = new CharacterPackageService(async () => null, () => ids.shift()!);
    await service.attachSpecies(target, speciesSource({
      weaponFamilies: ["axes", "energy-blades"]
    }), {edgePool: "might"});
    expect((target.system.derived as any).packages.weaponFamilies).toEqual(["axes", "energy-blades"]);
    expect((target.system.derived as any).packages.weaponCategories).toEqual(["light", "medium"]);

    const firstId = target.documents.find((item) => item.type === "species").id;
    const replacement = {
      ...speciesSource({weaponFamilies: ["swords"], weaponUse: {light: false, medium: false, heavy: true}}),
      id: "replacement", uuid: "Item.replacement", name: "Replacement Species"
    };
    await service.attachSpecies(target, replacement, {
      edgePool: "speed", replaceItemId: firstId, replaceGrantedItemsMode: "delete"
    });
    expect((target.system.derived as any).packages.weaponFamilies).toEqual(["swords"]);
    expect((target.system.derived as any).packages.weaponCategories).toEqual(["light", "heavy"]);

    await service.remove(target, target.documents.find((item) => item.type === "species").id, "delete");
    expect((target.system.derived as any).packages.weaponFamilies).toEqual([]);
    expect((target.system.derived as any).packages.weaponCategories).toEqual(["light"]);
  });

  it("persists a Species Descriptor choice and reuses recursive grant provenance and retention", async () => {
    const target = actor();
    const fixed = descriptorSource("fixed");
    const chosen = descriptorSource("chosen");
    const skipped = descriptorSource("skipped");
    const definition = speciesSource({
      descriptorGrants: [{id: "fixed-descriptor", descriptorUuid: fixed.uuid, snapshot: {name: fixed.name, system: fixed.system}}],
      descriptorChoiceGroups: [{id: "heritage", choose: 1, options: [
        {id: "chosen", descriptorUuid: chosen.uuid, snapshot: {name: chosen.name, system: chosen.system}},
        {id: "skipped", descriptorUuid: skipped.uuid, snapshot: {name: skipped.name, system: skipped.system}}
      ]}]
    });
    const ids = ["species-instance", "fixed-instance", "chosen-instance"];
    const sources = [fixed, chosen, skipped];
    const service = new CharacterPackageService(
      async (uuid) => sources.find((entry) => entry.uuid === uuid) ?? null,
      () => ids.shift()!
    );
    await service.attachSpecies(target, definition, {
      edgePool: "might", descriptorChoices: {heritage: ["chosen"]}
    });

    const embeddedSpecies = target.documents.find((item) => item.type === "species");
    const descriptors = target.documents.filter((item) => item.type === "descriptor");
    expect(embeddedSpecies.system.instance.selections.descriptorChoices)
      .toEqual([{groupId: "heritage", optionIds: ["chosen"]}]);
    expect(descriptors).toHaveLength(2);
    expect(descriptors.map((item) => item.system.instance.sourceUuid)).toEqual([fixed.uuid, chosen.uuid]);
    expect(descriptors.find((item) => item.system.instance.sourceUuid === chosen.uuid)?.system.instance.parent).toMatchObject({
      kind: "species", sourceUuid: definition.uuid, instanceId: "species-instance", grantId: "heritage:chosen"
    });
    expect(target.documents.some((item) => item.system.instance?.sourceUuid === skipped.uuid)).toBe(false);

    await service.remove(target, embeddedSpecies.id, "keep");
    expect(target.documents.filter((item) => item.type === "descriptor")).toHaveLength(2);
    expect(target.documents.filter((item) => item.type === "descriptor")
      .every((item) => item.system.grantedBy.status === "retained")).toBe(true);
  });

  it("materializes a catalog Descriptor by UUID/snapshot without freezing runtime options into Species", async () => {
    const target = actor();
    const chosen = descriptorSource("catalog-chosen");
    const definition = speciesSource({
      descriptorChoiceGroups: [{
        id: "heritage", choose: 1, sourceMode: "catalog", catalogItemType: "descriptor", options: []
      }]
    });
    const resolvedGroups = [{
      id: "heritage", choose: 1, sourceMode: "catalog" as const, catalogItemType: "descriptor" as const,
      options: [{id: chosen.uuid, descriptorUuid: chosen.uuid, snapshot: {name: chosen.name, system: chosen.system}}]
    }];
    const ids = ["catalog-species", "catalog-descriptor"];
    const service = new CharacterPackageService(
      async (uuid) => uuid === chosen.uuid ? chosen : null,
      () => ids.shift()!
    );

    await service.attachSpecies(target, definition, {
      edgePool: "might",
      descriptorChoices: {heritage: [chosen.uuid]},
      resolvedDescriptorChoiceGroups: resolvedGroups
    });

    const embeddedSpecies = target.documents.find((item) => item.type === "species");
    const embeddedDescriptor = target.documents.find((item) => item.type === "descriptor");
    expect(embeddedSpecies.system.descriptorChoiceGroups[0]).toMatchObject({
      sourceMode: "catalog", catalogItemType: "descriptor", options: []
    });
    expect(embeddedSpecies.system.instance.selections.descriptorChoices).toEqual([
      {groupId: "heritage", optionIds: [chosen.uuid]}
    ]);
    expect(embeddedDescriptor).toMatchObject({
      name: chosen.name,
      system: {
        instance: {sourceUuid: chosen.uuid},
        grantedBy: {
          kind: "species",
          sourceUuid: definition.uuid,
          instanceId: "catalog-species",
          grantId: `heritage:${chosen.uuid}`
        }
      }
    });

    resolvedGroups[0]!.options.length = 0;
    expect(target.documents.find((item) => item.id === embeddedDescriptor.id)).toBe(embeddedDescriptor);
    await service.remove(target, embeddedSpecies.id, "keep");
    expect(target.documents.find((item) => item.id === embeddedDescriptor.id)?.system.grantedBy.status).toBe("retained");
  });

  it("removes a selected Species Descriptor when replacing the Species grant tree", async () => {
    const target = actor();
    const chosen = descriptorSource("chosen-replacement");
    const first = speciesSource({
      descriptorChoiceGroups: [{id: "heritage", choose: 1, options: [{
        id: "chosen", descriptorUuid: chosen.uuid, snapshot: {name: chosen.name, system: chosen.system}
      }]}]
    });
    const ids = ["first-species", "chosen-descriptor", "second-species"];
    const service = new CharacterPackageService(
      async (uuid) => uuid === chosen.uuid ? chosen : null,
      () => ids.shift()!
    );
    await service.attachSpecies(target, first, {
      edgePool: "might", descriptorChoices: {heritage: ["chosen"]}
    });
    const firstId = target.documents.find((item) => item.type === "species").id;
    await service.attachSpecies(target, {
      ...speciesSource(), id: "second", uuid: "Item.second", name: "Second Species"
    }, {edgePool: "speed", replaceItemId: firstId, replaceGrantedItemsMode: "delete"});

    expect(target.documents.filter((item) => item.type === "species")).toHaveLength(1);
    expect(target.documents.filter((item) => item.type === "descriptor")).toHaveLength(0);
  });

  it("propagates fixed and choice Skill context notes without modifying canonical Skills", async () => {
    const target = actor();
    const stealth = source("forest-stealth", "skill", "Stealth");
    const navigation = source("mountain-navigation", "skill", "Navigation");
    const definition = speciesSource({
      edgeGrant: {mode: "none", pool: "none", amount: 1},
      skillGrants: [{
        id: "stealth", skillUuid: stealth.uuid, customName: "", rank: "trained",
        notes: "Only in forests.", snapshot: {name: stealth.name, system: stealth.system}
      }],
      choiceGroups: [{id: "terrain", choose: 1, rank: "trained", options: [{
        id: "navigation", skillUuid: navigation.uuid, customName: "",
        notes: "Underground or in mountains.", snapshot: {name: navigation.name, system: navigation.system}
      }]}]
    });
    const sources = [stealth, navigation];
    await new CharacterPackageService(
      async (uuid) => sources.find((entry) => entry.uuid === uuid) ?? null,
      () => "species-notes"
    ).attachSpecies(target, definition, {skillChoices: {terrain: ["navigation"]}});

    expect(target.documents.find((item) => item.name === "Stealth").system.acquisition.notes).toBe("Only in forests.");
    expect(target.documents.find((item) => item.name === "Navigation").system.acquisition.notes).toBe("Underground or in mountains.");
    expect(target.documents.find((item) => item.name === "Navigation").system.grantedBy).toMatchObject({
      kind: "species", grantId: "terrain:navigation"
    });
    expect((stealth.system.acquisition as {notes: string}).notes).toBe("");
    expect((navigation.system.acquisition as {notes: string}).notes).toBe("");
  });

  it("creates a Species-granted Descriptor with an exact recursive provenance chain", async () => {
    const target = actor();
    const skill = source("tracking", "skill", "Tracking");
    const descriptor = descriptorSource("instinctive", {
      skillGrants: [{id: "descriptor-skill", skillUuid: skill.uuid, customName: "", rank: "trained", snapshot: {name: skill.name, system: skill.system}}]
    });
    const definition = speciesSource({descriptorGrants: [{id: "descriptor-grant", descriptorUuid: descriptor.uuid, snapshot: {name: descriptor.name, system: descriptor.system}}]});
    const ids = ["species-instance", "descriptor-instance"];
    const resolver = async (uuid: string) => [descriptor, skill].find((entry) => entry.uuid === uuid) ?? null;
    const service = new CharacterPackageService(resolver, () => ids.shift()!);
    await service.attachSpecies(target, definition, {edgePool: "might"});

    const embeddedDescriptor = target.documents.find((item) => item.type === "descriptor");
    const embeddedSkill = target.documents.find((item) => item.type === "skill");
    expect(embeddedDescriptor.system.instance).toMatchObject({sourceUuid: descriptor.uuid, instanceId: "descriptor-instance", role: "speciesGranted"});
    expect(embeddedDescriptor.system.instance.parent).toMatchObject({kind: "species", sourceUuid: definition.uuid, instanceId: "species-instance", grantId: "descriptor-grant", status: "active"});
    expect(embeddedDescriptor.system.grantedBy).toEqual(embeddedDescriptor.system.instance.parent);
    expect(embeddedSkill.system.grantedBy).toMatchObject({kind: "descriptor", sourceUuid: descriptor.uuid, instanceId: "descriptor-instance", grantId: "descriptor-skill"});

    await service.remove(target, target.documents.find((item) => item.type === "species").id, "delete");
    expect(target.documents).toHaveLength(0);
  });

  it("retains the complete Species grant tree as orphaned content when requested", async () => {
    const target = actor();
    const skill = source("tracking", "skill", "Tracking");
    const descriptor = descriptorSource("instinctive", {skillGrants: [{id: "skill", skillUuid: skill.uuid, customName: "", rank: "trained", snapshot: {name: skill.name, system: skill.system}}]});
    const definition = speciesSource({descriptorGrants: [{id: "descriptor", descriptorUuid: descriptor.uuid, snapshot: {name: descriptor.name, system: descriptor.system}}]});
    const ids = ["species-instance", "descriptor-instance"];
    const service = new CharacterPackageService(async (uuid) => [descriptor, skill].find((entry) => entry.uuid === uuid) ?? null, () => ids.shift()!);
    await service.attachSpecies(target, definition, {edgePool: "might"});
    await service.remove(target, target.documents.find((item) => item.type === "species").id, "keep");

    expect(target.documents.map((item) => item.type)).toEqual(["descriptor", "skill"]);
    expect(target.documents.find((item) => item.type === "descriptor").system.instance.parent.status).toBe("retained");
    expect(target.documents.every((item) => item.system.grantedBy.status === "retained")).toBe(true);
  });

  it("requires explicit Species replacement, preserves deficits, and leaves unrelated Type grants untouched", async () => {
    const target = actor();
    const typeAbility = source("type-ability", "ability", "Type Ability");
    const type = typeSource({abilityGrants: [{id: "type-grant", abilityUuid: typeAbility.uuid, snapshot: {name: typeAbility.name, system: typeAbility.system}}]});
    const ids = ["type-instance", "old-species", "new-species"];
    const service = new CharacterPackageService(async (uuid) => uuid === typeAbility.uuid ? typeAbility : null, () => ids.shift()!);
    await service.attachType(target, type, {edgePool: "speed"});
    await service.attachSpecies(target, speciesSource(), {edgePool: "might"});
    await target.update({"system.stats.might.value": 9});
    const oldSpeciesId = target.documents.find((item) => item.type === "species").id;

    await expect(service.attachSpecies(target, {...speciesSource(), id: "other", uuid: "Item.other", name: "Other Species"}, {edgePool: "speed"})).rejects.toThrow(/already has an active Species/);
    await service.attachSpecies(target, {...speciesSource({poolBonuses: {might: 0, speed: 3, intellect: 0}}), id: "other", uuid: "Item.other", name: "Other Species"}, {
      edgePool: "speed", replaceItemId: oldSpeciesId, replaceGrantedItemsMode: "delete"
    });

    expect(target.documents.filter((item) => item.type === "species")).toHaveLength(1);
    expect(target.documents.some((item) => item.name === "Type Ability")).toBe(true);
    expect(target.system.stats.might.value).toBe(7);
    expect(target.system.derived.pools.speed.max).toBe(15);
    expect(target.creation).toEqual({coreInitialized: true, mode: "completed"});
  });

  it("suppresses obvious duplicate Species Skill and Ability grants without upgrading or duplicating them", async () => {
    const target = actor();
    const skill = source("shared-skill", "skill", "Shared Skill");
    const ability = source("shared-ability", "ability", "Shared Ability");
    const descriptor = descriptorSource("trained", {skillGrants: [{id: "existing-skill", skillUuid: skill.uuid, customName: "", rank: "trained", snapshot: {name: skill.name, system: skill.system}}]});
    const type = typeSource({abilityGrants: [{id: "existing-ability", abilityUuid: ability.uuid, snapshot: {name: ability.name, system: ability.system}}]});
    const ids = ["type-instance", "descriptor-instance", "species-instance"];
    const resolver = async (uuid: string) => [skill, ability].find((entry) => entry.uuid === uuid) ?? null;
    const service = new CharacterPackageService(resolver, () => ids.shift()!);
    await service.attachType(target, type, {edgePool: "might"});
    await service.attachDescriptor(target, descriptor, {role: "primary"});
    const result = await service.attachSpecies(target, speciesSource({
      skillGrants: [{id: "duplicate-skill", skillUuid: skill.uuid, customName: "", rank: "trained", snapshot: {name: skill.name, system: skill.system}}],
      abilityGrants: [{id: "duplicate-ability", abilityUuid: ability.uuid, snapshot: {name: ability.name, system: ability.system}}]
    }), {edgePool: "speed"});

    expect(result.skippedGrantIds).toEqual(["duplicate-ability", "duplicate-skill"]);
    expect(target.documents.filter((item) => item.type === "skill" && item.name === "Shared Skill")).toHaveLength(1);
    expect(target.documents.find((item) => item.type === "skill").system.rank).toBe("trained");
    expect(target.documents.filter((item) => item.type === "ability" && item.name === "Shared Ability")).toHaveLength(1);
  });

  it("resolves a Type + Descriptor duplicate Skill with a rules-valid suggestion and preserves replacement provenance", async () => {
    const target = actor();
    const perception = source("perception", "skill", "Perception");
    const initiative = source("initiative", "skill", "Initiative");
    const initial = typeSource({
      skillGrants: [{id: "perception", skillUuid: perception.uuid, customName: "", rank: "trained", snapshot: {name: perception.name, system: perception.system}}]
    });
    const fast = descriptorSource("fast", {
      choiceGroups: [{id: "fast-choice", choose: 1, rank: "trained", options: [
        {id: "perception", skillUuid: perception.uuid, customName: "", snapshot: {name: perception.name, system: perception.system}},
        {id: "initiative", skillUuid: initiative.uuid, customName: "", snapshot: {name: initiative.name, system: initiative.system}}
      ]}]
    });
    const ids = ["type-instance", "fast-instance"];
    const service = new CharacterPackageService(async (uuid) => [perception, initiative].find((entry) => entry.uuid === uuid) ?? null, () => ids.shift()!);
    await service.attachType(target, initial, {edgePool: "might"});
    const resolver: GrantConflictResolver = async (conflict) => {
      expect(conflict.existing).toMatchObject({name: "Perception", rank: "trained"});
      expect(conflict.proposed).toMatchObject({name: "Perception", rank: "trained"});
      expect(conflict.suggestions).toEqual([expect.objectContaining({name: "Initiative", reason: expect.stringContaining("Fast")})]);
      return {action: "replace", replacement: conflict.suggestions[0]!, selectionKind: "suggested"};
    };
    await service.attachDescriptor(target, fast, {
      role: "additional",
      skillChoices: {"fast-choice": ["perception"]},
      conflictResolver: resolver
    });

    const replacement = target.documents.find((item) => item.type === "skill" && item.name === "Initiative");
    expect(target.documents.filter((item) => item.type === "skill" && item.name === "Perception")).toHaveLength(1);
    expect(replacement.system.rank).toBe("trained");
    expect(replacement.system.grantedBy).toMatchObject({
      kind: "descriptor",
      instanceId: "fast-instance",
      grantId: "fast-choice:perception",
      replacement: {
        active: true,
        originalName: "Perception",
        replacementName: "Initiative",
        selectionKind: "suggested"
      }
    });

    const fastItem = target.documents.find((item) => item.type === "descriptor" && item.system.instance.instanceId === "fast-instance");
    await service.remove(target, fastItem.id, "delete");
    expect(target.documents.some((item) => item.name === "Initiative")).toBe(false);
    expect(target.documents.some((item) => item.name === "Perception")).toBe(true);
  });

  it("supports world/Compendium and custom Skill replacements with the original rank", async () => {
    const target = actor();
    const first = source("first", "skill", "First Duplicate");
    const second = source("second", "skill", "Second Duplicate");
    const compendium = {...source("compendium", "skill", "Compendium Replacement"), uuid: "Compendium.test.skills.Item.compendium"};
    const initial = descriptorSource("initial", {skillGrants: [
      {id: "first", skillUuid: first.uuid, customName: "", rank: "trained", snapshot: {name: first.name, system: first.system}},
      {id: "second", skillUuid: second.uuid, customName: "", rank: "trained", snapshot: {name: second.name, system: second.system}}
    ]});
    const packageWithConflicts = descriptorSource("conflicts", {skillGrants: [
      {id: "duplicate-first", skillUuid: first.uuid, customName: "", rank: "specialized", snapshot: {name: first.name, system: first.system}},
      {id: "duplicate-second", skillUuid: second.uuid, customName: "", rank: "specialized", snapshot: {name: second.name, system: second.system}}
    ]});
    const sources = [first, second, compendium];
    const ids = ["initial-instance", "replacement-instance"];
    const service = new CharacterPackageService(async (uuid) => sources.find((entry) => entry.uuid === uuid) ?? null, () => ids.shift()!);
    await service.attachDescriptor(target, initial, {role: "primary"});
    let call = 0;
    await service.attachDescriptor(target, packageWithConflicts, {
      role: "additional",
      conflictResolver: async (conflict) => {
        call += 1;
        if (call === 1) return {
          action: "replace",
          selectionKind: "compendium",
          replacement: {
            id: compendium.uuid, type: "skill", name: compendium.name, itemUuid: compendium.uuid,
            snapshot: {name: compendium.name, system: compendium.system}, reason: "Compendium Item", reasonSourceUuid: compendium.uuid
          }
        };
        return {
          action: "replace",
          selectionKind: "custom",
          replacement: {
            id: "custom:balance", type: "skill", name: "Balance", itemUuid: "",
            snapshot: {name: "Balance", system: {}}, reason: "Custom Skill", reasonSourceUuid: "", custom: true
          }
        };
      }
    });

    expect(call).toBe(2);
    expect(target.documents.find((item) => item.name === "Compendium Replacement").system).toMatchObject({rank: "specialized", grantedBy: {replacement: {selectionKind: "compendium"}}});
    expect(target.documents.find((item) => item.name === "Balance").system).toMatchObject({rank: "specialized", grantedBy: {replacement: {selectionKind: "custom"}}});
  });

  it("resolves a duplicate Ability from a real Species choice without creating the original duplicate", async () => {
    const target = actor();
    const existing = source("existing-ability", "ability", "Existing Ability");
    const alternative = source("alternative-ability", "ability", "Alternative Ability");
    const ids = ["type-instance", "species-instance"];
    const service = new CharacterPackageService(async (uuid) => [existing, alternative].find((entry) => entry.uuid === uuid) ?? null, () => ids.shift()!);
    await service.attachType(target, typeSource({abilityGrants: [{id: "existing", abilityUuid: existing.uuid, snapshot: {name: existing.name, system: existing.system}}]}), {edgePool: "might"});
    await service.attachSpecies(target, speciesSource({
      edgeGrant: {mode: "none", pool: "none", amount: 1},
      abilityChoiceGroups: [{id: "species-choice", choose: 1, options: [
        {id: "existing", abilityUuid: existing.uuid, snapshot: {name: existing.name, system: existing.system}},
        {id: "alternative", abilityUuid: alternative.uuid, snapshot: {name: alternative.name, system: alternative.system}}
      ]}]
    }), {
      abilityChoices: {"species-choice": ["existing"]},
      conflictResolver: async (conflict) => ({action: "replace", replacement: conflict.suggestions[0]!, selectionKind: "suggested"})
    });

    expect(target.documents.filter((item) => item.type === "ability" && item.name === "Existing Ability")).toHaveLength(1);
    expect(target.documents.filter((item) => item.type === "ability" && item.name === "Alternative Ability")).toHaveLength(1);
  });

  it("offers alternatives explicitly declared by a fixed grant without inventing unrelated suggestions", async () => {
    const target = actor();
    const duplicate = source("fixed-duplicate", "ability", "Fixed Duplicate");
    const declared = source("declared", "ability", "Declared Alternative");
    const unrelated = source("unrelated", "ability", "Unrelated Ability");
    const ids = ["species", "type"];
    const service = new CharacterPackageService(async (uuid) => [duplicate, declared, unrelated].find((entry) => entry.uuid === uuid) ?? null, () => ids.shift()!);
    await service.attachSpecies(target, speciesSource({edgeGrant: {mode: "none", pool: "none", amount: 1}, abilityGrants: [
      {id: "existing", abilityUuid: duplicate.uuid, snapshot: {name: duplicate.name, system: duplicate.system}}
    ]}));
    await service.attachType(target, typeSource({abilityGrants: [{
      id: "duplicate",
      abilityUuid: duplicate.uuid,
      snapshot: {name: duplicate.name, system: duplicate.system},
      alternatives: [{id: "declared", itemUuid: declared.uuid, customName: "", snapshot: {name: declared.name, system: declared.system}}]
    }]}), {
      edgePool: "might",
      conflictResolver: async (conflict) => {
        expect(conflict.suggestions.map((entry) => entry.name)).toEqual(["Declared Alternative"]);
        return {action: "replace", replacement: conflict.suggestions[0]!, selectionKind: "suggested"};
      }
    });
    expect(target.documents.some((item) => item.name === "Declared Alternative")).toBe(true);
    expect(target.documents.some((item) => item.name === "Unrelated Ability")).toBe(false);
  });

  it("keeps an explicit suppressed grant safe and stores it in suppressedGrantIds", async () => {
    const target = actor();
    const skill = source("same", "skill", "Same Skill");
    const ids = ["first", "second"];
    const service = new CharacterPackageService(async () => skill, () => ids.shift()!);
    await service.attachDescriptor(target, descriptorSource("first", {skillGrants: [{id: "one", skillUuid: skill.uuid, customName: "", rank: "trained", snapshot: {name: skill.name, system: skill.system}}]}), {role: "primary"});
    await service.attachDescriptor(target, descriptorSource("second", {skillGrants: [{id: "two", skillUuid: skill.uuid, customName: "", rank: "trained", snapshot: {name: skill.name, system: skill.system}}]}), {
      role: "additional", conflictResolver: async () => ({action: "suppress"})
    });
    const secondDescriptor = target.documents.find((item) => item.type === "descriptor" && item.system.instance.instanceId === "second");
    expect(secondDescriptor.system.instance.selections.suppressedGrantIds).toEqual(["two"]);
    expect(target.documents.filter((item) => item.type === "skill")).toHaveLength(1);
  });

  it("cancels a multi-conflict attachment before any package or replacement mutation", async () => {
    const target = actor();
    const one = source("one-skill", "skill", "One");
    const two = source("two-skill", "skill", "Two");
    const ids = ["base", "cancelled"];
    const service = new CharacterPackageService(async (uuid) => [one, two].find((entry) => entry.uuid === uuid) ?? null, () => ids.shift()!);
    await service.attachDescriptor(target, descriptorSource("base", {skillGrants: [
      {id: "one", skillUuid: one.uuid, customName: "", rank: "trained", snapshot: {name: one.name, system: one.system}},
      {id: "two", skillUuid: two.uuid, customName: "", rank: "trained", snapshot: {name: two.name, system: two.system}}
    ]}), {role: "primary"});
    const before = target.documents.map((item) => ({name: item.name, type: item.type}));
    let calls = 0;
    await expect(service.attachDescriptor(target, descriptorSource("cancelled", {skillGrants: [
      {id: "duplicate-one", skillUuid: one.uuid, customName: "", rank: "trained", snapshot: {name: one.name, system: one.system}},
      {id: "duplicate-two", skillUuid: two.uuid, customName: "", rank: "trained", snapshot: {name: two.name, system: two.system}}
    ]}), {
      role: "additional",
      conflictResolver: async () => (++calls === 1 ? {action: "suppress"} : {action: "cancel"})
    })).rejects.toBeInstanceOf(GrantConflictCancelledError);
    expect(calls).toBe(2);
    expect(target.documents.map((item) => ({name: item.name, type: item.type}))).toEqual(before);
  });

  it("retains a replacement and its complete history when its package is removed", async () => {
    const target = actor();
    const duplicate = source("duplicate", "skill", "Duplicate");
    const replacement = source("replacement", "skill", "Replacement");
    const ids = ["base", "replaced"];
    const service = new CharacterPackageService(async (uuid) => [duplicate, replacement].find((entry) => entry.uuid === uuid) ?? null, () => ids.shift()!);
    await service.attachDescriptor(target, descriptorSource("base", {skillGrants: [{id: "base", skillUuid: duplicate.uuid, customName: "", rank: "trained", snapshot: {name: duplicate.name, system: duplicate.system}}]}), {role: "primary"});
    await service.attachDescriptor(target, descriptorSource("replaced", {skillGrants: [{id: "original", skillUuid: duplicate.uuid, customName: "", rank: "trained", snapshot: {name: duplicate.name, system: duplicate.system}}]}), {
      role: "additional",
      conflictResolver: async () => ({
        action: "replace", selectionKind: "world",
        replacement: {id: replacement.id, type: "skill", name: replacement.name, itemUuid: replacement.uuid, snapshot: {name: replacement.name, system: replacement.system}, reason: "World Item", reasonSourceUuid: replacement.uuid}
      })
    });
    const packageItem = target.documents.find((item) => item.type === "descriptor" && item.system.instance.instanceId === "replaced");
    await service.remove(target, packageItem.id, "keep");
    const retained = target.documents.find((item) => item.name === "Replacement");
    expect(retained.system.grantedBy).toMatchObject({status: "retained", grantId: "original", replacement: {active: true, originalName: "Duplicate", replacementName: "Replacement"}});
  });
});
