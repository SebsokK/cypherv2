# Data contract

## Source versus derived data

Persisted source data records user decisions and current state. Derived data is recalculated from source data, embedded Items, Active Effects, and active rule modules.

The following values are source data:

- Pool current values, base maxima, and base Edge;
- base Effort;
- XP and Resource Points;
- wound records;
- recovery and rest history;
- embedded Descriptor, Type, Focus, and Species Items;
- per-Focus owned node IDs;
- NPC Level, health, base Armor, and structured modifications.

The following values are derived:

- effective Pool maxima and Edge;
- effective Effort and free Effort;
- effective Wound capacities;
- wound penalties and dead state;
- effective Cypher limit;
- Item lists, attacks, Abilities, proficiencies, and sheet sections;
- all contribution breakdowns.

`system.derived` is the canonical calculated view. The non-persisted
`stats.<pool>.max` and `stats.<pool>.edge` properties are compatibility projections
for Foundry token resource bars; they are never rule inputs or persisted source.

## Collections

Character build collections use embedded Item IDs. The Phase 1 shell stores:

- `build.descriptorIds[]`;
- `build.typeIds[]`;
- `build.speciesIds[]`;
- `focusProgress[]`, each containing `focusUuid` and `ownedNodeIds[]`.

The Focus Item is the sole authority for its versioned graph (nodes, Ability
references, Tiers, directed connections, and presentation coordinates). A
Character never persists a graph copy. See [FOCUS-TREE.md](FOCUS-TREE.md).
`ownedNodeIds` remains authoritative even when its provenance-matched embedded
Ability is missing or its Focus source cannot currently be resolved. Embedded
Item presence is never an ownership input and no automatic cleanup is allowed.

The data layer must tolerate missing embedded Items and surface diagnostics instead of throwing during data preparation.

## Wound records

Only occupied wounds are persisted. Empty slots are a view derived from current count and effective capacity.

`WoundService` owns rollover, Pool Damage conversion, death, removal primitives,
and the `woundRules`/`poolRules` extension boundary. `RestService` and
`RallyService` use those primitives. Direct array mutation from sheets is
prohibited.

## Core gameplay history

Recovery and Rest history are persisted as structured records. Recovery records
its `normal` or `nonRest` kind. A Normal entry stores the d6, Tier, Last-action
bonus, result, and per-Pool allocation; a Non-Rest entry explicitly records that
no roll or allocation occurred. Rest stores the Normal Recovery's selected
Wound option, Major-task outcome, and removed Wound IDs. These histories are
source/audit data. The four per-day Recovery usage flags are persisted; their
currently available choices and all penalties remain derived.

## Duration effects

Items may describe a duration trigger. Applied effects will later be represented as Foundry Active Effects with `flags.cypherv2.duration` metadata. Duration processing belongs to Recovery/Rest services.
