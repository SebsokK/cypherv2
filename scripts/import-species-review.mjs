#!/usr/bin/env node
import path from "node:path";
import {fileURLToPath} from "node:url";

import {
  defaultSpeciesCandidatePath,
  defaultSpeciesReferencePath
} from "./species-candidate-validator.mjs";
import {importSpeciesReview} from "./species-review-importer.mjs";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const world = argument("--world");
if (!world) throw new Error("Usage: node scripts/import-species-review.mjs --world <Foundry World directory> [--candidate <candidate-pack.json>]");

const result = await importSpeciesReview({
  candidatePath: path.resolve(argument("--candidate") ?? defaultSpeciesCandidatePath(projectRoot)),
  referencePath: defaultSpeciesReferencePath(projectRoot),
  projectRoot,
  worldDirectory: path.resolve(world)
});

console.log(`Imported ${result.species} Species for private review.`);
console.log(`Round trip: ${result.roundTrip.matches ? "exact" : "FAILED"}.`);
console.log(`Species: ${result.destination}`);
if (!result.roundTrip.matches) process.exitCode = 1;
