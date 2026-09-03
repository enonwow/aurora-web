# Aurora Toolset Stage 5 Area standard

Status: active, fail-closed. This document records the accepted native Toolset
procedure for Stage 5 Area work. A screenshot, dirty title, or successful save
is never sufficient without source-backed ARE comparison.

## AUR-S05-01 — exactly one tile

1. Require one responding `nwtoolset` process, the exact module frame, and the
   frame on the non-primary physical display.
2. Read the baseline packed ARE into a source proof pack and require the exact
   expected tile count.
3. Select Terrain mode through the validated selection toolbar and confirm its
   native checked state.
4. Resolve the palette leaf by exact TreeView text. Send input only to the
   palette TreeView and the validated Area `TScrollBox`.
5. For an exact one-tile transaction, use a source-confirmed `1x1` Feature.
   Terrain/crosser paint is corner-based in tested tilesets: even a point click
   can legitimately rebuild a `2x2` neighbourhood. Such a result fails
   AUR-S05-01 and belongs to AUR-S05-02.
6. Save only after the frame becomes dirty. Confirm the dirty marker clears and
   the packed module write time changes.
7. Re-read all ARE tiles. Acceptance requires exactly one changed index and an
   explicit before/after field delta; object counts must remain unchanged.
8. Close only the Area child, never the Toolset. Reopen through the exact Area
   tree item and the live context-menu item `&View Area` (`commandId=4`). Old
   VCL can hide an existing `TfrmViewerArea` instead of destroying it; reveal
   only that exact child with `SW_SHOWNOACTIVATE`, without activating or moving
   the Toolset frame.
9. Re-read the packed ARE after reopen and require all tiles to match the saved
   positive state.
10. Invoke native Undo (`Edit`, position `0`, command `56`), save, and require
    the final ARE to match the complete baseline.

Approved helpers:

- `inspect-aurora-toolset-palette-no-global-input.mjs`
- `save-aurora-toolset-module-no-global-input.mjs`
- `view-aurora-toolset-area-tree-item-no-global-input.mjs`
- `build-area-source-proof-pack.mjs`
- `validate-aurora-toolset-stage5-single-tile.mjs`

## AUR-S05-02 — controlled terrain footprint

Terrain and crosser point painting is corner-based. Accept it only when the
source footprint is fully enumerated after Save. The canonical Water case on
`area001` changed exactly the `2x2` indices `27, 28, 35, 36`, preserved all
non-terrain fields and object counts, and returned to the complete baseline
after native Undo + Save.

## AUR-S05-03 — Features and Groups

1. Resolve a Feature or Group by exact palette leaf text; a category or parent
   node is not sufficient identity.
2. Capture a complete ARE baseline before placement and a second source pack
   after Save. Never infer the footprint from the palette label or screenshot.
3. A Feature may be accepted as an exact single-tile transaction only when the
   saved ARE proves one changed index.
4. A named Group may cause transition/autotile rebuilding outside its declared
   core size. Accept only a contiguous, fully enumerated source footprint with
   unchanged unrelated tile fields and object counts.
5. Invoke native Undo, save, and require all baseline tiles to match before the
   transaction is closed.

The canonical Group `Small square (2x2)` produced a saved `4x4` footprint at
rows `2..5`, columns `3..6`: its `2x2` core plus the Toolset-generated border.
All 16 source deltas are recorded in the S05-03 packet.

## AUR-S05-04 — Tile Properties

1. Run the PID-scoped no-modal preflight and create a fresh packed ARE/GIT
   source pack from the exact scratch module before sending any UI message.
2. Bind the visible `TfrmViewerArea` and require exactly one terrain selection.
   Read and validate the selected tile model, Tile ID, orientation and world
   centre from the version-pinned native selection object.
3. Open `Tile Properties` by calling the exact `actTilePropertiesExecute`
   handler on the Toolset GUI thread. The accepted transport is a short-lived,
   version-pinned WNDPROC bridge that restores the original procedure before
   returning. Direct `WM_SETFOCUS`, guessed `WM_COMMAND`, global input and point
   scans remain forbidden.
4. Enumerate the complete dialog control map. Never use `Defaults`. Disabled
   animation-loop controls are a normalization hazard: their committed states
   must be explicitly matched to the transaction baseline before `OK`.
5. Identify `Main Light 1` by the exact ordered pair of enabled `23x23`
   colour panels, open the nested `TdlgColorSelection`, require exactly 32
   ordered `30x25` swatches, select the declared swatch and close both dialogs
   in the same executor call.
6. Require zero remaining Toolset modals, an enabled frame on `DISPLAY1`, a GUI
   thread barrier and positive readback that the original WNDPROC was restored.
7. Save only when the frame is dirty, then parse all 64 ARE tiles and all GIT
   objects. Acceptance is exactly one declared field delta at the exact source
   tile and byte-identical `objects.csv`.
8. Repeat the atomic transaction with the baseline swatch, save, and require
   byte-exact equality of `tiles.csv`, `tile-contract.csv` and `objects.csv`
   against the complete transaction baseline.

Canonical accepted run: scratch module `s05t0716.mod`, `area001`, tile index
`38` / row `4` / column `6`, model `tcm02_a20_04`, Tile ID `183`, orientation
`2`, centre `(65,45)`. The positive saved delta is only
`mainLight1 1 → 2`; rollback is byte-exact for all three source CSVs. The
scratch baseline intentionally preserves the earlier isolated negative case;
the restored production module is not mutated by this transaction.

Approved helpers:

- `preflight-aurora-toolset-no-modal-no-global-input.mjs`
- `invoke-aurora-toolset-tile-properties-gui-thread-bridge.mjs`
- `save-aurora-toolset-module-no-global-input.mjs`
- `build-area-source-proof-pack.mjs`
- `validate-aurora-toolset-tile-properties-stage5.mjs`

Canonical packet:
`evidence/stage5-live-2026-07-16/s05-04-tile-properties/README.md`.

## AUR-S05-05 — New Area wizard

1. Run the exact PID-scoped no-modal preflight and require the module frame on
   non-primary `DISPLAY1`.
2. Invoke `Wizards` item position `0` only after verifying command `133`; require
   the exact modal class `TdlgAreaWizard`.
3. Read every tileset and size entry from the native listboxes. Select by exact
   text, not coordinates. The canonical transaction selects `MicroSet` at index
   `21` and `Tiny` at index `0`.
4. On the last page explicitly set both post-actions (`Open Area in the Area
   Viewer`, `Launch Area Properties Dialog`) to the declared states. Finish and
   require zero remaining Toolset modals plus a dirty module frame.
5. Save, inspect the packed module, and require the new ARE/GIT/GIC triplet and
   matching `module.ifo` Area entry. The canonical readback is `area002`, name
   `Area 001`, tag `Area001`, tileset `tms01`, dimensions `2x2`, four tiles and
   zero objects.
6. Roll back by selecting the exact Area tree identity and posting targeted
   `VK_DELETE`. Aurora presents two sequential native prompts in this build;
   handle both atomically by exact PID, class, title, message, and localized
   affirmative button (`&Tak`). Synchronous Delete messages are forbidden
   because the caller deadlocks behind the first modal.
7. Save and re-read the complete Area resource index. Acceptance requires the
   exact original resrefs and absence of the created resref/name, followed by a
   clean no-modal preflight.

Approved helpers:

- `create-aurora-toolset-area-wizard-no-global-input.mjs`
- `delete-aurora-toolset-area-tree-item-atomic-no-global-input.mjs`
- `inspect-nwn-module-area-resources.mjs`
- `validate-aurora-toolset-stage5-new-area.mjs`

Canonical packet:
`evidence/stage5-live-2026-07-16/s05-05-new-area/README.md`.

## AUR-S05-06 — Area resize

The native expanding resize path is a verified negative path in retail Toolset
v89.8193.37-17. `Edit > Resize Area` command `63` can change the live dimensions
from `2x2` to `4x4`, but the resulting packed ARE retains only four tile records.
The twelve new grid cells are null slots, not tiles.

Required invariant:

`Tile_List.length == Width * Height`

If the invariant fails, the Area must not be saved, reopened, filled, dragged
onto, undone, or resized again. Feature/group fill on a sparse grid produced
`0066C289 / Read 00000020`; native Undo later produced
`00683333 / Read 0000003C`. The exception handler can resume the same failing
fill call after `OK`, so UI recovery is forbidden. Fail closed by ending the
exact scratch Toolset process, quarantining the module, and starting from a
clean module. Create the Area at its final dimensions through Area Wizard
instead of expanding it.

Approved helpers:

- `probe-aurora-toolset-area-resize-atomic-no-global-input.mjs` for the recorded
  negative proof only; it is not approved for production mutation;
- `inspect-nwn-module-area-resources.mjs`;
- `build-area-source-proof-pack.mjs`;
- `validate-aurora-toolset-stage5-area-resize.mjs`.

Canonical packet:
`evidence/stage5-live-2026-07-16/s05-06-area-resize/README.md`.

## Safety boundary

The accepted path uses no global cursor, keyboard, or mouse input, does not
activate the Toolset frame, does not change frame placement, does not launch a
second Toolset, and never closes the Toolset. Targeted VCL/Win32 messages and
read-only source extraction are permitted only after exact control identity and
monitor checks.

Direct selection `WM_COMMAND 73/74` messages to `TfrmViewerArea` are forbidden:
the retail VCL build can route focus to a disabled or invisible child. Use the
validated two-button selection toolbar with native checked-state readback.
Direct or posted `WM_SETFOCUS` (`0x0007`) to an Area viewer, viewport,
`TScrollBox`, hidden tab, or any child control is also forbidden. Visibility
and `IsWindowEnabled` are not sufficient proof that VCL can accept focus; one
such message produced twelve nested `Cannot focus a disabled or invisible
window.` dialogs. Area/viewer activation must use a proven native visible
control transaction and must be verified from the active `TTabSheet` plus
viewer state without synthesizing focus.
Likewise, never deliver a context-menu `WM_COMMAND` to a hidden
`TPUtilWindow` returned as `hwndMenuOwner`; validate the exact live item and use
the visible popup's declared accelerator. Both prohibited routes fail before
UI mutation.

Every mutating UI operation requires
`preflight-aurora-toolset-no-modal-no-global-input.mjs` immediately before its
first message. The preflight enumerates only windows owned by the exact
`nwtoolset` PID, requires an enabled module frame on non-primary `DISPLAY1`,
and rejects every visible Toolset top-level window except `TfrmFrame` and
`TApplication`.

A modal transaction is atomic: open, identify, keep on the Toolset display,
handle or cancel, and verify zero remaining Toolset modals in one executor
call. A helper may not return while a popup or modal it opened is visible. An
unexpected nested modal cancels the mutation and the complete owner chain is
closed immediately. Modal audits must always filter by the exact Toolset PID.

Generic `File > Import` is not an Area recovery path. `Save As` uses
`TdlgModuleSelect`, not a common `#32770` file dialog, and a generic common-file
dialog helper is forbidden for it. `BackupMod` is mutable and may be replaced
by `Save As`; it is not immutable recovery evidence unless copied and hashed
before module switching.

## Accepted live transaction

The canonical packet is
`evidence/stage5-live-2026-07-16/s05-01-single-tile/README.md`.
It proves `area001`, tileset `tcm02`, tile count `64`, object count `1`, exact
single mutation `index 35 / row 4 / col 3`, `Tile_ID 183 → 34`, identical
saved/reopened state, and exact final rollback.
