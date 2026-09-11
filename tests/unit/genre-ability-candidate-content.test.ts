import {readFile} from "node:fs/promises";
import path from "node:path";
import {describe, expect, it} from "vitest";

// @ts-expect-error Developer-only JavaScript validator has no runtime declaration.
const validator = await import("../../scripts/genre-ability-candidate-validator.mjs");

const projectRoot = path.resolve(import.meta.dirname, "../..");
const candidatePath = path.join(projectRoot, "content/genre-abilities/candidate-pack.json");
const source = JSON.parse(await readFile(candidatePath, "utf8"));

function findAbility(name: string): any {
  return source.abilities.find((document: any) => document.name === name);
}

describe("beta.3 candidate Genre Abilities", () => {
  it("validates the exact 43 progression + 26 Origin inventory", () => {
    expect(() => validator.validateGenreAbilityCandidateSource(source)).not.toThrow();
    expect(source.counts).toEqual({abilities: 69, progression: 43, origin: 26, relations: 74});
    expect(new Set(source.abilities.map((document: any) => document._id)).size).toBe(69);
    expect(new Set(source.abilities.map((document: any) => document.system.slug)).size).toBe(69);
  });

  it("preserves the two intentional Real World Skill choices and their Working identities", () => {
    expect(findAbility("Additional Skill (Tier 3)")).toMatchObject({
      _id: "fREdI45SXu0WPeeS",
      system: {slug: "additional-skill-tier-3", tier: 3, category: "genre-progression", source: {page: "35"}},
      flags: {cypherv2: {genreAbility: {catalog: "progression", genres: ["realWorld"], progressionBand: "mid-tier"}}}
    });
    expect(findAbility("Additional Skill (Tier 6)")).toMatchObject({
      _id: "xXSq03yZHRS978cj",
      system: {slug: "additional-skill-tier-6", tier: 6, category: "genre-progression", source: {page: "35"}},
      flags: {cypherv2: {genreAbility: {catalog: "progression", genres: ["realWorld"], progressionBand: "high-tier"}}}
    });
    expect(source.catalogs.realWorld.entries.map((entry: any) => entry.abilityUuid)).toEqual([
      "Compendium.cypherv2.genre-abilities.Item.fREdI45SXu0WPeeS",
      "Compendium.cypherv2.genre-abilities.Item.xXSq03yZHRS978cj"
    ]);
  });

  it("preserves Fantasy, Science Fiction, shared, and progression-band membership without duplicate documents", () => {
    const summary = validator.genreAbilityCandidateSummary(source);
    expect(summary.progressionMembership).toEqual({
      realWorldOnly: 2, fantasyOnly: 22, scienceFictionOnly: 14, shared: 5, midTier: 24, highTier: 19
    });
    for (const name of ["Cypher Use", "Enhanced Stat", "Exceptional Follower", "Snipe", "Inspire Action"]) {
      expect(source.abilities.filter((document: any) => document.name === name)).toHaveLength(1);
      expect(findAbility(name).flags.cypherv2.genreAbility.genres).toEqual(["fantasy", "scienceFiction"]);
    }
  });

  it("preserves Origin rank and Tier 3 improvement rules without Type whitelists", () => {
    expect(source.catalogs.superhero).toMatchObject({catalog: "origin", eligibility: "genre", typeWhitelist: []});
    expect(findAbility("Armored Body").flags.cypherv2.genreAbility.minimumSuperheroRank).toBe(2);
    for (const name of ["Incredible Instinct", "Skill Exemplar"]) {
      const ability = findAbility(name);
      expect(ability.system.tier).toBe(1);
      expect(ability.flags.cypherv2.genreAbility.catalog).toBe("origin");
      expect(ability.system.description).toMatch(/At tier 3:/i);
      expect(ability.system.tags).toContain("tier-3-improvement");
    }
  });

  it("uses existing cost and activation structures while leaving conditional rules descriptive", () => {
    const summary = validator.genreAbilityCandidateSummary(source);
    expect(summary.structured).toMatchObject({fixedPoolCosts: 27, scalableCosts: 12, multiPoolCosts: 0, damage: 2, range: 6, duration: 14, minimumSuperheroRank: 1});
    expect(findAbility("Elemental Protection").system.cost).toEqual({amount: 4, scalable: true, ignoresEdge: false, allowedPools: ["intellect"]});
    expect(findAbility("A Bit of Magic").system).toMatchObject({cost: {amount: 0, scalable: false, allowedPools: []}, activation: "special", ruleElements: []});
    expect(findAbility("A Bit of Magic").system.tags).toContain("manual-conditional-cost");
    expect(findAbility("Astonishing Teleport").system.activation).toBe("special");
    expect(findAbility("Unbelievable Transformation").system.activation).toBe("lastAction");
    expect(findAbility("Regenerative Healing").system.activation).toBe("perpetual");
  });

  it("keeps all same-name Type/Focus collisions as independently sourced Genre documents", () => {
    expect(source.review.sameNameCollisions).toHaveLength(14);
    expect(source.review.sameNameCollisions.every((entry: any) => entry.reused === false)).toBe(true);
    expect(source.abilities).toHaveLength(69);
  });

  it("rejects count, identity, relation, and review-namespace drift", () => {
    const count = structuredClone(source);
    count.abilities.pop();
    expect(() => validator.validateGenreAbilityCandidateSource(count)).toThrow(/Expected 69/);
    const id = structuredClone(source);
    id.abilities[0]._id = "aaaaaaaaaaaaaaaa";
    id.abilities[0]._key = "!items!aaaaaaaaaaaaaaaa";
    expect(() => validator.validateGenreAbilityCandidateSource(id)).toThrow(/deterministic ID/);
    const dangling = structuredClone(source);
    dangling.catalogs.fantasy.entries[0].abilityUuid = "Compendium.cypherv2.genre-abilities.Item.aaaaaaaaaaaaaaaa";
    expect(() => validator.validateGenreAbilityCandidateSource(dangling)).toThrow(/dangling/);
    const working = structuredClone(source);
    working.review.note = "Compendium.world.genre-abilities-working.Item.aaaaaaaaaaaaaaaa";
    expect(() => validator.validateGenreAbilityCandidateSource(working)).toThrow(/World\/Working reference/);
  });

  it("validates deterministic document and relation IDs on repeated validation", () => {
    const first = structuredClone(source);
    const second = structuredClone(source);
    expect(() => validator.validateGenreAbilityCandidateSource(first)).not.toThrow();
    expect(() => validator.validateGenreAbilityCandidateSource(second)).not.toThrow();
    expect(second).toEqual(first);
  });
});
