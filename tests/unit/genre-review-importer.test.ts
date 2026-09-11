import {readFile} from "node:fs/promises";
import path from "node:path";
import {describe, expect, it} from "vitest";

// @ts-expect-error Developer-only JavaScript tools have no runtime declaration.
const candidateValidator = await import("../../scripts/genre-candidate-validator.mjs");
// @ts-expect-error Developer-only JavaScript tools have no runtime declaration.
const reviewImporter = await import("../../scripts/genre-review-importer.mjs");

const projectRoot = path.resolve(import.meta.dirname, "../..");
const [candidate, abilitySource] = await Promise.all([
  readFile(path.join(projectRoot, "content/genres/candidate-pack.json"), "utf8").then(JSON.parse),
  readFile(path.join(projectRoot, "content/genre-abilities/candidate-pack.json"), "utf8").then(JSON.parse)
]);

describe("private Genre review import", () => {
  it("rewrites only Ability namespaces and round-trips exactly", () => {
    candidateValidator.validateGenreCandidateSource(candidate, abilitySource);
    const review = reviewImporter.createGenreReviewDocuments(candidate, abilitySource);
    expect(reviewImporter.validateGenreReviewDocuments(review, candidate, abilitySource)).toEqual({genres: 4, relations: 115});
    expect(JSON.stringify(review)).toContain("Compendium.world.genre-abilities-working.Item.");
    expect(JSON.stringify(review)).not.toContain("Compendium.cypherv2.genre-abilities.Item.");
    expect(reviewImporter.compareGenreReviewRoundTrip(candidate, review, abilitySource)).toEqual({
      genreMatch: true,
      matches: true,
      ignoredVolatileFields: [],
      normalizedFields: ["system.abilityCatalog[].abilityUuid (Working namespace -> canonical namespace)"]
    });
  });

  it("uses the established World-only Working pack identities", () => {
    expect(reviewImporter.GENRE_REVIEW_PACK_ID).toBe("genres-working");
    expect(reviewImporter.GENRE_REVIEW_LABEL).toBe("Genres (Working)");
    expect(reviewImporter.GENRE_ABILITY_REVIEW_PACK_ID).toBe("genre-abilities-working");
  });

  it("rejects dangling Working Ability references", () => {
    const review = reviewImporter.createGenreReviewDocuments(candidate, abilitySource);
    review[1].system.abilityCatalog[0].abilityUuid = "Compendium.world.genre-abilities-working.Item.aaaaaaaaaaaaaaaa";
    expect(() => reviewImporter.validateGenreReviewDocuments(review, candidate, abilitySource)).toThrow(/dangling/);
  });
});
