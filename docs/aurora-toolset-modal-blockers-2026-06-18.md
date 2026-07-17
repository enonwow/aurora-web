# Aurora Toolset modal blockers - 2026-06-18

## ORCH-004B passive status

Source folder:
`.codex-tmp/aurora-live-evidence/orch-004b-orchestrator-passive-status-20260618-235455-772`

The orchestrator detected a blocking Aurora Toolset modal during passive status
collection. The pass was passive window enumeration plus screenshot only; it did
not use input, global mouse actions, or SendKeys.

Detected modal:

- hwnd: `19467448`
- class: `#32770`
- title: `Old File Format`
- rect: `left=770, top=465, right=1157, bottom=621`

Related Toolset windows seen in the same passive status:

- hwnd: `395506`
- class: `TfrmFrame`
- title: `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - the_last_city — codex.mod`
- hwnd: `3344744`
- class: `TApplication`
- title: `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17`

Impact: the `Old File Format` dialog was a modal blocker for live pilots. Any
live-pilot lane that needs Toolset interaction should treat this modal as a hard
blocker until it is cleared or the lane is explicitly routed around it.

Cleanup rule: cleanup must be targeted only. Use `WM_COMMAND IDOK` against the
`#32770` `Old File Format` dialog. Do not use global mouse movement, global
clicks, SendKeys, or broad desktop input.

## Later cleanup evidence

Found later cleanup folder:
`.codex-tmp/aurora-live-evidence/orch-004c-old-file-format-cleanup-20260618-235605-358`

Cleanup evidence summary:

- atom: `ORCH-004C Old File Format modal cleanup`
- method: `Targeted WM_COMMAND IDOK to #32770 Old File Format dialog; no global mouse or SendKeys`
- modal before cleanup: hwnd `19467448`, class `#32770`, title `Old File Format`
- send result: `sent=true`, `result=0`
- after status: `modalStillPresent=true`, `responding=true`

Cleanup status: known cleanup folder exists, but this evidence does not prove
the modal was cleared because `modalStillPresent` remained `true`.

## ORCH-006 child inventory status

Observed folder:
`.codex-tmp/aurora-live-evidence/orch-006-orchestrator-old-file-format-child-inventory-20260619-000223-511`

Status: `accepted-blocker/passive-inventory`.

The folder contains `summary.json` and `01-old-file-format-modal.png`. The pass
was passive top-level and child-window enumeration plus modal screenshot only;
it used no input, no global mouse, and no SendKeys.

ORCH-006 confirms the blocker is still present:

- `modalPresent=true`
- modal hwnd: `19467448`
- modal class: `#32770`
- modal title: `Old File Format`
- modal text: `This area is in an old file format. Please ensure that the Area Name, ResRef, and Tag have correct values`
- Toolset/responding status: `responding=true`

Safe child-control target found:

- class: `Button`
- text: `OK`
- id: `2`
- hwnd: `52235728`
- visible: `true`

Cleanup status: ORCH-006 did not send input and does not prove the modal was
cleared. The next cleanup attempt should target only the verified child `OK`
button, preferably with a timeout-bound `BM_CLICK` to hwnd `52235728`, then
re-enumerate until `modalPresent=false`. Do not use global mouse movement,
global clicks, SendKeys, or broad desktop input.

## Current blocker status

Status: `resolved-at-baseline`.

Baseline evidence:

- `ORCH-007` proves targeted `Old File Format` cleanup succeeded.
- `ORCH-008` proves targeted `Area Properties` cancel succeeded.
- `ORCH-009` exists as an empty failed local attempt only and contributes no
  modal-state evidence.
- `ORCH-010` proves there are no unexpected top-level modal blockers at the
  clean baseline.

Warning: `Old File Format` is resolved at this baseline, but it can still appear
again during opening/properties flows. Treat any new `Old File Format` dialog as
a fresh modal hazard for that operation and clear it only with targeted window or
child-control messaging; do not use global mouse movement, global clicks,
SendKeys, or broad desktop input.

## ORCH-007 Old File Format cleanup success

Observed folder:
`.codex-tmp/aurora-live-evidence/orch-007-old-file-format-ok-child-bmclick-20260619-000325-120`

Status: `old-file-format-cleanup-success`.

The folder contains `summary.json`, `01-modal-before-bmclick.png`, and
`02-after-cleanup-main.png`. The cleanup used targeted child-control messaging
only; it used no global mouse and no SendKeys.

Cleanup action:

- target modal before cleanup: hwnd `19467448`, class `#32770`, title `Old File Format`
- target child: class `Button`, text `OK`, id `2`, hwnd `52235728`
- method: `BM_CLICK` to child `Button` `OK`
- `bmClick.sent=true`
- `bmClick.result=0`
- `wmCommandFallback.sent=false`

Result:

- `modalStillAfterBm=false`
- `modalStillPresent=false`
- `responding=true`
- `Old File Format` blocker is cleared in this folder

Next blocker:

- hwnd: `6949366`
- class: `TdlgAreaProperties`
- title: `Area Properties`
- rect: `left=-1236, top=244, right=-685, bottom=788`

Cleanup status: ORCH-007 proves the targeted child `OK` `BM_CLICK` cleared the
`Old File Format` modal. It also records the next modal as `Area Properties`,
which is handled by ORCH-008 below.

## ORCH-008 Area Properties cancel success

Observed folder:
`.codex-tmp/aurora-live-evidence/orch-008-area-properties-cancel-20260619-000517`

Status: `area-properties-cancel-success`.

The folder contains `summary.json`, `01-before-dialog.png`, and `02-after.png`.
The cleanup used targeted child-control messaging only; it used no global mouse
and no SendKeys.

Cleanup action:

- target dialog before cleanup: hwnd `6949366`, title `Area Properties`
- target child: class `TButton`, text `Cancel`, hwnd `36769122`
- method: `BM_CLICK` to child `TButton` `Cancel`
- `clickResult.returned=0`

Result:

- `dialogStillPresent=false`
- `oldFileFormatStillPresent=false`
- `blocker=null`
- `responding=true`
- visible Toolset top-level windows were responding after cleanup

Cleanup status: ORCH-008 proves the targeted `Cancel` `BM_CLICK` cleared the
`Area Properties` dialog without reintroducing the `Old File Format` modal.

## ORCH-009 incomplete Area Properties attempt

Observed folder:
`.codex-tmp/aurora-live-evidence/orch-009-area-properties-cancel-child-bmclick-20260619-000654-392`

Status: `failed-local-attempt/no-evidence`.

The folder exists with `CreationTime=2026-06-19T00:06:54.4095714+02:00` /
`LastWriteTime=2026-06-19T00:06:54.4095714+02:00`, but it contains no files,
no screenshots, and no `summary.json`.

Cleanup status: ORCH-009 does not prove any modal state and does not supersede
ORCH-008 or ORCH-010.

## ORCH-010 clean baseline no top-level modals

Observed folder:
`.codex-tmp/aurora-live-evidence/orch-010-clean-baseline-no-modals-20260619-000832-158`

Status: `resolved-at-baseline/no-top-level-modals`.

The folder contains `summary.json` and `01-clean-baseline-main-window.png`. The
pass was passive top-level enumeration plus full Toolset screenshot only; it
used no input, no global mouse, and no SendKeys.

Baseline result:

- `modalCount=0`
- `unexpectedTopLevelWindows={}`
- `oldFileFormatPresent=false`
- `areaPropertiesPresent=false`
- `cleanBaseline=true`
- `responding=true`

Blocker status: the modal blocker is `resolved-at-baseline` as of ORCH-010.
Keep the warning above: `Old File Format` may still appear again during future
opening/properties flows and must be handled as a fresh targeted-cleanup hazard
if it returns.
