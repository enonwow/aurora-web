# Row 28 runtime camera-context audit

Date: 2026-08-24

Status: generic proof-pipeline defect confirmed; implementation in progress.

## Decision

The row 28 runtime fixture omitted the active-camera context required by the
already recovered Aurora particle `deadspace` reset contract. The source
`Flame01` emitter uses `deadspace=0.2094399929`, `spread=3.1415901184`, and
`Motion_Blur`. Without the camera, Aurora Web preserved the spread-only
orientation and emitted
`VFX_PARTICLE_DEADSPACE_CAMERA_POSITION_REQUIRED`. That changed the direction
of every five-particle detonate burst before rendering and therefore changed
the position, coverage, and energy of the impact peaks.

This is a pipeline-input defect, not an authorization for asset-specific
renderer behavior.

## Primary Aurora evidence

The governing reverse-engineering record is
`vfx-particle-deadspace-camera-orientation-audit-2026-08-13.md`:

- `FUN_00a2625c` derives particle velocity from the final particle quaternion;
- `FUN_00a264c0` reads the active camera, evaluates the emitter `deadspace`
  angle after spread composition, and applies the camera-relative correction;
- the correction consumes no additional random values;
- camera position and particle position must be in the same Aurora/source
  coordinate space.

No xoreos source was used. NWN and Toolset were not launched. The immutable
NWN MP4 remains the native visual oracle.

## Recovered proof-camera transform

The proof renderer uses these admitted data contracts:

- Three world camera: `[0.05148, 6.051473, -4.371987]`;
- Aurora owner alignment: `[-0.209423, 4.457438, 0]`;
- the production Area frame mirrors Three X once;
- Aurora-to-Three conversion is `C=(x,z,y)`.

Inverting the X mirror, subtracting the converted owner translation, and
mapping the relative Three vector back through `C` yields the owner-relative
Aurora camera:

`{ x: 0.157943, y: -8.829425, z: 6.051473 }`.

The conversion is structural. The values come from the versioned proof view
profile and effect-origin alignment; no row, VFX constant, resref, filename,
node, emitter, texture, fixture ID, tile, creature, or placeable selects a
runtime branch.

## Implementation contract

1. The fixture generator supplies the calibrated owner-relative Aurora camera
   through the existing generic runtime `cameraPosition` and
   `cameraContextSource` fields.
2. The shared runtime continues to apply `deadspace` solely when that source
   parameter and valid camera context require it.
3. RNG order, burst counts, event times, lifetimes, textures, material state,
   and renderer code remain unchanged.
4. Nested chunk runtime is not assigned the root owner camera. A nested model
   would require its own per-instance owner-relative camera if its source
   emitters used `deadspace`.
5. The generated payload must contain no
   `VFX_PARTICLE_DEADSPACE_CAMERA_POSITION_REQUIRED` diagnostic for the root
   runtime.
6. The asset-identity-neutral gate must pass before capture.

## Completion criteria

- fixture contract regression passes with the exact camera provenance;
- focused runtime, fixture, identity-neutral, and build gates pass;
- a new profile binds the regenerated payload and current build identity;
- exactly one fresh guarded Aurora Web capture is recorded;
- the saved NWN MP4 is reused without relaunch;
- a trigger-aligned paired MP4 and frame contact sheet are generated;
- visual status is reported as GOOD, CLOSE, or BAD from the fresh artifacts.
