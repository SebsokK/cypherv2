#!/usr/bin/env node
import {readFile, readdir, rm} from "node:fs/promises";
import path from "node:path";

import {extractPack} from "@foundryvtt/foundryvtt-cli";

import {createSpeciesReferenceCatalogs} from "./species-candidate-validator.mjs";
import {
  SPECIES_PACK_ID,
  compareReviewedSpeciesRoundTrip,
  defaultReviewedSpeciesPaths,
  readReviewedSpeciesSource,
  reviewedSpeciesSummary,
  validateReviewedSpeciesSource
} from "./reviewed-species-importer.mjs";

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

const paths = defaultReviewedSpeciesPaths();
const sourcePath = path.resolve(argument("--source") ?? paths.source);
const referencePath = path.resolve(argument("--reference") ?? paths.reference);
const [source, referenceSource] = await Promise.all([
  readReviewedSpeciesSource(sourcePath, referencePath),
  readFile(referencePath, "utf8").then(JSON.parse)
]);
const references = createSpeciesReferenceCatalogs(referenceSource);
validateReviewedSpeciesSource(source, references);
const output = {summary: reviewedSpeciesSummary(source, references)};
const packsRoot = argument("--packs-root");
if (packsRoot) {
  const extractionRoot = path.resolve(paths.projectRoot, ".generated", "reviewed-species-round-trip");
  await rm(extractionRoot, {recursive: true, force: true});
  await extractPack(path.join(path.resolve(packsRoot), SPECIES_PACK_ID), extractionRoot, {log: false});
  const extracted = await readDocuments(extractionRoot);
  validateReviewedSpeciesSource({...source, species: extracted.sort((left, right) => Number(left.sort ?? 0) - Number(right.sort ?? 0))}, references);
  output.publicPacks = {species: extracted.length};
  output.roundTrip = compareReviewedSpeciesRoundTrip(source, extracted);
  if (!output.roundTrip.matches) process.exitCode = 1;
}
console.log(JSON.stringify(output, null, 2));
