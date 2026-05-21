# Render Acceleration Levers

## Goal
Identify practical techniques that can reduce end-to-end location render time and improve runtime smoothness.

## Core Levers
1. Asset compression and transport efficiency:
- Keep texture and geometry payloads compressed in delivery-friendly formats.
- Avoid oversized initial payloads; use manifest-first and chunk streaming.

2. Reuse and deduplication:
- Reuse identical meshes/materials/textures by hash-based identity.
- Prefer instance transforms over duplicate geometry payloads.

3. Instancing and batching:
- Use GPU instancing for repeated objects (same asset, multiple transforms).
- Batch draw calls by material/state to reduce driver overhead.

4. Visibility-driven work reduction:
- Frustum culling.
- Distance-based LOD.
- Optional occlusion culling for dense scenes.

5. Progressive rendering:
- Render nearest/most relevant chunks first.
- Defer far or low-priority assets until interaction-ready state is reached.

6. Async pipeline and parallelism:
- Decode/parse on workers, not on main UI thread.
- Separate stages: fetch -> decode -> prepare buffers -> upload -> draw.

7. Avoid full rebuilds:
- Apply deltas for edits (changed chunks/instances only).
- Keep stage-aware cache keys to prevent global invalidation.

8. Data-oriented scene structures:
- Use compact binary structures for runtime scene data.
- Keep hot render data contiguous and avoid deep object graphs in frame-critical paths.

9. GPU upload discipline:
- Avoid repeated texture/buffer uploads for unchanged assets.
- Use explicit lifecycle for GPU resources to avoid leaks and thrashing.

10. Quality scaling controls:
- Runtime quality profiles for weak hardware (LOD, texture resolution, effects).
- Degrade quality before increasing server work.

11. Prebuilt backend chunk artifacts:
- Precompute chunk-ready scene artifacts for hot areas.
- Serve prebuilt chunks on warm path, rebuild only when invalidated.

## Algorithmic Focus Areas
1. Spatial partitioning for fast chunk/object queries.
2. Stable ordering for deterministic traversal and cache-friendliness.
3. Cost-aware scheduling: prioritize work with highest visual impact per millisecond.
4. Incremental recomputation: recompute only affected regions.

## What To Measure
1. Time to first interactive frame.
2. Time per stage (`fetch`, `decode`, `CPU build`, `GPU upload`, `draw`).
3. Frame time p50/p95 under camera movement.
4. Draw call count and GPU memory usage.
5. Cache hit ratio (asset/chunk/runtime).
