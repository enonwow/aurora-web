# Cache E2E Benchmark Contract

## Scope
This note defines the benchmark contract shared by backend and frontend for cache E2E runs (`scripts/run-cache-e2e-bench.ts`).

## Route groups
The benchmark always reports these route groups in `routeGroups` and `routeGroupsByType`:
- `processBypass`: processing request with `bypassCache=true` (cold-like path).
- `processHit`: processing request with `bypassCache=false` after priming.
- `cacheRead`: direct read from cached endpoint (`/cache/:cacheKey`).
- `assetDelivery`: delivery endpoint path for cached assets (currently placeable flow).

Each route group summary is:
- `count`
- `p50Ms`
- `p95Ms`
- `p99Ms`

## Delivery fallback statuses
`assetDelivery` per candidate may be skipped with status:
- `unsupported_type`: candidate type has no delivery route (non-placeable).
- `no_manifest_assets`: placeable cache payload has no `assetManifest.assets`.
- `endpoint_unavailable`: delivery probe did not return HTTP 200.
- `executed`: delivery iterations were measured.

Important interpretation:
- `routeGroups.assetDelivery.count = 0` does **not** mean benchmark failure by itself.
- It means no candidate reached `status=executed` (all were fallback/skipped).
- To interpret correctly, always read:
  - `totals.delivery.eligibleCandidates`
  - `totals.delivery.executedCandidates`
  - `totals.delivery.skippedByReason`

## Local run command (template)
Run from `backend/`:

```powershell
$env:NODE_ENV="test"
npx ts-node --transpile-only scripts/run-cache-e2e-bench.ts `
  --maxCandidatesPerType 1 `
  --processBypassIterations 5 `
  --processHitIterations 8 `
  --cacheReadIterations 10 `
  --assetDeliveryIterations 6 `
  --maxTotalRequests 700 `
  --save true `
  --output docs/benchmark/cache-e2e-benchmark-<yyyy-mm-dd>.json
```

Alternative (same script through npm):

```powershell
$env:NODE_ENV="test"
npm run bench:cache:e2e -- --maxCandidatesPerType 1 --processBypassIterations 5 --processHitIterations 8 --cacheReadIterations 10 --assetDeliveryIterations 6 --maxTotalRequests 700 --save true
```

## Expected JSON output keys
Top level:
- `generatedAt`
- `timing` (`startedAt`, `finishedAt`)
- `config`
- `requestedConfig`
- `effectiveConfig`
- `stability`
- `totals`
- `routeGroups`
- `summaryByType`
- `routeGroupsByType`
- `perCandidate`

Required nested contract keys:
- `config`: `maxCandidatesPerType`, `processBypassIterations`, `processHitIterations`, `cacheReadIterations`, `assetDeliveryIterations`
- `requestedConfig`: includes requested iterations + `maxTotalRequests`
- `effectiveConfig`: effective iterations + estimated request count after scaling
- `stability`: scaling/trim flags + pre/post estimate
- `totals`: `candidates`, `requests`, `delivery`
- `totals.delivery`: `eligibleCandidates`, `executedCandidates`, `skippedByReason`
- `routeGroups`: `processBypass`, `processHit`, `cacheRead`, `assetDelivery`
- `routeGroupsByType`: `placeable`, `creature`, `item`, `area`
- `perCandidate[]`: `type`, `id`, `cacheKey`, `processBypass`, `processHit`, `cacheRead`, `assetDelivery`
- `perCandidate[].assetDelivery`: always `status`, `cacheKey`, `requestCount`; optional `reason`, `assetId`, `routePath`, `metrics`

## Stability semantics
- If requested workload exceeds `maxTotalRequests`, the script auto-scales iteration counts down.
- If scaled workload still exceeds `maxTotalRequests`, script trims candidates while keeping at least one candidate per type.
- This keeps local runs repeatable and prevents native process crashes during heavy loops.
