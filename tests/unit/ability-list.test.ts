import {describe, expect, it} from "vitest";
import type {AbilityItemLike} from "../../src/abilities/ability-types";
import {
  AbilityAccordionState,
  abilityListPresentation,
  sortAbilityList
} from "../../src/applications/sheets/ability-list";

function ability(overrides: Partial<AbilityItemLike["system"]> = {}): AbilityItemLike {
  return {
    id: "ability-1",
    name: "Mind Lance",
    type: "ability",
    system: {
      activation: "action",
      pool: "intellect",
      cost: {amount: 2, ignoresEdge: false, allowedPools: ["intellect"]},
      roll: "attack",
      rollModifier: 0,
      attackModifier: 0,
      damage: 0,
      woundSeverity: "none",
      range: "",
      targetMode: "none",
      description: "",
      ...overrides
    }
  };
}

describe("Ability accordion presentation", () => {
  it.each([
    ["might", 2, true, "might"],
    ["speed", 2, true, "speed"],
    ["intellect", 2, true, "intellect"],
    ["choose", 1, true, "choose"],
    ["none", 0, false, "none"]
  ] as const)("renders %s cost semantically", (pool, amount, payable, expectedPool) => {
    const allowedPools = pool === "choose"
      ? ["might", "speed", "intellect"] as const
      : pool === "none" ? [] as const : [expectedPool];
    expect(abilityListPresentation(ability({pool, cost: {amount, ignoresEdge: false, allowedPools}})).cost)
      .toEqual({amount, scalable: false, pools: allowedPools, payable});
  });

  it("preserves scalable cost metadata for compact presentation", () => {
    expect(abilityListPresentation(ability({
      cost: {amount: 2, scalable: true, ignoresEdge: false, allowedPools: ["intellect"]}
    })).cost).toEqual({amount: 2, scalable: true, pools: ["intellect"], payable: true});
  });

  it("does not classify passive or roll behavior in the normal presentation", () => {
    const view = abilityListPresentation(ability({
      activation: "passive",
      cost: {amount: 5, ignoresEdge: true, allowedPools: ["intellect"]},
      roll: "attack",
      range: "long",
      targetMode: "single"
    }));
    expect(view.cost).toEqual({amount: 5, scalable: false, pools: ["intellect"], payable: true});
    expect(view).not.toHaveProperty("passive");
    expect(view).not.toHaveProperty("summary");
    expect(view).not.toHaveProperty("tags");
  });

  it("keeps archive as presentation state without changing ownership or deletion provenance", () => {
    const view = abilityListPresentation(ability({
      archived: true,
      grantedBy: {kind: "focus", sourceUuid: "Item.focus", instanceId: "focus", grantId: "node", status: "active"}
    }));
    expect(view.archived).toBe(true);
    expect(view.canDelete).toBe(false);
  });

  it("preserves a long rich description without interpreting it", () => {
    const description = `<p>${"A long description. ".repeat(80)}</p>`;
    expect(abilityListPresentation(ability({description})).description).toBe(description);
  });

  it("sorts active A-Z before archived A-Z without mutating document order", () => {
    const source = [
      {...ability({archived: true}), id: "z", name: "Zephyr"},
      {...ability(), id: "m", name: "Mind Lance"},
      {...ability({archived: true}), id: "a", name: "Arc"},
      {...ability(), id: "b", name: "Bash"}
    ];
    expect(sortAbilityList(source).map(({id}) => id)).toEqual(["b", "m", "a", "z"]);
    expect(source.map(({id}) => id)).toEqual(["z", "m", "a", "b"]);
  });

  it("protects active grants while allowing custom and retained Abilities to be deleted", () => {
    expect(abilityListPresentation(ability()).canDelete).toBe(true);
    expect(abilityListPresentation(ability({
      grantedBy: {kind: "focus", sourceUuid: "Item.focus", instanceId: "focus", grantId: "node", status: "active"}
    })).canDelete).toBe(false);
    expect(abilityListPresentation(ability({
      grantedBy: {kind: "focus", sourceUuid: "Item.focus", instanceId: "focus", grantId: "node", status: "retained"}
    })).canDelete).toBe(true);
  });
});

describe("Ability accordion state", () => {
  it("expands, collapses, and changes no document data", () => {
    const state = new AbilityAccordionState();
    expect(state.isExpanded("a")).toBe(false);
    expect(state.toggle("a")).toBe(true);
    expect(state.isExpanded("a")).toBe(true);
    expect(state.toggle("a")).toBe(false);
    expect(state.isExpanded("a")).toBe(false);
  });

  it("retains expansion across view preparation and removes stale Item IDs", () => {
    const state = new AbilityAccordionState();
    state.toggle("a");
    state.toggle("b");
    state.retain(["b", "c"]);
    expect(state.isExpanded("a")).toBe(false);
    expect(state.isExpanded("b")).toBe(true);
  });
});
