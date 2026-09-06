import {SYSTEM_UI_ASSETS} from "../config/system-assets";
import {resolveFoundryAssetUrl, type FoundryAssetRouteResolver} from "../themes/character-appearance";

export const BLANK_CANVAS_BACKGROUND_PROPERTY = "--cypherv2-blank-canvas-background-image";

interface BackgroundStyleTarget {
  readonly style: Pick<CSSStyleDeclaration, "setProperty">;
}

function cssUrl(path: string): string {
  const escaped = path
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replace(/[\n\r\f;]/g, "");
  return `url("${escaped}")`;
}

/**
 * Provide the game page background revealed by Foundry when no Scene is active.
 * Foundry continues to own canvas visibility and every active-Scene render path.
 */
export function initializeBlankCanvasBackground(
  target: BackgroundStyleTarget = document.body,
  getRoute: FoundryAssetRouteResolver = (path) => foundry.utils.getRoute(path)
): void {
  const route = resolveFoundryAssetUrl(SYSTEM_UI_ASSETS.lobby, getRoute);
  target.style.setProperty(BLANK_CANVAS_BACKGROUND_PROPERTY, cssUrl(route));
}
