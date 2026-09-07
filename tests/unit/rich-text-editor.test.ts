import {existsSync, readFileSync} from "node:fs";
import {resolve} from "node:path";
import {describe, expect, it} from "vitest";

const root = resolve(process.cwd());
const characterTemplate = readFileSync(resolve(root, "templates/actor/character-sheet.hbs"), "utf8");
const npcTemplate = readFileSync(resolve(root, "templates/actor/npc-sheet.hbs"), "utf8");
const itemTemplate = readFileSync(resolve(root, "templates/item/item-sheet.hbs"), "utf8");
const templates = [characterTemplate, npcTemplate, itemTemplate];
const sheetSources = [
  "src/applications/sheets/character-sheet.ts",
  "src/applications/sheets/npc-sheet.ts",
  "src/applications/sheets/item-sheet.ts"
].map((path) => readFileSync(resolve(root, path), "utf8"));
const styles = readFileSync(resolve(root, "styles/components/_rich-text-editor.scss"), "utf8");

describe("native Application V2 rich-text controls", () => {
  it("replaces every legacy editor helper with the native prose-mirror form input", () => {
    for (const template of templates) {
      expect(template).not.toContain("{{editor ");
      expect(template).toContain("{{formInput systemFields.");
      expect(template).toContain('elementType="prose-mirror"');
      expect(template).toContain("toggled=true");
    }
  });

  it("supplies raw source HTML separately from enriched read-mode HTML", () => {
    expect(characterTemplate).toContain('name="system.notes" value=source.system.notes enriched=enriched.notes');
    expect(npcTemplate).toContain('name="system.notes" value=source.system.notes enriched=enriched.notes');
    expect(npcTemplate).not.toContain('name="system.description"');
    expect(itemTemplate).toContain('name="system.description" value=source.system.description enriched=enriched.description');
    expect(itemTemplate).toContain('name="system.backgroundOptions" value=source.system.backgroundOptions enriched=enriched.backgroundOptions');
    expect(itemTemplate).toContain('name="system.equipmentNotes" value=source.system.equipmentNotes enriched=enriched.equipmentNotes');
  });

  it("passes document context and native disabled state to every editor", () => {
    for (const template of templates) {
      expect(template).toContain("disabled=(not editable)");
      expect(template).toMatch(/documentUUID=(?:actor|item)\.uuid/);
    }
    expect(characterTemplate).toContain("documentUUID=actor.uuid");
    expect(npcTemplate).toContain("documentUUID=actor.uuid");
    expect(itemTemplate).toContain("documentUUID=item.uuid");
  });

  it("exposes each TypeDataModel SchemaField to the native formInput helper", () => {
    for (const source of sheetSources) {
      expect(source).toContain("systemFields: documentSystemFields(this.");
    }
  });

  it("uses the DocumentSheetV2 form pipeline for native Save change events", () => {
    const options = readFileSync(
      resolve(root, "src/applications/sheets/document-sheet-options.ts"),
      "utf8"
    );
    expect(options).toContain("submitOnChange: true");
    for (const source of sheetSources) {
      expect(source).not.toContain("persistEditorHtml");
      expect(source).not.toContain("TextEditor.implementation.create");
    }
  });

  it("removes the parallel Cypher editor lifecycle and custom Save injection", () => {
    expect(existsSync(resolve(root, "src/applications/editors/prosemirror-description.ts"))).toBe(false);
    for (const source of sheetSources) {
      expect(source).not.toContain("ProseMirrorDescriptionController");
      expect(source).not.toMatch(/#(?:notesEditor|richTextEditor|descriptionEditor)/);
    }
    expect(styles).not.toContain("cypherv2-editor-active");
    expect(styles).not.toContain("cypherv2-editor-save");
  });

  it("styles only native active, inactive, toggle, toolbar, and content structures", () => {
    expect(styles).toContain("button.toggle");
    expect(styles).toContain(".editor.inactive .editor-content");
    expect(styles).toContain(".editor.active");
    expect(styles).toContain(".menu-container");
    expect(styles).toContain("menu.editor-menu");
    expect(styles).toContain('button[data-action="save"]');
    expect(styles).not.toMatch(/\.editor-content\.ProseMirror[\s\S]*position:/);
  });

  it("keeps read-mode selection and hides the native toggle when permissions disable it", () => {
    expect(styles).toMatch(/\.editor\.inactive \.editor-content\s*\{[\s\S]*user-select:\s*text/);
    expect(styles).toMatch(/prose-mirror\.editor\[disabled\] button\.toggle\s*\{[\s\S]*display:\s*none/);
  });

  it("does not repeat the Character Notes tab label above its native editor", () => {
    expect(characterTemplate).not.toContain('<span>{{localize "CYPHERV2.Tabs.Notes"}}</span>');
    expect(characterTemplate).toContain('name="system.notes"');
  });

  it("positions and styles Foundry native editor controls without replacing them", () => {
    expect(styles).toMatch(/button\.toggle\s*\{[\s\S]*right:\s*var\(--cypherv2-space\)/);
    expect(styles).toMatch(/> li:has\(> button\[data-action="save"\]\)\s*\{[^}]*order:\s*100/);
    expect(styles).toMatch(/> li:has\(> button\[data-action="save"\]\)\s*\{[^}]*margin-left:\s*auto/);
    expect(styles).toMatch(/button\[data-action="save"\]\s*\{[\s\S]*background:\s*var\(--cypherv2-color-accent\)/);
    expect(styles).toMatch(/button\[data-action="save"\]\s*\{[\s\S]*font-weight:\s*700/);
    expect(styles).not.toContain('li[data-action="save"]');
    expect(styles).not.toContain("cypherv2-editor-save");
  });

  it("hides only Foundry's native collaboration status slot in Cypher editors", () => {
    expect(styles).toMatch(/> li\.concurrent-users\s*\{[\s\S]*display:\s*none/);
    expect(styles).not.toMatch(/> li\.concurrent-users\s*\{[^}]*!important/);
  });

  it("keeps semantic rich-text headings compact only in Item prose and embedded Character Item details", () => {
    expect(styles).toContain(".cypherv2-sheet.cypherv2-item .cypherv2-rich-description :is(.editor-content, .ProseMirror)");
    expect(styles).toContain(".cypherv2-sheet.cypherv2-character :is(.ability-description, .compact-inventory-details)");
    expect(styles).toMatch(/h1\s*\{[\s\S]*font-size:\s*0\.9rem/);
    expect(styles).toMatch(/h2\s*\{[\s\S]*font-size:\s*0\.82rem/);
    expect(styles).toMatch(/h3\s*\{[\s\S]*font-size:\s*0\.76rem/);
    expect(styles).not.toContain(".journal-sheet");
  });
});
