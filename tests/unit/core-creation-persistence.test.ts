import {describe, expect, it} from "vitest";

import {migrateCharacterSystemData} from "../../src/data/actors/character-migration";
import {CharacterInitializationService} from "../../src/services/character-initialization-service";
import {AdvancementService} from "../../src/services/advancement-service";
import {FocusAssociationService} from "../../src/services/focus-association-service";
import {FocusAcquisitionService} from "../../src/services/focus-acquisition-service";
import {WoundService} from "../../src/services/wound-service";
import {RecoveryService} from "../../src/services/recovery-service";
import {RestService} from "../../src/services/rest-service";
import {RecoveryWorkflowService} from "../../src/services/recovery-workflow-service";
import {RuleRegistry} from "../../src/rules/rule-registry";
import {registerCoreRuleModule} from "../../src/rules/core-rule-module";
import {character} from "../helpers/core-fixtures";
import type {FocusDocumentLike} from "../../src/focus/focus-types";

function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  let cursor = target;
  for (const part of parts.slice(0, -1)) {
    cursor[part] ??= {};
    cursor = cursor[part] as Record<string, unknown>;
  }
  cursor[parts.at(-1)!] = value;
}

function merge(target: Record<string, unknown>, changes: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(changes)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const current = target[key];
      if (!current || typeof current !== "object" || Array.isArray(current)) target[key] = {};
      merge(target[key] as Record<string, unknown>, value as Record<string, unknown>);
    } else target[key] = structuredClone(value);
  }
}

class EmbeddedItem {
  readonly id: string;
  readonly type: string;
  readonly name: string;
  system: Record<string, unknown>;

  constructor(readonly owner: PersistentCharacter, data: Record<string, unknown>) {
    this.id = String(data._id ?? `item-${owner.items.length + 1}`);
    this.type = String(data.type);
    this.name = String(data.name);
    this.system = structuredClone(data.system as Record<string, unknown> ?? {});
  }

  async update(changes: Record<string, unknown>): Promise<unknown> {
    for (const [path, value] of Object.entries(changes)) {
      setPath(this as unknown as Record<string, unknown>, path, value);
    }
    return this;
  }

  async delete(): Promise<void> {
    this.owner.items.splice(this.owner.items.indexOf(this), 1);
  }
}

class PersistentCharacter {
  readonly id = "persistent-character";
  readonly uuid = "Actor.persistent-character";
  readonly type = "character";
  readonly items: EmbeddedItem[] = [];
  system = structuredClone(character({xp: 40}).system);

  constructor() {
    this.system.creation = {coreInitialized: false, mode: "uninitialized", initializedAt: 0};
    this.system.proficiencies = {weaponCategories: ["light"], armorCategories: [], freelyUse: []};
    (this.system.advancement as unknown as {guidanceCompletedTiers: number[]})
      .guidanceCompletedTiers = [];
  }

  async update(changes: Record<string, unknown>): Promise<unknown> {
    const partialSystem: Record<string, unknown> = {};
    for (const [path, value] of Object.entries(changes)) {
      if (path === "system" && value && typeof value === "object") {
        merge(partialSystem, value as Record<string, unknown>);
      } else if (path.startsWith("system.")) {
        setPath(partialSystem, path.slice(7), value);
      }
    }
    migrateCharacterSystemData(partialSystem, {partial: true});
    merge(this.system as unknown as Record<string, unknown>, partialSystem);
    return this;
  }

  async createEmbeddedDocuments(
    _type: string,
    data: Record<string, unknown>[]
  ): Promise<unknown[]> {
    return data.map((entry) => {
      const item = new EmbeddedItem(this, entry);
      this.items.push(item);
      return item;
    });
  }
}

function expectCreation(actor: PersistentCharacter, mode: "completed" | "skipped"): void {
  expect(actor.system.creation).toMatchObject({coreInitialized: true, mode});
}

function focus(): FocusDocumentLike {
  return {
    id: "focus",
    uuid: "Item.focus",
    name: "Focus",
    type: "focus",
    system: {graph: {
      version: 1,
      nodes: [{
        id: "tier-one",
        abilityUuid: "",
        abilitySnapshot: {name: "Tier One"},
        tier: 1,
        position: {x: null, y: null}
      }],
      connections: []
    }}
  };
}

function advancement(): AdvancementService {
  const rules = new RuleRegistry();
  registerCoreRuleModule(rules);
  return new AdvancementService(rules, () => "advancement", () => 1000);
}

const noRecoveryHooks = {
  async beforeComplete(): Promise<void> {},
  async processDurations(): Promise<void> {},
  async afterComplete(): Promise<void> {},
  async refresh(): Promise<void> {}
};

describe("Core Creation persistence across partial Actor updates", () => {
  it("does not inject creation defaults while migrating unrelated partial system data", () => {
    expect(migrateCharacterSystemData({xp: 7}, {partial: true})).toEqual({xp: 7});
    expect(migrateCharacterSystemData({advancement: {purchases: []}}, {partial: true}))
      .toEqual({advancement: {purchases: []}});
    expect(migrateCharacterSystemData({advancement: {guidanceCompletedTiers: [3, 1, 3]}}, {partial: true}))
      .toEqual({advancement: {guidanceCompletedTiers: [1, 3]}});
    expect(migrateCharacterSystemData({recovery: {used: {oneAction: true}}}, {partial: true}))
      .toEqual({recovery: {used: {oneAction: true}}});
  });

  it("preserves completed initialization through Character, Advancement, Focus, Skill, Wound, and Recovery updates", async () => {
    const actor = new PersistentCharacter();
    await new CharacterInitializationService(undefined, () => 10).setup(actor as never, {
      pools: {might: 2, speed: 2, intellect: 2},
      skills: [
        {customName: "Climbing", rank: "trained"},
        {customName: "History", rank: "trained"}
      ]
    });
    expectCreation(actor, "completed");

    const advancementService = advancement();
    await advancementService.completeProgressionGuidance(actor as never);
    const expectGuidanceComplete = (): void => expect(
      (actor.system.advancement as unknown as {guidanceCompletedTiers: number[]}).guidanceCompletedTiers
    ).toEqual([1]);
    expectGuidanceComplete();

    await actor.update({"system.xp": 32, "system.stats.might.value": 9});
    expectCreation(actor, "completed");
    expectGuidanceComplete();

    await advancementService.purchase(actor as never, {kind: "extraEffort"});
    expectCreation(actor, "completed");
    expectGuidanceComplete();

    const item = focus();
    await new FocusAssociationService(() => "focus-choice", () => 20)
      .attach(actor as never, item, "creation");
    expectCreation(actor, "completed");
    expectGuidanceComplete();

    const focusAcquisition = new FocusAcquisitionService(undefined, async () => null, () => 30);
    await focusAcquisition.acquireManual(actor as never, item, "tier-one");
    expectCreation(actor, "completed");
    expectGuidanceComplete();
    await focusAcquisition.undo(actor as never, item, "tier-one");
    expectGuidanceComplete();

    await actor.items.find((entry) => entry.type === "skill")!
      .update({"system.rank": "untrained"});
    expectCreation(actor, "completed");
    expectGuidanceComplete();

    await new WoundService(() => "wound").apply(actor as never, "minor");
    expectCreation(actor, "completed");
    expectGuidanceComplete();

    const workflow = new RecoveryWorkflowService(
      new RecoveryService(async () => 3, () => "recovery", () => 50),
      new RestService(() => "rest", () => 50),
      noRecoveryHooks
    );
    await workflow.completeNonRest(actor as never, "one-action");
    expectCreation(actor, "completed");
    expectGuidanceComplete();
  });

  it("preserves the skipped state through later partial updates", async () => {
    const actor = new PersistentCharacter();
    await new CharacterInitializationService(undefined, () => 60)
      .markInitialized(actor as never, "skipped");
    expectCreation(actor, "skipped");

    await actor.update({"system.tier": 2, "system.resourcePoints": 4});
    expectCreation(actor, "skipped");
    await new WoundService(() => "wound").apply(actor as never, "minor");
    expectCreation(actor, "skipped");
  });
});
