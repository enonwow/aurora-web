# Post-debt `plc_t04` placeable VFX proof v47

Status: `valid-comparison-with-open-parity-gaps`.

## Aurora-first correction

The implementation revision is backed by the retail decompilation rather than
image tuning:

- `FUN_00a28334`, `decompiled_all.c:853157-853216`, confirms signed emitter
  rectangle offsets on the evaluated emitter X/Y axes with the final `0.0001`
  unit multiplier.
- `FUN_00a264c0`, `decompiled_all.c:853002-853151`, constructs Fountain spread
  by rotating around local X and then local Z. The recovered direction is
  `(sin(azimuth)*sin(tilt), -cos(azimuth)*sin(tilt), cos(tilt))` before the
  emitter orientation is applied.
- Both spread angles use the raw 15-bit random integer modulo the native
  modulus. `randvel` reset jitter also uses `rand15 % trunc(randvel*100)` and
  a second random value's low bit for the sign.

The Web runtime previously used a normalized-float bucket and a spherical
direction rotated by 90 degrees in local XY. v47 corrects both contracts.

## Proof contract

- NWN was not launched and the VFX was not recaptured.
- The saved NWN oracle was reused:
  `backend/docs/aurora-reverse/artifacts/source-mdl-emitter-oracle/retail-source-mdl-emitter-plc-t04-ovens-removed.mp4`.
- Aurora Web was captured once after a successful static preflight.
- The Web capture is one continuous 10-second lifecycle at 8 fps. There is no
  repeated fire-and-forget trigger and no overlapping instance.
- The source area owns three persistent `tm_pl_lightred` / `plc_t04`
  placeables. The saved NWN camera exposes two flames clearly, so instance
  count and scene framing are not pixel-aligned.

## Static preflight at t=5 seconds

- Source roots: `3`.
- Runtime frames per root: `81`.
- Visible emitter meshes: `6`.
- Visible particles: `66`.
- Source textures: `fxpa_flame00`, `fxpa_smoke01`.
- Source/Web point lights: `0`.
- Runtime exceptions: `0`.
- Preflight:
  `preflight/post-debt-enon-bakery-plc-t04-v47-preflight-aurora-spread-axis.png`.
- State:
  `preflight/post-debt-enon-bakery-plc-t04-v47-preflight-aurora-spread-axis.frame.json`.

## Media and integrity

- Fresh Web MP4:
  `post-debt-enon-bakery-plc-t04-10s-8fps-proof-v47-aurora-spread-axis.mp4`
  - bytes: `322891`;
  - duration: `10000 ms`;
  - frames: `80`;
  - fps: `8`;
  - deterministic capture: `true`;
  - SHA-256:
    `D0A7D10CA5402589DCE9407142F841437A3AE086F2BB54863E2B573F568866A8`.
- Reused NWN MP4:
  - bytes: `804469`;
  - SHA-256:
    `1599BD2D42A4F9DFD1A3806332B5939EF4CEDB6CB5700572298D254BF65F27C8`.
- Side-by-side, NWN left / Web right:
  `../vfx-nwn-broad-proof-2026-07-16/comparisons/nwn-left-vs-aurora-web-right-plc_t04-v47-aurora-spread-axis-20260717.mp4`
  - bytes: `1312491`;
  - duration: `10 seconds`;
  - frames: `80`;
  - fps: `8`;
  - SHA-256:
    `8075913221E60F90075394A65C1A9E31F47F3D9A4269AAD228DFD15F25C0EC27`.
- Synchronized frame at t=5:
  `frames/v47/nwn-left-vs-web-right-v47-t5.png`.

## Comparison verdict

The dark star-shaped center is visible in both the saved NWN oracle and Web
v47. It is therefore not evidence of a Web-only diagnostic rectangle or
invented geometry.

Open parity gaps remain:

- NWN has a softer orange plume integrated into the bakery lighting; isolated
  Web output has a brighter white/yellow core and green fringe.
- Flame silhouette and apparent rise differ.
- Camera, environment, HDR/postprocess and visible instance count are not
  matched.

This packet proves the source-backed Fountain axis/RNG correction and a valid
one-run comparison. It does not claim pixel parity or canonical promotion.

## Verification

- Focused runtime suite: `78/78` passing.
- Backend build: passed.
- `canonicalParityPromoted=false`.
