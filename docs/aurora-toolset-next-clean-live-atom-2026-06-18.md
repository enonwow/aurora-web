# Aurora Toolset next clean live atom packet

Data: 2026-06-18
Rola: 5/6 rotation - next clean live atom packet
Scope: docs-only handoff. Nie uruchamiac Aurory, nie dotykac okna Toolsetu,
nie uzywac globalnej myszy ani globalnego `SendKeys`.

## Inputs

- `ORCH-010 clean baseline no modals`
  - Folder:
    `.codex-tmp/aurora-live-evidence/orch-010-clean-baseline-no-modals-20260619-000832-158`
  - Metoda: passive top-level enumeration plus full Toolset screenshot only.
  - Fakty: `mainWindow.hwnd=395506`, class `TfrmFrame`, title contains
    `the_last_city` and `codex.mod`, `modalCount=0`,
    `unexpectedTopLevelWindows={}`, `cleanBaseline=true`,
    `responding=true`.
  - Screenshot:
    `01-clean-baseline-main-window.png`.
- `ORCH-011B Fog 106 post-baseline orchestrator proof`
  - Folder:
    `.codex-tmp/aurora-live-evidence/orch-011b-fog-post-baseline-orchestrator-20260619-001201-138`
  - Metoda: targeted `WM_COMMAND 106` to `TfrmFrame`, second `106`
    rollback; no global mouse or `SendKeys`.
  - Fakty: `command1.sent=true`, `command2.sent=true`,
    `afterDiffers=true`, `rollbackMatchesBefore=false`,
    `modalCountAfter=0`, `responding=true`.
  - Klasyfikacja: `partial`. Pelny hash okna potwierdza zmiane, ale nie daje
    stabilnego restore proof, bo rollback hash nie wrocil do before.

## Decision

Rekomendowany nastepny atom:

`ORCH-012 / NXA-CANVAS-HWND-001 passive canvas HWND/control inventory + screenshot crop`

Dlaczego ten atom:

- Jest calkowicie niemutujacy: tylko enumeracja okien/kontrolek i screenshoty.
- Buduje mocniejszy proof niz full-window hash: zapisuje konkretny `HWND`,
  class chain, recty i crop targetu zamiast opierac claim na calym oknie.
- Bezposrednio zamyka aktualna luke po `ORCH-011B`: skoro toggle/fog moze dac
  niestabilny full-frame rollback hash, kolejny proof powinien zakotwiczyc
  region/canvas, na ktorym przyszle diffy beda mierzone.
- Jest bezpieczniejszy niz tree selection pulse. Tree pulse jest nadal
  niemutujacy dla modulu, ale zmienia stan UI selection i wymaga explicit
  before/after/restore. Tutaj nie zmieniamy nawet selection.

## Live ticket

Ticket: `ORCH-012 / NXA-CANVAS-HWND-001`

Goal: pasywnie wskazac realny viewer/canvas Toolsetu po `ORCH-010`, tak zeby
kolejne atomy mialy stabilny target proof i crop proof, a nie tylko
full-window hash.

Precondition:

- Nie startowac `nwtoolset.exe`.
- Uzyc tylko juz istniejacego Toolsetu.
- Jesli brak widocznego `TfrmFrame` z `the_last_city` i `codex.mod`, stop jako
  blocker.
- Jesli pojawi sie modal-like top-level window, stop jako blocker. Nie czyscic
  go w tym atomie.

Allowed method:

- Passive `EnumWindows` / `EnumChildWindows`.
- Passive `GetWindowText`, `GetClassName`, rect/visibility/responsiveness
  readback.
- Passive screenshot full-frame from known `TfrmFrame`.
- Passive screenshot crop from candidate viewer/canvas rect.
- No `WM_COMMAND`, no `PostMessage` input, no `BM_CLICK`, no focus changes, no
  cursor movement, no global keyboard.

Procedure:

1. Enumerate top-level windows for the Toolset process.
2. Select the visible `TfrmFrame` whose title contains `the_last_city` and
   `codex.mod`; ignore the zero-size `TApplication`.
3. Confirm `responding=true` and `modalCount=0`.
4. Enumerate all children under the selected `TfrmFrame`.
5. Identify viewer candidates by title/class/rect, especially
   `TfrmViewerArea`-like children and large nonzero client regions.
6. For each viewer candidate, record descendants with:
   `hwnd`, `class`, `title`, `rect`, `clientRect`, `visible`, parent hwnd,
   and depth.
7. Pick the most likely inner canvas/control only if it is under the viewer,
   has a nonzero rect, is inside the main frame, and occupies a plausible
   render area.
8. Capture:
   - full-frame screenshot,
   - viewer crop,
   - candidate canvas crop.
9. Write a `summary.json` in the evidence folder with all ids/rects and paths.
10. Release live lock without sending any input to Toolset.

Required evidence:

- `01-full-frame.png`: visible Toolset frame, module title, no modal.
- `02-viewer-crop.png`: crop around the active viewer area.
- `03-canvas-candidate-crop.png`: crop of the selected canvas/control rect.
- `control-inventory.json` or `control-inventory.txt`: full parent/child
  chain and rects for main frame, viewer, and canvas candidate.
- `summary.json` containing:
  - `baselineRef`: ORCH-010 folder path,
  - `mainHwnd`, `mainClass`, `mainTitle`, `mainRect`,
  - `viewerHwnd`, `viewerClass`, `viewerTitle`, `viewerRect`,
  - `canvasCandidateHwnd`, `canvasCandidateClass`,
    `canvasCandidateRect`,
  - `modalCountBefore`, `modalCountAfter`,
  - `responding`,
  - `noInputSent=true`,
  - `screenshots.fullFrame`, `screenshots.viewerCrop`,
    `screenshots.canvasCandidateCrop`,
  - `proofStatus`.

Success status:

`observed-canvas-target`

Allowed success wording:

`ORCH-012 passively identified a nonzero viewer/canvas candidate under the
clean ORCH-010 Toolset frame, with full-frame screenshot, viewer crop, control
inventory, no modal, responding Toolset, and no input sent.`

Do not claim:

- render parity,
- area mutation,
- view toggle success,
- rollback success,
- that the crop alone proves future command routing.

Blocker statuses:

- `blocked-no-main-frame`: no visible `TfrmFrame` for `the_last_city` /
  `codex.mod`.
- `blocked-modal-present`: any modal-like top-level blocker appears.
- `blocked-no-viewer`: no viewer-like child with nonzero rect.
- `blocked-no-canvas-candidate`: viewer exists, but no plausible inner
  canvas/control can be isolated.
- `blocked-crop-blank`: crop is blank, `1x1`, loading-only, or does not show
  Toolset content.
- `blocked-ambiguous-target`: multiple plausible canvas candidates with no
  stable parent chain.

Timeout:

60 seconds from live-lock acquisition. On timeout, stop and record whatever was
passively enumerated. Do not try to fix state.

## Follow-up if ORCH-012 succeeds

Next clean atom can use the identified `canvasCandidateHwnd` and crop region as
the measurement target. Preferred follow-up:

`ORCH-013 / NXA-CANVAS-REGION-DIFF-001`

Goal: perform one view-only atom with region-level proof, not full-window proof.
Acceptable candidates are a no-input recapture/repaint-readback, or a targeted
tree selection pulse only if it records explicit selection before/after/final
state and does not mutate module data.

Until `ORCH-012` succeeds, do not promote another full-window-hash-only visual
toggle as clean success.
