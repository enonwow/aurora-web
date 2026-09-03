# Tile add/connect matrix scope

## User objective

Provide auditable evidence that Aurora Web can add every configured tileset
tile and render it beside a compatible neighbor, while making every tileset and
tile inspectable through generated chunk frames and an index.

## Scope decision

This is a development-only, file-backed agent workflow.  It does not add an
application UI, a backend HTTP endpoint, or a production telemetry stream.
The workflow reuses the existing tileset-definition endpoint, local draft Area
editor, guarded CDP capture route, and proof gates.

## Aurora-first boundary

The source `.SET` descriptors are used only as deterministic source metadata
for a compatibility fixture.  The project has no primary Aurora proof for
automatic neighbor selection, transition propagation, or first-match behavior.
Those operations are not implemented or claimed by this scope.

`PathNode` is a separate hard boundary, not another terrain descriptor. The
current matrix uses `Terrain`/`Crosser` only to form a render-adjacency
candidate; it cannot demonstrate click-to-move connectivity. Existing captures
are add/render evidence only. A pair may be labelled `pathConnect` only after
the fail-closed edge/rotation/region contract in
`backend/docs/aurora-reverse/tile-path-node-compatibility-audit-v1-2026-07-20.md`
has a primary-evidence resolver and a fresh runtime proof.

Persisted proof plans are immutable contract artifacts. The PathNode-aware
revision requires a v2 manifest, checkpoint, and summary bound to the exact
plan directory, manifest SHA-256, contract revision, and contract
fingerprint. Older plans are retained as historical evidence but return
`replan_required`; they cannot be captured or resumed.

## Complexity budget

- one pure matrix planner and its unit tests;
- one resumable runner with a configurable adjacent-pair chunk limit and a
  verified 16-cell complete-group footprint cap;
- one reusable browser capture scenario plus strict frame validation;
- JSON/HTML index generated from artifacts, not a new product UI.

The 32x32 local Area limit prevents a one-shot all-tile frame.  Batching is
therefore mandatory.  Each tile definition remains represented once in the
manifest even when its model or compatible partner is missing.

Multi-cell SET members are not a valid exception to coverage.  They use a
separate complete-group gallery fixture: one visible development-only inspector
command adds the whole declared layout, and the proof reads back every member
cell, orientation, and group-instance ownership.  The fixture is explicitly
diagnostic and must not bypass the ordinary editor's individual group-member
lock.  It proves Aurora Web's group add/join path only; retail master-cell and
automatic-neighbor semantics remain out of scope pending hard confirmation.

The development-only runner writes a per-capture lifecycle JSONL trace.  The
matrix controller may explicitly request a process exit after the proof frame
and cleanup are synchronously complete, then validates the files independently
before advancing the checkpoint.  This removes a latent Node-handle shutdown
delay without treating process termination as proof.

The direct-lane probe established a safe default of 16 adjacent source cases:
an 8x4 compact layout settled with 32 loaded tiles and no pending, failed, or
bridge tiles, whereas a 32-case 32x2 layout did not settle before the deadline.
The runner must not raise that default solely to reduce queue length.

Every generated multi-cell group chunk declares a deterministic background
tile.  Before the atomic group fixture command, the local diagnostic Area is
filled with that tile so an unrelated random new-Area model cannot keep the
strict renderer gate unsettled.  This underlay is not credited as an
individual-tile or group-member proof: final coverage still requires the
declared group members, orientations, anchors, and ownership.

## Required validation

1. Unit tests for descriptor matching, missing-model and missing-partner
   blockers, determinism, chunk limits, and checkpoint resume.
2. A regression smoke test for one small tileset fixture (`tms01`) that proves
   all tile rows are planned into valid fixture cells.
3. A guarded runtime capture of at least one planned chunk before wider queue
   execution, then the strict proof gate.
4. A final coverage report that separates captured rows from named blockers.
5. Unit coverage for group layout packing, malformed/oversized group blockers,
   and atomic diagnostic-group placement; a guarded runtime capture of one
   complete multi-cell group before wider group-queue execution.
