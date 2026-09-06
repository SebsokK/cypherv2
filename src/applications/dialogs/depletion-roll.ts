import type {DepletionItemLike} from "../../depletion/depletion-types";

export async function rollItemDepletion(item: DepletionItemLike): Promise<void> {
  try {
    const result = await game.cypherv2.services.depletion.roll(item);
    await game.cypherv2.services.depletionChat.publish(item, result);
  } catch (error) {
    ui.notifications.error(error instanceof Error ? error.message : String(error));
  }
}
