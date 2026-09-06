import {existsSync, readFileSync} from "node:fs";

import {describe, expect, it} from "vitest";

import {ACTOR_TYPES, ITEM_TYPES} from "../../src/constants/system";
import {
  ACTOR_DEFAULT_ICONS,
  ITEM_DEFAULT_ICONS,
  actorDefaultIcon,
  hasExplicitPrototypeActorLink,
  itemDefaultIcon,
  shouldDefaultPrototypeActorLink
} from "../../src/config/system-assets";

const actorDocumentSource = readFileSync("src/documents/actor.ts", "utf8");
const itemDocumentSource = readFileSync("src/documents/item.ts", "utf8");

describe("new document defaults", () => {
  it("maps every supported Actor type to its packaged default icon", () => {
    expect(ACTOR_DEFAULT_ICONS).toEqual({
      character: "systems/cypherv2/assets/icons/cypherpc.png",
      npc: "systems/cypherv2/assets/icons/cyphernpc.png"
    });
    for (const type of ACTOR_TYPES) {
      expect(actorDefaultIcon(type)).toBe(ACTOR_DEFAULT_ICONS[type]);
      expect(existsSync(ACTOR_DEFAULT_ICONS[type].replace("systems/cypherv2/", ""))).toBe(true);
    }
    expect(actorDefaultIcon("unsupported")).toBeNull();
  });

  it("maps every actual Item type id to its packaged default icon", () => {
    expect(Object.keys(ITEM_DEFAULT_ICONS).sort()).toEqual([...ITEM_TYPES].sort());
    expect(ITEM_DEFAULT_ICONS.characterType).toBe("systems/cypherv2/assets/icons/cyphertype.png");
    expect(ITEM_DEFAULT_ICONS.artifact).toBe("systems/cypherv2/assets/icons/cypherartefact.png");
    expect(ITEM_DEFAULT_ICONS.weapon).toBe("systems/cypherv2/assets/icons/cypherweapons.png");
    for (const type of ITEM_TYPES) {
      expect(itemDefaultIcon(type)).toBe(ITEM_DEFAULT_ICONS[type]);
      expect(existsSync(ITEM_DEFAULT_ICONS[type].replace("systems/cypherv2/", ""))).toBe(true);
    }
    expect(itemDefaultIcon("unsupported")).toBeNull();
  });

  it("uses Foundry getDefaultArtwork so explicit creation artwork remains authoritative", () => {
    expect(actorDocumentSource).toContain("static override getDefaultArtwork");
    expect(itemDocumentSource).toContain("static override getDefaultArtwork");
    expect(actorDocumentSource).toContain("super.getDefaultArtwork(data)");
    expect(itemDocumentSource).toContain("super.getDefaultArtwork(data)");
    expect(actorDocumentSource).not.toMatch(/override async update\([^)]*img/);
    expect(itemDocumentSource).not.toMatch(/changes\.img\s*=/);
  });

  it("defaults only a new Character with no explicit actorLink choice to linked", () => {
    expect(hasExplicitPrototypeActorLink({type: "character"})).toBe(false);
    expect(hasExplicitPrototypeActorLink({prototypeToken: {actorLink: false}})).toBe(true);
    expect(hasExplicitPrototypeActorLink({prototypeToken: {actorLink: true}})).toBe(true);
    expect(hasExplicitPrototypeActorLink({"prototypeToken.actorLink": false})).toBe(true);
    expect(shouldDefaultPrototypeActorLink("character", {type: "character"})).toBe(true);
    expect(shouldDefaultPrototypeActorLink("character", {prototypeToken: {actorLink: false}})).toBe(false);
    expect(shouldDefaultPrototypeActorLink("npc", {type: "npc"})).toBe(false);
    expect(actorDocumentSource).toContain("shouldDefaultPrototypeActorLink(this.type, data)");
    expect(actorDocumentSource).toContain("this.prototypeToken.updateSource({actorLink: true})");
  });

  it("does not contain an existing-document migration or sheet-render mutation", () => {
    expect(actorDocumentSource).toContain("override async _preCreate");
    expect(actorDocumentSource).not.toContain("_preUpdate");
    expect(actorDocumentSource).not.toContain("_onRender");
    expect(actorDocumentSource).not.toContain("Hooks.on");
  });
});
