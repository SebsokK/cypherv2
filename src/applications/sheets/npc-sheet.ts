import {DOCUMENT_SHEET_FORM_OPTIONS, documentSystemFields} from "./document-sheet-options";
import {requestNpcAttack} from "../dialogs/combat-dialogs";
import {
  createNpcModification,
  deleteNpcModification,
  editNpcModification
} from "../dialogs/npc-modification-dialogs";
import type {NpcTargetLike} from "../../combat/combat-types";
import {enforceReadOnlySheetPresentation, guardEditableActions} from "./sheet-permissions";
import {npcHealthGauge, npcTargetNumber} from "./npc-sheet-presentation";

const ActorSheetV2 = foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.sheets.ActorSheetV2
);

const NPC_MUTATING_ACTIONS = new Set([
  "requestDefense",
  "createModification",
  "editModification",
  "deleteModification"
]);

export class NpcSheet extends ActorSheetV2 {
  static DEFAULT_OPTIONS = {
    ...DOCUMENT_SHEET_FORM_OPTIONS,
    classes: ["cypherv2", "sheet", "actor", "npc-sheet"],
    actions: guardEditableActions({
      requestDefense: NpcSheet.#onRequestDefense,
      createModification: NpcSheet.#onCreateModification,
      editModification: NpcSheet.#onEditModification,
      deleteModification: NpcSheet.#onDeleteModification
    }, NPC_MUTATING_ACTIONS),
    position: {width: 680, height: 700},
    window: {resizable: true}
  };

  static PARTS = {
    main: {template: "systems/cypherv2/templates/actor/npc-sheet.hbs"}
  };

  static async #onRequestDefense(this: NpcSheet): Promise<void> {
    await requestNpcAttack(this.actor as unknown as NpcTargetLike);
  }

  static async #onCreateModification(this: NpcSheet): Promise<void> {
    await createNpcModification(this.actor as unknown as NpcTargetLike);
  }

  static async #onEditModification(
    this: NpcSheet,
    _event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    const id = target.dataset.modificationId;
    if (!id) throw new Error("Missing NPC modification ID.");
    await editNpcModification(this.actor as unknown as NpcTargetLike, id);
  }

  static async #onDeleteModification(
    this: NpcSheet,
    _event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    const id = target.dataset.modificationId;
    if (!id) throw new Error("Missing NPC modification ID.");
    await deleteNpcModification(this.actor as unknown as NpcTargetLike, id);
  }

  override async _onRender(
    context: Record<string, unknown>,
    options: Record<string, unknown>
  ): Promise<void> {
    await super._onRender(context, options);
    enforceReadOnlySheetPresentation(this.element, this.isEditable, NPC_MUTATING_ACTIONS);
  }

  override _onClose(options: Record<string, unknown>): void {
    super._onClose(options);
  }

  override async _prepareContext(options: Record<string, unknown>): Promise<Record<string, unknown>> {
    const context = await super._prepareContext(options);
    const npcSystem = this.actor.system as unknown as NpcTargetLike["system"];
    const sourceSystem = this.actor._source?.system as Record<string, unknown> | undefined;
    const sourceNotes = typeof sourceSystem?.notes === "string" ? sourceSystem.notes : "";
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
      isGM: game.user.isGM,
      enriched: {notes: enrichedNotes},
      targetNumber: npcTargetNumber(npcSystem.level) ?? "—",
      healthGauge: npcHealthGauge(
        npcSystem.health.value,
        npcSystem.health.max ?? npcSystem.health.baseMax
      ),
      woundSeverityOptions: (["minor", "moderate", "major"] as const).map((value) => ({
        value,
        label: game.i18n.localize(`CYPHERV2.Wounds.Severity.${value}`),
        selected: npcSystem.damage.woundSeverity === value
      })),
      modifications: npcSystem.modifications.map((entry) => ({
        ...entry,
        contextsLabel: entry.contexts.join(", "),
        modeLabel: game.i18n.localize(`CYPHERV2.Combat.Modification.Mode.${entry.mode}`)
      }))
    };
  }
}
