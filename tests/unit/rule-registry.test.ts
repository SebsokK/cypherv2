import {describe, expect, it} from "vitest";

import {CORE_RULE_MODULE} from "../../src/rules/core-rule-module";
import {CORE_TOTAL_EFFORT_CAP} from "../../src/rules/core/effort-rules";
import {RuleRegistry} from "../../src/rules/rule-registry";

describe("RuleRegistry", () => {
  it("registers and retrieves a module", () => {
    const registry = new RuleRegistry();
    registry.register(CORE_RULE_MODULE);

    expect(registry.get("cypherv2.core")?.core).toBe(true);
  });

  it("rejects duplicate IDs", () => {
    const registry = new RuleRegistry();
    registry.register(CORE_RULE_MODULE);

    expect(() => registry.register(CORE_RULE_MODULE)).toThrow(/already registered/i);
  });

  it("always activates the Core module", () => {
    const registry = new RuleRegistry();
    registry.register(CORE_RULE_MODULE);
    registry.register({id: "example.optional", title: "Example"});

    expect(registry.active([]).map((module) => module.id)).toEqual(["cypherv2.core"]);
    expect(registry.active(["example.optional"]).map((module) => module.id)).toEqual([
      "cypherv2.core",
      "example.optional"
    ]);
  });

  it("reports missing dependencies", () => {
    const registry = new RuleRegistry();
    registry.register(CORE_RULE_MODULE);
    registry.register({
      id: "example.strange",
      title: "Future Strange module",
      dependencies: ["example.recursions"]
    });

    expect(registry.diagnostics(["example.strange"])).toEqual([
      {
        severity: "error",
        moduleId: "example.strange",
        message: "Missing active dependency 'example.recursions'."
      }
    ]);
  });

  it("lets active Rule Modules extend difficulty policy without Core changes", () => {
    const registry = new RuleRegistry();
    registry.register(CORE_RULE_MODULE);
    registry.register({
      id: "example.power-shifts",
      title: "Example",
      extensionPoints: ["difficultyPolicies"]
    });
    registry.registerDifficultyPolicy("example.power-shifts", (policy) => ({
      ...policy,
      difficultyCeiling: 15,
      assetLimit: 3
    }));

    expect(registry.resolveDifficultyPolicy(
      {difficultyCeiling: 10, assetLimit: 2},
      ["example.power-shifts"]
    )).toEqual({difficultyCeiling: 15, assetLimit: 3});
    expect(registry.resolveDifficultyPolicy(
      {difficultyCeiling: 10, assetLimit: 2},
      []
    )).toEqual({difficultyCeiling: 10, assetLimit: 2});
  });

  it("lets active Rule Modules enrich RollContext before preparation", () => {
    const registry = new RuleRegistry();
    registry.register({
      id: "example.rolls",
      title: "Example",
      extensionPoints: ["rollModifiers"]
    });
    registry.registerRollContextEnricher("example.rolls", (context) => ({
      ...context,
      contributions: [
        ...context.contributions,
        {
          id: "example.ease",
          label: "Example Ease",
          direction: "ease",
          steps: 1,
          source: "rule-module"
        }
      ]
    }));
    const context = {
      actor: {id: "actor-1", name: "Ada"},
      label: "Task",
      pool: "might" as const,
      difficulty: {mode: "unknown" as const},
      assets: 0,
      paidEffort: 0,
      freeEffort: 0,
      edge: 0,
      poolValue: 10,
      limits: {difficultyCeiling: 10, assetLimit: 2, paidEffortMaximum: 1, totalEffortMaximum: CORE_TOTAL_EFFORT_CAP},
      contributions: []
    };

    expect(registry.enrichRollContext(context, ["example.rolls"]).contributions).toHaveLength(1);
    expect(registry.enrichRollContext(context, []).contributions).toHaveLength(0);
  });

  it("lets Rule Modules extend Advancement policy without changing Core", () => {
    const registry = new RuleRegistry();
    registry.register(CORE_RULE_MODULE);
    registry.register({
      id: "example.advancement",
      title: "Example Advancement",
      extensionPoints: ["advancementRules"]
    });
    registry.registerAdvancementPolicy("example.advancement", (policy) => ({
      ...policy,
      effortMaximum: 9,
      resourcePointsForTier: () => 5
    }));
    const base = {
      xpCost: 4,
      purchasesPerTier: 4,
      capabilityPoints: 4,
      effortMaximum: 6,
      recoveryBonus: 2,
      resourcePointsForTier: () => 1,
      genreChoiceForTier: () => false,
      attackDefenseTrainingTier: 2,
      attackDefenseSpecializationTier: 4
    };
    expect(registry.resolveAdvancementPolicy(base, []).effortMaximum).toBe(6);
    const extended = registry.resolveAdvancementPolicy(base, ["example.advancement"]);
    expect(extended.effortMaximum).toBe(9);
    expect(extended.resourcePointsForTier(1)).toBe(5);
  });
});
