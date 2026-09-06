import {describe, expect, it} from "vitest";
import {CYPHER_POWERS} from "../../src/constants/system";
import {cypherLevel, normalizeCypherPower} from "../../src/cyphers/cypher-rules";

describe("Cypher V2 presentation rules", () => {
  it("derives Level 4 for Subtle and Level 6 for Manifest Cyphers", () => {
    expect(cypherLevel({manifestation: "subtle"})).toBe(4);
    expect(cypherLevel({manifestation: "manifest"})).toBe(6);
  });

  it("keeps an explicit compatibility override in Advanced data", () => {
    expect(cypherLevel({manifestation: "subtle", levelOverride: true, level: 9})).toBe(9);
    expect(cypherLevel({manifestation: "manifest", levelOverride: false, level: 2})).toBe(6);
  });

  it("supports exactly the five requested Cypher Power ranks", () => {
    expect(CYPHER_POWERS).toEqual(["low", "medium", "advanced", "high", "ultra"]);
    for (const power of CYPHER_POWERS) expect(normalizeCypherPower(power)).toBe(power);
  });
});
