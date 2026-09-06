import {safeCharacterAccent, safeCharacterTint} from "../themes/character-appearance";

export interface ChatCardActorLike {
  readonly img?: unknown;
  readonly token?: {readonly texture?: {readonly src?: unknown}} | null;
  readonly system?: unknown;
}

/** Resolve only imagery belonging directly to the acting document. */
export function chatCardActorImage(actor: ChatCardActorLike | null | undefined): string {
  const tokenImage = actor?.token?.texture?.src;
  if (typeof tokenImage === "string" && tokenImage.trim()) return tokenImage;
  const actorImage = actor?.img;
  return typeof actorImage === "string" ? actorImage.trim() : "";
}

export function chatCardActorImageData(
  actor: ChatCardActorLike | null | undefined
): {readonly actorImage?: string; readonly chatCardStyle?: string} {
  const actorImage = chatCardActorImage(actor);
  const system = actor?.system && typeof actor.system === "object"
    ? actor.system as Record<string, unknown>
    : null;
  const appearance = system?.appearance && typeof system.appearance === "object"
    ? system.appearance as Record<string, unknown>
    : null;
  const color = typeof appearance?.color === "string" ? appearance.color : "";
  const accent = safeCharacterAccent(color);
  const tint = safeCharacterTint(color);
  const chatCardStyle = [
    ...(accent ? [`--cypherv2-chat-accent: ${accent}`] : []),
    ...(tint ? [`--cypherv2-chat-tint: ${tint}`] : [])
  ].join("; ");
  return {
    ...(actorImage ? {actorImage} : {}),
    ...(chatCardStyle ? {chatCardStyle} : {})
  };
}
