# VFX AOE row 0 proof-camera calibration audit (2026-08-07)

## Decision

The `VFX_PER_FOGACID` Aurora Web comparison camera may be calibrated against
the saved NWN baseline and the exact source-backed `codex_vb_aoe0.mod` Area.
The previous profile looked through the rug while the retail capture looked
across the source player toward the table. Particle parity decisions made from
that mismatched view are rejected.

Aurora-first classification: the exact internal Aurora view matrix remains
unknown. This audit authorizes a measured proof-harness camera calibration; it
does not authorize an exact-camera claim or a product runtime camera rule.

No xoreos source was used.

## Primary evidence

- Immutable NWN module:
  `C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_vb_aoe0.mod`
  - SHA-256:
    `BFC6992CDB2D72D34E1CF421FB860E922F173FD649E20BB24AEA33535C31A4C4`
- Saved retail baseline:
  `backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/aoe0/nwn/validated-baseline.png`
  - SHA-256:
    `4EFD0F7EC5C666CB75CAA9ED1E47C1A0B2F4131A29601AF18A77CAC695AF2018`
  - viewport: `880 x 750`
- Saved camera script:
  `backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/aoe0/nwn/scripts/vba0entry.nss`
  - `SetCameraFacing(180.0, 6.0, 48.0, SNAP)`
  - `SetCameraHeight(oPC, 1.2)`
- Exact source packet:
  `backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/aoe0/nwn/source-scene/enon-test-effect-aoe0-exact-module-source-pack-20260807/manifest.json`
  - ARE SHA-256:
    `AFDB077F76AE1A9CDE5175333A82B276A7CBAC0E93517CF040FA24DBA2C402C6`
  - GIT SHA-256:
    `BD3637343C89BB7C719A260CD61D07F5774BE21A9B840107451ABE9C046DF8E6`
- Admitted source tile models:
  - `tin01_h01_02`: `8AE4F2D60F64752BF02926460C848CC991B01B2B9B386868D75D7EC36A892E52`
  - `tin01_h01_03`: `2C3132F25B0F3C49631F581EDD3233A927855E3AE9F4ECFAF90F88A7862490CC0`

## Measured table contract

After the production Area X mirror and target-centered scene translation, the
`Box643` table receiver supplies these calibration points:

| Three world `x,y,z` | Retail pixel `x,y` |
| --- | --- |
| `2.40, 0.85, -4.66` | `194, 296` |
| `2.42, 0.85, -1.86` | `600, 296` |
| `3.90, 0.85, -4.67` | `208, 179` |
| `3.92, 0.85, -1.88` | `579, 179` |
| `2.29, 0.01, -4.69` | `207, 392` |
| `2.31, 0.01, -1.85` | `584, 392` |
| source origin `0.00, 0.00, -3.00` | `432, 676` |

The table points are source-model bounds matched to visible top and leg
corners. The player source origin is the immutable module entry position
`(9.5, 3.8, 0)` normalized around the effect target `(9.5, 6.8, 0)`.

## Fit result

A constrained perspective fit with Three up `(0,1,0)` produces:

```text
FOV:      37.87570786 degrees
position: -3.40048908, 5.65920304, -2.97124351
look-at:   2.35245967, 0.16311396, -2.94477992
up:        0, 1, 0
```

The seven-point reprojection error is approximately `6.50 px RMS`; the
acceptance ceiling is `8 px RMS`.

## Required proof status

- Camera status:
  `retail-frame-source-origin-and-table-calibrated-camera-transform-not-exact`.
- `cameraMatchEstablished` remains `false` until the exact Aurora view matrix
  is independently recovered.
- The two unresolved tile-id-364 instances and both actors remain disclosed,
  not replaced with fallback geometry.
- A fresh static timeline may be captured without invoking playback. Any later
  real playback still requires exactly one trigger and reuse of the saved NWN
  MP4.
- VFX color, alpha, lifetime, and owner scheduling may be compared only after
  using this calibrated AOE view or a stronger independently verified view.
