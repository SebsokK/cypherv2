import {SYSTEM_UI_ASSETS} from "../config/system-assets";

const BaseGamePause = CONFIG.ui.pause;

/** Keep Foundry's native pause lifecycle while supplying Cypher-branded presentation data. */
export class CypherV2GamePause extends BaseGamePause {
  static override DEFAULT_OPTIONS = {
    classes: ["cypherv2-game-pause"]
  };

  override async _prepareContext(options: Record<string, unknown>): Promise<Record<string, unknown>> {
    const context = await super._prepareContext(options);
    return {
      ...context,
      icon: SYSTEM_UI_ASSETS.gamePaused,
      spin: false
    };
  }
}

export function registerGamePause(): void {
  CONFIG.ui.pause = CypherV2GamePause;
}

/** Configure only Foundry's fallback; a world or Token-specific custom marker remains authoritative. */
export function registerCombatTurnMarker(): void {
  CONFIG.Combat.fallbackTurnMarker = SYSTEM_UI_ASSETS.turnMarker;
}
