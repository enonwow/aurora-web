# Aurora Workflow Error Prevention Checklist

Status: working checklist for Codex/Aurora area work

Companion contract:
`backend/docs/aurora-reverse/last-city-area-safe-proof-contract-2026-07-03.md`

Purpose: collect concrete mistakes seen while launching Aurora Toolset,
opening an area, and comparing concept art with an area. This file is meant to
reduce repeated errors, avoid unsafe Toolset automation, and make future
Aurora-first proof loops faster.

## Golden Rules

1. Aurora Toolset is the visual oracle, not a robust automation target.
2. A generated module, usage map, and concept report are not final acceptance.
3. Final acceptance requires a fresh, valid Aurora/Toolset screenshot.
4. Recovery, loading, wireframe, access violation, or a wrong viewport means
   stop the Toolset loop and name the blocker.
5. Work on files and dry-run modules while Toolset is unsafe or still open.
6. Toolset proof may open only a module created by the current proof workflow
   or a module/lab explicitly approved for that exact proof. Never use full
   Last City modules, dated copies, or backups as fallback oracle targets.

## Launching Aurora Toolset

### Error: treating Toolset like a normal test app

- Symptom: Codex keeps trying to push Toolset through bad states.
- Root cause: assuming Toolset can be safely restarted, clicked, or messaged
  like a modern web app.
- Correct behavior: use Toolset as a fragile oracle. Prefer manual clean start
  and read-only proof.
- Efficiency gain: fewer poisoned sessions, fewer invalid screenshots, less
  time spent debugging UI state instead of the area.

### Error: continuing after recovery dialogs

- Symptom: Toolset shows recovery or temporary working directory prompts.
- Root cause: previous Toolset session was not cleanly closed, or temp state is
  stale.
- Correct behavior: recovery is a blocker for automated proof. Codex does not
  choose Yes/No. If recovery appears repeatedly, reject the candidate and
  rebuild from a clean Toolset-native base or known-good backup.
- Efficiency gain: avoids blank frames, stale backup state, and misleading
  captures.

### Error: force-closing or restarting Toolset automatically

- Symptom: `Stop-Process -Force`, automated restart, then unstable Toolset or
  access violation.
- Root cause: trying to repair a poisoned oracle session with automation.
- Correct behavior: never force-close Toolset as part of a normal proof loop.
  If an access violation appears, the proof loop is already over: preserve the
  evidence, stop only Aurora/Toolset as critical cleanup, archive
  `modules/temp0`, restore `nwtoolset.ini`, and do not continue that session.
- Efficiency gain: avoids corrupting the oracle and prevents long recovery
  spirals.

### Error: opening the same module or area twice in one proof

- Symptom: Toolset starts, the module loads, and then automation immediately
  tries to open the same module or area again.
- Root cause: opener scripts were treated as idempotent, but Aurora Toolset is
  not idempotent here. A second `Open Module`, a second blank-frame restart, or
  a second TreeView double-click can land during inventory loading and trigger
  access violation.
- Correct behavior: one proof session gets one module-open action and one
  area-open action. After that, use read-only capture/enumeration only. If the
  area is wrong, close Toolset and start from a clean candidate instead of
  reusing the same opener.
- Automation guard: `open-last-city-module-and-area-toolset-no-global-input.mjs`
  now blocks a fresh active guard even when no visible `nwtoolset.exe` window is
  present yet, and blocks automatic second `Start-Process` unless
  `AURORA_TOOLSET_ALLOW_SECOND_TOOLSET_START=1` is deliberately set.
  `open-last-city-area-toolset-no-global-input.mjs` now refuses a second area
  TreeView double-click for the same fresh module/area guard.
- Efficiency gain: avoids racing Toolset during `Loading Inventory List`, which
  was one of the easiest ways to create repeated access violations.

### Error: using toolbar clicks to guess display state

- Symptom: wireframe/gray viewport remains, or view changes but not to a valid
  textured area.
- Root cause: toolbar state is not a stable API and icon positions are
  ambiguous.
- Correct behavior: if the viewport is not valid, stop and mark the proof as
  invalid. Do not click display/render toolbar buttons blindly.
- Efficiency gain: avoids turning one bad screenshot into multiple unknown UI
  states.

## Opening A Specific Area

### Error: confusing tree selection with loaded viewport

- Symptom: area appears selected in the left tree, but viewport is blank,
  wireframe, gray, or still loading.
- Root cause: TreeView selection and area rendering are separate states.
- Correct behavior: require all of these before proof:
  - module title matches expected module;
  - expected area tab or viewer context is present;
  - viewport is textured and visually valid;
  - screenshot crop shows the actual area, not editor background.
- Efficiency gain: prevents false "area opened" reports.

### Error: trusting stale expected area defaults

- Symptom: capture manifest says `_ikea` or another old area while working on
  `cdx_mapflat01` or `claude_pr_01`.
- Root cause: scripts kept historical defaults or ignored CLI/env expected area.
- Correct behavior: every capture command must set expected module and expected
  area explicitly. The output manifest must echo the same expected values.
- Efficiency gain: avoids debugging the wrong blocker.

### Error: using volatile window handles as facts

- Symptom: automation works once, then fails or hits the wrong control later.
- Root cause: HWNDs and TreeView item handles are per-session and ephemeral.
- Correct behavior: enumerate fresh handles each run. Never hard-code HWNDs in
  reusable commands or docs.
- Efficiency gain: makes scripts repeatable across sessions.

### Error: letting Toolset MRU choose the module

- Symptom: the command asked for `codex_training_field.mod`, but Toolset opened
  `the_last_city — codex.mod` because the welcome dialog fell through to
  `Start normally` / MRU0.
- Root cause: Toolset startup state is not neutral. If the welcome radio is not
  selected synchronously, the default MRU path can win before the open dialog is
  handled.
- Correct behavior: for lab probes, either set a temporary MRU0 to the intended
  safe module and restore `nwtoolset.ini` afterward, or verify the `Open` dialog
  selection by exact list text before allowing the module to load. Abort
  immediately on `unexpected_module_window_loaded`.
- Efficiency gain: prevents accidental Last City loads and the access violation
  loop caused by opening the wrong module.

### Error: copying full Last City HakList into a small lab

- Symptom: a small lab opens the expected area, then `Access violation...`
  appears during `Loading Inventory List`.
- Root cause: the full Last City `Mod_HakList` brings the whole module asset and
  inventory surface into a lab that only needs a narrow area proof.
- Correct behavior: copy `Mod_CustomTlk`, but filter `Mod_HakList` to the
  minimal haks required by the current area slice. For `cdx_mapflat01`, start
  with `lc_2da`, placeable haks, and `q_tilesets`; add more only when a missing
  rendered asset proves it is needed.
- Efficiency gain: keeps the Toolset oracle smaller, faster, and less likely
  to crash on unrelated inventory/catalog data.

### Error: trusting `Process.Responding` as a clean Toolset state

- Symptom: Windows reports `nwtoolset.exe` as responding, but a hidden/covered
  modal already contains `Access violation...` or a stale `Loading Inventory
  List` progress dialog.
- Root cause: process liveness does not mean the Toolset is usable. Delphi
  modal dialogs can remain visible while the main frame still responds to some
  window queries.
- Correct behavior: before any menu command, wizard command, area open, or
  screenshot, enumerate visible top-level Toolset windows and child text. If
  any window contains `Access violation`, recovery text, or stale progress,
  stop the Toolset process, restore the clean module backup, and do not send
  more commands to that session.
- Efficiency gain: prevents firing otherwise-safe commands into a poisoned
  session and misattributing the crash to the next action.

### Error: using recovery-opened viewport as oracle

- Symptom: gray/wireframe viewport with red tile outlines or empty geometry.
- Root cause: Toolset session is not fully render-ready after recovery/loading.
- Correct behavior: mark screenshot invalid. Do not compare concept art against
  this capture.
- Efficiency gain: avoids false visual deltas and bad area edits.

### Error: capturing a blocked Toolset window as evidence

- Symptom: the capture script writes a PNG even though a modal access violation,
  quarantined module title, wrong module, or missing area viewport is visible.
- Root cause: treating a blocked screenshot as harmless diagnostics. With
  Toolset, this keeps the workflow mentally inside a poisoned session and makes
  it too easy to continue after a critical signal.
- Correct behavior: read-only capture may enumerate windows and write a JSON
  manifest, but it must not produce a visual proof PNG when `blockerCode` is
  set. A screenshot with `Access violation`, recovery, or a quarantined module
  is not an oracle artifact.
- Automation guard: `capture-areas-toolset-window-readonly.mjs` now blocks
  before capture for expected quarantined modules, visible quarantined module
  windows, and access-violation modal text.
- Efficiency gain: fewer misleading proof artifacts and less temptation to
  reopen or compare a corrupted candidate.

## Comparing Concept Art With Area

### Error: treating semantic score as visual acceptance

- Symptom: report says all concept motifs are matched, but screenshot still
  looks too bright, too modular, or compositionally off.
- Root cause: semantic/placeable coverage checks count roles and motifs, not
  actual rendered mood.
- Correct behavior: semantic score is only one gate. Visual acceptance requires
  a fresh Toolset/Aurora screenshot.
- Efficiency gain: avoids declaring done based on data-only checks.

### Error: comparing new data against old screenshot

- Symptom: dry-run module has new placeables, but visual score still reflects
  the previous Toolset capture.
- Root cause: concept comparison was run with old screenshot while GIT/CSV came
  from a new module artifact.
- Correct behavior: label this as data-only/dry-run comparison. Do not use it
  for final acceptance.
- Efficiency gain: avoids chasing "unchanged visual score" when the image was
  never updated.

### Error: comparing a new screenshot with a stale placeable usage map

- Symptom: the Toolset screenshot is fresh, but semantic counts or examples
  come from an older candidate such as `tilemap22` while the image is from
  `tilemap30`.
- Root cause: the comparison tool was pointed at a current screenshot but the
  default usage-map artifact still described another module.
- Correct behavior: for every proofed candidate, build a suffixed usage map
  from that exact `.mod`, then pass its `placeable-usage-map.json`,
  `placeable-instances.csv`, and area summary into the comparison run. The
  report directory name should also include the candidate label.
- Current evidence: `tilemap30` must use
  `backend/docs/aurora-reverse/artifacts/last-city-placeable-usage-map-tilemap30-safe-mood-20260705Tproof/`;
  the matching comparison is
  `sic-tilemap30-safe-mood-currentmap-20260705Tproof`.
- Efficiency gain: prevents false semantic confidence and keeps visual deltas
  tied to the exact module that was opened in Toolset.

### Error: not validating crop before scoring

- Symptom: comparison includes UI bars, side panels, editor background, or the
  wrong viewport.
- Root cause: crop chosen from old coordinates or invalid manifest.
- Correct behavior: every concept comparison must show a contact sheet and
  verify the crop manually or with artifact masking. For the cartographer
  apartment, run:
  `node backend\scripts\analyze-toolset-crop-edge-artifacts.mjs --input <comparison-dir>\toolset-viewport-crop.png --label <candidate-label>`.
  If it finds stable neutral-gray crop artifacts, rerun
  `analyze-area-concept-image-delta.mjs` with
  `--toolsetEdgeArtifactReport <edge-artifacts.json>` before choosing the next
  tile/placeable change.
- Current evidence: `tilemap34` and `tilemap35` both contain the same
  lower-left L-shaped crop artifact: 6069 pixels, ratio `0.018714`, bounds
  `x=2,y=236,width=224,height=224`. Masking it changes the next true focus from
  `SW` to `NW`, then `SE`, then `NE`.
- Efficiency gain: makes visual scores meaningful.

### Error: comparing auto-crop scores with manual-baseline scores

- Symptom: a new candidate appears much worse or better than an older candidate,
  but the screenshot crop changed between runs.
- Root cause: the concept comparison score is sensitive to crop bounds. An
  auto-detected viewport crop and a hand-selected baseline crop are different
  measurement contracts, even when both crop images look plausible.
- Correct behavior: compare candidate progression only within the same crop
  mode. If a new auto-crop is used, label it as non-comparable to older
  manual-baseline results and rerun the new screenshot with the old baseline
  crop before making a candidate decision.
- Current evidence: `tilemap36` scored `0.78` /
  `needs_visual_iteration` with auto crop `632,304,640,417`, but `0.91` /
  `pass_with_iteration_notes` with the manual baseline crop `610,275,690,470`.
  The manual baseline comparison showed no real progression over `tilemap34`.
- Efficiency gain: prevents rejecting or accepting an area because the crop
  changed instead of the area.

### Error: editing globally after a local visual delta

- Symptom: a report says the area is too bright or not saturated enough, then
  the next candidate changes every room or scales every rug.
- Root cause: aggregate screenshot metrics were treated as if every tile had
  the same problem.
- Correct behavior: run the 3x2 offline image-delta tool against the exact
  concept and Toolset crop before editing:
  `node backend\scripts\analyze-area-concept-image-delta.mjs --label <candidate-label>`.
  Edit only the highest-priority cells unless the heatmap proves the problem is
  global.
- Current evidence: tilemap30's worst cells were `SW`, `N`, and `NW`; because
  `N` was already at budget, tilemap32 only added safe structural/textile
  anchors to `SW` and `NW`. Toolset proof showed this hypothesis was wrong:
  luma rose, dark ratio fell, saturation fell, and SW image-delta darkDeficit
  worsened from `0.1767` to `0.2194`. The correct response was to reject
  tilemap32. The next hypothesis, tilemap33, removed the stone spine entirely
  and was blocked offline by `concept_map_not_clean`. Tilemap34 kept the concept
  motif but shrank its VisualTransform; that improved luma, dark mass, and
  saturation without adding objects. Tilemap35 then changed 21 targeted
  `VisualTransform` values only in `NW`, `SW`, and `SE`, added 0 placeables, and
  opened cleanly, but the fresh Toolset screenshot worsened luma, dark mass,
  saturation, and all three worst-cell priorities. The correct response is to
  reject tilemap35 and stop scaling existing textiles/screens. Tilemap36 then
  added only eight edge-artifact-corrected focus anchors (`NW +3`, `SE +4`,
  `NE +1`) and opened/closed cleanly, but the manual-baseline comparison was
  still neutral or slightly worse than tilemap34. The correct response is to
  stop adding small focus clutter and choose a stronger floor/tile/readability
  hypothesis. Tilemap37 then tested larger structural silhouettes in
  `NW`/`SE`/`NE`, opened/closed cleanly, but the manual-baseline screenshot made
  luma, dark ratio, saturation, and the masked `NW`/`SE` priorities worse. The
  correct response is to reject structural-mass clutter too and move the next
  hypothesis to tile/floor/readability/lighting-level levers instead of adding
  more placeables.
- Efficiency gain: smaller candidates, fewer Toolset proof runs, and clearer
  cause/effect between image delta and area edits.

### Error: using placeable move hints when the layer blame says tile

- Symptom: `fast-iteration-plan` lists nearby placeables, then the next
  candidate moves/scales objects even though anchors and budgets are already
  clean.
- Root cause: nearby GIT placeables were treated as the cause of the visual
  mismatch. In many current Last City apartment proofs the placeables are only
  context around a bad tile/material/large-silhouette read.
- Correct behavior: read `operator-scorecard.md` before editing. If its
  `Next Candidate Contract` says `tile_or_material_only` or
  `nw_material_silhouette_or_existing_vt_only`, do not use random Adjust
  Location. Use Adjust Location only when the card says
  `placeable_position_only` or names concrete placeables for a
  `placeable_palette_material` pass.
- Current evidence: `tilemap58` has clean anchors and budgets, but the blame
  map marks `NW` as `tile_material_or_large_silhouette` with high confidence.
  The current safe next action has pivoted to one isolated NW
  material/silhouette or existing-VT pass; the listed nearby placeables are
  evidence/context, not permission to random-adjust.
- Efficiency gain: fewer Toolset launches wasted on non-causal object moves,
  cleaner candidate diffs, and faster identification of the real layer.

### Error: expecting pixel-perfect concept art

- Symptom: endless edits trying to match generated concept art exactly despite
  Aurora asset limitations.
- Root cause: concept art and Aurora Toolset are different media.
- Correct behavior: target layout, mood, density, silhouettes, palette, and
  story identity. Use pixel metrics only as hints.
- Efficiency gain: focuses effort on changes visible in-game/toolset.

### Error: adding more placeables instead of shaping existing ones

- Symptom: area density rises, but the screenshot still looks too modular,
  flat, or visually noisy.
- Root cause: using placement count as the main quality lever and ignoring
  Aurora `Adjust Location` plus GFF `VisTransformList`.
- Correct behavior: after the semantic motifs are present, use:
  - `Adjust Location` in Aurora for precise X/Y/Z and Bearing fixes;
  - `VisualTransform` for visual-only scale, rotate, and translate;
  - extra placeables only when a motif or silhouette is actually missing.
- Decompilation anchor: local Aurora reads/writes `VisTransformList` and
  `VisualTransform`; non-default transform components are what matter.
- Efficiency gain: fewer objects, stronger silhouettes, faster render/capture,
  and less chance of hiding layout problems under clutter.

### Error: assuming larger VisualTransform always improves mood

- Symptom: a candidate scales rugs, wall panels, or silhouette objects upward,
  but the screenshot becomes brighter or no darker than before.
- Root cause: visual scale changes can expose brighter surfaces, flatten
  silhouettes, or cover useful dark boundaries. `VisualTransform` is a precise
  shape tool, not a generic "make it moodier" knob.
- Correct behavior: compare the screenshot metrics and contact sheet before
  continuing a VT direction. If luma rises or dark mass falls, revert the VT
  scale experiment and analyze the bright regions offline before editing again.
- Current evidence: `tilemap31` scaled selected mood/rug/wall transforms from
  `tilemap30`, opened cleanly, but kept score `0.91` and made luma/dark mass
  slightly worse. `tilemap35` repeated the same lesson at a narrower scope:
  targeted VT scaling in `NW`/`SW`/`SE` opened cleanly but worsened the visual
  metrics. Continue from the Toolset-backed `tilemap34` baseline, not from
  `tilemap31` or `tilemap35`.
- Efficiency gain: avoids burning Toolset proof runs on visually plausible but
  measured-worse scale tweaks.

### Error: mistaking structural mass for visual dark mass

- Symptom: adding large shelves, cabinets, wardrobes, posts, crates, or barrels
  looks like it should make the room moodier, but the screenshot becomes
  brighter, flatter, or more modular.
- Root cause: top-down Toolset readability is dominated by tile floor, baked
  textures, crop, and lighting. More large placeables can expose bright tops or
  regular silhouettes instead of creating the dark Last City mass seen in the
  concept.
- Correct behavior: after `tilemap34`, do not spend another proof run on
  structural clutter unless the offline image delta identifies a missing
  silhouette that is both local and concept-critical. The next serious
  hypothesis should audit tile choice, floor/wall readability, tile lighting,
  and existing object transforms before adding objects.
- Current evidence: `tilemap37` added 10 larger structural objects in `NW`,
  `SE`, and `NE`, opened/closed cleanly, but worsened luma `49.08 -> 49.58`,
  dark ratio `0.7913 -> 0.7837`, saturation `0.3932 -> 0.3917`, masked `NW`
  `0.9415 -> 1.0150`, and masked `SE` `0.7465 -> 0.8346`.
- Tile evidence: `inspect-last-city-area-tile-layout.mjs` showed tilemap34 and
  tilemap37 have identical `Tile_ID`, `Tile_Orientation`, zero tile lights, and
  area lighting fields. This proves the regression was not a hidden tile change.
- Correct next candidate pattern: `tilemap38` keeps tilemap34's full placeable
  set and changes only six `q_148` `concept_stone_spine` VisualTransform values
  from `0.42/0.48/0.42` to `0.28/0.32/0.28`. It passes crash-risk, concept map,
  and dry Toolset preflight offline, but remains unaccepted until a clean
  Toolset screenshot proves visual improvement.
- Efficiency gain: avoids turning a composition problem into placeable count
  inflation.

### Error: skipping the concept tile/placeable map

- Symptom: every iteration adds another hand-written pass, but it is unclear
  which room role improved and which tile still fails the concept.
- Root cause: concept intent, placeable choice, and exact GIT placement were
  mixed into one long generator list.
- Correct behavior: build a tile/placeable map first, then generate against it.
  For `cdx_mapflat01`, the active map is:
  `backend/docs/aurora-reverse/artifacts/last-city-apartment-area/concept-placeable-tile-map.json`.
  Run:
  `node backend\scripts\check-last-city-concept-placeable-map.mjs --modulePath <candidate.mod> --out <check.json>`.
- Acceptance rule: missing hero motifs are blockers before Aurora. Density
  warnings become visual inspection notes, not automatic pass/fail. If the map
  contains `visualIntent` blockers from prior proof, those are hard blockers:
  do not open Toolset for a candidate that repeats a known visual regression.
- Current evidence: `tilemap58` passes the visual-intent map gate, while
  `tilemap64` fails offline with `NW.visualIntent.status=blocked` because it
  repeats the rugs/screen/wall VisualTransform growth that visually regressed
  from `0.788` to `0.781`.
- Efficiency gain: catches wrong-room and missing-motif problems offline,
  before a fragile Toolset launch. The visual-intent blockers also reduce
  repeated Toolset launches for directions that have already failed by
  screenshot comparison.

### Error: using floor overlays as a substitute for composition

- Symptom: the area has the right named motifs, but `N`/`S` density rises above
  budget and the screenshot becomes busier without reading closer to the
  concept.
- Root cause: generic floor, cobble, slab, stain, or shadow layers were added
  as mood fixes after the room roles were already present.
- Correct behavior: once the concept map passes motif coverage, remove
  non-motif floor overlays such as `q_148`, `q_154`, and `zep_house001` before
  launching Toolset. Use rugs, wall silhouettes, shelves, candles, and actual
  hero objects to shape the room.
- Current evidence: `tilemap16` removed the floor-overlay density from the
  readable concept pass and moved the checker from `passed_with_warnings`
  (`N=101`, `S=63`) to `passed` (`N=89`, `S=43`).
- Efficiency gain: fewer placeables, clearer visual deltas, faster Toolset
  proof, and less risk of mistaking a flat overlay problem for real apartment
  quality.

### Error: writing VisualTransform onto Static placeables

- Symptom: Toolset opens the area tab, then can crash with an access violation
  during its loading/progress phase before a useful viewport screenshot exists.
- Root cause: generated GIT had `VisTransformList` on some placeables that still
  had `Static=1`, while active Last City areas consistently store non-default
  visual transforms on `Static=0` placeables.
- Correct behavior: when emitting a non-default `VisTransformList`, force that
  placeable's `Static` field to `0`; keep real X/Y/Z/Bearing in Adjust Location
  fields and use VT only for visual scale/rotation/translation.
- Efficiency gain: avoids Toolset crashes and makes visual transform behavior
  match existing module data instead of a synthetic schema guess.

### Error: relaunching Aurora after an access violation without a data gate

- Symptom: repeated Toolset crashes while trying to "just get another
  screenshot".
- Root cause: treating an access violation as an operational annoyance instead
  of evidence that the active module, area GFF, or Toolset state may be unsafe.
- Correct behavior: after any access violation:
  - close Toolset cleanly or stop only the `nwtoolset` process if a modal crash
    dialog prevents normal close;
  - treat the current candidate as quarantined for automation immediately;
  - do not reopen the same module as a proof target; continue from a clean
    Toolset-native source module, known-good backup, or a freshly generated lab
    candidate after offline data gates pass;
  - record the failed candidate in
    `backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-critical-failures.json`;
  - compare generated data against existing Last City invariants before trying
    another Toolset screenshot;
  - record the exact crash text and the invariant that was changed before the
    next launch.
- Efficiency gain: fewer repeated crashes, less stale Toolset state, and a
  clearer link between data fixes and Aurora proof.

### Error: treating repeated access violations as recoverable

- Symptom: the same generated area keeps raising an access violation after a
  restore/relaunch cycle, or Toolset offers recovery every time.
- Root cause: continuing to test a candidate that already proved unsafe. At
  that point the active area/module state may be corrupted, and Toolset
  recovery can preserve the poisoned state instead of fixing it.
- Correct behavior: one access violation makes the candidate suspect; repeated
  access violation makes it rejected. Archive the broken `.mod` and `temp0` as
  evidence, restore a known clean module backup, and switch to either
  Toolset-native area creation/copy or a verified clean backup. Do not recover
  `temp0` as part of the proof loop. In this NWN install the recovery folder
  can be `Documents/Neverwinter Nights/modules/temp0`, not only
  `Documents/Neverwinter Nights/temp0` or `temp/temp0`.
- Automation guard: `preflight-last-city-toolset-proof.mjs` and
  `open-last-city-module-and-area-toolset-no-global-input.mjs` must block a
  registry hit with `candidate_quarantined_after_toolset_critical_failure`
  before Toolset launches. If the critical-failure registry shows repeated
  access violations across the generated `codex_writer_concept_sic_tilemap*.mod`
  family for the same area, the opener must also block with
  `repeated_area_toolset_access_violation_family` before MRU staging or process
  launch.
- Existing-window guard: before any MRU staging, area open, or screenshot,
  `open-last-city-module-and-area-toolset-no-global-input.mjs` must also inspect
  already-running `nwtoolset` window titles. If a visible/existing Toolset
  window points at a quarantined module, block with
  `toolset_existing_window_quarantined_candidate`; do not attach to that
  session even when the requested `modulePath` is different.
- Generator guard: `create-last-city-apartment-area.mjs` must also read the
  same registry and refuse to write into a rejected `.mod`. A quarantined
  candidate is not a base for "one more variant"; start from a fresh lab module
  or a known-good backup.
- Cleanup guard: `cleanup-aurora-toolset-critical-stop.mjs` must record the
  candidate module even if `--modulePath` was not passed. If a visible Toolset
  title contains `*.mod`, infer `moduleBaseName` from the title and write that
  to `toolset-critical-failures.json` so the next generator/preflight blocks it.
- Efficiency gain: prevents crash loops, protects the active module, and keeps
  the next proof attempt anchored in a known-clean starting point.

### Error: treating formal GFF consistency as Toolset viewport safety

- Symptom: a generated module passes ERF/GFF/GIT/GIC checks, opens the target
  area, then Toolset raises `Access violation at address 006C2D53... Read of
  address 000003D8` while the area viewer/progress UI is drawing.
- Root cause: the old crash-risk gate proved source consistency, not viewport
  render safety. Decompilation maps `006C2D53` to `FUN_006c2d50`, which reads
  `param_1 + 0x3d8`; the crash text is consistent with a null progress/list
  wrapper being refreshed after the viewer state is already poisoned.
- Correlated bad data:
  - `tilemap15`: 32 dense non-motif floor overlays (`q_148`, `q_154`,
    `zep_house001`) and repeated Toolset access violations.
  - `tilemap41`: no added placeables and clean GFF, but 10 viewport-risk VT
    changes above the last clean range: six `q_148` stone-spine scale bumps to
    `0.54/0.62/0.54` and four low `witcher939` wall-panel bumps to
    `1.48..1.58 / 1.46..1.56 / 1.48..1.58`.
- Correct behavior: `check-last-city-apartment-area-crash-risk.mjs` now blocks
  those render-risk patterns offline. Do not open a candidate with
  `viewportRenderRiskCount > 0`; rebuild from a known-good module and use real
  `Adjust Location` placement or smaller, separately proven VT steps.
- Evidence:
  - `crash-risk-tilemap34-post-av-guard-20260706.json`: passed,
    `viewportRenderRiskCount=0`;
  - `crash-risk-tilemap40-post-av-guard-20260706.json`: passed,
    `viewportRenderRiskCount=0`;
  - `crash-risk-tilemap41-post-av-guard-20260706.json`: failed,
    `viewportRenderRiskCount=10`;
  - `crash-risk-tilemap15-post-av-guard-20260706.json`: failed,
    `viewportRenderRiskCount=32`.
- Efficiency gain: prevents the exact "passes preflight, crashes during
  screenshot" loop and turns a visible Toolset crash into an offline data
  blocker.

### Error: regenerating from a proof module instead of a clean source module

- Symptom: copying the latest proof `.mod` to make a new candidate causes the
  generator to fail before writing with missing base area resources such as
  `wnd_tmplt_flat_5`.
- Root cause: a proof module is an output artifact; it may contain the generated
  candidate area and haks but not every source/template resource needed for a
  fresh generation pass.
- Correct behavior: create the next candidate from a clean source/template lab
  module, then use the full Last City module only as read-only source data for
  placeable GIT prototypes and `module.ifo` fields.
- Current evidence: `tilemap35` was first attempted from `tilemap34` and failed
  before writing because the base resources were missing. The safe run used
  `codex_writer_concept_sic_source.mod` as target base and
  `the_last_city — codex.mod` as read-only source.
- Efficiency gain: keeps proof artifacts immutable and prevents accidental
  corruption of the only clean visual baseline.

### Error: reporting module-open success before Toolset settles

- Symptom: the module frame appears and the script reports `ok`, then a delayed
  `Access violation... Loading Inventory List` modal appears seconds later.
- Root cause: treating the first matching module title as a stable state. The
  Toolset can still be running post-open inventory/loading work after the frame
  title updates.
- Correct behavior: after module open, wait for a short settle window and scan
  all visible top-level Toolset windows plus child text again. If `Access
  violation`, recovery, or stale progress appears during that settle window,
  the open attempt is failed and the session must be closed/restored before any
  area wizard or area-open command.
- Efficiency gain: avoids false green open states and prevents the next command
  from being blamed for an AV that was already in flight.

### Error: submitting a second module-open while the first load is still in flight

- Symptom: Toolset loads or starts loading the target module, then automation
  appears to select/open a module again immediately afterward.
- Root cause: after the first `Open` dialog selection, a slow Toolset inventory
  load can outlive the title-match window. If the opener falls back to
  `Open Module` from the blank frame after that first selection, it creates a
  duplicate load path and increases access-violation risk.
- Correct behavior: one proof attempt may submit only one real module-open
  selection. After `open_module_dialog_selection`, the opener must not call
  blank-frame `Open Module`, must not restart the frame, and must not click a
  second module selection. It may only wait, detect progress/modal state, close
  the session on critical stop, or return a blocker such as
  `module_open_selection_submitted_but_expected_frame_not_loaded`,
  `toolset_stale_progress_modal`, or `toolset_access_violation_modal`.
- Cross-process guard: the opener writes
  `backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-module-open-session-guard.json`
  before any non-preflight Toolset command. If another opener invocation sees
  a fresh unreleased guard, it must return
  `module_open_session_already_active` when a Toolset process is visible, or
  `module_open_session_fresh_guard_without_visible_process` during the startup
  gap before Windows exposes the process. In both cases it must not touch
  `Open Module`.
  `cleanup-aurora-toolset-critical-stop.mjs` releases that guard after a
  critical close. `preflight-last-city-toolset-proof.mjs` must not create the
  guard because it must stay dry/offline.
- Efficiency gain: prevents the "module opened twice" failure mode and keeps
  crash attribution on the first load instead of contaminating the proof with a
  second automation action.

### Error: using a launch command as a preflight test

- Symptom: a "quick guard test" unexpectedly starts Toolset and leaves a
  welcome/frame session open.
- Root cause: setting a very short timeout on the real opener still allows the
  opener to stage MRU and launch `nwtoolset.exe` before it times out.
- Correct behavior: use only `AURORA_TOOLSET_PREFLIGHT_ONLY=1` for dry
  preflight. That mode must report process/temp0/module target state and must
  not launch Toolset or stage MRU.
- Efficiency gain: checks clean-start readiness without creating another
  Toolset state to clean up.

### Error: scoring concept parity without visual evidence

- Symptom: an offline candidate report shows a strong concept score even though
  no Toolset screenshot, image delta, or visual comparison was supplied.
- Root cause: treating concept-map and anchor coverage as the final visual
  concept score. These checks prove that the GIT data matches the requested
  placeable map; they do not prove that the area looks like the concept art.
- Correct behavior: when `comparison` and `imageDelta` are both missing,
  `compare-last-city-concept-parity.mjs` must report `score=null`,
  `scoreDelta=null`, and `visualEvidenceStatus=missing`. A separate
  `structuralScore` may show map/anchor health, but it must not be used for
  promotion or visual iteration claims.
- Efficiency gain: prevents false "candidate improved" decisions and keeps the
  next action focused on the real blocker: safe visual proof or a stronger
  offline visual surrogate.

### Error: misspelling the lab module target variable

- Symptom: a lab candidate is copied to a new `.mod`, but the generator still
  mutates `the_last_city — codex.mod`.
- Root cause: using an unsupported variable such as
  `AURORA_LAST_CITY_APARTMENT_TARGET_MODULE` instead of
  `AURORA_LAST_CITY_APARTMENT_MODULE_PATH`, causing the script to fall back to
  its default target.
- Correct behavior: generator scripts must fail loudly when a near-miss target
  or source variable is present. A lab run must set
  `AURORA_LAST_CITY_APARTMENT_MODULE_PATH=<candidate.mod>` and
  `AURORA_LAST_CITY_APARTMENT_SOURCE_MODULE_PATH=<base.mod>`, then verify the
  summary's `modulePath` and `outputModulePath` before any Toolset work.
- Efficiency gain: prevents accidental edits to the real Last City module and
  avoids wasting proof time on the wrong file.

### Error: using the full Last City module as a concept tilemap lab

- Symptom: a `codex_writer_concept_sic_tilemap*.mod` candidate passes offline
  GFF checks but Toolset dies during module load / inventory list work.
- Root cause: the candidate was copied from the full `the_last_city — codex.mod`
  and is roughly 80 MB, while the working concept labs are small, roughly
  1-2 MB modules.
- Correct behavior: concept tilemap proof candidates must be copied from a
  known-good small lab baseline such as `tilemap58`, not from the full module.
  `create-last-city-apartment-area.mjs` and
  `open-last-city-module-and-area-toolset-no-global-input.mjs` must block
  `codex_writer_concept_sic_tilemap*.mod` targets above the lab-size threshold
  with `generated_lab_module_too_large_full_module_target`, unless an explicit
  full-module diagnostic override is set.
- Efficiency gain: prevents the heavy full-module inventory load path from
  being mistaken for an area/content proof failure.

### Error: treating every generated-lab AV as one undifferentiated family

- Symptom: `repeated_area_toolset_access_violation_family` blocks every new
  concept tilemap proof, but the report does not explain whether the evidence
  comes from small lab modules, accidental full-module targets, or missing files.
- Root cause: the critical-failure registry records module names and evidence,
  but a family guard that only counts records hides distinct failure modes.
- Correct behavior: the Toolset opener preflight must classify each historical
  concept tilemap AV by current module size. The blocker report must include
  `smallLabFailureCount`, `uniqueModuleCount`, `fullModuleFailureCount`,
  `uniqueFullModuleTargetCount`, and recent samples with `sizeClass`. Full-module
  AVs stay visible, but they must not be the only reason a small clean lab is
  blocked. If small-lab AVs still exceed the threshold, the block remains.
- Efficiency gain: prevents false recovery by excluding only the full-module
  mistake while still preserving the critical stop for real small-lab crashes.

### Error: treating AV readiness as automatic permission to launch Toolset

- Symptom: `audit-last-city-toolset-av-readiness.mjs` reports
  `ready_for_supervised_single_probe_with_explicit_override`, and automation
  treats that as a normal green preflight.
- Root cause: the audit only proves that hard blockers are absent after the
  current opener guard version. It does not erase historical small-lab access
  violations.
- Correct behavior: this status allows only a deliberately supervised single
  probe with an explicit override. The proof command must still require clean
  process state, no `temp0`, a small non-quarantined lab module, the single-open
  opener, and immediate abort on recovery/progress/access-violation modals.
- Efficiency gain: gives a path out of permanent family-block paralysis without
  silently normalizing a risky Toolset launch.

### Error: treating a loaded module frame as a ready Toolset session

- Symptom: Toolset appears to load the candidate module, then automation seems
  to open/select another module or continue immediately into another Toolset
  action. In window enumeration this can show as a valid `TfrmFrame` for the
  candidate plus a simultaneous `TdlgWelcome`, `#32770`, `Open`, or progress
  dialog.
- Root cause: a module title in the main frame is not the same as a settled
  Toolset session. The welcome/open/progress modal can survive after the frame
  title updates; sending area-open or capture commands during that state can
  look like a duplicate module load and can push Toolset toward access
  violations.
- Correct behavior: after detecting the expected `.mod` frame, close only stale
  `Open` module dialogs and stale `TdlgWelcome` dialogs by targeted `WM_CLOSE`,
  then keep probing visible Toolset top-level windows. Do not open an area until
  there is no `TdlgWelcome`, `Open`, `Confirmation`, `Loading Inventory List`,
  recovery, or access-violation modal. If a critical modal is present, stop and
  clean up; if progress remains until timeout, return
  `toolset_stale_progress_modal`; if welcome survives after module load, return
  `toolset_welcome_dialog_after_module_loaded`. Every automation step that can
  click welcome/open or restart a blank frame must re-check the expected module
  frame immediately before the action; if the frame is present, the opener must
  skip that action and let the loaded-module settle path handle the session.
- Efficiency gain: prevents the "module loaded twice" failure mode and keeps
  the access-violation blame attached to the unsafe modal state instead of the
  next visual proof command.

### Error: allowing proof while NWN runtime is still open

- Symptom: `toolset-proof-preflight.json` shows `nonToolsetProcessCount > 0`
  with `nwmain` or `nwserver`, but the status is still `passed`.
- Root cause: the preflight probe originally blocked visible `nwtoolset`
  processes and `temp0`, but treated `nwmain`/`nwserver` as informational even
  though those processes can belong to stale retail-oracle captures and can
  interfere with Toolset proof stability.
- Correct behavior: any `nwmain` or `nwserver` found by the cleanup probe blocks
  proof with `nwn_runtime_processes_present`. Identify the command line first;
  if it is a Codex/retail-oracle helper under `.codex-tmp`, stop that exact PID
  chain. Do not open Toolset while it is present.
- Efficiency gain: prevents Toolset proof from competing with background NWN
  windows and makes the preflight report match the real desktop state.

### Error: forcing full-module proof after repeated inventory-load hangs

- Symptom: Toolset selects `the_last_city - codex`, then remains on
  `BioWare Aurora Neverwinter Nights Toolset: Loading Inventory List` with the
  module select dialog still visible.
- Root cause: the full Last City module load path is heavier than the
  area-proof path and can hang before the target area viewport exists. This is
  not a valid area screenshot and not evidence that the generated area is bad.
- Correct behavior: after one long settle and one repeat attempt, stop. Archive
  `temp0`, restore `nwtoolset.ini`, keep the offline module audit and the
  small-lab Toolset screenshot as the valid area evidence, and file the full
  module load as a separate Toolset/module-load blocker.
- Current evidence: `cdx_mapflat01` was deployed to the active module on
  2026-07-03 and passed crash-risk audit with 320 placeables, 68 non-default
  visual transforms, 0 static visual transforms, and matching GIT/GIC counts.
  Two full-module Toolset attempts then blocked on `Loading Inventory List`, so
  no full-module viewport screenshot exists yet.
- Efficiency gain: prevents repeatedly poisoning Toolset while preserving the
  distinction between "area deployed and audited" and "full module can be
  visually proved in this Toolset session".

### Error: opening arbitrary full Last City modules as proof targets

- Symptom: automation opens `the_last_city - codex.mod`, a Unicode-dash variant,
  an older dated `the_last_city*.mod`, or a backup/copy only because it contains
  the requested area or appears to have the same tile layout.
- Root cause: treating "contains the same area" as permission to open it. Full
  production modules and backups are not proof labs.
- Correct behavior: open only modules created by the current proof workflow or
  explicitly named as approved labs/oracles for this exact proof. If the
  approved module is missing, quarantined, or not documented for this proof,
  stop and report `approved_toolset_module_missing_or_quarantined`. Do not fall
  back to `the_last_city - codex.mod`, Unicode-dash variants, dated copies, or
  backups.
- Efficiency gain: prevents corrupting or quarantining original/backup modules
  and avoids repeated `Loading Inventory List` / access-violation loops.

### Error: staging Unicode module paths directly into MRU

- Symptom: `nwtoolset.ini` MRU staging rejects the active Last City module path
  because the filename contains a dash outside latin1-safe MRU encoding.
- Root cause: the classic Toolset MRU path is byte-sensitive, while the local
  module filename is Unicode.
- Correct behavior: compute an ASCII short path with `GetShortPathNameW` for
  MRU staging, but keep reports and backups tied to the real long path. If the
  short path opens a module list instead of a module frame, select the visible
  `the_last_city - codex` list item by text and still require a clean settled
  module title before proceeding.
- Efficiency gain: avoids accidental fallback to the previous lab module and
  makes Unicode path handling explicit instead of mysterious.

### Error: using `SendMessage(WM_COMMAND)` for modal-opening menu commands

- Symptom: a command probe hangs after opening `Options` or another modal.
- Root cause: `SendMessage` waits for the target window procedure to return;
  modal commands can keep that call blocked while the dialog is open.
- Correct behavior: use `PostMessage(WM_COMMAND)` for known menu commands, then
  observe top-level windows. Confirmed lab fact: `PostMessage(WM_COMMAND 133)`
  to `TfrmFrame` opens `Area Wizard` (`TdlgAreaWizard`), while command `134`
  did not.
- Efficiency gain: avoids hung probes and makes command discovery reversible.

### Error: changing GIT object lists without rebuilding matching GIC lists

- Symptom: Toolset opens the area tab, then hits Access Violation during
  `Loading Inventory List` even when the generated GIT has few or no
  placeables.
- Root cause: `.git` and `.gic` are a paired contract. Clearing or replacing
  `GIT.Placeable List` while copying the old `.gic` leaves stale GIC comment /
  inventory rows for objects that no longer exist.
- Correct behavior: every generated area must rebuild `.gic` list cardinality
  from the final `.git` list cardinality before Toolset launch. The prelaunch
  crash gate must fail on any `GIT`/`GIC` list-count mismatch.
- Efficiency gain: catches a critical Toolset-crash class offline, before
  Aurora is opened.

### Error: clearing root GIT lists but leaving unreachable object structs

- Symptom: `.git` reports `Placeable List=0`, but Toolset still crashes during
  `Loading Inventory List`.
- Root cause: the root list was cleared, but old placeable structs and their
  nested visual/inventory structs remained in the GFF struct table as
  unreachable rows.
- Correct behavior: after changing any top-level GIT list, rebuild the GFF from
  root-reachable structs only. The prelaunch crash gate must fail on any
  unreachable struct in generated target `.git` or `.gic`.
- Efficiency gain: prevents stale hidden area data from surviving a "minimal"
  rebuild and misleading the next Toolset proof attempt.

### Error: appending module.ifo area structs after non-area structs

- Symptom: Toolset can show the new area in the tree but still crashes while
  opening it.
- Root cause: existing Last City `module.ifo` stores `Mod_Area_list` as a
  contiguous struct range immediately after the root (`1..areaCount`). Appending
  a new area struct at the end of the whole GFF, after hak and other module
  structs, preserves formal references but violates the observed Toolset layout
  invariant.
- Correct behavior: insert the new area struct at `areaCount + 1`, remap all
  later struct references, and make the prelaunch gate fail when
  `Mod_Area_list[index] != index + 1`.
- Efficiency gain: catches a class of Toolset-only crashes that ordinary GFF
  reference validation misses.

### Error: assuming manual ERF/GFF injection is safe after invariant fixes

- Symptom: generated shell or raw-clone area passes offline gates
  (GIT/GIC counts, reachable structs, contiguous `Mod_Area_list`, resource
  order) but still access-violates when Toolset opens the area.
- Root cause: the offline gates are necessary but not sufficient. The classic
  Toolset has additional stateful expectations around area creation and module
  registration that are not fully captured by manual repacking.
- Correct behavior: after a manually injected shell and raw clone both crash,
  stop the manual injection path for that slice. Create/copy the area through
  the Toolset-native Area Wizard/import workflow, or restore from a known-good
  backup produced by Toolset itself, then apply smaller data edits only after a
  clean baseline screenshot exists.
- Efficiency gain: moves effort from guessing hidden Toolset invariants to a
  workflow the Toolset already knows how to serialize safely.

## Module Editing And Dry Runs

### Error: repacking active module while Toolset is open

- Symptom: module lock, stale resources, corrupted proof loop, or Toolset
  instability.
- Root cause: Toolset may keep the `.mod` open or hold temp state.
- Correct behavior: when Toolset is open or unsafe, build a dry-run `.mod`
  artifact only. Deploy to the real module after Toolset is closed.
- Efficiency gain: allows safe iteration without risking the active oracle.

### Error: calling dry-run "done"

- Symptom: generated artifact exists and tests pass, but active module was not
  updated and no fresh screenshot exists.
- Root cause: confusing file-build success with Aurora acceptance.
- Correct behavior: label dry-run as candidate. Required final steps:
  - close Toolset cleanly;
  - deploy/repack active module;
  - launch clean Toolset;
  - capture valid screenshot;
  - compare and inspect.
- Efficiency gain: keeps progress visible without false completion.

## Runtime And Web Capture Lessons

### Error: comparing an obscured Toolset screenshot

- Symptom: the comparison score changes, but the screenshot actually contains a
  foreground `nwmain` loading window, an `Open` module dialog, or another modal
  instead of a clean area viewport.
- Root cause: accepting a raw screen-copy capture as visual proof without
  checking whether the Toolset client area is the visible foreground image.
- Correct behavior: `capture-areas-toolset-window-readonly.mjs` must block
  default captures when a Toolset modal dialog is open or another top-level
  window overlaps the Toolset viewport. Use `--forcePrintWindow 1` only after
  the no-global open script has verified the expected module and area, and only
  when the manifest reports no Toolset modal blocker.
- Current evidence: the first `tilemap65` proof image at
  `toolset-readonly-window-capture-20260706T151642Z.png` is invalid because it
  captured a foreground NWN loading/module window. The valid proof is
  `toolset-readonly-window-capture-20260706T152455Z.png`.
- Additional cause found in the same cleanup pass: an old PowerShell
  light-shadow proof loop was still running and respawned `nwmain.exe` with
  `+TestNewModule als_refitm`. Kill the parent proof loop, not only the visible
  `nwmain`, otherwise the foreground window comes back.
- Efficiency gain: prevents false concept comparisons and avoids spending an
  iteration on a screenshot that was never the area.

### Error: trusting offline VT safety as Toolset proof

- Symptom: a candidate has clean candidate diff, crash-risk, preflight, and
  concept-map checks, but Toolset raises an access violation during readonly
  capture.
- Root cause: offline GFF checks prove structural sanity, not every Toolset
  render path. `tilemap66` changed exactly one existing object,
  `nwn2_001/nwn2_roundtable_round_planning_table`, by adding VisualTransform
  scale `0.72`; Toolset then raised `Read of address 000003D8`.
- Correct behavior: any access violation is a critical stop. Close Toolset,
  archive `temp0`, record the candidate as quarantined, and block the exact
  direction in `concept-placeable-tile-map.json`. Do not retry the same module
  or the same VT-table direction.
- Efficiency gain: prevents repeated crashes from a candidate that looked clean
  only in offline gates.

### Error: using the wrong generator target variable

- Symptom: the generator mutates `the_last_city - codex.mod` when the intended
  output was a disposable lab module.
- Root cause: using `AURORA_LAST_CITY_APARTMENT_TARGET_MODULE_PATH`; the actual
  generator variable is `AURORA_LAST_CITY_APARTMENT_MODULE_PATH`.
- Correct behavior: before generation, echo/check both module paths and use
  `AURORA_LAST_CITY_APARTMENT_MODULE_PATH` for the lab module plus
  `AURORA_LAST_CITY_APARTMENT_SOURCE_MODULE_PATH` for source data. If the wrong
  module is touched, immediately restore from the generator-created
  `.pre-cdx_mapflat01-...bak` backup before doing any further work.
- Current evidence: this happened during the `tilemap66` pass and was restored
  from `the_last_city - codex.mod.pre-cdx_mapflat01-2026-07-06T15-38-42-495Z.bak`
  before the real lab generation.
- Efficiency gain: protects the canonical Last City module from lab iteration
  churn.

### Error: judging parity during cold cache

- Symptom: first web capture after rebuild times out on placeable or tile
  batches, but direct batch later returns fast.
- Root cause: cold cache, derived assets, or S3/blob warm-up.
- Correct behavior: distinguish cold-cache readiness from visual bugs. Warm
  direct endpoints, then rerun capture.
- Efficiency gain: avoids misclassifying loader throughput as transform error.

### Error: mixing tile and placeable transform systems

- Symptom: fixing tile orientation breaks placeable yaw, or vice versa.
- Root cause: treating ARE/SET tile orientation and GIT Bearing/VisualTransform
  as one system.
- Correct behavior: keep them separate:
  - tile: ARE `Tile_Orientation` plus SET orientation, image map rules, tile
    crop/void;
  - placeable: GIT `Bearing`, AppearanceType/model lookup, visual transform,
    pivot/scale.
- Efficiency gain: smaller fixes, easier regression tests.

### Error: skipping the operator scorecard

- Symptom: after a capture, the next candidate is chosen by reading a contact
  sheet and guessing, or by jumping directly from image delta to Adjust
  Location.
- Root cause: the comparison evidence is spread across `concept-parity-report`,
  `fast-iteration-plan`, `layer-blame-map`, `iteration-decision-matrix`, and
  the contact sheet. Reading them manually makes it easy to miss a rejected
  tile, a mixed layer, or an already failed experiment.
- Correct behavior: after every `compare-last-city-concept-parity.mjs` run, read
  `<label>/operator-scorecard.md` first. Its `Decision` and
  `Next Candidate Contract` sections decide whether the current candidate is
  rejected, blocked, awaiting Toolset capture, or ready for one isolated next
  experiment. Its gates and ranked work table keep tile, placeable,
  VisualTransform, lighting, and visual score separate. Use
  `comparison-brief.md` and `layer-blame-map.md` only as drilldown evidence.
- Current evidence: `tilemap60` opened cleanly, but the brief rejects it as
  `candidate_regressed`, `scoreDelta=-0.021`, and blocks
  `nw_tile_87_orientation_1`. `tilemap61` also opened cleanly, then regressed
  to `0.774` against `tilemap58`, so `nw_tile_91_orientation_1` is blocked too.
  `tilemap62` and `tilemap63` then regressed to `0.765` and `0.762`, so
  `nw_tile_476_orientation_0` and `nw_tile_59_orientation_3` are blocked. The
  refreshed `tilemap58` operator scorecard now pivots away from simple tile-id
  swaps and requires one isolated NW material/silhouette or existing-VT pass,
  while keeping `Tile_ID`, `Tile_Orientation`, anchor positions, Bearing, area
  lighting, and unrelated layers unchanged.
- Efficiency gain: one file gives the operational decision, so Toolset proof
  runs are spent only on candidates that are safe, scoped, and not already
  disproven.

### Error: accepting prefix asset fallback for exact model lookup

- Symptom: payload asks for one model but renderer loads a related larger model
  such as `dag_applescene.glb`.
- Root cause: lookup model resref used as loose prefix seed or first manifest
  fallback.
- Correct behavior: exact lookup must render the exact asset or report missing.
  No silent related-model fallback for area instances.
- Efficiency gain: avoids fake transform bugs caused by wrong assets.

### Error: regex-only material extraction from binary MDL

- Symptom: GLB has material refs, but texture contract misses some materials.
- Root cause: simple regex scanner loses binary MDL references.
- Correct behavior: use the same MDL inspection path as conversion, with a
  fallback scanner only as backup.
- Efficiency gain: fewer texture timeouts and more accurate material parity.

## Acceptance Gates

An area can be called complete only when all gates pass:

1. Active module contains the intended area resources.
2. GIT/ARE/GIC/IFO checks pass.
3. Placeable usage map reflects the deployed module, not only dry-run.
4. Toolset opens cleanly without recovery/progress/access violation.
5. Area viewport is textured and visually valid.
6. Fresh screenshot exists for the same deployed version.
7. Concept comparison uses that fresh screenshot and correct crop.
8. Human visual inspection says it reaches Last City quality.

## Fast Preflight Checklist

Before touching Toolset:

- Is Toolset closed? If not, do not repack active module.
- Is the target `.mod` absent from
  `backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-critical-failures.json`?
- Is this a dry-run? If yes, label it as candidate.
- Are expected module and area explicit in capture commands?
- Is the screenshot fresh for the same module version?
- Is the viewport textured, not wireframe?
- Are tile and placeable fixes scoped separately?
- Did a human inspect the contact sheet?

If any answer is no, do not mark the task complete.
