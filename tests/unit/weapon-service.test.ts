import {describe, expect, it, vi} from "vitest";
import type {WeaponItemLike} from "../../src/combat/combat-types";
import {WeaponService} from "../../src/services/weapon-service";

function weapon(ammo: WeaponItemLike["system"]["ammo"]): WeaponItemLike {
  let item!: WeaponItemLike;
  const update = vi.fn(async (changes: Record<string, unknown>) => {
    if (typeof changes["system.ammo.value"] === "number") {
      (item.system.ammo as {value: number}).value = changes["system.ammo.value"] as number;
    }
  });
  item = {
    id: "weapon-1", name: "Glock 17", type: "weapon", update,
    system: {
      category: "medium", attackType: "ranged", rangeCategory: "long", rangeNotes: "",
      damageOverride: null, baseDamage: 4, attackModifier: 0, bonusDamage: 0,
      freelyUsed: false, equipped: false, description: "", ammo,
      depletion: {enabled: false, die: "d6", threshold: 1}, depleted: false
    }
  };
  return item;
}

describe("WeaponService ammunition", () => {
  it("allows untracked or sufficiently supplied Weapons and rejects insufficient ammunition", () => {
    const service = new WeaponService();
    expect(service.ammunition(weapon({enabled: false, value: 0, max: 0, perAttack: 2})).canAttack).toBe(true);
    expect(service.ammunition(weapon({enabled: true, value: 2, max: 12, perAttack: 2})).canAttack).toBe(true);
    expect(service.ammunition(weapon({enabled: true, value: 1, max: 12, perAttack: 2})).canAttack).toBe(false);
  });

  it("reloads Current to Maximum without changing other ammunition fields", async () => {
    const service = new WeaponService();
    const item = weapon({enabled: true, value: 1, max: 12, perAttack: 2});
    await service.reload(item);
    expect(item.system.ammo).toEqual({enabled: true, value: 12, max: 12, perAttack: 2});
    expect(item.update).toHaveBeenCalledWith({"system.ammo.value": 12}, {cypherv2WeaponReload: true});
  });
});
