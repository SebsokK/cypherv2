import type {NpcModificationData, NpcTargetLike} from "../../combat/combat-types";
import {defaultIdFactory} from "../../rules/core/core-types";

type DialogData = Record<string, unknown>;

function field(data: DialogData, key: string): string {
  return String(data[key] ?? "");
}

function escape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function promptModification(
  existing?: NpcModificationData
): Promise<NpcModificationData | null> {
  const data = await foundry.applications.api.DialogV2.input({
    window: {title: game.i18n.localize(existing ? "CYPHERV2.Combat.Modification.Edit" : "CYPHERV2.Combat.Modification.Create")},
    content: `<div class="cypherv2-dialog-fields">
      <label>${game.i18n.localize("CYPHERV2.Common.Name")} <input name="label" type="text" value="${escape(existing?.label ?? "")}"></label>
      <label>${game.i18n.localize("CYPHERV2.Combat.Modification.Contexts")} <input name="contexts" type="text" value="${escape(existing?.contexts.join(", ") ?? "defense.speed")}"></label>
      <label>${game.i18n.localize("CYPHERV2.Combat.Modification.ModeLabel")}
        <select name="mode">
          ${["levelOverride", "levelDelta", "ease", "hinder"].map((mode) => `<option value="${mode}"${existing?.mode === mode ? " selected" : ""}>${game.i18n.localize(`CYPHERV2.Combat.Modification.Mode.${mode}`)}</option>`).join("")}
        </select>
      </label>
      <label>${game.i18n.localize("CYPHERV2.Combat.Modification.Value")} <input name="value" type="number" step="1" value="${existing?.value ?? 0}"></label>
      <label>${game.i18n.localize("CYPHERV2.Combat.Modification.Predicate")} <textarea name="predicate">${escape(JSON.stringify(existing?.predicate ?? {}))}</textarea></label>
      <label>${game.i18n.localize("CYPHERV2.Combat.Modification.Visibility")}
        <select name="visibility"><option value="gm">${game.i18n.localize("CYPHERV2.Combat.Modification.Gm")}</option><option value="public"${existing?.visibility === "public" ? " selected" : ""}>${game.i18n.localize("CYPHERV2.Combat.Modification.Public")}</option></select>
      </label>
      <label>${game.i18n.localize("CYPHERV2.Common.Description")} <textarea name="description">${escape(existing?.description ?? "")}</textarea></label>
    </div>`,
    rejectClose: false,
    ok: {label: game.i18n.localize("CYPHERV2.Actions.Save")}
  }) as DialogData | null;
  if (!data) return null;
  const predicate = JSON.parse(field(data, "predicate") || "{}") as unknown;
  if (!predicate || typeof predicate !== "object" || Array.isArray(predicate)) {
    throw new Error("NPC modification predicate must be a JSON object.");
  }
  const mode = field(data, "mode") as NpcModificationData["mode"];
  return {
    id: existing?.id ?? defaultIdFactory(),
    label: field(data, "label"),
    contexts: field(data, "contexts").split(",").map((entry) => entry.trim()).filter(Boolean),
    mode,
    value: Number(field(data, "value")),
    visibility: field(data, "visibility") === "public" ? "public" : "gm",
    predicate: predicate as Record<string, unknown>,
    description: field(data, "description")
  };
}

export async function createNpcModification(actor: NpcTargetLike): Promise<void> {
  try {
    const modification = await promptModification();
    if (!modification) return;
    await actor.update({"system.modifications": [...actor.system.modifications, modification]});
  } catch (error) {
    ui.notifications.error(error instanceof Error ? error.message : String(error));
  }
}

export async function editNpcModification(actor: NpcTargetLike, id: string): Promise<void> {
  try {
    const existing = actor.system.modifications.find((modification) => modification.id === id);
    if (!existing) throw new Error(`NPC modification '${id}' was not found.`);
    const modification = await promptModification(existing);
    if (!modification) return;
    await actor.update({
      "system.modifications": actor.system.modifications.map((entry) => (
        entry.id === id ? modification : entry
      ))
    });
  } catch (error) {
    ui.notifications.error(error instanceof Error ? error.message : String(error));
  }
}

export async function deleteNpcModification(actor: NpcTargetLike, id: string): Promise<void> {
  const existing = actor.system.modifications.find((modification) => modification.id === id);
  if (!existing) throw new Error(`NPC modification '${id}' was not found.`);
  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: {title: game.i18n.localize("CYPHERV2.Combat.Modification.Delete")},
    content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Combat.Modification.DeleteConfirm", {name: existing.label})}</p></div>`,
    yes: {label: game.i18n.localize("CYPHERV2.Actions.Delete")},
    no: {label: game.i18n.localize("CYPHERV2.Actions.Cancel")}
  });
  if (confirmed) {
    await actor.update({
      "system.modifications": actor.system.modifications.filter((entry) => entry.id !== id)
    });
  }
}
