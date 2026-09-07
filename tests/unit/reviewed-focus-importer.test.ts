import {readFile} from "node:fs/promises";
import path from "node:path";
import {describe, expect, it} from "vitest";

// Developer-only JavaScript modules intentionally remain runnable without a build step.
// @ts-expect-error The reviewed content importer has no runtime TypeScript declaration.
const reviewedImporter = await import("../../scripts/reviewed-focus-importer.mjs");
// @ts-expect-error The source catalog importer has no runtime TypeScript declaration.
const catalogImporter = await import("../../scripts/focus-importer.mjs");

const projectRoot = path.resolve(import.meta.dirname, "../..");
const reviewedSource = JSON.parse(await readFile(path.join(projectRoot, "content/foci/reviewed-pack.json"), "utf8"));
const catalogSource = JSON.parse(await readFile(path.join(projectRoot, "content/foci/catalog.json"), "utf8"));

describe("Reviewed Focus pack promotion", () => {
  it("preserves the reviewed document inventory and all manually authored graph connections", () => {
    expect(() => reviewedImporter.validateReviewedFocusSource(reviewedSource)).not.toThrow();
    expect(reviewedImporter.reviewedFocusSummary(reviewedSource)).toEqual({
      foci: 42,
      abilities: 529,
      nodes: 567,
      connections: 927,
      referencedAbilities: 527,
      unreferencedAbilities: ["20e44c7dbd550cab", "bcc0bbabfde3f4d8"]
    });
  });

  it("keeps every generated stable ID and adds only the three reviewed working-pack Abilities", () => {
    const generated = catalogImporter.generateFocusImport(catalogSource);
    const reviewedFocusIds = new Set(reviewedSource.foci.map((document: {_id: string}) => document._id));
    const reviewedAbilityIds = new Set(reviewedSource.abilities.map((document: {_id: string}) => document._id));
    expect(generated.focusDocuments.every((document: {_id: string}) => reviewedFocusIds.has(document._id))).toBe(true);
    expect(generated.abilityDocuments.every((document: {_id: string}) => reviewedAbilityIds.has(document._id))).toBe(true);
    expect([...reviewedAbilityIds].filter((id) => !generated.abilityDocuments.some((document: {_id: string}) => document._id === id)).sort()).toEqual([
      "DT66YLYOCtVqvJaQ",
      "fQoJiAUY9eOVFKgb",
      "prBhE19Qh5zA9zqF"
    ]);
  });

  it("uses only distributable system Ability UUIDs and resolves every graph node", () => {
    const abilityIds = new Set(reviewedSource.abilities.map((document: {_id: string}) => document._id));
    const uuids = reviewedSource.foci.flatMap((focus: {system: {graph: {nodes: Array<{abilityUuid: string}>}}}) => (
      focus.system.graph.nodes.map((node) => node.abilityUuid)
    ));
    expect(uuids).not.toContainEqual(expect.stringContaining("Compendium.world."));
    expect(uuids).not.toContainEqual(expect.stringContaining("cypher-v2-test"));
    expect(uuids).not.toContainEqual(expect.stringContaining("focus-abilities-working"));
    for (const uuid of uuids) {
      expect(uuid).toMatch(/^Compendium\.cypherv2\.focus-abilities\.Item\.[A-Za-z0-9]{16}$/);
      expect(abilityIds.has(uuid.split(".").at(-1))).toBe(true);
    }
  });

  it("retains the three manually added Ability IDs in their exact reviewed Focus nodes", () => {
    const expected = new Map([
      ["Explores", "fQoJiAUY9eOVFKgb"],
      ["Fights Dirty", "prBhE19Qh5zA9zqF"],
      ["Works for a Living", "DT66YLYOCtVqvJaQ"]
    ]);
    for (const [focusName, abilityId] of expected) {
      const focus = reviewedSource.foci.find((document: {name: string}) => document.name === focusName);
      expect(focus.system.graph.nodes).toContainEqual(expect.objectContaining({
        abilityUuid: `Compendium.cypherv2.focus-abilities.Item.${abilityId}`
      }));
    }
  });

  it("rejects stale World UUIDs, dangling edges, and duplicate slugs", () => {
    const staleUuid = structuredClone(reviewedSource);
    staleUuid.foci[0].system.graph.nodes[0].abilityUuid = "Compendium.world.focus-abilities-working.Item.abcdefghijklmnop";
    expect(() => reviewedImporter.validateReviewedFocusSource(staleUuid)).toThrow(/must target Compendium\.cypherv2\.focus-abilities/);

    const dangling = structuredClone(reviewedSource);
    dangling.foci[0].system.graph.connections[0].to = "missing-node";
    expect(() => reviewedImporter.validateReviewedFocusSource(dangling)).toThrow(/references a missing node/);

    const duplicateSlug = structuredClone(reviewedSource);
    duplicateSlug.abilities[1].system.slug = duplicateSlug.abilities[0].system.slug;
    expect(() => reviewedImporter.validateReviewedFocusSource(duplicateSlug)).toThrow(/duplicate system\.slug/);
  });

  it("makes the reviewed pack snapshot—not the pre-review catalog—the build source", async () => {
    const importScript = await readFile(path.join(projectRoot, "scripts/import-foci.mjs"), "utf8");
    const packageJson = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8"));
    expect(importScript).toContain("readReviewedFocusSource");
    expect(importScript).not.toContain("generateFocusImport");
    expect(importScript).not.toContain("catalog.json");
    expect(packageJson.scripts["import:foci"]).toBe("node scripts/import-foci.mjs");
    expect(packageJson.scripts.build).toContain("pnpm import:foci");
  });
});
