# Audit: Codex task `019f7c89-2412-7fa3-89fc-f309e3804842`

Date: 2026-07-29  
Audit verdict: `PARTIAL_IMPLEMENTATION`, `FULL_GOAL_MISSING`

> Policy update (2026-08-19): mutation testing is optional and requires an
> explicit user request. Any mutation-gate requirement recorded below is a
> historical finding from this audit and is not a current completion rule.

## Scope and method

This audit covers the task transcript, the current repository state, the
tile-agent and tile-matrix control-plane code, and the durable proof artifacts
created by the task.

The user-established goal was to show every tileset and every tile and prove
that the agent could add and correctly connect them, while keeping the process
efficient. The audit therefore treats model readiness, visual adjacency,
local Aurora Web editing, and NWN path connectivity as separate acceptance
points.

No Toolset, NWN, browser, Area, module, runtime setting, or existing proof
artifact was mutated during this audit. Existing PNGs were inspected
read-only. No fresh live capture was attempted because the local matrix
endpoint was not running and the audit did not authorize a new mutation lane.

## Executive result

The task produced useful local tooling and several valid Aurora Web proof
subsets, but it did not complete the user goal.

- Local Aurora Web CUD is verified for one Create scenario, two Update
  scenarios, and one Delete scenario.
- Small `atj02` render/add matrix pilots are verified.
- The full 99-tileset / 53,700-row matrix is not executed.
- No accepted `pathConnect` result exists. The current planner deliberately
  blocks every row from path-connect success pending Aurora/NWN differential
  evidence.
- The current matrix test fails.
- Every persisted full matrix plan predates the required `pathConnect` field
  and is rejected by the current manifest validator.
- The task is idle after two interrupted turns, even though its stated goal
  remains unfinished.

The correct overall proof state is therefore `missing`, not `verified`.

## Verified useful work

### Local Aurora Web CUD

The following frame artifacts all record `status=captured`,
`strictVisualMode.status=passed`, fresh runtime state, ready settlement and
presented-frame fence, 16/16 loaded terrain models, and zero pending, failed,
or bridge tiles:

- `output/proof/agent-tile-cud-2026-07-20/tni01-group-placement-local-agent-r1.frame.json`
  — Create through local group placement.
- `output/proof/agent-tile-cud-2026-07-20/tms01-tile-replace-local-agent-r1.frame.json`
  — Update through local Tile_ID replacement.
- `output/proof/agent-tile-cud-2026-07-20/tms01-tile-transform-local-agent-r1.frame.json`
  — Update through rotation and height change.
- `output/proof/agent-tile-cud-2026-07-20/tni01-eraser-local-agent-r1.frame.json`
  — Delete through the local eraser.

Their state artifacts also record successful exact undo/redo assertions. These
are valid proofs of local Aurora Web behavior. They are not native Toolset or
NWN parity proofs.

### Matrix render/add pilots

The direct packed `atj02` pilot at
`output/proof/tile-add-connect-matrix-v1-direct16-packed-probe-2026-07-20/direct-probes/atj02-direct16.frame.json`
records 32/32 loaded models with zero pending, failed, or bridge tiles, a fresh
exact canvas PNG, and exact fixture-cell readback.

The group pilot at
`output/proof/tile-add-connect-matrix-v1-groups-32-area16-2026-07-20/captures/atj02-group-chunk-0001.frame.json`
records 16/16 loaded models and an accepted group fixture/readback.

Visual inspection confirms that these PNGs contain rendered tile geometry.
The direct-pair PNG also contains substantial black/void sectors and does not
show or measure a cross-edge path query. It is accepted only as add/render
evidence.

### Fail-closed PathNode boundary

The new `tile-path-node-reference.mjs` resolver preserves the external
reference boundary and does not promote a reference match to path-connect
success. Its focused corpus test passes. This is a useful safety improvement:
the earlier `Terrain/Crosser` match is now explicitly a render candidate, not
click-to-move evidence.

## Findings

| Severity | Finding | Confirmed evidence and impact |
| --- | --- | --- |
| Critical | The explicit goal is unfinished. | The most advanced persisted plans contain only 1/2,516, 5/3,857, or 2/11,033 accepted chunks, and the accepted pilots are all from `atj02`. The compact 99-tileset plan remains 0/3,890. These overlapping plans must not be added together as global coverage. No artifact shows every tileset or every tile. |
| Critical | There is no verified path connectivity. | `pathConnectAcceptedRows` is intentionally zero in the current test contract. Reference matches remain blocked by `PATH_NODE_AURORA_DIFFERENTIAL_PROOF_REQUIRED`; there is no approved PathNode Toolset/NWN profile, cross-edge query, or differential runtime packet. Existing PNGs prove adjacency/rendering only. |
| High | The current implementation is not green. | `npm.cmd --prefix backend run test:tiles:add-connect-matrix` fails at `test-tile-add-connect-matrix.mjs:120`: `summary.pathReferenceMatchRows` is `undefined`, expected `1`. The last interrupted turn added summary assertions but did not implement the summary fields. |
| High | Persisted plans cannot be safely resumed under the current contract. | The current validator reports `PATH_CONNECT_STATUS_MISSING` for the 53,700-row compact manifest. The saved plans were generated before `pathConnect` and before PathNode entered the definition fingerprint. `status` does not validate the manifest and still recommends `capture_next_chunk`, so its recommendation is stale and unsafe. |
| High | The CLI does not resume the task by default. | `tiles:matrix-status` points to `output/proof/tile-add-connect-matrix-v1`, where no plan exists, and reports `plan_matrix`. Every actual plan has a dated, manually supplied output directory. The emitted `safeCommand` also omits that directory, so a later agent cannot execute the advertised continuation directly. |
| High | Matrix “complete” is not coupled to `pathConnect`. | Row state is based only on add plus render-descriptor connect. Checkpoint completion is based only on captured chunks. Even if all chunks were captured, the status could emit `matrix_capture_complete_candidate` while all `pathConnect` rows remain blocked. This does not satisfy the user’s “correctly connect” goal. |
| High | The generic visual coverage counter is not identity-bound. | `aurora-tile-agent-control.mjs` counts accepted gate files and compares that number with 36,997 runtime tile IDs. The five accepted gates currently counted are CUD frames, not five uniquely bound runtime tile IDs from the contract sweep. Gate artifacts do not record or deduplicate exact covered tile identities. `goal_complete_candidate` is therefore not a reliable full-coverage gate. |
| Medium | Partner selection does not use PathNode compatibility. | The planner chooses the first deterministic `Terrain/Crosser` partner and evaluates PathNode only afterwards. It does not search other descriptor-compatible candidates for a reference match. A mismatching first candidate can therefore block a row even if another candidate would be a better path test fixture. |
| Medium | The durable PathNode audit is stale relative to code. | `tile-path-node-compatibility-audit-v1-2026-07-20.md` says the planner does not consume PathNode and its fingerprint omits PathNode. The current code does both. The document still describes the resolver as future work even though a reference-only resolver now exists. |
| Medium | Delivery and attribution are unsafe. | Work was performed directly on `main`. The repository currently has 766 dirty paths: 217 modified and 549 untracked, with no commit after 2026-07-17. The task’s frontend, backend, documentation, and proof-harness changes cannot be isolated or safely rolled back from unrelated work. This violates branch-first and scope-discipline rules. |
| Medium | Required test gates are incomplete. | Focused tests and builds pass as listed below, but the backend unit/e2e gates and frontend regression gate were not completed for this change. The subject task itself reported the full backend unit run timing out. Renderer and scene logic changes require more than a build plus focused unit tests before delivery. |
| Medium | The full contract sweep is a separate incomplete lane. | Current `tiles:agent-status` reports 3,150/36,997 runtime tile IDs (8.514%), 12 blockers, and `complete=false`. This is useful model-contract progress but is neither the 53,700-row visual matrix nor path-connect proof. |

## Current verification results

Executed read-only during this audit:

- `npm.cmd --prefix backend run test:tiles:add-connect-matrix` — **FAIL**:
  missing `summary.pathReferenceMatchRows`.
- `node backend/scripts/test-tile-path-node-reference.mjs` — **PASS**.
- `node backend/scripts/test-aurora-tile-agent-control.mjs` — **PASS**.
- `node backend/scripts/capture-lifecycle-trace.test.mjs` — **PASS**.
- `node backend/scripts/capture-process-lifecycle.test.mjs` — **PASS**,
  5 tests.
- `npm.cmd --prefix frontend test -- tests/unit/modules/scene/domain/auroraAreaEditing.test.ts`
  — **PASS**, 46 tests.
- `npm.cmd --prefix frontend run build` — **PASS**.
- `npm.cmd --prefix backend run build` — **PASS**.
- Current compact manifest through `validateMatrixManifest` — **FAIL**:
  `PATH_CONNECT_STATUS_MISSING`.
- `npm.cmd --prefix backend run tiles:matrix-status` — reports no default
  plan.
- `npm.cmd --prefix backend run tiles:matrix-doctor` — `fetch failed`
  because the local app endpoint was not running; this is an audit-environment
  limitation, not proof of a product defect.

Not executed and still required before integration:

- full backend unit and e2e gates;
- frontend regression-smoke gate; mutation testing is optional;
- a newly versioned matrix plan generated by the current PathNode-aware code;
- any new live browser, Toolset, or NWN capture.

## Ordered remediation

1. Create a dedicated `codex/...` branch or otherwise isolate the exact
   tile-matrix change set from the current dirty `main` worktree.
2. Implement the four missing PathNode summary aggregates and make
   `test:tiles:add-connect-matrix` pass.
3. Make `status`, `next`, and `capture` validate the whole persisted manifest,
   its schema/fingerprint version, and the exact configured output directory.
   A stale plan must return `replan_required`, never `capture_next_chunk`.
4. Persist the active plan pointer or require an explicit plan identifier in
   every emitted `safeCommand`, so a later agent can actually resume it.
5. Separate completion states explicitly:
   `addRenderCoverage`, `groupCoverage`, `pathReferenceCoverage`, and
   `pathConnectDifferentialCoverage`. Never derive the overall user goal from
   captured-chunk count alone.
6. Bind every proof gate to exact tileset, Tile_ID, orientation, cell/edge,
   source fingerprint, and covered runtime tile identities. Count unique
   identities, not gate files.
7. Update partner selection to rank or enumerate all descriptor-compatible
   candidates using the reference evaluator, while keeping final success
   blocked until primary Aurora/NWN evidence exists.
8. Update the PathNode audit and matrix contract to match the current
   reference-only implementation.
9. Add the approved immutable PathNode proof profile and central validator,
   then capture differential Toolset/NWN evidence for supported symbols,
   rotations, lanes, and boundary outcomes.
10. Generate one new versioned manifest, execute it resumably, and report
    named blockers separately. Do not claim the original full goal until every
    required tileset/tile row has accepted add/render evidence and every
    required connection has accepted primary differential evidence.
11. Run the required backend unit/e2e and frontend unit/regression gates before
    delivery. Run mutation testing only if explicitly requested by the user.

## Task-continuity violation and recovery prompt

The task emitted several final answers while explicitly stating that the goal
remained active, then ended idle after two interrupted turns. Under the Aurora
audit exit gate, that is a concrete task-continuity violation. This audit did
not steer the task because the user requested an audit, not a continuation.

Ready-to-send prompt for task
`019f7c89-2412-7fa3-89fc-f309e3804842`:

> Continue the existing goal from the last verified local state. Do not capture
> any persisted matrix plan: current plans fail `PATH_CONNECT_STATUS_MISSING`.
> First implement the missing PathNode summary aggregates and restore the
> focused matrix test. Then make status reject stale manifests, bind every
> safe command to the exact plan directory, and generate one new versioned
> PathNode-aware manifest. Keep add/render proof separate from pathConnect.
> Resume bounded visual coverage only from that validated manifest. PathConnect
> must remain blocked until an approved immutable Toolset/NWN PathNode profile
> and differential cross-edge proof pass. Do not emit a final answer while the
> user’s 99-tileset / every-tile goal remains active.

## Remediation progress after takeover

The continuation was taken over in the current task on 2026-07-29 and is
isolated on branch `codex/tile-matrix-resume-20260729`.

- The manifest, checkpoint, summary, status, next, capture, and heartbeat
  control plane is now plan-bound and fail-closed. Old plans return
  `replan_required`; a wrong SHA-256 returns `plan_id_mismatch` without
  creating a capture directory or advancing a checkpoint.
- Completion is split into add/render, group, PathNode reference, and
  PathConnect differential coverage. Chunk completion alone cannot claim the
  user goal.
- Partner selection ranks descriptor-compatible candidates by the versioned
  reference result. Definition and contract fingerprints include the raw
  PathNode/reference corpus.
- A test found and fixed a latent aggregation defect: accepted differential
  rows are counted from `pathConnect.status=accepted`, not the impossible
  status `planned`. This required the final contract revision
  `path-node-aware-v2`.
- Live chunk `atj02-group-chunk-0011` exposed an over-strict texture gate:
  all 16 tile models were loaded with zero failed or bridge tiles, but two
  valid models declared no texture references. The proof harness now requires
  every declared texture contract to be applied, rather than requiring one
  texture contract per tile. Missing, pending, and failed texture states still
  reject proof. The proof-safety regression test and the retried exact chunk
  pass.
- Focused planner/control-plane, PathNode, proof-safety, runner-guard, and
  frontend tile tests pass. Backend and frontend production builds pass.
- Broad repository gates are not green in the pre-existing dirty worktree.
  The backend unit run passed 133 of 143 suites (1,378 of 1,386 tests), with
  ten suites failing in unrelated cache-version, derived-asset, runtime
  settings, Area object-count, catalog precedence, and module-wiring work.
  Backend e2e also fails two runtime-settings texture-index scenarios with
  HTTP 422 instead of 200. The frontend regression run reports 58 failures in
  existing auth, sound-properties, and debug/UI expectations. These failures
  were recorded but not mixed into the tile-matrix scope.

The current immutable plan is:

- directory:
  `output/proof/tile-add-connect-matrix-v2-path-node-aware-v2`;
- plan ID:
  `c4d6d80658e93d62f5ed154a0feadc1d236453d9fb4fb12720e10fe4f53b2db0`;
- scope: 99 tilesets, 53,700 rows, 3,890 chunks;
- PathNode reference: 39,093 matches, 4,353 mismatches, 207 unknown;
- PathConnect: zero accepted rows, fail-closed.

All 16 exact-plan `atj02` group chunks and the single `avs01` group chunk are
captured and visually inspected under the final revision. They cover 127 group
rows. Every accepted frame is fresh,
has ready post-mutation settlement and presented-frame fence, and records zero
pending, failed, or bridge tiles. This is valid add/render evidence only.

The static PathNode consumer follow-up found no semantic consumer in the local
decomp export. The live Toolset preflight found one already module-bound,
unowned, responsive session (`vckdemo1.mod`, PID 31196) and no canonical
ledger. It was left untouched. The PathConnect proof point remains `missing`
until a central immutable differential profile exists and a clean or
owner-bound Toolset/NWN session is available.

## Continued add/render verification

The exact plan resumed from `azi01-group-chunk-0001` and advanced through the
natural end of the `dls10` group boundary. Twenty-one additional chunks were
captured and visually inspected:

- `azi01-group-chunk-0001` through `0002`;
- `bci01-group-chunk-0001` through `0002`;
- `dag01-group-chunk-0001` through `0002`;
- `dct01-group-chunk-0001` through `0003`;
- `dls10-group-chunk-0001` through `0012`.

The current checkpoint contains 38 accepted chunks and 224 unique add/render
rows. The exact unique-row coverage is `atj02=125`, `avs01=2`, `azi01=16`,
`bci01=12`, `dag01=21`, `dct01=20`, and `dls10=28`. The twelve `dls10`
chunks contain 108 fixture-cell occurrences, but repeated group members reduce
that boundary to 28 unique matrix rows; coverage is reported by unique row,
not by fixture-cell occurrence.

Every newly accepted packet records fresh exact fixture state, a settled
terrain build and presented-frame fence, full camera coverage with no clipped
corners, and zero pending, failed, or bridge tiles. The canvases were inspected
individually. Dark `azi01` interiors and several mostly black `dls10` top-down
views retain source-backed visible meshes and complete applied material
contracts; they are not blank or bridge renders.

### `dls10` identical-canvas investigation

The canvases for `dls10-group-chunk-0001`, `0002`, and `0003` have the same
SHA-256:
`5ddce0aa0968a9cc2b6e6c4edc4aa181645a88a24bb377909c2cb29f7953d98e`.
This was treated as a potential stale-state or cache-collision failure before
continuing.

The evidence rules out both failure modes:

- capture times, exact tile-state digests, terrain build IDs, cache keys,
  source ETags, model object keys, and GLB SHA-256 values are distinct where
  the group variants differ;
- the first-edge models `dls10_v03_01`, `dls10_v04_01`, and
  `dls10_v05_01` have the same renderable binary chunk
  (`17dd48f73553a2f94c50d26a4528a12bcaca4cbe7914755aaac75df3f8d302ce`)
  even though their source and full GLB identities remain distinct;
- the center models are materially different: `dls10_v03_05`,
  `dls10_v04_05`, and `dls10_v05_05` have different GLB binary hashes and
  11, 20, and 20 meshes respectively. Their full GLB SHA-256 values are
  `6f76e46542fdc0db5cac3f9d785db52221f121124e56789c1231ac07c677b430`,
  `7b816cb2cff40e694a171d7a741c3cbec9279064aad125e76de922e69a6d6671`,
  and `410e10b08d8a8689f46e4bcc00b479d6e6ee80712a1056ba58735e5e30245e84`;
- the three settled runtime frames report 102, 110, and 111 visible meshes.
  Variant bridge, doorway, pipe, and roof geometry lies below the shared
  upper `gr01`/`UpperRing` shell in the top-down view, so the common shell
  occludes the differences and legitimately produces identical pixels.

The three packets therefore remain accepted as fresh add/render evidence.
Pixel equality alone is not being used as proof; acceptance is bound to the
exact state, asset lineage, loaded geometry, material contract, camera, and
presented-frame evidence.

### Revalidation and checkpoint

A read-only batch revalidation reopened all 38 chunk definitions, frames,
states, and canvas/page images. It rechecked strict visual mode, runtime
freshness, mutation and post-capture settlement, presented-frame fencing,
exact fixture IDs and orientations, declared group layout, loaded tile counts,
and zero pending/failed/bridge tiles. Result: 38/38 packets and 224 unique rows
passed with zero errors.

The focused gates also pass:

- matrix planner and plan-bound control-plane contracts;
- capture proof-safety and agent proof-gate contracts;
- sweep heartbeat and fail-closed contracts;
- runtime wait-deadline tests (3/3);
- eight focused frontend files covering process readiness, mutation telemetry,
  texture readiness, presented-frame and mutation signals, model requests,
  ceiling visibility, and camera framing (97/97 tests).

The persisted status is `ready` at `nextChunkIndex=38` of 3,890, with
`capturedChunkCount=38`, add/render coverage `224/53,136`, and group coverage
`224/9,114`. The next exact chunk is `gi-group-chunk-0001`. PathConnect remains
separate and fail-closed at `0/52,767`; none of these captures changes that
status.

### `gi` group boundary continuation

The exact plan continued through all nine `gi-group-chunk-0001` through
`0009` packets. Each packet contains four complete two-member group fixtures
in a 7x2 local Area. The nine packets therefore settle 126 Area cells while
proving 72 unique group-member rows; the six background cells in each packet
remain diagnostic underlay and are not matrix rows.

All nine guarded captures were controller-accepted and independently inspected
as exact canvas images. They show four spatially separated group arrangements
per packet, including narrow cross members, wall/platform segments, grates,
openings, and differently textured structural pieces. The darker
`gi-group-chunk-0006` image was not accepted from appearance alone: its fresh
runtime packet records 14/14 loaded models, 213 visible meshes, 252 materials
and maps, 14/14 applied texture contracts, and zero pending, failed, or bridge
tiles.

Across the nine packets:

- every canvas SHA-256 and tile-state digest is distinct;
- every camera coverage result is `pass` with zero clipped terrain corners;
- loaded tile count is 14/14 in every frame;
- visible mesh counts range from 120 to 340;
- material/map counts range from 148 to 384;
- texture contract application is 14/14 with zero failed or pending entries;
- guarded capture durations range from 67.9 to 84.7 seconds, within the bound
  180-second settlement profile, with complete Chrome/profile cleanup and
  `runner-finished` lifecycle evidence.

The post-boundary batch revalidation reopened all 47 persisted chunk
definitions, frames, states, screenshots, and lifecycle traces. It rechecked
the exact group fixtures and orientations, freshness, both settlement stages,
presented-frame fencing, tile/model/material readiness, screenshots, and
runner cleanup. Result: 47/47 packets and 296 unique rows passed with zero
errors.

The same focused gates remain green after the new captures: planner,
plan-bound controller, proof safety, agent control, sweep heartbeat,
sweep fail-closed, runtime deadline (3/3), and the eight focused frontend
files (97/97 tests).

The persisted status is now `ready` at `nextChunkIndex=47` of 3,890, with
`capturedChunkCount=47`, add/render coverage `296/53,136`, and group coverage
`296/9,114`. The next exact chunk is `htd01-group-chunk-0001` (8x2, three
groups, nine member rows); the complete `htd01` group boundary contains three
chunks. PathConnect remains separate and fail-closed at `0/52,767`.

### `htd01` group boundary continuation

The exact plan continued through all three `htd01-group-chunk-0001` through
`0003` packets. The packets prove 31 unique group-member rows across 60 settled
Area cells:

- `0001`: 8x2, three groups, nine member rows. The fresh canvas shows a large
  square grate, a central L-shaped construction, and a cyan/key-like structure
  over the deterministic background underlay.
- `0002`: 14x2, five groups, ten member rows. The fresh canvas shows a dark
  rectangular pair, a darker irregular pair, a central gray/arch pair, a small
  grid, and a large grid.
- `0003`: 8x2, three groups, twelve member rows. The fresh canvas shows a
  left-hand structure with a dark interior, a concentric circle, and two
  parallel strips.

The darker irregular pair in `0002` was treated as a possible missing-material
or placeholder failure and was not accepted from appearance alone. Exact state
readback binds it to group 14 at columns 3 and 4, tile IDs 96 and 97, using
`htd01_s13_01` and `htd01_t13_01`. Both source MDLs are present under
`lc_legacy_tiles`, both derived GLBs are distinct and ready, and both declare
the ready source textures `htd01_floor1`, `htd01_water01`, and
`ttr01_black00`. The black DDS is a real, source-backed 76-byte asset. Direct
GLB inspection found three render meshes and three matching materials in each
model; in both GLBs the `ttr01_black00` primitive spans the full tile bounds
from `[-5,-2,-5]` to `[5,-0.01,5]`. The two GLBs are 44,008 and 36,552 bytes
with SHA-256 values
`a483df9c64937988be2ca9d6d629840da04f441560b18e85f4bd6f8eae449462`
and
`679d87151e8db6a7a4d6b2229409ff7d7ddae39e750406fff68009ec61b09c86`.
The settled frame additionally records 395 visible meshes, 436 materials and
maps, 28/28 applied tile texture contracts, and zero pending, failed, or
bridge tiles. The dark geometry is therefore source-authored content, not a
renderer placeholder.

The post-boundary read-only batch revalidation reopened all 50 persisted chunk
definitions, frames, states, summaries, screenshots, and lifecycle traces. It
rechecked exact group membership, tile IDs and orientations, fresh strict
visual mode, both mutation settlement stages, presented-frame fencing, camera
coverage, tile/model/material readiness, non-empty canvas and page captures,
and the successful lifecycle suffix through Chrome cleanup, profile cleanup,
and `runner-finished`. Material acceptance required applied contracts to equal
declared contracts with zero failed or pending entries; it did not incorrectly
require intentionally material-free tiles to declare a texture contract.
Result: 50/50 packets and 327 unique rows passed with zero errors.

The focused gates remain green after `htd01`: matrix planner, plan-bound
controller, proof safety, agent control, sweep heartbeat, sweep fail-closed,
runtime deadline (3/3), and the eight focused frontend files (97/97 tests).

The persisted controller status is `ready` at `nextChunkIndex=50` of 3,890,
with `capturedChunkCount=50`, add/render coverage `327/53,136`, and group
coverage `327/9,114`. The next exact chunk is
`isc02-group-chunk-0001` (5x2, two groups, four member rows). PathConnect
remains separate and fail-closed at `0/52,767`; no native Toolset/NWN
differential profile was inferred from these browser add/render captures.

### `isc02` group boundary continuation

The exact plan continued through all four `isc02-group-chunk-0001` through
`0004` packets. They contain 20 group-member placements across 44 settled Area
cells and prove 16 unique rows. The lower unique count is intentional:
groups 12 and 13 share the four outer-ring rows `43`, `45`, `49`, and `51`,
while using different center rows `47` and `55`.

Independent canvas inspection found:

- `0001`: a 5x2 Area with two separated two-member channel/chamber groups.
  The first has a curved passage; the second has a larger dark chamber.
- `0002`: one five-member 3x3 group with a solid polygonal center and four
  separated outer-ring sections.
- `0003`: the related five-member 3x3 group with the same four declared ring
  members and a visibly different center containing a framed dark opening.
- `0004`: an 8x2 Area with three separated pairs: a heavy grate/segment, a
  curved passage, and a chamber segment with a dark interior.

The large black regions in `0001` and `0004` were not accepted as absent
geometry. Exact state readback identifies the deterministic underlay as tile
0, model `isc02_a00_01`; runtime material inspection reports source-backed
`black` and `ceiling01` meshes using the ready `isc02_brick01` material.
Packet `0001` alone records 35 visible meshes, 42 materials and maps, 10/10
applied texture contracts, and zero pending, failed, or bridge tiles.

All four canvas SHA-256 values, tile-state digests, and terrain build IDs are
distinct. The two superficially related ring packets also differ in runtime
geometry: `0002` records 15 visible meshes and 24 materials/maps, while
`0003` records 30 visible meshes and 39 materials/maps. Across the boundary,
visible mesh counts range from 15 to 53 and material/map counts from 24 to 64.
Texture application is exact at 10/10, 9/9, 9/9, and 16/16, with zero failed
or pending material contracts and zero failed or bridge tiles.

The post-boundary read-only revalidation reopened all 54 persisted chunk
definitions, frames, states, summaries, screenshots, and successful lifecycle
suffixes. Exact group instances, anchors, member IDs and orientations,
freshness, strict visual mode, both settlement stages, presented-frame
fencing, camera coverage, tile/model/material readiness, capture files, and
Chrome/profile/runner cleanup all passed. Result: 54/54 packets, 343 unique
rows, and zero errors.

The focused regression gates remain green: matrix planner, plan-bound
controller, proof safety, agent control, sweep heartbeat, sweep fail-closed,
runtime deadline (3/3), and the eight focused frontend files (97/97 tests).

The persisted controller status is `ready` at `nextChunkIndex=54` of 3,890,
with `capturedChunkCount=54`, add/render coverage `343/53,136`, and group
coverage `343/9,114`. The next exact chunk is
`jac01-group-chunk-0001` (8x2, three groups, ten member rows). PathConnect
remains separate and fail-closed at `0/52,767`.

### `jac01` group boundary continuation

The exact plan continued through all thirteen `jac01-group-chunk-0001`
through `0013` packets. They contain 24 complete group fixtures, 94
group-member placements, and 94 unique rows across 143 settled Area cells.

Independent inspection of every exact canvas found:

- `0001` through `0005`: separated forest/root structures, a timber platform,
  cliff and pool openings, a complete two-member wooden/stone platform, and a
  dense nine-member tree ring around a central opening;
- `0006`: a complete four-member ship spanning the full height of a 2x4 Area;
- `0007`: a continuous three-member log bridge between two cliffs;
- `0008`: a complete nine-member square stone courtyard with a central court
  and three open approaches;
- `0009`: a broken wooden deck/ship structure and a separate large symmetric
  deck or arena;
- `0010`: three separated structures: a timber platform, a forest/stone
  courtyard, and a stone platform;
- `0011`: three complete ship variants, including one long masted hull and two
  round-deck hulls;
- `0012`: a long suspended bridge and a separate small stone/timber structure;
- `0013`: a large overgrown stone ruin and a separate earth/timber platform.

The dark center in the tree ring (`0005`) and irregular openings in the broken
deck (`0009`) were retained as possible visual blockers until their full frame
contracts were checked. Packet `0005` records 189 visible meshes, 196
materials/maps, 9/9 applied texture contracts, and zero pending, failed, or
bridge tiles. Packet `0009` records 565 visible meshes, 582 materials/maps,
15/15 applied texture contracts, and the same zero-blocker state. Their dark
regions are bounded by visible source geometry and occur inside otherwise
fully settled group models, so they are accepted as model content rather than
blank or placeholder tiles.

Every `jac01` canvas SHA-256 and tile-state digest is distinct. Across the
thirteen packets, visible mesh counts range from 88 to 776 and material/map
counts from 94 to 788. Texture contracts are applied exactly for every Area
cell in every packet, with zero material pending/failure entries and zero
pending, failed, or bridge tiles. Successful lifecycle durations range from
20.8 to 97.6 seconds. The longest packet, `0009`, remained within the
180-second runtime settlement profile and advanced the checkpoint only after
fresh frame/state verification and complete Chrome/profile cleanup.

The post-boundary read-only revalidation reopened all 67 persisted chunk
definitions, frames, states, summaries, screenshots, and successful lifecycle
suffixes. Exact group instances, anchors, member IDs and orientations,
freshness, strict visual mode, both settlement stages, presented-frame
fencing, camera coverage, tile/model/material readiness, capture files, and
Chrome/profile/runner cleanup all passed. Result: 67/67 packets, 437 unique
rows, and zero errors.

The focused regression gates remain green: matrix planner, plan-bound
controller, proof safety, agent control, sweep heartbeat, sweep fail-closed,
runtime deadline (3/3), and the eight focused frontend files (97/97 tests).

The persisted controller status is `ready` at `nextChunkIndex=67` of 3,890,
with `capturedChunkCount=67`, add/render coverage `437/53,136`, and group
coverage `437/9,114`. The next exact chunk is
`lca03-group-chunk-0001` (7x2, four groups, eight member rows). PathConnect
remains separate and fail-closed at `0/52,767`.

### `lca03` partial group boundary and fail-closed framing blocker

The exact plan continued through seven independently accepted packets,
`lca03-group-chunk-0001` through `0007`. They contain 71 unique group-member
rows across 86 settled Area cells:

- `0001`: four separated two-member wooden rooms or interiors in a 7x2 Area;
- `0002`: three four-member living interiors in an 8x2 Area, including two
  dark source-authored stair or floor openings;
- `0003`: a large wooden interior and a separate octagonal tent or pavilion
  with a central table;
- `0004`: a complete 3x2 timber dormitory with six beds and side stairs;
- `0005`: a complete 3x4 stone layout with right-hand bars or cells, a large
  irregular central pit, and four symmetric dark corner squares;
- `0006`: a complete symmetric 4x4 stone maze with four entrances and
  symmetric circular shafts;
- `0007`: a complete 3x3 stone layout with an ornate central pool, side inlet,
  and eight symmetric perimeter shafts.

Fresh readback of all seven packets reports `captured` status, runtime
freshness, exact loaded-cell counts, and zero pending, failed, or bridge
tiles. Their runtime canvases contain between 17.6% and 56.3% non-black
samples. Visible mesh counts range from 116 to 334 and material/map counts
from 147 to 372. Every lifecycle ends with Chrome cleanup, profile cleanup,
`runner-finished`, and the forced exit request. These seven packets therefore
advance independently accepted add/render coverage from 437 to 508 unique
rows.

`lca03-group-chunk-0008` is rejected even though the controller recorded it as
captured. Independent inspection found an almost entirely black canvas: the
declared 4x2 Area is a tiny cluster at the bottom-right and a separate distant
pixel appears near the top-left. The runtime sample contains only 21 non-black
samples out of 4,096 (`0.005127`) with average luminance `0.478`.

This is not a missing model or unsettled material contract. The frame reports
all 8/8 models ready, 239 visible meshes, 261 materials/maps, and zero pending,
failed, or bridge tiles. The declared camera view was correctly sized for 4x2
content with target `2,0,1` and distance `46.488`, but the final runtime fit
expanded to `32.268x16.314`, target `16.134,0,8.157`, and distance `375.539`.
The camera coverage check still returned `pass` with zero clipped corners
because it evaluated those already-corrupted runtime bounds.

The exact culprit is source-backed model `lca03_t18_01`, cache key
`63a403c36c94bbb39d2a4a674c65b1fe36b4ac72a1f721ae16e6965d546a01bf`.
Its runtime root bounds are `30.27x2.50x16.31`. Direct GLB inspection identified
mesh `Geom808`, accessor 96 with 173 vertices, under source trimesh parent
`lca03_T18_01` and material `Aurora material lca03_tent`. The mesh is only
about `1.03x0.46x1.13` source units in size but is displaced to raw coordinates
from approximately `[-297.68,-20,157.01]` to
`[-296.65,-19.54,158.14]`. After renderer scaling and tile placement, this
normal-sized remote geometry island expands the camera bounds and creates the
distant pixel.

The focused matrix planner, plan-bound controller, proof-safety, and agent
control tests all remain green. More importantly, direct evaluation of the
failed frame by `evaluateProofFrame()` returns `accepted: true` with no
rejection codes. The current automated proof gate therefore has a confirmed
framing gap: it validates readiness, freshness, and artifact existence, but
does not reject geometry-driven camera fits far outside the declared Area
footprint.

The rejection is persisted in
`output/proof/tile-add-connect-matrix-v2-path-node-aware-v2/captures/lca03-group-chunk-0008.visual-blocker.json`.
It binds the plan, chunk fingerprint, artifact hashes, exact outlier telemetry,
rejected row IDs, and resume conditions. No `0009` or later packet was run.

The controller has no public reject, rewind, or rollback operation. Its raw
checkpoint has already advanced to `nextChunkIndex=75`, 75 captured IDs, and
514 unique rows. This raw cursor is not proof acceptance. The effective
fail-closed checkpoint remains 74 accepted packets, last accepted
`lca03-group-chunk-0007`, and 508 unique rows across 946 Area cells. Safe
resumption must return to a fresh `lca03-group-chunk-0008` capture after a
tested out-of-footprint bounds policy and a plan-bound recovery or replacement
plan exist. It must not continue from `0009`.

PathConnect remains separate and fail-closed at `0/52,767`; no native
Toolset/NWN differential profile was inferred.

### `lca03` framing recovery and accepted replacement packet

The framing incident was closed with a contract-first, test-first proof-control
change. Runtime camera fitting now uses policy
`footprint_xz_connected_visible_terrain/v1`: it begins with the declared Area
footprint and includes the complete 3D world bounds of each visible terrain
mesh whose XZ bounds intersect that footprint. Disconnected source geometry is
not hidden, moved, clipped, or otherwise mutated; it is excluded only from
camera influence and retained in an observed-bounds/outlier ledger. Missing
logical footprint evidence fails closed.

The CDP evidence now records camera and observed terrain bounds, excluded mesh
count/sample, horizontal expansion ratio, and policy status. The raw agent
gate rejects an outlier packet with
`TERRAIN_FRAME_OUTLIER_REVIEW_REQUIRED`. Matrix capture is also two-phase:
`capture` stages immutable, hash-bound evidence in `pendingCapture` without
advancing the checkpoint, while `accept-capture` requires an exact
`aurora-tile-add-connect-matrix-visual-review/v1` packet before advancing one
chunk.

Focused tests pass for all 23 camera-framing cases, proof-safety telemetry,
agent gating, and the matrix control plane. The controller test covers dry-run
recovery, incorrect hashes, exact execution, archive integrity, idempotent
repetition, pending capture without cursor movement, negative review hashes,
and exact positive review.

Plan-bound recovery
`e0b32c6eec8a08c5285ab679ddfa45b0b666a42d780633a1824e20408fcc4c64`
archived the rejected legacy packet and restored the durable checkpoint from
75 to 74. The record is under
`captures/rejected/lca03-group-chunk-0008/<recovery-id>/recovery-record.json`.
A repeated execution returned `already_recovered`; the manifest and
PathConnect rows were unchanged.

Fresh replacement capture
`lca03-group-chunk-0008.attempt-0002` then staged at index 74. Its settled
camera remains the requested `4.000x2.000` frame, target `2,0,1`, distance
`47.005`, with zero clipped corners. The unfiltered observed bounds still
record `32.268x16.314`; `Geom808` is the single excluded camera-fit mesh, so
the source anomaly remains explicit rather than disappearing from evidence.

Independent inspection of both the runtime canvas and full page screenshot
shows a legible full 4x2 Area: the declared four-member `group34`, two-member
`group35`, and both separating background cells are visible. The canvas has
1,046 non-black samples out of 4,096 (`0.255371`) with average luminance
`19.388`, compared with 21/4,096 and `0.478` in the rejected packet. Runtime
state reports 8/8 loaded tiles, 239 visible meshes, 261 materials/maps, and
zero pending, failed, or bridge tiles; mutation settlement, post-capture
settlement, and the presented-frame fence are all `ready`.

The raw agent gate correctly rejected the outlier for review. Exact visual
review
`lca03-group-chunk-0008.attempt-0002.visual-review.json`, SHA-256
`d1a8b2ea2977f3aa36414593059aba4a85863eae6bc1496b50c7548cfb4836e1`,
accepted only the add/render packet. The checkpoint advanced 74 to 75 only
after that review, bringing independently accepted add/render coverage to 514
unique rows across 954 Area cells and 602 member placements.

PathConnect remains separate and fail-closed at `0/52,767`; neither the
recovery, framing policy, staged capture, raw gate, nor visual review inferred
native Toolset/NWN connectivity.

### `lca03` continued accepted group packets `0009` through `0011`

The two-phase pipeline continued through three additional independently
reviewed packets:

- `lca03-group-chunk-0009` is a 5x3 Area containing the complete six-member
  `group36` barn/cavern fixture, four-member `group37` stone-and-pool fixture,
  and five separating background cells. Runtime settlement briefly reported
  one bridge model contract, then reached 15/15 loaded tiles before capture.
  The final frame has no outliers, 350 visible meshes, 385 materials/maps,
  1,500/4,096 non-black samples, and raw agent-gate acceptance.
- `lca03-group-chunk-0010` is a 7x2 Area containing the complete two-member
  `group4` interior, four-member `group40` room, four-member `group41`
  kitchen/room, and four background cells. Six initial bridge contracts all
  settled to 14/14 ready. Two tiny disconnected nodes, `Object1267` and
  `Object1269`, remain recorded near Z `-12.69` and are excluded only from
  camera influence. Independent review confirmed the full 7x2 fixture is
  legible; the raw gate correctly required outlier review.
- `lca03-group-chunk-0011` is a 7x2 Area containing four complete two-member
  shop/interior fixtures at alternating columns plus six background cells.
  Seven initial bridge contracts settled to 14/14 ready. Final runtime state
  has no outliers, 329 visible meshes, 363 materials/maps, 929/4,096
  non-black samples, and raw agent-gate acceptance.

Every packet has exact fixture assertions, strict visual mode, ready mutation
and post-capture settlements, a ready presented-frame fence, zero pending,
failed, or bridge tiles, and complete Chrome/profile cleanup. Exact visual
review SHA-256 values are:

- `0009`: `2197a0e42a1455edf131657ceaba4289f523163feb9b22616308d8117855b3d2`;
- `0010`: `3b24c1996b95a0d5e51933644742b492c0ead2f71e1878f6b9aff06dd086b16d`;
- `0011`: `efcb13aefe5ca1101ac9f207ef61769e9ac2463e829e35a2e4a994ec24f04fd2`.

A post-boundary readback rehashed the five core capture artifacts and review
for each of `0008` through `0011`, matched them to
`checkpoint.acceptedVisualReviews`, reopened the frame/state/review records,
and checked all 16 cleanup lifecycle markers. The corrected readback reports
zero errors.

The focused camera test is green at 23/23. Matrix planner, matrix control
plane, agent control, and runtime proof-safety tests also pass. Persisted
status is `ready` at `nextChunkIndex=78` of 3,890 with 78 captured chunks and
542 independently accepted add/render rows. The next exact packet is
`lca03-group-chunk-0012`.

`lca03-group-chunk-0012` subsequently passed the same two-phase path. Its 3x2
Area contains the complete two-member `group7` and `group8` inn-room fixtures
at opposite sides plus both central background cells. Two initial bridge
contracts settled to 6/6 ready. The final frame has no camera outliers, 130
visible meshes, 142 materials/maps, zero pending/failed/bridge tiles, and
2,131/4,096 non-black samples. The raw agent gate accepted it. Independent
review SHA-256
`bb8969dc7f0ccb62b05e5f212a074c1ce5377c6bd2ecae897b2cc2be12efd469`
advanced the checkpoint from 78 to 79 and add/render coverage from 542 to 546
rows. This closes the planned `lca03` group boundary; the next exact packet is
`mst01-group-chunk-0001`.

### `mst01` first group packet material-contract blocker

The first `mst01` packet is one 4x5 fixture with 20 member tiles. A fresh
`mst01-group-chunk-0001.attempt-0002` run loaded all 20 model contracts but
never reached a ready terrain snapshot. Five models each remained exactly one
material map short, all for the same missing texture resref
`mtr_nkey_0531`:

- `mst01_o50_03`: 72/73 maps;
- `mst01_o50_09`: 146/147 maps;
- `mst01_o50_12`: 59/60 maps;
- `mst01_o50_16`: 107/108 maps;
- `mst01_o50_20`: 68/69 maps.

The capture runner failed with `Expected Area runtime snapshot did not settle
for opened Area.` It produced no frame, state, canvas, or page screenshot, so
no visual review exists and no acceptance was attempted. Chrome/profile
cleanup, `runner-finished`, and forced exit with code 1 all completed.

The exact failure is preserved in
`captures/mst01-group-chunk-0001.attempt-0002.capture-blocker.json`, including
plan/chunk binding, final progress state, affected models, artifact hashes,
checkpoint disposition, and resume conditions. The checkpoint remains 79
with 79 captured chunks and 546 accepted add/render rows.

PathConnect remains `0/52,767`, `missing`, and unchanged.

### `mst01` source-proven material recovery and accepted replacement

The blocker was traced through the exact source, manifest, and delivery
contracts before implementation. `mtr_nkey_0531` is absent from both local
KEY archives, every one of the 174 local HAK files, and the relevant loose
resource roots. The five affected models all come from
`vale_core_tis_01.hak` and use that reference on one primitive in the same
`EVO_NECRO_Wall_D_Top` mesh family.

The source inventory establishes a narrower invariant rather than a guessed
alias. All 281 locally present `mtr_nkey_NNNN` manifests bind
`texture0 tex_core_NNNN_d`, with zero mismatches. The exact target diffuse,
normal, and roughness rasters exist in `vale_core_tex_04.hak`; the diffuse
resource `tex_core_0531_d.dds` is 1,398,256 bytes with SHA-256
`3131d5897a39a936fc191c10cbefc35d4b2bf0b9679e6c297c8b8bae5133c0fe`.
The versioned decision is documented in
`tile-mtr-numbered-diffuse-family-recovery-contract-v1-2026-07-29.md` under
policy ID `tile-mtr-numbered-exact-diffuse-family/v1`.

The tile service now attempts the exact resource first and recovers only an
absent reference matching `^mtr_nkey_(\d{4})$` through its exact
`tex_core_NNNN_d` family. Three-digit names, suffixes, other prefixes, and
already present MTR resources remain fail-closed. Targeted source sync expands
by the same exact rule. The tile-process cache fingerprint advanced to
`tile-process/v18-numbered-mtr-diffuse-family`, preventing a previously
blocked render contract from surviving the policy change.

The focused tile/cache suite passes 53/53 tests, backend typecheck passes, and
the matrix planner, matrix controller, tile-agent controller, and runtime
proof-safety regressions all pass. After a backend restart, five immutable
runtime-contract proof parts cover `mst01_o50_01` through
`mst01_o50_20`. All 20 bypass-cache results are accepted, every delivered GLB
matches its contract SHA-256, every material reference has a delivered asset,
and every HTTP asset check succeeds. The part SHA-256 values are:

- `part-0001`: `15c04cae35e4f21bef52201e45f242fef27997443f9bb6c9ea9c2f247f43872c`;
- `part-0002`: `7e8ea34ae83808cb04d88fdc9f7cf50f3eb7591e33206fb2ec701f4a4bfe7bad`;
- `part-0003`: `7f77ddb6272774258ade1ac4605203d63639c962923d6ca2ffeef63d0e8a6f12`;
- `part-0004`: `f9714e34134f612f4a90769b92032aef318a2ffe9cf4a29c3867461a4f6899bd`;
- `part-0005`: `377cfa38c2be3ad3a867e59f0c0912dadaae4c78223ffcb3eddd6594b2b0613e`.

Fresh replacement capture `mst01-group-chunk-0001.attempt-0003` then staged
without advancing the checkpoint. Its exact 4x5 group fixture is fully
legible in both the canvas and page screenshot. Runtime state reports 20/20
loaded tiles, zero pending/failed/bridge tiles, 1,430 visible meshes, 1,441
materials/maps, and 20/20 applied material-texture contracts. Mutation
settlement, post-capture settlement, and the presented-frame fence are all
`ready`; the sampled canvas has 2,052/4,096 non-black samples.

The camera ledger records one disconnected
`Rock_group_16_Clone_001` outlier immediately outside the left footprint, so
the raw agent gate correctly emitted
`TERRAIN_FRAME_OUTLIER_REVIEW_REQUIRED`. Independent review accepted the
frame because the observed and camera terrain bounds are identical, the
expansion ratio is `1.000`, all 20 cells remain legible, clipped-corner count
is zero, and the NDC margin is positive. Exact visual review SHA-256
`f547f10d6ea78cd9cad7a7290d047ae60091a664dfabd9286ce06753addc67ca`
advanced the checkpoint from 79 to 80 and accepted add/render coverage from
546 to 566 rows. A post-write readback matched all five capture artifact
hashes plus the visual-review hash to `checkpoint.acceptedVisualReviews`.

Four further packets passed the same two-phase workflow:

- `mst01-group-chunk-0002` shows the complete three-member Lower Level
  Transition fixture across the first row of a 3x2 Area. The second row is
  the exact declared source-backed tile-0 background. Runtime reached 6/6
  loaded tiles, 44 visible meshes, 50 materials/maps, zero failures or
  bridges, and raw agent-gate acceptance. Review SHA-256:
  `a8254e843cfdf613da7e9b28bf9090ecd6c9a6253af735013b3bded5955ca18a`.
- `mst02-group-chunk-0001` shows both complete two-member vertical corridor
  fixtures at the Area edges with the declared background column between
  them. Runtime reached 6/6 loaded tiles, 136 visible meshes, 146
  materials/maps, zero failures or bridges, and raw gate acceptance. Review
  SHA-256:
  `4ee6b6b59e69264d377d4e4f4040f99e89dde6fe5e113d84d0a57787ba413ef0`.
- `mst03-group-chunk-0001` shows the complete 1x2 group and both complete 2x2
  groups in a 7x2 Area. Runtime reached 14/14 loaded tiles, 166 visible
  meshes, 190 materials/maps, and zero failures or bridges. Two zero-width
  `tileshroud` planes numerically on the X=0 boundary triggered the required
  raw outlier review; observed and camera bounds are identical, expansion is
  `1.000`, and independent review accepted the legible frame. Review SHA-256:
  `f436e7012ee418d9983ae970520ae0bac18c7a009ae995be76ef6e761ec458ee`.
- `mst03-group-chunk-0002` is the complete six-member Chambers (Large 1)
  fixture filling a 3x2 Area. Runtime reached 6/6 loaded tiles, 72 visible
  meshes, 84 materials/maps, zero failures or bridges, and raw gate
  acceptance. Review SHA-256:
  `14059f462e4d2ee3f839fd5b611cd2771bcdd9ffab4a04ee843a1c1a31697846`.

Post-write readback matched all five capture hashes and the visual-review
hash for every packet. The durable checkpoint is 84, accepted add/render
coverage is 589 rows, and the next exact packet is
`mst03-group-chunk-0003`. PathConnect remains fail-closed at `0/52,767`;
none of these reviews promotes native connectivity.

### Lowered MST03 floor recovery and continued matrix coverage

Fresh `mst03-group-chunk-0003` initially reached a fully settled `12/12`
runtime contract but was rejected visually: 92.3218% of its canvas was black
and the room interiors contained no visible floor texture. Exact source
inspection proved that `mst03_b50_01` contains a correctly wound `floor` mesh
at local Aurora `Y=-5`, rendered at world `Y=-0.5`, and binds the non-black
`tex_core_0163_d` diffuse. The defect was the Aurora Web-only opaque Area
extent plane at `Y=-0.018`, which sat above and occluded the source floor.

The source-backed decision is documented in
`tile-mst03-lowered-floor-extent-occlusion-audit-v1-2026-07-29.md`. The
renderer now monotonically lowers, never raises, its helper extent beneath the
minimum transformed source-ground elevation. The regression proves
`-0.5 -> -0.518` and preserves the ordinary `-0.018` extent for a floor at
zero. The focused frontend suite passes 34/34 and frontend typecheck passes.

The two-phase controller also gained a hash-bound `reject-capture` transition.
It records the exact rejected visual review and artifact hashes, clears only
the unaccepted pending pointer, leaves the immutable checkpoint prefix
unchanged, and permits a new attempt for the same chunk. The controller
regression covers rejection, restaging, and subsequent acceptance; matrix
planner and controller tests pass.

Replacement `mst03-group-chunk-0003.attempt-0002` shows the complete
twelve-member Ye Old Entry Hall fixture with a continuous gray stone floor,
brown side chambers, wooden dividers, thresholds, and perimeter lines.
Runtime is `12/12` loaded, 251 visible meshes, 273 materials/maps, and zero
pending/failed/bridge tiles. Four zero-width boundary shrouds required
independent framing review; observed and camera bounds are identical,
expansion is `1.000`, clipped-corner count is zero, and the full group is
legible. Review SHA-256:
`e709e53c27f63569b38591b5f18cc91adb2782527975bc01d227455968f98c02`.

Two further packets passed the exact two-phase workflow:

- `mst03-group-chunk-0004` shows two complete 2x2 jail-cell fixtures at the
  edges of a 5x2 Area with the exact two-cell background separator. Runtime is
  `10/10` loaded, 90 visible meshes, 108 materials/maps, zero
  pending/failed/bridge tiles, and raw gate acceptance. Review SHA-256:
  `9046016b2cd1e33461c71bd6767c1a43dbe489795d1bad1ba81a856edfe61b93`.
- `mst04-group-chunk-0001` is the complete nine-member Water, Large Pond
  fixture. Its water basin, closed rocky shoreline, vegetation, boat, island
  rock, and dock are all visible. Runtime is `9/9` loaded, 235 visible meshes,
  235 materials/maps, and zero pending/failed/bridge tiles. One tiny grass
  tuft extends 0.014 outside the connected X bound; expansion is `1.005`,
  clipped-corner count is zero, and independent review accepted the complete
  frame. Review SHA-256:
  `c545bc79126bacf2682def4f20ff579319edbc5baed1eb8220308b5f9af9754d`.

The durable checkpoint is now 87, accepted add/render coverage is 618 rows,
and the next exact packet is `mst04-group-chunk-0002`. PathConnect remains
fail-closed at `0/52,767`; no rejection, correction, or visual review inferred
native connectivity.

## Final verdict

The task materially improved diagnosability and produced valid local CUD plus
small add/render proofs. It also correctly discovered and stopped the false
equivalence between visual adjacency and NWN path connectivity.

The takeover repaired the failing test and stale-plan control plane, generated
one current exact-bound plan, resumed limited proof coverage, found a
source-geometry camera-framing false acceptance, and repaired the proof
pipeline before accepting a fresh replacement. It still has not shown every
tileset or every tile and has not proven correct native path connectivity. The
task must remain open, with local CUD and all 618 independently accepted
add/render rows marked `verified`, all remaining visual coverage marked
`missing`, and `pathConnect` marked `missing`.
