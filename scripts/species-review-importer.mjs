import {access, mkdir, readFile, rename, rm, writeFile} from "node:fs/promises";
import path from "node:path";

import {
  SPECIES_CANDIDATE_COUNT,
  createSpeciesReferenceCatalogs,
  validateSpeciesCandidateSource
} from "./species-candidate-validator.mjs";

export const SPECIES_REVIEW_PACK_ID = "species-working";
export const SPECIES_REVIEW_LABEL = "Species (Working)";

const exists = (target) => access(target).then(() => true, () => false);

export function createSpeciesReviewDocuments(candidate, references) {
  validateSpeciesCandidateSource(candidate, references);
  const species = structuredClone(candidate.species);
  validateSpeciesReviewDocuments(species, references);
  return species;
}

export function validateSpeciesReviewDocuments(species, references) {
  const orderedSpecies = [...species].sort((left, right) => Number(left.sort ?? 0) - Number(right.sort ?? 0));
  const reviewSource = {
    $schema: "./schema.json",
    schemaVersion: 1,
    source: {
      kind: "official-reference-document-extraction",
      title: "Cypher Reference Document (2026)",
      file: "Cypher-Reference-Document-2026-07-29.docx",
      sha256: "0".repeat(64),
      license: "2026 Cypher Open License",
      note: "Private Working validation wrapper."
    },
    target: {systemId: "cypherv2", futurePackId: "species"},
    inventory: {
      fantasy: ["Dragonfolk", "Dwarf", "Elf", "Gnome", "Halfling", "Hellborn", "Human", "Orc"],
      scienceFiction: ["Aarak", "Cyborg", "Delph", "D’nec", "Drakain", "Human", "Mutant", "Naron", "Prota", "Rigellian", "Stelan", "Vendeer", "Zantari"]
    },
    counts: {species: species.length},
    review: {},
    species: orderedSpecies
  };
  validateSpeciesCandidateSource(reviewSource, references);
  return {species: species.length};
}

export function compareSpeciesReviewRoundTrip(candidate, reviewSpecies, references) {
  validateSpeciesCandidateSource(candidate, references);
  validateSpeciesReviewDocuments(reviewSpecies, references);
  const reviewById = new Map(reviewSpecies.map((document) => [document._id, document]));
  const normalized = candidate.species.map((document) => reviewById.get(document._id));
  const matches = JSON.stringify(normalized) === JSON.stringify(candidate.species);
  return {speciesMatch: matches, matches};
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
    name: SPECIES_REVIEW_PACK_ID,
    label: SPECIES_REVIEW_LABEL,
    path: `packs/${SPECIES_REVIEW_PACK_ID}`,
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

export async function importSpeciesReview({candidatePath, referencePath, projectRoot, worldDirectory}) {
  const [candidate, coreSource] = await Promise.all([
    readFile(candidatePath, "utf8").then(JSON.parse),
    readFile(referencePath, "utf8").then(JSON.parse)
  ]);
  const references = createSpeciesReferenceCatalogs(coreSource);
  validateSpeciesCandidateSource(candidate, references);
  const species = createSpeciesReviewDocuments(candidate, references);
  const worldPath = path.resolve(worldDirectory);
  const manifestPath = path.join(worldPath, "world.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.id !== path.basename(worldPath) || manifest.system !== "cypherv2") {
    throw new Error(`Refusing to import into unexpected World '${worldPath}'.`);
  }

  const generatedRoot = path.resolve(projectRoot, ".generated", "species-review-source");
  const stagingRoot = path.resolve(projectRoot, ".generated", "species-review-build");
  const backupRoot = path.resolve(projectRoot, ".generated", "species-review-backup");
  await rm(generatedRoot, {recursive: true, force: true});
  await rm(stagingRoot, {recursive: true, force: true});
  await rm(backupRoot, {recursive: true, force: true});
  await mkdir(stagingRoot, {recursive: true});
  await mkdir(backupRoot, {recursive: true});

  const sourceDirectory = path.join(generatedRoot, SPECIES_REVIEW_PACK_ID);
  const stagedPack = path.join(stagingRoot, SPECIES_REVIEW_PACK_ID);
  const destination = path.join(worldPath, "packs", SPECIES_REVIEW_PACK_ID);
  await writeDocumentDirectory(sourceDirectory, species);
  const {compilePack} = await import("@foundryvtt/foundryvtt-cli");
  await compilePack(sourceDirectory, stagedPack, {log: true});

  const manifestBackup = path.join(backupRoot, "world.json");
  const packBackup = path.join(backupRoot, SPECIES_REVIEW_PACK_ID);
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
    const temporaryManifest = path.join(worldPath, "world.json.cypherv2-species-review-tmp");
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
  const counts = validateSpeciesReviewDocuments(species, references);
  return {
    ...counts,
    roundTrip: compareSpeciesReviewRoundTrip(candidate, species, references),
    destination
  };
}
