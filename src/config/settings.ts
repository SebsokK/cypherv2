import {SYSTEM_ID, SYSTEM_SCHEMA_VERSION} from "../constants/system";
import type {RollPolicyRequest} from "../rolls/roll-types";
import type {DifficultyVisibility} from "../services/roll-chat-service";
import type {ThemeRegistry} from "../themes/theme-registry";
import {
  HORROR_INTRUSION_RANGE_DEFAULT,
  HORROR_INTRUSION_RANGE_MAX,
  HORROR_INTRUSION_RANGE_MIN,
  isValidHorrorIntrusionRange,
  normalizeHorrorIntrusionRange
} from "../horror/horror-mode";

export const SETTING_KEYS = {
  difficultyVisibility: "difficultyVisibility",
  showGmRollAudit: "showGmRollAudit",
  defaultDifficultyCeiling: "defaultDifficultyCeiling",
  enabledRuleModules: "enabledRuleModules",
  interfaceHiddenDifficulty: "interfaceHiddenDifficulty",
  debugRules: "debugRules",
  worldSchemaVersion: "worldSchemaVersion",
  theme: "theme",
  horrorIntrusionRange: "horrorIntrusionRange",
  pendingIntrusionXP: "gmIntrusions"
} as const;

export function registerSettings(themes: ThemeRegistry): void {
  game.settings.register(SYSTEM_ID, SETTING_KEYS.difficultyVisibility, {
    name: "CYPHERV2.Settings.DifficultyVisibility.Name",
    hint: "CYPHERV2.Settings.DifficultyVisibility.Hint",
    scope: "world",
    // Legacy compatibility only. Roll cards now have fixed, unambiguous disclosure rules.
    config: false,
    type: String,
    choices: {
      full: "CYPHERV2.Settings.DifficultyVisibility.Full",
      resultOnly: "CYPHERV2.Settings.DifficultyVisibility.ResultOnly",
      rollOnly: "CYPHERV2.Settings.DifficultyVisibility.RollOnly"
    },
    default: "full"
  });

  game.settings.register(SYSTEM_ID, SETTING_KEYS.showGmRollAudit, {
    name: "CYPHERV2.Settings.ShowGmRollAudit.Name",
    hint: "CYPHERV2.Settings.ShowGmRollAudit.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register(SYSTEM_ID, SETTING_KEYS.defaultDifficultyCeiling, {
    name: "CYPHERV2.Settings.DifficultyCeiling.Name",
    hint: "CYPHERV2.Settings.DifficultyCeiling.Hint",
    scope: "world",
    config: true,
    type: Number,
    default: 10,
    range: {min: 0, max: 15, step: 1}
  });

  game.settings.register(SYSTEM_ID, SETTING_KEYS.interfaceHiddenDifficulty, {
    name: "CYPHERV2.Settings.HiddenDifficulty.Name",
    hint: "CYPHERV2.Settings.HiddenDifficulty.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(SYSTEM_ID, SETTING_KEYS.enabledRuleModules, {
    scope: "world",
    config: false,
    type: Array,
    default: []
  });

  game.settings.register(SYSTEM_ID, SETTING_KEYS.debugRules, {
    name: "CYPHERV2.Settings.DebugRules.Name",
    hint: "CYPHERV2.Settings.DebugRules.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register(SYSTEM_ID, SETTING_KEYS.worldSchemaVersion, {
    scope: "world",
    config: false,
    type: Number,
    default: SYSTEM_SCHEMA_VERSION
  });

  game.settings.register(SYSTEM_ID, SETTING_KEYS.theme, {
    name: "CYPHERV2.Settings.Theme.Name",
    hint: "CYPHERV2.Settings.Theme.Hint",
    scope: "world",
    config: true,
    type: String,
    choices: themes.choices(),
    default: "core",
    onChange: (themeId: string) => themes.apply(themeId)
  });

  game.settings.register(SYSTEM_ID, SETTING_KEYS.horrorIntrusionRange, {
    name: "CYPHERV2.Horror.SettingName",
    hint: "CYPHERV2.Horror.SettingHint",
    scope: "world",
    config: false,
    type: Number,
    default: HORROR_INTRUSION_RANGE_DEFAULT,
    range: {
      min: HORROR_INTRUSION_RANGE_MIN,
      max: HORROR_INTRUSION_RANGE_MAX,
      step: 1
    },
    onChange: (range: number) => Hooks.callAll(
      "cypherv2HorrorIntrusionRangeChanged",
      normalizeHorrorIntrusionRange(range)
    )
  });

  // Reuse the former setting key so the first GM startup can discard legacy history.
  // Only minimal unresolved second-XP obligations are stored here now.
  game.settings.register(SYSTEM_ID, SETTING_KEYS.pendingIntrusionXP, {
    scope: "world",
    config: false,
    type: Array,
    default: [],
    onChange: (records: unknown) => Hooks.callAll("cypherv2IntrusionPendingChanged", records)
  });
}

export function currentRollPolicyRequest(): RollPolicyRequest {
  const enabled = currentEnabledRuleModuleIds();
  return {
    base: {
      difficultyCeiling: Number(
        game.settings.get(SYSTEM_ID, SETTING_KEYS.defaultDifficultyCeiling)
      ),
      assetLimit: 0
    },
    enabledRuleModuleIds: enabled
  };
}

export function currentEnabledRuleModuleIds(): string[] {
  const enabled = game.settings.get(SYSTEM_ID, SETTING_KEYS.enabledRuleModules);
  return Array.isArray(enabled)
    ? enabled.filter((id): id is string => typeof id === "string")
    : [];
}

export function currentDifficultyVisibility(): DifficultyVisibility {
  const value = game.settings.get(SYSTEM_ID, SETTING_KEYS.difficultyVisibility);
  return value === "resultOnly" || value === "rollOnly" ? value : "full";
}

export function hiddenDifficultyEnabled(): boolean {
  return game.settings.get(SYSTEM_ID, SETTING_KEYS.interfaceHiddenDifficulty) === true;
}

export function showGmRollAuditEnabled(): boolean {
  return game.settings.get(SYSTEM_ID, SETTING_KEYS.showGmRollAudit) === true;
}

export function currentHorrorIntrusionRange(): number {
  if (typeof game === "undefined") return HORROR_INTRUSION_RANGE_DEFAULT;
  return normalizeHorrorIntrusionRange(
    game.settings.get(SYSTEM_ID, SETTING_KEYS.horrorIntrusionRange)
  );
}

export async function setHorrorIntrusionRange(range: number): Promise<number> {
  if (!game.user.isGM) throw new Error(game.i18n.localize("CYPHERV2.Horror.Errors.GMOnly"));
  if (!isValidHorrorIntrusionRange(range)) {
    throw new Error(game.i18n.localize("CYPHERV2.Horror.Errors.InvalidRange"));
  }
  await game.settings.set(SYSTEM_ID, SETTING_KEYS.horrorIntrusionRange, range);
  return range;
}
