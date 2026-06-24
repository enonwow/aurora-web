# Aurora Toolset doc consistency check - 2026-06-18

Scope: read-only review of new `docs/aurora-toolset-*2026-06-18*.md` files from
the session, focused on ORCH-004B / ORCH-004C / ORCH-005 / ORCH-006 and cleanup
claims. I did not launch Aurora, touch the Toolset window, use global mouse, or
use SendKeys.

## Executive verdict

- ORCH-004B is evidence of a passive status check plus a hard modal blocker, not
  a clean-state or live-pilot success.
- ORCH-004C is failed cleanup evidence. The docs that mention
  `modalStillPresent=true` correctly say the modal was not cleared, but
  `partial` is still too soft as a status label for routing.
- ORCH-005 has no usable evidence. One doc says it was only backlog/TODO; a later
  screenshot index says an empty folder existed. Both imply no promotion, but
  the docs should be normalized.
- ORCH-006 has no result evidence in the reviewed docs; it remains TODO/no
  artifact.
- I did not find a direct claim that ORCH-004C cleanup succeeded while
  `modalStillPresent=true`. The closest dangerous overclaim is the screenshot
  index marking ORCH-004B as `success` even though its own row records visible
  `Old File Format`.

## ORCH consistency table

| Item | Current doc state | Consistency verdict | Required wording |
| --- | --- | --- | --- |
| ORCH-004B | `aurora-toolset-screenshot-index-2026-06-18.md:19` marks `success`, but the same row says visible modal `Old File Format` was present. `aurora-toolset-modal-blockers-2026-06-18.md:28-29`, `aurora-toolset-evidence-status-table-2026-06-18.md:35`, and `aurora-toolset-orchestrator-ledger-2026-06-18.md:50` classify it as modal-blocker/passive status. | Inconsistent status label. Evidence is valid only as passive blocker proof. | `blocker/passive-status` or `accepted-blocker`, never unqualified `success`. |
| ORCH-004C | `aurora-toolset-screenshot-index-2026-06-18.md:20` says `partial` and records `modalStillPresent=true`. `aurora-toolset-modal-blockers-2026-06-18.md:47-50`, `aurora-toolset-evidence-status-table-2026-06-18.md:36`, and `aurora-toolset-orchestrator-ledger-2026-06-18.md:51` correctly reject modal-cleared success. | Mostly consistent, but `partial` can be misread by dispatchers. | `failed-cleanup/blocker`; explicitly "send happened, modal not cleared". |
| ORCH-005 | `aurora-toolset-orchestrator-ledger-2026-06-18.md:52` says backlog/TODO only. Later `aurora-toolset-screenshot-index-2026-06-18.md:21,26,33` says an ORCH-005 folder appeared but was empty and had no screenshot or `summary.json`. `aurora-toolset-evidence-status-table-2026-06-18.md:16-19` excludes it from that table. | Stale but not overclaiming. Ledger is older than screenshot-index. | Normalize all references to `observed-empty/incomplete`; no visual evidence and no result. |
| ORCH-006 | `aurora-toolset-orchestrator-session-2026-06-18.md:76` lists TODO. `aurora-toolset-screenshot-index-2026-06-18.md:26` says no ORCH-006 folder was present. | Consistent pending/no-evidence state. | Keep as TODO/no artifact until a real folder with screenshots and summary exists. |

## Cleanup-success audit

No reviewed doc explicitly says the ORCH-004C `Old File Format` cleanup
succeeded despite `modalStillPresent=true`.

The safe statements already present are:

- `aurora-toolset-modal-blockers-2026-06-18.md:47-50`: after status has
  `modalStillPresent=true`; the evidence does not prove the modal was cleared.
- `aurora-toolset-evidence-status-table-2026-06-18.md:36`: rejected for cleanup
  success; failed-cleanup/blocker evidence only.
- `aurora-toolset-orchestrator-ledger-2026-06-18.md:51`: failed-cleanup; do not
  mark modal cleared.
- `aurora-toolset-live-pilot-prompts-2026-06-18.md:318-322`: next action should
  be ORCH-004D cleanup; passive baseline only after `modalStillPresent=false`.

The unsafe wording is indirect:

- `aurora-toolset-screenshot-index-2026-06-18.md:19` uses status `success` for
  ORCH-004B while the modal is present. This can accidentally release the live
  lane if a reader keys only off the status column.
- `aurora-toolset-screenshot-index-2026-06-18.md:20` uses `partial` for ORCH-004C
  even though the cleanup attempt failed. The row body is accurate, but the
  status should be harsher.

## Related overclaims outside ORCH-004B/C/005/006

These are not the main target, but they are high-risk because they share the
same "status column stronger than evidence" pattern:

- ORCH-001a module load: `aurora-toolset-screenshot-index-2026-06-18.md:13` says
  `success`, and `aurora-toolset-live-evidence-manifest-2026-06-18.md:164`
  calls it a real module-load success. This conflicts with
  `aurora-toolset-evidence-qa-2026-06-18.md:34,44` and
  `aurora-toolset-evidence-status-table-2026-06-18.md:26,45-48`, which say the
  final frame includes a visible `Error` modal. Safer wording: module selection
  and title-change proof plus `Error` blocker, not clean module-load success.
- ORCH-001f `_ikea` naming: `aurora-toolset-screenshot-index-2026-06-18.md:15`
  labels it `_ikea` success, but `aurora-toolset-evidence-qa-2026-06-18.md:14,56`
  and `aurora-toolset-evidence-status-table-2026-06-18.md:30,40-43` say the
  visible tab/context is `_winds_houses`. Safer wording: accepted only for
  visible `_winds_houses` open-area context.
- Command map cleanup language: `aurora-toolset-command-map-2026-06-18.md:40`
  says post-load `Error` popup cleanup is proven for action, while
  `aurora-toolset-command-map-2026-06-18.md:107-108` says the cleanup procedure
  needs retest. The row should separate "targeting recipe exists" from "current
  cleanup proof exists".

## Top 3 corrections to perform

1. Fix `docs/aurora-toolset-screenshot-index-2026-06-18.md` status labels:
   ORCH-004B should be `blocker/passive-status`, ORCH-004C should be
   `failed-cleanup/blocker`, ORCH-005 should stay `incomplete`, and any clean
   live-pilot wording must require `modalStillPresent=false`.
2. Normalize the ORCH-005/ORCH-006 lane docs:
   `docs/aurora-toolset-orchestrator-ledger-2026-06-18.md` and
   `docs/aurora-toolset-orchestrator-session-2026-06-18.md` should reflect that
   ORCH-005 was later observed as an empty evidence folder, while ORCH-006 has
   no folder/result. The next live cleanup should remain ORCH-004D or be
   explicitly renumbered.
3. Downgrade clean-success wording for ORCH-001a and ORCH-001f across the
   screenshot index, live evidence manifest, command map, and any downstream
   playbooks: `loaded=true` plus title change is not clean module-load success
   while an `Error` modal is visible, and `_ikea` folder naming is not `_ikea`
   proof when the visible context is `_winds_houses`.

## Safe dispatch rule after this check

Do not route another interactive Toolset pilot from these docs unless a newer
evidence packet records a concrete cleanup result with `modalStillPresent=false`,
no visible modal-like window, Toolset responding, and a readable final frame.
