# VFX TXI Cycle Global Frame Clock Audit (2026-08-07)

## Scope

This Aurora-first audit covers the runtime clock for TXI
`proceduretype cycle`. The implementation scope is shared model material
behavior: ordinary placeables, items, creatures, and models instantiated by
the canonical VFX Chunk lane. It does not add an effect-name, VFX-row, emitter,
or Fireball-specific branch.

## Source admission

- Primary binary: admitted Aurora Toolset `nwtoolset.exe`.
- Binary SHA-256:
  `4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24`.
- Decompiled source:
  `C:/Projects/New Folder/export/decompiled_all.c`.
- Decompiled-source SHA-256:
  `36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572`.
- xoreos was not consulted. There is no `secondary-gpl-reference`
  observation in this audit.

## Recovered behavior

### Procedure construction

`FUN_00a9dce8` parses `proceduretype`. The `cycle` token constructs its
procedure object through `FUN_00a9b3a4`.

`FUN_00a9b3a4`, decompiled-source lines `926065-926078`, initializes:

- the FPS field at offset `+0x3c` to `1.0`;
- the current frame at `+0x40` to `0`;
- the time accumulator at `+0x44` to `0`.

### Per-frame update

`FUN_00a9b478`, decompiled-source lines `926102-926124`, establishes the
runtime order:

1. The procedure must be active (`+0x39 != 0`).
2. The procedure compares its last-update field at `+0x08` with the global
   renderer frame identifier `DAT_00d05aa8`.
3. The same procedure object is updated at most once for that renderer frame.
4. The global frame delta `DAT_00cc3234` is added to the accumulator at
   `+0x44`.
5. A frame advances only when `1.0 / fps < accumulator`; equality does not
   advance because the native comparison is strict.
6. On advance, the accumulator is reset to zero. Residual time is not carried
   into the next atlas frame.
7. The frame becomes `(frame + 1) % (width * height)` and is submitted to the
   texture procedure target.

## Gap in Aurora Web before this slice

`createAuroraTextureCycleRuntime` calculated
`floor(objectElapsedSeconds * fps) % frameCount` independently for every model
root. That differs from the recovered runtime in three material ways:

- it carries fractional residual time instead of dropping it after a step;
- it has no strict native threshold;
- multiple roots sharing one `THREE.Texture` can overwrite the resource with
  different object-local elapsed times in the same renderer frame.

The canonical VFX Chunk renderer applies TXI sidecars but does not advance a
cycle procedure for static or runtime-frame Chunk groups.

## Implementation contract

The shared Three adapter must keep cycle state by `THREE.Texture` identity,
because that is the delivered runtime resource shared by cloned model
materials. The workspace animation loop must issue one monotonically
increasing frame serial per update and pass it to every model runtime. A
texture records the last serial it accepted and refuses duplicate updates in
that frame.

The state transition must use delta time, the strict native threshold, reset
the accumulator to zero after one step, and advance at most once per renderer
frame even when a large delta is supplied. Canonical Chunk roots must register
the same shared runtime and therefore inherit the same guard.

## Diagnostics and acceptance

Dev/runtime metadata must expose the current frame, accumulator, last renderer
frame serial, update count, and the primary-source label. Acceptance requires:

- a unit regression for strict threshold and dropped residual time;
- a unit regression proving that two roots sharing one texture cannot update
  or rewind it twice in one renderer frame;
- a canonical VFX Chunk regression proving that TXI cycle advances through
  the shared adapter;
- existing model-material, canonical renderer, workspace integration, and
  TypeScript checks remain green.

Visual proof is required only with an exact fixture whose delivered Chunk or
ordinary model actually carries a multi-frame TXI `cycle` sidecar. Replaying
row 22 Fireball would not exercise this change and is therefore forbidden as
false evidence. An existing NWN recording must be reused when a matched
fixture is available.

## Status

Primary-source audit and shared implementation are complete. Cycle state now
lives on the delivered `THREE.Texture`, ordinary model roots register with one
workspace renderer-frame clock, and canonical VFX Chunk roots use the same
runtime. The implementation covers placeables, doors, items, creatures, and
static or animated canonical Chunk instances without an effect-specific
branch.

Dev telemetry exposes the cycle reference, current frame, accumulator, last
renderer-frame serial, and frame-advance count on roots and textures. The
workspace container also exposes registered object counts, identifiers, and
references so duplicate or missing registration fails visibly during proof.

## Verification

- TDD began with three failures: equality advanced too early, two roots could
  rewind one shared texture, and canonical Chunk never advanced its cycle.
- Shared texture/material, canonical renderer, and workspace canonical routing
  suites: `130/130` passed.
- Focused creature and ordinary-model runtime clock checks: `2/2` passed.
- Asynchronously loaded ordinary placeable integration check: `1/1` passed.
- Frontend TypeScript check: passed with `npx tsc --noEmit`.
- Frontend production build: passed.

Matched retail visual proof remains open until a source-exact multi-frame TXI
`cycle` fixture and saved retail oracle are selected. Row 22 Fireball was not
replayed because it does not exercise this contract; using it would be false
evidence rather than a comparison.
