import {readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";

import {chatCardActorImage, chatCardActorImageData} from "../../src/services/chat-card-presentation";

const characterTemplate = readFileSync("templates/actor/character-sheet.hbs", "utf8");
const npcTemplate = readFileSync("templates/actor/npc-sheet.hbs", "utf8");
const itemTemplate = readFileSync("templates/item/item-sheet.hbs", "utf8");
const characterSheet = readFileSync("src/applications/sheets/character-sheet.ts", "utf8");
const npcSheet = readFileSync("src/applications/sheets/npc-sheet.ts", "utf8");
const dialogStyles = readFileSync("styles/components/_dialogs.scss", "utf8");
const chatStyles = readFileSync("styles/components/_roll-card.scss", "utf8");
const manifest = JSON.parse(readFileSync("system.json", "utf8")) as {
  media?: Array<{type: string; url: string; thumbnail?: string}>;
};

describe("V1 presentation polish", () => {
  it("uses the native DocumentSheetV2 editImage action only for editable avatars", () => {
    for (const template of [characterTemplate, npcTemplate, itemTemplate]) {
      expect(template).toContain('data-edit="img"');
      expect(template).toContain('{{#if editable}}data-action="editImage"');
    }
  });

  it("locks the canonical Character tab order", () => {
    const configuredTabs = characterSheet.match(/static TABS = \{[\s\S]*?tabs: \[([\s\S]*?)\],\s*initial:/)?.[1] ?? "";
    const tabIds = [...configuredTabs.matchAll(/\{id: "([^"]+)"/g)].map((match) => match[1]);
    expect(tabIds).toEqual(["skills", "abilities", "combat", "inventory", "advancement", "notes", "settings"]);
  });

  it("keeps persisted rich Notes on the Character sheet", () => {
    expect(characterTemplate).toContain('data-tab="notes"');
    expect(characterTemplate).toContain('name="system.notes"');
    expect(characterTemplate).toContain('elementType="prose-mirror"');
    expect(characterSheet).toContain("enriched: {notes: enrichedNotes}");
  });

  it("keeps the normal NPC sheet to its compact baseline and one native Notes editor", () => {
    expect(npcTemplate).not.toContain("CYPHERV2.Phase1");
    for (const field of [
      "system.level",
      "system.armor",
      "system.health.value",
      "system.health.baseMax"
    ]) expect(npcTemplate).toContain(`name="${field}"`);
    expect(npcTemplate).toContain('name="system.notes"');
    expect(npcTemplate).toContain('elementType="prose-mirror"');
    expect(npcTemplate).not.toContain('name="system.description"');
    expect(npcTemplate).not.toContain("npc-combat-panel");
    expect(npcTemplate).not.toContain("npc-modifications-panel");
    expect(npcTemplate).not.toContain('name="system.damage.amount"');
    expect(npcTemplate).not.toContain('name="system.armorBase"');
    expect(npcTemplate).not.toContain("system.movement.");
    expect(npcSheet).toContain("systemFields: documentSystemFields(this.actor)");
  });

  it("delegates explicit rich-text editing to the native toggled Application V2 control", () => {
    for (const template of [characterTemplate, npcTemplate, itemTemplate]) {
      expect(template).toContain("toggled=true");
      expect(template).toContain("disabled=(not editable)");
      expect(template).not.toContain("{{editor ");
    }
    for (const sheet of [characterSheet, npcSheet]) {
      expect(sheet).not.toContain("TextEditor.implementation.create");
      expect(sheet).not.toContain("ProseMirrorDescriptionController");
    }
  });

  it("scopes shared dialog and Chat skins to system-owned content", () => {
    expect(dialogStyles).toContain(".application.dialog:has(.cypherv2-dialog, .cypherv2-dialog-fields)");
    expect(chatStyles).toContain(".chat-message:has(.cypherv2-chat-card)");
    expect(chatStyles).toContain(".cypherv2-chat-watermark");
    expect(chatStyles).toContain("var(--cypherv2-accent)");
  });

  it("declares the Foundry v14 setup media asset", () => {
    expect(manifest.media).toContainEqual({
      type: "setup",
      url: "systems/cypherv2/assets/cypher2meta.jpg",
      thumbnail: "systems/cypherv2/assets/cypher2meta.jpg"
    });
  });
});

describe("Chat card actor watermark", () => {
  it("prefers the directly attached synthetic Token image", () => {
    expect(chatCardActorImage({
      img: "actor.webp",
      token: {texture: {src: "synthetic-token.webp"}}
    })).toBe("synthetic-token.webp");
  });

  it("falls back to the acting Actor image and omits an unavailable image", () => {
    expect(chatCardActorImage({img: "actor.webp"})).toBe("actor.webp");
    expect(chatCardActorImageData({img: ""})).toEqual({});
    expect(chatCardActorImageData(undefined)).toEqual({});
  });

  it("derives an optional safe Character accent without changing the fallback", () => {
    expect(chatCardActorImageData({
      img: "actor.webp",
      system: {appearance: {color: "#00ffff"}}
    })).toMatchObject({
      actorImage: "actor.webp",
      chatCardStyle: expect.stringContaining("--cypherv2-chat-accent: #00ffff")
    });
    expect(chatCardActorImageData({img: "actor.webp"})).not.toHaveProperty("chatCardStyle");
  });

  it("uses one card root and watermark slot in every system Chat template", () => {
    for (const template of [
      "ability-card.hbs",
      "ability-payment-card.hbs",
      "defense-request-card.hbs",
      "depletion-card.hbs",
      "gm-intrusion-card.hbs",
      "item-card.hbs",
      "item-formula-roll-card.hbs",
      "roll-audit-card.hbs",
      "roll-card.hbs"
    ]) {
      const source = readFileSync(`templates/chat/${template}`, "utf8");
      expect(source).toContain("cypherv2-chat-card");
      expect(source).toContain('{{#if actorImage}}<img class="cypherv2-chat-watermark"');
    }
  });

  it("sizes the shared watermark as a large bottom-right faded portrait", () => {
    expect(chatStyles).toMatch(/\.cypherv2-chat-watermark[\s\S]*right: 0/);
    expect(chatStyles).toMatch(/\.cypherv2-chat-watermark[\s\S]*bottom: 0/);
    expect(chatStyles).toMatch(/\.cypherv2-chat-watermark[\s\S]*width: 68%/);
    expect(chatStyles).toMatch(/\.cypherv2-chat-watermark[\s\S]*height: 82%/);
    expect(chatStyles).toMatch(/\.cypherv2-chat-watermark[\s\S]*mask-image: radial-gradient/);
  });
});
