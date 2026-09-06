import {
  currentRollPolicyRequest,
  hiddenDifficultyEnabled
} from "../../config/settings";
import type {PoolKey} from "../../rules/core/core-types";
import type {CharacterRollRequest} from "../../rolls/roll-types";
import type {RollCharacterDocumentLike} from "../../services/roll-service";
import {publishRollOutcome} from "./roll-outcome";
import {
  bindRollDialogPreview,
  difficultyFields,
  poolOptions,
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

export function genericTaskRequest(data: RollDialogData): CharacterRollRequest {
  return {
    label: "CYPHERV2.Roll.TaskRoll",
    pool: rollDialogText(data, "pool") as PoolKey,
    difficulty: rollDialogDifficulty(data),
    skillSteps: rollDialogNumber(data, "skillSteps"),
    assets: rollDialogNumber(data, "assets"),
    paidEffort: rollDialogNumber(data, "paidEffort"),
    freeEffort: rollDialogNumber(data, "freeEffort"),
    ...situationalModifier(data),
    purpose: "task"
  };
}

function notifyError(error: unknown): void {
  ui.notifications.error(error instanceof Error ? error.message : String(error));
}

export async function promptTestRoll(
  actor: RollCharacterDocumentLike,
  selectedPool: PoolKey = "might"
): Promise<void> {
  const policyRequest = currentRollPolicyRequest();
  const policy = game.cypherv2.rules.resolveDifficultyPolicy(
    policyRequest.base,
    policyRequest.enabledRuleModuleIds ?? []
  );
  const settings = `
    ${difficultyFields(policy.difficultyCeiling, hiddenDifficultyEnabled())}
    <label>${game.i18n.localize("CYPHERV2.Pools.Pool")}
      <select name="pool">${poolOptions(selectedPool)}</select>
    </label>
    <label>${game.i18n.localize("CYPHERV2.Roll.SkillLevel")}
      <select name="skillSteps">${skillRankOptions()}</select>
    </label>
    <label>${game.i18n.localize("CYPHERV2.Roll.Assets")}
      <select name="assets">${selectOptions(policy.assetLimit)}</select>
    </label>
    <label>${game.i18n.localize("CYPHERV2.Roll.EffortToEase")}
      <select name="paidEffort">${selectOptions(actor.system.derived.effort.max)}</select>
    </label>
    <label>${game.i18n.localize("CYPHERV2.Roll.FreeEffort")}
      <input name="freeEffort" type="number" value="0" min="0" step="1">
    </label>
    ${situationalModifierFields()}`;
  const data = await foundry.applications.api.DialogV2.input({
    window: {title: game.i18n.localize("CYPHERV2.Roll.TaskRoll"), resizable: true},
    position: {width: 800},
    content: rollDialogShell({
      identity: `${actor.name} · ${game.i18n.localize("CYPHERV2.Roll.Task")}`,
      settings
    }),
    rejectClose: false,
    ok: {label: game.i18n.localize("CYPHERV2.Roll.Roll")},
    render: (_event: Event, dialog: {element: HTMLElement}) => {
      bindRollDialogPreview(dialog.element, {
        actor,
        policyRequest,
        buildRequest: genericTaskRequest
      });
    }
  }) as RollDialogData | null;
  if (!data) return;

  try {
    const execution = await game.cypherv2.services.rolls.execute(
      actor,
      genericTaskRequest(data),
      policyRequest
    );
    await publishRollOutcome(actor, execution);
  } catch (error) {
    notifyError(error);
  }
}
