# VFX Explosion burst-count frontend parity audit

Date: 2026-08-13  
Policy: Aurora-first; no xoreos or other GPL secondary source was used

## Scope

This audit checks the shared frontend emitter presentation path against the
already recovered Aurora `Explosion` particle-count contract. It applies to
catalog VFX and source-MDL emitters attached to placeables; it is not a
row-44-only override.

## Primary Aurora evidence

`FUN_00a31ca4` is the Toolset `Explosion` update:

- `C:\Projects\New Folder\export\decompiled_all.c:857152-857297`;
- the detonate latch gates one burst;
- the recovered x87 conversion result is used directly as the burst-loop
  count;
- particle resets reuse the shared emitter reset path;
- `lifeExp` is not multiplied into the burst count.

The corresponding backend implementation is
`resolveExplosionRequestedCount()` in
`backend/src/modules/vfx/domain/aurora-vfx-runtime-state.ts`. It uses
truncate-toward-zero on evaluated `birthrate`.

## Independent row-44 runtime observation

The regenerated row-44 payload uses retail model `vim_explacid.mdl`, SHA-256
`64c610ac4ebce0f7c0b79af2432e430943fe5280db5948df8300a2360cb7c6d3`.
Its runtime frames report:

- `sparks`: peak active count `30`;
- `acid`: peak active count `50`;
- each emitter receives one consumed detonate latch despite duplicate
  model-header callbacks;
- both return to zero active particles.

This independently agrees with direct truncated `birthrate`, not
`birthrate * lifeExp`; both emitters have `lifeExp = 0.1 s`.

## Repaired discrepancy

The shared frontend placeable/source-MDL preview previously computed
`round(clamp(birthrate * lifeExp, 0, 48))`. That produced `3` and `5` for the
row-44 source values and introduced an unrelated 48-particle semantic cap.

The frontend now:

1. requires the existing positive drawable-lifetime gate;
2. computes the requested `Explosion` burst as
   `max(0, trunc(evaluatedBirthrate))`;
3. preserves the exact source count without the historical 48 cap;
4. exposes `explosion-truncated-birthrate-source-count` in renderer
   telemetry.

Canonical comparison rendering already consumes backend runtime frames and
therefore already carried the row-44 peaks `30/50`. This repair closes the
parallel source-MDL/placeable presentation path so both routes use the same
Aurora count semantics.

## Regression

`workspaceObjectMeshLayer.vfxRenderMode.test.ts` uses
`birthrate = 2.75`, `lifeExp = 0.1`, and an explicit detonate keyframe. The old
formula produced zero and muted the burst; the repaired path produces exactly
two particles and records the new telemetry mode.

## Remaining proof boundary

This audit proves burst-count semantics. It does not by itself promote exact
row-44 pixel parity. Camera, omitted source player, unresolved tile instances,
retail RNG-stream alignment, and material/postprocess matching remain separate
comparison concerns.

