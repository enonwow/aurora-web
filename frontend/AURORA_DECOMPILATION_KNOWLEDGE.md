# Aurora Decompilation Knowledge Base (Ghidra Export)

Date: 2026-05-24  
Source root: `C:\Projects\New Folder`  
Primary exports: `export/strings.tsv`, `export/functions.tsv`, `export/decompiled_all.c`, `export/xrefs_domain.txt`, domain CSV snapshots (`area.csv`, `are.csv`, `git.csv`, `placeable.csv`, `module.csv`).

## Purpose
This file is a stable Aurora First evidence base from decompilation artifacts.  
Use it as implementation input together with screenshot parity notes.

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
