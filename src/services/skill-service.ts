import {
  SKILL_DEFAULT_POOLS,
  SKILL_RANKS,
  type SkillDefaultPool,
  type SkillRank
} from "../constants/system";
import type {RuleRegistry} from "../rules/rule-registry";
import {POOL_KEYS, type PoolKey} from "../rules/core/core-types";
import type {
  CharacterRollRequest,
  RollDifficulty,
  RollStepContribution
} from "../rolls/roll-types";

export interface SkillItemLike {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly system: {
    readonly rank: SkillRank;
    readonly defaultPool: SkillDefaultPool;
    readonly contexts?: readonly string[];
    readonly category?: string;
    readonly description: string;
  };
}

export interface SkillRollOptions {
  readonly pool?: PoolKey;
  /** UI override for contextual use; it never mutates the Skill Item. */
  readonly rankOverride?: SkillRank;
  readonly difficulty: RollDifficulty;
  readonly assets?: number;
  readonly paidEffort?: number;
  readonly freeEffort?: number;
  readonly otherEase?: number;
  readonly otherHindrance?: number;
  readonly contributions?: readonly RollStepContribution[];
  readonly enabledRuleModuleIds?: readonly string[];
}

export interface SkillQuickRollOptions {
  readonly difficulty?: RollDifficulty;
  readonly contributions?: readonly RollStepContribution[];
  readonly enabledRuleModuleIds?: readonly string[];
}

function isPool(value: string): value is PoolKey {
  return POOL_KEYS.includes(value as PoolKey);
}

export class SkillService {
  readonly #rules: RuleRegistry;

  constructor(rules: RuleRegistry) {
    this.#rules = rules;
  }

  configuredPool(skill: SkillItemLike): PoolKey | null {
    if (!SKILL_DEFAULT_POOLS.includes(skill.system.defaultPool)) {
      throw new Error(`Unknown Skill default Pool '${skill.system.defaultPool}'.`);
    }
    return isPool(skill.system.defaultPool) ? skill.system.defaultPool : null;
  }

  rankContribution(
    skill: SkillItemLike,
    enabledRuleModuleIds: readonly string[] = []
  ): RollStepContribution | null {
    if (skill.type !== "skill") throw new Error("Skill contributions require a Skill Item.");
    if (!SKILL_RANKS.includes(skill.system.rank)) throw new Error(`Unknown Skill rank '${skill.system.rank}'.`);
    return this.#rules.resolveSkillRankContribution(
      skill.system.rank,
      {id: skill.id, name: skill.name},
      enabledRuleModuleIds
    );
  }

  buildRollRequest(skill: SkillItemLike, options: SkillRollOptions): CharacterRollRequest {
    if (skill.type !== "skill") throw new Error("Skill rolls require a Skill Item.");
    if (!SKILL_RANKS.includes(skill.system.rank)) throw new Error(`Unknown Skill rank '${skill.system.rank}'.`);
    const pool = options.pool ?? this.configuredPool(skill);
    if (!pool) throw new Error("Choose a Pool for this Skill roll.");
    const effectiveSkill = options.rankOverride
      ? {...skill, system: {...skill.system, rank: options.rankOverride}}
      : skill;
    if (!SKILL_RANKS.includes(effectiveSkill.system.rank)) {
      throw new Error(`Unknown Skill rank '${effectiveSkill.system.rank}'.`);
    }
    const rankContribution = this.rankContribution(effectiveSkill, options.enabledRuleModuleIds ?? []);
    return {
      label: skill.name,
      pool,
      difficulty: options.difficulty,
      skillSteps: 0,
      assets: options.assets ?? 0,
      paidEffort: options.paidEffort ?? 0,
      freeEffort: options.freeEffort ?? 0,
      otherEase: options.otherEase ?? 0,
      otherHindrance: options.otherHindrance ?? 0,
      contributions: [
        ...(rankContribution ? [rankContribution] : []),
        ...(options.contributions ?? [])
      ],
      purpose: "task",
      origin: {
        kind: "skill",
        itemId: skill.id,
        name: skill.name,
        rank: effectiveSkill.system.rank
      }
    };
  }

  buildQuickRollRequest(
    skill: SkillItemLike,
    options: SkillQuickRollOptions = {}
  ): CharacterRollRequest {
    if (skill.type !== "skill") throw new Error("Skill rolls require a Skill Item.");
    if (!SKILL_RANKS.includes(skill.system.rank)) throw new Error(`Unknown Skill rank '${skill.system.rank}'.`);
    const rankContribution = this.rankContribution(skill, options.enabledRuleModuleIds ?? []);
    return {
      label: skill.name,
      pool: this.configuredPool(skill),
      difficulty: options.difficulty ?? {mode: "unknown"},
      skillSteps: 0,
      assets: 0,
      paidEffort: 0,
      freeEffort: 0,
      otherEase: 0,
      otherHindrance: 0,
      contributions: [
        ...(rankContribution ? [rankContribution] : []),
        ...(options.contributions ?? [])
      ],
      purpose: "task",
      origin: {
        kind: "skill",
        itemId: skill.id,
        name: skill.name,
        rank: skill.system.rank
      }
    };
  }
}
