import type {
  CombatTargetDocumentIdentity,
  CombatTargetIdentity,
  NpcTargetLike
} from "./combat-types";

interface NativeTokenLike {
  readonly id?: string;
  readonly uuid?: string;
  readonly actor: Actor | null;
  readonly document?: {readonly id: string; readonly uuid: string; readonly actor?: Actor | null};
}

export function targetIdentityFromDocument(
  actor: {readonly id: string; readonly uuid?: string} & CombatTargetDocumentIdentity
): CombatTargetIdentity {
  const token = (actor as typeof actor & {readonly token?: {readonly id: string; readonly uuid: string}}).token;
  const tokenId = actor.tokenId ?? token?.id;
  const tokenUuid = actor.tokenUuid ?? token?.uuid;
  return {
    actorId: actor.id,
    ...(actor.actorUuid ?? actor.uuid ? {actorUuid: actor.actorUuid ?? actor.uuid} : {}),
    ...(tokenId ? {tokenId} : {}),
    ...(tokenUuid ? {tokenUuid} : {})
  };
}

export function actorWithTargetIdentity<T extends Actor>(
  actor: T,
  identity: CombatTargetIdentity
): T & CombatTargetDocumentIdentity {
  return Object.assign(Object.create(actor) as T, {
    ...(identity.actorUuid ? {actorUuid: identity.actorUuid} : {}),
    ...(identity.tokenId ? {tokenId: identity.tokenId} : {}),
    ...(identity.tokenUuid ? {tokenUuid: identity.tokenUuid} : {}),
    update: actor.update.bind(actor),
    testUserPermission: actor.testUserPermission.bind(actor)
  });
}

export function npcTargetFromToken(token: NativeTokenLike): NpcTargetLike | null {
  const document = token.document ?? token;
  const actor = token.actor ?? document.actor ?? null;
  if (!(actor instanceof Actor) || actor.type !== "npc") return null;
  return actorWithTargetIdentity(actor, {
    actorId: actor.id,
    actorUuid: actor.uuid,
    ...(document.id ? {tokenId: document.id} : {}),
    ...(document.uuid ? {tokenUuid: document.uuid} : {})
  }) as unknown as NpcTargetLike;
}

export function characterTargetFromToken<T extends Actor>(
  token: NativeTokenLike
): (T & CombatTargetDocumentIdentity) | null {
  const document = token.document ?? token;
  const actor = token.actor ?? document.actor ?? null;
  if (!(actor instanceof Actor) || actor.type !== "character") return null;
  return actorWithTargetIdentity(actor as T, {
    actorId: actor.id,
    actorUuid: actor.uuid,
    ...(document.id ? {tokenId: document.id} : {}),
    ...(document.uuid ? {tokenUuid: document.uuid} : {})
  });
}

export function immediateTargetActor(identity: CombatTargetIdentity): Actor | null {
  if (identity.tokenId) {
    const actor = canvas.tokens?.get(identity.tokenId)?.actor;
    if (actor instanceof Actor) return actor;
    return null;
  }
  if (identity.tokenUuid) return null;
  return game.actors.get(identity.actorId) ?? null;
}

export async function resolveTargetActor(identity: CombatTargetIdentity): Promise<Actor | null> {
  if (identity.tokenUuid) {
    try {
      const token = await fromUuid(identity.tokenUuid) as {actor?: Actor | null} | null;
      if (token?.actor instanceof Actor) return token.actor;
    } catch {
      // A deleted or unavailable authoritative Token must resolve to no target.
    }
  }
  if (identity.tokenId) {
    const actor = canvas.tokens?.get(identity.tokenId)?.actor;
    if (actor instanceof Actor) return actor;
  }
  if (identity.tokenId || identity.tokenUuid) return null;
  return immediateTargetActor(identity);
}
