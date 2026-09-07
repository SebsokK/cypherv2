import {RECOVERY_TYPES, type RecoveryType} from "../../constants/system";
import {
  RECOVERY_USAGE_KEYS,
  createRecoveryUsage,
  type RecoverySlotData,
  type RecoveryUsage
} from "./core-types";

const DEFAULT_SLOT_DEFINITIONS = [
  {id: "core-recovery-action", type: "one-action"},
  {id: "core-recovery-ten-minutes", type: "10-minutes"},
  {id: "core-recovery-one-hour", type: "1-hour"},
  {id: "core-recovery-ten-hours", type: "10-hours"}
] as const satisfies readonly Omit<RecoverySlotData, "used">[];

export function defaultRecoverySlots(usage: RecoveryUsage = createRecoveryUsage(false)): RecoverySlotData[] {
  return DEFAULT_SLOT_DEFINITIONS.map((slot) => ({
    ...slot,
    used: usage[RECOVERY_USAGE_KEYS[slot.type]]
  }));
}

export function normalizeRecoverySlots(
  value: unknown,
  legacyUsage: RecoveryUsage = createRecoveryUsage(false)
): RecoverySlotData[] {
  if (!Array.isArray(value) || value.length === 0) return defaultRecoverySlots(legacyUsage);
  const ids = new Set<string>();
  const slots: RecoverySlotData[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const entry = raw as Record<string, unknown>;
    const id = typeof entry.id === "string" ? entry.id.trim() : "";
    const type = String(entry.type ?? "") as RecoveryType;
    if (!id || ids.has(id) || !RECOVERY_TYPES.includes(type)) continue;
    ids.add(id);
    slots.push({id, type, used: entry.used === true});
  }
  return slots.length > 0 ? slots : defaultRecoverySlots(legacyUsage);
}

/** Legacy projection retained for old macros/integrations. Duplicate types are used when every matching slot is used. */
export function recoveryUsageFromSlots(slots: readonly RecoverySlotData[]): RecoveryUsage {
  const usage = createRecoveryUsage(false);
  for (const type of RECOVERY_TYPES) {
    const matching = slots.filter((slot) => slot.type === type);
    usage[RECOVERY_USAGE_KEYS[type]] = matching.length > 0 && matching.every((slot) => slot.used);
  }
  return usage;
}

export function availableRecoverySlots(slots: readonly RecoverySlotData[]): RecoverySlotData[] {
  return slots.filter((slot) => !slot.used).map((slot) => ({...slot}));
}

export function useRecoverySlot(
  slots: readonly RecoverySlotData[],
  slotId: string,
  type: RecoveryType
): RecoverySlotData[] {
  const selected = slots.find((slot) => slot.id === slotId && slot.type === type);
  if (!selected) throw new Error(`Recovery slot '${slotId}' is not available for '${type}'.`);
  if (selected.used) throw new Error(`Recovery slot '${slotId}' has already been used today.`);
  if (type === "10-hours") return slots.map((slot) => ({...slot, used: false}));
  return slots.map((slot) => slot.id === slotId ? {...slot, used: true} : {...slot});
}

/** Restore the Core track while conservatively carrying forward any used state by type. */
export function resetRecoveryTrack(slots: readonly RecoverySlotData[]): RecoverySlotData[] {
  const usage = createRecoveryUsage(false);
  for (const type of RECOVERY_TYPES) {
    usage[RECOVERY_USAGE_KEYS[type]] = slots.some((slot) => slot.type === type && slot.used);
  }
  return defaultRecoverySlots(usage);
}
