import {readFileSync} from "node:fs";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {ItemChatService, itemChatProperties} from "../../src/services/item-chat-service";

function item(type: string, system: Record<string, unknown>): Item {
  return {
    id: `${type}-id`,
    uuid: `Actor.actor.Item.${type}-id`,
    name: `Test ${type}`,
    type,
    system,
    _source: {system},
    actor: null
  } as unknown as Item;
}

describe("Item Send to Chat", () => {
  const renderTemplate = vi.fn(async (_path: string, data: Record<string, unknown>) => JSON.stringify(data));
  const create = vi.fn(async () => undefined);

  beforeEach(() => {
    renderTemplate.mockClear();
    create.mockClear();
    vi.stubGlobal("game", {i18n: {
      localize: (key: string) => key,
      format: (key: string, data: Record<string, unknown>) => `${key}:${JSON.stringify(data)}`
    }});
    vi.stubGlobal("foundry", {applications: {
      handlebars: {renderTemplate},
      ux: {TextEditor: {implementation: {enrichHTML: vi.fn(async (html: string) => `<enriched>${html}</enriched>`)}}}
    }});
    vi.stubGlobal("ChatMessage", class {
      static getSpeaker() { return {}; }
      static create = create;
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it.each([
    ["equipment", {quantity: 2, description: "<p>@UUID[Item.rope]</p>"}],
    ["cypher", {manifestation: "subtle", power: "advanced", form: "injector", description: "<p>Cypher</p>"}],
    ["artifact", {level: "1d6+2", depleted: false, depletion: {enabled: true, formula: "1d100", threshold: 1}, description: "<p>Artifact</p>"}],
    ["ability", {activation: "action", pool: "might", cost: {amount: 2, ignoresEdge: false, allowedPools: ["might"]}, roll: "task", damage: 0, woundSeverity: "none", range: "", description: "<p>Ability</p>"}],
    ["weapon", {category: "medium", attackType: "ranged", rangeCategory: "long", baseDamage: 5, description: "<p>Weapon</p>"}],
    ["shield", {equipped: true, wounds: {minor: [], moderate: [], major: []}, derived: {capacities: {minor: 3, moderate: 2, major: 1}, broken: false}, description: "<p>Shield</p>"}],
    ["armor", {category: "light", equipped: true, description: "<p>Armor</p>"}]
  ])("publishes an enriched %s card without executing the Item", async (type, system) => {
    await new ItemChatService().publish(item(type, system));
    expect(renderTemplate).toHaveBeenCalledWith(
      "systems/cypherv2/templates/chat/item-card.hbs",
      expect.objectContaining({itemName: `Test ${type}`, enrichedDescription: expect.stringContaining("<enriched>")})
    );
    expect(create).toHaveBeenCalledOnce();
  });

  it("shows Cypher Power instead of relying on its legacy Level", () => {
    const properties = itemChatProperties(item("cypher", {
      manifestation: "manifest",
      power: "ultra",
      level: 1,
      levelOverride: false
    }));
    expect(properties).toEqual(expect.arrayContaining([
      {label: "CYPHERV2.Cypher.Power.Label", value: "CYPHERV2.Cypher.Power.ultra"},
      {label: "CYPHERV2.Inventory.Level", value: 6}
    ]));
  });

  it("exposes Roll Depletion only on a usable configured Artifact card", async () => {
    const service = new ItemChatService();
    await service.publish(item("artifact", {level: "6", depleted: false, depletion: {enabled: true, formula: "1d100", threshold: 1}}));
    expect(renderTemplate).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({canRollDepletion: true}));
    await service.publish(item("artifact", {level: "6", depleted: true, depletion: {enabled: true, formula: "1d100", threshold: 1}}));
    expect(renderTemplate).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({canRollDepletion: false, depleted: true}));
  });

  it("uses compact existing Combat mechanics on Weapon, Shield, and Armor cards", () => {
    expect(itemChatProperties(item("weapon", {
      category: "medium", attackType: "ranged", rangeCategory: "long", baseDamage: 5
    }))).toEqual([
      {label: "CYPHERV2.Combat.Category", value: "CYPHERV2.Combat.Weapon.Category.medium"},
      {label: "CYPHERV2.Combat.Damage", value: 5},
      {label: "CYPHERV2.Combat.Weapon.AttackType.Label", value: "CYPHERV2.Combat.Weapon.AttackType.ranged"},
      {label: "CYPHERV2.Combat.Range.Label", value: "CYPHERV2.Combat.Range.long"}
    ]);
    expect(itemChatProperties(item("shield", {
      equipped: true,
      wounds: {minor: [{}], moderate: [], major: []},
      derived: {capacities: {minor: 3, moderate: 2, major: 1}, broken: false}
    }))).toEqual(expect.arrayContaining([
      {label: "CYPHERV2.Shield.Status", value: "CYPHERV2.Shield.Functional"},
      {label: "CYPHERV2.Shield.WoundTrack", value: "1/3 · 0/2 · 0/1"}
    ]));
    expect(itemChatProperties(item("armor", {category: "heavy", equipped: false})))
      .toContainEqual({label: "CYPHERV2.Combat.Category", value: "CYPHERV2.Combat.Armor.Category.heavy"});
  });

  it("omits genuinely empty optional properties before rendering", () => {
    const properties = itemChatProperties(item("ability", {
      activation: "action",
      pool: "none",
      cost: {amount: 0, ignoresEdge: false, allowedPools: []},
      roll: "none",
      damage: 0,
      woundSeverity: "none",
      range: ""
    }));
    expect(properties.some(({label, value}) => !label.trim() || (typeof value === "string" && !value.trim()))).toBe(false);
    expect(properties.map(({label}) => label)).not.toContain("CYPHERV2.Combat.Range.Label");
  });

  it("keeps Ability Send to Chat descriptive with only a natural cost reference", () => {
    const properties = itemChatProperties(item("ability", {
      activation: "reaction",
      pool: "choose",
      cost: {amount: 3, ignoresEdge: false, allowedPools: ["might", "speed", "intellect"]},
      roll: "attack",
      damage: 9,
      woundSeverity: "major",
      range: "long"
    }));
    expect(properties).toEqual([{
      label: "CYPHERV2.Ability.Cost",
      value: "3 CYPHERV2.Pools.MightCYPHERV2.Ability.CostDisplay.SeparatorCYPHERV2.Pools.SpeedCYPHERV2.Ability.CostDisplay.FinalOrCYPHERV2.Pools.Intellect"
    }]);
    expect(properties.map(({label}) => label)).not.toContain("CYPHERV2.Ability.Roll.Label");
    expect(itemChatProperties(item("ability", {
      cost: {amount: 0, ignoresEdge: false, allowedPools: []}, pool: "none"
    }))).toEqual([]);
  });

  it("renders every supported Item family through the common readable card structure", () => {
    const template = readFileSync("templates/chat/item-card.hbs", "utf8");
    const styles = readFileSync("styles/components/_roll-card.scss", "utf8");
    expect(template).toContain("cypherv2-chat-card");
    expect(template).toContain('class="item-card-properties"');
    expect(styles).toMatch(/\.item-card-properties[\s\S]*dt[\s\S]*var\(--cypherv2-text-muted\)/);
    expect(styles).toMatch(/\.item-card-properties[\s\S]*dd[\s\S]*var\(--cypherv2-text-primary\)/);
  });

  it("uses an embedded Actor watermark and leaves a world Item card unwatermarked", async () => {
    const embedded = item("weapon", {category: "light", attackType: "melee", rangeCategory: "immediate", baseDamage: 2});
    Object.assign(embedded, {actor: {img: "actor.webp", token: {texture: {src: "token.webp"}}}});
    await new ItemChatService().publish(embedded);
    expect(renderTemplate).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({actorImage: "token.webp"}));

    await new ItemChatService().publish(item("weapon", {category: "light", attackType: "melee", rangeCategory: "immediate", baseDamage: 2}));
    const worldContext = renderTemplate.mock.calls.at(-1)?.[1] as Record<string, unknown>;
    expect(worldContext).not.toHaveProperty("actorImage");
  });
});
