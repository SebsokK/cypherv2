import {DOCUMENT_SHEET_FORM_OPTIONS, documentSystemFields} from "./document-sheet-options";
import {enforceReadOnlySheetPresentation, guardEditableActions} from "./sheet-permissions";
import {
  RECOVERY_TYPES,
  ARMOR_CATEGORIES,
  WEAPON_CATEGORIES,
  WOUND_SEVERITIES,
  type RecoveryType,
  type WoundSeverity
} from "../../constants/system";
import {
  POOL_KEYS,
  createRecoveryUsage,
  type CharacterDocumentLike,
  type PoolKey
} from "../../rules/core/core-types";
import {
  promptApplyWound,
  promptDeleteWound,
  promptEditWound,
  promptPoolDamage,
  promptCharacterOverride,
  promptRally,
  promptRecovery
} from "../dialogs/character-core-dialogs";
import {
  CHARACTER_OVERRIDE_KEYS,
  characterOverrideView,
  effectiveTier,
  type CharacterOverrideKey
} from "../../rules/core/character-overrides";
import {promptTestRoll} from "../dialogs/test-roll-dialog";
import type {RollCharacterDocumentLike} from "../../services/roll-service";
import {promptSkillRoll} from "../dialogs/skill-roll-dialog";
import {publishRollOutcome} from "../dialogs/roll-outcome";
import type {SkillItemLike} from "../../services/skill-service";
import {promptDefenseRoll, promptWeaponAttack} from "../dialogs/combat-dialogs";
import type {CombatCharacterLike} from "../../services/combat-service";
import type {ArmorItemLike, WeaponItemLike} from "../../combat/combat-types";
import {rollItemDepletion} from "../dialogs/depletion-roll";
import type {DepletionItemLike} from "../../depletion/depletion-types";
import {depletionLabel} from "../../depletion/depletion-rules";
import {
  captureCharacterSheetUiState,
  restoreCharacterSheetScroll,
  type CharacterSheetUiState
} from "./character-sheet-ui-state";
import type {FocusDocumentLike, FocusProgress} from "../../focus/focus-types";
import {openFocusNode} from "../../focus/focus-node-action";
import {FocusTreeConnectionController} from "../../focus/focus-tree-connections";
import {SystemTooltip} from "../tooltips/system-tooltip";
import {
  FocusAcquisitionError,
  type FocusAcquisitionErrorCode,
  type FocusCharacterLike
} from "../../services/focus-acquisition-service";
import {CORE_ADVANCEMENT_KINDS, type CoreAdvancementKind} from "../../advancement/advancement-types";
import type {AdvancementCharacterLike} from "../../services/advancement-service";
import {
  promptAdvanceTier,
  promptPurchaseAdvancement
} from "../dialogs/advancement-dialogs";
import {currentEnabledRuleModuleIds, currentRollPolicyRequest} from "../../config/settings";
import {
  promptAttachFocus,
  promptRemoveFocus
} from "../dialogs/focus-association-dialogs";
import type {FocusAssociationCharacterLike} from "../../services/focus-association-service";
import {
  markCoreInitialized,
  promptCoreCharacterSetup
} from "../dialogs/character-setup-dialog";
import type {InitializationCharacterLike} from "../../services/character-initialization-service";
import {
  promptGmMarkFocusOwned,
  promptUndoFocusAcquisition
} from "../dialogs/focus-progression-dialogs";
import {
  promptAttachDescriptor,
  promptAttachSpecies,
  promptAttachType,
  promptRemovePackage
} from "../dialogs/character-package-dialogs";
import type {PackageCharacterLike, PackageSourceLike} from "../../services/character-package-service";
import {GrantConflictCancelledError} from "../../packages/grant-conflicts";
import {resolveGrantConflictWithDialog} from "../dialogs/grant-conflict-dialog";
import type {AbilityItemLike} from "../../abilities/ability-types";
import {promptAbilityUse} from "../dialogs/ability-use-dialog";
import {promptAbilityCostPayment} from "../dialogs/ability-payment-dialog";
import type {ShieldItemLike} from "../../services/shield-service";
import {
  characterHeaderIdentity,
  headerPoolGauge,
  headerRecoveries,
  headerWoundTracks
} from "./character-header";
import {resolveCharacterAppearance} from "../../themes/character-appearance";
import {isSkillSortMode, sortSkillList, type SkillSortMode} from "./skill-list";
import {
  AbilityAccordionState,
  abilityListPresentation,
  sortAbilityList
} from "./ability-list";
import {formatAbilityCost} from "../../abilities/ability-cost";
import {
  INVENTORY_ITEM_TYPES,
  InventoryAccordionState,
  inventoryItemPresentation,
  isInventoryItemType,
  type InventoryItemType
} from "./inventory-list";
import type {ArtifactItemLike} from "../../artifacts/artifact-types";
import {formatStepModifier} from "../../rolls/step-modifier";
import {parseWoundCountActionData} from "./wound-count-action";
import {
  parseFamiliarityActionData,
  toggleManualFamiliarity,
  type FamiliarityActorLike,
  type FamiliarityFamily
} from "./character-familiarity";
import {
  promptAttachGenre,
  promptGenreAbilityBrowser,
  promptGenreChoice,
  promptRemoveGenre
} from "../dialogs/genre-dialogs";
import type {GenreCharacterLike} from "../../services/genre-service";
import type {GenreDocumentLike} from "../../genre/genre-types";
import {playerIntrusionController} from "../../intrusions/player-intrusion-controller";
import type {PlayerIntrusionCharacterLike} from "../../services/player-intrusion-service";

const SKILL_QUICK_ROLL_PULSE_CLASS = "is-quick-roll-pulse";

function pulseSkillQuickRoll(target: HTMLElement): void {
  target.classList.remove(SKILL_QUICK_ROLL_PULSE_CLASS);
  void target.offsetWidth;
  target.classList.add(SKILL_QUICK_ROLL_PULSE_CLASS);
  target.addEventListener("animationend", () => {
    target.classList.remove(SKILL_QUICK_ROLL_PULSE_CLASS);
  }, {once: true});
}

const ActorSheetV2 = foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.sheets.ActorSheetV2
);

function woundActionData(target: HTMLElement): {severity: WoundSeverity; woundId: string} {
  const severity = target.dataset.severity;
  const woundId = target.dataset.woundId;
  if (!WOUND_SEVERITIES.includes(severity as WoundSeverity) || !woundId) {
    throw new Error("Invalid Wound action data.");
  }
  return {severity: severity as WoundSeverity, woundId};
}

function itemId(target: HTMLElement): string {
  const id = target.dataset.itemId;
  if (!id) throw new Error("Missing Item ID.");
  return id;
}

function abilityPoolLabel(pool: PoolKey): string {
  return game.i18n.localize(`CYPHERV2.Pools.${pool[0]!.toUpperCase()}${pool.slice(1)}`);
}

function focusActionData(target: HTMLElement): {focusUuid: string; nodeId: string} {
  const focusUuid = target.dataset.focusUuid;
  const nodeId = target.dataset.nodeId;
  if (!focusUuid || !nodeId) throw new Error("Missing Focus node action data.");
  return {focusUuid, nodeId};
}

const FOCUS_ERROR_KEYS: Record<FocusAcquisitionErrorCode, string> = {
  "not-character": "CYPHERV2.Focus.Errors.NotCharacter",
  "node-not-found": "CYPHERV2.Focus.Errors.NodeNotFound",
  "progress-missing": "CYPHERV2.Focus.Errors.ProgressMissing",
  "progress-duplicated": "CYPHERV2.Focus.Errors.ProgressDuplicated",
  "not-eligible": "CYPHERV2.Focus.Errors.NotEligible",
  "choice-required": "CYPHERV2.Focus.Errors.ChoiceRequired",
  "restore-not-owned": "CYPHERV2.Focus.Errors.RestoreNotOwned",
  "undo-not-owned": "CYPHERV2.Focus.Errors.UndoNotOwned",
  "undo-dependent-nodes": "CYPHERV2.Focus.Errors.UndoDependencies",
  "duplicate-grant": "CYPHERV2.Focus.Errors.DuplicateGrant",
  "ability-data-unavailable": "CYPHERV2.Focus.Errors.AbilityDataUnavailable"
};

async function resolveFocus(actor: Actor, uuid: string): Promise<FocusDocumentLike | null> {
  try {
    const document = await fromUuid(uuid) as FocusDocumentLike | null;
    if (document?.type === "focus") return document;
  } catch {
    // Legacy Phase 1 shells stored an embedded Item ID rather than a UUID.
  }
  const embedded = actor.items.get(uuid);
  return embedded?.type === "focus" ? embedded as unknown as FocusDocumentLike : null;
}

const CHARACTER_MUTATING_ACTIONS = new Set([
  "applyWound", "setCharacterWoundCount", "setShieldWoundCount", "toggleFamiliarity",
  "editWound", "deleteWound", "poolDamage", "recovery", "recoveryType", "resetRecoveries", "rally",
  "editCharacterOverride", "clearCharacterOverride", "rollPool",
  "createSkill", "rollSkill", "configureSkillRoll", "deleteSkill", "resetHeaderAppearance",
  "createWeapon", "createArmor", "createShield", "attackWeapon", "rollCombatDepletion", "reloadWeapon",
  "toggleShieldEquipped", "toggleArmorEquipped", "deleteCombatItem", "block", "dodge",
  "acquireFocusNode", "gmAcquireFocusNode", "purchaseAdvancement", "advanceTier",
  "completeProgressionGuidance", "resetProgressionGuidance", "addFocus", "removeFocus",
  "toggleGmProgressionEdit", "undoFocusAcquisition", "gmMarkFocusOwned", "gmRemoveFocusOwned",
  "beginCoreSetup", "skipCoreSetup", "markCoreInitialized", "restoreFocusAbility",
  "addType", "addDescriptor", "addSpecies", "addGenre", "removeGenre", "acquireGenreAbility",
  "browseGenreAbilities", "removePackage", "createAbility", "useAbility", "payAbilityCost",
  "toggleAbilityArchived", "deleteAbility",
  "sendItemToChat", "createInventoryItem", "deleteInventoryItem", "rollInventoryDepletion", "rollArtifactLevel",
  "playerIntrusion"
]);

export class CharacterSheet extends ActorSheetV2 {
  readonly #focusTreeConnections = new FocusTreeConnectionController();
  readonly #systemTooltip = new SystemTooltip();
  #headerBindings: AbortController | null = null;
  #gmProgressionEdit = false;
  #skillSortMode: SkillSortMode = "name";
  readonly #abilityAccordion = new AbilityAccordionState();
  readonly #inventoryAccordion = new InventoryAccordionState();
  readonly #combatAccordion = new InventoryAccordionState();
  #inventoryBindings: AbortController | null = null;
  #pendingUiState: CharacterSheetUiState | null = null;
  #activeTab = "skills";

  static DEFAULT_OPTIONS = {
    ...DOCUMENT_SHEET_FORM_OPTIONS,
    classes: ["cypherv2", "sheet", "actor", "character-sheet"],
    actions: guardEditableActions({
      applyWound: CharacterSheet.#onApplyWound,
      setCharacterWoundCount: CharacterSheet.#onSetCharacterWoundCount,
      setShieldWoundCount: CharacterSheet.#onSetShieldWoundCount,
      toggleFamiliarity: CharacterSheet.#onToggleFamiliarity,
      editWound: CharacterSheet.#onEditWound,
      deleteWound: CharacterSheet.#onDeleteWound,
      poolDamage: CharacterSheet.#onPoolDamage,
      recovery: CharacterSheet.#onRecovery,
      recoveryType: CharacterSheet.#onRecoveryType,
      resetRecoveries: CharacterSheet.#onResetRecoveries,
      rally: CharacterSheet.#onRally,
      editCharacterOverride: CharacterSheet.#onEditCharacterOverride,
      clearCharacterOverride: CharacterSheet.#onClearCharacterOverride,
      rollPool: CharacterSheet.#onRollPool,
      inspectHeaderFocus: CharacterSheet.#onInspectHeaderFocus,
      createSkill: CharacterSheet.#onCreateSkill,
      setSkillSort: CharacterSheet.#onSetSkillSort,
      rollSkill: CharacterSheet.#onRollSkill,
      configureSkillRoll: CharacterSheet.#onConfigureSkillRoll,
      editSkill: CharacterSheet.#onEditSkill,
      deleteSkill: CharacterSheet.#onDeleteSkill,
      resetHeaderAppearance: CharacterSheet.#onResetHeaderAppearance,
      createWeapon: CharacterSheet.#onCreateWeapon,
      createArmor: CharacterSheet.#onCreateArmor,
      createShield: CharacterSheet.#onCreateShield,
      attackWeapon: CharacterSheet.#onAttackWeapon,
      toggleCombatDetails: CharacterSheet.#onToggleCombatDetails,
      rollCombatDepletion: CharacterSheet.#onRollCombatDepletion,
      reloadWeapon: CharacterSheet.#onReloadWeapon,
      toggleShieldEquipped: CharacterSheet.#onToggleShieldEquipped,
      toggleArmorEquipped: CharacterSheet.#onToggleArmorEquipped,
      editCombatItem: CharacterSheet.#onEditCombatItem,
      deleteCombatItem: CharacterSheet.#onDeleteCombatItem,
      block: CharacterSheet.#onBlock,
      dodge: CharacterSheet.#onDodge,
      openFocusNode: CharacterSheet.#onOpenFocusNode,
      acquireFocusNode: CharacterSheet.#onAcquireFocusNode,
      gmAcquireFocusNode: CharacterSheet.#onGmAcquireFocusNode,
      purchaseAdvancement: CharacterSheet.#onPurchaseAdvancement,
      advanceTier: CharacterSheet.#onAdvanceTier,
      completeProgressionGuidance: CharacterSheet.#onCompleteProgressionGuidance,
      resetProgressionGuidance: CharacterSheet.#onResetProgressionGuidance,
      addFocus: CharacterSheet.#onAddFocus,
      removeFocus: CharacterSheet.#onRemoveFocus,
      toggleGmProgressionEdit: CharacterSheet.#onToggleGmProgressionEdit,
      undoFocusAcquisition: CharacterSheet.#onUndoFocusAcquisition,
      gmMarkFocusOwned: CharacterSheet.#onGmMarkFocusOwned,
      gmRemoveFocusOwned: CharacterSheet.#onGmRemoveFocusOwned,
      beginCoreSetup: CharacterSheet.#onBeginCoreSetup,
      skipCoreSetup: CharacterSheet.#onSkipCoreSetup,
      markCoreInitialized: CharacterSheet.#onMarkCoreInitialized,
      restoreFocusAbility: CharacterSheet.#onRestoreFocusAbility,
      addType: CharacterSheet.#onAddType,
      addDescriptor: CharacterSheet.#onAddDescriptor,
      addSpecies: CharacterSheet.#onAddSpecies,
      addGenre: CharacterSheet.#onAddGenre,
      inspectGenre: CharacterSheet.#onInspectGenre,
      removeGenre: CharacterSheet.#onRemoveGenre,
      acquireGenreAbility: CharacterSheet.#onAcquireGenreAbility,
      browseGenreAbilities: CharacterSheet.#onBrowseGenreAbilities,
      inspectPackage: CharacterSheet.#onInspectPackage,
      removePackage: CharacterSheet.#onRemovePackage,
      inspectGrantedItem: CharacterSheet.#onInspectGrantedItem,
      createAbility: CharacterSheet.#onCreateAbility,
      useAbility: CharacterSheet.#onUseAbility,
      payAbilityCost: CharacterSheet.#onPayAbilityCost,
      toggleAbilityArchived: CharacterSheet.#onToggleAbilityArchived,
      toggleAbilityDetails: CharacterSheet.#onToggleAbilityDetails,
      inspectAbility: CharacterSheet.#onInspectAbility,
      deleteAbility: CharacterSheet.#onDeleteAbility,
      sendItemToChat: CharacterSheet.#onSendItemToChat,
      createInventoryItem: CharacterSheet.#onCreateInventoryItem,
      openInventoryItem: CharacterSheet.#onOpenInventoryItem,
      deleteInventoryItem: CharacterSheet.#onDeleteInventoryItem,
      toggleInventoryDetails: CharacterSheet.#onToggleInventoryDetails,
      rollInventoryDepletion: CharacterSheet.#onRollInventoryDepletion,
      rollArtifactLevel: CharacterSheet.#onRollArtifactLevel,
      playerIntrusion: CharacterSheet.#onPlayerIntrusion
    }, CHARACTER_MUTATING_ACTIONS),
    position: {width: 760, height: 760},
    window: {resizable: true}
  };

  static PARTS = {
    main: {template: "systems/cypherv2/templates/actor/character-sheet.hbs"}
  };

  static TABS = {
    primary: {
      tabs: [
        {id: "skills", icon: "fa-solid fa-graduation-cap", label: "CYPHERV2.Tabs.Skills"},
        {id: "abilities", icon: "fa-solid fa-bolt", label: "CYPHERV2.Tabs.Abilities"},
        {id: "combat", icon: "fa-solid fa-swords", label: "CYPHERV2.Tabs.Combat"},
        {id: "inventory", icon: "fa-solid fa-backpack", label: "CYPHERV2.Tabs.Inventory"},
        {id: "advancement", icon: "fa-solid fa-arrow-up-right-dots", label: "CYPHERV2.Tabs.Advancement"},
        {id: "notes", icon: "fa-solid fa-book-open", label: "CYPHERV2.Tabs.Notes"},
        {id: "settings", icon: "fa-solid fa-sliders", label: "CYPHERV2.Tabs.Settings"}
      ],
      initial: "skills"
    }
  };

  override async _onRender(
    context: Record<string, unknown>,
    options: Record<string, unknown>
  ): Promise<void> {
    await super._onRender(context, options);
    enforceReadOnlySheetPresentation(this.element, this.isEditable, CHARACTER_MUTATING_ACTIONS);
    if (this.#pendingUiState) {
      this.#activeTab = this.#pendingUiState.activeTab;
      const changeTab = (this as unknown as {
        changeTab?: (tab: string, group: string) => void;
      }).changeTab;
      if (typeof changeTab === "function") changeTab.call(this, this.#activeTab, "primary");
      restoreCharacterSheetScroll(this.element, this.#pendingUiState);
      this.#pendingUiState = null;
    }
    this.#focusTreeConnections.bind(this.element);
    this.#systemTooltip.bind(this.element);
    this.#bindHeaderKeyboardActions();
    this.#bindInventoryInputs();
  }

  override _onClose(options: Record<string, unknown>): void {
    this.#headerBindings?.abort();
    this.#headerBindings = null;
    this.#focusTreeConnections.disconnect();
    this.#systemTooltip.disconnect();
    this.#inventoryBindings?.abort();
    this.#inventoryBindings = null;
    super._onClose(options);
  }

  #bindInventoryInputs(): void {
    this.#inventoryBindings?.abort();
    this.#inventoryBindings = null;
    const inputs = [...this.element.querySelectorAll<HTMLInputElement>("input[data-inventory-quantity]")];
    const combatRows = [...this.element.querySelectorAll<HTMLElement>(
      ".combat-weapon-row[data-action], .combat-shield-row[data-action], .combat-armor-row[data-action]"
    )];
    if (!inputs.length && !combatRows.length) return;
    const controller = new AbortController();
    this.#inventoryBindings = controller;
    for (const row of combatRows) {
      row.addEventListener("keydown", (event) => {
        if (event.target !== row || (event.key !== "Enter" && event.key !== " ")) return;
        event.preventDefault();
        row.click();
      }, {signal: controller.signal});
    }
    if (!this.isEditable) return;
    for (const input of inputs) {
      input.addEventListener("change", async (event) => {
        // Quantity belongs to an embedded Item, not to the enclosing Actor form.
        event.stopPropagation();
        const id = input.dataset.itemId;
        const item = id ? this.actor.items.get(id) : null;
        const quantity = Number(input.value);
        if (!item || item.type !== "equipment" || !Number.isInteger(quantity) || quantity < 0) {
          await this.render({force: true});
          return;
        }
        await item.update({"system.quantity": quantity});
      }, {signal: controller.signal});
    }
  }

  override _canDragDrop(_selector: string): boolean {
    return this.isEditable;
  }

  override async _onDropDocument(event: DragEvent, document: unknown): Promise<unknown> {
    if (!this.isEditable) return null;
    const item = document as FocusDocumentLike & PackageSourceLike;
    const dropTarget = event.target instanceof Element
      ? event.target.closest<HTMLElement>("[data-hud-drop]")
      : null;
    const expectedType = dropTarget?.dataset.hudDrop;
    if (expectedType && item?.type !== expectedType) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Hud.InvalidIdentityDrop"));
      return null;
    }
    if (item?.type === "focus") {
      await promptAttachFocus(this.actor as unknown as FocusAssociationCharacterLike, item);
      return item;
    }
    if (item?.type === "characterType") {
      await promptAttachType(this.actor as unknown as PackageCharacterLike, item);
      return item;
    }
    if (item?.type === "descriptor") {
      await promptAttachDescriptor(this.actor as unknown as PackageCharacterLike, item);
      return item;
    }
    if (item?.type === "species") {
      await promptAttachSpecies(this.actor as unknown as PackageCharacterLike, item);
      return item;
    }
    if (item?.type === "genre") {
      await promptAttachGenre(this.actor as unknown as GenreCharacterLike, item as unknown as GenreDocumentLike);
      return item;
    }
    return super._onDropDocument(event, document);
  }

  static async #onAddType(this: CharacterSheet): Promise<void> {
    await promptAttachType(this.actor as unknown as PackageCharacterLike);
  }

  static async #onAddDescriptor(this: CharacterSheet): Promise<void> {
    await promptAttachDescriptor(this.actor as unknown as PackageCharacterLike);
  }

  static async #onAddSpecies(this: CharacterSheet): Promise<void> {
    await promptAttachSpecies(this.actor as unknown as PackageCharacterLike);
  }

  static async #onAddGenre(this: CharacterSheet): Promise<void> {
    await promptAttachGenre(this.actor as unknown as GenreCharacterLike);
  }

  static async #onInspectGenre(this: CharacterSheet): Promise<void> {
    const genre = await game.cypherv2.services.genres.active(this.actor as unknown as GenreCharacterLike);
    await genre?.sheet?.render(true);
  }

  static async #onRemoveGenre(this: CharacterSheet): Promise<void> {
    await promptRemoveGenre(this.actor as unknown as GenreCharacterLike);
  }

  static async #onAcquireGenreAbility(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    const choiceId = target.dataset.choiceId;
    if (!choiceId) return;
    await promptGenreChoice(this.actor as unknown as GenreCharacterLike, choiceId);
  }

  static async #onBrowseGenreAbilities(this: CharacterSheet): Promise<void> {
    await promptGenreAbilityBrowser(this.actor as unknown as GenreCharacterLike);
    await this.render({force: true});
  }

  static async #onInspectPackage(this: CharacterSheet, _event: PointerEvent, target: HTMLElement): Promise<void> {
    const item = this.actor.items.get(itemId(target));
    if (item?.type !== "characterType" && item?.type !== "descriptor" && item?.type !== "species") return;
    await item.sheet?.render(true);
  }

  static async #onRemovePackage(this: CharacterSheet, _event: PointerEvent, target: HTMLElement): Promise<void> {
    await promptRemovePackage(this.actor as unknown as PackageCharacterLike, itemId(target));
  }

  static async #onInspectGrantedItem(this: CharacterSheet, _event: PointerEvent, target: HTMLElement): Promise<void> {
    await this.actor.items.get(itemId(target))?.sheet?.render(true);
  }

  static async #onUseAbility(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    const ability = this.actor.items.get(itemId(target));
    if (!ability || ability.type !== "ability") throw new Error("Ability Item not found.");
    await promptAbilityUse(
      this.actor as unknown as CombatCharacterLike,
      ability as unknown as AbilityItemLike
    );
  }

  static async #onCreateAbility(this: CharacterSheet): Promise<void> {
    const created = await this.actor.createEmbeddedDocuments("Item", [{
      name: game.i18n.localize("CYPHERV2.Ability.New"),
      type: "ability"
    }]);
    const ability = created[0] as Item | undefined;
    await ability?.sheet?.render(true);
  }

  static #onToggleAbilityDetails(
    this: CharacterSheet,
    event: Event,
    target: HTMLElement
  ): void {
    event.preventDefault();
    event.stopPropagation();
    const id = itemId(target);
    const expanded = this.#abilityAccordion.toggle(id);
    const row = target.closest<HTMLElement>(".compact-ability");
    if (!row) return;
    row.classList.toggle("is-expanded", expanded);
    const details = row.querySelector<HTMLElement>(".compact-ability-details");
    if (details) details.hidden = !expanded;
    for (const control of row.querySelectorAll<HTMLElement>("[data-action='toggleAbilityDetails']")) {
      control.setAttribute("aria-expanded", String(expanded));
    }
  }

  static async #onInspectAbility(
    this: CharacterSheet,
    event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    const ability = this.actor.items.get(itemId(target));
    if (!ability || ability.type !== "ability") throw new Error("Ability Item not found.");
    await ability.sheet?.render(true);
  }

  static async #onPayAbilityCost(
    this: CharacterSheet,
    event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    const ability = this.actor.items.get(itemId(target));
    if (!ability || ability.type !== "ability") throw new Error("Ability Item not found.");
    try {
      await promptAbilityCostPayment(
        this.actor as unknown as CombatCharacterLike,
        ability as unknown as AbilityItemLike
      );
    } catch (error) {
      ui.notifications.error(error instanceof Error ? error.message : String(error));
    }
  }

  static async #onToggleAbilityArchived(
    this: CharacterSheet,
    event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    const ability = this.actor.items.get(itemId(target));
    if (!ability || ability.type !== "ability") throw new Error("Ability Item not found.");
    const archived = (ability.system as {archived?: boolean}).archived === true;
    await ability.update({"system.archived": !archived});
  }

  static async #onDeleteAbility(
    this: CharacterSheet,
    event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    const ability = this.actor.items.get(itemId(target));
    if (!ability || ability.type !== "ability") throw new Error("Ability Item not found.");
    const presentation = abilityListPresentation(ability as unknown as AbilityItemLike);
    if (!presentation.canDelete) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Ability.DeleteGranted"));
      return;
    }
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: {title: game.i18n.localize("CYPHERV2.Ability.DeleteTitle")},
      content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Ability.DeleteConfirm", {name: ability.name})}</p></div>`,
      yes: {label: game.i18n.localize("CYPHERV2.Actions.Delete")},
      no: {label: game.i18n.localize("CYPHERV2.Actions.Cancel")}
    });
    if (!confirmed) return;
    this.#abilityAccordion.remove(ability.id);
    await ability.delete();
  }

  static async #onCreateInventoryItem(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    const type = target.dataset.itemType;
    if (!isInventoryItemType(type)) throw new Error("Invalid Inventory Item type.");
    const created = await this.actor.createEmbeddedDocuments("Item", [{
      name: game.i18n.localize(`CYPHERV2.Inventory.New.${type}`),
      type
    }]);
    const item = created[0] as Item | undefined;
    await item?.sheet?.render(true);
  }

  static async #onOpenInventoryItem(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    const item = this.actor.items.get(itemId(target));
    if (!item || !isInventoryItemType(item.type)) throw new Error("Inventory Item not found.");
    await item.sheet?.render(true);
  }

  static #onToggleInventoryDetails(
    this: CharacterSheet,
    event: Event,
    target: HTMLElement
  ): void {
    event.preventDefault();
    event.stopPropagation();
    const id = itemId(target);
    const expanded = this.#inventoryAccordion.toggle(id);
    const row = target.closest<HTMLElement>(".compact-inventory-item");
    if (!row) return;
    row.classList.toggle("is-expanded", expanded);
    const details = row.querySelector<HTMLElement>(".compact-inventory-details");
    if (details) details.hidden = !expanded;
    target.setAttribute("aria-expanded", String(expanded));
  }

  static async #onDeleteInventoryItem(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    const item = this.actor.items.get(itemId(target));
    if (!item || !isInventoryItemType(item.type)) throw new Error("Inventory Item not found.");
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: {title: game.i18n.localize("CYPHERV2.Inventory.DeleteTitle")},
      content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Inventory.DeleteConfirm", {name: item.name})}</p></div>`,
      yes: {label: game.i18n.localize("CYPHERV2.Actions.Delete")},
      no: {label: game.i18n.localize("CYPHERV2.Actions.Cancel")}
    });
    if (!confirmed) return;
    this.#inventoryAccordion.remove(item.id);
    await item.delete();
  }

  static async #onRollInventoryDepletion(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    const item = this.actor.items.get(itemId(target));
    if (!item || item.type !== "artifact") throw new Error("Artifact Item not found.");
    await rollItemDepletion(item as unknown as DepletionItemLike);
  }

  static async #onRollArtifactLevel(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    const item = this.actor.items.get(itemId(target));
    if (!item || item.type !== "artifact") throw new Error("Artifact Item not found.");
    try {
      const result = await game.cypherv2.services.artifacts.rollLevel(item as unknown as ArtifactItemLike);
      await game.cypherv2.services.itemChat.publishArtifactLevelRoll(item, result);
    } catch (error) {
      ui.notifications.error(error instanceof Error ? error.message : String(error));
    }
  }

  static async #onSendItemToChat(
    this: CharacterSheet,
    event: Event,
    target: HTMLElement
  ): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    const item = this.actor.items.get(itemId(target));
    if (!item || !["ability", "weapon", "shield", "armor", ...INVENTORY_ITEM_TYPES]
      .includes(item.type as InventoryItemType | "ability" | "weapon" | "shield" | "armor")) {
      throw new Error("Chat Item not found.");
    }
    await game.cypherv2.services.itemChat.publish(item);
  }

  static async #onApplyWound(this: CharacterSheet): Promise<void> {
    await promptApplyWound(this.actor as unknown as CharacterDocumentLike);
  }

  static async #onSetCharacterWoundCount(
    this: CharacterSheet,
    event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    if (!this.isEditable || (!game.user.isGM && !this.actor.testUserPermission(
      game.user,
      CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
    ))) return;
    const data = parseWoundCountActionData(target.dataset);
    if (data.track !== "character") throw new Error("Invalid Character Wound count action data.");
    await game.cypherv2.services.wounds.setCount(
      this.actor as unknown as CharacterDocumentLike,
      data.severity,
      data.count
    );
    await this.render({force: true});
  }

  static async #onSetShieldWoundCount(
    this: CharacterSheet,
    event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    if (!this.isEditable || (!game.user.isGM && !this.actor.testUserPermission(
      game.user,
      CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
    ))) return;
    const data = parseWoundCountActionData(target.dataset);
    if (data.track !== "shield") throw new Error("Invalid Shield Wound count action data.");
    const shield = this.actor.items.get(data.shieldId);
    if (!shield || shield.type !== "shield") throw new Error("Shield Item not found.");
    await game.cypherv2.services.shields.setCount(
      shield as unknown as ShieldItemLike,
      data.severity,
      data.count
    );
    await this.render({force: true});
  }

  static async #onToggleFamiliarity(
    this: CharacterSheet,
    event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    if (!this.isEditable || (!game.user.isGM && !this.actor.testUserPermission(
      game.user,
      CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
    ))) return;
    const {family, category} = parseFamiliarityActionData(target.dataset);
    await toggleManualFamiliarity(this.actor as unknown as FamiliarityActorLike, family, category);
    await this.render({force: true});
  }

  static async #onEditWound(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    const {severity, woundId} = woundActionData(target);
    await promptEditWound(this.actor as unknown as CharacterDocumentLike, severity, woundId);
  }

  static async #onDeleteWound(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    const {severity, woundId} = woundActionData(target);
    await promptDeleteWound(this.actor as unknown as CharacterDocumentLike, severity, woundId);
  }

  static async #onPoolDamage(this: CharacterSheet): Promise<void> {
    await promptPoolDamage(this.actor as unknown as CharacterDocumentLike);
  }

  static async #onRecovery(this: CharacterSheet): Promise<void> {
    await promptRecovery(this.actor as unknown as CharacterDocumentLike);
  }

  static async #onRecoveryType(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    const type = target.dataset.recoveryType as RecoveryType | undefined;
    if (!type || !RECOVERY_TYPES.includes(type)) return;
    await promptRecovery(this.actor as unknown as CharacterDocumentLike, type);
  }

  static async #onResetRecoveries(this: CharacterSheet): Promise<void> {
    if (!game.user.isGM) return;
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: {title: game.i18n.localize("CYPHERV2.Hud.ResetRecoveries")},
      content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.localize("CYPHERV2.Hud.ResetRecoveriesConfirm")}</p></div>`,
      yes: {label: game.i18n.localize("CYPHERV2.Hud.ResetRecoveries")},
      no: {label: game.i18n.localize("CYPHERV2.Actions.Cancel")}
    });
    if (!confirmed) return;
    await this.actor.update({"system.recovery.used": createRecoveryUsage(false)});
    ui.notifications.info(game.i18n.localize("CYPHERV2.Hud.RecoveriesReset"));
  }

  static async #onRally(this: CharacterSheet, event?: Event): Promise<void> {
    event?.stopPropagation();
    await promptRally(this.actor as unknown as CharacterDocumentLike);
  }

  static async #onPlayerIntrusion(
    this: CharacterSheet,
    event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    if (target instanceof HTMLButtonElement) target.disabled = true;
    try {
      await playerIntrusionController().activate(
        this.actor as unknown as PlayerIntrusionCharacterLike & {
          testUserPermission(user: {id: string}, level: number): boolean;
        }
      );
    } catch (error) {
      ui.notifications.error(error instanceof Error ? error.message : String(error));
    } finally {
      if (
        target instanceof HTMLButtonElement
        && (this.actor.system as unknown as CharacterDocumentLike["system"]).xp >= 1
      ) target.disabled = false;
    }
  }

  static async #onEditCharacterOverride(
    this: CharacterSheet,
    event: Event,
    target: HTMLElement
  ): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    const key = target.dataset.overrideKey as CharacterOverrideKey | undefined;
    if (!key || !CHARACTER_OVERRIDE_KEYS.includes(key)) return;
    await promptCharacterOverride(this.actor as unknown as CharacterDocumentLike, key);
  }

  static async #onClearCharacterOverride(
    this: CharacterSheet,
    event: Event,
    target: HTMLElement
  ): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    const key = target.dataset.overrideKey as CharacterOverrideKey | undefined;
    if (!key || !CHARACTER_OVERRIDE_KEYS.includes(key)) return;
    const view = characterOverrideView(
      (this.actor as unknown as CharacterDocumentLike).system,
      key
    );
    await this.actor.update({[view.path]: null});
  }

  static async #onRollPool(
    this: CharacterSheet,
    event: Event,
    target: HTMLElement
  ): Promise<void> {
    if (event.target instanceof Element && event.target.closest("input, button, select, textarea, a")) return;
    const pool = target.dataset.pool as PoolKey | undefined;
    if (!pool || !POOL_KEYS.includes(pool)) return;
    await promptTestRoll(this.actor as unknown as RollCharacterDocumentLike, pool);
  }

  #bindHeaderKeyboardActions(): void {
    this.#headerBindings?.abort();
    this.#headerBindings = new AbortController();
    const {signal} = this.#headerBindings;
    for (const card of this.element.querySelectorAll<HTMLElement>(".character-hud-pool[data-action='rollPool']")) {
      card.addEventListener("keydown", (event) => {
        if (event.target !== card || (event.key !== "Enter" && event.key !== " ")) return;
        event.preventDefault();
        card.click();
      }, {signal});
    }
    const color = this.element.querySelector<HTMLInputElement>("input[data-header-color]");
    if (color && this.isEditable) {
      color.addEventListener("change", async (event) => {
        event.stopPropagation();
        await this.actor.update({"system.appearance.color": color.value});
      }, {signal});
    }
  }

  static async #onInspectHeaderFocus(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    const uuid = target.dataset.focusUuid;
    if (!uuid) return;
    const focus = await resolveFocus(this.actor, uuid);
    await (focus as unknown as Item | null)?.sheet?.render(true);
  }

  static async #onCreateSkill(this: CharacterSheet): Promise<void> {
    await this.actor.createEmbeddedDocuments("Item", [{
      name: game.i18n.localize("CYPHERV2.Skill.New"),
      type: "skill"
    }]);
  }

  static #onSetSkillSort(this: CharacterSheet, _event: Event, target: HTMLElement): void {
    const mode = target.dataset.sortMode;
    if (!isSkillSortMode(mode) || mode === this.#skillSortMode) return;
    this.#skillSortMode = mode;
    this.render({force: true});
  }

  static async #onRollSkill(
    this: CharacterSheet,
    event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    event.stopPropagation();
    const skill = this.actor.items.get(itemId(target));
    if (!skill || skill.type !== "skill") throw new Error("Skill Item not found.");
    pulseSkillQuickRoll(target);
    try {
      const enabledRuleModuleIds = currentEnabledRuleModuleIds();
      const request = game.cypherv2.services.skills.buildQuickRollRequest(
        skill as unknown as SkillItemLike,
        {enabledRuleModuleIds}
      );
      const execution = await game.cypherv2.services.rolls.execute(
        this.actor as unknown as RollCharacterDocumentLike,
        request,
        currentRollPolicyRequest()
      );
      await publishRollOutcome(this.actor as unknown as RollCharacterDocumentLike, execution);
    } catch (error) {
      ui.notifications.error(error instanceof Error ? error.message : String(error));
    }
  }

  static async #onConfigureSkillRoll(
    this: CharacterSheet,
    event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    event.stopPropagation();
    const skill = this.actor.items.get(itemId(target));
    if (!skill || skill.type !== "skill") throw new Error("Skill Item not found.");
    await promptSkillRoll(
      this.actor as unknown as RollCharacterDocumentLike,
      skill as unknown as SkillItemLike
    );
  }

  static async #onResetHeaderAppearance(this: CharacterSheet, event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    await this.actor.update({
      "system.appearance.backgroundMode": "theme",
      "system.appearance.customImage": "",
      "system.appearance.color": ""
    });
  }

  static async #onEditSkill(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    const skill = this.actor.items.get(itemId(target));
    if (!skill || skill.type !== "skill") throw new Error("Skill Item not found.");
    await skill.sheet?.render(true);
  }

  static async #onDeleteSkill(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    const skill = this.actor.items.get(itemId(target));
    if (!skill || skill.type !== "skill") throw new Error("Skill Item not found.");
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: {title: game.i18n.localize("CYPHERV2.Skill.DeleteTitle")},
      content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Skill.DeleteConfirm", {name: skill.name})}</p></div>`,
      yes: {label: game.i18n.localize("CYPHERV2.Actions.Delete")},
      no: {label: game.i18n.localize("CYPHERV2.Actions.Cancel")}
    });
    if (confirmed) await skill.delete();
  }

  static async #onCreateWeapon(this: CharacterSheet): Promise<void> {
    await this.actor.createEmbeddedDocuments("Item", [{name: game.i18n.localize("CYPHERV2.Combat.Weapon.New"), type: "weapon"}]);
  }

  static async #onCreateArmor(this: CharacterSheet): Promise<void> {
    await this.actor.createEmbeddedDocuments("Item", [{name: game.i18n.localize("CYPHERV2.Combat.Armor.New"), type: "armor"}]);
  }

  static async #onCreateShield(this: CharacterSheet): Promise<void> {
    await this.actor.createEmbeddedDocuments("Item", [{
      name: game.i18n.localize("CYPHERV2.Shield.New"),
      type: "shield"
    }]);
  }

  static async #onAttackWeapon(
    this: CharacterSheet,
    event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    const weapon = this.actor.items.get(itemId(target));
    if (!weapon || weapon.type !== "weapon") throw new Error("Weapon Item not found.");
    const ammunition = game.cypherv2.services.weapons.ammunition(weapon as unknown as WeaponItemLike);
    if (!ammunition.canAttack) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.Combat.Weapon.InsufficientAmmo"));
      return;
    }
    await promptWeaponAttack(
      this.actor as unknown as CombatCharacterLike,
      weapon as unknown as WeaponItemLike
    );
  }

  static #onToggleCombatDetails(
    this: CharacterSheet,
    event: Event,
    target: HTMLElement
  ): void {
    event.preventDefault();
    event.stopPropagation();
    const id = itemId(target);
    const expanded = this.#combatAccordion.toggle(id);
    const row = target.closest<HTMLElement>(".compact-combat-item");
    if (!row) return;
    row.classList.toggle("is-expanded", expanded);
    const details = row.querySelector<HTMLElement>(".compact-combat-details");
    if (details) details.hidden = !expanded;
    target.setAttribute("aria-expanded", String(expanded));
  }

  static async #onRollCombatDepletion(
    this: CharacterSheet,
    event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    const item = this.actor.items.get(itemId(target));
    if (!item || !["weapon", "shield", "armor"].includes(item.type)) {
      throw new Error("Combat Item not found.");
    }
    await rollItemDepletion(item as unknown as DepletionItemLike);
  }

  static async #onReloadWeapon(
    this: CharacterSheet,
    event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    if (!this.isEditable) return;
    const weapon = this.actor.items.get(itemId(target));
    if (!weapon || weapon.type !== "weapon") throw new Error("Weapon Item not found.");
    await game.cypherv2.services.weapons.reload(weapon as unknown as WeaponItemLike);
  }

  static async #onToggleShieldEquipped(
    this: CharacterSheet,
    event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    if (!this.isEditable) return;
    const shield = this.actor.items.get(itemId(target));
    if (!shield || shield.type !== "shield") throw new Error("Shield Item not found.");
    await game.cypherv2.services.shields.setEquipped(
      this.actor as unknown as import("../../services/shield-service").ShieldCharacterLike,
      shield as unknown as import("../../services/shield-service").ShieldItemLike,
      !(shield.system as {equipped: boolean}).equipped
    );
  }

  static async #onToggleArmorEquipped(
    this: CharacterSheet,
    event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    if (!this.isEditable) return;
    const armor = this.actor.items.get(itemId(target));
    if (!armor || armor.type !== "armor") throw new Error("Armor Item not found.");
    await armor.update({"system.equipped": !(armor.system as {equipped: boolean}).equipped});
  }

  static async #onEditCombatItem(
    this: CharacterSheet,
    event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    const item = this.actor.items.get(itemId(target));
    if (!item || (item.type !== "weapon" && item.type !== "armor" && item.type !== "shield")) {
      throw new Error("Combat Item not found.");
    }
    await item.sheet?.render(true);
  }

  static async #onDeleteCombatItem(
    this: CharacterSheet,
    event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    const item = this.actor.items.get(itemId(target));
    if (!item || (item.type !== "weapon" && item.type !== "armor" && item.type !== "shield")) {
      throw new Error("Combat Item not found.");
    }
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: {title: game.i18n.localize("CYPHERV2.Combat.DeleteItem")},
      content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.format("CYPHERV2.Combat.DeleteItemConfirm", {name: item.name})}</p></div>`,
      yes: {label: game.i18n.localize("CYPHERV2.Actions.Delete")},
      no: {label: game.i18n.localize("CYPHERV2.Actions.Cancel")}
    });
    if (!confirmed) return;
    this.#combatAccordion.remove(item.id);
    await item.delete();
  }

  static async #onBlock(this: CharacterSheet): Promise<void> {
    await promptDefenseRoll(this.actor as unknown as CombatCharacterLike, "block");
  }

  static async #onDodge(this: CharacterSheet): Promise<void> {
    await promptDefenseRoll(this.actor as unknown as CombatCharacterLike, "dodge");
  }

  static async #onOpenFocusNode(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    const {focusUuid, nodeId} = focusActionData(target);
    const focus = await resolveFocus(this.actor, focusUuid);
    if (!focus) throw new Error("Focus Item not found.");
    await openFocusNode(focus, nodeId);
  }

  static async #onAcquireFocusNode(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    const {focusUuid, nodeId} = focusActionData(target);
    const focus = await resolveFocus(this.actor, focusUuid);
    if (!focus) {
      ui.notifications.error(game.i18n.localize("CYPHERV2.Focus.Errors.FocusUnavailable"));
      return;
    }
    try {
      const result = await game.cypherv2.services.focusAcquisition.acquireManual(
        this.actor as unknown as FocusCharacterLike,
        focus,
        nodeId,
        resolveGrantConflictWithDialog
      );
      ui.notifications.info(game.i18n.localize(
        result.status === "acquired"
          ? "CYPHERV2.Focus.Acquired"
          : "CYPHERV2.Focus.AlreadyOwned"
      ));
      if (result.status === "acquired") await this.actor.sheet?.render(true);
    } catch (error) {
      CharacterSheet.#notifyFocusError(error);
    }
  }

  static async #onGmAcquireFocusNode(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    if (!game.user.isGM) return;
    const {focusUuid, nodeId} = focusActionData(target);
    const focus = await resolveFocus(this.actor, focusUuid);
    if (!focus) return;
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: {title: game.i18n.localize("CYPHERV2.Focus.GmOverrideAcquire")},
      content: `<div class="cypherv2 cypherv2-dialog"><p>${game.i18n.localize("CYPHERV2.Focus.GmOverrideConfirm")}</p></div>`,
      yes: {label: game.i18n.localize("CYPHERV2.Focus.GmOverrideAcquire")},
      no: {label: game.i18n.localize("CYPHERV2.Actions.Cancel")}
    });
    if (!confirmed) return;
    try {
      await game.cypherv2.services.focusAcquisition.acquireWithGmOverride(
        this.actor as unknown as FocusCharacterLike,
        focus,
        nodeId
      );
      ui.notifications.info(game.i18n.localize("CYPHERV2.Focus.Acquired"));
      await this.actor.sheet?.render(true);
    } catch (error) {
      CharacterSheet.#notifyFocusError(error);
    }
  }

  static async #onPurchaseAdvancement(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    const kind = target.dataset.kind;
    if (kind !== "other" && !CORE_ADVANCEMENT_KINDS.includes(kind as CoreAdvancementKind)) return;
    await promptPurchaseAdvancement(
      this.actor as unknown as AdvancementCharacterLike,
      kind as CoreAdvancementKind | "other"
    );
  }

  static async #onAdvanceTier(this: CharacterSheet): Promise<void> {
    await promptAdvanceTier(this.actor as unknown as AdvancementCharacterLike);
  }

  static async #onCompleteProgressionGuidance(this: CharacterSheet): Promise<void> {
    await game.cypherv2.services.advancement.completeProgressionGuidance(
      this.actor as unknown as AdvancementCharacterLike
    );
    await this.render({force: true});
  }

  static async #onResetProgressionGuidance(this: CharacterSheet): Promise<void> {
    await game.cypherv2.services.advancement.resetProgressionGuidance(
      this.actor as unknown as AdvancementCharacterLike
    );
    await this.render({force: true});
  }

  static async #onAddFocus(this: CharacterSheet): Promise<void> {
    await promptAttachFocus(this.actor as unknown as FocusAssociationCharacterLike);
  }

  static async #onRemoveFocus(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    const focusUuid = target.dataset.focusUuid;
    if (!focusUuid) return;
    await promptRemoveFocus(this.actor as unknown as FocusAssociationCharacterLike, focusUuid);
  }

  static async #onToggleGmProgressionEdit(this: CharacterSheet): Promise<void> {
    if (!game.user.isGM) return;
    this.#gmProgressionEdit = !this.#gmProgressionEdit;
    await this.render({force: true});
  }

  static async #onUndoFocusAcquisition(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    const {focusUuid, nodeId} = focusActionData(target);
    const focus = await resolveFocus(this.actor, focusUuid);
    if (!focus) return;
    await promptUndoFocusAcquisition(
      this.actor as unknown as FocusCharacterLike,
      focus,
      nodeId
    );
    await this.render({force: true});
  }

  static async #onGmMarkFocusOwned(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    if (!game.user.isGM || !this.#gmProgressionEdit) return;
    const {focusUuid, nodeId} = focusActionData(target);
    const focus = await resolveFocus(this.actor, focusUuid);
    if (!focus) return;
    await promptGmMarkFocusOwned(
      this.actor as unknown as FocusCharacterLike,
      focus,
      nodeId
    );
    await this.render({force: true});
  }

  static async #onGmRemoveFocusOwned(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    if (!game.user.isGM || !this.#gmProgressionEdit) return;
    const {focusUuid, nodeId} = focusActionData(target);
    const focus = await resolveFocus(this.actor, focusUuid);
    if (!focus) return;
    await promptUndoFocusAcquisition(
      this.actor as unknown as FocusCharacterLike,
      focus,
      nodeId
    );
    await this.render({force: true});
  }

  static async #onBeginCoreSetup(this: CharacterSheet): Promise<void> {
    await promptCoreCharacterSetup(this.actor as unknown as InitializationCharacterLike);
  }

  static async #onSkipCoreSetup(this: CharacterSheet): Promise<void> {
    if (!game.user.isGM) return;
    await markCoreInitialized(this.actor as unknown as InitializationCharacterLike, "skipped");
  }

  static async #onMarkCoreInitialized(this: CharacterSheet): Promise<void> {
    if (!game.user.isGM) return;
    await markCoreInitialized(this.actor as unknown as InitializationCharacterLike, "manual");
  }

  static async #onRestoreFocusAbility(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    const {focusUuid, nodeId} = focusActionData(target);
    const focus = await resolveFocus(this.actor, focusUuid);
    if (!focus) {
      ui.notifications.error(game.i18n.localize("CYPHERV2.Focus.Errors.FocusUnavailable"));
      return;
    }
    try {
      const result = await game.cypherv2.services.focusAcquisition.restoreAbility(
        this.actor as unknown as FocusCharacterLike,
        focus,
        nodeId
      );
      ui.notifications.info(game.i18n.localize(
        result.status === "restored"
          ? "CYPHERV2.Focus.AbilityRestored"
          : "CYPHERV2.Focus.AbilityAlreadyPresent"
      ));
      if (result.status === "restored") await this.actor.sheet?.render(true);
    } catch (error) {
      CharacterSheet.#notifyFocusError(error);
    }
  }

  static #notifyFocusError(error: unknown): void {
    if (error instanceof GrantConflictCancelledError) return;
    if (error instanceof FocusAcquisitionError) {
      ui.notifications.error(game.i18n.localize(FOCUS_ERROR_KEYS[error.code]));
      return;
    }
    console.error(error);
    ui.notifications.error(game.i18n.localize("CYPHERV2.Focus.Errors.Unexpected"));
  }

  override async _prepareContext(options: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (this.element?.isConnected) {
      this.#pendingUiState = captureCharacterSheetUiState(this.element);
      this.#activeTab = this.#pendingUiState.activeTab;
    }
    const context = await super._prepareContext(options);
    const skillItems = sortSkillList([...this.actor.items]
      .filter((item) => item.type === "skill")
      .map((item) => {
        const skill = item as unknown as SkillItemLike;
        const configuredPool = game.cypherv2.services.skills.configuredPool(skill);
        return {
          id: skill.id,
          name: skill.name,
          rank: skill.system.rank,
          rankLabel: game.i18n.localize(`CYPHERV2.Skill.Ranks.${skill.system.rank}`),
          poolLabel: configuredPool
            ? game.i18n.localize(`CYPHERV2.Pools.${configuredPool[0]!.toUpperCase()}${configuredPool.slice(1)}`)
            : game.i18n.localize("CYPHERV2.Skill.ChoosePool")
        };
      }), this.#skillSortMode);
    const abilityDocuments = sortAbilityList([...this.actor.items]
      .filter((item) => item.type === "ability")
      .map((item) => item as unknown as AbilityItemLike));
    this.#abilityAccordion.retain(abilityDocuments.map((ability) => ability.id));
    const abilityItems = await Promise.all(abilityDocuments.map(async (ability, index) => {
      const item = ability as unknown as Item;
      const presentation = abilityListPresentation(ability);
      const expanded = this.#abilityAccordion.isExpanded(ability.id);
      const costLabel = formatAbilityCost(
        presentation.cost.amount,
        presentation.cost.pools,
        abilityPoolLabel,
        {
          pair: game.i18n.localize("CYPHERV2.Ability.CostDisplay.Or"),
          middle: game.i18n.localize("CYPHERV2.Ability.CostDisplay.Separator"),
          final: game.i18n.localize("CYPHERV2.Ability.CostDisplay.FinalOr")
        }
      );
      const enrichedDescription = presentation.description
        ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(
          presentation.description,
          {async: true, relativeTo: item}
        )
        : "";
      return {
        id: ability.id,
        name: ability.name,
        archived: presentation.archived,
        startsArchivedGroup: presentation.archived
          && (index === 0 || abilityDocuments[index - 1]!.system.archived !== true),
        canPay: this.isEditable && presentation.cost.payable,
        canDelete: this.isEditable && presentation.canDelete,
        expanded,
        costLabel,
        enrichedDescription,
        hasDescription: Boolean(presentation.description)
      };
    }));
    const combatActor = this.actor as unknown as CombatCharacterLike;
    const combatDocuments = [...this.actor.items]
      .filter((item) => item.type === "weapon" || item.type === "shield" || item.type === "armor");
    const equippedShieldDocuments = combatDocuments.filter((item) => (
      item.type === "shield" && Boolean((item.system as {equipped?: boolean}).equipped)
    ));
    if (equippedShieldDocuments.length > 1 && this.isEditable) {
      await game.cypherv2.services.shields.normalizeEquipped(
        combatActor as unknown as import("../../services/shield-service").ShieldCharacterLike
      );
    }
    this.#combatAccordion.retain(combatDocuments.map((item) => item.id));
    const enrichCombatDescription = async (item: Item, description: string): Promise<string> => description
      ? foundry.applications.ux.TextEditor.implementation.enrichHTML(description, {async: true, relativeTo: item})
      : "";
    const weaponItems = (await Promise.all(combatDocuments
      .filter((item) => item.type === "weapon")
      .map(async (item) => {
        const weapon = item as unknown as WeaponItemLike;
        const description = weapon.system.description.trim();
        return {
          id: weapon.id,
          name: weapon.name,
          category: game.i18n.localize(`CYPHERV2.Combat.Weapon.Category.${weapon.system.category}`),
          attackType: game.i18n.localize(`CYPHERV2.Combat.Weapon.AttackType.${weapon.system.attackType}`),
          range: game.i18n.localize(`CYPHERV2.Combat.Range.${weapon.system.rangeCategory}`),
          damage: game.cypherv2.services.combat.weaponBaseDamage(weapon),
          depletionEnabled: weapon.system.depletion.enabled,
          depletionLabel: weapon.system.depletion.enabled
            ? depletionLabel(weapon.system.depletion)
            : "",
          ammoEnabled: weapon.system.ammo.enabled,
          ammoLabel: weapon.system.ammo.enabled
            ? `${weapon.system.ammo.value} / ${weapon.system.ammo.max}`
            : "",
          canAttack: game.cypherv2.services.weapons.ammunition(weapon).canAttack,
          depleted: Boolean(weapon.system.depleted),
          freelyUsed: game.cypherv2.services.combat.weaponFreelyUsed(combatActor, weapon),
          expanded: this.#combatAccordion.isExpanded(weapon.id),
          hasDescription: Boolean(description),
          enrichedDescription: await enrichCombatDescription(item, description)
        };
      })))
      .sort((left, right) => left.name.localeCompare(right.name));
    const armorItems = (await Promise.all(combatDocuments
      .filter((item) => item.type === "armor")
      .map(async (item) => {
        const armor = item as unknown as ArmorItemLike;
        const description = armor.system.description.trim();
        const depletion = armor.system.depletion;
        return {
          id: armor.id,
          name: armor.name,
          category: game.i18n.localize(`CYPHERV2.Combat.Armor.Category.${armor.system.category}`),
          equipped: armor.system.equipped,
          freelyUsed: game.cypherv2.services.combat.armorFreelyUsed(combatActor, armor),
          depletionEnabled: Boolean(depletion?.enabled),
          depletionLabel: depletion?.enabled ? depletionLabel(depletion) : "",
          depleted: Boolean(armor.system.depleted),
          expanded: this.#combatAccordion.isExpanded(armor.id),
          hasDescription: Boolean(description),
          enrichedDescription: await enrichCombatDescription(item, description)
        };
      })))
      .sort((left, right) => left.name.localeCompare(right.name));
    const shieldItems = (await Promise.all(combatDocuments
      .filter((item) => item.type === "shield")
      .map(async (item) => {
        const shield = item as unknown as ShieldItemLike;
        const description = shield.system.description.trim();
        const depletion = shield.system.depletion;
        const woundTracks = headerWoundTracks({
          minor: shield.system.wounds.minor.length,
          moderate: shield.system.wounds.moderate.length,
          major: shield.system.wounds.major.length
        }, shield.system.derived.capacities).map((track) => ({
          ...track,
          label: game.i18n.localize(`CYPHERV2.Wounds.Severity.${track.severity}`),
          shortLabel: game.i18n.localize(`CYPHERV2.Hud.Wounds.${track.severity}`)
        }));
        return {
          id: shield.id,
          name: shield.name,
          equipped: shield.system.equipped,
          broken: game.cypherv2.services.shields.isBroken(shield),
          minor: shield.system.wounds.minor.length,
          moderate: shield.system.wounds.moderate.length,
          major: shield.system.wounds.major.length,
          capacities: shield.system.derived.capacities,
          woundTracks,
          depletionEnabled: Boolean(depletion?.enabled),
          depletionLabel: depletion?.enabled ? depletionLabel(depletion) : "",
          depleted: Boolean(shield.system.depleted),
          expanded: this.#combatAccordion.isExpanded(shield.id),
          hasDescription: Boolean(description),
          enrichedDescription: await enrichCombatDescription(item, description)
        };
      })))
      .sort((left, right) => left.name.localeCompare(right.name));
    const multipleShieldsEquipped = shieldItems.filter((shield) => shield.equipped).length > 1;
    const characterSystem = this.actor.system as unknown as {
      tier: number;
      focusProgress?: FocusProgress[];
      advancement: AdvancementCharacterLike["system"]["advancement"];
    };
    const focusTrees = [];
    const missingFoci: string[] = [];
    const focusReferences: Array<{uuid: string; name: string; provenance: "creation" | "additional"}> = [];
    for (const progress of characterSystem.focusProgress ?? []) {
      const focus = await resolveFocus(this.actor, progress.focusUuid);
      if (!focus || focus.type !== "focus") {
        missingFoci.push(progress.focusUuid);
        continue;
      }
      focusReferences.push({
        uuid: progress.focusUuid,
        name: focus.name,
        provenance: progress.provenance ?? "additional"
      });
      const tree = await game.cypherv2.services.focusTrees.prepare(focus, {
        characterTier: effectiveTier(this.actor.system as unknown as CharacterDocumentLike["system"]),
        progress,
        editable: this.isEditable,
        missingOwnedNodeIds: game.cypherv2.services.focusAcquisition.missingOwnedNodeIds(
          this.actor as unknown as FocusCharacterLike,
          focus,
          progress
        ),
        gmOverrideAllowed: game.user.isGM,
        gmProgressionEdit: this.#gmProgressionEdit
      });
      focusTrees.push({
        ...tree,
        provenance: progress.provenance ?? "additional",
        provenanceLabel: `CYPHERV2.Focus.Association.${progress.provenance === "creation" ? "Creation" : "Additional"}`,
        ownedCount: progress.ownedNodeIds.length
      });
    }
    const advancement = game.cypherv2.services.advancement.view(
      this.actor as unknown as AdvancementCharacterLike,
      currentEnabledRuleModuleIds()
    );
    const guidance = game.cypherv2.services.advancement.progressionGuidance(
      this.actor as unknown as AdvancementCharacterLike,
      currentEnabledRuleModuleIds()
    );
    const typeItems = [...this.actor.items]
      .filter((item) => item.type === "characterType")
      .map((item) => ({id: item.id, name: item.name}));
    const speciesItems = [...this.actor.items]
      .filter((item) => item.type === "species")
      .map((item) => ({id: item.id, name: item.name}));
    const descriptorItems = [...this.actor.items]
      .filter((item) => item.type === "descriptor")
      .map((item) => {
        const instance = (item.system as {instance?: {
          role?: "primary" | "additional" | "speciesGranted" | "custom";
          instanceId?: string;
          attachedAt?: number;
        }}).instance;
        const role = instance?.role ?? "custom";
        return {
          id: item.id,
          name: item.name,
          role,
          instanceId: instance?.instanceId ?? item.id,
          attachedAt: instance?.attachedAt ?? 0,
          roleLabel: game.i18n.localize(`CYPHERV2.Packages.Role.${role}`)
        };
      });
    const packageNames = new Map([...this.actor.items]
      .filter((item) => item.type === "characterType" || item.type === "descriptor" || item.type === "species")
      .map((item) => [(item.system as {instance?: {instanceId?: string}}).instance?.instanceId ?? "", item.name]));
    const packageGrantedItems = [...this.actor.items]
      .filter((item) => {
        const provenance = (item.system as {grantedBy?: {kind?: string; instanceId?: string}}).grantedBy;
        return provenance?.instanceId && (provenance.kind === "type" || provenance.kind === "descriptor" || provenance.kind === "species");
      })
      .map((item) => {
        const provenance = (item.system as {grantedBy: {
          instanceId: string;
          grantId: string;
          status: string;
          replacement?: {active?: boolean; originalName?: string; replacementName?: string};
        }}).grantedBy;
        return {
          id: item.id,
          name: item.name,
          type: item.type,
          sourceName: packageNames.get(provenance.instanceId) ?? game.i18n.localize("CYPHERV2.Packages.Retained"),
          grantId: provenance.grantId,
          status: provenance.status,
          replacementLabel: provenance.replacement?.active
            ? `${provenance.replacement.originalName} → ${provenance.replacement.replacementName}`
            : ""
        };
      });
    const coreSystem = this.actor.system as unknown as CharacterDocumentLike["system"];
    const activeGenreDocument = await game.cypherv2.services.genres.active(
      this.actor as unknown as GenreCharacterLike
    );
    const genre = activeGenreDocument ? {
      attached: true,
      available: true,
      name: activeGenreDocument.name,
      uuid: activeGenreDocument.uuid,
      img: activeGenreDocument.img,
      provenance: coreSystem.genre.provenance,
      totalEffortCapMode: activeGenreDocument.system.options.totalEffortCapMode,
      totalEffortCapLabel: game.i18n.localize(
        `CYPHERV2.Genre.EffortCap.${activeGenreDocument.system.options.totalEffortCapMode}`
      )
    } : {
      attached: Boolean(coreSystem.genre.sourceUuid),
      available: false,
      name: coreSystem.genre.sourceUuid,
      uuid: coreSystem.genre.sourceUuid,
      img: "",
      provenance: coreSystem.genre.provenance,
      totalEffortCapMode: "core",
      totalEffortCapLabel: game.i18n.localize("CYPHERV2.Genre.EffortCap.core")
    };
    const inventoryDocuments = [...this.actor.items]
      .filter((item) => INVENTORY_ITEM_TYPES.includes(item.type as InventoryItemType))
      .sort((left, right) => left.name.localeCompare(right.name, "en-US"));
    this.#inventoryAccordion.retain(inventoryDocuments.map((item) => item.id));
    const inventoryItems = (await Promise.all(inventoryDocuments.map(async (item) => {
      const presentation = inventoryItemPresentation(item as unknown as Parameters<typeof inventoryItemPresentation>[0]);
      if (!presentation) return null;
      const expanded = this.#inventoryAccordion.isExpanded(item.id);
      const enrichedDescription = presentation.description
        ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(
          presentation.description,
          {async: true, relativeTo: item}
        )
        : "";
      return {
        ...presentation,
        expanded,
        hasDescription: Boolean(presentation.description),
        enrichedDescription,
        depletionLabel: presentation.depletion?.enabled
          ? presentation.depletion.formula
          : "",
        powerLabel: presentation.power
          ? game.i18n.localize(`CYPHERV2.Cypher.Power.${presentation.power}`)
          : "",
        canRollLevel: presentation.levelRollable && presentation.usable,
        canRollDepletion: Boolean(presentation.depletion?.enabled && presentation.usable)
      };
    }))).filter((item): item is NonNullable<typeof item> => item !== null);
    const inventory = {
      cypherLimit: coreSystem.derived.cypherLimit.max,
      equipment: inventoryItems.filter((item) => item.type === "equipment"),
      cyphers: inventoryItems.filter((item) => item.type === "cypher"),
      artifacts: inventoryItems.filter((item) => item.type === "artifact")
    };
    const primaryFocus = focusReferences.find((focus) => focus.provenance === "creation")
      ?? focusReferences[0];
    const identitySource = characterHeaderIdentity({
      descriptors: descriptorItems,
      ...(speciesItems[0] ? {species: {id: speciesItems[0].id, name: speciesItems[0].name}} : {}),
      ...(typeItems[0] ? {type: {id: typeItems[0].id, name: typeItems[0].name}} : {}),
      ...(primaryFocus ? {focus: {uuid: primaryFocus.uuid, name: primaryFocus.name}} : {})
    });
    const identity = {
      ...identitySource,
      descriptors: identitySource.descriptors.map((descriptor) => ({
        ...descriptor,
        displayName: descriptor.missing
          ? game.i18n.localize("CYPHERV2.Hud.Placeholder.Descriptor")
          : descriptor.displayName
      })),
      type: {
        ...identitySource.type,
        displayName: identitySource.type.missing
          ? game.i18n.localize("CYPHERV2.Hud.Placeholder.Type")
          : identitySource.type.displayName
      },
      focus: {
        ...identitySource.focus,
        displayName: identitySource.focus.missing
          ? game.i18n.localize("CYPHERV2.Hud.Placeholder.Focus")
          : identitySource.focus.displayName
      }
    };
    const woundTracks = headerWoundTracks({
      minor: coreSystem.wounds.minor.length,
      moderate: coreSystem.wounds.moderate.length,
      major: coreSystem.wounds.major.length
    }, coreSystem.derived.wounds.capacities).map((track) => ({
      ...track,
      shortLabel: game.i18n.localize(`CYPHERV2.Hud.Wounds.${track.severity}`),
      pips: track.pips.map((pip) => ({
        ...pip,
        tooltip: game.i18n.format("CYPHERV2.Hud.SetWoundCount", {
          severity: game.i18n.localize(`CYPHERV2.Wounds.Severity.${track.severity}`),
          count: pip.targetCount
        })
      })),
      tooltip: game.i18n.format("CYPHERV2.Hud.CharacterWoundTooltip", {
        severity: game.i18n.localize(`CYPHERV2.Wounds.Severity.${track.severity}`),
        count: track.count,
        capacity: track.capacity
      })
    }));
    const equippedShields = shieldItems.filter((shield) => shield.equipped);
    const activeShield = equippedShields.find((shield) => !shield.broken) ?? equippedShields[0];
    const headerShield = activeShield ? {
      ...activeShield,
      tracks: headerWoundTracks({
        minor: activeShield.minor,
        moderate: activeShield.moderate,
        major: activeShield.major
      }, activeShield.capacities).map((track) => ({
        ...track,
        itemId: activeShield.id,
        shortLabel: game.i18n.localize(`CYPHERV2.Hud.Wounds.${track.severity}`),
        pips: track.pips.map((pip) => ({
          ...pip,
          tooltip: game.i18n.format("CYPHERV2.Hud.SetShieldWoundCount", {
            shield: activeShield.name,
            severity: game.i18n.localize(`CYPHERV2.Wounds.Severity.${track.severity}`),
            count: pip.targetCount
          })
        })),
        tooltip: game.i18n.format("CYPHERV2.Hud.ShieldWoundTooltip", {
          shield: activeShield.name,
          severity: game.i18n.localize(`CYPHERV2.Wounds.Severity.${track.severity}`),
          count: track.count,
          capacity: track.capacity
        })
      }))
    } : null;
    const woundRows = woundTracks.map((character, index) => ({
      character,
      shield: headerShield?.tracks[index] ?? null
    }));
    const header = {
      appearance: resolveCharacterAppearance(coreSystem.appearance, this.actor.img),
      identity,
      stats: {
        tier: coreSystem.derived.tier.value,
        effort: coreSystem.derived.effort.max,
        xp: coreSystem.xp,
        resourcePoints: coreSystem.resourcePoints
      },
      playerIntrusion: {
        visible: this.isEditable,
        canUse: this.isEditable && game.cypherv2.services.playerIntrusions.canUse(
          this.actor as unknown as PlayerIntrusionCharacterLike
        ),
        tooltip: game.i18n.localize(coreSystem.xp >= 1
          ? "CYPHERV2.Intrusion.Player.Tooltip"
          : "CYPHERV2.Intrusion.Player.RequiresTooltip")
      },
      pools: POOL_KEYS.map((pool) => ({
        key: pool,
        isMight: pool === "might",
        canRally: pool === "might"
          && game.cypherv2.services.rally.canApply(this.actor as unknown as CharacterDocumentLike),
        label: game.i18n.localize(`CYPHERV2.Pools.${pool[0]!.toUpperCase()}${pool.slice(1)}`),
        value: coreSystem.stats[pool].value,
        max: coreSystem.derived.pools[pool].max,
        edge: coreSystem.derived.pools[pool].edge,
        gauge: headerPoolGauge(coreSystem.stats[pool].value, coreSystem.derived.pools[pool].max)
      })),
      wounds: {
        tracks: woundTracks,
        rows: woundRows,
        hindrance: coreSystem.derived.wounds.hindrance,
        hindranceModifier: formatStepModifier("hinder", coreSystem.derived.wounds.hindrance),
        dead: coreSystem.derived.wounds.dead
      },
      recoveries: headerRecoveries(coreSystem.recovery.used).map((recovery) => ({
        ...recovery,
        label: game.i18n.localize(`CYPHERV2.Recovery.${recovery.type}`)
      })),
      recoveryFormulaLabel: coreSystem.derived.recovery.formula,
      canResetRecoveries: game.user.isGM,
      shield: headerShield
    };
    const packageFamiliaritySources = (family: FamiliarityFamily, category: string): string[] => [
      ...this.actor.items
    ].filter((item) => {
      if (item.type !== "characterType" && item.type !== "species") return false;
      const system = item.system as unknown as Record<string, unknown>;
      const grants = system[family === "weapon" ? "weaponUse" : "armorUse"] as Record<string, unknown> | undefined;
      return grants?.[category] === true;
    }).map((item) => item.name);
    const familiarityOptions = (
      family: FamiliarityFamily,
      categories: readonly string[],
      manualCategories: readonly string[],
      effectiveCategories: readonly string[]
    ) => categories.map((category) => {
      const sources = packageFamiliaritySources(family, category);
      const manual = manualCategories.includes(category);
      const packageGranted = sources.length > 0;
      const effective = effectiveCategories.includes(category);
      const sourceHint = manual && packageGranted
        ? game.i18n.format("CYPHERV2.Settings.Character.FamiliarityManualAndGranted", {sources: sources.join(", ")})
        : manual
          ? game.i18n.localize("CYPHERV2.Settings.Character.FamiliarityManual")
          : packageGranted
            ? game.i18n.format("CYPHERV2.Settings.Character.FamiliarityGranted", {sources: sources.join(", ")})
            : game.i18n.localize("CYPHERV2.Settings.Character.FamiliarityAbsent");
      return {
        family,
        category,
        label: game.i18n.localize(`CYPHERV2.Combat.${family === "weapon" ? "Weapon" : "Armor"}.Category.${category}`),
        manual,
        packageGranted,
        effective,
        canToggle: this.isEditable && (manual || !packageGranted),
        sourceHint
      };
    });
    const familiarities = {
      weapons: familiarityOptions(
        "weapon",
        WEAPON_CATEGORIES,
        coreSystem.proficiencies.weaponCategories,
        coreSystem.derived.packages.weaponCategories
      ),
      armor: familiarityOptions(
        "armor",
        ARMOR_CATEGORIES,
        coreSystem.proficiencies.armorCategories,
        coreSystem.derived.packages.armorCategories
      )
    };
    const overrideLabelKeys: Record<CharacterOverrideKey, string> = {
      tier: "CYPHERV2.Character.Tier",
      effort: "CYPHERV2.Character.Effort",
      mightMax: "CYPHERV2.Overrides.MightMax",
      mightEdge: "CYPHERV2.Overrides.MightEdge",
      speedMax: "CYPHERV2.Overrides.SpeedMax",
      speedEdge: "CYPHERV2.Overrides.SpeedEdge",
      intellectMax: "CYPHERV2.Overrides.IntellectMax",
      intellectEdge: "CYPHERV2.Overrides.IntellectEdge"
    };
    const characterOverrides = CHARACTER_OVERRIDE_KEYS.map((key) => {
      const view = characterOverrideView(coreSystem, key);
      return {...view, label: game.i18n.localize(overrideLabelKeys[key]), hasOverride: view.override !== null};
    });
    const guidanceParts = [game.i18n.localize(guidance.focusAbilityCount === 2
      ? "CYPHERV2.Advancement.Guidance.TwoFocusAbilities"
      : "CYPHERV2.Advancement.Guidance.FocusAbility")];
    if (guidance.includesGenreAbility) {
      guidanceParts.push(game.i18n.localize("CYPHERV2.Advancement.Guidance.GenreAbility"));
    }
    const sourceNotes = typeof this.actor._source?.system?.notes === "string"
      ? this.actor._source.system.notes
      : "";
    const enrichedNotes = sourceNotes
      ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(sourceNotes, {
        async: true,
        relativeTo: this.actor
      })
      : "";
    return {
      ...context,
      actor: this.actor,
      system: this.actor.system,
      systemFields: documentSystemFields(this.actor),
      editable: this.isEditable,
      enriched: {notes: enrichedNotes},
      familiarities,
      characterOverrides,
      genre,
      woundHindranceModifier: formatStepModifier("hinder", coreSystem.derived.wounds.hindrance),
      header,
      skillItems,
      skillSort: {
        mode: this.#skillSortMode,
        nameActive: this.#skillSortMode === "name",
        rankActive: this.#skillSortMode === "rank"
      },
      abilityItems,
      inventory,
      weaponItems,
      armorItems,
      shieldItems,
      multipleShieldsEquipped,
      focusTrees,
      missingFoci,
      advancement: {
        ...advancement,
        options: advancement.options.map((option) => ({
          ...option,
          label: `CYPHERV2.Advancement.Option.${option.kind}`,
          shortLabel: `CYPHERV2.Advancement.Short.${option.kind}`,
          xpCost: advancement.policy.xpCost
        })),
        other: {
          ...advancement.other,
          label: "CYPHERV2.Advancement.OtherAdvancement",
          shortLabel: "CYPHERV2.Advancement.Short.other",
          xpCost: advancement.policy.xpCost
        },
        purchases: characterSystem.advancement.purchases.map((record) => ({
          ...record,
          label: record.kind === "other"
            ? `CYPHERV2.Advancement.Other.${record.otherKind}`
            : `CYPHERV2.Advancement.Option.${record.kind}`
        })),
        guidance: {
          ...guidance,
          title: game.i18n.format("CYPHERV2.Advancement.Guidance.Title", {tier: guidance.tier}),
          reminder: guidanceParts.join(" · ")
        }
      },
      isGM: game.user.isGM,
      gmProgressionEdit: game.user.isGM && this.#gmProgressionEdit,
      typeItems,
      speciesItems,
      descriptorItems,
      primaryDescriptorItems: descriptorItems.filter((item) => item.role === "primary"),
      additionalDescriptorItems: descriptorItems.filter((item) => item.role === "additional" || item.role === "custom"),
      speciesDescriptorItems: descriptorItems.filter((item) => item.role === "speciesGranted"),
      packageGrantedItems,
      coreCreation: (this.actor.system as unknown as {
        creation: {coreInitialized: boolean; mode: string}
      }).creation,
      activeArmorCategoryLabel: game.i18n.localize(
        `CYPHERV2.Combat.Armor.Category.${combatActor.system.derived.combat.armor.category}`
      ),
      recoveryAvailableLabels: (this.actor.system as unknown as CharacterDocumentLike["system"])
        .derived.recovery.availableTypes
        .map((type) => game.i18n.localize(`CYPHERV2.Recovery.${type}`))
        .join(", "),
      phase: "0.1.0"
    };
  }
}
