import type {WoundSeverity} from "../../constants/system";
import type {ShieldItemLike} from "../../services/shield-service";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]!);
}

export async function promptEditShieldWound(
  shield: ShieldItemLike,
  severity: WoundSeverity,
  woundId: string
): Promise<void> {
  const wound = shield.system.wounds[severity].find((entry) => entry.id === woundId);
  if (!wound) throw new Error(`Shield Wound '${woundId}' was not found.`);
  const data = await foundry.applications.api.DialogV2.input({
    window: {title: game.i18n.localize("CYPHERV2.Wounds.EditTitle")},
    content: `<div class="cypherv2-dialog-fields">
      <label>${game.i18n.localize("CYPHERV2.Wounds.Label")}<input name="label" type="text" value="${escapeHtml(wound.label)}"></label>
      <label>${game.i18n.localize("CYPHERV2.Wounds.Description")}<textarea name="description">${escapeHtml(wound.description)}</textarea></label>
    </div>`,
    rejectClose: false,
    ok: {label: game.i18n.localize("CYPHERV2.Actions.Save")}
  }) as Record<string, unknown> | null;
  if (!data) return;
  await game.cypherv2.services.shields.edit(shield, severity, woundId, {
    label: String(data.label ?? ""),
    description: String(data.description ?? "")
  });
}

export async function promptDeleteShieldWound(
  shield: ShieldItemLike,
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
  await game.cypherv2.services.shields.delete(shield, severity, woundId);
}
