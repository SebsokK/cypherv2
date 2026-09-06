import type {
  CombatRollContext,
  NpcModificationData,
  NpcTargetLike,
  TargetResolution
} from "../combat/combat-types";
import type {RuleRegistry} from "../rules/rule-registry";
import type {RollStepContribution} from "../rolls/roll-types";
import {combatTargetIdentity} from "../combat/combat-types";
import {npcTargetFromToken} from "../combat/combat-targets";

function integer(value: number, label: string, minimum?: number): number {
  if (!Number.isInteger(value) || (minimum !== undefined && value < minimum)) {
    throw new Error(`${label} must be an integer${minimum === undefined ? "" : ` of at least ${minimum}`}.`);
  }
  return value;
}

function contextMatches(modification: NpcModificationData, context: CombatRollContext): boolean {
  return modification.contexts.every((entry) => context.tags.includes(entry));
}

function predicateMatches(
  predicate: Readonly<Record<string, unknown>>,
  context: CombatRollContext
): boolean {
  for (const [key, expected] of Object.entries(predicate)) {
    if (key === "tagsAll") {
      if (!Array.isArray(expected) || !expected.every((tag) => (
        typeof tag === "string" && context.tags.includes(tag)
      ))) return false;
      continue;
    }
    if (key === "tagsAny") {
      if (!Array.isArray(expected) || !expected.some((tag) => (
        typeof tag === "string" && context.tags.includes(tag)
      ))) return false;
      continue;
    }
    const actual = key === "pool"
      ? context.pool
      : key === "attackType"
        ? context.attackType
        : key === "weaponCategory"
          ? context.weaponCategory
          : key === "defenseType"
            ? context.defenseType
            : undefined;
    if (actual === undefined) return false;
    if (Array.isArray(expected)) {
      if (!expected.includes(actual)) return false;
    } else if (expected !== actual) return false;
  }
  return true;
}

function specificity(modification: NpcModificationData): number {
  return modification.contexts.length + Object.keys(modification.predicate).length;
}

function stepContribution(modification: NpcModificationData): RollStepContribution {
  integer(modification.value, `NPC modification '${modification.id}'`, 0);
  return {
    id: `npc-modification.${modification.id}`,
    label: "CYPHERV2.Combat.TargetModification",
    direction: modification.mode === "ease" ? "ease" : "hinder",
    steps: modification.value,
    source: "other",
    sourceId: modification.id
  };
}

export class TargetResolver {
  readonly #rules: RuleRegistry;

  constructor(rules: RuleRegistry) {
    this.#rules = rules;
  }

  resolve(
    target: NpcTargetLike,
    context: CombatRollContext,
    enabledRuleModuleIds: readonly string[] = []
  ): TargetResolution {
    if (target.type !== "npc") throw new Error("Combat targets must be NPC Actors.");
    const baseLevel = integer(target.system.level, "NPC Level", 0);
    const matches = target.system.modifications
      .map((modification, index) => ({modification, index}))
      .filter(({modification}) => (
        contextMatches(modification, context) && predicateMatches(modification.predicate, context)
      ));
    const override = matches
      .filter(({modification}) => modification.mode === "levelOverride")
      .sort((left, right) => (
        specificity(right.modification) - specificity(left.modification) || right.index - left.index
      ))[0]?.modification;
    let difficulty = override
      ? integer(override.value, `NPC modification '${override.id}'`, 0)
      : baseLevel;
    const applied = override ? [override.id] : [];
    for (const {modification} of matches) {
      if (modification.mode !== "levelDelta") continue;
      difficulty += integer(modification.value, `NPC modification '${modification.id}'`);
      applied.push(modification.id);
    }
    difficulty = Math.max(0, difficulty);
    const contributions = matches
      .map(({modification}) => modification)
      .filter((modification) => modification.mode === "ease" || modification.mode === "hinder")
      .map((modification) => {
        applied.push(modification.id);
        return stepContribution(modification);
      });
    return this.#rules.enrichTargetResolution({
      targetId: target.id,
      targetIdentity: combatTargetIdentity(target),
      targetName: target.name,
      baseLevel,
      difficulty,
      contributions,
      appliedModificationIds: applied
    }, target, context, enabledRuleModuleIds);
  }

  nativeNpcTargets(): readonly NpcTargetLike[] {
    return [...(game.user.targets ?? [])]
      .map((token) => npcTargetFromToken(token))
      .filter((target): target is NpcTargetLike => target !== null);
  }
}
