# Placeable lighting visual-parity implementation plan v2 (2026-08-18)

Status: in progress. The M0 harness and M1 source-receiver implementation
slices are present. On 2026-08-19 an accepted same-camera OFF/ON Web ablation
proved a bounded delta on four reactive Area terrain materials with halo, VFX,
shadow and postprocess disabled. See
`placeable-lighting-source-receiver-implementation-2026-08-19.md`.

Formal M1 closure still requires the flat calibration fixture,
outside-radius control, lifecycle stress check and remaining full gates in
section 8.2. Combined VFX/postprocess, shadow and M2 retail parity remain
Aurora-first gated.

Implementation record:
`placeable-lighting-proof-harness-implementation-2026-08-18.md`.

This plan is the visual-rendering correction to
`placeable-lighting-implementation-plan-v1-2026-08-17.md`. The v1 storage,
runtime NWScript, source-MDL preservation, and active-light scheduling gates
remain valid. This v2 plan supersedes the v1 rendering/proof assumption that a
visible Web halo or an attached `THREE.PointLight` proves Area receiver
illumination.

Primary causal audit:
`placeable-lighting-visual-divergence-audit-2026-08-18.md`.

## 1. Outcome and non-negotiable boundary

Deliver placeable lighting in an Area that:

1. illuminates the actual Area receiver rather than a debug surface or
   camera-facing halo;
2. keeps 2DA light, source-MDL light, fire/smoke VFX, bloom, and shadow lanes
   independently observable and testable;
3. implements only recovered Aurora semantics;
4. uses one shared lighting/material path for tiles and Area objects where
   the recovered renderer behavior is common;
5. passes fixed-state Web ablations before any NWN parity claim;
6. passes a fresh, immutable, same-scene NWN-to-Web proof before completion.

The feature is not complete because a light node exists, `pointLightCount=1`,
assets settle, or a bright circle is visible. Only an accepted receiver-level
and retail comparison closes the work.

## 2. Milestones

### M0 — honest proof harness

The renderer exposes point-light, halo, VFX, shadow, receiver, and
postprocess lanes independently. Proof fails when an unlit receiver or debug
halo is presented as Area illumination.

M0 is engineering infrastructure only. It does not make the visual result
correct.

### M1 — working source-backed Web Area lighting

The actual Area surface uses the recovered light-reactive material path. A
fixed-camera `LightState=OFF/ON` Web ablation proves a bounded illumination
delta on that surface with halo, VFX, shadow, and postprocess disabled.

M1 may be reported as `source-backed Web Area lighting verified`. It must
retain `retailParityStatus=blocked`.

### M2 — NWN visual parity

Receiver response, source-light energy, flame/smoke, framebuffer ordering,
bloom/color correction, and in-scope shadows pass fresh matched retail
oracles. Only M2 may be reported as `placeable lighting complete`.

## 3. Scope

### Included

- actual Area tile/model receiver response to placeable local lights;
- 2DA `LightColor`, offset, radius, and recovered gamma-zero quadratic surface
  falloff; the gamma-one branch remains blocked;
- source-MDL local-light materialization through the existing feature manifest;
- a 2DA-only static lighting fixture;
- a source-MDL-only fixture;
- the `plc_campfr` / `PLC_I06` hybrid light + flame/smoke fixture;
- raw-gamma VFX composition and bloom/postprocess required by those fixtures;
- `ShadowSize` selection and the proven shadow presentation lane;
- dev-only ablation controls, capture manifest, validators, and saved proof;
- incremental updates, teardown, determinism, and performance.

### Excluded from this v2 visual slice

- GIT `LightState` authoring and save/readback (`PL-R01`, retained in v1);
- NWScript Set/Get/Recompute implementation (`PL-R02`, retained in v1);
- arbitrary 2DA, MDL, texture, or HAK authoring;
- global shader changes not required by a confirmed placeable-light fixture;
- using Three.js defaults or xoreos behavior as Aurora authority.

The existing loaded/runtime `LightState` may be used to create OFF/ON proof
states. This does not authorize native persistence or NWScript behavior.

## 4. Aurora knowledge gates

Existing gates `PL-R03..PL-R06` from v1 remain active. This plan adds three
visual-renderer research gates:

| ID | Unknown | Required authority | Blocks |
| --- | --- | --- | --- |
| `PL-R07` | Exact receiver material behavior for the selected EE renderer profile: local-light participation, texture/vertex-color/lightmap interaction, normals, clamps, and output color space | retail shader/material resources plus renderer call-path evidence and a static flat/wood receiver oracle | Phase 3 |
| `PL-R08` | Exact runtime RGB-to-framebuffer transfer for a placeable 2DA light, including multiplier/fade, linear/gamma boundaries, radius units, and any clamp before material evaluation | retail light upload/material-uniform path plus isolated OFF/ON color/radius fixtures | Phase 4 |
| `PL-R09` | Exact `PLC_I06` flame/smoke presentation at the framebuffer: emitter timing, atlas frames, transforms, color/alpha, blend bucket, raw-gamma ordering, and bloom input | source model/texture facts plus a versioned multi-frame retail capture and renderer evidence | Phases 5-6 |

Rules:

- `PL-R03` must be confirmed before the Toolset `Use Area Lighting` control is
  allowed to select production receiver behavior.
- `PL-R07` must be confirmed before replacing the unlit runtime receiver with
  a specific lit material/shader. `MeshLambertMaterial` or
  `MeshStandardMaterial` must not be selected by visual guesswork.
- `PL-R08` must be confirmed before replacing the current max-RGB preview
  intensity adapter with a parity implementation.
- `PL-R09` must be confirmed before flame or bloom constants are tuned.
- `PL-R04`/`PL-R05` must be confirmed before shadow parity is promoted.
- `PL-R06` is not needed for a deliberately isolated one-light M1 fixture, but
  is required for multi-owner M2 scenes.

Every gate ends as `confirmed` with exact English evidence anchors or
`blocked` with a resume condition. A missing gate cannot become a guessed
constant.

## 5. Contract and architecture

### 5.1 FE-BE contract decision

The backend already delivers source 2DA and source-MDL light facts. No
breaking FE-BE change is planned.

Before Phase 3:

1. verify that the existing payload contains every source value required by
   `PL-R07`/`PL-R08`;
2. keep `sourceMdlLights` and
   `sourceMdlLightFeatureManifest/v1` additive and backward compatible;
3. add a backend field only if recovered evidence identifies a missing source
   fact; any addition must be optional in v1, bounded, versioned, provenance
   carrying, and covered by old-client compatibility tests;
4. never send textures, model bytes, screenshots, or framebuffer data in the
   JSON light contract.

If no source fact is missing, Phases 1-8 are frontend/runtime and proof work;
the backend contract remains unchanged.

### 5.2 Frontend internal contracts

Create pure, bounded contracts rather than extending the existing oversized
renderer files:

```text
PlaceableLightingSourceFacts
        |
        v
PlaceableLightingRenderDecision
  - receiverProfile
  - pointLightProfile
  - haloPolicy
  - vfxPolicy
  - shadowPolicy
  - postprocessPolicy
  - support/parity/blockers
        |
        v
shared material/light materializer
        |
        +--> tile/Area receiver adapter
        +--> ordinary placeable host
        +--> canonical VFX host
        |
        v
PlaceableLightingProofSnapshot/v2
```

Recommended bounded production modules:

- `auroraAreaSurfaceLightingPolicy.ts` — pure receiver-profile decision;
- `auroraPlaceableLightingPolicy.ts` — pure source/support/parity decision;
- `auroraPlaceableLightingMaterializer.ts` — light/halo/shadow construction;
- `auroraPlaceableLightingObservability.ts` — bounded snapshot and blockers;
- `auroraPlaceableLightingProofProfile.ts` — dev-only ablation profile.

Existing modules become adapters/facades:

- `workspaceTerrainMesh.ts` binds the admitted receiver profile;
- `workspacePlaceableModelPresentation.ts` delegates light construction;
- `workspaceObjectMeshLayer.ts` attaches lifecycle/transform only;
- `auroraVfxCanonicalRenderer.ts` supplies emitter/light owners;
- `auroraRetailBloomPass.ts` consumes admitted framebuffer lanes.

The shared core must be reusable by tiles, ordinary placeables, and hybrid
canonical hosts. No second light-energy or material-response policy may remain
in an object-specific adapter.

### 5.3 Proof snapshot v2

The dev-only capture manifest must record, per exact Area/object:

- source identity and hashes;
- receiver object/mesh/material count and material family;
- `reactsToLocalPointLight` and the evidence/proof status for that decision;
- actual point-light color, intensity, radius/distance, decay/falloff, world
  transform, accepted budget rank, and owner;
- halo enabled/disabled and whether it is retail or debug-only;
- VFX visible batches, texture/atlas frame, blend factors, color/alpha, and
  raw-gamma lane;
- shadow implementation and parity status;
- postprocess profile and active stage order;
- fixed camera, viewport, capture time, seed, profile version, and runtime
  identity;
- explicit blocker codes.

The proof gate must reject an illumination claim when:

- every receiver material is unlit;
- a debug receiver or procedural halo is enabled in a point-light-only proof;
- camera/time/seed differ between OFF and ON;
- any required asset or material is pending/fallback;
- a parity-blocked lane is counted as verified.

## 6. Ordered implementation phases

### Phase 0 — freeze branch, baselines, fixtures, and research ledgers

Actions:

- implement on a dedicated `codex/` branch from `dev`, isolated from the
  current dirty renderer work;
- freeze two immutable fixtures:
  - one 2DA-only local light on a static flat and textured receiver;
  - `plc_campfr` / `PLC_I06` as the hybrid light + fire fixture;
- add a source-MDL-only fixture if it is not represented by those two;
- freeze module, Area, object transform, ordered HAK/resource hashes, camera,
  viewport, renderer profile, capture timeline, and artifact paths;
- capture baseline Web performance and resource counts;
- create `PL-R07..PL-R09` ledgers and update `PL-R03..PL-R06` status;
- do not tune production rendering in this phase.

Exit gate:

- fixtures validate offline and have exact immutable identities;
- every required research item is `confirmed` or explicitly `blocked`;
- the current false-positive halo/receiver condition is preserved as a
  regression fixture;
- baseline unit/regression/mutation/build/performance results are saved.

### Phase 1 — write red tests and proof-failure rules

Test-first actions:

- add a unit test proving that the current Area `MeshBasicMaterial` receiver is
  classified as not reacting to a local point light;
- add a test that a procedural halo with `depthTest=false` is debug/presentation
  only and cannot satisfy receiver illumination;
- add OFF/ON proof-validator tests for camera, time, seed, assets, material,
  halo, VFX, shadow, and postprocess isolation;
- add source-contract compatibility tests for old payloads and complete feature
  manifests;
- add red integration tests for actual receiver profile selection and exact
  source-light materialization;
- add red visual-regression scenarios for all ablation modes.

Initial test targets:

- `frontend/tests/unit/modules/layout/workspaceTerrainMesh.materialLighting.test.ts`
- `frontend/tests/unit/modules/layout/auroraPlaceableLightingPolicy.test.ts`
- `frontend/tests/unit/modules/layout/auroraPlaceableLightingProof.test.ts`
- `frontend/tests/integration/placeableLightingArea.integration.test.ts`
- `frontend/tests/visual-regression/placeable-lighting/`
- extend `App.areaLightShadowPreviewRunner.test.tsx` only for route/profile
  wiring, not renderer semantics.

Exit gate:

- tests fail only for intentionally missing policy/material/proof behavior;
- the old clean-v3 capture is rejected as receiver-lighting proof;
- no production visual output has changed.

### Phase 2 — diagnostics and semantic-preserving extraction

Actions:

- implement `PlaceableLightingProofSnapshot/v2` and bounded dev-only ablation
  controls: `receiver`, `pointLight`, `halo`, `vfx`, `shadow`, `postprocess`;
- extract pure receiver/light policy and materializer interfaces;
- route existing behavior through the new facades without changing pixels;
- keep the current unlit terrain and procedural halo explicitly labelled as
  preview behavior;
- add teardown/resource-count diagnostics;
- ensure production builds do not expose the proof controls.

Exit gate:

- golden/browser screenshots remain pixel-identical to the pre-extraction
  baseline;
- the manifest correctly says `receiverReactiveness=false` for the current
  unlit Area path;
- each lane can be isolated without reloading the Area;
- repeated attach/detach returns light, material, texture, callback, and scene
  counts to baseline;
- focused unit/integration/regression gates pass; mutation testing remains
  optional and requires an explicit user request.

Phases 0-2 are implementable from current evidence.

### Phase 3 — implement the recovered light-reactive Area receiver

Prerequisites: `PL-R07=confirmed`; `PL-R03=confirmed` before binding the
Toolset toggle to this behavior.

Actions:

- implement the recovered receiver shader/material in the shared surface
  lighting module;
- preserve source textures, vertex colors, alpha/depth policy, normals,
  lightmaps, and any recovered material flags;
- stop coercing runtime-lit Area tile models to unlit `MeshBasicMaterial`;
- retain an explicit Toolset/unlit profile only where the confirmed profile
  requires it;
- apply the same recovered common material rule through shared adapters;
- keep overlays/decals that are proven unlit on their separate path.

Exit gate:

- receiver snapshot reports the exact admitted material family and
  `reactsToLocalPointLight=true`;
- a flat calibration receiver and a real textured Area receiver both show an
  OFF/ON local-light delta with halo, VFX, shadow, and postprocess disabled;
- outside the recovered light radius, the no-postprocess OFF/ON control remains
  unchanged within the locked capture-noise tolerance;
- textures, alpha, ceilings, overlays, and tile seams pass regression review;
- no unproven generic Three.js material is promoted as retail parity.

### Phase 4 — implement exact source-light energy and falloff

Prerequisite: `PL-R08=confirmed`.

Actions:

- replace the max-RGB preview adapter in the parity path with the recovered
  RGB/multiplier/color-space transform;
- apply exact radius-unit conversion, offset transform, fade, clamps, and the
  selected recovered shader-profile falloff at the proven pipeline stage;
- keep Toolset display RGB out of runtime illumination;
- keep the old heuristic available only in an explicitly non-retail preview
  profile until all callers migrate;
- cover 2DA-only and source-MDL-only owners through the shared materializer.

Exit gate:

- point-light-only flat-receiver radial samples match the frozen retail oracle;
- color/hue, center energy, footprint radius, and falloff profile pass the
  locked validator;
- all actual materializer values and source provenance appear in snapshot v2;
- single-light lifecycle and configured budget behavior are deterministic;
- no halo is present in the accepted point-light-only artifact.

At this point M1 may close if the M1 criteria in section 8 pass.

### Phase 5 — close campfire flame/smoke presentation

Prerequisite: `PL-R09=confirmed` for promoted behavior.

Actions:

- validate/fix emitter birth/life schedule, transforms, size, atlas frame,
  texture orientation, color, alpha, blend factors, render bucket, and depth
  behavior for `PLC_I06`;
- validate a fixed timeline, not one favorable frame;
- keep point light and postprocess disabled while accepting the raw VFX lane;
- do not compensate for a weak flame by increasing global bloom.

Exit gate:

- the raw VFX-only timeline passes texture/atlas, geometry, color/alpha,
  bounds, and temporal validators;
- flame and smoke are both visually readable and correctly ordered;
- no debug core, substitute sprite, or locally invented opacity is present;
- ordinary/canonical host composition retains every static/emitter/light
  sibling exactly once.

### Phase 6 — close framebuffer ordering and postprocess

Prerequisite: raw light and VFX inputs from Phases 4-5 accepted; `PL-R09`
framebuffer/postprocess observations confirmed.

Actions:

- validate raw-gamma normal/additive composition order;
- validate bloom threshold, downscale/upscale chain, multiplier, SSAO ordering,
  dynamic contrast, vibrance, color correction, and final output color space;
- change only constants/stages supported by the frozen renderer profile;
- expose per-stage capture hashes and luminance summaries.

Exit gate:

- raw input captures remain accepted after enabling postprocess;
- bloom core/halo radius, warm color, clipping, surrounding contrast, and
  temporal stability pass the locked retail validator;
- a postprocess OFF/ON pair demonstrates the intended stage contribution;
- no postprocess value was tuned to hide a receiver or emitter failure.

### Phase 7 — close shadow presentation

Prerequisites: `PL-R04=confirmed`, `PL-R05=confirmed`.

Actions:

- keep `ShadowSize` asset selection separate from projection acceptance;
- replace Web-local `0.32`/`0.26` preview opacity calibration in the parity
  path with recovered shadow state;
- implement exact caster/receiver, stencil/depth operations, opacity,
  projection, and render ordering;
- keep unconfirmed shadow behavior blocked rather than substituting a Three.js
  default shadow map.

Exit gate:

- S/M/L source selection passes independently;
- fixed-camera shadow masks and opacity pass the frozen validator;
- shadow-only and combined-light captures contain no proxy/debug receiver;
- every shadow resource is released on object/Area teardown.

### Phase 8 — controlled NWN comparison, quality gates, and release

Actions:

- use the required Toolset/NWN operation and proof skills for the live retail
  portion;
- capture the exact same immutable module, Area, object, transform, camera,
  viewport, time/timeline, renderer profile, gamma/brightness, shader quality,
  and postprocess state;
- ingest exact retail artifacts into the guarded validator;
- run receiver-only, light-only, VFX-only, postprocess-only, shadow-only, and
  combined comparisons;
- run all focused/full automated gates and update the implementation matrix,
  contract notes, proof report, and artifact hashes.

Exit gate: the M2 Definition of Done in section 8 passes with no waiver.

## 7. Test and proof matrix

| Layer | Required coverage |
| --- | --- |
| Frontend unit | receiver-profile decision, material reactiveness, source-light policy, halo exclusion, transforms, color/falloff, cleanup, support/parity blockers |
| Frontend integration | source payload -> policy -> tile/object material -> light materializer -> scene lifecycle -> proof snapshot |
| Regression smoke | open Area, retain camera/context, toggle each ablation lane, object remove/re-add, Area close/reopen, no full-Area rebuild |
| Mutation | all changed receiver/light policy, proof validator, and scene lifecycle logic; no unreviewed survivor in changed modules |
| Visual regression | deterministic Web OFF/ON receiver, light-only, VFX-only, postprocess-only, shadow-only, and combined captures |
| Differential parity | frozen NWN/Web artifacts for 2DA-only, source-MDL-only, and hybrid campfire fixtures |
| Determinism | repeated fixed-profile captures produce the same manifest and stay inside the locked pixel-noise envelope |
| Performance | p95 frame time at light budgets, incremental toggle latency, 100-cycle attach/toggle/remove resource recovery |
| Compatibility | old payload without optional manifest, malformed/truncated manifest, supported fallback host, renderer-profile variants explicitly admitted by contract |

Minimum frontend gates:

```text
cd frontend
npm.cmd run test:unit
npm.cmd run test:regression
npm.cmd run build
```

If FE-BE source fields change, also require:

```text
cd backend
npm.cmd run test:unit
npm.cmd run test:e2e
npm.cmd run build
```

Mutation testing is not part of the M1/M2 completion gate. If explicitly
requested by the user, run only the targeted repository script with
`AURORA_MUTATION_TESTS=1`; the wrapper enforces concurrency `1`.

Browser automation is required for regression/debugging. Final renderer proof
must use the guarded exact-capture workflow and saved artifacts; an arbitrary
desktop screenshot or Playwright screenshot alone is not accepted proof.

## 8. Completion criteria

### 8.1 M0 complete — honest proof harness

All conditions must pass:

1. Six independent lane controls exist in development only: receiver,
   point-light, halo, VFX, shadow, and postprocess.
2. Snapshot v2 records actual receiver material reactiveness and every active
   lighting lane.
3. The validator rejects the old unlit-receiver + halo condition.
4. OFF/ON variants keep identical camera, time, seed, assets, and runtime
   identity.
5. Extraction is pixel-preserving and all focused tests pass.

M0 does not authorize a lighting-complete claim.

### 8.2 M1 complete — source-backed Web Area lighting verified

All conditions must pass:

1. The actual Area receiver, not a debug mesh, uses the admitted
   light-reactive material path.
2. A point-light-only capture has halo, VFX, shadow, and postprocess disabled.
3. `LightState=OFF/ON` changes receiver pixels inside the recovered radius on
   both flat and textured fixtures.
4. The flat calibration fixture follows the recovered color, radius, and
   falloff profile within the locked source-backed validator tolerance.
5. A control region outside the admitted radius remains within the locked
   deterministic/noise tolerance when postprocess is disabled.
6. Snapshot v2 reports exactly one accepted owner, exact source provenance,
   material family, world transform, RGB/energy, radius, and falloff.
7. Incremental OFF/ON does not reload/rebuild the Area.
8. A 100-cycle attach/toggle/remove test returns scene light/material/texture/
   callback counts to baseline.
9. Focused and full unit, integration, regression, mutation, determinism,
   performance, and build gates pass.

M1 status is `source-backed Web Area lighting verified;
retailParityStatus=blocked`.

### 8.3 M2 complete — placeable lighting complete

Every condition below is mandatory:

#### Evidence

- `PL-R03..PL-R09` required by the selected fixtures are confirmed; none is
  missing or blocked;
- retail tolerances are versioned and frozen from repeated oracle captures
  before Web tuning; they are not loosened after a failed result without a new
  documented validator version;
- each fixture has exact module/Area/object/resource hashes, camera, viewport,
  timeline, renderer profile, and fresh capture artifacts;
- proof completeness is `verified` for receiver-only, light-only, VFX-only,
  postprocess-only, shadow-only, and combined variants.

#### Rendering

- Area surfaces receive local placeable light through the recovered material
  path;
- runtime color/energy, radius, offset, falloff, color-space boundaries, and
  active-light ownership match the admitted retail behavior;
- procedural/debug halo and debug receiver are absent from parity captures;
- flame/smoke timing, atlas, transform, color/alpha, blend/order, and raw-gamma
  composition pass their multi-frame oracle;
- bloom/postprocess passes only after raw receiver and VFX inputs pass;
- in-scope shadow selection, projection, opacity, and state order pass;
- ordinary, source-MDL, and hybrid hosts contain no missing or duplicate
  siblings and use the same shared policy/materializer.

#### Quality

- every required focused and full command passes with no lighting waiver;
- changed policy modules have no unreviewed surviving mutants;
- deterministic repeated Web captures remain within the locked noise envelope;
- fixed-scene p95 frame time regresses by no more than 10% from the Phase-0
  baseline, unless a stricter existing SLO applies;
- active light count never exceeds the configured limit or retail hard cap;
- no full-Area rerender is caused by one placeable light change;
- 100-cycle lifecycle tests show no retained Three.js objects, GPU resources,
  callbacks, or proof state;
- production builds expose no dev-only proof route/control by default.

#### Visual acceptance

- the static 2DA-only receiver comparison passes radial luminance, color,
  footprint, and boundary validators;
- the source-MDL-only fixture passes its field/transform/material response
  validators;
- the campfire multi-frame comparison passes flame-core, smoke, warm receiver,
  bloom, shadow, and temporal validators;
- human visual inspection confirms that the exact target and effect are
  readable and contains no placeholder, selection overlay, debug receiver,
  procedural substitute, blank tile, failed tile, or stale artifact;
- `canonicalParityPromoted=true` is written only after every required result is
  verified.

If any M2 condition is false, the work remains partial and the handoff must
name the exact failed/missing gate and resume condition.

## 9. Delivery order and complexity budget

Implement in this strict order:

1. evidence/fixtures;
2. red tests;
3. diagnostics and extraction;
4. receiver material;
5. source-light energy/falloff;
6. raw flame/smoke;
7. postprocess;
8. shadows;
9. matched proof and release.

Complexity limits:

- no new renderer logic is added directly to the existing oversized modules
  when it can live in the bounded modules from section 5;
- no phase mixes receiver, flame, bloom, and shadow tuning in one change;
- each phase must be independently revertible and have its own accepted
  diagnostics/test result;
- no backend change is made unless a measured missing source fact crosses the
  FE-BE boundary;
- no new production dependency is planned;
- no full-Area rebuild is admitted for one light update.

Recommended merge slices:

1. M0 contracts/tests/diagnostics;
2. semantic-preserving extraction;
3. recovered receiver path and M1 receiver proof;
4. exact light energy/falloff and M1 closure;
5. raw campfire VFX;
6. framebuffer/postprocess;
7. shadow parity;
8. M2 proof/documentation.

No later slice may hide a failed earlier slice with additional bloom, halo,
opacity, or color correction.
