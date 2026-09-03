# Aurora Toolset live completion audit — 2026-07-13

## Verdict

`12/12 verified`. This verdict is based on the live `r6` ledger and saved
PNG/JSON artifacts, not on implementation, tests, or narration alone.

## Acceptance ledger

| # | Requirement | Live evidence | Verdict |
| ---: | --- | --- | --- |
| 1 | Exact-module preflight | `session-state.json`: exact approved module path and SHA, clean preflight, no unsafe override | verified |
| 2 | One session, PID-first recovery | one `toolset_process_started` event for PID `20328`; zero second-process events; the same responsive process was recovered by targeted z-order raise | verified |
| 3 | Physical proof display | open proof and all Eye JSON: `\\.\DISPLAY1`, `primary=false` | verified |
| 4 | Correct module and Area | window title identifies `the_last_city - codex.mod`; live Area `_ikea`; validated `TfrmViewerArea`/`TScrollBox` | verified |
| 5 | Safe Toolset state | targeted window messages only; no global cursor/keyboard/mouse; no AV/recovery/modal blocker in accepted transactions | verified |
| 6 | Live observation | validated `1291x807` viewport PNG and `scene-observation.json` with Toolset ownership and source context | verified |
| 7 | Exact source tile | source-targeted proof for `(136,8,8,183,1)`; differential outline has `818` newly blue pixels and contains the targeted click | verified |
| 8 | Yaw model | 3 native samples; median response `+9°`; other axes zero after readback noise floor | verified |
| 9 | Pitch model | 3 native samples; median response `-6.000002°`; other axes zero after noise floor | verified |
| 10 | Zoom model | 3 native samples; median log-ratio `-0.113476849`; other axes zero | verified |
| 11 | Absolute focus and closed loop | target `(yaw=45,pitch=45,zoom=25.506776,centre=85,85)` reached in one measured correction; native evaluator has no blockers | verified |
| 12 | Independent packet and one close | Eye baseline `0`, effect `196064` / `0.751249`; proof packet verified; coverage and completion true; canonical close left `0` processes | verified |

## Core proof

Source: `.codex-tmp/aurora-standard-live-20260713-r6/closed-loop/core-result.json`.

```text
status       at_target
provenance   native_toolset
yaw          45.000003 degrees
pitch        44.999997 degrees
zoom         25.506775
centre       84.553281, 85.158407
source tile  x=8, y=8
corrections  1
```

The correction predicted yaw `+9°` from the three-sample response model and
observed `+9.000002°`. Observed cross-axis changes were pitch `+0.000001°`,
zoom log-ratio `-0.000000118`, centre X `-0.000004`, centre Y `+0.000003`.

## Proof artifacts

- Session ledger: `.codex-tmp/aurora-standard-live-20260713-r6/session-state.json`
- Open PNG: `.codex-tmp/aurora-standard-live-20260713-r6/open-proofs/module-open-20260713T125955Z.png`
- Observation: `.codex-tmp/aurora-standard-live-20260713-r6/observations/_ikea-20260713T130020Z/scene-observation.json`
- Source selection: `.codex-tmp/aurora-standard-live-20260713-r6/source-selection/selection-proof.json`
- Yaw model: `.codex-tmp/aurora-standard-live-20260713-r6/native-response/yaw/model.json`
- Pitch model: `.codex-tmp/aurora-standard-live-20260713-r6/native-response/pitch/model.json`
- Zoom model: `.codex-tmp/aurora-standard-live-20260713-r6/native-response/zoom/model.json`
- Closed-loop core: `.codex-tmp/aurora-standard-live-20260713-r6/closed-loop/core-result.json`
- Eye PNG/JSON and comparisons: `.codex-tmp/aurora-standard-live-20260713-r6/closed-loop/eye/`
- Target evaluation: `.codex-tmp/aurora-standard-live-20260713-r6/viewport-targets/_ikea-20260713T135103Z/viewport-target.json`
- Final packet: `.codex-tmp/aurora-standard-live-20260713-r6/proof-packets/_ikea-20260713T135111Z.json`
- Close result: `.codex-tmp/aurora-standard-live-20260713-r6/close-result.json`

## Verification and omissions

Eight focused Jest suites passed `48/48` tests, including native absolute-target
acceptance and fail-closed rejection when Aurora Eye has no changed-after
effect. `node --check` passed for the changed session, evaluator and packet
scripts.

No Toolset configuration, INI, MRU, or stored window position was changed.
One targeted non-activating z-order raise was used after another application
obscured `DISPLAY1`; the Toolset window position and physical display were not
changed. The visual Tile Properties dialog does not expose a Tile_ID field, so
exact identity is proven by source layout plus the source-targeted native-centre
transaction and differential fresh-outline evidence; the audit does not claim
a nonexistent Tile_ID UI readback.

There are no remaining blockers for this requested live standard run.
