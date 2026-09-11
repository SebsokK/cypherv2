import {readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";

import {migrateCharacterSystemData} from "../../src/data/actors/character-migration";
import {
  POWER_SHIFT_CATEGORIES,
  availablePowerShifts,
  deletePowerShiftAllocation,
  effectivePowerShiftAllocations,
  legacyTypePowerShiftAllocations,
  normalizePowerShiftAllocations,
  powerShiftSummary,
  savePowerShiftAllocation,
  type PowerShiftAllocation,
  type PowerShiftTypeLike
} from "../../src/packages/power-shifts";

function superheroType(
  id: string,
  count: number,
  powerShifts: readonly string[] = []
): PowerShiftTypeLike {
  return {
    id,
    name: `Type ${id}`,
    type: "characterType",
    system: {
      superhero: {powerShiftCount: count},
      instance: {instanceId: `instance-${id}`, selections: {powerShifts}}
    }
  };
}

const accuracy: PowerShiftAllocation = {
  id: "shift-accuracy",
  category: "Accuracy",
  shifts: 1,
  specification: "",
  description: "Applies when the player decides it is relevant."
};

describe("Character-owned optional Power Shifts", () => {
  it("defaults the optional Character presentation toggle OFF and allocations empty", () => {
    const migrated = migrateCharacterSystemData({}) as {
      presentation: {powerShiftsEnabled: boolean};
      powerShifts: unknown[];
    };
    expect(migrated.presentation.powerShiftsEnabled).toBe(false);
    expect(migrated.powerShifts).toEqual([]);
  });

  it("keeps the standard categories as suggestions while allowing Custom data", () => {
    expect(POWER_SHIFT_CATEGORIES).toContain("Accuracy");
    expect(POWER_SHIFT_CATEGORIES).toContain("Single Attack");
    expect(POWER_SHIFT_CATEGORIES).toContain("Savant");
    expect(POWER_SHIFT_CATEGORIES).toContain("Custom");
    expect(normalizePowerShiftAllocations([{
      id: "custom", category: "Cosmic Luck", shifts: 2,
      specification: "Lucky breaks", description: "Player-facing guide text."
    }])).toEqual([{
      id: "custom", category: "Cosmic Luck", shifts: 2,
      specification: "Lucky breaks", description: "Player-facing guide text."
    }]);
  });

  it("adds, edits, and deletes stable structured allocations", () => {
    const added = savePowerShiftAllocation([], {
      category: "Power", shifts: 2, specification: "Eye Lasers", description: "Damage guide"
    }, () => "stable-shift-id");
    expect(added).toEqual([{
      id: "stable-shift-id", category: "Power", shifts: 2,
      specification: "Eye Lasers", description: "Damage guide"
    }]);
    const edited = savePowerShiftAllocation(added, {
      ...added[0]!, shifts: 3, description: "Updated guide"
    }, () => "unused-id");
    expect(edited).toEqual([{
      id: "stable-shift-id", category: "Power", shifts: 3,
      specification: "Eye Lasers", description: "Updated guide"
    }]);
    expect(deletePowerShiftAllocation(edited, "stable-shift-id")).toEqual([]);
  });

  it("derives the available budget from attached Types and preserves allocations across replacement/removal", () => {
    expect(availablePowerShifts([superheroType("hero", 4)])).toBe(4);
    expect(availablePowerShifts([superheroType("hero-a", 2), superheroType("hero-b", 3)])).toBe(5);
    expect(availablePowerShifts([])).toBe(0);
    expect(effectivePowerShiftAllocations([accuracy], [superheroType("replacement", 2)])).toEqual([accuracy]);
    expect(effectivePowerShiftAllocations([accuracy], [])).toEqual([accuracy]);
  });

  it("warns without clamping or deleting over-budget and over-category allocations", () => {
    const allocations = [
      {...accuracy, shifts: 2},
      {id: "shift-accuracy-2", category: "accuracy", shifts: 2, specification: "Ranged", description: ""}
    ];
    const summary = powerShiftSummary(allocations, 3);
    expect(summary).toMatchObject({allocated: 4, available: 3, overBudget: true});
    expect(summary.categoryWarnings.has("accuracy")).toBe(true);
    expect(allocations.map((entry) => entry.shifts)).toEqual([2, 2]);
  });

  it("conservatively exposes unreleased free-text Type slots and migrates on first Character edit", () => {
    const types = [superheroType("legacy", 3, ["Strength", "Flight", ""])];
    const legacy = legacyTypePowerShiftAllocations(types);
    expect(legacy).toEqual([
      {id: "legacy-instance-legacy-0", category: "Custom", shifts: 1, specification: "Strength", description: ""},
      {id: "legacy-instance-legacy-1", category: "Custom", shifts: 1, specification: "Flight", description: ""}
    ]);
    const saved = savePowerShiftAllocation(effectivePowerShiftAllocations([], types), {
      category: "Accuracy", shifts: 1, specification: "", description: ""
    }, () => "new-shift");
    expect(saved.map((entry) => entry.id)).toEqual([
      "legacy-instance-legacy-0", "legacy-instance-legacy-1", "new-shift"
    ]);
  });

  it("normalizes legacy Character data without expanding unrelated partial updates", () => {
    expect(migrateCharacterSystemData({xp: 2}, {partial: true})).toEqual({xp: 2});
    expect(migrateCharacterSystemData({
      presentation: {powerShiftsEnabled: true},
      powerShifts: [{id: "kept", category: "Flight", shifts: 1, label: "Fast", description: ""}]
    }, {partial: true})).toEqual({
      presentation: {powerShiftsEnabled: true},
      powerShifts: [{id: "kept", category: "Flight", shifts: 1, specification: "Fast", description: ""}]
    });
  });
});

describe("Power Shift UI remains guide-only", () => {
  const characterTemplate = readFileSync("templates/actor/character-sheet.hbs", "utf8");
  const characterSheet = readFileSync("src/applications/sheets/character-sheet.ts", "utf8");
  const powerShiftStyles = readFileSync("styles/components/_power-shifts.scss", "utf8");
  const abilityStyles = readFileSync("styles/components/_ability-list.scss", "utf8");
  const rollDialog = readFileSync("src/applications/dialogs/roll-dialog.ts", "utf8");
  const rollService = readFileSync("src/services/roll-service.ts", "utf8");
  const abilityService = readFileSync("src/services/ability-service.ts", "utf8");

  it("shows the section only behind the Character toggle and exposes compact CRUD actions", () => {
    expect(characterTemplate).toContain('name="system.presentation.powerShiftsEnabled"');
    expect(characterTemplate).toContain("{{#if powerShifts.enabled}}");
    expect(characterTemplate).toContain('class="character-power-shifts');
    expect(characterTemplate).toContain('data-action="addPowerShift"');
    expect(characterTemplate).toContain('data-action="editPowerShift"');
    expect(characterTemplate).toContain('data-action="deletePowerShift"');
    expect(characterSheet).toContain("availablePowerShifts(typeDocuments");
    expect(characterSheet).toContain("powerShiftBudget.categoryWarnings");
  });

  it("renders optional Power Shifts above the Skills controls and never in Abilities", () => {
    const skillsStart = characterTemplate.indexOf('data-tab="skills"');
    const abilitiesStart = characterTemplate.indexOf('data-tab="abilities"');
    const inventoryStart = characterTemplate.indexOf('data-tab="inventory"');
    const skillsTab = characterTemplate.slice(skillsStart, abilitiesStart);
    const abilitiesTab = characterTemplate.slice(abilitiesStart, inventoryStart);

    expect(skillsStart).toBeGreaterThan(-1);
    expect(abilitiesStart).toBeGreaterThan(skillsStart);
    expect(skillsTab).toContain("{{#if powerShifts.enabled}}");
    expect(skillsTab).toContain('class="character-power-shifts');
    expect(skillsTab.indexOf('class="character-power-shifts')).toBeLessThan(skillsTab.indexOf('class="skills-sort'));
    expect(skillsTab.indexOf('class="character-power-shifts')).toBeLessThan(skillsTab.indexOf('class="compact-skill-list'));
    expect(abilitiesTab).not.toContain("powerShifts");
    expect(abilitiesTab).not.toContain("character-power-shifts");
  });

  it("keeps its compact panel, header, row, and action presentation outside the Abilities scope", () => {
    expect(powerShiftStyles).toContain(".cypherv2 .character-power-shifts");
    expect(powerShiftStyles).toContain("border: 1px solid");
    expect(powerShiftStyles).toContain("font-size: 0.72rem");
    expect(powerShiftStyles).toContain("text-transform: uppercase");
    expect(powerShiftStyles).toContain(".power-shift-row");
    expect(powerShiftStyles).toContain(".power-shift-actions");
    expect(abilityStyles).not.toContain("character-power-shifts");
    expect(characterTemplate).toContain('class="compact-inline-action" data-action="addPowerShift"');
    expect(characterTemplate).toContain('class="power-shift-row');
    expect(characterTemplate).toContain('class="power-shift-actions"');
  });

  it("does not add Power Shift automation or reminders to rolls, damage, or the Roll Dialog", () => {
    for (const source of [rollDialog, rollService, abilityService]) {
      expect(source).not.toMatch(/power\s*shifts?/i);
    }
  });
});
