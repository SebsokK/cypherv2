import {
  DEFENSE_TYPES,
  type DefenseType,
  type WeaponCategory,
  type WoundSeverity
} from "../constants/system";
import {
  combatTargetIdentity,
  reduceWoundSeverity,
  type CombatPolicy,
  type CombatRollContext,
  type NpcTargetLike,
  type TargetResolution,
  type WeaponItemLike
} from "../combat/combat-types";
import type {RuleRegistry} from "../rules/rule-registry";
import {POOL_KEYS, type CharacterDocumentLike, type DerivedContribution, type PoolKey} from "../rules/core/core-types";
import type {
  CharacterRollRequest,
  RollDifficulty,
  RollExecution,
  RollPolicyRequest,
  RollResult,
  RollStepContribution
} from "../rolls/roll-types";
import type {RollCharacterDocumentLike} from "./roll-service";
import {RollService} from "./roll-service";
import type {SkillItemLike} from "./skill-service";
import {SkillService} from "./skill-service";
import {TargetResolver} from "./target-resolver";
import {WoundService, type WoundApplicationResult} from "./wound-service";
import {
  NoopCombatFeedbackService,
  type CombatFeedbackService
} from "./combat-feedback-service";
import {
  NoopCombatStatusService,
  type CombatStatusService
} from "./combat-status-service";
import {
  ShieldService,
  type ShieldItemLike,
  type ShieldWoundApplication
} from "./shield-service";
import {WeaponService} from "./weapon-service";
import {normalizeWeaponFamily} from "../combat/weapon-family";

export interface CombatCharacterLike extends RollCharacterDocumentLike {
  readonly items: Iterable<unknown>;
  readonly uuid?: string;
  readonly actorUuid?: string;
  readonly tokenId?: string;
  readonly tokenUuid?: string;
}

export interface WeaponAttackOptions {
  readonly pool?: PoolKey;
  readonly targets?: readonly NpcTargetLike[];
  readonly difficulty?: RollDifficulty;
  readonly skill?: SkillItemLike;
  readonly skillSteps?: number;
  readonly assets?: number;
  readonly paidEffort?: number;
  readonly damageEffort?: number;
  readonly freeDamageEffort?: number;
  readonly freeEffort?: number;
  readonly otherEase?: number;
  readonly otherHindrance?: number;
  readonly contributions?: readonly RollStepContribution[];
  readonly extremeRange?: boolean;
  readonly enabledRuleModuleIds?: readonly string[];
}

export interface WeaponAttackPlan {
  readonly weapon: WeaponItemLike;
  readonly categoryDamage: number;
  readonly weaponBonusDamage: number;
  readonly baseDamage: number;
  readonly freelyUsed: boolean;
  readonly requests: readonly CharacterRollRequest[];
  readonly targets: readonly (NpcTargetLike | null)[];
  readonly targetResolutions: readonly (TargetResolution | null)[];
  readonly policy: CombatPolicy;
}

export interface WeaponAttackOutcome {
  readonly target: NpcTargetLike | null;
  readonly targetResolution: TargetResolution | null;
  readonly execution: RollExecution;
  readonly grossDamage: number;
  readonly categoryDamage: number;
  readonly weaponBonusDamage: number;
  readonly effortDamage: number;
  readonly naturalDamage: number;
  readonly armor: number;
  readonly netDamage: number;
  /** Per-use resources are attached once, to the first outcome of a multi-target attack. */
  readonly weaponUse?: WeaponUseResult;
}

export interface WeaponUseResult {
  readonly ammo?: {
    readonly previous: number;
    readonly current: number;
    readonly spent: number;
  };
}

export interface DefenseRollOptions {
  readonly difficulty: RollDifficulty;
  readonly skill?: SkillItemLike;
  readonly skillSteps?: number;
  readonly assets?: number;
  readonly paidEffort?: number;
  readonly freeEffort?: number;
  readonly otherEase?: number;
  readonly otherHindrance?: number;
  readonly contributions?: readonly RollStepContribution[];
  readonly source?: {readonly id: string; readonly name: string};
  readonly enabledRuleModuleIds?: readonly string[];
}

export interface NpcDamageApplication {
  readonly requestedDamage: number;
  readonly armor: number;
  readonly appliedDamage: number;
  readonly previousHealth: number;
  readonly health: number;
  readonly dead: boolean;
}

export interface DefenseWoundResolution {
  readonly recipient: "character" | "shield" | "none";
  readonly severity: WoundSeverity | "none";
  readonly shieldId?: string;
  readonly shieldName?: string;
}

const BASE_COMBAT_POLICY: CombatPolicy = Object.freeze({
  weaponDamage: Object.freeze({light: 2, medium: 4, heavy: 6}),
  lightWeaponEase: 1,
  unfamiliarWeaponHindrance: 1,
  armorDefenseSteps: Object.freeze({light: 1, medium: 2, heavy: 3}),
  blockSeverityReduction: 1,
  damageEffortBonus: 3
});

function nonNegativeInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0) throw new Error(`${label} must be a non-negative integer.`);
  return value;
}

function derivedContribution(
  contribution: DerivedContribution,
  direction: "ease" | "hinder",
  label: string
): RollStepContribution {
  return {
    id: contribution.id,
    label,
    direction,
    steps: contribution.value,
    source: "other",
    sourceId: contribution.sourceId
  };
}

export function naturalDamageBonus(result: RollResult): number {
  return result.naturalEffects
    .filter((effect) => effect.kind === "damage-bonus" && effect.status === "applied")
    .reduce((total, effect) => total + (effect.damageBonus ?? 0), 0);
}

export function chooseNaturalAttackEffect(
  result: RollResult,
  choice: "damage" | "effect"
): RollResult {
  const available = result.naturalEffects.filter((effect) => effect.status === "available");
  if (available.length === 0) return result;
  return {
    ...result,
    naturalEffects: result.naturalEffects.map((effect) => {
      if (effect.status !== "available") return effect;
      const chooseDamage = choice === "damage" && effect.kind === "damage-bonus";
      const chooseEffect = choice === "effect"
        && (effect.kind === "minor-effect" || effect.kind === "major-effect");
      return {...effect, status: chooseDamage || chooseEffect ? "applied" : "inapplicable"};
    })
  };
}

export class CombatService {
  readonly #rules: RuleRegistry;
  readonly #rolls: RollService;
  readonly #skills: SkillService;
  readonly #targets: TargetResolver;
  readonly #wounds: WoundService;
  readonly #feedback: CombatFeedbackService;
  readonly #statuses: CombatStatusService;
  readonly #shields: ShieldService;
  readonly #weapons: WeaponService;

  constructor(
    rules: RuleRegistry,
    rolls: RollService,
    skills: SkillService,
    targets: TargetResolver,
    wounds: WoundService,
    feedback: CombatFeedbackService = new NoopCombatFeedbackService(),
    statuses: CombatStatusService = new NoopCombatStatusService(),
    shields: ShieldService = new ShieldService(wounds),
    weapons: WeaponService = new WeaponService()
  ) {
    this.#rules = rules;
    this.#rolls = rolls;
    this.#skills = skills;
    this.#targets = targets;
    this.#wounds = wounds;
    this.#feedback = feedback;
    this.#statuses = statuses;
    this.#shields = shields;
    this.#weapons = weapons;
  }

  policy(enabledRuleModuleIds: readonly string[] = []): CombatPolicy {
    return this.#rules.resolveCombatPolicy(BASE_COMBAT_POLICY, enabledRuleModuleIds);
  }

  weaponBaseDamage(weapon: WeaponItemLike, policy = this.policy()): number {
    if (weapon.type !== "weapon") throw new Error("Weapon attacks require a Weapon Item.");
    if (!Number.isInteger(weapon.system.bonusDamage) || weapon.system.bonusDamage < 0) {
      throw new Error("Weapon bonus damage must be a non-negative integer.");
    }
    return Math.max(0, policy.weaponDamage[weapon.system.category] + weapon.system.bonusDamage);
  }

  weaponAttackPool(weapon: WeaponItemLike, explicitPool?: PoolKey): PoolKey {
    if (explicitPool) return explicitPool;
    const configured = weapon.system.defaultPool;
    if (configured && configured !== "none" && POOL_KEYS.includes(configured)) return configured;
    return weapon.system.attackType === "melee" ? "might" : "speed";
  }

  weaponFreelyUsed(actor: CombatCharacterLike, weapon: WeaponItemLike): boolean {
    const effectiveCategories = actor.system.derived.packages?.weaponCategories
      ?? actor.system.proficiencies.weaponCategories;
    const effectiveFamilies = actor.system.derived.packages?.weaponFamilies ?? [];
    const family = normalizeWeaponFamily(weapon.system.family);
    return effectiveCategories.includes(weapon.system.category)
      || (family !== "" && effectiveFamilies.some((entry) => normalizeWeaponFamily(entry) === family));
  }

  armorFreelyUsed(actor: CombatCharacterLike, armor: import("../combat/combat-types").ArmorItemLike): boolean {
    const effectiveCategories = actor.system.derived.packages?.armorCategories
      ?? actor.system.proficiencies.armorCategories;
    return effectiveCategories.includes(armor.system.category);
  }

  weaponFamiliarityContribution(
    actor: CombatCharacterLike,
    weapon: WeaponItemLike,
    enabledRuleModuleIds: readonly string[] = []
  ): RollStepContribution | null {
    const policy = this.policy(enabledRuleModuleIds);
    if (this.weaponFreelyUsed(actor, weapon) || policy.unfamiliarWeaponHindrance <= 0) return null;
    return {
      id: `weapon.${weapon.id}.unfamiliar`,
      label: `CYPHERV2.Combat.Weapon.Unfamiliar.${weapon.system.category}`,
      direction: "hinder",
      steps: policy.unfamiliarWeaponHindrance,
      source: "other",
      sourceId: weapon.id
    };
  }

  applicableWeaponSkills(
    actor: CombatCharacterLike,
    weapon: WeaponItemLike,
    enabledRuleModuleIds: readonly string[] = []
  ): readonly SkillItemLike[] {
    return this.#applicableSkills(actor, [
      "attack",
      "attack.weapon",
      `attack.${weapon.system.attackType}`,
      `weapon.${weapon.system.category}`
    ], enabledRuleModuleIds);
  }

  applicableDefenseSkills(
    actor: CombatCharacterLike,
    defenseType: DefenseType,
    enabledRuleModuleIds: readonly string[] = []
  ): readonly SkillItemLike[] {
    return this.#applicableSkills(actor, [
      "defense",
      ...(defenseType === "blockWithShield" ? ["defense.block"] : []),
      `defense.${defenseType}`
    ], enabledRuleModuleIds);
  }

  buildWeaponAttackPlan(
    actor: CombatCharacterLike,
    weapon: WeaponItemLike,
    options: WeaponAttackOptions = {}
  ): WeaponAttackPlan {
    if (weapon.type !== "weapon") throw new Error("Weapon attacks require a Weapon Item.");
    const enabled = options.enabledRuleModuleIds ?? [];
    const policy = this.policy(enabled);
    const freelyUsed = this.weaponFreelyUsed(actor, weapon);
    const pool = this.weaponAttackPool(weapon, options.pool);
    const context: CombatRollContext = {
      tags: [
        "attack",
        "attack.weapon",
        `attack.${weapon.system.attackType}`,
        `weapon.${weapon.system.category}`,
        "defense.speed"
      ],
      pool,
      attackType: weapon.system.attackType,
      weaponCategory: weapon.system.category
    };
    const targetActors = options.targets ?? [];
    const targetResolutions = targetActors.map((target) => this.#targets.resolve(target, context, enabled));
    const targets: readonly (NpcTargetLike | null)[] = targetActors.length > 0 ? targetActors : [null];
    const resolutions: readonly (TargetResolution | null)[] = targetResolutions.length > 0
      ? targetResolutions
      : [null];
    const commonContributions: RollStepContribution[] = [];
    if (weapon.system.category === "light" && policy.lightWeaponEase > 0) {
      commonContributions.push({
        id: `weapon.${weapon.id}.light`,
        label: "CYPHERV2.Combat.Weapon.LightEase",
        direction: "ease",
        steps: policy.lightWeaponEase,
        source: "other",
        sourceId: weapon.id
      });
    }
    const familiarityContribution = this.weaponFamiliarityContribution(actor, weapon, enabled);
    if (familiarityContribution) commonContributions.push(familiarityContribution);
    if (options.extremeRange) {
      commonContributions.push({
        id: `weapon.${weapon.id}.extreme-range`,
        label: "CYPHERV2.Combat.Weapon.ExtremeRange",
        direction: "hinder",
        steps: 1,
        source: "other",
        sourceId: weapon.id
      });
    }
    if (!Number.isInteger(weapon.system.attackModifier)
      || weapon.system.attackModifier < -2
      || weapon.system.attackModifier > 2) {
      throw new Error("Weapon attack modifier must be an integer from -2 to +2.");
    }
    if (weapon.system.attackModifier !== 0) {
      commonContributions.push({
        id: `weapon.${weapon.id}.attack-modifier`,
        label: "CYPHERV2.Combat.Weapon.AttackModifierContribution",
        direction: weapon.system.attackModifier > 0 ? "ease" : "hinder",
        steps: Math.abs(weapon.system.attackModifier),
        source: "other",
        sourceId: weapon.id
      });
    }
    const skillContribution = options.skill
      ? this.#skills.rankContribution(options.skill, enabled)
      : null;
    if (skillContribution) commonContributions.push(skillContribution);
    const categoryDamage = policy.weaponDamage[weapon.system.category];
    const weaponBonusDamage = weapon.system.bonusDamage;
    const baseDamage = this.weaponBaseDamage(weapon, policy);
    const requests = resolutions.map((resolution, index): CharacterRollRequest => ({
      label: weapon.name,
      pool,
      difficulty: resolution
        ? {mode: "hidden", value: resolution.difficulty}
        : options.difficulty ?? {mode: "unknown"},
      skillSteps: options.skillSteps ?? 0,
      assets: options.assets ?? 0,
      paidEffort: options.paidEffort ?? 0,
      damageEffort: options.damageEffort ?? 0,
      freeDamageEffort: options.freeDamageEffort ?? 0,
      freeEffort: options.freeEffort ?? 0,
      otherEase: options.otherEase ?? 0,
      otherHindrance: options.otherHindrance ?? 0,
      contributions: [...new Map([
        ...commonContributions,
        ...(resolution?.contributions ?? []),
        ...(options.contributions ?? [])
      ].map((entry) => [entry.id, entry])).values()],
      purpose: "damage",
      tags: [
        ...context.tags,
        ...(pool === "speed" ? ["speed-task"] : []),
        ...(options.extremeRange ? ["range.extreme"] : [])
      ],
      origin: {
        kind: "weapon",
        itemId: weapon.id,
        name: weapon.name,
        category: weapon.system.category,
        attackType: weapon.system.attackType,
        baseDamage
      },
      ...(targets[index] ? {
        target: {
          ...combatTargetIdentity(targets[index]!),
          name: targets[index]!.name,
          type: "npc"
        }
      } : {})
    }));
    return {
      weapon,
      categoryDamage,
      weaponBonusDamage,
      baseDamage,
      freelyUsed,
      requests,
      targets,
      targetResolutions: resolutions,
      policy
    };
  }

  async executeWeaponAttack(
    actor: CombatCharacterLike,
    weapon: WeaponItemLike,
    options: WeaponAttackOptions,
    policyRequest: RollPolicyRequest
  ): Promise<readonly WeaponAttackOutcome[]> {
    this.#weapons.assertCanAttack(weapon);
    const plan = this.buildWeaponAttackPlan(actor, weapon, options);
    const executions = await this.#rolls.executeBatch(actor, plan.requests, policyRequest);
    const weaponUse = executions.length > 0 ? await this.#consumeWeaponUse(weapon) : undefined;
    return executions.map((execution, index) => {
      const effortDamage = execution.result.prepared.damageEffortApplied
        * plan.policy.damageEffortBonus;
      const naturalDamage = naturalDamageBonus(execution.result);
      const grossDamage = plan.baseDamage + effortDamage + naturalDamage;
      const target = plan.targets[index] ?? null;
      const armor = target?.system.armorBase ?? 0;
      return {
        target,
        targetResolution: plan.targetResolutions[index] ?? null,
        execution,
        grossDamage,
        categoryDamage: plan.categoryDamage,
        weaponBonusDamage: plan.weaponBonusDamage,
        effortDamage,
        naturalDamage,
        armor,
        netDamage: Math.max(0, grossDamage - armor),
        ...(index === 0 && weaponUse ? {weaponUse} : {})
      };
    });
  }

  async #consumeWeaponUse(weapon: WeaponItemLike): Promise<WeaponUseResult> {
    const ammo = await this.#weapons.consumeAttack(weapon);
    return ammo ? {ammo} : {};
  }

  chooseAttackOutcomes(
    outcomes: readonly WeaponAttackOutcome[],
    choice: "damage" | "effect",
    enabledRuleModuleIds: readonly string[] = []
  ): readonly WeaponAttackOutcome[] {
    const policy = this.policy(enabledRuleModuleIds);
    return outcomes.map((outcome) => {
      const result = chooseNaturalAttackEffect(outcome.execution.result, choice);
      const origin = result.prepared.context.origin;
      if (origin?.kind !== "weapon") return outcome;
      const grossDamage = origin.baseDamage
        + (result.prepared.damageEffortApplied * policy.damageEffortBonus)
        + naturalDamageBonus(result);
      const effortDamage = result.prepared.damageEffortApplied * policy.damageEffortBonus;
      const naturalDamage = naturalDamageBonus(result);
      return {
        ...outcome,
        execution: {...outcome.execution, result},
        grossDamage,
        effortDamage,
        naturalDamage,
        netDamage: Math.max(0, grossDamage - outcome.armor)
      };
    });
  }

  buildDefenseRequest(
    actor: CombatCharacterLike,
    defenseType: DefenseType,
    options: DefenseRollOptions
  ): CharacterRollRequest {
    if (!DEFENSE_TYPES.includes(defenseType)) throw new Error(`Unknown defense '${defenseType}'.`);
    const enabled = options.enabledRuleModuleIds ?? [];
    const pool: PoolKey = defenseType === "dodge" ? "speed" : "might";
    const armor = actor.system.derived.combat.armor;
    const armorContributions = defenseType === "dodge"
      ? armor.dodgeContributions.map((entry) => (
          derivedContribution(entry, "hinder", "CYPHERV2.Combat.Armor.DodgeHindrance")
        ))
      : armor.blockContributions.map((entry) => (
          derivedContribution(entry, "ease", "CYPHERV2.Combat.Armor.BlockEase")
        ));
    const skillContribution = options.skill
      ? this.#skills.rankContribution(options.skill, enabled)
      : null;
    return {
      label: defenseType === "dodge"
        ? "CYPHERV2.Combat.Defense.DodgeRoll"
        : defenseType === "blockWithShield"
          ? "CYPHERV2.Combat.Defense.BlockWithShieldRoll"
          : "CYPHERV2.Combat.Defense.BlockRoll",
      pool,
      difficulty: options.difficulty,
      skillSteps: options.skillSteps ?? 0,
      assets: options.assets ?? 0,
      paidEffort: options.paidEffort ?? 0,
      damageEffort: 0,
      freeEffort: options.freeEffort ?? 0,
      otherEase: options.otherEase ?? 0,
      otherHindrance: options.otherHindrance ?? 0,
      contributions: [
        ...armorContributions,
        ...(skillContribution ? [skillContribution] : []),
        ...(options.contributions ?? [])
      ],
      purpose: "task",
      tags: [
        "defense",
        ...(defenseType === "blockWithShield" ? ["defense.block"] : []),
        `defense.${defenseType}`,
        ...(pool === "speed" ? ["speed-task"] : [])
      ],
      origin: {
        kind: "defense",
        defenseType,
        ...(options.source ? {sourceActorId: options.source.id, sourceName: options.source.name} : {})
      }
    };
  }

  buildDefenseAgainstNpcRequest(
    actor: CombatCharacterLike,
    npc: NpcTargetLike,
    defenseType: DefenseType,
    options: Omit<DefenseRollOptions, "difficulty" | "source"> = {}
  ): CharacterRollRequest {
    const context: CombatRollContext = {
      tags: ["attack", "npc-attack", `requested-defense.${defenseType}`],
      defenseType
    };
    const resolution = this.#targets.resolve(npc, context, options.enabledRuleModuleIds ?? []);
    return this.buildDefenseRequest(actor, defenseType, {
      ...options,
      difficulty: {mode: "hidden", value: resolution.difficulty},
      source: {id: npc.id, name: npc.name},
      contributions: [...resolution.contributions, ...(options.contributions ?? [])]
    });
  }

  woundAfterDefense(
    result: RollResult,
    defenseType: DefenseType,
    severity: WoundSeverity,
    enabledRuleModuleIds: readonly string[] = []
  ): WoundSeverity | "none" {
    if (result.success !== true) return severity;
    if (defenseType === "dodge") return "none";
    if (defenseType === "blockWithShield") return "none";
    return reduceWoundSeverity(severity, this.policy(enabledRuleModuleIds).blockSeverityReduction);
  }

  async resolveDefenseWound(
    actor: CombatCharacterLike,
    result: RollResult,
    defenseType: DefenseType,
    severity: WoundSeverity,
    source?: {readonly id: string; readonly name: string},
    enabledRuleModuleIds: readonly string[] = []
  ): Promise<DefenseWoundResolution> {
    if (defenseType !== "blockWithShield" || result.success !== true) {
      const characterSeverity = this.woundAfterDefense(result, defenseType, severity, enabledRuleModuleIds);
      return {
        recipient: characterSeverity === "none" ? "none" : "character",
        severity: characterSeverity
      };
    }
    const shield = await this.#shields.normalizeEquipped(actor);
    if (!shield || this.#shields.isBroken(shield)) {
      throw new Error("Block With Shield requires one equipped, functional Shield.");
    }
    return {
      recipient: "shield",
      severity,
      shieldId: shield.id,
      shieldName: shield.name
    };
  }

  async transferWoundToShield(
    actor: CombatCharacterLike,
    shield: ShieldItemLike,
    severity: WoundSeverity,
    source?: {readonly id: string; readonly name: string}
  ): Promise<ShieldWoundApplication> {
    const result = await this.#shields.applyResolved(actor, shield, severity, {
      ...(source ? {label: `${source.name} attack`} : {}),
      sourceUuid: source ? `Actor.${source.id}` : "cypherv2.combat"
    });
    if (result.appliedSeverity) {
      await this.#feedback.shieldWound?.(
        actor,
        shield.name,
        result.appliedSeverity,
        result.broken
      );
    }
    return result;
  }

  /** Commit a previously resolved Shield consequence from an authorized Chat action. */
  async applyShieldWound(
    actor: CombatCharacterLike,
    shield: ShieldItemLike,
    severity: WoundSeverity,
    source?: {readonly id: string; readonly name: string}
  ): Promise<ShieldWoundApplication> {
    return this.transferWoundToShield(actor, shield, severity, source);
  }

  async applyNpcDamage(target: NpcTargetLike, requestedDamage: number): Promise<NpcDamageApplication> {
    if (target.type !== "npc") throw new Error("NPC damage requires an NPC target.");
    const damage = nonNegativeInteger(requestedDamage, "Damage");
    const armor = nonNegativeInteger(target.system.armorBase, "NPC Armor");
    const previousHealth = nonNegativeInteger(target.system.health.value, "NPC Health");
    const appliedDamage = Math.max(0, damage - armor);
    const health = Math.max(0, previousHealth - appliedDamage);
    await target.update(
      {"system.health.value": health},
      {cypherv2SkipDeadStatusSync: true}
    );
    const result = {
      requestedDamage: damage,
      armor,
      appliedDamage,
      previousHealth,
      health,
      dead: health === 0
    };
    await this.#statuses.syncNpcDead(target, result.dead);
    await this.#feedback.npcDamage(target, result);
    return result;
  }

  async applyCharacterWound(
    target: CharacterDocumentLike & {readonly id: string} & import("../combat/combat-types").CombatTargetDocumentIdentity,
    severity: WoundSeverity,
    source?: {readonly id: string; readonly name: string}
  ): Promise<WoundApplicationResult> {
    const result = await this.#wounds.apply(target, severity, {
      ...(source ? {label: `${source.name} attack`} : {}),
      sourceUuid: source ? `Actor.${source.id}` : "cypherv2.combat"
    });
    if (result.appliedSeverity) await this.#feedback.characterWound(target, result.appliedSeverity);
    return result;
  }

  #applicableSkills(
    actor: CombatCharacterLike,
    tags: readonly string[],
    enabledRuleModuleIds: readonly string[]
  ): readonly SkillItemLike[] {
    return [...actor.items]
      .filter((item): item is SkillItemLike => {
        if (!item || typeof item !== "object") return false;
        const candidate = item as Partial<SkillItemLike>;
        if (candidate.type !== "skill" || !candidate.system) return false;
        const contexts = candidate.system.contexts ?? [];
        const category = candidate.system.category ?? "";
        return contexts.some((context) => tags.includes(context)) || tags.includes(category);
      })
      .sort((left, right) => {
        const leftContribution = this.#skills.rankContribution(left, enabledRuleModuleIds);
        const rightContribution = this.#skills.rankContribution(right, enabledRuleModuleIds);
        const score = (entry: RollStepContribution | null): number => entry
          ? entry.steps * (entry.direction === "ease" ? 1 : -1)
          : 0;
        return score(rightContribution) - score(leftContribution) || left.name.localeCompare(right.name);
      });
  }
}

export function weaponCategoryLabel(category: WeaponCategory): string {
  return `CYPHERV2.Combat.Weapon.Category.${category}`;
}
