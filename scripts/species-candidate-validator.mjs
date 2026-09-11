import {readFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

export const SPECIES_CANDIDATE_SCHEMA_VERSION = 1;
export const SPECIES_CANDIDATE_COUNT = 20;
export const SPECIES_NAMES = Object.freeze([
  "Dragonfolk", "Dwarf", "Elf", "Gnome", "Halfling", "Hellborn", "Human", "Orc",
  "Aarak", "Cyborg", "Delph", "D’nec", "Drakain", "Mutant", "Naron", "Prota",
  "Rigellian", "Stelan", "Vendeer", "Zantari"
]);
export const FANTASY_SPECIES_NAMES = Object.freeze([
  "Dragonfolk", "Dwarf", "Elf", "Gnome", "Halfling", "Hellborn", "Human", "Orc"
]);
export const SCIENCE_FICTION_SPECIES_NAMES = Object.freeze([
  "Aarak", "Cyborg", "Delph", "D’nec", "Drakain", "Human", "Mutant", "Naron",
  "Prota", "Rigellian", "Stelan", "Vendeer", "Zantari"
]);

const FOUNDRY_ID_PATTERN = /^[A-Za-z0-9]{16}$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SKILL_UUID_PATTERN = /^Compendium\.cypherv2\.skills\.Item\.([A-Za-z0-9]{16})$/;
const DESCRIPTOR_UUID_PATTERN = /^Compendium\.cypherv2\.descriptors\.Item\.([A-Za-z0-9]{16})$/;

export class SpeciesCandidateValidationError extends Error {
  constructor(errors) {
    super(`Candidate Species content is invalid:\n${errors.map((entry) => `- ${entry}`).join("\n")}`);
    this.name = "SpeciesCandidateValidationError";
    this.errors = errors;
  }
}

function collectStrings(value, strings = []) {
  if (typeof value === "string") strings.push(value);
  else if (Array.isArray(value)) for (const entry of value) collectStrings(entry, strings);
  else if (value && typeof value === "object") for (const entry of Object.values(value)) collectStrings(entry, strings);
  return strings;
}

function uniqueValues(values) {
  return new Set(values).size === values.length;
}

function itemDocuments(source, packId, type) {
  return (source?.packs?.[packId]?.documents ?? []).filter((document) => document.type === type);
}

export function createSpeciesReferenceCatalogs(coreSource) {
  const skills = new Map(itemDocuments(coreSource, "skills", "skill").map((document) => [document._id, document]));
  const descriptors = new Map(itemDocuments(coreSource, "descriptors", "descriptor").map((document) => [document._id, document]));
  return {skills, descriptors};
}

function validateFlags(value, location, errors) {
  for (const category of ["light", "medium", "heavy"]) {
    if (typeof value?.[category] !== "boolean") errors.push(`${location}.${category} must be boolean.`);
  }
}

function validateSnapshot(snapshot, expected, location, errors) {
  if (!snapshot || typeof snapshot !== "object" || !snapshot.name || !snapshot.system) {
    errors.push(`${location}.snapshot must be a usable public Item snapshot.`);
    return;
  }
  if (expected && (snapshot.name !== expected.name || snapshot.img !== expected.img || JSON.stringify(snapshot.system) !== JSON.stringify(expected.system))) {
    errors.push(`${location}.snapshot does not match its public source Item.`);
  }
}

function validateSkillOption(option, location, references, ids, errors, fixed = false) {
  if (!FOUNDRY_ID_PATTERN.test(option?.id ?? "")) errors.push(`${location}.id must be a stable 16-character ID.`);
  if (ids.has(option?.id)) errors.push(`${location}.id '${option?.id}' is duplicated.`);
  ids.add(option?.id);
  const match = String(option?.skillUuid ?? "").match(SKILL_UUID_PATTERN);
  if (!match) errors.push(`${location}.skillUuid must target the public Skills pack.`);
  const source = match ? references.skills.get(match[1]) : undefined;
  if (match && !source) errors.push(`${location}.skillUuid targets missing Skill '${match[1]}'.`);
  if (option?.customName !== "") errors.push(`${location}.customName must remain blank for a canonical public Skill.`);
  if (typeof option?.notes !== "string") errors.push(`${location}.notes must be a string.`);
  if (fixed && option?.rank !== "trained") errors.push(`${location}.rank must be 'trained'.`);
  validateSnapshot(option?.snapshot, source, location, errors);
}

function validateDescriptorOption(option, location, references, ids, errors) {
  if (!FOUNDRY_ID_PATTERN.test(option?.id ?? "")) errors.push(`${location}.id must be a stable 16-character ID.`);
  if (ids.has(option?.id)) errors.push(`${location}.id '${option?.id}' is duplicated.`);
  ids.add(option?.id);
  const match = String(option?.descriptorUuid ?? "").match(DESCRIPTOR_UUID_PATTERN);
  if (!match) errors.push(`${location}.descriptorUuid must target the public Descriptors pack.`);
  const source = match ? references.descriptors.get(match[1]) : undefined;
  if (match && !source) errors.push(`${location}.descriptorUuid targets missing Descriptor '${match[1]}'.`);
  validateSnapshot(option?.snapshot, source, location, errors);
}

function descriptorChoiceSourceMode(group) {
  return group?.sourceMode ?? "fixed";
}

function validateSpecies(document, index, references, grantIds, errors) {
  const location = `species[${index}]`;
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    errors.push(`${location} must be an Item document.`);
    return;
  }
  if (document.type !== "species") errors.push(`${location}.type must be 'species'.`);
  if (!FOUNDRY_ID_PATTERN.test(document._id ?? "")) errors.push(`${location}._id must be a 16-character Foundry ID.`);
  if (!SLUG_PATTERN.test(document.system?.slug ?? "")) errors.push(`${location}.system.slug must be stable kebab-case.`);
  if (document._key !== `!items!${document._id}`) errors.push(`${location}._key must match its Item ID.`);
  if (typeof document.system?.description !== "string" || !document.system.description.trim()) errors.push(`${location}.system.description must be rich text.`);
  if (document.system?.source?.book !== "Cypher Reference Document (2026)") errors.push(`${location} has invalid source book metadata.`);
  if (document.system?.source?.license !== "2026 Cypher Open License") errors.push(`${location} has invalid source license metadata.`);
  if (!String(document.system?.source?.page ?? "").trim()) errors.push(`${location} must preserve a CRD page reference.`);
  if (!Array.isArray(document.system?.ruleElements) || document.system.ruleElements.length !== 0) errors.push(`${location} must not contain speculative ruleElements.`);
  validateFlags(document.system?.weaponUse, `${location}.system.weaponUse`, errors);
  validateFlags(document.system?.armorUse, `${location}.system.armorUse`, errors);
  if (!Array.isArray(document.system?.weaponFamilies)) errors.push(`${location}.system.weaponFamilies must be an array.`);

  for (const [grantIndex, grant] of (document.system?.skillGrants ?? []).entries()) {
    validateSkillOption(grant, `${location}.system.skillGrants[${grantIndex}]`, references, grantIds, errors, true);
  }
  for (const [groupIndex, group] of (document.system?.choiceGroups ?? []).entries()) {
    const groupLocation = `${location}.system.choiceGroups[${groupIndex}]`;
    if (!FOUNDRY_ID_PATTERN.test(group?.id ?? "")) errors.push(`${groupLocation}.id must be a stable 16-character ID.`);
    if (grantIds.has(group?.id)) errors.push(`${groupLocation}.id '${group?.id}' is duplicated.`);
    grantIds.add(group?.id);
    if (group?.choose !== 1 || group?.rank !== "trained" || !Array.isArray(group?.options) || group.options.length < 1) {
      errors.push(`${groupLocation} must be a non-empty choose-one trained Skill group.`);
    }
    for (const [optionIndex, option] of (group?.options ?? []).entries()) {
      validateSkillOption(option, `${groupLocation}.options[${optionIndex}]`, references, grantIds, errors);
    }
  }
  for (const [groupIndex, group] of (document.system?.descriptorChoiceGroups ?? []).entries()) {
    const groupLocation = `${location}.system.descriptorChoiceGroups[${groupIndex}]`;
    if (!FOUNDRY_ID_PATTERN.test(group?.id ?? "")) errors.push(`${groupLocation}.id must be a stable 16-character ID.`);
    if (grantIds.has(group?.id)) errors.push(`${groupLocation}.id '${group?.id}' is duplicated.`);
    grantIds.add(group?.id);
    const sourceMode = descriptorChoiceSourceMode(group);
    if (sourceMode !== "fixed" && sourceMode !== "catalog") errors.push(`${groupLocation}.sourceMode must be 'fixed' or 'catalog'.`);
    if (group?.choose !== 1 || !Array.isArray(group?.options)) errors.push(`${groupLocation} must be a choose-one Descriptor group.`);
    if (sourceMode === "catalog") {
      if (group?.catalogItemType !== "descriptor") errors.push(`${groupLocation}.catalogItemType must be 'descriptor'.`);
      if ((group?.options?.length ?? 0) !== 0) errors.push(`${groupLocation} catalog groups must not freeze Descriptor options.`);
    } else {
      if (group?.catalogItemType != null && group.catalogItemType !== "none") errors.push(`${groupLocation}.catalogItemType must be 'none' for fixed groups.`);
      if ((group?.options?.length ?? 0) < 1) errors.push(`${groupLocation} fixed groups must contain at least one Descriptor option.`);
      for (const [optionIndex, option] of (group?.options ?? []).entries()) {
        validateDescriptorOption(option, `${groupLocation}.options[${optionIndex}]`, references, grantIds, errors);
      }
    }
  }
  if ((document.system?.abilityGrants?.length ?? 0) !== 0 || (document.system?.abilityChoiceGroups?.length ?? 0) !== 0) {
    errors.push(`${location} must not invent Species Ability documents or catalogs.`);
  }
  if ((document.system?.descriptorGrants?.length ?? 0) !== 0) errors.push(`${location} must not contain a fixed Descriptor grant.`);
}

export function validateSpeciesCandidateSource(source, references) {
  const errors = [];
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new SpeciesCandidateValidationError(["Source root must be an object."]);
  }
  if (!references?.skills || !references?.descriptors) errors.push("Public Skills and Descriptors reference catalogs are required.");
  if (source.schemaVersion !== SPECIES_CANDIDATE_SCHEMA_VERSION) errors.push(`schemaVersion must be ${SPECIES_CANDIDATE_SCHEMA_VERSION}.`);
  if (source.target?.systemId !== "cypherv2" || source.target?.futurePackId !== "species") errors.push("Candidate target metadata is invalid.");
  if (!/^[a-f0-9]{64}$/.test(source.source?.sha256 ?? "")) errors.push("source.sha256 must identify the exact CRD input.");
  if (JSON.stringify(source.inventory?.fantasy) !== JSON.stringify(FANTASY_SPECIES_NAMES)) errors.push("Fantasy Species inventory does not match the CRD.");
  if (JSON.stringify(source.inventory?.scienceFiction) !== JSON.stringify(SCIENCE_FICTION_SPECIES_NAMES)) errors.push("Science Fiction Species inventory does not match the CRD.");
  const species = Array.isArray(source.species) ? source.species : [];
  if (species.length !== SPECIES_CANDIDATE_COUNT) errors.push(`Expected 20 Species; found ${species.length}.`);
  if (source.counts?.species !== species.length) errors.push("Stored Species count does not match document contents.");
  if (JSON.stringify(species.map((document) => document.name)) !== JSON.stringify(SPECIES_NAMES)) errors.push("Species names/order do not match the reviewed 20-Species inventory.");
  if (!uniqueValues(species.map((document) => document.name))) errors.push("Species names must be unique.");
  if (!uniqueValues(species.map((document) => document._id))) errors.push("Species IDs must be unique.");
  if (!uniqueValues(species.map((document) => document.system?.slug))) errors.push("Species slugs must be unique.");
  if (species.filter((document) => document.name === "Human").length !== 1) errors.push("Human must appear exactly once.");
  const grantIds = new Set();
  species.forEach((document, index) => validateSpecies(document, index, references, grantIds, errors));

  const human = species.find((document) => document.name === "Human");
  const humanGroups = human?.system?.descriptorChoiceGroups ?? [];
  if (
    humanGroups.length !== 1
    || humanGroups[0]?.choose !== 1
    || humanGroups[0]?.sourceMode !== "catalog"
    || humanGroups[0]?.catalogItemType !== "descriptor"
    || humanGroups[0]?.options?.length !== 0
  ) {
    errors.push("Human must offer exactly one dynamic all-available-Descriptors catalog choice.");
  }
  const mutant = species.find((document) => document.name === "Mutant");
  if ((mutant?.system?.abilityChoiceGroups?.length ?? 0) !== 0 || (mutant?.system?.abilityGrants?.length ?? 0) !== 0 || !/tier 1 ability from any focus/i.test(mutant?.system?.description ?? "")) {
    errors.push("Mutant must preserve its tier 1 Focus Ability choice as manual rich text only.");
  }
  const dwarf = species.find((document) => document.name === "Dwarf");
  if (!/add \+1 on recoveries/i.test(dwarf?.system?.description ?? "") || dwarf?.system?.recoveryPoolBonuses || dwarf?.system?.recoveryBonus) {
    errors.push("Dwarf recovery must remain present in prose and absent from automation fields.");
  }
  const dnec = species.find((document) => document.name === "D’nec");
  if (!/1 extra point to your Intellect Pool each time you use a recovery/i.test(dnec?.system?.description ?? "") || dnec?.system?.recoveryPoolBonuses || dnec?.system?.recoveryBonus) {
    errors.push("D’nec recovery must remain present in prose and absent from targeted automation fields.");
  }
  const strings = collectStrings(source);
  for (const value of strings) {
    if (/Compendium\.(?:world\.|cypher-v2-test\.)/i.test(value) || /Compendium\.[A-Za-z0-9_.-]*working/i.test(value)) {
      errors.push(`Candidate source contains a World/Working reference: '${value}'.`);
    }
    if (/Compendium\.[A-Za-z0-9_.-]*(?:test|staging)/i.test(value)) errors.push(`Candidate source contains a test/staging reference: '${value}'.`);
    if (/origin superhero abilit/i.test(value)) errors.push(`Candidate source contains an Origin placeholder/reference: '${value}'.`);
  }
  if (errors.length > 0) throw new SpeciesCandidateValidationError([...new Set(errors)]);
  return source;
}

function hasNonZero(record) {
  return Object.values(record ?? {}).some((value) => Number(value) !== 0);
}

function hasTrue(record) {
  return Object.values(record ?? {}).some(Boolean);
}

export function speciesCandidateSummary(source, references) {
  validateSpeciesCandidateSource(source, references);
  const species = source.species;
  return {
    species: species.length,
    structuredFeatures: {
      poolBonuses: species.filter((document) => hasNonZero(document.system.poolBonuses)).length,
      woundBonuses: species.filter((document) => hasNonZero(document.system.woundBonuses)).length,
      cypherLimit: species.filter((document) => Number(document.system.cypherLimitBonus) !== 0).length,
      edge: species.filter((document) => document.system.edgeGrant?.mode !== "none").length,
      weaponCategories: species.filter((document) => hasTrue(document.system.weaponUse)).length,
      weaponFamilies: species.filter((document) => (document.system.weaponFamilies?.length ?? 0) > 0).length,
      armor: species.filter((document) => hasTrue(document.system.armorUse)).length,
      fixedSkills: species.filter((document) => document.system.skillGrants.length > 0).length,
      skillChoices: species.filter((document) => document.system.choiceGroups.length > 0).length,
      fixedAbilities: species.filter((document) => document.system.abilityGrants.length > 0).length,
      abilityChoices: species.filter((document) => document.system.abilityChoiceGroups.length > 0).length,
      fixedDescriptors: species.filter((document) => document.system.descriptorGrants.length > 0).length,
      descriptorChoices: species.filter((document) => document.system.descriptorChoiceGroups.length > 0).length
    },
    contextualSkillNotes: species.flatMap((document) => document.system.skillGrants).filter((grant) => grant.notes).length,
    embeddedDescriptorOptions: species.find((document) => document.name === "Human")?.system?.descriptorChoiceGroups?.[0]?.options?.length ?? 0,
    existingAbilityReuse: species.flatMap((document) => document.system.abilityGrants).length
  };
}

export async function readSpeciesReferences(filePath) {
  return createSpeciesReferenceCatalogs(JSON.parse(await readFile(filePath, "utf8")));
}

export async function readSpeciesCandidateSource(filePath, referencesPath = defaultSpeciesReferencePath()) {
  const [source, references] = await Promise.all([
    readFile(filePath, "utf8").then(JSON.parse),
    readSpeciesReferences(referencesPath)
  ]);
  return validateSpeciesCandidateSource(source, references);
}

export function defaultSpeciesCandidatePath(projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")) {
  return path.join(projectRoot, "content", "species", "candidate-pack.json");
}

export function defaultSpeciesReferencePath(projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")) {
  return path.join(projectRoot, "content", "core-items", "reviewed-packs.json");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [source, references] = await Promise.all([
    readFile(defaultSpeciesCandidatePath(), "utf8").then(JSON.parse),
    readSpeciesReferences(defaultSpeciesReferencePath())
  ]);
  console.log(JSON.stringify(speciesCandidateSummary(source, references), null, 2));
}
