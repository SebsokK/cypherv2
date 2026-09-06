import {WOUND_SEVERITIES, type WoundSeverity} from "../constants/system";
import {
  assertCharacter,
  cloneWounds,
  defaultIdFactory,
  type CharacterDocumentLike,
  type IdFactory,
  type PoolKey,
  type WoundCapacities,
  type WoundCollection,
  type WoundRecordData
} from "../rules/core/core-types";

const CORE_CAPACITIES: WoundCapacities = {minor: 3, moderate: 3, major: 3};

export interface WoundInput {
  id?: string;
  label?: string;
  description?: string;
  sourceUuid?: string;
  treated?: boolean;
}

export interface WoundEdit {
  label: string;
  description: string;
}

export interface WoundTrackDocumentLike {
  readonly system: {readonly wounds: WoundCollection};
  update(changes: Record<string, unknown>): Promise<unknown>;
}

export interface WoundApplicationResult {
  wounds: WoundCollection;
  requestedSeverity: WoundSeverity;
  appliedSeverity: WoundSeverity | null;
  overflowSteps: number;
  record: WoundRecordData | null;
  applied: boolean;
  dead: boolean;
}

export interface WoundCountResult {
  wounds: WoundCollection;
  severity: WoundSeverity;
  previousCount: number;
  count: number;
  added: WoundRecordData[];
  removed: WoundRecordData[];
}

export interface PoolDamageResult {
  pool: PoolKey;
  damage: number;
  previousValue: number;
  value: number;
  absorbed: number;
  overflow: number;
  overflowSeverity: WoundSeverity | null;
  wound: WoundApplicationResult | null;
}

function nonNegativeInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
  return value;
}

export function poolOverflowSeverity(overflow: number): WoundSeverity | null {
  nonNegativeInteger(overflow, "Pool damage overflow");
  if (overflow === 0) return null;
  if (overflow <= 4) return "minor";
  if (overflow <= 8) return "moderate";
  return "major";
}

export class WoundService {
  readonly #idFactory: IdFactory;

  constructor(idFactory: IdFactory = defaultIdFactory) {
    this.#idFactory = idFactory;
  }

  applyWound(
    current: WoundCollection,
    severity: WoundSeverity,
    capacities: WoundCapacities = CORE_CAPACITIES,
    input: WoundInput = {}
  ): WoundApplicationResult {
    const wounds = cloneWounds(current);
    const record: WoundRecordData = {
      id: input.id ?? this.#idFactory(),
      label: input.label ?? `${severity[0]?.toUpperCase()}${severity.slice(1)} Wound`,
      description: input.description ?? "",
      sourceUuid: input.sourceUuid ?? "cypherv2.core",
      treated: input.treated ?? false
    };
    const requestedIndex = WOUND_SEVERITIES.indexOf(severity);
    if (requestedIndex < 0) throw new Error(`Unsupported Wound severity '${severity}'.`);

    for (let index = requestedIndex; index < WOUND_SEVERITIES.length; index += 1) {
      const appliedSeverity = WOUND_SEVERITIES[index]!;
      if (wounds[appliedSeverity].length >= capacities[appliedSeverity]) continue;
      wounds[appliedSeverity].push(record);
      return {
        wounds,
        requestedSeverity: severity,
        appliedSeverity,
        overflowSteps: index - requestedIndex,
        record,
        applied: true,
        dead: wounds.major.length >= capacities.major
      };
    }

    return {
      wounds,
      requestedSeverity: severity,
      appliedSeverity: null,
      overflowSteps: WOUND_SEVERITIES.length - requestedIndex,
      record: null,
      applied: false,
      dead: wounds.major.length >= capacities.major
    };
  }

  removeOne(current: WoundCollection, severity: WoundSeverity, woundId?: string): {
    wounds: WoundCollection;
    removed: WoundRecordData | null;
  } {
    const wounds = cloneWounds(current);
    const index = woundId
      ? wounds[severity].findIndex((wound) => wound.id === woundId)
      : wounds[severity].length - 1;
    if (index < 0) return {wounds, removed: null};
    const [removed] = wounds[severity].splice(index, 1);
    return {wounds, removed: removed ?? null};
  }

  updateWound(
    current: WoundCollection,
    severity: WoundSeverity,
    woundId: string,
    changes: WoundEdit
  ): {wounds: WoundCollection; updated: WoundRecordData} {
    if (typeof changes.label !== "string" || typeof changes.description !== "string") {
      throw new Error("Wound label and description must be strings.");
    }
    const wounds = cloneWounds(current);
    const index = wounds[severity].findIndex((wound) => wound.id === woundId);
    if (index < 0) throw new Error(`Wound '${woundId}' was not found in ${severity} Wounds.`);
    const existing = wounds[severity][index]!;
    const updated = {...existing, label: changes.label, description: changes.description};
    wounds[severity][index] = updated;
    return {wounds, updated};
  }

  removeAll(current: WoundCollection, severity: WoundSeverity): {
    wounds: WoundCollection;
    removed: WoundRecordData[];
  } {
    const wounds = cloneWounds(current);
    const removed = wounds[severity];
    wounds[severity] = [];
    return {wounds, removed};
  }

  setWoundCount(
    current: WoundCollection,
    severity: WoundSeverity,
    count: number,
    capacity: number,
    input: WoundInput = {}
  ): WoundCountResult {
    const targetCount = nonNegativeInteger(count, "Wound count");
    const safeCapacity = nonNegativeInteger(capacity, "Wound capacity");
    if (targetCount > safeCapacity) throw new Error("Wound count cannot exceed its capacity.");
    const wounds = cloneWounds(current);
    const track = wounds[severity];
    const previousCount = track.length;
    const removed = targetCount < previousCount ? track.splice(targetCount) : [];
    const added: WoundRecordData[] = [];
    while (track.length < targetCount) {
      const record: WoundRecordData = {
        id: this.#idFactory(),
        label: input.label ?? `${severity[0]?.toUpperCase()}${severity.slice(1)} Wound`,
        description: input.description ?? "",
        sourceUuid: input.sourceUuid ?? "cypherv2.manual",
        treated: input.treated ?? false
      };
      track.push(record);
      added.push(record);
    }
    return {wounds, severity, previousCount, count: targetCount, added, removed};
  }

  applyPoolDamage(
    current: WoundCollection,
    pool: PoolKey,
    currentValue: number,
    damage: number,
    capacities: WoundCapacities = CORE_CAPACITIES,
    input: WoundInput = {}
  ): PoolDamageResult {
    const safeValue = nonNegativeInteger(currentValue, "Pool value");
    const safeDamage = nonNegativeInteger(damage, "Pool damage");
    const absorbed = Math.min(safeValue, safeDamage);
    const value = safeValue - absorbed;
    const overflow = safeDamage - absorbed;
    const overflowSeverity = poolOverflowSeverity(overflow);
    const wound = overflowSeverity
      ? this.applyWound(current, overflowSeverity, capacities, {
          ...input,
          label: input.label ?? `${pool} Pool overflow`
        })
      : null;

    return {
      pool,
      damage: safeDamage,
      previousValue: safeValue,
      value,
      absorbed,
      overflow,
      overflowSeverity,
      wound
    };
  }

  async apply(
    actor: CharacterDocumentLike,
    severity: WoundSeverity,
    input: WoundInput = {}
  ): Promise<WoundApplicationResult> {
    assertCharacter(actor);
    return this.applyTrack(actor, severity, actor.system.derived.wounds.capacities, input);
  }

  async applyTrack(
    document: WoundTrackDocumentLike,
    severity: WoundSeverity,
    capacities: WoundCapacities,
    input: WoundInput = {}
  ): Promise<WoundApplicationResult> {
    const result = this.applyWound(document.system.wounds, severity, capacities, input);
    if (result.applied) await document.update({"system.wounds": result.wounds});
    return result;
  }

  async edit(
    actor: CharacterDocumentLike,
    severity: WoundSeverity,
    woundId: string,
    changes: WoundEdit
  ): Promise<{wounds: WoundCollection; updated: WoundRecordData}> {
    assertCharacter(actor);
    return this.editTrack(actor, severity, woundId, changes);
  }

  async editTrack(
    document: WoundTrackDocumentLike,
    severity: WoundSeverity,
    woundId: string,
    changes: WoundEdit
  ): Promise<{wounds: WoundCollection; updated: WoundRecordData}> {
    const result = this.updateWound(document.system.wounds, severity, woundId, changes);
    await document.update({"system.wounds": result.wounds});
    return result;
  }

  async setCount(
    actor: CharacterDocumentLike,
    severity: WoundSeverity,
    count: number,
    input: WoundInput = {}
  ): Promise<WoundCountResult> {
    assertCharacter(actor);
    return this.setTrackCount(
      actor,
      severity,
      count,
      actor.system.derived.wounds.capacities[severity],
      input
    );
  }

  async setTrackCount(
    document: WoundTrackDocumentLike,
    severity: WoundSeverity,
    count: number,
    capacity: number,
    input: WoundInput = {}
  ): Promise<WoundCountResult> {
    const result = this.setWoundCount(document.system.wounds, severity, count, capacity, input);
    if (result.count !== result.previousCount) await document.update({"system.wounds": result.wounds});
    return result;
  }

  async delete(
    actor: CharacterDocumentLike,
    severity: WoundSeverity,
    woundId: string
  ): Promise<{wounds: WoundCollection; removed: WoundRecordData}> {
    assertCharacter(actor);
    return this.deleteTrack(actor, severity, woundId);
  }

  async deleteTrack(
    document: WoundTrackDocumentLike,
    severity: WoundSeverity,
    woundId: string
  ): Promise<{wounds: WoundCollection; removed: WoundRecordData}> {
    const result = this.removeOne(document.system.wounds, severity, woundId);
    if (!result.removed) throw new Error(`Wound '${woundId}' was not found in ${severity} Wounds.`);
    await document.update({"system.wounds": result.wounds});
    return {wounds: result.wounds, removed: result.removed};
  }

  async damagePool(
    actor: CharacterDocumentLike,
    pool: PoolKey,
    damage: number,
    input: WoundInput = {}
  ): Promise<PoolDamageResult> {
    assertCharacter(actor);
    const result = this.applyPoolDamage(
      actor.system.wounds,
      pool,
      actor.system.stats[pool].value,
      damage,
      actor.system.derived.wounds.capacities,
      input
    );
    const update: Record<string, unknown> = {[`system.stats.${pool}.value`]: result.value};
    if (result.wound?.applied) update["system.wounds"] = result.wound.wounds;
    await actor.update(update);
    return result;
  }
}
