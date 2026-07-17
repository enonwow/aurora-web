# Aurora Toolset: tomorrow handoff for Last City area building

Data: 2026-06-18

Rola: `6/6 TOMORROW HANDOFF REFRESH`.

Zakres: dokumentacyjny handoff dla kolejnej samodzielnej rotacji budowania
malych obszarow Last City. Ten plik nie jest live-runem. Aurora nie byla
uruchamiana, okno Toolsetu nie bylo dotykane, nie uzyto globalnej myszy ani
`SendKeys`.

Zasada nadrzedna: start jutro idzie z `ORCH-010` clean baseline i tylko z
wezszymi roszczeniami z `ORCH-012`, `ORCH-013`, `ORCH-014`, `ORCH-015`.
`ORCH-016` jest tylko pasywnym health tickiem orkiestracji i nie zastepuje
Toolset baseline. Nie promowac mutacji, paint, save/reopen, `_ikea`, runtime
parity ani area-list inventory bez nowego pakietu screenshot + `summary.json`.

## Start point

Startowy stan do cytowania:

- Folder:
  `.codex-tmp/aurora-live-evidence/orch-010-clean-baseline-no-modals-20260619-000832-158`
- Screenshot:
  `.codex-tmp/aurora-live-evidence/orch-010-clean-baseline-no-modals-20260619-000832-158/01-clean-baseline-main-window.png`
- Accepted claim: passive clean baseline for `the_last_city ... codex.mod`.
- Key facts: `cleanBaseline=true`, `modalCount=0`,
  `oldFileFormatPresent=false`, `areaPropertiesPresent=false`,
  `responding=true`.
- Limit: baseline proof only. It does not prove a new building action.

Dispatch wording:

`GO from ORCH-010 clean baseline only if no newer modal/nonresponsive evidence supersedes it.`

## Evidence packs to reuse

| Pack | Folder | Accepted claim | Do not claim |
| --- | --- | --- | --- |
| `ORCH-010` clean baseline | `.codex-tmp/aurora-live-evidence/orch-010-clean-baseline-no-modals-20260619-000832-158` | Clean responsive Toolset frame for `the_last_city ... codex.mod`; no modal-like blocker at capture time. | Mutation, save/reopen, current state after any later live action. |
| `ORCH-012` canvas | `.codex-tmp/aurora-live-evidence/orch-012-canvas-region-proof-20260619-001330-569` | Passive `_winds_houses` area/canvas proof: full frame, derived canvas crop, right-palette crop, `TfrmViewerArea - _winds_houses`, visible canvas `TScrollBox` about `1291x807`, `modalCount=0`, `responding=true`. | `_ikea`, future command routing, mutation, render parity, exact after-diff completion. |
| `ORCH-013` right palette | `.codex-tmp/aurora-live-evidence/orch-013-right-palette-inventory-20260619-001521` | Visual right-palette proof: right-side `TTreeView` crop and visible top labels `Features`, `Groups`, `Terrain`; current packet has `status=ok`, `modalCount=0`, `responding=true`. | Parsed/machine inventory, expanded item list, selected template, paint/place success. |
| `ORCH-014` left tree | `.codex-tmp/aurora-live-evidence/orch-014-left-area-tree-proof-20260619-001834` | Passive left-area-tree visibility proof: visible left `TTreeView` `hwnd=721744`, rect `-1919,74,-1632,951`, crop `287x877`, `status=ok`, `modalCount=0`, `responding=true`. | Parsed area-list inventory, new area open, `_ikea`, mutation, or a chosen build target. |
| `ORCH-015` bottom/status | `.codex-tmp/aurora-live-evidence/orch-015-bottom-status-proof-20260619-002101` | Passive bottom/status-region proof: full-window PNG, bottom/status crop, `summary.json` with `responding=true`, `modalCount=0`, root title on `the_last_city ... codex.mod`, visible `TStatusBar`, visible `TMemo`, and `bottomStatusRegion=1920x258`. | Parsed status text, command success, `_ikea`, area-open, paint, save, mutation, or rollback proof. |
| `ORCH-016` health tick | `.codex-tmp/aurora-live-evidence/orch-016-health-tick-20260619-002240` | Passive orchestration health tick only: `status=ok`, `passiveOnly=true`, `inputActions=[]`, `modalCandidatesObserved=[]`, `responding=true`. | Toolset baseline, Toolset title/module state, active area, palette/canvas state, paint, save, mutation, or any Aurora window claim; summary title is `Codex`, not the Toolset. |

## Blocker status

Resolved for the clean baseline chain:

- `Old File Format` blocker: cleared by the populated `ORCH-007` child-button
  `BM_CLICK` packet, but that packet left `Area Properties` open, so it is not
  itself the clean baseline.
- `Area Properties` blocker: cleared by populated `ORCH-008` targeted
  `Cancel` packet; summary records `dialogStillPresent=false`,
  `oldFileFormatStillPresent=false`, `responding=true`.
- Clean baseline: `ORCH-010` supersedes the earlier blocker state with a
  passive no-modal screenshot and `cleanBaseline=true`.

Still blocked or limited:

- `ORCH-011` is empty/incomplete and should not be cited.
- `ORCH-011B` is only partial Fog evidence because
  `rollbackMatchesBefore=false`; do not use it as canonical rollback.
- `_ikea` remains unproven in the accepted current evidence. The visible canvas
  evidence is `_winds_houses`.
- `ORCH-016` does not prove Aurora Toolset state; it captured a passive
  foreground health tick with title `Codex`, so use it only as "no input /
  orchestration alive" context.
- `ORCH-018` is only the planned next bridge atom. There is no `ORCH-018`
  evidence packet yet.
- There is no accepted proof yet for a completed Last City building slice,
  tile/group paint, saved module, reopen validation, placeable inventory,
  parsed palette inventory, or runtime validation.

## Tomorrow operating rules

- First live step must be a passive preflight: title/module, modal count,
  responding state, full-frame screenshot, active area tab, left tree crop,
  canvas crop, and right palette crop.
- If the active tab, child rects, or modal state differ from `ORCH-010/012/013/014/015`,
  recapture baseline and treat old crop coordinates as historical, not current.
- Work only on an explicit test area or an area approved for mutation.
- No module save unless the user explicitly approves the final state.
- Use targeted HWND/control messages only. No global mouse movement, no global
  drag, no `SendKeys`.
- Every atom needs before/action/after/final evidence. Mutating atoms also need
  rollback or an explicit `left-mutated-unsaved` decision.
- Final screenshot after every atom must show no modal, readable canvas, and
  restored safe mode such as `Select Objects` / known palette state.

## Required live warm-up before first location work

Before planning any tile, placeable, or canvas step, run or verify the Features
pulse runner on the live Toolset surface, then execute the City subcategory
pulse using the `ORCH-023` proof pattern. Confirm with screenshots that the
City list opened and that rollback restored the palette state; package every
step with its own screenshot plus `summary.json`.

Aurora-first: use real Toolset evidence only, no global mouse, no `SendKeys`,
no canvas input, and no module save until the user explicitly approves it.

## Next safe atoms

### LC-HO-001: passive baseline refresh

Goal: prove the current live surface still matches the handoff.

Method: passive enumeration and screenshots only.

Required evidence:

- full Toolset frame with `the_last_city ... codex.mod`;
- modal count and `responding=true`;
- active area tab / viewer title;
- left tree crop;
- canvas crop;
- right palette crop.

Stop condition: any modal, `responding=false`, missing frame, or active target
not matching the intended build area.

### LC-HO-002: choose the build target

Goal: decide whether the first build atom uses current `_winds_houses`, an
existing test area, or stops with `blocked: no safe target`.

Method: use the left tree proof pattern from `ORCH-014` and canvas proof pattern
from `ORCH-012`; do not mutate.

Required evidence:

- target area visible in tree or tab;
- full canvas baseline for that exact target;
- explicit target decision: `existing test area selected`, `current area
  observation only`, or `blocked`.

Stop condition: target area cannot be proven with screenshot and title/tree
context.

### ORCH-018 / LC-HO-003: palette branch pulse bridge

Goal: bridge `ORCH-013` right-palette visibility to a later tile/group preview
atom without paint, save, or mutation.

Method: with targeted HWND/control messages only, pulse exactly one safe
right-palette branch from the `ORCH-013` region, preferably `Terrain` then the
smallest visible `Groups` branch if it is already reachable. Capture before,
branch-open, and final palette/canvas evidence. Do not click the canvas and do
not accept paint/place/save prompts.

Required evidence:

- full-frame preflight tied back to `ORCH-010/012/013/014/015`;
- before palette crop;
- branch-open palette crop with visible branch label and any visible child row;
- canvas crop proving no tile/group paint happened;
- bottom/status crop if status changes are visible;
- final restored crop or explicit final selected branch state;
- `summary.json` recording targeted actions only and no global mouse /
  `SendKeys`.

Stop condition: parsed selection is uncertain, a modal appears, branch state
cannot be restored or documented, canvas evidence suggests paint/mutation, or
palette evidence conflicts with the screenshot.

### LC-HO-004: tile/group preview handoff

Goal: use the ORCH-018 branch pulse to prepare the smallest tile/group preview
atom.

Default method: preview-only. This handoff does not authorize paint, save, or
mutation. If a later runner wants to paint, that must be a new approved atom
with its own before/action/after/rollback evidence.

Required evidence:

- canvas before;
- selected tile/template in palette;
- green/red preview or explicit blocker for no preview;
- footprint/origin note for the intended cell/group;
- final no-modal frame with the palette/canvas state documented.

Stop condition: red/unclear preview, unknown tile origin, any canvas click would
be required to continue, or target is not a proven safe preview target.

### LC-HO-005: mutation gate after preview

Goal: decide whether a future runner is allowed to move from preview evidence
to any paint/place mutation.

Method: do not mutate in this handoff. Package the preview evidence and ask for
an explicit mutation decision: `stay-preview-only`, `approve-test-paint-with-undo`,
or `approve-placeable-test-with-rollback`.

Required evidence:

- ORCH-018 palette branch pulse packet;
- tile/group preview packet or explicit blocker;
- target area decision;
- rollback capability statement if mutation is later approved;
- final state: no modal, no save, no paint/mutation performed by this handoff.

Stop condition: no explicit approval, missing rollback path, uncertain target,
or any evidence ambiguity about whether a mutation already happened.

## Five-step next plan

1. Refresh passive baseline from `ORCH-010`: module title, no modal, responding,
   full frame, plus `ORCH-015` bottom/status crop.
2. Re-anchor the three work surfaces: `ORCH-012` canvas crop, `ORCH-013` right
   palette crop, `ORCH-014` left tree crop; keep `ORCH-016` as health context
   only, not Toolset state.
3. Run `ORCH-018` palette branch pulse: one targeted branch open/selection,
   screenshots before/branch-open/final, no canvas click.
4. Use the ORCH-018 branch state as the bridge to tile/group preview only:
   capture preview or exact blocker, with no paint/save/mutation.
5. Package the result as `preview-only` or `blocked`; require a separate
   explicit approval and rollback plan before any future paint/place/save atom.
