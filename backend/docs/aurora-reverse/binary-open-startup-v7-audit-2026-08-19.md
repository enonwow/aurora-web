# Binary explicit-open v7 module-selector audit

Date: 2026-08-19

Status: `SEMANTIC GAP CLOSED FOR THE EXACT BINARY; CLEAN-SESSION LIVE VALIDATION PENDING`.

This audit replaces the failed v5/v6 event transports only for
`nwtoolset.exe` SHA-256
`4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24`.
No xoreos source was used.

## Preserved observations

- v5 selected the exact list index, but parent `WM_COMMAND/LBN_SELCHANGE` did
  not populate `eModuleName`.
- v6 selected the exact item through local `WM_LBUTTONDOWN/WM_LBUTTONUP`, but
  the exact edit readback was still empty. The packet then failed closed before
  Open. The still-responsive process later disappeared before the separately
  admitted continuation could execute; no Save or NWN launch occurred.

These are not retried. The v6 packet identity is recorded in the machine-readable
audit.

## Exact v7 transport

The parsed `TDLGMODULESELECT` DFM binds `lbModules.OnClick` to
`lbModulesClick`, and the static code audit proves that `bOKClick` consumes the
text in `eModuleName`. The repository's already-admitted exact-dialog
continuation uses `WM_SETTEXT` on that same one visible `TEdit` and accepts the
result only after an exact loaded-frame title readback.

v7 makes that edit synchronization atomic inside the original Open action:

1. resolve exactly one target list item and require `LB_GETCURSEL` to equal its
   exact index after `LB_SETCURSEL`;
2. synchronously send `WM_SETTEXT` to the one exact `eModuleName` HWND through
   `SendMessageTimeoutW/SMTO_ABORTIFHUNG`;
3. require the exact edit text to equal the selected item text;
4. only then post the exact Open button and require the frame title to end in
   the exact requested `.mod` name.

This is a bounded write to the native control that the audited Aurora handler
actually reads. It does not move the cursor, send global keyboard/mouse input,
activate the window, save the module, or modify INI/MRU.

## Test-first state

The integration contract was changed first and observed red on the absent
`SendMessageTimeoutText` binding. After implementation, syntax, startup
integration, and binary-native geometry contracts pass. A new clean-session
live validation is authorized because the action fingerprint is different and
the v6 failure packet is immutable.
