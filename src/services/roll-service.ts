import type {RuleRegistry} from "../rules/rule-registry";
import {assertCharacter, type CharacterDocumentLike} from "../rules/core/core-types";
import {totalEffortCap} from "../genre/genre-rules";
import type {GenreDocumentLike, GenreEffortCapMode} from "../genre/genre-types";
import {prepareRoll, resolveAutomaticSuccess, resolveRoll} from "../rolls/roll-engine";
import type {
  CharacterRollRequest,
  PreparedRoll,
  RollContext,
  RollExecution,
  RollPolicyRequest,
  RollStepContribution
} from "../rolls/roll-types";
import {currentHorrorIntrusionRange} from "../config/settings";
import {normalizeHorrorIntrusionRange} from "../horror/horror-mode";

export interface RollCharacterDocumentLike extends CharacterDocumentLike {
  id: string;
  name: string;
}

export interface D20RollOutcome {
  readonly naturalRoll: number;
  readonly chatRoll?: unknown;
}

export type D20Roller = () => Promise<D20RollOutcome>;
export type GenreEffortCapModeResolver = (actor: RollCharacterDocumentLike) => GenreEffortCapMode;
export type HorrorIntrusionRangeResolver = () => number;

const foundryD20Roller: D20Roller = async () => {
  const roll = await new Roll("1d20").evaluate();
  if (roll.total === null) throw new Error("The d20 roll did not produce a total.");
  return {naturalRoll: roll.total, chatRoll: roll};
};

const foundryGenreEffortCapMode: GenreEffortCapModeResolver = (actor) => {
  const uuid = actor.system.genre.sourceUuid;
  if (!uuid || typeof fromUuidSync !== "function") return "core";
  const genre = fromUuidSync(uuid) as GenreDocumentLike | null;
  return genre?.type === "genre" ? genre.system.options.totalEffortCapMode : "core";
};

const foundryHorrorIntrusionRange: HorrorIntrusionRangeResolver = () => currentHorrorIntrusionRange();

function nonNegativeInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
  return value;
}

function manualContribution(
  id: string,
  label: string,
  value: number,
  source: RollStepContribution["source"]
): RollStepContribution | null {
  if (!Number.isInteger(value)) throw new Error(`${label} steps must be an integer.`);
  if (value === 0) return null;
  return {
    id,
    label,
    direction: value > 0 ? "ease" : "hinder",
    steps: Math.abs(value),
    source
  };
}

export class RollService {
  readonly #rules: RuleRegistry;
  readonly #roller: D20Roller;
  readonly #genreEffortCapMode: GenreEffortCapModeResolver;
  readonly #horrorIntrusionRange: HorrorIntrusionRangeResolver;

  constructor(
    rules: RuleRegistry,
    roller: D20Roller = foundryD20Roller,
    genreEffortCapMode: GenreEffortCapModeResolver = foundryGenreEffortCapMode,
    horrorIntrusionRange: HorrorIntrusionRangeResolver = foundryHorrorIntrusionRange
  ) {
    this.#rules = rules;
    this.#roller = roller;
    this.#genreEffortCapMode = genreEffortCapMode;
    this.#horrorIntrusionRange = horrorIntrusionRange;
  }

  preview(
    actor: RollCharacterDocumentLike,
    request: CharacterRollRequest,
    policyRequest: RollPolicyRequest
  ): PreparedRoll {
    assertCharacter(actor);
    nonNegativeInteger(request.otherEase, "Other Ease");
    nonNegativeInteger(request.otherHindrance, "Other Hindrance");

    const contributions: RollStepContribution[] = [];
    const skill = manualContribution(
      "manual.skill",
      "CYPHERV2.Roll.Breakdown.Skill",
      request.skillSteps,
      "skill"
    );
    if (skill) contributions.push(skill);
    const otherEase = manualContribution(
      "manual.other-ease",
      "CYPHERV2.Roll.Breakdown.OtherEase",
      request.otherEase,
      "other"
    );
    if (otherEase) contributions.push(otherEase);
    const otherHindrance = manualContribution(
      "manual.other-hindrance",
      "CYPHERV2.Roll.Breakdown.OtherHindrance",
      -request.otherHindrance,
      "other"
    );
    if (otherHindrance) contributions.push(otherHindrance);
    const woundHindrance = actor.system.derived.wounds.hindrance;
    if (woundHindrance > 0) {
      contributions.push({
        id: "core.wounds.hindrance",
        label: "CYPHERV2.Roll.Breakdown.Wounds",
        direction: "hinder",
        steps: woundHindrance,
        source: "wound",
        sourceId: "system.derived.wounds.hindrance"
      });
    }
    const tags = request.tags ?? [];
    const armor = actor.system.derived.combat?.armor;
    const isDodge = tags.includes("defense.dodge") || (
      request.origin?.kind === "defense" && request.origin.defenseType === "dodge"
    );
    if (request.pool === "speed" && !isDodge) {
      for (const entry of armor?.speedTaskContributions ?? []) {
        contributions.push({
          id: entry.id,
          label: `CYPHERV2.Combat.Armor.Unfamiliar.${armor?.category ?? "light"}`,
          direction: "hinder",
          steps: entry.value,
          source: "other",
          sourceId: entry.sourceId
        });
      }
    }
    contributions.push(...(request.contributions ?? []));

    if (request.pool === null && (
      request.paidEffort > 0
      || (request.damageEffort ?? 0) > 0
      || (request.actionCost ?? 0) > 0
    )) {
      throw new Error("A Pool-less roll cannot pay Effort or an action cost.");
    }

    const enabledRuleModuleIds = policyRequest.enabledRuleModuleIds ?? [];
    const policy = this.#rules.resolveDifficultyPolicy(policyRequest.base, enabledRuleModuleIds);
    const baseContext: RollContext = {
      actor: {id: actor.id, name: actor.name},
      label: request.label ?? "CYPHERV2.Roll.TestRoll",
      pool: request.pool,
      difficulty: request.difficulty,
      assets: request.assets,
      paidEffort: request.paidEffort,
      damageEffort: request.damageEffort ?? 0,
      freeDamageEffort: request.freeDamageEffort ?? 0,
      freeEffort: request.freeEffort,
      edge: request.pool === null ? 0 : actor.system.derived.pools[request.pool].edge,
      poolValue: request.pool === null ? 0 : actor.system.stats[request.pool].value,
      actionCost: request.actionCost ?? 0,
      actionCostIgnoresEdge: request.actionCostIgnoresEdge ?? false,
      limits: {
        ...policy,
        paidEffortMaximum: actor.system.derived.effort.max,
        totalEffortMaximum: totalEffortCap(this.#genreEffortCapMode(actor))
      },
      contributions,
      horrorIntrusionRange: normalizeHorrorIntrusionRange(this.#horrorIntrusionRange()),
      tags,
      ...(request.target ? {target: request.target} : {}),
      ...(request.purpose ? {purpose: request.purpose} : {}),
      ...(request.origin ? {origin: request.origin} : {})
    };
    const context = this.#rules.enrichRollContext(baseContext, enabledRuleModuleIds);
    return prepareRoll(context);
  }

  async execute(
    actor: RollCharacterDocumentLike,
    request: CharacterRollRequest,
    policyRequest: RollPolicyRequest
  ): Promise<RollExecution> {
    const [execution] = await this.executeBatch(actor, [request], policyRequest);
    if (!execution) throw new Error("Roll execution did not produce a result.");
    return execution;
  }

  async executeBatch(
    actor: RollCharacterDocumentLike,
    requests: readonly CharacterRollRequest[],
    policyRequest: RollPolicyRequest
  ): Promise<readonly RollExecution[]> {
    if (requests.length === 0) return [];
    const preparedRolls = requests.map((request) => this.preview(actor, request, policyRequest));
    const first = preparedRolls[0]!;
    if (preparedRolls.some((prepared) => (
      prepared.context.pool !== first.context.pool || prepared.poolCost !== first.poolCost
    ))) {
      throw new Error("Batch rolls must use one Pool and one shared action cost.");
    }
    const pool = first.context.pool;
    const currentPool = pool === null ? 0 : actor.system.stats[pool].value;
    if (currentPool < first.poolCost) {
      throw new Error(
        `${pool ?? "No Pool"} has ${currentPool} points but this action costs ${first.poolCost}.`
      );
    }
    if (first.poolCost > 0 && pool !== null) {
      await actor.update({[`system.stats.${pool}.value`]: currentPool - first.poolCost});
    }
    const needsD20 = preparedRolls.some((prepared) => prepared.finalDifficulty !== 0);
    const rolled = needsD20 ? await this.#roller() : null;
    const results = preparedRolls.map((prepared) => {
      const resolved = prepared.finalDifficulty === 0
        ? resolveAutomaticSuccess(prepared)
        : resolveRoll(prepared, rolled!.naturalRoll);
      const naturalEffects = this.#rules.resolveNaturalEffects(
        resolved,
        policyRequest.enabledRuleModuleIds ?? []
      );
      return {...resolved, naturalEffects};
    });
    const refund = results.some((result) => result.naturalEffects.some(
      (effect) => effect.status === "applied" && effect.refundsPoolCost === true
    )) ? first.poolCost : 0;
    if (refund > 0 && pool !== null) {
      await actor.update({[`system.stats.${pool}.value`]: currentPool});
    }
    let attachedRoll = false;
    return results.map((resolved) => {
      const result = {
        ...resolved,
        poolCostPaid: first.poolCost - refund,
        poolCostRefunded: refund
      };
      if (rolled?.chatRoll === undefined || resolved.automaticSuccess || attachedRoll) return {result};
      attachedRoll = true;
      return {result, chatRoll: rolled.chatRoll};
    });
  }
}
