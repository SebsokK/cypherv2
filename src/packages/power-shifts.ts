import {defaultIdFactory, type IdFactory} from "../rules/core/core-types";

export const POWER_SHIFT_CATEGORIES = [
  "Accuracy", "Strength", "Dexterity", "Resilience", "Intelligence",
  "Single Attack", "Power", "Flight", "Healing", "Increased Range",
  "Prodigy", "Savant", "Custom"
] as const;

export interface PowerShiftAllocation {
  readonly id: string;
  readonly category: string;
  readonly shifts: number;
  readonly specification: string;
  readonly description: string;
}

export interface PowerShiftTypeLike {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly system: {
    readonly superhero?: {readonly powerShiftCount?: number};
    readonly instance?: {
      readonly instanceId?: string;
      readonly selections?: {readonly powerShifts?: readonly string[]};
    };
  };
}

export function normalizePowerShiftAllocation(value: unknown): PowerShiftAllocation | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const id = String(record.id ?? "").trim();
  const category = String(record.category ?? "").trim();
  const shifts = Number(record.shifts);
  if (!id || !category || !Number.isInteger(shifts) || shifts < 1) return null;
  return {
    id,
    category,
    shifts,
    specification: String(record.specification ?? record.label ?? "").trim(),
    description: String(record.description ?? "").trim()
  };
}

export function normalizePowerShiftAllocations(values: unknown): PowerShiftAllocation[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const normalized: PowerShiftAllocation[] = [];
  for (const value of values) {
    const allocation = normalizePowerShiftAllocation(value);
    if (!allocation || seen.has(allocation.id)) continue;
    seen.add(allocation.id);
    normalized.push(allocation);
  }
  return normalized;
}

/** Conservatively expose unreleased beta.3 free-text Type slots as one-shift Custom allocations. */
export function legacyTypePowerShiftAllocations(types: readonly PowerShiftTypeLike[]): PowerShiftAllocation[] {
  return types.filter((item) => item.type === "characterType").flatMap((item) => {
    const instanceId = item.system.instance?.instanceId || item.id;
    return (item.system.instance?.selections?.powerShifts ?? []).flatMap((value, index) => {
      const specification = String(value ?? "").trim();
      return specification ? [{
        id: `legacy-${instanceId}-${index}`,
        category: "Custom",
        shifts: 1,
        specification,
        description: ""
      }] : [];
    });
  });
}

export function effectivePowerShiftAllocations(
  stored: readonly PowerShiftAllocation[],
  types: readonly PowerShiftTypeLike[]
): PowerShiftAllocation[] {
  const normalized = normalizePowerShiftAllocations(stored);
  return normalized.length > 0 ? normalized : legacyTypePowerShiftAllocations(types);
}

export function availablePowerShifts(types: readonly PowerShiftTypeLike[]): number {
  return types.filter((item) => item.type === "characterType").reduce((total, item) => {
    const count = Number(item.system.superhero?.powerShiftCount ?? 0);
    return total + (Number.isInteger(count) && count > 0 ? count : 0);
  }, 0);
}

export function powerShiftSummary(allocations: readonly PowerShiftAllocation[], available: number): {
  allocated: number;
  available: number;
  overBudget: boolean;
  categoryWarnings: ReadonlySet<string>;
} {
  const allocated = allocations.reduce((total, allocation) => total + allocation.shifts, 0);
  const categoryTotals = new Map<string, number>();
  for (const allocation of allocations) {
    const key = allocation.category.trim().toLocaleLowerCase("en-US");
    categoryTotals.set(key, (categoryTotals.get(key) ?? 0) + allocation.shifts);
  }
  return {
    allocated,
    available: Math.max(0, Math.trunc(available)),
    overBudget: allocated > available,
    categoryWarnings: new Set([...categoryTotals].filter(([, total]) => total > 3).map(([category]) => category))
  };
}

export function savePowerShiftAllocation(
  allocations: readonly PowerShiftAllocation[],
  input: Omit<PowerShiftAllocation, "id"> & {readonly id?: string},
  idFactory: IdFactory = defaultIdFactory
): PowerShiftAllocation[] {
  const id = input.id?.trim() || idFactory();
  const allocation = normalizePowerShiftAllocation({...input, id});
  if (!allocation) throw new Error("A Power Shift requires a category and a positive whole-number value.");
  const index = allocations.findIndex((entry) => entry.id === id);
  if (index < 0) return [...allocations, allocation];
  return allocations.map((entry, entryIndex) => entryIndex === index ? allocation : entry);
}

export function deletePowerShiftAllocation(
  allocations: readonly PowerShiftAllocation[],
  id: string
): PowerShiftAllocation[] {
  return allocations.filter((entry) => entry.id !== id);
}
