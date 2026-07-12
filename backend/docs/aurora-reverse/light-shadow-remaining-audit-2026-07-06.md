# Light/shadow remaining audit - 2026-07-06

Reference evidence: `C:\Projects\New Folder`.
Editable repo: `C:\Projects\aurora-web`.

## Current gate status

Command:

```powershell
cd C:\Projects\aurora-web\backend
node scripts\check-area-lighting-retail-oracle-artifacts.mjs --allow-blocked
```

Result:

- `status=blocked`
- `blockers=3`
- `oracleCases=8`
- `oracleCasesPassed=0`
- `oracleCasesBlocked=8`
- `requiredArtifacts=25`
- `presentRequiredArtifacts=25`
- `missingRequiredArtifacts=0`
- `failedRequiredJsonArtifacts=10`
- `requiredJsonWithoutExplicitVerdict=0`
- `currentEvidenceEntries=51`
- `currentEvidenceFilesPresent=39`
- `currentEvidenceFilesMissing=0`
- `currentEvidenceSourceTokens=12`

## Runtime capture update - 2026-07-06

Captured through `scripts/capture-area-lighting-retail-oracle-window.ps1` with NWN moved to the non-primary second monitor:

- monitor: `\\.\DISPLAY1`
- `primary=false`
- window rect: `x=-1600`, `y=66`, `width=1280`, `height=900`
- captured runtime PNG/cue count: `14`
- client log contains no `ALS_BLOCKED`
- driver cue includes `ALS_OBSERVE cross-lane lane-map: tile-main=blue/red tile-source=pale-yellow/pale-green placeable=plc_campfr mdl=plc_freetorch item=bright-red progfx=VFX_DUR_LIGHT_BLUE_5`

Follow-up correction after the staging audit: do not rerun the window capture helper as-is for this thread. It can focus/topmost the retail window, so the safe path is the disposable module/location flow below and only passive/offline checks unless a later capture flow is redesigned.

Follow-up correction after the user reported mouse/focus takeover risk: the latest pass did not launch NWN or Toolset and did not use any global input automation. Work continued through offline module generation, source/decompilation audit, artifact generation, and unit tests only.

Follow-up hardening: `capture-area-lighting-retail-oracle-window.ps1` now supports `-NoFocus`, `-NoTopMost`, and `-NoEscape`, and reports `safety.safeNoFocusMode`. `capture-area-lighting-retail-max-light-variants.mjs` now defaults to that safe no-focus/no-topmost/no-keyboard capture path; the older focus/topmost/ESC behavior is opt-in via `--allowFocusCapture`.

Runtime artifact readiness is now:

- `status=ready-all-runtime-artifacts-present`
- `requiredRuntimeArtifacts=12`
- `presentRuntimeArtifacts=12`
- `missingRuntimeArtifacts=0`
- Runtime oracle pack proof: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/area-lighting-retail-runtime-oracle-pack-proof.json`
  - `status=runtime-oracle-pack-present-readable-parity-still-blocked`
  - `requiredRuntimeArtifactCount=12`
  - `presentRuntimeArtifactCount=12`
  - `readableRuntimeArtifactCount=12`
  - `missingRuntimeArtifactCount=0`
  - `invalidRuntimeArtifactCount=0`
  - `pngArtifactCount=11`
  - `jsonArtifactCount=1`
  - `proofScope.provesRequiredRuntimeArtifactsPresent=true`
  - `proofScope.provesPngsAreReadable=true`
  - `proofScope.provesStructuredActiveSlotJsonReadable=true`
  - `proofScope.provesDirectRetailActiveSlotDump=false`
  - `proofScope.provesRetailPixelParity=false`
  - `canonicalParityPromoted=false`

Capture queue is now:

- `status=complete-required-runtime-artifacts-reference-captures-missing`
- `queueItemCount=0`
- `missingArtifactCount=0`
- `classifierReferenceQueueItemCount=6`
- `missingClassifierReferenceArtifactCount=6`
- `customProgFxZeroQueueItemCount=2`
- `missingCustomProgFxZeroArtifactCount=2`
- `customProgFxZeroOverridePackPrepared=true`

Those six remaining reference captures are isolated lane-classifier calibration shots, not required runtime artifacts. The two custom ProgFX zero captures are also optional and explicitly use a prepared custom override because stock retail `progfx.2da` has no Type 4 `Param4=0` row. Each queued item targets the disposable `als_light_lab` area and carries the safe capture contract:

- capture flags: `-NoFocus`, `-NoTopMost`, `-NoEscape`
- `usesGlobalCursor=false`
- `usesGlobalKeyboard=false`
- `usesForegroundWindow=false`
- `usesTopmost=false`
- `launchesRetailProcess=false`
- `requiresExistingRuntime=true`
- `manualScriptInputRequired=false`
- generated per-lane module files: `als_light_shadow_ref_tmain.mod`, `als_light_shadow_ref_tsrc.mod`, `als_light_shadow_ref_plc.mod`, `als_light_shadow_ref_mdl.mod`, `als_light_shadow_ref_item.mod`, `als_light_shadow_ref_pfx.mod`
- generated custom-zero module file: `als_light_shadow_pfxzero.mod`; `stockRetailRowPresent=false`, `customOverrideRequired=true`, `customOverridePackPrepared=true`, and it must not be promoted as stock retail parity
- custom override manifest: `backend/docs/aurora-reverse/artifacts/light-shadow-retail-oracle-drivers/custom-progfx-param4-zero-override/custom-progfx-param4-zero-override-manifest.json`
- custom override `visualeffects.2da` SHA-256: `68a02c854236d099dc9e3f2888372ccf5885882ed143a79ce36579cf6215cc3e`
- custom override `progfx.2da` SHA-256: `42dc0b8901f082b20a7443b9ebe8d7f1e3bda5abc4b0f8b3f2bde878b578dab2`

The structured active-slot artifact exists at `retail-cross-lane-active-slots.json`, but it is intentionally blocking:

- `status=blocked-no-direct-retail-active-slot-dump`
- `directRetailSlotDumpAvailable=false`
- `directRendererSlotOrderObserved=false`
- `runtimePixelEvidencePresent=true`
- `runtimeLogCuePresent=true`
- `runtimeLogCueSource=durable-maxlight-observation-active-slot-cue`
- current live `nwclientLog1.txt` has rotated past the cross-lane cue (`liveLogStatus=cross-lane-cues-missing`), so the durable cue now comes from `retail-cross-lane-max-light-variant-observation.json`
- `durableCaptureCueStatus=cross-lane-active-slot-cues-present-in-maxlight-observation`
- `durableCaptureCueCount=2`
- `acceptedSlots=[]`
- `droppedSlots=[]`
- `canonicalParityPromoted=false`

This is not a parity claim. It records the retail screenshots and log cues without inventing renderer slot order.

Offline cross-lane ROI diagnostics were generated after the no-focus correction:

- Generator: `backend/scripts/create-cross-lane-retail-maxlight-roi-diagnostics.mjs`
- Manifest: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/cross-lane-retail-maxlight-roi-diagnostics.json`
- `status=retail-maxlight-roi-diagnostics-written-owner-classifier-still-blocked`
- `launchesRetailProcess=false`
- `usesGlobalCursor=false`
- `caseCount=5`
- `generatedCaseCount=5`
- `heatmapCount=5`
- `budgetSensitiveCaseCount=5`
- `provesBudgetSensitiveRetailPixels=true`
- `provesAcceptedDroppedOwnerMapping=false`
- `provesDirectRendererSlotOrder=false`
- `canonicalParityPromoted=false`

## Disposable oracle location - 2026-07-06

The oracle module now uses its own cloned test area instead of running directly in the source lab area:

- Disposable module: `C:\Users\enonw\Documents\Neverwinter Nights\modules\als_light_shadow_oracle_lab.mod`
- Base/source area only: `enon_test_effect`
- Runtime oracle area: `als_light_lab`
- Cloned resources: `ARE/GIT/GIC`
- `als_light_lab.OnEnter=als_autorun`
- `Mod_Entry_Area=als_light_lab`
- Module start: `x=9.5`, `y=3.799999952316284`, `z=0`, `dirX=0`, `dirY=1`
- Base area preserved: `sourceBaseAreaPreserved=true`
- Output module SHA-256 after optional lane-reference and custom-zero utility injection: `1252a923398035e82e960385732d5493413dfbdc7676f4b648453ee03f2f6f17`
- Compiled required drivers: `6/6`
- Compiled utility scripts: `8/8`
- Required runtime artifacts remain `12`; optional lane-reference and custom-zero utilities do not add new required gate inputs.
- No-input fixture proof: `backend/docs/aurora-reverse/artifacts/light-shadow-retail-oracle-drivers/oracle-module-fixture-no-input-proof.json`
  - `status=fixture-ready-runtime-capture-required`
  - `ownLocationResref=als_light_lab`
  - `referenceModuleCount=7`
  - `usesGlobalCursor=false`
  - `usesGlobalKeyboard=false`
  - `usesForegroundWindow=false`
  - `usesTopmost=false`
  - `launchesRetailProcess=false`
  - `canonicalParityPromoted=false`
- Verification: `npm.cmd run test:unit -- --runTestsByPath test/unit/create-area-lighting-retail-oracle-scene-drivers.spec.ts test/unit/create-area-lighting-retail-capture-queue.spec.ts test/unit/compile-area-lighting-retail-oracle-scene-drivers.spec.ts test/unit/inject-area-lighting-retail-oracle-compiled-drivers.spec.ts` passed with `4` suites and `5` tests; real compile and injection reported `compiledOutputCount=6`, `compiledUtilityCount=8`, `missingCompiledOutputCount=0`, `missingUtilityScriptCount=0`, `referenceModuleCount=7`, `referenceModuleReadyCount=7`.
- Additional verification after the no-input correction: `npm.cmd run test:unit -- --runTestsByPath test/unit/verify-area-lighting-oracle-module-fixture.spec.ts` passed, and `node scripts\verify-area-lighting-oracle-module-fixture.mjs` wrote the proof above by reading the real `.mod` resources.

Optional isolated lane-reference utility scripts now present in the module for future safe captures:

- `als_light_shadow_ref_tmain.mod`: `als_reftmain` -> `retail-ref-tile-main-light.png`
- `als_light_shadow_ref_tsrc.mod`: `als_reftsrc` -> `retail-ref-tile-source-light.png`
- `als_light_shadow_ref_plc.mod`: `als_refplc` -> `retail-ref-placeable-lightcolor.png`
- `als_light_shadow_ref_mdl.mod`: `als_refmdl` -> `retail-ref-mdl-source-light.png`
- `als_light_shadow_ref_item.mod`: `als_refitem` -> `retail-ref-item-property-light.png`
- `als_light_shadow_ref_pfx.mod`: `als_refpfx` -> `retail-ref-progfx-type4-light.png`
- `als_light_shadow_pfxzero.mod`: `als_pfxzero` -> `retail-progfx-priority-policy-custom-zero-before.png` / `retail-progfx-priority-policy-custom-zero-after.png` (custom override oracle only, not stock retail parity)

The custom Param4=0 override pack is now prepared but not installed globally:

- Generator: `backend/scripts/create-area-lighting-progfx-custom-zero-override.mjs`
- Manifest status: `custom-param4-zero-override-pack-prepared-not-stock-retail-parity`
- `installsOverrideFiles=false`
- `overwritesUserOverrideDirectory=false`
- `canonicalParityPromoted=false`
- Source retail `visualeffects.2da` row `1302`: blank stock row
- Source retail `progfx.2da` row `1302`: missing stock row
- Custom `visualeffects.2da` row `1302`: `ALS_PFX_ZERO_BLUE_5`, `Type_FD=D`, `ProgFX_Duration=1302`
- Custom `progfx.2da` row `1302`: `ALS_LightBlue5mPriority0`, `Type=4`, `Param1=Blue_5m`, `Param4=0`, `Param7=fx_light_clr`
- Custom `progfx.2da` row `1301`: blank filler row, so the override does not rely on sparse physical row handling

These scripts are not in `als_autorun`; they are isolated references intended for one-at-a-time fresh `als_light_lab` sessions and pixel-classifier calibration. The injector now writes one disposable module per reference so `OnEnter` runs the desired `als_ref*` script without `dm_runscript` keyboard input.

## What is already locally covered

- Shadow-volume source state order is structurally evaluated:
  - `shadowvol-state-order-compare.json`
  - `stateOrderSourceParityPassed=true`
  - still blocked for pixel, opacity, and inherited render-state tolerance.
- Shadow-volume projection/caster path is now carried as a compact current proof:
  - `retail-shadowvol-projection-proof.json`
  - `status=source-backed-shadowvol-projection-caster-path-retail-pixel-parity-blocked`
  - `proofStatus=source-backed-shadowplane-shadowvol-shader-caster-path-stencil-face-op-render-state-slot3-and-local-draw-order-mapped-retail-parity-blocked`
  - shader names: `vs_shadowvol`, `fs_shadowvol`
  - render buckets: `0xd`, `0xe`, `0xb`, `0xc`
  - source anchors include `decompiled_all.c:913917`, `913930-913955`, `913986-913987`, `914032-914033`, `888319-888403`, `904108-904112`, `902867-902912`, and `913929-914033`
  - `proofScope.provesSourceBackedProjectionCasterPath=true`
  - `proofScope.provesRetailPixels=false`
  - `proofScope.provesProjectionPixelParity=false`
  - `proofScope.provesShadowOpacityTolerance=false`
  - `canonicalParityPromoted=false`
  - `shadowvol-campfire-pixel-compare.json.shadowvolProjectionProof.present=true`
  - this closes the machine-readable source-path evidence gap but not the retail pixel parity gate.
- ShadowSize retail shadow MDL selection is now a current machine-readable proof:
  - `retail-shadowsize-shadow-mdl-proof.json`
  - `proofStatus=source-backed-retail-shadowsize-shadow-mdl-selection-and-emitter-metadata-projection-parity-blocked`
  - `metadataPassed=true`
  - `canonicalParityPromoted=false`
  - selection rule: missing `ShadowSize` synthesizes no retail shadow MDL; `0 -> Fx_Shadow_S`; `2 -> Fx_Shadow_L`; every other present numeric value -> `Fx_Shadow_M`.
  - emitter metadata is source-backed from `fx_shadow_s/m/l.mdl`: `fxpa_Dot01`, `Single`, `Billboard_to_Local_Z`, `Normal`, Small size `1` alpha `0.6`, Med size `1.6` alpha `0.6`, Large size `3` alpha `0.7`.
  - this is not projection parity; it does not prove world-space projected footprint, receiver alignment, or opacity tolerance.
- Cross-lane local/source coverage is structurally evaluated:
  - `cross-lane-precedence-compare.json`
  - `localSourceFamilyCoveragePassed=true`
  - `runtimeLaneCoveragePassed=true`
  - `sourceFamilyCoveragePassed=true`
  - `ownerPathsStillBlocked=true`
  - `cross-lane-active-slot-blocker-proof.json`
    - `status=blocked-direct-retail-active-slot-order-missing-local-source-model-present`
    - `localSampleCount=5`
    - `retailSlotOracle.directRetailSlotDumpAvailable=false`
    - `retailSlotOracle.directRendererSlotOrderObserved=false`
    - `proofScope.provesLocalRequiredLaneCoverage=true`
    - `proofScope.provesSourceBackedActiveSlotAlgorithm=true`
    - `proofScope.provesRetailBudgetSensitiveRoiPixels=true`
    - `proofScope.provesDirectRetailActiveSlotDump=false`
    - `proofScope.provesDirectRendererSlotOrder=false`
    - `proofScope.provesRetailCrossLaneOwnerPrecedence=false`
    - `canonicalParityPromoted=false`
  - `cross-lane-retail-maxlight-roi-diagnostics.json`
    - `status=retail-maxlight-roi-diagnostics-written-owner-classifier-still-blocked`
    - `heatmapCount=5`
    - `budgetSensitiveCaseCount=5`
    - `provesBudgetSensitiveRetailPixels=true`
    - `provesAcceptedDroppedOwnerMapping=false`
    - `provesDirectRendererSlotOrder=false`
    - `canonicalParityPromoted=false`
  - `retailMaxLightVariantClassifier.status=candidate-classifier-inputs-present-evaluator-still-required`
  - `retail-cross-lane-active-slots.json` now records the controlled retail max-light variants as budget-sensitive evidence: `budget.mode=retail-max-light-variants-observed-no-direct-active-slot-dump`, `maxLightVariantsObserved=3,32`, `budgetSensitivityStatus=retail-max-light-variant-pixel-metrics-evaluated`.
  - max-light variant metrics are evaluated for `maxLights=3` (`meanAbsRgbDelta=7.097167968749976`, `changedSampleRatioGt5=0.423583984375`) and `maxLights=32` (`meanAbsRgbDelta=32.426595052083364`, `changedSampleRatioGt5=0.79931640625`), and the six `retail-ref-*` isolated lane PNGs are present.
  - the lane-owner pixel classifier remains blocked because the best lane candidate is not separated enough to map accepted/dropped owners without guessing: top candidate `item-property-light`, `cosineLumaDelta=0.12370700258966622`, `topMargin=0.005120414193112391`, required margin `0.08`.
  - `cross-lane-precedence-compare.json.activeSlotOracle` now carries the durable cue source: `runtimeLogCueSource=durable-maxlight-observation-active-slot-cue`, `liveLogCueStatus=cross-lane-cues-missing`, `durableCaptureCueStatus=cross-lane-active-slot-cues-present-in-maxlight-observation`, `durableCaptureCueCount=2`.
  - detailed ROI metrics are now generated from the retail PNGs:
    - default before/after: `meanAbsRgbDelta=1.6795396090535035`, `changedSampleRatioGt5=0.04035493827160494`, changed bounds `x=2,y=5,width=187,height=120`
    - `maxLights=3` before/after: `meanAbsRgbDelta=7.829346707819143`, `changedSampleRatioGt5=0.4344521604938272`, changed bounds `x=2,y=8,width=188,height=117`
    - `maxLights=32` before/after: `meanAbsRgbDelta=33.49429012345672`, `changedSampleRatioGt5=0.8152777777777778`, changed bounds `x=2,y=5,width=188,height=128`
    - `maxLights=3` vs `32` before-budget: `meanAbsRgbDelta=8.964763374485589`, `changedSampleRatioGt5=0.5238811728395062`, changed bounds `x=2,y=6,width=188,height=103`
    - `maxLights=3` vs `32` after-budget: `meanAbsRgbDelta=31.144727366255267`, `changedSampleRatioGt5=0.8070987654320988`, changed bounds `x=2,y=5,width=188,height=128`
  - still blocked for retail active-slot order.
- LightManager active-slot mechanics are now source-backed from `C:\Projects\New Folder\export\decompiled_all.c`:
  - `activeSlotAlgorithmEvidence.proofStatus=source-backed-active-slot-cap-score-sort-prune-append-upload-shader-loop-lane-score-input-still-blocked`
  - `FUN_00a41e30` clamps configured max lights to hard cap `0x80` / `128`.
  - `FUN_00a4128c` adds `PartLight` entries into LightManager lists.
  - `FUN_00a42b80` filters all lights into candidate-source list `param_1+0x2c` only when the light has source handles `light+0x6c`/`light+0x70`, non-zero source shape `light+0x4c/0x50/0x54`, finite radius `light+0x58 < 1000.0`, positive falloff/intensity scalar `light+0x8c`, and squared distance below `(FUN_00a40904(light)+param_3)^2`.
  - `FUN_00a41850` computes active-score scalar `light+0x84` from `score=((priority+1)*distance)/((class+4)*(falloff+1))`, with distance in `light+0x80`, priority from `light+0x74` or owner `+0xb0`, invalid sentinel `0x47c35000`, and special sentinel `0xbf800000` / `-1.0`.
  - `FUN_00a417bc` rebuilds and sorts the candidate list by `FUN_00a41694`, whose comparator orders by `light+0x84`.
  - `FUN_00a42728` selects candidates from the score-sorted list into the active list until `DAT_00cc309c`, accepting only candidates where `light+0x80 <= light+0x60` when `light+0x60` is positive, otherwise `light+0x80 <= light+0x58`.
  - `FUN_00a41e50` prunes/fades/appends active-list entries, uploads active slots with `FUN_00a40b60`, and disables unused slots with `FUN_00a7817c`.
  - `FUN_00a72ed8` uploads `DAT_00cff7e0` active-light records to shader arrays up to `FUN_00a41e30`.
  - Decompiled callsite search now runs inside `lightmanager-lane-owner-callgraph.json`:
    - `proofStatus=decompiled-lightmanager-callsite-search-complete-upstream-owner-calls-still-blocked`
    - `FUN_00a4128c`: `occurrenceCount=1`, `definitionCount=1`, `directCallCount=0`
    - `FUN_00a42b80`: `occurrenceCount=1`, `definitionCount=1`, `directCallCount=0`
    - `FUN_00a41e50`: `occurrenceCount=1`, `definitionCount=1`, `directCallCount=0`
    - `FUN_00a417bc`: `occurrenceCount=1`, `definitionCount=1`, `directCallCount=0`
    - `FUN_00a41850`: `occurrenceCount=1`, `definitionCount=1`, `directCallCount=0`
    - `FUN_00a42728`: `occurrenceCount=2`, `definitionCount=1`, `directCallCount=1`
    - this proves the current decompiled C does not expose a direct upstream owner callsite for the core add/filter/upload functions.
  - still blocked: upstream lane-owner mapping into the shared all-light/candidate-source input for tile/placeable/MDL/item/ProgFX, so accepted/dropped owners across lanes are not proven.
- LightManager source-family coverage is explicit:
  - tile main
  - tile source
  - placeables.2da light
  - MDL source light node
  - item-property light
  - ProgFX Type 4 light/vision
- Placeable light family evidence is source-backed for:
  - `LightColor`
  - `LightState` default ON
  - `ShadowSize`
  - `fx_placeable01/AuroraLight01` radius/falloff carrier
- Item light family evidence is source-backed for:
  - retail item light 2DA tables
  - `VFX_DUR_LIGHT_*`
  - `visualeffects.2da -> progfx.2da -> fx_light_clr.mdl`
- ProgFX Type 4 table evidence is source-backed for:
  - Param3 cast shadows table values
  - Param4 priority table values
  - Param5 proximity table values
  - Param6 attach-to-scene table values
  - visualeffects owner phase mapping
  - cross-lane `lightmanager-lane-owner-callgraph.json` carries the same `Param4=0` finding: stock retail `progfx.2da` has no Type 4 priority-zero row, so zero-priority requires a custom override scene and remains blocked without pretending another stock capture can answer it.
- ProgFX Type 4 retail PNG pixel classification is now implemented without promoting parity:
- `progfx-type4-runtime-oracle-blocker-proof.json`
  - `status=blocked-progfx-type4-runtime-oracles-present-policy-parity-incomplete`
  - `proofScope.provesPriorityVisibleType4PixelSignal=true`
  - `proofScope.provesProximitySuppressionBracket=true`
  - `proofScope.provesAttachSceneRemovalAndRestore=false`
  - `proofScope.provesBlindvisionRetailPixelMutation=true`
  - `proofScope.provesBlindvisionRetailMutationTolerance=true`
  - `proofScope.provesPriorityTiePolicy=false`
  - `proofScope.provesPriorityZeroRuntimePolicy=false`
  - `proofScope.provesExactProximityThreshold=false`
  - `proofScope.provesAttachSchedulerDataflow=false`
  - `proofScope.provesLocalVsRetailBlindvisionParity=false`
  - `canonicalParityPromoted=false`
- `retail-progfx-priority-policy.json`: `status=blocked-retail-runtime-priority-pixels-classified-tie-still-missing-custom-zero-captured`; the stock retail before/after capture now classifies a Type 4 light signal after the scripted simultaneous `VFX_DUR_BLACKOUT + VFX_DUR_LIGHT_BLUE_5 + VFX_DUR_LIGHT_YELLOW_5` requests (`pixelStatus=retail-priority-type4-light-signal-observed-after-simultaneous-requests`, `dominantCapturedSignal=warm-yellow`, `afterType4LightSignal.count=169`, `afterWarmLightSignal.count=169`, `afterBlueVfxSignal.count=0`), and the custom `Param4=0` override capture is present/classified. Tie policy and stock-retail priority-zero parity remain unproven; the custom-zero capture is override evidence only, with `runtimeObservation.priorityZeroPolicy=custom-param4-zero-override-runtime-capture-present-not-stock-retail-parity`.
  - `retail-progfx-proximity-distance-sweep.json`: `status=blocked-retail-runtime-proximity-pixels-classified-threshold-owner-still-missing`; blue Type 4 signal is reduced at near and restored at mid/far (`near=254`, `mid=947`, `far=905`), giving only a threshold bracket between scripted near and mid samples.
  - `retail-progfx-attach-scene-restore.json`: `status=blocked-retail-runtime-attach-pixels-classified-no-removal-observed-scheduler-still-missing`; before/active/after pixels do not show measurable scene-light removal in the campfire/lamp/VFX ROIs (`campfire.meanAbsRgbDelta=0.28500754147812973`, `lamp.meanAbsRgbDelta=0.10147058823529412`, `vfxCenter.meanAbsRgbDelta=0.1959313725490196`).

## Pixel diff diagnostics - 2026-07-06

Diagnostic heatmaps are now generated without promoting parity:

- Generator: `backend/scripts/create-area-lighting-pixel-diff-artifacts.mjs`
- Manifest: `backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/area-lighting-pixel-diff-artifacts.json`
- `status=pixel-diff-artifacts-written-parity-still-blocked`
- `generatedCaseCount=3`
- `canonicalParityPromoted=false`

Generated heatmap PNGs:

- `shadowvol-campfire-retail-web-diff-normalized.png`: `normalization=different-dimensions-normalized-sampled-grid`, `meanAbsRgbDelta=46.12099880642295`, `changedSampleRatioGt5=0.999755859375`, changed bounds cover `192x128`. This confirms the current retail/web campfire images are not a pass candidate without a real footprint/opacity/viewport evaluator.
- `retail-progfx-blindvision-before-active-diff.png`: `normalization=same-dimension-sampled-grid`, `meanAbsRgbDelta=1.395974794238681`, `changedSampleRatioGt5=0.02507716049382716`, changed bounds `x=2,y=24,width=187,height=101`. This proves retail mutation pixels exist but does not prove local-vs-retail parity.
- `retail-cross-lane-budget-before-after-diff.png`: `normalization=same-dimension-sampled-grid`, `meanAbsRgbDelta=1.6795396090535035`, `changedSampleRatioGt5=0.04035493827160494`, changed bounds `x=2,y=5,width=187,height=120`. This proves budget-sensitive pixel changes exist but still does not map pixels back to accepted/dropped lane owners.

The compare JSONs now carry those diff artifacts:

- `shadowvol-campfire-pixel-compare.json.pixelDiffArtifact.present=true`
- `shadowvol-campfire-pixel-compare.json.shadowvolProjectionProof.present=true`
- `shadowvol-campfire-pixel-compare.json.toleranceEvaluation.status=tolerance-failed`
- `retail-progfx-blindvision-pixel-compare.json.pixelDiffArtifact.present=true`
- `retail-progfx-blindvision-pixel-compare.json.retailMutationTolerance.status=tolerance-passed`
- `retail-progfx-blindvision-pixel-compare.json.localVsRetailTolerance.status=tolerance-failed`
- `cross-lane-precedence-compare.json.pixelDiffArtifact.present=true`
- `cross-lane-precedence-compare.json.retailMaxLightVariantClassifier.roiDiagnostics.present=true`

Cross-lane max-light ROI heatmaps were also generated:

- `retail-cross-lane-default-maxlights-roi-heatmap.png`
- `retail-cross-lane-maxlights-3-roi-heatmap.png`
- `retail-cross-lane-maxlights-32-roi-heatmap.png`
- `retail-cross-lane-maxlights-3-vs-32-before-roi-heatmap.png`
- `retail-cross-lane-maxlights-3-vs-32-after-roi-heatmap.png`

These ROI heatmaps prove budget-sensitive retail pixel regions exist, but they still do not identify accepted/dropped light owners.

## Remaining blocker 1 - retail shadow-volume projection parity

Case: `shadowvol-campfire-pixel-geometry-opacity`

Missing:

- none

Failed/blocked JSON:

- `shadowvol-campfire-pixel-compare.json`

Reason:

- Aurora Web local shadow-volume and state-order evidence exists.
- Retail campfire image is present.
- `retail-shadowsize-shadow-mdl-proof.json` is present and is carried into `shadowvol-campfire-pixel-compare.json` as `shadowSizeRetailProof.present=true`, but it only proves the retail `ShadowSize -> Fx_Shadow_*` model/emitter metadata, not projected footprint or opacity.
- `retail-shadowvol-projection-proof.json` is present and is carried into `shadowvol-campfire-pixel-compare.json` as `shadowvolProjectionProof.present=true`; it proves the source-backed shader/caster/stencil path, but explicitly does not prove retail pixels, projection parity, or ShadowOpacity tolerance.
- `shadowvol-campfire-pixel-compare.json` now computes PNG metrics and evaluates explicit tolerance:
  - `status=blocked-shadowvol-pixel-tolerance-evaluated-failed`
  - `toleranceEvaluation.status=tolerance-failed`
  - `inputDimensionsMatch=false`
  - `meanAbsRgbDelta=45.15838396990713`
  - `rmsRgbDelta=65.33657268356323`
  - `changedSampleRatioGt5=1`
  - normalized diff `meanAbsRgbDelta=46.12099880642295` with max `8`
  - normalized diff `changedSampleRatioGt5=0.999755859375` with max `0.15`
  - `changedBoundsAreaRatio=1` with max `0.35`
  - `shadowSizeMetadataPresent=true`
  - `projectionSourcePathPresent=true`
- It remains blocked because the explicit footprint/opacity tolerance evaluator fails on the current retail/web image pair.

Case: `shadowvol-retail-gl-state-order`

Missing:

- none

Failed/blocked JSON:

- `shadowvol-state-order-compare.json`

Reason:

- Source-state order matches locally.
- Full pass is intentionally blocked until retail/toolset pixel/opacity/inherited-state tolerance is proven.

## Remaining blocker 2 - retail cross-lane active-light ordering

Case: `cross-lane-all-required-lanes-retail-precedence`

Missing:

- none

Failed/blocked JSON:

- `retail-cross-lane-active-slots.json`
- `cross-lane-precedence-compare.json`

Reason:

- Aurora Web local runtime covers the required lane families.
- LightManager callgraph carries 6/6 source-family evidence, plus source-backed candidate filter, active radius check, score formula, score sort, active cap, upload, and shader array upload.
- Max-light variant pixel metrics are present in both `retail-cross-lane-active-slots.json` and `cross-lane-precedence-compare.json`.
- Cross-lane ROI diagnostics are present in `cross-lane-retail-maxlight-roi-diagnostics.json` and carried into both `cross-lane-active-slot-blocker-proof.json` and `cross-lane-precedence-compare.json`.
- The two controlled retail variants show budget-sensitive pixel changes:
  - `maxLights=3`: `meanAbsRgbDelta=7.097167968749976`, `changedSampleRatioGt5=0.423583984375`
  - `maxLights=32`: `meanAbsRgbDelta=32.426595052083364`, `changedSampleRatioGt5=0.79931640625`
- The ROI pass adds five heatmaps and sampled hot-cell metrics, but still reports `provesAcceptedDroppedOwnerMapping=false`.
- `retailMaxLightVariantClassifier.classifierGrade=true`; isolated lane-reference inputs are now present, including the selected fallback `retail-ref-progfx-type4-light-openpad-fallback.png` when the canonical ProgFX reference is not a gameplay frame.
- `retail-cross-lane-active-slots.json.observations.laneOwnerPixelClassifier.status=blocked-owner-classifier-ambiguous`; the current classifier sees item/MDL/ProgFX/tile/placeable candidates too close together to infer accepted/dropped owners.
- Retail before/after PNGs are present.
- `retail-cross-lane-active-slots.json` is present but observational only: it records screenshots/log cues and max-light variant metrics, and still refuses to invent `acceptedSlots`/`droppedSlots`.
- Direct renderer active-slot order, or stronger pixel-differential oracle that maps observed pixels back to accepted/dropped lane owners, is still missing.

Case: `lightmanager-vtable-receiver-dispatch`

Missing:

- none

Failed/blocked JSON:

- `lightmanager-vtable-receiver-xrefs.json`
- `lightmanager-lane-owner-callgraph.json`

Reason:

- Retail binary proves LightManager vtable cluster and indirect slot candidates.
- Decompiled LightManager callsite search is present and shows no direct upstream owner callsite for `FUN_00a4128c`, `FUN_00a42b80`, `FUN_00a41e50`, `FUN_00a417bc`, or `FUN_00a41850`; only `FUN_00a42728` has one direct callsite in the current decompiled C.
- No recovered direct AddLight/PrioritizeLights/RemoveLight/UpdateLights xrefs or receiver-proven indirect dispatch ties tile/placeable/MDL/item/ProgFX lane owners to the shared all-light/candidate-source insertion path.

## Remaining blocker 3 - ProgFX Type 4 runtime scheduler

Case: `progfx-type4-priority-tie-and-zero-policy`

Missing:

- none

Failed/blocked JSON:

- `retail-progfx-priority-policy.json`

Reason:

- Retail tables prove Param4 priority values and owner phases.
- Retail before/after priority PNGs are present.
- Pixel classification now proves a visible Type 4 blue/yellow VFX signal appears after the scripted simultaneous retail requests.
- Equal-priority tie behavior and custom `Param4=0` behavior are still untested. Current retail table evidence proves stock `progfx.2da` has no Type 4 `Param4=0` row; the custom override scene and 2DA pack are prepared, but zero-priority still requires a recorded runtime capture using the exact override hashes.

Case: `progfx-type4-proximity-threshold`

Missing:

- none

Failed/blocked JSON:

- `retail-progfx-proximity-distance-sweep.json`

Reason:

- Retail tables prove which rows request proximity suppression.
- Retail near/mid/far contact sheet and source PNGs are present.
- Pixel classification now shows the near sample has a reduced Type 4 blue signal and mid/far restore that signal.
- Exact threshold and participating source lane are still not classified; current evidence only brackets the threshold between scripted near and mid samples.

Case: `progfx-type4-attach-to-scene-restore`

Missing:

- none

Failed/blocked JSON:

- `retail-progfx-attach-scene-restore.json`

Reason:

- Retail tables prove attach-to-scene requests.
- Retail before/active/after PNGs are present.
- Pixel classification now checks the campfire/lamp/VFX ROIs and does not observe measurable scene-light removal while the effect is active.
- Because no active removal is observed in this capture, restoration timing cannot be promoted; Param6 semantics still need a stronger oracle or decompiled scheduler data-flow.

Case: `progfx-type4-blind-vision-pixels`

Missing:

- none

Failed/blocked JSON:

- `retail-progfx-blindvision-pixel-compare.json`

Reason:

- Local Blind_Vision source/owner evidence exists.
- Retail before/active viewport PNGs are present.
- `retail-progfx-blindvision-pixel-compare.json` now computes retail before/active PNG mutation:
  - `status=blocked-retail-blindvision-local-tolerance-evaluated-failed`
  - `retailMutationObserved=true`
  - `retailMutationTolerance.status=tolerance-passed`
  - `meanAbsRgbDelta=1.1200810185185186`
  - `rmsRgbDelta=12.820246641868225`
  - `changedSampleRatioGt5=0.022569444444444444`
- Local-vs-retail viewport tolerance is now explicit and fails:
  - local preview PNG: `progfx-blindvision-row329-cross-lane-runtime-probe-2026-07-03.png`
  - local preview dimensions: `1424x609`
  - retail active dimensions: `1280x900`
  - `localVsRetailTolerance.status=tolerance-failed`
  - `inputDimensionsMatch=false`
  - `meanAbsRgbDelta=56.08242910879732` with max `10`
  - `changedSampleRatioGt5=1` with max `0.2`
  - `localFrameIsNotRetailEvidence=true`

## Runtime capture readiness

Commands:

```powershell
cd C:\Projects\aurora-web\backend
node scripts\create-area-lighting-retail-oracle-scene-drivers.mjs
node scripts\compile-area-lighting-retail-oracle-scene-drivers.mjs
node scripts\inject-area-lighting-retail-oracle-compiled-drivers.mjs
node scripts\check-area-lighting-retail-runtime-capture-readiness.mjs
node scripts\create-area-lighting-retail-capture-queue.mjs
```

Readiness:

- `status=ready-all-runtime-artifacts-present`
- `requiredRuntimeArtifacts=12`
- `presentRuntimeArtifacts=12`
- `missingRuntimeArtifacts=0`
- `runtimeObservedTargets=0`
- `sceneReadyTargets=0`
- `sceneDriverBlockedTargets=0`
- `sourceDriverPreparedTargets=0`
- `compiledPackPreparedTargets=0`
- `runtimeModulePreparedTargets=0`
- `autorunPreparedTargets=0`
- `runtimeReadyTargets=0`
- `runtimeBlockedTargets=0`
- `blockedRuntimeTargets=0`

Capture queue:

- `status=complete-required-runtime-artifacts-reference-captures-missing`
- `queueItemCount=0`
- `caseCount=0`
- `runtimeReadyItemCount=0`
- `blockedItemCount=0`
- `sceneDriverBlockedItemCount=0`
- `sourceDriverPreparedItemCount=0`
- `compiledPackPreparedItemCount=0`
- `runtimeModulePreparedItemCount=0`
- `autorunPreparedItemCount=0`
- `missingInOracleGateCount=0`
- `classifierReferenceQueueItemCount=6`
- `missingClassifierReferenceArtifactCount=6`
- `customProgFxZeroQueueItemCount=2`
- `missingCustomProgFxZeroArtifactCount=2`
- `customProgFxZeroOverridePackPrepared=true`

Direct readiness process probe status during the latest safe check was `not_running`. This pass did not launch NWN/Toolset, did not focus the window, and did not send input. All required runtime artifacts were already present, including the custom `Param4=0` before/after screenshots. The remaining optional queue entries are isolated `retail-ref-*` lane-classifier references constrained to `-NoFocus`, `-NoTopMost`, and `-NoEscape`; the custom-zero screenshots point at a prepared but not-installed 2DA override pack with recorded hashes and are override evidence only.

Prepared driver pack:

- Manifest: `backend/docs/aurora-reverse/artifacts/light-shadow-retail-oracle-drivers/retail-oracle-scene-drivers-manifest.json`
- Markdown: `backend/docs/aurora-reverse/artifacts/light-shadow-retail-oracle-drivers/retail-oracle-scene-drivers.md`
- Compile manifest: `backend/docs/aurora-reverse/artifacts/light-shadow-retail-oracle-drivers/retail-oracle-scene-drivers-compile-manifest.json`
- Module injection summary: `backend/docs/aurora-reverse/artifacts/light-shadow-retail-oracle-drivers/compiled-driver-module-injection-summary.json`
- Custom Param4=0 override manifest: `backend/docs/aurora-reverse/artifacts/light-shadow-retail-oracle-drivers/custom-progfx-param4-zero-override/custom-progfx-param4-zero-override-manifest.json`
- Disposable module: `C:\Users\enonw\Documents\Neverwinter Nights\modules\als_light_shadow_oracle_lab.mod`
- Source manifest status: `compiled-scene-drivers-present-runtime-capture-required`
- Compile manifest status: `compiled-pack-ready-module-injection-required`
- Module injection status: `runtime-scene-module-ready-runtime-capture-required`
- Source-ready drivers: `6/6`
- Compiled pack: `6/6`
- Utility runner `als_autorun`: compiled and injected `1/1`
- Reference/custom modules: `7/7`
- Reference/custom module readiness: `7/7`
- Runtime autorun hook: `als_light_lab.OnEnter=als_autorun`
- Module start area: `Mod_Entry_Area=als_light_lab`
- Module start position: `x=9.5`, `y=3.799999952316284`, `z=0`, `dirX=0`, `dirY=1`
- Output module SHA-256: `1252a923398035e82e960385732d5493413dfbdc7676f4b648453ee03f2f6f17`
- Compiled drivers found in scanned modules: `6/6`
- Injected module drivers: `6/6`
- Base/source stage area `enon_test_effect`: preserved
- Required runtime oracle area `als_light_lab`: present
- Runtime artifacts still required: `0`

Scene-driver readiness:

- `shadowvol-campfire-pixel-geometry-opacity`: source `als_shcamp.nss` prepared, compiled, present in disposable module, and retail PNG captured; pixel tolerance evaluator is present and failing on the current uncalibrated retail/web pair.
- `cross-lane-all-required-lanes-retail-precedence`: source `als_xlane.nss` prepared, compiled, present in disposable module, and retail before/after PNGs captured; active-slot JSON is observational only, direct renderer slot order still missing.
- `progfx-type4-priority-tie-and-zero-policy`: source `als_pfxpri.nss` prepared, compiled, present in disposable module, and before/after retail PNGs captured; scheduler winner/tie/zero verdict still missing.
- `progfx-type4-proximity-threshold`: source `als_pfxprox.nss` prepared, compiled, present in disposable module, and near/mid/far contact sheet captured; threshold classifier still missing.
- `progfx-type4-attach-to-scene-restore`: source `als_pfxatt.nss` prepared, compiled, present in disposable module, and before/active/after PNGs captured; restore classifier still missing.
- `progfx-type4-blind-vision-pixels`: source `als_pfxblind.nss` prepared, compiled, present in disposable module, and before/active retail PNGs captured; retail mutation tolerance passes, local-vs-retail viewport tolerance is present and failing.

## Final remaining work

1. Replace the failing shadow-volume and Blind_Vision tolerance checks with calibrated viewport/ROI captures or a source-backed normalization model; both compare JSONs now have explicit thresholds and currently fail them.
2. Capture or derive the six isolated `retail-ref-*` lane reference PNGs for tile-main, tile-source, placeable, MDL, item-property, and ProgFX Type 4 lanes; if retail runtime is needed, use the generated `als_light_shadow_ref_*.mod` modules and only the safe no-focus/no-topmost/no-input capture path.
3. Recover direct renderer active-slot order for cross-lane, or complete the stronger pixel-differential oracle by adding isolated lane-reference captures/classification on top of the new ROI heatmaps; do not infer accepted/dropped owners from ROI deltas alone.
4. Implement ProgFX runtime classifiers for priority winner/tie/zero, proximity threshold, and attach-to-scene restore using the captured PNGs or decompiled scheduler data-flow; the zero branch now has a prepared `als_light_shadow_pfxzero.mod` and a hashed custom override pack, but still needs a recorded runtime capture that loaded those exact hashes.
5. Re-run:

```powershell
cd C:\Projects\aurora-web\backend
node scripts\create-area-lighting-blocked-compare-reports.mjs
node scripts\check-area-lighting-retail-oracle-artifacts.mjs --allow-blocked
```

6. Only if the gate changes from blocked to explicit pass for each case, promote the corresponding parity claim.

Do not fabricate slot order from Aurora Web screenshots. Retail PNG artifacts now exist; direct slot ordering and pixel classifiers remain the acceptance gaps.
