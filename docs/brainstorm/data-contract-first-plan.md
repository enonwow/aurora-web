# Data Contract First Plan

## Why This Is Stage 1
The first architecture priority is a stable data-exchange contract between backend and frontend.  
Without this, performance work becomes random and hard to reproduce.

## Main Problem Statement
- Reference benchmark area: `wwv_crypt_1` (`384` tiles, `2890` placeables).
- Previous rendering times were around `2-5 minutes` in early iterations.
- Aurora baseline for comparable workflow is about `20-30 seconds`.

## Stage 1 Objective
Define and lock the data contract and orchestration flow before deeper renderer optimization.

## Performance Target Direction
1. Short-term target: reduce area load/render pipeline to under `60s`.
2. Mid target: reach `30-40s` on representative scenes.
3. Parity target: approach Aurora baseline (`20-30s`) for comparable scope and quality.

## Contract Design Priorities
1. Manifest-first delivery (small metadata first, heavy assets on demand).
2. Stable object identity and versioning (content hash + pipeline version).
3. Incremental updates (changed subsets only, no full re-transfer by default).
4. Deterministic payload schema for parser/renderer interop.

## Pipeline Control Priorities
1. Explicit stages: resolve -> parse -> transform -> package -> stream -> render.
2. Stage-level timings and diagnostics must be recorded.
3. Cache keys must be stage-aware to avoid invalidating everything on small changes.
4. Backend should support prebuilt chunk artifacts so hot-path requests avoid full rebuild work.

## Validation Scenario (Baseline Benchmark)
1. Use the fixed primary benchmark area: `wwv_crypt_1`.
2. Benchmark metadata baseline: `384` tiles, `2890` placeables.
3. Record end-to-end time and per-stage timing.
4. Compare current build vs previous build and vs Aurora reference.
5. Treat regressions as blocking for performance-sensitive features.
