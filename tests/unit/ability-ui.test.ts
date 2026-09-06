import {readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";

const characterSheet = readFileSync("templates/actor/character-sheet.hbs", "utf8");
const itemSheet = readFileSync("templates/item/item-sheet.hbs", "utf8");
const source = readFileSync("src/applications/sheets/character-sheet.ts", "utf8");
const styles = readFileSync("styles/components/_ability-list.scss", "utf8");

describe("Ability Runtime UI", () => {
  it("uses the Ability name and chevron only for accordion disclosure", () => {
    expect(source).toContain('{id: "abilities"');
    expect(characterSheet).toContain('data-tab="abilities"');
    expect(characterSheet).toContain('class="ability-details-toggle cypherv2-icon-action" data-action="toggleAbilityDetails"');
    expect(characterSheet).toContain('class="ability-reference cypherv2-primary-action" data-action="toggleAbilityDetails"');
    expect(characterSheet).toContain('aria-expanded="{{ability.expanded}}"');
    expect(characterSheet).not.toContain('data-action="useAbility"');
  });

  it("keeps Chat, Pay, Archive, Edit and Delete as independent icon actions", () => {
    expect(characterSheet).toContain('data-action="sendItemToChat"');
    expect(characterSheet).toContain('data-action="payAbilityCost"');
    expect(characterSheet).toContain('data-action="toggleAbilityArchived"');
    expect(characterSheet).toContain('data-action="inspectAbility"');
    expect(characterSheet).toContain('data-action="deleteAbility"');
    expect(characterSheet).toContain('class="fa-solid fa-coins"');
    expect(characterSheet).toContain('fa-box-archive');
    expect(characterSheet).toContain('fa-arrow-rotate-left');
    expect(characterSheet).toContain('class="fa-solid fa-pen"');
    expect(characterSheet).toContain('class="fa-solid fa-trash"');
    expect(source).toContain('await ability.update({"system.archived": !archived})');
  });

  it("renders only enriched accordion details and omits classifications", () => {
    expect(characterSheet).toContain("{{{ability.enrichedDescription}}}");
    expect(characterSheet).not.toContain("ability.summary");
    expect(characterSheet).not.toContain("ability.tags");
    expect(characterSheet).not.toContain("ability.canUse");
    expect(characterSheet).not.toContain("ability-list-header");
    expect(characterSheet).not.toContain('class="ability-list"');
    expect(characterSheet).toContain('data-action="createAbility"');
  });

  it("wraps long content and remains dense at narrow widths", () => {
    expect(styles).toContain("overflow-wrap: anywhere");
    expect(styles).toContain("@container cypherv2-character-sheet (max-width: 560px)");
    expect(styles).toContain("min-height: 1.65rem");
    expect(styles).toContain("starts-archived-group");
    expect(styles).toContain("is-archived");
  });

  it("configures the structured Ability fields without JSON and retains ProseMirror", () => {
    for (const field of [
      "system.activation",
      "system.cost.amount",
      "system.cost.ignoresEdge",
      "system.roll",
      "system.rollModifier",
      "system.attackModifier",
      "system.damage",
      "system.woundSeverity",
      "system.range",
      "system.targetMode"
    ]) expect(itemSheet).toContain(`name="${field}"`);
    expect(itemSheet).toContain("data-ability-allowed-pool");
    expect(itemSheet).toContain('name="system.description"');
    expect(itemSheet).toContain('elementType="prose-mirror"');
  });

  it("keeps action handlers isolated from accordion navigation", () => {
    for (const handler of ["#onPayAbilityCost", "#onToggleAbilityArchived", "#onInspectAbility", "#onDeleteAbility"]) {
      const start = source.indexOf(`static async ${handler}`);
      expect(start).toBeGreaterThan(-1);
      expect(source.slice(start, start + 700)).toContain("event.stopPropagation()");
    }
  });
});
