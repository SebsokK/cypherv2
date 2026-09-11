import {readFile} from "node:fs/promises";
import path from "node:path";
import {describe, expect, it} from "vitest";

// Developer-only JavaScript validator intentionally remains runnable without a build step.
// @ts-expect-error The candidate validator has no runtime TypeScript declaration.
const validator = await import("../../scripts/type-candidate-validator.mjs");

const projectRoot = path.resolve(import.meta.dirname, "../..");
const source = JSON.parse(await readFile(path.join(projectRoot, "content/types/candidate-pack.json"), "utf8"));

function findType(name: string): any {
  return source.types.find((document: any) => document.name === name);
}

function findAbility(name: string): any {
  return source.abilities.find((document: any) => document.name === name);
}

describe("beta.3 candidate Types and Type Abilities", () => {
  it("validates the exact reviewed inventory", () => {
    expect(() => validator.validateTypeCandidateSource(source)).not.toThrow();
    expect(validator.typeCandidateSummary(source)).toEqual({
      types: 49,
      abilities: 106,
      assignments: 155,
      scalableCosts: 25,
      multiPoolCosts: 8,
      assignmentNotes: 9,
      superheroes: 7
    });
  });

  it("uses stable Item and assignment identities with only resolvable system UUIDs", () => {
    const abilityIds = new Set(source.abilities.map((document: any) => document._id));
    const itemIds = [...source.types, ...source.abilities].map((document: any) => document._id);
    const assignmentIds = source.types.flatMap((document: any) => document.system.abilityGrants.map((grant: any) => grant.id));
    expect(new Set(itemIds).size).toBe(itemIds.length);
    expect(new Set(assignmentIds).size).toBe(155);
    expect(itemIds.every((id: string) => /^[A-Za-z0-9]{16}$/.test(id))).toBe(true);
    expect(assignmentIds.every((id: string) => /^[A-Za-z0-9]{16}$/.test(id))).toBe(true);
    for (const type of source.types) {
      for (const grant of type.system.abilityGrants) {
        const match = grant.abilityUuid.match(/^Compendium\.cypherv2\.type-abilities\.Item\.([A-Za-z0-9]{16})$/);
        expect(match).not.toBeNull();
        expect(abilityIds.has(match[1])).toBe(true);
      }
    }
    expect(JSON.stringify(source)).not.toMatch(/Compendium\.(?:world\.|cypher-v2-test\.)/i);
    expect(JSON.stringify(source)).not.toMatch(/Compendium\.[A-Za-z0-9_.-]*working/i);
  });

  it("serializes CRD scalable and multiple-Pool costs without automating unusual effects", () => {
    expect(findAbility("Frenzy").system.cost).toEqual({
      amount: 1,
      scalable: true,
      ignoresEdge: false,
      allowedPools: ["intellect"]
    });
    expect(findAbility("Successive Attack").system.cost).toEqual({
      amount: 2,
      scalable: false,
      ignoresEdge: false,
      allowedPools: ["might", "speed"]
    });
    expect(findAbility("Open Inner Eye").system.tags).toContain("manual-additional-cost");
    expect(findAbility("Open Inner Eye").system.description).toMatch(/minor wound/i);
    expect(source.abilities.every((document: any) => document.system.roll === "none" && document.system.ruleElements.length === 0)).toBe(true);
  });

  it("preserves every supported CRD activation distinction in candidate metadata", () => {
    const activations = new Set(source.abilities.map((document: any) => document.system.activation));
    expect(activations).toEqual(new Set(["action", "firstAction", "lastAction", "enabler", "passive", "special", "timed"]));
    expect(findAbility("Inspiring Suggestion").system.activation).toBe("firstAction");
    expect(findAbility("Enhanced Energy").system.activation).toBe("enabler");
    expect(findAbility("Always Tinkering").system.activation).toBe("timed");
  });

  it("preserves same-name wording differences as assignment-level notes", () => {
    const note = (typeName: string, abilityName: string) => findType(typeName).system.abilityGrants
      .find((grant: any) => grant.snapshot.name === abilityName)?.notes;
    expect(note("Tender", "Inspiring Suggestion")).toMatch(/next turn/i);
    expect(note("Soldier", "Expert Combatant")).toMatch(/spacecraft weapons/i);
    expect(note("Heavy", "Expert Combatant")).toMatch(/pistols and rifles/i);
    expect(note("Crimefighter", "Super Combatant")).toMatch(/eye lasers/i);
    expect(note("Vigilante", "Super Combatant")).toMatch(/unarmed/i);
    expect(note("Powerhouse", "Enhanced Energy")).toMatch(/omits the Enabler/i);
    expect(source.abilities.filter((document: any) => ["Inspiring Suggestion", "Super Combatant", "Enhanced Energy"].includes(document.name))).toHaveLength(3);
  });

  it("represents all seven Superhero Types without fake Origin Ability options", () => {
    const expected = {
      Crimefighter: [1, 2, 0], Vigilante: [1, 2, 0], "Enhanced Hero": [2, 3, 2],
      Powerstar: [2, 3, 2], Superhuman: [3, 4, 4], Powerhouse: [4, 5, 6],
      "Living God": [5, 6, 8]
    } as const;
    for (const [name, [rank, powerShiftCount, poolBonus]] of Object.entries(expected)) {
      expect(findType(name).system).toMatchObject({
        genre: "superhero",
        superhero: {rank, powerShiftCount, superheroics: {enabled: true, poolBonus}},
        abilityChoiceGroups: []
      });
    }
    expect(source.types.flatMap((document: any) => document.system.abilityGrants).some((grant: any) => /origin/i.test(grant.snapshot.name))).toBe(false);
  });

  it("captures weapon-family familiarity as the narrow axes/knives/swords extension", () => {
    expect(findType("Axe Fighter").system.weaponFamilyUse).toEqual({axes: true, knives: false, swords: false});
    expect(findType("Knife Fighter").system.weaponFamilyUse).toEqual({axes: false, knives: true, swords: false});
    expect(findType("Sword Fighter").system.weaponFamilyUse).toEqual({axes: false, knives: false, swords: true});
    expect(findType("Fighter").system.weaponFamilyUse).toEqual({axes: false, knives: false, swords: false});
  });

  it("rejects count drift, duplicate documents, invalid assignment notes, and dangling UUIDs", () => {
    const countDrift = structuredClone(source);
    countDrift.types.pop();
    expect(() => validator.validateTypeCandidateSource(countDrift)).toThrow(/Expected 49 Types/);

    const duplicate = structuredClone(source);
    duplicate.abilities[1]._id = duplicate.abilities[0]._id;
    duplicate.abilities[1]._key = duplicate.abilities[0]._key;
    expect(() => validator.validateTypeCandidateSource(duplicate)).toThrow(/duplicate _id/);

    const notes = structuredClone(source);
    notes.types[0].system.abilityGrants[0].notes = null;
    expect(() => validator.validateTypeCandidateSource(notes)).toThrow(/notes must be a string/);

    const dangling = structuredClone(source);
    dangling.types[0].system.abilityGrants[0].abilityUuid = "Compendium.cypherv2.type-abilities.Item.aaaaaaaaaaaaaaaa";
    expect(() => validator.validateTypeCandidateSource(dangling)).toThrow(/targets missing Ability/);
  });
});
