import {existsSync, readFileSync} from "node:fs";

import {describe, expect, it} from "vitest";

import {SYSTEM_UI_ASSETS} from "../../src/config/system-assets";

const pauseSource = readFileSync("src/applications/game-pause.ts", "utf8");
const pauseStyles = readFileSync("styles/components/_game-pause.scss", "utf8");
const mainSource = readFileSync("src/main.ts", "utf8");
const trackerSource = readFileSync("src/applications/combat-tracker.ts", "utf8");

describe("system UI assets", () => {
  it("uses packaged root-relative system paths for pause and turn marker artwork", () => {
    expect(SYSTEM_UI_ASSETS).toEqual({
      gamePaused: "systems/cypherv2/assets/ui/cyphergamepaused.png",
      lobby: "systems/cypherv2/assets/cypherlobby.png",
      turnMarker: "systems/cypherv2/assets/ui/cypherturnmarker.png"
    });
    for (const path of Object.values(SYSTEM_UI_ASSETS)) {
      expect(path).not.toContain("/dist/");
      expect(existsSync(path.replace("systems/cypherv2/", ""))).toBe(true);
    }
  });

  it("replaces pause presentation through the configured native Application V2 class", () => {
    expect(pauseSource).toContain("extends BaseGamePause");
    expect(pauseSource).toContain("CONFIG.ui.pause = CypherV2GamePause");
    expect(pauseSource).toContain("icon: SYSTEM_UI_ASSETS.gamePaused");
    expect(pauseSource).toContain("spin: false");
    expect(pauseSource).not.toContain('Hooks.on("renderPause"');
    expect(pauseStyles).toContain("#pause.cypherv2-game-pause");
    expect(pauseStyles).toContain("clip: rect(0, 0, 0, 0)");
    expect(mainSource).toContain("registerGamePause();");
  });

  it("uses Foundry's native fallback marker without overwriting world or Token settings", () => {
    expect(pauseSource).toContain("CONFIG.Combat.fallbackTurnMarker = SYSTEM_UI_ASSETS.turnMarker");
    expect(pauseSource).not.toContain("game.settings.set");
    expect(pauseSource).not.toContain("prototypeToken");
    expect(mainSource).toContain("registerCombatTurnMarker();");
  });

  it("leaves the custom Combat Tracker behavior intact", () => {
    expect(trackerSource).toContain("endCurrentCombatantTurn");
    expect(trackerSource).toContain("manualOrderInitiativeUpdates");
    expect(trackerSource).toContain("initializeCombatTrackerDoneReset");
  });
});
