import {readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";

const characterTemplate = readFileSync("templates/actor/character-sheet.hbs", "utf8");
const itemTemplate = readFileSync("templates/item/item-sheet.hbs", "utf8");
const characterSheet = readFileSync("src/applications/sheets/character-sheet.ts", "utf8");
const itemSheet = readFileSync("src/applications/sheets/item-sheet.ts", "utf8");
const itemStyles = readFileSync("styles/components/_item-rule-sheet.scss", "utf8");

const genreSection = itemTemplate.slice(
  itemTemplate.indexOf("{{#if isGenre}}"),
  itemTemplate.indexOf("{{#unless isFocus}}"),
);

describe("Genre UI", () => {
  it("keeps Genre in Character Settings and out of the Character Sentence HUD", () => {
    expect(characterTemplate).toContain("character-genre-settings");
    expect(characterTemplate).toContain('data-hud-drop="genre"');
    expect(characterTemplate).toContain('data-action="addGenre"');
    expect(characterTemplate).toContain('data-action="inspectGenre"');
    expect(characterTemplate).toContain('data-action="removeGenre"');
    const hud = characterTemplate.slice(0, characterTemplate.indexOf('data-tab="settings"'));
    expect(hud).not.toContain("genre.name");
  });

  it("accepts native Genre drops and exposes the permissive manual browser", () => {
    expect(characterSheet).toContain('item?.type === "genre"');
    expect(characterSheet).toContain("promptAttachGenre(");
    expect(characterTemplate).toContain('data-action="browseGenreAbilities"');
    expect(characterTemplate).not.toContain('data-action="acquireGenreAbility"');
    expect(characterSheet).toContain("promptGenreAbilityBrowser");
  });

  it("provides a compact Genre Item editor with ProseMirror, catalog, options, and technical disclosure", () => {
    expect(itemTemplate).toContain("{{#if isGenre}}");
    expect(itemTemplate).toContain('name="system.description"');
    expect(itemTemplate).toContain('elementType="prose-mirror"');
    expect(itemTemplate).toContain('data-action="addGenreAbility"');
    expect(itemTemplate).toContain('data-action="inspectGenreAbility"');
    expect(itemTemplate).toContain('data-action="refreshGenreAbility"');
    expect(itemTemplate).toContain('data-action="removeGenreAbility"');
    expect(itemTemplate).toContain("data-genre-minimum-tier");
    expect(itemTemplate).toContain("genreCatalogEntries");
    expect(itemTemplate).toContain("entry.catalogLabel");
    expect(itemTemplate).toContain("entry.progressionBandLabel");
    expect(itemTemplate).toContain("entry.minimumSuperheroRank");
    expect(itemTemplate).toContain('data-entry-id="{{entry.id}}"');
    expect(itemTemplate).not.toContain('name="system.abilityCatalog.{{@index}}.minimumTier"');
    expect(itemTemplate).toContain('name="system.options.totalEffortCapMode"');
    expect(itemTemplate).toContain("CYPHERV2.Item.AdvancedTechnical");
    expect(itemSheet).toContain('this.item.type === "genre" && (document as Item)?.type === "ability"');
    expect(itemSheet).toContain("updateGenreMinimumTier(catalog, entryId, Number(input.value))");
  });

  it("uses the shared compact package presentation for Genre catalog authoring", () => {
    expect(genreSection.match(/class="compact-package-header"/g)).toHaveLength(2);
    expect(genreSection).toContain('class="compact-package-add-action cypherv2-icon-action"');
    expect(genreSection).toContain('class="genre-ability-row compact-package-grant-row"');
    expect(genreSection).toContain('class="genre-ability-list compact-package-grant-list"');
    expect(genreSection).toContain('class="compact-package-row-actions"');
    expect(genreSection).toContain('class="fa-solid fa-magnifying-glass"');
    expect(genreSection).toContain('class="fa-solid fa-arrows-rotate"');
    expect(genreSection).toContain('class="fa-solid fa-trash"');
    expect(genreSection).toContain('class="empty-list compact-package-empty"');
    expect(genreSection).toContain('class="genre-catalog-help"');
    expect(genreSection).toContain('data-persistent-disclosure="genre-technical"');
    expect(genreSection).not.toContain('class="section-header"');
    expect(genreSection).not.toContain('class="compact-inline-action"');
    expect(itemStyles).toContain(".genre-catalog-help");
    expect(itemStyles).toContain(".genre-entry-kind");
    expect(itemStyles).not.toContain(".genre-ability-catalog h2");
  });
});
