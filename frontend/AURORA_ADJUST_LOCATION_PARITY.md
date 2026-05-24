# Aurora Adjust Location Parity Notes

Date: 2026-05-24
Source: Aurora screenshot + user clarification in this thread.

## Purpose
Lock the expected Aurora behavior for the `Adjust Location` workflow and static-object movement constraints.

## Confirmed UI Surface (`Adjust Location`)
1. `Position` section:
   - `X`
   - `Y`
   - `Z`
2. `Orientation` section:
   - `Bearing`
   - orientation preview panel
3. Action buttons:
   - `Apply`
   - `OK`
   - `Cancel`

## Dialog Variants
1. Base variant:
   - `Position` + `Orientation` only.
2. Extended variant:
   - same base sections plus `Visual Transforms` section.
3. `Visual Transforms` fields (extended variant):
   - `Scale`
   - `X Rotation`
   - `Y Rotation`
   - `Z Rotation`
   - `X Translation`
   - `Y Translation`
   - `Z Translation`

## Confirmed Semantics
1. `Adjust Location` is used for objects treated as static (non-transform-flow objects).
2. For `placeable` objects, `Static` checkbox controls this lane:
   - `Static = true`: object is static (no generic visual-transform workflow).
   - `Static = false`: object is non-static and can participate in visual transform flow.
3. `creature` objects are non-static by default.
4. Button behavior:
   - `Apply`: applies changes and keeps the dialog open.
   - `OK`: applies changes and closes the dialog.
   - `Cancel`: discards pending dialog edits and restores values from the dialog-open snapshot.
5. `Visual Transform` is not a separate dialog; it is an extended form of `Adjust Location`.
6. For `placeable` objects:
   - `Static = true` -> `Visual Transforms` values are still saved, but renderer ignores them (object uses base transform).
   - `Static = false` -> renderer applies stored `Visual Transforms` values.
7. `door` context menu does not expose `Adjust Location`.
8. `Apply`/`OK`/`Cancel` semantics remain the same in both base and extended variants.
9. Edit-history behavior for this dialog is step-based (`Undo/Redo` by edit step, not as one grouped drag gesture).

## Multi-Selection Semantics
1. `Adjust Location` is allowed for multi-selection (operator-responsibility model).
2. Multi-selection `Adjust Location` applies entered values to all selected objects in one commit step.
3. `Visual Transforms` visibility for multi-selection:
   - show when all selected objects are eligible kinds for visual transforms (`placeables`, `creatures`, `items`),
   - for mixed static/non-static placeables, values are still editable/saved; runtime applies them only where `Static = false`.
4. If selection includes `door`, generic move/transform restrictions still apply (no parity override for door anchor rules).
5. `Cancel` restores all selected objects to the dialog-open snapshot.
6. `Undo/Redo` for multi-selection edits is step-based (one committed step affecting all selected objects).

## Gizmo Translation Semantics
1. Gizmo translation is delta-based (relative), not absolute overwrite.
2. Moving selected objects along axis `X/Y/Z` applies the same axis delta to each selected object's current location.
3. Example:
   - object current `X = 10`,
   - gizmo move applies `deltaX = +2`,
   - resulting `X = 12`.
4. After gizmo commit, opening `Adjust Location` must show updated absolute coordinates.
5. Multi-selection gizmo move commits as one history step for the whole selection move.

## Gizmo Bearing Rotation Semantics
1. Gizmo rotate mode targets `bearing` (yaw around world `Y` axis).
2. Rotation is delta-based (relative), applied to each selected object's current `bearing`.
3. Multi-selection rotation uses one shared delta and commits as one history step.
4. If selection includes `door`, generic rotate gizmo remains blocked by door anchor rules.

## Editor Guardrails
1. Static objects should not be moved via generic transform gizmo flow.
2. Static-object location changes should route through `Adjust Location` semantics.
3. `Static` state must be explicit in object metadata and preserved in roundtrip.
4. `door` move/edit flows must not assume context-menu `Adjust Location` availability.

## Open Questions (to close with next evidence)
1. Numeric ranges, clamping rules, and precision/step constraints for:
   - `X`, `Y`, `Z`, `Bearing`
   - `Scale`, `X/Y/Z Rotation`, `X/Y/Z Translation`
