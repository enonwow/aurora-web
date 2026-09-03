# VFX Type 7 proof-camera viewport audit (2026-08-13)

## Scope and source policy

- Scope: the shared row210/row216 Type 7 comparison camera, not VFX runtime
  physics or material behavior.
- Primary evidence: saved retail entry scripts, native `880 x 750` capture
  frames, exact three-metre source/target placement, and existing calibrated
  camera-ray evidence.
- No NWN or Toolset process was started. No xoreos source was consulted.

## Finding

Both retail entry scripts call
`SetCameraFacing(90.0, 6.0, 60.0, CAMERA_TRANSITION_TYPE_SNAP)` and set camera
height `1.1`. Both approved NWN videos and their validated baseline frames use
an `880 x 750` viewport.

Aurora Web used the shared Type 7 perspective ray and FOV but inherited the
generic `960 x 540` proof viewport. At FOV `48`, its three-metre source/target
floor span projected to about `219.70 px`. This was appropriate only for a
retail frame rescaled to 540 pixels high. A side-by-side comparison preserving
each video's aspect ratio therefore displayed the Web actors and effect much
smaller than the native NWN oracle.

Keeping the same ray, FOV, world geometry, and VFX state while restoring the
native `880 x 750` viewport projects the same source/target roots near
`(440,662)` and `(440,357)`, a span of about `305 px`. The two-point
reprojection is below the eight-pixel diagnostic tolerance. This repairs the
proof presentation without changing particle positions, widths, lifetimes,
blend state, bloom, or host transforms.

## Implementation contract

- row210 and row216 use one shared Type 7 camera-profile factory;
- viewport is `880 x 750`, matching the saved NWN capture contract;
- camera status is
  `retail-frame-source-target-span-calibrated-camera-transform-not-exact`;
- `cameraMatchEstablished` remains false because the exact retail internal
  camera matrix and FOV are not recovered;
- a fresh static preflight must pass before any new playback;
- any new Web playback is one trigger, no loop or overlap, and must be paired
  with the existing NWN MP4 without replaying NWN.
