import {cp, mkdtemp, readFile, readdir, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import {describe, expect, it} from "vitest";

// @ts-expect-error The Foundry CLI package does not publish TypeScript declarations.
import {extractPack} from "@foundryvtt/foundryvtt-cli";

// Developer-only JavaScript module intentionally remains runnable without a build step.
// @ts-expect-error The reviewed content importer has no runtime TypeScript declaration.
const importer = await import("../../scripts/reviewed-type-importer.mjs");

const root = path.resolve(import.meta.dirname, "../..");
const source = JSON.parse(await readFile(path.join(root, "content/types/reviewed-pack.json"), "utf8"));
const candidate = JSON.parse(await readFile(path.join(root, "content/types/candidate-pack.json"), "utf8"));

function grantsForAbility(name: string) {
  const ability = source.abilities.find((entry: {name: string}) => entry.name === name);
  return source.types.flatMap((type: {name: string; system: {abilityGrants: Array<{abilityUuid: string; id: string; notes: string}>}}) => (
    type.system.abilityGrants
      .filter((grant) => grant.abilityUuid.endsWith(`.${ability._id}`))
      .map((grant) => ({type: type.name, ...grant}))
  ));
}

async function extractedCount(packId: string) {
  const temporary = await mkdtemp(path.join(tmpdir(), `cypherv2-${packId}-`));
  try {
    const isolatedPack = path.join(temporary, "pack");
    const extracted = path.join(temporary, "documents");
    await cp(path.join(root, "packs", packId), isolatedPack, {recursive: true, filter: (source) => path.basename(source) !== "LOCK"});
    await extractPack(isolatedPack, extracted, {log: false});
    return (await readdir(extracted)).filter((file) => file.endsWith(".json")).length;
  } finally {
    await rm(temporary, {recursive: true, force: true});
  }
}

describe("Reviewed Type and Type Ability promotion", () => {
  it("validates the canonical reviewed inventory and stable identities", () => {
    expect(() => importer.validateReviewedTypeSource(source)).not.toThrow();
    expect(importer.reviewedTypeSummary(source)).toEqual({
      types: 49,
      abilities: 106,
      assignments: 155,
      scalableCosts: 25,
      multiPoolCosts: 8,
      assignmentNotes: 9,
      superheroes: 7
    });
    expect(new Set(source.types.map((entry: {_id: string}) => entry._id))).toEqual(new Set(candidate.types.map((entry: {_id: string}) => entry._id)));
    expect(new Set(source.abilities.map((entry: {_id: string}) => entry._id))).toEqual(new Set(candidate.abilities.map((entry: {_id: string}) => entry._id)));
    expect(new Set(source.types.flatMap((entry: {system: {abilityGrants: Array<{id: string}>}}) => entry.system.abilityGrants.map((grant) => grant.id))))
      .toEqual(new Set(candidate.types.flatMap((entry: {system: {abilityGrants: Array<{id: string}>}}) => entry.system.abilityGrants.map((grant) => grant.id))));
  });

  it("resolves all 155 assignments exclusively against the public Type Ability pack", () => {
    const abilityIds = new Set(source.abilities.map((entry: {_id: string}) => entry._id));
    const grants = source.types.flatMap((entry: {system: {abilityGrants: Array<{abilityUuid: string}>}}) => entry.system.abilityGrants);
    expect(grants).toHaveLength(155);
    for (const grant of grants) {
      expect(grant.abilityUuid).toMatch(/^Compendium\.cypherv2\.type-abilities\.Item\.[A-Za-z0-9]{16}$/);
      expect(abilityIds.has(grant.abilityUuid.split(".").at(-1))).toBe(true);
    }
    expect(JSON.stringify(source.types)).not.toMatch(/Compendium\.world\.|Compendium\.[A-Za-z0-9_.-]*working|cypher-v2-test/i);
  });

  it("preserves reviewed same-name assignment decisions and notes", () => {
    expect(grantsForAbility("Inspiring Suggestion").find((entry: {type: string}) => entry.type === "Tender").notes).toMatch(/omits/);
    expect(grantsForAbility("Super Combatant").filter((entry: {notes: string}) => entry.notes)).toHaveLength(5);
    expect(grantsForAbility("Enhanced Energy").find((entry: {type: string}) => entry.type === "Powerhouse").notes).toMatch(/Enabler/);
    expect(grantsForAbility("Expert Combatant").filter((entry: {notes: string}) => entry.notes).map((entry: {type: string}) => entry.type).sort())
      .toEqual(["Heavy", "Soldier"]);
  });

  it("preserves scalable costs and expanded activation metadata", () => {
    const candidateAbilities = new Map(candidate.abilities.map((entry: {_id: string}) => [entry._id, entry]));
    for (const ability of source.abilities) {
      const original = candidateAbilities.get(ability._id) as typeof ability;
      expect(ability.system.cost).toEqual(original.system.cost);
      expect(ability.system.activation).toBe(original.system.activation);
    }
  });

  it("adapts only the three reviewed weapon families to normalized open strings", () => {
    const expected = new Map([["Axe Fighter", "axes"], ["Knife Fighter", "knives"], ["Sword Fighter", "swords"]]);
    for (const type of source.types) {
      expect(type.system).not.toHaveProperty("weaponFamilyUse");
      expect(type.system.weaponFamilies).toEqual(expected.has(type.name) ? [expected.get(type.name)] : []);
    }
  });

  it("preserves Superhero Type metadata without embedding Character allocations", () => {
    const superheroes = source.types.filter((entry: {system: {superhero: {rank: number}}}) => entry.system.superhero.rank > 0);
    expect(Object.fromEntries(superheroes.map((entry: {name: string; system: {superhero: {rank: number; powerShiftCount: number}}}) => (
      [entry.name, [entry.system.superhero.rank, entry.system.superhero.powerShiftCount]]
    )))).toEqual({
      Crimefighter: [1, 2],
      Vigilante: [1, 2],
      "Enhanced Hero": [2, 3],
      Powerstar: [2, 3],
      Superhuman: [3, 4],
      Powerhouse: [4, 5],
      "Living God": [5, 6]
    });
    for (const type of source.types) expect(type.system.instance.selections.powerShifts).toEqual([]);
    for (const type of source.types.filter((entry: {system: {superhero: {rank: number}}}) => entry.system.superhero.rank === 0)) {
      expect(type.system.superhero).toEqual({rank: 0, powerShiftCount: 0, superheroics: {enabled: false, poolBonus: 0}});
    }
  });

  it("registers, builds, packages, and physically contains exactly the two public packs", async () => {
    const manifest = JSON.parse(await readFile(path.join(root, "system.json"), "utf8"));
    const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
    const release = await readFile(path.join(root, "scripts/package-release.ps1"), "utf8");
    expect(manifest.packs).toEqual(expect.arrayContaining([
      {name: "types", label: "Types", path: "packs/types", type: "Item", system: "cypherv2"},
      {name: "type-abilities", label: "Type Abilities", path: "packs/type-abilities", type: "Item", system: "cypherv2"}
    ]));
    expect(packageJson.scripts.build).toContain("pnpm import:types");
    expect(packageJson.scripts["import:types"]).toBe("node scripts/import-types.mjs");
    expect(release).toContain('"packs/types"');
    expect(release).toContain('"packs/type-abilities"');
    expect(await extractedCount("types")).toBe(49);
    expect(await extractedCount("type-abilities")).toBe(106);
  });

  it("cannot write to any existing beta.2 or World pack destination", () => {
    for (const packId of ["descriptors", "skills", "weapons-and-armors", "foci", "focus-abilities", "cyphers", "cypher-tables"]) {
      expect(() => importer.assertTypePackDestination(root, path.join(root, "packs", packId))).toThrow(/Refusing/);
    }
    expect(() => importer.assertTypePackDestination(root, path.join(root, "worlds", "types"))).toThrow(/Refusing/);
  });

  it("rejects stale Working UUIDs, dangling assignments, duplicate IDs, and embedded allocations", () => {
    const stale = structuredClone(source);
    stale.types[0].system.abilityGrants[0].abilityUuid = "Compendium.world.type-abilities-working.Item.aaaaaaaaaaaaaaaa";
    expect(() => importer.validateReviewedTypeSource(stale)).toThrow(/must target/);
    const dangling = structuredClone(source);
    dangling.types[0].system.abilityGrants[0].abilityUuid = "Compendium.cypherv2.type-abilities.Item.aaaaaaaaaaaaaaaa";
    expect(() => importer.validateReviewedTypeSource(dangling)).toThrow(/missing Ability/);
    const duplicate = structuredClone(source);
    duplicate.abilities[1]._id = duplicate.abilities[0]._id;
    expect(() => importer.validateReviewedTypeSource(duplicate)).toThrow(/duplicates Item ID/);
    const allocation = structuredClone(source);
    allocation.types[0].system.instance.selections.powerShifts = ["Strength"];
    expect(() => importer.validateReviewedTypeSource(allocation)).toThrow(/Character-owned/);
  });

  it("keeps reviewed source—not Candidate or Working packs—as the production input", async () => {
    const script = await readFile(path.join(root, "scripts/import-types.mjs"), "utf8");
    expect(script).toContain("readReviewedTypeSource");
    expect(script).not.toContain("candidate-pack.json");
    expect(script).not.toContain("working");
  });
});
