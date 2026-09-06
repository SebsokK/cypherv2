import type {PlayerIntrusionRecord} from "../intrusions/player-intrusion-types";
import type {PlayerIntrusionCharacterLike} from "./player-intrusion-service";
import {chatCardActorImageData} from "./chat-card-presentation";

export interface PlayerIntrusionCardData {
  readonly actorName: string;
  readonly xpSpent: number;
}

export function buildPlayerIntrusionCardData(record: PlayerIntrusionRecord): PlayerIntrusionCardData {
  return {actorName: record.actorName, xpSpent: record.xpSpent};
}

export class PlayerIntrusionChatService {
  async publish(
    record: PlayerIntrusionRecord,
    actor: PlayerIntrusionCharacterLike
  ): Promise<ChatMessage> {
    const content = await foundry.applications.handlebars.renderTemplate(
      "systems/cypherv2/templates/chat/player-intrusion-card.hbs",
      {
        ...buildPlayerIntrusionCardData(record),
        ...chatCardActorImageData(actor as unknown as import("./chat-card-presentation").ChatCardActorLike)
      }
    );
    return await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({actor: actor as unknown as Actor}),
      content,
      flags: {cypherv2: {playerIntrusion: record}}
    }) as ChatMessage;
  }
}
