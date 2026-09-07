import {readFile} from "node:fs/promises";
import path from "node:path";
import {describe, expect, it} from "vitest";

// The import pipeline deliberately remains plain Node.js so it can run before TypeScript/Vite.
// @ts-expect-error Developer-only JavaScript module has no runtime-facing TypeScript declaration.
const importer = await import("../../scripts/focus-importer.mjs");

function ability(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "shared-sense",
    name: "Shared Sense",
    tier: 1,
    fullRulesDescription: "<p>Reviewed synthetic test rules.</p>",
    sourcePage: "10",
    actionClassification: "action",
    cost: {kind: "fixed", amount: 2, allowedPools: ["might", "intellect"], ignoresEdge: false},
    repeatability: {canTakeMultipleTimes: false, maximumSelections: null},
    prerequisiteAbilityId: null,
    laterTierChanges: [],
    automation: {activation: "action", roll: "task", rollModifier: 1},
    deduplicationNote: "",
    reviewStatus: "verified",
    reviewNote: "",
    reviewIssues: [],
    ...overrides
  };
}

function focus(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "tests-the-importer",
    name: "Tests the Importer",
    description: "<p>Synthetic Focus used only by unit tests.</p>",
    sourcePage: "20",
    genreThemes: ["test"],
    gmIntrusionSuggestions: [],
    additionalEquipment: "",
    associatedAbilities: ["shared-sense"],
    graph: {
      nodes: [
        {id: "sense-one", abilityId: "shared-sense", tier: 1, order: 0, reviewStatus: "verified", reviewNote: ""}
      ],
      edges: []
    },
    reviewStatus: "verified",
    reviewNote: "",
    reviewIssues: [],
    ...overrides
  };
}

function catalog(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    source: {id: "synthetic-tests", title: "Synthetic Tests", version: "1", license: "test-only"},
    abilities: [ability()],
    foci: [focus()],
    ...overrides
  };
}

describe("Focus compendium importer", () => {
  it("generates stable Foundry IDs, UUID references, and identical reruns", () => {
    const first = importer.generateFocusImport(catalog());
    const second = importer.generateFocusImport(catalog());
    expect(first).toEqual(second);
    expect(first.abilityDocuments[0]._id).toHaveLength(16);
    expect(first.focusDocuments[0].system.graph.nodes[0]).toMatchObject({
      id: "sense-one",
      abilityUuid: importer.abilityCompendiumUuid("shared-sense"),
      tier: 1
    });
  });

  it("rejects duplicate stable IDs, invalid tiers, and missing prerequisites", () => {
    expect(() => importer.generateFocusImport(catalog({
      abilities: [ability(), ability({name: "Another Name"})]
    }))).toThrow(/Duplicate Ability stable ID/);
    expect(() => importer.generateFocusImport(catalog({
      abilities: [ability({tier: 7})]
    }))).toThrow(/integer from 1 to 6/);
    expect(() => importer.generateFocusImport(catalog({
      abilities: [ability({prerequisiteAbilityId: "missing-ability"})]
    }))).toThrow(/prerequisite references missing Ability/);
  });

  it("rejects missing Ability and graph-node references", () => {
    expect(() => importer.generateFocusImport(catalog({
      foci: [focus({associatedAbilities: ["missing-ability"]})]
    }))).toThrow(/references missing Ability/);
    expect(() => importer.generateFocusImport(catalog({
      foci: [focus({
        graph: {
          nodes: [{id: "sense-one", abilityId: "shared-sense", tier: 1, order: 0, reviewStatus: "verified", reviewNote: ""}],
          edges: [{id: "broken-edge", from: "sense-one", to: "missing-node", reviewStatus: "verified", reviewNote: ""}]
        }
      })]
    }))).toThrow(/references a missing node/);
  });

  it("emits verified edges and reports rather than guesses ambiguous edges", () => {
    const secondAbility = ability({id: "second-sense", name: "Second Sense"});
    const generated = importer.generateFocusImport(catalog({
      abilities: [ability(), secondAbility],
      foci: [focus({
        associatedAbilities: ["shared-sense", "second-sense"],
        graph: {
          nodes: [
            {id: "sense-one", abilityId: "shared-sense", tier: 1, order: 0, reviewStatus: "verified", reviewNote: ""},
            {id: "sense-two", abilityId: "second-sense", tier: 2, order: 1, reviewStatus: "verified", reviewNote: ""}
          ],
          edges: [
            {id: "verified-edge", from: "sense-one", to: "sense-two", reviewStatus: "verified", reviewNote: ""},
            {id: "uncertain-edge", from: "sense-two", to: "sense-one", reviewStatus: "ambiguous", reviewNote: "Source connection requires review."}
          ]
        }
      })]
    }));
    expect(generated.focusDocuments[0].system.graph.connections).toEqual([
      {id: "verified-edge", from: "sense-one", to: "sense-two"}
    ]);
    expect(generated.report.summary.omittedGraphEdges).toBe(1);
    expect(generated.report.issues).toContainEqual(expect.objectContaining({issueType: "ambiguous-graph-edge"}));
  });

  it("merges canonical cross-Focus use and permits documented same-name variants", () => {
    const sharedFocus = focus({id: "second-focus", name: "Second Focus"});
    const merged = importer.generateFocusImport(catalog({foci: [focus(), sharedFocus]}));
    expect(merged.report.deduplication.merged).toHaveLength(1);

    const variants = [
      ability({id: "echo-one", name: "Echo", fullRulesDescription: "First rules.", deduplicationNote: "First mechanical version."}),
      ability({id: "echo-two", name: "Echo", fullRulesDescription: "Second rules.", deduplicationNote: "Second mechanical version."})
    ];
    const distinct = importer.generateFocusImport(catalog({abilities: variants, foci: []}));
    expect(distinct.report.deduplication.sameNameDistinct).toHaveLength(1);
  });

  it("rejects mechanically equivalent same-name records instead of silently duplicating them", () => {
    expect(() => importer.generateFocusImport(catalog({
      abilities: [
        ability({id: "echo-one", name: "Echo", deduplicationNote: "First copy."}),
        ability({id: "echo-two", name: "Echo", deduplicationNote: "Second copy."})
      ],
      foci: []
    }))).toThrow(/must share one canonical stable ID/);
  });

  it("declares both generated Item packs and integrates generation into build", async () => {
    const projectRoot = path.resolve(import.meta.dirname, "../..");
    const manifest = JSON.parse(await readFile(path.join(projectRoot, "system.json"), "utf8"));
    const packageJson = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8"));
    const releaseScript = await readFile(path.join(projectRoot, "scripts/package-release.ps1"), "utf8");
    expect(manifest.packs).toEqual(expect.arrayContaining([
      {name: "focus-abilities", label: "Focus Abilities", path: "packs/focus-abilities", type: "Item", system: "cypherv2"},
      {name: "foci", label: "Foci", path: "packs/foci", type: "Item", system: "cypherv2"}
    ]));
    expect(packageJson.scripts["import:foci"]).toBe("node scripts/import-foci.mjs");
    expect(packageJson.scripts.build).toContain("pnpm import:foci");
    for (const developmentPath of ["content/", "_reference/", ".generated/", ".reports/"]) {
      expect(releaseScript).toContain(`"${developmentPath}"`);
    }
  });
});
