import {describe, expect, it} from "vitest";

import {tooltipPosition} from "../../src/applications/tooltips/system-tooltip";

describe("SystemTooltip viewport positioning", () => {
  it("prefers the target right edge and clamps vertically", () => {
    expect(tooltipPosition(
      {left: 100, right: 200, top: 580, bottom: 620, width: 100, height: 40},
      {width: 240, height: 180},
      {width: 800, height: 640}
    )).toEqual({left: 208, top: 452});
  });

  it("moves to the left and remains inside a narrow viewport", () => {
    expect(tooltipPosition(
      {left: 420, right: 520, top: 20, bottom: 60, width: 100, height: 40},
      {width: 220, height: 100},
      {width: 560, height: 400}
    )).toEqual({left: 192, top: 20});
  });
});
