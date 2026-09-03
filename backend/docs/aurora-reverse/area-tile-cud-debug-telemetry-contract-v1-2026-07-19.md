# Area Tile CUD Debug Telemetry Contract V1

Status: active implementation contract.

## Scope and Aurora-first classification

This contract covers Aurora Web observability for Area tile create, update, and
delete operations. It does not define Aurora tile-selection, placement,
rotation, height, material, or camera semantics. Those behaviors continue to
require their existing Aurora-first evidence. The fields below describe only
the state and ordering of Aurora Web's own mutation, contract, renderer, camera,
and proof pipeline.

No xoreos material is used by this contract.

## Mutation trace

Every changed Area tile state must publish one development-only
`aurora-area-tile-mutation-trace/v1` record:

- `operationId`
- `revision`
- `sceneId`
- `startedAt`
- `contractSceneKeyBefore` and `contractSceneKeyAfter`
- `tileStateDigestBefore` and `tileStateDigestAfter`
- `changedTileCount`
- `changedTiles[]`

Each changed-tile entry records the coordinate, change kind, stable scene tile
identity, numeric SET Tile_ID, model resref, orientation, texture rotation, and
height before and after the mutation. The full-state digest must change for any
tile-state delta, including a delta that does not change the unique model-resref
set.

## Contract settlement

`aurora-area-tile-mutation-contract-settlement/v1` is `ready` only when:

1. the trace exists;
2. the viewport-applied revision equals the trace revision;
3. the current contract scene key equals `contractSceneKeyAfter`;
4. the published readiness key equals the current contract scene key;
5. the tile-process request phase is `ready`;
6. readiness is present, has no blocked or pending candidates, and its
   checked/ready counts equal its exact expected count.

Any failed request or blocked candidate produces `blocked`. Missing, stale, or
still-converging state produces `pending`; it must never be promoted to
`ready`.

## Runtime settlement

An accepted runtime proof for the mutation additionally requires:

1. the rendered terrain snapshot carries `tileStateDigestAfter`;
2. terrain status is `ready`;
3. model pending, failed, and bridge counts are zero;
4. material-texture pending and failed counts are zero and every required
   material-texture contract is applied;
5. the camera frame carries the same tile-state digest and was computed after
   that terrain generation;
6. the requested camera mode and coverage checks pass;
7. the captured frame is newer than the mutation and the settled renderer
   observation.

Stable DOM text, a successful request, a matching Area id, or three identical
editing-state polls cannot substitute for these gates.

## Diagnostics and cardinality

The full trace and replay packet are development-only, high-cardinality local
artifacts. Prometheus/OTel labels remain low-cardinality and may contain only
stage, result, and error class. Failures use one of:

- `transport`
- `contract`
- `renderer_model`
- `renderer_material`
- `camera`
- `visual_proof`

Every rejected capture writes its exact failed gates and resume condition.

