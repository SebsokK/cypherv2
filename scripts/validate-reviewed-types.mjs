#!/usr/bin/env node
import {readFile, readdir, rm} from "node:fs/promises";
import path from "node:path";

import {extractPack} from "@foundryvtt/foundryvtt-cli";

import {
  TYPE_ABILITY_PACK_ID,
  TYPE_PACK_ID,
  compareReviewedTypeRoundTrip,
  defaultReviewedTypePaths,
  readReviewedTypeSource,
  reviewedTypeSummary,
  validateReviewedTypeSource
} from "./reviewed-type-importer.mjs";

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

const paths = defaultReviewedTypePaths();
const source = await readReviewedTypeSource(path.resolve(argument("--source") ?? paths.source));
validateReviewedTypeSource(source);
const output = {summary: reviewedTypeSummary(source)};
const packsRoot = argument("--packs-root");
if (packsRoot) {
  const extractionRoot = path.resolve(paths.projectRoot, ".generated", "reviewed-type-round-trip");
  await rm(extractionRoot, {recursive: true, force: true});
  for (const packId of [TYPE_PACK_ID, TYPE_ABILITY_PACK_ID]) {
    await extractPack(path.join(path.resolve(packsRoot), packId), path.join(extractionRoot, packId), {log: false});
  }
  const extracted = {
    types: await readDocuments(path.join(extractionRoot, TYPE_PACK_ID)),
    abilities: await readDocuments(path.join(extractionRoot, TYPE_ABILITY_PACK_ID))
  };
  output.publicPacks = {types: extracted.types.length, abilities: extracted.abilities.length};
  output.roundTrip = compareReviewedTypeRoundTrip(source, extracted);
  if (!output.roundTrip.matches) process.exitCode = 1;
}
console.log(JSON.stringify(output, null, 2));
