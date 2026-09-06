import {DEFENSE_TYPES, SYSTEM_ID, type DefenseType} from "../constants/system";
import type {CombatOutcomeAction, DefenseRequestData} from "./combat-chat-types";
import type {NpcTargetLike} from "./combat-types";
import type {CombatCharacterLike} from "../services/combat-service";
import {promptDefenseRoll} from "../applications/dialogs/combat-dialogs";
import {
  actorWithTargetIdentity,
  immediateTargetActor,
  resolveTargetActor
} from "./combat-targets";
import type {CombatTargetIdentity} from "./combat-types";

const SOCKET = `system.${SYSTEM_ID}`;

interface ResolveDefenseRequestMessage {
  readonly type: "resolveDefenseRequest";
  readonly messageId: string;
}

function canControl(actor: Actor): boolean {
  return game.user.isGM || actor.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
}

function notifyMissingAuthoritativeToken(identity: CombatTargetIdentity): void {
  if (identity.tokenId || identity.tokenUuid) {
    ui.notifications.error(game.i18n.localize("CYPHERV2.Combat.Errors.OriginalTokenMissing"));
  }
}

function actionIdentity(action: CombatOutcomeAction): CombatTargetIdentity {
  return {
    actorId: action.targetActorId,
    ...(action.targetActorUuid ? {actorUuid: action.targetActorUuid} : {}),
    ...(action.targetTokenId ? {tokenId: action.targetTokenId} : {}),
    ...(action.targetTokenUuid ? {tokenUuid: action.targetTokenUuid} : {})
  };
}

function requestTargetIdentity(request: DefenseRequestData): CombatTargetIdentity {
  return {
    actorId: request.targetActorId,
    ...(request.targetActorUuid ? {actorUuid: request.targetActorUuid} : {}),
    ...(request.targetTokenId ? {tokenId: request.targetTokenId} : {}),
    ...(request.targetTokenUuid ? {tokenUuid: request.targetTokenUuid} : {})
  };
}

function requestSourceIdentity(request: DefenseRequestData): CombatTargetIdentity {
  return {
    actorId: request.sourceActorId,
    ...(request.sourceActorUuid ? {actorUuid: request.sourceActorUuid} : {}),
    ...(request.sourceTokenId ? {tokenId: request.sourceTokenId} : {}),
    ...(request.sourceTokenUuid ? {tokenUuid: request.sourceTokenUuid} : {})
  };
}

function outcomeAction(message: ChatMessage): CombatOutcomeAction | null {
  const value = message.getFlag(SYSTEM_ID, "combatAction");
  if (!value || typeof value !== "object") return null;
  const action = value as Partial<CombatOutcomeAction>;
  if (action.kind !== "npcDamage" && action.kind !== "characterWound" && action.kind !== "shieldWound") return null;
  if (typeof action.targetActorId !== "string" || typeof action.applied !== "boolean") return null;
  return value as CombatOutcomeAction;
}

function defenseRequest(message: ChatMessage): DefenseRequestData | null {
  const value = message.getFlag(SYSTEM_ID, "defenseRequest");
  if (!value || typeof value !== "object") return null;
  const request = value as Partial<DefenseRequestData>;
  if (request.kind !== "defenseRequest") return null;
  if (typeof request.sourceActorId !== "string" || typeof request.targetActorId !== "string") return null;
  return value as DefenseRequestData;
}

export async function applyCombatOutcome(message: ChatMessage, button: HTMLButtonElement): Promise<void> {
  const action = outcomeAction(message);
  if (!action || action.applied) return;
  const identity = actionIdentity(action);
  const target = await resolveTargetActor(identity);
  if (!target) {
    notifyMissingAuthoritativeToken(identity);
    return;
  }
  if (!canControl(target)) return;
  const exactTarget = actorWithTargetIdentity(target, identity);
  button.disabled = true;
  try {
    if (action.kind === "npcDamage") {
      await game.cypherv2.services.combat.applyNpcDamage(
        exactTarget as unknown as NpcTargetLike,
        action.requestedDamage
      );
      ui.notifications.info(game.i18n.localize("CYPHERV2.Combat.DamageApplied"));
    } else if (action.kind === "characterWound") {
      const source = action.sourceActorId
        ? {id: action.sourceActorId, name: action.sourceName ?? "NPC"}
        : undefined;
      await game.cypherv2.services.combat.applyCharacterWound(
        exactTarget as unknown as CombatCharacterLike,
        action.severity,
        source
      );
      ui.notifications.info(game.i18n.localize("CYPHERV2.Combat.WoundApplied"));
    } else {
      const shield = target.items.get(action.shieldId);
      if (!shield || shield.type !== "shield") throw new Error("Resolved Shield Item not found.");
      const source = action.sourceActorId
        ? {id: action.sourceActorId, name: action.sourceName ?? "NPC"}
        : undefined;
      await game.cypherv2.services.combat.applyShieldWound(
        exactTarget as unknown as CombatCharacterLike,
        shield as unknown as import("../services/shield-service").ShieldItemLike,
        action.severity,
        source
      );
      ui.notifications.info(game.i18n.localize("CYPHERV2.Combat.WoundApplied"));
    }
    await message.setFlag(SYSTEM_ID, "combatAction", {...action, applied: true});
    button.textContent = game.i18n.localize("CYPHERV2.Combat.Applied");
  } catch (error) {
    button.disabled = false;
    ui.notifications.error(error instanceof Error ? error.message : String(error));
  }
}

async function requestDefense(
  message: ChatMessage,
  request: DefenseRequestData,
  defense: DefenseType,
  button: HTMLButtonElement
): Promise<void> {
  if (request.resolved || !request.allowedDefenses.includes(defense)) return;
  const targetIdentity = requestTargetIdentity(request);
  const sourceIdentity = requestSourceIdentity(request);
  const target = await resolveTargetActor(targetIdentity);
  const source = await resolveTargetActor(sourceIdentity);
  if (!target || !source) {
    if (!target) notifyMissingAuthoritativeToken(targetIdentity);
    if (!source) notifyMissingAuthoritativeToken(sourceIdentity);
    return;
  }
  if (!canControl(target)) return;
  button.disabled = true;
  const completed = await promptDefenseRoll(
    actorWithTargetIdentity(target, targetIdentity) as unknown as CombatCharacterLike,
    defense,
    {
      source: actorWithTargetIdentity(source, sourceIdentity) as unknown as NpcTargetLike,
      woundSeverity: request.woundSeverity
    }
  );
  if (!completed) {
    button.disabled = false;
    return;
  }
  game.socket.emit(SOCKET, {type: "resolveDefenseRequest", messageId: message.id});
  if (game.user.isGM) {
    await message.setFlag(SYSTEM_ID, "defenseRequest", {...request, resolved: true});
  }
}

function renderCombatChat(message: ChatMessage, html: HTMLElement): void {
  const action = outcomeAction(message);
  const actionButton = html.querySelector<HTMLButtonElement>("[data-action='applyCombatOutcome']");
  if (actionButton) {
    const target = action ? immediateTargetActor(actionIdentity(action)) : null;
    if (!action || !target || !canControl(target)) actionButton.remove();
    else if (action.applied) {
      actionButton.disabled = true;
      actionButton.textContent = game.i18n.localize("CYPHERV2.Combat.Applied");
    } else {
      actionButton.addEventListener("click", () => void applyCombatOutcome(message, actionButton), {once: true});
    }
  }

  const request = defenseRequest(message);
  const defenseButtons = [...html.querySelectorAll<HTMLButtonElement>("[data-action='rollRequestedDefense']")];
  if (defenseButtons.length === 0) return;
  const target = request ? immediateTargetActor(requestTargetIdentity(request)) : null;
  if (!request || !target || !canControl(target) || request.resolved) {
    for (const button of defenseButtons) button.remove();
    return;
  }
  for (const button of defenseButtons) {
    const defense = button.dataset.defense;
    if (!DEFENSE_TYPES.includes(defense as DefenseType)) {
      button.remove();
      continue;
    }
    button.addEventListener(
      "click",
      () => void requestDefense(message, request, defense as DefenseType, button),
      {once: true}
    );
  }
}

export function initializeCombatChatController(): void {
  Hooks.on("renderChatMessageHTML", (message: ChatMessage, html: HTMLElement) => {
    renderCombatChat(message, html);
  });
  game.socket.on(SOCKET, (message: ResolveDefenseRequestMessage) => {
    if (!game.user.isGM || message.type !== "resolveDefenseRequest") return;
    const chatMessage = game.messages.get(message.messageId);
    if (!chatMessage) return;
    const request = defenseRequest(chatMessage);
    if (!request || request.resolved) return;
    void chatMessage.setFlag(SYSTEM_ID, "defenseRequest", {...request, resolved: true});
  });
}
