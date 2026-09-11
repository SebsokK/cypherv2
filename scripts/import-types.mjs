#!/usr/bin/env node
import {
  compileReviewedTypePacks,
  defaultReviewedTypePaths,
  readReviewedTypeSource,
  reviewedTypeSummary,
  writeReviewedTypeSources
} from "./reviewed-type-importer.mjs";

const paths = defaultReviewedTypePaths();
const source = await readReviewedTypeSource(paths.source);
const generatedSources = await writeReviewedTypeSources(source, paths);
await compileReviewedTypePacks({projectRoot: paths.projectRoot, sources: generatedSources});
const summary = reviewedTypeSummary(source);
console.log(`Compiled ${summary.types} reviewed Type Items.`);
console.log(`Compiled ${summary.abilities} reviewed Type Ability Items.`);
console.log(`Assignments: ${summary.assignments}.`);
console.log(`Canonical reviewed source: ${paths.source}`);
