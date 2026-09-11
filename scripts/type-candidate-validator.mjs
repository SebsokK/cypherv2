import {readFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

export const TYPE_CANDIDATE_SCHEMA_VERSION = 1;
export const TYPE_CANDIDATE_COUNTS = Object.freeze({types: 49, abilities: 106, assignments: 155});
export const TYPE_PACK_ID = "types";
export const TYPE_ABILITY_PACK_ID = "type-abilities";
export const TYPE_ABILITY_UUID_PREFIX = `Compendium.cypherv2.${TYPE_ABILITY_PACK_ID}.Item.`;
export const TYPE_NAMES = Object.freeze([
  "Barbarian", "Bard", "Cleric", "Druid", "Fighter", "Mage", "Monk",
  "Necromancer", "Paladin", "Ranger", "Rogue", "Archer", "Axe Fighter",
  "Knife Fighter", "Priest", "Sorcerer", "Sword Fighter", "Thief",
  "Two-Weapon Fighter", "Witch", "Burglar", "Noble Warrior", "Swashbuckler",
  "Warrior", "Wizard", "Diplomat", "Engineer", "Medic", "Operative", "Pilot",
  "Soldier", "Android", "Noble", "Psion", "Scoundrel", "Starpilot", "Tech",
  "Trader", "Dealer", "Heavy", "Survivor", "Tender", "Crimefighter",
  "Vigilante", "Enhanced Hero", "Powerstar", "Superhuman", "Powerhouse",
  "Living God"
]);

const FOUNDRY_ID_PATTERN = /^[A-Za-z0-9]{16}$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TYPE_ABILITY_UUID_PATTERN = /^Compendium\.cypherv2\.type-abilities\.Item\.([A-Za-z0-9]{16})$/;
const ABILITY_ACTIVATIONS = new Set([
  "action", "firstAction", "lastAction", "enabler", "reaction", "timed",
  "perpetual", "passive", "special"
]);
const POOLS = new Set(["might", "speed", "intellect"]);
const EXPECTED_SUPERHEROES = new Map([
  ["Crimefighter", {rank: 1, powerShiftCount: 2, poolBonus: 0}],
  ["Vigilante", {rank: 1, powerShiftCount: 2, poolBonus: 0}],
  ["Enhanced Hero", {rank: 2, powerShiftCount: 3, poolBonus: 2}],
  ["Powerstar", {rank: 2, powerShiftCount: 3, poolBonus: 2}],
  ["Superhuman", {rank: 3, powerShiftCount: 4, poolBonus: 4}],
  ["Powerhouse", {rank: 4, powerShiftCount: 5, poolBonus: 6}],
  ["Living God", {rank: 5, powerShiftCount: 6, poolBonus: 8}]
]);

export class TypeCandidateValidationError extends Error {
  constructor(errors) {
    super(`Candidate Type content is invalid:\n${errors.map((entry) => `- ${entry}`).join("\n")}`);
    this.name = "TypeCandidateValidationError";
    this.errors = errors;
  }
}

function collectStrings(value, strings = []) {
  if (typeof value === "string") strings.push(value);
  else if (Array.isArray(value)) for (const entry of value) collectStrings(entry, strings);
  else if (value && typeof value === "object") for (const entry of Object.values(value)) collectStrings(entry, strings);
  return strings;
}

function assertUnique(documents, field, label, errors) {
  const seen = new Map();
  for (const document of documents) {
    const value = field === "_id" ? document?._id : document?.system?.slug;
    if (!value) continue;
    const previous = seen.get(value);
    if (previous) errors.push(`${label} has duplicate ${field} '${value}' (${previous}, ${document.name}).`);
    else seen.set(value, document.name);
  }
}

function validateItemIdentity(document, expectedType, location, errors) {
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    errors.push(`${location} must be an Item document.`);
    return;
  }
  if (document.type !== expectedType) errors.push(`${location}.type must be '${expectedType}'.`);
  if (!FOUNDRY_ID_PATTERN.test(document._id ?? "")) errors.push(`${location}._id must be a 16-character Foundry ID.`);
  if (!SLUG_PATTERN.test(document.system?.slug ?? "")) errors.push(`${location}.system.slug must be a stable kebab-case slug.`);
  if (typeof document.name !== "string" || !document.name.trim()) errors.push(`${location}.name must be non-blank.`);
  if (typeof document.system?.description !== "string" || !document.system.description.trim()) errors.push(`${location}.system.description must be reviewed rich text.`);
  if (document._key !== `!items!${document._id}`) errors.push(`${location}._key must match its Item ID.`);
  if (document.system?.source?.book !== "Cypher Reference Document (2026)") errors.push(`${location} has invalid source book metadata.`);
  if (document.system?.source?.license !== "2026 Cypher Open License") errors.push(`${location} has invalid source license metadata.`);
  if (!/^\d+$/.test(document.system?.source?.page ?? "")) errors.push(`${location} must have a numeric CRD source page.`);
}

function validateAbility(document, index, errors) {
  const location = `abilities[${index}]`;
  validateItemIdentity(document, "ability", location, errors);
  const system = document?.system ?? {};
  if (system.tier !== 1) errors.push(`${location}.system.tier must be 1 for a direct Type Ability.`);
  if (system.category !== "type") errors.push(`${location}.system.category must be 'type'.`);
  if (!ABILITY_ACTIVATIONS.has(system.activation)) errors.push(`${location}.system.activation '${system.activation}' is invalid.`);
  const cost = system.cost;
  if (!cost || !Number.isInteger(cost.amount) || cost.amount < 0) errors.push(`${location}.system.cost.amount must be a non-negative integer.`);
  if (typeof cost?.scalable !== "boolean") errors.push(`${location}.system.cost.scalable must be boolean.`);
  if (typeof cost?.ignoresEdge !== "boolean") errors.push(`${location}.system.cost.ignoresEdge must be boolean.`);
  if (!Array.isArray(cost?.allowedPools) || cost.allowedPools.some((pool) => !POOLS.has(pool))) {
    errors.push(`${location}.system.cost.allowedPools contains an invalid Pool.`);
  } else if (new Set(cost.allowedPools).size !== cost.allowedPools.length) {
    errors.push(`${location}.system.cost.allowedPools must be unique.`);
  }
  if (cost?.scalable && (cost.amount < 1 || cost.allowedPools.length === 0)) {
    errors.push(`${location} has invalid scalable-cost serialization.`);
  }
  if (system.roll !== "none" || system.damage !== 0 || system.woundSeverity !== "none" || system.targetMode !== "none") {
    errors.push(`${location} over-automates a candidate Type Ability; runtime fields must remain neutral before review.`);
  }
}

function validateBooleanFlags(value, location, errors) {
  for (const key of ["light", "medium", "heavy"]) {
    if (typeof value?.[key] !== "boolean") errors.push(`${location}.${key} must be boolean.`);
  }
}

function validateType(document, index, abilityIds, assignmentIds, errors) {
  const location = `types[${index}]`;
  validateItemIdentity(document, "characterType", location, errors);
  const system = document?.system ?? {};
  validateBooleanFlags(system.weaponUse, `${location}.system.weaponUse`, errors);
  validateBooleanFlags(system.armorUse, `${location}.system.armorUse`, errors);
  for (const family of ["axes", "knives", "swords"]) {
    if (typeof system.weaponFamilyUse?.[family] !== "boolean") errors.push(`${location}.system.weaponFamilyUse.${family} must be boolean.`);
  }
  if (!Array.isArray(system.abilityGrants)) {
    errors.push(`${location}.system.abilityGrants must be an array.`);
    return 0;
  }
  if ((system.abilityChoiceGroups?.length ?? 0) !== 0) errors.push(`${location} must not contain Origin or Genre Ability choice placeholders.`);
  for (const [grantIndex, grant] of system.abilityGrants.entries()) {
    const grantLocation = `${location}.system.abilityGrants[${grantIndex}]`;
    if (!FOUNDRY_ID_PATTERN.test(grant.id ?? "")) errors.push(`${grantLocation}.id must be a stable 16-character ID.`);
    if (assignmentIds.has(grant.id)) errors.push(`${grantLocation}.id '${grant.id}' is duplicated.`);
    assignmentIds.add(grant.id);
    const match = String(grant.abilityUuid ?? "").match(TYPE_ABILITY_UUID_PATTERN);
    if (!match) errors.push(`${grantLocation}.abilityUuid must target ${TYPE_ABILITY_UUID_PREFIX}<id>.`);
    else if (!abilityIds.has(match[1])) errors.push(`${grantLocation}.abilityUuid targets missing Ability '${match[1]}'.`);
    if (typeof grant.notes !== "string") errors.push(`${grantLocation}.notes must be a string.`);
    if (!grant.snapshot?.name || !grant.snapshot?.system?.slug) errors.push(`${grantLocation}.snapshot must be usable without its source.`);
    if (match && abilityIds.get(match[1])?.name !== grant.snapshot?.name) errors.push(`${grantLocation}.snapshot name does not match its Ability.`);
  }
  return system.abilityGrants.length;
}

export function validateTypeCandidateSource(source) {
  const errors = [];
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new TypeCandidateValidationError(["Source root must be an object."]);
  }
  if (source.schemaVersion !== TYPE_CANDIDATE_SCHEMA_VERSION) errors.push(`schemaVersion must be ${TYPE_CANDIDATE_SCHEMA_VERSION}.`);
  if (source.target?.systemId !== "cypherv2") errors.push("target.systemId must be 'cypherv2'.");
  if (source.target?.typePackId !== TYPE_PACK_ID) errors.push(`target.typePackId must be '${TYPE_PACK_ID}'.`);
  if (source.target?.abilityPackId !== TYPE_ABILITY_PACK_ID) errors.push(`target.abilityPackId must be '${TYPE_ABILITY_PACK_ID}'.`);
  if (!/^[a-f0-9]{64}$/.test(source.source?.sha256 ?? "")) errors.push("source.sha256 must identify the exact CRD input.");
  const types = Array.isArray(source.types) ? source.types : [];
  const abilities = Array.isArray(source.abilities) ? source.abilities : [];
  if (types.length !== TYPE_CANDIDATE_COUNTS.types) errors.push(`Expected 49 Types; found ${types.length}.`);
  if (abilities.length !== TYPE_CANDIDATE_COUNTS.abilities) errors.push(`Expected 106 Type Abilities; found ${abilities.length}.`);
  abilities.forEach((document, index) => validateAbility(document, index, errors));
  assertUnique(types, "_id", "Type catalog", errors);
  assertUnique(types, "system.slug", "Type catalog", errors);
  assertUnique(abilities, "_id", "Type Ability catalog", errors);
  assertUnique(abilities, "system.slug", "Type Ability catalog", errors);
  const abilityIds = new Map(abilities.map((document) => [document._id, document]));
  const assignmentIds = new Set();
  let assignments = 0;
  types.forEach((document, index) => {
    assignments += validateType(document, index, abilityIds, assignmentIds, errors);
  });
  if (assignments !== TYPE_CANDIDATE_COUNTS.assignments) errors.push(`Expected 155 direct assignments; found ${assignments}.`);
  if (JSON.stringify(types.map((document) => document.name)) !== JSON.stringify(TYPE_NAMES)) {
    errors.push("Type names/order do not match the reviewed 49-Type inventory.");
  }
  const typesByName = new Map(types.map((document) => [document.name, document]));
  for (const [name, expected] of EXPECTED_SUPERHEROES) {
    const system = typesByName.get(name)?.system;
    if (!system) {
      errors.push(`Missing Superhero Type '${name}'.`);
      continue;
    }
    if (system.genre !== "superhero") errors.push(`${name} must use the superhero Genre.`);
    if (system.superhero?.rank !== expected.rank) errors.push(`${name} must have rank ${expected.rank}.`);
    if (system.superhero?.powerShiftCount !== expected.powerShiftCount) errors.push(`${name} must have ${expected.powerShiftCount} Power Shifts.`);
    if (system.superhero?.superheroics?.enabled !== true) errors.push(`${name} must require a Superheroics Pool choice.`);
    if (system.superhero?.superheroics?.poolBonus !== expected.poolBonus) errors.push(`${name} must have Superheroics Pool bonus ${expected.poolBonus}.`);
  }
  for (const type of types.filter((document) => !EXPECTED_SUPERHEROES.has(document.name))) {
    const superhero = type.system?.superhero;
    if (superhero?.rank !== 0 || superhero?.powerShiftCount !== 0 || superhero?.superheroics?.enabled !== false || superhero?.superheroics?.poolBonus !== 0) {
      errors.push(`${type.name} must retain neutral Superhero metadata.`);
    }
  }
  const strings = collectStrings(source);
  for (const value of strings) {
    if (/Compendium\.(?:world\.|cypher-v2-test\.)/i.test(value) || /Compendium\.[A-Za-z0-9_.-]*working/i.test(value)) {
      errors.push(`Candidate source contains a World/Working reference: '${value}'.`);
    }
    for (const match of value.matchAll(/Compendium\.cypherv2\.type-abilities\.Item\.([A-Za-z0-9]{16})/g)) {
      if (!abilityIds.has(match[1])) errors.push(`Candidate source contains dangling Type Ability UUID '${match[0]}'.`);
    }
    if (/origin superhero abilit/i.test(value) && !value.includes("intentionally absent")) {
      errors.push(`Candidate source contains an Origin Superhero Ability placeholder/reference: '${value}'.`);
    }
  }
  if (source.counts?.types !== types.length || source.counts?.abilities !== abilities.length || source.counts?.assignments !== assignments) {
    errors.push("Stored candidate counts do not match document contents.");
  }
  if (errors.length > 0) throw new TypeCandidateValidationError([...new Set(errors)]);
  return source;
}

export async function readTypeCandidateSource(filePath) {
  return validateTypeCandidateSource(JSON.parse(await readFile(filePath, "utf8")));
}

export function typeCandidateSummary(source) {
  validateTypeCandidateSource(source);
  const scalableCosts = source.abilities.filter((document) => document.system.cost.scalable).length;
  const multiPoolCosts = source.abilities.filter((document) => document.system.cost.allowedPools.length > 1).length;
  const assignmentNotes = source.types.flatMap((document) => document.system.abilityGrants).filter((grant) => grant.notes).length;
  return {
    types: source.types.length,
    abilities: source.abilities.length,
    assignments: source.types.reduce((total, document) => total + document.system.abilityGrants.length, 0),
    scalableCosts,
    multiPoolCosts,
    assignmentNotes,
    superheroes: source.types.filter((document) => document.system.genre === "superhero").length
  };
}

export function defaultTypeCandidatePath(projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")) {
  return path.join(projectRoot, "content", "types", "candidate-pack.json");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const source = await readTypeCandidateSource(defaultTypeCandidatePath());
  console.log(JSON.stringify(typeCandidateSummary(source), null, 2));
}
