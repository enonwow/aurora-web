# Repeated VCL focus error audit

Continuation: see `s05-04-continuation-audit-2026-07-16.md` for the exact
selection-memory proof and the rejected area-tab, direct-command, and
`WM_CONTEXTMENU` routes discovered after this audit.

Observed across distinct unsafe transports: `Cannot focus a disabled or
invisible window.` During the latest incident twelve simultaneous dialogs were
present and the attempted S05-04 probe was invalidated. The exact generator of
each of those twelve dialogs was not captured at creation time.

## Exact cause

`select-aurora-toolset-source-tile-no-global-input.mjs` captured `before.png`
and then entered `dispatchTargetedSelection`. That function sent legacy
`WM_COMMAND 73` directly to `TfrmViewerArea` before its targeted viewport
click. In the retail VCL build this command attempts to focus an internal child
that can be hidden or disabled and opens the modal error.

The second occurrence repeated because only the executor's cleanup path had
previously been migrated to the validated two-button selection toolbar. The
dispatch path still contained the legacy viewer command. The second failed run
produced only `source-selection/before.png`; no `after.png` or selection proof
was emitted, which locates the failure before capture-after and cleanup.

A second audited transport produced the same VCL message while successfully
opening Tile Properties: the generic context-menu helper resolved
`TPUtilWindow` as `hwndMenuOwner` and posted the validated command to that
hidden utility window. The command reached the form factory, but the hidden
owner then failed VCL focus. This is a different cause with the same symptom.

The latest incident included two individual targeted viewport right-clicks,
followed by a ten-point brute-force right-click scan. The helper checked only
for a `#32768` context menu, not a Toolset-owned `#32770` error dialog, and it
did not clean up an error modal when the menu was absent. The `2 + 10` operation
count exactly matches the twelve dialogs later observed, so accumulated
right-click failures are the strongest reconstruction, but remain an
inference rather than creation-time proof.

A direct `WM_SETFOCUS` (`0x0007`) was then sent to the visible Demo
`TScrollBox`. That action was independently unsafe and probably occurred while
the frame was already disabled by the accumulated modals. It must not be
presented as the proven sole cause of all twelve dialogs. The diagnostic also
enumerated all desktop windows instead of filtering by Toolset PID. All twelve
dialogs were subsequently closed by exact PID, dialog HWND, and `OK` button
HWND; Toolset stayed open and responsive.

## Correction

- live execution of that helper now fails before any capture or UI mutation
  with `legacy_viewer_selection_command_forbidden`;
- generic menu-owner dispatch now rejects `TPUtilWindow` before mutation with
  `tp_util_window_menu_owner_dispatch_forbidden`; such popups must use their
  exact validated accelerator through the visible popup itself;
- the unsafe command is not used for S05-04;
- S05-04 instead binds the source tile by version-pinned native camera
  readback, requires zero world-space centre error, and opens the exact
  `&Tile Properties` context-menu item at the viewport centre;
- any visible modal dialog is a hard preflight failure;
- any direct or posted `WM_SETFOCUS` to an Area viewer or child is forbidden;
- modal detection is always scoped to the exact `nwtoolset` PID;
- modal opening and handling is one atomic operation that verifies zero
  remaining Toolset modals before returning;
- `preflight-aurora-toolset-no-modal-no-global-input.mjs` is mandatory before
  further Stage 5 UI mutation;
- no global cursor, keyboard, or mouse input is allowed.

The comprehensive saved audit is
`s05-04-execution-failure-audit-2026-07-16.md`.

The Toolset remained open. The first two attempts left the module clean. The
third focus probe did not perform an Area source mutation; the S05-04 scratch
baseline remains the comparison authority.
