# Cache E2E Benchmark - 2026-05-25

- Generated at: `2026-05-25T18:39:52.841Z`
- Candidates: `4`
- Requests: `97`

## Config
- `maxCandidatesPerType`: `1`
- `processBypassIterations`: `5`
- `processHitIterations`: `8`
- `cacheReadIterations`: `10`
- `assetDeliveryIterations`: `6`

## Route Groups (ms)
- `processBypass`: count=`20` p50=`3.0398` p95=`4.22` p99=`4.6674`
- `processHit`: count=`32` p50=`2.912` p95=`4.4278` p99=`4.442`
- `cacheRead`: count=`40` p50=`2.9526` p95=`4.032` p99=`4.529`
- `assetDelivery`: count=`0` p50=`0` p95=`0` p99=`0`

## Delivery Coverage
- Eligible candidates: `1`
- Executed candidates: `0`
- Skipped `placeable_manifest_has_no_assets`: `1`

## Command
```powershell
$env:NODE_ENV="test"
npx ts-node --transpile-only scripts/run-cache-e2e-bench.ts --maxCandidatesPerType 1 --processBypassIterations 5 --processHitIterations 8 --cacheReadIterations 10 --assetDeliveryIterations 6
```
