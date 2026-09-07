import {readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";

const template = readFileSync("templates/actor/character-sheet.hbs", "utf8");
const sheet = readFileSync("src/applications/sheets/character-sheet.ts", "utf8");
const styles = readFileSync("styles/components/_character-header.scss", "utf8");
const settings = template.slice(
  template.indexOf('data-tab="settings"'),
  template.indexOf('data-tab="skills"')
);

describe("compact Character Settings UI", () => {
  it("orders Character tabs with Settings at the far right", () => {
    const tabs = sheet.slice(sheet.indexOf("static TABS"), sheet.indexOf("override async _onRender"));
    const expected = ["skills", "abilities", "combat", "inventory", "advancement", "notes", "settings"];
    const positions = expected.map((id) => tabs.indexOf(`{id: "${id}"`));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
    expect(tabs).toContain('initial: "skills"');
  });

  it("starts with useful compact configuration and removes the oversized legacy introduction", () => {
    expect(settings).toContain('class="character-settings-panel"');
    expect(settings).not.toContain("character-settings-intro");
    expect(settings).not.toContain("CYPHERV2.Settings.Character.Title");
    expect(settings).not.toContain("CYPHERV2.Settings.Character.Placeholder");
    expect(styles).toContain(".character-settings-section-header");
  });

  it("keeps compact Weapon and Armor familiarity toggles with provenance tooltips", () => {
    expect(settings).toContain('class="character-settings-section character-familiarity-settings"');
    expect(settings).toContain("CYPHERV2.Settings.Character.FamiliarityHint");
    expect(settings).toContain('data-action="toggleFamiliarity"');
    expect(settings).toContain('data-family="weapon"');
    expect(settings).toContain('data-family="armor"');
    expect(settings).toContain('title="{{entry.sourceHint}}"');
    expect(styles).toContain("grid-template-columns: 5rem minmax(0, 1fr)");
  });

  it("renders Genre as a compact open, replace, remove, add, and drop row", () => {
    expect(settings).toContain('class="character-source-subsection character-genre-settings"');
    expect(settings).toContain('data-hud-drop="genre"');
    expect(settings).toContain('data-action="inspectGenre"');
    expect(settings).toContain('data-action="addGenre"');
    expect(settings).toContain('data-action="removeGenre"');
    expect(settings).toContain("genre.totalEffortCapLabel");
    expect(settings).toContain("character-genre-dropzone");
  });

  it("uses the requested top-level Settings section order and nests Genre in Character Sources", () => {
    const familiarities = settings.indexOf("character-familiarity-settings");
    const sources = settings.indexOf("character-packages");
    const genre = settings.indexOf("character-genre-settings");
    const base = settings.indexOf("character-base-values");
    const overrides = settings.indexOf("character-override-settings");
    const appearance = settings.indexOf("character-header-appearance-settings");
    expect([familiarities, sources, base, overrides, appearance]).toEqual(
      [...[familiarities, sources, base, overrides, appearance]].sort((left, right) => left - right)
    );
    expect(genre).toBeGreaterThan(sources);
    expect(genre).toBeLessThan(base);
  });

  it("provides Focus sentence, Wound capacity, and Recovery manual configuration", () => {
    expect(settings).toContain('name="system.presentation.hideFocusInSentence"');
    expect(settings).toContain('data-action="editWoundCapacityOverride"');
    expect(settings).toContain('data-action="resetWoundCapacityOverride"');
    expect(settings).toContain('data-action="editRecoveryOverride"');
    expect(settings).toContain('data-action="resetRecoveryOverride"');
  });

  it("keeps every package relationship and action in compact source rows", () => {
    expect(settings).toContain("CYPHERV2.Settings.Character.Sources");
    for (const collection of [
      "typeItems",
      "primaryDescriptorItems",
      "speciesItems",
      "additionalDescriptorItems",
      "speciesDescriptorItems"
    ]) expect(settings).toContain(collection);
    for (const action of [
      "inspectPackage",
      "removePackage",
      "addType",
      "addDescriptor",
      "addSpecies"
    ]) expect(settings).toContain(`data-action="${action}"`);
  });

  it("moves granted Items and provenance behind a collapsed native disclosure", () => {
    expect(settings).toContain('<details class="character-granted-disclosure">');
    expect(settings).toContain("CYPHERV2.Settings.Character.GrantedProvenance");
    expect(settings).toContain("packageGrantedItems");
    expect(settings).toContain('data-action="inspectGrantedItem"');
    expect(settings).not.toContain('<details class="character-granted-disclosure" open>');
  });

  it("keeps editable base Pool values inside a collapsed transient disclosure", () => {
    expect(settings).toContain('class="character-settings-section character-settings-disclosure character-base-values"');
    expect(settings).toContain('data-persistent-disclosure="base-values"');
    expect(settings).not.toMatch(/data-persistent-disclosure="base-values"[^>]*\sopen(?:\s|>)/);
    expect(settings).toContain('class="character-base-values-grid"');
    for (const pool of ["might", "speed", "intellect"]) {
      expect(settings).toContain(`name="system.stats.${pool}.baseMax"`);
      expect(settings).toContain(`name="system.stats.${pool}.baseEdge"`);
      expect(settings).toContain(`system.derived.pools.${pool}.maxContributions`);
      expect(settings).toContain(`system.derived.pools.${pool}.edgeContributions`);
    }
    expect(settings.match(/class="derived-breakdown"/g)).toHaveLength(3);
    expect(styles).toContain("grid-template-columns: repeat(3, minmax(0, 1fr))");
    expect(styles).toContain("@container cypherv2-character-sheet (max-width: 560px)");
    expect(styles).toContain(".character-base-values-grid");
  });

  it("keeps Effective Value Overrides collapsed without changing its controls", () => {
    expect(settings).toContain('class="character-settings-section character-settings-disclosure character-override-settings"');
    expect(settings).toContain('data-persistent-disclosure="effective-overrides"');
    expect(settings).not.toMatch(/data-persistent-disclosure="effective-overrides"[^>]*\sopen(?:\s|>)/);
    expect(settings).toContain('data-action="editCharacterOverride"');
    expect(settings).toContain('data-action="clearCharacterOverride"');
    expect(styles).toContain(".character-settings-disclosure");
  });

  it("removes Advanced Actions from normal Settings while retaining its runtime handlers", () => {
    expect(settings).not.toContain('class="core-action-bar"');
    expect(settings).not.toContain('class="status-grid"');
    expect(settings).not.toContain('data-action="recovery"');
    expect(settings).not.toContain('data-action="rally"');
    expect(settings).not.toContain('data-action="applyWound"');
    expect(settings).not.toContain("CYPHERV2.Settings.Character.AdvancedActions");
    expect(settings).not.toContain('data-action="poolDamage"');
    expect(settings).not.toContain('data-action="editWound"');
    expect(settings).not.toContain('data-action="deleteWound"');
    expect(sheet).toContain("#onPoolDamage");
    expect(sheet).toContain("#onEditWound");
    expect(sheet).toContain("#onDeleteWound");
  });

  it("places Character Appearance last after gameplay and the collapsed value sections", () => {
    const appearance = settings.indexOf('class="character-settings-section character-header-appearance-settings"');
    const familiarities = settings.indexOf('class="character-settings-section character-familiarity-settings"');
    const genre = settings.indexOf('class="character-settings-section character-genre-settings"');
    const sources = settings.indexOf('class="character-settings-section character-packages"');
    const baseValues = settings.indexOf("character-base-values");
    const overrides = settings.indexOf("character-override-settings");

    expect(appearance).toBeGreaterThan(familiarities);
    expect(appearance).toBeGreaterThan(genre);
    expect(appearance).toBeGreaterThan(sources);
    expect(appearance).toBeGreaterThan(baseValues);
    expect(appearance).toBeGreaterThan(overrides);
    expect(settings.slice(appearance + 1)).not.toContain('class="character-settings-section ');
    expect(settings).toContain("CYPHERV2.Settings.Character.CharacterAppearance");
    expect(settings).not.toContain("CYPHERV2.Settings.Character.HeaderAppearance");
  });
});
