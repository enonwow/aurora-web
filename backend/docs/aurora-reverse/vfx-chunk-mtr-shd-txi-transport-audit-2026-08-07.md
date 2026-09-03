# VFX Chunk MTR/SHD/TXI transport Aurora-first audit (2026-08-07)

## Status and decision

Status: `implemented-source-backed-shared-sidecar-transport-parity-open`.

This slice changes transport and adapter routing, not an unknown Aurora
semantic. Existing admitted primary evidence already establishes that a Chunk
particle renders an ordinary MDL model and that MTR, SHD, and TXI state belongs
to the resulting model material/resource path. Implementation was allowed only
after confirming that the backend already preserved those sidecars and that the
canonical Chunk frontend route alone omitted them.

No xoreos source, code, comments, or documentation was used.

## Primary evidence boundary

- Toolset binary SHA-256:
  `4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24`.
- Toolset decompilation SHA-256:
  `36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572`.
- `FUN_00a28a38`, decompilation line `853365`, creates and activates the
  ordinary model carried by a Chunk particle.
- The MTR parser at decompilation lines `868848-868873` preserves material
  state such as `twosided`, `sample_framebuffer`, and `volumetric`.
- The admitted scene classification and queue-consumer paths recorded in
  `vfx-full-decomp-implementation-audit-2026-07-16.md` establish the material
  lanes. The present change does not reinterpret those fields.

## Transport gap found

The catalog render package already carries:

- parsed MTR nodes in `auroraMaterial`, including the complete reachable SHD
  source graph where available;
- resolved texture bindings and parsed TXI state in `textureBindings`;
- source material names and texture slots in converted GLB extras.

The shared model-material adapter already consumes all three inputs for normal
models. Canonical Chunk creation passed only texture objects, so a model could
receive its MTR/SHD/TXI state as a placeable, creature, item, or ordinary model
and lose the same state when instantiated as a VFX Chunk particle.

## Implemented shared contract

- `AuroraVfxCanonicalRenderOptions` now carries the resolved Chunk
  `auroraMaterial` and `textureBindings` sidecar package.
- Every cloned Chunk instance passes textures, MTR/SHD state, and TXI bindings
  into `applyPlaceableTexturesToModel`; single-texture guessing remains
  disabled.
- Initial workspace creation, deferred Chunk model loading, deferred texture
  refresh, area-collision runtime refresh, and nested Chunk runtime creation
  preserve the same sidecar inputs.
- Material contracts are selected by the source resref retained in GLB extras;
  there is no VFX row, model, emitter, host, or Fireball condition.
- Template model materials remain immutable. MTR state, custom SHD installation,
  TXI sampler state, and textures are applied only to per-particle cloned
  materials.

## Verification and proof boundary

The focused regression began red because
`auroraMaterialContractSource` was absent. After implementation:

- canonical VFX renderer: `69/69` passed;
- canonical workspace integration: `16/16` passed;
- shared placeable/model texture mapping: `43/43` passed;
- frontend TypeScript `--noEmit`: passed.

The regression proves an MTR-selected diffuse slot, two-sided state, roughness,
TXI clamp/filter state, and immutable model templates in both the canonical
adapter and the production workspace path.

The full frontend production build is currently nonzero on the unrelated
`useWorkspaceCommandSignal.ts` `productionSource` type error. The project
mutation command reaches its initial dry run but stops on the unrelated viewer
authentication test before any mutant runs.

No NWN, Toolset, or Web VFX playback was started for this slice. The saved
row-22 Fireball uses `fxpa_dirt` without an MTR/SHD/TXI Chunk sidecar and would
not exercise this contract. Replaying it would therefore not be valid evidence
for the change. Matched visual proof remains open until an exact saved retail
fixture containing a Chunk model with the relevant sidecar material is
available.
