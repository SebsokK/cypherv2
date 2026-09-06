import type {
  AbilityNoRollOutcome,
  AbilityPaymentOutcome,
  AbilityRollOutcome,
  AbilityTargetLike
} from "../abilities/ability-types";
import {actionTargetIdentity, type RollChatCombatPresentation} from "../combat/combat-chat-types";
import {combatTargetIdentity} from "../combat/combat-types";
import {targetIdentityFromDocument} from "../combat/combat-targets";
import type {CombatCharacterLike} from "./combat-service";
import type {DifficultyVisibility} from "./roll-chat-service";
import {RollChatService} from "./roll-chat-service";
import {chatCardActorImageData} from "./chat-card-presentation";

function targetIdentity(target: AbilityTargetLike) {
  return target.type === "npc" ? combatTargetIdentity(target) : targetIdentityFromDocument(target);
}

function consequence(
  outcome: Pick<AbilityRollOutcome, "target" | "grossDamage" | "woundSeverity" | "ability">,
  sourceActorId: string
): RollChatCombatPresentation {
  const target = outcome.target;
  if (!target) return {};
  if (target.type === "npc" && outcome.grossDamage > 0) {
    return {
      damage: outcome.grossDamage,
      action: {
        kind: "npcDamage",
        ...actionTargetIdentity(targetIdentity(target)),
        requestedDamage: outcome.grossDamage,
        applied: false
      }
    };
  }
  if (target.type === "character" && outcome.woundSeverity !== "none") {
    return {
      woundSeverity: outcome.woundSeverity,
      action: {
        kind: "characterWound",
        ...actionTargetIdentity(targetIdentity(target)),
        severity: outcome.woundSeverity,
        sourceActorId,
        sourceName: outcome.ability.name,
        applied: false
      }
    };
  }
  return {};
}

export class AbilityChatService {
  readonly #rollChat: RollChatService;

  constructor(rollChat: RollChatService) {
    this.#rollChat = rollChat;
  }

  async publishRoll(
    actor: CombatCharacterLike,
    outcome: AbilityRollOutcome,
    visibility: DifficultyVisibility,
    showGmAudit = false
  ): Promise<void> {
    const successful = outcome.execution.result.success === true;
    const damageCanBePresented = outcome.execution.result.success !== false;
    const consequenceData = successful
      ? consequence(outcome, actor.id)
      : {};
    const combat = {
      ...consequenceData,
      ...(damageCanBePresented && outcome.ability.system.roll === "attack" ? {
        damage: outcome.grossDamage,
        damageBreakdown: [
          {label: "CYPHERV2.Ability.DamageBreakdown.Base", value: outcome.baseDamage},
          ...(outcome.effortDamage ? [{label: "CYPHERV2.Combat.DamageBreakdown.Effort", value: outcome.effortDamage, additive: true}] : []),
          ...(outcome.naturalDamage ? [{label: "CYPHERV2.Combat.DamageBreakdown.Natural", value: outcome.naturalDamage, additive: true}] : [])
        ]
      } : {})
    };
    await this.#rollChat.publish(actor, outcome.execution, visibility, {combat, showGmAudit});
  }

  async publishNoRoll(actor: CombatCharacterLike, outcome: AbilityNoRollOutcome): Promise<void> {
    const targets: readonly (AbilityTargetLike | null)[] = outcome.targets.length
      ? outcome.targets
      : [null];
    for (const target of targets) {
      const combat = target ? consequence({
        ability: outcome.ability,
        target,
        grossDamage: outcome.ability.system.damage,
        woundSeverity: outcome.ability.system.woundSeverity
      }, actor.id) : {};
      const action = combat.action;
      const content = await foundry.applications.handlebars.renderTemplate(
        "systems/cypherv2/templates/chat/ability-card.hbs",
        {
          abilityName: outcome.ability.name,
          actorName: actor.name,
          ...chatCardActorImageData(actor as unknown as import("./chat-card-presentation").ChatCardActorLike),
          activation: game.i18n.localize(`CYPHERV2.Ability.Activation.${outcome.ability.system.activation}`),
          poolLabel: outcome.pool
            ? game.i18n.localize(`CYPHERV2.Pools.${outcome.pool[0]!.toUpperCase()}${outcome.pool.slice(1)}`)
            : "",
          costPaid: outcome.costPaid,
          targetName: target?.name ?? "",
          damage: combat.damage,
          woundSeverity: combat.woundSeverity
            ? game.i18n.localize(`CYPHERV2.Wounds.Severity.${combat.woundSeverity}`)
            : "",
          combatAction: Boolean(action),
          combatActionLabel: action
            ? game.i18n.localize(action.kind === "npcDamage"
              ? "CYPHERV2.Combat.ApplyDamage"
              : "CYPHERV2.Combat.ApplyWound")
            : ""
        }
      );
      const message: Record<string, unknown> = {
        speaker: ChatMessage.getSpeaker({actor: actor as unknown as Actor}),
        content
      };
      if (action) message.flags = {cypherv2: {combatAction: action}};
      await ChatMessage.create(message);
    }
  }

  async publishPayment(actor: CombatCharacterLike, outcome: AbilityPaymentOutcome): Promise<void> {
    const poolLabel = game.i18n.localize(
      `CYPHERV2.Pools.${outcome.pool[0]!.toUpperCase()}${outcome.pool.slice(1)}`
    );
    const content = await foundry.applications.handlebars.renderTemplate(
      "systems/cypherv2/templates/chat/ability-payment-card.hbs",
      {
        abilityName: outcome.ability.name,
        actorName: actor.name,
        ...chatCardActorImageData(actor as unknown as import("./chat-card-presentation").ChatCardActorLike),
        poolLabel,
        listedCost: outcome.listedCost,
        ignoresEdge: outcome.ignoresEdge,
        edgeApplied: outcome.edgeApplied,
        costPaid: outcome.costPaid,
        currentBefore: outcome.currentBefore,
        currentAfter: outcome.currentAfter
      }
    );
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({actor: actor as unknown as Actor}),
      content
    });
  }
}
