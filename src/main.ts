import "../styles/index.scss";

import {createCypherV2Api} from "./api/cypherv2-api";
import {registerDataModels} from "./config/data-models";
import {registerDocumentClasses} from "./config/documents";
import {registerSettings} from "./config/settings";
import {registerSheets} from "./config/sheets";
import {SYSTEM_ID} from "./constants/system";
import {registerCoreRuleModule} from "./rules/core-rule-module";
import {RuleRegistry} from "./rules/rule-registry";
import {createCoreServices} from "./services";
import {CORE_THEME} from "./themes/core-theme";
import {ThemeRegistry} from "./themes/theme-registry";
import {SETTING_KEYS} from "./config/settings";
import {registerGMIntrusionSceneControl} from "./intrusions/gm-intrusion-scene-control";
import {initializeGMIntrusionController} from "./intrusions/gm-intrusion-controller";
import {initializeCombatChatController} from "./combat/combat-chat-controller";
import {initializeNpcDeadStatusSynchronization} from "./services/combat-status-service";
import {initializeItemChatController} from "./items/item-chat-controller";
import {migrateLegacyTypeGenres} from "./genre/genre-migration";
import {initializeChatCardEntrance} from "./chat/chat-card-entrance";
import {initializePlayerIntrusionController} from "./intrusions/player-intrusion-controller";
import {initializeCombatTrackerDoneReset, registerCombatTracker} from "./applications/combat-tracker";
import {registerCombatTurnMarker, registerGamePause} from "./applications/game-pause";
import {initializeBlankCanvasBackground} from "./canvas/blank-canvas-background";

Hooks.once("init", async () => {
  console.info(`${SYSTEM_ID} | Initializing`);

  const rules = new RuleRegistry();
  registerCoreRuleModule(rules);
  const themes = new ThemeRegistry();
  themes.register(CORE_THEME);

  game.cypherv2 = createCypherV2Api(rules, createCoreServices(rules), themes);

  registerDocumentClasses();
  registerDataModels();
  registerSheets();
  registerCombatTracker();
  registerGamePause();
  registerCombatTurnMarker();
  registerGMIntrusionSceneControl();

  Hooks.callAll("cypherv2.registerRules", rules);
  Hooks.callAll("cypherv2.registerThemes", themes);
  registerSettings(themes);
  await foundry.applications.handlebars.loadTemplates([
    "systems/cypherv2/templates/focus/focus-tree.hbs"
  ]);
});

Hooks.once("ready", async () => {
  initializeBlankCanvasBackground();
  const selectedTheme = String(game.settings.get(SYSTEM_ID, SETTING_KEYS.theme));
  game.cypherv2.themes.apply(game.cypherv2.themes.has(selectedTheme) ? selectedTheme : "core");
  initializeGMIntrusionController(
    game.cypherv2.services.intrusions,
    game.cypherv2.services.intrusionChat
  );
  initializePlayerIntrusionController(
    game.cypherv2.services.playerIntrusions,
    game.cypherv2.services.playerIntrusionChat
  );
  initializeCombatChatController();
  initializeItemChatController();
  initializeChatCardEntrance();
  initializeNpcDeadStatusSynchronization(game.cypherv2.services.combatStatuses);
  initializeCombatTrackerDoneReset();
  await migrateLegacyTypeGenres();
  console.info(`${SYSTEM_ID} | Ready`);
});
