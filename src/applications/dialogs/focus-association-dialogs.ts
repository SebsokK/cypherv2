import type {FocusDocumentLike} from "../../focus/focus-types";
import {
  FocusAssociationError,
  type FocusAssociationCharacterLike,
  type FocusAssociationProvenance
} from "../../services/focus-association-service";
import {effectiveTier} from "../../rules/core/character-overrides";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]!);
}

function notify(error: unknown): void {
  const key = error instanceof FocusAssociationError
    ? `CYPHERV2.Focus.Association.Errors.${error.code}`
    : "CYPHERV2.Focus.Errors.Unexpected";
  if (!(error instanceof FocusAssociationError)) console.error(error);
  ui.notifications.error(game.i18n.localize(key));
}

export async function promptAttachFocus(
  actor: FocusAssociationCharacterLike,
  droppedFocus?: FocusDocumentLike
): Promise<void> {
  let focus = droppedFocus;
  if (!focus) {
    const foci = [...game.items]
      .filter((item) => item.type === "focus")
      .sort((left, right) => left.name.localeCompare(right.name));
    if (foci.length === 0) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Focus.Association.NoWorldFoci"));
      return;
    }
    const choice = await foundry.applications.api.DialogV2.input({
      window: {title: game.i18n.localize("CYPHERV2.Focus.Association.Add")},
      content: `<div class="cypherv2-dialog-fields"><label>${game.i18n.localize("CYPHERV2.Focus.Association.Focus")}
        <select name="focusUuid">${foci.map((item) => (
          `<option value="${escapeHtml(item.uuid)}">${escapeHtml(item.name)}</option>`
        )).join("")}</select></label></div>`,
      ok: {label: game.i18n.localize("CYPHERV2.Focus.Association.Add")}
    }) as Record<string, unknown> | null;
    if (!choice) return;
    focus = await fromUuid(String(choice.focusUuid ?? "")) as FocusDocumentLike | null ?? undefined;
  }
  if (!focus) return;
  const creationAllowed = effectiveTier(actor.system) === 1
    && !actor.system.focusProgress.some((entry) => entry.provenance === "creation");
  const mode = await foundry.applications.api.DialogV2.input({
    window: {title: game.i18n.localize("CYPHERV2.Focus.Association.Add")},
    content: `<div class="cypherv2-dialog-fields">
      <p><strong>${escapeHtml(focus.name)}</strong></p>
      <label>${game.i18n.localize("CYPHERV2.Focus.Association.Provenance")}
        <select name="provenance">
          ${creationAllowed ? `<option value="creation">${game.i18n.localize("CYPHERV2.Focus.Association.Creation")}</option>` : ""}
          <option value="additional">${game.i18n.localize("CYPHERV2.Focus.Association.Additional")}</option>
        </select>
      </label>
    </div>`,
    ok: {label: game.i18n.localize("CYPHERV2.Focus.Association.Add")}
  }) as Record<string, unknown> | null;
  if (!mode) return;
  try {
    const result = await game.cypherv2.services.focusAssociations.attach(
      actor,
      focus,
      String(mode.provenance) as FocusAssociationProvenance
    );
    ui.notifications.info(game.i18n.localize(
      result.choicesGranted.length > 0
        ? "CYPHERV2.Focus.Association.Added"
        : "CYPHERV2.Focus.Association.Reattached"
    ));
  } catch (error) {
    notify(error);
  }
}

export async function promptRemoveFocus(
  actor: FocusAssociationCharacterLike,
  focusUuid: string
): Promise<void> {
  const progress = actor.system.focusProgress.find((entry) => entry.focusUuid === focusUuid);
  if (!progress) return;
  const warning = progress.ownedNodeIds.length > 0
    ? game.i18n.format("CYPHERV2.Focus.Association.RemoveOwnedWarning", {count: progress.ownedNodeIds.length})
    : game.i18n.localize("CYPHERV2.Focus.Association.RemoveWarning");
  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: {title: game.i18n.localize("CYPHERV2.Focus.Association.Remove")},
    content: `<div class="cypherv2 cypherv2-dialog"><p>${warning}</p></div>`,
    yes: {label: game.i18n.localize("CYPHERV2.Focus.Association.Remove")},
    no: {label: game.i18n.localize("CYPHERV2.Actions.Cancel")}
  });
  if (!confirmed) return;
  try {
    await game.cypherv2.services.focusAssociations.remove(actor, focusUuid);
    ui.notifications.info(game.i18n.localize("CYPHERV2.Focus.Association.Removed"));
  } catch (error) {
    notify(error);
  }
}
