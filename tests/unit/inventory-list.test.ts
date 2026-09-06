import {describe, expect, it} from "vitest";
import {
  InventoryAccordionState,
  inventoryItemPresentation,
  isInventoryItemType
} from "../../src/applications/sheets/inventory-list";

describe("Inventory list presentation", () => {
  it("presents Equipment quantity without inventing Level or Depletion", () => {
    expect(inventoryItemPresentation({
      id: "rope",
      name: "Rope",
      type: "equipment",
      system: {quantity: 3, equipped: true, description: "<p>Strong rope.</p>"}
    })).toEqual({
      id: "rope",
      name: "Rope",
      type: "equipment",
      level: null,
      levelRollable: false,
      power: null,
      quantity: 3,
      equipped: true,
      description: "<p>Strong rope.</p>",
      depleted: false,
      usable: true,
      depletion: null
    });
  });

  it("presents Cypher Level and structured Artifact Depletion", () => {
    expect(inventoryItemPresentation({
      id: "cypher",
      name: "Curiosity",
      type: "cypher",
      system: {level: 4}
    })).toMatchObject({type: "cypher", level: 4, quantity: null, depletion: null});
    expect(inventoryItemPresentation({
      id: "artifact",
      name: "The Boneturner's Tale",
      type: "artifact",
      system: {level: 6, depletion: {enabled: true, die: "d10", threshold: 1}}
    })).toMatchObject({
      type: "artifact",
      level: "6",
      depletion: {enabled: true, formula: "1d10", threshold: 1}
    });
  });

  it("only accepts the three Inventory section Item types", () => {
    for (const type of ["equipment", "cypher", "artifact"]) expect(isInventoryItemType(type)).toBe(true);
    expect(isInventoryItemType("weapon")).toBe(false);
    expect(inventoryItemPresentation({id: "skill", name: "Skill", type: "skill", system: {}})).toBeNull();
  });
});

describe("Inventory accordion display state", () => {
  it("expands and collapses without persisting Item data", () => {
    const state = new InventoryAccordionState();
    expect(state.toggle("cypher-a")).toBe(true);
    expect(state.isExpanded("cypher-a")).toBe(true);
    expect(state.toggle("cypher-a")).toBe(false);
    expect(state.isExpanded("cypher-a")).toBe(false);
  });

  it("drops stale expanded IDs when embedded Items disappear", () => {
    const state = new InventoryAccordionState();
    state.toggle("keep");
    state.toggle("remove");
    state.retain(["keep"]);
    expect(state.isExpanded("keep")).toBe(true);
    expect(state.isExpanded("remove")).toBe(false);
  });
});
