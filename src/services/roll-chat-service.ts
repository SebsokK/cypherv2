import type {RollExecution, RollResult} from "../rolls/roll-types";
import type {RollCharacterDocumentLike} from "./roll-service";
import type {RollChatCombatPresentation} from "../combat/combat-chat-types";
import {formatStepModifier} from "../rolls/step-modifier";
import {chatCardActorImageData} from "./chat-card-presentation";

export type DifficultyVisibility = "full" | "resultOnly" | "rollOnly";
export type Localize = (key: string) => string;

interface RollCardBreakdownEntry {
  readonly label: string;
  readonly direction: string;
  readonly steps: number;
  readonly isEase: boolean;
  readonly modifier: string;
}

interface RollCardNaturalEffect {
  readonly kind: string;
  readonly label: string;
  readonly status: string;
  readonly damageBonus?: number;
  readonly isIntrusion: boolean;
}

interface RollCardDetailEntry {
  readonly label: string;
  readonly value: string | number;
}

interface RollCardSpecialRollPresentation {
  readonly label: string;
  readonly damage?: string;
}

interface RollCardBase {
  readonly actorImage?: string;
  readonly actorName: string;
  readonly rollLabel: string;
  readonly poolLabel?: string;
  readonly naturalRoll: number | null;
  readonly naturalDifficulty: number | null;
  readonly showNaturalRoll: boolean;
  readonly showNaturalDifficulty: boolean;
  readonly breakdown: readonly RollCardBreakdownEntry[];
  readonly modifierDetails: readonly RollCardDetailEntry[];
  readonly modifierTotalDetails: readonly RollCardDetailEntry[];
  readonly effortDetails: readonly RollCardDetailEntry[];
  readonly costDetails: readonly RollCardDetailEntry[];
  readonly stepSummary: string;
  readonly showStepSummary: boolean;
  readonly paidEffort: number;
  readonly damageEffort: number;
  readonly freeEffort: number;
  readonly poolCost: number;
  readonly poolCostRefunded: number;
  readonly actionCost: number;
  readonly totalEase: number;
  readonly totalHindrance: number;
  readonly netSteps: number;
  readonly naturalEffects: readonly RollCardNaturalEffect[];
  readonly specialRoll: RollCardSpecialRollPresentation | null;
  readonly hasNaturalResult: boolean;
  readonly hasNaturalEffectDisclosure: boolean;
  readonly gmIntrusion: boolean;
  readonly hasExceptionalResult: boolean;
  readonly skillName?: string;
  readonly skillRank?: string;
  readonly skillRankClass?: string;
  readonly targetName?: string;
  readonly weaponName?: string;
  readonly weaponCategory?: string;
  readonly defenseType?: string;
  readonly abilityName?: string;
  readonly abilityActivation?: string;
}

export type PublicRollCardData = RollCardBase & {
  readonly presentation: "known" | "unknown" | "concealed";
  readonly outcome?: string;
  readonly outcomeIcon?: "✓" | "✕";
  readonly outcomeClass?: "success" | "failure";
  readonly finalDifficulty?: number;
  readonly targetNumber?: number;
  readonly beatsDifficulty?: number;
  readonly showKnownDifficulty?: true;
  readonly showBeatsDifficulty?: true;
  readonly resolutionDetails: readonly RollCardDetailEntry[];
  readonly hasDetails: boolean;
};

export interface AuditRollCardData extends RollCardBase {
  readonly originalDifficulty: number;
  readonly finalDifficulty: number;
  readonly targetNumber: number;
  readonly outcome: string;
  readonly outcomeClass: "success" | "failure";
}

export interface RollChatPublishOptions {
  readonly combat?: RollChatCombatPresentation;
  readonly showGmAudit?: boolean;
}

function cardNaturalEffects(
  result: RollResult,
  localize: Localize
): readonly RollCardNaturalEffect[] {
  return result.naturalEffects
    .filter((effect) => effect.status !== "inapplicable")
    .map((effect) => ({
      kind: effect.kind,
      label: localize(effect.label),
      status: localize(`CYPHERV2.Roll.NaturalEffects.Status.${effect.status}`),
      isIntrusion: effect.kind === "gm-intrusion",
      ...(effect.damageBonus === undefined ? {} : {damageBonus: effect.damageBonus})
    }));
}

/** Describe the resolved Special Roll consequence without deriving rules from the d20 in Handlebars. */
function specialRollPresentation(
  result: RollResult,
  localize: Localize
): RollCardSpecialRollPresentation | null {
  const effects = result.naturalEffects.filter((effect) => effect.status !== "inapplicable");
  if (effects.some((effect) => effect.kind === "gm-intrusion")) {
    return {label: localize("CYPHERV2.Roll.NaturalEffects.GMIntrusion")};
  }
  const damage = effects.find((effect) => effect.kind === "damage-bonus");
  const damageText = damage?.damageBonus === undefined
    ? undefined
    : `+${damage.damageBonus} ${localize("CYPHERV2.Roll.NaturalEffects.Damage")}`;
  const hasMinorEffect = effects.some((effect) => effect.kind === "minor-effect")
    || (result.naturalRoll === 19 && damage !== undefined);
  const hasMajorEffect = effects.some((effect) => effect.kind === "major-effect")
    || (result.naturalRoll === 20 && damage !== undefined);
  if (hasMinorEffect) {
    return {
      label: localize("CYPHERV2.Roll.SpecialRoll.MinorEffect"),
      ...(damageText ? {damage: damageText} : {})
    };
  }
  if (hasMajorEffect) {
    return {
      label: localize("CYPHERV2.Roll.SpecialRoll.MajorEffect"),
      ...(damageText ? {damage: damageText} : {})
    };
  }
  if (damage) {
    return {
      label: localize("CYPHERV2.Roll.SpecialRoll.DamageBonus"),
      ...(damageText ? {damage: damageText} : {})
    };
  }
  const first = effects[0];
  return first ? {label: localize(first.label)} : null;
}

function pluralizedStepSummary(
  amount: number,
  direction: "ease" | "hinder",
  localize: Localize
): string {
  const modifier = formatStepModifier(direction, amount);
  const key = direction === "ease"
    ? amount === 1 ? "CYPHERV2.Roll.EaseStep" : "CYPHERV2.Roll.EaseSteps"
    : amount === 1 ? "CYPHERV2.Roll.HindranceStep" : "CYPHERV2.Roll.HindranceSteps";
  return `${modifier} ${localize(key)}`;
}

function modifierDetailRows(
  prepared: RollResult["prepared"],
  localize: Localize
): readonly RollCardDetailEntry[] {
  return prepared.breakdown.map((entry) => ({
    label: localize(entry.label),
    value: formatStepModifier(entry.direction, entry.steps)
  }));
}

function modifierTotalRows(
  prepared: RollResult["prepared"],
  localize: Localize
): readonly RollCardDetailEntry[] {
  if (prepared.breakdown.length === 0
    && prepared.totalEase === 0
    && prepared.totalHindrance === 0) return [];
  return [{
    label: localize("CYPHERV2.Roll.TotalEase"),
    value: prepared.totalEase === 0 ? 0 : formatStepModifier("ease", prepared.totalEase)
  }, {
    label: localize("CYPHERV2.Roll.TotalHindrance"),
    value: prepared.totalHindrance === 0 ? 0 : formatStepModifier("hinder", prepared.totalHindrance)
  }];
}

function effortDetailRows(
  result: RollResult,
  localize: Localize
): readonly RollCardDetailEntry[] {
  const prepared = result.prepared;
  const context = prepared.context;
  return [
    ...(context.paidEffort > 0 ? [{
      label: localize("CYPHERV2.Roll.PaidEffort"), value: context.paidEffort
    }] : []),
    ...((context.damageEffort ?? 0) > 0 ? [{
      label: localize("CYPHERV2.Roll.PaidDamageEffort"), value: context.damageEffort ?? 0
    }] : []),
    ...(context.freeEffort > 0 ? [{
      label: localize("CYPHERV2.Roll.FreeEffort"), value: context.freeEffort
    }] : []),
    ...((context.freeDamageEffort ?? 0) > 0 ? [{
      label: localize("CYPHERV2.Roll.FreeDamageEffort"), value: context.freeDamageEffort ?? 0
    }] : []),
    ...(prepared.totalEffortApplied > 0 ? [{
      label: localize("CYPHERV2.Roll.TotalAppliedEffort"),
      value: prepared.totalEffortMaximum === null
        ? String(prepared.totalEffortApplied)
        : `${prepared.totalEffortApplied} / ${prepared.totalEffortMaximum}`
    }] : [])
  ];
}

function costDetailRows(
  result: RollResult,
  localize: Localize
): readonly RollCardDetailEntry[] {
  const prepared = result.prepared;
  const hasPoolCost = prepared.actionCostBeforeEdge > 0
    || prepared.effortCostBeforeEdge > 0
    || result.poolCostPaid > 0;
  return [
    ...(prepared.actionCostBeforeEdge > 0 ? [{
      label: localize("CYPHERV2.Ability.Cost"), value: prepared.actionCostBeforeEdge
    }] : []),
    ...(prepared.edgeApplied > 0 ? [{
      label: localize("CYPHERV2.Pools.Edge"), value: prepared.edgeApplied
    }] : []),
    ...(hasPoolCost ? [{
      label: localize("CYPHERV2.Roll.CostPaid"), value: result.poolCostPaid
    }] : []),
    ...(result.poolCostRefunded > 0 ? [{
      label: localize("CYPHERV2.Roll.NaturalEffects.Refunded"), value: result.poolCostRefunded
    }] : [])
  ];
}

function horrorModeDetailRows(
  result: RollResult,
  localize: Localize
): readonly RollCardDetailEntry[] {
  const effect = result.naturalEffects.find((candidate) => (
    candidate.kind === "gm-intrusion"
    && candidate.status === "applied"
    && candidate.intrusionProvenance === "horror-mode"
    && candidate.horrorIntrusionRange !== undefined
  ));
  return effect?.horrorIntrusionRange === undefined ? [] : [{
    label: localize("CYPHERV2.Horror.Title"),
    value: `1–${effect.horrorIntrusionRange}`
  }];
}

function baseCardData(
  result: RollResult,
  localize: Localize
): RollCardBase {
  const prepared = result.prepared;
  const poolKey = prepared.context.pool
    ? `${prepared.context.pool[0]!.toUpperCase()}${prepared.context.pool.slice(1)}`
    : null;
  const naturalEffects = cardNaturalEffects(result, localize);
  const visibleNaturalEffects = naturalEffects.filter((effect) => !effect.isIntrusion);
  const stepSummary = [
    ...(prepared.totalEase > 0
      ? [pluralizedStepSummary(prepared.totalEase, "ease", localize)]
      : []),
    ...(prepared.totalHindrance > 0
      ? [pluralizedStepSummary(prepared.totalHindrance, "hinder", localize)]
      : [])
  ].join(" · ");
  return {
    actorName: prepared.context.actor.name,
    rollLabel: localize(prepared.context.label),
    ...(poolKey ? {poolLabel: localize(`CYPHERV2.Pools.${poolKey}`)} : {}),
    naturalRoll: result.naturalRoll,
    naturalDifficulty: result.naturalDifficulty,
    showNaturalRoll: result.naturalRoll !== null,
    showNaturalDifficulty: result.naturalDifficulty !== null,
    breakdown: prepared.breakdown.map((entry) => ({
      label: localize(entry.label),
      direction: localize(
        entry.direction === "ease" ? "CYPHERV2.Roll.Ease" : "CYPHERV2.Roll.Hinder"
      ),
      steps: entry.steps,
      isEase: entry.direction === "ease",
      modifier: formatStepModifier(entry.direction, entry.steps)
    })),
    modifierDetails: modifierDetailRows(prepared, localize),
    modifierTotalDetails: modifierTotalRows(prepared, localize),
    effortDetails: effortDetailRows(result, localize),
    costDetails: costDetailRows(result, localize),
    stepSummary,
    showStepSummary: stepSummary.length > 0,
    paidEffort: prepared.context.paidEffort,
    damageEffort: prepared.damageEffortApplied,
    freeEffort: prepared.context.freeEffort,
    poolCost: result.poolCostPaid,
    poolCostRefunded: result.poolCostRefunded,
    actionCost: prepared.actionCostBeforeEdge,
    totalEase: prepared.totalEase,
    totalHindrance: prepared.totalHindrance,
    netSteps: prepared.netSteps,
    naturalEffects,
    specialRoll: specialRollPresentation(result, localize),
    hasNaturalResult: result.naturalMarkers.length > 0,
    hasNaturalEffectDisclosure: visibleNaturalEffects.length > 0,
    gmIntrusion: naturalEffects.some((effect) => effect.isIntrusion),
    hasExceptionalResult: naturalEffects.length > 0,
    ...(prepared.context.origin?.kind === "skill"
      ? {
          skillName: prepared.context.origin.name,
          skillRank: localize(`CYPHERV2.Skill.Ranks.${prepared.context.origin.rank}`),
          skillRankClass: prepared.context.origin.rank
        }
      : {}),
    ...(prepared.context.target ? {targetName: prepared.context.target.name} : {}),
    ...(prepared.context.origin?.kind === "weapon" ? {
      weaponName: prepared.context.origin.name,
      weaponCategory: localize(`CYPHERV2.Combat.Weapon.Category.${prepared.context.origin.category}`)
    } : {}),
    ...(prepared.context.origin?.kind === "defense" ? {
      defenseType: localize(`CYPHERV2.Combat.Defense.${prepared.context.origin.defenseType}`)
    } : {}),
    ...(prepared.context.origin?.kind === "ability" ? {
      abilityName: prepared.context.origin.name,
      abilityActivation: localize(`CYPHERV2.Ability.Activation.${prepared.context.origin.activation}`)
    } : {})
  };
}

function outcomeData(success: boolean, localize: Localize): {
  outcome: string;
  outcomeIcon: "✓" | "✕";
  outcomeClass: "success" | "failure";
} {
  return success
    ? {outcome: localize("CYPHERV2.Roll.Success"), outcomeIcon: "✓", outcomeClass: "success"}
    : {outcome: localize("CYPHERV2.Roll.Failure"), outcomeIcon: "✕", outcomeClass: "failure"};
}

function resultOutcomeData(result: RollResult, localize: Localize, discloseAutomatic = true): {
  outcome: string;
  outcomeIcon: "✓" | "✕";
  outcomeClass: "success" | "failure";
} {
  return result.automaticSuccess && discloseAutomatic
    ? {outcome: localize("CYPHERV2.Roll.AutomaticSuccess"), outcomeIcon: "✓", outcomeClass: "success"}
    : outcomeData(result.success === true, localize);
}

export function buildPublicRollCardData(
  result: RollResult,
  _visibility: DifficultyVisibility,
  localize: Localize = (key) => key
): PublicRollCardData {
  const base = baseCardData(result, localize);
  const performance = result.beatsDifficulty === null ? {} : {
    beatsDifficulty: result.beatsDifficulty,
    showBeatsDifficulty: true as const
  };
  const horrorDetails = horrorModeDetailRows(result, localize);
  const difficulty = result.prepared.context.difficulty;
  if (difficulty.mode === "unknown") {
    return {
      ...base,
      ...performance,
      presentation: "unknown",
      resolutionDetails: horrorDetails,
      hasDetails: horrorDetails.length > 0
        || base.modifierDetails.length > 0
        || base.modifierTotalDetails.length > 0
        || base.effortDetails.length > 0
        || base.costDetails.length > 0
    };
  }
  if (difficulty.mode === "known") {
    const resolutionDetails: readonly RollCardDetailEntry[] = [{
      label: localize("CYPHERV2.Roll.Difficulty"),
      value: result.prepared.finalDifficulty ?? 0
    }, {
      label: localize("CYPHERV2.Roll.TargetNumber"),
      value: result.prepared.targetNumber ?? 0
    }, ...horrorDetails];
    return {
      ...base,
      ...performance,
      presentation: "known",
      ...resultOutcomeData(result, localize),
      finalDifficulty: result.prepared.finalDifficulty ?? 0,
      targetNumber: result.prepared.targetNumber ?? 0,
      showKnownDifficulty: true,
      resolutionDetails,
      hasDetails: true
    };
  }
  return {
    ...base,
    ...performance,
    presentation: "concealed",
    ...resultOutcomeData(result, localize, false),
    resolutionDetails: horrorDetails,
    hasDetails: horrorDetails.length > 0
      || base.modifierDetails.length > 0
      || base.modifierTotalDetails.length > 0
      || base.effortDetails.length > 0
      || base.costDetails.length > 0
  };
}

export interface RollCardCombatData {
  readonly showFinalDamage: boolean;
  readonly finalDamage?: number;
  readonly damageDetails: readonly RollCardDetailEntry[];
  readonly damageTotalDetails: readonly RollCardDetailEntry[];
}

/** Present already-resolved combat damage without performing any damage arithmetic. */
export function buildRollCardCombatData(
  combat: RollChatCombatPresentation | undefined,
  localize: Localize = (key) => key
): RollCardCombatData {
  if (combat?.damage === undefined) {
    return {showFinalDamage: false, damageDetails: [], damageTotalDetails: []};
  }
  return {
    showFinalDamage: true,
    finalDamage: combat.damage,
    damageDetails: [
      ...(combat.damageBreakdown ?? []).map((entry) => ({
        label: localize(entry.label),
        value: entry.additive && entry.value > 0 ? `+${entry.value}` : entry.value
      }))
    ],
    damageTotalDetails: [{label: localize("CYPHERV2.Combat.FinalDamage"), value: combat.damage}]
  };
}

export function buildAuditRollCardData(
  result: RollResult,
  localize: Localize = (key) => key
): AuditRollCardData {
  const difficulty = result.prepared.context.difficulty;
  if (difficulty.mode !== "hidden") throw new Error("Only hidden-difficulty rolls require an audit card.");
  return {
    ...baseCardData(result, localize),
    originalDifficulty: difficulty.value,
    finalDifficulty: result.prepared.finalDifficulty ?? 0,
    targetNumber: result.prepared.targetNumber ?? 0,
    ...resultOutcomeData(result, localize)
  };
}

export class RollChatService {
  async publish(
    actor: RollCharacterDocumentLike,
    execution: RollExecution,
    visibility: DifficultyVisibility,
    options: RollChatPublishOptions = {}
  ): Promise<void> {
    const localize = (key: string): string => game.i18n.localize(key);
    const basePublicData = buildPublicRollCardData(execution.result, visibility, localize);
    const combatData = buildRollCardCombatData(options.combat, localize);
    const publicData = {
      ...basePublicData,
      ...combatData,
      hasDetails: basePublicData.hasDetails
        || combatData.damageDetails.length > 0
        || combatData.damageTotalDetails.length > 0,
      ...chatCardActorImageData(actor as unknown as import("./chat-card-presentation").ChatCardActorLike),
      ...(options.combat?.woundSeverity === undefined ? {} : {
        combatWoundSeverity: localize(`CYPHERV2.Wounds.Severity.${options.combat.woundSeverity}`)
      }),
      ...(options.combat?.shieldTransfer === undefined ? {} : {
        shieldTransfer: true,
        shieldName: options.combat.shieldTransfer.shieldName,
        shieldSeverity: localize(`CYPHERV2.Wounds.Severity.${options.combat.shieldTransfer.severity}`)
      }),
      ...(options.combat?.action ? {
        combatAction: true,
        combatActionLabel: localize(
          options.combat.action.kind === "npcDamage"
            ? "CYPHERV2.Combat.ApplyDamage"
            : options.combat.action.kind === "shieldWound"
              ? "CYPHERV2.Combat.ApplyWoundToShield"
              : "CYPHERV2.Combat.ApplyWound"
        )
      } : {})
    };
    const publicContent = await foundry.applications.handlebars.renderTemplate(
      "systems/cypherv2/templates/chat/roll-card.hbs",
      publicData as unknown as Record<string, unknown>
    );
    const publicMessage: Record<string, unknown> = {
      speaker: ChatMessage.getSpeaker({actor: actor as unknown as Actor}),
      content: publicContent
    };
    if (options.combat?.action) {
      publicMessage.flags = {cypherv2: {combatAction: options.combat.action}};
    }
    if (execution.chatRoll !== undefined) publicMessage.rolls = [execution.chatRoll];
    await ChatMessage.create(publicMessage);

    if (execution.result.prepared.context.difficulty.mode !== "hidden") return;
    const baseAuditData = buildAuditRollCardData(execution.result, localize);
    Hooks.callAll("cypherv2HiddenRollAudit", baseAuditData, actor, execution);
    if (options.showGmAudit !== true) return;
    const auditContent = await foundry.applications.handlebars.renderTemplate(
      "systems/cypherv2/templates/chat/roll-audit-card.hbs",
      {
        ...baseAuditData,
        ...combatData,
        ...chatCardActorImageData(actor as unknown as import("./chat-card-presentation").ChatCardActorLike)
      } as unknown as Record<string, unknown>
    );
    const auditMessage: Record<string, unknown> = {
      speaker: ChatMessage.getSpeaker({actor: actor as unknown as Actor}),
      content: auditContent,
      whisper: ChatMessage.getWhisperRecipients("GM").map((user) => user.id),
      blind: true
    };
    await ChatMessage.create(auditMessage);
  }
}
