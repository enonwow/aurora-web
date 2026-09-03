# Aurora Eye — controlled live proof runbook

Status: prepared, not executed. This is the only permitted order for the first
live packet. A failed **lane** writes its blocker and stops only that lane; the
same healthy Toolset session remains open for the remaining independent tests.
Only a fatal condition (Access Violation/recovery, invalid process ownership,
wrong module, or a dead/unresponsive process) ends the session through the
canonical closer.

## Preconditions

- The approved module hash is unchanged.
- No active or orphaned ledger exists; run `reconcile` first if needed.
- The module frame is on physical `\\.\DISPLAY1` and is non-primary.
- Exactly one `nwtoolset.exe` process exists after canonical `open`.
- No Access Violation, recovery, quarantine, or loading dialog is present.
- The Area viewer and its `TScrollBox` match the observation dimensions.

## Packet sequence

1. `preflight`, `open`, and `run-queue` open exactly one approved Area.
2. `observe` writes `scene-observation.json`, including viewport PNG and its
   monitor evidence.
3. Use `select-aurora-toolset-source-tile-no-global-input.mjs plan` to reject
   an unsafe/stale projection before any click. `execute` is allowed only with
   both explicit gates; it captures before/after, checks the selection outline,
   and restores `Select Objects`.
4. `record-source-selection --selectionProof <selection-proof.json>` records
   the verified transaction in the session ledger.
5. Gather the required source-targeted samples; derive full yaw, then record it
   with `record-camera-calibration --cameraCalibration <yaw.json>`.
6. Gather three measured camera response transitions per camera primitive;
   estimate the response model. The closed-loop controller dispatches one
   primitive then requires a fresh observation.
7. `verify-viewport-target` consumes the ledger's latest selection proof and
   yaw calibration. It must be `verified` within target tolerances.
8. `assemble-proof-packet` consumes the observation's monitor evidence and
   rejects any missing Tile, camera, centring, or display proof.
9. `close` must leave no Toolset process or modal dialog.

## Session-fatal stop conditions

- any window on the primary display;
- process count other than one;
- stale projection or a click outside the viewport (stop selection lane);
- selection outline missing, pre-existing, or not containing the click (stop selection lane);
- missing numeric camera result or response model (stop that calibration lane);
- failed `Select Objects` rollback (stop selection/control lane);
- any Access Violation/recovery/quarantine signal.

An Eye capture rejection, a missing calibration sample, or a target outside
tolerance is evidence for a failed lane, not a reason to close an otherwise
healthy Toolset session. Keep the one session open, record the failure in its
ledger, complete every independent safe test, then close once.
