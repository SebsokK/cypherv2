#!/usr/bin/env node
import {readFile} from "node:fs/promises";

import {createSpeciesReferenceCatalogs} from "./species-candidate-validator.mjs";
import {
  SPECIES_PACK_ID,
  compileReviewedSpeciesPack,
  defaultReviewedSpeciesPaths,
  readReviewedSpeciesSource,
  reviewedSpeciesSummary,
  writeReviewedSpeciesSources
} from "./reviewed-species-importer.mjs";

const paths = defaultReviewedSpeciesPaths();
const source = await readReviewedSpeciesSource(paths.source, paths.reference);
const generatedSources = await writeReviewedSpeciesSources(source, paths);
await compileReviewedSpeciesPack({projectRoot: paths.projectRoot, sourceDirectory: generatedSources[SPECIES_PACK_ID]});
const references = createSpeciesReferenceCatalogs(JSON.parse(await readFile(paths.reference, "utf8")));
const summary = reviewedSpeciesSummary(source, references);
console.log(`Compiled ${summary.species} reviewed Species Items.`);
console.log(`Canonical reviewed source: ${paths.source}`);
