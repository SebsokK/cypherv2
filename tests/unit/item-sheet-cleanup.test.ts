import {readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";

const template = readFileSync("templates/item/item-sheet.hbs", "utf8");
const styles = readFileSync("styles/components/_item-rule-sheet.scss", "utf8");
const sheet = readFileSync("src/applications/sheets/item-sheet.ts", "utf8");
const dialog = readFileSync("src/applications/dialogs/ability-use-dialog.ts", "utf8");

function section(start: string, end: string): string {
  return template.slice(template.indexOf(start), template.indexOf(end));
}

describe("Item Sheet Cleanup V1.1", () => {
  it("keeps Focus normal UI to Name, Description, and Focus Tree with metadata collapsed", () => {
    const focus = section("{{#if isFocus}}", "{{#unless isFocus}}");
    expect(template).toContain("usesCleanItemHeader");
    expect(focus).toContain('name="system.description"');
    expect(focus).toContain("focus-item-tree");
    expect(focus).not.toContain("CYPHERV2.Focus.Editor.GeneralInformation");
    const advanced = focus.indexOf("focus-technical-area");
    expect(advanced).toBeGreaterThan(focus.indexOf("focus-item-tree"));
    expect(focus.indexOf('name="system.slug"')).toBeGreaterThan(advanced);
    expect(focus.indexOf("system.ruleElements.length")).toBeGreaterThan(advanced);
    expect(focus).not.toContain("system.automation.mode");
  });

  it("puts Descriptor Description before default-open Benefits without removing grant controls", () => {
    const descriptor = section("{{#if isDescriptor}}", "{{#if isSpecies}}");
    expect(descriptor.indexOf('name="system.description"')).toBeLessThan(descriptor.indexOf("descriptor-benefits"));
    expect(descriptor).toContain('<details class="descriptor-benefits" data-persistent-disclosure="descriptor-benefits" open>');
    expect(descriptor).toContain("CYPHERV2.Packages.FixedPoolGrants");
    for (const functionality of [
      'name="system.poolBonuses.might"',
      'name="system.poolBonuses.speed"',
      'name="system.poolBonuses.intellect"',
      'data-action="addPoolBonusChoiceGroup"',
      'data-action="editPoolBonusChoiceGroup"',
      'data-action="removePoolBonusChoiceGroup"',
      'data-action="addPackageGrant"',
      'data-action="addChoiceGroup"',
      'data-action="addChoiceOption"',
      'data-action="inspectPackageGrant"',
      'data-action="refreshPackageGrant"',
      'data-action="removePackageGrant"'
    ]) expect(descriptor).toContain(functionality);
    expect(descriptor).not.toContain('name="system.slug"');
    expect(descriptor).not.toContain("system.automation.mode");
    expect(descriptor).not.toContain("system.ruleElements.length");
  });

  it("uses compact Descriptor section headers, add controls, and icon-only grant actions", () => {
    const descriptor = section("{{#if isDescriptor}}", "{{#if isSpecies}}");
    expect(descriptor.match(/class="descriptor-benefit-header"/g)).toHaveLength(4);
    expect(descriptor.match(/class="descriptor-add-action cypherv2-icon-action"/g)).toHaveLength(3);
    expect(descriptor).toContain('class="fa-solid fa-magnifying-glass"');
    expect(descriptor).toContain('class="fa-solid fa-arrows-rotate"');
    expect(descriptor).toContain('class="fa-solid fa-trash"');
    expect(descriptor).toContain("CYPHERV2.Packages.RefreshFromSource");
    expect(descriptor).not.toMatch(/data-action="inspectPackageGrant"[^>]*>\s*\{\{localize/);
    expect(descriptor).not.toMatch(/data-action="refreshPackageGrant"[^>]*>\s*\{\{localize/);
    expect(descriptor).not.toMatch(/data-action="removePackageGrant"[^>]*>\s*\{\{localize/);
    expect(styles).toContain(".descriptor-benefit-header");
    expect(styles).toContain("font-size: 0.7rem");
    expect(styles).toContain(".descriptor-grant-row");
  });

  it("keeps the Descriptor disclosure choice transient across Item Sheet rerenders", () => {
    expect(sheet).toContain("readonly #openDisclosures = new Set<string>()");
    expect(sheet).toContain("readonly #closedDisclosures = new Set<string>()");
    expect(sheet).toContain("else if (this.#closedDisclosures.has(stableKey)) details.open = false");
    expect(sheet).toContain("this.#closedDisclosures.add(stableKey)");
    expect(sheet).toContain("this.#closedDisclosures.delete(stableKey)");
  });

  it("retains the registered Descriptor add, inspect, refresh, and remove handlers", () => {
    for (const [action, handler] of [
      ["addPackageGrant", "#onAddPackageGrant"],
      ["addChoiceGroup", "#onAddChoiceGroup"],
      ["addChoiceOption", "#onAddChoiceOption"],
      ["inspectPackageGrant", "#onInspectPackageGrant"],
      ["refreshPackageGrant", "#onRefreshPackageGrant"],
      ["removePackageGrant", "#onRemovePackageGrant"]
    ]) expect(sheet).toContain(`${action}: CypherV2ItemSheet.${handler}`);
    for (const [action, handler] of [
      ["addPoolBonusChoiceGroup", "#onAddPoolBonusChoiceGroup"],
      ["editPoolBonusChoiceGroup", "#onEditPoolBonusChoiceGroup"],
      ["removePoolBonusChoiceGroup", "#onRemovePoolBonusChoiceGroup"]
    ]) expect(sheet).toContain(`${action}: CypherV2ItemSheet.${handler}`);
  });

  it("refreshes only the selected package snapshot from its source UUID", () => {
    const refresh = sheet.slice(
      sheet.indexOf("static async #onRefreshPackageGrant"),
      sheet.indexOf("static async #onRemovePackageGrant")
    );
    expect(refresh).toContain("const entry = this.#packageEntry(target)");
    expect(refresh).toContain("await fromUuid(uuid)");
    expect(refresh).toContain("CYPHERV2.Packages.SourceUnavailable");
    expect(refresh).toContain("{...entry, snapshot: this.#snapshot(source)}");
    expect(refresh).not.toContain("skillUuid:");
    expect(refresh).not.toContain("rank:");

    const replaceStart = sheet.indexOf("async #replacePackageEntry");
    const replace = sheet.slice(replaceStart, sheet.indexOf("#nodeId(target", replaceStart));
    expect(replace).toContain('"system.skillGrants": grants.map((entry) => entry.id === id ? replacement : entry)');
    expect(replace).toContain("options: group.options.map((entry) => entry.id === id ? replacement : entry)");
  });

  it("keeps inspect source resolution and targeted remove updates intact", () => {
    const inspect = sheet.slice(
      sheet.indexOf("static async #onInspectPackageGrant"),
      sheet.indexOf("static async #onRefreshPackageGrant")
    );
    expect(inspect).toContain("await fromUuid(uuid)");
    expect(inspect).toContain("await source.sheet?.render(true)");
    expect(inspect).toContain("entry.snapshot?.system?.description");

    const remove = sheet.slice(
      sheet.indexOf("static async #onRemovePackageGrant"),
      sheet.indexOf("static async #onRollDepletion")
    );
    expect(remove).toContain('"system.skillGrants": grants.filter((entry) => entry.id !== id)');
    expect(remove).toContain("options: group.options.filter((entry) => entry.id !== id)");
    expect(remove).toContain('"system.choiceGroups": groups.filter((group) => group.id !== id)');
  });

  it("fixes Description grid stretching by making the label/editor wrapper a column flexbox", () => {
    const rule = styles.slice(styles.indexOf(".compact-rule-description"));
    expect(rule).toContain("display: flex");
    expect(rule).toContain("flex-direction: column");
    expect(rule).toContain("gap: 0.2rem");
    expect(rule).toContain("flex: 1 1 auto");
  });

  it("keeps Cost, allowed Pools and Edge as compact normal mechanics", () => {
    expect(template).toContain("ability-cost-field");
    expect(template).toContain("ability-pool-field");
    expect(template).toContain("ability-edge-control");
    expect(styles).toContain(".ability-edge-control");
    expect(styles).not.toContain("appearance: auto");
    expect(styles).not.toContain("accent-color:");
  });
});

describe("Ability multi-Pool Item and use UI", () => {
  it("edits the normalized Pool list through three independent compact toggles", () => {
    expect(template).toContain("ability-pool-toggles");
    expect(template).toContain("data-ability-allowed-pool");
    expect(template).not.toContain('select name="system.cost.allowedPools"');
    expect(sheet).toContain("input[data-ability-allowed-pool]");
    expect(sheet).toContain('this.item.update({"system.cost.allowedPools": allowedPools})');
    expect(sheet).toContain("abilityAllowedPoolOptions: isAbility ? POOL_KEYS.map");
  });

  it("limits the use dialog to configured Pools and still offers all Pools for a Pool-less roll", () => {
    expect(dialog).toContain("const allowedPools = abilityAllowedPools(ability)");
    expect(dialog).toContain("allowedPools.length > 1 ? allowedPools : ALL_ABILITY_COST_POOLS");
    expect(dialog).toContain("choices.map((pool)");
  });

  it("renders multi-Pool costs in the Character Ability list without a combination enum", () => {
    const characterSheet = readFileSync("src/applications/sheets/character-sheet.ts", "utf8");
    expect(characterSheet).toContain("formatAbilityCost(");
    expect(characterSheet).toContain('CYPHERV2.Ability.CostDisplay.FinalOr');
  });
});
