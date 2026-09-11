import {readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import path from "node:path";
import {fileURLToPath} from "node:url";

export const GENRE_ABILITY_CANDIDATE_SCHEMA_VERSION = 1;
export const GENRE_ABILITY_COUNTS = Object.freeze({abilities: 69, progression: 43, origin: 26, relations: 74});
export const REAL_WORLD_MID = Object.freeze(["Additional Skill (Tier 3)"]);
export const REAL_WORLD_HIGH = Object.freeze(["Additional Skill (Tier 6)"]);
export const REAL_WORLD_IDS = Object.freeze({
  "additional-skill-tier-3": "fREdI45SXu0WPeeS",
  "additional-skill-tier-6": "xXSq03yZHRS978cj"
});
export const FANTASY_MID = Object.freeze([
  "A Bit of Magic", "Cypher Use", "Danger Instinct", "Disappear Into Shadow", "Discerning Mind",
  "Elemental Protection", "Enhanced Stat", "Exceptional Follower", "From the Shadows", "Fury",
  "Pry Open Defense", "Puncturing Attack", "Snipe", "Strategize", "Tough", "Winning Smile"
]);
export const FANTASY_HIGH = Object.freeze([
  "Assassin Strike", "Concussive Force", "Inspire Action", "Invisibility", "Jump Attack", "Magic Portal",
  "Mask", "Resilience", "Spellbreaker", "Spin Attack", "Will of a Leader"
]);
export const SCIENCE_FICTION_MID = Object.freeze([
  "Black Thumb", "Cypher Use", "Disable Mechanism", "Enhanced Stat", "Exceptional Follower",
  "Hands on the Wheel", "Incredible Health", "Machine Companion", "Mind Reading", "Snipe", "Spray"
]);
export const SCIENCE_FICTION_HIGH = Object.freeze([
  "Arc Spray", "Improved Machine Companion", "Inspire Action", "Knowledge Expert", "Lethal Capability",
  "Severe Machine Disruption", "Technology Expert", "Telepathic Network"
]);
export const ORIGIN = Object.freeze([
  "Adhesive Mobility", "Amazing Invulnerability", "Amazing Tools", "Armored Body", "Astonishing Teleport",
  "Awesome Force Field", "Duplicate", "Extraordinary Leap", "Fantastic Armament", "Fantastic Vehicle",
  "Incredible Instinct", "Incredible Velocity", "Intangible", "Invisible Knack", "Power Cypher Use",
  "Powerful Blast", "Regenerative Healing", "Shrink", "Skill Exemplar", "Stretchy", "Superhero Versatility",
  "Team-Up Ally", "Telepathic Prodigy", "Unbelievable Transformation", "Uncanny Flight", "Unyielding Shield"
]);

const FOUNDRY_ID = /^[A-Za-z0-9]{16}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ABILITY_UUID = /^Compendium\.cypherv2\.genre-abilities\.Item\.([A-Za-z0-9]{16})$/;
const ACTIVATIONS = new Set(["action", "firstAction", "lastAction", "enabler", "reaction", "timed", "perpetual", "passive", "special"]);
const POOLS = new Set(["might", "speed", "intellect"]);
const ROLLS = new Set(["none", "task", "attack", "defense"]);

export class GenreAbilityCandidateValidationError extends Error {
  constructor(errors) {
    super(`Candidate Genre Ability content is invalid:\n${errors.map((entry) => `- ${entry}`).join("\n")}`);
    this.name = "GenreAbilityCandidateValidationError";
    this.errors = errors;
  }
}

function unique(values) {
  return new Set(values).size === values.length;
}

function stableId(kind, key) {
  return createHash("sha256").update(`cypherv2-beta3:${kind}:${key}`).digest("hex").slice(0, 16);
}

function expectedAbilityId(slug) {
  return REAL_WORLD_IDS[slug] ?? stableId("genre-ability", slug);
}

function collectStrings(value, result = []) {
  if (typeof value === "string") result.push(value);
  else if (Array.isArray(value)) value.forEach((entry) => collectStrings(entry, result));
  else if (value && typeof value === "object") Object.values(value).forEach((entry) => collectStrings(entry, result));
  return result;
}

function expectedProgressionNames() {
  return [...FANTASY_MID, ...FANTASY_HIGH, ...SCIENCE_FICTION_MID, ...SCIENCE_FICTION_HIGH]
    .filter((name, index, values) => values.indexOf(name) === index);
}

function validateAbility(document, index, errors) {
  const location = `abilities[${index}]`;
  if (document?.type !== "ability") errors.push(`${location}.type must be 'ability'.`);
  if (!FOUNDRY_ID.test(document?._id ?? "")) errors.push(`${location}._id must be a 16-character Foundry ID.`);
  if (document?._id !== expectedAbilityId(document?.system?.slug ?? "")) errors.push(`${location}._id is not the preserved/deterministic ID for its slug.`);
  if (document?._key !== `!items!${document?._id}`) errors.push(`${location}._key must match its Item ID.`);
  if (!SLUG.test(document?.system?.slug ?? "")) errors.push(`${location}.system.slug must be stable kebab-case.`);
  if (!String(document?.system?.description ?? "").trim()) errors.push(`${location}.system.description must contain CRD rich text.`);
  if (document?.system?.source?.book !== "Cypher Reference Document (2026)") errors.push(`${location} has invalid source book metadata.`);
  if (document?.system?.source?.license !== "2026 Cypher Open License") errors.push(`${location} has invalid source license metadata.`);
  if (!String(document?.system?.source?.page ?? "").trim()) errors.push(`${location} must preserve CRD page provenance.`);
  if (!Array.isArray(document?.system?.ruleElements) || document.system.ruleElements.length !== 0) errors.push(`${location} must not contain speculative ruleElements.`);
  if (!ACTIVATIONS.has(document?.system?.activation)) errors.push(`${location}.system.activation is unsupported.`);
  if (!ROLLS.has(document?.system?.roll)) errors.push(`${location}.system.roll is unsupported.`);
  if (!Array.isArray(document?.system?.cost?.allowedPools) || !document.system.cost.allowedPools.every((pool) => POOLS.has(pool))) errors.push(`${location}.system.cost.allowedPools is invalid.`);
  if (!unique(document?.system?.cost?.allowedPools ?? [])) errors.push(`${location}.system.cost.allowedPools contains duplicates.`);
  const metadata = document?.flags?.cypherv2?.genreAbility;
  if (!metadata || !["progression", "origin"].includes(metadata.catalog)) errors.push(`${location} lacks the progression/origin discriminator.`);
  if (!Array.isArray(metadata?.genres) || metadata.genres.length < 1) errors.push(`${location} lacks Genre membership metadata.`);
  if (metadata?.catalog === "origin" && (metadata.progressionBand !== "origin" || JSON.stringify(metadata.genres) !== JSON.stringify(["superhero"]))) errors.push(`${location} has invalid Origin metadata.`);
  if (metadata?.catalog === "progression" && !["mid-tier", "high-tier"].includes(metadata.progressionBand)) errors.push(`${location} has invalid progression-band metadata.`);
}

function validateCatalog(source, genre, expectedMid, expectedHigh, abilityById, relationIds, errors) {
  const entries = source.catalogs?.[genre]?.entries ?? [];
  const expected = [...expectedMid, ...expectedHigh];
  if (source.catalogs?.[genre]?.catalog !== "progression") errors.push(`${genre} catalog must be progression.`);
  if (entries.length !== expected.length) errors.push(`${genre} catalog must contain ${expected.length} relations; found ${entries.length}.`);
  const names = [];
  for (const [index, entry] of entries.entries()) {
    const location = `catalogs.${genre}.entries[${index}]`;
    if (!FOUNDRY_ID.test(entry?.id ?? "")) errors.push(`${location}.id must be stable.`);
    if (relationIds.has(entry?.id)) errors.push(`${location}.id '${entry?.id}' is duplicated.`);
    relationIds.add(entry?.id);
    const match = String(entry?.abilityUuid ?? "").match(ABILITY_UUID);
    const ability = match ? abilityById.get(match[1]) : undefined;
    if (!match || !ability) errors.push(`${location}.abilityUuid is dangling or does not target the future public pack.`);
    else names.push(ability.name);
    const expectedTier = index < expectedMid.length ? 3 : 6;
    if (ability && entry?.id !== stableId("genre-relation", `${genre}:${expectedTier === 3 ? "mid-tier" : "high-tier"}:${ability.system.slug}`)) errors.push(`${location}.id is not deterministic.`);
    if (entry?.catalog !== "progression" || entry?.minimumTier !== expectedTier || entry?.minimumSuperheroRank !== 0) errors.push(`${location} has invalid progression relation metadata.`);
    if (ability && (entry.snapshot?.name !== ability.name || JSON.stringify(entry.snapshot?.system) !== JSON.stringify(ability.system))) errors.push(`${location}.snapshot drifted from its Ability.`);
  }
  if (JSON.stringify(names) !== JSON.stringify(expected)) errors.push(`${genre} relation order/membership does not match the CRD inventory.`);
}

export function validateGenreAbilityCandidateSource(source) {
  const errors = [];
  if (!source || typeof source !== "object" || Array.isArray(source)) throw new GenreAbilityCandidateValidationError(["Source root must be an object."]);
  if (source.schemaVersion !== GENRE_ABILITY_CANDIDATE_SCHEMA_VERSION) errors.push("schemaVersion must be 1.");
  if (source.target?.systemId !== "cypherv2" || source.target?.futurePackId !== "genre-abilities") errors.push("Candidate target metadata is invalid.");
  if (!/^[a-f0-9]{64}$/.test(source.source?.sha256 ?? "")) errors.push("source.sha256 must identify the exact CRD input.");
  if (source.source?.file !== "Cypher-Reference-Document-2026-07-29.docx" || source.source?.license !== "2026 Cypher Open License") errors.push("Candidate source/provenance metadata is invalid.");
  if (JSON.stringify(source.inventory?.progression?.realWorld?.midTier) !== JSON.stringify(REAL_WORLD_MID)) errors.push("Real World mid-tier inventory mismatch.");
  if (JSON.stringify(source.inventory?.progression?.realWorld?.highTier) !== JSON.stringify(REAL_WORLD_HIGH)) errors.push("Real World high-tier inventory mismatch.");
  if (JSON.stringify(source.inventory?.progression?.fantasy?.midTier) !== JSON.stringify(FANTASY_MID)) errors.push("Fantasy mid-tier inventory mismatch.");
  if (JSON.stringify(source.inventory?.progression?.fantasy?.highTier) !== JSON.stringify(FANTASY_HIGH)) errors.push("Fantasy high-tier inventory mismatch.");
  if (JSON.stringify(source.inventory?.progression?.scienceFiction?.midTier) !== JSON.stringify(SCIENCE_FICTION_MID)) errors.push("Science Fiction mid-tier inventory mismatch.");
  if (JSON.stringify(source.inventory?.progression?.scienceFiction?.highTier) !== JSON.stringify(SCIENCE_FICTION_HIGH)) errors.push("Science Fiction high-tier inventory mismatch.");
  if (JSON.stringify(source.inventory?.origin) !== JSON.stringify(ORIGIN)) errors.push("Origin inventory mismatch.");

  const abilities = Array.isArray(source.abilities) ? source.abilities : [];
  if (abilities.length !== GENRE_ABILITY_COUNTS.abilities) errors.push(`Expected ${GENRE_ABILITY_COUNTS.abilities} Ability documents; found ${abilities.length}.`);
  if (source.counts?.abilities !== abilities.length || source.counts?.progression !== 43 || source.counts?.origin !== 26 || source.counts?.relations !== 74) errors.push("Stored counts are invalid.");
  const expectedNames = [...expectedProgressionNames(), ...ORIGIN, ...REAL_WORLD_MID, ...REAL_WORLD_HIGH];
  if (JSON.stringify(abilities.map((document) => document.name)) !== JSON.stringify(expectedNames)) errors.push("Ability names/order do not match the reviewed 69-item inventory.");
  if (!unique(abilities.map((document) => document._id))) errors.push("Ability IDs must be unique.");
  if (!unique(abilities.map((document) => document.system?.slug))) errors.push("Ability slugs must be unique.");
  abilities.forEach((document, index) => validateAbility(document, index, errors));
  const progression = abilities.filter((document) => document.flags?.cypherv2?.genreAbility?.catalog === "progression");
  const origin = abilities.filter((document) => document.flags?.cypherv2?.genreAbility?.catalog === "origin");
  if (progression.length !== 43) errors.push(`Expected 43 progression documents; found ${progression.length}.`);
  if (origin.length !== 26) errors.push(`Expected 26 Origin documents; found ${origin.length}.`);

  const abilityById = new Map(abilities.map((document) => [document._id, document]));
  const relationIds = new Set();
  validateCatalog(source, "realWorld", REAL_WORLD_MID, REAL_WORLD_HIGH, abilityById, relationIds, errors);
  validateCatalog(source, "fantasy", FANTASY_MID, FANTASY_HIGH, abilityById, relationIds, errors);
  validateCatalog(source, "scienceFiction", SCIENCE_FICTION_MID, SCIENCE_FICTION_HIGH, abilityById, relationIds, errors);
  const superhero = source.catalogs?.superhero;
  if (superhero?.catalog !== "origin" || superhero?.eligibility !== "genre" || (superhero?.typeWhitelist?.length ?? -1) !== 0) errors.push("Origin eligibility must be the shared Superhero Genre catalog without a Type whitelist.");
  if ((superhero?.entries?.length ?? 0) !== 26) errors.push("Superhero Origin catalog must contain 26 relations.");
  const superheroNames = [];
  for (const [index, entry] of (superhero?.entries ?? []).entries()) {
    const location = `catalogs.superhero.entries[${index}]`;
    if (!FOUNDRY_ID.test(entry?.id ?? "") || relationIds.has(entry?.id)) errors.push(`${location}.id is invalid or duplicated.`);
    relationIds.add(entry?.id);
    const match = String(entry?.abilityUuid ?? "").match(ABILITY_UUID);
    const ability = match ? abilityById.get(match[1]) : undefined;
    if (!ability) errors.push(`${location}.abilityUuid is dangling.`);
    else superheroNames.push(ability.name);
    if (ability && entry?.id !== stableId("genre-relation", `superhero:origin:${ability.system.slug}`)) errors.push(`${location}.id is not deterministic.`);
    const expectedRank = ability?.name === "Armored Body" ? 2 : 0;
    if (entry?.catalog !== "origin" || entry?.minimumTier !== 1 || entry?.minimumSuperheroRank !== expectedRank) errors.push(`${location} has invalid Origin relation metadata.`);
    if (ability && (entry.snapshot?.name !== ability.name || JSON.stringify(entry.snapshot?.system) !== JSON.stringify(ability.system))) errors.push(`${location}.snapshot drifted from its Ability.`);
  }
  if (JSON.stringify(superheroNames) !== JSON.stringify(ORIGIN)) errors.push("Superhero Origin relation order/membership mismatch.");
  if (relationIds.size !== GENRE_ABILITY_COUNTS.relations) errors.push(`Expected ${GENRE_ABILITY_COUNTS.relations} unique relations; found ${relationIds.size}.`);

  const armored = abilities.find((document) => document.name === "Armored Body");
  if (armored?.flags?.cypherv2?.genreAbility?.minimumSuperheroRank !== 2) errors.push("Armored Body must preserve Superhero Rank 2+.");
  for (const name of ["Incredible Instinct", "Skill Exemplar"]) {
    const ability = abilities.find((document) => document.name === name);
    if (ability?.flags?.cypherv2?.genreAbility?.catalog !== "origin" || !/At tier 3:/i.test(ability?.system?.description ?? "") || !ability?.system?.tags?.includes("tier-3-improvement")) errors.push(`${name} must remain one Tier 1 Origin choice with its Tier 3 improvement.`);
  }
  for (const [name, id, tier, band] of [
    ["Additional Skill (Tier 3)", "fREdI45SXu0WPeeS", 3, "mid-tier"],
    ["Additional Skill (Tier 6)", "xXSq03yZHRS978cj", 6, "high-tier"]
  ]) {
    const ability = abilities.find((document) => document.name === name);
    if (ability?._id !== id || ability?.system?.tier !== tier || ability?.flags?.cypherv2?.genreAbility?.progressionBand !== band || JSON.stringify(ability?.flags?.cypherv2?.genreAbility?.genres) !== JSON.stringify(["realWorld"])) errors.push(`${name} must preserve its Working identity and Real World progression metadata.`);
  }
  if ((source.review?.sameNameCollisions?.length ?? 0) !== 14 || source.review.sameNameCollisions.some((entry) => entry.reused)) errors.push("Same-name audit must preserve all independently sourced colliding Genre Ability documents.");

  for (const value of collectStrings(source)) {
    if (/Compendium\.(?:world\.|cypher-v2-test\.)/i.test(value) || /Compendium\.[A-Za-z0-9_.-]*working/i.test(value)) errors.push(`Candidate contains a World/Working reference: '${value}'.`);
    if (/Compendium\.[A-Za-z0-9_.-]*(?:test|staging)/i.test(value)) errors.push(`Candidate contains a test/staging reference: '${value}'.`);
  }
  if (errors.length) throw new GenreAbilityCandidateValidationError([...new Set(errors)]);
  return source;
}

export function genreAbilityCandidateSummary(source) {
  validateGenreAbilityCandidateSource(source);
  const abilities = source.abilities;
  const activations = Object.fromEntries([...ACTIVATIONS].map((activation) => [activation, abilities.filter((document) => document.system.activation === activation).length]));
  const progression = abilities.filter((document) => document.flags.cypherv2.genreAbility.catalog === "progression");
  return {
    ...source.counts,
    progressionMembership: {
      realWorldOnly: progression.filter((document) => JSON.stringify(document.flags.cypherv2.genreAbility.genres) === JSON.stringify(["realWorld"])).length,
      fantasyOnly: progression.filter((document) => JSON.stringify(document.flags.cypherv2.genreAbility.genres) === JSON.stringify(["fantasy"])).length,
      scienceFictionOnly: progression.filter((document) => JSON.stringify(document.flags.cypherv2.genreAbility.genres) === JSON.stringify(["scienceFiction"])).length,
      shared: progression.filter((document) => document.flags.cypherv2.genreAbility.genres.length === 2).length,
      midTier: progression.filter((document) => document.flags.cypherv2.genreAbility.progressionBand === "mid-tier").length,
      highTier: progression.filter((document) => document.flags.cypherv2.genreAbility.progressionBand === "high-tier").length
    },
    structured: {
      fixedPoolCosts: abilities.filter((document) => document.system.cost.amount > 0 && document.system.cost.allowedPools.length === 1).length,
      scalableCosts: abilities.filter((document) => document.system.cost.scalable).length,
      multiPoolCosts: abilities.filter((document) => document.system.cost.allowedPools.length > 1).length,
      activations,
      damage: abilities.filter((document) => document.system.damage > 0).length,
      range: abilities.filter((document) => document.system.range).length,
      duration: abilities.filter((document) => document.system.automation.duration.enabled).length,
      minimumSuperheroRank: abilities.filter((document) => document.flags.cypherv2.genreAbility.minimumSuperheroRank > 0).length
    }
  };
}

export function defaultGenreAbilityCandidatePath(projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")) {
  return path.join(projectRoot, "content", "genre-abilities", "candidate-pack.json");
}

export async function readGenreAbilityCandidateSource(filePath = defaultGenreAbilityCandidatePath()) {
  return validateGenreAbilityCandidateSource(JSON.parse(await readFile(filePath, "utf8")));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const source = await readGenreAbilityCandidateSource();
  console.log(JSON.stringify(genreAbilityCandidateSummary(source), null, 2));
}
