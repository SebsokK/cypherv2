import {readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";

const template = readFileSync("templates/actor/character-sheet.hbs", "utf8");
const sheet = readFileSync("src/applications/sheets/character-sheet.ts", "utf8");
const styles = readFileSync("styles/components/_character-header.scss", "utf8");

describe("Character active-tab Accent", () => {
  it("inherits the already-derived appearance variables from the Character root", () => {
    expect(template).toContain('class="cypherv2-sheet cypherv2-character" style="{{header.appearance.style}}"');
    expect(template).not.toMatch(/sheet-tabs[^>]+style=/);
    expect(styles).toMatch(/\.cypherv2-sheet\.cypherv2-character[\s\S]*--cypherv2-character-accent/);
    expect(styles).toMatch(/> \.sheet-tabs > a\.active[\s\S]*var\(--cypherv2-character-accent\)/);
    expect(styles).not.toMatch(/> \.sheet-tabs > a\.active[\s\S]*#96082a/);
  });

  it("keeps structural active state, focus styling, tab order, and transient rerender state", () => {
    expect(styles).toMatch(/> \.sheet-tabs > a\.active[\s\S]*border-bottom-color/);
    expect(styles).toMatch(/> \.sheet-tabs > a\.active[\s\S]*font-weight/);
    expect(sheet).toContain('changeTab.call(this, this.#activeTab, "primary")');
    const configured = sheet.match(/static TABS = \{[\s\S]*?tabs: \[([\s\S]*?)\],\s*initial:/)?.[1] ?? "";
    expect([...configured.matchAll(/\{id: "([^"]+)"/g)].map((match) => match[1]))
      .toEqual(["skills", "abilities", "combat", "inventory", "advancement", "notes", "settings"]);
  });
});
