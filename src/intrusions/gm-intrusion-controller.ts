import {currentRollPolicyRequest, SETTING_KEYS} from "../config/settings";
import {SYSTEM_ID} from "../constants/system";
import {defaultIdFactory} from "../rules/core/core-types";
import type {RollResult} from "../rolls/roll-types";
import {
  isGMIntrusionChatState,
  type GMIntrusionChatService
} from "../services/gm-intrusion-chat-service";
import type {GMIntrusionCharacterLike, GMIntrusionService} from "../services/gm-intrusion-service";
import type {
  GMIntrusionChatState,
  GMIntrusionMode,
  GMIntrusionRecipient,
  GMIntrusionRecord,
  PendingGMIntrusionXP
} from "./gm-intrusion-types";

const SOCKET_NAME = "system." + SYSTEM_ID;

export interface IntrusionUserLike {
  readonly id: string;
  readonly isGM: boolean;
  readonly active: boolean;
  readonly character?: {readonly id: string} | null;
}

interface OwnedCharacterLike extends GMIntrusionCharacterLike {
  readonly img: string;
  testUserPermission(user: IntrusionUserLike, level: number): boolean;
}

type IntrusionSocketMessage =
  | {type: "create-free"; actorId: string; naturalRoll: number}
  | {
      type: "distribution-choice";
      intrusionId: string;
      recipientActorId: string;
      requesterUserId: string;
      requestId: string;
    }
  | {
      type: "distribution-result";
      requestId: string;
      recipientUserId: string;
      success: boolean;
      error?: string;
    };

interface PendingDistributionRequest {
  readonly resolve: () => void;
  readonly reject: (error: Error) => void;
  readonly timeout: ReturnType<typeof setTimeout>;
}

export interface ManualGMIntrusionRequest {
  readonly mode: GMIntrusionMode;
  readonly actorIds: readonly string[];
}

function users(): IntrusionUserLike[] {
  return [...game.users];
}

function activeUsers(): IntrusionUserLike[] {
  return users().filter((user) => user.active);
}

function characters(): OwnedCharacterLike[] {
  return [...game.actors]
    .filter((actor) => actor.type === "character")
    .map((actor) => actor as unknown as OwnedCharacterLike);
}

function actorById(id: string): OwnedCharacterLike | null {
  const actor = game.actors.get(id);
  return actor?.type === "character" ? actor as unknown as OwnedCharacterLike : null;
}

function primaryGM(): IntrusionUserLike | null {
  return activeUsers()
    .filter((user) => user.isGM)
    .sort((left, right) => left.id.localeCompare(right.id))[0] ?? null;
}

function owners(actor: OwnedCharacterLike, activeOnly: boolean): IntrusionUserLike[] {
  return users()
    .filter((user) => !user.isGM && (!activeOnly || user.active))
    .filter((user) => actor.testUserPermission(user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER))
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function selectDistributionResponder(
  candidates: readonly IntrusionUserLike[]
): IntrusionUserLike | null {
  const eligible = candidates
    .filter((user) => !user.isGM)
    .sort((left, right) => left.id.localeCompare(right.id));
  return eligible.find((user) => user.active) ?? eligible[0] ?? null;
}

export function eligibleSharedXpRecipients(
  actors: readonly OwnedCharacterLike[],
  sourceActorId: string
): GMIntrusionRecipient[] {
  const assignedCharacterIds = new Set(users()
    .filter((user) => !user.isGM)
    .map((user) => user.character?.id)
    .filter((actorId): actorId is string => typeof actorId === "string" && actorId.length > 0));
  const uniqueCharacters = new Map(actors
    .filter((actor) => actor.type === "character")
    .map((actor) => [actor.id, actor])).values();
  return [...uniqueCharacters]
    .filter((actor) => actor.id !== sourceActorId)
    .filter((actor) => assignedCharacterIds.has(actor.id))
    .map((actor) => ({actorId: actor.id, actorName: actor.name, actorImage: actor.img ?? ""}))
    .sort((left, right) => left.actorName.localeCompare(right.actorName));
}

export function isPendingXP(value: unknown): value is PendingGMIntrusionXP {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.intrusionId === "string"
    && candidate.intrusionId.length > 0
    && typeof candidate.messageId === "string"
    && candidate.messageId.length > 0
    && typeof candidate.sourceActorId === "string"
    && candidate.sourceActorId.length > 0
    && Number.isInteger(candidate.amount)
    && Number(candidate.amount) > 0
    && (candidate.responderUserId === undefined || typeof candidate.responderUserId === "string");
}

function isLegacyPendingXP(value: unknown): value is Omit<PendingGMIntrusionXP, "messageId"> {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.intrusionId === "string"
    && candidate.intrusionId.length > 0
    && candidate.messageId === undefined
    && typeof candidate.sourceActorId === "string"
    && candidate.sourceActorId.length > 0
    && Number.isInteger(candidate.amount)
    && Number(candidate.amount) > 0
    && (candidate.responderUserId === undefined || typeof candidate.responderUserId === "string");
}

function sameRecipients(
  left: readonly GMIntrusionRecipient[],
  right: readonly GMIntrusionRecipient[]
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export class GMIntrusionController {
  readonly #service: GMIntrusionService;
  readonly #chat: GMIntrusionChatService;
  readonly #resolving = new Set<string>();
  readonly #distributionRequests = new Map<string, PendingDistributionRequest>();
  #creatingManual = false;

  constructor(service: GMIntrusionService, chat: GMIntrusionChatService) {
    this.#service = service;
    this.#chat = chat;
  }

  initialize(): void {
    game.socket.on(SOCKET_NAME, (message: IntrusionSocketMessage) => {
      void this.#onSocket(message).catch((error) => {
        console.error(SYSTEM_ID + " | GM Intrusion socket error", error);
        if (game.user.isGM) ui.notifications.error(error instanceof Error ? error.message : String(error));
      });
    });
    Hooks.on("renderChatMessageHTML", (message: ChatMessage, html: HTMLElement) => {
      this.#bindChatCard(message, html);
    });
    Hooks.on("updateUser", () => {
      if (this.#isPrimaryGM()) void this.retryPendingDistributions();
    });
    Hooks.on("createActor", () => {
      if (this.#isPrimaryGM()) void this.retryPendingDistributions();
    });
    Hooks.on("deleteActor", () => {
      if (this.#isPrimaryGM()) setTimeout(() => void this.#normalizePendingStorage(), 0);
    });
    Hooks.on("updateActor", () => {
      if (this.#isPrimaryGM()) void this.retryPendingDistributions();
    });
    Hooks.on("cypherv2IntrusionPendingChanged", () => {
      if (this.#isPrimaryGM()) void this.retryPendingDistributions();
    });
    if (this.#isPrimaryGM()) {
      setTimeout(() => {
        void this.#normalizePendingStorage().then(() => this.retryPendingDistributions());
      }, 1000);
    }
  }

  async createManual(request: ManualGMIntrusionRequest): Promise<GMIntrusionRecord> {
    if (!game.user.isGM) throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.GMOnly"));
    if (this.#creatingManual) throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.AlreadyCreating"));
    this.#creatingManual = true;
    try {
      const selected = request.actorIds.map(actorById).filter((actor): actor is OwnedCharacterLike => actor !== null);
      const policy = currentRollPolicyRequest();
      let record: GMIntrusionRecord;
      if (request.mode === "group") {
        record = await this.#service.createGroup(selected, policy.enabledRuleModuleIds ?? []);
      } else {
        const actor = selected[0];
        if (!actor) throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.ChooseCharacter"));
        record = request.mode === "free"
          ? await this.#service.createFree(actor, 0, policy.enabledRuleModuleIds ?? [])
          : await this.#service.createTargeted(actor, policy.enabledRuleModuleIds ?? []);
      }

      const source = selected[0];
      if (record.mode !== "targeted" || record.sharedXp <= 0 || !source) {
        await this.#chat.publish(record, source);
      } else {
        const responder = selectDistributionResponder(owners(source, false));
        const recipients = eligibleSharedXpRecipients(characters(), source.id);
        const message = await this.#chat.publish(record, source, recipients);
        const pending: PendingGMIntrusionXP = {
          intrusionId: record.id,
          messageId: message.id,
          sourceActorId: source.id,
          amount: record.sharedXp,
          ...(responder ? {responderUserId: responder.id} : {})
        };
        await this.#upsertPending(pending);
        // Publishing the ChatMessage necessarily precedes persistence because the
        // pending obligation needs its message ID. Render once more after that
        // obligation exists so every client binds controls against canonical state.
        await this.#refreshPendingCard(pending, true);
      }
      Hooks.callAll("cypherv2GMIntrusionCreated", record);
      return record;
    } finally {
      this.#creatingManual = false;
    }
  }

  async requestFreeFromNaturalResult(actor: GMIntrusionCharacterLike, result: RollResult): Promise<void> {
    const triggers = result.naturalEffects.some(
      (effect) => effect.status === "applied" && effect.triggersGMIntrusion === true
    );
    if (!triggers || result.naturalRoll === null) return;
    if (this.#isPrimaryGM()) {
      await this.#createFree(actor.id, result.naturalRoll);
      return;
    }
    if (!primaryGM()) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Intrusion.NoActiveGM"));
      return;
    }
    game.socket.emit(SOCKET_NAME, {type: "create-free", actorId: actor.id, naturalRoll: result.naturalRoll});
  }

  async retryPendingDistributions(): Promise<void> {
    if (!this.#isPrimaryGM()) return;
    for (const pending of this.#pending()) await this.#refreshPendingCard(pending);
  }

  async requestDistribution(intrusionId: string, recipientActorId: string): Promise<void> {
    const pending = this.#findPending(intrusionId);
    const source = actorById(pending.sourceActorId);
    if (!source || !this.#canResolve(source, pending)) {
      throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.NotAuthorized"));
    }
    if (this.#isPrimaryGM()) {
      await this.#distribute(intrusionId, recipientActorId, game.user.id);
      return;
    }
    if (!primaryGM()) throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.NoActiveGM"));
    const requestId = defaultIdFactory();
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.#distributionRequests.delete(requestId);
        reject(new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.RequestTimeout")));
      }, 10_000);
      this.#distributionRequests.set(requestId, {resolve, reject, timeout});
      game.socket.emit(SOCKET_NAME, {
        type: "distribution-choice",
        intrusionId,
        recipientActorId,
        requesterUserId: game.user.id,
        requestId
      });
    });
  }

  async #createFree(actorId: string, naturalRoll: number): Promise<void> {
    const actor = actorById(actorId);
    if (!actor) throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.CharacterMissing"));
    const policy = currentRollPolicyRequest();
    const record = await this.#service.createFree(actor, naturalRoll, policy.enabledRuleModuleIds ?? []);
    // Natural 1 remains represented by the originating Roll Card only.
    Hooks.callAll("cypherv2GMIntrusionCreated", record);
  }

  #bindChatCard(message: ChatMessage, html: HTMLElement): void {
    const state = message.getFlag(SYSTEM_ID, "gmIntrusion");
    if (!isGMIntrusionChatState(state)) return;
    const pending = this.#pending().find((entry) => entry.intrusionId === state.intrusionId);
    const source = pending ? actorById(pending.sourceActorId) : null;
    const canResolve = state.status === "pending" && (
      game.user.isGM || Boolean(pending && source && this.#canResolve(source, pending))
    );
    for (const button of html.querySelectorAll<HTMLButtonElement>("[data-action='assignSharedIntrusionXp']")) {
      if (!canResolve) {
        button.remove();
        continue;
      }
      if (button.dataset.cypherv2IntrusionBound === "true") continue;
      button.dataset.cypherv2IntrusionBound = "true";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const recipientActorId = button.dataset.recipientActorId;
        if (!recipientActorId || button.disabled) return;
        button.disabled = true;
        void this.requestDistribution(state.intrusionId, recipientActorId).catch((error) => {
          button.disabled = false;
          ui.notifications.error(error instanceof Error ? error.message : String(error));
        });
      });
    }
  }

  #canResolve(source: OwnedCharacterLike, pending: PendingGMIntrusionXP): boolean {
    if (game.user.isGM) return true;
    return game.user.id === pending.responderUserId
      && source.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
  }

  async #refreshPendingCard(pending: PendingGMIntrusionXP, forceRender = false): Promise<void> {
    const source = actorById(pending.sourceActorId);
    const message = game.messages.get(pending.messageId);
    if (!source || !message) {
      await this.#removePending(pending.intrusionId);
      return;
    }
    let responder = pending.responderUserId
      ? users().find((user) => user.id === pending.responderUserId) ?? null
      : null;
    if (!responder || !owners(source, false).some((owner) => owner.id === responder?.id)) {
      responder = selectDistributionResponder(owners(source, false));
      if (responder) {
        pending = {...pending, responderUserId: responder.id};
        await this.#upsertPending(pending);
      }
    }
    const state = message.getFlag(SYSTEM_ID, "gmIntrusion");
    if (!isGMIntrusionChatState(state) || state.status !== "pending") return;
    const recipients = eligibleSharedXpRecipients(characters(), source.id);
    if (forceRender || !sameRecipients(state.recipients, recipients)) {
      await this.#chat.update(message, {...state, recipients}, source);
    }
  }

  async #distribute(
    intrusionId: string,
    recipientActorId: string,
    requesterUserId: string
  ): Promise<void> {
    if (this.#resolving.has(intrusionId)) {
      throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.AlreadyResolved"));
    }
    this.#resolving.add(intrusionId);
    let awardApplied = false;
    let pendingState: GMIntrusionChatState | null = null;
    let message: ChatMessage | null = null;
    let source: OwnedCharacterLike | null = null;
    try {
      const pending = this.#findPending(intrusionId);
      source = actorById(pending.sourceActorId);
      const recipient = actorById(recipientActorId);
      message = game.messages.get(pending.messageId) ?? null;
      if (!source || !recipient || !message) {
        throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.CharacterMissing"));
      }
      const state = message.getFlag(SYSTEM_ID, "gmIntrusion");
      if (!isGMIntrusionChatState(state) || state.intrusionId !== intrusionId || state.status !== "pending") {
        throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.AlreadyResolved"));
      }
      pendingState = state;
      const requester = activeUsers().find((user) => user.id === requesterUserId);
      const authorized = requester?.isGM === true || Boolean(requester && (
        requester.id === pending.responderUserId
        && owners(source, true).some((owner) => owner.id === requester.id)
      ));
      if (!authorized) throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.NotAuthorized"));
      const eligible = eligibleSharedXpRecipients(characters(), source.id);
      const selected = eligible.find((candidate) => candidate.actorId === recipient.id);
      if (!selected) throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.RecipientUnavailable"));

      await this.#chat.update(message, {...state, status: "resolving"}, source);
      await this.#service.distributeSecondXp(source, recipient, pending.amount);
      awardApplied = true;
      await this.#removePending(intrusionId);
      await this.#chat.update(message, {
        ...state,
        status: "resolved",
        recipients: [],
        resolvedRecipient: selected
      }, source);
      Hooks.callAll("cypherv2GMIntrusionXPDistributed", intrusionId, source, recipient);
    } catch (error) {
      if (!awardApplied && pendingState && message && source) {
        await this.#chat.update(message, pendingState, source);
      }
      throw error;
    } finally {
      this.#resolving.delete(intrusionId);
    }
  }

  async #onSocket(message: IntrusionSocketMessage): Promise<void> {
    if (message.type === "distribution-result") {
      if (message.recipientUserId !== game.user.id) return;
      const pending = this.#distributionRequests.get(message.requestId);
      if (!pending) return;
      clearTimeout(pending.timeout);
      this.#distributionRequests.delete(message.requestId);
      if (message.success) pending.resolve();
      else pending.reject(new Error(message.error ?? game.i18n.localize("CYPHERV2.Intrusion.Errors.RecipientUnavailable")));
      return;
    }
    if (!this.#isPrimaryGM()) return;
    if (message.type === "create-free") await this.#createFree(message.actorId, message.naturalRoll);
    else if (message.type === "distribution-choice") {
      try {
        await this.#distribute(message.intrusionId, message.recipientActorId, message.requesterUserId);
        game.socket.emit(SOCKET_NAME, {
          type: "distribution-result",
          requestId: message.requestId,
          recipientUserId: message.requesterUserId,
          success: true
        });
      } catch (error) {
        game.socket.emit(SOCKET_NAME, {
          type: "distribution-result",
          requestId: message.requestId,
          recipientUserId: message.requesterUserId,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    }
  }

  #pending(): PendingGMIntrusionXP[] {
    const value = game.settings.get(SYSTEM_ID, SETTING_KEYS.pendingIntrusionXP);
    return Array.isArray(value) ? value.filter(isPendingXP).map((pending) => ({
      intrusionId: pending.intrusionId,
      messageId: pending.messageId,
      sourceActorId: pending.sourceActorId,
      amount: pending.amount,
      ...(pending.responderUserId ? {responderUserId: pending.responderUserId} : {})
    })) : [];
  }

  #findPending(intrusionId: string): PendingGMIntrusionXP {
    const pending = this.#pending().find((entry) => entry.intrusionId === intrusionId);
    if (!pending) throw new Error(game.i18n.localize("CYPHERV2.Intrusion.Errors.AlreadyResolved"));
    return pending;
  }

  async #upsertPending(pending: PendingGMIntrusionXP): Promise<void> {
    const records = this.#pending();
    const index = records.findIndex((entry) => entry.intrusionId === pending.intrusionId);
    if (index < 0) records.push(pending);
    else records[index] = pending;
    await game.settings.set(SYSTEM_ID, SETTING_KEYS.pendingIntrusionXP, records);
  }

  async #removePending(intrusionId: string): Promise<void> {
    await game.settings.set(
      SYSTEM_ID,
      SETTING_KEYS.pendingIntrusionXP,
      this.#pending().filter((entry) => entry.intrusionId !== intrusionId)
    );
  }

  async #normalizePendingStorage(): Promise<void> {
    const raw = game.settings.get(SYSTEM_ID, SETTING_KEYS.pendingIntrusionXP);
    const normalized: PendingGMIntrusionXP[] = [];
    for (const value of Array.isArray(raw) ? raw : []) {
      if (isPendingXP(value)) {
        if (actorById(value.sourceActorId) && game.messages.get(value.messageId)) {
          normalized.push({
            intrusionId: value.intrusionId,
            messageId: value.messageId,
            sourceActorId: value.sourceActorId,
            amount: value.amount,
            ...(value.responderUserId ? {responderUserId: value.responderUserId} : {})
          });
        }
        continue;
      }
      if (!isLegacyPendingXP(value)) continue;
      const source = actorById(value.sourceActorId);
      const message = [...game.messages].find(
        (candidate) => candidate.getFlag(SYSTEM_ID, "gmIntrusionId") === value.intrusionId
      );
      if (!source || !message) continue;
      const responder = value.responderUserId
        ? users().find((user) => user.id === value.responderUserId)
        : selectDistributionResponder(owners(source, false));
      const policy = this.#service.policy(currentRollPolicyRequest().enabledRuleModuleIds ?? []);
      const state: GMIntrusionChatState = {
        kind: "gm-intrusion",
        intrusionId: value.intrusionId,
        mode: "targeted",
        sourceActorId: source.id,
        sourceActorName: source.name,
        targetXp: policy.targetedXpToTarget,
        sharedXp: value.amount,
        status: "pending",
        recipients: eligibleSharedXpRecipients(characters(), source.id)
      };
      await this.#chat.update(message, state, source);
      normalized.push({
        intrusionId: value.intrusionId,
        messageId: message.id,
        sourceActorId: value.sourceActorId,
        amount: value.amount,
        ...(responder ? {responderUserId: responder.id} : {})
      });
    }
    if (!Array.isArray(raw) || JSON.stringify(raw) !== JSON.stringify(normalized)) {
      await game.settings.set(SYSTEM_ID, SETTING_KEYS.pendingIntrusionXP, normalized);
    }
  }

  #isPrimaryGM(): boolean {
    return game.user.isGM && primaryGM()?.id === game.user.id;
  }
}

let controller: GMIntrusionController | null = null;

export function initializeGMIntrusionController(
  service: GMIntrusionService,
  chat: GMIntrusionChatService
): GMIntrusionController {
  controller = new GMIntrusionController(service, chat);
  controller.initialize();
  return controller;
}

export function gmIntrusionController(): GMIntrusionController {
  if (!controller) throw new Error("GM Intrusion controller is not ready.");
  return controller;
}
