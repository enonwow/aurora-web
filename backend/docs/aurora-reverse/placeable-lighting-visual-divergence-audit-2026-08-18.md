# Placeable lighting visual-divergence audit (2026-08-18)

## Decision

The current Aurora Web capture does **not** demonstrate NWN-equivalent
placeable lighting. It demonstrates that the `placeables.2da` light source is
resolved and that a Three.js `PointLight` plus Web-only presentation layers are
inserted into the scene.

The largest confirmed cause of the visual difference is architectural: the
Area terrain shown in the proof is rendered with `THREE.MeshBasicMaterial`.
That material is unlit and does not receive the placeable `PointLight`. The
large bright circle visible in the Web capture is therefore not proof of light
falloff across the Area floor. It is dominated by a procedural, camera-facing
additive halo sprite whose depth test is disabled.

The earlier statement that the clean Web frame showed a "local illumination
footprint on the Area receiver" is superseded by this audit. The defensible
claim is narrower: the source light node is present, the preview halo is
visible, and the campfire VFX host has settled. Receiver illumination in an
Area is not yet proven.

Retail pixel parity remains blocked.

## Scope and proof classification

Candidate:

- NWN blueprint: `plc_campfr`
- source model: `PLC_I06` / `plc_i06`
- Aurora Web template: `plc_plc_i06`
- `LightColor=6` (`PaleYellow`)
- runtime RGB vector: `[1.9, 1.9, 1.0]`
- Toolset display RGB: `[0.94, 0.94, 0.77]`
- source carrier: `fx_placeable01.mdl/AuroraLight01`
- source radius: `10` Aurora model units
- `ShadowSize=1`, selecting `fx_shadow_m`

Evidence used:

- historical NWN observation:
  `artifacts/light-shadow-2026-07-03-shadowvol-preview/retail-or-toolset-shadowvol-campfire.png`
- fresh Web Area capture:
  `artifacts/placeable-lighting-nwn-web-comparison-2026-08-18/aurora-web-area-winds-study-plc-i06-light-on-readable-clean-v3.png`
- fresh Web frame manifest:
  `artifacts/placeable-lighting-nwn-web-comparison-2026-08-18/aurora-web-area-winds-study-plc-i06-light-on-readable-clean-v3.frame.json`
- readable presentation sheet:
  `artifacts/placeable-lighting-nwn-web-comparison-2026-08-18/nwn-vs-aurora-web-plc-campfr-readable-comparison-v3.png`

The NWN image is a historical observation, not a fresh, versioned, matched
oracle. The scene, camera, receiver material, capture time, graphics profile,
gamma/brightness, and postprocess settings are not controlled between the two
images. Consequently, the images establish a gross visual mismatch but cannot
by themselves assign an exact numerical contribution to each cause below.

No Toolset or NWN process was launched for this audit.

## Pipeline reconstruction

### Recovered retail inputs

The source-data lane is substantially correct:

1. `CNWCArea::AddPlaceableObjectLight` uses
   `fx_placeable01/AuroraLight01`.
2. The recovered carrier radius is `10`, shadow radius is `15`, and vertical
   displacement is `3` Aurora model units.
3. Subsequent shader-path review supersedes the earlier linear-surface claim.
   The active `inc_lighting.shd` gamma-zero branch evaluates
   `1/(1+lightQuadraticAtten*d2)`, while the light upload path supplies
   `lightQuadraticAtten=9/(max(radius,0.1)^2*2)`. The recovered linear
   `max(0,1-distance/radius)` path is a CPU aggregate and is not the surface
   pixel equation. The gamma-one branch still depends on unrecovered runtime
   constants.
4. `placeables.2da.LightColor` selects the `lightcolor.2da` runtime RGB vector.
5. `ShadowSize=1` selects the medium `fx_shadow_m` lane.

These facts prove source lineage. They do not prove that the Web material,
intensity transfer, framebuffer composition, emitter scheduling, or shadow
projection matches NWN.

### Current Web path

```text
placeables.2da + lightcolor.2da
                |
                +--> Three.PointLight
                |      color = RGB / max(RGB)
                |      intensity = max(RGB)       [preview adapter]
                |      distance = 10 * scene scale
                |                X
                |          Area terrain is unlit MeshBasicMaterial
                |
                +--> procedural 128x128 radial halo sprite
                |      additive, depthTest=false  [Web-only presentation]
                |
PLC_I06 emitters +--> canonical VFX meshes --> custom bloom/postprocess
                |
ShadowSize=1    +--> fx_shadow_m proxy/stencil preview
                       local opacity calibration, parity blocked
```

In the NWN observation, the visible result is instead the combined output of
the lit wood receiver, the local light, the bright flame emitter, retail
framebuffer ordering/postprocess, and retail shadow handling. Aurora Web does
not currently recreate that combination for this proof.

## Findings

| ID | Severity | Status | Finding | Visual consequence |
| --- | --- | --- | --- | --- |
| PLD-01 | critical | confirmed | Area tile model materials are converted to `THREE.MeshBasicMaterial`; ImageMap2D surfaces are also created as `MeshBasicMaterial`. The recorded mode is `texture_color_unlit_use_area_lighting_disabled`. | The floor in the Web proof cannot receive the placeable `PointLight`. The proof cannot show NWN-style light response on wood or terrain. |
| PLD-02 | critical | confirmed | Every placeable 2DA light creates a browser-generated 128x128 radial-gradient sprite. It is additive, camera-facing, `depthWrite=false`, and `depthTest=false`; its opacity and size are local heuristics. | The Web image shows a flat grey/yellow circular glow independent of receiver normals, texture, occlusion, and depth. This is the dominant visible "light footprint" in the proof. |
| PLD-03 | high | confirmed | The source contains an RGB vector, not a separate intensity. Web normalizes RGB into `Three.Color` and uses the maximum channel as `PointLight.intensity`; the code labels this `preview-adapter-rgb-max-intensity-no-source-intensity-field`. | Energy and material response are adapter semantics, not a recovered retail transform. Matching radius/falloff alone cannot produce matching brightness. |
| PLD-04 | high | confirmed | The halo display color prefers `lightcolor.2da` Toolset display RGB, while the point light uses runtime RGB. | One visible Web layer is tinted with editor-display data instead of the runtime light vector, further separating the screenshot from the NWN runtime output. |
| PLD-05 | high | confirmed symptom; exact internal cause blocked | The fresh Web frame has one settled VFX root, 81 frames, frame 4 at 0.5 seconds, two visible draw meshes, ten visible particle draw entries, and bound `fxpa_flame00`/`fxpa_smoke01`. Nevertheless, visual inspection shows smoke and a weak or absent bright flame core compared with NWN. | The main high-luminance source that should drive warm color and bloom is missing or much weaker. The exact contribution of atlas frame, particle color/alpha, scheduling, blending, and postprocess cannot be isolated from the existing capture. |
| PLD-06 | high | confirmed | Web bloom runs with threshold `1`, seven downscale steps, softness `0.9`, multiplier `1`, followed by custom dynamic contrast, vibrance, and type-4 color correction. | Even source-inspired postprocess cannot create NWN-like fire bloom when the receiver does not light and the flame input is weak. Exact NWN-profile equivalence remains unproven. |
| PLD-07 | medium | confirmed | The placeable 2DA `PointLight` is created without enabling point-light shadow casting. A separate `fx_shadow_m` proxy/stencil lane uses Web-local opacity multipliers `0.32` and `0.26`, explicitly labelled pixel-parity blocked. | Grounding, contact shadow, and light/shadow interaction differ from NWN even when the light node exists. |
| PLD-08 | high | confirmed proof defect | The NWN side is historical and the two captures use different Areas, cameras, scales, receivers, animation instants, and unrecorded graphics profiles. | The sheet is useful to reject parity, but it cannot be used as a calibrated A/B comparison or to tune constants safely. |

## Evidence anchors

### Unlit Area receiver

- `frontend/src/modules/layout/adapters/three/workspaceTerrainMesh.ts:187-190`
  declares the terrain mode
  `texture_color_unlit_use_area_lighting_disabled`.
- `workspaceTerrainMesh.ts:2669-2679` creates ImageMap2D terrain with
  `THREE.MeshBasicMaterial`.
- `workspaceTerrainMesh.ts:4542-4633` converts tile-model materials to
  `THREE.MeshBasicMaterial`.
- `workspaceTerrainMesh.ts:5153-5165` applies that conversion to loaded Area
  tile models.

`THREE.PointLight` cannot affect those materials. This is the decisive reason
the current Web image cannot reproduce the illuminated wooden floor in the NWN
observation.

### Procedural halo substituted for receiver response

- `frontend/src/modules/layout/adapters/three/workspacePlaceableModelPresentation.ts:5976-6005`
  creates a browser canvas radial gradient; it is not an Aurora resource.
- `workspacePlaceableModelPresentation.ts:6153-6174` creates the additive
  sprite, disables depth testing, and sizes/attenuates it with local formulas.
- The Area path calls the light group with `showPreviewReceiver=false` at
  `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts:21618-21629`.

Therefore the clean Area capture does not even contain the focused preview's
lit `MeshStandardMaterial` debug receiver. It contains the unlit Area terrain
plus the depth-independent halo.

### Adapter-only light energy

- `workspacePlaceableModelPresentation.ts:140-147` explicitly documents that
  the max-RGB intensity split is a preview adapter and that there is no source
  intensity field.
- `workspacePlaceableModelPresentation.ts:6019-6024` performs the split.
- `workspacePlaceableModelPresentation.ts:6061-6066` constructs the Three.js
  point light.
- `workspacePlaceableModelPresentation.ts:6766-6794` separately derives the
  halo/display tint and prefers Toolset RGB.

### Flame and framebuffer evidence

- The fresh frame manifest records `visibleDrawMeshCount=2`,
  `visibleDrawParticleCount=10`, and bound textures `fxpa_flame00` and
  `fxpa_smoke01` at elapsed time `0.5` seconds.
- `frontend/src/modules/layout/adapters/three/auroraRetailBloomPass.ts:182-204`
  contains the active Web bloom/postprocess defaults.
- `auroraRetailBloomPass.ts:1674-1800` shows the Web composition order:
  linear scene, SSAO, raw-gamma VFX composite, bloom, and postprocess.
- `frontend/AURORA_FIRST_IMPLEMENTATION_MATRIX.md:95-108` classifies the VFX
  runtime as `PARTIAL_SOURCE_BACKED_RETAIL_BLOCKED` and explicitly separates
  renderer eligibility from retail parity.

### Shadow proxy status

- `workspacePlaceableModelPresentation.ts:168-215` labels the fast-shadow
  projection and stencil paths pixel-parity blocked and declares Web-local
  opacity scales `0.32` and `0.26`.
- `workspacePlaceableModelPresentation.ts:7488-7554` and `:7568-7690` apply
  those preview calibrations.

## Root-cause conclusion

The drastic mismatch is not one wrong brightness constant. It is the result of
comparing two different rendering constructions:

1. Aurora Web correctly resolves the light's source identity, color row,
   radius, offset, falloff family, and shadow-size family.
2. The Area receiver used by the proof is unlit, so that recovered point light
   cannot illuminate it.
3. Web then supplies a procedural halo that visually resembles a light radius
   but is not material illumination.
4. The flame emitter is technically present but does not supply the dense,
   bright warm core visible in NWN.
5. Web uses adapter-only energy/color decisions and a custom framebuffer path.
6. Shadow appearance is a separate parity-blocked proxy.
7. The comparison is not controlled tightly enough to recover the remaining
   retail transforms by measurement.

The status below describes the 2026-08-18 capture and is superseded for Web
receiver functionality by
`placeable-lighting-source-receiver-implementation-2026-08-19.md`:

- source data integration: **implemented and source-backed**;
- Web preview light-node insertion: **implemented**;
- actual Area receiver illumination proof: **failed / not demonstrated in the
  2026-08-18 capture; verified by isolated OFF/ON ablation on 2026-08-19**;
- NWN visual parity: **failed and retail-blocked**.

## Remediation order

### P0: make Area surfaces eligible to receive local light

Introduce a source-backed lit terrain material path when Area lighting is
enabled. Preserve the unlit Toolset presentation only for the exact mode that
requires it. A `PointLight` proof is meaningless until the proof receiver uses
a light-reactive material.

### P0: separate proof layers

Add independently switchable and observable lanes for:

- placeable point light;
- procedural halo;
- placeable flame/smoke VFX;
- fast-shadow proxy;
- bloom/postprocess.

Parity captures must disable the procedural halo unless retail evidence proves
an equivalent retail layer. Debug layers must never be accepted as receiver
illumination.

### P1: obtain a controlled retail oracle

Capture the same immutable module, Area, placeable, transform, animation time,
camera, resolution, graphics profile, gamma/brightness, shader quality,
postprocess state, and time-of-day in NWN. Record all of those values in the
proof manifest.

### P1: recover and validate material/light energy semantics

Do not tune the Three.js intensity by eye. Recover or experimentally isolate
the retail RGB-to-framebuffer transform, receiver material response, light
selection/budget behavior, and unit conversion. Keep unknowns fail-closed.

### P1: close the flame VFX mismatch

Using the controlled retail frame, isolate atlas frame selection, birth/life
scheduling, particle transform/size, vertex color and alpha, blend factors,
raw-gamma ordering, and bloom input. The visible flame core must be proven
before global bloom tuning.

### P2: close shadow presentation

Replace or validate the Web-local proxy/stencil opacity choices against the
same retail oracle. Do not use the current proxy as evidence of pixel parity.

## Completion criteria

Placeable lighting may be called visually complete only when all of the
following pass:

1. A fixed-camera Web ablation with VFX, halo, and shadow preview disabled shows
   a repeatable receiver-luminance delta between `LightState=1` and
   `LightState=0` on a light-reactive Area material.
2. The proof manifest records the receiver material class and confirms it is
   affected by scene point lights.
3. A separate fixed-camera ablation proves the flame/smoke lane and records the
   actual visible emitter batches, atlas frames, blend factors, color/alpha,
   and bloom-stage input.
4. No procedural/debug halo or receiver is counted as Area illumination.
5. The NWN and Web captures use the same immutable candidate, Area geometry,
   camera calibration, animation time, resolution, and recorded renderer
   profile.
6. The paired images pass visual inspection and a versioned ROI/radial-profile
   tolerance defined from the controlled oracle.
7. Shadow parity is either independently accepted or explicitly excluded from
   the lighting completion claim.
8. The proof packet has fresh timestamps, settled contracts/assets, no
   unexpected bridge or failed tiles, exact screenshot artifacts, and
   `canonicalParityPromoted=true` only after every required observation is
   complete.

Until those gates pass, the feature must be described as a source-backed Web
preview, not the same lighting effect as NWN.

## 2026-08-19 implementation correction and fresh visual verdict

The 2026-08-18 unlit-receiver finding remains valid for that historical
capture, but it no longer describes the current Web receiver path. A lit Area
receiver and isolated local point-light response are now verified. A second
defect was then found and fixed: the generic `plc_campfr` placeable received a
derived GLB but not its source `auroraModelGraph`, because the backend graph and
light decorators were classified as VFX/light-source-only. The Area proof also
did not bind exact `appearanceType=58`, and stale cached packages preserved the
incomplete response.

The correction removes the subtype restriction, binds the exact appearance,
bumps placeable processing to `v8`, separates model and fast-shadow texture
diagnostics and makes the Area capture wait for actual model texture
settlement. The fresh accepted capture now shows the real textured campfire,
not the previous white placeholder:

- model `loaded`, texture status `applied`, six textures loaded;
- host graph `pass`, assets `settled`, draw ledger `pass`;
- four static source nodes and five emitter nodes attached;
- one point light and four reactive Area receiver meshes;
- 32 visible particle draws with `fxpa_flame00` and `fxpa_smoke01` bound.

The current readable comparison is:

![Historical NWN versus current textured Aurora Web campfire](artifacts/placeable-lighting-source-receiver-proof-2026-08-19/nwn-historical-vs-aurora-web-textured-diagnostic-2026-08-19.png)

This fixes `PLD-01` for the current Area path and closes the white-placeable
regression. It does **not** close `PLD-03`, `PLD-05`, `PLD-06`, `PLD-07` or
`PLD-08`. The current Web frame still lacks the high-luminance flame core and
broad warm glow visible in NWN. Because the NWN panel remains historical and
unmatched, the comparison rejects parity but cannot calibrate the missing
framebuffer transform.

Fresh isolated OFF/ON evidence confirms that the local point light itself is
functional: same scene/camera/viewport, `pointLightCount 0 -> 1`, mean absolute
RGB delta `3.575559156378266`, mean luma delta `4.140177781014975`, and
`21.812268518518518%` of samples changed by more than five RGB levels. The
machine report intentionally retains
`canonicalParityPromoted=false`.

Current completion boundary:

- textured placeable presentation: **pass**;
- source-backed Web receiver response: **pass**;
- flame/bloom visual parity: **fail / unresolved**;
- matched NWN oracle: **missing**;
- overall NWN visual parity: **not complete**.
