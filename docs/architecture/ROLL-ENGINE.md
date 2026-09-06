# Roll Engine V1

The Roll Engine is split into four layers:

1. `RollContext` is an immutable description of the Actor, Pool, difficulty
   mode, step contributions, task/damage Effort, Edge, origin/target metadata,
   and active policy limits.
2. `prepareRoll` is pure domain logic. It validates limits, calculates Ease and
   Hindrance steps, derives the final difficulty and Target Number when one
   exists, and calculates the Pool cost.
3. `resolveRoll` consumes only a prepared roll and a natural d20 result. It does
   not add numeric modifiers to that result.
4. `RollService` builds Character context, injects derived Wound Hindrance,
   applies active Rule Registry enrichers, verifies and debits the Pool, then
   invokes the d20 roller. `RollChatService` is a separate Foundry adapter.

## Difficulty modes

- `known`: calculates and publicly reports SUCCESS or FAILURE, evaluated
  difficulty, Target Number, and `BEATS DIFFICULTY X`.
- `unknown`: does not calculate an outcome. It reports only the player-facing
  `BEATS DIFFICULTY X` performance after applying net steps.
- `hidden`: publicly reports SUCCESS or FAILURE and `BEATS DIFFICULTY X`, but
  its public content and flags never contain the original difficulty, evaluated
  difficulty, Target Number, or NPC Level.
- A known or hidden final difficulty of 0 produces the explicit
  `automaticSuccess` result. It has no natural d20, natural effect, or
  `BEATS DIFFICULTY` value. Hidden Automatic Success still reveals none of the
  original target values.

The public ChatMessage has no secret flags. Hidden difficulty remains interface
confidentiality rather than protection against a hostile client.

Hidden audit data remains available to the internal
`cypherv2HiddenRollAudit` hook. The optional world setting `Show GM Roll Audit`
creates a separate blind GM ChatMessage when enabled; it is disabled by
default. Secret data is deliberately not attached to the shared main-message
flags, since those flags are part of the public message payload.

Success-dependent Combat actions can appear on the main card. Their flags
contain only the controlled action data and never NPC Level or resolved
difficulty.

`RollService.executeBatch` supports one action against several targets. It
charges the shared Pool cost once, resolves final-difficulty-0 targets without
rolling, and evaluates one shared natural d20 only for the remaining target
contexts.

## Rule Module extension

`RuleRegistry.registerDifficultyPolicy` can replace the difficulty ceiling or
Asset limit for an active module. `registerRollContextEnricher` can return an
enriched context before pure preparation. This allows future Skills, targets,
Power Shifts, and setting-specific modules to contribute without changing the
Core engine.

Natural results 1, 17, 18, 19, and 20 are represented as markers and separate
effects. A natural 1 requests a Free GM Intrusion; successful attack results
17/18 add damage, while 19/20 expose the damage-versus-effect choice. Natural
20 also refunds the action Pool cost.
