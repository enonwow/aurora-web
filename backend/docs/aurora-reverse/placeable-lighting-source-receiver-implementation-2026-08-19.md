# Placeable lighting source-receiver implementation (2026-08-19)

## Matched-comparison correction

The source-receiver OFF/ON ablation is not an NWN-versus-Aurora-Web matched
comparison. The diagnostic sheet added later also does not close that gate: it
places a historical NWN combined-effect frame beside an isolated Web
point-light-only frame from a different Area, receiver and camera. Calling the
lighting implementation or its retail comparison complete on that basis was
incorrect.

Current proof classification after the corrective review:

- Aurora Web receiver response: `proofCompleteness=verified` for the isolated
  local OFF/ON functional ablation only;
- fresh matched NWN runtime observation: `proofCompleteness=missing`;
- matched NWN-versus-Web visual comparison: `proofCompleteness=missing`;
- retail visual parity: `proofCompleteness=failed` for the gross historical
  diagnostic mismatch and otherwise unproven for a controlled fixture.

The live lane cannot currently start safely. Read-only inspection found one
responsive Toolset process, PID `144640`, started at `2026-08-19 10:15:50`.
Its hidden clean `TfrmFrame` owns `codex_vfx_row28.mod`; the visible
`TApplication` is iconic, there is no canonical session ledger for that PID,
and the requested `als_oracle.mod` is not loaded. The single-session rule
forbids a second Toolset, and the existing unrelated session cannot be closed
without explicit user authorization. No Toolset or NWN input was sent during
this review.

There is also no versioned central proof profile for
`als_oracle.mod` / `als_light_lab` / `plc_campfr` in
`backend/docs/aurora-reverse/proof-profiles`. Before a fresh live run, the
profile must bind the installed module SHA-256
`29e158317794d6519e2a807cec5ce4bfd4b025be33886694b1340515d9c94604`,
zero ordered HAKs, Area `als_light_lab`, scripted candidate
`ALS_CAMPFIRE` / `plc_campfr` at `[65,65,0]`, the capture target and owned
artifact directory. Until the unrelated Toolset session is closed under
explicit authority and that profile validates, the matched comparison remains
`missing`, not complete.

## Decision

The M1 source-receiver implementation slice is implemented and verified: a
source-backed placeable point light now produces a measured pixel delta on the actual Area terrain receiver in
Aurora Web. The proof is an isolated `pointLight=false/true` ablation with the
same Area, cache identity, injected placeable transform, camera and viewport;
halo, VFX, shadow and postprocess are disabled.

This does not close M2. NWN retail pixel parity remains blocked because the
active retail gamma/profile selection and a fresh matched NWN camera/receiver
oracle are not yet proven.

## Implemented runtime path

1. When `Use Area Lighting` is enabled, loaded tile materials retain their lit
   Three material family and receive the shared source-MDL ambient/diffuse
   adapter. Known unlit/unknown receiver materials fail closed in proof.
2. When `Use Area Lighting` is disabled, the explicit unlit Toolset-style
   terrain presentation remains available.
3. The Web-only procedural halo is independently switchable and is excluded
   from receiver-lighting proof.
4. Placeable point lights use the recovered source radius, offset and runtime
   RGB. For the source-backed gamma-zero surface preview branch, attenuation is
   `1 / (1 + 4.5 * (distance / radius)^2)`.
5. The previous CPU aggregate formula `max(0, 1-distance/radius)` is no longer
   presented as the surface pixel-lighting equation. The retail gamma-one
   branch still depends on unrecovered runtime constants and remains blocked.
6. Source-MDL light facts are preserved in the canonical package together with
   the bounded additive `sourceMdlLightFeatureManifest/v1`; the frontend uses a
   conservative fallback when an older payload has no manifest.
7. Proof observability records light and receiver world bounds, layer overlap,
   minimum distance and vertical relationship. An underground light can no
   longer be silently accepted as a visual proof candidate.

Primary code:

- `frontend/src/modules/layout/adapters/three/auroraTerrainReceiverMaterial.ts`
- `frontend/src/modules/layout/adapters/three/auroraThreeLightFalloff.ts`
- `frontend/src/modules/layout/adapters/three/auroraPlaceableLightingProofAdapter.ts`
- `frontend/src/modules/layout/application/auroraPlaceableLightingProof.ts`
- `frontend/src/modules/layout/adapters/three/workspaceTerrainMesh.ts`
- `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts`
- `backend/src/modules/catalog/application/catalog-source-mdl-light-feature-manifest.ts`
- `backend/src/modules/catalog/application/catalog-vfx-runtime-packaging.ts`
- `backend/scripts/create-area-lighting-pixel-diff-artifacts.mjs`

## Accepted Aurora Web functional proof

Fixture:

- Area: `area__winds_study`
- placeable: `plc_campfr` / `PLC_I06` / `plc_plc_i06`
- explicit proof placement: `[1, 1, 0.5]`, selected from the measured terrain
  receiver surface at `Y=0.5`
- point light world position: `[0.975929, 0.519465, 1.0011]`
- point light: `PaleYellow`, runtime RGB `[1.9, 1.9, 1.0]`, distance `1`,
  intensity adapter `1.9`, decay marker `1`
- receiver materials: four `MeshStandardMaterial`, four reactive, zero unlit,
  zero unknown
- spatial relationship: light above receiver, minimum distance `0.019465`
- isolated lanes: receiver `area`; halo/VFX/shadow/postprocess all false

The validator result is
`functional-ablation-delta-observed-retail-parity-unpromoted`:

- both captures accepted;
- assets settled;
- same camera: true;
- same viewport: true;
- same scene/runtime identity: true;
- point-light count: `0 -> 1`;
- mean absolute RGB delta: `0.7693087705767511`;
- mean absolute luma delta: `0.8915325235346837`;
- maximum RGB delta: `56.333333333333336`;
- changed sample ratio above 5: `0.012376543209876543`;
- changed bounds above 5: `x=391, y=232, width=163, height=102`.

Artifacts:

- `artifacts/placeable-lighting-source-receiver-proof-2026-08-19/campfire-close-gamma0-pointlight-off.png`
- `artifacts/placeable-lighting-source-receiver-proof-2026-08-19/campfire-close-gamma0-pointlight-on.png`
- `artifacts/placeable-lighting-source-receiver-proof-2026-08-19/campfire-close-gamma0-pointlight-off-on-diff.png`
- `artifacts/placeable-lighting-source-receiver-proof-2026-08-19/campfire-close-gamma0-pointlight-off-on-comparison.png`
- `artifacts/placeable-lighting-source-receiver-proof-2026-08-19/campfire-close-gamma0-pointlight-off-on-crop-comparison.png`
- `artifacts/placeable-lighting-source-receiver-proof-2026-08-19/campfire-close-gamma0-pointlight-off-on-report.json`
- matching `.frame.json` manifests beside the OFF and ON captures.

The crop comparison is a derived presentation artifact ordered `OFF | ON`.
The diff and JSON report remain the machine-verifiable evidence.

## Current NWN vs Aurora Web diagnostic comparison

The readable comparison below places the historical NWN retail observation on
the left and the current accepted Aurora Web source-receiver capture on the
right:

![Historical NWN retail versus current Aurora Web source-receiver lighting](artifacts/placeable-lighting-source-receiver-proof-2026-08-19/nwn-historical-vs-aurora-web-current-diagnostic-comparison.png)

This sheet deliberately does not claim a matched retail oracle. The NWN panel
contains the combined retail result (receiver light, animated flame, bloom and
shadow handling) on a wooden receiver. The Web panel is the accepted
point-light-only ablation state on the current Area receiver, with VFX, halo,
shadow and postprocess disabled. The Areas, receiver textures and cameras are
not calibrated. The comparison therefore proves a gross visual mismatch and
makes the remaining work visible; it is not a pixel-parity measurement.

Sources and immutable hashes:

- NWN ROI:
  `artifacts/placeable-lighting-nwn-web-comparison-2026-08-18/nwn-plc-campfr-light-roi-500x400.png`,
  SHA-256
  `29166e0fc3cbe5207b693a9af833650461cd334113ae54e5010f22277da36696`;
- Aurora Web ON:
  `artifacts/placeable-lighting-source-receiver-proof-2026-08-19/campfire-close-gamma0-pointlight-on.png`,
  SHA-256
  `b01306b2652f11bfc83147cd77211596171aebdd3200548f4251b2d5cf39a771`;
- derived comparison:
  `artifacts/placeable-lighting-source-receiver-proof-2026-08-19/nwn-historical-vs-aurora-web-current-diagnostic-comparison.png`,
  SHA-256
  `5405dd5252e86dccef4076f9e93d278ea5ff272a70f8c413bfaccfc40d7b6552`.

Direct visual verdict: the current Web receiver reacts to the placeable point
light, but Web does not yet reproduce NWN's warm color, perceived energy,
footprint, bright flame core, bloom or combined shadow presentation. Retail
parity remains failed/unproven.

Capture safety checks passed on both sides: `accepted=true`, runtime identity
`ready`, route/canvas ready, zero blocked tile-process entries, zero blocked
terrain models, four loaded and four visible terrain meshes, and settled
assets. The OFF snapshot is intentionally `blocked` only by
`APL-PROOF-POINT-LIGHT-DISABLED`; the pair validator recognizes that state as
the required negative control.

## Verification

- frontend focused lighting/runtime tests: 11 files, 428 tests passed;
- backend packaging/capture/diff tests: 4 suites, 11 tests passed;
- frontend production build: passed (314 modules transformed; chunk-size
  warning only);
- backend production build: passed.

## Completion status

The receiver-level functional acceptance criteria are satisfied for this Web
Area fixture:
the actual terrain is light-reactive, debug presentation lanes are isolated,
the source is above the receiver, and an accepted same-state OFF/ON pair has a
non-zero bounded receiver pixel delta.

Formal M1 closure still requires the plan's flat calibration fixture, locked
outside-radius control, 100-cycle lifecycle check and full regression/mutation/
performance gates. M2 is also not complete. It requires a fresh immutable NWN observation using the
same module/Area/placeable transform, receiver, camera, viewport, graphics and
gamma profile, followed by a registered tolerance/ROI comparison. Flame/smoke,
bloom and shadow parity also remain separate gates and must not be inferred
from this point-light-only result.

## Visual-proof correction: white placeable regression

The OFF/ON pair above must not be treated as an accepted visual placeable proof.
Post-capture inspection found that both frames show a white, effectively
untextured placeable. This defect exists in the OFF frame as well as the ON
frame, so it is not point-light overexposure.

The frame manifests expose the acceptance-gate failure directly:

- `devPlaceableModelTextureSettled=false`;
- `devPlaceableTextureProofMode=allow-light-ready-before-texture-settled`;
- the capture route omitted `captureTimeSeconds`, so it did not force a
  deterministic render after placeable texture settlement;
- `lightingVfx=false`, `lightingHalo=false`, `lightingShadow=false` and
  `lightingPostprocess=false`, intentionally removing most of the visible
  campfire presentation.

The captured asset ledger nevertheless reported the catalog model and the
`plc_i07` base texture as bound. An earlier Aurora Web capture using the same
catalog-cache identity visibly rendered the rock/log textures. The available
evidence therefore indicates a proof-readiness/render-timing defect, not a
missing source texture asset and not a terrain receiver material overwriting
the placeable material.

The CDP capture gate conflated general asset-ledger settlement with actual
placeable material/texture settlement. It allowed `accepted=true` when the
placeable still had `devPlaceableModelTextureSettled=false`. The OFF/ON pixel
delta remains useful as a narrow machine diagnostic for point-light receiver
response, but it does not prove a visually correct placeable. Its measured
effect is also weak: only about `1.24%` of samples changed by more than five
RGB levels and mean absolute RGB delta is below one.

Corrected status:

- point-light receiver response: partial, machine-measurable diagnostic;
- placeable texture presentation: failed in this capture;
- placeable lighting presentation: failed visual acceptance;
- NWN visual parity: failed/unproven;
- completion claim based on this pair: retracted.

No future area-lighting proof may be accepted unless the actual placeable
texture/material settlement gate is true and a post-settlement render has been
captured. The isolated point-light ablation and the full visual-composition
proof must be reported as separate artifacts.

## Textured placeable regression closure (supersedes the white-frame result)

The white/untextured placeable defect above is now fixed and the old white
OFF/ON pair remains retracted. The root cause was not only capture timing:

1. the Area proof object did not bind the exact `appearanceType=58` campfire
   row, so it could request the wrong placeable identity;
2. the backend decorators that attach `auroraModelGraph` and source-MDL light
   facts were limited to `vfx` / `light_source` classifications. `plc_campfr`
   is a normal `generic` placeable, so its derived GLB could be delivered while
   the source graph needed for canonical static/emitter composition was absent;
3. the previously cached package retained that incomplete shape;
4. fast-shadow texture diagnostics wrote into the same dataset fields as the
   actual placeable model, making texture readiness ambiguous.

The implementation now:

- binds `appearanceType=58` in the Area proof fixture;
- attaches model-graph and source-light facts to every source-backed placeable,
  independent of its UI classification;
- versions placeable processing as `placeable-process/v8`, invalidating the
  incomplete cached package;
- records fast-shadow texture status separately from model texture status;
- makes the CDP Area capture fail closed until the real placeable model reports
  settled textures.

The fresh package has cache key
`f1e44e65953204089dbd9d3e05316b0a687bcab97fb6e9dab316d4427fbd0e57`,
one delivered GLB, `36` static-geometry graph nodes, `87` graph nodes in total
and five emitter nodes. The full-composition frame reports:

- `accepted=true`, runtime identity `ready`;
- host graph `pass`, asset settlement `settled`, draw ledger `pass`;
- four expected static nodes attached: `Cylinder80`, `damage18`, `Mesh106`,
  `Mesh178`;
- five expected emitter nodes attached: `ChunkyWood88`, `ChunkyWood89`,
  `fire!52`, `fire!55`, `OmenEmitter250`;
- placeable model `loaded`, texture status `applied`, six textures loaded;
- one point light, four reactive Area receiver materials and zero unlit
  receiver materials;
- 32 visible draw particles with bound `fxpa_flame00` and `fxpa_smoke01`.

Fresh accepted full-composition artifacts:

- `artifacts/placeable-lighting-source-receiver-proof-2026-08-19/campfire-close-textured-full-composition-t1-5-v7.png`,
  SHA-256 `f373f92425ca3c0630b2a26973c206794ca608e5859f293c0aef52e0c2429b1d`;
- matching `.frame.json`, SHA-256
  `287317515abd661dd96609c2f2040107c757301ba4cd610b6b0f0fe870c2d6b9`.

The fresh isolated point-light pair also passes with the textured model and a
ready build identity. The negative control has `pointLightCount=0`, the
positive control has `pointLightCount=1`, and both have the same camera,
viewport and scene identity. Its measured response is:

- mean absolute RGB delta `3.575559156378266`;
- mean absolute luma delta `4.140177781014975`;
- maximum RGB delta `27.666666666666668`;
- changed-sample ratio above five RGB levels `0.21812268518518518`.

Machine report:
`artifacts/placeable-lighting-source-receiver-proof-2026-08-19/campfire-close-textured-pointlight-off-on-ready-v8.diff.json`.
Its status is
`functional-ablation-delta-observed-retail-parity-unpromoted`.

## Current readable NWN comparison after the texture fix

![Historical NWN versus current textured Aurora Web campfire](artifacts/placeable-lighting-source-receiver-proof-2026-08-19/nwn-historical-vs-aurora-web-textured-diagnostic-2026-08-19.png)

The comparison is deliberately labelled diagnostic. The NWN frame is
historical and uses a different Area, receiver and camera, so it cannot be an
accepted matched oracle. It is still sufficient to reject a false completion
claim: Web now has the correct textured placeable and a functioning local
point light, but the visible result still lacks NWN's bright flame core and
broad warm bloom/glow. The Web full-composition draw ledger proves that flame
and smoke particles were submitted; it does not prove their framebuffer
energy, placement or bloom parity.

Therefore the corrected final status is:

- white/untextured placeable regression: **fixed**;
- source-backed local point-light response on the Area receiver: **verified**;
- full Web campfire composition: **rendering but visually divergent**;
- NWN matched comparison and visual parity: **not complete**.
