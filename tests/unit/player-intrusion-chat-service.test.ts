import {afterEach, describe, expect, it, vi} from "vitest";

import {PlayerIntrusionChatService} from "../../src/services/player-intrusion-chat-service";

describe("PlayerIntrusionChatService", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("publishes a Character-accent announcement and request audit flag", async () => {
    const create = vi.fn(async (data: Record<string, unknown>) => ({id: "message-1", ...data}));
    vi.stubGlobal("foundry", {
      applications: {handlebars: {renderTemplate: vi.fn(async (_path: string, data: unknown) => JSON.stringify(data))}}
    });
    vi.stubGlobal("ChatMessage", {create, getSpeaker: vi.fn(() => ({}))});
    const actor = {
      id: "actor-1",
      uuid: "Actor.actor-1",
      name: "Vince",
      img: "vince.webp",
      type: "character",
      system: {xp: 1, appearance: {color: "#00ffff"}},
      update: vi.fn()
    };
    await new PlayerIntrusionChatService().publish({
      requestId: "request-1",
      actorId: actor.id,
      actorUuid: actor.uuid,
      actorName: actor.name,
      xpSpent: 1
    }, actor as never);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      flags: {cypherv2: {playerIntrusion: expect.objectContaining({requestId: "request-1", xpSpent: 1})}}
    }));
    expect(create.mock.calls[0]![0].content).toContain("--cypherv2-chat-accent");
  });
});
