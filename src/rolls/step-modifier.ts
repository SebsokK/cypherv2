import type {RollStepContribution} from "./roll-types";

export type StepModifierKind = RollStepContribution["direction"];

export function formatStepModifier(kind: StepModifierKind, amount: number): string {
  if (!Number.isFinite(amount)) throw new Error("Step modifier amount must be finite.");
  const steps = Math.abs(Math.trunc(amount));
  if (steps === 0) return "0";
  return `${kind === "ease" ? "+" : "-"}${steps}`;
}

export function formatNetStepModifier(value: number): string {
  if (!Number.isFinite(value)) throw new Error("Net step modifier must be finite.");
  if (value === 0) return "0";
  return formatStepModifier(value > 0 ? "ease" : "hinder", value);
}
