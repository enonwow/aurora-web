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

## Current Implementation Status (aurora-web)
Status: `IMPLEMENTED` (MVP), with known deltas.

Implemented now:
1. Dialog shell and controls are live in viewport runtime.
2. `Apply` commits and keeps dialog open; `OK` commits and closes.
3. `Cancel` restores object placement snapshot captured at dialog open.
4. Multi-selection is supported; one apply step updates all selected editable targets.
5. `Bearing` input accepts full-turn value (`360`) and keeps it stable in UI.
6. `Visual Transforms` are visible only when all edited objects are in visual-transform-eligible kinds (`placeables`, `creatures`, `items`).

Notable current delta from strict parity target:
1. Static placeables are still movable via generic move flows (keyboard/gizmo); only visual-transform rendering is gated by `Static`.
2. Field clamp/precision rules are currently generic MVP clamps, not final Aurora hard-confirm values.

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

Implementation note (2026-05-24):
1. In current frontend code, `Adjust Location` is available for movable non-door kinds (`placeables`, `creatures`, `items`, `sounds`), not only static objects.

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

Current guardrail coverage in code:
1. Door guardrails are implemented and tested (context menu + mutation-level transform blocking).
2. Static-object generic-move guardrail is not yet enforced.

## Open Questions (to close with next evidence)
1. Numeric ranges, clamping rules, and precision/step constraints for:
   - `X`, `Y`, `Z`, `Bearing`
   - `Scale`, `X/Y/Z Rotation`, `X/Y/Z Translation`

## Backlog Hooks
Code now:
1. Enforce static-placeable move policy in generic transform/arrow move paths.
2. Add regression tests for repeated `Apply` and multi-selection restore history semantics.

Retail-hard-confirm later:
1. Finalize exact numeric clamps/precision and orientation-dial snapping math from retail evidence.
