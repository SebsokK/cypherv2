import {describe, expect, it, vi} from "vitest";

import type {DepletionItemLike} from "../../src/depletion/depletion-types";
import {DepletionService} from "../../src/services/depletion-service";
import {depletionLabel} from "../../src/depletion/depletion-rules";

function weapon(enabled = true, die: "d6" | "d10" | "d20" = "d6"): DepletionItemLike {
  return {
    id: "weapon-1",
    name: "Volatile blade",
    type: "weapon",
    system: {depletion: {enabled, die, threshold: 1}}
  };
}

function artifact(formula = "1d100", depleted = false): DepletionItemLike & {update: ReturnType<typeof vi.fn>} {
  return {
    id: "artifact-1",
    name: "Jian",
    type: "artifact",
    system: {depleted, depletion: {enabled: true, die: "d6", formula, threshold: 1}},
    update: vi.fn(async () => undefined)
  };
}

describe("shared DepletionService", () => {
  it("formats structured Weapon thresholds without reparsing display text", () => {
    expect(depletionLabel({die: "d6", threshold: 1})).toBe("1 in 1d6");
    expect(depletionLabel({die: "d20", threshold: 3})).toBe("1-3 in 1d20");
  });

  it.each([
    ["d6", 1, true],
    ["d10", 7, false],
    ["d20", 20, false]
  ] as const)("resolves 1 in 1%s with total %i", async (die, total, depleted) => {
    const roller = vi.fn(async () => ({total}));
    const result = await new DepletionService(roller).roll(weapon(true, die));

    expect(roller).toHaveBeenCalledWith(`1${die}`);
    expect(result).toMatchObject({formula: `1${die}`, total, threshold: 1, depleted});
  });

  it("leaves a Weapon without Depletion unchanged and does not roll", async () => {
    const roller = vi.fn(async () => ({total: 1}));
    await expect(new DepletionService(roller).roll(weapon(false))).rejects.toThrow(
      "not enabled"
    );
    expect(roller).not.toHaveBeenCalled();
  });

  it("marks a Weapon Depleted after a successful manual check and blocks another check until cleared", async () => {
    const update = vi.fn(async () => undefined);
    const item = {...weapon(true, "d20"), update};
    const service = new DepletionService(async () => ({total: 1}));
    await service.roll(item);
    expect(update).toHaveBeenCalledWith({"system.depleted": true});
    const depleted = {...item, system: {...item.system, depleted: true}};
    await expect(service.roll(depleted)).rejects.toThrow("already depleted");
  });

  it.each(["shield", "armor"] as const)(
    "uses the same manual structured Depletion state for %s without changing usability",
    async (type) => {
      const update = vi.fn(async () => undefined);
      const item: DepletionItemLike = {
        id: `${type}-1`, name: `Test ${type}`, type,
        system: {depleted: false, depletion: {enabled: true, die: "d20", threshold: 3}},
        update
      };
      const result = await new DepletionService(async () => ({total: 2})).roll(item);
      expect(result).toMatchObject({formula: "1d20", threshold: 3, depleted: true});
      expect(update).toHaveBeenCalledWith({"system.depleted": true});
      expect(item.system).not.toHaveProperty("equipped");
    }
  );

  it("uses an Artifact formula without changing the existing depletion comparison", async () => {
    const item = artifact("1d100");
    const result = await new DepletionService(async () => ({total: 1})).roll(item);
    expect(result).toMatchObject({formula: "1d100", total: 1, threshold: 1, depleted: true});
    expect(item.update).toHaveBeenCalledWith({"system.depleted": true});
  });

  it("does not mark an Artifact Depleted when the roll exceeds its threshold", async () => {
    const item = artifact("1d100");
    const result = await new DepletionService(async () => ({total: 42})).roll(item);
    expect(result.depleted).toBe(false);
    expect(item.update).not.toHaveBeenCalled();
  });

  it("blocks another automatic Depletion roll until Depleted is manually cleared", async () => {
    const roller = vi.fn(async () => ({total: 1}));
    await expect(new DepletionService(roller).roll(artifact("1d100", true))).rejects.toThrow("already depleted");
    expect(roller).not.toHaveBeenCalled();
  });
});
