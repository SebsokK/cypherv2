import {createHash} from "node:crypto";
import {access, mkdir, readFile, readdir, rename, rm, writeFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

export const FOCUS_IMPORT_SCHEMA_VERSION = 1;
export const FOCUS_PACK_ID = "foci";
export const ABILITY_PACK_ID = "focus-abilities";
export const REVIEW_STATUSES = ["verified", "manual-review", "ambiguous"];
export const REVIEW_ISSUE_TYPES = [
  "ambiguous-graph-edge",
  "duplicate-name-different-rules",
  "complex-cost",
  "later-tier-upgrade",
  "repeatable-ability",
  "prerequisite",
  "unsupported-automation",
  "source-ambiguity"
];

const POOLS = ["might", "speed", "intellect"];
const ACTIVATIONS = ["action", "passive", "reaction", "special"];
const ACTION_CLASSIFICATIONS = ["action", "first-action", "last-action", "enabler", "extra-action", "special"];
const ROLL_TYPES = ["none", "task", "attack", "defense"];
const TARGET_MODES = ["none", "single", "multiple"];
const WOUND_SEVERITIES = ["none", "minor", "moderate", "major"];
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SYSTEM_SCHEMA_VERSION = 1;

export class FocusImportValidationError extends Error {
  constructor(errors) {
    super(`Focus import source is invalid:\n${errors.map((entry) => `- ${entry}`).join("\n")}`);
    this.name = "FocusImportValidationError";
    this.errors = errors;
  }
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizedText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function requireString(value, location, errors, {slug = false, allowBlank = false} = {}) {
  if (typeof value !== "string" || (!allowBlank && !value.trim())) {
    errors.push(`${location} must be a${allowBlank ? "" : " non-blank"} string.`);
    return;
  }
  if (slug && !SLUG_PATTERN.test(value)) errors.push(`${location} must be a lower-case kebab-case stable ID.`);
}

function requireTier(value, location, errors) {
  if (!Number.isInteger(value) || value < 1 || value > 6) errors.push(`${location} must be an integer from 1 to 6.`);
}

function requireReview(value, note, location, errors) {
  if (!REVIEW_STATUSES.includes(value)) {
    errors.push(`${location}.reviewStatus must be one of ${REVIEW_STATUSES.join(", ")}.`);
  }
  if (value !== "verified" && !normalizedText(note)) {
    errors.push(`${location}.reviewNote is required when reviewStatus is '${value}'.`);
  }
}

function validateStringArray(value, location, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${location} must be an array.`);
    return;
  }
  value.forEach((entry, index) => requireString(entry, `${location}[${index}]`, errors));
}

function validateReviewIssues(value, location, errors) {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    errors.push(`${location} must be an array.`);
    return;
  }
  value.forEach((entry, index) => {
    const itemLocation = `${location}[${index}]`;
    if (!isObject(entry)) {
      errors.push(`${itemLocation} must be an object.`);
      return;
    }
    if (!REVIEW_ISSUE_TYPES.includes(entry.issueType)) {
      errors.push(`${itemLocation}.issueType must be a supported review issue type.`);
    }
    requireReview(entry.reviewStatus, entry.note, itemLocation, errors);
    requireString(entry.note, `${itemLocation}.note`, errors);
  });
}

function validateCost(cost, location, errors) {
  if (cost === null || cost === undefined) return;
  if (!isObject(cost) || !["fixed", "complex"].includes(cost.kind)) {
    errors.push(`${location} must be null or a fixed/complex cost object.`);
    return;
  }
  if (cost.kind === "complex") {
    requireString(cost.text, `${location}.text`, errors);
    return;
  }
  if (!Number.isInteger(cost.amount) || cost.amount < 0) errors.push(`${location}.amount must be a non-negative integer.`);
  if (!Array.isArray(cost.allowedPools)) {
    errors.push(`${location}.allowedPools must be an array.`);
  } else {
    const unique = new Set(cost.allowedPools);
    if (unique.size !== cost.allowedPools.length) errors.push(`${location}.allowedPools cannot contain duplicates.`);
    for (const pool of cost.allowedPools) if (!POOLS.includes(pool)) errors.push(`${location}.allowedPools contains invalid Pool '${pool}'.`);
  }
  if (typeof cost.ignoresEdge !== "boolean") errors.push(`${location}.ignoresEdge must be boolean.`);
}

function validateAutomation(automation, location, errors) {
  if (automation === undefined) return;
  if (!isObject(automation)) {
    errors.push(`${location} must be an object.`);
    return;
  }
  if (automation.activation !== undefined && !ACTIVATIONS.includes(automation.activation)) errors.push(`${location}.activation is invalid.`);
  if (automation.roll !== undefined && !ROLL_TYPES.includes(automation.roll)) errors.push(`${location}.roll is invalid.`);
  if (automation.targetMode !== undefined && !TARGET_MODES.includes(automation.targetMode)) errors.push(`${location}.targetMode is invalid.`);
  if (automation.woundSeverity !== undefined && !WOUND_SEVERITIES.includes(automation.woundSeverity)) errors.push(`${location}.woundSeverity is invalid.`);
  for (const field of ["rollModifier", "attackModifier"]) {
    if (automation[field] !== undefined && (!Number.isInteger(automation[field]) || automation[field] < -10 || automation[field] > 10)) {
      errors.push(`${location}.${field} must be an integer from -10 to 10.`);
    }
  }
  if (automation.damage !== undefined && (!Number.isInteger(automation.damage) || automation.damage < 0)) errors.push(`${location}.damage must be a non-negative integer.`);
  if (automation.range !== undefined && typeof automation.range !== "string") errors.push(`${location}.range must be a string.`);
}

function abilityFingerprint(ability) {
  return JSON.stringify({
    name: normalizedText(ability.name).toLocaleLowerCase(),
    rules: normalizedText(ability.fullRulesDescription),
    cost: ability.cost ?? null,
    actionClassification: ability.actionClassification ?? null,
    repeatability: ability.repeatability ?? {canTakeMultipleTimes: false, maximumSelections: null},
    prerequisiteAbilityId: ability.prerequisiteAbilityId ?? null,
    laterTierChanges: ability.laterTierChanges ?? [],
    automation: ability.automation ?? null
  });
}

function validateAbility(ability, index, errors) {
  const location = `abilities[${index}]`;
  if (!isObject(ability)) {
    errors.push(`${location} must be an object.`);
    return;
  }
  requireString(ability.id, `${location}.id`, errors, {slug: true});
  requireString(ability.name, `${location}.name`, errors);
  requireTier(ability.tier, `${location}.tier`, errors);
  requireString(ability.fullRulesDescription, `${location}.fullRulesDescription`, errors);
  requireString(ability.sourcePage, `${location}.sourcePage`, errors);
  if (ability.actionClassification !== null && ability.actionClassification !== undefined && !ACTION_CLASSIFICATIONS.includes(ability.actionClassification)) {
    errors.push(`${location}.actionClassification is invalid.`);
  }
  validateCost(ability.cost, `${location}.cost`, errors);
  const repeatability = ability.repeatability;
  if (!isObject(repeatability) || typeof repeatability.canTakeMultipleTimes !== "boolean") {
    errors.push(`${location}.repeatability must define canTakeMultipleTimes.`);
  } else if (repeatability.maximumSelections !== null && repeatability.maximumSelections !== undefined) {
    if (!repeatability.canTakeMultipleTimes || !Number.isInteger(repeatability.maximumSelections) || repeatability.maximumSelections < 2) {
      errors.push(`${location}.repeatability.maximumSelections requires repeatability and must be an integer of at least 2.`);
    }
  }
  if (ability.prerequisiteAbilityId !== null && ability.prerequisiteAbilityId !== undefined) {
    requireString(ability.prerequisiteAbilityId, `${location}.prerequisiteAbilityId`, errors, {slug: true});
  }
  if (!Array.isArray(ability.laterTierChanges)) {
    errors.push(`${location}.laterTierChanges must be an array.`);
  } else {
    ability.laterTierChanges.forEach((change, changeIndex) => {
      if (!isObject(change)) {
        errors.push(`${location}.laterTierChanges[${changeIndex}] must be an object.`);
        return;
      }
      requireTier(change.tier, `${location}.laterTierChanges[${changeIndex}].tier`, errors);
      requireString(change.text, `${location}.laterTierChanges[${changeIndex}].text`, errors);
    });
  }
  validateAutomation(ability.automation, `${location}.automation`, errors);
  requireReview(ability.reviewStatus, ability.reviewNote, location, errors);
  validateReviewIssues(ability.reviewIssues, `${location}.reviewIssues`, errors);
}

function validateFocus(focus, index, abilityIds, errors) {
  const location = `foci[${index}]`;
  if (!isObject(focus)) {
    errors.push(`${location} must be an object.`);
    return;
  }
  requireString(focus.id, `${location}.id`, errors, {slug: true});
  requireString(focus.name, `${location}.name`, errors);
  requireString(focus.description, `${location}.description`, errors);
  requireString(focus.sourcePage, `${location}.sourcePage`, errors);
  validateStringArray(focus.genreThemes, `${location}.genreThemes`, errors);
  validateStringArray(focus.gmIntrusionSuggestions, `${location}.gmIntrusionSuggestions`, errors);
  if (typeof focus.additionalEquipment !== "string") errors.push(`${location}.additionalEquipment must be a string.`);
  requireReview(focus.reviewStatus, focus.reviewNote, location, errors);
  validateReviewIssues(focus.reviewIssues, `${location}.reviewIssues`, errors);

  if (!Array.isArray(focus.associatedAbilities)) {
    errors.push(`${location}.associatedAbilities must be an ordered array.`);
  } else {
    const associated = new Set();
    focus.associatedAbilities.forEach((abilityId, abilityIndex) => {
      requireString(abilityId, `${location}.associatedAbilities[${abilityIndex}]`, errors, {slug: true});
      if (associated.has(abilityId)) errors.push(`${location}.associatedAbilities contains duplicate '${abilityId}'.`);
      associated.add(abilityId);
      if (!abilityIds.has(abilityId)) errors.push(`${location}.associatedAbilities references missing Ability '${abilityId}'.`);
    });
  }

  if (!isObject(focus.graph) || !Array.isArray(focus.graph.nodes) || !Array.isArray(focus.graph.edges)) {
    errors.push(`${location}.graph must define nodes and edges arrays.`);
    return;
  }
  const nodeIds = new Set();
  const orders = new Set();
  for (const [nodeIndex, node] of focus.graph.nodes.entries()) {
    const nodeLocation = `${location}.graph.nodes[${nodeIndex}]`;
    if (!isObject(node)) {
      errors.push(`${nodeLocation} must be an object.`);
      continue;
    }
    requireString(node.id, `${nodeLocation}.id`, errors, {slug: true});
    if (nodeIds.has(node.id)) errors.push(`${location}.graph has duplicate node ID '${node.id}'.`);
    nodeIds.add(node.id);
    requireString(node.abilityId, `${nodeLocation}.abilityId`, errors, {slug: true});
    if (!abilityIds.has(node.abilityId)) errors.push(`${nodeLocation} references missing Ability '${node.abilityId}'.`);
    if (Array.isArray(focus.associatedAbilities) && !focus.associatedAbilities.includes(node.abilityId)) {
      errors.push(`${nodeLocation}.abilityId '${node.abilityId}' is missing from associatedAbilities.`);
    }
    requireTier(node.tier, `${nodeLocation}.tier`, errors);
    if (!Number.isInteger(node.order) || node.order < 0) errors.push(`${nodeLocation}.order must be a non-negative integer.`);
    if (orders.has(node.order)) errors.push(`${location}.graph has duplicate node order '${node.order}'.`);
    orders.add(node.order);
    if (node.position !== undefined && node.position !== null) {
      if (!isObject(node.position)) errors.push(`${nodeLocation}.position must be an object.`);
      else for (const axis of ["x", "y"]) {
        const value = node.position[axis];
        if (value !== null && value !== undefined && !Number.isFinite(value)) errors.push(`${nodeLocation}.position.${axis} must be finite or null.`);
      }
    }
    requireReview(node.reviewStatus, node.reviewNote, nodeLocation, errors);
  }

  const edgeIds = new Set();
  const directedEdges = new Set();
  for (const [edgeIndex, edge] of focus.graph.edges.entries()) {
    const edgeLocation = `${location}.graph.edges[${edgeIndex}]`;
    if (!isObject(edge)) {
      errors.push(`${edgeLocation} must be an object.`);
      continue;
    }
    requireString(edge.id, `${edgeLocation}.id`, errors, {slug: true});
    if (edgeIds.has(edge.id)) errors.push(`${location}.graph has duplicate edge ID '${edge.id}'.`);
    edgeIds.add(edge.id);
    requireString(edge.from, `${edgeLocation}.from`, errors, {slug: true});
    requireString(edge.to, `${edgeLocation}.to`, errors, {slug: true});
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) errors.push(`${edgeLocation} references a missing node.`);
    if (edge.from === edge.to) errors.push(`${edgeLocation} cannot connect a node to itself.`);
    const directed = `${edge.from}\u0000${edge.to}`;
    if (directedEdges.has(directed)) errors.push(`${location}.graph has duplicate edge '${edge.from}' -> '${edge.to}'.`);
    directedEdges.add(directed);
    requireReview(edge.reviewStatus, edge.reviewNote, edgeLocation, errors);
  }
}

export function validateFocusImportSource(catalog) {
  const errors = [];
  if (!isObject(catalog)) throw new FocusImportValidationError(["Catalog root must be an object."]);
  if (catalog.schemaVersion !== FOCUS_IMPORT_SCHEMA_VERSION) errors.push(`schemaVersion must be ${FOCUS_IMPORT_SCHEMA_VERSION}.`);
  if (!Array.isArray(catalog.abilities)) errors.push("abilities must be an array.");
  if (!Array.isArray(catalog.foci)) errors.push("foci must be an array.");
  const hasContent = (catalog.abilities?.length ?? 0) > 0 || (catalog.foci?.length ?? 0) > 0;
  if (hasContent) {
    if (!isObject(catalog.source)) errors.push("source metadata is required when content is present.");
    else for (const field of ["id", "title", "version", "license"]) requireString(catalog.source[field], `source.${field}`, errors);
  } else if (catalog.source !== null && !isObject(catalog.source)) {
    errors.push("source must be null or an object.");
  }

  const abilities = Array.isArray(catalog.abilities) ? catalog.abilities : [];
  const foci = Array.isArray(catalog.foci) ? catalog.foci : [];
  abilities.forEach((ability, index) => validateAbility(ability, index, errors));
  const abilityIds = new Set();
  for (const ability of abilities) {
    if (!isObject(ability) || typeof ability.id !== "string") continue;
    if (abilityIds.has(ability.id)) errors.push(`Duplicate Ability stable ID '${ability.id}'.`);
    abilityIds.add(ability.id);
  }
  for (const ability of abilities) {
    if (isObject(ability) && ability.prerequisiteAbilityId && !abilityIds.has(ability.prerequisiteAbilityId)) {
      errors.push(`Ability '${ability.id}' prerequisite references missing Ability '${ability.prerequisiteAbilityId}'.`);
    }
  }
  foci.forEach((focus, index) => validateFocus(focus, index, abilityIds, errors));
  const focusIds = new Set();
  for (const focus of foci) {
    if (!isObject(focus) || typeof focus.id !== "string") continue;
    if (focusIds.has(focus.id)) errors.push(`Duplicate Focus stable ID '${focus.id}'.`);
    focusIds.add(focus.id);
  }

  const byName = new Map();
  for (const ability of abilities) {
    if (!isObject(ability) || typeof ability.name !== "string") continue;
    const key = normalizedText(ability.name).toLocaleLowerCase();
    byName.set(key, [...(byName.get(key) ?? []), ability]);
  }
  for (const group of byName.values()) {
    if (group.length < 2) continue;
    const fingerprints = new Set(group.map(abilityFingerprint));
    if (fingerprints.size !== group.length) {
      errors.push(`Same-name mechanically equivalent Abilities '${group[0].name}' must share one canonical stable ID.`);
      continue;
    }
    for (const ability of group) {
      if (!normalizedText(ability.deduplicationNote)) {
        errors.push(`Same-name distinct Ability '${ability.id}' requires deduplicationNote.`);
      }
    }
  }

  if (errors.length > 0) throw new FocusImportValidationError(errors);
  return catalog;
}

export function stableDocumentId(kind, sourceId) {
  return createHash("sha256").update(`cypherv2\u0000${kind}\u0000${sourceId}`).digest("hex").slice(0, 16);
}

export function abilityCompendiumUuid(abilityId) {
  return `Compendium.cypherv2.${ABILITY_PACK_ID}.Item.${stableDocumentId("ability", abilityId)}`;
}

function emptyProvenance() {
  return {
    kind: "other",
    sourceUuid: "",
    instanceId: "",
    grantId: "",
    status: "active",
    contentUuid: "",
    contentKey: "",
    replacement: {
      active: false,
      originalName: "",
      originalContentUuid: "",
      originalContentKey: "",
      replacementName: "",
      replacementContentUuid: "",
      replacementContentKey: "",
      selectionKind: "none"
    }
  };
}

function baseSystem(catalog, record, description, tags = []) {
  return {
    schemaVersion: SYSTEM_SCHEMA_VERSION,
    slug: record.id,
    description,
    source: {
      uuid: "",
      book: catalog.source?.title ?? "",
      page: record.sourcePage,
      license: catalog.source?.license ?? "original"
    },
    automation: {
      mode: "descriptive",
      duration: {enabled: false, trigger: "recovery"},
      rollDefaults: {}
    },
    ruleElements: [],
    tags: [...tags],
    grantedBy: emptyProvenance()
  };
}

function mappedActivation(ability) {
  if (ability.automation?.activation) return ability.automation.activation;
  if (["action", "first-action", "last-action"].includes(ability.actionClassification)) return "action";
  if (ability.actionClassification === "enabler") return "passive";
  return "special";
}

function generatedAbilityDocument(catalog, ability, sort) {
  const id = stableDocumentId("ability", ability.id);
  const fixedCost = ability.cost?.kind === "fixed" ? ability.cost : null;
  const allowedPools = fixedCost ? [...fixedCost.allowedPools].sort((left, right) => POOLS.indexOf(left) - POOLS.indexOf(right)) : [];
  const legacyPool = allowedPools.length === 0 ? "none" : allowedPools.length === 1 ? allowedPools[0] : "choose";
  const system = {
    ...baseSystem(catalog, ability, ability.fullRulesDescription),
    tier: ability.tier,
    category: "focus",
    archived: false,
    activation: mappedActivation(ability),
    pool: legacyPool,
    cost: {
      amount: fixedCost?.amount ?? 0,
      ignoresEdge: fixedCost?.ignoresEdge ?? false,
      allowedPools
    },
    roll: ability.automation?.roll ?? "none",
    rollModifier: ability.automation?.rollModifier ?? 0,
    attackModifier: ability.automation?.attackModifier ?? 0,
    damage: ability.automation?.damage ?? 0,
    woundSeverity: ability.automation?.woundSeverity ?? "none",
    range: ability.automation?.range ?? "",
    targetMode: ability.automation?.targetMode ?? "none",
    sourceFocusUuid: "",
    sourceNodeId: ""
  };
  return {
    _key: `!items!${id}`,
    _id: id,
    name: ability.name,
    type: "ability",
    img: "systems/cypherv2/assets/icons/cypherability.png",
    system,
    effects: [],
    folder: null,
    sort,
    flags: {
      cypherv2: {
        focusImport: {
          sourceId: ability.id,
          actionClassification: ability.actionClassification ?? null,
          repeatability: ability.repeatability,
          prerequisiteAbilityUuid: ability.prerequisiteAbilityId ? abilityCompendiumUuid(ability.prerequisiteAbilityId) : "",
          laterTierChanges: ability.laterTierChanges,
          complexCost: ability.cost?.kind === "complex" ? ability.cost.text : ""
        }
      }
    }
  };
}

function generatedFocusDocument(catalog, focus, abilitiesById, sort) {
  const id = stableDocumentId("focus", focus.id);
  const nodes = [...focus.graph.nodes]
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id))
    .map((node) => {
      const ability = abilitiesById.get(node.abilityId);
      return {
        id: node.id,
        abilityUuid: abilityCompendiumUuid(node.abilityId),
        abilitySnapshot: {
          name: ability.name,
          description: ability.fullRulesDescription
        },
        tier: node.tier,
        position: {
          x: node.position?.x ?? node.order,
          y: node.position?.y ?? null
        }
      };
    });
  const connections = focus.graph.edges
    .filter((edge) => edge.reviewStatus === "verified")
    .map((edge) => ({id: edge.id, from: edge.from, to: edge.to}))
    .sort((left, right) => left.id.localeCompare(right.id));
  const system = {
    ...baseSystem(catalog, focus, focus.description, focus.genreThemes),
    graph: {version: 1, nodes, connections}
  };
  return {
    _key: `!items!${id}`,
    _id: id,
    name: focus.name,
    type: "focus",
    img: "systems/cypherv2/assets/icons/cypherfocus.png",
    system,
    effects: [],
    folder: null,
    sort,
    flags: {
      cypherv2: {
        focusImport: {
          sourceId: focus.id,
          genreThemes: focus.genreThemes,
          gmIntrusionSuggestions: focus.gmIntrusionSuggestions,
          additionalEquipment: focus.additionalEquipment,
          associatedAbilityIds: focus.associatedAbilities
        }
      }
    }
  };
}

function reportIssue(record, issueType, explanation, focus = null, ability = null, reviewStatus = record.reviewStatus) {
  return {
    focus,
    ability,
    sourcePage: record.sourcePage,
    issueType,
    reviewStatus,
    explanation
  };
}

function buildReviewReport(catalog, abilities, foci) {
  const issues = [];
  const usages = new Map(abilities.map((ability) => [ability.id, []]));
  for (const focus of foci) for (const node of focus.graph.nodes) {
    usages.get(node.abilityId)?.push({focusId: focus.id, focus: focus.name, nodeId: node.id, tier: node.tier});
  }

  for (const focus of foci) {
    if (focus.reviewStatus !== "verified") issues.push(reportIssue(focus, "source-ambiguity", focus.reviewNote, focus.name));
    for (const item of focus.reviewIssues ?? []) issues.push(reportIssue(focus, item.issueType, item.note, focus.name, null, item.reviewStatus));
    for (const node of focus.graph.nodes) if (node.reviewStatus !== "verified") {
      issues.push(reportIssue(focus, "source-ambiguity", `Node '${node.id}': ${node.reviewNote}`, focus.name, abilities.find((ability) => ability.id === node.abilityId)?.name ?? node.abilityId, node.reviewStatus));
    }
    for (const edge of focus.graph.edges) if (edge.reviewStatus !== "verified") {
      issues.push(reportIssue(focus, "ambiguous-graph-edge", `Omitted edge '${edge.from}' -> '${edge.to}': ${edge.reviewNote}`, focus.name, null, edge.reviewStatus));
    }
  }

  for (const ability of abilities) {
    const focusNames = [...new Set((usages.get(ability.id) ?? []).map((usage) => usage.focus))].sort();
    const focusLabel = focusNames.join(", ") || null;
    if (ability.reviewStatus !== "verified") issues.push(reportIssue(ability, "source-ambiguity", ability.reviewNote, focusLabel, ability.name));
    for (const item of ability.reviewIssues ?? []) issues.push(reportIssue(ability, item.issueType, item.note, focusLabel, ability.name, item.reviewStatus));
    if (ability.cost?.kind === "complex") issues.push(reportIssue(ability, "complex-cost", ability.cost.text, focusLabel, ability.name, "manual-review"));
    if (ability.laterTierChanges.length > 0) issues.push(reportIssue(ability, "later-tier-upgrade", "Ability has explicit later-tier changes preserved in source metadata and prose.", focusLabel, ability.name, "manual-review"));
    if (ability.repeatability.canTakeMultipleTimes) issues.push(reportIssue(ability, "repeatable-ability", `Repeatable${ability.repeatability.maximumSelections ? ` up to ${ability.repeatability.maximumSelections} selections` : " without an explicit maximum"}.`, focusLabel, ability.name, "manual-review"));
    if (ability.prerequisiteAbilityId) issues.push(reportIssue(ability, "prerequisite", `Requires '${ability.prerequisiteAbilityId}'. No graph edge is synthesized.`, focusLabel, ability.name, "manual-review"));
  }

  const byName = new Map();
  for (const ability of abilities) {
    const key = normalizedText(ability.name).toLocaleLowerCase();
    byName.set(key, [...(byName.get(key) ?? []), ability]);
  }
  const sameNameDistinct = [];
  for (const group of byName.values()) if (group.length > 1) {
    const entry = {
      name: group[0].name,
      abilityIds: group.map((ability) => ability.id).sort(),
      reason: group.map((ability) => `${ability.id}: ${ability.deduplicationNote}`).sort().join(" | ")
    };
    sameNameDistinct.push(entry);
    for (const ability of group) issues.push(reportIssue(ability, "duplicate-name-different-rules", entry.reason, null, ability.name, "verified"));
  }
  const merged = abilities
    .map((ability) => ({ability, usedBy: usages.get(ability.id) ?? []}))
    .filter((entry) => entry.usedBy.length > 1)
    .map(({ability, usedBy}) => ({
      abilityId: ability.id,
      name: ability.name,
      usedBy: [...usedBy].sort((left, right) => left.focusId.localeCompare(right.focusId) || left.nodeId.localeCompare(right.nodeId)),
      reason: "One canonical mechanically equivalent Ability source is referenced by multiple Focus nodes."
    }));

  issues.sort((left, right) => (
    String(left.focus ?? "").localeCompare(String(right.focus ?? ""))
    || String(left.ability ?? "").localeCompare(String(right.ability ?? ""))
    || left.issueType.localeCompare(right.issueType)
    || left.explanation.localeCompare(right.explanation)
  ));
  sameNameDistinct.sort((left, right) => left.name.localeCompare(right.name));
  merged.sort((left, right) => left.abilityId.localeCompare(right.abilityId));

  return {
    schemaVersion: 1,
    source: catalog.source,
    summary: {
      focuses: foci.length,
      canonicalAbilities: abilities.length,
      graphNodes: foci.reduce((total, focus) => total + focus.graph.nodes.length, 0),
      verifiedGraphEdges: foci.reduce((total, focus) => total + focus.graph.edges.filter((edge) => edge.reviewStatus === "verified").length, 0),
      omittedGraphEdges: foci.reduce((total, focus) => total + focus.graph.edges.filter((edge) => edge.reviewStatus !== "verified").length, 0),
      reviewIssues: issues.length
    },
    deduplication: {merged, sameNameDistinct},
    issues
  };
}

export function generateFocusImport(catalog) {
  validateFocusImportSource(catalog);
  const abilities = [...catalog.abilities].sort((left, right) => left.id.localeCompare(right.id));
  const foci = [...catalog.foci].sort((left, right) => left.id.localeCompare(right.id));
  const abilitiesById = new Map(abilities.map((ability) => [ability.id, ability]));
  const abilityDocuments = abilities.map((ability, index) => generatedAbilityDocument(catalog, ability, (index + 1) * 100000));
  const focusDocuments = foci.map((focus, index) => generatedFocusDocument(catalog, focus, abilitiesById, (index + 1) * 100000));
  const documentIds = [...abilityDocuments, ...focusDocuments].map((document) => document._id);
  if (new Set(documentIds).size !== documentIds.length) throw new FocusImportValidationError(["Generated Foundry document IDs collided."]);
  return {
    abilityDocuments,
    focusDocuments,
    report: buildReviewReport(catalog, abilities, foci)
  };
}

function markdownReport(report) {
  const lines = [
    "# Focus import review",
    "",
    `- Foci: ${report.summary.focuses}`,
    `- Canonical Abilities: ${report.summary.canonicalAbilities}`,
    `- Verified graph edges: ${report.summary.verifiedGraphEdges}`,
    `- Omitted graph edges: ${report.summary.omittedGraphEdges}`,
    `- Review issues: ${report.summary.reviewIssues}`,
    "",
    "## Deduplication",
    "",
    ...(report.deduplication.merged.length === 0
      ? ["No shared canonical Abilities in the current source."]
      : report.deduplication.merged.map((entry) => `- **${entry.name}** (${entry.abilityId}) — ${entry.usedBy.map((usage) => `${usage.focus} / ${usage.nodeId}`).join(", ")}`)),
    "",
    "## Same-name Abilities kept separate",
    "",
    ...(report.deduplication.sameNameDistinct.length === 0
      ? ["None."]
      : report.deduplication.sameNameDistinct.map((entry) => `- **${entry.name}** — ${entry.abilityIds.join(", ")} — ${entry.reason}`)),
    "",
    "## Manual review",
    "",
    ...(report.issues.length === 0
      ? ["No issues in the current source."]
      : report.issues.map((issue) => `- [${issue.reviewStatus}] **${issue.issueType}** — ${issue.focus ?? "No Focus"} / ${issue.ability ?? "No Ability"} / p. ${issue.sourcePage}: ${issue.explanation}`)),
    ""
  ];
  return lines.join("\n");
}

async function writeDocumentDirectory(directory, documents) {
  await rm(directory, {recursive: true, force: true});
  await mkdir(directory, {recursive: true});
  for (const document of documents) {
    const sourceId = document.flags.cypherv2.focusImport.sourceId;
    await writeFile(path.join(directory, `${sourceId}.json`), `${JSON.stringify(document, null, 2)}\n`, "utf8");
  }
}

export async function writeFocusImport(generated, {generatedRoot, reportRoot}) {
  const abilitySource = path.join(generatedRoot, ABILITY_PACK_ID);
  const focusSource = path.join(generatedRoot, FOCUS_PACK_ID);
  await writeDocumentDirectory(abilitySource, generated.abilityDocuments);
  await writeDocumentDirectory(focusSource, generated.focusDocuments);
  await mkdir(reportRoot, {recursive: true});
  await writeFile(path.join(reportRoot, "focus-import-review.json"), `${JSON.stringify(generated.report, null, 2)}\n`, "utf8");
  await writeFile(path.join(reportRoot, "focus-import-review.md"), markdownReport(generated.report), "utf8");
  return {abilitySource, focusSource};
}

function assertPackDestination(projectRoot, destination) {
  const packsRoot = path.resolve(projectRoot, "packs") + path.sep;
  const resolved = path.resolve(destination);
  if (!resolved.startsWith(packsRoot) || ![ABILITY_PACK_ID, FOCUS_PACK_ID].includes(path.basename(resolved))) {
    throw new Error(`Refusing to write unexpected pack destination '${resolved}'.`);
  }
}

export async function compileFocusPacks({projectRoot, sources}) {
  const {compilePack} = await import("@foundryvtt/foundryvtt-cli");
  const destinations = {
    abilities: path.resolve(projectRoot, "packs", ABILITY_PACK_ID),
    foci: path.resolve(projectRoot, "packs", FOCUS_PACK_ID)
  };
  for (const destination of Object.values(destinations)) {
    assertPackDestination(projectRoot, destination);
  }

  const stagingRoot = path.resolve(projectRoot, ".generated", "focus-pack-build");
  const backupRoot = path.resolve(projectRoot, ".generated", "focus-pack-backup");
  const staged = {
    abilities: path.join(stagingRoot, ABILITY_PACK_ID),
    foci: path.join(stagingRoot, FOCUS_PACK_ID)
  };
  const backups = {
    abilities: path.join(backupRoot, ABILITY_PACK_ID),
    foci: path.join(backupRoot, FOCUS_PACK_ID)
  };
  const exists = async (target) => access(target).then(() => true, () => false);

  await rm(stagingRoot, {recursive: true, force: true});
  await rm(backupRoot, {recursive: true, force: true});
  await mkdir(stagingRoot, {recursive: true});
  await compilePack(sources.abilitySource, staged.abilities, {log: true});
  await compilePack(sources.focusSource, staged.foci, {log: true});

  await mkdir(backupRoot, {recursive: true});
  const backedUp = [];
  const installed = [];
  try {
    for (const key of ["abilities", "foci"]) {
      if (await exists(destinations[key])) {
        await rename(destinations[key], backups[key]);
        backedUp.push(key);
      }
    }
    for (const key of ["abilities", "foci"]) {
      await rename(staged[key], destinations[key]);
      installed.push(key);
    }
  } catch (error) {
    for (const key of installed.reverse()) await rm(destinations[key], {recursive: true, force: true});
    for (const key of backedUp.reverse()) {
      if (await exists(backups[key])) await rename(backups[key], destinations[key]);
    }
    throw error;
  }
  await rm(backupRoot, {recursive: true, force: true});
  await rm(stagingRoot, {recursive: true, force: true});
  return destinations;
}

export async function readFocusImportSource(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

export async function listGeneratedFiles(directory) {
  return (await readdir(directory)).sort();
}

export function defaultFocusImportPaths(projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")) {
  return {
    projectRoot,
    source: path.join(projectRoot, "content", "foci", "catalog.json"),
    generatedRoot: path.join(projectRoot, ".generated", "focus-import"),
    reportRoot: path.join(projectRoot, ".reports")
  };
}
