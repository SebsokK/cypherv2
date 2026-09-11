import {DOCUMENT_SHEET_FORM_OPTIONS, documentSystemFields} from "./document-sheet-options";
import {
  ABILITY_ACTIVATIONS,
  ABILITY_ROLL_TYPES,
  ABILITY_TARGET_MODES,
  ARMOR_CATEGORIES,
  CYPHER_MANIFESTATIONS,
  CYPHER_POWERS,
  DEPLETION_DICE,
  RANGE_CATEGORIES,
  SKILL_RANKS,
  WEAPON_ATTACK_TYPES,
  WEAPON_CATEGORIES,
  WOUND_SEVERITIES,
  type SkillRank,
  type WoundSeverity
} from "../../constants/system";
import {POOL_KEYS, type PoolKey} from "../../rules/core/core-types";
import type {DepletionItemLike} from "../../depletion/depletion-types";
import {rollItemDepletion} from "../dialogs/depletion-roll";
import type {FocusDocumentLike} from "../../focus/focus-types";
import {openFocusNode} from "../../focus/focus-node-action";
import {FocusTreeConnectionController} from "../../focus/focus-tree-connections";
import {
  FocusTreeEditorInteractionState,
  FocusTreeEditorSession,
  type FocusEditorAbilityLike
} from "../../focus/focus-tree-editor";
import {FocusGraphValidationError} from "../../focus/focus-graph-validator";
import {
  captureFocusEditorScroll,
  restoreFocusEditorScroll,
  type FocusEditorScrollState
} from "./focus-editor-scroll";
import {SystemTooltip} from "../tooltips/system-tooltip";
import type {AbilityGrant, CharacterTypeSystemData, DescriptorChoiceGroup, DescriptorGrant, DescriptorSystemData, PoolBonusChoiceGroup, SkillChoiceGroup, SkillGrant, SkillGrantOption, SpeciesSystemData} from "../../packages/package-types";
import {
  ShieldCapacityBelowWoundsError,
  type ShieldItemLike
} from "../../services/shield-service";
import {promptDeleteShieldWound, promptEditShieldWound} from "../dialogs/shield-wound-dialogs";
import {abilityAllowedPools} from "../../abilities/ability-cost";
import {cypherLevel} from "../../cyphers/cypher-rules";
import {artifactLevelIsRollable} from "../../artifacts/artifact-rules";
import {
  abilityMechanicsVisibility,
  skillHasOptionalMechanics
} from "./item-mechanics-visibility";
import {headerWoundTracks} from "./character-header";
import {parseWoundCountActionData} from "./wound-count-action";
import type {GenreAbilityEntry, GenreSystemData} from "../../genre/genre-types";
import {
  GENRE_MINIMUM_TIER_MAX,
  GENRE_MINIMUM_TIER_MIN,
  normalizeGenreMinimumTier,
  removeGenreAbilityEntry,
  updateGenreAbilitySnapshot,
  updateGenreMinimumTier
} from "../../genre/genre-catalog";
import {depletionDieSides, depletionThresholdLabel} from "../../depletion/depletion-rules";
import {
  captureItemSheetUiState,
  restoreItemSheetUiState,
  type ItemSheetUiState
} from "./item-sheet-ui-state";
import {enforceReadOnlySheetPresentation, guardEditableActions} from "./sheet-permissions";
import {
  BUILT_IN_WEAPON_FAMILIES,
  normalizeWeaponFamilies,
  weaponFamilyLabel
} from "../../combat/weapon-family";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]!);
}

function notifyError(error: unknown): void {
  ui.notifications.error(error instanceof Error ? error.message : String(error));
}

const ItemSheetV2 = foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.sheets.ItemSheetV2
);

const ITEM_MUTATING_ACTIONS = new Set([
  "rollDepletion", "reloadWeapon",
  "editFocusTree", "addFocusAbility", "saveFocusTree", "cancelFocusTree",
  "selectFocusEditorNode", "moveFocusNode", "setFocusNodeTier",
  "startFocusConnection", "completeFocusConnection", "cancelFocusConnection",
  "deleteFocusConnection", "clearFocusConnections", "refreshFocusSnapshot", "deleteFocusNode",
  "addPackageGrant", "addChoiceGroup", "addChoiceOption", "editSkillGrantNote", "refreshPackageGrant", "removePackageGrant",
  "addPoolBonusChoiceGroup", "editPoolBonusChoiceGroup", "removePoolBonusChoiceGroup",
  "setShieldWoundCount", "editShieldWound", "deleteShieldWound",
  "addGenreAbility", "refreshGenreAbility", "removeGenreAbility"
]);

export class CypherV2ItemSheet extends ItemSheetV2 {
  readonly #focusTreeConnections = new FocusTreeConnectionController();
  readonly #focusEditorInteraction = new FocusTreeEditorInteractionState();
  readonly #systemTooltip = new SystemTooltip();
  #abilityPoolBindings: AbortController | null = null;
  #genreCatalogBindings: AbortController | null = null;
  #typeGenreBindings: AbortController | null = null;
  #weaponFamilyBindings: AbortController | null = null;
  #focusTreeEditor: FocusTreeEditorSession | null = null;
  #pendingFocusEditorScroll: FocusEditorScrollState | null = null;
  #focusEditorKeyBindings: AbortController | null = null;
  readonly #openDisclosures = new Set<string>();
  readonly #closedDisclosures = new Set<string>();
  #pendingItemUiState: ItemSheetUiState | null = null;
  #disclosureBindings: AbortController | null = null;
  #weaponResourceBindings: AbortController | null = null;
  #shieldCapacityBindings: AbortController | null = null;

  static #shieldWoundData(target: HTMLElement): {severity: WoundSeverity; woundId: string} {
    const severity = target.dataset.severity;
    const woundId = target.dataset.woundId;
    if (!WOUND_SEVERITIES.includes(severity as WoundSeverity) || !woundId) {
      throw new Error("Invalid Shield Wound action data.");
    }
    return {severity: severity as WoundSeverity, woundId};
  }

  static async #onSetShieldWoundCount(
    this: CypherV2ItemSheet,
    event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    if (!this.isEditable) return;
    if (this.item.actor && !game.user.isGM && !this.item.actor.testUserPermission(
      game.user,
      CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
    )) return;
    const data = parseWoundCountActionData(target.dataset);
    if (data.track !== "shield" || data.shieldId !== this.item.id) {
      throw new Error("Invalid Shield Wound count action data.");
    }
    await game.cypherv2.services.shields.setCount(
      this.item as unknown as ShieldItemLike,
      data.severity,
      data.count
    );
    await this.render({force: true});
  }

  static async #onEditShieldWound(
    this: CypherV2ItemSheet,
    _event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    const data = CypherV2ItemSheet.#shieldWoundData(target);
    await promptEditShieldWound(this.item as unknown as ShieldItemLike, data.severity, data.woundId);
  }

  static async #onDeleteShieldWound(
    this: CypherV2ItemSheet,
    _event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    const data = CypherV2ItemSheet.#shieldWoundData(target);
    await promptDeleteShieldWound(this.item as unknown as ShieldItemLike, data.severity, data.woundId);
  }

  static async #onReloadWeapon(this: CypherV2ItemSheet): Promise<void> {
    if (!this.isEditable || this.item.type !== "weapon") return;
    await game.cypherv2.services.weapons.reload(this.item as unknown as import("../../combat/combat-types").WeaponItemLike);
    await this.render({force: true});
  }

  static DEFAULT_OPTIONS = {
    ...DOCUMENT_SHEET_FORM_OPTIONS,
    classes: ["cypherv2", "sheet", "item", "item-sheet"],
    actions: guardEditableActions({
      rollDepletion: CypherV2ItemSheet.#onRollDepletion,
      reloadWeapon: CypherV2ItemSheet.#onReloadWeapon,
      openFocusNode: CypherV2ItemSheet.#onOpenFocusNode,
      editFocusTree: CypherV2ItemSheet.#onEditFocusTree,
      addFocusAbility: CypherV2ItemSheet.#onAddFocusAbility,
      saveFocusTree: CypherV2ItemSheet.#onSaveFocusTree,
      cancelFocusTree: CypherV2ItemSheet.#onCancelFocusTree,
      selectFocusEditorNode: CypherV2ItemSheet.#onSelectFocusEditorNode,
      moveFocusNode: CypherV2ItemSheet.#onMoveFocusNode,
      setFocusNodeTier: CypherV2ItemSheet.#onSetFocusNodeTier,
      startFocusConnection: CypherV2ItemSheet.#onStartFocusConnection,
      completeFocusConnection: CypherV2ItemSheet.#onCompleteFocusConnection,
      cancelFocusConnection: CypherV2ItemSheet.#onCancelFocusConnection,
      deleteFocusConnection: CypherV2ItemSheet.#onDeleteFocusConnection,
      clearFocusConnections: CypherV2ItemSheet.#onClearFocusConnections,
      refreshFocusSnapshot: CypherV2ItemSheet.#onRefreshFocusSnapshot,
      deleteFocusNode: CypherV2ItemSheet.#onDeleteFocusNode,
      addPackageGrant: CypherV2ItemSheet.#onAddPackageGrant,
      addChoiceGroup: CypherV2ItemSheet.#onAddChoiceGroup,
      addChoiceOption: CypherV2ItemSheet.#onAddChoiceOption,
      editSkillGrantNote: CypherV2ItemSheet.#onEditSkillGrantNote,
      inspectPackageGrant: CypherV2ItemSheet.#onInspectPackageGrant,
      refreshPackageGrant: CypherV2ItemSheet.#onRefreshPackageGrant,
      removePackageGrant: CypherV2ItemSheet.#onRemovePackageGrant,
      addPoolBonusChoiceGroup: CypherV2ItemSheet.#onAddPoolBonusChoiceGroup,
      editPoolBonusChoiceGroup: CypherV2ItemSheet.#onEditPoolBonusChoiceGroup,
      removePoolBonusChoiceGroup: CypherV2ItemSheet.#onRemovePoolBonusChoiceGroup,
      setShieldWoundCount: CypherV2ItemSheet.#onSetShieldWoundCount,
      editShieldWound: CypherV2ItemSheet.#onEditShieldWound,
      deleteShieldWound: CypherV2ItemSheet.#onDeleteShieldWound,
      addGenreAbility: CypherV2ItemSheet.#onAddGenreAbility,
      inspectGenreAbility: CypherV2ItemSheet.#onInspectGenreAbility,
      refreshGenreAbility: CypherV2ItemSheet.#onRefreshGenreAbility,
      removeGenreAbility: CypherV2ItemSheet.#onRemoveGenreAbility
    }, ITEM_MUTATING_ACTIONS),
    position: {width: 620, height: 680},
    window: {resizable: true}
  };

  static PARTS = {
    main: {template: "systems/cypherv2/templates/item/item-sheet.hbs"}
  };

  override async _onRender(
    context: Record<string, unknown>,
    options: Record<string, unknown>
  ): Promise<void> {
    await super._onRender(context, options);
    enforceReadOnlySheetPresentation(this.element, this.isEditable, ITEM_MUTATING_ACTIONS);
    this.#focusEditorKeyBindings?.abort();
    this.#focusEditorKeyBindings = null;
    if (this.#pendingFocusEditorScroll) {
      restoreFocusEditorScroll(this.element, this.#pendingFocusEditorScroll);
      this.#pendingFocusEditorScroll = null;
    }
    if (this.#pendingItemUiState) {
      restoreItemSheetUiState(this.element, this.#pendingItemUiState);
      this.#pendingItemUiState = null;
    }
    if (this.#focusEditorInteraction.connectionSourceNodeId) {
      const controller = new AbortController();
      this.#focusEditorKeyBindings = controller;
      this.element.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        this.#focusEditorInteraction.cancelConnection();
        void this.#rerender();
      }, {signal: controller.signal});
      this.element.querySelector<HTMLElement>(".focus-tree-node-editor")
        ?.focus({preventScroll: true});
    }
    this.#focusTreeConnections.bind(this.element);
    this.#systemTooltip.bind(this.element);
    this.#bindAbilityAllowedPools();
    this.#bindGenreCatalog();
    this.#bindTypeGenreVisibility();
    this.#bindWeaponFamilies();
    this.#bindPersistentDisclosures();
    this.#bindWeaponResources();
    this.#bindShieldCapacities();
  }

  override _onClose(options: Record<string, unknown>): void {
    this.#focusTreeConnections.disconnect();
    this.#systemTooltip.disconnect();
    this.#abilityPoolBindings?.abort();
    this.#abilityPoolBindings = null;
    this.#genreCatalogBindings?.abort();
    this.#genreCatalogBindings = null;
    this.#typeGenreBindings?.abort();
    this.#typeGenreBindings = null;
    this.#weaponFamilyBindings?.abort();
    this.#weaponFamilyBindings = null;
    this.#disclosureBindings?.abort();
    this.#disclosureBindings = null;
    this.#weaponResourceBindings?.abort();
    this.#weaponResourceBindings = null;
    this.#shieldCapacityBindings?.abort();
    this.#shieldCapacityBindings = null;
    this.#focusTreeEditor?.cancel();
    this.#focusTreeEditor = null;
    this.#focusEditorInteraction.reset();
    this.#pendingFocusEditorScroll = null;
    this.#focusEditorKeyBindings?.abort();
    this.#focusEditorKeyBindings = null;
    super._onClose(options);
  }

  #bindPersistentDisclosures(): void {
    this.#disclosureBindings?.abort();
    const controller = new AbortController();
    this.#disclosureBindings = controller;
    const disclosures = [...this.element.querySelectorAll<HTMLDetailsElement>("details")];
    for (const [index, details] of disclosures.entries()) {
      const stableKey = details.dataset.persistentDisclosure ?? `item-details-${index}`;
      if (this.#openDisclosures.has(stableKey)) details.open = true;
      else if (this.#closedDisclosures.has(stableKey)) details.open = false;
      details.addEventListener("toggle", () => {
        if (details.open) {
          this.#openDisclosures.add(stableKey);
          this.#closedDisclosures.delete(stableKey);
        } else {
          this.#openDisclosures.delete(stableKey);
          this.#closedDisclosures.add(stableKey);
        }
      }, {signal: controller.signal});
    }
  }

  #bindWeaponResources(): void {
    this.#weaponResourceBindings?.abort();
    this.#weaponResourceBindings = null;
    if (!this.isEditable) return;
    const sidesInput = this.element.querySelector<HTMLInputElement>("[data-depletion-sides]");
    const thresholdInput = this.element.querySelector<HTMLInputElement>("[data-depletion-threshold]");
    if ((!sidesInput && !thresholdInput) || !["weapon", "shield", "armor"].includes(this.item.type)) return;
    const controller = new AbortController();
    this.#weaponResourceBindings = controller;
    sidesInput?.addEventListener("change", async () => {
      const sides = Number(sidesInput.value);
      const threshold = Number((this.item.system as unknown as {depletion: {threshold: number}}).depletion.threshold);
      if (!Number.isInteger(sides) || sides < 2 || sides > 1000 || threshold > sides) {
        ui.notifications.error(game.i18n.localize("CYPHERV2.Depletion.InvalidDie"));
        await this.render({force: true});
        return;
      }
      await this.item.update({"system.depletion.die": `d${sides}`});
    }, {signal: controller.signal});
    thresholdInput?.addEventListener("change", async () => {
      const match = thresholdInput.value.trim().match(/^1(?:-(\d+))?$/);
      const threshold = Number(match?.[1] ?? (match ? 1 : Number.NaN));
      const sides = depletionDieSides((this.item.system as unknown as {depletion: {die: string}}).depletion);
      if (!Number.isInteger(threshold) || threshold < 1 || threshold > sides) {
        ui.notifications.error(game.i18n.format("CYPHERV2.Depletion.InvalidThreshold", {sides}));
        await this.render({force: true});
        return;
      }
      await this.item.update({"system.depletion.threshold": threshold});
    }, {signal: controller.signal});
  }

  #bindShieldCapacities(): void {
    this.#shieldCapacityBindings?.abort();
    this.#shieldCapacityBindings = null;
    if (this.item.type !== "shield" || !this.isEditable) return;
    const inputs = [...this.element.querySelectorAll<HTMLInputElement>("input[data-shield-capacity]")];
    if (!inputs.length) return;
    const controller = new AbortController();
    this.#shieldCapacityBindings = controller;
    for (const input of inputs) {
      input.addEventListener("change", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const severity = input.dataset.severity;
        if (!WOUND_SEVERITIES.includes(severity as WoundSeverity)) return;
        try {
          await game.cypherv2.services.shields.setCapacity(
            this.item as unknown as ShieldItemLike,
            severity as WoundSeverity,
            Number(input.value)
          );
        } catch (error) {
          if (error instanceof ShieldCapacityBelowWoundsError) {
            ui.notifications.warn(game.i18n.format("CYPHERV2.Shield.CapacityTooLow", {
              severity: game.i18n.localize(`CYPHERV2.Wounds.Severity.${error.severity}`),
              count: error.current
            }));
          } else notifyError(error);
          await this.render({force: true});
        }
      }, {signal: controller.signal});
    }
  }

  #bindAbilityAllowedPools(): void {
    this.#abilityPoolBindings?.abort();
    this.#abilityPoolBindings = null;
    if (this.item.type !== "ability" || !this.isEditable) return;
    const checkboxes = [...this.element.querySelectorAll<HTMLInputElement>(
      "input[data-ability-allowed-pool]"
    )];
    if (!checkboxes.length) return;
    const controller = new AbortController();
    this.#abilityPoolBindings = controller;
    for (const checkbox of checkboxes) {
      checkbox.addEventListener("change", async (event) => {
        // These checkboxes intentionally have no form name: an empty selection must
        // still write [], so this scoped binding owns the normalized array update.
        event.stopPropagation();
        const allowedPools = checkboxes
          .filter((input) => input.checked)
          .map((input) => input.value)
          .filter((value): value is PoolKey => POOL_KEYS.includes(value as PoolKey));
        try {
          await this.item.update({"system.cost.allowedPools": allowedPools});
        } catch (error) {
          notifyError(error);
          await this.render({force: true});
        }
      }, {signal: controller.signal});
    }
  }

  #bindGenreCatalog(): void {
    this.#genreCatalogBindings?.abort();
    this.#genreCatalogBindings = null;
    if (this.item.type !== "genre" || !this.isEditable) return;
    const inputs = [...this.element.querySelectorAll<HTMLInputElement>(
      "input[data-genre-minimum-tier]"
    )];
    if (!inputs.length) return;
    const controller = new AbortController();
    this.#genreCatalogBindings = controller;
    for (const input of inputs) {
      input.addEventListener("change", async (event) => {
        // ArrayField entries cannot be safely patched through a numeric dotted form
        // path. Own this edit by stable entry ID and submit one complete preserved array.
        event.preventDefault();
        event.stopPropagation();
        const entryId = input.dataset.entryId ?? "";
        const catalog = (this.item.system as unknown as GenreSystemData).abilityCatalog;
        try {
          const updated = updateGenreMinimumTier(catalog, entryId, Number(input.value));
          await this.item.update({"system.abilityCatalog": updated});
        } catch (error) {
          notifyError(error);
          await this.render({force: true});
        }
      }, {signal: controller.signal});
    }
  }

  #bindTypeGenreVisibility(): void {
    this.#typeGenreBindings?.abort();
    this.#typeGenreBindings = null;
    if (this.item.type !== "characterType") return;
    const select = this.element.querySelector<HTMLSelectElement>("select[data-type-genre-select]");
    const field = this.element.querySelector<HTMLElement>("[data-type-custom-genre]");
    const superhero = this.element.querySelector<HTMLElement>("[data-type-superhero]");
    if (!select || !field) return;
    const controller = new AbortController();
    this.#typeGenreBindings = controller;
    const synchronize = (): void => {
      field.hidden = select.value !== "custom";
      if (superhero) superhero.hidden = select.value !== "superhero";
    };
    select.addEventListener("change", synchronize, {signal: controller.signal});
    synchronize();
  }

  #bindWeaponFamilies(): void {
    this.#weaponFamilyBindings?.abort();
    this.#weaponFamilyBindings = null;
    if ((this.item.type !== "characterType" && this.item.type !== "species") || !this.isEditable) return;
    const input = this.element.querySelector<HTMLInputElement>("input[data-package-weapon-families]");
    if (!input) return;
    const controller = new AbortController();
    this.#weaponFamilyBindings = controller;
    input.addEventListener("change", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      try {
        await this.item.update({"system.weaponFamilies": normalizeWeaponFamilies(input.value)});
      } catch (error) {
        notifyError(error);
        await this.render({force: true});
      }
    }, {signal: controller.signal});
  }

  override _canDragDrop(_selector: string): boolean {
    if (this.item.type !== "focus") return this.isEditable;
    return Boolean(this.isEditable && game.user.isGM && this.#focusTreeEditor);
  }

  override async _onDropDocument(event: DragEvent, document: unknown): Promise<unknown> {
    if (!this.isEditable) return null;
    if (this.item.type === "genre" && (document as Item)?.type === "ability") {
      await this.#addGenreAbility(document as Item);
      return document;
    }
    if (this.item.type === "characterType" && ["ability", "skill"].includes((document as Item)?.type)) {
      await this.#addPackageDocument(document as Item, "fixed");
      return document;
    }
    if (this.item.type === "descriptor" && (document as Item)?.type === "skill") {
      await this.#addPackageDocument(document as Item, "fixed");
      return document;
    }
    if (this.item.type === "species" && ["ability", "skill", "descriptor"].includes((document as Item)?.type)) {
      await this.#addPackageDocument(document as Item, "fixed");
      return document;
    }
    if (this.item.type !== "focus" || !this.#focusTreeEditor) {
      return super._onDropDocument(event, document);
    }
    const dropTarget = event.target;
    if (dropTarget instanceof Element && !dropTarget.closest(".focus-item-tree")) {
      return super._onDropDocument(event, document);
    }
    try {
      await this.#addAbility(document as FocusEditorAbilityLike);
      return document;
    } catch (error) {
      notifyError(error);
      return null;
    }
  }

  static async #onAddPackageGrant(this: CypherV2ItemSheet, _event: PointerEvent, target: HTMLElement): Promise<void> {
    const expected = this.item.type === "characterType"
      ? target.dataset.grantTarget ?? "ability"
      : this.item.type === "descriptor" ? "skill" : target.dataset.grantTarget;
    if (this.item.type !== "characterType" && this.item.type !== "descriptor" && this.item.type !== "species") return;
    if (expected !== "ability" && expected !== "skill" && expected !== "descriptor") return;
    const sources = [...game.items].filter((item) => item.type === expected).sort((a, b) => a.name.localeCompare(b.name));
    const custom = expected === "skill" ? `<option value="custom">${game.i18n.localize("CYPHERV2.Packages.CustomSkill")}</option>` : "";
    if (!sources.length && expected === "ability") {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Packages.NoWorldAbilities"));
      return;
    }
    const data = await foundry.applications.api.DialogV2.input({
      window: {title: game.i18n.localize(expected === "ability" ? "CYPHERV2.Packages.AddAbility" : expected === "skill" ? "CYPHERV2.Packages.AddFixedSkill" : "CYPHERV2.Species.AddDescriptorGrant")},
      content: `<div class="cypherv2-dialog-fields"><label>${game.i18n.localize("CYPHERV2.Packages.Source")}<select name="uuid">${custom}${sources.map((item) => `<option value="${escapeHtml(item.uuid)}">${escapeHtml(item.name)}</option>`).join("")}</select></label>${expected === "skill" ? `<label>${game.i18n.localize("CYPHERV2.Packages.CustomSkillName")}<input name="customName" type="text"></label><label>${game.i18n.localize("CYPHERV2.Skill.Rank")}<select name="rank">${SKILL_RANKS.map((rank) => `<option value="${rank}" ${rank === "trained" ? "selected" : ""}>${game.i18n.localize(`CYPHERV2.Skill.Ranks.${rank}`)}</option>`).join("")}</select></label><label>${game.i18n.localize("CYPHERV2.Packages.SkillContextNote")}<textarea name="notes" rows="2"></textarea></label>` : ""}</div>`,
      ok: {label: game.i18n.localize("CYPHERV2.Actions.Add")}
    }) as Record<string, unknown> | null;
    if (!data) return;
    if (data.uuid === "custom") {
      const name = String(data.customName ?? "").trim();
      if (!name) return;
      await this.#addCustomSkill(name, String(data.rank ?? "trained") as SkillRank, String(data.notes ?? ""));
    } else {
      const source = await fromUuid(String(data.uuid ?? "")) as Item | null;
      if (source) await this.#addPackageDocument(source, "fixed", String(data.rank ?? "trained") as SkillRank, String(data.notes ?? ""));
    }
  }

  static async #onAddGenreAbility(this: CypherV2ItemSheet): Promise<void> {
    if (this.item.type !== "genre") return;
    const abilities = [...game.items]
      .filter((item) => item.type === "ability")
      .sort((left, right) => left.name.localeCompare(right.name));
    if (!abilities.length) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Genre.NoWorldAbilities"));
      return;
    }
    const data = await foundry.applications.api.DialogV2.input({
      window: {title: game.i18n.localize("CYPHERV2.Genre.AddAbility")},
      content: `<div class="cypherv2-dialog-fields"><label>${game.i18n.localize("CYPHERV2.Genre.Ability")}
        <select name="uuid">${abilities.map((ability) => `<option value="${escapeHtml(ability.uuid)}">${escapeHtml(ability.name)}</option>`).join("")}</select></label>
        <label>${game.i18n.localize("CYPHERV2.Genre.MinimumTier")}<input name="minimumTier" type="number" min="${GENRE_MINIMUM_TIER_MIN}" max="${GENRE_MINIMUM_TIER_MAX}" value="${GENRE_MINIMUM_TIER_MIN}"></label></div>`,
      ok: {label: game.i18n.localize("CYPHERV2.Actions.Add")}
    }) as Record<string, unknown> | null;
    if (!data) return;
    const source = await fromUuid(String(data.uuid ?? "")) as Item | null;
    if (source) await this.#addGenreAbility(source, Number(data.minimumTier ?? 1));
  }

  static async #onInspectGenreAbility(this: CypherV2ItemSheet, _event: PointerEvent, target: HTMLElement): Promise<void> {
    const entry = this.#genreEntry(target.dataset.entryId);
    if (!entry) return;
    const source = entry.abilityUuid ? await fromUuid(entry.abilityUuid) as Item | null : null;
    if (source) { await source.sheet?.render(true); return; }
    await foundry.applications.api.DialogV2.confirm({
      window: {title: entry.snapshot.name},
      content: `<div class="cypherv2 cypherv2-dialog package-snapshot">${String(entry.snapshot.system.description ?? "")}</div>`,
      yes: {label: game.i18n.localize("CYPHERV2.Actions.Close")},
      no: {label: game.i18n.localize("CYPHERV2.Actions.Close")}
    });
  }

  static async #onRefreshGenreAbility(this: CypherV2ItemSheet, _event: PointerEvent, target: HTMLElement): Promise<void> {
    const entry = this.#genreEntry(target.dataset.entryId);
    if (!entry) return;
    const source = entry.abilityUuid ? await fromUuid(entry.abilityUuid) as Item | null : null;
    if (!source) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Packages.SourceUnavailable"));
      return;
    }
    const entries = (this.item.system as unknown as GenreSystemData).abilityCatalog;
    await this.item.update({
      "system.abilityCatalog": updateGenreAbilitySnapshot(entries, entry.id, this.#snapshot(source))
    });
  }

  static async #onRemoveGenreAbility(this: CypherV2ItemSheet, _event: PointerEvent, target: HTMLElement): Promise<void> {
    const id = target.dataset.entryId;
    if (!id || this.item.type !== "genre") return;
    const entries = (this.item.system as unknown as GenreSystemData).abilityCatalog;
    await this.item.update({"system.abilityCatalog": removeGenreAbilityEntry(entries, id)});
  }

  static async #onAddChoiceGroup(this: CypherV2ItemSheet, _event: PointerEvent, target: HTMLElement): Promise<void> {
    if (this.item.type !== "characterType" && this.item.type !== "descriptor" && this.item.type !== "species") return;
    const choiceKind = target.dataset.choiceKind ?? "skill";
    const abilityChoice = this.item.type !== "descriptor" && choiceKind === "ability";
    const descriptorChoice = this.item.type === "species" && choiceKind === "descriptor";
    const data = await foundry.applications.api.DialogV2.input({
      window: {title: game.i18n.localize("CYPHERV2.Packages.AddChoiceGroup")},
      content: `<div class="cypherv2-dialog-fields"><label>${game.i18n.localize("CYPHERV2.Packages.ChooseCount")}<input name="choose" type="number" min="1" value="1"></label>${descriptorChoice ? `<label>${game.i18n.localize("CYPHERV2.Packages.ChoiceSource")}<select name="sourceMode"><option value="fixed">${game.i18n.localize("CYPHERV2.Packages.FixedOptions")}</option><option value="catalog">${game.i18n.localize("CYPHERV2.Packages.AllAvailableDescriptors")}</option></select></label>` : abilityChoice ? "" : `<label>${game.i18n.localize("CYPHERV2.Skill.Rank")}<select name="rank">${SKILL_RANKS.map((rank) => `<option value="${rank}" ${rank === "trained" ? "selected" : ""}>${game.i18n.localize(`CYPHERV2.Skill.Ranks.${rank}`)}</option>`).join("")}</select></label>`}</div>`,
      ok: {label: game.i18n.localize("CYPHERV2.Actions.Add")}
    }) as Record<string, unknown> | null;
    if (!data) return;
    const system = this.item.system as unknown as DescriptorSystemData | SpeciesSystemData | CharacterTypeSystemData;
    if (abilityChoice) {
      const group = {id: crypto.randomUUID(), choose: Math.max(1, Number(data.choose) || 1), options: []};
      await this.item.update({"system.abilityChoiceGroups": [...((system as SpeciesSystemData | CharacterTypeSystemData).abilityChoiceGroups), group]});
    } else if (descriptorChoice) {
      const catalogMode = data.sourceMode === "catalog";
      const group: DescriptorChoiceGroup = {
        id: crypto.randomUUID(), choose: Math.max(1, Number(data.choose) || 1),
        sourceMode: catalogMode ? "catalog" : "fixed",
        catalogItemType: catalogMode ? "descriptor" : "none",
        options: []
      };
      const groups = (system as SpeciesSystemData).descriptorChoiceGroups ?? [];
      await this.item.update({"system.descriptorChoiceGroups": [...groups, group]});
    } else {
      const group: SkillChoiceGroup = {id: crypto.randomUUID(), choose: Math.max(1, Number(data.choose) || 1), rank: String(data.rank) as SkillRank, options: []};
      await this.item.update({"system.choiceGroups": [...system.choiceGroups, group]});
    }
  }

  async #promptPoolBonusChoiceGroup(
    existing?: PoolBonusChoiceGroup
  ): Promise<Omit<PoolBonusChoiceGroup, "id"> | null> {
    const data = await foundry.applications.api.DialogV2.input({
      window: {title: game.i18n.localize(existing ? "CYPHERV2.Packages.EditPoolBonusChoiceGroup" : "CYPHERV2.Packages.AddPoolBonusChoiceGroup")},
      content: `<div class="cypherv2 cypherv2-dialog package-pool-choice-authoring">
        <div class="cypherv2-dialog-section cypherv2-dialog-field-grid">
          <label class="cypherv2-dialog-field">${game.i18n.localize("CYPHERV2.Packages.Amount")}<input name="amount" type="number" min="1" value="${existing?.amount ?? 1}"></label>
          <label class="cypherv2-dialog-field">${game.i18n.localize("CYPHERV2.Packages.ChooseCount")}<input name="choose" type="number" min="1" value="${existing?.choose ?? 1}"></label>
        </div>
        <span class="cypherv2-dialog-section-heading">${game.i18n.localize("CYPHERV2.Packages.AllowedPools")}</span>
        <div class="package-pool-choice-options">
          ${POOL_KEYS.map((pool) => `<label class="cypherv2-dialog-toggle"><input name="pool_${pool}" type="checkbox" ${existing?.pools.includes(pool) ? "checked" : ""}><span>${game.i18n.localize(`CYPHERV2.Pools.${pool[0]!.toUpperCase()}${pool.slice(1)}`)}</span></label>`).join("")}
        </div>
      </div>`,
      ok: {label: game.i18n.localize(existing ? "CYPHERV2.Actions.Save" : "CYPHERV2.Actions.Add")}
    }) as Record<string, unknown> | null;
    if (!data) return null;
    const amount = Math.trunc(Number(data.amount));
    const choose = Math.trunc(Number(data.choose));
    const pools = POOL_KEYS.filter((pool) => Boolean(data[`pool_${pool}`]));
    if (!Number.isInteger(amount) || amount < 1 || !Number.isInteger(choose) || choose < 1 || choose > pools.length) {
      ui.notifications.error(game.i18n.localize("CYPHERV2.Packages.InvalidPoolBonusChoice"));
      return null;
    }
    return {amount, choose, pools};
  }

  static async #onAddPoolBonusChoiceGroup(this: CypherV2ItemSheet): Promise<void> {
    if (this.item.type !== "descriptor") return;
    const data = await this.#promptPoolBonusChoiceGroup();
    if (!data) return;
    const groups = (this.item.system as unknown as DescriptorSystemData).poolBonusChoiceGroups ?? [];
    await this.item.update({"system.poolBonusChoiceGroups": [...groups, {id: crypto.randomUUID(), ...data}]});
  }

  static async #onEditPoolBonusChoiceGroup(
    this: CypherV2ItemSheet,
    _event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    if (this.item.type !== "descriptor") return;
    const groups = (this.item.system as unknown as DescriptorSystemData).poolBonusChoiceGroups ?? [];
    const existing = groups.find((group) => group.id === target.dataset.groupId);
    if (!existing) return;
    const data = await this.#promptPoolBonusChoiceGroup(existing);
    if (!data) return;
    await this.item.update({
      "system.poolBonusChoiceGroups": groups.map((group) => group.id === existing.id ? {...group, ...data} : group)
    });
  }

  static async #onRemovePoolBonusChoiceGroup(
    this: CypherV2ItemSheet,
    _event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    if (this.item.type !== "descriptor") return;
    const groups = (this.item.system as unknown as DescriptorSystemData).poolBonusChoiceGroups ?? [];
    await this.item.update({
      "system.poolBonusChoiceGroups": groups.filter((group) => group.id !== target.dataset.groupId)
    });
  }

  static async #onAddChoiceOption(this: CypherV2ItemSheet, _event: PointerEvent, target: HTMLElement): Promise<void> {
    if (this.item.type !== "characterType" && this.item.type !== "descriptor" && this.item.type !== "species") return;
    const groupId = target.dataset.groupId;
    const system = this.item.system as unknown as DescriptorSystemData | SpeciesSystemData | CharacterTypeSystemData;
    const choiceKind = target.dataset.choiceKind ?? "skill";
    const abilityChoice = this.item.type !== "descriptor" && choiceKind === "ability";
    const descriptorChoice = this.item.type === "species" && choiceKind === "descriptor";
    const group = abilityChoice
      ? (system as SpeciesSystemData | CharacterTypeSystemData).abilityChoiceGroups.find((entry) => entry.id === groupId)
      : descriptorChoice
        ? (system as SpeciesSystemData).descriptorChoiceGroups.find((entry) => entry.id === groupId)
        : system.choiceGroups.find((entry) => entry.id === groupId);
    if (!group) return;
    const sourceType = abilityChoice ? "ability" : descriptorChoice ? "descriptor" : "skill";
    const sources = [...game.items].filter((item) => item.type === sourceType).sort((a, b) => a.name.localeCompare(b.name));
    const data = await foundry.applications.api.DialogV2.input({
      window: {title: game.i18n.localize(abilityChoice ? "CYPHERV2.Species.AddAbilityOption" : descriptorChoice ? "CYPHERV2.Species.AddDescriptorOption" : "CYPHERV2.Packages.AddSkillOption")},
      content: `<div class="cypherv2-dialog-fields"><label>${game.i18n.localize("CYPHERV2.Packages.Source")}<select name="uuid">${abilityChoice || descriptorChoice ? "" : `<option value="custom">${game.i18n.localize("CYPHERV2.Packages.CustomSkill")}</option>`}${sources.map((item) => `<option value="${escapeHtml(item.uuid)}">${escapeHtml(item.name)}</option>`).join("")}</select></label>${abilityChoice || descriptorChoice ? "" : `<label>${game.i18n.localize("CYPHERV2.Packages.CustomSkillName")}<input name="customName" type="text"></label><label>${game.i18n.localize("CYPHERV2.Packages.SkillContextNote")}<textarea name="notes" rows="2"></textarea></label>`}</div>`,
      ok: {label: game.i18n.localize("CYPHERV2.Actions.Add")}
    }) as Record<string, unknown> | null;
    if (!data) return;
    const source = data.uuid === "custom" ? null : await fromUuid(String(data.uuid ?? "")) as Item | null;
    if (abilityChoice) {
      if (!source) return;
      const option: AbilityGrant = {id: crypto.randomUUID(), abilityUuid: source.uuid, snapshot: this.#snapshot(source)};
      const groups = (system as SpeciesSystemData | CharacterTypeSystemData).abilityChoiceGroups;
      await this.item.update({"system.abilityChoiceGroups": groups.map((entry) => entry.id === groupId ? {...entry, options: [...entry.options, option]} : entry)});
    } else if (descriptorChoice) {
      if (!source) return;
      const option: DescriptorGrant = {id: crypto.randomUUID(), descriptorUuid: source.uuid, snapshot: this.#snapshot(source)};
      const groups = (system as SpeciesSystemData).descriptorChoiceGroups;
      await this.item.update({"system.descriptorChoiceGroups": groups.map((entry) => entry.id === groupId ? {...entry, options: [...entry.options, option]} : entry)});
    } else {
      const option = this.#skillOption(source, String(data.customName ?? ""), String(data.notes ?? ""));
      if (!option) return;
      await this.item.update({"system.choiceGroups": system.choiceGroups.map((entry) => entry.id === groupId ? {...entry, options: [...entry.options, option]} : entry)});
    }
  }

  static async #onEditSkillGrantNote(this: CypherV2ItemSheet, _event: PointerEvent, target: HTMLElement): Promise<void> {
    const entry = this.#packageEntry(target);
    if (!entry || !("skillUuid" in entry)) return;
    const data = await foundry.applications.api.DialogV2.input({
      window: {title: game.i18n.localize("CYPHERV2.Packages.EditSkillContextNote")},
      content: `<div class="cypherv2-dialog-fields"><label>${game.i18n.localize("CYPHERV2.Packages.SkillContextNote")}<textarea name="notes" rows="3">${escapeHtml(String(entry.notes ?? ""))}</textarea></label></div>`,
      ok: {label: game.i18n.localize("CYPHERV2.Actions.Save")}
    }) as Record<string, unknown> | null;
    if (!data) return;
    await this.#replacePackageEntry(target, {...entry, notes: String(data.notes ?? "")});
  }

  static async #onInspectPackageGrant(this: CypherV2ItemSheet, _event: PointerEvent, target: HTMLElement): Promise<void> {
    const entry = this.#packageEntry(target);
    if (!entry) return;
    const uuid = "abilityUuid" in entry ? entry.abilityUuid : "skillUuid" in entry ? entry.skillUuid : entry.descriptorUuid;
    const source = uuid ? await fromUuid(uuid) as Item | null : null;
    if (source) { await source.sheet?.render(true); return; }
    await foundry.applications.api.DialogV2.confirm({
      window: {title: entry.snapshot?.name || ("customName" in entry ? entry.customName : "")},
      content: `<div class="cypherv2 cypherv2-dialog package-snapshot"><p>${String(entry.snapshot?.system?.description ?? "")}</p></div>`,
      yes: {label: game.i18n.localize("CYPHERV2.Actions.Close")}, no: {label: game.i18n.localize("CYPHERV2.Actions.Close")}
    });
  }

  static async #onRefreshPackageGrant(this: CypherV2ItemSheet, _event: PointerEvent, target: HTMLElement): Promise<void> {
    const entry = this.#packageEntry(target);
    if (!entry) return;
    const uuid = "abilityUuid" in entry ? entry.abilityUuid : "skillUuid" in entry ? entry.skillUuid : entry.descriptorUuid;
    const source = uuid ? await fromUuid(uuid) as Item | null : null;
    if (!source) { ui.notifications.warn(game.i18n.localize("CYPHERV2.Packages.SourceUnavailable")); return; }
    await this.#replacePackageEntry(target, {...entry, snapshot: this.#snapshot(source)});
  }

  static async #onRemovePackageGrant(this: CypherV2ItemSheet, _event: PointerEvent, target: HTMLElement): Promise<void> {
    const kind = target.dataset.grantKind;
    const id = target.dataset.grantId;
    if (!id) return;
    if (kind === "ability") {
      const grants = (this.item.system as unknown as {abilityGrants: AbilityGrant[]}).abilityGrants;
      await this.item.update({"system.abilityGrants": grants.filter((entry) => entry.id !== id)});
    } else if (kind === "skill") {
      const grants = (this.item.system as unknown as DescriptorSystemData).skillGrants;
      await this.item.update({"system.skillGrants": grants.filter((entry) => entry.id !== id)});
    } else if (kind === "option") {
      const groupId = target.dataset.groupId;
      const groups = (this.item.system as unknown as DescriptorSystemData).choiceGroups;
      await this.item.update({"system.choiceGroups": groups.map((group) => group.id === groupId ? {...group, options: group.options.filter((entry) => entry.id !== id)} : group)});
    } else if (kind === "group") {
      const groups = (this.item.system as unknown as DescriptorSystemData).choiceGroups;
      await this.item.update({"system.choiceGroups": groups.filter((group) => group.id !== id)});
    } else if (kind === "abilityOption") {
      const groupId = target.dataset.groupId;
      const groups = (this.item.system as unknown as SpeciesSystemData).abilityChoiceGroups;
      await this.item.update({"system.abilityChoiceGroups": groups.map((group) => group.id === groupId ? {...group, options: group.options.filter((entry) => entry.id !== id)} : group)});
    } else if (kind === "abilityGroup") {
      const groups = (this.item.system as unknown as SpeciesSystemData).abilityChoiceGroups;
      await this.item.update({"system.abilityChoiceGroups": groups.filter((group) => group.id !== id)});
    } else if (kind === "descriptor") {
      const grants = (this.item.system as unknown as SpeciesSystemData).descriptorGrants;
      await this.item.update({"system.descriptorGrants": grants.filter((grant) => grant.id !== id)});
    } else if (kind === "descriptorOption") {
      const groupId = target.dataset.groupId;
      const groups = (this.item.system as unknown as SpeciesSystemData).descriptorChoiceGroups;
      await this.item.update({"system.descriptorChoiceGroups": groups.map((group) => group.id === groupId ? {...group, options: group.options.filter((entry) => entry.id !== id)} : group)});
    } else if (kind === "descriptorGroup") {
      const groups = (this.item.system as unknown as SpeciesSystemData).descriptorChoiceGroups;
      await this.item.update({"system.descriptorChoiceGroups": groups.filter((group) => group.id !== id)});
    }
  }

  static async #onRollDepletion(this: CypherV2ItemSheet): Promise<void> {
    await rollItemDepletion(this.item as unknown as DepletionItemLike);
  }

  static async #onOpenFocusNode(
    this: CypherV2ItemSheet,
    _event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    const nodeId = target.dataset.nodeId;
    if (!nodeId) throw new Error("Missing Focus node ID.");
    await openFocusNode(this.#focusDocument(), nodeId);
  }

  static async #onEditFocusTree(this: CypherV2ItemSheet): Promise<void> {
    try {
      this.#assertGmFocusEditorAccess();
      this.#focusTreeEditor = new FocusTreeEditorSession(
        (this.item.system as unknown as FocusDocumentLike["system"]).graph
      );
      this.#focusEditorInteraction.reset();
      await this.#rerender();
    } catch (error) {
      notifyError(error);
    }
  }

  static async #onAddFocusAbility(this: CypherV2ItemSheet): Promise<void> {
    try {
      const editor = this.#editor();
      const abilities = [...game.items]
        .filter((item) => item.type === "ability")
        .sort((left, right) => left.name.localeCompare(right.name));
      if (abilities.length === 0) {
        ui.notifications.warn(game.i18n.localize("CYPHERV2.Focus.Editor.NoWorldAbilities"));
        return;
      }
      const data = await foundry.applications.api.DialogV2.input({
        window: {title: game.i18n.localize("CYPHERV2.Focus.Editor.AddAbility")},
        content: `<div class="cypherv2-dialog-fields">
          <label>${game.i18n.localize("CYPHERV2.Focus.Editor.Ability")}
            <select name="abilityUuid">${abilities.map((ability) => (
              `<option value="${escapeHtml(ability.uuid)}">${escapeHtml(ability.name)}</option>`
            )).join("")}</select>
          </label>
          ${this.#tierSelectHtml()}
        </div>`,
        rejectClose: false,
        ok: {label: game.i18n.localize("CYPHERV2.Focus.Editor.AddAbility")}
      }) as Record<string, unknown> | null;
      if (!data) return;
      const ability = await fromUuid(String(data.abilityUuid ?? ""));
      if (!ability) throw new Error(game.i18n.localize("CYPHERV2.Focus.Editor.AbilityUnavailable"));
      const node = editor.addAbility(
        ability as FocusEditorAbilityLike,
        Number(data.tier ?? 1)
      );
      this.#focusEditorInteraction.select(node.id);
      await this.#rerender();
    } catch (error) {
      notifyError(error);
    }
  }

  static async #onSaveFocusTree(this: CypherV2ItemSheet): Promise<void> {
    try {
      const editor = this.#editor();
      const warnings = editor.diagnostics().filter((entry) => entry.severity === "warning");
      if (warnings.length > 0) ui.notifications.warn(warnings.map((entry) => entry.message).join("\n"));
      await editor.save((graph) => this.item.update({"system.graph": graph}));
      this.#focusTreeEditor = null;
      this.#focusEditorInteraction.reset();
      ui.notifications.info(game.i18n.localize("CYPHERV2.Focus.Editor.Saved"));
      await this.#rerender();
    } catch (error) {
      if (error instanceof FocusGraphValidationError) {
        ui.notifications.error(error.diagnostics.map((entry) => entry.message).join("\n"));
        return;
      }
      notifyError(error);
    }
  }

  static async #onCancelFocusTree(this: CypherV2ItemSheet): Promise<void> {
    this.#focusTreeEditor?.cancel();
    this.#focusTreeEditor = null;
    this.#focusEditorInteraction.reset();
    await this.#rerender();
  }

  static async #onSelectFocusEditorNode(
    this: CypherV2ItemSheet,
    event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    this.#editor();
    this.#focusEditorInteraction.select(this.#nodeId(target));
    await this.#rerender();
  }

  static async #onMoveFocusNode(
    this: CypherV2ItemSheet,
    _event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    try {
      const direction = target.dataset.direction;
      if (direction !== "left" && direction !== "right") throw new Error("Missing movement direction.");
      this.#editor().moveNode(this.#nodeId(target), direction);
      await this.#rerender();
    } catch (error) {
      notifyError(error);
    }
  }

  static async #onSetFocusNodeTier(
    this: CypherV2ItemSheet,
    _event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    try {
      this.#editor().setTier(this.#nodeId(target), Number(target.dataset.tier));
      await this.#rerender();
    } catch (error) {
      notifyError(error);
    }
  }

  static async #onStartFocusConnection(
    this: CypherV2ItemSheet,
    _event: PointerEvent,
    _target: HTMLElement
  ): Promise<void> {
    this.#editor();
    this.#focusEditorInteraction.startConnection();
    await this.#rerender();
  }

  static async #onCompleteFocusConnection(
    this: CypherV2ItemSheet,
    _event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    try {
      const destination = this.#nodeId(target);
      const connection = this.#focusEditorInteraction.connectionTo(destination);
      this.#editor().connect(connection.from, connection.to);
      this.#focusEditorInteraction.finishConnection(destination);
      await this.#rerender();
    } catch (error) {
      notifyError(error);
    }
  }

  static async #onCancelFocusConnection(this: CypherV2ItemSheet): Promise<void> {
    this.#focusEditorInteraction.cancelConnection();
    await this.#rerender();
  }

  static async #onDeleteFocusConnection(
    this: CypherV2ItemSheet,
    _event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    try {
      const connectionId = target.dataset.connectionId;
      if (!connectionId) throw new Error("Missing Focus connection ID.");
      this.#editor().deleteConnection(connectionId);
      await this.#rerender();
    } catch (error) {
      notifyError(error);
    }
  }

  static async #onClearFocusConnections(this: CypherV2ItemSheet): Promise<void> {
    try {
      const editor = this.#editor();
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: {title: game.i18n.localize("CYPHERV2.Focus.Editor.ClearConnections")},
        content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.localize("CYPHERV2.Focus.Editor.ClearConnectionsConfirm")}</p></div>`,
        rejectClose: false,
        modal: true,
        yes: {label: game.i18n.localize("CYPHERV2.Focus.Editor.ClearConnections")},
        no: {label: game.i18n.localize("CYPHERV2.Actions.Cancel")}
      });
      if (!confirmed) return;
      editor.clearConnections();
      this.#focusEditorInteraction.cancelConnection();
      await this.#rerender();
    } catch (error) {
      notifyError(error);
    }
  }

  static async #onRefreshFocusSnapshot(
    this: CypherV2ItemSheet,
    _event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    try {
      const nodeId = this.#nodeId(target);
      const node = this.#editor().graph.nodes.find((entry) => entry.id === nodeId);
      if (!node) throw new Error(`Focus node '${nodeId}' was not found.`);
      const ability = await fromUuid(node.abilityUuid);
      if (!ability) throw new Error(game.i18n.localize("CYPHERV2.Focus.Editor.AbilityUnavailable"));
      this.#editor().refreshSnapshot(nodeId, ability as FocusEditorAbilityLike);
      await this.#rerender();
    } catch (error) {
      notifyError(error);
    }
  }

  static async #onDeleteFocusNode(
    this: CypherV2ItemSheet,
    _event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    try {
      const nodeId = this.#nodeId(target);
      const node = this.#editor().graph.nodes.find((entry) => entry.id === nodeId);
      if (!node) throw new Error(`Focus node '${nodeId}' was not found.`);
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: {title: game.i18n.localize("CYPHERV2.Focus.Editor.DeleteNode")},
        content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Focus.Editor.DeleteNodeConfirm", {
          name: escapeHtml(node.abilitySnapshot.name || node.id)
        })}</p></div>`,
        rejectClose: false,
        modal: true,
        yes: {label: game.i18n.localize("CYPHERV2.Actions.Delete")},
        no: {label: game.i18n.localize("CYPHERV2.Actions.Cancel")}
      });
      if (!confirmed) return;
      this.#editor().deleteNode(nodeId);
      this.#focusEditorInteraction.clearSelection(nodeId);
      await this.#rerender();
    } catch (error) {
      notifyError(error);
    }
  }

  #assertGmFocusEditorAccess(): void {
    if (this.item.type !== "focus" || !game.user.isGM || !this.isEditable) {
      throw new Error(game.i18n.localize("CYPHERV2.Focus.Editor.GmOnly"));
    }
  }

  #editor(): FocusTreeEditorSession {
    this.#assertGmFocusEditorAccess();
    if (!this.#focusTreeEditor) throw new Error("Focus Tree editing is not active.");
    return this.#focusTreeEditor;
  }

  #focusDocument(): FocusDocumentLike {
    const graph = this.#focusTreeEditor?.graph
      ?? (this.item.system as unknown as FocusDocumentLike["system"]).graph;
    return {
      id: this.item.id,
      uuid: this.item.uuid,
      name: this.item.name,
      type: this.item.type,
      system: {graph}
    };
  }

  async #addAbility(ability: FocusEditorAbilityLike): Promise<void> {
    const editor = this.#editor();
    if (ability.type !== "ability") {
      throw new Error(game.i18n.localize("CYPHERV2.Focus.Editor.DropAbilityOnly"));
    }
    const data = await foundry.applications.api.DialogV2.input({
      window: {title: game.i18n.localize("CYPHERV2.Focus.Editor.ChooseTier")},
      content: `<div class="cypherv2-dialog-fields">${this.#tierSelectHtml()}</div>`,
      rejectClose: false,
      ok: {label: game.i18n.localize("CYPHERV2.Focus.Editor.AddAbility")}
    }) as Record<string, unknown> | null;
    if (!data) return;
    const node = editor.addAbility(ability, Number(data.tier ?? 1));
    this.#focusEditorInteraction.select(node.id);
    await this.#rerender();
  }

  #tierSelectHtml(): string {
    return `<label>${game.i18n.localize("CYPHERV2.Focus.Tier")}
      <select name="tier">${[1, 2, 3, 4, 5, 6]
        .map((tier) => `<option value="${tier}">${tier}</option>`)
        .join("")}</select>
    </label>`;
  }

  #snapshot(source: Item): {name: string; img?: string; system: Record<string, unknown>} {
    const img = (source as unknown as {img?: string}).img;
    return {name: source.name, ...(img ? {img} : {}), system: structuredClone(source.system)};
  }

  #genreEntry(id: string | undefined): GenreAbilityEntry | null {
    if (!id || this.item.type !== "genre") return null;
    return (this.item.system as unknown as GenreSystemData).abilityCatalog.find((entry) => entry.id === id) ?? null;
  }

  async #addGenreAbility(source: Item, minimumTier = 1): Promise<void> {
    if (this.item.type !== "genre" || source.type !== "ability") {
      throw new Error(game.i18n.localize("CYPHERV2.Genre.DropAbilityOnly"));
    }
    const system = this.item.system as unknown as GenreSystemData;
    if (system.abilityCatalog.some((entry) => entry.abilityUuid === source.uuid)) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Genre.DuplicateAbility"));
      return;
    }
    const entry: GenreAbilityEntry = {
      id: crypto.randomUUID(),
      abilityUuid: source.uuid,
      minimumTier: normalizeGenreMinimumTier(minimumTier),
      catalog: "progression",
      minimumSuperheroRank: 0,
      snapshot: this.#snapshot(source)
    };
    await this.item.update({"system.abilityCatalog": [...system.abilityCatalog, entry]});
  }

  #skillOption(source: Item | null, customName = "", notes = ""): SkillGrantOption | null {
    const name = customName.trim();
    if (!source && !name) return null;
    return {
      id: crypto.randomUUID(),
      skillUuid: source?.uuid ?? "",
      customName: source ? "" : name,
      notes: notes.trim(),
      snapshot: source ? this.#snapshot(source) : {name, system: {}}
    };
  }

  async #addCustomSkill(name: string, rank: SkillRank, notes = ""): Promise<void> {
    const system = this.item.system as unknown as DescriptorSystemData;
    const option = this.#skillOption(null, name, notes);
    if (!option) return;
    const grant: SkillGrant = {...option, rank};
    await this.item.update({"system.skillGrants": [...system.skillGrants, grant]});
  }

  async #addPackageDocument(source: Item, mode: "fixed", rank: SkillRank = "trained", notes = ""): Promise<void> {
    if (this.item.type === "characterType" && source.type === "ability") {
      const system = this.item.system as unknown as {abilityGrants: AbilityGrant[]};
      const grant: AbilityGrant = {id: crypto.randomUUID(), abilityUuid: source.uuid, snapshot: this.#snapshot(source)};
      await this.item.update({"system.abilityGrants": [...system.abilityGrants, grant]});
      return;
    }
    if (this.item.type === "characterType" && source.type === "skill") {
      const system = this.item.system as unknown as CharacterTypeSystemData;
      const option = this.#skillOption(source, "", notes);
      if (!option) return;
      await this.item.update({"system.skillGrants": [...system.skillGrants, {...option, rank}]});
      return;
    }
    if (this.item.type === "descriptor" && source.type === "skill") {
      const system = this.item.system as unknown as DescriptorSystemData;
      const option = this.#skillOption(source, "", notes);
      if (!option) return;
      await this.item.update({"system.skillGrants": [...system.skillGrants, {...option, rank}]});
      return;
    }
    if (this.item.type === "species") {
      const system = this.item.system as unknown as SpeciesSystemData;
      if (source.type === "ability") {
        const grant: AbilityGrant = {id: crypto.randomUUID(), abilityUuid: source.uuid, snapshot: this.#snapshot(source)};
        await this.item.update({"system.abilityGrants": [...system.abilityGrants, grant]});
        return;
      }
      if (source.type === "skill") {
        const option = this.#skillOption(source, "", notes);
        if (!option) return;
        await this.item.update({"system.skillGrants": [...system.skillGrants, {...option, rank}]});
        return;
      }
      if (source.type === "descriptor") {
        const grant: DescriptorGrant = {id: crypto.randomUUID(), descriptorUuid: source.uuid, snapshot: this.#snapshot(source)};
        await this.item.update({"system.descriptorGrants": [...system.descriptorGrants, grant]});
        return;
      }
    }
    throw new Error(game.i18n.localize("CYPHERV2.Packages.InvalidDrop"));
  }

  #packageEntry(target: HTMLElement): AbilityGrant | SkillGrant | SkillGrantOption | DescriptorGrant | null {
    const kind = target.dataset.grantKind;
    const id = target.dataset.grantId;
    if (!id) return null;
    if (kind === "ability") return (this.item.system as unknown as {abilityGrants: AbilityGrant[]}).abilityGrants.find((entry) => entry.id === id) ?? null;
    const system = this.item.system as unknown as DescriptorSystemData;
    if (kind === "skill") return system.skillGrants.find((entry) => entry.id === id) ?? null;
    if (kind === "option") return system.choiceGroups.find((group) => group.id === target.dataset.groupId)?.options.find((entry) => entry.id === id) ?? null;
    if (kind === "abilityOption") return (this.item.system as unknown as SpeciesSystemData).abilityChoiceGroups.find((group) => group.id === target.dataset.groupId)?.options.find((entry) => entry.id === id) ?? null;
    if (kind === "descriptor") return (this.item.system as unknown as SpeciesSystemData).descriptorGrants.find((entry) => entry.id === id) ?? null;
    if (kind === "descriptorOption") return (this.item.system as unknown as SpeciesSystemData).descriptorChoiceGroups.find((group) => group.id === target.dataset.groupId)?.options.find((entry) => entry.id === id) ?? null;
    return null;
  }

  async #replacePackageEntry(target: HTMLElement, replacement: AbilityGrant | SkillGrant | SkillGrantOption | DescriptorGrant): Promise<void> {
    const kind = target.dataset.grantKind;
    const id = target.dataset.grantId;
    if (kind === "ability") {
      const grants = (this.item.system as unknown as {abilityGrants: AbilityGrant[]}).abilityGrants;
      await this.item.update({"system.abilityGrants": grants.map((entry) => entry.id === id ? replacement : entry)});
    } else if (kind === "skill") {
      const grants = (this.item.system as unknown as DescriptorSystemData).skillGrants;
      await this.item.update({"system.skillGrants": grants.map((entry) => entry.id === id ? replacement : entry)});
    } else if (kind === "option") {
      const groupId = target.dataset.groupId;
      const groups = (this.item.system as unknown as DescriptorSystemData).choiceGroups;
      await this.item.update({"system.choiceGroups": groups.map((group) => group.id === groupId ? {...group, options: group.options.map((entry) => entry.id === id ? replacement : entry)} : group)});
    } else if (kind === "abilityOption") {
      const groupId = target.dataset.groupId;
      const groups = (this.item.system as unknown as SpeciesSystemData).abilityChoiceGroups;
      await this.item.update({"system.abilityChoiceGroups": groups.map((group) => group.id === groupId ? {...group, options: group.options.map((entry) => entry.id === id ? replacement : entry)} : group)});
    } else if (kind === "descriptor") {
      const grants = (this.item.system as unknown as SpeciesSystemData).descriptorGrants;
      await this.item.update({"system.descriptorGrants": grants.map((entry) => entry.id === id ? replacement : entry)});
    } else if (kind === "descriptorOption") {
      const groupId = target.dataset.groupId;
      const groups = (this.item.system as unknown as SpeciesSystemData).descriptorChoiceGroups;
      await this.item.update({"system.descriptorChoiceGroups": groups.map((group) => group.id === groupId ? {...group, options: group.options.map((entry) => entry.id === id ? replacement as DescriptorGrant : entry)} : group)});
    }
  }

  #nodeId(target: HTMLElement): string {
    const nodeId = target.dataset.nodeId;
    if (!nodeId) throw new Error("Missing Focus node ID.");
    return nodeId;
  }

  async #rerender(): Promise<void> {
    this.#pendingFocusEditorScroll = captureFocusEditorScroll(this.element);
    await this.render({force: true});
  }

  override async _prepareContext(options: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (this.element?.isConnected) this.#pendingItemUiState = captureItemSheetUiState(this.element);
    const context = await super._prepareContext(options);
    const system = this.item.system as Record<string, unknown>;
    const isSkill = this.item.type === "skill";
    const isAbility = this.item.type === "ability";
    const isWeapon = this.item.type === "weapon";
    const isArmor = this.item.type === "armor";
    const isShield = this.item.type === "shield";
    const isEquipment = this.item.type === "equipment";
    const isCypher = this.item.type === "cypher";
    const isArtifact = this.item.type === "artifact";
    const isFocus = this.item.type === "focus";
    const isGenre = this.item.type === "genre";
    const isCharacterType = this.item.type === "characterType";
    const isDescriptor = this.item.type === "descriptor";
    const isSpecies = this.item.type === "species";
    const typeSuperheroSelected = isCharacterType && String(system.genre ?? "none") === "superhero";
    const typeInstance = isCharacterType
      ? (system.instance as CharacterTypeSystemData["instance"] | undefined)
      : undefined;
    const usesRichDescription = ["ability", "focus", "genre", "skill", "weapon", "armor", "shield", "equipment", "cypher", "artifact", "characterType", "descriptor", "species"].includes(this.item.type);
    const rawDescription = typeof this.item._source?.system?.description === "string"
      ? this.item._source.system.description
      : "";
    const enrichedDescription = usesRichDescription
      ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(rawDescription, {
        async: true,
        relativeTo: this.item
      })
      : "";
    const enrichedBackgroundOptions = isCharacterType
      ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(String(this.item._source.system.backgroundOptions ?? ""), {async: true, relativeTo: this.item})
      : "";
    const enrichedEquipmentNotes = isCharacterType
      ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(String(this.item._source.system.equipmentNotes ?? ""), {async: true, relativeTo: this.item})
      : "";
    const rank = String(system.rank ?? "untrained") as SkillRank;
    const defaultPool = String(system.defaultPool ?? "choose");
    const skillContexts = Array.isArray(system.contexts) ? system.contexts : [];
    const abilityCostPools = isAbility
      ? abilityAllowedPools(this.item as unknown as Parameters<typeof abilityAllowedPools>[0])
      : [];
    const abilityVisibility = isAbility
      ? abilityMechanicsVisibility(system as unknown as Parameters<typeof abilityMechanicsVisibility>[0])
      : null;
    const abilityMechanics = abilityVisibility ? {
      ...abilityVisibility,
      rollModifierLabel: game.i18n.localize(
        abilityVisibility.rollModifierLabel === "task"
          ? "CYPHERV2.Ability.TaskModifier"
          : abilityVisibility.rollModifierLabel === "defense"
            ? "CYPHERV2.Ability.DefenseModifier"
            : "CYPHERV2.Ability.RollModifier"
      )
    } : null;
    const genreAbilityMetadata = isAbility
      ? ((this.item as unknown as {flags?: {cypherv2?: {genreAbility?: {
        catalog?: string;
        genres?: string[];
        progressionBand?: string;
        minimumSuperheroRank?: number;
      }}}}).flags?.cypherv2?.genreAbility)
      : undefined;
    const abilityGenreReview = genreAbilityMetadata ? {
      catalogLabel: game.i18n.localize(`CYPHERV2.Genre.CatalogKind.${genreAbilityMetadata.catalog ?? "progression"}`),
      genresLabel: (genreAbilityMetadata.genres ?? []).map((genre) => (
        game.i18n.localize(`CYPHERV2.Packages.Genre.${genre}`)
      )).join(" · "),
      progressionBandLabel: genreAbilityMetadata.progressionBand === "origin"
        ? game.i18n.localize("CYPHERV2.Genre.CatalogKind.origin")
        : game.i18n.localize(`CYPHERV2.Genre.ProgressionBand.${genreAbilityMetadata.progressionBand ?? "mid-tier"}`),
      minimumSuperheroRank: Number(genreAbilityMetadata.minimumSuperheroRank ?? 0)
    } : null;
    const genreCatalogEntries = isGenre
      ? (system as unknown as GenreSystemData).abilityCatalog.map((entry) => ({
        ...entry,
        catalogLabel: game.i18n.localize(`CYPHERV2.Genre.CatalogKind.${entry.catalog ?? "progression"}`),
        progressionBandLabel: (entry.catalog ?? "progression") === "progression"
          ? entry.minimumTier === 3
            ? game.i18n.localize("CYPHERV2.Genre.ProgressionBand.mid-tier")
            : entry.minimumTier === 6
              ? game.i18n.localize("CYPHERV2.Genre.ProgressionBand.high-tier")
              : ""
          : "",
        minimumSuperheroRank: Number(entry.minimumSuperheroRank ?? 0)
      }))
      : [];
    const skillOptionalMechanics = isSkill && skillHasOptionalMechanics({
      defaultPool,
      category: String(system.category ?? "general"),
      contexts: skillContexts as string[],
      initiative: Boolean(system.initiative)
    });
    const grantedBy = system.grantedBy as {
      kind?: string;
      sourceUuid?: string;
      instanceId?: string;
      grantId?: string;
      status?: string;
    } | undefined;
    const hasGrantProvenance = Boolean(
      grantedBy?.sourceUuid || grantedBy?.instanceId || grantedBy?.grantId
    );
    const focusDocument = isFocus ? this.#focusDocument() : null;
    const focusGraph = focusDocument?.system.graph;
    const selectedFocusNode = focusGraph?.nodes.find((node) => (
      node.id === this.#focusEditorInteraction.selectedNodeId
    ));
    const nodeNames = new Map(focusGraph?.nodes.map((node) => [
      node.id,
      node.abilitySnapshot.name || node.id
    ]) ?? []);
    return {
      ...context,
      item: this.item,
      system: this.item.system,
      systemFields: documentSystemFields(this.item),
      enriched: {description: enrichedDescription, backgroundOptions: enrichedBackgroundOptions, equipmentNotes: enrichedEquipmentNotes},
      usesRichDescription,
      isSkill,
      isAbility,
      isWeapon,
      isArmor,
      isShield,
      isEquipment,
      isCypher,
      isArtifact,
      isFocus,
      isGenre,
      isCharacterType,
      typeCustomGenreSelected: isCharacterType && String(system.genre ?? "none") === "custom",
      typeSuperheroSelected,
      typeSuperheroAttached: typeSuperheroSelected && Boolean(typeInstance?.instanceId),
      typeSuperheroicsPoolLabel: typeInstance?.selections?.superheroicsPool
        && typeInstance.selections.superheroicsPool !== "none"
        ? game.i18n.localize(`CYPHERV2.Pools.${typeInstance.selections.superheroicsPool[0]!.toUpperCase()}${typeInstance.selections.superheroicsPool.slice(1)}`)
        : game.i18n.localize("CYPHERV2.Common.None"),
      typeWeaponFamiliesValue: isCharacterType
        ? normalizeWeaponFamilies((system as unknown as CharacterTypeSystemData).weaponFamilies).map(weaponFamilyLabel).join(", ")
        : "",
      speciesWeaponFamiliesValue: isSpecies
        ? normalizeWeaponFamilies((system as unknown as SpeciesSystemData).weaponFamilies).map(weaponFamilyLabel).join(", ")
        : "",
      weaponFamilySuggestions: BUILT_IN_WEAPON_FAMILIES.map((family) => ({value: weaponFamilyLabel(family)})),
      isDescriptor,
      isSpecies,
      isCompactRuleItem: isAbility || isSkill || isWeapon || isArmor || isShield || isEquipment || isCypher || isArtifact || isGenre || isCharacterType || isSpecies,
      usesCleanItemHeader: isAbility || isSkill || isWeapon || isArmor || isShield || isEquipment || isCypher || isArtifact || isFocus || isGenre || isDescriptor || isCharacterType || isSpecies,
      hideNormalItemFooter: isAbility || isSkill || isWeapon || isArmor || isShield || isEquipment || isCypher || isArtifact || isFocus || isGenre || isDescriptor || isCharacterType || isSpecies,
      genreEffortCapOptions: isGenre ? ["core", "unlimited"].map((value) => ({
        value,
        label: game.i18n.localize(`CYPHERV2.Genre.EffortCap.${value}`),
        selected: (system.options as {totalEffortCapMode?: string} | undefined)?.totalEffortCapMode === value
      })) : [],
      genreMinimumTierMin: GENRE_MINIMUM_TIER_MIN,
      genreMinimumTierMax: GENRE_MINIMUM_TIER_MAX,
      genreCatalogEntries,
      abilityMechanics,
      abilityGenreReview,
      skillOptionalMechanics,
      hasGrantProvenance,
      packagePoolOptions: ["none", ...POOL_KEYS].map((value) => ({
        value,
        label: value === "none" ? game.i18n.localize("CYPHERV2.Common.None") : game.i18n.localize(`CYPHERV2.Pools.${value[0]!.toUpperCase()}${value.slice(1)}`),
        selected: (system.edgeGrant as {pool?: string} | undefined)?.pool === value
      })),
      packageGenreOptions: ["none", "fantasy", "scienceFiction", "superhero", "custom"].map((value) => ({
        value,
        label: game.i18n.localize(`CYPHERV2.Packages.Genre.${value}`),
        selected: system.genre === value
      })),
      edgeModeOptions: ["none", "fixed", "choice"].map((value) => ({
        value,
        label: game.i18n.localize(value === "none" ? "CYPHERV2.Common.None" : value === "fixed" ? "CYPHERV2.Packages.FixedPool" : "CYPHERV2.Packages.ChoicePool"),
        selected: (system.edgeGrant as {mode?: string} | undefined)?.mode === value
      })),
      descriptorSkillGrants: isDescriptor ? (system.skillGrants as SkillGrant[]).map((grant) => ({
        ...grant, rankLabel: game.i18n.localize(`CYPHERV2.Skill.Ranks.${grant.rank}`)
      })) : [],
      descriptorPoolBonusChoiceGroups: isDescriptor
        ? ((system.poolBonusChoiceGroups ?? []) as PoolBonusChoiceGroup[]).map((group) => ({
          ...group,
          poolsLabel: group.pools.map((pool) => game.i18n.localize(
            `CYPHERV2.Pools.${pool[0]!.toUpperCase()}${pool.slice(1)}`
          )).join(" · ")
        }))
        : [],
      descriptorChoiceGroups: isDescriptor ? (system.choiceGroups as SkillChoiceGroup[]).map((group) => ({
        ...group, rankLabel: game.i18n.localize(`CYPHERV2.Skill.Ranks.${group.rank}`)
      })) : [],
      typeSkillGrants: isCharacterType ? (system.skillGrants as SkillGrant[]).map((grant) => ({
        ...grant, rankLabel: game.i18n.localize(`CYPHERV2.Skill.Ranks.${grant.rank}`)
      })) : [],
      typeSkillChoiceGroups: isCharacterType ? (system.choiceGroups as SkillChoiceGroup[]).map((group) => ({
        ...group, rankLabel: game.i18n.localize(`CYPHERV2.Skill.Ranks.${group.rank}`)
      })) : [],
      typeAbilityChoiceGroups: isCharacterType ? (system.abilityChoiceGroups as CharacterTypeSystemData["abilityChoiceGroups"]) : [],
      speciesSkillGrants: isSpecies ? (system.skillGrants as SkillGrant[]).map((grant) => ({...grant, rankLabel: game.i18n.localize(`CYPHERV2.Skill.Ranks.${grant.rank}`)})) : [],
      speciesSkillChoiceGroups: isSpecies ? (system.choiceGroups as SkillChoiceGroup[]).map((group) => ({...group, rankLabel: game.i18n.localize(`CYPHERV2.Skill.Ranks.${group.rank}`)})) : [],
      speciesAbilityChoiceGroups: isSpecies ? (system.abilityChoiceGroups as SpeciesSystemData["abilityChoiceGroups"]) : [],
      speciesDescriptorChoiceGroups: isSpecies
        ? (system.descriptorChoiceGroups as SpeciesSystemData["descriptorChoiceGroups"]).map((group) => ({
          ...group,
          catalogMode: (group.sourceMode ?? "fixed") === "catalog",
          catalogLabel: game.i18n.localize("CYPHERV2.Packages.AllAvailableDescriptors")
        }))
        : [],
      canEditFocusTree: Boolean(isFocus && game.user.isGM && this.isEditable && !this.#focusTreeEditor),
      focusTreeEditing: Boolean(this.#focusTreeEditor),
      focusEditor: this.#focusTreeEditor ? {
        dirty: this.#focusTreeEditor.dirty,
        tierOptions: [1, 2, 3, 4, 5, 6],
        connecting: Boolean(this.#focusEditorInteraction.connectionSourceNodeId),
        connectionSourceName: this.#focusEditorInteraction.connectionSourceNodeId
          ? nodeNames.get(this.#focusEditorInteraction.connectionSourceNodeId)
          : "",
        selectedNode: selectedFocusNode ? {
          ...selectedFocusNode,
          canMoveLeft: true,
          canMoveRight: true
        } : null,
        connections: focusGraph?.connections.map((connection) => ({
          ...connection,
          fromName: nodeNames.get(connection.from) ?? connection.from,
          toName: nodeNames.get(connection.to) ?? connection.to
        })) ?? []
      } : null,
      focusTrees: isFocus
        ? [await game.cypherv2.services.focusTrees.prepare(focusDocument!, this.#focusTreeEditor ? {
          editor: {
            selectedNodeId: this.#focusEditorInteraction.selectedNodeId,
            connectionSourceNodeId: this.#focusEditorInteraction.connectionSourceNodeId
          }
        } : {})]
        : [],
      isHeavyWeapon: isWeapon && system.category === "heavy",
      abilityActivationOptions: isAbility ? ABILITY_ACTIVATIONS.map((value) => ({
        value,
        label: game.i18n.localize(`CYPHERV2.Ability.Activation.${value}`),
        selected: system.activation === value
      })) : [],
      abilityAllowedPoolOptions: isAbility ? POOL_KEYS.map((value) => ({
        value,
        label: game.i18n.localize(`CYPHERV2.Pools.${value[0]!.toUpperCase()}${value.slice(1)}`),
        selected: abilityCostPools.includes(value)
      })) : [],
      abilityRollOptions: isAbility ? ABILITY_ROLL_TYPES.map((value) => ({
        value,
        label: game.i18n.localize(`CYPHERV2.Ability.Roll.${value}`),
        selected: system.roll === value
      })) : [],
      abilityWoundOptions: isAbility ? ["none", ...WOUND_SEVERITIES].map((value) => ({
        value,
        label: game.i18n.localize(value === "none"
          ? "CYPHERV2.Common.None"
          : `CYPHERV2.Wounds.Severity.${value}`),
        selected: system.woundSeverity === value
      })) : [],
      abilityTargetOptions: isAbility ? ABILITY_TARGET_MODES.map((value) => ({
        value,
        label: game.i18n.localize(`CYPHERV2.Ability.TargetMode.${value}`),
        selected: system.targetMode === value
      })) : [],
      cypherManifestationOptions: isCypher ? CYPHER_MANIFESTATIONS.map((value) => ({
        value,
        label: game.i18n.localize(`CYPHERV2.Cypher.Manifestation.${value}`),
        selected: system.manifestation === value
      })) : [],
      cypherPowerOptions: isCypher ? CYPHER_POWERS.map((value) => ({
        value,
        label: game.i18n.localize(`CYPHERV2.Cypher.Power.${value}`),
        selected: system.power === value
      })) : [],
      cypherEffectiveLevel: isCypher ? cypherLevel(system) : 0,
      artifactLevelRollable: isArtifact ? artifactLevelIsRollable(system) : false,
      skillRankOptions: isSkill ? SKILL_RANKS.map((value) => ({
        value,
        label: game.i18n.localize(`CYPHERV2.Skill.Ranks.${value}`),
        selected: value === rank
      })) : [],
      skillPoolOptions: isSkill ? [
        {value: "choose", label: game.i18n.localize("CYPHERV2.Skill.ChoosePool"), selected: defaultPool === "choose"},
        ...POOL_KEYS.map((value: PoolKey) => ({
          value,
          label: game.i18n.localize(`CYPHERV2.Pools.${value[0]!.toUpperCase()}${value.slice(1)}`),
          selected: value === defaultPool
        }))
      ] : [],
      skillContextOptions: isSkill ? [
        "attack",
        "attack.weapon",
        "attack.melee",
        "attack.ranged",
        "weapon.light",
        "weapon.medium",
        "weapon.heavy",
        "defense",
        "defense.block",
        "defense.dodge",
        "perception"
      ].map((value) => ({
        value,
        label: game.i18n.localize(
          value === "attack"
            ? "CYPHERV2.Combat.Context.AnyAttack"
            : value === "defense"
              ? "CYPHERV2.Combat.Context.AnyDefense"
              : `CYPHERV2.Combat.Context.${value}`
        ),
        selected: skillContexts.includes(value)
      })) : [],
      weaponCategoryOptions: isWeapon ? WEAPON_CATEGORIES.map((value) => ({
        value,
        label: game.i18n.localize(`CYPHERV2.Combat.Weapon.Category.${value}`),
        selected: system.category === value
      })) : [],
      weaponFamilyDisplay: isWeapon ? weaponFamilyLabel(system.family) : "",
      weaponDefaultPoolOptions: isWeapon ? ["none", ...POOL_KEYS].map((value) => ({
        value,
        label: value === "none"
          ? game.i18n.localize("CYPHERV2.Common.None")
          : game.i18n.localize(`CYPHERV2.Pools.${value[0]!.toUpperCase()}${value.slice(1)}`),
        selected: system.defaultPool === value
      })) : [],
      weaponAttackTypeOptions: isWeapon ? WEAPON_ATTACK_TYPES.map((value) => ({
        value,
        label: game.i18n.localize(`CYPHERV2.Combat.Weapon.AttackType.${value}`),
        selected: system.attackType === value
      })) : [],
      rangeOptions: isWeapon ? RANGE_CATEGORIES.map((value) => ({
        value,
        label: game.i18n.localize(`CYPHERV2.Combat.Range.${value}`),
        selected: system.rangeCategory === value
      })) : [],
      weaponAttackModifierOptions: isWeapon ? [-2, -1, 0, 1, 2].map((value) => ({
        value,
        label: value > 0 ? `+${value}` : String(value),
        selected: system.attackModifier === value
      })) : [],
      weaponSkillLevelOptions: isWeapon ? SKILL_RANKS.map((value) => ({
        value,
        label: game.i18n.localize(`CYPHERV2.Skill.Ranks.${value}`),
        selected: system.skillLevel === value
      })) : [],
      combatResourcesExpanded: (isWeapon || isArmor || isShield)
        && this.#openDisclosures.has("combat-resources"),
      advancedExpanded: this.#openDisclosures.has("advanced"),
      shieldWoundsExpanded: isShield && this.#openDisclosures.has("shield-wounds"),
      combatDepletionSides: isWeapon || isArmor || isShield
        ? depletionDieSides((system.depletion ?? {die: "d6"}) as {die: string})
        : 0,
      combatDepletionThreshold: isWeapon || isArmor || isShield
        ? depletionThresholdLabel(Number((system.depletion as {threshold?: number} | undefined)?.threshold ?? 1))
        : "",
      depletionDieOptions: isWeapon || isArtifact ? DEPLETION_DICE.map((value) => ({
        value,
        label: `1 in 1${value}`,
        selected: (system.depletion as {die?: string} | undefined)?.die === value
      })) : [],
      armorCategoryOptions: isArmor ? ARMOR_CATEGORIES.map((value) => ({
        value,
        label: game.i18n.localize(`CYPHERV2.Combat.Armor.Category.${value}`),
        selected: system.category === value
      })) : [],
      shieldWoundTracks: isShield ? headerWoundTracks({
        minor: (system.wounds as ShieldItemLike["system"]["wounds"]).minor.length,
        moderate: (system.wounds as ShieldItemLike["system"]["wounds"]).moderate.length,
        major: (system.wounds as ShieldItemLike["system"]["wounds"]).major.length
      }, (system.derived as ShieldItemLike["system"]["derived"]).capacities).map((track) => ({
        ...track,
        label: game.i18n.localize(`CYPHERV2.Wounds.Severity.${track.severity}`),
        pips: track.pips.map((pip) => ({
          ...pip,
          tooltip: game.i18n.format("CYPHERV2.Hud.SetWoundCount", {
            severity: game.i18n.localize(`CYPHERV2.Wounds.Severity.${track.severity}`),
            count: pip.targetCount
          })
        }))
      })) : []
    };
  }
}
