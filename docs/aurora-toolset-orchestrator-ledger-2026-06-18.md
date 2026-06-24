# Aurora Toolset Orchestrator Ledger - 2026-06-18

Updated: `2026-06-19T00:38:22+02:00`

Role: `4/6 ledger currentizer - ORCH-018 closed, ORCH-019 fail-fast/pending`.

Scope: keep the active-slot and result ledger for the Aurora Toolset
orchestrator. This document is docs-only. It must not launch Aurora, touch the
Aurora Toolset window, use global mouse input, use global `SendKeys`, or clear
modals.

## Current Work Model

- There are 6 fixed subagent slots; this is a 6-slot loop, not an elastic pool.
- Slot 1 is always the live-pilot lane.
- Only one live-lock may exist at a time.
- Slot 1 rotates to the next eligible live pilot only after a complete result,
  a partial/blocker result with evidence, a stall, or a timeout with a recorded
  blocker.
- While the live-lock is held or unclear, all other slots are docs, QA, index,
  packets, watch, or evidence-curation only.
- Non-live slots may read repo artifacts, classify screenshots, prepare
  packets, update docs, and write blockers. They must not send input to Aurora
  Toolset.
- Every live result needs Aurora-derived evidence or a precise blocker. Status
  text alone is not a result.
- Fail fast when the target is wrong, the evidence folder is empty, or the
  required PNG/`summary.json` pair is missing. Record the blocker instead of
  letting a non-promotable atom hold the loop.
- Current baseline is no longer the old `ORCH-004B` modal blocker. The current
  clean baseline is `ORCH-010`, which records `cleanBaseline=true`,
  `modalCount=0`, `responding=true`, and a full-frame PNG.

## Evidence Completeness Gate

Hard rule for this loop:

- Empty folder = `incomplete`.
- Every live atom must have a relevant PNG plus `summary.json`.
- A folder with `summary.json` but no PNG is not promotable live evidence; at
  most it can be a fail-fast/blocker note if the missing evidence is explicit.
- A folder with PNG plus `summary.json` can still be `partial` or `rejected`
  when the summary contradicts the claim, rollback fails, the target is
  ambiguous, a modal is present, or the screenshots prove only a narrower fact.
- Full-window hash deltas are not enough for clean visual promotion when the
  atom needs region/canvas proof.

## Active Slot Ledger

| Slot | Fixed lane | Current output / owner signal | Status | Evidence / blocker | Next action |
| --- | --- | --- | --- | --- | --- |
| 1 | Always live-pilot | `ORCH-019 right-palette rebaseline` | `fail-fast-pending` | `.codex-tmp/aurora-live-evidence/orch-019-right-palette-rebaseline-blocker-20260619-003734/summary.json` is summary-only: `turn_interrupted_before_png_and_full_summary_written`; no PNG; `modalCount=null`; `responding=true`. | Do not promote ORCH-019 as live evidence yet. The next real atom is a right-palette pulse with PNG + `summary.json`, or a local rescue packet that records the exact blocker/rebaseline state without Toolset input from other slots. |
| 2 | Active-slot ledger / rotation | This ledger, role `4/6` | `complete-docs-only` | `docs/aurora-toolset-orchestrator-ledger-2026-06-18.md` | Keep appending slot/result changes only from files, current owner signals, or exact blocker evidence; no UI work. |
| 3 | Harvey/status normalization | Harvey `ORCH-011` / `ORCH-011B`, plus `ORCH-016`/`ORCH-017` health ticks | `complete-status-index` | `ORCH-011` folders are empty, so `incomplete`; `ORCH-011B` is `partial`. `ORCH-016` has PNG + `summary.json` but the summary targets `Codex` / `Chrome_WidgetWin_1`, not Aurora Toolset. `ORCH-017` folders are empty, so `incomplete`. | Cite `ORCH-011B` only as partial Fog delta evidence. Treat `ORCH-016` as fail-fast/non-promotable health evidence and `ORCH-017 empty=incomplete`. |
| 4 | Plato next atom packet | Packet state after closed `ORCH-018` and fail-fast/pending `ORCH-019` | `needs-right-palette-pulse-or-local-rescue` | Existing packet `docs/aurora-toolset-next-clean-live-atom-2026-06-18.md` is consumed by the accepted-narrow ORCH-012/013/014 chain. ORCH-018 closed as blocker/incomplete; ORCH-019 is summary-only fail-fast/pending. | Next real atom: right-palette pulse with exact target, PNG + `summary.json`, final state, and rollback/cancel state when applicable. If that cannot be produced, run a local rescue packet that records the exact blocker/rebaseline state. |
| 5 | Einstein index / evidence table | `ORCH-012` through `ORCH-019` classification | `accepted-rejected-index-current` | `ORCH-012`, `ORCH-013`, `ORCH-014`, and `ORCH-015` have promotable narrow visual/layout evidence. `ORCH-016` is fail-fast/non-promotable, `ORCH-017` is incomplete, `ORCH-018` is blocker/incomplete, and `ORCH-019` is summary-only fail-fast/pending. | Promote only the narrow facts proven by each folder. Do not promote parsed inventory, command routing, mutation, rollback, right-palette pulse, or `_ikea` area-open state unless the specific atom proves it with PNG + `summary.json`. |
| 6 | Watcher / QA | Watcher plus evidence QA through `ORCH-019` | `active-watch-orch-019-fail-fast-pending` | `docs/aurora-toolset-evidence-qa-2026-06-18.md` still supplies the guardrails: exact claim, real Toolset PNG, target/module/resource, before/after/rollback when needed, and no overclaim from folder names or summary booleans. | Watch current state from `ORCH-010` through `ORCH-019`. Enforce 6-slot loop discipline, fail-fast on wrong-target/empty/summary-only evidence, and no overclaim from accepted-narrow packets. |

## Result Ledger

| Result | Status | File / artifact | Ledger note |
| --- | --- | --- | --- |
| ORCH-010 clean baseline | `accepted-clean-baseline` | `.codex-tmp/aurora-live-evidence/orch-010-clean-baseline-no-modals-20260619-000832-158/summary.json`; `01-clean-baseline-main-window.png` | Passive top-level enumeration plus full Toolset screenshot only. `modalCount=0`, `oldFileFormatPresent=false`, `areaPropertiesPresent=false`, `cleanBaseline=true`, `responding=true`. Supersedes the earlier `ORCH-004B` blocker for baseline decisions. |
| Harvey ORCH-011 | `incomplete` | `.codex-tmp/aurora-live-evidence/orch-011-fog-post-baseline-20260619-001019`; `.codex-tmp/aurora-live-evidence/orch-011-fog-post-baseline-20260619-001109` | Empty folders. No screenshots, no `summary.json`, no proof file. Per hard rule: empty folder = incomplete. |
| Harvey ORCH-011B | `partial` | `.codex-tmp/aurora-live-evidence/orch-011b-fog-post-baseline-orchestrator-20260619-001201-138/summary.json`; `01-before-fog.png`; `02-after-fog.png`; `03-after-rollback.png` | Targeted `WM_COMMAND 106` and second `106` rollback were sent. `afterDiffers=true`, `modalCountAfter=0`, `responding=true`, but `rollbackMatchesBefore=false`, so this is not canonical rollback evidence. |
| Einstein ORCH-012 canvas | `accepted-narrow-proof` | `.codex-tmp/aurora-live-evidence/orch-012-canvas-region-proof-20260619-001330-569/summary.json`; `01-full-window.png`; `02-derived-canvas-region.png`; `03-right-palette-region.png` | Passive canvas/right-palette region proof. Strong enough to anchor future region-level atoms; not proof of parity, action success, mutation, or rollback. |
| Dewey ORCH-013 right palette | `accepted-narrow-proof` | `.codex-tmp/aurora-live-evidence/orch-013-right-palette-inventory-20260619-001521/summary.json`; `01-full-window.png`; `02-right-palette.png` | Accepted narrowly for passive right-palette inventory. Current `summary.json` records `status=ok`, `modalCount=0`, `responding=true`, right-panel `TTreeView` detection, and screenshot files. Caveat: the proof is visual/passive; exact canvas region-diff, parsed tree-label inventory, command routing, mutation, and rollback remain unproven. |
| ORCH-014 left area tree | `accepted-narrow-proof` | `.codex-tmp/aurora-live-evidence/orch-014-left-area-tree-proof-20260619-001834/summary.json`; `01-full-window.png`; `02-left-tree.png` | Accepted narrowly for passive left `TTreeView` visibility. Summary records `status=ok`, `responding=true`, `modalCount=0`, `leftTTreeView.exists=true`, `leftTTreeView.visible=true`, and `leftTTreeView.className=TTreeView`. Caveat: `areaListInference` remains not inferable, so do not promote parsed area-list contents, `_ikea`, area-open, command, mutation, or rollback claims. |
| ORCH-015 bottom status | `accepted-narrow-proof` | `.codex-tmp/aurora-live-evidence/orch-015-bottom-status-proof-20260619-002101/summary.json`; `01-full-window.png`; `02-bottom-status-region.png` | Accepted narrowly for passive bottom-status/status-log region proof. Summary targets the Aurora Toolset window, records `responding=true`, `modalCount=0`, visible `TStatusBar`, and a bottom-status crop. This does not prove command routing, mutation, rollback, parsed status text, or palette behavior. |
| ORCH-016 health tick | `fail-fast-non-toolset-target` | `.codex-tmp/aurora-live-evidence/orch-016-health-tick-20260619-002240/summary.json`; `01-full-window.png` | Non-promotable as Aurora Toolset evidence. The summary records `status=ok`, `modalCount=0`, `responding=true`, and `passiveOnly=true`, but the captured target is `Codex` / `Chrome_WidgetWin_1`, not the Toolset. Treat as a fail-fast wrong-target health tick. |
| ORCH-017 health tick | `incomplete` | `.codex-tmp/aurora-live-evidence/orch-017-health-tick-20260619-002529`; `.codex-tmp/aurora-live-evidence/orch-017-health-tick-20260619-002612` | Empty folders. No screenshots, no `summary.json`, no proof file. Per hard rule: `ORCH-017 empty=incomplete`. |
| ORCH-018 right-palette pulse | `blocker-incomplete-closed` | Empty sibling `.codex-tmp/aurora-live-evidence/orch-018-right-palette-branch-pulse-20260619-003339`; blocker packet `.codex-tmp/aurora-live-evidence/orch-018-right-palette-branch-pulse-blocker-20260619-003425/summary.json`; `01-before-full.png` | Closed as blocker/incomplete. The initial folder is empty; the later packet records `status=blocked_interrupted_no_pulse`, `responding=true`, `modalCount=0`, and passive before-state only. It proves no right-palette branch pulse, no rollback, no command, no mutation, and no item/label inventory evidence. |
| ORCH-019 right-palette rebaseline | `fail-fast-pending` | `.codex-tmp/aurora-live-evidence/orch-019-right-palette-rebaseline-blocker-20260619-003734/summary.json` | Summary-only fail-fast/pending packet. It records `turn_interrupted_before_png_and_full_summary_written`, `filesWritten=[summary.json]`, `responding=true`, and `modalCount=null`. No PNG exists, so this is not promotable live evidence. |
| Plato next atom packet | `needs-right-palette-pulse-or-local-rescue` | `docs/aurora-toolset-next-clean-live-atom-2026-06-18.md` | Old packet is consumed by the accepted-narrow ORCH-012/013/014 chain and by the ORCH-018 no-pulse closure. The next real atom is a right-palette pulse with PNG + `summary.json`; if the pulse cannot be safely completed, the fallback is local rescue with a precise blocker/rebaseline summary. |
| Watcher/QA | `active-watch-qa-orch-019` | `docs/aurora-toolset-live-pilot-watch-2026-06-18.md`; `docs/aurora-toolset-evidence-qa-2026-06-18.md` | QA rules remain valid. Watcher should refresh to ORCH-010/011/011B/012/013/014/015/016/017/018/019 state and reject empty folders, wrong-target captures, or summary-only live claims. |

## Rotation Rules For Next Updates

- On live `complete`: record ticket id, exact atom, evidence folder, PNG files,
  `summary.json`, final Toolset state, rollback/cancel state, `responding`,
  modal state, mutation state, and next eligible live pilot.
- On live `partial`, `stall`, or timeout: record the precise blocker, whether
  the live-lock is released, whether cleanup is required, and which non-live
  slot owns the next packet or QA check.
- On docs/QA completion: record the output file and whether it changes any
  live-pilot eligibility. Docs-only work never clears the live-lock by itself.
- On any empty evidence folder: classify it as `incomplete`; do not cite it as
  blocker, success, or partial evidence.
- On any live atom without both PNG and `summary.json`: do not promote it. If it
  is summary-only, wrong-target, or otherwise non-promotable, keep it as a
  fail-fast/blocker note only when the missing evidence and failure point are
  explicit.
- `ORCH-018` is closed as blocker/incomplete. Do not reopen it or promote it as
  right-palette pulse evidence.
- On `ORCH-019`: keep it fail-fast/pending until a populated right-palette
  pulse packet exists with PNG + `summary.json`, or a local rescue packet records
  the exact blocker/rebaseline state.
- Keep the 6-slot loop stable: slot 1 is the only live-pilot; slots 2-6 may
  refresh docs, QA, packets, evidence indexes, and blockers only while a live
  atom is active.

## Current Slot Status

- Slot 1: `ORCH-019` right-palette rebaseline is fail-fast/pending; it has
  summary-only blocker evidence and no PNG.
- Slot 2: ledger refreshed; docs-only work complete.
- Slot 3: Harvey status is settled: `ORCH-011=incomplete`,
  `ORCH-011B=partial`; `ORCH-016=fail-fast-non-toolset-target`;
  `ORCH-017=incomplete`.
- Slot 4: Plato packet is consumed/stale after accepted-narrow ORCH-012/013/014
  and closed ORCH-018; next real atom is right-palette pulse with PNG +
  `summary.json`, or local rescue.
- Slot 5: ORCH-012 canvas, ORCH-013 right palette, ORCH-014 left tree, and
  ORCH-015 bottom status are accepted only as narrow passive visual/layout
  proof; ORCH-016 is rejected/fail-fast, ORCH-017 is incomplete, ORCH-018 is
  closed blocker/incomplete, and ORCH-019 is fail-fast/pending.
- Slot 6: watcher/QA is active; refresh through `ORCH-019` and enforce
  PNG + `summary.json`, correct Toolset target, 6-slot discipline, and no
  overclaim from accepted-narrow packets.
