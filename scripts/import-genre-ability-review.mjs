#!/usr/bin/env node
import path from "node:path";
import {fileURLToPath} from "node:url";

import {defaultGenreAbilityCandidatePath} from "./genre-ability-candidate-validator.mjs";
import {importGenreAbilityReview} from "./genre-ability-review-importer.mjs";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const world = argument("--world");
if (!world) throw new Error("Usage: node scripts/import-genre-ability-review.mjs --world <Foundry World directory> [--candidate <candidate-pack.json>]");

const result = await importGenreAbilityReview({
  candidatePath: path.resolve(argument("--candidate") ?? defaultGenreAbilityCandidatePath(projectRoot)),
  projectRoot,
  worldDirectory: path.resolve(world)
});

console.log(`Imported ${result.abilities} Genre Abilities for private review (${result.progression} progression, ${result.origin} origin).`);
console.log(`Round trip: ${result.roundTrip.matches ? "exact" : "FAILED"}.`);
console.log(`Genre Abilities: ${result.destination}`);
if (!result.roundTrip.matches) process.exitCode = 1;
