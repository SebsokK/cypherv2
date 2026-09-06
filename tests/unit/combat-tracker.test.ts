import {readFileSync} from "node:fs";

import {describe, expect, it, vi} from "vitest";

import {
  canEndCombatantTurn,
  clearCombatantDoneStates,
  endCurrentCombatantTurn,
  isCombatantDoneThisRound,
  manualOrderInitiativeUpdates,
  reorderCombatantIds,
  type CombatTrackerCombatantLike,
  type CombatTrackerUserLike
} from "../../src/combat-tracker/combat-tracker-flow";

const trackerTemplate = readFileSync("templates/sidebar/combat-tracker.hbs", "utf8");
const headerTemplate = readFileSync("templates/sidebar/combat-tracker-header.hbs", "utf8");
const trackerSource = readFileSync("src/applications/combat-tracker.ts", "utf8");
const trackerStyles = readFileSync("styles/components/_combat-tracker.scss", "utf8");
const mainSource = readFileSync("src/main.ts", "utf8");
const localization = JSON.parse(readFileSync("lang/en.json", "utf8")) as Record<string, string>;

function user(id: string, isGM = false): CombatTrackerUserLike {
  return {id, isGM};
}

function combatant(
  id: string,
  ownerIds: string[] = []
): CombatTrackerCombatantLike & {readonly flags: Map<string, unknown>} {
  const flags = new Map<string, unknown>();
  return {
    id,
    flags,
    testUserPermission: (candidate) => ownerIds.includes(candidate.id),
    getFlag: (scope, key) => flags.get(`${scope}.${key}`),
    setFlag: vi.fn(async (scope: string, key: string, value: unknown) => {
      flags.set(`${scope}.${key}`, value);
      return value;
    })
  };
}

function combat(
  turns: CombatTrackerCombatantLike[],
  turn: number | null,
  round = 1,
  started = true
) {
  const state = {
    started,
    turn,
    round,
    turns,
    get combatant() {
      return this.turn === null ? null : this.turns[this.turn] ?? null;
    },
    nextTurn: vi.fn(async () => {
      if (state.turn === null || state.turn >= state.turns.length - 1) {
        state.round += 1;
        state.turn = state.turns.length ? 0 : null;
      } else {
        state.turn += 1;
      }
      return state;
    })
  };
  return state;
}

describe("Cypher V2 Combat Tracker", () => {
  it("replaces every visible initiative roll surface with the current-row DONE action", () => {
    expect(trackerTemplate).toContain('data-action="endCypherTurn"');
    expect(trackerTemplate).toContain("CYPHERV2.CombatTracker.Done");
    expect(trackerTemplate).toContain("{{#if canEndTurn}}");
    expect(trackerTemplate).not.toContain("rollInitiative");
    expect(trackerTemplate).not.toContain("initiative-input");
    expect(trackerTemplate).not.toContain("fa-dice-d20");
    expect(headerTemplate).not.toContain("rollAll");
    expect(headerTemplate).not.toContain("rollNPC");
    expect(trackerSource).toContain('entry.label !== "COMBATANT.ACTIONS.Reroll"');
    expect(trackerSource).toContain('entry.label !== "COMBAT.InitiativeReset"');
  });

  it("keeps standard visibility, defeated, ping, and pan controls", () => {
    expect(trackerTemplate).toContain('data-action="toggleHidden"');
    expect(trackerTemplate).toContain('data-action="toggleDefeated"');
    expect(trackerTemplate).toContain('data-action="pingCombatant"');
    expect(trackerTemplate).toContain('data-action="panToCombatant"');
  });

  it("allows the GM and current owner, but not observers or unrelated players", () => {
    const current = combatant("current", ["owner"]);
    expect(canEndCombatantTurn(user("gm", true), current)).toBe(true);
    expect(canEndCombatantTurn(user("owner"), current)).toBe(true);
    expect(canEndCombatantTurn(user("observer"), current)).toBe(false);
    expect(canEndCombatantTurn(user("unrelated"), current)).toBe(false);
  });

  it("advances exactly one turn through the canonical nextTurn API", async () => {
    const first = combatant("first", ["player"]);
    const second = combatant("second");
    const encounter = combat([first, second], 0);

    await expect(endCurrentCombatantTurn(encounter, user("player"), "first")).resolves.toEqual({ok: true});
    expect(encounter.nextTurn).toHaveBeenCalledOnce();
    expect(first.getFlag("cypherv2", "doneThisRound")).toBe(1);
    expect(encounter.turn).toBe(1);
    expect(encounter.round).toBe(1);
    expect(isCombatantDoneThisRound(first, encounter.round)).toBe(true);
    expect(isCombatantDoneThisRound(second, encounter.round)).toBe(false);
    expect(canEndCombatantTurn(user("player"), second)).toBe(false);
  });

  it("uses Foundry nextTurn rollover for the final and sole participant", async () => {
    const final = combatant("final", ["player"]);
    const encounter = combat([combatant("first"), final], 1, 4);
    await endCurrentCombatantTurn(encounter, user("player"), "final");
    expect(encounter.round).toBe(5);
    expect(encounter.turn).toBe(0);

    const solo = combat([combatant("solo", ["player"])], 0, 2);
    await endCurrentCombatantTurn(solo, user("player"), "solo");
    expect(solo.round).toBe(3);
    expect(solo.turn).toBe(0);
  });

  it("rejects stale, unauthorized, unstarted, empty, and missing-current mutations", async () => {
    const current = combatant("current", ["owner"]);
    const encounter = combat([current, combatant("other")], 0);
    await expect(endCurrentCombatantTurn(encounter, user("owner"), "other"))
      .resolves.toEqual({ok: false, reason: "stale"});
    await expect(endCurrentCombatantTurn(encounter, user("stranger"), "current"))
      .resolves.toEqual({ok: false, reason: "not-authorized"});
    await expect(endCurrentCombatantTurn(combat([current], 0, 0, false), user("owner"), "current"))
      .resolves.toEqual({ok: false, reason: "not-started"});
    await expect(endCurrentCombatantTurn(combat([], null), user("gm", true), "missing"))
      .resolves.toEqual({ok: false, reason: "empty"});
    await expect(endCurrentCombatantTurn(combat([current], null), user("owner"), "current"))
      .resolves.toEqual({ok: false, reason: "no-current"});
    expect(encounter.nextTurn).not.toHaveBeenCalled();
  });

  it("preserves explicit GM drag order as hidden descending Foundry initiative ranks", () => {
    const completed = combatant("d");
    void completed.setFlag("cypherv2", "doneThisRound", 2);
    const reordered = reorderCombatantIds(["a", "b", "c", completed.id], "d", "a", true);
    expect(reordered).toEqual(["a", "d", "b", "c"]);
    expect(manualOrderInitiativeUpdates(reordered)).toEqual([
      {_id: "a", initiative: 40},
      {_id: "d", initiative: 30},
      {_id: "b", initiative: 20},
      {_id: "c", initiative: 10}
    ]);
    expect(trackerSource).toContain('turnEvents: false');
    expect(trackerSource).toContain('{combatTurn}');
    expect(trackerTemplate).toContain('draggable="true"');
    expect(isCombatantDoneThisRound(completed, 2)).toBe(true);
  });

  it("renders a persistent non-actionable DONE status and the next current action", () => {
    const previous = combatant("previous", ["player"]);
    const next = combatant("next", ["player"]);
    void previous.setFlag("cypherv2", "doneThisRound", 3);

    expect(isCombatantDoneThisRound(previous, 3)).toBe(true);
    expect(isCombatantDoneThisRound(next, 3)).toBe(false);
    expect(canEndCombatantTurn(user("player"), next)).toBe(true);
    expect(trackerTemplate).toContain("{{else if doneThisRound}}");
    expect(trackerTemplate).toContain('class="cypherv2-done-status"');
    expect(trackerTemplate).not.toContain('class="cypherv2-done-status" data-action');
    expect(trackerStyles).toContain("pointer-events: none");
  });

  it("clears every persisted DONE flag after a native round change", async () => {
    const first = combatant("first");
    const second = combatant("second");
    await first.setFlag("cypherv2", "doneThisRound", 1);
    await second.setFlag("cypherv2", "doneThisRound", 1);
    const updateEmbeddedDocuments = vi.fn(async (
      _type: string,
      updates: Record<string, unknown>[]
    ) => {
      for (const update of updates) {
        const target = [first, second].find((entry) => entry.id === update._id);
        target?.flags.delete("cypherv2.doneThisRound");
      }
    });

    expect(isCombatantDoneThisRound(first, 2)).toBe(false);
    await clearCombatantDoneStates({combatants: [first, second], updateEmbeddedDocuments});
    expect(updateEmbeddedDocuments).toHaveBeenCalledWith("Combatant", [
      {_id: "first", "flags.cypherv2.-=doneThisRound": null},
      {_id: "second", "flags.cypherv2.-=doneThisRound": null}
    ], {turnEvents: false});
    expect(first.getFlag("cypherv2", "doneThisRound")).toBeUndefined();
    expect(second.getFlag("cypherv2", "doneThisRound")).toBeUndefined();
    expect(trackerSource).toContain('Hooks.on("updateCombat"');
    expect(trackerSource).toContain('"round" in changes');
  });

  it("does not mark native Next Turn skips or new mid-round Combatants as DONE", async () => {
    const skipped = combatant("skipped");
    const next = combatant("next");
    const encounter = combat([skipped, next], 0, 2);
    await encounter.nextTurn();
    expect(skipped.getFlag("cypherv2", "doneThisRound")).toBeUndefined();
    expect(next.getFlag("cypherv2", "doneThisRound")).toBeUndefined();

    const added = combatant("added-mid-round");
    expect(isCombatantDoneThisRound(added, 2)).toBe(false);
  });

  it("registers a v14 CombatTracker subclass instead of patching Foundry core DOM", () => {
    expect(trackerSource).toContain("extends BaseCombatTracker");
    expect(trackerSource).toContain("CONFIG.ui.combat = CypherV2CombatTracker");
    expect(mainSource).toContain("registerCombatTracker();");
    expect(trackerSource).not.toContain('Hooks.on("renderCombatTracker"');
  });

  it("uses localized accessible Soft Red presentation without Cypher initiative math", () => {
    expect(localization["CYPHERV2.CombatTracker.Done"]).toBe("Done");
    expect(localization["CYPHERV2.CombatTracker.EndTurn"]).toBe("End Turn");
    expect(trackerTemplate).toContain("CYPHERV2.CombatTracker.DoneAria");
    expect(trackerStyles).toContain("var(--cypherv2-danger)");
    expect(trackerStyles).toContain(":focus-visible");
    expect(`${trackerSource}\n${trackerTemplate}`).not.toMatch(/NPC Level|system\.level|system\.stats\.speed/);
  });
});
