import {
  currentRollPolicyRequest,
  hiddenDifficultyEnabled
} from "../../config/settings";
import {SKILL_RANKS, type SkillRank} from "../../constants/system";
import type {PoolKey} from "../../rules/core/core-types";
import type {GMIntrusionCharacterLike} from "../../services/gm-intrusion-service";
import type {SkillItemLike} from "../../services/skill-service";
import {publishRollOutcome} from "./roll-outcome";
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
  skillRankSteps,
  type RollDialogData
} from "./roll-dialog";

function selected(value: string, expected: string): string {
  return value === expected ? " selected" : "";
}

function selectedRank(data: RollDialogData, fallback: SkillRank): SkillRank {
  const rank = rollDialogText(data, "skillRank") as SkillRank;
  return SKILL_RANKS.includes(rank) ? rank : fallback;
}

function skillRequest(
  skill: SkillItemLike,
  data: RollDialogData,
  enabledRuleModuleIds: readonly string[]
) {
  const pool = rollDialogText(data, "pool");
  return game.cypherv2.services.skills.buildRollRequest(skill, {
    ...(pool === "might" || pool === "speed" || pool === "intellect"
      ? {pool: pool as PoolKey}
      : {}),
    rankOverride: selectedRank(data, skill.system.rank),
    difficulty: rollDialogDifficulty(data),
    assets: rollDialogNumber(data, "assets"),
    paidEffort: rollDialogNumber(data, "paidEffort"),
    freeEffort: rollDialogNumber(data, "freeEffort"),
    ...situationalModifier(data),
    enabledRuleModuleIds
  });
}

export async function promptSkillRoll(
  actor: GMIntrusionCharacterLike,
  skill: SkillItemLike
): Promise<void> {
  const policyRequest = currentRollPolicyRequest();
  const enabled = policyRequest.enabledRuleModuleIds ?? [];
  const policy = game.cypherv2.rules.resolveDifficultyPolicy(policyRequest.base, enabled);
  const configuredPool = game.cypherv2.services.skills.configuredPool(skill) ?? "choose";
  const poolChoices = `
    ${configuredPool === "choose" ? `<option value="" selected disabled>${game.i18n.localize("CYPHERV2.Skill.ChoosePool")}</option>` : ""}
    <option value="might"${selected(configuredPool, "might")}>${game.i18n.localize("CYPHERV2.Pools.Might")}</option>
    <option value="speed"${selected(configuredPool, "speed")}>${game.i18n.localize("CYPHERV2.Pools.Speed")}</option>
    <option value="intellect"${selected(configuredPool, "intellect")}>${game.i18n.localize("CYPHERV2.Pools.Intellect")}</option>`;
  const rankChoices = SKILL_RANKS.map((rank) => (
    `<option value="${rank}"${rank === skill.system.rank ? " selected" : ""}>${game.i18n.localize(`CYPHERV2.Skill.Ranks.${rank}`)} · ${skillRankSteps(rank) === 0 ? game.i18n.localize("CYPHERV2.Roll.Unmodified") : skillRankSteps(rank) > 0 ? `+${skillRankSteps(rank)}` : skillRankSteps(rank)}</option>`
  )).join("");
  const settings = `
    ${difficultyFields(policy.difficultyCeiling, hiddenDifficultyEnabled())}
    <label>${game.i18n.localize("CYPHERV2.Pools.Pool")}<select name="pool">${poolChoices}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.SkillLevel")}<select name="skillRank">${rankChoices}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.Assets")}<select name="assets">${selectOptions(policy.assetLimit)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.EffortToEase")}<select name="paidEffort">${selectOptions(actor.system.derived.effort.max)}</select></label>
    <label>${game.i18n.localize("CYPHERV2.Roll.FreeEffort")}<input name="freeEffort" type="number" value="0" min="0" step="1"></label>
    ${situationalModifierFields()}`;

  const data = await foundry.applications.api.DialogV2.input({
    window: {title: `${game.i18n.localize("CYPHERV2.Skill.Roll")}: ${skill.name}`, resizable: true},
    position: {width: 800},
    content: rollDialogShell({identity: skill.name, settings}),
    rejectClose: false,
    ok: {label: game.i18n.localize("CYPHERV2.Roll.Roll")},
    render: (_event: Event, dialog: {element: HTMLElement}) => {
      bindRollDialogPreview(dialog.element, {
        actor,
        policyRequest,
        buildRequest: (formData) => skillRequest(skill, formData, enabled)
      });
    }
  }) as RollDialogData | null;
  if (!data) return;

  try {
    const request = skillRequest(skill, data, enabled);
    const execution = await game.cypherv2.services.rolls.execute(actor, request, policyRequest);
    await publishRollOutcome(actor, execution);
  } catch (error) {
    ui.notifications.error(error instanceof Error ? error.message : String(error));
  }
}
