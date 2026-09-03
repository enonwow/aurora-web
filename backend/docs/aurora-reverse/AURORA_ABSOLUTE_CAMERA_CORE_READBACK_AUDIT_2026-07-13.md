# Aurora absolute camera core — readback audit

Status: `blocked_for_live_core`, not a completion claim.

## Requirement

The runtime control core must read and reach an absolute target:
`Area + source tile + world yaw + pitch + zoom + viewport-centre`.
It must not depend on PNG, pixel analysis, or Aurora Eye. Aurora Eye remains
an independent integration-test observer only.

## Evidence inspected

- Existing `control-aurora-toolset-viewport-camera.mjs` sends targeted button
  messages but obtains yaw/pitch/zoom from `analyze-aurora-toolset-grid-pose.mjs`.
  That is image-derived and therefore belongs to Aurora Eye, not the core.
- The approved installed binary is
  `C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\bin\win32\nwtoolset.exe`,
  SHA-256 `4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24`.
- The read-only decompilation export contains native camera evidence:
  `@TAuroraPanel@SetCamera$qqrp10CAurCamera` at `0x6137e4` and configuration
  fields including `pitch`, `minyaw`, `maxyaw`, `minpitch`, `maxpitch`,
  `mindist`, `maxdist`, `clampyaw`, `clamppitch`, and `clampdist`.

This proves that the native program has a camera object and absolute camera
parameters. It does **not** yet prove a safe external read/write API from a
`TfrmViewerArea` HWND.

## Current blocker

No documented Windows message, property readback, or safe external API has
been demonstrated that returns the live `CAurCamera` yaw/pitch/distance and
camera target for the exact Area viewer. Reading these values from PNG would
violate the core/Eye boundary; guessing Delphi object offsets would violate
fail-closed operation.

Additional static check on 2026-07-13:

- `functions.tsv` contains only the panel-level
  `@TAuroraPanel@SetCamera$qqrp10CAurCamera` symbol, not a named
  `CAurCamera` getter/setter or an Area-viewer camera accessor.
- The body exported for `TAuroraPanel.SetCamera` is a deliberately blocked
  base implementation (it emits “Application tried to reset
  AuroraPanel->Camera”), so it is not a usable setter.
- The Toolset import/string inventory did not expose a Toolset-specific
  named-pipe, remote-control, or plugin command interface. Generic Windows
  loader and mapping imports are not evidence of a public camera API.

Therefore a native bridge cannot honestly be implemented by selecting a
plausible offset or by treating a generic Win32 import as a camera interface.

## Required adapter before live reference test

Introduce one version-pinned `ToolsetCameraStateAdapter` that, for the exact
`nwtoolset.exe` SHA-256 above, can:

1. bind to the exact `TfrmViewerArea` instance;
2. read world yaw, pitch, distance/zoom and camera target coordinates;
3. set or apply bounded deltas to exactly one requested axis;
4. read the state again and reject an unexpected axis change;
5. expose its binary version and all readback provenance in its result.

The adapter must return `unavailable` for any unrecognised Toolset binary and
must not fall back to Aurora Eye. It needs a proven native integration method
(official Toolset command/API, or a separately approved, version-pinned
in-process bridge). Only then can the closed-loop core and the 45 degree live
reference test be implemented honestly.
