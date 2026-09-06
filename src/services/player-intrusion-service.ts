import {assertCharacter, type CharacterDocumentLike} from "../rules/core/core-types";
import type {PlayerIntrusionRecord} from "../intrusions/player-intrusion-types";

export interface PlayerIntrusionCharacterLike extends CharacterDocumentLike {
  readonly id: string;
  readonly uuid: string;
  readonly name: string;
  readonly img?: string;
}

export class PlayerIntrusionService {
  canUse(actor: PlayerIntrusionCharacterLike): boolean {
    return actor.type === "character" && actor.system.xp >= 1;
  }

  async spend(actor: PlayerIntrusionCharacterLike, requestId: string): Promise<PlayerIntrusionRecord> {
    assertCharacter(actor);
    if (!requestId) throw new Error("A Player Intrusion request ID is required.");
    if (actor.system.xp < 1) throw new Error("Player Intrusion requires 1 XP.");
    await actor.update({"system.xp": actor.system.xp - 1});
    return {
      requestId,
      actorId: actor.id,
      actorUuid: actor.uuid,
      actorName: actor.name,
      xpSpent: 1
    };
  }
}
