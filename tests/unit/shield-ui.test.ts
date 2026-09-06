import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {describe, expect, it} from "vitest";

const root = resolve(import.meta.dirname, "../..");
const characterTemplate = readFileSync(resolve(root, "templates/actor/character-sheet.hbs"), "utf8");
const itemTemplate = readFileSync(resolve(root, "templates/item/item-sheet.hbs"), "utf8");
const itemDocument = readFileSync(resolve(root, "src/documents/item.ts"), "utf8");
const itemSheet = readFileSync(resolve(root, "src/applications/sheets/item-sheet.ts"), "utf8");
const woundDialogs = readFileSync(resolve(root, "src/applications/dialogs/shield-wound-dialogs.ts"), "utf8");
const defenseTemplate = readFileSync(resolve(root, "templates/chat/defense-request-card.hbs"), "utf8");
const combatDialogs = readFileSync(resolve(root, "src/applications/dialogs/combat-dialogs.ts"), "utf8");

describe("Shield V1 UI", () => {
  it("exposes the minimal Shield inventory summary and Item editor", () => {
    expect(characterTemplate).toContain('data-action="createShield"');
    expect(characterTemplate).toContain("shield.capacities.minor");
    expect(characterTemplate).toContain("shield.capacities.moderate");
    expect(characterTemplate).toContain("shield.capacities.major");
    expect(characterTemplate).toContain("shield.broken");
    expect(itemTemplate).not.toMatch(/\{\{#if isShield\}\}[\s\S]*?name="system\.equipped"[\s\S]*?\{\{#if isCharacterType\}\}/);
    expect(itemTemplate).toContain("system.derived.broken");
  });

  it("provides correction controls for all three Wound tiers", () => {
    for (const severity of ["minor", "moderate", "major"]) {
      expect(itemTemplate).toContain(`data-action="editShieldWound" data-severity="${severity}"`);
      expect(itemTemplate).toContain(`data-action="deleteShieldWound" data-severity="${severity}"`);
    }
    expect(itemTemplate).toContain("data-shield-capacity");
    expect(itemTemplate).toContain('data-item-focus-key="system.woundCapacities.{{track.severity}}"');
    expect(itemTemplate).toContain("track.capacity");
    expect(itemSheet).toContain('querySelectorAll<HTMLInputElement>("input[data-shield-capacity]")');
    expect(itemSheet).toContain("services.shields.setCapacity(");
    expect(itemSheet).toContain("ShieldCapacityBelowWoundsError");
  });

  it("retains individual Wound edit/delete behavior behind compact icon actions", () => {
    expect(itemTemplate).toContain('data-action="editShieldWound"');
    expect(itemTemplate).toContain('data-action="deleteShieldWound"');
    expect(itemTemplate).toContain('class="fa-solid fa-pen"');
    expect(itemTemplate).toContain('class="fa-solid fa-trash"');
    expect(woundDialogs).toContain("services.shields.edit(shield, severity, woundId");
    expect(woundDialogs).toContain("services.shields.delete(shield, severity, woundId)");
  });

  it("automatically unequips other embedded Shields when one is equipped", () => {
    expect(itemDocument).toContain('this.type === "shield"');
    expect(itemDocument).toContain('item.type !== this.type');
    expect(itemDocument).toContain('{"system.equipped": false}');
    expect(itemDocument).toContain("cypherv2CombatEquipmentSync");
  });

  it("chooses Block With Shield on the request card without a post-roll transfer popup", () => {
    expect(defenseTemplate).toContain('data-defense="dodge"');
    expect(defenseTemplate).toContain('data-defense="block"');
    expect(defenseTemplate).toContain('data-defense="blockWithShield"');
    expect(combatDialogs).toContain('defenseType === "blockWithShield"');
    expect(combatDialogs).toContain("resolveDefenseWound");
    expect(combatDialogs).not.toContain("promptBlockWoundChoice");
    expect(combatDialogs).not.toContain("TransferWound");
  });
});
