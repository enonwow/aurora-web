# Aurora Toolset Operator Replay - Known Steps

Status: focused reconstruction from existing local documentation and passive
checks. This file is separate on purpose and does not replace
`backend/docs/aurora-reverse/areas-toolset-oracle-controls.md`.

Scope: only the native BioWare Aurora Neverwinter Nights Toolset flow:

1. Start Aurora Toolset.
2. Open the known module.
3. Open the known area.
4. Operate the area camera/view: reset/recenter, move, rotate, pitch, zoom.

Out of scope here: `aurora-web`, frontend/backend dev startup, Docker,
auth, Sounds/VFX/product MVP flows.

## Known Local Inputs

- Toolset executable:
  `C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\bin\win32\nwtoolset.exe`
- Module folder:
  `C:\Users\enonw\Documents\Neverwinter Nights\modules`
- Intended module:
  `the_last_city - codex.mod` in older prose, but the local filesystem check
  found the real file as `the_last_city [U+2014 em dash] codex.mod`.
- Area resref:
  `_ikea`
- Target display used by prior Codex captures:
  `DISPLAY6`, bounds `x=-1920 y=0 width=1920 height=1080`

Passive check on 2026-06-17:

- `nwtoolset.exe` exists.
- `C:\Users\enonw\Documents\Neverwinter Nights\modules\the_last_city - codex.mod`
  does not exist as an ASCII-hyphen path.
- A local file named `the_last_city [U+2014 em dash] codex.mod` exists.
- The current desktop had `nwtoolset.exe` running with two visible top-level
  Toolset windows.

## Safety Rules

1. Prefer targeted Win32 messages to the Toolset window or child controls.
2. Avoid global `SendKeys`, global mouse drags, and broad desktop input.
3. Do not take over the real cursor unless the user explicitly approves it in
   that turn.
4. Every visual/operator claim needs screenshot evidence or an exact blocker.
5. Do not treat Toolset oracle evidence as web parity evidence.

## Start Toolset

Known command:

```powershell
Start-Process "C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\bin\win32\nwtoolset.exe"
```

Known passive process check:

```powershell
Get-Process nwtoolset -ErrorAction SilentlyContinue |
  Select-Object Id,MainWindowHandle,MainWindowTitle,Path
```

Important: do not trust `MainWindowHandle` as the correct area/module window.
The Toolset can expose more than one top-level window, and the wrong one may be
the empty generic Toolset shell.

## Open Module

Known target:

```text
C:\Users\enonw\Documents\Neverwinter Nights\modules\the_last_city [U+2014 em dash] codex.mod
```

Known older alias:

```text
the_last_city - codex.mod
```

Operator note: the existing docs prove that `_ikea` was opened from
`the_last_city - codex.mod` / `the_last_city [U+2014 em dash] codex.mod`, but
they do not yet capture a reliable no-global-input Win32 sequence for the
File/Open dialog.
Until that is captured, module opening is a manual or focus-required step.

## Select/Open Area

Known target area:

```text
_ikea
```

Known evidence:

- The area viewer form was observed as `TfrmViewerArea`, title ` - _ikea`.
- The area tab sheet was observed as `TTabSheet`, title `_ikea`.
- The viewport scrollbox was observed as `TScrollBox`.

Operator note: the existing docs prove `_ikea` open in the real Toolset, but do
not yet capture a reliable no-global-input tree/list selection sequence for
opening `_ikea`. Until that is captured, opening the area is a manual or
focus-required step.

## Select Correct Window

Expected historical title when the module title is exposed:

```text
BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - the_last_city - codex.mod
```

Observed historical correct window:

- Handle: `24644026`
- Bounds: `left=-1920 top=0 width=1920 height=1080`
- Purpose: real `_ikea` oracle window.

Observed historical wrong window:

- Handle: `5705578`
- Title: `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17`
- Purpose: empty/generic top-level Toolset window, not the `_ikea` oracle.

Current passive check caveat: on 2026-06-17, both visible top-level Toolset
windows returned the generic title through `GetWindowText`. If this happens,
use bounds, child controls, screenshots, or area child-window evidence before
claiming the oracle window is selected.

## Reset/Recenter View

Top `Display` toolbar:

| Control | Hint | Use |
| --- | --- | --- |
| `sbFindStart` | `Goto Start Location` | Reset canvas/view position by jumping the area camera to the module start location. |
| `sbRecenter` | `Reorient Camera` | Reset/reorient current camera direction. |

Known fullscreen screen positions on `DISPLAY6`:

- `sbFindStart`: approximately `x=-1752 y=66`
- `sbRecenter`: approximately `x=-1728 y=66`

The reset controls are backed by passive binary metadata in:

```text
backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-reset-controls-extract.json
```

Validation gate:

```powershell
cd backend
npm.cmd run areas:toolset-reset-gate
```

## Move/Pan Camera

Known bottom-toolbar `TBitBtn` screen positions after fullscreening the correct
module window on `DISPLAY6`:

| Function | Observed left/top | Evidence state |
| --- | --- | --- |
| Move camera left | `left=-1606 top=956` | Tooltip confirmed: `Move camera Left` |
| Move camera right | `left=-1582 top=956` | Tooltip confirmed: `Move camera right` |
| Move camera forwards | `left=-1558 top=956` | Tooltip confirmed: `Move camera forwards` |
| Move camera back | `left=-1534 top=956` | Inferred from paired camera movement control |

Known gap: the docs confirm the controls and tooltips, but do not yet include a
separate captured before/after movement packet for each pan direction. Treat pan
button operation as identified, not fully revalidated, until a fresh screenshot
diff is captured.

## Zoom

Reliable method: send `WM_MOUSEWHEEL` to the `_ikea` viewport controls, not a
global wheel event and not simple `BM_CLICK` on zoom toolbar buttons.

Targets used:

1. `TScrollBox` viewport
2. `TfrmViewerArea`
3. `_ikea` `TTabSheet`

Known procedure:

1. Resolve current viewport center from the `TScrollBox` bounds.
2. Send `WM_MOUSEWHEEL` with `delta=120` to zoom in.
3. Send `WM_MOUSEWHEEL` with `delta=-120` to zoom out.
4. Capture the second screen after each operation.

Known evidence:

- Zoom in:
  `backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-ikea-controlled-zoom-in-20260617-195807.png`
- Zoom out:
  `backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-ikea-controlled-zoom-out-20260617-195807.png`

Important: simple `BM_CLICK` on the zoom buttons did not prove view change.
Pixel diffs stayed near zero. Direct viewport `WM_MOUSEWHEEL` produced real
view changes.

## Rotate And Pitch Camera

Camera rotate and pitch buttons are not one-shot `BM_CLICK` controls. They are
driven by `MouseDown` handlers and must be held briefly.

Known bottom-toolbar positions:

| Function | Observed left/top | Control |
| --- | --- | --- |
| Rotate camera clockwise | `left=-1498 top=956` | `bRotateClockwise` |
| Rotate camera counter-clockwise | `left=-1474 top=956` | `bRotateCounterClockwise` |
| Pitch camera up | `left=-1438 top=956` | `bPitchUp` |
| Pitch camera down | `left=-1414 top=956` | `bPitchDown` |

Known procedure:

1. Resolve the `TBitBtn` by position.
2. Send `WM_MOUSEMOVE` to the button center.
3. Send `WM_LBUTTONDOWN`.
4. Hold for about `1200-1400 ms`.
5. Send `WM_LBUTTONUP`.
6. Capture the second screen and compare visible view state.

Known evidence:

- Rotate clockwise:
  `backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-ikea-camera-rotate-clockwise-20260617-200951.png`
- Pitch up:
  `backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-ikea-camera-pitch-up-20260617-200951.png`
- Pitch down:
  `backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-ikea-camera-pitch-down-20260617-200951.png`

Do not use the red circular buttons for camera rotation. These are object or
placeable rotation controls:

- `bGobRotateCounter`
- `bGobRotateClockwise`
- `bRotateRandom`

## Minimal Current Replay Checklist

Use this when the goal is "can Codex operate the native Aurora Toolset for the
known `_ikea` oracle path?"

1. Check `nwtoolset.exe` exists.
2. Check the module folder and find the real `the_last_city` module filename.
3. Start `nwtoolset.exe` if it is not running.
4. Open `the_last_city [U+2014 em dash] codex.mod` manually or through a future
   captured focus-required sequence.
5. Open area `_ikea` manually or through a future captured focus-required
   sequence.
6. Enumerate visible Toolset windows and reject the empty/generic shell when
   possible.
7. Confirm `_ikea` child controls or screenshot before making oracle claims.
8. Reset canvas position with `sbFindStart / Goto Start Location`.
9. Recenter orientation with `sbRecenter / Reorient Camera`.
10. Move camera using bottom toolbar movement buttons.
11. Zoom by targeted `WM_MOUSEWHEEL` to the viewport.
12. Rotate/pitch by held `WM_LBUTTONDOWN` on the camera buttons.
13. Capture screenshots after each operation.

## Known Gaps To Close Next

1. Capture a no-global-input or explicitly focus-required sequence for opening
   `the_last_city [U+2014 em dash] codex.mod`.
2. Capture a no-global-input or explicitly focus-required sequence for selecting
   and opening `_ikea`.
3. Refresh window selection logic for the current session, because current
   `GetWindowText` may return generic titles for both top-level Toolset windows.
4. Capture pan-left/right/forward/back screenshot diffs, matching the already
   captured zoom/rotate/pitch evidence level.
5. Package the Win32 message snippets into a small script only after the window
   and child-control selection rules are reliable.

## Source Documents And Evidence

- `backend/docs/aurora-reverse/areas-toolset-oracle-controls.md`
- `backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/aurora-toolset-ikea-oracle-manifest.json`
- `backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-reset-controls-extract.json`
- `backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/tooltips/toolset-hints-20260617-200642.json`
