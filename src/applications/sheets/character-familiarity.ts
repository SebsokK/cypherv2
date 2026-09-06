import {
  ARMOR_CATEGORIES,
  WEAPON_CATEGORIES,
  type ArmorCategory,
  type WeaponCategory
} from "../../constants/system";

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
      readonly armorCategories: readonly string[];
    };
  };
  update(changes: Record<string, unknown>): Promise<unknown>;
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
