import {readFile} from "node:fs/promises";

import {describe, expect, it} from "vitest";

// Developer-only JavaScript import tools intentionally remain runnable without a build step.
// @ts-expect-error The candidate validator has no runtime TypeScript declaration.
const candidateValidator = await import("../../scripts/type-candidate-validator.mjs");
// @ts-expect-error The private review importer has no runtime TypeScript declaration.
const reviewImporter = await import("../../scripts/type-review-importer.mjs");

describe("private Type review import", () => {
  it("preserves candidate documents while routing assignments to the Working Ability pack", async () => {
    const candidate = candidateValidator.validateTypeCandidateSource(JSON.parse(await readFile(candidateValidator.defaultTypeCandidatePath(), "utf8")));
    const review = reviewImporter.createTypeReviewDocuments(candidate);

    expect(reviewImporter.validateTypeReviewDocuments(review)).toEqual({types: 49, abilities: 106, assignments: 155});
    expect(review.types.flatMap((type: any) => type.system.abilityGrants)
      .every((grant: any) => grant.abilityUuid.startsWith(reviewImporter.TYPE_ABILITY_REVIEW_PREFIX))).toBe(true);
    expect(reviewImporter.compareTypeReviewRoundTrip(candidate, review)).toEqual({typeMatch: true, abilityMatch: true, matches: true});
  });
});
