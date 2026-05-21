# Benchmark Reference Area

## Selected Primary Benchmark
1. Area resref: `wwv_crypt_1`
2. Role: primary stress benchmark for first render and end-to-end scene pipeline.

## Selection Rationale
1. Placeables: `2890` (`rank #1/169`).
2. Tile count: `384` (`rank #7/169`).
3. Combined heaviness/complexity score: `rank #1/169`.

## Important Note
1. Largest tile map by tile count is `wnd_sewers_port` (`725` tiles).
2. Despite that, overall heavier benchmark area is `wwv_crypt_1` and it remains the primary reference.
3. `wnd_sewers_port` is the secondary benchmark for large tile-map stress tests.

## Benchmark Usage Policy
1. `wwv_crypt_1` is the default benchmark target for regression and optimization tracking.
2. Additional secondary benchmarks may be added later, but they do not replace the primary reference without explicit decision.
