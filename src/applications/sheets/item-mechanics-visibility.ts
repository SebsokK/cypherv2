export interface AbilityMechanicsSource {
  readonly activation: string;
  readonly cost: {
    readonly amount: number;
    readonly ignoresEdge: boolean;
    readonly allowedPools?: readonly string[];
  };
  readonly roll: string;
  readonly rollModifier: number;
  readonly attackModifier: number;
  readonly damage: number;
  readonly woundSeverity: string;
  readonly range: string;
  readonly targetMode: string;
}

export interface AbilityMechanicsVisibility {
  readonly showIgnoresEdge: boolean;
  readonly showRollModifier: boolean;
  readonly rollModifierLabel: "task" | "defense" | "general";
  readonly showAttackModifier: boolean;
  readonly showDamage: boolean;
  readonly showWoundSeverity: boolean;
  readonly showRange: boolean;
  readonly showTargetMode: boolean;
  readonly hasConditionalFields: boolean;
}

export function abilityMechanicsVisibility(
  system: AbilityMechanicsSource
): AbilityMechanicsVisibility {
  const attack = system.roll === "attack";
  const task = system.roll === "task";
  const defense = system.roll === "defense";
  const showRollModifier = task || defense || system.rollModifier !== 0;
  const showAttackModifier = attack || system.attackModifier !== 0;
  const showDamage = attack || system.damage !== 0;
  const showWoundSeverity = attack || system.woundSeverity !== "none";
  const showRange = attack || system.range.trim() !== "";
  const showTargetMode = attack || system.targetMode !== "none";

  return {
    showIgnoresEdge: (
      system.cost.amount > 0 && Boolean(system.cost.allowedPools?.length)
    ) || system.cost.ignoresEdge,
    showRollModifier,
    rollModifierLabel: task ? "task" : defense ? "defense" : "general",
    showAttackModifier,
    showDamage,
    showWoundSeverity,
    showRange,
    showTargetMode,
    hasConditionalFields: showRollModifier
      || showAttackModifier
      || showDamage
      || showWoundSeverity
      || showRange
      || showTargetMode
  };
}

export interface SkillMechanicsSource {
  readonly defaultPool: string;
  readonly category: string;
  readonly contexts: readonly string[];
  readonly initiative: boolean;
}

export function skillHasOptionalMechanics(system: SkillMechanicsSource): boolean {
  return system.defaultPool !== "choose"
    || system.category !== "general"
    || system.contexts.length > 0
    || system.initiative;
}
