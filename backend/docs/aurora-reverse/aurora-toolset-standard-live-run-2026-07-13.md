# Aurora Toolset standard live run — 2026-07-13

## Result

Run `r6` completed the canonical workflow in one live Aurora Toolset process.
Coverage and strict completion both passed before the one canonical close.
After close there were zero `nwtoolset.exe` processes.

- Ledger: `.codex-tmp/aurora-standard-live-20260713-r6/session-state.json`
- Close result: `.codex-tmp/aurora-standard-live-20260713-r6/close-result.json`
- Final coverage: `true`; final completion: `true`
- Process starts: `1`; second-process events: `0`; close result: `ok=true`
- Module: `the_last_city - codex.mod`, SHA-256 `B774037F160A9BE3FCC0E985DDE880A0AE97E10AF2BF868C38A3F6573CBB021E`
- Area: `_ikea`; source tile: `(index=136,x=8,y=8,tileId=183,orientation=1)`
- Physical proof screen: `\\.\DISPLAY1`, `primary=false`

## Native absolute result

The controller used native Toolset state, not action duration or a visual pose
proxy. The version-pinned binary SHA-256 was
`4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24`.

| Axis | Target | Achieved | Tolerance | Result |
| --- | ---: | ---: | ---: | --- |
| yaw | `45°` | `45.000003°` | `1°` | verified |
| pitch | `45°` | `44.999997°` | `1°` | verified |
| zoom | `25.506776` | `25.506775` | `5%` ratio | verified |
| focus X | `85` | `84.553281` | `1` world unit | verified |
| focus Y | `85` | `85.158407` | `1` world unit | verified |

The closed loop started at yaw `36.000001°`, selected the measured
`rotate-clockwise` response model, predicted `+9°`, and observed `+9.000002°`
with negligible cross-axis deltas. It then returned `status=at_target`.

## Independent Aurora Eye

Aurora Eye remained separate from the command-only controller.

- `before-a` and `before-b`: verified captures of the validated `TScrollBox`;
  comparison produced `changedSamples=0`.
- `after`: verified capture; comparison against `before-a` produced
  `changedSamples=196064`, `changedRatio=0.751249`.
- All three captures report no global cursor, keyboard, or mouse use.

Artifacts are in `.codex-tmp/aurora-standard-live-20260713-r6/closed-loop/eye/`.

## Final acceptance

- Native target evaluator:
  `.codex-tmp/aurora-standard-live-20260713-r6/viewport-targets/_ikea-20260713T135103Z/viewport-target.json`
- Proof packet:
  `.codex-tmp/aurora-standard-live-20260713-r6/proof-packets/_ikea-20260713T135111Z.json`
- Both have `status=verified` and `blockerCodes=[]`.
- Eight focused Jest suites passed: `48/48` tests.
- Canonical close completed at `2026-07-13T13:53:16.726Z`; remaining Toolset process count was `0`.

The earlier `r3` run from the same date was a retained negative proof and did
not complete native readback. It is superseded by this `r6` result; its
artifacts remain untouched for audit history.
