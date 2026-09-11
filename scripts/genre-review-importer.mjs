import {access, mkdir, readFile, rename, rm, writeFile} from "node:fs/promises";
import path from "node:path";

import {GENRE_COUNTS, validateGenreCandidateSource} from "./genre-candidate-validator.mjs";

export const GENRE_REVIEW_PACK_ID = "genres-working";
export const GENRE_REVIEW_LABEL = "Genres (Working)";
export const GENRE_ABILITY_REVIEW_PACK_ID = "genre-abilities-working";

const CANONICAL_PREFIX = "Compendium.cypherv2.genre-abilities.Item.";
const WORKING_PREFIX = `Compendium.world.${GENRE_ABILITY_REVIEW_PACK_ID}.Item.`;
const exists = (target) => access(target).then(() => true, () => false);

function rewriteAbilityUuid(value, fromPrefix, toPrefix) {
  if (!String(value).startsWith(fromPrefix)) throw new Error(`Unexpected Genre Ability UUID '${value}'.`);
  return `${toPrefix}${String(value).slice(fromPrefix.length)}`;
}

function rewriteDocuments(documents, fromPrefix, toPrefix) {
  return structuredClone(documents).map((document) => ({
    ...document,
    system: {
      ...document.system,
      abilityCatalog: document.system.abilityCatalog.map((entry) => ({
        ...entry,
        abilityUuid: rewriteAbilityUuid(entry.abilityUuid, fromPrefix, toPrefix)
      }))
    }
  }));
}

export function createGenreReviewDocuments(candidate, abilitySource) {
  validateGenreCandidateSource(candidate, abilitySource);
  const genres = rewriteDocuments(candidate.genres, CANONICAL_PREFIX, WORKING_PREFIX);
  validateGenreReviewDocuments(genres, candidate, abilitySource);
  return genres;
}

export function normalizeGenreReviewDocuments(genres) {
  return rewriteDocuments(genres, WORKING_PREFIX, CANONICAL_PREFIX);
}

export function validateGenreReviewDocuments(genres, candidate, abilitySource) {
  validateGenreCandidateSource(candidate, abilitySource);
  const errors = [];
  if (genres.length !== GENRE_COUNTS.genres) errors.push(`Expected 4 Genre review documents; found ${genres.length}.`);
  if (new Set(genres.map((document) => document._id)).size !== genres.length) errors.push("Duplicate Genre IDs in Working documents.");
  const workingAbilityIds = new Set(abilitySource.abilities.map((document) => document._id));
  let relations = 0;
  for (const genre of genres) {
    const localIds = new Set();
    for (const entry of genre.system?.abilityCatalog ?? []) {
      relations += 1;
      if (localIds.has(entry.id)) errors.push(`${genre.name} contains duplicate relation ID '${entry.id}'.`);
      localIds.add(entry.id);
      const match = String(entry.abilityUuid).match(/^Compendium\.world\.genre-abilities-working\.Item\.([A-Za-z0-9]{16})$/);
      if (!match || !workingAbilityIds.has(match[1])) errors.push(`${genre.name} contains dangling Working Ability UUID '${entry.abilityUuid}'.`);
    }
  }
  if (relations !== GENRE_COUNTS.catalogRelations) errors.push(`Expected ${GENRE_COUNTS.catalogRelations} Working catalog relations; found ${relations}.`);
  const serialized = JSON.stringify(genres);
  if (serialized.includes(CANONICAL_PREFIX)) errors.push("Working Genre documents still contain canonical public Genre Ability UUIDs.");
  if (/Compendium\.(?:cypher-v2-test\.|world\.(?!genre-abilities-working\.))/i.test(serialized)) errors.push("Working Genre documents contain an unexpected World/test reference.");
  if (errors.length) throw new Error(`Genre review documents are invalid:\n- ${errors.join("\n- ")}`);
  return {genres: genres.length, relations};
}

export function compareGenreReviewRoundTrip(candidate, reviewGenres, abilitySource) {
  validateGenreReviewDocuments(reviewGenres, candidate, abilitySource);
  const reviewById = new Map(normalizeGenreReviewDocuments(reviewGenres).map((document) => [document._id, document]));
  const normalized = candidate.genres.map((document) => reviewById.get(document._id));
  const genreMatch = JSON.stringify(normalized) === JSON.stringify(candidate.genres);
  return {
    genreMatch,
    matches: genreMatch,
    ignoredVolatileFields: [],
    normalizedFields: ["system.abilityCatalog[].abilityUuid (Working namespace -> canonical namespace)"]
  };
}

async function writeDocumentDirectory(directory, documents) {
  await rm(directory, {recursive: true, force: true});
  await mkdir(directory, {recursive: true});
  for (const document of documents) {
    await writeFile(path.join(directory, `item-${document._id}.json`), `${JSON.stringify(document, null, 2)}\n`, "utf8");
  }
}

function packManifestEntry() {
  return {
    name: GENRE_REVIEW_PACK_ID,
    label: GENRE_REVIEW_LABEL,
    path: `packs/${GENRE_REVIEW_PACK_ID}`,
    type: "Item",
    system: "cypherv2",
    ownership: {PLAYER: "OBSERVER", ASSISTANT: "OWNER"},
    flags: {},
    package: "world"
  };
}

function upsertPack(packs, entry) {
  const index = packs.findIndex((pack) => pack.name === entry.name);
  if (index < 0) packs.push(entry);
  else packs[index] = {...packs[index], ...entry};
}

export async function importGenreReview({candidatePath, abilityCandidatePath, projectRoot, worldDirectory}) {
  const [candidate, abilitySource] = await Promise.all([
    readFile(candidatePath, "utf8").then(JSON.parse),
    readFile(abilityCandidatePath, "utf8").then(JSON.parse)
  ]);
  validateGenreCandidateSource(candidate, abilitySource);
  const genres = createGenreReviewDocuments(candidate, abilitySource);
  const worldPath = path.resolve(worldDirectory);
  const manifestPath = path.join(worldPath, "world.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.id !== path.basename(worldPath) || manifest.system !== "cypherv2") throw new Error(`Refusing to import into unexpected World '${worldPath}'.`);
  if (!(manifest.packs ?? []).some((pack) => pack.name === GENRE_ABILITY_REVIEW_PACK_ID)) throw new Error(`World '${worldPath}' does not register ${GENRE_ABILITY_REVIEW_PACK_ID}.`);
  if (!(await exists(path.join(worldPath, "packs", GENRE_ABILITY_REVIEW_PACK_ID)))) throw new Error("Genre Abilities (Working) pack is unavailable.");

  const generatedRoot = path.resolve(projectRoot, ".generated", "genre-review-source");
  const stagingRoot = path.resolve(projectRoot, ".generated", "genre-review-build");
  const backupRoot = path.resolve(projectRoot, ".generated", "genre-review-backup");
  await rm(generatedRoot, {recursive: true, force: true});
  await rm(stagingRoot, {recursive: true, force: true});
  await rm(backupRoot, {recursive: true, force: true});
  await mkdir(stagingRoot, {recursive: true});
  await mkdir(backupRoot, {recursive: true});

  const sourceDirectory = path.join(generatedRoot, GENRE_REVIEW_PACK_ID);
  const stagedPack = path.join(stagingRoot, GENRE_REVIEW_PACK_ID);
  const destination = path.join(worldPath, "packs", GENRE_REVIEW_PACK_ID);
  await writeDocumentDirectory(sourceDirectory, genres);
  const {compilePack} = await import("@foundryvtt/foundryvtt-cli");
  await compilePack(sourceDirectory, stagedPack, {log: true});

  const manifestBackup = path.join(backupRoot, "world.json");
  const packBackup = path.join(backupRoot, GENRE_REVIEW_PACK_ID);
  await writeFile(manifestBackup, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  let packBackedUp = false;
  let packInstalled = false;
  try {
    if (await exists(destination)) {
      await rename(destination, packBackup);
      packBackedUp = true;
    }
    await rename(stagedPack, destination);
    packInstalled = true;
    manifest.packs ??= [];
    upsertPack(manifest.packs, packManifestEntry());
    const temporaryManifest = path.join(worldPath, "world.json.cypherv2-genre-review-tmp");
    await writeFile(temporaryManifest, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    await rm(manifestPath, {force: true});
    await rename(temporaryManifest, manifestPath);
  } catch (error) {
    if (packInstalled) await rm(destination, {recursive: true, force: true});
    if (packBackedUp) await rename(packBackup, destination);
    await writeFile(manifestPath, await readFile(manifestBackup));
    throw error;
  }
  await rm(stagingRoot, {recursive: true, force: true});
  await rm(backupRoot, {recursive: true, force: true});
  return {
    ...validateGenreReviewDocuments(genres, candidate, abilitySource),
    roundTrip: compareGenreReviewRoundTrip(candidate, genres, abilitySource),
    destination
  };
}
