# VFX global resource-resolution audit

Date: 2026-08-07  
Status: implemented and regression-tested  
Scope: shared VFX dependency graph and broad proof-fixture provenance  
Authority: local Aurora Toolset decompilation and source-backed retail fixture manifests  
xoreos: not used

## Aurora-first classification

This change touches Aurora source semantics because an emitter's `texture`
token and `chunkName` decide different resource lanes. Implementation was
therefore admitted only against the existing primary-source audit in
`vfx-aurora-first-implementation-readiness-r90.md`.

The admitted evidence establishes:

- the emitter parser stores `texture` and `chunkName` as distinct source
  fields (`decompiled_all.c:883624-883635`);
- the emitter constructor clears the fixed `chunkName` buffer independently
  of the texture token (`decompiled_all.c:873821-873845`);
- a non-empty `chunkName` selects the chunk-particle runtime table
  (`decompiled_all.c:853960-853970`);
- `texture NULL` is a no-texture source token. It is not a file request and it
  does not select the chunk lane.

No external GPL source was consulted or used.

## Defects

The shared dependency graph treated `texture NULL` as a texture reference and
also synthesized a `NULL.txi` sidecar edge. Both edges were false unresolved
resources. Separately, the broad proof generator copied exact retail texture
and TXI files after package processing but supplied no resolver traces during
dependency-graph construction. Delivered assets therefore appeared missing in
the canonical payload.

Before the correction, the seven broad payloads contained:

- 100 dependency edges;
- 78 unresolved edges;
- 22 false `VFX_TEXTURE_RESOURCE_MISSING_DIAGNOSTIC` results;
- two false `NULL` or `NULL.txi` resource edges.

## Shared implementation

`aurora-vfx-dependency-graph.ts` now classifies `NULL` case-insensitively as an
Aurora no-texture token. It creates no texture or TXI resource edge for that
token. The emitter source edge records
`VFX_TEXTURE_NULL_NO_CHUNK_NO_TEXTURED_DRAW` when no chunk is selected, or
`VFX_CHUNKNAME_TEXTURE_NULL_STATE_SEPARATE` when a non-empty `chunkName`
independently selects the chunk lane. Real missing texture references remain
unresolved and keep their missing-resource diagnostic.

`vfx-proof-resource-traces.ts` builds proof-fixture traces from exact manifest
records for phase/source models, emitter textures, TXI sidecars, and chunk
models. Every selected candidate carries the vanilla source layer, immutable
resource hash, precedence rank, and a safe relative proof object key. The
builder never creates a candidate for a resource absent from the manifest.

`prepare-vfx-web-broad-proof-fixtures.ts` supplies those traces before package
processing. This changes no frontend/backend contract version and contains no
effect-row, Fireball, or category-specific visual tuning.

## Result

After offline regeneration, the same seven payloads contain:

- 98 dependency edges;
- 67 resolved resource edges;
- 22 source-only emitter edges;
- nine unresolved edges;
- zero missing-texture diagnostics;
- zero `NULL` or `NULL.txi` resource edges.

The remaining nine unresolved edges are limited to six sound resources and
three ProgFX row references that are not delivered by the current source
manifests. They remain explicit; this change does not invent audio or ProgFX
resolver candidates.

## Verification

- Focused unit suites: 14/14 passed.
- Broad resource-resolution fixture contract: passed for seven fixtures,
  exact totals 98 edges / 67 resolved / 9 unresolved / 22 source-only.
- Broad comparison-context fixture contract: passed.
- Row 44 animation-origin and source-scene contracts: passed.
- Row 50 source-scene contract: passed.
- Row 210 Lightning fixture contract: passed.

No Toolset, NWN, browser playback, screenshot, or video capture was started for
this telemetry/provenance correction. It does not claim visual parity and does
not consume a single-playback proof slot. A later renderer/runtime change must
produce the next fresh Web comparison against the already saved NWN MP4s.
