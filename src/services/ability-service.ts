import type {CombatRollContext} from "../combat/combat-types";
import {combatTargetIdentity} from "../combat/combat-types";
import {
  type AbilityItemLike,
  type AbilityNoRollOutcome,
  type AbilityPaymentOutcome,
  type AbilityPaymentPreview,
  type AbilityRollOutcome,
  type AbilityRollPlan,
  type AbilityTargetLike,
  type AbilityUseOptions
} from "../abilities/ability-types";
import {calculatePoolCost} from "../rolls/roll-engine";
import type {CharacterRollRequest, RollPolicyRequest, RollStepContribution} from "../rolls/roll-types";
import type {PoolKey} from "../rules/core/core-types";
import type {CombatCharacterLike} from "./combat-service";
import {chooseNaturalAttackEffect, CombatService, naturalDamageBonus} from "./combat-service";
import {RollService} from "./roll-service";
import {SkillService} from "./skill-service";
import {TargetResolver} from "./target-resolver";
import {abilityAllowedPools} from "../abilities/ability-cost";
import {assertCharacter} from "../rules/core/core-types";

function integer(value: number, label: string, minimum = 0): number {
  if (!Number.isInteger(value) || value < minimum) {
    throw new Error(`${label} must be an integer of at least ${minimum}.`);
  }
  return value;
}

function modifierContribution(
  ability: AbilityItemLike,
  modifier: number,
  kind: "roll" | "attack"
): RollStepContribution | null {
  if (!Number.isInteger(modifier) || modifier < -10 || modifier > 10) {
    throw new Error(`${kind} modifier must be an integer from -10 to +10.`);
  }
  if (modifier === 0) return null;
  return {
    id: `ability.${ability.id}.${kind}-modifier`,
    label: kind === "attack"
      ? "CYPHERV2.Ability.AttackModifierContribution"
      : "CYPHERV2.Ability.RollModifierContribution",
    direction: modifier > 0 ? "ease" : "hinder",
    steps: Math.abs(modifier),
    source: "other",
    sourceId: ability.id
  };
}

function targetIdentity(target: AbilityTargetLike): ReturnType<typeof combatTargetIdentity> {
  return target.type === "npc"
    ? combatTargetIdentity(target)
    : {
        actorId: target.id,
        ...(target.actorUuid ?? target.uuid ? {actorUuid: target.actorUuid ?? target.uuid} : {}),
        ...(target.tokenId ? {tokenId: target.tokenId} : {}),
        ...(target.tokenUuid ? {tokenUuid: target.tokenUuid} : {})
      };
}

export class AbilityService {
  readonly #rolls: RollService;
  readonly #skills: SkillService;
  readonly #targets: TargetResolver;
  readonly #combat: CombatService;

  constructor(
    rolls: RollService,
    skills: SkillService,
    targets: TargetResolver,
    combat: CombatService
  ) {
    this.#rolls = rolls;
    this.#skills = skills;
    this.#targets = targets;
    this.#combat = combat;
  }

  canUse(ability: AbilityItemLike): boolean {
    return ability.type === "ability" && ability.system.activation !== "passive";
  }

  pool(ability: AbilityItemLike, selected?: PoolKey): PoolKey | null {
    const allowedPools = abilityAllowedPools(ability);
    if (selected && allowedPools.length > 0 && !allowedPools.includes(selected)) {
      throw new Error(`${selected} is not an allowed Pool for this Ability.`);
    }
    if (allowedPools.length === 1) return allowedPools[0]!;
    return selected ?? null;
  }

  previewPayment(
    actor: CombatCharacterLike,
    ability: AbilityItemLike,
    pool: PoolKey
  ): AbilityPaymentPreview {
    assertCharacter(actor);
    this.#assertAbility(ability);
    const allowedPools = abilityAllowedPools(ability);
    const listedCost = integer(ability.system.cost.amount, "Ability cost");
    if (listedCost <= 0 || allowedPools.length === 0) {
      throw new Error("This Ability has no payable Pool cost.");
    }
    if (!allowedPools.includes(pool)) throw new Error(`${pool} is not an allowed Pool for this Ability.`);
    const currentBefore = integer(actor.system.stats[pool].value, `${pool} Pool value`);
    const edge = Math.max(0, Math.trunc(actor.system.derived.pools[pool].edge));
    const costs = calculatePoolCost(listedCost, 0, edge, ability.system.cost.ignoresEdge);
    const currentAfter = currentBefore - costs.poolCost;
    return {
      ability,
      pool,
      listedCost,
      ignoresEdge: ability.system.cost.ignoresEdge,
      edge,
      edgeApplied: costs.edgeApplied,
      costPaid: costs.poolCost,
      currentBefore,
      currentAfter,
      canPay: currentAfter >= 0
    };
  }

  async payCost(
    actor: CombatCharacterLike,
    ability: AbilityItemLike,
    pool: PoolKey
  ): Promise<AbilityPaymentOutcome> {
    const payment = this.previewPayment(actor, ability, pool);
    if (!payment.canPay) {
      throw new Error(`${pool} has ${payment.currentBefore} points but this Ability costs ${payment.costPaid}.`);
    }
    if (payment.costPaid > 0) {
      await actor.update({[`system.stats.${pool}.value`]: payment.currentAfter});
    }
    return payment;
  }

  async executeNoRoll(
    actor: CombatCharacterLike,
    ability: AbilityItemLike,
    options: AbilityUseOptions = {}
  ): Promise<AbilityNoRollOutcome> {
    this.#assertAbility(ability);
    if (!this.canUse(ability)) throw new Error("Passive Abilities cannot be used.");
    if (ability.system.roll !== "none") throw new Error("This Ability requires a roll.");
    const targets = this.#validatedTargets(ability, options.targets ?? []);
    const pool = this.pool(ability, options.pool);
    const amount = this.#costAmount(ability);
    if (amount > 0 && !pool) throw new Error("A Pool is required to pay this Ability cost.");
    if (!pool) return {ability, actor: {id: actor.id, name: actor.name}, pool: null, costPaid: 0, edgeApplied: 0, targets};
    const current = actor.system.stats[pool].value;
    const costs = calculatePoolCost(
      amount,
      0,
      actor.system.derived.pools[pool].edge,
      ability.system.cost.ignoresEdge
    );
    if (current < costs.poolCost) {
      throw new Error(`${pool} has ${current} points but this action costs ${costs.poolCost}.`);
    }
    if (costs.poolCost > 0) {
      await actor.update({[`system.stats.${pool}.value`]: current - costs.poolCost});
    }
    return {
      ability,
      actor: {id: actor.id, name: actor.name},
      pool,
      costPaid: costs.poolCost,
      edgeApplied: costs.edgeApplied,
      targets
    };
  }

  buildRollPlan(
    actor: CombatCharacterLike,
    ability: AbilityItemLike,
    options: AbilityUseOptions = {}
  ): AbilityRollPlan {
    this.#assertAbility(ability);
    if (!this.canUse(ability)) throw new Error("Passive Abilities cannot be used.");
    if (ability.system.roll === "none") throw new Error("This Ability does not require a roll.");
    const pool = this.pool(ability, options.pool);
    if (!pool) throw new Error("Choose a Pool for this Ability roll.");
    const enabled = options.enabledRuleModuleIds ?? [];
    const selectedTargets = this.#validatedTargets(ability, options.targets ?? []);
    const targets: readonly (AbilityTargetLike | null)[] = selectedTargets.length ? selectedTargets : [null];
    const tags = [
      "ability",
      `ability.${ability.system.roll}`,
      ...(ability.system.roll === "attack" ? ["attack", "attack.ability", "defense.speed"] : []),
      ...(ability.system.roll === "defense" ? ["defense"] : []),
      ...(pool === "speed" ? ["speed-task"] : [])
    ];
    const combatContext: CombatRollContext = {tags, pool};
    const resolutions = targets.map((target) => target?.type === "npc"
      ? this.#targets.resolve(target, combatContext, enabled)
      : null);
    const common: RollStepContribution[] = [];
    const rollModifier = modifierContribution(ability, ability.system.rollModifier, "roll");
    if (rollModifier) common.push(rollModifier);
    if (ability.system.roll === "attack") {
      const attackModifier = modifierContribution(ability, ability.system.attackModifier, "attack");
      if (attackModifier) common.push(attackModifier);
    }
    const skillContribution = options.skill ? this.#skills.rankContribution(options.skill, enabled) : null;
    if (skillContribution) common.push(skillContribution);
    const requests = targets.map((target, index): CharacterRollRequest => ({
      label: ability.name,
      pool,
      difficulty: resolutions[index]
        ? {mode: "hidden", value: resolutions[index]!.difficulty}
        : options.difficulty ?? {mode: "unknown"},
      skillSteps: options.skillSteps ?? 0,
      assets: options.assets ?? 0,
      paidEffort: options.paidEffort ?? 0,
      damageEffort: ability.system.roll === "attack" ? options.damageEffort ?? 0 : 0,
      freeDamageEffort: ability.system.roll === "attack" ? options.freeDamageEffort ?? 0 : 0,
      freeEffort: options.freeEffort ?? 0,
      actionCost: this.#costAmount(ability),
      actionCostIgnoresEdge: ability.system.cost.ignoresEdge,
      otherEase: options.otherEase ?? 0,
      otherHindrance: options.otherHindrance ?? 0,
      contributions: [
        ...common,
        ...(resolutions[index]?.contributions ?? []),
        ...(options.contributions ?? [])
      ],
      purpose: ability.system.roll === "attack" ? "damage" : "task",
      tags,
      origin: {
        kind: "ability",
        itemId: ability.id,
        name: ability.name,
        activation: ability.system.activation,
        rollType: ability.system.roll,
        damage: integer(ability.system.damage, "Ability damage"),
        woundSeverity: ability.system.woundSeverity
      },
      ...(target ? {
        target: {
          ...targetIdentity(target),
          name: target.name,
          type: target.type === "npc" ? "npc" as const : "character" as const
        }
      } : {})
    }));
    return {ability, pool, requests, targets, targetResolutions: resolutions, damage: ability.system.damage};
  }

  async executeRoll(
    actor: CombatCharacterLike,
    ability: AbilityItemLike,
    options: AbilityUseOptions,
    policy: RollPolicyRequest
  ): Promise<readonly AbilityRollOutcome[]> {
    const plan = this.buildRollPlan(actor, ability, options);
    const executions = await this.#rolls.executeBatch(actor, plan.requests, policy);
    const damageEffortBonus = this.#combat.policy(options.enabledRuleModuleIds ?? []).damageEffortBonus;
    return executions.map((execution, index) => {
      const effortDamage = ability.system.roll === "attack"
        ? execution.result.prepared.damageEffortApplied * damageEffortBonus
        : 0;
      const naturalDamage = ability.system.roll === "attack" ? naturalDamageBonus(execution.result) : 0;
      return {
        ability,
        target: plan.targets[index] ?? null,
        targetResolution: plan.targetResolutions[index] ?? null,
        execution,
        baseDamage: plan.damage,
        effortDamage,
        naturalDamage,
        grossDamage: plan.damage + effortDamage + naturalDamage,
        woundSeverity: ability.system.woundSeverity
      };
    });
  }

  chooseAttackOutcomes(
    outcomes: readonly AbilityRollOutcome[],
    choice: "damage" | "effect"
  ): readonly AbilityRollOutcome[] {
    return outcomes.map((outcome) => {
      if (outcome.ability.system.roll !== "attack") return outcome;
      const result = chooseNaturalAttackEffect(outcome.execution.result, choice);
      const naturalDamage = naturalDamageBonus(result);
      return {
        ...outcome,
        execution: {...outcome.execution, result},
        naturalDamage,
        grossDamage: outcome.baseDamage + outcome.effortDamage + naturalDamage
      };
    });
  }

  #validatedTargets(
    ability: AbilityItemLike,
    targets: readonly AbilityTargetLike[]
  ): readonly AbilityTargetLike[] {
    if (ability.system.targetMode === "none") return [];
    if (ability.system.targetMode === "single" && targets.length > 1) {
      throw new Error("This Ability can target only one Character or NPC.");
    }
    return targets;
  }

  #assertAbility(ability: AbilityItemLike): void {
    if (ability.type !== "ability") throw new Error("Ability use requires an Ability Item.");
  }

  #costAmount(ability: AbilityItemLike): number {
    const amount = integer(ability.system.cost.amount, "Ability cost");
    return abilityAllowedPools(ability).length > 0 ? amount : 0;
  }
}
