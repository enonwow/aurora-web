# Aurora VFX Coordinate-System Decompilation Audit - 2026-07-14

## Status

This is an Aurora-first audit of VFX coordinate handling. The confirmed mode-2
and Chunk-axis defects below are implemented in aurora-web; the saved
one-trigger NWN MP4 for row 22 remains the oracle recording. The implementation
does not change the signed vector map and does not claim camera parity.

The audit confirms several axis/basis defects in the current adapter. It does
**not** prove that the existing Aurora-to-Three vector map needs a sign flip.
Changing `(x, z, y)` to `(x, z, -y)` now would be speculation and is forbidden
until the cardinal-axis proof is captured from Aurora.

## Scope And Evidence

The read-only Aurora reference is:

`C:\Projects\New Folder\export\decompiled_all.c`

The editable implementation is:

`C:\Projects\aurora-web`

Primary decompilation anchors:

- `FUN_00a294ec` at `decompiled_all.c:853807-853951` maps the source render
  tokens to distinct native mode codes.
- `FUN_00a2e250` at `decompiled_all.c:855862-856614` builds separate render
  bases for those mode codes before emitting the particle vertices.
- `FUN_00a31070` at `decompiled_all.c:856838-856881` draws a Chunk model and,
  when rotation is active, builds an orientation from per-particle state.
- `FUN_00a264c0` at `decompiled_all.c:853007-853063` operates on all three
  source position components while deriving particle orientation/spread.

Implementation anchors audited:

- `frontend/src/modules/layout/adapters/three/auroraVfxCanonicalRenderer.ts`
  - source vector conversion: `2038-2044`
  - render-mode dispatch: `2000-2027`
  - simplified vertical basis: `2111-2122`
  - Chunk model placement/rotation: `1120-1132`
  - source model graph transforms: `1281-1305`
- `frontend/src/modules/vfx/dev/NwnVfxComparisonRunner.tsx`
  - row-22 side-on orthographic camera: `130-141`
  - explicit `sourceCoordinateSpace: "aurora-z-up"`: `167-172`

Current row-22 evidence reviewed, without recording it again:

- NWN MP4: `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22/nwn/nwn-row22-one-trigger.mp4`
- browser MP4 v2: `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22/web/web-row22-one-trigger-v2.mp4`
- comparison sheet: `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22/nwn-vs-aurora-web-row22-comparison-v2.png`
- comparison report: `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22/nwn-vs-aurora-web-row22-comparison-v2.json`

The comparison report is intentionally `valid-comparison-with-open-parity-gaps`,
not a canonical parity result. It records exactly one NWN trigger, reused NWN
recording, one browser playback, no loop, and no overlapping effects.

Latest implementation proof after the axis fix:

- browser MP4 v3: `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22/web/web-row22-one-trigger-v3.mp4`;
- browser validation v3: `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22/web/validated-summary-v3.json`;
- comparison v3: `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22/nwn-vs-aurora-web-row22-comparison-v3.png`;
- comparison report v3: `backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22/nwn-vs-aurora-web-row22-comparison-v3.json`.

The v3 validator records one browser playback, no loop, no overlap, clean
post-roll, active source light, and zero drawn particles at completion. It
proves the changed mode-2 and Chunk-axis routes are live in the deterministic
Web fixture. The NWN camera remains different, so v3 is not evidence of signed
axis or pixel parity.

## Recovered Native Contract

Aurora does not treat all particle render modes as one generic camera billboard.
The recovered token-to-mode mapping is:

| Source token | Native mode | Recovered native route |
| --- | ---: | --- |
| `Normal` | 0 | Camera quaternion/basis (`855862-855882`). |
| `Billboard_to_World_Z` | 2 | Separate world-Z branch, initialized from a fixed axis and then rotated (`855884-855912`). |
| `Billboard_to_Local_Z` | 1 | Separate branch using the emitter orientation quaternion at `param_1 + 0x68` (`855913-855933`). |
| `Linked` | 3 | Consecutive-particle segment route (`855935`, `856418-856494`). |
| `Aligned_to_World_Z` | 4 | Keeps the camera-derived first quad vector, then overwrites only the second vector with global Z (`856598-856602`). |
| `Aligned_to_Particle_Dir` | 5 | Per-particle orientation quaternion (`856495-856520`). |
| `Motion_Blur` | 6 | Previous/current particle positions and camera-basis projection (`856337-856417`). |

Therefore `World_Z`, `Local_Z`, `Linked`, and `Aligned_to_World_Z` must not be
collapsed into one implementation merely because each is visually related to an
axis. They consume different native state.

## Row 22 Axis Facts

The row-22 runtime payload is a useful source-coordinate witness. Its motion is
not ambiguous about elevation:

| Emitter | Native mode | Source-coordinate observation |
| --- | --- | --- |
| `Smoke` | `Normal` | Position range: `z=0.281..4.912`, versus `y=-0.589..0.633`; initial velocity has `z=2.316`. |
| `Flame01` | `Motion_Blur` | Initial velocity has `z=14.917`; the source position begins at `z=0.769`. |
| `Chunkssml` | `Normal` Chunk lane | Initial particle acceleration is `z=-9.81`, with active Chunk rotations later in the run. |
| `Ring` | `Billboard_to_World_Z` | The fireball's primary burst uses the native mode-2 route. |

This confirms the current intent of mapping Aurora elevation `Z` to Three
elevation `Y`. The existing runner already passes `sourceCoordinateSpace:
"aurora-z-up"`; a missing source-coordinate flag is **not** the cause of the
row-22 result.

The current row-22 comparison runner uses an orthographic camera at `(0, 0, 3)`
looking at the origin. With the present map `(x, z, y)`, that is a side view of
the Aurora ground plane: source `X` is screen-horizontal, source `Z` is
screen-vertical, and much of source `Y` becomes depth. The saved NWN frame is
top/oblique. The visibly tall smoke in aurora-web is consequently compatible
with the recovered source motion; it alone does not prove a wrong `Y/Z` swap.

## Confirmed Defects

### Implemented P1 - `Billboard_to_World_Z` no longer falls back to a generic camera billboard

The native mode-2 branch is distinct. Before this change, the dispatch did not
select a world-Z basis for `billboard_to_world_z`; it reached
`resolveCameraXyParticleBasis()` instead. The prior implementation note
explicitly called this a compatibility fallback in
`vfx-placeable-emitter-architecture-audit-2026-07-12.md:308-311`.

The adapter now selects the existing world-Z basis for mode 2 and excludes that
mode from the generic camera-billboard updater. Row 22 exercises this path
through `Ring`. The exact native branch coefficients still need the cardinal
oracle before this may be called visual parity.

### Implemented P1 - `Aligned_to_World_Z` is no longer collapsed into Mode 2

The native mode-4 route does not start from Mode 2's fixed identity X/Y quad.
After it derives the camera-facing first vector, `FUN_00a2e250:856598-856602`
overwrites only the second vector with global Z. The adapter now keeps its
camera-derived first vector, locks the second to Three Y after the Aurora
Z-up conversion, and participates in the live camera geometry refresh. The
focused renderer test asserts this distinct route. That refresh now copies the
rebuilt geometry diagnostics as well as its position buffer, so capture
metadata cannot describe the pre-camera state. This is a decompilation contract
repair, not a visual-parity claim: no retained retail capture yet exercises
Mode 4.

### P1 - Remaining route and camera-oracle risks

`Billboard_to_Local_Z` and `Linked` must remain distinct because the native
routes consume emitter orientation and consecutive-particle state
respectively. Mode 3 has its own segment construction and must not be treated
as an axis billboard.

The affected code also hard-codes Three camera-plane normal `(0, 0, 1)` for
velocity/motion bases. That is a proof-runner assumption, not an Aurora camera
contract.

### Implemented P1 - Chunk rotation now carries the particle orientation axis

For a native Chunk rotation, `FUN_00a31070` takes the particle vector at
`+0x44/+0x48/+0x4c`, normalizes it, builds a quaternion from half of the
particle rotation, and passes that orientation to the model (`856868-856881`).
Before this change, the adapter performed only:

```ts
instance.rotation.z = particle.rotationRadians;
```

That was neither an Aurora local-axis rotation nor a coordinate-converted
quaternion. The prior Chunk render-contract shape transported the scalar angle
but not the native rotation axis needed to reproduce it.

The runtime now records the normalized post-spread, emitter-oriented particle
direction as `rotationAxis`; the render contract transports it and the Three
adapter converts it with the existing source-coordinate map before applying the
particle angle as a quaternion. This is live for row 22, not a hypothetical
edge case: 1200 of 1208 recorded active Chunk instances have a nonzero
`rotationRadians` value (range `0..6.267`). The white/untextured Chunk material
remains a separate open gap.

### P1 - Source-model graph transforms bypass the coordinate contract

The renderer interface labels model-graph values as local Aurora transforms,
yet `applyCanonicalModelGraphTransform()` copies `[x, y, z]` straight into a
Three group and uses the raw axis-angle vector as a Three axis. It receives no
`sourceCoordinateSpace` parameter. This puts placeable-hosted source lights,
static nodes, wrappers, and orientations outside the same conversion contract
used for runtime particle positions.

This is not the direct cause of the standalone row-22 runner, which does not
pass a model graph. It is an implementation risk for the requested placeable
VFX work and must be fixed as one coordinate contract, not with per-node
offsets.

## Not Yet Proven: Handedness And Sign

The present vector map is:

```ts
Aurora (x, y, z) -> Three (x, z, y)
```

Its matrix has determinant `-1`; it is a reflection. A proper rotation from a
Z-up space to a Y-up space would commonly require a sign change, but the
decompilation excerpts above establish mode separation and Z-up semantics,
not the camera-facing handedness/sign required to choose that change safely.

Do not flip the sign now. A reflection also changes how orientation quaternions
must be converted, so changing positions alone would create another mismatch.

## Required Implementation Order

1. Capture an Aurora cardinal-axis oracle: a source fixture with visibly
   distinct `+X`, `+Y`, and `+Z` offsets plus a non-zero local orientation.
   Preserve one MP4 and the camera values. This is a new fixture, not a rerun
   of the row-22 NWN proof.
2. Add one named Aurora-to-Three transform contract after the oracle establishes
   the signed mapping. Convert vectors, normals, velocity, previous position,
   linked endpoints, model-node positions, and Chunk positions through it.
3. Convert orientations as transforms, not axis components: derive
   `R_three = C * R_aurora * inverse(C)` and use the matching quaternion/matrix
   representation. The Chunk particle axis is now transported; the signed
   transform is still pending the cardinal oracle.
4. Implement the native render-mode routes separately: mode 2 world-Z is now
   routed separately; still implement mode 1 local-Z with emitter orientation,
   mode 3 linked, mode 4 aligned world-Z, mode 5 particle direction, and mode
   6 motion blur.
5. Match the browser proof camera to the saved NWN camera/projection before
   judging X/Y/Z layout. The current side-on runner may still be retained as a
   diagnostic view, but it cannot be the parity view.
6. Add focused cardinal/basis tests, then record exactly one fresh browser MP4
   for the changed implementation. Reuse the existing one-trigger NWN MP4 and
   produce a new comparison sheet. Do not call it canonical until camera,
   geometry, light spill, duration, Chunk material, and axis evidence agree.

## Proof Gate

No coordinate-system change is accepted by tests alone. The admission packet
must contain:

- decompilation anchor(s) for the route being changed;
- the Aurora cardinal-axis MP4 and its camera/projection values;
- one browser MP4 for that exact implementation version, with one playback;
- a side-by-side comparison that uses the same camera contract; and
- a statement of remaining visual differences rather than a parity claim when
  any of the above is missing.
