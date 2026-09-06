import {SYSTEM_ID} from "../constants/system";
import {defaultIdFactory} from "../rules/core/core-types";
import type {PlayerIntrusionChatService} from "../services/player-intrusion-chat-service";
import type {
  PlayerIntrusionCharacterLike,
  PlayerIntrusionService
} from "../services/player-intrusion-service";

const SOCKET_NAME = "system." + SYSTEM_ID;

interface PlayerIntrusionUserLike {
  readonly id: string;
  readonly isGM: boolean;
  readonly active: boolean;
}

interface ControlledPlayerIntrusionCharacter extends PlayerIntrusionCharacterLike {
  testUserPermission(user: PlayerIntrusionUserLike, level: number): boolean;
}

type PlayerIntrusionSocketMessage =
  | {
      type: "player-intrusion-request";
      requestId: string;
      actorUuid: string;
      requesterUserId: string;
    }
  | {
      type: "player-intrusion-result";
      requestId: string;
      recipientUserId: string;
      success: boolean;
      error?: string;
    };

function users(): PlayerIntrusionUserLike[] {
  return [...game.users];
}

function primaryGM(): PlayerIntrusionUserLike | null {
  return users()
    .filter((user) => user.active && user.isGM)
    .sort((left, right) => left.id.localeCompare(right.id))[0] ?? null;
}

function canControl(actor: ControlledPlayerIntrusionCharacter, user: PlayerIntrusionUserLike): boolean {
  return user.isGM || actor.testUserPermission(user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
}

function completedRequest(requestId: string): boolean {
  return [...game.messages].some((message) => {
    const flag = message.getFlag(SYSTEM_ID, "playerIntrusion");
    return Boolean(flag && typeof flag === "object"
      && (flag as {requestId?: unknown}).requestId === requestId);
  });
}

export class PlayerIntrusionController {
  readonly #service: PlayerIntrusionService;
  readonly #chat: PlayerIntrusionChatService;
  readonly #activeActors = new Set<string>();
  readonly #activeRequests = new Set<string>();

  constructor(service: PlayerIntrusionService, chat: PlayerIntrusionChatService) {
    this.#service = service;
    this.#chat = chat;
  }

  initialize(): void {
    game.socket.on(SOCKET_NAME, (message: unknown) => {
      void this.#onSocket(message);
    });
  }

  async activate(actor: ControlledPlayerIntrusionCharacter): Promise<boolean> {
    if (!canControl(actor, game.user)) {
      throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Player.NotAuthorized"));
    }
    if (!this.#service.canUse(actor)) {
      throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Player.RequiresXP"));
    }
    if (this.#activeActors.has(actor.uuid)) return false;
    this.#activeActors.add(actor.uuid);
    try {
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: {title: game.i18n.localize("CYPHERV2.Intrusion.Player.Title")},
        content: '<div class="cypherv2 cypherv2-dialog player-intrusion-dialog"><p>'
          + game.i18n.localize("CYPHERV2.Intrusion.Player.ConfirmPrompt")
          + "</p></div>",
        yes: {label: game.i18n.localize("CYPHERV2.Intrusion.Player.Confirm")},
        no: {label: game.i18n.localize("CYPHERV2.Intrusion.Player.Cancel")}
      });
      if (!confirmed) return false;
      const requestId = defaultIdFactory();
      const gm = primaryGM();
      if (gm && gm.id !== game.user.id) {
        game.socket.emit(SOCKET_NAME, {
          type: "player-intrusion-request",
          requestId,
          actorUuid: actor.uuid,
          requesterUserId: game.user.id
        });
      } else {
        await this.#execute(requestId, actor.uuid, game.user.id);
      }
      return true;
    } finally {
      this.#activeActors.delete(actor.uuid);
    }
  }

  async #execute(requestId: string, actorUuid: string, requesterUserId: string): Promise<void> {
    if (this.#activeRequests.has(requestId) || completedRequest(requestId)) return;
    this.#activeRequests.add(requestId);
    try {
      const resolved = await fromUuid(actorUuid);
      const actor = resolved as ControlledPlayerIntrusionCharacter | null;
      if (!actor || actor.type !== "character" || actor.uuid !== actorUuid) {
        throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Player.CharacterMissing"));
      }
      const requester = users().find((user) => user.id === requesterUserId && user.active);
      if (!requester || !canControl(actor, requester)) {
        throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Player.NotAuthorized"));
      }
      const record = await this.#service.spend(actor, requestId);
      await this.#chat.publish(record, actor);
      Hooks.callAll("cypherv2PlayerIntrusionCreated", record, actor);
    } finally {
      this.#activeRequests.delete(requestId);
    }
  }

  async #onSocket(message: unknown): Promise<void> {
    if (!message || typeof message !== "object") return;
    const type = (message as {type?: unknown}).type;
    if (type !== "player-intrusion-request" && type !== "player-intrusion-result") return;
    const playerMessage = message as PlayerIntrusionSocketMessage;
    if (playerMessage.type === "player-intrusion-result") {
      if (playerMessage.recipientUserId === game.user.id && !playerMessage.success && playerMessage.error) {
        ui.notifications.error(playerMessage.error);
      }
      return;
    }
    const gm = primaryGM();
    if (!game.user.isGM || gm?.id !== game.user.id) return;
    try {
      await this.#execute(playerMessage.requestId, playerMessage.actorUuid, playerMessage.requesterUserId);
      game.socket.emit(SOCKET_NAME, {
        type: "player-intrusion-result",
        requestId: playerMessage.requestId,
        recipientUserId: playerMessage.requesterUserId,
        success: true
      });
    } catch (error) {
      game.socket.emit(SOCKET_NAME, {
        type: "player-intrusion-result",
        requestId: playerMessage.requestId,
        recipientUserId: playerMessage.requesterUserId,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

let controller: PlayerIntrusionController | null = null;

export function initializePlayerIntrusionController(
  service: PlayerIntrusionService,
  chat: PlayerIntrusionChatService
): PlayerIntrusionController {
  controller = new PlayerIntrusionController(service, chat);
  controller.initialize();
  return controller;
}

export function playerIntrusionController(): PlayerIntrusionController {
  if (!controller) throw new Error("Player Intrusion controller is not ready.");
  return controller;
}
