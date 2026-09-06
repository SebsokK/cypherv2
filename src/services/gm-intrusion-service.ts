import type {GMIntrusionPolicy, GMIntrusionRecord} from "../intrusions/gm-intrusion-types";
import type {RuleRegistry} from "../rules/rule-registry";
import {
  assertCharacter,
  defaultIdFactory,
  type CharacterDocumentLike,
  type IdFactory
} from "../rules/core/core-types";
import type {RollResult} from "../rolls/roll-types";

const BASE_POLICY: GMIntrusionPolicy = Object.freeze({
  targetedXpToTarget: 0,
  targetedXpToShare: 0,
  groupXpPerTarget: 0,
  freeXp: 0
});

export interface GMIntrusionCharacterLike extends CharacterDocumentLike {
  readonly id: string;
  readonly name: string;
  readonly img?: string;
}

function target(actor: GMIntrusionCharacterLike): {actorId: string; actorName: string; actorImage?: string} {
  return {
    actorId: actor.id,
    actorName: actor.name,
    ...(actor.img ? {actorImage: actor.img} : {})
  };
}

export class GMIntrusionService {
  readonly #rules: RuleRegistry;
  readonly #idFactory: IdFactory;

  constructor(rules: RuleRegistry, idFactory: IdFactory = defaultIdFactory) {
    this.#rules = rules;
    this.#idFactory = idFactory;
  }

  policy(enabledRuleModuleIds: readonly string[] = []): GMIntrusionPolicy {
    return this.#rules.resolveGMIntrusionPolicy(BASE_POLICY, enabledRuleModuleIds);
  }

  async createTargeted(
    actor: GMIntrusionCharacterLike,
    enabledRuleModuleIds: readonly string[] = []
  ): Promise<GMIntrusionRecord> {
    assertCharacter(actor);
    const policy = this.policy(enabledRuleModuleIds);
    await this.#awardXp(actor, policy.targetedXpToTarget);
    return this.#record(
      "targeted",
      [actor],
      policy.targetedXpToTarget,
      policy.targetedXpToShare
    );
  }

  async createGroup(
    actors: readonly GMIntrusionCharacterLike[],
    enabledRuleModuleIds: readonly string[] = []
  ): Promise<GMIntrusionRecord> {
    const unique = [...new Map(actors.map((actor) => [actor.id, actor])).values()];
    if (unique.length === 0) throw new Error("Choose at least one Character for a Group Intrusion.");
    unique.forEach(assertCharacter);
    const policy = this.policy(enabledRuleModuleIds);
    await Promise.all(unique.map((actor) => this.#awardXp(actor, policy.groupXpPerTarget)));
    return this.#record(
      "group",
      unique,
      policy.groupXpPerTarget,
      0
    );
  }

  async createFreeFromNaturalResult(
    actor: GMIntrusionCharacterLike,
    result: RollResult,
    enabledRuleModuleIds: readonly string[] = []
  ): Promise<GMIntrusionRecord | null> {
    const triggers = result.naturalEffects.some(
      (effect) => effect.status === "applied" && effect.triggersGMIntrusion === true
    );
    if (!triggers || result.naturalRoll === null) return null;
    return this.createFree(actor, result.naturalRoll, enabledRuleModuleIds);
  }

  async createFree(
    actor: GMIntrusionCharacterLike,
    naturalRoll = 0,
    enabledRuleModuleIds: readonly string[] = []
  ): Promise<GMIntrusionRecord> {
    assertCharacter(actor);
    const policy = this.policy(enabledRuleModuleIds);
    await this.#awardXp(actor, policy.freeXp);
    return this.#record(
      "free",
      [actor],
      policy.freeXp,
      0,
      naturalRoll
    );
  }

  async distributeSecondXp(
    source: GMIntrusionCharacterLike,
    recipient: GMIntrusionCharacterLike,
    amount: number
  ): Promise<void> {
    assertCharacter(source);
    assertCharacter(recipient);
    if (recipient.id === source.id) {
      throw new Error("The targeted Character cannot receive their own shared XP.");
    }
    await this.#awardXp(recipient, amount);
  }

  async #awardXp(actor: GMIntrusionCharacterLike, amount: number): Promise<void> {
    if (!Number.isInteger(amount) || amount < 0) throw new Error("GM Intrusion XP must be non-negative.");
    if (amount > 0) await actor.update({"system.xp": actor.system.xp + amount});
  }

  #record(
    mode: GMIntrusionRecord["mode"],
    actors: readonly GMIntrusionCharacterLike[],
    targetXp: number,
    sharedXp: number,
    naturalRoll = 0
  ): GMIntrusionRecord {
    return {
      id: this.#idFactory(),
      mode,
      targets: actors.map(target),
      targetXp,
      sharedXp,
      naturalRoll
    };
  }
}
