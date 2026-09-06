import {
  CORE_ADVANCEMENT_KINDS,
  CORE_ADVANCEMENT_POLICY,
  type AdvancementPolicy,
  type AdvancementPurchaseRecord,
  type AdvancementRequest,
  type CharacterAdvancementData,
  type CoreAdvancementKind,
  type OtherAdvancementKind,
  type PendingFocusChoice,
  type PendingGenreChoice
} from "../advancement/advancement-types";
import {
  ARMOR_CATEGORIES,
  SKILL_RANKS,
  WEAPON_CATEGORIES,
  type SkillRank
} from "../constants/system";
import type {PoolKey} from "../rules/core/core-types";
import type {RuleRegistry} from "../rules/rule-registry";
import {
  characterProgressionDelta,
  effectiveTier,
  resolveNumericOverride
} from "../rules/core/character-overrides";

export type AdvancementErrorCode =
  | "not-character"
  | "cycle-complete"
  | "already-purchased"
  | "other-already-purchased"
  | "insufficient-xp"
  | "invalid-allocation"
  | "effort-maximum"
  | "skill-not-found"
  | "duplicate-skill"
  | "skill-maximum"
  | "skill-tier"
  | "genre-tier"
  | "tier-not-ready";

export class AdvancementError extends Error {
  constructor(readonly code: AdvancementErrorCode, message: string) {
    super(message);
    this.name = "AdvancementError";
  }
}

export interface AdvancementSkillLike {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly system: {
    readonly rank: SkillRank;
    readonly category: string;
    readonly contexts: readonly string[];
    readonly acquisition?: {readonly grantedByUuid?: string};
  };
  update(changes: Record<string, unknown>): Promise<unknown>;
  delete?(): Promise<unknown>;
}

export interface AdvancementSkillSourceLike {
  readonly uuid: string;
  readonly name: string;
  readonly type: string;
  readonly system: AdvancementSkillLike["system"] & Record<string, unknown>;
}

export type AdvancementSkillResolver = (uuid: string) => Promise<AdvancementSkillSourceLike | null>;
const foundrySkillResolver: AdvancementSkillResolver = async (uuid) => {
  try {
    const document = await fromUuid(uuid);
    if (!document || typeof document !== "object" || !("type" in document)) return null;
    const item = document as AdvancementSkillSourceLike;
    return item.type === "skill" ? item : null;
  } catch {
    return null;
  }
};

export interface AdvancementCharacterLike {
  readonly id: string;
  readonly uuid?: string;
  readonly type: string;
  readonly items: Iterable<AdvancementSkillLike>;
  readonly system: {
    readonly tier: number;
    readonly overrides: {
      readonly tier: number | null;
      readonly effort: number | null;
      readonly stats: Record<PoolKey, {readonly max: number | null; readonly edge: number | null}>;
    };
    readonly xp: number;
    readonly resourcePoints: number;
    readonly stats: {
      readonly effortBase: number;
      readonly might: {readonly value: number; readonly baseMax: number; readonly baseEdge: number};
      readonly speed: {readonly value: number; readonly baseMax: number; readonly baseEdge: number};
      readonly intellect: {readonly value: number; readonly baseMax: number; readonly baseEdge: number};
    };
    readonly derived: {
      readonly tier?: {readonly value: number};
      readonly pools: Record<PoolKey, {readonly max: number}>;
      readonly effort?: {readonly max: number};
    };
    readonly recovery: {readonly bonus: number};
    readonly advancement: CharacterAdvancementData;
    readonly proficiencies: {
      readonly weaponCategories: readonly string[];
      readonly armorCategories: readonly string[];
      readonly freelyUse: readonly string[];
    };
  };
  update(changes: Record<string, unknown>): Promise<unknown>;
  createEmbeddedDocuments(
    type: string,
    data: Record<string, unknown>[],
    operation?: Record<string, unknown>
  ): Promise<unknown[]>;
}

export interface SkillTrainingOption {
  readonly id: string;
  readonly name: string;
  readonly currentRank: SkillRank;
  readonly nextRank: SkillRank | null;
  readonly eligible: boolean;
  readonly reason: "eligible" | "maximum" | "tier";
  readonly abilityLinked: boolean;
}

export interface AdvancementView {
  readonly policy: AdvancementPolicy;
  readonly purchasedCount: number;
  readonly remainingCount: number;
  readonly canAdvanceTier: boolean;
  readonly options: readonly {
    readonly kind: CoreAdvancementKind;
    readonly purchased: boolean;
    readonly available: boolean;
  }[];
  readonly other: {readonly purchased: boolean; readonly available: boolean};
}

export interface ProgressionGuidanceView {
  readonly tier: number;
  readonly completed: boolean;
  readonly focusAbilityCount: number;
  readonly includesGenreAbility: boolean;
}

export interface AdvancementPurchaseResult {
  readonly record: AdvancementPurchaseRecord;
  readonly resourcePointsGranted: number;
  readonly skillRank?: SkillRank;
}

export interface TierAdvancementResult {
  readonly tier: number;
  readonly focusChoice: PendingFocusChoice;
  readonly genreChoice: PendingGenreChoice | null;
}

type IdFactory = () => string;

const defaultIdFactory: IdFactory = () => globalThis.crypto?.randomUUID?.()
  ?? `adv-${Date.now()}-${Math.random().toString(36).slice(2)}`;

function isCombatSkill(skill: AdvancementSkillLike): boolean {
  return skill.system.category === "attack"
    || skill.system.category === "defense"
    || skill.system.contexts.some((context) => (
      context === "attack" || context.startsWith("attack.")
      || context === "defense" || context.startsWith("defense.")
    ));
}

function nextTrainingRank(rank: SkillRank): SkillRank | null {
  if (rank === "inability") return "untrained";
  if (rank === "untrained") return "trained";
  if (rank === "trained") return "specialized";
  return null;
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

export class AdvancementService {
  readonly #rules: RuleRegistry;
  readonly #idFactory: IdFactory;
  readonly #now: () => number;
  readonly #resolveSkill: AdvancementSkillResolver;
  readonly #operations = new Map<string, Promise<unknown>>();

  constructor(
    rules: RuleRegistry,
    idFactory: IdFactory = defaultIdFactory,
    now: () => number = Date.now,
    resolveSkill: AdvancementSkillResolver = foundrySkillResolver
  ) {
    this.#rules = rules;
    this.#idFactory = idFactory;
    this.#now = now;
    this.#resolveSkill = resolveSkill;
  }

  policy(enabledRuleModuleIds: readonly string[] = []): AdvancementPolicy {
    return this.#rules.resolveAdvancementPolicy(CORE_ADVANCEMENT_POLICY, enabledRuleModuleIds);
  }

  view(actor: AdvancementCharacterLike, enabledRuleModuleIds: readonly string[] = []): AdvancementView {
    const policy = this.policy(enabledRuleModuleIds);
    const purchases = actor.system.advancement.purchases;
    const complete = purchases.length >= policy.purchasesPerTier;
    return {
      policy,
      purchasedCount: purchases.length,
      remainingCount: Math.max(0, policy.purchasesPerTier - purchases.length),
      canAdvanceTier: purchases.length === policy.purchasesPerTier,
      options: CORE_ADVANCEMENT_KINDS.map((kind) => {
        const purchased = purchases.some((record) => record.kind === kind);
        const benefitAvailable = kind === "extraEffort"
          ? this.#effectiveEffort(actor) < policy.effortMaximum
          : true;
        return {kind, purchased, available: !complete && !purchased && benefitAvailable};
      }),
      other: {
        purchased: purchases.some((record) => record.kind === "other"),
        available: !complete && !purchases.some((record) => record.kind === "other")
      }
    };
  }

  progressionGuidance(
    actor: AdvancementCharacterLike,
    enabledRuleModuleIds: readonly string[] = []
  ): ProgressionGuidanceView {
    const tier = effectiveTier(actor.system);
    return {
      tier,
      completed: (actor.system.advancement.guidanceCompletedTiers ?? []).includes(tier),
      focusAbilityCount: tier === 1 ? 2 : 1,
      includesGenreAbility: this.policy(enabledRuleModuleIds).genreChoiceForTier(tier)
    };
  }

  async completeProgressionGuidance(actor: AdvancementCharacterLike): Promise<void> {
    return this.#exclusive(actor, async () => {
      this.#assertCharacter(actor);
      const completed = new Set(actor.system.advancement.guidanceCompletedTiers ?? []);
      completed.add(effectiveTier(actor.system));
      await actor.update({
        "system.advancement.guidanceCompletedTiers": [...completed].sort((left, right) => left - right)
      });
    });
  }

  async resetProgressionGuidance(actor: AdvancementCharacterLike): Promise<void> {
    return this.#exclusive(actor, async () => {
      this.#assertCharacter(actor);
      await actor.update({
        "system.advancement.guidanceCompletedTiers": (actor.system.advancement.guidanceCompletedTiers ?? [])
          .filter((tier) => tier !== effectiveTier(actor.system))
      });
    });
  }

  skillTrainingOptions(
    actor: AdvancementCharacterLike,
    enabledRuleModuleIds: readonly string[] = []
  ): SkillTrainingOption[] {
    const policy = this.policy(enabledRuleModuleIds);
    return [...actor.items]
      .filter((item) => item.type === "skill" && SKILL_RANKS.includes(item.system.rank))
      .map((skill): SkillTrainingOption => {
        const nextRank = nextTrainingRank(skill.system.rank);
        const minimumTier = nextRank === "trained"
          ? policy.attackDefenseTrainingTier
          : nextRank === "specialized"
            ? policy.attackDefenseSpecializationTier
            : 0;
        const tierBlocked = Boolean(nextRank && isCombatSkill(skill) && effectiveTier(actor.system) < minimumTier);
        return {
          id: skill.id,
          name: skill.name,
          currentRank: skill.system.rank,
          nextRank,
          eligible: Boolean(nextRank && !tierBlocked),
          reason: !nextRank ? "maximum" : tierBlocked ? "tier" : "eligible",
          abilityLinked: Boolean(skill.system.acquisition?.grantedByUuid)
        };
      })
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  async purchase(
    actor: AdvancementCharacterLike,
    request: AdvancementRequest,
    enabledRuleModuleIds: readonly string[] = []
  ): Promise<AdvancementPurchaseResult> {
    return this.#exclusive(actor, () => this.#purchaseLocked(actor, request, enabledRuleModuleIds, false));
  }

  /** Explicit integration point for GM tooling; Core slot and benefit validation still applies. */
  async purchaseWithGmOverride(
    actor: AdvancementCharacterLike,
    request: AdvancementRequest,
    enabledRuleModuleIds: readonly string[] = []
  ): Promise<AdvancementPurchaseResult> {
    return this.#exclusive(actor, () => this.#purchaseLocked(actor, request, enabledRuleModuleIds, true));
  }

  async advanceTier(
    actor: AdvancementCharacterLike,
    enabledRuleModuleIds: readonly string[] = []
  ): Promise<TierAdvancementResult> {
    return this.#exclusive(actor, async () => {
      this.#assertCharacter(actor);
      const policy = this.policy(enabledRuleModuleIds);
      if (actor.system.advancement.purchases.length !== policy.purchasesPerTier) {
        throw new AdvancementError("tier-not-ready", "Four Advancements are required before advancing Tier.");
      }
      const tierProgression = characterProgressionDelta(actor.system, "tier", 1);
      const tier = tierProgression.value;
      const focusChoice: PendingFocusChoice = {
        id: this.#idFactory(),
        source: "newTier",
        grantTier: tier,
        focusUuid: ""
      };
      const genreChoice = policy.genreChoiceForTier(tier) ? {
        id: this.#idFactory(),
        source: "newTier" as const,
        grantTier: tier
      } : null;
      await actor.update({
        [tierProgression.path]: tier,
        "system.advancement.cycle": actor.system.advancement.cycle + 1,
        "system.advancement.purchases": [],
        "system.advancement.pendingFocusChoices": [
          ...actor.system.advancement.pendingFocusChoices,
          focusChoice
        ],
        ...(genreChoice ? {
          "system.advancement.pendingGenreChoices": [
            ...actor.system.advancement.pendingGenreChoices,
            genreChoice
          ]
        } : {})
      });
      return {tier, focusChoice, genreChoice};
    });
  }

  async #purchaseLocked(
    actor: AdvancementCharacterLike,
    request: AdvancementRequest,
    enabledRuleModuleIds: readonly string[],
    gmOverride: boolean
  ): Promise<AdvancementPurchaseResult> {
    this.#assertCharacter(actor);
    const policy = this.policy(enabledRuleModuleIds);
    const purchases = actor.system.advancement.purchases;
    if (purchases.length >= policy.purchasesPerTier) {
      throw new AdvancementError("cycle-complete", "This advancement cycle is complete.");
    }
    if (request.kind === "other") {
      if (purchases.some((record) => record.kind === "other")) {
        throw new AdvancementError("other-already-purchased", "Other Advancement is unique per cycle.");
      }
    } else if (purchases.some((record) => record.kind === request.kind)) {
      throw new AdvancementError("already-purchased", "That Advancement was already purchased this cycle.");
    }
    const xpCost = gmOverride ? 0 : policy.xpCost;
    if (actor.system.xp < xpCost) {
      throw new AdvancementError("insufficient-xp", "This Character does not have enough XP.");
    }
    const effectiveCharacterTier = effectiveTier(actor.system);
    const resourcePointsGranted = policy.resourcePointsForTier(effectiveCharacterTier);
    if (!Number.isInteger(resourcePointsGranted) || resourcePointsGranted < 0) {
      throw new Error("Advancement policy Resource Points must be a non-negative integer.");
    }

    const changes: Record<string, unknown> = {};
    let skillRollback: {skill: AdvancementSkillLike; rank: SkillRank} | null = null;
    let createdSkill: AdvancementSkillLike | null = null;
    let skillRank: SkillRank | undefined;
    if (request.kind === "increaseCapabilities") {
      const values = Object.values(request.allocation);
      if (values.some((value) => !Number.isInteger(value) || value < 0)
        || values.reduce((sum, value) => sum + value, 0) !== policy.capabilityPoints) {
        throw new AdvancementError("invalid-allocation", "Pool allocation must distribute exactly four points.");
      }
      for (const pool of ["might", "speed", "intellect"] as const) {
        const amount = request.allocation[pool];
        const maximum = characterProgressionDelta(
          actor.system,
          `${pool}Max` as "mightMax" | "speedMax" | "intellectMax",
          amount
        );
        changes[maximum.path] = maximum.value;
        const effectiveMaximum = maximum.overrideActive
          ? maximum.value
          : actor.system.derived.pools[pool].max + amount;
        changes[`system.stats.${pool}.value`] = Math.min(
          actor.system.stats[pool].value + amount,
          effectiveMaximum
        );
      }
    } else if (request.kind === "moveTowardPerfection") {
      const edge = characterProgressionDelta(
        actor.system,
        `${request.pool}Edge` as "mightEdge" | "speedEdge" | "intellectEdge",
        1
      );
      changes[edge.path] = edge.value;
    } else if (request.kind === "extraEffort") {
      if (this.#effectiveEffort(actor) >= policy.effortMaximum) {
        throw new AdvancementError("effort-maximum", "Core Effort is already at its maximum.");
      }
      const effort = characterProgressionDelta(actor.system, "effort", 1);
      changes[effort.path] = effort.value;
    } else if (request.kind === "skillTraining") {
      if (request.mode === "improve") {
        const option = this.skillTrainingOptions(actor, enabledRuleModuleIds)
          .find((entry) => entry.id === request.skillId);
        const skill = [...actor.items].find((item) => item.id === request.skillId && item.type === "skill");
        if (!option || !skill) throw new AdvancementError("skill-not-found", "Skill Item not found.");
        if (option.reason === "maximum" || !option.nextRank) {
          throw new AdvancementError("skill-maximum", "This Skill cannot be improved by Core Advancement.");
        }
        if (option.reason === "tier") {
          throw new AdvancementError("skill-tier", "Attack and defense training is not available at this Tier.");
        }
        skillRollback = {skill, rank: skill.system.rank};
        skillRank = option.nextRank;
      } else {
        const data = await this.#newSkillData(actor, request, policy);
        const created = await actor.createEmbeddedDocuments("Item", [data]);
        createdSkill = created[0] as AdvancementSkillLike | undefined ?? null;
        if (!createdSkill) throw new Error("Foundry did not create the learned Skill Item.");
        skillRank = "trained";
      }
    } else {
      this.#prepareOther(actor, request.otherKind, policy, changes);
    }

    const record: AdvancementPurchaseRecord = {
      id: this.#idFactory(),
      kind: request.kind,
      otherKind: request.kind === "other" ? request.otherKind : "none",
      tier: effectiveCharacterTier,
      xpCost,
      resourcePointsGranted,
      timestamp: this.#now()
    };
    Object.assign(changes, {
      "system.xp": actor.system.xp - xpCost,
      "system.resourcePoints": actor.system.resourcePoints + resourcePointsGranted,
      "system.advancement.purchases": [...purchases, record]
    });

    if (skillRollback && skillRank) await skillRollback.skill.update({"system.rank": skillRank});
    try {
      await actor.update(changes);
    } catch (error) {
      if (skillRollback) await skillRollback.skill.update({"system.rank": skillRollback.rank});
      if (createdSkill?.delete) await createdSkill.delete();
      throw error;
    }
    return {...(skillRank ? {skillRank} : {}), record, resourcePointsGranted};
  }

  async #newSkillData(
    actor: AdvancementCharacterLike,
    request: Extract<AdvancementRequest, {kind: "skillTraining"; mode: "learn"}>,
    policy: AdvancementPolicy
  ): Promise<Record<string, unknown>> {
    const source = request.sourceUuid ? await this.#resolveSkill(request.sourceUuid) : null;
    if (request.sourceUuid && !source) {
      throw new AdvancementError("skill-not-found", "The selected Skill source is unavailable.");
    }
    const name = source?.name.trim() || request.customName?.trim() || "";
    if (!name) throw new AdvancementError("skill-not-found", "A new custom Skill requires a name.");
    const duplicate = [...actor.items].some((item) => item.type === "skill" && (
      item.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase()
      || Boolean(source?.uuid && item.system.acquisition?.grantedByUuid === source.uuid)
    ));
    if (duplicate) {
      throw new AdvancementError("duplicate-skill", "This Character already owns that Skill.");
    }
    const category = source?.system.category ?? request.customCategory ?? "general";
    const contexts = source?.system.contexts ?? (category === "general" ? [] : [category]);
    const combat = category === "attack" || category === "defense"
      || contexts.some((context) => context === "attack" || context.startsWith("attack.")
        || context === "defense" || context.startsWith("defense."));
    if (combat && effectiveTier(actor.system) < policy.attackDefenseTrainingTier) {
      throw new AdvancementError("skill-tier", "Attack and defense training is not available at this Tier.");
    }
    return {
      name,
      type: "skill",
      system: {
        ...(source ? structuredClone(source.system) : {}),
        rank: "trained",
        category,
        contexts,
        acquisition: {
          ...((source?.system.acquisition as Record<string, unknown> | undefined) ?? {}),
          minimumTier: combat ? policy.attackDefenseTrainingTier : 1,
          grantedByUuid: source?.uuid ?? "",
          notes: ""
        }
      }
    };
  }

  #prepareOther(
    actor: AdvancementCharacterLike,
    kind: OtherAdvancementKind,
    policy: AdvancementPolicy,
    changes: Record<string, unknown>
  ): void {
    if (kind === "recovery") {
      changes["system.recovery.bonus"] = actor.system.recovery.bonus + policy.recoveryBonus;
    } else if (kind === "focus") {
      const choice: PendingFocusChoice = {
        id: this.#idFactory(),
        source: "otherAdvancement",
        grantTier: effectiveTier(actor.system),
        focusUuid: ""
      };
      changes["system.advancement.pendingFocusChoices"] = [
        ...actor.system.advancement.pendingFocusChoices,
        choice
      ];
    } else if (kind === "armor") {
      changes["system.proficiencies.armorCategories"] = unique([
        ...actor.system.proficiencies.armorCategories,
        ...ARMOR_CATEGORIES
      ]);
    } else if (kind === "weapons") {
      changes["system.proficiencies.weaponCategories"] = unique([
        ...actor.system.proficiencies.weaponCategories,
        ...WEAPON_CATEGORIES
      ]);
    } else {
      if (effectiveTier(actor.system) < 3) {
        throw new AdvancementError("genre-tier", "Genre Advancement requires Tier 3 or higher.");
      }
      const choice: PendingGenreChoice = {
        id: this.#idFactory(),
        source: "otherAdvancement",
        grantTier: effectiveTier(actor.system)
      };
      changes["system.advancement.pendingGenreChoices"] = [
        ...actor.system.advancement.pendingGenreChoices,
        choice
      ];
    }
  }

  #assertCharacter(actor: AdvancementCharacterLike): void {
    if (actor.type !== "character") {
      throw new AdvancementError("not-character", "Advancement requires a Character.");
    }
  }

  #effectiveEffort(actor: AdvancementCharacterLike): number {
    return actor.system.derived.effort?.max
      ?? resolveNumericOverride(actor.system.stats.effortBase, actor.system.overrides?.effort);
  }

  #key(actor: AdvancementCharacterLike): string {
    return actor.uuid ?? actor.id;
  }

  async #exclusive<T>(actor: AdvancementCharacterLike, operation: () => Promise<T>): Promise<T> {
    const key = this.#key(actor);
    const previous = this.#operations.get(key) ?? Promise.resolve();
    const current = previous.catch(() => undefined).then(operation);
    this.#operations.set(key, current);
    try {
      return await current;
    } finally {
      if (this.#operations.get(key) === current) this.#operations.delete(key);
    }
  }
}
