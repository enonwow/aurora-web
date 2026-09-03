# Placeable lighting: NWN vs Aurora Web proof packet (2026-08-18)

## Decision

The original wide contact sheet and its older Web frames are superseded as
visual evidence. Although their technical manifests had `accepted=true`, visual
inspection failed: the relevant placeable was too small, hidden by a selection
overlay, or shown against a debug receiver that was not comparable with NWN.
`accepted=true` alone was therefore not sufficient.

The replacement Area capture
`aurora-web-area-winds-study-plc-i06-light-on-readable-clean-v3.png` passes
visual inspection only for the presence of the placeable, its settled VFX host,
the inserted point-light node, and the Web preview halo. The later causal audit
`placeable-lighting-visual-divergence-audit-2026-08-18.md` found that the Area
terrain is rendered with unlit `THREE.MeshBasicMaterial` and therefore cannot
receive the inserted point light. The visible bright circle is dominated by a
procedural additive halo, not proven receiver illumination. The earlier claim
of a visible illumination footprint on the Area receiver is superseded. Retail
pixel parity is neither achieved nor proven.

The NWN side of the visual comparison is the repository's existing retail
observation from 2026-07-07. It identifies `plc_campfr` / `PLC_I06` in the
captured runtime UI, but it is not a fresh proof captured under the current
versioned Toolset/NWN profile contract. Its current proof classification is
therefore `modelVisibility=visible`, `proofCompleteness=missing`.

| Proof point | Result | Evidence |
| --- | --- | --- |
| Earlier Web focused/Area frames | **visual proof failed; contract only** | Technical gates passed, but the target/effect was not readable enough for visual acceptance |
| Aurora Web campfire in an Area, clean v3 | **light node and preview halo visible; receiver illumination not proven** | Fresh CDP capture, `accepted=true`; Area terrain loaded, one rendered `plc_i06`, `pointLightCount=1`, but the Area receiver is unlit `MeshBasicMaterial` |
| Aurora Web illumination disable control | **verified** | Fresh CDP capture, `accepted=true`; `lightState=0`, status `disabled`, point-light count `0` |
| NWN campfire visibility | **observed, historical** | Existing retail screenshot names `plc_campfr` / `PLC_I06` in the runtime UI |
| NWN-to-Web visual parity | **not achieved / not proven** | Readable images visibly differ, and there is no fresh same-camera NWN profile/capture |

## Candidate identity

- Retail blueprint: `plc_campfr`
- Source model: `PLC_I06` / `plc_i06`
- Aurora Web catalog template: `plc_plc_i06`
- `placeables.2da` lighting inputs:
  - `LightColor=6`
  - label `PaleYellow`
  - runtime RGB vector `1.9, 1.9, 1.0`
  - Toolset display RGB `0.94, 0.94, 0.77`
  - source radius `10` Aurora model units; current preview distance `5`
  - `ShadowSize=1`, selecting the medium `fx_shadow_m` lane

## Visual comparison

This replacement contact sheet uses enlarged ROIs so the lighting can actually
be inspected. It is an observational comparison, not a pixel-parity artifact.
The camera, scale, receiver material, surrounding Area, and capture freshness
are not matched. The NWN side is historical; the Web side is fresh.

![Readable NWN and Aurora Web campfire comparison](artifacts/placeable-lighting-nwn-web-comparison-2026-08-18/nwn-vs-aurora-web-plc-campfr-readable-comparison-v3.png)

The old sheet
`nwn-vs-aurora-web-plc-campfr-comparison.png` has
`visualInspection=failed` and must not be cited as proof of visible lighting.

### Full-size source frames

The downscaled contact sheet is insufficient for judging receiver lighting.
The two source frames below must be inspected at their native 1280x900 size.
They are intentionally kept as separate, unmodified captures.

NWN retail observation, historical:

![NWN retail campfire full frame](artifacts/light-shadow-2026-07-03-shadowvol-preview/retail-or-toolset-shadowvol-campfire.png)

Aurora Web settled Area capture:

![Aurora Web campfire full frame](artifacts/placeable-lighting-nwn-web-comparison-2026-08-18/aurora-web-area-winds-study-plc-i06-light-on-readable-clean-v3.png)

Direct visual verdict:

- NWN shows a bright white/yellow flame core and a warm response on the wood
  receiver extending around the campfire;
- Web shows the placeable model, a weak/smoky flame presentation, and a broad
  grey presentation halo against a dark unlit receiver;
- the Web grey circle is not equivalent to the NWN warm wood response because
  the Web Area receiver is `MeshBasicMaterial` and cannot consume the inserted
  `THREE.PointLight`;
- camera and scene context are not calibrated, so this pair is an
  observational failure comparison rather than a pixel-difference parity
  measurement.

The source hashes are:

- NWN: `bd3dad34f7e17544f74628139b480b65274655b7b1d2e21107ec87e359f9a508`;
- Web: `c841887766a80ed764b1278b979e5da8819db90c086114511a9afa76216bf9ad`.

### Post-harness receiver diagnosis

The later isolated point-light-only Area run records one point light, four
actual Area receiver meshes, zero reactive receiver materials, and four
`MeshBasicMaterial` receivers. Its status is `blocked` with
`APL-PROOF-AREA-RECEIVER-UNLIT` and
`APL-PROOF-ASSETS-NOT-SETTLED`. The guarded capture correctly wrote only a
blocker manifest and no accepted PNG:

`artifacts/placeable-lighting-proof-harness-2026-08-18/campfire-point-light-only-unlit-receiver-diagnostic-v2-2026-08-18.frame.json`.

This post-harness result strengthens the failure diagnosis; it does not turn
the historical NWN observation into a fresh matched retail proof.

## Fresh Aurora Web proof facts

### Focused catalog capture

Artifact:
`artifacts/placeable-lighting-nwn-web-comparison-2026-08-18/aurora-web-plc-campfr-light-on-close.png`

Frame:
`artifacts/placeable-lighting-nwn-web-comparison-2026-08-18/aurora-web-plc-campfr-light-on-close.frame.json`

- captured at `2026-08-18T16:21:42Z`
- direct Chrome DevTools Protocol `Page.captureScreenshot`
- `accepted=true`
- runtime identity `ready`
- canonical host graph `pass`
- asset settlement `settled`
- draw ledger `pass`
- particle shader ledger `pass`
- playback guard `pass`
- placeable 2DA light proof `ready`
- status `active`
- source count `1`
- Three point-light count `1`
- fast-shadow count `1`
- disabled count `0`
- `canonicalParityPromoted=false`
- `localOnlyNotRetailEvidence=true`

### Illumination-off control

Artifact:
`artifacts/placeable-lighting-nwn-web-comparison-2026-08-18/aurora-web-plc-campfr-light-off-close.png`

Frame:
`artifacts/placeable-lighting-nwn-web-comparison-2026-08-18/aurora-web-plc-campfr-light-off-close.frame.json`

- same template, time, seed, and camera distance scale as the focused on capture
- `lightState=0`
- `accepted=true`
- status `disabled`
- Three point-light count `0`

The on/off pair is the local runtime/contract causal check that the placeable
light is removed by `LightState`. Because the settled cameras differ slightly,
it is not promoted as a same-camera pixel ablation.

### Readable, overlay-free Area terrain capture (replacement)

Artifact:
`artifacts/placeable-lighting-nwn-web-comparison-2026-08-18/aurora-web-area-winds-study-plc-i06-light-on-readable-clean-v3.png`

Frame:
`artifacts/placeable-lighting-nwn-web-comparison-2026-08-18/aurora-web-area-winds-study-plc-i06-light-on-readable-clean-v3.frame.json`

- captured at `2026-08-18T17:00:35.276Z`
- route `/dev/area-light-shadow-preview`
- Area `area__winds_study`
- proof object `aurora-web-proof:plc_plc_i06`
- source position `[1, 1, 0]`
- `cameraDistanceScale=0.08`
- `highlightInjectedCampfire=false`
- rendered child `placeable_2da_light_source`
- terrain and canonical placeable model assets settled
- canonical static/emitter host graph `pass`
- runtime observability proof gate `pass`, no blockers
- Area render status `ready`
- rendered object count `1`
- placeable model status `loaded`
- placeable model mesh count `4`
- visible particle count `10`
- visible texture references `fxpa_flame00`, `fxpa_smoke01`
- `pointLightCount=1`
- overall `accepted=true`
- visual inspection `pass` for local-light visibility
- visual inspection `fail` for NWN parity

This is an Area-context proof object, not a persisted GIT mutation.

## Current runtime identity

- commit identity: `dirty-placeable-lighting-clean-proof-7f6ba62a`
- image digest:
  `sha256:7f6ba62a1f9cf0f28de23d7e02a43469e2407f9b88787673bc31f3c07cc92d29`
- built at: `2026-08-18T16:56:56.459Z`
- backend/frontend identity match: `ready`

## Persisted Area candidate and blocker

A separate test used the existing placed object `witcher263` in
`area_njkb_hire_pr_1`. Its instance is source-backed as:

- tag `witcher2_campfire`
- appearance type `7053`
- catalog model `wit2_0049`
- `LightColor=6`
- `ShadowSize=1`

The Area metadata transport defect that dropped placeables.2da light fields was
fixed and covered by the focused service test. The live renderer capture for
this custom candidate remains blocked for an independent delivery reason: its
single process response is `373,031,633` bytes, while the proof backend cache
entry limit is `128 MiB`. The subsequent asset delivery lookup returns `404`,
so that capture is correctly rejected. Raising the cache to more than 373 MB
only for a screenshot was not used as proof.

Rejected blocker frame:
`artifacts/placeable-lighting-nwn-web-comparison-2026-08-18/aurora-web-area-njkb-hire-pr-1-witcher263-light-on.frame.json`

## Verification

- Focused backend test:
  `npm.cmd run test:unit -- --runInBand test/unit/catalog.application.service.spec.ts -t "processPlaceable rebinds shared Area GIT model cache hits"`
  - result: `1 passed`
- Backend TypeScript build:
  `npm.cmd run build`
  - result: passed
- Focused frontend lighting-policy tests from the implementation slice:
  - result: `18 passed`
- Focused Area proof-camera/overlay tests:
  `npx.cmd vitest run tests/unit/app/App.areaLightShadowPreviewRunner.test.tsx`
  - result: `5 passed`
- Frontend production build:
  `npm.cmd run build`
  - result: passed; Rollup reported only the existing large-chunk warning

## Artifact hashes

| Artifact | SHA-256 |
| --- | --- |
| historical NWN screenshot | `bd3dad34f7e17544f74628139b480b65274655b7b1d2e21107ec87e359f9a508` |
| fresh Web focused on PNG | `906ebb72349a051bf70d7770a1e9233b1874b2ef8fbed399b1475d48daecc288` |
| fresh Web focused on frame | `317f0a3bf224f1cdd34278a70a69e1b9995ec28fc8ffa481c665469f0382a325` |
| fresh Web focused off PNG | `b4aaf36042bd38caea9afadbc6b00cf2516d5e0580015123677615761efd68b4` |
| fresh Web focused off frame | `626ef631d99eaf25c7caddb0c6435f1a59124b21a2851cf67f742417733ece5d` |
| fresh Web Area PNG | `3c10ca84171fe79544a861688471c28cd5545bbf16b7cc9404db3d5779391f46` |
| fresh Web Area frame | `6635754c40bb45c25ed1d6b4e2b2c8aabfa2701a2945f9f46e76521b0455a39c` |
| old comparison sheet, visual inspection failed | `92d021aa14d6d68d9e98c6bfa0a51472c19dec60374615d1c92e00bed85ae5fb` |
| clean readable Web Area v3 PNG | `c841887766a80ed764b1278b979e5da8819db90c086114511a9afa76216bf9ad` |
| clean readable Web Area v3 frame | `b5b83e5d8bb6fe095d9df795a9206afaab7a2c7882549721b16083407a469a2f` |
| readable comparison v3 | `5906aef3794dfcd9f2aa0ba79210733e26c1f47febe07823722b07730ba12c37` |

## Closure boundary

Current source-light insertion and preview-layer visibility are verified by the
clean v3 frame. Actual illumination of the Area receiver is not verified because
the receiver is unlit and the visible circle is a procedural halo. Retail
equivalence is explicitly not closed: the readable comparison shows a
missing/weak Web flame presentation and different color/falloff.
Promoting NWN parity requires a fresh versioned Toolset/NWN profile for the same
immutable module/Area/candidate, a user-owned Test Module launch, and a
same-camera or explicitly calibrated ROI capture that passes the retail
tolerance gate.
