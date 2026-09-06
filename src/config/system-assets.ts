import type {ActorType, ItemType} from "../constants/system";

const SYSTEM_ASSET_ROOT = "systems/cypherv2/assets";

export const ACTOR_DEFAULT_ICONS: Readonly<Record<ActorType, string>> = {
  character: `${SYSTEM_ASSET_ROOT}/icons/cypherpc.png`,
  npc: `${SYSTEM_ASSET_ROOT}/icons/cyphernpc.png`
};

export const ITEM_DEFAULT_ICONS: Readonly<Record<ItemType, string>> = {
  ability: `${SYSTEM_ASSET_ROOT}/icons/cypherability.png`,
  armor: `${SYSTEM_ASSET_ROOT}/icons/cypherarmor.png`,
  artifact: `${SYSTEM_ASSET_ROOT}/icons/cypherartefact.png`,
  cypher: `${SYSTEM_ASSET_ROOT}/icons/cyphercypher.png`,
  descriptor: `${SYSTEM_ASSET_ROOT}/icons/cypherdescriptor.png`,
  equipment: `${SYSTEM_ASSET_ROOT}/icons/cypherequipment.png`,
  focus: `${SYSTEM_ASSET_ROOT}/icons/cypherfocus.png`,
  genre: `${SYSTEM_ASSET_ROOT}/icons/cyphergenre.png`,
  shield: `${SYSTEM_ASSET_ROOT}/icons/cyphershield.png`,
  skill: `${SYSTEM_ASSET_ROOT}/icons/cypherskill.png`,
  species: `${SYSTEM_ASSET_ROOT}/icons/cypherspecies.png`,
  characterType: `${SYSTEM_ASSET_ROOT}/icons/cyphertype.png`,
  weapon: `${SYSTEM_ASSET_ROOT}/icons/cypherweapons.png`
};

export const SYSTEM_UI_ASSETS = {
  gamePaused: `${SYSTEM_ASSET_ROOT}/ui/cyphergamepaused.png`,
  lobby: `${SYSTEM_ASSET_ROOT}/cypherlobby.png`,
  turnMarker: `${SYSTEM_ASSET_ROOT}/ui/cypherturnmarker.png`
} as const;

export function actorDefaultIcon(type: string): string | null {
  return type in ACTOR_DEFAULT_ICONS
    ? ACTOR_DEFAULT_ICONS[type as ActorType]
    : null;
}

export function itemDefaultIcon(type: string): string | null {
  return type in ITEM_DEFAULT_ICONS
    ? ITEM_DEFAULT_ICONS[type as ItemType]
    : null;
}

export function hasExplicitPrototypeActorLink(data: Record<string, unknown>): boolean {
  if ("prototypeToken.actorLink" in data) return true;
  const prototypeToken = data.prototypeToken;
  return Boolean(
    prototypeToken
    && typeof prototypeToken === "object"
    && "actorLink" in prototypeToken
  );
}

export function shouldDefaultPrototypeActorLink(type: string, data: Record<string, unknown>): boolean {
  return type === "character" && !hasExplicitPrototypeActorLink(data);
}
