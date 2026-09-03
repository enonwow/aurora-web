# Aurora VFX render-mode geometry audit - 2026-07-18

## Scope

This audit compares Aurora textured-particle render modes `0..6` in
`FUN_00a2e250` with the canonical Three renderer. It covers basis selection,
endpoint topology, native size coefficients, winding after
`C=(x,z,y)`, and Motion Blur endpoint alpha. It does not promote visual parity;
that still requires a fresh Web capture compared with an already saved valid
NWN recording.

Primary local source:

- `C:/Projects/New Folder/export/decompiled_all.c:855862-855993`
- `C:/Projects/New Folder/export/decompiled_all.c:856187-856216`
- `C:/Projects/New Folder/export/decompiled_all.c:856320-856629`
- `C:/Projects/New Folder/export/decompiled_all.c:856701-856765`

Implementation:

- `frontend/src/modules/layout/adapters/three/auroraVfxCanonicalRenderer.ts`
- `frontend/tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts`

## Native common coefficients

- Ordinary particles start with half extents:
  `halfX = evaluatedSizeX * ownerScale * 0.5` and
  `halfY = evaluatedSizeY * ownerScale * 0.5`.
- The transverse basis is multiplied by `halfX`; the longitudinal basis is
  multiplied by `halfY`.
- `Linked` and `Motion_Blur` then apply native `sizeX *= 2` and
  `sizeY *= 0.5`. Their final offsets therefore are full `sizeX` transverse
  and quarter `sizeY` longitudinal.
- The six rows are a non-indexed triangle list. Current-end vertices use
  `+/- transverse + longitudinal`; the other endpoint uses
  `+/- transverse - longitudinal`.

## Mode map and result

| ID | Source token | Aurora basis/topology | 2026-07-18 result |
|---:|---|---|---|
| 0 | `Normal` | camera/view right and up, with particle rotation | existing camera-facing path retained |
| 1 | `Billboard_to_Local_Z` | emitter-local Aurora `X/Y` plane, rotated around emitter-local `Z` | fixed: Web previously used `X/Z`; source-space rotation sign and reflected winding are now preserved |
| 2 | `Billboard_to_World_Z` | fixed Aurora world `X/Y` plane | existing `C=(x,z,y)` mapping and reversed winding retained |
| 3 | `Linked` | active-list endpoint `i -> i+1`; two camera projections scaled by reciprocal full 3D segment length | fixed: Web previously normalized only the 2D camera-plane projection |
| 4 | `Aligned_to_World_Z` | camera-derived transverse axis plus signed global Aurora `Z` height axis | fixed: world-Z sign now follows the camera-up hemisphere gate |
| 5 | `Aligned_to_Particle_Dir` | particle orientation slots `+0x2c..+0x38`; local `X/Z` quad axes | fixed: reflected source winding is now preserved |
| 6 | `Motion_Blur` | previous/current endpoint pair; same full-3D normalization as mode 3 | fixed: basis and trailing alpha now use full 3D segment length |

## Linked and Motion Blur normalization

Aurora first computes the segment's projections onto two camera vectors. It
then calls the reciprocal-length helper for the complete 3D segment and
multiplies both projections by that reciprocal. It does not renormalize the
2D camera-plane projection.

For a segment with camera-plane components `(rightProjection, upProjection)`
and full length `segmentLength`:

```text
transverse =
  cameraRight * (upProjection / segmentLength)
  - cameraUp * (rightProjection / segmentLength)

longitudinal =
  cameraRight * (rightProjection / segmentLength)
  + cameraUp * (upProjection / segmentLength)
```

This intentionally shrinks the rendered basis as the segment points into the
camera. A non-zero segment parallel to the camera direction produces zero
camera-plane basis; the renderer must not invent a world-Z fallback quad.

For mode `6`, Aurora doubles the half-X extent before calculating the previous
endpoint alpha:

```text
trailingAlphaFactor = min(evaluatedSizeX / segmentLength, 1)
trailingAlpha = particleAlpha * trailingAlphaFactor
```

The previous Web implementation used `evaluatedSizeX / projectedLength`.
That agreed only when the segment had no camera-depth component.

## Source-space winding

`C=(x,z,y)` is a reflection. Any basis built in Aurora source coordinates must
reverse its mapped triangle winding to preserve Aurora's native front face.
This applies to:

- mode `1`, whose native quad axes are emitter-local `X/Y`;
- mode `2`, whose native quad axes are world `X/Y`;
- mode `5`, whose native quad axes are particle-local `X/Z`.

Camera-derived modes `0`, `3`, `4`, and `6` build their final camera basis in
Three space and do not receive a second blanket winding reversal. The mapped
Linked regression verifies the front normal against the live camera.

## Regression coverage

`frontend/tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts` now
covers:

- mode `1` emitter orientation, local `X/Y` plane, reflected winding, and
  source-space rotation sign;
- mode `3` with a `3-4-5` segment containing camera depth;
- mode `4` with an inverted camera-up vector;
- mode `5` front-face winding in production `aurora-z-up`;
- mode `6` with a `3-4-5` previous/current segment and trailing alpha `0.2`;
- existing mode `0`, mode `2`, ordinary half extents, Linked topology, and
  camera-facing winding.

Focused result after the correction: `51/51` passed.

## Proof status

- No NWN process was started for this audit.
- Existing NWN MP4s remain immutable comparison oracles.
- Row `44` contains both `Motion_Blur` and `Aligned_to_Particle_Dir`, but its
  saved NWN recording starts after the maximum particle lifetime and is not a
  valid visual comparison.
- Row `50` also contains `Motion_Blur` and `Aligned_to_Particle_Dir`, but its
  saved capture remains inconclusive.
- Row `216` now has one fresh Web playback after this revision:
  `row216/aurora-web/aurora-web-row216-one-trigger-render-modes-full3d-20260718.mp4`.
  It records one trigger, no loop, diagnostics off, `2+20+2` seconds, and zero
  final particles.
- The saved row-216 NWN MP4 was reused without starting NWN. The synchronized
  comparison and manifest are in
  `row216/comparison-render-modes-full3d-20260718/`.
- The comparison shows a thick closed Web lash loop instead of the earlier
  thin segmented chain. Parity remains open because the Web proof lacks the
  NWN area and actors, screen-space endpoint anchoring is not exact, and the
  upper crossing/core saturation still differ.
- A Web-only fixed-time capture may diagnose modes `1`, `4`, or `5`, but it
  must not be presented as an NWN comparison when no valid saved NWN oracle
  exists for that exact fixture.

Status: `implementation-corrected-regressions-passed-row216-compared-open-gaps`.
