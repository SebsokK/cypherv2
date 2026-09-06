import {readFileSync} from "node:fs";
import {afterEach, describe, expect, it, vi} from "vitest";

import {coreNaturalEffects, prepareRoll, resolveRoll} from "../../src/rolls/roll-engine";
import type {RollContext, RollResult} from "../../src/rolls/roll-types";
import {CORE_TOTAL_EFFORT_CAP} from "../../src/rules/core/effort-rules";
import {chooseNaturalAttackEffect} from "../../src/services/combat-service";
import {
  buildPublicRollCardData,
  buildRollCardCombatData
} from "../../src/services/roll-chat-service";

const template = readFileSync("templates/chat/roll-card.hbs", "utf8");
const paymentTemplate = readFileSync("templates/chat/ability-payment-card.hbs", "utf8");
const styles = readFileSync("styles/components/_roll-card.scss", "utf8");
const intrusionController = readFileSync("src/intrusions/gm-intrusion-controller.ts", "utf8");
const localization = JSON.parse(readFileSync("lang/en.json", "utf8")) as Record<string, string>;

function context(options: {
  difficulty?: RollContext["difficulty"];
  pool?: RollContext["pool"];
  contributions?: RollContext["contributions"];
  purpose?: RollContext["purpose"];
  origin?: RollContext["origin"];
  paidEffort?: number;
  damageEffort?: number;
  freeEffort?: number;
  freeDamageEffort?: number;
  horrorIntrusionRange?: number;
} = {}): RollContext {
  return {
    actor: {id: "actor-1", name: "Ada"},
    label: "Cooking",
    pool: options.pool === undefined ? "might" : options.pool,
    difficulty: options.difficulty ?? {mode: "unknown"},
    assets: 0,
    paidEffort: options.paidEffort ?? 0,
    damageEffort: options.damageEffort ?? 0,
    freeDamageEffort: options.freeDamageEffort ?? 0,
    freeEffort: options.freeEffort ?? 0,
    edge: 0,
    poolValue: 10,
    limits: {
      difficultyCeiling: 10,
      assetLimit: 2,
      paidEffortMaximum: 3,
      totalEffortMaximum: CORE_TOTAL_EFFORT_CAP
    },
    contributions: options.contributions ?? [],
    ...(options.horrorIntrusionRange === undefined ? {} : {
      horrorIntrusionRange: options.horrorIntrusionRange
    }),
    ...(options.purpose ? {purpose: options.purpose} : {}),
    ...(options.origin ? {origin: options.origin} : {})
  };
}

function result(natural: number, options: Parameters<typeof context>[0] = {}): RollResult {
  const resolved = resolveRoll(prepareRoll(context(options)), natural);
  return {
    ...resolved,
    naturalEffects: coreNaturalEffects(resolved, options.horrorIntrusionRange)
  };
}

describe("Roll Card V2 presentation data", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("omits No Pool while retaining a real Pool and Skill mastery identity", () => {
    const skillOrigin = {kind: "skill", itemId: "skill-1", name: "Cooking", rank: "specialized"} as const;
    const poolless = buildPublicRollCardData(result(6, {pool: null, origin: skillOrigin}), "full");
    const pooled = buildPublicRollCardData(result(6, {pool: "might", origin: skillOrigin}), "full");

    expect(poolless).not.toHaveProperty("poolLabel");
    expect(pooled.poolLabel).toBe("CYPHERV2.Pools.Might");
    expect(pooled).toMatchObject({skillName: "Cooking", skillRankClass: "specialized"});
  });

  it("uses engine-provided natural difficulty and PreparedRoll step totals", () => {
    const data = buildPublicRollCardData(result(6, {contributions: [{
      id: "trained", label: "Trained", direction: "ease", steps: 2, source: "skill"
    }, {
      id: "wound", label: "Wound", direction: "hinder", steps: 1, source: "wound"
    }]}), "full");

    expect(data).toMatchObject({naturalRoll: 6, naturalDifficulty: 2});
    expect(data.stepSummary).toBe("+2 CYPHERV2.Roll.EaseSteps · -1 CYPHERV2.Roll.HindranceStep");
    expect(data.modifierDetails).toEqual(expect.arrayContaining([
      {label: "Trained", value: "+2"},
      {label: "Wound", value: "-1"}
    ]));
    expect(data.modifierTotalDetails).toEqual([
      {label: "CYPHERV2.Roll.TotalEase", value: "+2"},
      {label: "CYPHERV2.Roll.TotalHindrance", value: "-1"}
    ]);
  });

  it("omits a zero modifier summary", () => {
    const data = buildPublicRollCardData(result(6), "full");
    expect(data.showStepSummary).toBe(false);
    expect(data.stepSummary).toBe("");
    expect(data.modifierTotalDetails).toEqual([]);
  });

  it("keeps Ease and Hindrance totals as a stable pair when modifiers exist", () => {
    const data = buildPublicRollCardData(result(6, {contributions: [{
      id: "trained", label: "Trained", direction: "ease", steps: 2, source: "skill"
    }]}), "full");
    expect(data.modifierDetails).toEqual([{label: "Trained", value: "+2"}]);
    expect(data.modifierTotalDetails).toEqual([
      {label: "CYPHERV2.Roll.TotalEase", value: "+2"},
      {label: "CYPHERV2.Roll.TotalHindrance", value: 0}
    ]);
  });

  it("shows success and failure only when a difficulty can be resolved", () => {
    expect(buildPublicRollCardData(result(12, {difficulty: {mode: "known", value: 3}}), "full"))
      .toMatchObject({outcomeClass: "success", outcomeIcon: "✓"});
    expect(buildPublicRollCardData(result(3, {difficulty: {mode: "known", value: 3}}), "full"))
      .toMatchObject({outcomeClass: "failure", outcomeIcon: "✕"});
    expect(buildPublicRollCardData(result(12), "full")).not.toHaveProperty("outcome");
  });

  it("keeps hidden resolution fields out of both the card and DETAILS data", () => {
    const data = buildPublicRollCardData(result(14, {difficulty: {mode: "hidden", value: 7}}), "full");
    expect(data).toMatchObject({presentation: "concealed", outcomeClass: "failure", resolutionDetails: []});
    for (const key of ["finalDifficulty", "targetNumber", "originalDifficulty"]) {
      expect(data).not.toHaveProperty(key);
    }
  });

  it("does not disclose the automatic-success mechanism for a hidden difficulty", () => {
    const data = buildPublicRollCardData(result(20, {
      difficulty: {mode: "hidden", value: 1},
      contributions: [{id: "ease", label: "Ease", direction: "ease", steps: 1, source: "other"}]
    }), "full");
    expect(data).toMatchObject({presentation: "concealed", outcome: "CYPHERV2.Roll.Success"});
    expect(JSON.stringify(data)).not.toContain("AutomaticSuccess");
  });

  it.each([17, 18, 19, 20])("presents natural %i from engine-provided effects", (natural) => {
    const data = buildPublicRollCardData(result(natural, {
      difficulty: {mode: "known", value: 1}, purpose: "damage"
    }), "full");
    expect(data).toMatchObject({hasNaturalResult: true, hasExceptionalResult: true});
    expect(data.naturalEffects.length).toBeGreaterThan(0);
    expect(data.gmIntrusion).toBe(false);
  });

  it.each([
    [17, "CYPHERV2.Roll.SpecialRoll.DamageBonus", "+1 CYPHERV2.Roll.NaturalEffects.Damage"],
    [18, "CYPHERV2.Roll.SpecialRoll.DamageBonus", "+2 CYPHERV2.Roll.NaturalEffects.Damage"],
    [19, "CYPHERV2.Roll.SpecialRoll.MinorEffect", "+3 CYPHERV2.Roll.NaturalEffects.Damage"],
    [20, "CYPHERV2.Roll.SpecialRoll.MajorEffect", "+4 CYPHERV2.Roll.NaturalEffects.Damage"]
  ] as const)("labels Special Roll %i by its resolved consequence", (natural, label, damage) => {
    const rolled = result(natural, {difficulty: {mode: "known", value: 1}, purpose: "damage"});
    const resolved = natural >= 19 ? chooseNaturalAttackEffect(rolled, "damage") : rolled;
    expect(buildPublicRollCardData(resolved, "full").specialRoll).toEqual({label, damage});
  });

  it("keeps non-damage Minor and Major Effects distinct from Natural Damage", () => {
    const minor = chooseNaturalAttackEffect(
      result(19, {difficulty: {mode: "known", value: 1}, purpose: "damage"}),
      "effect"
    );
    const major = chooseNaturalAttackEffect(
      result(20, {difficulty: {mode: "known", value: 1}, purpose: "damage"}),
      "effect"
    );
    expect(buildPublicRollCardData(minor, "full").specialRoll).toEqual({
      label: "CYPHERV2.Roll.SpecialRoll.MinorEffect"
    });
    expect(buildPublicRollCardData(major, "full").specialRoll).toEqual({
      label: "CYPHERV2.Roll.SpecialRoll.MajorEffect"
    });
  });

  it("integrates natural 1 as a GM Intrusion event in the originating data", () => {
    const data = buildPublicRollCardData(result(1), "full");
    expect(data).toMatchObject({naturalRoll: 1, gmIntrusion: true, hasExceptionalResult: true});
    expect(data.specialRoll).toEqual({label: "CYPHERV2.Roll.NaturalEffects.GMIntrusion"});
    expect(data.naturalEffects).toContainEqual(expect.objectContaining({isIntrusion: true}));
  });

  it("shows Horror provenance in Details only when Horror Mode caused the Intrusion", () => {
    const normal = buildPublicRollCardData(result(1, {horrorIntrusionRange: 1}), "full");
    const normalWithinHorror = buildPublicRollCardData(
      result(1, {horrorIntrusionRange: 4}),
      "full"
    );
    const horror = buildPublicRollCardData(result(3, {horrorIntrusionRange: 4}), "full");
    const outside = buildPublicRollCardData(result(5, {horrorIntrusionRange: 4}), "full");

    expect(normal.resolutionDetails).not.toContainEqual(expect.objectContaining({label: "CYPHERV2.Horror.Title"}));
    expect(normalWithinHorror.resolutionDetails).not.toContainEqual(expect.objectContaining({label: "CYPHERV2.Horror.Title"}));
    expect(horror.resolutionDetails).toContainEqual({label: "CYPHERV2.Horror.Title", value: "1–4"});
    expect(horror.hasDetails).toBe(true);
    expect(outside.resolutionDetails).not.toContainEqual(expect.objectContaining({label: "CYPHERV2.Horror.Title"}));
  });

  it("exposes final attack damage and its existing breakdown without recalculation", () => {
    const combat = buildRollCardCombatData({
      damage: 12,
      damageBreakdown: [
        {label: "Base", value: 4},
        {label: "Damage Effort", value: 6, additive: true},
        {label: "Natural", value: 2, additive: true}
      ]
    });
    expect(combat).toEqual({
      showFinalDamage: true,
      finalDamage: 12,
      damageDetails: [
        {label: "Base", value: 4},
        {label: "Damage Effort", value: "+6"},
        {label: "Natural", value: "+2"}
      ],
      damageTotalDetails: [
        {label: "CYPHERV2.Combat.FinalDamage", value: 12}
      ]
    });
    expect(buildRollCardCombatData(undefined)).toEqual({
      showFinalDamage: false,
      damageDetails: [],
      damageTotalDetails: []
    });
  });

  it("separates meaningful Effort and Cost rows while omitting zero noise", () => {
    const empty = buildPublicRollCardData(result(10), "full");
    expect(empty.effortDetails).toEqual([]);
    expect(empty.costDetails).toEqual([]);

    const used = buildPublicRollCardData(result(10, {
      paidEffort: 1,
      damageEffort: 1,
      freeDamageEffort: 1
    }), "full");
    expect(used.effortDetails).toEqual(expect.arrayContaining([
      {label: "CYPHERV2.Roll.PaidEffort", value: 1},
      {label: "CYPHERV2.Roll.PaidDamageEffort", value: 1},
      {label: "CYPHERV2.Roll.FreeDamageEffort", value: 1},
      {label: "CYPHERV2.Roll.TotalAppliedEffort", value: "3 / 6"}
    ]));
    expect(used.costDetails).toContainEqual({label: "CYPHERV2.Roll.CostPaid", value: 5});
  });
});

describe("Roll Card V2 templates and routing", () => {
  it("keeps the hero result and exact sources in native disclosures without the redundant step summary", () => {
    expect(template).toContain("roll-card-beats");
    expect(template).toContain("{{naturalRoll}}");
    expect(template).toContain("({{naturalDifficulty}})");
    expect(template).not.toContain("{{stepSummary}}");
    expect(template).not.toContain("showStepSummary");
    expect(template).toContain('<details class="roll-card-disclosure roll-card-details">');
    expect(template).toContain("modifierDetails");
    for (const group of ["resolution", "modifier", "effort", "cost", "damage"]) {
      expect(template).toContain(`roll-card-${group}-details`);
    }
    expect(template).not.toContain('class="roll-breakdown"');
    expect(template).not.toContain("No modifiers");
  });

  it("separates modifier and damage totals with no extra totals heading", () => {
    expect(template).toContain("roll-card-modifier-sources");
    expect(template).toContain("modifierTotalDetails");
    expect(template).toContain("roll-card-detail-totals");
    expect(template).toContain("roll-card-damage-sources");
    expect(template).toContain("damageTotalDetails");
    expect(template).not.toMatch(/<h4>[^<]*(TOTALS|SUMMARY|RESULT)[^<]*<\/h4>/i);
    expect(styles).toMatch(/\.roll-card-detail-list[\s\S]*?& \+ \.roll-card-detail-list[\s\S]*?border-top:/);
    expect(styles).toContain(".roll-card-detail-totals");
  });

  it("uses effect-first Special Roll terminology without repeating the natural number", () => {
    expect(template).toContain("{{specialRoll.label}}");
    expect(template).toContain("{{specialRoll.damage}}");
    expect(template).not.toContain('{{localize "CYPHERV2.Roll.Natural"}} {{naturalRoll}}');
    expect(template).toContain('{{localize "CYPHERV2.Roll.NaturalEffects.Title"}}');
  });

  it("uses Base Damage, additive damage contributions, and official Special Roll terminology", () => {
    expect(localization["CYPHERV2.Combat.DamageBreakdown.Category"]).toBe("Base Damage");
    expect(localization["CYPHERV2.Combat.DamageBreakdown.Natural"]).toBe("Natural Damage");
    expect(localization["CYPHERV2.Roll.NaturalEffects.Title"]).toBe("Special Roll");
    expect(localization["CYPHERV2.Roll.SpecialRoll.DamageBonus"]).toBe("Damage Bonus");
    expect(localization["CYPHERV2.Roll.SpecialRoll.MinorEffect"]).toBe("Minor Effect");
    expect(localization["CYPHERV2.Roll.SpecialRoll.MajorEffect"]).toBe("Major Effect");
    const userFacingRollText = [
      template,
      localization["CYPHERV2.Roll.NaturalEffects.Title"],
      localization["CYPHERV2.Combat.DamageBreakdown.Natural"],
      localization["CYPHERV2.Combat.NaturalChoice.Title"]
    ].join("\n");
    expect(userFacingRollText).not.toMatch(/Natural Result/i);
    expect(userFacingRollText).not.toMatch(/Critical(?: Hit| Result| Failure)?/i);
  });

  it("renders engine-provided final damage in the hero area and breakdown only in DETAILS", () => {
    expect(template).toContain('class="roll-card-final-damage"');
    expect(template).toContain("{{finalDamage}}");
    expect(template).toContain("damageDetails");
    expect(template).not.toContain("combatDamageBreakdown");
    expect(template).not.toMatch(/finalDamage\s*[+*\-/]/);
    expect(styles).toContain(".roll-card-final-damage");
    expect(styles).toContain(".roll-card-detail-group");
  });

  it("renders PAY transaction facts in semantic DETAILS rather than recalculating", () => {
    for (const value of ["listedCost", "ignoresEdge", "edgeApplied", "poolLabel", "costPaid"]) {
      expect(paymentTemplate).toContain(value);
    }
    expect(paymentTemplate).toContain("roll-card-detail-list");
    expect(paymentTemplate).toContain("ability-payment-result");
  });

  it("keeps manual Intrusions published while natural Intrusions skip the redundant card", () => {
    const manual = intrusionController.slice(
      intrusionController.indexOf("async createManual"),
      intrusionController.indexOf("async requestFreeFromNaturalResult")
    );
    const natural = intrusionController.slice(
      intrusionController.indexOf("async #createFree"),
      intrusionController.indexOf("async #offerDistribution")
    );
    expect(manual).toContain("this.#chat.publish(record");
    expect(natural).not.toContain("this.#chat.publish(record");
    expect(natural).toContain('Hooks.callAll("cypherv2GMIntrusionCreated"');
  });

  it("uses Character accent only as decoration and respects reduced motion", () => {
    expect(styles).toContain("--cypherv2-chat-accent");
    expect(styles).toContain("var(--cypherv2-success)");
    expect(styles).toContain("var(--cypherv2-danger)");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain("cypherv2-chat-card-enter");
  });

  it("assigns semantic foregrounds directly to disclosure labels and values", () => {
    expect(styles).toMatch(
      /\.roll-card-disclosure\s*\{[\s\S]*?\.roll-card-detail-list\s*>\s*dt\s*\{\s*color:\s*var\(--cypherv2-text-muted\)/
    );
    expect(styles).toMatch(
      /\.roll-card-disclosure\s*\{[\s\S]*?\.roll-card-detail-list\s*>\s*dd\s*\{\s*color:\s*var\(--cypherv2-text-primary\)/
    );
    expect(styles).toMatch(
      /\.roll-card-disclosure\s*\{[\s\S]*?>\s*ul\s*>\s*li\s*>\s*span[\s\S]*?color:\s*var\(--cypherv2-text-primary\)/
    );
    expect(styles).toMatch(
      /\.roll-card-disclosure\s*\{[\s\S]*?>\s*ul\s*>\s*li\s*>\s*small[\s\S]*?color:\s*var\(--cypherv2-text-muted\)/
    );
  });
});
