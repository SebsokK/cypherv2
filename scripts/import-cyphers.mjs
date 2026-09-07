#!/usr/bin/env node
import {
  compileCypherPacks,
  defaultCypherImportPaths,
  generateCypherImport,
  readCypherImportSource,
  writeCypherImport
} from "./cypher-importer.mjs";

const paths = defaultCypherImportPaths();
const source = await readCypherImportSource(paths.source);
const generated = generateCypherImport(source);
const generatedSources = await writeCypherImport(generated, paths);
await compileCypherPacks({projectRoot: paths.projectRoot, sources: generatedSources});

console.log(`Generated ${generated.cypherDocuments.length} Cypher Items.`);
console.log(`Generated ${generated.tableDocuments.length} Cypher RollTables.`);
console.log(`Review issues: ${generated.report.summary.reviewIssues}.`);
console.log(`Review report: ${paths.reportRoot}`);
