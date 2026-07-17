# Aurora Toolset Post-Modal Baseline Packet - 2026-06-18

Role: `5/6 ROTATION: POST-MODAL BASELINE PACKAGER`.

Execution constraint for this packet: docs-only. No Aurora launch, no Toolset
window interaction, no global mouse, no SendKeys. This packet only classifies
existing repo artifacts.

## Source Check

Checked local evidence folders:

- `.codex-tmp/aurora-live-evidence/orch-005-old-file-format-child-button-cleanup-20260618-235841`
  - folder exists
  - contains no files
  - no `summary.json`
  - no screenshot
  - result: `unknown`
- `.codex-tmp/aurora-live-evidence/orch-006-old-file-format-child-inventory-20260619-000115`
  - folder exists
  - contains no files
  - no `summary.json`
  - no screenshot
  - result: `unknown`
- `.codex-tmp/aurora-live-evidence/orch-007-old-file-format-ok-child-bmclick-20260619-000325-120`
  - folder exists
  - contains `summary.json`
  - before screenshot:
    `.codex-tmp/aurora-live-evidence/orch-007-old-file-format-ok-child-bmclick-20260619-000325-120/01-modal-before-bmclick.png`
  - after screenshot:
    `.codex-tmp/aurora-live-evidence/orch-007-old-file-format-ok-child-bmclick-20260619-000325-120/02-after-cleanup-main.png`
  - method: targeted `BM_CLICK` to child `Button` text `OK`, id `2`
  - fallback: targeted `WM_COMMAND` id `2` was available in the method but was
    not sent
  - result: `accepted-old-file-format-cleanup`
  - key facts:
    - `modalBefore.title=Old File Format`
    - `okButton.class=Button`
    - `okButton.text=OK`
    - `okButton.id=2`
    - `bmClick.sent=true`
    - `modalStillAfterBm=false`
    - `modalStillPresent=false`
    - `responding=true`
  - limitation: `windowsAfter` still includes `TdlgAreaProperties`, title
    `Area Properties`, so this is not clean no-modal baseline evidence
- `.codex-tmp/aurora-live-evidence/orch-008-area-properties-cancel-20260619-000517`
  - folder exists
  - contains `summary.json`
  - before screenshot:
    `.codex-tmp/aurora-live-evidence/orch-008-area-properties-cancel-20260619-000517/01-before-dialog.png`
  - after screenshot:
    `.codex-tmp/aurora-live-evidence/orch-008-area-properties-cancel-20260619-000517/02-after.png`
  - target dialog: `Area Properties`, hwnd `6949366`
  - method: targeted `BM_CLICK` to child `TButton` text `Cancel`, hwnd/id
    `36769122`
  - result: `accepted-area-properties-cleanup`
  - key facts:
    - `clicked.method=BM_CLICK`
    - `clicked.text=Cancel`
    - `clicked.class=TButton`
    - `clickResult.returned=0`
    - `dialogStillPresent=false`
    - `oldFileFormatStillPresent=false`
    - `responding=true`
    - `completedAt=2026-06-19T00:07:07.0018452+02:00`
- `.codex-tmp/aurora-live-evidence/orch-009-area-properties-cancel-child-bmclick-20260619-000654-392`
  - folder exists
  - contains no files
  - no `summary.json`
  - no screenshot
  - result: `unknown`
- `.codex-tmp/aurora-live-evidence/orch-010-clean-baseline-no-modals-20260619-000832-158`
  - folder exists
  - contains `summary.json`
  - clean baseline screenshot:
    `.codex-tmp/aurora-live-evidence/orch-010-clean-baseline-no-modals-20260619-000832-158/01-clean-baseline-main-window.png`
  - method: passive top-level enumeration plus full Toolset screenshot only;
    no input, no global mouse, no SendKeys
  - result: `accepted-clean-baseline`
  - key facts:
    - `mainWindow.class=TfrmFrame`
    - `mainWindow.title` contains `the_last_city` and `codex.mod`
    - `modalCount=0`
    - `oldFileFormatPresent=false`
    - `areaPropertiesPresent=false`
    - `unexpectedTopLevelWindows={}`
    - `responding=true`
    - `cleanBaseline=true`
    - `screenshotHash=091F80743BA37FDEF87B283685C91DA3F2162F14453D17155616A7EF595370DD`
    - `endedAt=2026-06-19T00:08:32.5263086+02:00`

Earlier modal evidence kept for chain of custody:

- `ORCH-004B orchestrator passive status`
  - summary: `.codex-tmp/aurora-live-evidence/orch-004b-orchestrator-passive-status-20260618-235455-772/summary.json`
  - method: passive window enumeration and screenshot only
  - Toolset title contains: `the_last_city` and `codex.mod`
  - visible modal: `#32770`, title `Old File Format`, hwnd `19467448`
  - responding: `true`
  - classification: blocker evidence, not clean baseline evidence
- `ORCH-004C Old File Format modal cleanup`
  - summary: `.codex-tmp/aurora-live-evidence/orch-004c-old-file-format-cleanup-20260618-235605-358/summary.json`
  - method: targeted `WM_COMMAND IDOK` to `#32770` `Old File Format`
  - send result: `sent=true`, `result=0`
  - after status: `modalStillPresent=true`, `responding=true`
  - after screenshot: `.codex-tmp/aurora-live-evidence/orch-004c-old-file-format-cleanup-20260618-235605-358/02-after-modal-cleanup-main-window.png`
  - classification: failed cleanup / blocker evidence

## Baseline Decision

Baseline status: `GO`.

Reason: `ORCH-007` supersedes `ORCH-004C` for the specific `Old File Format`
blocker. The targeted child-control cleanup succeeded through `BM_CLICK` on the
child `OK` button, id `2`, and the summary records `modalStillPresent=false`.

The current populated `ORCH-008` summary then records a targeted `BM_CLICK` on
the `Area Properties` child `Cancel` `TButton` and ends with
`dialogStillPresent=false`, `oldFileFormatStillPresent=false`, and
`responding=true`. The empty `ORCH-009` folder is not promoted as evidence.

`ORCH-010` supplies the required fresh passive no-modal baseline: `modalCount=0`,
`oldFileFormatPresent=false`, `areaPropertiesPresent=false`, `responding=true`,
`cleanBaseline=true`, and a full-frame screenshot
`01-clean-baseline-main-window.png`.

This changes the baseline decision to GO for the next non-mutating live atoms,
including a Fog pilot atom such as `Fog 106`, as long as the live atom preserves
screen evidence and rollback/restore evidence for any transient visual state.

Success wording:

`GO for next non-mutating live atom from ORCH-010 clean baseline; preserve screen/rollback evidence`.

## Blocker

Blocker id: `none` (`POST-MODAL-BASELINE-BLOCKED-001` superseded).

Blocker status: `superseded by ORCH-010`.

Blocker statement: the earlier no-clean-baseline blocker is resolved by the
current populated evidence chain: `ORCH-007` cleared `Old File Format`,
`ORCH-008` cleared `Area Properties`, and `ORCH-010` captured a passive clean
baseline with no modal-like blocker recorded.

Minimum regression evidence if this is challenged:

- a newer passive enumeration showing any modal-like blocker
- a newer screenshot contradicting `ORCH-010`
- a newer non-responsive Toolset status

## GO Conditions

Allowed next class: non-mutating baseline-dependent atom.

Example: `Fog 106`, provided it is executed as a screen-backed,
rollback-preserving atom.

Required proof for the next atom:

- preserve the `ORCH-010` baseline reference in the next atom summary
- capture screen evidence before/after the atom, or justify a single-screen
  passive proof
- preserve rollback/restore evidence for any visual toggle or transient state
  change
- include `responding=true`
- include modal absence or immediate blocker classification
- record that no global mouse and no SendKeys were used

## Exact Next Live Atom

Atom: `NEXT-NONMUTATING-BASELINE-ATOM`, e.g. `Fog 106`.

Precondition: accepted `ORCH-010` clean baseline remains the latest baseline
packet and no newer blocker evidence supersedes it.

Required proof:

- non-mutating action, or explicit rollback-safe action if a transient visual
  toggle is unavoidable
- screen evidence tied to the atom
- rollback/restore evidence when state is changed
- `responding=true`
- no modal-like blocker after the atom

Success wording allowed:

`GO for next non-mutating atom from ORCH-010 clean baseline`.

Current wording:

`GO for next non-mutating atom from ORCH-010 clean baseline; preserve screen/rollback evidence`.
