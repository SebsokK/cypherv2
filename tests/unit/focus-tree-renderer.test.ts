import {describe, expect, it, vi} from "vitest";

import fixture from "../../fixtures/abides-in-stone-focus.json";
import {
  focusDescriptionExcerpt,
  FocusTreeRenderer
} from "../../src/focus/focus-tree-renderer";
import type {FocusDocumentLike, FocusGraph} from "../../src/focus/focus-types";

function focus(graph = fixture.system.graph as unknown as FocusGraph): FocusDocumentLike {
  return {id: "abides", uuid: "Item.abides", name: "Abides in Stone", type: "focus", system: {graph}};
}

describe("FocusTreeRenderer", () => {
  it("uses snapshots when Ability UUIDs cannot be resolved", async () => {
    const renderer = new FocusTreeRenderer(undefined, async () => null);
    const view = await renderer.prepare(focus(), {
      characterTier: 1,
      progress: {focusUuid: "Item.abides", ownedNodeIds: ["intimidating-presence"]}
    });
    expect(view.nodes.find((node) => node.id === "stone-body")).toMatchObject({
      abilityName: "Stone Body",
      missingAbility: true,
      state: "available"
    });
  });

  it("creates deterministic positions when all coordinates are absent", async () => {
    const graph: FocusGraph = {
      ...fixture.system.graph as unknown as FocusGraph,
      nodes: fixture.system.graph.nodes.map((node) => ({
        ...node,
        position: {x: null, y: null}
      }))
    };
    const renderer = new FocusTreeRenderer(undefined, async () => null);
    const first = await renderer.prepare(focus(graph));
    const second = await renderer.prepare(focus({...graph, nodes: [...graph.nodes].reverse()}));
    expect(Object.fromEntries(first.nodes.map((node) => [node.id, [node.xPercent, node.tier]])))
      .toEqual(Object.fromEntries(second.nodes.map((node) => [node.id, [node.xPercent, node.tier]])));
  });

  it("returns diagnostics instead of silently rendering an invalid graph", async () => {
    const invalid: FocusGraph = {
      ...fixture.system.graph as unknown as FocusGraph,
      connections: [{id: "bad", from: "stone-body", to: "missing"}]
    };
    const renderer = new FocusTreeRenderer(undefined, async () => null);
    const view = await renderer.prepare(focus(invalid));
    expect(view.invalid).toBe(true);
    expect(view.diagnostics[0]).toMatchObject({severity: "error"});
  });

  it("leaves final connection coordinates to the DOM renderer", async () => {
    const renderer = new FocusTreeRenderer(undefined, async () => null);
    const view = await renderer.prepare(focus());
    expect(view.connections[0]).toEqual({
      id: "ip-to-stone-body",
      from: "intimidating-presence",
      to: "stone-body"
    });
  });

  it("prepares compact node dimensions and a read-only Ability description excerpt", async () => {
    const renderer = new FocusTreeRenderer(undefined, async (uuid) => uuid
      ? {name: "Linked Ability", description: "<p>A concise <strong>linked</strong> description.</p>"}
      : null);
    const graph: FocusGraph = {
      ...fixture.system.graph as unknown as FocusGraph,
      nodes: fixture.system.graph.nodes.map((node, index) => ({
        ...node,
        abilityUuid: index === 0 ? "Item.ability" : ""
      }))
    };
    const view = await renderer.prepare(focus(graph));
    expect(view.width).toBe(440);
    expect(view.nodes[0]).toMatchObject({
      abilityName: "Linked Ability",
      descriptionExcerpt: "A concise linked description.",
      width: 124,
      height: 58,
      missingAbility: false
    });
  });

  it("normalizes and truncates tooltip excerpts", () => {
    expect(focusDescriptionExcerpt("<p>One&nbsp; two &amp; three</p>", 14)).toBe("One two & thr…");
  });

  it("enriches the complete source description and falls back to the snapshot", async () => {
    const longDescription = `<p>${"Complete description ".repeat(20)}</p>`;
    const enrich = vi.fn(async (html: string) => `<section>${html}</section>`);
    const renderer = new FocusTreeRenderer(undefined, async (uuid) => uuid === "Item.source"
      ? {name: "Source", description: longDescription, relativeTo: {uuid}}
      : null, enrich);
    const graph: FocusGraph = {
      version: 1,
      nodes: [
        {id: "source", abilityUuid: "Item.source", abilitySnapshot: {name: "Old", description: "snapshot"}, tier: 1, position: {x: 0, y: null}},
        {id: "snapshot", abilityUuid: "", abilitySnapshot: {name: "Snapshot", description: "<p>Snapshot HTML</p>"}, tier: 2, position: {x: 0, y: null}}
      ],
      connections: []
    };
    const view = await renderer.prepare(focus(graph));
    expect(view.nodes.find((node) => node.id === "source")?.descriptionHtml)
      .toBe(`<section>${longDescription}</section>`);
    expect(view.nodes.find((node) => node.id === "snapshot")?.descriptionHtml)
      .toBe("<section><p>Snapshot HTML</p></section>");
    expect(enrich).toHaveBeenCalledTimes(2);
  });

  it("exposes Acquire and Restore only from editable Character progression context", async () => {
    const renderer = new FocusTreeRenderer(undefined, async () => null);
    const view = await renderer.prepare(focus(), {
      characterTier: 1,
      progress: {focusUuid: "Item.abides", ownedNodeIds: ["intimidating-presence"]},
      editable: true,
      pendingFocusChoices: [{id: "choice", source: "newTier", grantTier: 1, focusUuid: ""}],
      missingOwnedNodeIds: new Set(["intimidating-presence"])
    });

    expect(view.nodes.find((node) => node.id === "intimidating-presence")).toMatchObject({
      state: "owned",
      missingOwnedAbility: true,
      canAcquire: false,
      canRestoreAbility: true,
      canUndoAcquisition: true,
      primaryAction: "undoFocusAcquisition"
    });
    expect(view.nodes.find((node) => node.id === "stone-body")).toMatchObject({
      state: "available",
      canAcquire: true,
      canRestoreAbility: false,
      primaryAction: "acquireFocusNode"
    });
  });

  it("keeps normal availability independent from pending-choice data", async () => {
    const renderer = new FocusTreeRenderer(undefined, async () => null);
    const view = await renderer.prepare(focus(), {
      characterTier: 1,
      progress: {focusUuid: "Item.abides", ownedNodeIds: ["intimidating-presence"]},
      editable: true,
      pendingFocusChoices: []
    });

    expect(view.nodes.find((node) => node.id === "stone-body")).toMatchObject({
      state: "available",
      advisoryUnavailable: false,
      canAcquire: true,
      primaryAction: "acquireFocusNode"
    });
  });

  it("renders structurally invalid Character graphs as diagnostic but clickable", async () => {
    const renderer = new FocusTreeRenderer(undefined, async () => null);
    const invalid = focus({
      ...fixture.system.graph as unknown as FocusGraph,
      connections: [{id: "broken", from: "intimidating-presence", to: "missing"}]
    });
    const view = await renderer.prepare(invalid, {
      characterTier: 1,
      progress: {focusUuid: invalid.uuid, ownedNodeIds: []},
      editable: true
    });

    expect(view.invalid).toBe(false);
    expect(view.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({severity: "error"})]));
    expect(view.nodes.every((node) => node.canAcquire && node.primaryAction === "acquireFocusNode")).toBe(true);
  });

  it("keeps a tier-locked node clickable while preserving its diagnostic state", async () => {
    const renderer = new FocusTreeRenderer(undefined, async () => null);
    const view = await renderer.prepare(focus(), {
      characterTier: 1,
      progress: {focusUuid: "Item.abides", ownedNodeIds: ["intimidating-presence"]},
      editable: true,
      pendingFocusChoices: [{id: "choice", source: "newTier", grantTier: 1, focusUuid: ""}]
    });

    expect(view.nodes.find((node) => node.id === "golem-grip")).toMatchObject({
      state: "locked",
      tierLocked: true,
      advisoryUnavailable: true,
      canAcquire: true,
      primaryAction: "acquireFocusNode"
    });
  });

  it("does not expose progression mutations without Character edit permission", async () => {
    const renderer = new FocusTreeRenderer(undefined, async () => null);
    const view = await renderer.prepare(focus(), {
      characterTier: 6,
      progress: {focusUuid: "Item.abides", ownedNodeIds: ["intimidating-presence"]},
      editable: false,
      pendingFocusChoices: [{id: "choice", source: "newTier", grantTier: 6, focusUuid: ""}]
    });

    expect(view.nodes.find((node) => node.id === "intimidating-presence")).toMatchObject({
      canUndoAcquisition: false,
      primaryAction: "openFocusNode"
    });
    expect(view.nodes.find((node) => node.id === "stone-body")).toMatchObject({
      canAcquire: false,
      primaryAction: "openFocusNode"
    });
  });

  it("exposes GM progression repair actions only in explicit GM edit mode", async () => {
    const renderer = new FocusTreeRenderer(undefined, async () => null);
    const view = await renderer.prepare(focus(), {
      characterTier: 1,
      progress: {focusUuid: "Item.abides", ownedNodeIds: ["intimidating-presence"]},
      editable: true,
      gmOverrideAllowed: true,
      gmProgressionEdit: true,
      pendingFocusChoices: []
    });

    expect(view.nodes.find((node) => node.id === "intimidating-presence")).toMatchObject({
      canUndoAcquisition: false,
      canGmRemoveOwned: true,
      canGmMarkOwned: false
    });
    expect(view.nodes.find((node) => node.id === "golem-grip")).toMatchObject({
      state: "locked",
      canAcquire: false,
      canGmMarkOwned: true
    });
  });

  it("prepares all six Tier bands and contextual node actions for the editor", async () => {
    const renderer = new FocusTreeRenderer(undefined, async () => null);
    const selectedNodeId = graphNodeId(fixture.system.graph.nodes[0]?.id);
    const view = await renderer.prepare(focus(), {
      editor: {selectedNodeId, connectionSourceNodeId: selectedNodeId}
    });

    expect(view.mode).toBe("editor");
    expect(view.editor).toBe(true);
    expect(view.tiers.map((band) => band.tier)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(view.nodes.find((node) => node.id === selectedNodeId)).toMatchObject({
      selected: true,
      connectionSource: true,
      primaryAction: "completeFocusConnection"
    });
  });

  it("keeps node clicks as Ability inspection outside Edit Tree", async () => {
    const renderer = new FocusTreeRenderer(undefined, async () => null);
    const view = await renderer.prepare(focus());
    expect(view.editor).toBe(false);
    expect(view.nodes.every((node) => node.primaryAction === "openFocusNode")).toBe(true);
  });
});

function graphNodeId(value: string | undefined): string {
  if (!value) throw new Error("Fixture must contain at least one Focus node.");
  return value;
}
