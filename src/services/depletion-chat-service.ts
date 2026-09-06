import type {DepletionItemLike, DepletionRollResult} from "../depletion/depletion-types";
import {chatCardActorImageData} from "./chat-card-presentation";

export class DepletionChatService {
  async publish(item: DepletionItemLike, result: DepletionRollResult): Promise<void> {
    const content = await foundry.applications.handlebars.renderTemplate(
      "systems/cypherv2/templates/chat/depletion-card.hbs",
      {
        itemName: result.itemName,
        ...chatCardActorImageData(item.actor),
        formula: result.formula,
        total: result.total,
        depleted: result.depleted,
        outcome: game.i18n.localize(
          result.depleted ? "CYPHERV2.Depletion.Depleted" : "CYPHERV2.Depletion.NotDepleted"
        )
      }
    );
    const message: Record<string, unknown> = {
      speaker: ChatMessage.getSpeaker(item.actor ? {actor: item.actor} : undefined),
      content
    };
    if (result.chatRoll !== undefined) message.rolls = [result.chatRoll];
    await ChatMessage.create(message);
  }
}
