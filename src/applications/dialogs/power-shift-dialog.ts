import type {CharacterDocumentLike} from "../../rules/core/core-types";
import {
  POWER_SHIFT_CATEGORIES,
  deletePowerShiftAllocation,
  savePowerShiftAllocation,
  type PowerShiftAllocation
} from "../../packages/power-shifts";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]!);
}

export function powerShiftDialogContent(allocation?: PowerShiftAllocation): string {
  const current = allocation ?? {id: "", category: "Accuracy", shifts: 1, specification: "", description: ""};
  return `<div class="cypherv2 cypherv2-dialog cypherv2-power-shift-dialog">
    <label class="cypherv2-dialog-field">${game.i18n.localize("CYPHERV2.PowerShifts.Category")}
      <input name="category" type="text" value="${escapeHtml(current.category)}" list="cypherv2-power-shift-categories" required>
      <datalist id="cypherv2-power-shift-categories">${POWER_SHIFT_CATEGORIES.map((category) => `<option value="${escapeHtml(category)}"></option>`).join("")}</datalist>
    </label>
    <label class="cypherv2-dialog-field">${game.i18n.localize("CYPHERV2.PowerShifts.Shifts")}
      <input name="shifts" type="number" min="1" step="1" value="${current.shifts}" required>
    </label>
    <label class="cypherv2-dialog-field">${game.i18n.localize("CYPHERV2.PowerShifts.Specification")}
      <input name="specification" type="text" value="${escapeHtml(current.specification)}">
    </label>
    <label class="cypherv2-dialog-field">${game.i18n.localize("CYPHERV2.PowerShifts.Description")}
      <textarea name="description" rows="3">${escapeHtml(current.description)}</textarea>
    </label>
  </div>`;
}

export async function promptPowerShiftAllocation(
  actor: CharacterDocumentLike,
  allocations: readonly PowerShiftAllocation[],
  current?: PowerShiftAllocation
): Promise<void> {
  const data = await foundry.applications.api.DialogV2.input({
    window: {title: game.i18n.localize(current ? "CYPHERV2.PowerShifts.Edit" : "CYPHERV2.PowerShifts.Add")},
    content: powerShiftDialogContent(current),
    rejectClose: false,
    ok: {label: game.i18n.localize("CYPHERV2.Actions.Save")}
  }) as Record<string, unknown> | null;
  if (!data) return;
  const next = savePowerShiftAllocation(allocations, {
    ...(current ? {id: current.id} : {}),
    category: String(data.category ?? ""),
    shifts: Number(data.shifts),
    specification: String(data.specification ?? ""),
    description: String(data.description ?? "")
  });
  await actor.update({"system.powerShifts": next});
}

export async function removePowerShiftAllocation(
  actor: CharacterDocumentLike,
  allocations: readonly PowerShiftAllocation[],
  id: string
): Promise<void> {
  await actor.update({"system.powerShifts": deletePowerShiftAllocation(allocations, id)});
}
