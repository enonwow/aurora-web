# Hierarchical Object Mapping Strategy

## Goal
Build a mapping model where each object template is mapped once, reused everywhere, and remapped only when source content changes.

## Core Idea
Use three mapping layers plus one AI layer:
1. Canonical Definition Map (`what object is`).
2. Area Instance Map (`where object is`).
3. Runtime Session Map (`what is loaded now`).
4. AI Knowledge Map (`how objects are used statistically`).

## Layer 1: Canonical Definition Map
This layer stores one normalized definition per template/object source.

### Key
`definitionKey = objectType + ":" + resref + ":" + sourceHash + ":" + pipelineVersion`

### Scope
1. `placeable`
2. `door`
3. `vfx`
4. `creature`
5. `tile`
6. `sound`
7. later: `store`, `encounter`, `trigger`, `waypoint`

### Required Fields (normalized)
1. identity: `objectType`, `resref`, `definitionKey`
2. source info: `sourceKind`, `sourcePath`, `sourceHash`, `builtAt`
3. render payload: model refs, material refs, texture refs, walkmesh refs
4. behavior payload: collision, interaction flags, optional script hooks
5. debug payload: origin file hints, parse warnings, unresolved refs

## Layer 2: Area Instance Map
This layer stores area-specific placement only (no duplicated template data).

### Structure
1. area header: `areaResref`, `areaHash`, `tilesetId`, `contractVersion`
2. chunks: spatial partitions (for example grid cells)
3. instances: each instance references one `definitionKey` plus transform/state

### Instance Record
1. `instanceId`
2. `definitionKey`
3. `position`, `rotation`, `scale`
4. optional `visualTransform`
5. object state (for example lock state, appearance variant, flags)

## Layer 3: Runtime Session Map (Client)
This is an in-memory runtime map for currently open area/session.

### Rules
1. keep loaded definitions and GPU-ready resources in a session registry;
2. reuse by `definitionKey` for all repeated instances;
3. drop scene/session map when leaving area;
4. keep persistent immutable asset cache under global `2 GB` cap policy.

## Layer 4: AI Knowledge Map
This layer converts mapped content into statistics for generation and validation.

### Stored Signals
1. per-area distributions (object counts by class/category);
2. co-occurrence matrices (which objects usually appear together);
3. spatial priors (where classes appear in relation to tiles/regions);
4. style fingerprints by project/module/tileset;
5. optional quality labels from human review.

### Usage
1. generation seed selection;
2. constraint checking (reject impossible combinations);
3. ranking of generated layouts by similarity to accepted project style.

## Mapping Lifecycle
1. ingest source resource and compute `sourceHash`;
2. lookup `definitionKey` in canonical index;
3. if exists: reuse and skip remap;
4. if missing or hash changed: map once and persist canonical definition;
5. build/update area instance map by references only;
6. update AI knowledge aggregates asynchronously.

## Parent Tree Model
Use `tileset` as a structural parent for area assembly:
1. `Tileset Map` defines tile families, edges, constraints, transitions.
2. `Area Map` references one `tilesetId` and contains chunked instances.
3. Object definitions stay global and reusable across many areas.

## Minimal Persistence Layout (backend)
1. `definitions/<objectType>/<definitionKey>.json`
2. `areas/<areaResref>/<areaHash>/manifest.json`
3. `areas/<areaResref>/<areaHash>/chunks/<chunkId>.json|bin`
4. `ai-knowledge/<projectId>/stats/*.json`

## Why This Solves Current Pain
1. no repeated mapping for identical templates;
2. no duplicated heavy payload in area records;
3. stable object identity across frontend/backend/debug tools;
4. clean base for incremental updates and chunk streaming;
5. direct path to AI-assisted generation from structured statistics.

## Test Focus
1. idempotency: remapping unchanged source must not create new definitions;
2. invalidation: sourceHash change must create/update definition correctly;
3. dedupe: repeated instances in area must reference same `definitionKey`;
4. load performance: second area load should show clear map/cache hit gains;
5. determinism: same inputs produce same keys and same manifests.
