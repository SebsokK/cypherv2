import {readFile} from "node:fs/promises";
import path from "node:path";
import {describe, expect, it} from "vitest";

// Developer-only JavaScript validators intentionally remain runnable without a build step.
// @ts-expect-error The Species candidate validator has no runtime TypeScript declaration.
const validator = await import("../../scripts/species-candidate-validator.mjs");

const projectRoot = path.resolve(import.meta.dirname, "../..");
const [source, coreSource] = await Promise.all([
  readFile(path.join(projectRoot, "content/species/candidate-pack.json"), "utf8").then(JSON.parse),
  readFile(path.join(projectRoot, "content/core-items/reviewed-packs.json"), "utf8").then(JSON.parse)
]);
const references = validator.createSpeciesReferenceCatalogs(coreSource);

function findSpecies(name: string): any {
  return source.species.find((document: any) => document.name === name);
}

describe("beta.3 candidate Species", () => {
  it("validates the exact 20-Species CRD inventory and structured feature usage", () => {
    expect(() => validator.validateSpeciesCandidateSource(source, references)).not.toThrow();
    expect(source.inventory).toEqual({
      fantasy: ["Dragonfolk", "Dwarf", "Elf", "Gnome", "Halfling", "Hellborn", "Human", "Orc"],
      scienceFiction: ["Aarak", "Cyborg", "Delph", "D’nec", "Drakain", "Human", "Mutant", "Naron", "Prota", "Rigellian", "Stelan", "Vendeer", "Zantari"]
    });
    expect(validator.speciesCandidateSummary(source, references)).toEqual({
      species: 20,
      structuredFeatures: {
        poolBonuses: 0,
        woundBonuses: 3,
        cypherLimit: 0,
        edge: 0,
        weaponCategories: 0,
        weaponFamilies: 0,
        armor: 0,
        fixedSkills: 16,
        skillChoices: 1,
        fixedAbilities: 0,
        abilityChoices: 0,
        fixedDescriptors: 0,
        descriptorChoices: 1
      },
      contextualSkillNotes: 5,
      embeddedDescriptorOptions: 0,
      existingAbilityReuse: 0
    });
  });

  it("uses deterministic unique Item and grant identities with public references only", () => {
    expect(findSpecies("Dragonfolk")._id).toBe("f042637bbdd2b4c4");
    expect(findSpecies("Human")._id).toBe("691ca370329e2fd4");
    expect(findSpecies("Zantari")._id).toBe("39042b8995c8359a");
    const ids = source.species.map((document: any) => document._id);
    const slugs = source.species.map((document: any) => document.system.slug);
    expect(new Set(ids).size).toBe(20);
    expect(new Set(slugs).size).toBe(20);
    expect(ids.every((id: string) => /^[A-Za-z0-9]{16}$/.test(id))).toBe(true);
    expect(JSON.stringify(source)).not.toMatch(/Compendium\.(?:world\.|cypher-v2-test\.)/i);
    expect(JSON.stringify(source)).not.toMatch(/Compendium\.[A-Za-z0-9_.-]*working/i);
  });

  it("represents Human as one Species with one dynamic all-Descriptors catalog choice", () => {
    expect(source.species.filter((document: any) => document.name === "Human")).toHaveLength(1);
    const [group] = findSpecies("Human").system.descriptorChoiceGroups;
    expect(group).toEqual({
      id: "f89b20393b460355",
      choose: 1,
      sourceMode: "catalog",
      catalogItemType: "descriptor",
      options: []
    });
    expect(JSON.stringify(group)).not.toContain("Compendium.cypherv2.descriptors.Item.");
  });

  it("keeps Mutant, Dwarf, and D’nec exceptional recovery/Ability rules manual", () => {
    expect(findSpecies("Mutant").system).toMatchObject({abilityGrants: [], abilityChoiceGroups: [], ruleElements: []});
    expect(findSpecies("Mutant").system.description).toMatch(/tier 1 ability from any focus/i);
    expect(findSpecies("Dwarf").system.description).toMatch(/add \+1 on recoveries/i);
    expect(findSpecies("Dwarf").system).not.toHaveProperty("recoveryBonus");
    expect(findSpecies("D’nec").system.description).toMatch(/1 extra point to your Intellect Pool each time you use a recovery/i);
    expect(findSpecies("D’nec").system).not.toHaveProperty("recoveryPoolBonuses");
  });

  it("preserves contextual Skill restrictions on canonical shared Skill grants", () => {
    expect(findSpecies("Dragonfolk").system.skillGrants[0]).toMatchObject({
      skillUuid: "Compendium.cypherv2.skills.Item.TxjNz86eOB6UwTGb",
      notes: "<p>Except against other dragonfolk and dragons.</p>"
    });
    expect(findSpecies("Dwarf").system.skillGrants[0].notes).toMatch(/underground or in mountainous areas/i);
    expect(findSpecies("Elf").system.skillGrants[0].notes).toMatch(/forested areas/i);
    expect(findSpecies("Drakain").system.skillGrants[0].notes).toMatch(/other drakain/i);
    const naron = findSpecies("Naron");
    expect(naron.system.choiceGroups[0].options.map((option: any) => option.snapshot.name)).toEqual(["Charm", "Deception"]);
    expect(naron.system.skillGrants[0].snapshot.name).toBe("Recognizing Motive");
  });

  it("uses Wound capacity only for the three exact one-more-minor-wound rules", () => {
    const withWoundBonus = source.species.filter((document: any) => document.system.woundBonuses.minor === 1).map((document: any) => document.name);
    expect(withWoundBonus).toEqual(["Orc", "Drakain", "Prota"]);
    expect(source.species.every((document: any) => document.system.weaponFamilies.length === 0)).toBe(true);
  });

  it("rejects count drift, duplicate identities, dangling references, and speculative automation", () => {
    const countDrift = structuredClone(source);
    countDrift.species.pop();
    expect(() => validator.validateSpeciesCandidateSource(countDrift, references)).toThrow(/Expected 20 Species/);

    const duplicate = structuredClone(source);
    duplicate.species[1]._id = duplicate.species[0]._id;
    duplicate.species[1]._key = duplicate.species[0]._key;
    expect(() => validator.validateSpeciesCandidateSource(duplicate, references)).toThrow(/Species IDs must be unique/);

    const dangling = structuredClone(source);
    dangling.species[0].system.skillGrants[0].skillUuid = "Compendium.cypherv2.skills.Item.aaaaaaaaaaaaaaaa";
    expect(() => validator.validateSpeciesCandidateSource(dangling, references)).toThrow(/targets missing Skill/);

    const automated = structuredClone(source);
    automated.species[0].system.ruleElements.push({key: "Speculative"});
    expect(() => validator.validateSpeciesCandidateSource(automated, references)).toThrow(/speculative ruleElements/);
  });
});
