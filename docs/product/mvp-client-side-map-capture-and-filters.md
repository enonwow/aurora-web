# MVP Client-Side Map Capture And Filters

## Goal
Generate area map images directly in the web client to avoid backend rendering load and provide fast map-output workflows.

## Core MVP Requirements
1. Provide a `Generate Map` action for the currently loaded area.
2. Before capture, user can choose visible render layers (for example placeables, VFX, creatures, doors, tiles).
3. Default state: all major layers are enabled for rendering.
4. Capture uses top-down camera framing:
- full area visible;
- centered framing;
- top view at `90 deg` (orthographic-style map capture target).
5. Export output format: `PNG`.

## Camera And Framing Rules
1. Use area bounds to automatically fit full location in frame.
2. Maintain deterministic map orientation per area profile.
3. Preserve coordinate consistency for map usage:
- lower-left map reference corresponds to area origin convention (`0,0`) for supported area profiles.

## Filter Pipeline (MVP)
1. User can select filter preset before export:
- `None` (raw capture),
- optional stylized presets (for example sketch/map-like look).
2. Filter processing should run on client side (GPU shader or canvas pipeline).
3. No mandatory backend image processing for baseline map export path.

## Performance And UX Requirements
1. Map capture should not force full area reload.
2. Capture should work with active render layer toggles from render settings.
3. Capture flow should be predictable:
- set layers -> set filter -> generate PNG.
4. Long captures (if any) should show progress/status in UI.

## Diagnostics And Telemetry Requirements
1. Record capture telemetry:
- capture resolution;
- active layer set;
- selected filter;
- capture duration.
2. Record failures with actionable reason categories:
- camera framing error;
- capture/export failure;
- filter pipeline failure.

## Test Requirements
1. Unit tests:
- layer selection state mapping to capture config;
- filter preset selection logic.
2. Integration tests:
- full-area top-down framing correctness;
- PNG export produced with selected filter and layers.
3. Regression smoke:
- load area -> generate raw map -> generate filtered map -> verify no scene reload and valid output.

## Implementation Notes
1. This MVP feature is client-first and should not depend on Python runtime.
2. If needed, optional backend/offline map generation can be designed later as a separate mode.
