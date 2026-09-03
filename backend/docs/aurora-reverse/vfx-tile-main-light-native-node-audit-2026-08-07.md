# VFX tile main-light native-node Aurora-first audit (2026-08-07)

## Decision

`Tile_MainLight1` and `Tile_MainLight2` select the native `ml1` and `ml2`
light nodes already stored in the tile MDL. Aurora resolves the two RGB rows
through `lightcolor.2da`, then passes both colors and the tile transform to the
tile model instance. The native MDL light supplies position, radius,
multiplier, priority, and dynamic-object flags.

Aurora Web currently preserves the RGB rows but discards those native light
nodes and renders no main-light `PointLight`. This is a shared scene-lighting
defect affecting VFX, placeables, creatures, and terrain. Per-effect emitter,
alpha, lifetime, or texture tuning must not compensate for it.

No xoreos source was used.

## Primary Aurora evidence

### Toolset decompilation and machine code

Admitted binary:

- `nwtoolset.exe` SHA-256
  `4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24`;
- source class: `primary-aurora-decompilation`.

`FUN_007125ec` in
`C:/Projects/New Folder/export/decompiled_all.c:453281-453610` resolves the
bytes at tile offsets `+0x40` and `+0x41` through `lightcolor.2da`. Read-only
PE disassembly of `0x007125ec..0x0071338c` confirms that
`0x007130ab..0x007130ca` invokes the tile model-instance virtual slot `+0x1c`
with:

1. the tile model instance/owner;
2. the tile transform at tile offset `+0x2c`;
3. the first resolved main-light RGB triplet;
4. the second resolved main-light RGB triplet.

The following virtual slot `+0x20` handles the separately created source-light
carriers. `fx_flame01` is created only for `sourcelight1/2`; that does not mean
the main-light lanes lack runtime light nodes. Their carriers are the tile
model's own `ml1/ml2` nodes.

### Exact row-22 retail tile models

The existing project parser `parseAuroraMdlVfxSource` was run against the
saved exact retail sources. It identifies these source-backed native lights:

| Model | SHA-256 | Node | Aurora-local position | Radius | Multiplier | Priority |
| --- | --- | --- | --- | --- | --- | --- |
| `tin01_h01_02.mdl` | `8ae4f2d60f64752bf02926460c848cc991b01b2b9b386868d75d7ec36a892e52` | `TIN01_H01_02ml1` | `(0, 0, 5)` | `14` | `1` | `5` |
| `tin01_h01_02.mdl` | same | `TIN01_H01_02ml2` | `(1.85351, -3.25102, 4)` | `5` | `1` | `5` |
| `tin01_h01_03.mdl` | `2c3132f25b0f3c49631f581edd3233a927855e3ae9f4ecaf90f88a7862490cc0` | `TIN01_H01_03ml1` | `(0, 0, 5)` | `14` | `1` | `5` |
| `tin01_h01_03.mdl` | same | `TIN01_H01_03ml2` | `(-3.69958, 2.56579, 4)` | `5` | `1` | `5` |
| `gin01_h01_08.mdl` | `bd5b843f05b58fdc78f24ef5561c470f6b92fe666d76ebf563110cbfe1812616` | `gin01_h01_08ml1` | `(0, 0, 5)` | `14` | `1` | `5` |
| `gin01_h01_08.mdl` | same | `gin01_h01_08ml2` | `(-3.69958, 2.56579, 4)` | `5` | `1` | `5` |

All six nodes have `ambientOnly=false`, `dynamicType=0`,
`affectDynamic=true`, and `shadow=false`. Their color controller is replaced
by the selected ARE/`lightcolor.2da` lane; the remaining native light
properties stay model-owned.

### Conversion loss

The converted row-22 GLBs contain neither `KHR_lights_punctual` nor the
`ml1/ml2` nodes. The current production path therefore cannot recover their
position or radius from the loaded GLB. The source MDL must be parsed before
conversion and its light contract carried across the backend/frontend
boundary.

## Superseded interpretation

The 2026-07-20 local tile-lighting audit and the static-main-light follow-up in
the broad light/shadow audit concluded that main-light rows were static
metadata with no point-light carrier. That conclusion observed correctly that
Aurora does not create an `fx_flame01` carrier for main lights, but it did not
inspect the tile model's native light nodes or the model-instance vcall that
receives both RGB lanes. This audit supersedes that narrow interpretation.

## Implementation contract

1. Non-zero `Tile_MainLight1/2` rows resolve RGB through `lightcolor.2da`.
2. `mainLight1` binds only to the tile MDL native `ml1` node and `mainLight2`
   only to `ml2`; a missing node stays explicitly unresolved.
3. Position, radius, multiplier, priority, `ambientOnly`, `affectDynamic`, and
   shadow flags come from the exact source-precedence MDL.
4. The MDL's Aurora-local Z-up transform is composed with tile translation,
   quarter-turn orientation, and the production proof render frame exactly
   once.
5. Production Area rendering and comparison fixtures use the same typed
   native-node payload. No tile-center fallback may claim parity.
6. Runtime telemetry distinguishes `main-native-node-resolved` from
   `main-native-node-unresolved` and reports source model key/hash and node
   properties.
7. Main and source lights share Aurora's recovered linear radius falloff
   `color * max(0, 1 - distance / radius) * multiplier`.
8. Custom/module/HAK model precedence is preserved. A vanilla node must not be
   substituted for a higher-precedence custom model with the same resref.

## Expected effect and limits

This closes one global scene-context gap and should materially change VFX and
receiver illumination in all affected areas. Source-light slot-count semantics
are now closed separately by
`vfx-tile-source-light-slot-count-audit-2026-08-07.md`. Exact camera,
owner/target actor, SSAO, wall/ceiling fade, and retail RNG parity remain open.
A fresh single-playback Web proof must reuse the existing NWN MP4 and remain
diagnostic until those independent gaps are closed.
