# Canonical Cypher catalog

`catalog.json` is the reviewable source for the system-level `Cyphers` Item pack and `Cypher Tables` RollTable pack.

Generate both packs with:

```bash
pnpm import:cyphers
```

The importer validates source IDs, source ordering, manifestations, power classifications, d00 coverage, references, deterministic document IDs, and LevelDB keys before replacing only:

- `packs/cyphers/`
- `packs/cypher-tables/`

It refuses every other destination. It does not read or write World compendiums and does not touch the Focus packs.

Cypher rules remain descriptive. Catalog-only source distinctions such as the nonstandard marker and Power Boost classification are retained in tags and `flags.cypherv2.cypherImport` without extending the runtime DataModel.

The supplied chapter excerpt does not contain its publication license notice. Resolve the `source-license` review issue before publicly redistributing the generated text.
