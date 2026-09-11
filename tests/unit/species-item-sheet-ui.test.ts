import {readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";

const template = readFileSync("templates/item/item-sheet.hbs", "utf8");
const styles = readFileSync("styles/components/_item-rule-sheet.scss", "utf8");
const sheet = readFileSync("src/applications/sheets/item-sheet.ts", "utf8");

const speciesSection = template.slice(
  template.indexOf("{{#if isSpecies}}"),
  template.indexOf("{{#if isFocus}}")
);

describe("Species Item Sheet beta.3 foundation", () => {
  it("uses the responsive Type-sheet layout without an obsolete fixed-width dependency", () => {
    expect(speciesSection).toContain('class="type-item-layout species-item-layout"');
    expect(speciesSection).toContain("species-benefits-panel");
    expect(speciesSection).toContain("species-description");
    expect(styles).toMatch(/\.type-item-layout,\s*\.species-item-layout\s*\{/);
    const sharedLayout = styles.slice(styles.indexOf(".type-item-layout,"), styles.indexOf(".type-description,"));
    expect(sharedLayout).toContain("width: 100%");
    expect(sharedLayout).toContain("min-width: 0");
    expect(sharedLayout).not.toContain("width: 500px");
  });

  it("keeps every existing Species benefit field in compact responsive groups", () => {
    for (const path of [
      "system.poolBonuses.might", "system.poolBonuses.speed", "system.poolBonuses.intellect",
      "system.woundBonuses.minor", "system.woundBonuses.moderate", "system.woundBonuses.major",
      "system.cypherLimitBonus", "system.edgeGrant.mode", "system.edgeGrant.pool", "system.edgeGrant.amount",
      "system.weaponUse.light", "system.weaponUse.medium", "system.weaponUse.heavy",
      "system.armorUse.light", "system.armorUse.medium", "system.armorUse.heavy"
    ]) expect(speciesSection).toContain(`name="${path}"`);
    expect(speciesSection).toContain("type-bonus-grid species-bonus-grid");
    expect(speciesSection).toContain("type-edge-grant species-edge-grant");
    expect(speciesSection).not.toContain("<h2>");
  });

  it("uses compact shared headers, rows, icon actions, and empty states", () => {
    expect(speciesSection).toContain('class="compact-package-header"');
    expect(speciesSection).toContain('class="compact-package-grant-row"');
    expect(speciesSection).toContain("compact-package-empty");
    expect(speciesSection).toContain("compact-package-add-action cypherv2-icon-action");
    expect(speciesSection).toContain('class="fa-solid fa-magnifying-glass"');
    expect(speciesSection).toContain('class="fa-solid fa-arrows-rotate"');
    expect(speciesSection).toContain('class="fa-solid fa-trash"');
  });

  it("exposes the shared extensible Weapon-family editor and normalized update path", () => {
    expect(speciesSection).toContain('value="{{speciesWeaponFamiliesValue}}"');
    expect(speciesSection).toContain("data-package-weapon-families");
    expect(speciesSection).toContain("cypherv2-species-weapon-family-suggestions");
    expect(speciesSection).not.toContain('name="system.weaponFamilyUse.');
    expect(sheet).toContain('this.item.type !== "characterType" && this.item.type !== "species"');
    expect(sheet).toContain('this.item.update({"system.weaponFamilies": normalizeWeaponFamilies(input.value)})');
  });

  it("renders Descriptor choice groups with stable action identifiers", () => {
    expect(speciesSection).toContain("CYPHERV2.Species.DescriptorChoices");
    expect(speciesSection).toContain('data-choice-kind="descriptor"');
    expect(speciesSection).toContain('data-grant-kind="descriptorGroup"');
    expect(speciesSection).toContain('data-grant-kind="descriptorOption"');
    expect(speciesSection).toContain("group.catalogMode");
    expect(sheet).toContain('sourceMode: catalogMode ? "catalog" : "fixed"');
    expect(sheet).toContain('catalogItemType: catalogMode ? "descriptor" : "none"');
    expect(sheet).toContain("speciesDescriptorChoiceGroups:");
  });

  it("keeps Skill context notes behind compact note actions", () => {
    expect(speciesSection).toContain('data-action="editSkillGrantNote"');
    expect(speciesSection).toContain("has-context-note");
    expect(speciesSection).not.toContain("{{grant.notes}}");
    expect(speciesSection).not.toContain("{{option.notes}}");
    expect(sheet).toContain("CYPHERV2.Packages.SkillContextNote");
  });

  it("retains all package authoring action contracts", () => {
    for (const action of [
      "addPackageGrant", "addChoiceGroup", "addChoiceOption", "editSkillGrantNote",
      "inspectPackageGrant", "refreshPackageGrant", "removePackageGrant"
    ]) expect(speciesSection).toContain(`data-action="${action}"`);
  });
});
