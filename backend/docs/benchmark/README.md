# Benchmark Notes

Concise runbook for benchmarking the current cache + delivery flow used by frontend integration.

## Prerequisites

- Backend dependencies installed.
- API reachable (default `http://localhost:3000`).
- Runtime settings configured with valid module source and blob storage.
- Test users available (`admin.user`, `builder.user`) when using in-memory auth defaults.

## 1) Rebuild module cache (texture index included)

This refresh uploads module snapshot and writes texture index file:
`__aurora/meta/texture-index.v1.json`.

```bash
curl -X POST "http://localhost:3000/api/v1/settings/runtime/module-cache/rebuild?forceFull=false" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

## 2) Smoke-test texture index API (admin)

Summary:

```bash
curl "http://localhost:3000/api/v1/settings/runtime/module-cache/textures/summary" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

Query:

```bash
curl "http://localhost:3000/api/v1/settings/runtime/module-cache/textures?resref=tno01_w01&limit=10&offset=0" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

Expected:
- `data.available=true` after successful rebuild,
- `data.entries[]` contains resolved texture records (`objectKey`, `sha256`, `source`).

## 3) Smoke-test placeable delivery contract

1. Process one placeable to get `cache.key`:

```bash
curl -X POST "http://localhost:3000/api/v1/catalog/placeables/process" \
  -H "Authorization: Bearer <BUILDER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d "{\"templateId\":\"<PLACEABLE_TEMPLATE_ID>\",\"bypassCache\":false,\"includeBenchmarkMetadata\":true}"
```

2. Read delivery contract:

```bash
curl "http://localhost:3000/api/v1/catalog/placeables/cache/<CACHE_KEY>/assets/contracts" \
  -H "Authorization: Bearer <BUILDER_TOKEN>"
```

3. Download one asset via `deliveryPath`:

```bash
curl -L "http://localhost:3000/api/v1/catalog/placeables/cache/<CACHE_KEY>/assets/<ASSET_ID>" \
  -H "Authorization: Bearer <BUILDER_TOKEN>" \
  -o out.bin
```

## 4) Run API integration benchmark (test profile)

This benchmark runs full HTTP flows through Nest app routes, but it is not a full environment E2E run.
It uses the local test profile (for example `NODE_ENV=test`) to keep runs stable and repeatable.

From `backend/`:

```bash
npm run bench:cache:integration
```

Useful tuning flags:

```bash
npm run bench:cache:integration -- \
  --maxCandidatesPerType 10 \
  --processBypassIterations 10 \
  --processHitIterations 10 \
  --cacheReadIterations 10 \
  --assetDeliveryIterations 10 \
  --maxTotalRequests 700 \
  --save true \
  --output docs/benchmark/cache-e2e-benchmark-custom.json
```

Script output is JSON with:
- global route-group latencies (`p50/p95/p99`),
- per-type summaries,
- per-candidate results (including asset delivery status).
- stability metadata (`requestedConfig`, `effectiveConfig`, `stability`) for auto-scaling/trim decisions.

Notes:
- Script now auto-scales iteration counts when requested load exceeds `--maxTotalRequests`, to avoid process crashes on overloaded local runs.
- Backward-compatible `config` key remains in output and contains effective iteration values.
- Deprecated alias: `npm run bench:cache:e2e` currently points to `bench:cache:integration` for backward compatibility.

## 5) Run algorithm benchmark suite (placeable/tile/sound/area + queue)

From `backend/`:

```bash
npm run bench:algorithms
```

Profiles:

```bash
npm run bench:algorithms -- --profile small
npm run bench:algorithms -- --profile medium
npm run bench:algorithms -- --profile large
```

Useful overrides:

```bash
npm run bench:algorithms -- \
  --profile medium \
  --maxCandidatesPerType 10 \
  --iterations 120 \
  --warmupIterations 15 \
  --areaLoadIterations 20 \
  --areaLoadWarmupIterations 3 \
  --areaIterations 60 \
  --areaCacheReadIterations 160 \
  --queueJobs 80 \
  --queuePollMs 100 \
  --queueTimeoutMs 45000
```

By default script saves JSON to:
`backend/docs/benchmark/algorithm-benchmark-<timestamp>.json`.

`results.areas` now includes:
- `load` (area list/detail read path, includes snapshot parse and repository hydration),
- `cold`/`warm` processing,
- `cacheRead` endpoint latency.

Disable saving:

```bash
npm run bench:algorithms -- --save false
```
