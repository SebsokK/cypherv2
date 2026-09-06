import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {describe, expect, it} from "vitest";

import {migrateCharacterSystemData} from "../../src/data/actors/character-migration";
import {
  resolveCharacterAppearance,
  resolveFoundryAssetUrl,
  safeCharacterAccent,
  safeCharacterTint
} from "../../src/themes/character-appearance";

const root = resolve(import.meta.dirname, "../..");
const template = readFileSync(resolve(root, "templates/actor/character-sheet.hbs"), "utf8");
const sheet = readFileSync(resolve(root, "src/applications/sheets/character-sheet.ts"), "utf8");
const styles = readFileSync(resolve(root, "styles/components/_character-header.scss"), "utf8");
const getRoute = (path: string): string => `/foundry/${path.replace(/^\/+/, "")}`;

function maximumChannel(color: string): number {
  return Math.max(
    Number.parseInt(color.slice(1, 3), 16),
    Number.parseInt(color.slice(3, 5), 16),
    Number.parseInt(color.slice(5, 7), 16)
  );
}

describe("Character Header appearance", () => {
  it("defaults legacy Characters to Theme presentation without injecting partial updates", () => {
    expect(migrateCharacterSystemData({}).appearance).toEqual({
      backgroundMode: "theme",
      customImage: "",
      color: ""
    });
    expect(migrateCharacterSystemData({xp: 4}, {partial: true})).toEqual({xp: 4});
  });

  it("normalizes and preserves independent custom appearance values", () => {
    expect(migrateCharacterSystemData({appearance: {
      backgroundMode: "custom",
      customImage: "worlds/example/header.webp",
      color: "#FF00AA"
    }}).appearance).toEqual({
      backgroundMode: "custom",
      customImage: "worlds/example/header.webp",
      color: "#ff00aa"
    });
    expect(migrateCharacterSystemData({appearance: {color: "#00FFFF"}}, {partial: true}))
      .toEqual({appearance: {color: "#00ffff"}});
  });

  it("resolves Theme, portrait, and custom backgrounds without duplicating color logic", () => {
    const theme = resolveCharacterAppearance({backgroundMode: "theme", customImage: "", color: ""}, "portrait.webp", getRoute);
    const portrait = resolveCharacterAppearance({backgroundMode: "portrait", customImage: "", color: "#ff00aa"}, "portrait.webp", getRoute);
    const custom = resolveCharacterAppearance({backgroundMode: "custom", customImage: "custom.webp", color: "#00ffff"}, "portrait.webp", getRoute);

    expect(theme).toMatchObject({hasBackgroundImage: false, hasCharacterColor: false, isTheme: true});
    expect(portrait).toMatchObject({backgroundImage: "/foundry/portrait.webp", hasBackgroundImage: true, isPortrait: true});
    expect(custom).toMatchObject({backgroundImage: "/foundry/custom.webp", hasBackgroundImage: true, isCustom: true});
    expect(custom.style).toContain("--cypherv2-character-background-image");
  });

  it("resolves a Custom Image containing spaces from the Foundry Data route", () => {
    const storedPath = "SokK Custom Content/East Texas University/GameHeader.jpg";
    const appearance = resolveCharacterAppearance(
      {backgroundMode: "custom", customImage: storedPath, color: ""},
      "portrait.webp",
      getRoute
    );

    expect(appearance.customImage).toBe(storedPath);
    expect(appearance.backgroundImage).toBe(`/foundry/${storedPath}`);
    expect(appearance.style).toContain(`url("/foundry/${storedPath}")`);
    expect(appearance.style).not.toContain("systems/cypherv2/dist/");
  });

  it("resolves Character Portrait from Actor.img without double-encoding it", () => {
    const portraitPath = "SokK Custom Content/leon_s._kennedy.Avatar%20One.webp";
    const appearance = resolveCharacterAppearance(
      {backgroundMode: "portrait", customImage: "", color: ""},
      portraitPath,
      getRoute
    );

    expect(appearance.backgroundImage).toBe(`/foundry/${portraitPath}`);
    expect(appearance.style).toContain(`url("/foundry/${portraitPath}")`);
    expect(appearance.style).not.toContain("%2520");
    expect(appearance.style).not.toContain("systems/cypherv2/dist/");
  });

  it("preserves already absolute asset URLs", () => {
    expect(resolveFoundryAssetUrl("https://cdn.example.test/header image.webp", getRoute))
      .toBe("https://cdn.example.test/header image.webp");
  });

  it.each(["#ffffff", "#ff00ff", "#00ffff", "#ffff00", "#000000"])(
    "derives a readable accent and restrained dark tint from %s",
    (color) => {
      const accent = safeCharacterAccent(color);
      const tint = safeCharacterTint(color);
      expect(accent).toMatch(/^#[\da-f]{6}$/);
      expect(tint).toMatch(/^#[\da-f]{6}$/);
      expect(maximumChannel(tint!)).toBeLessThanOrEqual(75);
    }
  );

  it("uses compact native form controls and a path-based Reset action", () => {
    expect(template).toContain('name="system.appearance.backgroundMode"');
    expect(template).toContain('<file-picker type="image" name="system.appearance.customImage"');
    expect(template).toContain('type="color" data-header-color');
    expect(template).not.toContain('type="color" name="system.appearance.color"');
    expect(template).toContain('data-action="resetHeaderAppearance"');
    expect(sheet).toContain('"system.appearance.backgroundMode": "theme"');
    expect(sheet).toContain('"system.appearance.customImage": ""');
    expect(sheet).toContain('"system.appearance.color": ""');
    expect(sheet).toContain('input[data-header-color]');
    expect(sheet).toContain('{"system.appearance.color": color.value}');
  });

  it("keeps image readability and identity accents scoped to the Character Header", () => {
    expect(styles).toContain("&.has-header-background");
    expect(styles).toContain("color-mix(in srgb, var(--cypherv2-character-tint) 94%, transparent)");
    expect(styles).toContain("background-size: cover");
    expect(styles).toContain("&.has-character-color");
    expect(styles).not.toMatch(/\.roll-card|cypherv2-chat-card/);
  });
});
