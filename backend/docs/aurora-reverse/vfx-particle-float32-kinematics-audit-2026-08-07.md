# VFX particle float32 kinematics audit

Date: 2026-08-07

Status: primary-source-backed shared runtime correction complete; fresh visual
comparison captured with open parity gaps

## Scope

This Aurora-first audit checks whether the shared Aurora Web particle runtime
preserves the storage precision used by Aurora for spatial particle state. It
applies to ordinary Fountain, Explosion, and Single emitters, P2P, Lightning,
Motion Blur, collision, Chunk transforms, and emitter inheritance. It does not
contain a visual-effects row, model, emitter-name, or Fireball special case.

The approved saved NWN recordings were not replayed. NWN, Toolset, and Aurora
Web playback were not started during this implementation slice. xoreos was not
used.

## Primary evidence

Primary source:
`C:\Projects\New Folder\export\decompiled_all.c`, SHA-256
`36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572`.

- Particle reset `FUN_00a2625c` stores position at particle offsets
  `+0x08/+0x0c/+0x10`, copies it to previous position at
  `+0x5c/+0x60/+0x64`, clears rotation at `+0x14`, and stores velocity at
  `+0x50/+0x54/+0x58` (`decompiled_all.c:852744-852822`).
- The shared active-particle updater declares its spatial temporaries as
  `float` and reads the same position and velocity fields
  (`decompiled_all.c:854630-854760`).
- Its ordinary integration path stores velocity-scaled displacement in float
  temporaries, combines it with the float position, and writes the resulting
  position back to `+0x08/+0x0c/+0x10`
  (`decompiled_all.c:854846-855044`).
- Gravity and collision reflection are written back to the same float velocity
  fields; collision nudges are added to the stored float position
  (`decompiled_all.c:855045-855130`).

These anchors establish float storage boundaries for particle position,
previous position, velocity, direction/orientation-related state, and
collision results. They do not establish the initial retail RNG seed.

## Gap found

Aurora Web already stored particle age, normalized age, interpolation, and
several scheduler values through `Math.fround`. Spatial state was still held
as unrestricted JavaScript doubles in multiple shared branches. That allowed
small drift to accumulate differently in ordinary particles, trails, P2P,
Lightning, inherited motion, and collision.

The red regression demonstrated the boundary directly: source values such as
`0.1`, `0.2`, and `0.3` remained exact JavaScript numbers before this change,
instead of the 32-bit values stored by Aurora.

## Implementation

`backend/src/modules/vfx/domain/aurora-vfx-runtime-state.ts` now uses shared
float32 vector storage helpers at the recovered boundaries:

- particle spawn position, previous position, velocity, rotation, and
  inherited velocity;
- ordinary Fountain, Explosion, and Single integration;
- P2P drag, gravity, Bezier position, direction, and velocity;
- Lightning jitter and cached source/target transforms;
- inherited emitter-frame transforms and Motion Blur history;
- collision query results, reflected velocity, final position, contact normal,
  and direction.

The helpers are family-neutral. They round operands/results at the float
temporary or particle-field boundaries represented in the decompilation.

## Verification

- `aurora-vfx-runtime-state.spec.ts`: 95/95 passed.
- Related application, render-contract, effect-instance, beam, AoE,
  object-duration, dependency-graph, and resolver-trace suites: 107/107 passed.
- Seven broad fixtures regenerated offline.
- Broad comparison-context gate: 7/7 passed.
- Row 44 animation-origin gate: maximum active counts 30/50/2 and zero final
  active particles.
- Row 44 and row 50 source-scene gates passed.
- Row 210 Lightning gate passed with native 3/65-point lanes.
- Global resource gate remains passing: 98 edges, 67 resolved, 9 explicitly
  unresolved, 22 source-only, with unresolved classes limited to sound and
  ProgFX-row references.
- `npm run build` passed in `backend`.

## Remaining boundary

Exact retail RNG seed/state is still unavailable from the admitted source and
saved MP4s. It remains an explicit open gap and was not inferred from images.
A Web-only capture is not a parity proof.

## Fresh row 22 proof

The guarded static preflight passed with runtime identity ready, canonical host
graph PASS, assets settled, draw and particle-shader ledgers PASS, single-play
guard PASS, final overlay disabled, and an empty blocker manifest. The accepted
capture then invoked exactly one deterministic Web playback; it did not launch
or rerun NWN.

- Web MP4:
  `web-row22-one-trigger-v75-shared-float32-kinematics-20260807.mp4`, SHA-256
  `c9a96bf544241685d11f3d278d39cbc560a907bf0f8f0c921711daf8b673f20b`.
- Saved NWN MP4 reused without rerun, SHA-256
  `f6414e0d184131ce74836c208e6334bb62cf023c502725223758185dd41f0983`.
- Onset-aligned encoded-sequence comparison MP4, SHA-256
  `846dce3e6c304a20d347f5528df891a0a3195b45ccc77c4b5fc239b7d303d36c`.

The Web capture has 187 frames at 12 fps, one trigger, no loop or overlap, a
clean post-roll, and zero final active particles for all six emitters. Its
collision ledger records 1208 queries, 187 applied hits, 1021 static no-hits,
and all eight Chunk particles landing and disappearing.

Visual review still finds a compact low Web onset, a broader and more saturated
Web peak, and a stronger red/smoke/Chunk tail than the encoded NWN progression.
The saved NWN MP4 lacks one runtime timestamp per captured frame, so those
encoded-frame differences do not authorize lifecycle retuning. Status remains
`diagnostic-only-single-playback-open-context-gaps`, not parity.
