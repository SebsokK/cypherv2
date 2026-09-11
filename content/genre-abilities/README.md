# Genre Ability content

`candidate-pack.json` is the deterministic beta.3 editorial source extracted from the official 2026 Cypher Reference Document. It contains exactly 69 independent Ability Items: 43 Genre progression abilities and 26 Superhero Origin abilities. The progression set includes the 41 Fantasy/Science Fiction documents plus the two intentional Real World Skill-choice documents.

`reviewed-pack.json` is the human-reviewed canonical production source. It builds the public system pack `Genre Abilities`; the private World pack `Genre Abilities (Working)` remains review-only.

## Representation policy

- Shared Fantasy/Science Fiction entries are one Ability document referenced by both Genre catalogs.
- The Real World Tier 3 and Tier 6 Additional Skill documents preserve their existing Working IDs and are referenced by the Real World Genre catalog.
- Same-name Type/Focus abilities are audited but not reused; the Genre documents retain their distinct acquisition context and CRD provenance.
- Ordinary relations use `catalog: progression`; Superhero Origin relations use `catalog: origin` and Genre-wide eligibility without a Type whitelist.
- Armored Body records minimum Superhero Rank 2. Incredible Instinct and Skill Exemplar remain Tier 1 Origin choices whose Tier 3 improvement stays in their rich description.
- Generic cost, activation, roll, damage, range, and duration fields are populated only where they map cleanly. Conditional and unusual effects remain descriptive, with no speculative `ruleElements`.

## Commands

Regenerate from the local official reference document:

```text
python scripts/generate-genre-ability-candidates.py
```

Validate the checked-in candidate:

```text
pnpm validate:genre-ability-candidates
```

Import into the private Foundry World review pack:

```text
node scripts/import-genre-ability-review.mjs --world <cypher-v2-test directory>
```

Validate the compiled Working pack and lossless round trip:

```text
node scripts/validate-genre-ability-review.mjs --world <cypher-v2-test directory>
```

Build and validate the reviewed public packs:

```text
pnpm import:genres
pnpm validate:genres
```
