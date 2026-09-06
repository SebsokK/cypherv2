import type {
  GrantConflict,
  GrantConflictResolution,
  GrantReplacementOption
} from "../../packages/grant-conflicts";

type DialogData = Record<string, unknown>;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]!);
}

function rankLabel(rank: string): string {
  if (!rank) return "";
  return game.i18n.localize(`CYPHERV2.Skill.Ranks.${rank}`);
}

function documentSnapshot(item: Item): GrantReplacementOption["snapshot"] {
  const source = item.toObject() as {img?: string; system?: Record<string, unknown>};
  return {
    name: item.name,
    ...(source.img ? {img: source.img} : {}),
    system: structuredClone(source.system ?? {})
  };
}

async function replacementFromUuid(
  conflict: GrantConflict,
  uuid: string,
  selectionKind: "world" | "compendium"
): Promise<GrantConflictResolution | null> {
  const document = uuid ? await fromUuid(uuid) : null;
  if (!(document instanceof Item) || document.type !== conflict.type) {
    ui.notifications.warn(game.i18n.localize("CYPHERV2.GrantConflict.InvalidReplacement"));
    return null;
  }
  return {
    action: "replace",
    selectionKind,
    replacement: {
      id: document.uuid,
      type: conflict.type,
      name: document.name,
      itemUuid: document.uuid,
      snapshot: documentSnapshot(document),
      reason: game.i18n.localize(selectionKind === "compendium"
        ? "CYPHERV2.GrantConflict.CompendiumItem"
        : "CYPHERV2.GrantConflict.WorldItem"),
      reasonSourceUuid: document.uuid
    }
  };
}

/** Interactive Foundry adapter. Services remain UI-agnostic and receive this callback explicitly. */
export async function resolveGrantConflictWithDialog(conflict: GrantConflict): Promise<GrantConflictResolution> {
  const worldItems = [...game.items]
    .filter((item) => item.type === conflict.type)
    .filter((item) => item.uuid !== conflict.existing.contentUuid && item.uuid !== conflict.proposed.contentUuid)
    .sort((left, right) => left.name.localeCompare(right.name));
  const suggestionRows = conflict.suggestions.length
    ? conflict.suggestions.map((suggestion) => `
      <label class="grant-conflict-option">
        <input type="radio" name="resolution" value="suggestion:${escapeHtml(suggestion.id)}">
        <span><strong>${escapeHtml(suggestion.name)}</strong><small>${escapeHtml(suggestion.reason)}</small></span>
      </label>`).join("")
    : `<p class="empty-list">${game.i18n.localize("CYPHERV2.GrantConflict.NoSuggestions")}</p>`;
  const typeLabel = game.i18n.localize(conflict.type === "skill"
    ? "CYPHERV2.GrantConflict.Skill"
    : "CYPHERV2.GrantConflict.Ability");
  const existingRank = conflict.existing.rank ? ` — ${escapeHtml(rankLabel(conflict.existing.rank))}` : "";
  const proposedRank = conflict.proposed.rank ? ` — ${escapeHtml(rankLabel(conflict.proposed.rank))}` : "";
  const externalChoices = game.user.isGM ? `
      <label class="grant-conflict-option"><input type="radio" name="resolution" value="world"><span>${game.i18n.localize("CYPHERV2.GrantConflict.WorldItem")}</span></label>
      <select name="worldUuid">${worldItems.map((item) => `<option value="${escapeHtml(item.uuid)}">${escapeHtml(item.name)}</option>`).join("")}</select>
      <label class="grant-conflict-option"><input type="radio" name="resolution" value="uuid"><span>${game.i18n.localize("CYPHERV2.GrantConflict.CompendiumUuid")}</span></label>
      <input name="documentUuid" type="text" placeholder="Compendium.world.pack.Item.id">`
    : `<p class="hint">${game.i18n.localize("CYPHERV2.GrantConflict.GmExternalOnly")}</p>`;
  const replacementFields = conflict.context === "package" ? `<fieldset><legend>${game.i18n.format("CYPHERV2.GrantConflict.ChooseAnother", {type: typeLabel})}</legend>
      ${externalChoices}
      ${conflict.allowCustom ? `<label class="grant-conflict-option"><input type="radio" name="resolution" value="custom"><span>${game.i18n.localize("CYPHERV2.GrantConflict.CustomSkill")}</span></label><input name="customName" type="text" placeholder="${game.i18n.localize("CYPHERV2.GrantConflict.CustomSkillName")}">` : `<p class="hint">${game.i18n.localize("CYPHERV2.GrantConflict.NoCustomAbility")}</p>`}
    </fieldset>` : `<p class="hint">${game.i18n.localize("CYPHERV2.GrantConflict.FocusRestriction")}</p>`;
  const content = `<div class="cypherv2 cypherv2-dialog grant-conflict-dialog">
    <div class="grant-conflict-comparison">
      <p><span>${game.i18n.localize("CYPHERV2.GrantConflict.AlreadyHave")}</span><strong>${escapeHtml(conflict.existing.name)}${existingRank}</strong></p>
      <p><span>${game.i18n.format("CYPHERV2.GrantConflict.WouldGrant", {source: escapeHtml(conflict.packageName)})}</span><strong>${escapeHtml(conflict.proposed.name)}${proposedRank}</strong></p>
    </div>
    <fieldset><legend>${game.i18n.localize("CYPHERV2.GrantConflict.Suggested")}</legend>${suggestionRows}</fieldset>
    ${replacementFields}
    ${conflict.allowSuppress ? `<label class="grant-conflict-option suppress"><input type="radio" name="resolution" value="suppress" checked><span>${game.i18n.localize("CYPHERV2.GrantConflict.Suppress")}</span></label>` : ""}
    ${conflict.allowGmOverride && game.user.isGM ? `<label class="grant-conflict-option"><input type="radio" name="resolution" value="gmOverride"><span>${game.i18n.localize("CYPHERV2.GrantConflict.GmOverride")}</span></label>` : ""}
  </div>`;

  while (true) {
    const data = await foundry.applications.api.DialogV2.input({
      window: {title: game.i18n.localize("CYPHERV2.GrantConflict.Title")},
      content,
      ok: {label: game.i18n.localize("CYPHERV2.Actions.Confirm")}
    }) as DialogData | null;
    if (!data) return {action: "cancel"};
    const resolution = String(data.resolution ?? "");
    if (resolution === "suppress" && conflict.allowSuppress) return {action: "suppress"};
    if (resolution === "gmOverride" && conflict.allowGmOverride && game.user.isGM) return {action: "gmOverride"};
    if (resolution.startsWith("suggestion:")) {
      const suggestion = conflict.suggestions.find((entry) => entry.id === resolution.slice(11));
      if (suggestion) return {action: "replace", replacement: suggestion, selectionKind: "suggested"};
    }
    if (resolution === "world") {
      const selected = await replacementFromUuid(conflict, String(data.worldUuid ?? ""), "world");
      if (selected) return selected;
    }
    if (resolution === "uuid") {
      const uuid = String(data.documentUuid ?? "").trim();
      const selected = await replacementFromUuid(conflict, uuid, uuid.startsWith("Compendium.") ? "compendium" : "world");
      if (selected) return selected;
    }
    if (resolution === "custom" && conflict.type === "skill" && conflict.allowCustom) {
      const name = String(data.customName ?? "").trim();
      if (name) return {
        action: "replace",
        selectionKind: "custom",
        replacement: {
          id: `custom:${name.toLocaleLowerCase()}`,
          type: "skill",
          name,
          itemUuid: "",
          snapshot: {name, system: {}},
          reason: game.i18n.localize("CYPHERV2.GrantConflict.CustomSkill"),
          reasonSourceUuid: "",
          custom: true
        }
      };
    }
    ui.notifications.warn(game.i18n.localize("CYPHERV2.GrantConflict.SelectResolution"));
  }
}
