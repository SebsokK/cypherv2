import {describe, expect, it} from "vitest";

import {deriveCharacterData} from "../../src/rules/core/derived-data";
import {pools, wounds} from "../helpers/core-fixtures";

const usage = {oneAction: false, tenMinutes: false, oneHour: false, tenHours: false};

describe("derived Combat data", () => {
  it("selects the strongest equipped armor without stacking source values", () => {
    const stats = Object.assign(pools(), {effortBase: 1});
    const derived = deriveCharacterData(stats, wounds(), usage, {}, [{
      id: "light",
      type: "armor",
      system: {category: "light", equipped: true, freelyUsed: true, slug: "light"}
    }, {
      id: "heavy",
      type: "armor",
      system: {category: "heavy", equipped: true, freelyUsed: true, slug: "heavy"}
    }], {armorCategories: ["heavy"], freelyUse: []});

    expect(derived.combat.armor).toMatchObject({
      itemId: "heavy",
      category: "heavy",
      blockEase: 3,
      dodgeHindrance: 3,
      speedTaskHindrance: 0
    });
    expect(derived.combat.armor.blockContributions).toHaveLength(1);
  });

  it.each([["light", 1], ["medium", 2], ["heavy", 3]] as const)(
    "derives unfamiliar %s Armor Hindrance %i for other Speed tasks",
    (category, steps) => {
    const stats = Object.assign(pools(), {effortBase: 1});
    const derived = deriveCharacterData(stats, wounds(), usage, {}, [{
      id: category,
      type: "armor",
      system: {category, equipped: true, freelyUsed: true, slug: "legacy-local-flag"}
    }]);

    expect(derived.combat.armor.freelyUsed).toBe(false);
    expect(derived.combat.armor.speedTaskHindrance).toBe(steps);
    expect(derived.combat.armor.speedTaskContributions[0]).toMatchObject({
      sourceId: category,
      sourceType: "item",
      value: steps
    });
  });

  it("recognizes category proficiency without changing source armor data", () => {
    const stats = Object.assign(pools(), {effortBase: 1});
    const armor = {
      id: "medium",
      type: "armor",
      system: {category: "medium" as const, equipped: true, freelyUsed: false, slug: "chain"}
    };
    const derived = deriveCharacterData(stats, wounds(), usage, {}, [armor], {
      armorCategories: ["medium"],
      freelyUse: []
    });
    expect(derived.combat.armor.freelyUsed).toBe(true);
    expect(derived.combat.armor.speedTaskHindrance).toBe(0);
    expect(armor.system.freelyUsed).toBe(false);
  });

  it.each(["light", "medium", "heavy"] as const)(
    "removes global Speed-task Hindrance for familiar %s Armor",
    (category) => {
      const stats = Object.assign(pools(), {effortBase: 1});
      const derived = deriveCharacterData(stats, wounds(), usage, {}, [{
        id: category,
        type: "armor",
        system: {category, equipped: true, freelyUsed: false, slug: category}
      }], {armorCategories: [category], freelyUse: []});
      expect(derived.combat.armor.freelyUsed).toBe(true);
      expect(derived.combat.armor.speedTaskHindrance).toBe(0);
    }
  );
});
