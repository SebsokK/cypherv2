# Genre content

`candidate-pack.json` is the deterministic beta.3 review source extracted from the official 2026 Cypher Reference Document. It contains the four chapter-level Genre Items: The Real World, Fantasy, Science Fiction, and Superheroes.

`reviewed-pack.json` is the human-reviewed canonical production source. It builds the public system pack `Genres`; the private World pack `Genres (Working)` remains review-only.

## Representation policy

- The existing `genre` Item type remains authoritative.
- Subgenres, character creation, Skills, Species, Foci, equipment, Cypher, treatment, currency, Power Shift, and optional-rule guidance remain faithful rich text.
- Fantasy and Science Fiction use their existing mid-tier (Tier 3) and high-tier (Tier 6) Genre Ability relations.
- Superheroes reuses the unique union of both progression catalogs and adds the 26-entry Origin catalog. No Ability Item is duplicated.
- `Armored Body` preserves its minimum Superhero Rank 2 relation.
- The Superhero catalog is Genre-eligible and has no Type-name whitelist.
- The Real World Tier 3/Tier 6 Skill choices are represented by their two intentional progression Ability documents and remain explained in the Genre rich text.
- No speculative `ruleElements` or Genre-specific rules engine is introduced.

## Commands

Regenerate from the local official reference document and validated Genre Ability candidate:

```text
python scripts/generate-genre-candidates.py
```

Validate the checked-in candidate:

```text
pnpm validate:genre-candidates
```

Import into the private Foundry World review pack:

```text
node scripts/import-genre-review.mjs --world <cypher-v2-test directory>
```

Validate the compiled Working pack and normalized exact round trip:

```text
node scripts/validate-genre-review.mjs --world <cypher-v2-test directory>
```

Build and validate the reviewed public packs:

```text
pnpm import:genres
pnpm validate:genres
```
