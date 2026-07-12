# Light/shadow decompilation remaining audit - 2026-07-07

Reference evidence: `C:\Projects\New Folder`.
Editable repo: `C:\Projects\aurora-web`.

Correction after review: the first version of this file mixed raw Aurora decompilation facts, retail/resource evidence, Aurora Web implementation state, gate output, and implementation inference in one voice. That was wrong. This version labels those source classes explicitly.

This audit is about Aurora Web light/shadow work against Aurora/NWN evidence. It separates:

1. raw Aurora decompilation/export facts;
2. retail resource/binary facts used next to the decompilation;
3. Aurora Web implementation state;
4. gate/compare output;
5. implementation inference that must not be treated as an Aurora rule until promoted by evidence.

## Source-class legend

- `[AURORA DECOMPILATION FACT]`: direct anchor in `C:\Projects\New Folder\export\decompiled_all.c` or its decompiler export indexes such as `strings.tsv`. These are the only statements in this file that should be read as "from decompiled Aurora".
- `[RETAIL RESOURCE/BINARY FACT]`: extracted NWN resources, scripts, 2DA/MDL facts, or binary/resource audits. These can support the implementation, but they are not the same thing as a recovered decompiled code path.
- `[AURORA WEB STATUS]`: what the current `C:\Projects\aurora-web` implementation/test/artifact layer does.
- `[GATE/COMPARE RESULT]`: output from local verification scripts or compare artifacts. This proves only the gate state, not retail parity unless the gate says so.
- `[IMPLEMENTATION INFERENCE]`: the next engineering move inferred from the evidence. This is not an Aurora fact.

Rule for this audit: no Aurora Web behavior should be promoted as "Aurora-first complete" unless it is backed by `[AURORA DECOMPILATION FACT]` or `[RETAIL RESOURCE/BINARY FACT]` and then accepted by the relevant `[GATE/COMPARE RESULT]`.

## Commands run

```powershell
python backend/scripts/audit-retail-light-function-disasm.py
node backend/scripts/audit-retail-item-light-tables.mjs
node backend/scripts/audit-lightstate-default-retail-binary.mjs
npx tsx backend/scripts/audit-retail-progfx-type4-table.ts
npx ts-node --transpile-only scripts/audit-retail-shadow-mdls.ts --stdout
node backend/scripts/create-lightmanager-lane-owner-artifacts.mjs
node backend/scripts/create-retail-progfx-type4-policy-artifacts.mjs
node backend/scripts/create-retail-shadowvol-projection-proof-artifact.mjs
node backend/scripts/create-retail-shadowsize-shadow-mdl-proof-artifact.mjs
node backend/scripts/create-area-lighting-local-oracle-inputs.mjs
node backend/scripts/create-area-lighting-pixel-diff-artifacts.mjs
node backend/scripts/create-area-lighting-blocked-compare-reports.mjs
node backend/scripts/create-cross-lane-active-slot-blocker-proof.mjs
node backend/scripts/create-progfx-type4-runtime-oracle-blocker-proof.mjs
node backend/scripts/create-area-lighting-runtime-oracle-pack-proof.mjs
node backend/scripts/capture-area-lighting-retail-max-light-variants.mjs --allowTopMostNoFocus --durationSeconds 24 --variants 1,2,3,4,5,6,8,32
node backend/scripts/capture-area-lighting-retail-max-light-variants.mjs --allowTopMostNoFocus --moduleName als_xnoitem --outputName retail-cross-lane-no-item-max-light-variant-observation.json --variantDirPrefix retail-noitem-maxlights --beforeArtifact retail-cross-lane-no-item-before-budget.png --afterArtifact retail-cross-lane-no-item-after-budget.png --activeSlotArtifact retail-cross-lane-no-item-active-slots.json --durationSeconds 24 --variants 1,2,3,4,5,6,8,32
node backend/scripts/create-cross-lane-retail-maxlight-roi-diagnostics.mjs --ablationObservation retail-cross-lane-no-item-max-light-variant-observation.json
node backend/scripts/capture-area-lighting-retail-max-light-variants.mjs --allowTopMostNoFocus --moduleName als_xnopfx --outputName retail-cross-lane-no-progfx-max-light-variant-observation.json --variantDirPrefix retail-noprogfx-maxlights --beforeArtifact retail-cross-lane-no-progfx-before-budget.png --afterArtifact retail-cross-lane-no-progfx-after-budget.png --activeSlotArtifact retail-cross-lane-no-progfx-active-slots.json --durationSeconds 24 --variants 1,2,3,4,5,6,8,32
node backend/scripts/create-cross-lane-retail-maxlight-roi-diagnostics.mjs --out cross-lane-retail-maxlight-roi-diagnostics-no-progfx.json --ablationObservation retail-cross-lane-no-progfx-max-light-variant-observation.json --ablationLabel no-progfx --ablationHeatmapPrefix retail-cross-lane-no-progfx-ablation
node backend/scripts/capture-area-lighting-retail-max-light-variants.mjs --allowTopMostNoFocus --moduleName als_xnoplc --outputName retail-cross-lane-no-placeable-max-light-variant-observation.json --variantDirPrefix retail-noplaceable-maxlights --beforeArtifact retail-cross-lane-no-placeable-before-budget.png --afterArtifact retail-cross-lane-no-placeable-after-budget.png --activeSlotArtifact retail-cross-lane-no-placeable-active-slots.json --durationSeconds 24 --variants 1,2,3,4,5,6,8,32
node backend/scripts/create-cross-lane-retail-maxlight-roi-diagnostics.mjs --out cross-lane-retail-maxlight-roi-diagnostics-no-placeable.json --ablationObservation retail-cross-lane-no-placeable-max-light-variant-observation.json --ablationLabel no-placeable --ablationHeatmapPrefix retail-cross-lane-no-placeable-ablation
node backend/scripts/capture-area-lighting-retail-max-light-variants.mjs --allowTopMostNoFocus --moduleName als_xnomdl --outputName retail-cross-lane-no-mdl-max-light-variant-observation.json --variantDirPrefix retail-nomdl-maxlights --beforeArtifact retail-cross-lane-no-mdl-before-budget.png --afterArtifact retail-cross-lane-no-mdl-after-budget.png --activeSlotArtifact retail-cross-lane-no-mdl-active-slots.json --durationSeconds 24 --variants 1,2,3,4,5,6,8,32
node backend/scripts/create-cross-lane-retail-maxlight-roi-diagnostics.mjs --out cross-lane-retail-maxlight-roi-diagnostics-no-mdl.json --ablationObservation retail-cross-lane-no-mdl-max-light-variant-observation.json --ablationLabel no-mdl --ablationHeatmapPrefix retail-cross-lane-no-mdl-ablation
node backend/scripts/capture-area-lighting-retail-max-light-variants.mjs --allowTopMostNoFocus --moduleName als_xnotmain --outputName retail-cross-lane-no-tile-main-max-light-variant-observation.json --variantDirPrefix retail-notilemain-maxlights --beforeArtifact retail-cross-lane-no-tile-main-before-budget.png --afterArtifact retail-cross-lane-no-tile-main-after-budget.png --activeSlotArtifact retail-cross-lane-no-tile-main-active-slots.json --durationSeconds 24 --variants 1,2,3,4,5,6,8,32
node backend/scripts/create-cross-lane-retail-maxlight-roi-diagnostics.mjs --out cross-lane-retail-maxlight-roi-diagnostics-no-tile-main.json --ablationObservation retail-cross-lane-no-tile-main-max-light-variant-observation.json --ablationLabel no-tile-main --ablationHeatmapPrefix retail-cross-lane-no-tile-main-ablation
node backend/scripts/capture-area-lighting-retail-max-light-variants.mjs --allowTopMostNoFocus --moduleName als_xnotsrc --outputName retail-cross-lane-no-tile-source-max-light-variant-observation.json --variantDirPrefix retail-notilesource-maxlights --beforeArtifact retail-cross-lane-no-tile-source-before-budget.png --afterArtifact retail-cross-lane-no-tile-source-after-budget.png --activeSlotArtifact retail-cross-lane-no-tile-source-active-slots.json --durationSeconds 24 --variants 1,2,3,4,5,6,8,32
node backend/scripts/create-cross-lane-retail-maxlight-roi-diagnostics.mjs --out cross-lane-retail-maxlight-roi-diagnostics-no-tile-source.json --ablationObservation retail-cross-lane-no-tile-source-max-light-variant-observation.json --ablationLabel no-tile-source --ablationHeatmapPrefix retail-cross-lane-no-tile-source-ablation
node backend/scripts/check-area-lighting-retail-oracle-artifacts.mjs --allow-blocked
```

Current gate:

- `status=blocked`
- `blockers=3`
- `oracleCases=8`
- `oracleCasesPassed=0`
- `oracleCasesBlocked=8`
- `requiredArtifacts=25`
- `presentRequiredArtifacts=25`
- `missingRequiredArtifacts=0`
- `failedRequiredJsonArtifacts=11`
- `currentEvidenceEntries=256`
- `currentEvidenceFilesPresent=243`
- `currentEvidenceFilesMissing=0`
- `currentEvidenceTokens=13`

`[GATE/COMPARE RESULT]` Interpretation: the retail/runtime proof packet is now present and readable. The gate is not blocked by missing required artifacts or stale current-evidence filenames. It is blocked only by JSON proof artifacts that explicitly refuse to promote parity: campfire shadow-volume pixel/ROI tolerance, direct cross-lane active-slot ordering, LightManager owner data-flow, and full ProgFX Type 4 scheduler semantics remain unresolved.

## [AURORA DECOMPILATION FACT] Raw decompilation/export anchors confirmed in this pass

High-signal local Aurora anchors:

- ARE lighting/shadow read path: `C:\Projects\New Folder\export\decompiled_all.c:255200-255224`
  - `MoonAmbientColor`, `MoonDiffuseColor`, `MoonShadows`, `SunAmbientColor`, `SunDiffuseColor`, `SunShadows`, `ShadowOpacity`, `DayNightCycle`, `LightingScheme`.
- ARE lighting/shadow write path: `C:\Projects\New Folder\export\decompiled_all.c:255888-255905`
  - writes the same moon/sun/shadow/lighting fields.
- Tile light read/write path:
  - read `Tile_MainLight1/2`, `Tile_SrcLight1/2`: `decompiled_all.c:255400-255410`;
  - write `Tile_MainLight1/2`, `Tile_SrcLight1/2`: `decompiled_all.c:255946-255949`.
- Tile source-light carrier creation:
  - `fx_flame01` / `sourcelight1`: `decompiled_all.c:453567-453568`;
  - `fx_flame01` / `sourcelight2`: `decompiled_all.c:453602-453603`.
- Placeable light vocabulary:
  - `placeablelight`: `C:\Projects\New Folder\export\strings.tsv:15789`.
- LightManager score/sort/budget:
  - score comparator `FUN_00a41694`: `decompiled_all.c:865731-865735`;
  - score calculation `FUN_00a41850`: `decompiled_all.c:865838-865929`;
  - hard active-light cap `FUN_00a41e30`: `decompiled_all.c:866086-866096`;
  - active-slot upload/prune loop `FUN_00a41e50`: `decompiled_all.c:866102-866424`;
  - candidate selection `FUN_00a42728`: `decompiled_all.c:866625+`.
- Active light upload:
  - `DAT_00cff7e0` active-light records and shader upload loops around `decompiled_all.c:898936-899114`, `901827-901830`.
- Shadow-volume path:
  - shader strings `vs_shadowvol` / `fs_shadowvol`: `decompiled_all.c:616207-616208`;
  - draw wrapper `FUN_00a78128 -> FUN_00a75e3c`: `decompiled_all.c:904108-904112`, `902867+`;
  - shadow-volume renderer `FUN_00a878f8`: `decompiled_all.c:913914-914017`.
- Visual effect table load:
  - `visualeffects.2da` load anchor: `decompiled_all.c:348244`.

## [RETAIL RESOURCE/BINARY FACT] Resource anchors used alongside decompilation

These are not "decompiled Aurora" claims. They are supporting retail/resource facts:

- Placeable light vocabulary:
  - `placeablelight`: `C:\Projects\New Folder\placeable.csv:56`.
- Placeable/static-light toggles:
  - `SetPlaceableIllumination`, `GetPlaceableIllumination`, and `RecomputeStaticLighting` note: `C:\Projects\New Folder\item-retail-extract\nss\nwscript.nss:8750-8765`.
- ProgFX / VFX constants:
  - `VFX_DUR_LIGHT_*`: `C:\Projects\New Folder\item-retail-extract\nss\nwscript.nss:914-946`;
  - `VFX_DUR_DARKVISION`: `nwscript.nss:948`;
  - item-property Darkvision: `nwscript.nss:9661-9662`, `itempropdef.2da:30`.

## [AURORA WEB STATUS] Current Aurora Web implementation mapping

These should not be counted as raw Aurora decompilation facts. They are current implementation surfaces mapped to the facts above, and they still need gate proof where noted.

These should not be counted as remaining implementation gaps unless a visual bug or gate contradiction invalidates them:

1. ARE root light/shadow fields are represented in the evidence model:
   - implementation surface: `backend/src/modules/areas/domain/area-lighting-evidence.ts`;
   - fields include sun/moon colors, `SunShadows`, `MoonShadows`, `ShadowOpacity`, `LightingScheme`, `DayNightCycle`.
2. Tile main/source lights are separated:
   - main lights are field/lightcolor driven;
   - source lights use a source-light carrier family, matching the `fx_flame01`/`sourcelight*` decomp anchors.
3. Placeables.2da lights are real lights, not just labels:
   - implementation surface: `frontend/src/modules/layout/adapters/three/workspacePlaceableModelPresentation.ts`;
   - `LightColor` becomes a real `THREE.PointLight`;
   - color is source-backed from `lightcolor.2da`;
   - `LightOffset` is applied;
   - `LightState` default-on proof is preserved as a retail-binary/resource fact, not as a raw decompiled-Aurora default-field fact;
   - `fx_placeable01/AuroraLight01` radius controller is represented as source radius `10`;
   - active-light falloff is linear: `max(0,1-distance/radius)`, using `PointLight.decay=1`.
4. Placeable `ShadowSize` is mapped:
   - `0 -> Fx_Shadow_S`;
   - `2 -> Fx_Shadow_L`;
   - any other present numeric value -> `Fx_Shadow_M`;
   - `Fx_Shadow_*` MDL emitter metadata and `fxpa_Dot01` texture proof are materialized.
5. Placeable fast-shadow/stencil preview exists:
   - source-backed caster buffer helper;
   - paired w=1/w=0 records;
   - front/back z-pass/z-fail stencil pass metadata;
   - receiver `NotEqual(0)`;
   - still explicitly blocks pixel parity.
6. Source MDL lights are represented:
   - `AuroraLight` source node radius/color/multiplier/linear falloff;
   - `PointLight.castShadow` for source-MDL shadow-capable lights;
   - LightManager preview score metadata.
7. Item-property lights are represented:
   - item property `Light` resolves through retail KEY/BIF item-light tables;
   - bridge to `VFX_DUR_LIGHT_*` and `fx_light_clr.mdl` is represented;
   - radius/color/falloff are present;
   - ProgFX Param3 shadow toggle is represented in the main renderer (`castShadow` follows Param3).
8. Single ProgFX Type 4 light requests are represented:
   - single request can create a source-backed local `THREE.PointLight`;
   - multi-request contracts are deliberately metadata-only until retail scheduler parity is isolated.
9. LightManager preview budget is represented:
   - recovered score formula, ascending sort, and `0x80`/`128` hard cap are present;
   - current preview mutates `THREE.PointLight.visible`;
   - this is not a recovered retail cross-lane owner precedence claim.

## [AURORA WEB STATUS + GATE/COMPARE RESULT] Work completed in this correction pass

1. Cross-lane retail max-light owner classifier evaluator is now implemented:
   - implementation surface: `backend/scripts/create-cross-lane-retail-maxlight-roi-diagnostics.mjs`;
   - it compares retail budget-sensitive PNG masks against isolated lane-reference masks built from `retail-cross-lane-openpad-smoke.png` and the six `retail-ref-*` lane captures;
   - it has explicit thresholds: `rgbDelta > 5`, `minScore=0.12`, `minMargin=0.03`;
   - it does not launch retail/NWN and does not use global cursor input.
2. Compare/gate scripts now consume the classifier result:
   - `backend/scripts/create-area-lighting-blocked-compare-reports.mjs`;
   - `backend/scripts/create-cross-lane-active-slot-blocker-proof.mjs`.
3. Targeted proof test was added:
   - `backend/test/unit/create-cross-lane-retail-maxlight-roi-diagnostics.spec.ts`;
   - synthetic baseline/reference test proves the classifier can identify a lane candidate without promoting canonical parity.
4. Real artifact result after running the generator:
   - `cross-lane-retail-maxlight-roi-diagnostics.json.status=retail-maxlight-roi-diagnostics-written-owner-classifier-evaluated-still-blocked`;
   - `ownerClassifierStatus=owner-classifier-evaluated-partial-owner-candidates-still-blocked`;
   - `ownerClassifierEvaluated=true`;
   - `ownerClassifierStrongCandidateCaseCount=4`;
   - `provesPartialOwnerCandidates=true`;
   - `provesAcceptedDroppedOwnerMapping=false`;
   - `provesDirectRendererSlotOrder=false`;
   - `provesCanonicalParity=false`.
5. Real compare result after re-running compare reports:
   - `cross-lane-precedence-compare.json.status=blocked-retail-active-slot-order-classifier-partial-direct-order-missing`;
   - `retailMaxLightVariantClassifier.status=owner-classifier-evaluated-partial-owner-candidates-direct-slot-order-still-blocked`;
   - `classifierGrade=true`;
   - `ownerClassifierEvaluated=true`;
   - `partialOwnerCandidates=true`.
6. Real blocker proof after re-running blocker proof:
   - `cross-lane-active-slot-blocker-proof.json.status=blocked-direct-retail-active-slot-order-missing-local-source-model-present`;
   - `ownerClassifierEvaluated=true`;
   - `ownerClassifierStrongCandidateCaseCount=4`;
   - `canonicalParityPromoted=false`.
7. Targeted tests:
   - command: `npm run test:unit -- --runInBand create-cross-lane-retail-maxlight-roi-diagnostics.spec.ts create-area-lighting-blocked-compare-reports.spec.ts create-cross-lane-active-slot-blocker-proof.spec.ts`;
   - result: 3 suites passed, 9 tests passed.
8. Campfire shadow-volume proof gating was tightened:
   - implementation surfaces:
     - `backend/scripts/create-area-lighting-local-oracle-inputs.mjs`;
     - `backend/scripts/create-area-lighting-pixel-diff-artifacts.mjs`;
     - `backend/scripts/create-area-lighting-blocked-compare-reports.mjs`;
     - `backend/scripts/capture-vfx-app-route-cdp.mjs`;
   - materialized campfire web input now records pixel dimensions, retail reference dimensions, `samePixelDimensionsAsRetail`, `sameRetailCameraOrCalibratedRoi`, and `calibratedRoiTransformStatus`;
   - the compare gate no longer treats same pixel dimensions as enough for shadow-volume parity;
   - accepted preconditions are now explicit: same retail camera/viewport, or a calibrated ROI transform;
   - the CDP capture helper now supports explicit viewport dimensions through `--viewportWidth` / `--viewportHeight`, but a capture made that way still must not be promoted without same-camera/ROI proof.
9. Real campfire proof result after re-running local inputs, pixel diff, and compare reports:
   - `area-lighting-local-oracle-inputs-manifest.json.status=local-web-inputs-ready-retail-oracle-still-required`;
   - `campfire.viewportCompatibilityStatus=local-preview-not-retail-viewport`;
   - selected source after the 1280x900 diagnostic capture: `aurora-web-catalog-campfire-plc-i06-light-shadow-proof-1280x900-diagnostic-2026-07-07.png`;
   - matching frame metadata: `aurora-web-catalog-campfire-plc-i06-light-shadow-proof-1280x900-diagnostic-2026-07-07.frame.json`;
   - frame metadata says `requestedViewport=1280x900`, `localOnlyNotRetailEvidence=true`, `canonicalParityPromoted=false`;
   - `campfire.pixelDimensionCompatibilityStatus=same-pixel-dimensions-retail-camera-still-unverified`;
   - `campfire.samePixelDimensionsAsRetail=true`;
   - `campfire.sameRetailCameraOrCalibratedRoi=false`;
   - `campfire.calibratedRoiTransformStatus=missing-calibrated-roi-transform`;
   - retail reference dimensions: `1280x900`;
   - Aurora Web input dimensions: `1280x900`.
10. Targeted tests after the stricter campfire gate:
    - command: `npm run test:unit -- --runInBand create-area-lighting-blocked-compare-reports.spec.ts create-area-lighting-pixel-diff-artifacts.spec.ts create-area-lighting-local-oracle-inputs.spec.ts create-cross-lane-retail-maxlight-roi-diagnostics.spec.ts create-cross-lane-active-slot-blocker-proof.spec.ts`;
    - result: 5 suites passed, 12 tests passed.
11. ProgFX Type 4 priority/tie proof was tightened without promoting scheduler parity:
    - implementation surfaces:
      - `backend/scripts/create-retail-progfx-type4-policy-artifacts.mjs`;
      - `backend/scripts/create-progfx-type4-runtime-oracle-blocker-proof.mjs`;
    - source driver checked: `backend/docs/aurora-reverse/artifacts/light-shadow-retail-oracle-drivers/generated-scripts/als_pfxpri.nss`;
    - source table fact: Blue_5m and Yello_5m both resolve to Type 4 Param4=`20`;
    - driver fact: `VFX_DUR_LIGHT_BLUE_5` and `VFX_DUR_LIGHT_YELLOW_5` are both scheduled with `DelayCommand(1.0, ...)`, Blue before Yellow;
    - retail pixel fact: priority after-capture is `warm-yellow`, `afterWarmSignalCount=169`, `afterBlueSignalCount=0`;
    - new proof field: `equalPriorityTieCandidate.status=retail-pixel-candidate-equal-priority-yellow-over-blue-observed-dataflow-still-blocked`;
    - `provesPriorityTieCandidate=true`;
    - `provesPriorityTiePolicy=false`;
    - `provesCanonicalParity=false`.
12. Targeted tests after the ProgFX tie-candidate proof:
    - command: `npm run test:unit -- --runInBand create-retail-progfx-type4-policy-artifacts.spec.ts create-progfx-type4-runtime-oracle-blocker-proof.spec.ts create-area-lighting-blocked-compare-reports.spec.ts`;
    - result: 3 suites passed, 12 tests passed.
13. ProgFX Type 4 proximity proof now carries concrete oracle-driver/fixture sample coordinates without promoting the exact threshold:
    - source driver checked: `backend/docs/aurora-reverse/artifacts/light-shadow-retail-oracle-drivers/generated-scripts/als_pfxprox.nss`;
    - fixture summary checked: `backend/docs/aurora-reverse/artifacts/light-shadow-retail-oracle-drivers/compiled-driver-module-injection-summary.json`;
    - pruned oracle stage has no retained named creature target, so `AlsTarget()` falls back to `GetFirstPC()` at module start;
    - near sample fixture start is `(65,55,0)`;
    - mid sample jumps to `AlsStageLocation(75.0, 65.0, 0.0, 0.0)`;
    - far sample jumps to `AlsStageLocation(85.0, 65.0, 0.0, 0.0)`;
    - stage coordinate reference from the same light-oracle scene is `(65,65,0)`, but it is not promoted as the participating proximity source lane;
    - emitted artifact keeps `measuredThresholdMeters=null` and `measuredThresholdAuroraUnits=null`;
    - emitted artifact records `nearDistanceFromStageReferenceAuroraUnits=10`, `midRestoredDistanceFromStageReferenceAuroraUnits=10`, and `farActiveDistanceFromStageReferenceAuroraUnits=20`;
    - because near and mid are both `10` units from this coordinate reference but produce different pixel classifications, the participating source lane still cannot be inferred from this stage reference.
14. Targeted tests after the proximity sample-coordinate correction:
    - command: `npm run test:unit -- --runInBand create-retail-progfx-type4-policy-artifacts.spec.ts create-progfx-type4-runtime-oracle-blocker-proof.spec.ts create-area-lighting-blocked-compare-reports.spec.ts`;
    - result: 3 suites passed, 12 tests passed.
15. Current retail oracle gate after regenerating ProgFX artifacts:
    - command: `node backend/scripts/check-area-lighting-retail-oracle-artifacts.mjs --allow-blocked`;
    - result: `status=blocked`, `blockers=3`, `oracleCases=8`, `oracleCasesPassed=0`, `oracleCasesBlocked=8`, `requiredArtifacts=25`, `presentRequiredArtifacts=25`, `missingRequiredArtifacts=0`, `failedRequiredJsonArtifacts=10`.
16. Campfire shadow-volume pixel compare initially added a translation-only ROI calibration attempt instead of only reporting a missing ROI:
    - implementation surfaces:
      - `backend/scripts/create-area-lighting-pixel-diff-artifacts.mjs`;
      - `backend/scripts/create-area-lighting-blocked-compare-reports.mjs`;
    - artifact: `area-lighting-pixel-diff-artifacts.json`;
    - initial `calibratedRoiAttempt.status=calibrated-roi-translation-attempted-failed-tolerance`;
    - best translation-only offset from that pass: `sampleOffsetX=32`, `sampleOffsetY=-3`, approximately `+426.67px`, `-37.5px`;
    - best candidate still fails: `meanAbsLumaDelta=19.8664` vs max `8`, `changedSampleRatioGt5=0.8870` vs max `0.15`;
    - `shadowvol-campfire-pixel-compare.json.captureCompatibility.calibratedRoiAttempted=true`;
    - `calibratedRoiAttemptPassed=false`, `calibratedRoiPresent=false`, `sameViewportOrCalibratedRoiPresent=false`;
    - canonical parity is still not promoted.
17. Targeted tests after the campfire ROI calibration attempt:
    - command: `npm run test:unit -- --runInBand create-area-lighting-pixel-diff-artifacts.spec.ts create-area-lighting-blocked-compare-reports.spec.ts`;
    - result: 2 suites passed, 8 tests passed.
18. Current retail oracle gate after regenerating pixel-diff and compare reports:
    - command: `node backend/scripts/check-area-lighting-retail-oracle-artifacts.mjs --allow-blocked`;
    - result: `status=blocked`, `blockers=3`, `oracleCases=8`, `oracleCasesPassed=0`, `oracleCasesBlocked=8`, `requiredArtifacts=25`, `presentRequiredArtifacts=25`, `missingRequiredArtifacts=0`, `failedRequiredJsonArtifacts=10`.
19. Frontend LightManager active-selection radius rule is now represented from the recovered `FUN_00a42728` path without promoting owner-lane parity:
    - implementation surfaces:
      - `frontend/src/modules/layout/adapters/three/auroraLightManagerPreview.ts`;
      - `frontend/src/modules/layout/adapters/three/workspaceSceneLightDiagnostics.ts`;
      - `frontend/src/modules/layout/adapters/three/workspaceTerrainMesh.ts`;
      - `frontend/src/modules/layout/adapters/three/workspacePlaceableModelPresentation.ts`;
      - `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts`;
    - source anchor: `C:\Projects\New Folder\export\decompiled_all.c:866625-866678`;
    - represented rule: `FUN_00a42728` accepts a sorted candidate only when `light+0x80 <= (light+0x60 when positive, otherwise light+0x58)`;
    - shared preview score metadata now records `activeSelectionRadiusOverride`, `activeSelectionRadiusLimit`, `activeSelectionRadiusEnforced`, `activeSelectionRadiusPassed`, rule text, and source text;
    - `selectAuroraLightManagerPreviewBudget()` can now enforce the active-selection radius gate without consuming a slot for failed candidates;
    - terrain source lights now use the shared LightManager preview selector instead of a local tile-only priority sort, and record the recovered `fx_flame01` source radius/shadowradius metadata;
    - placeables.2da `LightColor` lights now compute the same active-selection radius metadata from `fx_placeable01/AuroraLight01`, with a local enforced pass/fail field;
    - source-MDL placeable lights, creature source-MDL lights, and global scene diagnostics record the active-selection radius metadata but intentionally do not enforce it where the retail camera/target/reference point is not recovered;
    - this is an Aurora Web implementation of a recovered intra-LightManager selection rule, not a proof of full retail cross-lane owner ordering.
20. Targeted frontend verification after the LightManager active-selection radius implementation:
    - command: `cd frontend; npx tsc --noEmit --pretty false`;
    - result: passed;
    - command: `cd frontend; npx vitest run tests/unit/modules/layout/auroraLightManagerPreview.test.ts tests/unit/modules/layout/workspaceTerrainMesh.tileLights.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts tests/unit/modules/placeables/placeableRenderPayloadResolver.test.ts`;
    - result: 5 test files passed, 148 tests passed.
21. Current retail oracle gate after the LightManager active-selection radius implementation:
    - command: `node backend/scripts/check-area-lighting-retail-oracle-artifacts.mjs --allow-blocked`;
    - result: `status=blocked`, `blockers=3`, `oracleCases=8`, `oracleCasesPassed=0`, `oracleCasesBlocked=8`, `requiredArtifacts=25`, `presentRequiredArtifacts=25`, `missingRequiredArtifacts=0`, `failedRequiredJsonArtifacts=10`;
    - interpretation: the implementation now covers more recovered active-selection math, but the gate correctly remains blocked because shadow-volume pixel parity, cross-lane owner precedence, and ProgFX scheduler parity are still not proven.
22. Cross-lane active-slot blocker proof now exposes a lane promotion matrix and a hard retail-ordering promotion gate:
    - implementation surface: `backend/scripts/create-cross-lane-active-slot-blocker-proof.mjs`;
    - test surface: `backend/test/unit/create-cross-lane-active-slot-blocker-proof.spec.ts`;
    - generated artifact: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/cross-lane-active-slot-blocker-proof.json`;
    - new `retailOrderingPromotionGate.status=blocked-direct-slot-order-and-accepted-dropped-owner-map-missing`;
    - `sourceBackedActiveSlotAlgorithm=true`;
    - `localRequiredLaneCoverage=true`;
    - `directRetailActiveSlotDump=false`;
    - `directRendererSlotOrder=false`;
    - `acceptedDroppedOwnerMapping=false`;
    - `allRequiredLaneOwnerPathsRecovered=false`;
    - `permitsRetailOrderingPromotion=false`;
    - the lane matrix keeps tile main separate from tile source: the current local point-light sample proves the source-light carrier lane, not the main tile static lane;
    - current local observations in the real artifact: tile source, placeable LightColor, source-MDL light, item-property light, and ProgFX Type 4 request are locally observed; tile main remains not locally observed as a point-light sample;
    - this change does not promote retail cross-lane parity. It makes the block explicit and machine-checkable.
23. Targeted backend verification after the cross-lane blocker proof correction:
    - command: `cd backend; npm run test:unit -- --runInBand create-cross-lane-active-slot-blocker-proof.spec.ts create-area-lighting-blocked-compare-reports.spec.ts`;
    - result: 2 suites passed, 8 tests passed;
    - command: `node backend/scripts/create-cross-lane-active-slot-blocker-proof.mjs`;
    - result: `status=blocked-direct-retail-active-slot-order-missing-local-source-model-present`, `localSampleCount=6`, `directRetailSlotDumpAvailable=false`, `canonicalParityPromoted=false`.
24. Frontend ProgFX Type 4 scheduler diagnostics no longer promote equal-priority top ties as if "last applied wins" were a recovered retail rule:
    - implementation surface: `frontend/src/modules/layout/adapters/three/auroraProgFxType4SchedulerPolicy.ts`;
    - scene diagnostics surface: `frontend/src/modules/layout/adapters/three/workspaceSceneLightDiagnostics.ts`;
    - previous behavior: local diagnostics sorted equal Param4 values by traversal order and exposed that as the priority winner string;
    - corrected behavior: local diagnostics still sort Param4 ascending for inspection, but if the top priority bucket has more than one request, `priorityWinner` becomes `blocked=equal-priority-top-tie-retail-scheduler-policy-unproven`;
    - new diagnostics: `priorityTopTieBlocked` and `priorityTopTieCandidateCount`;
    - policy status is now `retail-oracle-progfx-type4-equal-priority-tie-candidate-observed-general-policy-blocked`;
    - this aligns Aurora Web with the current retail oracle state: equal-priority yellow-over-blue is only a candidate observation, not a promoted general scheduler rule.
25. Targeted frontend verification after the ProgFX equal-priority tie correction:
    - command: `cd frontend; npx vitest run tests/unit/modules/layout/auroraProgFxType4SchedulerPolicy.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts`;
    - result: 2 test files passed, 13 tests passed;
    - command: `cd frontend; npx tsc --noEmit --pretty false`;
    - result: passed.
26. Backend ProgFX Type 4 runtime blocker proof now has an explicit scheduler policy matrix and promotion gate:
    - implementation surface: `backend/scripts/create-progfx-type4-runtime-oracle-blocker-proof.mjs`;
    - test surface: `backend/test/unit/create-progfx-type4-runtime-oracle-blocker-proof.spec.ts`;
    - generated artifact: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/progfx-type4-runtime-oracle-blocker-proof.json`;
    - `schedulerPromotionGate.status=blocked-progfx-type4-scheduler-policy-parity-incomplete`;
    - `promotionAllowed=false`;
    - failed promotion checks:
      - `priorityTiePolicyProven=false`;
      - `stockPriorityZeroPolicyProven=false`;
      - `exactProximityThresholdProven=false`;
      - `attachToSceneRestorePolicyProven=false`;
      - `blindvisionLocalVsRetailParity=false`;
    - real artifact policy matrix keeps observed runtime signals separate from scheduler parity:
      - `param4-priority-visible-type4-signal`: evidence passed, not promoted as scheduler policy;
      - `param4-equal-priority-tie`: tie candidate observed, general policy blocked;
      - `param4-zero`: custom override captured, not stock retail parity;
      - `param5-proximity-suppression-threshold`: bracket observed, exact threshold/source lane blocked;
      - `param6-attach-to-scene-restore`: no scene-light removal observed;
      - `vision-blindvision-pixel-mutation`: retail mutation observed, local-vs-retail parity blocked.
27. Targeted backend verification after the ProgFX scheduler promotion gate:
    - command: `cd backend; npm run test:unit -- --runInBand create-progfx-type4-runtime-oracle-blocker-proof.spec.ts create-retail-progfx-type4-policy-artifacts.spec.ts`;
    - result: 2 suites passed, 5 tests passed;
    - command: `node backend/scripts/create-progfx-type4-runtime-oracle-blocker-proof.mjs`;
    - result: `status=blocked-progfx-type4-runtime-oracles-present-policy-parity-incomplete`, `prioritySignal=true`, `proximityBracket=true`, `blindvisionMutation=true`, `canonicalParityPromoted=false`.
28. Retail binary/decompilation audit was rerun with local Capstone available:
    - command: `python backend/scripts/audit-retail-light-function-disasm.py "C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\bin\win32\nwserver.exe" "C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\bin\win32\nwmain.exe"`;
    - output artifact: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/audit-retail-light-function-disasm-2026-07-03.json`;
    - result: `proofStatus=source-backed-retail-light-export-function-ranges-disassembled`;
    - `shadowVolumeProjectionEvidence.proofStatus=source-backed-shadowplane-shadowvol-shader-caster-path-stencil-face-op-render-state-slot3-and-local-draw-order-mapped-retail-parity-blocked`;
    - `lightManagerSourceOrderingEvidence.proofStatus=source-backed-lightmanager-frame-rebuild-sort-upload-cross-lane-owner-precedence-blocked`;
    - `progfxType4SourceSchedulerEvidence.proofStatus=source-backed-visualeffects-loader-progfx-type4-scheduler-not-in-source-only-decompilation`;
    - `progfxType4SourceSchedulerEvidence.runtimeSchedulerStringHitCount=0`.
29. Dependent source/binary proof artifacts were regenerated after the Capstone audit:
    - commands:
      - `node backend/scripts/create-retail-shadowvol-projection-proof-artifact.mjs`;
      - `node backend/scripts/create-lightmanager-lane-owner-artifacts.mjs`;
      - `node backend/scripts/create-cross-lane-active-slot-blocker-proof.mjs`;
    - `retail-shadowvol-projection-proof.json.status=source-backed-shadowvol-projection-caster-path-retail-pixel-parity-blocked`;
    - `lightmanager-lane-owner-artifacts` result: `requestedDirectCallXrefCount=0`, `indirectCandidateCount=8626`;
    - `sourceOrderingProofStatus=source-backed-lightmanager-frame-rebuild-sort-upload-cross-lane-owner-precedence-blocked`;
    - `activeSlotAlgorithmProofStatus=source-backed-active-slot-cap-score-sort-prune-append-upload-shader-loop-lane-score-input-still-blocked`;
    - `cross-lane-active-slot-blocker-proof.json.status=blocked-direct-retail-active-slot-order-missing-local-source-model-present`;
    - interpretation: Capstone confirms the export/function-range evidence but still does not recover direct owner-lane retail ordering or ProgFX scheduler data-flow.
30. Targeted backend verification after the Capstone audit regeneration:
    - command: `cd backend; npm run test:unit -- --runInBand audit-retail-light-function-disasm.spec.ts create-lightmanager-lane-owner-artifacts.spec.ts create-cross-lane-active-slot-blocker-proof.spec.ts`;
    - result: 3 suites passed, 8 tests passed.
31. Campfire shadow-volume ROI calibration was strengthened from translation-only to translation plus uniform scale:
    - implementation surface: `backend/scripts/create-area-lighting-pixel-diff-artifacts.mjs`;
    - compare surface: `backend/scripts/create-area-lighting-blocked-compare-reports.mjs`;
    - test surfaces:
      - `backend/test/unit/create-area-lighting-pixel-diff-artifacts.spec.ts`;
      - `backend/test/unit/create-area-lighting-blocked-compare-reports.spec.ts`;
    - generated artifact: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/area-lighting-pixel-diff-artifacts.json`;
    - current `calibratedRoiAttempt.status=calibrated-roi-affine-attempted-failed-tolerance`;
    - `method=normalized-luma-grid-translation-and-uniform-scale-search`;
    - `bestMethod=uniform-scale-translation`;
    - best affine candidate: `scale=1.3`, `sampleOffsetX=27`, `sampleOffsetY=8`, approximately `+360px`, `+100px`;
    - best affine score: `meanAbsLumaDelta=18.5924`, `changedSampleRatioGt5=0.8704`;
    - previous translation-only candidate remains recorded: `scale=1`, `sampleOffsetX=32`, `sampleOffsetY=-3`, approximately `+426.67px`, `-37.5px`, `meanAbsLumaDelta=19.8664`, `changedSampleRatioGt5=0.8870`;
    - tolerance is unchanged: `maxMeanAbsLumaDelta=8`, `maxChangedSampleRatioGt5=0.15`;
    - `canonicalParityPromoted=false`.
32. Targeted backend verification after the campfire affine ROI calibration:
    - command: `cd backend; npm run test:unit -- --runInBand create-area-lighting-pixel-diff-artifacts.spec.ts create-area-lighting-blocked-compare-reports.spec.ts`;
    - result: 2 suites passed, 9 tests passed;
    - commands:
      - `node backend/scripts/create-area-lighting-pixel-diff-artifacts.mjs`;
      - `node backend/scripts/create-area-lighting-blocked-compare-reports.mjs`;
      - `node backend/scripts/check-area-lighting-retail-oracle-artifacts.mjs --allow-blocked`;
    - gate result remains `status=blocked`, `blockers=3`, `oracleCases=8`, `oracleCasesPassed=0`, `oracleCasesBlocked=8`, `failedRequiredJsonArtifacts=10`.
33. Cross-lane compare output now carries the same hard retail-ordering promotion gate as the blocker proof:
    - implementation surface: `backend/scripts/create-area-lighting-blocked-compare-reports.mjs`;
    - test surface: `backend/test/unit/create-area-lighting-blocked-compare-reports.spec.ts`;
    - regenerated artifact: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/cross-lane-precedence-compare.json`;
    - current `cross-lane-precedence-compare.json.status=blocked-retail-active-slot-order-classifier-partial-direct-order-missing`;
    - `retailOrderingPromotionGate.status=blocked-direct-slot-order-and-accepted-dropped-owner-map-missing`;
    - `promotionAllowed=false`;
    - promotion checks:
      - `sourceBackedActiveSlotAlgorithm=true`;
      - `localRequiredLaneCoverage=true`;
      - `directRetailActiveSlotDump=false`;
      - `directRendererSlotOrder=false`;
      - `acceptedDroppedOwnerMapping=false`;
      - `allRequiredLaneOwnerPathsRecovered=false`;
    - `proofScope.permitsRetailOrderingPromotion=false`;
    - `proofScope.provesRetailCrossLaneOwnerPrecedence=false`;
    - interpretation: local Aurora Web lane coverage and the recovered LightManager score/cap path are not allowed to become a retail owner-precedence claim until direct renderer slot order or a complete accepted/dropped owner map is proven.
34. Targeted backend verification after the cross-lane compare promotion-gate correction:
    - command: `cd backend; npm run test:unit -- --runInBand create-area-lighting-blocked-compare-reports.spec.ts create-cross-lane-active-slot-blocker-proof.spec.ts`;
    - result: 2 suites passed, 8 tests passed;
    - commands:
      - `node backend/scripts/create-area-lighting-blocked-compare-reports.mjs`;
      - `node backend/scripts/check-area-lighting-retail-oracle-artifacts.mjs --allow-blocked`;
    - gate result remains `status=blocked`, `blockers=3`, `oracleCases=8`, `oracleCasesPassed=0`, `oracleCasesBlocked=8`, `missingRequiredArtifacts=0`, `failedRequiredJsonArtifacts=10`.
35. Aurora Web Three renderer now applies the recovered active-light linear falloff in the shader path instead of only describing it in `userData`:
    - implementation surface: `frontend/src/modules/layout/adapters/three/auroraThreeLightFalloff.ts`;
    - runtime install surface: `frontend/src/modules/layout/adapters/three/workspaceThreeRuntime.ts`;
    - placeable/source-MDL proof metadata surface: `frontend/src/modules/layout/adapters/three/workspacePlaceableModelPresentation.ts`;
    - terrain tile source-light proof metadata surface: `frontend/src/modules/layout/adapters/three/workspaceTerrainMesh.ts`;
    - item/equipment and creature source-MDL proof metadata surface: `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts`;
    - ProgFX fixture/canonical preview surfaces:
      - `frontend/src/modules/vfx/dev/VfxFixtureRunner.tsx`;
      - `frontend/src/modules/layout/adapters/three/auroraVfxCanonicalRenderer.ts`;
    - source rule: `C:/Projects/New Folder/export/decompiled_all.c:866543-866563 FUN_00a423d8 adds active light color as max(0,1-distance/radius)*color*fade`;
    - Three 0.184 default shader path used `1 / pow(distance, decay) * smooth cutoff`; for Aurora `decay=1` point lights this was not the recovered Aurora linear rule;
    - installed shader marker: `AURORA_WEB_LINEAR_LIGHT_FALLOFF_DECAY_ONE`;
    - renderer proof status emitted in point-light/frame/userData for the covered lanes: `source-backed-linear-radius-falloff-preview-shaderchunk-adapter`;
    - scope: this closes the local Aurora Web falloff implementation mismatch for placeable/source-MDL/ProgFX/item/creature/terrain source point-light previews that opt into `decay=1`; it does not promote unresolved cross-lane owner ordering or shadow-volume pixel parity.
36. Targeted frontend verification after the shader falloff correction:
    - command: `cd frontend; npx vitest run tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/modules/layout/auroraThreeLightFalloff.test.ts tests/unit/modules/layout/workspaceTerrainMesh.tileLights.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts`;
    - result: 4 files passed, 137 tests passed;
    - command: `cd frontend; npx tsc --noEmit --pretty false`;
    - result: passed.
37. Scene diagnostics now keeps the decompiled falloff formula proof separate from the renderer shader-patch proof:
    - implementation surface: `frontend/src/modules/layout/adapters/three/workspaceSceneLightDiagnostics.ts`;
    - test surface: `frontend/tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts`;
    - emitted point-light sample fields:
      - `falloffRendererPatch`;
      - `falloffRendererProof`;
      - `falloffRendererSource`;
    - covered userData lanes:
      - `auroraTerrainTileLightFalloffRenderer*`;
      - `placeableTwoDaLightFalloffRenderer*`;
      - `auroraVfxProgFxType4FalloffRenderer*`;
      - `itemPropertyLightFalloffRenderer*`;
      - `auroraLightFalloffRenderer*`;
      - `creatureAuroraLightFalloffRenderer*`;
    - interpretation: a runtime/screenshot diagnostic can now distinguish "Aurora rule is known" from "Aurora Web renderer is actually using the linear shader patch".
38. Terrain tile source PointLights no longer apply an unsupported Aurora Web preview attenuation multiplier:
    - implementation surface: `frontend/src/modules/layout/adapters/three/workspaceTerrainMesh.ts`;
    - diagnostic surface: `frontend/src/modules/layout/adapters/three/workspaceSceneLightDiagnostics.ts`;
    - test surfaces:
      - `frontend/tests/unit/modules/layout/workspaceTerrainMesh.tileLights.test.ts`;
      - `frontend/tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts`;
    - previous local behavior: source tile PointLight intensity was `lightcolor.2da RGB max * 0.72`;
    - corrected local behavior: source tile PointLight intensity is `lightcolor.2da RGB max`, with normalized Three color preserving the 2DA RGB vector;
    - source rule: `C:/Projects/New Folder/export/decompiled_all.c:866543-866563 accumulates active light as color * max(0,1-distance/radius) * multiplier`;
    - explicit remaining gap: `fx_flame01/AuroraLight01` multiplier is not recovered in current local resource artifacts, so Aurora Web records neutral `1.0` as a fallback and does not claim an exact resource multiplier;
    - LightManager preview score input now uses the same neutral tile-source multiplier instead of the former `* 0.72` web-preview attenuation;
    - emitted scene diagnostic point-light fields now include `intensitySource` and `intensityProof`, so runtime frame JSON can prove whether intensity came from source-backed RGB preservation or from a preview fallback.
39. Additional frontend route verification after the diagnostics sample format changed:
    - command: `cd frontend; npx vitest run tests/unit/app/App.vfxFixtureRunner.test.tsx tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts tests/unit/modules/vfx/dev/vfxFixturePayloads.test.ts`;
    - result: 3 files passed, 29 tests passed;
    - command: `cd frontend; npx tsc --noEmit --pretty false`;
    - result: passed;
    - test expectation now preserves the stricter ProgFX equal-priority status: `retail-oracle-progfx-type4-equal-priority-tie-candidate-observed-general-policy-blocked`, not the older docs-only last-applied wording.
40. Point-light intensity proof is now explicit for the remaining ProgFX/cross-lane preview paths instead of falling back to `unknown`:
    - ProgFX canonical implementation surface: `frontend/src/modules/layout/adapters/three/auroraVfxCanonicalRenderer.ts`;
    - cross-lane diagnostic route surface: `frontend/src/modules/vfx/dev/VfxFixtureRunner.tsx`;
    - scene diagnostic reader: `frontend/src/modules/layout/adapters/three/workspaceSceneLightDiagnostics.ts`;
    - retail gate hardening surface: `backend/scripts/check-area-lighting-retail-oracle-artifacts.mjs`;
    - ProgFX single-light intensity proof: source-MDL RGB from `fx_light_clr.mdl` is split into normalized `THREE.Color` plus max RGB `THREE.PointLight.intensity`, so `color * intensity` preserves the source vector;
    - ProgFX proof status: `source-family-backed-fx_light_clr-mdl-rgb-vector-preserved-through-three-color-intensity`;
    - cross-lane fixture proof status: `local-diagnostic-cross-lane-intensity-fixture-retail-pixel-parity-blocked`;
    - interpretation: the cross-lane route no longer presents diagnostic intensities as Aurora facts; they are explicitly local probes until retail pixel/scheduler parity passes.
41. Targeted verification after point-light intensity proof hardening:
    - command: `cd frontend; npx vitest run tests/unit/app/App.vfxFixtureRunner.test.tsx tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/modules/vfx/dev/vfxFixturePayloads.test.ts`;
    - result: 4 files passed, 38 tests passed;
    - command: `cd backend; npm run test:unit -- --runInBand check-area-lighting-retail-oracle-artifacts.spec.ts`;
    - result: 1 suite passed, 7 tests passed;
    - command: `cd frontend; npx tsc --noEmit --pretty false`;
    - result: passed;
    - command: `node backend/scripts/check-area-lighting-retail-oracle-artifacts.mjs --allow-blocked`;
    - result after current-evidence refresh: `status=blocked`, `blockers=3`, `oracleCases=8`, `oracleCasesPassed=0`, `oracleCasesBlocked=8`, `missingRequiredArtifacts=0`, `failedRequiredJsonArtifacts=10`, `currentEvidenceEntries=57`, `currentEvidenceFilesPresent=43`, `currentEvidenceFilesMissing=0`, `currentEvidenceSourceTokens=14`;
    - gate hardening note: transient `ENOENT` from Chrome cache files under capture artifacts is ignored during artifact walking, so the gate reports the actual retail-oracle blockers instead of crashing on a disappearing cache entry.
42. Fresh `plc_plc_i06` campfire runtime proof was captured from Aurora Web after the placeable light/radius/default-state corrections:
    - route: `/dev/catalog-vfx-preview?templateId=plc_plc_i06&time=0.32&seed=607&emitterProof=obvious&displayShadows=true&areaShadowOpacity=50`;
    - active proof PNG: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-07\campfire-placeable-light-radius-current.png`;
    - active proof MP4: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-07\campfire-placeable-light-radius-current.mp4`;
    - active proof frame JSON: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-07\campfire-placeable-light-radius-current.frame.json`;
    - active proof metrics after the source-vs-preview provenance recapture: `png=20207 bytes`, `mp4=76449 bytes`, `mp4FrameCount=126`, `model=plc_i06.mdl`, `status=active`, `pointLightCount=1`, `fastShadowCount=1`, `objectPixels=48853`, `drawParticles=82`, `renderedVertices=912`, `textureStatus=applied`, `campfireCoreCount=4`;
    - active proof source fields: `row=6`, `label=PaleYellow`, `lightState=1`, `lightStateProof=retail-binary-backed-nwserver-lightstate-default-on-xref`, `rgbVectorProof=source-backed-lightcolor-rgb-vector`, `intensityProof=preview-adapter-rgb-max-intensity-no-source-intensity-field`, `intensity=1.9`, `distance=5`, `sourceRadius=10`, `sourceUnitScale=0.5`, `sourceWorldDistance=5`, `radiusProof=source-backed-fx-placeable01-auroralight01-radius-controller`, `shadowProof=source-backed-retail-shadowsize-selects-fx-shadow-mdl`, `materialOpacity=0.045`;
    - disabled proof route: `/dev/catalog-vfx-preview?templateId=plc_plc_i06&time=0.32&seed=607&emitterProof=obvious&displayShadows=true&areaShadowOpacity=50&lightState=0`;
    - disabled proof PNG: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-07\campfire-placeable-lightstate0-current.png`;
    - disabled proof MP4: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-07\campfire-placeable-lightstate0-current.mp4`;
    - disabled proof frame JSON: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-07\campfire-placeable-lightstate0-current.frame.json`;
    - disabled proof metrics: `png=24582 bytes`, `mp4=26995 bytes`, `mp4FrameCount=96`, `model=plc_i06.mdl`, `status=disabled`, `pointLightCount=0`, `fastShadowCount=0`, `disabledByLightState=1`, `objectPixels=9367`, `drawParticles=82`, `renderedVertices=912`;
    - interpretation: this proves the current Aurora Web placeable light implementation has a source-backed warm PaleYellow 2DA `PointLight` with the `fx_placeable01/AuroraLight01` radius path and that `LightState=0` disables the 2DA light/fast-shadow lane while the source-MDL flame emitter remains visible. The `intensity=1.9` field is now explicitly marked as a Three preview adapter that reconstructs the source RGB vector; it is not presented as an Aurora source intensity field. This remains local Aurora Web proof, not retail pixel parity.
43. The retail-oracle artifact gate now lists the fresh campfire proof files as `currentEvidence` for the shadow-volume/campfire case:
    - implementation surface: `backend/scripts/check-area-lighting-retail-oracle-artifacts.mjs`;
    - important scope boundary: these proof files are not required retail artifacts and do not make the gate pass; they only keep the current Aurora Web evidence set from pointing at stale `distance=2.25` / `default-assumed` captures.
44. Fresh cross-lane all-light-lanes runtime proof was captured from Aurora Web after the point-light intensity/source-proof corrections:
    - route: `/dev/vfx-fixture/vfx-retail-cross-lane-all-light-lanes-policy?time=0.5&seed=37&capture=data-url`;
    - proof PNG: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\light-shadow-2026-07-03-shadowvol-preview\cross-lane-all-light-lanes-runtime-probe-2026-07-07.png`;
    - proof MP4: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\light-shadow-2026-07-03-shadowvol-preview\cross-lane-all-light-lanes-runtime-probe-2026-07-07.mp4`;
    - proof frame JSON: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\light-shadow-2026-07-03-shadowvol-preview\cross-lane-all-light-lanes-runtime-probe-2026-07-07.frame.json`;
    - proof metrics: `png=84713 bytes`, `mp4=27835 bytes`, `mp4FrameCount=108`, `fixtureRenderStatus=rendered`, `fixtureCanvasNonblank=true`, `fixtureObjectPixels=22336`, `fixtureRenderedDrawParticles=4`, `fixtureRenderedVertices=24`;
    - runtime probe status: `local-cross-lane-runtime-probe-observed-required-lanes-retail-ordering-still-blocked`;
    - lane coverage: `requiredLaneCoverageCount=5`, `pointLightSampleCount=5`, `nonPointRequestSampleCount=1`;
    - budget-accepted local lanes: `item-property-light`, `placeables-2da-light`, `source-mdl-light-node`, `terrain-tile-light`;
    - unknown/blocked scheduler lane: `progfx-type4-light-request`;
    - local order samples recorded in the frame JSON:
      - `item-property-light` / `VFX_DUR_LIGHT_RED_20` / `localOrderKey=1` / `budgetRank=1` / `retailOrdering=blocked`;
      - `source-mdl-light-node` / `diagnostic_mdl_light01` / `localOrderKey=2` / `budgetRank=2` / `retailOrdering=blocked`;
      - `terrain-tile-light` / `diagnostic-tile-sourcelight1` / `localOrderKey=3` / `budgetRank=3` / `retailOrdering=blocked`;
      - `placeables-2da-light` / `PaleYellow` / `localOrderKey=4` / `budgetRank=4` / `retailOrdering=blocked`;
      - `progfx-type4-light-request` / `VFX_DUR_LIGHT_BLUE_5` / `localOrderKey=20000` / `budgetRank=unknown` / `retailOrdering=blocked`;
      - `progfx-type4-light-request` / `LightBlue5m` / `localOrderKey=25020` / `budgetRank=unknown` / `retailOrdering=blocked`;
    - implementation surfaces updated:
      - `backend/scripts/check-area-lighting-retail-oracle-artifacts.mjs` now lists this PNG/JSON/MP4 as current evidence and treats `.mp4` as file evidence instead of a source-token;
      - `backend/src/modules/areas/domain/area-lighting-evidence.ts` now exposes the fresh campfire and cross-lane current evidence to the backend domain layer;
    - verification after this update:
      - command: `cd backend; npm run test:unit -- --runInBand check-area-lighting-retail-oracle-artifacts.spec.ts`;
      - result: 1 suite passed, 8 tests passed;
      - command: `node backend/scripts/check-area-lighting-retail-oracle-artifacts.mjs --allow-blocked`;
      - result: `status=blocked`, `blockers=3`, `oracleCases=8`, `oracleCasesPassed=0`, `oracleCasesBlocked=8`, `requiredArtifacts=25`, `presentRequiredArtifacts=25`, `missingRequiredArtifacts=0`, `failedRequiredJsonArtifacts=10`, `currentEvidenceEntries=60`, `currentEvidenceFilesPresent=48`, `currentEvidenceFilesMissing=0`, `currentEvidenceSourceTokens=12`;
    - interpretation: this proves Aurora Web currently instantiates and reports all intended local light lanes in one diagnostic scene, but it deliberately does not prove retail lane ordering. Retail lane precedence remains blocked until a common LightManager insertion path or a retail/toolset oracle proves accepted/dropped lanes.
45. Final targeted verification after synchronizing gate and backend domain evidence:
    - command: `cd frontend; npx vitest run tests/unit/app/App.vfxFixtureRunner.test.tsx tests/unit/modules/layout/auroraVfxCanonicalRenderer.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/modules/vfx/dev/vfxFixturePayloads.test.ts`;
    - result: 4 files passed, 38 tests passed;
    - command: `cd frontend; npx tsc --noEmit --pretty false`;
    - result: passed;
    - command: `cd backend; npm run test:unit -- --runInBand area-lighting-evidence.spec.ts check-area-lighting-retail-oracle-artifacts.spec.ts`;
    - result: 2 suites passed, 13 tests passed;
    - command: `cd backend; npm run build`;
    - result: passed;
    - domain evidence tests now assert that fresh campfire radius/LightState MP4/PNG/JSON proof and fresh cross-lane 2026-07-07 MP4/PNG/JSON proof remain exposed through `buildAreaLightingEvidenceReport`;
    - gate tests now assert `.mp4` current evidence is treated as `present` / `local-proof-file`, not as a `source-token`.
46. ShadowSize S/M/L local runtime proof matrix was added without pretending the query override is a source `placeables.2da` value:
    - implementation surfaces:
      - `frontend/src/modules/vfx/dev/CatalogVfxPreviewRunner.tsx` accepts dev-only `shadowSize` / `shadowSizeOverride` query values for proof routes;
      - `frontend/src/modules/layout/adapters/three/workspacePlaceableModelPresentation.ts` propagates `source2daShadowSizeOverrideSource` and `source2daShadowSizeOverrideProofStatus` into placeable light, fast-shadow, and diagnostic userData;
      - `backend/scripts/check-area-lighting-retail-oracle-artifacts.mjs` and `backend/src/modules/areas/domain/area-lighting-evidence.ts` list the matrix proof files as current evidence for the campfire shadow-volume case;
    - proof route family: `/dev/catalog-vfx-preview?templateId=plc_plc_i06&time=0.32&seed=607&emitterProof=obvious&displayShadows=true&areaShadowOpacity=50&shadowSize=N&capture=data-url`;
    - `ShadowSize=0` proof:
      - PNG: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-07\campfire-placeable-shadowsize0-current.png`;
      - MP4: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-07\campfire-placeable-shadowsize0-current.mp4`;
      - frame JSON: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-07\campfire-placeable-shadowsize0-current.frame.json`;
      - metrics: `png=31803 bytes`, `mp4=40303 bytes`, `mp4FrameCount=72`, `objectPixels=22465`, `pointLightCount=1`, `fastShadowCount=1`, `shadowLane=small`, `fastShadowModel=fx_shadow_s.mdl`, `emitter=Small`, `emitterSize=1`, `radius=0.5`, `baseOpacity=0.6`, `opacity=0.3`, `areaOpacity=50`, `areaFactor=0.5`;
    - `ShadowSize=1` proof:
      - PNG: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-07\campfire-placeable-shadowsize1-current.png`;
      - MP4: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-07\campfire-placeable-shadowsize1-current.mp4`;
      - frame JSON: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-07\campfire-placeable-shadowsize1-current.frame.json`;
      - metrics: `png=31680 bytes`, `mp4=48435 bytes`, `mp4FrameCount=72`, `objectPixels=48887`, `pointLightCount=1`, `fastShadowCount=1`, `shadowLane=medium`, `fastShadowModel=fx_shadow_m.mdl`, `emitter=Med`, `emitterSize=1.6`, `radius=0.8`, `baseOpacity=0.6`, `opacity=0.3`, `areaOpacity=50`, `areaFactor=0.5`;
    - `ShadowSize=2` proof:
      - PNG: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-07\campfire-placeable-shadowsize2-current.png`;
      - MP4: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-07\campfire-placeable-shadowsize2-current.mp4`;
      - frame JSON: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-07\campfire-placeable-shadowsize2-current.frame.json`;
      - metrics: `png=31463 bytes`, `mp4=62519 bytes`, `mp4FrameCount=72`, `objectPixels=191329`, `pointLightCount=1`, `fastShadowCount=1`, `shadowLane=large`, `fastShadowModel=fx_shadow_l.mdl`, `emitter=Large`, `emitterSize=3`, `radius=1.5`, `baseOpacity=0.7`, `opacity=0.35`, `areaOpacity=50`, `areaFactor=0.5`;
    - all three frame JSON files report `shadowSource=dev-catalog-vfx-preview-query-shadowSize-local-diagnostic-override` and `shadowProof=local-diagnostic-shadowsize-override-source-backed-retail-selection-rule`;
    - verification:
      - command: `cd frontend; npx vitest run tests/unit/modules/vfx/dev/CatalogVfxPreviewRunner.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts`;
      - result: 2 files passed, 129 tests passed;
      - command: `cd frontend; npx tsc --noEmit --pretty false`;
      - result: passed;
      - command: `cd backend; npm run test:unit -- --runInBand area-lighting-evidence.spec.ts check-area-lighting-retail-oracle-artifacts.spec.ts`;
      - result: 2 suites passed, 13 tests passed;
      - command: `cd backend; npm run build`;
      - result: passed;
      - command: `node backend/scripts/check-area-lighting-retail-oracle-artifacts.mjs --allow-blocked`;
      - result: `status=blocked`, `blockers=3`, `oracleCases=8`, `oracleCasesPassed=0`, `oracleCasesBlocked=8`, `requiredArtifacts=25`, `presentRequiredArtifacts=25`, `missingRequiredArtifacts=0`, `failedRequiredJsonArtifacts=10`, `currentEvidenceEntries=69`, `currentEvidenceFilesPresent=57`, `currentEvidenceFilesMissing=0`, `currentEvidenceSourceTokens=12`;
    - interpretation: Aurora Web now has local proof that the source-backed retail selection rule maps `0 -> Fx_Shadow_S`, `1/other -> Fx_Shadow_M`, `2 -> Fx_Shadow_L`, with emitter size/alpha and ARE `ShadowOpacity/100` applied. This still does not pass retail pixel projection parity.
47. Source-vs-preview provenance was corrected for placeable light RGB/intensity and campfire flame alpha:
    - implementation surfaces:
      - `frontend/src/modules/layout/adapters/three/workspacePlaceableModelPresentation.ts` now exposes `placeableTwoDaLightRgbVectorSource` / `placeableTwoDaLightRgbVectorProofStatus` separately from `placeableTwoDaLightIntensitySource` / `placeableTwoDaLightIntensityProofStatus`;
      - `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts` includes the RGB-vector provenance in placeable light diagnostics;
      - campfire source-MDL flame particle alpha clamp now reports `campfire-retail-oracle-preview-particles-softened-below-core` and `local-retail-oracle-preview-calibration-not-aurora-source-alpha`, so the local `0.045` softening value is not mislabeled as a decompiled Aurora source alpha;
    - refreshed active campfire proof paths:
      - PNG: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-07\campfire-placeable-light-radius-current.png`;
      - MP4: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-07\campfire-placeable-light-radius-current.mp4`;
      - frame JSON: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-07\campfire-placeable-light-radius-current.frame.json`;
    - refreshed proof facts: `png=20207 bytes`, `mp4=76449 bytes`, `mp4FrameCount=126`, `devObjectPixels=48853`, `devDrawParticles=82`, `devRenderedVertices=912`, `devTextureStatus=applied`, `devCampfireCoreCount=4`, `materialOpacity=0.045`;
    - frame JSON now contains `rgbVectorProof=source-backed-lightcolor-rgb-vector` and `intensityProof=preview-adapter-rgb-max-intensity-no-source-intensity-field`;
    - verification:
      - command: `cd frontend; npx vitest run tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts`;
      - result: 2 files passed, 127 tests passed;
      - command: `cd frontend; npx tsc --noEmit --pretty false`;
      - result: passed;
      - command: `node backend/scripts/create-area-lighting-local-oracle-inputs.mjs`;
      - result: `status=local-web-inputs-ready-retail-oracle-still-required`;
      - command: `node backend/scripts/create-area-lighting-blocked-compare-reports.mjs`;
      - result: `status=blocked-compare-reports-written`, `missingInputs=[]`;
      - command: `node backend/scripts/check-area-lighting-retail-oracle-artifacts.mjs --allow-blocked`;
      - result: `status=blocked`, `blockers=3`, `oracleCases=8`, `oracleCasesPassed=0`, `oracleCasesBlocked=8`, `requiredArtifacts=25`, `presentRequiredArtifacts=25`, `missingRequiredArtifacts=0`, `failedRequiredJsonArtifacts=10`, `currentEvidenceEntries=69`, `currentEvidenceFilesPresent=57`, `currentEvidenceFilesMissing=0`, `currentEvidenceSourceTokens=12`;
    - interpretation: this closes one proof-quality bug. The source-backed Aurora rule is still `lightcolor.2da` RGB plus the recovered `fx_placeable01/AuroraLight01` radius path; Three `intensity` and campfire particle softening are explicitly preview adapters.
48. Active campfire proof was re-captured through direct backend asset URLs after the Vite proxy/auth mismatch:
    - route:
      - `/dev/catalog-vfx-preview?templateId=plc_plc_i06&time=0.32&seed=607&emitterProof=obvious&displayShadows=true&areaShadowOpacity=50&apiBaseUrl=http%3A%2F%2F127.0.0.1%3A3000%2Fapi%2Fv1`;
    - proof paths:
      - PNG: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-07\campfire-placeable-light-provenance-direct-assets-current.png`;
      - MP4: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-07\campfire-placeable-light-provenance-direct-assets-current.mp4`;
      - frame JSON: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-07\campfire-placeable-light-provenance-direct-assets-current.frame.json`;
    - capture metrics: `png=32348 bytes`, `mp4=112626 bytes`, `mp4FrameCount=126`, `devRenderStatus=ready`, `devPlaceableModelStatus=loaded`, `devPlaceableModelTextureStatus=applied`, `devCanvasNonblank=true`, `devObjectPixels=42678`, `devDrawParticles=68`, `devRenderedVertices=756`, `devDrawLanes=source-mdl|Lighten|Normal`;
    - emitter metrics: `devFlameEmitterNode=OmenEmitter250`, `devFlameEmitterParticleCount=12`, `devFlameEmitterBatchVisibleCount=12`, `devFlameEmitterBatchSlotCount=12`, `devCampfireCoreCount=13`;
    - placeable light metrics: `devPlaceableTwoDaLightStatus=active`, `devPlaceableTwoDaLightSourceCount=1`, `devPlaceableTwoDaLightPointLightCount=1`, `devPlaceableTwoDaLightFastShadowCount=1`, `devPlaceableTwoDaLightDisabledCount=0`;
    - source/provenance fields in the frame JSON:
      - `row=6`, `label=PaleYellow`, `color=1.9,1.9,1`, `toolsetColor=0.94,0.94,0.77`;
      - `rgbVectorProof=source-backed-lightcolor-rgb-vector`;
      - `intensityProof=preview-adapter-rgb-max-intensity-no-source-intensity-field`;
      - `distance=5`, `sourceRadius=10`, `sourceUnitScale=0.5`, `radiusProof=source-backed-fx-placeable01-auroralight01-radius-controller`;
      - `lightState=1`, `lightStateProof=retail-binary-backed-nwserver-lightstate-default-on-xref`;
      - `shadowProof=source-backed-retail-shadowsize-selects-fx-shadow-mdl`, `fastShadowModel=fx_shadow_m.mdl`, `fastShadowOpacity=0.3`, `fastShadowAreaFactor=0.5`, `fastShadowOpacityProof=source-backed-area-shadowopacity-factor-fast-shadow-proxy-opacity`;
      - `fastShadowProjectionProof=source-backed-retail-shadowsize-shadow-mdl-textured-quad-active-proxy-shadowvol-stencil-pass-pixel-parity-blocked`;
      - `fastShadowVolumePreviewOpacity=0.096`, `fastShadowVolumePreviewOpacityScale=0.32`, `fastShadowVolumePreviewOpacityProof=preview-adapter-shadowvol-overlay-opacity-scale-retail-pixel-parity-blocked`;
      - `fastShadowVolumeStencilReceiverOpacity=0.078`, `fastShadowVolumeStencilReceiverOpacityScale=0.26`, `fastShadowVolumeStencilReceiverOpacityProof=preview-adapter-shadowvol-stencil-receiver-opacity-scale-retail-pixel-parity-blocked`;
    - network proof: capture network summary contains direct `http://127.0.0.1:3000/api/v1/...` 200/204 responses for `/catalog/placeables/process`, asset contracts, GLB, TGA, and DDS assets. This replaces the earlier proof capture that had model/texture loading degraded by same-origin proxy/auth failures.
    - verification:
      - command: `cd frontend; npx vitest run tests/unit/modules/vfx/dev/CatalogVfxPreviewRunner.test.ts tests/unit/modules/layout/auroraThreeLightFalloff.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/modules/layout/workspaceTerrainMesh.tileLights.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts`;
      - result: 5 files passed, 150 tests passed;
      - command: `cd frontend; npx tsc --noEmit --pretty false`;
      - result: passed;
      - command: `node backend/scripts/create-area-lighting-local-oracle-inputs.mjs`;
      - result: `status=local-web-inputs-ready-retail-oracle-still-required`;
      - command: `node backend/scripts/create-area-lighting-blocked-compare-reports.mjs`;
      - result: `status=blocked-compare-reports-written`, `missingInputs=[]`;
      - command: `node backend/scripts/check-area-lighting-retail-oracle-artifacts.mjs --allow-blocked`;
      - result: `status=blocked`, `blockers=3`, `oracleCases=8`, `oracleCasesPassed=0`, `oracleCasesBlocked=8`, `requiredArtifacts=25`, `presentRequiredArtifacts=25`, `missingRequiredArtifacts=0`, `failedRequiredJsonArtifacts=10`, `currentEvidenceEntries=69`, `currentEvidenceFilesPresent=57`, `currentEvidenceFilesMissing=0`, `currentEvidenceSourceTokens=12`;
    - interpretation: this is the current Aurora Web runtime proof for the campfire placeable. It proves a loaded/textured model, visible source-MDL flame emitter, active placeables.2da point light, and active ShadowSize fast-shadow proxy with corrected source-class labels. It is not retail pixel parity for the shadow footprint, and it is not raw decompilation proof for default `LightState`.
49. Shadow-volume preview/stencil opacity provenance was corrected:
    - implementation surfaces:
      - `frontend/src/modules/layout/adapters/three/workspacePlaceableModelPresentation.ts` now carries explicit `placeableTwoDaFastShadowVolumeProjectionPreviewOpacityScale` / `...OpacitySource` / `...OpacityProofStatus` and `placeableTwoDaFastShadowVolumeStencilReceiverOpacityScale` / `...OpacitySource` / `...OpacityProofStatus`;
      - `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts` includes those fields in the short diagnostic sample string.
    - corrected interpretation:
      - `fastShadowOpacity=alphaStartOrEnd * ARE.ShadowOpacity/100` is the source/resource-backed fast-shadow proxy opacity;
      - `fastShadowVolumePreviewOpacity=fastShadowOpacity * 0.32` and `fastShadowVolumeStencilReceiverOpacity=fastShadowOpacity * 0.26` are Aurora Web local preview calibration values, not recovered Aurora retail opacity rules.
    - verification:
      - command: `cd frontend; npx vitest run tests/unit/modules/vfx/dev/CatalogVfxPreviewRunner.test.ts tests/unit/modules/layout/auroraThreeLightFalloff.test.ts tests/unit/modules/layout/workspaceSceneLightDiagnostics.test.ts tests/unit/modules/layout/workspaceTerrainMesh.tileLights.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts`;
      - result: 5 files passed, 150 tests passed;
      - command: `cd frontend; npx tsc --noEmit --pretty false`;
      - result: passed;
      - command: `node backend/scripts/check-area-lighting-retail-oracle-artifacts.mjs --allow-blocked`;
      - result: `status=blocked`, `blockers=3`, `oracleCases=8`, `oracleCasesPassed=0`, `oracleCasesBlocked=8`, `requiredArtifacts=25`, `presentRequiredArtifacts=25`, `missingRequiredArtifacts=0`, `failedRequiredJsonArtifacts=10`, `currentEvidenceEntries=69`, `currentEvidenceFilesPresent=57`, `currentEvidenceFilesMissing=0`, `currentEvidenceSourceTokens=12`.
50. Candle placeable proof was captured from the live catalog instead of guessed:
    - catalog lookup:
      - query: `GET /api/v1/catalog/placeables?query=candle&limit=20`;
      - selected item: `templateId=plc_plc_cndl01`, `resref=plc_cndl01`, `name=Light: Candle 01`, `subtype=light_source`;
    - proof paths:
      - PNG: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-07\candle-placeable-light-provenance-direct-assets-current.png`;
      - MP4: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-07\candle-placeable-light-provenance-direct-assets-current.mp4`;
      - frame JSON: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-07\candle-placeable-light-provenance-direct-assets-current.frame.json`;
    - capture metrics: `png=47126 bytes`, `mp4=99962 bytes`, `mp4FrameCount=126`, `devRenderStatus=ready`, `devPlaceableModelStatus=loaded`, `devPlaceableModelTextureStatus=applied`, `devObjectPixels=69714`, `devDrawParticles=28`, `devRenderedVertices=312`, `devDrawLanes=source-mdl|Normal|Lighten`;
    - emitter/light metrics: `devModelFileName=plc_cndl01.mdl`, `devFlameEmitterNode=Candleflame`, `devFlameEmitterParticleCount=6`, `devFlameEmitterBatchVisibleCount=5`, `devPlaceableTwoDaLightStatus=active`, `devPlaceableTwoDaLightPointLightCount=1`, `devPlaceableTwoDaLightFastShadowCount=1`;
    - source/provenance fields in the frame JSON:
      - `row=4`, `label=PaleDarkYellow`, `color=0.94,0.94,0.5`, `toolsetColor=0.59,0.56,0.37`;
      - `rgbVectorProof=source-backed-lightcolor-rgb-vector`;
      - `intensityProof=preview-adapter-rgb-max-intensity-no-source-intensity-field`;
      - `radiusProof=source-backed-fx-placeable01-auroralight01-radius-controller`;
      - `shadowProof=source-backed-retail-shadowsize-selects-fx-shadow-mdl`;
      - `fastShadowOpacityProof=source-backed-area-shadowopacity-factor-fast-shadow-proxy-opacity`.
    - interpretation: this proves a second placeable-light example with a different source `LightColor` row and visible source-MDL flame emitter. It is still Aurora Web runtime proof, not retail pixel parity.
51. Torch/free-standing flame placeable proof was captured as an additional live runtime example, with no new color claim:
    - capture route:
      - `/dev/catalog-vfx-preview?templateId=plc_plc_j03&time=0.32&seed=613&emitterProof=obvious&displayShadows=true&areaShadowOpacity=50&apiBaseUrl=http%3A%2F%2F127.0.0.1%3A3000%2Fapi%2Fv1`;
    - proof paths:
      - PNG: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-07\torch-placeable-light-provenance-direct-assets-current.png`;
      - MP4: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-07\torch-placeable-light-provenance-direct-assets-current.mp4`;
      - frame JSON: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-07\torch-placeable-light-provenance-direct-assets-current.frame.json`;
    - capture metrics: `png=49968 bytes`, `mp4=170408 bytes`, `mp4FrameCount=126`, `mp4Fps=30`, `mp4DurationMs=4200`, `devRenderStatus=ready`, `devPlaceableModelStatus=loaded`, `devPlaceableModelTextureStatus=applied`, `devCanvasNonblank=true`, `devObjectPixels=91749`, `devDrawParticles=19`, `devRenderedVertices=216`, `devDrawLanes=source-mdl|Lighten`;
    - emitter/light metrics: `devModelFileName=plc_j03.mdl`, `devFlameEmitterNode=OmenEmitter243`, `devFlameEmitterParticleCount=18`, `devFlameEmitterBatchVisibleCount=18`, `devEmitterCount=4`, `devPlaceableTwoDaLightStatus=active`, `devPlaceableTwoDaLightSourceCount=1`, `devPlaceableTwoDaLightPointLightCount=1`, `devPlaceableTwoDaLightFastShadowCount=1`, `devPlaceableTwoDaLightDisabledCount=0`;
    - source/provenance fields in the frame JSON:
      - `row=6`, `label=PaleYellow`, `color=1.9,1.9,1`, `toolsetColor=0.94,0.94,0.77`;
      - `rgbVectorProof=source-backed-lightcolor-rgb-vector`;
      - `intensityProof=preview-adapter-rgb-max-intensity-no-source-intensity-field`;
      - `distance=5`, `sourceRadius=10`, `sourceUnitScale=0.5`, `radiusProof=source-backed-fx-placeable01-auroralight01-radius-controller`;
      - `lightState=1`, `lightStateProof=retail-binary-backed-nwserver-lightstate-default-on-xref`;
      - `shadowProof=source-backed-retail-shadowsize-selects-fx-shadow-mdl`, `fastShadowModel=fx_shadow_m.mdl`, `fastShadowOpacity=0.3`, `fastShadowAreaFactor=0.5`, `fastShadowOpacityProof=source-backed-area-shadowopacity-factor-fast-shadow-proxy-opacity`;
      - `fastShadowVolumePreviewOpacity=0.096`, `fastShadowVolumePreviewOpacityScale=0.32`, `fastShadowVolumePreviewOpacityProof=preview-adapter-shadowvol-overlay-opacity-scale-retail-pixel-parity-blocked`;
      - `fastShadowVolumeStencilReceiverOpacity=0.078`, `fastShadowVolumeStencilReceiverOpacityScale=0.26`, `fastShadowVolumeStencilReceiverOpacityProof=preview-adapter-shadowvol-stencil-receiver-opacity-scale-retail-pixel-parity-blocked`;
    - capture classification: `canonicalParityPromoted=false`, `localOnlyNotRetailEvidence=true`;
    - interpretation: this proves a third live Aurora Web placeable-light runtime case with a visible source-MDL flame emitter, active placeables.2da point light, and active ShadowSize fast-shadow proxy. It does not prove a third source color, because this capture uses the same `LightColor` row 6 / `PaleYellow` as the campfire.
52. Catalog light-source color coverage was queried with the same dev-auth path used by the capture scripts:
    - endpoint:
      - `POST /api/v1/auth/login` with the dev builder account used by `capture-vfx-app-route-cdp.mjs`;
      - paged `GET /api/v1/catalog/placeables?subtype=light_source&limit=200&offset=N`;
    - observed catalog summary:
      - `totalLightSource=402`;
      - `withLightColor=44`;
      - source-backed `LightColor` row groups:
        - row 1 `DimWhite`, count 1, RGB `0.6,0.6,0.6`, toolset RGB `0.33,0.33,0.33`;
        - row 4 `PaleDarkYellow`, count 19, RGB `0.94,0.94,0.5`, toolset RGB `0.59,0.56,0.37`;
        - row 6 `PaleYellow`, count 12, RGB `1.9,1.9,1`, toolset RGB `0.94,0.94,0.77`;
        - row 19 `Blue`, count 1, RGB `0.8,0.8,1.9`, toolset RGB `0,0.06,0.95`;
        - row 28 `PaleDarkOrange`, count 8, RGB `1,0.75,0.3`, toolset RGB `0.59,0.45,0.26`;
        - row 29 `DarkOrange`, count 3, RGB `1,0.5,0`, toolset RGB `0.42,0.15,0`;
    - interpretation: the catalog itself disproves the "always one white source" failure mode. Some screenshots still show a saturated white sprite core because the source-MDL additive emitter can overbrighten the center; the source light color is carried separately in the placeables.2da `LightColor` lane.
53. Blue placeable-light proof was captured from the live catalog:
    - catalog-selected placeable:
      - `templateId=plc_plc_x0_jar`, `resref=plc_x0_jar`, `name=Soul Jar`, `LightColor row=19 Blue`;
    - proof paths:
      - PNG: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-07\souljar-blue-placeable-light-provenance-direct-assets-current.png`;
      - MP4: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-07\souljar-blue-placeable-light-provenance-direct-assets-current.mp4`;
      - frame JSON: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-07\souljar-blue-placeable-light-provenance-direct-assets-current.frame.json`;
    - capture metrics: `png=57847 bytes`, `mp4=88174 bytes`, `mp4FrameCount=126`, `devRenderStatus=ready`, `devPlaceableModelStatus=loaded`, `devPlaceableModelTextureStatus=applied`, `devCanvasNonblank=true`, `devObjectPixels=137991`, `devDrawParticles=16`, `devRenderedVertices=180`, `devDrawLanes=source-mdl|Lighten`;
    - emitter/light metrics: `devModelFileName=plc_x0_jar.mdl`, `devEmitterCount=3`, `devPlaceableTwoDaLightStatus=active`, `devPlaceableTwoDaLightSourceCount=1`, `devPlaceableTwoDaLightPointLightCount=1`, `devPlaceableTwoDaLightFastShadowCount=1`, `devPlaceableTwoDaLightDisabledCount=0`;
    - source/provenance fields in the frame JSON:
      - `row=19`, `label=Blue`, `color=0.8,0.8,1.9`, `toolsetColor=0,0.06,0.95`, `preview=0.421053,0.421053,1`;
      - `rgbVectorProof=source-backed-lightcolor-rgb-vector`;
      - `intensity=1.9`, `intensityProof=preview-adapter-rgb-max-intensity-no-source-intensity-field`;
      - `radiusProof=source-backed-fx-placeable01-auroralight01-radius-controller`;
      - `shadowProof=source-backed-retail-shadowsize-selects-fx-shadow-mdl`;
      - `fastShadowOpacityProof=source-backed-area-shadowopacity-factor-fast-shadow-proxy-opacity`;
      - `fastShadowVolumePreviewOpacityProof=preview-adapter-shadowvol-overlay-opacity-scale-retail-pixel-parity-blocked`;
      - `fastShadowVolumeStencilReceiverOpacityProof=preview-adapter-shadowvol-stencil-receiver-opacity-scale-retail-pixel-parity-blocked`;
    - capture classification: `canonicalParityPromoted=false`, `localOnlyNotRetailEvidence=true`;
    - interpretation: this is Aurora Web runtime proof for a non-yellow source color. It does not promote retail pixel parity, and the visible center can still saturate because the source-MDL/additive layer is separate from the point-light RGB lane.
54. PaleDarkOrange placeable-light proof was captured from the live catalog:
    - catalog-selected placeable:
      - `templateId=plc_ptm_lantern01`, `resref=ptm_lantern01`, `name=Lantern - Elven (Ambient Light)`, `LightColor row=28 PaleDarkOrange`;
    - proof paths:
      - PNG: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-07\lantern-orange-placeable-light-provenance-direct-assets-current.png`;
      - MP4: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-07\lantern-orange-placeable-light-provenance-direct-assets-current.mp4`;
      - frame JSON: `C:\Projects\aurora-web\backend\docs\aurora-reverse\artifacts\placeable-light-proof-2026-07-07\lantern-orange-placeable-light-provenance-direct-assets-current.frame.json`;
    - capture metrics: `png=47606 bytes`, `mp4=161159 bytes`, `mp4FrameCount=126`, `devRenderStatus=ready`, `devPlaceableModelStatus=loaded`, `devPlaceableModelTextureStatus=applied`, `devCanvasNonblank=true`, `devObjectPixels=74317`, `devDrawParticles=19`, `devRenderedVertices=216`, `devDrawLanes=source-mdl|Lighten`;
    - emitter/light metrics: `devModelFileName=ptm_lantern01.mdl`, `devFlameEmitterNode=flame_lntrn1`, `devFlameEmitterParticleCount=18`, `devFlameEmitterBatchVisibleCount=18`, `devEmitterCount=4`, `devPlaceableTwoDaLightStatus=active`, `devPlaceableTwoDaLightPointLightCount=1`, `devPlaceableTwoDaLightFastShadowCount=1`, `devPlaceableTwoDaLightDisabledCount=0`;
    - source/provenance fields in the frame JSON:
      - `row=28`, `label=PaleDarkOrange`, `color=1,0.75,0.3`, `toolsetColor=0.59,0.45,0.26`, `preview=1,0.75,0.3`;
      - `rgbVectorProof=source-backed-lightcolor-rgb-vector`;
      - `intensity=1`, `intensityProof=preview-adapter-rgb-max-intensity-no-source-intensity-field`;
      - `radiusProof=source-backed-fx-placeable01-auroralight01-radius-controller`;
      - `shadowProof=source-backed-retail-shadowsize-selects-fx-shadow-mdl`;
      - `fastShadowOpacityProof=source-backed-area-shadowopacity-factor-fast-shadow-proxy-opacity`;
      - `fastShadowVolumePreviewOpacityProof=preview-adapter-shadowvol-overlay-opacity-scale-retail-pixel-parity-blocked`;
      - `fastShadowVolumeStencilReceiverOpacityProof=preview-adapter-shadowvol-stencil-receiver-opacity-scale-retail-pixel-parity-blocked`;
    - capture classification: `canonicalParityPromoted=false`, `localOnlyNotRetailEvidence=true`;
    - interpretation: this is Aurora Web runtime proof for a second visibly warm source color beyond the campfire/candle family, with a source-MDL flame emitter and active placeables.2da light lane.
55. Current implementation loop re-check kept source-backed rules strict and rejected one bad local interpretation:
    - attempted follow-up: re-evaluate a renderer/test mismatch around `Lighten` emitters with companion/soft alpha textures while verifying the light/shadow package;
    - corrected result: soft-alpha smoke remains `non-punch-lighten-alpha-test-disabled-source-state1-off` with `alphaTest=0`; this keeps the soft alpha in the blend lane instead of converting it to a hard cutout;
    - reason: the current Aurora Web renderer/test contract treats source-MDL additive flames and soft smoke as separate material lanes. It is not valid to claim a generic `texture-alpha-test-enabled` rule for all `Lighten` companion textures;
    - frontend verification:
      - `cd frontend; npx vitest run tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts -t "uses Aurora companion alpha textures for split smoke particle maps"` -> `1 passed`;
      - `cd frontend; npx vitest run tests/unit/modules/vfx/dev/CatalogVfxPreviewRunner.test.ts tests/unit/modules/layout/PlaceablesModeRightPanel.test.tsx tests/unit/modules/layout/auroraThreeLightFalloff.test.ts tests/unit/modules/layout/workspaceObjectMeshLayer.vfxRenderMode.test.ts` -> `4 passed`, `136 passed`;
      - `cd frontend; npx tsc --noEmit --pretty false` -> passed;
    - backend/gate verification:
      - `cd backend; npm run test:unit -- --runInBand create-area-lighting-blocked-compare-reports.spec.ts create-cross-lane-active-slot-blocker-proof.spec.ts create-progfx-type4-runtime-oracle-blocker-proof.spec.ts check-area-lighting-retail-oracle-artifacts.spec.ts` -> `4 passed`, `18 passed`;
      - `node backend/scripts/check-area-lighting-retail-oracle-artifacts.mjs --allow-blocked` -> `status=blocked`, `blockers=3`, `oracleCases=8`, `oracleCasesPassed=0`, `oracleCasesBlocked=8`, `requiredArtifacts=25`, `presentRequiredArtifacts=25`, `missingRequiredArtifacts=0`, `failedRequiredJsonArtifacts=10`;
    - interpretation: the implementation is now guarded against promoting a false local material rule, and the remaining blocked status is deliberate. It reflects missing retail parity evidence, not missing basic placeable LightColor/LightState/ShadowSize implementation.
56. Cross-lane proof classification was corrected so table/binary-backed light families no longer masquerade as raw decompilation facts:
    - implementation surface:
      - `backend/scripts/create-lightmanager-lane-owner-artifacts.mjs`;
      - `backend/scripts/create-cross-lane-active-slot-blocker-proof.mjs`;
      - `backend/scripts/create-area-lighting-blocked-compare-reports.mjs`;
      - `backend/scripts/check-area-lighting-retail-oracle-artifacts.mjs`;
    - corrected proof statuses:
      - terrain main/source tile lanes remain `source-backed-*` because they have `decompiled_all.c` anchors;
      - placeable light family is now `retail-table-binary-backed-placeable-lightcolor-lightstate-shadowsize-family-owner-order-blocked`;
      - item light family is now `retail-table-backed-itempropertylight-vfx-dur-light-progfx-fx-light-family-owner-order-blocked`;
      - ProgFX Type 4 family is now `retail-table-backed-progfx-type4-table-owner-phase-family-runtime-scheduler-blocked`;
    - `strings.tsv` proof was added as a separate anchor class:
      - `laneOwnerStringTableAnchorScan.proofStatus=decompilation-string-table-anchor-scan-ran`;
      - `placeables-2da-light.sourceAnchorStatus=not-observed-in-source-only-decompilation`;
      - `placeables-2da-light.stringTableAnchorStatus=decompilation-string-table-anchor-observed`;
      - `placeables-2da-light.stringTableAnchors[0]=C:/Projects/New Folder/export/strings.tsv:15789 placeablelight`;
    - cross-lane blocker proof now separates facts by class:
      - `acceptedSourceBackedFacts=[]` for `placeables-2da-light`;
      - `acceptedRetailResourceBackedFacts` contains `placeables.2da LightColor/LightOffset`, `fx_placeable01/AuroraLight01` radius/falloff, and `ShadowSize` -> `Fx_Shadow_*`;
      - `acceptedRetailBinaryBackedFacts` contains the missing-UTP `LightState` default-on binary proof;
    - gate vocabulary was cleaned:
      - non-file evidence rows now use `status=evidence-token`, `kind=non-file-evidence-token`;
      - current summary now reports `currentEvidenceTokens=12` instead of the misleading `currentEvidenceSourceTokens`;
    - regenerated artifacts:
      - `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/lightmanager-lane-owner-callgraph.json`;
      - `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/cross-lane-precedence-compare.json`;
      - `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/cross-lane-active-slot-blocker-proof.json`;
      - `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/area-lighting-retail-oracle-artifact-gate.json`;
    - verification:
      - `cd backend; npm run test:unit -- --runInBand create-lightmanager-lane-owner-artifacts.spec.ts create-cross-lane-active-slot-blocker-proof.spec.ts create-area-lighting-blocked-compare-reports.spec.ts check-area-lighting-retail-oracle-artifacts.spec.ts` -> `4 passed`, `17 passed`;
      - `node --check backend/scripts/create-lightmanager-lane-owner-artifacts.mjs; node --check backend/scripts/create-area-lighting-blocked-compare-reports.mjs; node --check backend/scripts/create-cross-lane-active-slot-blocker-proof.mjs; node --check backend/scripts/check-area-lighting-retail-oracle-artifacts.mjs` -> passed;
      - `node backend/scripts/check-area-lighting-retail-oracle-artifacts.mjs --allow-blocked` -> current filesystem result `status=blocked`, `blockers=3`, `oracleCases=8`, `oracleCasesPassed=0`, `oracleCasesBlocked=8`, `requiredArtifacts=25`, `presentRequiredArtifacts=10`, `missingRequiredArtifacts=15`, `failedRequiredJsonArtifacts=7`, `currentEvidenceTokens=12`;
    - interpretation: this does not close cross-lane retail ordering. It removes a proof-classification error and makes the remaining blocker narrower: direct retail active-slot order or accepted/dropped owner mapping is still missing.
57. Current artifact rebuild corrected two pipeline gaps instead of treating absent files as proof:
    - `backend/scripts/audit-retail-shadow-mdls.ts` was added to parse real retail `fx_shadow_s/m/l.mdl` from KEY/BIF with `parseAuroraMdlVfxSource`;
    - `backend/scripts/create-retail-shadowsize-shadow-mdl-proof-artifact.mjs` now auto-generates the missing source report from retail NWN when possible;
    - recovered `Fx_Shadow_*` emitter metadata from `C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/data/nwn_base.key`:
      - `fx_shadow_s`: node `Small`, `sourceFormat=aurora-mdl-binary`, `sizeStart=1`, `alphaStart=0.6000000238418579`;
      - `fx_shadow_m`: node `Med`, `sourceFormat=aurora-mdl-binary`, `sizeStart=1.600000023841858`, `alphaStart=0.6000000238418579`;
      - `fx_shadow_l`: node `Large`, `sourceFormat=aurora-mdl-binary`, `sizeStart=3`, `alphaStart=0.699999988079071`;
    - `backend/scripts/create-area-lighting-local-oracle-inputs.mjs` now writes a blocked manifest when local PNG/frame inputs are absent instead of crashing or implying materialization;
    - regenerated current artifacts:
      - `backend/docs/aurora-reverse/artifacts/shadowsize-retail-proof-2026-07-02/fx-shadow-mdl-parser-report.json`;
      - `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/retail-shadowsize-shadow-mdl-proof.json`;
      - `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/aurora-web-catalog-campfire-plc-i06-light-shadow-proof-1280x900-diagnostic-2026-07-07.png`;
      - `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/aurora-web-catalog-campfire-plc-i06-light-shadow-proof-1280x900-diagnostic-2026-07-07.frame.json`;
      - `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/aurora-web-shadowvol-campfire.png`;
      - `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/cross-lane-all-light-lanes-runtime-probe-2026-07-07.png`;
      - `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/cross-lane-all-light-lanes-runtime-probe-2026-07-07.frame.json`;
      - `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/aurora-web-cross-lane-all-lanes.frame.json`;
      - `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/progfx-blindvision-row329-cross-lane-runtime-probe-2026-07-03.png`;
      - `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/progfx-blindvision-row329-cross-lane-runtime-probe-2026-07-03.frame.json`;
      - `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/retail-shadowvol-state-trace.json`;
      - `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/area-lighting-retail-runtime-capture-readiness.json`;
      - `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/area-lighting-retail-capture-queue.json`;
      - `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/area-lighting-local-oracle-inputs-manifest.json`;
      - `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/area-lighting-retail-oracle-artifact-gate.json`;
    - current campfire web-side capture metrics: `screenshotBytes=176375`, viewport `1280x900`, `model=plc_i06.mdl`, `texture=applied`, `devDrawParticles=81`, `devCampfireCoreCount=13`, `devPlaceableTwoDaLightStatus=active`, `devPlaceableTwoDaLightPointLightCount=1`, `devPlaceableTwoDaLightFastShadowCount=1`, `localOnlyNotRetailEvidence=true`;
    - current cross-lane web-side capture metrics: `screenshotBytes=85004`, `requiredLaneCoverage=5`, `pointLightSamples=5`, `nonPointRequests=1`, accepted lanes `item-property-light|placeables-2da-light|source-mdl-light-node|terrain-tile-light`, unknown lane `progfx-type4-light-request`, `localOnlyNotRetailEvidence=true`;
    - current BlindVision row 329 local capture metrics: `screenshotBytes=53276`, `fixture=vfx-retail-progfx-type4-blind-vision-owner-phase`, `progFxType4RowId=329`, `label=LightBlindvision`, `animation=Blind_Vision`, `priority=53`, `proximitySuppression=true`, `requestVisionCount=1`, `localOnlyNotRetailEvidence=true`;
    - current shadowvol state compare: `shadowvol-state-order-compare.json.status=blocked-source-state-order-parity-evaluated-pixel-opacity-parity-blocked`, `missingInputs=[]`;
    - current runtime capture readiness: `requiredRuntimeArtifacts=12`, `presentRuntimeArtifacts=0`, `missingRuntimeArtifacts=12`, `runtimeObservedTargets=1`, `runtimeBlockedTargets=11`;
    - current gate result after this rebuild: `status=blocked`, `requiredArtifacts=25`, `presentRequiredArtifacts=10`, `missingRequiredArtifacts=15`, `failedRequiredJsonArtifacts=7`, `currentEvidenceFilesPresent=20`, `currentEvidenceFilesMissing=37`;
    - interpretation: `ShadowSize -> Fx_Shadow_S/M/L` metadata is now backed by retail binary MDL resources, current Aurora Web campfire/cross-lane/BlindVision web-side inputs exist, and the decompilation-backed retail shadowvol state trace exists. Campfire shadow pixel parity still requires `retail-or-toolset-shadowvol-campfire.png`; cross-lane active-slot parity still requires retail slot/capture artifacts; ProgFX runtime policy still requires retail/runtime PNG+JSON oracle artifacts.

## [AURORA WEB STATUS + GATE/COMPARE RESULT] Latest correction pass - retail baseline and current-evidence cleanup

This pass fixed a proof-pipeline gap, not a retail rule:

1. A new no-light retail baseline module was added:
   - utility script: `als_refbase`;
   - module variant: `als_refbase.mod`;
   - capture artifact: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/retail-cross-lane-openpad-smoke.png`;
   - artifact size: `1966511` bytes;
   - capture safety: second-screen/no-focus/no-topmost/no-escape, no global cursor.
2. The oracle driver pipeline now reports:
   - source generator: `optionalUtilityScriptCount=9`;
   - compiler: `compiledUtilityCount=9/9`;
   - module injector: `referenceModuleCount=8`, `referenceModuleReadyCount=8`;
   - fixture verifier: `referenceModuleCount=8`, `usesGlobalCursor=false`, `usesForegroundWindow=false`.
3. The cross-lane oracle scene now uses a spatial lane-marker layout instead of overlapping most lane evidence:
   - tile-main at `(55,75)`;
   - tile-source at `(75,75)`;
   - placeables.2da campfire light at `(55,65)`;
   - MDL/source-light carrier at `(75,65)`;
   - item-property light on the PC at `(65,55)`;
   - ProgFX Type 4 `VFX_DUR_LIGHT_BLUE_5` at `(75,55)` via `ApplyEffectAtLocation`;
   - item-property remains PC-carried because no separate stock creature template has been promoted as a no-guess carrier.
4. The cross-lane ROI owner classifier now has all inputs and uses the spatial layout captures:
   - `cross-lane-retail-maxlight-roi-diagnostics.json.status=retail-maxlight-roi-diagnostics-written-owner-classifier-evaluated-still-blocked`;
   - `generatedCaseCount=8`;
   - `heatmapCount=8`;
   - `missingInputCaseCount=0`;
   - `ownerClassifierEvaluated=true`;
   - `ownerClassifierStrongCandidateCaseCount=6`;
   - all six strong cases currently identify `item-property-light`;
   - `provesPartialOwnerCandidates=true`;
   - `provesAcceptedDroppedOwnerMapping=false`;
   - `provesDirectRendererSlotOrder=false`;
   - `provesCanonicalParity=false`.
5. The current-evidence registry was corrected to current artifact names:
   - gate result: `currentEvidenceEntries=86`, `currentEvidenceFilesPresent=73`, `currentEvidenceFilesMissing=0`, `currentEvidenceTokens=13`;
   - this is a reporting/proof hygiene fix, not a parity promotion.
6. Targeted verification:
   - `npm run test:unit -- --runInBand create-area-lighting-retail-oracle-scene-drivers.spec.ts compile-area-lighting-retail-oracle-scene-drivers.spec.ts inject-area-lighting-retail-oracle-compiled-drivers.spec.ts create-area-lighting-retail-capture-queue.spec.ts area-lighting-evidence.spec.ts check-area-lighting-retail-oracle-artifacts.spec.ts create-cross-lane-retail-maxlight-roi-diagnostics.spec.ts create-cross-lane-active-slot-blocker-proof.spec.ts create-area-lighting-blocked-compare-reports.spec.ts` -> `9 passed`, `28 passed`.

`[GATE/COMPARE RESULT]` Latest gate remains correctly blocked:

- `status=blocked`;
- `requiredArtifacts=25`;
- `presentRequiredArtifacts=25`;
- `missingRequiredArtifacts=0`;
- `failedRequiredJsonArtifacts=11`.

`[IMPLEMENTATION INFERENCE]` The baseline and spatial layout remove the "classifier cannot run / lanes overlap too much" blocker and produce six strong item-property-light candidates. They do not prove final retail cross-lane active-slot ordering. The next valid promotion requires either a direct renderer slot dump or a complete pixel-differential oracle that identifies accepted and dropped lane owners without ambiguity.

## [RETAIL RESOURCE/BINARY FACT + GATE/COMPARE RESULT] Latest correction pass - no-item ablation oracle

This pass adds a retail/NWN ablation, not a guessed Aurora Web rule.

1. A new no-item cross-lane utility scene was added:
   - utility script: `als_xnoitem`;
   - module variant: `als_xnoitem.mod`;
   - scene layout matches the spatial cross-lane all-lanes scene, but omits the item-property-light lane;
   - capture artifacts now cover max-lights `1,2,3,4,5,6,8,32`;
   - example artifacts:
     - `retail-noitem-maxlights-1/retail-cross-lane-no-item-before-budget.png`;
     - `retail-noitem-maxlights-1/retail-cross-lane-no-item-after-budget.png`;
     - same before/after pair for max-lights `2,3,4,5,6,8,32`;
   - no direct active-slot dump exists for this variant, so the active-slot artifact remains a blocker artifact, not parity proof.
   - safety correction: the first dense all-lanes capture attempt produced at least one occluded/non-NWN screenshot, so it was rejected as oracle input; `capture-area-lighting-retail-oracle-window.ps1` and `capture-area-lighting-retail-max-light-variants.mjs` now support `--allowTopMostNoFocus`, which keeps NWN topmost on the second screen without global cursor, global keyboard, or foreground-window automation.
2. The oracle driver pipeline now reports:
   - source generator: `optionalUtilityScriptCount=10`;
   - compiler: `compiledUtilityCount=10/10`;
   - module injector: `referenceModuleCount=9`, `referenceModuleReadyCount=9`;
   - fixture verifier: `referenceModuleCount=9`, `usesGlobalCursor=false`, `usesForegroundWindow=false`, `isolatedRuntimeModule=true`.
3. The cross-lane diagnostics now compare all-lanes captures against the no-item ablation:
   - `ablationComparisonStatus=ablation-roi-diagnostics-written-parity-still-blocked`;
   - `caseCount=23`;
   - `generatedCaseCount=23`;
   - `missingInputCaseCount=0`;
   - `heatmapCount=23`;
   - `budgetSensitiveCaseCount=23`;
   - `ablationComparisonCaseCount=24`;
   - `ablationComparisonGeneratedCaseCount=24`;
   - `ablationProvesPixelEffect=true`;
   - `ownerClassifierStrongCandidateCaseCount=14`;
   - all fourteen strong owner-classifier cases currently identify `item-property-light`;
   - `ownerClassifier.ambiguousCaseCount=9`;
   - `provesAcceptedDroppedOwnerMapping=false`;
   - `provesDirectRendererSlotOrder=false`;
   - `provesCanonicalParity=false`.
4. The strongest no-item ablation after-budget measurements are:
   - max-lights `1`: all-lanes vs no-item `changedSampleRatioGt5=0.46609`, `meanAbsRgbDelta=7.5670`;
   - max-lights `5`: all-lanes vs no-item `changedSampleRatioGt5=0.48812`, `meanAbsRgbDelta=8.8823`;
   - max-lights `32`: all-lanes vs no-item `changedSampleRatioGt5=0.46493`, `meanAbsRgbDelta=7.6933`.
5. The no-item scene's own before/after budget measurements stay small:
   - max-lights `1`: `changedSampleRatioGt5=0.01142`, `meanAbsRgbDelta=1.1390`;
   - max-lights `5`: `changedSampleRatioGt5=0.01142`, `meanAbsRgbDelta=1.1456`;
   - max-lights `32`: `changedSampleRatioGt5=0.01223`, `meanAbsRgbDelta=1.0958`.
6. New no-item heatmaps were materialized:
   - `retail-cross-lane-no-item-ablation-maxlights-1-after-roi-heatmap.png`;
   - `retail-cross-lane-no-item-ablation-maxlights-5-after-roi-heatmap.png`;
   - `retail-cross-lane-no-item-ablation-maxlights-32-after-roi-heatmap.png`;
   - plus before-budget, after-budget, and own-budget heatmaps for every max-light value in `1,2,3,4,5,6,8,32`.
7. The current-evidence registry was refreshed again:
   - gate result: `currentEvidenceEntries=126`, `currentEvidenceFilesPresent=113`, `currentEvidenceFilesMissing=0`, `currentEvidenceTokens=13`;
   - required retail artifacts remain complete: `requiredArtifacts=25`, `presentRequiredArtifacts=25`, `missingRequiredArtifacts=0`.
8. Targeted verification:
   - command: `cd backend; npm run test:unit -- --runInBand create-area-lighting-retail-oracle-scene-drivers.spec.ts compile-area-lighting-retail-oracle-scene-drivers.spec.ts inject-area-lighting-retail-oracle-compiled-drivers.spec.ts create-cross-lane-retail-maxlight-roi-diagnostics.spec.ts create-area-lighting-blocked-compare-reports.spec.ts create-cross-lane-active-slot-blocker-proof.spec.ts area-lighting-evidence.spec.ts check-area-lighting-retail-oracle-artifacts.spec.ts`;
   - result: `8` suites passed, `26` tests passed;
   - after adding every no-item before/after/own-budget heatmap to the current-evidence registry, `cd backend; npm run test:unit -- --runInBand check-area-lighting-retail-oracle-artifacts.spec.ts area-lighting-evidence.spec.ts` -> `2` suites passed, `13` tests passed.
   - after replacing the stale `3-vs-8` current-evidence names with the dense ladder and adding `topmost-no-focus` capture safety, `cd backend; npm run test:unit -- --runInBand check-area-lighting-retail-oracle-artifacts.spec.ts area-lighting-evidence.spec.ts capture-area-lighting-retail-oracle-window-script.spec.ts` -> `3` suites passed, `14` tests passed.

`[IMPLEMENTATION INFERENCE]` The no-item ablation is strong evidence that the visible retail budget signal in the current cross-lane captures is dominated by the item-property-light lane. It still must not be treated as final retail active-light owner ordering because it does not expose direct renderer slots and does not identify every accepted and dropped owner across the lane set.

## [RETAIL RESOURCE/BINARY FACT + GATE/COMPARE RESULT] Latest correction pass - no-ProgFX ablation oracle

This pass adds a second retail/NWN ablation, again without promoting owner ordering.

1. A new no-ProgFX cross-lane utility scene was added:
   - utility script: `als_xnopfx`;
   - module variant: `als_xnopfx.mod`;
   - scene layout matches the spatial cross-lane all-lanes scene, but omits `VFX_DUR_LIGHT_BLUE_5`;
   - `ItemPropertyLight(IP_CONST_LIGHTBRIGHTNESS_BRIGHT, IP_CONST_LIGHTCOLOR_RED)` remains present, so this is specifically a ProgFX ablation, not another no-item test.
2. The oracle driver pipeline now reports:
   - source generator: `optionalUtilityScriptCount=11`;
   - compiler: `compiledUtilityCount=11/11`;
   - module injector: `referenceModuleCount=10`, `referenceModuleReadyCount=10`;
   - fixture verifier: `referenceModuleCount=10`, `usesGlobalCursor=false`, `usesForegroundWindow=false`, `isolatedRuntimeModule=true`.
3. Retail capture was run in `topmost-no-focus` mode:
   - command: `node backend/scripts/capture-area-lighting-retail-max-light-variants.mjs --allowTopMostNoFocus --moduleName als_xnopfx --outputName retail-cross-lane-no-progfx-max-light-variant-observation.json --variantDirPrefix retail-noprogfx-maxlights --beforeArtifact retail-cross-lane-no-progfx-before-budget.png --afterArtifact retail-cross-lane-no-progfx-after-budget.png --activeSlotArtifact retail-cross-lane-no-progfx-active-slots.json --durationSeconds 24 --variants 1,2,3,4,5,6,8,32`;
   - `settingsRestored=true`;
   - all 8 variants captured before/after PNGs;
   - safety fields: `usesGlobalCursor=false`, `usesGlobalKeyboard=false`, `usesForegroundWindow=false`, `usesTopmost=true`, `noFocusTopMostCapture=true`.
4. The no-ProgFX diagnostics were written separately:
   - output: `cross-lane-retail-maxlight-roi-diagnostics-no-progfx.json`;
   - `caseCount=23`, `generatedCaseCount=23`, `missingInputCaseCount=0`;
   - `ablationComparisonCaseCount=24`, `ablationComparisonGeneratedCaseCount=24`;
   - `ablationProvesPixelEffect=true`;
   - `provesAcceptedDroppedOwnerMapping=false`;
   - `provesDirectRendererSlotOrder=false`;
   - `provesCanonicalParity=false`.
5. The no-ProgFX all-lanes-vs-ablation after-budget measurements are much smaller than no-item:
   - max-lights `1`: `changedSampleRatioGt5=0.03457`, `meanAbsRgbDelta=1.6458`;
   - max-lights `5`: `changedSampleRatioGt5=0.06150`, `meanAbsRgbDelta=3.1009`;
   - max-lights `32`: `changedSampleRatioGt5=0.04244`, `meanAbsRgbDelta=2.2837`.
6. The no-ProgFX scene's own before/after budget measurements remain small:
   - max-lights `1`: `changedSampleRatioGt5=0.01100`, `meanAbsRgbDelta=0.7236`;
   - max-lights `5`: `changedSampleRatioGt5=0.01119`, `meanAbsRgbDelta=0.7233`;
   - max-lights `32`: `changedSampleRatioGt5=0.02326`, `meanAbsRgbDelta=0.9006`.
7. The current-evidence registry now tracks no-ProgFX artifacts:
   - gate result: `currentEvidenceEntries=152`, `currentEvidenceFilesPresent=139`, `currentEvidenceFilesMissing=0`, `currentEvidenceTokens=13`;
   - required retail artifacts remain complete: `requiredArtifacts=25`, `presentRequiredArtifacts=25`, `missingRequiredArtifacts=0`.
8. Targeted verification:
   - `cd backend; npm run test:unit -- --runInBand create-area-lighting-retail-oracle-scene-drivers.spec.ts compile-area-lighting-retail-oracle-scene-drivers.spec.ts inject-area-lighting-retail-oracle-compiled-drivers.spec.ts` -> `3` suites passed, `3` tests passed;
   - `cd backend; npm run test:unit -- --runInBand create-area-lighting-retail-oracle-scene-drivers.spec.ts compile-area-lighting-retail-oracle-scene-drivers.spec.ts inject-area-lighting-retail-oracle-compiled-drivers.spec.ts check-area-lighting-retail-oracle-artifacts.spec.ts area-lighting-evidence.spec.ts` -> `5` suites passed, `16` tests passed.

`[IMPLEMENTATION INFERENCE]` The no-ProgFX ablation shows that removing ProgFX does change retail pixels, but far less than removing the item-property-light lane in the current oracle setup. This strengthens the item-lane dominance conclusion and reduces the chance that the current strong classifier hits are actually ProgFX bleed. It still does not prove renderer active-slot order or a complete accepted/dropped owner map.

## [RETAIL RESOURCE/BINARY FACT + GATE/COMPARE RESULT] Latest correction pass - no-placeable LightColor ablation oracle

This pass adds a third retail/NWN ablation focused on the placeables.2da LightColor lane.

1. A new no-placeable LightColor cross-lane utility scene was added:
   - utility script: `als_xnoplc`;
   - module variant: `als_xnoplc.mod`;
   - scene layout matches the spatial cross-lane all-lanes scene, but omits the `plc_campfr` campfire placeables.2da LightColor lane;
   - the MDL source-light carrier `plc_freetorch` remains present, so this is not a blanket "no placeables at all" ablation.
2. The oracle driver pipeline now reports:
   - source generator: `optionalUtilityScriptCount=12`;
   - compiler: `compiledUtilityCount=12/12`;
   - module injector: `referenceModuleCount=11`, `referenceModuleReadyCount=11`;
   - fixture verifier: `referenceModuleCount=11`, `usesGlobalCursor=false`, `usesForegroundWindow=false`, `isolatedRuntimeModule=true`.
3. Retail capture was run in `topmost-no-focus` mode:
   - command: `node backend/scripts/capture-area-lighting-retail-max-light-variants.mjs --allowTopMostNoFocus --moduleName als_xnoplc --outputName retail-cross-lane-no-placeable-max-light-variant-observation.json --variantDirPrefix retail-noplaceable-maxlights --beforeArtifact retail-cross-lane-no-placeable-before-budget.png --afterArtifact retail-cross-lane-no-placeable-after-budget.png --activeSlotArtifact retail-cross-lane-no-placeable-active-slots.json --durationSeconds 24 --variants 1,2,3,4,5,6,8,32`;
   - `settingsRestored=true`;
   - all 8 variants captured before/after PNGs;
   - safety fields: `usesGlobalCursor=false`, `usesGlobalKeyboard=false`, `usesForegroundWindow=false`, `usesTopmost=true`, `noFocusTopMostCapture=true`.
4. The no-placeable diagnostics were written separately:
   - output: `cross-lane-retail-maxlight-roi-diagnostics-no-placeable.json`;
   - `caseCount=23`, `generatedCaseCount=23`, `missingInputCaseCount=0`;
   - `ablationComparisonCaseCount=24`, `ablationComparisonGeneratedCaseCount=24`;
   - `ablationProvesPixelEffect=true`;
   - `provesAcceptedDroppedOwnerMapping=false`;
   - `provesDirectRendererSlotOrder=false`;
   - `provesCanonicalParity=false`.
5. The no-placeable all-lanes-vs-ablation after-budget measurements are also much smaller than no-item:
   - max-lights `1`: `changedSampleRatioGt5=0.03094`, `meanAbsRgbDelta=1.6646`;
   - max-lights `5`: `changedSampleRatioGt5=0.05883`, `meanAbsRgbDelta=3.1245`;
   - max-lights `32`: `changedSampleRatioGt5=0.03322`, `meanAbsRgbDelta=1.8477`.
6. The no-placeable scene's own before/after budget measurements remain small:
   - max-lights `1`: `changedSampleRatioGt5=0.01157`, `meanAbsRgbDelta=0.7765`;
   - max-lights `5`: `changedSampleRatioGt5=0.01196`, `meanAbsRgbDelta=0.9326`;
   - max-lights `32`: `changedSampleRatioGt5=0.01655`, `meanAbsRgbDelta=1.0885`.
7. The current-evidence registry now tracks no-placeable artifacts:
   - gate result: `currentEvidenceEntries=178`, `currentEvidenceFilesPresent=165`, `currentEvidenceFilesMissing=0`, `currentEvidenceTokens=13`;
   - required retail artifacts remain complete: `requiredArtifacts=25`, `presentRequiredArtifacts=25`, `missingRequiredArtifacts=0`.
8. Targeted verification:
   - `cd backend; npm run test:unit -- --runInBand create-area-lighting-retail-oracle-scene-drivers.spec.ts compile-area-lighting-retail-oracle-scene-drivers.spec.ts inject-area-lighting-retail-oracle-compiled-drivers.spec.ts` -> `3` suites passed, `3` tests passed;
   - `cd backend; npm run test:unit -- --runInBand create-area-lighting-retail-oracle-scene-drivers.spec.ts compile-area-lighting-retail-oracle-scene-drivers.spec.ts inject-area-lighting-retail-oracle-compiled-drivers.spec.ts create-cross-lane-retail-maxlight-roi-diagnostics.spec.ts check-area-lighting-retail-oracle-artifacts.spec.ts area-lighting-evidence.spec.ts` -> `6` suites passed, `18` tests passed.

`[IMPLEMENTATION INFERENCE]` The no-placeable LightColor ablation confirms that the campfire/placeables.2da lane has a measurable retail pixel effect in this setup, but its measured all-vs-ablation effect is still far smaller than the no-item ablation. This supports the current interpretation that the dominant budget-sensitive signal is item-property-light, while placeable LightColor remains a real lane that still needs direct accepted/dropped owner proof before retail ordering can be promoted.

## [RETAIL RESOURCE/BINARY FACT + GATE/COMPARE RESULT] Latest correction pass - no-MDL source-light ablation oracle

This pass adds a fourth retail/NWN ablation focused on the model-authored source-light lane.

1. A new no-MDL source-light cross-lane utility scene was added:
   - utility script: `als_xnomdl`;
   - module variant: `als_xnomdl.mod`;
   - scene layout matches the spatial cross-lane all-lanes scene, but omits the `plc_freetorch` MDL source-light carrier;
   - the `plc_campfr` campfire placeables.2da LightColor lane remains present, so this is separate from the no-placeable ablation.
2. The oracle driver pipeline now reports:
   - source generator: `optionalUtilityScriptCount=13`;
   - compiler: `compiledUtilityCount=13/13`;
   - module injector: `referenceModuleCount=12`, `referenceModuleReadyCount=12`;
   - fixture verifier: `referenceModuleCount=12`, `usesGlobalCursor=false`, `usesForegroundWindow=false`, `isolatedRuntimeModule=true`.
3. Retail capture was run in `topmost-no-focus` mode:
   - command: `node backend/scripts/capture-area-lighting-retail-max-light-variants.mjs --allowTopMostNoFocus --moduleName als_xnomdl --outputName retail-cross-lane-no-mdl-max-light-variant-observation.json --variantDirPrefix retail-nomdl-maxlights --beforeArtifact retail-cross-lane-no-mdl-before-budget.png --afterArtifact retail-cross-lane-no-mdl-after-budget.png --activeSlotArtifact retail-cross-lane-no-mdl-active-slots.json --durationSeconds 24 --variants 1,2,3,4,5,6,8,32`;
   - `settingsRestored=true`;
   - all 8 variants captured before/after PNGs;
   - safety fields: `usesGlobalCursor=false`, `usesGlobalKeyboard=false`, `usesForegroundWindow=false`, `usesTopmost=true`, `noFocusTopMostCapture=true`.
4. The no-MDL diagnostics were written separately:
   - output: `cross-lane-retail-maxlight-roi-diagnostics-no-mdl.json`;
   - `caseCount=23`, `generatedCaseCount=23`, `missingInputCaseCount=0`;
   - `ablationComparisonCaseCount=24`, `ablationComparisonGeneratedCaseCount=24`;
   - `ablationProvesPixelEffect=true`;
   - `provesAcceptedDroppedOwnerMapping=false`;
   - `provesDirectRendererSlotOrder=false`;
   - `provesCanonicalParity=false`.
5. The no-MDL all-lanes-vs-ablation after-budget measurements are larger than no-ProgFX/no-placeable, but still far smaller than no-item:
   - max-lights `1`: `changedSampleRatioGt5=0.07079`, `meanAbsRgbDelta=2.2960`;
   - max-lights `5`: `changedSampleRatioGt5=0.11813`, `meanAbsRgbDelta=4.7776`;
   - max-lights `32`: `changedSampleRatioGt5=0.07894`, `meanAbsRgbDelta=2.9711`.
6. The no-MDL scene's own before/after budget measurements remain small:
   - max-lights `1`: `changedSampleRatioGt5=0.01134`, `meanAbsRgbDelta=0.7573`;
   - max-lights `5`: `changedSampleRatioGt5=0.01902`, `meanAbsRgbDelta=0.8680`;
   - max-lights `32`: `changedSampleRatioGt5=0.01103`, `meanAbsRgbDelta=0.7464`.
7. The current-evidence registry now tracks no-MDL artifacts:
   - gate result: `currentEvidenceEntries=204`, `currentEvidenceFilesPresent=191`, `currentEvidenceFilesMissing=0`, `currentEvidenceTokens=13`;
   - required retail artifacts remain complete: `requiredArtifacts=25`, `presentRequiredArtifacts=25`, `missingRequiredArtifacts=0`.
8. Targeted verification:
   - `cd backend; npm run test:unit -- --runInBand create-area-lighting-retail-oracle-scene-drivers.spec.ts compile-area-lighting-retail-oracle-scene-drivers.spec.ts inject-area-lighting-retail-oracle-compiled-drivers.spec.ts` -> `3` suites passed, `3` tests passed;
   - `cd backend; npm run test:unit -- --runInBand create-area-lighting-retail-oracle-scene-drivers.spec.ts compile-area-lighting-retail-oracle-scene-drivers.spec.ts inject-area-lighting-retail-oracle-compiled-drivers.spec.ts create-cross-lane-retail-maxlight-roi-diagnostics.spec.ts check-area-lighting-retail-oracle-artifacts.spec.ts area-lighting-evidence.spec.ts` -> `6` suites passed, `18` tests passed.

`[IMPLEMENTATION INFERENCE]` The no-MDL ablation shows a stronger source-MDL pixel contribution than no-placeable/no-ProgFX in this oracle setup, but it still does not approach the no-item ablation's dominant effect. This adds useful owner-lane separation, but direct active-slot order or a complete accepted/dropped owner map is still required before Aurora Web can claim retail cross-lane ordering.

## [RETAIL RESOURCE/BINARY FACT + GATE/COMPARE RESULT] Latest correction pass - no-tile-main and no-tile-source ablation oracle

This pass adds two more retail/NWN ablations so tile main and tile source are tested as separate lanes instead of being hand-waved together.

1. Two new cross-lane utility scenes were added:
   - no tile main utility script: `als_xnotmain`, module variant: `als_xnotmain.mod`;
   - no tile source utility script: `als_xnotsrc`, module variant: `als_xnotsrc.mod`;
   - both keep campfire `plc_campfr`, MDL `plc_freetorch`, item light, and ProgFX present;
   - `als_xnotmain` omits `SetTileMainLightColor` and keeps `SetTileSourceLightColor`;
   - `als_xnotsrc` keeps `SetTileMainLightColor` and omits `SetTileSourceLightColor`.
2. The oracle driver pipeline now reports:
   - source generator: `optionalUtilityScriptCount=15`;
   - compiler: `compiledUtilityCount=15/15`;
   - module injector: `referenceModuleCount=14`, `referenceModuleReadyCount=14`;
   - fixture verifier: `referenceModuleCount=14`, `usesGlobalCursor=false`, `usesForegroundWindow=false`, `isolatedRuntimeModule=true`.
3. Retail capture was run in `topmost-no-focus` mode for both variants:
   - no tile main command: `node backend/scripts/capture-area-lighting-retail-max-light-variants.mjs --allowTopMostNoFocus --moduleName als_xnotmain --outputName retail-cross-lane-no-tile-main-max-light-variant-observation.json --variantDirPrefix retail-notilemain-maxlights --beforeArtifact retail-cross-lane-no-tile-main-before-budget.png --afterArtifact retail-cross-lane-no-tile-main-after-budget.png --activeSlotArtifact retail-cross-lane-no-tile-main-active-slots.json --durationSeconds 24 --variants 1,2,3,4,5,6,8,32`;
   - no tile source command: `node backend/scripts/capture-area-lighting-retail-max-light-variants.mjs --allowTopMostNoFocus --moduleName als_xnotsrc --outputName retail-cross-lane-no-tile-source-max-light-variant-observation.json --variantDirPrefix retail-notilesource-maxlights --beforeArtifact retail-cross-lane-no-tile-source-before-budget.png --afterArtifact retail-cross-lane-no-tile-source-after-budget.png --activeSlotArtifact retail-cross-lane-no-tile-source-active-slots.json --durationSeconds 24 --variants 1,2,3,4,5,6,8,32`;
   - both observations have `settingsRestored=true`;
   - all 8 variants captured before/after PNGs: `1,2,3,4,5,6,8,32`;
   - safety mode stayed non-invasive: `usesGlobalCursor=false`, `usesGlobalKeyboard=false`, `usesForegroundWindow=false`, `usesTopmost=true`, `noFocusTopMostCapture=true`.
4. The tile diagnostics were written separately:
   - no tile main output: `cross-lane-retail-maxlight-roi-diagnostics-no-tile-main.json`;
   - no tile source output: `cross-lane-retail-maxlight-roi-diagnostics-no-tile-source.json`;
   - both report `ablationComparisonCaseCount=24`, `ablationComparisonGeneratedCaseCount=24`, `missingInputCaseCount=0`;
   - both report `provesAblationPixelEffect=true`;
   - both still report `provesAcceptedDroppedOwnerMapping=false`, `provesDirectRendererSlotOrder=false`, `provesCanonicalParity=false`.
5. The no-tile-main all-lanes-vs-ablation after-budget measurements prove a real but smaller lane effect:
   - max-lights `1`: `changedSampleRatioGt5=0.04267`, `meanAbsRgbDelta=2.2965`;
   - max-lights `5`: `changedSampleRatioGt5=0.06107`, `meanAbsRgbDelta=3.1098`;
   - max-lights `32`: `changedSampleRatioGt5=0.03754`, `meanAbsRgbDelta=1.8659`.
6. The no-tile-source all-lanes-vs-ablation after-budget measurements also prove a real lane effect:
   - max-lights `1`: `changedSampleRatioGt5=0.04302`, `meanAbsRgbDelta=2.3141`;
   - max-lights `5`: `changedSampleRatioGt5=0.06092`, `meanAbsRgbDelta=3.1028`;
   - max-lights `32`: `changedSampleRatioGt5=0.04213`, `meanAbsRgbDelta=2.2947`.
7. The current-evidence registry now tracks both tile ablation families:
   - gate result: `currentEvidenceEntries=256`, `currentEvidenceFilesPresent=243`, `currentEvidenceFilesMissing=0`, `currentEvidenceTokens=13`;
   - required retail artifacts remain complete: `requiredArtifacts=25`, `presentRequiredArtifacts=25`, `missingRequiredArtifacts=0`;
   - generated heatmaps now include `48` additional tile ablation ROI PNGs plus `2` diagnostic JSONs and `2` observation JSONs.
8. Targeted verification:
   - `cd backend; npm run test:unit -- --runInBand create-area-lighting-retail-oracle-scene-drivers.spec.ts compile-area-lighting-retail-oracle-scene-drivers.spec.ts inject-area-lighting-retail-oracle-compiled-drivers.spec.ts create-cross-lane-retail-maxlight-roi-diagnostics.spec.ts check-area-lighting-retail-oracle-artifacts.spec.ts area-lighting-evidence.spec.ts` -> `6` suites passed, `18` tests passed.

`[IMPLEMENTATION INFERENCE]` The ablation matrix now covers item-property, ProgFX, placeables.2da LightColor, MDL source-light, tile main, and tile source as separate tested lanes. This materially reduces guessing around which lanes have retail pixel influence. It still does not prove the exact accepted/dropped slot order, so Aurora Web must keep the retail-ordering promotion blocked.

## [GATE/COMPARE RESULT + IMPLEMENTATION INFERENCE] Latest correction pass - ablation lane-effect matrix in the active-slot blocker

This pass makes the new lane-ablation proof machine-readable in the active-slot blocker artifact.

1. `cross-lane-active-slot-blocker-proof.json` now includes `retailAblationLaneEffectMatrix`.
2. The matrix covers six separate lane families:
   - `item-property-light` via `no-item`;
   - `progfx-type4-light-or-vision` via `no-progfx`;
   - `placeables-2da-light` via `no-placeable`;
   - `mdl-source-light-node` via `no-mdl`;
   - `terrain-tile-main-light` via `no-tile-main`;
   - `terrain-tile-source-light` via `no-tile-source`.
3. Real regenerated artifact result:
   - `retailAblationLaneEffectMatrix.status=retail-ablation-lane-effect-matrix-complete-parity-still-blocked`;
   - `requiredLaneCount=6`;
   - `presentDiagnosticCount=6`;
   - `lanesWithPixelEffectCount=6`;
   - `provesAllRequiredLanePixelEffects=true`;
   - `missingDiagnostics=[]`;
   - `incompleteMaxLightCoverage=[]`;
   - each lane has complete max-light coverage for `1,2,3,4,5,6,8,32`.
4. The same proof still refuses to promote retail ordering:
   - `provesDirectRetailActiveSlotDump=false`;
   - `provesDirectRendererSlotOrder=false`;
   - `provesAcceptedDroppedOwnerMapping=false`;
   - `permitsRetailOrderingPromotion=false`;
   - `provesCanonicalParity=false`.
5. Targeted verification:
   - `node --check backend/scripts/create-cross-lane-active-slot-blocker-proof.mjs` -> passed;
   - `cd backend; npm run test:unit -- --runInBand create-cross-lane-active-slot-blocker-proof.spec.ts` -> `1` suite passed, `1` test passed;
   - `cd backend; npm run test:unit -- --runInBand create-area-lighting-retail-oracle-scene-drivers.spec.ts compile-area-lighting-retail-oracle-scene-drivers.spec.ts inject-area-lighting-retail-oracle-compiled-drivers.spec.ts create-cross-lane-retail-maxlight-roi-diagnostics.spec.ts create-cross-lane-active-slot-blocker-proof.spec.ts check-area-lighting-retail-oracle-artifacts.spec.ts area-lighting-evidence.spec.ts` -> `7` suites passed, `19` tests passed.

`[IMPLEMENTATION INFERENCE]` This closes the "which lane families have measured retail pixel influence?" proof gap for the current cross-lane setup. It deliberately does not close the stricter "which exact lane owner occupied or lost each retail active slot?" proof gap.

## [GATE/COMPARE RESULT + IMPLEMENTATION INFERENCE] Remaining implementation/proof gaps

In this section, `Status` lines are gate/compare output. `What remains` lines are implementation inference and should not be read as recovered Aurora behavior.

### 1. Campfire shadow-volume pixel parity

`[GATE/COMPARE RESULT]` Status:

- `shadowvol-campfire-pixel-compare.json.status=blocked-shadowvol-pixel-tolerance-evaluated-failed`
- `missingInputs=[]`
- Retail input exists as `retail-or-toolset-shadowvol-campfire.png`.
- Aurora Web input exists as `aurora-web-shadowvol-campfire.png`, materialized from `aurora-web-catalog-campfire-plc-i06-light-shadow-proof-1280x900-diagnostic-2026-07-07.png`.
- Diff artifact exists as `shadowvol-campfire-retail-web-diff-normalized.png`.
- Current blocker: the translation/uniform-scale ROI calibration attempt is not an accepted same-camera/ROI transform, so parity is not promoted.

`[IMPLEMENTATION INFERENCE]` What remains:

1. Capture Aurora Web campfire from the same full viewport/camera as retail, or provide a calibrated ROI transform.
2. Re-run `create-area-lighting-pixel-diff-artifacts.mjs`.
3. Re-run `create-area-lighting-blocked-compare-reports.mjs`.
4. Only then decide whether shadow footprint, receiver alignment, and opacity pass tolerance.

`[AURORA WEB STATUS + GATE/COMPARE RESULT]` Implementation note: the local shadow-volume implementation is present enough to test, but pixel parity is not proven and must not be promoted.

### 2. Shadow-volume inherited render-state and opacity parity

`[GATE/COMPARE RESULT]` Status:

- `shadowvol-state-order-compare.json.status=blocked-source-state-order-parity-evaluated-pixel-opacity-parity-blocked`
- `missingInputs=[]`
- blocker: source-backed state-order signals agree between the retail trace and Aurora Web trace, but full retail parity is not promoted until pixel, opacity, and inherited render-state tolerance checks pass.

`[IMPLEMENTATION INFERENCE]` What remains:

1. Verify the wrapped/inherited render state around `FUN_00a878f8 -> FUN_00a78128 -> FUN_00a75e3c`, especially color/depth mask and blend/depth state that is not directly visible in the local source-state compare.
2. Tie `ARE.ShadowOpacity` to the final retail shadow opacity in an accepted pixel/ROI capture.
3. Promote only after the state order and the same-viewport pixel compare agree.

### 3. Retail cross-lane active-light owner ordering

`[GATE/COMPARE RESULT]` Status:

- `cross-lane-precedence-compare.json.status=blocked-retail-active-slot-order-classifier-partial-direct-order-missing`
- `missingInputs=[]`
- current Aurora Web cross-lane frame exists as `aurora-web-cross-lane-all-lanes.frame.json`, materialized from `cross-lane-all-light-lanes-runtime-probe-2026-07-07.frame.json`.
- retail before/after budget captures exist as `retail-cross-lane-all-lanes-before-budget.png` and `retail-cross-lane-all-lanes-after-budget.png`.
- `retail-cross-lane-active-slots.json.status=blocked-no-direct-retail-active-slot-dump`.
- `cross-lane-retail-maxlight-roi-diagnostics.json` now evaluates the owner classifier with the open-pad baseline and six isolated references.
- current local probe has `localSampleCount=6`, and retail pixel/reference artifacts are present, but direct slot order remains absent.
- `ownerPathsStillBlocked=true`
- `directRetailSlotDumpAvailable=false`
- `directRendererSlotOrderObserved=false`

LightManager artifact status:

- `lightmanager-lane-owner-callgraph.json.status=blocked-common-lane-owner-precedence-not-recovered`
- source families are recovered for 6/6 lanes:
  - terrain tile main light;
  - terrain tile source light;
  - placeables.2da light;
  - MDL source light node;
  - item-property light;
  - ProgFX Type 4 light/vision.
- direct requested LightManager Add/Prioritize/Remove/Update xrefs are still not recovered.
- indirect vtable candidate count remains large/noisy (`8626`) and is not receiver/owner data-flow proof.

`[IMPLEMENTATION INFERENCE]` What remains:

1. Do not promote the partial classifier output as retail order.
2. Resolve the remaining ambiguous default case or recover a direct retail slot dump / receiver owner data-flow.
3. Only after a complete accepted/dropped owner map or direct slot order exists, wire actual cross-lane precedence into the runtime budget beyond the current score/cap preview.

### 4. LightManager preview score is not full retail owner precedence

`[GATE/COMPARE RESULT]` Status:

- score formula/cap/sort are source-backed;
- `AURORA_LIGHT_MANAGER_PREVIEW_BUDGET_STRATEGY` is implemented;
- gate still blocks owner precedence.

`[IMPLEMENTATION INFERENCE]` What remains:

1. Separate "score sorting inside the LightManager" from "which owner lane entered first or gets reserved/special slots".
2. If the classifier proves accepted/dropped lane owners, map that into `workspaceSceneLightDiagnostics.ts` and the runtime budget rather than relying only on preview score fallback.

### 5. ProgFX Type 4 priority / tie / zero policy

`[GATE/COMPARE RESULT]` Status:

- Current status after rebuild:
  - `progfx-type4-runtime-oracle-blocker-proof.json.status=blocked-progfx-type4-runtime-oracles-present-policy-parity-incomplete`;
  - `retail-progfx-priority-policy.json.status=blocked-retail-runtime-priority-captures-present-scheduler-verdict-missing`;
  - `retail-progfx-priority-policy-before.png`, `retail-progfx-priority-policy-after.png`, and `retail-progfx-priority-policy.json` are present;
  - the retail pixel/table/script evidence is present, but tie/zero policy is not promoted as a general scheduler rule.
- retail Type 4 table audit reports `type4RowCount=68`, `type4OwnerPhaseCount=77`.
- stock retail has no normal stock Param4=0 row for Type 4; custom-zero capture is custom override evidence only.

`[IMPLEMENTATION INFERENCE]` What remains:

1. Keep the equal-priority yellow-over-blue observation as a tie candidate only until direct scheduler data-flow or a deliberately isolated tie oracle proves the general policy.
2. Keep Param4=0 custom override out of stock retail parity claims.
3. Implement the scheduler only where policy is proven:
   - single-request preview can stay active;
   - multi-request winner selection must stay blocked/metadata-only until the tie candidate is promoted by direct scheduler data-flow or an isolated tie oracle.

### 6. ProgFX Type 4 proximity suppression threshold

`[GATE/COMPARE RESULT]` Status:

- `retail-progfx-proximity-distance-sweep.json` and `retail-progfx-proximity-distance-sweep-contact-sheet.png` are present.
- `retail-progfx-proximity-distance-sweep.json.status=blocked-retail-runtime-proximity-captures-present-threshold-analysis-missing`.
- `progfx-type4-runtime-oracle-blocker-proof.json.status=blocked-progfx-type4-runtime-oracles-present-policy-parity-incomplete`.
- Exact threshold and participating source lane are not proven.

`[IMPLEMENTATION INFERENCE]` What remains:

1. Recover or observe the exact distance threshold.
2. Identify whether suppression applies per owner, per scene light, per source family, or per active candidate list.
3. Implement only after the threshold and owner scope are known.

### 7. ProgFX Type 4 attach-to-scene / restore

`[GATE/COMPARE RESULT]` Status:

- `retail-progfx-attach-scene-before.png`, `retail-progfx-attach-scene-active.png`, `retail-progfx-attach-scene-after-remove.png`, and `retail-progfx-attach-scene-restore.json` are present.
- `retail-progfx-attach-scene-restore.json.status=blocked-retail-runtime-attach-captures-present-restore-analysis-missing`.
- `progfx-type4-runtime-oracle-blocker-proof.json.status=blocked-progfx-type4-runtime-oracles-present-policy-parity-incomplete`.
- Selected ROIs still do not prove scene-light removal/restore, so Param6 behavior is blocked.

`[IMPLEMENTATION INFERENCE]` What remains:

1. Build a stronger oracle or recover scheduler data-flow for Param6.
2. Prove when/if scene lights are removed while Type 4 is active.
3. Prove restoration timing after effect removal.
4. Only then implement suppression/restore behavior in Aurora Web.

### 8. ProgFX Type 4 BlindVision / vision parity

`[GATE/COMPARE RESULT]` Status:

- `retail-progfx-blindvision-pixel-compare.json.status=blocked-retail-blindvision-pixel-mutation-not-detected`
- `missingInputs=[]`
- Retail before/active inputs exist as `retail-progfx-blindvision-before.png` and `retail-progfx-blindvision-active.png`.
- Current local row 329 input exists as `progfx-blindvision-row329-cross-lane-runtime-probe-2026-07-03.frame.json`.
- Current blocker: retail pixels mutate, but local-vs-retail viewport/ROI tolerance still does not pass.

`[IMPLEMENTATION INFERENCE]` What remains:

1. Produce same-viewport/ROI local-vs-retail BlindVision captures.
2. Separate visual pixel mutation from light manager owner ordering.
3. Implement the viewport/vision mutation only after tolerance passes or the underlying data-flow is recovered.

### 9. Non-item Type 4 shadows

`[GATE/COMPARE RESULT]` Status:

- retail table audit reports non-item Type 4 shadow-casting rows are absent:
  - `nonItemCastShadowRows=[]`;
  - `nonItemCastShadowOwnerPhaseCount=0`.

`[IMPLEMENTATION INFERENCE]` What remains:

1. Keep non-item Type 4 shadows disabled/absent unless a custom module proves otherwise.
2. Do not add "helpful" shadows to non-item Type 4 previews.
3. Item-light shadows can follow Param3, but shadow-volume projection parity remains tied to the general shadow-volume gate.

### 10. Placeable LightState default proof source class

`[AURORA DECOMPILATION FACT]` Status:

- Current `C:\Projects\New Folder` export search finds no `LightState` field/string anchor in `export/decompiled_all.c` or `export/strings.tsv`.
- The confirmed decompiled/export anchors in this slice are `placeablelight` and `propagateillumination`, not a recovered placeable `LightState` default assignment.

`[RETAIL RESOURCE/BINARY FACT]` Status:

- `audit-lightstate-default-retail-binary.mjs` finds the `nwserver.exe` `LightState` string xref and the `mov [rbx+0x368],1` default-before-read pattern.
- The proof status was corrected from `source-backed-nwserver-lightstate-default-on-retail-binary-xref` to `retail-binary-backed-nwserver-lightstate-default-on-xref`.
- `nwscript.nss` still provides the runtime illumination toggle/recompute contract via `SetPlaceableIllumination`, `GetPlaceableIllumination`, and `RecomputeStaticLighting`.

`[AURORA WEB STATUS]` Status:

- Aurora Web still defaults missing placeable `LightState` to `1` and still lets `LightState=0` disable the placeables.2da light/fast-shadow lane.
- The implementation now labels this as retail-binary backed, not raw decompilation backed.

`[IMPLEMENTATION INFERENCE]` What remains:

1. Do not close the original "decompilational confirmation of default LightState" request until a real decompiled-Aurora field/default anchor is recovered.
2. Keep the current default-on behavior because it is backed by retail binary/resource evidence, but report it with the corrected source class.

## [IMPLEMENTATION INFERENCE] Prioritized next work

1. **Complete cross-lane owner proof.**
   - Current state: evaluator exists, the dense `1,2,3,4,5,6,8,32` retail max-light ladder is captured in `topmost-no-focus` mode, and the owner classifier produced `14` strong item-property-light candidate cases.
   - The active-slot blocker now has a complete `retailAblationLaneEffectMatrix`: all 6 required lane families have complete `1,2,3,4,5,6,8,32` max-light coverage and measured pixel effect.
   - The no-item ablation strongly proves an item-property pixel effect across all 8 max-light values; no-ProgFX, no-placeable LightColor, no-MDL source-light, no-tile-main, and no-tile-source ablations prove smaller but real effects and support that current strong hits are item-dominated while the other lanes remain real.
   - `9` owner-classifier cases remain weak/ambiguous and no direct slot order exists.
   - Output should either resolve the ambiguous owner map or recover a direct retail slot dump / receiver data-flow.
2. **Same-viewport campfire shadow compare.**
   - Why second: the implementation exists and the current image pair now has matching `1280x900` pixel dimensions, but it still cannot pass because it is not the same retail camera/viewport and has no calibrated ROI.
   - Output should provide the same retail camera/viewport or an explicit calibrated ROI transform.
3. **ProgFX Type 4 scheduler isolation.**
   - Why third: tie is now a pixel/table/script candidate, but full scheduler semantics still touch priority, proximity, attach/restore, and vision.
   - Keep multi-request local preview blocked until the tie candidate, proximity threshold, attach/restore behavior, and vision parity are proven.
4. **Inherited shadow-volume state/opacity parity.**
   - Why fourth: source order is already green, but full parity requires the calibrated pixel path.

## Corrected bottom line

The raw decompiled-Aurora facts in this document are only the anchors tagged `[AURORA DECOMPILATION FACT]`. Retail/resource facts are tagged separately. Aurora Web has implementation surfaces for ARE/tile fields, placeable LightColor/LightOffset/LightState/ShadowSize, source-MDL lights, item-property lights, single ProgFX Type 4 light preview, and a LightManager score/cap preview, but those are `[AURORA WEB STATUS]` claims, not raw decompilation claims.

The remaining work is not "add basic lights". The remaining work is exact parity:

- calibrated campfire shadow-volume footprint/opacity;
- direct or classifier-grade retail cross-lane active-light owner ordering;
- full ProgFX Type 4 runtime scheduler semantics;
- safe promotion rules that do not turn local previews into canonical retail claims.
