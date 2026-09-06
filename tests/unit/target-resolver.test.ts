import {describe, expect, it} from "vitest";

import type {NpcModificationData, NpcTargetLike} from "../../src/combat/combat-types";
import {registerCoreRuleModule} from "../../src/rules/core-rule-module";
import {RuleRegistry} from "../../src/rules/rule-registry";
import {TargetResolver} from "../../src/services/target-resolver";

function npc(modifications: readonly NpcModificationData[] = [], level = 4): NpcTargetLike {
  return {
    id: "npc-1",
    name: "Sentinel",
    type: "npc",
    system: {
      level,
      armorBase: 0,
      health: {value: 12, baseMax: 12},
      damage: {
        amount: 4,
        woundSeverity: "moderate",
        defense: {allowBlock: true, allowDodge: true},
        notes: ""
      },
      modifications
    },
    async update(): Promise<unknown> { return this; }
  };
}

function modification(overrides: Partial<NpcModificationData>): NpcModificationData {
  return {
    id: "mod-1",
    label: "Speed Defense as Level 6",
    contexts: ["defense.speed"],
    mode: "levelOverride",
    value: 6,
    visibility: "gm",
    predicate: {},
    description: "",
    ...overrides
  };
}

function resolver(): TargetResolver {
  const rules = new RuleRegistry();
  registerCoreRuleModule(rules);
  return new TargetResolver(rules);
}

describe("TargetResolver", () => {
  it("uses NPC Level when no structured modification applies", () => {
    expect(resolver().resolve(npc(), {tags: ["attack", "defense.speed"]})).toMatchObject({
      baseLevel: 4,
      difficulty: 4,
      contributions: []
    });
  });

  it.each([
    ["perception", 5],
    ["defense.speed", 6],
    ["defense.might", 7],
    ["defense.intellect", 8]
  ] as const)("selects a %s Level override", (context, value) => {
    const target = npc([modification({id: context, contexts: [context], value})]);
    expect(resolver().resolve(target, {tags: [context]}).difficulty).toBe(value);
  });

  it("prefers the most specific matching override and applies deltas and roll steps", () => {
    const target = npc([
      modification({id: "general", contexts: ["defense.speed"], value: 5}),
      modification({id: "ranged", contexts: ["defense.speed", "attack.ranged"], value: 7}),
      modification({id: "delta", contexts: ["attack.ranged"], mode: "levelDelta", value: -1}),
      modification({id: "hinder", contexts: ["weapon.heavy"], mode: "hinder", value: 1})
    ]);
    const result = resolver().resolve(target, {
      tags: ["defense.speed", "attack.ranged", "weapon.heavy"],
      attackType: "ranged",
      weaponCategory: "heavy"
    });

    expect(result.difficulty).toBe(6);
    expect(result.appliedModificationIds).toEqual(["ranged", "delta", "hinder"]);
    expect(result.contributions).toContainEqual(expect.objectContaining({
      direction: "hinder",
      steps: 1,
      label: "CYPHERV2.Combat.TargetModification"
    }));
  });

  it("supports predicates without treating unknown predicates as matches", () => {
    const target = npc([
      modification({
        id: "heavy-ranged",
        contexts: ["defense.speed"],
        predicate: {attackType: "ranged", weaponCategory: "heavy"},
        value: 8
      }),
      modification({id: "future", contexts: [], predicate: {futureRule: true}, value: 9})
    ]);
    expect(resolver().resolve(target, {
      tags: ["defense.speed"],
      attackType: "ranged",
      weaponCategory: "heavy"
    }).difficulty).toBe(8);
  });
});
