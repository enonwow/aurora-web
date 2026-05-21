# MVP Player Avatar Navigation And Camera

## Goal
Allow users to quickly validate how an area feels in runtime by controlling a player avatar directly inside the loaded scene.

## Scope Safety Warning
1. This MVP slice targets controllable avatar behavior, not full NWN player-model animation parity.
2. Current expected baseline is movement/control stability with fallback-capable runtime behavior.
3. Full parts-assembly + skeleton clip parity is tracked separately and considered post-MVP unless scope is expanded in architecture stage.
4. See `../brainstorm/player-model-animation-pipeline-warning.md`.

## Core MVP Requirements
1. Spawn a default player avatar at any chosen position in the currently loaded area.
2. Support keyboard movement with `W`, `A`, `S`, `D`.
3. Provide two camera modes for the controlled avatar:
- third-person view;
- first-person view.
4. Switching camera mode must be immediate and must not trigger full-area rerender.

## Default Avatar Definition (MVP)
1. Use one predefined baseline player avatar profile (for example human body setup).
2. Visual fidelity of this avatar is not a blocker for MVP.
3. Priority is stable control, predictable transforms, and accurate scene-scale perception.

## Spawn And Control Behavior
1. Avatar control is available only when an area is already loaded.
2. Avatar can be spawned/repositioned in arbitrary area locations for quick validation.
3. Avatar movement updates only the controlled entity state and required local scene subsets.
4. Avatar actions must not force full scene rebuild or scene reload.

## Camera Behavior
1. Camera follows the controlled avatar in both modes.
2. First-person mode should provide player-eye perspective for scale/readability checks.
3. Third-person mode should provide spatial navigation and composition checks.
4. Camera mode changes must preserve active scene state, selection context, and editing session continuity.
5. Viewport mouse baseline parity:
- `MMB` (`middle mouse button`) is used for camera orbit/rotation behavior.
- Camera orbit input must not break `LMB` selection baseline.

## Diagnostics Requirements
1. Debug snapshot for controlled avatar should include:
- active area id/resref;
- avatar preset id;
- world position and rotation;
- camera mode and camera transform.
2. Telemetry should capture:
- avatar spawn/reposition latency;
- camera mode switch latency;
- movement update stability metrics (frame-time impact in dev benchmarks).

## Test Requirements
1. Unit tests:
- movement input mapping (`WASD`) to expected movement vectors/state changes;
- camera mode state switching logic.
2. Integration tests:
- spawn/reposition in loaded area without full-area rerender;
- camera mode switching without area reload.
3. Regression smoke:
- baseline flow: load area -> spawn avatar -> move -> switch camera modes -> continue area interaction.

## Out Of Scope For This MVP Slice
1. Character customization UI.
2. Advanced animation/state machine parity with full NWN player pipeline.
3. Multiplayer avatar synchronization logic.
