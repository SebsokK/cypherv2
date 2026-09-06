import {afterEach, describe, expect, it, vi} from "vitest";

import type {NpcTargetLike} from "../../src/combat/combat-types";
import {prepareRoll, resolveRoll} from "../../src/rolls/roll-engine";
import type {RollContext} from "../../src/rolls/roll-types";
import {CORE_TOTAL_EFFORT_CAP} from "../../src/rules/core/effort-rules";
import {CombatChatService} from "../../src/services/combat-chat-service";
import type {CombatCharacterLike, WeaponAttackOutcome} from "../../src/services/combat-service";
import {RollChatService} from "../../src/services/roll-chat-service";
import {ShieldService, type ShieldItemLike} from "../../src/services/shield-service";
import {WoundService} from "../../src/services/wound-service";

const localize = (key: string): string => key;

function target(): NpcTargetLike {
  return {
    id: "npc-1",
    tokenId: "npc-token-1",
    tokenUuid: "Scene.scene.Token.npc-token-1",
    name: "Sentinel",
    type: "npc",
    system: {
      level: 7,
      armorBase: 2,
      health: {value: 20, baseMax: 20},
      modifications: [],
      damage: {
        amount: 4,
        woundSeverity: "moderate",
        defense: {allowBlock: true, allowDodge: true},
        notes: ""
      }
    },
    async update(): Promise<unknown> { return this; }
  };
}

function outcome(): WeaponAttackOutcome {
  const context: RollContext = {
    actor: {id: "character-1", name: "Ada"},
    label: "Sword",
    pool: "might",
    difficulty: {mode: "hidden", value: 7},
    assets: 0,
    paidEffort: 0,
    damageEffort: 0,
    freeEffort: 0,
    edge: 0,
    poolValue: 10,
    limits: {difficultyCeiling: 10, assetLimit: 2, paidEffortMaximum: 3, totalEffortMaximum: CORE_TOTAL_EFFORT_CAP},
    contributions: [],
    purpose: "damage",
    target: {actorId: "npc-1", name: "Sentinel", type: "npc"},
    origin: {
      kind: "weapon",
      itemId: "weapon-1",
      name: "Sword",
      category: "medium",
      attackType: "melee",
      baseDamage: 4
    }
  };
  const result = resolveRoll(prepareRoll(context), 20);
  return {
    target: target(),
    targetResolution: {
      targetId: "npc-1",
      targetIdentity: {
        actorId: "npc-1",
        tokenId: "npc-token-1",
        tokenUuid: "Scene.scene.Token.npc-token-1"
      },
      targetName: "Sentinel",
      baseLevel: 7,
      difficulty: 7,
      contributions: [],
      appliedModificationIds: []
    },
    execution: {result: {...result, success: true}},
    grossDamage: 8,
    categoryDamage: 4,
    weaponBonusDamage: 0,
    effortDamage: 0,
    naturalDamage: 4,
    armor: 2,
    netDamage: 6
  };
}

function unresolvedAttackOutcome(): WeaponAttackOutcome {
  const context: RollContext = {
    actor: {id: "character-1", name: "Ada"},
    label: "Glock 17",
    pool: "speed",
    difficulty: {mode: "unknown"},
    assets: 0,
    paidEffort: 0,
    damageEffort: 0,
    freeEffort: 0,
    edge: 0,
    poolValue: 10,
    limits: {difficultyCeiling: 10, assetLimit: 2, paidEffortMaximum: 3, totalEffortMaximum: CORE_TOTAL_EFFORT_CAP},
    contributions: [{
      id: "skill.specialized",
      label: "CYPHERV2.Skill.Ranks.specialized",
      direction: "ease",
      steps: 1,
      source: "skill"
    }],
    purpose: "damage",
    origin: {
      kind: "weapon",
      itemId: "weapon-glock",
      name: "Glock 17",
      category: "medium",
      attackType: "ranged",
      baseDamage: 4
    }
  };
  const result = resolveRoll(prepareRoll(context), 18);
  return {
    target: null,
    targetResolution: null,
    execution: {result},
    grossDamage: 6,
    categoryDamage: 4,
    weaponBonusDamage: 0,
    effortDamage: 0,
    naturalDamage: 2,
    armor: 0,
    netDamage: 6
  };
}

function actor(items: readonly ShieldItemLike[] = []): CombatCharacterLike {
  return {
    id: "character-1",
    name: "Ada",
    items,
    tokenId: "character-token-1",
    tokenUuid: "Scene.scene.Token.character-token-1"
  } as unknown as CombatCharacterLike;
}

function shield(options: {equipped?: boolean; broken?: boolean} = {}): ShieldItemLike {
  const major = options.broken ? [{
    id: "major-1",
    label: "Broken",
    description: "",
    sourceUuid: "test",
    treated: false
  }] : [];
  return {
    id: "shield-1",
    name: "Round Shield",
    type: "shield",
    system: {
      equipped: options.equipped ?? true,
      wounds: {minor: [], moderate: [], major} as ShieldItemLike["system"]["wounds"],
      derived: {capacities: {minor: 3, moderate: 2, major: 1}, broken: Boolean(options.broken)},
      description: ""
    },
    async update(changes): Promise<unknown> {
      if (typeof changes["system.equipped"] === "boolean") {
        (this.system as {equipped: boolean}).equipped = changes["system.equipped"] as boolean;
      }
      return this;
    }
  };
}

function combatChat(): CombatChatService {
  return new CombatChatService(
    new RollChatService(),
    new ShieldService(new WoundService(() => "shield-wound"))
  );
}

function stubFoundry(messages: Record<string, unknown>[]): void {
  vi.stubGlobal("game", {i18n: {localize}});
  vi.stubGlobal("foundry", {
    applications: {handlebars: {renderTemplate: vi.fn(async (_path: string, data: Record<string, unknown>) => JSON.stringify(data))}}
  });
  vi.stubGlobal("ChatMessage", {
    create: vi.fn(async (message: Record<string, unknown>) => { messages.push(message); return {}; }),
    getSpeaker: () => ({actor: "character-1"}),
    getWhisperRecipients: () => [{id: "gm-1"}]
  });
  vi.stubGlobal("Hooks", {callAll: vi.fn()});
}

describe("CombatChatService", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("publishes the hidden outcome and safe combat action without NPC difficulty", async () => {
    const messages: Record<string, unknown>[] = [];
    stubFoundry(messages);
    await new CombatChatService(new RollChatService()).publishWeaponAttack(actor(), outcome(), "rollOnly");

    expect(messages).toHaveLength(1);
    const publicMessage = messages[0]!;
    const publicPayload = JSON.parse(String(publicMessage.content)) as Record<string, unknown>;
    expect(publicPayload).toMatchObject({
      outcomeClass: "success",
      beatsDifficulty: 6,
      showFinalDamage: true,
      finalDamage: 8,
      combatAction: true
    });
    expect(publicPayload.damageTotalDetails).toEqual(expect.arrayContaining([
      expect.objectContaining({label: "CYPHERV2.Combat.FinalDamage", value: 8})
    ]));
    expect(publicMessage).toHaveProperty("flags.cypherv2.combatAction", expect.objectContaining({
      kind: "npcDamage",
      targetActorId: "npc-1",
      targetTokenId: "npc-token-1",
      targetTokenUuid: "Scene.scene.Token.npc-token-1",
      requestedDamage: 8
    }));
    expect(JSON.stringify(publicPayload)).not.toContain('"value":7');
    expect(JSON.stringify(publicPayload)).not.toContain("originalDifficulty");
    expect(JSON.stringify(publicPayload)).not.toContain("finalDifficulty");
    expect(JSON.stringify(publicPayload)).not.toContain("targetNumber");
    expect(JSON.stringify(publicMessage.flags)).not.toContain("difficulty");
    expect(JSON.stringify(publicMessage.flags)).not.toContain("level");
  });

  it("publishes calculated damage for the real no-difficulty Weapon path while omitting it on failure", async () => {
    const messages: Record<string, unknown>[] = [];
    stubFoundry(messages);
    const unresolved = unresolvedAttackOutcome();
    expect(unresolved.execution.result.success).toBeNull();

    await new CombatChatService(new RollChatService()).publishWeaponAttack(
      actor(), unresolved, "rollOnly"
    );
    const unresolvedPayload = JSON.parse(String(messages[0]!.content)) as Record<string, unknown>;
    expect(unresolvedPayload).toMatchObject({
      presentation: "unknown",
      showFinalDamage: true,
      finalDamage: 6
    });
    expect(unresolvedPayload).not.toHaveProperty("outcome");
    expect(unresolvedPayload).not.toHaveProperty("combatAction");
    expect(unresolvedPayload.damageDetails).toEqual([
      {label: "CYPHERV2.Combat.DamageBreakdown.Category", value: 4},
      {label: "CYPHERV2.Combat.DamageBreakdown.Natural", value: "+2"}
    ]);
    expect(unresolvedPayload.damageTotalDetails).toEqual([
      {label: "CYPHERV2.Combat.FinalDamage", value: 6}
    ]);

    const failed = outcome();
    await new CombatChatService(new RollChatService()).publishWeaponAttack(actor(), {
      ...failed,
      execution: {result: {...failed.execution.result, success: false}}
    }, "rollOnly");
    const failedPayload = JSON.parse(String(messages[1]!.content)) as Record<string, unknown>;
    expect(failedPayload).toMatchObject({
      showFinalDamage: false,
      damageDetails: [],
      damageTotalDetails: []
    });
    expect(failedPayload).not.toHaveProperty("finalDamage");
  });

  it("publishes a defense request with no NPC difficulty in content or flags", async () => {
    const messages: Record<string, unknown>[] = [];
    stubFoundry(messages);
    await combatChat().createDefenseRequest(
      target(),
      actor(),
      "moderate",
      ["block", "dodge"]
    );

    expect(messages).toHaveLength(1);
    const serialized = JSON.stringify(messages[0]);
    expect(serialized).not.toContain('"level"');
    expect(serialized).not.toContain('"difficulty"');
    expect(messages[0]).toHaveProperty("flags.cypherv2.defenseRequest", expect.objectContaining({
      sourceActorId: "npc-1",
      targetActorId: "character-1",
      targetTokenId: "character-token-1",
      targetTokenUuid: "Scene.scene.Token.character-token-1",
      woundSeverity: "moderate",
      allowedDefenses: ["block", "dodge"]
    }));
    expect(JSON.parse(String(messages[0]!.content))).toMatchObject({
      allowDodge: true,
      allowBlock: true,
      allowBlockWithShield: false
    });
  });

  it("adds Block With Shield only for an equipped functional Shield", async () => {
    const messages: Record<string, unknown>[] = [];
    stubFoundry(messages);

    await combatChat().createDefenseRequest(
      target(),
      actor([shield()]),
      "moderate",
      ["block", "dodge"]
    );
    await combatChat().createDefenseRequest(
      target(),
      actor([shield({broken: true})]),
      "moderate",
      ["block", "dodge"]
    );

    expect(messages[0]).toHaveProperty("flags.cypherv2.defenseRequest.allowedDefenses", [
      "block", "dodge", "blockWithShield"
    ]);
    expect(JSON.parse(String(messages[0]!.content))).toMatchObject({allowBlockWithShield: true});
    expect(messages[1]).toHaveProperty("flags.cypherv2.defenseRequest.allowedDefenses", ["block", "dodge"]);
    expect(JSON.parse(String(messages[1]!.content))).toMatchObject({allowBlockWithShield: false});
  });

  it("publishes a deferred action targeting the exact Shield", async () => {
    const messages: Record<string, unknown>[] = [];
    stubFoundry(messages);
    await new CombatChatService(new RollChatService()).publishDefense(
      actor(),
      outcome().execution,
      {recipient: "shield", severity: "major", shieldId: "shield-1", shieldName: "Round Shield"},
      target(),
      "rollOnly",
      false
    );

    expect(messages).toHaveLength(1);
    const payload = JSON.parse(String(messages[0]!.content)) as Record<string, unknown>;
    expect(payload).toMatchObject({
      shieldTransfer: true,
      shieldName: "Round Shield",
      shieldSeverity: "CYPHERV2.Wounds.Severity.major",
      combatAction: true
    });
    expect(messages[0]).toHaveProperty("flags.cypherv2.combatAction", expect.objectContaining({
      kind: "shieldWound",
      targetActorId: "character-1",
      shieldId: "shield-1",
      shieldName: "Round Shield",
      severity: "major",
      applied: false
    }));
  });
});
