export const CHARACTER_HEADER_BACKGROUND_MODES = ["theme", "portrait", "custom"] as const;

export type CharacterHeaderBackgroundMode = (typeof CHARACTER_HEADER_BACKGROUND_MODES)[number];

export interface CharacterAppearanceData {
  readonly backgroundMode: CharacterHeaderBackgroundMode;
  readonly customImage: string;
  readonly color: string;
}

export interface ResolvedCharacterAppearance extends CharacterAppearanceData {
  readonly backgroundImage: string;
  readonly hasBackgroundImage: boolean;
  readonly hasCharacterColor: boolean;
  readonly accent: string | null;
  readonly tint: string | null;
  readonly colorInput: string;
  readonly isTheme: boolean;
  readonly isPortrait: boolean;
  readonly isCustom: boolean;
  readonly style: string;
}

const DEFAULT_COLOR_INPUT = "#96082a";
const TINT_BASE = {r: 23, g: 24, b: 27} as const;

export type FoundryAssetRouteResolver = (path: string) => string;

function normalizeHex(value: string): string | null {
  const match = value.trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if (!match) return null;
  const hex = match[1]!.length === 3
    ? [...match[1]!].map((digit) => `${digit}${digit}`).join("")
    : match[1]!;
  return `#${hex.toLocaleLowerCase("en-US")}`;
}

function rgb(hex: string): {r: number; g: number; b: number} {
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16)
  };
}

function hex({r, g, b}: {r: number; g: number; b: number}): string {
  return `#${[r, g, b].map((channel) => (
    Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0")
  )).join("")}`;
}

function mix(
  foreground: {r: number; g: number; b: number},
  background: {r: number; g: number; b: number},
  foregroundWeight: number
): {r: number; g: number; b: number} {
  const backgroundWeight = 1 - foregroundWeight;
  return {
    r: (foreground.r * foregroundWeight) + (background.r * backgroundWeight),
    g: (foreground.g * foregroundWeight) + (background.g * backgroundWeight),
    b: (foreground.b * foregroundWeight) + (background.b * backgroundWeight)
  };
}

function readableAccent(color: string): string {
  const source = rgb(color);
  return Math.max(source.r, source.g, source.b) < 96
    ? hex(mix(source, {r: 255, g: 255, b: 255}, 0.72))
    : color;
}

/** Composite any player color onto a fixed charcoal base for a guaranteed dark large-surface tint. */
export function safeCharacterTint(color: string): string | null {
  const normalized = normalizeHex(color);
  return normalized ? hex(mix(rgb(normalized), TINT_BASE, 0.20)) : null;
}

/** Normalize a player color for small decorative accents without changing semantic Theme colors. */
export function safeCharacterAccent(color: string): string | null {
  const normalized = normalizeHex(color);
  return normalized ? readableAccent(normalized) : null;
}

function cssUrl(path: string): string {
  const escaped = path
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replace(/[\n\r\f;]/g, "");
  return `url("${escaped}")`;
}

/**
 * Resolve a stored Foundry/Data asset path before placing it in CSS.
 *
 * CSS URLs substituted from the compiled system stylesheet otherwise resolve
 * relative to systems/cypherv2/dist. Absolute URLs are already fully resolved
 * (including remote/S3 assets) and must remain untouched.
 */
export function resolveFoundryAssetUrl(
  path: string,
  getRoute: FoundryAssetRouteResolver = (assetPath) => foundry.utils.getRoute(assetPath)
): string {
  const source = path.trim();
  if (!source) return "";
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(source)) return source;
  return getRoute(source);
}

export function resolveCharacterAppearance(
  appearance: CharacterAppearanceData,
  portrait: string,
  getRoute?: FoundryAssetRouteResolver
): ResolvedCharacterAppearance {
  const backgroundMode = CHARACTER_HEADER_BACKGROUND_MODES.includes(appearance.backgroundMode)
    ? appearance.backgroundMode
    : "theme";
  const customImage = appearance.customImage.trim();
  const storedColor = normalizeHex(appearance.color);
  const accent = storedColor ? safeCharacterAccent(storedColor) : null;
  const tint = storedColor ? safeCharacterTint(storedColor) : null;
  const backgroundSource = backgroundMode === "portrait"
    ? portrait.trim()
    : backgroundMode === "custom"
      ? customImage
      : "";
  const backgroundImage = resolveFoundryAssetUrl(backgroundSource, getRoute);
  const properties = [
    ...(accent ? [`--cypherv2-character-accent: ${accent}`] : []),
    ...(tint ? [`--cypherv2-character-tint: ${tint}`] : []),
    ...(backgroundImage
      ? [`--cypherv2-character-background-image: ${cssUrl(backgroundImage)}`]
      : [])
  ];
  return {
    backgroundMode,
    customImage,
    color: storedColor ?? "",
    backgroundImage,
    hasBackgroundImage: Boolean(backgroundImage),
    hasCharacterColor: Boolean(storedColor),
    accent,
    tint,
    colorInput: storedColor ?? DEFAULT_COLOR_INPUT,
    isTheme: backgroundMode === "theme",
    isPortrait: backgroundMode === "portrait",
    isCustom: backgroundMode === "custom",
    style: properties.join("; ")
  };
}
