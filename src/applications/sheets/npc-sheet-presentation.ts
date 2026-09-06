import {headerPoolGauge, type HeaderPoolGauge} from "./character-header";

export type NpcHealthGaugeState = "healthy" | "intermediate" | "low";

export interface NpcHealthGauge extends HeaderPoolGauge {
  readonly state: NpcHealthGaugeState;
}

/** Derive the read-only task target number from a valid NPC Level. */
export function npcTargetNumber(level: unknown): number | null {
  const numericLevel = typeof level === "number"
    ? level
    : typeof level === "string" && level.trim() !== ""
      ? Number(level)
      : Number.NaN;
  return Number.isInteger(numericLevel) && numericLevel >= 0
    ? numericLevel * 3
    : null;
}

/** Build the clamped, presentation-only NPC Health gauge shown by the sheet. */
export function npcHealthGauge(current: number, maximum: number): NpcHealthGauge {
  const gauge = headerPoolGauge(current, maximum);
  const state: NpcHealthGaugeState = gauge.ratio > 0.5
    ? "healthy"
    : gauge.ratio > 0.25
      ? "intermediate"
      : "low";
  return {...gauge, state};
}
