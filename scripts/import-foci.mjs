#!/usr/bin/env node
import {
  compileFocusPacks,
} from "./focus-importer.mjs";
import {
  defaultReviewedFocusPaths,
  readReviewedFocusSource,
  reviewedFocusSummary,
  writeReviewedFocusSources
} from "./reviewed-focus-importer.mjs";

const paths = defaultReviewedFocusPaths();
const source = await readReviewedFocusSource(paths.source);
const generatedSources = await writeReviewedFocusSources(source, paths);
await compileFocusPacks({projectRoot: paths.projectRoot, sources: generatedSources});

const summary = reviewedFocusSummary(source);
console.log(`Compiled ${summary.foci} reviewed Focus Items.`);
console.log(`Compiled ${summary.abilities} reviewed Focus Ability Items.`);
console.log(`Graph: ${summary.nodes} nodes and ${summary.connections} connections.`);
console.log(`Canonical reviewed source: ${paths.source}`);
