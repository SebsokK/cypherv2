import {describe, expect, it} from "vitest";
import {
  abilityMechanicsVisibility,
  skillHasOptionalMechanics,
  type AbilityMechanicsSource
} from "../../src/applications/sheets/item-mechanics-visibility";

function ability(overrides: Partial<AbilityMechanicsSource> = {}): AbilityMechanicsSource {
  return {
    activation: "action",
    cost: {amount: 0, ignoresEdge: false},
    roll: "none",
    rollModifier: 0,
    attackModifier: 0,
    damage: 0,
    woundSeverity: "none",
    range: "",
    targetMode: "none",
    ...overrides
  };
}

describe("Ability Item mechanical field visibility", () => {
  it("keeps a simple no-roll Ability limited to its fundamental fields", () => {
    expect(abilityMechanicsVisibility(ability())).toEqual({
      showIgnoresEdge: false,
      showRollModifier: false,
      rollModifierLabel: "general",
      showAttackModifier: false,
      showDamage: false,
      showWoundSeverity: false,
      showRange: false,
      showTargetMode: false,
      hasConditionalFields: false
    });
  });

  it("shows cost options only when a cost exists or ignoresEdge is already configured", () => {
    expect(abilityMechanicsVisibility(ability({cost: {amount: 2, ignoresEdge: false, allowedPools: ["might"]}})).showIgnoresEdge)
      .toBe(true);
    expect(abilityMechanicsVisibility(ability({cost: {amount: 0, ignoresEdge: true}})).showIgnoresEdge)
      .toBe(true);
  });

  it("shows only the task modifier for a Task", () => {
    const view = abilityMechanicsVisibility(ability({roll: "task"}));
    expect(view.showRollModifier).toBe(true);
    expect(view.rollModifierLabel).toBe("task");
    expect(view.showAttackModifier).toBe(false);
    expect(view.showDamage).toBe(false);
    expect(view.showTargetMode).toBe(false);
  });

  it("shows the relevant modifier for a Defense", () => {
    const view = abilityMechanicsVisibility(ability({roll: "defense"}));
    expect(view.showRollModifier).toBe(true);
    expect(view.rollModifierLabel).toBe("defense");
    expect(view.showAttackModifier).toBe(false);
  });

  it("shows the complete attack configuration for an Attack", () => {
    expect(abilityMechanicsVisibility(ability({roll: "attack"}))).toMatchObject({
      showAttackModifier: true,
      showDamage: true,
      showWoundSeverity: true,
      showRange: true,
      showTargetMode: true,
      hasConditionalFields: true
    });
  });

  it("never hides configured legacy or atypical values for a no-roll/passive Ability", () => {
    const view = abilityMechanicsVisibility(ability({
      activation: "passive",
      rollModifier: 1,
      attackModifier: -1,
      damage: 4,
      woundSeverity: "moderate",
      range: "long",
      targetMode: "multiple"
    }));
    expect(view).toMatchObject({
      showRollModifier: true,
      showAttackModifier: true,
      showDamage: true,
      showWoundSeverity: true,
      showRange: true,
      showTargetMode: true
    });
  });
});

describe("Skill Item optional mechanical visibility", () => {
  const simple = {defaultPool: "choose", category: "general", contexts: [], initiative: false};

  it("keeps a default Skill visually simple", () => {
    expect(skillHasOptionalMechanics(simple)).toBe(false);
  });

  it.each([
    {...simple, defaultPool: "speed"},
    {...simple, category: "attack"},
    {...simple, contexts: ["attack.ranged"]},
    {...simple, initiative: true}
  ])("surfaces every configured optional Skill mechanic", (configured) => {
    expect(skillHasOptionalMechanics(configured)).toBe(true);
  });
});
