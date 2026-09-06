import {existsSync, readFileSync} from "node:fs";
import {resolve} from "node:path";

import {describe, expect, it, vi} from "vitest";

import {
  BLANK_CANVAS_BACKGROUND_PROPERTY,
  initializeBlankCanvasBackground
} from "../../src/canvas/blank-canvas-background";
import {SYSTEM_UI_ASSETS} from "../../src/config/system-assets";

const root = resolve(import.meta.dirname, "../..");
const source = readFileSync(resolve(root, "src/canvas/blank-canvas-background.ts"), "utf8");
const styles = readFileSync(resolve(root, "styles/components/_blank-canvas.scss"), "utf8");
const mainSource = readFileSync(resolve(root, "src/main.ts"), "utf8");

describe("blank canvas lobby background", () => {
  it("uses the packaged lobby image without a dist-relative path", () => {
    expect(SYSTEM_UI_ASSETS.lobby).toBe("systems/cypherv2/assets/cypherlobby.png");
    expect(SYSTEM_UI_ASSETS.lobby).not.toContain("/dist/");
    expect(existsSync(resolve(root, SYSTEM_UI_ASSETS.lobby.replace("systems/cypherv2/", ""))))
      .toBe(true);
  });

  it("resolves the image through Foundry's route helper before assigning the CSS URL", () => {
    const setProperty = vi.fn();
    const getRoute = vi.fn((path: string) => `/foundry/${path}`);

    initializeBlankCanvasBackground({style: {setProperty}}, getRoute);

    expect(getRoute).toHaveBeenCalledExactlyOnceWith(SYSTEM_UI_ASSETS.lobby);
    expect(setProperty).toHaveBeenCalledExactlyOnceWith(
      BLANK_CANVAS_BACKGROUND_PROPERTY,
      `url("/foundry/${SYSTEM_UI_ASSETS.lobby}")`
    );
  });

  it("anchors a cover-style non-tiling background to the full viewport", () => {
    expect(styles).toContain('body.game:has(canvas#board[style*="display: none"])');
    expect(styles).toContain("inset: 0");
    expect(styles).toContain("width: 100vw");
    expect(styles).toContain("height: 100vh");
    expect(styles).toContain("min-height: 100vh");
    expect(styles).toContain("background-color: #000");
    expect(styles).toContain("background-attachment: fixed");
    expect(styles).toContain("background-origin: border-box");
    expect(styles).toContain("background-size: cover");
    expect(styles).toContain("background-position: center center");
    expect(styles).toContain("background-repeat: no-repeat");
    expect(styles).not.toContain("!important");
  });

  it("leaves canvas rendering untouched", () => {
    expect(styles).not.toMatch(/(?:canvas#board\s*\{|canvas\.app|\.canvas-app)/);
    expect(source).not.toMatch(/(?:Scene\.create|game\.scenes|canvas\.(?:draw|ready)|MutationObserver)/);
  });

  it("initializes once for every client without role or connection filtering", () => {
    expect(mainSource).toContain('Hooks.once("ready"');
    expect(mainSource).toContain("initializeBlankCanvasBackground();");
    expect(source).not.toMatch(/game\.user|\.isGM|\.active\b/);
  });
});
