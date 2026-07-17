# Aurora Toolset Evidence Status Table - 2026-06-18

Scope: read-only normalization of ORCH folders under
`.codex-tmp/aurora-live-evidence`. The initial pass covered `001a` through
`004c`; the 2026-06-19 status-index update also adds ORCH-011 and ORCH-011B
rows, the requested ORCH-012 canvas-region proof row, the watcher ORCH-013
row, the ORCH-014 left-area-tree proof row, and the ORCH-015 bottom/status
proof row. This ORCH-017/018/020 QA sequence adds the observed empty ORCH-017
and ORCH-020 folders as incomplete/no-evidence rows, the later ORCH-018
interrupted right-palette branch-pulse blocker packet, and the populated
ORCH-020 right-palette Features branch pulse packet. This post-live ORCH-021
QA update adds the runner right-palette Features pulse packet with canonical
palette rollback. This ORCH-023 QA update adds the safe right-palette
Features -> City expansion/rollback packet as canonical no-mutation evidence.
This ORCH-024/025/026d/027 QA update adds canonical Groups root, Terrain root,
and Groups -> City sequence packets, plus a partial Terrain -> Road sequence
row that is canonical only for Terrain root expansion/rollback. This
ORCH-028/029/030/031/032 QA update adds canonical corrected Groups -> Building,
Groups -> Grass, and Groups -> Water rows, a blocked/superseded missed Water
attempt, and a cleanup/rebaseline row limited to the selected-Terrain baseline.
This ORCH-035b/036 QA update adds the passive left area tree inventory packet
and the canonical safe current-area `Placeables` category pulse/rollback packet.
No Aurora launch, no window touch, no global mouse, and no SendKeys were used
for this documentation pass.

Verdict vocabulary:

- `accepted`: the folder supports the exact narrow claim stated in the reason.
- `accepted/passive`: the folder supports the exact narrow passive observation
  claim, without navigation, click, command, mutation, save, or canvas-input
  proof.
- `accepted canonical`: the folder supports the exact narrow claim and includes
  the matching rollback/state restoration evidence required for canonical use.
- `partial`: the folder is usable only as provenance, a blocker, or a narrower
  sub-claim than the folder name implies.
- `blocked`: the folder contains a usable blocker packet but does not support
  the operation named by the folder.
- `blocked/superseded`: the folder is not accepted for its intended claim and a
  later folder replaces it with corrected evidence.
- `incomplete`: the folder was observed, but has no usable proof packet yet.
- `rejected`: the folder does not support the claimed operation because evidence
  is missing, invalid, unchanged, or contradicted by the summary.

Inventory note: no `orch-001b` or `orch-004a` folder was present in the
requested range. A later `orch-005-*` folder appeared during scanning, but it is
outside this `001a`-through-`004c` normalization window and is not classified
below. ORCH-011, ORCH-011B, ORCH-012, ORCH-013, ORCH-014, ORCH-015, ORCH-017,
ORCH-018, ORCH-020, ORCH-023, ORCH-024, ORCH-025, ORCH-026d, and ORCH-027 are
appended status-index rows outside the initial normalization window. ORCH-028,
ORCH-029, ORCH-030, ORCH-031, and ORCH-032 are later QA status rows appended to
this same table. ORCH-035b and ORCH-036 are later left-tree QA status rows
appended to this same table. The earlier `orch-018-right-palette-branch-pulse-20260619-003339`
folder was empty; the later blocker folder is classified below. The earlier ORCH-020 folders
`orch-020-right-palette-features-pulse-orchestrator-20260619-003944-135` and
`orch-020-right-palette-features-pulse-orchestrator-20260619-004216-233` were
empty; the populated `...004446-228` folder is classified below. ORCH-021
`orch-021-runner-right-palette-features-pulse-20260619-004936-567` is the
post-live runner packet classified below. ORCH-023
`orch-023-features-city-subcategory-pulse-20260619-005430-720` is the
post-live Features -> City subcategory packet classified below. ORCH-024
`orch-024-livepilot-groups-root-pulse-20260619-005851-546`, ORCH-025
`orch-025-orchestrator-terrain-root-pulse-20260619-005950-690`, ORCH-026d
`orch-026d-groups-city-sequence-pulse-20260619-010500-251`, and ORCH-027
`orch-027-terrain-road-sequence-pulse-20260619-010528-600` are classified
below. ORCH-028
`orch-028-livepilot-groups-building-sequence-pulse-20260619-010638-599`, ORCH-029
`orch-029-livepilot-groups-water-sequence-pulse-20260619-010809-495`, ORCH-030
`orch-030-cleanup-terrain-selection-rebaseline-20260619-010853-547`, ORCH-031
`orch-031-groups-cliff-sequence-pulse-20260619-011124-456`, and ORCH-032
`orch-032-groups-water-corrected-probe-20260619-011303-285` are also classified
below. ORCH-029 is blocked/superseded by ORCH-032; ORCH-031 is corrected to
`Groups` -> `Grass` despite the folder/raw point label naming Cliff. ORCH-035b
`orch-035b-left-tree-passive-area-inventory-20260619-012051-547` and ORCH-036
`orch-036-left-tree-placeables-category-pulse-20260619-012236-227` are also
classified below.

| ORCH folder | Verdict | Reason | Proof file | Summary booleans | What to do next |
| --- | --- | --- | --- | --- | --- |
| `orch-001a-module-load-20260618-232349` | rejected | Context-only stub. It names task/module, but has no screenshot, no action summary, and no result state. | `module-load-context.txt` | `summary.json=missing` | Do not cite as evidence. Use only as provenance that a module-load attempt was planned. |
| `orch-001a-module-load-local-20260618-232907-848` | rejected | Empty folder. No proof file exists. | none | `summary.json=missing` | Discard from promoted evidence tables. |
| `orch-001a-module-load-local-20260618-232921-544` | partial | Captures the Open dialog/list precondition, but not module selection or load. This attempt has no selected frame, no after-load frame, and no summary; the list dump in this folder is not a clean decoded module-list proof. | `02-open-dialog-before-selection.png`; `02-open-dialog-children.json`; `02-open-dialog-list-items.json` | `summary.json=missing` | Cite only for "Open dialog exists" if needed. Use `orch-001a-module-load-local-20260618-233026-239` for decoded list/selection details. |
| `orch-001a-module-load-local-20260618-233026-239` | partial | Proves module list selection at index `28`, selected text `the_last_city [U+2014] codex`, title change to the module, and responsive Toolset. It does not prove clean module-load success because the final frame/top windows include a visible `Error` modal saying the specified file could not be found. | `summary.json`; `03-open-dialog-selected-module.png`; `04-after-module-load.png` | `loaded=true`; `responding=true`; `visibleErrorModal=true` (derived from `topWindows`) | Downgrade any clean-success wording. Root-cause or clear the `Error` modal, then recapture a clean final state before promoting module-load success. |
| `orch-001c-fog-toggle-local-20260618-233902-054` | rejected | Fog toggle attempt produced no visible or menu-state delta. Before, after, and final hashes are identical and all states remain `0x10B`. | `summary.json`; `01-before-fog.png`; `02-after-fog-toggle.png`; `03-after-fog-rollback.png` | `responding=true`; `hung=false`; `afterDiffers=false`; `finalMatchesBefore=true`; `stateBefore=0x10B`; `stateAfter=0x10B`; `stateFinal=0x10B` | Do not use for fog proof. Supersede with `orch-002-fog-toggle-open-area-20260618-234404-079`, or recapture with an open-area precondition and visible/menu delta. |
| `orch-001d-areas-expand-local-20260618-233949-755` | accepted | Accepted narrowly for Areas tree expansion. The TreeView target is recorded, the before/after hashes differ, the module title remains present, and Toolset responds. It does not prove opening/rendering an area. | `summary.json`; `01-before-areas-collapsed.png`; `02-after-areas-expand-click.png` | `responding=true`; `hashChanged=true` (derived from `hashBefore != hashAfter`) | Promote only as targeted Areas tree expansion evidence. Pair with a separate open-area proof for render claims. |
| `orch-001e-ikea-open-local-20260618-234030-576` | partial | Usable as failed-attempt/blocker evidence only. The frame changed after the targeted tree action, but `responding=false`, and `03-final-after-load-wait.png` is a `1x1` invalid capture, so it cannot prove an area opened. | `summary.json`; `02-after-ikea-doubleclick.png`; `03-final-after-load-wait.png` | `responding=false`; `hashChanged=true` (derived); `finalCaptureInvalid=true` (image-derived `1x1`) | Do not promote for `_ikea` open. Recapture with responsive final state, a real full-size screenshot, and visible target area/resource. |
| `orch-001f-ikea-enter-local-20260618-234201-276` | accepted | Accepted only as a narrow open-area render/status proof for the visible `_winds_houses` context. The folder name overclaims `_ikea`; the usable evidence is the visible open tab/canvas and responsive Toolset after Enter. | `summary.json`; `01-before-ikea-enter.png`; `02-after-ikea-enter.png` | `responding=true`; `hashChanged=true` (derived); `labelMismatch=true` (folder says `_ikea`, visible evidence says `_winds_houses`) | Rename/cite as `_winds_houses` evidence, or recapture a real `_ikea` open. Do not use this row as `_ikea` proof. |
| `orch-002-fog-toggle-open-area-20260618-234404-079` | accepted | Strongest ORCH toggle proof in this batch. It uses targeted `WM_COMMAND 106`, both commands report sent, after differs from before, final matches before, and Toolset responds. | `summary.json`; `01-before-fog-toggle.png`; `02-after-fog-toggle.png`; `03-after-fog-rollback.png` | `command1.sent=true`; `command2.sent=true`; `responding=true`; `afterDiffers=true`; `finalMatchesBefore=true` | Promote for targeted Fog command plus before/after/rollback on an already open area. If visual fog appearance matters, add a cropped/region diff because the visible effect is subtle. |
| `orch-003-placeables-tree-pulse-20260618-234649-743` | partial | Targeted TreeView expand/collapse messages were sent and the first action changed the frame, but rollback failed inside this folder: final hash equals after, not before. | `summary.json`; `01-before-placeables-pulse.png`; `02-after-placeables-expand.png`; `03-after-placeables-collapse.png` | `clickExpand.down=true`; `clickExpand.up=true`; `clickCollapse.down=true`; `clickCollapse.up=true`; `responding=true`; `afterDiffers=true`; `finalMatchesBefore=false` | Cite only as partial Placeables tree pulse evidence. Use `orch-003b-*` as the separate cleanup proof, or recapture a single clean before/after/rollback packet. |
| `orch-003b-placeables-collapse-cleanup-20260618-234754-819` | accepted | Accepted narrowly as follow-up Placeables collapse cleanup. It uses targeted TreeView `WM_LBUTTONDOWN/UP`, before/after differ, and Toolset responds. | `summary.json`; `01-before-cleanup-collapse.png`; `02-after-cleanup-collapse.png` | `click.down=true`; `click.up=true`; `responding=true`; `afterDiffers=true` | Promote only as cleanup/collapse evidence. Do not merge it into `orch-003` as if the original folder had a clean rollback. |
| `orch-004b-passive-status-20260618-235408` | rejected | Empty passive-status folder. No screenshot and no summary. | none | `summary.json=missing` | Discard from promoted evidence. Use the later populated `orch-004b-orchestrator-passive-status-20260618-235455-772` folder. |
| `orch-004b-orchestrator-passive-status-20260618-235455-772` | accepted | Accepted as passive status and modal-blocker evidence. It passively enumerates windows, captures the current Toolset frame, records `Old File Format` as a visible `#32770` modal, and reports Toolset responding. It is not a clean-state proof. | `summary.json`; `01-current-window.png` | `responding=true`; `visibleWindows=3`; `oldFileFormatModal=true` (derived from `windows`); `inputUsed=false` (from method) | Treat `Old File Format` as a hard live-pilot blocker until separately cleared. Do not route interactive lanes through this state. |
| `orch-004c-old-file-format-cleanup-20260618-235605-358` | rejected | Rejected for cleanup success. The targeted `WM_COMMAND IDOK` send happened, but `modalStillPresent=true`, and the after state still includes `Old File Format`; this is failed-cleanup/blocker evidence, not modal-cleared evidence. | `summary.json`; `01-old-file-format-modal-before.png`; `02-after-modal-cleanup-main-window.png` | `sendResult.sent=true`; `responding=true`; `modalStillPresent=true` | Do not claim the modal was cleared. Next attempt should target the dialog child button or another verified control path, then re-enumerate until the modal is absent. |
| `orch-011-fog-post-baseline-20260619-001109` | incomplete | Empty post-baseline Fog folder. It has no screenshots, no summary, and no proof file; earlier sibling `orch-011-fog-post-baseline-20260619-001019` is also empty. | none | `summary.json=missing`; `screenshots=missing` | Do not cite or promote. Use ORCH-011B only as the later partial proof packet. |
| `orch-011b-fog-post-baseline-orchestrator-20260619-001201-138` | partial | Targeted `WM_COMMAND 106` Fog command and second `106` rollback were sent and before/after/rollback PNGs exist. The after frame differs, Toolset responds, and no modal remains after the attempt, but rollback did not match the starting frame, so this is not canonical rollback evidence. | `summary.json`; `01-before-fog.png`; `02-after-fog.png`; `03-after-rollback.png` | `command1.sent=true`; `command2.sent=true`; `afterDiffers=true`; `rollbackMatchesBefore=false`; `modalCountAfter=0`; `responding=true` | Cite only as partial post-baseline Fog delta evidence with clean modal state. Do not promote as canonical rollback. |
| `orch-012-canvas-region-proof-20260619-001330-569` | accepted | Accepted narrowly for `_winds_houses` canvas proof. The folder contains a passive full-window screenshot, a derived central canvas crop, a right-palette crop, and child-window inventory showing `TTabSheet _winds_houses`, `TfrmViewerArea - _winds_houses`, a visible canvas `TScrollBox` `1291x807`, and a lower viewer/control `TScrollBox` `1291x40`. It does not prove `_ikea`; the visible area context is `_winds_houses`. | `summary.json`; `01-full-window.png`; `02-derived-canvas-region.png`; `03-right-palette-region.png` | `responding=true`; `modalCount=0`; `childWindowCount=89`; `inferredAreaTab=_winds_houses`; `canvasRegion=1290x807`; `rightPaletteCropPresent=true` | Promote only as `_winds_houses` canvas-region/palette-context proof. Keep any `_ikea` canvas claim blocked until a fresh `_ikea` packet has matching visible tab, viewer, crop, and summary evidence. |
| `orch-013-right-palette-inventory-20260619-001521` | partial | Accepted narrowly for the visual screenshot claim: `02-right-palette.png` visibly shows the collapsed right-palette labels `Features`, `Groups`, and `Terrain`, and the full-window PNG plus right-side `TTreeView` provenance anchor the crop. Machine inventory remains partial/contradictory because the inventory/summary trail contains modal-count inconsistency and recorded `inferred.Terrain=false`, `inferred.Groups=false`, `inferred.Features=false` against the visible PNG; it does not prove parsed labels or item inventory. | `summary.json`; `01-full-window.png`; `02-right-palette.png` | `image.Features=true`; `image.Groups=true`; `image.Terrain=true`; `rightPalette.detectedAsTreeView=true`; `machineInventory=partial/contradictory`; `inferred.*=false recorded`; `modalCount=inconsistent` | Cite only as visual right-palette label screenshot plus region/control provenance. Recapture or parse labels/items and reconcile modal/inferred summary fields before accepting machine inventory claims. |
| `orch-014-left-area-tree-proof-20260619-001834` | accepted | Accepted narrowly for left Areas tree state proof. The folder contains a passive full-window screenshot, a left tree crop, and summary/child-inventory provenance showing a visible left `TTreeView` with `hwnd=721744` and rect `-1919,74,-1632,951` (`287x877`). The summary reports a responsive Toolset and no modals. It does not prove parsed area-list item labels, selected items, `_ikea`, or open-area rendering. | `summary.json`; `01-full-window.png`; `02-left-tree.png` | `status=ok`; `responding=true`; `modalCount=0`; `leftTTreeView.exists=true`; `leftTTreeView.visible=true`; `leftTTreeView.hwnd=721744`; `leftTTreeView.rect=-1919,74,-1632,951`; `areaListVisibleItems=0`; `inputSent=false` | Cite only as left Areas tree state/control provenance. Do not promote it as parsed area-list, `_ikea`, area-open, command, rollback, or mutation evidence. |
| `orch-015-bottom-status-proof-20260619-002101` | accepted | Accepted narrowly for passive bottom/status-region visibility. The folder contains a full-window PNG and a bottom/status-region crop; `summary.json` reports a responsive Toolset, no modals, root title on `the_last_city ... codex.mod`, a visible `TStatusBar` `1920x19`, a visible `TMemo` `1920x58`, and a `bottomStatusRegion` crop `1920x258`. The PNGs visibly anchor the lower control/status strip while `_winds_houses` remains the open area context. It does not prove parsed status text, a command, `_ikea`, area-open, or mutation. | `summary.json`; `01-full-window.png`; `02-bottom-status-region.png` | `responding=true`; `modalCount=0`; `TStatusBar.visible=true`; `TMemo.visible=true`; `bottomStatusRegion=1920x258`; `fullWindow=1920x1032` | Cite only as passive bottom/status-region visibility/provenance. Do not promote it as parsed status text, `_ikea`, area-open, command, rollback, or mutation evidence. |
| `orch-017-health-tick-20260619-002529` | incomplete | Empty ORCH-017 health-tick folder. It contains no PNG, no summary, and no proof file, so it cannot support any health/status claim. | none | `summary.json=missing`; `screenshots=missing`; `proofFiles=missing` | Do not cite or promote. Recapture a populated proof packet before using ORCH-017 as evidence. |
| `orch-017-health-tick-20260619-002612` | incomplete | Empty ORCH-017 health-tick folder. It contains no PNG, no summary, and no proof file, so it cannot support any health/status claim. | none | `summary.json=missing`; `screenshots=missing`; `proofFiles=missing` | Do not cite or promote. Recapture a populated proof packet before using ORCH-017 as evidence. |
| `orch-018-right-palette-branch-pulse-blocker-20260619-003425` | blocked | Blocker evidence only. The folder contains passive before-state evidence and `summary.json` reports `status=blocked_interrupted_no_pulse`; the orchestrator was interrupted before a verified safe pulse/rollback, so no right-palette branch pulse occurred. | `summary.json`; `01-before-full.png` | `status=blocked_interrupted_no_pulse`; `responding=true`; `modalCount=0`; `hwnd=395484`; `files=01-before-full.png`; `hardRule=no global mouse/no SendKeys/no SetCursorPos/no pulse after interrupt` | Cite only as an ORCH-018 no-pulse blocker. Do not promote as palette pulse, branch expansion/collapse, rollback, command, mutation, or item/label inventory evidence. |
| `orch-020-right-palette-features-pulse-orchestrator-20260619-003944-135` | incomplete | Empty ORCH-020 right-palette Features pulse folder. It contains no PNG, no summary, and no proof file, so it cannot support a pulse, rollback, or no-mutation claim. | none | `summary.json=missing`; `screenshots=missing`; `proofFiles=missing` | Do not cite or promote. Use the populated `...004446-228` folder for ORCH-020 evidence. |
| `orch-020-right-palette-features-pulse-orchestrator-20260619-004216-233` | incomplete | Empty ORCH-020 right-palette Features pulse folder. It contains no PNG, no summary, and no proof file, so it cannot support a pulse, rollback, or no-mutation claim. | none | `summary.json=missing`; `screenshots=missing`; `proofFiles=missing` | Do not cite or promote. Use the populated `...004446-228` folder for ORCH-020 evidence. |
| `orch-020-right-palette-features-pulse-orchestrator-20260619-004446-228` | partial | Accepted narrowly for right-palette `Features` branch pulse and visual rollback: targeted `WM_LBUTTONDOWN/UP` pulse and rollback were both sent to the visible right `TTreeView`, the after-pulse palette differs from before, Toolset responds, and no modal remains after the attempt. It is partial/not canonical for hash rollback because `rollbackMatchesBefore=false`; the rollback palette hash did not match the starting crop. | `summary.json`; `01-before-full.png`; `02-before-right-palette.png`; `03-after-features-pulse.png`; `04-after-features-rollback.png`; `05-after-rollback-full.png` | `clickPulse.down=true`; `clickPulse.up=true`; `clickRollback.down=true`; `clickRollback.up=true`; `afterDiffers=true`; `rollbackMatchesBefore=false`; `modalCountAfter=0`; `responding=true`; `mutation=false`; `save=false`; `canvasInput=false` | Cite as accepted right-palette `Features` branch pulse plus visual rollback/no-mutation evidence. Do not promote as canonical hash rollback, saved state, canvas input, item inventory, or parsed label inventory evidence. |
| `orch-021-runner-right-palette-features-pulse-20260619-004936-567` | accepted canonical | Accepted canonical for the right-palette `Features` branch pulse rollback. The runner packet contains five PNGs plus `summary.json`; targeted `WM_LBUTTONDOWN/UP` pulse and rollback were both sent to the visible right `TTreeView`, the after-pulse palette differs from before, `Features` is expanded in the after-pulse screenshot, Toolset responds, no modal remains after the attempt, and the rollback palette hash matches the starting palette hash. | `summary.json`; `01-before-full.png`; `02-before-right-palette.png`; `03-after-features-pulse.png`; `04-after-features-rollback.png`; `05-after-rollback-full.png` | `clickPulse.down=true`; `clickPulse.up=true`; `clickRollback.down=true`; `clickRollback.up=true`; `afterDiffers=true`; `rollbackMatchesBefore=true`; `modalCountAfter=0`; `responding=true`; `mutation=false`; `save=false`; `canvasInput=false` | Promote as canonical evidence for right-palette `Features` branch pulse rollback only. Do not promote as save, canvas input, mutation, item inventory, parsed label inventory, or open-area/render evidence. |
| `orch-023-features-city-subcategory-pulse-20260619-005430-720` | accepted canonical | Accepted canonical for safe right-palette `Features` -> `City` expansion/rollback. The packet contains four nonempty PNGs plus `summary.json`; targeted right `TTreeView` pulses expand `Features`, then expand or select `City`, and rollback returns the palette hash to the starting state while Toolset remains responsive and no modal appears. This is no-mutation palette-state evidence only, not paint, preview, save, or canvas mutation evidence. | `summary.json`; `01-before-collapsed-palette.png`; `02-features-expanded.png`; `03-city-expanded-or-selected.png`; `04-rollback-collapsed.png` | `afterFeaturesDiffers=true`; `cityDiffers=true`; `rollbackMatchesBefore=true`; `modalCount=0`; `responding=true`; `mutation=false`; `save=false`; `canvasInput=false` | Promote as canonical evidence for safe right-palette `Features` -> `City` expansion/rollback only. Do not promote as paint, preview, canvas mutation, save, item placement, item inventory, or parsed label inventory evidence. |
| `orch-024-livepilot-groups-root-pulse-20260619-005851-546` | accepted canonical | Accepted canonical for safe right-palette `Groups` root pulse and rollback. The packet contains five nonempty PNGs plus `summary.json`; targeted right `TTreeView` pulse/rollback was completed, the after-pulse palette differs from before, Toolset responds, no modal remains after the attempt, and the rollback palette hash matches the starting palette hash. This is no-mutation palette-state evidence only. | `summary.json`; `01-before-full.png`; `02-before-right-palette.png`; `03-after-features-pulse.png`; `04-after-features-rollback.png`; `05-after-rollback-full.png` | `status=completed`; `afterDiffers=true`; `rollbackMatchesBefore=true`; `modalCountAfter=0`; `responding=true`; `mutation=false`; `save=false`; `canvasInput=false` | Promote as canonical evidence for safe right-palette `Groups` root pulse rollback only. Do not promote as save, canvas input, mutation, item placement, item inventory, parsed label inventory, or open-area/render evidence. |
| `orch-025-orchestrator-terrain-root-pulse-20260619-005950-690` | accepted canonical | Accepted canonical for safe right-palette `Terrain` root pulse and rollback. The packet contains five nonempty PNGs plus `summary.json`; targeted right `TTreeView` pulse/rollback was completed, the after-pulse palette differs from before, Toolset responds, no modal remains after the attempt, and the rollback palette hash matches the starting palette hash. The screenshot-visible Terrain children include `Bridge`, `Building`, `Castle`, `Chasm`, `Cobble`, `Grass`, `Road`, `Wall`, `Water`, and related entries. This is no-mutation palette-state evidence only. | `summary.json`; `01-before-full.png`; `02-before-right-palette.png`; `03-after-features-pulse.png`; `04-after-features-rollback.png`; `05-after-rollback-full.png` | `status=completed`; `afterDiffers=true`; `rollbackMatchesBefore=true`; `modalCountAfter=0`; `responding=true`; `mutation=false`; `save=false`; `canvasInput=false` | Promote as canonical evidence for safe right-palette `Terrain` root pulse rollback and visible root-child screenshot only. Do not promote as Road subcategory expansion, save, canvas input, mutation, item placement, parsed inventory, or open-area/render evidence. |
| `orch-026d-groups-city-sequence-pulse-20260619-010500-251` | accepted canonical | Accepted canonical for the safe sequence runner `Groups` -> `City` expansion and rollback. The packet contains four nonempty PNGs plus `summary.json`; targeted right `TTreeView` pulses expand `Groups`, then expand/select `City`, and reverse-order rollback returns the palette hash to the starting state while Toolset remains responsive and no modal appears. The city screenshot-visible group sets include `Arena`, `City Gate`, `Gatehouse`, `House`, `Inn`, `Plaza`, `Pub`, `Tower Gate`, and related entries. This is no-mutation palette-state evidence only. | `summary.json`; `before.png`; `after-groups.png`; `after-city.png`; `rollback-final.png` | `status=completed`; `afterAnyDiffers=true`; `rollbackMatchesBefore=true`; `modalCountAfter=0`; `responding=true`; `mutation=false`; `save=false`; `canvasInput=false` | Promote as canonical evidence for safe right-palette `Groups` -> `City` sequence expansion/rollback only. Do not promote as save, canvas input, mutation, item placement, parsed inventory, or open-area/render evidence. |
| `orch-027-terrain-road-sequence-pulse-20260619-010528-600` | partial | Accepted only for Terrain root expansion and rollback. The packet contains four nonempty PNGs plus `summary.json`; targeted right `TTreeView` pulses were completed and rollback returns the palette hash to the starting state, but the second point `Road` did not create further visible expansion because `after-road.png` has the same hash as `after-terrain.png`. This is canonical for Terrain root expansion/rollback only, not for Road subchildren. | `summary.json`; `before.png`; `after-terrain.png`; `after-road.png`; `rollback-final.png` | `status=completed`; `afterAnyDiffers=true`; `rollbackMatchesBefore=true`; `modalCountAfter=0`; `responding=true`; `mutation=false`; `save=false`; `canvasInput=false`; `afterRoadHash=afterTerrainHash` | Cite as canonical Terrain root expansion/rollback evidence only. Do not promote as Road subcategory expansion, Road subchildren, item placement, save, canvas input, mutation, parsed inventory, or open-area/render evidence. |
| `orch-028-livepilot-groups-building-sequence-pulse-20260619-010638-599` | accepted canonical | Accepted canonical for the corrected safe sequence `Groups` -> `Building` expansion and rollback. The packet contains four nonempty PNGs plus `summary.json`; targeted right `TTreeView` pulses expand `Groups`, then expand/select `Building`, and reverse-order rollback returns the palette hash to the starting state while Toolset remains responsive and no modal appears. The Building screenshot-visible group sets include `Bathhouse`, `bridges`, `estates`, `Guild house`, `Hospital`, `Pub`, `River bridge`, `Small square`, `Street slope`, and `Townhall`. This is no-mutation palette-state evidence only. | `summary.json`; `before.png`; `after-groups.png`; `after-building.png`; `rollback-final.png` | `status=completed`; `afterAnyDiffers=true`; `rollbackMatchesBefore=true`; `modalCountAfter=0`; `responding=true`; `mutation=false`; `save=false`; `canvasInput=false` | Promote as canonical evidence for safe right-palette `Groups` -> `Building` sequence expansion/rollback only. Do not promote as save, canvas input, mutation, item placement, parsed inventory, or open-area/render evidence. |
| `orch-029-livepilot-groups-water-sequence-pulse-20260619-010809-495` | blocked/superseded | Not accepted for `Groups` -> `Water`. The intended Water target missed and left a Terrain selection, and rollback did not match before. This folder is superseded by the corrected ORCH-032 Water packet. | `summary.json`; `before.png`; `after-groups.png`; `after-water.png`; `rollback-final.png` | `status=completed`; `afterAnyDiffers=true`; `rollbackMatchesBefore=false`; `modalCountAfter=0`; `responding=true`; `mutation=false`; `save=false`; `canvasInput=false`; `intendedWaterMissed=true`; `leftTerrainSelection=true` | Do not promote as Water evidence or canonical rollback. Keep only as blocked/superseded provenance for the missed Water attempt; use ORCH-032 for the corrected Water claim. |
| `orch-030-cleanup-terrain-selection-rebaseline-20260619-010853-547` | accepted | Accepted only as cleanup/rebaseline safe pulse and rollback relative to the already selected-Terrain baseline. The pulse and rollback match that starting palette state and leave Toolset responsive with no modal, no save, no canvas input, and no mutation. It is not clean no-selection baseline evidence. | `summary.json`; `01-before-full.png`; `02-before-right-palette.png`; `03-after-features-pulse.png`; `04-after-features-rollback.png`; `05-after-rollback-full.png` | `status=completed`; `afterDiffers=true`; `rollbackMatchesBefore=true`; `modalCountAfter=0`; `responding=true`; `mutation=false`; `save=false`; `canvasInput=false`; `baseline=selected-Terrain` | Cite only as selected-Terrain-baseline cleanup/rebaseline evidence. Do not promote as a clean no-selection baseline, item inventory, parsed label inventory, save, canvas input, mutation, or open-area/render evidence. |
| `orch-031-groups-cliff-sequence-pulse-20260619-011124-456` | accepted canonical | Accepted canonical only as corrected `Groups` -> `Grass`, not Cliff. The folder/raw point label says `cliff`, but the screenshot-visible sets correspond to Grass and show gates/drawbridge/tower-gate sets. Targeted right `TTreeView` pulses and reverse-order rollback completed, the after state differs, the rollback matches the starting palette hash, Toolset remains responsive, and no modal appears. This is no-mutation palette-state evidence only. | `summary.json`; `before.png`; `after-groups.png`; `after-cliff.png`; `rollback-final.png` | `status=completed`; `afterAnyDiffers=true`; `rollbackMatchesBefore=true`; `modalCountAfter=0`; `responding=true`; `save=false`; `canvasInput=false`; `mutation=false`; `correctedClaim=Groups->Grass`; `notCliff=true` | Promote as canonical evidence for safe right-palette `Groups` -> `Grass` sequence expansion/rollback only. Do not promote as Cliff evidence, save, canvas input, mutation, item placement, parsed inventory, or open-area/render evidence. |
| `orch-032-groups-water-corrected-probe-20260619-011303-285` | accepted canonical | Accepted canonical for corrected `Groups` -> `Water` expansion and rollback, superseding ORCH-029. The packet contains four nonempty PNGs plus `summary.json`; targeted right `TTreeView` pulses expand `Groups`, then expand/select the corrected Water probe, and reverse-order rollback returns the palette hash to the starting state while Toolset remains responsive and no modal appears. The Water screenshot-visible group sets include `bridge-to-drawbridge`, `docks`, `boats/ships`, `harbour crane`, and `lighthouse`. This is no-mutation palette-state evidence only. | `summary.json`; `before.png`; `after-groups.png`; `after-water-probe.png`; `rollback-final.png` | `status=completed`; `afterAnyDiffers=true`; `rollbackMatchesBefore=true`; `modalCountAfter=0`; `responding=true`; `mutation=false`; `save=false`; `canvasInput=false`; `supersedes=ORCH-029` | Promote as canonical evidence for safe right-palette corrected `Groups` -> `Water` sequence expansion/rollback only. Do not promote ORCH-029 for Water, and do not promote this row as save, canvas input, mutation, item placement, parsed inventory, or open-area/render evidence. |
| `orch-035b-left-tree-passive-area-inventory-20260619-012051-547` | accepted/passive | Accepted only for passive left area tree inventory. The packet contains a full-window PNG, left-tree crop, and `summary.json` showing a responsive Toolset with no modals, visible left `TTreeView` `hwnd=721744`, current `_winds_houses`, visible categories `Placeables`, `Sounds`, `Triggers`, and `Waypoints`, and a visible area list. It is not navigation, click, command, rollback, mutation, save, or canvas-input proof. | `summary.json`; `01-full-window.png`; `02-left-tree.png` | `status=completed`; `modalCount=0`; `responding=true`; `mutation=false`; `save=false`; `canvasInput=false`; `leftTTreeView.hwnd=721744`; `currentArea=_winds_houses`; `categories=Placeables/Sounds/Triggers/Waypoints`; `visibleAreaList=true` | Cite only as passive left area tree inventory for the current `_winds_houses` context. Do not promote as navigation, click, area-open, command, rollback, mutation, save, canvas input, or render evidence. |
| `orch-036-left-tree-placeables-category-pulse-20260619-012236-227` | accepted canonical | Accepted canonical for safe left-tree current-area `Placeables` category pulse/rollback. The packet contains five nonempty PNGs plus `summary.json`; the after screenshot shows `Placeables` expanded, rollback returns to the collapsed before state, Toolset remains responsive, no modal appears, and the packet records no mutation, save, or canvas input. This is no-mutation left-tree category-state evidence only. | `summary.json`; `01-before-full.png`; `02-before-left-tree.png`; `03-after-left-tree-pulse.png`; `04-after-left-tree-rollback.png`; `05-after-rollback-full.png` | `status=completed`; `afterDiffers=true`; `rollbackMatchesBefore=true`; `modalCountAfter=0`; `responding=true`; `mutation=false`; `save=false`; `canvasInput=false`; `after=Placeables-expanded`; `rollback=collapsed` | Promote as canonical evidence for safe left-tree current-area `Placeables` category expansion/rollback only. Do not promote as navigation, area-open, item placement, canvas mutation, save, or render evidence. |

## Highest-risk overclaims

Worst overclaim to fix: `orch-001f-ikea-enter-local-20260618-234201-276`
must not be cited as `_ikea` evidence. The accepted claim is only that a visible
open-area Toolset context exists for `_winds_houses`; any `_ikea` claim needs a
fresh proof packet. ORCH-012 strengthens the `_winds_houses` canvas proof, but
does not change the `_ikea` blocker.

Secondary overclaim: `orch-001a-module-load-local-20260618-233026-239` must not
be described as clean module-load success while `04-after-module-load.png` and
`summary.json` show a visible `Error` modal. It is selection/title-change
evidence plus a blocker, not a clean final state.

Additional overclaim: `orch-011b-fog-post-baseline-orchestrator-20260619-001201-138`
must not be promoted as canonical rollback evidence because
`rollbackMatchesBefore=false`, even though `afterDiffers=true`,
`modalCountAfter=0`, and `responding=true`.

ORCH-013 overclaim guard: `orch-013-right-palette-inventory-20260619-001521`
may be cited as accepted visual screenshot evidence that `Features`, `Groups`,
and `Terrain` are visible in the right palette crop. It must not be promoted as
accepted machine inventory, parsed tree-label, or item inventory evidence until
the inferred-label and modal-count summary inconsistency is reconciled.

ORCH-014 overclaim guard: `orch-014-left-area-tree-proof-20260619-001834`
may be cited as accepted left Areas tree state evidence with full-window and
left-tree crop provenance. It must not be promoted as area-list inventory,
specific item-label, selected-item, `_ikea`, area-open, command, rollback, or
mutation evidence because the summary records `areaListInference=not inferable
from passive screenshot/child inventory in this run`.

ORCH-015 overclaim guard: `orch-015-bottom-status-proof-20260619-002101`
may be cited as accepted passive screenshot evidence that the bottom/status
region is visible. It must not be promoted as parsed status text, `_ikea`,
area-open, command, rollback, or mutation evidence.

ORCH-017 overclaim guard: both `orch-017-health-tick-20260619-002529` and
`orch-017-health-tick-20260619-002612` are incomplete/no-evidence folders. They
must not be cited for health, status, Toolset responsiveness, screenshot,
summary, or blocker claims until a populated proof packet exists.

ORCH-018 overclaim guard: `orch-018-right-palette-branch-pulse-blocker-20260619-003425`
is classified as `blocked`, with `status=blocked_interrupted_no_pulse`,
`responding=true`, and only `01-before-full.png` plus `summary.json`. It must
not be promoted as right-palette branch-pulse, expansion/collapse, rollback,
command, mutation, or item/label inventory evidence.

ORCH-020 overclaim guard:
`orch-020-right-palette-features-pulse-orchestrator-20260619-004446-228` may be
cited as accepted evidence for right-palette `Features` branch pulse, visual
rollback, and no mutation/save/canvas input. It must not be promoted as
canonical hash rollback because `rollbackMatchesBefore=false`, nor as parsed
right-palette label inventory or item inventory. The earlier
`orch-020-right-palette-features-pulse-orchestrator-20260619-003944-135` and
`orch-020-right-palette-features-pulse-orchestrator-20260619-004216-233`
folders are incomplete/no-evidence folders and must not be cited.

ORCH-021 canonical note:
`orch-021-runner-right-palette-features-pulse-20260619-004936-567` is accepted
canonical for right-palette `Features` branch pulse rollback because it has
five PNGs plus `summary.json`, `afterDiffers=true`,
`rollbackMatchesBefore=true`, `modalCountAfter=0`, `responding=true`, and
`mutation=false` / `save=false` / `canvasInput=false`. It must not be promoted
as save, canvas input, mutation, item inventory, parsed label inventory, or
open-area/render evidence.

ORCH-023 canonical note:
`orch-023-features-city-subcategory-pulse-20260619-005430-720` is accepted
canonical for safe right-palette `Features` -> `City` expansion/rollback
because it has four nonempty PNGs plus `summary.json`,
`afterFeaturesDiffers=true`, `cityDiffers=true`,
`rollbackMatchesBefore=true`, `modalCount=0`, `responding=true`, and
`mutation=false` / `save=false` / `canvasInput=false`. It must not be promoted
as paint, preview, canvas mutation, save, item placement, item inventory, or
parsed label inventory evidence.

ORCH-024 canonical note:
`orch-024-livepilot-groups-root-pulse-20260619-005851-546` is accepted
canonical for safe right-palette `Groups` root pulse rollback because it has
five nonempty PNGs plus `summary.json`, `status=completed`,
`afterDiffers=true`, `rollbackMatchesBefore=true`, `modalCountAfter=0`,
`responding=true`, and `mutation=false` / `save=false` /
`canvasInput=false`. It must not be promoted as save, canvas input, mutation,
item placement, item inventory, parsed label inventory, or open-area/render
evidence.

ORCH-025 canonical note:
`orch-025-orchestrator-terrain-root-pulse-20260619-005950-690` is accepted
canonical for safe right-palette `Terrain` root pulse rollback because it has
five nonempty PNGs plus `summary.json`, `status=completed`,
`afterDiffers=true`, `rollbackMatchesBefore=true`, `modalCountAfter=0`,
`responding=true`, and `mutation=false` / `save=false` /
`canvasInput=false`. The visible claim is limited to Terrain root children
such as `Bridge`, `Building`, `Castle`, `Chasm`, `Cobble`, `Grass`, `Road`,
`Wall`, and `Water`; it must not be promoted as Road subcategory expansion or
Road subchildren evidence.

ORCH-026d canonical note:
`orch-026d-groups-city-sequence-pulse-20260619-010500-251` is accepted
canonical for safe right-palette `Groups` -> `City` sequence expansion and
rollback because it has four nonempty PNGs plus `summary.json`,
`status=completed`, `afterAnyDiffers=true`, `rollbackMatchesBefore=true`,
`modalCountAfter=0`, `responding=true`, and `mutation=false` / `save=false` /
`canvasInput=false`. The visible claim is limited to the City group-set
screenshot; it must not be promoted as save, canvas input, mutation, item
placement, parsed inventory, or open-area/render evidence.

ORCH-027 partial/canonical guard:
`orch-027-terrain-road-sequence-pulse-20260619-010528-600` is canonical only
for Terrain root expansion and rollback. It has four nonempty PNGs plus
`summary.json`, `status=completed`, `afterAnyDiffers=true`,
`rollbackMatchesBefore=true`, `modalCountAfter=0`, `responding=true`, and
`mutation=false` / `save=false` / `canvasInput=false`, but `after-road.png`
and `after-terrain.png` share the same hash. It must not be promoted as Road
subcategory expansion or Road subchildren evidence.

ORCH-028 canonical note:
`orch-028-livepilot-groups-building-sequence-pulse-20260619-010638-599` is
accepted canonical for safe right-palette `Groups` -> `Building` sequence
expansion and rollback because it has four nonempty PNGs plus `summary.json`,
`status=completed`, `afterAnyDiffers=true`, `rollbackMatchesBefore=true`,
`modalCountAfter=0`, `responding=true`, and `mutation=false` / `save=false` /
`canvasInput=false`. The visible claim is limited to the Building group-set
screenshot with entries including `Bathhouse`, `bridges`, `estates`,
`Guild house`, `Hospital`, `Pub`, `River bridge`, `Small square`,
`Street slope`, and `Townhall`.

ORCH-029 blocked/superseded guard:
`orch-029-livepilot-groups-water-sequence-pulse-20260619-010809-495` is not
accepted for `Groups` -> `Water`. The intended Water target missed, left a
Terrain selection, and has `rollbackMatchesBefore=false`; use the corrected
ORCH-032 packet for Water evidence instead.

ORCH-030 cleanup/rebaseline guard:
`orch-030-cleanup-terrain-selection-rebaseline-20260619-010853-547` is accepted
only as safe pulse/rollback relative to the selected-Terrain baseline. It must
not be promoted as a clean no-selection baseline.

ORCH-031 corrected canonical note:
`orch-031-groups-cliff-sequence-pulse-20260619-011124-456` is accepted
canonical as corrected `Groups` -> `Grass`, not Cliff, because it has four
nonempty PNGs plus `summary.json`, `status=completed`, `afterAnyDiffers=true`,
`rollbackMatchesBefore=true`, `modalCountAfter=0`, `responding=true`, and
`mutation=false` / `save=false` / `canvasInput=false`. The visible screenshot
claim is limited to Grass group-set entries such as gates, drawbridge, and
tower-gate sets.

ORCH-032 corrected canonical note:
`orch-032-groups-water-corrected-probe-20260619-011303-285` is accepted
canonical for corrected `Groups` -> `Water` sequence expansion and rollback,
and supersedes ORCH-029. It has four nonempty PNGs plus `summary.json`,
`status=completed`, `afterAnyDiffers=true`, `rollbackMatchesBefore=true`,
`modalCountAfter=0`, `responding=true`, and `mutation=false` / `save=false` /
`canvasInput=false`. The visible screenshot claim is limited to Water group-set
entries including bridge-to-drawbridge, docks, boats/ships, harbour crane, and
lighthouse.

ORCH-035b passive inventory guard:
`orch-035b-left-tree-passive-area-inventory-20260619-012051-547` is accepted
only for passive left area tree inventory. It has `summary.json`,
`01-full-window.png`, `02-left-tree.png`, `status=completed`, `modalCount=0`,
`responding=true`, and `mutation=false` / `save=false` /
`canvasInput=false`. The visible claim is limited to left `TTreeView`
`hwnd=721744`, current `_winds_houses`, visible `Placeables`, `Sounds`,
`Triggers`, `Waypoints`, and the visible area list. It must not be promoted as
navigation, click, command, rollback, mutation, save, canvas input, or render
evidence.

ORCH-036 canonical note:
`orch-036-left-tree-placeables-category-pulse-20260619-012236-227` is accepted
canonical for safe left-tree current-area `Placeables` category pulse/rollback.
It has five nonempty PNGs plus `summary.json`, `status=completed`,
`afterDiffers=true`, `rollbackMatchesBefore=true`, `modalCountAfter=0`,
`responding=true`, and `mutation=false` / `save=false` /
`canvasInput=false`. The screenshot claim is limited to `Placeables` expanded
after the pulse and collapsed again after rollback. It must not be promoted as
navigation, area-open, item placement, canvas mutation, save, or render
evidence.
