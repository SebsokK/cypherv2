import {WOUND_SEVERITIES, type WoundSeverity} from "../../constants/system";

export type WoundCountActionData =
  | {readonly track: "character"; readonly severity: WoundSeverity; readonly count: number}
  | {readonly track: "shield"; readonly shieldId: string; readonly severity: WoundSeverity; readonly count: number};

export function parseWoundCountActionData(
  dataset: Readonly<Record<string, string | undefined>> | DOMStringMap
): WoundCountActionData {
  const track = dataset.track;
  const severity = dataset.severity;
  const rawCount = dataset.count;
  const count = rawCount === undefined || rawCount.trim() === "" ? Number.NaN : Number(rawCount);
  if (
    (track !== "character" && track !== "shield")
    || !WOUND_SEVERITIES.includes(severity as WoundSeverity)
    || !Number.isInteger(count)
    || count < 0
  ) throw new Error("Invalid Wound count action data.");
  if (track === "shield") {
    const shieldId = dataset.shieldId?.trim();
    if (!shieldId) throw new Error("Invalid Wound count action data.");
    return {track, shieldId, severity: severity as WoundSeverity, count};
  }
  return {track, severity: severity as WoundSeverity, count};
}
