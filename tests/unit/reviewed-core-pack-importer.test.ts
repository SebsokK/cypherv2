import {readFile} from "node:fs/promises";
import path from "node:path";
import {describe, expect, it} from "vitest";

// Developer-only JavaScript module intentionally remains runnable without a build step.
// @ts-expect-error The reviewed content importer has no runtime TypeScript declaration.
const importer = await import("../../scripts/reviewed-core-pack-importer.mjs");

const projectRoot = path.resolve(import.meta.dirname, "../..");
const source = JSON.parse(await readFile(path.join(projectRoot, "content/core-items/reviewed-packs.json"), "utf8"));

function itemDocuments(packId: string) {
  return source.packs[packId].documents.filter((document: {_key: string}) => document._key.startsWith("!items!"));
}

function allStrings(value: unknown, strings: string[] = []): string[] {
  if (typeof value === "string") strings.push(value);
  else if (Array.isArray(value)) value.forEach((entry) => allStrings(entry, strings));
  else if (value && typeof value === "object") Object.values(value).forEach((entry) => allStrings(entry, strings));
  return strings;
}

describe("reviewed core compendium promotion", () => {
  it("preserves the exact reviewed document inventory and mixed equipment types", () => {
    expect(() => importer.validateReviewedCorePackSource(source)).not.toThrow();
    expect(importer.reviewedCorePackSummary(source)).toEqual({
      packs: {
        descriptors: {documents: 33, items: 33, folders: 0, itemTypes: {descriptor: 33}},
        skills: {documents: 58, items: 58, folders: 0, itemTypes: {skill: 58}},
        "weapons-and-armors": {
          documents: 12,
          items: 10,
          folders: 2,
          itemTypes: {armor: 3, shield: 1, weapon: 6}
        }
      },
      referenceRewrites: {"descriptors->skills": 140}
    });
  });

  it("preserves representative reviewed IDs and the equipment Folder structure", () => {
    expect(itemDocuments("descriptors")).toContainEqual(expect.objectContaining({_id: "C4GJ8Yk8f23DNecp", name: "Brash", type: "descriptor"}));
    expect(itemDocuments("skills")).toContainEqual(expect.objectContaining({_id: "wdihgicI6leWDQsM", name: "Athletics", type: "skill"}));
    expect(itemDocuments("weapons-and-armors")).toContainEqual(expect.objectContaining({_id: "GQW8rVN2wQu4PRjZ", name: "Heavy Melee Weapon", type: "weapon", folder: "oWd3bfXoYcGopdSV"}));
    expect(source.packs["weapons-and-armors"].documents).toContainEqual(expect.objectContaining({_key: "!folders!oWd3bfXoYcGopdSV", name: "Weapons"}));
    expect(source.packs["weapons-and-armors"].documents).toContainEqual(expect.objectContaining({_key: "!folders!XK3VbYKmbd7DOIMt", name: "Armors & Shields"}));
  });

  it("rewrites and resolves every Descriptor-to-Skill reference in structured data and prose", () => {
    const skillIds = new Set(itemDocuments("skills").map((document: {_id: string}) => document._id));
    const references = allStrings(source.packs.descriptors.documents)
      .flatMap((value) => [...value.matchAll(/Compendium\.cypherv2\.skills\.Item\.([A-Za-z0-9]{16})/g)])
      .map((match) => match[1]);
    expect(references).toHaveLength(140);
    expect(references.every((id) => skillIds.has(id))).toBe(true);
    expect(allStrings(source.packs).join("\n")).not.toMatch(/Compendium\.(?:cypher-v2-test|world\.)/);
    expect(allStrings(source.packs).join("\n")).not.toMatch(/@UUID\[Item\.[A-Za-z0-9]{16}\]/);
  });

  it("rejects World dependencies, duplicate keys, and dangling promoted UUIDs", () => {
    const world = structuredClone(source);
    world.packs.descriptors.documents[0].system.description = "@UUID[Compendium.cypher-v2-test.skills.Item.wdihgicI6leWDQsM]";
    expect(() => importer.validateReviewedCorePackSource(world)).toThrow(/World compendium dependency/);

    const duplicate = structuredClone(source);
    duplicate.packs.skills.documents[1]._key = duplicate.packs.skills.documents[0]._key;
    expect(() => importer.validateReviewedCorePackSource(duplicate)).toThrow(/duplicates LevelDB key/);

    const dangling = structuredClone(source);
    dangling.packs.descriptors.documents[0].system.description = "@UUID[Compendium.cypherv2.skills.Item.aaaaaaaaaaaaaaaa]";
    expect(() => importer.validateReviewedCorePackSource(dangling)).toThrow(/unresolved system UUID/);
  });

  it("registers and packages the three generated system packs", async () => {
    const manifest = JSON.parse(await readFile(path.join(projectRoot, "system.json"), "utf8"));
    const packageJson = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8"));
    const releaseScript = await readFile(path.join(projectRoot, "scripts/package-release.ps1"), "utf8");
    for (const packId of ["descriptors", "skills", "weapons-and-armors"]) {
      expect(manifest.packs).toContainEqual(expect.objectContaining({name: packId, path: `packs/${packId}`, type: "Item", system: "cypherv2"}));
      expect(releaseScript).toContain(`"packs/${packId}"`);
    }
    expect(packageJson.scripts["import:core-packs"]).toBe("node scripts/import-core-packs.mjs");
    expect(packageJson.scripts.build).toContain("pnpm import:core-packs");
  });
});
