import {gmIntrusionController} from "../../intrusions/gm-intrusion-controller";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function checked(value: unknown): boolean {
  return value === true || value === "true" || value === "on";
}

export async function promptManualGMIntrusion(): Promise<void> {
  if (!game.user.isGM) throw new Error("Only a GM can initiate a GM Intrusion.");
  const characters = [...game.actors]
    .filter((actor) => actor.type === "character")
    .sort((left, right) => left.name.localeCompare(right.name));
  if (characters.length === 0) {
    ui.notifications.warn(game.i18n.localize("CYPHERV2.Intrusion.NoCharacters"));
    return;
  }
  const targetedOptions = characters.map((actor) => (
    '<option value="' + actor.id + '">' + escapeHtml(actor.name) + "</option>"
  )).join("");
  const groupOptions = characters.map((actor) => (
    '<label class="intrusion-character-choice"><input name="group-' + actor.id
      + '" type="checkbox"> ' + escapeHtml(actor.name) + "</label>"
  )).join("");
  const content = [
    '<div class="cypherv2-dialog-fields cypherv2-intrusion-dialog">',
    "<label>" + game.i18n.localize("CYPHERV2.Intrusion.ModeLabel"),
    '<select name="mode">',
    '<option value="targeted">' + game.i18n.localize("CYPHERV2.Intrusion.Mode.targeted") + "</option>",
    '<option value="group">' + game.i18n.localize("CYPHERV2.Intrusion.Mode.group") + "</option>",
    '<option value="free">' + game.i18n.localize("CYPHERV2.Intrusion.Mode.free") + "</option>",
    "</select></label>",
    '<label data-intrusion-selection="single">' + game.i18n.localize("CYPHERV2.Intrusion.Character"),
    '<select name="targetActorId">' + targetedOptions + "</select></label>",
    '<fieldset data-intrusion-selection="group" hidden>',
    "<legend>" + game.i18n.localize("CYPHERV2.Intrusion.GroupCharacters") + "</legend>",
    groupOptions,
    "</fieldset></div>"
  ].join("");
  const data = await foundry.applications.api.DialogV2.input({
    window: {title: game.i18n.localize("CYPHERV2.Intrusion.ManualTitle")},
    content,
    rejectClose: false,
    ok: {label: game.i18n.localize("CYPHERV2.Intrusion.Create")},
    render: (_event: Event, dialog: {element: HTMLElement}) => {
      const mode = dialog.element.querySelector<HTMLSelectElement>('[name="mode"]');
      const single = dialog.element.querySelector<HTMLElement>('[data-intrusion-selection="single"]');
      const group = dialog.element.querySelector<HTMLElement>('[data-intrusion-selection="group"]');
      const update = (): void => {
        const groupMode = mode?.value === "group";
        if (single) single.hidden = groupMode;
        if (group) group.hidden = !groupMode;
      };
      mode?.addEventListener("change", update);
      update();
    }
  }) as Record<string, unknown> | null;
  if (!data) return;
  const mode = data.mode === "group" || data.mode === "free" ? data.mode : "targeted";
  const actorIds = mode === "group"
    ? characters.filter((actor) => checked(data["group-" + actor.id])).map((actor) => actor.id)
    : [String(data.targetActorId ?? "")];
  try {
    await gmIntrusionController().createManual({mode, actorIds});
  } catch (error) {
    ui.notifications.error(error instanceof Error ? error.message : String(error));
  }
}
