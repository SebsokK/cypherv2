import type {SkillRank} from "../constants/system";
import {coreNaturalEffects} from "../rolls/roll-engine";
import type {RollStepContribution} from "../rolls/roll-types";
import {type RuleModuleDefinition, RuleRegistry} from "./rule-registry";
import type {CombatPolicy} from "../combat/combat-types";
import {CORE_ADVANCEMENT_POLICY} from "../advancement/advancement-types";

export const CORE_RULE_MODULE: RuleModuleDefinition = {
  id: "cypherv2.core",
  title: "CYPHERV2.Rules.Core",
  version: "0.1.0",
  core: true,
  priority: -1000,
  extensionPoints: [
    "actorDerivedData",
    "rollModifiers",
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
    "focusBehaviors"
  ]
};

export function registerCoreRuleModule(registry: RuleRegistry): void {
  registry.register(CORE_RULE_MODULE);
  registry.registerDifficultyPolicy(CORE_RULE_MODULE.id, (policy) => ({
    ...policy,
    assetLimit: 2
  }));
  registry.registerSkillRankRule(CORE_RULE_MODULE.id, coreSkillRankContribution);
  registry.registerNaturalResultRule(CORE_RULE_MODULE.id, (result, effects) => [
    ...effects,
    ...coreNaturalEffects(result, result.prepared.context.horrorIntrusionRange)
  ]);
  registry.registerGMIntrusionPolicy(CORE_RULE_MODULE.id, (policy) => ({
    ...policy,
    targetedXpToTarget: 1,
    targetedXpToShare: 1,
    groupXpPerTarget: 1,
    freeXp: 0
  }));
  registry.registerCombatPolicy(CORE_RULE_MODULE.id, () => CORE_COMBAT_POLICY);
  registry.registerAdvancementPolicy(CORE_RULE_MODULE.id, () => CORE_ADVANCEMENT_POLICY);
}

export const CORE_COMBAT_POLICY: CombatPolicy = Object.freeze({
  weaponDamage: Object.freeze({light: 2, medium: 4, heavy: 6}),
  lightWeaponEase: 1,
  unfamiliarWeaponHindrance: 1,
  armorDefenseSteps: Object.freeze({light: 1, medium: 2, heavy: 3}),
  blockSeverityReduction: 1,
  damageEffortBonus: 3
});

const SKILL_RANK_STEPS: Readonly<Record<SkillRank, number>> = Object.freeze({
  inability: -1,
  untrained: 0,
  trained: 1,
  specialized: 2,
  expert: 3
});

function coreSkillRankContribution(
  rank: SkillRank,
  source: Readonly<{id: string; name: string}>
): RollStepContribution | null {
  const steps = SKILL_RANK_STEPS[rank];
  if (steps === 0) return null;
  return {
    id: `core.skill.${source.id}.rank`,
    label: `CYPHERV2.Skill.Ranks.${rank}`,
    direction: steps > 0 ? "ease" : "hinder",
    steps: Math.abs(steps),
    source: "skill",
    sourceId: source.id
  };
}
