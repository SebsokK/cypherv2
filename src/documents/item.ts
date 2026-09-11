import {preservePoolDeficit} from "../packages/package-derived";
import {POOL_KEYS, type PoolKey} from "../rules/core/core-types";
import {itemDefaultIcon} from "../config/system-assets";

function changesPoolBonus(changes: Record<string, unknown>): boolean {
  return Object.keys(changes).some((path) => (
    path === "system.poolBonuses"
    || path.startsWith("system.poolBonuses.")
    || path === "system.poolBonusChoiceGroups"
    || path.startsWith("system.poolBonusChoiceGroups.")
    || path === "system.instance.selections.poolChoices"
    || path.startsWith("system.instance.selections.poolChoices.")
    || path === "system.instance.selections.superheroicsPool"
    || path === "system.superhero.superheroics.poolBonus"
    || (path === "system" && typeof changes.system === "object" && changes.system !== null
      && (
        "poolBonuses" in changes.system
        || "poolBonusChoiceGroups" in changes.system
        || "superhero" in changes.system
        || (
          "instance" in changes.system
          && typeof changes.system.instance === "object"
          && changes.system.instance !== null
          && "selections" in changes.system.instance
          && typeof changes.system.instance.selections === "object"
          && changes.system.instance.selections !== null
          && (
            "poolChoices" in changes.system.instance.selections
            || "superheroicsPool" in changes.system.instance.selections
          )
        )
      ))
  ));
}

function equipsItem(changes: Record<string, unknown>): boolean {
  if (changes["system.equipped"] === true) return true;
  const system = changes.system;
  return Boolean(system && typeof system === "object" && (system as {equipped?: unknown}).equipped === true);
}

export class CypherV2Item extends Item {
  static override getDefaultArtwork(data: Record<string, unknown>): {img: string} {
    const icon = itemDefaultIcon(String(data.type ?? ""));
    return icon ? {img: icon} : super.getDefaultArtwork(data);
  }

  override async update(changes: Record<string, unknown>, options: Record<string, unknown> = {}): Promise<unknown> {
    const character = this.actor?.type === "character" ? this.actor : null;
    const preserve = character
      && (this.type === "characterType" || this.type === "descriptor" || this.type === "species")
      && changesPoolBonus(changes);
    const oldMax = preserve ? Object.fromEntries(POOL_KEYS.map((pool) => [
      pool,
      Number((character.system as any).derived.pools[pool].max)
    ])) as Record<PoolKey, number> : null;
    const oldValues = preserve ? Object.fromEntries(POOL_KEYS.map((pool) => [
      pool,
      Number((character.system as any).stats[pool].value)
    ])) as Record<PoolKey, number> : null;
    const result = await super.update(changes, options);
    if (
      character
      && (this.type === "shield" || this.type === "armor")
      && equipsItem(changes)
      && options.cypherv2CombatEquipmentSync !== true
      && options.cypherv2ShieldEquipmentSync !== true
    ) {
      for (const item of character.items) {
        if (item.id === this.id || item.type !== this.type) continue;
        if ((item.system as {equipped?: boolean}).equipped) {
          await item.update(
            {"system.equipped": false},
            {cypherv2CombatEquipmentSync: true}
          );
        }
      }
    }
    if (character && oldMax && oldValues) {
      const poolChanges: Record<string, unknown> = {};
      for (const pool of POOL_KEYS) {
        const newMax = Number((character.system as any).derived.pools[pool].max);
        poolChanges[`system.stats.${pool}.value`] = preservePoolDeficit(oldValues[pool], oldMax[pool], newMax);
      }
      await character.update(poolChanges, {cypherv2PackagePoolSync: true});
    }
    return result;
  }
}
