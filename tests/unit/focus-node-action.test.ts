import {afterEach, describe, expect, it, vi} from "vitest";

import {openFocusNode} from "../../src/focus/focus-node-action";
import type {FocusDocumentLike} from "../../src/focus/focus-types";

function focus(abilityUuid: string): FocusDocumentLike {
  return {
    id: "focus",
    uuid: "Item.focus",
    name: "Test Focus",
    type: "focus",
    system: {graph: {
      version: 1,
      nodes: [{
        id: "node",
        abilityUuid,
        abilitySnapshot: {name: "Snapshot Ability", description: "<p>Snapshot details</p>"},
        tier: 1,
        position: {x: null, y: null}
      }],
      connections: []
    }}
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("read-only Focus node inspection", () => {
  it("opens the linked Ability sheet when its UUID resolves", async () => {
    const render = vi.fn();
    vi.stubGlobal("fromUuid", vi.fn(async () => ({sheet: {render}})));
    vi.stubGlobal("game", {i18n: {localize: (key: string) => key}});
    vi.stubGlobal("foundry", {applications: {api: {DialogV2: {input: vi.fn()}}}});

    await openFocusNode(focus("Item.ability"), "node");

    expect(render).toHaveBeenCalledWith(true);
    expect(foundry.applications.api.DialogV2.input).not.toHaveBeenCalled();
  });

  it("shows the stored snapshot when no Ability source is available", async () => {
    const input = vi.fn(async () => null);
    vi.stubGlobal("fromUuid", vi.fn(async () => null));
    vi.stubGlobal("game", {i18n: {localize: (key: string) => key}});
    vi.stubGlobal("foundry", {applications: {api: {DialogV2: {input}}}});

    await openFocusNode(focus(""), "node");

    expect(input).toHaveBeenCalledWith(expect.objectContaining({
      window: {title: "Snapshot Ability"},
      content: expect.stringContaining("Snapshot details")
    }));
  });
});
