import {afterEach, describe, expect, it, vi} from "vitest";

import {resolveTargetActor} from "../../src/combat/combat-targets";

describe("combat target identity", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("resolves a Token UUID to its synthetic Actor before the source Actor", async () => {
    class MockActor {
      constructor(readonly id: string) {}
    }
    const source = new MockActor("source");
    const synthetic = new MockActor("source");
    const fromUuid = vi.fn(async () => ({actor: synthetic}));
    vi.stubGlobal("Actor", MockActor);
    vi.stubGlobal("fromUuid", fromUuid);
    vi.stubGlobal("canvas", {tokens: {get: vi.fn(), placeables: []}});
    vi.stubGlobal("game", {actors: {get: () => source}});

    const resolved = await resolveTargetActor({
      actorId: "source",
      tokenId: "token-a",
      tokenUuid: "Scene.scene.Token.token-a"
    });

    expect(resolved).toBe(synthetic);
    expect(resolved).not.toBe(source);
    expect(fromUuid).toHaveBeenCalledWith("Scene.scene.Token.token-a");
  });

  it("never falls back to the world Actor when an authoritative Token is gone", async () => {
    class MockActor {
      constructor(readonly id: string) {}
    }
    const source = new MockActor("source");
    vi.stubGlobal("Actor", MockActor);
    vi.stubGlobal("fromUuid", vi.fn(async () => null));
    vi.stubGlobal("canvas", {tokens: {get: vi.fn(), placeables: []}});
    vi.stubGlobal("game", {actors: {get: vi.fn(() => source)}});

    await expect(resolveTargetActor({
      actorId: "source", tokenId: "deleted", tokenUuid: "Scene.scene.Token.deleted"
    })).resolves.toBeNull();
    expect(game.actors.get).not.toHaveBeenCalled();
  });

  it("still resolves a genuine world Actor payload without Token identity", async () => {
    class MockActor {
      constructor(readonly id: string) {}
    }
    const source = new MockActor("source");
    vi.stubGlobal("Actor", MockActor);
    vi.stubGlobal("fromUuid", vi.fn(async () => null));
    vi.stubGlobal("canvas", {tokens: {get: vi.fn(), placeables: []}});
    vi.stubGlobal("game", {actors: {get: vi.fn(() => source)}});

    await expect(resolveTargetActor({actorId: "source"})).resolves.toBe(source);
  });

  it("keeps two synthetic Tokens from the same source Actor independently targeted", async () => {
    class MockActor {
      constructor(readonly id: string, readonly token: string) {}
    }
    const first = new MockActor("source", "a");
    const second = new MockActor("source", "b");
    vi.stubGlobal("Actor", MockActor);
    vi.stubGlobal("fromUuid", vi.fn(async (uuid: string) => ({actor: uuid.endsWith("token-a") ? first : second})));
    vi.stubGlobal("canvas", {tokens: {get: vi.fn(), placeables: []}});
    vi.stubGlobal("game", {actors: {get: vi.fn()}});

    await expect(resolveTargetActor({
      actorId: "source", tokenId: "token-a", tokenUuid: "Scene.scene.Token.token-a"
    })).resolves.toBe(first);
    await expect(resolveTargetActor({
      actorId: "source", tokenId: "token-b", tokenUuid: "Scene.scene.Token.token-b"
    })).resolves.toBe(second);
  });
});
