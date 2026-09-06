import {describe, expect, it} from "vitest";

import type {PendingFocusChoice} from "../../src/advancement/advancement-types";
import type {FocusDocumentLike, FocusProgress} from "../../src/focus/focus-types";
import {
  FocusAssociationService,
  type FocusAssociationCharacterLike
} from "../../src/services/focus-association-service";

function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  let cursor = target;
  for (const part of parts.slice(0, -1)) cursor = cursor[part] as Record<string, unknown>;
  cursor[parts.at(-1)!] = value;
}

class TestCharacter implements FocusAssociationCharacterLike {
  readonly id = "character";
  readonly uuid = "Actor.character";
  readonly type = "character";
  readonly updates: Record<string, unknown>[] = [];
  readonly abilities = [{id: "ability", sourceFocusUuid: "Item.focus-a"}];
  system: {
    tier: number;
    focusProgress: FocusProgress[];
    advancement: {pendingFocusChoices: PendingFocusChoice[]; initializedFocusUuids: string[]};
  };

  constructor(tier = 1) {
    this.system = {
      tier,
      focusProgress: [],
      advancement: {pendingFocusChoices: [], initializedFocusUuids: []}
    };
  }

  async update(changes: Record<string, unknown>): Promise<unknown> {
    this.updates.push(changes);
    for (const [path, value] of Object.entries(changes)) {
      setPath(this.system as unknown as Record<string, unknown>, path.replace(/^system\./, ""), value);
    }
    return this;
  }
}

function focus(uuid: string): FocusDocumentLike {
  return {id: uuid.split(".").at(-1)!, uuid, name: uuid, type: "focus", system: {
    graph: {version: 1, nodes: [], connections: []}
  }};
}

function service(): FocusAssociationService {
  let id = 0;
  return new FocusAssociationService(() => `choice-${++id}`, () => 1234);
}

describe("FocusAssociationService", () => {
  it("attaches a creation Focus and grants exactly two linked Tier 1 choices", async () => {
    const actor = new TestCharacter();
    const item = focus("Item.focus-a");
    const result = await service().attach(actor, item, "creation");

    expect(result.progress).toMatchObject({
      focusUuid: item.uuid,
      provenance: "creation",
      initialChoicesGranted: true,
      ownedNodeIds: []
    });
    expect(result.choicesGranted).toHaveLength(2);
    expect(result.choicesGranted).toEqual(expect.arrayContaining([
      expect.objectContaining({source: "characterCreation", grantTier: 1, focusUuid: item.uuid})
    ]));
  });

  it("attaches multiple independent Foci without graph duplication", async () => {
    const actor = new TestCharacter();
    const rules = service();
    await rules.attach(actor, focus("Item.primary"), "creation");
    await rules.attach(actor, focus("Compendium.world.foci.Item.additional"), "additional");

    expect(actor.system.focusProgress.map((entry) => ({
      focusUuid: entry.focusUuid,
      provenance: entry.provenance,
      ownedNodeIds: entry.ownedNodeIds
    }))).toEqual([
      {focusUuid: "Item.primary", provenance: "creation", ownedNodeIds: []},
      {focusUuid: "Compendium.world.foci.Item.additional", provenance: "additional", ownedNodeIds: []}
    ]);
    expect(actor.system.advancement.pendingFocusChoices.filter((choice) => (
      choice.focusUuid === "Compendium.world.foci.Item.additional"
    ))).toHaveLength(2);
    expect(actor.system.advancement.pendingFocusChoices.at(-1)?.source).toBe("additionalFocus");
  });

  it("refuses a duplicate Focus and never grants choices twice", async () => {
    const actor = new TestCharacter();
    const item = focus("Item.focus-a");
    const rules = service();
    await rules.attach(actor, item, "creation");
    await expect(rules.attach(actor, item, "additional")).rejects.toMatchObject({code: "duplicate"});
    expect(actor.system.focusProgress).toHaveLength(1);
    expect(actor.system.advancement.pendingFocusChoices).toHaveLength(2);
  });

  it("does not infer a creation Focus for Additional Focus and restricts creation provenance to Tier 1", async () => {
    const tierThree = new TestCharacter(3);
    await service().attach(tierThree, focus("Item.additional"), "additional");
    expect(tierThree.system.focusProgress[0]?.provenance).toBe("additional");
    await expect(service().attach(new TestCharacter(2), focus("Item.primary"), "creation"))
      .rejects.toMatchObject({code: "creation-tier"});
  });

  it("removes only association and linked pending choices, preserving acquired Abilities", async () => {
    const actor = new TestCharacter();
    const item = focus("Item.focus-a");
    const rules = service();
    await rules.attach(actor, item, "creation");
    actor.system.focusProgress[0] = {...actor.system.focusProgress[0]!, ownedNodeIds: ["node-a"]};
    const abilitiesBefore = structuredClone(actor.abilities);

    const result = await rules.remove(actor, item.uuid);

    expect(result.progress.ownedNodeIds).toEqual(["node-a"]);
    expect(actor.system.focusProgress).toEqual([]);
    expect(actor.system.advancement.pendingFocusChoices).toEqual([]);
    expect(actor.abilities).toEqual(abilitiesBefore);
  });

  it("never grants the same Focus its two initial choices a second time after reattachment", async () => {
    const actor = new TestCharacter();
    const item = focus("Item.focus-a");
    const rules = service();
    await rules.attach(actor, item, "creation");
    await rules.remove(actor, item.uuid);

    const attachedAgain = await rules.attach(actor, item, "additional");

    expect(attachedAgain.choicesGranted).toEqual([]);
    expect(attachedAgain.progress.initialChoicesGranted).toBe(false);
    expect(actor.system.advancement.initializedFocusUuids).toEqual([item.uuid]);
  });
});
