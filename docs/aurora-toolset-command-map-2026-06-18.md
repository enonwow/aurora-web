# Aurora Toolset command map

Date: 2026-06-18
Role: COMMAND-MAP ANALYST 3/6
Scope: passive/local synthesis only. No Aurora launch, no window touch, no
global mouse, no global `SendKeys`.

## Source set

- `.codex-tmp/aurora-orchestrator/load-module.ps1`: local helper for module
  load wiring. Read-only source for this map; do not execute it during this
  analysis because it can start `nwtoolset.exe`.
- `docs/aurora-toolset-basic-ops-reproduced-2026-06-17.md`: live reproduced
  baseline for File Open, module list index `28`, `_ikea` TreeView selection,
  and viewport/camera controls.
- `docs/aurora-toolset-live-evidence-manifest-2026-06-18.md`: ORCH local
  appendix and evidence status rows.
- `docs/aurora-toolset-fog-toggle-findings-2026-06-18.md`: clean
  Environment/Fog before-after-rollback proof.
- `docs/aurora-toolset-area-properties-context-menu-targeting-refresh-2026-06-18.md`
  and related area/property docs: targeted `TTreeView` limits and gaps.
- `docs/aurora-toolset-terrain-palette-findings-2026-06-18.md` plus
  `docs/aurora-toolset-live-evidence-manifest-2026-06-18.md`: targeted right
  palette/tree pulses and recovery caveats.

Status vocabulary:

- `proven`: local live evidence confirms the procedure/result.
- `partial`: some local evidence exists, but it is not enough to promote the
  whole procedure to reliable/safe-repeatable.
- `blocker`: local evidence shows the route is insufficient or needs a new
  experiment before use.

## Command map

## Hard launch rule

Start `nwtoolset.exe` without arguments. Do not pass a `.mod` path on the
command line and do not use `Start-Process ... -ArgumentList <module.mod>`.
That launch shape is unreliable on this machine and often produces an empty
Toolset window or an error state instead of a loaded module.

The only promoted module-load path is still `File > Open` via `WM_COMMAND 44`,
then selecting `the_last_city [U+2014 em dash] codex` inside
`TdlgModuleSelect`.

| ID | Command / technique | Status | Procedure | Evidence / notes |
| --- | --- | --- | --- | --- |
| CM-01 | File Open: `WM_COMMAND 44` to main `TfrmFrame` | `proven` | Locate visible main Toolset `TfrmFrame`, send targeted `SendMessageTimeout(..., WM_COMMAND=0x0111, wParam=44)`, then wait for `TdlgModuleSelect` titled `Open`. | `load-module.ps1` uses exactly this sequence. `aurora-toolset-basic-ops-reproduced-2026-06-17.md` confirms `File > Open` maps to `WM_COMMAND 44` and opens `TdlgModuleSelect`. |
| CM-02 | Module list selection: `the_last_city [U+2014 em dash] codex`, index `28` | `proven` | In `TdlgModuleSelect`, find child `TListBox`; enumerate with `LB_GETCOUNT=0x018B` and `LB_GETTEXT=0x0189`; select target with `LB_SETCURSEL=0x0186`, `wParam=28`; press dialog `Open` button by targeted `BM_CLICK=0x00F5`. | `load-module.ps1` enumerates the list and selects the text matching `the_last_city*codex*`. Basic ops records `TListBox count=39`, selected index `28`, text `the_last_city [U+2014 em dash] codex`. ORCH-001a records `selectedIndex=28`, `loaded=true`, and final title changed to `the_last_city - codex.mod`. |
| CM-03 | Cleanup real `Error` popup with targeted `WM_COMMAND IDOK` | `proven` for cleanup action, `partial` for root cause | If a top-level modal-like `#32770` titled `Error` appears after module load, close it with a targeted `WM_COMMAND IDOK` to the error dialog, not global input. Treat the popup itself as a cleanup artifact, not as failure of the preceding module-load if the title already changed and `loaded=true`. | Live evidence manifest ORCH-001a: final screenshot shows `Error` ("The specified file could not be found."); it was later cleaned up by targeted `WM_COMMAND IDOK`, not by global input. `summary.json` for ORCH-001a records top-level `#32770` title `Error`. The local docs do not yet map the exact missing-file cause. |
| CM-04 | Environment/Fog: `WM_COMMAND 106` to main `TfrmFrame` | `proven` | Precondition: an area canvas is open, no modals, start state of `Fog` known. Send targeted `SendMessageTimeout(..., WM_COMMAND=0x0111, wParam=106)` to main `TfrmFrame`, capture after state, then send the same command again to restore the start state. | Fog findings: menu state `0x100 -> 0x108 -> 0x100`. HB-011: after hash differs and rollback hash matches before. ORCH-002: targeted `SendMessageTimeout WM_COMMAND 106`, `afterDiffers=true`, `finalMatchesBefore=true`, `responding=true`. |
| CM-05 | Targeted `TTreeView` pulses: select/ensure/double-click, local key/mouse messages, direct tree popup | `partial`, with proven sub-atoms | Use direct handles to the intended `TTreeView`; do not rely on `WindowFromPoint` alone. Proven sub-atoms include `TVM_SELECTITEM` + `TVM_ENSUREVISIBLE` for `_ikea`, double-click on the item rect to open an area in the 2026-06-17 baseline, right-palette category expand/collapse pulses, and direct tree right-click to open an area context popup. | Basic ops: `_ikea` opened through `TTreeView` select/ensure/double-click. Live evidence: palette category expand/collapse is clean-final; selection-mode x70 recovers from Paint where `Esc`/`WM_COMMAND 74` were insufficient. Area context refresh: direct `TTreeView` selection of `enon_bakery` and popup open are reliable, but activating popup `Properties` without global mouse remains a gap. |

## Proven procedures

### 1. Open module dialog

1. Find visible top-level `TfrmFrame` whose title starts with `BioWare Aurora`.
2. Send targeted `WM_COMMAND 44`.
3. Wait for visible `TdlgModuleSelect` titled `Open`.

Status: `proven`.

### 2. Select `the_last_city [U+2014 em dash] codex` from module list

1. Enumerate `TdlgModuleSelect` children and choose `TListBox`.
2. Enumerate list entries.
3. Select index `28` / text `the_last_city [U+2014 em dash] codex`.
4. Click dialog `Open` via targeted `BM_CLICK` on the `TButton`.
5. Confirm the main title contains `the_last_city` and `codex.mod`.

Status: `proven`.

### 3. Clear post-load `Error` modal safely

1. Enumerate top-level windows for the Toolset process.
2. If a modal-like `#32770` titled `Error` is present, target that handle.
3. Send `WM_COMMAND IDOK`.
4. Re-enumerate windows to confirm the modal is gone.

Status: `proven` for closing the popup; `partial` for explaining why it
appeared.

### 4. Toggle and restore Fog

1. Confirm an area canvas is open and no modal is present.
2. Read or record the start state of `Environment -> Fog`.
3. Send targeted `WM_COMMAND 106` to `TfrmFrame`.
4. Capture/menu-check the toggled state.
5. Send `WM_COMMAND 106` again for rollback.
6. Confirm final state matches the starting state.

Status: `proven`.

### 5. Drive `TTreeView` without global input

1. Identify the exact `TTreeView` handle first.
2. For known items, prefer `TVM_SELECTITEM` and `TVM_ENSUREVISIBLE` when the
   item handle is known.
3. For visible rows, send local `WM_LBUTTONDOWN/UP`, `WM_RBUTTONDOWN/UP`,
   `WM_MOUSEWHEEL`, or local keyboard pulses directly to the `TTreeView`.
4. Confirm with screenshot/hash/menu state after each pulse.
5. Stop at `partial` if the popup opens but the target command cannot be
   activated through targeted messages.

Status: `partial` overall. Proven sub-atoms exist, but popup command activation
and some palette recovery paths remain context-sensitive.

## Validation notes

- Procedure 1, Open module dialog: `proven`. `orch-001a` includes
  `dialogBefore`, selected module evidence, `loaded=true`, and a responsive
  final main frame.
- Procedure 2, Select module list entry: `proven`. `orch-001a` records
  `selectedIndex=28`, `selectedText=the_last_city — codex`, `loaded=true`,
  and a final title containing `the_last_city — codex.mod`.
- Procedure 3, Clear post-load `Error` modal safely: `needs-retest`.
  `orch-001a` proves the `Error` modal was present after load, but the current
  `.codex-tmp/aurora-live-evidence` summary set does not include a matching
  cleanup summary proving targeted `WM_COMMAND IDOK` removal and re-enumeration.
- Procedure 4, Toggle and restore Fog: `proven` with the open-area
  precondition. `orch-001c` is a no-op/retest data point, but `orch-002`
  records targeted `WM_COMMAND 106`, `afterDiffers=true`,
  `finalMatchesBefore=true`, and `responding=true`.
- Procedure 5, Drive `TTreeView` without global input: `needs-retest` overall.
  `orch-001d`, `orch-001f`, `orch-003`, and `orch-003b` prove targeted tree
  pulses can change visible state, but `orch-001e` ends `responding=false` and
  `orch-003` rollback does not match before; keep only sub-atoms promoted until
  a clean repeatable open-area/tree rollback summary exists.

## Known blockers / do-not-promote

- Do not launch `nwtoolset.exe` with a module path argument. This is not a
  valid shortcut for oracle work; it frequently leaves Toolset empty or in an
  error state. Use `WM_COMMAND 44` and the module-open dialog.
- Do not promote area context `Properties` activation to `safe-repeatable`:
  `WM_COMMAND 19`, popup `WM_LBUTTONDOWN/UP`, and `VK_END + VK_RETURN` failed
  in the targeted-only refresh.
- Do not use remote-memory `TreeView` reads/writes as an operator primitive.
  Existing docs repeatedly flag this as risky; use control messages and visual
  evidence instead.
- Do not treat a nonblank or changed hash as sufficient open-area proof if the
  Toolset is not responsive afterward. ORCH-001e changed the frame hash but
  ended as partial/blocker.
- Do not leave view toggles changed after evidence capture. Fog and similar
  commands must be paired with rollback.
- Do not use global cursor takeover or global `SendKeys` for any of these
  procedures.

## Short operator summary

1. Start `nwtoolset.exe` without arguments.
2. `WM_COMMAND 44` opens File/Open on the main `TfrmFrame`.
3. In `TdlgModuleSelect`, select `the_last_city [U+2014 em dash] codex` at codex index `28`.
4. If post-load `Error` appears, close only that dialog with targeted
   `WM_COMMAND IDOK`.
5. `WM_COMMAND 106` toggles `Environment -> Fog`; send it twice for
   before/after/rollback.
6. `TTreeView` pulses are valid only when targeted to the real tree handle and
   verified after each step; tree popup activation remains a blocker where
   noted.
