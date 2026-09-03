# Existing Area waypoint transform audit v1

Date: 2026-08-12  
Status: verified implementation authority for the bounded persistence slice below  
Scope: change only the position and yaw of an existing waypoint while
preserving every other GIT field and the paired GIC entry

## Decision

Aurora Web may materialize an existing `WaypointList` entry transform by its
immutable source ordinal. The admitted mutation replaces exactly these five
native GIT float fields:

- `XPosition`;
- `YPosition`;
- `ZPosition`;
- `XOrientation`;
- `YOrientation`.

No waypoint construction, identity, appearance, transition, map-note, comment,
script, or other property mutation is admitted by this audit. Entries with an
explicit `Bearing` field, a missing required field, a duplicate required field,
or a required field with a non-float type fail closed.

## Immutable evidence

The primary decompilation source is
`C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
`36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.

The waypoint instance lineage and exact transform fields are explicit in that
source:

- `TNWWaypointInstance::BuildModel` diagnostics occur in the same instance
  implementation cluster at lines 343423 and 347533;
- `FUN_00659970` at lines 347595-347699 reads `XPosition`, `YPosition`,
  `ZPosition`, `XOrientation`, and `YOrientation` into the waypoint instance;
- `FUN_00659bfc` at lines 347723-347756 writes the same five fields;
- the orientation write at lines 347738-347752 uses the same matrix-to-vector
  path as the verified creature writer `FUN_0053ae80` at lines 197558-197596.

The accepted live Toolset placement proof is retained under
`backend/docs/aurora-reverse/evidence/palette-placement-corrected-live-2026-07-14/`:

- `README.md`, SHA-256
  `4a98aac6351f09fa27afff43cba26e6afa9cf0b29eb4c93e21b2b846ed1d5e45`;
- `summary.json`, SHA-256
  `2eb400ab5437e88859c37354046da2a54277757e27e49c9f06e155f1eca02248`;
- `validator-result.json`, SHA-256
  `149aeaea0080a1b352dd166ea92fd8cf1eb2aa59555373f129f0a953ed64d895`.

That run placed and saved `nw_waypoint001`, changed the waypoint count from
zero to one without changing other family counts, and independently read back
its native position `(33.1162, 47.7472, 3.5019)`.

A read-only extraction on 2026-08-12 inspected packed module
`codex_npc_item_live_20260713.mod`, SHA-256
`2dc1f12cc27d74853e4697d7c35673fcf6e2db168f2b07b793e394556ba56ec2`.
Its exact `demo.git` SHA-256 was
`a17dda86ad6fb173c54c5857ded055789d3f99773279a41173716f32bf390613`.
The single native `WaypointList` entry had struct type ID `5` and exactly one
float field for each admitted transform label. Its orientation vector was
`(0, 1)`, which the existing parser maps to normalized bearing `270` degrees.

The live artifact establishes native creation and persistence, while the
decompiled read/write pair establishes the bounded existing-instance transform
semantics. Neither source is used to infer unsupported waypoint properties.

## Frozen transform mapping

For scene tile-space values `(x, y, z, bearing)` where bearing is radians, the
writer stores:

```text
XPosition    = float32(x * 10)
YPosition    = float32(y * 10)
ZPosition    = float32(z * 10)
XOrientation = float32(cos(bearing))
YOrientation = float32(-sin(bearing))
```

This is the inverse of the existing parser mapping
`bearing = atan2(-YOrientation, XOrientation)` followed by degree
normalization, and of the frontend scene mapper's degree-to-radian conversion.

## Preservation and transaction boundary

The writer must resolve the waypoint by `kind=waypoint` plus immutable source
ordinal, reject duplicate transforms and transform/deletion collisions, retain
list order and struct type ID, and preserve every non-transform GIT field. GIC
must remain byte-exact for transform-only publication. A combined deletion is
applied against source ordinals before both paired lists are filtered.

Independent candidate readback verifies all five exact float32 fields, the
nine-family cardinalities, hashes, and mutation counts. Publication remains in
the existing atomic ARE/GIT/GIC/IFO Area Update transaction.

## Exit criteria

Unit, round-trip, determinism, compiler, atomic-publication, persisted-readback,
and regression tests are required. Mutation testing is optional and requires
an explicit user request. Product-level completion still
requires fresh Toolset Save/Build/reopen and NWN proof for the exact committed
candidate.
