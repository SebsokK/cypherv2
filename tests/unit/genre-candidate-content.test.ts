import {readFile} from "node:fs/promises";
import path from "node:path";
import {describe, expect, it} from "vitest";

// @ts-expect-error Developer-only JavaScript validator has no runtime declaration.
const validator = await import("../../scripts/genre-candidate-validator.mjs");

const projectRoot = path.resolve(import.meta.dirname, "../..");
const [source, abilitySource, manifest] = await Promise.all([
  readFile(path.join(projectRoot, "content/genres/candidate-pack.json"), "utf8").then(JSON.parse),
  readFile(path.join(projectRoot, "content/genre-abilities/candidate-pack.json"), "utf8").then(JSON.parse),
  readFile(path.join(projectRoot, "system.json"), "utf8").then(JSON.parse)
]);

function genre(name: string): any {
  return source.genres.find((document: any) => document.name === name);
}

describe("beta.3 candidate Genres", () => {
  it("validates the exact four chapter-level CRD Genres and deterministic identities", () => {
    expect(() => validator.validateGenreCandidateSource(source, abilitySource)).not.toThrow();
    expect(source.inventory.map((entry: any) => entry.heading)).toEqual([
      "The Real World Genre", "Fantasy Genre", "Science Fiction Genre", "Superheroes Genre"
    ]);
    expect(source.genres.map((document: any) => document.name)).toEqual([
      "The Real World", "Fantasy", "Science Fiction", "Superheroes"
    ]);
    expect(new Set(source.genres.map((document: any) => document._id)).size).toBe(4);
    expect(new Set(source.genres.map((document: any) => document.system.slug)).size).toBe(4);
    const copy = structuredClone(source);
    expect(() => validator.validateGenreCandidateSource(copy, abilitySource)).not.toThrow();
    expect(copy).toEqual(source);
  });

  it("keeps subgenres as guidance rather than competing Genre Items", () => {
    expect(source.inventory.find((entry: any) => entry.key === "fantasy").subgenres).toEqual([
      "Dungeon Fantasy", "Swords & Sorcery", "Epic Fantasy"
    ]);
    expect(source.inventory.find((entry: any) => entry.key === "scienceFiction").subgenres).toEqual([
      "Hard Science Fiction", "Space Opera", "Postapocalypse"
    ]);
    expect(source.genres).toHaveLength(4);
    expect(source.genres.some((document: any) => document.name === "Postapocalypse")).toBe(false);
  });

  it("preserves the Fantasy and Science Fiction mid/high progression catalogs", () => {
    const fantasy = genre("Fantasy").system.abilityCatalog;
    const scienceFiction = genre("Science Fiction").system.abilityCatalog;
    expect(fantasy.filter((entry: any) => entry.minimumTier === 3)).toHaveLength(16);
    expect(fantasy.filter((entry: any) => entry.minimumTier === 6)).toHaveLength(11);
    expect(scienceFiction.filter((entry: any) => entry.minimumTier === 3)).toHaveLength(11);
    expect(scienceFiction.filter((entry: any) => entry.minimumTier === 6)).toHaveLength(8);
    expect([...fantasy, ...scienceFiction].every((entry: any) => entry.catalog === "progression")).toBe(true);
  });

  it("references both intentional Real World Skill progression documents", () => {
    const realWorld = genre("The Real World").system.abilityCatalog;
    expect(realWorld).toHaveLength(2);
    expect(realWorld.map((entry: any) => [entry.snapshot.name, entry.minimumTier])).toEqual([
      ["Additional Skill (Tier 3)", 3],
      ["Additional Skill (Tier 6)", 6]
    ]);
    expect(realWorld.map((entry: any) => entry.abilityUuid)).toEqual([
      "Compendium.cypherv2.genre-abilities.Item.fREdI45SXu0WPeeS",
      "Compendium.cypherv2.genre-abilities.Item.xXSq03yZHRS978cj"
    ]);
  });

  it("gives Superheroes the shared progression union and 26 Genre-wide Origin choices", () => {
    const catalog = genre("Superheroes").system.abilityCatalog;
    const progression = catalog.filter((entry: any) => entry.catalog === "progression");
    const origin = catalog.filter((entry: any) => entry.catalog === "origin");
    expect(progression).toHaveLength(41);
    expect(new Set(progression.map((entry: any) => entry.abilityUuid)).size).toBe(41);
    expect(origin).toHaveLength(26);
    expect(origin.find((entry: any) => entry.snapshot.name === "Armored Body")).toMatchObject({minimumSuperheroRank: 2});
    expect(JSON.stringify(source)).not.toMatch(/typeWhitelist/i);
    expect(genre("Superheroes").system.options.totalEffortCapMode).toBe("unlimited");
  });

  it("preserves shared Fantasy/Science Fiction documents and leaves no dangling relation", () => {
    const fantasy = genre("Fantasy").system.abilityCatalog;
    const scienceFiction = genre("Science Fiction").system.abilityCatalog;
    const sharedNames = ["Cypher Use", "Enhanced Stat", "Exceptional Follower", "Snipe", "Inspire Action"];
    for (const name of sharedNames) {
      const fantasyEntry = fantasy.find((entry: any) => entry.snapshot.name === name);
      const scienceEntry = scienceFiction.find((entry: any) => entry.snapshot.name === name);
      expect(fantasyEntry.abilityUuid).toBe(scienceEntry.abilityUuid);
      expect(fantasyEntry.id).not.toBe(scienceEntry.id);
    }
    expect(source.counts).toEqual({genres: 4, progressionRelations: 89, originRelations: 26, catalogRelations: 115});
  });

  it("keeps unsupported Genre rules as CRD rich-text guidance without speculative automation", () => {
    expect(genre("The Real World").system.abilityCatalog).toHaveLength(2);
    expect(genre("The Real World").system.description).toContain("At tier 3");
    expect(genre("Fantasy").system.description).toContain("Dungeon Fantasy");
    expect(genre("Science Fiction").system.description).toContain("Postapocalypse");
    expect(genre("Superheroes").system.description).toContain("Origin Superhero Ability");
    expect(source.genres.every((document: any) => document.system.ruleElements.length === 0)).toBe(true);
  });

  it("contains only canonical public pack UUIDs and registers the approved public packs", () => {
    expect(JSON.stringify(source)).not.toMatch(/Compendium\.(?:world\.|cypher-v2-test\.)/i);
    expect(JSON.stringify(source)).not.toContain("genre-abilities-working");
    expect(manifest.packs).toHaveLength(12);
    expect(manifest.packs).toEqual(expect.arrayContaining([
      {name: "genres", label: "Genres", path: "packs/genres", type: "Item", system: "cypherv2"},
      {name: "genre-abilities", label: "Genre Abilities", path: "packs/genre-abilities", type: "Item", system: "cypherv2"}
    ]));
  });
});
