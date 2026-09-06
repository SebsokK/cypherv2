import {SKILL_RANKS, type SkillRank} from "../../constants/system";
import type {PoolKey} from "../../rules/core/core-types";
import type {
  CharacterRollRequest,
  PreparedRoll,
  RollDifficulty,
  RollPolicyRequest,
  RollStepContribution
} from "../../rolls/roll-types";
import {formatNetStepModifier, formatStepModifier} from "../../rolls/step-modifier";
import type {RollCharacterDocumentLike} from "../../services/roll-service";

export type RollDialogData = Record<string, unknown>;

export interface RollDialogModifierRow {
  readonly id: string;
  readonly label: string;
  readonly modifier: string;
  readonly direction: RollStepContribution["direction"];
}

export interface RollDialogPreviewViewModel {
  readonly rollLabel: string;
  readonly pool: PoolKey;
  readonly poolLabel: string;
  readonly modifiers: readonly RollDialogModifierRow[];
  readonly automaticModifiers: readonly RollDialogModifierRow[];
  readonly netModifier: string | null;
  readonly hiddenModifierCount: number;
  readonly difficultyMode: RollDifficulty["mode"];
  readonly baseDifficulty: number | null;
  readonly finalDifficulty: number | null;
  readonly targetNumber: number | null;
  readonly automaticSuccess: boolean;
  readonly actionCost: number;
  readonly effortCost: number;
  readonly edgeApplied: number;
  readonly totalCost: number;
  readonly poolValue: number;
  readonly poolAfter: number;
  readonly effortUsed: number;
  readonly effortMaximum: number;
  readonly totalEffortApplied: number;
  readonly totalEffortMaximum: number | null;
  readonly paidEffortApplied: number;
  readonly freeEffortApplied: number;
}

export interface RollDialogShellOptions {
  readonly identity: string;
  readonly settings: string;
  readonly attackSummary?: string;
}

export interface BindRollDialogOptions {
  readonly actor: RollCharacterDocumentLike;
  readonly policyRequest: RollPolicyRequest;
  readonly buildRequest: (data: RollDialogData) => CharacterRollRequest;
  readonly attackSummary?: (data: RollDialogData, prepared: PreparedRoll) => string;
}

const EDITABLE_CONTRIBUTION_IDS = new Set([
  "manual.skill",
  "manual.other-ease",
  "manual.other-hindrance",
  "core.assets",
  "core.effort.paid",
  "core.effort.free"
]);

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function foundryLocalize(key: string): string {
  return game.i18n.localize(key);
}

function poolLabel(pool: PoolKey, localize: (key: string) => string): string {
  return localize(`CYPHERV2.Pools.${pool[0]!.toUpperCase()}${pool.slice(1)}`);
}

function privateHiddenContribution(entry: RollStepContribution, prepared: PreparedRoll): boolean {
  return prepared.context.difficulty.mode === "hidden" && entry.id.startsWith("npc-modification.");
}

function modifierRow(
  entry: RollStepContribution,
  localize: (key: string) => string
): RollDialogModifierRow {
  return {
    id: entry.id,
    label: localize(entry.label),
    modifier: formatStepModifier(entry.direction, entry.steps),
    direction: entry.direction
  };
}

export function buildRollDialogPreview(
  prepared: PreparedRoll,
  actor: RollCharacterDocumentLike,
  localize: (key: string) => string
): RollDialogPreviewViewModel {
  const hiddenEntries = prepared.breakdown.filter((entry) => privateHiddenContribution(entry, prepared));
  const visibleEntries = prepared.breakdown.filter((entry) => !privateHiddenContribution(entry, prepared));
  const modifiers = visibleEntries
    .filter((entry) => EDITABLE_CONTRIBUTION_IDS.has(entry.id))
    .map((entry) => modifierRow(entry, localize));
  const automaticModifiers = visibleEntries
    .filter((entry) => !EDITABLE_CONTRIBUTION_IDS.has(entry.id))
    .map((entry) => modifierRow(entry, localize));
  const known = prepared.context.difficulty.mode === "known";
  const pool = prepared.context.pool;
  if (pool === null) throw new Error("Configured rolls require a Pool.");
  const poolValue = actor.system.stats[pool].value;
  return {
    rollLabel: localize(prepared.context.label),
    pool,
    poolLabel: poolLabel(pool, localize),
    modifiers,
    automaticModifiers,
    netModifier: hiddenEntries.length === 0 ? formatNetStepModifier(prepared.netSteps) : null,
    hiddenModifierCount: hiddenEntries.length,
    difficultyMode: prepared.context.difficulty.mode,
    baseDifficulty: known ? prepared.context.difficulty.value : null,
    finalDifficulty: known ? prepared.finalDifficulty : null,
    targetNumber: known ? prepared.targetNumber : null,
    automaticSuccess: known && prepared.finalDifficulty === 0,
    actionCost: prepared.actionCostBeforeEdge,
    effortCost: prepared.effortCostBeforeEdge,
    edgeApplied: prepared.edgeApplied,
    totalCost: prepared.poolCost,
    poolValue,
    poolAfter: Math.max(0, poolValue - prepared.poolCost),
    effortUsed: prepared.paidEffortApplied,
    effortMaximum: prepared.context.limits.paidEffortMaximum,
    totalEffortApplied: prepared.totalEffortApplied,
    totalEffortMaximum: prepared.totalEffortMaximum,
    paidEffortApplied: prepared.paidEffortApplied,
    freeEffortApplied: prepared.freeEffortApplied
  };
}

export function readRollDialogData(root: HTMLElement): RollDialogData {
  const data: RollDialogData = {};
  for (const element of root.querySelectorAll<HTMLInputElement | HTMLSelectElement>("[name]")) {
    data[element.name] = element instanceof HTMLInputElement && element.type === "checkbox"
      ? element.checked
      : element.value;
  }
  return data;
}

export function rollDialogText(data: RollDialogData, key: string): string {
  return String(data[key] ?? "");
}

export function rollDialogNumber(data: RollDialogData, key: string): number {
  return Number(data[key] ?? 0);
}

export function rollDialogChecked(data: RollDialogData, key: string): boolean {
  const value = data[key];
  return value === true || value === "true" || value === "on";
}

export function rollDialogDifficulty(
  data: RollDialogData,
  forced?: RollDifficulty
): RollDifficulty {
  if (forced) return forced;
  const value = rollDialogText(data, "difficulty").trim();
  if (!value) return {mode: "unknown"};
  return {
    mode: rollDialogChecked(data, "hidden") ? "hidden" : "known",
    value: Number(value)
  };
}

export function situationalModifier(data: RollDialogData): {
  readonly otherEase: number;
  readonly otherHindrance: number;
} {
  const steps = rollDialogNumber(data, "situationalSteps");
  return rollDialogText(data, "situationalDirection") === "hinder"
    ? {otherEase: 0, otherHindrance: steps}
    : {otherEase: steps, otherHindrance: 0};
}

export function selectOptions(maximum: number, selectedValue = 0): string {
  return Array.from({length: maximum + 1}, (_, value) => (
    `<option value="${value}"${value === selectedValue ? " selected" : ""}>${value}</option>`
  )).join("");
}

export function poolOptions(selected: PoolKey): string {
  return (["might", "speed", "intellect"] as const).map((pool) => (
    `<option value="${pool}"${pool === selected ? " selected" : ""}>${escapeHtml(poolLabel(pool, foundryLocalize))}</option>`
  )).join("");
}

const SKILL_RANK_STEPS: Readonly<Record<SkillRank, number>> = Object.freeze({
  inability: -1,
  untrained: 0,
  trained: 1,
  specialized: 2,
  expert: 3
});

export function skillRankSteps(rank: SkillRank): number {
  return SKILL_RANK_STEPS[rank];
}

export function skillRankOptions(selectedSteps: number | null = 0, valuePrefix = ""): string {
  return SKILL_RANKS.map((rank) => {
    const steps = skillRankSteps(rank);
    const label = game.i18n.localize(`CYPHERV2.Skill.Ranks.${rank}`);
    const modifier = steps === 0
      ? game.i18n.localize("CYPHERV2.Roll.Unmodified")
      : formatStepModifier(steps > 0 ? "ease" : "hinder", steps);
    return `<option value="${valuePrefix}${steps}"${selectedSteps !== null && steps === selectedSteps ? " selected" : ""}>${escapeHtml(label)} · ${modifier}</option>`;
  }).join("");
}

export function situationalModifierFields(): string {
  return `<div class="roll-dialog-inline-field roll-dialog-situational">
    <span class="roll-dialog-field-label">${game.i18n.localize("CYPHERV2.Roll.SituationalModifier")}</span>
    <select name="situationalDirection" aria-label="${game.i18n.localize("CYPHERV2.Roll.ModifierDirection")}">
      <option value="ease">${game.i18n.localize("CYPHERV2.Roll.Ease")}</option>
      <option value="hinder">${game.i18n.localize("CYPHERV2.Roll.Hinder")}</option>
    </select>
    <input name="situationalSteps" type="number" value="0" min="0" max="10" step="1" aria-label="${game.i18n.localize("CYPHERV2.Roll.ModifierSteps")}">
  </div>`;
}

export function difficultyFields(maximum: number, hiddenControl: boolean): string {
  return `<div class="roll-dialog-inline-field roll-dialog-difficulty-field">
    <label>${game.i18n.localize("CYPHERV2.Roll.BaseDifficulty")}
      <input name="difficulty" type="number" min="0" max="${maximum}" step="1" placeholder="${game.i18n.localize("CYPHERV2.Roll.Optional")}">
    </label>
    ${hiddenControl ? `<label class="roll-dialog-checkbox"><input name="hidden" type="checkbox"> ${game.i18n.localize("CYPHERV2.Roll.HiddenDifficulty")}</label>` : ""}
  </div>`;
}

export function rollDialogShell(options: RollDialogShellOptions): string {
  return `<div class="cypherv2 cypherv2-dialog cypherv2-dialog-fields cypherv2-roll-dialog">
    <div class="roll-dialog-layout">
      <section class="roll-dialog-settings" aria-labelledby="cypherv2-roll-settings-heading">
        <header class="roll-dialog-panel-header">
          <span class="roll-dialog-kicker" id="cypherv2-roll-settings-heading">${game.i18n.localize("CYPHERV2.Roll.Settings")}</span>
          <strong>${escapeHtml(options.identity)}</strong>
        </header>
        <div class="roll-dialog-settings-grid">${options.settings}</div>
      </section>
      <aside class="roll-dialog-summary" aria-labelledby="cypherv2-roll-summary-heading" aria-live="polite">
        <header class="roll-dialog-panel-header">
          <span class="roll-dialog-kicker" id="cypherv2-roll-summary-heading">${game.i18n.localize("CYPHERV2.Roll.Summary")}</span>
          <strong data-roll-summary="label">${escapeHtml(options.identity)}</strong>
          <span data-roll-summary="pool"></span>
        </header>
        <section class="roll-summary-section" data-roll-summary-section="automatic" hidden>
          <h4>${game.i18n.localize("CYPHERV2.Roll.AutomaticModifiers")}</h4>
          <div class="roll-summary-rows" data-roll-summary="automatic"></div>
        </section>
        <section class="roll-summary-section" data-roll-summary-section="modifiers">
          <h4>${game.i18n.localize("CYPHERV2.Roll.Modifiers")}</h4>
          <div class="roll-summary-rows" data-roll-summary="modifiers"></div>
          <div class="roll-summary-total"><span>${game.i18n.localize("CYPHERV2.Roll.NetSteps")}</span><strong data-roll-summary="net">0</strong></div>
        </section>
        <section class="roll-summary-section" data-roll-summary-section="effort" hidden>
          <h4>${game.i18n.localize("CYPHERV2.Roll.Effort")}</h4>
          <div class="roll-summary-rows" data-roll-summary="effort"></div>
        </section>
        <section class="roll-summary-section" data-roll-summary-section="difficulty">
          <h4>${game.i18n.localize("CYPHERV2.Roll.Difficulty")}</h4>
          <div class="roll-summary-rows" data-roll-summary="difficulty"></div>
        </section>
        <section class="roll-summary-section" data-roll-summary-section="attack"${options.attackSummary ? "" : " hidden"}>
          <h4>${game.i18n.localize("CYPHERV2.Combat.Attack")}</h4>
          <div class="roll-summary-rows" data-roll-summary="attack">${options.attackSummary ?? ""}</div>
        </section>
        <section class="roll-summary-section" data-roll-summary-section="cost">
          <h4>${game.i18n.localize("CYPHERV2.Roll.Cost")}</h4>
          <div class="roll-summary-rows" data-roll-summary="cost"></div>
        </section>
        <section class="roll-summary-section roll-summary-character">
          <h4>${game.i18n.localize("CYPHERV2.Roll.Character")}</h4>
          <div class="roll-summary-pools" data-roll-summary="character"></div>
        </section>
        <p class="roll-preview-error" data-roll-summary="error"></p>
      </aside>
    </div>
  </div>`;
}

function summaryRow(label: string, value: string, className = ""): string {
  return `<div class="roll-summary-row ${className}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function modifierRows(rows: readonly RollDialogModifierRow[]): string {
  if (rows.length === 0) {
    return `<p class="roll-summary-empty">${game.i18n.localize("CYPHERV2.Common.None")}</p>`;
  }
  return rows.map((row) => summaryRow(
    row.label,
    row.modifier,
    row.direction === "ease" ? "is-ease" : "is-hindrance"
  )).join("");
}

function setHtml(root: HTMLElement, key: string, html: string): void {
  const target = root.querySelector<HTMLElement>(`[data-roll-summary="${key}"]`);
  if (target) target.innerHTML = html;
}

function setText(root: HTMLElement, key: string, value: string): void {
  const target = root.querySelector<HTMLElement>(`[data-roll-summary="${key}"]`);
  if (target) target.textContent = value;
}

function renderPreview(
  root: HTMLElement,
  view: RollDialogPreviewViewModel,
  attackSummary?: string
): void {
  setText(root, "label", view.rollLabel);
  setText(root, "pool", view.poolLabel);
  setHtml(root, "modifiers", modifierRows(view.modifiers));
  setText(root, "net", view.netModifier ?? game.i18n.localize("CYPHERV2.Roll.HiddenValue"));

  const automaticSection = root.querySelector<HTMLElement>('[data-roll-summary-section="automatic"]');
  if (automaticSection) automaticSection.hidden = view.automaticModifiers.length === 0;
  setHtml(root, "automatic", modifierRows(view.automaticModifiers));

  const effortSection = root.querySelector<HTMLElement>('[data-roll-summary-section="effort"]');
  if (effortSection) effortSection.hidden = view.totalEffortApplied === 0;
  setHtml(root, "effort", [
    summaryRow(
      game.i18n.localize("CYPHERV2.Roll.PaidAppliedEffort"),
      `${view.paidEffortApplied} / ${view.effortMaximum}`
    ),
    summaryRow(game.i18n.localize("CYPHERV2.Roll.FreeAppliedEffort"), String(view.freeEffortApplied)),
    summaryRow(
      game.i18n.localize("CYPHERV2.Roll.TotalAppliedEffort"),
      view.totalEffortMaximum === null
        ? `${view.totalEffortApplied} / ${game.i18n.localize("CYPHERV2.Genre.Unlimited")}`
        : `${view.totalEffortApplied} / ${view.totalEffortMaximum}`,
      view.totalEffortMaximum !== null && view.totalEffortApplied === view.totalEffortMaximum ? "is-total" : ""
    )
  ].join(""));

  const difficulty = view.difficultyMode === "hidden"
    ? summaryRow(game.i18n.localize("CYPHERV2.Roll.BaseDifficulty"), game.i18n.localize("CYPHERV2.Roll.HiddenValue"))
    : view.difficultyMode === "unknown"
      ? summaryRow(game.i18n.localize("CYPHERV2.Roll.BaseDifficulty"), game.i18n.localize("CYPHERV2.Roll.NotProvided"))
      : [
          summaryRow(game.i18n.localize("CYPHERV2.Roll.BaseDifficulty"), String(view.baseDifficulty)),
          summaryRow(
            game.i18n.localize("CYPHERV2.Roll.FinalDifficulty"),
            view.automaticSuccess
              ? game.i18n.localize("CYPHERV2.Roll.AutomaticSuccess")
              : String(view.finalDifficulty)
          ),
          summaryRow(game.i18n.localize("CYPHERV2.Roll.TargetNumber"), String(view.targetNumber))
        ].join("");
  setHtml(root, "difficulty", difficulty);

  const attackSection = root.querySelector<HTMLElement>('[data-roll-summary-section="attack"]');
  if (attackSection && attackSummary !== undefined) {
    attackSection.hidden = !attackSummary;
    setHtml(root, "attack", attackSummary);
  }

  const costRows = [
    ...(view.actionCost > 0 ? [summaryRow(game.i18n.localize("CYPHERV2.Roll.ActionCost"), String(view.actionCost))] : []),
    ...(view.effortCost > 0 ? [summaryRow(game.i18n.localize("CYPHERV2.Roll.EffortCost"), String(view.effortCost))] : []),
    ...(view.edgeApplied > 0 ? [summaryRow(game.i18n.localize("CYPHERV2.Roll.EdgeApplied"), `-${view.edgeApplied}`)] : []),
    summaryRow(game.i18n.localize("CYPHERV2.Roll.TotalCost"), `${view.totalCost} ${view.poolLabel}`, "is-total"),
    summaryRow(game.i18n.localize("CYPHERV2.Roll.PoolAfterRoll"), `${view.poolValue} → ${view.poolAfter}`)
  ];
  setHtml(root, "cost", costRows.join(""));

  const pools = (["might", "speed", "intellect"] as const).map((pool) => {
    const value = view.pool === pool ? view.poolAfter : null;
    const current = view.pool === pool ? view.poolValue : null;
    const actorPool = root.dataset[`pool${pool[0]!.toUpperCase()}${pool.slice(1)}`];
    const actorMax = root.dataset[`pool${pool[0]!.toUpperCase()}${pool.slice(1)}Max`];
    const actorEdge = root.dataset[`pool${pool[0]!.toUpperCase()}${pool.slice(1)}Edge`];
    return `<div class="roll-summary-pool${view.pool === pool ? " is-selected" : ""}">
      <span>${escapeHtml(poolLabel(pool, foundryLocalize))}</span>
      <strong>${current === null ? actorPool : `${current} → ${value}`} / ${actorMax}</strong>
      <small>${game.i18n.localize("CYPHERV2.Pools.Edge")} ${actorEdge}</small>
    </div>`;
  }).join("");
  setHtml(root, "character", `${pools}<div class="roll-summary-effort"><span>${game.i18n.localize("CYPHERV2.Character.Effort")}</span><strong>${view.effortUsed} / ${view.effortMaximum}</strong></div>`);
  setText(root, "error", view.poolValue < view.totalCost ? game.i18n.localize("CYPHERV2.Roll.InsufficientPool") : "");
}

export function bindRollDialogPreview(
  root: HTMLElement,
  options: BindRollDialogOptions
): () => void {
  for (const pool of ["might", "speed", "intellect"] as const) {
    const key = `pool${pool[0]!.toUpperCase()}${pool.slice(1)}`;
    root.dataset[key] = String(options.actor.system.stats[pool].value);
    root.dataset[`${key}Max`] = String(options.actor.system.derived.pools[pool].max);
    root.dataset[`${key}Edge`] = String(options.actor.system.derived.pools[pool].edge);
  }
  const update = (): void => {
    try {
      const request = options.buildRequest(readRollDialogData(root));
      const preview = game.cypherv2.services.rolls.preview(options.actor, request, options.policyRequest);
      renderPreview(
        root,
        buildRollDialogPreview(preview, options.actor, foundryLocalize),
        options.attackSummary?.(readRollDialogData(root), preview)
      );
    } catch (error) {
      setText(root, "error", error instanceof Error ? error.message : String(error));
    }
  };
  root.addEventListener("input", update);
  root.addEventListener("change", update);
  update();
  return update;
}
