import type {DepletionItemLike, DepletionRollResult} from "../depletion/depletion-types";
import {depletionDieSides, depletionRollFormula} from "../depletion/depletion-rules";

export interface DepletionRollOutcome {
  readonly total: number;
  readonly chatRoll?: unknown;
}

export type DepletionRoller = (formula: string) => Promise<DepletionRollOutcome>;

const foundryDepletionRoller: DepletionRoller = async (formula) => {
  const roll = await new Roll(formula).evaluate();
  if (roll.total === null) throw new Error("The depletion roll did not produce a total.");
  return {total: roll.total, chatRoll: roll};
};

export class DepletionService {
  readonly #roller: DepletionRoller;

  constructor(roller: DepletionRoller = foundryDepletionRoller) {
    this.#roller = roller;
  }

  async roll(item: DepletionItemLike): Promise<DepletionRollResult> {
    const rule = item.system.depletion;
    if (!rule.enabled) throw new Error("Depletion is not enabled for this Item.");
    const persistentState = ["artifact", "weapon", "shield", "armor"].includes(item.type);
    if (persistentState && item.system.depleted) {
      throw new Error(`This ${item.name} is already depleted.`);
    }
    const structuredCombatItem = ["weapon", "shield", "armor"].includes(item.type);
    const explicitFormula = structuredCombatItem ? "" : rule.formula?.trim() ?? "";
    const sides = depletionDieSides(rule);
    if (!Number.isInteger(rule.threshold) || rule.threshold < 1) {
      throw new Error("Depletion threshold must be a positive whole number.");
    }
    const formula = explicitFormula || depletionRollFormula(rule);
    const simpleSides = Number(formula.match(/^1d(\d+)$/i)?.[1]);
    if (simpleSides > 0 && rule.threshold > simpleSides) {
      throw new Error(`Depletion threshold must be between 1 and ${simpleSides}.`);
    }
    const rolled = await this.#roller(formula);
    const result = {
      itemId: item.id,
      itemName: item.name,
      formula,
      total: rolled.total,
      threshold: rule.threshold,
      depleted: rolled.total <= rule.threshold,
      ...(rolled.chatRoll === undefined ? {} : {chatRoll: rolled.chatRoll})
    };
    if (result.depleted && persistentState && item.update) {
      await item.update({"system.depleted": true});
    }
    return result;
  }
}
