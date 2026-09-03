# VFX row 68 NWN vs aurora-web proof

Status: `valid-comparison-source-backed-scene-bic-target-calibrated-camera-open-pixel-and-timing-gaps`.

## Inputs

- NWN retail: one `EffectVisualEffect(VFX_IMP_HEALING_M)` trigger, saved MP4 reused without rerunning NWN.
- aurora-web: one deterministic playback, no loop, no overlap, clean baseline and post-roll.
- aurora-web bloom: source-backed retail profile `offset=0`, `steps=7`, `threshold=1.0`, `softness=0.9`, `multiplier=1.0`.
- Source: retail row 68, `vim_heal04.mdl`, impact animation `2.633330` seconds.
- Runtime: four emitters and source light `flash`; all emitters end with zero active particles.

## Comparison

- Shared visual structure: yellow-white central burst, cyan-white core, rising sparks and rays.
- NWN visible span: `1.417` seconds.
- aurora-web visible span: `1.833` seconds.
- Current timing delta: `+0.417` seconds in aurora-web under the same pixel metric; timingAlignedWithinNwnFrameInterval=`false` for one `0.083` second NWN frame.
- Previous v7 timing delta: `-0.346` seconds; the source-axis and proof-scale correction removes that apparent timing defect.
- Previous v8 timing delta: `+0.049` seconds before the source-backed bloom pass.
- Fountain density correction: v9 max active counts `23/8/16/15` became v10/v11 `68/24/64/45` under the native x87 burst-count formula.
- Material/culling correction in v11: emitter `twosidedtex=0` uses the native cull-enabled lane, while reflected mode-2 quads reverse their triangle winding so Aurora `+Z` remains Three `+Y` on the front face.
- Current context: the Web proof uses the exact first-PC BIC target, the admitted four-tile Area geometry, the GIT innkeeper, and the saved-frame calibrated perspective. The exact NWN camera matrix is still not recovered.
- Current spatial gap: the Web cool core and ascending yellow column occupy a taller vertical screen-space span than retail, while the room floor/material/lighting response remains visibly different.
- Source light `flash`: radius `5`, multiplier `1.6`, receiver illumination measured, final black color key held through the particle tail.
- Capture limitation: the encoded-pixel timing delta is descriptive; different camera/material/postprocess response and encoder cadence prevent source-lifecycle tuning from this metric alone.

This packet proves the current Fountain scheduler, mode-2 front-face/culling, exact BIC target attachment, source scene, and source light in a valid single-trigger comparison. It does not claim retail visual parity.
