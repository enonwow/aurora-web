# Aurora Toolset: area building source of truth

Date: 2026-06-22

Status: active source-of-truth for tile-only area building experiments before
Last City area work.

Reference target:

- Training tavern: `Karczma: Pod Ostatnim Dzwonem`.
- Reference image: `C:/Users/enonw/AppData/Local/Temp/codex-clipboard-af43cd3b-7aa0-4218-a521-60a030d01ac0.png`.
- Active training module: `C:/Users/enonw/Documents/Neverwinter Nights/modules/codex_training_field.mod`.

This document replaces "try a nice looking tavern" with a reproducible area
building workflow. The immediate goal is not just a final screenshot. The goal
is to learn which `City Interior` tiles, groups, terrain templates, and features
can be composed safely into the proposed layout.

## Hard boundary

Allowed in this slice family:

- `Features`, `Groups`, and `Terrain` from the tile/terrain palette.
- Preview-only tests.
- Accepted tile/group/feature mutations only after a green, local preview.
- Targeted Toolset control messages and screenshots.
- Save/readback only after an accepted tile-only mutation.

Forbidden in this slice family:

- Placeables.
- Creatures.
- Object `Doors`.
- Items.
- Merchants.
- Encounters.
- Sounds.
- Triggers.
- Waypoints.
- Scripts.
- Global mouse or global keyboard takeover.

## Target layout language

The reference tavern is not a literal grid contract. It is a spatial intent:

- Large central common hall, mostly rectangular.
- Southern vestibule/entry.
- West fireplace or stone-side alcove.
- West/southwest side alcove.
- East kitchen/service room.
- North/private corridor.
- Northeast stair or technical room.
- Doorway-like connections made only by tile geometry.

The useful build order is:

1. Reference decomposition: named zones, rough proportions, and connection graph.
2. Building silhouette: central volume, attached wings, protrusions, and voids.
3. Groups/terrain for large readable volumes.
4. Terrain for floor/wall/doorway continuity.
5. Features only where preview is green, local, and reinforces a named zone.

## Reference-driven quality gates

Solver validity is necessary, but it is not enough for final acceptance. A
solver-clean tile grid can still be visually wrong. Every reference-driven area
must pass two layers:

1. Technical validity: no solver warnings, no forbidden object lists, no modal
   blockers, Toolset responding, and clean readback.
2. Visual/architectural validity: the screenshot must preserve the reference
   silhouette, zone proportions, room topology, and readable transitions.

Hard rejection conditions:

- Missing or detached named zone from the reference.
- A labeled room in the reference represented by a tiny one-tile sliver when the
  reference shows a broad volume.
- Black void or hard tile cap inside the intended building envelope.
- A doorway-like connection that is technically present but visually reads as a
  cut wall, blocked seam, or broken edge.
- A feature/group commit that changes the semantic role of the room, even if the
  preview was green.
- Final area accepted only because it is tile-only; tile-only is a boundary, not
  a quality score.

Visual scoring should be recorded in each final `summary.json`:

| Gate | Weight | Acceptance expectation |
| --- | ---: | --- |
| Zone coverage | 25 | Every named reference zone exists and is readable. |
| Topology | 20 | Connections match the intended flow: entry -> hall -> side rooms/service/private/stairs. |
| Proportions | 20 | Main hall, wings, corridor, kitchen, and vestibule are close to the reference scale. |
| Seam quality | 15 | No obvious cut tile, black internal void, red-preview artifact, or abrupt cap. |
| Tile semantics | 10 | Tile art matches the intended role: stone/fireplace, kitchen/service, inn/private, corridor/stair. |
| Evidence/readback | 10 | Screenshot, grid, object counts, rollback path, and responding state are present. |

Minimum promotion rule:

- `>= 80/100`: candidate can be accepted as a reference-matching area.
- `65-79/100`: useful checkpoint, but not final; record the weakest gates and
  continue iteration.
- `< 65/100`: reject or treat as discovery only.

Each reference-driven evidence packet should include:

- `referenceImage`;
- `targetZones`, with approximate grid bounds for each named zone;
- `connectionGraph`, listing required room-to-room transitions;
- `tileGrid`, with tile id/orientation per cell;
- `solverWarnings`;
- `forbiddenObjectCounts`;
- `visualScore`;
- `knownMismatches`;
- `nextFixes`.

## Tavern reference constraints

For `Karczma: Pod Ostatnim Dzwonem`, the target is a shaped tavern, not just a
connected indoor room. A future candidate should satisfy these constraints:

- Main hall: broad central rectangle, visually dominant, with clean long edges.
- South vestibule: a separate protruding entry pad, preferably stone/corridor
  toned, two tiles wide when the grid allows it.
- West fireplace zone: visually distinct from bedroom/private rooms; stone or
  fireplace semantics are more important than generic inn-room art.
- West/southwest alcove: attached side volume, not a one-tile corridor strip.
- East service/kitchen: a readable block, preferably at least 2x2 or 2x3 if the
  area size allows it, connected by a single clean doorway.
- North private corridor: a long horizontal connector, not just a small room
  fragment.
- Northeast stair/technical chamber: terminal room connected through the north
  corridor, visually separate from the main hall.
- Exterior envelope: attached volumes should create the same overall shape as
  the reference: central body, west side rooms, east service wing, north private
  wing, northeast stair cap, and south entry protrusion.

The 8x8 grid is acceptable for discovery, but it is tight for this reference.
If the silhouette cannot fit without compressing rooms into slivers, the next
candidate should move to 10x9 or 12x10 before more feature polishing.

## Reference-first iteration loop

For image-matching work, do not begin by picking attractive tile groups. Use this
loop:

1. Draw a coarse zone map from the reference, with named rooms and approximate
   dimensions.
2. Pick the minimum grid size that can preserve those proportions without
   collapsing side rooms.
3. Build only the silhouette and room graph first.
4. Solve/patch a sacrificial area from the tileset `.set`.
5. Capture Toolset readback and score against the quality gates.
6. Fix the lowest-scoring gate first; do not polish details while the silhouette
   or topology is wrong.
7. Accept only when technical validity and visual score both pass.

## Why the current process was slow

The previous live attempts showed that the reference picture is ahead of our
Toolset knowledge. We were asking Aurora to draw a plan before knowing which
local `City Interior` pieces exist and where their origins/anchors are.

Known live learnings:

- `Groups > Kitchen Room 1 1x2` can show green preview, but may create a heavy
  service wing and connector problems.
- `Groups > Livingroom 2 1x2` on the west side can create a disconnected room
  instead of a clean alcove.
- `Features > Kitchen Room` on the east side of `cdx_tavern_a_02` created a
  disconnected wing and was rolled back.
- `Features > Door Kitchen`, `Features > Midwall Doorway`, `Terrain > Doorway`,
  and `Terrain > Corridor` often produced red previews or overpainted more than
  the intended seam.
- Terrain center-clicks do not behave like simple repaint operations; snap and
  anchor behavior must be calibrated.

## Slice ledger

| Slice | Scope | Status | Evidence / note |
| --- | --- | --- | --- |
| AREA-00 | Load/recover training module and current tavern baseline | accepted-live | Current saved baseline is `cdx_tavern_a_02`; final readback evidence from 2026-06-22 exists under `.codex-tmp/aurora-live-evidence/tavern-final-readback-after-save-20260622-104636-153-20260622-104636-335/summary.json`. |
| AREA-01 | `City Interior` catalog route: list candidate groups/terrain/features and record whether offline `nwn-mcp` can provide `.set` details | accepted-doc | `nwn-mcp` source supports solver-style tile layout. `NIM_FOLDER_NWTOOLS` is still not exposed, but the backend KEY/BIF reader pattern allowed direct extraction of `tin01.set` from the retail data, so future area work should prefer tileset analysis plus solver over blind palette trial. |
| AREA-02 | Preview matrix for connector candidates around the saved tavern baseline | accepted-live | First live matrix proved useful. `Stairs Up` is green but detached; `Kitchen Corner Stairs Up` can be green-local/overpaint; `Livingroom Corner Stairs Up` preview looked promising but its committed result was rejected and rolled back. Evidence listed below. |
| AREA-03 | Accepted local connector mutation | accepted-live | `Livingroom Corner Stairs Up` was rejected after commit and rolled back, but `Terrain > Corridor` at the east/right seam produced a small local mutation that was accepted and saved. Final readback: `.codex-tmp/aurora-live-evidence/area03-final-readback-after-accepted-corridor-save-20260622-130302-111/summary.json`. |
| AREA-04 | Full target tavern reconstruction attempt in fresh area | technical-checkpoint-live | Corrected candidate is `cdx_dzwon_04`, patched from extracted `tin01.set` plus the `nwn-mcp` zone solver. It has a large Livingroom hall, west Inn-room alcoves, east Kitchen room, north private/stair wing, zero solver warnings, and zero forbidden GIT/GIC objects. Final evidence: `.codex-tmp/aurora-live-evidence/area04-corrected-tile-patch-2026-06-22T12-59-30-885Z/summary.json`. Under the newer reference-driven gates it is a useful checkpoint, not a final reference match. The earlier terrain-painted `cdx_dzwon_04` was a weak checkpoint and remains superseded. |
| AREA-05 | Reference-scored tavern rebuild | pending | Rebuild from a zone map and connection graph, preferably on 10x9 or 12x10 if 8x8 compresses the reference. Must score `>= 80/100` and pass both technical and visual/architectural gates. |
| AREA-06 | Last City transferable area-building playbook | pending | Convert accepted learnings into orchestration rules for later real areas. |

## AREA-02 preview matrix

Preview candidates must be tested against the reference layout zones:

| Zone | Candidate palette paths | Desired result | Stop condition |
| --- | --- | --- | --- |
| East service/kitchen | `Groups > Kitchen Room 1 1x2`, `Groups > Kitchen Room 2 1x2`, `Terrain > Kitchen`, `Features > Kitchen Room`, `Features > Door Kitchen` | Connected kitchen/service room on the east side | Any detached island, major common-room overwrite, or red preview |
| West fireplace/alcove | `Features > Livingroom`, `Features > Shop Room`, `Terrain > Livingroom`, `Terrain > Wall`, `Terrain > Doorway` | Local west stone/alcove geometry | Disconnected west block or common-room overwrite |
| North private corridor | `Terrain > Corridor`, `Groups > Inn Room 1 1x2`, `Groups > Inn Room 2 1x2`, `Features > Inn Room`, `Features > Midwall Doorway` | Thin north corridor or private-room connection | Red seam preview or detached wing |
| Northeast stairs/technical | `Features > Stairs Up`, `Features > Stairs Down`, `Terrain > Corridor`, `Terrain > Doorway` | Small terminal room with stair-like tile geometry | Any object door/transition requirement |
| South vestibule | `Terrain > Inn`, `Terrain > Corridor`, `Terrain > Doorway`, `Features > Midwall Doorway` | Entry pad connected to common room | Door object prompt or room split |

Live result, 2026-06-22:

| Candidate | Coordinates | Classification | Evidence |
| --- | --- | --- | --- |
| `Features > Stairs Up` | `1000,310`, `1080,300`, `960,380` | `green-island` | Produced a green detached stair footprint east/northeast of the tavern, not a connected technical corner. Representative folder: `.codex-tmp/aurora-live-evidence/area02-preview-features-stairs-up-ne-x1000-y310-20260622-124239-893/summary.json`. |
| `Features > Kitchen Corner Stairs Up` | `1010,315`, `965,290` | `green-local-overpaint` | Snaps to a corner footprint attached to the east side but overwrites too much of the common-room/right-room boundary for direct use on the saved baseline. Representative folder: `.codex-tmp/aurora-live-evidence/area02-preview-feature-kitchen-corner-stairs-up-ne-x1010-y315-20260622-124510-125/summary.json`. |
| `Features > Kitchen Corner Stairs Up` | `1085,285` | `green-island` | Same feature, shifted east, detaches into an island. Folder: `.codex-tmp/aurora-live-evidence/area02-preview-feature-kitchen-corner-stairs-up-ne-x1085-y285-20260622-124559-940/summary.json`. |
| `Features > Livingroom Corner Stairs Up` | `965,290` | `green-local-overpaint-preview`, `rejected-after-click` | Preview was promising, but commit over-rebuilt the area. Rejected and rolled back. Preview folder: `.codex-tmp/aurora-live-evidence/area02-preview-feature-livingroom-corner-stairs-up-ne-x965-y290-20260622-124815-252/summary.json`; commit folder: `.codex-tmp/aurora-live-evidence/area03-commit-feature-livingroom-corner-stairs-up-ne-x965-y290-20260622-124918-753/summary.json`; rollback folder: `.codex-tmp/aurora-live-evidence/area03-rollback-reject-livingroom-corner-stairs-up-20260622-125024-434/summary.json`; final readback folder: `.codex-tmp/aurora-live-evidence/area03-final-readback-after-save-clean-20260622-125354-809/summary.json`. |
| `Features > Door Kitchen` | `920,450` | `green-overpaint` | Not a tiny door seam. Preview behaves like a larger kitchen-room fragment and would overwrite more of the right/lower section than desired. Folder: `.codex-tmp/aurora-live-evidence/area02-preview-feature-door-kitchen-east-seam-x920-y450-20260622-125725-015/summary.json`. |
| `Terrain > Corridor` | `920,450` | `green-local`, `accepted-after-click` | Best control found in this pass. Preview was a single-tile green X, commit stayed local, cleanup removed selection, save cleared the dirty title, and readback confirmed Toolset responding with no modals. Preview folder: `.codex-tmp/aurora-live-evidence/area02-preview-terrain-corridor-east-seam-x920-y450-20260622-125858-135/summary.json`; commit folder: `.codex-tmp/aurora-live-evidence/area03-commit-terrain-corridor-east-seam-x920-y450-20260622-130004-625/summary.json`; save folder: `.codex-tmp/aurora-live-evidence/area03-save-accepted-terrain-corridor-east-seam-20260622-130224-835/summary.json`; final readback: `.codex-tmp/aurora-live-evidence/area03-final-readback-after-accepted-corridor-save-20260622-130302-111/summary.json`. |

Rules learned:

- A green preview can still be too destructive after commit.
- `Stairs Up` without a room-context prefix should not be used for the proposed
  northeast corner on `cdx_tavern_a_02`; it anchors as a detached feature.
- Corner stair features snap to coarse tile origins. Nearby mouse coordinates
  can produce the same footprint, so a "small pixel adjustment" is not a real
  design control.
- Candidate features that look `green-local-overpaint` should be tested in a
  fresh sacrificial area before being accepted into a saved tavern layout.
- `Features > Door*` names are not guaranteed to be small door holes. In City
  Interior they can behave as larger room-feature chunks.
- Single `Terrain` paints are currently the most controllable way to make local
  layout improvements.
- The next useful live work is `AREA-04`: a fresh reconstruction attempt driven
  by the preview matrix, with groups/features used for broad volume only and
  single terrain tiles used for connector polish.

## AREA-04 reconstruction result

Technical checkpoint candidate:

| Area | Accepted elements | Final evidence |
| --- | --- | --- |
| `cdx_dzwon_04` | Direct tile-list reconstruction using extracted `tin01.set`: solver terrain zone for the central `Livingroom`, group/feature tiles for two west `InnRoom` alcoves, east `KitchenRoom`, north private room/corridor, double south entry, and `StairsUp`. No placeables, creatures, object doors, items, sounds, triggers, waypoints, scripts, or merchants were added. This passes technical validity but does not yet pass the reference-driven visual gates because west rooms are too narrow, the kitchen/service wing is too small, the north corridor/stair wing is compressed, and the south vestibule is not a distinct protruding volume. | `.codex-tmp/aurora-live-evidence/area04-corrected-tile-patch-2026-06-22T12-59-30-885Z/summary.json` |

Superseded checkpoint:

| Area | Classification | Evidence |
| --- | --- | --- |
| `cdx_dzwon_04` terrain-painted pass | `superseded-too-weak` | The earlier saved/readback packet `.codex-tmp/aurora-live-evidence/area04-final-readback-accepted-tavern-layout-20260622-134505-805/summary.json` proved Toolset control, but the visual result was not close enough to the reference and must not be treated as the accepted tavern. |

Rejected live candidates:

| Candidate | Area | Classification | Evidence |
| --- | --- | --- | --- |
| `Terrain > Kitchen` | `cdx_dzwon_04` | `rejected-after-click` | Preview looked local on the east wing, but commit rebuilt too much of the layout and reduced continuity. Rolled back: `.codex-tmp/aurora-live-evidence/area04-rollback-reject-terrain-kitchen-east-wing-20260622-133831-917/summary.json`. |
| `Groups > Livingroom 1 1x2` | `cdx_dzwon_05` | `rejected-after-click` | Seam preview looked connected, but commit produced a bedroom-like vertical strip rather than a main hall. Rolled back: `.codex-tmp/aurora-live-evidence/area04-v05-rollback-reject-group-livingroom1-east-seam-20260622-135544-916/summary.json`. |
| `Groups > Kitchen Room 1 1x2` | `cdx_dzwon_05` | `rejected-after-click` | Commit replaced most of the base with a vertical kitchen strip instead of adding a side service room. Rolled back: `.codex-tmp/aurora-live-evidence/area04-v05-rollback-reject-group-kitchen1-east-seam-20260622-140215-701/summary.json`. |

Rules added by AREA-04:

- `tin01` terrain types are not freely adjacent. `Inn`, `Kitchen`, and
  `Livingroom` must be separated by wall/feature geometry; doorway/corridor
  crossers bridge the connection.
- For complex interiors, extract the `.set`, solve the tile grid, then verify in
  Aurora. Palette-only trial is useful for discovery, but too slow for final
  reconstruction.
- Baked furniture in City Interior groups/features is allowed for this slice
  because it is tile geometry. It is not allowed to add object-list placeables or
  object doors.
- The accepted result is the solver-backed tile-list patch, not the earlier
  conservative terrain extension.
- `Groups` previews in City Interior can seriously understate the semantic
  change caused by commit. Treat every group commit as sacrificial until the
  post-click screenshot is inspected.
- `Terrain > Kitchen` is not a safe late-stage repaint for a connected wing in
  this experiment; it can rebuild too much of the surrounding area.
- `Features > Stairs Up` becomes useful only after a matching north/technical
  room exists. On an empty east/northeast target it can still anchor as an
  island.

## Evidence contract

Every live area slice must create an evidence folder under:

`.codex-tmp/aurora-live-evidence/area-building-YYYYMMDD-HHMMSS-*`

Required for AREA-02:

- before full-window screenshot;
- candidate path selected in right palette;
- at least one preview screenshot per tested coordinate;
- classification table in `summary.json`;
- no click/paint unless promoted to AREA-03;
- `mutation=false`, `save=false`, `globalInput=false`;
- `responding=true`, `popupCount=0`, `modalCount=0`;
- final neutral screenshot after `WM_COMMAND 74` / palette restore.

Required for AREA-03:

- before screenshot;
- preview screenshot;
- after mutation screenshot;
- readback screenshot;
- rollback screenshot if the mutation is rejected;
- final `summary.json` with explicit accepted/rejected decision;
- no forbidden object categories added under the area tree.

## Acceptance rules

AREA-02 is accepted if it answers at least one practical building question, for
example:

- which kitchen/group candidate creates a connected east room;
- which connector candidate is red at the target seam;
- whether a stair feature can be local in the northeast;
- which terrain/template produces local doorway geometry without object doors.

AREA-03 is accepted only if the saved layout is closer to the reference image
without breaking the tile-only boundary. If the best outcome is "all tested
connectors fail", the correct result is a blocker with screenshots, not another
blind mutation.

## Transfer to Last City

Before building real Last City areas, the orchestrator should require:

- tileset catalog or preview matrix for the target tileset;
- agreed spatial zones before any object work;
- first pass with groups/terrain/features only;
- object slices only after tile geometry is readable;
- one evidence packet per semantic slice.
