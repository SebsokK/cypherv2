import {describe, expect, it} from "vitest";

import type {FocusDocumentLike, FocusProgress} from "../../src/focus/focus-types";
import type {PendingFocusChoice} from "../../src/advancement/advancement-types";
import {FocusEvaluator} from "../../src/focus/focus-evaluator";
import {
  FocusAcquisitionError,
  FocusAcquisitionService,
  focusAbilityDocumentId,
  type EmbeddedFocusAbilityLike,
  type FocusCharacterLike,
  type FocusSourceAbilityLike
} from "../../src/services/focus-acquisition-service";
import {GrantConflictCancelledError} from "../../src/packages/grant-conflicts";

interface MutableAbility extends EmbeddedFocusAbilityLike {
  id: string;
  type: "ability";
  system: Record<string, unknown> & {sourceFocusUuid: string; sourceNodeId: string};
}

class TestCharacter implements FocusCharacterLike {
  readonly id = "character";
  readonly uuid = "Actor.character";
  readonly type = "character";
  readonly items: MutableAbility[] = [];
  readonly updates: Record<string, unknown>[] = [];
  readonly created: Record<string, unknown>[] = [];
  system: {
    tier: number;
    xp: number;
    focusProgress: FocusProgress[];
    advancement: {pendingFocusChoices: PendingFocusChoice[]};
  };

  constructor(progress: FocusProgress[], tier = 2) {
    this.system = {
      tier,
      xp: 7,
      focusProgress: progress,
      advancement: {
        pendingFocusChoices: Array.from({length: 20}, (_, index) => ({
          id: `choice-${index}`,
          source: "newTier",
          grantTier: tier,
          focusUuid: ""
        }))
      }
    };
  }

  async update(changes: Record<string, unknown>): Promise<unknown> {
    this.updates.push(changes);
    const focusProgress = changes["system.focusProgress"];
    if (Array.isArray(focusProgress)) this.system.focusProgress = focusProgress as FocusProgress[];
    const choices = changes["system.advancement.pendingFocusChoices"];
    if (Array.isArray(choices)) this.system.advancement.pendingFocusChoices = choices as PendingFocusChoice[];
    return this;
  }

  async createEmbeddedDocuments(
    _type: string,
    data: Record<string, unknown>[],
    _operation?: Record<string, unknown>
  ): Promise<unknown[]> {
    await Promise.resolve();
    return data.map((entry) => {
      this.created.push(structuredClone(entry));
      const ability: MutableAbility = {
        id: String(entry._id ?? `ability-${this.items.length + 1}`),
        type: "ability",
        system: entry.system as MutableAbility["system"],
        delete: async (): Promise<void> => {
          this.items.splice(this.items.indexOf(ability), 1);
        }
      };
      this.items.push(ability);
      return ability;
    });
  }
}

function focus(uuid = "Item.focus-a", sourceUuid = "Item.shared-ability"): FocusDocumentLike {
  return {
    id: uuid.split(".").at(-1)!,
    uuid,
    name: uuid,
    type: "focus",
    system: {graph: {
      version: 1,
      nodes: [
        {
          id: "root",
          abilityUuid: "",
          abilitySnapshot: {name: "Root"},
          tier: 1,
          position: {x: null, y: null}
        },
        {
          id: "target",
          abilityUuid: sourceUuid,
          abilitySnapshot: {name: "Target Snapshot", description: "Snapshot description"},
          tier: 2,
          position: {x: null, y: null}
        }
      ],
      connections: [{id: "root-target", from: "root", to: "target"}]
    }}
  };
}

function progress(focusUuid: string, ownedNodeIds = ["root"]): FocusProgress {
  return {
    focusUuid,
    ownedNodeIds,
    acquisitions: ownedNodeIds.map((nodeId) => ({
      nodeId,
      mode: "legacy",
      choiceId: "",
      choiceSource: "none",
      choiceGrantTier: 1,
      choiceFocusUuid: "",
      acquiredAt: 0
    }))
  };
}

function sourceAbility(): FocusSourceAbilityLike {
  return {
    type: "ability",
    name: "Source Ability",
    img: "icons/source.svg",
    system: {description: "Source description", tier: 2, category: "general"},
    toObject: () => ({system: {description: "Source description", tier: 2, category: "general"}})
  };
}

function embedded(focusUuid: string, nodeId: string): MutableAbility {
  return {
    id: `${focusUuid}-${nodeId}`,
    type: "ability",
    system: {sourceFocusUuid: focusUuid, sourceNodeId: nodeId}
  };
}

describe("FocusAcquisitionService lifecycle", () => {
  it("requires and consumes exactly one pending Focus Choice", async () => {
    const item = focus();
    const actor = new TestCharacter([progress(item.uuid)]);
    actor.system.advancement.pendingFocusChoices = [{
      id: "choice", source: "newTier", grantTier: 2, focusUuid: ""
    }];
    const service = new FocusAcquisitionService(undefined, async () => sourceAbility());

    await service.acquire(actor, item, "target");

    expect(actor.system.advancement.pendingFocusChoices).toEqual([]);
    expect(actor.system.focusProgress[0]!.ownedNodeIds).toContain("target");
    expect(actor.system.focusProgress[0]!.acquisitions).toContainEqual({
      nodeId: "target",
      mode: "choice",
      choiceId: "choice",
      choiceSource: "newTier",
      choiceGrantTier: 2,
      choiceFocusUuid: "",
      acquiredAt: expect.any(Number)
    });
  });

  it("undoes an acquisition and restores the exact consumed Focus Choice", async () => {
    const item = focus();
    const actor = new TestCharacter([progress(item.uuid)]);
    const choice: PendingFocusChoice = {
      id: "creation-choice", source: "characterCreation", grantTier: 1, focusUuid: item.uuid
    };
    actor.system.advancement.pendingFocusChoices = [choice];
    const service = new FocusAcquisitionService(undefined, async () => sourceAbility(), () => 42);
    await service.acquire(actor, item, "target");

    const result = await service.undo(actor, item, "target");

    expect(result.choiceRestored).toEqual(choice);
    expect(actor.system.advancement.pendingFocusChoices).toEqual([choice]);
    expect(actor.system.focusProgress[0]!.ownedNodeIds).toEqual(["root"]);
    expect(actor.system.focusProgress[0]!.acquisitions?.map((entry) => entry.nodeId)).toEqual(["root"]);
    expect(actor.items).toHaveLength(1);
  });

  it("deletes only the embedded Ability with the exact Focus/node provenance when requested", async () => {
    const item = focus();
    const actor = new TestCharacter([progress(item.uuid)]);
    actor.items.push(embedded("Item.other-focus", "target"));
    const service = new FocusAcquisitionService(undefined, async () => sourceAbility());
    await service.acquire(actor, item, "target");

    const result = await service.undo(actor, item, "target", {deleteAbility: true});

    expect(result.abilityDeleted).toBe(true);
    expect(actor.items).toHaveLength(1);
    expect(actor.items[0]!.system.sourceFocusUuid).toBe("Item.other-focus");
  });

  it("blocks player Undo when an acquired descendant depends on the node", async () => {
    const item = focus();
    const actor = new TestCharacter([progress(item.uuid, ["root", "target"])]);
    const service = new FocusAcquisitionService(undefined, async () => sourceAbility());

    await expect(service.undo(actor, item, "root")).rejects.toMatchObject({
      code: "undo-dependent-nodes",
      dependentNodeIds: ["target"]
    });
    expect(actor.system.focusProgress[0]!.ownedNodeIds).toEqual(["root", "target"]);
  });

  it("allows GM Force Undo without deleting descendants and reports invalid progression", async () => {
    const item = focus();
    const actor = new TestCharacter([progress(item.uuid, ["root", "target"])]);
    const rootAbility = embedded(item.uuid, "root");
    rootAbility.delete = async (): Promise<void> => {
      actor.items.splice(actor.items.indexOf(rootAbility), 1);
    };
    actor.items.push(rootAbility, embedded(item.uuid, "target"));
    const service = new FocusAcquisitionService(undefined, async () => sourceAbility());

    const result = await service.undo(actor, item, "root", {force: true, deleteAbility: true});

    expect(actor.system.focusProgress[0]!.ownedNodeIds).toEqual(["target"]);
    expect(actor.items.map((entry) => entry.system.sourceNodeId)).toEqual(["target"]);
    expect(result.invalidOwnedNodeIds).toEqual(["target"]);
  });

  it("lets GM repair mode mark a locked node owned without consuming a choice", async () => {
    const item = focus();
    const actor = new TestCharacter([progress(item.uuid, [])]);
    actor.system.advancement.pendingFocusChoices = [];
    const service = new FocusAcquisitionService(undefined, async () => sourceAbility());

    await service.markOwnedWithGmOverride(actor, item, "target");

    expect(actor.system.focusProgress[0]!.ownedNodeIds).toEqual(["target"]);
    expect(actor.system.advancement.pendingFocusChoices).toEqual([]);
    expect(actor.system.focusProgress[0]!.acquisitions).toContainEqual(expect.objectContaining({
      nodeId: "target", mode: "gmManual", choiceSource: "none"
    }));
  });

  it("records an advisory acquisition without consuming a missing pending choice", async () => {
    const item = focus();
    const actor = new TestCharacter([progress(item.uuid)]);
    actor.system.advancement.pendingFocusChoices = [];
    const service = new FocusAcquisitionService(undefined, async () => sourceAbility());

    await service.acquire(actor, item, "target");

    expect(actor.created).toHaveLength(1);
    expect(actor.system.advancement.pendingFocusChoices).toEqual([]);
    expect(actor.system.focusProgress[0]!.acquisitions).toContainEqual(expect.objectContaining({
      nodeId: "target", mode: "manualOverride", choiceSource: "none"
    }));
  });

  it("keeps pending choices untouched in the Character-facing manual workflow", async () => {
    const item = focus();
    const actor = new TestCharacter([progress(item.uuid)]);
    actor.system.advancement.pendingFocusChoices = [{
      id: "legacy-pending", source: "newTier", grantTier: 2, focusUuid: ""
    }];
    const service = new FocusAcquisitionService(undefined, async () => sourceAbility());

    await service.acquireManual(actor, item, "target");

    expect(actor.system.advancement.pendingFocusChoices).toHaveLength(1);
    expect(actor.system.focusProgress[0]!.acquisitions?.at(-1)).toMatchObject({
      nodeId: "target", mode: "manualOverride", choiceSource: "none"
    });
    expect(actor.created[0]).toMatchObject({
      system: {sourceFocusUuid: item.uuid, sourceNodeId: "target", grantedBy: {kind: "focus"}}
    });
  });

  it("allows manual acquisition from a structurally invalid graph", async () => {
    const base = focus();
    const item: FocusDocumentLike = {
      ...base,
      system: {graph: {
        ...base.system.graph,
        connections: [{id: "broken", from: "root", to: "missing"}]
      }}
    };
    const actor = new TestCharacter([progress(item.uuid)]);
    const service = new FocusAcquisitionService(undefined, async () => sourceAbility());

    await service.acquireManual(actor, item, "target");

    expect(actor.system.focusProgress[0]!.ownedNodeIds).toContain("target");
    expect(actor.system.focusProgress[0]!.acquisitions?.at(-1)?.mode).toBe("manualOverride");
  });

  it("offers an explicit GM override without consuming a Focus Choice", async () => {
    const item = focus();
    const actor = new TestCharacter([progress(item.uuid)]);
    actor.system.advancement.pendingFocusChoices = [];
    const service = new FocusAcquisitionService(undefined, async () => sourceAbility());

    await service.acquireWithGmOverride(actor, item, "target");

    expect(actor.system.focusProgress[0]!.ownedNodeIds).toContain("target");
    expect(actor.system.advancement.pendingFocusChoices).toEqual([]);
  });

  it("consumes two initial choices, then records a third acquisition as a manual override", async () => {
    const item: FocusDocumentLike = {
      id: "initial-focus",
      uuid: "Item.initial-focus",
      name: "Initial Focus",
      type: "focus",
      system: {graph: {
        version: 1,
        nodes: [
          ...["one", "two", "three"].map((id) => ({
            id,
            abilityUuid: "",
            abilitySnapshot: {name: id},
            tier: 1,
            position: {x: null, y: null}
          })),
          {
            id: "later",
            abilityUuid: "",
            abilitySnapshot: {name: "later"},
            tier: 2,
            position: {x: null, y: null}
          }
        ],
        connections: ["one", "two", "three"].map((from) => ({
          id: `${from}-later`, from, to: "later"
        }))
      }}
    };
    const actor = new TestCharacter([progress(item.uuid, [])], 1);
    actor.system.advancement.pendingFocusChoices = ["a", "b"].map((id) => ({
      id, source: "characterCreation", grantTier: 1, focusUuid: item.uuid
    }));
    const service = new FocusAcquisitionService(undefined, async () => null);

    await service.acquire(actor, item, "one");
    await service.acquire(actor, item, "two");
    await service.acquire(actor, item, "three");
    expect(actor.system.focusProgress[0]?.ownedNodeIds).toEqual(["one", "two", "three"]);
    expect(actor.system.advancement.pendingFocusChoices).toEqual([]);
    expect(actor.system.focusProgress[0]?.acquisitions?.at(-1)).toMatchObject({
      nodeId: "three", mode: "manualOverride", choiceSource: "none"
    });

    actor.system.tier = 2;
    actor.system.advancement.pendingFocusChoices.push({
      id: "later-choice", source: "newTier", grantTier: 2, focusUuid: ""
    });
    await service.acquire(actor, item, "later");
    expect(actor.system.focusProgress[0]?.ownedNodeIds).toEqual(["one", "two", "three", "later"]);
    expect(actor.system.advancement.pendingFocusChoices).toEqual([]);
  });

  it("acquires an eligible node and creates its embedded Ability exactly once", async () => {
    const item = focus();
    const actor = new TestCharacter([progress(item.uuid)]);
    const service = new FocusAcquisitionService(undefined, async () => sourceAbility());

    const result = await service.acquire(actor, item, "target");

    expect(result).toEqual({status: "acquired", abilityCreated: true});
    expect(actor.created).toHaveLength(1);
    expect(actor.created[0]).toMatchObject({
      _id: focusAbilityDocumentId(item.uuid, "target"),
      name: "Source Ability",
      type: "ability",
      system: {sourceFocusUuid: item.uuid, sourceNodeId: "target"}
    });
    expect(actor.system.focusProgress[0]!.ownedNodeIds).toEqual(["root", "target"]);
  });

  it("treats a second acquisition of the same owned node as an idempotent no-op", async () => {
    const item = focus();
    const actor = new TestCharacter([progress(item.uuid)]);
    const service = new FocusAcquisitionService(undefined, async () => sourceAbility());
    await service.acquire(actor, item, "target");
    actor.items[0]!.system.archived = true;

    const second = await service.acquire(actor, item, "target");

    expect(second).toEqual({status: "already-owned", abilityCreated: false});
    expect(actor.created).toHaveLength(1);
    expect(actor.updates).toHaveLength(1);
  });

  it("serializes rapid repeated acquisition attempts without duplicate Items", async () => {
    const item = focus();
    const actor = new TestCharacter([progress(item.uuid)]);
    const service = new FocusAcquisitionService(undefined, async () => {
      await Promise.resolve();
      return sourceAbility();
    });

    const results = await Promise.all(Array.from({length: 12}, () => (
      service.acquire(actor, item, "target")
    )));

    expect(results.filter((entry) => entry.status === "acquired")).toHaveLength(1);
    expect(actor.created).toHaveLength(1);
    expect(actor.system.focusProgress[0]!.ownedNodeIds.filter((id) => id === "target")).toHaveLength(1);
  });

  it("reuses an existing provenance-matched Ability after a partial acquisition", async () => {
    const item = focus();
    const actor = new TestCharacter([progress(item.uuid)]);
    actor.items.push(embedded(item.uuid, "target"));
    const service = new FocusAcquisitionService(undefined, async () => sourceAbility());

    const result = await service.acquire(actor, item, "target");

    expect(result).toEqual({status: "acquired", abilityCreated: false});
    expect(actor.items).toHaveLength(1);
    expect(actor.system.focusProgress[0]!.ownedNodeIds).toEqual(["root", "target"]);
  });

  it("keeps progression owned after the embedded Ability is deliberately deleted", async () => {
    const item = focus();
    const actor = new TestCharacter([progress(item.uuid)]);
    actor.items.push(embedded(item.uuid, "root"));
    const service = new FocusAcquisitionService(undefined, async () => sourceAbility());
    await service.acquire(actor, item, "target");
    actor.items.splice(actor.items.findIndex((entry) => entry.system.sourceNodeId === "target"), 1);

    expect(actor.system.focusProgress[0]!.ownedNodeIds).toContain("target");
    expect(service.missingOwnedNodeIds(actor, item, actor.system.focusProgress[0]!)).toEqual(
      new Set(["target"])
    );
  });

  it("restores a missing owned Ability without changing XP or progression", async () => {
    const item = focus();
    const actor = new TestCharacter([progress(item.uuid, ["root", "target"])]);
    actor.items.push(embedded(item.uuid, "root"));
    const service = new FocusAcquisitionService(undefined, async () => sourceAbility());
    const beforeProgress = structuredClone(actor.system.focusProgress);
    const beforeXp = actor.system.xp;

    const result = await service.restoreAbility(actor, item, "target");

    expect(result).toEqual({status: "restored", abilityCreated: true});
    expect(actor.system.focusProgress).toEqual(beforeProgress);
    expect(actor.system.xp).toBe(beforeXp);
    expect(actor.updates).toEqual([]);
  });

  it("serializes repeated Restore Ability requests", async () => {
    const item = focus();
    const actor = new TestCharacter([progress(item.uuid, ["root", "target"])]);
    const service = new FocusAcquisitionService(undefined, async () => sourceAbility());

    const results = await Promise.all(Array.from({length: 8}, () => (
      service.restoreAbility(actor, item, "target")
    )));

    expect(results.filter((entry) => entry.status === "restored")).toHaveLength(1);
    expect(actor.created).toHaveLength(1);
    expect(actor.updates).toEqual([]);
  });

  it("leaves an existing embedded Ability valid when its original source disappears", async () => {
    const item = focus();
    const actor = new TestCharacter([progress(item.uuid)]);
    let source: FocusSourceAbilityLike | null = sourceAbility();
    const service = new FocusAcquisitionService(undefined, async () => source);
    await service.acquire(actor, item, "target");
    source = null;

    expect(actor.items).toHaveLength(1);
    expect(service.missingOwnedNodeIds(actor, item, actor.system.focusProgress[0]!)).not.toContain("target");
    expect(actor.items[0]!.system).toMatchObject({
      sourceFocusUuid: item.uuid,
      sourceNodeId: "target",
      description: "Source description"
    });
  });

  it("restores from the snapshot when the source Ability is unavailable", async () => {
    const item = focus();
    const actor = new TestCharacter([progress(item.uuid, ["root", "target"])]);
    const service = new FocusAcquisitionService(undefined, async () => null);

    await service.restoreAbility(actor, item, "target");

    expect(actor.created[0]).toMatchObject({
      name: "Target Snapshot",
      system: {
        tier: 2,
        description: "Snapshot description",
        sourceFocusUuid: item.uuid,
        sourceNodeId: "target"
      }
    });
  });

  it("fails cleanly when neither source nor a usable snapshot exists", async () => {
    const item = focus();
    const target = item.system.graph.nodes[1]!;
    const invalid: FocusDocumentLike = {
      ...item,
      system: {graph: {
        ...item.system.graph,
        nodes: [item.system.graph.nodes[0]!, {
          ...target,
          abilitySnapshot: {name: "", description: ""}
        }]
      }}
    };
    const actor = new TestCharacter([progress(invalid.uuid, ["root", "target"])]);
    const service = new FocusAcquisitionService(undefined, async () => null);

    await expect(service.restoreAbility(actor, invalid, "target")).rejects.toMatchObject({
      code: "ability-data-unavailable"
    } satisfies Partial<FocusAcquisitionError>);
    expect(actor.created).toEqual([]);
  });

  it("keeps an owned node owned after Character Tier is lowered", async () => {
    const item = focus();
    const actor = new TestCharacter([progress(item.uuid)], 2);
    const service = new FocusAcquisitionService(undefined, async () => sourceAbility());
    await service.acquire(actor, item, "target");
    actor.system.tier = 1;

    const evaluation = new FocusEvaluator().evaluateProgress(
      item.system.graph,
      actor.system.tier,
      actor.system.focusProgress[0]!
    );
    expect(evaluation.nodes.find((entry) => entry.node.id === "target")?.state).toBe("owned");
  });

  it("keeps two Focus progressions independent", async () => {
    const first = focus("Item.focus-a");
    const second = focus("Item.focus-b", "Item.other-ability");
    const actor = new TestCharacter([progress(first.uuid), progress(second.uuid)]);
    const service = new FocusAcquisitionService(undefined, async () => sourceAbility());

    await Promise.all([
      service.acquire(actor, first, "target"),
      service.acquire(actor, second, "target")
    ]);

    expect(actor.system.focusProgress[0]!.ownedNodeIds).toEqual(["root", "target"]);
    expect(actor.system.focusProgress[1]!.ownedNodeIds).toEqual(["root", "target"]);
  });

  it("refuses a duplicate Ability from a second Focus without consuming its choice or progression", async () => {
    const first = focus("Item.focus-a", "Item.shared-ability");
    const second = focus("Item.focus-b", "Item.shared-ability");
    const actor = new TestCharacter([progress(first.uuid), progress(second.uuid)]);
    const service = new FocusAcquisitionService(undefined, async () => sourceAbility());

    await service.acquire(actor, first, "target");
    const choicesAfterFirst = actor.system.advancement.pendingFocusChoices.length;
    await expect(service.acquire(actor, second, "target")).rejects.toMatchObject({
      code: "duplicate-grant"
    } satisfies Partial<FocusAcquisitionError>);

    expect(actor.items).toHaveLength(1);
    expect(actor.items[0]!.system).toMatchObject({sourceFocusUuid: first.uuid, sourceNodeId: "target"});
    expect(actor.system.focusProgress[1]!.ownedNodeIds).toEqual(["root"]);
    expect(actor.system.advancement.pendingFocusChoices).toHaveLength(choicesAfterFirst);
  });

  it("opens the reusable conflict path and never consumes a Focus Choice when cancelled", async () => {
    const first = focus("Item.focus-a", "Item.shared-ability");
    const second = focus("Item.focus-b", "Item.shared-ability");
    const actor = new TestCharacter([progress(first.uuid), progress(second.uuid)]);
    const service = new FocusAcquisitionService(undefined, async () => sourceAbility());
    await service.acquire(actor, first, "target");
    const choices = actor.system.advancement.pendingFocusChoices.length;

    await expect(service.acquire(actor, second, "target", async (conflict) => {
      expect(conflict).toMatchObject({context: "focus", allowSuppress: false, allowGmOverride: true});
      return {action: "cancel"};
    })).rejects.toBeInstanceOf(GrantConflictCancelledError);

    expect(actor.items).toHaveLength(1);
    expect(actor.system.focusProgress[1]!.ownedNodeIds).toEqual(["root"]);
    expect(actor.system.advancement.pendingFocusChoices).toHaveLength(choices);
  });

  it("supports an explicit Focus conflict GM Override without a duplicate or consumed choice", async () => {
    const first = focus("Item.focus-a", "Item.shared-ability");
    const second = focus("Item.focus-b", "Item.shared-ability");
    const actor = new TestCharacter([progress(first.uuid), progress(second.uuid)]);
    const service = new FocusAcquisitionService(undefined, async () => sourceAbility());
    await service.acquire(actor, first, "target");
    const choices = actor.system.advancement.pendingFocusChoices.length;
    const result = await service.acquire(actor, second, "target", async () => ({action: "gmOverride"}));

    expect(result).toEqual({status: "acquired", abilityCreated: false});
    expect(actor.items).toHaveLength(1);
    expect(actor.system.focusProgress[1]!.ownedNodeIds).toEqual(["root", "target"]);
    expect((actor.system.focusProgress[1]!.acquisitions ?? []).at(-1)?.mode).toBe("gmOverride");
    expect(actor.system.advancement.pendingFocusChoices).toHaveLength(choices);
  });

  it("allows a prerequisite-locked node as an advisory manual override", async () => {
    const item = focus();
    const actor = new TestCharacter([progress(item.uuid, [])]);
    const service = new FocusAcquisitionService(undefined, async () => sourceAbility());
    const choices = actor.system.advancement.pendingFocusChoices.length;

    await service.acquire(actor, item, "target");

    expect(actor.created).toHaveLength(1);
    expect(actor.system.advancement.pendingFocusChoices).toHaveLength(choices);
    expect(actor.system.focusProgress[0]!.acquisitions).toContainEqual(expect.objectContaining({
      nodeId: "target", mode: "manualOverride", choiceSource: "none"
    }));
  });

  it("allows a tier-locked node without consuming a pending choice", async () => {
    const item = focus();
    const actor = new TestCharacter([progress(item.uuid)], 1);
    const service = new FocusAcquisitionService(undefined, async () => sourceAbility());
    const choices = actor.system.advancement.pendingFocusChoices.length;

    await service.acquire(actor, item, "target");

    expect(actor.system.focusProgress[0]!.ownedNodeIds).toEqual(["root", "target"]);
    expect(actor.system.advancement.pendingFocusChoices).toHaveLength(choices);
    expect(actor.system.focusProgress[0]!.acquisitions?.at(-1)).toMatchObject({
      nodeId: "target", mode: "manualOverride", choiceSource: "none"
    });
  });

  it("does not mutate existing state merely because the Focus source is unavailable", () => {
    const actor = new TestCharacter([progress("Item.missing", ["root", "target"])]);
    actor.items.push(embedded("Item.missing", "target"));
    const before = structuredClone({system: actor.system, items: actor.items});

    // No Focus document means no acquisition service operation is attempted.
    expect({system: actor.system, items: actor.items}).toEqual(before);
    expect(actor.updates).toEqual([]);
  });
});
