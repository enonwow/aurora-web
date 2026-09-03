# VFX Chunk shared material routing Aurora-first audit (2026-08-07)

## Status and decision

Status: `implemented-source-backed-shared-material-routing-parity-open`.

This slice depends on Aurora runtime semantics, but it does not introduce a
new unknown semantic. The admitted Toolset decompilation already proves that a
non-empty emitter `chunkName` creates a model particle and that the resulting
model is rendered through its ordinary MDL mesh/material path. Implementation
was therefore allowed after auditing the current Web routing against those
existing primary-source contracts.

No xoreos source, code, comments, or documentation was used.

## Primary evidence

- Toolset binary:
  `C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe`,
  SHA-256
  `4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24`.
- Toolset decompilation:
  `C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
  `36BB8B1031AFE2ABF23F0E18180A5AD649401D9EA5E078E5170A31A96167C572`.
- `FUN_00a28a38`, decompilation line `853365`, resolves and activates the
  model carried by a Chunk particle.
- `FUN_00a5b99c`, lines `885301-885521`, parses ordinary MDL mesh material
  inputs including `texture0`, `texture1`, `texture2`, `materialname`, and
  `renderhint` rather than replacing them with emitter texture state.
- The recovered Chunk lifecycle and ordinary-model material boundaries remain
  recorded in
  `vfx-aurora-first-implementation-readiness-r90.md` and
  `vfx-shared-mdl-material-lighting-audit-2026-08-07.md`.

## Web gap found

`auroraVfxCanonicalRenderer.ts` cloned each Chunk model instance and then
bound only the single `aurora.textureReference` field. The shared model
adapter used by placeables, creatures, items, tiles, and ordinary model
previews already understood source texture-slot metadata and the supported
diffuse, normal, specular, roughness, height, emissive, alpha, self-illumination,
and source-material-lighting branches. The canonical Chunk path bypassed that
adapter, so the same model could lose non-diffuse material inputs only when it
was used as a VFX particle.

## Implemented shared contract

- Every cloned canonical Chunk model instance now runs through
  `applyPlaceableTexturesToModel`, the existing shared Aurora model material
  adapter. No effect name, VFX row, or Fireball condition was added.
- Source textures are converted to the existing canonical GLTF `flipY=false`
  texture view before the shared adapter binds diffuse and auxiliary slots.
- Canonical Chunk routing disables the shared adapter's convenience
  single-texture fallback. A missing source reference remains missing instead
  of being replaced by an unrelated sole texture.
- The shared adapter now returns deterministic sorted resolved/unresolved
  reference telemetry. Chunk instances report `source-reference-bound`,
  `source-reference-partially-bound`, `source-reference-unresolved`, or
  `source-reference-absent` from that report.
- Model templates remain immutable; every live Chunk particle owns cloned
  material state while immutable texture views may be shared.

## Verification and limits

The test was written before implementation and initially failed because the
Chunk `normalMap` was undefined. After routing through the shared adapter:

- canonical VFX renderer: `68/68` passed;
- shared placeable/model texture mapping: `43/43` passed;
- frontend TypeScript: passed.

The regression fixture proves diffuse, normal, and emissive binding plus an
explicit unresolved height slot on two independent Chunk instances. It also
proves that the source model material is not mutated.

This closes the inline source-MDL texture-slot routing defect. It does not yet
transport a distinct per-Chunk-resource MTR/SHD/TXI sidecar package into the
canonical renderer, and it does not claim retail pixel parity. Those remain
separate implementation and matched-proof work.

The transport gap above was subsequently closed by the shared follow-up in
`vfx-chunk-mtr-shd-txi-transport-audit-2026-08-07.md`; this paragraph remains
the historical v80 boundary. Matched retail pixel proof is still open.

## Fresh one-playback proof

The guarded Web capture completed after the shell wait timeout without a retry.
Validation records exactly one Web playback, `loop=false`, no overlapping
effect, a passing runtime-observability gate, zero terminal particles, and a
clean post-roll. The approved saved NWN recording was reused without starting
NWN or Toolset.

- Web MP4 SHA-256:
  `159495202E1C073EBEEF74763AEF0E471738A722EF679694466CC057618CA47B`.
- Saved NWN MP4 SHA-256:
  `F6414E0D184131CE74836C208E6334BB62CF023C502725223758185DD41F0983`.
- Onset-aligned comparison MP4 SHA-256:
  `357B2FAA251D6D342D330FE450F19D4CEDD331C5741B559A0951752DB332C501`.
- Comparison PNG:
  `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22/nwn-vs-aurora-web-row22-comparison-v80-shared-chunk-material-routing-20260807.png`.

The capture is valid implementation evidence and confirms that live Chunk
models were rendered with bound source material state. It remains
`diagnostic-only-single-playback-open-context-gaps`: exact retail camera,
actors, full room reconstruction, and a per-frame NWN runtime-time mapping are
not established, so pixel or lifecycle parity is not claimed.
