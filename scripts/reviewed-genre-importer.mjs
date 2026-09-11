import {access, mkdir, readFile, readdir, rename, rm, writeFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {
  GENRE_ABILITY_COUNTS,
  ORIGIN,
  REAL_WORLD_IDS,
  validateGenreAbilityCandidateSource
} from "./genre-ability-candidate-validator.mjs";
import {GENRE_COUNTS, GENRE_NAMES, validateGenreCandidateSource} from "./genre-candidate-validator.mjs";
import {
  compareGenreAbilityReviewRoundTrip,
  validateGenreAbilityReviewDocuments
} from "./genre-ability-review-importer.mjs";
import {
  compareGenreReviewRoundTrip,
  normalizeGenreReviewDocuments,
  validateGenreReviewDocuments
} from "./genre-review-importer.mjs";

export const REVIEWED_GENRE_SCHEMA_VERSION = 1;
export const GENRE_PACK_ID = "genres";
export const GENRE_ABILITY_PACK_ID = "genre-abilities";
export const REVIEWED_GENRE_PACKS = Object.freeze({
  [GENRE_ABILITY_PACK_ID]: Object.freeze({label: "Genre Abilities", itemType: "ability"}),
  [GENRE_PACK_ID]: Object.freeze({label: "Genres", itemType: "genre"})
});

const FOUNDRY_ID = /^[A-Za-z0-9]{16}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PUBLIC_ABILITY_UUID = /^Compendium\.cypherv2\.genre-abilities\.Item\.([A-Za-z0-9]{16})$/;
const GENRE_IDS = new Map([
  ["The Real World", "ed82d7be559e5bf8"],
  ["Fantasy", "964ba40da91df8bc"],
  ["Science Fiction", "ede94ba279072596"],
  ["Superheroes", "d130fc72b7866db1"]
]);
const SHARED_PROGRESSION = ["Cypher Use", "Enhanced Stat", "Exceptional Follower", "Snipe", "Inspire Action"];
const EXPECTED_RELATIONS = new Map([
  ["The Real World", {progression: 2, origin: 0}],
  ["Fantasy", {progression: 27, origin: 0}],
  ["Science Fiction", {progression: 19, origin: 0}],
  ["Superheroes", {progression: 41, origin: 26}]
]);

const exists = (target) => access(target).then(() => true, () => false);

export class ReviewedGenreValidationError extends Error {
  constructor(errors) {
    super(`Reviewed Genre content is invalid:\n${errors.map((entry) => `- ${entry}`).join("\n")}`);
    this.name = "ReviewedGenreValidationError";
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
  const entries = await readdir(directory, {recursive: true, withFileTypes: true});
  const documents = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const parent = entry.parentPath ?? entry.path;
    documents.push(JSON.parse(await readFile(path.join(parent, entry.name), "utf8")));
  }
  return documents.sort(compareDocuments);
}

export async function createReviewedGenreSources({candidatePath, abilityCandidatePath, genreDirectory, abilityDirectory}) {
  const [candidate, abilityCandidate, workingGenres, workingAbilities] = await Promise.all([
    readFile(candidatePath, "utf8").then(JSON.parse),
    readFile(abilityCandidatePath, "utf8").then(JSON.parse),
    readDocumentDirectory(genreDirectory),
    readDocumentDirectory(abilityDirectory)
  ]);
  validateGenreAbilityCandidateSource(abilityCandidate);
  validateGenreCandidateSource(candidate, abilityCandidate);
  validateGenreAbilityReviewDocuments(workingAbilities);
  validateGenreReviewDocuments(workingGenres, candidate, abilityCandidate);
  const abilityComparison = compareGenreAbilityReviewRoundTrip(abilityCandidate, workingAbilities);
  const genreComparison = compareGenreReviewRoundTrip(candidate, workingGenres, abilityCandidate);
  if (!abilityComparison.matches || !genreComparison.matches) {
    throw new Error(`Candidate and approved Working Genre content differ (abilities: ${abilityComparison.matches}; genres: ${genreComparison.matches}).`);
  }

  const sharedSource = {
    kind: "reviewed-world-compendium-export",
    worldId: "cypher-v2-test",
    title: candidate.source.title,
    sha256: candidate.source.sha256,
    license: candidate.source.license,
    note: "Human-reviewed Genre documents promoted losslessly from the private Working packs."
  };
  const abilities = {
    schemaVersion: REVIEWED_GENRE_SCHEMA_VERSION,
    source: {...sharedSource, note: "Human-reviewed Genre Ability documents promoted losslessly from the private Working pack."},
    target: {systemId: "cypherv2", packId: GENRE_ABILITY_PACK_ID},
    counts: structuredClone(GENRE_ABILITY_COUNTS),
    review: {...structuredClone(abilityCandidate.review), status: "reviewed"},
    abilities: workingAbilities.map(normalizedDocument).sort(compareDocuments)
  };
  const genres = {
    schemaVersion: REVIEWED_GENRE_SCHEMA_VERSION,
    source: sharedSource,
    target: {systemId: "cypherv2", packId: GENRE_PACK_ID, abilityPackId: GENRE_ABILITY_PACK_ID},
    counts: structuredClone(GENRE_COUNTS),
    review: {...structuredClone(candidate.review), status: "reviewed"},
    genres: normalizeGenreReviewDocuments(workingGenres).map(normalizedDocument).sort(compareDocuments)
  };
  validateReviewedGenreAbilitySource(abilities);
  validateReviewedGenreSource(genres, abilities);
  return {abilities, genres};
}

function collectStrings(value, result = []) {
  if (typeof value === "string") result.push(value);
  else if (Array.isArray(value)) for (const entry of value) collectStrings(entry, result);
  else if (value && typeof value === "object") for (const entry of Object.values(value)) collectStrings(entry, result);
  return result;
}

function validateIdentity(document, itemType, location, ids, slugs, errors) {
  if (!FOUNDRY_ID.test(document?._id ?? "")) errors.push(`${location}._id must be a 16-character Foundry ID.`);
  if (ids.has(document?._id)) errors.push(`${location} duplicates Item ID '${document?._id}'.`);
  ids.add(document?._id);
  if (document?._key !== `!items!${document?._id}`) errors.push(`${location}._key must match its Item ID.`);
  if (document?.type !== itemType) errors.push(`${location}.type must be '${itemType}'.`);
  const slug = document?.system?.slug;
  if (!SLUG.test(slug ?? "")) errors.push(`${location}.system.slug is invalid.`);
  if (slugs.has(slug)) errors.push(`${location} duplicates slug '${slug}'.`);
  slugs.add(slug);
}

function assertCleanReferences(value, errors) {
  for (const text of collectStrings(value)) {
    if (/Compendium\.world\.|Compendium\.[A-Za-z0-9_.-]*working|cypher-v2-test|Compendium\.[A-Za-z0-9_.-]*(?:test|staging)/i.test(text)) {
      errors.push(`Reviewed content retains a World, Working, test, or staging reference: '${text}'.`);
    }
  }
}

export function validateReviewedGenreAbilitySource(source) {
  const errors = [];
  if (source?.schemaVersion !== REVIEWED_GENRE_SCHEMA_VERSION) errors.push("schemaVersion must be 1.");
  if (source?.source?.kind !== "reviewed-world-compendium-export" || source?.review?.status !== "reviewed") errors.push("Source must identify the completed human review.");
  if (source?.target?.systemId !== "cypherv2" || source?.target?.packId !== GENRE_ABILITY_PACK_ID) errors.push("Target must identify the public Genre Abilities pack.");
  const abilities = Array.isArray(source?.abilities) ? source.abilities : [];
  const ids = new Set();
  const slugs = new Set();
  abilities.forEach((document, index) => validateIdentity(document, "ability", `abilities[${index}]`, ids, slugs, errors));
  const progression = abilities.filter((document) => document.flags?.cypherv2?.genreAbility?.catalog === "progression");
  const origin = abilities.filter((document) => document.flags?.cypherv2?.genreAbility?.catalog === "origin");
  if (abilities.length !== 69 || progression.length !== 43 || origin.length !== 26) errors.push(`Expected 69 Abilities (43 progression, 26 origin); found ${abilities.length} (${progression.length}/${origin.length}).`);
  if (source?.counts?.abilities !== 69 || source?.counts?.progression !== 43 || source?.counts?.origin !== 26) errors.push("Stored Ability counts are invalid.");
  for (const [slug, id] of Object.entries(REAL_WORLD_IDS)) {
    const ability = abilities.find((entry) => entry.system?.slug === slug);
    const tier = slug.endsWith("tier-3") ? 3 : 6;
    if (ability?._id !== id || ability?.system?.tier !== tier) errors.push(`${slug} must preserve stable ID '${id}' and Tier ${tier}.`);
  }
  const armored = abilities.find((entry) => entry.name === "Armored Body");
  if (armored?.flags?.cypherv2?.genreAbility?.minimumSuperheroRank !== 2) errors.push("Armored Body must preserve minimum Superhero Rank 2.");
  for (const name of ["Incredible Instinct", "Skill Exemplar"]) {
    const ability = abilities.find((entry) => entry.name === name);
    if (!ability?.system?.tags?.includes("tier-3-improvement") || !/At tier 3:/i.test(ability?.system?.description ?? "")) errors.push(`${name} must preserve its Tier 3 improvement.`);
  }
  if (JSON.stringify(origin.map((entry) => entry.name)) !== JSON.stringify(ORIGIN)) errors.push("Origin Ability inventory/order is invalid.");
  if (collectStrings(abilities).some((text) => /typeWhitelist/i.test(text))) errors.push("Origin eligibility must not contain a Type whitelist.");
  assertCleanReferences(abilities, errors);
  if (errors.length) throw new ReviewedGenreValidationError([...new Set(errors)]);
  return source;
}

export function validateReviewedGenreSource(source, abilitySource) {
  validateReviewedGenreAbilitySource(abilitySource);
  const errors = [];
  if (source?.schemaVersion !== REVIEWED_GENRE_SCHEMA_VERSION) errors.push("schemaVersion must be 1.");
  if (source?.source?.kind !== "reviewed-world-compendium-export" || source?.review?.status !== "reviewed") errors.push("Source must identify the completed human review.");
  if (source?.target?.systemId !== "cypherv2" || source?.target?.packId !== GENRE_PACK_ID || source?.target?.abilityPackId !== GENRE_ABILITY_PACK_ID) errors.push("Target must identify both public Genre packs.");
  const genres = Array.isArray(source?.genres) ? source.genres : [];
  const ids = new Set();
  const slugs = new Set();
  genres.forEach((document, index) => validateIdentity(document, "genre", `genres[${index}]`, ids, slugs, errors));
  if (genres.length !== 4 || JSON.stringify(genres.map((entry) => entry.name)) !== JSON.stringify(GENRE_NAMES)) errors.push("Reviewed Genre inventory must contain the four canonical Genres in order.");
  for (const [name, id] of GENRE_IDS) if (genres.find((entry) => entry.name === name)?._id !== id) errors.push(`${name} must preserve stable ID '${id}'.`);

  const abilityById = new Map(abilitySource.abilities.map((document) => [document._id, document]));
  const referencedAbilityIds = new Set();
  let relationCount = 0;
  let progressionCount = 0;
  let originCount = 0;
  for (const genre of genres) {
    const expected = EXPECTED_RELATIONS.get(genre.name);
    const entries = genre.system?.abilityCatalog ?? [];
    const progression = entries.filter((entry) => entry.catalog === "progression");
    const origin = entries.filter((entry) => entry.catalog === "origin");
    if (!expected || progression.length !== expected.progression || origin.length !== expected.origin) errors.push(`${genre.name} relation counts are invalid (${progression.length} progression, ${origin.length} origin).`);
    const localIds = new Set();
    for (const entry of entries) {
      relationCount += 1;
      progressionCount += entry.catalog === "progression" ? 1 : 0;
      originCount += entry.catalog === "origin" ? 1 : 0;
      if (!FOUNDRY_ID.test(entry.id ?? "") || localIds.has(entry.id)) errors.push(`${genre.name} contains invalid or duplicate local relation ID '${entry.id}'.`);
      localIds.add(entry.id);
      const match = String(entry.abilityUuid ?? "").match(PUBLIC_ABILITY_UUID);
      const ability = match ? abilityById.get(match[1]) : undefined;
      if (!ability) errors.push(`${genre.name} contains dangling public Ability UUID '${entry.abilityUuid}'.`);
      else {
        referencedAbilityIds.add(ability._id);
        if (entry.snapshot?.name !== ability.name || JSON.stringify(entry.snapshot?.system) !== JSON.stringify(ability.system)) errors.push(`${genre.name} snapshot for '${ability.name}' differs from the reviewed Ability.`);
      }
    }
  }
  if (relationCount !== 115 || progressionCount !== 89 || originCount !== 26) errors.push(`Expected 115 relations (89 progression, 26 origin); found ${relationCount} (${progressionCount}/${originCount}).`);
  if (source?.counts?.catalogRelations !== 115 || source?.counts?.progressionRelations !== 89 || source?.counts?.originRelations !== 26) errors.push("Stored Genre relation counts are invalid.");
  if (referencedAbilityIds.size !== 69) errors.push(`Expected all 69 Ability documents to be referenced; found ${referencedAbilityIds.size}.`);

  const fantasy = genres.find((entry) => entry.name === "Fantasy");
  const scienceFiction = genres.find((entry) => entry.name === "Science Fiction");
  const superheroes = genres.find((entry) => entry.name === "Superheroes");
  const progressionUuids = (genre) => new Set((genre?.system?.abilityCatalog ?? []).filter((entry) => entry.catalog === "progression").map((entry) => entry.abilityUuid));
  const union = new Set([...progressionUuids(fantasy), ...progressionUuids(scienceFiction)]);
  if (union.size !== 41 || JSON.stringify([...progressionUuids(superheroes)].sort()) !== JSON.stringify([...union].sort())) errors.push("Superheroes progression must be the deduplicated 41-Ability Fantasy/Science Fiction union.");
  for (const name of SHARED_PROGRESSION) {
    const matches = abilitySource.abilities.filter((entry) => entry.name === name && entry.flags?.cypherv2?.genreAbility?.catalog === "progression");
    if (matches.length !== 1) errors.push(`${name} must remain one shared canonical progression Ability document.`);
  }
  const armoredRelation = superheroes?.system?.abilityCatalog?.find((entry) => entry.snapshot?.name === "Armored Body");
  if (armoredRelation?.minimumSuperheroRank !== 2) errors.push("Armored Body relation must preserve minimum Superhero Rank 2.");
  if (superheroes?.system?.options?.totalEffortCapMode !== "unlimited") errors.push("Superheroes must preserve totalEffortCapMode 'unlimited'.");
  assertCleanReferences(genres, errors);
  if (errors.length) throw new ReviewedGenreValidationError([...new Set(errors)]);
  return source;
}

export async function readReviewedGenreSources({genrePath, abilityPath}) {
  const [genres, abilities] = await Promise.all([
    readFile(genrePath, "utf8").then(JSON.parse),
    readFile(abilityPath, "utf8").then(JSON.parse)
  ]);
  validateReviewedGenreSource(genres, abilities);
  return {genres, abilities};
}

export async function writeReviewedGenreSources({genres, abilities}, {genrePath, abilityPath}) {
  validateReviewedGenreSource(genres, abilities);
  await Promise.all([mkdir(path.dirname(genrePath), {recursive: true}), mkdir(path.dirname(abilityPath), {recursive: true})]);
  await Promise.all([
    writeFile(genrePath, `${JSON.stringify(genres, null, 2)}\n`, "utf8"),
    writeFile(abilityPath, `${JSON.stringify(abilities, null, 2)}\n`, "utf8")
  ]);
}

async function writeDocumentDirectory(directory, documents) {
  await rm(directory, {recursive: true, force: true});
  await mkdir(directory, {recursive: true});
  for (const document of [...documents].sort((left, right) => String(left._id).localeCompare(String(right._id)))) {
    await writeFile(path.join(directory, `item-${document._id}.json`), `${JSON.stringify(document, null, 2)}\n`, "utf8");
  }
}

export async function writeReviewedGenrePackSources({genres, abilities}, {generatedRoot}) {
  validateReviewedGenreSource(genres, abilities);
  const directories = {
    [GENRE_ABILITY_PACK_ID]: path.join(generatedRoot, GENRE_ABILITY_PACK_ID),
    [GENRE_PACK_ID]: path.join(generatedRoot, GENRE_PACK_ID)
  };
  await writeDocumentDirectory(directories[GENRE_ABILITY_PACK_ID], abilities.abilities);
  await writeDocumentDirectory(directories[GENRE_PACK_ID], genres.genres);
  return directories;
}

export function assertGenrePackDestination(projectRoot, destination) {
  const packsRoot = path.resolve(projectRoot, "packs") + path.sep;
  const resolved = path.resolve(destination);
  if (!resolved.startsWith(packsRoot) || !REVIEWED_GENRE_PACKS[path.basename(resolved)]) throw new Error(`Refusing to write unexpected Genre pack destination '${resolved}'.`);
}

export async function compileReviewedGenrePacks({projectRoot, sources}) {
  const {compilePack} = await import("@foundryvtt/foundryvtt-cli");
  const packIds = [GENRE_ABILITY_PACK_ID, GENRE_PACK_ID];
  const destinations = Object.fromEntries(packIds.map((packId) => [packId, path.resolve(projectRoot, "packs", packId)]));
  for (const destination of Object.values(destinations)) assertGenrePackDestination(projectRoot, destination);
  const stagingRoot = path.resolve(projectRoot, ".generated", "reviewed-genre-pack-build");
  const backupRoot = path.resolve(projectRoot, ".generated", "reviewed-genre-pack-backup");
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

export function compareReviewedGenreRoundTrip({genres, abilities}, extracted) {
  validateReviewedGenreSource(genres, abilities);
  const normalize = (documents) => documents.map(semanticDocument).sort((left, right) => String(left._id).localeCompare(String(right._id)));
  const genreMatch = JSON.stringify(normalize(genres.genres)) === JSON.stringify(normalize(extracted.genres));
  const abilityMatch = JSON.stringify(normalize(abilities.abilities)) === JSON.stringify(normalize(extracted.abilities));
  return {genreMatch, abilityMatch, matches: genreMatch && abilityMatch, ignoredFields: ["_key", "_stats"]};
}

export function reviewedGenreSummary({genres, abilities}) {
  validateReviewedGenreSource(genres, abilities);
  return {
    genres: genres.genres.length,
    abilities: abilities.abilities.length,
    progression: abilities.abilities.filter((entry) => entry.flags.cypherv2.genreAbility.catalog === "progression").length,
    origin: abilities.abilities.filter((entry) => entry.flags.cypherv2.genreAbility.catalog === "origin").length,
    relations: genres.genres.reduce((total, genre) => total + genre.system.abilityCatalog.length, 0)
  };
}

export function defaultReviewedGenrePaths(projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")) {
  return {
    projectRoot,
    candidate: path.join(projectRoot, "content", "genres", "candidate-pack.json"),
    abilityCandidate: path.join(projectRoot, "content", "genre-abilities", "candidate-pack.json"),
    genreSource: path.join(projectRoot, "content", "genres", "reviewed-pack.json"),
    abilitySource: path.join(projectRoot, "content", "genre-abilities", "reviewed-pack.json"),
    generatedRoot: path.join(projectRoot, ".generated", "reviewed-genre-pack-import")
  };
}
