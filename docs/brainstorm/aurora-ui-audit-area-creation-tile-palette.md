# Aurora UI Audit - Area Creation And Tile Palette

## Purpose
Capture the Aurora area-creation tile palette surface and mark it as MVP-mandatory for `aurora-web`.

## Evidence Source
1. User-provided screenshots in this thread (Aurora area tile palette panel).
2. Observed palette tree sections:
- `Features`
- `Groups`
- `Terrain`
3. Observed palette context selector:
- style/profile selector (`Standard` visible in screenshots).
4. Observed toggle:
- `Show Plot`.

## Aurora UI Surface (Observed)
1. Enter tile/area editing mode from palette toolbar icon.
2. Tile palette panel exposes a hierarchical tree:
- `Features` (single tile variants and feature-specific entries),
- `Groups` (multi-tile prefabs),
- `Terrain` (terrain family entries, including eraser in shown sample).
3. Active style/profile context selector controls visible palette set (`Standard` in sample).
4. `Show Plot` toggle exists in the palette panel.

## MVP Mapping (Decision)

### MVP Mandatory
1. Area creation workflow is mandatory in MVP.
2. Palette-driven tile authoring is mandatory in MVP.
3. MVP must include `Features`, `Groups`, and `Terrain` palette sections.
4. MVP must support group placement and terrain placement from the palette.
5. MVP must support erase/replace behavior in terrain workflow.

### UX Shell + Staged Logic Rule
1. Full palette structure and navigation should be available in MVP UX.
2. If a specific advanced palette behavior is not implemented yet, it must be visibly marked as `Planned` or disabled with explanation.
3. No ambiguous controls: users must always know what works now vs later.

## MVP Functional Baseline For Area Creation
1. Create area (tileset + dimensions) and open it in editable mode.
2. Select palette section (`Features` / `Groups` / `Terrain`).
3. Select entry and place it into area.
4. `LMB` hold supports continuous selection/paint-style tile targeting in viewport.
5. Replace/erase tile content without full-area rerender.
6. Save and reopen area with the same tile layout.

## Gaps To Track
1. Define precise behavior for `Show Plot` in MVP (enabled now or staged).
2. Define minimum brush/placement interaction model for terrain entries.
3. Define placement constraints/validation messages for invalid tile/group placement.
4. Add regression tests for create -> paint/place -> save -> reopen workflow.
