export const RULE_EXTENSION_POINTS = [
  "actorDerivedData",
  "rollModifiers",
  "sheetSections",
  "chatActions",
  "recoveryRules",
  "restRules",
  "woundRules",
  "poolRules",
  "rallyRules",
  "durationTriggers",
  "difficultyPolicies",
  "skillRules",
  "naturalResultRules",
  "gmIntrusionRules",
  "combatRules",
  "targetRules",
  "damageRules",
  "advancementRules",
  "itemBehaviors",
  "focusBehaviors"
] as const;

export type RuleExtensionPoint = (typeof RULE_EXTENSION_POINTS)[number];

export interface RuleModuleDefinition {
  readonly id: string;
  readonly title: string;
  readonly version?: string;
  readonly core?: boolean;
  readonly priority?: number;
  readonly dependencies?: readonly string[];
  readonly conflicts?: readonly string[];
  readonly extensionPoints?: readonly RuleExtensionPoint[];
}

export interface RuleRegistryDiagnostic {
  readonly severity: "warning" | "error";
  readonly moduleId: string;
  readonly message: string;
}

export type DifficultyPolicyProvider = (policy: Readonly<RollPolicy>) => RollPolicy;
export type RollContextEnricher = (context: Readonly<RollContext>) => RollContext;
export type SkillRankRule = (
  rank: SkillRank,
  source: Readonly<{id: string; name: string}>
) => RollStepContribution | null;
export type NaturalResultRule = (
  result: Readonly<RollResult>,
  effects: readonly NaturalEffect[]
) => readonly NaturalEffect[];
export type GMIntrusionPolicyProvider = (
  policy: Readonly<GMIntrusionPolicy>
) => GMIntrusionPolicy;
export type CombatPolicyProvider = (policy: Readonly<CombatPolicy>) => CombatPolicy;
export type TargetResolutionRule = (
  resolution: Readonly<TargetResolution>,
  target: Readonly<NpcTargetLike>,
  context: Readonly<CombatRollContext>
) => TargetResolution;
export type AdvancementPolicyProvider = (
  policy: Readonly<AdvancementPolicy>
) => AdvancementPolicy;

export class RuleRegistry {
  readonly #modules = new Map<string, Readonly<RuleModuleDefinition>>();
  readonly #difficultyPolicies = new Map<string, DifficultyPolicyProvider[]>();
  readonly #rollContextEnrichers = new Map<string, RollContextEnricher[]>();
  readonly #skillRankRules = new Map<string, SkillRankRule[]>();
  readonly #naturalResultRules = new Map<string, NaturalResultRule[]>();
  readonly #gmIntrusionPolicies = new Map<string, GMIntrusionPolicyProvider[]>();
  readonly #combatPolicies = new Map<string, CombatPolicyProvider[]>();
  readonly #targetResolutionRules = new Map<string, TargetResolutionRule[]>();
  readonly #advancementPolicies = new Map<string, AdvancementPolicyProvider[]>();

  register(definition: RuleModuleDefinition): Readonly<RuleModuleDefinition> {
    const id = definition.id.trim();
    if (!id) throw new Error("Rule module IDs cannot be blank.");
    if (this.#modules.has(id)) throw new Error(`Rule module '${id}' is already registered.`);

    const normalized = Object.freeze({
      ...definition,
      id,
      priority: definition.priority ?? 0,
      dependencies: Object.freeze([...(definition.dependencies ?? [])]),
      conflicts: Object.freeze([...(definition.conflicts ?? [])]),
      extensionPoints: Object.freeze([...(definition.extensionPoints ?? [])])
    });

    this.#modules.set(id, normalized);
    return normalized;
  }

  get(id: string): Readonly<RuleModuleDefinition> | undefined {
    return this.#modules.get(id);
  }

  has(id: string): boolean {
    return this.#modules.has(id);
  }

  list(): readonly Readonly<RuleModuleDefinition>[] {
    return [...this.#modules.values()].sort(
      (left, right) => (left.priority ?? 0) - (right.priority ?? 0) || left.id.localeCompare(right.id)
    );
  }

  active(enabledIds: readonly string[]): readonly Readonly<RuleModuleDefinition>[] {
    const enabled = new Set(enabledIds);
    return this.list().filter((module) => module.core === true || enabled.has(module.id));
  }

  diagnostics(enabledIds: readonly string[]): readonly RuleRegistryDiagnostic[] {
    const active = this.active(enabledIds);
    const activeIds = new Set(active.map((module) => module.id));
    const diagnostics: RuleRegistryDiagnostic[] = [];

    for (const module of active) {
      for (const dependency of module.dependencies ?? []) {
        if (!activeIds.has(dependency)) {
          diagnostics.push({
            severity: "error",
            moduleId: module.id,
            message: `Missing active dependency '${dependency}'.`
          });
        }
      }
      for (const conflict of module.conflicts ?? []) {
        if (activeIds.has(conflict)) {
          diagnostics.push({
            severity: "error",
            moduleId: module.id,
            message: `Conflicts with active module '${conflict}'.`
          });
        }
      }
    }

    return diagnostics;
  }

  registerDifficultyPolicy(moduleId: string, provider: DifficultyPolicyProvider): void {
    this.#assertBehaviorRegistration(moduleId, "difficultyPolicies");
    const providers = this.#difficultyPolicies.get(moduleId) ?? [];
    providers.push(provider);
    this.#difficultyPolicies.set(moduleId, providers);
  }

  resolveDifficultyPolicy(base: RollPolicy, enabledIds: readonly string[] = []): RollPolicy {
    let policy = {...base};
    for (const module of this.active(enabledIds)) {
      for (const provider of this.#difficultyPolicies.get(module.id) ?? []) {
        policy = {...provider(Object.freeze({...policy}))};
      }
    }
    if (!Number.isInteger(policy.difficultyCeiling) || policy.difficultyCeiling < 0) {
      throw new Error("Difficulty policies must provide a non-negative integer ceiling.");
    }
    if (!Number.isInteger(policy.assetLimit) || policy.assetLimit < 0) {
      throw new Error("Difficulty policies must provide a non-negative integer Asset limit.");
    }
    return Object.freeze(policy);
  }

  registerRollContextEnricher(moduleId: string, enricher: RollContextEnricher): void {
    this.#assertBehaviorRegistration(moduleId, "rollModifiers");
    const enrichers = this.#rollContextEnrichers.get(moduleId) ?? [];
    enrichers.push(enricher);
    this.#rollContextEnrichers.set(moduleId, enrichers);
  }

  enrichRollContext(context: RollContext, enabledIds: readonly string[] = []): RollContext {
    let enriched = context;
    for (const module of this.active(enabledIds)) {
      for (const enricher of this.#rollContextEnrichers.get(module.id) ?? []) {
        enriched = enricher(Object.freeze(enriched));
      }
    }
    return enriched;
  }

  registerSkillRankRule(moduleId: string, rule: SkillRankRule): void {
    this.#assertBehaviorRegistration(moduleId, "skillRules");
    const rules = this.#skillRankRules.get(moduleId) ?? [];
    rules.push(rule);
    this.#skillRankRules.set(moduleId, rules);
  }

  resolveSkillRankContribution(
    rank: SkillRank,
    source: Readonly<{id: string; name: string}>,
    enabledIds: readonly string[] = []
  ): RollStepContribution | null {
    let contribution: RollStepContribution | null = null;
    for (const module of this.active(enabledIds)) {
      for (const rule of this.#skillRankRules.get(module.id) ?? []) {
        contribution = rule(rank, source) ?? contribution;
      }
    }
    return contribution;
  }

  registerNaturalResultRule(moduleId: string, rule: NaturalResultRule): void {
    this.#assertBehaviorRegistration(moduleId, "naturalResultRules");
    const rules = this.#naturalResultRules.get(moduleId) ?? [];
    rules.push(rule);
    this.#naturalResultRules.set(moduleId, rules);
  }

  resolveNaturalEffects(result: RollResult, enabledIds: readonly string[] = []): readonly NaturalEffect[] {
    let effects: readonly NaturalEffect[] = [];
    for (const module of this.active(enabledIds)) {
      for (const rule of this.#naturalResultRules.get(module.id) ?? []) {
        effects = rule(Object.freeze(result), Object.freeze([...effects]));
      }
    }
    return Object.freeze([...effects]);
  }

  registerGMIntrusionPolicy(moduleId: string, provider: GMIntrusionPolicyProvider): void {
    this.#assertBehaviorRegistration(moduleId, "gmIntrusionRules");
    const providers = this.#gmIntrusionPolicies.get(moduleId) ?? [];
    providers.push(provider);
    this.#gmIntrusionPolicies.set(moduleId, providers);
  }

  resolveGMIntrusionPolicy(
    base: GMIntrusionPolicy,
    enabledIds: readonly string[] = []
  ): GMIntrusionPolicy {
    let policy = {...base};
    for (const module of this.active(enabledIds)) {
      for (const provider of this.#gmIntrusionPolicies.get(module.id) ?? []) {
        policy = {...provider(Object.freeze({...policy}))};
      }
    }
    return Object.freeze(policy);
  }

  registerCombatPolicy(moduleId: string, provider: CombatPolicyProvider): void {
    this.#assertBehaviorRegistration(moduleId, "combatRules");
    const providers = this.#combatPolicies.get(moduleId) ?? [];
    providers.push(provider);
    this.#combatPolicies.set(moduleId, providers);
  }

  resolveCombatPolicy(base: CombatPolicy, enabledIds: readonly string[] = []): CombatPolicy {
    let policy = {...base};
    for (const module of this.active(enabledIds)) {
      for (const provider of this.#combatPolicies.get(module.id) ?? []) {
        policy = {...provider(Object.freeze({...policy}))};
      }
    }
    return Object.freeze(policy);
  }

  registerTargetResolutionRule(moduleId: string, rule: TargetResolutionRule): void {
    this.#assertBehaviorRegistration(moduleId, "targetRules");
    const rules = this.#targetResolutionRules.get(moduleId) ?? [];
    rules.push(rule);
    this.#targetResolutionRules.set(moduleId, rules);
  }

  enrichTargetResolution(
    resolution: TargetResolution,
    target: NpcTargetLike,
    context: CombatRollContext,
    enabledIds: readonly string[] = []
  ): TargetResolution {
    let enriched = resolution;
    for (const module of this.active(enabledIds)) {
      for (const rule of this.#targetResolutionRules.get(module.id) ?? []) {
        enriched = rule(Object.freeze(enriched), Object.freeze(target), Object.freeze(context));
      }
    }
    return Object.freeze(enriched);
  }

  registerAdvancementPolicy(moduleId: string, provider: AdvancementPolicyProvider): void {
    this.#assertBehaviorRegistration(moduleId, "advancementRules");
    const providers = this.#advancementPolicies.get(moduleId) ?? [];
    providers.push(provider);
    this.#advancementPolicies.set(moduleId, providers);
  }

  resolveAdvancementPolicy(
    base: AdvancementPolicy,
    enabledIds: readonly string[] = []
  ): AdvancementPolicy {
    let policy = {...base};
    for (const module of this.active(enabledIds)) {
      for (const provider of this.#advancementPolicies.get(module.id) ?? []) {
        policy = {...provider(Object.freeze({...policy}))};
      }
    }
    for (const [name, value] of Object.entries({
      xpCost: policy.xpCost,
      purchasesPerTier: policy.purchasesPerTier,
      capabilityPoints: policy.capabilityPoints,
      effortMaximum: policy.effortMaximum,
      recoveryBonus: policy.recoveryBonus,
      attackDefenseTrainingTier: policy.attackDefenseTrainingTier,
      attackDefenseSpecializationTier: policy.attackDefenseSpecializationTier
    })) {
      if (!Number.isInteger(value) || value < 0) {
        throw new Error(`Advancement policy '${name}' must be a non-negative integer.`);
      }
    }
    return Object.freeze(policy);
  }

  #assertBehaviorRegistration(moduleId: string, extensionPoint: RuleExtensionPoint): void {
    const module = this.#modules.get(moduleId);
    if (!module) throw new Error(`Rule module '${moduleId}' must be registered before its behaviors.`);
    if (!module.extensionPoints?.includes(extensionPoint)) {
      throw new Error(`Rule module '${moduleId}' does not declare '${extensionPoint}'.`);
    }
  }
}
import type {SkillRank} from "../constants/system";
import type {AdvancementPolicy} from "../advancement/advancement-types";
import type {GMIntrusionPolicy} from "../intrusions/gm-intrusion-types";
import type {
  CombatPolicy,
  CombatRollContext,
  NpcTargetLike,
  TargetResolution
} from "../combat/combat-types";
import type {
  NaturalEffect,
  RollContext,
  RollPolicy,
  RollResult,
  RollStepContribution
} from "../rolls/roll-types";
