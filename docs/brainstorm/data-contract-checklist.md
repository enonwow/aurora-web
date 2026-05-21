# Data Contract Checklist

## Purpose
Define mandatory contract requirements so data transfer remains fast, stable, and predictable.

## Gate: Implementation Blocker
1. If this checklist is incomplete for a feature scope, implementation is blocked.

## Contract Definition Checklist (v1)
1. Contract scope and ownership are defined.
2. Request/response schema is versioned.
3. Stable IDs are defined for areas, tiles, objects, and assets.
4. Content hash strategy is defined for cache and invalidation.
5. Incremental update format is defined (delta semantics).
6. Pagination/chunking strategy is defined for large payloads.
7. Streaming order is defined (manifest first, heavy assets on demand).
8. Retry/idempotency behavior is defined.
9. Error model and partial-failure behavior are defined.
10. Compatibility policy is defined (major/minor contract behavior).
11. Backend prebuilt-chunk artifact strategy is defined (identity key + invalidation + storage policy).

## Payload Performance Checklist
1. Initial payload budget is defined (target size for first paint).
2. Per-chunk payload budget is defined.
3. Compression strategy is defined.
4. Client parse/decode budget is defined.
5. End-to-end timing targets are defined per stage.

## Validation Checklist
1. Baseline benchmark scenario is fixed (`wwv_crypt_1`, `384` tiles, `2890` placeables).
2. Contract conformance tests exist.
3. Determinism checks exist for repeated runs.
4. Regression smoke tests include data-transfer scenarios.
5. Performance benchmarks include transfer + parse + render timings.
