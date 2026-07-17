# Aurora Toolset: next live-pilot packet

Data: 2026-06-18

Rola: NEXT-PILOT PACKAGER 5/6

Cel: przygotowac nastepnego live-pilota do jednego atomu:
`NXA-WH-003` / `Display Grid` toggle + restore na juz otwartym
`_winds_houses`.

Zakres tego pakietu jest operacyjny. To nie jest dowod wykonania atomu.
Pilot ma zebrac dowody live albo zakonczyc jako blocker.

## Decision

Rekomendacja: `NO-GO` dla natychmiastowego wyslania `WM_COMMAND 104` w oparciu
wylacznie o command-map. `NXA-WH-003` staje sie `conditional GO` dopiero wtedy,
gdy pilot przed akcja potwierdzi realny target `TfrmFrame`, viewer
`TfrmViewerArea - _winds_houses`, brak modali oraz menu-state/readback dla
`Display Grid` jako komendy `104`.

Blocker: `docs/aurora-toolset-command-map-2026-06-18.md` nie promuje jeszcze
`Display Grid / WM_COMMAND 104` w glownej tabeli command-map. Dokument
`docs/aurora-toolset-next-atoms-2026-06-18.md` wskazuje `WM_COMMAND 104` jako
metode dla `NXA-WH-003`, ale pilot nie moze traktowac samej deklaracji jako
wystarczajacej bez live readbacku pozycji menu.

Jesli ID `Display Grid` nie da sie potwierdzic live przed akcja, status atomu:
`blocked-grid-command-id-unconfirmed`. Nie wysylac `104` w ciemno. Najwyzszej
pewnosci alternatywa z command-map: `Fog` przez `WM_COMMAND 106`, z tym samym
wzorcem before/after/restore, poniewaz command-map oznacza Fog jako `proven`.

## Pilot ticket

```text
Ticket: NXA-WH-003
Atom: Display Grid toggle + restore
Target: already-open _winds_houses area viewer
Timebox: 60 seconds after preflight confirms target
Mutation class: view-only, no module save
Primary command: targeted WM_COMMAND 104 to main Toolset TfrmFrame
Rollback: send the same WM_COMMAND 104 again to restore start state
Required final state: no modal, Toolset responding, Display Grid back to start state
```

## What to find first

1. A live lock / operator permission for this exact atom.
2. A visible main Toolset `TfrmFrame`, not the zero-sized `TApplication`.
3. A child/viewer title matching `TfrmViewerArea - _winds_houses`.
4. No visible modal/dialog/popup over the viewer.
5. The real frame/menu state for `Environment -> Display Grid`.
6. A screenshot-capable `HWND` for the full frame or viewer.

If any of these are missing, stop before sending commands and record a blocker.
Do not open modules, do not open areas, and do not try to repair the session
inside this atom.

## Allowed method

- Passive window enumeration: `EnumWindows` / `EnumChildWindows`.
- Screenshot capture from the exact frame/viewer `HWND`.
- Targeted `SendMessageTimeout` or `PostMessage` to the known `TfrmFrame`.
- Optional menu-state readback before and after each toggle.
- Optional pixel/hash diff between screenshots, but only as supporting proof.

Preferred sequence:

1. Enumerate top-level windows and pick the visible `TfrmFrame`.
2. Confirm `_winds_houses` viewer is present and visible.
3. Capture `01-before-display-grid.png`.
4. Read `Display Grid` menu state if available.
5. If `Display Grid` command ID is not confirmed as `104`, abort as blocker.
6. Send targeted `WM_COMMAND 104` to `TfrmFrame`.
7. Capture `02-after-display-grid-toggle.png`.
8. Read menu state again if available.
9. Send targeted `WM_COMMAND 104` again for restore.
10. Capture `03-after-display-grid-restore.png`.
11. Confirm final Toolset responsiveness and no modal.
12. Record result as `rolled-back-view-toggle` only if final state matches start.

## Evidence to save

Create a small evidence folder for the live atom, for example:

```text
.codex-tmp/aurora-live-evidence/nxa-wh-003-display-grid/
```

Required files:

```text
01-window-dump.txt
01-before-display-grid.png
02-after-display-grid-toggle.png
03-after-display-grid-restore.png
summary.json
```

`01-window-dump.txt` must include:

- timestamp;
- selected `TfrmFrame` handle/title/rect;
- `TfrmViewerArea - _winds_houses` handle/title/rect;
- statement that no modal was visible;
- menu-state/readback source for `Display Grid`, if available.

`summary.json` must include:

```json
{
  "atomId": "NXA-WH-003",
  "target": "_winds_houses",
  "command": "WM_COMMAND 104",
  "commandIdConfirmed": true,
  "beforeScreenshot": "01-before-display-grid.png",
  "afterScreenshot": "02-after-display-grid-toggle.png",
  "restoreScreenshot": "03-after-display-grid-restore.png",
  "startMenuState": "checked|unchecked|unknown",
  "afterMenuState": "checked|unchecked|unknown",
  "finalMenuState": "checked|unchecked|unknown",
  "afterDiffersFromBefore": true,
  "finalMatchesBefore": true,
  "responding": true,
  "result": "rolled-back-view-toggle"
}
```

If menu-state is unavailable, keep the fields as `unknown`, but then the
screenshot comparison must be strong enough to show grid changed and restored.
If neither menu-state nor visual change is clear, result is `blocked`, not
success.

## Abort rules

Abort before sending any command when:

- active target is not `_winds_houses`;
- only an empty Toolset frame or zero-sized `TApplication` is found;
- any modal/popup is visible;
- the command ID for `Display Grid` cannot be confirmed live;
- there is no reliable screenshot capture from the target frame/viewer;
- another worker appears to own the live Toolset lock.

Abort after first toggle and immediately restore when:

- the viewer becomes nonresponsive;
- the after screenshot is blank, blocked, or shows a modal;
- the menu state changes to an unexpected value;
- the pilot cannot capture proof quickly inside the 60 second window.

If restore itself is uncertain, capture final state and label the result
`cleanup-required` or `restore-unconfirmed`. Do not claim rollback success.

## Do not do

- Do not launch Aurora or `nwtoolset.exe`.
- Do not open a module or switch area for this atom.
- Do not use global mouse movement, global click/drag, or global `SendKeys`.
- Do not use menu clicks.
- Do not use Save, Save As, Build, or any module-writing command.
- Do not run a second view toggle before restoring the first.
- Do not classify a nonblank screenshot as success by itself.
- Do not leave `Display Grid` changed from the start state.
- Do not promote this atom if the final screenshot does not show a clean,
  no-modal restored frame.

## Success criteria

Status may be `rolled-back-view-toggle` only when all are true:

- `_winds_houses` target is proven in the window dump;
- before, after, and restored screenshots exist and are readable;
- `WM_COMMAND 104` was sent only to the selected `TfrmFrame`;
- after state differs from before by grid visibility or menu-state;
- restored state matches the before state by screenshot, menu-state, or both;
- Toolset is responsive at the end;
- no module save or persistent mutation occurred.

If the after screenshot is visually identical but menu-state proves
`checked -> unchecked -> checked` or `unchecked -> checked -> unchecked`, mark
the result `menu-state-proven-visual-weak`, not full visual success. If even
menu-state is unknown, mark `blocked-no-visible-grid-diff`.

## Fallback if grid is blocked

Fallback ticket, only if the pilot is allowed to switch to the highest-confidence
view toggle:

```text
Ticket: NXA-WH-004-FALLBACK
Atom: Fog toggle + restore
Target: same already-open _winds_houses viewer
Primary command: targeted WM_COMMAND 106 to main Toolset TfrmFrame
Rollback: send WM_COMMAND 106 again
Reason: command-map marks Environment/Fog WM_COMMAND 106 as proven
Evidence: before, after fog, restored, menu state 0x100 -> 0x108 -> 0x100 or inverse
```

Fallback aborts under the same rules: wrong target, modal, no screenshot path,
unknown start state, nonresponsive Toolset, or no permission to run fallback.

## Final pilot response format

The pilot should report one of:

```text
NXA-WH-003: rolled-back-view-toggle
Evidence folder: <path>
Command ID: 104 confirmed by <menu-state/readback/source>
Before/after/restored: <three screenshot paths>
Final: responding=true, no-modal=true, restored=true
```

or:

```text
NXA-WH-003: blocked-grid-command-id-unconfirmed
Reason: <exact missing proof>
Fallback recommendation: NXA-WH-004 / Fog WM_COMMAND 106
Evidence saved: <window dump and screenshots if any>
```
