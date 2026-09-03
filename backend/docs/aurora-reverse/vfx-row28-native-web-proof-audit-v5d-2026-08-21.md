# VFX row 28 native NWN versus Aurora Web proof audit (v5d)

Date: 2026-08-21

## Outcome

`VFX_FNF_METEOR_SWARM` (visualeffects.2da row 28, source model `vff_rainmeteor`) has a fresh, deterministic Aurora Web single-playback proof and a trigger-aligned comparison against the accepted native NWN retail oracle.

The accepted verdict is `very-close-profile-calibrated`. Exact pixel identity is not claimed. The Web and native captures match the onset, last-visible endpoint, and visible duration at the 12 FPS measurement resolution. The dynamic peak remains 0.4167 seconds later in Web, within the explicit 0.5 second profile tolerance. Camera shake and the complete native engine pixel pipeline remain outside the Web claim.

The hash-bound packet manifest is:

- `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/proof-manifest-v5d.json`
- size: 6707 bytes
- SHA-256: `f30ed73b65371b1cb9d8714aff2676b78d2bd777f5c6ac71ba9add60879eae8a`

## Aurora-first classification and authority

This work calibrates an already accepted row-28 retail-runtime profile. It does not introduce a new global Aurora timing rule. The authority chain is:

1. installed NWN:EE retail KEY/BIF resources for row/model identity;
2. the accepted immutable native NWN single-trigger oracle;
3. the existing static visual calibration and endpoint timing calibration;
4. the fresh guarded Aurora Web capture.

No xoreos code or semantics were used. NWN and Aurora Toolset were not relaunched during this completion pass; the accepted native oracle was reused unchanged.

## Implemented Web profile

The row-28 comparison runner and fixture use:

- additive particle radiance scale: 14;
- retail bloom multiplier: 2;
- Aurora-space effect origin: `[1.25, 3.55, 0]`;
- runtime playback rate: `5/3`;
- runtime playback delay: `2/15` seconds;
- source timelines retained without nonlinear event warping.

The capture harness was hardened so that working PNG frames, provisional media, and the Chrome profile are staged under the OS temporary directory. Immutable proof outputs are published to the repository only after the active and final proof contracts pass. This prevents the managed backend watcher from being perturbed by working capture frames.

Runtime identity used the same commit token and the same syntactically valid source-bound digest on frontend and backend:

- commit token: `worktree-348e8ff0e27677b7c611c56afa4d706685b393f0-row28-final-v5d`;
- image digest: `sha256:30b324755392678d80276b971a3df9815283cee23ea546b650bbba6e3d2098f6`.

## Capture proof

The accepted Web capture is:

- MP4: `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/web-v5d/aurora-web-row28-one-trigger-v5d.mp4`;
- capture summary: `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/web-v5d/aurora-web-row28-one-trigger-v5d-summary.json`;
- validation: `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/web-v5d/aurora-web-row28-one-trigger-v5d-visual-validation.json`.

The capture contract reports:

- direct deterministic CDP screenshots, not MediaRecorder or screencast fallback;
- 1460x810 canvas exactly aligned with the viewport;
- 12 FPS, 108 encoded frames, 9 seconds;
- exactly one playback trigger;
- no loop and no overlap;
- active proof gate `pass` with no blockers;
- runtime identity `ready`;
- assets settled;
- canonical draw ledger and particle-shader ledger `pass` on the accepted active frame;
- final playback guard `pass`, completed, and post-duration hidden;
- zero particles in the final post frame.

## Native comparison metrics

The final validator deliberately separates two measurements that the superseded validator conflated:

- `dynamicPeak` measures temporal peak phase;
- `visualCalibrationAnchor` measures energy and centroid at the source-time calibration anchor required by `staticPeakCalibrationMustRemainSourceTime=1.833333...`.

The anchor is mapped through the documented formula `wallAfterTrigger=runtimePlaybackDelaySeconds+(sourceSeconds/runtimePlaybackRate)`, producing a target of 1.2333 seconds and the nearest captured frame at 1.25 seconds.

Measured results:

| Metric | Native | Web | Error | Limit | Result |
| --- | ---: | ---: | ---: | ---: | --- |
| Trigger-relative onset | 0.3333 s | 0.3333 s | ~0.0000 s | 0.0833 s | pass |
| Trigger-relative last visible | 2.3333 s | 2.3333 s | ~0.0000 s | 0.0833 s | pass |
| Visible duration | 2.0000 s | 2.0000 s | ~0.0000 s | 0.0833 s | pass |
| Dynamic peak phase | 0.6667 s | 1.0833 s | 0.4167 s | 0.5000 s | pass |
| Visual-anchor energy | reference | +3.91% | 3.91% | 15% | pass |
| Visual-anchor centroid X | reference | +20.92 px | 20.92 px | 40 px | pass |
| Visual-anchor centroid Y | reference | +29.63 px | 29.63 px | 40 px | pass |

The trigger-aligned proof artifacts are:

- comparison video: `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/comparison-v5d/nwn-vs-aurora-web-row28-trigger-aligned-v5.mp4`;
- contact sheet: `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/comparison-v5d/row28-nwn-vs-web-v5-trigger-aligned-contact-sheet.png`;
- comparison manifest: `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/comparison-v5d/comparison-manifest-v5.json`.

Independent visual inspection confirmed that the comparison shows the native and Web meteor lifecycle at the same trigger-relative times, with a visible onset, multi-meteor bloom/ring event, decay, and clean post-roll. It contains no debug overlay, blank placeholder, or unrelated VFX.

## Rejected attempts and validator correction

Two attempts were rejected and are not presented as proof:

- `v5b`: invalid runtime image-digest syntax, plus working capture frames under the watched backend tree;
- `v5c`: isolated OS-temporary staging proved the backend restart was not the primary blocker; the invalid `local-proof-v5c` digest alone kept identity blocked.

The original post-capture validator also rejected the accepted `v5d` MP4 because it applied the centroid gate to a stochastic dynamic maximum rather than the source-time calibration anchor required by the timing-calibration contract. The replacement validator keeps every existing tolerance unchanged and separates peak-phase measurement from the static visual anchor. Its contract test passed before the immutable validation artifact was created.

## Resource safety and tests

At most one backend family, one frontend family, and one capture family ran at any time. Managed Node children used the repository 1 GB heap policy. Chrome used the repository-global capture lock and `--renderer-process-limit=2`. All owned services and Chrome processes were stopped after capture, and ports 3000, 5173, and 9786 were confirmed released before offline validation.

Completed gates:

- focused VFX/layout unit set: 173 passed;
- VFX runtime observability: 20 passed;
- deterministic capture-harness contract: passed;
- v6 evidence-pipeline contract: passed;
- frontend production build: passed;
- frontend regression smoke: 78 passed.

The full frontend unit baseline ran once: 2921 passed and 3 failed. All three failures are outside row-28/VFX scope and occur in dirty-worktree placeable lighting/render-package expectations:

- `placeableThreeAssetLoader.textureMapping.test.ts`: two source-MDL lighting expectation failures;
- `httpPlaceableApiPort.test.ts`: one render-package shape expectation failure.

No mutation tests were run.

## Claim boundary

This packet proves one exact row-28 profile and one fresh Web playback against the immutable native oracle. It does not prove exact camera parity, camera shake, exact character/owner presentation, exact engine pixel identity, or a global Aurora timing transform. Native NWN remains authoritative wherever the profile does not make an explicit measured claim.
