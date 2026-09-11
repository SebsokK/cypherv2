#!/usr/bin/env node
import {readdir, readFile, rm} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {extractPack} from "@foundryvtt/foundryvtt-cli";

import {defaultTypeCandidatePath, readTypeCandidateSource} from "./type-candidate-validator.mjs";
import {
  TYPE_ABILITY_REVIEW_PACK_ID,
  TYPE_REVIEW_PACK_ID,
  compareTypeReviewRoundTrip,
  validateTypeReviewDocuments
} from "./type-review-importer.mjs";

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
if (!world) throw new Error("Usage: node scripts/validate-type-review.mjs --world <Foundry World directory> [--candidate <candidate-pack.json>]");

const worldPath = path.resolve(world);
const candidate = await readTypeCandidateSource(path.resolve(argument("--candidate") ?? defaultTypeCandidatePath(projectRoot)));
const extractionRoot = path.resolve(projectRoot, ".generated", "type-review-round-trip");
await rm(extractionRoot, {recursive: true, force: true});

for (const packId of [TYPE_REVIEW_PACK_ID, TYPE_ABILITY_REVIEW_PACK_ID]) {
  await extractPack(path.join(worldPath, "packs", packId), path.join(extractionRoot, packId), {log: false});
}

const review = {
  types: await readDocuments(path.join(extractionRoot, TYPE_REVIEW_PACK_ID)),
  abilities: await readDocuments(path.join(extractionRoot, TYPE_ABILITY_REVIEW_PACK_ID))
};
const counts = validateTypeReviewDocuments(review);
const roundTrip = compareTypeReviewRoundTrip(candidate, review);
console.log(JSON.stringify({counts, roundTrip}, null, 2));
if (!roundTrip.matches) process.exitCode = 1;
