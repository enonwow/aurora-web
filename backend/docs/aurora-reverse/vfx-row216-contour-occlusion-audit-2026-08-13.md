# VFX row216 contour and occlusion audit

Date: 2026-08-13

Scope: residual contour difference between the saved NWN retail proof for
`visualeffects.2da#216` (`VFX_BEAM_FIRE_LASH`) and the corrected Aurora Web
Type 7/P2P proof.

Status: no additional particle-runtime correction authorized. The apparent
Web heart-shaped top is an unmatched host-occlusion/projection difference, not
evidence that the shared P2P trajectory is too narrow.

## Source policy

- Aurora-first: applied before evaluating a code change.
- Primary runtime source: admitted Aurora Toolset decompilation at
  `C:/Projects/New Folder/export/decompiled_all.c`.
- Retail visual source: the existing one-trigger NWN MP4 and validated stills.
- NWN/Toolset replay: none.
- xoreos used: no.

## Runtime audit

The four row216 P2P emitters set `inherit=1` and leave `inherit_local` and
`inherit_part` disabled. In `FUN_00a2c36c`:

1. lines `854695-854698` read the three inheritance flags independently;
2. lines `854731-854782` reproject every active particle position and velocity
   from the cached previous emitter frame to the current emitter frame when
   `inherit` is active;
3. lines `854854+` perform the P2P motion step only after that reprojection.

Aurora Web already follows this ordering. `sourceMotion` is supplied for Type
7 emitters by `resolveRuntimeEmitterSourceMotionContext()`, and
`applyAuroraEmitterSourceMotion()` calls
`transformActiveParticlesBetweenFrames()` before P2P update. The separate
Type7 guard around `parentMotionContexts` only suppresses the `inherit_local`
and `inherit_part` parent lanes; it does not suppress authored `inherit=1`.

The exact host resolver was sampled over its two-second `pause1` loop. The
source Impact position moves only about 0.0031 world units vertically, while
the source orientation and target Impact position are evaluated continuously.
No stale source frame or missing active-particle reprojection was found.

## Visual measurement

Compared accepted settled stills:

- NWN: `row216/nwn/validated-steady.png`;
- Aurora Web:
  `row216/aurora-web/preflight/vfx-broad-row216-effect-time-2-root-arc-lifetime-20260812.png`.

A warm high-luminance mask (`HSV hue <= 38`, saturation >= 80, value >= 180,
connected components >= 30 pixels) gives:

- NWN outer effect bounds: `333 x 452`, width/height `0.737`;
- Aurora Web outer effect bounds: `243 x 319`, width/height `0.762`.

The normalized outer silhouettes therefore agree within about 3.4 percent.
The visible difference is concentrated at the target end: Aurora Web exposes
the strand crossing and bright node, while the retail target actor occludes
that same region. The source actor also occludes the lower attachment in NWN.
Absolute pixel size is not comparable because the scene, camera and viewport
are different.

## Decision

Do not change P2P `grav`, `drag`, `threshold`, source orientation, Type 7 root
orientation, emitter size or Linked width from this comparison. Such a change
would tune shared runtime behavior against unmatched actor occlusion.

The next valid row216 parity step is a proof-scene correction that renders the
same source and target actors, camera and room context. Until then the accepted
comparison remains `matched-with-gaps`, with particle contour implementation
closed and host-scene occlusion/projection still open.

