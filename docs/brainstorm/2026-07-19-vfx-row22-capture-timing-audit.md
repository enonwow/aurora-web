# VFX Row 22 Capture Timing Audit

Date: 2026-07-19
Status: implementation scope verified

## Activated rules

- Rules-first, Aurora-first, no-guessing, test-first, diagnosability-first,
  visual differential parity, and proof-capture safety.
- No backend/frontend contract change is required for this proof-tooling fix.
- xoreos was not used. There is no
  `sourceClass: secondary-gpl-reference` observation in this scope.

## Primary evidence

- Retail row 22 source model: `vff_explfire.mdl`.
- Aurora decompilation particle lifecycle, atlas, alpha, blend-lane, and chunk
  evidence recorded in
  `backend/docs/aurora-reverse/vfx-aurora-first-implementation-readiness-r90.md`.
- Saved single-trigger NWN capture and trigger ledger under
  `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22/nwn/`.
- Capture implementation at
  `C:/Projects/nwn/VFX/scripts/source-scripts/run-skrytobojca-mark-nwn-proof.py`.

All entries above are `sourceClass: primary-aurora-reverse`,
`sourceClass: primary-retail-resource`, or
`sourceClass: primary-retail-capture`.

## Finding

The retired NWN capture path acquired frames in a wall-clock loop but wrote
every accepted frame to a fixed 12 fps `VideoWriter`. It did not persist one
runtime timestamp per encoded frame. Acquisition cost and skipped intervals
therefore make container PTS unsuitable as NWN runtime time.

The saved summary contains only sparse elapsed fields (`firstGameplay`,
`midElapsed`, and `bestElapsed`). The selected best-frame image is not a
validated onset/peak anchor for the row 22 lifecycle metric. A global playback
speed factor derived from those fields would be an unsupported assumption.

## Scope decision

- Do not change Aurora Web particle lifetimes, alpha, chunk cleanup, or source
  animation timing from this MP4's encoded duration.
- Do not publish a NWN-versus-Web visible-span delta for this fixture.
- Keep the saved NWN MP4 as a single-trigger qualitative retail reference.
- Compare onset-relative encoded frame progression only, with no shared-time
  labels and no runtime-duration parity claim.
- Continue to use retail MDL/TXI/shader data and Aurora decompilation as the
  implementation authority for fireball timing.

## Diagnosability

The comparison manifest must record:

- `VFX_RETAIL_CAPTURE_FRAME_TIMESTAMPS_MISSING`;
- `VFX_RETAIL_CAPTURE_PTS_NOT_RUNTIME_TIME`;
- `canMapRuntimeTimeToVideoPts: false`;
- `canCompareRuntimeDurations: false`;
- exact encoded onset/frame indices used for qualitative comparison;
- camera, scene, owner, and target context gaps.

## Test-first gate

`backend/test/differential-parity/test_vfx_row22_oracle_timing.py` covers
missing timestamps, sparse-field rejection, frame-count mismatch, and
index-only progression labels.

Verification completed:

- timing audit tests: 4/4 passed;
- canonical renderer tests: 53/53 passed;
- frontend production build: passed;
- fresh Web `v62` capture: one playback, no loop, clean post-roll;
- Web capture validator: capture valid, comparison context still incomplete;
- saved NWN MP4: reused without rerunning NWN.

Durable audit:

`backend/docs/aurora-reverse/vfx-row22-fireball-aurora-first-proof-audit-2026-07-19.md`

## Worktree note

The repository already contains a large shared dirty worktree on
`codex/tile-cud-proof-completion`. This scope is limited to VFX comparison
scripts, their differential-parity test, and the two documentation records.
No branch transition is performed because it would carry unrelated user work
into a misleading branch scope.
