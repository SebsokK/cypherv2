import {readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";

const template = readFileSync("templates/item/item-sheet.hbs", "utf8");
const styles = readFileSync("styles/components/_item-rule-sheet.scss", "utf8");
const abilityStart = template.indexOf("{{#if isAbility}}");
const skillStart = template.indexOf("{{#if isSkill}}");
const weaponStart = template.indexOf("{{#if isWeapon}}");
const ability = template.slice(abilityStart, skillStart);
const skill = template.slice(skillStart, weaponStart);

describe("compact Ability Item Sheet", () => {
  it("aligns Cost, scalable metadata, Allowed Pools, and ignores Edge in one responsive row", () => {
    expect(ability).toContain('class="compact-mechanic-field ability-cost-field"');
    expect(ability).toContain('name="system.cost.scalable"');
    expect(ability).toContain('class="compact-mechanic-field ability-pool-field"');
    expect(ability).toContain('class="compact-mechanic-field ability-edge-field"');
    expect(ability).toContain('class="ability-edge-control"><input name="system.cost.ignoresEdge"');
    expect(styles).toContain("grid-template-columns: minmax(5rem, 6rem) minmax(6.5rem, auto) minmax(0, 1fr) minmax(8rem, 10rem)");
    expect(styles).not.toContain(".ability-pool-field {\n    grid-column: span 2");
    expect(styles).toMatch(/\.ability-edge-control\s*\{[\s\S]*?justify-content:\s*center;[\s\S]*?min-height:\s*1\.65rem;\s*\}/);
  });

  it("keeps only payment mechanics above the Description", () => {
    const description = ability.indexOf("compact-rule-description");
    for (const field of [
      "system.cost.amount",
      "system.cost.scalable",
      "system.cost.ignoresEdge"
    ]) expect(ability.indexOf(`name=\"${field}\"`)).toBeLessThan(description);
    expect(ability.indexOf("data-ability-allowed-pool")).toBeLessThan(description);
    expect(ability.indexOf('name="system.activation"')).toBeGreaterThan(description);
    expect(ability.indexOf('name="system.roll"')).toBeGreaterThan(description);
    expect(ability).not.toContain("ability-automation");
    expect(ability).not.toContain("CYPHERV2.Ability.Automation");
  });

  it("retains all runtime fields inside Advanced / Technical", () => {
    const advanced = ability.indexOf("compact-technical-area");
    for (const condition of [
      "showRollModifier",
      "showAttackModifier",
      "showDamage",
      "showWoundSeverity",
      "showRange",
      "showTargetMode"
    ]) expect(ability).toContain(`abilityMechanics.${condition}`);
    for (const field of ["system.activation", "system.roll", "system.rollModifier", "system.damage", "system.targetMode"]) {
      expect(ability.indexOf(`name="${field}"`)).toBeGreaterThan(advanced);
    }
  });

  it("exposes private Genre review classification in Advanced without changing Ability mechanics", () => {
    expect(ability).toContain("{{#if abilityGenreReview}}");
    expect(ability).toContain("genre-ability-review-metadata");
    expect(ability).toContain("abilityGenreReview.catalogLabel");
    expect(ability).toContain("abilityGenreReview.genresLabel");
    expect(ability).toContain("abilityGenreReview.progressionBandLabel");
    expect(ability).toContain("abilityGenreReview.minimumSuperheroRank");
  });

  it("keeps the rich Description large and leaves only technical metadata in Advanced", () => {
    expect(ability).toContain('name="system.description"');
    expect(ability).toContain('elementType="prose-mirror"');
    const advanced = ability.indexOf("compact-technical-area");
    expect(advanced).toBeGreaterThan(ability.indexOf("compact-rule-description"));
    for (const technical of ["system.slug", "system.tier", "system.category", "system.ruleElements.length", "system.grantedBy.instanceId"]) {
      expect(ability.indexOf(technical)).toBeGreaterThan(advanced);
    }
  });
});

describe("compact Skill Item Sheet", () => {
  it("presents Name, Rating, then the rich Description for a simple Skill", () => {
    expect(template).toContain("compact-item-name");
    expect(skill.indexOf('name="system.rank"')).toBeLessThan(skill.indexOf("compact-rule-description"));
    expect(skill).toContain('name="system.description"');
    expect(skill).toContain('elementType="prose-mirror"');
  });

  it("surfaces configured optional mechanics and keeps acquisition metadata in Advanced", () => {
    const description = skill.indexOf("compact-rule-description");
    const advanced = skill.indexOf("compact-technical-area");
    expect(skill).toContain("{{#if skillOptionalMechanics}}");
    expect(skill.indexOf('name="system.defaultPool"')).toBeLessThan(description);
    expect(skill.indexOf('name="system.acquisition.minimumTier"')).toBeGreaterThan(advanced);
    expect(skill.indexOf('name="system.acquisition.grantedByUuid"')).toBeGreaterThan(advanced);
  });

  it("preserves Foundry rich document links through the existing enriched ProseMirror field", () => {
    expect(skill).toContain("{{formInput systemFields.description");
    expect(skill).toContain("value=source.system.description enriched=enriched.description");
    expect(skill).not.toContain('<textarea name="system.description"');
  });
});

describe("compact rule Item Sheet layout", () => {
  it("allocates remaining height to Description and responds without horizontal scrolling", () => {
    expect(styles).toContain("flex: 1 1 auto");
    expect(styles).toContain("min-height: 8rem");
    expect(styles).toContain("overflow-x: hidden");
    expect(styles).toContain("@container cypherv2-rule-item (max-width: 520px)");
  });
});
