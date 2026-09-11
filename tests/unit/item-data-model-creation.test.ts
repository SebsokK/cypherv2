import {readFile} from "node:fs/promises";
import path from "node:path";
import {afterAll, beforeAll, describe, expect, it, vi} from "vitest";

interface FieldOptions {
  initial?: unknown;
  choices?: readonly string[];
  blank?: boolean;
}

class MockField {
  constructor(readonly options: FieldOptions = {}) {}
}

class MockStringField extends MockField {}
class MockHTMLField extends MockStringField {}
class MockNumberField extends MockField {}
class MockBooleanField extends MockField {}
class MockObjectField extends MockField {}

class MockSchemaField extends MockField {
  constructor(readonly schema: Record<string, MockField>, options: FieldOptions = {}) {
    super(options);
  }
}

class MockArrayField extends MockField {
  constructor(readonly element: MockField, options: FieldOptions = {}) {
    super(options);
  }
}

function initializeField(field: MockField, source: unknown): unknown {
  if (field instanceof MockSchemaField) {
    const object = source && typeof source === "object" ? source as Record<string, unknown> : {};
    return Object.fromEntries(Object.entries(field.schema).map(([key, child]) => (
      [key, initializeField(child, object[key])]
    )));
  }
  if (field instanceof MockArrayField) {
    const values = Array.isArray(source) ? source : field.options.initial ?? [];
    return (values as unknown[]).map((value) => initializeField(field.element, value));
  }
  const value = source ?? field.options.initial;
  if (field instanceof MockStringField) {
    if (value === "" && field.options.choices && field.options.blank !== true) {
      throw new Error("may not be a blank string");
    }
    if (field.options.choices && !field.options.choices.includes(String(value))) {
      throw new Error(`invalid choice '${String(value)}'`);
    }
  }
  return value;
}

describe("Item DataModel creation defaults", () => {
  beforeAll(() => {
    class MockTypeDataModel {
      static migrateData(source: Record<string, unknown>): Record<string, unknown> {
        return {...source};
      }

      prepareDerivedData(): void {}

      constructor(source: Record<string, unknown> = {}) {
        const constructor = this.constructor as typeof MockTypeDataModel & {
          defineSchema(): Record<string, MockField>;
        };
        const migrated = constructor.migrateData(source);
        Object.assign(this, Object.fromEntries(
          Object.entries(constructor.defineSchema()).map(([key, field]) => (
            [key, initializeField(field, migrated[key])]
          ))
        ));
      }
    }

    vi.stubGlobal("foundry", {
      abstract: {TypeDataModel: MockTypeDataModel},
      data: {fields: {
        ArrayField: MockArrayField,
        BooleanField: MockBooleanField,
        HTMLField: MockHTMLField,
        NumberField: MockNumberField,
        ObjectField: MockObjectField,
        SchemaField: MockSchemaField,
        StringField: MockStringField
      }}
    });
  });

  afterAll(() => vi.unstubAllGlobals());

  it("creates a fresh Skill using the explicit choose state", async () => {
    const {SkillDataModel} = await import("../../src/data/items/skill");
    const skill = new (SkillDataModel as unknown as new (source?: Record<string, unknown>) => {
      defaultPool: string;
    })();

    expect(skill.defaultPool).toBe("choose");
  });

  it("creates a fresh descriptive Ability with optional automation defaults", async () => {
    const {AbilityDataModel} = await import("../../src/data/items/ability");
    const ability = new (AbilityDataModel as unknown as new () => any)();
    expect(ability).toMatchObject({
      archived: false,
      activation: "action",
      pool: "none",
      cost: {amount: 0, scalable: false, ignoresEdge: false, allowedPools: []},
      roll: "none",
      rollModifier: 0,
      attackModifier: 0,
      damage: 0,
      woundSeverity: "none",
      range: "",
      targetMode: "none"
    });
  });

  it("defaults archive presentation state safely and preserves partial updates", async () => {
    const {AbilityDataModel} = await import("../../src/data/items/ability");
    expect(AbilityDataModel.migrateData({description: "Changed"}, {partial: true}))
      .toEqual({description: "Changed"});
    expect(AbilityDataModel.migrateData({archived: true}, {partial: true}))
      .toEqual({archived: true});
  });

  it("preserves legacy Enabler activation and migrates legacy cost Pool data", async () => {
    const {AbilityDataModel} = await import("../../src/data/items/ability");
    const ability = new (AbilityDataModel as unknown as new (source: Record<string, unknown>) => any)({
      activation: "enabler",
      cost: {amount: 2, pool: "intellect", variable: false}
    });
    expect(ability).toMatchObject({
      activation: "enabler",
      pool: "intellect",
      cost: {amount: 2, scalable: false, ignoresEdge: false, allowedPools: ["intellect"]}
    });
  });

  it("serializes scalable Ability costs and every CRD activation distinction", async () => {
    const {AbilityDataModel} = await import("../../src/data/items/ability");
    const scalable = new (AbilityDataModel as unknown as new (source: Record<string, unknown>) => any)({
      cost: {amount: 2, scalable: true, allowedPools: ["intellect"]}
    });
    expect(scalable.cost).toMatchObject({amount: 2, scalable: true, allowedPools: ["intellect"]});
    for (const activation of [
      "action", "firstAction", "lastAction", "enabler", "reaction", "timed", "perpetual", "passive", "special"
    ]) {
      const ability = new (AbilityDataModel as unknown as new (source: Record<string, unknown>) => any)({activation});
      expect(ability.activation).toBe(activation);
    }
  });

  it("migrates legacy Choose Pool to Any Pool and preserves explicit multi-Pool costs", async () => {
    const {AbilityDataModel} = await import("../../src/data/items/ability");
    const choose = new (AbilityDataModel as unknown as new (source: Record<string, unknown>) => any)({
      pool: "choose",
      cost: {amount: 4, ignoresEdge: false}
    });
    expect(choose.cost.allowedPools).toEqual(["might", "speed", "intellect"]);

    const explicit = new (AbilityDataModel as unknown as new (source: Record<string, unknown>) => any)({
      pool: "might",
      cost: {amount: 7, ignoresEdge: false, allowedPools: ["intellect", "might"]}
    });
    expect(explicit.cost.allowedPools).toEqual(["might", "intellect"]);

    const none = new (AbilityDataModel as unknown as new (source: Record<string, unknown>) => any)({
      cost: {amount: 0, ignoresEdge: false, allowedPools: ["none"]}
    });
    expect(none.cost.allowedPools).toEqual([]);
  });

  it("migrates the former invalid blank Skill state to choose", async () => {
    const {SkillDataModel} = await import("../../src/data/items/skill");
    const skill = new (SkillDataModel as unknown as new (source?: Record<string, unknown>) => {
      defaultPool: string;
    })({defaultPool: ""});

    expect(skill.defaultPool).toBe("choose");
  });

  it.each(["might", "speed", "intellect", "choose"])(
    "keeps saved Skill Pool %s and automation fields through a Description-only partial update",
    async (defaultPool) => {
      const {SkillDataModel} = await import("../../src/data/items/skill");
      const saved = {
        description: "Old",
        defaultPool,
        rank: "trained",
        category: "defense",
        contexts: ["defense.speed"],
        initiative: true,
        acquisition: {minimumTier: 2, grantedByUuid: "Item.source", notes: "Keep"}
      };
      const partial = SkillDataModel.migrateData({description: "Changed"}, {partial: true});
      expect(partial).toEqual({description: "Changed"});
      Object.assign(saved, partial);
      expect(saved).toMatchObject({
        defaultPool,
        rank: "trained",
        category: "defense",
        contexts: ["defense.speed"],
        initiative: true,
        acquisition: {minimumTier: 2, grantedByUuid: "Item.source", notes: "Keep"}
      });
    }
  );

  it("normalizes an explicitly changed blank Skill Pool without inventing it on partial updates", async () => {
    const {SkillDataModel} = await import("../../src/data/items/skill");
    expect(SkillDataModel.migrateData({rank: "specialized"}, {partial: true}))
      .toEqual({rank: "specialized"});
    expect(SkillDataModel.migrateData({defaultPool: ""}, {partial: true}))
      .toEqual({defaultPool: "choose"});
    expect(SkillDataModel.migrateData({defaultPool: "might"}, {partial: true}))
      .toEqual({defaultPool: "might"});
  });

  it("creates a fresh Weapon with neutral modifiers and disabled Depletion", async () => {
    const {WeaponDataModel} = await import("../../src/data/items/weapon");
    const weapon = new (WeaponDataModel as unknown as new (source?: Record<string, unknown>) => {
      attackModifier: number;
      bonusDamage: number;
      skillLevel: string;
      defaultPool: string;
      family: string;
      depleted: boolean;
      damageOverride: number | null;
      depletion: {enabled: boolean; die: string; threshold: number};
    })();

    expect(weapon).toMatchObject({
      attackModifier: 0,
      bonusDamage: 0,
      skillLevel: "untrained",
      defaultPool: "none",
      family: "",
      depleted: false,
      damageOverride: null,
      depletion: {enabled: false, die: "d6", formula: "", threshold: 1}
    });
  });

  it.each(["inability", "untrained", "trained", "specialized", "expert"])(
    "round-trips Weapon Skill Level %s",
    async (skillLevel) => {
      const {WeaponDataModel} = await import("../../src/data/items/weapon");
      const weapon = new (WeaponDataModel as unknown as new (source?: Record<string, unknown>) => {
        skillLevel: string;
      })({skillLevel});
      expect(weapon.skillLevel).toBe(skillLevel);
    }
  );

  it.each([
    ["none", ""],
    ["axes", "axes"],
    [" Knives ", "knives"],
    ["SWORDS", "swords"],
    ["Energy Blades", "energy-blades"]
  ])(
    "normalizes and round-trips the extensible Weapon family %s",
    async (family, expected) => {
      const {WeaponDataModel} = await import("../../src/data/items/weapon");
      const migrated = WeaponDataModel.migrateData({family}, {partial: true});
      const weapon = new (WeaponDataModel as unknown as new (source: Record<string, unknown>) => {
        family: string;
      })(migrated);
      expect(weapon.family).toBe(expected);
    }
  );

  it.each(["none", "might", "speed", "intellect"])(
    "round-trips Weapon default Pool %s",
    async (defaultPool) => {
      const {WeaponDataModel} = await import("../../src/data/items/weapon");
      const weapon = new (WeaponDataModel as unknown as new (source?: Record<string, unknown>) => {
        defaultPool: string;
      })({defaultPool});
      expect(weapon.defaultPool).toBe(defaultPool);
    }
  );

  it("migrates legacy Weapon Pool data without polluting unrelated partial updates", async () => {
    const {WeaponDataModel} = await import("../../src/data/items/weapon");
    expect(WeaponDataModel.migrateData({category: "medium"})).toMatchObject({defaultPool: "none"});
    const unrelatedPartial = WeaponDataModel.migrateData({bonusDamage: 2}, {partial: true});
    expect(unrelatedPartial).toMatchObject({bonusDamage: 2});
    expect(unrelatedPartial).not.toHaveProperty("defaultPool");
    expect(WeaponDataModel.migrateData({defaultPool: "speed"}, {partial: true}))
      .toMatchObject({defaultPool: "speed"});
  });

  it("creates a fresh functional Shield with a 3/2/1 Wound Track", async () => {
    const {ShieldDataModel} = await import("../../src/data/items/shield");
    const shield = new (ShieldDataModel as unknown as new () => any)();
    expect(shield).toMatchObject({
      equipped: false,
      woundCapacities: {minor: 3, moderate: 2, major: 1},
      wounds: {minor: [], moderate: [], major: []},
      derived: {capacities: {minor: 3, moderate: 2, major: 1}, broken: false}
    });
  });

  it("derives Shield Wound capacity from its persisted configuration", async () => {
    const {ShieldDataModel} = await import("../../src/data/items/shield");
    const shield = new (ShieldDataModel as unknown as new (source?: Record<string, unknown>) => any)({
      woundCapacities: {minor: 4, moderate: 3, major: 2},
      wounds: {minor: [], moderate: [], major: [{id: "major-1"}]}
    });
    shield.prepareDerivedData();
    expect(shield.woundCapacities).toEqual({minor: 4, moderate: 3, major: 2});
    expect(shield.derived.capacities).toEqual({minor: 4, moderate: 3, major: 2});
    expect(shield.derived.broken).toBe(false);
  });

  it("migrates a legacy Weapon damage override into category bonus damage", async () => {
    const {WeaponDataModel} = await import("../../src/data/items/weapon");
    const weapon = new (WeaponDataModel as unknown as new (source?: Record<string, unknown>) => {
      bonusDamage: number;
      damageOverride: number | null;
    })({category: "heavy", damageOverride: 8});

    expect(weapon.bonusDamage).toBe(2);
    expect(weapon.damageOverride).toBeNull();
  });

  it("uses the shared structured Depletion contract for future Artifacts", async () => {
    const {ArtifactDataModel} = await import("../../src/data/items/artifact");
    const artifact = new (ArtifactDataModel as unknown as new (source?: Record<string, unknown>) => {
      depletion: {enabled: boolean; die: string; threshold: number};
    })({depletion: "1 in 1d10"});

    expect(artifact.depletion).toEqual({enabled: true, die: "d10", formula: "1d10", threshold: 1});
  });

  it("creates Cyphers with V2 manifestation and Power fields and migrates legacy shells safely", async () => {
    const {CypherDataModel} = await import("../../src/data/items/cypher");
    const fresh = new (CypherDataModel as unknown as new () => any)();
    expect(fresh).toMatchObject({
      manifestation: "subtle",
      manifest: false,
      form: "",
      power: "low",
      levelOverride: false
    });
    const legacyManifest = new (CypherDataModel as unknown as new (source: Record<string, unknown>) => any)({manifest: true, level: 6});
    expect(legacyManifest).toMatchObject({manifestation: "manifest", level: 6, levelOverride: true});
    const legacyDefault = new (CypherDataModel as unknown as new (source: Record<string, unknown>) => any)({manifest: false, level: 1});
    expect(legacyDefault.levelOverride).toBe(false);
  });

  it("supports fixed and rollable Artifact Levels plus a reversible Depleted state", async () => {
    const {ArtifactDataModel} = await import("../../src/data/items/artifact");
    const fixed = new (ArtifactDataModel as unknown as new (source?: Record<string, unknown>) => any)({level: 6});
    const rollable = new (ArtifactDataModel as unknown as new (source?: Record<string, unknown>) => any)({level: "1d6+2", depleted: true});
    expect(fixed).toMatchObject({level: "6", depleted: false});
    expect(fixed.depletion).toMatchObject({formula: "1d6"});
    expect(rollable).toMatchObject({level: "1d6+2", depleted: true});
  });

  it("keeps Inventory rich-description partial updates isolated from all mechanical data", async () => {
    const {EquipmentDataModel, CypherDataModel, ArtifactDataModel} = await import("../../src/data/items");
    for (const Model of [EquipmentDataModel, CypherDataModel, ArtifactDataModel]) {
      expect(Model.migrateData({description: "<p>@UUID[Item.example]</p>"}, {partial: true}))
        .toEqual({description: "<p>@UUID[Item.example]</p>"});
    }
  });

  it("keeps Combat Item mechanics and Shield Wounds through Description-only updates", async () => {
    const {WeaponDataModel, ArmorDataModel, ShieldDataModel} = await import("../../src/data/items");
    const saved = [
      {Model: WeaponDataModel, system: {description: "Old", category: "heavy", bonusDamage: 2, ammo: {enabled: true, value: 4, max: 6, perAttack: 1}, damageOverride: null}},
      {Model: ArmorDataModel, system: {description: "Old", category: "medium", equipped: true, freelyUsed: false, depletion: {enabled: true, die: "d20", threshold: 3}, depleted: true}},
      {Model: ShieldDataModel, system: {description: "Old", equipped: true, woundCapacities: {minor: 4, moderate: 3, major: 2}, wounds: {minor: [{id: "m1"}], moderate: [], major: []}, depletion: {enabled: true, die: "d10", threshold: 2}, depleted: true}}
    ];
    for (const {Model, system} of saved) {
      const before = structuredClone(system);
      const partial = Model.migrateData({description: "<p>@UUID[Item.test]</p>"}, {partial: true});
      Object.assign(system, partial);
      expect(system.description).toContain("@UUID");
      for (const [key, value] of Object.entries(before)) {
        if (key !== "description") expect(system[key as keyof typeof system]).toEqual(value);
      }
    }
  });

  it("creates a fresh Focus with a versioned empty graph", async () => {
    const {FocusDataModel} = await import("../../src/data/items/focus");
    const focus = new (FocusDataModel as unknown as new () => {
      graph: {version: number; nodes: unknown[]; connections: unknown[]};
    })();
    expect(focus.graph).toEqual({version: 1, nodes: [], connections: []});
  });

  it("creates a fresh Genre with a Core cap and empty authoritative Ability catalog", async () => {
    const {GenreDataModel} = await import("../../src/data/items/genre");
    const model = new (GenreDataModel as unknown as new () => any)();
    expect(model).toMatchObject({
      description: "",
      abilityCatalog: [],
      options: {totalEffortCapMode: "core"},
      legacyKey: ""
    });
    expect(GenreDataModel.migrateData({description: "Changed"}, {partial: true}))
      .toEqual({description: "Changed"});

    const legacyEntry = new (GenreDataModel as unknown as new (source: Record<string, unknown>) => any)({
      abilityCatalog: [{
        id: "entry-a",
        abilityUuid: "Item.ability-a",
        snapshot: {name: "Ability A", system: {description: "A"}}
      }]
    });
    expect(legacyEntry.abilityCatalog[0]).toMatchObject({
      minimumTier: 1,
      catalog: "progression",
      minimumSuperheroRank: 0
    });
  });

  it("never reconstructs a saved Focus graph during partial Description, Name, or technical updates", async () => {
    const {FocusDataModel} = await import("../../src/data/items/focus");
    const graph = {
      version: 2,
      nodes: [{
        id: "stone-bash",
        abilityUuid: "Item.stone-bash",
        abilitySnapshot: {name: "Stone Bash", description: "<p>Snapshot</p>"},
        tier: 2,
        position: {x: 0.35, y: null}
      }, {
        id: "stone-body",
        abilityUuid: "Compendium.cypherv2.abilities.Item.stone-body",
        abilitySnapshot: {name: "Stone Body", description: "<p>Another snapshot</p>"},
        tier: 3,
        position: {x: 0.65, y: null}
      }],
      connections: [{id: "stone-path", from: "stone-bash", to: "stone-body"}]
    };
    const source: Record<string, unknown> = {description: "Old", slug: "stone", graph: structuredClone(graph)};
    const item = {name: "Abides in Stone", system: source};
    const before = structuredClone(source.graph);

    for (const update of [{description: "<p>New description</p>"}, {slug: "stone-focus"}]) {
      const partial = FocusDataModel.migrateData(update, {partial: true});
      expect(partial).not.toHaveProperty("graph");
      Object.assign(source, partial);
      expect(source.graph).toEqual(before);
    }
    item.name = "Commands Stone"; // Top-level Item update; system remains untouched.
    expect(item.system.graph).toEqual(before);
  });

  it("keeps partial Ability cost updates isolated while normalizing explicit Pool selections", async () => {
    const {AbilityDataModel} = await import("../../src/data/items/ability");
    expect(AbilityDataModel.migrateData({cost: {ignoresEdge: true}}, {partial: true}))
      .toEqual({cost: {ignoresEdge: true}});
    expect(AbilityDataModel.migrateData({cost: {allowedPools: ["intellect", "might"]}}, {partial: true}))
      .toEqual({cost: {allowedPools: ["might", "intellect"]}});
    expect(AbilityDataModel.migrateData({cost: {allowedPools: []}}, {partial: true}))
      .toEqual({cost: {allowedPools: []}});
    const savedCost = {amount: 7, ignoresEdge: false, allowedPools: ["might", "intellect"]};
    const edgeUpdate = AbilityDataModel.migrateData({cost: {ignoresEdge: true}}, {partial: true});
    Object.assign(savedCost, edgeUpdate.cost);
    expect(savedCost).toEqual({amount: 7, ignoresEdge: true, allowedPools: ["might", "intellect"]});
  });

  it("creates valid empty Type, Descriptor, and Species definitions without JSON", async () => {
    const {CharacterTypeDataModel, DescriptorDataModel, SpeciesDataModel} = await import("../../src/data/items");
    const type = new (CharacterTypeDataModel as unknown as new () => any)();
    const descriptor = new (DescriptorDataModel as unknown as new () => any)();
    const species = new (SpeciesDataModel as unknown as new () => any)();
    expect(type).toMatchObject({
      poolBonuses: {might: 0, speed: 0, intellect: 0},
      woundBonuses: {minor: 0, moderate: 0, major: 0},
      edgeGrant: {mode: "none", pool: "none", amount: 1},
      weaponUse: {light: false, medium: false, heavy: false},
      weaponFamilies: [],
      armorUse: {light: false, medium: false, heavy: false},
      superhero: {rank: 0, powerShiftCount: 0, superheroics: {enabled: false, poolBonus: 0}},
      abilityGrants: [], abilityChoiceGroups: [], skillGrants: [], choiceGroups: [], genre: "none"
    });
    expect(descriptor).toMatchObject({
      poolBonuses: {might: 0, speed: 0, intellect: 0},
      poolBonusChoiceGroups: [], skillGrants: [], choiceGroups: [],
      instance: {selections: {poolChoices: []}}
    });
    expect(species).toMatchObject({
      poolBonuses: {might: 0, speed: 0, intellect: 0},
      woundBonuses: {minor: 0, moderate: 0, major: 0},
      edgeGrant: {mode: "none", pool: "none", amount: 1},
      weaponUse: {light: false, medium: false, heavy: false},
      weaponFamilies: [],
      armorUse: {light: false, medium: false, heavy: false},
      cypherLimitBonus: 0,
      skillGrants: [], choiceGroups: [], abilityGrants: [], abilityChoiceGroups: [], descriptorGrants: [], descriptorChoiceGroups: []
    });
  });

  it("normalizes extensible Species Weapon families and preserves Skill/Descriptor choice metadata", async () => {
    const {SpeciesDataModel} = await import("../../src/data/items/species");
    const species = new (SpeciesDataModel as unknown as new (source?: Record<string, unknown>) => any)({
      weaponFamilies: [" Energy Blades ", "AXES", "energy-blades"],
      skillGrants: [{
        id: "forest-stealth", skillUuid: "Item.stealth", customName: "", rank: "trained",
        notes: "Only while moving through forests.", snapshot: {name: "Stealth", system: {}}
      }],
      choiceGroups: [{
        id: "terrain", choose: 1, rank: "trained", options: [{
          id: "mountains", skillUuid: "Item.navigation", customName: "",
          notes: "Underground or in mountains.", snapshot: {name: "Navigation", system: {}}
        }]
      }],
      descriptorChoiceGroups: [{
        id: "heritage", choose: 1, options: [{
          id: "rugged", descriptorUuid: "Item.rugged", snapshot: {name: "Rugged", system: {}}
        }]
      }]
    });
    expect(species.weaponFamilies).toEqual(["energy-blades", "axes"]);
    expect(species.skillGrants[0].notes).toBe("Only while moving through forests.");
    expect(species.choiceGroups[0].options[0].notes).toBe("Underground or in mountains.");
    expect(species.descriptorChoiceGroups[0]).toMatchObject({
      id: "heritage", choose: 1, sourceMode: "fixed", catalogItemType: "none"
    });
    const catalogSpecies = new (SpeciesDataModel as unknown as new (source?: Record<string, unknown>) => any)({
      descriptorChoiceGroups: [{
        id: "all-descriptors", choose: 1, sourceMode: "catalog", catalogItemType: "descriptor", options: []
      }]
    });
    expect(catalogSpecies.descriptorChoiceGroups[0]).toMatchObject({
      sourceMode: "catalog", catalogItemType: "descriptor", options: []
    });
    expect(SpeciesDataModel.migrateData({weaponFamilyUse: {axes: true, knives: false, swords: true}}, {partial: true}))
      .toMatchObject({weaponFamilies: ["axes", "swords"]});
  });

  it("stores Superhero Type metadata, Power Shift slots, and assignment-level notes", async () => {
    const {CharacterTypeDataModel} = await import("../../src/data/items/character-type");
    const type = new (CharacterTypeDataModel as unknown as new (source: Record<string, unknown>) => any)({
      genre: "superhero",
      superhero: {rank: 4, powerShiftCount: 5, superheroics: {enabled: true, poolBonus: 6}},
      abilityGrants: [{
        id: "shared-ability",
        abilityUuid: "Item.shared",
        notes: "This Type applies the defensive option only.",
        snapshot: {name: "Shared Ability", system: {tier: 1}}
      }],
      instance: {selections: {superheroicsPool: "might", powerShifts: ["Strength", "Flight"]}}
    });
    expect(type.superhero).toEqual({
      rank: 4,
      powerShiftCount: 5,
      superheroics: {enabled: true, poolBonus: 6}
    });
    expect(type.instance.selections).toMatchObject({
      superheroicsPool: "might",
      powerShifts: ["Strength", "Flight"]
    });
    expect(type.abilityGrants[0].notes).toBe("This Type applies the defensive option only.");
  });

  it("migrates closed beta.3 Type family flags into extensible normalized families", async () => {
    const {CharacterTypeDataModel} = await import("../../src/data/items/character-type");
    expect(CharacterTypeDataModel.migrateData({
      weaponFamilyUse: {axes: true, knives: false, swords: true}
    }, {partial: true})).toMatchObject({weaponFamilies: ["axes", "swords"]});
    expect(CharacterTypeDataModel.migrateData({
      weaponFamilies: [" Energy Blades ", "AXES", "energy-blades"]
    }, {partial: true})).toMatchObject({weaponFamilies: ["energy-blades", "axes"]});
  });

  it("normalizes Descriptor Pool bonus choice groups and persisted selections", async () => {
    const {DescriptorDataModel} = await import("../../src/data/items");
    const descriptor = new (DescriptorDataModel as unknown as new (source?: Record<string, unknown>) => any)({
      poolBonusChoiceGroups: [{id: "gloomy-pool", amount: 2, choose: 1, pools: ["might", "speed"]}],
      instance: {selections: {poolChoices: [{groupId: "gloomy-pool", pools: ["speed"]}]}}
    });
    expect(descriptor.poolBonusChoiceGroups).toEqual([
      {id: "gloomy-pool", amount: 2, choose: 1, pools: ["might", "speed"]}
    ]);
    expect(descriptor.instance.selections.poolChoices).toEqual([
      {groupId: "gloomy-pool", pools: ["speed"]}
    ]);
    expect(typeof descriptor.poolBonusChoiceGroups[0].amount).toBe("number");
    expect(typeof descriptor.poolBonusChoiceGroups[0].choose).toBe("number");
  });

  it("provides generic inactive-safe grant provenance on every Item", async () => {
    const {AbilityDataModel} = await import("../../src/data/items/ability");
    const ability = new (AbilityDataModel as unknown as new () => any)();
    expect(ability.grantedBy).toEqual({
      kind: "other",
      sourceUuid: "",
      instanceId: "",
      grantId: "",
      contentUuid: "",
      contentKey: "",
      replacement: {
        active: false,
        originalName: "",
        originalContentUuid: "",
        originalContentKey: "",
        replacementName: "",
        replacementContentUuid: "",
        replacementContentKey: "",
        selectionKind: "none"
      },
      status: "active"
    });
  });

  it("keeps all rich package descriptions as empty-safe source strings", async () => {
    const models = await import("../../src/data/items");
    for (const Model of [
      models.AbilityDataModel,
      models.FocusDataModel,
      models.SkillDataModel,
      models.WeaponDataModel,
      models.CharacterTypeDataModel,
      models.DescriptorDataModel,
      models.SpeciesDataModel
    ]) {
      const empty = new (Model as unknown as new () => {description: string})();
      const rich = new (Model as unknown as new (source: Record<string, unknown>) => {description: string})({
        description: "<p><strong>Rich</strong> description</p>"
      });
      expect(empty.description).toBe("");
      expect(rich.description).toBe("<p><strong>Rich</strong> description</p>");
    }
  });

  it("reserves Focus provenance on fresh Abilities without acquiring anything", async () => {
    const {AbilityDataModel} = await import("../../src/data/items/ability");
    const ability = new (AbilityDataModel as unknown as new () => {
      sourceFocusUuid: string;
      sourceNodeId: string;
    })();
    expect(ability).toMatchObject({sourceFocusUuid: "", sourceNodeId: ""});
  });

  it("migrates the former flattened Focus graph without copying obsolete fields", async () => {
    const {FocusDataModel} = await import("../../src/data/items/focus");
    const focus = new (FocusDataModel as unknown as new (source: Record<string, unknown>) => {
      graph: {version: number; nodes: Array<Record<string, unknown>>};
    })({
      graphVersion: 2,
      nodes: [{
        id: "stable-id",
        title: "Snapshot Name",
        tierRequired: 3,
        abilitySourceUuid: "Item.ability",
        position: {x: 42, y: 99}
      }],
      connections: []
    });
    expect(focus.graph).toMatchObject({
      version: 2,
      nodes: [{
        id: "stable-id",
        abilityUuid: "Item.ability",
        abilitySnapshot: {name: "Snapshot Name"},
        tier: 3,
        position: {x: 42, y: 99}
      }]
    });
  });

  it("migrates Character Focus progression from Item IDs to explicit UUID keys", async () => {
    const {CharacterDataModel} = await import("../../src/data/actors/character");
    const migrated = CharacterDataModel.migrateData({
      focusProgress: [{focusItemId: "legacy-focus", ownedNodeIds: ["node-a"]}]
    });
    expect(migrated.focusProgress).toEqual([
      {
        focusUuid: "legacy-focus",
        ownedNodeIds: ["node-a"],
        acquisitions: [{
          nodeId: "node-a",
          mode: "legacy",
          choiceId: "",
          choiceSource: "none",
          choiceGrantTier: 1,
          choiceFocusUuid: "",
          acquiredAt: 0
        }],
        provenance: "additional",
        initialChoicesGranted: false,
        attachedAt: 0
      }
    ]);
  });

  it("accepts generated Focus and Ability documents through the current Item DataModels", async () => {
    // @ts-expect-error Developer-only JavaScript module has no runtime-facing TypeScript declaration.
    const {generateFocusImport} = await import("../../scripts/focus-importer.mjs");
    const generated = generateFocusImport({
      schemaVersion: 1,
      source: {id: "data-model-test", title: "DataModel Test", version: "1", license: "test-only"},
      abilities: [{
        id: "model-ability",
        name: "Model Ability",
        tier: 2,
        fullRulesDescription: "<p>Model-safe rules.</p>",
        sourcePage: "1",
        actionClassification: "action",
        cost: {kind: "fixed", amount: 2, allowedPools: ["might", "intellect"], ignoresEdge: false},
        repeatability: {canTakeMultipleTimes: false, maximumSelections: null},
        prerequisiteAbilityId: null,
        laterTierChanges: [],
        automation: {activation: "action", roll: "attack", attackModifier: 1, damage: 4, range: "long", targetMode: "single"},
        reviewStatus: "verified",
        reviewNote: "",
        reviewIssues: []
      }],
      foci: [{
        id: "model-focus",
        name: "Model Focus",
        description: "<p>Model-safe Focus.</p>",
        sourcePage: "2",
        genreThemes: [],
        gmIntrusionSuggestions: [],
        additionalEquipment: "",
        associatedAbilities: ["model-ability"],
        graph: {
          nodes: [{id: "model-node", abilityId: "model-ability", tier: 2, order: 0, reviewStatus: "verified", reviewNote: ""}],
          edges: []
        },
        reviewStatus: "verified",
        reviewNote: "",
        reviewIssues: []
      }]
    });
    const {AbilityDataModel} = await import("../../src/data/items/ability");
    const {FocusDataModel} = await import("../../src/data/items/focus");
    const abilitySource = generated.abilityDocuments[0].system as Record<string, unknown>;
    const focusSource = generated.focusDocuments[0].system as Record<string, unknown>;
    const importedAbility = new (AbilityDataModel as unknown as new (source: Record<string, unknown>) => any)(abilitySource);
    const importedFocus = new (FocusDataModel as unknown as new (source: Record<string, unknown>) => any)(focusSource);
    expect(importedAbility).toMatchObject({
      tier: 2,
      activation: "action",
      cost: {amount: 2, scalable: false, allowedPools: ["might", "intellect"]},
      roll: "attack"
    });
    expect(importedFocus.graph.nodes[0]).toMatchObject({id: "model-node", tier: 2});
  });

  it("creates a fresh uninitialized Core Character with the V2 source defaults", async () => {
    const {CharacterDataModel} = await import("../../src/data/actors/character");
    const character = new (CharacterDataModel as unknown as new () => {
      tier: number;
      stats: Record<string, unknown> & {might: Record<string, unknown>; speed: Record<string, unknown>; intellect: Record<string, unknown>};
      cypherLimitBase: number;
      proficiencies: {weaponCategories: string[]; weaponFamilies: string[]; armorCategories: string[]};
      genre: {sourceUuid: string; instanceId: string; provenance: string; attachedAt: number};
      advancement: {guidanceCompletedTiers: number[]};
      creation: {coreInitialized: boolean; mode: string};
      recovery: {slots: Array<{id: string; type: string; used: boolean}>; customized: boolean; rollModifier: number};
      presentation: {hideFocusInSentence: boolean; powerShiftsEnabled: boolean};
      powerShifts: unknown[];
      overrides: {wounds: Record<string, number>};
      derived: {wounds: {capacities: Record<string, number>}};
    })();
    expect(character.tier).toBe(1);
    expect(character.stats).toMatchObject({
      effortBase: 1,
      might: {value: 8, baseMax: 8, baseEdge: 0},
      speed: {value: 8, baseMax: 8, baseEdge: 0},
      intellect: {value: 8, baseMax: 8, baseEdge: 0}
    });
    expect(character.cypherLimitBase).toBe(2);
    expect(character.proficiencies).toMatchObject({weaponCategories: ["light"], weaponFamilies: [], armorCategories: []});
    expect(character.genre).toEqual({sourceUuid: "", instanceId: "", provenance: "manual", attachedAt: 0});
    expect(character.advancement.guidanceCompletedTiers).toEqual([]);
    expect(character.creation).toMatchObject({coreInitialized: false, mode: "uninitialized"});
    expect(character.presentation.powerShiftsEnabled).toBe(false);
    expect(character.powerShifts).toEqual([]);
    expect(character.recovery).toMatchObject({customized: false, rollModifier: 0});
    expect(character.recovery.slots.map(({id, type}) => ({id, type}))).toEqual([
      {id: "core-recovery-action", type: "one-action"},
      {id: "core-recovery-ten-minutes", type: "10-minutes"},
      {id: "core-recovery-one-hour", type: "1-hour"},
      {id: "core-recovery-ten-hours", type: "10-hours"}
    ]);
    expect(character.presentation.hideFocusInSentence).toBe(false);
    expect(character.overrides.wounds).toEqual({minor: 0, moderate: 0, major: 0});
    expect(character.derived.wounds.capacities).toEqual({minor: 3, moderate: 3, major: 3});
  });

  it("preserves a finalized Core Setup through Character migration/reload", async () => {
    const {CharacterDataModel} = await import("../../src/data/actors/character");
    const migrated = CharacterDataModel.migrateData({
      creation: {coreInitialized: true, mode: "setup", initializedAt: 9876}
    });
    expect(migrated.creation).toEqual({
      coreInitialized: true,
      mode: "completed",
      initializedAt: 9876
    });
  });

  it("does not create or reset creation during a partial Character DataModel migration", async () => {
    const {CharacterDataModel} = await import("../../src/data/actors/character");
    const migrated = CharacterDataModel.migrateData({
      xp: 12,
      advancement: {purchases: []}
    }, {partial: true});
    expect(migrated).toEqual({xp: 12, advancement: {purchases: []}});
    expect(migrated).not.toHaveProperty("creation");
    expect(migrated).not.toHaveProperty("genre");
  });

  it("creates every declared Item type from its schema defaults", async () => {
    const models = await import("../../src/data/items");
    const constructors = Object.entries(models).filter(([name]) => name.endsWith("DataModel"));

    expect(constructors).toHaveLength(13);
    for (const [, Model] of constructors) {
      expect(() => new (Model as unknown as new () => object)()).not.toThrow();
    }
  });

  it("round-trips every beta.3 candidate Type and Type Ability through the current DataModels", async () => {
    const candidate = JSON.parse(await readFile(
      path.resolve(import.meta.dirname, "../../content/types/candidate-pack.json"),
      "utf8"
    ));
    const {AbilityDataModel, CharacterTypeDataModel} = await import("../../src/data/items");
    for (const document of candidate.abilities) {
      const model = new (AbilityDataModel as unknown as new (source: Record<string, unknown>) => any)(document.system);
      expect(model).toMatchObject({
        slug: document.system.slug,
        tier: 1,
        category: "type",
        activation: document.system.activation,
        cost: document.system.cost
      });
    }
    for (const document of candidate.types) {
      const model = new (CharacterTypeDataModel as unknown as new (source: Record<string, unknown>) => any)(document.system);
      expect(model).toMatchObject({
        slug: document.system.slug,
        poolBonuses: document.system.poolBonuses,
        weaponFamilies: Object.entries(document.system.weaponFamilyUse)
          .filter(([, enabled]) => enabled)
          .map(([family]) => family),
        superhero: document.system.superhero
      });
      expect(model.abilityGrants).toHaveLength(document.system.abilityGrants.length);
    }
  });

  it("round-trips every beta.3 candidate Genre Ability through the existing Ability DataModel", async () => {
    const candidate = JSON.parse(await readFile(
      path.resolve(import.meta.dirname, "../../content/genre-abilities/candidate-pack.json"),
      "utf8"
    ));
    const {AbilityDataModel} = await import("../../src/data/items");
    for (const document of candidate.abilities) {
      const model = new (AbilityDataModel as unknown as new (source: Record<string, unknown>) => any)(document.system);
      expect(model).toMatchObject({
        slug: document.system.slug,
        tier: document.system.tier,
        category: document.system.category,
        activation: document.system.activation,
        cost: document.system.cost,
        roll: document.system.roll,
        damage: document.system.damage,
        range: document.system.range
      });
      expect(model.ruleElements).toEqual([]);
    }
  });

  it("round-trips every beta.3 candidate Species through the current Species DataModel", async () => {
    const candidate = JSON.parse(await readFile(
      path.resolve(import.meta.dirname, "../../content/species/candidate-pack.json"),
      "utf8"
    ));
    const {SpeciesDataModel} = await import("../../src/data/items");
    for (const document of candidate.species) {
      const model = new (SpeciesDataModel as unknown as new (source: Record<string, unknown>) => any)(document.system);
      expect(model).toMatchObject({
        slug: document.system.slug,
        poolBonuses: document.system.poolBonuses,
        woundBonuses: document.system.woundBonuses,
        weaponFamilies: document.system.weaponFamilies,
        cypherLimitBonus: document.system.cypherLimitBonus
      });
      expect(model.skillGrants).toHaveLength(document.system.skillGrants.length);
      expect(model.choiceGroups).toHaveLength(document.system.choiceGroups.length);
      expect(model.descriptorChoiceGroups).toHaveLength(document.system.descriptorChoiceGroups.length);
    }
  });
});
