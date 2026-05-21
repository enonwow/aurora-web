# Client-First Runtime Strategy

## Goal
Support many concurrent users without server GPU/RAM exhaustion by moving rendering and heavy visual execution to the browser client.

## Principle
- Client computes visuals.
- Server ships data and coordinates state.

## Server Responsibilities (thin runtime)
1. Authentication and authorization.
2. Project/session state management.
3. Resource indexing, streaming, and caching.
4. Persistence and versioning.
5. Optional async jobs only for non-interactive heavy tasks.

## Client Responsibilities (heavy runtime)
1. Scene composition and rendering (WebGL/WebGPU).
2. Camera controls and visual interaction.
3. Local decode/transform for render-ready assets.
4. Progressive loading and level-of-detail behavior.
5. Runtime diagnostics for FPS, memory use, and dropped frames.

## Safety Guardrails
1. No default server-side render path for interactive features.
2. Payload budgets and streaming chunks are required for large assets.
3. Browser-side memory limits and fallback modes are required.
4. Server-side rate limits and request budgets are required per user/session.
5. Expensive tasks must be cancellable and observable.

## Fallback Policy
1. If client hardware is weak, degrade quality first (LOD/resolution/effects), not server offload by default.
2. Any server offload mode must be opt-in and explicitly limited.

## Validation Targets
1. Multi-session smoke test with at least 2-5 concurrent users.
2. Client FPS/memory telemetry under representative scenes.
3. Server memory and CPU stability under concurrent read/stream load.
