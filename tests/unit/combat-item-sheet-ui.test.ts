import {readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";

const template = readFileSync("templates/item/item-sheet.hbs", "utf8");
const source = readFileSync("src/applications/sheets/item-sheet.ts", "utf8");
const styles = readFileSync("styles/components/_item-rule-sheet.scss", "utf8");

function section(type: "Weapon" | "Armor" | "Shield", next: "Armor" | "Shield" | "CharacterType"): string {
  const start = template.indexOf(`{{#if is${type}}}`);
  return template.slice(start, template.indexOf(`{{#if is${next}}}`, start));
}

describe("compact Combat Item Sheets", () => {
  it("places the optional Weapon default Pool compactly beside the name", () => {
    const header = template.slice(0, template.indexOf('<section class="item-content"'));
    expect(header).toContain("weapon-item-header");
    expect(header).toContain('class="compact-mechanic-field weapon-default-pool"');
    expect(header).toContain('name="system.defaultPool"');
    expect(source).toContain("weaponDefaultPoolOptions");
    expect(styles).toContain("grid-template-columns: 2.75rem minmax(0, 1fr) minmax(6.5rem, 8rem)");
  });

  it("keeps only essential Weapon mechanics and the persistent resource disclosure above Description", () => {
    const weapon = section("Weapon", "Armor");
    const description = weapon.indexOf("compact-rule-description");
    for (const field of [
      "system.category", "system.rangeCategory", "system.skillLevel",
      "system.ammo.enabled", "system.ammo.value", "system.ammo.max", "system.ammo.perAttack",
      "system.depletion.enabled"
    ]) expect(weapon.indexOf(`name="${field}"`)).toBeLessThan(description);
    expect(weapon).not.toContain('name="system.equipped"');
    expect(weapon).toContain('data-depletion-threshold');
    expect(weapon).toContain('data-depletion-sides');
    expect(weapon).toContain('data-persistent-disclosure="combat-resources"');
    expect(weapon).toContain('data-action="reloadWeapon"');
    expect(weapon).toContain('name="system.depleted"');
    expect(weapon).not.toContain('data-action="rollDepletion"');
    expect(weapon.indexOf('name="system.rangeNotes"')).toBeGreaterThan(description);
    expect(weapon).not.toContain('name="system.freelyUsed"');
    expect(weapon).toContain('name="system.description"');
    expect(weapon).toContain('elementType="prose-mirror"');
    expect(weapon).toContain('class="compact-depletion-controls"');
    expect(weapon).toContain('class="compact-depletion-rule"');
  });

  it("keeps Armor compact while exposing shared manual Depletion", () => {
    const armor = section("Armor", "Shield");
    expect(armor).toContain('name="system.category"');
    expect(armor).not.toContain('name="system.equipped"');
    expect(armor).not.toContain('name="system.freelyUsed"');
    expect(armor).toContain('name="system.depletion.enabled"');
    expect(armor).toContain('name="system.depleted"');
    expect(armor).toContain('data-depletion-threshold');
    expect(armor).toContain('name="system.description"');
    expect(armor).toContain("compact-technical-area");
    expect(armor).toContain('class="compact-depletion-controls"');
    expect(armor).toContain('class="compact-depletion-rule"');
    expect(armor.indexOf("system.slug")).toBeGreaterThan(armor.indexOf("compact-rule-description"));
  });

  it("shows derived Shield status, reusable pips, rich Description, and retained Wound details", () => {
    const shield = section("Shield", "CharacterType");
    expect(shield).toContain("system.derived.broken");
    expect(shield).not.toContain('name="system.equipped"');
    expect(shield).toContain('name="system.depletion.enabled"');
    expect(shield).toContain('name="system.depleted"');
    expect(shield).toContain("shieldWoundTracks");
    expect(shield).toContain('data-action="setShieldWoundCount"');
    expect(shield).toContain('data-action="editShieldWound"');
    expect(shield).toContain('data-action="deleteShieldWound"');
    expect(shield).toContain("compact-derived-status");
    expect(shield).toContain("compact-shield-capacity");
    expect(shield).toContain("data-shield-capacity");
    expect(shield).toContain('min="0" step="1"');
    expect(shield).toContain('class="compact-depletion-controls"');
    expect(shield).toContain('class="compact-depletion-rule"');
    expect(shield).toContain('class="fa-solid fa-pen"');
    expect(shield).toContain('class="fa-solid fa-trash"');
    expect(shield).toContain('name="system.description"');
    expect(source).toContain("game.cypherv2.services.shields.setCount(");
    expect(source).toContain("game.cypherv2.services.shields.setCapacity(");
    expect(source).toContain("if (!this.isEditable) return");
    expect(source).toContain("#openDisclosures");
    expect(source).toContain('querySelectorAll<HTMLDetailsElement>("details")');
    expect(source).toContain("captureItemSheetUiState");
    expect(source).toContain("restoreItemSheetUiState");
  });

  it("uses compact responsive styling and does not expose plumbing in normal mechanics", () => {
    expect(styles).toContain(".weapon-core-mechanics");
    expect(styles).toContain(".armor-core-mechanics");
    expect(styles).toContain(".shield-core-mechanics");
    expect(styles).toMatch(/\.shield-core-mechanics\s*\{\s*grid-template-columns: minmax\(0, 1fr\)/);
    expect(styles).toContain(".compact-depletion-controls");
    expect(styles).toContain(".compact-depletion-rule");
    expect(styles).not.toContain(".weapon-depletion-rule");
    expect(styles).toContain(".compact-shield-pip");
    expect(styles).toContain("aspect-ratio: 1 / 1");
    expect(styles).toContain("border-radius: 50%");
    expect(styles).toContain("--cypherv2-wound-pip-shield");
    expect(styles).not.toContain("transform: rotate(45deg)");
    expect(source).toMatch(/services\.shields\.setCount\([\s\S]*?await this\.render\(\{force: true\}\)/);
    for (const type of ["Weapon", "Armor", "Shield"] as const) {
      const next = type === "Weapon" ? "Armor" : type === "Armor" ? "Shield" : "CharacterType";
      const content = section(type, next);
      const advanced = content.lastIndexOf("compact-technical-area");
      expect(content.indexOf("system.slug")).toBeGreaterThan(advanced);
      expect(content.indexOf("system.ruleElements.length")).toBeGreaterThan(advanced);
    }
  });

  it("keeps all Depleted controls on the shared semantic component", () => {
    const artifactStart = template.indexOf("{{#if isArtifact}}");
    const artifact = template.slice(artifactStart, template.indexOf("{{#if isWeapon}}", artifactStart));
    for (const content of [artifact, section("Weapon", "Armor"), section("Armor", "Shield"), section("Shield", "CharacterType")]) {
      expect(content).toContain("compact-depletion-controls");
      expect(content).toContain("compact-depleted-control");
      expect(content).toContain('name="system.depleted"');
    }
  });
});
