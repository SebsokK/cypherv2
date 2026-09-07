#!/usr/bin/env node
import path from "node:path";

import {
  createReviewedCorePackSource,
  defaultReviewedCorePackPaths,
  reviewedCorePackSummary,
  writeReviewedCorePackSource
} from "./reviewed-core-pack-importer.mjs";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const descriptors = argument("--descriptors");
const skills = argument("--skills");
const weaponsAndArmors = argument("--weapons-and-armors");
if (!descriptors || !skills || !weaponsAndArmors) {
  throw new Error("Usage: node scripts/promote-reviewed-core-packs.mjs --descriptors <dir> --skills <dir> --weapons-and-armors <dir> [--output <reviewed-packs.json>]");
}

const paths = defaultReviewedCorePackPaths();
const output = path.resolve(argument("--output") ?? paths.source);
const source = await createReviewedCorePackSource({
  directories: {
    descriptors: path.resolve(descriptors),
    skills: path.resolve(skills),
    "weapons-and-armors": path.resolve(weaponsAndArmors)
  }
});
await writeReviewedCorePackSource(source, output);

const summary = reviewedCorePackSummary(source);
console.log(`Wrote reviewed core compendium source: ${output}`);
for (const [packId, pack] of Object.entries(summary.packs)) {
  console.log(`${packId}: ${pack.items} Items, ${pack.folders} Folders (${pack.documents} documents).`);
}
for (const [route, count] of Object.entries(summary.referenceRewrites)) console.log(`${route}: ${count} UUID references rewritten.`);
