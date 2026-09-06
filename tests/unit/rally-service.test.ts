import {describe, expect, it} from "vitest";

import {RallyService} from "../../src/services/rally-service";
import {WoundService} from "../../src/services/wound-service";
import {character, wounds} from "../helpers/core-fixtures";

describe("RallyService", () => {
  const service = new RallyService(new WoundService(() => "unused"));

  it("removes one Minor for exactly 2 Might", () => {
    const result = service.rally(wounds({minor: 2}), 7, "minor");
    expect(result).toMatchObject({success: true, cost: 2, mightValue: 5, failure: null});
    expect(result.wounds.minor).toHaveLength(1);
  });

  it("removes one Moderate for exactly 5 Might", () => {
    const result = service.rally(wounds({moderate: 2}), 7, "moderate");
    expect(result).toMatchObject({success: true, cost: 5, mightValue: 2, failure: null});
    expect(result.wounds.moderate).toHaveLength(1);
  });

  it("never rallies a Major Wound", () => {
    const result = service.rally(wounds({major: 1}), 10, "major");
    expect(result).toMatchObject({success: false, cost: 0, failure: "major-not-rallyable"});
    expect(result.wounds.major).toHaveLength(1);
  });

  it("does not spend Might when there is no matching Wound", () => {
    const result = service.rally(wounds(), 10, "minor");
    expect(result).toMatchObject({success: false, mightValue: 10, failure: "no-wound"});
  });

  it("does not remove a Wound or spend Might when Might is insufficient", () => {
    const result = service.rally(wounds({moderate: 1}), 4, "moderate");
    expect(result).toMatchObject({success: false, mightValue: 4, failure: "insufficient-might"});
    expect(result.wounds.moderate).toHaveLength(1);
  });

  it("ignores Edge and persists the full Rally cost", async () => {
    const actor = character({poolValues: {might: 9}, mightEdge: 20, wounds: wounds({moderate: 1})});
    const result = await service.apply(actor, "moderate");
    expect(result.cost).toBe(5);
    expect(actor.system.stats.might.value).toBe(4);
  });

  it("accepts a per-use cost from 0 to 10 without changing Core defaults", async () => {
    const actor = character({poolValues: {might: 9}, mightEdge: 20, wounds: wounds({minor: 2})});
    const free = await service.apply(actor, "minor", undefined, 0);
    expect(free).toMatchObject({success: true, cost: 0, mightValue: 9});
    expect(service.costFor("minor")).toBe(2);
    expect(service.costFor("moderate")).toBe(5);

    expect(service.rally(wounds({minor: 1}), 10, "minor", undefined, 11))
      .toMatchObject({success: false, failure: "invalid-cost"});
  });

  it("uses the same authoritative result for preview and application", async () => {
    const actor = character({poolValues: {might: 9}, wounds: wounds({moderate: 1})});
    expect(service.preview(actor, "moderate", 3)).toMatchObject({
      success: true,
      cost: 3,
      mightValue: 6
    });
    await expect(service.apply(actor, "moderate", undefined, 3)).resolves.toMatchObject({
      success: true,
      cost: 3,
      mightValue: 6
    });
  });

  it("does not allow Rally after death", async () => {
    const actor = character({wounds: wounds({minor: 1, major: 3})});
    await expect(service.apply(actor, "minor")).rejects.toThrow(/dead/i);
  });

  it("reports Header availability through the existing Rally decisions", () => {
    expect(service.canApply(character({poolValues: {might: 2}, wounds: wounds({minor: 1})}))).toBe(true);
    expect(service.canApply(character({poolValues: {might: 5}, wounds: wounds({moderate: 1})}))).toBe(true);
    expect(service.canApply(character({poolValues: {might: 1}, wounds: wounds({minor: 1})}))).toBe(false);
    expect(service.canApply(character({poolValues: {might: 10}, wounds: wounds({major: 1})}))).toBe(false);
    expect(service.canApply(character({poolValues: {might: 10}, wounds: wounds({minor: 1, major: 3})}))).toBe(false);
  });
});
