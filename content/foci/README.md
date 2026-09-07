# Focus content sources

`reviewed-pack.json` is the canonical production source for the generated Focus and Focus Ability compendiums. It is a lossless, deterministic snapshot of the Item documents approved through the in-Foundry review workflow, including manual Focus graph positions and connections.

`catalog.json` and `schema.json` retain the earlier structured pre-review import data and its validation tooling. They are useful for provenance/audit and unit coverage, but `pnpm import:foci` deliberately does not regenerate the approved production packs from them.

## Production guarantees

- Existing Focus, Ability, node and connection IDs are preserved.
- Focus nodes reference `Compendium.cypherv2.focus-abilities.Item.<id>` and are validated against the promoted Ability set.
- Descriptions, snapshots, automation fields, flags, provenance, manual positions and graph connections are copied without reconstruction.
- Volatile World timestamps and World-user ownership entries are normalized for distribution; default ownership is retained.
- Duplicate IDs/slugs, invalid/dangling graph connections and World/test UUIDs fail the build before installed packs are replaced.

## Workflow

After reviewing copies in a World, close Foundry and unpack both World packs with the Foundry CLI. Promote those unpacked directories with:

```bash
pnpm promote:foci -- --foci <unpacked-foci> --abilities <unpacked-focus-abilities>
```

Review the `reviewed-pack.json` diff, then run `pnpm import:foci`. The build compiles both packs in staging and keeps rollback copies of the installed system packs until both replacements succeed. It never writes to or deletes the World review packs.

Generated LevelDB files are not hand-edited. The release archive includes the compiled `packs/foci` and `packs/focus-abilities`, not `content/` or the import tooling.
