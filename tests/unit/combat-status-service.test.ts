import {afterEach, describe, expect, it, vi} from "vitest";

import {
  FoundryCombatStatusService,
  initializeNpcDeadStatusSynchronization
} from "../../src/services/combat-status-service";

describe("native NPC Dead status synchronization", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("toggles Foundry dead independently on two synthetic Token Actors", async () => {
    class MockActor {
      readonly toggleStatusEffect = vi.fn(async () => undefined);
      constructor(readonly id: string) {}
    }
    const source = new MockActor("npc-source");
    const firstSynthetic = new MockActor("npc-source");
    const secondSynthetic = new MockActor("npc-source");
    vi.stubGlobal("Actor", MockActor);
    vi.stubGlobal("CONFIG", {specialStatusEffects: {DEFEATED: "dead"}});
    vi.stubGlobal("canvas", {tokens: {get: vi.fn(), placeables: []}});
    vi.stubGlobal("fromUuid", vi.fn(async (uuid: string) => ({
      actor: uuid.endsWith("token-a") ? firstSynthetic : secondSynthetic
    })));

    const service = new FoundryCombatStatusService();
    await service.syncNpcDead({
      id: "npc-source",
      tokenId: "token-a",
      tokenUuid: "Scene.scene.Token.token-a",
      toggleStatusEffect: source.toggleStatusEffect
    }, true);
    await service.syncNpcDead({
      id: "npc-source",
      tokenId: "token-b",
      tokenUuid: "Scene.scene.Token.token-b",
      toggleStatusEffect: source.toggleStatusEffect
    }, false);

    expect(firstSynthetic.toggleStatusEffect).toHaveBeenCalledWith("dead", {active: true});
    expect(secondSynthetic.toggleStatusEffect).toHaveBeenCalledWith("dead", {active: false});
    expect(source.toggleStatusEffect).not.toHaveBeenCalled();

    await service.syncNpcDead({
      id: "npc-source",
      tokenId: "token-a",
      tokenUuid: "Scene.scene.Token.token-a",
      toggleStatusEffect: source.toggleStatusEffect
    }, false);
    expect(firstSynthetic.toggleStatusEffect).toHaveBeenLastCalledWith("dead", {active: false});
  });

  it("removes dead when a synthetic NPC Health update rises above zero", async () => {
    let updateActor: ((actor: unknown, changes: Record<string, unknown>) => void) | undefined;
    const toggleStatusEffect = vi.fn(async () => undefined);
    class MockActor {
      readonly id = "npc-source";
      readonly uuid = "Scene.scene.Token.token-a.Actor.npc-source";
      readonly type = "npc";
      readonly token = {id: "token-a", uuid: "Scene.scene.Token.token-a"};
      readonly system = {health: {value: 5}};
      readonly toggleStatusEffect = toggleStatusEffect;
    }
    const actor = new MockActor();
    vi.stubGlobal("Actor", MockActor);
    vi.stubGlobal("CONFIG", {specialStatusEffects: {DEFEATED: "dead"}});
    vi.stubGlobal("canvas", {tokens: {get: vi.fn(), placeables: []}});
    vi.stubGlobal("fromUuid", vi.fn(async () => ({actor})));
    vi.stubGlobal("Hooks", {
      on: vi.fn((hook: string, callback: typeof updateActor) => {
        if (hook === "updateActor") updateActor = callback;
      })
    });

    initializeNpcDeadStatusSynchronization(new FoundryCombatStatusService());
    updateActor?.(actor, {system: {health: {value: 5}}});
    await vi.waitFor(() => {
      expect(toggleStatusEffect).toHaveBeenCalledWith("dead", {active: false});
    });
  });

  it("does not apply Dead to the source Actor after the authoritative Token was deleted", async () => {
    const sourceToggle = vi.fn(async () => undefined);
    vi.stubGlobal("CONFIG", {specialStatusEffects: {DEFEATED: "dead"}});
    vi.stubGlobal("canvas", {tokens: {get: vi.fn(), placeables: []}});
    vi.stubGlobal("fromUuid", vi.fn(async () => null));

    await new FoundryCombatStatusService().syncNpcDead({
      id: "npc-source",
      tokenId: "deleted",
      tokenUuid: "Scene.scene.Token.deleted",
      toggleStatusEffect: sourceToggle
    }, true);

    expect(sourceToggle).not.toHaveBeenCalled();
  });
});
