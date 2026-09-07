# Focus content import architecture

## Purpose

The build compiles one reviewed, lossless Foundry document snapshot into the two Foundry v14 Item compendiums `focus-abilities` and `foci`. The snapshot is the promoted result of the completed in-Foundry review, including manual graph layout and connections.

## Existing runtime contracts reused

- Generated Ability Items use the existing `AbilityDataModel`. Supported activation, Pool cost, roll, modifier, damage, wound, range and targeting fields are mapped directly.
- Generated Focus Items use the existing `FocusDataModel` graph: stable node ID, Ability compendium UUID, snapshot, Tier, logical position and directed connections.
- The runtime `FocusEvaluator` remains authoritative for availability. The importer does not reproduce progression rules.
- `FocusAcquisitionService` continues to resolve a node's Ability UUID, fall back to its snapshot, and store `sourceFocusUuid` plus `sourceNodeId` on the acquired embedded Ability.

## Canonical source and identity

`content/foci/reviewed-pack.json` is the canonical production source. It stores the reviewed Focus and Ability Item documents losslessly, excluding only volatile World/user metadata. `pnpm import:foci` reads this file directly, validates it, and does not regenerate production packs from the older pre-review `content/foci/catalog.json`.

Existing 16-character Foundry document IDs are preserved. A canonical Ability always has the UUID:

```text
Compendium.cypherv2.focus-abilities.Item.<stable-document-id>
```

Node IDs, not array positions, remain the progression identity. Manual node positions and connection IDs are retained exactly. All promoted Focus links are rewritten by target document ID to the system namespace; names are never used as the identity map.

## Deduplication

The reviewed snapshot rejects duplicate IDs and duplicate slugs. Same-name documents are not merged during promotion: distinct reviewed IDs and rules text remain distinct, while several Focus nodes may reference the same canonical Ability ID. The older structured catalog importer retains its stricter pre-review deduplication report for source auditing, but it is not allowed to overwrite the reviewed production snapshot.

## Reviewed graph preservation

The production importer does not infer or regenerate graph edges. It preserves every reviewed `system.graph.nodes` and `system.graph.connections` entry. Before pack replacement it rejects duplicate document IDs/slugs, dangling Ability UUIDs, duplicate/dangling connections, self-connections, and any World/test compendium UUID.

## Unsupported and special rules

Full rules text remains authoritative. Existing structured runtime fields, source snapshots and relevant flags are preserved exactly. Promotion does not infer new automation or reconstruct unsupported rules from prose.

## Build flow

1. Review edits in disposable World compendiums, never directly in the system packs.
2. Close Foundry and unpack both reviewed World packs with the Foundry v14 CLI.
3. Run `pnpm promote:foci -- --foci <unpacked-foci> --abilities <unpacked-abilities>`.
4. Review the resulting `content/foci/reviewed-pack.json` diff. The promotion normalizes World Ability UUIDs to `Compendium.cypherv2.focus-abilities.Item.<same-id>` and strips volatile World/user timestamps.
5. Run `pnpm import:foci`. Both packs are compiled in staging first; existing system packs are held as rollback backups until both replacements succeed.
6. Test the compiled LevelDB packs under `packs/focus-abilities` and `packs/foci` in Foundry.

`pnpm build` runs the importer after the Vite build. Release validation requires both generated pack directories. The release whitelist includes `packs/` but excludes `content/`, `scripts/`, `.generated/`, `.reports/`, tests and source reference material.

The original working World compendiums are never modified or deleted by either command.
