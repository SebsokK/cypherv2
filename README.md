# Cypher V2 for Foundry VTT

`cypherv2` is a new Foundry VTT v14 game system intended to support Cypher V2 with a modern, extensible architecture.

This repository contains typed document models, Application V2 sheets, a
rule-module registry, build tooling, and the first Core gameplay services. The
Core layer currently covers derived Pools and Effort, Wounds, Pool Damage,
Recovery, Rest, Rally, Skills, natural results, GM Intrusions, and Combat Core
V1. Combat includes typed Weapons and Armor, native NPC targeting, structured
NPC modifications, Block/Dodge defense requests, and controlled Chat actions
for NPC Health damage and Character Wounds. Focus Tree Phases 1–2 add versioned
graphs, pure progression evaluation, a reusable HTML/SVG renderer, idempotent
Ability acquisition, explicit restoration of missing acquired Abilities, and a
GM-only Focus Tree Editor with native Ability drag/drop and atomic saves.
Character Advancement V1 adds four-purchase Tier cycles, structured Other
Advancements, tier-based Resource Points, pending Focus/Genre choices, and
choice-gated Focus acquisition. Skill Advancement can learn a world/custom
Skill or improve an embedded Skill, with attack/defense training available at
Tier 2 and specialization at Tier 4. Characters can attach multiple referenced
Foci by native drag/drop or the Foci tab, with independent progression and two
one-time initial choices per Focus. A minimal Core Character Setup initializes
Pools and starting Skills without imposing Type, Descriptor, Focus, or genre.
Type + Descriptor Automation V1 then attaches independent embedded package
instances through native drag/drop. Their numerical benefits remain derived,
while granted Abilities and Skills are embedded Items with exact grant
provenance and snapshot fallback. Multiple Descriptors and a non-mandatory Type
are supported without coupling Core Character creation to a genre structure.
Species Automation V1 uses that same package pipeline for Pools, Wound
capacities, Edge, familiarities, Cypher Limit, Skills, Abilities, and choices.
A Species may grant a real embedded Descriptor with role `speciesGranted`; the
recursive provenance chain supports exact removal or explicit retention without
copying mechanics into the Character source data.
Genre V1 adds one Character-owned source association, a data-driven Ability
catalog, pending Genre Choice resolution, and a generic Core/Unlimited total
Effort-cap option. Type Genre data is suggestion-only and never overrides an
explicit Character Genre.
It does not yet contain Focus auto-layout, graphical node dragging,
full branch respec, optional rule modules, a complete Type/Descriptor/Focus
creation wizard, or CRD compendiums.

## Architectural principles

- Foundry VTT v14.360 or newer within major version 14.
- TypeScript and strict type checking.
- Foundry `TypeDataModel` schemas for Actor and Item data.
- Application V2 sheets without global jQuery.
- Source data is kept separate from derived data.
- Rule modules contribute to pipelines; they do not cumulatively mutate source values.
- Characters can own multiple Descriptors and multiple Foci.
- Focus progression is independent for each Focus.
- Character Focus associations retain the source Item UUID and never duplicate
  the Focus graph into Actor data.
- A Character Genre association likewise retains a single source Item UUID;
  the Genre source remains authoritative for its Ability catalog and options.
- Type, Descriptor, and Species definitions are copied as embedded Character Items. The
  embedded instance is authoritative, retains its original source UUID and
  personal choices, and never follows later source definition edits implicitly.
- Character Package bonuses are recalculated from attached Items; only current
  Pool values are adjusted to preserve their prior deficit when maxima change.
- Package-granted Items use `grantedBy.kind/sourceUuid/instanceId/grantId/status`
  plus stable content identity. Nested package instances also retain their
  parent grant, allowing Species → Descriptor → Skill provenance to be followed
  and removed exactly, while legacy Focus provenance remains available and
  compatible.
- Obvious duplicate Skill and Ability grants use one generic pre-transaction
  resolver. It offers only provenance-backed package suggestions, existing
  world/Compendium Items, custom Skills, or explicit suppression; replacements
  retain the original package instance and grant identity. Focus conflicts use
  the same dialog boundary but never substitute an arbitrary Ability for a node:
  cancellation preserves the pending choice and the GM may explicitly override.
- Duplicate grants never upgrade Skill ranks automatically. In V1, selecting an
  off-list world/Compendium replacement is a direct GM workflow; no socket-based
  player proposal/approval exchange is implemented yet.
- Skill ranks are `inability`, `untrained`, `trained`, `specialized`, and `expert`.
- Recovery and Rest remain distinct internal services composed by one Normal
  Recovery workflow; Non-Rest Recoveries intentionally grant neither benefit.
- Hidden difficulties provide interface confidentiality, not hostile-client security.
- Multi-target attacks share one action cost and d20, but resolve separately
  against each target's private difficulty.
- NPCs use Health; Characters use Wounds. Combat never projects Character
  Wounds into hit points.
- The distributed product UI and localization catalog are English-only.

See [docs/architecture/DECISIONS.md](docs/architecture/DECISIONS.md) for the Phase 0 decisions.
See [docs/architecture/ROLL-ENGINE.md](docs/architecture/ROLL-ENGINE.md) for the
roll pipeline and hidden-difficulty Chat boundary.
See [docs/architecture/COMBAT-CORE.md](docs/architecture/COMBAT-CORE.md) for the
Combat V1 workflows and rule boundaries.
See [docs/architecture/FOCUS-TREE.md](docs/architecture/FOCUS-TREE.md) for the
Focus graph, evaluator states, renderer boundary, and acquisition lifecycle.

## Development

Requirements:

- Node.js 20.19 or later.
- pnpm 9 or later.
- Foundry VTT 14.360 for runtime testing.

Install and verify:

```bash
pnpm install
pnpm check
```

Useful commands:

```bash
pnpm dev
pnpm typecheck
pnpm test
pnpm build
```

`pnpm dev` rebuilds the bundle when TypeScript or SCSS files change. Foundry must be restarted or refreshed to load a newly built JavaScript bundle.

## Foundry installation

The repository directory must be named `cypherv2` and placed directly in the Foundry data directory under `Data/systems/cypherv2`.

After `pnpm build`, the required runtime files are:

- `system.json`
- `dist/cypherv2.mjs`
- `dist/cypherv2.css`
- `templates/`
- `lang/`
- `fixtures/` (development imports only)

Restart Foundry, open Setup, create a world, and select **Cypher V2** as its game system.

## Content and licensing

No Cypher Reference Document content is included at this phase. Future open content must record its provenance and comply with the current Cypher Open License.

The software is MIT licensed. See [LICENSE.md](LICENSE.md) and [legal/THIRD-PARTY-NOTICES.md](legal/THIRD-PARTY-NOTICES.md).
