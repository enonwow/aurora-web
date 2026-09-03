# VFX row 22 proof owner-anchor audit (2026-08-07)

## Decision

The row-22 proof fixture must keep `VFX_FNF_FIREBALL` at local Three world
origin `(0,0,0)`. The fixture generator subtracts the source module entry/effect
origin `(9.5, 3.799999952316284, 0)` from every Area tile translation, while the
saved retail script applies the effect at the first PC. A separate per-effect
anchor is therefore forbidden.

The previously inferred `[1.303,0.01,-0.462]` anchor was an artifact of fitting
the camera to a standalone proof scene that omitted the production Area X
render-frame mirror. It is rejected and must not be implemented.

## Primary evidence

- `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22/nwn/scripts/vfx22shot.nss`
  - SHA-256:
    `966534310746DCF334A264D50B6B9D5F4FD37BB354998A663B41C36859A280F7`
  - source behavior: obtains `GetFirstPC()` and calls
    `ApplyEffectAtLocation(DURATION_TYPE_INSTANT, eVisual, GetLocation(oTarget))`.
- `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22/nwn/scripts/vfx22entry.nss`
  - SHA-256:
    `83B1EDEA3406850D9C52D74922A0A410C38A1B69B8E4CFF6FA9212399B47C18A`
  - source behavior: calls
    `SetCameraFacing(180.0, 7.0, 62.0, CAMERA_TRANSITION_TYPE_SNAP)` before the
    single delayed proof trigger.
- Saved baseline frame:
  `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22/nwn/nwn-row22-one-trigger-validated-baseline.png`.
- Camera calibration:
  `backend/docs/aurora-reverse/vfx-row22-proof-camera-planar-calibration-audit-2026-08-07.md`.
- Proof render-frame handedness audit:
  `backend/docs/aurora-reverse/vfx-proof-render-frame-handedness-audit-2026-08-07.md`.

No xoreos source was used.

## Anchor contract

The player's ground-contact midpoint in the saved retail frame is measured at
approximately pixel `(447,730)` in the `880 x 750` viewport. After applying the
shared proof render frame, local source origin remains world origin:

```text
[0, 0.01, 0]
```

Forward projection through the corrected calibrated proof camera must remain
within two pixels of `(447,730)`.

## Status constraints

- Anchor status: `source-module-entry-origin-preserved-retail-frame-projected`.
- `ownerTargetMatchEstablished` remains `false` because the exact source GIT
  object/runtime player transform and renderable player scene object have not
  been recovered.
- No per-effect anchor offset may be consumed by the row-22 proof scene.
- A fresh Web proof must use one root, one trigger, no loop, and the saved NWN
  MP4. The NWN proof must not be rerun.
