import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {describe, expect, it} from "vitest";
import {
  captureCharacterSheetUiState,
  restoreCharacterSheetScroll
} from "../../src/applications/sheets/character-sheet-ui-state";

const root = resolve(process.cwd());

describe("Character Sheet overflow", () => {
  it("gives every active tab an independent themed vertical scroll area", () => {
    const sheets = readFileSync(resolve(root, "styles/sheets/_sheets.scss"), "utf8");
    expect(sheets).toMatch(/\.cypherv2-sheet\.cypherv2-character[\s\S]*> \.tab\.active[\s\S]*overflow-y:\s*auto/);
    expect(sheets).toContain("var(--cypherv2-scrollbar-thumb)");
    expect(sheets).toContain("var(--cypherv2-scrollbar-track)");
    expect(sheets).toContain("var(--cypherv2-scrollbar-size)");
  });

  it("retains independent horizontal scrolling inside wide Focus Trees", () => {
    const focus = readFileSync(resolve(root, "styles/components/_focus-tree.scss"), "utf8");
    expect(focus).toMatch(/\.focus-tree-scroll[\s\S]*overflow:\s*auto/);
  });

  it("captures the active Combat tab and restores its viewport without Actor data", () => {
    const tabs = ["skills", "combat"].map((id) => ({
      dataset: {tab: id},
      scrollTop: id === "combat" ? 517 : 24,
      classList: {contains: (name: string) => name === "active" && id === "combat"}
    }));
    const disclosures = [
      {dataset: {persistentDisclosure: "base-values"}, open: true},
      {dataset: {persistentDisclosure: "effective-overrides"}, open: false}
    ];
    const rootNode = {querySelectorAll: (selector: string) => (
      selector === "details[data-persistent-disclosure]" ? disclosures : tabs
    )};
    const state = captureCharacterSheetUiState(rootNode as unknown as ParentNode);
    expect(state).toEqual({
      activeTab: "combat",
      tabScroll: {skills: 24, combat: 517},
      disclosures: {"base-values": true, "effective-overrides": false}
    });

    tabs[0]!.scrollTop = 0;
    tabs[1]!.scrollTop = 0;
    disclosures[0]!.open = false;
    disclosures[1]!.open = true;
    restoreCharacterSheetScroll(rootNode as unknown as ParentNode, state);
    expect(tabs[0]!.scrollTop).toBe(24);
    expect(tabs[1]!.scrollTop).toBe(517);
    expect(disclosures.map((details) => details.open)).toEqual([true, false]);
    expect(state).not.toHaveProperty("system");
  });

  it("restores the locally captured tab before restoring scroll on rerender", () => {
    const source = readFileSync(resolve(root, "src/applications/sheets/character-sheet.ts"), "utf8");
    expect(source).toContain("captureCharacterSheetUiState(this.element)");
    expect(source).toContain('changeTab.call(this, this.#activeTab, "primary")');
    expect(source.indexOf('changeTab.call(this, this.#activeTab, "primary")'))
      .toBeLessThan(source.indexOf("restoreCharacterSheetScroll(this.element"));
    expect(source).not.toContain('"system.activeTab"');
  });

  it("uses the same transient state path for every embedded Combat Item rerender", () => {
    const source = readFileSync(resolve(root, "src/applications/sheets/character-sheet.ts"), "utf8");
    for (const action of [
      "#onToggleShieldEquipped",
      "#onToggleArmorEquipped",
      "#onReloadWeapon",
      "#onRollCombatDepletion"
    ]) expect(source).toContain(action);
    expect(source).toMatch(/_prepareContext[\s\S]*?captureCharacterSheetUiState\(this\.element\)/);
    expect(source).toMatch(/_onRender[\s\S]*?restoreCharacterSheetScroll\(this\.element/);
  });
});
