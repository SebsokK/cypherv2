import {readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";

const template = readFileSync("templates/actor/character-sheet.hbs", "utf8");
const source = readFileSync("src/applications/sheets/character-sheet.ts", "utf8");
const styles = readFileSync("styles/components/_inventory-list.scss", "utf8");
const localization = JSON.parse(readFileSync("lang/en.json", "utf8")) as Record<string, string>;
const defenseRequest = readFileSync("templates/chat/defense-request-card.hbs", "utf8");
const dialogs = readFileSync("src/applications/dialogs/combat-dialogs.ts", "utf8");
const combatService = readFileSync("src/services/combat-service.ts", "utf8");

const combatStart = template.indexOf('data-tab="combat"');
const combatEnd = template.indexOf('data-tab="foci"', combatStart);
const combat = template.slice(combatStart, combatEnd);

describe("Combat Tab UI V1", () => {
  it("renders the manual Defense bar above Attacks with Dodge and Block only", () => {
    const defense = combat.indexOf('data-combat-section="defense"');
    const attacks = combat.indexOf('data-combat-section="attacks"');
    expect(defense).toBeGreaterThan(-1);
    expect(defense).toBeLessThan(attacks);
    const bar = combat.slice(defense, attacks);
    expect(bar.match(/data-action="(?:dodge|block)"/g)).toHaveLength(2);
    expect(bar).toContain('data-action="dodge"');
    expect(bar).toContain('data-action="block"');
    expect(bar).toMatch(/data-action="dodge"[^>]*>[\s\S]*?fa-person-running[\s\S]*?CYPHERV2\.Combat\.Defense\.dodge[\s\S]*?CYPHERV2\.Pools\.Speed/);
    expect(bar).toMatch(/data-action="block"[^>]*>[\s\S]*?fa-shield-halved[\s\S]*?CYPHERV2\.Combat\.Defense\.block[\s\S]*?CYPHERV2\.Pools\.Might/);
    expect(bar).not.toContain("blockWithShield");
    expect(source).toMatch(/#onDodge[\s\S]*?promptDefenseRoll\(this\.actor[\s\S]*?, "dodge"\)/);
    expect(source).toMatch(/#onBlock[\s\S]*?promptDefenseRoll\(this\.actor[\s\S]*?, "block"\)/);
    expect(combatService).toContain('const pool: PoolKey = defenseType === "dodge" ? "speed" : "might";');
    expect(dialogs).toContain("buildDefenseRequest(actor, defenseType");
    expect(dialogs).toContain("situationalModifierFields()");
    expect(dialogs).toContain("...situationalModifier(data)");
  });

  it("does not alter the targeted request workflow or its Block With Shield choice", () => {
    expect(defenseRequest).toContain('data-defense="dodge"');
    expect(defenseRequest).toContain('data-defense="block"');
    expect(defenseRequest).toContain('data-defense="blockWithShield"');
    expect(dialogs).toContain("buildDefenseAgainstNpcRequest(");
    expect(dialogs).toContain("resolveDefenseWound(");
  });

  it("renders only compact Attacks, Shields, and Armor groups without Damage & Recovery", () => {
    for (const section of ["attacks", "shields", "armor"]) {
      expect(combat).toContain(`data-combat-section="${section}"`);
    }
    expect(combat).toContain('localize "CYPHERV2.Combat.Attacks"');
    expect(combat).not.toContain('localize "CYPHERV2.Combat.Weapons"');
    expect(combat).not.toContain("Damage & Recovery");
    expect(combat).not.toContain('class="combat-list-header"');
  });

  it("makes the whole Weapon row invoke the existing targeted Weapon workflow", () => {
    expect(combat).toContain('class="compact-inventory-row compact-combat-row combat-weapon-row" data-action="attackWeapon"');
    expect(combat).toContain('class="inventory-item-name combat-attack-name cypherv2-primary-action" data-action="attackWeapon"');
    expect(source).toContain("await promptWeaponAttack(");
    expect(source).toMatch(/#onAttackWeapon[\s\S]*?event\.preventDefault\(\);[\s\S]*?event\.stopPropagation\(\);/);
    expect(dialogs).toContain("buildWeaponAttackPlan(actor, weapon, buildOptions(data))");
    expect(dialogs).toContain("bindRollDialogPreview(dialog.element");
    expect(dialogs.indexOf("if (!data) return;")).toBeLessThan(dialogs.indexOf("executeWeaponAttack("));
    expect(dialogs).not.toMatch(/if \(!data\) return;[\s\S]*?weapon\.update\(/);
  });

  it("keeps expand, Chat, Edit, and Delete independent from Attack", () => {
    expect(combat).toContain('data-action="toggleCombatDetails"');
    expect(combat.match(/data-action="sendItemToChat"/g)).toHaveLength(3);
    expect(combat).toContain('data-action="editCombatItem"');
    expect(combat).toContain('data-action="deleteCombatItem"');
    expect(source).toMatch(/#onToggleCombatDetails[\s\S]*?event\.stopPropagation\(\);/);
    expect(source).toMatch(/#onEditCombatItem[\s\S]*?event\.stopPropagation\(\);/);
    expect(source).toMatch(/#onDeleteCombatItem[\s\S]*?event\.stopPropagation\(\);/);
    expect(combat).toContain('data-action="rollCombatDepletion"');
    expect(source).toMatch(/#onRollCombatDepletion[\s\S]*?event\.stopPropagation\(\);/);
    expect(dialogs).not.toContain("services.depletionChat.publish(weapon, depletion)");
  });

  it("renders compact conditional Weapon category, Damage, Ammunition, and Depletion metadata", () => {
    expect(combat).toMatch(/weapon\.name[\s\S]*?\(\{\{weapon\.category\}\}\)/);
    expect(combat).toMatch(/weapon\.ammoEnabled[\s\S]*?weapon\.ammoLabel[\s\S]*?weapon\.depletionEnabled[\s\S]*?weapon\.depletionLabel[\s\S]*?weapon\.damage/);
    expect(source).toContain("depletionLabel(weapon.system.depletion)");
    expect(source).toContain('`${weapon.system.ammo.value} / ${weapon.system.ammo.max}`');
    expect(combat).toMatch(/combat-ammo-column[\s\S]*?combat-depletion-column[\s\S]*?combat-damage-column[\s\S]*?combat-item-actions/);
    expect(combat).toMatch(/weapon\.ammoLabel[\s\S]*?data-action="reloadWeapon"/);
    expect(source).toMatch(/#onReloadWeapon[\s\S]*?event\.stopPropagation\(\);[\s\S]*?services\.weapons\.reload/);
    expect(styles).toContain('grid-template-areas: "identity secondary ammo depletion status actions"');
    expect(styles).toContain("grid-template-columns: var(--combat-grid-columns)");
    expect(combat).toContain("weapon.depleted");
    expect(combat).toContain('localize "CYPHERV2.Depletion.Depleted"');
  });

  it("blocks only the Attack action when ammunition is insufficient", () => {
    expect(combat).toMatch(/combat-attack-name[\s\S]*?#unless weapon\.canAttack[\s\S]*?disabled/);
    expect(source).toContain("services.weapons.ammunition(");
    expect(source).toContain("if (!ammunition.canAttack)");
    expect(source).toContain("CYPHERV2.Combat.Weapon.InsufficientAmmo");
  });

  it("keeps Weapon Depletion entirely manual", () => {
    expect(combatService).not.toContain("DepletionService");
    expect(combatService).not.toContain("depletion.roll");
    expect(combat).toContain('data-action="rollCombatDepletion"');
    expect(combat).toContain("weapon.depleted");
  });

  it("uses explicit equip hands while Shield and Armor rows only toggle details", () => {
    expect(combat).toMatch(/combat-shield-row" data-action="toggleCombatDetails"/);
    expect(combat).toMatch(/combat-armor-row" data-action="toggleCombatDetails"/);
    expect(combat).toMatch(/combat-shield-row[\s\S]*?toggleCombatDetails[\s\S]*?toggleShieldEquipped[\s\S]*?shield\.name/);
    expect(combat).toMatch(/combat-armor-row[\s\S]*?toggleCombatDetails[\s\S]*?toggleArmorEquipped[\s\S]*?armor\.name/);
    expect(combat.match(/fa-hand/g)).toHaveLength(2);
    expect(combat).toContain("CYPHERV2.Combat.EquipShield");
    expect(combat).toContain("CYPHERV2.Combat.UnequipShield");
    expect(combat).toContain("CYPHERV2.Combat.EquipArmor");
    expect(combat).toContain("CYPHERV2.Combat.UnequipArmor");
    expect(combat).not.toContain('{{localize "CYPHERV2.Shield.Functional"}}');
    expect(combat).toContain('{{localize "CYPHERV2.Shield.Broken"}}');
    expect(combat).toMatch(/armor\.name[\s\S]*?\(\{\{armor\.category\}\}\)[\s\S]*?armor\.equipped/);
    expect(source).toContain("services.shields.setEquipped(");
    expect(source).toMatch(/#onToggleArmorEquipped[\s\S]*?armor\.update\(\{"system\.equipped"/);
    expect(source).toMatch(/#onToggleShieldEquipped[\s\S]*?event\.stopPropagation\(\);/);
    expect(source).toMatch(/#onToggleArmorEquipped[\s\S]*?event\.stopPropagation\(\);/);
    expect(styles).toContain("grid-template-columns: 1.25rem 1.25rem minmax(0, 1fr)");
    expect(combat).toContain("armor.freelyUsed");
    expect(combat).not.toContain("CYPHERV2.Combat.Armor.CannotFreelyUse");
    expect(combat).toContain("CYPHERV2.Combat.Armor.UnfamiliarLabel");
    expect(combat).toContain("CYPHERV2.Combat.Armor.UnfamiliarTooltip");
    expect(localization["CYPHERV2.Combat.Armor.UnfamiliarLabel"]).toBe("Unfamiliar");
    expect(localization["CYPHERV2.Combat.Armor.UnfamiliarTooltip"])
      .toBe("Cannot freely use this Armor category · relevant Speed tasks are hindered.");
    expect(combat).toContain("shield.woundTracks");
    expect(combat).toMatch(/combat-row-left[\s\S]*?combat-shield-wounds-column[\s\S]*?combat-depletion-column[\s\S]*?combat-status-column[\s\S]*?combat-item-actions/);
    expect(combat).not.toContain("CYPHERV2.Combat.Armor.Active");
    expect(styles).toMatch(/\.combat-item-summary\.combat-equipped-state[\s\S]*?var\(--cypherv2-success\)/);
    expect(styles).toMatch(/\.combat-equipped-toggle[\s\S]*?var\(--cypherv2-text-muted\)[\s\S]*?&\.is-equipped[\s\S]*?var\(--cypherv2-success\)/);
  });

  it("uses one six-column Combat grid with fixed Depletion and Actions positions", () => {
    expect(styles).toContain("--combat-grid-columns: minmax(6.5rem, 1fr) 10.75rem 4.75rem 7.25rem 7.25rem 4.25rem");
    expect(styles).toMatch(/\.combat-weapon-row,[\s\S]*?\.combat-shield-row,[\s\S]*?\.combat-armor-row[\s\S]*?grid-template-areas: "identity secondary ammo depletion status actions"[\s\S]*?grid-template-columns: var\(--combat-grid-columns\)/);
    expect(styles).toMatch(/\.combat-depletion-column[\s\S]*?grid-area: depletion/);
    expect(styles).toMatch(/\.combat-item-actions[\s\S]*?grid-area: actions/);

    expect(combat).toMatch(/combat-weapon-row[\s\S]*?combat-row-left[\s\S]*?combat-secondary-column[\s\S]*?combat-ammo-column[\s\S]*?combat-depletion-column[\s\S]*?combat-damage-column[\s\S]*?combat-item-actions/);
    expect(combat).toMatch(/combat-shield-row[\s\S]*?combat-row-left[\s\S]*?combat-secondary-column combat-shield-wounds-column[\s\S]*?combat-ammo-column[\s\S]*?combat-depletion-column[\s\S]*?combat-status-column[\s\S]*?combat-item-actions/);
    expect(combat).toMatch(/combat-armor-row[\s\S]*?combat-row-left[\s\S]*?combat-secondary-column combat-familiarity-column[\s\S]*?combat-ammo-column[\s\S]*?combat-depletion-column[\s\S]*?combat-status-column[\s\S]*?combat-item-actions/);
  });

  it("uses shared semantic status colors without allowing secondary data to move Depletion", () => {
    expect(combat.match(/class="combat-item-summary combat-depleted-state"/g)).toHaveLength(3);
    expect(styles).toMatch(/\.combat-item-summary\.combat-depleted-state[\s\S]*?color: var\(--cypherv2-danger\)/);
    expect(combat.match(/combat-equipped-state/g)).toHaveLength(2);
    expect(styles).toMatch(/\.combat-item-summary\.combat-equipped-state[\s\S]*?color: var\(--cypherv2-success\)/);
    expect(styles.indexOf(".combat-item-summary.combat-equipped-state"))
      .toBeGreaterThan(styles.indexOf(".combat-item-summary {"));
    expect(styles.indexOf(".combat-item-summary.combat-depleted-state"))
      .toBeGreaterThan(styles.indexOf(".combat-item-summary {"));
    expect(styles).not.toContain("!important");
    expect(combat).toContain("combat-secondary-column combat-familiarity-column");
    expect(combat).toContain("CYPHERV2.Combat.Armor.UnfamiliarLabel");
    expect(combat).toContain("combat-secondary-column combat-shield-wounds-column");
    expect(styles).toMatch(/\.combat-secondary-column[\s\S]*?grid-area: secondary[\s\S]*?width: 100%[\s\S]*?min-width: 0/);
    expect(styles).toMatch(/\.combat-shield-wounds-column[\s\S]*?overflow: hidden/);
  });

  it("keeps Weapon primary interaction action-oriented", () => {
    expect(combat).toMatch(/combat-weapon-row" data-action="attackWeapon"/);
    expect(combat).toMatch(/combat-attack-name[\s\S]*?data-action="attackWeapon"/);
    expect(source).toContain("await promptWeaponAttack(");
  });

  it("preserves transient expanded state across embedded Item updates", () => {
    expect(source).toContain("this.#combatAccordion.toggle(id)");
    expect(source).toMatch(/expanded: this\.#combatAccordion\.isExpanded\(weapon\.id\)/);
    expect(source).toMatch(/expanded: this\.#combatAccordion\.isExpanded\(shield\.id\)/);
    expect(source).toMatch(/expanded: this\.#combatAccordion\.isExpanded\(armor\.id\)/);
    expect(source).not.toContain('"system.expanded"');
  });

  it("renders enriched UUID-capable descriptions in every accordion", () => {
    expect(combat.match(/\{\{\{(?:weapon|shield|armor)\.enrichedDescription\}\}\}/g)).toHaveLength(3);
    expect(source).toContain("relativeTo: item");
    expect(source).toContain("this.#combatAccordion.toggle(id)");
  });

  it("uses existing Shield and Armor derived states without persisting UI state", () => {
    expect(source).toContain("game.cypherv2.services.shields.isBroken(shield)");
    expect(combat).toContain("shield.broken");
    expect(combat).toContain("shield.equipped");
    expect(combat).toContain("system.derived.combat.armor.blockEase");
    expect(combat).toContain("armor.equipped");
    expect(source).not.toContain('"system.expanded"');
  });

  it("retains the established compact responsive Inventory language", () => {
    expect(combat).toContain("compact-inventory-row compact-combat-row");
    expect(combat).toContain("compact-inventory-details compact-combat-details");
    expect(styles).toContain(".combat-tab-section");
    expect(styles).toContain(".combat-item-summary");
  });
});
