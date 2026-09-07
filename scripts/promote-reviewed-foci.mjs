#!/usr/bin/env node
import path from "node:path";

import {
  createReviewedFocusSource,
  defaultReviewedFocusPaths,
  reviewedFocusSummary,
  writeReviewedFocusSource
} from "./reviewed-focus-importer.mjs";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const focusDirectory = argument("--foci");
const abilityDirectory = argument("--abilities");
if (!focusDirectory || !abilityDirectory) {
  throw new Error("Usage: node scripts/promote-reviewed-foci.mjs --foci <unpacked-focus-directory> --abilities <unpacked-ability-directory> [--output <reviewed-pack.json>]");
}

const paths = defaultReviewedFocusPaths();
const output = path.resolve(argument("--output") ?? paths.source);
const source = await createReviewedFocusSource({
  focusDirectory: path.resolve(focusDirectory),
  abilityDirectory: path.resolve(abilityDirectory)
});
await writeReviewedFocusSource(source, output);

const summary = reviewedFocusSummary(source);
console.log(`Wrote reviewed Focus source: ${output}`);
console.log(`Foci: ${summary.foci}; Abilities: ${summary.abilities}; Nodes: ${summary.nodes}; Connections: ${summary.connections}.`);
console.log(`Unreferenced Ability documents retained: ${summary.unreferencedAbilities.length}.`);
