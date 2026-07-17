# Aurora Toolset: Module creation slices source of truth

Date: 2026-06-21

Status: source-of-truth for module creation work; M01 live creation accepted.

This document is the current contract for creating a new module in Aurora
Toolset. It is separate from creature/placeable/location authoring slices
because `File > New` can replace the active Toolset session and can trigger a
save/discard prompt for the currently loaded module.

Rule of thumb: opening `File > New`, seeing a wizard page, or typing one field
is not a slice. The accepted slice is the complete lifecycle: protect the
current module, create a disposable module, prove it exists and opens, then
park or clean it explicitly.

## Safety contract

- Do not overwrite or save `the_last_city [U+2014 em dash] codex.mod`.
- If the current module has `*` in the title and Toolset asks whether to save
  it before creating a new module, the allowed automated response is `No` /
  `Nie` only after recording the current title and current module file
  snapshot. Never click `Yes` / `Tak` for the current production module.
- Use no global mouse and no global keyboard. Prefer targeted `WM_COMMAND`,
  dialog `BM_CLICK`, list/combo messages, and direct child-window text APIs.
- A disposable module must use an unmistakable prefix such as
  `codex_mod_create_YYYYMMDD_HHMM` for the module filename/display name and a
  short resref-safe start area such as `cdx_start_01`.
- A created disposable module may be parked if the summary says so explicitly.
  Deleting it is a separate cleanup decision and should not be implied.
- Runtime `Build Module` / `Test Module` is out of scope for this document.
  That belongs to a later runtime/location phase.

## Acceptance rule for module creation

The module creation slice is accepted only when it has:

- before screenshot and machine summary of the active Toolset title;
- current module file snapshot for `the_last_city [U+2014 em dash] codex.mod` if it is loaded;
- current module save/discard prompt handling captured, including the chosen
  button text;
- controlled disposable module creation through Toolset UI, not offline file
  fabrication;
- screenshot and `summary.json` for every wizard page that affects the
  resulting module or start area;
- created module filename/path captured;
- readback proving the new module is active in the Toolset title;
- readback proving a start area exists in the left module tree;
- Module Properties readback for at least module name/tag/start area when that
  route is available;
- file-system readback proving the disposable `.mod` exists and is non-empty;
- cleanup/parking decision recorded: either reload original module, close the
  disposable module, or park it intentionally as a later artifact;
- final cleanup with `popupCount=0`, `modalCount=0`, `Responding=true`;
- `originalModuleSave=false`;
- no global mouse and no global keyboard takeover.

## Current slice ledger

| Slice | Scope | Status | Evidence / note |
| --- | --- | --- | --- |
| M00 | New Module command and wizard page map, no create | completed/route-mapped | Live route map: `File > New` is `WM_COMMAND 43`, New Module wizard is `TdlgModuleWizard`, Area Wizard is `TdlgAreaWizard`. The run also exposed two current-session discard prompts. |
| M01 | Disposable module create/readback/park lifecycle | accepted-module-created-parked | Created and parked `C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_training_field.mod` with start area `cdx_start_01`. Final manifest: `.codex-tmp/aurora-live-evidence/module-create-training-field-final-20260621-213945-504/summary.json`. |
| M02 | Reopen disposable module from module list | ready | Depends on M01 parked artifact. Use the known `File > Open` route, select `codex_training_field.mod`, prove title/tree readback, close or reload original. |
| M03 | Delete/cleanup disposable module file | missing/deferred | Do only after M01/M02 prove the artifact. Must prove Toolset is not holding the file or has reloaded original first, then file absence. |
| M04 | Module Properties starter fields roundtrip | missing/deferred | Mutate disposable module only: name/tag/start area/start coordinates. This is not part of creation unless M01 needs a post-create readback. |
| M05 | Build/Test created module runtime smoke | missing/deferred | Later runtime/location phase. Do not include in M01. |

## M00 read-only route map

Goal:

- Discover the targeted route for `File > New` and the New Module wizard pages
  without creating a module.

Known inputs:

- `File > New` is mapped as `WM_COMMAND 43`.
- `File > Open` is already mapped as `WM_COMMAND 44`.
- `File` menu ID `45` is not Save in the creation flow; it triggered a
  close/change-module prompt: `Would you like to save your changes to the
  module?`. Cancel this prompt if it appears during save mapping.
- `File > Save As` is mapped as `WM_COMMAND 47` and opens
  `TdlgModuleSelect`, title `Save As`, with `TEdit` prefilled from the module
  name and a `Save` button.
- Module Properties can be opened through the `Edit` menu route documented in
  `aurora-toolset-module-properties-findings-2026-06-18.md`.
- New Module wizard class: `TdlgModuleWizard`.
- Area Wizard class: `TdlgAreaWizard`.

Acceptance for M00:

- active Toolset title captured;
- current dirty marker captured;
- `File` menu or command route captured with screenshot/children/menu text;
- New Module wizard top-level class/title captured;
- all wizard pages reachable before final creation captured;
- `Cancel` closes the wizard cleanly;
- no new `.mod` file appears in the modules folder;
- final popup/modal `0/0`, `Responding=true`, `originalModuleSave=false`.

M00 must not:

- click `Finish`, `Create`, `OK`, or any equivalent final action;
- answer `Yes/Tak` to save the current module;
- count a single page screenshot as module creation.

## M01 disposable module lifecycle

Goal:

- Create a new disposable module through Aurora Toolset and prove it is a real
  module artifact, not just a wizard page.

Recommended disposable names:

- Module display/file stem for the current training field: `codex_training_field`.
- Generic disposable module stem, if another module is needed:
  `codex_mod_create_YYYYMMDD_HHMM`.
- Start area display/resref for the current training field: `cdx_start_01`.

Minimum workflow:

1. Capture baseline:
   - main Toolset title;
   - top-level windows;
   - current module file snapshot if title contains `the_last_city` and
     `codex.mod`;
   - modules folder listing for the planned disposable stem.
2. Open New Module through the route proven by M00.
3. If a current-module save prompt appears, click only `No` / `Nie` and record
   the dialog text and button.
4. Fill the wizard with the disposable module name and a minimal valid start
   area.
5. Finish/create the module.
6. Prove creation:
   - Toolset title contains the disposable `.mod`;
   - left tree has at least `Areas` and the created start area;
   - Module Properties Basic readback shows the created module name/tag/start
     area, if the dialog route is available after creation;
   - the disposable `.mod` exists in the modules directory and is non-empty.
7. Choose closeout:
   - `parked`: leave the disposable module file and record its path for M02/M03;
   - `restored-original`: reload `the_last_city [U+2014 em dash] codex.mod` after parking;
   - `deleted`: only if Toolset no longer holds the file and deletion is proven.

Accepted M01 live result, 2026-06-21:

- Module file: `C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_training_field.mod`.
- File size/hash: `31199` bytes,
  `1BDE24B43495390B3BB60CD84F6A5AFA3057823BCBA4E4ACC66E748429611D05`.
- Toolset title readback:
  `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - codex_training_field.mod`.
- Left tree readback: `Areas > cdx_start_01` with child folders
  `Creatures`, `Doors`, `Encounters`, `Items`, `Merchants`, `Placeables`,
  `Sounds`, `Triggers`, `Waypoints`.
- Module Properties Basic readback:
  `Name=codex_training_field`, `Tag=MODULE`, `Start Area=cdx_start_01`,
  `Starting X=40`, `Starting Y=40`, `Starting Z=0`.
- Runtime client/build test: not run in M01; remains M05.
- Closeout: `parked`; original module not restored in Toolset, created module
  remains open for training work.

M01 accepted statuses:

- `accepted-module-created-parked`
- `accepted-module-created-restored-original`
- `accepted-module-created-deleted-clean`

M01 blocked statuses:

- `blocked-new-command-unmapped`
- `blocked-save-current-module-prompt-unsafe`
- `blocked-wizard-page-unmapped`
- `blocked-create-no-file`
- `blocked-create-no-toolset-readback`
- `blocked-cleanup-file-held`

## M01 `summary.json` contract

Required top-level fields:

```json
{
  "sliceId": "M01",
  "status": "accepted-module-created-parked",
  "accepted": true,
  "mutation": true,
  "originalModuleSave": false,
  "createdModuleSave": true,
  "noGlobalMouse": true,
  "noGlobalKeyboard": true,
  "responding": true,
  "popupCountFinal": 0,
  "modalCountFinal": 0
}
```

Required `sliceSpecific` fields:

```json
{
  "originalTitle": "...the_last_city ... codex.mod*",
  "originalModuleSnapshot": {
    "path": "C:\\Users\\enonw\\Documents\\Neverwinter Nights\\modules\\the_last_city [U+2014 em dash] codex.mod",
    "length": 0,
    "sha256": "..."
  },
  "discardPrompt": {
    "appeared": true,
    "buttonClicked": "Nie"
  },
  "createdModule": {
    "displayName": "codex_mod_create_YYYYMMDD_HHMM",
    "filePath": "C:\\Users\\enonw\\Documents\\Neverwinter Nights\\modules\\codex_mod_create_YYYYMMDD_HHMM.mod",
    "exists": true,
    "length": 0
  },
  "createdStartArea": {
    "displayName": "codex_start_area",
    "resref": "cdx_start_01",
    "treePath": "Areas > cdx_start_01"
  },
  "toolsetReadback": {
    "titleContainsCreatedModule": true,
    "leftTreeContainsStartArea": true,
    "modulePropertiesReadback": true
  },
  "closeout": {
    "mode": "parked",
    "restoredOriginal": false,
    "deletedCreatedModule": false
  }
}
```

Use real sizes/hashes in evidence. The zero values above are placeholders for
the schema example only.

## Do not promote

- Do not promote M00 as M01.
- Do not promote a wizard screenshot unless a `.mod` file and Toolset readback
  exist.
- Do not promote a filesystem-created `.mod` as Toolset module creation.
- Do not promote a created module if the current `the_last_city [U+2014 em dash] codex.mod`
  file was saved or overwritten.
- Do not include `Build Module`, `Test Module`, HAK/TLK edits, runtime launch,
  or custom content changes in M01.
- Do not rely on global cursor movement. If a wizard control requires true
  global input, mark the route blocked and record the exact page/control.

## Priority order

1. M00: map and cancel New Module wizard safely.
2. M01: create one disposable module and park or restore original.
3. M02: reopen parked disposable module from module list.
4. M03: cleanup/delete parked disposable artifact if desired.
5. M04/M05 stay deferred until module creation itself is accepted.

