import type {AbilityItemLike, AbilityTargetLike, AbilityUseOptions} from "../../abilities/ability-types";
import {ALL_ABILITY_COST_POOLS, abilityAllowedPools} from "../../abilities/ability-cost";
import {characterTargetFromToken, npcTargetFromToken} from "../../combat/combat-targets";
import {
  currentDifficultyVisibility,
  currentRollPolicyRequest,
  showGmRollAuditEnabled
} from "../../config/settings";
import {gmIntrusionController} from "../../intrusions/gm-intrusion-controller";
import type {PoolKey} from "../../rules/core/core-types";
import type {CombatCharacterLike} from "../../services/combat-service";
import type {SkillItemLike} from "../../services/skill-service";
import {promptNaturalAttackChoice} from "./combat-dialogs";
import {
  bindRollDialogPreview,
  difficultyFields,
  rollDialogDifficulty,
  rollDialogNumber,
  rollDialogShell,
  rollDialogText,
  selectOptions,
  situationalModifier,
  situationalModifierFields,
  skillRankOptions,
  type RollDialogData
} from "./roll-dialog";

function embeddedSkills(actor: CombatCharacterLike): readonly SkillItemLike[] {
  return [...actor.items]
    .filter((item): item is Item => item instanceof Item && item.type === "skill")
    .map((item) => item as unknown as SkillItemLike)
    .sort((left, right) => left.name.localeCompare(right.name));
}

function nativeTargets(): readonly AbilityTargetLike[] {
  return [...(game.user.targets ?? [])].flatMap((token) => {
    const npc = npcTargetFromToken(token);
    if (npc) return [npc];
    const character = characterTargetFromToken<Actor>(token);
    return character ? [character as unknown as AbilityTargetLike] : [];
  });
}

function abilityPoolField(ability: AbilityItemLike, requiresRoll: boolean): string {
  const allowedPools = abilityAllowedPools(ability);
  if (allowedPools.length === 1) {
    const pool = allowedPools[0]!;
    return `<input type="hidden" name="pool" value="${pool}"><div class="roll-dialog-context roll-dialog-fixed-pool"><strong>${game.i18n.localize("CYPHERV2.Pools.Pool")}</strong><span>${game.i18n.localize(`CYPHERV2.Pools.${pool[0]!.toUpperCase()}${pool.slice(1)}`)}</span></div>`;
  }
  if (!requiresRoll && allowedPools.length === 0) return "";
  const choices = allowedPools.length > 1 ? allowedPools : ALL_ABILITY_COST_POOLS;
  return `<label>${game.i18n.localize("CYPHERV2.Pools.Pool")}<select name="pool">${choices.map((pool) => `<option value="${pool}">${game.i18n.localize(`CYPHERV2.Pools.${pool[0]!.toUpperCase()}${pool.slice(1)}`)}</option>`).join("")}</select></label>`;
}

function skillOptions(actor: CombatCharacterLike): string {
  return [
    `<optgroup label="${game.i18n.localize("CYPHERV2.Roll.ManualSkillLevel")}">${skillRankOptions(0, "manual:")}</optgroup>`,
    `<optgroup label="${game.i18n.localize("CYPHERV2.Skill.Title")}">`,
    ...embeddedSkills(actor).map((skill) => `<option value="${skill.id}">${skill.name} — ${game.i18n.localize(`CYPHERV2.Skill.Ranks.${skill.system.rank}`)}</option>`),
    "</optgroup>"
  ].join("");
}

function selectedSkill(actor: CombatCharacterLike, data: RollDialogData): SkillItemLike | undefined {
  const id = rollDialogText(data, "skillId");
  return embeddedSkills(actor).find((skill) => skill.id === id);
}

function manualSkillSteps(data: RollDialogData): number {
  const value = rollDialogText(data, "skillId");
  return value.startsWith("manual:") ? Number(value.slice(7)) : 0;
}

function selectedPool(data: RollDialogData): PoolKey | undefined {
  const value = rollDialogText(data, "pool");
  return value === "might" || value === "speed" || value === "intellect" ? value : undefined;
}

export async function promptAbilityUse(
  actor: CombatCharacterLike,
  ability: AbilityItemLike
): Promise<void> {
  if (!game.cypherv2.services.abilities.canUse(ability)) return;
  const policyRequest = currentRollPolicyRequest();
  const enabled = policyRequest.enabledRuleModuleIds ?? [];
  const policy = game.cypherv2.rules.resolveDifficultyPolicy(policyRequest.base, enabled);
  const targets = ability.system.targetMode === "none" ? [] : nativeTargets();
  const npcTargets = targets.filter((target) => target.type === "npc");
  const requiresRoll = ability.system.roll !== "none";
  const targetSummary = ability.system.targetMode === "none"
    ? ""
    : `<div class="roll-dialog-context"><strong>${game.i18n.localize("CYPHERV2.Combat.Targets")}</strong><span>${targets.length ? targets.map((target) => target.name).join(", ") : game.i18n.localize("CYPHERV2.Common.None")}</span></div>`;

  if (!requiresRoll) {
    const data = await foundry.applications.api.DialogV2.input({
      window: {title: `${game.i18n.localize("CYPHERV2.Ability.Use")}: ${ability.name}`},
      content: `<div class="cypherv2 cypherv2-dialog-fields"><p><strong>${ability.name}</strong></p>${targetSummary}${abilityPoolField(ability, false)}</div>`,
      rejectClose: false,
      ok: {label: game.i18n.localize("CYPHERV2.Ability.Use")}
    }) as RollDialogData | null;
    if (!data) return;
    try {
      const pool = selectedPool(data);
      const outcome = await game.cypherv2.services.abilities.executeNoRoll(actor, ability, {
        ...(pool ? {pool} : {}),
        targets,
        enabledRuleModuleIds: enabled
      });
      await game.cypherv2.services.abilityChat.publishNoRoll(actor, outcome);
    } catch (error) {
      ui.notifications.error(error instanceof Error ? error.message : String(error));
    }
    return;
  }

  const difficulty = npcTargets.length > 0
    ? `<div class="roll-dialog-context"><strong>${game.i18n.localize("CYPHERV2.Roll.Difficulty")}</strong><span>${game.i18n.localize("CYPHERV2.Roll.HiddenValue")}</span></div>`
    : difficultyFields(policy.difficultyCeiling, true);
  const buildOptions = (data: RollDialogData): AbilityUseOptions => {
    const skill = selectedSkill(actor, data);
    const pool = selectedPool(data);
    return {
      ...(pool ? {pool} : {}),
      targets,
      difficulty: rollDialogDifficulty(data),
      ...(skill ? {skill} : {}),
      skillSteps: manualSkillSteps(data),
      assets: rollDialogNumber(data, "assets"),
      paidEffort: rollDialogNumber(data, "paidEffort"),
      damageEffort: rollDialogNumber(data, "damageEffort"),
      freeDamageEffort: rollDialogNumber(data, "freeDamageEffort"),
      freeEffort: rollDialogNumber(data, "freeEffort"),
      ...situationalModifier(data),
      enabledRuleModuleIds: enabled
    };
  };
  const buildRequest = (data: RollDialogData) => {
    const request = game.cypherv2.services.abilities.buildRollPlan(actor, ability, buildOptions(data)).requests[0];
    if (!request) throw new Error("Ability preview did not produce a roll request.");
    return request;
  };
  const settings = `
    ${targetSummary}
    ${difficulty}
    ${abilityPoolField(ability, true)}
    <label>${game.i18n.localize("CYPHERV2.Roll.SkillLevel")}<select name="skillId">${skillOptions(actor)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.Assets")}<select name="assets">${selectOptions(policy.assetLimit)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.EffortToEase")}<select name="paidEffort">${selectOptions(actor.system.derived.effort.max)}</select></label>
    ${ability.system.roll === "attack" ? `<label>${game.i18n.localize("CYPHERV2.Combat.DamageEffort")}<select name="damageEffort">${selectOptions(actor.system.derived.effort.max)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.FreeDamageEffort")}<input name="freeDamageEffort" type="number" value="0" min="0" step="1"></label>` : ""}
    <label>${game.i18n.localize("CYPHERV2.Roll.FreeEffort")}<input name="freeEffort" type="number" value="0" min="0" step="1"></label>
    ${situationalModifierFields()}`;
  const combatPolicy = game.cypherv2.services.combat.policy(enabled);
  const data = await foundry.applications.api.DialogV2.input({
    window: {title: `${game.i18n.localize("CYPHERV2.Ability.Use")}: ${ability.name}`, resizable: true},
    position: {width: 800},
    content: rollDialogShell({
      identity: ability.name,
      settings,
      ...(ability.system.roll === "attack" ? {attackSummary: " "} : {})
    }),
    rejectClose: false,
    ok: {label: game.i18n.localize("CYPHERV2.Roll.Roll")},
    render: (_event: Event, dialog: {element: HTMLElement}) => {
      bindRollDialogPreview(dialog.element, {
        actor,
        policyRequest,
        buildRequest,
        ...(ability.system.roll === "attack" ? {
          attackSummary: (_formData, prepared) => [
            `<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Combat.BaseDamage")}</span><strong>${ability.system.damage}</strong></div>`,
            `<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Roll.PaidDamageEffort")}</span><strong>${prepared.context.damageEffort ?? 0}</strong></div>`,
            ...((prepared.context.freeDamageEffort ?? 0) > 0 ? [`<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Roll.FreeDamageEffort")}</span><strong>${prepared.context.freeDamageEffort}</strong></div>`] : []),
            `<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Roll.TotalDamageEffort")}</span><strong>${prepared.damageEffortApplied}</strong></div>`,
            `<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Combat.DamagePerEffort")}</span><strong>${combatPolicy.damageEffortBonus}</strong></div>`,
            ...(ability.system.woundSeverity !== "none" ? [`<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Npc.WoundSeverity")}</span><strong>${game.i18n.localize(`CYPHERV2.Wounds.${ability.system.woundSeverity[0]!.toUpperCase()}${ability.system.woundSeverity.slice(1)}`)}</strong></div>`] : []),
            ...(ability.system.range ? [`<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Combat.Range.Label")}</span><strong>${ability.system.range}</strong></div>`] : [])
          ].join("")
        } : {})
      });
    }
  }) as RollDialogData | null;
  if (!data) return;

  try {
    let outcomes = await game.cypherv2.services.abilities.executeRoll(
      actor,
      ability,
      buildOptions(data),
      policyRequest
    );
    if (ability.system.roll === "attack") {
      const choice = await promptNaturalAttackChoice(outcomes);
      if (choice) outcomes = game.cypherv2.services.abilities.chooseAttackOutcomes(outcomes, choice);
    }
    for (const outcome of outcomes) {
      await game.cypherv2.services.abilityChat.publishRoll(
        actor,
        outcome,
        currentDifficultyVisibility(),
        showGmRollAuditEnabled()
      );
    }
    const first = outcomes[0];
    if (first) await gmIntrusionController().requestFreeFromNaturalResult(actor, first.execution.result);
  } catch (error) {
    ui.notifications.error(error instanceof Error ? error.message : String(error));
  }
}
