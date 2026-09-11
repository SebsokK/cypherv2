import {readFile} from "node:fs/promises";
import path from "node:path";
import {describe, expect, it} from "vitest";

// Developer-only JavaScript review tools intentionally remain runnable without a build step.
// @ts-expect-error The Species candidate validator has no runtime TypeScript declaration.
const candidateValidator = await import("../../scripts/species-candidate-validator.mjs");
// @ts-expect-error The private Species review importer has no runtime TypeScript declaration.
const reviewImporter = await import("../../scripts/species-review-importer.mjs");

const projectRoot = path.resolve(import.meta.dirname, "../..");
const [candidate, coreSource] = await Promise.all([
  readFile(path.join(projectRoot, "content/species/candidate-pack.json"), "utf8").then(JSON.parse),
  readFile(path.join(projectRoot, "content/core-items/reviewed-packs.json"), "utf8").then(JSON.parse)
]);
const references = candidateValidator.createSpeciesReferenceCatalogs(coreSource);

describe("private Species review import", () => {
  it("preserves all candidate documents without rewriting valid public UUIDs", () => {
    const review = reviewImporter.createSpeciesReviewDocuments(candidate, references);
    expect(reviewImporter.validateSpeciesReviewDocuments(review, references)).toEqual({species: 20});
    expect(reviewImporter.compareSpeciesReviewRoundTrip(candidate, review, references)).toEqual({speciesMatch: true, matches: true});
    expect(review).toEqual(candidate.species);
    expect(JSON.stringify(review)).toContain("Compendium.cypherv2.skills.Item.");
    expect(review.find((document: any) => document.name === "Human")?.system.descriptorChoiceGroups[0]).toMatchObject({
      sourceMode: "catalog", catalogItemType: "descriptor", options: []
    });
    expect(JSON.stringify(review)).not.toContain("Compendium.cypherv2.descriptors.Item.");
    expect(JSON.stringify(review)).not.toMatch(/Compendium\.world\./);
  });

  it("uses the established World-only Working pack identity", () => {
    expect(reviewImporter.SPECIES_REVIEW_PACK_ID).toBe("species-working");
    expect(reviewImporter.SPECIES_REVIEW_LABEL).toBe("Species (Working)");
  });
});
