# VFX area proof render gap audit

Date: 2026-08-06

Status: Web runtime proof verified; NWN comparison `matched-with-gaps`; retail
visual parity remains open.

## Scope and source policy

This audit covers the shared Area proof renderer used for the persistent
`tm_pl_lightred` / `plc_t04` placeable VFX in `area_enon_bakery`.

- Aurora-first evidence is the existing retail Toolset/NWN decompilation cited
  by `workspaceTerrainMesh.ts`: tile main lights do not create an FX/AuroraLight
  carrier in the recovered path, while tile source lights create
  `fx_flame01` at the source-light nodes.
- The saved NWN MP4 was reused. NWN and Toolset were not started.
- xoreos was not consulted.
- No VFX parameter was tuned from visual guesswork.

## Root causes found

1. `AreaLightShadowPreviewRunner` rendered directly through
   `renderer.render`, bypassing the shared `renderRuntime` frame pipeline.
   That left canonical billboard updates and the retail scene depth target out
   of the Area proof path. The rejected v54 observability packet recorded
   `framebufferDepthStatus=unbound`.
2. `workspaceTerrainMesh` added a procedural colored `SphereGeometry` marker
   for every tile main/source light in normal rendering. The marker is a debug
   visualization and has no retail carrier for tile main lights. It produced
   the large red sphere in v55 and similar colored spheres in older Area VFX
   captures.
3. The proof runner left the runtime axes, grid, and tile overlay visible when
   `renderTerrain=true`, even though the requested debug state disabled them.
4. Earlier proof review treated structural/runtime PASS as visual parity. The
   current gate now remains separate from manual visual comparison.

## Changes

- Area proof frames use the shared `renderRuntime` pipeline.
- Tile-light marker meshes are attached only when
  `debugState.showNonRenderMeshes=true`; actual light objects and telemetry are
  unchanged.
- Area proof setup hides axes, grid, and tile overlay independently of terrain
  visibility.
- Regression coverage proves zero tile-light markers in normal rendering,
  two markers in the explicit diagnostic mode, and hidden editor layers in the
  full-terrain proof path.

## Rejected diagnostic evidence

The v55 runtime gates passed, but visual review rejected the image because the
procedural red tile-light marker was visible:

- `evidence/vfx-placeable-post-debt-2026-07-14/preflight/post-debt-enon-bakery-plc-t04-v55-shared-render-runtime-preflight-20260806.png`
- PNG SHA-256:
  `afd757a9c9cd45b886ab2214b8112d7e220896ba290cce81045573de6e220ab6`

This artifact is diagnostic only and cannot support a parity claim.

## Verified Web proof

Runtime build identity:

- commit: `348e8ff0e276-dirty-1761905f50b0659`
- source/image digest:
  `sha256:1761905f50b06597aa5f94a8d08e84bf0be1fd30c90d0be26d574f6e683430ea`

Accepted v60 facts:

- `aurora-vfx-runtime-observability/v1`: PASS
- canonical host graph: PASS, three composition roots
- asset settlement: settled
- draw ledger: PASS
- particle shader ledger: PASS
- `fire!02` and `OmenEmitter240`: scene depth bound and matching the active
  retail scene target
- playback guard: three roots, three triggers, one trigger per root, no loop,
  zero overlap
- deterministic video: 10 seconds, 80 frames, 8 FPS
- tile-light marker occurrences: zero
- editor axes/grid/overlay: hidden

Artifacts:

- Web MP4:
  `evidence/vfx-placeable-post-debt-2026-07-14/post-debt-enon-bakery-plc-t04-v60-clean-area-10s-8fps-proof-20260806.mp4`
  - SHA-256:
    `dbb60ab98af03c74ac8780681ed8c2722afc26c15d8b70d2427bc4d45c4a005f`
- Web frame manifest:
  `evidence/vfx-placeable-post-debt-2026-07-14/post-debt-enon-bakery-plc-t04-v60-clean-area-10s-8fps-proof-20260806.frame.json`
  - SHA-256:
    `82a29256af4762a93dab0e43e2ecb5447c87151a5c0c16c7666271d5bc9ccc32`
- Visually reviewed preflight PNG:
  `evidence/vfx-placeable-post-debt-2026-07-14/preflight/post-debt-enon-bakery-plc-t04-v59-clean-area-camera-preflight-20260806.png`
  - SHA-256:
    `a2c55d2076ed6622f3e4977796d2421351c2f5f4fca280ec2fb2790b64eefc60`

## NWN comparison

Reused retail oracle:

- `artifacts/source-mdl-emitter-oracle/retail-source-mdl-emitter-plc-t04-ovens-removed.mp4`
- SHA-256:
  `1599bd2d42a4f9dfd1a3806332b5939ef4cedb6cb5700572298d254bf65f27c8`

Comparison artifacts, NWN left and Aurora Web right:

- MP4:
  `evidence/vfx-nwn-broad-proof-2026-07-16/comparisons/nwn-left-vs-aurora-web-right-plc_t04-v60-clean-area-20260806.mp4`
  - SHA-256:
    `cbc74c1f8efbaead5059ab6e908905fad446496b0e8a51552be117e613f9d13f`
- t=5 PNG:
  `evidence/vfx-nwn-broad-proof-2026-07-16/comparisons/nwn-left-vs-aurora-web-right-plc_t04-v60-clean-area-t5-20260806.png`
  - SHA-256:
    `3adaf2529f65a028be5dfdddfffb95f6d8844c9cd09fee5d6db326b9612dba30`

Verdict: `matched-with-gaps`, not canonical parity.

Visible open gaps:

1. The Web Area contains three persistent source instances; the saved retail
   camera exposes two. Cardinality and occlusion are not matched.
2. The Web flame/smoke plume is substantially narrower and dimmer.
3. Receiver illumination and overall Area exposure differ materially.
4. The dark static core is not visually equivalent across the corresponding
   visible hosts.
5. Camera pose, character/prop occlusion, and exact receiver framing remain
   unmatched, so pixel correlation would be misleading.

## Next Aurora-first boundary

Do not tune width, alpha, luminance, core geometry, or receiver lighting from
this unmatched comparison. First establish a retail/Toolset capture with the
same visible host count and a reproducible camera/receiver context, or document
the relevant Aurora render-stage decompilation for each remaining visual
property. Only then promote a source-backed renderer correction and recapture
one Web playback.

## Verification

- Focused VFX, Area proof, canonical renderer, and tile-light unit suite:
  5 files, 73 tests passed.
- TypeScript contract check: `npx.cmd tsc --noEmit` passed.
- Production frontend build: `npm.cmd run build` passed.
- Runtime capture proof-gate contract test: passed; six invalid playback
  variants and three invalid static-preflight variants were rejected.
- The full unit suite is not green in the current shared worktree: 110 tests
  failed across unrelated and concurrently changed scene, creature, and VFX
  expectations. The focused tests for this correction remain green.
- The full regression-smoke suite is not green in the current shared
  worktree: 59 tests failed, including fixtures that rendered empty object
  catalogs (`Doors (0)` and `Placeables (0)`).
- Stryker could not create `frontend/.stryker-tmp` in the sandbox (`EPERM`).
  The requested elevated retry was declined, so no mutation score is claimed.
