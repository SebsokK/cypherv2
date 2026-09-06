import {
  currentDifficultyVisibility,
  currentRollPolicyRequest,
  showGmRollAuditEnabled
} from "../../config/settings";
import {gmIntrusionController} from "../../intrusions/gm-intrusion-controller";
import type {DefenseType, WoundSeverity} from "../../constants/system";
import type {NpcTargetLike, WeaponItemLike} from "../../combat/combat-types";
import type {
  CombatCharacterLike,
  DefenseRollOptions,
  WeaponAttackOptions,
  WeaponAttackOutcome
} from "../../services/combat-service";
import type {SkillItemLike} from "../../services/skill-service";
import {characterTargetFromToken} from "../../combat/combat-targets";
import {
  bindRollDialogPreview,
  difficultyFields,
  poolOptions,
  rollDialogDifficulty,
  rollDialogNumber,
  rollDialogShell,
  rollDialogText,
  selectOptions as rollSelectOptions,
  situationalModifier,
  situationalModifierFields,
  skillRankOptions,
  skillRankSteps,
  type RollDialogData
} from "./roll-dialog";

type DialogData = Record<string, unknown>;

function stringValue(data: DialogData, key: string): string {
  return String(data[key] ?? "");
}

function skills(actor: CombatCharacterLike): SkillItemLike[] {
  return [...actor.items]
    .filter((item): item is Item => item instanceof Item && item.type === "skill")
    .map((item) => item as unknown as SkillItemLike)
    .sort((left, right) => left.name.localeCompare(right.name));
}

function skillOptions(actor: CombatCharacterLike, selectedValue = "manual:0"): string {
  const manualSteps = selectedValue.startsWith("manual:")
    ? Number(selectedValue.slice(7))
    : null;
  return [
    `<optgroup label="${game.i18n.localize("CYPHERV2.Roll.ManualSkillLevel")}">${skillRankOptions(manualSteps, "manual:")}</optgroup>`,
    `<optgroup label="${game.i18n.localize("CYPHERV2.Skill.Title")}">`,
    ...skills(actor).map((skill) => (
      `<option value="${skill.id}"${skill.id === selectedValue ? " selected" : ""}>${skill.name} — ${game.i18n.localize(`CYPHERV2.Skill.Ranks.${skill.system.rank}`)}</option>`
    )),
    "</optgroup>"
  ].join("");
}

function findSkill(actor: CombatCharacterLike, id: string): SkillItemLike | undefined {
  return skills(actor).find((skill) => skill.id === id);
}

function manualSkillSteps(data: RollDialogData): number {
  const value = rollDialogText(data, "skillId");
  return value.startsWith("manual:") ? Number(value.slice(7)) : 0;
}

export function defenseDialogDefaults(
  actor: CombatCharacterLike,
  defenseType: DefenseType
): {readonly pool: "might" | "speed"; readonly armorDirection: "ease" | "hinder"; readonly armorSteps: number} {
  const dodge = defenseType === "dodge";
  return {
    pool: dodge ? "speed" : "might",
    armorDirection: dodge ? "hinder" : "ease",
    armorSteps: dodge
      ? actor.system.derived.combat.armor.dodgeHindrance
      : actor.system.derived.combat.armor.blockEase
  };
}

export async function promptNaturalAttackChoice(
  outcomes: readonly {readonly execution: WeaponAttackOutcome["execution"]}[]
): Promise<"damage" | "effect" | null> {
  const available = outcomes.flatMap((outcome) => outcome.execution.result.naturalEffects)
    .find((effect) => effect.status === "available");
  if (!available) return null;
  const natural = outcomes[0]?.execution.result.naturalRoll ?? 19;
  const data = await foundry.applications.api.DialogV2.input({
    window: {title: game.i18n.localize("CYPHERV2.Combat.NaturalChoice.Title")},
    content: `<div class="cypherv2-dialog-fields">
      <p>${game.i18n.format("CYPHERV2.Combat.NaturalChoice.Prompt", {natural})}</p>
      <label>${game.i18n.localize("CYPHERV2.Combat.NaturalChoice.Label")}
        <select name="choice">
          <option value="damage">${game.i18n.localize(natural === 19 ? "CYPHERV2.Roll.NaturalEffects.Damage19" : "CYPHERV2.Roll.NaturalEffects.Damage20")}</option>
          <option value="effect">${game.i18n.localize(natural === 19 ? "CYPHERV2.Roll.NaturalEffects.Minor" : "CYPHERV2.Roll.NaturalEffects.Major")}</option>
        </select>
      </label>
    </div>`,
    rejectClose: false,
    ok: {label: game.i18n.localize("CYPHERV2.Actions.Apply")}
  }) as DialogData | null;
  if (!data) return "effect";
  return stringValue(data, "choice") === "damage" ? "damage" : "effect";
}

export async function promptWeaponAttack(
  actor: CombatCharacterLike,
  weapon: WeaponItemLike
): Promise<void> {
  const policyRequest = currentRollPolicyRequest();
  const enabled = policyRequest.enabledRuleModuleIds ?? [];
  const policy = game.cypherv2.rules.resolveDifficultyPolicy(policyRequest.base, enabled);
  const combatPolicy = game.cypherv2.services.combat.policy(enabled);
  const targets = game.cypherv2.services.targets.nativeNpcTargets();
  const hasTargets = targets.length > 0;
  const targetContent = hasTargets
    ? `<div class="roll-dialog-context"><strong>${game.i18n.localize("CYPHERV2.Combat.Targets")}</strong><span>${targets.map((target) => target.name).join(", ")}</span><small>${game.i18n.localize("CYPHERV2.Combat.HiddenTargetDifficulty")}</small></div>`
    : difficultyFields(policy.difficultyCeiling, true);
  const defaultPool = game.cypherv2.services.combat.weaponAttackPool(weapon);
  const defaultSkillValue = `manual:${skillRankSteps(weapon.system.skillLevel ?? "untrained")}`;
  const buildOptions = (data: RollDialogData): WeaponAttackOptions => {
    const selectedSkill = findSkill(actor, rollDialogText(data, "skillId"));
    return {
      pool: rollDialogText(data, "pool") as "might" | "speed" | "intellect",
      targets,
      difficulty: rollDialogDifficulty(data),
      ...(selectedSkill ? {skill: selectedSkill} : {}),
      skillSteps: manualSkillSteps(data),
      assets: rollDialogNumber(data, "assets"),
      paidEffort: rollDialogNumber(data, "paidEffort"),
      damageEffort: rollDialogNumber(data, "damageEffort"),
      freeDamageEffort: rollDialogNumber(data, "freeDamageEffort"),
      freeEffort: rollDialogNumber(data, "freeEffort"),
      ...situationalModifier(data),
      extremeRange: rollDialogText(data, "extremeRange") === "true"
        || data.extremeRange === true
        || data.extremeRange === "on",
      enabledRuleModuleIds: enabled
    };
  };
  const buildRequest = (data: RollDialogData) => {
    const request = game.cypherv2.services.combat.buildWeaponAttackPlan(actor, weapon, buildOptions(data)).requests[0];
    if (!request) throw new Error("Weapon attack preview did not produce a roll request.");
    return request;
  };
  const baseDamage = game.cypherv2.services.combat.weaponBaseDamage(weapon, combatPolicy);
  const settings = `
    ${targetContent}
    <label>${game.i18n.localize("CYPHERV2.Pools.Pool")}<select name="pool">${poolOptions(defaultPool)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.SkillLevel")}<select name="skillId">${skillOptions(actor, defaultSkillValue)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.Assets")}<select name="assets">${rollSelectOptions(policy.assetLimit)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.EffortToEase")}<select name="paidEffort">${rollSelectOptions(actor.system.derived.effort.max)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Combat.DamageEffort")}<select name="damageEffort">${rollSelectOptions(actor.system.derived.effort.max)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.FreeDamageEffort")}<input name="freeDamageEffort" type="number" value="0" min="0" step="1"></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.FreeEffort")}<input name="freeEffort" type="number" value="0" min="0" step="1"></label>
    ${situationalModifierFields()}
    ${weapon.system.attackType === "ranged" ? `<label class="roll-dialog-checkbox"><input name="extremeRange" type="checkbox"> ${game.i18n.localize("CYPHERV2.Combat.Weapon.ExtremeRange")}</label>` : ""}`;
  const data = await foundry.applications.api.DialogV2.input({
    window: {title: `${game.i18n.localize("CYPHERV2.Combat.Attack")}: ${weapon.name}`, resizable: true},
    position: {width: 800},
    content: rollDialogShell({identity: weapon.name, settings, attackSummary: " "}),
    rejectClose: false,
    ok: {label: game.i18n.localize("CYPHERV2.Combat.Attack")},
    render: (_event: Event, dialog: {element: HTMLElement}) => {
      bindRollDialogPreview(dialog.element, {
        actor,
        policyRequest,
        buildRequest,
        attackSummary: (formData, prepared) => [
          `<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Combat.BaseDamage")}</span><strong>${baseDamage}</strong></div>`,
          `<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Roll.PaidDamageEffort")}</span><strong>${prepared.context.damageEffort ?? 0}</strong></div>`,
          ...((prepared.context.freeDamageEffort ?? 0) > 0 ? [`<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Roll.FreeDamageEffort")}</span><strong>${prepared.context.freeDamageEffort}</strong></div>`] : []),
          `<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Roll.TotalDamageEffort")}</span><strong>${prepared.damageEffortApplied}</strong></div>`,
          `<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Combat.DamagePerEffort")}</span><strong>${combatPolicy.damageEffortBonus}</strong></div>`,
          ...(weapon.system.rangeCategory !== "immediate" ? [`<div class="roll-summary-row"><span>${game.i18n.localize("CYPHERV2.Combat.Range.Label")}</span><strong>${game.i18n.localize(`CYPHERV2.Combat.Range.${weapon.system.rangeCategory}`)}</strong></div>`] : []),
          ...(rollDialogText(formData, "extremeRange") === "true" || formData.extremeRange === true ? [`<div class="roll-summary-row is-hindrance"><span>${game.i18n.localize("CYPHERV2.Combat.Weapon.ExtremeRange")}</span><strong>-1</strong></div>`] : [])
        ].join("")
      });
    }
  }) as RollDialogData | null;
  if (!data) return;

  try {
    let outcomes = await game.cypherv2.services.combat.executeWeaponAttack(
      actor,
      weapon,
      buildOptions(data),
      policyRequest
    );
    const choice = await promptNaturalAttackChoice(outcomes);
    if (choice) outcomes = game.cypherv2.services.combat.chooseAttackOutcomes(
      outcomes,
      choice,
      enabled
    );
    for (const outcome of outcomes) {
      await game.cypherv2.services.combatChat.publishWeaponAttack(
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

export async function promptDefenseRoll(
  actor: CombatCharacterLike,
  defenseType: DefenseType,
  request?: {readonly source: NpcTargetLike; readonly woundSeverity: WoundSeverity}
): Promise<boolean> {
  if (defenseType === "blockWithShield") {
    try {
      const shield = await game.cypherv2.services.shields.normalizeEquipped(actor);
      if (!shield || game.cypherv2.services.shields.isBroken(shield)) {
        ui.notifications.warn(game.i18n.localize("CYPHERV2.Shield.BlockUnavailable"));
        return false;
      }
    } catch (error) {
      ui.notifications.error(error instanceof Error ? error.message : String(error));
      return false;
    }
  }
  const policyRequest = currentRollPolicyRequest();
  const enabled = policyRequest.enabledRuleModuleIds ?? [];
  const policy = game.cypherv2.rules.resolveDifficultyPolicy(policyRequest.base, enabled);
  const difficultyControl = request
    ? `<div class="roll-dialog-context"><strong>${request.source.name} → ${actor.name}</strong><small>${game.i18n.localize("CYPHERV2.Combat.HiddenTargetDifficulty")}</small></div>`
    : difficultyFields(policy.difficultyCeiling, true);
  const defaultSkill = game.cypherv2.services.combat.applicableDefenseSkills(
    actor,
    defenseType,
    enabled
  )[0];
  const defaults = defenseDialogDefaults(actor, defenseType);
  const buildOptions = (data: RollDialogData): Omit<DefenseRollOptions, "difficulty" | "source"> => {
    const selectedSkill = findSkill(actor, rollDialogText(data, "skillId"));
    return {
      ...(selectedSkill ? {skill: selectedSkill} : {}),
      skillSteps: manualSkillSteps(data),
      assets: rollDialogNumber(data, "assets"),
      paidEffort: rollDialogNumber(data, "paidEffort"),
      freeEffort: rollDialogNumber(data, "freeEffort"),
      ...situationalModifier(data),
      enabledRuleModuleIds: enabled
    };
  };
  const buildRequest = (data: RollDialogData) => request
    ? game.cypherv2.services.combat.buildDefenseAgainstNpcRequest(
        actor,
        request.source,
        defenseType,
        buildOptions(data)
      )
    : game.cypherv2.services.combat.buildDefenseRequest(actor, defenseType, {
        ...buildOptions(data),
        difficulty: rollDialogDifficulty(data)
      });
  const settings = `
    ${difficultyControl}
    <div class="roll-dialog-context roll-dialog-fixed-pool"><strong>${game.i18n.localize("CYPHERV2.Pools.Pool")}</strong><span>${game.i18n.localize(`CYPHERV2.Pools.${defaults.pool === "speed" ? "Speed" : "Might"}`)}</span></div>
    <label>${game.i18n.localize("CYPHERV2.Roll.SkillLevel")}<select name="skillId">${skillOptions(actor, defaultSkill?.id)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.Assets")}<select name="assets">${rollSelectOptions(policy.assetLimit)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.EffortToEase")}<select name="paidEffort">${rollSelectOptions(actor.system.derived.effort.max)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.FreeEffort")}<input name="freeEffort" type="number" value="0" min="0" step="1"></label>
    ${situationalModifierFields()}`;
  const data = await foundry.applications.api.DialogV2.input({
    window: {title: game.i18n.localize(`CYPHERV2.Combat.Defense.${defenseType}`), resizable: true},
    position: {width: 800},
    content: rollDialogShell({
      identity: game.i18n.localize(`CYPHERV2.Combat.Defense.${defenseType}`),
      settings
    }),
    rejectClose: false,
    ok: {label: game.i18n.localize("CYPHERV2.Roll.Roll")},
    render: (_event: Event, dialog: {element: HTMLElement}) => {
      bindRollDialogPreview(dialog.element, {actor, policyRequest, buildRequest});
    }
  }) as RollDialogData | null;
  if (!data) return false;

  try {
    const requestData = buildRequest(data);
    const execution = await game.cypherv2.services.rolls.execute(actor, requestData, policyRequest);
    const woundResolution = request
      ? await game.cypherv2.services.combat.resolveDefenseWound(
          actor,
          execution.result,
          defenseType,
          request.woundSeverity,
          request.source,
          enabled
        )
      : null;
    const resolvedConsequence = woundResolution ?? {
      recipient: "none" as const,
      severity: "none" as const
    };
    await game.cypherv2.services.combatChat.publishDefense(
      actor,
      execution,
      resolvedConsequence,
      request?.source ?? null,
      currentDifficultyVisibility(),
      showGmRollAuditEnabled()
    );
    await gmIntrusionController().requestFreeFromNaturalResult(actor, execution.result);
    return true;
  } catch (error) {
    ui.notifications.error(error instanceof Error ? error.message : String(error));
    return false;
  }
}

export async function requestNpcAttack(source: NpcTargetLike): Promise<void> {
  if (!game.user.isGM) return;
  const targets = [...(game.user.targets ?? [])]
    .map((token) => characterTargetFromToken<Actor>(token))
    .filter((actor): actor is Actor & import("../../combat/combat-types").CombatTargetDocumentIdentity => actor !== null)
    .map((actor) => actor as unknown as CombatCharacterLike);
  if (targets.length === 0) {
    ui.notifications.warn(game.i18n.localize("CYPHERV2.Combat.NoCharacterTargets"));
    return;
  }
  const allowed: DefenseType[] = [];
  if (source.system.damage.defense.allowBlock) allowed.push("block");
  if (source.system.damage.defense.allowDodge) allowed.push("dodge");
  if (allowed.length === 0) {
    ui.notifications.warn(game.i18n.localize("CYPHERV2.Combat.NoDefenseAllowed"));
    return;
  }
  for (const target of targets) {
    await game.cypherv2.services.combatChat.createDefenseRequest(
      source,
      target,
      source.system.damage.woundSeverity,
      allowed
    );
  }
}
