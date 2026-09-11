#!/usr/bin/env node
import path from "node:path";
import {fileURLToPath} from "node:url";

import {defaultGenreAbilityCandidatePath, defaultGenreCandidatePath} from "./genre-candidate-validator.mjs";
import {importGenreReview} from "./genre-review-importer.mjs";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const world = argument("--world");
if (!world) throw new Error("Usage: node scripts/import-genre-review.mjs --world <Foundry World directory> [--candidate <candidate-pack.json>] [--abilities <candidate-pack.json>]");

const result = await importGenreReview({
  candidatePath: path.resolve(argument("--candidate") ?? defaultGenreCandidatePath(projectRoot)),
  abilityCandidatePath: path.resolve(argument("--abilities") ?? defaultGenreAbilityCandidatePath(projectRoot)),
  projectRoot,
  worldDirectory: path.resolve(world)
});

console.log(`Imported ${result.genres} Genres with ${result.relations} private Working relations.`);
console.log(`Round trip: ${result.roundTrip.matches ? "exact after namespace normalization" : "FAILED"}.`);
console.log(`Genres: ${result.destination}`);
if (!result.roundTrip.matches) process.exitCode = 1;
