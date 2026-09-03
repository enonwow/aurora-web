# Aurora Toolset fast rerun proof — 2026-07-13

## Verdict

The claim that the completed Aurora workflow can be repeated faster is proven
by a fresh live run, `r7`.

| Run | Ledger start | Canonical close | Duration |
| --- | --- | --- | ---: |
| discovery/completion `r6` | `2026-07-13T12:58:57.068Z` | `2026-07-13T13:53:16.726Z` | `3259.658 s` (`54.33 min`) |
| fresh rerun `r7` | `2026-07-13T14:25:52.575Z` | `2026-07-13T14:38:06.872Z` | `734.297 s` (`12.24 min`) |

Measured speed-up: `4.44x`; elapsed time reduction: `77.5%`.

The clock is derived directly from `session-state.createdAt` and
`closeResult.completedAt`. It excludes neither Toolset startup nor the
fail-closed recovery work performed during the rerun.

## Live result

- one Toolset process start: PID `45452`;
- zero second-process events;
- module `the_last_city - codex.mod`, Area `_ikea`;
- exact source tile `(index=136,x=8,y=8,tileId=183,orientation=1)`;
- physical proof display `\\.\DISPLAY1`, `primary=false`;
- native target evaluator: `verified`, zero blockers;
- final proof packet: `verified`, zero blockers;
- canonical close: `ok=true`; remaining `nwtoolset.exe`: `0`.

Achieved native state:

```text
yaw      45.000003 degrees
pitch    44.999997 degrees
zoom     25.803117 (target 25.506776, inside 5 percent tolerance)
focus    84.871000, 84.669308 (target 85,85, inside 1 world unit per axis)
```

The final controller transaction used a freshly measured three-sample short
yaw model. It predicted `+6°`, observed `+6.000002°`, and reached the target in
one correction. Cross-axis deltas were negligible.

Aurora Eye measured:

- stable baseline changed ratio: `0.000100` (`0.0100%`);
- commanded effect changed ratio: `0.742659` (`74.2659%`);
- effect-to-baseline separation: approximately `7427x`.

## Fail-closed events retained in the timing

The rerun was not a curated happy path. The first long-step staging controller
stopped when it reached yaw `42°` and lacked a verified inverse model for the
remaining `-6°` error. The same responsive PID was retained. A three-sample
`10 ms` yaw model was then measured live (`+6°` median) and used by the final
controller.

Repeated baseline captures also proved that an exact-zero visual-noise rule is
not stable: idle pairs contained `3–64` changed samples out of `260984`.
Acceptance now uses an explicit `0.1%` baseline noise ceiling while retaining
the existing `1%` minimum effect threshold. A regression test rejects baseline
noise above that ceiling. This correction and its tests are included in the
measured `12.24 min`.

## Artifacts

- Ledger: `.codex-tmp/aurora-standard-live-20260713-r7/session-state.json`
- Open proof: `.codex-tmp/aurora-standard-live-20260713-r7/open-proofs/module-open-20260713T142644Z.png`
- Observation: `.codex-tmp/aurora-standard-live-20260713-r7/observations/_ikea-20260713T142715Z/scene-observation.json`
- Selection proof: `.codex-tmp/aurora-standard-live-20260713-r7/source-selection/selection-proof.json`
- Short yaw samples/model: `.codex-tmp/aurora-standard-live-20260713-r7/native-response/yaw-short/`
- Final core result: `.codex-tmp/aurora-standard-live-20260713-r7/closed-loop/core-result.json`
- Aurora Eye: `.codex-tmp/aurora-standard-live-20260713-r7/closed-loop/eye/`
- Target evaluation: `.codex-tmp/aurora-standard-live-20260713-r7/viewport-targets/_ikea-20260713T143714Z/viewport-target.json`
- Proof packet: `.codex-tmp/aurora-standard-live-20260713-r7/proof-packets/_ikea-20260713T143724Z.json`

Three focused suites passed `16/16` tests after the rerun changes. Syntax
checks passed for the controller, target evaluator, and proof-packet library.
