# Aurora Toolset viewport-target standard

Status: active fail-closed process standard. It combines the canonical Toolset
session, Aurora Scene Observer, source-backed tile identity, and camera target
verification. A toolbar hold, blue outline, or image difference is never a
successful target by itself.

## Canonical workflow

```text
preflight -> open -> run-queue -> observe -> record-source-selection -> record-camera-calibration -> verify-viewport-target -> assemble-proof-packet -> close
```

The last four steps are commands of `aurora-toolset-session.mjs`, not separate
live workflows. `reconcile` is the explicit safe recovery command for an
active session ledger whose Toolset process is gone.

## Required target

Every target records one exact source tile (`index`, `x`, `y`, `Tile_ID`,
orientation), full world yaw `0 <= yaw < 360`, pitch, visual zoom in pixels per
tile, and yaw/pitch/zoom/centring tolerances.

The target is verified only when all of these have direct evidence:

1. exact tile-selection evidence matches the source tile: either a direct
   Toolset readback, or a complete source-targeted visual selection transaction;
2. full world yaw, pitch, and zoom are within tolerance; and
3. the selected tile centre is inside the viewport-centre tolerance.

## Deliberate blockers

- `toolset_selected_tile_identity_unavailable`: neither direct Toolset identity
  nor a complete source-targeted visual transaction exists. A blue outline by
  itself is insufficient.
- `camera_world_yaw_readback_unavailable`: modulo-90 visual yaw is not a world
  angle.
- `camera_pose_readback_unavailable`: button duration cannot create a numeric
  pitch or zoom.
- `toolset_selection_center_unavailable`: a generic outline does not prove a
  selected-tile centre.

No camera action is dispatched by the evaluator. It writes a target artifact
and stops fail-closed until the missing readbacks exist.

## Commands

```powershell
npm run areas:toolset-session -- observe --sourceModulePath <decompiled-module-directory>

npm run areas:toolset-session -- verify-viewport-target `
  --tileX 1 --tileY 1 --tileId 197 --orientation 1 `
  --yawDegrees 135 --pitchDegrees 68 --zoomPixelsPerTile 143
```

The verifier creates both a fresh source tile-layout and `viewport-target.json`
in the session output directory, then records the result in `session-state.json`.
The implementation is `lib/aurora-toolset-viewport-target-standard.mjs`.

`assemble-proof-packet` is the final offline gate. It requires the session
ledger, viewport observation, target report, and exact tile-selection proof.
Monitor evidence is persisted inside the viewport observation by its capture
step; an optional external monitor JSON can only supplement it. The packet
accepts a verified direct identity or source-targeted selection transaction,
full numeric `yawDegrees`, `pitchDegrees`, `zoomPixelsPerTile`, centring, and
`\\.\DISPLAY1` marked non-primary. A missing item becomes a named blocker in
the resulting packet; it is never silently omitted.

### Rejected Tile Properties route

The retail `nwtoolset.exe` RCDATA resource `TDLGTILEPROPERTIES` was inspected
offline. Its DFM declares buttons plus lighting, custom-color, and animation
loop controls; it declares no `Tile_ID`, `Tile_Orientation`, source coordinate,
or editable numeric field. Therefore `read-tile-properties` is an audit-only,
fail-closed command. A visible dialog returns
`toolset_tile_properties_has_no_tile_identity_fields`; it must never be wired
as a semantic tile readback.

The repeatable read-only check is
`audit-aurora-toolset-tile-properties-resource.py`. Current local evidence is
`.codex-tmp/aurora-eye/tile-properties-resource-audit-20260712.json`: 2,594
resource bytes, no identity-field tokens, and only button/panel/label/checkbox
components.

## Prohibited substitutions

- milliseconds as an angle or zoom unit;
- guessed viewport drags;
- global cursor, keyboard, or mouse input;
- modulo-90 yaw promoted to full yaw;
- second module open, retry, or AV/quarantine bypass.

The next capability implementation is a read-only full camera-state and
selected-tile readback. Only then may an iterative controller dispatch one
low-level action at a time and re-verify this contract.

### Exact source-targeted selection

The public `Tile Properties` form cannot provide a Tile_ID readback. The
approved substitute is `source-targeted-visual-selection/v1`: an exact tile
from the source ARE, a target-only `WM_LBUTTONDOWN/UP` to validated `TScrollBox`,
a baseline without an outline, and a post-click outline that contains the
targeted local point and remains inside the viewport. It proves the controller
selected the specified source tile; its artifact explicitly states that Toolset
did not expose an internal Tile_ID field. An outline without the other three
links remains blocked.

The executor is `select-aurora-toolset-source-tile-no-global-input.mjs`. Its
`plan` command is offline. Its `execute` command is fail-closed behind both
`--execute true` and `AURORA_TOOLSET_EXPLICIT_LIVE_SELECTION=1`; it also checks
one process, the exact module and Area, unchanged viewport dimensions, and the
non-primary physical `\\.\DISPLAY1` before the target-only click. No global
cursor, keyboard, or mouse API is used.

## Full yaw calibration

`derive-aurora-toolset-world-yaw.mjs` resolves full `0..360` yaw only from at
least two samples whose selected tile evidence is either direct Toolset identity
or a verified source-targeted transaction, and whose centres are measured in
the matching viewport capture. The coordinate
system is explicit: `aurora-area-source-grid/v1`, where `0deg` means source
Area `+X` projected screen-right and positive angles follow screen-clockwise
coordinates. When both source axes are available they must agree within the
configured tolerance. The calibration is rejected for visual-only outlines,
missing centres, non-axis-aligned source pairs, or inconsistent axes.

This is a source-grid-calibrated world bearing, not an unsafe memory read or a
claim about an undocumented internal Aurora field. The viewport evaluator and
proof packet require this provenance before accepting `yawDegrees`.

Record the accepted calibration with
`areas:toolset-session -- record-camera-calibration --cameraCalibration <json>`.
The session then supplies it automatically to `verify-viewport-target`; it is
not a manually copied sidecar.

## Closed-loop camera correction

`aurora-camera-closed-loop-controller.mjs` may choose one primitive only after
each control has a measured response model (`yawDegrees`, `pitchDegrees`, or
`zoomLogRatio`). The next command is selected by the largest normalized error
that a measured command can reduce. It returns
`dispatch_one_then_reobserve`; the caller must capture and recalculate the
numeric pose before requesting another step. A transport hold is never an
angle, pitch, or zoom input unit. Missing or wrong-direction response models
return `camera_response_model_missing`.

`aurora-camera-response-model.mjs` is the only producer of those response
models. It requires at least three independently measured before/after numeric
transitions per command, stores the median delta and median absolute deviation,
and rejects insufficient samples, contradictory directions, or excessive
relative variance. Thus calibration cannot be replaced by a manually entered
duration-to-degrees conversion.
