import type {GenreDocumentLike} from "../../genre/genre-types";
import {GenreAssociationError, GenreChoiceError, type GenreCharacterLike} from "../../services/genre-service";
import {GrantConflictCancelledError} from "../../packages/grant-conflicts";
import {resolveGrantConflictWithDialog} from "./grant-conflict-dialog";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]!);
}

function notify(error: unknown): void {
  if (error instanceof GrantConflictCancelledError) return;
  console.error(error);
  const key = error instanceof GenreAssociationError
    ? `CYPHERV2.Genre.Errors.${error.code}`
    : error instanceof GenreChoiceError
      ? `CYPHERV2.Genre.Errors.${error.code}`
      : "CYPHERV2.Genre.Errors.unexpected";
  ui.notifications.error(game.i18n.localize(key));
}

export async function promptAttachGenre(
  actor: GenreCharacterLike,
  dropped?: GenreDocumentLike,
  provenance: "manual" | "typeSuggestion" | "migration" = "manual"
): Promise<void> {
  let genre = dropped;
  if (!genre) {
    const genres = [...game.items]
      .filter((item) => item.type === "genre")
      .sort((left, right) => left.name.localeCompare(right.name));
    if (!genres.length) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Genre.NoWorldGenres"));
      return;
    }
    const data = await foundry.applications.api.DialogV2.input({
      window: {title: game.i18n.localize("CYPHERV2.Genre.Add")},
      content: `<div class="cypherv2-dialog-fields"><label>${game.i18n.localize("CYPHERV2.Genre.Label")}<select name="uuid">${genres.map((item) => `<option value="${escapeHtml(item.uuid)}">${escapeHtml(item.name)}</option>`).join("")}</select></label></div>`,
      ok: {label: game.i18n.localize("CYPHERV2.Actions.Add")}
    }) as Record<string, unknown> | null;
    if (!data) return;
    genre = await fromUuid(String(data.uuid ?? "")) as GenreDocumentLike | null ?? undefined;
  }
  if (!genre) return;
  if (actor.system.genre.sourceUuid && actor.system.genre.sourceUuid !== genre.uuid) {
    const replace = await foundry.applications.api.DialogV2.confirm({
      window: {title: game.i18n.localize("CYPHERV2.Genre.Replace")},
      content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.localize("CYPHERV2.Genre.ReplaceConfirm")}</p></div>`,
      yes: {label: game.i18n.localize("CYPHERV2.Packages.Replace")},
      no: {label: game.i18n.localize("CYPHERV2.Actions.Cancel")}
    });
    if (!replace) return;
  }
  try {
    await game.cypherv2.services.genres.attach(actor, genre, provenance);
    ui.notifications.info(game.i18n.localize("CYPHERV2.Genre.Attached"));
  } catch (error) { notify(error); }
}

export async function promptRemoveGenre(actor: GenreCharacterLike): Promise<void> {
  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: {title: game.i18n.localize("CYPHERV2.Genre.Remove")},
    content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.localize("CYPHERV2.Genre.RemoveConfirm")}</p></div>`,
    yes: {label: game.i18n.localize("CYPHERV2.Actions.Remove")},
    no: {label: game.i18n.localize("CYPHERV2.Actions.Cancel")}
  });
  if (!confirmed) return;
  try {
    await game.cypherv2.services.genres.remove(actor);
    ui.notifications.info(game.i18n.localize("CYPHERV2.Genre.Removed"));
  } catch (error) { notify(error); }
}

export async function promptGenreChoice(actor: GenreCharacterLike, choiceId: string): Promise<void> {
  try {
    const genre = await game.cypherv2.services.genres.active(actor);
    if (!genre) throw new GenreChoiceError("genre-required", "Attach a Genre first.");
    const choice = actor.system.advancement.pendingGenreChoices.find((entry) => entry.id === choiceId);
    if (!choice) throw new GenreChoiceError("choice-missing", "Choice not found.");
    const entries = game.cypherv2.services.genres.eligibleEntries(actor, genre, choice);
    if (!entries.length) throw new GenreChoiceError("entry-ineligible", "No eligible Genre Ability is available.");
    const data = await foundry.applications.api.DialogV2.input({
      window: {title: game.i18n.localize("CYPHERV2.Genre.ChooseAbility")},
      content: `<div class="cypherv2-dialog-fields"><p><strong>${escapeHtml(genre.name)}</strong></p><label>${game.i18n.localize("CYPHERV2.Genre.Ability")}<select name="entryId">${entries.map((entry) => `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.snapshot.name)} (${game.i18n.localize("CYPHERV2.Focus.Tier")} ${entry.minimumTier})</option>`).join("")}</select></label></div>`,
      ok: {label: game.i18n.localize("CYPHERV2.Genre.Acquire")}
    }) as Record<string, unknown> | null;
    if (!data) return;
    await game.cypherv2.services.genres.acquire(
      actor,
      choice.id,
      String(data.entryId ?? ""),
      resolveGrantConflictWithDialog
    );
    ui.notifications.info(game.i18n.localize("CYPHERV2.Genre.AbilityAcquired"));
  } catch (error) { notify(error); }
}

/** Character-facing permissive browser. It never reads or consumes pending choices. */
export async function promptGenreAbilityBrowser(actor: GenreCharacterLike): Promise<void> {
  try {
    const genre = await game.cypherv2.services.genres.active(actor);
    if (!genre) throw new GenreChoiceError("genre-required", "Attach a Genre first.");
    const entries = game.cypherv2.services.genres.manualCatalog(actor, genre);
    if (!entries.length) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Genre.NoCatalogAbilities"));
      return;
    }
    const content = `<div class="cypherv2 genre-ability-browser">
      <p class="genre-browser-source"><strong>${escapeHtml(genre.name)}</strong></p>
      <div class="genre-browser-list">${entries.map((entry, index) => `
        <label class="genre-browser-entry${entry.owned ? " is-owned" : ""}${entry.normallyAvailable ? "" : " is-future"}">
          <input type="radio" name="entryId" value="${escapeHtml(entry.id)}"${index === 0 ? " checked" : ""}>
          <span><strong>${escapeHtml(entry.name)}</strong><small>${game.i18n.localize("CYPHERV2.Genre.MinimumTier")} ${entry.minimumTier}</small></span>
          <em>${game.i18n.localize(entry.owned
            ? "CYPHERV2.Genre.Browser.Owned"
            : entry.normallyAvailable
              ? "CYPHERV2.Genre.Browser.Available"
              : "CYPHERV2.Genre.Browser.HigherTier")}</em>
        </label>`).join("")}</div>
      <p class="hint">${game.i18n.localize("CYPHERV2.Genre.Browser.GuidanceOnly")}</p>
    </div>`;
    const data = await foundry.applications.api.DialogV2.input({
      window: {title: game.i18n.localize("CYPHERV2.Genre.AddAbilities")},
      content,
      ok: {label: game.i18n.localize("CYPHERV2.Actions.Confirm")}
    }) as Record<string, unknown> | null;
    if (!data) return;
    const entryId = String(data.entryId ?? "");
    const selected = entries.find((entry) => entry.id === entryId);
    if (!selected) return;
    if (!selected.owned) {
      await game.cypherv2.services.genres.acquireManual(
        actor,
        entryId,
        resolveGrantConflictWithDialog
      );
      ui.notifications.info(game.i18n.localize("CYPHERV2.Genre.AbilityAcquired"));
      return;
    }

    const undo = await foundry.applications.api.DialogV2.confirm({
      window: {title: game.i18n.localize("CYPHERV2.Genre.Browser.Undo")},
      content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Genre.Browser.UndoConfirm", {name: escapeHtml(selected.name)})}</p></div>`,
      yes: {label: game.i18n.localize("CYPHERV2.Genre.Browser.Undo")},
      no: {label: game.i18n.localize("CYPHERV2.Actions.Cancel")}
    });
    if (!undo) return;
    const deleteAbility = Boolean(await foundry.applications.api.DialogV2.confirm({
      window: {title: game.i18n.localize("CYPHERV2.Genre.Browser.DeleteTitle")},
      content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.localize("CYPHERV2.Genre.Browser.DeletePrompt")}</p></div>`,
      yes: {label: game.i18n.localize("CYPHERV2.Genre.Browser.DeleteAbility")},
      no: {label: game.i18n.localize("CYPHERV2.Genre.Browser.KeepAbility")}
    }));
    await game.cypherv2.services.genres.undoManual(actor, entryId, deleteAbility);
    ui.notifications.info(game.i18n.localize("CYPHERV2.Genre.Browser.UndoCompleted"));
  } catch (error) { notify(error); }
}
