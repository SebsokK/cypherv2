import {afterEach, describe, expect, it, vi} from "vitest";

import type {WeaponItemLike} from "../../src/combat/combat-types";
import {genericTaskRequest} from "../../src/applications/dialogs/test-roll-dialog";
import {
  buildRollDialogPreview,
  poolOptions,
  rollDialogShell,
  situationalModifier
} from "../../src/applications/dialogs/roll-dialog";
import {registerCoreRuleModule} from "../../src/rules/core-rule-module";
import {RuleRegistry} from "../../src/rules/rule-registry";
import type {CharacterRollRequest, RollPolicyRequest} from "../../src/rolls/roll-types";
import {CombatService, type CombatCharacterLike} from "../../src/services/combat-service";
import {RollService, type RollCharacterDocumentLike} from "../../src/services/roll-service";
import {SkillService} from "../../src/services/skill-service";
import {TargetResolver} from "../../src/services/target-resolver";
import {WoundService} from "../../src/services/wound-service";
import {character} from "../helpers/core-fixtures";

const policy: RollPolicyRequest = {
  base: {difficultyCeiling: 10, assetLimit: 2},
  enabledRuleModuleIds: []
};

const localize = (key: string): string => key;

function request(overrides: Partial<CharacterRollRequest> = {}): CharacterRollRequest {
  return {
    label: "CYPHERV2.Roll.TaskRoll",
    pool: "might",
    difficulty: {mode: "known", value: 5},
    skillSteps: 0,
    assets: 0,
    paidEffort: 0,
    damageEffort: 0,
    freeEffort: 0,
    otherEase: 0,
    otherHindrance: 0,
    purpose: "task",
    ...overrides
  };
}

function services() {
  const rules = new RuleRegistry();
  registerCoreRuleModule(rules);
  const rolls = new RollService(rules, async () => ({naturalRoll: 12}));
  const skills = new SkillService(rules);
  const targets = new TargetResolver(rules);
  const combat = new CombatService(rules, rolls, skills, targets, new WoundService());
  return {rolls, combat};
}

function weapon(): WeaponItemLike {
  return {
    id: "heavy-weapon",
    name: "Greatsword",
    type: "weapon",
    system: {
      category: "heavy",
      attackType: "melee",
      rangeCategory: "immediate",
      rangeNotes: "",
      damageOverride: null,
      baseDamage: 6,
      attackModifier: 0,
      bonusDamage: 0,
      freelyUsed: false,
      equipped: true,
      description: "",
      ammo: {enabled: false, value: 0, max: 0, perAttack: 1},
      depletion: {enabled: false, die: "d6", threshold: 1}
    }
  };
}

function combatActor(): CombatCharacterLike {
  return Object.assign(character({effortBase: 4}), {items: []}) as unknown as CombatCharacterLike;
}

describe("All-in-One Roll Dialog view model", () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each(["might", "speed", "intellect"] as const)("keeps a generic %s Task request authoritative", (pool) => {
    const result = genericTaskRequest({
      pool,
      difficulty: "4",
      skillSteps: "1",
      assets: "1",
      paidEffort: "1",
      freeEffort: "0",
      situationalDirection: "hinder",
      situationalSteps: "2"
    });
    expect(result).toMatchObject({pool, difficulty: {mode: "known", value: 4}, skillSteps: 1, assets: 1, paidEffort: 1, otherEase: 0, otherHindrance: 2});
  });

  it("normalizes universal manual Ease and Hindrance without changing engine storage", () => {
    expect(situationalModifier({situationalDirection: "ease", situationalSteps: "2"})).toEqual({otherEase: 2, otherHindrance: 0});
    expect(situationalModifier({situationalDirection: "hinder", situationalSteps: "3"})).toEqual({otherEase: 0, otherHindrance: 3});
  });

  it("updates Assets, task Effort, Free Effort and manual modifiers from PreparedRoll", () => {
    const actor = character({effortBase: 4});
    const {rolls} = services();
    const prepared = rolls.preview(actor, request({assets: 1, paidEffort: 2, freeEffort: 1, otherEase: 1, otherHindrance: 2}), policy);
    const view = buildRollDialogPreview(prepared, actor, localize);

    expect(view.modifiers).toEqual(expect.arrayContaining([
      expect.objectContaining({id: "core.assets", modifier: "+1"}),
      expect.objectContaining({id: "core.effort.paid", modifier: "+2"}),
      expect.objectContaining({id: "core.effort.free", modifier: "+1"}),
      expect.objectContaining({id: "manual.other-ease", modifier: "+1"}),
      expect.objectContaining({id: "manual.other-hindrance", modifier: "-2"})
    ]));
    expect(view.netModifier).toBe("+3");
  });

  it("renders automatic Ease and Hindrance separately with signed provenance", () => {
    const actor = character();
    const {rolls} = services();
    const prepared = rolls.preview(actor, request({contributions: [{
      id: "ability.reflexes",
      label: "Ability: Combat Reflexes",
      direction: "ease",
      steps: 1,
      source: "rule-module"
    }, {
      id: "armor.heavy.dodge",
      label: "Heavy Armor",
      direction: "hinder",
      steps: 3,
      source: "other"
    }]}), policy);
    const view = buildRollDialogPreview(prepared, actor, localize);

    expect(view.automaticModifiers).toEqual([
      expect.objectContaining({label: "Ability: Combat Reflexes", modifier: "+1"}),
      expect.objectContaining({label: "Heavy Armor", modifier: "-3"})
    ]);
    expect(view.modifiers).toHaveLength(0);
    expect(view.modifiers.length + view.automaticModifiers.length).toBe(prepared.breakdown.length);
  });

  it("shows known difficulty and omits derived difficulty for no-difficulty rolls", () => {
    const actor = character();
    const {rolls} = services();
    const known = buildRollDialogPreview(rolls.preview(actor, request(), policy), actor, localize);
    const unknown = buildRollDialogPreview(rolls.preview(actor, request({difficulty: {mode: "unknown"}}), policy), actor, localize);
    expect(known).toMatchObject({baseDifficulty: 5, finalDifficulty: 5, targetNumber: 15});
    expect(unknown).toMatchObject({difficultyMode: "unknown", baseDifficulty: null, finalDifficulty: null, targetNumber: null});
  });

  it("never places hidden difficulty or private NPC modifiers in the player view model", () => {
    const actor = character();
    const {rolls} = services();
    const prepared = rolls.preview(actor, request({
      difficulty: {mode: "hidden", value: 7},
      contributions: [{
        id: "npc-modification.secret-defense",
        label: "Secret Defense Modifier",
        direction: "hinder",
        steps: 2,
        source: "other"
      }]
    }), policy);
    const view = buildRollDialogPreview(prepared, actor, localize);

    expect(view).toMatchObject({difficultyMode: "hidden", baseDifficulty: null, finalDifficulty: null, targetNumber: null, netModifier: null, hiddenModifierCount: 1});
    expect(JSON.stringify(view)).not.toContain("Secret Defense Modifier");
  });

  it("makes unfamiliar Weapon and Armor contributions visible without recomputing them", () => {
    const actor = combatActor();
    const {rolls, combat} = services();
    const weaponRequest = combat.buildWeaponAttackPlan(actor, weapon()).requests[0]!;
    const weaponView = buildRollDialogPreview(rolls.preview(actor, weaponRequest, policy), actor, localize);
    expect(weaponView.automaticModifiers).toContainEqual(expect.objectContaining({
      label: "CYPHERV2.Combat.Weapon.Unfamiliar.heavy",
      modifier: "-1"
    }));

    actor.system.derived.combat.armor = {
      itemId: "armor-medium",
      category: "medium",
      freelyUsed: false,
      blockEase: 2,
      dodgeHindrance: 2,
      speedTaskHindrance: 2,
      blockContributions: [],
      dodgeContributions: [],
      speedTaskContributions: [{id: "armor.medium.speed", sourceId: "armor-medium", sourceType: "item", label: "", value: 2}]
    };
    const armorView = buildRollDialogPreview(rolls.preview(actor, request({pool: "speed"}), policy), actor, localize);
    expect(armorView.automaticModifiers).toContainEqual(expect.objectContaining({
      label: "CYPHERV2.Combat.Armor.Unfamiliar.medium",
      modifier: "-2"
    }));
  });

  it("shows Dodge Armor once and Block Armor as Ease", () => {
    const actor = combatActor();
    actor.system.derived.combat.armor = {
      itemId: "armor-heavy",
      category: "heavy",
      freelyUsed: false,
      blockEase: 3,
      dodgeHindrance: 3,
      speedTaskHindrance: 3,
      blockContributions: [{id: "armor.heavy.block", sourceId: "armor-heavy", sourceType: "item", label: "", value: 3}],
      dodgeContributions: [{id: "armor.heavy.dodge", sourceId: "armor-heavy", sourceType: "item", label: "", value: 3}],
      speedTaskContributions: [{id: "armor.heavy.speed", sourceId: "armor-heavy", sourceType: "item", label: "", value: 3}]
    };
    const {rolls, combat} = services();
    const dodge = rolls.preview(actor, combat.buildDefenseRequest(actor, "dodge", {difficulty: {mode: "known", value: 5}}), policy);
    const block = rolls.preview(actor, combat.buildDefenseRequest(actor, "block", {difficulty: {mode: "known", value: 5}}), policy);
    expect(dodge.totalHindrance).toBe(3);
    expect(buildRollDialogPreview(dodge, actor, localize).automaticModifiers).toEqual([
      expect.objectContaining({modifier: "-3"})
    ]);
    expect(block.totalEase).toBe(3);
    expect(buildRollDialogPreview(block, actor, localize).automaticModifiers).toEqual([
      expect.objectContaining({modifier: "+3"})
    ]);
  });

  it("uses RollService cost preview and matches the actual Pool payment", async () => {
    const actor = character({mightEdge: 1, effortBase: 3, poolValues: {might: 10}});
    const {rolls} = services();
    const rollRequest = request({paidEffort: 2, actionCost: 2});
    const prepared = rolls.preview(actor, rollRequest, policy);
    const view = buildRollDialogPreview(prepared, actor, localize);
    expect(view).toMatchObject({actionCost: 2, effortCost: 5, edgeApplied: 1, totalCost: 6, poolAfter: 4});
    await rolls.execute(actor, rollRequest, policy);
    expect(actor.system.stats.might.value).toBe(view.poolAfter);
  });

  it("reports applied, free, and paid Effort from PreparedRoll against the Core cap", () => {
    const actor = character({effortBase: 1});
    const {rolls} = services();
    const prepared = rolls.preview(actor, request({
      paidEffort: 1,
      freeEffort: 2
    }), policy);
    const view = buildRollDialogPreview(prepared, actor, localize);
    expect(view).toMatchObject({
      effortUsed: 1,
      effortMaximum: 1,
      totalEffortApplied: 3,
      totalEffortMaximum: 6,
      paidEffortApplied: 1,
      freeEffortApplied: 2,
      effortCost: 3
    });
  });

  it("reports an Unlimited total cap only from PreparedRoll", () => {
    const actor = character({effortBase: 1});
    const rules = new RuleRegistry();
    registerCoreRuleModule(rules);
    const rolls = new RollService(rules, async () => ({naturalRoll: 12}), () => "unlimited");
    const prepared = rolls.preview(actor, request({paidEffort: 1, freeEffort: 7}), policy);
    expect(buildRollDialogPreview(prepared, actor, localize)).toMatchObject({
      paidEffortApplied: 1,
      freeEffortApplied: 7,
      totalEffortApplied: 8,
      totalEffortMaximum: null
    });
  });

  it("renders responsive semantic structure without creating a second rules surface", () => {
    vi.stubGlobal("game", {i18n: {localize}});
    const html = rollDialogShell({identity: "Speed Defense", settings: "<label>Field</label>"});
    expect(html).toContain("roll-dialog-layout");
    expect(html).toContain("roll-dialog-settings");
    expect(html).toContain("roll-dialog-summary");
    expect(html).toContain('data-roll-summary-section="automatic"');
    expect(html).not.toContain("finalDifficulty");
  });

  it("preserves the Foundry Localization method context", () => {
    const localization = {
      translations: {
        "CYPHERV2.Pools.Might": "Might",
        "CYPHERV2.Pools.Speed": "Speed",
        "CYPHERV2.Pools.Intellect": "Intellect"
      },
      localize(this: {translations: Record<string, string>}, key: string): string {
        if (!this?.translations) throw new Error("Localization context was lost");
        return this.translations[key] ?? key;
      }
    };
    vi.stubGlobal("game", {i18n: localization});

    expect(poolOptions("might")).toContain(">Might</option>");
    expect(poolOptions("speed")).toContain(">Speed</option>");
  });
});
