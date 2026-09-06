import {readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";

const common = readFileSync("src/applications/dialogs/roll-dialog.ts", "utf8");
const generic = readFileSync("src/applications/dialogs/test-roll-dialog.ts", "utf8");
const skill = readFileSync("src/applications/dialogs/skill-roll-dialog.ts", "utf8");
const combat = readFileSync("src/applications/dialogs/combat-dialogs.ts", "utf8");
const ability = readFileSync("src/applications/dialogs/ability-use-dialog.ts", "utf8");
const styles = readFileSync("styles/sheets/_sheets.scss", "utf8");

describe("All-in-One Roll Dialog UI", () => {
  it("uses one live Summary component for generic, Skill, Combat and Ability rolls", () => {
    for (const source of [generic, skill, combat, ability]) {
      expect(source).toContain("rollDialogShell(");
      expect(source).toContain("bindRollDialogPreview(");
    }
    expect(common).toContain("game.cypherv2.services.rolls.preview(");
    expect(common).not.toContain("prepareRoll(");
    expect(common).not.toContain("calculatePoolCost(");
  });

  it("never detaches Foundry localization methods in the shared Roll Dialog path", () => {
    const detachedMethod = /(?:const\s+\w+\s*=\s*game\.i18n\.(?:localize|format)\b(?!\s*\()|const\s*\{[^}]*\b(?:localize|format)\b[^}]*\}\s*=\s*game\.i18n\b|[,(]\s*game\.i18n\.(?:localize|format)\s*[,)]\s*)/;
    for (const source of [common, generic, skill, combat, ability]) {
      expect(source).not.toMatch(detachedMethod);
    }
  });

  it("prefills Pool entry points and the current Skill rank", () => {
    expect(generic).toContain("poolOptions(selectedPool)");
    expect(skill).toContain('rank === skill.system.rank ? " selected"');
    expect(skill).toContain("rankOverride: selectedRank");
    expect(combat).toContain("services.combat.weaponAttackPool(weapon)");
    expect(combat).toContain('pool: rollDialogText(data, "pool")');
    expect(combat).toContain('name="pool"');
    expect(combat).toContain('skillRankSteps(weapon.system.skillLevel ?? "untrained")');
    expect(combat).toContain("skillOptions(actor, defaultSkillValue)");
    expect(combat).not.toContain("applicableWeaponSkills(");
    expect(combat).toContain('pool: dodge ? "speed" : "might"');
    expect(ability).toContain("abilityAllowedPools(ability)");
  });

  it("keeps universal manual Skill and situational controls available", () => {
    expect(common).toContain("skillRankOptions");
    expect(common).toContain('name="situationalDirection"');
    expect(common).toContain('name="situationalSteps"');
    expect(combat).toContain("manualSkillSteps(data)");
    expect(ability).toContain("manualSkillSteps(data)");
  });

  it("shows Damage Effort and Free Damage Effort only for Weapon or attack Ability rolls", () => {
    expect(generic).not.toContain('name="damageEffort"');
    expect(generic).not.toContain('name="freeDamageEffort"');
    expect(skill).not.toContain('name="damageEffort"');
    expect(skill).not.toContain('name="freeDamageEffort"');
    expect(combat).toContain('name="damageEffort"');
    expect(combat.match(/name="freeDamageEffort"/g)).toHaveLength(1);
    expect(ability).toContain('ability.system.roll === "attack" ? `<label>');
    expect(ability.match(/name="freeDamageEffort"/g)).toHaveLength(1);
  });

  it("renders the Effort summary from PreparedRoll values and the authoritative cap", () => {
    expect(common).toContain('data-roll-summary-section="effort"');
    expect(common).toContain('`${view.paidEffortApplied} / ${view.effortMaximum}`');
    expect(common).toContain('`${view.totalEffortApplied} / ${view.totalEffortMaximum}`');
    expect(common).toContain('String(view.freeEffortApplied)');
    expect(common).toContain("prepared.totalEffortMaximum");
    expect(common).not.toContain("totalEffortMaximum: 6");
    expect(common).not.toContain("freeDamageEffortCostReduction");
    expect(combat).toContain("prepared.damageEffortApplied");
    expect(ability).toContain("prepared.damageEffortApplied");
    expect(combat).not.toContain("CORE_TOTAL_EFFORT_CAP");
    expect(ability).not.toContain("CORE_TOTAL_EFFORT_CAP");
    expect(combat).toContain('name="freeDamageEffort" type="number"');
    expect(ability).toContain('name="freeDamageEffort" type="number"');
  });

  it("protects hidden difficulty in the player view model", () => {
    expect(common).toContain('prepared.context.difficulty.mode === "hidden"');
    expect(common).toContain('baseDifficulty: known ? prepared.context.difficulty.value : null');
    expect(common).toContain('finalDifficulty: known ? prepared.finalDifficulty : null');
    expect(common).toContain('targetNumber: known ? prepared.targetNumber : null');
    expect(common).toContain('entry.id.startsWith("npc-modification.")');
  });

  it("uses responsive structural classes and only semantic Theme tokens", () => {
    expect(styles).toContain("container-type: inline-size");
    expect(styles).toContain("@container (max-width: 42rem)");
    expect(styles).toContain("grid-template-columns: minmax(0, 1.05fr) minmax(18rem, 0.95fr)");
    expect(styles).toContain("var(--cypherv2-surface-primary)");
    expect(styles).toContain("var(--cypherv2-surface-raised)");
    expect(styles).toContain("var(--cypherv2-text-primary)");
    expect(styles).toContain("var(--cypherv2-text-muted)");
    expect(styles).toContain("var(--cypherv2-accent)");
    expect(styles).toContain("var(--cypherv2-success)");
    expect(styles).toContain("var(--cypherv2-danger)");
  });
});
