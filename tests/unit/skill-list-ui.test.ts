import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {describe, expect, it} from "vitest";

const root = resolve(import.meta.dirname, "../..");
const template = readFileSync(resolve(root, "templates/actor/character-sheet.hbs"), "utf8");
const sheet = readFileSync(resolve(root, "src/applications/sheets/character-sheet.ts"), "utf8");
const styles = readFileSync(resolve(root, "styles/components/_skill-list.scss"), "utf8");
const skillsStart = template.indexOf('data-tab="skills"');
const skillsEnd = template.indexOf('data-tab="abilities"');
const skills = template.slice(skillsStart, skillsEnd);
const skillsControls = skills.slice(skills.indexOf('<header class="skills-header">'), skills.indexOf('<ol class="compact-skill-list">'));

describe("Skills UI V1", () => {
  it("renders dense rows without a table header or a separate Roll button", () => {
    expect(skills).toContain("compact-skill-list");
    expect(skills).toContain("compact-skill-row");
    expect(skills).not.toContain("skill-list-header");
    expect(skills).not.toContain("CYPHERV2.Roll.Roll");
    expect(skills).not.toContain("skill.poolLabel");
    expect(styles).toContain("min-height: 1.65rem");
    expect(styles).toContain("padding: 0.08rem 0.25rem");
    expect(styles).not.toContain("border-bottom");
  });

  it("uses a responsive two-column grid with a one-column narrow fallback", () => {
    expect(styles).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
    expect(styles).toContain("gap: 0.08rem 0.8rem");
    expect(styles).toContain("@container cypherv2-character-sheet (max-width: 640px)");
    expect(styles).toContain("grid-template-columns: minmax(0, 1fr)");
    expect(styles).toContain("grid-template-columns: minmax(0, 1fr) 5.2rem 4.15rem");
  });

  it("uses the Skill name as the native keyboard-accessible roll action", () => {
    expect(skills).toContain('class="compact-skill-roll cypherv2-primary-action"');
    expect(skills).toContain('data-action="rollSkill"');
    expect(skills).toContain("{{skill.name}}");
    expect(skills).not.toContain('role="button"');
  });

  it("keeps compact icon-only Edit/Delete controls and compact Add Skill", () => {
    expect(skills).toContain('data-action="createSkill"');
    expect(skills).toContain("CYPHERV2.Skill.Add");
    expect(skills).toContain('data-action="editSkill"');
    expect(skills).toContain('fa-solid fa-pen');
    expect(skills).toContain('data-action="deleteSkill"');
    expect(skills).toContain('fa-solid fa-trash');
    expect(skills).not.toContain(">{{localize \"CYPHERV2.Actions.Edit\"}}</button>");
    expect(skills).not.toContain(">{{localize \"CYPHERV2.Actions.Delete\"}}</button>");
    expect(skillsControls).not.toContain("<h2>");
    expect(styles).toContain("justify-content: flex-end");
  });

  it("separates immediate Quick Roll from the compact configured Roll action", () => {
    expect(skills).toContain('data-action="rollSkill"');
    expect(skills).toContain('data-action="configureSkillRoll"');
    expect(skills).toContain("CYPHERV2.Skill.ConfigureRoll");
    expect(skills).toContain("fa-solid fa-sliders");
    expect(sheet).toContain("buildQuickRollRequest(");
    expect(sheet).toContain("publishRollOutcome(");
    const quickStart = sheet.indexOf("static async #onRollSkill");
    const quickEnd = sheet.indexOf("static async #onConfigureSkillRoll", quickStart);
    const quick = sheet.slice(quickStart, quickEnd);
    expect(quick).not.toContain("promptSkillRoll(");
    expect(quick).toContain("pulseSkillQuickRoll(target)");
    const configureStart = sheet.indexOf("static async #onConfigureSkillRoll");
    const configureEnd = sheet.indexOf("static async #onResetHeaderAppearance", configureStart);
    const configure = sheet.slice(configureStart, configureEnd);
    expect(configure).toContain("event.stopPropagation()");
    expect(configure).toContain("promptSkillRoll(");
    expect(configure).not.toContain("buildQuickRollRequest(");
    expect(configure).not.toContain("pulseSkillQuickRoll(");
  });

  it("removes mouse-only native focus while retaining a Cypher keyboard focus indicator", () => {
    expect(styles).toContain("&:focus:not(:focus-visible)");
    expect(styles).toContain("outline: none");
    expect(styles).toContain("&:focus-visible");
    expect(styles).toContain("outline: 1px solid var(--cypherv2-accent-hover)");
  });

  it("uses a transient one-shot Quick Roll pulse without persistent state", () => {
    expect(styles).toContain("&.is-quick-roll-pulse");
    expect(styles).toContain("animation: cypherv2-skill-quick-roll-pulse 200ms ease-out");
    expect(sheet).toContain('target.classList.add(SKILL_QUICK_ROLL_PULSE_CLASS)');
    expect(sheet).toContain('target.addEventListener("animationend"');
    expect(sheet).toContain('target.classList.remove(SKILL_QUICK_ROLL_PULSE_CLASS)');
  });

  it("uses only a transient hover/focus surface and subtle left indicator", () => {
    expect(styles).toContain("background: var(--cypherv2-surface-raised)");
    expect(styles).toContain("box-shadow: inset 2px 0 var(--cypherv2-accent)");
    expect(styles).toContain("border: 0");
  });

  it("offers session-local A–Z and Rank display preferences without Item updates", () => {
    expect(skills).toContain('data-action="setSkillSort"');
    expect(skills).toContain('data-sort-mode="name"');
    expect(skills).toContain('data-sort-mode="rank"');
    expect(skills).toContain('aria-pressed="{{skillSort.nameActive}}"');
    expect(sheet).toContain('#skillSortMode: SkillSortMode = "name"');
    expect(sheet).toContain("sortSkillList(");
    const handlerStart = sheet.indexOf("static #onSetSkillSort");
    const handlerEnd = sheet.indexOf("static async #onRollSkill", handlerStart);
    expect(sheet.slice(handlerStart, handlerEnd)).not.toContain("actor.update");
  });

  it("applies only semantic Theme rank colors", () => {
    for (const rank of ["expert", "specialized", "trained", "untrained", "inability"]) {
      expect(skills).toContain(`is-{{skill.rank}}`);
      expect(styles).toContain(`&.is-${rank}`);
      expect(styles).toContain(`var(--cypherv2-rank-${rank})`);
    }
    expect(styles).not.toMatch(/#[0-9a-f]{3,8}/i);
  });
});
