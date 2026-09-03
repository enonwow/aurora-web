# S05-04 continuation audit — 2026-07-16

Status: saved audit artifact. Stage 5 / S05-04 remains **in progress**. This
document continues `s05-04-execution-failure-audit-2026-07-16.md` and
`repeated-focus-error-audit.md`.

## Confirmed facts

1. The visible `demo` viewer had mode `0` and both internal lists at viewer
   offsets `0x624` and `0x628` had count `0`. It was therefore not a valid
   Tile Properties source.
2. The `area001` viewer had terrain mode `1`, working-list count `0`, and
   selection-list count `1`.
3. The sole `area001` selection item was read without process-memory writes.
   Its first 16 bytes decode to model `tcm02_a20_04`; its next fields contain
   `Tile_ID=183`, orientation `2`, and centre `(65,45)`.
4. Baseline source row `index=38`, `row=4`, `col=6` contains `tileId=183` and
   `sourceTileOrientation=2`. Its source-grid centre is `(65,45)`. The live
   selection therefore matches that exact baseline tile.
5. One targeted local message pair to the two-page `TPageControl` changed the
   active index from `0` to `1` and made the `area001` sheet/viewer visible.
   It used no global cursor, mouse, or keyboard input.
6. A visible `#32770` modal subsequently appeared with exact text
   `Cannot focus a disabled or invisible window.` and disabled the frame. It
   was closed through its exact `OK` child button; final modal count was zero
   and the frame was enabled.
7. A single `WM_COMMAND 277` posted to the exact visible `TfrmViewerArea`
   produced neither `TdlgTileProperties` nor `#32770`. Final modal count was
   zero and the frame remained enabled. `PostMessage=true` was not treated as
   proof that the command was handled.
8. The Toolset frame was later found hidden while its process and
   `TApplication` window remained alive. It was restored with
   `SW_SHOWNOACTIVATE`; no activation or global input was used.
9. A single targeted `WM_CONTEXTMENU` at the exact viewport centre
   `(637,395)` for the visible, source-identified tile produced no popup and no
   modal. Final modal count was zero and the frame remained enabled.
10. Read-only component inspection proved that `pmViewerArea+0x48` contains
    HWND `983844`, the live `TApplication` window; `pmiTileProperties+0x5C`
    contains command ID `277`. Both the `TAction` and `TMenuItem` contain
    handler `0x00683E2C` and the same `TfrmViewerArea` self pointer.
11. One `WM_COMMAND 277` posted to that exact `TApplication` HWND still
    produced neither `TdlgTileProperties` nor `#32770`. The final preflight
    confirmed a visible, enabled frame and zero modal windows.

## Inferences, kept separate

- The new focus modal is attributed to the area-tab transport with high but
  not absolute confidence. It was the only focus-capable UI action in that
  interval; the intervening viewer-state probe only read window/process
  memory. The modal appeared after the tab helper's immediate final check, so
  the helper's 900 ms observation was insufficient to prove a clean outcome.
- `WM_COMMAND 277` is inferred to be handled through VCL popup/action routing,
  not as a normal viewer command. The observed no-op proves only that sending
  it directly to `TfrmViewerArea` is not a valid route.
- The `TApplication` no-op, despite exact component linkage, indicates that
  VCL additionally requires active `TPopupList` state or a direct action call
  on the Toolset UI thread. This is an inference from the live no-op and the
  component layout, not yet a complete reconstruction of `TPopupList`.
- The exact cause of the frame becoming hidden is not proven. It was observed
  after frame capture, so the capture helper now restores and verifies frame
  visibility in `finally`; this is remediation, not a causal claim.

## Rejected routes and enforced remediation

- `select-aurora-toolset-area-tab-no-global-input.mjs` is fail-closed because
  its targeted page click can lead to the VCL focus modal.
- `probe-aurora-toolset-tile-properties-command-atomic-no-global-input.mjs`
  is fail-closed because both direct viewer and exact `TApplication`
  `WM_COMMAND 277` are proven non-operative without active popup state.
- `probe-aurora-toolset-tile-properties-atomic-no-global-input.mjs` is
  fail-closed for both transports: right-click reaches the focus-sensitive
  `GLPanelMouseDown` path, while `WM_CONTEXTMENU` produced no popup.
- `capture-aurora-toolset-frame-no-global-input.mjs` now restores the exact
  frame with `SW_SHOWNOACTIVATE` if needed and fails unless visibility is
  confirmed at exit.
- No route above may be retried with another point, timing, scan, or loop.

## Evidence

- `viewer-state-demo-after-atomic-probe.json`
- `viewer-state-area001-after-atomic-probe.json`
- `viewer-state-area001-selection-item.json`
- `viewer-state-area001-visible-selection-item.json`
- `baseline/area001-source-pack-2026-07-16T163632742Z/tiles.csv`
- `area-tab-switch-to-area001.json`
- `frame-before-area-tab-switch.png`
- `frame-area001-visible-after-error-cleanup.png`
- `atomic-probe-area001-contextmenu-2026-07-16.json`
- `atomic-probe-demo-2026-07-16.json`
- `viewer-components-area001-readonly.json`
- `tile-properties-application-command-probe-no-outcome.json`

The direct `WM_COMMAND` attempt failed before its success-only writer could
create `tile-properties-command-probe-cancel.json`; the exact outcome and the
subsequent zero-modal preflight are recorded in this audit.

## Remaining S05-04 gate

The positive change/save/readback/rollback transaction has not yet been
performed. Before any further live action, offline analysis must prove a new
native VCL action-dispatch route that:

1. starts from the already visible, exact one-item source selection;
2. does not call `GLPanelMouseDown`, `SetFocus`, global input, or a rejected
   context/menu transport;
3. opens and handles exactly one `TdlgTileProperties` atomically;
4. changes exactly one enabled property;
5. saves and proves one intended tile-contract diff and zero object diffs;
6. rolls back and proves full baseline equality.
