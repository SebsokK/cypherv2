# Species candidates

`candidate-pack.json` is the deterministic beta.3 review source extracted from the official 2026 Cypher Reference Document. It contains exactly 20 unique Species Items: eight Fantasy entries and thirteen Science Fiction entries with Human shared between both inventories.

This directory is not a public Compendium. Human review happens in the private `Species (Working)` World pack before any later promotion decision.

## Representation policy

- Generic Species fields carry only exact Pool, Wound, Edge, familiarity, Skill, Ability, Descriptor, and choice data supported by the current package model.
- Human uses a catalog-backed `descriptorChoiceGroups` rule resolved from the public `cypherv2.descriptors` pack and World Descriptor Items when attached; Descriptor UUIDs and snapshots are not frozen into Human.
- Contextual Skill restrictions use grant/option `notes` while the canonical public Skill Item remains shared.
- Mutant's adapted Focus Ability, Dwarf recovery, D’nec recovery, natural-1 exceptions, conditional damage/resistance, movement, telepathy, Assets, and turn denial remain faithful rich text.
- No speculative `ruleElements`, Species-specific services, or Species Ability Compendium are introduced.

## Commands

Regenerate from the local official reference document:

```text
python scripts/generate-species-candidates.py
```

Validate the checked-in candidate:

```text
pnpm validate:species-candidates
```

Import into the private Foundry World review pack:

```text
node scripts/import-species-review.mjs --world <cypher-v2-test directory>
```

Validate the compiled Working pack and lossless round trip:

```text
node scripts/validate-species-review.mjs --world <cypher-v2-test directory>
```
