import {abilityAllowedPools, formatAbilityCost} from "../abilities/ability-cost";
import type {AbilityItemLike} from "../abilities/ability-types";
import {artifactLevelFormula} from "../artifacts/artifact-rules";
import type {ArtifactLevelRollResult} from "../artifacts/artifact-types";
import {cypherLevel, normalizeCypherManifestation, normalizeCypherPower} from "../cyphers/cypher-rules";
import {chatCardActorImageData} from "./chat-card-presentation";

interface ItemProperty {
  readonly label: string;
  readonly value: string | number;
}

function poolLabel(pool: string): string {
  return game.i18n.localize(`CYPHERV2.Pools.${pool[0]!.toUpperCase()}${pool.slice(1)}`);
}

function sourceDescription(item: Item): string {
  const description = item._source?.system?.description;
  return typeof description === "string" ? description : "";
}

function rawItemChatProperties(item: Item): ItemProperty[] {
  const system = item.system as Record<string, unknown>;
  if (item.type === "equipment") {
    return [
      {label: game.i18n.localize("CYPHERV2.Inventory.Quantity"), value: Number(system.quantity ?? 1)},
      ...(Number(system.level) > 0 ? [{label: game.i18n.localize("CYPHERV2.Inventory.Level"), value: Number(system.level)}] : []),
      ...(system.equipped === true ? [{label: game.i18n.localize("CYPHERV2.Combat.Equipped"), value: game.i18n.localize("CYPHERV2.Common.Yes")}] : [])
    ];
  }
  if (item.type === "cypher") {
    const manifestation = normalizeCypherManifestation(system.manifestation);
    const power = normalizeCypherPower(system.power);
    return [
      {label: game.i18n.localize("CYPHERV2.Cypher.Manifestation.Label"), value: game.i18n.localize(`CYPHERV2.Cypher.Manifestation.${manifestation}`)},
      ...(String(system.form ?? "").trim() ? [{label: game.i18n.localize("CYPHERV2.Cypher.Form"), value: String(system.form)}] : []),
      {label: game.i18n.localize("CYPHERV2.Cypher.Power.Label"), value: game.i18n.localize(`CYPHERV2.Cypher.Power.${power}`)},
      {label: game.i18n.localize("CYPHERV2.Inventory.Level"), value: cypherLevel(system)}
    ];
  }
  if (item.type === "artifact") {
    const depletion = system.depletion as Record<string, unknown> | undefined;
    return [
      {label: game.i18n.localize("CYPHERV2.Inventory.Level"), value: artifactLevelFormula(system)},
      ...(depletion?.enabled === true ? [{
        label: game.i18n.localize("CYPHERV2.Inventory.Depletion"),
        value: String(depletion.formula || `1${String(depletion.die ?? "d6")}`)
      }] : []),
      ...(system.depleted === true ? [{label: game.i18n.localize("CYPHERV2.Artifact.Depleted"), value: game.i18n.localize("CYPHERV2.Common.Yes")}] : [])
    ];
  }
  if (item.type === "weapon") {
    const category = String(system.category ?? "medium");
    const attackType = String(system.attackType ?? "melee");
    const range = String(system.rangeCategory ?? "immediate");
    return [
      {label: game.i18n.localize("CYPHERV2.Combat.Category"), value: game.i18n.localize(`CYPHERV2.Combat.Weapon.Category.${category}`)},
      {label: game.i18n.localize("CYPHERV2.Combat.Damage"), value: Number(system.baseDamage ?? 0)},
      {label: game.i18n.localize("CYPHERV2.Combat.Weapon.AttackType.Label"), value: game.i18n.localize(`CYPHERV2.Combat.Weapon.AttackType.${attackType}`)},
      {label: game.i18n.localize("CYPHERV2.Combat.Range.Label"), value: game.i18n.localize(`CYPHERV2.Combat.Range.${range}`)}
    ];
  }
  if (item.type === "shield") {
    const wounds = system.wounds as Record<string, unknown[]> | undefined;
    const derived = system.derived as Record<string, unknown> | undefined;
    const capacities = derived?.capacities as Record<string, number> | undefined;
    const broken = derived?.broken === true;
    return [
      {label: game.i18n.localize("CYPHERV2.Shield.Status"), value: game.i18n.localize(broken ? "CYPHERV2.Shield.Broken" : "CYPHERV2.Shield.Functional")},
      {label: game.i18n.localize("CYPHERV2.Combat.Equipped"), value: game.i18n.localize(system.equipped === true ? "CYPHERV2.Common.Yes" : "CYPHERV2.Common.No")},
      {label: game.i18n.localize("CYPHERV2.Shield.WoundTrack"), value: ["minor", "moderate", "major"].map((severity) => `${wounds?.[severity]?.length ?? 0}/${capacities?.[severity] ?? 0}`).join(" · ")}
    ];
  }
  if (item.type === "armor") {
    const category = String(system.category ?? "light");
    return [
      {label: game.i18n.localize("CYPHERV2.Combat.Category"), value: game.i18n.localize(`CYPHERV2.Combat.Armor.Category.${category}`)},
      {label: game.i18n.localize("CYPHERV2.Combat.Equipped"), value: game.i18n.localize(system.equipped === true ? "CYPHERV2.Common.Yes" : "CYPHERV2.Common.No")}
    ];
  }
  if (item.type === "ability") {
    const ability = item as unknown as AbilityItemLike;
    const pools = abilityAllowedPools(ability);
    const cost = formatAbilityCost(ability.system.cost.amount, pools, poolLabel, {
      pair: game.i18n.localize("CYPHERV2.Ability.CostDisplay.Or"),
      middle: game.i18n.localize("CYPHERV2.Ability.CostDisplay.Separator"),
      final: game.i18n.localize("CYPHERV2.Ability.CostDisplay.FinalOr")
    }, ability.system.cost.scalable === true);
    return cost ? [{label: game.i18n.localize("CYPHERV2.Ability.Cost"), value: cost}] : [];
  }
  return [];
}

/** Keep Chat-card mechanics compact and never render an empty label/value pair. */
export function itemChatProperties(item: Item): ItemProperty[] {
  return rawItemChatProperties(item).filter(({label, value}) =>
    label.trim().length > 0
    && (typeof value === "number" || value.trim().length > 0)
  );
}

export class ItemChatService {
  async publish(item: Item): Promise<void> {
    const system = item.system as Record<string, unknown>;
    const description = sourceDescription(item);
    const enrichedDescription = description
      ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(description, {
        async: true,
        relativeTo: item
      })
      : "";
    const depletion = system.depletion as Record<string, unknown> | undefined;
    const content = await foundry.applications.handlebars.renderTemplate(
      "systems/cypherv2/templates/chat/item-card.hbs",
      {
        itemName: item.name,
        ...chatCardActorImageData(item.actor),
        itemType: game.i18n.localize(`TYPES.Item.${item.type}`),
        properties: itemChatProperties(item),
        enrichedDescription,
        hasDescription: Boolean(description.trim()),
        canRollDepletion: item.type === "artifact" && depletion?.enabled === true && system.depleted !== true,
        itemUuid: item.uuid,
        depleted: system.depleted === true
      }
    );
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker(item.actor ? {actor: item.actor} : undefined),
      content
    });
  }

  async publishArtifactLevelRoll(item: Item, result: ArtifactLevelRollResult): Promise<void> {
    const content = await foundry.applications.handlebars.renderTemplate(
      "systems/cypherv2/templates/chat/item-formula-roll-card.hbs",
      {
        itemName: result.itemName,
        ...chatCardActorImageData(item.actor),
        label: game.i18n.localize("CYPHERV2.Artifact.LevelRoll"),
        formula: result.formula,
        total: result.total
      }
    );
    const message: Record<string, unknown> = {
      speaker: ChatMessage.getSpeaker(item.actor ? {actor: item.actor} : undefined),
      content
    };
    if (result.chatRoll !== undefined) message.rolls = [result.chatRoll];
    await ChatMessage.create(message);
  }
}
