import type {
  AdvancementRequest,
  CoreAdvancementKind,
  OtherAdvancementKind
} from "../../advancement/advancement-types";
import {OTHER_ADVANCEMENT_KINDS} from "../../advancement/advancement-types";
import {currentEnabledRuleModuleIds} from "../../config/settings";
import type {PoolKey} from "../../rules/core/core-types";
import {
  AdvancementError,
  type AdvancementCharacterLike
} from "../../services/advancement-service";
import {effectiveTier} from "../../rules/core/character-overrides";

type DialogData = Record<string, unknown>;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]!);
}

const ERROR_KEYS: Record<AdvancementError["code"], string> = {
  "not-character": "CYPHERV2.Advancement.Errors.NotCharacter",
  "cycle-complete": "CYPHERV2.Advancement.Errors.CycleComplete",
  "already-purchased": "CYPHERV2.Advancement.Errors.AlreadyPurchased",
  "other-already-purchased": "CYPHERV2.Advancement.Errors.OtherAlreadyPurchased",
  "insufficient-xp": "CYPHERV2.Advancement.Errors.InsufficientXP",
  "invalid-allocation": "CYPHERV2.Advancement.Errors.InvalidAllocation",
  "effort-maximum": "CYPHERV2.Advancement.Errors.EffortMaximum",
  "skill-not-found": "CYPHERV2.Advancement.Errors.SkillNotFound",
  "duplicate-skill": "CYPHERV2.Advancement.Errors.DuplicateSkill",
  "skill-maximum": "CYPHERV2.Advancement.Errors.SkillMaximum",
  "skill-tier": "CYPHERV2.Advancement.Errors.SkillTier",
  "genre-tier": "CYPHERV2.Advancement.Errors.GenreTier",
  "tier-not-ready": "CYPHERV2.Advancement.Errors.TierNotReady"
};

function value(data: DialogData, name: string): string {
  return String(data[name] ?? "");
}

function number(data: DialogData, name: string): number {
  return Number(data[name] ?? 0);
}

function poolOptions(): string {
  return (["might", "speed", "intellect"] as const).map((pool) => (
    `<option value="${pool}">${game.i18n.localize(`CYPHERV2.Pools.${pool[0]!.toUpperCase()}${pool.slice(1)}`)}</option>`
  )).join("");
}

async function input(title: string, content: string): Promise<DialogData | null> {
  return foundry.applications.api.DialogV2.input({
    window: {title},
    content: `<div class="cypherv2-dialog-fields">${content}</div>`,
    rejectClose: false,
    ok: {label: game.i18n.localize("CYPHERV2.Advancement.Purchase")}
  }) as Promise<DialogData | null>;
}

function notifyError(error: unknown): void {
  if (error instanceof AdvancementError) {
    ui.notifications.error(game.i18n.localize(ERROR_KEYS[error.code]));
  } else {
    console.error(error);
    ui.notifications.error(game.i18n.localize("CYPHERV2.Advancement.Errors.Unexpected"));
  }
}

async function requestFor(
  actor: AdvancementCharacterLike,
  kind: CoreAdvancementKind | "other"
): Promise<AdvancementRequest | null> {
  const title = game.i18n.localize(`CYPHERV2.Advancement.Option.${kind}`);
  if (kind === "increaseCapabilities") {
    const data = await input(title, `
      <p>${game.i18n.localize("CYPHERV2.Advancement.CapabilitiesPrompt")}</p>
      <label>${game.i18n.localize("CYPHERV2.Pools.Might")}<input name="might" type="number" min="0" max="4" value="0"></label>
      <label>${game.i18n.localize("CYPHERV2.Pools.Speed")}<input name="speed" type="number" min="0" max="4" value="0"></label>
      <label>${game.i18n.localize("CYPHERV2.Pools.Intellect")}<input name="intellect" type="number" min="0" max="4" value="0"></label>`);
    return data ? {kind, allocation: {
      might: number(data, "might"), speed: number(data, "speed"), intellect: number(data, "intellect")
    }} : null;
  }
  if (kind === "moveTowardPerfection") {
    const data = await input(title, `<label>${game.i18n.localize("CYPHERV2.Advancement.ChoosePool")}<select name="pool">${poolOptions()}</select></label>`);
    return data ? {kind, pool: value(data, "pool") as PoolKey} : null;
  }
  if (kind === "skillTraining") {
    const modeData = await input(title, `<label>${game.i18n.localize("CYPHERV2.Advancement.SkillMode")}<select name="mode">
      <option value="learn">${game.i18n.localize("CYPHERV2.Advancement.LearnNewSkill")}</option>
      <option value="improve">${game.i18n.localize("CYPHERV2.Advancement.ImproveExistingSkill")}</option>
    </select></label>`);
    if (!modeData) return null;
    if (value(modeData, "mode") === "learn") {
      const sources = [...game.items]
        .filter((item) => item.type === "skill")
        .sort((left, right) => left.name.localeCompare(right.name));
      const data = await input(title, `
        <label>${game.i18n.localize("CYPHERV2.Advancement.SkillSource")}<select name="sourceUuid">
          <option value="custom">${game.i18n.localize("CYPHERV2.Advancement.CustomSkill")}</option>
          ${sources.map((item) => `<option value="${escapeHtml(item.uuid)}">${escapeHtml(item.name)}</option>`).join("")}
        </select></label>
        <label>${game.i18n.localize("CYPHERV2.Advancement.CustomSkillName")}<input name="customName" type="text"></label>
        <label>${game.i18n.localize("CYPHERV2.Skill.Category")}<select name="customCategory">
          <option value="general">${game.i18n.localize("CYPHERV2.Advancement.SkillCategory.general")}</option>
          <option value="attack">${game.i18n.localize("CYPHERV2.Advancement.SkillCategory.attack")}</option>
          <option value="defense">${game.i18n.localize("CYPHERV2.Advancement.SkillCategory.defense")}</option>
        </select></label>`);
      if (!data) return null;
      const sourceUuid = value(data, "sourceUuid");
      return sourceUuid === "custom"
        ? {
          kind,
          mode: "learn",
          customName: value(data, "customName"),
          customCategory: value(data, "customCategory") as "general" | "attack" | "defense"
        }
        : {kind, mode: "learn", sourceUuid};
    }
    const options = game.cypherv2.services.advancement.skillTrainingOptions(
      actor,
      currentEnabledRuleModuleIds()
    );
    const eligible = options.filter((entry) => entry.eligible);
    if (eligible.length === 0) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Advancement.NoEligibleSkills"));
      return null;
    }
    const data = await input(title, `<label>${game.i18n.localize("CYPHERV2.Advancement.ChooseSkill")}<select name="skillId">${eligible.map((entry) => (
      `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.name)} — ${game.i18n.localize(`CYPHERV2.Skill.Ranks.${entry.currentRank}`)} → ${game.i18n.localize(`CYPHERV2.Skill.Ranks.${entry.nextRank}`)}</option>`
    )).join("")}</select></label>`);
    return data ? {kind, mode: "improve", skillId: value(data, "skillId")} : null;
  }
  if (kind === "other") {
    const availableKinds = OTHER_ADVANCEMENT_KINDS.filter((entry) => (
      entry !== "genre" || effectiveTier(actor.system) >= 3
    ));
    const data = await input(title, `<label>${game.i18n.localize("CYPHERV2.Advancement.OtherType")}<select name="otherKind">${availableKinds.map((entry) => (
      `<option value="${entry}">${game.i18n.localize(`CYPHERV2.Advancement.Other.${entry}`)}</option>`
    )).join("")}</select></label>`);
    return data ? {kind, otherKind: value(data, "otherKind") as OtherAdvancementKind} : null;
  }
  return {kind};
}

export async function promptPurchaseAdvancement(
  actor: AdvancementCharacterLike,
  kind: CoreAdvancementKind | "other"
): Promise<void> {
  const request = await requestFor(actor, kind);
  if (!request) return;
  try {
    const result = await game.cypherv2.services.advancement.purchase(
      actor,
      request,
      currentEnabledRuleModuleIds()
    );
    ui.notifications.info(game.i18n.format("CYPHERV2.Advancement.PurchasedNotice", {
      resourcePoints: result.resourcePointsGranted
    }));
  } catch (error) {
    notifyError(error);
  }
}

export async function promptAdvanceTier(actor: AdvancementCharacterLike): Promise<void> {
  try {
    const result = await game.cypherv2.services.advancement.advanceTier(
      actor,
      currentEnabledRuleModuleIds()
    );
    ui.notifications.info(game.i18n.format("CYPHERV2.Advancement.TierAdvancedNotice", {tier: result.tier}));
  } catch (error) {
    notifyError(error);
  }
}
