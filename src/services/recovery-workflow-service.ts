import type {DurationTrigger, RecoveryKind, RecoveryType, RestType} from "../constants/system";
import {assertLiving, type CharacterDocumentLike} from "../rules/core/core-types";
import type {
  RecoveryAllocation,
  RecoveryApplicationResult,
  RecoveryRollResult
} from "./recovery-service";
import {RecoveryService} from "./recovery-service";
import type {RestOptions, RestPreparation} from "./rest-service";
import {RestService} from "./rest-service";

export interface RecoveryWorkflowResult {
  kind: RecoveryKind;
  type: RecoveryType;
  recovery: RecoveryApplicationResult;
  rest: RestPreparation | null;
  durationTriggers: DurationTrigger[];
}

export interface RecoveryWorkflowHooks {
  beforeComplete(context: RecoveryWorkflowResult): void | Promise<void>;
  processDurations(context: RecoveryWorkflowResult): void | Promise<void>;
  afterComplete(context: RecoveryWorkflowResult): void | Promise<void>;
  refresh(context: RecoveryWorkflowResult): void | Promise<void>;
}

const FOUNDRY_RECOVERY_HOOKS: RecoveryWorkflowHooks = {
  beforeComplete(context): void {
    Hooks.callAll("cypherv2.preRecoveryWorkflow", context);
  },
  processDurations(context): void {
    Hooks.callAll("cypherv2.processRecoveryDurations", context);
  },
  afterComplete(context): void {
    Hooks.callAll("cypherv2.recoveryCompleted", context);
    if (context.kind === "normal" && context.rest) Hooks.callAll("cypherv2.restCompleted", context);
    if (context.kind === "nonRest") Hooks.callAll("cypherv2.nonRestRecoveryCompleted", context);
  },
  refresh(context): void {
    Hooks.callAll("cypherv2.recoveryRefresh", context);
  }
};

function restType(type: RecoveryType): RestType | null {
  return type === "one-action" ? null : type;
}

export function recoveryDurationTriggers(kind: RecoveryKind, type: RecoveryType): DurationTrigger[] {
  const triggers: DurationTrigger[] = [kind === "normal" ? "recovery" : "non-rest-recovery"];
  if (type !== "one-action") triggers.push("10-minute-or-longer");
  if (type === "1-hour" || type === "10-hours") triggers.push("1-hour-or-longer");
  if (type === "10-hours") triggers.push("10-hour");
  return triggers;
}

export class RecoveryWorkflowService {
  readonly #recovery: RecoveryService;
  readonly #rest: RestService;
  readonly #hooks: RecoveryWorkflowHooks;

  constructor(
    recovery: RecoveryService,
    rest: RestService,
    hooks: RecoveryWorkflowHooks = FOUNDRY_RECOVERY_HOOKS
  ) {
    this.#recovery = recovery;
    this.#rest = rest;
    this.#hooks = hooks;
  }

  async rollNormal(
    actor: CharacterDocumentLike,
    type: RecoveryType,
    lastAction = false,
    slotId?: string
  ): Promise<RecoveryRollResult> {
    return this.#recovery.roll(actor, type, lastAction, slotId);
  }

  async completeNormal(
    actor: CharacterDocumentLike,
    roll: RecoveryRollResult,
    allocation: RecoveryAllocation,
    restOptions: RestOptions = {}
  ): Promise<RecoveryWorkflowResult> {
    assertLiving(actor);

    // Rest benefits are prepared before the Recovery usage state is reduced.
    // The combined result is then committed atomically, so a 10-hour new-day
    // reset is never visible without its Normal Recovery benefits.
    const applicableRestType = restType(roll.type);
    const rest = applicableRestType ? this.#rest.prepare(actor, applicableRestType, restOptions) : null;
    const recovery = this.#recovery.prepareNormal(actor, roll, allocation);
    const context: RecoveryWorkflowResult = {
      kind: "normal",
      type: roll.type,
      recovery,
      rest,
      durationTriggers: recoveryDurationTriggers("normal", roll.type)
    };

    await this.#hooks.beforeComplete(context);
    const update: Record<string, unknown> = {
      "system.stats.might.value": recovery.values.might,
      "system.stats.speed.value": recovery.values.speed,
      "system.stats.intellect.value": recovery.values.intellect
    };
    if (rest) {
      update["system.wounds"] = rest.result.wounds;
      update["system.rest.lastType"] = rest.result.type;
      update["system.rest.history"] = [...actor.system.rest.history, rest.historyEntry];
    }
    update["system.recovery.used"] = recovery.used;
    update["system.recovery.slots"] = recovery.slots;
    update["system.recovery.history"] = [...actor.system.recovery.history, recovery.historyEntry];
    await actor.update(update);
    await this.#hooks.processDurations(context);
    await this.#hooks.afterComplete(context);
    await this.#hooks.refresh(context);
    return context;
  }

  async completeNonRest(
    actor: CharacterDocumentLike,
    type: RecoveryType,
    slotId?: string
  ): Promise<RecoveryWorkflowResult> {
    assertLiving(actor);
    const recovery = this.#recovery.prepareNonRest(actor, type, slotId);
    const context: RecoveryWorkflowResult = {
      kind: "nonRest",
      type,
      recovery,
      rest: null,
      durationTriggers: recoveryDurationTriggers("nonRest", type)
    };

    await this.#hooks.beforeComplete(context);
    await actor.update({
      "system.recovery.used": recovery.used,
      "system.recovery.slots": recovery.slots,
      "system.recovery.history": [...actor.system.recovery.history, recovery.historyEntry]
    });
    await this.#hooks.processDurations(context);
    await this.#hooks.afterComplete(context);
    await this.#hooks.refresh(context);
    return context;
  }
}
