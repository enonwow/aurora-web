# Aurora UI Audit - Top Toolbar Controls

## Purpose
Capture MVP support decisions for Aurora-style top toolbar actions in `aurora-web`.

## Analysis Timestamp
- 2026-05-21 (Europe/Warsaw)

## File/Module Actions (Left Side)
1. `Create New Module` - not supported in MVP.
2. `Open Existing Module` - not supported in MVP.
3. `Save` - supported in MVP as local draft save (`local workspace`), not direct production publish.
4. `Undo` - supported in MVP.
5. `Redo` - supported in MVP.

## Navigation/Camera Actions
1. `Go To Start Location` - not supported in MVP.
2. `Reorient Camera` - supported in MVP (top-down orientation baseline used for map workflows).

## Selection Mode Actions
1. `Select Terrain` - supported in MVP.
2. `Select Object` - supported in MVP, with object-type scopes.
3. Supported object-type scopes:
- `Placeable`
- `Creature`
- `Door`
- `Item`
- `Sound`
4. Not in MVP object-type scopes:
- `Encounter`
- `Merchant`
- `Trigger`
- `Waypoint`
- `Start Location`

## Visibility Filter Actions
1. `Show Creatures` - supported in MVP.
2. `Show Doors` - supported in MVP.
3. `Show Encounters` - not supported in MVP.
4. `Show Items` - supported in MVP.
5. `Show Merchants` - not supported in MVP.
6. `Show Placeables` - supported in MVP.
7. `Show Sounds` - supported in MVP.
8. `Show Triggers` - not supported in MVP.
9. `Show Waypoints` - not supported in MVP.
10. `Show Start Location` - not supported in MVP.
11. `Show All` - supported in MVP.
12. `Show None` - not supported in MVP.

## Preview/Atmosphere Toolbar (Estimation Pending)
1. `Display Shadows` - effort/priority pending.
2. `Display Fog` - effort/priority pending.
3. `Use Area Lighting` - effort/priority pending.
4. `Play Ambient Sound` - effort/priority pending.
5. `Play Ambient Music In Area` - effort/priority pending.
6. `Play Placed Sound Object In Area` - effort/priority pending.
7. `Show Preview Window` - effort/priority pending.
8. If benchmarking confirms high cost (for example shadow/fog impact), this block moves to post-MVP.

## UX Constraints
1. Unsupported actions should be visible as disabled and marked `Post-MVP`.
2. Supported actions should update viewport state incrementally without full-area rerender.
3. Toolbar state should stay synchronized with left-side panel state and active selection scope.
