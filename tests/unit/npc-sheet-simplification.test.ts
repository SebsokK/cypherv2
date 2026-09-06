import {readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";

import {npcHealthGauge, npcTargetNumber} from "../../src/applications/sheets/npc-sheet-presentation";

const template = readFileSync("templates/actor/npc-sheet.hbs", "utf8");
const sheet = readFileSync("src/applications/sheets/npc-sheet.ts", "utf8");
const model = readFileSync("src/data/actors/npc.ts", "utf8");
const actorBase = readFileSync("src/data/actors/actor-base.ts", "utf8");
const styles = readFileSync("styles/sheets/_sheets.scss", "utf8");

describe("minimal NPC Sheet presentation", () => {
  it("exposes the compact Portrait, Name, Level, derived TN, Armor, Health, and Notes surface", () => {
    expect(template).toContain('class="portrait npc-avatar"');
    for (const field of [
      "name",
      "system.level",
      "system.armor",
      "system.health.value",
      "system.health.baseMax",
      "system.notes"
    ]) expect(template).toContain(`name="${field}"`);
    expect(template.match(/elementType="prose-mirror"/g)).toHaveLength(1);
    expect(template).not.toContain('data-tab="');
  });

  it("keeps legacy mechanical Armor, Damage, Combat, Movement, Modifications, and Description out of the normal UI", () => {
    for (const absent of [
      "npc-combat-panel",
      "npc-modifications-panel",
      "createModification",
      "editModification",
      "deleteModification",
      "requestDefense",
      "system.damage.amount",
      "system.armorBase",
      "system.damage.woundSeverity",
      "system.damage.defense.allowDodge",
      "system.damage.defense.allowBlock",
      "system.movement.category",
      "system.movement.distance",
      'name="system.description"'
    ]) expect(template).not.toContain(absent);
  });

  it("derives a read-only TN from Level without persisting redundant data", () => {
    expect(npcTargetNumber(1)).toBe(3);
    expect(npcTargetNumber(4)).toBe(12);
    expect(npcTargetNumber(7)).toBe(21);
    expect(npcTargetNumber(10)).toBe(30);
    expect(npcTargetNumber("")).toBeNull();
    expect(npcTargetNumber("invalid")).toBeNull();
    expect(template).toContain('<output class="npc-tn-value"');
    expect(template).toContain("({{targetNumber}})</output>");
    expect(template).not.toContain('class="npc-tn-label"');
    expect(template).not.toContain('class="npc-tn-input"');
    expect(template).not.toContain('name="system.targetNumber"');
    expect(model).not.toContain("targetNumber:");
    expect(sheet).toContain('targetNumber: npcTargetNumber(npcSystem.level) ?? "—"');
  });

  it("persists informational Armor independently of legacy combat Armor", () => {
    expect(model).toContain("armor: integerField()");
    expect(template).toContain('name="system.armor" type="number"');
    expect(template).toContain('class="npc-armor-input"');
    expect(template).toContain('min="0"');
    expect(styles).toContain("width: 2.65rem");
  });

  it("does not route informational Armor through NPC damage or combat calculations", () => {
    const combat = readFileSync("src/services/combat-service.ts", "utf8");
    expect(combat).not.toMatch(/system\.armor(?!Base)/);
    expect(combat).toContain("system.armorBase");
  });

  it("uses persisted raw Notes and enriched read-mode Notes through native Application V2 ProseMirror", () => {
    expect(template).toContain('formInput systemFields.notes name="system.notes" value=source.system.notes enriched=enriched.notes');
    expect(template).toContain('elementType="prose-mirror" toggled=true disabled=(not editable) documentUUID=actor.uuid');
    expect(sheet).toContain("const sourceNotes = typeof sourceSystem?.notes === \"string\"");
    expect(sheet).toContain("TextEditor.implementation.enrichHTML(sourceNotes");
    expect(sheet).toContain("relativeTo: this.actor");
    expect(sheet).not.toContain("TextEditor.implementation.create");
  });

  it("retains every legacy NPC field and compatibility action without exposing its editor", () => {
    expect(actorBase).toContain("description: new fields.HTMLField");
    expect(actorBase).toContain("notes: new fields.HTMLField");
    for (const field of ["armor", "armorBase", "damage", "woundSeverity", "allowBlock", "allowDodge", "movement", "modifications"]) {
      expect(model).toContain(field);
    }
    for (const action of ["requestDefense", "createModification", "editModification", "deleteModification"]) {
      expect(sheet).toContain(action);
    }
  });

  it("reuses the Character Header clamped ratio and assigns semantic Health states", () => {
    expect(npcHealthGauge(13, 13)).toMatchObject({current: 13, max: 13, ratio: 1, state: "healthy"});
    expect(npcHealthGauge(6, 12)).toMatchObject({ratio: 0.5, state: "intermediate"});
    expect(npcHealthGauge(3, 12)).toMatchObject({ratio: 0.25, state: "low"});
    expect(npcHealthGauge(20, 10)).toMatchObject({current: 10, ratio: 1});
    expect(template).toContain("--cypherv2-npc-health-ratio: {{healthGauge.ratio}}");
    expect(styles).toContain("width: calc(var(--cypherv2-npc-health-ratio) * 100%)");
    expect(styles).toContain("--cypherv2-npc-health-color: var(--cypherv2-success)");
    expect(styles).toContain("--cypherv2-npc-health-color: var(--cypherv2-color-warning)");
    expect(styles).toContain("--cypherv2-npc-health-color: var(--cypherv2-danger)");
  });

  it("keeps editable controls permission-aware and gives Notes the dominant responsive row", () => {
    expect(template).toContain('{{#if editable}}data-action="editImage"');
    expect(template).toContain('{{#unless editable}}readonly{{/unless}}');
    expect(template.match(/\{\{#unless editable\}\}disabled\{\{\/unless\}\}/g)).toHaveLength(4);
    expect(styles).toContain("display: flex");
    expect(styles).toContain("flex: 1 1 auto");
    expect(styles).toContain(".npc-health-row");
    expect(styles).not.toContain(".npc-health-card");
    expect(styles).toContain("container-name: cypherv2-npc-sheet");
    expect(styles).toContain("@container cypherv2-npc-sheet (max-width: 30rem)");
    expect(styles).toContain("@container cypherv2-npc-sheet (max-width: 23rem)");
  });

  it("aligns Level and current Health through the same stable stat-line grid", () => {
    expect(template).toContain('class="npc-level-field npc-stat-line"');
    expect(template).toContain('class="npc-health-field npc-stat-line"');
    expect(styles).toContain("grid-template-columns: 3.5rem 3rem 0.55rem 3rem");
    expect(styles).toContain("grid-column: 4");
    expect(styles).toContain("justify-self: center");
  });
});
