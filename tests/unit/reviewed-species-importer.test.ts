import {cp, mkdtemp, readFile, readdir, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import {describe, expect, it} from "vitest";

// @ts-expect-error The Foundry CLI package does not publish TypeScript declarations.
import {extractPack} from "@foundryvtt/foundryvtt-cli";

// Developer-only JavaScript modules intentionally remain runnable without a build step.
// @ts-expect-error The Species candidate validator has no runtime TypeScript declaration.
const candidateValidator = await import("../../scripts/species-candidate-validator.mjs");
// @ts-expect-error The reviewed Species importer has no runtime TypeScript declaration.
const importer = await import("../../scripts/reviewed-species-importer.mjs");

const root = path.resolve(import.meta.dirname, "../..");
const [source, candidate, coreSource] = await Promise.all([
  readFile(path.join(root, "content/species/reviewed-pack.json"), "utf8").then(JSON.parse),
  readFile(path.join(root, "content/species/candidate-pack.json"), "utf8").then(JSON.parse),
  readFile(path.join(root, "content/core-items/reviewed-packs.json"), "utf8").then(JSON.parse)
]);
const references = candidateValidator.createSpeciesReferenceCatalogs(coreSource);

async function extractedDocuments() {
  const temporary = await mkdtemp(path.join(tmpdir(), "cypherv2-species-"));
  try {
    const isolatedPack = path.join(temporary, "pack");
    const extracted = path.join(temporary, "documents");
    await cp(path.join(root, "packs/species"), isolatedPack, {recursive: true, filter: (source) => path.basename(source) !== "LOCK"});
    await extractPack(isolatedPack, extracted, {log: false});
    const files = (await readdir(extracted)).filter((file) => file.endsWith(".json"));
    return await Promise.all(files.map((file) => readFile(path.join(extracted, file), "utf8").then(JSON.parse)));
  } finally {
    await rm(temporary, {recursive: true, force: true});
  }
}

function findSpecies(name: string): any {
  return source.species.find((document: any) => document.name === name);
}

describe("Reviewed Species promotion", () => {
  it("validates the exact reviewed inventory and stable candidate identities", () => {
    expect(() => importer.validateReviewedSpeciesSource(source, references)).not.toThrow();
    expect(importer.reviewedSpeciesSummary(source, references)).toEqual({
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
    expect(new Set(source.species.map((entry: {_id: string}) => entry._id)))
      .toEqual(new Set(candidate.species.map((entry: {_id: string}) => entry._id)));
    expect(new Set(source.species.map((entry: {system: {slug: string}}) => entry.system.slug)))
      .toEqual(new Set(candidate.species.map((entry: {system: {slug: string}}) => entry.system.slug)));
  });

  it("preserves the reviewed structured/manual boundary exactly", () => {
    expect(source.species.filter((entry: any) => entry.system.woundBonuses.minor === 1).map((entry: any) => entry.name))
      .toEqual(["Orc", "Drakain", "Prota"]);
    expect(source.species.filter((entry: any) => entry.system.skillGrants.length > 0)).toHaveLength(16);
    expect(source.species.filter((entry: any) => entry.system.choiceGroups.length > 0).map((entry: any) => entry.name)).toEqual(["Naron"]);
    expect(source.species.filter((entry: any) => entry.system.descriptorChoiceGroups.length > 0).map((entry: any) => entry.name)).toEqual(["Human"]);
    expect(source.species.flatMap((entry: any) => entry.system.skillGrants).filter((grant: any) => grant.notes)).toHaveLength(5);
    expect(source.species.every((entry: any) => entry.system.abilityGrants.length === 0 && entry.system.abilityChoiceGroups.length === 0)).toBe(true);
    expect(source.species.every((entry: any) => entry.system.ruleElements.length === 0)).toBe(true);
    expect(findSpecies("Mutant").system.description).toMatch(/tier 1 ability from any focus/i);
    expect(findSpecies("Dwarf").system.description).toMatch(/add \+1 on recoveries/i);
    expect(findSpecies("D’nec").system.description).toMatch(/1 extra point to your Intellect Pool each time you use a recovery/i);
  });

  it("keeps Human dynamic without baking Descriptor documents into Species", () => {
    expect(findSpecies("Human").system.descriptorChoiceGroups).toEqual([{
      id: "f89b20393b460355",
      choose: 1,
      sourceMode: "catalog",
      catalogItemType: "descriptor",
      options: []
    }]);
    expect(JSON.stringify(source.species)).not.toContain("Compendium.cypherv2.descriptors.Item.");
  });

  it("uses only valid public Skill references and no review-only references", () => {
    const serialized = JSON.stringify(source.species);
    expect(serialized).not.toMatch(/Compendium\.world\.|Compendium\.[A-Za-z0-9_.-]*working|cypher-v2-test|staging|candidate/i);
    const grants = source.species.flatMap((entry: any) => [
      ...entry.system.skillGrants,
      ...entry.system.choiceGroups.flatMap((group: any) => group.options)
    ]);
    for (const grant of grants) {
      expect(grant.skillUuid).toMatch(/^Compendium\.cypherv2\.skills\.Item\.[A-Za-z0-9]{16}$/);
      expect(references.skills.has(grant.skillUuid.split(".").at(-1))).toBe(true);
    }
  });

  it("registers, builds, packages, and physically contains the public Species pack", async () => {
    const manifest = JSON.parse(await readFile(path.join(root, "system.json"), "utf8"));
    const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
    const release = await readFile(path.join(root, "scripts/package-release.ps1"), "utf8");
    expect(manifest.packs).toHaveLength(12);
    expect(manifest.packs).toContainEqual({name: "species", label: "Species", path: "packs/species", type: "Item", system: "cypherv2"});
    expect(packageJson.scripts.build).toContain("pnpm import:species");
    expect(packageJson.scripts["import:species"]).toBe("node scripts/import-species.mjs");
    expect(release).toContain('"packs/species"');
    expect(await extractedDocuments()).toHaveLength(20);
  });

  it("round-trips the public pack with zero semantic drift", async () => {
    expect(importer.compareReviewedSpeciesRoundTrip(source, await extractedDocuments())).toEqual({
      speciesMatch: true,
      matches: true,
      ignoredFields: ["_key", "_stats"]
    });
  });

  it("cannot overwrite any beta.2, Type, or World pack destination", () => {
    for (const packId of ["descriptors", "skills", "weapons-and-armors", "types", "type-abilities", "foci", "focus-abilities", "cyphers", "cypher-tables"]) {
      expect(() => importer.assertSpeciesPackDestination(root, path.join(root, "packs", packId))).toThrow(/Refusing/);
    }
    expect(() => importer.assertSpeciesPackDestination(root, path.join(root, "worlds", "species"))).toThrow(/Refusing/);
  });

  it("rejects baked Human options, dangling Skills, duplicate IDs, and speculative automation", () => {
    const baked = structuredClone(source);
    baked.species.find((entry: any) => entry.name === "Human").system.descriptorChoiceGroups[0].options.push({id: "aaaaaaaaaaaaaaaa"});
    expect(() => importer.validateReviewedSpeciesSource(baked, references)).toThrow(/must not freeze|dynamic Descriptor/);
    const dangling = structuredClone(source);
    dangling.species.find((entry: any) => entry.system.skillGrants.length).system.skillGrants[0].skillUuid = "Compendium.cypherv2.skills.Item.aaaaaaaaaaaaaaaa";
    expect(() => importer.validateReviewedSpeciesSource(dangling, references)).toThrow(/missing Skill/);
    const duplicate = structuredClone(source);
    duplicate.species[1]._id = duplicate.species[0]._id;
    duplicate.species[1]._key = duplicate.species[0]._key;
    expect(() => importer.validateReviewedSpeciesSource(duplicate, references)).toThrow(/duplicates Item ID/);
    const automated = structuredClone(source);
    automated.species[0].system.ruleElements.push({key: "Speculative"});
    expect(() => importer.validateReviewedSpeciesSource(automated, references)).toThrow(/ruleElements/);
  });

  it("uses reviewed source—not Candidate, Working, World, or CRD data—as production input", async () => {
    const script = await readFile(path.join(root, "scripts/import-species.mjs"), "utf8");
    expect(script).toContain("readReviewedSpeciesSource");
    expect(script).not.toContain("candidate-pack.json");
    expect(script).not.toMatch(/working|cypher-v2-test|reference document/i);
  });
});
