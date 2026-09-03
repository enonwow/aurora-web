# Tile add/connect matrix visual review and framing recovery contract v1

Status: active for matrix captures created after 2026-07-29.

## Purpose

The tile add/connect matrix must not advance its durable add/render checkpoint
before an independent visual review accepts the exact fresh capture. It must
also prevent source geometry far outside the declared Area footprint from
silently making the requested Area illegible.

This is a proof-control contract. It does not define an Aurora tile-model
semantic, change source assets, or promote any `PathConnect` result.

## Confirmed incident and calibration evidence

`lca03-group-chunk-0008` declared a 4x2 Area. Its settled runtime terrain
bounds expanded to `32.268x16.314`, and the resulting camera distance was
`375.539`. Only 21 of 4,096 canvas samples were non-black. Direct GLB
inspection bound the expansion to the source-backed `Geom808` island in
`lca03_t18_01`, displaced roughly 300 source units from the rest of the model.

The first 75 exact matrix captures provide an empirical framing corpus:

- the largest independently accepted horizontal expansion ratio is
  `1.218667`;
- the rejected `lca03-group-chunk-0008` ratio is `8.157`;
- the median ratio is `1.0`, the 95th percentile is `1.13`.

These ratios diagnose the incident but are not used as an Aurora geometry
limit. The framing rule is instead based on whether each visible mesh remains
spatially connected to the declared Area footprint in XZ. This admits a full
tree, pit, bridge, cave entry, or overhang when its world AABB intersects the
Area while preventing a separate remote island from becoming the camera
oracle.

## Runtime framing policy

The top-down proof camera preserves two separate bounds records:

1. `logicalBounds`: the declared Area footprint from the current Area scene;
2. `cameraTerrainBounds`: the logical footprint plus the complete world AABB
   of every visible terrain mesh whose XZ AABB intersects the footprint;
3. `observedTerrainBounds`: the unfiltered union of all settled visible terrain
   meshes, retained for diagnostics.

The camera uses `cameraTerrainBounds`. Intersecting meshes are included in full
3D, so legitimate below-ground, above-ground, and edge-overhanging geometry is
not truncated to the footprint. A mesh whose XZ AABB is wholly disconnected
from the footprint is excluded only from camera-fit influence and is recorded
with its world bounds in the outlier ledger. It remains in the scene with the
same visibility, parent, transform, geometry, and material.

The runtime publishes the policy ID
`footprint_xz_connected_visible_terrain/v1`, both bounds digests, excluded mesh
count/sample, and the raw horizontal expansion ratio. If the logical
`terrain-area-extent-footprint` is missing, the refit fails closed and does not
fall back to unfiltered model bounds.

A frame with one or more excluded meshes records `runtime_bounds_outlier`.
The raw automated proof-frame gate rejects it with
`TERRAIN_FRAME_OUTLIER_REVIEW_REQUIRED`. The outlier decision prevents remote
geometry from controlling the proof camera but does not itself accept or
reject the requested tile. Only the exact matrix visual-review transition may
accept that add/render packet after the Area is legible and the declared
fixture is visibly present.

## Two-phase checkpoint transition

`capture` is a staging operation:

1. It creates one immutable attempt name. The first attempt may retain the
   historic chunk stem; later attempts use `.attempt-NNNN`.
2. It verifies fresh frame/state settlement and exact fixture identity.
3. It writes `checkpoint.pendingCapture` with the exact plan/chunk binding and
   SHA-256 of the frame, state, canvas, page screenshot, and lifecycle trace.
4. It does not change `nextChunkIndex` or `capturedChunkIds`.
5. It reports `awaiting_independent_visual_review`.

Only `accept-capture --visual-review <path>` may advance the checkpoint. It
requires an `aurora-tile-add-connect-matrix-visual-review/v1` document with:

- exact plan ID, contract revision/fingerprint, chunk ID, and chunk definition
  fingerprint;
- exact pending-capture attempt identity and artifact SHA-256 values;
- `verdict=verified`;
- `requestedAreaLegible=true`;
- `declaredFixtureLayoutVisible=true`;
- `noUnexpectedBlankFailedBridgeOrPlaceholderTiles=true`;
- `cameraFramingAccepted=true`;
- reviewer identity, review timestamp, and
  `aurora-toolset-prove` skill-suite contract version.

Missing, stale, mismatched, or negative review state never advances the
checkpoint. Acceptance clears `pendingCapture`, appends exactly the current
chunk ID, advances the cursor by one, and records the accepted review binding.

## Runtime-build binding for v8

For `path-node-aware-v8`, `checkpoint.pendingCapture`, the independent visual
review, and the accepted/rejected review ledger entry each carry the complete
`aurora-tile-add-connect-runtime-build-binding/v1` already embedded in the
immutable plan. The exact JSON value must match; a profile id alone is not a
sufficient binding.

The accepted frame must contain `runtimeBuildProof.status=verified`, the same
expected binding, and the raw frontend DOM, backend-proxy, and backend-direct
observations. It must also contain equal preflight and post-capture summaries
from a fresh local source-manifest rehash. All static build fields must equal
the profile, proxy and direct backend observations must agree, and
`processStartedAt` must be a valid ISO timestamp no earlier than the profile
build. Missing/null identity, origin drift, source drift, stale/restarted
process, mismatched review binding, or any later artifact/profile hash drift
rejects staging or acceptance without advancing the checkpoint.

Historical v7 captures are not upgraded by documentation or ledger edits.
They remain inspectable evidence for their original plan only; a v8 acceptance
requires a fresh profile-bound capture and fresh independent review.

## Recovery of the legacy false acceptance

`recover-last-rejected --blocker <path>` is read-only unless `--execute` is
present. It is valid only when:

- the blocker schema is
  `aurora-tile-add-connect-matrix-visual-blocker/v1`;
- the blocker and checkpoint bind the same immutable plan;
- the blocker chunk is exactly the final captured chunk and the manifest chunk
  at `nextChunkIndex - 1`;
- every blocker-bound artifact still exists with its recorded SHA-256;
- the blocker effective checkpoint is exactly one less than the raw
  checkpoint;
- no pending capture exists.

Execution writes a durable recovery record before atomically restoring the
effective cursor and captured-ID prefix. It never deletes or overwrites the
rejected evidence. Repeating the same exact recovery is idempotent. Any plan,
chunk, hash, cursor, or prefix mismatch fails closed.

## PathConnect invariant

Capture, review, rejection, and recovery operate only on add/render coverage.
They never mutate row-level `pathConnect`, never increment accepted
PathConnect coverage, and never infer native connectivity from canvas
appearance. `PathConnect` remains `missing` without the approved immutable
Toolset/NWN differential profile and primary cross-edge evidence.

## Required tests

1. A runtime framing unit test reproduces a logical 4x2 Area with a small mesh
   island hundreds of units away. The Area-anchored camera remains legible,
   the mesh stays visible and unchanged in the scene, and the complete outlier
   telemetry is retained.
2. A terrain mesh whose XZ AABB intersects the footprint is included in full,
   including legitimate horizontal overhang and full vertical extent.
3. Missing footprint evidence rejects the runtime refit.
4. The raw agent proof gate rejects `runtime_bounds_outlier`.
5. Matrix capture stages without advancing the checkpoint.
6. Exact visual review advances one chunk; mismatched hashes, plan, chunk,
   negative checks, and review schema do not.
7. Recovery dry-run is non-mutating; exact execution rewinds one legacy false
   acceptance; wrong or stale blockers do not.
8. Focused matrix, proof-safety, frontend framing/coverage, and regression
   tests remain green.
