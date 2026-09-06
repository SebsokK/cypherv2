import type {
  GMIntrusionChatState,
  GMIntrusionRecipient,
  GMIntrusionRecord
} from "../intrusions/gm-intrusion-types";
import type {GMIntrusionCharacterLike} from "./gm-intrusion-service";
import {chatCardActorImageData} from "./chat-card-presentation";

export interface GMIntrusionCardData {
  readonly mode: GMIntrusionRecord["mode"];
  readonly isTargeted: boolean;
  readonly isGroup: boolean;
  readonly isFree: boolean;
  readonly sourceActorName: string;
  readonly targetXp: number;
  readonly sharedXp: number;
  readonly pending: boolean;
  readonly resolving: boolean;
  readonly resolved: boolean;
  readonly recipients: readonly GMIntrusionRecipient[];
  readonly hasRecipients: boolean;
  readonly affectedCharacters: readonly GMIntrusionRecipient[];
  readonly hasAffectedCharacters: boolean;
  readonly sourceCharacter?: GMIntrusionRecipient;
  readonly resolvedRecipient?: GMIntrusionRecipient;
}

export function createGMIntrusionChatState(
  record: GMIntrusionRecord,
  recipients: readonly GMIntrusionRecipient[] = []
): GMIntrusionChatState {
  return {
    kind: "gm-intrusion",
    intrusionId: record.id,
    mode: record.mode,
    sourceActorId: record.targets[0]?.actorId ?? "",
    sourceActorName: record.targets[0]?.actorName ?? "",
    targetXp: record.targetXp,
    sharedXp: record.sharedXp,
    status: record.mode === "targeted" && record.sharedXp > 0 ? "pending" : "resolved",
    recipients: [...recipients],
    affectedCharacters: record.targets.map((target) => ({
      actorId: target.actorId,
      actorName: target.actorName,
      actorImage: target.actorImage ?? ""
    }))
  };
}

export function buildGMIntrusionCardData(state: GMIntrusionChatState): GMIntrusionCardData {
  const affectedCharacters = state.affectedCharacters ?? [];
  const sourceCharacter = affectedCharacters.find((character) => character.actorId === state.sourceActorId)
    ?? (state.sourceActorId ? {
      actorId: state.sourceActorId,
      actorName: state.sourceActorName,
      actorImage: ""
    } : undefined);
  return {
    mode: state.mode,
    isTargeted: state.mode === "targeted",
    isGroup: state.mode === "group",
    isFree: state.mode === "free",
    sourceActorName: state.sourceActorName,
    targetXp: state.targetXp,
    sharedXp: state.sharedXp,
    pending: state.status === "pending",
    resolving: state.status === "resolving",
    resolved: state.status === "resolved",
    recipients: state.recipients,
    hasRecipients: state.recipients.length > 0,
    affectedCharacters,
    hasAffectedCharacters: affectedCharacters.length > 0,
    ...(sourceCharacter ? {sourceCharacter} : {}),
    ...(state.resolvedRecipient ? {resolvedRecipient: state.resolvedRecipient} : {})
  };
}

export function isGMIntrusionChatState(value: unknown): value is GMIntrusionChatState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<GMIntrusionChatState>;
  return state.kind === "gm-intrusion"
    && typeof state.intrusionId === "string"
    && typeof state.sourceActorId === "string"
    && (state.mode === "targeted" || state.mode === "group" || state.mode === "free")
    && (state.status === "pending" || state.status === "resolving" || state.status === "resolved")
    && Array.isArray(state.recipients);
}

export class GMIntrusionChatService {
  async publish(
    record: GMIntrusionRecord,
    speakerActor?: GMIntrusionCharacterLike,
    recipients: readonly GMIntrusionRecipient[] = []
  ): Promise<ChatMessage> {
    const state = createGMIntrusionChatState(record, recipients);
    const content = await this.render(state, speakerActor);
    return await ChatMessage.create({
      speaker: ChatMessage.getSpeaker(
        speakerActor ? {actor: speakerActor as unknown as Actor} : undefined
      ),
      content,
      flags: {cypherv2: {gmIntrusion: state}}
    }) as ChatMessage;
  }

  async update(
    message: ChatMessage,
    state: GMIntrusionChatState,
    speakerActor?: GMIntrusionCharacterLike
  ): Promise<void> {
    const content = await this.render(state, speakerActor);
    await message.update({content, "flags.cypherv2.gmIntrusion": state});
  }

  async render(
    state: GMIntrusionChatState,
    speakerActor?: GMIntrusionCharacterLike
  ): Promise<string> {
    return foundry.applications.handlebars.renderTemplate(
      "systems/cypherv2/templates/chat/gm-intrusion-card.hbs",
      {
        ...buildGMIntrusionCardData(state),
        ...chatCardActorImageData(speakerActor as unknown as import("./chat-card-presentation").ChatCardActorLike)
      }
    );
  }
}
