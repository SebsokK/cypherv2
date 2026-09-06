import {describe, expect, it} from "vitest";

import {
  RecoveryWorkflowService,
  recoveryDurationTriggers,
  type RecoveryWorkflowHooks
} from "../../src/services/recovery-workflow-service";
import {RecoveryService} from "../../src/services/recovery-service";
import {RestService} from "../../src/services/rest-service";
import {character, wounds} from "../helpers/core-fixtures";

function workflow(hooks?: RecoveryWorkflowHooks): {
  recovery: RecoveryService;
  service: RecoveryWorkflowService;
} {
  const recovery = new RecoveryService(async () => 4, () => "recovery-id", () => 1000);
  const rest = new RestService(() => "rest-id", () => 2000);
  return {recovery, service: new RecoveryWorkflowService(recovery, rest, hooks)};
}

describe("RecoveryWorkflowService", () => {
  it("combines Pool recovery and 10-minute Wound benefits in one Actor update", async () => {
    const {recovery, service} = workflow({
      beforeComplete: () => undefined,
      processDurations: () => undefined,
      afterComplete: () => undefined,
      refresh: () => undefined
    });
    const actor = character({poolValues: {might: 2}, wounds: wounds({minor: 2, moderate: 1})});
    const roll = recovery.calculateRoll("10-minutes", 1, 4);
    const result = await service.completeNormal(actor, roll, {might: 5, speed: 0, intellect: 0});

    expect(actor.updates).toHaveLength(1);
    expect(actor.system.stats.might.value).toBe(7);
    expect(actor.system.wounds.minor).toHaveLength(0);
    expect(actor.system.wounds.moderate).toHaveLength(1);
    expect(actor.system.recovery.used.tenMinutes).toBe(true);
    expect(actor.system.recovery.history[0]).toMatchObject({kind: "normal", rolled: true});
    expect(actor.system.rest.history[0]).toMatchObject({type: "10-minutes", removedWoundIds: ["minor-1", "minor-2"]});
    expect(result.rest?.result.removed).toHaveLength(2);
  });

  it("applies no Rest benefit to a one-action Normal Recovery", async () => {
    const {recovery, service} = workflow({
      beforeComplete: () => undefined,
      processDurations: () => undefined,
      afterComplete: () => undefined,
      refresh: () => undefined
    });
    const actor = character({poolValues: {might: 5}, wounds: wounds({minor: 1})});
    const roll = recovery.calculateRoll("one-action", 1, 1, true);
    const result = await service.completeNormal(actor, roll, {might: 4, speed: 0, intellect: 0});

    expect(result.rest).toBeNull();
    expect(actor.system.wounds.minor).toHaveLength(1);
    expect(actor.system.rest.history).toHaveLength(0);
    expect(actor.system.stats.might.value).toBe(9);
  });

  it("passes the selected 1-hour Rest option to RestService", async () => {
    const {recovery, service} = workflow({
      beforeComplete: () => undefined,
      processDurations: () => undefined,
      afterComplete: () => undefined,
      refresh: () => undefined
    });
    const actor = character({wounds: wounds({minor: 2, moderate: 2})});
    const roll = recovery.calculateRoll("1-hour", 1, 1);
    await service.completeNormal(
      actor,
      roll,
      {might: 0, speed: 0, intellect: 0},
      {oneHourChoice: "remove-minors"}
    );

    expect(actor.system.wounds.minor).toHaveLength(0);
    expect(actor.system.wounds.moderate).toHaveLength(2);
  });

  it("makes a Non-Rest Recovery consume availability without rolling or granting benefits", async () => {
    const recovery = new RecoveryService(
      async () => { throw new Error("The d6 must not be rolled."); },
      () => "non-rest-id",
      () => 3000
    );
    const service = new RecoveryWorkflowService(recovery, new RestService(), {
      beforeComplete: () => undefined,
      processDurations: () => undefined,
      afterComplete: () => undefined,
      refresh: () => undefined
    });
    const actor = character({poolValues: {might: 2}, wounds: wounds({minor: 2})});
    const result = await service.completeNonRest(actor, "1-hour");

    expect(actor.system.stats.might.value).toBe(2);
    expect(actor.system.wounds.minor).toHaveLength(2);
    expect(actor.system.rest.history).toHaveLength(0);
    expect(actor.system.recovery.used.oneHour).toBe(true);
    expect(actor.system.recovery.history[0]).toMatchObject({
      kind: "nonRest",
      rolled: false,
      total: 0,
      might: 0,
      speed: 0,
      intellect: 0
    });
    expect(result.rest).toBeNull();
  });

  it("resets the day after a 10-hour Non-Rest Recovery without granting benefits", async () => {
    const {service} = workflow({
      beforeComplete: () => undefined,
      processDurations: () => undefined,
      afterComplete: () => undefined,
      refresh: () => undefined
    });
    const actor = character({
      poolValues: {might: 1},
      wounds: wounds({moderate: 2}),
      usedRecoveries: {oneAction: true, tenMinutes: true, oneHour: true}
    });
    await service.completeNonRest(actor, "10-hours");

    expect(actor.system.recovery.used).toEqual({
      oneAction: false,
      tenMinutes: false,
      oneHour: false,
      tenHours: false
    });
    expect(actor.system.stats.might.value).toBe(1);
    expect(actor.system.wounds.moderate).toHaveLength(2);
  });

  it("commits 10-hour Normal benefits with the new-day reset in one transaction", async () => {
    const events: string[] = [];
    const actor = character({
      poolValues: {might: 0},
      wounds: wounds({moderate: 2, major: 1}),
      usedRecoveries: {oneAction: true, tenMinutes: true, oneHour: true}
    });
    const hooks: RecoveryWorkflowHooks = {
      beforeComplete: () => { events.push("before"); },
      processDurations: () => {
        events.push("durations");
        expect(actor.system.wounds.moderate).toHaveLength(0);
        expect(actor.system.wounds.major).toHaveLength(0);
        expect(actor.system.recovery.used).toEqual({
          oneAction: false,
          tenMinutes: false,
          oneHour: false,
          tenHours: false
        });
      },
      afterComplete: () => { events.push("after"); },
      refresh: () => { events.push("refresh"); }
    };
    const {recovery, service} = workflow(hooks);
    const roll = recovery.calculateRoll("10-hours", 1, 1);
    await service.completeNormal(
      actor,
      roll,
      {might: 2, speed: 0, intellect: 0},
      {majorTaskSucceeded: true}
    );

    expect(actor.updates).toHaveLength(1);
    expect(events).toEqual(["before", "durations", "after", "refresh"]);
  });

  it("provides duration metadata for Normal and Non-Rest Recoveries", () => {
    expect(recoveryDurationTriggers("normal", "one-action")).toEqual(["recovery"]);
    expect(recoveryDurationTriggers("normal", "10-hours")).toEqual([
      "recovery",
      "10-minute-or-longer",
      "1-hour-or-longer",
      "10-hour"
    ]);
    expect(recoveryDurationTriggers("nonRest", "1-hour")).toEqual([
      "non-rest-recovery",
      "10-minute-or-longer",
      "1-hour-or-longer"
    ]);
  });
});
