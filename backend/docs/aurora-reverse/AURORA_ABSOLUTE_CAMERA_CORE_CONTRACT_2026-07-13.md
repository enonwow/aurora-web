# Aurora absolute camera core — contract

Status: implemented **fail-closed core**, but `not_live_complete` until a
version-pinned native adapter and the required Aurora Eye integration proof
exist.

## Boundary

`backend/scripts/lib/toolset-absolute-camera-core.mjs` is the runtime core.
It has no import or call path to PNG capture, image comparison, grid-pose
analysis, or Aurora Eye.  It accepts only a native Toolset adapter whose
`describe()` result contains all of:

- `status: "ready"`;
- `readback: "native"`;
- the SHA-256 of the approved `nwtoolset.exe`:
  `4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24`.

Anything else stops before selection or a camera command with
`camera_state_adapter_unavailable`.  In particular, a visual/PNG answer is
not a substitute for native state.

## Absolute target and live readback

The target is exactly:

```js
{
  area: "area_resref",
  sourceTile: { x: 2, y: 2 },
  camera: {
    yawDegrees: 45,
    pitchDegrees: 45,
    zoom: 12,
    centreX: 2.5,
    centreY: 2.5
  }
}
```

The adapter must return the same Area, selected source tile, and numeric
camera values with `provenance: "native_toolset"`.  The core reads after
selection, and after every single command.  A changed source tile, Area, or
uncontrolled axis causes a blocker rather than a compensating guess.

## Models and closed loop

Every measured response model declares numeric deltas for five axes:
`yawDegrees`, `pitchDegrees`, `zoomLogRatio`, `centreX`, `centreY`.  It is
accepted only when it has `source: "native_readback"`, at least three samples,
and bounded single-axis behaviour.  The controller chooses one measured
command for the largest normalised error, applies it through the adapter,
then reads native state again.  Time is not represented in the public
contract or acceptance rule.

## Independent integration test

Aurora Eye is not invoked by this core.  It is the separate integration
observer: capture its PNG/JSON after the core run, inspect the real viewport,
and compare its observation to the core's native achieved state.  Only a
live run on the physical second display can complete the goal.

## Remaining gate

The exact camera-object address and a safe native command/readback path from
the correct `TfrmViewerArea` have not yet been proven.  The next component is
a version-pinned bridge with read-only discovery first; it must reject any
other binary and must never fall back to visual analysis.  Until that exists,
the core is intentionally unable to command a live Toolset.
