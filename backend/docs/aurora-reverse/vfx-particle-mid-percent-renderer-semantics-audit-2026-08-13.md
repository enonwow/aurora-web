# VFX particle mid/percent renderer semantics audit

Date: 2026-08-13

Status: Aurora semantic recovered; shared correction implemented and regression-tested.

## Scope

This Aurora-first audit covers particle-age interpolation for `colorMid`,
`alphaMid`, `sizeMid`, `sizeMid_y`, `percentStart`, `percentMid`, and
`percentEnd`. The result applies to every textured source-MDL emitter,
including effect and placeable hosts. It is not a row-specific visual rule.

No xoreos source was used. NWN and Toolset were not launched.

## Primary Aurora evidence

Primary source:

`C:\Projects\New Folder\export\decompiled_all.c`

Admitted binary:

`C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\bin\win32\nwtoolset.exe`

SHA-256:

`4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24`

Decompilation SHA-256:

`36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572`

- The emitter parser preserves direct, key, and bezier-key variants of the
  midpoint and percent families through the ordinary controller helpers.
  Recovered destinations are `colorMid -> 0x1d8`, `alphaMid -> 0x1d4`,
  `percentStart/Mid/End -> 0x1e4/0x1e5/0x1e6`, `sizeMid -> 0x1e8`, and
  `sizeMid_y -> 0x1ec` (`decompiled_all.c:883906-884379`).
- The textured-particle draw path `FUN_00a2e250` builds interpolation flags
  only for start/end color, alpha, X size, and Y size
  (`decompiled_all.c:856086-856110`).
- For positive lifetime it derives one clamped particle-age fraction from the
  particle age lane and lifetime reciprocal. RGB, alpha, X size, and Y size
  are each evaluated as `end * age + start * (1 - age)`
  (`decompiled_all.c:856240-856317`).
- The inspected renderer contains no read of the midpoint or percent source
  destinations. Byte-adjacent percent offsets prove preservation, not units
  or a piecewise curve.

## Aurora Web gap

The backend canonical runtime already follows the recovered start/end rule.
The frontend source-MDL presentation path instead applies a piecewise
start/mid/end curve, with `percent*` as breakpoints, to particle RGB, alpha,
X size, and Y size. It labels that behavior as preview-only in telemetry but
still uses the result for final pixels. This makes Web output diverge from the
admitted Aurora renderer whenever those preserved fields are present.

## Implementation contract

1. Preserve midpoint and percent values, timelines, API transport, source
   provenance, and debug telemetry.
2. Do not use those fields to evaluate canonical textured-particle age color,
   alpha, X size, or Y size.
3. Evaluate those lanes with the recovered clamped linear start/end rule.
4. Expose telemetry that says midpoint/percent data is preserved but ignored
   by the admitted renderer path; do not call the behavior a runtime curve.
5. Keep animated start and end controller values active at emitter elapsed
   time. This correction changes particle-age interpolation, not controller
   timeline preservation.
6. Add a regression whose midpoint values differ sharply from the linear
   start/end result and prove that final RGB, alpha, and size ignore them.

## Acceptance

- The new regression fails against the former piecewise preview sampler and
  passes after the shared correction.
- Existing placeable/VFX renderer regressions and the frontend production
  build pass.
- No retail playback is repeated for this source-level semantic correction.
  A later fresh Web proof must be paired with an existing saved NWN MP4 before
  any visual parity claim.

## Implementation result

- The shared source-MDL presentation path now samples particle-age RGB,
  alpha, X size, and Y size only from the animated start/end controller values.
- Midpoint and percent source values, timelines, transport fields, and
  provenance remain intact. Development telemetry reports them as
  `particle-mid-source-preserved-renderer-ignored` and
  `particle-percent-source-preserved-renderer-ignored`.
- The backend canonical runtime already followed the recovered rule. A
  mirrored regression now locks preservation and start/end-only rendering on
  both sides of the backend/frontend contract.
- The correction has no effect-, row-, model-, or host-category branch and
  therefore applies to canonical VFX and placeable-hosted source-MDL emitters.

## Verification

- The focused frontend regression was observed failing against the former
  midpoint sampler before the implementation changed.
- Frontend VFX renderer suite: `124/124` passed with
  `VITE_BACKEND_API_BASE_URL=http://127.0.0.1:3000`.
- Backend emitter runtime suite: `100/100` passed.
- Frontend production build: passed.
- No Toolset, NWN, or Web playback was launched for this source-level slice.
  Visual status remains unchanged until a fresh Web capture is compared with
  the corresponding saved NWN MP4.
