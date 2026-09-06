import {currentDifficultyVisibility, showGmRollAuditEnabled} from "../../config/settings";
import {gmIntrusionController} from "../../intrusions/gm-intrusion-controller";
import type {RollExecution} from "../../rolls/roll-types";
import type {GMIntrusionCharacterLike} from "../../services/gm-intrusion-service";

export async function publishRollOutcome(
  actor: GMIntrusionCharacterLike,
  execution: RollExecution
): Promise<void> {
  await game.cypherv2.services.rollChat.publish(actor, execution, currentDifficultyVisibility(), {
    showGmAudit: showGmRollAuditEnabled()
  });
  await gmIntrusionController().requestFreeFromNaturalResult(actor, execution.result);
}
