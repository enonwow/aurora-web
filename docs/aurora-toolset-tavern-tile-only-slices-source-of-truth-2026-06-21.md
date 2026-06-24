# Aurora Toolset: Tavern tile/group-only slices source of truth

Date: 2026-06-21

Status: source-of-truth for tavern building slices; TAV-01 live area shell
accepted, TAV-02 live tile-only tavern blockout accepted, TAV-03 connector
polish remains next.

This document is the contract for building a tavern training slice in Aurora
Toolset using only area tiles, terrain/features, and tile groups. It is
separate from creature, placeable, item, merchant, encounter, trigger, door,
sound, waypoint, and script slices.

The tavern must first prove a clean tile-only workflow. Objects can be added
in a later slice family, but they are intentionally out of scope here.

## Chosen tilesets

Primary tileset:

- `City Interior`: best default for an indoor tavern because it can represent
  rooms, corridors, walls, floors, side chambers, and interior transitions
  without needing object clutter.

Secondary comparison candidates:

- `City Interior 2`: use if it exposes better tile groups/features for a
  cleaner inn layout.
- `Castle Interior 2` or `Castle Interior`: use only as an alternate stone
  tavern/inn variant if City Interior lacks useful groups.
- `City Exterior`: later optional outside/frontage variant; not part of the
  first accepted indoor tavern slice.

Avoid `Barrows Interior` for the actual tavern layout. It is acceptable as a
training-module start area, but it is not a good tavern source tileset.

## Hard boundary

Allowed:

- Area Wizard / area creation for disposable training areas.
- Terrain/tile palette roots such as `Features`, `Groups`, and `Terrain`.
- Single tile paint, tile feature selection, tile group preview, and tile group
  paint when the preview is green and the target area is disposable.
- Toolbar/view commands needed to make the canvas readable.
- Save/readback of the disposable training module after an accepted tile-only
  mutation.

Forbidden in this slice family:

- Placing or editing `Creatures`.
- Placing or editing `Placeables`.
- Placing or editing object `Doors`; door-like tile geometry is allowed only if
  it is part of the chosen tile or group and no Door object is added to the
  area tree.
- Adding `Items`, `Merchants`, `Encounters`, `Sounds`, `Triggers`, `Waypoints`,
  or `Scripts`.
- Using global mouse or global keyboard takeover.
- Counting docs-only work, a single wizard page, or a preview-only experiment
  as a completed tavern layout.

## Evidence contract

Each live tavern slice must produce an evidence folder under:

`.codex-tmp/aurora-live-evidence/tavern-tile-only-YYYYMMDD-HHMMSS-*`

Required evidence:

- before screenshot of the active module and area tree;
- screenshot for every wizard page or tile palette state that changes the
  result;
- screenshot of the canvas after each accepted tile/group mutation;
- final screenshot with no modal windows and the tavern area visible;
- `summary.json` with at least:
  - `sliceId`;
  - `moduleTitle`;
  - `modulePath`;
  - `areaResRef`;
  - `tileset`;
  - `usedOnly`;
  - `forbiddenPaletteTouched`;
  - `createdObjects`;
  - `moduleSave`;
  - `popupCount`;
  - `modalCount`;
  - `responding`;
  - `globalInput`;
  - `cleanup`.

Acceptance requires `popupCount=0`, `modalCount=0`, `responding=true`,
`globalInput=false`, and `createdObjects` showing no creature/placeable/item or
other forbidden object additions.

## Slice ledger

| Slice | Scope | Status | Evidence / note |
| --- | --- | --- | --- |
| TAV-00 | City Interior route and palette/group survey, no committed layout | accepted-live | Surveyed `cdx_tavern_ci_01` right palette after TAV-01. Roots are `Features`, `Groups`, `Terrain`. Final manifest: `.codex-tmp/aurora-live-evidence/tavern-tav00-city-interior-palette-survey-20260621-225321-838/summary.json`. |
| TAV-01 | Create clean tavern training area | accepted-live | Created and saved `cdx_tavern_ci_01` in `codex_training_field.mod` with tileset `City Interior`. Final manifest: `.codex-tmp/aurora-live-evidence/tavern-tav01-final-slice-summary-20260621-225144-961/summary.json`. No forbidden object palette touched. |
| TAV-02 | Tavern common room blockout | accepted-live | Built and saved a City Interior tile-only tavern blockout in `cdx_tavern_ci_01` using `Terrain > Inn`, `Terrain > Kitchen`, and `Groups > Inn Room 1 1x2`. Final manifest: `.codex-tmp/aurora-live-evidence/tavern-tav02-final-slice-summary-20260621-235300-000/summary.json`. |
| TAV-03 | Back-room/private-room geometry | partial-live | Added a right-side inn-room group as secondary room geometry, but the final connector/doorway polish is still a separate slice because `Doorway`, `Door Inn`, and `Livingroom` connector attempts either had red previews or overpainted the common room. |
| TAV-04 | Alternate tileset comparison | optional | Build or preview a small alternate in `City Interior 2` first, then `Castle Interior 2` only if useful. This is not a replacement for the primary City Interior tavern unless the primary tileset is blocked. |
| TAV-05 | Final readback and cleanup packet | pending | Capture full module tree, area canvas, object-category counts, file-system module snapshot, and final clean Toolset state. Runtime smoke is deferred to the later location/runtime phase. |

## TAV-00: route and tile/group survey

Goal:

- Establish the safe route for tavern area work without committing a layout.

Workflow:

1. Confirm the active module is the disposable training module
   `codex_training_field.mod`.
2. Open the Area Wizard route if a new area is needed.
3. Select `City Interior`.
4. Capture the terrain/tile palette roots for the new or selected area.
5. Expand `Groups` and capture the first useful tavern-sized candidates.
6. Exit any paint/preview mode without leaving a mutation unless the run is
   explicitly promoted to TAV-01 or TAV-02.

Acceptance:

- Toolset title and module name captured.
- Palette roots and candidate groups/features captured.
- No forbidden object palette was used.
- No committed layout is claimed from this slice.

Live result, 2026-06-21:

- Accepted as read-only survey, no paint.
- Palette roots: `Features`, `Groups`, `Terrain`.
- Best tile-only tavern candidates:
  - `Terrain > Inn`, `Terrain > Kitchen`, `Terrain > Livingroom`,
    `Terrain > Wall`, `Terrain > Doorway`;
  - `Features > Inn Room`, `Features > Kitchen Room`,
    `Features > Livingroom`, `Features > Shop Room`,
    `Features > Midwall Doorway`, `Features > Stairs Up`,
    `Features > Stairs Down`;
  - `Groups > Inn Room 1 1x2`, `Groups > Inn Room 2 1x2`,
    `Groups > Kitchen Room 1 1x2`, `Groups > Kitchen Room 2 1x2`,
    `Groups > Livingroom 1 1x2`, `Groups > Livingroom 2 1x2`,
    `Groups > Shop Room 1 1x2`, `Groups > Shop Room 2 1x2`.
- Final state: no mutation, no object palette, `popupCount=0`,
  `modalCount=0`, `responding=true`, `globalInput=false`.
- Final manifest:
  `.codex-tmp/aurora-live-evidence/tavern-tav00-city-interior-palette-survey-20260621-225321-838/summary.json`.

## TAV-01: create clean tavern training area

Goal:

- Create a dedicated City Interior area that can absorb tavern tile mutations
  without risking production content.

Recommended area:

- Display/name/resref: `cdx_tavern_ci_01`.
- Tileset: `City Interior`.
- Initial size: 8x8 unless the wizard route makes 10x10/12x12 equally safe.
  The first accepted area should be small enough to inspect in one screenshot.

Workflow:

1. Capture baseline title/tree and modules file snapshot.
2. Use Area Wizard to create `cdx_tavern_ci_01` with tileset `City Interior`.
3. Leave `Open Area Viewer` enabled if offered.
4. Do not launch Area Properties unless needed for readback.
5. Capture the new area in the module tree and canvas.
6. Save the disposable module.
7. Capture file-system readback for
   `C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_training_field.mod`.

Acceptance:

- `cdx_tavern_ci_01` is visible in the module tree.
- Canvas shows the new City Interior area.
- Module file exists, is non-empty, and has a post-slice timestamp/hash.
- No creature/placeable/item/door/merchant/encounter/sound/trigger/waypoint or
  script object was added.

Live result, 2026-06-21:

- Accepted as area-shell slice only. It does not yet claim a tavern layout.
- Active module: `codex_training_field.mod`.
- Area created: `cdx_tavern_ci_01`.
- Tileset selected on the Area Wizard first page: `City Interior`.
- Size: default Area Wizard 8x8.
- Save/readback: `WM_COMMAND 47` cleared the dirty `*` and the module file grew
  from `31,199` to `45,443` bytes with a new timestamp. `WM_COMMAND 46` was
  observed as ineffective in this state.
- Final state: `popupCount=0`, `modalCount=0`, `responding=true`,
  `globalInput=false`.
- Object categories under the new area are present only as empty category nodes:
  `Creatures`, `Doors`, `Encounters`, `Items`, `Merchants`, `Placeables`,
  `Sounds`, `Triggers`, `Waypoints`.
- Final manifest:
  `.codex-tmp/aurora-live-evidence/tavern-tav01-final-slice-summary-20260621-225144-961/summary.json`.

## TAV-02: tavern common room blockout

Goal:

- Produce the first recognizable tavern interior using only tiles and groups.

Workflow:

1. Open `cdx_tavern_ci_01`.
2. Select the most useful City Interior tile/group candidate found in TAV-00.
3. Use green preview only; red preview stops the attempt.
4. Paint a single accepted group or a small sequence of single tiles that forms:
   - a public entry edge;
   - a main common-room floor;
   - visible wall/room boundaries;
   - an implied serving/counter zone if it exists as tile geometry.
5. Save and read back.

Recommended first TAV-02 plan from TAV-00:

1. Start with `Terrain > Inn` or `Features > Inn Room` for the common-room
   base.
2. Use `Terrain > Wall` / `Terrain > Doorway` for readable boundaries.
3. Add either `Groups > Kitchen Room 1 1x2` or
   `Groups > Livingroom 1 1x2` only if the preview is green and the footprint
   is obvious.
4. Keep `Door Inn`, `Door Kitchen`, and other `Door*` feature names as tile
   geometry only; do not add object `Doors`.

Acceptance:

- Final screenshot is recognizable as a tavern common-room blockout even without
  objects.
- The summary distinguishes every mutation: `singleTilePaint`,
  `groupPaint`, or `featurePaint`.
- If group paint remains unreliable, this slice may be completed with a small
  explicit sequence of single tile paints instead.

Live result, 2026-06-21:

- Accepted as tile/group-only tavern blockout in the disposable module
  `codex_training_field.mod`.
- Active area: `cdx_tavern_ci_01`, tileset `City Interior`.
- Accepted visible layout:
  - primary common-room footprint from `Terrain > Inn`;
  - kitchen/storage-looking lower section from `Terrain > Kitchen`;
  - right-side inn-room/private-room group from `Groups > Inn Room 1 1x2`.
- Rejected/undone during the same slice:
  - `Features > Livingroom` at the common room: overpainted the layout into a
    separate block, then targeted toolbar `Undo` restored the prior state;
  - `Groups > Livingroom 1 1x2` as a connector: replaced too much of the
    common-room footprint, then targeted toolbar `Undo` restored the prior
    state;
  - `Terrain > Corridor`, `Terrain > Doorway`, and `Features > Door Inn`
    previews/attempts did not produce an acceptable connector in this pass.
- Save/readback: `WM_COMMAND 47` cleared the dirty `*`; final Toolset title is
  `codex_training_field.mod`.
- Object-category readback under `cdx_tavern_ci_01` shows only empty category
  nodes: `Creatures`, `Doors`, `Encounters`, `Items`, `Merchants`,
  `Placeables`, `Sounds`, `Triggers`, `Waypoints`.
- Final state: `popupCount=0`, `modalCount=0`, `responding=true`,
  `globalInput=false`, `moduleSave=true`, forbidden object palette untouched.
- Final manifest:
  `.codex-tmp/aurora-live-evidence/tavern-tav02-final-slice-summary-20260621-235300-000/summary.json`.

## TAV-03: back rooms and transition geometry

Goal:

- Extend the common-room blockout into an inn-like layout.

Workflow:

1. Add side rooms, corridor, storage-looking alcove, stair-looking feature, or
   exit-looking tile geometry from City Interior.
2. Use only tile/group features. Do not place actual door or transition
   objects.
3. Save and read back.

Acceptance:

- Final screenshot shows at least one secondary room/alcove connected to the
  main room.
- Object categories remain untouched.
- Summary calls out whether transitions are only visual tile geometry.

Current live status, 2026-06-21:

- Secondary/right-side inn-room group exists as part of the saved TAV-02
  blockout, but TAV-03 is not fully accepted yet because the connector/doorway
  geometry still needs a precise green-preview placement that does not overpaint
  the accepted common room.
- Next TAV-03 slice should start from the saved TAV-02 state and test only a
  small connector feature/tile at a time, with immediate screenshot and toolbar
  `Undo` if it splits or overwrites the room.

## TAV-04: alternate tileset comparison

Goal:

- Compare whether another tileset produces a clearer tile-only tavern.

Order:

1. `City Interior 2`.
2. `Castle Interior 2`.
3. `Castle Interior`.

Acceptance:

- Each variant gets its own area resref, for example `cdx_tavern_ci2_01` or
  `cdx_tavern_cast_01`.
- The run must record why the alternate is better or worse than the primary
  City Interior area.
- Do not replace the primary slice unless the primary is blocked.

## TAV-05: final readback and cleanup packet

Goal:

- Package the tavern tile-only work so the future orchestrator can delegate it
  without ambiguity.

Required final packet:

- final area-tree screenshot;
- full canvas screenshot;
- object-category readback showing no forbidden additions;
- module file snapshot/hash;
- `summary.json`;
- note whether the module remains intentionally parked for future tests.

Runtime `Build Module` / `Test Module` stays deferred to the later location
runtime phase.
