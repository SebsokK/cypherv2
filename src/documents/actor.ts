import {
  actorDefaultIcon,
  shouldDefaultPrototypeActorLink
} from "../config/system-assets";

export class CypherV2Actor extends Actor {
  static override getDefaultArtwork(data: Record<string, unknown>): {img: string; texture: {src: string}} {
    const icon = actorDefaultIcon(String(data.type ?? ""));
    return icon
      ? {img: icon, texture: {src: icon}}
      : super.getDefaultArtwork(data);
  }

  override async _preCreate(
    data: Record<string, unknown>,
    options: Record<string, unknown>,
    user: unknown
  ): Promise<unknown> {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;
    if (shouldDefaultPrototypeActorLink(this.type, data)) {
      this.prototypeToken.updateSource({actorLink: true});
    }
    return allowed;
  }

  /**
   * Rule actions will be delegated to services in later phases.
   * The document shell intentionally contains no roll or wound logic.
   */
}
