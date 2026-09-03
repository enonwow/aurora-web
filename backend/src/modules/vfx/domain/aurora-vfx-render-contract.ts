import type {
  AuroraMdlEmitterNode,
  AuroraMdlOrientation
} from "./aurora-mdl-vfx-source.parser";
import type {
  AuroraVfxDependencyCandidate,
  AuroraVfxDependencyGraph
} from "./aurora-vfx-dependency-graph";
import type {
  AuroraEmitterRuntimeState,
  AuroraParticleRuntimeRecord
} from "./aurora-vfx-runtime-state";
import type {
  AuroraMaterialShaderParameter,
  AuroraShaderProgramSourceBundle
} from "./aurora-shader-source-graph";
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
  | "normal"
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
  enumTableCaptured: true;
  glPrimitiveMode: "GL_TRIANGLES";
  glPrimitiveModeEnum: 0x0004;
  triangleListInferenceProof: "confirmed_draw_wrapper_table_index_3_gl_triangles";
  primitiveModeSource: "nwtoolset-1.5.0.5-disassembly";
  binarySha256: "4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24";
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
  exactGlBlendFactors:
    | {
        status: "confirmed";
        sourceFactor: "GL_SRC_ALPHA";
        sourceFactorGlEnum: 0x0302;
        destinationFactor: "GL_ONE_MINUS_SRC_ALPHA" | "GL_ONE";
        destinationFactorGlEnum: 0x0303 | 0x0001;
        blendTableIndices: [0, 1] | [0, 2];
        source: "nwtoolset-1.5.0.5-disassembly";
        binarySha256: "4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24";
      }
    | {
        status: "not_invoked_punch_through_lane";
        source: "aurora-particle-render-branch";
      };
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
  alphaDiscardLane:
    | "punch_through_runtime_uniform_0_2"
    | "non_punch_discard_compiled_out_variant";
  alphaDiscardValue: 0.2 | null;
  alphaDiscardValueSource:
    | "nwtoolset-1.5.0.5-disassembly"
    | "not_applicable_compiled_out_variant";
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
  source: "mtr-material-twosided-runtime-branch";
  exactGlState: {
    state3CullFace: "enabled" | "disabled";
    retainedCullFaceMode: "GL_BACK";
    frontFaceWinding: "not_modified_by_render_wrapper";
    particleEmitterOverride: "twosidedtex_live_read_after_render_wrapper";
    queueExitRestore: "state3_enabled_gl_back";
    source: "nwtoolset-1.5.0.5-scene-queue-cull-disassembly";
    binarySha256: "4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24";
  };
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
  source: "nwtoolset-1.5.0.5-mtr-framebuffer-pass-disassembly";
  exactGlState:
    | "confirmed_active_framebuffer_copy_and_texture_units_11_12"
    | "not_applicable_default_lane";
  captureScope: "mainscene_only" | "not_applicable";
  captureSource: "active_framebuffer_slot" | "not_applicable";
  captureDestinationSlot: 1 | 6 | null;
  attachmentBindingMask: 3 | null;
  colorTextureUnit: 11 | null;
  depthTextureUnit: 12 | null;
  binarySha256:
    | "4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24"
    | null;
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
  ageSeconds: number;
  lifetimeSeconds: number;
  linkedNextParticleId?: number;
  linkedNextPosition?: AuroraParticleRuntimeRecord["position"];
  verticesPerParticle: 6;
  vertexCount: 6;
  drawRoute: AuroraParticleDrawRoute;
  renderMode: AuroraParticleRenderModeRecord;
  blendMode: AuroraParticleBlendModeRecord;
  renderState: AuroraParticleRenderStateLane;
  renderOrder: AuroraParticleRenderOrderRecord;
  emitterOrientation?: AuroraMdlOrientation;
  particleOrientation?: AuroraParticleRuntimeRecord["particleOrientation"];
  position: AuroraParticleRuntimeRecord["position"];
  previousPosition?: AuroraParticleRuntimeRecord["previousPosition"];
  velocity: AuroraParticleRuntimeRecord["velocity"];
  direction?: AuroraParticleRuntimeRecord["direction"];
  landed: boolean;
  contactNormal?: AuroraParticleRuntimeRecord["contactNormal"];
  splat: boolean;
  inheritedVelocityMagnitude?: AuroraParticleRuntimeRecord["inheritedVelocityMagnitude"];
  inheritedVelocityDirection?: AuroraParticleRuntimeRecord["inheritedVelocityDirection"];
  inheritPart: boolean;
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
  directionStatus: "lower_value_first_contextual_tie_break_confirmed";
}

export interface AuroraTexturedQuadTopologyRecord {
  verticesPerParticle: 6;
  drawRoute: AuroraParticleDrawRoute;
  canonicalForChunkLane: false;
}

export interface AuroraChunkParticleRenderLane {
  lane: "chunk_model";
  chunkName?: string;
  modelAnimation: {
    animationName: "impact";
    playbackRate: 1;
    startPolicy: "once_on_particle_activation";
    rawArguments: {
      argumentAfterRate: 1;
      finalArgument: 0;
    };
    source: "nwtoolset-1.5.0.5-chunk-particle-init-disassembly";
    binarySha256: "4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24";
  };
  activeParticleCount: number;
  particleInstances: Array<{
    particleId: number;
    position: { x: number; y: number; z: number };
    rotationRadians: number;
    rotationAxis?: AuroraParticleRuntimeRecord["rotationAxis"];
    particleOrientation?: AuroraParticleRuntimeRecord["particleOrientation"];
    landed: boolean;
    contactNormal?: AuroraParticleRuntimeRecord["contactNormal"];
    scale: { x: number; y: number };
    ageSeconds: number;
    lifetimeSeconds: number;
    modelInstanceRef?: string;
    modelRuntimeStatus?: "active" | "released";
    modelRuntimeFrame?: AuroraVfxChildModelRuntimeFrame;
  }>;
  texturedQuadCanonical: false;
  collapseAttempted: boolean;
  resourceResolveStatus: "resolved" | "unresolved";
  resolvedResource?: AuroraChunkModelResolvedResource;
}

export type AuroraVfxChildParticleDrawFrame = Omit<
  AuroraParticleDrawRecord,
  | "recordKind"
  | "emitterNodeName"
  | "verticesPerParticle"
  | "vertexCount"
  | "drawRoute"
  | "renderMode"
  | "blendMode"
  | "renderState"
  | "renderOrder"
  | "atlasProvenance"
>;

export interface AuroraVfxChildModelRuntimeFrame {
  version: "aurora-vfx-child-model-runtime-frame/v1";
  modelInstanceRef: string;
  sourceModelObjectKey?: string;
  localClockSeconds: number;
  rngLineage: {
    algorithm: "nwn-ee-msvc-rand15";
    initialSeed: number;
    finalSeed: number;
  };
  runtimeEmitters: Array<{
    emitterIndex: number;
    emitterNodeName: string;
    selectedAnimation?: {
      animationName: string;
      previousTimeSeconds: number;
      currentTimeSeconds: number;
      blendWeight: number;
      playbackTickCount?: number;
      loop?: boolean;
    };
    runtimeState: {
      sourceClockSeconds: number;
      source: {
        nodeName: string;
        simulation?: Pick<
          NonNullable<AuroraMdlEmitterNode["simulation"]>,
          "inherit" | "inheritLocal" | "inheritPart"
        >;
      };
    };
    runtimeSnapshot: { activeParticleCount: number };
    renderContractFrame: {
      version: "aurora-vfx-child-render-contract-frame/v1";
      activeParticleCount: number;
      drawParticleCount: number;
      verticesPerDrawParticle: 0 | 6;
      drawVertexCount: number;
      drawLane: AuroraParticleDrawLane;
      compactDrawRecords: AuroraVfxChildParticleDrawFrame[];
      chunkLane?: AuroraChunkParticleRenderLane;
      progFxType4Light?: AuroraVfxProgFxType4LightRecord;
    };
  }>;
}

export interface AuroraChunkModelResolvedResource {
  requestedRef: string;
  resourceKey: string;
  sourceLayer: string;
  sourcePath?: string;
  hakName?: string;
  sourceHash?: string;
  resourceHash?: string;
  candidateId?: string;
  precedenceRank?: number;
  resolutionSource: "dependency-graph-selected-candidate";
}

export interface AuroraVfxPltRenderContext {
  status: "ready" | "missing_target_context";
  requestedTextureRef: string;
  selectedResourceKey?: string;
  targetRef?: string;
  paletteRowsByLayer?: Record<string, number>;
  profile?: string;
  provenance?: string;
  shaderLane: {
    vertexShader: "vs_pltgen";
    fragmentShader: "fs_pltgen";
    schemeUniformPattern: "PLTscheme[%d]";
    schemeUniformCount: 15;
  };
  proofStatus: "source-backed-contract-retail-visual-unverified";
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
  materialState?: AuroraVfxMaterialSourceState;
  renderState: AuroraParticleRenderStateLane;
  renderOrder: AuroraParticleRenderOrderRecord;
  progFxType4Light?: AuroraVfxProgFxType4LightRecord;
  pltRenderContext?: AuroraVfxPltRenderContext;
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
  materialState?: AuroraVfxMaterialSourceState;
  dependencyGraph?: AuroraVfxDependencyGraph;
  phaseSchedule?: AuroraVfxPhaseSchedule;
  progFxRows?: AuroraProgFxSourceRow[];
  collapseChunkToTextureLane?: boolean;
}

export interface AuroraVfxMaterialSourceState {
  source: "aurora-mtr";
  materialRef?: string;
  renderHint?: string;
  customShaderVS?: string;
  customShaderFS?: string;
  customShaderGS?: string;
  customShaderProgram?: AuroraShaderProgramSourceBundle;
  parameters?: AuroraMaterialShaderParameter[];
  transparency?: boolean;
  twoSided?: boolean;
  sampleFramebuffer?: number;
  volumetric?: boolean;
  bumpmaptexture?: string;
  bumpyshinytexture?: string;
  envmaptexture?: string;
  bumpreplacementtexture?: string;
  textureSlots?: Array<{
    slot: number;
    role: "diffuse" | "normal" | "specular" | "roughness" | "height" | "emissive" | "unknown";
    reference: string;
  }>;
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
  drawDirection: "lower_renderorder_first_when_primary_keys_tie";
  comparisonScope: "depth_and_referenced_object_keys_tie";
  source: "aurora-draw-item-comparator";
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
  const particlesById = new Map(
    runtimeState.particles.map((particle) => [particle.particleId, particle] as const)
  );
  const activeParticles = runtimeState.activeParticleIds.flatMap((particleId) => {
    const particle = particlesById.get(particleId);
    return particle ? [particle] : [];
  });
  const renderMode = resolveRenderMode(input.sourceEmitter);
  const blendMode = resolveBlendMode(input.sourceEmitter);
  const renderOrder = resolveRenderOrder(runtimeState, input.sourceEmitter);
  const renderState = buildRenderState(
    blendMode,
    runtimeState,
    input.sourceEmitter,
    input.materialState
  );
  const isChunkLane = isChunkParticleLane(input);
  const progFxType4Light = resolveProgFxType4LightRecord(input);
  const pltRenderContext = resolvePltRenderContext(input);
  const diagnostics: AuroraVfxDiagnostic[] = [
    ...runtimeState.diagnostics,
    ...runtimeState.lastTickDiagnostics,
    ...buildDrawRouteDiagnostics(),
    ...buildRenderStateDiagnostics(renderState, blendMode, input.materialState),
    ...buildMaterialStateBindingDiagnostics(input.materialState),
    ...buildMaterialSourceBoundaryDiagnostics(runtimeState, input.sourceEmitter),
    ...buildProgFxType4Diagnostics(progFxType4Light),
    ...buildPltRenderContextDiagnostics(pltRenderContext)
  ];

  if (isChunkLane) {
    diagnostics.push(
      renderDiagnostic(
        "VFX_CHUNK_MODEL_RESOURCE_CLASS_REQUIRED",
        "warn",
        "Chunk particles require the chunk-model lane and are not canonical textured six-vertex quads."
      ),
      renderDiagnostic(
        "VFX_CHUNK_MODEL_IMPACT_ANIMATION_START_CONFIRMED",
        "info",
        "Aurora initializes every live Chunk model by starting animation 'impact' once at particle activation with playback rate 1.0."
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
          linkedNextParticle: linked ? activeParticles[index + 1] : undefined,
          runtimeState,
          renderMode,
          blendMode,
          renderState,
          renderOrder
        })
      );
  const chunkName = input.sourceEmitter?.chunkName;
  const chunkResolvedResource = resolveChunkModelResolvedResource(
    input.dependencyGraph,
    chunkName
  );
  if (isChunkLane && chunkResolvedResource) {
    diagnostics.push(
      renderDiagnostic(
        "VFX_CHUNK_MODEL_RESOURCE_RESOLVED",
        "info",
        "Chunk particle lane preserved the resolved chunk-model dependency candidate for model-lane rendering."
      )
    );
  }

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
            modelAnimation: {
              animationName: "impact",
              playbackRate: 1,
              startPolicy: "once_on_particle_activation",
              rawArguments: {
                argumentAfterRate: 1,
                finalArgument: 0
              },
              source: "nwtoolset-1.5.0.5-chunk-particle-init-disassembly",
              binarySha256:
                "4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24"
            },
            activeParticleCount: activeParticles.length,
            particleInstances: activeParticles.map((particle) => ({
              particleId: particle.particleId,
              position: { ...particle.position },
              rotationRadians: particle.rotationRadians,
              ...(particle.rotationAxis ? { rotationAxis: { ...particle.rotationAxis } } : {}),
              ...(particle.particleOrientation
                ? {
                    particleOrientation: {
                      axis: [...particle.particleOrientation.axis],
                      angleRadians: particle.particleOrientation.angleRadians
                    }
                  }
                : {}),
              landed: particle.landed,
              ...(particle.contactNormal ? { contactNormal: { ...particle.contactNormal } } : {}),
              scale: { ...particle.size },
              ageSeconds: particle.ageSeconds,
              lifetimeSeconds: particle.lifetimeSeconds,
              ...(particle.chunkModelRuntimeRef
                ? {
                    modelInstanceRef: particle.chunkModelRuntimeRef.modelInstanceRef,
                    modelRuntimeStatus: particle.chunkModelRuntimeRef.status
                  }
                : {})
            })),
            texturedQuadCanonical: false,
            collapseAttempted: input.collapseChunkToTextureLane === true,
            resourceResolveStatus: chunkResolvedResource ? "resolved" : "unresolved",
            ...(chunkResolvedResource ? { resolvedResource: chunkResolvedResource } : {})
          }
        }
      : {}),
    renderMode,
    blendMode,
    ...(input.materialState ? { materialState: { ...input.materialState } } : {}),
    renderState,
    renderOrder,
    ...(progFxType4Light ? { progFxType4Light } : {}),
    ...(pltRenderContext ? { pltRenderContext } : {}),
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
    drawDirection: "lower_renderorder_first_when_primary_keys_tie",
    comparisonScope: "depth_and_referenced_object_keys_tie",
    source: "aurora-draw-item-comparator",
    diagnostics: [
      renderDiagnostic(
        "VFX_RENDERORDER_CONTEXTUAL_TIE_BREAK_CONFIRMED",
        "info",
        "Aurora compares lower signed renderorder values first only after the draw-item depth and referenced-object keys tie."
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

function resolvePltRenderContext(
  input: BuildAuroraVfxRenderContractInput
): AuroraVfxPltRenderContext | undefined {
  const emitter = input.sourceEmitter;
  if (!emitter) {
    return undefined;
  }
  const ownerSegment = `/emitter:${emitter.nodeName}/`;
  const textureEdge = input.dependencyGraph?.edges.find(
    (edge) =>
      edge.edgeType === "texture" &&
      (edge.ownerPath.includes(ownerSegment) ||
        edge.requestedRef.toLowerCase() === emitter.texture?.toLowerCase())
  );
  const requestedTextureRef =
    textureEdge?.requestedRef ?? emitter.textureRaw ?? emitter.texture ?? "";
  const selectedResourceKey = textureEdge?.selectedCandidate?.resourceKey;
  if (
    !/\.plt$/iu.test(requestedTextureRef) &&
    !(selectedResourceKey && /\.plt$/iu.test(selectedResourceKey))
  ) {
    return undefined;
  }

  const effectInstance = input.phaseSchedule?.effectInstance;
  const targetContext = effectInstance?.targetPltContext;
  const paletteRowsByLayer = normalizePltPaletteRows(targetContext?.paletteRowsByLayer);
  const profile = targetContext?.profile.trim();
  const provenance = targetContext?.provenance.trim();
  const ready = Boolean(
    effectInstance?.targetRef &&
      profile &&
      provenance &&
      Object.keys(paletteRowsByLayer).length > 0
  );
  return {
    status: ready ? "ready" : "missing_target_context",
    requestedTextureRef,
    ...(selectedResourceKey ? { selectedResourceKey } : {}),
    ...(effectInstance?.targetRef ? { targetRef: effectInstance.targetRef } : {}),
    ...(Object.keys(paletteRowsByLayer).length > 0 ? { paletteRowsByLayer } : {}),
    ...(profile ? { profile } : {}),
    ...(provenance ? { provenance } : {}),
    shaderLane: {
      vertexShader: "vs_pltgen",
      fragmentShader: "fs_pltgen",
      schemeUniformPattern: "PLTscheme[%d]",
      schemeUniformCount: 15
    },
    proofStatus: "source-backed-contract-retail-visual-unverified"
  };
}

function normalizePltPaletteRows(
  rows: Record<string, number> | undefined
): Record<string, number> {
  if (!rows) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(rows)
      .filter(([layer, row]) => /^\d+$/u.test(layer) && Number.isFinite(row) && row >= 0)
      .map(([layer, row]) => [String(Number.parseInt(layer, 10)), Math.trunc(row)])
      .sort(([left], [right]) => Number(left) - Number(right))
  );
}

function buildPltRenderContextDiagnostics(
  context: AuroraVfxPltRenderContext | undefined
): AuroraVfxDiagnostic[] {
  if (!context) {
    return [];
  }
  if (context.status === "ready") {
    return [
      renderDiagnostic(
        "VFX_PLT_TARGET_CONTEXT_PRESERVED",
        "info",
        "PLT rendering preserved the effect target, palette rows, EE profile, and the separate vs_pltgen/fs_pltgen lane; retail framebuffer parity remains unverified."
      )
    ];
  }
  return [
    renderDiagnostic(
      "VFX_PLT_TARGET_CONTEXT_REQUIRED",
      "warn",
      "The selected particle texture is PLT, but target-object palette rows/profile/provenance are incomplete. Aurora Web must not substitute default or guessed layer colors."
    )
  ];
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

function resolveChunkModelResolvedResource(
  dependencyGraph: AuroraVfxDependencyGraph | undefined,
  chunkName: string | undefined
): AuroraChunkModelResolvedResource | undefined {
  if (!dependencyGraph || !chunkName) {
    return undefined;
  }
  const normalizedChunkName = normalizeChunkModelResourceRef(chunkName);
  const edge = dependencyGraph.edges.find(
    (entry) =>
      entry.edgeType === "chunk_model" &&
      normalizeChunkModelResourceRef(entry.requestedRef) === normalizedChunkName &&
      entry.selectedCandidate
  );
  if (!edge?.selectedCandidate) {
    return undefined;
  }
  return toChunkModelResolvedResource(edge.requestedRef, edge.selectedCandidate);
}

function toChunkModelResolvedResource(
  requestedRef: string,
  candidate: AuroraVfxDependencyCandidate
): AuroraChunkModelResolvedResource {
  return {
    requestedRef,
    resourceKey: candidate.resourceKey,
    sourceLayer: candidate.sourceLayer,
    ...(candidate.sourcePath ? { sourcePath: candidate.sourcePath } : {}),
    ...(candidate.hakName ? { hakName: candidate.hakName } : {}),
    ...(candidate.sourceHash ? { sourceHash: candidate.sourceHash } : {}),
    ...(candidate.resourceHash ? { resourceHash: candidate.resourceHash } : {}),
    ...(candidate.candidateId ? { candidateId: candidate.candidateId } : {}),
    ...(typeof candidate.precedenceRank === "number"
      ? { precedenceRank: candidate.precedenceRank }
      : {}),
    resolutionSource: "dependency-graph-selected-candidate"
  };
}

function normalizeChunkModelResourceRef(value: string): string {
  return value
    .trim()
    .replace(/\\/gu, "/")
    .replace(/\.(mdl|mdb|glb|gltf)$/iu, "")
    .toLowerCase();
}

function buildParticleDrawRecord(input: {
  particle: AuroraParticleRuntimeRecord;
  particleIndex: number;
  linkedNextParticle?: AuroraParticleRuntimeRecord;
  runtimeState: AuroraEmitterRuntimeState;
  renderMode: AuroraParticleRenderModeRecord;
  blendMode: AuroraParticleBlendModeRecord;
  renderState: AuroraParticleRenderStateLane;
  renderOrder: AuroraParticleRenderOrderRecord;
}): AuroraParticleDrawRecord {
  const atlas = buildParticleAtlasUv(input.runtimeState, input.particle);
  const lane = input.linkedNextParticle ? "linked_textured_quad" : "textured_quad";
  return {
    recordKind: "aurora-particle-draw-record",
    drawRecordId: `${input.runtimeState.emitterNodeName}:particle:${input.particle.particleId}`,
    emitterNodeName: input.runtimeState.emitterNodeName,
    lane,
    particleId: input.particle.particleId,
    particleIndex: input.particleIndex,
    ageSeconds: input.particle.ageSeconds,
    lifetimeSeconds: input.particle.lifetimeSeconds,
    ...(input.linkedNextParticle
      ? {
          linkedNextParticleId: input.linkedNextParticle.particleId,
          linkedNextPosition: { ...input.linkedNextParticle.position }
        }
      : {}),
    verticesPerParticle: TEXTURED_QUAD_VERTICES_PER_PARTICLE,
    vertexCount: TEXTURED_QUAD_VERTICES_PER_PARTICLE,
    drawRoute: buildDrawRoute(),
    renderMode: input.renderMode,
    blendMode: input.blendMode,
    renderState: input.renderState,
    renderOrder: input.renderOrder,
    ...(input.runtimeState.source.transform?.orientation
      ? { emitterOrientation: { ...input.runtimeState.source.transform.orientation } }
      : {}),
    ...(input.particle.particleOrientation
      ? { particleOrientation: { ...input.particle.particleOrientation } }
      : {}),
    position: { ...input.particle.position },
    ...(input.particle.previousPosition
      ? { previousPosition: { ...input.particle.previousPosition } }
      : {}),
    velocity: { ...input.particle.velocity },
    ...(input.particle.direction ? { direction: { ...input.particle.direction } } : {}),
    landed: input.particle.landed,
    ...(input.particle.contactNormal
      ? { contactNormal: { ...input.particle.contactNormal } }
      : {}),
    splat: input.runtimeState.source.sourceState?.splat === true,
    ...(input.particle.inheritedVelocityMagnitude !== undefined
      ? { inheritedVelocityMagnitude: input.particle.inheritedVelocityMagnitude }
      : {}),
    ...(input.particle.inheritedVelocityDirection
      ? { inheritedVelocityDirection: { ...input.particle.inheritedVelocityDirection } }
      : {}),
    inheritPart: input.runtimeState.source.simulation?.inheritPart === true,
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

  // Aurora feeds the particle frame slot directly into row-major atlas math.
  // Out-of-range rows therefore remain out of range for the texture sampler;
  // wrapping them to another valid cell changes source-authored playback.
  const frameIndex = integerFrameIndex;
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
      case "normal":
        return "normal";
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
      exactGlBlendFactors: {
        status: "confirmed",
        sourceFactor: "GL_SRC_ALPHA",
        sourceFactorGlEnum: 0x0302,
        destinationFactor: "GL_ONE_MINUS_SRC_ALPHA",
        destinationFactorGlEnum: 0x0303,
        blendTableIndices: [0, 1],
        source: "nwtoolset-1.5.0.5-disassembly",
        binarySha256: "4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24"
      },
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
      exactGlBlendFactors: {
        status: "not_invoked_punch_through_lane",
        source: "aurora-particle-render-branch"
      },
      source: "mdl-emitter-blend-token"
    };
  }
  return {
    enum: "mode_2",
    rawToken,
    modeNumber: 2,
    exactGlBlendFactors: {
      status: "confirmed",
      sourceFactor: "GL_SRC_ALPHA",
      sourceFactorGlEnum: 0x0302,
      destinationFactor: "GL_ONE",
      destinationFactorGlEnum: 0x0001,
      blendTableIndices: [0, 2],
      source: "nwtoolset-1.5.0.5-disassembly",
      binarySha256: "4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24"
    },
    source: "mdl-emitter-blend-token"
  };
}

function buildRenderState(
  blendMode: AuroraParticleBlendModeRecord,
  runtimeState: AuroraEmitterRuntimeState,
  emitter: AuroraMdlEmitterNode | undefined,
  materialState: AuroraVfxMaterialSourceState | undefined
): AuroraParticleRenderStateLane {
  const isPunchThrough = blendMode.enum === "punch_through";
  const sourceTransparency = materialState?.transparency;
  const sourceOpaque = sourceTransparency === false && !isPunchThrough;
  const twoSidedTexture =
    runtimeState.source.sourceState?.twoSidedTexture ??
    emitter?.sourceState?.twoSidedTexture ??
    false;
  const volumetric = materialState?.volumetric === true;
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
    alphaDiscardLane: isPunchThrough
      ? "punch_through_runtime_uniform_0_2"
      : "non_punch_discard_compiled_out_variant",
    alphaDiscardValue: isPunchThrough ? 0.2 : null,
    alphaDiscardValueSource: isPunchThrough
      ? "nwtoolset-1.5.0.5-disassembly"
      : "not_applicable_compiled_out_variant",
    twoSidedTextureLane: twoSidedTexture
      ? "two_sided_texture_cull_disabled"
      : "default_cull_lane",
    sourceTransparencyLane: sourceOpaque
      ? "source_transparency_false_opaque_depth_write_lane"
      : "source_transparency_true_or_missing_blend_lane",
    twoSidedMaterialLane: buildTwoSidedMaterialLane(materialState, volumetric),
    framebufferLane: buildFramebufferRenderLane(materialState)
  };
}

function buildTwoSidedMaterialLane(
  materialState: AuroraVfxMaterialSourceState | undefined,
  volumetric: boolean
): AuroraParticleTwoSidedMaterialLane {
  const twoSidedMaterial = materialState?.twoSided === true;
  if (twoSidedMaterial && !volumetric) {
    return {
      twoSidedMaterial,
      volumetric,
      renderWrapperArgument: 1,
      lane: "two_sided_material_non_volumetric_runtime_arg1",
      source: "mtr-material-twosided-runtime-branch",
      exactGlState: buildTwoSidedMaterialGlState(1)
    };
  }
  if (twoSidedMaterial && volumetric) {
    return {
      twoSidedMaterial,
      volumetric,
      renderWrapperArgument: 0,
      lane: "two_sided_material_volumetric_runtime_arg0",
      source: "mtr-material-twosided-runtime-branch",
      exactGlState: buildTwoSidedMaterialGlState(0)
    };
  }
  return {
    twoSidedMaterial,
    volumetric,
    renderWrapperArgument: 0,
    lane: "default_material_sidedness_runtime_arg0",
    source: "mtr-material-twosided-runtime-branch",
    exactGlState: buildTwoSidedMaterialGlState(0)
  };
}

function buildTwoSidedMaterialGlState(
  renderWrapperArgument: 0 | 1
): AuroraParticleTwoSidedMaterialLane["exactGlState"] {
  return {
    state3CullFace: renderWrapperArgument === 1 ? "disabled" : "enabled",
    retainedCullFaceMode: "GL_BACK",
    frontFaceWinding: "not_modified_by_render_wrapper",
    particleEmitterOverride: "twosidedtex_live_read_after_render_wrapper",
    queueExitRestore: "state3_enabled_gl_back",
    source: "nwtoolset-1.5.0.5-scene-queue-cull-disassembly",
    binarySha256: "4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24"
  };
}

function buildFramebufferRenderLane(
  materialState: AuroraVfxMaterialSourceState | undefined
): AuroraParticleFramebufferRenderLane {
  const sampleFramebuffer = sanitizeSampleFramebuffer(materialState?.sampleFramebuffer);
  const volumetric = materialState?.volumetric === true;
  if (sampleFramebuffer === 2) {
    return {
      sampleFramebuffer,
      volumetric,
      runtimeLane: 6,
      lane: "sample_framebuffer_mode_2_runtime_lane_6",
      ...buildConfirmedFramebufferPassState(6)
    };
  }
  if (sampleFramebuffer === 1) {
    return {
      sampleFramebuffer,
      volumetric,
      runtimeLane: 5,
      lane: "sample_framebuffer_mode_1_runtime_lane_5",
      ...buildConfirmedFramebufferPassState(5)
    };
  }
  if (volumetric) {
    return {
      ...(sampleFramebuffer !== undefined ? { sampleFramebuffer } : {}),
      volumetric,
      runtimeLane: 5,
      lane: "volumetric_runtime_lane_5",
      ...buildConfirmedFramebufferPassState(5)
    };
  }
  return {
    ...(sampleFramebuffer !== undefined ? { sampleFramebuffer } : {}),
    volumetric,
    runtimeLane: null,
    lane: "default_framebuffer_runtime_lane",
    source: "nwtoolset-1.5.0.5-mtr-framebuffer-pass-disassembly",
    exactGlState: "not_applicable_default_lane",
    captureScope: "not_applicable",
    captureSource: "not_applicable",
    captureDestinationSlot: null,
    attachmentBindingMask: null,
    colorTextureUnit: null,
    depthTextureUnit: null,
    binarySha256: null
  };
}

function buildConfirmedFramebufferPassState(runtimeLane: 5 | 6) {
  return {
    source: "nwtoolset-1.5.0.5-mtr-framebuffer-pass-disassembly" as const,
    exactGlState: "confirmed_active_framebuffer_copy_and_texture_units_11_12" as const,
    captureScope: "mainscene_only" as const,
    captureSource: "active_framebuffer_slot" as const,
    captureDestinationSlot: runtimeLane === 5 ? (1 as const) : (6 as const),
    attachmentBindingMask: 3 as const,
    colorTextureUnit: 11 as const,
    depthTextureUnit: 12 as const,
    binarySha256:
      "4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24" as const
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
    directionStatus: "lower_value_first_contextual_tie_break_confirmed"
  };
}

function isChunkParticleLane(input: BuildAuroraVfxRenderContractInput): boolean {
  return (
    input.runtimeState.family === "Chunk" ||
    Boolean(input.sourceEmitter?.chunkName)
  );
}

function buildDrawRoute(): AuroraParticleDrawRoute {
  return {
    route: "non_indexed_draw_arrays",
    indexed: false,
    drawModeArgument: DRAW_MODE_ARGUMENT,
    drawModeArgumentSource: "aurora-draw-wrapper-mode-arg3",
    enumTableCaptured: true,
    glPrimitiveMode: "GL_TRIANGLES",
    glPrimitiveModeEnum: 0x0004,
    triangleListInferenceProof: "confirmed_draw_wrapper_table_index_3_gl_triangles",
    primitiveModeSource: "nwtoolset-1.5.0.5-disassembly",
    binarySha256:
      "4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24"
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
      "VFX_PARTICLE_DRAW_GL_TRIANGLES_CONFIRMED",
      "info",
      "Toolset draw-wrapper table index 3 resolves to GL_TRIANGLES (0x0004); particles use non-indexed glDrawArrays from vertex zero."
    )
  ];
}

function buildRenderStateDiagnostics(
  renderState: AuroraParticleRenderStateLane,
  blendMode: AuroraParticleBlendModeRecord,
  materialState: AuroraVfxMaterialSourceState | undefined
): AuroraVfxDiagnostic[] {
  const diagnostics = [
    blendMode.exactGlBlendFactors.status === "confirmed"
      ? renderDiagnostic(
          "VFX_BLEND_FUNC_FACTORS_CONFIRMED_NWTOOLSET_DISASSEMBLY",
          "info",
          `Aurora blend bucket ${blendMode.modeNumber} uses ${blendMode.exactGlBlendFactors.sourceFactor}/${blendMode.exactGlBlendFactors.destinationFactor} from the recovered nwtoolset.exe blend table.`
        )
      : renderDiagnostic(
          "VFX_PUNCH_THROUGH_BLEND_FUNC_NOT_INVOKED",
          "info",
          "Aurora Punch-Through uses its separate cutout/depth-write branch without invoking the non-punch blend-function wrapper."
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
  if (renderState.alphaDiscardLane === "punch_through_runtime_uniform_0_2") {
    diagnostics.push(
      renderDiagnostic(
        "VFX_PUNCH_THROUGH_RUNTIME_ALPHA_DISCARD_CONFIRMED",
        "info",
        "Retail Punch-Through selects the alpha-discard shader variant and uploads fAlphaDiscardValue=0.2 from renderer state 1."
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
        "Aurora render wrapper argument 1 disables state 3 (GL_CULL_FACE); a textured emitter can then override it from twosidedtex during its draw."
      )
    );
  } else if (renderState.twoSidedMaterialLane.lane === "two_sided_material_volumetric_runtime_arg0") {
    diagnostics.push(
      renderDiagnostic(
        "VFX_TWOSIDED_MATERIAL_VOLUMETRIC_ARG0_REQUIRED",
        "info",
        "Aurora checks twosided, but volumetric true keeps render wrapper argument 0 on the state-3-enabled GL_BACK queue lane."
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
        "VFX_SAMPLE_FRAMEBUFFER_RENDER_PASS_CONFIRMED",
        "info",
        `Aurora mainscene copies the active framebuffer into slot ${renderState.framebufferLane.captureDestinationSlot}, binds color/depth attachments on texture units 11/12, then renders runtime lane ${renderState.framebufferLane.runtimeLane}.`
      )
    );
  }
  if (
    materialState?.customShaderVS ||
    materialState?.customShaderFS ||
    materialState?.customShaderGS
  ) {
    if (materialState.customShaderProgram?.status === "complete") {
      diagnostics.push(
        renderDiagnostic(
          "VFX_MTR_CUSTOM_SHADER_SOURCE_GRAPH_READY",
          "info",
          `MTR custom shader source graph is complete with ${materialState.customShaderProgram.sources.length} reachable SHD resources.`
        )
      );
    } else if (materialState.customShaderProgram?.status === "incomplete") {
      diagnostics.push(
        renderDiagnostic(
          "VFX_MTR_CUSTOM_SHADER_SOURCE_GRAPH_INCOMPLETE",
          "warn",
          `MTR custom shader source graph is missing: ${materialState.customShaderProgram.unresolvedRefs.join(", ")}.`
        )
      );
    }
    diagnostics.push(
      renderDiagnostic(
        "VFX_MTR_CUSTOM_SHADER_PROGRAM_EXECUTION_REQUIRED",
        "warn",
        "MTR custom shader resrefs are preserved, but canonical execution requires the resolved retail shader sources and include graph."
      )
    );
  }
  if (materialState?.parameters?.length) {
    diagnostics.push(
      renderDiagnostic(
        "VFX_MTR_PARAMETER_PAYLOAD_PRESERVED",
        "info",
        `MTR material preserves ${materialState.parameters.length} authored custom shader parameter record(s) in source order.`
      )
    );
  }
  if (blendMode.enum === "mode_2") {
    diagnostics.push(
      renderDiagnostic(
        "VFX_PARTICLE_BLEND_MODE_2_RAW_PRESERVED",
        "info",
        "Blend bucket 2 uses confirmed GL_SRC_ALPHA/GL_ONE factors while preserving the raw source token; unknown bucket-2 literals are not renamed to Lighten."
      )
    );
  }
  return diagnostics;
}

function buildMaterialSourceBoundaryDiagnostics(
  runtimeState: AuroraEmitterRuntimeState,
  emitter: AuroraMdlEmitterNode | undefined
): AuroraVfxDiagnostic[] {
  const materialOnlyEmitterKeys = [
    "renderHintRaw",
    "customShaderVS",
    "customShaderFS",
    "customShaderGS",
    "transparency",
    "twoSidedMaterial",
    "sampleFramebuffer",
    "volumetric"
  ] as const;
  const sourceStates = [runtimeState.source.sourceState, emitter?.sourceState];
  const presentKeys = materialOnlyEmitterKeys.filter((key) =>
    sourceStates.some((state) => state?.[key] !== undefined)
  );
  if (presentKeys.length === 0) {
    return [];
  }
  return [
    renderDiagnostic(
      "VFX_MTR_FIELDS_ON_EMITTER_SOURCE_IGNORED",
      "warn",
      `Material-only fields on node emitter are preserved but ignored by canonical render state: ${presentKeys.join(
        ", "
      )}. Resolve an Aurora MTR materialState before applying them.`
    )
  ];
}

function buildMaterialStateBindingDiagnostics(
  materialState: AuroraVfxMaterialSourceState | undefined
): AuroraVfxDiagnostic[] {
  if (!materialState) {
    return [];
  }
  const textureReferences = [
    materialState.bumpmaptexture,
    materialState.bumpyshinytexture,
    materialState.envmaptexture,
    materialState.bumpreplacementtexture
  ].filter((reference): reference is string => Boolean(reference));
  return [
    renderDiagnostic(
      "VFX_MTR_MATERIAL_STATE_BOUND",
      "info",
      `Resolved Aurora MTR material state is bound to this render contract${
        materialState.materialRef ? ` from '${materialState.materialRef}'` : ""
      }.`
    ),
    ...(textureReferences.length > 0
      ? [
          renderDiagnostic(
            "VFX_MTR_REPLACEMENT_TEXTURE_REFERENCES_PRESERVED",
            "info",
            `Resolved Aurora MTR material preserves ${textureReferences.length} named replacement texture reference(s).`
          )
        ]
      : [])
  ];
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
