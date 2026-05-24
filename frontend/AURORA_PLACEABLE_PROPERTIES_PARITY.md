# Aurora Placeable Properties Parity Notes

Date: 2026-05-24  
Status: Initial shell + MVP controls

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
1. Promote selected `POST_MVP_DISABLED` controls to `PRESERVE_ONLY` once payload shape is finalized.
2. Extend tab behavior incrementally with dedicated tests per promoted control.
