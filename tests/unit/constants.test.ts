import {describe, expect, it} from "vitest";

import {
  ACTOR_TYPES,
  DURATION_TRIGGERS,
  DEFENSE_TYPES,
  ITEM_TYPES,
  SKILL_DEFAULT_POOLS,
  SKILL_RANKS,
  WOUND_SEVERITIES
} from "../../src/constants/system";

describe("system constants", () => {
  it("declares only the Phase 1 Actor types", () => {
    expect(ACTOR_TYPES).toEqual(["character", "npc"]);
  });

  it("uses the validated Cypher V2 skill ranks", () => {
    expect(SKILL_RANKS).toEqual([
      "inability",
      "untrained",
      "trained",
      "specialized",
      "expert"
    ]);
    expect(SKILL_RANKS).not.toContain("practiced");
  });

  it("uses an explicit valid enum for a Skill with no configured Pool", () => {
    expect(SKILL_DEFAULT_POOLS).toEqual(["choose", "might", "speed", "intellect"]);
    expect(SKILL_DEFAULT_POOLS).not.toContain("");
  });

  it("declares the intended Item shells", () => {
    expect(ITEM_TYPES).toContain("focus");
    expect(ITEM_TYPES).toContain("descriptor");
    expect(ITEM_TYPES).toContain("characterType");
    expect(ITEM_TYPES).toContain("shield");
    expect(ITEM_TYPES).toContain("genre");
    expect(ITEM_TYPES).toHaveLength(13);
  });

  it("locks the Core wound severities and duration triggers", () => {
    expect(WOUND_SEVERITIES).toEqual(["minor", "moderate", "major"]);
    expect(DURATION_TRIGGERS).toContain("non-rest-recovery");
    expect(DURATION_TRIGGERS).toContain("10-minute-or-longer");
  });

  it("exposes Block With Shield as an explicit defense method", () => {
    expect(DEFENSE_TYPES).toEqual(["block", "blockWithShield", "dodge"]);
  });
});
