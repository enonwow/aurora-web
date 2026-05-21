# MVP Area Editing Capabilities

## Scope
This document defines the expected MVP capabilities for area editing workflows in `aurora-web`.
Runtime avatar navigation details are defined in `mvp-player-avatar-navigation-and-camera.md`.
Selection behavior details are defined in `mvp-selection-modes-and-multi-select.md`.
Render settings and debug viewport controls are defined in `mvp-render-settings-and-debug-visualization.md`.
Shared rendering architecture constraints are defined in `../architecture/mvp-unified-render-pipeline.md`.
Panel layout and UX consistency constraints are defined in `mvp-panel-layout-and-ux-system.md`.
Client-side map capture/export requirements are defined in `mvp-client-side-map-capture-and-filters.md`.
Creature animation preview requirements are defined in `mvp-creature-animation-preview.md`.
AI-assisted draft generation requirements are defined in `mvp-ai-location-generation-connector.md`.
Local save and role-based list visibility requirements are defined in `mvp-local-draft-save-and-list-visibility.md`.
Aurora placeable properties UI audit is captured in `../brainstorm/aurora-ui-audit-placeable-object-properties.md`.
Aurora creature properties UI audit is captured in `../brainstorm/aurora-ui-audit-creature-properties.md`.
Aurora area creation and tile palette UI audit is captured in `../brainstorm/aurora-ui-audit-area-creation-tile-palette.md`.
Aurora door properties UI audit is captured in `../brainstorm/aurora-ui-audit-door-properties.md`.
Aurora viewport mouse controls audit is captured in `../brainstorm/aurora-ui-audit-viewport-mouse-controls.md`.
Aurora paint tool coverage audit is captured in `../brainstorm/aurora-ui-audit-paint-tool-coverage.md`.
Aurora object context-menu audit is captured in `../brainstorm/aurora-ui-audit-object-context-menu.md`.
Aurora top toolbar controls audit is captured in `../brainstorm/aurora-ui-audit-top-toolbar-controls.md`.

## Core MVP Capabilities
1. Load area.
2. Create area.
3. Modify area.
4. Select scene objects with mode filters, multi-select, and rectangle select.
5. Use render/debug settings to inspect scene composition and non-rendered elements.
6. Work with collapsible side panels without losing editing continuity.
7. Generate top-down PNG map outputs from loaded area using client-side capture flow.
8. Preview creature animation clips in inspection mode for validation workflows.
9. Load and review AI-generated draft areas in normal editor flow.
10. Assign script references to core script slots for:
- area;
- placeable;
- creature.
- door.
11. Support `Undo/Redo` for active area editing session operations.

## Paint Tool Coverage (MVP)
1. Supported paint tools:
- `Paint Terrain`
- `Paint Creatures`
- `Paint Door`
- `Paint Items`
- `Paint Placeable`
- `Paint Sounds`
2. Not in MVP scope:
- `Paint Start Location`
- `Paint Encounter`
- `Paint Merchant`
- `Paint Triggers`
- `Paint Waypoints`
3. Unsupported paint tools must be visibly disabled in the UI and marked as post-MVP.
4. Supported paint tools require local save -> reload parity in MVP.

## Area Creation Workflow (MVP Mandatory)
1. Area creation with tileset and dimensions is mandatory in MVP.
2. Tile authoring palette must include:
- `Features`
- `Groups`
- `Terrain`
3. Users must be able to:
- place single-feature tiles;
- place group/prefab tile sets;
- place/paint terrain entries;
- erase/replace tile content.
4. Tile placement/edit actions must apply incrementally (no full-area rerender by default).
5. Create -> tile author -> local save -> reopen parity is required in MVP.

## Object Placement Capabilities
1. Place and edit:
- creatures;
- placeables;
- doors;
- VFX instances;
- items;
- sounds.
2. Select object and view editable object context.
3. MVP object browser panel details are defined in `mvp-object-browser-and-previews.md`.
4. Add/remove/edit object operations must apply as incremental scene mutations.
5. Door baseline in MVP:
- add/place door in area;
- full mesh/texture rendering path is required;
- open door properties in inspector flow.

## Sound Object Workflow (MVP Baseline)
1. Sound objects can be placed, selected, moved, and deleted in area editing flow.
2. Sound object properties must be available through inspector/properties flow (at least core identity + placement fields).
3. Advanced sound-authoring parity can be staged after MVP, but MVP must preserve save/reopen integrity for placed sound objects.

## Adjust Location Workflow (Aurora-Parity Style)
1. Support drag-based repositioning for selected objects.
2. Support bearing updates for heading control.
3. Support axis-based rotation around object-local axes when applicable.
4. Adjust operations must update only affected object instances, not full-area scene rebuild.

## Object Context Menu (MVP)
1. `RMB` on object opens object context menu.
2. Supported context actions in MVP:
- `Adjust Location`
- `Delete`
- `Variables`
- `Properties`
3. Out-of-scope context actions must be visible as disabled and marked `Post-MVP`.

## Visual Transform Workflow
1. Support visual transform controls (translation/rotation/scale as defined by feature scope).
2. Preserve and expose the distinction between:
- physical/world anchor location;
- visual transformed location.
3. When selecting an object with visual transform, UI must clearly show correlation between:
- where the object physically exists in world data;
- where it is currently rendered visually.
4. Rotation around object-local axes for visual behavior should be handled through visual transform controls where applicable.

## UX Requirements
1. Selection panel must show both anchor coordinates and visual transform values.
2. `Adjust Location` interaction must be available from object selection flow.
3. Visual feedback should make transformed objects easy to diagnose during editing.
4. Entering object preview/inspection must preserve active area state and allow immediate return without full rerender.

## Diagnostics Requirements
1. Object debug snapshot must include:
- area id/resref;
- object identity (type, tag, template);
- anchor transform;
- visual transform;
- final rendered transform.
2. This is required for fast troubleshooting when a specific tile/object/VFX appears wrong.

## Script Scope Boundary (MVP)
1. MVP includes script-slot assignment only (bind existing script references to supported slots).
2. Full script authoring/editor workflows are out of MVP scope.
3. Full dialog/conversation authoring workflows are out of MVP scope.

## Placeable Script Slots (MVP Coverage Target)
Placeable script-slot assignment should cover the Aurora placeable event surface captured in project audit:
1. `OnClick`
2. `OnClose`
3. `OnDamaged`
4. `OnDeath`
5. `OnHeartbeat`
6. `OnDisturbed`
7. `OnLock`
8. `OnPhysicalAttacked`
9. `OnOpen`
10. `OnSpellCastAt`
11. `OnUnLock`
12. `OnUsed`
13. `OnUserDefined`

## Creature Script Slots (MVP Coverage Target)
Creature script-slot assignment should cover the Aurora creature event surface captured in project audit:
1. `OnBlocked`
2. `OnCombatRoundEnd`
3. `OnConversation`
4. `OnDamaged`
5. `OnDeath`
6. `OnDisturbed`
7. `OnHeartbeat`
8. `OnPerception`
9. `OnPhysicalAttacked`
10. `OnRested`
11. `OnSpawn`
12. `OnSpellCastAt`
13. `OnUserDefined`

## Door Script Slots (MVP Coverage Target)
Door script-slot assignment should cover the Aurora door event surface captured in project audit:
1. `OnAreaTransitionClick`
2. `OnClose`
3. `OnDamaged`
4. `OnDeath`
5. `OnFailToOpen`
6. `OnHeartbeat`
7. `OnLock`
8. `OnPhysicalAttacked`
9. `OnOpen`
10. `OnSpellCastAt`
11. `OnUnLock`
12. `OnUserDefined`

## Door Area Transition Workflow (Post-MVP Candidate)
1. MVP does not require full door transition/link workflow.
2. Door transition configuration may be visible as UX shell, but advanced behavior is deferred.
3. If transition fields are shown in MVP UI, unavailable parts must be explicitly marked `Post-MVP`.
