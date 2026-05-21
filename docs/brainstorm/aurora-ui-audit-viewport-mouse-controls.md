# Aurora UI Audit - Viewport Mouse Controls

## Purpose
Capture baseline mouse-control behavior observed in Aurora viewport to preserve editing ergonomics in `aurora-web`.

## Evidence Source
1. User-provided viewport screenshot in this thread.
2. User-confirmed interaction mapping:
- left mouse button for selection,
- middle mouse button for camera rotation.
3. User-confirmed: right mouse button on object opens object context menu.
4. User-confirmed selection by holding left mouse button (`LMB` hold).

## Observed Control Baseline
1. `LMB` (`Left Mouse Button`) is used for selecting objects/targets in viewport.
2. `MMB` (`Middle Mouse Button`) is used for rotating/orbiting the camera.
3. `RMB` (`Right Mouse Button`) on object opens context menu actions.
4. `LMB` press-and-hold keeps selection interaction active (continuous selection behavior).

## MVP Mapping
1. This control mapping is an MVP baseline requirement for editor usability parity.
2. If additional camera gestures are introduced, they must not break this baseline mapping.
3. `RMB` context invocation must not conflict with `LMB` selection and `MMB` orbit.
4. Any temporary deviation must be explicit in UI and documented as non-parity behavior.

## Test Baseline
1. Verify `LMB` selection still works after camera movement.
2. Verify `MMB` orbit does not mutate selection state unexpectedly.
3. Verify `RMB` on object opens context menu for selected target type.
4. Verify `LMB` hold selection behavior remains stable across active tool modes.
5. Verify selection + camera controls remain stable across active tool modes.
