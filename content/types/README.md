# Types and Type Abilities

`candidate-pack.json` is the beta.3 review source extracted from the official 2026 Cypher Reference Document. It contains exactly 49 Type Items, 106 unique Type Ability Items, and 155 direct Type-to-Ability assignments.

`reviewed-pack.json` is the canonical production source promoted from the human-reviewed private Working packs. The public `types` and `type-abilities` Compendiums are built deterministically from that reviewed snapshot. The candidate remains the immutable input used to verify that private review introduced no unintended drift.

## Guarantees

- Foundry Item documents use deterministic 16-character IDs and stable slugs.
- Type grants target `Compendium.cypherv2.type-abilities.Item.<id>` identities.
- All direct Type Ability assignments are Tier 1.
- No World, Working, test, or dangling Compendium references are allowed.
- Origin Superhero Ability choices are intentionally absent; those belong to the future Genre Ability content phase.
- Unusual effects stay descriptive unless the current Ability runtime maps them safely.
- Same-name CRD wording differences are recorded in assignment-level `notes` and in the root review record.

## Commands

Validate the checked-in candidate source:

```text
pnpm validate:type-candidates
```

Regenerate it from the local reference document (developer-only; requires Python and `python-docx`):

```text
python scripts/generate-type-candidates.py
```

Generation never writes `packs/` or changes `system.json`. Promotion remains a separate manual review step.

Validate and rebuild the promoted public packs:

```text
pnpm validate:types
pnpm import:types
```
