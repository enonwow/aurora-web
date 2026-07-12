# Last City Concept Parity Dashboard

Purpose: make concept comparison fast and less guessy. This workflow compares
the candidate module against the concept art through one report that joins:

- fresh placeable usage map from the candidate module;
- optional candidate diff against a known baseline module;
- concept placeable/tile budget rules;
- concept anchor zones against actual GIT placeable positions;
- ARE tile layout and tile lights;
- offline crash-risk and Toolset preflight gates;
- Toolset screenshot image metrics, when a screenshot is supplied.
- 3x3 subcell image deltas inside each concept tile;
- a correction plan that maps visual deltas to safe existing placeables.

The dashboard does not launch Aurora Toolset, does not use the global cursor,
and does not press keyboard shortcuts. It consumes an existing clean screenshot.

## Command

```powershell
node backend\scripts\compare-last-city-concept-parity.mjs `
  --modulePath "C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_writer_concept_sic_tilemap42_anchoralign_lab.mod" `
  --baseline "C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_writer_concept_sic_tilemap42_anchoralign_lab.mod" `
  --toolset "backend\backend\docs\aurora-reverse\artifacts\areas-runtime-capture\toolset-readonly-window-capture-20260706T112730Z.png" `
  --toolsetCrop "610,275,690,470" `
  --label tilemap42-anchoralign-readonlycapture-20260706T112730
```

If `--toolset` is omitted, the report still runs the offline placeable, anchor,
tile, candidate-diff, crash-risk, and preflight checks, then returns
`offline_pass_awaiting_toolset_visual` instead of pretending that visual parity
is proven.

Use `--baseline` for every generated candidate. A clean candidate diff means:

- no uncontrolled placeable count jump;
- no VisualTransform value changes unless intentionally reviewed;
- no risky or non-motif floor overlays in the candidate.

The dashboard now emits `safetyGates` in stdout and renders the same values in
markdown:

```text
candidateDiff: passed|needs_diff_review|not_run
crashRisk: passed|failed
preflight: passed|blocked
```

If `crashRisk` or `preflight` is not clean, do not open Aurora Toolset. If
`candidateDiff` needs review, split the change before visual proof.

Use `--toolsetCrop` for candidate-to-candidate ranking whenever a stable crop
exists. The 2026-07-06 readonly auto-crop did not match the earlier
manual-baseline crop, and that made candidate scores less comparable. The
current fixed comparison crop is:

```text
610,275,690,470
```

## Fast Correction Plan

Dashboard version `last-city-concept-parity-dashboard/v2` adds an operational
correction plan. It is still offline: it does not open Aurora Toolset and it
does not touch mouse or keyboard input.

New outputs:

- `image-delta/*-image-delta.json` contains `worstSubcells` and per-tile
  `targetSubcells`, measured as a 3x3 grid inside each concept tile.
- `edge-artifacts/*-edge-artifacts.json` detects bright/neutral Toolset crop
  artifacts near the viewport edge and feeds ignored regions into image delta.
- `candidate-diff.json` compares the candidate to the chosen baseline and
  reports placeable delta, VisualTransform changes, and risky overlay counts.
- `crash-risk.json` checks module/GFF invariants that must pass before Toolset
  proof.
- `toolset-proof-preflight.json` is the last offline gate before any Toolset
  window is opened.
- `concept-placeable-tile-map-check.json` contains `adjustmentCandidates` for
  each tile, including role, zone, VisualTransform presence, static flag,
  safe-use classification, and score. It also reports concept-grid
  `visualIntent` subcells and can block proof-derived bad VisualTransform
  growth before Toolset proof.
- `concept-parity-report.json` contains `correctionPlan.items`, which joins the
  image subcell target with the safest existing placeables to move/reuse.
- `concept-parity-report.md` renders the same plan as a table.
- `operator-scorecard.json` and `operator-scorecard.md` are the first-read
  operator artifacts. They compress the layer blame, candidate diff, safety
  gates, visual deltas, placeable anchors, existing VisualTransform candidates,
  tile shortlist status, and experiment memory into one next-candidate
  contract.
- `fast-iteration-plan.json` is the compact machine-readable operator plan:
  safety state, `tile_first`/`placeable_first` decisions, target subcells,
  nearest placeable move hints, and one-variable guardrails.
- `fast-iteration-plan.md` is the human-readable version for quick iteration.
- `layer-blame-map.json` is the fast layer responsibility map. It joins the
  screenshot image delta, concept anchors, GIT placeable instances, ARE tile
  layout, candidate diff, and lighting diff, then marks each tile as
  `tile_material_or_large_silhouette`, `placeable_anchor_or_budget`,
  `placeable_palette_material`, `area_lighting`, or `safety`.
- `layer-blame-map.md` is the human-readable layer drilldown. Use it after
  `operator-scorecard.md` when more evidence is needed: it says which layer is
  responsible, which layer must not be mixed into the next candidate, and which
  nearby placeables are evidence/context rather than permission to
  random-adjust.
- When the SIC11 tile-rank artifact is present, `layer-blame-map` also embeds
  a per-tile shortlist of alternative `Tile_ID/orientation` candidates and
  filters out directions already rejected or blocked by experiment memory.

The plan answers the practical question before any new Toolset proof:

```text
Which tile is visually wrong?
Which sub-zone inside that tile is wrong?
Which existing placeables are safest to move/reuse?
Should this be a tile/material change, a large silhouette rebalance, or only a
minor placeable adjustment?
```

`operator-scorecard.md` is the fastest default read. It answers:

```text
What is the one allowed next change?
Which layers must stay stable?
Which safety gates passed or blocked?
Which tile, placeable, and VisualTransform evidence backs the decision?
Which tile shortlist entries are blocked for the current pass?
```

The concept map may now carry proof-derived visual intent. For `NW`, it stores
the problematic concept subcells (`NW_r1c1`, `NW_r2c0`, `NW_r1c2`) and the
rejected `tilemap64` VT growth bundle. If a candidate repeats that same
rugs/screen/wall growth, the map checker fails offline before Toolset is
opened.

`fast-iteration-plan` is stricter than the broad correction table. It answers:

```text
Is this pass blocked by safety?
Is the next change a tile/material/layout pass or a placeable Adjust Location pass?
Which tile is first?
Which existing placeables are nearest to the concept target zones?
Which edits must not be mixed in the next candidate?
```

`layer-blame-map` is stricter again. It answers:

```text
Is the visible mismatch currently blamed on tile/material, placeables, VT, or lighting?
Are placeable anchors clean enough that Adjust Location would be noise?
Which concrete GIT placeables are near the bad subcells, and are they context
or the actual next edit?
Which layer must be kept unchanged in the next proof?
```

Decision meanings:

| Decision | Meaning | Allowed next work |
| --- | --- | --- |
| `safety_first` | crash-risk, preflight, concept map, or diff gate is not clean | do not open Toolset; fix or quarantine |
| `capture_first` | no screenshot/image delta exists | one readonly Toolset capture after clean preflight |
| `placeable_first` | anchor or placeable budget is wrong | Adjust Location / generator position pass only |
| `tile_first` | anchors pass but image delta is large | tile/material/large-silhouette hypothesis only |
| `palette_placeable_first` | shape is acceptable but color/saturation read is off | richer local textile/wood/object material pass |
| `hold_current_tile` | no automated high-priority mismatch | leave stable while worse cells remain |

Each candidate should change only one class from that table. In particular, do
not combine tile orientation/layout changes with placeable Bearing or new
VisualTransform in the same pass. VisualTransform is allowed, but it must be an
explicit isolated pass; non-default VT must keep `Static=0`.

Example from the current `tilemap42-anchoralign-fastplan-20260706` run:

```text
SW strategy: reuse_large_dark_silhouette_or_rebalance_tile
target zones: middle-west@1.67,5; south-west@1.67,1.67; north-west@1.67,8.33
safe candidates: q_278/q_tapestry_utility_tapestry,
q_278/q_tapestry_utility_left_tapestry_lock,
q_016/q_barrel_1_utility_barrel_b
```

Use this as the new default sequence:

1. Run the dashboard against the last clean baseline or candidate.
2. Read `<label>/operator-scorecard.md` first. Treat its
   `Next Candidate Contract` as binding for the next candidate.
3. Use `comparison-brief.md`, `layer-blame-map.md`, or the contact sheet only
   as drilldown evidence when the scorecard is not enough.
4. Create one small candidate from the scorecard's allowed layer only.
5. Keep tile changes separate from placeable Bearing/VisualTransform changes.
6. Run the dashboard with `--baseline` and no screenshot. Only a clean
   `safetyGates` block allows a controlled Toolset proof.
7. Run the dashboard again with the new Toolset screenshot/crop to get visual
   subcell deltas.

Do not bundle several new VisualTransform objects just because the image score
is bad. The current plan explicitly warns when the best candidates already use
VisualTransform; in that case, move existing objects carefully and avoid adding
new VT in the same pass.

## Current Tilemap49 Fast Plan

Latest proof-refresh output:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-parity/tilemap49-fast-placeable-tile-plan-20260706/fast-iteration-plan.md
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-parity/tilemap49-fast-placeable-tile-plan-20260706/fast-iteration-plan.json
```

Safety gates are clean:

```text
candidateDiff: passed
crashRisk: passed
preflight: passed
```

But the visual status is still `needs_visual_tile_or_composition_iteration`;
score is `0.787`. The compact plan says:

```text
nextLoop: tile_first
firstTile: NW
tileFirstCount: 5
placeableFirstCount: 0
paletteFirstCount: 1
```

Interpretation: the current mismatch is not primarily missing placeables or
bad anchor placement. Anchors pass, budgets pass, and the nearest move hints
for many suggested placeables are tiny. The next useful candidate should target
tile/material/floor-wall read or a single large-silhouette hypothesis, starting
with `NW`, not another broad micro-placeable shuffle.

`tilemap50` tested that single large-silhouette hypothesis for `NW`: four
ordinary, non-VT placeables were added only in NW (`witcher939`, `witcher840`,
`q_052`, `witcher390`). It opened and captured cleanly, with no access
violation, but it did not improve visual parity:

```text
tilemap49 score: 0.787, NW priority: 0.9182
tilemap50 score: 0.785, NW priority: 0.9271
```

Conclusion: do not continue by adding more NW large placeables. The next
candidate should change actual tile/material/floor-wall read as a single
variable, then rerun the same safety gates and readonly proof.

`tilemap51` tested a single NW tile substitution from the enon_house_6
`origin=0,0` crop: `Tile_ID 72/orient 2` became `256/orient 1`, with all other
tiles and placeables kept from tilemap49. It also opened and captured cleanly,
but it was much worse:

```text
tilemap49 score: 0.787, NW priority: 0.9182
tilemap51 score: 0.734, NW priority: 1.3260
```

Conclusion: do not use the enon_house_6 J-room NW tile (`256/1`) for this
layout. It creates a bad top-left read and a stronger saturation deficit.

`tilemap52` tested a VisualTransform-only stone-spine increase from `0.42/0.48`
to `0.56/0.62`. This was blocked before Toolset by crash-risk policy:

```text
rule: structural_visual_transform_above_last_clean_toolset_range
limit q_148 concept_stone_spine: scaleX/Z <= 0.45, scaleY <= 0.50
```

Conclusion: VT is allowed only inside the proven safe range. Do not open any
q_148 stone-spine candidate above those limits.

## Current Tilemap42 Result

Output:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-parity/tilemap42-anchoralign-readonlycapture-20260706T112730/concept-parity-report.md
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-parity/tilemap42-anchoralign-readonlycapture-20260706T112730/concept-parity-report.json
```

Status with the first readonly auto-crop: `needs_visual_tile_or_composition_iteration`.

The important split is now explicit:

- concept map: `passed`, 0 errors, 0 warnings;
- concept anchors: `passed`, score `1.000`;
- semantic comparison: `1.00`;
- visual comparison: `0.56`;
- overall dashboard score: `0.674`.

Status with fixed crop `610,275,690,470`: still
`needs_visual_tile_or_composition_iteration`, but the score is `0.742`. The
fixed-crop priority order is more useful for iteration:

| Priority | Tile | Problem | Direction |
| ---: | --- | --- | --- |
| 1 | SW | brightExcess `33.22`, darkDeficit `0.1561`, saturationDeficit `0.0580` | SW needs darker utility/hearth mass, but not the retired SW dark-mass pass |
| 2 | NW | brightExcess `19.02`, darkDeficit `0.1384`, saturationDeficit `0.1026` | add controlled dark wall/furniture mass and richer local color |
| 3 | SE | brightExcess `15.48`, darkDeficit `0.1027`, saturationDeficit `0.0779` | strengthen port-storage silhouettes without floor overlays |
| 4 | NE | brightExcess `19.22`, darkDeficit `0.1122`, saturationDeficit `0.0300` | reduce bright bedroom read with safer bed/wall mass |
| 5 | N | brightExcess `10.29`, darkDeficit `0.0513`, saturationDeficit `0.1111` | central map room mostly needs richer saturation |

This means the current problem is not primarily missing placeables or wrong
anchor placement. The screenshot still reads too bright, too modular, and too
wood-dominant versus the concept. The next iteration should target tile/floor
read, wall mass, and large silhouettes before adding more small clutter.

Current priority cells:

| Priority | Tile | Problem | Direction |
| ---: | --- | --- | --- |
| 1 | NW | brightExcess `29.5`, darkDeficit `0.1756` | change tile/floor/wall read or add safe large structural silhouettes |
| 2 | NE | brightExcess `30.9`, darkDeficit `0.1530` | reduce bright bedroom read; strengthen dark wall/bed mass |
| 3 | global | warm ratio delta `0.2364` | rebalance the whole crop; avoid making the entire image uniformly warm |
| 4 | N | brightExcess `19.66`, darkDeficit `0.1091`, saturationDeficit `0.0904` | central map room needs darker structural mass and richer local color |
| 5 | S | brightExcess `22.12`, darkDeficit `0.1904` | entry/threshold needs darker floor/wall mass |

## Interpretation Rules

Do not treat an anchor pass as visual acceptance. Anchor pass only means the
right object roles are in the right concept zones.

Do not fix a severe visual delta by adding random micro-clutter. If a tile has:

- concept map clean,
- anchors clean,
- high image delta,

then the likely cause is tile/material/large-silhouette composition rather than
missing props.

Do not use VisualTransform as the first tool for structural mismatch. Use real
placement and safe tile/placeable choices first; reserve VisualTransform for
final presentation only when crash-risk rules are clean.

## Safety Contract

The dashboard is a pre-Toolset and post-screenshot analysis tool. It must not
replace the safe Toolset workflow:

1. Run offline crash/preflight checks.
2. Open Toolset only with the no-global-input launcher.
3. Capture a fresh clean screenshot.
4. Close Toolset cleanly.
5. Run this dashboard with the screenshot path.
6. Iterate only from the dashboard priority queue.

Access violation remains a critical failure. If Toolset throws one, stop the
proof, close/quarantine the candidate, and do not rerun it blindly.

## 2026-07-06 Candidate Lessons

`tilemap43` tested a 3x2 crop from `enon_house_6` origin `0,0`
(`280,271,280,256,245,256`). It opened and captured cleanly, but with the fixed
crop it scored `0.646`, worse than `tilemap42`. It created large grey reads and
lost saturation. Do not continue from it.

`tilemap44` tested the mixed `enon_house_6` crop origin `0,2`
(`280,303,280,72,86,73`). It triggered `toolset_access_violation_modal` during
capture and is quarantined. The generator now blocks this exact tile override.

`tilemap45` tested a narrow SW dark-mass placeable pass on top of `tilemap42`.
It also triggered `toolset_access_violation_modal` during capture and is
quarantined. The generator now refuses
`AURORA_LAST_CITY_APARTMENT_CONCEPT_SW_DARK_MASS_PASS=1`.

`tilemap46` tested a fast-plan rebalance but accidentally copied the full
source `Mod_HakList` from `the_last_city - codex.mod`, changing the lab profile
from 19 to 58 HAK entries. It opened but then triggered
`toolset_access_violation_modal` during capture and is quarantined. The Last
City apartment generator now defaults to the safe 19-entry lab HAK profile and
requires `AURORA_LAST_CITY_APARTMENT_SAFE_HAK_PROFILE=0` for any intentional
opt-out.

`tilemap47` repeats the fast-plan rebalance from the clean `tilemap42`
baseline, but keeps the 19-entry HAK profile. Offline dashboard output:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-parity/tilemap47-fastplan-rebalance-hak19-offline-20260706/concept-parity-report.md
```

Status: `offline_pass_awaiting_toolset_visual`.

Safety gates:

```text
candidateDiff: passed
crashRisk: passed
preflight: passed
```

This means `tilemap47` is eligible for one controlled no-global-input Toolset
proof, but it is not visually accepted yet. A fresh screenshot and dashboard
rerun with `--toolset` are still required before comparing it to concept art.

During the first proof attempt, the no-global-input opener revealed a tooling
bug: CLI `--modulePath` was ignored and the wrapper defaulted to
`the_last_city - codex.mod`. The wrapper now parses CLI arguments and derives
`expectedModuleParts` from the target module basename by default. Do not trust a
Toolset proof unless the opener output shows the exact candidate module in
`moduleWindowTitle`.

The readonly screenshot script also now falls back from `CopyFromScreen` to
`PrintWindow(PW_RENDERFULLCONTENT)` when the first capture fails image sanity
because another window covers the offscreen Toolset window. This fixed the
false File Explorer capture during `tilemap47` proof without using global mouse
or keyboard input.

`tilemap47` visual proof with edge-artifact masking:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-parity/tilemap47-fastplan-rebalance-hak19-proof-masked-20260706T123320/concept-parity-report.md
```

Status: `needs_visual_tile_or_composition_iteration`, score `0.784`. The edge
artifact detector masked the false bright Toolset background in the lower-left
crop, so SW stopped being the primary target. Real priorities became NW, SE,
NE, N, and S.

`tilemap48` tested the first masked visual rebalance, but its S entry-post move
caused a partial anchor (`S.door_front` missing `structural_windows_walls`).
It passed safety gates but should not be proofed further.

`tilemap49` reverted that S regression while keeping the masked NW/SE/NE
placement changes. Offline gates passed cleanly, and controlled Toolset proof
captured without AV:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-parity/tilemap49-masked-visual-rebalance-proof-20260706T124602/concept-parity-report.md
```

Status: `needs_visual_tile_or_composition_iteration`, score `0.787`. This is
only a tiny improvement over `tilemap47`; the conclusion is that additional
small placeable moves are low leverage. The next iteration should target tile,
floor, wall, material, or lighting read rather than more micro-placement.

`tilemap50` tested +4 ordinary NW large-silhouette placeables. It opened and
captured cleanly, but regressed from `0.787` to `0.785`. Do not repeat the
`nw_more_large_silhouette_placeables` direction.

`tilemap51` tested a single NW tile substitution:

```text
NW 72/2 -> 256/1
```

It opened and captured cleanly, but regressed to `0.734`. The parity tool now
emits `tile-layout-diff.json`, so this no longer hides behind a `placeableDelta=0`
candidate diff. The current diff proof is:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-parity/tilemap51-nw-tile256-single-tile-proof-20260706T130439/tile-layout-diff.json
```

`tilemap55` tested a smaller NW orientation-only change:

```text
NW 72/2 -> 72/1
```

It opened and captured cleanly, but regressed to `0.783`. This proves that
simple orientation-only rotation is not enough for the NW mismatch. Do not
repeat `nw_tile_72_orientation_1`.

`tilemap56` tested the other simple NW orientation-only change:

```text
NW 72/2 -> 72/0
```

It opened and captured cleanly, but only reached `0.785`, still below
`tilemap49`. Do not repeat `nw_tile_72_orientation_0`. At this point, simple
rotation of tile `72` is not the solution.

`tilemap57` tested a real residential material swap from the apartment-middle
layout `njkb_brglr_md_2`:

```text
NW 72/2 -> 194/0
```

It opened and captured cleanly, but regressed to `0.758`; NW priority increased
to `1.0985`. Do not repeat `nw_tile_194_orientation_0`.

`tilemap52` tested q_148 `concept_stone_spine` VisualTransform at `0.56/0.62`.
It was blocked before Toolset by crash-risk:

```text
q_148 scaleX/Z must stay <= 0.45 and scaleY <= 0.50 for this proof line
```

`tilemap53` tested the same stone-spine idea at the safe limit `0.45/0.50`.
It opened and captured cleanly but only tied the baseline at `0.787`, while
worsening other cells. Do not promote it as the main fix.

`tilemap54` tested a safe wall VisualTransform bundle on top of `tilemap49`.
It opened and captured cleanly, but regressed to `0.781`; the new decision
matrix classifies it as:

```text
candidateClass: placeable_or_visual_transform_only
tile diff: 0
placeable/VT diff: vt=14
promotion: no
```

Do not repeat the `wall_vt_scale_bundle` direction without a new, narrower
reason.

## Tooling Upgrade: Tile / Placeable / VT Decision Matrix

`compare-last-city-concept-parity.mjs` now writes these additional proof files
whenever a baseline is supplied:

```text
operator-scorecard.json
operator-scorecard.md
comparison-brief.json
comparison-brief.md
tile-layout-diff.json
iteration-decision-matrix.json
iteration-decision-matrix.md
layer-blame-map.json
layer-blame-map.md
```

The new default entrypoint is `operator-scorecard.md`. Read it first after
every candidate. It compresses the full comparison into:

- candidate verdict: promote, reject, split, capture, or continue;
- safety gates and whether Toolset was actually compared;
- separate axes for tile, placeable, VisualTransform, lighting, and visual
  score;
- `Next Candidate Contract`: the one allowed next layer, stable layers, and
  reject-if-mixed guardrails;
- the ranked tile/placeable work with per-tile primary layer, metrics, anchor
  gate, VT gate, tile candidate status, and nearby placeable context;
- blocked moves from experiment memory.

`comparison-brief.md` remains a compact drilldown. The deeper files are
evidence, not the first read. The new contract:

- `tile-layout-diff.json` compares ARE tile ids, orientation, and tile lights
  against the baseline. This caught `tilemap51` as `NW:72/2 -> 256/1`.
- `tile-layout-diff.json` also compares area lighting fields, so a lighting
  proof is now classified as `area_lighting_only` instead of disappearing as a
  zero-change candidate.
- `candidate-diff.json` remains the placeable/VisualTransform layer.
- `iteration-decision-matrix.md` merges tile diff, placeable diff, VT diff,
  score delta, and known experiment memory into one operational verdict.
- `layer-blame-map.md` is the detailed layer drilldown. For each tile it names the
  primary responsible layer, confidence, evidence, nearest GIT placeables, and
  the exact layers that must not be mixed into the next candidate. It also
  lists ranked tile candidates when a `tile_first` proof is needed, excluding
  known-bad `Tile_ID/orientation` pairs such as `72/1`, `72/0`, `72/3`,
  `87/1`, `91/1`, `476/0`, `59/3`, `194/0`, and `256/1` for `NW`.
- Mixed candidates are flagged as `mixed_tile_object_or_lighting` and should be
  split before any Toolset proof.
- VisualTransform counts now come from `delta.visualTransformChangedCount`;
  `tilemap54` therefore reports `vt=14` and `passed_reviewed_vt`, not a silent
  zero-change pass.

Current best accepted-safe baseline remains `tilemap49` with score `0.787`.
`tilemap58` is a soft lighting baseline only: it scored `0.788`, opened and
captured cleanly, and changed only area lighting, but the gain is too small for
acceptance. Treat it as useful evidence that deeper lighting helps a little,
not as a finished area.

Latest proof output:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-parity/tilemap58-deep-mood-operator-scorecard-20260706T134732/operator-scorecard.md
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-parity/tilemap58-deep-mood-operator-scorecard-20260706T134732/comparison-brief.md
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-parity/tilemap58-deep-mood-operator-scorecard-20260706T134732/layer-blame-map.md
```

Operator scorecard from tilemap58:

```text
action: pivot_from_tile_id_swaps
candidateVerdict: candidate_neutral
promotion: no
firstTile: NW
firstLayer: tile_material_or_large_silhouette
allowedChange: nw_material_silhouette_or_existing_vt_only
rejectIfMixedWith: tile_id, tile_orientation, area_lighting, new_unrelated_placeables, new_visual_transform_bundle
score: 0.788 vs tilemap49 0.787
```

Important: `NW` simple `Tile_ID/orientation` swaps have now regressed across
multiple clean proofs (`256/1`, `194/0`, `87/1`, `91/1`, `476/0`, `59/3`; the
tiny `72/3` improvement was not accepted). The next candidate must keep
`Tile_ID`, `Tile_Orientation`, anchor positions, Bearing, and area lighting
stable, then test only a local material/silhouette or existing-VisualTransform
pass.

Layer blame from tilemap58:

```text
firstTile: NW
firstLayer: tile_material_or_large_silhouette
firstAction: create one NW material/silhouette or existing-VisualTransform candidate only
do not mix: tile_id, tile_orientation, area_lighting, new_visual_transform_bundle, unrelated_anchor_shuffle
```

Current NW tile shortlist is recorded only as later evidence, not as the next
allowed move. It is blocked for the current pass because simple tile-id swaps
already regressed:

```text
91/1  from njkb_brglr_md_3  model sic11_f27_01
476/0 from koszary_new
59/3  from koszary_new
425/1 from koszary_new
197/1 from guild_merchants
100/3 from koszary_new
```

`tilemap59` tested `NW 72/2 -> 72/3`. It opened and captured cleanly but only
nudged the score to `0.789`, with no meaningful visual win. Do not promote or
repeat `nw_tile_72_orientation_3`.

`tilemap60` tested `NW 72/2 -> 87/1`. It opened and captured cleanly but
regressed to `0.767`, and the brief now rejects it automatically:

```text
action: reject_current_candidate
candidateVerdict: candidate_regressed
scoreDelta: -0.021 against tilemap58
blocked move: nw_tile_87_orientation_1
```

`tilemap61` tested `NW 72/2 -> 91/1`. It opened and captured cleanly with the
no-global Toolset workflow, but regressed to `0.774` against `tilemap58`.
Do not repeat `nw_tile_91_orientation_1`.

`tilemap62` tested `NW 72/2 -> 476/0`. It opened and captured cleanly but
regressed to `0.765`. Do not repeat `nw_tile_476_orientation_0`.

`tilemap63` tested `NW 72/2 -> 59/3`. It opened and captured cleanly but
regressed to `0.762`. Do not repeat `nw_tile_59_orientation_3`.

After this series, the refreshed `tilemap58` brief is no longer allowed to
blindly keep walking tile ids. It returns:

```text
action: pivot_from_tile_id_swaps
firstAllowedChange: nw_material_silhouette_or_existing_vt_only
reason: NW still owns the visual mismatch, but repeated isolated tile-id swaps regressed.
```

The next candidate should keep tile ids, placeable anchor positions, and area
lighting stable unless it is an explicitly isolated NW material/silhouette or
existing-VisualTransform pass.

`tilemap64` tested that existing-VisualTransform route by growing four already
placed NW rugs/screen/wall masses. It opened and captured cleanly, but the
visual comparison regressed from `tilemap58=0.788` to `0.781`. The active
concept map now blocks this exact VT-growth bundle:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/concept-placeable-tile-map-check-tilemap58-visual-intent-20260706.json
status: passed, NW.visualIntent.status=ok

backend/docs/aurora-reverse/artifacts/last-city-apartment-area/concept-placeable-tile-map-check-tilemap64-visual-intent-20260706.json
status: failed, NW.visualIntent.status=blocked, errors=4
```

This is intentional: a clean technical gate is not enough when the Toolset
screenshot proves a visual regression. Future candidates must use a different
local material/silhouette idea or a more precise placement change, not the same
VT growth bundle.

`tilemap65` tested the next narrower placeable idea: one ordinary low
`q_100/q_chair_6` south-west support silhouette in `NW_r2c0`, with tile ids,
orientation, anchors, Bearing, area lighting, and VisualTransform unchanged.
It passed offline gates, opened cleanly, and the valid forced `PrintWindow`
Toolset screenshot compared successfully:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-parity/tilemap65-nw-sw-furniture-proof-20260706T152455/operator-scorecard.md
score: 0.787
candidateVerdict: candidate_neutral
promotion: no
tilemap58 current-mask score: 0.788
```

Decision: do not promote `tilemap65` and do not repeat a chair-only south-west
fill as the next solution. It satisfied the concept-map subcell count for
`NW_r2c0`, but the screenshot did not move the actual concept read. This makes
the map stricter: matching a desired role is necessary evidence, not proof that
the composition improved.

After the map update, rerunning `tilemap65` through the offline wrapper now
stops before Toolset:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-parity/tilemap65-neutral-blocked-by-concept-map-20260706b/operator-scorecard.md
status: blocked_by_toolset_preflight
preflight blocker: concept_map_not_clean
concept-map tile: NW.visualIntent.status=blocked
```

This is the intended workflow improvement: a known neutral visual direction is
rejected by the concept map and preflight, not by another Aurora launch.

`tilemap66` tested the next narrower VisualTransform hypothesis: shrink only
the existing `nwn2_001/nwn2_roundtable_round_planning_table` in `NW_r1c1` from
scale `1.0` to `0.72`, keeping tile ids, tile orientation, all positions,
Bearing, lighting, and placeable count unchanged. Offline evidence looked
acceptable:

```text
candidate diff: visualTransformChangedCount=1
changed object: nwn2_001/nwn2_roundtable_round_planning_table
tile/role: NW/tables_seating
crash-risk: passed
preflight: passed
concept-map before quarantine: passed
```

Readonly capture then detected a Toolset access violation modal:

```text
blockerCode: toolset_access_violation_modal
message: Access violation at address 006C2D53 in module 'nwtoolset.exe'. Read of address 000003D8.
manifest: backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-readonly-window-capture-manifest.json
archived temp0: backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-temp0-2026-07-06T15-41-31-157Z-tilemap66_nw_roundtable_vt_access_violation_modal
```

Decision: quarantine `tilemap66`, never retry that module, and block the
`nwn2_001` round-planning-table VisualTransform direction in the concept map.
This also proves that a clean offline VT/crash-risk audit is necessary but not
sufficient for completion; Toolset proof remains authoritative for this area
workflow.

`tilemap67` tested the safer table-material hypothesis after the `tilemap66`
AV: replace only the NW round planning table template with `zep_tblcltc_002`,
with no tile, anchor, lighting, or VT change. The guarded Toolset opener loaded
the module and area cleanly, and readonly `PrintWindow` capture compared
successfully:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-parity/tilemap67-nw-table-template-proof-20260706T155918Z/operator-scorecard.md
score: 0.784
candidateVerdict: candidate_neutral
promotion: no
```

Decision: do not promote `tilemap67`. It avoided the table-VT crash, but
regressed versus the `tilemap58` practical baseline and did not fix the NW
bright/flat read. The concept map now blocks table-only `zep_tblcltc_002`
replacement for `round_planning_table`.

`tilemap68` tested one narrower textile-material hypothesis: replace the
existing elevated NW `readable_concept_study_deep_red_zone` VT textile
`witcher414` with `zep_throwrug058`, keeping x/y, bearing, tile layout, table,
and lighting stable. Offline gates passed and the diff was intentionally
narrow:

```text
candidate diff: added=zep_throwrug058_readable_concept_study_deep_red_zone
removed=witcher414_readable_concept_study_deep_red_zone
visualTransformChangedCount=0
crash-risk: passed
preflight before proof: passed
```

Toolset then raised the same critical modal during module load, before the
area-open command:

```text
blockerCode: toolset_access_violation_modal
message: Access violation at address 006C2D53 in module 'nwtoolset.exe'. Read of address 000003D8.
archived temp0: backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-temp0-2026-07-06T16-08-06-886Z-toolset_access_violation_modal
critical registry: backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-critical-failures.json
```

Decision: quarantine `tilemap68`, never retry that module, and retire
`AURORA_LAST_CITY_APARTMENT_NW_DEEP_RUG_MATERIAL_PASS`. The concept map and
Toolset preflight now block this module offline via
`candidate_quarantined_after_toolset_critical_failure` and
`concept_map_not_clean`.

The same proof also exposed a capture-quality gap. The first `tilemap65`
screenshot attempt captured a foreground NWN loading/module window instead of
the clean Toolset viewport. That comparison is invalid and must be ignored:

```text
backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-readonly-window-capture-20260706T151642Z.png
```

The capture script now detects same-process Toolset modal dialogs and external
foreground windows that obscure the Toolset. A forced `PrintWindow` capture is
allowed only after module/area preflight is clean and there is no Toolset modal
dialog.

The next allowed experiment is a single NW material/silhouette or
existing-VisualTransform pass only, using `tilemap58` as the practical
comparison baseline when testing lighting-plus-one local hypothesis. It must
keep `Tile_ID`, `Tile_Orientation`, anchor positions, Bearing, and area lighting
unchanged.

`tilemap69` tested the lowest-risk version of that idea: move only the two
ordinary non-VT NW saturation rugs (`readable_saturation_study_rug_w/e`) closer
to the floor and slightly toward the middle-center read. It opened and captured
cleanly through the guarded Toolset path:

```text
module: C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_writer_concept_sic_tilemap69_nw_nonvt_rug_floor_lab.mod
screenshot: backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-readonly-window-capture-20260706T161817Z.png
candidate diff: added=2 ordinary NW textiles, removed=2 ordinary NW textiles
visualTransformChangedCount: 0
score: 0.787
promotion: no
```

Decision: do not promote `tilemap69`. It proved the corrected opener/capture
flow can safely proof a non-VT candidate, but visually it still leaves NW too
bright/wood-heavy and does not beat `tilemap58=0.788`. The concept map now
blocks repeating the low-Z non-VT saturation-rug tweak.

`tilemap70` tested the top NW tile shortlist candidate after local material
passes failed: only `NW` changed from `72/2` to `425/1`, with placeables,
VisualTransform, Bearing, and lighting unchanged. Offline gates passed, but the
guarded Toolset opener hit the critical access-violation modal immediately after
the module frame loaded:

```text
module: C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_writer_concept_sic_tilemap70_nw_tile425_lab.mod
blockerCode: toolset_access_violation_modal
message: Access violation at address 006C2D53 in module 'nwtoolset.exe'. Read of address 000003D8.
archived temp0: backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-temp0-2026-07-06T16-27-14-075Z-toolset_access_violation_modal
```

Decision: quarantine `tilemap70`, never retry that module, and block
`nw_tile_425_orientation_1` in the experiment memory. A clean offline tile diff
is not sufficient for Toolset safety.

`tilemap72` tested a single existing NW right-screen VisualTransform growth.
It was stopped before Toolset by the concept-map verifier as a repeat of
`tilemap64_screen_growth`, so it is marked `do_not_open`.

`tilemap73` tested a single existing NW worn-rug VisualTransform shrink:

```text
module: C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_writer_concept_sic_tilemap73_nw_worn_rug_shrink_vt_lab.mod
candidate diff: one VT change only, ZEP_THROWRUG058_study_worn_rug scale 1.08/1.08/1.08 -> 0.84/0.78/0.84
blockerCode: toolset_access_violation_modal
message: Access violation at address 004EC141 in module 'nwtoolset.exe'. Write of address 000003F4.
archived temp0: backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-temp0-2026-07-06T16-55-59-266Z-toolset_access_violation_modal
```

Decision: quarantine `tilemap73`, never retry that module, and block
`nw_worn_rug_shrink_visual_transform`. The concept-map checker now supports
`minScaleX`, `minScaleY`, and `minScaleZ` in blocked VT rules, so this exact
shrink is blocked while the clean `tilemap58` baseline still passes.

`tilemap74` tested a non-shrink material-only variant for the same object:
replace `ZEP_THROWRUG058_study_worn_rug` with `witcher414` while keeping its
position, Bearing, lighting, tile layout, and VT stable. Offline gates passed,
but the guarded Toolset opener raised the same critical access violation during
`Loading Inventory List`:

```text
module: C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_writer_concept_sic_tilemap74_nw_worn_rug_red_carpet_lab.mod
candidate diff: removed zep_throwrug058/ZEP_THROWRUG058_study_worn_rug, added witcher414/witcher_carpet_3_study_worn_rug
blockerCode: toolset_access_violation_modal
message: Access violation at address 004EC141 in module 'nwtoolset.exe'. Write of address 000003F4.
archived temp0: backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-temp0-2026-07-06T17-01-54-153Z-toolset_access_violation_modal
```

Decision: quarantine `tilemap74`, never retry that module, and block
`nw_worn_rug_red_carpet_template_swap`. The practical lesson is stronger than
tilemap73 alone: do not keep iterating on `study_worn_rug` by changing its VT or
template in this generated lab path.

`tilemap75` was originally treated as the lower-risk N-room fallback after
repeated NW failures: move only the two existing ordinary non-VT side cabinets
inward around the central map room. A later size audit showed the proof target
was not a valid small lab module. It had been generated as a full-size Last City
module, so the Toolset access violation belongs to the unsafe full-module lab
path, not to the N side-cabinet idea itself:

```text
module: C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_writer_concept_sic_tilemap75_n_hero_side_cabinet_position_lab.mod
candidate diff: removed/added the same two witcher390 cabinet instances in N
left cabinet: x=11.15 -> 11.55
right cabinet: x=18.85 -> 18.45
visualTransformChangedCount: 0
module size class: invalid full-module concept lab target, about 81 MB
blockerCode: toolset_access_violation_modal
message: Access violation at address 006C2D53 in module 'nwtoolset.exe'. Read of address 000003D8.
archived temp0: backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-temp0-2026-07-06T17-17-31-882Z-toolset_access_violation_modal
```

Decision: quarantine `tilemap75`, never retry that module, and block full-size
`codex_writer_concept_sic_tilemap*.mod` targets for Toolset proof. The exact N
side-cabinet positions are no longer banned by this evidence; they must be
tested only from a known-good small lab baseline.

`tilemap76` is that corrected small-lab regeneration of the same N-room idea.
It was copied from `tilemap58`, stayed around 1.20 MB, and changed only the two
ordinary `witcher390` side cabinets:

```text
module: C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_writer_concept_sic_tilemap76_n_hero_side_cabinet_position_small_lab.mod
baseline: codex_writer_concept_sic_tilemap58_deep_mood_lab.mod
module size class: valid small lab, about 1.20 MB
concept map: passed
crash risk: passed
tile layout: unchanged
visualTransformChangedCount: 0
placeable delta: +2 / -2, same template `witcher390`, same N tile
Toolset proof: not run; blocked by `repeated_area_toolset_access_violation_family`
```

The first `tilemap76` parity report incorrectly showed `score=1` because the
offline structural map and anchors were treated as a full concept score even
when no Toolset screenshot/image delta existed. That is now fixed in
`compare-last-city-concept-parity.mjs`: no visual evidence means `score=null`
and `scoreDelta=null`; map/anchor health is exposed separately as
`structuralScore`.

Current truth-source report:

```text
report: backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-parity/tilemap76-n-hero-side-cabinet-position-small-offline-avreadiness-20260706/concept-parity-report.json
status: blocked_by_toolset_preflight
score: null
scoreDelta: null
structuralScore: 1
visualEvidenceStatus: missing
visualResult: not_run
preflightBlockers: repeated_area_toolset_access_violation_family
avReadinessStatus: ready_for_supervised_single_probe_with_explicit_override
avReadinessRequiresOverride: true
avReadinessHardBlockers: none
avReadinessPostGuardFailures: 0
```

Decision: keep `tilemap76` as an offline-clean structural candidate, but do not
promote it, score it against concept art, or open it in Toolset until the
repeated AV family guard is resolved. The guard is intentionally conservative
after multiple critical Toolset failures.

The repeated-family blocker is now classified by module size instead of treating
every AV as the same failure mode:

```text
preflight: backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-parity/tilemap76-n-hero-side-cabinet-position-small-offline-avreadiness-20260706/toolset-proof-preflight.json
smallLabFailureCount: 10
smallLabUniqueModules: 7
fullModuleFailureCount: 6
fullModuleUniqueTargets: 3
totalFamilyFailureCount: 16
postGuardFailureCount: 0
```

This keeps the full-module mistake visible, but it also proves that the guard
cannot be cleared merely by excluding `tilemap72-75`; there is still a real
small-lab Toolset AV history that needs a separate root-cause gate or an
explicit clean-backup proof strategy. The current AV readiness audit has no hard
blockers and no post-guard AV records, but it still requires a deliberate
supervised single-probe override before any Toolset launch.

The current visual baseline remains the last clean proof with actual screenshot
evidence:

```text
report: backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-parity/tilemap58-current-contract-after-tilemap70-20260706/concept-parity-report.json
status: needs_visual_tile_or_composition_iteration
score: 0.788
visualScore: 0.81
preflight: passed
```

Its unresolved visual gaps are still the real concept-parity target:

```text
NW: priority=0.9123, severe, tile/material or large-silhouette gap, brightExcess=18.24
SE: priority=0.7467, tile/material or large-silhouette gap, brightExcess=15.51
NE: priority=0.7019, tile/material or large-silhouette gap, brightExcess=18.77
N:  priority=0.6011, palette/texture gap, saturationDeficit=0.1107
global: dark mass too low, conceptDarkRatio=0.8896 vs toolsetDarkRatio=0.7871
```

Therefore the next visual candidate, once safety allows a proof, must target one
isolated visual gap from the proven baseline. It must not be justified by a
structural-only score from `tilemap76`.

These directions remain banned:

```text
no mixed_j_tile_crop
no retry_after_access_violation
no unsafe_hak_profile_58
no nw_more_large_silhouette_placeables
no nw_tile_256_orientation_1
no nw_tile_72_orientation_1
no nw_tile_72_orientation_0
no nw_tile_72_orientation_3
no nw_tile_87_orientation_1
no nw_tile_91_orientation_1
no nw_tile_476_orientation_0
no nw_tile_59_orientation_3
no nw_tile_194_orientation_0
no q_148_scale_above_0_45_0_50
no repeat_q_148_safe_limit_as_main_fix
no wall_vt_scale_bundle
no nw_existing_vt_growth_bundle
no nw_grow_existing_vt_rugs_screen_wall
no nw_single_low_chair_southwest_furniture_only
no nw_round_planning_table_visual_transform
no nw_round_planning_table_template_swap
no nw_table_material_only
no nw_deep_rug_zep_throwrug058_visual_transform
no nw_non_vt_saturation_rug_floor_tweak
no nw_tile_425_orientation_1
no tilemap64_screen_growth
no nw_right_screen_visual_transform_growth
no nw_worn_rug_shrink_visual_transform
no nw_worn_rug_red_carpet_template_swap
no full_module_concept_tilemap_lab_target
no repeated_area_toolset_access_violation_family
no deep_mood_alone_as_final_fix
```

## Next Candidate Planner

The next step is now gated by
`plan-last-city-next-visual-candidate.mjs`, not by ad-hoc module generation.
It consumes the last real visual baseline (`tilemap58-current-contract-after-tilemap70`)
plus the concept map, layer blame map, decision matrix, and current placeable
map. It does not launch Toolset and does not mutate a module.

Current planner output:

```text
plan: backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-parity/next-visual-candidate-plan-20260706/next-visual-candidate-plan-20260706.json
markdown: backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-parity/next-visual-candidate-plan-20260706/next-visual-candidate-plan-20260706.md
status: needs_explicit_single_delta_design_before_module_generation
tile: NW / study_lounge
allowed layer: nw_material_silhouette_or_existing_vt_only
current NW placeables: 46
```

Important planner conclusions:

- `study_left_dark_window_parity` is already present in the baseline, so it is
  not a valid "new" fix.
- simple NW tile swaps, VT rug/screen/wall growth, VT table/textile retries, and
  small clutter are rejected before module generation.
- `study_lounge_luma_shadow_final` targets the right luma problem, but it is a
  q_314/q_floor_20 style floor-overlay direction and must go through a separate
  crash-risk gate before it can be a candidate.
- The next generated module must name exactly one object/template/material delta
  and one target subcell. It must keep Tile_ID 72, Tile_Orientation 2, area
  lighting, Bearing, and anchor positions stable unless that one object is named
  explicitly.

The companion checker is
`check-last-city-next-candidate-contract.mjs`. It validates a future
`candidate-diff.json` against the planner before any Toolset proof. Current dry
checks:

```text
plan-only check: passed, warnings=1 (candidate diff not supplied)
tilemap58 baseline diff check: passed, warnings=1 (candidate has no delta)
```

## Tilemap77 Offline Candidate

`tilemap77` is the first candidate generated from the stricter planner instead
of another broad visual guess. It changes one NW lounge object only:

```text
module: C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_writer_concept_sic_tilemap77_nw_couch_bench_material_lab.mod
baseline: codex_writer_concept_sic_tilemap58_deep_mood_lab.mod
report: backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-parity/tilemap77-nw-couch-bench-material-offline-20260706/concept-parity-report.json
v2 report: backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-parity/tilemap77-nw-couch-bench-material-offline-v2-20260706/concept-parity-report.json
candidate contract: backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-parity/tilemap77-nw-couch-bench-material-offline-20260706/next-candidate-contract-check.json
preflight v2: backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-parity/tilemap77-nw-couch-bench-material-offline-20260706/toolset-proof-preflight-v2.json
supervised proof packet: backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-parity/tilemap77-nw-couch-bench-material-supervised-20260706-packet/supervised-toolset-proof-packet.json
```

Offline result:

```text
candidateDiff: passed
crashRisk: passed
next-candidate contract: passed, errors=0, warnings=0
preflight: requires_explicit_override
hard blockers: none
soft blockers: repeated_area_toolset_access_violation_family_requires_explicit_override
Toolset launched: no
screenshot compared: no
```

Exact delta:

```text
removed: zep_ci_fch_002 / ZEP_CI_FCH_002_study_worn_couch
added: q_032 / q_bench_study_worn_couch
tile: NW
x/y/z: 2.2 / 14.8 / 0
Bearing: 90
VisualTransform changes: 0
placeable count: unchanged, 312 -> 312
```

Decision: keep `tilemap77` as an offline-clean, planner-compliant candidate.
Do not promote it because no fresh Toolset/Aurora screenshot has been compared.
The v2 gate no longer treats the historical repeated AV family as candidate
corruption; it is a soft proof gate. The only allowed visual proof path is an
explicitly supervised single-open Toolset probe with the new single-open guard
and repeated-AV-family override active. Automatic launch remains disallowed.

The packet generator command is:

```powershell
node backend\scripts\run-last-city-supervised-toolset-proof.mjs `
  --label tilemap77-nw-couch-bench-material-supervised-20260706
```

Current packet status:

```text
readyForSupervisedProbe: true
requiresOverride: true
hardBlockers: none
softBlockers: repeated_area_toolset_access_violation_family_requires_explicit_override
execute: false
Toolset launched: no
temp0: absent
```

The wrapper refuses `--execute` unless
`--i-understand-toolset-av-risk 1` is also supplied. That refusal path was
checked and did not launch Toolset.

If a supervised run produces a Toolset PNG, the next step is image ingestion,
not reopening the module:

```powershell
node backend\scripts\run-last-city-supervised-toolset-proof.mjs `
  --label tilemap77-nw-couch-bench-material-supervised-20260706 `
  --ingestCapture <pngPath-from-supervised-capture>
```

This validates the capture and runs concept comparison against the existing
packet without launching Toolset or submitting another module/area open.
