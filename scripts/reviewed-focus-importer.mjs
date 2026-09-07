import {mkdir, readFile, readdir, rm, writeFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {ABILITY_PACK_ID, FOCUS_PACK_ID} from "./focus-importer.mjs";

export const REVIEWED_FOCUS_SCHEMA_VERSION = 1;
export const SYSTEM_ABILITY_UUID_PREFIX = `Compendium.cypherv2.${ABILITY_PACK_ID}.Item.`;

const LEGACY_WORKING_ABILITY_UUID_PATTERN = /^Compendium\.world\.focus-abilities-working\.Item\.([A-Za-z0-9]+)$/;
const SYSTEM_ABILITY_UUID_PATTERN = /^Compendium\.cypherv2\.focus-abilities\.Item\.([A-Za-z0-9]+)$/;
const FOUNDRY_ID_PATTERN = /^[A-Za-z0-9]{16}$/;

export class ReviewedFocusValidationError extends Error {
  constructor(errors) {
    super(`Reviewed Focus content is invalid:\n${errors.map((entry) => `- ${entry}`).join("\n")}`);
    this.name = "ReviewedFocusValidationError";
    this.errors = errors;
  }
}

function compareDocuments(left, right) {
  return Number(left.sort ?? 0) - Number(right.sort ?? 0)
    || String(left.name ?? "").localeCompare(String(right.name ?? ""))
    || String(left._id ?? "").localeCompare(String(right._id ?? ""));
}

function normalizedDocument(document) {
  const normalized = structuredClone(document);
  normalized._key = `!items!${normalized._id}`;
  normalized.ownership = {default: Number(normalized.ownership?.default ?? 0)};
  normalized._stats = {
    coreVersion: "14.360",
    systemId: null,
    systemVersion: null,
    createdTime: null,
    modifiedTime: null,
    lastModifiedBy: null,
    compendiumSource: null,
    duplicateSource: null,
    exportSource: null
  };
  return normalized;
}

function normalizeFocusDocument(document, abilityIds) {
  const normalized = normalizedDocument(document);
  for (const node of normalized.system?.graph?.nodes ?? []) {
    const match = String(node.abilityUuid ?? "").match(LEGACY_WORKING_ABILITY_UUID_PATTERN)
      ?? String(node.abilityUuid ?? "").match(SYSTEM_ABILITY_UUID_PATTERN);
    if (match && abilityIds.has(match[1])) node.abilityUuid = `${SYSTEM_ABILITY_UUID_PREFIX}${match[1]}`;
  }
  return normalized;
}

async function readDocumentDirectory(directory) {
  const files = (await readdir(directory, {withFileTypes: true}))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .sort((left, right) => left.name.localeCompare(right.name));
  return Promise.all(files.map(async (entry) => JSON.parse(await readFile(path.join(directory, entry.name), "utf8"))));
}

export async function createReviewedFocusSource({focusDirectory, abilityDirectory}) {
  const rawAbilities = await readDocumentDirectory(abilityDirectory);
  const abilities = rawAbilities.map(normalizedDocument).sort(compareDocuments);
  const abilityIds = new Set(abilities.map((document) => document._id));
  const foci = (await readDocumentDirectory(focusDirectory))
    .map((document) => normalizeFocusDocument(document, abilityIds))
    .sort(compareDocuments);
  return validateReviewedFocusSource({
    schemaVersion: REVIEWED_FOCUS_SCHEMA_VERSION,
    source: {
      kind: "reviewed-world-compendium-export",
      note: "Lossless reviewed Item documents; do not regenerate from content/foci/catalog.json."
    },
    target: {
      systemId: "cypherv2",
      focusPackId: FOCUS_PACK_ID,
      abilityPackId: ABILITY_PACK_ID
    },
    foci,
    abilities
  });
}

function validateIdentity(document, expectedType, location, errors) {
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    errors.push(`${location} must be an Item document.`);
    return;
  }
  if (!FOUNDRY_ID_PATTERN.test(document._id ?? "")) errors.push(`${location}._id must be a 16-character Foundry ID.`);
  if (document.type !== expectedType) errors.push(`${location}.type must be '${expectedType}'.`);
  if (typeof document.name !== "string" || !document.name.trim()) errors.push(`${location}.name must be non-blank.`);
  if (typeof document.system?.slug !== "string" || !document.system.slug.trim()) errors.push(`${location}.system.slug must be non-blank.`);
  if (document._key !== `!items!${document._id}`) errors.push(`${location}._key must match its Item ID.`);
}

function validateUniqueDocuments(documents, label, errors) {
  for (const field of ["_id", "system.slug"]) {
    const values = new Map();
    for (const document of documents) {
      const value = field === "_id" ? document?._id : document?.system?.slug;
      if (!value) continue;
      values.set(value, [...(values.get(value) ?? []), document?.name ?? document?._id ?? "unknown"]);
    }
    for (const [value, names] of values) {
      if (names.length > 1) errors.push(`${label} has duplicate ${field} '${value}' (${names.join(", ")}).`);
    }
  }
}

function collectCompendiumUuids(value, results = []) {
  if (typeof value === "string") {
    results.push(...Array.from(value.matchAll(/Compendium\.[A-Za-z0-9_.-]+\.Item\.[A-Za-z0-9]+/g), (match) => match[0]));
    return results;
  }
  if (Array.isArray(value)) {
    for (const entry of value) collectCompendiumUuids(entry, results);
    return results;
  }
  if (value && typeof value === "object") {
    for (const entry of Object.values(value)) collectCompendiumUuids(entry, results);
  }
  return results;
}

export function validateReviewedFocusSource(source) {
  const errors = [];
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new ReviewedFocusValidationError(["Source root must be an object."]);
  }
  if (source.schemaVersion !== REVIEWED_FOCUS_SCHEMA_VERSION) errors.push(`schemaVersion must be ${REVIEWED_FOCUS_SCHEMA_VERSION}.`);
  if (source.target?.systemId !== "cypherv2") errors.push("target.systemId must be 'cypherv2'.");
  if (source.target?.focusPackId !== FOCUS_PACK_ID) errors.push(`target.focusPackId must be '${FOCUS_PACK_ID}'.`);
  if (source.target?.abilityPackId !== ABILITY_PACK_ID) errors.push(`target.abilityPackId must be '${ABILITY_PACK_ID}'.`);
  if (!Array.isArray(source.foci)) errors.push("foci must be an array.");
  if (!Array.isArray(source.abilities)) errors.push("abilities must be an array.");

  const foci = Array.isArray(source.foci) ? source.foci : [];
  const abilities = Array.isArray(source.abilities) ? source.abilities : [];
  foci.forEach((document, index) => validateIdentity(document, "focus", `foci[${index}]`, errors));
  abilities.forEach((document, index) => validateIdentity(document, "ability", `abilities[${index}]`, errors));
  validateUniqueDocuments(foci, "Focus catalog", errors);
  validateUniqueDocuments(abilities, "Ability catalog", errors);

  const abilityIds = new Set(abilities.map((document) => document._id));
  for (const [focusIndex, focus] of foci.entries()) {
    const location = `foci[${focusIndex}]`;
    const nodes = focus.system?.graph?.nodes;
    const connections = focus.system?.graph?.connections;
    if (!Array.isArray(nodes) || !Array.isArray(connections)) {
      errors.push(`${location}.system.graph must contain nodes and connections arrays.`);
      continue;
    }
    const nodeIds = new Set();
    for (const [nodeIndex, node] of nodes.entries()) {
      const nodeLocation = `${location}.system.graph.nodes[${nodeIndex}]`;
      if (typeof node.id !== "string" || !node.id) errors.push(`${nodeLocation}.id must be non-blank.`);
      if (nodeIds.has(node.id)) errors.push(`${location} has duplicate node ID '${node.id}'.`);
      nodeIds.add(node.id);
      const match = String(node.abilityUuid ?? "").match(SYSTEM_ABILITY_UUID_PATTERN);
      if (!match) errors.push(`${nodeLocation}.abilityUuid must target ${SYSTEM_ABILITY_UUID_PREFIX}<id>.`);
      else if (!abilityIds.has(match[1])) errors.push(`${nodeLocation}.abilityUuid targets missing Ability '${match[1]}'.`);
    }
    const connectionIds = new Set();
    const directedConnections = new Set();
    for (const [connectionIndex, connection] of connections.entries()) {
      const connectionLocation = `${location}.system.graph.connections[${connectionIndex}]`;
      if (connectionIds.has(connection.id)) errors.push(`${location} has duplicate connection ID '${connection.id}'.`);
      connectionIds.add(connection.id);
      const directed = `${connection.from}\u0000${connection.to}`;
      if (directedConnections.has(directed)) errors.push(`${location} has duplicate connection '${connection.from}' -> '${connection.to}'.`);
      directedConnections.add(directed);
      if (!nodeIds.has(connection.from) || !nodeIds.has(connection.to)) errors.push(`${connectionLocation} references a missing node.`);
      if (connection.from === connection.to) errors.push(`${connectionLocation} cannot connect a node to itself.`);
    }
  }

  const allUuids = collectCompendiumUuids({foci, abilities});
  for (const uuid of allUuids) {
    if (uuid.startsWith("Compendium.world.") || uuid.includes("cypher-v2-test") || uuid.includes("focus-abilities-working")) {
      errors.push(`World/test compendium UUID is not distributable: '${uuid}'.`);
    }
  }

  if (errors.length > 0) throw new ReviewedFocusValidationError(errors);
  return source;
}

export async function readReviewedFocusSource(filePath) {
  return validateReviewedFocusSource(JSON.parse(await readFile(filePath, "utf8")));
}

async function writeDocumentDirectory(directory, documents) {
  await rm(directory, {recursive: true, force: true});
  await mkdir(directory, {recursive: true});
  for (const document of [...documents].sort((left, right) => String(left._id).localeCompare(String(right._id)))) {
    await writeFile(path.join(directory, `${document._id}.json`), `${JSON.stringify(document, null, 2)}\n`, "utf8");
  }
}

export async function writeReviewedFocusSources(source, {generatedRoot}) {
  validateReviewedFocusSource(source);
  const abilitySource = path.join(generatedRoot, ABILITY_PACK_ID);
  const focusSource = path.join(generatedRoot, FOCUS_PACK_ID);
  await writeDocumentDirectory(abilitySource, source.abilities);
  await writeDocumentDirectory(focusSource, source.foci);
  return {abilitySource, focusSource};
}

export async function writeReviewedFocusSource(source, filePath) {
  validateReviewedFocusSource(source);
  await mkdir(path.dirname(filePath), {recursive: true});
  await writeFile(filePath, `${JSON.stringify(source, null, 2)}\n`, "utf8");
}

export function reviewedFocusSummary(source) {
  validateReviewedFocusSource(source);
  const nodes = source.foci.reduce((total, focus) => total + focus.system.graph.nodes.length, 0);
  const connections = source.foci.reduce((total, focus) => total + focus.system.graph.connections.length, 0);
  const referencedAbilityIds = new Set(source.foci.flatMap((focus) => focus.system.graph.nodes.map((node) => node.abilityUuid.slice(SYSTEM_ABILITY_UUID_PREFIX.length))));
  return {
    foci: source.foci.length,
    abilities: source.abilities.length,
    nodes,
    connections,
    referencedAbilities: referencedAbilityIds.size,
    unreferencedAbilities: source.abilities
      .filter((ability) => !referencedAbilityIds.has(ability._id))
      .map((ability) => ability._id)
      .sort()
  };
}

export function defaultReviewedFocusPaths(projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")) {
  return {
    projectRoot,
    source: path.join(projectRoot, "content", "foci", "reviewed-pack.json"),
    generatedRoot: path.join(projectRoot, ".generated", "focus-import")
  };
}
