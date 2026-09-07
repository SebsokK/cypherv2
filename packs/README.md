# Compendium packs

`descriptors/`, `skills/`, and `weapons-and-armors/` are generated Foundry v14 LevelDB packs. Their canonical source is the lossless reviewed snapshot in `content/core-items/reviewed-packs.json`, promoted from the authoritative `cypher-v2-test` World packs. Rebuild all three atomically with:

```bash
pnpm import:core-packs
```

The import validates document and LevelDB-key uniqueness, pack-specific Item types, folder references, non-blank slug uniqueness, and all promoted system UUIDs before replacing any destination. The combined equipment pack intentionally preserves the reviewed `Weapons` and `Armors & Shields` folders. The one-time maintenance command `pnpm promote:core-packs -- ...` accepts unpacked review exports; it must never target a live World LevelDB directory.

`focus-abilities/` and `foci/` are generated Foundry v14 LevelDB packs. They are compiled from the canonical lossless reviewed snapshot in `content/foci/reviewed-pack.json` by:

```bash
pnpm import:foci
```

Do not edit generated pack files directly. The import validates stable IDs/slugs, system compendium UUIDs and graph structure before replacing either pack. It compiles both packs in staging and retains rollback copies until installation succeeds. Development builds regenerate both packs, and the release archive includes these runtime directories while excluding source content and tooling.

`cyphers/` and `cypher-tables/` are generated independently from `content/cyphers/catalog.json` by:

```bash
pnpm import:cyphers
```

The Cypher importer validates the catalog, deterministic IDs, UUID references, and complete non-overlapping d00 ranges before replacing only those two system packs. It cannot target the Focus packs or any World compendium.

Compendium content must comply with the current Cypher Open License and record provenance in `legal/CONTENT-SOURCES.md`. Source PDFs and scans must never be committed.
