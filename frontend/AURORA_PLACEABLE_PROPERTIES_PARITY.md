# Aurora Placeable Properties Parity Notes

Date: 2026-05-24  
Status: Shell active + limited MVP write path

## Purpose
Define how `Placeable Object Properties` maps to Aurora in phased delivery mode (`Aurora First`).

## Window Scope
This note applies only to default `placeables` (generic placed objects like tables/crates/barrels), not doors, sounds, lights, or VFX-specific editors.

## Aurora Shell Parity
The window mirrors Aurora structure with tabs:
1. `Basic`
2. `Scripts`
3. `Advanced`
4. `Description`
5. `Comments`

## Current Implementation Status (aurora-web)
1. Dialog is currently single-object scoped (`placeables` only).
2. Active persisted fields:
   - `Name`
   - `Tag`
   - `Appearance Type` (`resRef`)
   - `Static`
3. `Apply/OK/Cancel` are wired through `sceneViewportPort.setPlaceablePropertiesByIds`.
4. Non-basic tabs are parity shells with explicit Post-MVP message content.
5. Disabled basic flags (`Plot`, `Useable`, `Has Inventory`) are UI placeholders only (no persistence yet).

## Control Activation States (Current)
### `ACTIVE_NOW`
1. `Basic -> Name`
2. `Basic -> Tag`
3. `Basic -> Appearance Type` (mapped to `resRef`)
4. `Basic -> Static` checkbox
5. Action buttons:
   - `Apply` (apply + keep open),
   - `OK` (apply + close),
   - `Cancel` (restore snapshot from dialog open).

### `POST_MVP_DISABLED`
1. `Basic -> Plot`
2. `Basic -> Useable`
3. `Basic -> Has Inventory`
4. `Basic -> Hardness / Hit Points / Fortitude Save / Reflex Save / Will Save`
5. Full behavior inside tabs:
   - `Scripts`,
   - `Advanced`,
   - `Description`,
   - `Comments`.

## Persistence Contract (Current)
`ACTIVE_NOW` controls are persisted through scene facade/port mutation flow (`sceneViewportPort -> sceneMutationsFacade`), with history commit semantics compatible with undo/redo.

## Static + Adjust Location Rule
1. `Static = true`: `Adjust Location -> Visual Transforms` values are visible and saved, but renderer ignores them (base transform only).
2. `Static = false`: renderer applies stored `Adjust Location -> Visual Transforms` values.

## Follow-up Work
Code now:
1. Promote `Plot/Useable/Has Inventory` from disabled UI to preserve-only payload fields.
2. Introduce script-slot schema (preserve-only first) in scene contract and mutation facade.
3. Add tab-by-tab activation plan with tests per promoted control.
4. Decide whether dialog remains single-object or gets multi-selection semantics for parity.

Retail-hard-confirm later:
1. Lock canonical field names/polarity for unresolved placeable fields (`Reflex Save`, `No Interrupt`, `Treasure Model`, script visibility edge-cases).
