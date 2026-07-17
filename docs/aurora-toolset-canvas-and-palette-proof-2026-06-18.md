# Aurora Toolset: canvas and palette proof comparer

Data: 2026-06-18
Rola: 5/6 rotation - ORCH-012/013 proof comparer
Scope: docs-only comparison of existing passive artifacts. Aurora was not
started, no Toolset window was touched, no global mouse, no `SendKeys`.

## Sources compared

| Packet | Folder | Evidence read | Current packet status |
| --- | --- | --- | --- |
| `ORCH-012` canvas region proof | `.codex-tmp/aurora-live-evidence/orch-012-canvas-region-proof-20260619-001330-569` | `summary.json`, `01-full-window.png`, `02-derived-canvas-region.png`, `03-right-palette-region.png` | Accepted for narrow canvas/region proof. |
| `ORCH-013` right palette inventory | `.codex-tmp/aurora-live-evidence/orch-013-right-palette-inventory-20260619-001521` | `summary.json`, `01-full-window.png`, `02-right-palette.png` | Accepted narrowly for right-palette `TTreeView` proof and visible top labels. |

Note: `docs/aurora-toolset-screenshot-index-2026-06-18.md` still has a stale
or conflicting `ORCH-013` row that says `partial`, `modalCount=1`, and label
inference false. The actual current `ORCH-013/summary.json` in the evidence
folder says `status=ok`, `modalCount=0`, `responding=true`, and
`Terrain/Groups/Features=true`; the PNG crop also visibly shows those labels.
This file uses the current packet files as the source of truth and does not
edit the screenshot index.

## ORCH-012 accepted claims

`ORCH-012` is accepted for these claims only:

- The selected Toolset frame was the live `TfrmFrame` whose title contains
  `the_last_city` and `codex.mod`.
- The packet was passive: full-window screenshot, derived central canvas crop,
  right-palette crop, and child-window inventory; no input, no global mouse,
  no `SendKeys`.
- The Toolset was responsive and clean at capture time:
  `responding=true`, `modalCount=0`.
- The packet found a nonzero area viewer/canvas target for the active
  `_winds_houses` tab:
  - `TTabSheet` text `_winds_houses`
  - `TfrmViewerArea` text ` - _winds_houses`
  - visible large `TScrollBox` around the render area, summary rect roughly
    `1291x807`
  - child inventory count: `89`
- The derived canvas crop is real, nonblank visual Toolset content:
  `02-derived-canvas-region.png`, `1290x807`,
  SHA-256 `DE22384C8BA7D1EEFB3D180B0BB5A6ADB938CBCEF190D30F15D6A04DC289B593`.
- Visual inspection of the canvas crop shows an actual top-down city/building
  view: tiled streets, roofs, and circular/rounded structures. This is useful
  as a measurement target and as a readable area-view proof.
- The right-side crop from the same packet exists:
  `03-right-palette-region.png`, `312x754`,
  SHA-256 `E94586FF286966BA786184C852A98640271AB73CF9CA4035FE5A2A56F7104BD5`.

`ORCH-012` does not prove:

- any mutation, save, rollback, or build result;
- `_ikea` canvas proof specifically; the accepted tab is `_winds_houses`;
- render parity against NWN runtime;
- that future commands route correctly to the canvas;
- the exact `NXA-CANVAS-REGION-DIFF-001` follow-up.

## ORCH-013 accepted claims

`ORCH-013` is accepted for these claims only:

- The selected Toolset frame again points at `the_last_city ... codex.mod`.
- The Toolset was responsive and clean at capture time:
  `responding=true`, `modalCount=0`, `blocker=null`.
- The right palette region is a detected visible `TTreeView`:
  - `rightPalette.hwnd=395484`
  - `rightPalette.class=TTreeView`
  - `rightPalette.detectedAsTreeView=true`
  - crop rect: `left=-317`, `top=164`, `width=308`, `height=751`
- The right-palette screenshot exists and matches the crop:
  `02-right-palette.png`, `308x751`,
  SHA-256 `46023BF1489DCB4B2D0FC9ADAF1C7970DD73EF6E8847549891A5A304CADBDBF5`.
- Visual inspection and `summary.json` agree that the top-level palette labels
  are visible: `Features`, `Groups`, and `Terrain`.
- The full-window screenshot keeps the palette in scene context:
  `01-full-window.png`, `1936x1048`,
  SHA-256 `810EC4A781412E186BD58FDDFEF09FE5005CD40E01CAB8197FFCF353574F65EB`.

`ORCH-013` does not prove:

- expanded palette contents under `Features`, `Groups`, or `Terrain`;
- a selected tile/group/template row;
- item, placeable, or container inventory;
- terrain paint, group paint, or placement success;
- the exact canvas region diff follow-up suggested after `ORCH-012`.

## Comparison

| Question | ORCH-012 answer | ORCH-013 answer | Combined use |
| --- | --- | --- | --- |
| Is the Toolset on the Last City module? | Yes: title includes `the_last_city` and `codex.mod`. | Yes: title includes `the_last_city` and `codex.mod`. | Good session identity proof. |
| Is the window clean and responsive? | Yes: `modalCount=0`, `responding=true`. | Yes in current packet: `modalCount=0`, `responding=true`. | Good preflight condition for tomorrow. |
| Do we have a real canvas target? | Yes: `_winds_houses` viewer/canvas crop, nonblank `1290x807`. | Indirectly visible in full-window screenshot, but the packet is palette-focused. | Use `ORCH-012` as the canvas measurement baseline. |
| Do we have the right palette target? | Support crop only, not the dedicated proof. | Yes: right palette `TTreeView`, `308x751`, visible `Features`/`Groups`/`Terrain`. | Use `ORCH-013` for palette-region proof and future palette operations. |
| Does this prove Last City building progress? | No, only existing readable area view. | No, only palette readiness. | Together they prove a clean starting surface, not a completed building slice. |

## Still missing for Last City building

- A chosen safe build target: new/test area or explicit existing area. Current
  accepted canvas is `_winds_houses`, not a confirmed final building slice
  target and not `_ikea`.
- A fresh before screenshot for the exact target area immediately before the
  first building action.
- Controlled geometry evidence: single tile paint or group preview/paint with
  before, selected palette row, preview, after, and rollback or intentional
  keep decision.
- Controlled object evidence: add/place/move/name one appropriate placeable
  with object count or reopened properties after the action.
- Placeable/container inventory remains a gap. Do not promote creature
  inventory or the `ORCH-013` right palette proof into placeable inventory.
- Palette content proof below the root labels remains missing. We have
  `Features`/`Groups`/`Terrain` visible, but no expanded branch, selected
  blueprint, group, or tile template from this packet.
- Persistence remains missing: no save, reopen, or runtime validation for a
  new Last City slice.
- Standard cleanup/restore proof remains required after each future atom:
  final clean canvas, no modal, responsive Toolset, intended palette/mode, and
  explicit rollback or keep decision.

## How to use these screenshots tomorrow

1. Start with a passive preflight matching the `ORCH-012` shape: full-window
   screenshot, canvas crop, modal count, responding state, and active area tab.
   If the active tab or window geometry changed, do not reuse the old crop as
   current proof; recapture a new baseline.
2. Use the `ORCH-012` canvas crop as the template for region-level before/after
   comparisons. Prefer canvas-region diffs over full-window hashes for view or
   build changes.
3. Use the `ORCH-013` right-palette `TTreeView` rect as the safe palette
   observation target. First useful live follow-up: expand exactly one root
   (`Groups` or `Terrain`), capture the palette crop, then restore or record
   the final state.
4. For building actions, every packet should include at least:
   before canvas crop, palette crop with selected category/template, after
   canvas crop, and final clean state. If an action mutates data, add object
   count or reopened properties.
5. Do not use these packets to claim save/reopen, `_ikea`, inventory, or final
   Last City building. They are launch pads for tomorrow's first safe building
   atom, not the completed building proof.

## Accepted claims summary

- `ORCH-012`: accepted as passive `_winds_houses` canvas/region target proof
  with clean responsive Toolset and no input sent.
- `ORCH-013`: accepted narrowly as passive right-palette `TTreeView` proof with
  visible `Features`, `Groups`, and `Terrain` labels in the current packet.
- Combined: accepted as a clean visual starting surface for tomorrow's Last
  City building work.
- Not accepted: mutation, inventory, save/reopen, runtime validation, `_ikea`,
  render parity, or exact canvas-region diff completion.
