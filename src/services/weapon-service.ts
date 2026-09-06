import type {WeaponItemLike} from "../combat/combat-types";

export interface WeaponAmmunitionStatus {
  readonly tracked: boolean;
  readonly current: number;
  readonly maximum: number;
  readonly perAttack: number;
  readonly canAttack: boolean;
}

function whole(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0) throw new Error(`${label} must be a non-negative whole number.`);
  return value;
}

export class WeaponService {
  ammunition(weapon: WeaponItemLike): WeaponAmmunitionStatus {
    const tracked = weapon.system.ammo.enabled;
    const current = whole(weapon.system.ammo.value, "Current ammunition");
    const maximum = whole(weapon.system.ammo.max, "Maximum ammunition");
    const perAttack = whole(weapon.system.ammo.perAttack, "Ammunition per attack");
    return {tracked, current, maximum, perAttack, canAttack: !tracked || current >= perAttack};
  }

  assertCanAttack(weapon: WeaponItemLike): void {
    if (!this.ammunition(weapon).canAttack) throw new Error("Insufficient Ammunition — Reload Weapon");
  }

  async consumeAttack(weapon: WeaponItemLike): Promise<{previous: number; current: number; spent: number} | null> {
    const ammo = this.ammunition(weapon);
    if (!ammo.tracked) return null;
    this.assertCanAttack(weapon);
    if (!weapon.update) throw new Error("Weapon ammunition requires an updateable Item document.");
    const current = Math.max(0, ammo.current - ammo.perAttack);
    await weapon.update({"system.ammo.value": current}, {cypherv2WeaponUse: true});
    return {previous: ammo.current, current, spent: ammo.current - current};
  }

  async reload(weapon: WeaponItemLike): Promise<void> {
    const ammo = this.ammunition(weapon);
    if (!ammo.tracked) throw new Error("Ammunition tracking is not enabled for this Weapon.");
    if (!weapon.update) throw new Error("Weapon ammunition requires an updateable Item document.");
    await weapon.update({"system.ammo.value": ammo.maximum}, {cypherv2WeaponReload: true});
  }
}
