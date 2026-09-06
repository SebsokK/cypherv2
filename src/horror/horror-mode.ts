export const HORROR_INTRUSION_RANGE_MIN = 1;
export const HORROR_INTRUSION_RANGE_MAX = 20;
export const HORROR_INTRUSION_RANGE_DEFAULT = 1;

export type HorrorRangeBand =
  | "neutral"
  | "low"
  | "elevated"
  | "severe"
  | "extreme"
  | "catastrophic"
  | "maximum";

/** Normalize persisted or externally supplied state without producing an invalid roll rule. */
export function normalizeHorrorIntrusionRange(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return HORROR_INTRUSION_RANGE_DEFAULT;
  return Math.min(
    HORROR_INTRUSION_RANGE_MAX,
    Math.max(HORROR_INTRUSION_RANGE_MIN, Math.trunc(numeric))
  );
}

export function isValidHorrorIntrusionRange(value: unknown): value is number {
  return Number.isInteger(value)
    && Number(value) >= HORROR_INTRUSION_RANGE_MIN
    && Number(value) <= HORROR_INTRUSION_RANGE_MAX;
}

export function horrorRangeBand(value: unknown): HorrorRangeBand {
  const range = normalizeHorrorIntrusionRange(value);
  if (range === 1) return "neutral";
  if (range <= 3) return "low";
  if (range <= 5) return "elevated";
  if (range <= 8) return "severe";
  if (range <= 12) return "extreme";
  if (range <= 16) return "catastrophic";
  return "maximum";
}

export function horrorRangeFillPercentage(value: unknown): number {
  const range = normalizeHorrorIntrusionRange(value);
  return ((range - HORROR_INTRUSION_RANGE_MIN)
    / (HORROR_INTRUSION_RANGE_MAX - HORROR_INTRUSION_RANGE_MIN)) * 100;
}
