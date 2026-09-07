import {RECOVERY_TYPES, WOUND_SEVERITIES, type RecoveryType} from "../../constants/system";
import {defaultIdFactory, type CharacterDocumentLike, type RecoverySlotData, type WoundCapacities} from "../../rules/core/core-types";
import {recoveryUsageFromSlots, resetRecoveryTrack} from "../../rules/core/recovery-track";

type DialogData = Record<string, unknown>;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]!);
}

function integer(value: unknown, label: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new Error(`${label} must be a whole number.`);
  return parsed;
}

function notify(error: unknown): void {
  ui.notifications.error(error instanceof Error ? error.message : String(error));
}

export function validateWoundCapacityModifiers(
  calculated: WoundCapacities,
  modifiers: WoundCapacities
): WoundCapacities {
  for (const severity of WOUND_SEVERITIES) {
    if (!Number.isInteger(modifiers[severity])) throw new Error(`${severity} modifier must be a whole number.`);
    if (calculated[severity] + modifiers[severity] < 1) {
      throw new Error(`${severity} Wound capacity must remain at least 1.`);
    }
  }
  return {...modifiers};
}

export async function promptWoundCapacityOverride(actor: CharacterDocumentLike): Promise<void> {
  const calculated = actor.system.derived.wounds.calculatedCapacities;
  const current = actor.system.overrides.wounds ?? {minor: 0, moderate: 0, major: 0};
  const data = await foundry.applications.api.DialogV2.input({
    window: {title: game.i18n.localize("CYPHERV2.Overrides.WoundsEdit")},
    content: `<div class="cypherv2 cypherv2-dialog cypherv2-wound-override-dialog">
      <section class="cypherv2-dialog-section">
        <span class="cypherv2-dialog-section-heading">${game.i18n.localize("CYPHERV2.Overrides.WoundModifiers")}</span>
        <div class="cypherv2-dialog-field-grid">
          ${WOUND_SEVERITIES.map((severity) => `<label class="cypherv2-dialog-field">${game.i18n.localize(`CYPHERV2.Wounds.Severity.${severity}`)}
            <input name="${severity}" type="number" step="1" value="${current[severity]}">
            <small>${game.i18n.localize("CYPHERV2.Overrides.Calculated")}: ${calculated[severity]}</small>
          </label>`).join("")}
        </div>
      </section>
    </div>`,
    rejectClose: false,
    ok: {label: game.i18n.localize("CYPHERV2.Actions.Save")}
  }) as DialogData | null;
  if (!data) return;
  try {
    const modifiers = validateWoundCapacityModifiers(calculated, {
      minor: integer(data.minor, "Minor"),
      moderate: integer(data.moderate, "Moderate"),
      major: integer(data.major, "Major")
    });
    await actor.update({"system.overrides.wounds": modifiers});
  } catch (error) {
    notify(error);
  }
}

function recoveryTypeOptions(selected: RecoveryType): string {
  return RECOVERY_TYPES.map((type) => `<option value="${type}"${type === selected ? " selected" : ""}>${game.i18n.localize(`CYPHERV2.Recovery.${type}`)}</option>`).join("");
}

function recoverySlotRow(slot: RecoverySlotData): string {
  return `<div class="recovery-override-slot" data-recovery-slot-id="${escapeHtml(slot.id)}">
    <i class="fa-solid fa-grip-lines" aria-hidden="true"></i>
    <select name="slotType__${escapeHtml(slot.id)}" aria-label="${game.i18n.localize("CYPHERV2.Overrides.RecoverySlotType")}">${recoveryTypeOptions(slot.type)}</select>
    <span class="recovery-slot-state">${slot.used ? game.i18n.localize("CYPHERV2.Overrides.Used") : game.i18n.localize("CYPHERV2.Overrides.Available")}</span>
    <span class="character-settings-row-actions">
      <button type="button" class="cypherv2-icon-action" data-recovery-slot-move="up" title="${game.i18n.localize("CYPHERV2.Actions.MoveUp")}"><i class="fa-solid fa-arrow-up"></i></button>
      <button type="button" class="cypherv2-icon-action" data-recovery-slot-move="down" title="${game.i18n.localize("CYPHERV2.Actions.MoveDown")}"><i class="fa-solid fa-arrow-down"></i></button>
      <button type="button" class="cypherv2-icon-action" data-recovery-slot-remove title="${game.i18n.localize("CYPHERV2.Actions.Remove")}"><i class="fa-solid fa-trash"></i></button>
    </span>
  </div>`;
}

export function recoveryOverrideDialogContent(slots: readonly RecoverySlotData[], modifier: number): string {
  return `<div class="cypherv2 cypherv2-dialog cypherv2-recovery-override-dialog">
    <section class="cypherv2-dialog-section">
      <span class="cypherv2-dialog-section-heading">${game.i18n.localize("CYPHERV2.Overrides.RecoveryTrack")}</span>
      <input type="hidden" name="slotOrder" value="${slots.map((slot) => slot.id).join(",")}">
      <div class="recovery-override-slots">${slots.map(recoverySlotRow).join("")}</div>
      <button type="button" class="compact-inline-action recovery-slot-add" data-recovery-slot-add><i class="fa-solid fa-plus"></i> ${game.i18n.localize("CYPHERV2.Overrides.AddRecoverySlot")}</button>
    </section>
    <section class="cypherv2-dialog-section">
      <label class="cypherv2-dialog-field">${game.i18n.localize("CYPHERV2.Overrides.RecoveryRollModifier")}
        <input name="rollModifier" type="number" min="-20" max="20" step="1" value="${modifier}">
      </label>
    </section>
  </div>`;
}

function syncRecoverySlotControls(root: HTMLElement): void {
  const rows = [...root.querySelectorAll<HTMLElement>("[data-recovery-slot-id]")];
  const order = root.querySelector<HTMLInputElement>('input[name="slotOrder"]');
  if (order) order.value = rows.map((row) => row.dataset.recoverySlotId ?? "").filter(Boolean).join(",");
  for (const [index, row] of rows.entries()) {
    const up = row.querySelector<HTMLButtonElement>('[data-recovery-slot-move="up"]');
    const down = row.querySelector<HTMLButtonElement>('[data-recovery-slot-move="down"]');
    const remove = row.querySelector<HTMLButtonElement>("[data-recovery-slot-remove]");
    if (up) up.disabled = index === 0;
    if (down) down.disabled = index === rows.length - 1;
    if (remove) remove.disabled = rows.length <= 1;
  }
}

export function bindRecoveryOverrideDialog(root: HTMLElement): void {
  syncRecoverySlotControls(root);
  root.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>("button") : null;
    if (!target) return;
    const row = target.closest<HTMLElement>("[data-recovery-slot-id]");
    const list = root.querySelector<HTMLElement>(".recovery-override-slots");
    if (target.hasAttribute("data-recovery-slot-add") && list) {
      const slot: RecoverySlotData = {id: defaultIdFactory(), type: "one-action", used: false};
      list.insertAdjacentHTML("beforeend", recoverySlotRow(slot));
      syncRecoverySlotControls(root);
      return;
    }
    if (!row || !list) return;
    if (target.hasAttribute("data-recovery-slot-remove")) row.remove();
    if (target.dataset.recoverySlotMove === "up" && row.previousElementSibling) {
      list.insertBefore(row, row.previousElementSibling);
    }
    if (target.dataset.recoverySlotMove === "down" && row.nextElementSibling) {
      list.insertBefore(row.nextElementSibling, row);
    }
    syncRecoverySlotControls(root);
  });
}

export function parseRecoveryOverrideDialogData(
  data: DialogData,
  currentSlots: readonly RecoverySlotData[]
): {slots: RecoverySlotData[]; rollModifier: number} {
  const order = String(data.slotOrder ?? "").split(",").filter(Boolean);
  if (order.length === 0 || new Set(order).size !== order.length) throw new Error("Recovery track must contain unique slots.");
  const current = new Map(currentSlots.map((slot) => [slot.id, slot]));
  const slots = order.map((id) => {
    const type = String(data[`slotType__${id}`] ?? "") as RecoveryType;
    if (!RECOVERY_TYPES.includes(type)) throw new Error(`Invalid Recovery type '${type}'.`);
    return {id, type, used: current.get(id)?.used ?? false};
  });
  const rollModifier = integer(data.rollModifier, "Recovery roll modifier");
  if (rollModifier < -20 || rollModifier > 20) throw new Error("Recovery roll modifier must be between -20 and 20.");
  return {slots, rollModifier};
}

export async function promptRecoveryOverride(actor: CharacterDocumentLike): Promise<void> {
  const slots = actor.system.recovery.slots;
  const data = await foundry.applications.api.DialogV2.input({
    window: {title: game.i18n.localize("CYPHERV2.Overrides.RecoveryEdit")},
    content: recoveryOverrideDialogContent(slots, actor.system.recovery.rollModifier),
    rejectClose: false,
    ok: {label: game.i18n.localize("CYPHERV2.Actions.Save")},
    render: (_event: Event, dialog: {element: HTMLElement}) => bindRecoveryOverrideDialog(dialog.element)
  }) as DialogData | null;
  if (!data) return;
  try {
    const result = parseRecoveryOverrideDialogData(data, slots);
    await actor.update({
      "system.recovery.slots": result.slots,
      "system.recovery.used": recoveryUsageFromSlots(result.slots),
      "system.recovery.customized": true,
      "system.recovery.rollModifier": result.rollModifier
    });
  } catch (error) {
    notify(error);
  }
}

export async function resetWoundCapacityOverride(actor: CharacterDocumentLike): Promise<void> {
  await actor.update({"system.overrides.wounds": {minor: 0, moderate: 0, major: 0}});
}

export async function resetRecoveryOverride(actor: CharacterDocumentLike): Promise<void> {
  const slots = resetRecoveryTrack(actor.system.recovery.slots);
  await actor.update({
    "system.recovery.slots": slots,
    "system.recovery.used": recoveryUsageFromSlots(slots),
    "system.recovery.customized": false,
    "system.recovery.rollModifier": 0
  });
}
