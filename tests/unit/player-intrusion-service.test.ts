import {afterEach, describe, expect, it, vi} from "vitest";

import {PlayerIntrusionService} from "../../src/services/player-intrusion-service";
import {character} from "../helpers/core-fixtures";

describe("PlayerIntrusionService", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("spends exactly one XP and returns the audit record", async () => {
    const actor = Object.assign(character({xp: 2}), {uuid: "Actor.character-1", img: "hero.webp"});
    const service = new PlayerIntrusionService();
    expect(service.canUse(actor)).toBe(true);
    await expect(service.spend(actor, "request-1")).resolves.toEqual({
      requestId: "request-1",
      actorId: "character-1",
      actorUuid: "Actor.character-1",
      actorName: "Test Character",
      xpSpent: 1
    });
    expect(actor.system.xp).toBe(1);
    expect(actor.updates).toContainEqual({"system.xp": 1});
  });

  it("blocks zero XP and never permits a negative balance", async () => {
    const actor = Object.assign(character({xp: 0}), {uuid: "Actor.character-1"});
    const service = new PlayerIntrusionService();
    expect(service.canUse(actor)).toBe(false);
    await expect(service.spend(actor, "request-1")).rejects.toThrow("requires 1 XP");
    expect(actor.system.xp).toBe(0);
    expect(actor.updates).toHaveLength(0);
  });
});
