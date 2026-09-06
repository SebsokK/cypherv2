import {readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";

const template = readFileSync("templates/item/item-sheet.hbs", "utf8");
const styles = readFileSync("styles/components/_item-rule-sheet.scss", "utf8");
const sheet = readFileSync("src/applications/sheets/item-sheet.ts", "utf8");
const language = readFileSync("lang/en.json", "utf8");

const typeSection = template.slice(
  template.indexOf("{{#if isCharacterType}}"),
  template.indexOf("{{#if isDescriptor}}")
);

describe("Type Item Sheet pre-release presentation", () => {
  it("keeps the Type content in a non-elastic normal-flow layout", () => {
    expect(typeSection).toContain('class="type-item-layout"');
    const layoutRule = styles.slice(
      styles.indexOf(".type-item-layout"),
      styles.indexOf(".type-description")
    );
    expect(layoutRule).toContain("display: grid");
    expect(layoutRule).toContain("flex: 0 0 auto");
    expect(layoutRule).toContain("align-self: flex-start");
    expect(layoutRule).toContain("align-content: start");
    expect(layoutRule).not.toContain("height: 100%");
    expect(layoutRule).not.toContain("min-height: 100%");
  });

  it("renders the requested Type sections in stable document order", () => {
    const markers = [
      "type-benefits-panel",
      "CYPHERV2.Packages.AbilityGrants",
      "CYPHERV2.Species.AbilityChoices",
      "CYPHERV2.Packages.FixedSkills",
      "CYPHERV2.Packages.ChoiceGroups",
      "name=\"system.backgroundOptions\"",
      "name=\"system.equipmentNotes\"",
      "type-technical-area"
    ];
    let previous = -1;
    for (const marker of markers) {
      const index = typeSection.indexOf(marker);
      expect(index, marker).toBeGreaterThan(previous);
      previous = index;
    }
  });

  it("uses compact shared headings, add controls, rows, and icon actions", () => {
    expect(typeSection.match(/class="compact-package-header/g)).toHaveLength(5);
    expect(typeSection.match(/class="compact-package-add-action cypherv2-icon-action"/g)).toHaveLength(4);
    expect(typeSection).toContain('class="compact-package-grant-row"');
    expect(typeSection).toContain('class="fa-solid fa-magnifying-glass"');
    expect(typeSection).toContain('class="fa-solid fa-arrows-rotate"');
    expect(typeSection).toContain('class="fa-solid fa-trash"');
    expect(typeSection).not.toMatch(/data-action="inspectPackageGrant"[^>]*>\s*\{\{localize/);
    expect(typeSection).not.toMatch(/data-action="refreshPackageGrant"[^>]*>\s*\{\{localize/);
    expect(typeSection).not.toMatch(/data-action="removePackageGrant"[^>]*>\s*\{\{localize/);
    expect(styles).toContain(".compact-package-header");
    expect(styles).toContain(".compact-package-row-actions");
  });

  it("keeps Suggested Genre normal and conditionally reveals Custom Genre", () => {
    expect(typeSection).toContain('name="system.genre" data-type-genre-select');
    expect(typeSection).toContain('name="system.customGenreId"');
    expect(typeSection).toContain("data-type-custom-genre {{#unless typeCustomGenreSelected}}hidden{{/unless}}");
    expect(language).toContain('"CYPHERV2.Packages.CustomGenre": "Custom Genre"');
    expect(sheet).toContain('typeCustomGenreSelected: isCharacterType && String(system.genre ?? "none") === "custom"');

    const binding = sheet.slice(
      sheet.indexOf("#bindTypeGenreVisibility(): void"),
      sheet.indexOf("override _canDragDrop", sheet.indexOf("#bindTypeGenreVisibility(): void"))
    );
    expect(binding).toContain('select.value !== "custom"');
    expect(binding).toContain('select.addEventListener("change", synchronize');
    expect(binding).not.toContain("item.update");
    expect(binding).not.toContain("customGenreId =");
  });

  it("preserves the Custom Genre source field and native document-drop fallback", () => {
    expect(typeSection).toContain('value="{{system.customGenreId}}"');
    const dropHandler = sheet.slice(
      sheet.indexOf("override async _onDropDocument"),
      sheet.indexOf("static async #onAddPackageGrant")
    );
    expect(dropHandler).toContain('this.item.type === "characterType"');
    expect(dropHandler).toContain("return super._onDropDocument(event, document)");
  });

  it("moves the dormant Equipment Bundle UUID into collapsed Technical UI", () => {
    const technical = typeSection.indexOf("type-technical-area");
    const equipmentBundle = typeSection.indexOf('name="system.equipmentBundleUuid"');
    expect(technical).toBeGreaterThan(typeSection.indexOf('name="system.equipmentNotes"'));
    expect(equipmentBundle).toBeGreaterThan(technical);
    expect(typeSection).toContain('data-persistent-disclosure="type-technical"');
    expect(typeSection).not.toMatch(/data-persistent-disclosure="type-technical"[^>]*\sopen(?:\s|>)/);
  });

  it("retains all package grant and choice action contracts", () => {
    for (const action of [
      "addPackageGrant",
      "addChoiceGroup",
      "addChoiceOption",
      "inspectPackageGrant",
      "refreshPackageGrant",
      "removePackageGrant"
    ]) expect(typeSection).toContain(`data-action="${action}"`);
  });
});
