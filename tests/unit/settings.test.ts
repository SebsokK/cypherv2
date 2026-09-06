import {afterEach, describe, expect, it, vi} from "vitest";

import {
  currentHorrorIntrusionRange,
  registerSettings,
  SETTING_KEYS,
  setHorrorIntrusionRange,
  showGmRollAuditEnabled
} from "../../src/config/settings";
import {ThemeRegistry} from "../../src/themes/theme-registry";

describe("world settings", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("registers the optional GM roll audit disabled by default", () => {
    const register = vi.fn();
    vi.stubGlobal("game", {settings: {register}});
    registerSettings(new ThemeRegistry());

    expect(register).toHaveBeenCalledWith("cypherv2", SETTING_KEYS.showGmRollAudit, expect.objectContaining({
      scope: "world",
      config: true,
      type: Boolean,
      default: false
    }));
  });

  it("enables GM roll audits only for an explicit true setting", () => {
    const get = vi.fn(() => true);
    vi.stubGlobal("game", {settings: {get}});

    expect(showGmRollAuditEnabled()).toBe(true);
    expect(get).toHaveBeenCalledWith("cypherv2", SETTING_KEYS.showGmRollAudit);
  });

  it("registers one hidden World Horror range from 1 through 20 with default 1", () => {
    const register = vi.fn();
    vi.stubGlobal("game", {settings: {register}});
    registerSettings(new ThemeRegistry());

    expect(register).toHaveBeenCalledWith("cypherv2", SETTING_KEYS.horrorIntrusionRange, expect.objectContaining({
      scope: "world",
      config: false,
      type: Number,
      default: 1,
      range: {min: 1, max: 20, step: 1}
    }));
  });

  it("persists the canonical Horror range for a GM and reads it back", async () => {
    let stored = 1;
    const set = vi.fn(async (_scope: string, _key: string, value: number) => {
      stored = value;
    });
    vi.stubGlobal("game", {
      user: {isGM: true},
      i18n: {localize: (key: string) => key},
      settings: {get: () => stored, set}
    });

    await expect(setHorrorIntrusionRange(4)).resolves.toBe(4);
    expect(currentHorrorIntrusionRange()).toBe(4);
    expect(set).toHaveBeenCalledWith("cypherv2", SETTING_KEYS.horrorIntrusionRange, 4);
  });

  it("rejects a player mutation before the World setting is written", async () => {
    const set = vi.fn();
    vi.stubGlobal("game", {
      user: {isGM: false},
      i18n: {localize: (key: string) => key},
      settings: {get: () => 1, set}
    });

    await expect(setHorrorIntrusionRange(4)).rejects.toThrow("CYPHERV2.Horror.Errors.GMOnly");
    expect(set).not.toHaveBeenCalled();
  });
});
