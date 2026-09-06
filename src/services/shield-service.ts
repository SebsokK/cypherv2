import type {WoundSeverity} from "../constants/system";
import type {
  WoundCapacities,
  WoundCollection,
  WoundRecordData
} from "../rules/core/core-types";
import {SHIELD_WOUND_CAPACITIES} from "../rules/core/shield-rules";
import {
  WoundService,
  type WoundApplicationResult,
  type WoundEdit,
  type WoundInput
} from "./wound-service";

export interface ShieldItemLike {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly system: {
    readonly equipped: boolean;
    readonly depletion?: import("../depletion/depletion-types").DepletionRule;
    readonly depleted?: boolean;
    readonly woundCapacities?: WoundCapacities;
    readonly wounds: WoundCollection;
    readonly derived: {
      readonly capacities: {readonly minor: number; readonly moderate: number; readonly major: number};
      readonly broken: boolean;
    };
    readonly description: string;
  };
  update(changes: Record<string, unknown>, options?: Record<string, unknown>): Promise<unknown>;
}

export interface ShieldCharacterLike {
  readonly id: string;
  readonly name: string;
  readonly items: Iterable<unknown>;
}

export interface ShieldWoundApplication extends Omit<WoundApplicationResult, "dead"> {
  readonly shield: ShieldItemLike;
  readonly broken: boolean;
}

export class MultipleEquippedShieldsError extends Error {
  constructor(readonly shieldIds: readonly string[]) {
    super("Only one Shield may be equipped at a time.");
    this.name = "MultipleEquippedShieldsError";
  }
}

export class ShieldCapacityBelowWoundsError extends Error {
  constructor(
    readonly severity: WoundSeverity,
    readonly requested: number,
    readonly current: number
  ) {
    super(`Shield ${severity} capacity cannot be lower than its current Wound count (${current}).`);
    this.name = "ShieldCapacityBelowWoundsError";
  }
}

export class ShieldService {
  readonly #wounds: WoundService;

  constructor(wounds: WoundService) {
    this.#wounds = wounds;
  }

  shields(actor: ShieldCharacterLike): readonly ShieldItemLike[] {
    return [...actor.items].filter((item): item is ShieldItemLike => {
      const candidate = item as Partial<ShieldItemLike> | null;
      return candidate?.type === "shield" && Boolean(candidate.system);
    });
  }

  equipped(actor: ShieldCharacterLike): ShieldItemLike | null {
    const equipped = this.shields(actor).filter((shield) => shield.system.equipped);
    if (equipped.length > 1) throw new MultipleEquippedShieldsError(equipped.map((shield) => shield.id));
    return equipped[0] ?? null;
  }

  async normalizeEquipped(actor: ShieldCharacterLike): Promise<ShieldItemLike | null> {
    const equipped = this.shields(actor).filter((shield) => shield.system.equipped);
    if (equipped.length <= 1) return equipped[0] ?? null;
    const [active, ...duplicates] = [...equipped].sort((left, right) => {
      const functional = Number(this.isBroken(left)) - Number(this.isBroken(right));
      return functional || left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
    });
    await Promise.all(duplicates.map((shield) => shield.update(
      {"system.equipped": false},
      {cypherv2ShieldEquipmentSync: true}
    )));
    return active ?? null;
  }

  async setEquipped(
    actor: ShieldCharacterLike,
    shield: ShieldItemLike,
    equipped: boolean
  ): Promise<ShieldItemLike | null> {
    if (!this.shields(actor).some((candidate) => candidate.id === shield.id)) {
      throw new Error("Shield does not belong to this Character.");
    }
    if (!equipped) {
      await shield.update({"system.equipped": false}, {cypherv2ShieldEquipmentSync: true});
      return null;
    }
    await shield.update({"system.equipped": true}, {cypherv2ShieldEquipmentSync: true});
    await Promise.all(this.shields(actor)
      .filter((candidate) => candidate.id !== shield.id && candidate.system.equipped)
      .map((candidate) => candidate.update(
        {"system.equipped": false},
        {cypherv2ShieldEquipmentSync: true}
      )));
    return shield;
  }

  isBroken(shield: ShieldItemLike): boolean {
    return shield.system.wounds.major.length >= this.capacities(shield).major;
  }

  capacities(shield: ShieldItemLike): WoundCapacities {
    return shield.system.derived?.capacities
      ?? shield.system.woundCapacities
      ?? SHIELD_WOUND_CAPACITIES;
  }

  async setCapacity(
    shield: ShieldItemLike,
    severity: WoundSeverity,
    capacity: number
  ): Promise<void> {
    if (!Number.isInteger(capacity) || capacity < 0) {
      throw new RangeError("Shield Wound capacity must be a non-negative whole number.");
    }
    const current = shield.system.wounds[severity].length;
    if (capacity < current) throw new ShieldCapacityBelowWoundsError(severity, capacity, current);
    await shield.update({[`system.woundCapacities.${severity}`]: capacity});
  }

  canAbsorb(actor: ShieldCharacterLike): boolean {
    const shield = this.equipped(actor);
    return Boolean(shield && !this.isBroken(shield));
  }

  async apply(
    actor: ShieldCharacterLike,
    shield: ShieldItemLike,
    severity: WoundSeverity,
    input: WoundInput = {}
  ): Promise<ShieldWoundApplication> {
    const equipped = this.equipped(actor);
    if (!equipped || equipped.id !== shield.id) throw new Error("The Shield is not the equipped Shield.");
    return this.applyResolved(actor, shield, severity, input);
  }

  /** Apply a deferred consequence to the exact Shield captured when the defense resolved. */
  async applyResolved(
    actor: ShieldCharacterLike,
    shield: ShieldItemLike,
    severity: WoundSeverity,
    input: WoundInput = {}
  ): Promise<ShieldWoundApplication> {
    if (!this.shields(actor).some((candidate) => candidate.id === shield.id)) {
      throw new Error("Shield does not belong to this Character.");
    }
    if (this.isBroken(shield)) throw new Error("A Broken Shield cannot absorb another Wound.");
    const capacities = this.capacities(shield);
    const result = await this.#wounds.applyTrack(shield, severity, capacities, {
      ...input,
      label: input.label ?? `${severity[0]!.toUpperCase()}${severity.slice(1)} Shield Wound`,
      sourceUuid: input.sourceUuid ?? "cypherv2.shield"
    });
    const {dead: _trackCapacityReached, ...trackResult} = result;
    return {
      ...trackResult,
      shield,
      broken: result.wounds.major.length >= capacities.major
    };
  }

  async edit(
    shield: ShieldItemLike,
    severity: WoundSeverity,
    woundId: string,
    changes: WoundEdit
  ): Promise<{wounds: WoundCollection; updated: WoundRecordData}> {
    return this.#wounds.editTrack(shield, severity, woundId, changes);
  }

  async setCount(
    shield: ShieldItemLike,
    severity: WoundSeverity,
    count: number
  ): Promise<import("./wound-service").WoundCountResult> {
    return this.#wounds.setTrackCount(
      shield,
      severity,
      count,
      this.capacities(shield)[severity],
      {sourceUuid: "cypherv2.manual.shield"}
    );
  }

  async delete(
    shield: ShieldItemLike,
    severity: WoundSeverity,
    woundId: string
  ): Promise<{wounds: WoundCollection; removed: WoundRecordData; broken: boolean}> {
    const result = await this.#wounds.deleteTrack(shield, severity, woundId);
    return {...result, broken: result.wounds.major.length >= this.capacities(shield).major};
  }
}
