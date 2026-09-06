import {afterEach, describe, expect, it, vi} from "vitest";

import {TokenCombatFeedbackService} from "../../src/services/combat-feedback-service";

describe("Token combat feedback", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows applied damage rather than raw damage and DEAD on the exact Token", async () => {
    const createScrollingText = vi.fn(async () => undefined);
    vi.stubGlobal("canvas", {
      tokens: {
        get: (id: string) => id === "token-a"
          ? {actor: null, center: {x: 100, y: 200}}
          : undefined,
        placeables: []
      },
      interface: {createScrollingText}
    });
    vi.stubGlobal("CONST", {TEXT_ANCHOR_POINTS: {CENTER: 0, TOP: 1}});
    vi.stubGlobal("game", {
      i18n: {
        localize: (key: string) => key === "CYPHERV2.Combat.Feedback.Dead" ? "DEAD" : key,
        format: (key: string) => key
      }
    });

    await new TokenCombatFeedbackService().npcDamage(
      {id: "npc-source", tokenId: "token-a", tokenUuid: "Scene.scene.Token.token-a"},
      {
        requestedDamage: 6,
        armor: 2,
        appliedDamage: 4,
        previousHealth: 4,
        health: 0,
        dead: true
      }
    );

    expect(createScrollingText).toHaveBeenNthCalledWith(
      1,
      {x: 100, y: 200},
      "-4",
      expect.anything()
    );
    expect(createScrollingText).toHaveBeenNthCalledWith(
      2,
      {x: 100, y: 200},
      "DEAD",
      expect.anything()
    );
  });

  it("shows Shield Wound and Broken feedback on the Character Token", async () => {
    const createScrollingText = vi.fn(async () => undefined);
    vi.stubGlobal("canvas", {
      tokens: {
        get: (id: string) => id === "character-token"
          ? {actor: null, center: {x: 25, y: 50}}
          : undefined,
        placeables: []
      },
      interface: {createScrollingText}
    });
    vi.stubGlobal("CONST", {TEXT_ANCHOR_POINTS: {CENTER: 0, TOP: 1}});
    vi.stubGlobal("game", {
      i18n: {
        localize: (key: string) => key.endsWith("moderate") ? "Moderate" : key,
        format: (key: string, data: Record<string, unknown>) => key.endsWith("Broken")
          ? `${data.shield} Broken`
          : `${data.shield}: ${data.severity} Wound`
      }
    });
    const service = new TokenCombatFeedbackService();
    const target = {id: "character-1", tokenId: "character-token"};

    await service.shieldWound(target, "Round Shield", "moderate", false);
    await service.shieldWound(target, "Round Shield", "major", true);

    expect(createScrollingText).toHaveBeenNthCalledWith(
      1,
      {x: 25, y: 50},
      "Round Shield: Moderate Wound",
      expect.anything()
    );
    expect(createScrollingText).toHaveBeenNthCalledWith(
      2,
      {x: 25, y: 50},
      "Round Shield Broken",
      expect.anything()
    );
  });

  it("does not redirect feedback to another Token when the authoritative Token is gone", async () => {
    const createScrollingText = vi.fn(async () => undefined);
    vi.stubGlobal("canvas", {
      tokens: {
        get: vi.fn(() => undefined),
        placeables: [{actor: {id: "npc-source"}, center: {x: 999, y: 999}}]
      },
      interface: {createScrollingText}
    });
    vi.stubGlobal("fromUuid", vi.fn(async () => null));
    vi.stubGlobal("CONST", {TEXT_ANCHOR_POINTS: {CENTER: 0, TOP: 1}});
    vi.stubGlobal("game", {i18n: {localize: (key: string) => key, format: (key: string) => key}});

    await new TokenCombatFeedbackService().characterWound({
      id: "npc-source", tokenId: "deleted", tokenUuid: "Scene.scene.Token.deleted"
    }, "major");

    expect(createScrollingText).not.toHaveBeenCalled();
  });
});
