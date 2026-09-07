import {WOUND_SEVERITIES, type RecoveryKind, type RecoveryType, type WoundSeverity} from "../../constants/system";
import type {CharacterDocumentLike, PoolKey} from "../../rules/core/core-types";
import {availableRecoverySlots, defaultRecoverySlots} from "../../rules/core/recovery-track";
import {
  characterOverrideView,
  type CharacterOverrideKey
} from "../../rules/core/character-overrides";
import type {OneHourRestChoice} from "../../services/rest-service";
import {
  RALLY_EXECUTION_COST_MAX,
  type RallySeverity
} from "../../services/rally-service";

type DialogData = Record<string, unknown>;

export type RecoveryDialogMode = "normal" | "lastAction" | "nonRest";

export interface RecoveryDialogResolution {
  readonly kind: RecoveryKind;
  readonly lastAction: boolean;
}

export function recoveryDialogModes(type: RecoveryType): readonly RecoveryDialogMode[] {
  return type === "one-action"
    ? ["normal", "lastAction", "nonRest"]
    : ["normal", "nonRest"];
}

export function resolveRecoveryDialogMode(
  type: RecoveryType,
  mode: RecoveryDialogMode
): RecoveryDialogResolution {
  if (!recoveryDialogModes(type).includes(mode)) {
    throw new Error(`Recovery mode '${mode}' is not available for '${type}'.`);
  }
  return mode === "nonRest"
    ? {kind: "nonRest", lastAction: false}
    : {kind: "normal", lastAction: mode === "lastAction"};
}

function numberValue(data: DialogData, key: string): number {
  return Number(data[key] ?? 0);
}

function stringValue(data: DialogData, key: string): string {
  return String(data[key] ?? "");
}

function checked(data: DialogData, key: string): boolean {
  const value = data[key];
  return value === true || value === "true" || value === "on";
}

function notifyError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  ui.notifications.error(message);
}

async function input(
  title: string,
  content: string,
  okLabel = game.i18n.localize("CYPHERV2.Actions.Apply")
): Promise<DialogData | null> {
  return foundry.applications.api.DialogV2.input({
    window: {title},
    content,
    rejectClose: false,
    ok: {label: okLabel}
  }) as Promise<DialogData | null>;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]!);
}

export async function promptEditWound(
  actor: CharacterDocumentLike,
  severity: WoundSeverity,
  woundId: string
): Promise<void> {
  const wound = actor.system.wounds[severity].find((entry) => entry.id === woundId);
  if (!wound) {
    notifyError(new Error(`Wound '${woundId}' was not found in ${severity} Wounds.`));
    return;
  }
  const data = await foundry.applications.api.DialogV2.input({
    window: {title: game.i18n.localize("CYPHERV2.Wounds.EditTitle")},
    content: `<div class="cypherv2-dialog-fields">
      <label>${game.i18n.localize("CYPHERV2.Wounds.Label")}
        <input name="label" type="text" value="${escapeHtml(wound.label)}">
      </label>
      <label>${game.i18n.localize("CYPHERV2.Wounds.Description")}
        <textarea name="description">${escapeHtml(wound.description)}</textarea>
      </label>
    </div>`,
    rejectClose: false,
    ok: {label: game.i18n.localize("CYPHERV2.Actions.Save")}
  }) as DialogData | null;
  if (!data) return;
  try {
    await game.cypherv2.services.wounds.edit(actor, severity, woundId, {
      label: stringValue(data, "label"),
      description: stringValue(data, "description")
    });
    ui.notifications.info(game.i18n.localize("CYPHERV2.Wounds.Updated"));
  } catch (error) {
    notifyError(error);
  }
}

export async function promptDeleteWound(
  actor: CharacterDocumentLike,
  severity: WoundSeverity,
  woundId: string
): Promise<void> {
  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: {title: game.i18n.localize("CYPHERV2.Wounds.DeleteTitle")},
    content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.localize("CYPHERV2.Wounds.DeleteConfirm")}</p></div>`,
    rejectClose: false,
    modal: true,
    yes: {label: game.i18n.localize("CYPHERV2.Actions.Delete")},
    no: {label: game.i18n.localize("CYPHERV2.Actions.Cancel")}
  });
  if (!confirmed) return;
  try {
    await game.cypherv2.services.wounds.delete(actor, severity, woundId);
    ui.notifications.info(game.i18n.localize("CYPHERV2.Wounds.Deleted"));
  } catch (error) {
    notifyError(error);
  }
}

export async function promptApplyWound(actor: CharacterDocumentLike): Promise<void> {
  const data = await input(
    game.i18n.localize("CYPHERV2.Actions.ApplyWound"),
    `<div class="cypherv2-dialog-fields">
      <label>${game.i18n.localize("CYPHERV2.Wounds.SeverityLabel")}
        <select name="severity">
          ${WOUND_SEVERITIES.map((severity) => `<option value="${severity}">${game.i18n.localize(`CYPHERV2.Wounds.Severity.${severity}`)}</option>`).join("")}
        </select>
      </label>
      <label>${game.i18n.localize("CYPHERV2.Wounds.Label")}
        <input name="label" type="text">
      </label>
    </div>`
  );
  if (!data) return;
  try {
    const label = stringValue(data, "label");
    const result = await game.cypherv2.services.wounds.apply(
      actor,
      stringValue(data, "severity") as WoundSeverity,
      label ? {label} : {}
    );
    const message = result.applied
      ? `${result.appliedSeverity}${result.dead ? ` — ${game.i18n.localize("CYPHERV2.Wounds.Dead")}` : ""}`
      : game.i18n.localize("CYPHERV2.Wounds.NoFourthMajor");
    ui.notifications.info(message);
  } catch (error) {
    notifyError(error);
  }
}

export async function promptPoolDamage(actor: CharacterDocumentLike): Promise<void> {
  const data = await input(
    game.i18n.localize("CYPHERV2.Actions.PoolDamage"),
    `<div class="cypherv2-dialog-fields">
      <label>${game.i18n.localize("CYPHERV2.Pools.Pool")}
        <select name="pool">
          <option value="might">${game.i18n.localize("CYPHERV2.Pools.Might")}</option>
          <option value="speed">${game.i18n.localize("CYPHERV2.Pools.Speed")}</option>
          <option value="intellect">${game.i18n.localize("CYPHERV2.Pools.Intellect")}</option>
        </select>
      </label>
      <label>${game.i18n.localize("CYPHERV2.Pools.Damage")}
        <input name="damage" type="number" value="1" min="0" step="1">
      </label>
    </div>`
  );
  if (!data) return;
  try {
    const result = await game.cypherv2.services.wounds.damagePool(
      actor,
      stringValue(data, "pool") as PoolKey,
      numberValue(data, "damage")
    );
    ui.notifications.info(
      result.overflowSeverity
        ? `${result.pool}: ${result.value}; ${result.overflowSeverity} Wound`
        : `${result.pool}: ${result.value}`
    );
  } catch (error) {
    notifyError(error);
  }
}

export async function promptRecovery(
  actor: CharacterDocumentLike,
  selectedType?: RecoveryType,
  selectedSlotId?: string
): Promise<void> {
  const slots = actor.system.recovery.slots?.length
    ? actor.system.recovery.slots
    : defaultRecoverySlots(actor.system.recovery.used);
  const availableSlots = availableRecoverySlots(slots);
  if (availableSlots.length === 0) {
    ui.notifications.warn(game.i18n.localize("CYPHERV2.Recovery.NoneAvailable"));
    return;
  }
  if (selectedSlotId && !availableSlots.some((slot) => slot.id === selectedSlotId && slot.type === selectedType)) {
    ui.notifications.warn(game.i18n.localize("CYPHERV2.Recovery.AlreadyUsed"));
    return;
  }
  let type = selectedType;
  let slotId = selectedSlotId;
  if (!type || !slotId) {
    const selection = await foundry.applications.api.DialogV2.input({
      window: {title: game.i18n.localize("CYPHERV2.Recovery.Choose")},
      content: `<div class="cypherv2 cypherv2-dialog cypherv2-recovery-dialog">
        <section class="cypherv2-dialog-section">
          <span class="cypherv2-dialog-section-heading">${game.i18n.localize("CYPHERV2.Recovery.Available")}</span>
          <label class="cypherv2-dialog-field">${game.i18n.localize("CYPHERV2.Recovery.Choose")}
            <select name="slotId">${availableSlots.map((entry) => `<option value="${entry.id}">${game.i18n.localize(`CYPHERV2.Recovery.${entry.type}`)}</option>`).join("")}</select>
          </label>
        </section>
      </div>`,
      rejectClose: false,
      ok: {label: game.i18n.localize("CYPHERV2.Actions.Next")}
    }) as DialogData | null;
    if (!selection) return;
    slotId = stringValue(selection, "slotId");
    type = availableSlots.find((slot) => slot.id === slotId)?.type;
    if (!type || !slotId) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Recovery.AlreadyUsed"));
      return;
    }
  }
  const modes = recoveryDialogModes(type);
  const setup = await foundry.applications.api.DialogV2.input({
    window: {title: `${game.i18n.localize("CYPHERV2.Actions.Recovery")} — ${game.i18n.localize(`CYPHERV2.Recovery.${type}`)}`},
    content: `<div class="cypherv2 cypherv2-dialog cypherv2-recovery-dialog">
      <header class="cypherv2-dialog-heading">
        <span>${game.i18n.localize("CYPHERV2.Actions.Recovery")}</span>
        <strong>${game.i18n.localize(`CYPHERV2.Recovery.${type}`)}</strong>
      </header>
      <section class="cypherv2-dialog-section cypherv2-recovery-formula">
        <span class="cypherv2-dialog-section-heading">${game.i18n.localize("CYPHERV2.Recovery.Roll")}</span>
        <strong class="cypherv2-dialog-value">${escapeHtml(actor.system.derived.recovery.formula)}</strong>
      </section>
      <section class="cypherv2-dialog-section">
        <span class="cypherv2-dialog-section-heading">${game.i18n.localize("CYPHERV2.Recovery.KindLabel")}</span>
        <div class="cypherv2-dialog-button-group recovery-mode-buttons" role="radiogroup" aria-label="${game.i18n.localize("CYPHERV2.Recovery.KindLabel")}">
          ${modes.map((mode) => `<label class="cypherv2-dialog-toggle"><input name="mode" type="radio" value="${mode}"${mode === "normal" ? " checked" : ""}><span>${game.i18n.localize(`CYPHERV2.Recovery.Kind.${mode}`)}</span></label>`).join("")}
        </div>
      </section>
    </div>`,
    rejectClose: false,
    ok: {label: game.i18n.localize("CYPHERV2.Recovery.Recover")}
  }) as DialogData | null;
  if (!setup) return;
  try {
    const resolution = resolveRecoveryDialogMode(type, stringValue(setup, "mode") as RecoveryDialogMode);
    if (resolution.kind === "nonRest") {
      await game.cypherv2.services.recovery.completeNonRest(actor, type, slotId);
      ui.notifications.info(game.i18n.localize("CYPHERV2.Recovery.NonRestCompleted"));
      return;
    }
    const roll = await game.cypherv2.services.recovery.rollNormal(
      actor,
      type,
      resolution.lastAction,
      slotId
    );
    const restControls = type === "1-hour"
      ? `<label>${game.i18n.localize("CYPHERV2.Rest.OneHourChoice")}
          <select name="oneHourChoice">
            <option value="remove-moderate">${game.i18n.localize("CYPHERV2.Rest.RemoveModerate")}</option>
            <option value="remove-minors">${game.i18n.localize("CYPHERV2.Rest.RemoveMinors")}</option>
          </select>
        </label>`
      : type === "10-hours"
        ? `<label><input name="exchange" type="checkbox"> ${game.i18n.localize("CYPHERV2.Rest.ExchangeMinor")}</label>
          <label><input name="majorSuccess" type="checkbox"> ${game.i18n.localize("CYPHERV2.Rest.MajorTaskSuccess")}</label>`
        : type === "10-minutes"
          ? `<p>${game.i18n.localize("CYPHERV2.Recovery.TenMinuteBenefit")}</p>`
          : "";
    const allocation = await input(
      `${game.i18n.localize("CYPHERV2.Actions.Recovery")} — ${roll.total}`,
      `<div class="cypherv2 cypherv2-dialog cypherv2-recovery-dialog cypherv2-recovery-allocation-dialog">
        <section class="cypherv2-dialog-section">
          <span class="cypherv2-dialog-section-heading">${game.i18n.localize("CYPHERV2.Recovery.Result")}</span>
          <div class="cypherv2-dialog-summary-row"><span>${escapeHtml(actor.system.derived.recovery.formula)}</span><strong>${roll.total}</strong></div>
          ${roll.lastAction ? `<div class="cypherv2-dialog-summary-row"><span>${game.i18n.localize("CYPHERV2.Recovery.Kind.lastAction")}</span><strong>+2</strong></div>` : ""}
        </section>
        <section class="cypherv2-dialog-section cypherv2-dialog-field-grid">
          <label class="cypherv2-dialog-field">${game.i18n.localize("CYPHERV2.Pools.Might")} <input name="might" type="number" value="0" min="0" max="${roll.total}" step="1"></label>
          <label class="cypherv2-dialog-field">${game.i18n.localize("CYPHERV2.Pools.Speed")} <input name="speed" type="number" value="0" min="0" max="${roll.total}" step="1"></label>
          <label class="cypherv2-dialog-field">${game.i18n.localize("CYPHERV2.Pools.Intellect")} <input name="intellect" type="number" value="0" min="0" max="${roll.total}" step="1"></label>
        </section>
        ${restControls ? `<section class="cypherv2-dialog-section cypherv2-dialog-fields">${restControls}</section>` : ""}
      </div>`,
      game.i18n.localize("CYPHERV2.Recovery.Recover")
    );
    if (!allocation) return;
    const result = await game.cypherv2.services.recovery.completeNormal(
      actor,
      roll,
      {
        might: numberValue(allocation, "might"),
        speed: numberValue(allocation, "speed"),
        intellect: numberValue(allocation, "intellect")
      },
      {
        oneHourChoice: stringValue(allocation, "oneHourChoice") as OneHourRestChoice,
        removeMinorsInsteadOfOneModerate: checked(allocation, "exchange"),
        majorTaskSucceeded: checked(allocation, "majorSuccess")
      }
    );
    const restored = roll.total - result.recovery.unspent;
    const removed = result.rest?.result.removed.length ?? 0;
    ui.notifications.info(
      `${game.i18n.localize("CYPHERV2.Recovery.Restored")}: ${restored}; ${game.i18n.localize("CYPHERV2.Rest.Removed")}: ${removed}`
    );
  } catch (error) {
    notifyError(error);
  }
}

export async function promptRally(actor: CharacterDocumentLike): Promise<void> {
  const rally = game.cypherv2.services.rally;
  const current = actor.system.stats.might.value;
  const maximum = actor.system.derived.pools.might.max;
  const minorCost = rally.costFor("minor");
  const moderateCost = rally.costFor("moderate");
  const initialPreview = rally.preview(actor, "minor", minorCost);
  const data = await foundry.applications.api.DialogV2.input({
    window: {title: game.i18n.localize("CYPHERV2.Actions.Rally")},
    content: rallyDialogContent(
      current,
      maximum,
      minorCost,
      moderateCost,
      initialPreview.success ? initialPreview.mightValue : null
    ),
    rejectClose: false,
    ok: {label: game.i18n.localize("CYPHERV2.Actions.Rally")},
    render: (_event: Event, dialog: {element: HTMLElement}) => bindRallyDialog(dialog.element, actor)
  }) as DialogData | null;
  if (!data) return;
  try {
    const result = await game.cypherv2.services.rally.apply(
      actor,
      stringValue(data, "severity") as RallySeverity,
      undefined,
      numberValue(data, "cost")
    );
    if (!result.success) throw new Error(result.failure ?? "Rally failed.");
    ui.notifications.info(`${game.i18n.localize("CYPHERV2.Actions.Rally")}: -${result.cost} Might`);
  } catch (error) {
    notifyError(error);
  }
}

export function rallyDialogContent(
  currentMight: number,
  maximumMight: number,
  minorCost = 2,
  moderateCost = 5,
  afterMight: number | null = null
): string {
  const minor = game.i18n.localize("CYPHERV2.Wounds.Severity.minor");
  const moderate = game.i18n.localize("CYPHERV2.Wounds.Severity.moderate");
  return `<div class="cypherv2 cypherv2-dialog cypherv2-rally-dialog" data-current-might="${currentMight}" data-max-might="${maximumMight}">
    <header class="cypherv2-dialog-heading"><span>${game.i18n.localize("CYPHERV2.Actions.Rally")}</span><strong data-rally-heading>${minor}</strong></header>
    <section class="cypherv2-dialog-section">
      <div class="cypherv2-dialog-button-group" role="radiogroup" aria-label="${game.i18n.localize("CYPHERV2.Wounds.SeverityLabel")}">
        <label class="cypherv2-dialog-toggle"><input type="radio" name="severity" value="minor" data-default-cost="${minorCost}" checked><span>${minor}</span></label>
        <label class="cypherv2-dialog-toggle"><input type="radio" name="severity" value="moderate" data-default-cost="${moderateCost}"><span>${moderate}</span></label>
      </div>
      <label class="cypherv2-dialog-field">${game.i18n.localize("CYPHERV2.Rally.Cost")}
        <input name="cost" type="number" min="0" max="${RALLY_EXECUTION_COST_MAX}" step="1" value="${minorCost}">
      </label>
    </section>
    <section class="cypherv2-dialog-section" aria-label="${game.i18n.localize("CYPHERV2.Roll.Summary")}">
      <div class="cypherv2-dialog-summary-row"><span>${game.i18n.localize("CYPHERV2.Rally.Cost")}</span><strong><span data-rally-cost>${minorCost}</span> Might</strong></div>
      <div class="cypherv2-dialog-summary-row"><span>${game.i18n.localize("CYPHERV2.Rally.CurrentMight")}</span><strong>${currentMight} / ${maximumMight}</strong></div>
      <div class="cypherv2-dialog-summary-row"><span>${game.i18n.localize("CYPHERV2.Rally.AfterRally")}</span><strong><span data-rally-after>${afterMight ?? "—"}</span> / ${maximumMight}</strong></div>
      <p class="cypherv2-dialog-callout is-danger" data-rally-error ${afterMight === null ? "" : "hidden"}>${game.i18n.localize("CYPHERV2.Rally.Unavailable")}</p>
    </section>
  </div>`;
}

export function bindRallyDialog(root: HTMLElement, actor: CharacterDocumentLike): void {
  const cost = root.querySelector<HTMLInputElement>('input[name="cost"]');
  const modes = [...root.querySelectorAll<HTMLInputElement>('input[name="severity"]')];
  const costSummary = root.querySelector<HTMLElement>("[data-rally-cost]");
  const afterSummary = root.querySelector<HTMLElement>("[data-rally-after]");
  const heading = root.querySelector<HTMLElement>("[data-rally-heading]");
  const error = root.querySelector<HTMLElement>("[data-rally-error]");
  const submit = root.querySelector<HTMLButtonElement>('button[data-action="ok"]');
  if (!cost) return;
  const refresh = () => {
    const amount = Number(cost.value);
    const severity = modes.find((mode) => mode.checked)?.value as RallySeverity | undefined;
    const preview = severity
      ? game.cypherv2.services.rally.preview(actor, severity, amount)
      : null;
    if (costSummary) costSummary.textContent = Number.isInteger(amount) ? String(amount) : "—";
    if (afterSummary) afterSummary.textContent = preview?.success ? String(preview.mightValue) : "—";
    if (error) {
      error.hidden = preview?.success === true;
      error.textContent = game.i18n.localize(preview?.failure === "insufficient-might"
        ? "CYPHERV2.Rally.InsufficientMight"
        : preview?.failure === "invalid-cost"
          ? "CYPHERV2.Rally.InvalidCost"
          : "CYPHERV2.Rally.NoWound");
    }
    if (submit) submit.disabled = preview?.success !== true;
  };
  for (const mode of modes) mode.addEventListener("change", () => {
    if (!mode.checked) return;
    cost.value = String(Number(mode.dataset.defaultCost ?? 0));
    if (heading) heading.textContent = mode.nextElementSibling?.textContent ?? mode.value;
    refresh();
  });
  cost.addEventListener("input", refresh);
  refresh();
}

export async function promptCharacterOverride(
  actor: CharacterDocumentLike,
  key: CharacterOverrideKey
): Promise<void> {
  const view = characterOverrideView(actor.system, key);
  const data = await foundry.applications.api.DialogV2.input({
    window: {title: game.i18n.localize("CYPHERV2.Overrides.Edit")},
    content: `<div class="cypherv2 cypherv2-dialog cypherv2-override-dialog">
      <section class="cypherv2-dialog-section">
        <div class="cypherv2-dialog-summary-row"><span>${game.i18n.localize("CYPHERV2.Overrides.Calculated")}</span><strong>${view.calculated}</strong></div>
        <label class="cypherv2-dialog-field">${game.i18n.localize("CYPHERV2.Overrides.Override")}
          <input name="value" type="number" min="${view.minimum}" step="1" value="${view.override ?? view.effective}">
        </label>
        <div class="cypherv2-dialog-summary-row"><span>${game.i18n.localize("CYPHERV2.Overrides.Effective")}</span><strong>${view.effective}</strong></div>
      </section>
    </div>`,
    rejectClose: false,
    ok: {label: game.i18n.localize("CYPHERV2.Actions.Apply")}
  }) as DialogData | null;
  if (!data) return;
  const value = Number(data.value);
  if (!Number.isInteger(value) || value < view.minimum) {
    notifyError(new Error(game.i18n.localize("CYPHERV2.Overrides.Invalid")));
    return;
  }
  await actor.update({[view.path]: value});
}
