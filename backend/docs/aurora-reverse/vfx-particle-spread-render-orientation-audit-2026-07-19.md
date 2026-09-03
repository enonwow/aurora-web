# VFX particle spread render-orientation audit - 2026-07-19

## Decision

Aurora's ordinary Fountain particle reset stores the complete particle
orientation after composing the emitter orientation with both random spread
rotations. Aurora Web currently uses those spread samples for particle velocity
but stores only the emitter orientation in `particleOrientation`.

This is a global runtime defect for `Aligned_to_Particle_Dir`: the renderer
receives a basis that cannot reproduce the particle reset basis whenever
`spread != 0`.

## Primary evidence

Primary decompilation source:

`C:\Projects\New Folder\export\decompiled_all.c`

- `FUN_00a2625c`, `852758-852829`, copies the emitter quaternion into particle
  slots `+0x2c..+0x38`, calls the spread constructor, and then derives velocity
  from the updated quaternion.
- `FUN_00a264c0`, `853002-853151`, composes the random local-X tilt and local-Z
  azimuth into those same particle quaternion slots.
- `FUN_00a2e250`, `856495-856531`, consumes particle orientation slots
  `+0x2c..+0x38` for render mode 5 (`Aligned_to_Particle_Dir`) and derives the
  quad axes from rotated local `X` and `Z`.

The already-audited spread samples are:

- `tilt = (rand15 % (trunc(spread * 0.5 * 100) + 1)) * 0.01`;
- `azimuth = (rand15 % 628) * 0.01`;
- before emitter orientation, forward is
  `(sin(azimuth) * sin(tilt), -cos(azimuth) * sin(tilt), cos(tilt))`.

No xoreos source was used.

## Current implementation defect

`backend/src/modules/vfx/domain/aurora-vfx-runtime-state.ts` already consumes
the two source-backed spread samples in `buildInitialFountainMotion`, but
`spawnFountainParticle` independently calls
`resolveAuroraParticleRenderOrientation`, which clones only the evaluated
emitter orientation.

Consequences:

- velocity and `rotationAxis` follow the sampled spread;
- `particleOrientation` does not;
- mode 5 quads therefore use different axes from the native particle reset;
- effects with many additive mode-5 particles can form an incorrectly aligned,
  overly coherent flash.

Row 50 is directly affected: emitter `sparks` uses
`Aligned_to_Particle_Dir`, non-zero spread, and emits 25 additive particles at
the initial burst.

## Implementation contract

For the source-backed ordinary branch:

1. consume the existing two RNG samples exactly once;
2. compose local-X tilt and local-Z azimuth with the evaluated emitter
   orientation;
3. derive velocity from the same composed orientation;
4. store that complete orientation in `particleOrientation`;
5. do not add, remove, or reorder RNG samples.

The camera/deadspace rejection loop inside the later part of
`FUN_00a264c0` is not part of this correction. Its exact runtime activation
contract remains open and must not be guessed.

## Acceptance

- A deterministic runtime regression proves that one particle's stored
  orientation rotates local `Z` to its emitted direction.
- The same regression proves that local `X` receives the sampled azimuth, so a
  direction-only reconstruction cannot pass.
- Existing spread direction, rand15 modulo, emitter-orientation, runtime,
  render-contract, and fixture tests remain green.
- A fresh Web proof may be recorded only after the exact implementation
  revision passes the proof preflight. The saved NWN recording is reused
  without rerun.

## Implemented result

`buildInitialFountainMotion` now returns the complete spread-composed particle
orientation together with velocity and rotation axis. `spawnFountainParticle`
stores that orientation directly. The implementation therefore consumes the
same two rand15 samples as before and does not change particle count, cadence,
lifetime, or RNG ordering.

Verification:

- backend runtime/render/application/parser subset: `185/185`;
- frontend canonical renderer, scene, placeable adapter, and observability:
  `81/81`;
- backend and frontend production builds: passed;
- row-50 source-scene fixture gate: passed with two admitted and two unresolved
  source tiles, one actor, and fourteen scene textures;
- regenerated row-50 payload SHA-256:
  `5f0e4a441b7f4d6e5ece80cf0f1d4fb4c8c5731e4c8c66b7f47b384c4c3dbc99`;
- row-50 fixture manifest SHA-256:
  `ae1659bb0aad56c39594ddf889073564a4f3767018d5950514fb7c771a57ea0c`.

## Fresh proof v10

The first guarded capture attempt stopped before `start()` because the fresh
frontend/backend processes had no build identity. Its fail-closed manifest is:

`evidence/vfx-nwn-broad-proof-2026-07-16/row50/aurora-web/aurora-web-row50-spread-render-orientation-v10-preplayback-build-identity-blocker-20260719.json`

No playback occurred in that attempt. After both processes received the same
commit identity, a Playwright prestart readback reported `state=ready`,
`message=armed`, `elapsedSeconds=0`, identity ready, proof gate PASS, and an
empty blocker manifest. The accepted recorder then invoked the effect exactly
once.

Accepted Web artifact:

`evidence/vfx-nwn-broad-proof-2026-07-16/row50/aurora-web/aurora-web-row50-one-trigger-spread-render-orientation-observability-v10-20260719.mp4`

- SHA-256:
  `0a4874c25378976646b8e9970b992251fad8fa152748fd76eca734a436f4b693`;
- 315 deterministic frames, 30 fps, 10.5 seconds;
- exactly one trigger, loop disabled, overlap count zero;
- matching frontend/backend commit identity;
- host graph PASS, asset settlement settled, draw ledger PASS, playback guard
  PASS, proof gate PASS, empty blocker manifest;
- terminal `completed=true`, `postDurationHidden=true`, and zero visible draws.

The approved saved NWN MP4 was reused without rerun. The onset-aligned
comparison is:

`evidence/vfx-nwn-broad-proof-2026-07-16/comparisons/nwn-vs-aurora-web-row50-spread-render-orientation-onset-aligned-v10-20260719.mp4`

Comparison SHA-256:
`134e458d17ac56d020378ac26abd33ea88b5acf4e58e46996210b5ecaca77911`.

The correction is visibly effective: the Web onset no longer has the prior
shared-plane, star-like asymmetry and is rounder and more compact. It does not
close row-50 parity. Web remains larger, whiter, and more overexposed at onset;
the early body collapses into a low horizontal mist instead of the tall
translucent retail column; and the peak remains a compact saturated knot.
Normal-blend gamma-domain composition, alpha/depth behavior, local scene
lighting, bloom/postprocess, exact camera, missing scene instances, and retail
RNG remain open shared tasks. Status: `matched-with-gaps`.
