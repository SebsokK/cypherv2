#!/usr/bin/env node
import {readdir, readFile, rm} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {extractPack} from "@foundryvtt/foundryvtt-cli";
import {defaultGenreAbilityCandidatePath, defaultGenreCandidatePath, validateGenreCandidateSource} from "./genre-candidate-validator.mjs";
import {GENRE_REVIEW_PACK_ID, compareGenreReviewRoundTrip, validateGenreReviewDocuments} from "./genre-review-importer.mjs";

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
if (!world) throw new Error("Usage: node scripts/validate-genre-review.mjs --world <Foundry World directory> [--candidate <candidate-pack.json>] [--abilities <candidate-pack.json>]");

const [candidate, abilitySource] = await Promise.all([
  readFile(path.resolve(argument("--candidate") ?? defaultGenreCandidatePath(projectRoot)), "utf8").then(JSON.parse),
  readFile(path.resolve(argument("--abilities") ?? defaultGenreAbilityCandidatePath(projectRoot)), "utf8").then(JSON.parse)
]);
validateGenreCandidateSource(candidate, abilitySource);
const extractionRoot = path.resolve(projectRoot, ".generated", "genre-review-round-trip");
await rm(extractionRoot, {recursive: true, force: true});
await extractPack(path.join(path.resolve(world), "packs", GENRE_REVIEW_PACK_ID), extractionRoot, {log: false});
const review = await readDocuments(extractionRoot);
const counts = validateGenreReviewDocuments(review, candidate, abilitySource);
const roundTrip = compareGenreReviewRoundTrip(candidate, review, abilitySource);
console.log(JSON.stringify({counts, roundTrip}, null, 2));
if (!roundTrip.matches) process.exitCode = 1;
