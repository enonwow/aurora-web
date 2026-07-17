# Last City Area Safe Proof Contract

Status: active operating contract for `cdx_mapflat01`

Scope: `Ostatnie Miasto - Port, Mieszkanie Kartografa` in
`the_last_city - codex`. This document records the fixes required after the
Toolset access-violation loop and must be followed before more visual work is
accepted.

## Non-Negotiable Rule

`Access violation` in Aurora Toolset is a critical failure, not a dialog to
click through.

On any access violation:

1. Stop the current Toolset proof immediately.
2. Do not recover `temp0` and do not click `Tak`/`Nie` automatically.
3. Archive the candidate `.mod` and `Documents/Neverwinter Nights/modules/temp0`
   as failed evidence when present.
4. Restore `nwtoolset.ini` from the known clean snapshot.
5. Do not reopen the same candidate. A targeted offline audit may explain the
   failure, but the next Toolset proof must use a fresh candidate basename from
   a clean Toolset-native source module or a known-good backup.

Repeated access violation means the candidate is rejected and unrecoverable for
automation. Continue only from a clean Toolset-native base or a known-good
backup.

Rejected candidates are also recorded in:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-critical-failures.json
```

`preflight-last-city-toolset-proof.mjs` and
`open-last-city-module-and-area-toolset-no-global-input.mjs` read this registry
before any Toolset launch. A rejected module must fail with
`candidate_quarantined_after_toolset_critical_failure`.

Reusable cleanup command:

```powershell
node backend\scripts\cleanup-aurora-toolset-critical-stop.mjs `
  --reason access-violation `
  --modulePath <failed-candidate.mod> `
  --area cdx_mapflat01
```

This stops Aurora/Toolset processes, archives `modules/temp0` when present, and
restores `nwtoolset.ini` from the known clean snapshot. Use it only after a
critical Toolset state, not as part of a normal proof loop.

## Correct Proof Loop

Use this order every time:

1. Build a dry-run candidate outside Toolset.
2. Run the offline crash-risk audit.
3. Open only a lab module, never the active Last City module while debugging.
   `the_last_city - codex.mod`, Unicode-dash variants, dated copies, and backups
   may be used as offline read-only sources only when documented for the
   workflow; they are not Toolset-open targets for proof fallback.
4. Confirm the Toolset window title matches the expected lab module.
5. Wait for a settle window and rescan for access violation, recovery, and stale
   progress dialogs.
6. Capture a fresh Toolset screenshot only if the viewport is textured and
   visually valid.
7. Run concept comparison against that exact screenshot.
8. Make a short fix list from the visual delta before editing again.

Data-only checks do not count as completion. A passing GIT/GIC/IFO audit only
means the candidate may be opened.

## Toolset Launch Rules

- Start `nwtoolset.exe` without module-path arguments.
- Stage `MRU0` to the intended lab module before startup, then restore
  `nwtoolset.ini` after the proof.
- If Toolset opens any unexpected module, abort before it finishes loading.
- Do not replace a missing/quarantined lab with `the_last_city - codex.mod`,
  Unicode-dash variants, dated copies, or backups. Stop with
  `approved_toolset_module_missing_or_quarantined`.
- Do not attach automation to an already-running Toolset session. A proof must
  start from no `nwtoolset` process and no `modules/temp0`, unless a human
  explicitly supervises an existing-session proof.
- Recovery prompts are blockers for automation. Automation must not choose a
  recovery button.
- Targeted window messages are allowed only on a clean, responsive session.
- Global cursor, global keyboard, mouse wheel, and focus-stealing input remain
  forbidden without explicit fresh permission.

Implemented guard:

```powershell
node backend\scripts\open-last-city-module-and-area-toolset-no-global-input.mjs
```

The wrapper now refuses existing Toolset processes by default with
`toolset_existing_process_requires_clean_start`, stages `MRU0`, verifies the
selected module by list text/window title, aborts on unexpected module load,
and treats any recovery prompt as `toolset_recovery_prompt_blocked_critical`.
Use `AURORA_TOOLSET_REQUIRE_CLEAN_START=0` only for an explicitly supervised
existing-session proof.

Run this dry preflight before any launch:

```powershell
$env:AURORA_TOOLSET_PREFLIGHT_ONLY = '1'
$env:AURORA_TOOLSET_MODULE_PATH = "$env:USERPROFILE\Documents\Neverwinter Nights\modules\codex_writer_concept_sic_tilemap34_shrink_stone_spine_lab.mod"
$env:AURORA_TOOLSET_EXPECTED_MODULE_PARTS = 'codex_writer_concept_sic_tilemap34_shrink_stone_spine_lab|mod'
$env:AURORA_TOOLSET_EXPECTED_AREA = 'cdx_mapflat01'
$env:AURORA_TOOLSET_EXPECTED_AREA_NAME = 'Ostatnie Miasto - Port, Mieszkanie Kartografa'
node backend\scripts\open-last-city-module-and-area-toolset-no-global-input.mjs
```

It must report `ok: true`, no existing Toolset processes, and `temp0.exists:
false`. This mode does not launch Toolset and does not stage MRU.

The bundled full dry proof preflight is:

```powershell
node backend\scripts\preflight-last-city-toolset-proof.mjs `
  --modulePath "$env:USERPROFILE\Documents\Neverwinter Nights\modules\codex_writer_concept_sic_tilemap34_shrink_stone_spine_lab.mod" `
  --label tilemap34-shrink-stone-spine
```

It runs the cleanup probe, Toolset preflight-only, crash-risk audit, and concept
map checker. It must return `status: passed` before any real Toolset launch.

After a clean screenshot, close the Toolset frame without global input:

```powershell
node backend\scripts\close-aurora-toolset-window-no-global-input.mjs
```

If this cannot close the session and no access violation is present, stop and
ask for a supervised close instead of force-stopping Toolset as a normal path.

## Lab Module Rules

Do not copy the full Last City `Mod_HakList` into small lab modules. The full
58-hak profile can trigger `Loading Inventory List` access violations and makes
the proof loop noisy.

Use a Toolset-native Area Wizard base and an asset-scoped hak profile for the
current area slice. For the cartographer apartment the current safe candidate
profile is the `sic11` 19-hak lab chain, not the full module profile:

```powershell
$env:AURORA_LAST_CITY_APARTMENT_SOURCE_HAK_LIST = `
  'lc_2da.hak|lc_hd_plcbls.hak|lc_placeable.hak|lc_placeable_cust.hak|q_tilesets.hak|q_!tilesets.hak|medieval.hak|medievalrural.hak|+sic_builder.hak|+sic_winter.hak|+sic11.hak|cep3_core0.hak|cep3_core1.hak|cep3_core2.hak|cep3_tiles.hak|nwic_placeables.hak|q_placeables.hak|witcher.hak|witcher2.hak'
```

The generator must copy `Mod_CustomTlk` from the source module, but `Mod_HakList`
should be filtered unless a full-module proof is explicitly needed and accepted
as high risk.

Implemented guard:

```powershell
$env:AURORA_LAST_CITY_APARTMENT_SOURCE_HAK_LIST = '...'
node backend\scripts\create-last-city-apartment-area.mjs
```

The summary must report `copiedModuleResourceFields`, including requested,
selected, and missing haks.

`create-last-city-apartment-area.mjs` must also read the critical failure
registry and refuse to generate into a quarantined candidate. This closes the
gap where a rejected `.mod` could be overwritten or recycled before the
Toolset launch guard has a chance to block it.

## Visual Acceptance

The concept art is not a decorative reference. It is the visual target for the
iteration. A candidate fails if it does not communicate the same apartment even
when the data audits pass.

Compare these items after every valid screenshot:

- layout: left study/lounge, central map room, right bedroom, lower storage or
  dock utility zone;
- density: large empty floor areas are a fail unless the concept shows them;
- focal point: map table and working clutter must read first;
- light: warm lamps/candles and dark Last City interior contrast;
- scale: papers, crates, shelves, bed, table, and wall clutter must fit the
  room instead of looking copied or random;
- silhouettes: big blockers, ceiling planes, oversized assets, and missing
  walls are immediate fix items.

Use:

```powershell
node backend\scripts\compare-area-concept-art.mjs --toolset <fresh-toolset-png>
```

Never compare a new module candidate against an old screenshot.

## Concept Tile/Placeable Map Gate

Before another placement pass or Toolset proof, build and check the concept
placeable map:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/concept-placeable-tile-map.json
backend/docs/aurora-reverse/last-city-cartographer-concept-placeable-map-2026-07-03.md
```

The map splits the apartment into six tiles:

- `NW`: study lounge;
- `N`: central cartographer map room;
- `NE`: bedroom nook;
- `SW`: hearth utility room;
- `S`: entry hall;
- `SE`: port storage room.

Use the checker before launching Aurora:

```powershell
node backend\scripts\check-last-city-concept-placeable-map.mjs --modulePath <candidate.mod> --out <check.json>
```

This checker does not prove visual parity. It proves that the generated GIT
contains the required concept motifs in the right tiles before the fragile
Toolset proof starts. A missing hero motif is a blocker. Density warnings are
iteration notes unless the screenshot also shows a visual problem.

For placement iterations, run the stricter concept-anchor checker as well:

```powershell
node backend\scripts\compare-last-city-concept-anchors.mjs --modulePath <candidate.mod> --out <anchor-check.json>
```

This checker compares the module's actual GIT placeable positions with the
concept `anchorZones`. It answers whether the expected object roles are inside
the correct concept zones, not only whether enough books/rugs/lights exist
somewhere in the tile. A candidate with global role coverage but failed anchors
is not ready for visual promotion.

2026-07-06 example: `tilemap40` had clean global concept-map coverage but only
`0.861` anchor score. `tilemap42_anchoralign` keeps the same object count
(`312`) and VisualTransform count (`89`), moves eight existing anchors by real
`X/Y/Z/Bearing`, reaches `1.000` anchor score, and passes crash-risk plus full
Toolset preflight. It still needs a controlled Aurora/Toolset screenshot before
acceptance.

Current best clean map-driven lab candidate:

```text
C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_writer_concept_sic_tilemap34_shrink_stone_spine_lab.mod
```

Offline and Toolset proof evidence:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/crash-risk-tilemap30-safe-mood-20260705T1314-lab.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/concept-placeable-tile-map-check-tilemap30-safe-mood-20260705T1314.json
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

Status: crash-risk passed; concept map check passed with 0 errors and 0
warnings; full dry Toolset preflight passed with no blockers; Toolset opened
cleanly, produced a valid textured screenshot, and closed cleanly. `tilemap34`
has 312 placeables, 89 non-default `VisualTransform` placeables, 0
`VisualTransform` on static placeables, and all six concept tiles inside budget:
`NW=46`, `N=94`, `NE=47`, `SW=38`, `S=44`, `SE=43`.

This is the current baseline for further work, not completion. It changes only
six `concept_stone_spine` VisualTransform values from tilemap30 and improves
the proof metrics: luma `50.57 -> 49.08`, dark ratio `0.7611 -> 0.7913`, and
saturation `0.3758 -> 0.3932`. The comparison result is still
`pass_with_iteration_notes`, score `0.91`, semantic `1.00`, visual `0.81`.
The remaining visual partials are `visual_dark_mass` and `visual_saturation`;
the unmasked image-delta originally pointed at `SW`, then `NW`/`SE`.

The baseline changes only after a fresh candidate beats it on a matching
Toolset screenshot and concept comparison.

Dry-gated candidates prepared after the latest concept mismatch review:

```text
C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_writer_concept_sic_tilemap39_rightcolumn_windowmass_lab.mod
C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_writer_concept_sic_tilemap40_moodcontrast_lab.mod
```

`tilemap39` changes only right-column tile variants
`82,80,89,72,73,91 -> 82,80,90,72,73,92`. `tilemap40` changes only the area
lighting profile to `concept-mood-contrast`; it keeps the `tilemap34` tile and
placeable contract intact. Both candidates pass crash-risk, concept map, and
full dry Toolset proof preflight with no blockers. Neither is accepted visually
until a fresh Toolset screenshot and concept comparison prove improvement over
`tilemap34`.

2026-07-06 `tilemap40` live proof attempt is explicitly invalid as visual
evidence. The Toolset open/close path was clean, but the readonly capture saved
the desktop wallpaper instead of the Toolset HWND:

```text
backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-readonly-window-capture-20260706T103439Z.png
```

That PNG must not be passed into concept comparison as an area-quality result.
After this failure, `capture-areas-toolset-window-readonly.mjs` blocks captured
images that lack Toolset neutral chrome or match the neon desktop/wallpaper
profile.

Corrected `tilemap40` proof used targeted topmost Toolset capture and passed the
image sanity guard:

```text
backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-sic-tilemap40-moodcontrast-20260706T1044-topmost.png
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-comparison/sic-tilemap40-moodcontrast-manualbaselinecrop-20260706T1044/comparison-report.md
backend/docs/aurora-reverse/artifacts/last-city-placeable-usage-map-tilemap40-moodcontrast-20260706T1044/placeable-usage-map.json
```

Result: valid screenshot and clean close, but no baseline promotion. Score stays
`0.91`, semantic `1.00`, visual `0.81`; lighting-only mood contrast was too
small to close the concept gap.

Next offline candidate:

```text
C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_writer_concept_sic_tilemap41_vtcontrast_lab.mod
```

`tilemap41` enables `AURORA_LAST_CITY_APARTMENT_CONCEPT_CONTRAST_VT_PASS=1` on
top of the proven `tilemap34` placeable/tile contract and `tilemap40` lighting.
It changes 19 existing VisualTransform values, with 0 added/removed placeables,
0 risky overlays, and 0 non-motif floor overlays. It has not been opened in
Toolset yet because the full preflight is blocked by an existing Toolset
process/temp0 from parallel work.

Evidence:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-proof-preflight-tilemap39-rightcolumn-windowmass-before-proof-20260706T1023-2026-07-06T10-24-09-040Z.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/tile-layout-tilemap39-rightcolumn-windowmass-20260706T1023-20260706T102353Z.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/candidate-compare-tilemap34-to-tilemap39-rightcolumn-windowmass-20260706T1023.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-proof-preflight-tilemap40-moodcontrast-before-proof-20260706T1025-2026-07-06T10-26-05-286Z.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/tile-layout-tilemap40-moodcontrast-20260706T1025-20260706T102549Z.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/candidate-compare-tilemap34-to-tilemap40-moodcontrast-20260706T1025.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/summary-tilemap41-vtcontrast-20260706T1052.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/tile-layout-tilemap41-vtcontrast-20260706T1052-20260706T105104Z.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/candidate-compare-tilemap34-to-tilemap41-vtcontrast-20260706T1052.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-proof-preflight-tilemap41-vtcontrast-before-proof-20260706T1052-2026-07-06T10-51-42-258Z.json
```

Crop-artifact audit corrected that priority:

```text
backend/docs/aurora-reverse/artifacts/toolset-crop-edge-artifacts/tilemap34-shrink-stone-spine-20260705Tproof-edge-artifacts.md
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-image-delta/tilemap34-shrink-stone-spine-20260705Tproof-edgeartifactmasked-image-delta.md
```

The Toolset crop has a stable neutral-gray L artifact near the lower-left crop
edge: 6069 pixels, ratio `0.018714`, component bounds `2,236,17,224` and
`4,449,222,11`. This is not an area object. After excluding those normalized
regions, the next real image-delta focus is `NW`, then `SE`, then `NE`.

Latest Toolset-backed visual comparison:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-comparison/sic-tilemap34-shrink-stone-spine-currentmap-20260705Tproof/comparison-report.md
backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-sic-tilemap34-shrink-stone-spine-20260705Tproof-topmost.png
```

Status: `pass_with_iteration_notes`, score `0.91`, semantic `1.00`, visual
`0.81`. The tilemap34 screenshot is valid and better than tilemap30 in measured
luma, dark mass, and saturation, but the area is still not final because dark
mass and saturation remain partial. Do not promote it until human inspection
accepts the image as Last City quality.

Rejected controlled Toolset candidate after the access-violation audit:

```text
C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_writer_concept_sic_tilemap35_targeted_vt_mood_lab.mod
```

Status: rejected for visual progression. It was generated from the clean
`codex_writer_concept_sic_source.mod` lab base, not from the previous proof
`.mod`; the full Last City module was used read-only for source placeable GIT
data. This matters because a proof `.mod` may no longer contain the
`wnd_tmplt_flat_5` base resource needed for safe regeneration. The proof itself
was clean: one controlled Toolset open, fresh screenshot, clean close, no
recovery, no access violation, and no `temp0`.

Evidence:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/crash-risk-tilemap35-targeted-vt-mood-20260705T1402-lab.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/concept-placeable-tile-map-check-tilemap35-targeted-vt-mood-20260705T1402.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-proof-preflight-tilemap35-targeted-vt-mood-before-proof-20260705T1402.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-proof-preflight-tilemap35-targeted-vt-mood-before-proof-20260705T-safe-recheck.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-open-tilemap35-targeted-vt-mood-20260705Tproof.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-capture-tilemap35-targeted-vt-mood-20260705Tproof.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-close-tilemap35-targeted-vt-mood-20260705Tproof.json
backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-sic-tilemap35-targeted-vt-mood-20260705Tproof-topmost.png
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-comparison/sic-tilemap35-targeted-vt-mood-currentmap-20260705Tproof/comparison-report.md
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-comparison/sic-tilemap35-targeted-vt-mood-currentmap-20260705Tproof/comparison-contact-sheet.png
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-image-delta/tilemap35-targeted-vt-mood-20260705Tproof/tilemap35-targeted-vt-mood-20260705Tproof-image-delta.md
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/candidate-compare-tilemap34-to-tilemap35-targeted-vt-mood-20260705T1402.json
backend/docs/aurora-reverse/artifacts/last-city-placeable-usage-map-tilemap35-targeted-vt-mood-20260705T1402/placeable-usage-map.json
docs/LAST_CITY_PLACEABLE_USAGE_MAP_2026-07-02-tilemap35-targeted-vt-mood-20260705T1402.md
```

Dry gates passed: crash-risk `passed`, concept map `passed` with 0 errors and
0 warnings, dry Toolset proof preflight `passed` with no blockers. Candidate
diff versus tilemap34: 312 placeables unchanged, 0 risky overlays, 0 non-motif
floor overlays, and 21 `VisualTransform` changes targeted only at `NW`, `SW`,
and `SE`. Visual proof rejected the hypothesis: luma worsened `49.08 -> 49.45`,
dark ratio worsened `0.7913 -> 0.7857`, saturation worsened
`0.3932 -> 0.3919`, and the worst-cell priorities all increased. Do not
continue by scaling existing rugs/textiles/screens. Continue from tilemap34 or a
new hypothesis that targets darker, richer silhouettes in `NW`/`SE`/`NE`.
The edge-artifact-masked recheck confirms this: `tilemap35` is still worse than
tilemap34 in `NW` (`0.9415 -> 0.9576`) and `SE` (`0.7465 -> 0.8009`), while
`NE` is unchanged.

Latest clean Toolset proof after crop-artifact correction:

```text
C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_writer_concept_sic_tilemap36_edgefocus_lab.mod
```

This candidate was built from the clean `codex_writer_concept_sic_source` lab
module, with `the_last_city - codex.mod` used read-only as the placeable source
and with the 19-hak `sic11` lab chain copied into `Mod_HakList`. It enables
`AURORA_LAST_CITY_APARTMENT_EDGE_ARTIFACT_MASKED_FOCUS_PASS=1`.

Evidence:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/summary.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/crash-risk-tilemap36-edgefocus-20260705T1430-lab.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/concept-placeable-tile-map-check-tilemap36-edgefocus-20260705T1430.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-proof-preflight-tilemap36-edgefocus-before-proof-20260705T1430-2026-07-05T14-31-09-724Z.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/candidate-compare-tilemap34-to-tilemap36-edgefocus-20260705T1430.json
backend/docs/aurora-reverse/artifacts/last-city-placeable-usage-map-tilemap36-edgefocus-20260705T1430/placeable-usage-map.json
docs/LAST_CITY_PLACEABLE_USAGE_MAP_2026-07-02-tilemap36-edgefocus-20260705T1430.md
backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-readonly-window-capture-20260705T143607Z.png
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-comparison/sic-tilemap36-edgefocus-currentmap-20260705Tproof/comparison-report.md
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-comparison/sic-tilemap36-edgefocus-manualbaselinecrop-20260705Tproof/comparison-report.md
backend/docs/aurora-reverse/artifacts/toolset-crop-edge-artifacts/tilemap36-edgefocus-manualbaselinecrop-20260705Tproof-edge-artifacts.md
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-image-delta/tilemap36-edgefocus-manualbaselinecrop-20260705Tproof-edgeartifactmasked-image-delta.md
```

Status: clean Toolset proof completed, but rejected/neutral for visual
progression. Crash-risk `passed`, concept map `passed` with 0 errors/0 warnings,
dry Toolset preflight `passed`, the expected lab module/area opened, screenshot
was captured, Toolset closed cleanly, `temp0` stayed absent, and `nwtoolset.ini`
was restored. Diff versus tilemap34: `+8` placeables, `0` removals, `0`
VisualTransform value changes, `0` risky overlays, `0` non-motif floor overlays.
Added by tile: `NW +3`, `SE +4`, `NE +1`.

The fair comparison must use the same manual baseline crop as tilemap34
(`610,275,690,470`). The auto-detected crop (`632,304,640,417`) produced
`0.78` / `needs_visual_iteration`, while the manual baseline crop produced
`0.91` / `pass_with_iteration_notes`; those two scores are not comparable
across candidates. Against the same baseline crop, `tilemap36` is not better
than `tilemap34`: luma worsened `49.08 -> 49.28`, dark ratio worsened
`0.7913 -> 0.7891`, and saturation stayed effectively unchanged. After masking
the stable L-shaped crop artifact, the worst cells are still `NW`, `SE`, and
`NE`. Do not continue by adding small edge-focus clutter; the next hypothesis
must reduce bright floor/readable modularity more directly.

Rejected structural-mass candidate:

```text
C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_writer_concept_sic_tilemap37_structuralmass_lab.mod
```

`tilemap37` is the first candidate after that correction. It uses
`AURORA_LAST_CITY_APARTMENT_STRUCTURAL_MASS_PASS=1` and leaves the rejected
edge-focus pass disabled. The change is deliberately structural rather than
decorative: larger safe bookcase/cabinet/wardrobe/post/crate/barrel silhouettes
in `NW`, `SE`, and `NE`, with no q_314/splat/stain/dirt floor shortcut.

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
Crash-risk `passed` with 0 errors/0 warnings, concept map `passed` with 0
errors/0 warnings, dry Toolset preflight `passed`, the expected lab module/area
opened, screenshot was captured, Toolset closed cleanly, `temp0` stayed absent,
and `nwtoolset.ini` was restored. The fair comparison uses the same manual
baseline crop as tilemap34/tilemap36. It kept score `0.91` / visual `0.81`, but
made the measured image worse than the tilemap34 baseline: luma `49.08 ->
49.58`, dark ratio `0.7913 -> 0.7837`, and saturation `0.3932 -> 0.3917`.
After masking the stable lower-left crop artifact, the worst cells also got
worse in the places the pass was meant to fix: `NW 0.9415 -> 1.0150` and
`SE 0.7465 -> 0.8346`; `NE 0.7284 -> 0.7230` is too small to justify the
regression. Do not continue by adding larger structural silhouettes. Tilemap34
remains the current best clean Toolset-backed baseline.

Offline tile-layout inspection after the rejection:

```text
backend/scripts/inspect-last-city-area-tile-layout.mjs
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/tile-layout-tilemap34-shrink-stone-spine-20260705Tproof.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/tile-layout-tilemap37-structuralmass-20260705Tproof.json
```

Result: tilemap34 and tilemap37 have the same ARE tile contract:
`Tile_ID=82,80,89,72,73,91`, `Tile_Orientation=1,3,2,2,3,0`, all tile lights
zero, `ShadowOpacity=85`, `IsNight=1`, `DayNightCycle=0`, and sun/moon shadows
enabled. Therefore the tilemap37 regression is not a tile-layout or tile-light
change; it is a failed placeable/composition hypothesis. The next candidate
must start from tilemap34 and use an offline tile/floor/readability hypothesis
before any Toolset proof. Do not spend the next pass adding more cabinets,
crates, shelves, barrels, or generic clutter.

Current offline floor/readability candidate:

```text
C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_writer_concept_sic_tilemap38_floorread_lab.mod
```

`tilemap38` starts from the clean `codex_writer_concept_sic_source.mod` lab
module, uses the full Last City module only as read-only source data, and keeps
the same 19-hak `sic11` lab chain. It is deliberately narrower than tilemap37:
no added placeables, no removed placeables, no tile layout change, no tile light
change, no risky overlays, and no non-motif floor overlays. The only delta from
tilemap34 is a floor/readability VisualTransform adjustment on the six
`q_148` `concept_stone_spine` placeables: scale `0.42/0.48/0.42 ->`
`0.28/0.32/0.28`. This keeps the concept map's `central_stone_spine` and
`entry_stone_spine` motifs present while reducing the bright gray floor read.

Offline evidence:

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

Status: dry gates passed only. Crash-risk `passed` with 0 errors/0 warnings,
concept map `passed` with 0 errors/0 warnings, full Toolset proof preflight
`passed` with no blockers and no Toolset launch. Tile layout remains
`82,80,89,72,73,91` with orientations `1,3,2,2,3,0`, all tile lights zero.
This is the current safest proof candidate, not visual acceptance.

Rejected visual-transform scale experiment:

```text
C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_writer_concept_sic_tilemap31_vt_mood_lab.mod
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/candidate-compare-tilemap30-to-tilemap31-vt-mood-20260705T1321.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-comparison/sic-tilemap31-vt-mood-currentmap-20260705Tproof/comparison-report.md
```

`tilemap31` opened cleanly, but scaling existing rugs/wall mood shapes did not
improve the proof. It kept score `0.91` and made luma/dark-mass slightly worse.
Continue from `tilemap34`, not `tilemap31`.

`tilemap15` is rejected after the 2026-07-05 Toolset access violation. Its
`temp0` evidence was archived at:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-temp0-2026-07-05T11-22-21-183Z-access-violation-tilemap15-visible-stop
```

Post-AV regression check:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/concept-placeable-tile-map-check-tilemap15-20260705T1124-postav-regression.json
```

Status: `passed_with_warnings`, with `N=101`, `S=63`, and non-motif floor
overlay warnings (`N=12`, `S=20`). Do not reopen `tilemap15`.

Quarantine regression:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-critical-failures.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-proof-preflight-tilemap15-quarantine-regression2-20260705.json
```

Status: `blocked`, with
`candidate_quarantined_after_toolset_critical_failure` and
`concept_map_not_clean`.

`tilemap41` is rejected after the 2026-07-06 Toolset access violation. It is a
different failure class from `tilemap15`: the module had 0 added placeables, 0
removed placeables, clean GIT/GIC cardinality, and no non-motif floor overlays,
but it raised the same Toolset access-violation family after viewport/progress
render.

Crash text:

```text
Access violation at address 006C2D53 in module 'nwtoolset.exe'. Read of address 000003D8.
```

Evidence:

```text
backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-sic-tilemap41-vtcontrast-20260706T1057-topmost.png
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-temp0-2026-07-06T10-58-50-736Z-access-violation-tilemap41-vtcontrast-proof
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/candidate-compare-tilemap34-to-tilemap41-vtcontrast-20260706T1052.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/crash-risk-tilemap41-post-av-guard-20260706.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-proof-preflight-tilemap41-post-av-guard-20260706.json
```

Root-cause status: not proven to one object, but narrowed enough for a hard
offline gate. The repeated address maps in local decompilation to
`FUN_006c2d50`, which dereferences `param_1 + 0x3d8`; the crash text is
consistent with a null Toolset progress/list wrapper after the viewer state is
poisoned. The new `check-last-city-apartment-area-crash-risk.mjs` viewport gate
blocks the two correlated data patterns:

- non-motif floor overlays from `q_148`, `q_154`, or `zep_house001`;
- structural VT above the last clean range for `q_148` concept stone spine and
  low `witcher939` wall panels.

Regression evidence:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/crash-risk-tilemap34-post-av-guard-20260706.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/crash-risk-tilemap40-post-av-guard-20260706.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/crash-risk-tilemap41-post-av-guard-20260706.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/crash-risk-tilemap15-post-av-guard-20260706.json
```

Status: `tilemap34` and `tilemap40` pass with `viewportRenderRiskCount=0`.
`tilemap41` fails with `viewportRenderRiskCount=10`. `tilemap15` fails with
`viewportRenderRiskCount=32`. Do not reopen `tilemap41`.

Latest dry placement-plan evidence:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/concept-placeable-tile-map-check-tilemap30-safe-mood-20260705T1314.json
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/concept-placeable-tile-map-check-tilemap30-safe-mood-20260705T1314.svg
```

Latest dry proof preflight:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-proof-preflight-tilemap30-safe-mood-before-proof-20260705T1315.json
```

Status: `passed`, with no blockers. This preflight does not launch Toolset and
is not visual acceptance.

Latest rejected candidate diff:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/candidate-compare-tilemap30-to-tilemap31-vt-mood-20260705T1321.json
```

Result: `tilemap31` changed only a small set of `VisualTransform` scale values
from `tilemap30`. It passed dry gates and opened cleanly, but visual comparison
did not improve the area. Do not continue that direction without a new offline
image-delta reason.

Rejected tilemap32 safe-anchor experiment:

```text
C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_writer_concept_sic_tilemap32_delta_safe_lab.mod
```

Reason: offline image-delta analysis of the tilemap30 Toolset crop identified
`SW`, `N`, and `NW` as the worst visual cells. `N` was already at its density
budget, so tilemap32 adds only six safe anchors: four structural/textile anchors
in `SW` and two in `NW`. It does not add heavy floor overlays and does not scale
the existing tilemap30 rug/wall set globally.

Evidence:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-image-delta/tilemap30-safe-mood-20260705Tproof-image-delta.md
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

Status: rejected for visual progression. Dry gates passed and Toolset proof was
clean: no recovery, no access violation, screenshot captured, and Toolset closed
with no `temp0`. However the visual metrics got worse than tilemap30:

- luma: `50.57 -> 51.06`;
- dark ratio: `0.7611 -> 0.7526`;
- saturation: `0.3758 -> 0.3744`;
- SW image-delta darkDeficit: `0.1767 -> 0.2194`.

Conclusion: do not continue by adding more safe structural/textile anchors to
SW/NW. The generator baseline now follows the proven tilemap34 stone-spine
shrink path; future iterations must use a different hypothesis from tilemap32.

Blocked no-stone-spine experiment:

```text
C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_writer_concept_sic_tilemap33_no_stone_spine_lab.mod
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/concept-placeable-tile-map-check-tilemap33-no-stone-spine-20260705T1346.md
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-proof-preflight-tilemap33-no-stone-spine-before-proof-20260705T1346-2026-07-05T13-46-15-429Z.json
```

`tilemap33` removed the stone spine entirely. Crash-risk passed, but concept map
warnings for missing `central_stone_spine` and `entry_stone_spine` caused full
proof preflight to block with `concept_map_not_clean`. It was not opened in
Toolset.

## Placement And VisualTransform Pass

Treat placement and visual presentation as separate contracts:

- `Adjust Location` / GIT `X`, `Y`, `Z`, `Bearing`: real object placement.
- `VisualTransform`: visual-only scale, rotate, and translate for silhouettes.
- Tiles: ARE/SET orientation, crop, ImageMap/void, ceiling visibility.

Rules:

- Do not fix placeable composition by changing tile rotation.
- Do not fix tile/crop problems by rotating every placeable.
- Use `VisualTransform` after the core motifs are present.
- Non-default `VisualTransform` must not be emitted on `Static=1` placeables.
- Prefer shaping fewer meaningful objects over adding more clutter.

## Definition Of Done

The apartment is not done until all are true:

1. Active target module is clean before deployment.
2. Candidate was built from a Toolset-native base or known-good backup.
3. Offline crash-risk audit passes.
4. Toolset opens the intended lab module and area without recovery, stale
   progress, wireframe-only viewport, or access violation.
5. Fresh screenshot exists for that exact candidate.
6. Concept comparison uses that exact screenshot and correct crop.
7. Human inspection says the result is Last City quality.
8. Only then can the candidate be promoted into the real module.

## 2026-07-03 Cartographer Findings

Current deployed area is `cdx_mapflat01` / `Ostatnie Miasto - Port,
Mieszkanie Kartografa` in the active Last City module. It was promoted on
2026-07-03 from the `readable6` small-lab candidate, not from the rejected
`readable7` experiment.

Deployed module:

```text
C:\Users\enonw\Documents\Neverwinter Nights\modules\the_last_city - codex.mod
```

The actual Windows filename contains the original dash from the local module
name. Use `GetShortPathNameW` when Toolset MRU staging needs an ASCII-safe path;
the proof run used `C:\Users\enonw\DOCUME~1\NEVERW~1\modules\THE_LA~3.MOD`.

Automatic backup before deployment:

```text
C:\Users\enonw\Documents\Neverwinter Nights\modules\the_last_city - codex.mod.pre-cdx_mapflat01-2026-07-03T12-56-36-465Z.bak
```

Deployment summary:

- area resources present: ARE/GIC/GIT all true;
- module entry count: 4808;
- `Mod_Area_list` count: 169 -> 170;
- area resource order: ARE, GIC, GIT at indices 4507-4509;
- placeables: 320;
- doors: 4;
- non-default `VisualTransform` placeables: 68;
- `VisualTransform` on static placeables: 0;
- `copiedModuleResourceFields`: empty, so the full Last City HakList was not
  filtered during real-module deployment.

Crash-risk audit for the deployed real module:

```text
backend/docs/aurora-reverse/artifacts/last-city-apartment-area/crash-risk-real-cdx-mapflat01-20260703T1256/crash-risk.json
```

Status: passed, with 0 errors and 0 warnings.

Best visual proof remains the small-lab Toolset proof, because the full Last
City module currently blocks in Toolset during `Loading Inventory List`.

Best lab proof candidate is `codex_writer_concept_sic_readable6_small_lab.mod`
built from `wnd_tmplt_flat_5` (`sic11`, 3x2) with the SIC hak chain restored:

```powershell
lc_2da.hak|lc_hd_plcbls.hak|lc_placeable.hak|lc_placeable_cust.hak|
q_tilesets.hak|q_!tilesets.hak|medieval.hak|medievalrural.hak|
+sic_builder.hak|+sic_winter.hak|+sic11.hak|
cep3_core0.hak|cep3_core1.hak|cep3_core2.hak|cep3_tiles.hak|
nwic_placeables.hak|q_placeables.hak|witcher.hak|witcher2.hak
```

Do not use the minimal `tni01` hak profile for `sic11` areas. It caused a
Toolset load modal: `List index out of bounds (82)`.

`capture-areas-toolset-window-readonly.mjs` can capture the Codex app or desktop
wallpaper instead of the Toolset render when focus/window bounds are wrong. The
script now performs image sanity validation after capture. A PNG must show a
large enough window and Toolset-like neutral chrome; a neon/wallpaper profile
blocks proof with `capture_missing_toolset_neutral_chrome` and/or
`capture_matches_neon_wallpaper_or_desktop`. For Toolset OpenGL viewport proof,
use a targeted Toolset HWND screen capture after temporarily raising the Toolset
window topmost, then remove topmost immediately. `PrintWindow` is not enough:
it captures the editor chrome but can return a blank viewport.

Guard validation examples:

```powershell
node backend\scripts\capture-areas-toolset-window-readonly.mjs --validateCaptureImage backend\backend\docs\aurora-reverse\artifacts\areas-runtime-capture\toolset-readonly-window-capture-20260705T151954Z.png
node backend\scripts\capture-areas-toolset-window-readonly.mjs --validateCaptureImage backend\backend\docs\aurora-reverse\artifacts\areas-runtime-capture\toolset-readonly-window-capture-20260706T103439Z.png
```

Expected result: the first image passes as a real Toolset screenshot; the second
is blocked as a desktop/wallpaper false positive.

`cleanup-aurora-toolset-critical-stop.mjs --probeOnly` must be used for state
inspection. It is non-mutating. Only run the full cleanup on access violation,
recovery prompt, persistent modal error, or a Toolset state that cannot be
closed cleanly.

Unified concept parity dashboard:

```powershell
node backend\scripts\compare-last-city-concept-parity.mjs `
  --modulePath "C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_writer_concept_sic_tilemap42_anchoralign_lab.mod" `
  --toolset "backend\backend\docs\aurora-reverse\artifacts\areas-runtime-capture\toolset-readonly-window-capture-20260706T112730Z.png" `
  --toolsetCrop "610,275,690,470" `
  --label tilemap42-anchoralign-readonlycapture-20260706T112730
```

This is the preferred post-screenshot comparison command. It rebuilds the
placeable usage map from the candidate module, checks concept tile rules,
checks anchor zones, inspects ARE tile layout, runs screenshot-vs-concept
comparison, and writes a single priority queue. It does not open Toolset or use
global input. If the dashboard says anchors pass but visual score fails, the
next change must target tile/material/large silhouette composition before
adding more small props.

When ranking multiple candidates, use a stable `--toolsetCrop`; otherwise a
candidate can look better or worse because of auto-crop drift rather than real
area quality. The current fixed comparison crop is `610,275,690,470`.

Known AV candidates added on 2026-07-06:

- `codex_writer_concept_sic_tilemap44_mixedtile_lab.mod`;
- `codex_writer_concept_sic_tilemap45_sw_darkmass_lab.mod`.

Both are quarantined in `toolset-critical-failures.json`; do not open or
regenerate them. The generator blocks the exact `tilemap44` tile override and
the retired SW dark-mass pass.

Latest evidence:

- best valid Toolset screenshot:
  `backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-sourcebase-sic-readable6-small-screen-capture-20260703T1244-topmost.png`;
- best valid concept comparison:
  `backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-comparison/sic-readable6-small-areacrop-20260703T1244/comparison-report.md`;
- contact sheet:
  `backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-comparison/sic-readable6-small-areacrop-20260703T1244/comparison-contact-sheet.png`;
- rejected experiment:
  `backend/docs/aurora-reverse/artifacts/last-city-apartment-concept-comparison/sic-readable7-small-areacrop-20260703T1254/comparison-report.md`;
- real-module full Toolset blocker temp0 archives:
  `backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-temp0-2026-07-03T13-03-50-064Z-stuck-loading-inventory-real-module-proof`;
  `backend/docs/aurora-reverse/artifacts/last-city-apartment-area/toolset-temp0-2026-07-03T13-06-58-276Z-stuck-loading-inventory-real-module-proof-second-attempt`.

Best comparison result: `pass_with_iteration_notes`, score 0.91, semantic
score 1.00, visual score 0.81. All concept pillars match. Remaining gap:
Aurora reads cleaner/brighter and more modular than the concept, especially in
dark mass and saturation. `readable7` tried to add heavier wall/silhouette
anchors, but introduced bright side panels and dropped to score 0.86, so it was
rejected and removed from the generator.

Do not mark the full goal complete from real-module data alone. The active
module contains the area and passes offline gates, but full-module Toolset
opening is currently blocked by repeated `Loading Inventory List` hangs. Further
full-module proof work should first solve that Toolset/module-load issue or use
a Toolset-native backup known to open cleanly.
