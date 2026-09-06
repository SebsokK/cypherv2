import {readFileSync} from "node:fs";

import {afterEach, describe, expect, it, vi} from "vitest";

import {
  horrorRangeBand,
  horrorRangeFillPercentage,
  normalizeHorrorIntrusionRange
} from "../../src/horror/horror-mode";
import {registerGMIntrusionSceneControl} from "../../src/intrusions/gm-intrusion-scene-control";

const dialog = readFileSync("src/applications/dialogs/horror-mode-dialog.ts", "utf8");
const styles = readFileSync("styles/components/_horror-mode.scss", "utf8");
const localization = JSON.parse(readFileSync("lang/en.json", "utf8")) as Record<string, string>;
type TestSceneTool = {readonly order: number; readonly visible?: boolean; readonly icon?: string};

describe("Horror Mode World control", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("normalizes the range and assigns the non-linear danger bands", () => {
    expect(normalizeHorrorIntrusionRange(undefined)).toBe(1);
    expect(normalizeHorrorIntrusionRange(0)).toBe(1);
    expect(normalizeHorrorIntrusionRange(25)).toBe(20);
    expect(horrorRangeFillPercentage(1)).toBe(0);
    expect(horrorRangeFillPercentage(20)).toBe(100);
    expect([
      1, 2, 4, 6, 9, 13, 17
    ].map(horrorRangeBand)).toEqual([
      "neutral", "low", "elevated", "severe", "extreme", "catastrophic", "maximum"
    ]);
    expect(horrorRangeBand(10)).toBe("extreme");
  });

  it("places a GM-only Horror button immediately below GM Intrusion", () => {
    let callback: ((controls: Record<string, unknown>) => void) | undefined;
    vi.stubGlobal("Hooks", {on: vi.fn((_hook: string, handler: typeof callback) => {
      callback = handler;
    })});
    vi.stubGlobal("game", {user: {isGM: true}});
    registerGMIntrusionSceneControl();
    const tools: Record<string, TestSceneTool> = {select: {order: 0}};
    const controls = {tokens: {tools}};
    callback?.(controls as unknown as Record<string, unknown>);

    const intrusion = tools.cypherv2GMIntrusion!;
    const horror = tools.cypherv2HorrorMode!;
    expect(horror.visible).toBe(true);
    expect(horror.order).toBe(intrusion.order + 1);
    expect(horror.icon).toContain("fa-skull");
  });

  it("keeps the Horror control hidden from players", () => {
    let callback: ((controls: Record<string, unknown>) => void) | undefined;
    vi.stubGlobal("Hooks", {on: vi.fn((_hook: string, handler: typeof callback) => {
      callback = handler;
    })});
    vi.stubGlobal("game", {user: {isGM: false}});
    registerGMIntrusionSceneControl();
    const tools: Record<string, TestSceneTool> = {};
    const controls = {tokens: {tools}};
    callback?.(controls as unknown as Record<string, unknown>);

    expect(tools.cypherv2HorrorMode?.visible).toBe(false);
  });

  it("uses an immediate range preview and persists on native change without an Apply action", () => {
    expect(dialog).toContain('type="range"');
    expect(dialog).toContain('step="1"');
    expect(dialog).toContain('input.addEventListener("input"');
    expect(dialog).toContain('input.addEventListener("change"');
    expect(dialog).toContain("setHorrorIntrusionRange(Number(input.value))");
    expect(dialog).not.toMatch(/Save|Apply/);
  });

  it("reuses Pool-gauge tokens and escalates glow intensity without continuous animation", () => {
    expect(styles).toContain("var(--cypherv2-pool-gauge-high)");
    expect(styles).toContain("var(--cypherv2-color-warning)");
    expect(styles).toContain("var(--cypherv2-danger)");
    expect(styles).toContain('--cypherv2-horror-glow: 43%');
    expect(styles).toContain('--cypherv2-horror-glow: 72%');
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(styles).not.toMatch(/animation|@keyframes/);
  });

  it("keeps explicit accessible range and normal-state copy localized", () => {
    expect(localization["CYPHERV2.Horror.RangeSummary"]).toContain("1–{range}");
    expect(localization["CYPHERV2.Horror.NormalSummary"]).toBe("Normal · Natural 1");
    expect(dialog).toContain('aria-valuetext');
  });
});
