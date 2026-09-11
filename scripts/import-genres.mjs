#!/usr/bin/env node
import {
  compileReviewedGenrePacks,
  defaultReviewedGenrePaths,
  readReviewedGenreSources,
  reviewedGenreSummary,
  writeReviewedGenrePackSources
} from "./reviewed-genre-importer.mjs";

const paths = defaultReviewedGenrePaths();
const sources = await readReviewedGenreSources({genrePath: paths.genreSource, abilityPath: paths.abilitySource});
const generatedSources = await writeReviewedGenrePackSources(sources, paths);
await compileReviewedGenrePacks({projectRoot: paths.projectRoot, sources: generatedSources});
const summary = reviewedGenreSummary(sources);
console.log(`Compiled ${summary.genres} reviewed Genre Items.`);
console.log(`Compiled ${summary.abilities} reviewed Genre Ability Items (${summary.progression} progression, ${summary.origin} origin).`);
console.log(`Relations: ${summary.relations}.`);
console.log(`Canonical reviewed sources: ${paths.genreSource}; ${paths.abilitySource}`);
