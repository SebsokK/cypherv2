import {access, mkdir, readFile, rename, rm, writeFile} from "node:fs/promises";
import path from "node:path";

import {
  GENRE_ABILITY_COUNTS,
  validateGenreAbilityCandidateSource
} from "./genre-ability-candidate-validator.mjs";

export const GENRE_ABILITY_REVIEW_PACK_ID = "genre-abilities-working";
export const GENRE_ABILITY_REVIEW_LABEL = "Genre Abilities (Working)";

const exists = (target) => access(target).then(() => true, () => false);

export function createGenreAbilityReviewDocuments(candidate) {
  validateGenreAbilityCandidateSource(candidate);
  const abilities = structuredClone(candidate.abilities);
  validateGenreAbilityReviewDocuments(abilities);
  return abilities;
}

export function validateGenreAbilityReviewDocuments(abilities) {
  const errors = [];
  if (abilities.length !== GENRE_ABILITY_COUNTS.abilities) errors.push(`Expected ${GENRE_ABILITY_COUNTS.abilities} Genre Abilities; found ${abilities.length}.`);
  if (new Set(abilities.map((document) => document._id)).size !== abilities.length) errors.push("Duplicate Genre Ability IDs in Working documents.");
  if (new Set(abilities.map((document) => document.system?.slug)).size !== abilities.length) errors.push("Duplicate Genre Ability slugs in Working documents.");
  const progression = abilities.filter((document) => document.flags?.cypherv2?.genreAbility?.catalog === "progression");
  const origin = abilities.filter((document) => document.flags?.cypherv2?.genreAbility?.catalog === "origin");
  if (progression.length !== GENRE_ABILITY_COUNTS.progression) errors.push(`Expected ${GENRE_ABILITY_COUNTS.progression} progression Abilities; found ${progression.length}.`);
  if (origin.length !== GENRE_ABILITY_COUNTS.origin) errors.push(`Expected 26 Origin Abilities; found ${origin.length}.`);
  if (abilities.some((document) => (document.system?.ruleElements?.length ?? 0) !== 0)) errors.push("Working documents contain speculative ruleElements.");
  const serialized = JSON.stringify(abilities);
  if (/Compendium\.(?:world\.|cypher-v2-test\.)/i.test(serialized) || /Compendium\.[A-Za-z0-9_.-]*working/i.test(serialized)) errors.push("Working Ability documents unexpectedly contain World/Working references.");
  if (errors.length) throw new Error(`Genre Ability review documents are invalid:\n- ${errors.join("\n- ")}`);
  return {abilities: abilities.length, progression: progression.length, origin: origin.length};
}

export function compareGenreAbilityReviewRoundTrip(candidate, reviewAbilities) {
  validateGenreAbilityCandidateSource(candidate);
  validateGenreAbilityReviewDocuments(reviewAbilities);
  const reviewById = new Map(reviewAbilities.map((document) => [document._id, document]));
  const normalized = candidate.abilities.map((document) => reviewById.get(document._id));
  const abilityMatch = JSON.stringify(normalized) === JSON.stringify(candidate.abilities);
  return {abilityMatch, matches: abilityMatch, ignoredVolatileFields: []};
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
    name: GENRE_ABILITY_REVIEW_PACK_ID,
    label: GENRE_ABILITY_REVIEW_LABEL,
    path: `packs/${GENRE_ABILITY_REVIEW_PACK_ID}`,
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

export async function importGenreAbilityReview({candidatePath, projectRoot, worldDirectory}) {
  const candidate = JSON.parse(await readFile(candidatePath, "utf8"));
  validateGenreAbilityCandidateSource(candidate);
  const abilities = createGenreAbilityReviewDocuments(candidate);
  const worldPath = path.resolve(worldDirectory);
  const manifestPath = path.join(worldPath, "world.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.id !== path.basename(worldPath) || manifest.system !== "cypherv2") throw new Error(`Refusing to import into unexpected World '${worldPath}'.`);

  const generatedRoot = path.resolve(projectRoot, ".generated", "genre-ability-review-source");
  const stagingRoot = path.resolve(projectRoot, ".generated", "genre-ability-review-build");
  const backupRoot = path.resolve(projectRoot, ".generated", "genre-ability-review-backup");
  await rm(generatedRoot, {recursive: true, force: true});
  await rm(stagingRoot, {recursive: true, force: true});
  await rm(backupRoot, {recursive: true, force: true});
  await mkdir(stagingRoot, {recursive: true});
  await mkdir(backupRoot, {recursive: true});

  const sourceDirectory = path.join(generatedRoot, GENRE_ABILITY_REVIEW_PACK_ID);
  const stagedPack = path.join(stagingRoot, GENRE_ABILITY_REVIEW_PACK_ID);
  const destination = path.join(worldPath, "packs", GENRE_ABILITY_REVIEW_PACK_ID);
  await writeDocumentDirectory(sourceDirectory, abilities);
  const {compilePack} = await import("@foundryvtt/foundryvtt-cli");
  await compilePack(sourceDirectory, stagedPack, {log: true});

  const manifestBackup = path.join(backupRoot, "world.json");
  const packBackup = path.join(backupRoot, GENRE_ABILITY_REVIEW_PACK_ID);
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
    const temporaryManifest = path.join(worldPath, "world.json.cypherv2-genre-ability-review-tmp");
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
    ...validateGenreAbilityReviewDocuments(abilities),
    roundTrip: compareGenreAbilityReviewRoundTrip(candidate, abilities),
    destination
  };
}
