import {access, mkdir, readFile, readdir, rename, rm, writeFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {
  TYPE_CANDIDATE_COUNTS,
  readTypeCandidateSource
} from "./type-candidate-validator.mjs";
import {
  TYPE_ABILITY_PUBLIC_PREFIX,
  TYPE_ABILITY_REVIEW_PREFIX,
  compareTypeReviewRoundTrip,
  validateTypeReviewDocuments
} from "./type-review-importer.mjs";

export const REVIEWED_TYPE_SCHEMA_VERSION = 1;
export const TYPE_PACK_ID = "types";
export const TYPE_ABILITY_PACK_ID = "type-abilities";
export const REVIEWED_TYPE_PACKS = Object.freeze({
  [TYPE_PACK_ID]: Object.freeze({label: "Types", itemType: "characterType"}),
  [TYPE_ABILITY_PACK_ID]: Object.freeze({label: "Type Abilities", itemType: "ability"})
});

const FOUNDRY_ID_PATTERN = /^[A-Za-z0-9]{16}$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PUBLIC_ABILITY_UUID_PATTERN = /^Compendium\.cypherv2\.type-abilities\.Item\.([A-Za-z0-9]{16})$/;
const ACTIVATIONS = new Set(["action", "firstAction", "lastAction", "enabler", "reaction", "timed", "perpetual", "passive", "special"]);
const SUPERHERO_TYPES = new Map([
  ["Crimefighter", {rank: 1, powerShiftCount: 2, poolBonus: 0}],
  ["Vigilante", {rank: 1, powerShiftCount: 2, poolBonus: 0}],
  ["Enhanced Hero", {rank: 2, powerShiftCount: 3, poolBonus: 2}],
  ["Powerstar", {rank: 2, powerShiftCount: 3, poolBonus: 2}],
  ["Superhuman", {rank: 3, powerShiftCount: 4, poolBonus: 4}],
  ["Powerhouse", {rank: 4, powerShiftCount: 5, poolBonus: 6}],
  ["Living God", {rank: 5, powerShiftCount: 6, poolBonus: 8}]
]);
const REQUIRED_FAMILIES = new Map([
  ["Axe Fighter", "axes"],
  ["Knife Fighter", "knives"],
  ["Sword Fighter", "swords"]
]);

export class ReviewedTypeValidationError extends Error {
  constructor(errors) {
    super(`Reviewed Type content is invalid:\n${errors.map((entry) => `- ${entry}`).join("\n")}`);
    this.name = "ReviewedTypeValidationError";
    this.errors = errors;
  }
}

const exists = (target) => access(target).then(() => true, () => false);

function compareDocuments(left, right) {
  return Number(left.sort ?? 0) - Number(right.sort ?? 0)
    || String(left.name ?? "").localeCompare(String(right.name ?? ""))
    || String(left._id ?? "").localeCompare(String(right._id ?? ""));
}

function normalizeFamily(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
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

function adaptTypeDocument(document) {
  const normalized = normalizedDocument(document);
  for (const grant of normalized.system?.abilityGrants ?? []) {
    if (typeof grant.abilityUuid === "string") {
      grant.abilityUuid = grant.abilityUuid.split(TYPE_ABILITY_REVIEW_PREFIX).join(TYPE_ABILITY_PUBLIC_PREFIX);
    }
  }
  const legacy = normalized.system?.weaponFamilyUse ?? {};
  const values = [
    ...(Array.isArray(normalized.system?.weaponFamilies) ? normalized.system.weaponFamilies : []),
    ...["axes", "knives", "swords"].filter((family) => legacy[family] === true)
  ].map(normalizeFamily).filter(Boolean);
  normalized.system.weaponFamilies = [...new Set(values)];
  delete normalized.system.weaponFamilyUse;
  return normalized;
}

async function readDocumentDirectory(directory) {
  const files = (await readdir(directory, {withFileTypes: true}))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .sort((left, right) => left.name.localeCompare(right.name));
  return Promise.all(files.map(async (entry) => JSON.parse(await readFile(path.join(directory, entry.name), "utf8"))));
}

export async function createReviewedTypeSource({candidatePath, typeDirectory, abilityDirectory}) {
  const candidate = await readTypeCandidateSource(candidatePath);
  const review = {
    types: await readDocumentDirectory(typeDirectory),
    abilities: await readDocumentDirectory(abilityDirectory)
  };
  validateTypeReviewDocuments(review);
  const comparison = compareTypeReviewRoundTrip(candidate, review);
  if (!comparison.matches) {
    throw new Error(`Candidate and Working Type content differ (types: ${comparison.typeMatch}; abilities: ${comparison.abilityMatch}).`);
  }

  const source = {
    schemaVersion: REVIEWED_TYPE_SCHEMA_VERSION,
    source: {
      kind: "reviewed-world-compendium-export",
      worldId: "cypher-v2-test",
      title: candidate.source.title,
      sha256: candidate.source.sha256,
      license: candidate.source.license,
      note: "Human-reviewed Type documents promoted losslessly from the private Working packs."
    },
    target: {systemId: "cypherv2", typePackId: TYPE_PACK_ID, abilityPackId: TYPE_ABILITY_PACK_ID},
    counts: structuredClone(TYPE_CANDIDATE_COUNTS),
    review: {...structuredClone(candidate.review), status: "reviewed"},
    types: review.types.map(adaptTypeDocument).sort(compareDocuments),
    abilities: review.abilities.map(normalizedDocument).sort(compareDocuments)
  };
  return validateReviewedTypeSource(source);
}

function allStrings(value, strings = []) {
  if (typeof value === "string") strings.push(value);
  else if (Array.isArray(value)) for (const entry of value) allStrings(entry, strings);
  else if (value && typeof value === "object") for (const entry of Object.values(value)) allStrings(entry, strings);
  return strings;
}

function validateIdentity(document, itemType, location, ids, slugs, errors) {
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    errors.push(`${location} must be an Item document.`);
    return;
  }
  if (!FOUNDRY_ID_PATTERN.test(document._id ?? "")) errors.push(`${location}._id must be a 16-character Foundry ID.`);
  if (ids.has(document._id)) errors.push(`${location} duplicates Item ID '${document._id}'.`);
  ids.add(document._id);
  if (document._key !== `!items!${document._id}`) errors.push(`${location}._key must match its Item ID.`);
  if (document.type !== itemType) errors.push(`${location}.type must be '${itemType}'.`);
  const slug = document.system?.slug;
  if (!SLUG_PATTERN.test(slug ?? "")) errors.push(`${location}.system.slug is invalid.`);
  if (slugs.has(slug)) errors.push(`${location} duplicates slug '${slug}'.`);
  slugs.add(slug);
}

export function validateReviewedTypeSource(source) {
  const errors = [];
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new ReviewedTypeValidationError(["Source root must be an object."]);
  }
  if (source.schemaVersion !== REVIEWED_TYPE_SCHEMA_VERSION) errors.push(`schemaVersion must be ${REVIEWED_TYPE_SCHEMA_VERSION}.`);
  if (source.source?.kind !== "reviewed-world-compendium-export") errors.push("source.kind must identify the reviewed World export.");
  if (source.target?.systemId !== "cypherv2" || source.target?.typePackId !== TYPE_PACK_ID || source.target?.abilityPackId !== TYPE_ABILITY_PACK_ID) {
    errors.push("target must identify the two public Cypher V2 Type packs.");
  }
  const types = Array.isArray(source.types) ? source.types : [];
  const abilities = Array.isArray(source.abilities) ? source.abilities : [];
  if (types.length !== TYPE_CANDIDATE_COUNTS.types) errors.push(`Expected 49 Types; found ${types.length}.`);
  if (abilities.length !== TYPE_CANDIDATE_COUNTS.abilities) errors.push(`Expected 106 Type Abilities; found ${abilities.length}.`);
  const typeIds = new Set();
  const typeSlugs = new Set();
  const abilityIds = new Set();
  const abilitySlugs = new Set();
  types.forEach((document, index) => validateIdentity(document, "characterType", `types[${index}]`, typeIds, typeSlugs, errors));
  abilities.forEach((document, index) => validateIdentity(document, "ability", `abilities[${index}]`, abilityIds, abilitySlugs, errors));

  const assignmentIds = new Set();
  let assignments = 0;
  let assignmentNotes = 0;
  for (const [typeIndex, type] of types.entries()) {
    const location = `types[${typeIndex}]`;
    const grants = Array.isArray(type.system?.abilityGrants) ? type.system.abilityGrants : [];
    for (const [grantIndex, grant] of grants.entries()) {
      assignments += 1;
      const grantLocation = `${location}.system.abilityGrants[${grantIndex}]`;
      if (!FOUNDRY_ID_PATTERN.test(grant.id ?? "")) errors.push(`${grantLocation}.id must be a stable 16-character ID.`);
      if (assignmentIds.has(grant.id)) errors.push(`${grantLocation} duplicates assignment ID '${grant.id}'.`);
      assignmentIds.add(grant.id);
      const match = String(grant.abilityUuid ?? "").match(PUBLIC_ABILITY_UUID_PATTERN);
      if (!match) errors.push(`${grantLocation}.abilityUuid must target ${TYPE_ABILITY_PUBLIC_PREFIX}<id>.`);
      else if (!abilityIds.has(match[1])) errors.push(`${grantLocation} references missing Ability '${match[1]}'.`);
      if (String(grant.notes ?? "").trim()) assignmentNotes += 1;
    }
    if ("weaponFamilyUse" in (type.system ?? {})) errors.push(`${location} retains obsolete weaponFamilyUse flags.`);
    if (!Array.isArray(type.system?.weaponFamilies)) errors.push(`${location}.system.weaponFamilies must be an array.`);
    if ((type.system?.instance?.selections?.powerShifts ?? []).length > 0) errors.push(`${location} embeds Character-owned Power Shift allocations.`);
  }
  if (assignments !== TYPE_CANDIDATE_COUNTS.assignments) errors.push(`Expected 155 assignments; found ${assignments}.`);
  if (assignmentNotes !== 9) errors.push(`Expected 9 reviewed assignment notes; found ${assignmentNotes}.`);

  for (const [name, family] of REQUIRED_FAMILIES) {
    const type = types.find((entry) => entry.name === name);
    if (!type || JSON.stringify(type.system.weaponFamilies) !== JSON.stringify([family])) errors.push(`${name} must grant normalized '${family}' familiarity.`);
  }
  for (const [name, expected] of SUPERHERO_TYPES) {
    const type = types.find((entry) => entry.name === name);
    const superhero = type?.system?.superhero;
    if (!type || superhero?.rank !== expected.rank || superhero?.powerShiftCount !== expected.powerShiftCount
      || superhero?.superheroics?.enabled !== true || superhero?.superheroics?.poolBonus !== expected.poolBonus) {
      errors.push(`${name} has invalid Superhero metadata.`);
    }
  }
  for (const type of types.filter((entry) => !SUPERHERO_TYPES.has(entry.name))) {
    const superhero = type.system?.superhero;
    if (superhero?.rank !== 0 || superhero?.powerShiftCount !== 0 || superhero?.superheroics?.enabled !== false || superhero?.superheroics?.poolBonus !== 0) {
      errors.push(`${type.name} must retain neutral Superhero metadata.`);
    }
  }
  for (const [index, ability] of abilities.entries()) {
    if (!ACTIVATIONS.has(ability.system?.activation)) errors.push(`abilities[${index}].system.activation is invalid.`);
    const cost = ability.system?.cost;
    if (!cost || !Number.isInteger(cost.amount) || typeof cost.scalable !== "boolean" || !Array.isArray(cost.allowedPools)) {
      errors.push(`abilities[${index}].system.cost is invalid.`);
    }
  }
  const serialized = allStrings({types, abilities}).join("\n");
  if (/Compendium\.world\.|Compendium\.[A-Za-z0-9_.-]*working|cypher-v2-test/i.test(serialized)) {
    errors.push("Reviewed content retains a World, Working, or test reference.");
  }
  if (/origin superhero abilit/i.test(serialized)) errors.push("Reviewed content contains an Origin Superhero Ability placeholder.");
  if (errors.length) throw new ReviewedTypeValidationError(errors);
  return source;
}

export async function readReviewedTypeSource(filePath) {
  return validateReviewedTypeSource(JSON.parse(await readFile(filePath, "utf8")));
}

export async function writeReviewedTypeSource(source, filePath) {
  validateReviewedTypeSource(source);
  await mkdir(path.dirname(filePath), {recursive: true});
  await writeFile(filePath, `${JSON.stringify(source, null, 2)}\n`, "utf8");
}

async function writeDocumentDirectory(directory, documents) {
  await rm(directory, {recursive: true, force: true});
  await mkdir(directory, {recursive: true});
  for (const document of [...documents].sort((left, right) => String(left._id).localeCompare(String(right._id)))) {
    await writeFile(path.join(directory, `item-${document._id}.json`), `${JSON.stringify(document, null, 2)}\n`, "utf8");
  }
}

export async function writeReviewedTypeSources(source, {generatedRoot}) {
  validateReviewedTypeSource(source);
  const directories = {
    [TYPE_PACK_ID]: path.join(generatedRoot, TYPE_PACK_ID),
    [TYPE_ABILITY_PACK_ID]: path.join(generatedRoot, TYPE_ABILITY_PACK_ID)
  };
  await writeDocumentDirectory(directories[TYPE_PACK_ID], source.types);
  await writeDocumentDirectory(directories[TYPE_ABILITY_PACK_ID], source.abilities);
  return directories;
}

export function assertTypePackDestination(projectRoot, destination) {
  const packsRoot = path.resolve(projectRoot, "packs") + path.sep;
  const resolved = path.resolve(destination);
  if (!resolved.startsWith(packsRoot) || !REVIEWED_TYPE_PACKS[path.basename(resolved)]) {
    throw new Error(`Refusing to write unexpected Type pack destination '${resolved}'.`);
  }
}

export async function compileReviewedTypePacks({projectRoot, sources}) {
  const {compilePack} = await import("@foundryvtt/foundryvtt-cli");
  const packIds = Object.keys(REVIEWED_TYPE_PACKS);
  const destinations = Object.fromEntries(packIds.map((packId) => [packId, path.resolve(projectRoot, "packs", packId)]));
  for (const destination of Object.values(destinations)) assertTypePackDestination(projectRoot, destination);
  const stagingRoot = path.resolve(projectRoot, ".generated", "reviewed-type-pack-build");
  const backupRoot = path.resolve(projectRoot, ".generated", "reviewed-type-pack-backup");
  await rm(stagingRoot, {recursive: true, force: true});
  await rm(backupRoot, {recursive: true, force: true});
  await mkdir(stagingRoot, {recursive: true});
  for (const packId of packIds) await compilePack(sources[packId], path.join(stagingRoot, packId), {log: true});
  await mkdir(backupRoot, {recursive: true});
  const backedUp = [];
  const installed = [];
  try {
    for (const packId of packIds) if (await exists(destinations[packId])) {
      await rename(destinations[packId], path.join(backupRoot, packId));
      backedUp.push(packId);
    }
    for (const packId of packIds) {
      await rename(path.join(stagingRoot, packId), destinations[packId]);
      installed.push(packId);
    }
  } catch (error) {
    for (const packId of installed.reverse()) await rm(destinations[packId], {recursive: true, force: true});
    for (const packId of backedUp.reverse()) await rename(path.join(backupRoot, packId), destinations[packId]);
    throw error;
  }
  await rm(stagingRoot, {recursive: true, force: true});
  await rm(backupRoot, {recursive: true, force: true});
  return destinations;
}

function semanticDocument(document) {
  const normalized = structuredClone(document);
  delete normalized._key;
  delete normalized._stats;
  return normalized;
}

export function compareReviewedTypeRoundTrip(source, extracted) {
  validateReviewedTypeSource(source);
  const normalize = (documents) => documents.map(semanticDocument).sort((left, right) => String(left._id).localeCompare(String(right._id)));
  const typeMatch = JSON.stringify(normalize(source.types)) === JSON.stringify(normalize(extracted.types));
  const abilityMatch = JSON.stringify(normalize(source.abilities)) === JSON.stringify(normalize(extracted.abilities));
  return {typeMatch, abilityMatch, matches: typeMatch && abilityMatch, ignoredFields: ["_key", "_stats"]};
}

export function reviewedTypeSummary(source) {
  validateReviewedTypeSource(source);
  return {
    types: source.types.length,
    abilities: source.abilities.length,
    assignments: source.types.reduce((total, type) => total + type.system.abilityGrants.length, 0),
    scalableCosts: source.abilities.filter((ability) => ability.system.cost.scalable).length,
    multiPoolCosts: source.abilities.filter((ability) => ability.system.cost.allowedPools.length > 1).length,
    assignmentNotes: source.types.flatMap((type) => type.system.abilityGrants).filter((grant) => String(grant.notes ?? "").trim()).length,
    superheroes: source.types.filter((type) => type.system.superhero.rank > 0).length
  };
}

export function defaultReviewedTypePaths(projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")) {
  return {
    projectRoot,
    candidate: path.join(projectRoot, "content", "types", "candidate-pack.json"),
    source: path.join(projectRoot, "content", "types", "reviewed-pack.json"),
    generatedRoot: path.join(projectRoot, ".generated", "reviewed-type-pack-import")
  };
}
