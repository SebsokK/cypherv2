import {describe, expect, it} from "vitest";

import {
  BUILT_IN_WEAPON_FAMILIES,
  legacyWeaponFamilyFlags,
  normalizeWeaponFamilies,
  normalizeWeaponFamily,
  weaponFamilyLabel
} from "../../src/combat/weapon-family";
import {collectPackageDerivedData} from "../../src/packages/package-derived";
import type {CharacterPackageItemLike} from "../../src/packages/package-types";

function typeWithFamilies(system: Record<string, unknown>): CharacterPackageItemLike {
  return {
    id: "type-1",
    name: "Family Fighter",
    type: "characterType",
    system: {
      poolBonuses: {might: 0, speed: 0, intellect: 0},
      woundBonuses: {minor: 0, moderate: 0, major: 0},
      edgeGrant: {mode: "none", pool: "none", amount: 0},
      weaponUse: {light: false, medium: false, heavy: false},
      armorUse: {light: false, medium: false, heavy: false},
      abilityGrants: [], abilityChoiceGroups: [], skillGrants: [], choiceGroups: [],
      genre: "none", customGenreId: "", backgroundOptions: "", equipmentNotes: "", equipmentBundleUuid: "",
      instance: {sourceUuid: "Item.type-1", instanceId: "instance-1", role: "primary", attachedAt: 1, selections: {edgePool: "none", skillChoices: []}},
      description: "",
      ...system
    }
  } as unknown as CharacterPackageItemLike;
}

describe("extensible Weapon families", () => {
  it.each([
    ["Axes", "axes"],
    [" AXES ", "axes"],
    ["Energy Blades", "energy-blades"],
    ["Énergy--Blades", "energy-blades"],
    ["Armes à feu", "armes-a-feu"],
    ["光線剣", "光線剣"],
    ["none", ""],
    ["", ""]
  ])("normalizes %j to %j", (input, expected) => {
    expect(normalizeWeaponFamily(input)).toBe(expected);
  });

  it("deduplicates normalized family collections while preserving stable order", () => {
    expect(normalizeWeaponFamilies(["Axes", " axes ", "Energy Blades", "Knives"]))
      .toEqual(["axes", "energy-blades", "knives"]);
    expect(normalizeWeaponFamilies("Axes, Energy Blades; Swords\nKnives"))
      .toEqual(["axes", "energy-blades", "swords", "knives"]);
  });

  it("keeps axes, knives, and swords as suggestions rather than a closed taxonomy", () => {
    expect(BUILT_IN_WEAPON_FAMILIES).toEqual(["axes", "knives", "swords"]);
    expect(weaponFamilyLabel("energy-blades")).toBe("Energy Blades");
    expect(normalizeWeaponFamily("Firearms")).toBe("firearms");
  });

  it.each(["axes", "knives", "swords"])("reads the legacy %s Type flag", (family) => {
    expect(legacyWeaponFamilyFlags({axes: family === "axes", knives: family === "knives", swords: family === "swords"}))
      .toEqual([family]);
  });

  it("combines manual, extensible Type, and legacy Type families", () => {
    const derived = collectPackageDerivedData([
      typeWithFamilies({weaponFamilies: ["Energy Blades"]}),
      typeWithFamilies({weaponFamilyUse: {axes: true, knives: false, swords: true}})
    ], [], [], [], ["FIREARMS"]);
    expect(derived.weaponFamilies).toEqual(["firearms", "energy-blades", "axes", "swords"]);
  });
});
