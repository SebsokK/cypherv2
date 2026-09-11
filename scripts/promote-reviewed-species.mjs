#!/usr/bin/env node
import {readFile} from "node:fs/promises";
import path from "node:path";

import {createSpeciesReferenceCatalogs} from "./species-candidate-validator.mjs";
import {compareSpeciesReviewRoundTrip} from "./species-review-importer.mjs";
import {
  createReviewedSpeciesSource,
  defaultReviewedSpeciesPaths,
  reviewedSpeciesSummary,
  writeReviewedSpeciesSource
} from "./reviewed-species-importer.mjs";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const speciesDirectory = argument("--species");
if (!speciesDirectory) {
  throw new Error("Usage: node scripts/promote-reviewed-species.mjs --species <unpacked-working-species> [--candidate <candidate-pack.json>] [--reference <reviewed-packs.json>] [--output <reviewed-pack.json>]");
}
const paths = defaultReviewedSpeciesPaths();
const candidatePath = path.resolve(argument("--candidate") ?? paths.candidate);
const referencePath = path.resolve(argument("--reference") ?? paths.reference);
const output = path.resolve(argument("--output") ?? paths.source);
const source = await createReviewedSpeciesSource({candidatePath, speciesDirectory: path.resolve(speciesDirectory), referencePath});
await writeReviewedSpeciesSource(source, output, referencePath);
const [candidate, referenceSource] = await Promise.all([
  readFile(candidatePath, "utf8").then(JSON.parse),
  readFile(referencePath, "utf8").then(JSON.parse)
]);
const references = createSpeciesReferenceCatalogs(referenceSource);
console.log(`Wrote reviewed Species source: ${output}`);
console.log(JSON.stringify({
  candidateComparison: compareSpeciesReviewRoundTrip(candidate, source.species, references),
  summary: reviewedSpeciesSummary(source, references)
}, null, 2));
