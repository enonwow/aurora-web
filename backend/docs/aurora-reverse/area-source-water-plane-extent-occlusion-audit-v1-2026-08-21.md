# Area source water-plane extent occlusion audit v1 (2026-08-21)

Status: source-asset-backed defect diagnosis; implementation may preserve the
source mesh by moving Aurora Web's own extent backing below it. This audit does
not claim retail water animation, shader, reflection, refraction, or blend
parity.

## Question

Why do the `atj02` `CaravelFloating_3x1` and `CaravelDocked_3x2` groups render
their ships and docks but show black cells where the SET definition declares
water?

This is an Aurora-semantic task because the safe correction depends on whether
the model really supplies a water surface or whether Aurora synthesizes one.
The investigation therefore preceded implementation. No xoreos source was
used.

## Immutable inputs

- tileset definition catalog:
  `output/proof/area-tileset-definition-catalog-v1-2026-08-21`, catalog id
  `4955c0a52001a342df14770bb8c7a25acda50d47153891127def8225e90f9c71`;
- exact `atj02` definition: all four terrain corners of tile ids
  `517..523` used by groups `group120` and `group121` are `water`;
- exact source model examined: `atj08_a03_01.mdl`, object key
  `modules/current/__aurora/sources/tiles/hak/lc_legacy_tiles/atj08_a03_01.mdl`,
  162,714 bytes, SHA-256
  `307cb2111983d07e5487a6ef5f3538c20373c7d43985fd3caa09cea3b3eb2c32`;
- exact derived model examined:
  `aurora-mdl-to-glb_v18-source-proven-texture-aliases/atj08_a03_01.glb`,
  394,528 bytes, SHA-256
  `5ecde4a06c8854ccef459d3d471e9e34903721dbd4263bfe0b3cd3707fd2f90a`;
- rejected browser capture:
  `output/proof/tile-add-connect-matrix-v5-offline-catalog-2026-08-21/captures/atj02-group-chunk-0004.canvas.png`,
  SHA-256
  `ee8b5feba448c91709376520196d0ef3abf2033018987b99c8afacefea91c383`;
- rejection review:
  `atj02-group-chunk-0004.visual-review.json`, SHA-256
  `0922a817bb93cd2696b63b59d17d546c6031ffbd00ed349611919fbe4aa14efd`,
  code `DECLARED_WATER_TERRAIN_RENDERED_AS_BLACK_VOID`.

## Source and derived-model findings

The source-preserving GLB contains both of the expected authored meshes:

1. `WaterPlane03v`
   - source node type `trimesh`, source parent `atj08_A03_01`;
   - `render=1`, `rotatetexture=1`, `transparencyhint=0`;
   - texture reference `atj01_water01`;
   - four vertices, six indices, two triangles;
   - bounds `(-5,-1,-5)..(5,-1,5)` Aurora units;
   - vertex normals `(0,1,0)` and positive-Y triangle winding.
2. `UnderWater03v`
   - `render=1`, texture reference `atj01_watcliff`;
   - bounds cover the tile at `Y=-3.4` Aurora units;
   - normals and triangle winding also face positive Y.

The model is scaled by `0.1` in the workspace renderer. The visible water plane
therefore lies at workspace `Y=-0.1`; the under-water layer lies at `Y=-0.34`.
The source model already supplies the water geometry. Synthesizing a replacement
ImageMap2D plane would duplicate source content and is not justified.

The material-delivery contract is complete. Exact source texture
`atj01_water01`, object SHA-256
`b787acb8a73c0afd8664b095681e67f7b5c82b7201cb5ab8187607cb880955d3`,
decodes through the production Aurora decoder as 64x64 `tpc-dxt1`, has no alpha,
has RGB range `(55..99, 61..97, 58..99)`, and has zero near-black pixels under
the `<12` threshold. The black capture therefore is not the water bitmap.

The decompiled retail parser at
`C:/Projects/New Folder/export/decompiled_all.c:885353-885385` independently
confirms that `transparencyhint`, `render`, `rotatetexture`, and `tilefade` are
source mesh/material fields. This audit preserves those fields and makes no new
runtime-material inference from them.

## Aurora Web defect

Aurora Web creates an opaque renderer-owned Area extent fill at workspace
`Y=-0.018`. It subsequently lowers that fill when it discovers a lower
source-authored ground surface. The discovery predicate recognizes ground,
floor, pavement, grass, dirt, road, plank, sand, snow, earth, mud, path, stone,
and wood tokens, but not water.

Consequently `WaterPlane03v` is not admitted as source ground. The extent fill
remains at `-0.018`, above the authored water at `-0.1`, and occludes it. Ships
and docks remain visible because their geometry rises above the fill. This
matches the rejected capture exactly.

## Admitted implementation rule

`water` is an explicit source-ground-surface token when it occurs in source
mesh, source texture reference, mesh name, or material name and the normal
ground-surface guards have not classified the mesh as a ceiling or void mask.
The existing geometry predicate still requires a low/thin surface unless the
source token is explicit.

The renderer-owned extent fill must be lowered to at least
`minimum source-ground Y - 0.018`. This rule is asset-identity-neutral: it does
not branch on `atj02`, `atj08`, group ids, tile ids, model resrefs, or filenames.
It preserves the source water plane rather than creating replacement geometry.

## Required regression and proof

- A focused unit regression constructs a source-authored `WaterPlane` at Aurora
  `Y=-1`, scales the model to workspace units, and requires the extent fill to
  move from `-0.018` to `-0.118`.
- Existing ground, ceiling, void-mask, ImageMap2D, and material tests must remain
  green.
- The exact rejected matrix chunk must be captured again from fresh state.
- Acceptance requires visible non-black water across all declared water cells,
  complete ships/dock, no unexpected failed or bridge tiles, settled contracts,
  exact saved artifacts, and an independent visual review.

## Non-claims

This slice does not prove retail water UV animation, TXI behavior, environment
mapping, reflection, refraction, shoreline blending, or NWN runtime parity. It
only removes Aurora Web's occluding backing plane from above a source-authored,
source-textured water surface.
