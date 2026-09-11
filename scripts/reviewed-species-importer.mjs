import {access, mkdir, readFile, readdir, rename, rm, writeFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {
  SPECIES_CANDIDATE_COUNT,
  SPECIES_NAMES,
  createSpeciesReferenceCatalogs,
  defaultSpeciesCandidatePath,
  defaultSpeciesReferencePath,
  readSpeciesCandidateSource,
  speciesCandidateSummary
} from "./species-candidate-validator.mjs";
import {
  compareSpeciesReviewRoundTrip,
  validateSpeciesReviewDocuments
} from "./species-review-importer.mjs";

export const REVIEWED_SPECIES_SCHEMA_VERSION = 1;
export const SPECIES_PACK_ID = "species";
export const REVIEWED_SPECIES_PACK = Object.freeze({label: "Species", itemType: "species"});

const FOUNDRY_ID_PATTERN = /^[A-Za-z0-9]{16}$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const exists = (target) => access(target).then(() => true, () => false);

export class ReviewedSpeciesValidationError extends Error {
  constructor(errors) {
    super(`Reviewed Species content is invalid:\n${errors.map((entry) => `- ${entry}`).join("\n")}`);
    this.name = "ReviewedSpeciesValidationError";
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

async function readDocumentDirectory(directory) {
  const files = (await readdir(directory, {withFileTypes: true}))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .sort((left, right) => left.name.localeCompare(right.name));
  return Promise.all(files.map(async (entry) => JSON.parse(await readFile(path.join(directory, entry.name), "utf8"))));
}

export async function createReviewedSpeciesSource({candidatePath, speciesDirectory, referencePath = defaultSpeciesReferencePath()}) {
  const candidate = await readSpeciesCandidateSource(candidatePath, referencePath);
  const species = await readDocumentDirectory(speciesDirectory);
  const references = createSpeciesReferenceCatalogs(JSON.parse(await readFile(referencePath, "utf8")));
  validateSpeciesReviewDocuments(species, references);

  const source = {
    schemaVersion: REVIEWED_SPECIES_SCHEMA_VERSION,
    source: {
      kind: "reviewed-world-compendium-export",
      worldId: "cypher-v2-test",
      title: candidate.source.title,
      sha256: candidate.source.sha256,
      license: candidate.source.license,
      note: "Human-reviewed Species documents promoted losslessly from the private Working pack."
    },
    target: {systemId: "cypherv2", packId: SPECIES_PACK_ID},
    counts: {species: SPECIES_CANDIDATE_COUNT},
    review: {...structuredClone(candidate.review), status: "reviewed"},
    species: species.map(normalizedDocument).sort(compareDocuments)
  };
  return validateReviewedSpeciesSource(source, references);
}

function allStrings(value, strings = []) {
  if (typeof value === "string") strings.push(value);
  else if (Array.isArray(value)) for (const entry of value) allStrings(entry, strings);
  else if (value && typeof value === "object") for (const entry of Object.values(value)) allStrings(entry, strings);
  return strings;
}

function hasNonZero(record) {
  return Object.values(record ?? {}).some((value) => Number(value) !== 0);
}

export function validateReviewedSpeciesSource(source, references) {
  const errors = [];
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new ReviewedSpeciesValidationError(["Source root must be an object."]);
  }
  if (source.schemaVersion !== REVIEWED_SPECIES_SCHEMA_VERSION) errors.push(`schemaVersion must be ${REVIEWED_SPECIES_SCHEMA_VERSION}.`);
  if (source.source?.kind !== "reviewed-world-compendium-export") errors.push("source.kind must identify the reviewed World export.");
  if (source.target?.systemId !== "cypherv2" || source.target?.packId !== SPECIES_PACK_ID) {
    errors.push("target must identify the public Cypher V2 Species pack.");
  }

  const species = Array.isArray(source.species) ? source.species : [];
  if (source.counts?.species !== SPECIES_CANDIDATE_COUNT || species.length !== SPECIES_CANDIDATE_COUNT) {
    errors.push(`Expected ${SPECIES_CANDIDATE_COUNT} Species; found ${species.length}.`);
  }
  const ids = new Set();
  const slugs = new Set();
  for (const [index, document] of species.entries()) {
    const location = `species[${index}]`;
    if (!FOUNDRY_ID_PATTERN.test(document?._id ?? "")) errors.push(`${location}._id must be a stable 16-character Foundry ID.`);
    if (ids.has(document?._id)) errors.push(`${location} duplicates Item ID '${document?._id}'.`);
    ids.add(document?._id);
    if (document?._key !== `!items!${document?._id}`) errors.push(`${location}._key must match its Item ID.`);
    if (document?.type !== "species") errors.push(`${location}.type must be 'species'.`);
    const slug = document?.system?.slug;
    if (!SLUG_PATTERN.test(slug ?? "")) errors.push(`${location}.system.slug is invalid.`);
    if (slugs.has(slug)) errors.push(`${location} duplicates slug '${slug}'.`);
    slugs.add(slug);
  }
  if (JSON.stringify(species.map((document) => document.name)) !== JSON.stringify(SPECIES_NAMES)) {
    errors.push("Species names/order do not match the reviewed 20-Species inventory.");
  }

  try {
    validateSpeciesReviewDocuments(species, references);
  } catch (error) {
    errors.push(...(Array.isArray(error?.errors) ? error.errors : [error instanceof Error ? error.message : String(error)]));
  }

  const woundSpecies = species.filter((document) => hasNonZero(document.system?.woundBonuses)).map((document) => document.name).sort();
  if (JSON.stringify(woundSpecies) !== JSON.stringify(["Drakain", "Orc", "Prota"])) {
    errors.push(`Minor Wound bonus Species must be exactly Drakain, Orc, and Prota; found ${woundSpecies.join(", ") || "none"}.`);
  }
  const fixedSkillSpecies = species.filter((document) => (document.system?.skillGrants?.length ?? 0) > 0);
  if (fixedSkillSpecies.length !== 16) errors.push(`Expected fixed Skill grants on 16 Species; found ${fixedSkillSpecies.length}.`);
  const skillChoiceSpecies = species.filter((document) => (document.system?.choiceGroups?.length ?? 0) > 0).map((document) => document.name);
  if (JSON.stringify(skillChoiceSpecies) !== JSON.stringify(["Naron"])) errors.push(`Naron must be the only Species with a Skill choice group.`);
  const descriptorChoiceSpecies = species.filter((document) => (document.system?.descriptorChoiceGroups?.length ?? 0) > 0).map((document) => document.name);
  if (JSON.stringify(descriptorChoiceSpecies) !== JSON.stringify(["Human"])) errors.push("Human must be the only Species with a Descriptor choice group.");
  const contextualNotes = species.flatMap((document) => document.system?.skillGrants ?? []).filter((grant) => String(grant.notes ?? "").trim());
  if (contextualNotes.length !== 5) errors.push(`Expected 5 contextual Skill grant notes; found ${contextualNotes.length}.`);
  if (species.some((document) => (document.system?.abilityGrants?.length ?? 0) > 0 || (document.system?.abilityChoiceGroups?.length ?? 0) > 0)) {
    errors.push("Species must not contain fixed or choice Ability documents.");
  }
  if (species.some((document) => (document.system?.ruleElements?.length ?? 0) > 0)) errors.push("Species must not contain ruleElements.");

  const human = species.find((document) => document.name === "Human");
  const humanGroup = human?.system?.descriptorChoiceGroups?.[0];
  if (human?.system?.descriptorChoiceGroups?.length !== 1 || humanGroup?.sourceMode !== "catalog"
    || humanGroup?.catalogItemType !== "descriptor" || humanGroup?.choose !== 1 || humanGroup?.options?.length !== 0) {
    errors.push("Human must retain exactly one dynamic Descriptor catalog choice with no baked options.");
  }

  const serialized = allStrings(species).join("\n");
  if (/Compendium\.world\.|Compendium\.[A-Za-z0-9_.-]*working|cypher-v2-test/i.test(serialized)) {
    errors.push("Reviewed Species contain a World, Working, or test reference.");
  }
  if (/Compendium\.[A-Za-z0-9_.-]*(?:staging|candidate)/i.test(serialized)) errors.push("Reviewed Species contain a staging/candidate reference.");
  if (/origin superhero abilit/i.test(serialized)) errors.push("Reviewed Species contain an Origin Superhero Ability placeholder.");

  if (errors.length) throw new ReviewedSpeciesValidationError([...new Set(errors)]);
  return source;
}

export async function readReviewedSpeciesSource(filePath, referencePath = defaultSpeciesReferencePath()) {
  const [source, referenceSource] = await Promise.all([
    readFile(filePath, "utf8").then(JSON.parse),
    readFile(referencePath, "utf8").then(JSON.parse)
  ]);
  return validateReviewedSpeciesSource(source, createSpeciesReferenceCatalogs(referenceSource));
}

export async function writeReviewedSpeciesSource(source, filePath, referencePath = defaultSpeciesReferencePath()) {
  const referenceSource = JSON.parse(await readFile(referencePath, "utf8"));
  validateReviewedSpeciesSource(source, createSpeciesReferenceCatalogs(referenceSource));
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

export async function writeReviewedSpeciesSources(source, {generatedRoot, reference}) {
  const referenceSource = JSON.parse(await readFile(reference, "utf8"));
  validateReviewedSpeciesSource(source, createSpeciesReferenceCatalogs(referenceSource));
  const directory = path.join(generatedRoot, SPECIES_PACK_ID);
  await writeDocumentDirectory(directory, source.species);
  return {[SPECIES_PACK_ID]: directory};
}

export function assertSpeciesPackDestination(projectRoot, destination) {
  const expected = path.resolve(projectRoot, "packs", SPECIES_PACK_ID);
  const resolved = path.resolve(destination);
  if (resolved !== expected) throw new Error(`Refusing to write unexpected Species pack destination '${resolved}'.`);
}

export async function compileReviewedSpeciesPack({projectRoot, sourceDirectory}) {
  const {compilePack} = await import("@foundryvtt/foundryvtt-cli");
  const destination = path.resolve(projectRoot, "packs", SPECIES_PACK_ID);
  assertSpeciesPackDestination(projectRoot, destination);
  const stagingRoot = path.resolve(projectRoot, ".generated", "reviewed-species-pack-build");
  const backupRoot = path.resolve(projectRoot, ".generated", "reviewed-species-pack-backup");
  const staging = path.join(stagingRoot, SPECIES_PACK_ID);
  const backup = path.join(backupRoot, SPECIES_PACK_ID);
  await rm(stagingRoot, {recursive: true, force: true});
  await rm(backupRoot, {recursive: true, force: true});
  await mkdir(stagingRoot, {recursive: true});
  await compilePack(sourceDirectory, staging, {log: true});
  await mkdir(backupRoot, {recursive: true});
  const hadDestination = await exists(destination);
  if (hadDestination) await rename(destination, backup);
  try {
    await rename(staging, destination);
  } catch (error) {
    await rm(destination, {recursive: true, force: true});
    if (hadDestination) await rename(backup, destination);
    throw error;
  }
  await rm(stagingRoot, {recursive: true, force: true});
  await rm(backupRoot, {recursive: true, force: true});
  return destination;
}

function semanticDocument(document) {
  const normalized = structuredClone(document);
  delete normalized._key;
  delete normalized._stats;
  return normalized;
}

export function compareReviewedSpeciesRoundTrip(source, extracted) {
  const normalize = (documents) => documents.map(semanticDocument).sort((left, right) => String(left._id).localeCompare(String(right._id)));
  const speciesMatch = JSON.stringify(normalize(source.species)) === JSON.stringify(normalize(extracted));
  return {speciesMatch, matches: speciesMatch, ignoredFields: ["_key", "_stats"]};
}

export function reviewedSpeciesSummary(source, references) {
  validateReviewedSpeciesSource(source, references);
  const base = speciesCandidateSummary({
    schemaVersion: 1,
    source: {title: source.source.title, file: "reviewed-world-export", sha256: source.source.sha256, license: source.source.license},
    target: {systemId: "cypherv2", futurePackId: SPECIES_PACK_ID},
    inventory: {
      fantasy: ["Dragonfolk", "Dwarf", "Elf", "Gnome", "Halfling", "Hellborn", "Human", "Orc"],
      scienceFiction: ["Aarak", "Cyborg", "Delph", "D’nec", "Drakain", "Human", "Mutant", "Naron", "Prota", "Rigellian", "Stelan", "Vendeer", "Zantari"]
    },
    counts: {species: source.species.length},
    review: source.review,
    species: source.species
  }, references);
  return base;
}

export function defaultReviewedSpeciesPaths(projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")) {
  return {
    projectRoot,
    candidate: defaultSpeciesCandidatePath(projectRoot),
    reference: defaultSpeciesReferencePath(projectRoot),
    source: path.join(projectRoot, "content", "species", "reviewed-pack.json"),
    generatedRoot: path.join(projectRoot, ".generated", "reviewed-species-pack-import")
  };
}
