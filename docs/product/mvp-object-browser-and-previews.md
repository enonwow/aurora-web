# MVP Object Browser And Preview Panel

## Goal
Provide an Aurora-style left-side browser panel for selecting and placing objects into an area workflow.

## MVP Panel Capabilities
1. Category tabs:
- `Placeables`
- `Monsters` (creatures)
- `VFX`
- `Doors`
- `Items`
- `Sounds`

2. List behavior:
- searchable/filterable list;
- drag-to-scene placement;
- visible object label + compact technical identifier/resref.

3. Preview behavior:
- each row can show a model preview thumbnail;
- preview is generated from a 3D model render to PNG;
- if preview is missing, show explicit fallback state (`NO PREVIEW`).
4. Double-click behavior:
- double-clicking an object row opens object preview/inspection mode for that object.
5. Inspector panel behavior:
- in object preview/inspection mode, the left panel exposes object properties and debug actions for the selected object.
6. Creature animation preview behavior:
- when selected object is a creature/rigged model, preview mode exposes animation clip list and playback controls.
- animation playback must run without forcing full-area rerender/reload.

## Preview Cache Strategy
1. Preview images may be cached on backend to avoid repeated regeneration.
2. Preview cache keys should be content-based (model/material/hash sensitive).
3. Preview cache should support invalidation when source model/assets change.

## UX Requirements
1. Fast scrolling and filtering for large lists (thousands of rows).
2. Progressive preview loading (do not block list interaction).
3. Drag-and-drop placement should work even if preview image is not available yet.
4. Object preview/inspection mode must not force leaving or reloading the currently loaded area.
5. Object preview should be presented as non-destructive UI mode (for example overlay, split view, or side workspace), preserving fast return to the active area.
6. Entering and leaving object preview/inspection must not trigger full-area rerender.
7. Browser panel must support collapse/expand behavior and quick restore for viewport-focused work.

## Additional Aurora Object Types (Roadmap For This Panel)
1. `Waypoints`
2. `Triggers`
3. `Encounters`
4. `Stores`

## Notes
1. Preview generation is a usability feature, not a hard dependency for placement logic.
2. Placement and editing must remain functional without previews.
3. Preview mode is for inspection/debug and cannot reset active area editing state.
