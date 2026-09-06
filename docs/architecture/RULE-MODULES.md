# Rule module registry contract

Phase 1 provides registration, lookup, deterministic ordering, and enabled-state resolution. Contribution pipelines are deliberately deferred.

## Stable principles

- Every module has a globally unique ID.
- The Core module is always active.
- Duplicate registration is an error.
- Ordering is priority first, then module ID.
- Optional enabled IDs are stored in a world setting.
- A module may declare dependencies and conflicts.
- The registry exposes diagnostics rather than mutating Actor source data.

## Planned extension points

The public module definition reserves these contribution categories:

- Actor derived data;
- roll modifiers;
- sheet sections;
- chat actions;
- recovery rules;
- rest rules;
- wound rules;
- Pool rules;
- Rally rules;
- duration triggers;
- difficulty policies;
- Item behaviors;
- Focus graph behavior.

The API must not encode assumptions that prevent Recursions, Translation, Tags, or recursion-specific Focus progression.

The Core derived-data reducer already accepts typed contribution collections
for Pool maxima, Edge, Wound capacity, and hindrance. Phase 1 does not yet ask the
registry to execute module contributions; those parameters establish the service
boundary without coupling Core calculations to future modules.

## Recovery workflow hooks

The Recovery workflow reserves these Foundry hooks for future ongoing effects,
duration expiry, and refresh contributions:

- `cypherv2.preRecoveryWorkflow`;
- `cypherv2.processRecoveryDurations`;
- `cypherv2.recoveryCompleted`;
- `cypherv2.restCompleted` for Normal Recoveries with Rest benefits;
- `cypherv2.nonRestRecoveryCompleted`;
- `cypherv2.recoveryRefresh`.

Hook context includes the `normal`/`nonRest` kind, Recovery duration, calculated
result, optional Rest preparation, and the matching duration trigger list.
