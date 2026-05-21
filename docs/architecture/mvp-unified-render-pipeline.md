# MVP Unified Render Pipeline

## Goal
Prevent render behavior drift across object types by using one shared rendering pipeline instead of separate implementations built from scratch.

## Problem Statement
In prior attempts, generation/render paths for placeables, VFX, doors, and creatures were repeatedly reimplemented.
This caused:
1. inconsistent behavior between object types;
2. duplicated bug fixes;
3. regressions where one type worked while another broke under the same scene conditions.

## MVP Architecture Direction
1. Build a shared `render core` module for common stages.
2. Keep object-type-specific logic in thin adapters only.
3. Route all supported object types through the same core stages.

## Shared Render Core Responsibilities
1. canonical transform handling (position, rotation, scale, visual transform composition);
2. mesh/material/texture resolve orchestration;
3. renderable creation and instance registration;
4. bounds/debug geometry generation;
5. cache-key and cache-lookup flow for immutable/shared assets;
6. common fallback/error handling for unresolved assets.
7. rig/skeleton and animation-clip binding path for rigged model types where applicable.

## Type Adapter Responsibilities (Per Object Type)
1. map source data into a normalized render input shape;
2. provide type-specific metadata and capability flags;
3. avoid duplicating core mesh/material/transform logic.

Supported adapters in MVP:
1. `tile`
2. `placeable`
3. `door`
4. `creature`
5. `vfx`

## Normalized Render Input Contract (MVP)
Each adapter should produce one normalized input shape containing at least:
1. `objectType`
2. `instanceId`
3. `templateResRef`
4. `modelRef` / asset references
5. `worldTransform`
6. optional `visualTransform`
7. render flags/debug metadata

## Pipeline Invariants
1. Same transform rules for all object types.
2. Same material/texture resolution path for all object types where applicable.
3. Same cache policy for equivalent immutable assets.
4. Same debug overlay hooks regardless of object type.
5. Rigged-model animation binding follows one shared rule path (no per-feature ad-hoc animation loaders).

## Performance Requirements
1. Shared assets must be reused across instances (no repeated full rebuild per identical source).
2. Instance updates should be incremental and avoid full scene rebuild.
3. Cache hit behavior must be measurable in telemetry per stage.

## Diagnostics Requirements
1. Every renderable instance should expose:
- source adapter type;
- normalized input id;
- resolved asset ids/hashes;
- final transform and debug flags.
2. Failures should identify whether the issue happened in adapter mapping or shared core stage.

## Test Requirements
1. Unit tests for shared core stages (transform composition, cache keying, fallback paths).
2. Adapter contract tests for each object type (input mapping correctness).
3. Cross-type parity tests:
- same transform/material rule should produce equivalent behavior across types.
4. Regression smoke:
- mixed scene containing tile/placeable/door/creature/vfx renders through one core path without per-type divergence.

## Out Of Scope For This MVP Slice
1. Final plugin-style adapter marketplace.
2. Full runtime hot-reload of adapter modules.
3. Advanced material authoring tools.
