# Stage 1 Container Integration Benchmarks

## Stage Objective
Validate data exchange and baseline performance between two containers before deeper optimization work:
1. Frontend container.
2. Backend container.

## Execution Order For Stage 1
1. Define benchmark tests.
2. Add required debug and telemetry instrumentation.
3. Execute implementation and optimization changes.

## Benchmark Locations
1. Primary: `wwv_crypt_1` (`384` tiles, `2890` placeables).
2. Secondary: `wnd_sewers_port` (`725` tiles, large tile map stress case).

## Test Matrix
1. Cache mode:
- `off`
- `cold`
- `warm`

2. Payload strategy:
- `full payload`
- `manifest + chunks`

3. Chunk preparation mode:
- `on-demand chunk build`
- `prebuilt chunk artifact`

4. Concurrent sessions:
- `1`
- `2`
- `5`

## Required Measurements
1. `TTFR` (time to first render / first interactive frame).
2. Full scene ready time.
3. Stage timings:
- `fetch`
- `decode`
- `CPU prepare/build`
- `GPU upload`
- `draw/render`
4. Transfer volume (MB) and request count.
5. Cache hit ratio (client and backend).
6. Backend CPU/RAM usage.
7. Client memory usage.
8. Backend artifact mode ratio (`cold build`, `warm hit`, `rebuild`).

## Acceptance Direction (Stage 1)
1. Establish repeatable baseline numbers for both locations.
2. Confirm that `manifest + chunks` outperforms or matches `full payload` under equivalent conditions.
3. Confirm warm-cache gains versus cold-cache.
4. Confirm stability under `2` and `5` concurrent sessions.
5. Confirm `prebuilt chunk artifact` mode outperforms `on-demand chunk build` under equivalent payload strategy.

## Notes
1. This stage is about measurement discipline and architecture validation, not final peak performance.
2. Results from this matrix become the baseline for regression gates in later stages.
