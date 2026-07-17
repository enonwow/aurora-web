# Aurora Toolset Orchestrator Session - 2026-06-18

## Scope

Docs/checklist worker records the current orchestration protocol only.
This worker must not touch the Aurora window and must not perform live UI control.

## Current Orchestration Protocol

### 6-Slot Continuous Loop

- The orchestrator runs a six-slot continuous loop: each slot must either advance a safe next action, record evidence, or record a precise blocker before yielding.
- Slots rotate after a completed atom, timeout, or blocker; an idle slot must not stop the loop if another safe docs/recon/screen-curator task is available.
- Each slot handoff must name the current ORCH id, status, evidence folder, next safe action, and whether the live-pilot lock is free or occupied.
- The loop is continuous, but only the active live pilot may touch the Aurora Toolset window. All other slots stay in docs/recon/screen-curator scope.

### Live-Pilot Lock

- Exactly one worker may hold the live-pilot lock at any time.
- The live pilot is the only worker allowed to operate against the Aurora Toolset window.
- The live pilot must announce lock acquisition, target action, evidence path, and lock release.
- No other worker may send input, focus changes, mouse actions, keyboard actions, or window-control messages while the lock is held.
- If the lock state is unclear, workers must treat it as occupied until the orchestrator resolves ownership.

### Pilot Rotation

- Pilot ownership rotates between eligible live pilots after each completed iteration or timeout.
- A pilot that just released the lock moves to the back of the queue unless assigned a direct follow-up by the orchestrator.
- Rotation handoff must include the last Aurora-visible state, screenshot references, manifest update status, and next safe action.
- A worker may decline pilot rotation if it cannot produce Aurora evidence safely within the iteration.

### 60s Timeout

- Every live-pilot iteration has a 60 second wall-clock timeout from lock acquisition.
- At timeout, the pilot must stop Toolset interaction, release the lock, and record either evidence gathered so far or a precise blocker.
- Timeout is not success by itself; the iteration still needs Aurora-derived evidence or a precise blocker.
- Repeated timeout on the same action requires a workflow adjustment before another pilot repeats it.

### Worker Roles

- `screen-curator` is a permanent worker.
- `screen-curator` owns screenshot hygiene: file naming, freshness checks, crop/context notes, and manifest update verification.
- All workers except the active live pilot and `screen-curator` are limited to recon, docs, and workflow work.
- Recon/docs/workflow workers may read repo artifacts, prepare checklists, inspect saved screenshots, update docs, and propose next actions.
- Recon/docs/workflow workers must not touch the Aurora Toolset window.

### Iteration Evidence Rule

- Each iteration must end with one of:
  - Aurora-derived evidence from the live Toolset state.
  - A precise blocker that explains why Aurora-derived evidence could not be captured.
- Valid Aurora evidence includes a fresh screenshot, a recorded Toolset-visible state, a named UI control observation, or another durable artifact directly tied to the Aurora window.
- Invalid evidence includes status-only updates, assumptions, generic traces, unrelated repo diffs, or screenshots that cannot be tied to the claimed Toolset state.
- If evidence is missing or ambiguous, the iteration remains incomplete.

### Screenshots And Manifest Updates

- Every live-pilot iteration must produce or reference a fresh screenshot when visually meaningful.
- Screenshot entries must include filename/path, timestamp, pilot id, Toolset/module context, and the claim the screenshot supports.
- `screen-curator` verifies screenshot readability and whether the screenshot matches the manifest entry.
- The manifest must be updated in the same iteration as the screenshot or the iteration must record a precise manifest-update blocker.
- The manifest entry must include status, source worker, evidence path, and any blocker or follow-up needed.

### Screen-Gate

- No visual or Toolset-state claim is accepted unless it passes the screen-gate: fresh screenshot or crop evidence, named evidence folder, readable target, and summary/manifest linkage.
- Full-window hash changes are not enough for canvas/viewer claims after ORCH-011B; prefer canvas, viewer, or right-palette crops tied to HWND/control inventory.
- If a screenshot is missing, blank, ambiguous, stale, or not tied to the claimed Toolset state, keep the atom `pending`, `partial`, or `blocked`; do not promote it.
- `screen-curator` owns the gate and may accept a narrow claim while rejecting broader wording from the same folder.

### Handoff Checklist

- Live-pilot lock released.
- Pilot rotation queue updated.
- 60s timeout result recorded.
- Aurora evidence or precise blocker recorded.
- Screenshot captured or screenshot blocker recorded.
- Manifest updated or manifest-update blocker recorded.
- Next worker scope confirmed as live-pilot, screen-curator, or recon/docs/workflow.

## Current State - 2026-06-19

Baseline chain:

- `ORCH-007` is resolved for the narrow `Old File Format` cleanup baseline step. Evidence folder: `.codex-tmp/aurora-live-evidence/orch-007-old-file-format-ok-child-bmclick-20260619-000325-120`. Targeted child `OK` `BM_CLICK` cleared the modal (`modalStillPresent=false`), but spawned `Area Properties`; it is not a clean baseline by itself.
- `ORCH-008` is resolved for `Area Properties` cleanup. Evidence folder: `.codex-tmp/aurora-live-evidence/orch-008-area-properties-cancel-20260619-000517`. Targeted `Cancel` `BM_CLICK` cleared both `Area Properties` and `Old File Format` according to `summary.json`.
- `ORCH-010` is the accepted clean baseline. Evidence folder: `.codex-tmp/aurora-live-evidence/orch-010-clean-baseline-no-modals-20260619-000832-158`. Passive enumeration plus screenshot recorded `cleanBaseline=true`, `modalCount=0`, `oldFileFormatPresent=false`, `areaPropertiesPresent=false`, and `responding=true`.

Post-baseline evidence:

- `ORCH-011B` is partial Fog evidence only. Evidence folder: `.codex-tmp/aurora-live-evidence/orch-011b-fog-post-baseline-orchestrator-20260619-001201-138`. It proves targeted `WM_COMMAND 106`, after-frame delta, no modal afterward, and responding Toolset; it does not prove canonical rollback because `rollbackMatchesBefore=false`.
- `ORCH-012` is accepted as narrow canvas/region proof. Evidence folder: `.codex-tmp/aurora-live-evidence/orch-012-canvas-region-proof-20260619-001330-569`. Passive full-window plus derived canvas/right-palette crops and child inventory recorded `modalCount=0`, `responding=true`, active `_winds_houses` area tab, `TfrmViewerArea`, and a derived canvas region screenshot. This accepts a measurement target, not render parity or mutation.
- `ORCH-013` exists and is accepted narrowly as passive right-palette inventory. Evidence folder: `.codex-tmp/aurora-live-evidence/orch-013-right-palette-inventory-20260619-001521`. `summary.json` records `status=ok`, `modalCount=0`, `responding=true`, right-panel `TTreeView` detection, and full-window/right-palette screenshots. The originally suggested `NXA-CANVAS-REGION-DIFF-001` remains pending if that exact region-diff atom is still required.

## Backlog

| ID | Title | Status | Owner | Evidence / Blocker | Notes |
| --- | --- | --- | --- | --- | --- |
| ORCH-001 | Live-pilot lock protocol | TODO |  |  |  |
| ORCH-002 | Pilot rotation queue | TODO |  |  |  |
| ORCH-003 | 60s timeout enforcement | TODO |  |  |  |
| ORCH-004 | Permanent screen-curator lane | TODO |  |  |  |
| ORCH-005 | Recon/docs/workflow worker limits | TODO |  |  |  |
| ORCH-006 | Iteration evidence rule | TODO |  |  |  |
| ORCH-007 | Old File Format targeted cleanup | RESOLVED-BASELINE | live-pilot / screen-curator | `.codex-tmp/aurora-live-evidence/orch-007-old-file-format-ok-child-bmclick-20260619-000325-120` | Clears `Old File Format`; not clean alone because `Area Properties` appeared. |
| ORCH-008 | Area Properties targeted cleanup | RESOLVED-BASELINE | live-pilot / screen-curator | `.codex-tmp/aurora-live-evidence/orch-008-area-properties-cancel-20260619-000517` | Clears the follow-on dialog; supports baseline chain. |
| ORCH-009 | Manifest update requirement | TODO |  |  |  |
| ORCH-010 | Clean no-modal baseline | RESOLVED-BASELINE | screen-curator | `.codex-tmp/aurora-live-evidence/orch-010-clean-baseline-no-modals-20260619-000832-158` | Accepted passive baseline: `cleanBaseline=true`, `modalCount=0`. |
| ORCH-011B | Post-baseline Fog toggle proof | PARTIAL | live-pilot / screen-curator | `.codex-tmp/aurora-live-evidence/orch-011b-fog-post-baseline-orchestrator-20260619-001201-138` | After-frame delta accepted; canonical rollback not accepted. |
| ORCH-012 | Canvas/region proof | ACCEPTED | screen-curator | `.codex-tmp/aurora-live-evidence/orch-012-canvas-region-proof-20260619-001330-569` | Accepted as measurement target/crop proof only. |
| ORCH-013 | Right-palette inventory / region-diff follow-up | ACCEPTED-NARROW | screen-curator | `.codex-tmp/aurora-live-evidence/orch-013-right-palette-inventory-20260619-001521` | Accepted for passive right-palette inventory; exact canvas region-diff follow-up remains pending if still desired. |
