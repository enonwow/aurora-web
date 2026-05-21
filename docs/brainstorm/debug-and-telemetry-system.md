# Debug And Telemetry System Plan

## Goal
Create a robust diagnostics system that speeds up implementation and issue triage instead of blind investigation.

## Feature Workflow Policy
1. Write tests for the feature scope.
2. Add debug and telemetry hooks for that scope.
3. Implement the feature behavior.

## Debug Capabilities (Development Only)
POC parity and extension details for render toggles are defined in `../product/mvp-render-settings-and-debug-visualization.md`.

1. Object pick inspector:
- Click a tile/object/creature/door/VFX instance and open debug details.
- Double-click object rows from browser lists to open the same inspector context without unloading active area scene.

2. JSON export for diagnosis:
- Export selected item as JSON diagnostic snapshot.

3. Inspector actions panel:
- In inspector mode, expose object properties and debug actions in the left-side panel.
- Inspector actions must not force full-area rerender.

4. Context-rich snapshot fields:
- `areaResref`
- `chunkId`
- `tileId` and tile grid position
- `objectType`
- `objectTag`
- `templateResRef`
- `instanceId`
- world transform (`position`, `rotation`, `scale`, visual transform values)
- material/texture references and resolution state
- source artifact hashes
- pipeline stage timestamps/status flags

5. Targeted diagnostics by issue class:
- missing tile geometry;
- broken/missing VFX;
- creature without texture/material;
- transform mismatch;
- unresolved asset reference.
- object type misclassification (tile/placeable/VFX/creature/door).
- creature animation/skeleton binding failure.

## Telemetry Capabilities
1. Stage timings:
- `catalog`
- `build`
- `manifest`
- `chunk fetch`
- `decode`
- `CPU prepare`
- `GPU upload`
- `first interactive render`

2. Error taxonomy:
- transport errors
- decode/parse errors
- asset resolution errors
- render pipeline errors

3. Correlation:
- request/trace id across backend and frontend.
- link telemetry events to object/area context where possible.

4. Performance counters:
- request count and transfer volume
- cache hit ratio (client/backend)
- frame-time p50/p95
- backend CPU/RAM and client memory

## Production Safety
1. Debug UI and debug endpoints are disabled in production by default.
2. Debug exports are not exposed in production runtime.
3. Production keeps telemetry needed for reliability/performance monitoring, without interactive debug overhead.

## Validation
1. Test that debug mode can be enabled in development and is fully disabled in production.
2. Test object pick + JSON export for representative object types.
3. Test diagnostic completeness for known issue classes (tile, VFX, creature textures).
4. Test telemetry event coverage for all required stages.
5. Test that production path works without debug features enabled.
