import type {DepletionItemLike} from "../depletion/depletion-types";
import {rollItemDepletion} from "../applications/dialogs/depletion-roll";

function canControl(item: Item): boolean {
  return item.actor
    ? item.actor.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)
    : game.user.isGM;
}

export function initializeItemChatController(): void {
  Hooks.on("renderChatMessageHTML", (_message: ChatMessage, html: HTMLElement) => {
    for (const button of html.querySelectorAll<HTMLButtonElement>("[data-action='rollItemCardDepletion']")) {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const uuid = button.dataset.itemUuid;
        const item = uuid ? await fromUuid(uuid) as Item | null : null;
        if (!item || item.type !== "artifact" || !canControl(item)) {
          ui.notifications.warn(game.i18n.localize("CYPHERV2.Inventory.NotAuthorized"));
          return;
        }
        button.disabled = true;
        await rollItemDepletion(item as unknown as DepletionItemLike);
        button.disabled = (item.system as {depleted?: boolean}).depleted === true;
      });
    }
  });
}
