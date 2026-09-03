# VFX row 50 proof camera and current comparison audit

Date: 2026-08-13

Status: current one-playback proof accepted; visual result remains
`matched-with-gaps`.

## Aurora-first evidence

- Saved NWN baseline and approved one-trigger MP4 for row 50.
- `vb50entry.nss`, which requests facing `90`, distance `5.8`, pitch `55`,
  and height `1.1`.
- `vb1entry.nss` and the independently calibrated row 1 longitudinal proof.
- Exact row 50 four-tile module scene from the HAK-precedence audit.
- xoreos used: no.
- NWN and Toolset rerun: no.

The row 1 and row 50 entry scripts issue the same camera commands, and their
saved retail baseline framing is equivalent for the shared longitudinal scene.
Row 50 therefore reuses the already admitted four-point row 1 fit rather than
inventing a second camera.

## Calibrated profile

- projection: perspective;
- viewport: `880 x 750`;
- FOV: `51.05100832` degrees;
- camera position: `[0, 3.64587616, -5.49972596]`;
- look-at: `[0, 1.01486231, -1.55686137]`;
- up: `[0, 1, 0]`;
- calibration samples: 4;
- measured RMS error: approximately `2.289 px`;
- gate tolerance: `4 px`.

The status is deliberately
`retail-frame-longitudinal-calibrated-camera-transform-not-exact`. The fit is
a capture calibration, not a recovered internal Aurora camera transform.

## Current proof v16

Static preflight:

- PNG:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row50/aurora-web/preflight/vfx-broad-row50-time-1-four-tile-longitudinal-camera-20260813.png`;
- SHA-256:
  `9a6f104196a375229f05cdf4cb5bed0afab6bc57fe56547880c80be506ff7423`.

Accepted Web recording:

- MP4:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row50/aurora-web/aurora-web-row50-one-trigger-four-tile-longitudinal-camera-v16-20260813.mp4`;
- SHA-256:
  `8d5b5ac98b2ae71555073d4591fc3be314d1a31c0fae89f24e6b1a1e796bc981`;
- 82 encoded frames at 8 fps over 10.15 seconds;
- exactly one trigger, loop disabled, overlap count zero;
- playback duration 6.15 seconds;
- identity, host graph, assets, draws, shader ledger, playback, and proof gates
  pass with an empty blocker manifest;
- terminal state is post-duration, hidden, with zero particles and draws.

The comparison script preserves all 82 encoded frames and only re-timestamps
them as an 8 fps presentation timeline. It does not replay the Web effect.

## Saved-NWN comparison

- comparison MP4:
  `evidence/vfx-nwn-broad-proof-2026-07-16/comparisons/nwn-vs-aurora-web-row50-four-tile-longitudinal-camera-v16-onset-aligned-20260813.mp4`;
- MP4 SHA-256:
  `63f34618efb6c1c4234d36ca31d2a0083b8b0fc322b876cc2916fb137b839c26`;
- contact-sheet SHA-256:
  `f88a78a0020167485dbd76eabba0ca54041247413b6844c7d9623b0137d9a4e8`;
- NWN bright onset: `14.8157218073 s`;
- Web bright onset: `2.125 s`;
- both are aligned at comparison time `2.0 s`.

## Visual verdict

The full 4/4 scene and longitudinal framing are materially closer to the saved
NWN oracle than the old 2/4 proof. The effect is not yet in visual parity:

- retail forms a taller translucent cyan/white body column during early and
  peak phases;
- Web remains wider and lower around the target, with more energy below the
  torso;
- the Web core is more compact and saturated;
- exact source-player appearance, exact native camera, retail RNG, and final
  material/light/bloom/postprocess parity remain open.

No row-specific position, size, alpha, or lifetime override is authorized by
this comparison. The next code change must come from shared Aurora semantics.
