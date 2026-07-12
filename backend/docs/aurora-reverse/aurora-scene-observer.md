# Aurora Scene Observer

Status: general v2 capture-and-context pipeline with a fail-closed visual-grid
camera-pose lane. It is not yet a semantic scene-recognition system or a full
world-yaw solver.

## Purpose

`areas:scene-observe` is the general foundation for an Aurora "eye": one
artifact that joins the real Toolset viewport with the matching source scene for
any requested module and Area. It is parameterized entirely by inputs; there
are no Area-name branches or fixture-specific rules.

```powershell
cd C:\Projects\aurora-web\backend
npm run areas:scene-observe -- `
  --module "the_last_city - codex.mod" `
  --area <area-resref> `
  --sourceModulePath <decompiled-module-directory> `
  --outDir <artifact-directory>
```

`--capturePath <viewport.png>` may replace live capture. Otherwise the tool
uses the validated Toolset viewport capture lane and does not move the cursor,
send keyboard input, or send mouse input.

## Universal inputs and outputs

| Input | Meaning |
| --- | --- |
| exact module name | binds the live Toolset frame |
| Area resref | selects the live Area and source resources |
| decompiled module directory | supplies the matching ARE/GIT/GIC/module.ifo |
| viewport image | current visual ground truth |

The output directory always contains:

- `viewport.png`: the exact validated `TScrollBox` capture;
- `source/area-source-pack/`: dynamic ARE/GIT/tileset contracts; and
- `scene-observation.json`: normalized capture, source-scene, visual-feature,
  camera, semantic-recognition, and comparison status.

## Current evidence boundary

The observer emits generic source context: Area dimensions, tile count and
orientations, object counts and placements, visual-transform counts, image
dimensions, content coverage, red guide pixels, and bright/saturated pixel
candidates. It does not infer names from a fixture.

It also runs `aurora-toolset-grid-pose/v1`. When two perpendicular Toolset grid
axis families are visible, the observer returns:

- `yawDegreesModulo90`: screen-grid orientation modulo 90 degrees;
- `pitchDegrees`: visual elevation from projected perpendicular tile spacing
  (`90` means top-down);
- `zoomPixelsPerTile`: a visual zoom metric; and
- `confidence`, detected line families, and spacing evidence.

The solver deliberately does not report full world yaw. A directed source anchor
is still required to resolve the remaining orientation ambiguity.

The observer returns exact blockers when evidence is unavailable:

- `toolset_grid_axes_not_detected`;
- `toolset_grid_pose_low_confidence`; and
- `scene_semantic_detector_not_implemented`.

Consequently it cannot yet claim that a particular tile, placeable, emitter, or
VFX instance is correct. Collection of source and image evidence is not treated
as semantic recognition.

## Capture integrity

The capture lane first validates one Toolset process, the exact module title,
the exact Area viewer, and the large `TScrollBox`. A uniform frame is rejected.
The physical-pixel fallback is allowed only for that exact viewport rectangle
when `WindowFromPoint` proves five inset points all belong to descendants of the
expected Toolset Area. If another window owns any probe point, no screen pixels
are recorded and the capture is blocked as
`toolset_viewport_obscured_by_foreground_window`.

No capture from a whole display is valid evidence.

## Promotion plan

1. Add a directed source anchor to resolve world yaw and calibrate visual zoom
   against Aurora camera distance.
2. Add tile and placeable detectors that project the source contract through the
   solved camera and compare expected against detected regions.
3. Add temporal capture and tracks for light/emitter/VFX analysis; one image is
   insufficient for particle behavior.
4. Permit parity only when the pose and semantic lanes meet their thresholds.
   Otherwise retain the exact blocker.

## Historical fixture note

The first fixture used `enon_bakery`, but generic-observer artifacts created
before the viewport integrity gate are not visual proof. They remain useful only
for source-contract shape and must be regenerated through this validated lane
before being cited as evidence.
