# MVP Prebuilt Chunk Artifacts (Backend)

## Goal
Reduce runtime load latency by precomputing chunk-ready scene artifacts on backend, instead of rebuilding chunk data from scratch on every request.

## Short Answer
Yes. Prebuilding chunk artifacts is a recommended optimization for this project, as long as invalidation is deterministic and storage lifecycle is controlled.

## Why This Helps
1. Removes repeated CPU-heavy transform/package work from hot request path.
2. Improves `TTFR` and full scene ready time, especially on warm cache.
3. Stabilizes multi-user behavior by serving identical prepared artifacts for the same scene version.

## Backend Modes
1. `cold build`:
- no matching prebuilt artifact exists;
- backend builds chunk artifacts and stores them.

2. `warm hit`:
- matching artifact already exists;
- backend serves manifest/chunks directly from artifact storage.

3. `rebuild`:
- source area/assets changed or pipeline version changed;
- backend rebuilds only affected artifacts (prefer incremental rebuild).

## Artifact Identity And Invalidation
Each prebuilt artifact key should include:
1. `areaResRef`
2. content hash of area/object inputs
3. relevant asset hash set (or aggregate hash)
4. chunking strategy version
5. render/pack pipeline version
6. texture/quality mode (when it changes output)

If any key component changes, artifact is treated as a new version.

## Storage Strategy
1. Do not rely on container writable layer for persistence.
2. Store artifacts in durable storage reachable by all replicas.
3. Keep optional fast local cache layer for hottest artifacts.
4. Apply retention and quota policies (TTL/LRU or release-based cleanup).

## Contract Implications
1. Manifest should reference immutable chunk URLs or IDs derived from artifact key.
2. Response metadata should expose artifact mode (`cold`, `warm`, `rebuild`) for telemetry.
3. Chunk contracts remain stable regardless of whether source is freshly built or prebuilt.

## Operational Safeguards
1. Build queue with concurrency limits to avoid rebuild storms.
2. Single-flight deduplication for identical build requests.
3. Graceful fallback: if prebuilt read fails, system can rebuild and recover.
4. Versioned pipeline rollout to avoid mixing incompatible artifacts.

## Benchmarks And Acceptance
For primary benchmark `wwv_crypt_1` and secondary `wnd_sewers_port`, measure:
1. `cold build` vs `warm hit` latency.
2. Per-stage timings (`build`, `manifest`, `chunk fetch`, `decode`, `GPU upload`, `render`).
3. Backend CPU impact difference between on-demand build and prebuilt serve.
4. Cache hit ratio and rebuild frequency.

## Risks To Control
1. Stale artifact serving if invalidation is weak.
2. Storage growth if retention policy is missing.
3. Build stampede under concurrent first access.
4. Hidden compatibility bugs when pipeline versions change.

## Test Requirements
1. Unit tests:
- artifact key generation determinism;
- invalidation decision logic.

2. Integration tests:
- cold -> warm transition correctness;
- source change triggers new artifact and does not serve stale chunks.

3. Regression tests:
- compare output parity between on-demand build and prebuilt serve for same inputs.
