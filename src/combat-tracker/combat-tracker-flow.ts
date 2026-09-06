import {SYSTEM_ID} from "../constants/system";

export const COMBATANT_DONE_THIS_ROUND_FLAG = "doneThisRound";

export interface CombatTrackerUserLike {
  readonly id: string;
  readonly isGM: boolean;
}

export interface CombatTrackerCombatantLike {
  readonly id: string;
  testUserPermission(user: CombatTrackerUserLike, permission: "OWNER"): boolean;
  getFlag(scope: string, key: string): unknown;
  setFlag(scope: string, key: string, value: unknown): Promise<unknown>;
}

export interface CombatTrackerCombatLike {
  readonly started: boolean;
  readonly round: number;
  readonly turn: number | null;
  readonly turns: readonly CombatTrackerCombatantLike[];
  readonly combatant: CombatTrackerCombatantLike | null;
  nextTurn(): Promise<unknown>;
}

export type EndTurnResult =
  | {readonly ok: true}
  | {readonly ok: false; readonly reason: "not-started" | "empty" | "no-current" | "stale" | "not-authorized"};

export function canEndCombatantTurn(
  user: CombatTrackerUserLike,
  combatant: CombatTrackerCombatantLike | null | undefined
): boolean {
  return Boolean(combatant && (user.isGM || combatant.testUserPermission(user, "OWNER")));
}

export function isCombatantDoneThisRound(
  combatant: Pick<CombatTrackerCombatantLike, "getFlag"> | null | undefined,
  round: number
): boolean {
  return Boolean(round > 0 && combatant?.getFlag(SYSTEM_ID, COMBATANT_DONE_THIS_ROUND_FLAG) === round);
}

/**
 * Advance only the current Combatant through Foundry's canonical turn API.
 * The combatant id is checked again at click time so a stale rendered row cannot advance the encounter.
 */
export async function endCurrentCombatantTurn(
  combat: CombatTrackerCombatLike,
  user: CombatTrackerUserLike,
  requestedCombatantId: string
): Promise<EndTurnResult> {
  if (!combat.started) return {ok: false, reason: "not-started"};
  if (!combat.turns.length) return {ok: false, reason: "empty"};
  const current = combat.combatant;
  if (combat.turn === null || !current) return {ok: false, reason: "no-current"};
  if (current.id !== requestedCombatantId) return {ok: false, reason: "stale"};
  if (!canEndCombatantTurn(user, current)) return {ok: false, reason: "not-authorized"};
  await current.setFlag(SYSTEM_ID, COMBATANT_DONE_THIS_ROUND_FLAG, combat.round);
  await combat.nextTurn();
  return {ok: true};
}

export interface DoneStateResetCombatLike {
  readonly combatants: Iterable<Pick<CombatTrackerCombatantLike, "id" | "getFlag">>;
  updateEmbeddedDocuments(
    type: "Combatant",
    updates: Record<string, unknown>[],
    operation?: Record<string, unknown>
  ): Promise<unknown>;
}

/** Physically remove prior-round markers after the round has already changed. */
export async function clearCombatantDoneStates(combat: DoneStateResetCombatLike): Promise<void> {
  const updates = Array.from(combat.combatants)
    .filter((combatant) => combatant.getFlag(SYSTEM_ID, COMBATANT_DONE_THIS_ROUND_FLAG) !== undefined)
    .map((combatant) => ({
      _id: combatant.id,
      [`flags.${SYSTEM_ID}.-=${COMBATANT_DONE_THIS_ROUND_FLAG}`]: null
    }));
  if (!updates.length) return;
  await combat.updateEmbeddedDocuments("Combatant", updates, {turnEvents: false});
}

export function reorderCombatantIds(
  currentOrder: readonly string[],
  draggedId: string,
  targetId: string | null,
  placeAfterTarget: boolean
): string[] {
  if (!currentOrder.includes(draggedId)) return [...currentOrder];
  const reordered = currentOrder.filter((id) => id !== draggedId);
  if (!targetId) return [...reordered, draggedId];
  const targetIndex = reordered.indexOf(targetId);
  if (targetIndex < 0) return [...currentOrder];
  reordered.splice(targetIndex + (placeAfterTarget ? 1 : 0), 0, draggedId);
  return reordered;
}

/**
 * Foundry v14 has no independent Combatant sort field. Descending hidden initiative ranks
 * are therefore used strictly as persisted manual-order storage.
 */
export function manualOrderInitiativeUpdates(order: readonly string[]): Array<{_id: string; initiative: number}> {
  return order.map((id, index) => ({
    _id: id,
    initiative: (order.length - index) * 10
  }));
}
