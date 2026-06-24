# Aurora Toolset Evidence QA - 2026-06-18

Scope: audit of current files under `.codex-tmp/aurora-live-evidence`. No live Aurora launch, no window interaction, no global mouse, no SendKeys. This is an evidence-quality audit, not a replay.

## Verdict Summary

Canonical success is limited to evidence that is visibly Aurora Toolset-derived, names the real module/window/resource, has a nonblank screenshot, and proves the exact claim being made. A real Aurora screenshot can still be only partial if it proves a narrower fact than the folder name implies.

| Classification | Evidence | QA verdict |
| --- | --- | --- |
| Canonical success | `proof-pulse-trigger-open-cancel/02-dialog-basic-20260618-220626-399.png` with `01-before` and `03-after-cancel` | Accepted for "Trigger Properties opens on a selected trigger and can be canceled cleanly." The screenshot contains a rendered Aurora area, Trigger Properties modal, selected trigger context, and a later clean state. It is not evidence for web parity. |
| Canonical success | `trigger-variables-atom/02-trigger-variables-dialog-20260618-214118-702.png` with `01-trigger-advanced-before-variables` | Accepted for "Variables dialog opens from Trigger Properties / Advanced." It has a visible Aurora viewport and a concrete Variables dialog. |
| Canonical success | `trigger-scripts-atom/01-trigger-scripts-tab-20260618-214431-469.png` and `trigger-script-picker-atom/01-scripts-tab-20260618-215031-861.png` | Accepted for "Scripts tab is reachable/visible." Do not treat `02-onclick-picker-...png` as proof that a script picker opened; it still shows the Trigger Properties dialog. |
| Canonical success, narrow | `orch-001f-ikea-enter-local-20260618-234201-276/01-before-ikea-enter.png` and `02-after-ikea-enter.png` | Accepted only as a live Toolset open-area render for `the_last_city - codex.mod`, visible tab `_winds_houses`, selected tree item `_winds_houses`. It is not canonical success for opening `_ikea`, despite the folder name. |
| Canonical success, narrow | `orch-002-fog-toggle-open-area-20260618-234404-079/summary.json` and screenshots `01/02/03` | Accepted for command dispatch and rollback on a visible open area: method is `WM_COMMAND 106`, after hash differs, final hash matches before, Toolset responds. Treat the visual fog effect itself as weak unless a cropped diff or pixel/region diff is added. |

## Partial Evidence

| Evidence | Why partial |
| --- | --- |
| `hb-live-click-recovery/*` | Useful recovery trail: tab clicks, trigger property tabs, scripts/basic/advanced/comments images. It mixes failed attempts and cleanups, has no single action manifest, and should be cited as provenance/diagnostic only. |
| `subagent-live-pilot-trigger-script-picker/*` | Shows progression into trigger properties/scripts context, but the picker step is a small dialog crop and not enough for a full picker workflow claim. |
| `hb-001-tree-selection-pulse/*` | Shows selection movement and a later cleanup screen. Useful as a tree-selection pulse, not as canonical proof of a durable object-editing workflow. |
| `hb-002-viewport-pan-pulse/*`, `hb-003-viewport-zoom-pulse/*`, `subagent-live-pilot-camera-d-und/*` | Nonblank Aurora frames with changed hashes. Partial only: no stable camera/viewport metric, no area/resource assertion beyond visible context, and no independent rollback metric. |
| `hb-004-palette-standard-custom-pulse/*`, `hb-005-palette-category-expand-pulse/*`, `hb-006-palette-item-select-pulse/*`, `hb-007-placeable-preview-only-pulse/*`, `hb-008-paint-select-rollback-pulse/*`, `hb-009-show-plot-toggle-pulse/*` | Plausible UI operation breadcrumbs. They need an action manifest or crop/diff around the affected control before being promoted to canonical evidence. Final cleanup/select screens are not success proof by themselves. |
| `hb-011-fog-toggle-pulse/summary-20260618-225415-136.json` | Better than display-grid because the after hash differs and menu state changes/rolls back. Still partial: it lacks a strong visible region diff and clear area/resource provenance in the manifest. |
| `orch-001d-areas-expand-local-20260618-233949-755/*` | Partial tree expansion evidence: Toolset title is present and the hash changes. It does not open/render an area. |
| `orch-003-placeables-tree-pulse-20260618-234649-743/*` and `orch-003b-placeables-collapse-cleanup-20260618-234754-819/*` | Partial tree/palette operation evidence on a visible open area. In `orch-003`, final equals after rather than before, so rollback is not proven. |

## Blockers

| Evidence | Blocker |
| --- | --- |
| `orch-001a-module-load-local-20260618-233026-239/04-after-module-load.png` and `summary.json` | Blocker for module-load success. Summary says `loaded=true`, but top windows include visible `Error`, and the screenshot says `The specified file could not be found.` The title alone is not enough to accept the load. |
| `orch-001e-ikea-open-local-20260618-234030-576/summary.json` | Blocker/off-target for `_ikea` open: `responding=false`, no clean final state, and the final screenshot is invalid. |
| `hb-012-use-area-lighting-enon-bakery-pilot/hb-012-summary.json` | Clean blocker: "Could not confidently switch active tab to enon_bakery... lighting command not sent." This is admissible as blocker evidence, not feature success. |
| `hb-001-trigger-basic-pulse/02-blocker-no-dialog-...png` and `hb-002-trigger-scripts-pulse/02-blocker-no-dialog-...png` | Accept only as blocker/failed-attempt evidence for those pulses. Do not count as Trigger Properties success. |

## Rejected Or Unreliable Screens

| Evidence | Rejection reason |
| --- | --- |
| `orch-001e-ikea-open-local-20260618-234030-576/03-final-after-load-wait.png` | Invalid capture: `1x1`, one color, effectively black/blank. |
| `orch-001a-module-load-local-20260618-233026-239/04-after-module-load.png` | Rejected as module-load success because it is a final screen after an error modal. It remains blocker evidence. |
| `orch-001c-fog-toggle-local-20260618-233902-054/*` | Rejected as visual toggle evidence: all screenshots have identical hash, low color count, and `afterDiffers=false`. |
| `hb-010-display-grid-toggle-pulse/*` | Rejected as screenshot proof: every before/after/final display-grid image has the same hash. The JSON menu-state transition can be partial command telemetry only. |
| `dedicated-fast-pilot-camera/toolset_before_...png` and `toolset_after_...png` | Rejected as camera/viewport proof: identical hashes and a mostly blank/loading viewport. Usable only as preflight context. |
| `dedicated-fast-pilot-trigger-variables/*` except any later real dialog evidence in other folders | Rejected for variables success: repeated identical blank/loading Toolset frames. |
| `dedicated-fast-pilot-trigger-open-cancel/trigger_after_clean_20260618_220040501.png`, `trigger_before_20260618_220039117.png`, and similar low-entropy preflight/full-window frames | Preflight/cleanup context only. The dialog screenshot in the same folder may be useful, but these frames cannot prove the action. |
| `trigger-script-picker-atom/02-onclick-picker-20260618-215032-724.png` | Rejected for "picker opened" claim: the visible screen is still Trigger Properties/Scripts, not a picker dialog. |

## Minimal Conditions For Admissible Evidence

1. Provenance must include timestamp, absolute path, capture method, top-level Toolset window title, HWND or equivalent target id, and responding/hung/modal status.
2. The screenshot must be full-size or intentionally cropped with context, nonblank, not 1x1, not black/white/loading-only, and must show the relevant Aurora UI or rendered viewport.
3. The claim must name the exact module and resource visible in the evidence. If the visible tab/tree says `_winds_houses`, it cannot be cited as `_ikea` success.
4. Action evidence must include before, after, and rollback/final when rollback is expected. Hashes should differ for the action and final should match before for rollback claims.
5. UI command evidence must include command id or control target, send method, result/timeout, and visible corroboration. Menu-state-only telemetry is partial unless paired with visible change or a strong crop/diff.
6. Blocker evidence must capture the exact failure text/status and the clean state or lack of clean state. A timeout without window/modal context is not enough.
7. Canonical Toolset evidence does not automatically prove web runtime parity. Promotion to web/Aurora parity needs the Toolset source evidence plus corresponding web route/resource/frame/render-status comparison.

## Orchestration Risks

1. Folder names and summary booleans can overclaim. Example: `orch-001f-ikea-enter` shows `_winds_houses`; `orch-001a` says `loaded=true` while an Error modal is visible.
2. Heartbeat loops can generate identical or low-entropy screenshots that look like evidence volume but prove no visual action. Identical hashes must fail the visual-evidence gate.
3. Concurrent agents can inherit stale window state, hidden modals, off-screen coordinates, or cleanup screens from another lane. Each accepted evidence packet needs its own target, modal, and final-state checks.
