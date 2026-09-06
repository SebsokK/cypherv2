import {readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";

import {parseWoundCountActionData} from "../../src/applications/sheets/wound-count-action";

const characterTemplate = readFileSync("templates/actor/character-sheet.hbs", "utf8");
const itemTemplate = readFileSync("templates/item/item-sheet.hbs", "utf8");

describe("Wound count Application V2 action data", () => {
  it.each(["minor", "moderate", "major"] as const)("parses Character %s count strings", (severity) => {
    expect(parseWoundCountActionData({track: "character", severity, count: "2"})).toEqual({
      track: "character", severity, count: 2
    });
  });

  it("parses the explicit Shield contract", () => {
    expect(parseWoundCountActionData({
      track: "shield", shieldId: "shield-1", severity: "moderate", count: "1"
    })).toEqual({track: "shield", shieldId: "shield-1", severity: "moderate", count: 1});
  });

  it.each([
    {track: "character", severity: "minor"},
    {track: "character", severity: "minor", count: ""},
    {track: "character", severity: "minor", count: "1.5"},
    {track: "character", severity: "critical", count: "1"},
    {track: "shield", severity: "major", count: "1"}
  ])("rejects missing or invalid data: $track/$severity/$count", (dataset) => {
    expect(() => parseWoundCountActionData(dataset)).toThrow("Invalid Wound count action data");
  });

  it("renders explicit Character and Shield datasets without relative-context lookups", () => {
    expect(characterTemplate).toContain('data-track="character" data-severity="{{row.character.severity}}" data-count="{{pip.targetCount}}"');
    expect(characterTemplate).toContain('data-track="shield" data-shield-id="{{row.shield.itemId}}" data-severity="{{row.shield.severity}}" data-count="{{pip.targetCount}}"');
    expect(itemTemplate).toContain('data-track="shield" data-shield-id="{{@root.item.id}}" data-severity="{{track.severity}}" data-count="{{pip.targetCount}}"');
    expect(characterTemplate).not.toContain('data-severity="{{../severity}}"');
  });
});
