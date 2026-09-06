# Focus Tree Engine — Phases 1–2 and Editor V1

## Persisted authority

A Focus Item owns one versioned `system.graph`:

- `version` identifies the graph contract;
- `nodes[]` stores stable IDs, an optional Ability UUID, a minimal name/description
  snapshot, required Tier, and presentation coordinates;
- `connections[]` stores explicit directed edges (`id`, `from`, `to`).

The node ID is progression authority and does not depend on an Ability name or
UUID. `position.x` and `position.y` never participate in evaluation. A missing
coordinate is valid and the renderer supplies a deterministic layout. A
bidirectional relationship is two directed connections.

A Character only persists independent progression entries:

```text
focusProgress[]
  focusUuid
  ownedNodeIds[]
  acquisitions[]
```

`acquisitions[]` is reversible provenance attached only to currently owned
nodes. It records whether a Pending Focus Choice was consumed and retains the
choice's ID, source, grant Tier, and Focus scope. It is not a campaign history
and its record is removed when the acquisition is undone.

Legacy flattened Focus data and `focusItemId` progression entries are migrated
to these contracts by their DataModels.

## Pure evaluation

`FocusEvaluator` receives a graph, Character Tier, and owned node IDs. It never
reads Foundry documents or coordinates and never writes progression.

- `owned`: its stable ID is in `ownedNodeIds`.
- `available`: every unowned Tier 1 node, or an accessible Tier 2+ node with a
  direct incoming connection from a structurally valid owned node.
- `future`: the same direct incoming condition is met, but its required Tier is
  above the Character Tier.
- `locked`: it is unowned and has no direct incoming connection from an owned
  node.

Each result also provides `reason`, `requiredTier`, and sorted
`reachableFrom[]`. Tier 1 is deliberately special: all Tier 1 Abilities remain
available regardless of incoming graph links, both during creation and for
later Focus Choices. Tier 1 links remain visible but only Tier 2+ access is
gated by connections. Owned Tier 2+ nodes whose owned path is broken are kept
owned and reported as invalid-progression warnings.

Duplicate IDs, duplicate directed edges, dangling edges, self-links, invalid
Tiers, and invalid coordinates are errors. Explicit reciprocal links are valid
because the data contract requires them for bidirectional movement. Other
directed cycles are reported as warnings; Phase 1 direct-neighbour evaluation
remains finite and deterministic.

## Rendering boundary

`FocusTreeRenderer` converts an evaluation into a presentation view: Tier
bands, responsive horizontal slots, nodes, and directed connection references.
It may resolve Ability UUIDs to display current names, but falls back to the
node snapshot when the source is missing. Compact Tier rows use a CSS Grid with
132 × 64 px nodes, deterministic `position.x` ordering, and horizontal overflow
instead of overlap when a row cannot fit. Ability names wrap to two lines. The
Handlebars partial contains no graph or progression rules.

Final SVG coordinates are deliberately not prepared from graph coordinates.
After Application V2 renders, `FocusTreeConnectionController` measures the
actual node and canvas rectangles, sizes the SVG to that exact canvas, and
intersects each center-to-center segment with the current node borders. A
scoped `ResizeObserver` schedules the same measurement whenever the tree,
scroll container, canvas, or a node changes size. It is disconnected on rerender
and sheet close. `position.x` controls deterministic horizontal ordering, while
CSS Grid distributes the resulting nodes across the current canvas width.

Every node retains a read-only inspection action. A resolved Ability opens its Item
Sheet; otherwise a dialog displays the stored snapshot. The native compact
tooltip includes the current name, Tier, and a normalized description excerpt.

The same renderer is used by the Focus Item Sheet (normal read-only graph view) and
the Character Sheet (progression view). Editable Character progression exposes
minimal contextual Acquire, Undo Acquisition, and Restore Ability actions. A
separate GM-only Edit Progression mode exposes manual Mark Owned and Remove
Owned controls without consuming choices.

The stable graph/view boundary lets editor commands replace graph source data
and rerender without replacing the evaluator or the HTML/SVG view contract.

## Editor transaction

The GM-only Focus Item editor owns a `FocusTreeEditorSession` in the current
Application V2 sheet instance. Entering Edit Tree clones the persisted graph
into detached plain data. Add, move, Tier, snapshot, node, and connection
commands mutate only this working copy. Cancel discards it; Save validates it
and performs one atomic `system.graph` document update.

Item drops use the native Foundry v14 `ItemSheetV2._onDropDocument` boundary,
after Foundry has resolved world or Compendium drag data to its source Item.
Only Ability Items are accepted. A node stores the source UUID and an explicit
name/description snapshot; neither the source Ability nor any Character is
modified. Horizontal commands change only logical `position.x` ordering, and
Tier changes preserve stable node identity and every explicit connection.

Connection authoring selects a source and then a destination. Each direction
has its own stable connection ID; reciprocal navigation therefore remains two
edges. Self-links, duplicates, and missing endpoints are rejected. Deleting a
node removes only its incident graph edges. Existing Character progression may
then contain legacy/orphan node IDs: evaluation reports a warning without
crashing or rewriting that progression.

Editor rerenders continue through the shared renderer and scoped SVG
measurement controller, so every working-copy command and container resize
recomputes arrows from current DOM rectangles. Auto-layout and graphical
dragging are intentionally deferred.

## Acquisition lifecycle

`focusProgress[].ownedNodeIds` is the sole progression authority. Embedded
Ability presence is never used to infer ownership and deleting an Ability never
edits progression. The evaluator checks ownership before Tier, so a later Tier
reduction also cannot revoke an owned node.

`FocusAcquisitionService` re-evaluates current eligibility from the Focus graph
and Character source data for every request. All acquisition/restoration work
for one Character is serialized. Before creating an Item it rechecks both
ownership and the exact provenance pair `sourceFocusUuid + sourceNodeId`. The
same pair also produces a stable 16-character embedded Item ID created with
Foundry's `keepId` operation, adding document-level uniqueness across clients.
Different Foci may therefore use the same source Ability without collision or
progression crossover.

Acquisition creates an embedded Ability from the linked source Item, falling
back to the minimal node snapshot, then appends the node only to its matching
Focus progression. A partial prior creation is reused rather than duplicated.
When a choice is consumed, its complete reversible provenance is stored beside
the owned node.

For an owned node, the Character Sheet compares that exact provenance pair
against current embedded Abilities. A missing pair exposes Restore Ability.
Restoration recreates the Item from the source or snapshot without updating XP
or `focusProgress`. Missing Ability or Focus source documents never trigger
automatic cleanup; existing embedded Abilities and owned node IDs remain
untouched. Undo Acquisition explicitly removes one owned node and restores its
recorded Pending Focus Choice. It optionally deletes only the embedded Ability
matching the exact Focus/node provenance pair. A player cannot undo a node if
that would invalidate owned descendants. A GM may Force Undo, but descendants
are preserved and the evaluator reports the resulting invalid progression.
This corrective operation is intentionally narrower than a full respec system.

## Development fixture

[`fixtures/abides-in-stone-focus.json`](../../fixtures/abides-in-stone-focus.json)
is an importable development Item with snapshot-only nodes. It contains no
Ability rules text or compendium content.
