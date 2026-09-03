# Binary explicit-open v6 module-selector audit

Date: 2026-08-19

Status: `SEMANTIC GAP CLOSED FOR THE EXACT BINARY; CLEAN-SESSION LIVE VALIDATION PENDING`.

This audit supersedes only the v5 module-selector transport for
`nwtoolset.exe` SHA-256
`4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24`.
The v5 static binding of `TdlgModuleSelect.lbModulesClick`, `eModuleName`, and
`bOKClick` remains authoritative. No xoreos source was used.

## Observed v5 failure

The preserved v5 live packet is hash-bound in
`evidence/binary-open-startup-v6/module-selector-client-click-audit.json`.
It stopped before Open with `module_name_edit_readback_mismatch`. The old
PowerShell diagnostic used `expected=$selectedItemText:actual=...`; PowerShell
parsed `$selectedItemText:actual` as a scope-qualified variable and hid the
expected text. A local parser reproduction proves that formatting defect. The
remaining suffix in the captured `expected==` message proves that the actual
module-name edit readback was empty. Therefore the synthetic parent
`WM_COMMAND/LBN_SELCHANGE` did not establish the required native edit state and
must not be replayed as the v6 action.

## Exact replacement transport

The exact Toolset binary already has live, retained evidence that a targeted
client-coordinate `WM_LBUTTONDOWN/WM_LBUTTONUP` pair on a validated native
`TListBox` invokes its VCL OnClick path: the Area Resize preset route in
`probe-aurora-toolset-area-resize-atomic-no-global-input.mjs`. The transport
does not move the global cursor, send global mouse input, activate a window, or
change z-order.

For `TdlgModuleSelect`, v6 therefore:

1. enumerates all `TListBox` item strings and resolves exactly one case-insensitive
   match for the requested `.mod` filename or resref;
2. uses `LB_SETTOPINDEX`, `LB_GETTOPINDEX`, `LB_GETITEMHEIGHT`, and
   `GetClientRect` to prove that exact item is inside the list client area;
3. if the target is already selected while the edit is stale, clears the
   selection to `-1` and requires the clear readback;
4. synchronously sends the targeted local `WM_LBUTTONDOWN/WM_LBUTTONUP` pair
   with `SMTO_ABORTIFHUNG` to the list HWND;
5. requires both `LB_GETCURSEL == exact target index` and
   `eModuleName == exact target text` before posting the exact Open button.

Any ambiguity, scroll/readback mismatch, invalid geometry, timeout, stale edit,
binary mismatch, or unexpected Toolset surface fails closed.

## Test-first and implementation state

The startup integration test was changed first and observed failing on the
missing `GetClientRect` contract. After implementation, the following pass:

- `node --check backend/scripts/open-last-city-module-and-area-toolset-no-global-input.mjs`
- `node backend/scripts/test-toolset-explicit-open-startup-admission-integration.mjs`
- `node backend/scripts/test-aurora-toolset-binary-module-native-geometry-contract.mjs`

The machine-readable audit records exact file identities. One clean-session
live validation is now authorized. It is validation of a changed transport,
not a blind retry of the failed v5 notification.
