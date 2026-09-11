import {createHash} from "node:crypto";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {validateGenreAbilityCandidateSource} from "./genre-ability-candidate-validator.mjs";

export const GENRE_CANDIDATE_SCHEMA_VERSION = 1;
export const GENRE_NAMES = Object.freeze(["The Real World", "Fantasy", "Science Fiction", "Superheroes"]);
export const GENRE_COUNTS = Object.freeze({genres: 4, progressionRelations: 89, originRelations: 26, catalogRelations: 115});

const FOUNDRY_ID = /^[A-Za-z0-9]{16}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ABILITY_UUID = /^Compendium\.cypherv2\.genre-abilities\.Item\.([A-Za-z0-9]{16})$/;
const EXPECTED = Object.freeze([
  {key: "realWorld", name: "The Real World", heading: "The Real World Genre", subgenres: ["Espionage", "Crime Thriller", "Action", "Rescue", "Historical", "Real-World Horror", "Modern Magic"], progressionCatalog: "realWorld", originCatalog: false},
  {key: "fantasy", name: "Fantasy", heading: "Fantasy Genre", subgenres: ["Dungeon Fantasy", "Swords & Sorcery", "Epic Fantasy"], progressionCatalog: "fantasy", originCatalog: false},
  {key: "scienceFiction", name: "Science Fiction", heading: "Science Fiction Genre", subgenres: ["Hard Science Fiction", "Space Opera", "Postapocalypse"], progressionCatalog: "scienceFiction", originCatalog: false},
  {key: "superhero", name: "Superheroes", heading: "Superheroes Genre", subgenres: [], progressionCatalog: "fantasy-and-science-fiction", originCatalog: true}
]);

export class GenreCandidateValidationError extends Error {
  constructor(errors) {
    super(`Candidate Genre content is invalid:\n${errors.map((entry) => `- ${entry}`).join("\n")}`);
    this.name = "GenreCandidateValidationError";
    this.errors = errors;
  }
}

function stableId(kind, key) {
  return createHash("sha256").update(`cypherv2-beta3:${kind}:${key}`).digest("hex").slice(0, 16);
}

function collectStrings(value, result = []) {
  if (typeof value === "string") result.push(value);
  else if (Array.isArray(value)) value.forEach((entry) => collectStrings(entry, result));
  else if (value && typeof value === "object") Object.values(value).forEach((entry) => collectStrings(entry, result));
  return result;
}

function superheroProgression(abilitySource) {
  const result = [];
  const seen = new Set();
  for (const catalogName of ["fantasy", "scienceFiction"]) {
    for (const entry of abilitySource.catalogs[catalogName].entries) {
      if (seen.has(entry.abilityUuid)) continue;
      seen.add(entry.abilityUuid);
      result.push(entry);
    }
  }
  return result;
}

function validateEntry(entry, location, abilityById, errors) {
  if (!FOUNDRY_ID.test(entry?.id ?? "")) errors.push(`${location}.id must be a stable 16-character relation ID.`);
  const match = String(entry?.abilityUuid ?? "").match(ABILITY_UUID);
  const ability = match ? abilityById.get(match[1]) : undefined;
  if (!ability) errors.push(`${location}.abilityUuid is dangling or does not target the canonical Genre Ability pack.`);
  if (!FOUNDRY_ID.test(entry?.id ?? "") || !["progression", "origin"].includes(entry?.catalog)) errors.push(`${location} has invalid catalog metadata.`);
  if (!Number.isInteger(entry?.minimumTier) || entry.minimumTier < 1 || entry.minimumTier > 6) errors.push(`${location}.minimumTier is invalid.`);
  if (!Number.isInteger(entry?.minimumSuperheroRank) || entry.minimumSuperheroRank < 0 || entry.minimumSuperheroRank > 5) errors.push(`${location}.minimumSuperheroRank is invalid.`);
  if (ability && (entry.snapshot?.name !== ability.name || JSON.stringify(entry.snapshot?.system) !== JSON.stringify(ability.system))) errors.push(`${location}.snapshot drifted from its Ability source.`);
  return ability;
}

export function validateGenreCandidateSource(source, abilitySource) {
  validateGenreAbilityCandidateSource(abilitySource);
  const errors = [];
  if (!source || typeof source !== "object" || Array.isArray(source)) throw new GenreCandidateValidationError(["Source root must be an object."]);
  if (source.schemaVersion !== GENRE_CANDIDATE_SCHEMA_VERSION) errors.push("schemaVersion must be 1.");
  if (source.target?.systemId !== "cypherv2" || source.target?.futurePackId !== "genres" || source.target?.abilityPackId !== "genre-abilities") errors.push("Candidate target metadata is invalid.");
  if (source.source?.file !== "Cypher-Reference-Document-2026-07-29.docx" || source.source?.license !== "2026 Cypher Open License") errors.push("Candidate source/provenance metadata is invalid.");
  if (source.source?.sha256 !== abilitySource.source.sha256) errors.push("Genre and Genre Ability candidates must identify the same exact CRD source.");
  if (JSON.stringify(source.counts) !== JSON.stringify(GENRE_COUNTS)) errors.push("Stored Genre counts are invalid.");
  if (!Array.isArray(source.inventory) || source.inventory.length !== 4) errors.push("Inventory must contain exactly four chapter-level Genres.");
  for (const [index, expected] of EXPECTED.entries()) {
    const actual = source.inventory?.[index];
    for (const field of ["key", "name", "heading", "progressionCatalog", "originCatalog"]) {
      if (actual?.[field] !== expected[field]) errors.push(`inventory[${index}].${field} does not match the CRD audit.`);
    }
    if (JSON.stringify(actual?.subgenres) !== JSON.stringify(expected.subgenres)) errors.push(`inventory[${index}].subgenres does not match the CRD audit.`);
  }

  const genres = Array.isArray(source.genres) ? source.genres : [];
  if (genres.length !== 4) errors.push(`Expected 4 Genre documents; found ${genres.length}.`);
  if (JSON.stringify(genres.map((document) => document.name)) !== JSON.stringify(GENRE_NAMES)) errors.push("Genre names/order do not match the exact CRD inventory.");
  if (new Set(genres.map((document) => document._id)).size !== genres.length) errors.push("Genre IDs must be unique.");
  if (new Set(genres.map((document) => document.system?.slug)).size !== genres.length) errors.push("Genre slugs must be unique.");

  const abilityById = new Map(abilitySource.abilities.map((document) => [document._id, document]));
  const usedRelationIds = new Set();
  const catalogs = {
    realWorld: abilitySource.catalogs.realWorld.entries,
    fantasy: abilitySource.catalogs.fantasy.entries,
    scienceFiction: abilitySource.catalogs.scienceFiction.entries,
    superhero: [...superheroProgression(abilitySource), ...abilitySource.catalogs.superhero.entries]
  };
  const expectedLengths = {realWorld: 2, fantasy: 27, scienceFiction: 19, superhero: 67};

  genres.forEach((document, index) => {
    const expected = EXPECTED[index];
    const location = `genres[${index}]`;
    if (document?.type !== "genre") errors.push(`${location}.type must be 'genre'.`);
    if (!FOUNDRY_ID.test(document?._id ?? "")) errors.push(`${location}._id must be a 16-character Foundry ID.`);
    if (!SLUG.test(document?.system?.slug ?? "")) errors.push(`${location}.system.slug must be stable kebab-case.`);
    if (document?._id !== stableId("genre", document?.system?.slug ?? "")) errors.push(`${location}._id is not deterministic.`);
    if (document?._key !== `!items!${document?._id}`) errors.push(`${location}._key must match the Item ID.`);
    if (document?.system?.legacyKey !== expected?.key) errors.push(`${location}.system.legacyKey is invalid.`);
    if (!String(document?.system?.description ?? "").trim()) errors.push(`${location}.system.description must contain CRD rich text.`);
    if (document?.system?.source?.book !== "Cypher Reference Document (2026)" || document?.system?.source?.license !== "2026 Cypher Open License" || !String(document?.system?.source?.page ?? "").trim()) errors.push(`${location} has invalid CRD provenance.`);
    if (!Array.isArray(document?.system?.ruleElements) || document.system.ruleElements.length !== 0) errors.push(`${location} must not contain speculative ruleElements.`);
    const expectedMode = expected?.key === "superhero" ? "unlimited" : "core";
    if (document?.system?.options?.totalEffortCapMode !== expectedMode) errors.push(`${location} has invalid total Effort cap mode.`);
    const actualCatalog = document?.system?.abilityCatalog ?? [];
    if (actualCatalog.length !== expectedLengths[expected?.key]) errors.push(`${location} has ${actualCatalog.length} catalog entries; expected ${expectedLengths[expected?.key]}.`);
    if (JSON.stringify(actualCatalog) !== JSON.stringify(catalogs[expected?.key])) errors.push(`${location} catalog does not reuse the canonical reviewed Genre Ability relations exactly.`);
    const localIds = new Set();
    actualCatalog.forEach((entry, entryIndex) => {
      validateEntry(entry, `${location}.system.abilityCatalog[${entryIndex}]`, abilityById, errors);
      if (localIds.has(entry.id)) errors.push(`${location} contains duplicate relation ID '${entry.id}'.`);
      localIds.add(entry.id);
      usedRelationIds.add(entry.id);
    });
  });

  const fantasy = genres.find((document) => document.name === "Fantasy")?.system.abilityCatalog ?? [];
  const scienceFiction = genres.find((document) => document.name === "Science Fiction")?.system.abilityCatalog ?? [];
  const superheroes = genres.find((document) => document.name === "Superheroes")?.system.abilityCatalog ?? [];
  const realWorld = genres.find((document) => document.name === "The Real World")?.system.abilityCatalog ?? [];
  if (realWorld.length !== 2 || realWorld[0]?.snapshot?.name !== "Additional Skill (Tier 3)" || realWorld[0]?.minimumTier !== 3 || realWorld[1]?.snapshot?.name !== "Additional Skill (Tier 6)" || realWorld[1]?.minimumTier !== 6) errors.push("The Real World must preserve its Tier 3 and Tier 6 progression relations.");
  if (fantasy.filter((entry) => entry.catalog === "progression" && entry.minimumTier === 3).length !== 16 || fantasy.filter((entry) => entry.catalog === "progression" && entry.minimumTier === 6).length !== 11) errors.push("Fantasy must preserve 16 mid-tier and 11 high-tier relations.");
  if (scienceFiction.filter((entry) => entry.catalog === "progression" && entry.minimumTier === 3).length !== 11 || scienceFiction.filter((entry) => entry.catalog === "progression" && entry.minimumTier === 6).length !== 8) errors.push("Science Fiction must preserve 11 mid-tier and 8 high-tier relations.");
  if (superheroes.filter((entry) => entry.catalog === "progression").length !== 41 || superheroes.filter((entry) => entry.catalog === "origin").length !== 26) errors.push("Superheroes must expose 41 unique progression and 26 Origin relations.");
  const armored = superheroes.find((entry) => entry.snapshot?.name === "Armored Body");
  if (armored?.catalog !== "origin" || armored?.minimumSuperheroRank !== 2) errors.push("Armored Body must remain an Origin relation requiring Superhero Rank 2+.");
  if (collectStrings(source).some((value) => /typeWhitelist/i.test(value))) errors.push("Genre candidates must not contain a Superhero Type whitelist.");

  const canonicalRelationIds = new Set([
    ...abilitySource.catalogs.realWorld.entries,
    ...abilitySource.catalogs.fantasy.entries,
    ...abilitySource.catalogs.scienceFiction.entries,
    ...abilitySource.catalogs.superhero.entries
  ].map((entry) => entry.id));
  if (usedRelationIds.size !== canonicalRelationIds.size || [...canonicalRelationIds].some((id) => !usedRelationIds.has(id))) errors.push("At least one canonical Genre Ability relation is orphaned from the Genre Items.");
  for (const value of collectStrings(source)) {
    if (/Compendium\.(?:world\.|cypher-v2-test\.)/i.test(value) || /Compendium\.[A-Za-z0-9_.-]*working/i.test(value)) errors.push(`Candidate contains a World/Working reference: '${value}'.`);
    if (/Compendium\.[A-Za-z0-9_.-]*(?:test|staging)/i.test(value)) errors.push(`Candidate contains a test/staging reference: '${value}'.`);
  }
  if (errors.length) throw new GenreCandidateValidationError([...new Set(errors)]);
  return source;
}

export function genreCandidateSummary(source, abilitySource) {
  validateGenreCandidateSource(source, abilitySource);
  return {
    ...source.counts,
    catalogs: Object.fromEntries(source.genres.map((genre) => [genre.system.legacyKey, {
      progression: genre.system.abilityCatalog.filter((entry) => entry.catalog === "progression").length,
      origin: genre.system.abilityCatalog.filter((entry) => entry.catalog === "origin").length
    }]))
  };
}

export function defaultGenreCandidatePath(projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")) {
  return path.join(projectRoot, "content", "genres", "candidate-pack.json");
}

export function defaultGenreAbilityCandidatePath(projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")) {
  return path.join(projectRoot, "content", "genre-abilities", "candidate-pack.json");
}

export async function readGenreCandidateSource(candidatePath = defaultGenreCandidatePath(), abilityPath = defaultGenreAbilityCandidatePath()) {
  const [source, abilities] = await Promise.all([
    readFile(candidatePath, "utf8").then(JSON.parse),
    readFile(abilityPath, "utf8").then(JSON.parse)
  ]);
  return validateGenreCandidateSource(source, abilities);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const [source, abilities] = await Promise.all([
    readFile(defaultGenreCandidatePath(projectRoot), "utf8").then(JSON.parse),
    readFile(defaultGenreAbilityCandidatePath(projectRoot), "utf8").then(JSON.parse)
  ]);
  console.log(JSON.stringify(genreCandidateSummary(source, abilities), null, 2));
}
