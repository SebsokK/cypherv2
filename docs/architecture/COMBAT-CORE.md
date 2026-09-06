# Combat Core V1

Combat uses the existing Roll Engine. Sheets and Chat cards only collect intent
or expose controlled actions; they do not calculate rules.

## Character to NPC

1. A Weapon Item supplies its category, attack type, range, custom attack-step
   modifier, category damage bonus, and optional shared Depletion rule.
2. `CombatService` contributes light-weapon ease, unfamiliar-weapon hindrance,
   a selected Skill rank, Assets, Effort, Wound hindrance, and applicable Rule
   Module contributions.
3. `TargetResolver` reads native Foundry targets. An NPC Level or the most
   specific matching structured modification becomes a hidden difficulty.
4. One action uses one Pool cost and at most one d20. Targets whose final
   difficulty is 0 resolve as Automatic Success without a d20; all remaining
   targets share one natural result and receive separate resolutions.
5. On success, the Chat card offers an authorized `Apply Damage` action. NPC
   Armor is subtracted when the action updates NPC Health. The action retains
   `tokenUuid`/`tokenId`, so an unlinked Token's synthetic Actor is updated
   instead of its world Actor source.

## NPC to Character

1. The GM targets one or more Character tokens and requests a defense from the
   NPC Sheet. The NPC does not roll.
2. A Chat request exposes only the source, target, Wound severity, and allowed
   defenses. It does not contain the NPC Level.
3. An owner chooses Block (Might) or Dodge (Speed), then uses the normal Roll
   Engine with Skills, Assets, Effort, Armor, Wounds, and Rule contributions.
4. A successful Dodge prevents the Wound. A successful Block reduces its
   severity by one step. Otherwise the original severity remains.
5. If a Wound remains, an authorized `Apply Wound` action delegates to
   `WoundService`.

## Core rules and extension points

- Light, medium, and heavy weapons deal 2, 4, and 6 damage respectively.
- A Weapon bonus is added to category damage. Damage Effort (+3 per level) and
  any chosen natural-result damage are then added. NPC Armor is applied only
  when `Apply Damage` updates Health.
- A Weapon attack modifier from -2 to +2 is represented as a normal Rule
  contribution: positive values Ease and negative values Hinder.
- Light weapon attacks are eased one step. A weapon that cannot be freely used
  hinders its attack one step. Extreme-range attacks are hindered one step.
- Light, medium, and heavy armor ease Block and hinder Dodge by 1, 2, and 3
  steps. Armor that cannot be freely used also hinders other Speed tasks by the
  same amount.
- Successful Block reduces Wound severity one step; successful Dodge prevents
  the Wound.
- The strongest equipped armor is the active armor; armor categories do not
  stack.
- `combatRules`, `targetRules`, and `damageRules` are declared Rule Registry
  extension points. Core category tables live in `CORE_COMBAT_POLICY`.

## Token identity and feedback

Native targets are wrapped with Actor and Token identities. Chat actions resolve
`tokenUuid` first, then current-scene `tokenId`, and use `actorId` only as a
legacy/fallback path. Two unlinked Tokens created from the same NPC Actor can
therefore maintain independent Health and Dead derived states.

After an update, `TokenCombatFeedbackService` uses Foundry's native scrolling
text API. It displays actual damage after Armor, optional DEAD feedback at zero
Health, or the Wound severity actually applied. Feedback is visual only.

NPC Health is also synchronized with Foundry's configured defeated status via
`Actor#toggleStatusEffect(CONFIG.specialStatusEffects.DEFEATED, {active})`.
Token UUID resolution ensures the Active Effect belongs to the exact synthetic
Actor. Health updates above zero remove that native status again.

## Depletion

`DepletionService` consumes the shared `DepletionRule` contract (`enabled`,
die, threshold) independently from Weapon logic. V1 Weapon rules expose 1 in
1d6, 1d10, or 1d20 and only report DEPLETED / NOT DEPLETED in Chat. They never
delete the Item or choose a narrative consequence. Future Artifacts can reuse
the same schema helper and service rather than defining another roll engine.
