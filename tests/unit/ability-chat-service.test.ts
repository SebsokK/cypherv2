import {afterEach, describe, expect, it, vi} from "vitest";

import type {AbilityItemLike, AbilityNoRollOutcome, AbilityRollOutcome} from "../../src/abilities/ability-types";
import {AbilityChatService} from "../../src/services/ability-chat-service";
import type {CombatCharacterLike} from "../../src/services/combat-service";
import type {RollChatService} from "../../src/services/roll-chat-service";

const ability: AbilityItemLike = {
  id: "ability-1",
  name: "Mind Lance",
  type: "ability",
  system: {
    activation: "action",
    pool: "intellect",
    cost: {amount: 2, ignoresEdge: false},
    roll: "attack",
    rollModifier: 0,
    attackModifier: 0,
    damage: 5,
    woundSeverity: "moderate",
    range: "long",
    targetMode: "single",
    description: ""
  }
};

describe("AbilityChatService", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reuses RollChat combat actions for synthetic NPC damage", async () => {
    const publish = vi.fn(async () => undefined);
    const service = new AbilityChatService({publish} as unknown as RollChatService);
    const outcome = {
      ability,
      target: {
        id: "npc-1",
        name: "Sentinel",
        type: "npc",
        tokenId: "synthetic-npc",
        tokenUuid: "Scene.scene.Token.synthetic-npc"
      },
      execution: {result: {success: true}},
      grossDamage: 8,
      woundSeverity: "moderate"
    } as unknown as AbilityRollOutcome;
    await service.publishRoll({} as CombatCharacterLike, outcome, "resultOnly");
    expect(publish).toHaveBeenCalledWith(
      expect.anything(),
      outcome.execution,
      "resultOnly",
      expect.objectContaining({combat: expect.objectContaining({
        damage: 8,
        action: expect.objectContaining({
          kind: "npcDamage",
          targetTokenId: "synthetic-npc",
          targetTokenUuid: "Scene.scene.Token.synthetic-npc",
          requestedDamage: 8
        })
      })})
    );
  });

  it("publishes calculated attack damage for an unresolved no-target attack", async () => {
    const publish = vi.fn(async () => undefined);
    const service = new AbilityChatService({publish} as unknown as RollChatService);
    const outcome = {
      ability,
      target: null,
      execution: {result: {success: null}},
      baseDamage: 5,
      effortDamage: 3,
      naturalDamage: 2,
      grossDamage: 10,
      woundSeverity: "none"
    } as unknown as AbilityRollOutcome;
    await service.publishRoll({} as CombatCharacterLike, outcome, "resultOnly");
    expect(publish).toHaveBeenCalledWith(
      expect.anything(),
      outcome.execution,
      "resultOnly",
      expect.objectContaining({combat: expect.objectContaining({
        damage: 10,
        damageBreakdown: [
          {label: "CYPHERV2.Ability.DamageBreakdown.Base", value: 5},
          {label: "CYPHERV2.Combat.DamageBreakdown.Effort", value: 3, additive: true},
          {label: "CYPHERV2.Combat.DamageBreakdown.Natural", value: 2, additive: true}
        ]
      })})
    );
  });

  it("does not publish Ability attack damage after an explicit failure", async () => {
    const publish = vi.fn(async () => undefined);
    const service = new AbilityChatService({publish} as unknown as RollChatService);
    const outcome = {
      ability,
      target: null,
      execution: {result: {success: false}},
      baseDamage: 5,
      effortDamage: 0,
      naturalDamage: 0,
      grossDamage: 5,
      woundSeverity: "none"
    } as unknown as AbilityRollOutcome;
    await service.publishRoll({} as CombatCharacterLike, outcome, "resultOnly");
    expect(publish).toHaveBeenCalledWith(
      expect.anything(),
      outcome.execution,
      "resultOnly",
      expect.objectContaining({combat: {}})
    );
  });

  it("creates a controlled Apply Wound action for a no-roll Character target", async () => {
    const create = vi.fn(async () => undefined);
    const renderTemplate = vi.fn(async () => "<article>Ability</article>");
    vi.stubGlobal("foundry", {applications: {handlebars: {renderTemplate}}});
    vi.stubGlobal("game", {i18n: {localize: (key: string) => key}});
    vi.stubGlobal("ChatMessage", {
      create,
      getSpeaker: () => ({alias: "Arthur"})
    });
    const service = new AbilityChatService({} as RollChatService);
    const actor = {id: "actor-1", name: "Arthur"} as CombatCharacterLike;
    const target = {
      id: "character-2",
      uuid: "Actor.character-2",
      name: "B",
      type: "character",
      tokenId: "token-b",
      tokenUuid: "Scene.scene.Token.token-b"
    } as AbilityNoRollOutcome["targets"][number];
    await service.publishNoRoll(actor, {
      ability: {...ability, system: {...ability.system, roll: "none"}},
      actor,
      pool: "intellect",
      costPaid: 2,
      edgeApplied: 0,
      targets: [target]
    });
    expect(renderTemplate).toHaveBeenCalledWith(
      "systems/cypherv2/templates/chat/ability-card.hbs",
      expect.objectContaining({abilityName: "Mind Lance", targetName: "B", combatAction: true})
    );
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      flags: {cypherv2: {combatAction: expect.objectContaining({
        kind: "characterWound",
        targetTokenId: "token-b",
        severity: "moderate"
      })}}
    }));
  });

  it("publishes a compact payment-only card with the synthetic Actor speaker and no roll", async () => {
    const create = vi.fn(async () => undefined);
    const renderTemplate = vi.fn(async () => "<article>Payment</article>");
    const getSpeaker = vi.fn(() => ({token: "synthetic-token", actor: "base-actor"}));
    vi.stubGlobal("foundry", {applications: {handlebars: {renderTemplate}}});
    vi.stubGlobal("game", {i18n: {localize: (key: string) => key}});
    vi.stubGlobal("ChatMessage", {create, getSpeaker});
    const service = new AbilityChatService({} as RollChatService);
    const actor = {
      id: "base-actor",
      name: "Arthur",
      tokenId: "synthetic-token",
      img: "arthur.webp"
    } as unknown as CombatCharacterLike;
    await service.publishPayment(actor, {
      ability,
      pool: "intellect",
      listedCost: 2,
      ignoresEdge: false,
      edge: 1,
      edgeApplied: 1,
      costPaid: 1,
      currentBefore: 7,
      currentAfter: 6,
      canPay: true
    });
    expect(renderTemplate).toHaveBeenCalledWith(
      "systems/cypherv2/templates/chat/ability-payment-card.hbs",
      expect.objectContaining({abilityName: "Mind Lance", actorName: "Arthur", costPaid: 1, currentAfter: 6})
    );
    expect(getSpeaker).toHaveBeenCalledWith({actor: actor as unknown as Actor});
    expect(create).toHaveBeenCalledOnce();
  });
});
