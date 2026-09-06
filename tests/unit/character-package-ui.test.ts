import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {describe, expect, it} from "vitest";

const root = resolve(import.meta.dirname, "../..");

describe("Character Package UI", () => {
  it("uses Application V2 actions and native document drops without DOM drop listeners", () => {
    const source = readFileSync(resolve(root, "src/applications/sheets/character-sheet.ts"), "utf8");
    expect(source).toContain('item?.type === "characterType"');
    expect(source).toContain('item?.type === "descriptor"');
    expect(source).toContain('item?.type === "species"');
    expect(source).toContain("promptAttachType");
    expect(source).toContain("promptAttachDescriptor");
    expect(source).toContain("promptAttachSpecies");
    expect(source).not.toMatch(/addEventListener\(["'](?:drop|dragover)/);
  });

  it("exposes Type/Descriptor/Species definition controls and non-destructive removal choices", () => {
    const template = readFileSync(resolve(root, "templates/item/item-sheet.hbs"), "utf8");
    const dialogs = readFileSync(resolve(root, "src/applications/dialogs/character-package-dialogs.ts"), "utf8");
    expect(template).toContain('name="system.poolBonuses.might"');
    expect(template).toContain('name="system.woundBonuses.minor"');
    expect(template).toContain('data-action="addPackageGrant"');
    expect(template).toContain('data-action="addChoiceGroup"');
    expect(template).toContain('data-action="addPoolBonusChoiceGroup"');
    expect(template).toContain('data-action="editPoolBonusChoiceGroup"');
    expect(template).toContain('data-action="removePoolBonusChoiceGroup"');
    expect(template).toContain("typeSkillGrants");
    expect(template).toContain("typeSkillChoiceGroups");
    expect(template).toContain('name="system.cypherLimitBonus"');
    expect(template).toContain('data-grant-target="descriptor"');
    expect(template).toContain('elementType="prose-mirror"');
    expect(dialogs).toContain("CYPHERV2.Packages.RemoveWithGrants");
    expect(dialogs).toContain("CYPHERV2.Packages.KeepGrants");
    expect(dialogs).toContain("replaceItemId");
    expect(dialogs).toContain("attachSpecies");
    expect(dialogs).toContain("promptPoolBonusChoices");
    expect(dialogs).toContain("promptPackageChoice");
    expect(dialogs).not.toContain('select name="optionIds"');
    expect(dialogs).not.toMatch(/Packages\.ChoosePools[\s\S]{0,500}<select/);
  });

  it("uses Foundry's resolved document drop path for world and Compendium Species", () => {
    const source = readFileSync(resolve(root, "src/applications/sheets/character-sheet.ts"), "utf8");
    const dropHandler = source.slice(source.indexOf("override async _onDropDocument"), source.indexOf("static async #onAddType"));
    expect(dropHandler).toContain('item?.type === "species"');
    expect(dropHandler).toContain("promptAttachSpecies");
    expect(dropHandler).not.toContain("game.items.get");
    expect(dropHandler).not.toContain("fromUuid");
  });
});
