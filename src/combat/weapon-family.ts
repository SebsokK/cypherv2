/** Built-in suggestions only; Weapon families remain open-ended data. */
export const BUILT_IN_WEAPON_FAMILIES = ["axes", "knives", "swords"] as const;

/** Normalize a user-facing family label into the identifier used by Items and Characters. */
export function normalizeWeaponFamily(value: unknown): string {
  const normalized = String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return normalized === "none" ? "" : normalized;
}

export function normalizeWeaponFamilies(values: unknown): string[] {
  const entries = Array.isArray(values) ? values : typeof values === "string" ? values.split(/[,;\n]/) : [];
  return [...new Set(entries.map(normalizeWeaponFamily).filter(Boolean))];
}

export function weaponFamilyLabel(value: unknown): string {
  return normalizeWeaponFamily(value)
    .split("-")
    .filter(Boolean)
    .map((part) => `${part[0]?.toLocaleUpperCase("en-US") ?? ""}${part.slice(1)}`)
    .join(" ");
}

export function legacyWeaponFamilyFlags(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return normalizeWeaponFamilies(Object.entries(value as Record<string, unknown>)
    .filter(([, enabled]) => enabled === true)
    .map(([family]) => family));
}
