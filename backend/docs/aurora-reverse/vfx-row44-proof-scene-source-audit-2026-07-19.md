# VFX row44 proof-scene source audit

Date: 2026-07-19

## Scope

This audit decides which saved retail Area resources may be admitted into the
Aurora Web comparison fixture for visual-effects row 44,
`VFX_IMP_ACID_S`. It does not change particle runtime semantics, infer an exact
camera transform, or launch NWN or the Aurora Toolset.

## Primary evidence

- Approved NWN oracle module:
  `C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_vb_row44.mod`
  - SHA-256:
    `b8e03c0b9e1708467d57ff1b652b4c83df9c38638b0773d15033dc7448c8c790`
- Fresh offline source pack:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row44/nwn/source-scene/enon-test-effect-row44-source-pack-20260719`
- Original source-module source pack:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row44/nwn/source-scene/enon-test-effect-row44-source-module-pack-20260719`
- Approved one-trigger script:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row44/nwn/scripts/vb44shot.nss`
- Saved camera setup script:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row44/nwn/scripts/vb44entry.nss`
- Approved saved retail video:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row44/nwn/nwn-row44-one-trigger-approved-recapture.mp4`

No xoreos source or other GPL secondary reference was used.

## Recovered source facts

The approved row44 module contains:

- Area `enon_test_effect`;
- entry position `(9.5, 3.799999952316284, 0)` facing `(0, 1)`;
- target creature `nw_innkeeper`, tag `effect_test`, at `(9.5, 6.8, 0)`,
  bearing `90` degrees;
- immediately before the one impact call, `vb44shot.nss` executes
  `SetFacingPoint(GetPosition(oSource))` for the target. With source
  `(9.5, 3.8, 0)` and target `(9.5, 6.8, 0)`, the proof-frame target forward
  vector is Aurora XY `(0, -1)`; the static GIT bearing is not the active
  runtime orientation;
- row44 impact applied once at `GetLocation(oTarget)`;
- a two-by-two `tin01` Area with tile rows
  `(107, orientation 2)`, `(147, orientation 3)`,
  `(364, orientation 1)`, and `(364, orientation 0)`;
- moon ambient `0x3c3c3c` and moon diffuse `0xaaaaaa`.

The approved module ARE SHA-256 is
`ccdf7a3e02ac9eb304e45833cf2c1f11fc18e0829d372e7f2e8550c7e40d279d`.
The GIT SHA-256 is
`bd3637343c89bb7c719a260cd61d07f5774be21a9b840107451abe9c046df8e6`.

The exact module resource precedence resolves tile 107 to
`tin01_h01_02` and tile 147 to `tin01_h01_03` from `nwn_base.key`.
Tile id 364 is not resolved by the exact row44 module source pack. Therefore
the Web proof scene may admit the two resolved base tiles only. Importing the
two `gin01_h01_08` instances from a different module's HAK list would falsely
claim exact row44 scene coverage.

The target-centered Web coordinate contract subtracts the target location
`(9.5, 6.8, 0)` from the Area tile centers. The admitted translations are:

- tile 107: `(-4.5, -1.8, 0)`;
- tile 147: `(5.5, -1.8, 0)`.

The renderer then applies the established Aurora-to-Three coordinate mapping
`C=(x,z,y)`.

## Explicit open context

- The player appearance is modular and is not reconstructed in this fixture.
- The target resolves to direct source model `c_yinnkeep`, supermodel `a_ba`,
  and source animation `pause1`. A static bind-pose proxy is not accepted as
  comparison proof.
- Tile ids 364 remain omitted because the exact row44 module source pack does
  not resolve them.
- Local tile lights are not reconstructed.
- `SetCameraFacing(180, 5.5, 45)` and `SetCameraHeight(1.1)` are saved facts,
  and the installed retail `nwscript.nss:6968-6984` defines direction,
  distance, and pitch at the script boundary. The saved runner summary records
  `cameraProfileApplied=false`, however, and the saved frame does not establish
  the exact Aurora internal view matrix. The Web proof may therefore use a
  source-to-target perspective calibrated against the saved frame, but it must
  report `retail-capture-calibrated-camera-transform-not-exact`.

## Implementation contract

The row44 Web fixture must:

1. copy only the two admitted base-tile models and their source textures;
2. record the exact module, ARE, and GIT hashes;
3. center the scene at the row44 target location;
4. record two admitted and two unresolved tile instances;
5. reconstruct the target from `c_yinnkeep` plus `a_ba/pause1`, place it at the
   target origin, and map the scripted Aurora forward vector `(0, -1)` to the
   direct model's positive-Z front;
6. preserve the omitted source/player declaration;
7. leave camera, source/player, local-light, and unresolved-tile gaps open;
8. retain one-trigger, no-loop, no-overlap proof requirements.

## Fresh Web proof status

The 2026-07-19 v5 capture includes the source-backed target actor and reuses the
approved saved NWN MP4 without launching NWN:

- accepted raw Aurora Web MP4:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row44/aurora-web/aurora-web-row44-one-trigger-animation-origin-60fps-exact-base-scene-target-actor-observability-v5-20260719.mp4`;
- observability summary:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row44/aurora-web/aurora-web-row44-one-trigger-animation-origin-60fps-exact-base-scene-target-actor-observability-v5-20260719-summary.json`;
- visible-onset comparison:
  `evidence/vfx-nwn-broad-proof-2026-07-16/comparisons/nwn-vs-aurora-web-row44-exact-base-scene-target-actor-visible-onset-aligned-v5-20260719.mp4`.

The raw canvas recording contains 279 encoded frames over an approximately
32.36 fps container timeline even though runtime steps were requested at 60
fps. The comparison therefore uses a separately hashed, frame-order-preserving
60 fps presentation derivative. The apparent long Web tail in the uncorrected
comparison was a container-timeline artifact, not evidence for changing Aurora
particle lifetime. The corrected comparison still shows a larger, brighter
initial Web burst and a broader, more circular late cloud.
