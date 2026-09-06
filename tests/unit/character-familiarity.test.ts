import {describe, expect, it} from "vitest";

import {
  parseFamiliarityActionData,
  toggleManualFamiliarity,
  toggledFamiliarityCategories,
  type FamiliarityActorLike
} from "../../src/applications/sheets/character-familiarity";
import {collectPackageDerivedData} from "../../src/packages/package-derived";
import type {CharacterPackageItemLike} from "../../src/packages/package-types";

function actor(): FamiliarityActorLike & {updates: Record<string, unknown>[]} {
  const result = {
    system: {
      stats: {
        might: {value: 11}, speed: {value: 12}, intellect: {value: 13}
      },
      proficiencies: {weaponCategories: [] as string[], armorCategories: [] as string[]}
    },
    updates: [] as Record<string, unknown>[],
    async update(changes: Record<string, unknown>): Promise<unknown> {
      this.updates.push(changes);
      if (changes["system.proficiencies.weaponCategories"]) {
        this.system.proficiencies.weaponCategories = changes["system.proficiencies.weaponCategories"] as string[];
      }
      if (changes["system.proficiencies.armorCategories"]) {
        this.system.proficiencies.armorCategories = changes["system.proficiencies.armorCategories"] as string[];
      }
      return this;
    }
  };
  return result;
}

function warrior(): CharacterPackageItemLike {
  return {
    id: "warrior",
    name: "Warrior",
    type: "characterType",
    system: {
      poolBonuses: {might: 0, speed: 0, intellect: 0},
      woundBonuses: {minor: 0, moderate: 0, major: 0},
      edgeGrant: {mode: "fixed", pool: "none", amount: 0},
      weaponUse: {light: false, medium: true, heavy: false},
      armorUse: {light: true, medium: false, heavy: false},
      abilityGrants: [], abilityChoiceGroups: [], skillGrants: [], choiceGroups: [],
      genre: "none", customGenreId: "", backgroundOptions: "", equipmentNotes: "", equipmentBundleUuid: "",
      instance: {sourceUuid: "Item.warrior", instanceId: "warrior-instance", role: "primary", attachedAt: 1, selections: {edgePool: "none", skillChoices: []}},
      description: ""
    }
  } as unknown as CharacterPackageItemLike;
}

describe("Character familiarity Settings actions", () => {
  it.each(["light", "medium", "heavy"] as const)("toggles manual Weapon %s familiarity", async (category) => {
    const character = actor();
    await toggleManualFamiliarity(character, "weapon", category);
    expect(character.system.proficiencies.weaponCategories).toContain(category);
    await toggleManualFamiliarity(character, "weapon", category);
    expect(character.system.proficiencies.weaponCategories).not.toContain(category);
  });

  it.each(["light", "medium", "heavy"] as const)("toggles manual Armor %s familiarity", async (category) => {
    const character = actor();
    await toggleManualFamiliarity(character, "armor", category);
    expect(character.system.proficiencies.armorCategories).toContain(category);
  });

  it("updates only familiarity and leaves every Pool value numeric and unchanged", async () => {
    const character = actor();
    const before = structuredClone(character.system.stats);
    await toggleManualFamiliarity(character, "weapon", "medium");
    expect(character.updates).toEqual([{"system.proficiencies.weaponCategories": ["medium"]}]);
    expect(character.system.stats).toEqual(before);
    for (const pool of Object.values(character.system.stats)) expect(typeof pool.value).toBe("number");
  });

  it("keeps package familiarity effective independently of the manual contribution", () => {
    const granted = collectPackageDerivedData([warrior()], [], []);
    expect(granted.weaponCategories).toEqual(["medium"]);
    expect(granted.armorCategories).toEqual(["light"]);
    const removed = collectPackageDerivedData([], [], []);
    expect(removed.weaponCategories).toEqual([]);
    expect(removed.armorCategories).toEqual([]);
    expect(toggledFamiliarityCategories([], "heavy")).toEqual(["heavy"]);
  });

  it("parses only supported button families and categories", () => {
    expect(parseFamiliarityActionData({family: "weapon", category: "light"})).toEqual({family: "weapon", category: "light"});
    expect(parseFamiliarityActionData({family: "armor", category: "heavy"})).toEqual({family: "armor", category: "heavy"});
    expect(() => parseFamiliarityActionData({family: "weapon", category: "plate"})).toThrow();
    expect(() => parseFamiliarityActionData({family: "skill", category: "light"})).toThrow();
  });
});
