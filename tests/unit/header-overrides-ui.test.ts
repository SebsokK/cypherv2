import {readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";

const template = readFileSync("templates/actor/character-sheet.hbs", "utf8");
const styles = readFileSync("styles/components/_character-header.scss", "utf8");
const sheet = readFileSync("src/applications/sheets/character-sheet.ts", "utf8");

describe("Header override presentation", () => {
  it("uses the same stat-box component for Tier, Effort, RP, and XP", () => {
    expect(template.match(/character-hud-stat-box/g)).toHaveLength(4);
    expect(template).toContain("character-hud-core-stats character-hud-stat-stack");
    expect(template).toContain("character-hud-currency character-hud-stat-stack");
    expect(styles).toContain("grid-template-rows: repeat(2, 2.55rem)");
    expect(styles).toContain("height: 2.55rem");
    expect(styles.match(/var\(--cypherv2-hud-stat-stack-width\)/g)).toHaveLength(2);
  });

  it("renders only effective values in the Header with no override decoration", () => {
    const header = template.slice(0, template.indexOf('<nav class="sheet-tabs'));
    expect(header).toContain("{{header.stats.tier}}");
    expect(header).toContain("{{header.stats.effort}}");
    expect(header).toContain("{{pool.max}}");
    expect(header).toContain("{{pool.edge}}");
    expect(header).not.toMatch(/override icon|override badge|\*\}\}/i);
    expect(sheet).toContain("tier: coreSystem.derived.tier.value");
  });

  it("keeps calculated, override, effective, edit, and clear controls in Settings", () => {
    expect(template).toContain("character-override-settings");
    expect(template).toContain('data-action="editCharacterOverride"');
    expect(template).toContain('data-action="clearCharacterOverride"');
    expect(template).toContain("entry.calculated");
    expect(template).toContain("entry.override");
    expect(template).toContain("entry.effective");
  });
});
