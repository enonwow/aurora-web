# VFX row216 root-arc lifetime checkpoint (2026-08-12)

## Pause state

Work was stopped at the user's request after implementing and proving the
specific left/right strand-order correction. Resume from the residual visual
comparison; do not replay NWN and do not repeat the accepted Web playback.

## User-observed defect

In the saved NWN reference, the left Fire Lash strand reaches above the right
strand. Aurora Web previously showed the opposite order. The user clarified
that this signed height order, rather than a generic horizontal mirror, was the
defect to investigate.

## Aurora-first finding

The dedicated primary-source audit is
`vfx-type7-root-arc-lifetime-audit-2026-08-12.md`. The recovered runtime
sequence proves that `Gob::ReattachReference` writes `qArc * qRoot` once during
attachment. `CAurBehaviorAttach::Control` then writes the live source-part
position and orientation directly on every control tick and does not reapply
the arc. xoreos was not consulted.

## Implemented shared correction

`resolveEffectBeamType7RootTransform` now receives runtime time:

- `t <= 0`: preserve the attach-time `RotationArc` composition;
- `t > 0`: follow the live source-part transform directly.

This is global ProgFX Type 7 behavior. No row216 side, angle, camera or emitter
name constant was added. A regression with a deliberately non-identity attach
arc failed before the correction and passes afterward.

## Verification completed

- focused attachment/application/runtime tests: `145/145` passed;
- backend production build: passed;
- regenerated row216 fixture gate: passed, source host matches `50`, target
  host matches `20`, simulation step `1/60 s`;
- static CDP capture: accepted, proof gate PASS, empty blocker manifest;
- one new Web playback: accepted, `192` frames at `8 fps`, `24 s` total,
  `triggerCount=1`, `loop=false`, `overlapCount=0`, duration `20 s`, clean
  post-roll;
- saved NWN recording was reused without launching or replaying NWN.

Signed bright-core top measurement at the inspected effect phase:

| Artifact | Left above right |
| --- | ---: |
| saved NWN | `+26 px` |
| superseded Web | `-11 px` |
| corrected Web | `+37 px` |

## Accepted artifacts

- NWN oracle:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row216/nwn/nwn-row216-one-trigger.mp4`,
  SHA-256 `0b0d5e91d176710c5b38cd9b4c7c2b885c3c08ab3c10142d8242e96495484f67`;
- corrected static Web frame:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row216/aurora-web/preflight/vfx-broad-row216-effect-time-2-root-arc-lifetime-20260812.png`,
  SHA-256 `a0eb1a167b966888457fff776aef07872782051256c4a3d275a62a2c9424c911`;
- static capture record:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row216/aurora-web/preflight/vfx-broad-row216-effect-time-2-root-arc-lifetime-20260812.frame.json`,
  SHA-256 `28dd0ed9caad34b3569c992059aed050a1611d7de488801e355787580046b048`;
- accepted one-trigger Web MP4:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row216/aurora-web/aurora-web-row216-one-trigger-root-arc-lifetime-20260812.mp4`,
  SHA-256 `ebe3ded2544f820f124b30159f26d7061a545a899037a8ae8c0f4e7f3a848adc`;
- accepted Web capture record:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row216/aurora-web/aurora-web-row216-one-trigger-root-arc-lifetime-20260812.frame.json`,
  SHA-256 `2414579bd4b9f6d492df36254a5933551009cb6aebf5fa8f324749ab313da519`;
- onset-aligned NWN/Web comparison:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row216/comparison/nwn-vs-aurora-web-row216-root-arc-lifetime-onset-aligned-20260812.mp4`,
  SHA-256 `300614c83b3f9f7fba9a07f2a5d78d2c1a72c4beee244b8a2a5d1a98b9fac8ba`.

## Resume point

The signed strand-order defect is closed, but pixel parity is not. The
corrected Web effect remains tighter and more heart-shaped than the wider NWN
oval. Exact retail camera, actors, occlusion, environment and host-animation
phase are still unmatched. On resume, audit that residual shape against Aurora
primary evidence before another implementation change. Reuse the accepted Web
and NWN MP4 files for analysis; no additional playback is needed for the
current candidate.

The worktree contains substantial pre-existing unrelated changes. Do not reset
or revert them when resuming.
