# VFX debug telemetry contract v1

Status: active for development-only VFX diagnosis. This contract does not assert an Aurora runtime semantic.

## Boundary

`aurora-vfx-runtime-observability/v1` is an in-memory, exportable frontend diagnostic report. It is not a backend metric event and it must not be sent through the generic telemetry facade. Resource names, URLs, object ids, draw records, and cache keys are high-cardinality diagnostic data.

The report is exposed only by development VFX routes. Production profiles disable the visual overlay and do not expose a debug endpoint or UI control.

## Runtime build identity

`GET /health` adds `runtimeBuild` without changing the v1 envelope:

```json
{
  "commit": "string | null",
  "imageDigest": "string | null",
  "builtAt": "ISO-8601 | null",
  "processStartedAt": "ISO-8601",
  "contractVersion": "string",
  "vfxRuntimeRevision": "string"
}
```

The frontend supplies its compile-time commit/image/build fields. The report also records the existing VFX cache key. Missing provenance is a `runtime-build-identity-missing` blocker; it is never synthesized from browser time or a payload hash.

## Required report sections

1. `identity`: frontend/backend build identity, process start, contract version, cache key.
2. `hostGraph`: expected payload static/emitter/light branches, actually attached branches, composition mode/reason, and mismatch list.
3. `assetSettlement`: one bounded row per expected model/texture/chunk resource with `expected -> requested -> decoded -> cached -> bound`, timing, observed HTTP status, retries, and final error.
4. `drawLedger`: canonical draw-record id, emitter, lane, particle/vertex counts, bounds, texture reference, blend, and depth-write state.
5. `particleShaderLedger`: one bounded representative row per canonical particle draw record observed during the current playback. Each row records its sampled frame/time, active retail soft-depth gate and scalar, framebuffer-depth identity, fog branch, and shader-application state. A later zero-size fade must not replace an earlier enabled soft-depth sample. The post-playback phase is `postplayback-retained-coverage`; it is coverage evidence across the single playback, not a claim that all retained rows existed in one frame.
6. `playbackGuard`: playback id, trigger count, `loop`, overlap count, duration, elapsed state, terminal state, and post-duration state. A comparison runner sets `postDurationHiddenRequired=true` only for its final `post` phase. In that phase, a completed playback must also report `postDurationHidden=true`; otherwise the report fails with `post-duration-playback-not-hidden`. Terminal-frame captures at exactly the duration do not request that extra condition.
7. `proofGate`: explicit pass/fail and a blocker manifest. Pending, failed, unknown, fallback, duplicate, overlapping, stale, or timed-out state cannot pass.
8. `debugOverlay`: development-only origin/axis, parent-child line, bounds, and RGB/RGBA preview state. It is forced off for `final` profile captures.

The retained collection is one report per runtime refresh and one row per asset/draw record; it must not append unbounded rows per animation frame. Reusing the same runtime root for a new playback must clear or replace its retained shader coverage before that playback can become proof-ready.

## Proof relationship

The report is diagnostic evidence, not parity proof. A proof capture needs a fresh settled report plus the exact PNG/MP4 artifact required by the proof safety contract. When the gate fails, save the report's blocker manifest instead of promoting a capture.

## Post-duration consistency

`postDurationHidden` is an Aurora Web playback-observation fact, not an assertion about an unresearched Aurora implementation detail. The renderer owns the distinction: it records `completed=true` at the terminal frame and records `postDurationHidden=true` only when asked to seek strictly beyond that frame. The comparison runner must pass its raw logical effect time to the renderer; it must not pre-clamp it before the seek. The capture validator independently rejects a final comparison whose phase is `post` but whose playback guard does not report hidden frames.
