# VFX tile source-light animation selection audit (2026-08-06)

## Decision

Aurora Web's tile source-light color path is incorrect. `Tile_SrcLight1` and
`Tile_SrcLight2` do not select a row from `tilecolor.2da` at runtime. They
select a numeric animation on the `fx_flame01` carrier model. The selected
`AuroraLight01` animation color is the source-light RGB.

This is a shared proof-scene defect. It changes illumination received by VFX,
placeables, creatures, and terrain, so per-effect alpha, lifetime, spread, or
texture tuning must not be used to compensate for it.

## Primary evidence

No xoreos source was used.

### Aurora Toolset decompilation and machine code

Admitted binary:

- `nwtoolset.exe` SHA-256:
  `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`
- source class: `primary-aurora-decompilation`

`FUN_007125ec` in
`C:/Projects/New Folder/export/decompiled_all.c:453281-453610`:

1. loads `lightcolor.2da` only for the two main-light RGB lanes;
2. creates `fx_flame01` carriers named `sourcelight1` and `sourcelight2` for
   non-zero bytes at tile offsets `+0x42` and `+0x43`;
3. formats each source byte with the literal `%i`;
4. sends the resulting string to the carrier animation-selection call with
   playback rate `1.0` and trailing arguments `0, 0`;
5. performs the following update/start call with rate `1.0`.

Read-only PE inspection confirms the decompiler's damaged call arguments:

| Lane | byte load | `%i` formatter call | animation vcall | follow-up vcall |
| --- | --- | --- | --- | --- |
| `sourcelight1` | `0x007131ec`, `[ebx+0x42]` | `0x007131f8`, `FUN_00b8ac6c` | `0x00713217`, slot `+0x18`, arguments `name, 1.0, 0, 0` | `0x00713229`, slot `+0x14`, argument `1.0` |
| `sourcelight2` | `0x00713314`, `[ebx+0x43]` | `0x00713320`, `FUN_00b8ac6c` | `0x0071333f`, slot `+0x18`, arguments `name, 1.0, 0, 0` | `0x00713351`, slot `+0x14`, argument `1.0` |

The PE strings are:

- `0x00c9a90f`: `fx_flame01`
- `0x00c9a91a`: `sourcelight1`
- `0x00c9a927`: `%i`
- `0x00c9a92a`: `fx_flame01`
- `0x00c9a935`: `sourcelight2`
- `0x00c9a942`: `%i`

### Retail model resource

Source:

- `data/nwn_base.key -> fx_flame01.mdl`
- SHA-256:
  `9814d45381cab7ecb5f47f9b16bdeb23b983687ff0b9bcb0244ffc04034dfecf`
- source class: `primary-retail-resource`

The existing project MDL parser finds one light, `AuroraLight01`, with radius
`7`, shadow radius `15`, vertical displacement `2`, priority `4`, and fifteen
numeric animations. Their constant color timelines are:

| animation | RGB |
| --- | --- |
| `1` | `2.0, 2.0, 2.0` |
| `2` | `0.94, 0.94, 0.50` |
| `3` | `1.90, 1.90, 1.0` |
| `4` | `0.72, 0.87, 0.56` |
| `5` | `1.40, 1.80, 1.40` |
| `6` | `0.65, 0.96, 0.91` |
| `7` | `1.30, 1.92, 1.82` |
| `8` | `0.70, 0.70, 1.20` |
| `9` | `1.40, 1.40, 2.40` |
| `10` | `0.92, 0.65, 0.92` |
| `11` | `1.84, 1.30, 1.84` |
| `12` | `1.0, 0.50, 0.50` |
| `13` | `2.0, 1.20, 1.20` |
| `14` | `1.0, 0.75, 0.30` |
| `15` | `1.85, 1.20, 0.60` |

### Default light multiplier

Admitted binary:

- `nwmain.exe` SHA-256:
  `3b7cb1252e0edb2ce22d7971f333aade027039ae30a45b4bc64732c3e6bec73a`
- source class: `primary-retail-binary`

The exported `PartLight::PartLight` constructor at `0x140087e00` writes
`1.0f` to `PartLight+0xa8` at `0x140087ea2`. The exported
`GetLightAdjustedRadius` at `0x14007f480` multiplies the radius by
`PartLight+0xa8` at `0x14007f4aa`. Therefore the absent `multiplier`
controller in the admitted `fx_flame01.mdl` has an independently confirmed
runtime default of `1.0`; it is not an unresolved neutral fallback.

## Rejected implementation

The previous path resolved source-light row `N` through `tilecolor.2da` and
then used a diagnostic `multiplier=1` fallback. That table is not read by
`FUN_007125ec` for source-light runtime creation.

For the row-22 proof scene, source-light row `3` was consequently rendered as
`[0.49, 0.29, 0.07]` instead of the selected `fx_flame01` animation color
`[1.9, 1.9, 1.0]`. This made the entire Web scene darker and changed VFX and
placeable receiver illumination.

## Implementation contract

1. A non-zero `Tile_SrcLight1/2` byte selects the same numeric
   `fx_flame01` animation name.
2. The selected `AuroraLight01` animation color, not `tilecolor.2da`, supplies
   RGB.
3. The admitted retail model uses multiplier `1.0` from the `PartLight`
   constructor default.
4. Production Area rendering and the frozen NWN-comparison proof-scene path
   must share the same resolver.
5. Telemetry must expose row, animation name, model hash, multiplier source,
   and whether stale `tilecolor.2da` input was corrected.
6. Unknown or custom source-model animations must fail visibly or preserve an
   explicitly labelled fallback; they must not silently claim vanilla parity.

## Expected effect

This closes a global scene-light color/intensity defect. It does not close the
remaining exact-camera, unresolved source-node transform, static main-light,
SSAO, shadow, or retail RNG gaps, and it does not justify per-effect tuning.

## Implementation and verification

The shared implementation now:

- resolves all fifteen admitted numeric `fx_flame01` animations in
  `auroraTerrainTileSourceLight.ts`;
- loads numeric `AuroraLight01` animation colors from the ordered
  `fx_flame01.mdl` source in the Area backend contract;
- uses the same resolver in production terrain rendering and the frozen
  NWN-comparison scene;
- corrects historical `tilecolor.2da` proof-manifest input and exposes that
  correction in runtime telemetry;
- carries model filename/hash, animation, multiplier source, and proof status
  through the backend/frontend Area contract.

Verification on 2026-08-06:

- frontend related set: `85/85` tests passed, including all fifteen animation
  rows, stale-manifest correction, production tile lights, comparison scene,
  HTTP boundary, and scene diagnostics;
- backend focused repository regression passed and both backend/frontend
  production builds passed;
- a wider backend set exposed an unrelated stale cache-version assertion
  (`v14-global-lighting` expected versus current `v16-aurora-worldtimer`); it
  is outside this VFX correction and was not rewritten here.

## Fresh one-playback proof

Saved NWN was reused without rerun:

- `evidence/vfx-nwn-web-row22/nwn/nwn-row22-one-trigger.mp4`
- SHA-256 `f6414e0d184131ce74836c208e6334bb62cf023c502725223758185dd41f0983`

Fresh Aurora Web v66:

- `evidence/vfx-nwn-web-row22/web/web-row22-one-trigger-v66-source-light-20260806.mp4`
- SHA-256 `684a1a4a3f04c2d8938795f8231dafc48d2b6dcc10189dabc75ffed9ab0b0dea`
- exactly one playback, loop disabled, `301/301` runtime frames, zero final
  particles, clean post-roll;
- `aurora-vfx-runtime-observability/v1`: identity ready, canonical host graph
  PASS, assets settled, draw ledger PASS, playback guard PASS, proof gate PASS,
  and an empty blocker manifest.

Comparison:

- onset-aligned MP4:
  `evidence/vfx-nwn-web-row22/comparisons/nwn-vs-aurora-web-row22-v66-source-light-20260806-source-scene-onset-aligned.mp4`
- comparison SHA-256:
  `7fabb4f63b2f9c6263f43959e06eb69951208f6bf54d663512ef6349d315f1af`
- impact sheet:
  `evidence/vfx-nwn-web-row22/comparisons/nwn-vs-aurora-web-row22-v66-source-light-20260806-impact-contact-sheet.png`
- impact-sheet SHA-256:
  `d28c0c35e5901856e55ce9c992a07cb5c106d29b173dbedb1c6d8a6221360127`

This is accepted runtime proof and a valid diagnostic comparison, not pixel
parity. The exact camera, owner/target actors, five unresolved tile source-light
node transforms, six static main-light lanes, wall/ceiling fade, and shared NWN
runtime timestamps remain open. The Web fireball is still more compact and
white at peak, has a stronger ring, and receives a darker scene context.
