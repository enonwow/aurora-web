# Tile add/connect matrix agent contract v1

Status: active development-only proof contract.

Contract revision: `path-node-aware-v8` (`path-node-aware-v2` is the historical
plan-binding baseline described below).

## Objective

Produce a resumable matrix for every parsed `Tile_ID` in every configured
tileset.  Each row must make the tile visible in an Aurora Web add fixture and,
where source metadata permits, place it immediately beside a declared-compatible
partner.  Chunk proof frames and a gallery index make the coverage inspectable
without requiring one browser process or one PNG per tile.

## Scope and evidence boundary

This contract proves Aurora Web editor behavior: the requested tile was added,
its model contract settled, and its placement beside a source-descriptor
partner was rendered in the same fresh runtime frame.  It does not claim that
the descriptor comparison is the native Aurora Toolset's automatic transition
or first-match policy.  Those semantics remain Aurora-first gaps.

The v1 compatible-pair predicate is structural and deterministic:

- source tile: its unrotated `right` descriptor;
- partner tile: its unrotated `left` descriptor;
- descriptor: `top terrain token | bottom terrain token | crosser token`;
- both descriptors must have at least one declared token and compare exactly.

No inferred transition, rotation search, terrain propagation, or fallback
partner is allowed.  A missing descriptor or matching partner is a named
matrix blocker, not a passing connection.

The partner may have the same `Tile_ID` as the source.  Two independent Area
cells may use the same palette definition, and the predicate compares their
opposing source descriptors rather than treating repeated use as a special
semantic case.

## Matrix row contract

`aurora-tile-add-connect-matrix-row/v1` contains:

- tileset provenance: resref, source key, ETag, definition fingerprint;
- source tile: `Tile_ID`, model resref, declared right descriptor;
- partner tile and declared left descriptor, or a blocker code;
- chunk id and two-cell fixture coordinates;
- lifecycle state: `planned | captured | blocked`;
- add and connect result; model/material/readiness counts; capture paths and
  frame hash when captured.

Rows without a model use `TILE_MODEL_UNDECLARED`; a non-empty descriptor with
no exact partner uses `NO_DECLARED_RIGHT_LEFT_PARTNER`; an empty descriptor
uses `NO_DECLARED_RIGHT_DESCRIPTOR`.

## Multi-cell SET group lane

A `Tile_ID` that belongs to a declared multi-cell SET group is deliberately
not exposed as an individual replacement fixture.  The ordinary editor locks
that action, and the matrix must preserve that safety rule.  Instead, the
planner selects a complete source-declared group fixture and maps every
non-null `TileN` member to its own matrix row.

The additive group fixture contract contains the group id, rectangular
`rows`/`columns` layout, anchor, ordered member indexes, expected cells, and
the member orientation declared by the source definition.  A group proof is
accepted only when one visible development-only inspector command creates all
of those members as one group instance, readback reports the exact cells and
orientations, and the strict renderer freshness/readiness gates pass.

Each newly planned group chunk also carries a deterministic `backgroundTileId`.
Before the group command, the development-only runner fills every local Area
cell with that declared-model tile as a diagnostic underlay, then applies the
complete group fixture batch.  The underlay is not a matrix row or an
individual-group-member proof; it removes random new-Area background models
from the readiness gate.  Acceptance still reads back only the final declared
group members, orientations, anchors, and group-instance ownership.

The group layout demonstrates Aurora Web's complete group add/join workflow:
its members occupy the exact source-declared neighboring cells and are owned
by one editor group instance.  It does **not** claim retail Aurora master-cell
selection, automatic neighborhood reconciliation, or transition precedence.
Those remain `RETAIL_CONFIRM`/Aurora-first gaps.

An eligible group must have a valid non-empty id, a `rows * columns` TileN
layout that fits the 32x32 local Area bound, at least two non-null members, and
a declared model for every member.  A malformed layout, an undeclared member
model, or a group that cannot fit is a named blocker with a resume condition;
it is never silently converted into individual tile placement.

## Chunk and proof policy

The matrix uses two additive chunk kinds in local draft Areas: adjacent
horizontal loose-tile pairs, and packed complete SET-group fixtures.  Loose
chunks use a safe default of 16 source cases.  Their adjacent two-cell fixtures
are packed into the smallest valid rectangular grid (with a square-shaped
tie-break), so a full 16-case chunk occupies 8x4 rather than an avoidable 32x2
Area.  Group chunks use the same bounded member-cell budget and, by default,
cap their local Area footprint at 16 cells so the unmodified background does
not create an excessive model-load set before the visible group command.  A
valid group exceeding that footprint cap stays intact in its own chunk.  Neither
kind may exceed the recovered 32x32 Area limit.  It has one
exact CDP frame only after every fixture cell is ready, runtime freshness is
true, pending/failed/bridge counts are zero, and the presented-frame fence is
ready.  The frame must show every case in its chunk; the gallery records the
cell-to-row mapping.

The runner persists `manifest.json`, `checkpoint.json`, `heartbeat.json`,
chunk frames, and blocker manifests atomically under its caller-owned output
directory.  One active lease is allowed.  A retry resumes only the recorded
chunk and never reclassifies a source descriptor silently.

### Versioned plan binding and safe resume

Every newly generated manifest uses
`aurora-tile-add-connect-matrix/v2` and embeds the exact active matrix
contract revision, contract fingerprint, and PathNode reference-corpus
provenance. The checkpoint and summary use their v2 schemas and bind:

- the exact absolute plan directory;
- `planId`, equal to the SHA-256 of the complete manifest;
- manifest schema;
- contract revision and fingerprint.

`status`, `next`, and `capture` validate the complete manifest and all of
those bindings before returning an executable next action. A missing,
unsupported, changed, or incompletely migrated plan returns
`replan_required`. It must not expose a capture action, create a capture
directory, or advance a checkpoint.

Every emitted safe command includes the exact quoted `--out-directory` and
`--plan-id`. A new plan replacing an old plan also records
`--replaces-plan-id`; replacement is explicit and never silently reuses an
old checkpoint.

### Runtime-build-bound v8 capture

Every v8 plan additionally requires an immutable
`aurora-tile-add-connect-runtime-build-profile/v1` and its caller-supplied
lowercase SHA-256. The planner validates and hashes the bounded profile, builds
an `aurora-tile-add-connect-runtime-build-binding/v1`, and embeds that exact
binding in the manifest, checkpoint, summary, heartbeat, capture staging,
visual-review ledger, and status output. Fresh checkpoints explicitly start
with empty `acceptedVisualReviews` and `rejectedVisualReviews` ledgers.

The repository generator derives the frontend/backend commit and image digest
from a sorted content manifest covering the runtime source roots and build
toolchain files. It emits canonical environment values for both managed
services. This is a source-bound worktree identity, not a Git cleanliness
claim and not a container registry assertion. The capture harness recomputes
the same source identity before opening the runtime and after the screenshot;
both observations must equal the profile and each other.

Capture must use the profile's exact frontend and backend origins. Before and
after the requested state settles, the harness requires:

- an exact frontend build identity read from the development workspace DOM;
- an exact backend identity through the frontend `/health` proxy;
- the same backend identity from the direct backend origin;
- proxy/direct agreement, exact contract/VFX revision, and a valid
  `processStartedAt` no earlier than the profile build timestamp.

Both backend health observations are repeated after the screenshot, and their
`processStartedAt` values must equal the preflight values.

The frame persists the expected binding, all three raw observations, and
`runtimeBuildProof.status=verified`, plus the bounded preflight/post-capture
source-identity summaries. Any missing identity, null static field, origin
mismatch, profile/hash drift, source drift, proxy/direct drift, stale process,
process restart, or post-capture observation drift fails closed before
staging. Independent review must repeat the exact binding, and acceptance must
copy it without normalization into the durable review ledger.

The canonical repository `status`, `next`, and `capture` package commands also
enable `--verify-runtime-source`. This performs the same bounded local source
rehash before returning an executable capture action. A mismatch leaves the
immutable plan structurally `ready` but returns
`runtime_build_reprofile_required`; `next` exposes no capture integration and
`capture` exits before any HTTP request or Chrome process. This is an
operational admission gate, not a migration or mutation of historical proof.

v7 evidence with null runtime identity remains historical and immutable. It
cannot be backfilled or resumed into v8. The runtime-bound successor starts at
checkpoint zero with a new plan id and may only advance through fresh guarded
capture and independent review.

Completion is reported on four independent axes:

- `addRenderCoverage`;
- `groupCoverage`;
- `pathReferenceCoverage`;
- `pathConnectDifferentialCoverage`.

Captured chunk count may advance add/render and group coverage only.
Reference matches remain diagnostic candidates. `pathConnect` remains
incomplete until primary Aurora/NWN differential evidence is bound to the
exact rows and accepted by its dedicated validator.

Each guarded capture additionally writes an optional development-only
`<chunk>.lifecycle.jsonl` trace containing the frame-write, CDP-close, Chrome
tree-cleanup, profile-cleanup, and runner-finish timestamps.  The matrix
controller may pass the explicit `exitAfterCleanup=true` flag only after those
artifacts are synchronously written and the Chrome tree/profile cleanup has
finished.  This bounds a known latent Node-handle shutdown delay.  It is not a
proof shortcut: after child exit the controller independently requires fresh
frame/state artifacts and every strict matrix verification gate before moving
the checkpoint.

The 2026-07-20 direct-lane probe rejected 32 loose pairs in a 32x2 Area after
the ready deadline (`54` loaded, `1` pending, and `9` blocked tiles).  The
compact 16-pair 8x4 probe passed with 32 loaded tiles and zero pending, failed,
or bridge tiles.  Until a larger direct footprint independently passes the
same strict proof, 16 is the maximum accepted default; a caller may not raise
it merely to reduce chunk count.

## Initial inventory

The live inventory at 2026-07-20 contains 99 tilesets and 53,700 parsed
`Tile_ID` definitions.  53,136 have model resrefs.  Of those, 52,788 have an
exact unrotated source-descriptor partner; 30 lack a right descriptor and 318
have no exact left-side partner.  The remaining 564 definitions lack a model
and are listed as blockers.

## Acceptance

Completion is permitted only when every source definition has one matrix row
and every row is either captured with the strict runtime gates or carries a
specific blocker plus resume condition.  For a group-backed row, capture means
its full selected SET group is shown and read back, not that the individual
replacement lock was bypassed.  Native Aurora parity remains `missing` until
primary Toolset/retail evidence independently validates the connection policy.
