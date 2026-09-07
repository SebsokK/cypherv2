#!/usr/bin/env node
import {
  compileReviewedCorePacks,
  defaultReviewedCorePackPaths,
  readReviewedCorePackSource,
  reviewedCorePackSummary,
  writeReviewedCorePackSources
} from "./reviewed-core-pack-importer.mjs";

const paths = defaultReviewedCorePackPaths();
const source = await readReviewedCorePackSource(paths.source);
const generatedSources = await writeReviewedCorePackSources(source, paths);
await compileReviewedCorePacks({projectRoot: paths.projectRoot, sources: generatedSources});

const summary = reviewedCorePackSummary(source);
for (const [packId, pack] of Object.entries(summary.packs)) {
  console.log(`Compiled ${pack.items} reviewed Items and ${pack.folders} Folders into ${packId}.`);
}
console.log(`Canonical reviewed source: ${paths.source}`);
