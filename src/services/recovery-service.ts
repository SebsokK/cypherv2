import type {RecoveryKind, RecoveryType} from "../constants/system";
import {
  POOL_KEYS,
  RECOVERY_USAGE_KEYS,
  availableRecoveryTypes,
  assertLiving,
  createRecoveryUsage,
  defaultIdFactory,
  type CharacterDocumentLike,
  type IdFactory,
  type PoolKey,
  type RecoveryHistoryEntry,
  type RecoveryUsage
} from "../rules/core/core-types";
import {effectiveTier} from "../rules/core/character-overrides";

export type RecoveryAllocation = Record<PoolKey, number>;

export interface RecoveryRollResult {
  type: RecoveryType;
  dieResult: number;
  tier: number;
  bonus: number;
  total: number;
  lastAction: boolean;
}

export interface RecoveryApplicationResult {
  kind: RecoveryKind;
  roll: RecoveryRollResult | null;
  requested: RecoveryAllocation;
  restored: RecoveryAllocation;
  values: RecoveryAllocation;
  unspent: number;
  used: RecoveryUsage;
  historyEntry: RecoveryHistoryEntry;
}

export type D6Roller = () => Promise<number>;

async function foundryD6Roller(): Promise<number> {
  const roll = await new Roll("1d6").evaluate();
  return Number(roll.total);
}

function integerInRange(value: number, min: number, max: number, label: string): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${label} must be an integer from ${min} to ${max}.`);
  }
  return value;
}

export class RecoveryService {
  readonly #rollD6: D6Roller;
  readonly #idFactory: IdFactory;
  readonly #now: () => number;

  constructor(
    rollD6: D6Roller = foundryD6Roller,
    idFactory: IdFactory = defaultIdFactory,
    now: () => number = Date.now
  ) {
    this.#rollD6 = rollD6;
    this.#idFactory = idFactory;
    this.#now = now;
  }

  calculateRoll(
    type: RecoveryType,
    tier: number,
    dieResult: number,
    lastAction = false,
    recoveryBonus = 0
  ): RecoveryRollResult {
    integerInRange(dieResult, 1, 6, "Recovery die");
    integerInRange(tier, 1, Number.MAX_SAFE_INTEGER, "Tier");
    integerInRange(recoveryBonus, 0, Number.MAX_SAFE_INTEGER, "Recovery bonus");
    const bonus = recoveryBonus + (type === "one-action" && lastAction ? 2 : 0);
    return {type, dieResult, tier, bonus, total: dieResult + tier + bonus, lastAction};
  }

  availableTypes(usage: RecoveryUsage): RecoveryType[] {
    return availableRecoveryTypes(usage);
  }

  isAvailable(usage: RecoveryUsage, type: RecoveryType): boolean {
    return !usage[RECOVERY_USAGE_KEYS[type]];
  }

  async roll(actor: CharacterDocumentLike, type: RecoveryType, lastAction = false): Promise<RecoveryRollResult> {
    assertLiving(actor);
    if (!this.isAvailable(actor.system.recovery.used, type)) {
      throw new Error(`The '${type}' Core Recovery has already been used today.`);
    }
    return this.calculateRoll(
      type,
      effectiveTier(actor.system),
      await this.#rollD6(),
      lastAction,
      actor.system.derived.recovery.bonus
    );
  }

  distribute(
    actor: CharacterDocumentLike,
    roll: RecoveryRollResult,
    requested: RecoveryAllocation
  ): Omit<RecoveryApplicationResult, "kind" | "used" | "historyEntry"> {
    const requestedTotal = POOL_KEYS.reduce((sum, pool) => {
      return sum + integerInRange(requested[pool], 0, Number.MAX_SAFE_INTEGER, `${pool} allocation`);
    }, 0);
    if (requestedTotal > roll.total) throw new Error("Recovery allocations exceed the Recovery result.");

    const values = {} as RecoveryAllocation;
    const restored = {} as RecoveryAllocation;
    for (const pool of POOL_KEYS) {
      const current = actor.system.stats[pool].value;
      const maximum = actor.system.derived.pools[pool].max;
      const missing = Math.max(0, maximum - current);
      if (requested[pool] > missing) {
        throw new Error(`${pool} allocation exceeds the Pool's missing points.`);
      }
      restored[pool] = requested[pool];
      values[pool] = current + restored[pool];
    }

    return {
      roll,
      requested: {...requested},
      restored,
      values,
      unspent: roll.total - requestedTotal
    };
  }

  prepareNormal(
    actor: CharacterDocumentLike,
    roll: RecoveryRollResult,
    requested: RecoveryAllocation
  ): RecoveryApplicationResult {
    assertLiving(actor);
    if (!this.isAvailable(actor.system.recovery.used, roll.type)) {
      throw new Error(`The '${roll.type}' Core Recovery has already been used today.`);
    }
    const distribution = this.distribute(actor, roll, requested);
    const used = roll.type === "10-hours"
      ? createRecoveryUsage(false)
      : {...actor.system.recovery.used, [RECOVERY_USAGE_KEYS[roll.type]]: true};
    const historyEntry: RecoveryHistoryEntry = {
      id: this.#idFactory(),
      kind: "normal",
      type: roll.type,
      rolled: true,
      dieResult: roll.dieResult,
      tier: roll.tier,
      bonus: roll.bonus,
      total: roll.total,
      might: distribution.restored.might,
      speed: distribution.restored.speed,
      intellect: distribution.restored.intellect,
      timestamp: this.#now()
    };
    return {...distribution, kind: "normal", used, historyEntry};
  }

  prepareNonRest(actor: CharacterDocumentLike, type: RecoveryType): RecoveryApplicationResult {
    assertLiving(actor);
    if (!this.isAvailable(actor.system.recovery.used, type)) {
      throw new Error(`The '${type}' Core Recovery has already been used today.`);
    }
    const used = type === "10-hours"
      ? createRecoveryUsage(false)
      : {...actor.system.recovery.used, [RECOVERY_USAGE_KEYS[type]]: true};
    const zero = {might: 0, speed: 0, intellect: 0};
    const historyEntry: RecoveryHistoryEntry = {
      id: this.#idFactory(),
      kind: "nonRest",
      type,
      rolled: false,
      dieResult: 0,
      tier: effectiveTier(actor.system),
      bonus: 0,
      total: 0,
      ...zero,
      timestamp: this.#now()
    };
    return {
      kind: "nonRest",
      roll: null,
      requested: {...zero},
      restored: {...zero},
      values: {
        might: actor.system.stats.might.value,
        speed: actor.system.stats.speed.value,
        intellect: actor.system.stats.intellect.value
      },
      unspent: 0,
      used,
      historyEntry
    };
  }
}
