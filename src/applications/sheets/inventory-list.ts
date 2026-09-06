import {artifactLevelFormula, artifactLevelIsRollable, artifactUsable} from "../../artifacts/artifact-rules";
import {cypherLevel, normalizeCypherPower} from "../../cyphers/cypher-rules";

export const INVENTORY_ITEM_TYPES = ["equipment", "cypher", "artifact"] as const;
export type InventoryItemType = (typeof INVENTORY_ITEM_TYPES)[number];

export interface InventoryItemSource {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly system: Record<string, unknown>;
}

export interface InventoryItemPresentation {
  readonly id: string;
  readonly name: string;
  readonly type: InventoryItemType;
  readonly level: number | string | null;
  readonly levelRollable: boolean;
  readonly power: string | null;
  readonly quantity: number | null;
  readonly equipped: boolean | null;
  readonly description: string;
  readonly depleted: boolean;
  readonly usable: boolean;
  readonly depletion: {readonly enabled: boolean; readonly formula: string; readonly threshold: number} | null;
}

function wholeNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

export function isInventoryItemType(value: unknown): value is InventoryItemType {
  return INVENTORY_ITEM_TYPES.includes(value as InventoryItemType);
}

export function inventoryItemPresentation(item: InventoryItemSource): InventoryItemPresentation | null {
  if (!isInventoryItemType(item.type)) return null;
  const depletionSource = item.system.depletion && typeof item.system.depletion === "object"
    ? item.system.depletion as Record<string, unknown>
    : null;
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    level: item.type === "cypher"
      ? cypherLevel(item.system)
      : item.type === "artifact" ? artifactLevelFormula(item.system) : null,
    levelRollable: item.type === "artifact" && artifactLevelIsRollable(item.system),
    power: item.type === "cypher" ? normalizeCypherPower(item.system.power) : null,
    quantity: item.type === "equipment" ? wholeNumber(item.system.quantity, 1) : null,
    equipped: item.type === "equipment" && typeof item.system.equipped === "boolean"
      ? item.system.equipped
      : null,
    description: typeof item.system.description === "string" ? item.system.description.trim() : "",
    depleted: item.type === "artifact" && item.system.depleted === true,
    usable: item.type !== "artifact" || artifactUsable(item.system),
    depletion: item.type === "artifact" && depletionSource
      ? {
        enabled: Boolean(depletionSource.enabled),
        formula: String(depletionSource.formula || `1${String(depletionSource.die ?? "d6")}`),
        threshold: wholeNumber(depletionSource.threshold, 1)
      }
      : null
  };
}

/** Ephemeral display state only; it never writes Item sort/order or system data. */
export class InventoryAccordionState {
  readonly #expandedIds = new Set<string>();

  isExpanded(id: string): boolean {
    return this.#expandedIds.has(id);
  }

  toggle(id: string): boolean {
    if (this.#expandedIds.delete(id)) return false;
    this.#expandedIds.add(id);
    return true;
  }

  remove(id: string): void {
    this.#expandedIds.delete(id);
  }

  retain(ids: Iterable<string>): void {
    const currentIds = new Set(ids);
    for (const id of this.#expandedIds) {
      if (!currentIds.has(id)) this.#expandedIds.delete(id);
    }
  }
}
