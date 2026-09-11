import {
  ARMOR_CATEGORIES,
  WEAPON_CATEGORIES,
  type ArmorCategory,
  type WeaponCategory
} from "../../constants/system";
import {
  BUILT_IN_WEAPON_FAMILIES,
  normalizeWeaponFamilies,
  normalizeWeaponFamily,
  weaponFamilyLabel
} from "../../combat/weapon-family";

export type FamiliarityFamily = "weapon" | "armor";
export type FamiliarityCategory = WeaponCategory | ArmorCategory;

export interface FamiliarityActorLike {
  readonly system: {
    readonly stats: {
      readonly might: {readonly value: number};
      readonly speed: {readonly value: number};
      readonly intellect: {readonly value: number};
    };
    readonly proficiencies: {
      readonly weaponCategories: readonly string[];
      readonly weaponFamilies: readonly string[];
      readonly armorCategories: readonly string[];
    };
  };
  update(changes: Record<string, unknown>): Promise<unknown>;
}

export async function addManualWeaponFamily(actor: FamiliarityActorLike, value: unknown): Promise<string[]> {
  const family = normalizeWeaponFamily(value);
  if (!family) throw new Error("Weapon family must not be blank.");
  const next = normalizeWeaponFamilies([...actor.system.proficiencies.weaponFamilies, family]);
  await actor.update({"system.proficiencies.weaponFamilies": next});
  return next;
}

export async function removeManualWeaponFamily(actor: FamiliarityActorLike, value: unknown): Promise<string[]> {
  const family = normalizeWeaponFamily(value);
  const next = normalizeWeaponFamilies(actor.system.proficiencies.weaponFamilies)
    .filter((entry) => entry !== family);
  await actor.update({"system.proficiencies.weaponFamilies": next});
  return next;
}

export async function promptAddManualWeaponFamily(actor: FamiliarityActorLike): Promise<void> {
  const data = await foundry.applications.api.DialogV2.input({
    window: {title: game.i18n.localize("CYPHERV2.Settings.Character.AddWeaponFamily")},
    content: `<div class="cypherv2 cypherv2-dialog"><label class="cypherv2-dialog-field">${game.i18n.localize("CYPHERV2.Settings.Character.WeaponFamily")}
      <input name="family" type="text" list="cypherv2-character-weapon-families" required autofocus>
      <datalist id="cypherv2-character-weapon-families">${BUILT_IN_WEAPON_FAMILIES.map((family) => `<option value="${weaponFamilyLabel(family)}"></option>`).join("")}</datalist>
    </label></div>`,
    rejectClose: false,
    ok: {label: game.i18n.localize("CYPHERV2.Actions.Add")}
  }) as Record<string, unknown> | null;
  if (data) await addManualWeaponFamily(actor, data.family);
}

export function parseFamiliarityActionData(
  dataset: Readonly<Record<string, string | undefined>> | DOMStringMap
): {family: FamiliarityFamily; category: FamiliarityCategory} {
  const family = dataset.family;
  const category = dataset.category;
  if (family !== "weapon" && family !== "armor") throw new Error("Invalid familiarity action data.");
  const supported: readonly string[] = family === "weapon" ? WEAPON_CATEGORIES : ARMOR_CATEGORIES;
  if (!category || !supported.includes(category)) throw new Error("Invalid familiarity action data.");
  return {family, category: category as FamiliarityCategory};
}

export function toggledFamiliarityCategories(
  current: readonly string[],
  category: FamiliarityCategory
): FamiliarityCategory[] {
  const valid = new Set([...WEAPON_CATEGORIES, ...ARMOR_CATEGORIES]);
  const next = new Set(current.filter((entry): entry is FamiliarityCategory => valid.has(entry as FamiliarityCategory)));
  if (next.has(category)) next.delete(category);
  else next.add(category);
  return [...next];
}

export async function toggleManualFamiliarity(
  actor: FamiliarityActorLike,
  family: FamiliarityFamily,
  category: FamiliarityCategory
): Promise<readonly FamiliarityCategory[]> {
  const key = family === "weapon" ? "weaponCategories" : "armorCategories";
  const next = toggledFamiliarityCategories(actor.system.proficiencies[key], category);
  await actor.update({[`system.proficiencies.${key}`]: next});
  return next;
}
