import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  createAuroraVfxCanonicalRenderGroup,
  resolveAuroraVfxCanonicalTextureReference
} from "../../layout/adapters/three/auroraVfxCanonicalRenderer";
import {
  resolveAuroraScenePointLightDiagnostics,
  type AuroraScenePointLightDiagnostics
} from "../../layout/adapters/three/workspaceSceneLightDiagnostics";
import { installAuroraLinearLightFalloffShaderChunk } from "../../layout/adapters/three/auroraThreeLightFalloff";
import { AuroraRetailBloomPass } from "../../layout/adapters/three/auroraRetailBloomPass";
import { installAuroraVfxRenderQueueSort } from "../../layout/adapters/three/auroraVfxRenderQueue";
import {
  createDevAuroraVfxPayload,
  DEV_VFX_CHUNK_MODEL_FIXTURE_RESOURCE_KEY,
  DEV_VFX_DEFAULT_FIXTURE_ID,
  DEV_VFX_TEXTURE_REFERENCE,
  type DevVfxDiagnosticSceneProfile
} from "./vfxFixturePayloads";

const DEV_VFX_ROUTE_PREFIX = "/dev/vfx-fixture";
const RENDER_WIDTH = 960;
const RENDER_HEIGHT = 540;
const DEV_VFX_TEXTURE_PROFILE = "radial-soft-atlas-4x4-v2";
const DEV_VFX_ATLAS_COLUMNS = 4;
const DEV_VFX_ATLAS_ROWS = 4;
const DEV_VFX_ATLAS_CELL_SIZE = 32;
const DEV_VFX_TEXTURE_WIDTH = DEV_VFX_ATLAS_COLUMNS * DEV_VFX_ATLAS_CELL_SIZE;
const DEV_VFX_TEXTURE_HEIGHT = DEV_VFX_ATLAS_ROWS * DEV_VFX_ATLAS_CELL_SIZE;
const DEV_VFX_CROSS_LANE_PROOF_SOURCE =
  "local dev fixture adds source-backed diagnostic PointLight lanes for terrain tile, placeables.2da, source MDL, and item-property light, plus the ProgFX Type 4 request preserved by the canonical VFX payload; this proves Aurora Web runtime lane coverage, not retail insertion order";
const DEV_VFX_CROSS_LANE_ORDERING_BLOCKER =
  "retail LightManager common insertion/creation callsite remains blocked; runtime fixture does not claim tile/placeable/MDL/item/ProgFX retail precedence";
const DEV_VFX_CROSS_LANE_INTENSITY_SOURCE =
  "local cross-lane runtime probe fixture intensity scalar; lane-specific source facts are carried separately and retail pixel/intensity parity remains blocked";
const DEV_VFX_CROSS_LANE_INTENSITY_PROOF_STATUS =
  "local-diagnostic-cross-lane-intensity-fixture-retail-pixel-parity-blocked";

interface VfxFixtureRunnerRequest {
  fixtureId: string;
  timeSeconds: number;
  seed: number;
  captureDataUrl: boolean;
}

interface VfxFixtureRunnerProps {
  pathname?: string;
  search?: string;
}

interface SceneLightDiagnosticSnapshot {
  pointLightCount: number;
  sourceBackedPointLightCount: number;
  pointLightLanes: string[];
  pointLightLaneCounts: Record<string, number>;
  pointLightPreviewBudgetCap: number | null;
  pointLightPreviewBudgetHardCap: number | null;
  pointLightPreviewBudgetCapSource: string;
  pointLightPreviewBudgetCapProofStatus: string;
  pointLightProofStatus: string;
  pointLightRetailOrderingStatus: string;
  pointLightRetailOrderingProofSource: string;
  pointLightRetailOrderingProofStatus: string;
  pointLightRetailOrderingManagerCrossLaneCallsiteBlocker: string;
  pointLightRetailOrderingCoverageStatus: string;
  pointLightRetailOrderingRequiredLanes: string[];
  pointLightRetailOrderingObservedLanes: string[];
  pointLightRetailOrderingMissingLanes: string[];
  pointLightRetailOrderingRuntimeProbeStatus: string;
  pointLightRetailOrderingRuntimeProbeProofSource: string;
  pointLightRetailOrderingRuntimeProbeBlocker: string;
  pointLightRetailOrderingRuntimeProbeLocalOrderSource: string;
  pointLightRetailOrderingRuntimeProbeRequiredLaneCoverageCount: number;
  pointLightRetailOrderingRuntimeProbePointLightSampleCount: number;
  pointLightRetailOrderingRuntimeProbeNonPointRequestSampleCount: number;
  pointLightRetailOrderingRuntimeProbeBudgetAcceptedLanes: string[];
  pointLightRetailOrderingRuntimeProbeBudgetDroppedLanes: string[];
  pointLightRetailOrderingRuntimeProbeBudgetUnknownLanes: string[];
  pointLightRetailOrderingRuntimeProbeLocalOrderSamples: string[];
  pointLightRetailOrderingPreviewBudgetPlanStatus: string;
  pointLightRetailOrderingPreviewBudgetPlanStrategy: string;
  pointLightRetailOrderingPreviewBudgetPlanProofSource: string;
  pointLightRetailOrderingPreviewBudgetPlanProofStatus: string;
  pointLightRetailOrderingPreviewBudgetPlanBlocker: string;
  pointLightRetailOrderingPreviewBudgetPlanAcceptedLanes: string[];
  pointLightRetailOrderingPreviewBudgetPlanDroppedLanes: string[];
  pointLightRetailOrderingPreviewBudgetPlanSamples: string[];
  pointLightBudgetMode: string;
  pointLightSamples: string[];
  nonPointLightRequestCount: number;
  nonPointLightRequestLanes: string[];
  nonPointLightRequestLaneCounts: Record<string, number>;
  nonPointLightRequestSamples: string[];
  nonPointLightRequestSchedulerStatus: string;
  nonPointLightRequestSchedulerProofSource: string;
  nonPointLightRequestSchedulerBlocker: string;
  nonPointLightRequestSchedulerPriorityWinner: string;
  nonPointLightRequestSchedulerPriorityEvaluationOrderSource: string;
  nonPointLightRequestSchedulerPriorityEvaluationOrder: string[];
  nonPointLightRequestSchedulerPriorityTiePolicyStatus: string;
  nonPointLightRequestSchedulerPriorityZeroPolicyStatus: string;
  nonPointLightRequestSchedulerPriorityZeroRuntimeCaptureStatus: string;
  nonPointLightRequestSchedulerCanonicalParityStatus: string;
  nonPointLightRequestSchedulerPriorityTieGroupCount: number;
  nonPointLightRequestSchedulerPriorityZeroAlwaysAppliesRequestCount: number;
  nonPointLightRequestSchedulerSceneAttachmentRequestCount: number;
  nonPointLightRequestSchedulerProximitySuppressionCandidateCount: number;
  nonPointLightRequestSchedulerVisionRequestCount: number;
  nonPointLightRequestSchedulerLightRequestCount: number;
  nonPointLightRequestSchedulerWouldSuppressScenePointLights: boolean;
  nonPointLightRequestSchedulerSamples: string[];
  shadowProofStatus: string;
  shadowRetailProjectionStatus: string;
  shadowRetailProjectionSource: string;
  shadowRetailProjectionShaderNames: string[];
  shadowRetailProjectionLightProfileSource: string;
  shadowRetailProjectionLightProfileStatus: string;
  shadowRetailProjectionGeometrySource: string;
  shadowRetailProjectionGeometryStatus: string;
  shadowRetailProjectionRenderBuckets: string[];
  shadowRetailProjectionProofStatus: string;
  shadowRetailProjectionBlocker: string;
  shadowRetailProjectionRuntimeProbeStatus: string;
  shadowRetailProjectionRuntimeProbeProofSource: string;
  shadowRetailProjectionRuntimeProbeBlocker: string;
  shadowRetailProjectionRuntimeProbeLocalPixelProofStatus: string;
  shadowRetailProjectionRuntimeProbeActiveCasterCount: number;
  shadowRetailProjectionRuntimeProbeProjectionPreviewCount: number;
  shadowRetailProjectionRuntimeProbeStencilReceiverCount: number;
  shadowRetailProjectionRuntimeProbeStencilVolumePassCount: number;
  shadowRetailProjectionRuntimeProbeExpectedStencilPasses: string[];
  shadowRetailProjectionRuntimeProbeObservedStencilPasses: string[];
  shadowRetailProjectionRuntimeProbeRenderShaderNames: string[];
  shadowRetailProjectionRuntimeProbeRenderBuckets: string[];
  shadowRetailProjectionRuntimeProbeSamples: string[];
  shadowPointLightCastShadowCount: number;
  shadowPointLightSamples: string[];
  shadowItemPropertyLightShadowPolicyCount: number;
  shadowItemPropertyLightShadowPolicySamples: string[];
  shadowDirectionalLightCastShadowCount: number;
  shadowDirectionalLightSamples: string[];
  shadowProgFxType4ShadowRequestCount: number;
  shadowProgFxType4ShadowRequestSamples: string[];
  shadowFastShadowProxyCount: number;
  shadowFastShadowDisabledCount: number;
  shadowFastShadowSamples: string[];
  shadowAreaStatus: string;
  shadowAreaSourceField: string;
  shadowAreaStatusSource: string;
  shadowAreaOpacity: number | null;
  shadowAreaOpacitySource: string;
  shadowAreaOpacityFactor: number | null;
  shadowAreaOpacityFactorSource: string;
}

interface VfxRenderStatus {
  status: "pending" | "rendered" | "skipped-test" | "webgl-unavailable" | "error";
  objectVisible: boolean;
  objectPixelCount: number;
  renderedDrawParticles: number;
  renderedVertices: number;
  renderedChunkModelCount: number;
  renderedChunkLaneCount: number;
  renderedChunkLaneResourceResolveStatus: string;
  renderedChunkLaneChunkName: string;
  renderedChunkLaneActiveParticleCount: number;
  renderedChunkLaneResolvedResourceKey: string;
  renderedChunkLaneResolvedResourceLayer: string;
  renderedChunkLaneResolvedResourcePath: string;
  renderedChunkLaneResolvedResourceHash: string;
  renderedChunkLaneResolvedResourceCandidateId: string;
  renderedChunkLaneRendererPending: string;
  renderedChunkLaneModelPreviewStatus: string;
  renderedDrawRecordIds: string[];
  renderedEmitterNodeNames: string[];
  renderedDrawRecordLanes: string[];
  renderedParticleIds: number[];
  renderedParticleIndexes: number[];
  renderedPositionX: number[];
  renderedPositionY: number[];
  renderedPositionZ: number[];
  renderedVelocityX: number[];
  renderedVelocityY: number[];
  renderedVelocityZ: number[];
  renderedColorR: number[];
  renderedColorG: number[];
  renderedColorB: number[];
  renderedParticleSizeX: number[];
  renderedParticleSizeY: number[];
  renderedAlpha: number[];
  renderedRecordVerticesPerParticle: number[];
  renderedPltLayers: string[];
  renderedPltLayerColorSources: string[];
  renderedRenderOrder: number;
  renderedRenderMode: string;
  renderedRenderModeRawToken: string;
  renderedBlendMode: string;
  renderedBlendModeRawToken: string;
  renderedBlendModeNumber: number;
  renderedDiagnosticCodes: string[];
  renderedAtlasFrames: number[];
  renderedAtlasUvU0: number[];
  renderedAtlasUvV0: number[];
  renderedAtlasUvU1: number[];
  renderedAtlasUvV1: number[];
  renderedGeometryNonIndexedDrawArrays: string;
  renderedGeometryIndexedDrawArrays: string;
  renderedGeometryLinkedSegmentTopology: string;
  renderedGeometryLinkedSegmentCount: number;
  renderedGeometryLinkedSegmentSource: string;
  renderedGeometryRenderModeBasisModes: string[];
  renderedGeometryRenderModeBasisSources: string[];
  renderedGeometryRenderModeUsesVelocityBasis: string;
  renderedGeometryDrawModeArgument: number;
  renderedGeometryDrawModeArgumentSource: string;
  renderedGeometryVerticesPerParticle: number;
  renderedGeometryAtlasUvSource: string;
  renderedGeometryPositionAttributeCount: number;
  renderedGeometryPositionAttributeItemSize: number;
  renderedGeometryPositionAttributeXMin: number;
  renderedGeometryPositionAttributeXMax: number;
  renderedGeometryPositionAttributeYMin: number;
  renderedGeometryPositionAttributeYMax: number;
  renderedGeometryPositionAttributeZMin: number;
  renderedGeometryPositionAttributeZMax: number;
  renderedGeometryPositionAttributeMinUniqueValuesPerRecord: number;
  renderedGeometryPositionAttributeMaxUniqueValuesPerRecord: number;
  renderedGeometryColorAttributeCount: number;
  renderedGeometryColorAttributeItemSize: number;
  renderedGeometryColorAttributeUniqueCount: number;
  renderedGeometryColorAttributeRMin: number;
  renderedGeometryColorAttributeRMax: number;
  renderedGeometryColorAttributeGMin: number;
  renderedGeometryColorAttributeGMax: number;
  renderedGeometryColorAttributeBMin: number;
  renderedGeometryColorAttributeBMax: number;
  renderedGeometryColorAttributeMinUniqueValuesPerRecord: number;
  renderedGeometryColorAttributeMaxUniqueValuesPerRecord: number;
  renderedGeometryAlphaAttributeCount: number;
  renderedGeometryAlphaAttributeItemSize: number;
  renderedGeometryAlphaAttributeMin: number;
  renderedGeometryAlphaAttributeMax: number;
  renderedGeometryAlphaAttributeMinUniqueValuesPerRecord: number;
  renderedGeometryAlphaAttributeMaxUniqueValuesPerRecord: number;
  renderedGeometryParticleSizeAttributeCount: number;
  renderedGeometryParticleSizeAttributeItemSize: number;
  renderedGeometryParticleSizeAttributeXMin: number;
  renderedGeometryParticleSizeAttributeXMax: number;
  renderedGeometryParticleSizeAttributeYMin: number;
  renderedGeometryParticleSizeAttributeYMax: number;
  renderedGeometryParticleSizeAttributeMinUniqueValuesPerRecord: number;
  renderedGeometryParticleSizeAttributeMaxUniqueValuesPerRecord: number;
  renderedGeometryAtlasFrameAttributeCount: number;
  renderedGeometryAtlasFrameAttributeItemSize: number;
  renderedGeometryAtlasFrameAttributeSource: string;
  renderedGeometryAtlasFrameAttributeUniqueCount: number;
  renderedGeometryAtlasFrameAttributeMin: number;
  renderedGeometryAtlasFrameAttributeMax: number;
  renderedGeometryAtlasFrameAttributeMinUniqueValuesPerRecord: number;
  renderedGeometryAtlasFrameAttributeMaxUniqueValuesPerRecord: number;
  renderedGeometryDrawRecordIndexAttributeCount: number;
  renderedGeometryDrawRecordIndexAttributeItemSize: number;
  renderedGeometryDrawRecordIndexAttributeSource: string;
  renderedGeometryDrawRecordIndexAttributeUniqueCount: number;
  renderedGeometryDrawRecordIndexAttributeMin: number;
  renderedGeometryDrawRecordIndexAttributeMax: number;
  renderedGeometryDrawRecordIndexAttributeMinVerticesPerRecord: number;
  renderedGeometryDrawRecordIndexAttributeMaxVerticesPerRecord: number;
  renderedGeometryUvAttributeCount: number;
  renderedGeometryUvAttributeItemSize: number;
  renderedGeometryUvAttributeUMin: number;
  renderedGeometryUvAttributeUMax: number;
  renderedGeometryUvAttributeVMin: number;
  renderedGeometryUvAttributeVMax: number;
  renderedGeometryUvAttributeMinUniqueValuesPerRecord: number;
  renderedGeometryUvAttributeMaxUniqueValuesPerRecord: number;
  renderedBoundsWidth: number;
  renderedBoundsHeight: number;
  renderedBoundsDepth: number;
  renderedBoundsCenterX: number;
  renderedBoundsCenterY: number;
  renderedBoundsCenterZ: number;
  renderedTextureReference: string;
  renderedTextureStatus: string;
  renderedMaterialTransparent: string;
  renderedMaterialDepthWrite: string;
  renderedMaterialDepthTest: string;
  renderedMaterialAlphaTest: number;
  renderedMaterialOpacity: number;
  renderedMaterialColorHex: string;
  renderedMaterialBlending: string;
  renderedMaterialBlendSrc: string;
  renderedMaterialBlendDst: string;
  renderedMaterialBlendEquation: string;
  renderedMaterialMapBound: string;
  renderedMaterialMapReference: string;
  renderedMaterialVertexColors: string;
  renderedMaterialSide: string;
  renderedMaterialStatus: string;
  renderedProgFxType4PointLightPreviewStatus: string;
  renderedProgFxType4PointLightPreviewSource: string;
  renderedProgFxType4PointLightCount: number;
  renderedProgFxType4MultiRequestPointLightPreviewStatus: string;
  renderedProgFxType4MultiRequestPointLightPreviewSource: string;
  renderedProgFxType4MultiRequestPointLightPreviewBlocker: string;
  renderedProgFxType4MultiRequestCount: number;
  renderedProgFxType4MultiRequestLightCount: number;
  renderedProgFxType4MultiRequestVisionCount: number;
  renderedProgFxType4MultiRequestEqualPriorityLightTieCount: number;
  renderedProgFxType4MultiRequestPointLightCount: number;
  renderedProgFxType4MultiRequestRuntimeOracleObservedSignal: string;
  renderedProgFxType4MultiRequestCanonicalParityPromoted: string;
  message: string;
}

const EMPTY_SCENE_LIGHT_DIAGNOSTICS: SceneLightDiagnosticSnapshot = {
  pointLightCount: 0,
  sourceBackedPointLightCount: 0,
  pointLightLanes: [],
  pointLightLaneCounts: {},
  pointLightPreviewBudgetCap: null,
  pointLightPreviewBudgetHardCap: null,
  pointLightPreviewBudgetCapSource: "",
  pointLightPreviewBudgetCapProofStatus: "",
  pointLightProofStatus: "",
  pointLightRetailOrderingStatus: "",
  pointLightRetailOrderingProofSource: "",
  pointLightRetailOrderingProofStatus: "",
  pointLightRetailOrderingManagerCrossLaneCallsiteBlocker: "",
  pointLightRetailOrderingCoverageStatus: "",
  pointLightRetailOrderingRequiredLanes: [],
  pointLightRetailOrderingObservedLanes: [],
  pointLightRetailOrderingMissingLanes: [],
  pointLightRetailOrderingRuntimeProbeStatus: "",
  pointLightRetailOrderingRuntimeProbeProofSource: "",
  pointLightRetailOrderingRuntimeProbeBlocker: "",
  pointLightRetailOrderingRuntimeProbeLocalOrderSource: "",
  pointLightRetailOrderingRuntimeProbeRequiredLaneCoverageCount: 0,
  pointLightRetailOrderingRuntimeProbePointLightSampleCount: 0,
  pointLightRetailOrderingRuntimeProbeNonPointRequestSampleCount: 0,
  pointLightRetailOrderingRuntimeProbeBudgetAcceptedLanes: [],
  pointLightRetailOrderingRuntimeProbeBudgetDroppedLanes: [],
  pointLightRetailOrderingRuntimeProbeBudgetUnknownLanes: [],
  pointLightRetailOrderingRuntimeProbeLocalOrderSamples: [],
  pointLightRetailOrderingPreviewBudgetPlanStatus: "",
  pointLightRetailOrderingPreviewBudgetPlanStrategy: "",
  pointLightRetailOrderingPreviewBudgetPlanProofSource: "",
  pointLightRetailOrderingPreviewBudgetPlanProofStatus: "",
  pointLightRetailOrderingPreviewBudgetPlanBlocker: "",
  pointLightRetailOrderingPreviewBudgetPlanAcceptedLanes: [],
  pointLightRetailOrderingPreviewBudgetPlanDroppedLanes: [],
  pointLightRetailOrderingPreviewBudgetPlanSamples: [],
  pointLightBudgetMode: "",
  pointLightSamples: [],
  nonPointLightRequestCount: 0,
  nonPointLightRequestLanes: [],
  nonPointLightRequestLaneCounts: {},
  nonPointLightRequestSamples: [],
  nonPointLightRequestSchedulerStatus: "",
  nonPointLightRequestSchedulerProofSource: "",
  nonPointLightRequestSchedulerBlocker: "",
  nonPointLightRequestSchedulerPriorityWinner: "",
  nonPointLightRequestSchedulerPriorityEvaluationOrderSource: "",
  nonPointLightRequestSchedulerPriorityEvaluationOrder: [],
  nonPointLightRequestSchedulerPriorityTiePolicyStatus: "",
  nonPointLightRequestSchedulerPriorityZeroPolicyStatus: "",
  nonPointLightRequestSchedulerPriorityZeroRuntimeCaptureStatus: "",
  nonPointLightRequestSchedulerCanonicalParityStatus: "",
  nonPointLightRequestSchedulerPriorityTieGroupCount: 0,
  nonPointLightRequestSchedulerPriorityZeroAlwaysAppliesRequestCount: 0,
  nonPointLightRequestSchedulerSceneAttachmentRequestCount: 0,
  nonPointLightRequestSchedulerProximitySuppressionCandidateCount: 0,
  nonPointLightRequestSchedulerVisionRequestCount: 0,
  nonPointLightRequestSchedulerLightRequestCount: 0,
  nonPointLightRequestSchedulerWouldSuppressScenePointLights: false,
  nonPointLightRequestSchedulerSamples: [],
  shadowProofStatus: "",
  shadowRetailProjectionStatus: "",
  shadowRetailProjectionSource: "",
  shadowRetailProjectionShaderNames: [],
  shadowRetailProjectionLightProfileSource: "",
  shadowRetailProjectionLightProfileStatus: "",
  shadowRetailProjectionGeometrySource: "",
  shadowRetailProjectionGeometryStatus: "",
  shadowRetailProjectionRenderBuckets: [],
  shadowRetailProjectionProofStatus: "",
  shadowRetailProjectionBlocker: "",
  shadowRetailProjectionRuntimeProbeStatus: "",
  shadowRetailProjectionRuntimeProbeProofSource: "",
  shadowRetailProjectionRuntimeProbeBlocker: "",
  shadowRetailProjectionRuntimeProbeLocalPixelProofStatus: "",
  shadowRetailProjectionRuntimeProbeActiveCasterCount: 0,
  shadowRetailProjectionRuntimeProbeProjectionPreviewCount: 0,
  shadowRetailProjectionRuntimeProbeStencilReceiverCount: 0,
  shadowRetailProjectionRuntimeProbeStencilVolumePassCount: 0,
  shadowRetailProjectionRuntimeProbeExpectedStencilPasses: [],
  shadowRetailProjectionRuntimeProbeObservedStencilPasses: [],
  shadowRetailProjectionRuntimeProbeRenderShaderNames: [],
  shadowRetailProjectionRuntimeProbeRenderBuckets: [],
  shadowRetailProjectionRuntimeProbeSamples: [],
  shadowPointLightCastShadowCount: 0,
  shadowPointLightSamples: [],
  shadowItemPropertyLightShadowPolicyCount: 0,
  shadowItemPropertyLightShadowPolicySamples: [],
  shadowDirectionalLightCastShadowCount: 0,
  shadowDirectionalLightSamples: [],
  shadowProgFxType4ShadowRequestCount: 0,
  shadowProgFxType4ShadowRequestSamples: [],
  shadowFastShadowProxyCount: 0,
  shadowFastShadowDisabledCount: 0,
  shadowFastShadowSamples: [],
  shadowAreaStatus: "",
  shadowAreaSourceField: "",
  shadowAreaStatusSource: "",
  shadowAreaOpacity: null,
  shadowAreaOpacitySource: "",
  shadowAreaOpacityFactor: null,
  shadowAreaOpacityFactorSource: ""
};

function toSceneLightDiagnosticSnapshot(
  diagnostics: AuroraScenePointLightDiagnostics | null
): SceneLightDiagnosticSnapshot {
  if (!diagnostics) {
    return EMPTY_SCENE_LIGHT_DIAGNOSTICS;
  }
  return {
    pointLightCount: diagnostics.pointLightCount,
    sourceBackedPointLightCount: diagnostics.sourceBackedPointLightCount,
    pointLightLanes: Array.from(diagnostics.lanes),
    pointLightLaneCounts: { ...diagnostics.laneCounts },
    pointLightPreviewBudgetCap: diagnostics.previewBudgetCap,
    pointLightPreviewBudgetHardCap: diagnostics.previewBudgetHardCap,
    pointLightPreviewBudgetCapSource: diagnostics.previewBudgetCapSource,
    pointLightPreviewBudgetCapProofStatus: diagnostics.previewBudgetCapProofStatus,
    pointLightProofStatus: diagnostics.proofStatus,
    pointLightRetailOrderingStatus: diagnostics.retailOrderingStatus,
    pointLightRetailOrderingProofSource: diagnostics.retailOrderingProofSource,
    pointLightRetailOrderingProofStatus: diagnostics.retailOrderingProofStatus,
    pointLightRetailOrderingManagerCrossLaneCallsiteBlocker:
      diagnostics.retailOrderingManagerCrossLaneCallsiteBlocker,
    pointLightRetailOrderingCoverageStatus: diagnostics.retailOrderingCoverageStatus,
    pointLightRetailOrderingRequiredLanes: Array.from(
      diagnostics.retailOrderingRequiredLanes
    ),
    pointLightRetailOrderingObservedLanes: Array.from(
      diagnostics.retailOrderingObservedLanes
    ),
    pointLightRetailOrderingMissingLanes: Array.from(
      diagnostics.retailOrderingMissingLanes
    ),
    pointLightRetailOrderingRuntimeProbeStatus:
      diagnostics.retailOrderingRuntimeProbeStatus,
    pointLightRetailOrderingRuntimeProbeProofSource:
      diagnostics.retailOrderingRuntimeProbeProofSource,
    pointLightRetailOrderingRuntimeProbeBlocker:
      diagnostics.retailOrderingRuntimeProbeBlocker,
    pointLightRetailOrderingRuntimeProbeLocalOrderSource:
      diagnostics.retailOrderingRuntimeProbeLocalOrderSource,
    pointLightRetailOrderingRuntimeProbeRequiredLaneCoverageCount:
      diagnostics.retailOrderingRuntimeProbeRequiredLaneCoverageCount,
    pointLightRetailOrderingRuntimeProbePointLightSampleCount:
      diagnostics.retailOrderingRuntimeProbePointLightSampleCount,
    pointLightRetailOrderingRuntimeProbeNonPointRequestSampleCount:
      diagnostics.retailOrderingRuntimeProbeNonPointRequestSampleCount,
    pointLightRetailOrderingRuntimeProbeBudgetAcceptedLanes: Array.from(
      diagnostics.retailOrderingRuntimeProbeBudgetAcceptedLanes
    ),
    pointLightRetailOrderingRuntimeProbeBudgetDroppedLanes: Array.from(
      diagnostics.retailOrderingRuntimeProbeBudgetDroppedLanes
    ),
    pointLightRetailOrderingRuntimeProbeBudgetUnknownLanes: Array.from(
      diagnostics.retailOrderingRuntimeProbeBudgetUnknownLanes
    ),
    pointLightRetailOrderingRuntimeProbeLocalOrderSamples: Array.from(
      diagnostics.retailOrderingRuntimeProbeLocalOrderSamples
    ),
    pointLightRetailOrderingPreviewBudgetPlanStatus:
      diagnostics.retailOrderingPreviewBudgetPlanStatus,
    pointLightRetailOrderingPreviewBudgetPlanStrategy:
      diagnostics.retailOrderingPreviewBudgetPlanStrategy,
    pointLightRetailOrderingPreviewBudgetPlanProofSource:
      diagnostics.retailOrderingPreviewBudgetPlanProofSource,
    pointLightRetailOrderingPreviewBudgetPlanProofStatus:
      diagnostics.retailOrderingPreviewBudgetPlanProofStatus,
    pointLightRetailOrderingPreviewBudgetPlanBlocker:
      diagnostics.retailOrderingPreviewBudgetPlanBlocker,
    pointLightRetailOrderingPreviewBudgetPlanAcceptedLanes: Array.from(
      diagnostics.retailOrderingPreviewBudgetPlanAcceptedLanes
    ),
    pointLightRetailOrderingPreviewBudgetPlanDroppedLanes: Array.from(
      diagnostics.retailOrderingPreviewBudgetPlanDroppedLanes
    ),
    pointLightRetailOrderingPreviewBudgetPlanSamples: Array.from(
      diagnostics.retailOrderingPreviewBudgetPlanSamples
    ),
    pointLightBudgetMode: diagnostics.budgetMode,
    pointLightSamples: Array.from(diagnostics.samples),
    nonPointLightRequestCount: diagnostics.nonPointLightRequestCount,
    nonPointLightRequestLanes: Array.from(diagnostics.nonPointLightRequestLanes),
    nonPointLightRequestLaneCounts: { ...diagnostics.nonPointLightRequestLaneCounts },
    nonPointLightRequestSamples: Array.from(diagnostics.nonPointLightRequestSamples),
    nonPointLightRequestSchedulerStatus:
      diagnostics.nonPointLightRequestSchedulerStatus,
    nonPointLightRequestSchedulerProofSource:
      diagnostics.nonPointLightRequestSchedulerProofSource,
    nonPointLightRequestSchedulerBlocker:
      diagnostics.nonPointLightRequestSchedulerBlocker,
    nonPointLightRequestSchedulerPriorityWinner:
      diagnostics.nonPointLightRequestSchedulerPriorityWinner,
    nonPointLightRequestSchedulerPriorityEvaluationOrderSource:
      diagnostics.nonPointLightRequestSchedulerPriorityEvaluationOrderSource,
    nonPointLightRequestSchedulerPriorityEvaluationOrder: Array.from(
      diagnostics.nonPointLightRequestSchedulerPriorityEvaluationOrder
    ),
    nonPointLightRequestSchedulerPriorityTiePolicyStatus:
      diagnostics.nonPointLightRequestSchedulerPriorityTiePolicyStatus,
    nonPointLightRequestSchedulerPriorityZeroPolicyStatus:
      diagnostics.nonPointLightRequestSchedulerPriorityZeroPolicyStatus,
    nonPointLightRequestSchedulerPriorityZeroRuntimeCaptureStatus:
      diagnostics.nonPointLightRequestSchedulerPriorityZeroRuntimeCaptureStatus,
    nonPointLightRequestSchedulerCanonicalParityStatus:
      diagnostics.nonPointLightRequestSchedulerCanonicalParityStatus,
    nonPointLightRequestSchedulerPriorityTieGroupCount:
      diagnostics.nonPointLightRequestSchedulerPriorityTieGroupCount,
    nonPointLightRequestSchedulerPriorityZeroAlwaysAppliesRequestCount:
      diagnostics.nonPointLightRequestSchedulerPriorityZeroAlwaysAppliesRequestCount,
    nonPointLightRequestSchedulerSceneAttachmentRequestCount:
      diagnostics.nonPointLightRequestSchedulerSceneAttachmentRequestCount,
    nonPointLightRequestSchedulerProximitySuppressionCandidateCount:
      diagnostics.nonPointLightRequestSchedulerProximitySuppressionCandidateCount,
    nonPointLightRequestSchedulerVisionRequestCount:
      diagnostics.nonPointLightRequestSchedulerVisionRequestCount,
    nonPointLightRequestSchedulerLightRequestCount:
      diagnostics.nonPointLightRequestSchedulerLightRequestCount,
    nonPointLightRequestSchedulerWouldSuppressScenePointLights:
      diagnostics.nonPointLightRequestSchedulerWouldSuppressScenePointLights,
    nonPointLightRequestSchedulerSamples: Array.from(
      diagnostics.nonPointLightRequestSchedulerSamples
    ),
    shadowProofStatus: diagnostics.shadow.proofStatus,
    shadowRetailProjectionStatus: diagnostics.shadow.retailProjectionStatus,
    shadowRetailProjectionSource: diagnostics.shadow.retailProjectionSource,
    shadowRetailProjectionShaderNames: Array.from(
      diagnostics.shadow.retailProjectionShaderNames
    ),
    shadowRetailProjectionLightProfileSource:
      diagnostics.shadow.retailProjectionLightProfileSource,
    shadowRetailProjectionLightProfileStatus:
      diagnostics.shadow.retailProjectionLightProfileStatus,
    shadowRetailProjectionGeometrySource:
      diagnostics.shadow.retailProjectionGeometrySource,
    shadowRetailProjectionGeometryStatus:
      diagnostics.shadow.retailProjectionGeometryStatus,
    shadowRetailProjectionRenderBuckets: Array.from(
      diagnostics.shadow.retailProjectionRenderBuckets
    ),
    shadowRetailProjectionProofStatus: diagnostics.shadow.retailProjectionProofStatus,
    shadowRetailProjectionBlocker: diagnostics.shadow.retailProjectionBlocker,
    shadowRetailProjectionRuntimeProbeStatus:
      diagnostics.shadow.retailProjectionRuntimeProbeStatus,
    shadowRetailProjectionRuntimeProbeProofSource:
      diagnostics.shadow.retailProjectionRuntimeProbeProofSource,
    shadowRetailProjectionRuntimeProbeBlocker:
      diagnostics.shadow.retailProjectionRuntimeProbeBlocker,
    shadowRetailProjectionRuntimeProbeLocalPixelProofStatus:
      diagnostics.shadow.retailProjectionRuntimeProbeLocalPixelProofStatus,
    shadowRetailProjectionRuntimeProbeActiveCasterCount:
      diagnostics.shadow.retailProjectionRuntimeProbeActiveCasterCount,
    shadowRetailProjectionRuntimeProbeProjectionPreviewCount:
      diagnostics.shadow.retailProjectionRuntimeProbeProjectionPreviewCount,
    shadowRetailProjectionRuntimeProbeStencilReceiverCount:
      diagnostics.shadow.retailProjectionRuntimeProbeStencilReceiverCount,
    shadowRetailProjectionRuntimeProbeStencilVolumePassCount:
      diagnostics.shadow.retailProjectionRuntimeProbeStencilVolumePassCount,
    shadowRetailProjectionRuntimeProbeExpectedStencilPasses: Array.from(
      diagnostics.shadow.retailProjectionRuntimeProbeExpectedStencilPasses
    ),
    shadowRetailProjectionRuntimeProbeObservedStencilPasses: Array.from(
      diagnostics.shadow.retailProjectionRuntimeProbeObservedStencilPasses
    ),
    shadowRetailProjectionRuntimeProbeRenderShaderNames: Array.from(
      diagnostics.shadow.retailProjectionRuntimeProbeRenderShaderNames
    ),
    shadowRetailProjectionRuntimeProbeRenderBuckets: Array.from(
      diagnostics.shadow.retailProjectionRuntimeProbeRenderBuckets
    ),
    shadowRetailProjectionRuntimeProbeSamples: Array.from(
      diagnostics.shadow.retailProjectionRuntimeProbeSamples
    ),
    shadowPointLightCastShadowCount: diagnostics.shadow.pointLightCastShadowCount,
    shadowPointLightSamples: Array.from(diagnostics.shadow.pointLightShadowSamples),
    shadowItemPropertyLightShadowPolicyCount:
      diagnostics.shadow.itemPropertyLightShadowPolicyCount,
    shadowItemPropertyLightShadowPolicySamples: Array.from(
      diagnostics.shadow.itemPropertyLightShadowPolicySamples
    ),
    shadowDirectionalLightCastShadowCount:
      diagnostics.shadow.directionalLightCastShadowCount,
    shadowDirectionalLightSamples: Array.from(
      diagnostics.shadow.directionalLightShadowSamples
    ),
    shadowProgFxType4ShadowRequestCount:
      diagnostics.shadow.progFxType4ShadowRequestCount,
    shadowProgFxType4ShadowRequestSamples: Array.from(
      diagnostics.shadow.progFxType4ShadowRequestSamples
    ),
    shadowFastShadowProxyCount: diagnostics.shadow.fastShadowProxyCount,
    shadowFastShadowDisabledCount: diagnostics.shadow.fastShadowDisabledCount,
    shadowFastShadowSamples: Array.from(diagnostics.shadow.fastShadowSamples),
    shadowAreaStatus: diagnostics.shadow.areaShadowStatus,
    shadowAreaSourceField: diagnostics.shadow.areaShadowSourceField,
    shadowAreaStatusSource: diagnostics.shadow.areaShadowStatusSource,
    shadowAreaOpacity: diagnostics.shadow.areaShadowOpacity,
    shadowAreaOpacitySource: diagnostics.shadow.areaShadowOpacitySource,
    shadowAreaOpacityFactor: diagnostics.shadow.areaShadowOpacityFactor,
    shadowAreaOpacityFactorSource: diagnostics.shadow.areaShadowOpacityFactorSource
  };
}

export function isVfxFixtureRunnerPath(pathname: string): boolean {
  return pathname === DEV_VFX_ROUTE_PREFIX || pathname.startsWith(`${DEV_VFX_ROUTE_PREFIX}/`);
}

export function parseVfxFixtureRunnerRequest(
  pathname: string,
  search: string
): VfxFixtureRunnerRequest {
  const fixturePath = pathname.startsWith(`${DEV_VFX_ROUTE_PREFIX}/`)
    ? pathname.slice(DEV_VFX_ROUTE_PREFIX.length + 1).split("/")[0]
    : "";
  const params = new URLSearchParams(search);
  return {
    fixtureId: decodeURIComponent(fixturePath || DEV_VFX_DEFAULT_FIXTURE_ID),
    timeSeconds: readFiniteQueryNumber(params.get("time"), 0.5),
    seed: Math.trunc(readFiniteQueryNumber(params.get("seed"), 1)),
    captureDataUrl: params.get("capture") === "data-url"
  };
}

function createCrossLaneRuntimeProbePointLight(
  name: string,
  color: THREE.ColorRepresentation,
  intensity: number,
  distance: number,
  position: readonly [number, number, number],
  userData: THREE.Object3D["userData"]
): THREE.PointLight {
  const falloffShaderPatch = installAuroraLinearLightFalloffShaderChunk();
  const light = new THREE.PointLight(color, intensity, distance, 1);
  light.name = name;
  light.position.set(position[0], position[1], position[2]);
  light.userData = {
    auroraLightRetailScoreProofStatus:
      "source-backed-retail-active-light-score-sort-known-cross-lane-insertion-blocked",
    auroraLightRetailScoreSortDirection: "ascending-score-field-0x84",
    auroraLightRetailScoreSource:
      "C:/Projects/New Folder/export/decompiled_all.c:865838-865929 FUN_00a41850 writes LightManager score +0x84; 865731-865735 FUN_00a41694 sorts ascending",
    auroraLightRetailScoreMultiplier: 1,
    auroraLightRetailScoreField0x70: 0,
    auroraLightRetailScoreRuntimeExtent: 1,
    auroraLightMultiplierSource: DEV_VFX_CROSS_LANE_INTENSITY_SOURCE,
    auroraLightMultiplierProofStatus: DEV_VFX_CROSS_LANE_INTENSITY_PROOF_STATUS,
    auroraLightFalloffRendererPatchStatus: falloffShaderPatch.status,
    auroraLightFalloffRendererProofStatus: falloffShaderPatch.proofStatus,
    auroraLightFalloffRendererSource: falloffShaderPatch.source,
    ...userData,
    crossLaneRuntimeProbeSource: DEV_VFX_CROSS_LANE_PROOF_SOURCE,
    crossLaneRuntimeProbeOrderingBlocker: DEV_VFX_CROSS_LANE_ORDERING_BLOCKER
  };
  return light;
}

function createCrossLaneRuntimeProbeMarker(
  name: string,
  color: THREE.ColorRepresentation,
  position: readonly [number, number, number]
): THREE.Mesh {
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 16, 10),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.86,
      depthWrite: false
    })
  );
  marker.name = name;
  marker.position.set(position[0], position[1], position[2]);
  marker.renderOrder = 60;
  marker.userData.crossLaneRuntimeProbeMarker = true;
  return marker;
}

function addCrossLaneRuntimeProbeLight(
  group: THREE.Group,
  name: string,
  color: THREE.ColorRepresentation,
  intensity: number,
  distance: number,
  position: readonly [number, number, number],
  userData: THREE.Object3D["userData"]
): void {
  group.add(
    createCrossLaneRuntimeProbePointLight(
      name,
      color,
      intensity,
      distance,
      position,
      userData
    )
  );
  group.add(createCrossLaneRuntimeProbeMarker(`${name}_marker`, color, position));
}

function addCrossLaneRuntimeProbeLights(scene: THREE.Scene): void {
  const group = new THREE.Group();
  group.name = "cross_lane_runtime_probe_lights";
  group.userData.crossLaneRuntimeProbeStatus =
    "local-cross-lane-runtime-probe-observed-required-lanes-retail-ordering-still-blocked";
  group.userData.crossLaneRuntimeProbeSource = DEV_VFX_CROSS_LANE_PROOF_SOURCE;
  group.userData.crossLaneRuntimeProbeOrderingBlocker =
    DEV_VFX_CROSS_LANE_ORDERING_BLOCKER;

  addCrossLaneRuntimeProbeLight(
    group,
    "diagnostic_tile_sourcelight1",
    0xff7c21,
    1.1,
    0.7,
    [-0.58, 0.28, 0.12],
    {
      auroraTerrainTileLightRendererMode: "point-light-preview",
      auroraTerrainTileLightRole: "source",
      auroraTerrainTileLightChannel: "sourceLight1",
      auroraTerrainTileId: "diagnostic-tile-sourcelight1",
      auroraTerrainTileLightSourceKey: "fx_flame01",
      auroraTerrainTileLightColorSource:
        "C:/Projects/New Folder/export/decompiled_all.c:453567-453602 creates terrain source-light fx_flame01 carriers",
      auroraTerrainTileLightDistanceSource:
        "fx_flame01.mdl AuroraLight01 radius controller scaled to current Three scene units",
      auroraTerrainTileLightRadiusProofStatus:
        "source-backed-fx-flame01-auroralight01-radius-controller",
      auroraTerrainTileLightFalloffFormula: "max(0,1-distance/radius)",
      auroraTerrainTileLightFalloffProofStatus:
        "source-backed-active-light-linear-radius-falloff",
      auroraTerrainTileLightSourceModelFileName: "fx_flame01.mdl",
      auroraTerrainTileLightSourceRadius: 7,
      auroraTerrainTileLightSourceRadiusUnits: "aurora-model-units",
      auroraTerrainTileLightSourceUnitScale: 0.1,
      auroraTerrainTileLightSourceRadiusWorldDistance: 0.7,
      auroraTerrainTileLightBudgetRank: 3,
      auroraTerrainTileLightBudgetAccepted: true,
      auroraLightRetailScore: 130,
      auroraLightRetailScorePriority: 2,
      auroraLightRetailScorePreviewDistance: 4.2,
      auroraLightRetailScoreSourceRadius: 7,
      auroraLightRetailScoreRangeTerm: 20,
      auroraLightRetailScoreFormula:
        "((priority+1)*cameraDistance)/((field_0x70+4)*(rangeTerm+1)) preview"
    }
  );

  addCrossLaneRuntimeProbeLight(
    group,
    "diagnostic_placeable_light",
    0xffd081,
    1.0,
    5,
    [-0.2, 0.28, 0.12],
    {
      placeableTwoDaLightPreviewRole: "placeables-2da-point-light",
      placeableTwoDaLightColorLabel: "PaleYellow",
      placeableTwoDaLightColorSource: "lightcolor.2da.RGB",
      placeableTwoDaLightColorSourceKey: "placeables.2da LightColor=PaleYellow",
      placeableTwoDaLightSourceModelFileName: "fx_placeable01.mdl",
      placeableTwoDaLightSourceRadius: 10,
      placeableTwoDaLightSourceRadiusUnits: "aurora-model-units",
      placeableTwoDaLightSourceUnitScale: 0.5,
      placeableTwoDaLightSourceRadiusWorldDistance: 5,
      placeableTwoDaLightDistanceSource:
        "retail CNWCArea placeable light path creates fx_placeable01 AuroraLight01 and scales radius into current Three scene units",
      placeableTwoDaLightRadiusProofStatus:
        "source-backed-fx-placeable01-auroralight01-radius-controller",
      placeableTwoDaLightFalloffFormula: "max(0,1-distance/radius)",
      placeableTwoDaLightFalloffProofStatus:
        "source-backed-active-light-linear-radius-falloff",
      auroraLightBudgetRank: 4,
      auroraLightBudgetAccepted: true,
      auroraLightRetailScore: 180,
      auroraLightRetailScorePriority: 3,
      auroraLightRetailScorePreviewDistance: 4.8,
      auroraLightRetailScoreSourceRadius: 10,
      auroraLightRetailScoreRangeTerm: 20,
      auroraLightRetailScoreFormula:
        "((priority+1)*cameraDistance)/((field_0x70+4)*(rangeTerm+1)) preview"
    }
  );

  addCrossLaneRuntimeProbeLight(
    group,
    "diagnostic_source_mdl_light01",
    0x8fb6ff,
    0.9,
    1.5,
    [0.18, 0.28, 0.12],
    {
      auroraLightPreviewRole: "source-mdl-point-light",
      auroraLightNodeName: "diagnostic_mdl_light01",
      auroraLightSourceNodeKind: "auroralight",
      auroraLightSourceModelFileName: "fx_light_clr.mdl",
      auroraLightSourceRadius: 3,
      auroraLightSourceRadiusUnits: "aurora-model-units",
      auroraLightSourceUnitScale: 0.5,
      auroraLightSourceRadiusWorldDistance: 1.5,
      auroraLightRadiusSource:
        "MDL AuroraLight radius controller 88 sampled from source model metadata",
      auroraLightRadiusProofStatus:
        "source-backed-mdl-auroralight-radius-controller",
      auroraLightFalloffFormula: "max(0,1-distance/radius)",
      auroraLightFalloffProofStatus:
        "source-backed-active-light-linear-radius-falloff",
      auroraLightBudgetRank: 2,
      auroraLightBudgetAccepted: true,
      auroraLightRetailScore: 90,
      auroraLightRetailScorePriority: 1,
      auroraLightRetailScorePreviewDistance: 3.1,
      auroraLightRetailScoreSourceRadius: 3,
      auroraLightRetailScoreRangeTerm: 20,
      auroraLightRetailScoreFormula:
        "((priority+1)*cameraDistance)/((field_0x70+4)*(rangeTerm+1)) preview"
    }
  );

  addCrossLaneRuntimeProbeLight(
    group,
    "diagnostic_item_property_light_red_20",
    0xff4020,
    1.7,
    1.33,
    [0.56, 0.28, 0.12],
    {
      itemPropertyLightPreviewRole: "item-property-point-light",
      itemPropertyLightSource:
        "nwscript.nss ItemPropertyLight(int nBrightness, int nColor)",
      itemPropertyLightRelatedVisualEffectRowId: 168,
      itemPropertyLightRelatedVisualEffectConstant: "VFX_DUR_LIGHT_RED_20",
      itemPropertyLightRelatedVisualEffectLabel: "VFX_DUR_LIGHT_RED_20",
      itemPropertyLightRelatedVisualEffectLabelSource:
        "visualeffects.2da row 168",
      itemPropertyLightRelatedProgFxRowId: 315,
      itemPropertyLightRelatedProgFxLabel: "LightRed20m",
      itemPropertyLightRelatedProgFxFadeRowId: 365,
      itemPropertyLightRelatedProgFxFadeLabel: "FadeLRed20m",
      itemPropertyLightRelatedProgFxRowSource:
        "visualeffects.2da rows 153..180 map VFX_DUR_LIGHT_* rows to explicit progfx.2da Type 4 normal/fade rows; ordering is White, Blue, Yellow, Red, Orange, Purple, Green and must not be derived by visualeffects row offset",
      itemPropertyLightRelatedProgFxAnimation: "Red_20m",
      itemPropertyLightBrightnessLabel: "Bright",
      itemPropertyLightColorLabel: "Red",
      itemPropertyLightRadiusSource:
        "iprp_lightcost.2da Bright 20m -> VFX_DUR_LIGHT_RED_20 -> progfx.2da row 315 LightRed20m -> fx_light_clr.mdl AuroraLight01 radius controller",
      itemPropertyLightRadiusProofStatus:
        "source-backed-itemproperty-lightcost-brightness-radius",
      itemPropertyLightSourceMdlRadiusMeters: 13.3,
      itemPropertyLightSourceMdlRadiusUnits: "meters",
      itemPropertyLightMetersToWorldScale: 0.1,
      itemPropertyLightSourceMdlRadiusWorldDistance: 1.33,
      itemPropertyLightFalloffFormula:
        "source-family max(0,1-distance/13.3)",
      itemPropertyLightFalloffProofStatus:
        "source-family-backed-fx_light_clr-mdl-radius-linear-falloff-itemproperty-scheduler-unverified",
      itemPropertyLightBudgetRank: 1,
      itemPropertyLightBudgetAccepted: true,
      itemPropertyLightShadowStatus: "disabled-runtime-policy-blocked",
      itemPropertyLightShadowProofStatus:
        "blocked-no-decompiled-item-light-shadow-rule",
      itemPropertyLightShadowPolicySource:
        "progfx.2da row 315 Param3=1 is preserved but retail item-light shadow scheduling remains unrecovered",
      itemPropertyLightRuntimeSchedulerProofSource:
        "ApplyLight item-property bridge creates VFX_DUR_LIGHT_* CGameEffect rows; exact client ProgFX Type 4 scheduler still blocked",
      itemPropertyLightRuntimeSchedulerBlocker:
        "client render/Gob instantiation from looping VFX into MDL/Gob/PartLight and item-light shadow policy remain unrecovered",
      itemPropertyLightNoSelfGlowProofStatus:
        "source-backed-item-property-light-emits-scene-light-no-self-glow",
      auroraLightRetailScore: 60,
      auroraLightRetailScorePriority: 0,
      auroraLightRetailScorePreviewDistance: 2.5,
      auroraLightRetailScoreSourceRadius: 13.3,
      auroraLightRetailScoreRangeTerm: 20,
      auroraLightRetailScoreFormula:
        "((priority+1)*cameraDistance)/((field_0x70+4)*(rangeTerm+1)) preview"
    }
  );

  scene.add(group);
}

const DEV_VFX_DIAGNOSTIC_SCENE_MATERIALIZERS: Readonly<
  Record<
    DevVfxDiagnosticSceneProfile["recipe"],
    (scene: THREE.Scene) => void
  >
> = Object.freeze({
  "cross-lane-light-probes": addCrossLaneRuntimeProbeLights
});

export function materializeDevVfxDiagnosticScene(
  scene: THREE.Scene,
  profile: DevVfxDiagnosticSceneProfile | undefined
): void {
  if (!profile) return;
  DEV_VFX_DIAGNOSTIC_SCENE_MATERIALIZERS[profile.recipe](scene);
}

export function VfxFixtureRunner({ pathname, search }: VfxFixtureRunnerProps) {
  const request = useMemo(
    () =>
      parseVfxFixtureRunnerRequest(
        pathname ?? window.location.pathname,
        search ?? window.location.search
      ),
    [pathname, search]
  );
  const fixture = useMemo(() => createDevAuroraVfxPayload(request), [request]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [renderStatus, setRenderStatus] = useState<VfxRenderStatus>({
    status: "pending",
    objectVisible: false,
    objectPixelCount: 0,
    renderedDrawParticles: 0,
    renderedVertices: 0,
    renderedChunkModelCount: 0,
    renderedChunkLaneCount: 0,
    renderedChunkLaneResourceResolveStatus: "pending",
    renderedChunkLaneChunkName: "",
    renderedChunkLaneActiveParticleCount: 0,
    renderedChunkLaneResolvedResourceKey: "",
    renderedChunkLaneResolvedResourceLayer: "",
    renderedChunkLaneResolvedResourcePath: "",
    renderedChunkLaneResolvedResourceHash: "",
    renderedChunkLaneResolvedResourceCandidateId: "",
    renderedChunkLaneRendererPending: "pending",
    renderedChunkLaneModelPreviewStatus: "pending",
    renderedDrawRecordIds: [],
    renderedEmitterNodeNames: [],
    renderedDrawRecordLanes: [],
    renderedParticleIds: [],
    renderedParticleIndexes: [],
    renderedPositionX: [],
    renderedPositionY: [],
    renderedPositionZ: [],
    renderedVelocityX: [],
    renderedVelocityY: [],
    renderedVelocityZ: [],
    renderedColorR: [],
    renderedColorG: [],
    renderedColorB: [],
    renderedParticleSizeX: [],
    renderedParticleSizeY: [],
    renderedAlpha: [],
    renderedRecordVerticesPerParticle: [],
    renderedPltLayers: [],
    renderedPltLayerColorSources: [],
    renderedRenderOrder: 0,
    renderedRenderMode: "pending",
    renderedRenderModeRawToken: "pending",
    renderedBlendMode: "pending",
    renderedBlendModeRawToken: "pending",
    renderedBlendModeNumber: -1,
    renderedDiagnosticCodes: [],
    renderedAtlasFrames: [],
    renderedAtlasUvU0: [],
    renderedAtlasUvV0: [],
    renderedAtlasUvU1: [],
    renderedAtlasUvV1: [],
    renderedGeometryNonIndexedDrawArrays: "pending",
    renderedGeometryIndexedDrawArrays: "pending",
    renderedGeometryLinkedSegmentTopology: "pending",
    renderedGeometryLinkedSegmentCount: 0,
    renderedGeometryLinkedSegmentSource: "pending",
    renderedGeometryRenderModeBasisModes: [],
    renderedGeometryRenderModeBasisSources: [],
    renderedGeometryRenderModeUsesVelocityBasis: "pending",
    renderedGeometryDrawModeArgument: 0,
    renderedGeometryDrawModeArgumentSource: "pending",
    renderedGeometryVerticesPerParticle: 0,
    renderedGeometryAtlasUvSource: "pending",
    renderedGeometryPositionAttributeCount: 0,
    renderedGeometryPositionAttributeItemSize: 0,
    renderedGeometryPositionAttributeXMin: 0,
    renderedGeometryPositionAttributeXMax: 0,
    renderedGeometryPositionAttributeYMin: 0,
    renderedGeometryPositionAttributeYMax: 0,
    renderedGeometryPositionAttributeZMin: 0,
    renderedGeometryPositionAttributeZMax: 0,
    renderedGeometryPositionAttributeMinUniqueValuesPerRecord: 0,
    renderedGeometryPositionAttributeMaxUniqueValuesPerRecord: 0,
    renderedGeometryColorAttributeCount: 0,
    renderedGeometryColorAttributeItemSize: 0,
    renderedGeometryColorAttributeUniqueCount: 0,
    renderedGeometryColorAttributeRMin: 0,
    renderedGeometryColorAttributeRMax: 0,
    renderedGeometryColorAttributeGMin: 0,
    renderedGeometryColorAttributeGMax: 0,
    renderedGeometryColorAttributeBMin: 0,
    renderedGeometryColorAttributeBMax: 0,
    renderedGeometryColorAttributeMinUniqueValuesPerRecord: 0,
    renderedGeometryColorAttributeMaxUniqueValuesPerRecord: 0,
    renderedGeometryAlphaAttributeCount: 0,
    renderedGeometryAlphaAttributeItemSize: 0,
    renderedGeometryAlphaAttributeMin: 0,
    renderedGeometryAlphaAttributeMax: 0,
    renderedGeometryAlphaAttributeMinUniqueValuesPerRecord: 0,
    renderedGeometryAlphaAttributeMaxUniqueValuesPerRecord: 0,
    renderedGeometryParticleSizeAttributeCount: 0,
    renderedGeometryParticleSizeAttributeItemSize: 0,
    renderedGeometryParticleSizeAttributeXMin: 0,
    renderedGeometryParticleSizeAttributeXMax: 0,
    renderedGeometryParticleSizeAttributeYMin: 0,
    renderedGeometryParticleSizeAttributeYMax: 0,
    renderedGeometryParticleSizeAttributeMinUniqueValuesPerRecord: 0,
    renderedGeometryParticleSizeAttributeMaxUniqueValuesPerRecord: 0,
    renderedGeometryAtlasFrameAttributeCount: 0,
    renderedGeometryAtlasFrameAttributeItemSize: 0,
    renderedGeometryAtlasFrameAttributeSource: "pending",
    renderedGeometryAtlasFrameAttributeUniqueCount: 0,
    renderedGeometryAtlasFrameAttributeMin: 0,
    renderedGeometryAtlasFrameAttributeMax: 0,
    renderedGeometryAtlasFrameAttributeMinUniqueValuesPerRecord: 0,
    renderedGeometryAtlasFrameAttributeMaxUniqueValuesPerRecord: 0,
    renderedGeometryDrawRecordIndexAttributeCount: 0,
    renderedGeometryDrawRecordIndexAttributeItemSize: 0,
    renderedGeometryDrawRecordIndexAttributeSource: "pending",
    renderedGeometryDrawRecordIndexAttributeUniqueCount: 0,
    renderedGeometryDrawRecordIndexAttributeMin: 0,
    renderedGeometryDrawRecordIndexAttributeMax: 0,
    renderedGeometryDrawRecordIndexAttributeMinVerticesPerRecord: 0,
    renderedGeometryDrawRecordIndexAttributeMaxVerticesPerRecord: 0,
    renderedGeometryUvAttributeCount: 0,
    renderedGeometryUvAttributeItemSize: 0,
    renderedGeometryUvAttributeUMin: 0,
    renderedGeometryUvAttributeUMax: 0,
    renderedGeometryUvAttributeVMin: 0,
    renderedGeometryUvAttributeVMax: 0,
    renderedGeometryUvAttributeMinUniqueValuesPerRecord: 0,
    renderedGeometryUvAttributeMaxUniqueValuesPerRecord: 0,
    renderedBoundsWidth: 0,
    renderedBoundsHeight: 0,
    renderedBoundsDepth: 0,
    renderedBoundsCenterX: 0,
    renderedBoundsCenterY: 0,
    renderedBoundsCenterZ: 0,
    renderedTextureReference: "",
    renderedTextureStatus: "pending",
    renderedMaterialTransparent: "pending",
    renderedMaterialDepthWrite: "pending",
    renderedMaterialDepthTest: "pending",
    renderedMaterialAlphaTest: 0,
    renderedMaterialOpacity: 0,
    renderedMaterialColorHex: "pending",
    renderedMaterialBlending: "pending",
    renderedMaterialBlendSrc: "pending",
    renderedMaterialBlendDst: "pending",
    renderedMaterialBlendEquation: "pending",
    renderedMaterialMapBound: "pending",
    renderedMaterialMapReference: "",
    renderedMaterialVertexColors: "pending",
    renderedMaterialSide: "pending",
    renderedMaterialStatus: "pending",
    renderedProgFxType4PointLightPreviewStatus: "",
    renderedProgFxType4PointLightPreviewSource: "",
    renderedProgFxType4PointLightCount: 0,
    renderedProgFxType4MultiRequestPointLightPreviewStatus: "",
    renderedProgFxType4MultiRequestPointLightPreviewSource: "",
    renderedProgFxType4MultiRequestPointLightPreviewBlocker: "",
    renderedProgFxType4MultiRequestCount: 0,
    renderedProgFxType4MultiRequestLightCount: 0,
    renderedProgFxType4MultiRequestVisionCount: 0,
    renderedProgFxType4MultiRequestEqualPriorityLightTieCount: 0,
    renderedProgFxType4MultiRequestPointLightCount: 0,
    renderedProgFxType4MultiRequestRuntimeOracleObservedSignal: "",
    renderedProgFxType4MultiRequestCanonicalParityPromoted: "",
    message: "pending"
  });
  const [screenshotCaptured, setScreenshotCaptured] = useState(false);
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [sceneLightDiagnostics, setSceneLightDiagnostics] =
    useState<SceneLightDiagnosticSnapshot>(EMPTY_SCENE_LIGHT_DIAGNOSTICS);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    if (import.meta.env.MODE === "test") {
      const texture = createFixtureTexture();
      const chunkModelsByResourceKey = createFixtureChunkModelTemplates();
      const chunkModelDeliveryUrlsByResourceKey = createFixtureChunkModelDeliveryUrls();
      const scene = new THREE.Scene();
      const group = createAuroraVfxCanonicalRenderGroup(fixture.payload, {
        particleTexturesByReference: new Map([[DEV_VFX_TEXTURE_REFERENCE, texture]]),
        chunkModelsByResourceKey,
        chunkModelDeliveryUrlsByResourceKey,
        objectRadius: 0.32
      });
      scene.add(group);
      materializeDevVfxDiagnosticScene(scene, fixture.diagnosticScene);
      setSceneLightDiagnostics(
        toSceneLightDiagnosticSnapshot(resolveAuroraScenePointLightDiagnostics(scene))
      );
      scene.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          node.geometry.dispose();
          const material = node.material;
          if (Array.isArray(material)) {
            material.forEach((entry) => entry.dispose());
          } else {
            material.dispose();
          }
        }
      });
      texture.dispose();
      setRenderStatus({
        status: "skipped-test",
        objectVisible: false,
        objectPixelCount: 0,
        renderedDrawParticles: 0,
        renderedVertices: 0,
        renderedChunkModelCount:
          readNumber(group.userData.auroraVfxCanonicalRenderedChunkModelCount) ?? 0,
        renderedChunkLaneCount:
          readNumber(group.userData.auroraVfxCanonicalChunkLaneCount) ?? 0,
        renderedChunkLaneResourceResolveStatus: readString(
          group.userData.auroraVfxCanonicalChunkLaneResourceResolveStatus
        ),
        renderedChunkLaneChunkName: readString(
          group.userData.auroraVfxCanonicalChunkLaneChunkName
        ),
        renderedChunkLaneActiveParticleCount:
          readNumber(group.userData.auroraVfxCanonicalChunkLaneActiveParticleCount) ?? 0,
        renderedChunkLaneResolvedResourceKey: readString(
          group.userData.auroraVfxCanonicalChunkLaneResolvedResourceKey
        ),
        renderedChunkLaneResolvedResourceLayer: readString(
          group.userData.auroraVfxCanonicalChunkLaneResolvedResourceLayer
        ),
        renderedChunkLaneResolvedResourcePath: readString(
          group.userData.auroraVfxCanonicalChunkLaneResolvedResourcePath
        ),
        renderedChunkLaneResolvedResourceHash: readString(
          group.userData.auroraVfxCanonicalChunkLaneResolvedResourceHash
        ),
        renderedChunkLaneResolvedResourceCandidateId: readString(
          group.userData.auroraVfxCanonicalChunkLaneResolvedResourceCandidateId
        ),
        renderedChunkLaneRendererPending: readBooleanString(
          group.userData.auroraVfxCanonicalChunkLaneRendererPending
        ),
        renderedChunkLaneModelPreviewStatus: readString(
          group.userData.auroraVfxCanonicalChunkLaneModelPreviewStatus
        ),
        renderedDrawRecordIds: [],
        renderedEmitterNodeNames: [],
        renderedDrawRecordLanes: [],
        renderedParticleIds: [],
        renderedParticleIndexes: [],
        renderedPositionX: [],
        renderedPositionY: [],
        renderedPositionZ: [],
        renderedVelocityX: [],
        renderedVelocityY: [],
        renderedVelocityZ: [],
        renderedColorR: [],
        renderedColorG: [],
        renderedColorB: [],
        renderedParticleSizeX: [],
        renderedParticleSizeY: [],
        renderedAlpha: [],
        renderedRecordVerticesPerParticle: [],
        renderedPltLayers: [],
        renderedPltLayerColorSources: [],
        renderedRenderOrder: 0,
        renderedRenderMode: "skipped-test",
        renderedRenderModeRawToken: "skipped-test",
        renderedBlendMode: "skipped-test",
        renderedBlendModeRawToken: "skipped-test",
        renderedBlendModeNumber: -1,
        renderedDiagnosticCodes: [],
        renderedAtlasFrames: [],
        renderedAtlasUvU0: [],
        renderedAtlasUvV0: [],
        renderedAtlasUvU1: [],
        renderedAtlasUvV1: [],
        renderedGeometryNonIndexedDrawArrays: "skipped-test",
        renderedGeometryIndexedDrawArrays: "skipped-test",
        renderedGeometryLinkedSegmentTopology: "skipped-test",
        renderedGeometryLinkedSegmentCount: 0,
        renderedGeometryLinkedSegmentSource: "skipped-test",
        renderedGeometryRenderModeBasisModes: [],
        renderedGeometryRenderModeBasisSources: [],
        renderedGeometryRenderModeUsesVelocityBasis: "skipped-test",
        renderedGeometryDrawModeArgument: 0,
        renderedGeometryDrawModeArgumentSource: "skipped-test",
        renderedGeometryVerticesPerParticle: 0,
        renderedGeometryAtlasUvSource: "skipped-test",
        renderedGeometryPositionAttributeCount: 0,
        renderedGeometryPositionAttributeItemSize: 0,
        renderedGeometryPositionAttributeXMin: 0,
        renderedGeometryPositionAttributeXMax: 0,
        renderedGeometryPositionAttributeYMin: 0,
        renderedGeometryPositionAttributeYMax: 0,
        renderedGeometryPositionAttributeZMin: 0,
        renderedGeometryPositionAttributeZMax: 0,
        renderedGeometryPositionAttributeMinUniqueValuesPerRecord: 0,
        renderedGeometryPositionAttributeMaxUniqueValuesPerRecord: 0,
        renderedGeometryColorAttributeCount: 0,
        renderedGeometryColorAttributeItemSize: 0,
        renderedGeometryColorAttributeUniqueCount: 0,
        renderedGeometryColorAttributeRMin: 0,
        renderedGeometryColorAttributeRMax: 0,
        renderedGeometryColorAttributeGMin: 0,
        renderedGeometryColorAttributeGMax: 0,
        renderedGeometryColorAttributeBMin: 0,
        renderedGeometryColorAttributeBMax: 0,
        renderedGeometryColorAttributeMinUniqueValuesPerRecord: 0,
        renderedGeometryColorAttributeMaxUniqueValuesPerRecord: 0,
        renderedGeometryAlphaAttributeCount: 0,
        renderedGeometryAlphaAttributeItemSize: 0,
        renderedGeometryAlphaAttributeMin: 0,
        renderedGeometryAlphaAttributeMax: 0,
        renderedGeometryAlphaAttributeMinUniqueValuesPerRecord: 0,
        renderedGeometryAlphaAttributeMaxUniqueValuesPerRecord: 0,
        renderedGeometryParticleSizeAttributeCount: 0,
        renderedGeometryParticleSizeAttributeItemSize: 0,
        renderedGeometryParticleSizeAttributeXMin: 0,
        renderedGeometryParticleSizeAttributeXMax: 0,
        renderedGeometryParticleSizeAttributeYMin: 0,
        renderedGeometryParticleSizeAttributeYMax: 0,
        renderedGeometryParticleSizeAttributeMinUniqueValuesPerRecord: 0,
        renderedGeometryParticleSizeAttributeMaxUniqueValuesPerRecord: 0,
        renderedGeometryAtlasFrameAttributeCount: 0,
        renderedGeometryAtlasFrameAttributeItemSize: 0,
        renderedGeometryAtlasFrameAttributeSource: "skipped-test",
        renderedGeometryAtlasFrameAttributeUniqueCount: 0,
        renderedGeometryAtlasFrameAttributeMin: 0,
        renderedGeometryAtlasFrameAttributeMax: 0,
        renderedGeometryAtlasFrameAttributeMinUniqueValuesPerRecord: 0,
        renderedGeometryAtlasFrameAttributeMaxUniqueValuesPerRecord: 0,
        renderedGeometryDrawRecordIndexAttributeCount: 0,
        renderedGeometryDrawRecordIndexAttributeItemSize: 0,
        renderedGeometryDrawRecordIndexAttributeSource: "skipped-test",
        renderedGeometryDrawRecordIndexAttributeUniqueCount: 0,
        renderedGeometryDrawRecordIndexAttributeMin: 0,
        renderedGeometryDrawRecordIndexAttributeMax: 0,
        renderedGeometryDrawRecordIndexAttributeMinVerticesPerRecord: 0,
        renderedGeometryDrawRecordIndexAttributeMaxVerticesPerRecord: 0,
        renderedGeometryUvAttributeCount: 0,
        renderedGeometryUvAttributeItemSize: 0,
        renderedGeometryUvAttributeUMin: 0,
        renderedGeometryUvAttributeUMax: 0,
        renderedGeometryUvAttributeVMin: 0,
        renderedGeometryUvAttributeVMax: 0,
        renderedGeometryUvAttributeMinUniqueValuesPerRecord: 0,
        renderedGeometryUvAttributeMaxUniqueValuesPerRecord: 0,
        renderedBoundsWidth: 0,
        renderedBoundsHeight: 0,
        renderedBoundsDepth: 0,
        renderedBoundsCenterX: 0,
        renderedBoundsCenterY: 0,
        renderedBoundsCenterZ: 0,
        renderedTextureReference: "",
        renderedTextureStatus: "skipped-test",
        renderedMaterialTransparent: "skipped-test",
        renderedMaterialDepthWrite: "skipped-test",
        renderedMaterialDepthTest: "skipped-test",
        renderedMaterialAlphaTest: 0,
        renderedMaterialOpacity: 0,
        renderedMaterialColorHex: "skipped-test",
        renderedMaterialBlending: "skipped-test",
        renderedMaterialBlendSrc: "skipped-test",
        renderedMaterialBlendDst: "skipped-test",
        renderedMaterialBlendEquation: "skipped-test",
        renderedMaterialMapBound: "skipped-test",
        renderedMaterialMapReference: "",
        renderedMaterialVertexColors: "skipped-test",
        renderedMaterialSide: "skipped-test",
        renderedMaterialStatus: "skipped-test",
        renderedProgFxType4PointLightPreviewStatus: readString(
          group.userData.auroraVfxProgFxType4PointLightPreviewStatus
        ),
        renderedProgFxType4PointLightPreviewSource: readString(
          group.userData.auroraVfxProgFxType4PointLightPreviewSource
        ),
        renderedProgFxType4PointLightCount:
          readNumber(group.userData.auroraVfxProgFxType4PointLightCount) ?? 0,
        renderedProgFxType4MultiRequestPointLightPreviewStatus: readString(
          group.userData.auroraVfxProgFxType4MultiRequestPointLightPreviewStatus
        ),
        renderedProgFxType4MultiRequestPointLightPreviewSource: readString(
          group.userData.auroraVfxProgFxType4MultiRequestPointLightPreviewSource
        ),
        renderedProgFxType4MultiRequestPointLightPreviewBlocker: readString(
          group.userData.auroraVfxProgFxType4MultiRequestPointLightPreviewBlocker
        ),
        renderedProgFxType4MultiRequestCount:
          readNumber(group.userData.auroraVfxProgFxType4MultiRequestCount) ?? 0,
        renderedProgFxType4MultiRequestLightCount:
          readNumber(group.userData.auroraVfxProgFxType4MultiRequestLightCount) ?? 0,
        renderedProgFxType4MultiRequestVisionCount:
          readNumber(group.userData.auroraVfxProgFxType4MultiRequestVisionCount) ?? 0,
        renderedProgFxType4MultiRequestEqualPriorityLightTieCount:
          readNumber(
            group.userData.auroraVfxProgFxType4MultiRequestEqualPriorityLightTieCount
          ) ?? 0,
        renderedProgFxType4MultiRequestPointLightCount:
          readNumber(group.userData.auroraVfxProgFxType4MultiRequestPointLightCount) ?? 0,
        renderedProgFxType4MultiRequestRuntimeOracleObservedSignal: readString(
          group.userData.auroraVfxProgFxType4MultiRequestRuntimeOracleObservedSignal
        ),
        renderedProgFxType4MultiRequestCanonicalParityPromoted: readBooleanString(
          group.userData.auroraVfxProgFxType4MultiRequestCanonicalParityPromoted
        ),
        message: "WebGL render skipped under unit test runtime."
      });
      return;
    }

    const texture = createFixtureTexture();
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#071018");
    const camera = new THREE.OrthographicCamera(-1.2, 1.2, 0.78, -0.78, 0.1, 10);
    camera.position.set(0, 0, 2);
    camera.lookAt(0, 0, 0);

    let renderer: THREE.WebGLRenderer | null = null;
    let bloomPass: AuroraRetailBloomPass | null = null;
    try {
      installAuroraLinearLightFalloffShaderChunk();
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: false,
        antialias: true,
        preserveDrawingBuffer: true
      });
      installAuroraVfxRenderQueueSort(renderer);
      renderer.setPixelRatio(1);
      renderer.setSize(RENDER_WIDTH, RENDER_HEIGHT, false);
      renderer.setClearColor("#071018", 1);
      bloomPass = new AuroraRetailBloomPass();
      const chunkModelsByResourceKey = createFixtureChunkModelTemplates();
      const chunkModelDeliveryUrlsByResourceKey = createFixtureChunkModelDeliveryUrls();
      const group = createAuroraVfxCanonicalRenderGroup(fixture.payload, {
        particleTexturesByReference: new Map([[DEV_VFX_TEXTURE_REFERENCE, texture]]),
        chunkModelsByResourceKey,
        chunkModelDeliveryUrlsByResourceKey,
        objectRadius: 0.32
      });
      scene.add(group);
      materializeDevVfxDiagnosticScene(scene, fixture.diagnosticScene);
      setSceneLightDiagnostics(
        toSceneLightDiagnosticSnapshot(resolveAuroraScenePointLightDiagnostics(scene))
      );
      bloomPass.render(renderer, scene, camera);
      const probe = readObjectPixelSignal(renderer, RENDER_WIDTH, RENDER_HEIGHT);
      const dataUrl = request.captureDataUrl ? canvas.toDataURL("image/png") : null;
      if (dataUrl) {
        setScreenshotDataUrl(dataUrl);
        setScreenshotCaptured(true);
      }
      const drawMesh = findCanonicalDrawMesh(group);
      setRenderStatus({
        status: "rendered",
        objectVisible: probe.objectVisible,
        objectPixelCount: probe.objectPixelCount,
        renderedDrawParticles:
          readNumber(group.userData.auroraVfxCanonicalRenderedDrawParticleCount) ?? 0,
        renderedVertices: readNumber(group.userData.auroraVfxCanonicalRenderedVertexCount) ?? 0,
        renderedChunkModelCount:
          readNumber(group.userData.auroraVfxCanonicalRenderedChunkModelCount) ?? 0,
        renderedChunkLaneCount:
          readNumber(group.userData.auroraVfxCanonicalChunkLaneCount) ?? 0,
        renderedChunkLaneResourceResolveStatus: readString(
          group.userData.auroraVfxCanonicalChunkLaneResourceResolveStatus
        ),
        renderedChunkLaneChunkName: readString(
          group.userData.auroraVfxCanonicalChunkLaneChunkName
        ),
        renderedChunkLaneActiveParticleCount:
          readNumber(group.userData.auroraVfxCanonicalChunkLaneActiveParticleCount) ?? 0,
        renderedChunkLaneResolvedResourceKey: readString(
          group.userData.auroraVfxCanonicalChunkLaneResolvedResourceKey
        ),
        renderedChunkLaneResolvedResourceLayer: readString(
          group.userData.auroraVfxCanonicalChunkLaneResolvedResourceLayer
        ),
        renderedChunkLaneResolvedResourcePath: readString(
          group.userData.auroraVfxCanonicalChunkLaneResolvedResourcePath
        ),
        renderedChunkLaneResolvedResourceHash: readString(
          group.userData.auroraVfxCanonicalChunkLaneResolvedResourceHash
        ),
        renderedChunkLaneResolvedResourceCandidateId: readString(
          group.userData.auroraVfxCanonicalChunkLaneResolvedResourceCandidateId
        ),
        renderedChunkLaneRendererPending: readBooleanString(
          group.userData.auroraVfxCanonicalChunkLaneRendererPending
        ),
        renderedChunkLaneModelPreviewStatus: readString(
          group.userData.auroraVfxCanonicalChunkLaneModelPreviewStatus
        ),
        renderedDrawRecordIds: readStringList(group.userData.auroraVfxCanonicalDrawRecordIds),
        renderedEmitterNodeNames: readStringList(group.userData.auroraVfxCanonicalEmitterNodeNames),
        renderedDrawRecordLanes: readStringList(group.userData.auroraVfxCanonicalDrawRecordLanes),
        renderedParticleIds: readNumberList(group.userData.auroraVfxCanonicalParticleIds),
        renderedParticleIndexes: readNumberList(group.userData.auroraVfxCanonicalParticleIndexes),
        renderedPositionX: readNumberList(group.userData.auroraVfxCanonicalPositionX),
        renderedPositionY: readNumberList(group.userData.auroraVfxCanonicalPositionY),
        renderedPositionZ: readNumberList(group.userData.auroraVfxCanonicalPositionZ),
        renderedVelocityX: readNumberList(group.userData.auroraVfxCanonicalVelocityX),
        renderedVelocityY: readNumberList(group.userData.auroraVfxCanonicalVelocityY),
        renderedVelocityZ: readNumberList(group.userData.auroraVfxCanonicalVelocityZ),
        renderedColorR: readNumberList(group.userData.auroraVfxCanonicalColorR),
        renderedColorG: readNumberList(group.userData.auroraVfxCanonicalColorG),
        renderedColorB: readNumberList(group.userData.auroraVfxCanonicalColorB),
        renderedParticleSizeX: readNumberList(group.userData.auroraVfxCanonicalParticleSizeX),
        renderedParticleSizeY: readNumberList(group.userData.auroraVfxCanonicalParticleSizeY),
        renderedAlpha: readNumberList(group.userData.auroraVfxCanonicalAlpha),
        renderedRecordVerticesPerParticle: readNumberList(
          group.userData.auroraVfxCanonicalRecordVerticesPerParticle
        ),
        renderedPltLayers: readStringList(group.userData.auroraVfxCanonicalPltLayers),
        renderedPltLayerColorSources: readStringList(
          group.userData.auroraVfxCanonicalPltLayerColorSources
        ),
        renderedRenderOrder: readNumber(group.userData.auroraVfxCanonicalRenderOrder) ?? 0,
        renderedRenderMode: readString(group.userData.auroraVfxCanonicalRenderMode),
        renderedRenderModeRawToken: readString(
          group.userData.auroraVfxCanonicalRenderModeRawToken
        ),
        renderedBlendMode: readString(group.userData.auroraVfxCanonicalBlendMode),
        renderedBlendModeRawToken: readString(
          group.userData.auroraVfxCanonicalBlendModeRawToken
        ),
        renderedBlendModeNumber:
          readNumber(group.userData.auroraVfxCanonicalBlendModeNumber) ?? -1,
        renderedDiagnosticCodes: readStringList(
          group.userData.auroraVfxCanonicalDiagnosticCodes
        ),
        renderedAtlasFrames: readNumberList(group.userData.auroraVfxCanonicalAtlasFrames),
        renderedAtlasUvU0: readNumberList(group.userData.auroraVfxCanonicalAtlasUvU0),
        renderedAtlasUvV0: readNumberList(group.userData.auroraVfxCanonicalAtlasUvV0),
        renderedAtlasUvU1: readNumberList(group.userData.auroraVfxCanonicalAtlasUvU1),
        renderedAtlasUvV1: readNumberList(group.userData.auroraVfxCanonicalAtlasUvV1),
        renderedGeometryNonIndexedDrawArrays: readBooleanString(
          drawMesh?.geometry.userData.auroraVfxCanonicalNonIndexedDrawArrays
        ),
        renderedGeometryIndexedDrawArrays: readBooleanString(
          drawMesh?.geometry.userData.auroraVfxCanonicalIndexedDrawArrays
        ),
        renderedGeometryLinkedSegmentTopology: readBooleanString(
          drawMesh?.geometry.userData.auroraVfxCanonicalLinkedSegmentTopology
        ),
        renderedGeometryLinkedSegmentCount:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalLinkedSegmentCount) ?? 0,
        renderedGeometryLinkedSegmentSource: readString(
          drawMesh?.geometry.userData.auroraVfxCanonicalLinkedSegmentSource
        ),
        renderedGeometryRenderModeBasisModes: readStringList(
          drawMesh?.geometry.userData.auroraVfxCanonicalRenderModeBasisModes
        ),
        renderedGeometryRenderModeBasisSources: readStringList(
          drawMesh?.geometry.userData.auroraVfxCanonicalRenderModeBasisSources
        ),
        renderedGeometryRenderModeUsesVelocityBasis: readBooleanString(
          drawMesh?.geometry.userData.auroraVfxCanonicalRenderModeUsesVelocityBasis
        ),
        renderedGeometryDrawModeArgument:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalDrawModeArgument) ?? 0,
        renderedGeometryDrawModeArgumentSource: readString(
          drawMesh?.geometry.userData.auroraVfxCanonicalDrawModeArgumentSource
        ),
        renderedGeometryVerticesPerParticle:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalVerticesPerParticle) ?? 0,
        renderedGeometryAtlasUvSource: readString(
          drawMesh?.geometry.userData.auroraVfxCanonicalAtlasUvSource
        ),
        renderedGeometryPositionAttributeCount:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalPositionAttributeCount) ?? 0,
        renderedGeometryPositionAttributeItemSize:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalPositionAttributeItemSize) ?? 0,
        renderedGeometryPositionAttributeXMin:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalPositionAttributeXMin) ?? 0,
        renderedGeometryPositionAttributeXMax:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalPositionAttributeXMax) ?? 0,
        renderedGeometryPositionAttributeYMin:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalPositionAttributeYMin) ?? 0,
        renderedGeometryPositionAttributeYMax:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalPositionAttributeYMax) ?? 0,
        renderedGeometryPositionAttributeZMin:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalPositionAttributeZMin) ?? 0,
        renderedGeometryPositionAttributeZMax:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalPositionAttributeZMax) ?? 0,
        renderedGeometryPositionAttributeMinUniqueValuesPerRecord:
          readNumber(
            drawMesh?.geometry.userData.auroraVfxCanonicalPositionAttributeMinUniqueValuesPerRecord
          ) ?? 0,
        renderedGeometryPositionAttributeMaxUniqueValuesPerRecord:
          readNumber(
            drawMesh?.geometry.userData.auroraVfxCanonicalPositionAttributeMaxUniqueValuesPerRecord
          ) ?? 0,
        renderedGeometryColorAttributeCount:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalColorAttributeCount) ?? 0,
        renderedGeometryColorAttributeItemSize:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalColorAttributeItemSize) ?? 0,
        renderedGeometryColorAttributeUniqueCount:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalColorAttributeUniqueCount) ??
          0,
        renderedGeometryColorAttributeRMin:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalColorAttributeRMin) ?? 0,
        renderedGeometryColorAttributeRMax:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalColorAttributeRMax) ?? 0,
        renderedGeometryColorAttributeGMin:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalColorAttributeGMin) ?? 0,
        renderedGeometryColorAttributeGMax:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalColorAttributeGMax) ?? 0,
        renderedGeometryColorAttributeBMin:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalColorAttributeBMin) ?? 0,
        renderedGeometryColorAttributeBMax:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalColorAttributeBMax) ?? 0,
        renderedGeometryColorAttributeMinUniqueValuesPerRecord:
          readNumber(
            drawMesh?.geometry.userData.auroraVfxCanonicalColorAttributeMinUniqueValuesPerRecord
          ) ?? 0,
        renderedGeometryColorAttributeMaxUniqueValuesPerRecord:
          readNumber(
            drawMesh?.geometry.userData.auroraVfxCanonicalColorAttributeMaxUniqueValuesPerRecord
          ) ?? 0,
        renderedGeometryAlphaAttributeCount:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalAlphaAttributeCount) ?? 0,
        renderedGeometryAlphaAttributeItemSize:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalAlphaAttributeItemSize) ?? 0,
        renderedGeometryAlphaAttributeMin:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalAlphaAttributeMin) ?? 0,
        renderedGeometryAlphaAttributeMax:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalAlphaAttributeMax) ?? 0,
        renderedGeometryAlphaAttributeMinUniqueValuesPerRecord:
          readNumber(
            drawMesh?.geometry.userData
              .auroraVfxCanonicalAlphaAttributeMinUniqueValuesPerRecord
          ) ?? 0,
        renderedGeometryAlphaAttributeMaxUniqueValuesPerRecord:
          readNumber(
            drawMesh?.geometry.userData
              .auroraVfxCanonicalAlphaAttributeMaxUniqueValuesPerRecord
          ) ?? 0,
        renderedGeometryParticleSizeAttributeCount:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalParticleSizeAttributeCount) ?? 0,
        renderedGeometryParticleSizeAttributeItemSize:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalParticleSizeAttributeItemSize) ??
          0,
        renderedGeometryParticleSizeAttributeXMin:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalParticleSizeAttributeXMin) ?? 0,
        renderedGeometryParticleSizeAttributeXMax:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalParticleSizeAttributeXMax) ?? 0,
        renderedGeometryParticleSizeAttributeYMin:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalParticleSizeAttributeYMin) ?? 0,
        renderedGeometryParticleSizeAttributeYMax:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalParticleSizeAttributeYMax) ?? 0,
        renderedGeometryParticleSizeAttributeMinUniqueValuesPerRecord:
          readNumber(
            drawMesh?.geometry.userData
              .auroraVfxCanonicalParticleSizeAttributeMinUniqueValuesPerRecord
          ) ?? 0,
        renderedGeometryParticleSizeAttributeMaxUniqueValuesPerRecord:
          readNumber(
            drawMesh?.geometry.userData
              .auroraVfxCanonicalParticleSizeAttributeMaxUniqueValuesPerRecord
          ) ?? 0,
        renderedGeometryAtlasFrameAttributeCount:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalAtlasFrameAttributeCount) ?? 0,
        renderedGeometryAtlasFrameAttributeItemSize:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalAtlasFrameAttributeItemSize) ?? 0,
        renderedGeometryAtlasFrameAttributeSource: readString(
          drawMesh?.geometry.userData.auroraVfxCanonicalAtlasFrameAttributeSource
        ),
        renderedGeometryAtlasFrameAttributeUniqueCount:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalAtlasFrameAttributeUniqueCount) ??
          0,
        renderedGeometryAtlasFrameAttributeMin:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalAtlasFrameAttributeMin) ?? 0,
        renderedGeometryAtlasFrameAttributeMax:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalAtlasFrameAttributeMax) ?? 0,
        renderedGeometryAtlasFrameAttributeMinUniqueValuesPerRecord:
          readNumber(
            drawMesh?.geometry.userData
              .auroraVfxCanonicalAtlasFrameAttributeMinUniqueValuesPerRecord
          ) ?? 0,
        renderedGeometryAtlasFrameAttributeMaxUniqueValuesPerRecord:
          readNumber(
            drawMesh?.geometry.userData
              .auroraVfxCanonicalAtlasFrameAttributeMaxUniqueValuesPerRecord
          ) ?? 0,
        renderedGeometryDrawRecordIndexAttributeCount:
          readNumber(
            drawMesh?.geometry.userData.auroraVfxCanonicalDrawRecordIndexAttributeCount
          ) ?? 0,
        renderedGeometryDrawRecordIndexAttributeItemSize:
          readNumber(
            drawMesh?.geometry.userData.auroraVfxCanonicalDrawRecordIndexAttributeItemSize
          ) ?? 0,
        renderedGeometryDrawRecordIndexAttributeSource: readString(
          drawMesh?.geometry.userData.auroraVfxCanonicalDrawRecordIndexAttributeSource
        ),
        renderedGeometryDrawRecordIndexAttributeUniqueCount:
          readNumber(
            drawMesh?.geometry.userData.auroraVfxCanonicalDrawRecordIndexAttributeUniqueCount
          ) ?? 0,
        renderedGeometryDrawRecordIndexAttributeMin:
          readNumber(
            drawMesh?.geometry.userData.auroraVfxCanonicalDrawRecordIndexAttributeMin
          ) ?? 0,
        renderedGeometryDrawRecordIndexAttributeMax:
          readNumber(
            drawMesh?.geometry.userData.auroraVfxCanonicalDrawRecordIndexAttributeMax
          ) ?? 0,
        renderedGeometryDrawRecordIndexAttributeMinVerticesPerRecord:
          readNumber(
            drawMesh?.geometry.userData
              .auroraVfxCanonicalDrawRecordIndexAttributeMinVerticesPerRecord
          ) ?? 0,
        renderedGeometryDrawRecordIndexAttributeMaxVerticesPerRecord:
          readNumber(
            drawMesh?.geometry.userData
              .auroraVfxCanonicalDrawRecordIndexAttributeMaxVerticesPerRecord
          ) ?? 0,
        renderedGeometryUvAttributeCount:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalUvAttributeCount) ?? 0,
        renderedGeometryUvAttributeItemSize:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalUvAttributeItemSize) ?? 0,
        renderedGeometryUvAttributeUMin:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalUvAttributeUMin) ?? 0,
        renderedGeometryUvAttributeUMax:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalUvAttributeUMax) ?? 0,
        renderedGeometryUvAttributeVMin:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalUvAttributeVMin) ?? 0,
        renderedGeometryUvAttributeVMax:
          readNumber(drawMesh?.geometry.userData.auroraVfxCanonicalUvAttributeVMax) ?? 0,
        renderedGeometryUvAttributeMinUniqueValuesPerRecord:
          readNumber(
            drawMesh?.geometry.userData.auroraVfxCanonicalUvAttributeMinUniqueValuesPerRecord
          ) ?? 0,
        renderedGeometryUvAttributeMaxUniqueValuesPerRecord:
          readNumber(
            drawMesh?.geometry.userData.auroraVfxCanonicalUvAttributeMaxUniqueValuesPerRecord
          ) ?? 0,
        renderedBoundsWidth:
          readNumber(group.userData.auroraVfxCanonicalRenderedBoundsWidth) ?? 0,
        renderedBoundsHeight:
          readNumber(group.userData.auroraVfxCanonicalRenderedBoundsHeight) ?? 0,
        renderedBoundsDepth:
          readNumber(group.userData.auroraVfxCanonicalRenderedBoundsDepth) ?? 0,
        renderedBoundsCenterX:
          readNumber(group.userData.auroraVfxCanonicalRenderedBoundsCenterX) ?? 0,
        renderedBoundsCenterY:
          readNumber(group.userData.auroraVfxCanonicalRenderedBoundsCenterY) ?? 0,
        renderedBoundsCenterZ:
          readNumber(group.userData.auroraVfxCanonicalRenderedBoundsCenterZ) ?? 0,
        renderedTextureReference: readString(group.userData.auroraVfxCanonicalTextureReference),
        renderedTextureStatus: readString(group.userData.auroraVfxCanonicalTextureStatus),
        renderedMaterialTransparent: readBooleanString(
          group.userData.auroraVfxCanonicalMaterialTransparent
        ),
        renderedMaterialDepthWrite: readBooleanString(
          group.userData.auroraVfxCanonicalMaterialDepthWrite
        ),
        renderedMaterialDepthTest: readBooleanString(
          group.userData.auroraVfxCanonicalMaterialDepthTest
        ),
        renderedMaterialAlphaTest:
          readNumber(group.userData.auroraVfxCanonicalMaterialAlphaTest) ?? 0,
        renderedMaterialOpacity:
          readNumber(group.userData.auroraVfxCanonicalMaterialOpacity) ?? 0,
        renderedMaterialColorHex: readString(group.userData.auroraVfxCanonicalMaterialColorHex),
        renderedMaterialBlending: readString(group.userData.auroraVfxCanonicalMaterialBlending),
        renderedMaterialBlendSrc: readString(group.userData.auroraVfxCanonicalMaterialBlendSrc),
        renderedMaterialBlendDst: readString(group.userData.auroraVfxCanonicalMaterialBlendDst),
        renderedMaterialBlendEquation: readString(
          group.userData.auroraVfxCanonicalMaterialBlendEquation
        ),
        renderedMaterialMapBound: readBooleanString(
          group.userData.auroraVfxCanonicalMaterialMapBound
        ),
        renderedMaterialMapReference: readString(
          group.userData.auroraVfxCanonicalMaterialMapReference
        ),
        renderedMaterialVertexColors: readBooleanString(
          group.userData.auroraVfxCanonicalMaterialVertexColors
        ),
        renderedMaterialSide: readString(group.userData.auroraVfxCanonicalMaterialSide),
        renderedMaterialStatus: readString(group.userData.auroraVfxCanonicalMaterialStatus),
        renderedProgFxType4PointLightPreviewStatus: readString(
          group.userData.auroraVfxProgFxType4PointLightPreviewStatus
        ),
        renderedProgFxType4PointLightPreviewSource: readString(
          group.userData.auroraVfxProgFxType4PointLightPreviewSource
        ),
        renderedProgFxType4PointLightCount:
          readNumber(group.userData.auroraVfxProgFxType4PointLightCount) ?? 0,
        renderedProgFxType4MultiRequestPointLightPreviewStatus: readString(
          group.userData.auroraVfxProgFxType4MultiRequestPointLightPreviewStatus
        ),
        renderedProgFxType4MultiRequestPointLightPreviewSource: readString(
          group.userData.auroraVfxProgFxType4MultiRequestPointLightPreviewSource
        ),
        renderedProgFxType4MultiRequestPointLightPreviewBlocker: readString(
          group.userData.auroraVfxProgFxType4MultiRequestPointLightPreviewBlocker
        ),
        renderedProgFxType4MultiRequestCount:
          readNumber(group.userData.auroraVfxProgFxType4MultiRequestCount) ?? 0,
        renderedProgFxType4MultiRequestLightCount:
          readNumber(group.userData.auroraVfxProgFxType4MultiRequestLightCount) ?? 0,
        renderedProgFxType4MultiRequestVisionCount:
          readNumber(group.userData.auroraVfxProgFxType4MultiRequestVisionCount) ?? 0,
        renderedProgFxType4MultiRequestEqualPriorityLightTieCount:
          readNumber(
            group.userData.auroraVfxProgFxType4MultiRequestEqualPriorityLightTieCount
          ) ?? 0,
        renderedProgFxType4MultiRequestPointLightCount:
          readNumber(group.userData.auroraVfxProgFxType4MultiRequestPointLightCount) ?? 0,
        renderedProgFxType4MultiRequestRuntimeOracleObservedSignal: readString(
          group.userData.auroraVfxProgFxType4MultiRequestRuntimeOracleObservedSignal
        ),
        renderedProgFxType4MultiRequestCanonicalParityPromoted: readBooleanString(
          group.userData.auroraVfxProgFxType4MultiRequestCanonicalParityPromoted
        ),
        message: probe.objectVisible ? "visible" : "blank"
      });
    } catch (error) {
      setSceneLightDiagnostics(EMPTY_SCENE_LIGHT_DIAGNOSTICS);
      setRenderStatus({
        status: renderer ? "error" : "webgl-unavailable",
        objectVisible: false,
        objectPixelCount: 0,
        renderedDrawParticles: 0,
        renderedVertices: 0,
        renderedChunkModelCount: 0,
        renderedChunkLaneCount: 0,
        renderedChunkLaneResourceResolveStatus: "error",
        renderedChunkLaneChunkName: "",
        renderedChunkLaneActiveParticleCount: 0,
        renderedChunkLaneResolvedResourceKey: "",
        renderedChunkLaneResolvedResourceLayer: "",
        renderedChunkLaneResolvedResourcePath: "",
        renderedChunkLaneResolvedResourceHash: "",
        renderedChunkLaneResolvedResourceCandidateId: "",
        renderedChunkLaneRendererPending: "error",
        renderedChunkLaneModelPreviewStatus: "error",
        renderedDrawRecordIds: [],
        renderedEmitterNodeNames: [],
        renderedDrawRecordLanes: [],
        renderedParticleIds: [],
        renderedParticleIndexes: [],
        renderedPositionX: [],
        renderedPositionY: [],
        renderedPositionZ: [],
        renderedVelocityX: [],
        renderedVelocityY: [],
        renderedVelocityZ: [],
        renderedColorR: [],
        renderedColorG: [],
        renderedColorB: [],
        renderedParticleSizeX: [],
        renderedParticleSizeY: [],
        renderedAlpha: [],
        renderedRecordVerticesPerParticle: [],
        renderedPltLayers: [],
        renderedPltLayerColorSources: [],
        renderedRenderOrder: 0,
        renderedRenderMode: "error",
        renderedRenderModeRawToken: "error",
        renderedBlendMode: "error",
        renderedBlendModeRawToken: "error",
        renderedBlendModeNumber: -1,
        renderedDiagnosticCodes: [],
        renderedAtlasFrames: [],
        renderedAtlasUvU0: [],
        renderedAtlasUvV0: [],
        renderedAtlasUvU1: [],
        renderedAtlasUvV1: [],
        renderedGeometryNonIndexedDrawArrays: "error",
        renderedGeometryIndexedDrawArrays: "error",
        renderedGeometryLinkedSegmentTopology: "error",
        renderedGeometryLinkedSegmentCount: 0,
        renderedGeometryLinkedSegmentSource: "error",
        renderedGeometryRenderModeBasisModes: [],
        renderedGeometryRenderModeBasisSources: [],
        renderedGeometryRenderModeUsesVelocityBasis: "error",
        renderedGeometryDrawModeArgument: 0,
        renderedGeometryDrawModeArgumentSource: "error",
        renderedGeometryVerticesPerParticle: 0,
        renderedGeometryAtlasUvSource: "error",
        renderedGeometryPositionAttributeCount: 0,
        renderedGeometryPositionAttributeItemSize: 0,
        renderedGeometryPositionAttributeXMin: 0,
        renderedGeometryPositionAttributeXMax: 0,
        renderedGeometryPositionAttributeYMin: 0,
        renderedGeometryPositionAttributeYMax: 0,
        renderedGeometryPositionAttributeZMin: 0,
        renderedGeometryPositionAttributeZMax: 0,
        renderedGeometryPositionAttributeMinUniqueValuesPerRecord: 0,
        renderedGeometryPositionAttributeMaxUniqueValuesPerRecord: 0,
        renderedGeometryColorAttributeCount: 0,
        renderedGeometryColorAttributeItemSize: 0,
        renderedGeometryColorAttributeUniqueCount: 0,
        renderedGeometryColorAttributeRMin: 0,
        renderedGeometryColorAttributeRMax: 0,
        renderedGeometryColorAttributeGMin: 0,
        renderedGeometryColorAttributeGMax: 0,
        renderedGeometryColorAttributeBMin: 0,
        renderedGeometryColorAttributeBMax: 0,
        renderedGeometryColorAttributeMinUniqueValuesPerRecord: 0,
        renderedGeometryColorAttributeMaxUniqueValuesPerRecord: 0,
        renderedGeometryAlphaAttributeCount: 0,
        renderedGeometryAlphaAttributeItemSize: 0,
        renderedGeometryAlphaAttributeMin: 0,
        renderedGeometryAlphaAttributeMax: 0,
        renderedGeometryAlphaAttributeMinUniqueValuesPerRecord: 0,
        renderedGeometryAlphaAttributeMaxUniqueValuesPerRecord: 0,
        renderedGeometryParticleSizeAttributeCount: 0,
        renderedGeometryParticleSizeAttributeItemSize: 0,
        renderedGeometryParticleSizeAttributeXMin: 0,
        renderedGeometryParticleSizeAttributeXMax: 0,
        renderedGeometryParticleSizeAttributeYMin: 0,
        renderedGeometryParticleSizeAttributeYMax: 0,
        renderedGeometryParticleSizeAttributeMinUniqueValuesPerRecord: 0,
        renderedGeometryParticleSizeAttributeMaxUniqueValuesPerRecord: 0,
        renderedGeometryAtlasFrameAttributeCount: 0,
        renderedGeometryAtlasFrameAttributeItemSize: 0,
        renderedGeometryAtlasFrameAttributeSource: "error",
        renderedGeometryAtlasFrameAttributeUniqueCount: 0,
        renderedGeometryAtlasFrameAttributeMin: 0,
        renderedGeometryAtlasFrameAttributeMax: 0,
        renderedGeometryAtlasFrameAttributeMinUniqueValuesPerRecord: 0,
        renderedGeometryAtlasFrameAttributeMaxUniqueValuesPerRecord: 0,
        renderedGeometryDrawRecordIndexAttributeCount: 0,
        renderedGeometryDrawRecordIndexAttributeItemSize: 0,
        renderedGeometryDrawRecordIndexAttributeSource: "error",
        renderedGeometryDrawRecordIndexAttributeUniqueCount: 0,
        renderedGeometryDrawRecordIndexAttributeMin: 0,
        renderedGeometryDrawRecordIndexAttributeMax: 0,
        renderedGeometryDrawRecordIndexAttributeMinVerticesPerRecord: 0,
        renderedGeometryDrawRecordIndexAttributeMaxVerticesPerRecord: 0,
        renderedGeometryUvAttributeCount: 0,
        renderedGeometryUvAttributeItemSize: 0,
        renderedGeometryUvAttributeUMin: 0,
        renderedGeometryUvAttributeUMax: 0,
        renderedGeometryUvAttributeVMin: 0,
        renderedGeometryUvAttributeVMax: 0,
        renderedGeometryUvAttributeMinUniqueValuesPerRecord: 0,
        renderedGeometryUvAttributeMaxUniqueValuesPerRecord: 0,
        renderedBoundsWidth: 0,
        renderedBoundsHeight: 0,
        renderedBoundsDepth: 0,
        renderedBoundsCenterX: 0,
        renderedBoundsCenterY: 0,
        renderedBoundsCenterZ: 0,
        renderedTextureReference: "",
        renderedTextureStatus: "error",
        renderedMaterialTransparent: "error",
        renderedMaterialDepthWrite: "error",
        renderedMaterialDepthTest: "error",
        renderedMaterialAlphaTest: 0,
        renderedMaterialOpacity: 0,
        renderedMaterialColorHex: "error",
        renderedMaterialBlending: "error",
        renderedMaterialBlendSrc: "error",
        renderedMaterialBlendDst: "error",
        renderedMaterialBlendEquation: "error",
        renderedMaterialMapBound: "error",
        renderedMaterialMapReference: "",
        renderedMaterialVertexColors: "error",
        renderedMaterialSide: "error",
        renderedMaterialStatus: "error",
        renderedProgFxType4PointLightPreviewStatus: "",
        renderedProgFxType4PointLightPreviewSource: "",
        renderedProgFxType4PointLightCount: 0,
        renderedProgFxType4MultiRequestPointLightPreviewStatus: "",
        renderedProgFxType4MultiRequestPointLightPreviewSource: "",
        renderedProgFxType4MultiRequestPointLightPreviewBlocker: "",
        renderedProgFxType4MultiRequestCount: 0,
        renderedProgFxType4MultiRequestLightCount: 0,
        renderedProgFxType4MultiRequestVisionCount: 0,
        renderedProgFxType4MultiRequestEqualPriorityLightTieCount: 0,
        renderedProgFxType4MultiRequestPointLightCount: 0,
        renderedProgFxType4MultiRequestRuntimeOracleObservedSignal: "",
        renderedProgFxType4MultiRequestCanonicalParityPromoted: "",
        message: error instanceof Error ? error.message : "WebGL render failed."
      });
    }

    return () => {
      scene.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          node.geometry.dispose();
          const material = node.material;
          if (Array.isArray(material)) {
            material.forEach((entry) => entry.dispose());
          } else {
            material.dispose();
          }
        }
      });
      texture.dispose();
      bloomPass?.dispose();
      renderer?.dispose();
    };
  }, [fixture]);

  const textureReference = resolveAuroraVfxCanonicalTextureReference(fixture.payload);
  const drawLane = readDrawLane(fixture.payload.contracts.renderContract);
  const progFxType4Light = readProgFxType4Light(fixture.payload.contracts.renderContract);
  const progFxType4Requests = readProgFxType4LightRequests(
    fixture.payload.contracts.renderContract
  );
  const progFxType4RequestSamples =
    progFxType4Requests.length > 0
      ? progFxType4Requests
      : progFxType4Light
        ? [progFxType4Light]
        : [];
  const captureScreenshot = () => {
    if (canvasRef.current) {
      setScreenshotDataUrl(canvasRef.current.toDataURL("image/png"));
      setScreenshotCaptured(true);
    }
  };

  return (
    <main
      className="vfx-fixture-shell"
      data-testid="vfx-fixture-runner"
      data-fixture-id={fixture.fixtureId}
      data-oracle={fixture.oracle}
      data-comparison-result={fixture.comparisonResult}
      data-canonical-parity-promoted={String(fixture.canonicalParityPromoted)}
      data-render-status={renderStatus.status}
      data-canvas-nonblank={String(renderStatus.objectVisible)}
      data-object-pixels={renderStatus.objectPixelCount}
      data-draw-lane={drawLane}
      data-progfx-type4-proof-status={progFxType4Light?.proofStatus ?? ""}
      data-progfx-type4-row-id={progFxType4Light?.rowId ?? ""}
      data-progfx-type4-label={progFxType4Light?.label ?? ""}
      data-progfx-type4-param1-animation-raw={
        progFxType4Light?.animationRaw ?? ""
      }
      data-progfx-type4-animation={progFxType4Light?.animation ?? ""}
      data-progfx-type4-param1-animation-status={
        progFxType4Light?.animationParameterStatus ?? ""
      }
      data-progfx-type4-animation-kind={progFxType4Light?.animationKind ?? ""}
      data-progfx-type4-vision-mode={progFxType4Light?.visionMode ?? ""}
      data-progfx-type4-vision-parameter-status={
        progFxType4Light?.visionParameterStatus ?? ""
      }
      data-progfx-type4-symbolic-color={progFxType4Light?.symbolicColor ?? ""}
      data-progfx-type4-token-radius-meters={progFxType4Light?.tokenRadiusMeters ?? ""}
      data-progfx-type4-token-radius-proof-status={
        progFxType4Light?.tokenRadiusProofStatus ?? ""
      }
      data-progfx-type4-radius-meters={progFxType4Light?.radiusMeters ?? ""}
      data-progfx-type4-radius-proof-status={progFxType4Light?.radiusProofStatus ?? ""}
      data-progfx-type4-source-mdl-node-name={progFxType4Light?.sourceMdlNodeName ?? ""}
      data-progfx-type4-source-mdl-animation={
        progFxType4Light?.sourceMdlAnimation ?? ""
      }
      data-progfx-type4-source-mdl-color={
        progFxType4Light?.sourceMdlColor
          ? `${progFxType4Light.sourceMdlColor.r},${progFxType4Light.sourceMdlColor.g},${progFxType4Light.sourceMdlColor.b}`
          : ""
      }
      data-progfx-type4-source-mdl-color-source={
        progFxType4Light?.sourceMdlColorSource ?? ""
      }
      data-progfx-type4-source-mdl-color-proof-status={
        progFxType4Light?.sourceMdlColorProofStatus ?? ""
      }
      data-progfx-type4-source-mdl-radius-meters={
        progFxType4Light?.sourceMdlRadiusMeters ?? ""
      }
      data-progfx-type4-source-mdl-radius-frames={
        progFxType4Light?.sourceMdlRadiusFrames.join(",") ?? ""
      }
      data-progfx-type4-source-mdl-radius-source={
        progFxType4Light?.sourceMdlRadiusSource ?? ""
      }
      data-progfx-type4-source-mdl-radius-proof-status={
        progFxType4Light?.sourceMdlRadiusProofStatus ?? ""
      }
      data-progfx-type4-param2-speed-raw={
        progFxType4Light?.animationSpeedRaw ?? ""
      }
      data-progfx-type4-animation-speed={progFxType4Light?.animationSpeed ?? ""}
      data-progfx-type4-param2-speed-status={
        progFxType4Light?.animationSpeedParameterStatus ?? ""
      }
      data-progfx-type4-param3-cast-shadows-raw={
        progFxType4Light?.castShadowsRaw ?? ""
      }
      data-progfx-type4-cast-shadows={
        progFxType4Light ? String(progFxType4Light.castShadows) : ""
      }
      data-progfx-type4-param3-cast-shadows-status={
        progFxType4Light?.castShadowParameterStatus ?? ""
      }
      data-progfx-type4-param4-priority-raw={
        progFxType4Light?.priorityRaw ?? ""
      }
      data-progfx-type4-priority={progFxType4Light?.priority ?? ""}
      data-progfx-type4-param4-priority-status={
        progFxType4Light?.priorityParameterStatus ?? ""
      }
      data-progfx-type4-param5-proximity-suppression-raw={
        progFxType4Light?.proximitySuppressionRaw ?? ""
      }
      data-progfx-type4-proximity-suppression={
        progFxType4Light ? String(progFxType4Light.proximitySuppression) : ""
      }
      data-progfx-type4-param5-proximity-suppression-status={
        progFxType4Light?.proximitySuppressionParameterStatus ?? ""
      }
      data-progfx-type4-param6-attach-to-scene-raw={
        progFxType4Light?.attachToSceneRaw ?? ""
      }
      data-progfx-type4-attach-to-scene={
        progFxType4Light ? String(progFxType4Light.attachToScene) : ""
      }
      data-progfx-type4-param6-attach-to-scene-status={
        progFxType4Light?.sceneAttachmentParameterStatus ?? ""
      }
      data-progfx-type4-param7-model-raw={progFxType4Light?.modelRaw ?? ""}
      data-progfx-type4-model-ref={progFxType4Light?.modelRef ?? ""}
      data-progfx-type4-param7-model-status={
        progFxType4Light?.modelParameterStatus ?? ""
      }
      data-progfx-type4-param8-unused-raw={
        progFxType4Light?.unusedParam8Raw ?? ""
      }
      data-progfx-type4-color-r={progFxType4Light?.color.r ?? ""}
      data-progfx-type4-color-g={progFxType4Light?.color.g ?? ""}
      data-progfx-type4-color-b={progFxType4Light?.color.b ?? ""}
      data-progfx-type4-not-placeable-light={
        progFxType4Light ? String(progFxType4Light.notPlaceableTwoDaLight) : ""
      }
      data-progfx-type4-not-mdl-light-node={
        progFxType4Light ? String(progFxType4Light.notMdlLightNode) : ""
      }
      data-progfx-type4-runtime-scheduling-status={
        progFxType4Light?.runtimeSchedulingStatus ?? ""
      }
      data-progfx-type4-parameter-preservation-proof-source={
        progFxType4Light?.parameterPreservationProofSource ?? ""
      }
      data-progfx-type4-parameter-preservation-proof-status={
        progFxType4Light?.parameterPreservationProofStatus ?? ""
      }
      data-progfx-type4-runtime-scheduling-proof-source={
        progFxType4Light?.runtimeSchedulingProofSource ?? ""
      }
      data-progfx-type4-runtime-scheduling-blocker={
        progFxType4Light?.runtimeSchedulingBlocker ?? ""
      }
      data-progfx-type4-scene-attachment-policy-status={
        progFxType4Light?.sceneAttachmentPolicyStatus ?? ""
      }
      data-progfx-type4-proximity-suppression-policy-status={
        progFxType4Light?.proximitySuppressionPolicyStatus ?? ""
      }
      data-progfx-type4-vision-mutation-policy-status={
        progFxType4Light?.visionMutationPolicyStatus ?? ""
      }
      data-progfx-type4-shadow-policy-status={progFxType4Light?.shadowPolicyStatus ?? ""}
      data-progfx-type4-visual-preview-status={progFxType4Light?.visualPreviewStatus ?? ""}
      data-progfx-type4-owner-visualeffect-row-id={
        progFxType4Light?.ownerVisualEffectRowId ?? ""
      }
      data-progfx-type4-owner-visualeffect-label={
        progFxType4Light?.ownerVisualEffectLabel ?? ""
      }
      data-progfx-type4-owner-phase={progFxType4Light?.ownerPhase ?? ""}
      data-progfx-type4-owner-progfx-ref={progFxType4Light?.ownerProgFxRef ?? ""}
      data-progfx-type4-owner-effect-constructor-kind={
        progFxType4Light?.ownerEffectConstructorKind ?? ""
      }
      data-progfx-type4-owner-duration-type={progFxType4Light?.ownerDurationType ?? ""}
      data-progfx-type4-request-count={progFxType4RequestSamples.length}
      data-progfx-type4-request-row-ids={progFxType4RequestSamples
        .map((entry) => entry.rowId)
        .join("|")}
      data-progfx-type4-request-labels={progFxType4RequestSamples
        .map((entry) => entry.label)
        .join("|")}
      data-progfx-type4-request-animations={progFxType4RequestSamples
        .map((entry) => entry.animation)
        .join("|")}
      data-progfx-type4-request-priorities={progFxType4RequestSamples
        .map((entry) => entry.priority)
        .join("|")}
      data-progfx-type4-request-scene-attachment-count={
        progFxType4RequestSamples.filter((entry) => entry.attachToScene).length
      }
      data-progfx-type4-request-proximity-suppression-count={
        progFxType4RequestSamples.filter((entry) => entry.proximitySuppression).length
      }
      data-progfx-type4-request-light-count={
        progFxType4RequestSamples.filter((entry) => entry.animationKind === "light").length
      }
      data-progfx-type4-request-vision-count={
        progFxType4RequestSamples.filter((entry) => entry.animationKind === "vision").length
      }
      data-progfx-type4-request-samples={progFxType4RequestSamples
        .map(formatProgFxType4RequestSample)
        .join("|")}
      data-scene-point-light-count={sceneLightDiagnostics.pointLightCount}
      data-scene-source-backed-point-light-count={
        sceneLightDiagnostics.sourceBackedPointLightCount
      }
      data-scene-point-light-lanes={sceneLightDiagnostics.pointLightLanes.join("|")}
      data-scene-point-light-lane-counts={JSON.stringify(
        sceneLightDiagnostics.pointLightLaneCounts
      )}
      data-scene-point-light-preview-budget-cap={
        sceneLightDiagnostics.pointLightPreviewBudgetCap ?? ""
      }
      data-scene-point-light-preview-budget-hard-cap={
        sceneLightDiagnostics.pointLightPreviewBudgetHardCap ?? ""
      }
      data-scene-point-light-preview-budget-cap-source={
        sceneLightDiagnostics.pointLightPreviewBudgetCapSource
      }
      data-scene-point-light-preview-budget-cap-proof-status={
        sceneLightDiagnostics.pointLightPreviewBudgetCapProofStatus
      }
      data-scene-point-light-proof-status={sceneLightDiagnostics.pointLightProofStatus}
      data-scene-point-light-retail-ordering-status={
        sceneLightDiagnostics.pointLightRetailOrderingStatus
      }
      data-scene-point-light-retail-ordering-proof-source={
        sceneLightDiagnostics.pointLightRetailOrderingProofSource
      }
      data-scene-point-light-retail-ordering-proof-status={
        sceneLightDiagnostics.pointLightRetailOrderingProofStatus
      }
      data-scene-point-light-retail-ordering-manager-cross-lane-callsite-blocker={
        sceneLightDiagnostics.pointLightRetailOrderingManagerCrossLaneCallsiteBlocker
      }
      data-scene-point-light-retail-ordering-coverage-status={
        sceneLightDiagnostics.pointLightRetailOrderingCoverageStatus
      }
      data-scene-point-light-retail-ordering-required-lanes={
        sceneLightDiagnostics.pointLightRetailOrderingRequiredLanes.join("|")
      }
      data-scene-point-light-retail-ordering-observed-lanes={
        sceneLightDiagnostics.pointLightRetailOrderingObservedLanes.join("|")
      }
      data-scene-point-light-retail-ordering-missing-lanes={
        sceneLightDiagnostics.pointLightRetailOrderingMissingLanes.join("|")
      }
      data-scene-point-light-retail-ordering-runtime-probe-status={
        sceneLightDiagnostics.pointLightRetailOrderingRuntimeProbeStatus
      }
      data-scene-point-light-retail-ordering-runtime-probe-proof-source={
        sceneLightDiagnostics.pointLightRetailOrderingRuntimeProbeProofSource
      }
      data-scene-point-light-retail-ordering-runtime-probe-blocker={
        sceneLightDiagnostics.pointLightRetailOrderingRuntimeProbeBlocker
      }
      data-scene-point-light-retail-ordering-runtime-probe-local-order-source={
        sceneLightDiagnostics.pointLightRetailOrderingRuntimeProbeLocalOrderSource
      }
      data-scene-point-light-retail-ordering-runtime-probe-required-lane-coverage-count={
        sceneLightDiagnostics.pointLightRetailOrderingRuntimeProbeRequiredLaneCoverageCount
      }
      data-scene-point-light-retail-ordering-runtime-probe-point-light-sample-count={
        sceneLightDiagnostics.pointLightRetailOrderingRuntimeProbePointLightSampleCount
      }
      data-scene-point-light-retail-ordering-runtime-probe-non-point-request-sample-count={
        sceneLightDiagnostics.pointLightRetailOrderingRuntimeProbeNonPointRequestSampleCount
      }
      data-scene-point-light-retail-ordering-runtime-probe-budget-accepted-lanes={
        sceneLightDiagnostics.pointLightRetailOrderingRuntimeProbeBudgetAcceptedLanes.join("|")
      }
      data-scene-point-light-retail-ordering-runtime-probe-budget-dropped-lanes={
        sceneLightDiagnostics.pointLightRetailOrderingRuntimeProbeBudgetDroppedLanes.join("|")
      }
      data-scene-point-light-retail-ordering-runtime-probe-budget-unknown-lanes={
        sceneLightDiagnostics.pointLightRetailOrderingRuntimeProbeBudgetUnknownLanes.join("|")
      }
      data-scene-point-light-retail-ordering-runtime-probe-local-order-samples={
        sceneLightDiagnostics.pointLightRetailOrderingRuntimeProbeLocalOrderSamples.join("|")
      }
      data-scene-point-light-retail-ordering-preview-budget-plan-status={
        sceneLightDiagnostics.pointLightRetailOrderingPreviewBudgetPlanStatus
      }
      data-scene-point-light-retail-ordering-preview-budget-plan-strategy={
        sceneLightDiagnostics.pointLightRetailOrderingPreviewBudgetPlanStrategy
      }
      data-scene-point-light-retail-ordering-preview-budget-plan-proof-source={
        sceneLightDiagnostics.pointLightRetailOrderingPreviewBudgetPlanProofSource
      }
      data-scene-point-light-retail-ordering-preview-budget-plan-proof-status={
        sceneLightDiagnostics.pointLightRetailOrderingPreviewBudgetPlanProofStatus
      }
      data-scene-point-light-retail-ordering-preview-budget-plan-blocker={
        sceneLightDiagnostics.pointLightRetailOrderingPreviewBudgetPlanBlocker
      }
      data-scene-point-light-retail-ordering-preview-budget-plan-accepted-lanes={
        sceneLightDiagnostics.pointLightRetailOrderingPreviewBudgetPlanAcceptedLanes.join("|")
      }
      data-scene-point-light-retail-ordering-preview-budget-plan-dropped-lanes={
        sceneLightDiagnostics.pointLightRetailOrderingPreviewBudgetPlanDroppedLanes.join("|")
      }
      data-scene-point-light-retail-ordering-preview-budget-plan-samples={
        sceneLightDiagnostics.pointLightRetailOrderingPreviewBudgetPlanSamples.join("|")
      }
      data-scene-point-light-budget-mode={sceneLightDiagnostics.pointLightBudgetMode}
      data-scene-point-light-samples={sceneLightDiagnostics.pointLightSamples.join("|")}
      data-scene-non-point-light-request-count={
        sceneLightDiagnostics.nonPointLightRequestCount
      }
      data-scene-non-point-light-request-lanes={
        sceneLightDiagnostics.nonPointLightRequestLanes.join("|")
      }
      data-scene-non-point-light-request-lane-counts={JSON.stringify(
        sceneLightDiagnostics.nonPointLightRequestLaneCounts
      )}
      data-scene-non-point-light-request-samples={
        sceneLightDiagnostics.nonPointLightRequestSamples.join("|")
      }
      data-scene-non-point-light-request-scheduler-status={
        sceneLightDiagnostics.nonPointLightRequestSchedulerStatus
      }
      data-scene-non-point-light-request-scheduler-proof-source={
        sceneLightDiagnostics.nonPointLightRequestSchedulerProofSource
      }
      data-scene-non-point-light-request-scheduler-blocker={
        sceneLightDiagnostics.nonPointLightRequestSchedulerBlocker
      }
      data-scene-non-point-light-request-scheduler-priority-winner={
        sceneLightDiagnostics.nonPointLightRequestSchedulerPriorityWinner
      }
      data-scene-non-point-light-request-scheduler-priority-evaluation-order-source={
        sceneLightDiagnostics.nonPointLightRequestSchedulerPriorityEvaluationOrderSource
      }
      data-scene-non-point-light-request-scheduler-priority-evaluation-order={
        sceneLightDiagnostics.nonPointLightRequestSchedulerPriorityEvaluationOrder.join("|")
      }
      data-scene-non-point-light-request-scheduler-priority-tie-policy-status={
        sceneLightDiagnostics.nonPointLightRequestSchedulerPriorityTiePolicyStatus
      }
      data-scene-non-point-light-request-scheduler-priority-zero-policy-status={
        sceneLightDiagnostics.nonPointLightRequestSchedulerPriorityZeroPolicyStatus
      }
      data-scene-non-point-light-request-scheduler-priority-zero-runtime-capture-status={
        sceneLightDiagnostics.nonPointLightRequestSchedulerPriorityZeroRuntimeCaptureStatus
      }
      data-scene-non-point-light-request-scheduler-canonical-parity-status={
        sceneLightDiagnostics.nonPointLightRequestSchedulerCanonicalParityStatus
      }
      data-scene-non-point-light-request-scheduler-priority-tie-group-count={
        sceneLightDiagnostics.nonPointLightRequestSchedulerPriorityTieGroupCount
      }
      data-scene-non-point-light-request-scheduler-priority-zero-always-applies-request-count={
        sceneLightDiagnostics.nonPointLightRequestSchedulerPriorityZeroAlwaysAppliesRequestCount
      }
      data-scene-non-point-light-request-scheduler-scene-attachment-request-count={
        sceneLightDiagnostics.nonPointLightRequestSchedulerSceneAttachmentRequestCount
      }
      data-scene-non-point-light-request-scheduler-proximity-suppression-candidate-count={
        sceneLightDiagnostics.nonPointLightRequestSchedulerProximitySuppressionCandidateCount
      }
      data-scene-non-point-light-request-scheduler-vision-request-count={
        sceneLightDiagnostics.nonPointLightRequestSchedulerVisionRequestCount
      }
      data-scene-non-point-light-request-scheduler-light-request-count={
        sceneLightDiagnostics.nonPointLightRequestSchedulerLightRequestCount
      }
      data-scene-non-point-light-request-scheduler-would-suppress-scene-point-lights={String(
        sceneLightDiagnostics.nonPointLightRequestSchedulerWouldSuppressScenePointLights
      )}
      data-scene-non-point-light-request-scheduler-samples={
        sceneLightDiagnostics.nonPointLightRequestSchedulerSamples.join("|")
      }
      data-scene-shadow-proof-status={sceneLightDiagnostics.shadowProofStatus}
      data-scene-shadow-retail-projection-status={
        sceneLightDiagnostics.shadowRetailProjectionStatus
      }
      data-scene-shadow-retail-projection-source={
        sceneLightDiagnostics.shadowRetailProjectionSource
      }
      data-scene-shadow-retail-projection-shader-names={
        sceneLightDiagnostics.shadowRetailProjectionShaderNames.join("|")
      }
      data-scene-shadow-retail-projection-light-profile-source={
        sceneLightDiagnostics.shadowRetailProjectionLightProfileSource
      }
      data-scene-shadow-retail-projection-light-profile-status={
        sceneLightDiagnostics.shadowRetailProjectionLightProfileStatus
      }
      data-scene-shadow-retail-projection-geometry-source={
        sceneLightDiagnostics.shadowRetailProjectionGeometrySource
      }
      data-scene-shadow-retail-projection-geometry-status={
        sceneLightDiagnostics.shadowRetailProjectionGeometryStatus
      }
      data-scene-shadow-retail-projection-render-buckets={
        sceneLightDiagnostics.shadowRetailProjectionRenderBuckets.join("|")
      }
      data-scene-shadow-retail-projection-proof-status={
        sceneLightDiagnostics.shadowRetailProjectionProofStatus
      }
      data-scene-shadow-retail-projection-blocker={
        sceneLightDiagnostics.shadowRetailProjectionBlocker
      }
      data-scene-shadow-retail-projection-runtime-probe-status={
        sceneLightDiagnostics.shadowRetailProjectionRuntimeProbeStatus
      }
      data-scene-shadow-retail-projection-runtime-probe-proof-source={
        sceneLightDiagnostics.shadowRetailProjectionRuntimeProbeProofSource
      }
      data-scene-shadow-retail-projection-runtime-probe-blocker={
        sceneLightDiagnostics.shadowRetailProjectionRuntimeProbeBlocker
      }
      data-scene-shadow-retail-projection-runtime-probe-local-pixel-proof-status={
        sceneLightDiagnostics.shadowRetailProjectionRuntimeProbeLocalPixelProofStatus
      }
      data-scene-shadow-retail-projection-runtime-probe-active-caster-count={
        sceneLightDiagnostics.shadowRetailProjectionRuntimeProbeActiveCasterCount
      }
      data-scene-shadow-retail-projection-runtime-probe-projection-preview-count={
        sceneLightDiagnostics.shadowRetailProjectionRuntimeProbeProjectionPreviewCount
      }
      data-scene-shadow-retail-projection-runtime-probe-stencil-receiver-count={
        sceneLightDiagnostics.shadowRetailProjectionRuntimeProbeStencilReceiverCount
      }
      data-scene-shadow-retail-projection-runtime-probe-stencil-volume-pass-count={
        sceneLightDiagnostics.shadowRetailProjectionRuntimeProbeStencilVolumePassCount
      }
      data-scene-shadow-retail-projection-runtime-probe-expected-stencil-passes={
        sceneLightDiagnostics.shadowRetailProjectionRuntimeProbeExpectedStencilPasses.join(
          "|"
        )
      }
      data-scene-shadow-retail-projection-runtime-probe-observed-stencil-passes={
        sceneLightDiagnostics.shadowRetailProjectionRuntimeProbeObservedStencilPasses.join(
          "|"
        )
      }
      data-scene-shadow-retail-projection-runtime-probe-render-shader-names={
        sceneLightDiagnostics.shadowRetailProjectionRuntimeProbeRenderShaderNames.join("|")
      }
      data-scene-shadow-retail-projection-runtime-probe-render-buckets={
        sceneLightDiagnostics.shadowRetailProjectionRuntimeProbeRenderBuckets.join("|")
      }
      data-scene-shadow-retail-projection-runtime-probe-samples={
        sceneLightDiagnostics.shadowRetailProjectionRuntimeProbeSamples.join("|")
      }
      data-scene-shadow-point-light-cast-shadow-count={
        sceneLightDiagnostics.shadowPointLightCastShadowCount
      }
      data-scene-shadow-point-light-samples={
        sceneLightDiagnostics.shadowPointLightSamples.join("|")
      }
      data-scene-shadow-item-property-light-shadow-policy-count={
        sceneLightDiagnostics.shadowItemPropertyLightShadowPolicyCount
      }
      data-scene-shadow-item-property-light-shadow-policy-samples={
        sceneLightDiagnostics.shadowItemPropertyLightShadowPolicySamples.join("|")
      }
      data-scene-shadow-directional-light-cast-shadow-count={
        sceneLightDiagnostics.shadowDirectionalLightCastShadowCount
      }
      data-scene-shadow-directional-light-samples={
        sceneLightDiagnostics.shadowDirectionalLightSamples.join("|")
      }
      data-scene-shadow-progfx-type4-shadow-request-count={
        sceneLightDiagnostics.shadowProgFxType4ShadowRequestCount
      }
      data-scene-shadow-progfx-type4-shadow-request-samples={
        sceneLightDiagnostics.shadowProgFxType4ShadowRequestSamples.join("|")
      }
      data-scene-shadow-fast-shadow-proxy-count={
        sceneLightDiagnostics.shadowFastShadowProxyCount
      }
      data-scene-shadow-fast-shadow-disabled-count={
        sceneLightDiagnostics.shadowFastShadowDisabledCount
      }
      data-scene-shadow-fast-shadow-samples={
        sceneLightDiagnostics.shadowFastShadowSamples.join("|")
      }
      data-scene-shadow-area-status={sceneLightDiagnostics.shadowAreaStatus}
      data-scene-shadow-area-source-field={sceneLightDiagnostics.shadowAreaSourceField}
      data-scene-shadow-area-status-source={sceneLightDiagnostics.shadowAreaStatusSource}
      data-scene-shadow-area-opacity={sceneLightDiagnostics.shadowAreaOpacity ?? ""}
      data-scene-shadow-area-opacity-source={sceneLightDiagnostics.shadowAreaOpacitySource}
      data-scene-shadow-area-opacity-factor={
        sceneLightDiagnostics.shadowAreaOpacityFactor ?? ""
      }
      data-scene-shadow-area-opacity-factor-source={
        sceneLightDiagnostics.shadowAreaOpacityFactorSource
      }
      data-rendered-draw-particles={renderStatus.renderedDrawParticles}
      data-rendered-vertices={renderStatus.renderedVertices}
      data-rendered-chunk-model-count={renderStatus.renderedChunkModelCount}
      data-rendered-chunk-lane-count={renderStatus.renderedChunkLaneCount}
      data-rendered-chunk-lane-resource-resolve-status={
        renderStatus.renderedChunkLaneResourceResolveStatus
      }
      data-rendered-chunk-lane-chunk-name={renderStatus.renderedChunkLaneChunkName}
      data-rendered-chunk-lane-active-particle-count={
        renderStatus.renderedChunkLaneActiveParticleCount
      }
      data-rendered-chunk-lane-resolved-resource-key={
        renderStatus.renderedChunkLaneResolvedResourceKey
      }
      data-rendered-chunk-lane-resolved-resource-layer={
        renderStatus.renderedChunkLaneResolvedResourceLayer
      }
      data-rendered-chunk-lane-resolved-resource-path={
        renderStatus.renderedChunkLaneResolvedResourcePath
      }
      data-rendered-chunk-lane-resolved-resource-hash={
        renderStatus.renderedChunkLaneResolvedResourceHash
      }
      data-rendered-chunk-lane-resolved-resource-candidate-id={
        renderStatus.renderedChunkLaneResolvedResourceCandidateId
      }
      data-rendered-chunk-lane-renderer-pending={renderStatus.renderedChunkLaneRendererPending}
      data-rendered-chunk-lane-model-preview-status={
        renderStatus.renderedChunkLaneModelPreviewStatus
      }
      data-rendered-draw-record-ids={renderStatus.renderedDrawRecordIds.join(",")}
      data-rendered-emitter-node-names={renderStatus.renderedEmitterNodeNames.join(",")}
      data-rendered-draw-record-lanes={renderStatus.renderedDrawRecordLanes.join(",")}
      data-rendered-particle-ids={renderStatus.renderedParticleIds.join(",")}
      data-rendered-particle-indexes={renderStatus.renderedParticleIndexes.join(",")}
      data-rendered-position-x={renderStatus.renderedPositionX.join(",")}
      data-rendered-position-y={renderStatus.renderedPositionY.join(",")}
      data-rendered-position-z={renderStatus.renderedPositionZ.join(",")}
      data-rendered-velocity-x={renderStatus.renderedVelocityX.join(",")}
      data-rendered-velocity-y={renderStatus.renderedVelocityY.join(",")}
      data-rendered-velocity-z={renderStatus.renderedVelocityZ.join(",")}
      data-rendered-color-r={renderStatus.renderedColorR.join(",")}
      data-rendered-color-g={renderStatus.renderedColorG.join(",")}
      data-rendered-color-b={renderStatus.renderedColorB.join(",")}
      data-rendered-particle-size-x={renderStatus.renderedParticleSizeX.join(",")}
      data-rendered-particle-size-y={renderStatus.renderedParticleSizeY.join(",")}
      data-rendered-alpha={renderStatus.renderedAlpha.join(",")}
      data-rendered-record-vertices-per-particle={
        renderStatus.renderedRecordVerticesPerParticle.join(",")
      }
      data-rendered-plt-layers={renderStatus.renderedPltLayers.join(",")}
      data-rendered-plt-layer-color-sources={renderStatus.renderedPltLayerColorSources.join(",")}
      data-rendered-render-order={renderStatus.renderedRenderOrder}
      data-rendered-render-mode={renderStatus.renderedRenderMode}
      data-rendered-render-mode-raw-token={renderStatus.renderedRenderModeRawToken}
      data-rendered-blend-mode={renderStatus.renderedBlendMode}
      data-rendered-blend-mode-raw-token={renderStatus.renderedBlendModeRawToken}
      data-rendered-blend-mode-number={renderStatus.renderedBlendModeNumber}
      data-rendered-diagnostic-codes={renderStatus.renderedDiagnosticCodes.join(",")}
      data-rendered-atlas-frames={renderStatus.renderedAtlasFrames.join(",")}
      data-rendered-atlas-frame-count={renderStatus.renderedAtlasFrames.length}
      data-rendered-atlas-uv-u0={renderStatus.renderedAtlasUvU0.join(",")}
      data-rendered-atlas-uv-v0={renderStatus.renderedAtlasUvV0.join(",")}
      data-rendered-atlas-uv-u1={renderStatus.renderedAtlasUvU1.join(",")}
      data-rendered-atlas-uv-v1={renderStatus.renderedAtlasUvV1.join(",")}
      data-rendered-geometry-non-indexed-draw-arrays={
        renderStatus.renderedGeometryNonIndexedDrawArrays
      }
      data-rendered-geometry-indexed-draw-arrays={
        renderStatus.renderedGeometryIndexedDrawArrays
      }
      data-rendered-geometry-linked-segment-topology={
        renderStatus.renderedGeometryLinkedSegmentTopology
      }
      data-rendered-geometry-linked-segment-count={renderStatus.renderedGeometryLinkedSegmentCount}
      data-rendered-geometry-linked-segment-source={
        renderStatus.renderedGeometryLinkedSegmentSource
      }
      data-rendered-geometry-render-mode-basis-modes={
        renderStatus.renderedGeometryRenderModeBasisModes.join(",")
      }
      data-rendered-geometry-render-mode-basis-sources={
        renderStatus.renderedGeometryRenderModeBasisSources.join(",")
      }
      data-rendered-geometry-render-mode-uses-velocity-basis={
        renderStatus.renderedGeometryRenderModeUsesVelocityBasis
      }
      data-rendered-geometry-draw-mode-argument={renderStatus.renderedGeometryDrawModeArgument}
      data-rendered-geometry-draw-mode-argument-source={
        renderStatus.renderedGeometryDrawModeArgumentSource
      }
      data-rendered-geometry-vertices-per-particle={
        renderStatus.renderedGeometryVerticesPerParticle
      }
      data-rendered-geometry-atlas-uv-source={renderStatus.renderedGeometryAtlasUvSource}
      data-rendered-geometry-position-attribute-count={
        renderStatus.renderedGeometryPositionAttributeCount
      }
      data-rendered-geometry-position-attribute-item-size={
        renderStatus.renderedGeometryPositionAttributeItemSize
      }
      data-rendered-geometry-position-attribute-x-min={
        renderStatus.renderedGeometryPositionAttributeXMin
      }
      data-rendered-geometry-position-attribute-x-max={
        renderStatus.renderedGeometryPositionAttributeXMax
      }
      data-rendered-geometry-position-attribute-y-min={
        renderStatus.renderedGeometryPositionAttributeYMin
      }
      data-rendered-geometry-position-attribute-y-max={
        renderStatus.renderedGeometryPositionAttributeYMax
      }
      data-rendered-geometry-position-attribute-z-min={
        renderStatus.renderedGeometryPositionAttributeZMin
      }
      data-rendered-geometry-position-attribute-z-max={
        renderStatus.renderedGeometryPositionAttributeZMax
      }
      data-rendered-geometry-position-attribute-min-unique-values-per-record={
        renderStatus.renderedGeometryPositionAttributeMinUniqueValuesPerRecord
      }
      data-rendered-geometry-position-attribute-max-unique-values-per-record={
        renderStatus.renderedGeometryPositionAttributeMaxUniqueValuesPerRecord
      }
      data-rendered-geometry-color-attribute-count={
        renderStatus.renderedGeometryColorAttributeCount
      }
      data-rendered-geometry-color-attribute-item-size={
        renderStatus.renderedGeometryColorAttributeItemSize
      }
      data-rendered-geometry-color-attribute-unique-count={
        renderStatus.renderedGeometryColorAttributeUniqueCount
      }
      data-rendered-geometry-color-attribute-r-min={renderStatus.renderedGeometryColorAttributeRMin}
      data-rendered-geometry-color-attribute-r-max={renderStatus.renderedGeometryColorAttributeRMax}
      data-rendered-geometry-color-attribute-g-min={renderStatus.renderedGeometryColorAttributeGMin}
      data-rendered-geometry-color-attribute-g-max={renderStatus.renderedGeometryColorAttributeGMax}
      data-rendered-geometry-color-attribute-b-min={renderStatus.renderedGeometryColorAttributeBMin}
      data-rendered-geometry-color-attribute-b-max={renderStatus.renderedGeometryColorAttributeBMax}
      data-rendered-geometry-color-attribute-min-unique-values-per-record={
        renderStatus.renderedGeometryColorAttributeMinUniqueValuesPerRecord
      }
      data-rendered-geometry-color-attribute-max-unique-values-per-record={
        renderStatus.renderedGeometryColorAttributeMaxUniqueValuesPerRecord
      }
      data-rendered-geometry-alpha-attribute-count={
        renderStatus.renderedGeometryAlphaAttributeCount
      }
      data-rendered-geometry-alpha-attribute-item-size={
        renderStatus.renderedGeometryAlphaAttributeItemSize
      }
      data-rendered-geometry-alpha-attribute-min={renderStatus.renderedGeometryAlphaAttributeMin}
      data-rendered-geometry-alpha-attribute-max={renderStatus.renderedGeometryAlphaAttributeMax}
      data-rendered-geometry-alpha-attribute-min-unique-values-per-record={
        renderStatus.renderedGeometryAlphaAttributeMinUniqueValuesPerRecord
      }
      data-rendered-geometry-alpha-attribute-max-unique-values-per-record={
        renderStatus.renderedGeometryAlphaAttributeMaxUniqueValuesPerRecord
      }
      data-rendered-geometry-particle-size-attribute-count={
        renderStatus.renderedGeometryParticleSizeAttributeCount
      }
      data-rendered-geometry-particle-size-attribute-item-size={
        renderStatus.renderedGeometryParticleSizeAttributeItemSize
      }
      data-rendered-geometry-particle-size-attribute-x-min={
        renderStatus.renderedGeometryParticleSizeAttributeXMin
      }
      data-rendered-geometry-particle-size-attribute-x-max={
        renderStatus.renderedGeometryParticleSizeAttributeXMax
      }
      data-rendered-geometry-particle-size-attribute-y-min={
        renderStatus.renderedGeometryParticleSizeAttributeYMin
      }
      data-rendered-geometry-particle-size-attribute-y-max={
        renderStatus.renderedGeometryParticleSizeAttributeYMax
      }
      data-rendered-geometry-particle-size-attribute-min-unique-values-per-record={
        renderStatus.renderedGeometryParticleSizeAttributeMinUniqueValuesPerRecord
      }
      data-rendered-geometry-particle-size-attribute-max-unique-values-per-record={
        renderStatus.renderedGeometryParticleSizeAttributeMaxUniqueValuesPerRecord
      }
      data-rendered-geometry-atlas-frame-attribute-count={
        renderStatus.renderedGeometryAtlasFrameAttributeCount
      }
      data-rendered-geometry-atlas-frame-attribute-item-size={
        renderStatus.renderedGeometryAtlasFrameAttributeItemSize
      }
      data-rendered-geometry-atlas-frame-attribute-source={
        renderStatus.renderedGeometryAtlasFrameAttributeSource
      }
      data-rendered-geometry-atlas-frame-attribute-unique-count={
        renderStatus.renderedGeometryAtlasFrameAttributeUniqueCount
      }
      data-rendered-geometry-atlas-frame-attribute-min={
        renderStatus.renderedGeometryAtlasFrameAttributeMin
      }
      data-rendered-geometry-atlas-frame-attribute-max={
        renderStatus.renderedGeometryAtlasFrameAttributeMax
      }
      data-rendered-geometry-atlas-frame-attribute-min-unique-values-per-record={
        renderStatus.renderedGeometryAtlasFrameAttributeMinUniqueValuesPerRecord
      }
      data-rendered-geometry-atlas-frame-attribute-max-unique-values-per-record={
        renderStatus.renderedGeometryAtlasFrameAttributeMaxUniqueValuesPerRecord
      }
      data-rendered-geometry-draw-record-index-attribute-count={
        renderStatus.renderedGeometryDrawRecordIndexAttributeCount
      }
      data-rendered-geometry-draw-record-index-attribute-item-size={
        renderStatus.renderedGeometryDrawRecordIndexAttributeItemSize
      }
      data-rendered-geometry-draw-record-index-attribute-source={
        renderStatus.renderedGeometryDrawRecordIndexAttributeSource
      }
      data-rendered-geometry-draw-record-index-attribute-unique-count={
        renderStatus.renderedGeometryDrawRecordIndexAttributeUniqueCount
      }
      data-rendered-geometry-draw-record-index-attribute-min={
        renderStatus.renderedGeometryDrawRecordIndexAttributeMin
      }
      data-rendered-geometry-draw-record-index-attribute-max={
        renderStatus.renderedGeometryDrawRecordIndexAttributeMax
      }
      data-rendered-geometry-draw-record-index-attribute-min-vertices-per-record={
        renderStatus.renderedGeometryDrawRecordIndexAttributeMinVerticesPerRecord
      }
      data-rendered-geometry-draw-record-index-attribute-max-vertices-per-record={
        renderStatus.renderedGeometryDrawRecordIndexAttributeMaxVerticesPerRecord
      }
      data-rendered-geometry-uv-attribute-count={renderStatus.renderedGeometryUvAttributeCount}
      data-rendered-geometry-uv-attribute-item-size={
        renderStatus.renderedGeometryUvAttributeItemSize
      }
      data-rendered-geometry-uv-attribute-u-min={renderStatus.renderedGeometryUvAttributeUMin}
      data-rendered-geometry-uv-attribute-u-max={renderStatus.renderedGeometryUvAttributeUMax}
      data-rendered-geometry-uv-attribute-v-min={renderStatus.renderedGeometryUvAttributeVMin}
      data-rendered-geometry-uv-attribute-v-max={renderStatus.renderedGeometryUvAttributeVMax}
      data-rendered-geometry-uv-attribute-min-unique-values-per-record={
        renderStatus.renderedGeometryUvAttributeMinUniqueValuesPerRecord
      }
      data-rendered-geometry-uv-attribute-max-unique-values-per-record={
        renderStatus.renderedGeometryUvAttributeMaxUniqueValuesPerRecord
      }
      data-rendered-bounds-width={renderStatus.renderedBoundsWidth}
      data-rendered-bounds-height={renderStatus.renderedBoundsHeight}
      data-rendered-bounds-depth={renderStatus.renderedBoundsDepth}
      data-rendered-bounds-center-x={renderStatus.renderedBoundsCenterX}
      data-rendered-bounds-center-y={renderStatus.renderedBoundsCenterY}
      data-rendered-bounds-center-z={renderStatus.renderedBoundsCenterZ}
      data-rendered-texture-reference={renderStatus.renderedTextureReference}
      data-rendered-texture-status={renderStatus.renderedTextureStatus}
      data-rendered-material-transparent={renderStatus.renderedMaterialTransparent}
      data-rendered-material-depth-write={renderStatus.renderedMaterialDepthWrite}
      data-rendered-material-depth-test={renderStatus.renderedMaterialDepthTest}
      data-rendered-material-alpha-test={renderStatus.renderedMaterialAlphaTest}
      data-rendered-material-opacity={renderStatus.renderedMaterialOpacity}
      data-rendered-material-color-hex={renderStatus.renderedMaterialColorHex}
      data-rendered-material-blending={renderStatus.renderedMaterialBlending}
      data-rendered-material-blend-src={renderStatus.renderedMaterialBlendSrc}
      data-rendered-material-blend-dst={renderStatus.renderedMaterialBlendDst}
      data-rendered-material-blend-equation={renderStatus.renderedMaterialBlendEquation}
      data-rendered-material-map-bound={renderStatus.renderedMaterialMapBound}
      data-rendered-material-map-reference={renderStatus.renderedMaterialMapReference}
      data-rendered-material-vertex-colors={renderStatus.renderedMaterialVertexColors}
      data-rendered-material-side={renderStatus.renderedMaterialSide}
      data-rendered-material-status={renderStatus.renderedMaterialStatus}
      data-rendered-progfx-type4-point-light-preview-status={
        renderStatus.renderedProgFxType4PointLightPreviewStatus
      }
      data-rendered-progfx-type4-point-light-preview-source={
        renderStatus.renderedProgFxType4PointLightPreviewSource
      }
      data-rendered-progfx-type4-point-light-count={
        renderStatus.renderedProgFxType4PointLightCount
      }
      data-rendered-progfx-type4-multi-request-point-light-preview-status={
        renderStatus.renderedProgFxType4MultiRequestPointLightPreviewStatus
      }
      data-rendered-progfx-type4-multi-request-point-light-preview-source={
        renderStatus.renderedProgFxType4MultiRequestPointLightPreviewSource
      }
      data-rendered-progfx-type4-multi-request-point-light-preview-blocker={
        renderStatus.renderedProgFxType4MultiRequestPointLightPreviewBlocker
      }
      data-rendered-progfx-type4-multi-request-count={
        renderStatus.renderedProgFxType4MultiRequestCount
      }
      data-rendered-progfx-type4-multi-request-light-count={
        renderStatus.renderedProgFxType4MultiRequestLightCount
      }
      data-rendered-progfx-type4-multi-request-vision-count={
        renderStatus.renderedProgFxType4MultiRequestVisionCount
      }
      data-rendered-progfx-type4-multi-request-equal-priority-light-tie-count={
        renderStatus.renderedProgFxType4MultiRequestEqualPriorityLightTieCount
      }
      data-rendered-progfx-type4-multi-request-point-light-count={
        renderStatus.renderedProgFxType4MultiRequestPointLightCount
      }
      data-rendered-progfx-type4-multi-request-runtime-oracle-observed-signal={
        renderStatus.renderedProgFxType4MultiRequestRuntimeOracleObservedSignal
      }
      data-rendered-progfx-type4-multi-request-canonical-parity-promoted={
        renderStatus.renderedProgFxType4MultiRequestCanonicalParityPromoted
      }
      data-screenshot-captured={String(screenshotCaptured)}
      data-screenshot-export={request.captureDataUrl ? "data-url" : "disabled"}
      data-screenshot-bytes={screenshotDataUrl ? estimateDataUrlBytes(screenshotDataUrl) : 0}
      data-texture-profile={DEV_VFX_TEXTURE_PROFILE}
      data-texture-atlas-columns={DEV_VFX_ATLAS_COLUMNS}
      data-texture-atlas-rows={DEV_VFX_ATLAS_ROWS}
      data-texture-atlas-cell-size={DEV_VFX_ATLAS_CELL_SIZE}
      data-texture-atlas-cell-count={DEV_VFX_ATLAS_COLUMNS * DEV_VFX_ATLAS_ROWS}
      data-texture-width={DEV_VFX_TEXTURE_WIDTH}
      data-texture-height={DEV_VFX_TEXTURE_HEIGHT}
    >
      <canvas
        ref={canvasRef}
        className="vfx-fixture-canvas"
        width={RENDER_WIDTH}
        height={RENDER_HEIGHT}
        aria-label={`VFX fixture ${fixture.fixtureId} render canvas`}
      />
      <aside className="vfx-fixture-panel" aria-label="VFX fixture status">
        <p className="eyebrow">VFX Fixture</p>
        <h1>{fixture.title}</h1>
        <dl>
          <div>
            <dt>Fixture</dt>
            <dd>{fixture.fixtureId}</dd>
          </div>
          <div>
            <dt>Time / seed</dt>
            <dd>
              {fixture.timeSeconds.toFixed(2)} / {fixture.seed}
            </dd>
          </div>
          <div>
            <dt>Texture</dt>
            <dd>{textureReference ?? "missing"}</dd>
          </div>
          <div>
            <dt>Particles</dt>
            <dd>{renderStatus.renderedDrawParticles}</dd>
          </div>
          <div>
            <dt>Vertices</dt>
            <dd>{renderStatus.renderedVertices}</dd>
          </div>
          <div>
            <dt>Canvas</dt>
            <dd>{renderStatus.message}</dd>
          </div>
          <div>
            <dt>Oracle</dt>
            <dd>{fixture.oracle}</dd>
          </div>
        </dl>
        <button className="vfx-fixture-capture-btn" type="button" onClick={captureScreenshot}>
          Capture
        </button>
        {screenshotDataUrl ? (
          <output
            aria-label="VFX fixture PNG data URL"
            className="vfx-fixture-data-url"
            data-testid="vfx-fixture-data-url"
          >
            {screenshotDataUrl}
          </output>
        ) : null}
      </aside>
    </main>
  );
}

function createFixtureTexture(): THREE.DataTexture {
  const pixels = new Uint8Array(DEV_VFX_TEXTURE_WIDTH * DEV_VFX_TEXTURE_HEIGHT * 4);
  for (let y = 0; y < DEV_VFX_TEXTURE_HEIGHT; y += 1) {
    for (let x = 0; x < DEV_VFX_TEXTURE_WIDTH; x += 1) {
      const cellX = x % DEV_VFX_ATLAS_CELL_SIZE;
      const cellY = y % DEV_VFX_ATLAS_CELL_SIZE;
      const frameColumn = Math.floor(x / DEV_VFX_ATLAS_CELL_SIZE);
      const frameRow = Math.floor(y / DEV_VFX_ATLAS_CELL_SIZE);
      const frameTint = (frameColumn + frameRow) / (DEV_VFX_ATLAS_COLUMNS + DEV_VFX_ATLAS_ROWS - 2);
      const u = (cellX + 0.5) / DEV_VFX_ATLAS_CELL_SIZE;
      const v = (cellY + 0.5) / DEV_VFX_ATLAS_CELL_SIZE;
      const centeredX = u * 2 - 1;
      const centeredY = v * 2 - 1;
      const distance = Math.sqrt(centeredX * centeredX + centeredY * centeredY);
      const core = clamp01(1 - distance * 1.45);
      const spark =
        clamp01(1 - Math.abs(centeredX + centeredY) * 3.4) * clamp01(1 - distance * 1.2) * 0.12;
      const alpha = clamp01(core * core * (1.25 - distance) + spark);
      const shapedAlpha = alpha < 0.035 ? 0 : alpha;
      const pixelIndex = (y * DEV_VFX_TEXTURE_WIDTH + x) * 4;
      pixels[pixelIndex] = Math.round(255 * shapedAlpha);
      pixels[pixelIndex + 1] = Math.round((188 + 52 * core + 22 * frameTint) * shapedAlpha);
      pixels[pixelIndex + 2] = Math.round((118 + 100 * (1 - distance) + 30 * frameTint) * shapedAlpha);
      pixels[pixelIndex + 3] = Math.round(255 * shapedAlpha);
    }
  }
  const texture = new THREE.DataTexture(
    pixels,
    DEV_VFX_TEXTURE_WIDTH,
    DEV_VFX_TEXTURE_HEIGHT,
    THREE.RGBAFormat
  );
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

function createFixtureChunkModelTemplates(): ReadonlyMap<string, THREE.Object3D> {
  const group = new THREE.Group();
  group.userData = {
    source: "dev-vfx-fixture-local-chunk-model-template",
    auroraVfxRetailParityProof: false
  };

  const core = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.28, 0.18),
    new THREE.MeshBasicMaterial({ color: "#ffc15a" })
  );
  core.position.y = 0.04;
  const cap = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.06, 0.26),
    new THREE.MeshBasicMaterial({ color: "#fff2c5" })
  );
  cap.position.y = 0.22;
  group.add(core, cap);

  return new Map([[DEV_VFX_CHUNK_MODEL_FIXTURE_RESOURCE_KEY, group]]);
}

function createFixtureChunkModelDeliveryUrls(): ReadonlyMap<string, string> {
  return new Map([
    [
      DEV_VFX_CHUNK_MODEL_FIXTURE_RESOURCE_KEY,
      "local://dev-vfx-fixture/progfx_type9_chunk_model_pending.local.glb"
    ]
  ]);
}

function readObjectPixelSignal(
  renderer: THREE.WebGLRenderer,
  width: number,
  height: number
): { objectVisible: boolean; objectPixelCount: number } {
  const gl = renderer.getContext();
  const pixels = new Uint8Array(width * height * 4);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  const red = pixels[0] ?? 0;
  const green = pixels[1] ?? 0;
  const blue = pixels[2] ?? 0;
  let objectPixelCount = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const delta =
      Math.abs((pixels[index] ?? 0) - red) +
      Math.abs((pixels[index + 1] ?? 0) - green) +
      Math.abs((pixels[index + 2] ?? 0) - blue);
    if (delta > 36) {
      objectPixelCount += 1;
    }
  }
  return {
    objectVisible: objectPixelCount > 80,
    objectPixelCount
  };
}

function readFiniteQueryNumber(value: string | null, fallback: number): number {
  if (value === null || value.trim().length === 0) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readNumberList(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is number => typeof entry === "number" && Number.isFinite(entry));
}

function readStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => (typeof entry === "string" ? entry : String(entry)))
    .filter((entry) => entry.length > 0);
}

function findCanonicalDrawMesh(group: THREE.Group): THREE.Mesh | null {
  let found: THREE.Mesh | null = null;
  group.traverse((node) => {
    if (found || !(node instanceof THREE.Mesh)) {
      return;
    }
    if (node.userData.auroraVfxCanonicalDrawMesh === true) {
      found = node;
    }
  });
  return found;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readBooleanString(value: unknown): string {
  return typeof value === "boolean" ? String(value) : "";
}

function readDrawLane(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "unknown";
  }
  const drawLane = (value as { drawLane?: unknown }).drawLane;
  return typeof drawLane === "string" && drawLane.length > 0 ? drawLane : "unknown";
}

function readProgFxType4Light(value: unknown):
  | {
      rowId: number;
      label: string;
      animationRaw: string;
      animation: string;
      animationParameterStatus: string;
      animationKind: string;
      visionMode: string;
      visionParameterStatus: string;
      symbolicColor: string;
      tokenRadiusMeters: number | null;
      tokenRadiusProofStatus: string;
      radiusMeters: number | null;
      radiusProofStatus: string;
      sourceMdlNodeName: string;
      sourceMdlAnimation: string;
      sourceMdlColor: { r: number; g: number; b: number } | null;
      sourceMdlColorSource: string;
      sourceMdlColorProofStatus: string;
      sourceMdlRadiusMeters: number | null;
      sourceMdlRadiusFrames: number[];
      sourceMdlRadiusSource: string;
      sourceMdlRadiusProofStatus: string;
      animationSpeedRaw: string;
      animationSpeed: number;
      animationSpeedParameterStatus: string;
      castShadowsRaw: string;
      castShadows: boolean;
      castShadowParameterStatus: string;
      priorityRaw: string;
      priority: number;
      priorityParameterStatus: string;
      proximitySuppressionRaw: string;
      proximitySuppression: boolean;
      proximitySuppressionParameterStatus: string;
      attachToSceneRaw: string;
      attachToScene: boolean;
      sceneAttachmentParameterStatus: string;
      modelRaw: string;
      modelRef: string;
      modelParameterStatus: string;
      unusedParam8Raw: string;
      color: { r: number; g: number; b: number };
      proofStatus: string;
      notPlaceableTwoDaLight: boolean;
      notMdlLightNode: boolean;
      parameterPreservationProofSource: string;
      parameterPreservationProofStatus: string;
      runtimeSchedulingStatus: string;
      runtimeSchedulingProofSource: string;
      runtimeSchedulingBlocker: string;
      sceneAttachmentPolicyStatus: string;
      proximitySuppressionPolicyStatus: string;
      visionMutationPolicyStatus: string;
      shadowPolicyStatus: string;
      visualPreviewStatus: string;
      ownerVisualEffectRowId: number | null;
      ownerVisualEffectLabel: string;
      ownerPhase: string;
      ownerProgFxRef: string;
      ownerEffectConstructorKind: string;
      ownerDurationType: string;
    }
  | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const light = (value as { progFxType4Light?: unknown }).progFxType4Light;
  if (!light || typeof light !== "object" || Array.isArray(light)) {
    return null;
  }
  const record = light as Record<string, unknown>;
  const color =
    record.color && typeof record.color === "object" && !Array.isArray(record.color)
      ? (record.color as Record<string, unknown>)
      : {};
  return {
    rowId: readNumber(record.rowId) ?? 0,
    label: readString(record.label),
    animationRaw: readString(record.animationRaw),
    animation: readString(record.animation),
    animationParameterStatus: readString(record.animationParameterStatus),
    animationKind: readString(record.animationKind),
    visionMode: readString(record.visionMode),
    visionParameterStatus: readString(record.visionParameterStatus),
    symbolicColor: readString(record.symbolicColor),
    tokenRadiusMeters: readNumber(record.tokenRadiusMeters),
    tokenRadiusProofStatus: readString(record.tokenRadiusProofStatus),
    radiusMeters: readNumber(record.radiusMeters),
    radiusProofStatus: readString(record.radiusProofStatus),
    sourceMdlNodeName: readString(record.sourceMdlNodeName),
    sourceMdlAnimation: readString(record.sourceMdlAnimation),
    sourceMdlColor:
      record.sourceMdlColor && typeof record.sourceMdlColor === "object" && !Array.isArray(record.sourceMdlColor)
        ? {
            r: readNumber((record.sourceMdlColor as Record<string, unknown>).r) ?? 0,
            g: readNumber((record.sourceMdlColor as Record<string, unknown>).g) ?? 0,
            b: readNumber((record.sourceMdlColor as Record<string, unknown>).b) ?? 0
          }
        : null,
    sourceMdlColorSource: readString(record.sourceMdlColorSource),
    sourceMdlColorProofStatus: readString(record.sourceMdlColorProofStatus),
    sourceMdlRadiusMeters: readNumber(record.sourceMdlRadiusMeters),
    sourceMdlRadiusFrames: Array.isArray(record.sourceMdlRadiusFrames)
      ? record.sourceMdlRadiusFrames
          .map((entry) => readNumber(entry))
          .filter((entry): entry is number => entry !== null)
      : [],
    sourceMdlRadiusSource: readString(record.sourceMdlRadiusSource),
    sourceMdlRadiusProofStatus: readString(record.sourceMdlRadiusProofStatus),
    animationSpeedRaw: readString(record.animationSpeedRaw),
    animationSpeed: readNumber(record.animationSpeed) ?? 0,
    animationSpeedParameterStatus: readString(record.animationSpeedParameterStatus),
    castShadowsRaw: readString(record.castShadowsRaw),
    castShadows: record.castShadows === true,
    castShadowParameterStatus: readString(record.castShadowParameterStatus),
    priorityRaw: readString(record.priorityRaw),
    priority: readNumber(record.priority) ?? 0,
    priorityParameterStatus: readString(record.priorityParameterStatus),
    proximitySuppressionRaw: readString(record.proximitySuppressionRaw),
    proximitySuppression: record.proximitySuppression === true,
    proximitySuppressionParameterStatus: readString(
      record.proximitySuppressionParameterStatus
    ),
    attachToSceneRaw: readString(record.attachToSceneRaw),
    attachToScene: record.attachToScene === true,
    sceneAttachmentParameterStatus: readString(record.sceneAttachmentParameterStatus),
    modelRaw: readString(record.modelRaw),
    modelRef: readString(record.modelRef),
    modelParameterStatus: readString(record.modelParameterStatus),
    unusedParam8Raw: readString(record.unusedParam8Raw),
    color: {
      r: readNumber(color.r) ?? 0,
      g: readNumber(color.g) ?? 0,
      b: readNumber(color.b) ?? 0
    },
    proofStatus: readString(record.proofStatus),
    notPlaceableTwoDaLight: record.notPlaceableTwoDaLight === true,
    notMdlLightNode: record.notMdlLightNode === true,
    parameterPreservationProofSource: readString(
      record.parameterPreservationProofSource
    ),
    parameterPreservationProofStatus: readString(
      record.parameterPreservationProofStatus
    ),
    runtimeSchedulingStatus: readString(record.runtimeSchedulingStatus),
    runtimeSchedulingProofSource: readString(record.runtimeSchedulingProofSource),
    runtimeSchedulingBlocker: readString(record.runtimeSchedulingBlocker),
    sceneAttachmentPolicyStatus: readString(record.sceneAttachmentPolicyStatus),
    proximitySuppressionPolicyStatus: readString(
      record.proximitySuppressionPolicyStatus
    ),
    visionMutationPolicyStatus: readString(record.visionMutationPolicyStatus),
    shadowPolicyStatus: readString(record.shadowPolicyStatus),
    visualPreviewStatus: readString(record.visualPreviewStatus),
    ownerVisualEffectRowId: readNumber(record.ownerVisualEffectRowId),
    ownerVisualEffectLabel: readString(record.ownerVisualEffectLabel),
    ownerPhase: readString(record.ownerPhase),
    ownerProgFxRef: readString(record.ownerProgFxRef),
    ownerEffectConstructorKind: readString(record.ownerEffectConstructorKind),
    ownerDurationType: readString(record.ownerDurationType)
  };
}

function readProgFxType4LightRequests(
  value: unknown
): Array<NonNullable<ReturnType<typeof readProgFxType4Light>>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }
  const requests = (value as { progFxType4Requests?: unknown }).progFxType4Requests;
  if (!Array.isArray(requests)) {
    return [];
  }
  return requests.flatMap((entry) => {
    const record = readProgFxType4Light({ progFxType4Light: entry });
    return record ? [record] : [];
  });
}

function formatProgFxType4RequestSample(
  request: NonNullable<ReturnType<typeof readProgFxType4Light>>
): string {
  return [
    `row=${request.rowId}`,
    `label=${request.label}`,
    `kind=${request.animationKind}`,
    `priority=${request.priority}`,
    `proximity=${request.proximitySuppression}`,
    `attachToScene=${request.attachToScene}`,
    `ownerRow=${request.ownerVisualEffectRowId ?? ""}`,
    `ownerLabel=${request.ownerVisualEffectLabel}`,
    `animation=${request.animation}`
  ].join(";");
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function estimateDataUrlBytes(dataUrl: string): number {
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex < 0) {
    return 0;
  }
  const base64 = dataUrl.slice(commaIndex + 1);
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}
