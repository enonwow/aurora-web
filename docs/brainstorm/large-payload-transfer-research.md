# Large Payload Transfer Research (Web, FE/BE)

## Scope
Best practices for transferring large scene/asset payloads (100MB-300MB+), with focus on:
1. Real bottlenecks.
2. Practical architecture patterns.
3. Test strategy and regression gates.

## Real Problems
1. Monolithic scene payloads delay first render and increase failure blast radius.
2. Unclear HTTP partial-delivery behavior causes fallback to full downloads.
3. Weak cache strategy causes revalidation storms instead of cache hits.
4. Cross-instance cache inconsistency appears in Docker multi-replica setups.
5. Texture/mesh formats are too heavy for transfer and GPU upload.
6. Missing telemetry hides where time is lost (`network`, `decode`, `GPU upload`, `render`).

## Proven Solutions
1. Contract pattern:
- `manifest-first`, then chunk/data on demand.
- Immutable hashed asset URLs.
- Explicit contract/schema versioning.

2. Transfer pattern:
- Use HTTP range semantics (`Range`, `206`, `Content-Range`, `If-Range`) for partial delivery where appropriate.
- Keep progress channel separate (SSE/events), data channel binary/streaming.
- Prefer browser streaming (`fetch` + streams), with worker-based decode/off-main-thread processing.

3. Cache pattern:
- Content-addressed assets (hash key).
- `Cache-Control` with long-lived immutable assets, plus `ETag` validation path.
- For Docker and scaling: do not rely on container writable layer for persistent cache.
- Recommended deployment shape for large caches: `L1` local fast cache + `L2` durable shared/object storage (+ CDN).

4. Asset format pattern:
- Use runtime-efficient 3D delivery formats and compression extensions (`KTX2/BasisU`, mesh compression extensions) to cut bandwidth and client memory pressure.

## How To Test (Mandatory Gates)
1. Contract gate:
- OpenAPI/JSON Schema validation in CI.
- Backward-compatibility tests between contract versions.

2. Transfer gate:
- Automated tests for `206`, `416`, `Content-Range`, `If-Range`.
- Retry/backoff behavior tests for `429`/`503` and partial failures.

3. Cache gate:
- Repeated-run cache-hit tests (`ETag`/immutable behavior).
- Hash invalidation correctness tests (changed asset -> new hash URL).

4. Performance gate:
- Fixed benchmark scenario (primary reference: `wwv_crypt_1`, `384` tiles, `2890` placeables).
- Stage timings (`manifest`, `chunk fetch`, `decode`, `GPU upload`, `render`).
- Regression fail threshold for end-to-end render time increase.

5. Observability gate:
- Client Resource Timing + server `Server-Timing`.
- OpenTelemetry HTTP and stage-level instrumentation.

## Practical Recommendation
1. Do not ship full scene JSON as default.
2. Finalize contract v1 around `manifest + chunks + immutable assets`.
3. Treat cache persistence and invalidation as first-class architecture (not implementation detail).
4. Keep `main` protected by contract/perf regression gates.

## Primary References
- RFC 9110 (HTTP Semantics): https://www.rfc-editor.org/rfc/rfc9110
- RFC 9111 (HTTP Caching): https://www.rfc-editor.org/rfc/rfc9111
- RFC 8246 (`immutable` cache-control extension): https://www.rfc-editor.org/rfc/rfc8246
- RFC 9114 (HTTP/3): https://www.rfc-editor.org/rfc/rfc9114
- RFC 9000 (QUIC): https://www.rfc-editor.org/rfc/rfc9000
- MDN Range Requests: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Range_requests
- MDN ETag: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/ETag
- MDN Cache-Control: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control
- MDN Fetch Streaming: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
- MDN Resource Timing: https://developer.mozilla.org/docs/Web/API/Performance_API/Resource_timing
- MDN Server-Timing: https://developer.mozilla.org/docs/Web/HTTP/Reference/Headers/Server-Timing
- MDN SSE: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
- Docker Volumes: https://docs.docker.com/engine/storage/volumes/
- Docker Storage Drivers: https://docs.docker.com/engine/storage/drivers/
- OpenAPI Specification: https://spec.openapis.org/oas/
- JSON Schema Specification: https://json-schema.org/specification
- OpenTelemetry HTTP Metrics: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- k6 Thresholds: https://grafana.com/docs/k6/latest/using-k6/thresholds/
- Khronos glTF: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html
- Khronos KTX 2.0: https://registry.khronos.org/KTX/specs/2.0/ktxspec.v2.html
- glTF `KHR_texture_basisu`: https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_texture_basisu/README.md
- glTF `KHR_draco_mesh_compression`: https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_draco_mesh_compression/README.md
