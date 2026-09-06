import {describe, expect, it} from "vitest";

import {formatNetStepModifier, formatStepModifier} from "../../src/rolls/step-modifier";

describe("signed step modifier formatting", () => {
  it.each([1, 2, 3])("renders Ease %i as a positive modifier", (steps) => {
    expect(formatStepModifier("ease", steps)).toBe(`+${steps}`);
  });

  it.each([1, 2, 3])("renders Hindrance %i as a negative modifier", (steps) => {
    expect(formatStepModifier("hinder", steps)).toBe(`-${steps}`);
  });

  it("formats signed net values without changing engine arithmetic", () => {
    expect(formatNetStepModifier(2)).toBe("+2");
    expect(formatNetStepModifier(-2)).toBe("-2");
    expect(formatNetStepModifier(0)).toBe("0");
  });
});
