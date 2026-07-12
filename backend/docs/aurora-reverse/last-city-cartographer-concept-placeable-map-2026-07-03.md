# Last City Cartographer Apartment - Concept Placeable Map

Status: active design contract for `cdx_mapflat01`

This document changes the area workflow from "add more placeables until the
screenshot improves" to "map concept intent to tile roles, then place only the
objects needed by those roles".

Concept art:

```text
C:\Projects\aurora-web\docs\assets\last-city\last-city-cartographer-apartment-concept-2026-07-02.png
```

Machine-readable map:

```text
C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\last-city-apartment-area\concept-placeable-tile-map.json
```

## Why This Helps

Yes, this approach should help.

The previous loop mixed three decisions in one place:

1. what the concept needs;
2. which Last City placeable can represent it;
3. where that placeable should be positioned and transformed.

That produced long generator passes and made it too easy to add clutter without
changing the composition. The new workflow separates those layers:

1. concept grid: decide what each tile must read as;
2. placeable map: choose candidate templates from existing Last City usage;
3. placement pass: put only those candidates into tile-local anchor zones;
4. proof: check a fresh Toolset screenshot against the concept.

## Area Grid

The concept is best treated as a `3x2` apartment grid. In NWN coordinates this
means `x=0..30`, `y=0..20`, tile size `10`.

| Tile | Bounds | Concept role | Primary read |
| --- | --- | --- | --- |
| `NW` | `x 0..10`, `y 10..20` | study lounge | couch, desk, books, red rug, candles, wall chart |
| `N` | `x 10..20`, `y 10..20` | cartographer map room | hero map table, parchment wall, shelves, globes, candles |
| `NE` | `x 20..30`, `y 10..20` | bedroom nook | green bed, red rug, wardrobe, bedside candle, wall textile |
| `SW` | `x 0..10`, `y 0..10` | hearth utility | fireplace, sacks, barrels, shelf, bucket, broom, warm soot |
| `S` | `x 10..20`, `y 0..10` | entry hall | threshold, stone floor, runner, bench, plant, side shelves |
| `SE` | `x 20..30`, `y 0..10` | port storage | rope coils, crates, barrels, sacks, tools, warm corner lights |

## Candidate Families

Candidates come from the Last City placeable usage map, not from random palette
guessing. The main families are:

| Role | Strong candidates |
| --- | --- |
| maps/books/papers | `nwic245`, `ke_mapa001`, `witcher689`, `witcher690`, `ke_papier014`, `ke_papier012`, `bookpiles001`, `zep_bbook004`, `zep_bbook001`, `zep_bbook003`, `q_241`, `q_052`, `q_051`, `witcher254`, `witcher231` |
| tables/seating | `zep_ci_tbl_002`, `zep_tblcltc_002`, `nwic048`, `nwn2_001`, `nwic266`, `nwic268`, `q_100`, `q_032` |
| warm light | `witcher409`, `witcher402`, `witcher401`, `witcher405`, `q_179`, `plc_campfr` |
| rugs/textiles | `witcher414`, `witcher418`, `zep_throwrug058`, `zep_throwrug054`, `zep_tapstry_001`, `q_278`, `witcher530`, `witcher531` |
| bedroom/private | `nwic004`, `nwic047`, `nwic041`, `q_105`, `witcher228`, `witcher759` |
| storage | `witcher267`, `q_125`, `q_126`, `q_127`, `q_017`, `witcher230`, `witcher494`, `q_209`, `q_211`, `q_016`, `q_239`, `zep_cask001` |
| port work | `q_231`, `nw_plc_ropecoil1`, `witcher377`, `witcher374`, `witcher653`, `witcher908` |
| plants/vases | `q_224`, `q_226`, `witcher763`, `witcher764`, `nwic235`, `witcher220` |
| walls/windows/screens | `witcher939`, `witcher840`, `witcher984`, `witcher987`, `nwic051`, `nwic052`, `witcher942` |

## Tile Budgets

The goal is not maximum count. Each tile gets a density budget so the room reads
clearly and does not become a pile of assets.

| Tile | Target count | Allowed range | Notes |
| --- | ---: | ---: | --- |
| `NW` | 42 | 34-52 | dense but readable study lounge |
| `N` | 78 | 62-94 | hero room, highest paper/map density |
| `NE` | 38 | 30-48 | quieter private room |
| `SW` | 44 | 34-56 | messy utility room, warm fire focus |
| `S` | 34 | 24-44 | breathing room around entry |
| `SE` | 52 | 40-64 | port storage density and rope/crate silhouette |

Expected total: roughly `240..358`, with the strongest candidates around
`288` placeables before door/support exceptions. If a generated candidate goes
much above this, it must justify the extra objects visually.

## Risk Controls

Do not use these as large mood layers:

```text
q_314
zep_splat007
zep_splat003
ke_plama001
ke_kalurza001
```

They can be useful as tiny accents, but previous proof showed that large black
or splat layers can produce noisy/rectangular Toolset views. Dark mood should
come from:

- warm light contrast;
- wall/shelf silhouettes;
- rugs and textiles;
- dense paper/table clutter;
- smaller local grime only where needed.

Do not stack generic floor/cobble/slab overlays after the room roles are
already present:

```text
q_148
q_154
zep_house001
```

These can make the screenshot look busier without improving the concept read.
In the `tilemap15` pass they inflated `N` and `S` beyond the density budget.
The `tilemap16` pass removes those non-motif floor overlays and keeps the
actual concept motifs.

## Placement Rules

For each motif:

1. choose the candidate family from the JSON map;
2. place it inside the tile's `anchorZones`;
3. use GIT `X/Y/Z/Bearing` for true position;
4. use `VisualTransform` only for visual scale/shape;
5. force `Static=0` when emitting a non-default `VisualTransform`;
6. run crash-risk before Toolset.

Do not fix a tile role by rotating the whole area or changing tile orientation.
Tile orientation, placeable Bearing, and VisualTransform are separate systems.

## Acceptance

A candidate generated from this map is still only a candidate. It is accepted
only after:

1. offline crash-risk passes;
2. Toolset opens without recovery, stale progress, or access violation;
3. fresh screenshot is captured from that exact candidate;
4. concept comparison uses that screenshot;
5. human inspection confirms the six tile roles read like the concept.

The map is now the source of intent. The generator should be judged by how well
it satisfies this map before it is judged by raw screenshot score.

## Current Lab Candidate

`tilemap34` is the current best clean Toolset-proofed map-driven lab candidate:

```text
C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_writer_concept_sic_tilemap34_shrink_stone_spine_lab.mod
```

Offline gate results:

- crash-risk: `passed`;
- concept map checker: `passed`, 0 errors, 0 warnings;
- full dry Toolset proof preflight: `passed`, no blockers;
- Toolset proof: clean open, no recovery, no access violation, clean close;
- concept comparison: `pass_with_iteration_notes`, score `0.91`;
- semantic score: `1.00`;
- visual score: `0.81`;
- total placeables: 312;
- VisualTransform placeables: 89;
- tile counts: `NW=46`, `N=94`, `NE=47`, `SW=38`, `S=44`, `SE=43`.
- changed from tilemap30: 6 `concept_stone_spine` VisualTransform values
  shrink the gray stone spine instead of removing its concept motif.

Evidence:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/crash-risk-tilemap30-safe-mood-20260705T1314-lab.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/concept-placeable-tile-map-check-tilemap30-safe-mood-20260705T1314.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/concept-placeable-tile-map-check-tilemap30-safe-mood-20260705T1314.svg
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-proof-preflight-tilemap30-safe-mood-before-proof-20260705T1315.json
backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-sic-tilemap30-safe-mood-20260705Tproof-topmost.png
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-comparison/sic-tilemap30-safe-mood-currentmap-20260705Tproof/comparison-report.md
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-comparison/sic-tilemap30-safe-mood-currentmap-20260705Tproof/comparison-contact-sheet.png
backend/docs/aurora-reverse/artifacts/last-city-placeable-usage-map-tilemap30-safe-mood-20260705Tproof/placeable-usage-map.json
backend/docs/aurora-reverse/artifacts/last-city-placeable-usage-map-tilemap30-safe-mood-20260705Tproof/placeable-instances.csv
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/crash-risk-tilemap34-shrink-stone-spine-20260705T1347-lab.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/concept-placeable-tile-map-check-tilemap34-shrink-stone-spine-20260705T1347.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-proof-preflight-tilemap34-shrink-stone-spine-before-proof-20260705T1347-2026-07-05T13-47-29-084Z.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-open-tilemap34-shrink-stone-spine-20260705Tproof.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-close-tilemap34-shrink-stone-spine-20260705Tproof.json
backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-sic-tilemap34-shrink-stone-spine-20260705Tproof-topmost.png
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-comparison/sic-tilemap34-shrink-stone-spine-currentmap-20260705Tproof/comparison-report.md
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-comparison/sic-tilemap34-shrink-stone-spine-currentmap-20260705Tproof/comparison-contact-sheet.png
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-image-delta/tilemap34-shrink-stone-spine-20260705Tproof-image-delta.md
backend/docs/aurora-reverse/artifacts/last-city-placeable-usage-map-tilemap34-shrink-stone-spine-20260705Tproof/placeable-usage-map.json
```

This is still not final acceptance. It is the current safe baseline because it
has a clean Toolset screenshot and the comparison uses the matching tilemap34
placeable usage map. Compared with tilemap30, it improves luma
`50.57 -> 49.08`, dark ratio `0.7611 -> 0.7913`, and saturation
`0.3758 -> 0.3932`. The remaining visual gaps are still `visual_dark_mass` and
`visual_saturation`.

Crop-artifact correction:

```text
backend/docs/aurora-reverse/artifacts/toolset-crop-edge-artifacts/tilemap34-shrink-stone-spine-20260705Tproof-edge-artifacts.md
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-image-delta/tilemap34-shrink-stone-spine-20260705Tproof-edgeartifactmasked-image-delta.md
```

The Toolset crop contains a stable neutral-gray L-shaped editor/crop artifact:
6069 pixels, ratio `0.018714`, bounds `x=2,y=236,width=224,height=224`. After
masking its two real components (`17x224` vertical bar and `222x11` bottom
bar), the next visual focus changes to `NW`, then `SE`, then `NE`. Do not spend
the next generation pass on the old `SW` priority unless a fresh screenshot
without this artifact proves that `SW` is still the worst cell.

Rejected visual iteration:

```text
C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_writer_concept_sic_tilemap35_targeted_vt_mood_lab.mod
```

`tilemap35` tested the hypothesis that the remaining `SW`/`NW`/`SE` gap could
be improved by changing only existing textile/screen `VisualTransform` values.
It was generated from the clean `codex_writer_concept_sic_source` lab base, with
the full Last City module used read-only as the placeable source. The diff from
tilemap34 was narrow: 0 added placeables, 0 removed placeables, and 21
`VisualTransform` changes only in `NW=9`, `SW=6`, `SE=6`.

Evidence:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/crash-risk-tilemap35-targeted-vt-mood-20260705T1402-lab.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/concept-placeable-tile-map-check-tilemap35-targeted-vt-mood-20260705T1402.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-proof-preflight-tilemap35-targeted-vt-mood-before-proof-20260705T1402.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-open-tilemap35-targeted-vt-mood-20260705Tproof.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-close-tilemap35-targeted-vt-mood-20260705Tproof.json
backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-sic-tilemap35-targeted-vt-mood-20260705Tproof-topmost.png
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-comparison/sic-tilemap35-targeted-vt-mood-currentmap-20260705Tproof/comparison-report.md
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-comparison/sic-tilemap35-targeted-vt-mood-currentmap-20260705Tproof/comparison-contact-sheet.png
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-image-delta/tilemap35-targeted-vt-mood-20260705Tproof/tilemap35-targeted-vt-mood-20260705Tproof-image-delta.md
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/candidate-compare-tilemap34-to-tilemap35-targeted-vt-mood-20260705T1402.json
backend/docs/aurora-reverse/artifacts/last-city-placeable-usage-map-tilemap35-targeted-vt-mood-20260705T1402/placeable-usage-map.json
docs/LAST_CITY_PLACEABLE_USAGE_MAP_2026-07-02-tilemap35-targeted-vt-mood-20260705T1402.md
```

Status: rejected for visual progression. Toolset opened cleanly, captured a
fresh screenshot, and closed cleanly with no `temp0`, but the comparison got
worse than tilemap34: luma `49.08 -> 49.45`, dark ratio `0.7913 -> 0.7857`,
and saturation `0.3932 -> 0.3919`. The image-delta also worsened the same
cells: `SW` priority `1.1885 -> 1.2043`, `NW` `0.9415 -> 0.9576`, and `SE`
`0.7465 -> 0.8009`. Do not continue by scaling existing textiles/screens.
Tilemap34 remains the best Toolset-backed baseline. The edge-artifact-masked
delta confirms the same conclusion for the actually relevant cells:

```text
backend/docs/aurora-reverse/artifacts/toolset-crop-edge-artifacts/tilemap35-targeted-vt-mood-20260705Tproof-edge-artifacts.md
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-image-delta/tilemap35-targeted-vt-mood-20260705Tproof-edgeartifactmasked-image-delta.md
```

After masking, `tilemap35` is still worse than tilemap34 in `NW`
(`0.9415 -> 0.9576`) and `SE` (`0.7465 -> 0.8009`), while `NE` is unchanged.

Current offline candidate waiting for a future safe Toolset proof:

```text
C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_writer_concept_sic_tilemap36_edgefocus_lab.mod
```

`tilemap36` is generated from the clean `codex_writer_concept_sic_source` lab
module, with the full Last City module used read-only as the placeable source.
It enables `AURORA_LAST_CITY_APARTMENT_EDGE_ARTIFACT_MASKED_FOCUS_PASS=1` and
adds only the corrected focus anchors from the edge-artifact-masked delta:
`NW +3`, `SE +4`, `NE +1`. It does not remove placeables, does not change
existing VisualTransform values, and keeps risky overlays/non-motif floor
overlays at `0`.

Offline evidence:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/summary.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/crash-risk-tilemap36-edgefocus-20260705T1430-lab.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/concept-placeable-tile-map-check-tilemap36-edgefocus-20260705T1430.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-proof-preflight-tilemap36-edgefocus-before-proof-20260705T1430-2026-07-05T14-31-09-724Z.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/candidate-compare-tilemap34-to-tilemap36-edgefocus-20260705T1430.json
backend/docs/aurora-reverse/artifacts/last-city-placeable-usage-map-tilemap36-edgefocus-20260705T1430/placeable-usage-map.json
docs/LAST_CITY_PLACEABLE_USAGE_MAP_2026-07-02-tilemap36-edgefocus-20260705T1430.md
```

Status: clean Toolset proof completed, but not accepted as visual progression.
Toolset opened the correct lab module/area, produced a fresh screenshot, and
closed cleanly with no recovery/access violation/temp0.

Proof evidence:

```text
backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-readonly-window-capture-20260705T143607Z.png
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-comparison/sic-tilemap36-edgefocus-currentmap-20260705Tproof/comparison-report.md
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-comparison/sic-tilemap36-edgefocus-manualbaselinecrop-20260705Tproof/comparison-report.md
backend/docs/aurora-reverse/artifacts/toolset-crop-edge-artifacts/tilemap36-edgefocus-manualbaselinecrop-20260705Tproof-edge-artifacts.md
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-image-delta/tilemap36-edgefocus-manualbaselinecrop-20260705Tproof-edgeartifactmasked-image-delta.md
```

Important crop lesson: the auto-detected crop (`632,304,640,417`) scored
`0.78` / `needs_visual_iteration`, but the baseline manual crop
(`610,275,690,470`) scored `0.91` / `pass_with_iteration_notes`, matching the
older comparison method. Do not compare candidate quality across different crop
modes without labeling the result as non-comparable.

Against the same baseline crop, `tilemap36` is not better than `tilemap34`:
luma worsened `49.08 -> 49.28`, dark ratio worsened `0.7913 -> 0.7891`, and
saturation stayed effectively unchanged at `0.3932`. After masking the same
L-shaped crop artifact, the worst cells remain `NW`, `SE`, `NE`. Conclusion:
do not continue by adding more small edge-focus screens/textile rolls; the next
hypothesis must reduce bright floor/readable modularity more directly.

Rejected structural-mass candidate after rejecting edge-focus clutter:

```text
C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_writer_concept_sic_tilemap37_structuralmass_lab.mod
```

`tilemap37` is generated from the clean `codex_writer_concept_sic_source` lab
module with `AURORA_LAST_CITY_APARTMENT_READABLE_CONCEPT_PASS=1` and
`AURORA_LAST_CITY_APARTMENT_STRUCTURAL_MASS_PASS=1`. It intentionally does not
enable the rejected `EDGE_ARTIFACT_MASKED_FOCUS_PASS`. The pass adds larger safe
structural silhouettes in the proven problem cells (`NW`, `SE`, `NE`) using
bookcases, cabinets, a wardrobe, wall/post mass, crates, and a barrel. It avoids
`q_314`, splats, stains, and non-motif floor overlays.

Evidence:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/crash-risk-tilemap37-structuralmass-20260705T1451-lab.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/concept-placeable-tile-map-check-tilemap37-structuralmass-20260705T1451.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-proof-preflight-tilemap37-structuralmass-before-proof-20260705T1451.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/candidate-compare-tilemap34-to-tilemap37-structuralmass-20260705T1451.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/candidate-compare-tilemap36-to-tilemap37-structuralmass-20260705T1451.json
backend/docs/aurora-reverse/artifacts/last-city-placeable-usage-map-tilemap37-structuralmass-20260705T1451/placeable-usage-map.json
docs/LAST_CITY_PLACEABLE_USAGE_MAP_2026-07-02-tilemap37-structuralmass-20260705T1451.md
backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-readonly-window-capture-20260705T145542Z.png
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-comparison/sic-tilemap37-structuralmass-manualbaselinecrop-20260705Tproof/comparison-report.md
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-comparison/sic-tilemap37-structuralmass-manualbaselinecrop-20260705Tproof/comparison-contact-sheet.png
backend/docs/aurora-reverse/artifacts/toolset-crop-edge-artifacts/tilemap37-structuralmass-manualbaselinecrop-20260705Tproof-edge-artifacts.md
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-image-delta/tilemap37-structuralmass-manualbaselinecrop-20260705Tproof-edgeartifactmasked-image-delta.md
```

Status: clean Toolset proof completed, but rejected for visual progression.
Crash-risk `passed`, concept map `passed` with 0 errors/0 warnings, dry Toolset
preflight `passed`, the expected lab module/area opened, screenshot was
captured, Toolset closed cleanly, `temp0` stayed absent, and `nwtoolset.ini` was
restored. Versus tilemap34: `+10` placeables, all VisualTransform, `0` removals,
`0` risky overlays, `0` non-motif floor overlays, and no VisualTransform changes
on existing objects. The fair manual-baseline comparison kept score `0.91` /
visual `0.81`, but the measured image got worse: luma `49.08 -> 49.58`, dark
ratio `0.7913 -> 0.7837`, and saturation `0.3932 -> 0.3917`. After masking the
stable lower-left crop artifact, `NW` worsened `0.9415 -> 1.0150` and `SE`
worsened `0.7465 -> 0.8346`; `NE` improved only marginally `0.7284 -> 0.7230`.
Do not continue by adding larger structural silhouettes. Tilemap34 remains the
current best clean Toolset-backed baseline.

Tile-layout inspection after this rejection:

```text
backend/scripts/inspect-last-city-area-tile-layout.mjs
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/tile-layout-tilemap34-shrink-stone-spine-20260705Tproof.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/tile-layout-tilemap37-structuralmass-20260705Tproof.json
```

Tilemap34 and tilemap37 have identical ARE tile data:
`Tile_ID=82,80,89,72,73,91`, `Tile_Orientation=1,3,2,2,3,0`, all tile lights
zero, `ShadowOpacity=85`, `IsNight=1`, and shadows enabled. The structural-mass
regression is therefore a placeable/composition failure, not a hidden tile
rotation/light change. Next work should start from tilemap34 and investigate
tile/floor/readability or a cleaner layout-level decision before any further
Toolset proof.

Current offline floor/readability candidate:

```text
C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_writer_concept_sic_tilemap38_floorread_lab.mod
```

`tilemap38` is generated from the clean `codex_writer_concept_sic_source` lab
module with the full Last City module used read-only as the placeable source.
It keeps the tilemap34 placeable set exactly: 312 placeables, 89
VisualTransform placeables, `NW=46`, `N=94`, `NE=47`, `SW=38`, `S=44`,
`SE=43`, 0 risky overlays, 0 non-motif floor overlays. The only candidate
change is six `q_148` `concept_stone_spine` VisualTransform values in `N` and
`S`: scale `0.42/0.48/0.42 -> 0.28/0.32/0.28`. This is a floor/readability
hypothesis, not another clutter pass.

Evidence:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/summary-tilemap38-floorread-20260705T1513.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/crash-risk-tilemap38-floorread-20260705T1513-lab.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/concept-placeable-tile-map-check-tilemap38-floorread-20260705T1513.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-proof-preflight-tilemap38-floorread-before-proof-20260705T1513.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/candidate-compare-tilemap34-to-tilemap38-floorread-20260705T1513.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/tile-layout-tilemap38-floorread-20260705T1513.json
backend/docs/aurora-reverse/artifacts/last-city-placeable-usage-map-tilemap38-floorread-20260705T1513/placeable-usage-map.json
docs/LAST_CITY_PLACEABLE_USAGE_MAP_2026-07-02-tilemap38-floorread-20260705T1513.md
```

Status: offline candidate ready for a future safe proof, not visual acceptance.
Crash-risk, concept map, and full dry Toolset proof preflight all pass with no
blockers. Because it has no screenshot yet, it must not replace tilemap34 as the
best Toolset-backed baseline until a clean, controlled Aurora/Toolset proof
shows a visual improvement.

Current offline tile/right-column candidate:

```text
C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_writer_concept_sic_tilemap39_rightcolumn_windowmass_lab.mod
```

`tilemap39` starts again from the clean `codex_writer_concept_sic_source` lab
module and keeps the `tilemap34` placeable contract exactly: 312 placeables, 89
VisualTransform placeables, no additions, no removals, no VisualTransform value
changes, 0 risky overlays, and 0 non-motif floor overlays. The only area
composition change is a right-column tile variant test:
`Tile_ID=82,80,89,72,73,91 -> 82,80,90,72,73,92`, with the same orientations
`1,3,2,2,3,0`. This tests whether the `f26/f27` window variants improve the
concept read of the bedroom/storage column without another clutter pass.

Offline evidence:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/summary-tilemap39-rightcolumn-windowmass-20260706T1023.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/tile-layout-tilemap39-rightcolumn-windowmass-20260706T1023-20260706T102353Z.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/crash-risk-tilemap39-rightcolumn-windowmass-20260706T1023-lab.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/concept-placeable-tile-map-check-tilemap39-rightcolumn-windowmass-20260706T1023.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-proof-preflight-tilemap39-rightcolumn-windowmass-before-proof-20260706T1023-2026-07-06T10-24-09-040Z.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/candidate-compare-tilemap34-to-tilemap39-rightcolumn-windowmass-20260706T1023.json
backend/docs/aurora-reverse/artifacts/last-city-placeable-usage-map-tilemap39-rightcolumn-windowmass-20260706T1023/placeable-usage-map.json
docs/LAST_CITY_PLACEABLE_USAGE_MAP_2026-07-02-tilemap39-rightcolumn-windowmass-20260706T1023.md
```

Status: dry-gated only, not visually accepted. It is safe to proof later because
crash-risk, concept map, and full dry Toolset preflight pass with no blockers,
but it must not replace `tilemap34` until a fresh screenshot proves improvement.

Current offline lighting-only candidate:

```text
C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_writer_concept_sic_tilemap40_moodcontrast_lab.mod
```

`tilemap40` isolates the image-delta complaint about luma/dark mass. It keeps
the `tilemap34` tile IDs, orientations, placeables, and VisualTransform values
unchanged, but uses the generator lighting profile `concept-mood-contrast`:
`ShadowOpacity=100`, `MoonAmbientColor=0x010101`,
`MoonDiffuseColor=0x040302`, `SunAmbientColor=0x010101`,
`SunDiffuseColor=0x040302`, with sun/moon shadows enabled. This candidate is a
lighting proof hypothesis, not a placement pass.

Offline evidence:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/summary-tilemap40-moodcontrast-20260706T1025.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/tile-layout-tilemap40-moodcontrast-20260706T1025-20260706T102549Z.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/crash-risk-tilemap40-moodcontrast-20260706T1025-lab.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/concept-placeable-tile-map-check-tilemap40-moodcontrast-20260706T1025.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-proof-preflight-tilemap40-moodcontrast-before-proof-20260706T1025-2026-07-06T10-26-05-286Z.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/candidate-compare-tilemap34-to-tilemap40-moodcontrast-20260706T1025.json
```

Status: dry-gated only, not visually accepted. This is the cleanest next proof
candidate if the goal is to test whether Toolset lighting, rather than
placeable layout, is driving the remaining concept-art mismatch.

2026-07-06 proof attempt status: invalid evidence, not visual rejection. The
module opened and closed cleanly with no recovery prompt, no access violation,
and no `temp0`, but the readonly capture saved the desktop wallpaper instead of
the Toolset window:

```text
backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-readonly-window-capture-20260706T103439Z.png
```

The resulting comparison is not an area-quality signal and must not be used to
promote or reject `tilemap40`. `capture-areas-toolset-window-readonly.mjs` now
has image sanity validation so a desktop/wallpaper capture is blocked before it
can become concept-comparison proof.

Corrected `tilemap40` proof:

```text
backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-sic-tilemap40-moodcontrast-20260706T1044-topmost.png
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-comparison/sic-tilemap40-moodcontrast-manualbaselinecrop-20260706T1044/comparison-report.md
backend/docs/aurora-reverse/artifacts/last-city-placeable-usage-map-tilemap40-moodcontrast-20260706T1044/placeable-usage-map.json
```

Status: valid Toolset screenshot, clean close, but not a visual promotion over
`tilemap34`. It keeps score `0.91`, semantic `1.00`, visual `0.81`; dark mass
improves only slightly (`0.7913 -> 0.7933`) and saturation is effectively
unchanged (`0.3932 -> 0.3926`). Lighting alone is not enough.

Rejected VisualTransform contrast candidate:

```text
C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_writer_concept_sic_tilemap41_vtcontrast_lab.mod
```

`tilemap41` starts from the proven `tilemap34` tile/placeable contract and keeps
the `tilemap40` mood lighting, but enables
`AURORA_LAST_CITY_APARTMENT_CONCEPT_CONTRAST_VT_PASS=1`. It changes no
placeable positions and adds/removes no placeables; it only changes 19
VisualTransform values on existing concept anchors to make the hero map, wall
weights, textiles, and stone spine read closer to the concept.

Offline evidence:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/summary-tilemap41-vtcontrast-20260706T1052.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/tile-layout-tilemap41-vtcontrast-20260706T1052-20260706T105104Z.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/candidate-compare-tilemap34-to-tilemap41-vtcontrast-20260706T1052.json
backend/docs/aurora-reverse/artifacts/last-city-placeable-usage-map-tilemap41-vtcontrast-20260706T1052/placeable-usage-map.json
```

Final status: rejected after Toolset access violation. The old dry gate passed,
but that gate proved only formal source consistency. The live Toolset failure
showed a missing viewport-render risk gate.

Crash evidence:

```text
backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-sic-tilemap41-vtcontrast-20260706T1057-topmost.png
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-temp0-2026-07-06T10-58-50-736Z-access-violation-tilemap41-vtcontrast-proof
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-critical-failures.json
```

Post-AV guard evidence:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/crash-risk-tilemap41-post-av-guard-20260706.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-proof-preflight-tilemap41-post-av-guard-20260706.json
```

The new guard blocks `tilemap41` with `viewportRenderRiskCount=10`: six `q_148`
concept stone-spine VT bumps above `0.45/0.50/0.45` and four low `witcher939`
wall-panel VT bumps above `1.42/1.40/1.42`. `tilemap34` and `tilemap40` still
pass this guard with `viewportRenderRiskCount=0`, so continue from one of those
known-clean candidates, not from `tilemap41`.

Generator update: `AURORA_LAST_CITY_APARTMENT_CONCEPT_CONTRAST_VT_PASS=1` no
longer applies contrast VT to `q_148` stone-spine anchors or `witcher939`
wall-weight anchors. Those structural classes must stay on the last clean
ranges unless a separate disposable proof establishes a new safe range.

Follow-up rule: do not use larger VT as a substitute for composition. For the
next candidate, build the concept-placeable map first, then adjust real
`X/Y/Z/Bearing` placement in small offline deltas. Use VT only within the last
clean per-template ranges unless a separate disposable proof establishes a new
range.

Current anchor-aligned candidate:

```text
C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_writer_concept_sic_tilemap42_anchoralign_lab.mod
```

`tilemap42` changes the workflow from broad motif counts to object-to-concept
anchor checks. The new offline checker reads the concept `anchorZones`, parses
the candidate GIT, classifies placeables by global family plus required motif
templates, and reports whether each concept anchor has the expected object roles
inside the correct world-space zone. This is still not visual acceptance, but it
prevents the old failure mode where the area had enough books/rugs/lights
globally while the actual concept anchors were spatially wrong.

New tool:

```text
backend/scripts/compare-last-city-concept-anchors.mjs
```

Baseline `tilemap40` anchor report:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/concept-anchor-compare-tilemap40-moodcontrast-20260706.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/concept-anchor-compare-tilemap40-moodcontrast-20260706.md
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/concept-anchor-compare-tilemap40-moodcontrast-20260706.svg
```

`tilemap40` scored `0.861`: 14/18 anchors passed, 3 partial, 1 failed. The
remaining misses were `S.door_front`, `S.lower_hall`, `NW.desk_wall`, and
`NE.private_storage_wall`.

`tilemap42` keeps the same count profile as `tilemap40` (`312` placeables,
`89` VisualTransform placeables, `0` risky overlays, `0` non-motif floor
overlays) and only moves eight existing anchors with real placement
(`X/Y/Z/Bearing`), not larger VT:

- entry runner/candelabra/heavy posts into `S.door_front`;
- lower hall screens into the overlap of `S.lower_hall` and
  `S.transition_to_maproom`;
- study left window into `NW.desk_wall`;
- bedroom tapestry into `NE.private_storage_wall`.

`tilemap42` offline evidence:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/concept-anchor-compare-tilemap42-anchoralign-20260706.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/concept-anchor-compare-tilemap42-anchoralign-20260706.md
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/concept-anchor-compare-tilemap42-anchoralign-20260706.svg
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/crash-risk-tilemap42-anchoralign-20260706.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/concept-placeable-tile-map-check-tilemap42-anchoralign-20260706.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/candidate-compare-tilemap40-to-tilemap42-anchoralign-20260706.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-proof-preflight-tilemap42-anchoralign-20260706.json
```

Status: safe offline/pre-Toolset candidate. Anchor score is `1.000`, crash-risk
is `passed` with `viewportRenderRiskCount=0`, concept map is `passed`, and full
Toolset preflight is `passed` with no blockers. It must still get a controlled
Aurora/Toolset screenshot and concept comparison before promotion.

## 2026-07-06 Unified Parity Dashboard

The anchor checker fixed a real failure mode, but it is not enough by itself.
`tilemap42` proves this: all anchors pass, yet the screenshot still fails the
concept visually. Use the unified dashboard for new iterations so placeable,
tile, and screenshot evidence are read together instead of in separate manual
passes.

Tool:

```text
backend/scripts/compare-last-city-concept-parity.mjs
```

Latest `tilemap42` dashboard:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-parity/tilemap42-anchoralign-readonlycapture-20260706T112730/concept-parity-report.md
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-parity/tilemap42-anchoralign-readonlycapture-20260706T112730/concept-parity-report.json
```

Result: `needs_visual_tile_or_composition_iteration`, score `0.674`.

Key split:

- concept map: `passed`;
- concept anchors: `passed`, score `1.000`;
- semantic score: `1.00`;
- visual score: `0.56`.

Conclusion: the next iteration should not add random small placeables. The
highest-priority mismatch is tile/floor/wall read and large visual mass:
`NW`, `NE`, `N`, and `S` are too bright and not dark/stone-heavy enough versus
the concept.

Fixed-crop rerun:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-parity/tilemap42-anchoralign-fixedcrop-20260706T112730/concept-parity-report.md
```

Result: `needs_visual_tile_or_composition_iteration`, score `0.742`.

With the stable crop `610,275,690,470`, the priority order changes to:
`SW`, `NW`, `SE`, `NE`, then `N`. Treat this fixed-crop dashboard as the better
iteration guide because it compares candidates with the same frame.

Rejected after this dashboard:

- `tilemap43_jroom`: opened and captured cleanly, but fixed-crop score dropped
  to `0.646`; the `enon_house_6` `j` crop produced broad grey reads and poorer
  saturation.
- `tilemap44_mixedtile`: access violation during capture; quarantined.
- `tilemap45_sw_darkmass`: access violation during capture; quarantined.

Generator guards now reject the known unsafe `tilemap44` tile override and the
retired SW dark-mass pass so those AV paths are not repeated.

Rejected visual iteration:

```text
C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_writer_concept_sic_tilemap31_vt_mood_lab.mod
```

`tilemap31` only scaled existing mood/rug/wall VisualTransform values. It opened
cleanly, but the comparison did not improve: score stayed `0.91`, while luma
and dark mass were slightly worse than tilemap30. Do not continue from
tilemap31; continue from tilemap34 or a clean copy of tilemap34.

## Rejected Visual Iteration

`tilemap32` was a dry-gated candidate built from the `tilemap30` baseline after
offline image-delta analysis. It opened cleanly in Toolset, produced a valid
screenshot, and closed cleanly, but the visual comparison showed no improvement.

```text
C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_writer_concept_sic_tilemap32_delta_safe_lab.mod
```

Image delta from the tilemap30 Toolset crop showed the worst cells as:

- `SW` hearth utility: brightExcess `34.03`, darkDeficit `0.1767`;
- `N` map room: saturationDeficit `0.1583`, already at budget `94/94`;
- `NW` study lounge: brightExcess `18.90`, saturationDeficit `0.1026`.

The tilemap32 change therefore adds only six safe structural/textile anchors:
four in `SW`, two in `NW`, and none in `N`. It avoids the rejected heavy overlay
families and does not continue the tilemap31 scale experiment.

Proof evidence:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-image-delta/tilemap30-safe-mood-20260705Tproof-image-delta.md
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-image-delta/tilemap30-safe-mood-20260705Tproof-image-delta-heatmap.svg
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/crash-risk-tilemap32-delta-safe-20260705T1336-lab.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/concept-placeable-tile-map-check-tilemap32-delta-safe-20260705T1336.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-proof-preflight-tilemap32-delta-safe-before-proof-20260705T1336-2026-07-05T13-36-08-619Z.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-open-tilemap32-delta-safe-20260705Tproof.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-close-tilemap32-delta-safe-20260705Tproof.json
backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-sic-tilemap32-delta-safe-20260705Tproof-topmost.png
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-comparison/sic-tilemap32-delta-safe-currentmap-20260705Tproof/comparison-report.md
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-comparison/sic-tilemap32-delta-safe-currentmap-20260705Tproof/comparison-contact-sheet.png
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-image-delta/tilemap32-delta-safe-20260705Tproof-image-delta.md
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/candidate-compare-tilemap30-to-tilemap32-delta-safe-20260705T1336.json
backend/docs/aurora-reverse/artifacts/last-city-placeable-usage-map-tilemap32-delta-safe-20260705T1336/placeable-usage-map.json
```

Status: rejected for visual progression. It kept score `0.91` and visual score
`0.81`, but worsened the image metrics versus tilemap30:

- luma: `50.57 -> 51.06`;
- dark ratio: `0.7611 -> 0.7526`;
- saturation: `0.3758 -> 0.3744`;
- SW image-delta darkDeficit: `0.1767 -> 0.2194`.

Conclusion: adding more safe structural/textile anchors to SW/NW is not the
right next move. Continue from the generator baseline that produces tilemap34,
not from tilemap32.

Blocked dry experiment:

```text
C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_writer_concept_sic_tilemap33_no_stone_spine_lab.mod
```

`tilemap33` removed the stone spine entirely. Crash-risk passed, but the concept
map checker produced warnings for missing `central_stone_spine` and
`entry_stone_spine`, so full proof preflight blocked it with
`concept_map_not_clean`. It was not opened in Toolset.

Rejected candidate registry:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-critical-failures.json
```

`tilemap15` is quarantined there after the visible 2026-07-05 Toolset access
violation and must not be reopened or regenerated into.
