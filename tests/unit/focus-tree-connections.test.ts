import {describe, expect, it} from "vitest";

import fixture from "../../fixtures/abides-in-stone-focus.json";
import {
  connectionEndpoints,
  relativeRectangle
} from "../../src/focus/focus-tree-connections";
import {horizontalPercentages} from "../../src/focus/focus-tree-renderer";
import type {FocusNode} from "../../src/focus/focus-types";

describe("responsive Focus Tree connection geometry", () => {
  it("converts node rectangles into the canvas coordinate system", () => {
    expect(relativeRectangle(
      {left: 250, top: 175, width: 180, height: 72},
      {left: 100, top: 75}
    )).toEqual({left: 150, top: 100, width: 180, height: 72});
  });

  it("attaches a horizontal connection to facing node borders", () => {
    expect(connectionEndpoints(
      {left: 0, top: 0, width: 100, height: 50},
      {left: 300, top: 0, width: 100, height: 50}
    )).toEqual({x1: 100, y1: 25, x2: 300, y2: 25});
  });

  it("attaches a vertical connection to bottom and top borders", () => {
    expect(connectionEndpoints(
      {left: 0, top: 0, width: 100, height: 50},
      {left: 0, top: 200, width: 100, height: 50}
    )).toEqual({x1: 50, y1: 50, x2: 50, y2: 200});
  });

  it("intersects diagonal connections with both current rectangles", () => {
    expect(connectionEndpoints(
      {left: 0, top: 0, width: 100, height: 100},
      {left: 200, top: 200, width: 100, height: 100}
    )).toEqual({x1: 100, y1: 100, x2: 200, y2: 200});
  });

  it("treats position.x as responsive ordering rather than fixed pixels", () => {
    const tierOne = fixture.system.graph.nodes
      .filter((node) => node.tier === 1) as unknown as FocusNode[];
    const scaled = tierOne.map((node) => ({
      ...node,
      position: {x: node.position.x === null ? null : node.position.x * 100, y: null}
    }));
    expect(horizontalPercentages(tierOne)).toEqual(horizontalPercentages(scaled));
    expect([...horizontalPercentages(tierOne).values()]).toEqual([25, 50, 75]);
  });
});
