# VFX row 28 source location and nested Chunk scale audit (2026-08-25)

## Scope and authorities

This audit resolves two generic renderer/proof questions raised by the rejected
row-28 Web capture. It does not select behavior by `visualeffects.2da` row,
label, resref, file name, node name, fixture id, tile, creature, or placeable.

- Aurora Toolset decompiler export:
  `C:/Projects/New Folder/export/decompiled_all.c`, SHA-256
  `36bb8b1031afe2abf23f0e18180a5ad649401d9ea5e078e5170a31a96167c572`.
- Installed NWN:EE client:
  `C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwmain.exe`,
  SHA-256
  `3b7cb1252e0edb2ce22d7971f333aade027039ae30a45b4bc64732c3e6bec73a`.
- Native one-trigger script SHA-256:
  `ba031c3581b9af3f23503e2c8596584dbeb1c058c592025a862315da86f00a93`.
- Immutable native MP4 SHA-256:
  `bdddeb001cf59bb2d6476909adc3b1d022674b06b59749f39fc11fc290dc31de`.
- xoreos was not used.

## Finding 1: the location-facing/root-yaw hypothesis is rejected

The native script creates the default `EffectVisualEffect` and calls
`ApplyEffectAtLocation(..., GetLocation(oTarget))`. The retail server path
`CNWSArea::PlayVisualEffect` sends the effect row, the three position floats,
and `ObjectVisualTransformData`. It does not serialize the `Location` facing as
a separate VFX-root orientation. The default effect transform is identity.

Therefore a renderer must not infer owner yaw from the location facing for this
application path. No owner-facing correction was implemented.

## Finding 2: the live Chunk visual scale does not scale nested PartEmitter geometry

The initial static-code hypothesis was that the nested emitter inherits the
live Chunk model's sampled visual scale. The immutable native capture falsifies
that interpretation.

Toolset `FUN_00a2e250`:

- lines 855838-855846 call the emitter owner's virtual adjusted-scale method and
  store the result in `local_54`;
- lines 856187-856208 multiply each start/end X/Y particle size by
  `local_54 * 0.5` before vertex construction.

The relevant retail paths establish two different facts:

- `nwmain.exe` `ChunkyParticle::initialize`, `0x1400663d0-0x14006644c`, passes
  the sampled particle size to the live model virtual at vtable `+0x1b0` before
  starting `impact`;
- `Gob::CalculateFinalScale`, `0x14008cc80-0x14008cd2d`, propagates scale inside
  a model Gob hierarchy;
- `Gob::GetAdjustedScale`, `0x14008e390-0x14008e3b2`, multiplies the animated
  scale controller result by that inherited final scale.

Those paths do not prove that the per-particle float passed to the live Chunk
model's visual-scale virtual becomes the adjusted-scale owner of PartEmitters
evaluated by the model's `impact` runtime. Treating both scale domains as one
was an overreach.

At native trigger +1.0 seconds, the immutable MP4 contains several distinct
impact disks roughly 200--300 pixels wide. Under the source-backed proof camera
and floor calibration this is approximately 4--5 world units, matching the
nested Ring emitter's source size `2 -> 5`. Applying the outer Chunk visual
scale of about `0.1` would cap those disks near 0.5 world units (roughly 25
pixels), which is incompatible with the native frame. The disks also occur at
several positions, so they cannot be the root Ring event at one fixed source
position; they are impacts from multiple live Chunk particles.

The bound interpretation is therefore:

- the sampled Chunk particle size controls the live model geometry;
- the model's `impact` animation still starts once per live Chunk particle;
- nested PartEmitter geometry and source-space offsets use the source model
  runtime scale and do not inherit that per-particle visual-model scalar;
- authored template/model transforms remain applicable; only the live Chunk
  visual scalar is isolated.

The renderer repair must represent the particle pose separately from the live
model's visual scale. It must be generic and must not test any VFX row, label,
resref, file name, node name, fixture id, tile, creature, or placeable.

## Finding 3: the proof owner was translated twice

The saved proof Area supplies the exact effect location
`[9.5, 3.799999952316284, 0]`. Proof-scene tile translations are already stored
as `tileCenter - effectOrigin`; for example the four admitted tile translations
are `[-4.5, 1.2]`, `[5.5, 1.2]`, `[-4.5, 11.2]`, and `[5.5, 11.2]` in Aurora
XY. This makes local `[0,0,0]` the exact source-backed VFX owner position.

`calibration-v6-source-time/source-time-calibration-summary.json` already
recorded the same contract: an image-centroid delta is not an Aurora transform.
Later fixture generations nevertheless added
`[-0.209423, 4.457438, 0]`, moving the VFX owner a second time by about 4.46
world units while leaving the already-rebased Area fixed. The rejected v30
comparison visibly places the first large Web burst around the rug rather than
the source location.

The repair is data-driven and identity-neutral:

- keep the proof owner offset at `[0,0,0]` when the scene has already been
  rebased to the source location;
- recompute the camera-relative emitter context from that same owner offset;
- preserve the generic coordinate conversion and production Area X mirror;
- never derive a world transform from a luminance centroid.

## Completion boundary

This audit authorizes the source-location correction and its regression tests.
It does not claim visual parity. A fresh guarded Web MP4, trigger-aligned
side-by-side MP4, inspected frame sheet, and explicit `GOOD`/`CLOSE`/`BAD`
classification remain required. The immutable native MP4 must be reused; NWN
must not be relaunched.
