# VFX row 22 proof-camera planar calibration audit (2026-08-07)

## Decision

The row-22 Aurora Web proof camera may be calibrated against the saved NWN
baseline frame before any further Fireball particle tuning. The calibration
uses both the source-backed horizontal rug receiver and the preserved first-PC
effect origin. It does not establish the exact Aurora camera pose or scene
parity.

Aurora-first classification: the exact runtime camera transform is unknown.
No exact-camera implementation claim is allowed. The permitted change is a
measured proof-harness calibration backed by retail pixels and the exact retail
tile geometry already present in the fixture.

## Primary evidence

- Saved NWN baseline:
  `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22/nwn/nwn-row22-one-trigger-validated-baseline.png`
  - SHA-256:
    `F2747820E2FF28D7B3845E17F3F87E1FEBC1800F5ACAD11B4DB180DD6E0E4854`
  - viewport: `880 x 750`
- Source-backed scene models:
  - `tin01_h01_02.glb`: `CF20414A9468E7212B3E647A680F68C8CCD9E5B897152BEB193557102E3C30D5`
  - `tin01_h01_03.glb`: `E20F73633FDE7270BA1E9759F805FE8A7FDECE879D71BC2CE5BC829F92399226`
  - `gin01_h01_08.glb`: `693B8E353948E78E14682B1B3791FAA9FB699F4AD9B1DA0F49F5CDF2CAF9B653`
- Exact ARE translations and quarter-turns are recorded in
  `frontend/public/dev-fixtures/vfx-nwn-web-row22/manifest.json`.

No xoreos source was used.

## Measured receiver contract

After applying the fixture's Aurora-to-Three coordinate transform and tile
quarter-turns, the convex hull of the rendered `tin01_burlap` vertices is:

```text
(-2.32, 8.86) (-2.26, 6.20) (-2.11, 3.58) (0.50, 3.44)
( 3.32, 3.54) ( 3.26, 6.20) ( 3.16, 9.02) (0.50, 8.96)
```

Coordinates above are Three world `x,z`; receiver height is `y=0.01`.

The earlier four-point fit assigned the source X sides in the standalone
unmirrored proof frame and is rejected. The corrected fit applies the same
X-mirrored parent frame as production Areas and adds source origin as a fifth
regression point:

| Effective Three world `x,y,z` | Retail pixel `x,y` |
| --- | --- |
| `2.32, 0.01, 8.86` | `254, 131` |
| `2.11, 0.01, 3.58` | `207, 384` |
| `-3.32, 0.01, 3.54` | `816, 384` |
| `-3.16, 0.01, 9.02` | `696, 131` |
| `0, 0.01, 0` | `447, 730` |

These points intentionally describe the planar receiver envelope. Small
differences between the envelope and individual fringe vertices are included
in the accepted residual and must not be presented as exact vertex recovery.

## Result

The old inferred profile (`FOV 48`, position `0,7,-6`, look-at
`0,0.2,1.5`) renders the rug much too small. The rejected rug-only profile
projected source origin near `(634,670)`. A constrained five-point perspective
fit after the proof-frame correction produces:

```text
FOV:      36.743818 degrees
position: 0.051480, 6.051473, -4.371987
look-at:  0.034820, 0.010000, 3.737955
up:       0, 1, 0
```

The five-point reprojection error is approximately `4.65 px RMS`; the four rug
points are approximately `5.18 px RMS`, and source origin is approximately
`0.69 px` from `(447,730)`. The regression ceiling remains `8 px RMS`.

## Required status and proof behavior

- Camera status:
  `retail-frame-origin-and-planar-receiver-calibrated-camera-transform-not-exact`.
- `cameraMatchEstablished` remains `false` until the exact Aurora camera and
  the full scene are recovered independently.
- `sceneMatchEstablished` and `ownerTargetMatchEstablished` remain `false`.
- A fresh Web proof must use exactly one playback and be compared with the
  already saved NWN MP4; the NWN effect must not be triggered again.
- Particle timing, color, blend, orientation, and lifetime must not be tuned
  from a comparison captured with the old uncalibrated camera.
