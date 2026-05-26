# Aurora Decompilation Knowledge Base (Ghidra Export)

Date: 2026-05-24  
Source root: `C:\Projects\New Folder`  
Primary exports: `export/strings.tsv`, `export/functions.tsv`, `export/decompiled_all.c`, `export/xrefs_domain.txt`, domain CSV snapshots (`area.csv`, `are.csv`, `git.csv`, `placeable.csv`, `module.csv`).

## Purpose
This file is a stable Aurora First evidence base from decompilation artifacts.  
Use it as implementation input together with screenshot parity notes.

## Deep Pass Addendum (2026-05-26)
This addendum captures function-level findings from `export/decompiled_all.c` for sound, location/bearing, and placeable behavior.  
These are high-confidence because they come from concrete read/write and UI-apply paths.

### A. Sound payload contract and field semantics (function-level)
Evidence block: `FUN_0063df90` read path and `FUN_0063e414` write path around `decompiled_all.c:331097-331318`.

Read/write keys in Aurora:
1. `Active`
2. `Continuous`
3. `Looping`
4. `Positional`
5. `RandomPosition`
6. `Random`
7. `Elevation`
8. `MaxDistance`
9. `MinDistance`
10. `RandomRangeX`
11. `RandomRangeY`
12. `Interval`
13. `IntervalVrtn`
14. `PitchVariation`
15. `Priority`
16. `Hours`
17. `Times`
18. `Volume`
19. `VolumeVrtn`
20. `Sounds.Sound` list entries

### B. Sound mode mapping used by dialog + runtime flags
Evidence:
1. Dialog load/apply path `FUN_006fe814` and `FUN_006ff2f4`.
2. Mode synthesis helper `FUN_0063e398`.

Aurora mode booleans:
1. `Positional = 0` and `RandomPosition = 0` -> "Plays everywhere in area".
2. `Positional = 1` and `RandomPosition = 1` -> "Plays from random position each play".
3. `Positional = 1` and `RandomPosition = 0` -> "Plays from specific position".

Additional playback flags:
1. `Continuous`, `Looping`, and `Random` contribute to computed mode byte (`+0x6a`) in `FUN_0063e398`.
2. `Times` is mapped to radio group values (`day/night/all/specific`) and `Hours` stores the 24-bit mask.

### C. Interval and distance scaling in Sound dialog
Evidence:
1. `FUN_006fe814` and `FUN_006ff2f4` divide/multiply by `10.0` when moving between UI and model.
2. `FUN_00700b0c`, `FUN_00700ce4`, `FUN_006fe5e0`.

Observed behavior:
1. Interval fields are stored as integer ticks and shown as decimal seconds in UI (`value * 10` and `/ 10` conversions in code paths).
2. `MaxDistance` ("outer radius / cutoff") and `MinDistance` ("inner radius / max volume") are clamped and synchronized.
3. Dialog frequently seeds inner radius as `outer * 0.1` (`*(param_1 + 0x6d4) = *(param_1 + 0x6cc) * 0.1`), then applies additional clamp rules (`0 <= inner <= outer`).

### D. Sound positioning UI gating logic
Evidence:
1. `FUN_006fd56c` controls enable/disable of positioning sub-controls.
2. `FUN_006fd3c8`, `FUN_006fd280`, `FUN_006fd7c0`, `FUN_006fd8f0`.

Implications:
1. Positioning controls are enabled only when positional modes are active.
2. Random range controls are conditionally gated by random-position mode.
3. Hour mask controls are disabled when "Play at all times" is selected.

### E. Bearing and location conversion math
Evidence:
1. Read path: `FUN_0055c0f8` / `FUN_0063d0d8`.
2. Write path: `FUN_0055c35c` / `FUN_0063d3d8`.

Confirmed:
1. Bearing is serialized in radians and converted against degrees in editor math (`57.295776` and `0.017453292` factors are explicit in code).
2. The editor normalizes/guards very small values before writeback (`1e-05` threshold path appears in write function).

### F. Placeable static/useable interplay
Evidence:
1. `FUN_0063bf74` reads `Useable`, `Static`, `OnInvDisturbed`, `OnUsed`.
2. Defaulting path uses `Useable == false` as static default seed in parse flow.

Implication:
1. `Static` and `Useable` are not independent in import defaults; Aurora parse logic couples them when explicit payload values are missing.

### G. Tile/area vocabulary for future Aurora-first implementation
Evidence:
1. `@@Tiledialog@Initialize` -> `FUN_007134c4` large key registration block.

Registered concept keys include:
1. `GROUP`, `GROUPS`, `TERRAIN`, `TERRAIN TYPES`, `TILES`, `Transition`, `HasHeightTransition`
2. `Orientation`, `VisibilityOrientation`, `DoorVisibilityOrientation`
3. `Sound`, `Sounds`, `Model`, `WalkMesh`, `ImageMap2D`
4. Lighting fields (`MainLight*`, `SourceLight*`, `Ambient*`, `Diffuse*`)

Use this key set as canonical naming baseline for parser contracts and frontend facades.

## High-Confidence Findings

### 1. Adjust Location + Bearing are separate, explicit UI building blocks
Evidence:
1. `TBearingPanel` / `@:BearingPanel` (`strings.tsv:142-144`).
2. `TdlgLocation` / `@:LocationDialog` (`strings.tsv:538-544`).
3. Init/finalize symbols:
   - `@@Bearingpanel@Initialize` / `Finalize` (`functions.tsv:221-222`)
   - `@@Locationdialog@Initialize` / `Finalize` (`functions.tsv:1679-1680`)
4. Action routing symbols:
   - `actLocationAdjust`
   - `actLocationAdjustExecute`
   (`strings.tsv:27624, 27648, 28429, 28486`)

### 2. Bearing panel has direct interaction events
Evidence:
1. `Bearing` (`strings.tsv:26377`)
2. `pOrientationAngleMouseUp` (`strings.tsv:26378`)
3. `udBearingClick` (`strings.tsv:26380`)

Implication:
1. Aurora uses both pointer interaction on the orientation panel and numeric step/input edits.

### 3. Visual Transform fields are first-class controls
Evidence:
1. `ObjectVisualTransformData` / `CAurObjectVisualTransformData` structures (`strings.tsv:104, 113, 124, 127, 130-132`).
2. Rotation controls:
   - `X Rotation`, `Y Rotation`, `Z Rotation`
   - `udRotationXClick`, `udRotationYClick`, `udRotationZClick`
   (`strings.tsv:26382-26384, 26393, 26391, 26395`)
3. Translation controls:
   - `X Translation`, `Y Translation`, `Z Translation`
   - `udTranslationXClick`, `udTranslationYClick`, `udTranslationZClick`
   (`strings.tsv:26385-26387, 26399-26401`)
4. Static toggle event:
   - `xbStaticClick` (`strings.tsv:13510, 26549`)

### 4. Apply/OK/Cancel flow is explicit in dialog events
Evidence:
1. `bApplyClick` (`strings.tsv:24739, 25512`)
2. `bOKClick` (`strings.tsv` multiple occurrences, for example `24685`, `24757`)
3. `bCancelClick` (`strings.tsv` multiple occurrences, for example `24759`, `24847`)

### 5. Placeable and Door have separate dialogs/wizards
Evidence:
1. Placeable:
   - `TdlgPlaceableEdit`, `TdlgPlaceableWizard`
   - `@@Placeabledialog@Initialize` / `Finalize`
   (`placeable.csv:17-24`, `functions.tsv:4251-4252`)
2. Door:
   - `TdlgDoorEdit`, `TdlgDoorWizard`
   - `@@Doordialog@Initialize` / `Finalize`
   (`strings.tsv:411-422`, `functions.tsv:1043-1044`)

Implication:
1. Generic object editing and door editing are intentionally separated in Aurora tooling.

### 6. Area/tile/group model is explicit and rich
Evidence:
1. Core area entities:
   - `TAreaTile`, `TAreaGroup` (`strings.tsv:817, 841, 896, 922`)
2. Tile system entities:
   - `TTileSet`, `TTileSetTile`, `TTileSetRule`, `TTileGroup`, `TTileDoor`, `TTileSound`, `TTileSetTerrainType`
   (`strings.tsv:903, 914, 959, 961-965, 967-975`)
3. Area actions:
   - `actAreaResizeExecute`
   - `actAreaRotateExecute`
   - `actSelectTerrainExecute`
   - `actTilePropertiesExecute`
   (`strings.tsv:28107, 28110, 28111, 28480`)
4. UI/domain labels repeated across area blocks:
   - `GROUP`, `GROUPS`
   - `TERRAIN TYPES`, `TERRAIN`
   - `Transition`, `HasHeightTransition`
   (`strings.tsv` many repeated blocks, for example `6276-6318`, `8972-9014`)

### 7. Module/area coordinate keys are explicit in data
Evidence:
1. `Mod_Entry_X`, `Mod_Entry_Y`, `Mod_Entry_Z`, `Mod_Entry_Dir_X`, `Mod_Entry_Dir_Y`
   (`strings_2da.tsv:26-30`, `strings.tsv:10945-10949`, `11024-11028`)

Implication:
1. Position and facing are serialized as separate axis fields in module/area data flows.

## Aurora First Implementation Guidance
1. Keep `Adjust Location` implemented as dedicated workflow (`LocationDialog` + `BearingPanel` semantics), not merged into unrelated inspectors.
2. Preserve dual edit channels for orientation (`panel drag/click` + `numeric bearing input`).
3. Keep visual transform as explicit editable state (`rotation/translation/scale`) and keep `Static` gate behavior deterministic.
4. Maintain door-specific workflow boundaries (no accidental unification with generic placeable adjust flow).
5. Keep area authoring capabilities aligned with explicit Aurora concepts: tiles, tile groups, terrain selection, area resize/rotate, transition configuration.

## Confidence Legend
1. High: direct symbol/event/control names present in exports.
2. Medium: behavior inferred from control/event naming and dialog separation.
3. Low: exact math/transform algorithm details without decompiled function-level reconstruction.

## Open Reverse-Engineering Tasks
1. Reconstruct exact bearing math normalization/wrap behavior from code path behind `pOrientationAngleMouseUp` and `udBearingClick`.
2. Reconstruct exact tile connectivity/group placement logic from `TArea*` + `TTileSet*` method xrefs.
3. Reconstruct validation/clamping details for location/transform numeric ranges.

## Frontend Coverage Snapshot (aurora-web, 2026-05-24)
This section maps decomp evidence to actual implementation state in `frontend/`.

### Implemented from evidence
1. Dedicated `Adjust Location` workflow with `Position`, `Bearing`, dial interaction, and `Apply/OK/Cancel`.
2. Dual orientation input path (numeric + pointer dial).
3. Visual transform payload exists and is editable for `placeables/creatures/items`.
4. Door transform restrictions (anchor-bound) are enforced in viewport/mutation flows.
5. Placeable properties shell with active `name/tag/resRef/static` write path.

### Partially implemented (shell/preserve-first)
1. Placeable tabs (`Scripts/Advanced/Description/Comments`) are present but behavior is placeholder.
2. Sound parity exists as notes, but no dedicated sound-positioning data model/dialog yet.
3. Tile concepts exist as basic grid fields; no tileset/group parser/runtime contract yet.

### Not implemented in frontend yet
1. Door transition/link payload schema (`LinkedTo*`, `TransitionDestination`, `LoadScreenID`, module link).
2. VFX runtime contract and parser policy lanes in the frontend scene model.
3. Walkmesh query/pathing runtime integration.

## Aurora First Execution Split
Use with `frontend/AURORA_FIRST_IMPLEMENTATION_MATRIX.md`.

### Code now (safe without retail-hard-confirm)
1. Preserve-only schema additions for placeable advanced/script fields.
2. Sound positioning domain model + UI shell with strict mode gating.
3. Door transition preserve-only payload + UI shell.
4. Tileset/groups scaffolding and structural validators.

### Retail-hard-confirm later
1. Final bearing dial math/wrap exactness.
2. Canonical ARE/GIT write semantics for visual transforms and door transitions.
3. Exact sound/VFX runtime semantics and edge cases.
