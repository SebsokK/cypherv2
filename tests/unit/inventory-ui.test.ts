import {readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";
import {character} from "../helpers/core-fixtures";

const template = readFileSync("templates/actor/character-sheet.hbs", "utf8");
const source = readFileSync("src/applications/sheets/character-sheet.ts", "utf8");
const styles = readFileSync("styles/components/_inventory-list.scss", "utf8");
const itemTemplate = readFileSync("templates/item/item-sheet.hbs", "utf8");
const itemChatTemplate = readFileSync("templates/chat/item-card.hbs", "utf8");
const chatController = readFileSync("src/items/item-chat-controller.ts", "utf8");
const characterModel = readFileSync("src/data/actors/character.ts", "utf8");

describe("Inventory UI V1", () => {
  it("adds one compact Inventory tab with Equipment, Cyphers, and Artifacts", () => {
    expect(source).toContain('{id: "inventory"');
    expect(template).toContain('data-tab="inventory"');
    for (const section of ["equipment", "cypher", "artifact"]) {
      expect(template).toContain(`data-inventory-section="${section}"`);
      expect(template).toContain(`data-item-type="${section}"`);
    }
    expect(styles).toContain("min-height: 1.65rem");
    expect(styles).toContain('[data-tab="inventory"] .inventory-section');
    expect(styles).toContain("border-bottom: 1px solid color-mix");
  });

  it("edits the existing persisted Cypher Limit base through the native Actor form", () => {
    expect(characterModel).toContain("cypherLimitBase: integerField(2)");
    expect(template).toContain('name="system.cypherLimitBase"');
    expect(template).toContain('value="{{system.cypherLimitBase}}"');
    expect(template).toContain('{{#if editable}}<input name="system.cypherLimitBase"');
    expect(template).toContain('{{else}}<strong>{{system.cypherLimitBase}}</strong>');
    expect(source).not.toContain("data-cypher-limit");
  });

  it("keeps Cypher Limit reminder-only and independent from owned Cypher Items", () => {
    expect(template).not.toContain("inventory.cyphers.length");
    expect(source).not.toContain("cypherLimitExceeded");
    expect(source).not.toContain("deleteCyphersAboveLimit");
  });

  it("persists a Cypher Limit path update without changing owned Cypher Items", async () => {
    const actor = character();
    const cyphers = [{id: "cypher-1", type: "cypher"}];
    Object.assign(actor, {items: cyphers});
    await actor.update({"system.cypherLimitBase": 4});
    expect(actor.system.cypherLimitBase).toBe(4);
    expect(actor.system.derived.cypherLimit.max).toBe(4);
    expect((actor as unknown as {items: unknown[]}).items).toBe(cyphers);
  });

  it("keeps name/open, edit, delete, quantity, and add actions compact and typed", () => {
    expect(template).toContain('data-action="openInventoryItem"');
    expect(template).toContain('data-action="deleteInventoryItem"');
    expect(template).toContain("data-inventory-quantity");
    expect(source).toContain('await item.update({"system.quantity": quantity})');
    expect(source).toContain("if (!isInventoryItemType(type))");
    expect(source).toContain('createEmbeddedDocuments("Item"');
    expect(styles).toContain("text-align: left");
    expect(styles).toContain("justify-content: flex-start");
  });

  it("toggles enriched descriptions without triggering the primary Item action", () => {
    expect(template).toContain('data-action="toggleInventoryDetails"');
    expect(template).toContain("{{{item.enrichedDescription}}}");
    expect(source).toContain("static #onToggleInventoryDetails");
    expect(source).toContain("event.preventDefault();");
    expect(source).toContain("event.stopPropagation();");
  });

  it("displays and rolls existing Artifact Depletion through the existing service", () => {
    expect(template).toContain('class="inventory-artifact-identity"');
    expect(template).toContain('>({{localize "CYPHERV2.Inventory.Level"}} {{item.level}})');
    expect(template).toContain('>({{localize "CYPHERV2.Inventory.Level"}} <strong>{{item.level}}</strong>)</span>');
    expect(template).toContain("item.depletionLabel");
    expect(template).toContain('data-action="rollInventoryDepletion"');
    expect(source).toContain("await rollItemDepletion(item as unknown as DepletionItemLike)");
    expect(itemChatTemplate).toContain('data-action="rollItemCardDepletion"');
    expect(chatController).toContain("rollItemDepletion");
  });

  it("adds independent Send to Chat actions to Inventory, Abilities, and Combat Items", () => {
    expect(template.match(/data-action="sendItemToChat"/g)).toHaveLength(7);
    expect(source).toContain("game.cypherv2.services.itemChat.publish(item)");
  });

  it("renders Cypher Power and muted reversible Artifact Depletion state", () => {
    expect(template).toContain("inventory-power is-{{item.power}}");
    expect(source).toContain("powerLabel: presentation.power");
    expect(template).toContain("{{#if item.depleted}}is-depleted{{/if}}");
    expect(styles).toContain("&.is-depleted");
    expect(template).toContain('class="inventory-depleted-label combat-depleted-state"');
    expect(styles).toMatch(/\.inventory-depleted-label[\s\S]*&\.combat-depleted-state[\s\S]*var\(--cypherv2-danger\)/);
    for (const rank of ["low", "medium", "advanced", "high", "ultra"]) {
      expect(styles).toContain(`&.is-${rank}`);
    }
  });

  it("uses compact ProseMirror Item Sheets for Equipment, Cypher, and Artifact", () => {
    for (const condition of ["isEquipment", "isCypher", "isArtifact"]) {
      expect(itemTemplate).toContain(`{{#if ${condition}}}`);
    }
    expect(itemTemplate.match(/inventory-item-sheet-layout/g)?.length).toBeGreaterThanOrEqual(3);
    expect(itemTemplate.match(/name="system.description"/g)?.length).toBeGreaterThanOrEqual(6);
    expect(itemTemplate).toContain('name="system.depleted"');
    expect(itemTemplate).toContain('name="system.level" type="text"');
  });
});
