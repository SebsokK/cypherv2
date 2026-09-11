import {execFile} from "node:child_process";
import {readFile, stat} from "node:fs/promises";
import path from "node:path";
import {promisify} from "node:util";
import {describe, expect, it} from "vitest";

// @ts-expect-error Developer-only JavaScript module intentionally has no declaration file.
const importer = await import("../../scripts/reviewed-genre-importer.mjs");
const execFileAsync = promisify(execFile);

const root = path.resolve(import.meta.dirname, "../..");
const [genres, abilities, candidateGenres, candidateAbilities] = await Promise.all([
  readFile(path.join(root, "content/genres/reviewed-pack.json"), "utf8").then(JSON.parse),
  readFile(path.join(root, "content/genre-abilities/reviewed-pack.json"), "utf8").then(JSON.parse),
  readFile(path.join(root, "content/genres/candidate-pack.json"), "utf8").then(JSON.parse),
  readFile(path.join(root, "content/genre-abilities/candidate-pack.json"), "utf8").then(JSON.parse)
]);
const sources = {genres, abilities};

function genre(name: string): any {
  return genres.genres.find((entry: any) => entry.name === name);
}

describe("Reviewed Genre and Genre Ability promotion", () => {
  it("validates reviewed counts, stable identities, and the approved Working payload", () => {
    expect(() => importer.validateReviewedGenreSource(genres, abilities)).not.toThrow();
    expect(importer.reviewedGenreSummary(sources)).toEqual({genres: 4, abilities: 69, progression: 43, origin: 26, relations: 115});
    expect(genres.genres.map((entry: any) => [entry.name, entry._id])).toEqual([
      ["The Real World", "ed82d7be559e5bf8"],
      ["Fantasy", "964ba40da91df8bc"],
      ["Science Fiction", "ede94ba279072596"],
      ["Superheroes", "d130fc72b7866db1"]
    ]);
    expect(new Set(abilities.abilities.map((entry: any) => entry._id))).toEqual(new Set(candidateAbilities.abilities.map((entry: any) => entry._id)));
    expect(new Set(genres.genres.map((entry: any) => entry._id))).toEqual(new Set(candidateGenres.genres.map((entry: any) => entry._id)));
  });

  it("preserves both Real World Ability identities and its exact two relations", () => {
    const tier3 = abilities.abilities.find((entry: any) => entry.name === "Additional Skill (Tier 3)");
    const tier6 = abilities.abilities.find((entry: any) => entry.name === "Additional Skill (Tier 6)");
    expect(tier3).toMatchObject({_id: "fREdI45SXu0WPeeS", system: {slug: "additional-skill-tier-3", tier: 3}});
    expect(tier6).toMatchObject({_id: "xXSq03yZHRS978cj", system: {slug: "additional-skill-tier-6", tier: 6}});
    expect(genre("The Real World").system.abilityCatalog.map((entry: any) => [entry.abilityUuid, entry.minimumTier, entry.catalog])).toEqual([
      ["Compendium.cypherv2.genre-abilities.Item.fREdI45SXu0WPeeS", 3, "progression"],
      ["Compendium.cypherv2.genre-abilities.Item.xXSq03yZHRS978cj", 6, "progression"]
    ]);
  });

  it("preserves Fantasy, Science Fiction, and Superheroes relation architecture", () => {
    const fantasy = genre("Fantasy").system.abilityCatalog;
    const scienceFiction = genre("Science Fiction").system.abilityCatalog;
    const superheroes = genre("Superheroes").system.abilityCatalog;
    expect(fantasy.filter((entry: any) => entry.catalog === "progression")).toHaveLength(27);
    expect(fantasy.filter((entry: any) => entry.minimumTier === 3)).toHaveLength(16);
    expect(fantasy.filter((entry: any) => entry.minimumTier === 6)).toHaveLength(11);
    expect(scienceFiction.filter((entry: any) => entry.catalog === "progression")).toHaveLength(19);
    expect(scienceFiction.filter((entry: any) => entry.minimumTier === 3)).toHaveLength(11);
    expect(scienceFiction.filter((entry: any) => entry.minimumTier === 6)).toHaveLength(8);
    expect(superheroes.filter((entry: any) => entry.catalog === "progression")).toHaveLength(41);
    expect(superheroes.filter((entry: any) => entry.catalog === "origin")).toHaveLength(26);
    const union = new Set([...fantasy, ...scienceFiction].map((entry: any) => entry.abilityUuid));
    expect(union.size).toBe(41);
    expect(new Set(superheroes.filter((entry: any) => entry.catalog === "progression").map((entry: any) => entry.abilityUuid))).toEqual(union);
  });

  it("keeps shared progression documents unique and Origin Genre-wide", () => {
    for (const name of ["Cypher Use", "Enhanced Stat", "Exceptional Follower", "Snipe", "Inspire Action"]) {
      expect(abilities.abilities.filter((entry: any) => entry.name === name && entry.flags.cypherv2.genreAbility.catalog === "progression")).toHaveLength(1);
    }
    expect(JSON.stringify(sources)).not.toMatch(/typeWhitelist/i);
    expect(genre("Superheroes").system.options.totalEffortCapMode).toBe("unlimited");
  });

  it("preserves Origin rank and Tier 3 improvement metadata", () => {
    const superheroes = genre("Superheroes").system.abilityCatalog;
    expect(superheroes.find((entry: any) => entry.snapshot.name === "Armored Body")).toMatchObject({catalog: "origin", minimumSuperheroRank: 2});
    for (const name of ["Incredible Instinct", "Skill Exemplar"]) {
      const ability = abilities.abilities.find((entry: any) => entry.name === name);
      expect(ability.system.tags).toContain("tier-3-improvement");
      expect(ability.system.description).toMatch(/At tier 3:/i);
    }
  });

  it("resolves all public references without World, Working, test, or staging namespaces", () => {
    const abilityIds = new Set(abilities.abilities.map((entry: any) => entry._id));
    const relations = genres.genres.flatMap((entry: any) => entry.system.abilityCatalog);
    expect(relations).toHaveLength(115);
    for (const relation of relations) {
      expect(relation.abilityUuid).toMatch(/^Compendium\.cypherv2\.genre-abilities\.Item\.[A-Za-z0-9]{16}$/);
      expect(abilityIds.has(relation.abilityUuid.split(".").at(-1))).toBe(true);
    }
    expect(JSON.stringify(sources)).not.toMatch(/Compendium\.world\.|Compendium\.[A-Za-z0-9_.-]*working|Compendium\.[A-Za-z0-9_.-]*(?:test|staging)/i);
  });

  it("registers, builds, packages, and physically contains both public packs", async () => {
    const [manifest, packageJson, release, publicGenrePack, publicAbilityPack] = await Promise.all([
      readFile(path.join(root, "system.json"), "utf8").then(JSON.parse),
      readFile(path.join(root, "package.json"), "utf8").then(JSON.parse),
      readFile(path.join(root, "scripts/package-release.ps1"), "utf8"),
      stat(path.join(root, "packs/genres")),
      stat(path.join(root, "packs/genre-abilities"))
    ]);
    expect(manifest.packs).toHaveLength(12);
    expect(manifest.packs).toEqual(expect.arrayContaining([
      {name: "genres", label: "Genres", path: "packs/genres", type: "Item", system: "cypherv2"},
      {name: "genre-abilities", label: "Genre Abilities", path: "packs/genre-abilities", type: "Item", system: "cypherv2"}
    ]));
    expect(packageJson.scripts.build).toContain("pnpm import:genres");
    expect(packageJson.scripts["import:genres"]).toBe("node scripts/import-genres.mjs");
    expect(release).toContain('"packs/genres"');
    expect(release).toContain('"packs/genre-abilities"');
    expect(publicGenrePack.isDirectory()).toBe(true);
    expect(publicAbilityPack.isDirectory()).toBe(true);
  });

  it("round-trips both public packs with only Foundry metadata ignored", async () => {
    const {stdout} = await execFileAsync(process.execPath, ["scripts/validate-reviewed-genres.mjs", "--packs-root", "packs"], {cwd: root});
    expect(JSON.parse(stdout)).toMatchObject({
      counts: {genres: 4, abilities: 69, progression: 43, origin: 26, relations: 115},
      roundTrip: {genreMatch: true, abilityMatch: true, matches: true, ignoredFields: ["_key", "_stats"]}
    });
  });

  it("protects unrelated pack destinations and rejects stale or dangling references", () => {
    for (const packId of ["descriptors", "skills", "weapons-and-armors", "types", "type-abilities", "species", "foci", "focus-abilities", "cyphers", "cypher-tables"]) {
      expect(() => importer.assertGenrePackDestination(root, path.join(root, "packs", packId))).toThrow(/Refusing/);
    }
    const stale = structuredClone(genres);
    stale.genres[0].system.abilityCatalog[0].abilityUuid = "Compendium.world.genre-abilities-working.Item.fREdI45SXu0WPeeS";
    expect(() => importer.validateReviewedGenreSource(stale, abilities)).toThrow(/dangling|World|Working/);
    const dangling = structuredClone(genres);
    dangling.genres[0].system.abilityCatalog[0].abilityUuid = "Compendium.cypherv2.genre-abilities.Item.aaaaaaaaaaaaaaaa";
    expect(() => importer.validateReviewedGenreSource(dangling, abilities)).toThrow(/dangling/);
  });

  it("uses reviewed sources rather than Candidate or Working data in production", async () => {
    const script = await readFile(path.join(root, "scripts/import-genres.mjs"), "utf8");
    expect(script).toContain("readReviewedGenreSources");
    expect(script).not.toContain("candidate-pack.json");
    expect(script).not.toMatch(/working|cypher-v2-test/i);
  });
});
