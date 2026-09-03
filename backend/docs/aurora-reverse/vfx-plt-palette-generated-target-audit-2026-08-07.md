# VFX PLT palette and generated-target audit (2026-08-07)

## Decision

Status: `implementation-authorized-from-primary-aurora-evidence`.

This audit closes the previously unknown Aurora semantics for PLT palette
assembly, PLT output alpha, generated-target format, and sampler state. The
implementation scope is shared texture infrastructure used by VFX, Chunk
models, placeables, creatures, and items. No effect row, model resref, or
Fireball-specific branch is authorized.

No xoreos source was used. All behavioral claims below come from the approved
Aurora Toolset binary or immutable active-retail resources.

## Immutable evidence

- Toolset binary SHA-256:
  `4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24`.
- Active retail KEY:
  `C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/data/nwn_base.key`
  SHA-256 `09CDAFB6DBFB9CDB544993154C514C65EF9FD5BE4E0C1B8FD971ED05AFF90935`.
- Retail palette resources, all uncompressed 32-bit TGA, 256 by 176 pixels,
  descriptor `8`:

| Resource | SHA-256 |
|---|---|
| `pal_skin01.tga` | `78ba81891b576c213390b01c04ed157fed7b9a21f5e67ca1eabb0c830f3ea86c` |
| `pal_hair01.tga` | `1ebf3fb816efe7367afc012de2dc95876fc0f0ae97b78a0eb9db01772f619eda` |
| `pal_armor01.tga` | `7d2cf58c2c03524c5361ba9a323d5c5281237645336d0f8b8bd21f045a542469` |
| `pal_armor02.tga` | `c7be9533b3e3709186ca86e8b2bf807d39bf877a2919b1aaa4262cca95580bef` |
| `pal_cloth01.tga` | `9b37b1016a23b935e3eeddb9c2e6a14c276364f3f65f54184c6852036609430a` |
| `pal_leath01.tga` | `9b37b1016a23b935e3eeddb9c2e6a14c276364f3f65f54184c6852036609430a` |
| `pal_tattoo01.tga` | `9b37b1016a23b935e3eeddb9c2e6a14c276364f3f65f54184c6852036609430a` |

- `vs_pltgen.shd` SHA-256
  `a7dd742a00ac8e405dd15ae1bf7b8325c372b5ddac966bde5d9e220e0d9edebd`.
- `fs_pltgen.shd` SHA-256
  `e7ddab12f97721289a7520c2cec92e0e9a39fa4ecba9b81a2f36a3d2508114ba`.

## Recovered Aurora semantics

### Palette assembly

`FUN_00aa4768` initializes seven source palettes through
`FUN_00a9be5c(0..6)`. Adjacent binary strings establish this exact order:
`pal_skin01`, `pal_hair01`, `pal_armor01`, `pal_armor02`, `pal_cloth01`,
`pal_leath01`, `pal_tattoo01`.

`FUN_00a9be5c` grows the master palette to `(index + 1) * 256`, loads the
source, and unconditionally calls `FUN_00a390e4` before copying it.
`FUN_00a390e4` reverses rows; `FUN_00a391b8` is a plain copy. Therefore every
source palette, including `pal_armor01`, uses the same row reversal.

The resulting master palette is RGBA, 256 by 1792 pixels. PLT layers map to
source blocks as follows:

| PLT layer | Semantic | Retail source |
|---:|---|---|
| 0 | skin | `pal_skin01` |
| 1 | hair | `pal_hair01` |
| 2 | metal1 | `pal_armor01` |
| 3 | metal2 | `pal_armor02` |
| 4, 5 | cloth1, cloth2 | `pal_cloth01` |
| 6, 7 | leather1, leather2 | `pal_leath01` |
| 8, 9 | tattoo1, tattoo2 | `pal_tattoo01` |

### PLT generation and alpha

The active retail fragment shader samples the two-channel PLT source, selects
the master-palette block through `PLTscheme[int(ColorPLT.g * 255.0 + 0.5)]`,
uses the PLT color byte as the horizontal palette coordinate, and writes the
entire sampled `vec4`. Palette alpha is therefore runtime data. It must not be
replaced with `255`.

### Generated target and sampler

The PLT branch in `FUN_00a9f0f8` uploads the PLT source as
`GL_RG/GL_UNSIGNED_BYTE` and allocates a same-size
`GL_RGBA/GL_UNSIGNED_BYTE` output attached to `GL_COLOR_ATTACHMENT0`. It runs
`vs_pltgen` and `fs_pltgen`, then generates mipmaps when the texture mipmap
flag is set.

Defaults from `FUN_00a9cf30` and state mapping in `FUN_00a6ee64` are:

- wrap S/T: `GL_REPEAT`;
- magnification: `GL_LINEAR`;
- minification with mipmaps: `GL_LINEAR_MIPMAP_LINEAR`;
- mipmap generation enabled;
- anisotropy enabled for the linear+mipmap lane.

The target is ordinary RGBA, not an sRGB internal target. Aurora Web must keep
the generated PLT `DataTexture` in `THREE.NoColorSpace`; material color-space
conversion must not be baked into this generation step.

## Current implementation gaps found

1. `auroraPltPaletteData.ts` contains RGB-only tables and names an unapproved
   helper viewer as their generator, despite the bytes being retail-derived.
2. Layer 2 (`metal1`) is the only embedded table not row-reversed, contradicting
   the unconditional native path.
3. `decodeAuroraPltTexture` forces output alpha to `255` after every palette
   lookup.
4. The shared texture loader marks generated PLT textures as sRGB.
5. Creature telemetry labels the retail palette source as
   `nwn_mdl_webviewer` instead of the immutable retail KEY/BIF source.

## Authorized implementation boundary

1. Generate all ten embedded RGBA layer tables directly from the seven active
   retail TGA resources, with the native row reversal applied uniformly.
2. Preserve palette RGBA, including alpha, in every decoded PLT pixel.
3. Configure generated PLT textures as linear RGBA with Aurora's recovered
   repeat/linear/trilinear/mipmap/anisotropy state.
4. Replace helper-viewer provenance with `aurora-retail-key-bif` and retain
   immutable source hashes in the generated module.
5. Apply the behavior through the shared PLT decoder and texture loader only.

## Proof boundary

Unit tests and generated-byte/hash checks can prove this recovered contract.
They are not visual parity proof. A visual PLT comparison remains
`diagnostic-only` until paired with a saved retail/Toolset/NWN oracle showing
the same PLT asset, material rows, actors, camera, and timing. Existing NWN
VFX recordings must not be replayed or recaptured merely to claim this stage.

## Implemented result

- `auroraPltPalette.ts` now admits exactly 256 by 176 by 4-byte RGBA tables
  and exposes one RGBA resolver.
- `auroraPltTextureDecoder.ts` preserves palette alpha per pixel.
- `workspaceObjectMeshLayer.ts` uses the same RGBA contract for its existing
  creature PLT bridge; its generated texture no longer has a separate
  RGB/opaque behavior.
- `placeableThreeAssetLoader.ts` and the creature bridge configure generated
  PLT textures as linear RGBA with repeat, linear magnification, trilinear
  minification, mipmaps, and bounded anisotropy.
- `generate-aurora-plt-palette-data.ts` verifies the active KEY and all seven
  TGA hashes before regenerating all ten native-row-reversed RGBA tables.
- Retail provenance is now `aurora-retail-key-bif`; the unapproved helper
  viewer attribution has been removed from code and tests.

The generated module is 2,404,197 bytes and has SHA-256
`0AF1F3256C88DFC2D080064651404548DD19F9487D5FF793BCB30643F54FF9BA`.
Two consecutive generator runs produced that exact hash. The generated table
payload is 1,802,240 bytes across ten layers.

## Verification

- Deliberate red test before implementation: palette alpha `7` was returned
  as `255`; generated PLT texture color space was `srgb` instead of linear.
- Item/raw decoder and shared placeable texture tests: `52/52` passed.
- Focused creature retail-palette bridge tests: `2/2` passed, including final
  pixel alpha values `78` and `24`.
- Frontend `npx tsc --noEmit`: passed.
- Backend `npx tsc --noEmit`: passed.
- Frontend production build: passed.
- Backend production build: passed.

Primary-source palette proof:

- report:
  `evidence/vfx-plt-rgba-2026-08-07/aurora-retail-vs-aurora-web-plt-layer2-rgba-v79.json`;
- image:
  `evidence/vfx-plt-rgba-2026-08-07/aurora-retail-vs-aurora-web-plt-layer2-rgba-v79.png`;
- image SHA-256:
  `E68C84CDC72A98B6A720B81F7AE472B8D3C6CE4DB82197D36265611794288453`;
- active-retail `pal_armor01.tga` was decoded independently and compared with
  generated layer 2 as 256 by 176 RGBA;
- mismatched channels: `0` of `180224`;
- maximum channel delta: `0`;
- generated layer-2 SHA-256:
  `B6000EE6FF8FB3CA5E9B9CD3244119AFE746F787B4FCCC52FBC6CBCC3CAB7F91`.

This proves retail source identity, orientation, and RGBA preservation for the
previously incorrect `metal1` layer. It is not a scene/runtime parity claim.

The full pre-existing creature render test file is not claimed clean: an
unfiltered run still contains unrelated fixture/telemetry failures in the
shared dirty worktree. The two PLT cases were run independently and pass.
