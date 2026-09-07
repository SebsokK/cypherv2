import {createHash} from "node:crypto";
import {mkdir, readFile, readdir, rm, writeFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

export const CYPHER_IMPORT_SCHEMA_VERSION = 1;
export const CYPHER_PACK_ID = "cyphers";
export const CYPHER_TABLE_PACK_ID = "cypher-tables";
export const CYPHER_CATEGORIES = ["standard", "manifest", "power-boost"];
export const CYPHER_MANIFESTATIONS = ["subtle", "manifest"];
export const CYPHER_POWERS = ["low", "medium", "advanced", "high", "ultra"];
export const REVIEW_STATUSES = ["verified", "manual-review", "ambiguous"];
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SYSTEM_SCHEMA_VERSION = 1;

export class CypherImportValidationError extends Error {
  constructor(errors) {
    super(`Cypher import source is invalid:\n${errors.map((entry) => `- ${entry}`).join("\n")}`);
    this.name = "CypherImportValidationError";
    this.errors = errors;
  }
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireString(value, location, errors, {slug = false, allowBlank = false} = {}) {
  if (typeof value !== "string" || (!allowBlank && !value.trim())) {
    errors.push(`${location} must be a${allowBlank ? "" : " non-blank"} string.`);
    return;
  }
  if (slug && !SLUG_PATTERN.test(value)) errors.push(`${location} must be a lower-case kebab-case stable ID.`);
}

function validateReview(value, note, location, errors) {
  if (!REVIEW_STATUSES.includes(value)) errors.push(`${location}.reviewStatus must be one of ${REVIEW_STATUSES.join(", ")}.`);
  if (value !== "verified" && !String(note ?? "").trim()) errors.push(`${location}.reviewNote is required when reviewStatus is '${value}'.`);
}

function validateReviewIssue(issue, location, errors) {
  if (!isObject(issue)) {
    errors.push(`${location} must be an object.`);
    return;
  }
  requireString(issue.issueType, `${location}.issueType`, errors, {slug: true});
  validateReview(issue.reviewStatus, issue.note, location, errors);
  requireString(issue.note, `${location}.note`, errors);
}

function validateCypher(cypher, index, errors) {
  const location = `cyphers[${index}]`;
  if (!isObject(cypher)) {
    errors.push(`${location} must be an object.`);
    return;
  }
  requireString(cypher.id, `${location}.id`, errors, {slug: true});
  requireString(cypher.name, `${location}.name`, errors);
  if (!CYPHER_CATEGORIES.includes(cypher.category)) errors.push(`${location}.category is invalid.`);
  if (!CYPHER_MANIFESTATIONS.includes(cypher.manifestation)) errors.push(`${location}.manifestation is invalid.`);
  if (cypher.category === "manifest" && cypher.manifestation !== "manifest") errors.push(`${location} manifest Cyphers must use manifestation 'manifest'.`);
  if (cypher.category !== "manifest" && cypher.manifestation !== "subtle") errors.push(`${location} non-manifest Cyphers must use manifestation 'subtle'.`);
  if (cypher.category === "manifest") {
    if (!CYPHER_POWERS.includes(cypher.power)) errors.push(`${location}.power is required for manifest Cyphers.`);
  } else if (cypher.power !== null) errors.push(`${location}.power must be null when the source has no manifest power classification.`);
  if (typeof cypher.levelOverride !== "boolean") errors.push(`${location}.levelOverride must be boolean.`);
  if (cypher.levelOverride) {
    if (!Number.isInteger(cypher.level) || cypher.level < 1) errors.push(`${location}.level must be an integer of at least 1 when overridden.`);
  } else if (cypher.level !== null) errors.push(`${location}.level must be null unless levelOverride is true.`);
  requireString(cypher.form, `${location}.form`, errors, {allowBlank: true});
  requireString(cypher.description, `${location}.description`, errors);
  requireString(cypher.sourcePage, `${location}.sourcePage`, errors);
  if (!Number.isInteger(cypher.sourceOrder) || cypher.sourceOrder < 1) errors.push(`${location}.sourceOrder must be a positive integer.`);
  if (typeof cypher.nonstandard !== "boolean") errors.push(`${location}.nonstandard must be boolean.`);
  validateReview(cypher.reviewStatus, cypher.reviewNote, location, errors);
}

function validateRange(range, location, errors) {
  if (!Array.isArray(range) || range.length !== 2 || !range.every(Number.isInteger)) {
    errors.push(`${location} must contain two integers.`);
    return;
  }
  if (range[0] < 1 || range[1] > 100 || range[0] > range[1]) errors.push(`${location} must be within 1-100 and ordered.`);
}

function validateTable(table, index, cypherIds, tableIds, errors) {
  const location = `tables[${index}]`;
  if (!isObject(table)) {
    errors.push(`${location} must be an object.`);
    return;
  }
  requireString(table.id, `${location}.id`, errors, {slug: true});
  requireString(table.name, `${location}.name`, errors);
  requireString(table.sourcePage, `${location}.sourcePage`, errors);
  if (table.formula !== "1d100") errors.push(`${location}.formula must be '1d100'.`);
  if (!Array.isArray(table.results) || table.results.length === 0) {
    errors.push(`${location}.results must be a non-empty array.`);
    return;
  }
  const coverage = Array.from({length: 100}, () => 0);
  table.results.forEach((result, resultIndex) => {
    const resultLocation = `${location}.results[${resultIndex}]`;
    if (!isObject(result)) {
      errors.push(`${resultLocation} must be an object.`);
      return;
    }
    validateRange(result.range, `${resultLocation}.range`, errors);
    if (typeof result.text !== "string" && result.text !== null) errors.push(`${resultLocation}.text must be a string or null.`);
    if (typeof result.cypherId !== "string" && result.cypherId !== null) errors.push(`${resultLocation}.cypherId must be a string or null.`);
    if (typeof result.tableId !== "string" && result.tableId !== null) errors.push(`${resultLocation}.tableId must be a string or null.`);
    if (!result.text && !result.cypherId && !result.tableId) errors.push(`${resultLocation} must define text or a document reference.`);
    if (result.cypherId && result.tableId) errors.push(`${resultLocation} cannot reference both a Cypher and a RollTable.`);
    if (result.cypherId && !cypherIds.has(result.cypherId)) errors.push(`${resultLocation} references missing Cypher '${result.cypherId}'.`);
    if (result.tableId && !tableIds.has(result.tableId)) errors.push(`${resultLocation} references missing RollTable '${result.tableId}'.`);
    if (Array.isArray(result.range) && result.range.length === 2 && result.range.every(Number.isInteger)) {
      for (let value = Math.max(1, result.range[0]); value <= Math.min(100, result.range[1]); value += 1) coverage[value - 1] += 1;
    }
  });
  const gaps = coverage.flatMap((count, index) => count === 0 ? [index + 1] : []);
  const overlaps = coverage.flatMap((count, index) => count > 1 ? [index + 1] : []);
  if (gaps.length > 0) errors.push(`${location} does not cover d00 results: ${gaps.join(", ")}.`);
  if (overlaps.length > 0) errors.push(`${location} overlaps d00 results: ${overlaps.join(", ")}.`);
}

export function validateCypherImportSource(catalog) {
  const errors = [];
  if (!isObject(catalog)) throw new CypherImportValidationError(["Catalog root must be an object."]);
  if (catalog.schemaVersion !== CYPHER_IMPORT_SCHEMA_VERSION) errors.push(`schemaVersion must be ${CYPHER_IMPORT_SCHEMA_VERSION}.`);
  if (!isObject(catalog.source)) errors.push("source metadata is required.");
  else {
    for (const field of ["id", "title", "version", "license", "pages"]) requireString(catalog.source[field], `source.${field}`, errors, {slug: field === "id"});
  }
  if (!Array.isArray(catalog.reviewIssues)) errors.push("reviewIssues must be an array.");
  else catalog.reviewIssues.forEach((issue, index) => validateReviewIssue(issue, `reviewIssues[${index}]`, errors));
  if (!Array.isArray(catalog.cyphers)) errors.push("cyphers must be an array.");
  if (!Array.isArray(catalog.tables)) errors.push("tables must be an array.");

  const cyphers = Array.isArray(catalog.cyphers) ? catalog.cyphers : [];
  const tables = Array.isArray(catalog.tables) ? catalog.tables : [];
  cyphers.forEach((cypher, index) => validateCypher(cypher, index, errors));
  const cypherIds = new Set();
  const sourceOrders = new Set();
  for (const cypher of cyphers) {
    if (!isObject(cypher)) continue;
    if (cypherIds.has(cypher.id)) errors.push(`Duplicate Cypher stable ID '${cypher.id}'.`);
    cypherIds.add(cypher.id);
    if (sourceOrders.has(cypher.sourceOrder)) errors.push(`Duplicate Cypher sourceOrder '${cypher.sourceOrder}'.`);
    sourceOrders.add(cypher.sourceOrder);
  }
  const tableIds = new Set();
  for (const table of tables) {
    if (!isObject(table)) continue;
    if (tableIds.has(table.id)) errors.push(`Duplicate RollTable stable ID '${table.id}'.`);
    tableIds.add(table.id);
  }
  tables.forEach((table, index) => validateTable(table, index, cypherIds, tableIds, errors));
  if (errors.length > 0) throw new CypherImportValidationError(errors);
  return catalog;
}

export function stableDocumentId(kind, sourceId) {
  return createHash("sha256").update(`cypherv2\u0000${kind}\u0000${sourceId}`).digest("hex").slice(0, 16);
}

export function cypherCompendiumUuid(cypherId) {
  return `Compendium.cypherv2.${CYPHER_PACK_ID}.Item.${stableDocumentId("cypher", cypherId)}`;
}

export function cypherTableCompendiumUuid(tableId) {
  return `Compendium.cypherv2.${CYPHER_TABLE_PACK_ID}.RollTable.${stableDocumentId("roll-table", tableId)}`;
}

function emptyProvenance() {
  return {
    kind: "other", sourceUuid: "", instanceId: "", grantId: "", status: "active", contentUuid: "", contentKey: "",
    replacement: {
      active: false, originalName: "", originalContentUuid: "", originalContentKey: "", replacementName: "",
      replacementContentUuid: "", replacementContentKey: "", selectionKind: "none"
    }
  };
}

function baseSystem(catalog, record) {
  return {
    schemaVersion: SYSTEM_SCHEMA_VERSION,
    slug: record.id,
    description: record.description,
    source: {uuid: "", book: catalog.source.title, page: record.sourcePage, license: catalog.source.license},
    automation: {mode: "descriptive", duration: {enabled: false, trigger: "recovery"}, rollDefaults: {}},
    ruleElements: [],
    tags: [record.category, ...(record.nonstandard ? ["nonstandard"] : [])],
    grantedBy: emptyProvenance()
  };
}

function generatedCypherDocument(catalog, record) {
  const id = stableDocumentId("cypher", record.id);
  return {
    _key: `!items!${id}`,
    _id: id,
    name: record.name,
    type: "cypher",
    img: "systems/cypherv2/assets/icons/cyphercypher.png",
    system: {
      ...baseSystem(catalog, record),
      level: record.levelOverride ? record.level : 1,
      levelOverride: record.levelOverride,
      category: record.category,
      manifest: record.manifestation === "manifest",
      manifestation: record.manifestation,
      form: record.form,
      power: record.power ?? "low",
      identified: true,
      uses: 1
    },
    effects: [],
    folder: null,
    sort: record.sourceOrder * 100000,
    flags: {
      cypherv2: {
        cypherImport: {
          sourceId: record.id,
          sourceOrder: record.sourceOrder,
          category: record.category,
          sourcePower: record.power,
          nonstandard: record.nonstandard,
          reviewStatus: record.reviewStatus,
          reviewNote: record.reviewNote
        }
      }
    }
  };
}

function generatedTableResult(table, result, index, cyphersById) {
  const id = stableDocumentId("table-result", `${table.id}:${index}:${result.range[0]}-${result.range[1]}`);
  const common = {
    _key: `!tables.results!${stableDocumentId("roll-table", table.id)}.${id}`,
    _id: id,
    img: "systems/cypherv2/assets/icons/cyphercypher.png",
    range: [...result.range],
    weight: result.range[1] - result.range[0] + 1,
    drawn: false,
    flags: {cypherv2: {cypherImport: {sourceTableId: table.id, sourceResultIndex: index}}}
  };
  if (result.cypherId) return {
    ...common,
    type: 2,
    text: result.text ?? cyphersById.get(result.cypherId).name,
    documentCollection: `cypherv2.${CYPHER_PACK_ID}`,
    documentId: stableDocumentId("cypher", result.cypherId)
  };
  if (result.tableId) return {
    ...common,
    type: 2,
    text: result.text ?? result.tableId,
    documentCollection: `cypherv2.${CYPHER_TABLE_PACK_ID}`,
    documentId: stableDocumentId("roll-table", result.tableId)
  };
  return {...common, type: 0, text: result.text, documentCollection: null, documentId: null};
}

function generatedRollTableDocument(catalog, table, sort, cyphersById) {
  const id = stableDocumentId("roll-table", table.id);
  return {
    _key: `!tables!${id}`,
    _id: id,
    name: table.name,
    img: "systems/cypherv2/assets/icons/cyphercypher.png",
    description: `<p>${catalog.source.title} (${catalog.source.version}), p. ${table.sourcePage}.</p>`,
    results: table.results.map((result, index) => generatedTableResult(table, result, index, cyphersById)),
    replacement: true,
    displayRoll: true,
    formula: table.formula,
    folder: null,
    sort,
    flags: {cypherv2: {cypherImport: {sourceId: table.id, sourcePage: table.sourcePage}}}
  };
}

function buildReviewReport(catalog) {
  const byCategory = {standard: 0, manifest: {low: 0, medium: 0, advanced: 0, high: 0, ultra: 0}, powerBoost: 0};
  const issues = [...catalog.reviewIssues.map((issue) => ({scope: "catalog", sourcePage: catalog.source.pages, ...issue}))];
  for (const cypher of catalog.cyphers) {
    if (cypher.category === "standard") byCategory.standard += 1;
    else if (cypher.category === "power-boost") byCategory.powerBoost += 1;
    else byCategory.manifest[cypher.power] += 1;
    if (cypher.reviewStatus !== "verified") issues.push({
      scope: cypher.id, sourcePage: cypher.sourcePage, issueType: "source-mapping",
      reviewStatus: cypher.reviewStatus, note: cypher.reviewNote
    });
  }
  return {
    schemaVersion: 1,
    source: catalog.source,
    summary: {cyphers: catalog.cyphers.length, ...byCategory, rollTables: catalog.tables.length, reviewIssues: issues.length},
    issues
  };
}

export function generateCypherImport(catalog) {
  validateCypherImportSource(catalog);
  const cyphers = [...catalog.cyphers].sort((left, right) => left.sourceOrder - right.sourceOrder || left.id.localeCompare(right.id));
  const tables = [...catalog.tables];
  const cyphersById = new Map(cyphers.map((cypher) => [cypher.id, cypher]));
  const cypherDocuments = cyphers.map((cypher) => generatedCypherDocument(catalog, cypher));
  const tableDocuments = tables.map((table, index) => generatedRollTableDocument(catalog, table, (index + 1) * 100000, cyphersById));
  const documentIds = [...cypherDocuments, ...tableDocuments].map((document) => document._id);
  if (new Set(documentIds).size !== documentIds.length) throw new CypherImportValidationError(["Generated Foundry document IDs collided."]);
  const keys = [...cypherDocuments, ...tableDocuments].flatMap((document) => [document._key, ...(document.results?.map((result) => result._key) ?? [])]);
  if (new Set(keys).size !== keys.length) throw new CypherImportValidationError(["Generated LevelDB keys collided."]);
  return {cypherDocuments, tableDocuments, report: buildReviewReport(catalog)};
}

function markdownReport(report) {
  const manifest = report.summary.manifest;
  const lines = [
    "# Cypher import review", "",
    `- Cyphers: ${report.summary.cyphers}`,
    `- Standard/nonphysical: ${report.summary.standard}`,
    `- Manifest low: ${manifest.low}`,
    `- Manifest medium: ${manifest.medium}`,
    `- Manifest advanced: ${manifest.advanced}`,
    `- Manifest high: ${manifest.high}`,
    `- Manifest ultra: ${manifest.ultra}`,
    `- Power boost: ${report.summary.powerBoost}`,
    `- RollTables: ${report.summary.rollTables}`,
    `- Review issues: ${report.summary.reviewIssues}`,
    "", "## Manual review", "",
    ...(report.issues.length === 0 ? ["No issues."] : report.issues.map((issue) => `- [${issue.reviewStatus}] **${issue.issueType}** — ${issue.scope} / p. ${issue.sourcePage}: ${issue.note}`)),
    ""
  ];
  return lines.join("\n");
}

async function writeDocumentDirectory(directory, documents, sourceFlag) {
  await rm(directory, {recursive: true, force: true});
  await mkdir(directory, {recursive: true});
  for (const document of documents) {
    const sourceId = document.flags.cypherv2.cypherImport[sourceFlag];
    await writeFile(path.join(directory, `${sourceId}.json`), `${JSON.stringify(document, null, 2)}\n`, "utf8");
  }
}

export async function writeCypherImport(generated, {generatedRoot, reportRoot}) {
  const cypherSource = path.join(generatedRoot, CYPHER_PACK_ID);
  const tableSource = path.join(generatedRoot, CYPHER_TABLE_PACK_ID);
  await writeDocumentDirectory(cypherSource, generated.cypherDocuments, "sourceId");
  await writeDocumentDirectory(tableSource, generated.tableDocuments, "sourceId");
  await mkdir(reportRoot, {recursive: true});
  await writeFile(path.join(reportRoot, "cypher-import-review.json"), `${JSON.stringify(generated.report, null, 2)}\n`, "utf8");
  await writeFile(path.join(reportRoot, "cypher-import-review.md"), markdownReport(generated.report), "utf8");
  return {cypherSource, tableSource};
}

export function cypherPackDestinations(projectRoot) {
  return {
    cyphers: path.resolve(projectRoot, "packs", CYPHER_PACK_ID),
    tables: path.resolve(projectRoot, "packs", CYPHER_TABLE_PACK_ID)
  };
}

export function assertCypherPackDestination(projectRoot, destination) {
  const allowed = new Set(Object.values(cypherPackDestinations(projectRoot)));
  const resolved = path.resolve(destination);
  if (!allowed.has(resolved)) throw new Error(`Refusing to write unexpected pack destination '${resolved}'.`);
}

export async function compileCypherPacks({projectRoot, sources}) {
  const {compilePack} = await import("@foundryvtt/foundryvtt-cli");
  const destinations = cypherPackDestinations(projectRoot);
  for (const destination of Object.values(destinations)) {
    assertCypherPackDestination(projectRoot, destination);
    await rm(destination, {recursive: true, force: true});
  }
  await compilePack(sources.cypherSource, destinations.cyphers, {log: true});
  await compilePack(sources.tableSource, destinations.tables, {log: true});
  return destinations;
}

export async function readCypherImportSource(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

export async function listGeneratedFiles(directory) {
  return (await readdir(directory)).sort();
}

export function defaultCypherImportPaths(projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")) {
  return {
    projectRoot,
    source: path.join(projectRoot, "content", "cyphers", "catalog.json"),
    generatedRoot: path.join(projectRoot, ".generated", "cypher-import"),
    reportRoot: path.join(projectRoot, ".reports")
  };
}
