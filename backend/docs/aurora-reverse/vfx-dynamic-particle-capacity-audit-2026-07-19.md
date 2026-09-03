# VFX Dynamic Particle Capacity Aurora-First Audit

Date: 2026-07-19
Status: primary behavior confirmed; implementation authorized

## Scope

This audit covers one global runtime defect:

- Aurora Web currently treats a fixed `64` value as an emitter particle-count
  limit;
- the inspected Aurora runtime uses dynamically growing active and free pointer
  lists instead;
- the fix must apply to all emitter families and source-MDL placeable replay.

Persistent AOE ownership, native WOK AABB/BSP traversal, exact placeable plume
tuning, particle depth-input activation, and production actor-animation
attachment are outside this slice. Their open evidence requirements remain
unchanged.

## Rules and source policy

The rules-first, Aurora-first, no-guessing, contract-first, test-first, and
diagnosability-first gates were applied.

xoreos was not used. This audit contains no
`sourceClass: secondary-gpl-reference` observation.

Primary evidence:

- `sourceClass: primary-aurora-reverse`
  - `C:/Projects/New Folder/export/decompiled_all.c`
  - SHA-256:
    `36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572`
- `sourceClass: primary-aurora-web-runtime`
  - current runtime and catalog replay implementation in this repository.

## Confirmed Aurora behavior

### Active and free list capacity

`FUN_00a2dab0` at `decompiled_all.c:855182-855203` appends one particle pointer
to an active/free list.

When `count == capacity`:

1. zero capacity grows to `0x10` (`16`);
2. non-zero capacity doubles;
3. `FUN_00a28ee4` reallocates only when the requested capacity is larger;
4. existing entries are copied into the new allocation;
5. append then increments count and stores the pointer.

The inspected paths expose no fixed emitter-level `maxParticles` check.
Fountain and Explosion consume the free list before allocating a new particle.
Single and Lightning keep their own family-specific count rules and must not be
used as a global cap.

### Particle reset

The particle reset path at `decompiled_all.c:852698-852829` and
`853157-853216` initializes current and previous position when a particle is
activated. Reused free-list particles pass through the reset path before
returning to the active list.

### Separate render capacity

The textured-particle vertex buffer grows independently to fit
`drawParticleCount * 6`. It is not evidence for a particle-count cap.

## Current defect

Aurora Web currently:

- defaults every emitter to `particleLimit = 64`;
- silently rejects Fountain spawns after that count;
- truncates Explosion bursts to the remaining count;
- clamps Lightning point count to the same value;
- applies the same fixed value to source-MDL placeable replay;
- omits a source-initialized `previousPosition` on spawn.

This can alter emitter density, family timing, wave visibility, and placeable
output without a diagnostic.

## Authorized implementation

1. Track `activeCapacity` and `freeCapacity` separately.
2. Initialize each capacity to `0`.
3. Grow the selected list to `16` on first append, then double until the
   requested count fits.
4. Reuse free-list particles before allocating a new particle.
5. Remove the fixed value from canonical Fountain, Explosion, and Lightning
   count math.
6. Initialize `previousPosition` from the source spawn position.
7. Retain a separate server execution budget for resource safety.
8. Emit a diagnostic when that budget prevents allocation.
9. Treat the budget as project policy, never as Aurora runtime semantics.

## Evidence boundary

The following are not authorized by this audit:

- inventing a canonical maximum particle count;
- deriving density from viewport size, quality settings, or proof appearance;
- changing source `birthrate`, `lifeExp`, Explosion detonate count, or
  Lightning segment count;
- implementing native WOK BSP traversal;
- changing Fireball chunk lifetime or late atlas sprite timing;
- using xoreos, PoC code, or external authoring tools as runtime authority.

## Contract

The additive FE-BE contract is recorded in
`vfx-particle-execution-budget-contract-v1-2026-07-19.md`.

## Required verification

- unit tests for `0 -> 16 -> 32 -> 64 -> 128` list growth;
- a Fountain regression with more than `64` simultaneous active particles;
- Explosion and Lightning regressions proving no implicit `64` clamp;
- free-list capacity and reuse tests;
- spawn `previousPosition` test;
- schema and cache-key tests for the execution budget;
- service-level source-MDL replay test;
- focused backend build and VFX unit/regression suites;
- one fresh Aurora Web playback after the implementation, reusing saved NWN
  references without launching NWN.

## Verification results

### Runtime and contract tests

- focused backend suites: `298/298` passed;
- backend TypeScript build: passed;
- row 68 fixture maximum active particle counts:
  - `sunbeam`: `66`;
  - `Sparkles`: `16`;
  - `Explosion01`: `64`;
  - `Explosion`: `45`.

The `sunbeam` result is the visual-proof fixture that crosses the removed
fixed limit. It does not assert that `66` is a canonical Aurora cap.

### Saved NWN reference policy

No NWN or Toolset process was launched for this verification. The existing
single-trigger recordings were reused:

- row 68:
  `evidence/vfx-nwn-web-row68/nwn/nwn-row68-one-trigger.mp4`;
- row 22:
  `evidence/vfx-nwn-web-row22/nwn/nwn-row22-one-trigger.mp4`.

Both recordings remain morphology references only because they do not preserve
one runtime timestamp per captured frame.

### Fresh Aurora Web proofs

Row 68 accepted proof:

- capture:
  `evidence/vfx-nwn-web-row68/web/web-row68-one-trigger-v14-dynamic-capacity.mp4`;
- SHA-256:
  `cb33b443e5b8bd785f7a5195c9648000edf834a0f9e6713e36cc5699ccc61320`;
- status: `valid-single-playback-web-proof`;
- trigger count: `1`;
- loop: `false`;
- clean post-roll: `true`;
- all emitters end with zero active particles: `true`;
- source-light receiver delta: `12.6482`, threshold `5.0`;
- comparison:
  `evidence/vfx-nwn-web-row68/nwn-vs-aurora-web-row68-comparison-v8-dynamic-capacity.png`.

Row 68 capture `v13-dynamic-capacity` is explicitly invalid. It omitted the
diagnostic receiver while the validator required a receiver-light measurement.
The comparison generator now rejects any Web input whose validated status is
not `valid-single-playback-web-proof`.

Row 22 fresh regression:

- capture:
  `evidence/vfx-nwn-web-row22/web/web-row22-one-trigger-v63.mp4`;
- SHA-256:
  `32c60ce2b9325cd33075f244c8c812c2b04e77cbe2fc48ff3d47254a6508c903`;
- status: `diagnostic-only-single-playback-open-context-gaps`;
- trigger count: `1`;
- loop: `false`;
- clean post-roll: `true`;
- comparison:
  `evidence/vfx-nwn-web-row22/nwn-vs-aurora-web-row22-comparison-v63.png`.

### Open visual differences

- row 68 Web visible span is `1.518 s` versus `1.417 s` in the saved NWN
  encoding, a `+0.101 s` difference under the shared pixel metric;
- row 68 Web output remains more spatially compact and has a cooler white
  core;
- row 22 still has open camera, actor, tile-local-light, exposure, scale, and
  tail-shape differences;
- no pixel-parity or shared-runtime-time claim is made for row 22.
