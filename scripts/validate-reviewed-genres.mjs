#!/usr/bin/env node
import {cp, mkdtemp, readFile, readdir, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";

import {extractPack} from "@foundryvtt/foundryvtt-cli";
import {
  GENRE_ABILITY_PACK_ID,
  GENRE_PACK_ID,
  compareReviewedGenreRoundTrip,
  defaultReviewedGenrePaths,
  readReviewedGenreSources,
  reviewedGenreSummary
} from "./reviewed-genre-importer.mjs";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function extractDocuments(packPath, prefix) {
  const directory = await mkdtemp(path.join(tmpdir(), prefix));
  try {
    const isolatedPack = path.join(directory, "pack");
    const extracted = path.join(directory, "documents");
    await cp(packPath, isolatedPack, {recursive: true, filter: (source) => path.basename(source) !== "LOCK"});
    await extractPack(isolatedPack, extracted, {log: false});
    const files = (await readdir(extracted)).filter((entry) => entry.endsWith(".json"));
    return await Promise.all(files.map((entry) => readFile(path.join(extracted, entry), "utf8").then(JSON.parse)));
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
}

const paths = defaultReviewedGenrePaths();
const packsRoot = path.resolve(argument("--packs-root") ?? path.join(paths.projectRoot, "packs"));
const sources = await readReviewedGenreSources({genrePath: paths.genreSource, abilityPath: paths.abilitySource});
const extracted = {
  genres: await extractDocuments(path.join(packsRoot, GENRE_PACK_ID), "cypherv2-genres-"),
  abilities: await extractDocuments(path.join(packsRoot, GENRE_ABILITY_PACK_ID), "cypherv2-genre-abilities-")
};
const roundTrip = compareReviewedGenreRoundTrip(sources, extracted);
console.log(JSON.stringify({counts: reviewedGenreSummary(sources), roundTrip}, null, 2));
if (!roundTrip.matches) process.exitCode = 1;
