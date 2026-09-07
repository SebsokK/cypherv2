import {describe, expect, it} from "vitest";

import {characterHeaderIdentity, headerRecoveries} from "../../src/applications/sheets/character-header";
import {migrateCharacterSystemData} from "../../src/data/actors/character-migration";
import {deriveCharacterData} from "../../src/rules/core/derived-data";
import {
  defaultRecoverySlots,
  normalizeRecoverySlots,
  recoveryUsageFromSlots,
  resetRecoveryTrack,
  useRecoverySlot
} from "../../src/rules/core/recovery-track";
import {RecoveryService} from "../../src/services/recovery-service";
import {character, pools, wounds} from "../helpers/core-fixtures";
import {createRecoveryUsage} from "../../src/rules/core/core-types";
import {
  parseRecoveryOverrideDialogData,
  resetRecoveryOverride,
  resetWoundCapacityOverride,
  validateWoundCapacityModifiers
} from "../../src/applications/dialogs/character-override-dialogs";

describe("Character manual configuration", () => {
  it("omits the complete Focus clause while retaining the owned Focus reference", () => {
    const identity = characterHeaderIdentity({
      descriptors: [{id: "clever", name: "Clever", role: "primary"}],
      type: {id: "warrior", name: "Warrior"},
      focus: {uuid: "Item.focus", name: "Works Miracles"},
      hideFocus: true
    });
    expect(identity.sentence).toBe("I AM A CLEVER WARRIOR");
    expect(identity.sentence).not.toMatch(/WHO|\[FOCUS\]/);
    expect(identity.showFocus).toBe(false);
    expect(identity.focus).toMatchObject({uuid: "Item.focus", name: "Works Miracles", missing: false});
  });

  it("applies independent signed Wound modifiers without deleting over-capacity records", () => {
    const currentWounds = wounds({minor: 4, moderate: 2, major: 1});
    const derived = deriveCharacterData(
      pools(), currentWounds, createRecoveryUsage(), {}, [], undefined, 0, undefined, 2, 1,
      {tier: null, effort: null, stats: {
        might: {max: null, edge: null}, speed: {max: null, edge: null}, intellect: {max: null, edge: null}
      }, wounds: {minor: 1, moderate: 0, major: -1}}
    );
    expect(derived.wounds.calculatedCapacities).toEqual({minor: 3, moderate: 3, major: 3});
    expect(derived.wounds.capacities).toEqual({minor: 4, moderate: 3, major: 2});
    expect(currentWounds.minor).toHaveLength(4);
    expect(currentWounds.major).toHaveLength(1);
  });

  it("keeps zero Wound modifiers neutral and clamps invalid effective capacity to the invariant minimum", () => {
    const neutral = deriveCharacterData(pools(), wounds(), createRecoveryUsage());
    expect(neutral.wounds.capacities).toEqual({minor: 3, moderate: 3, major: 3});
    const low = deriveCharacterData(
      pools(), wounds(), createRecoveryUsage(), {}, [], undefined, 0, undefined, 2, 1,
      {tier: null, effort: null, stats: {
        might: {max: null, edge: null}, speed: {max: null, edge: null}, intellect: {max: null, edge: null}
      }, wounds: {minor: -20, moderate: -20, major: -20}}
    );
    expect(low.wounds.capacities).toEqual({minor: 1, moderate: 1, major: 1});
    expect(() => validateWoundCapacityModifiers(
      {minor: 3, moderate: 3, major: 3},
      {minor: -3, moderate: 0, major: 0}
    )).toThrow(/at least 1/i);
  });

  it("resets all Wound modifiers without touching recorded Wounds", async () => {
    const actor = character({wounds: wounds({minor: 2, major: 1})});
    actor.system.overrides.wounds = {minor: 2, moderate: -1, major: 1};
    await resetWoundCapacityOverride(actor);
    expect(actor.system.overrides.wounds).toEqual({minor: 0, moderate: 0, major: 0});
    expect(actor.system.wounds.minor).toHaveLength(2);
    expect(actor.system.wounds.major).toHaveLength(1);
  });

  it("migrates legacy Recovery usage into four stable default slots", () => {
    const migrated = migrateCharacterSystemData({recovery: {
      used: {oneAction: true, tenMinutes: false, oneHour: true, tenHours: false}, history: []
    }}) as {recovery: {slots: Array<{id: string; type: string; used: boolean}>}};
    expect(migrated.recovery.slots).toEqual([
      {id: "core-recovery-action", type: "one-action", used: true},
      {id: "core-recovery-ten-minutes", type: "10-minutes", used: false},
      {id: "core-recovery-one-hour", type: "1-hour", used: true},
      {id: "core-recovery-ten-hours", type: "10-hours", used: false}
    ]);
  });

  it("supports duplicate types, added slots, ordering, and independent stable usage", () => {
    const slots = [
      {id: "action-a", type: "one-action" as const, used: false},
      {id: "action-b", type: "one-action" as const, used: false},
      {id: "hour", type: "1-hour" as const, used: false},
      {id: "long", type: "10-hours" as const, used: false},
      {id: "extra", type: "10-minutes" as const, used: false}
    ];
    const used = useRecoverySlot(slots, "action-a", "one-action");
    expect(used).toHaveLength(5);
    expect(used.map((slot) => slot.id)).toEqual(["action-a", "action-b", "hour", "long", "extra"]);
    expect(used.find((slot) => slot.id === "action-a")?.used).toBe(true);
    expect(used.find((slot) => slot.id === "action-b")?.used).toBe(false);
    expect(headerRecoveries(used).map((slot) => slot.id)).toEqual(slots.map((slot) => slot.id));
  });

  it("resets to the Core track and conservatively preserves used state", () => {
    const custom = [
      {id: "action-a", type: "one-action" as const, used: true},
      {id: "action-b", type: "one-action" as const, used: false},
      {id: "hour", type: "1-hour" as const, used: true}
    ];
    const reset = resetRecoveryTrack(custom);
    expect(reset.map(({id, type}) => ({id, type}))).toEqual(defaultRecoverySlots().map(({id, type}) => ({id, type})));
    expect(reset.find((slot) => slot.type === "one-action")?.used).toBe(true);
    expect(reset.find((slot) => slot.type === "1-hour")?.used).toBe(true);
    expect(recoveryUsageFromSlots(reset)).toMatchObject({oneAction: true, oneHour: true});
  });

  it("resets Recovery customization and modifier while preserving usage safely", async () => {
    const actor = character();
    actor.system.recovery.slots = [
      {id: "action-a", type: "one-action", used: true},
      {id: "action-b", type: "one-action", used: false},
      {id: "hour", type: "1-hour", used: false}
    ];
    actor.system.recovery.customized = true;
    actor.system.recovery.rollModifier = 1;
    await resetRecoveryOverride(actor);
    expect(actor.system.recovery.customized).toBe(false);
    expect(actor.system.recovery.rollModifier).toBe(0);
    expect(actor.system.recovery.slots).toHaveLength(4);
    expect(actor.system.recovery.slots.find((slot) => slot.type === "one-action")?.used).toBe(true);
  });

  it("normalizes invalid Recovery entries without index-based identities", () => {
    expect(normalizeRecoverySlots([
      {id: "stable", type: "one-action", used: true},
      {id: "stable", type: "1-hour", used: false},
      {id: "bad", type: "tomorrow", used: false}
    ])).toEqual([{id: "stable", type: "one-action", used: true}]);
  });

  it("parses reordered duplicate-type slots while preserving usage by stable ID", () => {
    const current = [
      {id: "a", type: "one-action" as const, used: true},
      {id: "b", type: "10-minutes" as const, used: false}
    ];
    expect(parseRecoveryOverrideDialogData({
      slotOrder: "b,a,new",
      "slotType__b": "one-action",
      "slotType__a": "one-action",
      "slotType__new": "1-hour",
      rollModifier: "1"
    }, current)).toEqual({
      slots: [
        {id: "b", type: "one-action", used: false},
        {id: "a", type: "one-action", used: true},
        {id: "new", type: "1-hour", used: false}
      ],
      rollModifier: 1
    });
  });

  it("adds signed Recovery roll modifiers through the authoritative derived bonus", async () => {
    const actor = character({tier: 2});
    const service = new RecoveryService(async () => 4);
    actor.system.recovery.rollModifier = 1;
    actor.system.derived.recovery.bonus = 1;
    await expect(service.roll(actor, "one-action")).resolves.toMatchObject({total: 7, bonus: 1});
    actor.system.recovery.rollModifier = -1;
    actor.system.derived.recovery.bonus = -1;
    await expect(service.roll(actor, "10-minutes")).resolves.toMatchObject({total: 5, bonus: -1});
  });
});
