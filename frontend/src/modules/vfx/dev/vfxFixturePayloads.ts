import type { AuroraVfxPayload } from "../../scene/contracts";

export const DEV_VFX_DEFAULT_FIXTURE_ID =
  "vfx-retail-dm-visualeffect-row-68-duration-0";
export const DEV_VFX_TEXTURE_REFERENCE = "fx_canonical_fire";
export const DEV_VFX_CHUNK_MODEL_FIXTURE_RESOURCE_KEY =
  "progfx_type9_chunk_model_pending.local.glb";
export const DEV_VFX_ORACLE = "render-contract-local-diagnostic";

type DevVfxDrawLane = "textured_quad" | "linked_textured_quad" | "chunk_model";

export type DevVfxAnalysisFeature =
  | "explosion-detonate-particle-pair"
  | "fountain-atlas-particles"
  | "gravity-reference-arc"
  | "plt-layer-color-order"
  | "purple-pale-particle-pair"
  | "source-target-beam-segments"
  | "warm-turquoise-particle-pair";

export interface DevVfxAnalysisProfile {
  version: "aurora-vfx-analysis-profile/v1";
  features: readonly DevVfxAnalysisFeature[];
}

export interface DevVfxDiagnosticSceneProfile {
  version: "aurora-vfx-diagnostic-scene/v1";
  recipe: "cross-lane-light-probes";
}

interface DevProgFxType4LightFixture {
  rowId: number;
  label: string;
  animationRaw?: string;
  animation: string;
  animationParameterStatus?: string;
  animationKind: "light" | "vision";
  visionMode?: string;
  visionParameterStatus?: string;
  symbolicColor?: string;
  tokenRadiusMeters?: number;
  tokenRadiusProofStatus?: string;
  radiusMeters?: number;
  radiusProofStatus?: string;
  sourceMdlNodeName?: string;
  sourceMdlAnimation?: string;
  sourceMdlColor?: { r: number; g: number; b: number };
  sourceMdlColorSource?: string;
  sourceMdlColorProofStatus?: string;
  sourceMdlRadiusMeters?: number;
  sourceMdlRadiusFrames?: [number, number];
  sourceMdlRadiusSource?: string;
  sourceMdlRadiusProofStatus?: string;
  animationSpeedRaw?: string;
  animationSpeed: number;
  animationSpeedParameterStatus?: string;
  castShadowsRaw?: string;
  castShadows: boolean;
  castShadowParameterStatus?: string;
  priorityRaw?: string;
  priority: number;
  priorityParameterStatus?: string;
  proximitySuppressionRaw?: string;
  proximitySuppression: boolean;
  proximitySuppressionParameterStatus?: string;
  attachToSceneRaw?: string;
  attachToScene: boolean;
  sceneAttachmentParameterStatus?: string;
  modelRaw?: string;
  modelRef: string;
  modelParameterStatus?: string;
  unusedParam8Raw?: string;
  color: { r: number; g: number; b: number };
  proofStatus: string;
  parameterPreservationProofSource?: string;
  parameterPreservationProofStatus?: string;
  runtimeSchedulingStatus?: string;
  runtimeSchedulingProofSource?: string;
  runtimeSchedulingBlocker?: string;
  sceneAttachmentPolicyStatus?: string;
  proximitySuppressionPolicyStatus?: string;
  visionMutationPolicyStatus?: string;
  shadowPolicyStatus?: string;
  visualPreviewStatus?: string;
  ownerVisualEffectRowId?: number;
  ownerVisualEffectLabel?: string;
  ownerPhase?: string;
  ownerProgFxRef?: string;
  ownerEffectConstructorKind?: string;
  ownerDurationType?: string;
}

interface DevVfxFixtureDefinition {
  fixtureId: string;
  title: string;
  rowId: number;
  label: string;
  tableName?: string;
  tableHash?: string;
  sourceAuthority: string;
  constructorKind: string;
  applicationMode: string;
  rawInvocation: string;
  diagnosticScene?: DevVfxDiagnosticSceneProfile;
  analysisFeatures?: readonly DevVfxAnalysisFeature[];
  drawParticleCount?: number;
  activeParticleCount?: number;
  drawLane?: DevVfxDrawLane;
  chunkName?: string;
  chunkResourceKey?: string;
  chunkResourceLayer?: string;
  chunkResourcePath?: string;
  chunkResourceHash?: string;
  chunkResourceCandidateId?: string;
  linkedChain?: boolean;
  p2pGravity?: boolean;
  motionBlur?: boolean;
  beamEffect?: boolean;
  progFxType4Light?: DevProgFxType4LightFixture;
  progFxType4Requests?: readonly DevProgFxType4LightFixture[];
  fountainAtlas?: {
    textureRef: string;
    xgrid: number;
    ygrid: number;
    fps: number;
    frameStart: number;
    frameEnd: number;
    randomFrameStart: boolean;
  };
  punchMode2Lighten?: boolean;
  pltLayerColors?: readonly {
    layer: string;
    color: { r: number; g: number; b: number };
  }[];
  blendMode?: {
    enum: "normal" | "punch_through" | "lighten";
    rawToken: string;
    modeNumber: number;
  };
  durationType?: "instant" | "temporary";
  durationSeconds?: number;
  targetRef?: string | null;
  effectorRef?: string | null;
  bodyNode?: string | null;
  diagnostics?: readonly {
    bucket: "sourceRows" | "dependencyGraph" | "renderContract" | "payload";
    code: string;
    severity: "info" | "warn" | "error";
    message: string;
  }[];
  palette: readonly [
    { r: number; g: number; b: number },
    { r: number; g: number; b: number }
  ];
}

export interface DevVfxFixtureRequest {
  fixtureId?: string;
  timeSeconds?: number;
  seed?: number;
}

export interface DevVfxFixturePayloadResult {
  fixtureId: string;
  title: string;
  timeSeconds: number;
  seed: number;
  oracle: typeof DEV_VFX_ORACLE;
  comparisonResult: "local-visible";
  canonicalParityPromoted: false;
  textureReference: typeof DEV_VFX_TEXTURE_REFERENCE;
  diagnosticScene?: DevVfxDiagnosticSceneProfile;
  payload: AuroraVfxPayload;
}

const PROGFX_TYPE4_BLUE_5M_SOURCE_MDL_FACTS = {
  tokenRadiusMeters: 5,
  tokenRadiusProofStatus: "source-backed-progfx-param1-animation-token-radius",
  radiusMeters: 13.3,
  radiusProofStatus: "source-family-backed-fx_light_clr-mdl-animation-radius",
  sourceMdlNodeName: "AuroraLight01",
  sourceMdlAnimation: "Blue_5m",
  sourceMdlColor: { r: 0.5, g: 0.5, b: 1 },
  sourceMdlColorSource:
    "nwn_base.key fx_light_clr.mdl AuroraLight01 animation light-color controller type 76",
  sourceMdlColorProofStatus: "source-family-backed-fx_light_clr-mdl-animation-rgb",
  sourceMdlRadiusMeters: 13.3,
  sourceMdlRadiusFrames: [0, 13.3] as [number, number],
  sourceMdlRadiusSource:
    "nwn_base.key fx_light_clr.mdl AuroraLight01 animation radius controller type 88 frames 0 -> 13.3",
  sourceMdlRadiusProofStatus: "source-family-backed-fx_light_clr-mdl-animation-radius"
} as const;

const PROGFX_TYPE4_YELLOW_5M_SOURCE_MDL_FACTS = {
  tokenRadiusMeters: 5,
  tokenRadiusProofStatus: "source-backed-progfx-param1-animation-token-radius",
  radiusMeters: 13.3,
  radiusProofStatus: "source-family-backed-fx_light_clr-mdl-animation-radius",
  sourceMdlNodeName: "AuroraLight01",
  sourceMdlAnimation: "Yello_5m",
  sourceMdlColor: { r: 1, g: 1, b: 0.5 },
  sourceMdlColorSource:
    "nwn_base.key fx_light_clr.mdl AuroraLight01 animation light-color controller type 76",
  sourceMdlColorProofStatus: "source-family-backed-fx_light_clr-mdl-animation-rgb",
  sourceMdlRadiusMeters: 13.3,
  sourceMdlRadiusFrames: [0, 13.3] as [number, number],
  sourceMdlRadiusSource:
    "nwn_base.key fx_light_clr.mdl AuroraLight01 animation radius controller type 88 frames 0 -> 13.3",
  sourceMdlRadiusProofStatus: "source-family-backed-fx_light_clr-mdl-animation-radius"
} as const;

const PROGFX_TYPE4_BLIND_VISION_SOURCE_MDL_FACTS = {
  sourceMdlNodeName: "AuroraLight02",
  sourceMdlAnimation: "Blind_Vision",
  sourceMdlColor: { r: 0.3, g: 0.3, b: 0.3 },
  sourceMdlColorSource:
    "nwn_base.key fx_light_clr.mdl AuroraLight02 vision animation light-color controller type 76",
  sourceMdlColorProofStatus: "source-family-backed-fx_light_clr-mdl-animation-rgb",
  sourceMdlRadiusMeters: 7,
  sourceMdlRadiusFrames: [0, 7] as [number, number],
  sourceMdlRadiusSource:
    "nwn_base.key fx_light_clr.mdl AuroraLight02 vision animation radius controller type 88",
  sourceMdlRadiusProofStatus: "source-family-backed-fx_light_clr-mdl-animation-radius"
} as const;

const PROGFX_TYPE4_DARK_VISION_SOURCE_MDL_FACTS = {
  sourceMdlNodeName: "AuroraLight02",
  sourceMdlAnimation: "Dark_Vision",
  sourceMdlColor: { r: 0.3, g: 0.3, b: 0.4 },
  sourceMdlColorSource:
    "nwn_base.key fx_light_clr.mdl AuroraLight02 vision animation light-color controller type 76",
  sourceMdlColorProofStatus: "source-family-backed-fx_light_clr-mdl-animation-rgb",
  sourceMdlRadiusMeters: 15,
  sourceMdlRadiusFrames: [0, 15] as [number, number],
  sourceMdlRadiusSource:
    "nwn_base.key fx_light_clr.mdl AuroraLight02 Dark_Vision radius controller type 88",
  sourceMdlRadiusProofStatus: "source-family-backed-fx_light_clr-mdl-animation-radius"
} as const;

const PROGFX_TYPE4_RUNTIME_SCHEDULING_PROOF_SOURCE =
  "nwn_base.key progfx.2da Type 4 Param1..Param7 rows are table-backed and raw-preserved; " +
  "backend/scripts/audit-retail-progfx-type4-table.ts over retail nwn_base.key reports progfx rowCount=1301, type4RowCount=68, itemLightNormalRowCount=28, itemLightFadeRowCount=28, nonItemType4RowCount=12, animationKindCounts light=56 vision=10 unknown=2, Param3 castShadows true=42 false=26, Param4 priorityRawCounts 13=2/20=56/49..53=2 each, Param5 proximity true=8 false=60, Param6 attachToScene true=2 false=66, modelCounts fx_light_clr=68, nonItemRows=[328,329,330,331,332,333,378,379,380,381,382,383], nonItemCastShadowRows=[], proximityRows=[328,329,330,332,378,379,380,382], attachRows=[333,383], visionRows=[328,329,330,331,333,378,379,380,381,383], and proofStatus=source-backed-progfx-type4-table-parameter-distribution-runtime-scheduler-blocked; " +
  "C:/Projects/New Folder/export/decompiled_all.c:348244 loads visualeffects.2da; source-only progfxType4SourceSchedulerEvidence proofStatus=source-backed-visualeffects-loader-progfx-type4-scheduler-not-in-source-only-decompilation reports runtimeSchedulerStringHitCount=0 and schedulerStringHits=[] for progfx.2da/fx_light_clr/Blind_Vision/Param3-6 scheduler needles; localResourceDumpEvidence proofStatus=source-backed-local-reference-root-lacks-progfx-type4-scheduler-resource-dump reports missingResourceNames=[progfx.2da,visualeffects.2da,fx_light_clr.mdl,fx_light_clr.mdb] in the available C:/Projects/New Folder dump; backend/scripts/audit-retail-light-function-disasm.py recovers OnApplyVisualEffect/OnRemoveVisualEffect object-level looping VFX owner add/remove through CNWSObject+0x160/+0x168, CNWSMessage last-update copy/diff through CLastUpdateObject+0x108/CNWSObject+0x160, CNWSMessage game-object update serialization, and nwmain.exe clientVisualEffectReceiveRenderEvidence proofStatus=source-backed-cnwcmessage-client-vfx-receive-vtable-add-newcaurobject-mdl-gob-light-path; clientObjectVisualEffectLifecycle proofStatus=source-backed-client-object-add-remove-refresh-looping-vfx-path; visualEffectSourceModelLoaders proofStatus=source-backed-client-vfx-loadvisualeffect-newcaurobject-model-loader-path with LoadVisualEffect-progfx-source-loader 0x14096cf10, fx-light-loader-region 0x14096c610, fx_light string refs, and NewCAurObject/Gob creation; current capstone-free fallback now reports clientVisualEffectReceiveRenderEvidence proofStatus=source-backed-capstone-free-cnwcmessage-client-vfx-callgraph-vtable-loader-path-scheduler-dataflow-blocked, messageDispatchChain proofStatus=source-backed-capstone-free-cnwcmessage-client-vfx-update-dispatch-chain, clientKnownFunctionCallgraph proofStatus=source-backed-capstone-free-client-vfx-message-owner-loader-callgraph, missingExpectedDirectCallTargets=[], clientVisualEffectSchedulerDataFlowProofStatus=blocked-capstone-free-callgraph-proves-vfx-loader-object-attach-not-progfx-param-scheduler-dataflow; capstoneFreeCallTargetEvidence proofStatus=capstone-free-binary-relative-call-target-scan-ran, clientVisualEffectDirectCallXrefCount=1502, clientVisualEffectObservedTargetFamilies=[message-readers,visual-transform-reader,looping-vfx-list-attach,progfx-source-loader,vfx-2da-row-loader,fx-light-loader-region,aurora-object-gob-construction,runtime-state-scene-helpers], legacyDirectCallScanSchedulerStatus=blocked-direct-call-targets-show-vfx-loader-object-attach-not-progfx-param-scheduler-dataflow, top direct target groups ReadBYTE=416, ReadFLOAT=297, object-id-read=174, ReadWORD=156, NewCAurObject=116, AddTail=57, plus string hits for ProgFX_Impact/ProgFX_Duration/ProgFX_Cessation/fx_light, but cannot recover Param3/4/5/6 scheduler data-flow; generic MDL AuroraLight PartLight creation remains source-backed through MdlNodeLight::InternalCreateInstance; Beamdog patch 8193.15 documents progfx.2da unhardcoding but not priority/proximity/shadow runtime semantics";
const PROGFX_TYPE4_DOCS_POLICY_SOURCE =
  "nwn.wiki progfx.2da Type 4 docs updated 2026-02-18 documents Param4 priority lower value wins and 0 always applies, Param5 proximity suppression near another light source, Param6 Beamdog Attach to scene removal of scene lights while the effect is active, and Type 4 vision/light rows using fx_light_clr Param1 animations; Beamdog patch 8193.15 documents progfx.2da unhardcoding";
const PROGFX_TYPE4_VISUALEFFECT_OWNER_PROOF_SOURCE =
  "backend/scripts/audit-retail-progfx-type4-table.ts also maps retail visualeffects.2da owner phases: type4OwnerPhaseCount=77, itemLightOwnerPhaseCount=56, nonItemOwnerPhaseCount=21, ownerPhaseCounts impact=0 duration=39 cessation=38, nonItemCastShadowOwnerPhaseCount=0, nonItemAttachToSceneOwnerPhaseCount=1, nonItemProximitySuppressionOwnerPhaseCount=18, nonItemOwnerLabels=[VFX_DUR_BLACKOUT,VFX_DUR_DARKVISION,VFX_FNF_SOUND_BURST,VFX_FNF_STRIKE_HOLY,VFX_DUR_BLINDVISION,VFX_DUR_LOWLIGHTVISION,VFX_DUR_ULTRAVISION,VFX_DUR_BLIND,VFX_FNF_SOUND_BURST_SILENT,VFX_FNF_TELEPORT_IN,VFX_FNF_TELEPORT_OUT], proofStatus=source-backed-visualeffects-progfx-type4-owner-phase-map-runtime-scheduler-blocked";
const PROGFX_TYPE4_RUNTIME_SCHEDULING_FULL_PROOF_SOURCE = `${PROGFX_TYPE4_RUNTIME_SCHEDULING_PROOF_SOURCE}; ${PROGFX_TYPE4_VISUALEFFECT_OWNER_PROOF_SOURCE}; ${PROGFX_TYPE4_DOCS_POLICY_SOURCE}`;
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
const PROGFX_TYPE4_PARAMETER_PRESERVATION_PROOF_SOURCE =
  "nwn_base.key progfx.2da selected rows 300..333 and 350..377 preserve Type 4 Param1..Param7; backend parser keeps raw Param1..Param8 cells before runtime scheduling";
const PROGFX_TYPE4_PARAMETER_PRESERVATION_PROOF_STATUS =
  "source-backed-progfx-type4-param1-param8-raw-preserved";
const PROGFX_TYPE4_PARAM1_ANIMATION_STATUS =
  "source-backed-progfx-type4-param1-animation-token-preserved";
const PROGFX_TYPE4_PARAM2_SPEED_STATUS =
  "source-backed-progfx-type4-param2-animation-speed-preserved-runtime-playback-blocked";
const PROGFX_TYPE4_PARAM3_CAST_SHADOW_STATUS =
  "source-backed-progfx-type4-param3-cast-shadows-preserved-item-toggle-known-non-item-vanilla-cast-shadow-absent";
const PROGFX_TYPE4_PARAM4_PRIORITY_STATUS =
  "docs-backed-progfx-type4-param4-priority-lower-value-wins";
const PROGFX_TYPE4_PARAM5_PROXIMITY_STATUS =
  "docs-backed-progfx-type4-param5-proximity-suppression-near-other-light";
const PROGFX_TYPE4_PARAM6_ATTACH_STATUS =
  "docs-backed-progfx-type4-param6-attach-to-scene-removes-scene-lights";
const PROGFX_TYPE4_PARAM7_MODEL_STATUS =
  "source-backed-progfx-type4-param7-model-ref-preserved-client-loader-path-source-backed";
const PROGFX_TYPE4_PARAM1_VISION_STATUS =
  "docs-backed-progfx-type4-param1-vision-token-param4-priority";

const DEV_VFX_FIXTURES: readonly DevVfxFixtureDefinition[] = [
  {
    fixtureId: DEV_VFX_DEFAULT_FIXTURE_ID,
    title: "dm_visualeffect 68 0 / VFX_IMP_HEALING_M",
    rowId: 68,
    label: "VFX_IMP_HEALING_M",
    sourceAuthority: "selectedSource2da",
    constructorKind: "dm_visualeffect",
    applicationMode: "object",
    rawInvocation: "dm_visualeffect 68 0",
    analysisFeatures: ["warm-turquoise-particle-pair"],
    palette: [
      { r: 1, g: 0.35, b: 0.22 },
      { r: 0.28, g: 0.95, b: 0.82 }
    ]
  },
  {
    fixtureId: "vfx-retail-scripted-effectvisualeffect-row-50",
    title: "Scripted EffectVisualEffect(VFX_IMP_DEATH)",
    rowId: 50,
    label: "VFX_IMP_DEATH",
    sourceAuthority: "selectedSource2da",
    constructorKind: "EffectVisualEffect",
    applicationMode: "object",
    rawInvocation:
      "ApplyEffectToObject(DURATION_TYPE_INSTANT, EffectVisualEffect(VFX_IMP_DEATH), oTarget);",
    analysisFeatures: ["purple-pale-particle-pair"],
    palette: [
      { r: 0.72, g: 0.5, b: 1 },
      { r: 0.9, g: 0.9, b: 1 }
    ]
  },
  {
    fixtureId: "vfx-retail-scripted-effectbeam-row-210-body-chest",
    title: "Scripted EffectBeam(VFX_BEAM_FIRE, BODY_NODE_CHEST)",
    rowId: 210,
    label: "VFX_BEAM_FIRE",
    sourceAuthority: "selectedSource2da",
    constructorKind: "EffectBeam",
    applicationMode: "object",
    rawInvocation:
      "ApplyEffectToObject(DURATION_TYPE_TEMPORARY, EffectBeam(VFX_BEAM_FIRE, oSource, BODY_NODE_CHEST), oTarget, 3.0);",
    durationType: "temporary",
    durationSeconds: 3,
    targetRef: "retail-beam-target",
    effectorRef: "retail-beam-source",
    bodyNode: "BODY_NODE_CHEST",
    drawParticleCount: 5,
    beamEffect: true,
    analysisFeatures: ["source-target-beam-segments"],
    diagnostics: [
      {
        bucket: "sourceRows",
        code: "VFX_BEAM_SELECTED_SOURCE_ROW_DIAGNOSTIC_ONLY",
        severity: "warn",
        message:
          "EffectBeam row 210 is represented as a local diagnostic until retail source/target/body-node runtime evidence is supplied."
      },
      {
        bucket: "renderContract",
        code: "VFX_DEV_EFFECTBEAM_CONTEXT_DIAGNOSTIC_ONLY",
        severity: "warn",
        message:
          "Dev fixture draws a source-target beam proxy from render-contract context; it is not Aurora retail beam-volume rendering."
      },
      {
        bucket: "payload",
        code: "VFX_EFFECTBEAM_RETAIL_CONTEXT_REQUIRED",
        severity: "warn",
        message:
          "Canonical EffectBeam parity requires retail source object, target object, BODY_NODE_CHEST anchoring, runtime ticks, render contract, capture, and comparison evidence."
      }
    ],
    palette: [
      { r: 1, g: 0.34, b: 0.08 },
      { r: 1, g: 0.88, b: 0.24 }
    ]
  },
  {
    fixtureId: "vfx-retail-explosion-detonate-fireball",
    title: "Explosion emitter with explicit detonate event",
    rowId: 22,
    label: "VFX_FNF_FIREBALL",
    sourceAuthority: "selectedSource2da-candidate",
    constructorKind: "EffectVisualEffect",
    applicationMode: "location",
    rawInvocation: "EffectVisualEffect(VFX_FNF_FIREBALL) plus MDL animation event detonate",
    analysisFeatures: ["explosion-detonate-particle-pair"],
    palette: [
      { r: 1, g: 0.68, b: 0.18 },
      { r: 1, g: 0.18, b: 0.1 }
    ]
  },
  {
    fixtureId: "vfx-retail-fountain-atlas-cot-fx01",
    title: "cot_fx01 local Fountain atlas diagnostic",
    rowId: 1001,
    label: "cot_fx01/fire!03",
    sourceAuthority: "localUntrackedMdlCandidate",
    constructorKind: "MDL_EMITTER",
    applicationMode: "source_only",
    rawInvocation:
      "backend/tmp_cot_fx01.mdl emitter fire!03 Fountain atlas xgrid/ygrid/fps/framestart/frameend/random",
    drawParticleCount: 6,
    analysisFeatures: ["fountain-atlas-particles"],
    fountainAtlas: {
      textureRef: "fx_canonical_fire",
      xgrid: 4,
      ygrid: 4,
      fps: 12,
      frameStart: 0,
      frameEnd: 15,
      randomFrameStart: true
    },
    palette: [
      { r: 0.35, g: 0.9, b: 1 },
      { r: 1, g: 0.76, b: 0.24 }
    ]
  },
  {
    fixtureId: "vfx-retail-chunk-particles-progfx-type9",
    title: "Chunk particles / progfx Type 9 local diagnostic",
    rowId: 9009,
    label: "progfx_type9_chunk_diagnostic",
    tableName: "progfx.2da",
    tableHash: "A570A8F97F7CA238BCFC7C91E4F229F597C51EC581382BE2404B1B0B3289E54F",
    sourceAuthority: "selectedSource2da-type-distribution",
    constructorKind: "MDL_EMITTER",
    applicationMode: "source_only",
    rawInvocation: "Chunk emitter/progFX Type 9 retail fixture required",
    activeParticleCount: 2,
    drawParticleCount: 0,
    drawLane: "chunk_model",
    chunkName: "progfx_type9_chunk_model_pending",
    chunkResourceKey: DEV_VFX_CHUNK_MODEL_FIXTURE_RESOURCE_KEY,
    chunkResourceLayer: "dev-fixture-local-template",
    chunkResourcePath:
      "frontend/src/modules/vfx/dev/VfxFixtureRunner.tsx#createFixtureChunkModelTemplates",
    chunkResourceHash: "local-template-no-retail-resource-hash",
    chunkResourceCandidateId: "dev-fixture:progfx-type9-local-template",
    diagnostics: [
      {
        bucket: "sourceRows",
        code: "VFX_PROGFX_TYPE9_SELECTED_SOURCE_DISTRIBUTION_ONLY",
        severity: "warn",
        message:
          "progfx Type 9 is represented by selected-source type distribution only; no admitted row/resource candidate is present."
      },
      {
        bucket: "dependencyGraph",
        code: "VFX_CHUNK_MODEL_RETAIL_RESOURCE_REQUIRED",
        severity: "warn",
        message:
          "Chunk-particle lane uses a local model-template candidate; retail resource dump and Toolset/NWN comparison are still required before canonical parity can be claimed."
      },
      {
        bucket: "renderContract",
        code: "VFX_DEV_CHUNK_LANE_DIAGNOSTIC_ONLY",
        severity: "warn",
        message:
          "Dev fixture preserves chunk-model lane selection with a diagnostic placeholder and zero fake particle draws."
      }
    ],
    palette: [
      { r: 1, g: 0.7, b: 0.28 },
      { r: 1, g: 0.4, b: 0.12 }
    ]
  },
  {
    fixtureId: "vfx-retail-progfx-type4-blue-5m-light",
    title: "ProgFX Type 4 / LightBlue5m source-lane diagnostic",
    rowId: 304,
    label: "LightBlue5m",
    tableName: "progfx.2da",
    sourceAuthority: "selectedSource2da-progfx-type4-light",
    constructorKind: "ProgFX_Type4",
    applicationMode: "object",
    rawInvocation:
      "visualeffects.2da ProgFX_Duration -> progfx.2da row 304 LightBlue5m / Blue_5m",
    drawParticleCount: 3,
    progFxType4Light: {
      rowId: 304,
      label: "LightBlue5m",
      animation: "Blue_5m",
      animationKind: "light",
      symbolicColor: "Blue",
      ...PROGFX_TYPE4_BLUE_5M_SOURCE_MDL_FACTS,
      animationSpeed: 1,
      castShadows: false,
      priority: 20,
      proximitySuppression: false,
      attachToScene: false,
      modelRef: "fx_light_clr",
      color: PROGFX_TYPE4_BLUE_5M_SOURCE_MDL_FACTS.sourceMdlColor,
      proofStatus:
        "source-backed-progfx-type4-light-lane-not-placeable-not-mdl-runtime-scheduling-unverified"
    },
    diagnostics: [
      {
        bucket: "sourceRows",
        code: "VFX_PROGFX_TYPE4_LIGHT_SOURCE_LANE_PRESERVED",
        severity: "info",
        message:
          "progfx.2da Type 4 light row is preserved as a client light/vision lane distinct from placeables.2da LightColor and MDL node light payloads."
      },
      {
        bucket: "dependencyGraph",
        code: "VFX_PROGFX_TYPE4_OWNER_VISUALEFFECTS_PHASE_REQUIRED",
        severity: "warn",
        message:
          "Runtime scheduling requires the owning visualeffects.2da phase and effect-instance context before canonical light behavior can be promoted."
      },
      {
        bucket: "renderContract",
        code: "VFX_DEV_PROGFX_TYPE4_LIGHT_DIAGNOSTIC_ONLY",
        severity: "warn",
        message:
          "Dev fixture draws a source-colored local diagnostic for ProgFX Type 4; it is not Aurora retail light projection."
      },
      {
        bucket: "payload",
        code: "VFX_PROGFX_TYPE4_RETAIL_RUNTIME_REQUIRED",
        severity: "warn",
        message:
          "Canonical ProgFX Type 4 parity requires retail/effect-instance runtime proof for priority, proximity suppression, scene attachment, vision mutation, and cross-lane ordering."
      }
    ],
    palette: [
      PROGFX_TYPE4_BLUE_5M_SOURCE_MDL_FACTS.sourceMdlColor,
      { r: 0.08, g: 0.18, b: 0.72 }
    ]
  },
  {
    fixtureId: "vfx-retail-progfx-type4-blue-5m-owner-phase",
    title: "ProgFX Type 4 / VFX_DUR_LIGHT_BLUE_5 owner-phase diagnostic",
    rowId: 153,
    label: "VFX_DUR_LIGHT_BLUE_5",
    tableName: "visualeffects.2da",
    sourceAuthority: "selectedSource2da-visualeffects-progfx-type4-owner-phase",
    constructorKind: "EffectVisualEffect",
    applicationMode: "object",
    rawInvocation:
      "visualeffects.2da row 153 VFX_DUR_LIGHT_BLUE_5 duration -> progfx.2da row 304 LightBlue5m / Blue_5m",
    drawParticleCount: 3,
    progFxType4Light: {
      rowId: 304,
      label: "LightBlue5m",
      animation: "Blue_5m",
      animationKind: "light",
      symbolicColor: "Blue",
      ...PROGFX_TYPE4_BLUE_5M_SOURCE_MDL_FACTS,
      animationSpeed: 1,
      castShadows: false,
      priority: 20,
      proximitySuppression: false,
      attachToScene: false,
      modelRef: "fx_light_clr",
      color: PROGFX_TYPE4_BLUE_5M_SOURCE_MDL_FACTS.sourceMdlColor,
      proofStatus:
        "source-backed-progfx-type4-owner-phase-effect-instance-runtime-retail-unverified",
      runtimeSchedulingStatus:
        "source-backed-owner-phase-effect-instance-ready-retail-runtime-unverified",
      visualPreviewStatus: "backend-render-contract-source-record-no-scene-light",
      ownerVisualEffectRowId: 153,
      ownerVisualEffectLabel: "VFX_DUR_LIGHT_BLUE_5",
      ownerPhase: "duration",
      ownerProgFxRef: "304",
      ownerEffectConstructorKind: "EffectVisualEffect",
      ownerDurationType: "temporary"
    },
    diagnostics: [
      {
        bucket: "sourceRows",
        code: "VFX_PROGFX_TYPE4_OWNER_PHASE_EFFECT_INSTANCE_READY",
        severity: "info",
        message:
          "visualeffects.2da owner phase points at a matching progfx.2da Type 4 light row."
      },
      {
        bucket: "renderContract",
        code: "VFX_PROGFX_TYPE4_RENDER_CONTRACT_NO_POINTLIGHT",
        severity: "warn",
        message:
          "ProgFX Type 4 owner-phase evidence is preserved, but no generic PointLight is created without retail runtime validation."
      },
      {
        bucket: "payload",
        code: "VFX_PROGFX_TYPE4_RETAIL_RUNTIME_REQUIRED",
        severity: "warn",
        message:
          "Canonical ProgFX Type 4 parity still requires retail proof for priority, proximity suppression, scene attachment, vision mutation, and cross-lane ordering."
      }
    ],
    palette: [
      PROGFX_TYPE4_BLUE_5M_SOURCE_MDL_FACTS.sourceMdlColor,
      { r: 0.08, g: 0.18, b: 0.72 }
    ]
  },
  {
    fixtureId: "vfx-retail-progfx-type4-blind-vision-owner-phase",
    title: "ProgFX Type 4 / VFX_DUR_BLINDVISION owner-phase diagnostic",
    rowId: 242,
    label: "VFX_DUR_BLINDVISION",
    tableName: "visualeffects.2da",
    sourceAuthority: "selectedSource2da-visualeffects-progfx-type4-owner-phase",
    constructorKind: "EffectVisualEffect",
    applicationMode: "object",
    rawInvocation:
      "visualeffects.2da row 242 VFX_DUR_BLINDVISION duration -> progfx.2da row 329 LightBlindvision / Blind_Vision",
    drawParticleCount: 3,
    progFxType4Light: {
      rowId: 329,
      label: "LightBlindvision",
      animation: "Blind_Vision",
      animationKind: "vision",
      visionMode: "Blind_Vision",
      animationSpeed: 1,
      castShadows: false,
      priority: 53,
      proximitySuppression: true,
      attachToScene: false,
      modelRef: "fx_light_clr",
      ...PROGFX_TYPE4_BLIND_VISION_SOURCE_MDL_FACTS,
      color: { r: 0.1, g: 0.18, b: 0.42 },
      proofStatus:
        "source-backed-progfx-type4-owner-phase-effect-instance-runtime-retail-unverified",
      runtimeSchedulingStatus:
        "source-backed-owner-phase-effect-instance-ready-retail-runtime-unverified",
      visualPreviewStatus: "backend-render-contract-source-record-no-scene-light",
      ownerVisualEffectRowId: 242,
      ownerVisualEffectLabel: "VFX_DUR_BLINDVISION",
      ownerPhase: "duration",
      ownerProgFxRef: "329",
      ownerEffectConstructorKind: "EffectVisualEffect",
      ownerDurationType: "temporary"
    },
    diagnostics: [
      {
        bucket: "sourceRows",
        code: "VFX_PROGFX_TYPE4_OWNER_PHASE_EFFECT_INSTANCE_READY",
        severity: "info",
        message:
          "visualeffects.2da owner phase points at a matching progfx.2da Type 4 vision row."
      },
      {
        bucket: "renderContract",
        code: "VFX_PROGFX_TYPE4_RENDER_CONTRACT_NO_POINTLIGHT",
        severity: "warn",
        message:
          "ProgFX Type 4 vision-mode evidence is preserved, but no generic PointLight is created without retail runtime validation."
      },
      {
        bucket: "payload",
        code: "VFX_PROGFX_TYPE4_RETAIL_RUNTIME_REQUIRED",
        severity: "warn",
        message:
          "Canonical ProgFX Type 4 vision parity still requires retail proof for scheduling, vision mutation, scene attachment, proximity suppression, and cross-lane ordering."
      }
    ],
    palette: [
      { r: 0.1, g: 0.18, b: 0.42 },
      { r: 0.22, g: 0.36, b: 0.78 }
    ]
  },
  {
    fixtureId: "vfx-retail-progfx-type4-multi-request-policy",
    title: "ProgFX Type 4 / multi-request scheduler policy diagnostic",
    rowId: 5,
    label:
      "VFX_DUR_BLACKOUT + VFX_DUR_LIGHT_BLUE_5 + VFX_DUR_LIGHT_YELLOW_5 + VFX_DUR_DARKVISION",
    tableName: "visualeffects.2da",
    sourceAuthority: "retail-key-bif-visualeffects-progfx-type4-multi-request-policy",
    constructorKind: "EffectVisualEffect",
    applicationMode: "object",
    rawInvocation:
      "retail visualeffects.2da owner samples: row 5 duration -> progfx row 333, row 153 duration -> row 304, row 157 duration -> row 308, row 182 duration -> row 328",
    drawParticleCount: 4,
    progFxType4Light: {
      rowId: 333,
      label: "LightAreaBlackout",
      animation: "Blind_Vision",
      animationKind: "vision",
      visionMode: "Blind_Vision",
      animationSpeed: 1,
      castShadows: false,
      priority: 13,
      proximitySuppression: false,
      attachToScene: true,
      modelRef: "fx_light_clr",
      ...PROGFX_TYPE4_BLIND_VISION_SOURCE_MDL_FACTS,
      color: { r: 0.05, g: 0.08, b: 0.16 },
      proofStatus:
        "source-backed-progfx-type4-owner-phase-effect-instance-runtime-retail-unverified",
      runtimeSchedulingStatus:
        "source-backed-owner-phase-effect-instance-ready-retail-runtime-unverified",
      visualPreviewStatus: "backend-render-contract-source-record-no-scene-light",
      ownerVisualEffectRowId: 5,
      ownerVisualEffectLabel: "VFX_DUR_BLACKOUT",
      ownerPhase: "duration",
      ownerProgFxRef: "333",
      ownerEffectConstructorKind: "EffectVisualEffect",
      ownerDurationType: "temporary"
    },
    progFxType4Requests: [
      {
        rowId: 333,
        label: "LightAreaBlackout",
        animation: "Blind_Vision",
        animationKind: "vision",
        visionMode: "Blind_Vision",
        animationSpeed: 1,
        castShadows: false,
        priority: 13,
        proximitySuppression: false,
        attachToScene: true,
        modelRef: "fx_light_clr",
        ...PROGFX_TYPE4_BLIND_VISION_SOURCE_MDL_FACTS,
        color: { r: 0.05, g: 0.08, b: 0.16 },
        proofStatus:
          "source-backed-progfx-type4-owner-phase-effect-instance-runtime-retail-unverified",
        runtimeSchedulingStatus:
          "source-backed-owner-phase-effect-instance-ready-retail-runtime-unverified",
        visualPreviewStatus: "backend-render-contract-source-record-no-scene-light",
        ownerVisualEffectRowId: 5,
        ownerVisualEffectLabel: "VFX_DUR_BLACKOUT",
        ownerPhase: "duration",
        ownerProgFxRef: "333",
        ownerEffectConstructorKind: "EffectVisualEffect",
        ownerDurationType: "temporary"
      },
      {
        rowId: 304,
        label: "LightBlue5m",
        animation: "Blue_5m",
        animationKind: "light",
        symbolicColor: "Blue",
        ...PROGFX_TYPE4_BLUE_5M_SOURCE_MDL_FACTS,
        animationSpeed: 1,
        castShadows: false,
        priority: 20,
        proximitySuppression: false,
        attachToScene: false,
        modelRef: "fx_light_clr",
        color: PROGFX_TYPE4_BLUE_5M_SOURCE_MDL_FACTS.sourceMdlColor,
        proofStatus:
          "source-backed-progfx-type4-owner-phase-effect-instance-runtime-retail-unverified",
        runtimeSchedulingStatus:
          "source-backed-owner-phase-effect-instance-ready-retail-runtime-unverified",
        visualPreviewStatus: "backend-render-contract-source-record-no-scene-light",
        ownerVisualEffectRowId: 153,
        ownerVisualEffectLabel: "VFX_DUR_LIGHT_BLUE_5",
        ownerPhase: "duration",
        ownerProgFxRef: "304",
        ownerEffectConstructorKind: "EffectVisualEffect",
        ownerDurationType: "temporary"
      },
      {
        rowId: 308,
        label: "LightYellow5m",
        animation: "Yello_5m",
        animationKind: "light",
        symbolicColor: "Yellow",
        ...PROGFX_TYPE4_YELLOW_5M_SOURCE_MDL_FACTS,
        animationSpeed: 1,
        castShadows: false,
        priority: 20,
        proximitySuppression: false,
        attachToScene: false,
        modelRef: "fx_light_clr",
        color: PROGFX_TYPE4_YELLOW_5M_SOURCE_MDL_FACTS.sourceMdlColor,
        proofStatus:
          "source-backed-progfx-type4-owner-phase-effect-instance-runtime-retail-unverified",
        runtimeSchedulingStatus:
          "source-backed-owner-phase-effect-instance-ready-retail-runtime-unverified",
        visualPreviewStatus: "backend-render-contract-source-record-no-scene-light",
        ownerVisualEffectRowId: 157,
        ownerVisualEffectLabel: "VFX_DUR_LIGHT_YELLOW_5",
        ownerPhase: "duration",
        ownerProgFxRef: "308",
        ownerEffectConstructorKind: "EffectVisualEffect",
        ownerDurationType: "temporary"
      },
      {
        rowId: 328,
        label: "LightDarkvision",
        animation: "Dark_Vision",
        animationKind: "vision",
        visionMode: "Dark_Vision",
        animationSpeed: 1,
        castShadows: false,
        priority: 51,
        proximitySuppression: true,
        attachToScene: false,
        modelRef: "fx_light_clr",
        ...PROGFX_TYPE4_DARK_VISION_SOURCE_MDL_FACTS,
        color: { r: 0.08, g: 0.12, b: 0.28 },
        proofStatus:
          "source-backed-progfx-type4-owner-phase-effect-instance-runtime-retail-unverified",
        runtimeSchedulingStatus:
          "source-backed-owner-phase-effect-instance-ready-retail-runtime-unverified",
        visualPreviewStatus: "backend-render-contract-source-record-no-scene-light",
        ownerVisualEffectRowId: 182,
        ownerVisualEffectLabel: "VFX_DUR_DARKVISION",
        ownerPhase: "duration",
        ownerProgFxRef: "328",
        ownerEffectConstructorKind: "EffectVisualEffect",
        ownerDurationType: "temporary"
      }
    ],
    diagnostics: [
      {
        bucket: "sourceRows",
        code: "VFX_PROGFX_TYPE4_MULTI_REQUEST_SOURCE_ROWS_PRESERVED",
        severity: "info",
        message:
          "Retail visualeffects.2da owner rows preserve two Type 4 light requests with equal priority, one attach-to-scene vision request, and one proximity-suppression vision request."
      },
      {
        bucket: "renderContract",
        code: "VFX_PROGFX_TYPE4_MULTI_REQUEST_RENDER_CONTRACT_NO_POINTLIGHT",
        severity: "warn",
        message:
          "Multiple ProgFX Type 4 requests are exposed for diagnostics, but none is promoted to a generic PointLight without retail scheduler proof."
      },
      {
        bucket: "payload",
        code: "VFX_PROGFX_TYPE4_MULTI_REQUEST_RETAIL_SCHEDULER_REQUIRED",
        severity: "warn",
        message:
          "Local priority/proximity/attach-to-scene policy ordering is docs-backed only; exact retail scheduler data-flow remains required."
      }
    ],
    palette: [
      { r: 0.05, g: 0.08, b: 0.16 },
      PROGFX_TYPE4_BLUE_5M_SOURCE_MDL_FACTS.sourceMdlColor
    ]
  },
  {
    fixtureId: "vfx-retail-cross-lane-all-light-lanes-policy",
    title: "Cross-lane light runtime coverage policy",
    rowId: 304,
    label: "LightBlue5m cross-lane coverage",
    tableName: "progfx.2da",
    sourceAuthority: "retail-key-bif-progfx-type4-cross-lane-coverage",
    constructorKind: "cross-lane-light-diagnostic",
    applicationMode: "scene",
    rawInvocation:
      "Diagnostic scene with tile/placeable/source-mdl/item-property PointLight lanes plus ProgFX Type 4 request; coverage only, not retail insertion ordering.",
    diagnosticScene: {
      version: "aurora-vfx-diagnostic-scene/v1",
      recipe: "cross-lane-light-probes"
    },
    drawParticleCount: 4,
    activeParticleCount: 4,
    progFxType4Light: {
      rowId: 304,
      label: "LightBlue5m",
      animationRaw: "Blue_5m",
      animation: "Blue_5m",
      animationParameterStatus: PROGFX_TYPE4_PARAM1_ANIMATION_STATUS,
      animationKind: "light",
      symbolicColor: "Blue",
      ...PROGFX_TYPE4_BLUE_5M_SOURCE_MDL_FACTS,
      animationSpeedRaw: "30",
      animationSpeed: 30,
      animationSpeedParameterStatus: PROGFX_TYPE4_PARAM2_SPEED_STATUS,
      castShadowsRaw: "0",
      castShadows: false,
      castShadowParameterStatus: PROGFX_TYPE4_PARAM3_CAST_SHADOW_STATUS,
      priorityRaw: "20",
      priority: 20,
      priorityParameterStatus: PROGFX_TYPE4_PARAM4_PRIORITY_STATUS,
      proximitySuppressionRaw: "0",
      proximitySuppression: false,
      proximitySuppressionParameterStatus: PROGFX_TYPE4_PARAM5_PROXIMITY_STATUS,
      attachToSceneRaw: "0",
      attachToScene: false,
      sceneAttachmentParameterStatus: PROGFX_TYPE4_PARAM6_ATTACH_STATUS,
      modelRaw: "fx_light_clr",
      modelRef: "fx_light_clr",
      modelParameterStatus: PROGFX_TYPE4_PARAM7_MODEL_STATUS,
      unusedParam8Raw: "****",
      color: { r: 0.5, g: 0.5, b: 1 },
      proofStatus:
        "source-backed-progfx-type4-cross-lane-runtime-coverage-request-not-pointlight",
      parameterPreservationProofSource: PROGFX_TYPE4_PARAMETER_PRESERVATION_PROOF_SOURCE,
      parameterPreservationProofStatus: PROGFX_TYPE4_PARAMETER_PRESERVATION_PROOF_STATUS,
      runtimeSchedulingStatus:
        "docs-backed-progfx-type4-policy-diagnostic-cross-lane-retail-ordering-blocked",
      runtimeSchedulingProofSource: PROGFX_TYPE4_RUNTIME_SCHEDULING_FULL_PROOF_SOURCE,
      runtimeSchedulingBlocker: PROGFX_TYPE4_RUNTIME_SCHEDULING_BLOCKER,
      sceneAttachmentPolicyStatus: PROGFX_TYPE4_SCENE_ATTACHMENT_POLICY_STATUS,
      proximitySuppressionPolicyStatus: PROGFX_TYPE4_PROXIMITY_SUPPRESSION_POLICY_STATUS,
      visionMutationPolicyStatus: PROGFX_TYPE4_VISION_MUTATION_POLICY_STATUS,
      shadowPolicyStatus: PROGFX_TYPE4_NON_ITEM_SHADOW_POLICY_STATUS,
      visualPreviewStatus:
        "local-cross-lane-coverage-fixture-no-retail-lightmanager-insertion-proof",
      ownerVisualEffectRowId: 153,
      ownerVisualEffectLabel: "VFX_DUR_LIGHT_BLUE_5",
      ownerPhase: "duration",
      ownerProgFxRef: "304",
      ownerEffectConstructorKind: "EffectVisualEffect",
      ownerDurationType: "duration"
    },
    diagnostics: [
      {
        bucket: "payload",
        code: "VFX_CROSS_LANE_LIGHT_RUNTIME_COVERAGE_ONLY",
        severity: "warn",
        message:
          "Fixture observes all required local light lanes in one runtime diagnostic scene; retail LightManager cross-lane insertion order remains blocked."
      }
    ],
    palette: [
      { r: 0.42, g: 0.78, b: 1 },
      { r: 1, g: 0.78, b: 0.34 }
    ]
  },
  {
    fixtureId: "vfx-retail-linked-chain",
    title: "Linked chain local diagnostic",
    rowId: 9010,
    label: "linked_chain_diagnostic",
    sourceAuthority: "requiredFixtureFamily-local-diagnostic",
    constructorKind: "MDL_EMITTER",
    applicationMode: "source_only",
    rawInvocation: "Linked particle chain retail fixture required",
    drawParticleCount: 4,
    activeParticleCount: 5,
    drawLane: "linked_textured_quad",
    linkedChain: true,
    diagnostics: [
      {
        bucket: "sourceRows",
        code: "VFX_LINKED_CHAIN_SOURCE_EVIDENCE_REQUIRED",
        severity: "warn",
        message:
          "Linked-chain fixture family is represented as a local diagnostic until source and retail runtime evidence are supplied."
      },
      {
        bucket: "renderContract",
        code: "VFX_DEV_LINKED_CHAIN_DIAGNOSTIC_ONLY",
        severity: "warn",
        message:
          "Dev fixture preserves linked_textured_quad lane selection with local contiguous segments; this cannot prove Aurora linked segment-buffer parity."
      },
      {
        bucket: "payload",
        code: "VFX_LINKED_CHAIN_RETAIL_SEGMENT_BUFFER_REQUIRED",
        severity: "warn",
        message:
          "Canonical linked-chain parity requires retail runtime/render contract evidence for contiguous segment buffer behavior."
      }
    ],
    palette: [
      { r: 0.22, g: 0.8, b: 1 },
      { r: 0.98, g: 0.92, b: 0.36 }
    ]
  },
  {
    fixtureId: "vfx-retail-p2p-gravity-reference-node",
    title: "P2P gravity reference-node local diagnostic",
    rowId: 9011,
    label: "p2p_gravity_reference_node_diagnostic",
    sourceAuthority: "requiredFixtureFamily-local-diagnostic",
    constructorKind: "MDL_EMITTER",
    applicationMode: "source_only",
    rawInvocation: "P2P gravity with target/reference-node context retail fixture required",
    drawParticleCount: 7,
    p2pGravity: true,
    analysisFeatures: ["gravity-reference-arc"],
    diagnostics: [
      {
        bucket: "sourceRows",
        code: "VFX_P2P_GRAVITY_SOURCE_EVIDENCE_REQUIRED",
        severity: "warn",
        message:
          "P2P gravity fixture family is represented as a local diagnostic until source and retail runtime evidence are supplied."
      },
      {
        bucket: "renderContract",
        code: "VFX_DEV_P2P_GRAVITY_DIAGNOSTIC_ONLY",
        severity: "warn",
        message:
          "Dev fixture samples a deterministic source-target gravity arc; it is not an Aurora retail tick dump."
      },
      {
        bucket: "payload",
        code: "VFX_P2P_GRAVITY_REFERENCE_NODE_REQUIRED",
        severity: "warn",
        message:
          "Canonical P2P gravity parity requires retail reference-node mapping, gravity/drag state, runtime ticks, and render contract evidence."
      }
    ],
    palette: [
      { r: 0.4, g: 0.74, b: 1 },
      { r: 1, g: 0.7, b: 0.22 }
    ]
  },
  {
    fixtureId: "vfx-retail-motion-blur-velocity-basis",
    title: "Motion Blur velocity-basis local diagnostic",
    rowId: 9014,
    label: "motion_blur_velocity_basis_diagnostic",
    sourceAuthority: "source-token-backed-local-diagnostic",
    constructorKind: "MDL_EMITTER",
    applicationMode: "source_only",
    rawInvocation:
      "Motion_Blur render-mode token is present in C:/Projects/New Folder/export/strings.tsv:15617 and selected in decompiled_all.c:853936; retail timing/endpoints still required",
    drawParticleCount: 4,
    motionBlur: true,
    diagnostics: [
      {
        bucket: "sourceRows",
        code: "VFX_MOTION_BLUR_RENDER_MODE_TOKEN_SOURCE_BACKED",
        severity: "info",
        message:
          "Aurora reference export contains the Motion_Blur render-mode token at strings.tsv:15617 and decompiled_all.c:853936."
      },
      {
        bucket: "renderContract",
        code: "VFX_DEV_MOTION_BLUR_VELOCITY_BASIS_DIAGNOSTIC_ONLY",
        severity: "warn",
        message:
          "Dev fixture preserves Motion_Blur render mode and exercises local velocity-aligned geometry; this is not an Aurora retail endpoint/timing proof."
      },
      {
        bucket: "payload",
        code: "VFX_MOTION_BLUR_RETAIL_ENDPOINT_TIMING_REQUIRED",
        severity: "warn",
        message:
          "Canonical Motion_Blur parity requires retail runtime previous/current endpoints, blurLength, timing, and screenshot comparison evidence."
      }
    ],
    palette: [
      { r: 0.34, g: 0.88, b: 1 },
      { r: 1, g: 0.52, b: 0.2 }
    ]
  },
  {
    fixtureId: "vfx-retail-punch-through-mode2-lighten",
    title: "Punch-through vs mode2/lighten local diagnostic",
    rowId: 9012,
    label: "punch_through_mode2_lighten_diagnostic",
    sourceAuthority: "requiredFixtureFamily-local-diagnostic",
    constructorKind: "MDL_EMITTER",
    applicationMode: "source_only",
    rawInvocation: "Punch-through alpha test versus mode2/lighten retail fixture required",
    drawParticleCount: 4,
    punchMode2Lighten: true,
    blendMode: {
      enum: "lighten",
      rawToken: "Mode2_Lighten",
      modeNumber: 2
    },
    diagnostics: [
      {
        bucket: "sourceRows",
        code: "VFX_PUNCH_MODE2_SOURCE_EVIDENCE_REQUIRED",
        severity: "warn",
        message:
          "Punch-through/mode2 fixture family is represented as a local diagnostic until source and retail runtime evidence are supplied."
      },
      {
        bucket: "renderContract",
        code: "VFX_DEV_MODE2_LIGHTEN_DIAGNOSTIC_ONLY",
        severity: "warn",
        message:
          "Dev fixture records Mode2/Lighten blend selection locally; it is not Aurora retail alpha/depth state capture."
      },
      {
        bucket: "payload",
        code: "VFX_PUNCH_THROUGH_RETAIL_BLEND_DEPTH_REQUIRED",
        severity: "warn",
        message:
          "Canonical punch-through versus mode2/lighten parity requires retail alpha-test, depth-write, blend-factor, and screenshot comparison evidence."
      }
    ],
    palette: [
      { r: 0.12, g: 0.7, b: 1 },
      { r: 1, g: 0.92, b: 0.18 }
    ]
  },
  {
    fixtureId: "vfx-retail-plt-known-layer-colors",
    title: "PLT known layer colors local diagnostic",
    rowId: 9013,
    label: "plt_known_layer_colors_diagnostic",
    sourceAuthority: "requiredFixtureFamily-local-diagnostic",
    constructorKind: "MDL_EMITTER",
    applicationMode: "source_only",
    rawInvocation: "PLT visual with known layer colors retail fixture required",
    drawParticleCount: 4,
    analysisFeatures: ["plt-layer-color-order"],
    pltLayerColors: [
      { layer: "skin", color: { r: 1, g: 0.66, b: 0.42 } },
      { layer: "hair", color: { r: 0.62, g: 0.32, b: 0.08 } },
      { layer: "cloth1", color: { r: 0.12, g: 0.48, b: 1 } },
      { layer: "cloth2", color: { r: 0.82, g: 0.12, b: 0.9 } }
    ],
    diagnostics: [
      {
        bucket: "sourceRows",
        code: "VFX_PLT_LAYER_COLOR_SOURCE_EVIDENCE_REQUIRED",
        severity: "warn",
        message:
          "PLT layer-color fixture family is represented as a local diagnostic until source and retail palette evidence are supplied."
      },
      {
        bucket: "renderContract",
        code: "VFX_DEV_PLT_LAYER_COLORS_DIAGNOSTIC_ONLY",
        severity: "warn",
        message:
          "Dev fixture assigns known layer colors to visible records; it is not Aurora retail PLT palette lookup evidence."
      },
      {
        bucket: "payload",
        code: "VFX_PLT_RETAIL_LAYER_PALETTE_REQUIRED",
        severity: "warn",
        message:
          "Canonical PLT parity requires retail layer indices, palette lookup, material binding, capture reference, and comparison evidence."
      }
    ],
    palette: [
      { r: 0.12, g: 0.48, b: 1 },
      { r: 0.82, g: 0.12, b: 0.9 }
    ]
  }
];

export function resolveDevVfxFixtureId(requestedFixtureId: string | undefined): string {
  const normalized = requestedFixtureId?.trim();
  if (!normalized) {
    return DEV_VFX_DEFAULT_FIXTURE_ID;
  }
  return DEV_VFX_FIXTURES.some((fixture) => fixture.fixtureId === normalized)
    ? normalized
    : DEV_VFX_DEFAULT_FIXTURE_ID;
}

function resolveDevProgFxType4ShadowPolicyStatus(
  light: DevProgFxType4LightFixture
): string {
  if (light.animationKind === "light") {
    return PROGFX_TYPE4_ITEM_LIGHT_SHADOW_POLICY_STATUS;
  }
  if (light.castShadows === true) {
    return PROGFX_TYPE4_CUSTOM_NON_ITEM_SHADOW_POLICY_STATUS;
  }
  return PROGFX_TYPE4_NON_ITEM_SHADOW_POLICY_STATUS;
}

function resolveFixturePrimaryProgFxType4Light(
  fixture: DevVfxFixtureDefinition
): DevProgFxType4LightFixture | undefined {
  return fixture.progFxType4Light ?? fixture.progFxType4Requests?.[0];
}

function resolveFixtureProgFxType4Requests(
  fixture: DevVfxFixtureDefinition
): readonly DevProgFxType4LightFixture[] {
  return fixture.progFxType4Requests ?? (fixture.progFxType4Light ? [fixture.progFxType4Light] : []);
}

function createDevProgFxType4RenderContractLight(light: DevProgFxType4LightFixture) {
  return {
    ...light,
    animationRaw: light.animationRaw ?? light.animation,
    animationParameterStatus:
      light.animationParameterStatus ?? PROGFX_TYPE4_PARAM1_ANIMATION_STATUS,
    visionParameterStatus:
      light.visionParameterStatus ??
      (light.animationKind === "vision" ? PROGFX_TYPE4_PARAM1_VISION_STATUS : ""),
    animationSpeedRaw: light.animationSpeedRaw ?? String(light.animationSpeed),
    animationSpeedParameterStatus:
      light.animationSpeedParameterStatus ?? PROGFX_TYPE4_PARAM2_SPEED_STATUS,
    castShadowsRaw: light.castShadowsRaw ?? (light.castShadows ? "1" : "0"),
    castShadowParameterStatus:
      light.castShadowParameterStatus ?? PROGFX_TYPE4_PARAM3_CAST_SHADOW_STATUS,
    priorityRaw: light.priorityRaw ?? String(light.priority),
    priorityParameterStatus:
      light.priorityParameterStatus ?? PROGFX_TYPE4_PARAM4_PRIORITY_STATUS,
    proximitySuppressionRaw:
      light.proximitySuppressionRaw ?? (light.proximitySuppression ? "1" : "0"),
    proximitySuppressionParameterStatus:
      light.proximitySuppressionParameterStatus ?? PROGFX_TYPE4_PARAM5_PROXIMITY_STATUS,
    attachToSceneRaw: light.attachToSceneRaw ?? (light.attachToScene ? "1" : "0"),
    sceneAttachmentParameterStatus:
      light.sceneAttachmentParameterStatus ?? PROGFX_TYPE4_PARAM6_ATTACH_STATUS,
    modelRaw: light.modelRaw ?? light.modelRef,
    modelParameterStatus: light.modelParameterStatus ?? PROGFX_TYPE4_PARAM7_MODEL_STATUS,
    unusedParam8Raw: light.unusedParam8Raw ?? "****",
    notPlaceableTwoDaLight: true,
    notMdlLightNode: true,
    parameterSource:
      "retail progfx.2da Type 4 Param1 animation, Param2 speed, Param3 cast shadows, Param4 priority, Param5 proximity suppression, Param6 attach to scene, Param7 model",
    parameterPreservationProofSource:
      light.parameterPreservationProofSource ??
      PROGFX_TYPE4_PARAMETER_PRESERVATION_PROOF_SOURCE,
    parameterPreservationProofStatus:
      light.parameterPreservationProofStatus ??
      PROGFX_TYPE4_PARAMETER_PRESERVATION_PROOF_STATUS,
    runtimeSchedulingStatus:
      light.runtimeSchedulingStatus ?? "blocked-owner-phase-effect-instance-required",
    runtimeSchedulingProofSource:
      light.runtimeSchedulingProofSource ?? PROGFX_TYPE4_RUNTIME_SCHEDULING_FULL_PROOF_SOURCE,
    runtimeSchedulingBlocker:
      light.runtimeSchedulingBlocker ?? PROGFX_TYPE4_RUNTIME_SCHEDULING_BLOCKER,
    sceneAttachmentPolicyStatus:
      light.sceneAttachmentPolicyStatus ?? PROGFX_TYPE4_SCENE_ATTACHMENT_POLICY_STATUS,
    proximitySuppressionPolicyStatus:
      light.proximitySuppressionPolicyStatus ??
      PROGFX_TYPE4_PROXIMITY_SUPPRESSION_POLICY_STATUS,
    visionMutationPolicyStatus:
      light.visionMutationPolicyStatus ?? PROGFX_TYPE4_VISION_MUTATION_POLICY_STATUS,
    shadowPolicyStatus: light.shadowPolicyStatus ?? resolveDevProgFxType4ShadowPolicyStatus(light),
    visualPreviewStatus: light.visualPreviewStatus ?? "dev-source-colored-diagnostic-only"
  };
}

export function createDevAuroraVfxPayload(
  request: DevVfxFixtureRequest = {}
): DevVfxFixturePayloadResult {
  const fixtureId = resolveDevVfxFixtureId(request.fixtureId);
  const fixture = DEV_VFX_FIXTURES.find((entry) => entry.fixtureId === fixtureId)!;
  const timeSeconds = clampFinite(request.timeSeconds, 0.5, 0, 12);
  const seed = Math.trunc(clampFinite(request.seed, 1, 0, 999_999));
  const drawLane = fixture.drawLane ?? "textured_quad";
  const drawParticleCount = Math.trunc(
    clampFinite(fixture.drawParticleCount, 2, drawLane === "chunk_model" ? 0 : 1, 24)
  );
  const activeParticleCount = Math.trunc(
    clampFinite(
      fixture.activeParticleCount,
      drawLane === "linked_textured_quad" ? drawParticleCount + 1 : drawParticleCount,
      0,
      24
    )
  );
  const drawRecords =
    drawLane === "chunk_model"
      ? []
      : Array.from({ length: drawParticleCount }, (_, particleIndex) =>
          createDrawRecord(fixture, drawLane, particleIndex, activeParticleCount, timeSeconds, seed)
        );
  const verticesPerDrawParticle = drawLane === "chunk_model" ? 0 : 6;
  const drawVertexCount = drawRecords.length * verticesPerDrawParticle;
  const fixtureDiagnostics = createFixtureDiagnostics(fixture);
  const progFxType4PrimaryLight = resolveFixturePrimaryProgFxType4Light(fixture);
  const progFxType4Requests = resolveFixtureProgFxType4Requests(fixture);
  const progFxType4RenderContractLight = progFxType4PrimaryLight
    ? createDevProgFxType4RenderContractLight(progFxType4PrimaryLight)
    : null;
  const progFxType4RenderContractRequests =
    progFxType4Requests.length > 1
      ? progFxType4Requests.map((entry) => createDevProgFxType4RenderContractLight(entry))
      : [];

  const payload: AuroraVfxPayload = {
    version: "aurora-vfx-payload/v1",
    canonicalStatus: "canonical",
    backendCanonical: true,
    rendererEligibility: "source_backed",
    retailParityStatus: "blocked",
    sourceKind: "effect_instance",
    previewMode: "none",
    diagnostics: {
      sourceRows: [
        {
          code: "VFX_DEV_FIXTURE_SELECTED_SOURCE_ONLY",
          severity: "info",
          message:
            "Dev runner fixture preserves selected-source row identity, but does not include retail execution evidence."
        },
        ...fixtureDiagnostics.sourceRows
      ],
      effectInstance: [],
      phaseSchedule: [],
      dependencyGraph: fixtureDiagnostics.dependencyGraph,
      runtimeState: [
        {
          code: "VFX_DEV_RUNTIME_STATE_DIAGNOSTIC_ONLY",
          severity: "warn",
          message:
            "Runtime state in this runner is deterministic local diagnostic data, not Aurora retail capture."
        }
      ],
      renderContract: [
        {
          code: "VFX_DEV_RENDER_CONTRACT_FIXTURE",
          severity: "info",
          message:
            "Local render-contract fixture used to exercise the frontend canonical renderer."
        },
        ...fixtureDiagnostics.renderContract
      ],
      payload: [
        {
          code: "VFX_DEV_VISUAL_RUNNER_NOT_PARITY_PROOF",
          severity: "warn",
          message:
            "Browser screenshot and Three.js output from this runner cannot promote canonical retail parity."
        },
        {
          code: "VFX_RETAIL_CAPTURE_REFERENCE_REQUIRED",
          severity: "warn",
          message:
            "Retail capture, runtime dump, render contract snapshot, and comparison remain required for canonical parity."
        },
        ...fixtureDiagnostics.payload
      ]
    },
    contracts: {
      sourceRows: {
        version: "aurora-vfx-dev-source-row-anchor/v1",
        fixtureId: fixture.fixtureId,
        tableName: fixture.tableName ?? "visualeffects.2da",
        profile: "nwn-ee-8193.34-selected-source",
        tableHash:
          fixture.tableHash ??
          "ACEFE76F7FB14E88916AE1ADE40DD5108B8A2F601EAADA82A67F751B4EB56EA2",
        rowId: fixture.rowId,
        label: fixture.label,
        sourceAuthority: fixture.sourceAuthority,
        evidenceGrade: "selected-source-manifest-only"
      },
      effectInstance: {
        version: "aurora-vfx-dev-effect-instance/v1",
        fixtureId: fixture.fixtureId,
        constructorKind: fixture.constructorKind,
        applicationMode: fixture.applicationMode,
        durationType: fixture.durationType ?? "instant",
        durationSeconds: fixture.durationSeconds ?? 0,
        sourceRowId: fixture.rowId,
        rawInvocation: fixture.rawInvocation,
        ...(fixture.targetRef !== undefined ? { targetRef: fixture.targetRef } : {}),
        ...(fixture.effectorRef !== undefined ? { effectorRef: fixture.effectorRef } : {}),
        ...(fixture.bodyNode !== undefined ? { bodyNode: fixture.bodyNode } : {})
      },
      phaseSchedule: {
        version: "aurora-vfx-dev-phase-schedule/v1",
        checkpointSeconds: timeSeconds,
        deterministicSeed: seed,
        phase: "local_visual_runner"
      },
      dependencyGraph: {
        version: "aurora-vfx-dependency-graph/v1",
        edges: createDependencyEdges(fixture, drawLane),
        diagnostics: fixtureDiagnostics.dependencyGraph
      },
      runtimeState: {
        version: "aurora-vfx-dev-runtime-state/v1",
        activeParticleCount,
        freeParticleCount: 0,
        checkpointSeconds: timeSeconds,
        deterministicSeed: seed,
        retailCapture: false
      },
      renderContract: {
        version: "aurora-vfx-runtime-render-contract/v1",
        activeParticleCount,
        drawParticleCount: drawRecords.length,
        verticesPerDrawParticle,
        drawVertexCount,
        drawLane,
        renderMode: {
          enum:
            fixture.motionBlur
              ? "motion_blur"
              : drawLane === "chunk_model"
              ? "chunk_model"
              : drawLane === "linked_textured_quad"
                ? "linked_billboard"
                : "billboard_to_world_z",
          rawToken:
            fixture.motionBlur
              ? "Motion_Blur"
              : drawLane === "chunk_model"
              ? "Chunk"
              : drawLane === "linked_textured_quad"
                ? "Linked"
                : "Billboard_to_World_Z"
        },
        blendMode: createBlendMode(fixture),
        renderState: {
          depthWriteLane:
            fixture.blendMode?.enum === "punch_through"
              ? "punch_through_depth_write_on"
              : "non_punch_transparent_depth_write_off",
          transparentLane:
            fixture.blendMode?.enum === "punch_through"
              ? "punch_through_alpha_test_lane"
              : "non_punch_transparent_lane"
        },
        renderOrder: {
          value: 7,
          rawValue: 7
        },
        analysisProfile: {
          version: "aurora-vfx-analysis-profile/v1",
          features: [...(fixture.analysisFeatures ?? [])]
        },
        drawRecords,
        diagnostics: [
          {
            code: "VFX_PARTICLE_DRAW_NON_INDEXED_ARRAYS_REQUIRED",
            severity: "info",
            message: "Dev fixture uses renderer-agnostic non-indexed draw records."
          },
          ...fixtureDiagnostics.renderContract
        ],
        ...(drawLane === "chunk_model"
          ? {
              chunkLane: {
                lane: "chunk_model",
                chunkName: fixture.chunkName ?? "chunk_model_pending",
                activeParticleCount,
                texturedQuadCanonical: false,
                collapseAttempted: true,
                canonicalResourceResolved: Boolean(fixture.chunkResourceKey),
                resourceResolveStatus: fixture.chunkResourceKey ? "resolved" : "unresolved",
                ...(fixture.chunkResourceKey
                  ? {
                      resolvedResource: {
                        requestedRef: fixture.chunkName ?? "chunk_model_pending",
                        resourceKey: fixture.chunkResourceKey,
                        sourceLayer: fixture.chunkResourceLayer ?? "dev-fixture-local-template",
                        sourcePath: fixture.chunkResourcePath ?? fixture.chunkResourceKey,
                        resourceHash:
                          fixture.chunkResourceHash ?? "local-template-no-retail-resource-hash",
                        candidateId:
                          fixture.chunkResourceCandidateId ??
                          `dev-fixture:${fixture.chunkResourceKey}`,
                        resolutionSource: "dev-fixture-local-template"
                      }
                    }
                  : {})
              }
            }
          : {}),
        adapterBoundaries: {
          threeMaterialSettingsAreSourceTruth: false,
          spriteMaterialIsCanonical: false,
          shaderMaterialIsCanonical: false,
          glbPreviewIsCanonical: false,
          materialLevelAtlasFrameOffsetAllowed: false
        },
        ...(fixture.beamEffect
          ? {
              beamContext: {
                constructorKind: "EffectBeam",
                applicationMode: fixture.applicationMode,
                durationType: fixture.durationType ?? "temporary",
                durationSeconds: fixture.durationSeconds ?? 3,
                targetRef: fixture.targetRef ?? "retail-beam-target",
                effectorRef: fixture.effectorRef ?? "retail-beam-source",
                bodyNode: fixture.bodyNode ?? "BODY_NODE_CHEST",
                sourceAnchor: { x: -0.62, y: -0.08, z: 0 },
                targetAnchor: { x: 0.62, y: 0.16, z: 0 },
                retailBeamVolumeResolved: false
              }
            }
          : {}),
        ...(fixture.fountainAtlas
          ? {
              fountainAtlas: {
                emitterType: "Fountain",
                textureRef: fixture.fountainAtlas.textureRef,
                xgrid: fixture.fountainAtlas.xgrid,
                ygrid: fixture.fountainAtlas.ygrid,
                fps: fixture.fountainAtlas.fps,
                frameStart: fixture.fountainAtlas.frameStart,
                frameEnd: fixture.fountainAtlas.frameEnd,
                randomFrameStart: fixture.fountainAtlas.randomFrameStart,
                retailPlaybackResolved: false
              }
            }
          : {}),
        ...(progFxType4RenderContractLight
          ? {
              progFxType4Light: progFxType4RenderContractLight
            }
          : {}),
        ...(progFxType4RenderContractRequests.length > 0
          ? {
              progFxType4Requests: progFxType4RenderContractRequests
            }
          : {})
      }
    },
    provenance: {
      backendPayloadVersion: "dev-vfx-runner-local",
      sourceProfile: "nwn-ee-8193.34-selected-source",
      sourceTable: fixture.tableName ?? "visualeffects.2da",
      sourceRowId: fixture.rowId,
      sourceLabel: fixture.label,
      effectInstanceId: fixture.fixtureId,
      runtimeProfile: "dev-vfx-visual-runner-local-diagnostic",
      renderContractVersion: "aurora-vfx-runtime-render-contract/v1"
    }
  };

  return {
    fixtureId: fixture.fixtureId,
    title: fixture.title,
    timeSeconds,
    seed,
    oracle: DEV_VFX_ORACLE,
    comparisonResult: "local-visible",
    canonicalParityPromoted: false,
    textureReference: DEV_VFX_TEXTURE_REFERENCE,
    ...(fixture.diagnosticScene
      ? { diagnosticScene: { ...fixture.diagnosticScene } }
      : {}),
    payload
  };
}

function createFixtureDiagnostics(fixture: DevVfxFixtureDefinition) {
  type DevVfxFixtureDiagnostic = {
    bucket: "sourceRows" | "dependencyGraph" | "renderContract" | "payload";
    code: string;
    severity: "info" | "warn" | "error";
    message: string;
  };
  const byBucket = {
    sourceRows: [] as DevVfxFixtureDiagnostic[],
    dependencyGraph: [] as DevVfxFixtureDiagnostic[],
    renderContract: [] as DevVfxFixtureDiagnostic[],
    payload: [] as DevVfxFixtureDiagnostic[]
  };
  for (const diagnostic of fixture.diagnostics ?? []) {
    byBucket[diagnostic.bucket].push(diagnostic);
  }
  return byBucket;
}

function createDependencyEdges(fixture: DevVfxFixtureDefinition, drawLane: DevVfxDrawLane) {
  if (drawLane === "chunk_model") {
    const selectedCandidate = fixture.chunkResourceKey
      ? {
          candidateId: fixture.chunkResourceCandidateId ?? `dev-fixture:${fixture.chunkResourceKey}`,
          resourceKey: fixture.chunkResourceKey,
          sourceLayer: fixture.chunkResourceLayer ?? "dev-fixture-local-template",
          sourcePath: fixture.chunkResourcePath ?? fixture.chunkResourceKey,
          resourceHash: fixture.chunkResourceHash ?? "local-template-no-retail-resource-hash"
        }
      : null;
    return [
      {
        edgeType: "chunk_model",
        requestedResourceClass: "chunk_model",
        requestedRef: fixture.chunkName ?? "chunk_model_pending",
        selectedCandidate
      }
    ];
  }
  const progFxType4Requests = resolveFixtureProgFxType4Requests(fixture);
  if (progFxType4Requests.length > 0) {
    const uniqueProgFxRows = [...new Map(
      progFxType4Requests.map((entry) => [entry.rowId, entry])
    ).values()];
    return [
      ...uniqueProgFxRows.map((entry) => ({
        edgeType: "progfx_row",
        requestedResourceClass: "progfx_row",
        requestedRef: String(entry.rowId),
        selectedCandidate: {
          resourceKey: `progfx.2da#row=${entry.rowId}`
        }
      })),
      {
        edgeType: "texture",
        requestedResourceClass: "texture",
        requestedRef: DEV_VFX_TEXTURE_REFERENCE,
        selectedCandidate: {
          resourceKey: `${DEV_VFX_TEXTURE_REFERENCE}.tga`
        }
      }
    ];
  }
  return [
    {
      edgeType: "texture",
      requestedResourceClass: "texture",
      requestedRef: DEV_VFX_TEXTURE_REFERENCE,
      selectedCandidate: {
        resourceKey: `${DEV_VFX_TEXTURE_REFERENCE}.tga`
      }
    }
  ];
}

function createBlendMode(fixture: DevVfxFixtureDefinition) {
  return (
    fixture.blendMode ?? {
      enum: "normal" as const,
      rawToken: "Normal",
      modeNumber: 0
    }
  );
}

function createDrawRecord(
  fixture: DevVfxFixtureDefinition,
  drawLane: DevVfxDrawLane,
  particleIndex: number,
  particleCount: number,
  timeSeconds: number,
  seed: number
) {
  const phase = timeSeconds * Math.PI * 2 + seed * 0.017 + particleIndex * 1.35;
  const normalizedIndex = particleCount <= 1 ? 0.5 : particleIndex / (particleCount - 1);
  const side = particleIndex % 2 === 0 ? -1 : 1;
  const frameIndex = (fixture.rowId + seed + particleIndex * 3) % 16;
  const fountainLift = (normalizedIndex - 0.5) * 0.34;
  const linkedPhase = timeSeconds * Math.PI + seed * 0.011;
  const linkedX = (normalizedIndex - 0.5) * 0.78;
  const linkedY = Math.sin(normalizedIndex * Math.PI * 2 + linkedPhase) * 0.16;
  const linkedNextNormalizedIndex =
    particleCount <= 1 ? 0.5 : Math.min(1, (particleIndex + 1) / (particleCount - 1));
  const linkedNextX = (linkedNextNormalizedIndex - 0.5) * 0.78;
  const linkedNextY =
    Math.sin(linkedNextNormalizedIndex * Math.PI * 2 + linkedPhase) * 0.16;
  const p2pX = -0.48 + normalizedIndex * 0.96;
  const p2pArc = 4 * normalizedIndex * (1 - normalizedIndex);
  const p2pY = -0.2 + p2pArc * 0.46 - normalizedIndex * normalizedIndex * 0.18;
  const motionBlurX = -0.34 + normalizedIndex * 0.68;
  const motionBlurY = -0.16 + normalizedIndex * 0.32;
  const motionBlurVelocityX = 0.9 + normalizedIndex * 0.7;
  const motionBlurVelocityY = 0.35 + normalizedIndex * 0.25;
  const beamX = -0.62 + normalizedIndex * 1.24;
  const beamY = -0.08 + normalizedIndex * 0.24 + Math.sin(normalizedIndex * Math.PI) * 0.04;
  const progFxType4Light = resolveFixturePrimaryProgFxType4Light(fixture);
  const progFxLightScale = Math.max(
    0.16,
    (progFxType4Light?.radiusMeters ?? progFxType4Light?.sourceMdlRadiusMeters ?? 5) / 20
  );
  const punchX = -0.3 + normalizedIndex * 0.6;
  const punchY = particleIndex % 2 === 0 ? -0.11 : 0.11;
  const pltX = -0.36 + normalizedIndex * 0.72;
  const pltY = -0.02 + Math.sin(normalizedIndex * Math.PI) * 0.1;
  const blendMode = createBlendMode(fixture);
  const pltLayerColor = fixture.pltLayerColors?.[particleIndex % fixture.pltLayerColors.length];
  return {
    recordKind: "aurora-particle-draw-record",
    drawRecordId: `${fixture.fixtureId}:draw:${particleIndex}`,
    emitterNodeName: "dev_vfx_fixture_emit",
    lane: drawLane === "linked_textured_quad" ? "linked_textured_quad" : "textured_quad",
    particleId: fixture.rowId * 10 + particleIndex,
    particleIndex,
    ...(drawLane === "linked_textured_quad"
      ? {
          linkedNextParticleId: fixture.rowId * 10 + particleIndex + 1,
          linkedNextPosition: { x: linkedNextX, y: linkedNextY, z: 0 }
        }
      : {}),
    verticesPerParticle: 6,
    vertexCount: 6,
    drawRoute: {
      route: "non_indexed_draw_arrays",
      indexed: false,
      drawModeArgument: 3,
      drawModeArgumentSource: "aurora-draw-wrapper-mode-arg3",
      enumTableCaptured: true,
      glPrimitiveMode: "GL_TRIANGLES",
      glPrimitiveModeEnum: 0x0004,
      triangleListInferenceProof: "confirmed_draw_wrapper_table_index_3_gl_triangles",
      primitiveModeSource: "nwtoolset-1.5.0.5-disassembly",
      binarySha256: "4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24"
    },
    renderMode: {
      enum: fixture.motionBlur
        ? "motion_blur"
        : drawLane === "linked_textured_quad"
          ? "linked_billboard"
          : "billboard_to_world_z",
      rawToken: fixture.motionBlur
        ? "Motion_Blur"
        : drawLane === "linked_textured_quad"
          ? "Linked"
          : "Billboard_to_World_Z"
    },
    blendMode: {
      enum: blendMode.enum,
      rawToken: blendMode.rawToken,
      modeNumber: blendMode.modeNumber
    },
    renderOrder: {
      value: 7,
      rawValue: 7
    },
    position: {
      x: fixture.p2pGravity
        ? p2pX
        : fixture.motionBlur
          ? motionBlurX
        : fixture.beamEffect
          ? beamX
          : progFxType4Light
            ? (normalizedIndex - 0.5) * progFxLightScale * 1.4
        : fixture.punchMode2Lighten
          ? punchX
          : fixture.pltLayerColors
            ? pltX
        : fixture.linkedChain
        ? linkedX
        : side * (0.14 + 0.04 * Math.sin(phase)) + (normalizedIndex - 0.5) * 0.18,
      y: fixture.p2pGravity
        ? p2pY
        : fixture.motionBlur
          ? motionBlurY
        : fixture.beamEffect
          ? beamY
        : progFxType4Light
          ? Math.sin(normalizedIndex * Math.PI) * progFxLightScale * 0.34
        : fixture.punchMode2Lighten
          ? punchY
          : fixture.pltLayerColors
            ? pltY
        : fixture.linkedChain
          ? linkedY
          : fountainLift + 0.04 * Math.cos(phase * 0.7),
      z: 0
    },
    velocity: {
      x: fixture.p2pGravity
        ? 0.12
        : fixture.motionBlur
          ? motionBlurVelocityX
        : fixture.beamEffect
          ? 0.18
          : progFxType4Light
            ? 0.02 * side
          : fixture.punchMode2Lighten
          ? 0.03 * side
          : fixture.pltLayerColors
            ? 0.01 * side
          : fixture.linkedChain
            ? 0.05
            : side * 0.03,
      y: fixture.p2pGravity
        ? 0.16 - normalizedIndex * 0.22
        : fixture.motionBlur
          ? motionBlurVelocityY
        : fixture.beamEffect
          ? 0.04
        : progFxType4Light
          ? 0.01 * Math.cos(phase)
        : fixture.punchMode2Lighten
          ? 0.02 * Math.sin(phase)
          : fixture.pltLayerColors
            ? 0.01 * Math.cos(phase)
        : fixture.linkedChain
          ? 0.02 * Math.cos(linkedPhase)
          : 0.06 + normalizedIndex * 0.05,
      z: 0
    },
    color:
      progFxType4Light?.color ??
      pltLayerColor?.color ??
      fixture.palette[particleIndex % fixture.palette.length],
    alpha: Math.max(0.32, 0.78 - normalizedIndex * 0.28),
    size: {
      x: fixture.p2pGravity
        ? 0.18 + 0.04 * Math.sin(phase)
        : fixture.motionBlur
          ? 0.12 + 0.03 * normalizedIndex
        : fixture.beamEffect
          ? 0.34
          : progFxType4Light
            ? 0.28 + progFxLightScale * 0.42
        : fixture.punchMode2Lighten
          ? 0.38 + 0.03 * Math.sin(phase)
          : fixture.pltLayerColors
            ? 0.18
        : fixture.linkedChain
        ? 0.22 + 0.04 * Math.sin(phase)
        : 0.34 + 0.08 * (1 - normalizedIndex) + 0.04 * Math.sin(phase),
      y: fixture.p2pGravity
        ? 0.22 + 0.04 * Math.cos(phase)
        : fixture.motionBlur
          ? 0.24 + 0.04 * Math.cos(phase)
        : fixture.beamEffect
          ? 0.12 + 0.02 * Math.sin(phase)
        : progFxType4Light
          ? 0.28 + progFxLightScale * 0.42
        : fixture.punchMode2Lighten
          ? 0.38 + 0.03 * Math.cos(phase)
          : fixture.pltLayerColors
            ? 0.28
        : fixture.linkedChain
        ? 0.3 + 0.04 * Math.cos(phase)
        : 0.4 + 0.1 * (1 - normalizedIndex) + 0.05 * Math.cos(phase)
    },
    atlasUv: createAtlasUv(frameIndex),
    atlasProvenance: {
      checkpointSeconds: timeSeconds,
      randomResetPath: "deterministic_dev_runner_seed",
      materialLevelFrameOffsetAllowed: false,
      frameStepIntegerConversion: "already_integer",
      ...(pltLayerColor
        ? {
            pltLayer: pltLayerColor.layer,
            pltLayerColorSource: "dev_known_layer_color_diagnostic"
          }
        : {}),
      ...(fixture.beamEffect
        ? {
            beamSegmentIndex: particleIndex,
            beamSegmentCount: particleCount,
            beamContextSource: "dev_effectbeam_context_diagnostic",
            bodyNode: fixture.bodyNode ?? "BODY_NODE_CHEST"
          }
        : {}),
      ...(fixture.fountainAtlas
        ? {
            emitterType: "Fountain",
            textureRef: fixture.fountainAtlas.textureRef,
            atlasGrid: {
              x: fixture.fountainAtlas.xgrid,
              y: fixture.fountainAtlas.ygrid
            },
            atlasFrameStart: fixture.fountainAtlas.frameStart,
            atlasFrameEnd: fixture.fountainAtlas.frameEnd,
            atlasFps: fixture.fountainAtlas.fps,
            randomFrameStart: fixture.fountainAtlas.randomFrameStart,
            atlasPlaybackSource: "dev_fountain_atlas_diagnostic"
          }
        : {}),
      ...(progFxType4Light
        ? {
            progFxType4RowId: progFxType4Light.rowId,
            progFxType4Animation: progFxType4Light.animation,
            progFxType4RadiusMeters:
              progFxType4Light.radiusMeters ?? progFxType4Light.sourceMdlRadiusMeters,
            progFxType4CastShadows: progFxType4Light.castShadows,
            progFxType4Priority: progFxType4Light.priority,
            progFxType4Source: "progfx.2da Type 4 diagnostic draw record"
          }
        : {})
    },
    diagnostics: []
  };
}

function createAtlasUv(frameIndex: number) {
  const frameColumn = frameIndex % 4;
  const frameRow = Math.floor(frameIndex / 4);
  const frameSize = 0.25;
  return {
    u0: frameColumn * frameSize,
    v0: frameRow * frameSize,
    u1: (frameColumn + 1) * frameSize,
    v1: (frameRow + 1) * frameSize,
    frameIndex,
    rawFrameIndex: frameIndex,
    mapping: "row_major_top_down_v"
  };
}

function clampFinite(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, value));
}
