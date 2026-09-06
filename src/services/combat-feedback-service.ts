import type {WoundSeverity} from "../constants/system";
import type {CombatTargetDocumentIdentity} from "../combat/combat-types";
import type {NpcDamageApplication} from "./combat-service";

export interface CombatFeedbackTarget extends CombatTargetDocumentIdentity {
  readonly id: string;
}

export interface CombatFeedbackService {
  npcDamage(target: CombatFeedbackTarget, result: NpcDamageApplication): Promise<void>;
  characterWound(target: CombatFeedbackTarget, severity: WoundSeverity): Promise<void>;
  shieldWound?(
    target: CombatFeedbackTarget,
    shieldName: string,
    severity: WoundSeverity,
    broken: boolean
  ): Promise<void>;
}

export class NoopCombatFeedbackService implements CombatFeedbackService {
  async npcDamage(): Promise<void> {}
  async characterWound(): Promise<void> {}
}

async function tokenObject(target: CombatFeedbackTarget): Promise<{
  readonly center: {readonly x: number; readonly y: number};
} | null> {
  if (target.tokenId) {
    const token = canvas.tokens?.get(target.tokenId);
    if (token?.center) return {center: token.center};
  }
  if (target.tokenUuid) {
    try {
      const document = await fromUuid(target.tokenUuid) as {
        readonly object?: {readonly center?: {readonly x: number; readonly y: number}} | null;
      } | null;
      if (document?.object?.center) {
        return {center: document.object.center};
      }
    } catch {
      // Never redirect feedback after the authoritative Token disappears.
    }
  }
  return null;
}

export class TokenCombatFeedbackService implements CombatFeedbackService {
  async #show(target: CombatFeedbackTarget, text: string, fill: string): Promise<void> {
    const token = await tokenObject(target);
    if (!token) return;
    await canvas.interface.createScrollingText(token.center, text, {
      anchor: CONST.TEXT_ANCHOR_POINTS.CENTER,
      direction: CONST.TEXT_ANCHOR_POINTS.TOP,
      duration: 1200,
      distance: 48,
      jitter: 0.15,
      textStyle: {fill, fontSize: 32, stroke: 0x000000, strokeThickness: 4}
    });
  }

  async npcDamage(target: CombatFeedbackTarget, result: NpcDamageApplication): Promise<void> {
    if (result.appliedDamage > 0) {
      await this.#show(target, `-${result.appliedDamage}`, "#ff5c5c");
    }
    if (result.previousHealth > 0 && result.health === 0) {
      await this.#show(target, game.i18n.localize("CYPHERV2.Combat.Feedback.Dead"), "#ff3030");
    }
  }

  async characterWound(target: CombatFeedbackTarget, severity: WoundSeverity): Promise<void> {
    await this.#show(target, game.i18n.format("CYPHERV2.Combat.Feedback.Wound", {
      severity: game.i18n.localize(`CYPHERV2.Wounds.Severity.${severity}`)
    }), "#ffb347");
  }

  async shieldWound(
    target: CombatFeedbackTarget,
    shieldName: string,
    severity: WoundSeverity,
    broken: boolean
  ): Promise<void> {
    const text = broken
      ? game.i18n.format("CYPHERV2.Shield.Feedback.Broken", {shield: shieldName})
      : game.i18n.format("CYPHERV2.Shield.Feedback.Wound", {
          shield: shieldName,
          severity: game.i18n.localize(`CYPHERV2.Wounds.Severity.${severity}`)
        });
    await this.#show(target, text, broken ? "#ff5c5c" : "#7dcfff");
  }
}
