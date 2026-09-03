# MST03 lowered-floor / renderer extent occlusion audit v1

Date: 2026-07-29  
Status: source-proven renderer defect corrected; runtime recapture accepted  
Matrix packet: `mst03-group-chunk-0003` (`mst03_b50_01` through
`mst03_b50_12`, group `Ye Old Entry Hall`)

## Scope classification

This audit does not infer a new retail Aurora rendering semantic. The
authoritative tile asset already declares a drawable mesh named `floor`, its
material, normals, UVs, and authored elevation. The defect is introduced by an
Aurora Web-only helper plane which is placed above that source geometry.
Therefore a new decompiler audit is not activated: the required correction is
limited to preventing renderer-owned fallback geometry from occluding
source-authored tile geometry.

The source model is not translated, flattened, re-wound, made double-sided, or
otherwise rewritten.

## Fresh evidence

The rejected fresh capture is:

- frame:
  `output/proof/tile-add-connect-matrix-v2-path-node-aware-v2/captures/mst03-group-chunk-0003.frame.json`
  (`sha256:3e1642a57369891fdff19ad36d659f02b79a8ceba5bcf2d1afe3bd009927f833`);
- canvas:
  `output/proof/tile-add-connect-matrix-v2-path-node-aware-v2/captures/mst03-group-chunk-0003.canvas.png`
  (`sha256:9f85ab467d673d893fe64c4f4a615b7e64224b9a58a50796a2d7917b3664d99e`);
- exact targeted tile proof:
  `mst03-group-chunk-0003.floor-diagnostic-tile-proof.json`
  (`sha256:26652c4520d7b60e96fd4157c92aa33125e763588dda7fec4613a55761c12630`);
- comparison proof for the already visible `mst03_b68_01` floor:
  `mst03-group-chunk-0003.floor-diagnostic-working-tile-proof.json`
  (`sha256:8961d331edd0f3efe65d67edcdd965890ec0d6d7d12dde2103bb4776b3a2ba06`).

The runtime contract was settled (`12/12` loaded, `0` pending, `0` failed,
`0` bridge), with 251 visible meshes and complete material application.
Nevertheless 92.3218% of canvas pixels were black and a central interior crop
was 100% RGB `(0,0,0)`. This packet remains rejected and checkpoint 84 is not
advanced.

The exact delivered `mst03_b50_01.glb`:

- originates from
  `modules/current/__aurora/sources/tiles/hak/vale_core_tis_03/mst03_b50_01.mdl`;
- is 257,300 bytes;
- has SHA-256
  `4cca453dee70c9e232111ed05d77697ab8a9d39c9f510302149b087702c9173c`;
- contains the `floor` mesh at local Aurora `Y=-5`;
- produces world `Y=-0.5` after the renderer's proven `0.1` tile-model scale;
- has 25 vertices, 32 triangles, and both geometric and accessor normals
  pointing `+Y`;
- binds material `mtr_nkey_0163`.

The exact diffuse selected for that material is
`tex_core_0163_d.dds`, 5,592,560 bytes, SHA-256
`5ac6d6143a77eb97d18b9f34110d402a60556e1d894195b04f8c743d78638785`.
Its decoded 2048x2048 pixels average approximately RGB
`(91.329, 89.210, 82.517)` and contain only 15 fully black pixels out of
4,194,304. Therefore neither a missing material nor a black source texture
explains the capture.

The already visible comparison tile `mst03_b68_01` uses the same `floor`
topology, `+Y` winding, and `mtr_nkey_0163` material, but its floor is authored
around local `Y=0`. Its exact GLB SHA-256 is
`99c1eb875df8daae83cc3984628756a36697eb352a5c31777a5c1acb04e7e3fb`.

## Proven collision

`workspaceTerrainMesh.ts` creates an opaque, depth-writing
`terrain-area-extent-fill` at world `Y=-0.018`. It is renderer-owned backing
geometry, not part of the Aurora tile model.

For `mst03_b50_01`, the source floor is at world `Y=-0.5`. From the proof
camera above the Area, the extent plane is therefore closer and wins the depth
test. That exactly explains the black interior while walls and upper edges
remain visible.

## Correction contract

The extent fill must remain a black/canvas-coloured backing surface, but it
must never sit above a recognized, visible source-authored ground surface.
For every loaded model:

1. inspect only meshes already classified by the renderer as ground surfaces;
2. compute their transformed minimum world `Y` from the delivered geometry;
3. monotonically lower, never raise, the Area extent fill to
   `minimum source ground Y - 0.018`;
4. record the observed minimum and the applied fill elevation in renderer
   telemetry;
5. leave all source model transforms, mesh visibility, materials, winding, and
   depth-test settings unchanged.

The monotonic rule keeps the backing below the lowest loaded floor while
preserving its crop/void role for the entire Area.

## Test and acceptance gate

The focused regression must prove both:

- a source floor at local `Y=-5`, under the normal `0.1` model scale, lowers
  the fill from `-0.018` to `-0.518`;
- an ordinary floor at `Y=0` cannot raise or otherwise move the existing fill.

This code-level proof is necessary but not sufficient. The matrix packet can
advance only after a new exact capture shows the 12-member group with a
non-black, visually coherent floor, all runtime contracts settled, zero
unexpected failed or bridge tiles, accepted framing/outlier review, and
hash-verified saved artifacts.

## Accepted runtime closure

Fresh replacement `mst03-group-chunk-0003.attempt-0002` satisfies that gate.
The 3x4 group is visually coherent and its continuous source-authored stone
floor is visible. Runtime state is `12/12` loaded with zero
pending/failed/bridge tiles, 251 visible meshes, 273 materials/maps, and
`12/12` material contracts applied.

The sampled canvas improved from 276/4,096 non-black samples and average
luminance `6.035` in the rejected capture to 2,134/4,096 and `45.078`.
The raw agent gate retained the four zero-width boundary `tileshroud002`
outliers for review. Independent review accepted them because observed and
camera bounds are identical, expansion is `1.000`, clipped-corner count is
zero, NDC margin is positive, and the full perimeter is visible.

Exact accepted artifact SHA-256 values:

- frame:
  `5ffc376cc0b0b3471e8b162e66d2617641c0779d5f1936bb0dfa830d53f4ede3`;
- state:
  `100fc307c8a0ad667e806ef6e71cf2c3a1e823573464204a96ea077669ac5f8d`;
- canvas:
  `a6b70b78876ca8faa14c5afbe9166767abbfb43bb0cab5cd274c732225d4cf12`;
- page:
  `d749a9a0c482c00311540f3a2ea8f685923896fe48340a8be86ef4d1815988bf`;
- lifecycle:
  `0d9d55f39877dff4042a4efbbbef41167ed26e2f9a4416fe99513d40b9186e45`;
- independent visual review:
  `e709e53c27f63569b38591b5f18cc91adb2782527975bc01d227455968f98c02`.

The checkpoint advanced from 84 to 85 only after this review. PathConnect
remained unmodified and fail-closed.
