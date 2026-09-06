import {afterEach, describe, expect, it, vi} from "vitest";

import type {AbilityItemLike} from "../../src/abilities/ability-types";
import {promptAbilityCostPayment} from "../../src/applications/dialogs/ability-payment-dialog";
import type {CombatCharacterLike} from "../../src/services/combat-service";

function ability(allowedPools: readonly ("might" | "speed" | "intellect")[]): AbilityItemLike {
  return {
    id: "ability-1",
    name: "Earthshake",
    type: "ability",
    system: {
      activation: "action",
      pool: "none",
      cost: {amount: 7, ignoresEdge: false, allowedPools},
      roll: "attack",
      rollModifier: 0,
      attackModifier: 0,
      damage: 4,
      woundSeverity: "none",
      range: "long",
      targetMode: "single",
      description: ""
    }
  };
}

describe("Ability payment dialog", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("pays a one-Pool Ability immediately without opening the Roll or Pool dialog", async () => {
    const payCost = vi.fn(async () => ({pool: "might"}));
    const publishPayment = vi.fn(async () => undefined);
    const input = vi.fn();
    vi.stubGlobal("foundry", {applications: {api: {DialogV2: {input}}}});
    vi.stubGlobal("game", {
      i18n: {localize: (key: string) => key, format: (key: string) => key},
      cypherv2: {services: {abilities: {payCost}, abilityChat: {publishPayment}}}
    });
    const actor = {id: "actor", name: "Arthur"} as CombatCharacterLike;
    await promptAbilityCostPayment(actor, ability(["might"]));
    expect(input).not.toHaveBeenCalled();
    expect(payCost).toHaveBeenCalledWith(actor, expect.anything(), "might");
    expect(publishPayment).toHaveBeenCalledOnce();
  });

  it("offers only legal Pools and passes exactly one selected Pool for the whole cost", async () => {
    const previewPayment = vi.fn((_actor, _ability, pool: string) => ({
      pool, currentBefore: 10, edge: 1, costPaid: 6
    }));
    const payCost = vi.fn(async () => ({pool: "intellect"}));
    const publishPayment = vi.fn(async () => undefined);
    const input = vi.fn(async (options: {content: string}) => {
      expect(options.content).toContain('value="might"');
      expect(options.content).toContain('value="intellect"');
      expect(options.content).not.toContain('value="speed"');
      expect(options.content).toContain("CYPHERV2.Ability.Payment.WholeCost");
      return {pool: "intellect"};
    });
    vi.stubGlobal("foundry", {applications: {api: {DialogV2: {input}}}});
    vi.stubGlobal("game", {
      i18n: {localize: (key: string) => key, format: (key: string) => key},
      cypherv2: {services: {abilities: {previewPayment, payCost}, abilityChat: {publishPayment}}}
    });
    const actor = {id: "actor", name: "Arthur"} as CombatCharacterLike;
    await promptAbilityCostPayment(actor, ability(["might", "intellect"]));
    expect(previewPayment).toHaveBeenCalledTimes(2);
    expect(payCost).toHaveBeenCalledWith(actor, expect.anything(), "intellect");
  });

  it("cancels without payment or Chat output", async () => {
    const payCost = vi.fn();
    const publishPayment = vi.fn();
    vi.stubGlobal("foundry", {applications: {api: {DialogV2: {input: vi.fn(async () => null)}}}});
    vi.stubGlobal("game", {
      i18n: {localize: (key: string) => key, format: (key: string) => key},
      cypherv2: {services: {
        abilities: {previewPayment: vi.fn((_actor, _ability, pool) => ({pool, currentBefore: 10, edge: 0, costPaid: 7})), payCost},
        abilityChat: {publishPayment}
      }}
    });
    await promptAbilityCostPayment({id: "actor", name: "Arthur"} as CombatCharacterLike, ability(["might", "speed"]));
    expect(payCost).not.toHaveBeenCalled();
    expect(publishPayment).not.toHaveBeenCalled();
  });
});
