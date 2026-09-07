# Reviewed core compendiums

The distributable `Descriptors`, `Skills`, and `Weapons & Armors` packs are rebuilt from `content/core-items/reviewed-packs.json`. That JSON is a lossless normalized export of the reviewed World compendiums, not a seed catalog.

## Public pack IDs

- `descriptors` → `packs/descriptors`
- `skills` → `packs/skills`
- `weapons-and-armors` → `packs/weapons-and-armors`

The combined equipment pack is retained because the reviewed source uses one Item pack with stable `Weapons` and `Armors & Shields` Folder documents. All original Item and Folder IDs are preserved.

## Reference policy

Promotion resolves references by exact Foundry document ID, never by display name. A reviewed local Skill reference such as `Item.<id>` becomes `Compendium.cypherv2.skills.Item.<id>` in both structured fields and enriched HTML. Validation rejects remaining `cypher-v2-test`, `Compendium.world`, Working-pack, dangling promoted-system, or known bare local Item references.

Blank reviewed slugs remain blank. Non-blank slugs, when present, must be unique within their pack. World ownership and volatile `_stats` timestamps/source markers are normalized; reviewed names, descriptions, mechanics, flags, tags, provenance, snapshots, folders, sort values, and IDs are preserved.

## Workflow

`pnpm import:core-packs` validates the canonical snapshot, writes isolated JSON inputs, compiles all three packs into staging, and swaps them into `packs/` as one rollback-protected operation. `pnpm build` invokes this import, so a production build cannot silently restore older seed data. Generated LevelDB directories are ignored by Git but required by release packaging.

To refresh the canonical snapshot after a separately reviewed World export, first copy and unpack the World packs to an isolated directory while Foundry is closed or without copying `LOCK`, then run:

```bash
pnpm promote:core-packs -- --descriptors <unpacked-dir> --skills <unpacked-dir> --weapons-and-armors <unpacked-dir>
```

The promotion command never reads or writes a live World pack unless explicitly given such a path; use an isolated unpacked export.
