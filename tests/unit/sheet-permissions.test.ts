import {readFileSync} from "node:fs";
import {describe, expect, it, vi} from "vitest";

import {guardEditableActions} from "../../src/applications/sheets/sheet-permissions";

describe("ApplicationV2 sheet mutation permissions", () => {
  it("allows GM/OWNER editable actions and independently rejects OBSERVER actions", async () => {
    const mutate = vi.fn(async () => "changed");
    const inspect = vi.fn(async () => "opened");
    const actions = guardEditableActions({mutate, inspect}, new Set(["mutate"]));

    await actions.mutate.call({isEditable: true}); // GM/OWNER presentation authority.
    await actions.mutate.call({isEditable: true});
    await actions.mutate.call({isEditable: false}); // OBSERVER/read-only.
    await actions.inspect.call({isEditable: false});

    expect(mutate).toHaveBeenCalledTimes(2);
    expect(inspect).toHaveBeenCalledTimes(1);
  });

  it("gates representative NPC mutations in both template and registered handlers", () => {
    const template = readFileSync("templates/actor/npc-sheet.hbs", "utf8");
    const source = readFileSync("src/applications/sheets/npc-sheet.ts", "utf8");
    for (const field of ["system.level", "system.health.value", "system.health.baseMax"]) {
      expect(template).toMatch(new RegExp(`name="${field.replaceAll(".", "\\.")}"[^>]*\\{\\{#unless editable\\}\\}disabled`));
    }
    expect(template).toContain('disabled=(not editable)');
    expect(source).toContain("guardEditableActions({");
    expect(source).toContain("requestDefense: NpcSheet.#onRequestDefense");
    expect(source).toContain("createModification: NpcSheet.#onCreateModification");
    expect(source).toContain("enforceReadOnlySheetPresentation(this.element, this.isEditable");
  });

  it("uses the same read-only presentation and guarded action boundary for Character and Item sheets", () => {
    for (const path of [
      "src/applications/sheets/character-sheet.ts",
      "src/applications/sheets/item-sheet.ts"
    ]) {
      const source = readFileSync(path, "utf8");
      expect(source).toContain("guardEditableActions({");
      expect(source).toContain("enforceReadOnlySheetPresentation(this.element, this.isEditable");
    }
    const character = readFileSync("src/applications/sheets/character-sheet.ts", "utf8");
    expect(character).toContain('"payAbilityCost"');
    expect(character).toContain('"toggleAbilityArchived"');
    expect(character).toContain("canPay: this.isEditable && presentation.cost.payable");
  });
});
