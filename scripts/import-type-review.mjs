#!/usr/bin/env node
import path from "node:path";
import {fileURLToPath} from "node:url";

import {defaultTypeCandidatePath} from "./type-candidate-validator.mjs";
import {importTypeReview} from "./type-review-importer.mjs";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const world = argument("--world");
if (!world) throw new Error("Usage: node scripts/import-type-review.mjs --world <Foundry World directory> [--candidate <candidate-pack.json>]");

const result = await importTypeReview({
  candidatePath: path.resolve(argument("--candidate") ?? defaultTypeCandidatePath(projectRoot)),
  projectRoot,
  worldDirectory: path.resolve(world)
});

console.log(`Imported ${result.types} Types and ${result.abilities} Type Abilities for private review.`);
console.log(`Validated ${result.assignments} Type-to-Ability assignments.`);
console.log(`Round trip: ${result.roundTrip.matches ? "exact (after expected Working UUID namespace reversal)" : "FAILED"}.`);
console.log(`Types: ${result.destinations["types-working"]}`);
console.log(`Type Abilities: ${result.destinations["type-abilities-working"]}`);

if (!result.roundTrip.matches) process.exitCode = 1;
