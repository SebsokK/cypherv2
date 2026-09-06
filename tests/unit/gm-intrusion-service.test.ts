import {describe, expect, it} from "vitest";

import {prepareRoll, resolveRoll} from "../../src/rolls/roll-engine";
import {registerCoreRuleModule} from "../../src/rules/core-rule-module";
import {CORE_TOTAL_EFFORT_CAP} from "../../src/rules/core/effort-rules";
import {RuleRegistry} from "../../src/rules/rule-registry";
import type {RollContext} from "../../src/rolls/roll-types";
import {GMIntrusionService} from "../../src/services/gm-intrusion-service";
import {character} from "../helpers/core-fixtures";

function setup(): {rules: RuleRegistry; service: GMIntrusionService} {
  const rules = new RuleRegistry();
  registerCoreRuleModule(rules);
  return {rules, service: new GMIntrusionService(rules, () => "intrusion-1")};
}

function naturalResult(rules: RuleRegistry, naturalRoll = 1, horrorIntrusionRange = 1) {
  const context: RollContext = {
    actor: {id: "character-1", name: "Test Character"},
    label: "Task",
    pool: "might",
    difficulty: {mode: "known", value: 4},
    assets: 0,
    paidEffort: 0,
    freeEffort: 0,
    edge: 0,
    poolValue: 10,
    limits: {difficultyCeiling: 10, assetLimit: 2, paidEffortMaximum: 1, totalEffortMaximum: CORE_TOTAL_EFFORT_CAP},
    contributions: []
  };
  const prepared = prepareRoll({...context, horrorIntrusionRange});
  const resolved = resolveRoll(prepared, naturalRoll);
  return {...resolved, naturalEffects: rules.resolveNaturalEffects(resolved)};
}

describe("GMIntrusionService", () => {
  it("creates only ephemeral Targeted gameplay data and awards the first XP", async () => {
    const actor = character({xp: 3});
    const {service} = setup();
    const record = await service.createTargeted(actor);

    expect(actor.system.xp).toBe(4);
    expect(record).toEqual({
      id: "intrusion-1",
      mode: "targeted",
      targets: [{actorId: actor.id, actorName: actor.name}],
      targetXp: 1,
      sharedXp: 1,
      naturalRoll: 0
    });
    expect(record).not.toHaveProperty("title");
    expect(record).not.toHaveProperty("description");
    expect(record).not.toHaveProperty("gmNotes");
    expect(record).not.toHaveProperty("timestamp");
  });

  it("distributes shared XP without retaining an XP history", async () => {
    const source = character();
    const recipient = character({xp: 7});
    recipient.id = "character-2";
    recipient.name = "Second Character";
    const {service} = setup();

    await service.distributeSecondXp(source, recipient, 1);
    expect(recipient.system.xp).toBe(8);
    await expect(service.distributeSecondXp(source, source, 1)).rejects.toThrow("cannot receive");
  });

  it("creates a Group Intrusion for any number of Characters with one XP each", async () => {
    const actors = [character(), character(), character()];
    actors.forEach((actor, index) => {
      actor.id = "character-" + (index + 1);
      actor.name = "Character " + (index + 1);
      Object.assign(actor, {img: "character-" + (index + 1) + ".webp"});
    });
    const {service} = setup();
    const record = await service.createGroup(actors);

    expect(record.mode).toBe("group");
    expect(record.targets).toHaveLength(3);
    expect(record.targets.map((target) => target.actorImage)).toEqual([
      "character-1.webp",
      "character-2.webp",
      "character-3.webp"
    ]);
    expect(record.sharedXp).toBe(0);
    expect(actors.map((actor) => actor.system.xp)).toEqual([1, 1, 1]);
  });

  it("creates a Free GM Intrusion from a triggering natural result without awarding XP", async () => {
    const actor = character({xp: 2});
    const {rules, service} = setup();
    const record = await service.createFreeFromNaturalResult(actor, naturalResult(rules));

    expect(record).toMatchObject({mode: "free", naturalRoll: 1, targetXp: 0, sharedXp: 0});
    expect(actor.system.xp).toBe(2);
  });

  it("reuses the same no-XP Free Intrusion transaction for a Horror trigger", async () => {
    const actor = character({xp: 2});
    const {rules, service} = setup();
    const record = await service.createFreeFromNaturalResult(actor, naturalResult(rules, 3, 4));

    expect(record).toMatchObject({mode: "free", naturalRoll: 3, targetXp: 0, sharedXp: 0});
    expect(actor.system.xp).toBe(2);
  });

});
