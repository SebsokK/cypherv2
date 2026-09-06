import {afterEach, describe, expect, it, vi} from "vitest";

describe("deferred Combat Chat outcomes", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("applies a Shield Wound only from the Chat action to the exact embedded Shield", async () => {
    class FakeActor {
      readonly id = "character-source";
      readonly items = new Map([["shield-exact", {id: "shield-exact", type: "shield"}]]);
      update = vi.fn(async () => this);
      testUserPermission = vi.fn(() => true);
    }
    const actor = new FakeActor();
    const applyShieldWound = vi.fn(async () => undefined);
    const setFlag = vi.fn(async () => undefined);
    vi.stubGlobal("Actor", FakeActor);
    vi.stubGlobal("CONST", {DOCUMENT_OWNERSHIP_LEVELS: {OWNER: 3}});
    vi.stubGlobal("canvas", {tokens: {get: () => undefined}});
    vi.stubGlobal("fromUuid", vi.fn(async () => null));
    vi.stubGlobal("game", {
      user: {isGM: true},
      actors: new Map([[actor.id, actor]]),
      i18n: {localize: (key: string) => key},
      cypherv2: {services: {combat: {applyShieldWound}}}
    });
    vi.stubGlobal("ui", {notifications: {info: vi.fn(), error: vi.fn()}});
    const action = {
      kind: "shieldWound",
      targetActorId: actor.id,
      shieldId: "shield-exact",
      shieldName: "Round Shield",
      severity: "major",
      sourceActorId: "npc-source",
      sourceName: "Sentinel",
      applied: false
    };
    const message = {getFlag: () => action, setFlag} as unknown as ChatMessage;
    const button = {disabled: false, textContent: "Apply"} as HTMLButtonElement;
    const {applyCombatOutcome} = await import("../../src/combat/combat-chat-controller");

    expect(applyShieldWound).not.toHaveBeenCalled();
    await applyCombatOutcome(message, button);

    expect(applyShieldWound).toHaveBeenCalledWith(
      expect.objectContaining({id: actor.id}),
      actor.items.get("shield-exact"),
      "major",
      {id: "npc-source", name: "Sentinel"}
    );
    expect(setFlag).toHaveBeenCalledWith("cypherv2", "combatAction", {...action, applied: true});
    expect(button.disabled).toBe(true);
  });

  it("refuses a delayed action whose authoritative Token no longer exists", async () => {
    class FakeActor {
      readonly id = "character-source";
      readonly items = new Map();
      update = vi.fn(async () => this);
      testUserPermission = vi.fn(() => true);
    }
    const source = new FakeActor();
    const applyCharacterWound = vi.fn(async () => undefined);
    const error = vi.fn();
    vi.stubGlobal("Actor", FakeActor);
    vi.stubGlobal("CONST", {DOCUMENT_OWNERSHIP_LEVELS: {OWNER: 3}});
    vi.stubGlobal("canvas", {tokens: {get: vi.fn(() => undefined)}});
    vi.stubGlobal("fromUuid", vi.fn(async () => null));
    vi.stubGlobal("game", {
      user: {isGM: true}, actors: new Map([[source.id, source]]),
      i18n: {localize: () => "The original token no longer exists."},
      cypherv2: {services: {combat: {applyCharacterWound}}}
    });
    vi.stubGlobal("ui", {notifications: {info: vi.fn(), error}});
    const action = {
      kind: "characterWound", targetActorId: source.id,
      targetTokenId: "deleted", targetTokenUuid: "Scene.scene.Token.deleted",
      severity: "major", applied: false
    };
    const setFlag = vi.fn(async () => undefined);
    const message = {getFlag: () => action, setFlag} as unknown as ChatMessage;
    const button = {disabled: false, textContent: "Apply"} as HTMLButtonElement;
    const {applyCombatOutcome} = await import("../../src/combat/combat-chat-controller");

    await applyCombatOutcome(message, button);

    expect(error).toHaveBeenCalledWith("The original token no longer exists.");
    expect(applyCharacterWound).not.toHaveBeenCalled();
    expect(source.update).not.toHaveBeenCalled();
    expect(setFlag).not.toHaveBeenCalled();
    expect(button.disabled).toBe(false);
  });
});
