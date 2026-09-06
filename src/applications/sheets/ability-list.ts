import type {AbilityItemLike} from "../../abilities/ability-types";
import {abilityAllowedPools} from "../../abilities/ability-cost";

export interface AbilityListPresentation {
  readonly archived: boolean;
  readonly cost: {
    readonly amount: number;
    readonly pools: readonly import("../../rules/core/core-types").PoolKey[];
    readonly payable: boolean;
  };
  readonly description: string;
  readonly canDelete: boolean;
}

interface AbilityProvenance {
  readonly sourceUuid?: string;
  readonly instanceId?: string;
  readonly grantId?: string;
  readonly status?: "active" | "retained";
}

function mayDeleteAbility(ability: AbilityItemLike): boolean {
  const provenance = ability.system.grantedBy as AbilityProvenance | undefined;
  if (!provenance || provenance.status === "retained") return true;
  return !provenance.sourceUuid && !provenance.instanceId && !provenance.grantId;
}

export function abilityListPresentation(ability: AbilityItemLike): AbilityListPresentation {
  const allowedPools = abilityAllowedPools(ability);
  const amount = Number.isInteger(ability.system.cost.amount) && ability.system.cost.amount > 0
    ? ability.system.cost.amount
    : 0;

  return {
    archived: ability.system.archived === true,
    cost: {amount, pools: allowedPools, payable: amount > 0 && allowedPools.length > 0},
    description: ability.system.description.trim(),
    canDelete: mayDeleteAbility(ability)
  };
}

/** Active Abilities first, archived Abilities second, with stable locale-aware A-Z ordering. */
export function sortAbilityList<T extends AbilityItemLike>(abilities: readonly T[]): T[] {
  const collator = new Intl.Collator("en-US", {sensitivity: "base", numeric: true});
  return abilities
    .map((ability, index) => ({ability, index}))
    .sort((left, right) => {
      const archiveOrder = Number(left.ability.system.archived === true)
        - Number(right.ability.system.archived === true);
      return archiveOrder
        || collator.compare(left.ability.name, right.ability.name)
        || left.index - right.index;
    })
    .map(({ability}) => ability);
}

export class AbilityAccordionState {
  readonly #expandedIds = new Set<string>();

  isExpanded(id: string): boolean {
    return this.#expandedIds.has(id);
  }

  toggle(id: string): boolean {
    if (this.#expandedIds.delete(id)) return false;
    this.#expandedIds.add(id);
    return true;
  }

  remove(id: string): void {
    this.#expandedIds.delete(id);
  }

  retain(ids: Iterable<string>): void {
    const currentIds = new Set(ids);
    for (const id of this.#expandedIds) {
      if (!currentIds.has(id)) this.#expandedIds.delete(id);
    }
  }
}
