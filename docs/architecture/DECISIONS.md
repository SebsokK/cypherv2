# Phase 0 architectural decisions

Status: accepted for the first commit.

## Platform

- System identifier: `cypherv2`.
- Language: TypeScript.
- Runtime target: Foundry VTT v14, verified against 14.360.
- User interface: Application V2 with Handlebars parts.
- Global jQuery is prohibited.

## Documents

- Initial Actor types: `character` and `npc`.
- Initial Item types: Ability, Skill, Weapon, Armor, Equipment, Cypher, Artifact, Descriptor, Character Type, Focus, and Species.
- Descriptors and Foci are collections, not singular active IDs.
- Focus progression is stored independently per Focus.
- Skill ranks are `inability`, `untrained`, `trained`, `specialized`, and `expert`.

## Core Character state

- Resource Points are persisted Core data.
- Might, Speed, and Intellect store current value, base maximum, and base Edge.
- The Core Wound capacity is 3 Minor, 3 Moderate, and 3 Major.
- Wounds roll over Minor to Moderate to Major.
- A Character is dead when the final Major slot is filled.
- Pool Damage and Pool-to-Wound conversion belong to `WoundService`, not sheet event handlers.
- Effective Pool maxima/Edge, Wound capacities, hindrance, death, and the next
  Recovery are derived with contribution provenance.

## Recovery, Rest, and duration triggers

- Recovery restores Pools.
- `RecoveryService` and `RestService` remain separate rule services, but a
  Normal Recovery is one user workflow which composes both.
- A Non-Rest Recovery spends the same per-day availability and duration without
  rolling, restoring Pools, or applying Rest/Wound benefits.
- The four Core Recoveries—one action, 10 minutes, 1 hour, and 10 hours—have
  independent per-day availability and may be used in any order. Completing a
  10-hour Recovery starts a new day and makes all four available again.
- A 10-hour Rest records the externally resolved result of its difficulty 6
  Might task. Task rolling remains outside `RestService` until the Roll Engine.
- A 10-hour Normal Recovery prepares its Rest benefits before atomically
  publishing those benefits together with the new-day availability reset.
- The duration trigger vocabulary is fixed initially as:
  - `recovery`
  - `10-minute-or-longer`
  - `1-hour-or-longer`
  - `10-hour`
  - `non-rest-recovery`
- Applied duration effects will use Foundry Active Effects plus typed `cypherv2` metadata in a later phase.

## Rules

- Source values are never cumulatively changed by rule modules.
- Contributions are collected and reduced into derived values.
- The rule registry is exposed through `game.cypherv2.rules`.
- External modules will be able to register new behavior without modifications to Core.
- The Strange is not implemented in the first version, but the registry cannot assume a fixed set of settings, contributions, sheet sections, Item behaviors, or Focus behaviors.

## Rolls and targeting

- A future Roll Engine will support entered, unknown, and hidden difficulty.
- Multiple targets may resolve against different difficulties and produce one target result each.
- Hidden difficulty is interface confidentiality, not hostile-client security.

## Focus Trees

- Focus Trees are required for the first playable release.
- Graph data is stored on Focus Items.
- Owned node IDs are persisted independently per Focus on the Character.
- Available and locked states are derived.
- Rendering and graph editing are deferred beyond Phase 1.

## Content and migration

- Public CRD content may be added progressively only after COL provenance review.
- No CRD content is included in Phase 0/1.
- Migration from the legacy system is low priority and remains out of the runtime Core.
