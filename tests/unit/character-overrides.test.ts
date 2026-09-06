import {describe, expect, it} from "vitest";

import {
  characterOverridePath,
  characterOverrideView,
  effectiveTier
} from "../../src/rules/core/character-overrides";
import {RecoveryService} from "../../src/services/recovery-service";
import {character} from "../helpers/core-fixtures";

describe("Character effective-value overrides", () => {
  it("keeps calculated values separate from independent effective overrides", async () => {
    const actor = character({tier: 3, effortBase: 2});
    actor.system.stats.might.baseMax = 12;
    actor.system.stats.might.baseEdge = 1;
    await actor.update({
      "system.overrides.tier": 4,
      "system.overrides.effort": 5,
      "system.overrides.stats.might.max": 18,
      "system.overrides.stats.might.edge": 3
    });

    expect(actor.system.tier).toBe(3);
    expect(actor.system.stats.might.baseMax).toBe(12);
    expect(actor.system.stats.might.baseEdge).toBe(1);
    expect(actor.system.derived.tier).toEqual({calculated: 3, value: 4});
    expect(actor.system.derived.effort).toMatchObject({calculatedMax: 2, max: 5});
    expect(actor.system.derived.pools.might).toMatchObject({
      calculatedMax: 12,
      max: 18,
      calculatedEdge: 1,
      edge: 3
    });
  });

  it("clears one override without changing another or its calculated source", async () => {
    const actor = character({tier: 2, effortBase: 2});
    await actor.update({"system.overrides.tier": 5, "system.overrides.effort": 4});
    await actor.update({[characterOverridePath("tier")]: null});

    expect(effectiveTier(actor.system)).toBe(2);
    expect(actor.system.derived.effort.max).toBe(4);
    expect(actor.system.overrides.effort).toBe(4);
    expect(characterOverrideView(actor.system, "tier")).toMatchObject({
      calculated: 2,
      override: null,
      effective: 2
    });
  });

  it("uses effective Tier in Recovery and effective Effort/Edge/Max in their canonical derived paths", async () => {
    const actor = character({tier: 1, effortBase: 1});
    await actor.update({
      "system.overrides.tier": 4,
      "system.overrides.effort": 3,
      "system.overrides.stats.speed.max": 17,
      "system.overrides.stats.speed.edge": 2
    });
    const recovery = new RecoveryService(async () => 3);
    await expect(recovery.roll(actor, "one-action")).resolves.toMatchObject({tier: 4, total: 7});
    expect(actor.system.derived.effort.max).toBe(3);
    expect(actor.system.derived.pools.speed).toMatchObject({max: 17, edge: 2});
  });
});
