import {describe, expect, it} from "vitest";

import {createRecoveryUsage} from "../../src/rules/core/core-types";
import {deriveCharacterData} from "../../src/rules/core/derived-data";
import {pools, wounds} from "../helpers/core-fixtures";

describe("Core Character derived data", () => {
  it("derives all Pool maxima and Edge from base values", () => {
    const stats = pools();
    stats.might.baseMax = 14;
    stats.might.baseEdge = 2;
    stats.speed.baseMax = 11;
    stats.speed.baseEdge = 1;
    stats.intellect.baseMax = 16;
    stats.intellect.baseEdge = 3;

    const derived = deriveCharacterData(stats, wounds(), createRecoveryUsage());

    expect(derived.pools.might).toMatchObject({max: 14, edge: 2});
    expect(derived.pools.speed).toMatchObject({max: 11, edge: 1});
    expect(derived.pools.intellect).toMatchObject({max: 16, edge: 3});
  });

  it("retains the provenance of base and Rule Module Pool contributions", () => {
    const derived = deriveCharacterData(pools(), wounds(), createRecoveryUsage(), {
      poolMax: {
        might: [{
          id: "module.might",
          sourceId: "example.module",
          sourceType: "rule-module",
          label: "Example bonus",
          value: 2
        }]
      }
    });

    expect(derived.pools.might.max).toBe(12);
    expect(derived.pools.might.maxContributions.map((entry) => entry.sourceId)).toEqual([
      "system.stats.might.baseMax",
      "example.module"
    ]);
  });

  it("derives the Effort maximum with contribution provenance", () => {
    const stats = Object.assign(pools(), {effortBase: 2});
    const derived = deriveCharacterData(stats, wounds(), createRecoveryUsage(), {
      effortMax: [{
        id: "module.effort",
        sourceId: "example.module",
        sourceType: "rule-module",
        label: "Example Effort",
        value: 1
      }]
    });

    expect(derived.effort.max).toBe(3);
    expect(derived.effort.contributions.map((entry) => entry.sourceId)).toEqual([
      "system.stats.effortBase",
      "example.module"
    ]);
  });

  it("derives Core Wound capacities as 3/3/3 with provenance", () => {
    const derived = deriveCharacterData(pools(), wounds(), createRecoveryUsage());

    expect(derived.wounds.capacities).toEqual({minor: 3, moderate: 3, major: 3});
    expect(derived.wounds.capacityContributions.major[0]?.sourceId).toBe("cypherv2.core");
  });

  it("applies independent manual Wound capacity modifiers after calculated contributions", () => {
    const derived = deriveCharacterData(
      pools(), wounds(), createRecoveryUsage(), {}, [], undefined, 0, undefined, 2, 1,
      {tier: null, effort: null, stats: {
        might: {max: null, edge: null}, speed: {max: null, edge: null}, intellect: {max: null, edge: null}
      }, wounds: {minor: 1, moderate: 0, major: -1}}
    );
    expect(derived.wounds.calculatedCapacities).toEqual({minor: 3, moderate: 3, major: 3});
    expect(derived.wounds.capacities).toEqual({minor: 4, moderate: 3, major: 2});
  });

  it("adds one hindrance when Moderate Wounds are full", () => {
    expect(deriveCharacterData(pools(), wounds({moderate: 2}), createRecoveryUsage()).wounds.hindrance).toBe(0);
    expect(deriveCharacterData(pools(), wounds({moderate: 3}), createRecoveryUsage()).wounds.hindrance).toBe(1);
  });

  it("adds one hindrance per Major Wound and keeps each Wound as provenance", () => {
    const derived = deriveCharacterData(pools(), wounds({moderate: 3, major: 2}), createRecoveryUsage());

    expect(derived.wounds.hindrance).toBe(3);
    expect(derived.wounds.hindranceContributions.map((entry) => entry.sourceType)).toEqual([
      "core",
      "wound",
      "wound"
    ]);
  });

  it("marks the Character dead exactly at Major capacity", () => {
    expect(deriveCharacterData(pools(), wounds({major: 2}), createRecoveryUsage()).wounds.dead).toBe(false);
    expect(deriveCharacterData(pools(), wounds({major: 3}), createRecoveryUsage()).wounds.dead).toBe(true);
  });

  it("derives independently available Recoveries from persisted usage", () => {
    expect(
      deriveCharacterData(pools(), wounds(), createRecoveryUsage()).recovery.availableTypes
    ).toEqual(["one-action", "10-minutes", "1-hour", "10-hours"]);
    expect(
      deriveCharacterData(pools(), wounds(), {
        oneAction: true,
        tenMinutes: false,
        oneHour: true,
        tenHours: false
      }).recovery.availableTypes
    ).toEqual(["10-minutes", "10-hours"]);
  });

  it("derives the permanent Recovery bonus and keeps its source provenance", () => {
    const core = deriveCharacterData(
      pools(), wounds(), createRecoveryUsage(), {}, [], undefined, 0
    );
    const derived = deriveCharacterData(
      pools(), wounds(), createRecoveryUsage(), {}, [], undefined, 4
    );
    expect(core.recovery.formula).toBe("1d6 + Tier");
    expect(derived.recovery).toMatchObject({bonus: 4, formula: "1d6 + Tier + 4"});
    expect(derived.recovery.bonusContributions[0]).toMatchObject({
      sourceId: "system.recovery.bonus",
      value: 4
    });
  });

  it("adds a signed manual Recovery modifier without changing the calculated formula", () => {
    const plus = deriveCharacterData(
      pools(), wounds(), createRecoveryUsage(), {}, [], undefined, 0, undefined, 2, 1, undefined, 1
    );
    const minus = deriveCharacterData(
      pools(), wounds(), createRecoveryUsage(), {}, [], undefined, 0, undefined, 2, 1, undefined, -1
    );
    expect(plus.recovery).toMatchObject({calculatedFormula: "1d6 + Tier", formula: "1d6 + Tier + 1", bonus: 1});
    expect(minus.recovery).toMatchObject({calculatedFormula: "1d6 + Tier", formula: "1d6 + Tier - 1", bonus: -1});
  });
});
