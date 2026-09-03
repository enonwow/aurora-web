# VFX row 1 proof-camera source audit (2026-08-11)

## Decision

The Aurora Web proof for `visualeffects.2da#1` (`VFX_DUR_DARKNESS`) must use
the source-to-target perspective present in the preserved NWN oracle. The old
top-down orthographic Web profile is rejected because it changes the apparent
emitter footprint, light falloff, actor coverage, and scene coverage.

Aurora-first classification: the exact retail camera matrix and field of view
remain unknown. The permitted proof-harness change is a script-constrained
perspective profile, visually checked against the saved retail baseline. It
must be labelled as an approximation and must not be used to claim exact
camera parity.

## Primary evidence

- Exact module entry script:
  `backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row1/nwn/scripts/vb1entry.nss`
  - `SetCameraFacing(90.0, 5.8, 55.0, CAMERA_TRANSITION_TYPE_SNAP)`
  - `SetCameraHeight(oPC, 1.1)`
- Exact one-trigger script:
  `backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row1/nwn/scripts/vb1shot.nss`
  - source PC faces target;
  - target faces source;
  - source and target are three metres apart;
  - Darkness is applied once for exactly `20.0` seconds.
- Saved retail baseline:
  `backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row1/nwn/validated-baseline.png`
  - viewport: `880 x 750`;
  - both actors lie on the vertical source-to-target view axis;
  - the target stands at the near edge of the burlap receiver.
- Exact source-scene pack:
  `backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row1/nwn/source-scene/enon-test-effect-row1-exact-module-source-pack-20260811/manifest.json`
  - packed module SHA-256:
    `fda307d129f0c0e17411fb5820c6c528ee66e3a079202be5e8e38be781cff010`;
  - ARE SHA-256:
    `5dad3c2b055056479f4ce7b2c8bc25a408208700b6901c1bf1986ac50368f585`;
  - GIT SHA-256:
    `bd3637343c89bb7c719a260cd61d07f5774be21a9b840107451abe9c046df8e6`.

No xoreos source was used.

## Proof-harness constraint

The initial Web pose derived directly from the saved script values established
the source-to-target axis, but it projected the target approximately 64 pixels
above the preserved baseline location and moved the far receiver edge out of
frame. It is therefore retained as the starting constraint, not as the final
proof pose.

The final proof pose uses a constrained longitudinal fit. Four source-backed
points on the source-to-target axis were measured in the preserved baseline:

| Effective Three world `x,y,z` | Retail pixel `x,y` |
| --- | --- |
| `0, 0.01, 5.94` | `440, 149` |
| `0, 0.01, 0.56` | `440, 341` |
| `0, 0, 0` | `440, 370` |
| `0, 0, -3` | `440, 690` |

The first two samples are the far and near receiver midpoints. The last two
are the target and source ground origins. The fit deliberately does not claim
horizontal receiver-edge calibration because the source player actor is not
reconstructed and the exact retail camera matrix remains unavailable.

The saved baseline has SHA-256
`749F51838E1BD2C1E1B9C1F2420902F197BD9EC9977FAAD2F717A3C45B4DE557`.
The fitted proof-harness profile is:

```text
viewport: 880 x 750
projection: perspective
FOV: 51.05100832 degrees
camera position: 0, 3.64587616, -5.49972596
look-at: 0, 1.01486231, -1.55686137
up: 0, 1, 0
```

The four-point reprojection error is approximately `1.36 px RMS` per
coordinate and `1.91 px RMS` per point. The regression ceiling is `4 px RMS`.
The profile must carry status
`retail-frame-longitudinal-calibrated-camera-transform-not-exact`.

## Required proof behavior

- Evaluate baseline, onset, steady, cessation, and post states before tuning
  Darkness material or light response.
- Reuse the saved NWN MP4; do not trigger or record NWN again.
- Capture only one fresh Web playback after the scene and camera preflight
  passes.
- Compare the Web proof to the saved NWN proof in the same source/target
  orientation and with the same requested `20.0` second effect duration.
- Do not claim exact camera parity, exact pixel response, or complete Darkness
  parity from this camera profile alone.
