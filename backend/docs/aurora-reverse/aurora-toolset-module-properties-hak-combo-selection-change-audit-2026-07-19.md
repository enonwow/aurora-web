# Module Properties HAK Combo Selection-Change Audit — 2026-07-19

## Scope

This audit covers the exact saved-but-unattached Meshy2Aurora recovery state:
one responsive retail Toolset process, one `TfrmIFOProp` / `Module Properties`
modal, the Custom Content HAK picker structurally identified by its adjacent
empty HAK `TListBox` and disabled `Add` button, and native readback of
`m2a_m0_proof` selected at index `81`.

It does not authorize HAK addition, dialog commit, save, Area mutation, or
module/menu/wizard replay.

## Observed failure

The prior central route used `CB_SETCURSEL` and immediately proved the exact
selected owner-drawn item with `CB_GETCURSEL` plus `CB_GETLBTEXT`. The native
HAK list remained empty, but `Add` remained disabled and the route stopped with
`hak_add_button_not_enabled_after_exact_combo_selection` before an Add, OK, or
Save message was sent.

Thus the selected item identity is verified, but the VCL selection-change
handler has not observed a native selection-change notification.

## Evidence and decision

The authoritative Win32 contract states that the parent window receives
`CBN_SELCHANGE` as `WM_COMMAND`, with the control ID in `LOWORD(wParam)`, the
notification code in `HIWORD(wParam)`, and the combo HWND in `lParam`. It also
states that `CB_SETCURSEL` does not send `CBN_SELCHANGE`.

The same composition was already represented in the central generic combo
atoms, but those atoms are not used for this owner-drawn HAK control because
they depend on ordinal selection and `GetWindowText`, neither of which is an
accepted item identity oracle here.

The new exact recovery atom instead:

1. Re-identifies the HAK picker by list-plus-Add geometry.
2. Requires the current selected item to equal the requested HAK through
   signed `CB_GETCURSEL` and `CB_GETLBTEXT`.
3. Requires an empty HAK list and disabled Add button.
4. Reads the combo's live `GetDlgCtrlID` and actual parent HWND, requiring the
   same Toolset PID.
5. Sends only bounded `WM_COMMAND` / `CBN_SELCHANGE` to that actual parent.
6. Requires the exact selection to remain unchanged, the HAK list to remain
   empty, and Add to become enabled.

The atom fails closed if any identity or post-notification readback differs.
Its only accepted success is `Add enabled`; it intentionally leaves actual HAK
addition for a separately authorized continuation.

The first published atom had a pre-Toolset Node template-render defect:
PowerShell `${index}` interpolation inside a JavaScript template literal was
evaluated by Node and threw `ReferenceError: index is not defined`. This did
not invoke PowerShell or touch Toolset state. The atom now uses PowerShell
subexpressions (`$($index)`) and has an executable `--render-only` test which
first evaluates the Node template and then compiles the emitted PowerShell.
`bootstrap-reconcile-open-module-properties-hak-selection-change-render` is
the single continuation for that exact durable pre-Toolset failure; it retains
the same live state requirements and does not replay a combo selection.

After a successful selection-change observation, the post-notification state
must be read independently: exact selected HAK, empty HAK ListBox, and enabled
Add. Only `bootstrap-reconcile-open-module-properties-hak-add-notified` may
continue from that immutable ledger state. It reuses the existing dialog and
selected combo item, performs Add/OK/rebuild/native Save, and never replays the
menu, combo selection, selection notification, wizard, or Area action.

## Sources

- Retail Toolset live evidence recorded by the durable vertical-slice manifest:
  `C:\Projects\meshy2aurora\proof-output\vertical-slice-m0-20260719\bootstrap-manifest.json`.
- Central source precedent:
  `backend/scripts/select-aurora-toolset-dialog-combo-item-validated.mjs`.
- [Microsoft Win32 `CBN_SELCHANGE` contract](https://learn.microsoft.com/en-us/windows/win32/controls/cbn-selchange).
- [Microsoft combo-box notification reference](https://learn.microsoft.com/en-us/windows/win32/controls/about-combo-boxes).

## Contract and tests

- Atom:
  `backend/scripts/notify-aurora-toolset-module-properties-hak-combo-selection-no-global-input.mjs`
- Public one-use manager entrypoint:
  `bootstrap-reconcile-open-module-properties-hak-selection-change`
- Atom PowerShell syntax/safety contract:
  `backend/scripts/test-notify-aurora-toolset-module-properties-hak-combo-selection-contract.mjs`
- Manager authorization dry-run contract:
  `backend/scripts/test-aurora-toolset-vertical-slice-contract.mjs`

The public route accepts only the durable Add-disabled error after the exact
selected-item recovery and preserves every earlier reconciliation attempt.
