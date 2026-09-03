# Row 68 source-scene and BIC-target proof audit v20

Date: 2026-08-13

Status:
`valid-comparison-source-backed-scene-bic-target-calibrated-camera-open-pixel-and-timing-gaps`;
canonical visual parity is not claimed. This v20 attachment result is
historical and superseded by v22: v20 used `headconjure`, while primary retail
disassembly proves that `Imp_HeadCon_Node` on a creature resolves to `head`.

## Source policy

- Aurora-first: yes. The fixture was rebuilt from the exact source module,
  Area, first-PC BIC, context actor, source row, admitted model, textures, and
  source animation.
- xoreos used: no.
- NWN or Toolset launched: no. The approved immutable one-trigger NWN MP4 was
  reused without rerun.
- Aurora Web playback: exactly one fire-and-forget playback, with no retry,
  loop, or overlap.
- The subsequent attachment audit proved that orientation was preserved
  correctly but the creature node namespace was wrong. Fresh v22 proof records
  the corrected native `head` attachment; this document remains the immutable
  v20 historical record.

## Exact comparison context

- `visualeffects.2da` row: `68`, `VFX_IMP_HEALING_M`.
- Source model: `vim_heal04`, SHA-256
  `6dc087ce635ed0dc697968e5411ff7faabcf0b564be539f5f470c57d451c3be1`.
- Source module:
  `C:\Users\enonw\Documents\Neverwinter Nights\modules\tlc_vfx_catalog_lab_iter1.mod`.
- Source module SHA-256:
  `fda307d129f0c0e17411fb5820c6c528ee66e3a079202be5e8e38be781cff010`.
- Source Area: `enon_test_effect`; ARE SHA-256
  `5dad3c2b055056479f4ce7b2c8bc25a408208700b6901c1bf1986ac50368f585`;
  GIT SHA-256
  `bd3637343c89bb7c719a260cd61d07f5774be21a9b840107451abe9c046df8e6`.
- Exact first-PC BIC:
  `C:\Users\enonw\Documents\Neverwinter Nights\localvault\avriemail461.bic`.
- BIC SHA-256:
  `5edc2ce0232dad09db9649401db55ccb9956ecfe98ff172e152a11ac5c1d7cc0`.
- Target actor: exact `pfh0` BIC-derived actor at the module entry point.
- Context actor: source GIT innkeeper `c_yinnkeep`, three metres ahead.
- Scene assets: four admitted tile models, fourteen textures, and two actors.
- Source script camera:
  `SetCameraFacing(180.0, 7.0, 62.0, CAMERA_TRANSITION_TYPE_SNAP)`.

The exact retail camera matrix is not serialized in the source module. The Web
proof uses the saved-frame five-point calibrated perspective already supported
by the identical row-22 camera script and source scene: FOV `36.743818`, camera
`[0.05148, 6.051473, -4.371987]`, look-at
`[0.03482, 0.01, 3.737955]`, and RMS reprojection error `4.647 px`, below the
`8 px` gate. This is a calibrated camera, not a recovered matrix claim.

## Static proof gate

The preflight ran before playback and passed:

- complete frontend/backend runtime identity;
- canonical host graph;
- asset settlement with four scene models, fourteen textures, and two actors;
- draw and particle-shader ledgers;
- proof gate with an empty blocker manifest;
- no playback hooks;
- all `40/40` source-material lighting installations;
- no unresolved source local lights;
- camera calibration at `4.647 px` RMS;
- object attachment to source column `Imp_HeadCon_Node`, resolved actor node
  `headconjure`, at world position
  `[0, 2.3296814959, -0.0278785005]`.

The static `t=1` frame reports `150` particles and one source light. Source
emitter maxima are `66`, `16`, `64`, and `45`.

## Playback and validation

The fresh Web MP4 is `8.5` seconds, `255` encoded frames, and `30 fps`. The
capture ledger confirms exactly one playback, `loop=false`, zero overlap,
passing proof gates, a clean final state, and zero final particles for all four
emitters.

The source-scene validator samples two rug-side receiver regions and excludes
the direct saturated particle core. It measured `17,769` sample pixels, source
light illumination delta `15.35`, and post delta `0.056` against a threshold
of `5`. The legacy synthetic-plane ROI remains supported only for historical
packets; it is not used for v20.

## Artifacts

- Reused NWN MP4:
  `evidence/vfx-nwn-web-row68/nwn/nwn-row68-one-trigger.mp4`.
  SHA-256:
  `672b1d798c35df688770683a42071ba6e4a79829d162f276d345246dc88ec01c`.
- Static preflight screenshot:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row68/aurora-web/preflight/vfx-nwn-web-row68-time-1-v20-source-scene-bic-target-20260813.png`.
- Static preflight JSON:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row68/aurora-web/preflight/vfx-nwn-web-row68-preflight-v20-source-scene-bic-target-20260813.json`.
- Fresh Aurora Web MP4:
  `evidence/vfx-nwn-web-row68/web/web-row68-one-trigger-v20-source-scene-bic-target-20260813.mp4`.
  SHA-256:
  `b18168bd9f61218b6b733434b98e7651ffbc28de60331155e2d1b1e4cd52b5a1`.
- Validated Web summary:
  `evidence/vfx-nwn-web-row68/web/validated-summary-v20-source-scene-bic-target-20260813.json`.
- Onset-aligned side-by-side MP4, NWN left and Aurora Web right:
  `evidence/vfx-nwn-web-row68/nwn-vs-aurora-web-row68-comparison-v20-source-scene-bic-target-20260813.mp4`.
  SHA-256:
  `79bd9aa2bed0e2cdf0a29c4c51f96caa4804bea812eda7cc5e01d53a3fde86fc`.
- Contact sheet:
  `evidence/vfx-nwn-web-row68/nwn-vs-aurora-web-row68-comparison-v20-source-scene-bic-target-20260813-contact-sheet.png`.
  SHA-256:
  `58dd612833006c41aa45f2e8444c80a8da51fb257eb82ed2589cd1e960c987f0`.
- Machine-readable comparison:
  `evidence/vfx-nwn-web-row68/nwn-vs-aurora-web-row68-comparison-v20-source-scene-bic-target-20260813.json`.

## Visual verdict

Confirmed:

- the saved NWN and fresh Web results are now compared in the same source Area
  layout with the exact BIC target and source context actor;
- the yellow-white burst, cool core, ascending spark/ray structure, four source
  emitter families, and source light execute once through a clean lifecycle;
- there is no repeated or overlapping VFX playback;
- source-light response is visible and returns to baseline.

Open gaps:

- the Web room floor/material/lighting response remains visibly darker and
  different from retail;
- the exact retail camera matrix remains unrecovered;
- the Web cool core and ascending yellow column occupy a taller vertical span;
- the Web encoded visible span is `1.833 s` versus the saved NWN metric
  `1.417 s`, a descriptive `+0.417 s` delta that cannot authorize lifecycle
  tuning under the remaining material, postprocess, camera, and encoder
  differences;
- the Web `headconjure` attachment recorded here is now confirmed incorrect
  for object-applied creature VFX and is superseded by the v22 `head` proof.

No row-specific size, alpha, color, lifetime, bloom, light, or position
constant is justified by this packet.
