import type { AuroraMdlEmitterNode } from "./aurora-mdl-vfx-source.parser";
import type { AuroraVfxDependencyGraph } from "./aurora-vfx-dependency-graph";
import type { AuroraEmitterRuntimeState, AuroraParticleRuntimeRecord } from "./aurora-vfx-runtime-state";
import type {
  AuroraProgFxSourceRow,
  AuroraVfxDiagnostic,
  AuroraVfxPhaseKind,
  AuroraVfxPhaseSchedule
} from "./aurora-vfx-source.parser";

export type AuroraParticleDrawLane =
  | "textured_quad"
  | "linked_textured_quad"
  | "chunk_model";

export type AuroraParticleRenderModeEnum =
  | "billboard_to_world_z"
  | "billboard_to_local_z"
  | "aligned_to_world_z"
  | "aligned_to_particle_dir"
  | "linked"
  | "motion_blur"
  | "unknown";

export type AuroraParticleBlendModeEnum = "normal" | "punch_through" | "mode_2";

export interface AuroraParticleDrawRoute {
  route: "non_indexed_draw_arrays";
  indexed: false;
  drawModeArgument: 3;
  drawModeArgumentSource: "aurora-draw-wrapper-mode-arg3";
  enumTableCaptured: false;
  triangleListInferenceProof: "diagnostic_pending";
}

export interface AuroraParticleRenderModeRecord {
  enum: AuroraParticleRenderModeEnum;
  rawToken?: string;
  source: "mdl-emitter-render-token" | "missing-token";
}

export interface AuroraParticleBlendModeRecord {
  enum: AuroraParticleBlendModeEnum;
  rawToken?: string;
  modeNumber: 0 | 1 | 2;
  exactGlBlendFactors: "diagnostic_pending";
  source: "mdl-emitter-blend-token" | "missing-token";
}

export interface AuroraParticleRenderStateLane {
  blendMode: AuroraParticleBlendModeRecord;
  depthWriteLane:
    | "punch_through_depth_write_enabled"
    | "source_transparency_false_depth_write_enabled"
    | "non_punch_transparent_depth_write_off";
  transparentLane:
    | "punch_through_cutout_lane"
    | "source_transparency_false_opaque_lane"
    | "non_punch_transparent_lane";
  shaderVariantLane:
    | "punch_through_particle_shader_variant"
    | "non_punch_particle_shader_variant";
  twoSidedTextureLane:
    | "two_sided_texture_cull_disabled"
    | "default_cull_lane";
  sourceTransparencyLane:
    | "source_transparency_false_opaque_depth_write_lane"
    | "source_transparency_true_or_missing_blend_lane";
  twoSidedMaterialLane: AuroraParticleTwoSidedMaterialLane;
  framebufferLane: AuroraParticleFramebufferRenderLane;
}

export interface AuroraParticleTwoSidedMaterialLane {
  twoSidedMaterial: boolean;
  volumetric: boolean;
  renderWrapperArgument: 0 | 1;
  lane:
    | "two_sided_material_non_volumetric_runtime_arg1"
    | "two_sided_material_volumetric_runtime_arg0"
    | "default_material_sidedness_runtime_arg0";
  source: "mdl-material-twosided-runtime-branch";
  exactGlState: "diagnostic_pending";
}

export interface AuroraParticleFramebufferRenderLane {
  sampleFramebuffer?: number;
  volumetric: boolean;
  runtimeLane: 5 | 6 | null;
  lane:
    | "sample_framebuffer_mode_2_runtime_lane_6"
    | "sample_framebuffer_mode_1_runtime_lane_5"
    | "volumetric_runtime_lane_5"
    | "default_framebuffer_runtime_lane";
  source: "mdl-emitter-sample_framebuffer-volumetric";
  exactGlState: "diagnostic_pending";
}

export interface AuroraParticleAtlasUv {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  column: number;
  row: number;
  xGrid: number;
  yGrid: number;
  frameIndex: number;
  rawFrameIndex: number;
  mapping: "single_cell_full_texture" | "row_major_top_down_v";
}

export interface AuroraParticleAtlasProvenance {
  checkpointSeconds: number;
  frameStart?: number;
  frameEnd?: number;
  secondsPerFrame?: number;
  randomResetPath:
    | "source_random_1_particle_reset"
    | "sequential_or_static_particle_reset";
  materialLevelFrameOffsetAllowed: false;
  frameStepIntegerConversion:
    | "already_integer"
    | "truncated_with_diagnostic";
}

export interface AuroraParticleDrawRecord {
  recordKind: "aurora-particle-draw-record";
  drawRecordId: string;
  emitterNodeName: string;
  lane: "textured_quad" | "linked_textured_quad";
  particleId: number;
  particleIndex: number;
  linkedNextParticleId?: number;
  verticesPerParticle: 6;
  vertexCount: 6;
  drawRoute: AuroraParticleDrawRoute;
  renderMode: AuroraParticleRenderModeRecord;
  blendMode: AuroraParticleBlendModeRecord;
  renderState: AuroraParticleRenderStateLane;
  renderOrder: AuroraParticleRenderOrderRecord;
  position: AuroraParticleRuntimeRecord["position"];
  velocity: AuroraParticleRuntimeRecord["velocity"];
  rotationRadians: number;
  color: AuroraParticleRuntimeRecord["color"];
  alpha: number;
  size: AuroraParticleRuntimeRecord["size"];
  atlasUv: AuroraParticleAtlasUv;
  atlasProvenance: AuroraParticleAtlasProvenance;
  diagnostics: AuroraVfxDiagnostic[];
}

export interface AuroraParticleRenderOrderRecord {
  value: number;
  rawValue?: number;
  source: "mdl-emitter-renderorder" | "default";
  directionStatus: "value_preserved_direction_profile_pending";
}

export interface AuroraTexturedQuadTopologyRecord {
  verticesPerParticle: 6;
  drawRoute: AuroraParticleDrawRoute;
  canonicalForChunkLane: false;
}

export interface AuroraChunkParticleRenderLane {
  lane: "chunk_model";
  chunkName?: string;
  activeParticleCount: number;
  texturedQuadCanonical: false;
  collapseAttempted: boolean;
}

export interface AuroraVfxRuntimeRenderContract {
  version: "aurora-vfx-runtime-render-contract/v1";
  emitterNodeName: string;
  rendererAgnostic: true;
  frontendRendererImplemented: false;
  sourceModelObjectKey?: string;
  activeParticleCount: number;
  drawParticleCount: number;
  verticesPerDrawParticle: 0 | 6;
  drawVertexCount: number;
  drawLane: AuroraParticleDrawLane;
  texturedQuadTopology: AuroraTexturedQuadTopologyRecord;
  chunkLane?: AuroraChunkParticleRenderLane;
  renderMode: AuroraParticleRenderModeRecord;
  blendMode: AuroraParticleBlendModeRecord;
  renderState: AuroraParticleRenderStateLane;
  renderOrder: AuroraParticleRenderOrderRecord;
  progFxType4Light?: AuroraVfxProgFxType4LightRecord;
  drawRecords: AuroraParticleDrawRecord[];
  diagnostics: AuroraVfxDiagnostic[];
  adapterBoundaries: {
    threeMaterialSettingsAreSourceTruth: false;
    spriteMaterialIsCanonical: false;
    shaderMaterialIsCanonical: false;
    glbPreviewIsCanonical: false;
    materialLevelAtlasFrameOffsetAllowed: false;
  };
}

export interface BuildAuroraVfxRenderContractInput {
  runtimeState: AuroraEmitterRuntimeState;
  sourceEmitter?: AuroraMdlEmitterNode;
  dependencyGraph?: AuroraVfxDependencyGraph;
  phaseSchedule?: AuroraVfxPhaseSchedule;
  progFxRows?: AuroraProgFxSourceRow[];
  collapseChunkToTextureLane?: boolean;
}

export interface AuroraVfxProgFxType4LightRecord {
  rowId: number;
  label: string;
  animationRaw: string;
  animation: string;
  animationParameterStatus: string;
  animationKind: "light" | "vision" | "unknown";
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
  sourceMdlRadiusFrames: [number, number] | null;
  sourceMdlRadiusSource: string;
  sourceMdlRadiusProofStatus: string;
  animationSpeedRaw: string;
  animationSpeed: number | null;
  animationSpeedParameterStatus: string;
  castShadowsRaw: string;
  castShadows: boolean | null;
  castShadowParameterStatus: string;
  priorityRaw: string;
  priority: number | null;
  priorityParameterStatus: string;
  proximitySuppressionRaw: string;
  proximitySuppression: boolean | null;
  proximitySuppressionParameterStatus: string;
  attachToSceneRaw: string;
  attachToScene: boolean | null;
  sceneAttachmentParameterStatus: string;
  modelRaw: string;
  modelRef: string;
  modelParameterStatus: string;
  unusedParam8Raw: string;
  color: { r: number; g: number; b: number };
  proofStatus: "source-backed-progfx-type4-owner-phase-effect-instance-runtime-retail-unverified";
  notPlaceableTwoDaLight: true;
  notMdlLightNode: true;
  parameterSource: string;
  parameterPreservationProofSource: string;
  parameterPreservationProofStatus: string;
  runtimeSchedulingStatus: "source-backed-owner-phase-effect-instance-ready-retail-runtime-unverified";
  runtimeSchedulingProofSource: string;
  runtimeSchedulingBlocker: string;
  sceneAttachmentPolicyStatus: string;
  proximitySuppressionPolicyStatus: string;
  visionMutationPolicyStatus: string;
  shadowPolicyStatus: string;
  visualPreviewStatus: "backend-render-contract-source-record-no-scene-light";
  ownerVisualEffectRowId: number;
  ownerVisualEffectLabel: string;
  ownerPhase: AuroraVfxPhaseKind;
  ownerProgFxRef: string;
  ownerEffectConstructorKind: string;
  ownerDurationType: string;
}

export interface AuroraVfxRenderOrderComparison {
  leftEmitterNodeName: string;
  rightEmitterNodeName: string;
  leftRenderOrder: number;
  rightRenderOrder: number;
  valueRelation: "left_lower" | "left_higher" | "equal";
  drawDirection: "diagnostic_pending";
  diagnostics: AuroraVfxDiagnostic[];
}

const TEXTURED_QUAD_VERTICES_PER_PARTICLE = 6 as const;
const DRAW_MODE_ARGUMENT = 3 as const;
const PROGFX_TYPE4_RUNTIME_SCHEDULING_PROOF_SOURCE =
  "nwn_base.key progfx.2da Type 4 Param1..Param7 rows are table-backed and raw-preserved; " +
  "backend/scripts/audit-retail-progfx-type4-table.ts over retail nwn_base.key reports progfx rowCount=1301, type4RowCount=68, itemLightNormalRowCount=28, itemLightFadeRowCount=28, nonItemType4RowCount=12, animationKindCounts light=56 vision=10 unknown=2, Param3 castShadows true=42 false=26, Param4 priorityRawCounts 13=2/20=56/49..53=2 each, Param5 proximity true=8 false=60, Param6 attachToScene true=2 false=66, modelCounts fx_light_clr=68, nonItemRows=[328,329,330,331,332,333,378,379,380,381,382,383], nonItemCastShadowRows=[], proximityRows=[328,329,330,332,378,379,380,382], attachRows=[333,383], visionRows=[328,329,330,331,333,378,379,380,381,383], and proofStatus=source-backed-progfx-type4-table-parameter-distribution-runtime-scheduler-blocked; " +
  "C:/Projects/New Folder/export/decompiled_all.c:348244 loads visualeffects.2da; source-only progfxType4SourceSchedulerEvidence proofStatus=source-backed-visualeffects-loader-progfx-type4-scheduler-not-in-source-only-decompilation reports runtimeSchedulerStringHitCount=0 and schedulerStringHits=[] for progfx.2da/fx_light_clr/Blind_Vision/Param3-6 scheduler needles; localResourceDumpEvidence proofStatus=source-backed-local-reference-root-lacks-progfx-type4-scheduler-resource-dump reports missingResourceNames=[progfx.2da,visualeffects.2da,fx_light_clr.mdl,fx_light_clr.mdb] in the available C:/Projects/New Folder dump; backend/scripts/audit-retail-light-function-disasm.py recovers OnApplyVisualEffect/OnRemoveVisualEffect object-level looping VFX owner add/remove through CNWSObject+0x160/+0x168, CNWSMessage last-update copy/diff through CLastUpdateObject+0x108/CNWSObject+0x160, CNWSMessage game-object update serialization, and nwmain.exe clientVisualEffectReceiveRenderEvidence proofStatus=source-backed-cnwcmessage-client-vfx-receive-vtable-add-newcaurobject-mdl-gob-light-path; clientObjectVisualEffectLifecycle proofStatus=source-backed-client-object-add-remove-refresh-looping-vfx-path; visualEffectSourceModelLoaders proofStatus=source-backed-client-vfx-loadvisualeffect-newcaurobject-model-loader-path with LoadVisualEffect-progfx-source-loader 0x14096cf10, fx-light-loader-region 0x14096c610, fx_light string refs, and NewCAurObject/Gob creation; current capstone-free fallback now reports clientVisualEffectReceiveRenderEvidence proofStatus=source-backed-capstone-free-cnwcmessage-client-vfx-callgraph-vtable-loader-path-scheduler-dataflow-blocked, messageDispatchChain proofStatus=source-backed-capstone-free-cnwcmessage-client-vfx-update-dispatch-chain, clientKnownFunctionCallgraph proofStatus=source-backed-capstone-free-client-vfx-message-owner-loader-callgraph, missingExpectedDirectCallTargets=[], clientVisualEffectSchedulerDataFlowProofStatus=blocked-capstone-free-callgraph-proves-vfx-loader-object-attach-not-progfx-param-scheduler-dataflow; capstoneFreeCallTargetEvidence proofStatus=capstone-free-binary-relative-call-target-scan-ran, clientVisualEffectDirectCallXrefCount=1502, clientVisualEffectObservedTargetFamilies=[message-readers,visual-transform-reader,looping-vfx-list-attach,progfx-source-loader,vfx-2da-row-loader,fx-light-loader-region,aurora-object-gob-construction,runtime-state-scene-helpers], legacyDirectCallScanSchedulerStatus=blocked-direct-call-targets-show-vfx-loader-object-attach-not-progfx-param-scheduler-dataflow, top direct target groups ReadBYTE=416, ReadFLOAT=297, object-id-read=174, ReadWORD=156, NewCAurObject=116, AddTail=57, plus string hits for ProgFX_Impact/ProgFX_Duration/ProgFX_Cessation/fx_light, but cannot recover Param3/4/5/6 scheduler data-flow; generic MDL AuroraLight PartLight creation remains source-backed through MdlNodeLight::InternalCreateInstance; Beamdog patch 8193.15 documents progfx.2da unhardcoding but not priority/proximity/shadow runtime semantics";
const PROGFX_TYPE4_CAPSTONE_FREE_CLIENT_CALLGRAPH_SOURCE =
  "backend/scripts/audit-retail-light-function-disasm.py capstone-free nwmain.exe clientVisualEffectReceiveRenderEvidence proofStatus=source-backed-capstone-free-cnwcmessage-client-vfx-callgraph-vtable-loader-path-scheduler-dataflow-blocked; messageDispatchChain proofStatus=source-backed-capstone-free-cnwcmessage-client-vfx-update-dispatch-chain; clientKnownFunctionCallgraph proofStatus=source-backed-capstone-free-client-vfx-message-owner-loader-callgraph; missingExpectedDirectCallTargets=[]; clientVisualEffectSchedulerDataFlowProofStatus=blocked-capstone-free-callgraph-proves-vfx-loader-object-attach-not-progfx-param-scheduler-dataflow";
const PROGFX_TYPE4_DOCS_POLICY_SOURCE =
  "nwn.wiki progfx.2da Type 4 docs updated 2026-02-18 documents Param4 priority lower value wins and 0 always applies, Param5 proximity suppression near another light source, Param6 Beamdog Attach to scene removal of scene lights while the effect is active, and Type 4 vision/light rows using fx_light_clr Param1 animations; Beamdog patch 8193.15 documents progfx.2da unhardcoding";
const PROGFX_TYPE4_VISUALEFFECT_OWNER_PROOF_SOURCE =
  "backend/scripts/audit-retail-progfx-type4-table.ts also maps retail visualeffects.2da owner phases: type4OwnerPhaseCount=77, itemLightOwnerPhaseCount=56, nonItemOwnerPhaseCount=21, ownerPhaseCounts impact=0 duration=39 cessation=38, nonItemCastShadowOwnerPhaseCount=0, nonItemAttachToSceneOwnerPhaseCount=1, nonItemProximitySuppressionOwnerPhaseCount=18, nonItemOwnerLabels=[VFX_DUR_BLACKOUT,VFX_DUR_DARKVISION,VFX_FNF_SOUND_BURST,VFX_FNF_STRIKE_HOLY,VFX_DUR_BLINDVISION,VFX_DUR_LOWLIGHTVISION,VFX_DUR_ULTRAVISION,VFX_DUR_BLIND,VFX_FNF_SOUND_BURST_SILENT,VFX_FNF_TELEPORT_IN,VFX_FNF_TELEPORT_OUT], proofStatus=source-backed-visualeffects-progfx-type4-owner-phase-map-runtime-scheduler-blocked";
const PROGFX_TYPE4_RUNTIME_SCHEDULING_FULL_PROOF_SOURCE = `${PROGFX_TYPE4_RUNTIME_SCHEDULING_PROOF_SOURCE}; ${PROGFX_TYPE4_CAPSTONE_FREE_CLIENT_CALLGRAPH_SOURCE}; ${PROGFX_TYPE4_VISUALEFFECT_OWNER_PROOF_SOURCE}; ${PROGFX_TYPE4_DOCS_POLICY_SOURCE}`;
const PROGFX_TYPE4_RUNTIME_SCHEDULING_BLOCKER =
  "ProgFX Type 4 Param3 values are source-table backed, Param4/Param5/Param6/vision policy semantics are docs-backed from progfx.2da, and object-level looping VFX owner add/remove, CNWSMessage last-update copy/diff, CNWSMessage game-object update serialization, client receive/render object attach, fx_light NewCAurObject/Gob model instantiation, and generic MDL PartLight creation are source-backed; retail table/owner-phase audit reports nonItemCastShadowRows=[] and nonItemCastShadowOwnerPhaseCount=0, so vanilla non-item Type 4 shadow-casting rows are source-backed absent; source-only decompiled_all.c still has no progfx.2da/fx_light_clr/Blind_Vision scheduler string hit, localResourceDumpEvidence does not expose progfx.2da/visualeffects.2da/fx_light_clr scheduler resource files in the available C:/Projects/New Folder dump, and decompiled_all.c does not expose the retail scheduler data-flow, so remaining blocked semantics are cross-lane insertion order, exact owner grouping, proximity distance threshold, scene-light restore timing, and pixel/runtime vision mutation parity";
const PROGFX_TYPE4_SCENE_ATTACHMENT_POLICY_STATUS =
  "docs-backed-progfx-type4-param6-attach-to-scene-removes-scene-lights-retail-dataflow-blocked";
const PROGFX_TYPE4_PROXIMITY_SUPPRESSION_POLICY_STATUS =
  "docs-backed-progfx-type4-param5-proximity-suppression-near-other-light-retail-distance-blocked";
const PROGFX_TYPE4_VISION_MUTATION_POLICY_STATUS =
  "docs-backed-progfx-type4-param4-param1-vision-priority-token-retail-mutation-blocked";
const PROGFX_TYPE4_ITEM_LIGHT_SHADOW_POLICY_STATUS =
  "source-backed-progfx-type4-param3-item-light-shadow-toggle-retail-shadow-volume-projection-blocked";
const PROGFX_TYPE4_NON_ITEM_SHADOW_POLICY_STATUS =
  "source-backed-progfx-type4-non-item-cast-shadow-absent-vanilla-rows";
const PROGFX_TYPE4_CUSTOM_NON_ITEM_SHADOW_POLICY_STATUS =
  "blocked-custom-non-item-progfx-type4-shadow-runtime-not-recovered";

export function buildAuroraVfxRuntimeRenderContract(
  input: BuildAuroraVfxRenderContractInput
): AuroraVfxRuntimeRenderContract {
  const runtimeState = input.runtimeState;
  const activeParticles = runtimeState.particles.filter((particle) =>
    runtimeState.activeParticleIds.includes(particle.particleId)
  );
  const renderMode = resolveRenderMode(input.sourceEmitter);
  const blendMode = resolveBlendMode(input.sourceEmitter);
  const renderOrder = resolveRenderOrder(runtimeState, input.sourceEmitter);
  const renderState = buildRenderState(blendMode, runtimeState, input.sourceEmitter);
  const isChunkLane = isChunkParticleLane(input);
  const progFxType4Light = resolveProgFxType4LightRecord(input);
  const diagnostics: AuroraVfxDiagnostic[] = [
    ...runtimeState.diagnostics,
    ...runtimeState.lastTickDiagnostics,
    ...buildDrawRouteDiagnostics(),
    ...buildRenderStateDiagnostics(renderState, blendMode),
    ...buildProgFxType4Diagnostics(progFxType4Light)
  ];

  if (isChunkLane) {
    diagnostics.push(
      renderDiagnostic(
        "VFX_CHUNK_MODEL_RESOURCE_CLASS_REQUIRED",
        "warn",
        "Chunk particles require the chunk-model lane and are not canonical textured six-vertex quads."
      )
    );
    if (input.collapseChunkToTextureLane === true) {
      diagnostics.push(
        renderDiagnostic(
          "VFX_TEXTURE_FIELD_LANE_COLLAPSED",
          "error",
          "Caller attempted to collapse chunk particles into the texture lane; the render contract preserved the chunk-model lane."
        )
      );
    }
  }

  const linked = renderMode.enum === "linked" && !isChunkLane;
  const drawParticleCount = isChunkLane
    ? 0
    : linked
      ? Math.max(0, activeParticles.length - 1)
      : activeParticles.length;
  const verticesPerDrawParticle = isChunkLane ? 0 : TEXTURED_QUAD_VERTICES_PER_PARTICLE;
  const drawRecords = isChunkLane
    ? []
    : activeParticles.slice(0, drawParticleCount).map((particle, index) =>
        buildParticleDrawRecord({
          particle,
          particleIndex: index,
          linkedNextParticleId: linked ? activeParticles[index + 1]?.particleId : undefined,
          runtimeState,
          renderMode,
          blendMode,
          renderState,
          renderOrder
        })
      );
  const chunkName = input.sourceEmitter?.chunkName;

  return {
    version: "aurora-vfx-runtime-render-contract/v1",
    emitterNodeName: runtimeState.emitterNodeName,
    rendererAgnostic: true,
    frontendRendererImplemented: false,
    ...(runtimeState.sourceModelObjectKey
      ? { sourceModelObjectKey: runtimeState.sourceModelObjectKey }
      : {}),
    activeParticleCount: activeParticles.length,
    drawParticleCount,
    verticesPerDrawParticle,
    drawVertexCount: drawParticleCount * verticesPerDrawParticle,
    drawLane: isChunkLane ? "chunk_model" : linked ? "linked_textured_quad" : "textured_quad",
    texturedQuadTopology: {
      verticesPerParticle: TEXTURED_QUAD_VERTICES_PER_PARTICLE,
      drawRoute: buildDrawRoute(),
      canonicalForChunkLane: false
    },
    ...(isChunkLane
      ? {
          chunkLane: {
            lane: "chunk_model",
            ...(chunkName ? { chunkName } : {}),
            activeParticleCount: activeParticles.length,
            texturedQuadCanonical: false,
            collapseAttempted: input.collapseChunkToTextureLane === true
          }
        }
      : {}),
    renderMode,
    blendMode,
    renderState,
    renderOrder,
    ...(progFxType4Light ? { progFxType4Light } : {}),
    drawRecords,
    diagnostics: mergeDiagnostics([
      ...diagnostics,
      ...drawRecords.flatMap((record) => record.diagnostics)
    ]),
    adapterBoundaries: {
      threeMaterialSettingsAreSourceTruth: false,
      spriteMaterialIsCanonical: false,
      shaderMaterialIsCanonical: false,
      glbPreviewIsCanonical: false,
      materialLevelAtlasFrameOffsetAllowed: false
    }
  };
}

export function compareAuroraVfxRenderOrder(
  left: AuroraVfxRuntimeRenderContract,
  right: AuroraVfxRuntimeRenderContract
): AuroraVfxRenderOrderComparison {
  const relation =
    left.renderOrder.value < right.renderOrder.value
      ? "left_lower"
      : left.renderOrder.value > right.renderOrder.value
        ? "left_higher"
        : "equal";
  return {
    leftEmitterNodeName: left.emitterNodeName,
    rightEmitterNodeName: right.emitterNodeName,
    leftRenderOrder: left.renderOrder.value,
    rightRenderOrder: right.renderOrder.value,
    valueRelation: relation,
    drawDirection: "diagnostic_pending",
    diagnostics: [
      renderDiagnostic(
        "VFX_RENDERORDER_ADAPTER_DIRECTION_PROVENANCE_REQUIRED",
        "warn",
        "Renderorder values are preserved for draw-queue comparison, but adapter direction still requires selected profile/retail capture evidence."
      )
    ]
  };
}

function resolveProgFxType4LightRecord(
  input: BuildAuroraVfxRenderContractInput
): AuroraVfxProgFxType4LightRecord | undefined {
  const schedule = input.phaseSchedule;
  if (!schedule || schedule.status !== "ready" || !schedule.effectInstance) {
    return undefined;
  }
  const progFxRows = input.progFxRows ?? [];
  for (const phase of schedule.phases) {
    if (!phase.progFxRaw) {
      continue;
    }
    const row = progFxRows.find(
      (candidate) =>
        String(candidate.rowId) === phase.progFxRaw &&
        candidate.type === 4 &&
        candidate.type4Light
    );
    const light = row?.type4Light;
    if (!row || !light) {
      continue;
    }
    const symbolicColor = light.animationSymbolicColor ?? "";
    const sourceMdlColor = light.sourceMdlColor ?? null;
    const isLightAnimation = light.animationKind === "light";
    return {
      rowId: row.rowId,
      label: row.label,
      animationRaw: light.animationRaw ?? "",
      animation: light.animation ?? "",
      animationParameterStatus: light.animationParameterStatus ?? "",
      animationKind: light.animationKind ?? "unknown",
      visionMode: light.visionMode ?? "",
      visionParameterStatus: light.visionParameterStatus ?? "",
      symbolicColor,
      tokenRadiusMeters: light.animationTokenRadiusMeters ?? null,
      tokenRadiusProofStatus: light.animationTokenRadiusProofStatus ?? "",
      radiusMeters: isLightAnimation ? light.sourceMdlRadiusMeters ?? null : null,
      radiusProofStatus: isLightAnimation ? light.sourceMdlRadiusProofStatus ?? "" : "",
      sourceMdlNodeName: light.sourceMdlNodeName ?? "",
      sourceMdlAnimation: light.sourceMdlAnimation ?? "",
      sourceMdlColor,
      sourceMdlColorSource: light.sourceMdlColorSource ?? "",
      sourceMdlColorProofStatus: light.sourceMdlColorProofStatus ?? "",
      sourceMdlRadiusMeters: light.sourceMdlRadiusMeters ?? null,
      sourceMdlRadiusFrames: light.sourceMdlRadiusFrames ?? null,
      sourceMdlRadiusSource: light.sourceMdlRadiusSource ?? "",
      sourceMdlRadiusProofStatus: light.sourceMdlRadiusProofStatus ?? "",
      animationSpeedRaw: light.animationSpeedRaw ?? "",
      animationSpeed: light.animationSpeed ?? null,
      animationSpeedParameterStatus: light.animationSpeedParameterStatus ?? "",
      castShadowsRaw: light.castShadowsRaw ?? "",
      castShadows: light.castShadows ?? null,
      castShadowParameterStatus: light.castShadowParameterStatus ?? "",
      priorityRaw: light.priorityRaw ?? "",
      priority: light.priority ?? null,
      priorityParameterStatus: light.priorityParameterStatus ?? "",
      proximitySuppressionRaw: light.proximitySuppressionRaw ?? "",
      proximitySuppression: light.proximitySuppression ?? null,
      proximitySuppressionParameterStatus:
        light.proximitySuppressionParameterStatus ?? "",
      attachToSceneRaw: light.attachToSceneRaw ?? "",
      attachToScene: light.attachToScene ?? null,
      sceneAttachmentParameterStatus: light.sceneAttachmentParameterStatus ?? "",
      modelRaw: light.modelRaw ?? "",
      modelRef: light.modelRef ?? "",
      modelParameterStatus: light.modelParameterStatus ?? "",
      unusedParam8Raw: light.unusedParam8Raw ?? "",
      color: isLightAnimation
        ? sourceMdlColor ?? resolveProgFxType4Color(symbolicColor)
        : { r: 0, g: 0, b: 0 },
      proofStatus:
        "source-backed-progfx-type4-owner-phase-effect-instance-runtime-retail-unverified",
      notPlaceableTwoDaLight: true,
      notMdlLightNode: true,
      parameterSource: light.parameterSource,
      parameterPreservationProofSource: light.parameterPreservationProofSource,
      parameterPreservationProofStatus: light.parameterPreservationProofStatus,
      runtimeSchedulingStatus:
        "source-backed-owner-phase-effect-instance-ready-retail-runtime-unverified",
      runtimeSchedulingProofSource: PROGFX_TYPE4_RUNTIME_SCHEDULING_FULL_PROOF_SOURCE,
      runtimeSchedulingBlocker: PROGFX_TYPE4_RUNTIME_SCHEDULING_BLOCKER,
      sceneAttachmentPolicyStatus: PROGFX_TYPE4_SCENE_ATTACHMENT_POLICY_STATUS,
      proximitySuppressionPolicyStatus: PROGFX_TYPE4_PROXIMITY_SUPPRESSION_POLICY_STATUS,
      visionMutationPolicyStatus: PROGFX_TYPE4_VISION_MUTATION_POLICY_STATUS,
      shadowPolicyStatus: resolveProgFxType4ShadowPolicyStatus(light),
      visualPreviewStatus: "backend-render-contract-source-record-no-scene-light",
      ownerVisualEffectRowId: schedule.sourceRowId,
      ownerVisualEffectLabel: schedule.sourceLabel,
      ownerPhase: phase.phase,
      ownerProgFxRef: phase.progFxRaw,
      ownerEffectConstructorKind: schedule.effectInstance.constructorKind,
      ownerDurationType: schedule.effectInstance.durationType ?? "unknown"
    };
  }
  return undefined;
}

function resolveProgFxType4Color(symbolicColor: string): { r: number; g: number; b: number } {
  switch (symbolicColor.toLowerCase()) {
    case "blue":
      return { r: 0.25, g: 0.45, b: 1 };
    case "yellow":
      return { r: 1, g: 0.86, b: 0.28 };
    case "purple":
      return { r: 0.72, g: 0.34, b: 1 };
    case "red":
      return { r: 1, g: 0.18, b: 0.08 };
    case "orange":
      return { r: 1, g: 0.48, b: 0.12 };
    case "white":
      return { r: 1, g: 1, b: 1 };
    case "grey":
    case "gray":
      return { r: 0.62, g: 0.62, b: 0.62 };
    default:
      return { r: 0, g: 0, b: 0 };
  }
}

function buildProgFxType4Diagnostics(
  record: AuroraVfxProgFxType4LightRecord | undefined
): AuroraVfxDiagnostic[] {
  if (!record) {
    return [];
  }
  return [
    renderDiagnostic(
      "VFX_PROGFX_TYPE4_OWNER_PHASE_EFFECT_INSTANCE_READY",
      "info",
      "ProgFX Type 4 row is backed by a ready visualeffects.2da phase schedule and EffectVisualEffect context."
    ),
    renderDiagnostic(
      "VFX_PROGFX_TYPE4_RENDER_CONTRACT_NO_POINTLIGHT",
      "warn",
      "Render contract preserves ProgFX Type 4 light/vision metadata but does not create a generic PointLight without retail runtime proof."
    ),
    renderDiagnostic(
      "VFX_PROGFX_TYPE4_RETAIL_SCHEDULING_REQUIRED",
      "warn",
      "Canonical ProgFX Type 4 scheduling still requires retail validation for priority, proximity suppression, scene attachment, vision mutation, and cross-lane ordering."
    ),
    renderDiagnostic(
      "VFX_PROGFX_TYPE4_PARAMETERS_PRESERVED",
      "info",
      record.parameterPreservationProofSource
    ),
    ...(record.castShadowParameterStatus
      ? [
          renderDiagnostic(
            "VFX_PROGFX_TYPE4_PARAM3_CAST_SHADOWS_PRESERVED",
            "info",
            record.castShadowParameterStatus
          )
        ]
      : []),
    ...(record.priorityParameterStatus
      ? [
          renderDiagnostic(
            "VFX_PROGFX_TYPE4_PARAM4_PRIORITY_PRESERVED",
            "info",
            record.priorityParameterStatus
          )
        ]
      : []),
    ...(record.proximitySuppressionParameterStatus
      ? [
          renderDiagnostic(
            "VFX_PROGFX_TYPE4_PARAM5_PROXIMITY_PRESERVED",
            "info",
            record.proximitySuppressionParameterStatus
          )
        ]
      : []),
    ...(record.sceneAttachmentParameterStatus
      ? [
          renderDiagnostic(
            "VFX_PROGFX_TYPE4_PARAM6_ATTACH_TO_SCENE_PRESERVED",
            "info",
            record.sceneAttachmentParameterStatus
          )
        ]
      : []),
    ...(record.visionParameterStatus
      ? [
          renderDiagnostic(
            "VFX_PROGFX_TYPE4_PARAM1_VISION_TOKEN_PRESERVED",
            "info",
            record.visionParameterStatus
          )
        ]
      : []),
    renderDiagnostic(
      "VFX_PROGFX_TYPE4_RUNTIME_SCHEDULING_PROOF_SOURCE",
      "warn",
      PROGFX_TYPE4_RUNTIME_SCHEDULING_FULL_PROOF_SOURCE
    ),
    renderDiagnostic(
      "VFX_PROGFX_TYPE4_RUNTIME_POLICY_BLOCKED",
      "warn",
      PROGFX_TYPE4_RUNTIME_SCHEDULING_BLOCKER
    )
  ];
}

function resolveProgFxType4ShadowPolicyStatus(
  light: NonNullable<AuroraProgFxSourceRow["type4Light"]>
): string {
  if (light.animationKind === "light") {
    return PROGFX_TYPE4_ITEM_LIGHT_SHADOW_POLICY_STATUS;
  }
  if (light.castShadows === true) {
    return PROGFX_TYPE4_CUSTOM_NON_ITEM_SHADOW_POLICY_STATUS;
  }
  return PROGFX_TYPE4_NON_ITEM_SHADOW_POLICY_STATUS;
}

function buildParticleDrawRecord(input: {
  particle: AuroraParticleRuntimeRecord;
  particleIndex: number;
  linkedNextParticleId?: number;
  runtimeState: AuroraEmitterRuntimeState;
  renderMode: AuroraParticleRenderModeRecord;
  blendMode: AuroraParticleBlendModeRecord;
  renderState: AuroraParticleRenderStateLane;
  renderOrder: AuroraParticleRenderOrderRecord;
}): AuroraParticleDrawRecord {
  const atlas = buildParticleAtlasUv(input.runtimeState, input.particle);
  const lane = input.linkedNextParticleId !== undefined ? "linked_textured_quad" : "textured_quad";
  return {
    recordKind: "aurora-particle-draw-record",
    drawRecordId: `${input.runtimeState.emitterNodeName}:particle:${input.particle.particleId}`,
    emitterNodeName: input.runtimeState.emitterNodeName,
    lane,
    particleId: input.particle.particleId,
    particleIndex: input.particleIndex,
    ...(input.linkedNextParticleId !== undefined
      ? { linkedNextParticleId: input.linkedNextParticleId }
      : {}),
    verticesPerParticle: TEXTURED_QUAD_VERTICES_PER_PARTICLE,
    vertexCount: TEXTURED_QUAD_VERTICES_PER_PARTICLE,
    drawRoute: buildDrawRoute(),
    renderMode: input.renderMode,
    blendMode: input.blendMode,
    renderState: input.renderState,
    renderOrder: input.renderOrder,
    position: { ...input.particle.position },
    velocity: { ...input.particle.velocity },
    rotationRadians: input.particle.rotationRadians,
    color: { ...input.particle.color },
    alpha: input.particle.alpha,
    size: { ...input.particle.size },
    atlasUv: atlas.uv,
    atlasProvenance: atlas.provenance,
    diagnostics: atlas.diagnostics
  };
}

function buildParticleAtlasUv(
  runtimeState: AuroraEmitterRuntimeState,
  particle: AuroraParticleRuntimeRecord
): {
  uv: AuroraParticleAtlasUv;
  provenance: AuroraParticleAtlasProvenance;
  diagnostics: AuroraVfxDiagnostic[];
} {
  const diagnostics: AuroraVfxDiagnostic[] = [];
  const sourceAtlas = runtimeState.source.atlas;
  const xGrid = sanitizePositiveInteger(sourceAtlas?.effectiveXGrid, 1);
  const yGrid = sanitizePositiveInteger(sourceAtlas?.effectiveYGrid, 1);
  const frameCapacity = Math.max(1, xGrid * yGrid);
  const frameStart = particle.atlas.frameStart ?? sourceAtlas?.frameStart;
  const frameEnd = particle.atlas.frameEnd ?? sourceAtlas?.frameEnd;
  if (
    typeof frameStart === "number" &&
    typeof frameEnd === "number" &&
    frameStart > frameEnd
  ) {
    diagnostics.push(
      renderDiagnostic(
        "VFX_ATLAS_FRAME_RANGE_NOT_SORTED",
        "warn",
        "Atlas frameStart/frameEnd are descending; render contract preserves the source range instead of sorting it."
      )
    );
  }
  if (
    (typeof frameStart === "number" && (frameStart < 0 || frameStart >= frameCapacity)) ||
    (typeof frameEnd === "number" && (frameEnd < 0 || frameEnd >= frameCapacity))
  ) {
    diagnostics.push(
      renderDiagnostic(
        "VFX_ATLAS_FRAME_RANGE_OUT_OF_BOUNDS",
        "warn",
        "Atlas frame range is outside the atlas capacity; source values remain preserved for diagnostics."
      )
    );
  }

  const rawFrameIndex = Number.isFinite(particle.atlas.frameIndex)
    ? particle.atlas.frameIndex
    : 0;
  const integerFrameIndex = Math.trunc(rawFrameIndex);
  const frameStepIntegerConversion =
    integerFrameIndex === rawFrameIndex
      ? "already_integer"
      : "truncated_with_diagnostic";
  if (frameStepIntegerConversion === "truncated_with_diagnostic") {
    diagnostics.push(
      renderDiagnostic(
        "VFX_ATLAS_FRAME_STEP_INTEGER_CONVERSION_DIAGNOSTIC",
        "warn",
        "Atlas frame index required integer conversion; exact tie/rounding behavior needs retail validation."
      )
    );
  }
  if (sourceAtlas?.fps !== undefined) {
    diagnostics.push(
      renderDiagnostic(
        "VFX_POC_ATLAS_AGE_FLOOR_PREVIEW_ONLY",
        "info",
        "Render contract uses per-particle frame/checkpoint state; age-floor material atlas playback remains preview-only."
      )
    );
  }

  const frameIndex = positiveModulo(integerFrameIndex, frameCapacity);
  const singleCell = frameCapacity === 1;
  const column = singleCell ? 0 : frameIndex % xGrid;
  const row = singleCell ? 0 : Math.floor(frameIndex / xGrid);
  const u0 = singleCell ? 0 : column / xGrid;
  const u1 = singleCell ? 1 : (column + 1) / xGrid;
  const v0 = singleCell ? 0 : 1 - (row + 1) / yGrid;
  const v1 = singleCell ? 1 : 1 - row / yGrid;

  return {
    uv: {
      u0,
      v0,
      u1,
      v1,
      column,
      row,
      xGrid,
      yGrid,
      frameIndex,
      rawFrameIndex,
      mapping: singleCell ? "single_cell_full_texture" : "row_major_top_down_v"
    },
    provenance: {
      checkpointSeconds: particle.atlas.checkpointSeconds,
      ...(typeof frameStart === "number" ? { frameStart } : {}),
      ...(typeof frameEnd === "number" ? { frameEnd } : {}),
      ...(particle.atlas.secondsPerFrame !== undefined
        ? { secondsPerFrame: particle.atlas.secondsPerFrame }
        : {}),
      randomResetPath:
        sourceAtlas?.random === true
          ? "source_random_1_particle_reset"
          : "sequential_or_static_particle_reset",
      materialLevelFrameOffsetAllowed: false,
      frameStepIntegerConversion
    },
    diagnostics
  };
}

function resolveRenderMode(
  emitter: AuroraMdlEmitterNode | undefined
): AuroraParticleRenderModeRecord {
  const rawToken = emitter?.renderModeRaw ?? emitter?.renderMode;
  const normalized = normalizeToken(rawToken);
  const source = rawToken ? "mdl-emitter-render-token" : "missing-token";
  const mode = (() => {
    switch (normalized) {
      case "billboard_to_world_z":
      case "billboardtoworldz":
        return "billboard_to_world_z";
      case "billboard_to_local_z":
      case "billboardtolocalz":
        return "billboard_to_local_z";
      case "aligned_to_world_z":
      case "alignedtoworldz":
        return "aligned_to_world_z";
      case "aligned_to_particle_dir":
      case "alignedtoparticledir":
        return "aligned_to_particle_dir";
      case "linked":
        return "linked";
      case "motion_blur":
      case "motionblur":
        return "motion_blur";
      default:
        return "unknown";
    }
  })();
  return {
    enum: mode,
    ...(rawToken ? { rawToken } : {}),
    source
  };
}

function resolveBlendMode(
  emitter: AuroraMdlEmitterNode | undefined
): AuroraParticleBlendModeRecord {
  const rawToken = emitter?.blendModeRaw ?? emitter?.blendMode;
  const normalized = normalizeToken(rawToken);
  if (!rawToken || normalized === "normal") {
    return {
      enum: "normal",
      ...(rawToken ? { rawToken } : {}),
      modeNumber: 0,
      exactGlBlendFactors: "diagnostic_pending",
      source: rawToken ? "mdl-emitter-blend-token" : "missing-token"
    };
  }
  if (
    normalized === "punch_through" ||
    normalized === "punchthrough" ||
    normalized === "punch_thru" ||
    normalized === "punchthru"
  ) {
    return {
      enum: "punch_through",
      rawToken,
      modeNumber: 1,
      exactGlBlendFactors: "diagnostic_pending",
      source: "mdl-emitter-blend-token"
    };
  }
  return {
    enum: "mode_2",
    rawToken,
    modeNumber: 2,
    exactGlBlendFactors: "diagnostic_pending",
    source: "mdl-emitter-blend-token"
  };
}

function buildRenderState(
  blendMode: AuroraParticleBlendModeRecord,
  runtimeState: AuroraEmitterRuntimeState,
  emitter: AuroraMdlEmitterNode | undefined
): AuroraParticleRenderStateLane {
  const isPunchThrough = blendMode.enum === "punch_through";
  const sourceTransparency =
    runtimeState.source.sourceState?.transparency ??
    emitter?.sourceState?.transparency;
  const sourceOpaque = sourceTransparency === false && !isPunchThrough;
  const twoSidedTexture =
    runtimeState.source.sourceState?.twoSidedTexture ??
    emitter?.sourceState?.twoSidedTexture ??
    false;
  const volumetric =
    (runtimeState.source.sourceState?.volumetric ?? emitter?.sourceState?.volumetric) === true;
  return {
    blendMode,
    depthWriteLane: isPunchThrough
      ? "punch_through_depth_write_enabled"
      : sourceOpaque
        ? "source_transparency_false_depth_write_enabled"
        : "non_punch_transparent_depth_write_off",
    transparentLane: isPunchThrough
      ? "punch_through_cutout_lane"
      : sourceOpaque
        ? "source_transparency_false_opaque_lane"
        : "non_punch_transparent_lane",
    shaderVariantLane: isPunchThrough
      ? "punch_through_particle_shader_variant"
      : "non_punch_particle_shader_variant",
    twoSidedTextureLane: twoSidedTexture
      ? "two_sided_texture_cull_disabled"
      : "default_cull_lane",
    sourceTransparencyLane: sourceOpaque
      ? "source_transparency_false_opaque_depth_write_lane"
      : "source_transparency_true_or_missing_blend_lane",
    twoSidedMaterialLane: buildTwoSidedMaterialLane(runtimeState, emitter, volumetric),
    framebufferLane: buildFramebufferRenderLane(runtimeState, emitter)
  };
}

function buildTwoSidedMaterialLane(
  runtimeState: AuroraEmitterRuntimeState,
  emitter: AuroraMdlEmitterNode | undefined,
  volumetric: boolean
): AuroraParticleTwoSidedMaterialLane {
  const twoSidedMaterial =
    (runtimeState.source.sourceState?.twoSidedMaterial ??
      emitter?.sourceState?.twoSidedMaterial) === true;
  if (twoSidedMaterial && !volumetric) {
    return {
      twoSidedMaterial,
      volumetric,
      renderWrapperArgument: 1,
      lane: "two_sided_material_non_volumetric_runtime_arg1",
      source: "mdl-material-twosided-runtime-branch",
      exactGlState: "diagnostic_pending"
    };
  }
  if (twoSidedMaterial && volumetric) {
    return {
      twoSidedMaterial,
      volumetric,
      renderWrapperArgument: 0,
      lane: "two_sided_material_volumetric_runtime_arg0",
      source: "mdl-material-twosided-runtime-branch",
      exactGlState: "diagnostic_pending"
    };
  }
  return {
    twoSidedMaterial,
    volumetric,
    renderWrapperArgument: 0,
    lane: "default_material_sidedness_runtime_arg0",
    source: "mdl-material-twosided-runtime-branch",
    exactGlState: "diagnostic_pending"
  };
}

function buildFramebufferRenderLane(
  runtimeState: AuroraEmitterRuntimeState,
  emitter: AuroraMdlEmitterNode | undefined
): AuroraParticleFramebufferRenderLane {
  const rawSampleFramebuffer =
    runtimeState.source.sourceState?.sampleFramebuffer ??
    emitter?.sourceState?.sampleFramebuffer;
  const sampleFramebuffer = sanitizeSampleFramebuffer(rawSampleFramebuffer);
  const volumetric =
    (runtimeState.source.sourceState?.volumetric ?? emitter?.sourceState?.volumetric) === true;
  if (sampleFramebuffer === 2) {
    return {
      sampleFramebuffer,
      volumetric,
      runtimeLane: 6,
      lane: "sample_framebuffer_mode_2_runtime_lane_6",
      source: "mdl-emitter-sample_framebuffer-volumetric",
      exactGlState: "diagnostic_pending"
    };
  }
  if (sampleFramebuffer === 1) {
    return {
      sampleFramebuffer,
      volumetric,
      runtimeLane: 5,
      lane: "sample_framebuffer_mode_1_runtime_lane_5",
      source: "mdl-emitter-sample_framebuffer-volumetric",
      exactGlState: "diagnostic_pending"
    };
  }
  if (volumetric) {
    return {
      ...(sampleFramebuffer !== undefined ? { sampleFramebuffer } : {}),
      volumetric,
      runtimeLane: 5,
      lane: "volumetric_runtime_lane_5",
      source: "mdl-emitter-sample_framebuffer-volumetric",
      exactGlState: "diagnostic_pending"
    };
  }
  return {
    ...(sampleFramebuffer !== undefined ? { sampleFramebuffer } : {}),
    volumetric,
    runtimeLane: null,
    lane: "default_framebuffer_runtime_lane",
    source: "mdl-emitter-sample_framebuffer-volumetric",
    exactGlState: "diagnostic_pending"
  };
}

function sanitizeSampleFramebuffer(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  return undefined;
}

function resolveRenderOrder(
  runtimeState: AuroraEmitterRuntimeState,
  emitter: AuroraMdlEmitterNode | undefined
): AuroraParticleRenderOrderRecord {
  const rawValue = runtimeState.source.sourceState?.renderOrder ?? emitter?.sourceState?.renderOrder;
  const value = typeof rawValue === "number" && Number.isFinite(rawValue)
    ? Math.trunc(rawValue)
    : 0;
  return {
    value,
    ...(typeof rawValue === "number" && Number.isFinite(rawValue) ? { rawValue } : {}),
    source: typeof rawValue === "number" && Number.isFinite(rawValue)
      ? "mdl-emitter-renderorder"
      : "default",
    directionStatus: "value_preserved_direction_profile_pending"
  };
}

function isChunkParticleLane(input: BuildAuroraVfxRenderContractInput): boolean {
  return (
    input.runtimeState.family === "Chunk" ||
    Boolean(input.sourceEmitter?.chunkName) ||
    input.dependencyGraph?.edges.some((edge) => edge.edgeType === "chunk_model") === true
  );
}

function buildDrawRoute(): AuroraParticleDrawRoute {
  return {
    route: "non_indexed_draw_arrays",
    indexed: false,
    drawModeArgument: DRAW_MODE_ARGUMENT,
    drawModeArgumentSource: "aurora-draw-wrapper-mode-arg3",
    enumTableCaptured: false,
    triangleListInferenceProof: "diagnostic_pending"
  };
}

function buildDrawRouteDiagnostics(): AuroraVfxDiagnostic[] {
  return [
    renderDiagnostic(
      "VFX_PARTICLE_DRAW_NON_INDEXED_ARRAYS_REQUIRED",
      "info",
      "Textured particle draw records use non-indexed draw-array provenance."
    ),
    renderDiagnostic(
      "VFX_PARTICLE_DRAW_MODE_ARG3_ENUM_TABLE_CAPTURE_REQUIRED",
      "warn",
      "Draw wrapper mode argument 3 is preserved, but the enum table still needs capture before naming exact GL mode."
    ),
    renderDiagnostic(
      "VFX_PARTICLE_DRAW_TRIANGLE_INFERENCE_NOT_ENUM_PROOF",
      "warn",
      "Six-vertex textured quad layout is not treated as proof of the draw-wrapper enum table."
    )
  ];
}

function buildRenderStateDiagnostics(
  renderState: AuroraParticleRenderStateLane,
  blendMode: AuroraParticleBlendModeRecord
): AuroraVfxDiagnostic[] {
  const diagnostics = [
    renderDiagnostic(
      "VFX_BLEND_FUNC_FACTORS_CAPTURE_REQUIRED",
      "warn",
      "Aurora blend bucket is preserved, but exact GL blend factors require retail/capture proof."
    )
  ];
  if (renderState.depthWriteLane === "punch_through_depth_write_enabled") {
    diagnostics.push(
      renderDiagnostic(
        "VFX_PUNCH_THROUGH_DEPTHWRITE_LANE_REQUIRED",
        "info",
        "Punch-Through blend mode stays on its own depth-write lane."
      )
    );
  } else if (renderState.depthWriteLane === "source_transparency_false_depth_write_enabled") {
    diagnostics.push(
      renderDiagnostic(
        "VFX_SOURCE_TRANSPARENCY_FALSE_OPAQUE_DEPTHWRITE_REQUIRED",
        "info",
        "Source transparency false keeps non-punch particles on an opaque depth-write lane."
      )
    );
  } else {
    diagnostics.push(
      renderDiagnostic(
        "VFX_NONPUNCH_TRANSPARENT_DEPTHWRITE_OFF_REQUIRED",
        "info",
        "Non-punch particle blends stay on a transparent depth-write-off lane."
      )
    );
  }
  if (renderState.twoSidedTextureLane === "two_sided_texture_cull_disabled") {
    diagnostics.push(
      renderDiagnostic(
        "VFX_TWOSIDEDTEX_STATE3_CULL_LANE_REQUIRED",
        "info",
        "twoSidedTexture is tracked as a cull-state lane, not as a blend-mode rewrite."
      )
    );
  }
  if (renderState.twoSidedMaterialLane.lane === "two_sided_material_non_volumetric_runtime_arg1") {
    diagnostics.push(
      renderDiagnostic(
        "VFX_TWOSIDED_MATERIAL_RUNTIME_ARG1_REQUIRED",
        "info",
        "twosided material flag is preserved as Aurora render wrapper argument 1 when volumetric is false."
      )
    );
  } else if (renderState.twoSidedMaterialLane.lane === "two_sided_material_volumetric_runtime_arg0") {
    diagnostics.push(
      renderDiagnostic(
        "VFX_TWOSIDED_MATERIAL_VOLUMETRIC_ARG0_REQUIRED",
        "info",
        "Aurora checks twosided, but volumetric true keeps the render wrapper argument on 0."
      )
    );
  }
  if (renderState.framebufferLane.lane === "sample_framebuffer_mode_2_runtime_lane_6") {
    diagnostics.push(
      renderDiagnostic(
        "VFX_SAMPLE_FRAMEBUFFER_MODE2_RUNTIME_LANE_6_REQUIRED",
        "info",
        "sample_framebuffer 2 is preserved as Aurora runtime lane 6."
      )
    );
  } else if (renderState.framebufferLane.lane === "sample_framebuffer_mode_1_runtime_lane_5") {
    diagnostics.push(
      renderDiagnostic(
        "VFX_SAMPLE_FRAMEBUFFER_MODE1_RUNTIME_LANE_5_REQUIRED",
        "info",
        "sample_framebuffer 1 is preserved as Aurora runtime lane 5."
      )
    );
  } else if (renderState.framebufferLane.lane === "volumetric_runtime_lane_5") {
    diagnostics.push(
      renderDiagnostic(
        "VFX_VOLUMETRIC_RUNTIME_LANE_5_REQUIRED",
        "info",
        "volumetric emitters are preserved as Aurora runtime lane 5."
      )
    );
  }
  if (renderState.framebufferLane.runtimeLane !== null) {
    diagnostics.push(
      renderDiagnostic(
        "VFX_SAMPLE_FRAMEBUFFER_RENDER_LANE_CAPTURE_REQUIRED",
        "warn",
        "Aurora framebuffer runtime lane is preserved, but exact visible framebuffer/volumetric GL state still requires retail capture."
      )
    );
  }
  if (blendMode.enum === "mode_2") {
    diagnostics.push(
      renderDiagnostic(
        "VFX_PARTICLE_BLEND_MODE_2_RAW_PRESERVED",
        "warn",
        "Blend mode 2 raw token is preserved without naming exact Lighten/additive factors."
      )
    );
  }
  return diagnostics;
}

function renderDiagnostic(
  code: string,
  severity: AuroraVfxDiagnostic["severity"],
  message: string
): AuroraVfxDiagnostic {
  return { code, severity, message };
}

function mergeDiagnostics(diagnostics: AuroraVfxDiagnostic[]): AuroraVfxDiagnostic[] {
  const seen = new Set<string>();
  return diagnostics.filter((diagnostic) => {
    const key = `${diagnostic.code}:${diagnostic.message}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function normalizeToken(value: string | undefined): string {
  return typeof value === "string"
    ? value.trim().toLowerCase().replace(/[\s-]+/gu, "_")
    : "";
}

function sanitizePositiveInteger(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.trunc(value)
    : fallback;
}

function positiveModulo(value: number, modulo: number): number {
  return ((value % modulo) + modulo) % modulo;
}
