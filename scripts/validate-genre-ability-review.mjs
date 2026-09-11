#!/usr/bin/env node
import {readdir, readFile, rm} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {extractPack} from "@foundryvtt/foundryvtt-cli";
import {defaultGenreAbilityCandidatePath, validateGenreAbilityCandidateSource} from "./genre-ability-candidate-validator.mjs";
import {
  GENRE_ABILITY_REVIEW_PACK_ID,
  compareGenreAbilityReviewRoundTrip,
  validateGenreAbilityReviewDocuments
} from "./genre-ability-review-importer.mjs";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function readDocuments(directory) {
  const entries = await readdir(directory, {recursive: true, withFileTypes: true});
  const documents = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const parent = entry.parentPath ?? entry.path;
    documents.push(JSON.parse(await readFile(path.join(parent, entry.name), "utf8")));
  }
  return documents;
}

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const world = argument("--world");
if (!world) throw new Error("Usage: node scripts/validate-genre-ability-review.mjs --world <Foundry World directory> [--candidate <candidate-pack.json>]");

const candidate = JSON.parse(await readFile(path.resolve(argument("--candidate") ?? defaultGenreAbilityCandidatePath(projectRoot)), "utf8"));
validateGenreAbilityCandidateSource(candidate);
const extractionRoot = path.resolve(projectRoot, ".generated", "genre-ability-review-round-trip");
await rm(extractionRoot, {recursive: true, force: true});
await extractPack(path.join(path.resolve(world), "packs", GENRE_ABILITY_REVIEW_PACK_ID), extractionRoot, {log: false});
const review = await readDocuments(extractionRoot);
const counts = validateGenreAbilityReviewDocuments(review);
const roundTrip = compareGenreAbilityReviewRoundTrip(candidate, review);
console.log(JSON.stringify({counts, roundTrip}, null, 2));
if (!roundTrip.matches) process.exitCode = 1;
