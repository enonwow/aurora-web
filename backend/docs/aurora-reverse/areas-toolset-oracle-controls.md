# Areas Toolset Oracle Controls

Status: active operator runbook

This document records the verified Aurora Toolset control path used as an Areas
oracle for `_ikea` in `the_last_city - codex.mod`. It exists so future Areas
work can compare web output against a real Aurora view instead of relying on
guesses, fallback previews, or screenshots without provenance.

## Scope

- Toolset executable: `C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\bin\win32\nwtoolset.exe`
- Module folder: `C:\Users\enonw\Documents\Neverwinter Nights\modules`
- Module under test: `the_last_city - codex.mod`
- Area under test: `_ikea`
- Target monitor for Codex operations: non-primary `DISPLAY6`, bounds `x=-1920 y=0 width=1920 height=1080`
- Primary safety rule: prefer targeted Win32 messages to the Toolset window or its child controls. Avoid global `SendKeys`, global mouse drags, and broad desktop input while the user is using the machine.

## Verified Window Selection

`nwtoolset.exe` can expose more than one top-level window. The correct window is
the one whose title includes the loaded module:

`BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - the_last_city - codex.mod`

Do not rely on `Get-Process nwtoolset | Select MainWindowHandle`; Windows may
return the empty top-level Toolset window instead. Enumerate visible top-level
windows and match the title containing `the_last_city` and `codex.mod`.

Current live readiness is recorded by the retail oracle gate at:

`backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-current-window-state.json`

This file is a read-only Win32 `EnumWindows` / `EnumChildWindows` probe. It must
report `ready/not_ready` from the current desktop state before a new visual
comparison claims live Toolset availability. `ready` requires the loaded-module
window title, a responding window, an `_ikea` `TfrmViewerArea`, and a `TScrollBox`
viewport child. If Toolset, the module window, or `_ikea` is missing, the file
must carry an exact blocker such as `no_visible_toolset_window`,
`missing_loaded_module_window`, or `missing_ikea_area_viewer`.

The orchestration fields are `canRunVisualComparison`, `current.expectedModule`,
`current.loadedModule`, and `blocker.expected_module` / `blocker.loaded_module` /
`blocker.area_viewer_missing`. A common non-ready state should read like
`loaded_module=codex_tavern_fast.mod`, `expected_module=the_last_city -
codex.mod`, `area_viewer_missing=_ikea`; that is a useful blocker, not visual
progress.

Verified correct fullscreen placement:

- Window handle observed: `24644026`
- Bounds after correction: `left=-1920 top=0 width=1920 height=1080`
- Screenshot evidence: `backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-display2-after-correct-window-resize-20260617-194750.png`

The earlier wrong fullscreen target was the empty Toolset window:

- Window handle observed: `5705578`
- Title observed: `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17`
- This is not the oracle window for `_ikea`.

## Opened Area Evidence

The `_ikea` area was opened in the real Toolset from `the_last_city - codex.mod`.

Evidence files:

- `backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/aurora-toolset-the-last-city-codex-ikea-window.png`
- `backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-display2-after-correct-window-resize-20260617-194750.png`

Use these as Toolset-side oracle evidence only. They do not promote web parity by
themselves; web parity still needs a comparison gate against the current web
render.

Gate state: `canonicalParityPromoted=false` until a current web render is
compared against this Toolset oracle evidence.

## Area View Controls

Child controls observed inside the correct module window:

- Area viewer form: `TfrmViewerArea`, title ` - _ikea`
- Area viewport scrollbox: `TScrollBox`, observed handle `2690546`, bounds `left=-1616 top=107 width=1275 height=839`
- Area tab sheet: `TTabSheet`, title `_ikea`

## Top Toolbar View Reset

The top `Display` toolbar is `tbModuleDisplay`. Toolset form metadata confirms
two buttons:

| Button | Hint | Observed fullscreen screen position | Use |
| --- | --- | --- | --- |
| `sbFindStart` | `Goto Start Location` | approximately `x=-1752 y=66` | resets the canvas/view position by jumping the area camera to the module start location |
| `sbRecenter` | `Reorient Camera` | approximately `x=-1728 y=66` | resets/reorients the current camera direction without being the primary canvas-position reset |

Passive binary metadata evidence:

- `backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-reset-controls-extract.json`
- Gate: `npm.cmd run areas:toolset-reset-gate`
- Extraction method: read-only scan of `nwtoolset.exe`; no cursor, keyboard, or
  global desktop input.
- Proof level: DFM control-tree proof, not a symbol map. The gate requires the
  ordered `TToolBar tbModuleDisplay -> TToolButton sbFindStart -> Hint Goto Start
  Location -> OnClick actFindStartExecute -> TToolButton sbRecenter -> Hint
  Reorient Camera -> OnClick sbRecenterClick` block. `symbolMapOnly` evidence is
  rejected, because raw binary strings alone caused earlier false positives.

For `_ikea` canvas-position reset work, use `sbFindStart / Goto Start Location`.
For camera orientation reset work, use `sbRecenter / Reorient Camera`. Both only
make sense after the correct module window is active and the `_ikea`
`TfrmViewerArea` is open. If the Toolset title is only
`BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17`, the loaded-module
oracle window is not active and these buttons are not valid `_ikea` reset
checks.

Bottom toolbar buttons are `TBitBtn` controls. The verified positions are screen
coordinates on `DISPLAY6` after fullscreening the correct module window.

| Function | Observed left/top | Notes |
| --- | --- | --- |
| Move camera left | `left=-1606 top=956` | Tooltip: `Move camera Left` |
| Move camera right | `left=-1582 top=956` | Tooltip: `Move camera right` |
| Move camera forwards | `left=-1558 top=956` | Tooltip: `Move camera forwards` |
| Move camera back | `left=-1534 top=956` | Inferred from paired camera movement control |
| Rotate camera clockwise | `left=-1498 top=956` | `bRotateClockwise`, uses MouseDown hold |
| Rotate camera counter-clockwise | `left=-1474 top=956` | `bRotateCounterClockwise`, uses MouseDown hold |
| Pitch camera up | `left=-1438 top=956` | `bPitchUp`, uses MouseDown hold |
| Pitch camera down | `left=-1414 top=956` | `bPitchDown`, uses MouseDown hold |
| Zoom in | `left=-1378 top=956` | Toolbar button selects/uses zoom, but direct viewport wheel is more reliable |
| Zoom out | `left=-1354 top=956` | Toolbar button selects/uses zoom, but direct viewport wheel is more reliable |
| Rotate selected object counter | `left=-1318 top=956` | `bGobRotateCounter`, object/placeable rotation, not camera |
| Rotate selected object clockwise | `left=-1294 top=956` | `bGobRotateClockwise`, object/placeable rotation, not camera |
| Rotate selected object random | `left=-1264 top=956` | `bRotateRandom`, object/placeable rotation, not camera |

The camera/object split was confirmed by Toolset binary strings:

- `bRotateClockwise`
- `bRotateCounterClockwise`
- `bPitchUp`
- `bPitchDown`
- `bZoomIn`
- `bZoomOut`
- `bGobRotateCounter`
- `bGobRotateClockwise`
- `bRotateRandom`

## Zoom Procedure

Reliable zoom uses `WM_MOUSEWHEEL` targeted at the `_ikea` viewport controls,
not global mouse wheel input.

Targets used:

- `TScrollBox` viewport
- `TfrmViewerArea`
- `_ikea` `TTabSheet`

Recommended pattern:

1. Resolve the current viewport center from the `TScrollBox` bounds.
2. Send `WM_MOUSEWHEEL` with `delta=120` to zoom in.
3. Send `WM_MOUSEWHEEL` with `delta=-120` to zoom out.
4. Capture the second screen after each operation.

Verified evidence:

- Zoom in: `backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-ikea-controlled-zoom-in-20260617-195807.png`
- Zoom out: `backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-ikea-controlled-zoom-out-20260617-195807.png`

Important observation: simple `BM_CLICK` on the zoom buttons did not prove a
view change. Pixel diffs stayed near zero. Direct `WM_MOUSEWHEEL` to the viewport
produced real view changes.

## Camera Rotation Procedure

Camera rotate and pitch buttons do not behave as one-shot `BM_CLICK` commands.
They are driven by `MouseDown` handlers and must be held briefly.

Recommended pattern:

1. Resolve the `TBitBtn` by position.
2. Send `WM_MOUSEMOVE` to the button center.
3. Send `WM_LBUTTONDOWN`.
4. Hold for about `1200-1400 ms`.
5. Send `WM_LBUTTONUP`.
6. Capture the second screen and compare visible view state.

Verified evidence:

- Rotate clockwise: `backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-ikea-camera-rotate-clockwise-20260617-200951.png`
- Pitch up: `backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-ikea-camera-pitch-up-20260617-200951.png`
- Pitch down: `backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-ikea-camera-pitch-down-20260617-200951.png`

Do not use the red circular buttons for camera rotation. They are object or
placeable rotation controls.

## Tooltip Evidence

Accessibility did not expose useful `Name` or `HelpText` for the VCL `TBitBtn`
controls. Tooltip capture requires hovering over the actual button.

Verified tooltip capture manifest:

`backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/tooltips/toolset-hints-20260617-200642.json`

Confirmed hints:

- `Move camera Left`
- `Move camera right`
- `Move camera forwards`

## Safety Notes

- Fullscreening and control messages can be done without stealing the user's
  primary screen.
- Direct viewport wheel messages worked without global wheel input.
- Button hold messages worked for camera rotation without global mouse dragging.
- Do not take ownership of the global cursor without explicit approval from the
  user in the current turn.
- If a future operation needs real focus or global input, mark it as
  `requires focus` before doing it.
- Keep every oracle claim backed by screenshot evidence or an exact blocker.

## Current Known Good State

As of the recorded session:

- The real Toolset module window is fullscreen on `DISPLAY6`.
- `_ikea` is open.
- Zoom in/out is possible through targeted viewport wheel messages.
- Camera rotate and pitch are possible through targeted button hold messages.
- Object/placeable rotation buttons are identified separately and should not be
  confused with camera rotation.
