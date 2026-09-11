import {readFile} from "node:fs/promises";
import path from "node:path";
import {describe, expect, it} from "vitest";

// @ts-expect-error Developer-only JavaScript tools have no runtime declaration.
const candidateValidator = await import("../../scripts/genre-ability-candidate-validator.mjs");
// @ts-expect-error Developer-only JavaScript tools have no runtime declaration.
const reviewImporter = await import("../../scripts/genre-ability-review-importer.mjs");

const projectRoot = path.resolve(import.meta.dirname, "../..");
const candidate = JSON.parse(await readFile(path.join(projectRoot, "content/genre-abilities/candidate-pack.json"), "utf8"));

describe("private Genre Ability review import", () => {
  it("preserves all 69 candidate documents with an exact semantic round trip", () => {
    candidateValidator.validateGenreAbilityCandidateSource(candidate);
    const review = reviewImporter.createGenreAbilityReviewDocuments(candidate);
    expect(reviewImporter.validateGenreAbilityReviewDocuments(review)).toEqual({abilities: 69, progression: 43, origin: 26});
    expect(reviewImporter.compareGenreAbilityReviewRoundTrip(candidate, review)).toEqual({abilityMatch: true, matches: true, ignoredVolatileFields: []});
    expect(review).toEqual(candidate.abilities);
  });

  it("uses the established private World-only Working pack identity", () => {
    expect(reviewImporter.GENRE_ABILITY_REVIEW_PACK_ID).toBe("genre-abilities-working");
    expect(reviewImporter.GENRE_ABILITY_REVIEW_LABEL).toBe("Genre Abilities (Working)");
  });
});
