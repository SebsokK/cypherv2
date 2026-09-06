import {artifactLevelFormula, artifactLevelIsRollable, artifactUsable} from "../artifacts/artifact-rules";
import type {ArtifactItemLike, ArtifactLevelRollResult} from "../artifacts/artifact-types";

export interface ArtifactRollOutcome {
  readonly total: number;
  readonly chatRoll?: unknown;
}

export type ArtifactRoller = (formula: string) => Promise<ArtifactRollOutcome>;

const foundryArtifactRoller: ArtifactRoller = async (formula) => {
  const roll = await new Roll(formula).evaluate();
  if (roll.total === null) throw new Error("The Artifact level roll did not produce a total.");
  return {total: roll.total, chatRoll: roll};
};

export class ArtifactService {
  readonly #roller: ArtifactRoller;

  constructor(roller: ArtifactRoller = foundryArtifactRoller) {
    this.#roller = roller;
  }

  canRollLevel(item: ArtifactItemLike): boolean {
    return artifactUsable(item.system) && artifactLevelIsRollable(item.system);
  }

  async rollLevel(item: ArtifactItemLike): Promise<ArtifactLevelRollResult> {
    if (!artifactUsable(item.system)) throw new Error("This Artifact is depleted.");
    if (!artifactLevelIsRollable(item.system)) throw new Error("This Artifact has a fixed Level.");
    const formula = artifactLevelFormula(item.system);
    const rolled = await this.#roller(formula);
    await item.update({"system.level": String(rolled.total)});
    return {
      itemId: item.id,
      itemName: item.name,
      formula,
      total: rolled.total,
      ...(rolled.chatRoll === undefined ? {} : {chatRoll: rolled.chatRoll})
    };
  }
}
