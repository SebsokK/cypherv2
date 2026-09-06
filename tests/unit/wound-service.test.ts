import {describe, expect, it} from "vitest";

import {WoundService, poolOverflowSeverity} from "../../src/services/wound-service";
import {character, wounds} from "../helpers/core-fixtures";

const capacities = {minor: 3, moderate: 3, major: 3};

describe("WoundService", () => {
  const service = new WoundService(() => "new-wound");

  it("adds a Wound at its requested severity", () => {
    const result = service.applyWound(wounds(), "minor", capacities);

    expect(result.appliedSeverity).toBe("minor");
    expect(result.wounds.minor).toHaveLength(1);
    expect(result.dead).toBe(false);
  });

  it("overflows a Minor into Moderate when Minor is full", () => {
    const result = service.applyWound(wounds({minor: 3}), "minor", capacities);

    expect(result.appliedSeverity).toBe("moderate");
    expect(result.overflowSteps).toBe(1);
    expect(result.wounds).toMatchObject({minor: expect.arrayContaining([])});
    expect(result.wounds.minor).toHaveLength(3);
    expect(result.wounds.moderate).toHaveLength(1);
  });

  it("cascades Minor through a full Moderate tier into Major", () => {
    const result = service.applyWound(wounds({minor: 3, moderate: 3}), "minor", capacities);

    expect(result.appliedSeverity).toBe("major");
    expect(result.overflowSteps).toBe(2);
    expect(result.wounds.major).toHaveLength(1);
  });

  it("overflows a Moderate directly into Major", () => {
    const result = service.applyWound(wounds({moderate: 3}), "moderate", capacities);
    expect(result.appliedSeverity).toBe("major");
  });

  it("kills immediately when the third Major is taken", () => {
    const result = service.applyWound(wounds({major: 2}), "major", capacities);

    expect(result.wounds.major).toHaveLength(3);
    expect(result.dead).toBe(true);
  });

  it("never creates a fourth Major", () => {
    const result = service.applyWound(wounds({minor: 3, moderate: 3, major: 3}), "minor", capacities);

    expect(result.applied).toBe(false);
    expect(result.appliedSeverity).toBeNull();
    expect(result.record).toBeNull();
    expect(result.wounds.major).toHaveLength(3);
    expect(result.dead).toBe(true);
  });

  it("removes a selected Wound or the most recent Wound", () => {
    const selected = service.removeOne(wounds({minor: 3}), "minor", "minor-1");
    expect(selected.removed?.id).toBe("minor-1");
    expect(selected.wounds.minor.map((entry) => entry.id)).toEqual(["minor-2", "minor-3"]);

    const recent = service.removeOne(wounds({major: 2}), "major");
    expect(recent.removed?.id).toBe("major-2");
  });

  it.each([[1], [2], [3]] as const)("sets an empty Minor track directly to %i without rollover", (count) => {
    const result = service.setWoundCount(wounds(), "minor", count, 3);
    expect(result.wounds.minor).toHaveLength(count);
    expect(result.wounds.moderate).toHaveLength(0);
    expect(result.wounds.major).toHaveLength(0);
  });

  it.each([[3, 2], [2, 1], [1, 0]] as const)(
    "reduces a contiguous track from %i to %i",
    (before, count) => {
      const result = service.setWoundCount(wounds({minor: before}), "minor", count, 3);
      expect(result.previousCount).toBe(before);
      expect(result.wounds.minor).toHaveLength(count);
      expect(result.removed).toHaveLength(before - count);
    }
  );

  it("supports dynamic capacities and refuses a non-contiguous count beyond capacity", () => {
    expect(service.setWoundCount(wounds(), "minor", 5, 5).wounds.minor).toHaveLength(5);
    expect(() => service.setWoundCount(wounds(), "minor", 6, 5)).toThrow("capacity");
  });

  it("re-derives Hindrance and Dead after direct count edits", async () => {
    const actor = character();
    await service.setCount(actor, "moderate", 3);
    expect(actor.system.derived.wounds.hindrance).toBe(1);
    await service.setCount(actor, "major", 3);
    expect(actor.system.derived.wounds.hindrance).toBe(4);
    expect(actor.system.derived.wounds.dead).toBe(true);
    await service.setCount(actor, "major", 2);
    expect(actor.system.derived.wounds.dead).toBe(false);
  });

  it("edits only the selected Wound label and description", () => {
    const current = wounds({minor: 1});
    current.minor[0]!.sourceUuid = "source-kept";
    current.minor[0]!.treated = true;

    const result = service.updateWound(current, "minor", "minor-1", {
      label: "Bruised shoulder",
      description: "Painful when lifting."
    });

    expect(result.updated).toEqual({
      id: "minor-1",
      label: "Bruised shoulder",
      description: "Painful when lifting.",
      sourceUuid: "source-kept",
      treated: true
    });
    expect(current.minor[0]!.label).toBe("minor-1");
    expect(result.wounds.moderate).toHaveLength(0);
    expect(result.wounds.major).toHaveLength(0);
  });

  it("cannot edit a Wound through the wrong severity collection", () => {
    expect(() => service.updateWound(wounds({major: 1}), "minor", "major-1", {
      label: "Invalid move",
      description: ""
    })).toThrow("was not found in minor Wounds");
  });

  it("persists a manual edit with one Actor update", async () => {
    const actor = character({wounds: wounds({minor: 1})});

    await service.edit(actor, "minor", "minor-1", {
      label: "Edited",
      description: "Edited description"
    });

    expect(actor.system.wounds.minor[0]).toMatchObject({
      id: "minor-1",
      label: "Edited",
      description: "Edited description"
    });
    expect(actor.updates).toHaveLength(1);
  });

  it("re-derives death immediately when the third Major is deleted", async () => {
    const actor = character({wounds: wounds({major: 3})});
    expect(actor.system.derived.wounds.dead).toBe(true);
    expect(actor.system.derived.wounds.hindrance).toBe(3);

    await service.delete(actor, "major", "major-3");

    expect(actor.system.wounds.major).toHaveLength(2);
    expect(actor.system.derived.wounds.dead).toBe(false);
    expect(actor.system.derived.wounds.hindrance).toBe(2);
    expect(actor.updates).toHaveLength(1);
  });

  it("re-derives hindrance when a full Moderate collection is no longer full", async () => {
    const actor = character({wounds: wounds({moderate: 3, major: 1})});
    expect(actor.system.derived.wounds.hindrance).toBe(2);

    await service.delete(actor, "moderate", "moderate-2");

    expect(actor.system.derived.wounds.hindrance).toBe(1);
    expect(actor.system.derived.wounds.dead).toBe(false);
  });

  it("rejects deletion of an unknown Wound without updating the Actor", async () => {
    const actor = character({wounds: wounds({minor: 1})});

    await expect(service.delete(actor, "minor", "unknown")).rejects.toThrow("was not found");
    expect(actor.updates).toHaveLength(0);
    expect(actor.system.wounds.minor).toHaveLength(1);
  });

  it("maps Pool overflow thresholds exactly", () => {
    expect(poolOverflowSeverity(0)).toBeNull();
    expect(poolOverflowSeverity(1)).toBe("minor");
    expect(poolOverflowSeverity(4)).toBe("minor");
    expect(poolOverflowSeverity(5)).toBe("moderate");
    expect(poolOverflowSeverity(8)).toBe("moderate");
    expect(poolOverflowSeverity(9)).toBe("major");
    expect(poolOverflowSeverity(99)).toBe("major");
  });

  it("does not inflict a Wound when damage only reaches zero", () => {
    const result = service.applyPoolDamage(wounds(), "might", 5, 5, capacities);

    expect(result.value).toBe(0);
    expect(result.overflow).toBe(0);
    expect(result.wound).toBeNull();
  });

  it.each([
    [6, "minor"],
    [9, "minor"],
    [10, "moderate"],
    [13, "moderate"],
    [14, "major"]
  ] as const)("converts damage %i against a Pool of 5 into %s", (damage, severity) => {
    const result = service.applyPoolDamage(wounds(), "speed", 5, damage, capacities);
    expect(result.overflowSeverity).toBe(severity);
    expect(result.wound?.appliedSeverity).toBe(severity);
  });

  it("treats all damage as overflow when the Pool is already zero", () => {
    const result = service.applyPoolDamage(wounds(), "intellect", 0, 5, capacities);
    expect(result.overflow).toBe(5);
    expect(result.overflowSeverity).toBe("moderate");
  });

  it("applies Wound rollover to Pool Damage overflow", () => {
    const result = service.applyPoolDamage(
      wounds({minor: 3, moderate: 3}),
      "might",
      0,
      2,
      capacities
    );
    expect(result.overflowSeverity).toBe("minor");
    expect(result.wound?.appliedSeverity).toBe("major");
  });

  it("updates the Pool and Wounds atomically on the Character Document", async () => {
    const actor = character({poolValues: {might: 3}});
    const result = await service.damagePool(actor, "might", 8);

    expect(result.overflowSeverity).toBe("moderate");
    expect(actor.system.stats.might.value).toBe(0);
    expect(actor.system.wounds.moderate).toHaveLength(1);
    expect(actor.updates).toHaveLength(1);
  });

  it("rejects negative or fractional Pool damage", () => {
    expect(() => service.applyPoolDamage(wounds(), "might", 5, -1, capacities)).toThrow();
    expect(() => service.applyPoolDamage(wounds(), "might", 5, 1.5, capacities)).toThrow();
  });
});
