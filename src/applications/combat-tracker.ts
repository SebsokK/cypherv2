import {
  canEndCombatantTurn,
  clearCombatantDoneStates,
  endCurrentCombatantTurn,
  isCombatantDoneThisRound,
  manualOrderInitiativeUpdates,
  reorderCombatantIds
} from "../combat-tracker/combat-tracker-flow";

const BaseCombatTracker = foundry.applications.sidebar.tabs.CombatTracker;
const DRAG_TYPE = "application/x-cypherv2-combatant";

interface TrackerTurnContext {
  id: string;
  active: boolean;
  canEndTurn?: boolean;
  doneThisRound?: boolean;
}

interface TrackerContext extends Record<string, unknown> {
  turns?: TrackerTurnContext[];
  manualOrderEditable?: boolean;
}

interface ContextOption {
  label?: string;
}

function combatantIdFrom(element: Element | null): string | null {
  return (element as HTMLElement | null)?.dataset.combatantId ?? null;
}

export class CypherV2CombatTracker extends BaseCombatTracker {
  static override DEFAULT_OPTIONS = {
    classes: ["cypherv2-combat-tracker"],
    actions: {
      endCypherTurn: CypherV2CombatTracker.#onEndTurn
    }
  };

  static override PARTS = {
    header: {
      template: "systems/cypherv2/templates/sidebar/combat-tracker-header.hbs"
    },
    tracker: {
      template: "systems/cypherv2/templates/sidebar/combat-tracker.hbs",
      scrollable: [""]
    },
    footer: {
      template: "templates/sidebar/tabs/combat/footer.hbs"
    }
  };

  static async #onEndTurn(this: CypherV2CombatTracker, _event: PointerEvent, target: HTMLElement): Promise<void> {
    const combat = this.viewed;
    const requestedId = combatantIdFrom(target.closest("[data-combatant-id]"));
    if (!combat || !requestedId) {
      ui.notifications.warn(game.i18n.localize("CYPHERV2.CombatTracker.Errors.NoCombat"));
      return;
    }

    target.setAttribute("disabled", "");
    try {
      const result = await endCurrentCombatantTurn(combat, game.user, requestedId);
      if (!result.ok) {
        ui.notifications.warn(game.i18n.localize(`CYPHERV2.CombatTracker.Errors.${result.reason}`));
      }
    } finally {
      target.removeAttribute("disabled");
    }
  }

  override async _prepareTrackerContext(
    context: TrackerContext,
    options: Record<string, unknown>
  ): Promise<void> {
    await super._prepareTrackerContext(context, options);
    context.manualOrderEditable = game.user.isGM;
    const combat = this.viewed;
    for (const turn of context.turns ?? []) {
      const combatant = combat?.combatants.get(turn.id);
      turn.doneThisRound = isCombatantDoneThisRound(combatant, combat?.round ?? 0);
      turn.canEndTurn = Boolean(
        combat?.started
        && turn.active
        && !turn.doneThisRound
        && canEndCombatantTurn(game.user, combatant)
      );
    }
  }

  override async _onRender(context: Record<string, unknown>, options: Record<string, unknown>): Promise<void> {
    await super._onRender(context, options);
    if (!game.user.isGM) return;
    const tracker = this.element.querySelector<HTMLElement>(".combat-tracker");
    if (!tracker || tracker.dataset.cypherv2OrderBound === "true") return;
    tracker.dataset.cypherv2OrderBound = "true";
    tracker.addEventListener("dragover", this.#onDragOver);
    tracker.addEventListener("drop", this.#onDrop.bind(this));
    tracker.addEventListener("dragend", this.#clearDragState.bind(this));
    for (const row of tracker.querySelectorAll<HTMLElement>(".combatant[data-combatant-id]")) {
      row.addEventListener("dragstart", this.#onDragStart.bind(this));
    }
  }

  override _getEntryContextOptions(): ContextOption[] {
    return super._getEntryContextOptions().filter((entry: ContextOption) => (
      entry.label !== "COMBATANT.ACTIONS.Clear"
      && entry.label !== "COMBATANT.ACTIONS.Reroll"
    ));
  }

  override _getCombatContextOptions(): ContextOption[] {
    return super._getCombatContextOptions().filter((entry: ContextOption) => (
      entry.label !== "COMBAT.InitiativeReset"
    ));
  }

  #onDragStart(event: DragEvent): void {
    if (!game.user.isGM || !event.dataTransfer) return;
    const row = (event.currentTarget as HTMLElement | null)?.closest("[data-combatant-id]") ?? null;
    const combatantId = combatantIdFrom(row);
    if (!combatantId) return;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(DRAG_TYPE, combatantId);
    event.dataTransfer.setData("text/plain", combatantId);
    row?.classList.add("cypherv2-combatant-dragging");
  }

  #onDragOver(event: DragEvent): void {
    if (!game.user.isGM || !event.dataTransfer) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  async #onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    if (!game.user.isGM || !event.dataTransfer) return;
    const combat = this.viewed;
    const draggedId = event.dataTransfer.getData(DRAG_TYPE) || event.dataTransfer.getData("text/plain");
    if (!combat || !draggedId || !combat.combatants.get(draggedId)) return;

    const targetRow = (event.target as Element | null)?.closest(".combatant[data-combatant-id]") ?? null;
    const targetId = combatantIdFrom(targetRow);
    const targetRect = targetRow?.getBoundingClientRect();
    const placeAfter = Boolean(targetRect && event.clientY > targetRect.top + (targetRect.height / 2));
    const currentOrder = combat.turns.map((combatant) => combatant.id);
    const reordered = reorderCombatantIds(currentOrder, draggedId, targetId, placeAfter);
    if (reordered.every((id, index) => id === currentOrder[index])) {
      this.#clearDragState();
      return;
    }

    const currentId = combat.combatant?.id;
    const combatTurn = currentId ? reordered.indexOf(currentId) : undefined;
    await combat.updateEmbeddedDocuments(
      "Combatant",
      manualOrderInitiativeUpdates(reordered),
      {
        ...(combatTurn === undefined || combatTurn < 0 ? {} : {combatTurn}),
        turnEvents: false
      }
    );
    this.#clearDragState();
  }

  #clearDragState(): void {
    this.element.querySelectorAll(".cypherv2-combatant-dragging").forEach((row) => {
      row.classList.remove("cypherv2-combatant-dragging");
    });
  }
}

export function registerCombatTracker(): void {
  CONFIG.ui.combat = CypherV2CombatTracker;
}

export function initializeCombatTrackerDoneReset(): void {
  Hooks.on("updateCombat", (combat: Combat, changes: Record<string, unknown>) => {
    if (!("round" in changes) || !game.user.isActiveGM) return;
    void clearCombatantDoneStates(combat).catch((error: unknown) => {
      console.error("cypherv2 | Failed to reset Combat Tracker DONE states", error);
    });
  });
}
