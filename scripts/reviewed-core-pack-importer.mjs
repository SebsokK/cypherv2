import {access, mkdir, readFile, readdir, rename, rm, writeFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

export const REVIEWED_CORE_PACK_SCHEMA_VERSION = 1;
export const REVIEWED_CORE_PACKS = Object.freeze({
  descriptors: Object.freeze({label: "Descriptors", itemTypes: Object.freeze(["descriptor"])}),
  skills: Object.freeze({label: "Skills", itemTypes: Object.freeze(["skill"])}),
  "weapons-and-armors": Object.freeze({
    label: "Weapons & Armors",
    itemTypes: Object.freeze(["weapon", "armor", "shield"])
  })
});

const FOUNDRY_ID_PATTERN = /^[A-Za-z0-9]{16}$/;
const COMPENDIUM_UUID_PATTERN = /Compendium\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\.(Item|Folder)\.([A-Za-z0-9]{16})/g;
const BARE_ITEM_UUID_PATTERN = /(?<![A-Za-z0-9_.-])Item\.([A-Za-z0-9]{16})/g;

export class ReviewedCorePackValidationError extends Error {
  constructor(errors) {
    super(`Reviewed core compendium content is invalid:\n${errors.map((entry) => `- ${entry}`).join("\n")}`);
    this.name = "ReviewedCorePackValidationError";
    this.errors = errors;
  }
}

function compareDocuments(left, right) {
  const leftKind = String(left._key ?? "").startsWith("!folders!") ? 0 : 1;
  const rightKind = String(right._key ?? "").startsWith("!folders!") ? 0 : 1;
  return leftKind - rightKind
    || Number(left.sort ?? 0) - Number(right.sort ?? 0)
    || String(left.name ?? "").localeCompare(String(right.name ?? ""))
    || String(left._id ?? "").localeCompare(String(right._id ?? ""));
}

function documentKind(document) {
  if (String(document?._key ?? "").startsWith("!items!")) return "Item";
  if (String(document?._key ?? "").startsWith("!folders!")) return "Folder";
  return null;
}

function normalizeDocument(document) {
  const normalized = structuredClone(document);
  const kind = documentKind(normalized);
  if (kind) normalized._key = `!${kind.toLowerCase()}s!${normalized._id}`;
  if (kind === "Item") normalized.ownership = {default: Number(normalized.ownership?.default ?? 0)};
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
  const files = (await readdir(directory, {withFileTypes: true}))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .sort((left, right) => left.name.localeCompare(right.name));
  return Promise.all(files.map(async (entry) => JSON.parse(await readFile(path.join(directory, entry.name), "utf8"))));
}

function visitStrings(value, transform) {
  if (typeof value === "string") return transform(value);
  if (Array.isArray(value)) return value.map((entry) => visitStrings(entry, transform));
  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) value[key] = visitStrings(entry, transform);
  }
  return value;
}

function systemDocumentUuid(packId, kind, id) {
  return `Compendium.cypherv2.${packId}.${kind}.${id}`;
}

function rewriteDocumentReferences(document, sourcePackId, identities, rewriteCounts) {
  return visitStrings(document, (value) => {
    let rewritten = value.replace(COMPENDIUM_UUID_PATTERN, (match, systemId, _packId, kind, id) => {
      const target = identities.get(id);
      if (!target || target.kind !== kind) return match;
      if (systemId !== "cypher-v2-test" && systemId !== "world" && systemId !== "cypherv2") return match;
      const replacement = systemDocumentUuid(target.packId, target.kind, id);
      if (replacement !== match) incrementRewrite(rewriteCounts, sourcePackId, target.packId);
      return replacement;
    });
    rewritten = rewritten.replace(BARE_ITEM_UUID_PATTERN, (match, id) => {
      const target = identities.get(id);
      if (!target || target.kind !== "Item") return match;
      incrementRewrite(rewriteCounts, sourcePackId, target.packId);
      return systemDocumentUuid(target.packId, target.kind, id);
    });
    return rewritten;
  });
}

function incrementRewrite(rewriteCounts, sourcePackId, targetPackId) {
  const key = `${sourcePackId}->${targetPackId}`;
  rewriteCounts.set(key, (rewriteCounts.get(key) ?? 0) + 1);
}

export async function createReviewedCorePackSource({directories}) {
  const missing = Object.keys(REVIEWED_CORE_PACKS).filter((packId) => !directories?.[packId]);
  if (missing.length > 0) throw new Error(`Missing unpacked World pack directories: ${missing.join(", ")}.`);

  const rawPacks = {};
  const identities = new Map();
  for (const packId of Object.keys(REVIEWED_CORE_PACKS)) {
    rawPacks[packId] = await readDocumentDirectory(directories[packId]);
    for (const document of rawPacks[packId]) {
      const kind = documentKind(document);
      if (kind && !identities.has(document._id)) identities.set(document._id, {packId, kind});
    }
  }

  const rewriteCounts = new Map();
  const packs = {};
  for (const [packId, definition] of Object.entries(REVIEWED_CORE_PACKS)) {
    const documents = rawPacks[packId]
      .map(normalizeDocument)
      .map((document) => rewriteDocumentReferences(document, packId, identities, rewriteCounts))
      .sort(compareDocuments);
    packs[packId] = {
      label: definition.label,
      documentType: "Item",
      documents
    };
  }

  return validateReviewedCorePackSource({
    schemaVersion: REVIEWED_CORE_PACK_SCHEMA_VERSION,
    source: {
      kind: "reviewed-world-compendium-export",
      worldId: "cypher-v2-test",
      note: "Lossless reviewed documents promoted from the authoritative World packs."
    },
    target: {systemId: "cypherv2"},
    referenceRewrites: Object.fromEntries([...rewriteCounts.entries()].sort()),
    packs
  });
}

function validateDocument(document, packId, index, globalIds, globalKeys, folderIds, errors) {
  const location = `packs.${packId}.documents[${index}]`;
  const kind = documentKind(document);
  if (!kind) {
    errors.push(`${location} must have an Item or Folder LevelDB key.`);
    return;
  }
  if (!FOUNDRY_ID_PATTERN.test(document._id ?? "")) errors.push(`${location}._id must be a 16-character Foundry ID.`);
  if (globalIds.has(document._id)) errors.push(`${location} duplicates document ID '${document._id}'.`);
  globalIds.add(document._id);
  if (globalKeys.has(document._key)) errors.push(`${location} duplicates LevelDB key '${document._key}'.`);
  globalKeys.add(document._key);
  if (document._key !== `!${kind.toLowerCase()}s!${document._id}`) errors.push(`${location}._key does not match its document kind and ID.`);
  if (typeof document.name !== "string" || !document.name.trim()) errors.push(`${location}.name must be non-blank.`);
  if (kind === "Folder") {
    if (document.type !== "Item") errors.push(`${location}.type must be 'Item' for a Folder in an Item pack.`);
    folderIds.add(document._id);
    return;
  }
  if (!REVIEWED_CORE_PACKS[packId].itemTypes.includes(document.type)) {
    errors.push(`${location}.type '${document.type}' is not allowed in ${packId}.`);
  }
  if (typeof document.system?.slug !== "string") errors.push(`${location}.system.slug must be a string (blank reviewed slugs are preserved).`);
}

function collectStrings(value, strings = []) {
  if (typeof value === "string") strings.push(value);
  else if (Array.isArray(value)) for (const entry of value) collectStrings(entry, strings);
  else if (value && typeof value === "object") for (const entry of Object.values(value)) collectStrings(entry, strings);
  return strings;
}

export function validateReviewedCorePackSource(source) {
  const errors = [];
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new ReviewedCorePackValidationError(["Source root must be an object."]);
  }
  if (source.schemaVersion !== REVIEWED_CORE_PACK_SCHEMA_VERSION) errors.push(`schemaVersion must be ${REVIEWED_CORE_PACK_SCHEMA_VERSION}.`);
  if (source.target?.systemId !== "cypherv2") errors.push("target.systemId must be 'cypherv2'.");
  const packIds = Object.keys(REVIEWED_CORE_PACKS);
  if (JSON.stringify(Object.keys(source.packs ?? {}).sort()) !== JSON.stringify([...packIds].sort())) {
    errors.push(`packs must contain exactly: ${packIds.join(", ")}.`);
  }

  const globalIds = new Set();
  const globalKeys = new Set();
  const identities = new Map();
  for (const packId of packIds) {
    const pack = source.packs?.[packId];
    if (pack?.label !== REVIEWED_CORE_PACKS[packId].label) errors.push(`packs.${packId}.label is invalid.`);
    if (pack?.documentType !== "Item") errors.push(`packs.${packId}.documentType must be 'Item'.`);
    if (!Array.isArray(pack?.documents)) {
      errors.push(`packs.${packId}.documents must be an array.`);
      continue;
    }
    const folderIds = new Set();
    pack.documents.forEach((document, index) => validateDocument(document, packId, index, globalIds, globalKeys, folderIds, errors));
    for (const document of pack.documents) {
      const kind = documentKind(document);
      if (kind) identities.set(document._id, {packId, kind});
    }
    for (const [index, document] of pack.documents.entries()) {
      if (documentKind(document) === "Item" && document.folder && !folderIds.has(document.folder)) {
        errors.push(`packs.${packId}.documents[${index}].folder references missing Folder '${document.folder}'.`);
      }
    }
    const nonBlankSlugs = new Map();
    for (const document of pack.documents.filter((entry) => documentKind(entry) === "Item")) {
      const slug = String(document.system?.slug ?? "").trim();
      if (!slug) continue;
      nonBlankSlugs.set(slug, [...(nonBlankSlugs.get(slug) ?? []), document.name]);
    }
    for (const [slug, names] of nonBlankSlugs) if (names.length > 1) {
      errors.push(`packs.${packId} has duplicate non-blank system.slug '${slug}' (${names.join(", ")}).`);
    }
  }

  for (const [packId, pack] of Object.entries(source.packs ?? {})) {
    for (const [index, document] of (pack.documents ?? []).entries()) {
      for (const value of collectStrings(document)) {
        if (value.includes("Compendium.cypher-v2-test") || value.includes("Compendium.world.")) {
          errors.push(`packs.${packId}.documents[${index}] contains a World compendium dependency.`);
        }
        if (/Compendium\.[A-Za-z0-9_.-]*working/i.test(value)) {
          errors.push(`packs.${packId}.documents[${index}] contains a Working-pack dependency.`);
        }
        for (const match of value.matchAll(BARE_ITEM_UUID_PATTERN)) {
          if (identities.get(match[1])?.kind === "Item") errors.push(`packs.${packId}.documents[${index}] contains unresolved local Item UUID '${match[0]}'.`);
        }
        for (const match of value.matchAll(COMPENDIUM_UUID_PATTERN)) {
          const [, systemId, targetPackId, kind, id] = match;
          if (systemId !== "cypherv2" || !REVIEWED_CORE_PACKS[targetPackId]) continue;
          const target = identities.get(id);
          if (!target || target.packId !== targetPackId || target.kind !== kind) {
            errors.push(`packs.${packId}.documents[${index}] contains unresolved system UUID '${match[0]}'.`);
          }
        }
      }
    }
  }

  if (errors.length > 0) throw new ReviewedCorePackValidationError(errors);
  return source;
}

export async function readReviewedCorePackSource(filePath) {
  return validateReviewedCorePackSource(JSON.parse(await readFile(filePath, "utf8")));
}

export async function writeReviewedCorePackSource(source, filePath) {
  validateReviewedCorePackSource(source);
  await mkdir(path.dirname(filePath), {recursive: true});
  await writeFile(filePath, `${JSON.stringify(source, null, 2)}\n`, "utf8");
}

async function writeDocumentDirectory(directory, documents) {
  await rm(directory, {recursive: true, force: true});
  await mkdir(directory, {recursive: true});
  for (const document of [...documents].sort((left, right) => String(left._key).localeCompare(String(right._key)))) {
    const prefix = documentKind(document)?.toLowerCase() ?? "document";
    await writeFile(path.join(directory, `${prefix}-${document._id}.json`), `${JSON.stringify(document, null, 2)}\n`, "utf8");
  }
}

export async function writeReviewedCorePackSources(source, {generatedRoot}) {
  validateReviewedCorePackSource(source);
  const directories = {};
  for (const packId of Object.keys(REVIEWED_CORE_PACKS)) {
    directories[packId] = path.join(generatedRoot, packId);
    await writeDocumentDirectory(directories[packId], source.packs[packId].documents);
  }
  return directories;
}

function assertPackDestination(projectRoot, destination) {
  const packsRoot = path.resolve(projectRoot, "packs") + path.sep;
  const resolved = path.resolve(destination);
  if (!resolved.startsWith(packsRoot) || !REVIEWED_CORE_PACKS[path.basename(resolved)]) {
    throw new Error(`Refusing to write unexpected pack destination '${resolved}'.`);
  }
}

export async function compileReviewedCorePacks({projectRoot, sources}) {
  const {compilePack} = await import("@foundryvtt/foundryvtt-cli");
  const packIds = Object.keys(REVIEWED_CORE_PACKS);
  const destinations = Object.fromEntries(packIds.map((packId) => [packId, path.resolve(projectRoot, "packs", packId)]));
  for (const destination of Object.values(destinations)) assertPackDestination(projectRoot, destination);

  const stagingRoot = path.resolve(projectRoot, ".generated", "reviewed-core-pack-build");
  const backupRoot = path.resolve(projectRoot, ".generated", "reviewed-core-pack-backup");
  await rm(stagingRoot, {recursive: true, force: true});
  await rm(backupRoot, {recursive: true, force: true});
  await mkdir(stagingRoot, {recursive: true});
  for (const packId of packIds) await compilePack(sources[packId], path.join(stagingRoot, packId), {log: true});

  const exists = async (target) => access(target).then(() => true, () => false);
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
    for (const packId of backedUp.reverse()) {
      const backup = path.join(backupRoot, packId);
      if (await exists(backup)) await rename(backup, destinations[packId]);
    }
    throw error;
  }
  await rm(backupRoot, {recursive: true, force: true});
  await rm(stagingRoot, {recursive: true, force: true});
  return destinations;
}

export function reviewedCorePackSummary(source) {
  validateReviewedCorePackSource(source);
  const packs = {};
  for (const [packId, pack] of Object.entries(source.packs)) {
    const items = pack.documents.filter((document) => documentKind(document) === "Item");
    const folders = pack.documents.filter((document) => documentKind(document) === "Folder");
    packs[packId] = {
      documents: pack.documents.length,
      items: items.length,
      folders: folders.length,
      itemTypes: Object.fromEntries([...new Set(items.map((document) => document.type))].sort().map((type) => [type, items.filter((document) => document.type === type).length]))
    };
  }
  return {packs, referenceRewrites: source.referenceRewrites ?? {}};
}

export function defaultReviewedCorePackPaths(projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")) {
  return {
    projectRoot,
    source: path.join(projectRoot, "content", "core-items", "reviewed-packs.json"),
    generatedRoot: path.join(projectRoot, ".generated", "reviewed-core-pack-import")
  };
}
