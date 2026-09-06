import {readFileSync} from "node:fs";
import {afterAll, beforeAll, describe, expect, it, vi} from "vitest";

import {rallyDialogContent} from "../../src/applications/dialogs/character-core-dialogs";

const source = readFileSync("src/applications/dialogs/character-core-dialogs.ts", "utf8");

beforeAll(() => vi.stubGlobal("game", {i18n: {localize: (key: string) => key}}));
afterAll(() => vi.unstubAllGlobals());

describe("Rally dialog V2", () => {
  it("uses the scoped shared dialog skin and exactly two mode radios", () => {
    const html = rallyDialogContent(9, 21, 2, 5, 7);
    expect(html).toContain("cypherv2 cypherv2-dialog cypherv2-rally-dialog");
    expect(html.match(/name="severity"/g)).toHaveLength(2);
    expect(html).toContain('value="minor" data-default-cost="2" checked');
    expect(html).toContain('value="moderate" data-default-cost="5"');
    expect(html).not.toContain("<select");
  });

  it("exposes a per-use numeric cost and current/after Might summary", () => {
    const html = rallyDialogContent(9, 21, 2, 5, 7);
    expect(html).toContain('name="cost" type="number" min="0" max="10"');
    expect(html).toContain('data-rally-after>7</span> / 21');
    expect(source).toContain("cost.value = String(Number(mode.dataset.defaultCost ?? 0))");
    expect(source).toContain("services.rally.preview(actor, severity, amount)");
    expect(source).toContain("numberValue(data, \"cost\")");
  });
});
