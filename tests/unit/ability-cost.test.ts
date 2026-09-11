import {describe, expect, it} from "vitest";
import {
  abilityAllowedPools,
  formatAbilityCost,
  formatAbilityPoolList,
  normalizeAbilityAllowedPools
} from "../../src/abilities/ability-cost";

describe("Ability allowed Pool normalization", () => {
  it.each([
    ["might", ["might"]],
    ["speed", ["speed"]],
    ["intellect", ["intellect"]],
    ["choose", ["might", "speed", "intellect"]],
    ["any", ["might", "speed", "intellect"]],
    ["none", []]
  ])("migrates legacy %s semantics", (legacy, expected) => {
    expect(normalizeAbilityAllowedPools(undefined, legacy)).toEqual(expected);
  });

  it("normalizes explicit combinations, removes invalid values, duplicates, and source ordering", () => {
    expect(normalizeAbilityAllowedPools([
      "intellect", "might", "might", "invalid"
    ], "speed")).toEqual(["might", "intellect"]);
    expect(normalizeAbilityAllowedPools(["speed", "intellect"])).toEqual(["speed", "intellect"]);
  });

  it("treats an explicit empty list as No Pool instead of falling back to legacy data", () => {
    expect(normalizeAbilityAllowedPools([], "might")).toEqual([]);
  });

  it("reads normalized documents and legacy documents through one compatibility boundary", () => {
    expect(abilityAllowedPools({system: {
      pool: "might",
      cost: {allowedPools: ["speed", "intellect"]}
    }})).toEqual(["speed", "intellect"]);
    expect(abilityAllowedPools({system: {
      pool: "choose",
      cost: {}
    }})).toEqual(["might", "speed", "intellect"]);
  });
});

describe("natural Ability cost notation", () => {
  const label = (pool: "might" | "speed" | "intellect") => ({
    might: "Might", speed: "Speed", intellect: "Intellect"
  })[pool];
  const separators = {pair: " or ", middle: ", ", final: ", or "};

  it("formats one, two, and three legal whole-cost Pool choices", () => {
    expect(formatAbilityPoolList(["might"], label, separators)).toBe("Might");
    expect(formatAbilityPoolList(["might", "intellect"], label, separators)).toBe("Might or Intellect");
    expect(formatAbilityPoolList(["might", "speed", "intellect"], label, separators))
      .toBe("Might, Speed, or Intellect");
  });

  it("omits Free, Passive, zero, and Pool-less classifications", () => {
    expect(formatAbilityCost(4, ["might"], label, separators)).toBe("4 Might");
    expect(formatAbilityCost(0, ["might"], label, separators)).toBe("");
    expect(formatAbilityCost(4, [], label, separators)).toBe("");
  });

  it("renders scalable cost metadata without changing the base cost", () => {
    expect(formatAbilityCost(2, ["intellect"], label, separators, true)).toBe("2+ Intellect");
    expect(formatAbilityCost(2, ["intellect"], label, separators, false)).toBe("2 Intellect");
  });
});
