# VFX particle deadspace camera-orientation audit

Date: 2026-08-13

Status: Aurora semantic recovered; shared implementation and fresh paired proof
complete; visual parity remains open.

## Scope

This Aurora-first audit covers the `deadspace` branch used while resetting an
ordinary particle. The immediate evidence case is row 50 `VFX_IMP_DEATH`,
whose `sparks` emitter has `deadspace=0.2094399929`, non-zero spread, and
`Aligned_to_Particle_Dir` rendering. The rule is shared by effect and
placeable emitters and must not become row-specific tuning.

No xoreos source was used. NWN and Toolset were not launched; the approved
saved NWN MP4 remains the retail visual oracle.

## Primary Aurora evidence

Primary source:

`C:\Projects\New Folder\export\decompiled_all.c`

Admitted binary:

`C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\bin\win32\nwtoolset.exe`

SHA-256:

`4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24`

- `FUN_00a2625c`, `decompiled_all.c:852762-852822`, copies the emitter
  quaternion into the particle, applies `FUN_00a264c0`, and derives particle
  velocity from the final quaternion local-Z axis. Deadspace therefore changes
  runtime orientation and can change motion; it is not a render-only cull.
- `FUN_00a264c0`, `decompiled_all.c:853007-853151`, reads active camera
  position from the global camera object, normalizes `particlePosition -
  cameraPosition`, and activates the correction only when the source
  `deadspace` float at the emitter node is non-zero.
- The same function composes the already-audited local-X spread tilt and
  local-Z azimuth first. It does not consume RNG in the deadspace branch.
- The branch derives the particle quaternion's local-Y axis, compares the
  absolute camera-direction dot product with
  `cos(pi/2 - deadspace)`, and left-multiplies a correction quaternion around
  the normalized cross product of the camera direction and local-Y axis until
  it leaves the native deadspace condition.
- Direct disassembly of `nwtoolset.exe:0x00b90834` proves that the helper
  called for the dot-product check clears the sign bit and loads the resulting
  double. It is absolute value, not `acos` and not an RNG operation.
- `deadspace` is consumed directly next to the `pi/2` radian constant. The
  source field is therefore radians. Treating it as degrees is incorrect.

The native correction angle in the non-negative absolute-dot branch is the
stored float expression `absDot - pi/2 + deadspace`. The correction quaternion
is multiplied on the left of the current particle quaternion. The final local-Z
axis is then used for velocity.

## Pre-implementation gap

The shared backend runtime currently stores the spread-composed orientation
and derives velocity before any camera/deadspace correction. Its runtime
context has no active-camera position. Consequently every canonical emitter
with non-zero `deadspace` skips a native reset stage.

The older non-canonical placeable preview has a separate camera-angle opacity
cull and converts `deadspace` from degrees. That path is neither the recovered
Aurora reset behavior nor admissible parity proof.

## Implementation contract

1. Add an optional active-camera position to the shared emitter runtime
   context in the same Aurora/source coordinate space as particle positions.
2. Preserve the existing spread RNG order and consume no new random values.
3. After spread composition, apply the recovered camera/deadspace quaternion
   correction when `deadspace != 0` and camera position is available.
4. Derive both stored `particleOrientation` and velocity direction from the
   corrected quaternion.
5. When camera context is absent, preserve deterministic behavior and emit a
   diagnosable unresolved-context warning instead of inventing a camera.
6. Proof fixtures may provide their admitted calibrated camera relative to the
   VFX owner. This is proof context, not a row-specific visual override.
7. Cache identity must include serializable camera context whenever cached
   runtime output depends on it.

## Acceptance

- A red/green runtime regression proves the corrected local-Y normal leaves
  the native deadspace condition and that local-Z velocity follows the final
  quaternion.
- A regression proves zero `deadspace` and missing camera context do not alter
  RNG order.
- The row-50 source fixture is regenerated with the calibrated proof camera,
  all contract gates pass, and exactly one fresh Web playback is recorded.
- The saved NWN MP4 is reused without launching NWN, followed by a fresh
  onset-aligned comparison and contact sheet.
- Visual status remains `matched-with-gaps` unless the paired evidence closes
  every visible difference.

## Implementation result

The shared backend runtime now accepts a serializable Aurora-space camera
position and its provenance in the emitter runtime context. Fountain reset
preserves spread RNG order, applies the recovered left-multiplied deadspace
quaternion correction without consuming RNG, and derives both stored particle
orientation and local-Z velocity from the corrected quaternion. Missing camera
context preserves the former deterministic result and emits
`VFX_PARTICLE_DEADSPACE_CAMERA_POSITION_REQUIRED` once per runtime tick.

The camera context is included in VFX cache identity and crosses the HTTP
schema/application boundary explicitly. The row-50 fixture records the exact
calibrated proof-camera conversion relative to the VFX owner; there is no row
or emitter-name condition in the runtime.

Changed contracts are covered by runtime, application, schema, and fixture
regressions. Focused backend verification passed `153/153`; the row-50 fixture
gate passed with four admitted tiles, zero unresolved tiles, one actor, and 14
textures. Focused frontend verification passed `106/106`; backend and frontend
production builds passed.

## Fresh paired proof

The no-playback static preflight passed runtime identity, canonical host graph,
asset settlement, draw ledger, particle shader ledger, and proof gate. One and
only one fresh deterministic Aurora Web playback was then recorded at 30 fps:

- Web MP4:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row50/aurora-web/aurora-web-row50-one-trigger-deadspace-camera-v17-20260813.mp4`
  (`SHA-256 9a09cbf72291d10b406d5557388aadbb3b9fdcb9f06ff6ea99f3644e1c4016e7`).
- Saved NWN oracle, reused without launching NWN:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row50/nwn/nwn-row50-one-trigger-approved-recapture.mp4`
  (`SHA-256 a1a9df16a51579f01ac1399435ceb0c770b4887e684b7e4364198cabbeb84bd8`).
- Onset-aligned paired MP4:
  `evidence/vfx-nwn-broad-proof-2026-07-16/comparisons/nwn-vs-aurora-web-row50-deadspace-camera-v17-onset-aligned-20260813.mp4`
  (`SHA-256 9749fa6f9b0fa95d74506385af2848c88230a278e3ca042b79a46070ab1e3461`).
- Contact sheet:
  `evidence/vfx-nwn-broad-proof-2026-07-16/comparisons/nwn-vs-aurora-web-row50-deadspace-camera-v17-onset-aligned-20260813-contact-sheet.png`
  (`SHA-256 8ea000b6b8f2850ec0b09955391887228d407c736ac5249128ff609e5485739c`).

The Web proof reports one trigger, loop disabled, overlap count zero, completed
playback, `postDurationHidden=true`, zero terminal draws, and an empty blocker
manifest. The paired result is `matched-with-gaps`: Web loses the tall bright
column too quickly after onset, retains a more concentrated lower-body tail,
and does not yet match retail luminance and environmental spill. Those image
differences do not invalidate the recovered deadspace semantic and do not
authorize row-specific timing or color tuning.
