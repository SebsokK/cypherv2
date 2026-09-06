import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {describe, expect, it} from "vitest";

const root = resolve(import.meta.dirname, "../..");

describe("Character Focus association UI", () => {
  it("uses the native ActorSheetV2 document-drop workflow", () => {
    const source = readFileSync(resolve(root, "src/applications/sheets/character-sheet.ts"), "utf8");
    expect(source).toContain("override async _onDropDocument");
    expect(source).toContain('item?.type === "focus"');
    expect(source).toContain('item?.type === "characterType"');
    expect(source).toContain('item?.type === "descriptor"');
    expect(source).toContain("promptAttachFocus");
    expect(source).not.toMatch(/addEventListener\(["'](?:drop|dragover)/);
  });

  it("exposes Add and non-destructive Remove Focus actions", () => {
    const template = readFileSync(resolve(root, "templates/actor/character-sheet.hbs"), "utf8");
    expect(template).toContain('data-action="addFocus"');
    expect(template).toContain('data-action="removeFocus"');
    expect(template).toContain('data-focus-uuid="{{tree.focusUuid}}"');
  });

  it("exposes Core Setup without requiring a Type, Descriptor, or Focus", () => {
    const template = readFileSync(resolve(root, "templates/actor/character-sheet.hbs"), "utf8");
    expect(template).toContain('data-action="beginCoreSetup"');
    expect(template).toContain('data-action="skipCoreSetup"');
    expect(template).toContain('data-action="markCoreInitialized"');
    const dialog = readFileSync(resolve(root, "src/applications/dialogs/character-setup-dialog.ts"), "utf8");
    expect(dialog).not.toMatch(/descriptor|characterType|species|focus/i);
    expect(dialog).toContain("data-core-points-remaining");
    expect(dialog).toContain('submit.disabled = !valid || remaining !== 0');
    expect(dialog).toContain('actor.sheet?.render({force: true})');
  });

  it("keeps GM progression repair controls internal and removes Edit Progression from normal UI", () => {
    const template = readFileSync(resolve(root, "templates/actor/character-sheet.hbs"), "utf8");
    const source = readFileSync(resolve(root, "src/applications/sheets/character-sheet.ts"), "utf8");
    expect(template).not.toContain('data-action="toggleGmProgressionEdit"');
    expect(source).toContain("#onToggleGmProgressionEdit");
    const tree = readFileSync(resolve(root, "templates/focus/focus-tree.hbs"), "utf8");
    expect(tree).toContain('data-action="gmMarkFocusOwned"');
    expect(tree).toContain('data-action="gmRemoveFocusOwned"');
    expect(tree).not.toContain('class="focus-tree-context-action undo" data-action="undoFocusAcquisition"');
  });

  it("combines explicit guidance, Advancement, and Focus in priority order", () => {
    const template = readFileSync(resolve(root, "templates/actor/character-sheet.hbs"), "utf8");
    const source = readFileSync(resolve(root, "src/applications/sheets/character-sheet.ts"), "utf8");
    const guidance = template.indexOf('class="progression-guidance-banner"');
    const advancement = template.indexOf('class="advancement-section progression-section"');
    const focus = template.indexOf('class="focus-progression-section progression-section"');

    expect(template).toContain('{{#unless advancement.guidance.completed}}');
    expect(template).toContain('data-action="completeProgressionGuidance"');
    expect(template).toContain('data-action="resetProgressionGuidance"');
    expect(guidance).toBeGreaterThan(-1);
    expect(guidance).toBeLessThan(advancement);
    expect(advancement).toBeLessThan(focus);
    expect(source).not.toContain('{id: "foci"');
    expect(template).not.toContain('data-tab="foci"');
  });

  it("uses compact Advancement controls and decouples pending choices from the UI", () => {
    const template = readFileSync(resolve(root, "templates/actor/character-sheet.hbs"), "utf8");
    const source = readFileSync(resolve(root, "src/applications/sheets/character-sheet.ts"), "utf8");

    expect(template).toContain('class="advancement-compact-button"');
    expect(template).toContain('class="advancement-options compact-advancement-options"');
    expect(template).not.toContain("advancement.pendingFocusChoices");
    expect(template).not.toContain("advancement.pendingGenreChoices");
    expect(template).not.toContain("progression-genre-section");
    expect(template).toContain("{{option.xpCost}} XP");
    expect(template).toContain("{{advancement.other.xpCost}} XP");
    expect(template).toContain('class="{{#if option.purchased}}purchased{{/if}}"');
    expect(template).toContain('fa-{{#if option.purchased}}solid fa-check{{else}}regular fa-square{{/if}}');
    expect(source).toContain("xpCost: advancement.policy.xpCost");
  });

  it("shows the Genre browser action only inside the active-Genre condition", () => {
    const template = readFileSync(resolve(root, "templates/actor/character-sheet.hbs"), "utf8");
    expect(template).toContain('{{#if genre.available}}<button type="button" class="compact-inline-action" data-action="browseGenreAbilities"');
  });
});
