import {describe, expect, it} from "vitest";

import type {CoreCharacterSetupRequest} from "../../src/creation/character-creation-types";
import {
  CharacterInitializationService,
  type InitializationCharacterLike
} from "../../src/services/character-initialization-service";

function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  let cursor = target;
  for (const part of parts.slice(0, -1)) {
    if (!cursor[part]) cursor[part] = {};
    cursor = cursor[part] as Record<string, unknown>;
  }
  cursor[parts.at(-1)!] = value;
}

class TestCharacter implements InitializationCharacterLike {
  readonly type = "character";
  readonly items: Array<{name: string; type: string; system: Record<string, unknown>; delete(): Promise<void>}> = [];
  readonly updates: Record<string, unknown>[] = [];
  failUpdate = false;
  system = {
    creation: {coreInitialized: false, mode: "uninitialized" as const, initializedAt: 0},
    marker: "preserve"
  };

  async createEmbeddedDocuments(_type: string, data: Record<string, unknown>[]): Promise<unknown[]> {
    return data.map((entry) => {
      const item = {
        name: String(entry.name),
        type: String(entry.type),
        system: entry.system as Record<string, unknown>,
        delete: async (): Promise<void> => {
          this.items.splice(this.items.indexOf(item), 1);
        }
      };
      this.items.push(item);
      return item;
    });
  }

  async update(changes: Record<string, unknown>): Promise<unknown> {
    if (this.failUpdate) throw new Error("Injected failure");
    this.updates.push(changes);
    for (const [path, value] of Object.entries(changes)) {
      setPath(this.system as unknown as Record<string, unknown>, path.replace(/^system\./, ""), value);
    }
    return this;
  }
}

const twoSkills: CoreCharacterSetupRequest = {
  pools: {might: 2, speed: 4, intellect: 0},
  skills: [
    {customName: "Climbing", rank: "trained"},
    {customName: "History", rank: "trained"}
  ]
};

describe("CharacterInitializationService", () => {
  it("finalizes base 8 Pools plus exactly six points and all Core defaults", async () => {
    const actor = new TestCharacter();
    await new CharacterInitializationService(undefined, () => 1234).setup(actor, twoSkills);
    expect(actor.updates[0]).toMatchObject({
      "system.tier": 1,
      "system.stats.might.value": 10,
      "system.stats.might.baseMax": 10,
      "system.stats.speed.value": 12,
      "system.stats.intellect.value": 8,
      "system.stats.might.baseEdge": 0,
      "system.stats.speed.baseEdge": 0,
      "system.stats.intellect.baseEdge": 0,
      "system.stats.effortBase": 1,
      "system.cypherLimitBase": 2,
      "system.proficiencies.weaponCategories": ["light"],
      "system.proficiencies.armorCategories": [],
      "system.creation": {coreInitialized: true, mode: "completed", initializedAt: 1234}
    });
    expect(actor.items.map((item) => [item.name, item.system.rank])).toEqual([
      ["Climbing", "trained"], ["History", "trained"]
    ]);
  });

  it("blocks an invalid allocation before creating Items", async () => {
    const actor = new TestCharacter();
    await expect(new CharacterInitializationService().setup(actor, {
      ...twoSkills, pools: {might: 2, speed: 2, intellect: 1}
    })).rejects.toMatchObject({code: "invalid-pools"});
    expect(actor.items).toEqual([]);
    expect(actor.updates).toEqual([]);
  });

  it("supports the optional third trained Skill plus a different Inability", async () => {
    const actor = new TestCharacter();
    await new CharacterInitializationService().setup(actor, {
      pools: {might: 6, speed: 0, intellect: 0},
      skills: [
        {customName: "One", rank: "trained"},
        {customName: "Two", rank: "trained"},
        {customName: "Three", rank: "trained"},
        {customName: "Four", rank: "inability"}
      ]
    });
    expect(actor.items.map((item) => item.system.rank)).toEqual([
      "trained", "trained", "trained", "inability"
    ]);
  });

  it("rejects duplicate selected or pre-existing Skills", async () => {
    const actor = new TestCharacter();
    await expect(new CharacterInitializationService().setup(actor, {
      ...twoSkills,
      skills: [{customName: "History", rank: "trained"}, {customName: " history ", rank: "trained"}]
    })).rejects.toMatchObject({code: "duplicate-skill"});
    actor.items.push({name: "Climbing", type: "skill", system: {}, async delete() {}});
    await expect(new CharacterInitializationService().setup(actor, twoSkills))
      .rejects.toMatchObject({code: "duplicate-skill"});
  });

  it("copies a world Skill source while forcing the requested starting rank", async () => {
    const actor = new TestCharacter();
    const source = {
      uuid: "Item.stealth", name: "Stealth", type: "skill",
      system: {rank: "expert", category: "general", contexts: [], acquisition: {}}
    };
    const service = new CharacterInitializationService(async (uuid) => uuid === source.uuid ? source : null);
    await service.setup(actor, {
      pools: {might: 0, speed: 0, intellect: 6},
      skills: [{sourceUuid: source.uuid, rank: "trained"}, {customName: "Lore", rank: "trained"}]
    });
    expect(actor.items[0]).toMatchObject({
      name: "Stealth",
      system: {rank: "trained", acquisition: {grantedByUuid: "Item.stealth"}}
    });
  });

  it("is idempotent and never overwrites an initialized Character", async () => {
    const actor = new TestCharacter();
    const service = new CharacterInitializationService();
    await service.setup(actor, twoSkills);
    const snapshot = structuredClone({system: actor.system, itemNames: actor.items.map((item) => item.name)});
    await expect(service.setup(actor, twoSkills)).rejects.toMatchObject({code: "already-initialized"});
    expect({system: actor.system, itemNames: actor.items.map((item) => item.name)}).toEqual(snapshot);
  });

  it("keeps coreInitialized after close/reopen and a serialized reload", async () => {
    const actor = new TestCharacter();
    await new CharacterInitializationService(undefined, () => 5678).setup(actor, twoSkills);

    const reopenedCreation = actor.system.creation;
    const reloadedSystem = structuredClone(actor.system);

    expect(reopenedCreation).toEqual({coreInitialized: true, mode: "completed", initializedAt: 5678});
    expect(reloadedSystem.creation).toEqual({coreInitialized: true, mode: "completed", initializedAt: 5678});
  });

  it("rolls back created Skills if final Actor update fails", async () => {
    const actor = new TestCharacter();
    actor.failUpdate = true;
    await expect(new CharacterInitializationService().setup(actor, twoSkills)).rejects.toThrow();
    expect(actor.items).toEqual([]);
  });

  it.each(["skipped", "manual"] as const)("supports GM %s initialization without resetting data", async (mode) => {
    const actor = new TestCharacter();
    await new CharacterInitializationService(undefined, () => 99).markInitialized(actor, mode);
    expect(actor.system).toMatchObject({
      marker: "preserve",
      creation: {coreInitialized: true, mode, initializedAt: 99}
    });
    expect(actor.items).toEqual([]);
  });
});
