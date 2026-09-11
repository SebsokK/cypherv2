#!/usr/bin/env node
import path from "node:path";

import {
  createReviewedTypeSource,
  defaultReviewedTypePaths,
  reviewedTypeSummary,
  writeReviewedTypeSource
} from "./reviewed-type-importer.mjs";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const typeDirectory = argument("--types");
const abilityDirectory = argument("--abilities");
if (!typeDirectory || !abilityDirectory) {
  throw new Error("Usage: node scripts/promote-reviewed-types.mjs --types <unpacked-working-types> --abilities <unpacked-working-abilities> [--candidate <candidate-pack.json>] [--output <reviewed-pack.json>]");
}
const paths = defaultReviewedTypePaths();
const output = path.resolve(argument("--output") ?? paths.source);
const source = await createReviewedTypeSource({
  candidatePath: path.resolve(argument("--candidate") ?? paths.candidate),
  typeDirectory: path.resolve(typeDirectory),
  abilityDirectory: path.resolve(abilityDirectory)
});
await writeReviewedTypeSource(source, output);
console.log(`Wrote reviewed Type source: ${output}`);
console.log(JSON.stringify(reviewedTypeSummary(source), null, 2));
