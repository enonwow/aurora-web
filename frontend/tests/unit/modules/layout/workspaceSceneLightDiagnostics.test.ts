import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  AURORA_SCENE_LIGHT_ACTIVE_SLOT_CAP_SOURCE,
  AURORA_SCENE_LIGHT_BUDGET_MODE,
  AURORA_SCENE_LIGHT_BUDGET_CAP_PROOF_STATUS,
  AURORA_SCENE_LIGHT_DIAGNOSTIC_PROOF_STATUS,
  AURORA_SCENE_LIGHT_MANAGER_CROSS_LANE_CALLSITE_BLOCKER,
  AURORA_SCENE_LIGHT_MANAGER_INTERNAL_INSERTION_PROOF_STATUS,
  AURORA_SCENE_LIGHT_MANAGER_INTERNAL_INSERTION_SOURCE,
  AURORA_SCENE_LIGHT_MANAGER_PREVIEW_BUDGET_PLAN_BLOCKER,
  AURORA_SCENE_LIGHT_MANAGER_PREVIEW_BUDGET_PLAN_STATUS,
  AURORA_SCENE_LIGHT_OBSERVED_LANES_SOURCE,
  AURORA_SCENE_LIGHT_RETAIL_ORDERING_COVERAGE_COMPLETE_STATUS,
  AURORA_SCENE_LIGHT_RETAIL_ORDERING_RUNTIME_PROBE_BLOCKER,
  AURORA_SCENE_LIGHT_RETAIL_ORDERING_RUNTIME_PROBE_COMPLETE_STATUS,
  AURORA_SCENE_LIGHT_RETAIL_ORDERING_RUNTIME_PROBE_INCOMPLETE_STATUS,
  AURORA_SCENE_LIGHT_RETAIL_ORDERING_RUNTIME_PROBE_LOCAL_ORDER_SOURCE,
  AURORA_SCENE_LIGHT_RETAIL_ORDERING_RUNTIME_PROBE_PROOF_SOURCE,
  AURORA_SCENE_LIGHT_RETAIL_ORDERING_PROOF_SOURCE,
  AURORA_SCENE_LIGHT_RETAIL_ORDERING_PROOF_STATUS,
  AURORA_SCENE_LIGHT_RETAIL_ORDERING_REQUIRED_LANES,
  AURORA_SCENE_LIGHT_RETAIL_ORDERING_STATUS,
  AURORA_SCENE_LIGHT_RETAIL_SORT_DIRECTION,
  AURORA_SCENE_LIGHT_RETAIL_SORT_SCORE_FORMULA,
  AURORA_SCENE_LIGHT_RETAIL_SORT_SCORE_PROOF_STATUS,
  AURORA_SCENE_LIGHT_RETAIL_SORT_SCORE_SOURCE,
  AURORA_SCENE_PROGFX_TYPE4_PRIORITY_EVALUATION_ORDER_SOURCE,
  AURORA_SCENE_PROGFX_TYPE4_PRIORITY_TIE_POLICY_STATUS,
  AURORA_SCENE_PROGFX_TYPE4_PRIORITY_ZERO_POLICY_STATUS,
  AURORA_SCENE_SHADOW_DIAGNOSTIC_PROOF_STATUS,
  AURORA_SCENE_SHADOW_RETAIL_PROJECTION_BLOCKER,
  AURORA_SCENE_SHADOW_RETAIL_PROJECTION_GEOMETRY_SOURCE,
  AURORA_SCENE_SHADOW_RETAIL_PROJECTION_GEOMETRY_STATUS,
  AURORA_SCENE_SHADOW_RETAIL_PROJECTION_LIGHT_PROFILE_SOURCE,
  AURORA_SCENE_SHADOW_RETAIL_PROJECTION_LIGHT_PROFILE_STATUS,
  AURORA_SCENE_SHADOW_RETAIL_PROJECTION_PROOF_STATUS,
  AURORA_SCENE_SHADOW_RETAIL_PROJECTION_RENDER_BUCKETS,
  AURORA_SCENE_SHADOW_RETAIL_PROJECTION_SHADER_NAMES,
  AURORA_SCENE_SHADOW_RETAIL_PROJECTION_SOURCE,
  AURORA_SCENE_SHADOW_RETAIL_PROJECTION_STATUS,
  AURORA_SCENE_SHADOW_VOLUME_RUNTIME_PROBE_ACTIVE_STATUS,
  AURORA_SCENE_SHADOW_VOLUME_RUNTIME_PROBE_BLOCKER,
  AURORA_SCENE_SHADOW_VOLUME_RUNTIME_PROBE_EXPECTED_STENCIL_PASSES,
  AURORA_SCENE_SHADOW_VOLUME_RUNTIME_PROBE_LOCAL_PIXEL_STATUS,
  AURORA_SCENE_SHADOW_VOLUME_RUNTIME_PROBE_NOT_OBSERVED_STATUS,
  AURORA_SCENE_SHADOW_VOLUME_RUNTIME_PROBE_PROOF_SOURCE,
  resolveAuroraScenePointLightDiagnostics,
  writeAuroraScenePointLightDiagnostics
} from "../../../../src/modules/layout/adapters/three/workspaceSceneLightDiagnostics";
import {
  AURORA_THREE_LINEAR_LIGHT_FALLOFF_PROOF_STATUS,
  AURORA_THREE_LINEAR_LIGHT_FALLOFF_SOURCE
} from "../../../../src/modules/layout/adapters/three/auroraThreeLightFalloff";

describe("workspaceSceneLightDiagnostics", () => {
  it("audits Aurora-backed PointLight lanes without claiming retail cross-lane ordering", () => {
    const scene = new THREE.Scene();
    scene.userData.auroraLightConfiguredMaxLights = 2;

    const itemLight = new THREE.PointLight(0xff6d49, 1.75, 13.3, 1);
    itemLight.userData.itemPropertyLightPreviewRole = "item-property-point-light";
    itemLight.userData.itemPropertyLightRelatedVisualEffectRowId = 168;
    itemLight.userData.itemPropertyLightRelatedVisualEffectConstant = "VFX_DUR_LIGHT_RED_20";
    itemLight.userData.itemPropertyLightRelatedVisualEffectLabel = "VFX_DUR_LIGHT_RED_20";
    itemLight.userData.itemPropertyLightRelatedVisualEffectLabelSource =
      "visualeffects.2da rows 153..180; rows 177..180 are labeled VFX_DUR_LIGHT_GREEN_* while nwscript.nss exposes same ids as VFX_DUR_LIGHT_GREY_*";
    itemLight.userData.itemPropertyLightRelatedProgFxRowId = 315;
    itemLight.userData.itemPropertyLightRelatedProgFxLabel = "LightRed20m";
    itemLight.userData.itemPropertyLightRelatedProgFxFadeRowId = 365;
    itemLight.userData.itemPropertyLightRelatedProgFxFadeLabel = "FadeLRed20m";
    itemLight.userData.itemPropertyLightRelatedProgFxRowSource =
      "visualeffects.2da rows 153..180 map each VFX_DUR_LIGHT_* row to explicit progfx.2da Type 4 normal/fade rows; ordering is White, Blue, Yellow, Red, Orange, Purple, Green in progfx.2da and must not be derived by visualeffects row offset";
    itemLight.userData.itemPropertyLightRelatedProgFxAnimation = "Red_20m";
    itemLight.userData.itemPropertyLightBrightnessLabel = "Bright";
    itemLight.userData.itemPropertyLightColorLabel = "Red";
    itemLight.userData.itemPropertyLightFalloffFormula =
      "source-family max(0,1-distance/13.3)";
    itemLight.userData.itemPropertyLightFalloffProofStatus =
      "source-family-backed-fx_light_clr-mdl-radius-linear-falloff-itemproperty-scheduler-unverified";
    itemLight.userData.itemPropertyLightFalloffRendererPatchStatus = "installed";
    itemLight.userData.itemPropertyLightFalloffRendererProofStatus =
      AURORA_THREE_LINEAR_LIGHT_FALLOFF_PROOF_STATUS;
    itemLight.userData.itemPropertyLightFalloffRendererSource =
      AURORA_THREE_LINEAR_LIGHT_FALLOFF_SOURCE;
    itemLight.userData.itemPropertyLightSourceMdlRadiusMeters = 13.3;
    itemLight.userData.itemPropertyLightSourceMdlRadiusUnits = "meters";
    itemLight.userData.itemPropertyLightMetersToWorldScale = 0.1;
    itemLight.userData.itemPropertyLightSourceMdlRadiusWorldDistance = 1.33;
    itemLight.castShadow = true;
    itemLight.userData.itemPropertyLightRelatedProgFxCastShadowsRaw = "1";
    itemLight.userData.itemPropertyLightRelatedProgFxCastShadows = true;
    itemLight.userData.itemPropertyLightRelatedProgFxFadeCastShadowsRaw = "1";
    itemLight.userData.itemPropertyLightRelatedProgFxFadeCastShadows = true;
    itemLight.userData.itemPropertyLightShadowStatus = "enabled-by-progfx-param3";
    itemLight.userData.itemPropertyLightShadowProofStatus =
      "source-backed-progfx-type4-param3-item-light-shadow-toggle-shadowvol-projection-blocked";
    itemLight.userData.itemPropertyLightRuntimeSchedulerProofSource =
      "nwmain.exe ApplyLight 0x140472270..0x1404723e4 maps color byte [CNWItemProperty+9] to VFX_DUR_LIGHT base rows 153/157/161/165/177/169/173 and brightness word [CNWItemProperty+6] adds 0..3; nwn_base.key base_2da.bif recovers iprp_lightcost.2da/iprp_color.2da; OnApplyVisualEffect calls CNWSObject::AddLoopingVisualEffect at 0x140435400; CNWSObject owner list is +0x160/+0x168; CNWSMessage WriteGameObjUpdate serializes looping VFX records; clientVisualEffectReceiveRenderEvidence proofStatus=source-backed-cnwcmessage-client-vfx-receive-vtable-add-newcaurobject-mdl-gob-light-path; mdlNodeLightPartLightLifecycle createdPartLightSizeBytes=192 recovers generic MDL PartLight creation/Gob-list attach";
    itemLight.userData.itemPropertyLightRuntimeSchedulerBlocker =
      "Retail ApplyLight bridge, retail KEY/BIF item-light tables, object-level looping VFX owner add/remove, CNWSMessage last-update copy/diff, CNWSMessage game-object update serialization, client receive/render/Gob instantiation through CNWCMessage/CNWCObject/NewCAurObject, generic MdlNodeLight PartLight creation/Gob-list attach, and progfx.2da Param3 item-light shadow toggle are recovered, but cross-lane insertion order and retail shadow-volume projection parity are not recovered";
    itemLight.userData.itemPropertyLightShadowPolicySource =
      "nwn_base.key progfx.2da Type 4 item-light rows 300..327 and fade rows 350..377 use Param3 as cast shadows: 5m rows have 0, 10m/15m/20m rows have 1; fx_light_clr.mdl AuroraLight01 has shadow=true and shadowradius=15, while retail shadow-volume projection parity remains blocked";
    itemLight.userData.itemPropertyLightBudgetRank = 1;
    itemLight.userData.itemPropertyLightBudgetAccepted = true;
    scene.add(itemLight);

    const placeableLight = new THREE.PointLight(0xffd980, 1, 4, 2);
    placeableLight.userData.placeableTwoDaLightPreviewRole = "placeables-2da-point-light";
    placeableLight.userData.placeableTwoDaLightColorLabel = "PaleYellow";
    placeableLight.userData.placeableTwoDaLightColorSource = "lightcolor.2da.RGB";
    placeableLight.userData.placeableTwoDaLightSourceRadius = 10;
    placeableLight.userData.placeableTwoDaLightSourceRadiusUnits = "aurora-model-units";
    placeableLight.userData.placeableTwoDaLightSourceUnitScale = 0.4;
    placeableLight.userData.placeableTwoDaLightSourceRadiusWorldDistance = 4;
    placeableLight.userData.placeableTwoDaLightFalloffRendererPatchStatus =
      "already-installed";
    placeableLight.userData.placeableTwoDaLightFalloffRendererProofStatus =
      AURORA_THREE_LINEAR_LIGHT_FALLOFF_PROOF_STATUS;
    placeableLight.userData.placeableTwoDaLightFalloffRendererSource =
      AURORA_THREE_LINEAR_LIGHT_FALLOFF_SOURCE;
    scene.add(placeableLight);

    const mdlLight = new THREE.PointLight(0x88aaff, 1, 3, 2);
    mdlLight.userData.auroraLightPreviewRole = "source-mdl-point-light";
    mdlLight.userData.auroraLightNodeName = "pulsing_light03";
    mdlLight.userData.auroraLightSourceRadius = 3;
    mdlLight.userData.auroraLightSourceRadiusUnits = "aurora-model-units";
    mdlLight.userData.auroraLightSourceUnitScale = 0.5;
    mdlLight.userData.auroraLightSourceRadiusWorldDistance = 1.5;
    mdlLight.userData.auroraLightBudgetRank = 2;
    mdlLight.userData.auroraLightBudgetAccepted = true;
    mdlLight.userData.auroraLightRetailScore = 0.1938;
    mdlLight.userData.auroraLightRetailScorePriority = 1;
    mdlLight.userData.auroraLightRetailScorePreviewDistance = 3.1;
    mdlLight.userData.auroraLightRetailScoreSourceRadius = 3;
    mdlLight.userData.auroraLightRetailScoreMultiplier = 1;
    mdlLight.userData.auroraLightRetailScoreField0x70 = 0;
    mdlLight.userData.auroraLightRetailScoreRuntimeExtent = 1;
    mdlLight.userData.auroraLightRetailScoreRangeTerm = 3;
    mdlLight.userData.auroraLightRetailScoreFormula =
      "((priority+1)*previewDistance)/((field0x70+4)*(rangeTerm+1))";
    mdlLight.userData.auroraLightRetailScoreSource =
      "C:/Projects/New Folder/export/decompiled_all.c:865838-865929 FUN_00a41850 writes LightManager score +0x84";
    mdlLight.userData.auroraLightRetailScoreProofStatus =
      "source-backed-retail-lightmanager-score-preview-input-fallback";
    mdlLight.userData.auroraLightRetailScoreSortDirection =
      "ascending-score-field-0x84-preview";
    mdlLight.userData.auroraLightRetailScoreFallback =
      "preview-object-local-distance-field0x70-zero-runtimeextent-one-cross-lane-callsite-blocked";
    mdlLight.userData.auroraLightFalloffRendererPatchStatus = "already-installed";
    mdlLight.userData.auroraLightFalloffRendererProofStatus =
      AURORA_THREE_LINEAR_LIGHT_FALLOFF_PROOF_STATUS;
    mdlLight.userData.auroraLightFalloffRendererSource =
      AURORA_THREE_LINEAR_LIGHT_FALLOFF_SOURCE;
    scene.add(mdlLight);

    const tileLight = new THREE.PointLight(0xc8f0ff, 0.9, 0.7, 1);
    tileLight.userData.auroraTerrainTileLightRendererMode = "point-light-preview";
    tileLight.userData.auroraTerrainTileLightRole = "source";
    tileLight.userData.auroraTerrainTileId = "tile-0-0";
    tileLight.userData.auroraTerrainTileLightDistanceSource =
      "C:/Projects/New Folder/export/decompiled_all.c:453567-453602 creates fx_flame01 at sourcelight1/sourcelight2 tile source-light nodes; nwn_base.key fx_flame01.mdl AuroraLight01 controller radius 0x58 = 7, shadowradius 0x60 = 15, verticaldisplacement 0x64 = 2";
    tileLight.userData.auroraTerrainTileLightRadiusProofStatus =
      "source-backed-fx_flame01-auroralight01-radius-controller";
    tileLight.userData.auroraTerrainTileLightFalloffFormula =
      "max(0,1-distance/radius)";
    tileLight.userData.auroraTerrainTileLightFalloffProofStatus =
      "source-backed-active-light-linear-radius-falloff";
    tileLight.userData.auroraTerrainTileLightIntensitySource =
      "C:/Projects/New Folder/export/decompiled_all.c:866543-866563 accumulates active light as color * max(0,1-distance/radius) * multiplier; Aurora Web stores normalized RGB in Three.Color and RGB max in Three.PointLight.intensity";
    tileLight.userData.auroraTerrainTileLightIntensityProofStatus =
      "source-backed-tile-source-lightcolor-rgb-preserved-multiplier-neutral-fallback";
    tileLight.userData.auroraTerrainTileLightFalloffRendererPatchStatus =
      "already-installed";
    tileLight.userData.auroraTerrainTileLightFalloffRendererProofStatus =
      AURORA_THREE_LINEAR_LIGHT_FALLOFF_PROOF_STATUS;
    tileLight.userData.auroraTerrainTileLightFalloffRendererSource =
      AURORA_THREE_LINEAR_LIGHT_FALLOFF_SOURCE;
    tileLight.userData.auroraTerrainTileLightSourceModelFileName = "fx_flame01.mdl";
    tileLight.userData.auroraTerrainTileLightSourceRadius = 7;
    tileLight.userData.auroraTerrainTileLightSourceRadiusUnits = "aurora-model-units";
    tileLight.userData.auroraTerrainTileLightSourceUnitScale = 0.1;
    tileLight.userData.auroraTerrainTileLightSourceRadiusWorldDistance = 0.7;
    tileLight.userData.auroraTerrainTileLightBudgetRank = 3;
    tileLight.userData.auroraTerrainTileLightBudgetAccepted = false;
    scene.add(tileLight);

    const progFxRequest = new THREE.Group();
    progFxRequest.userData.auroraVfxProgFxType4ProofStatus =
      "source-backed-progfx-type4-owner-phase-effect-instance-runtime-retail-unverified";
    progFxRequest.userData.auroraVfxProgFxType4RowId = 304;
    progFxRequest.userData.auroraVfxProgFxType4Label = "LightBlue5m";
    progFxRequest.userData.auroraVfxProgFxType4Animation = "Blue_5m";
    progFxRequest.userData.auroraVfxProgFxType4AnimationKind = "light";
    progFxRequest.userData.auroraVfxProgFxType4CastShadows = false;
    scene.add(progFxRequest);

    const genericLight = new THREE.PointLight(0xffffff, 0.25, 2, 2);
    scene.add(genericLight);

    const diagnostics = resolveAuroraScenePointLightDiagnostics(scene);

    expect(diagnostics.proofStatus).toBe(AURORA_SCENE_LIGHT_DIAGNOSTIC_PROOF_STATUS);
    expect(diagnostics.retailOrderingStatus).toBe(
      AURORA_SCENE_LIGHT_RETAIL_ORDERING_STATUS
    );
    expect(diagnostics.retailOrderingProofSource).toBe(
      AURORA_SCENE_LIGHT_RETAIL_ORDERING_PROOF_SOURCE
    );
    expect(diagnostics.retailOrderingProofSource).toContain(
      "indirectVtableSlotCallEvidence proofStatus=capstone-free-lightmanager-vtable-slot-indirect-call-candidates-register-dataflow-blocked"
    );
    expect(diagnostics.retailOrderingProofSource).toContain(
      "slotCounts PrioritizeLights=5298/AddLight=617/RemoveLight=2520/UpdateLights=191"
    );
    expect(diagnostics.retailOrderingProofSource).toContain(
      "sampledCandidateCount=192 sampledCandidatesWithKnownDirectCallContextCount=16"
    );
    expect(diagnostics.retailOrderingProofSource).toContain(
      "sampledKnownDirectCallTargetSummary GetShadowLights=21/GetEmitterLighting=20"
    );
    expect(diagnostics.retailOrderingProofStatus).toBe(
      AURORA_SCENE_LIGHT_RETAIL_ORDERING_PROOF_STATUS
    );
    expect(diagnostics.retailOrderingManagerInternalInsertionSource).toBe(
      AURORA_SCENE_LIGHT_MANAGER_INTERNAL_INSERTION_SOURCE
    );
    expect(diagnostics.retailOrderingManagerInternalInsertionProofStatus).toBe(
      AURORA_SCENE_LIGHT_MANAGER_INTERNAL_INSERTION_PROOF_STATUS
    );
    expect(diagnostics.retailOrderingManagerCrossLaneCallsiteBlocker).toBe(
      AURORA_SCENE_LIGHT_MANAGER_CROSS_LANE_CALLSITE_BLOCKER
    );
    expect(diagnostics.retailOrderingManagerCrossLaneCallsiteBlocker).toContain(
      "indirect slot-offset candidates plus their sampled same-function direct-call context are helper/render/collect inventory without receiver/lane data-flow"
    );
    expect(diagnostics.retailOrderingSortScoreSource).toBe(
      AURORA_SCENE_LIGHT_RETAIL_SORT_SCORE_SOURCE
    );
    expect(diagnostics.retailOrderingSortScoreFormula).toBe(
      AURORA_SCENE_LIGHT_RETAIL_SORT_SCORE_FORMULA
    );
    expect(diagnostics.retailOrderingSortDirection).toBe(
      AURORA_SCENE_LIGHT_RETAIL_SORT_DIRECTION
    );
    expect(diagnostics.retailOrderingSortScoreProofStatus).toBe(
      AURORA_SCENE_LIGHT_RETAIL_SORT_SCORE_PROOF_STATUS
    );
    expect(diagnostics.retailOrderingCoverageStatus).toBe(
      AURORA_SCENE_LIGHT_RETAIL_ORDERING_COVERAGE_COMPLETE_STATUS
    );
    expect(diagnostics.retailOrderingRequiredLanes).toEqual([
      ...AURORA_SCENE_LIGHT_RETAIL_ORDERING_REQUIRED_LANES
    ]);
    expect(diagnostics.retailOrderingMissingLanes).toEqual([]);
    expect(diagnostics.retailOrderingObservedLanes).toEqual([
      "generic-three-point-light",
      "item-property-light",
      "placeables-2da-light",
      "progfx-type4-light-request",
      "source-mdl-light-node",
      "terrain-tile-light"
    ]);
    expect(diagnostics.retailOrderingObservedLanesSource).toBe(
      AURORA_SCENE_LIGHT_OBSERVED_LANES_SOURCE
    );
    expect(diagnostics.retailOrderingRuntimeProbeStatus).toBe(
      AURORA_SCENE_LIGHT_RETAIL_ORDERING_RUNTIME_PROBE_COMPLETE_STATUS
    );
    expect(diagnostics.retailOrderingRuntimeProbeProofSource).toBe(
      AURORA_SCENE_LIGHT_RETAIL_ORDERING_RUNTIME_PROBE_PROOF_SOURCE
    );
    expect(diagnostics.retailOrderingRuntimeProbeBlocker).toBe(
      AURORA_SCENE_LIGHT_RETAIL_ORDERING_RUNTIME_PROBE_BLOCKER
    );
    expect(diagnostics.retailOrderingRuntimeProbeLocalOrderSource).toBe(
      AURORA_SCENE_LIGHT_RETAIL_ORDERING_RUNTIME_PROBE_LOCAL_ORDER_SOURCE
    );
    expect(diagnostics.retailOrderingRuntimeProbeRequiredLaneCoverageCount).toBe(5);
    expect(diagnostics.retailOrderingRuntimeProbePointLightSampleCount).toBe(4);
    expect(diagnostics.retailOrderingRuntimeProbeNonPointRequestSampleCount).toBe(1);
    expect(diagnostics.retailOrderingRuntimeProbeBudgetAcceptedLanes).toEqual([
      "item-property-light",
      "source-mdl-light-node"
    ]);
    expect(diagnostics.retailOrderingRuntimeProbeBudgetDroppedLanes).toEqual([
      "terrain-tile-light"
    ]);
    expect(diagnostics.retailOrderingRuntimeProbeBudgetUnknownLanes).toEqual([
      "placeables-2da-light"
    ]);
    expect(diagnostics.retailOrderingRuntimeProbeLocalOrderSamples).toEqual([
      expect.stringContaining(
        "lane=item-property-light;kind=point-light;name=VFX_DUR_LIGHT_RED_20;localOrderKey=1"
      ),
      expect.stringContaining(
        "lane=source-mdl-light-node;kind=point-light;name=pulsing_light03;localOrderKey=2"
      ),
      expect.stringContaining(
        "lane=terrain-tile-light;kind=point-light;name=tile-0-0;localOrderKey=3"
      ),
      expect.stringContaining(
        "lane=placeables-2da-light;kind=point-light;name=PaleYellow;localOrderKey=20001"
      ),
      expect.stringContaining(
        "lane=progfx-type4-light-request;kind=progfx-type4-request-not-pointlight;name=LightBlue5m;localOrderKey=30000"
      )
    ]);
    expect(diagnostics.retailOrderingPreviewBudgetPlanStatus).toBe(
      AURORA_SCENE_LIGHT_MANAGER_PREVIEW_BUDGET_PLAN_STATUS
    );
    expect(diagnostics.retailOrderingPreviewBudgetPlanStrategy).toContain(
      "global-budget"
    );
    expect(diagnostics.retailOrderingPreviewBudgetPlanProofSource).toContain(
      "FUN_00a41e30 caps uploaded active slots"
    );
    expect(diagnostics.retailOrderingPreviewBudgetPlanProofStatus).toBe(
      "source-backed-retail-score-sort-slot-cap-preview-camera-field-fallback"
    );
    expect(diagnostics.retailOrderingPreviewBudgetPlanBlocker).toBe(
      AURORA_SCENE_LIGHT_MANAGER_PREVIEW_BUDGET_PLAN_BLOCKER
    );
    expect(diagnostics.retailOrderingPreviewBudgetPlanSamples).toHaveLength(4);
    expect(diagnostics.retailOrderingPreviewBudgetPlanSamples[0]).toContain(
      "rank=1;accepted=true"
    );
    expect(diagnostics.retailOrderingPreviewBudgetPlanSamples.join("|")).toContain(
      "retailPrecedence=blocked"
    );
    expect(diagnostics.samples.join("|")).toContain(
      "retailScore=0.1938;retailScorePriority=1;retailScorePreviewDistance=3.1;retailScoreSourceRadius=3"
    );
    expect(diagnostics.samples.join("|")).toContain(
      "retailScoreActiveSelectionRadiusLimit=unknown;retailScoreActiveSelectionRadiusEnforced=unknown;retailScoreActiveSelectionRadiusPassed=unknown"
    );
    expect(diagnostics.samples.join("|")).toContain(
      "retailScoreMultiplier=1;retailScoreField0x70=0;retailScoreRuntimeExtent=1;retailScoreRangeTerm=3"
    );
    expect(diagnostics.samples.join("|")).toContain(
      "retailScoreSource=C:/Projects/New Folder/export/decompiled_all.c:865838-865929 FUN_00a41850 writes LightManager score +0x84"
    );
    expect(diagnostics.budgetMode).toBe(AURORA_SCENE_LIGHT_BUDGET_MODE);
    expect(diagnostics.previewBudgetCapSource).toBe(AURORA_SCENE_LIGHT_ACTIVE_SLOT_CAP_SOURCE);
    expect(diagnostics.previewBudgetCapProofStatus).toBe(
      AURORA_SCENE_LIGHT_BUDGET_CAP_PROOF_STATUS
    );
    expect(diagnostics.pointLightCount).toBe(5);
    expect(diagnostics.sourceBackedPointLightCount).toBe(4);
    expect(diagnostics.laneCounts).toEqual({
      "generic-three-point-light": 1,
      "item-property-light": 1,
      "placeables-2da-light": 1,
      "source-mdl-light-node": 1,
      "terrain-tile-light": 1
    });
    expect(diagnostics.previewBudgetCap).toBe(2);
    expect(diagnostics.previewBudgetAcceptedCount).toBe(2);
    expect(diagnostics.previewBudgetDroppedCount).toBe(2);
    expect(diagnostics.samples.join("|")).toContain("lane=item-property-light");
    expect(diagnostics.samples.join("|")).toContain("name=VFX_DUR_LIGHT_RED_20");
    expect(diagnostics.samples.join("|")).toContain(
      "itemVfxRow=168;itemVfxConstant=VFX_DUR_LIGHT_RED_20;itemVfxLabel=VFX_DUR_LIGHT_RED_20"
    );
    expect(diagnostics.samples.join("|")).toContain(
      "itemProgFxRow=315;itemProgFxLabel=LightRed20m;itemProgFxFadeRow=365;itemProgFxFadeLabel=FadeLRed20m"
    );
    expect(diagnostics.samples.join("|")).toContain("itemProgFxAnimation=Red_20m");
    expect(diagnostics.samples.join("|")).toContain(
      "falloff=source-family max(0,1-distance/13.3)"
    );
    expect(diagnostics.samples.join("|")).toContain(
      "falloffProof=source-family-backed-fx_light_clr-mdl-radius-linear-falloff-itemproperty-scheduler-unverified"
    );
    expect(diagnostics.samples.join("|")).toContain(
      `falloffRendererProof=${AURORA_THREE_LINEAR_LIGHT_FALLOFF_PROOF_STATUS}`
    );
    expect(diagnostics.samples.join("|")).toContain(
      `falloffRendererSource=${AURORA_THREE_LINEAR_LIGHT_FALLOFF_SOURCE}`
    );
    expect(diagnostics.samples.join("|")).toContain(
      "sourceRadius=13.3;sourceRadiusUnits=meters;sourceRadiusWorldScale=0.1;sourceRadiusWorldDistance=1.33"
    );
    expect(diagnostics.samples.join("|")).toContain("lane=placeables-2da-light");
    expect(diagnostics.samples.join("|")).toContain("name=PaleYellow");
    expect(diagnostics.samples.join("|")).toContain(
      "sourceRadius=10;sourceRadiusUnits=aurora-model-units;sourceRadiusWorldScale=0.4;sourceRadiusWorldDistance=4"
    );
    expect(diagnostics.samples.join("|")).toContain("lane=terrain-tile-light");
    expect(diagnostics.samples.join("|")).toContain(
      "intensityProof=source-backed-tile-source-lightcolor-rgb-preserved-multiplier-neutral-fallback"
    );
    expect(diagnostics.samples.join("|")).toContain("sourceModel=fx_flame01.mdl");
    expect(diagnostics.samples.join("|")).toContain(
      "sourceRadius=7;sourceRadiusUnits=aurora-model-units;sourceRadiusWorldScale=0.1;sourceRadiusWorldDistance=0.7"
    );
    expect(diagnostics.samples.join("|")).toContain(
      "radiusProof=source-backed-fx_flame01-auroralight01-radius-controller"
    );
    expect(diagnostics.samples.join("|")).toContain("lane=source-mdl-light-node");
    expect(diagnostics.samples.join("|")).toContain(
      "sourceRadius=3;sourceRadiusUnits=aurora-model-units;sourceRadiusWorldScale=0.5;sourceRadiusWorldDistance=1.5"
    );
    expect(diagnostics.nonPointLightRequestCount).toBe(1);
    expect(diagnostics.nonPointLightRequestSamples.join("|")).toContain(
      "lane=progfx-type4-light-request;row=304;label=LightBlue5m"
    );
    expect(diagnostics.shadow.proofStatus).toBe(AURORA_SCENE_SHADOW_DIAGNOSTIC_PROOF_STATUS);
    expect(diagnostics.shadow.retailProjectionStatus).toBe(
      AURORA_SCENE_SHADOW_RETAIL_PROJECTION_STATUS
    );
    expect(diagnostics.shadow.retailProjectionSource).toBe(
      AURORA_SCENE_SHADOW_RETAIL_PROJECTION_SOURCE
    );
    expect(diagnostics.shadow.retailProjectionSource).toContain(
      "shaderUniformEvidence proofStatus=source-backed-shadowvol-shader-bind-transform-and-uniform-slot-writes-exposed"
    );
    expect(diagnostics.shadow.retailProjectionSource).toContain(
      "900870-900884 FUN_00a7278c writes vec4 uniforms"
    );
    expect(diagnostics.shadow.retailProjectionShaderNames).toEqual([
      ...AURORA_SCENE_SHADOW_RETAIL_PROJECTION_SHADER_NAMES
    ]);
    expect(diagnostics.shadow.retailProjectionLightProfileSource).toBe(
      AURORA_SCENE_SHADOW_RETAIL_PROJECTION_LIGHT_PROFILE_SOURCE
    );
    expect(diagnostics.shadow.retailProjectionLightProfileStatus).toBe(
      AURORA_SCENE_SHADOW_RETAIL_PROJECTION_LIGHT_PROFILE_STATUS
    );
    expect(diagnostics.shadow.retailProjectionGeometrySource).toBe(
      AURORA_SCENE_SHADOW_RETAIL_PROJECTION_GEOMETRY_SOURCE
    );
    expect(diagnostics.shadow.retailProjectionGeometryStatus).toBe(
      AURORA_SCENE_SHADOW_RETAIL_PROJECTION_GEOMETRY_STATUS
    );
    expect(diagnostics.shadow.retailProjectionRenderBuckets).toEqual([
      ...AURORA_SCENE_SHADOW_RETAIL_PROJECTION_RENDER_BUCKETS
    ]);
    expect(diagnostics.shadow.retailProjectionProofStatus).toBe(
      AURORA_SCENE_SHADOW_RETAIL_PROJECTION_PROOF_STATUS
    );
    expect(diagnostics.shadow.retailProjectionBlocker).toBe(
      AURORA_SCENE_SHADOW_RETAIL_PROJECTION_BLOCKER
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeStatus).toBe(
      AURORA_SCENE_SHADOW_VOLUME_RUNTIME_PROBE_NOT_OBSERVED_STATUS
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeProofSource).toBe(
      AURORA_SCENE_SHADOW_VOLUME_RUNTIME_PROBE_PROOF_SOURCE
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeBlocker).toBe(
      AURORA_SCENE_SHADOW_VOLUME_RUNTIME_PROBE_BLOCKER
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeLocalPixelProofStatus).toBe(
      AURORA_SCENE_SHADOW_VOLUME_RUNTIME_PROBE_LOCAL_PIXEL_STATUS
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeActiveCasterCount).toBe(0);
    expect(
      diagnostics.shadow.retailProjectionRuntimeProbeProjectionPreviewCount
    ).toBe(0);
    expect(diagnostics.shadow.retailProjectionRuntimeProbeStencilReceiverCount).toBe(0);
    expect(
      diagnostics.shadow.retailProjectionRuntimeProbeStencilVolumePassCount
    ).toBe(0);
    expect(diagnostics.shadow.retailProjectionRuntimeProbeExpectedStencilPasses).toEqual([
      ...AURORA_SCENE_SHADOW_VOLUME_RUNTIME_PROBE_EXPECTED_STENCIL_PASSES
    ]);
    expect(diagnostics.shadow.retailProjectionRuntimeProbeObservedStencilPasses).toEqual(
      []
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeSamples).toEqual([]);
    expect(diagnostics.shadow.pointLightCastShadowCount).toBe(1);
    expect(diagnostics.shadow.itemPropertyLightShadowPolicyCount).toBe(1);
    expect(diagnostics.shadow.itemPropertyLightShadowPolicySamples).toEqual([
      expect.stringContaining(
        "lane=item-property-light;name=VFX_DUR_LIGHT_RED_20;status=enabled-by-progfx-param3;proof=source-backed-progfx-type4-param3-item-light-shadow-toggle-shadowvol-projection-blocked"
      )
    ]);
    expect(diagnostics.shadow.itemPropertyLightShadowPolicySamples[0]).toContain(
      "brightness=Bright;color=Red"
    );
    expect(diagnostics.shadow.itemPropertyLightShadowPolicySamples[0]).toContain(
      "runtimeSchedulerSource=nwmain.exe ApplyLight 0x140472270..0x1404723e4 maps color byte [CNWItemProperty+9] to VFX_DUR_LIGHT base rows 153/157/161/165/177/169/173 and brightness word [CNWItemProperty+6] adds 0..3"
    );
    expect(diagnostics.shadow.itemPropertyLightShadowPolicySamples[0]).toContain(
      "runtimeSchedulerBlocker=Retail ApplyLight bridge, retail KEY/BIF item-light tables, object-level looping VFX owner add/remove, CNWSMessage last-update copy/diff, CNWSMessage game-object update serialization, client receive/render/Gob instantiation through CNWCMessage/CNWCObject/NewCAurObject, generic MdlNodeLight PartLight creation/Gob-list attach, and progfx.2da Param3 item-light shadow toggle are recovered, but cross-lane insertion order and retail shadow-volume projection parity are not recovered"
    );
    expect(diagnostics.shadow.itemPropertyLightShadowPolicySamples[0]).toContain(
      "shadowPolicySource=nwn_base.key progfx.2da Type 4 item-light rows 300..327 and fade rows 350..377 use Param3 as cast shadows: 5m rows have 0, 10m/15m/20m rows have 1"
    );
    expect(diagnostics.shadow.itemPropertyLightShadowPolicySamples[0]).toContain(
      "visualEffectRow=168;visualEffectConstant=VFX_DUR_LIGHT_RED_20;visualEffectLabel=VFX_DUR_LIGHT_RED_20"
    );
    expect(diagnostics.shadow.itemPropertyLightShadowPolicySamples[0]).toContain(
      "progFxRow=315;progFxLabel=LightRed20m;progFxFadeRow=365;progFxFadeLabel=FadeLRed20m"
    );
    expect(diagnostics.shadow.itemPropertyLightShadowPolicySamples[0]).toContain(
      "progFxAnimation=Red_20m"
    );
    expect(diagnostics.shadow.itemPropertyLightShadowPolicySamples[0]).toContain(
      "castShadow=true"
    );
    expect(diagnostics.shadow.directionalLightCastShadowCount).toBe(0);
    expect(diagnostics.shadow.progFxType4ShadowRequestCount).toBe(0);
  });

  it("keeps the visualeffects.2da Green label separate from the nwscript GREY alias", () => {
    const scene = new THREE.Scene();
    const itemLight = new THREE.PointLight(0x80ff40, 1, 13.3, 1);
    itemLight.userData.itemPropertyLightPreviewRole = "item-property-point-light";
    itemLight.userData.itemPropertyLightRelatedVisualEffectRowId = 177;
    itemLight.userData.itemPropertyLightRelatedVisualEffectConstant = "VFX_DUR_LIGHT_GREY_5";
    itemLight.userData.itemPropertyLightRelatedVisualEffectLabel = "VFX_DUR_LIGHT_GREEN_5";
    itemLight.userData.itemPropertyLightRelatedVisualEffectLabelSource =
      "visualeffects.2da rows 153..180; rows 177..180 are labeled VFX_DUR_LIGHT_GREEN_* while nwscript.nss exposes same ids as VFX_DUR_LIGHT_GREY_*";
    itemLight.userData.itemPropertyLightRelatedProgFxRowId = 324;
    itemLight.userData.itemPropertyLightRelatedProgFxLabel = "LightGreen5m";
    itemLight.userData.itemPropertyLightRelatedProgFxFadeRowId = 374;
    itemLight.userData.itemPropertyLightRelatedProgFxFadeLabel = "FadeLGreen5m";
    itemLight.userData.itemPropertyLightRelatedProgFxRowSource =
      "visualeffects.2da rows 153..180 map each VFX_DUR_LIGHT_* row to explicit progfx.2da Type 4 normal/fade rows; ordering is White, Blue, Yellow, Red, Orange, Purple, Green in progfx.2da and must not be derived by visualeffects row offset";
    itemLight.userData.itemPropertyLightRelatedProgFxAnimation = "Gren_5m";
    itemLight.userData.itemPropertyLightBrightnessLabel = "Dim";
    itemLight.userData.itemPropertyLightColorLabel = "Green";
    scene.add(itemLight);

    const diagnostics = resolveAuroraScenePointLightDiagnostics(scene);

    expect(diagnostics.samples).toEqual([
      expect.stringContaining("name=VFX_DUR_LIGHT_GREEN_5")
    ]);
    expect(diagnostics.samples[0]).toContain(
      "itemVfxRow=177;itemVfxConstant=VFX_DUR_LIGHT_GREY_5;itemVfxLabel=VFX_DUR_LIGHT_GREEN_5"
    );
    expect(diagnostics.samples[0]).toContain(
      "itemProgFxRow=324;itemProgFxLabel=LightGreen5m;itemProgFxFadeRow=374;itemProgFxFadeLabel=FadeLGreen5m"
    );
    expect(diagnostics.samples[0]).toContain("itemProgFxAnimation=Gren_5m");
    expect(diagnostics.shadow.itemPropertyLightShadowPolicySamples).toEqual([
      expect.stringContaining(
        "visualEffectRow=177;visualEffectConstant=VFX_DUR_LIGHT_GREY_5;visualEffectLabel=VFX_DUR_LIGHT_GREEN_5"
      )
    ]);
    expect(diagnostics.shadow.itemPropertyLightShadowPolicySamples[0]).toContain(
      "progFxRow=324;progFxLabel=LightGreen5m;progFxFadeRow=374;progFxFadeLabel=FadeLGreen5m"
    );
    expect(diagnostics.shadow.itemPropertyLightShadowPolicySamples[0]).toContain(
      "progFxAnimation=Gren_5m"
    );
  });

  it("writes scene and dataset proof fields while applying the source-backed light budget", () => {
    const scene = new THREE.Scene();
    scene.userData.auroraLightConfiguredMaxLights = 1;
    const light = new THREE.PointLight(0xffcc66, 1, 5, 2);
    light.userData.placeableTwoDaLightPreviewRole = "placeables-2da-point-light";
    scene.add(light);
    const droppedLight = new THREE.PointLight(0xff8844, 1, 4, 1);
    droppedLight.position.set(10, 0, 0);
    droppedLight.userData.auroraLightPreviewRole = "source-mdl-point-light";
    droppedLight.userData.auroraLightNodeName = "AuroraLight01";
    scene.add(droppedLight);
    const dataset: Record<string, string> = {};

    const diagnostics = writeAuroraScenePointLightDiagnostics({
      scene,
      container: { dataset }
    });

    expect(diagnostics.sourceBackedPointLightCount).toBe(2);
    expect(light.visible).toBe(true);
    expect(light.intensity).toBe(1);
    expect(droppedLight.visible).toBe(false);
    expect(droppedLight.intensity).toBe(1);
    expect(droppedLight.userData.auroraSceneLightBudgetAccepted).toBe(false);
    expect(scene.userData.auroraScenePointLightRetailOrderingStatus).toBe(
      AURORA_SCENE_LIGHT_RETAIL_ORDERING_STATUS
    );
    expect(scene.userData.auroraScenePointLightRetailOrderingProofSource).toBe(
      AURORA_SCENE_LIGHT_RETAIL_ORDERING_PROOF_SOURCE
    );
    expect(scene.userData.auroraScenePointLightRetailOrderingProofStatus).toBe(
      AURORA_SCENE_LIGHT_RETAIL_ORDERING_PROOF_STATUS
    );
    expect(
      scene.userData
        .auroraScenePointLightRetailOrderingManagerInternalInsertionSource
    ).toBe(AURORA_SCENE_LIGHT_MANAGER_INTERNAL_INSERTION_SOURCE);
    expect(
      scene.userData
        .auroraScenePointLightRetailOrderingManagerInternalInsertionProofStatus
    ).toBe(AURORA_SCENE_LIGHT_MANAGER_INTERNAL_INSERTION_PROOF_STATUS);
    expect(
      scene.userData
        .auroraScenePointLightRetailOrderingManagerCrossLaneCallsiteBlocker
    ).toBe(AURORA_SCENE_LIGHT_MANAGER_CROSS_LANE_CALLSITE_BLOCKER);
    expect(scene.userData.auroraScenePointLightRetailOrderingSortScoreSource).toBe(
      AURORA_SCENE_LIGHT_RETAIL_SORT_SCORE_SOURCE
    );
    expect(scene.userData.auroraScenePointLightRetailOrderingSortScoreFormula).toBe(
      AURORA_SCENE_LIGHT_RETAIL_SORT_SCORE_FORMULA
    );
    expect(scene.userData.auroraScenePointLightRetailOrderingSortDirection).toBe(
      AURORA_SCENE_LIGHT_RETAIL_SORT_DIRECTION
    );
    expect(
      scene.userData.auroraScenePointLightRetailOrderingSortScoreProofStatus
    ).toBe(AURORA_SCENE_LIGHT_RETAIL_SORT_SCORE_PROOF_STATUS);
    expect(scene.userData.auroraScenePointLightRetailOrderingCoverageStatus).toBe(
      "missing-required-light-lane-observations-ordering-still-blocked"
    );
    expect(scene.userData.auroraScenePointLightRetailOrderingRequiredLanes).toEqual([
      ...AURORA_SCENE_LIGHT_RETAIL_ORDERING_REQUIRED_LANES
    ]);
    expect(scene.userData.auroraScenePointLightRetailOrderingObservedLanes).toEqual([
      "placeables-2da-light",
      "source-mdl-light-node"
    ]);
    expect(
      scene.userData.auroraScenePointLightRetailOrderingObservedLanesSource
    ).toBe(AURORA_SCENE_LIGHT_OBSERVED_LANES_SOURCE);
    expect(scene.userData.auroraScenePointLightRetailOrderingMissingLanes).toEqual([
      "terrain-tile-light",
      "item-property-light",
      "progfx-type4-light-request"
    ]);
    expect(
      scene.userData.auroraScenePointLightRetailOrderingRuntimeProbeStatus
    ).toBe(AURORA_SCENE_LIGHT_RETAIL_ORDERING_RUNTIME_PROBE_INCOMPLETE_STATUS);
    expect(
      scene.userData.auroraScenePointLightRetailOrderingRuntimeProbeProofSource
    ).toBe(AURORA_SCENE_LIGHT_RETAIL_ORDERING_RUNTIME_PROBE_PROOF_SOURCE);
    expect(
      scene.userData.auroraScenePointLightRetailOrderingRuntimeProbeBlocker
    ).toBe(AURORA_SCENE_LIGHT_RETAIL_ORDERING_RUNTIME_PROBE_BLOCKER);
    expect(
      scene.userData.auroraScenePointLightRetailOrderingRuntimeProbeLocalOrderSource
    ).toBe(AURORA_SCENE_LIGHT_RETAIL_ORDERING_RUNTIME_PROBE_LOCAL_ORDER_SOURCE);
    expect(
      scene.userData
        .auroraScenePointLightRetailOrderingRuntimeProbeRequiredLaneCoverageCount
    ).toBe(2);
    expect(
      scene.userData
        .auroraScenePointLightRetailOrderingRuntimeProbePointLightSampleCount
    ).toBe(2);
    expect(
      scene.userData
        .auroraScenePointLightRetailOrderingRuntimeProbeNonPointRequestSampleCount
    ).toBe(0);
    expect(
      scene.userData
        .auroraScenePointLightRetailOrderingRuntimeProbeBudgetAcceptedLanes
    ).toEqual(["placeables-2da-light"]);
    expect(
      scene.userData
        .auroraScenePointLightRetailOrderingRuntimeProbeBudgetDroppedLanes
    ).toEqual(["source-mdl-light-node"]);
    expect(
      scene.userData
        .auroraScenePointLightRetailOrderingRuntimeProbeBudgetUnknownLanes
    ).toEqual([]);
    expect(
      scene.userData.auroraScenePointLightRetailOrderingRuntimeProbeLocalOrderSamples
    ).toEqual([
      expect.stringContaining(
        "lane=placeables-2da-light;kind=point-light;name=point-light;localOrderKey=1"
      ),
      expect.stringContaining(
        "lane=source-mdl-light-node;kind=point-light;name=AuroraLight01;localOrderKey=2"
      )
    ]);
    expect(dataset.scenePointLightBudgetMode).toBe(AURORA_SCENE_LIGHT_BUDGET_MODE);
    expect(dataset.scenePointLightRetailOrderingCoverageStatus).toBe(
      "missing-required-light-lane-observations-ordering-still-blocked"
    );
    expect(dataset.scenePointLightRetailOrderingProofSource).toBe(
      AURORA_SCENE_LIGHT_RETAIL_ORDERING_PROOF_SOURCE
    );
    expect(dataset.scenePointLightRetailOrderingProofStatus).toBe(
      AURORA_SCENE_LIGHT_RETAIL_ORDERING_PROOF_STATUS
    );
    expect(
      dataset.scenePointLightRetailOrderingManagerInternalInsertionSource
    ).toBe(AURORA_SCENE_LIGHT_MANAGER_INTERNAL_INSERTION_SOURCE);
    expect(
      dataset.scenePointLightRetailOrderingManagerInternalInsertionProofStatus
    ).toBe(AURORA_SCENE_LIGHT_MANAGER_INTERNAL_INSERTION_PROOF_STATUS);
    expect(
      dataset.scenePointLightRetailOrderingManagerCrossLaneCallsiteBlocker
    ).toBe(AURORA_SCENE_LIGHT_MANAGER_CROSS_LANE_CALLSITE_BLOCKER);
    expect(dataset.scenePointLightRetailOrderingSortScoreSource).toBe(
      AURORA_SCENE_LIGHT_RETAIL_SORT_SCORE_SOURCE
    );
    expect(dataset.scenePointLightRetailOrderingSortScoreFormula).toBe(
      AURORA_SCENE_LIGHT_RETAIL_SORT_SCORE_FORMULA
    );
    expect(dataset.scenePointLightRetailOrderingSortDirection).toBe(
      AURORA_SCENE_LIGHT_RETAIL_SORT_DIRECTION
    );
    expect(dataset.scenePointLightRetailOrderingSortScoreProofStatus).toBe(
      AURORA_SCENE_LIGHT_RETAIL_SORT_SCORE_PROOF_STATUS
    );
    expect(dataset.scenePointLightRetailOrderingRequiredLanes).toBe(
      "terrain-tile-light|placeables-2da-light|source-mdl-light-node|item-property-light|progfx-type4-light-request"
    );
    expect(dataset.scenePointLightRetailOrderingObservedLanes).toBe(
      "placeables-2da-light|source-mdl-light-node"
    );
    expect(dataset.scenePointLightRetailOrderingObservedLanesSource).toBe(
      AURORA_SCENE_LIGHT_OBSERVED_LANES_SOURCE
    );
    expect(dataset.scenePointLightRetailOrderingMissingLanes).toBe(
      "terrain-tile-light|item-property-light|progfx-type4-light-request"
    );
    expect(dataset.scenePointLightRetailOrderingRuntimeProbeStatus).toBe(
      AURORA_SCENE_LIGHT_RETAIL_ORDERING_RUNTIME_PROBE_INCOMPLETE_STATUS
    );
    expect(dataset.scenePointLightRetailOrderingRuntimeProbeProofSource).toBe(
      AURORA_SCENE_LIGHT_RETAIL_ORDERING_RUNTIME_PROBE_PROOF_SOURCE
    );
    expect(dataset.scenePointLightRetailOrderingRuntimeProbeBlocker).toBe(
      AURORA_SCENE_LIGHT_RETAIL_ORDERING_RUNTIME_PROBE_BLOCKER
    );
    expect(dataset.scenePointLightRetailOrderingRuntimeProbeLocalOrderSource).toBe(
      AURORA_SCENE_LIGHT_RETAIL_ORDERING_RUNTIME_PROBE_LOCAL_ORDER_SOURCE
    );
    expect(
      dataset.scenePointLightRetailOrderingRuntimeProbeRequiredLaneCoverageCount
    ).toBe("2");
    expect(dataset.scenePointLightRetailOrderingRuntimeProbePointLightSampleCount).toBe(
      "2"
    );
    expect(
      dataset.scenePointLightRetailOrderingRuntimeProbeNonPointRequestSampleCount
    ).toBe("0");
    expect(dataset.scenePointLightRetailOrderingRuntimeProbeBudgetAcceptedLanes).toBe(
      "placeables-2da-light"
    );
    expect(dataset.scenePointLightRetailOrderingRuntimeProbeBudgetDroppedLanes).toBe(
      "source-mdl-light-node"
    );
    expect(dataset.scenePointLightRetailOrderingRuntimeProbeBudgetUnknownLanes).toBe(
      ""
    );
    expect(dataset.scenePointLightRetailOrderingRuntimeProbeLocalOrderSamples).toContain(
      "lane=placeables-2da-light;kind=point-light;name=point-light;localOrderKey=1"
    );
    expect(dataset.scenePointLightPreviewBudgetCapSource).toBe(
      AURORA_SCENE_LIGHT_ACTIVE_SLOT_CAP_SOURCE
    );
    expect(dataset.scenePointLightPreviewBudgetCapProofStatus).toBe(
      AURORA_SCENE_LIGHT_BUDGET_CAP_PROOF_STATUS
    );
    expect(dataset.scenePointLightPreviewBudgetCap).toBe("1");
    expect(dataset.scenePointLightSamples).toContain("lane=placeables-2da-light");
    expect(dataset.sceneShadowProofStatus).toBe(AURORA_SCENE_SHADOW_DIAGNOSTIC_PROOF_STATUS);
    expect(dataset.sceneShadowRetailProjectionStatus).toBe(
      AURORA_SCENE_SHADOW_RETAIL_PROJECTION_STATUS
    );
    expect(scene.userData.auroraSceneShadowRetailProjectionSource).toBe(
      AURORA_SCENE_SHADOW_RETAIL_PROJECTION_SOURCE
    );
    expect(scene.userData.auroraSceneShadowRetailProjectionShaderNames).toEqual([
      ...AURORA_SCENE_SHADOW_RETAIL_PROJECTION_SHADER_NAMES
    ]);
    expect(
      scene.userData.auroraSceneShadowRetailProjectionLightProfileSource
    ).toBe(AURORA_SCENE_SHADOW_RETAIL_PROJECTION_LIGHT_PROFILE_SOURCE);
    expect(
      scene.userData.auroraSceneShadowRetailProjectionLightProfileStatus
    ).toBe(AURORA_SCENE_SHADOW_RETAIL_PROJECTION_LIGHT_PROFILE_STATUS);
    expect(scene.userData.auroraSceneShadowRetailProjectionGeometrySource).toBe(
      AURORA_SCENE_SHADOW_RETAIL_PROJECTION_GEOMETRY_SOURCE
    );
    expect(scene.userData.auroraSceneShadowRetailProjectionGeometryStatus).toBe(
      AURORA_SCENE_SHADOW_RETAIL_PROJECTION_GEOMETRY_STATUS
    );
    expect(scene.userData.auroraSceneShadowRetailProjectionRenderBuckets).toEqual([
      ...AURORA_SCENE_SHADOW_RETAIL_PROJECTION_RENDER_BUCKETS
    ]);
    expect(scene.userData.auroraSceneShadowRetailProjectionProofStatus).toBe(
      AURORA_SCENE_SHADOW_RETAIL_PROJECTION_PROOF_STATUS
    );
    expect(scene.userData.auroraSceneShadowRetailProjectionBlocker).toBe(
      AURORA_SCENE_SHADOW_RETAIL_PROJECTION_BLOCKER
    );
    expect(dataset.sceneShadowRetailProjectionSource).toBe(
      AURORA_SCENE_SHADOW_RETAIL_PROJECTION_SOURCE
    );
    expect(dataset.sceneShadowRetailProjectionShaderNames).toBe(
      "vs_shadowvol|fs_shadowvol"
    );
    expect(dataset.sceneShadowRetailProjectionLightProfileSource).toBe(
      AURORA_SCENE_SHADOW_RETAIL_PROJECTION_LIGHT_PROFILE_SOURCE
    );
    expect(dataset.sceneShadowRetailProjectionLightProfileStatus).toBe(
      AURORA_SCENE_SHADOW_RETAIL_PROJECTION_LIGHT_PROFILE_STATUS
    );
    expect(dataset.sceneShadowRetailProjectionGeometrySource).toBe(
      AURORA_SCENE_SHADOW_RETAIL_PROJECTION_GEOMETRY_SOURCE
    );
    expect(dataset.sceneShadowRetailProjectionGeometryStatus).toBe(
      AURORA_SCENE_SHADOW_RETAIL_PROJECTION_GEOMETRY_STATUS
    );
    expect(dataset.sceneShadowRetailProjectionRenderBuckets).toBe(
      "0xd|0xe|0xb|0xc"
    );
    expect(dataset.sceneShadowRetailProjectionProofStatus).toBe(
      AURORA_SCENE_SHADOW_RETAIL_PROJECTION_PROOF_STATUS
    );
    expect(dataset.sceneShadowRetailProjectionBlocker).toBe(
      AURORA_SCENE_SHADOW_RETAIL_PROJECTION_BLOCKER
    );
    expect(dataset.sceneShadowRetailProjectionRuntimeProbeStatus).toBe(
      AURORA_SCENE_SHADOW_VOLUME_RUNTIME_PROBE_NOT_OBSERVED_STATUS
    );
    expect(dataset.sceneShadowRetailProjectionRuntimeProbeProofSource).toBe(
      AURORA_SCENE_SHADOW_VOLUME_RUNTIME_PROBE_PROOF_SOURCE
    );
    expect(dataset.sceneShadowRetailProjectionRuntimeProbeBlocker).toBe(
      AURORA_SCENE_SHADOW_VOLUME_RUNTIME_PROBE_BLOCKER
    );
    expect(dataset.sceneShadowRetailProjectionRuntimeProbeLocalPixelProofStatus).toBe(
      AURORA_SCENE_SHADOW_VOLUME_RUNTIME_PROBE_LOCAL_PIXEL_STATUS
    );
    expect(dataset.sceneShadowRetailProjectionRuntimeProbeActiveCasterCount).toBe(
      "0"
    );
    expect(
      dataset.sceneShadowRetailProjectionRuntimeProbeProjectionPreviewCount
    ).toBe("0");
    expect(dataset.sceneShadowRetailProjectionRuntimeProbeStencilReceiverCount).toBe(
      "0"
    );
    expect(
      dataset.sceneShadowRetailProjectionRuntimeProbeStencilVolumePassCount
    ).toBe("0");
    expect(dataset.sceneShadowRetailProjectionRuntimeProbeExpectedStencilPasses).toBe(
      "back:zpass|front:zpass|back:zfail|front:zfail"
    );
    expect(dataset.sceneShadowRetailProjectionRuntimeProbeObservedStencilPasses).toBe(
      ""
    );
    expect(dataset.sceneShadowRetailProjectionRuntimeProbeSamples).toBe("");
    expect(dataset.sceneShadowItemPropertyLightShadowPolicyCount).toBe("0");
    expect(dataset.sceneShadowProgFxType4ShadowRequestCount).toBe("0");
  });

  it("reads creature source MDL light radius proof into scene-wide source-mdl samples", () => {
    const scene = new THREE.Scene();
    const creatureLight = new THREE.PointLight(0xffaa33, 1.5, 2, 1);
    creatureLight.userData.creatureAuroraLightPreviewRole = "source-mdl-point-light";
    creatureLight.userData.creatureAuroraLightNodeName = "glow_l";
    creatureLight.userData.creatureAuroraLightSourceNodeKind = "light";
    creatureLight.userData.creatureAuroraLightSourceModelFileName = "n_bear.mdl";
    creatureLight.userData.creatureAuroraLightSourceRadius = 2;
    creatureLight.userData.creatureAuroraLightSourceRadiusUnits = "aurora-model-units";
    creatureLight.userData.creatureAuroraLightSourceUnitScale = 1;
    creatureLight.userData.creatureAuroraLightSourceRadiusWorldDistance = 2;
    creatureLight.userData.creatureAuroraLightRadiusProofStatus =
      "source-backed-creature-mdl-light-radius-controller";
    creatureLight.userData.creatureAuroraLightFalloffFormula =
      "max(0,1-distance/radius)";
    creatureLight.userData.creatureAuroraLightFalloffProofStatus =
      "source-backed-active-light-linear-radius-falloff";
    creatureLight.userData.creatureAuroraLightFalloffRendererPatchStatus =
      "already-installed";
    creatureLight.userData.creatureAuroraLightFalloffRendererProofStatus =
      AURORA_THREE_LINEAR_LIGHT_FALLOFF_PROOF_STATUS;
    creatureLight.userData.creatureAuroraLightFalloffRendererSource =
      AURORA_THREE_LINEAR_LIGHT_FALLOFF_SOURCE;
    scene.add(creatureLight);

    const diagnostics = resolveAuroraScenePointLightDiagnostics(scene);

    expect(diagnostics.laneCounts).toEqual({ "source-mdl-light-node": 1 });
    expect(diagnostics.samples.join("|")).toContain(
      "lane=source-mdl-light-node;role=source-mdl-point-light;name=glow_l;source=light"
    );
    expect(diagnostics.samples.join("|")).toContain("sourceModel=n_bear.mdl");
    expect(diagnostics.samples.join("|")).toContain(
      "sourceRadius=2;sourceRadiusUnits=aurora-model-units;sourceRadiusWorldScale=1;sourceRadiusWorldDistance=2"
    );
    expect(diagnostics.samples.join("|")).toContain(
      "radiusProof=source-backed-creature-mdl-light-radius-controller"
    );
    expect(diagnostics.samples.join("|")).toContain(
      "falloffProof=source-backed-active-light-linear-radius-falloff"
    );
    expect(diagnostics.samples.join("|")).toContain(
      `falloffRendererProof=${AURORA_THREE_LINEAR_LIGHT_FALLOFF_PROOF_STATUS}`
    );
  });

  it("budgets source-backed ProgFX Type 4 PointLight previews with the shared light manager cap", () => {
    const scene = new THREE.Scene();
    scene.userData.auroraLightConfiguredMaxLights = 1;

    const placeableLight = new THREE.PointLight(0xffcc66, 1, 5, 1);
    placeableLight.userData.placeableTwoDaLightPreviewRole =
      "placeables-2da-point-light";
    placeableLight.userData.placeableTwoDaLightColorLabel = "PaleYellow";
    placeableLight.userData.placeableTwoDaLightColorSource = "lightcolor.2da.RGB";
    placeableLight.userData.placeableTwoDaLightSourceRadiusWorldDistance = 5;
    scene.add(placeableLight);

    const progFxLight = new THREE.PointLight(new THREE.Color(0.5, 0.5, 1), 1, 13.3, 1);
    progFxLight.position.set(10, 0, 0);
    progFxLight.userData.auroraVfxProgFxType4PreviewRole =
      "progfx-type4-point-light";
    progFxLight.userData.auroraVfxProgFxType4PointLightPreviewSource =
      "ProgFX Type 4 light request uses fx_light_clr.mdl AuroraLight01 source color/radius";
    progFxLight.userData.auroraVfxProgFxType4ProofStatus =
      "source-backed-progfx-type4-owner-phase-effect-instance-runtime-retail-unverified";
    progFxLight.userData.auroraVfxProgFxType4RowId = 304;
    progFxLight.userData.auroraVfxProgFxType4Label = "LightBlue5m";
    progFxLight.userData.auroraVfxProgFxType4Param1AnimationRaw = "Blue_5m";
    progFxLight.userData.auroraVfxProgFxType4Animation = "Blue_5m";
    progFxLight.userData.auroraVfxProgFxType4AnimationKind = "light";
    progFxLight.userData.auroraVfxProgFxType4SymbolicColor = "Blue";
    progFxLight.userData.auroraVfxProgFxType4SourceMdlNodeName = "AuroraLight01";
    progFxLight.userData.auroraVfxProgFxType4SourceMdlAnimation = "Blue_5m";
    progFxLight.userData.auroraVfxProgFxType4SourceMdlColor = [0.5, 0.5, 1];
    progFxLight.userData.auroraVfxProgFxType4SourceMdlRadiusMeters = 13.3;
    progFxLight.userData.auroraVfxProgFxType4SourceMdlRadiusFrames = [0, 13.3];
    progFxLight.userData.auroraVfxProgFxType4SourceMdlRadiusSource =
      "fx_light_clr.mdl AuroraLight01 radius animation Blue_5m";
    progFxLight.userData.auroraVfxProgFxType4SourceMdlRadiusProofStatus =
      "source-family-backed-fx_light_clr-mdl-animation-radius";
    progFxLight.userData.auroraVfxProgFxType4SourceMdlRadiusUnits = "meters";
    progFxLight.userData.auroraVfxProgFxType4SourceMdlRadiusWorldDistance = 13.3;
    progFxLight.userData.auroraVfxProgFxType4FalloffFormula =
      "max(0,1-distance/radius)";
    progFxLight.userData.auroraVfxProgFxType4FalloffProofStatus =
      "source-backed-fx_light_clr-radius-linear-preview-scheduler-blocked";
    progFxLight.userData.auroraVfxProgFxType4FalloffRendererPatchStatus =
      "already-installed";
    progFxLight.userData.auroraVfxProgFxType4FalloffRendererProofStatus =
      AURORA_THREE_LINEAR_LIGHT_FALLOFF_PROOF_STATUS;
    progFxLight.userData.auroraVfxProgFxType4FalloffRendererSource =
      AURORA_THREE_LINEAR_LIGHT_FALLOFF_SOURCE;
    progFxLight.userData.auroraVfxProgFxType4Param4PriorityRaw = "20";
    progFxLight.userData.auroraVfxProgFxType4Priority = 20;
    progFxLight.userData.auroraVfxProgFxType4Param4PriorityStatus =
      "docs-backed-progfx-type4-param4-priority-lower-value-wins";
    progFxLight.userData.auroraVfxProgFxType4ParameterSource =
      "progfx.2da Type 4 Param1/Param4";
    progFxLight.userData.auroraVfxProgFxType4RuntimeSchedulingStatus =
      "blocked-no-retail-runtime-scheduler-proof";
    scene.add(progFxLight);

    const dataset: Record<string, string> = {};
    const diagnostics = writeAuroraScenePointLightDiagnostics({
      scene,
      container: { dataset }
    });

    expect(diagnostics.laneCounts).toEqual({
      "placeables-2da-light": 1,
      "progfx-type4-light-request": 1
    });
    expect(diagnostics.nonPointLightRequestLaneCounts).toEqual({
      "progfx-type4-light-request": 1
    });
    expect(diagnostics.retailOrderingRuntimeProbePointLightSampleCount).toBe(2);
    expect(diagnostics.retailOrderingRuntimeProbeNonPointRequestSampleCount).toBe(1);
    expect(diagnostics.retailOrderingPreviewBudgetPlanAcceptedLanes).toEqual([
      "placeables-2da-light"
    ]);
    expect(diagnostics.retailOrderingPreviewBudgetPlanDroppedLanes).toEqual([
      "progfx-type4-light-request"
    ]);
    expect(placeableLight.visible).toBe(true);
    expect(progFxLight.visible).toBe(false);
    expect(progFxLight.userData.auroraSceneLightBudgetAccepted).toBe(false);
    expect(progFxLight.userData.auroraSceneLightBudgetDroppedReason).toBe(
      "active-light-slot-cap"
    );
    expect(diagnostics.samples.join("|")).toContain(
      "lane=progfx-type4-light-request;role=progfx-type4-point-light;name=LightBlue5m"
    );
    expect(diagnostics.samples.join("|")).toContain(
      "sourceRadius=13.3;sourceRadiusUnits=meters;sourceRadiusWorldScale=1;sourceRadiusWorldDistance=13.3"
    );
    expect(diagnostics.samples.join("|")).toContain(
      "radiusProof=source-family-backed-fx_light_clr-mdl-animation-radius"
    );
    expect(diagnostics.samples.join("|")).toContain(
      "falloff=max(0,1-distance/radius);falloffProof=source-backed-fx_light_clr-radius-linear-preview-scheduler-blocked"
    );
    expect(diagnostics.samples.join("|")).toContain(
      `falloffRendererProof=${AURORA_THREE_LINEAR_LIGHT_FALLOFF_PROOF_STATUS}`
    );
    expect(diagnostics.nonPointLightRequestSamples.join("|")).toContain(
      "lane=progfx-type4-light-request;row=304;label=LightBlue5m"
    );
    expect(
      scene.userData.auroraScenePointLightRetailOrderingRuntimeProbeBudgetDroppedLanes
    ).toEqual(["progfx-type4-light-request"]);
    expect(dataset.scenePointLightRetailOrderingRuntimeProbeBudgetDroppedLanes).toBe(
      "progfx-type4-light-request"
    );
  });

  it("tracks ProgFX Type 4 light, vision, and shadow requests separately from real PointLights", () => {
    const scene = new THREE.Scene();
    const lightGroup = new THREE.Group();
    lightGroup.userData.auroraVfxProgFxType4ProofStatus =
      "source-backed-progfx-type4-owner-phase-effect-instance-runtime-retail-unverified";
    lightGroup.userData.auroraVfxProgFxType4RowId = 304;
    lightGroup.userData.auroraVfxProgFxType4Label = "LightBlue5m";
    lightGroup.userData.auroraVfxProgFxType4Param1AnimationRaw = "Blue_5m";
    lightGroup.userData.auroraVfxProgFxType4Animation = "Blue_5m";
    lightGroup.userData.auroraVfxProgFxType4Param1AnimationStatus =
      "source-backed-progfx-type4-param1-animation-token-preserved";
    lightGroup.userData.auroraVfxProgFxType4AnimationKind = "light";
    lightGroup.userData.auroraVfxProgFxType4SymbolicColor = "Blue";
    lightGroup.userData.auroraVfxProgFxType4TokenRadiusMeters = 5;
    lightGroup.userData.auroraVfxProgFxType4TokenRadiusProofStatus =
      "source-backed-progfx-param1-animation-token-radius";
    lightGroup.userData.auroraVfxProgFxType4RadiusMeters = 13.3;
    lightGroup.userData.auroraVfxProgFxType4RadiusProofStatus =
      "source-family-backed-fx_light_clr-mdl-animation-radius";
    lightGroup.userData.auroraVfxProgFxType4SourceMdlNodeName = "AuroraLight01";
    lightGroup.userData.auroraVfxProgFxType4SourceMdlAnimation = "Blue_5m";
    lightGroup.userData.auroraVfxProgFxType4SourceMdlColor = [0.5, 0.5, 1];
    lightGroup.userData.auroraVfxProgFxType4SourceMdlRadiusMeters = 13.3;
    lightGroup.userData.auroraVfxProgFxType4SourceMdlRadiusFrames = [0, 13.3];
    lightGroup.userData.auroraVfxProgFxType4SourceMdlRadiusProofStatus =
      "source-family-backed-fx_light_clr-mdl-animation-radius";
    lightGroup.userData.auroraVfxProgFxType4Param2AnimationSpeedRaw = "1";
    lightGroup.userData.auroraVfxProgFxType4Param2AnimationSpeedStatus =
      "source-backed-progfx-type4-param2-animation-speed-preserved-runtime-playback-blocked";
    lightGroup.userData.auroraVfxProgFxType4Param3CastShadowsRaw = "1";
    lightGroup.userData.auroraVfxProgFxType4CastShadows = true;
    lightGroup.userData.auroraVfxProgFxType4Param3CastShadowsStatus =
      "source-backed-progfx-type4-param3-cast-shadows-preserved-item-toggle-known-non-item-vanilla-cast-shadow-absent";
    lightGroup.userData.auroraVfxProgFxType4Param4PriorityRaw = "20";
    lightGroup.userData.auroraVfxProgFxType4Priority = 20;
    lightGroup.userData.auroraVfxProgFxType4Param4PriorityStatus =
      "docs-backed-progfx-type4-param4-priority-lower-value-wins";
    lightGroup.userData.auroraVfxProgFxType4Param5ProximitySuppressionRaw = "0";
    lightGroup.userData.auroraVfxProgFxType4ProximitySuppression = false;
    lightGroup.userData.auroraVfxProgFxType4Param5ProximitySuppressionStatus =
      "docs-backed-progfx-type4-param5-proximity-suppression-near-other-light";
    lightGroup.userData.auroraVfxProgFxType4Param6AttachToSceneRaw = "0";
    lightGroup.userData.auroraVfxProgFxType4AttachToScene = false;
    lightGroup.userData.auroraVfxProgFxType4Param6AttachToSceneStatus =
      "docs-backed-progfx-type4-param6-attach-to-scene-removes-scene-lights";
    lightGroup.userData.auroraVfxProgFxType4Param7ModelRaw = "fx_light_clr";
    lightGroup.userData.auroraVfxProgFxType4Param7ModelStatus =
      "source-backed-progfx-type4-param7-model-ref-preserved-client-loader-path-source-backed";
    lightGroup.userData.auroraVfxProgFxType4Param8UnusedRaw = "****";
    lightGroup.userData.auroraVfxProgFxType4ParameterSource =
      "progfx.2da Type 4 Param3 cast shadows";
    lightGroup.userData.auroraVfxProgFxType4ParameterPreservationProofSource =
      "nwn_base.key progfx.2da selected rows 300..333 and 350..377 preserve Type 4 Param1..Param7";
    lightGroup.userData.auroraVfxProgFxType4ParameterPreservationProofStatus =
      "source-backed-progfx-type4-param1-param8-raw-preserved";
    lightGroup.userData.auroraVfxProgFxType4OwnerVisualEffectRowId = 153;
    lightGroup.userData.auroraVfxProgFxType4OwnerVisualEffectLabel = "VFX_DUR_LIGHT_BLUE_5";
    lightGroup.userData.auroraVfxProgFxType4RuntimeSchedulingStatus =
      "blocked-no-retail-runtime-scheduler-proof";
    lightGroup.userData.auroraVfxProgFxType4RuntimeSchedulingProofSource =
      "C:/Projects/New Folder/export/decompiled_all.c:348244 loads visualeffects.2da";
    lightGroup.userData.auroraVfxProgFxType4RuntimeSchedulingBlocker =
      "retail scheduler data-flow not recovered";
    lightGroup.userData.auroraVfxProgFxType4SceneAttachmentPolicyStatus =
      "docs-backed-progfx-type4-param6-attach-to-scene-removes-scene-lights-retail-dataflow-blocked";
    lightGroup.userData.auroraVfxProgFxType4ProximitySuppressionPolicyStatus =
      "docs-backed-progfx-type4-param5-proximity-suppression-near-other-light-retail-distance-blocked";
    lightGroup.userData.auroraVfxProgFxType4VisionMutationPolicyStatus =
      "docs-backed-progfx-type4-param4-param1-vision-priority-token-retail-mutation-blocked";
    lightGroup.userData.auroraVfxProgFxType4ShadowPolicyStatus =
      "source-backed-progfx-type4-param3-item-light-shadow-toggle-retail-shadow-volume-projection-blocked";
    lightGroup.userData.auroraVfxProgFxType4VisualPreviewStatus =
      "diagnostic-draw-not-retail-pointlight";
    lightGroup.userData.auroraVfxProgFxType4NotPlaceableTwoDaLight = true;
    lightGroup.userData.auroraVfxProgFxType4NotMdlLightNode = true;
    scene.add(lightGroup);

    const duplicateMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, 8, 4),
      new THREE.MeshBasicMaterial()
    );
    duplicateMesh.userData = { ...lightGroup.userData };
    lightGroup.add(duplicateMesh);

    const visionGroup = new THREE.Group();
    visionGroup.userData.auroraVfxProgFxType4ProofStatus =
      "source-backed-progfx-type4-owner-phase-effect-instance-runtime-retail-unverified";
    visionGroup.userData.auroraVfxProgFxType4RowId = 305;
    visionGroup.userData.auroraVfxProgFxType4Label = "BlindVision";
    visionGroup.userData.auroraVfxProgFxType4Param1AnimationRaw = "Blind_Vision";
    visionGroup.userData.auroraVfxProgFxType4Animation = "Blind_Vision";
    visionGroup.userData.auroraVfxProgFxType4Param1AnimationStatus =
      "source-backed-progfx-type4-param1-animation-token-preserved";
    visionGroup.userData.auroraVfxProgFxType4AnimationKind = "vision";
    visionGroup.userData.auroraVfxProgFxType4VisionMode = "Blind_Vision";
    visionGroup.userData.auroraVfxProgFxType4VisionParameterStatus =
      "docs-backed-progfx-type4-param1-vision-token-param4-priority";
    visionGroup.userData.auroraVfxProgFxType4Param3CastShadowsRaw = "0";
    visionGroup.userData.auroraVfxProgFxType4CastShadows = false;
    visionGroup.userData.auroraVfxProgFxType4Param3CastShadowsStatus =
      "source-backed-progfx-type4-param3-cast-shadows-preserved-item-toggle-known-non-item-vanilla-cast-shadow-absent";
    visionGroup.userData.auroraVfxProgFxType4Param4PriorityRaw = "13";
    visionGroup.userData.auroraVfxProgFxType4Priority = 13;
    visionGroup.userData.auroraVfxProgFxType4Param5ProximitySuppressionRaw = "0";
    visionGroup.userData.auroraVfxProgFxType4ProximitySuppression = false;
    visionGroup.userData.auroraVfxProgFxType4Param6AttachToSceneRaw = "1";
    visionGroup.userData.auroraVfxProgFxType4AttachToScene = true;
    visionGroup.userData.auroraVfxProgFxType4ParameterPreservationProofStatus =
      "source-backed-progfx-type4-param1-param8-raw-preserved";
    visionGroup.userData.auroraVfxProgFxType4OwnerVisualEffectRowId = 242;
    visionGroup.userData.auroraVfxProgFxType4OwnerVisualEffectLabel = "VFX_DUR_BLINDVISION";
    scene.add(visionGroup);

    const diagnostics = resolveAuroraScenePointLightDiagnostics(scene);

    expect(diagnostics.pointLightCount).toBe(0);
    expect(diagnostics.sourceBackedPointLightCount).toBe(0);
    expect(diagnostics.nonPointLightRequestCount).toBe(2);
    expect(diagnostics.nonPointLightRequestLaneCounts).toEqual({
      "progfx-type4-light-request": 1,
      "progfx-type4-vision-request": 1
    });
    expect(diagnostics.nonPointLightRequestSamples.join("|")).toContain(
      "lane=progfx-type4-light-request;row=304;label=LightBlue5m"
    );
    expect(diagnostics.nonPointLightRequestSamples.join("|")).toContain(
      "tokenRadiusMeters=5;tokenRadiusProof=source-backed-progfx-param1-animation-token-radius;radiusMeters=13.3;radiusProof=source-family-backed-fx_light_clr-mdl-animation-radius"
    );
    expect(diagnostics.nonPointLightRequestSamples.join("|")).toContain(
      "sourceMdlNode=AuroraLight01;sourceMdlAnimation=Blue_5m;sourceMdlColor=0.5,0.5,1;sourceMdlRadius=13.3;sourceMdlRadiusFrames=0,13.3"
    );
    expect(diagnostics.nonPointLightRequestSamples.join("|")).toContain(
      "lane=progfx-type4-vision-request;row=305;label=BlindVision"
    );
    expect(diagnostics.nonPointLightRequestSamples.join("|")).toContain(
      "param3Raw=1;castShadows=true;param3Status=source-backed-progfx-type4-param3-cast-shadows-preserved-item-toggle-known-non-item-vanilla-cast-shadow-absent"
    );
    expect(diagnostics.nonPointLightRequestSamples.join("|")).toContain(
      "param4Raw=20;priority=20;param4Status=docs-backed-progfx-type4-param4-priority-lower-value-wins;param5Raw=0;proximity=false;param5Status=docs-backed-progfx-type4-param5-proximity-suppression-near-other-light;param6Raw=0;attachToScene=false;param6Status=docs-backed-progfx-type4-param6-attach-to-scene-removes-scene-lights"
    );
    expect(diagnostics.nonPointLightRequestSamples.join("|")).toContain(
      "parameterSource=progfx.2da Type 4 Param3 cast shadows;parameterPreservationSource=nwn_base.key progfx.2da selected rows 300..333 and 350..377 preserve Type 4 Param1..Param7;parameterPreservationProof=source-backed-progfx-type4-param1-param8-raw-preserved"
    );
    expect(diagnostics.nonPointLightRequestSamples.join("|")).toContain(
      "visionParamStatus=docs-backed-progfx-type4-param1-vision-token-param4-priority"
    );
    expect(diagnostics.nonPointLightRequestSamples.join("|")).toContain(
      "param4Raw=13;priority=13"
    );
    expect(diagnostics.nonPointLightRequestSamples.join("|")).toContain(
      "param6Raw=1;attachToScene=true"
    );
    expect(diagnostics.nonPointLightRequestSamples.join("|")).toContain(
      "runtimeSchedulingSource=C:/Projects/New Folder/export/decompiled_all.c:348244 loads visualeffects.2da;runtimeSchedulingBlocker=retail scheduler data-flow not recovered"
    );
    expect(diagnostics.nonPointLightRequestSamples.join("|")).toContain(
      "sceneAttachmentPolicy=docs-backed-progfx-type4-param6-attach-to-scene-removes-scene-lights-retail-dataflow-blocked;proximityPolicy=docs-backed-progfx-type4-param5-proximity-suppression-near-other-light-retail-distance-blocked;visionMutationPolicy=docs-backed-progfx-type4-param4-param1-vision-priority-token-retail-mutation-blocked;shadowPolicy=source-backed-progfx-type4-param3-item-light-shadow-toggle-retail-shadow-volume-projection-blocked"
    );
    expect(diagnostics.nonPointLightRequestSchedulerStatus).toBe(
      "docs-backed-progfx-type4-policy-diagnostic-retail-scheduler-dataflow-blocked"
    );
    expect(diagnostics.nonPointLightRequestSchedulerProofSource).toContain(
      "Param4 priority lower value wins"
    );
    expect(diagnostics.nonPointLightRequestSchedulerPriorityWinner).toContain(
      "row=305;label=BlindVision"
    );
    expect(diagnostics.nonPointLightRequestSchedulerSceneAttachmentRequestCount).toBe(1);
    expect(diagnostics.nonPointLightRequestSchedulerProximitySuppressionCandidateCount).toBe(0);
    expect(diagnostics.nonPointLightRequestSchedulerVisionRequestCount).toBe(1);
    expect(diagnostics.nonPointLightRequestSchedulerLightRequestCount).toBe(1);
    expect(diagnostics.nonPointLightRequestSchedulerWouldSuppressScenePointLights).toBe(false);
    expect(diagnostics.nonPointLightRequestSchedulerSamples.join("|")).toContain(
      "priorityPolicy=docs-backed-progfx-type4-param4-priority-lower-value-wins"
    );
    expect(diagnostics.nonPointLightRequestSamples.join("|")).toContain(
      "notPlaceable=true;notMdl=true"
    );
    expect(diagnostics.shadow.progFxType4ShadowRequestCount).toBe(1);
    expect(diagnostics.shadow.progFxType4ShadowRequestSamples).toEqual([
      expect.stringContaining(
        "lane=progfx-type4-light-request;row=304;label=LightBlue5m;animation=Blue_5m;param3Raw=1;castShadows=true"
      )
    ]);
    expect(diagnostics.shadow.progFxType4ShadowRequestSamples[0]).toContain(
      "shadowPolicy=source-backed-progfx-type4-param3-item-light-shadow-toggle-retail-shadow-volume-projection-blocked"
    );
    expect(diagnostics.shadow.progFxType4ShadowRequestSamples[0]).toContain(
      "param3Raw=1;castShadows=true;param3Status=source-backed-progfx-type4-param3-cast-shadows-preserved-item-toggle-known-non-item-vanilla-cast-shadow-absent"
    );
  });

  it("records local ProgFX Type 4 Param5 proximity and Param6 scene-attachment observations", () => {
    const scene = new THREE.Scene();

    const placeableLight = new THREE.PointLight(0xffcc77, 1, 6, 1);
    placeableLight.position.set(2, 0, 0);
    placeableLight.userData.placeableTwoDaLightPreviewRole =
      "placeables-2da-point-light";
    placeableLight.userData.placeableTwoDaLightColorLabel = "PaleYellow";
    placeableLight.userData.placeableTwoDaLightColorSource = "placeables.2da LightColor";
    scene.add(placeableLight);

    const darkvision = new THREE.Group();
    darkvision.position.set(0, 0, 0);
    darkvision.userData.auroraVfxProgFxType4ProofStatus =
      "source-backed-progfx-type4-owner-phase-effect-instance-runtime-retail-unverified";
    darkvision.userData.auroraVfxProgFxType4RowId = 328;
    darkvision.userData.auroraVfxProgFxType4Label = "LightDarkvision";
    darkvision.userData.auroraVfxProgFxType4Animation = "Dark_Vision";
    darkvision.userData.auroraVfxProgFxType4AnimationKind = "vision";
    darkvision.userData.auroraVfxProgFxType4VisionMode = "Dark_Vision";
    darkvision.userData.auroraVfxProgFxType4Param4PriorityRaw = "49";
    darkvision.userData.auroraVfxProgFxType4Priority = 49;
    darkvision.userData.auroraVfxProgFxType4Param5ProximitySuppressionRaw = "1";
    darkvision.userData.auroraVfxProgFxType4ProximitySuppression = true;
    darkvision.userData.auroraVfxProgFxType4Param6AttachToSceneRaw = "1";
    darkvision.userData.auroraVfxProgFxType4AttachToScene = true;
    darkvision.userData.auroraVfxProgFxType4ParameterSource =
      "progfx.2da Type 4 Param5/Param6";
    darkvision.userData.auroraVfxProgFxType4Param5ProximitySuppressionStatus =
      "docs-backed-progfx-type4-param5-proximity-suppression-near-other-light";
    darkvision.userData.auroraVfxProgFxType4Param6AttachToSceneStatus =
      "docs-backed-progfx-type4-param6-attach-to-scene-removes-scene-lights";
    scene.add(darkvision);

    const diagnostics = resolveAuroraScenePointLightDiagnostics(scene);

    expect(diagnostics.nonPointLightRequestSamples.join("|")).toContain(
      "lane=progfx-type4-vision-request;row=328;label=LightDarkvision;worldPosition=0,0,0"
    );
    expect(diagnostics.samples.join("|")).toContain(
      "lane=placeables-2da-light;role=placeables-2da-point-light;name=PaleYellow;source=placeables.2da LightColor;worldPosition=2,0,0"
    );
    expect(diagnostics.nonPointLightRequestSchedulerWouldSuppressScenePointLights).toBe(
      true
    );
    expect(diagnostics.nonPointLightRequestSchedulerSceneAttachmentRequestCount).toBe(1);
    expect(diagnostics.nonPointLightRequestSchedulerProximitySuppressionCandidateCount).toBe(1);
    expect(diagnostics.nonPointLightRequestSchedulerSamples.join("|")).toContain(
      "sceneAttachmentSuppressedPointLights=1"
    );
    expect(diagnostics.nonPointLightRequestSchedulerSamples.join("|")).toContain(
      "proximityCandidate=row=328;label=LightDarkvision;requestPosition=0,0,0;nearestKind=point-light;nearestLane=placeables-2da-light;nearestName=PaleYellow;nearestPosition=2,0,0;nearestDistance=2;threshold=unknown-retail-distance-blocked"
    );

    const dataset: Record<string, string | undefined> = {};
    writeAuroraScenePointLightDiagnostics({ scene, container: { dataset } });
    expect(dataset.sceneNonPointLightRequestSchedulerSamples).toContain(
      "proximityCandidate=row=328;label=LightDarkvision"
    );
    expect(dataset.sceneNonPointLightRequestSchedulerWouldSuppressScenePointLights).toBe(
      "true"
    );
  });

  it("keeps ProgFX Type 4 equal-priority tie policy blocked in scheduler diagnostics", () => {
    const scene = new THREE.Scene();

    const firstVision = new THREE.Group();
    firstVision.userData.auroraVfxProgFxType4ProofStatus =
      "source-backed-progfx-type4-owner-phase-effect-instance-runtime-retail-unverified";
    firstVision.userData.auroraVfxProgFxType4RowId = 329;
    firstVision.userData.auroraVfxProgFxType4Label = "LightBlindvision";
    firstVision.userData.auroraVfxProgFxType4Animation = "Blind_Vision";
    firstVision.userData.auroraVfxProgFxType4AnimationKind = "vision";
    firstVision.userData.auroraVfxProgFxType4VisionMode = "Blind_Vision";
    firstVision.userData.auroraVfxProgFxType4Param4PriorityRaw = "13";
    firstVision.userData.auroraVfxProgFxType4Priority = 13;
    firstVision.userData.auroraVfxProgFxType4ParameterSource =
      "progfx.2da Type 4 Param4 priority";
    firstVision.userData.auroraVfxProgFxType4Param4PriorityStatus =
      "docs-backed-progfx-type4-param4-priority-lower-value-wins";
    scene.add(firstVision);

    const lastAppliedVision = new THREE.Group();
    lastAppliedVision.userData = { ...firstVision.userData };
    lastAppliedVision.userData.auroraVfxProgFxType4RowId = 333;
    lastAppliedVision.userData.auroraVfxProgFxType4Label = "LightAreaBlackout";
    scene.add(lastAppliedVision);

    const priorityZeroLight = new THREE.Group();
    priorityZeroLight.userData.auroraVfxProgFxType4ProofStatus =
      "source-backed-progfx-type4-owner-phase-effect-instance-runtime-retail-unverified";
    priorityZeroLight.userData.auroraVfxProgFxType4RowId = 304;
    priorityZeroLight.userData.auroraVfxProgFxType4Label = "PriorityZeroLight";
    priorityZeroLight.userData.auroraVfxProgFxType4Animation = "Blue_5m";
    priorityZeroLight.userData.auroraVfxProgFxType4AnimationKind = "light";
    priorityZeroLight.userData.auroraVfxProgFxType4Param4PriorityRaw = "0";
    priorityZeroLight.userData.auroraVfxProgFxType4Priority = 0;
    priorityZeroLight.userData.auroraVfxProgFxType4ParameterSource =
      "progfx.2da Type 4 Param4 priority";
    priorityZeroLight.userData.auroraVfxProgFxType4Param4PriorityStatus =
      "docs-backed-progfx-type4-param4-priority-lower-value-wins";
    scene.add(priorityZeroLight);

    const diagnostics = resolveAuroraScenePointLightDiagnostics(scene);

    expect(diagnostics.nonPointLightRequestSchedulerPriorityWinner).toContain(
      "row=304;label=PriorityZeroLight"
    );
    expect(
      diagnostics.nonPointLightRequestSchedulerPriorityEvaluationOrderSource
    ).toBe(AURORA_SCENE_PROGFX_TYPE4_PRIORITY_EVALUATION_ORDER_SOURCE);
    expect(diagnostics.nonPointLightRequestSchedulerPriorityEvaluationOrder).toEqual([
      expect.stringContaining(
        "rank=1;inputOrder=2;row=304;label=PriorityZeroLight"
      ),
      expect.stringContaining(
        "rank=2;inputOrder=1;row=333;label=LightAreaBlackout"
      ),
      expect.stringContaining(
        "rank=3;inputOrder=0;row=329;label=LightBlindvision"
      )
    ]);
    expect(
      diagnostics.nonPointLightRequestSchedulerPriorityEvaluationOrder.join("|")
    ).toContain("retailDataFlow=blocked");
    expect(diagnostics.nonPointLightRequestSchedulerPriorityTiePolicyStatus).toBe(
      AURORA_SCENE_PROGFX_TYPE4_PRIORITY_TIE_POLICY_STATUS
    );
    expect(diagnostics.nonPointLightRequestSchedulerPriorityTopTieBlocked).toBe(false);
    expect(
      diagnostics.nonPointLightRequestSchedulerPriorityTopTieCandidateCount
    ).toBe(1);
    expect(diagnostics.nonPointLightRequestSchedulerPriorityTieGroupCount).toBe(1);
    expect(
      diagnostics.nonPointLightRequestSchedulerPriorityZeroAlwaysAppliesRequestCount
    ).toBe(1);
    expect(diagnostics.nonPointLightRequestSchedulerSamples.join("|")).toContain(
      `priorityTiePolicy=${AURORA_SCENE_PROGFX_TYPE4_PRIORITY_TIE_POLICY_STATUS}`
    );
    expect(diagnostics.nonPointLightRequestSchedulerSamples.join("|")).toContain(
      `priorityZeroPolicy=${AURORA_SCENE_PROGFX_TYPE4_PRIORITY_ZERO_POLICY_STATUS}`
    );

    const tieOnlyScene = new THREE.Scene();
    tieOnlyScene.add(firstVision.clone());
    tieOnlyScene.add(lastAppliedVision.clone());
    const tieOnlyDiagnostics = resolveAuroraScenePointLightDiagnostics(tieOnlyScene);
    expect(tieOnlyDiagnostics.nonPointLightRequestSchedulerPriorityWinner).toContain(
      "blocked=equal-priority-top-tie-retail-scheduler-policy-unproven"
    );
    expect(tieOnlyDiagnostics.nonPointLightRequestSchedulerPriorityTopTieBlocked).toBe(
      true
    );
    expect(
      tieOnlyDiagnostics.nonPointLightRequestSchedulerPriorityTopTieCandidateCount
    ).toBe(2);

    const dataset: Record<string, string | undefined> = {};
    writeAuroraScenePointLightDiagnostics({ scene, container: { dataset } });
    expect(
      scene.userData.auroraSceneNonPointLightRequestSchedulerPriorityTiePolicyStatus
    ).toBe(AURORA_SCENE_PROGFX_TYPE4_PRIORITY_TIE_POLICY_STATUS);
    expect(
      scene.userData.auroraSceneNonPointLightRequestSchedulerPriorityTopTieBlocked
    ).toBe(false);
    expect(
      scene.userData
        .auroraSceneNonPointLightRequestSchedulerPriorityTopTieCandidateCount
    ).toBe(1);
    expect(
      scene.userData.auroraSceneNonPointLightRequestSchedulerPriorityEvaluationOrderSource
    ).toBe(AURORA_SCENE_PROGFX_TYPE4_PRIORITY_EVALUATION_ORDER_SOURCE);
    expect(
      (
        scene.userData
          .auroraSceneNonPointLightRequestSchedulerPriorityEvaluationOrder as string[]
      ).join("|")
    ).toContain("rank=1;inputOrder=2;row=304;label=PriorityZeroLight");
    expect(
      dataset.sceneNonPointLightRequestSchedulerPriorityEvaluationOrderSource
    ).toBe(AURORA_SCENE_PROGFX_TYPE4_PRIORITY_EVALUATION_ORDER_SOURCE);
    expect(dataset.sceneNonPointLightRequestSchedulerPriorityEvaluationOrder).toContain(
      "rank=1;inputOrder=2;row=304;label=PriorityZeroLight"
    );
    expect(dataset.sceneNonPointLightRequestSchedulerPriorityTieGroupCount).toBe("1");
    expect(dataset.sceneNonPointLightRequestSchedulerPriorityTopTieBlocked).toBe(
      "false"
    );
    expect(
      dataset.sceneNonPointLightRequestSchedulerPriorityTopTieCandidateCount
    ).toBe("1");
    expect(
      dataset.sceneNonPointLightRequestSchedulerPriorityZeroAlwaysAppliesRequestCount
    ).toBe("1");
  });

  it("audits source MDL cast shadows and placeable fast-shadow proxy metadata", () => {
    const scene = new THREE.Scene();
    scene.userData.auroraTerrainAreaGlobalShadowStatus = "enabled";
    scene.userData.auroraTerrainAreaGlobalShadowSourceField = "SunShadows";
    scene.userData.auroraTerrainAreaGlobalShadowStatusSource = "ARE.SunShadows";
    scene.userData.auroraTerrainAreaGlobalShadowOpacity = 50;
    scene.userData.auroraTerrainAreaGlobalShadowOpacitySource =
      "ARE.ShadowOpacity read/write at decompiled_all.c:255224/255904; normalized to shadowOpacity/100 at decompiled_all.c:256306";
    scene.userData.auroraTerrainAreaGlobalShadowOpacityFactor = 0.5;
    scene.userData.auroraTerrainAreaGlobalShadowOpacityFactorSource =
      "decompiled_all.c:256306 stores ShadowOpacity/100, then shadow plane alpha multiplies that factor at decompiled_all.c:910844";

    const mdlLight = new THREE.PointLight(0xffcc44, 1, 3, 2);
    mdlLight.castShadow = true;
    mdlLight.shadow.radius = 0;
    mdlLight.userData.auroraLightPreviewRole = "source-mdl-point-light";
    mdlLight.userData.auroraLightNodeName = "torch_light12";
    mdlLight.userData.auroraLightShadowEnabled = true;
    mdlLight.userData.auroraLightSourceShadowRadius = 1;
    mdlLight.userData.auroraLightAnimatedShadowRadius = 1;
    mdlLight.userData.auroraLightShadowProjectionSourceRadius = 1;
    mdlLight.userData.auroraLightShadowProjectionRadiusWorldDistance = 0.5;
    mdlLight.userData.auroraLightShadowProjectionRadiusSource =
      "C:/Projects/New Folder/export/decompiled_all.c:913930-913955 chooses shadowradius +0x60 when positive, otherwise radius +0x58, then applies verticaldisplacement +0x64";
    mdlLight.userData.auroraLightShadowProjectionRadiusProofStatus =
      "source-backed-shadowradius-profile-scaled-three-shadow-camera-far";
    mdlLight.userData.auroraLightShadowProofStatus =
      "source-backed-mdl-shadow-pointlight-castShadow";
    mdlLight.userData.auroraLightShadowRendererMode = "three-pointlight-shadowmap-preview";
    mdlLight.userData.auroraLightShadowProjectionStatus =
      "blocked-three-shadowmap-preview-no-retail-shadowvol-extrusion-parity";
    mdlLight.userData.auroraLightShadowProjectionSource =
      "C:/Projects/New Folder/export/decompiled_all.c:913914-914017 shadowvol path loads vs_shadowvol/fs_shadowvol and renders caster geometry using light-node radius/shadowradius/verticaldisplacement runtime fields; current Three preview uses PointLight shadow maps and does not port Aurora shadow-volume extrusion/projection";
    mdlLight.userData.auroraLightShadowProjectionProofStatus =
      "source-backed-mdl-shadowvol-renderer-blocked-no-three-parity";
    scene.add(mdlLight);

    const directional = new THREE.DirectionalLight(0xf6e8b5, 0.68);
    directional.name = "terrain-area-global-diffuse-light";
    directional.castShadow = true;
    directional.userData.auroraTerrainAreaGlobalLightRole = "diffuse";
    directional.userData.auroraTerrainAreaGlobalLightingPhase = "sun";
    directional.userData.auroraTerrainAreaGlobalShadowStatus = "enabled";
    directional.userData.auroraTerrainAreaGlobalShadowSourceField = "SunShadows";
    directional.userData.auroraTerrainAreaGlobalShadowOpacity = 50;
    directional.userData.auroraTerrainAreaGlobalShadowOpacityFactor = 0.5;
    directional.userData.auroraTerrainAreaGlobalShadowImplementationStatus =
      "three-directional-castShadow-flag-only-shadow-volume-not-ported";
    scene.add(directional);

    const fastShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.600000023841858, 1.600000023841858),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.3 })
    );
    fastShadow.name = "placeable_2da_light_fast_shadow";
    fastShadow.userData.objectId = "catalog-vfx-preview:plc_plc_i06";
    fastShadow.userData.placeableTwoDaFastShadowStatus = "active";
    fastShadow.userData.placeableTwoDaShadowSize = 1;
    fastShadow.userData.placeableTwoDaShadowSizeSource = "placeables.2da.ShadowSize";
    fastShadow.userData.placeableTwoDaShadowSizeProofStatus =
      "source-backed-retail-shadowsize-selects-fx-shadow-mdl";
    fastShadow.userData.placeableTwoDaShadowSizeLane = "medium";
    fastShadow.userData.placeableTwoDaShadowSizeSelectionProofStatus =
      "source-backed-retail-shadowsize-selects-fx-shadow-mdl";
    fastShadow.userData.placeableTwoDaFastShadowModelFileName = "fx_shadow_m.mdl";
    fastShadow.userData.placeableTwoDaFastShadowSourceModelHash =
      "9dd315aab5fb5a5483b0c74fb696dbea7702227b0e662e1d0d6027d84eb99f7d";
    fastShadow.userData.placeableTwoDaFastShadowSourceNodeOffset = 1764;
    fastShadow.userData.placeableTwoDaFastShadowEmitterNodeName = "Med";
    fastShadow.userData.placeableTwoDaFastShadowEmitterType = "Single";
    fastShadow.userData.placeableTwoDaFastShadowTexture = "fxpa_Dot01";
    fastShadow.userData.placeableTwoDaFastShadowTextureBindingStatus =
      "retail-key-bif-fxpa-dot01-confirmed-procedural-preview-alpha-map";
    fastShadow.userData.placeableTwoDaFastShadowTextureMapBound = true;
    fastShadow.userData.placeableTwoDaFastShadowTextureBindingProofStatus =
      "source-backed-retail-fxpa-dot01-resource-confirmed-preview-procedural-fallback";
    fastShadow.userData.placeableTwoDaFastShadowRenderMode = "Billboard_to_Local_Z";
    fastShadow.userData.placeableTwoDaFastShadowBlendMode = "Normal";
    fastShadow.userData.placeableTwoDaFastShadowEmitterPosition = [
      0,
      0,
      0.029999999329447746
    ];
    fastShadow.userData.placeableTwoDaFastShadowEmitterSize = 1.600000023841858;
    fastShadow.userData.placeableTwoDaFastShadowGeometryType =
      "source-mdl-single-billboard-local-z-plane";
    fastShadow.userData.placeableTwoDaFastShadowQuadSize = 1.600000023841858;
    fastShadow.userData.placeableTwoDaFastShadowGeometryProofStatus =
      "source-backed-retail-shadow-mdl-single-billboard-local-z-quad";
    fastShadow.userData.placeableTwoDaFastShadowEmitterAlphaStart = 0.6000000238418579;
    fastShadow.userData.placeableTwoDaFastShadowRadius = 0.800000011920929;
    fastShadow.userData.placeableTwoDaFastShadowRadiusSource =
      "nwmain.exe 0x1408708c0..0x140870b0a CNWPlaceable::LoadLight reads placeables.2da ShadowSize and selects Fx_Shadow_S/M/L; nwn_base.key Fx_Shadow_* binary MDL emitter sizeStart/sizeEnd supplies sprite size";
    fastShadow.userData.placeableTwoDaFastShadowBaseOpacity = 0.6000000238418579;
    fastShadow.userData.placeableTwoDaFastShadowOpacity = 0.30000001192092896;
    fastShadow.userData.placeableTwoDaFastShadowOpacitySource =
      "nwn_base.key Fx_Shadow_* binary MDL emitter alphaStart/alphaEnd supplies base opacity multiplied by ARE.ShadowOpacity/100";
    fastShadow.userData.placeableTwoDaFastShadowAreaOpacity = 50;
    fastShadow.userData.placeableTwoDaFastShadowAreaOpacityFactor = 0.5;
    fastShadow.userData.placeableTwoDaFastShadowAreaOpacityFactorSource =
      "decompiled_all.c:256306 stores ShadowOpacity/100";
    fastShadow.userData.placeableTwoDaFastShadowAreaOpacityProofStatus =
      "source-backed-area-shadowopacity-factor-fast-shadow-proxy-opacity";
    fastShadow.userData.placeableTwoDaFastShadowOpacityProofStatus =
      "source-backed-area-shadowopacity-factor-fast-shadow-proxy-opacity";
    fastShadow.userData.placeableTwoDaFastShadowProjectionStatus =
      "source-backed-retail-shadow-mdl-single-billboard-local-z-textured-quad-shadowvol-stencil-pass-active-pixel-parity-blocked";
    fastShadow.userData.placeableTwoDaFastShadowProjectionSource =
      "nwmain.exe 0x1408708c0..0x140870b0a CNWPlaceable::LoadLight maps ShadowSize 0->Fx_Shadow_S, 2->Fx_Shadow_L, otherwise Fx_Shadow_M, then loads that shadow MDL; extracted Fx_Shadow_* emitters are Single, Billboard_to_Local_Z, texture fxpa_Dot01";
    fastShadow.userData.placeableTwoDaFastShadowProjectionProofStatus =
      "source-backed-retail-shadowsize-shadow-mdl-textured-quad-active-proxy-shadowvol-stencil-pass-pixel-parity-blocked";
    fastShadow.userData.placeableTwoDaFastShadowVolumeCasterStatus =
      "source-backed-shadowvol-caster-buffer-three-geometry-bound-to-placeable-fast-shadow-proxy-stencil-lane-active-pixel-parity-blocked";
    fastShadow.userData.placeableTwoDaFastShadowVolumeCasterGeometryStatus =
      "source-backed-shadowvol-caster-buffer-three-geometry-helper-ported-active-renderer-blocked";
    fastShadow.userData.placeableTwoDaFastShadowVolumeCasterSourceVertexCount = 4;
    fastShadow.userData.placeableTwoDaFastShadowVolumeCasterSourceQuadSize =
      1.600000023841858;
    fastShadow.userData.placeableTwoDaFastShadowVolumeCasterSourceQuadSizeSource =
      "nwmain.exe 0x1408708c0..0x140870b0a CNWPlaceable::LoadLight reads placeables.2da ShadowSize and selects Fx_Shadow_S/M/L; nwn_base.key Fx_Shadow_* binary MDL emitter sizeStart/sizeEnd supplies sprite size";
    fastShadow.userData.placeableTwoDaFastShadowVolumeCasterEdgeCount = 4;
    fastShadow.userData.placeableTwoDaFastShadowVolumeCasterVertexRecordCount = 10;
    fastShadow.userData.placeableTwoDaFastShadowVolumeCasterIndexCount = 24;
    fastShadow.userData.placeableTwoDaFastShadowVolumeCasterRecordsPerSourceVertex = 2;
    fastShadow.userData.placeableTwoDaFastShadowVolumeCasterIndicesPerEdge = 6;
    fastShadow.userData.placeableTwoDaFastShadowVolumeCasterWAttribute =
      "auroraShadowVolumeW";
    fastShadow.userData.placeableTwoDaFastShadowVolumeCasterProofStatus =
      "source-backed-shadowvol-caster-buffer-three-geometry-helper-ported-active-renderer-blocked";
    fastShadow.userData.placeableTwoDaFastShadowVolumeProjectionPreviewStatus =
      "source-backed-shadowvol-w-pair-extrusion-preview-active-stencil-parity-blocked";
    fastShadow.userData.placeableTwoDaFastShadowVolumeProjectionPreviewRendererMode =
      "three-shadermaterial-aurora-w-pair-extrusion-preview-no-stencil";
    fastShadow.userData.placeableTwoDaFastShadowVolumeProjectionPreviewVisible = true;
    fastShadow.userData.placeableTwoDaFastShadowVolumeProjectionPreviewWAttribute =
      "auroraShadowVolumeW";
    fastShadow.userData.placeableTwoDaFastShadowVolumeProjectionPreviewLightPosition = [
      0,
      0,
      0.3
    ];
    fastShadow.userData.placeableTwoDaFastShadowVolumeProjectionPreviewLightPositionSource =
      "C:/Projects/New Folder/export/decompiled_all.c:883126-883155 maps verticaldisplacement to controller 0x64; nwn_base.key fx_placeable01.mdl AuroraLight01 controller 0x64 = 3 multiplied by current source-unit scale";
    fastShadow.userData.placeableTwoDaFastShadowVolumeProjectionPreviewExtrusionDistance = 1.5;
    fastShadow.userData.placeableTwoDaFastShadowVolumeProjectionPreviewExtrusionDistanceSource =
      "C:/Projects/New Folder/export/decompiled_all.c:883088-883117 maps shadowradius/shadowradiuskey/shadowradiusbezierkey to controller 0x60; nwn_base.key fx_placeable01.mdl AuroraLight01 controller 0x60 = 15 multiplied by current source-unit scale";
    fastShadow.userData.placeableTwoDaFastShadowVolumeProjectionPreviewOpacity = 0.096;
    fastShadow.userData.placeableTwoDaFastShadowVolumeProjectionPreviewSource =
      "source-backed active Three ShaderMaterial preview extrudes auroraShadowVolumeW=0 records away from the local light position while preserving w=1 source records; retail stencil/depth parity remains blocked";
    fastShadow.userData.placeableTwoDaFastShadowVolumeProjectionPreviewProofStatus =
      "source-backed-shadowvol-w-pair-preview-renderer-active-retail-stencil-parity-blocked";
    fastShadow.userData.placeableTwoDaFastShadowVolumeStencilStatus =
      "source-backed-shadowvol-w-pair-stencil-volume-pass-active-retail-pixel-parity-blocked";
    fastShadow.userData.placeableTwoDaFastShadowVolumeStencilRendererMode =
      "three-webgl-stencil-front-back-zpass-zfail-shadow-volume-preview";
    fastShadow.userData.placeableTwoDaFastShadowVolumeStencilVisible = true;
    fastShadow.userData.placeableTwoDaFastShadowVolumeStencilWAttribute =
      "auroraShadowVolumeW";
    fastShadow.userData.placeableTwoDaFastShadowVolumeStencilLightPosition = [
      0,
      0,
      0.3
    ];
    fastShadow.userData.placeableTwoDaFastShadowVolumeStencilLightPositionSource =
      "C:/Projects/New Folder/export/decompiled_all.c:883126-883155 maps verticaldisplacement to controller 0x64; nwn_base.key fx_placeable01.mdl AuroraLight01 controller 0x64 = 3 multiplied by current source-unit scale";
    fastShadow.userData.placeableTwoDaFastShadowVolumeStencilExtrusionDistance = 1.5;
    fastShadow.userData.placeableTwoDaFastShadowVolumeStencilExtrusionDistanceSource =
      "C:/Projects/New Folder/export/decompiled_all.c:883088-883117 maps shadowradius/shadowradiuskey/shadowradiusbezierkey to controller 0x60; nwn_base.key fx_placeable01.mdl AuroraLight01 controller 0x60 = 15 multiplied by current source-unit scale";
    fastShadow.userData.placeableTwoDaFastShadowVolumeStencilReceiverSize = 1.8;
    fastShadow.userData.placeableTwoDaFastShadowVolumeStencilReceiverOpacity = 0.078;
    fastShadow.userData.placeableTwoDaFastShadowVolumeStencilReceiverFunc =
      "NotEqual(0)";
    fastShadow.userData.placeableTwoDaFastShadowVolumeStencilVolumePasses = [
      "back:zpass",
      "front:zpass",
      "back:zfail",
      "front:zfail"
    ];
    fastShadow.userData.placeableTwoDaFastShadowVolumeStencilRetailFaceOpTable =
      "faces=slot0=GL_FRONT/0x404,slot1=GL_BACK/0x405;ops=slot0=GL_KEEP/0x1e00,slot3=GL_INCR/0x1e02,slot4=GL_DECR/0x1e03";
    fastShadow.userData.placeableTwoDaFastShadowVolumeStencilRetailOpSequence =
      "phase=zpass,pass=front:zpass,call=FUN_00a78344(0,0,0,3),faceSlot=0,face=GL_FRONT/0x404,fail=GL_KEEP/0x1e00,zfail=GL_KEEP/0x1e00,zpass=GL_INCR/0x1e02|phase=zpass,pass=back:zpass,call=FUN_00a78344(1,0,0,4),faceSlot=1,face=GL_BACK/0x405,fail=GL_KEEP/0x1e00,zfail=GL_KEEP/0x1e00,zpass=GL_DECR/0x1e03|phase=zfail,pass=front:zfail,call=FUN_00a78344(0,0,4,0),faceSlot=0,face=GL_FRONT/0x404,fail=GL_KEEP/0x1e00,zfail=GL_DECR/0x1e03,zpass=GL_KEEP/0x1e00|phase=zfail,pass=back:zfail,call=FUN_00a78344(1,0,3,0),faceSlot=1,face=GL_BACK/0x405,fail=GL_KEEP/0x1e00,zfail=GL_INCR/0x1e02,zpass=GL_KEEP/0x1e00";
    fastShadow.userData.placeableTwoDaFastShadowVolumeStencilRetailOpSequenceSource =
      "C:/Projects/New Folder/export/decompiled_all.c:913986-913987 sets FUN_00a78344(0,0,0,3) and FUN_00a78344(1,0,0,4); 914032-914033 switches to FUN_00a78344(0,0,4,0) and FUN_00a78344(1,0,3,0); toolset face table maps slot 0=GL_FRONT/0x404 slot 1=GL_BACK/0x405; op table maps slot 0=GL_KEEP/0x1e00 slot 3=GL_INCR/0x1e02 slot 4=GL_DECR/0x1e03";
    fastShadow.userData.placeableTwoDaFastShadowVolumeStencilSource =
      "source-backed active Three WebGL stencil receiver overlay";
    fastShadow.userData.placeableTwoDaFastShadowVolumeStencilProofStatus =
      "source-backed-shadowvol-w-pair-stencil-pass-active-retail-face-op-mapped-pixel-parity-blocked";
    fastShadow.userData.placeableTwoDaFastShadowVolumeRenderShaderNames = [
      "vs_shadowvol",
      "fs_shadowvol"
    ];
    fastShadow.userData.placeableTwoDaFastShadowVolumeRenderBuckets = [
      "0xd",
      "0xe",
      "0xb",
      "0xc"
    ];
    fastShadow.userData.placeableTwoDaFastShadowVolumeRenderBucketPhases = [
      "case=local_29_false;condition=current-light-branch-not-active;sequence=0xd:zpass->0xe:zfail",
      "case=local_29_true;condition=param_1+0x34==DAT_00cc4350 and differs from scene +0x108/+0x68;sequence=0xd:zpass->0xb:zpass->0xe:zfail->0xc:zfail"
    ];
    fastShadow.userData.placeableTwoDaFastShadowVolumeRenderBucketPhaseSource =
      "C:/Projects/New Folder/export/decompiled_all.c:913922-913928 computes local_29 from the active light pointer branch; 913986-913988 starts 0xd under z-pass stencil ops; 914021-914043 selects 0xb/0xe/0xc by local_29 and switches to z-fail ops at 914032-914033";
    fastShadow.userData.placeableTwoDaFastShadowVolumeRenderBucketPhaseProofStatus =
      "source-backed-shadowvol-branch-aware-bucket-op-ordering-retail-pixel-parity-blocked";
    fastShadow.userData.placeableTwoDaFastShadowVolumeRenderStateCallSequence = [
      "pre=FUN_00a7818c(3);role=state-slot-3-disable-or-cache-before-shadow-volume-loop",
      "lazyBegin=FUN_00a780f0();role=first-caster-state-begin-guarded-by-local_69",
      "perCaster=FUN_00a785d4(light-matrix-pointer);role=upload-caster-transform-before-shader",
      "perCaster=FUN_00a788b0(DAT_00d0247c);role=bind-vs_shadowvol-fs_shadowvol-program",
      "perCaster=FUN_00a78994(0);role=upload-shadowvol-uniform-slot-0",
      "perCaster=FUN_00a78980(1,fVar2);role=upload-shadowvol-uniform-slot-1-depth-or-bias-candidate",
      "draw=FUN_00a78128(buffer0x58,buffer0x5c,4,count0x64,buffer0x68);role=draw-wrapper-to-FUN_00a75e3c",
      "lazyEnd=FUN_00a780e8();role=end-first-caster-state-block-when-local_69-set",
      "post=FUN_00a7816c(3);role=state-slot-3-restore-or-enable-after-shadow-volume-loop"
    ];
    fastShadow.userData.placeableTwoDaFastShadowVolumeRenderStateCallSource =
      "C:/Projects/New Folder/export/decompiled_all.c:913929 calls FUN_00a7818c(3); 913995-914015 lazily enters FUN_00a780f0, binds DAT_00d0247c, uploads uniforms, and draws through FUN_00a78128; 914024-914027 calls FUN_00a780e8 then FUN_00a7816c(3); 904063-904147 wraps these state functions";
    fastShadow.userData.placeableTwoDaFastShadowVolumeRenderStateCallProofStatus =
      "source-backed-shadowvol-render-state-wrapper-call-sequence-slot3-gl-cull-face-exposed-wrapped-state-factor-parity-blocked";
    fastShadow.userData.placeableTwoDaFastShadowVolumeRenderStateWrapperSemantics = [
      "slot3=FUN_00a7818c(3)->FUN_00a6f0bc(3)->glDisable(GL_CULL_FACE/0x0b44);stateBit=_DAT_00d01c0c bit3 cleared",
      "slot3Restore=FUN_00a7816c(3)->FUN_00a6ef90(3)->glEnable(GL_CULL_FACE/0x0b44);stateBit=_DAT_00d01c0c bit3 set",
      "stateStack=FUN_00a780f0()->FUN_00a6c520 pushes or allocates a 0x40-byte render-state block",
      "stateRestore=FUN_00a780e8()->FUN_00a6c44c copies previous 0x40-byte block and pops/restores it",
      "stencilCache=FUN_00a6f2b4 caches front slots DAT_00ccb008..00c and back slots DAT_00ccb014..01c before PTR_DAT_00d3dd6c glStencilOpSeparate dispatch"
    ];
    fastShadow.userData.placeableTwoDaFastShadowVolumeRenderStateWrapperSource =
      "C:/Projects/New Folder/export/decompiled_all.c:898307-898358 FUN_00a6ef90 enables cached render-state slots and slot 3 calls glEnable; 898365-898416 FUN_00a6f0bc disables cached slots and slot 3 calls glDisable; C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe x86 jump tables 0xa6efc4/0xa6f0f2 map case 3 to push 0x0b44 before glEnable/glDisable, i.e. GL_CULL_FACE; 896387-896475 FUN_00a6c44c/FUN_00a6c520 copy and push/pop 0x40-byte render-state blocks; 898458-898510 FUN_00a6f2b4 cache-checks front/back stencil op slots before dispatching PTR_DAT_00d3dd6c";
    fastShadow.userData.placeableTwoDaFastShadowVolumeRenderStateWrapperProofStatus =
      "source-backed-shadowvol-render-state-slot3-gl-cull-face-stack-and-stencil-cache-exposed-other-state-parity-blocked";
    fastShadow.userData.placeableTwoDaFastShadowVolumeDirectCallerBufferBuilderSource =
      "C:/Projects/New Folder/export/decompiled_all.c:888069-888414 FUN_00a5fdb4 is the direct caller/buffer builder, computes caster edges, calls FUN_00a878f8(DAT_00d0233c), allocates/maps caster buffers, transforms source vertices, writes paired w=1/w=0 records, fills six indices per caster edge, and has no blend/depth/color-mask raw or facade wrapper hits";
    fastShadow.userData.placeableTwoDaFastShadowVolumeDirectCallerBufferBuilderBlocker =
      "FUN_00a5fdb4 direct caller/buffer-builder window 888069-888414 is source-backed and contains no blend/depth/color-mask raw or facade wrapper call; inherited render-state parity must be proven from a higher scene render path or retail oracle";
    fastShadow.userData.placeableTwoDaFastShadowVolumeDirectCallerBufferBuilderProofStatus =
      "source-backed-shadowvol-direct-caller-buffer-builder-no-blend-depth-color-mask-state-wrapper";
    fastShadow.userData.placeableTwoDaFastShadowVolumeActiveLightRenderEnvelopeState = [
      "activeLightGlobal=DAT_00d0233c=param_1",
      "depthFuncFacade=FUN_00a78724()->FUN_00a6f518()->glDepthFunc",
      "blendFuncFacade=FUN_00a7819c()->FUN_00a6f1ec()->glBlendFunc",
      "vtableDispatch=param_1+0xc+0x138",
      "vtableDispatch=param_1+0xc+0x108",
      "restoreSlots=FUN_00a7816c(0/1/4/5)"
    ];
    fastShadow.userData.placeableTwoDaFastShadowVolumeActiveLightRenderEnvelopeSource =
      "C:/Projects/New Folder/export/decompiled_all.c:910553-910663 FUN_00a82464 creates the active-light render envelope: 910600 sets DAT_00d0233c=param_1, 910638-910642 exposes FUN_00a7816c(1), FUN_00a78724, FUN_00a7816c(0), and FUN_00a7819c before vtable +0x138 dispatch, 910643 and 910661 clear DAT_00d0233c, and 910657-910663 runs FUN_00a78a04/FUN_00a7dda0 plus vtable +0x108 dispatch before restoring slots 4/5";
    fastShadow.userData.placeableTwoDaFastShadowVolumeActiveLightRenderEnvelopeBlocker =
      "FUN_00a82464 active-light render envelope is source-backed and shows depthFunc/blendFunc facade calls plus +0x138/+0x108 vtable dispatch, but contains no color/depth-mask wrapper call; exact inherited render state through the indirect scene render target and retail pixels remain blocked";
    fastShadow.userData.placeableTwoDaFastShadowVolumeActiveLightRenderEnvelopeProofStatus =
      "source-backed-shadowvol-active-light-render-envelope-vtable-dispatch-blend-depthfunc-wrapper-exposed-parity-blocked";
    fastShadow.userData.placeableTwoDaFastShadowVolumeLocalDrawStateOrder = [
      "pre=FUN_00a7818c(3);role=disable-render-state-slot-3-before-shadow-volume-traversal",
      "zpass=FUN_00a78344(0,0,0,3);role=front-face-GL_KEEP-GL_KEEP-GL_INCR",
      "zpass=FUN_00a78344(1,0,0,4);role=back-face-GL_KEEP-GL_KEEP-GL_DECR",
      "lazyBegin=FUN_00a780f0();role=push-render-state-block-before-first-caster-draw",
      "perCaster=FUN_00a785d4(light-matrix-pointer);role=upload-shadow-light-transform",
      "perCaster=FUN_00a788b0(DAT_00d0247c);role=bind-vs_shadowvol-fs_shadowvol-program",
      "perCaster=FUN_00a78994(0);role=upload-shadow-volume-uniform-slot-0",
      "perCaster=FUN_00a78980(1,fVar2);role=upload-shadow-volume-scalar-uniform-slot-1",
      "draw=FUN_00a78128(buffer0x58,buffer0x5c,4,count0x64,buffer0x68);role=draw-caster-buffer-through-FUN_00a75e3c",
      "lazyEnd=FUN_00a780e8();role=pop-render-state-block-after-caster-draw",
      "post=FUN_00a7816c(3);role=restore-render-state-slot-3-after-shadow-volume-traversal",
      "zfail=FUN_00a78344(0,0,4,0);role=front-face-GL_KEEP-GL_DECR-GL_KEEP",
      "zfail=FUN_00a78344(1,0,3,0);role=back-face-GL_KEEP-GL_INCR-GL_KEEP"
    ];
    fastShadow.userData.placeableTwoDaFastShadowVolumeLocalDrawStateOrderSource =
      "C:/Projects/New Folder/export/decompiled_all.c:913929 disables render-state slot 3; 913986-913987 sets z-pass front/back stencil ops; 913996 pushes state; 913999 uploads the shadow-light transform; 914001 binds DAT_00d0247c; 914002/914012 upload uniform slots 0/1; 914014 draws through FUN_00a78128; 914025 pops state; 914027 restores slot 3; 914032-914033 switches to z-fail front/back stencil ops; backend audit found localBlendDepthColorMaskCallHits=[] in 913929-914033, immediate caller blendDepthColorMaskCallHits=[] in 888188-888213, direct caller/buffer-builder blendDepthColorMaskCallHits=[] in 888069-888414, and active-light render envelope colorDepthMaskCallHits=[] in 910553-910663";
    fastShadow.userData.placeableTwoDaFastShadowVolumeLocalDrawStateOrderBlocker =
      "FUN_00a878f8 local shadow-volume draw order is source-backed; the immediate caller, full FUN_00a5fdb4 direct caller/buffer-builder, and FUN_00a82464 active-light render envelope have no color/depth-mask wrapper calls beyond exposed blend/depthFunc facades; indirect vtable inherited render-state and retail pixel parity remain blocked";
    fastShadow.userData.placeableTwoDaFastShadowVolumeLocalDrawStateOrderProofStatus =
      "source-backed-shadowvol-local-draw-state-order-exposed-outer-blend-depth-color-mask-parity-blocked";
    fastShadow.userData.placeableTwoDaFastShadowVolumeShaderUniformSemantics = [
      "transform=FUN_00a785d4(light-matrix-pointer)->FUN_00a6dda4()->FUN_00a482a8(0xe320d0,param_1);counter=DAT_00e34710",
      "shaderBind=FUN_00a788b0(DAT_00d0247c)->FUN_00a74fd0;nonzeroProgramStored=DAT_00cff754",
      "uniformSlot0=FUN_00a78994(0)->FUN_00a7278c;vec4Words=DAT_00cff71c+slot*0x10",
      "uniformSlot1=FUN_00a78980(1,fVar2)->FUN_00a72764;scalar=DAT_00e346b4+slot*4"
    ];
    fastShadow.userData.placeableTwoDaFastShadowVolumeShaderUniformSource =
      "C:/Projects/New Folder/export/decompiled_all.c:913999 calls FUN_00a785d4 with caster matrix pointer, 914001 binds DAT_00d0247c through FUN_00a788b0, 914002 uploads uniform slot 0 through FUN_00a78994(0), and 914012 uploads scalar slot 1 through FUN_00a78980(1,fVar2); 904560-904969 wraps shader/uniform helpers; 897399-897403 FUN_00a6dda4 copies through FUN_00a482a8(0xe320d0,param_1); 902170-902176 FUN_00a74fd0 stores DAT_00cff754; 900870-900884 FUN_00a7278c copies four words into DAT_00cff71c+slot*0x10; 900852-900857 FUN_00a72764 writes scalar slot data into DAT_00e346b4+slot*4";
    fastShadow.userData.placeableTwoDaFastShadowVolumeShaderUniformProofStatus =
      "source-backed-shadowvol-shader-bind-transform-and-uniform-slot-writes-exposed-retail-pixel-parity-blocked";
    fastShadow.userData.placeableTwoDaFastShadowVolumeRenderPathSource =
      "C:/Projects/New Folder/export/decompiled_all.c:913914-914017 FUN_00a878f8 loads vs_shadowvol/fs_shadowvol, configures shadow-volume state, walks branch-dependent scene render buckets (local_29=false: 0xd -> 0xe; local_29=true: 0xd -> 0xb -> 0xe -> 0xc), draws caster geometry, and clears the per-caster shadow counter";
    fastShadow.userData.placeableTwoDaFastShadowVolumeDrawWrapperSource =
      "C:/Projects/New Folder/export/decompiled_all.c:904108-904112 FUN_00a78128 wraps FUN_00a75e3c; 902867-902912 FUN_00a75e3c binds buffers and dispatches through PTR_DAT_00d3dda8 or glDrawArrays";
    fastShadow.userData.placeableTwoDaFastShadowVolumeLightProfileSource =
      "C:/Projects/New Folder/export/decompiled_all.c:913930-913955 uses radius +0x58, shadowradius +0x60 when positive, and verticaldisplacement +0x64 for the point-light shadow-volume profile";
    fastShadow.userData.placeableTwoDaFastShadowVolumeRenderPathProofStatus =
      "source-backed-shadowvol-shader-buckets-draw-wrapper-caster-reset-stencil-parity-blocked";
    fastShadow.userData.placeableTwoDaFastShadowProofStatus =
      "source-backed-retail-placeable-shadow-mdl-emitter-textured-quad-proxy";
    scene.add(fastShadow);

    const diagnostics = resolveAuroraScenePointLightDiagnostics(scene);

    expect(diagnostics.shadow.pointLightCastShadowCount).toBe(1);
    expect(diagnostics.shadow.pointLightShadowSamples).toEqual([
      expect.stringContaining(
        "lane=source-mdl-light-node;name=torch_light12;proof=source-backed-mdl-shadow-pointlight-castShadow"
      )
    ]);
    expect(diagnostics.shadow.pointLightShadowSamples[0]).toContain(
      "effectiveShadowRadius=0"
    );
    expect(diagnostics.shadow.pointLightShadowSamples[0]).toContain(
      "projectionSourceRadius=1"
    );
    expect(diagnostics.shadow.pointLightShadowSamples[0]).toContain(
      "projectionWorldRadius=0.5"
    );
    expect(diagnostics.shadow.pointLightShadowSamples[0]).toContain(
      "projectionRadiusProof=source-backed-shadowradius-profile-scaled-three-shadow-camera-far"
    );
    expect(diagnostics.shadow.pointLightShadowSamples[0]).toContain(
      "renderer=three-pointlight-shadowmap-preview"
    );
    expect(diagnostics.shadow.pointLightShadowSamples[0]).toContain(
      "projectionStatus=blocked-three-shadowmap-preview-no-retail-shadowvol-extrusion-parity"
    );
    expect(diagnostics.shadow.pointLightShadowSamples[0]).toContain(
      "projectionSource=C:/Projects/New Folder/export/decompiled_all.c:913914-914017"
    );
    expect(diagnostics.shadow.pointLightShadowSamples[0]).toContain(
      "projectionProof=source-backed-mdl-shadowvol-renderer-blocked-no-three-parity"
    );
    expect(diagnostics.shadow.directionalLightCastShadowCount).toBe(1);
    expect(diagnostics.shadow.directionalLightShadowSamples).toEqual([
      expect.stringContaining(
        "lane=area-global-directional-shadow;name=terrain-area-global-diffuse-light;phase=sun;sourceField=SunShadows"
      )
    ]);
    expect(diagnostics.shadow.directionalLightShadowSamples[0]).toContain(
      "implementation=three-directional-castShadow-flag-only-shadow-volume-not-ported"
    );
    expect(diagnostics.shadow.directionalLightShadowSamples[0]).toContain("areaFactor=0.5");
    expect(diagnostics.shadow.fastShadowProxyCount).toBe(1);
    expect(diagnostics.shadow.fastShadowSamples).toEqual([
      expect.stringContaining(
        "object=catalog-vfx-preview:plc_plc_i06;status=active;shadowSize=1"
      )
    ]);
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain("areaFactor=0.5");
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain("shadowLane=medium");
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain("model=fx_shadow_m.mdl");
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "modelHash=9dd315aab5fb5a5483b0c74fb696dbea7702227b0e662e1d0d6027d84eb99f7d"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain("sourceNodeOffset=1764");
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain("emitter=Med");
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain("emitterType=Single");
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain("texture=fxpa_Dot01");
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "textureBinding=retail-key-bif-fxpa-dot01-confirmed-procedural-preview-alpha-map"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain("textureMapBound=true");
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "textureBindingProof=source-backed-retail-fxpa-dot01-resource-confirmed-preview-procedural-fallback"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain("blendMode=Normal");
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain("emitterPosition=0,0,0.03");
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain("emitterSize=1.6");
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "geometry=source-mdl-single-billboard-local-z-plane"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain("quadSize=1.6");
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "geometryProof=source-backed-retail-shadow-mdl-single-billboard-local-z-quad"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain("emitterAlpha=0.6");
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain("radius=0.8");
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain("opacity=0.3");
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "projectionStatus=source-backed-retail-shadow-mdl-single-billboard-local-z-textured-quad-shadowvol-stencil-pass-active-pixel-parity-blocked"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain("projectionSource=");
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain("Fx_Shadow_M");
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "projectionProof=source-backed-retail-shadowsize-shadow-mdl-textured-quad-active-proxy-shadowvol-stencil-pass-pixel-parity-blocked"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeStatus=source-backed-shadowvol-caster-buffer-three-geometry-bound-to-placeable-fast-shadow-proxy-stencil-lane-active-pixel-parity-blocked"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeGeometry=source-backed-shadowvol-caster-buffer-three-geometry-helper-ported-active-renderer-blocked"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain("volumeSourceVertices=4");
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain("volumeSourceQuadSize=1.6");
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeSourceQuadSizeSource=nwmain.exe 0x1408708c0..0x140870b0a"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain("volumeEdges=4");
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain("volumeRecords=10");
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain("volumeIndices=24");
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain("volumeW=auroraShadowVolumeW");
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeProof=source-backed-shadowvol-caster-buffer-three-geometry-helper-ported-active-renderer-blocked"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumePreview=source-backed-shadowvol-w-pair-extrusion-preview-active-stencil-parity-blocked"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumePreviewRenderer=three-shadermaterial-aurora-w-pair-extrusion-preview-no-stencil"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumePreviewVisible=true"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumePreviewW=auroraShadowVolumeW"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumePreviewLight=0,0,0.3"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumePreviewExtrusion=1.5"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumePreviewOpacity=0.096"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumePreviewSource=source-backed active Three ShaderMaterial preview"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumePreviewProof=source-backed-shadowvol-w-pair-preview-renderer-active-retail-stencil-parity-blocked"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeStencil=source-backed-shadowvol-w-pair-stencil-volume-pass-active-retail-pixel-parity-blocked"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeStencilRenderer=three-webgl-stencil-front-back-zpass-zfail-shadow-volume-preview"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeStencilVisible=true"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeStencilW=auroraShadowVolumeW"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeStencilLight=0,0,0.3"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeStencilExtrusion=1.5"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeStencilReceiverSize=1.8"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeStencilReceiverOpacity=0.078"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeStencilReceiverFunc=NotEqual(0)"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeStencilPasses=back:zpass,front:zpass,back:zfail,front:zfail"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeStencilRetailFaceOpTable=faces=slot0=GL_FRONT/0x404,slot1=GL_BACK/0x405"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeStencilRetailOps=phase=zpass,pass=front:zpass,call=FUN_00a78344(0,0,0,3),faceSlot=0,face=GL_FRONT/0x404"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "pass=back:zfail,call=FUN_00a78344(1,0,3,0),faceSlot=1,face=GL_BACK/0x405"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeStencilRetailOpsSource=C:/Projects/New Folder/export/decompiled_all.c:913986-913987"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeStencilSource=source-backed active Three WebGL stencil receiver overlay"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeStencilProof=source-backed-shadowvol-w-pair-stencil-pass-active-retail-face-op-mapped-pixel-parity-blocked"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeShaders=vs_shadowvol,fs_shadowvol"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeBuckets=0xd,0xe,0xb,0xc"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeBucketPhases=case=local_29_false;condition=current-light-branch-not-active;sequence=0xd:zpass->0xe:zfail,case=local_29_true"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "sequence=0xd:zpass->0xb:zpass->0xe:zfail->0xc:zfail"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeBucketPhaseSource=C:/Projects/New Folder/export/decompiled_all.c:913922-913928"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeBucketPhaseProof=source-backed-shadowvol-branch-aware-bucket-op-ordering-retail-pixel-parity-blocked"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeStateCalls=pre=FUN_00a7818c(3);role=state-slot-3-disable-or-cache-before-shadow-volume-loop"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "draw=FUN_00a78128(buffer0x58,buffer0x5c,4,count0x64,buffer0x68)"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeStateCallSource=C:/Projects/New Folder/export/decompiled_all.c:913929"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeStateCallProof=source-backed-shadowvol-render-state-wrapper-call-sequence-slot3-gl-cull-face-exposed-wrapped-state-factor-parity-blocked"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeStateWrapper=slot3=FUN_00a7818c(3)->FUN_00a6f0bc(3)->glDisable(GL_CULL_FACE/0x0b44)"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "stateStack=FUN_00a780f0()->FUN_00a6c520"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeStateWrapperSource=C:/Projects/New Folder/export/decompiled_all.c:898307-898358"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeStateWrapperProof=source-backed-shadowvol-render-state-slot3-gl-cull-face-stack-and-stencil-cache-exposed-other-state-parity-blocked"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeLocalDrawStateOrder=pre=FUN_00a7818c(3);role=disable-render-state-slot-3-before-shadow-volume-traversal"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "zfail=FUN_00a78344(1,0,3,0);role=back-face-GL_KEEP-GL_INCR-GL_KEEP"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeLocalDrawStateOrderSource=C:/Projects/New Folder/export/decompiled_all.c:913929"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "localBlendDepthColorMaskCallHits=[]"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeDirectCallerBufferBuilderSource=C:/Projects/New Folder/export/decompiled_all.c:888069-888414 FUN_00a5fdb4"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeDirectCallerBufferBuilderBlocker=FUN_00a5fdb4 direct caller/buffer-builder window 888069-888414"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeDirectCallerBufferBuilderProof=source-backed-shadowvol-direct-caller-buffer-builder-no-blend-depth-color-mask-state-wrapper"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeActiveLightRenderEnvelopeState=activeLightGlobal=DAT_00d0233c=param_1"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "vtableDispatch=param_1+0xc+0x108"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeActiveLightRenderEnvelopeSource=C:/Projects/New Folder/export/decompiled_all.c:910553-910663 FUN_00a82464"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeActiveLightRenderEnvelopeBlocker=FUN_00a82464 active-light render envelope is source-backed"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeActiveLightRenderEnvelopeProof=source-backed-shadowvol-active-light-render-envelope-vtable-dispatch-blend-depthfunc-wrapper-exposed-parity-blocked"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeLocalDrawStateOrderBlocker=FUN_00a878f8 local shadow-volume draw order is source-backed"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "FUN_00a82464 active-light render envelope have no color/depth-mask wrapper calls"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeLocalDrawStateOrderProof=source-backed-shadowvol-local-draw-state-order-exposed-outer-blend-depth-color-mask-parity-blocked"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeShaderUniforms=transform=FUN_00a785d4(light-matrix-pointer)->FUN_00a6dda4()"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "shaderBind=FUN_00a788b0(DAT_00d0247c)->FUN_00a74fd0"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeShaderUniformSource=C:/Projects/New Folder/export/decompiled_all.c:913999"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumeShaderUniformProof=source-backed-shadowvol-shader-bind-transform-and-uniform-slot-writes-exposed-retail-pixel-parity-blocked"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain("volumePath=");
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain("FUN_00a878f8");
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain("volumeDrawWrapper=");
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "FUN_00a78128 wraps FUN_00a75e3c"
    );
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain("volumeLightProfile=");
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain("shadowradius +0x60");
    expect(diagnostics.shadow.fastShadowSamples[0]).toContain(
      "volumePathProof=source-backed-shadowvol-shader-buckets-draw-wrapper-caster-reset-stencil-parity-blocked"
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeStatus).toBe(
      AURORA_SCENE_SHADOW_VOLUME_RUNTIME_PROBE_ACTIVE_STATUS
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeProofSource).toBe(
      AURORA_SCENE_SHADOW_VOLUME_RUNTIME_PROBE_PROOF_SOURCE
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeBlocker).toBe(
      AURORA_SCENE_SHADOW_VOLUME_RUNTIME_PROBE_BLOCKER
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeLocalPixelProofStatus).toBe(
      AURORA_SCENE_SHADOW_VOLUME_RUNTIME_PROBE_LOCAL_PIXEL_STATUS
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeActiveCasterCount).toBe(1);
    expect(
      diagnostics.shadow.retailProjectionRuntimeProbeProjectionPreviewCount
    ).toBe(1);
    expect(diagnostics.shadow.retailProjectionRuntimeProbeStencilReceiverCount).toBe(1);
    expect(
      diagnostics.shadow.retailProjectionRuntimeProbeStencilVolumePassCount
    ).toBe(4);
    expect(diagnostics.shadow.retailProjectionRuntimeProbeExpectedStencilPasses).toEqual([
      ...AURORA_SCENE_SHADOW_VOLUME_RUNTIME_PROBE_EXPECTED_STENCIL_PASSES
    ]);
    expect(diagnostics.shadow.retailProjectionRuntimeProbeObservedStencilPasses).toEqual([
      "back:zfail",
      "back:zpass",
      "front:zfail",
      "front:zpass"
    ]);
    expect(diagnostics.shadow.retailProjectionRuntimeProbeRenderShaderNames).toEqual([
      "fs_shadowvol",
      "vs_shadowvol"
    ]);
    expect(diagnostics.shadow.retailProjectionRuntimeProbeRenderBuckets).toEqual([
      "0xb",
      "0xc",
      "0xd",
      "0xe"
    ]);
    expect(diagnostics.shadow.retailProjectionRuntimeProbeSamples).toEqual([
      expect.stringContaining(
        "object=catalog-vfx-preview:plc_plc_i06;status=active;caster=active"
      )
    ]);
    expect(diagnostics.shadow.retailProjectionRuntimeProbeSamples[0]).toContain(
      "sourceQuadSize=1.6;edges=4;records=10;indices=24;recordsPerSource=2;indicesPerEdge=6;w=auroraShadowVolumeW"
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeSamples[0]).toContain(
      "preview=true;previewRenderer=three-shadermaterial-aurora-w-pair-extrusion-preview-no-stencil"
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeSamples[0]).toContain(
      "stencil=true;stencilRenderer=three-webgl-stencil-front-back-zpass-zfail-shadow-volume-preview;receiver=NotEqual(0)"
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeSamples[0]).toContain(
      "passes=back:zpass,front:zpass,back:zfail,front:zfail"
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeSamples[0]).toContain(
      "retailFaceOpTable=faces=slot0=GL_FRONT/0x404,slot1=GL_BACK/0x405"
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeSamples[0]).toContain(
      "retailOps=phase=zpass,pass=front:zpass,call=FUN_00a78344(0,0,0,3),faceSlot=0,face=GL_FRONT/0x404"
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeSamples[0]).toContain(
      "retailOpsSource=C:/Projects/New Folder/export/decompiled_all.c:913986-913987"
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeSamples[0]).toContain(
      "bucketPhases=case=local_29_false;condition=current-light-branch-not-active;sequence=0xd:zpass->0xe:zfail,case=local_29_true"
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeSamples[0]).toContain(
      "sequence=0xd:zpass->0xb:zpass->0xe:zfail->0xc:zfail"
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeSamples[0]).toContain(
      "bucketPhaseSource=C:/Projects/New Folder/export/decompiled_all.c:913922-913928"
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeSamples[0]).toContain(
      "bucketPhaseProof=source-backed-shadowvol-branch-aware-bucket-op-ordering-retail-pixel-parity-blocked"
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeSamples[0]).toContain(
      "stateCalls=pre=FUN_00a7818c(3);role=state-slot-3-disable-or-cache-before-shadow-volume-loop"
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeSamples[0]).toContain(
      "draw=FUN_00a78128(buffer0x58,buffer0x5c,4,count0x64,buffer0x68)"
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeSamples[0]).toContain(
      "stateCallSource=C:/Projects/New Folder/export/decompiled_all.c:913929"
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeSamples[0]).toContain(
      "stateCallProof=source-backed-shadowvol-render-state-wrapper-call-sequence-slot3-gl-cull-face-exposed-wrapped-state-factor-parity-blocked"
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeSamples[0]).toContain(
      "stateWrapper=slot3=FUN_00a7818c(3)->FUN_00a6f0bc(3)->glDisable(GL_CULL_FACE/0x0b44)"
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeSamples[0]).toContain(
      "stateRestore=FUN_00a780e8()->FUN_00a6c44c"
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeSamples[0]).toContain(
      "stateWrapperSource=C:/Projects/New Folder/export/decompiled_all.c:898307-898358"
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeSamples[0]).toContain(
      "stateWrapperProof=source-backed-shadowvol-render-state-slot3-gl-cull-face-stack-and-stencil-cache-exposed-other-state-parity-blocked"
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeSamples[0]).toContain(
      "localDrawStateOrder=pre=FUN_00a7818c(3);role=disable-render-state-slot-3-before-shadow-volume-traversal"
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeSamples[0]).toContain(
      "zfail=FUN_00a78344(1,0,3,0);role=back-face-GL_KEEP-GL_INCR-GL_KEEP"
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeSamples[0]).toContain(
      "localDrawStateOrderSource=C:/Projects/New Folder/export/decompiled_all.c:913929"
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeSamples[0]).toContain(
      "localBlendDepthColorMaskCallHits=[]"
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeSamples[0]).toContain(
      "directCallerBufferBuilderSource=C:/Projects/New Folder/export/decompiled_all.c:888069-888414 FUN_00a5fdb4"
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeSamples[0]).toContain(
      "directCallerBufferBuilderBlocker=FUN_00a5fdb4 direct caller/buffer-builder window 888069-888414"
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeSamples[0]).toContain(
      "directCallerBufferBuilderProof=source-backed-shadowvol-direct-caller-buffer-builder-no-blend-depth-color-mask-state-wrapper"
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeSamples[0]).toContain(
      "activeLightRenderEnvelopeState=activeLightGlobal=DAT_00d0233c=param_1"
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeSamples[0]).toContain(
      "activeLightRenderEnvelopeSource=C:/Projects/New Folder/export/decompiled_all.c:910553-910663 FUN_00a82464"
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeSamples[0]).toContain(
      "activeLightRenderEnvelopeBlocker=FUN_00a82464 active-light render envelope is source-backed"
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeSamples[0]).toContain(
      "activeLightRenderEnvelopeProof=source-backed-shadowvol-active-light-render-envelope-vtable-dispatch-blend-depthfunc-wrapper-exposed-parity-blocked"
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeSamples[0]).toContain(
      "localDrawStateOrderBlocker=FUN_00a878f8 local shadow-volume draw order is source-backed"
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeSamples[0]).toContain(
      "localDrawStateOrderProof=source-backed-shadowvol-local-draw-state-order-exposed-outer-blend-depth-color-mask-parity-blocked"
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeSamples[0]).toContain(
      "shaderUniforms=transform=FUN_00a785d4(light-matrix-pointer)->FUN_00a6dda4()"
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeSamples[0]).toContain(
      "shaderUniformProof=source-backed-shadowvol-shader-bind-transform-and-uniform-slot-writes-exposed-retail-pixel-parity-blocked"
    );
    expect(diagnostics.shadow.retailProjectionRuntimeProbeSamples[0]).toContain(
      "localPixelProof=local-cdp-canvas-pixels-required-not-retail-oracle;retailParity=blocked"
    );
    expect(diagnostics.shadow.areaShadowStatus).toBe("enabled");
    expect(diagnostics.shadow.areaShadowSourceField).toBe("SunShadows");
    expect(diagnostics.shadow.areaShadowOpacity).toBe(50);
    expect(diagnostics.shadow.areaShadowOpacityFactor).toBe(0.5);
  });
});
