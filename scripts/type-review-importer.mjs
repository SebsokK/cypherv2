import {access, mkdir, readFile, rename, rm, writeFile} from "node:fs/promises";
import path from "node:path";

import {
  TYPE_CANDIDATE_COUNTS,
  readTypeCandidateSource,
  validateTypeCandidateSource
} from "./type-candidate-validator.mjs";

export const TYPE_REVIEW_PACK_ID = "types-working";
export const TYPE_ABILITY_REVIEW_PACK_ID = "type-abilities-working";
export const TYPE_REVIEW_LABEL = "Types (Working)";
export const TYPE_ABILITY_REVIEW_LABEL = "Type Abilities (Working)";
export const TYPE_ABILITY_PUBLIC_PREFIX = "Compendium.cypherv2.type-abilities.Item.";
export const TYPE_ABILITY_REVIEW_PREFIX = "Compendium.world.type-abilities-working.Item.";

const exists = (target) => access(target).then(() => true, () => false);

function clone(value) {
  return structuredClone(value);
}

function mapStrings(value, transform) {
  if (typeof value === "string") return transform(value);
  if (Array.isArray(value)) return value.map((entry) => mapStrings(entry, transform));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, mapStrings(entry, transform)]));
  }
  return value;
}

function replacePrefix(value, from, to) {
  return value.includes(from) ? value.split(from).join(to) : value;
}

export function createTypeReviewDocuments(candidate) {
  validateTypeCandidateSource(candidate);
  const types = mapStrings(clone(candidate.types), (value) => replacePrefix(value, TYPE_ABILITY_PUBLIC_PREFIX, TYPE_ABILITY_REVIEW_PREFIX));
  const abilities = clone(candidate.abilities);
  validateTypeReviewDocuments({types, abilities});
  return {types, abilities};
}

export function validateTypeReviewDocuments({types, abilities}) {
  const errors = [];
  if (types.length !== TYPE_CANDIDATE_COUNTS.types) errors.push(`Expected 49 Types; found ${types.length}.`);
  if (abilities.length !== TYPE_CANDIDATE_COUNTS.abilities) errors.push(`Expected 106 Type Abilities; found ${abilities.length}.`);
  const abilityIds = new Set(abilities.map((document) => document._id));
  if (abilityIds.size !== abilities.length) errors.push("Duplicate Type Ability IDs in review documents.");
  const typeIds = new Set(types.map((document) => document._id));
  if (typeIds.size !== types.length) errors.push("Duplicate Type IDs in review documents.");
  const assignmentIds = new Set();
  let assignments = 0;
  for (const type of types) {
    for (const grant of type.system?.abilityGrants ?? []) {
      assignments += 1;
      if (assignmentIds.has(grant.id)) errors.push(`Duplicate assignment ID '${grant.id}'.`);
      assignmentIds.add(grant.id);
      if (!String(grant.abilityUuid).startsWith(TYPE_ABILITY_REVIEW_PREFIX)) {
        errors.push(`${type.name} has a non-review Ability UUID '${grant.abilityUuid}'.`);
        continue;
      }
      const abilityId = String(grant.abilityUuid).slice(TYPE_ABILITY_REVIEW_PREFIX.length);
      if (!abilityIds.has(abilityId)) errors.push(`${type.name} references missing Type Ability '${abilityId}'.`);
    }
  }
  if (assignments !== TYPE_CANDIDATE_COUNTS.assignments) errors.push(`Expected 155 assignments; found ${assignments}.`);
  const serialized = JSON.stringify({types, abilities});
  if (serialized.includes(TYPE_ABILITY_PUBLIC_PREFIX)) errors.push("A public Type Ability UUID remains in the private review documents.");
  if (/origin superhero abilit/i.test(serialized) && !serialized.includes("intentionally absent")) {
    errors.push("Review documents contain an Origin Superhero Ability reference.");
  }
  if (errors.length) throw new Error(`Type review documents are invalid:\n- ${errors.join("\n- ")}`);
  return {types: types.length, abilities: abilities.length, assignments};
}

export function compareTypeReviewRoundTrip(candidate, review) {
  validateTypeCandidateSource(candidate);
  validateTypeReviewDocuments(review);
  const reviewTypes = new Map(review.types.map((document) => [document._id, document]));
  const reviewAbilities = new Map(review.abilities.map((document) => [document._id, document]));
  const restoredTypes = candidate.types.map((document) => mapStrings(clone(reviewTypes.get(document._id)), (value) => replacePrefix(value, TYPE_ABILITY_REVIEW_PREFIX, TYPE_ABILITY_PUBLIC_PREFIX)));
  const restoredAbilities = candidate.abilities.map((document) => reviewAbilities.get(document._id));
  const typeMatch = JSON.stringify(restoredTypes) === JSON.stringify(candidate.types);
  const abilityMatch = JSON.stringify(restoredAbilities) === JSON.stringify(candidate.abilities);
  return {typeMatch, abilityMatch, matches: typeMatch && abilityMatch};
}

async function writeDocumentDirectory(directory, documents) {
  await rm(directory, {recursive: true, force: true});
  await mkdir(directory, {recursive: true});
  for (const document of documents) {
    await writeFile(path.join(directory, `item-${document._id}.json`), `${JSON.stringify(document, null, 2)}\n`, "utf8");
  }
}

function packManifestEntry(name, label) {
  return {
    name,
    label,
    path: `packs/${name}`,
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

export async function importTypeReview({candidatePath, projectRoot, worldDirectory}) {
  const candidate = await readTypeCandidateSource(candidatePath);
  const review = createTypeReviewDocuments(candidate);
  const worldPath = path.resolve(worldDirectory);
  const manifestPath = path.join(worldPath, "world.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.id !== path.basename(worldPath) || manifest.system !== "cypherv2") {
    throw new Error(`Refusing to import into unexpected World '${worldPath}'.`);
  }

  const generatedRoot = path.resolve(projectRoot, ".generated", "type-review-source");
  const stagingRoot = path.resolve(projectRoot, ".generated", "type-review-build");
  const backupRoot = path.resolve(projectRoot, ".generated", "type-review-backup");
  await rm(generatedRoot, {recursive: true, force: true});
  await rm(stagingRoot, {recursive: true, force: true});
  await rm(backupRoot, {recursive: true, force: true});
  await mkdir(stagingRoot, {recursive: true});
  await mkdir(backupRoot, {recursive: true});

  const sourceDirectories = {
    [TYPE_REVIEW_PACK_ID]: path.join(generatedRoot, TYPE_REVIEW_PACK_ID),
    [TYPE_ABILITY_REVIEW_PACK_ID]: path.join(generatedRoot, TYPE_ABILITY_REVIEW_PACK_ID)
  };
  await writeDocumentDirectory(sourceDirectories[TYPE_REVIEW_PACK_ID], review.types);
  await writeDocumentDirectory(sourceDirectories[TYPE_ABILITY_REVIEW_PACK_ID], review.abilities);

  const {compilePack} = await import("@foundryvtt/foundryvtt-cli");
  for (const packId of [TYPE_REVIEW_PACK_ID, TYPE_ABILITY_REVIEW_PACK_ID]) {
    await compilePack(sourceDirectories[packId], path.join(stagingRoot, packId), {log: true});
  }

  const packsDirectory = path.join(worldPath, "packs");
  const destinations = Object.fromEntries([TYPE_REVIEW_PACK_ID, TYPE_ABILITY_REVIEW_PACK_ID].map((packId) => [packId, path.join(packsDirectory, packId)]));
  const manifestBackup = path.join(backupRoot, "world.json");
  await writeFile(manifestBackup, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  const backedUp = [];
  const installed = [];
  try {
    for (const packId of [TYPE_REVIEW_PACK_ID, TYPE_ABILITY_REVIEW_PACK_ID]) {
      if (await exists(destinations[packId])) {
        await rename(destinations[packId], path.join(backupRoot, packId));
        backedUp.push(packId);
      }
      await rename(path.join(stagingRoot, packId), destinations[packId]);
      installed.push(packId);
    }
    manifest.packs ??= [];
    upsertPack(manifest.packs, packManifestEntry(TYPE_REVIEW_PACK_ID, TYPE_REVIEW_LABEL));
    upsertPack(manifest.packs, packManifestEntry(TYPE_ABILITY_REVIEW_PACK_ID, TYPE_ABILITY_REVIEW_LABEL));
    const temporaryManifest = path.join(worldPath, "world.json.cypherv2-review-tmp");
    await writeFile(temporaryManifest, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    await rm(manifestPath, {force: true});
    await rename(temporaryManifest, manifestPath);
  } catch (error) {
    for (const packId of installed.reverse()) await rm(destinations[packId], {recursive: true, force: true});
    for (const packId of backedUp.reverse()) await rename(path.join(backupRoot, packId), destinations[packId]);
    await writeFile(manifestPath, await readFile(manifestBackup));
    throw error;
  }
  await rm(stagingRoot, {recursive: true, force: true});
  await rm(backupRoot, {recursive: true, force: true});
  return {...validateTypeReviewDocuments(review), roundTrip: compareTypeReviewRoundTrip(candidate, review), destinations};
}
