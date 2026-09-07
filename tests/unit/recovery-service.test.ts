import {describe, expect, it} from "vitest";

import {RecoveryService} from "../../src/services/recovery-service";
import {character, wounds} from "../helpers/core-fixtures";

describe("RecoveryService", () => {
  const service = new RecoveryService(async () => 4, () => "recovery-id", () => 1234);

  it("calculates every Core Recovery as 1d6 + Tier", () => {
    for (const type of ["one-action", "10-minutes", "1-hour", "10-hours"] as const) {
      expect(service.calculateRoll(type, 3, 4).total).toBe(7);
    }
  });

  it("adds +2 only to a one-action Recovery taken as the Last action", () => {
    expect(service.calculateRoll("one-action", 2, 3, true)).toMatchObject({bonus: 2, total: 7});
    expect(service.calculateRoll("one-action", 2, 3, false)).toMatchObject({bonus: 0, total: 5});
    expect(service.calculateRoll("10-minutes", 2, 3, true)).toMatchObject({bonus: 0, total: 5});
  });

  it("adds the permanent Recovery bonus to every normal Recovery", async () => {
    const actor = character({tier: 2});
    actor.system.recovery.bonus = 4;
    actor.system.derived.recovery.bonus = 4;
    await expect(service.roll(actor, "1-hour")).resolves.toMatchObject({bonus: 4, total: 10});
    await expect(service.roll(actor, "one-action", true)).resolves.toMatchObject({bonus: 6, total: 12});
  });

  it("uses the authoritative derived Recovery bonus for execution", async () => {
    const actor = character({tier: 2});
    actor.system.recovery.bonus = 2;
    actor.system.derived.recovery.bonus = 5;
    actor.system.derived.recovery.formula = "1d6 + Tier + 5";

    await expect(service.roll(actor, "10-minutes")).resolves.toMatchObject({bonus: 5, total: 11});
  });

  it("rejects invalid d6 and Tier values", () => {
    expect(() => service.calculateRoll("one-action", 1, 0)).toThrow();
    expect(() => service.calculateRoll("one-action", 1, 7)).toThrow();
    expect(() => service.calculateRoll("one-action", 0, 4)).toThrow();
  });

  it("rolls the expected Recovery type with the injected d6", async () => {
    const actor = character({tier: 3});
    await expect(service.roll(actor, "one-action", true)).resolves.toMatchObject({
      dieResult: 4,
      tier: 3,
      bonus: 2,
      total: 9
    });
  });

  it("allows any unused Recovery to be chosen first", async () => {
    const actor = character({tier: 2});
    await expect(service.roll(actor, "1-hour")).resolves.toMatchObject({type: "1-hour", total: 6});
    await expect(service.roll(actor, "10-minutes")).resolves.toMatchObject({type: "10-minutes"});
  });

  it("rejects only Recoveries already used today", async () => {
    const actor = character({usedRecoveries: {oneHour: true}});
    expect(service.availableTypes(actor.system.recovery.used)).toEqual([
      "one-action",
      "10-minutes",
      "10-hours"
    ]);
    await expect(service.roll(actor, "1-hour")).rejects.toThrow(/already been used/i);
    await expect(service.roll(actor, "one-action")).resolves.toMatchObject({type: "one-action"});
  });

  it("uses the selected stable slot when duplicate Recovery types exist", async () => {
    const actor = character();
    actor.system.recovery.slots = [
      {id: "action-a", type: "one-action", used: false},
      {id: "action-b", type: "one-action", used: false},
      {id: "hour", type: "1-hour", used: false}
    ];
    const roll = await service.roll(actor, "one-action", false, "action-b");
    const result = service.prepareNormal(actor, roll, {might: 0, speed: 0, intellect: 0});
    expect(result.slots.find((slot) => slot.id === "action-a")?.used).toBe(false);
    expect(result.slots.find((slot) => slot.id === "action-b")?.used).toBe(true);
    expect(result.historyEntry.slotId).toBe("action-b");
  });

  it("distributes the result freely across all three Pools", () => {
    const actor = character({poolValues: {might: 3, speed: 4, intellect: 5}});
    const roll = service.calculateRoll("one-action", 1, 6);
    const result = service.distribute(actor, roll, {might: 2, speed: 3, intellect: 2});

    expect(result.values).toEqual({might: 5, speed: 7, intellect: 7});
    expect(result.unspent).toBe(0);
  });

  it("permits leaving Recovery points unspent", () => {
    const actor = character({poolValues: {might: 5}});
    const roll = service.calculateRoll("one-action", 1, 4);
    const result = service.distribute(actor, roll, {might: 2, speed: 0, intellect: 0});
    expect(result.unspent).toBe(3);
  });

  it("rejects allocations above the result", () => {
    const actor = character({poolValues: {might: 0, speed: 0, intellect: 0}});
    const roll = service.calculateRoll("one-action", 1, 4);
    expect(() => service.distribute(actor, roll, {might: 3, speed: 3, intellect: 0})).toThrow(/exceed/i);
  });

  it("rejects allocations above a Pool's missing points", () => {
    const actor = character({poolValues: {might: 9}});
    const roll = service.calculateRoll("one-action", 1, 4);
    expect(() => service.distribute(actor, roll, {might: 2, speed: 0, intellect: 0})).toThrow(/missing/i);
  });

  it("prepares Pool allocation and structured Normal Recovery history", () => {
    const actor = character({tier: 2, poolValues: {might: 2, speed: 4, intellect: 6}});
    const roll = service.calculateRoll("one-action", 2, 4, true);
    const result = service.prepareNormal(actor, roll, {might: 3, speed: 2, intellect: 1});

    expect(result.values).toEqual({might: 5, speed: 6, intellect: 7});
    expect(result.used).toEqual({
      oneAction: true,
      tenMinutes: false,
      oneHour: false,
      tenHours: false
    });
    expect(result.historyEntry).toMatchObject({
      id: "recovery-id",
      kind: "normal",
      type: "one-action",
      rolled: true,
      total: 8,
      might: 3,
      speed: 2,
      intellect: 1,
      timestamp: 1234
    });
  });

  it("prepares a Non-Rest Recovery without a roll or Pool restoration", () => {
    const actor = character({poolValues: {might: 2, speed: 4, intellect: 6}});
    const result = service.prepareNonRest(actor, "1-hour");

    expect(result).toMatchObject({
      kind: "nonRest",
      roll: null,
      restored: {might: 0, speed: 0, intellect: 0},
      values: {might: 2, speed: 4, intellect: 6}
    });
    expect(result.historyEntry).toMatchObject({kind: "nonRest", rolled: false, total: 0});
    expect(result.used.oneHour).toBe(true);
  });

  it("prepares all four availabilities for reset after a 10-hour Recovery", () => {
    const actor = character({
      usedRecoveries: {oneAction: true, tenMinutes: true, oneHour: true},
      poolValues: {might: 0}
    });
    const roll = service.calculateRoll("10-hours", 1, 1);
    const result = service.prepareNormal(actor, roll, {might: 2, speed: 0, intellect: 0});
    expect(result.used).toEqual({
      oneAction: false,
      tenMinutes: false,
      oneHour: false,
      tenHours: false
    });
  });

  it("does not allow Recovery after death", async () => {
    const actor = character({wounds: wounds({major: 3})});
    await expect(service.roll(actor, "one-action")).rejects.toThrow(/dead/i);
  });
});
