# MVP Render Settings And Debug Visualization

## Goal
Preserve proven render/debug controls from the POC and extend them into a structured diagnostics panel for fast scene troubleshooting.

## POC Baseline To Preserve (MVP)
The following controls from the current POC are preserved in MVP as baseline behavior.

### Render Toggles
1. `Wireframe`
2. `Textures`
3. `Grid`
4. `Bounds`
5. `Axes (X/Y/Z)`
6. `Hide ceilings`
7. `Hidden meshes`
8. `Show non-render meshes`
9. `Area placeables`
10. Layer visibility toggles for map/editor workflow:
- `Tiles`
- `Placeables`
- `VFX`
- `Creatures`
- `Doors`
- `Items`
- `Sounds`

### Render Option
1. `Texture compression` selector (for example `UASTC`, and other supported modes).

### Player Debug Block (MVP)
1. `Walker (MVP)` enable/disable.
2. `Third-person camera (orbit)` toggle.
3. `First-person camera` toggle.
4. `Set Spawn By Click`.
5. `Clear Spawn Override`.

## Extended Debug Visualization Requirements
1. Add object-type overlays to quickly identify what is selected/rendered:
- tile classification;
- placeable classification;
- VFX classification;
- creature classification;
- door classification.

2. Add visual helpers for diagnostics:
- renderable vs non-renderable distinction;
- transform/bounds overlays per selected object;
- optional color-coded category overlay for scene elements.

3. Debug overlays must work with current selection mode and multi-select workflows.

## UX Requirements
1. Render settings panel must remain usable while area is loaded (no forced scene reload).
2. Toggle state changes should apply immediately and incrementally.
3. Panel should show active-toggle count (for quick state awareness).
4. Defaults should favor readability/performance for normal editing; heavy debug views are opt-in.
5. Render settings panel must support collapse/expand and preserve toggle state when reopened.
6. Default layer-visibility state is enabled for all primary scene layers; users may disable layers before map capture/export workflows.
7. `Show all` visibility action is supported in MVP.
8. `Show none` visibility action is out of MVP scope.

## Performance And Safety Requirements
1. Debug-heavy overlays must be implemented as development-first features.
2. Expensive overlays should be independently toggleable to avoid unnecessary frame-time cost.
3. Production builds keep non-essential debug overlays disabled by default.

## Aurora Preview/Atmosphere Controls (Pending Estimation)
1. The following Aurora-style controls are tracked but not yet committed to MVP scope:
- `Display shadows`
- `Display fog`
- `Use area lighting`
- `Play ambient sound`
- `Play ambient music in area`
- `Play placed sound object in area`
- `Show preview window`
2. These controls require separate effort estimation and should stay behind explicit feature flags until approved.
3. If architecture benchmarking shows high cost (especially shadow generation), controls can be postponed to post-MVP.

## Diagnostics And Telemetry Requirements
1. Debug snapshot should capture active render/debug toggle state.
2. Telemetry should capture timing impact for major debug toggles in dev benchmarks.
3. Benchmark reports should include at least:
- baseline frame-time without debug overlays;
- frame-time with key debug overlays enabled.

## Test Requirements
1. Unit tests:
- render toggle state management;
- mutual exclusivity rules where applicable.

2. Integration tests:
- toggles update viewport without full-area rerender;
- toggle combinations remain stable during camera move and object selection.

3. Regression smoke:
- load area -> enable/disable core toggles -> verify stable interaction and no scene reload.
