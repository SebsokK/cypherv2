#!/usr/bin/env node
import path from "node:path";

import {
  createReviewedGenreSources,
  defaultReviewedGenrePaths,
  reviewedGenreSummary,
  writeReviewedGenreSources
} from "./reviewed-genre-importer.mjs";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const genreDirectory = argument("--genres");
const abilityDirectory = argument("--abilities");
if (!genreDirectory || !abilityDirectory) throw new Error("Usage: node scripts/promote-reviewed-genres.mjs --genres <unpacked-working-genres> --abilities <unpacked-working-abilities> [--candidate <candidate-pack.json>] [--ability-candidate <candidate-pack.json>] [--genre-output <reviewed-pack.json>] [--ability-output <reviewed-pack.json>]");
const paths = defaultReviewedGenrePaths();
const sources = await createReviewedGenreSources({
  candidatePath: path.resolve(argument("--candidate") ?? paths.candidate),
  abilityCandidatePath: path.resolve(argument("--ability-candidate") ?? paths.abilityCandidate),
  genreDirectory: path.resolve(genreDirectory),
  abilityDirectory: path.resolve(abilityDirectory)
});
const outputPaths = {
  genrePath: path.resolve(argument("--genre-output") ?? paths.genreSource),
  abilityPath: path.resolve(argument("--ability-output") ?? paths.abilitySource)
};
await writeReviewedGenreSources(sources, outputPaths);
console.log(`Wrote reviewed Genre source: ${outputPaths.genrePath}`);
console.log(`Wrote reviewed Genre Ability source: ${outputPaths.abilityPath}`);
console.log(JSON.stringify(reviewedGenreSummary(sources), null, 2));
