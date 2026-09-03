# VFX row 1 negative-light and material-response audit (2026-08-11)

## Status

Status: `aurora-first-audited-retail-pixel-response-open-no-tuning-permitted`.

This audit covers `visualeffects.2da#1` (`VFX_DUR_DARKNESS`) after the exact
proof Area, target model, source-backed camera fit, RGBA texture, owner
lifecycle, and source-MDL light graph were installed. It does not permit a
row-specific light multiplier, material override, or particle-opacity fix.

No xoreos source, code, comments, or documentation was used.

## Primary evidence

- Active retail `inc_lighting.shd`, SHA-256
  `8548ea59d662829521e0618edb1511fc2a88a3ecf7108ead86829b8f3d200bf8`,
  preserved in
  `artifacts/vfx-postprocessing-2026-07-19/active-retail-postprocessing-shader-audit.json`.
- Admitted Aurora Toolset decompilation
  `C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
  `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
- Retail `vdr_darkness.mdl`, SHA-256
  `ef038435d93e4602ba34c68e79ee798f71617112e3f2351a65c444802453e32c`.
- Preserved one-trigger NWN proof, requested duration `20 s`, SHA-256
  `9cdc57cf5f559f58f019994e9680266d64b2b2e527b6fea395710b2b4fdb78c7`.
- Saved NWN baseline and steady frames, SHA-256
  `749f51838e1bd2c1e1b9c1f2420902f197bd9ec9977faad2f717a3c45b4de557`
  and
  `670fde4ff5919ef78c87ffde156c6d02188a7519556b8f3721d4fa6b1a449007`.
- Source-scene and camera audit:
  `vfx-row1-proof-camera-source-audit-2026-08-11.md`.

## Recovered source contract

`vdr_darkness` owns one `Single` emitter named `DARK_Spot` and one light named
`Negitive_Light`:

- emitter render mode `Billboard_to_World_Z`;
- blend mode `Normal`;
- texture `fxpa_Dot01`;
- light color `[-1,-1,-1]`, multiplier `8`, `ambientOnly=true`;
- `dynamicType=1`, `affectDynamic=true`, `fadingLight=true`;
- radius `0 -> 5.5` during impact, looping `5.5 -> 6 -> 5.5` during duration,
  and `5.5 -> 0` during cessation.

The decoded `fxpa_dot01.tga` is RGBA `32 x 32`; its alpha ranges from `0` to
`255`, including transparent corners and an opaque center. The rectangular Web
canvas result is therefore not evidence of a missing alpha channel.

Toolset decompilation proves the ambient-only selector and its propagation:

- `FUN_00a5872c`, lines `883193-883231`, parses `ambientonly`, `isdynamic`,
  `nDynamicType`, and `affectdynamic` into distinct source fields;
- `FUN_00a4cd58`, lines `874699-874721`, copies the light flags into the active
  light object;
- `FUN_00a40b60`, lines `865365-865408`, selects local ambient rather than
  local diffuse while preserving position/radius attenuation.

The active retail shader proves that a negative `lightColor[i].a` selects the
ambient point-light branch. It also proves squared-distance cutoff and the
conditional attenuation equation using `lightMaxIntensityInv` and
`lightFalloffFactor`. Their selected runtime values are not recovered. The
existing source audit explicitly forbids guessing them.

## Fresh diagnostic comparison

Aurora Web was inspected only through static `capture=armed` and `time=7`
states. No playback was started and the NWN oracle was not rerun.

- Web baseline:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row1/aurora-web/preflight/row1-exact-scene-calibrated-camera-baseline-20260811.png`,
  SHA-256
  `57b291efe3e4d22a355bb2723ab35836c59a4f055611d8e927eac5a63937abe5`.
- Web steady `t=7 s`:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row1/aurora-web/preflight/row1-exact-scene-calibrated-camera-steady-t7-20260811.png`,
  SHA-256
  `aca49662f36ad51e076a17bd6626b01f53d366b954bf7260ef1d472f31181adb`.

The static Web telemetry at `t=7 s` reports exactly one `DARK_Spot` draw, one
RGBA texture, Normal `SRC_ALPHA / ONE_MINUS_SRC_ALPHA` blending, depth test on,
depth writes off, owner phase `duration`, and one source light at radius `5.5`
and multiplier `8`. The source light keeps RGB `[-1,-1,-1]`; Three.js stores
those signed components even though a hex display serializes them as black.

The Web baseline is already materially darker than the NWN baseline before the
effect starts. During the steady state, Web drives the target to a near-black
silhouette and darkens most visible receivers. The preserved NWN frame instead
keeps readable creature lighting and shows the strongest response as a soft,
world-Z circular footprint. Coarse saved-frame samples also show that NWN does
darken the target and source, so treating the light as a no-op would be equally
incorrect.

## Decision

The discrepancy is not safely attributable to RGBA decoding, duplicate
playback, owner timing, source-light graph loss, or camera depth. It crosses
three still-open retail boundaries:

1. the exact active-shader point-light uniform values and selected branch;
2. the exact baseline Area/static-lighting response of the retail receivers;
3. creature material/static-light/postprocess response under signed ambient.

Aurora Web must keep the source graph and honest telemetry, but this audit does
not permit tuning `Negitive_Light`, suppressing it, changing its multiplier,
or adding a Darkness-only material rule. A fresh one-playback parity proof is
deferred until those shared boundaries are closed. Work on the broader VFX
goal may continue with effects whose current discrepancy does not depend on
these unknown semantics.

## Owner-v2 follow-up - 2026-08-13

The fresh integer-owner-v2 proof and saved-NWN comparison are:

- Web MP4 SHA-256
  `d67cf6c092c330b7b73dc8b589599e181f8400ad371a77dba5ed13782ed011d8`;
- saved NWN MP4 SHA-256
  `9cdc57cf5f559f58f019994e9680266d64b2b2e527b6fea395710b2b4fdb78c7`;
- comparison MP4 SHA-256
  `cec97e5577b4bd5f7d8bb4a2c0ff6cfaf9ae5d7064ec99643d56aabd933354f2`;
- comparison manifest:
  `evidence/vfx-nwn-broad-proof-2026-07-16/row1/comparisons/nwn-vs-aurora-web-row1-integer-owner-v2-diagnostic-20260813.json`.

Telemetry proves that Web samples the source cessation radius track with the
new owner timing and removes both draw and source light when the owner reaches
`released` at `20.625 s`. The side-by-side result still differs visibly during
the signed-ambient fade. That observation does not override the unresolved
shader-uniform, receiver-material, baseline-lighting, camera, scene, and owner
target boundaries above. No row-specific tuning is authorized by this
follow-up. NWN was not rerun.
