import {describe, expect, it} from "vitest";

import type {WoundCapacities, WoundCollection} from "../../src/rules/core/core-types";
import {
  ShieldCapacityBelowWoundsError,
  ShieldService,
  type ShieldCharacterLike,
  type ShieldItemLike
} from "../../src/services/shield-service";
import {WoundService} from "../../src/services/wound-service";
import {wounds} from "../helpers/core-fixtures";

interface FakeShield extends ShieldItemLike {
  updates: Record<string, unknown>[];
}

function shield(options: {
  equipped?: boolean;
  wounds?: WoundCollection;
  capacities?: WoundCapacities;
  id?: string;
} = {}): FakeShield {
  const currentWounds = options.wounds ?? wounds();
  const capacities = options.capacities ?? {minor: 3, moderate: 2, major: 1};
  return {
    id: options.id ?? "shield-1",
    name: "Round Shield",
    type: "shield",
    system: {
      equipped: options.equipped ?? true,
      woundCapacities: capacities,
      wounds: currentWounds,
      derived: {
        capacities: {...capacities},
        broken: currentWounds.major.length >= capacities.major
      },
      description: ""
    },
    updates: [],
    async update(changes): Promise<unknown> {
      this.updates.push(changes);
      if (changes["system.wounds"]) {
        (this.system as {wounds: WoundCollection}).wounds = changes["system.wounds"] as WoundCollection;
        (this.system.derived as {broken: boolean}).broken = this.system.wounds.major.length > 0;
      }
      if (typeof changes["system.equipped"] === "boolean") {
        (this.system as {equipped: boolean}).equipped = changes["system.equipped"] as boolean;
      }
      for (const severity of ["minor", "moderate", "major"] as const) {
        const capacity = changes[`system.woundCapacities.${severity}`];
        if (typeof capacity === "number") {
          (this.system.woundCapacities as WoundCapacities)[severity] = capacity;
          (this.system.derived.capacities as WoundCapacities)[severity] = capacity;
          (this.system.derived as {broken: boolean}).broken = this.system.wounds.major.length >= this.system.derived.capacities.major;
        }
      }
      return this;
    }
  };
}

function actor(items: readonly ShieldItemLike[]): ShieldCharacterLike {
  return {id: "character-1", name: "Ada", items};
}

describe("ShieldService", () => {
  const service = new ShieldService(new WoundService(() => "shield-wound"));

  it("starts with an independent 3/2/1 functional Wound Track", () => {
    const item = shield();
    expect(item.system.wounds).toEqual({minor: [], moderate: [], major: []});
    expect(item.system.derived.capacities).toEqual({minor: 3, moderate: 2, major: 1});
    expect(service.isBroken(item)).toBe(false);
  });

  it("persists independent editable capacities for all three Shield Wound tiers", async () => {
    const item = shield();
    await service.setCapacity(item, "minor", 4);
    await service.setCapacity(item, "moderate", 3);
    await service.setCapacity(item, "major", 2);
    expect(item.system.woundCapacities).toEqual({minor: 4, moderate: 3, major: 2});
    expect(item.system.derived.capacities).toEqual({minor: 4, moderate: 3, major: 2});
    expect(item.updates).toEqual([
      {"system.woundCapacities.minor": 4},
      {"system.woundCapacities.moderate": 3},
      {"system.woundCapacities.major": 2}
    ]);
  });

  it("rejects capacity reductions below the current count without deleting Wounds", async () => {
    const item = shield({wounds: wounds({minor: 3})});
    await expect(service.setCapacity(item, "minor", 2)).rejects.toBeInstanceOf(ShieldCapacityBelowWoundsError);
    expect(item.system.wounds.minor).toHaveLength(3);
    expect(item.system.derived.capacities.minor).toBe(3);
    expect(item.updates).toHaveLength(0);
  });

  it("rejects negative and fractional capacities", async () => {
    const item = shield();
    await expect(service.setCapacity(item, "minor", -1)).rejects.toThrow("non-negative whole number");
    await expect(service.setCapacity(item, "minor", 1.5)).rejects.toThrow("non-negative whole number");
    expect(item.updates).toHaveLength(0);
  });

  it("uses configured capacities for application, rollover, and Broken state", async () => {
    const capacities = {minor: 4, moderate: 3, major: 2};
    const item = shield({capacities, wounds: wounds({minor: 3, moderate: 2, major: 1})});
    const minor = await service.apply(actor([item]), item, "minor");
    expect(minor.appliedSeverity).toBe("minor");
    expect(item.system.wounds.minor).toHaveLength(4);
    expect(service.isBroken(item)).toBe(false);

    const major = await service.apply(actor([item]), item, "major");
    expect(major.appliedSeverity).toBe("major");
    expect(item.system.wounds.major).toHaveLength(2);
    expect(major.broken).toBe(true);
    expect(service.isBroken(item)).toBe(true);
  });

  it("adds Minor Wounds and rolls a full Minor tier into Moderate", async () => {
    const first = shield();
    await service.apply(actor([first]), first, "minor");
    expect(first.system.wounds.minor).toHaveLength(1);

    const full = shield({wounds: wounds({minor: 3})});
    const result = await service.apply(actor([full]), full, "minor");
    expect(result.appliedSeverity).toBe("moderate");
    expect(full.system.wounds.minor).toHaveLength(3);
    expect(full.system.wounds.moderate).toHaveLength(1);
  });

  it("rolls a full Moderate tier into the single Major and becomes Broken", async () => {
    const item = shield({wounds: wounds({moderate: 2})});
    const result = await service.apply(actor([item]), item, "moderate");
    expect(result.appliedSeverity).toBe("major");
    expect(result.broken).toBe(true);
    expect(item.system.wounds.major).toHaveLength(1);
  });

  it("becomes Broken from a direct Major and never accepts a second Major", async () => {
    const item = shield();
    const result = await service.apply(actor([item]), item, "major");
    expect(result.broken).toBe(true);
    await expect(service.apply(actor([item]), item, "major")).rejects.toThrow("Broken Shield");
    expect(item.system.wounds.major).toHaveLength(1);
  });

  it("becomes functional immediately when its Major Wound is deleted", async () => {
    const item = shield({wounds: wounds({major: 1})});
    expect(service.isBroken(item)).toBe(true);
    const result = await service.delete(item, "major", "major-1");
    expect(result.broken).toBe(false);
    expect(service.isBroken(item)).toBe(false);
  });

  it("ignores unequipped Shields and normalizes an incoherent multiple-equipped state", async () => {
    const stored = shield({equipped: false});
    expect(service.equipped(actor([stored]))).toBeNull();
    expect(service.canAbsorb(actor([stored]))).toBe(false);
    const second = shield({id: "shield-2"});
    const first = shield();
    const owner = actor([first, second]);
    expect(() => service.equipped(owner)).toThrow("Only one Shield");
    expect(await service.normalizeEquipped(owner)).toBe(first);
    expect(first.system.equipped).toBe(true);
    expect(second.system.equipped).toBe(false);
    expect(service.equipped(owner)).toBe(first);
  });

  it("edits Wound text without changing track structure", async () => {
    const item = shield({wounds: wounds({minor: 1})});
    await service.edit(item, "minor", "minor-1", {label: "Cracked rim", description: "Bent inward."});
    expect(item.system.wounds.minor[0]).toMatchObject({label: "Cracked rim", description: "Bent inward."});
    expect(item.system.wounds.moderate).toHaveLength(0);
  });

  it("directly edits contiguous Shield tracks without rollover and derives Broken", async () => {
    const item = shield();
    await service.setCount(item, "minor", 3);
    expect(item.system.wounds.minor).toHaveLength(3);
    expect(item.system.wounds.moderate).toHaveLength(0);
    await service.setCount(item, "minor", 1);
    expect(item.system.wounds.minor).toHaveLength(1);
    await service.setCount(item, "major", 1);
    expect(service.isBroken(item)).toBe(true);
    await service.setCount(item, "major", 0);
    expect(service.isBroken(item)).toBe(false);
    expect(item.system).not.toHaveProperty("broken");
  });

  it.each([[1], [2], [3]] as const)(
    "sets an empty Shield Minor track directly to %i without rollover",
    async (count) => {
      const item = shield();
      await service.setCount(item, "minor", count);
      expect(item.system.wounds.minor).toHaveLength(count);
      expect(item.system.wounds.moderate).toHaveLength(0);
      expect(item.system.wounds.major).toHaveLength(0);
    }
  );

  it.each([[3, 2], [2, 1], [1, 0]] as const)(
    "reduces a Shield Minor track from %i to %i contiguously",
    async (before, count) => {
      const item = shield({wounds: wounds({minor: before})});
      await service.setCount(item, "minor", count);
      expect(item.system.wounds.minor).toHaveLength(count);
    }
  );
});
