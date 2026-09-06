import type {FocusDocumentLike} from "./focus-types";

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    "\"": "&quot;"
  })[character]!);
}

export async function openFocusNode(focus: FocusDocumentLike, nodeId: string): Promise<void> {
  const node = focus.system.graph.nodes.find((entry) => entry.id === nodeId);
  if (!node) throw new Error(`Focus node '${nodeId}' was not found.`);
  if (node.abilityUuid) {
    try {
      const ability = await fromUuid(node.abilityUuid) as {
        readonly sheet?: {render(force?: boolean): unknown};
      } | null;
      if (ability?.sheet) {
        await ability.sheet.render(true);
        return;
      }
    } catch {
      // Invalid or unavailable source UUIDs intentionally fall back to the snapshot.
    }
  }
  const rawName = node.abilitySnapshot.name || node.id;
  const name = escapeHtml(rawName);
  const description = node.abilitySnapshot.description || game.i18n.localize("CYPHERV2.Focus.MissingAbility");
  await foundry.applications.api.DialogV2.input({
    window: {title: rawName},
    content: `<div class="cypherv2 cypherv2-dialog cypherv2-focus-snapshot"><h3>${name}</h3><div>${description}</div></div>`,
    rejectClose: false,
    ok: {label: game.i18n.localize("CYPHERV2.Actions.Close")}
  });
}
