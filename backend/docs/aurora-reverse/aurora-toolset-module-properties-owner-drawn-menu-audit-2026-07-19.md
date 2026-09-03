# Aurora Toolset Module Properties owner-drawn menu audit

Date: 2026-07-19  
Contract: `aurora-module-properties-menu-contract/v3`

## Incident correction

The prior central route treated `Alt+E` followed by the popup mnemonic `m` as
the Module Properties route. Live execution did not produce the expected
popup and subsequently exposed an unexpected `TfrmAreaResize` / `Resize Area`
modal. That transport is therefore rejected for this Toolset build. The
earlier claim of a verified mnemonic precedent is withdrawn: its cited local
file was absent and it did not bind the popup mnemonic to a native command.

No HAK dialog, HAK selection, HAK list change, or known Area resize was
performed before the modal recovery. The recovery used only the exact native
`Cancel` control, then verified the saved Area as Tiny `2x2`, four tiles, and
zero GIT creature fixtures.

## Aurora-first evidence

Primary reverse evidence is the RCDATA extracted from the installed retail
binary:

```text
C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\bin\win32\nwtoolset.exe
SHA-256: 4c156de898817518e8a97f5d989592894d3c8f48b71d27e2a8b89500cd230f24
```

The binary DFM tree, not the flattened printable-string order, serializes the
complete direct `Edit` menu as:

```text
0 `miUndo`; 1 `miRedo`; 2 separator; 3 `miEditCopy`; 4 `miCut`; 5
`miPaste`; 6 separator; 7 `miResize`; 8 `miRotateArea`; 9 separator; 10
`miFindInstance`; 11 separator; 12 `miViewProperties`; 13
`miEditAreaProperties`; 14 `miObjectProperties`.
```

The current live Toolset menu was then read without input or focus changes.
It reported eight top-level items, `Edit` at position `1`, fourteen direct
children, and direct child position `8` with enabled command ID `64`. The
current frame is the exact loaded `m2a_vs_m0.mod` frame on `DISPLAY1`.

This gives a two-part binding, rather than a text or mnemonic guess:

| Evidence | Binding |
|---|---|
| Parsed binary DFM component tree | `miViewProperties` is direct Edit child 12 and has the `Module &Properties` caption and click handler. |
| Live native menu readback | Edit child 12 is enabled and exposes command ID `68`. |

## Canonical v2 action

The HAK atom must first validate the exact frame, one responsive Toolset PID,
no modal, the top-level and Edit-child counts, and the enabled current ID at
Edit child 12. It may then post exactly one targeted `WM_COMMAND(68)` to that
frame and wait for one `Module Properties` dialog.

It must not emit `WM_SYSKEYDOWN`, `WM_SYSKEYUP`, `WM_CHAR`, `SC_KEYMENU`, or
popup mnemonic messages. It must not use `GetMenuString` as an identity source.
After the dialog is read back, the existing exact Custom Content, HAK text,
list, warning, and save-readback gates remain required.

## Recovery boundary

The prior incorrect `WM_COMMAND(64)` opened the `TfrmAreaResize` form with the
`Rotate Area` title, proving that an RCDATA string sequence cannot be used as a
menu-position map. The form exposes six rotation radio buttons and native
`OK`/`Cancel`; its default `CounterClockwise 90` selection is not a committed
rotation. Before any future HAK attempt, the public
`bootstrap-reconcile-unexpected-area-rotate-cancel` route requires this exact
modal, performs only targeted `Cancel`, and proves no Area/GIT delta.

After the no-delta cancellation, the only public
continuation is
`bootstrap-reconcile-post-area-resize-hak-command`. It rechecks the exact
saved module frame, no modal, Tiny `2x2`/four-tile Area, and zero fixtures.
It executes one ordered HAK attachment through v3 and a native Save only. It
does not replay wizard/menu recovery, resize the Area, place a creature, or
claim visual/runtime proof.

## Child enumeration regression and recovery

The corrected v3 route reached the exact `TfrmIFOProp` / `Module Properties`
dialog, then failed before any tab, combo, Add, or OK action. Its PowerShell
helper was named `R`; in the current host `r` resolves to the
`Invoke-History` alias before a function, so `R <child-HWND>` attempted to
look up a history record and raised `Cannot locate the history for Id
2559966.`. This is a central transport defect, not a HAK or module failure.

The atom now calls `Get-WindowBounds`, which cannot collide with that alias.
The durable recovery is deliberately narrow:
`bootstrap-reconcile-open-module-properties-hak` requires the exact wrapped
error, two prior HAK command attempts, the complete no-delta cancellation
history, one healthy Toolset PID, the exact loaded module frame, and one
already-open `TfrmIFOProp` / `Module Properties` dialog with no other modal.
It passes `--reuseOpenModuleProperties true` to the repaired atom; therefore
it does not post a second `WM_COMMAND(68)` or replay any menu transport.

The saved Area and GIT were read again before authorizing this recovery and
remain Tiny `2x2`, four tiles, and zero creatures. This confirms no HAK,
fixture, or Area mutation is being claimed prior to the resumed dialog route.

## Custom Content HAK picker identity

The repaired child enumeration reached Custom Content and exposed two visible,
enabled `TComboBox` controls. The prior generic `count == 1` contract stopped
before reading options or posting any HAK action. Read-only native geometry
identifies the picker: the left combo at `(-1115, 661, 187 x 21)` is directly
below the enabled same-width ListBox at `(-1116, 404, 185 x 252)` and adjacent
to the disabled-until-selected `Add` button at `(-908, 659, 95 x 25)`. The
second combo at `(-996, 725, 185 x 21)` has neither that ListBox nor an
adjacent Add relation and is therefore not a HAK candidate.

The v3 atom now requires exactly one combo satisfying this relative topology;
absolute coordinates, class-only matching, and remembered indexes are not
accepted. `bootstrap-reconcile-open-module-properties-hak-combo` is the only
continuation for the exact durable `expected_one_hak_combo:2` failure and
resumes this already-open modal without sending another menu command.

## CB_GETCURSEL signed sentinel

After the combo topology correction, native `CB_GETCURSEL` returned the
documented no-selection sentinel `CB_ERR`. The pointer-sized message result
was `4294967295` (`0xFFFFFFFF`), and the old direct `[int]` cast failed before
option enumeration, selection, Add, or OK. The corrected atom records both
the unsigned raw value and signed low-32-bit value, accepting only `-1` or a
valid non-negative index. The current durable `-1` is proof of no prior combo
selection, not a HAK mutation. The narrow
`bootstrap-reconcile-open-module-properties-hak-combo-sentinel` continuation
reuses the current Module Properties modal and cannot replay menu transport.

## Owner-drawn HAK item text and selection cleanup

Native `CB_GETLBTEXTLEN` / `CB_GETLBTEXT` readback established that the HAK
source combo has 119 items and includes exactly one `m2a_m0_proof`; the HAK
ListBox has zero items and Add is disabled. This disproves the earlier
`expected_one_exact_hak:0` result, which used `GetWindowText` after repeatedly
changing selection and therefore observed no owner-drawn item labels. The
legacy loop ended on index `118` (`znd_tortoise`) because the initial index was
the no-selection sentinel `-1` and the loop did not restore it.

The canonical atom now reads item text without changing selection. Before any
future HAK attach, the narrow clear-selection route validates the empty HAK
list and disabled Add, sends only `CB_SETCURSEL(-1)`, and requires matching
native readback. It neither attaches a HAK nor closes/saves the dialog; the
next HAK route cannot be authorized until this cleanup is durable.

## Verified post-cleanup HAK-add gate

The cleanup completed with the signed native selection value `-1` / raw
`0xFFFFFFFF`, zero HAK ListBox entries, and disabled Add. Fresh independent
readback also preserved the exact Module Properties modal, the loaded module
frame, Tiny `2x2`/four-tile Area, and zero GIT creatures. The sole following
central route is `bootstrap-reconcile-open-module-properties-hak-add`. It
again verifies those facts plus exact source HAK text before resuming the
existing dialog for HAK Add, OK, rebuild acknowledgement, and native Save.
It cannot repeat a menu, wizard, Area, or fixture action.

## Selected item readback

After the first HAK-add attempt, read-only native state showed selected index
`81` and `CB_GETLBTEXT(81) == m2a_m0_proof`; the HAK ListBox remained empty
and Add had not been posted. The false failure used owner-drawn
`GetWindowText`, which is empty even after a successful `CB_SETCURSEL`. The
atom now confirms selection with signed `CB_GETCURSEL` plus direct item text.
The following `hak-add-selected` continuation consumes the existing exact
selection rather than sending a second selection command or reopening Module
Properties.
