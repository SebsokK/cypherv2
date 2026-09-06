import type {WoundSeverity} from "../constants/system";
import {
  assertLiving,
  type CharacterDocumentLike,
  type WoundCollection,
  type WoundRecordData
} from "../rules/core/core-types";
import {WoundService} from "./wound-service";

export const CORE_RALLY_COSTS = Object.freeze({minor: 2, moderate: 5});
export const RALLY_EXECUTION_COST_MAX = 10;

export type RallySeverity = "minor" | "moderate";
export type RallyFailure = "major-not-rallyable" | "no-wound" | "insufficient-might" | "invalid-cost";

export interface RallyResult {
  success: boolean;
  severity: WoundSeverity;
  cost: number;
  mightValue: number;
  wounds: WoundCollection;
  removed: WoundRecordData | null;
  failure: RallyFailure | null;
}

export class RallyService {
  readonly #wounds: WoundService;

  constructor(wounds: WoundService) {
    this.#wounds = wounds;
  }

  costFor(severity: RallySeverity): number {
    return CORE_RALLY_COSTS[severity];
  }

  canApply(actor: CharacterDocumentLike): boolean {
    try {
      assertLiving(actor);
    } catch {
      return false;
    }
    const {wounds, stats} = actor.system;
    return this.rally(wounds, stats.might.value, "minor").success
      || this.rally(wounds, stats.might.value, "moderate").success;
  }

  preview(
    actor: CharacterDocumentLike,
    severity: RallySeverity,
    executionCost = this.costFor(severity)
  ): RallyResult {
    try {
      assertLiving(actor);
    } catch {
      return {
        success: false,
        severity,
        cost: executionCost,
        mightValue: actor.system.stats.might.value,
        wounds: actor.system.wounds,
        removed: null,
        failure: "no-wound"
      };
    }
    return this.rally(
      actor.system.wounds,
      actor.system.stats.might.value,
      severity,
      undefined,
      executionCost
    );
  }

  rally(
    current: WoundCollection,
    mightValue: number,
    severity: WoundSeverity,
    woundId?: string,
    executionCost?: number
  ): RallyResult {
    if (severity === "major") {
      return {
        success: false,
        severity,
        cost: 0,
        mightValue,
        wounds: current,
        removed: null,
        failure: "major-not-rallyable"
      };
    }
    const cost = executionCost ?? this.costFor(severity);
    if (!Number.isInteger(cost) || cost < 0 || cost > RALLY_EXECUTION_COST_MAX) {
      return {
        success: false,
        severity,
        cost,
        mightValue,
        wounds: current,
        removed: null,
        failure: "invalid-cost"
      };
    }
    const removal = this.#wounds.removeOne(current, severity, woundId);
    if (!removal.removed) {
      return {
        success: false,
        severity,
        cost,
        mightValue,
        wounds: removal.wounds,
        removed: null,
        failure: "no-wound"
      };
    }
    if (mightValue < cost) {
      return {
        success: false,
        severity,
        cost,
        mightValue,
        wounds: current,
        removed: null,
        failure: "insufficient-might"
      };
    }
    return {
      success: true,
      severity,
      cost,
      mightValue: mightValue - cost,
      wounds: removal.wounds,
      removed: removal.removed,
      failure: null
    };
  }

  async apply(
    actor: CharacterDocumentLike,
    severity: WoundSeverity,
    woundId?: string,
    executionCost?: number
  ): Promise<RallyResult> {
    assertLiving(actor);
    const result = this.rally(
      actor.system.wounds,
      actor.system.stats.might.value,
      severity,
      woundId,
      executionCost
    );
    if (result.success) {
      await actor.update({
        "system.stats.might.value": result.mightValue,
        "system.wounds": result.wounds
      });
    }
    return result;
  }
}
