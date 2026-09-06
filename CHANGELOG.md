# Changelog

All notable changes to this project will be documented in this file.

## 0.1.0 - 2026-08-24

### Added

- New `cypherv2` Foundry VTT v14 system manifest.
- TypeScript, Vite, Sass, and Vitest toolchain.
- Character, NPC, and Item TypeDataModel shells.
- Minimal Application V2 Actor and Item sheets.
- Minimal rule-module registry and `game.cypherv2` API.
- Core world settings and an English-only localization catalog.
- Phase 0 architecture decisions and data contracts.
- Smoke tests for document constants and the rule registry.
- Core Pool derived data with auditable contribution provenance.
- Complete Core Wound rollover, death, hindrance, and Pool Damage conversion.
- Independently available per-day Recoveries, separate Rest, and Rally services
  with structured history.
- Unified Normal Recovery workflow for Pool and Wound benefits, plus the
  `nonRest` Recovery mode and duration/refresh extension hooks.
- Minimal Character Sheet controls for manual Core gameplay testing.
- Exhaustive unit coverage for the Core gameplay layer.
- Generic d20 Roll Engine V1 with known, unknown, and hidden difficulty modes,
  step-based Ease/Hindrance, Effort/Edge Pool costs, and GM-only hidden audits.
- Extensible difficulty policies, RollContext enrichers, and a Core theme
  registry with world selection and CSS custom properties.
- Functional Skill Items, natural-result Chat presentation, and stateless GM
  Intrusion workflows with pending second-XP redistribution only.
- Combat Core V1: Weapon and Armor Items, derived armor contributions, native
  NPC targeting, structured NPC modifications, multi-target attack resolution,
  Block/Dodge, NPC defense requests, and controlled Chat damage/Wound actions.
- Unified Roll Card disclosure: `BEATS DIFFICULTY` in every mode, public
  success/failure whenever a difficulty exists, secret-free hidden cards, and
  optional GM audit ChatMessages disabled by default.
- Token-exact Combat actions for unlinked synthetic Actors, explicit
  roll-free Automatic Success at final difficulty 0, native floating combat
  feedback, Weapon attack/damage modifiers, and reusable Depletion rolls.
- Native Foundry `dead` status synchronization for exact NPC Token Actors when
  Health crosses zero in either direction.
- Focus Tree Engine Phase 1 with a versioned directed graph DataModel, isolated
  per-Focus Character progression, pure state evaluation, reusable read-only
  HTML/SVG rendering, legacy shell migration, and an Abides in Stone fixture.
- Responsive Focus connections measured from current DOM node rectangles and
  refreshed by sheet-scoped `ResizeObserver` instances.
- Compact non-overlapping Focus node rows with two-line Ability names, subtle
  state labels, description tooltips, and tested read-only Ability inspection.
- Hardened Focus acquisition lifecycle with service-side eligibility checks,
  per-Character operation serialization, exact Focus/node provenance, stable
  owned progression, and non-destructive Restore Ability handling.
- Theme-driven vertical scrolling for every Character Sheet tab while retaining
  independent horizontal Focus Tree scrolling.
- GM-only Focus Tree Editor V1 with native Foundry Ability drag/drop, detached
  working-copy commands, atomic validated saves, directional connection
  authoring, snapshot refresh, and non-destructive orphan handling.
- Character Advancement Engine V1 with four unique 4-XP purchases per Tier
  cycle, one optional Other replacement, tier-scaled Resource Points, Core
  Skill training, permanent Recovery/proficiency benefits, structured pending
  Focus and Genre choices, and Rule Module policy extension points.
- Focus acquisition gated by discrete pending choices, including source/Tier
  provenance, atomic choice consumption, and a separate explicit GM override.
- Skill Advancement can learn world/custom Skills or improve existing Skills;
  Core attack/defense training now unlocks at Tier 2 and specialization at Tier 4.
- Native Character Focus association by drag/drop or world picker, with stable
  source UUIDs, multiple independent progressions, explicit creation/additional
  provenance, one-time linked initial choices, and non-destructive removal.
- Minimal Core Character Setup for the 8/8/8 Pools plus six allocated points,
  two starting Skills, the optional third Skill/Inability exchange, and explicit
  completed/skipped/manual initialization state.
- Corrected Focus Tier 1 evaluation so every unowned Tier 1 Ability remains
  available independently of visible horizontal connections.
- Reversible per-node Focus acquisition provenance, choice-restoring Undo,
  dependency-safe player correction, warned GM Force Undo, and GM-only Edit
  Progression repair controls without destructive descendant cascades.
- Hardened Core Setup completion with one persisted creation-state object and
  an explicit Application V2 sheet rerender after setup, skip, or manual mark.
- Made Character DataModel migration partial-update safe: unrelated Actor
  updates no longer synthesize default creation, advancement, or recovery data,
  and legacy creation mode `setup` migrates to canonical `completed`.
- Added Species Automation V1 on the generic Character package pipeline, with
  native world/Compendium drops, explicit replacement, derived Pool/Wound/Edge/
  familiarity/Cypher Limit contributions, fixed and choice-based Skill/Ability
  grants, and source snapshots.
- Added recursive Species → Descriptor → granted Item provenance, safe
  delete-or-retain removal, the `speciesGranted` Descriptor role, and conservative
  duplicate Skill/Ability handling without automatic rank upgrades; duplicate
  Focus Ability acquisition is refused before progression or choice mutation.
- Added a reusable DialogV2 Grant Conflict Resolver for Type, Descriptor,
  Species, Focus, and future package workflows. Conflicts are planned
  sequentially before mutation and support declared/choice-backed suggestions,
  world or Compendium Items, custom Skills, explicit suppression, cancellation,
  replacement provenance, and Focus-only GM Override semantics.
- Added Type + Descriptor Automation V1 with Foundry-editable package models,
  embedded Character-owned package instances, derived Pool/Edge/Wound and
  familiarity contributions, structured Edge/Skill choices, snapshot-backed
  Ability/Skill grants, generic exact provenance, and non-destructive removal.
- Added native Character Sheet drag/drop and world pickers for Type and multiple
  Descriptors, package inspection, derived Character sentences, and safe Pool
  deficit preservation when packages are attached, removed, replaced, or edited.
- Added data-driven Character Genre associations, compact Genre administration,
  normal Ability catalogs with source UUIDs and snapshots, pending Genre Choice
  acquisition through the existing grant-conflict pipeline, and non-destructive
  Genre replacement/removal.
- Added generic Genre options for the effective total Effort cap. Core and absent
  Genres retain the cap of 6, while an Unlimited Genre removes only that absolute
  cap; Character paid-Effort limits remain independently authoritative.
- Migrated legacy Type Genre values to deterministic suggestion-only behavior
  without overriding an explicitly associated Character Genre.

### Not included yet

- Focus Tree auto-layout, graphical node dragging, and full branch respec.
- A full Type/Descriptor/Focus creation wizard.
- Player Intrusions.
- Optional rule modules.
- CRD content or compendium packs.
- Legacy-system migration.
