# VFX row181 proof-camera source audit (2026-08-13)

## Scope

This audit derives the row181 Aurora Web comparison camera from the saved NWN
capture and its exact NWScript setup. It replaces the historical wide
orthographic camera used by the isolated horizontal MIRV fixture.

## Retail source

`row181/nwn-recapture-2/scripts/vb181entry.nss` applies:

- facing: `90.0` degrees;
- distance: `5.8` metres;
- pitch: `55.0` degrees;
- camera height: `1.1` metres;
- snap transition, repeated after one second.

These values and the saved row181 baseline framing are identical to the row50
retail proof setup. The existing row50 longitudinal fit uses:

- viewport `880 x 750`;
- perspective FOV `51.05100832` degrees;
- target-centered camera position `(0, 3.64587616, -5.49972596)`;
- target-centered look-at `(0, 1.01486231, -1.55686137)`.

## Source-centered transform

Row50 is normalized around the target, where the source is at Three `Z=-3`.
The row181 scene is normalized around the source, where the same target is at
Three `Z=+3`. Preserving the camera ray therefore requires translating both
camera position and look-at by exactly `+3` on Three Z:

- camera position: `(0, 3.64587616, -2.49972596)`;
- look-at: `(0, 1.01486231, 1.44313863)`.

FOV, viewport, up vector, pitch relationship, and distance are unchanged.
The four calibrated world samples are translated by the same `+3` and retain
their retail pixel coordinates. The projection regression passes with a
four-pixel RMS tolerance.

## Decision and limit

Row181 now uses the translated source-centered perspective profile. This is a
saved-retail longitudinal fit, not a claim that the exact internal Aurora
camera matrix or FOV was recovered. Final comparison status remains
diagnostic until camera, complete owner representation, and visual scene parity
are independently established.

Regression:
`npx vitest run tests/unit/modules/vfx/dev/NwnVfxComparisonRunner.test.ts`.

