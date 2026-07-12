import type { AreaObjectPlacement, AreaRecord, AreaTileInstance } from "./area.types";

type CatalogLightingMetadataPrimitive = string | number | boolean;

export interface AreaCatalogLightSourceInput {
  templateId: string;
  resref: string;
  name: string;
  category: string;
  tags: string[];
  metadata: Record<string, CatalogLightingMetadataPrimitive>;
}

export interface AreaTileLightingEvidence {
  areaId: string;
  areaName: string;
  tileInstanceId: string;
  row: number;
  col: number;
  tileIndex: number;
  tileId?: number;
  tilesetResRef: string;
  modelResRef?: string;
  mainLight1?: number;
  mainLight2?: number;
  sourceLight1?: number;
  sourceLight2?: number;
  mainLight1Color?: AreaTileInstance["mainLight1Color"];
  mainLight2Color?: AreaTileInstance["mainLight2Color"];
  sourceLight1Color?: AreaTileInstance["sourceLight1Color"];
  sourceLight2Color?: AreaTileInstance["sourceLight2Color"];
  animLoop1?: number;
  animLoop2?: number;
  animLoop3?: number;
}

export interface AreaGlobalLightingFieldEvidence {
  field: NonNullable<AreaRecord["lighting"]>["fields"][number]["field"];
  value: number;
}

export interface AreaGlobalLightingEvidence {
  areaId: string;
  areaName: string;
  source: "are-root-fields";
  fields: AreaGlobalLightingFieldEvidence[];
}

export interface AreaPlaceableLightingCandidateEvidence {
  areaId: string;
  areaName: string;
  objectId: string;
  templateId: string;
  resRef?: string;
  tag?: string;
  localizedName?: string;
  description?: string;
  appearanceType?: number;
  genericType?: number;
  x: number;
  y: number;
  z: number;
  matchedTokens: string[];
}

export interface AreaCatalogLightSourceEvidence {
  templateId: string;
  resref: string;
  name: string;
  category: string;
  tags: string[];
  evidence: Array<"placeables.2da.LightColor" | "utp.LightState" | "catalog.light_source">;
  source2daLightColorRaw?: string;
  source2daLightColorRow?: number;
  source2daLightColorLabel?: string;
  source2daLightColorSourceKey?: string;
  source2daLightRed?: number;
  source2daLightGreen?: number;
  source2daLightBlue?: number;
  source2daToolsetRed?: number;
  source2daToolsetGreen?: number;
  source2daToolsetBlue?: number;
  source2daLightOffsetX?: number;
  source2daLightOffsetY?: number;
  source2daLightOffsetZ?: number;
  source2daShadowSize?: number;
  source2daStatic?: boolean;
  lightState?: number;
  modelResRef?: string;
  lookupModelResRef?: string;
}

export type AreaProcessedMdlLightSourceKind = "aurora-mdl-binary" | "aurora-mdl-ascii";

export interface AreaProcessedMdlLightVector3 {
  x: number;
  y: number;
  z: number;
}

export interface AreaProcessedMdlLightColor {
  red: number;
  green: number;
  blue: number;
}

export interface AreaProcessedMdlLightNodeEvidence {
  source: AreaProcessedMdlLightSourceKind;
  sourceModelAssetId: string;
  sourceModelFileName: string;
  sourceModelObjectKey: string;
  nodeName: string;
  sourceNodeKind?: string;
  parentNodeName?: string;
  position?: AreaProcessedMdlLightVector3;
  scale?: number;
  radius?: number;
  quadraticAtten?: number;
  quadraticAttenSource?: string;
  quadraticAttenProofStatus?: string;
  auroraLightFieldParserSource?: string;
  auroraLightFieldParserProofStatus?: string;
  shadowRadius?: number;
  verticalDisplacement?: number;
  multiplier?: number;
  color?: AreaProcessedMdlLightColor;
  ambientOnly?: boolean;
  dynamicType?: number;
  affectDynamic?: boolean;
  shadow?: boolean;
  lightPriority?: number;
  generateFlare?: boolean;
  textureNames?: string[];
  flareSizes?: number[];
  flarePositions?: number[];
  flareColorShifts?: AreaProcessedMdlLightColor[];
  flareRadius?: number;
  lensFlares?: boolean;
  fadingLight?: boolean;
  animationNames?: string[];
}

export interface AreaProcessedMdlLightSourceEvidence {
  templateId: string;
  resref: string;
  name: string;
  modelResRef?: string;
  lookupModelResRef?: string;
  cacheKey?: string;
  cacheHit?: boolean;
  nodes: AreaProcessedMdlLightNodeEvidence[];
}

export type AreaRendererLightBudgetCandidateSource =
  | "processed-mdl-light-node"
  | "tile-light-reference"
  | "catalog-light-source-template"
  | "placeable-name-candidate";

export type AreaRendererLightBudgetDropReason = "aurora-active-light-slot-cap";

export type AreaRendererLightBudgetPriorityStrategy =
  "source-backed-mdl-lightmanager-score-then-diagnostic-lane-fallback";

export interface AreaRendererLightBudgetCandidateEvidence {
  candidateId: string;
  source: AreaRendererLightBudgetCandidateSource;
  label: string;
  priority: number;
  rank: number;
  accepted: boolean;
  dropReason?: AreaRendererLightBudgetDropReason;
  areaId?: string;
  areaName?: string;
  tileInstanceId?: string;
  tileChannel?: "mainLight1" | "mainLight2" | "sourceLight1" | "sourceLight2";
  templateId?: string;
  resref?: string;
  nodeName?: string;
  lightPriority?: number;
  retailMdlScoreSource?: string;
  retailMdlScoreProofStatus?: string;
  retailMdlPreviewScore?: number;
  retailMdlPreviewScorePriority?: number;
  retailMdlPreviewScorePreviewDistance?: number;
  retailMdlPreviewScoreRangeTerm?: number;
  retailMdlPreviewScoreFormula?: string;
  retailMdlPreviewScoreSource?: string;
  retailMdlPreviewScoreProofStatus?: string;
  retailMdlPreviewScoreSortDirection?: "ascending-score-field-0x84-preview";
  retailMdlPreviewScoreFallback?: string;
  prioritySource?: string;
}

export interface AreaRendererLightBudgetDiagnostic {
  activeLightSlotCap: 128;
  candidateLights: number;
  acceptedLights: number;
  droppedLights: number;
  sampledCandidateLights: number;
  omittedCandidateLights: number;
  priorityStrategy: AreaRendererLightBudgetPriorityStrategy;
  priorityStrategyProofStatus:
    "source-backed-mdl-lightmanager-score-diagnostic-cross-lane-fallback";
  retailMdlLightScoreSource: string;
  retailMdlLightSortSource: string;
  retailActiveLightSortScoreSource: string;
  retailActiveLightSortScoreFormula: string;
  retailActiveLightSortDirection: "ascending-score-field-0x84";
  retailActiveLightSortScoreProofStatus:
    "source-backed-retail-active-light-score-sort-known-cross-lane-insertion-blocked";
  retailActiveLightUploadSource: string;
  retailOrderingStatus: "blocked-no-recovered-retail-cross-lane-active-light-ordering";
  candidates: AreaRendererLightBudgetCandidateEvidence[];
}

export type AreaShadowDiagnosticEntrySource =
  | "area-root-shadow-field"
  | "processed-mdl-light-node"
  | "catalog-placeable-shadow-size";

export type AreaShadowDiagnosticEntrySeverity = "info" | "warning";

export type AreaShadowGlobalFieldName = "ShadowOpacity" | "SunShadows" | "MoonShadows";

export interface AreaShadowDiagnosticEntry {
  entryId: string;
  source: AreaShadowDiagnosticEntrySource;
  label: string;
  severity: AreaShadowDiagnosticEntrySeverity;
  note: string;
  areaId?: string;
  areaName?: string;
  field?: AreaShadowGlobalFieldName;
  value?: number;
  templateId?: string;
  resref?: string;
  nodeName?: string;
  shadow?: boolean;
  shadowSize?: number;
  rendererRank?: number;
  rendererAccepted?: boolean;
}

export interface AreaShadowDiagnostic {
  entries: AreaShadowDiagnosticEntry[];
  shadowRelevantEntries: number;
  sampledEntries: number;
  omittedEntries: number;
  globalShadowFields: number;
  areaShadowOpacityFields: number;
  areaSunShadowFields: number;
  areaMoonShadowFields: number;
  mdlShadowLightNodes: number;
  mdlExplicitNonShadowLightNodes: number;
  catalogShadowSizeTemplates: number;
}

export type AreaLightingAuditCoverageStatus =
  | "source-backed"
  | "preview-only"
  | "blocked"
  | "not-observed";

export type AreaLightingAuditCoverageKey =
  | "area-tile-light-color"
  | "area-tile-light-position"
  | "area-tile-source-light-proxy"
  | "area-tile-light-radius-falloff"
  | "area-global-lighting-fields"
  | "area-global-light-intensity"
  | "area-fog-range"
  | "area-shadow-opacity"
  | "area-shadow-volume-implementation"
  | "placeable-2da-light-color"
  | "placeable-2da-light-offset-shadow"
  | "placeable-lightstate-toggle"
  | "placeable-radius-falloff"
  | "mdl-light-node-radius-color-shadow"
  | "item-property-light-runtime-scheduler"
  | "progfx-type4-runtime-scheduler"
  | "renderer-active-light-budget"
  | "renderer-active-light-ordering";

export interface AreaLightingAuditCoverageEntry {
  key: AreaLightingAuditCoverageKey;
  label: string;
  status: AreaLightingAuditCoverageStatus;
  evidence: string;
  proof: string;
  blocker?: string;
}

export interface AreaLightingAuditGapEntry
  extends Omit<AreaLightingAuditCoverageEntry, "status"> {
  status: Exclude<AreaLightingAuditCoverageStatus, "source-backed">;
  nextStep: string;
}

export type AreaLightingRemainingRetailBlockerKey =
  | "retail-shadow-volume-projection-parity"
  | "retail-cross-lane-active-light-ordering"
  | "progfx-type4-priority-proximity-vision-scheduler";

export interface AreaLightingRemainingRetailBlocker {
  key: AreaLightingRemainingRetailBlockerKey;
  label: string;
  status: "blocked";
  affectedCoverageKeys: AreaLightingAuditCoverageKey[];
  evidence: string;
  proof: string;
  requiredEvidence: string;
  oracleCases: AreaLightingRetailOracleCase[];
  nextStep: string;
}

export interface AreaLightingRetailOracleCase {
  caseId: string;
  purpose: string;
  requiredArtifacts: string[];
  acceptanceGate: string;
  currentStatus: "missing-retail-oracle" | "partial-local-proof";
  currentEvidence: string[];
  blocker: string;
}

type AreaLightingAuditCoverageGapEntry = AreaLightingAuditCoverageEntry & {
  status: AreaLightingAuditGapEntry["status"];
};

export interface AreaLightingEvidenceReportOptions {
  processedMdlLightSources?: readonly AreaProcessedMdlLightSourceEvidence[];
  processedMdlLightTemplatesScanned?: number;
  processedMdlLightScanLimit?: number;
}

export interface AreaLightingEvidenceReport {
  summary: {
    areasScanned: number;
    tileLightTiles: number;
    tileLightReferences: number;
    tileLightAreas: number;
    areaGlobalLightingAreas: number;
    areaGlobalLightingFields: number;
    areaShadowOpacityAreas: number;
    placeableNameCandidates: number;
    placeableNameCandidateAreas: number;
    catalogLightSourceTemplates: number;
    catalogLightColorTemplates: number;
    catalogLightStateTemplates: number;
    processedMdlLightTemplatesScanned: number;
    processedMdlLightSourceTemplates: number;
    processedMdlLightNodes: number;
    processedMdlLightScanLimit: number;
    auroraActiveLightSlotCap: 128;
    rendererCandidateLights: number;
    rendererAcceptedLights: number;
    rendererDroppedLights: number;
    shadowDiagnosticEntries: number;
    shadowMdlLightNodes: number;
    shadowCatalogShadowSizeTemplates: number;
    auditCoverageEntries: number;
    auditCoverageSourceBacked: number;
    auditCoveragePreviewOnly: number;
    auditCoverageBlocked: number;
    auditCoverageNotObserved: number;
    auditGaps: number;
    remainingRetailBlockers: number;
  };
  tileLights: AreaTileLightingEvidence[];
  areaGlobalLighting: AreaGlobalLightingEvidence[];
  placeableNameCandidates: AreaPlaceableLightingCandidateEvidence[];
  catalogLightSources: AreaCatalogLightSourceEvidence[];
  processedMdlLightSources: AreaProcessedMdlLightSourceEvidence[];
  rendererLightBudget: AreaRendererLightBudgetDiagnostic;
  shadowDiagnostic: AreaShadowDiagnostic;
  auditCoverage: AreaLightingAuditCoverageEntry[];
  auditGaps: AreaLightingAuditGapEntry[];
  remainingRetailBlockers: AreaLightingRemainingRetailBlocker[];
}

const AURORA_ACTIVE_LIGHT_SLOT_CAP = 128 as const;
const RENDERER_LIGHT_BUDGET_SAMPLE_SIZE = AURORA_ACTIVE_LIGHT_SLOT_CAP + 32;
const SHADOW_DIAGNOSTIC_SAMPLE_SIZE = 160;
const RENDERER_LIGHT_BUDGET_PRIORITY_STRATEGY =
  "source-backed-mdl-lightmanager-score-then-diagnostic-lane-fallback" as const;
const RETAIL_MDL_LIGHT_SCORE_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:865838-865911 FUN_00a41850 writes per-light score at +0x84 from distance/radius/multiplier/priority fields";
const RETAIL_MDL_LIGHT_SORT_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:865710-865782 FUN_00a4165c/FUN_00a417bc sort active/shadow light lists with FUN_00a41694 comparator on +0x84";
const RETAIL_ACTIVE_LIGHT_SORT_SCORE_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:865731-865735 FUN_00a41694 compares active-light score field +0x84 with '<'; 865838-865911 FUN_00a41850 writes +0x84 from runtime camera distance, radius, multiplier, owner priority, and unresolved runtime fields before FUN_00a4165c/FUN_00a417bc sort the active/shadow lists";
const RETAIL_ACTIVE_LIGHT_SORT_SCORE_FORMULA =
  "ascending +0x84 score; invalid radius/multiplier/extent -> 100000; current-object lane -> -1; otherwise ((priority+1)*cameraDistance)/((field_0x70+4)*(rangeTerm+1)) where rangeTerm is 20 for static-owner lights or radius*multiplier*runtimeExtent";
const RETAIL_ACTIVE_LIGHT_SORT_DIRECTION = "ascending-score-field-0x84" as const;
const RETAIL_ACTIVE_LIGHT_SORT_SCORE_PROOF_STATUS =
  "source-backed-retail-active-light-score-sort-known-cross-lane-insertion-blocked" as const;
const RETAIL_ACTIVE_LIGHT_UPLOAD_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:866101-866425 FUN_00a41e50 applies min(configured,0x80), fades accepted lights, uploads special manager lights +0x70/+0x6c through FUN_00a40b60(...,0xffffffff,...), then uploads sorted active/shadow list slots through FUN_00a40b60 and clears unused slots with FUN_00a7817c";
const RETAIL_LIGHT_MANAGER_INTERNAL_INSERTION_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:865534-865548 FUN_00a4128c inserts a light into the manager all-lights list +0x8, the no-0x70 list +0x20, and the shadow/extra list +0x14 when field +0x40 is set and either +0x70 or +0x6c exists; 865598-865614 removes a light from all internal manager lists";
const RETAIL_LIGHT_MANAGER_CROSS_LANE_CALLSITE_BLOCKER =
  "FUN_00a4128c internal insertion and FUN_00a41e50 special-before-sorted slot upload are recovered, and retail LightManager methods are exported; source-only lightManagerSourceOrderingEvidence proofStatus=source-backed-lightmanager-insert-score-sort-upload-cross-lane-source-callsite-blocked reports directInsertionCallHits=[] and retailUploadOrderEvidence proofStatus=source-backed-lightmanager-special-lights-before-sorted-slot-upload, while backend/scripts/audit-retail-light-function-disasm.py capstone-free binary xrefs report LightManager targetCount=23/requestedTargetCount=4 with directCallXrefCount=23, requestedDirectCallXrefCount=0, absoluteAddressRefCount=12, absoluteVtableClusterEvidence proofStatus=retail-binary-backed-lightmanager-core-methods-rdata-vtable-cluster-no-direct-callsite cluster=0x140d85f78..0x140d85fd0 slotCount=12 requestedCoreSlotCount=4 contiguousSlots=true LightManagerNameDistanceBytes=157, and indirectVtableSlotCallEvidence proofStatus=capstone-free-lightmanager-vtable-slot-indirect-call-candidates-register-dataflow-blocked candidateCount=8626 slotCounts PrioritizeLights=5298/AddLight=617/RemoveLight=2520/UpdateLights=191 sampledCandidateCount=192 sampledCandidatesWithKnownDirectCallContextCount=16 sampledKnownDirectCallTargetSummary GetShadowLights=21/GetEmitterLighting=20/RenderLightRanges=10/Gob::CollectLights=10/GetNearestLights=3/CExoArrayList<PartLight>::Add=3/GetLensFlareLights=1; directCallTargetSummary shows helper/query direct calls only (GetMaxLights=10 calls/8 caller functions, GetEmitterLighting=3/2, GetShadowLights=3/2, SetHeadLightProperties=2/2, plus ctor/dtor/lensflare/nearest/render-ranges helpers with one call each), requestedDirectCallTargetSummary=[] for AddLight/PrioritizeLights/RemoveLight/UpdateLights, and indirect slot-offset candidates plus their sampled same-function direct-call context are helper/render/collect inventory without receiver/lane data-flow, so no direct, indirect, or symbolized call-site proves creation precedence into the same manager";
const RETAIL_LIGHT_MANAGER_FRAME_REBUILD_ORDER_SOURCE =
  "backend/scripts/audit-retail-light-function-disasm.py lightManagerSourceOrderingEvidence proofStatus=source-backed-lightmanager-frame-rebuild-sort-upload-cross-lane-owner-precedence-blocked; frameRebuildOrderingEvidence proofStatus=source-backed-lightmanager-frame-rebuild-vtable-dispatch-order-owner-lane-precedence-blocked maps scene LightManager pointer +0x108/param_1[0x42] from C:/Projects/New Folder/export/decompiled_all.c:905440-905446 FUN_00a40f10 construction, 913205-913227 virtual +0x18 rebuild reset, 918249-918258 spatial-cell light add through virtual +0x10 after local list insertion, 918383-918388 light remove through virtual +0x14 after local list pruning, and 919879-919960 frame update ordering through FUN_00a8b474/FUN_00a8db58, virtual +0x18/+0x1c, shadow-list +0x14 sampling, virtual +4 active sort/update, and active count +0x30; directProximityUploadEvidence proofStatus=source-backed-lightmanager-direct-proximity-upload-order covers FUN_00a42f5c optional headlight reservation, special +0x70/+0x6c upload, +0x8 all-light proximity scan, and unused-slot clear";
const RETAIL_SHADOW_VOLUME_PROJECTION_SOURCE =
  "backend/scripts/audit-retail-light-function-disasm.py shadowVolumeProjectionEvidence proofStatus=source-backed-shadowplane-shadowvol-shader-caster-path-stencil-face-op-render-state-slot3-and-local-draw-order-mapped-retail-parity-blocked, casterBufferPreparationEvidence proofStatus=source-backed-shadowvol-caster-buffer-prep-index-vertex-fill, casterBufferGeometryEvidence proofStatus=source-backed-shadowvol-caster-geometry-paired-vertex-index-buffer-fill with perSourceVertexRecords=2, indicesPerCasterEdge=6, maxCasterEdgeClamp=0x2aaa, casterDrawWrapperEvidence proofStatus=source-backed-shadowvol-caster-draw-wrapper-gl-dispatch, stencilOpSequenceEvidence proofStatus=source-backed-shadowvol-zpass-zfail-stencil-op-sequence-face-op-mapped with toolsetFaceOpTableEvidence proofStatus=source-backed-toolset-binary-glstencilopseparate-face-op-table-mapped, renderStateWrapperEvidence proofStatus=source-backed-shadowvol-render-state-slot3-gl-cull-face-stack-bracket-mapped with toolsetCapabilityEvidence proofStatus=source-backed-toolset-binary-render-state-slot3-gl-cull-face-mapped, blendDepthColorMaskWrapperEvidence proofStatus=source-backed-render-state-blend-depth-color-mask-wrappers-mapped, immediateCallerBufferFlushEvidence proofStatus=source-backed-shadowvol-immediate-caller-buffer-flush-no-blend-depth-color-mask-state-wrapper with blendDepthColorMaskCallHits=[], directCallerBufferBuilderEvidence proofStatus=source-backed-shadowvol-direct-caller-buffer-builder-no-blend-depth-color-mask-state-wrapper with blendDepthColorMaskCallHits=[], activeLightRenderEnvelopeEvidence proofStatus=source-backed-shadowvol-active-light-render-envelope-vtable-dispatch-blend-depthfunc-wrapper-exposed-parity-blocked with colorDepthMaskCallHits=[], localDrawStateOrderEvidence proofStatus=source-backed-shadowvol-local-draw-state-order-exposed-outer-blend-depth-color-mask-parity-blocked with localBlendDepthColorMaskCallHits=[], and shaderUniformEvidence proofStatus=source-backed-shadowvol-shader-bind-transform-and-uniform-slot-writes-exposed; frontendRuntimePortStatus=source-backed-shadowplane-shadowvol-shader-caster-path-zpass-zfail-stencil-render-state-slot3-preview-active-retail-face-op-mapped-parity-blocked; C:/Projects/New Folder/export/decompiled_all.c:888069-888414 FUN_00a5fdb4 is the direct caller/buffer builder, computes caster edges, calls FUN_00a878f8(DAT_00d0233c), allocates/maps caster buffers, transforms source vertices, writes paired w=1/w=0 records, fills six indices per caster edge, and has no blend/depth/color-mask raw or facade wrapper hits; 888188-888213 prepares shadow caster count/state, calls FUN_00a878f8(DAT_00d0233c) as a caster-buffer flush/capacity path, and updates light +0x68/+100 before allocating local_30*6 indices; 888245-888256 allocates/maps caster buffers through FUN_00a69868/FUN_00a6a370/FUN_00a6a6a4/FUN_00a6a6dc; 888319-888403 transforms source vertices through FUN_00b2f49c, writes paired vertex records at iVar23 + n*0x20 and iVar23 + 0x10 + n*0x20, fills six indices per caster edge through puVar13, and finalizes through FUN_00a6a798/FUN_00a6a754; 910553-910663 FUN_00a82464 sets DAT_00d0233c=param_1, exposes FUN_00a78724/FUN_00a7819c depthFunc/blendFunc facades around +0x138 and +0x108 vtable dispatch, restores slots 0/1/4/5, clears DAT_00d0233c, and has no color/depth-mask wrapper hit; 910673-910872 FUN_00a82d8c renders shadow-plane alpha with ShadowOpacity factor; 911283-911418 FUN_00a83fec recomputes runtime extents; 913914-914017 FUN_00a878f8 shadowvol path loads vs_shadowvol/fs_shadowvol and renders caster geometry from light radius/shadowradius/verticaldisplacement; 913929 calls FUN_00a7818c(3) before shadow-volume draw, 913986-913987 sets FUN_00a78344(0,0,0,3) and FUN_00a78344(1,0,0,4), 913996 pushes render state through FUN_00a780f0, 913999 transforms the shadow light matrix through FUN_00a785d4, 914001 binds DAT_00d0247c through FUN_00a788b0, 914002 writes uniform slot 0 through FUN_00a78994, 914012 writes uniform slot 1 scalar through FUN_00a78980, 914025 pops through FUN_00a780e8, and 914027 restores slot 3 through FUN_00a7816c(3); 914032-914033 switches to FUN_00a78344(0,0,4,0) and FUN_00a78344(1,0,3,0); 913929-914033 local draw-state order, 888188-888213 immediate caller, 888069-888414 direct caller/buffer-builder, and 910553-910663 active-light render envelope have no color/depth-mask wrapper hit, so indirect inherited render-state parity remains blocked; 896387-896475 FUN_00a6c44c/FUN_00a6c520 pop/push 0x40-byte render-state blocks; 898307-898416 FUN_00a6ef90/FUN_00a6f0bc set/clear _DAT_00d01c0c slot bits and dispatch glEnable/glDisable; 898421-898425 maps FUN_00a6f1ec to glBlendFunc, 898533-898563 maps FUN_00a6f3bc to glColorMask, 898618-898624 maps FUN_00a6f4f8 to glDepthMask, and 898630-898634 maps FUN_00a6f518 to glDepthFunc; 904153-904157 maps facade FUN_00a7819c to FUN_00a6f1ec, 904335-904339 maps facade FUN_00a78384 to FUN_00a6f3bc, 904542-904546 maps facade FUN_00a785bc to FUN_00a6f4f8, and 904686-904690 maps facade FUN_00a78724 to FUN_00a6f518; 904308-904311 FUN_00a78344 wraps FUN_00a6f2b4 before PTR_DAT_00d3dd6c dispatch; 904560-904969 FUN_00a785d4/FUN_00a788b0/FUN_00a78994/FUN_00a78980 wrap transform, shader-bind, vec4 uniform-slot, and scalar uniform-slot writes; 897399-897403 FUN_00a482a8 updates the matrix source, 902170-902176 FUN_00a74fd0 binds the shader program, 900870-900884 FUN_00a7278c writes vec4 uniforms, and 900852-900857 FUN_00a72764 writes scalar uniforms; C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe .data maps 0x00d3dd6c -> 0x00d12d20 glStencilOpSeparate proc pointer, face table 0xcc9a38 slot 0=GL_FRONT/0x404 slot 1=GL_BACK/0x405, and op table 0xcc99d8 slot 0=GL_KEEP/0x1e00 slot 3=GL_INCR/0x1e02 slot 4=GL_DECR/0x1e03; nwtoolset.exe .text jump tables 0xa6efc4/0xa6f0f2 map render-state slot 3 to push 0x0b44 before glEnable/glDisable, i.e. GL_CULL_FACE; 904108-904112 FUN_00a78128 wraps FUN_00a75e3c; 902867-902912 FUN_00a75e3c binds buffers and dispatches through PTR_DAT_00d3dda8 or glDrawArrays";
const RETAIL_SHADOW_VOLUME_LIGHT_PROFILE_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:913930-913955 uses point-light shadow profile when light radius +0x58 <= 1000, chooses shadowradius +0x60 when positive else radius +0x58, and adds verticaldisplacement +0x64 to position z; 913956-913980 uses a directional/distant profile when radius +0x58 > 1000; 913986-914017 walks scene geometry buckets 0xd/0xe/0xb/0xc for shadowvol caster draws";
const RETAIL_SHADOW_VOLUME_PROJECTION_BLOCKER =
  "Aurora Web now has frontend helpers for the retail paired-vertex/six-index caster buffer schema, an equivalent Three BufferGeometry preserving the homogeneous w record as auroraShadowVolumeW, placeable fast-shadow proxies bind a source-quad caster buffer through that helper, an active Three ShaderMaterial w-pair extrusion preview uses the recovered shadowradius/verticaldisplacement profile, a WebGL stencil front/back z-pass/z-fail receiver lane uses the retail-mapped GL_FRONT/GL_BACK plus GL_KEEP/GL_INCR/GL_DECR sequence, render-state wrapper slot 3 is mapped to GL_CULL_FACE through the nwtoolset.exe jump tables, local draw-state order from FUN_00a878f8 is exposed, and FUN_00a82464 active-light render envelope evidence narrows inherited state to indirect +0x138/+0x108 vtable dispatch with exposed depthFunc/blendFunc facades but no color/depth-mask wrapper hit; the runtime probe exposes local caster/receiver/pass counts for CDP pixel capture; pixel/geometry/complete wrapped render-state parity against FUN_00a878f8 -> FUN_00a78128 -> FUN_00a75e3c, indirect vtable inherited state, and retail/toolset shadow-volume output are still not proven";
const RETAIL_CROSS_LANE_ORDERING_PROOF_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:865534-865548 recovers FUN_00a4128c internal LightManager insertion into +0x8/+0x20/+0x14 lists; 865714-866424 recovers active-light score/sort/upload and slot cap; 866325-866425 recovers FUN_00a41e50 upload order where special manager lights +0x70/+0x6c use slot 0xffffffff before sorted list slots; source-only lightManagerSourceOrderingEvidence proofStatus=source-backed-lightmanager-insert-score-sort-upload-cross-lane-source-callsite-blocked reports directInsertionCallHits=[] and retailUploadOrderEvidence proofStatus=source-backed-lightmanager-special-lights-before-sorted-slot-upload; 453567-453602 creates terrain source-light fx_flame01 carriers; retail ApplyLight bridge now recovers item-property lights through VFX_DUR_LIGHT CGameEffect rows; 348244 loads visualeffects.2da without a recovered progfx.2da runtime scheduler; backend/scripts/audit-retail-light-function-disasm.py capstone-free lightManagerRetailXrefs on nwmain.exe reports LightManager targetCount=23/requestedTargetCount=4, directCallXrefCount=23, requestedDirectCallXrefCount=0, directCallTargetSummary helper/query calls only (GetMaxLights=10 calls/8 caller functions, GetEmitterLighting=3/2, GetShadowLights=3/2, SetHeadLightProperties=2/2, plus ctor/dtor/lensflare/nearest/render-ranges single-call helpers), requestedDirectCallTargetSummary=[] for AddLight/PrioritizeLights/RemoveLight/UpdateLights, absoluteAddressRefCount=12, absoluteVtableClusterEvidence proofStatus=retail-binary-backed-lightmanager-core-methods-rdata-vtable-cluster-no-direct-callsite cluster=0x140d85f78..0x140d85fd0 slotCount=12 requestedCoreSlotCount=4 contiguousSlots=true, indirectVtableSlotCallEvidence proofStatus=capstone-free-lightmanager-vtable-slot-indirect-call-candidates-register-dataflow-blocked candidateCount=8626 slotCounts PrioritizeLights=5298/AddLight=617/RemoveLight=2520/UpdateLights=191 sampledCandidateCount=192 sampledCandidatesWithKnownDirectCallContextCount=16 sampledKnownDirectCallTargetSummary GetShadowLights=21/GetEmitterLighting=20/RenderLightRanges=10/Gob::CollectLights=10/GetNearestLights=3/CExoArrayList<PartLight>::Add=3/GetLensFlareLights=1; frontend runtime probe now emits local required-lane coverage and local preview order samples for tile/placeable/MDL/item/ProgFX lanes through retailOrderingRuntimeProbe fields, but helper/query direct calls, core-method vtable slots, and generic indirect slot-offset candidates are visible only as helper/render/collect traffic and no common insertion call-site or vtable dispatch owner proving retail cross-lane creation precedence is recovered";
const LOOPING_VISUAL_EFFECT_MESSAGE_UPDATE_PROOF_SOURCE =
  "backend/scripts/audit-retail-light-function-disasm.py extracts nwmain.exe CNWSMessage::UpdateLastUpdateObject 0x1404e5700..0x1404e6305 proofStatus=source-backed-cnwsmessage-lastupdate-visual-transform-and-looping-vfx-list-store, copying CNWSObject.loopingVisualEffects at +0x160 into CLastUpdateObject.loopingVisualEffectsSnapshot at +0x108 via helper 0x1404c76b0 and calling CLastUpdateObject::SetVisualTransformData at 0x1404e584e; CNWSMessage::ComputeUpdateRequired 0x1404ca840..0x1404cba1a proofStatus=source-backed-cnwsmessage-computeupdate-looping-vfx-list-compare-offsets-0x108-0x160, comparing CLastUpdateObject+0x108 against CNWSObject+0x160 through CompareVisualEffectLists calls at 0x1404caac1 and 0x1404cb4cb; both message/update functions report blocked-no-direct-render-light-call-from-message-update-function";
const LOOPING_VISUAL_EFFECT_NETWORK_UPDATE_PROOF_SOURCE =
  "backend/scripts/audit-retail-light-function-disasm.py extracts nwmain.exe CNWSMessage::WriteGameObjUpdate_UpdateObject 0x1404eb590..0x1404edc4a proofStatus=source-backed-cnwsmessage-writegameobjupdate-looping-vfx-serializes-record-fields, reading CNWSObject+0x160 and CLastUpdateObject+0x108, calling CLoopingVisualEffect::GetIsBeam at 0x1404ec33e/0x1404ec4ec/0x1404ec74b/0x1404ec9ef, and writing record fields through CNWMessage::WriteBYTE, CNWMessage::WriteWORD, CNWSMessage::WriteOBJECTIDServer, and ObjectVisualTransformData::Write at 0x1404eca3a; it reports blocked-no-direct-render-light-call-from-network-update-writer";
const LOOPING_VISUAL_EFFECT_CLIENT_RECEIVE_RENDER_PROOF_SOURCE =
  "backend/scripts/audit-retail-light-function-disasm.py extracts nwmain.exe clientVisualEffectReceiveRenderEvidence proofStatus=source-backed-cnwcmessage-client-vfx-receive-vtable-add-newcaurobject-mdl-gob-light-path: CNWCMessage dispatch calls HandleServerToPlayerGameObjectUpdate at 0x1407a4843, HandleServerToPlayerUpdate_Update at 0x14079be47, and HandleServerToPlayerUpdateVisualEffects from generic/creature update paths at 0x14079cd60/0x140782fb1; HandleServerToPlayerUpdateVisualEffects 0x1407b1f00..0x1407b23db reads count/action/visualEffectId/objectId/subtype/ObjectVisualTransformData through ReadWORD/ReadBYTE/client object-id/helper calls, maps actions 0x41/0x44 to client object vtable slots +0x178/+0x180; CNWCObject/CNWCCreature/CNWCDoor/CNWCTrigger/CNWCPlaceable/CNWCVisualEffect/CNWCAreaOfEffectObject vtables resolve those slots to 0x140762180/0x140762ad0, with CNWCItem also exposing item-specific slots 0x140765b00/0x140765bd0; slot +0x178 calls CNWCVisualEffectOnObject::LoadVisualEffect 0x14096cf10 then CExoLinkedListInternal::AddTail at 0x1407622c6 and refresh/node-attach helpers, while visual-effect loaders create CAurObject/Gob instances through NewCAurObject for fxground/fximpact/fxhead and fx_light; generic MdlNodeLight::InternalCreateInstance proof in the same report proves MDL AuroraLight nodes create PartLight and attach to Gob+0x470";
const ITEM_PROPERTY_LIGHT_RUNTIME_SCHEDULER_PROOF_SOURCE =
  "C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwserver.exe exports CNWSItemPropertyHandler::ApplyLight at 0x140405e40 plus CNWSEffectListHandler::OnApplyLight 0x1403c28d0 and OnRemoveLight 0x1403cb370; nwmain.exe exports the same light handlers at 0x140472270/0x14042ed70/0x140437810 and LightManager Add/Prioritize/Remove/Update at 0x14007dbd0/0x14007ff60/0x1400802d0/0x140081100; backend/scripts/audit-retail-light-function-disasm.py disassembles nwmain.exe ApplyLight 0x140472270..0x1404723e4 sha256 f8f65f048d2955e1e99a74c96a10d397950d68d0ec9c35909d20e611a6796376 and extracts applyLightItemPropertyBridge: color byte [CNWItemProperty+9] jump-table maps iprp_color values 0..6 to VFX_DUR_LIGHT base rows 153/157/161/165/177/169/173 for Blue/Yellow/Purple/Red/Green/Orange/White, brightness word [CNWItemProperty+6] adds 0..3 for Dim/Low/Normal/Bright, createdCGameEffectSizeBytes=272, and internalApplyTargetVa=0x14048e350; the same script extracts nwmain.exe OnApplyVisualEffect 0x140434fc0..0x140435635 reading CGameEffect GetObjectID(0), GetInteger(0/1/2), GetFloat(0), GetVector(0/1), calling CNWSObject::AddLoopingVisualEffect at 0x140435400 and CNWSMessage::SendServerToPlayerGameObjUpdateVisEffect at 0x140435598; OnRemoveVisualEffect 0x140439730..0x140439ac7 calls CNWSObject::RemoveLoopingVisualEffect at 0x140439a75; CNWSObject::AddLoopingVisualEffect 0x14048da00..0x14048db90 writes 32-byte CLoopingVisualEffect records to the owner list at CNWSObject+0x160 with count +0x168 and capacity +0x16c, while RemoveLoopingVisualEffect 0x140498960..0x140498ae1 removes from the same list; CLoopingVisualEffect layout stores visualEffectId +0x0, objectId +0x4, subtype/flags +0x8, transform data +0x10, default object id 0x7f000000; the same script extracts mdlNodeLightPartLightLifecycle from nwmain.exe MdlNodeLight::InternalCreateInstance 0x140091980 with createdPartLightSizeBytes=192, inlinePartLightVtableWriteCount=2, gobPartLightListOffsets=0x470, and partLightListAddCalls CExoArrayList<PartLight>::Add at 0x140091acc, plus Gob::CollectLights evidence with AsPartLight vtable call 0x14008cdba and recursive PartLight list writes; OnRemoveLight disassembles via linear fallback to mov eax,1; ret in nwserver.exe 0x1403cb370..0x1403cb376 and nwmain.exe 0x140437810..0x140437816, so this export does not contain client PartLight removal; C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/data/nwn_base.key -> base_2da.bif contains itempropdef.2da row 44 costtable=18/param1=9, iprp_costtable.2da row 18 IPRP_LIGHTCOST ClientLoad=1, iprp_paramtable.2da row 9 IPRP_COLOR, iprp_lightcost.2da rows 1..4 Dim 5m/Low 10m/Normal 15m/Bright 20m, and iprp_color.2da rows 0..6 Blue/Yellow/Purple/Red/Green/Orange/White; retail resources map VFX_DUR_LIGHT visualeffects.2da rows 153..180 to explicit progfx.2da Type 4 normal rows 300..327/fade rows 350..377 and fx_light_clr.mdl animations; progfx.2da Type 4 Param3 provides item-light cast-shadow toggle with 5m rows=0 and 10m/15m/20m rows=1; object-level looping VFX owner add/remove, message diff/serialization, client receive/render/Gob instantiation, and generic MDL light-node PartLight creation/Gob-list attach are recovered for the fx_light_clr.mdl source family; cross-lane ordering and retail shadow-volume projection parity are still unrecovered";
const ITEM_PROPERTY_LIGHT_RUNTIME_SCHEDULER_BLOCKER =
  "Retail ApplyLight bridge, retail KEY/BIF item-light tables, object-level looping VFX owner add/remove, CNWSMessage last-update copy/diff, CNWSMessage game-object update serialization, client receive/render/Gob instantiation through CNWCMessage/CNWCObject/NewCAurObject, generic MdlNodeLight PartLight creation/Gob-list attach, and progfx.2da Param3 item-light shadow toggle are recovered, but cross-lane insertion order and retail shadow-volume projection parity are not recovered; preview uses source-family fx_light_clr radius/RGB and maps shadow toggles from retail Param3";
const PROGFX_TYPE4_RUNTIME_SCHEDULER_PROOF_SOURCE =
  "nwn_base.key progfx.2da Type 4 Param1..Param7 rows are table-backed and raw-preserved; " +
  "backend/scripts/audit-retail-progfx-type4-table.ts over retail nwn_base.key reports progfx rowCount=1301, type4RowCount=68, itemLightNormalRowCount=28, itemLightFadeRowCount=28, nonItemType4RowCount=12, animationKindCounts light=56 vision=10 unknown=2, Param3 castShadows true=42 false=26, Param4 priorityRawCounts 13=2/20=56/49..53=2 each, Param5 proximity true=8 false=60, Param6 attachToScene true=2 false=66, modelCounts fx_light_clr=68, nonItemRows=[328,329,330,331,332,333,378,379,380,381,382,383], nonItemCastShadowRows=[], proximityRows=[328,329,330,332,378,379,380,382], attachRows=[333,383], visionRows=[328,329,330,331,333,378,379,380,381,383], and proofStatus=source-backed-progfx-type4-table-parameter-distribution-runtime-scheduler-blocked; " +
  "C:/Projects/New Folder/export/decompiled_all.c:348244 loads visualeffects.2da; source-only progfxType4SourceSchedulerEvidence proofStatus=source-backed-visualeffects-loader-progfx-type4-scheduler-not-in-source-only-decompilation reports runtimeSchedulerStringHitCount=0 and schedulerStringHits=[] for progfx.2da/fx_light_clr/Blind_Vision/Param3-6 scheduler needles; localResourceDumpEvidence proofStatus=source-backed-local-reference-root-lacks-progfx-type4-scheduler-resource-dump reports missingResourceNames=[progfx.2da,visualeffects.2da,fx_light_clr.mdl,fx_light_clr.mdb] in the available C:/Projects/New Folder dump; backend/scripts/audit-retail-light-function-disasm.py now recovers OnApplyVisualEffect/OnRemoveVisualEffect object-level looping VFX owner add/remove through CNWSObject+0x160/+0x168, CNWSMessage last-update copy/diff through CLastUpdateObject+0x108/CNWSObject+0x160, CNWSMessage game-object update serialization, and nwmain.exe clientVisualEffectReceiveRenderEvidence proofStatus=source-backed-cnwcmessage-client-vfx-receive-vtable-add-newcaurobject-mdl-gob-light-path; clientObjectVisualEffectLifecycle proofStatus=source-backed-client-object-add-remove-refresh-looping-vfx-path; visualEffectSourceModelLoaders proofStatus=source-backed-client-vfx-loadvisualeffect-newcaurobject-model-loader-path with LoadVisualEffect-progfx-source-loader 0x14096cf10, fx-light-loader-region 0x14096c610, fx_light string refs, and NewCAurObject/Gob creation; current capstone-free fallback now reports clientVisualEffectReceiveRenderEvidence proofStatus=source-backed-capstone-free-cnwcmessage-client-vfx-callgraph-vtable-loader-path-scheduler-dataflow-blocked, messageDispatchChain proofStatus=source-backed-capstone-free-cnwcmessage-client-vfx-update-dispatch-chain, clientKnownFunctionCallgraph proofStatus=source-backed-capstone-free-client-vfx-message-owner-loader-callgraph, missingExpectedDirectCallTargets=[], clientVisualEffectSchedulerDataFlowProofStatus=blocked-capstone-free-callgraph-proves-vfx-loader-object-attach-not-progfx-param-scheduler-dataflow; capstoneFreeCallTargetEvidence proofStatus=capstone-free-binary-relative-call-target-scan-ran, clientVisualEffectDirectCallXrefCount=1502, clientVisualEffectObservedTargetFamilies=[message-readers,visual-transform-reader,looping-vfx-list-attach,progfx-source-loader,vfx-2da-row-loader,fx-light-loader-region,aurora-object-gob-construction,runtime-state-scene-helpers], legacyDirectCallScanSchedulerStatus=blocked-direct-call-targets-show-vfx-loader-object-attach-not-progfx-param-scheduler-dataflow, top direct target groups ReadBYTE=416, ReadFLOAT=297, object-id-read=174, ReadWORD=156, NewCAurObject=116, AddTail=57, plus string hits for ProgFX_Impact/ProgFX_Duration/ProgFX_Cessation/fx_light, but cannot recover Param3/4/5/6 scheduler data-flow; generic MDL AuroraLight PartLight creation remains source-backed through MdlNodeLight::InternalCreateInstance; Beamdog patch 8193.15 documents progfx.2da unhardcoding but not priority/proximity/shadow runtime semantics";
const PROGFX_TYPE4_CAPSTONE_FREE_CLIENT_CALLGRAPH_SOURCE =
  "backend/scripts/audit-retail-light-function-disasm.py capstone-free nwmain.exe clientVisualEffectReceiveRenderEvidence proofStatus=source-backed-capstone-free-cnwcmessage-client-vfx-callgraph-vtable-loader-path-scheduler-dataflow-blocked; messageDispatchChain proofStatus=source-backed-capstone-free-cnwcmessage-client-vfx-update-dispatch-chain; clientKnownFunctionCallgraph proofStatus=source-backed-capstone-free-client-vfx-message-owner-loader-callgraph; missingExpectedDirectCallTargets=[]; clientVisualEffectSchedulerDataFlowProofStatus=blocked-capstone-free-callgraph-proves-vfx-loader-object-attach-not-progfx-param-scheduler-dataflow";
const PROGFX_TYPE4_DOCS_POLICY_SOURCE =
  "nwn.wiki progfx.2da Type 4 docs updated 2026-02-18 documents Param4 priority lower value wins and 0 always applies, Param5 proximity suppression near another light source, Param6 Beamdog Attach to scene removal of scene lights while the effect is active, and Type 4 vision/light rows using fx_light_clr Param1 animations; Beamdog patch 8193.15 documents progfx.2da unhardcoding";
const PROGFX_TYPE4_VISUALEFFECT_OWNER_PROOF_SOURCE =
  "backend/scripts/audit-retail-progfx-type4-table.ts also maps retail visualeffects.2da owner phases: type4OwnerPhaseCount=77, itemLightOwnerPhaseCount=56, nonItemOwnerPhaseCount=21, ownerPhaseCounts impact=0 duration=39 cessation=38, nonItemCastShadowOwnerPhaseCount=0, nonItemAttachToSceneOwnerPhaseCount=1, nonItemProximitySuppressionOwnerPhaseCount=18, nonItemOwnerLabels=[VFX_DUR_BLACKOUT,VFX_DUR_DARKVISION,VFX_FNF_SOUND_BURST,VFX_FNF_STRIKE_HOLY,VFX_DUR_BLINDVISION,VFX_DUR_LOWLIGHTVISION,VFX_DUR_ULTRAVISION,VFX_DUR_BLIND,VFX_FNF_SOUND_BURST_SILENT,VFX_FNF_TELEPORT_IN,VFX_FNF_TELEPORT_OUT], proofStatus=source-backed-visualeffects-progfx-type4-owner-phase-map-runtime-scheduler-blocked";
const PROGFX_TYPE4_RUNTIME_SCHEDULER_FULL_PROOF_SOURCE = `${PROGFX_TYPE4_RUNTIME_SCHEDULER_PROOF_SOURCE}; ${PROGFX_TYPE4_CAPSTONE_FREE_CLIENT_CALLGRAPH_SOURCE}; ${PROGFX_TYPE4_VISUALEFFECT_OWNER_PROOF_SOURCE}; ${PROGFX_TYPE4_DOCS_POLICY_SOURCE}`;
const PROGFX_TYPE4_RUNTIME_SCHEDULER_BLOCKER =
  "ProgFX Type 4 Param3 values are source-table backed, Param4/Param5/Param6/vision policy semantics are docs-backed from progfx.2da, and object-level looping VFX owner add/remove, CNWSMessage last-update copy/diff, CNWSMessage game-object update serialization, client receive/render object attach, fx_light NewCAurObject/Gob model instantiation, and generic MDL PartLight creation are source-backed; retail table/owner-phase audit reports nonItemCastShadowRows=[] and nonItemCastShadowOwnerPhaseCount=0, so vanilla non-item Type 4 shadow-casting rows are source-backed absent; source-only decompiled_all.c still has no progfx.2da/fx_light_clr/Blind_Vision scheduler string hit, localResourceDumpEvidence does not expose progfx.2da/visualeffects.2da/fx_light_clr scheduler resource files in the available C:/Projects/New Folder dump, and decompiled_all.c does not expose the retail scheduler data-flow, so remaining blocked semantics are cross-lane insertion order, exact owner grouping, proximity distance threshold, scene-light restore timing, and pixel/runtime vision mutation parity";
const AREA_GLOBAL_LIGHT_COLOR_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:256239-256303 selects Sun/Moon ambient+diffuse fields by IsNight, unpacks packed channels as byte0/byte1/byte2 divided by 255.0, then sends controlpart gidy_sun_amb/gidy_sun_diff color commands";
const AREA_FOG_RANGE_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:368987-369024 enables scene fog, selects Sun/Moon FogAmount/FogColor by IsNight, unpacks fog color as byte0/byte1/byte2 divided by 255.0, computes fog start as 25 - FogAmount*25/15, and reads FogClipDist from area offset +0x100 for fog end";
const MDL_LIGHT_NODE_FIELD_PARSER_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:883029-883250 FUN_00a5872c parses AuroraLight color into +0x54, radius into +0x58, shadowradius into +0x60, verticaldisplacement into +0x64, multiplier into +0x8c, shadow into +0xc0, and lightpriority into +0xb0";
const MDL_LIGHT_NODE_FIELD_PARSER_PROOF_STATUS =
  "source-backed-mdl-auroralight-field-parser";
const RETAIL_MDL_LIGHT_SCORE_PROOF_STATUS =
  "source-backed-mdl-lightmanager-score-exact-runtime-inputs-not-available-in-area-audit" as const;
const RETAIL_MDL_LIGHT_PREVIEW_SCORE_PROOF_STATUS =
  "source-backed-retail-lightmanager-score-preview-input-fallback" as const;
const RETAIL_MDL_LIGHT_PREVIEW_SCORE_SORT_DIRECTION =
  "ascending-score-field-0x84-preview" as const;
const RETAIL_MDL_LIGHT_PREVIEW_SCORE_FALLBACK =
  "area-audit-object-local-distance-field0x70-zero-runtimeextent-one-cross-lane-callsite-blocked";
const RETAIL_MDL_LIGHT_PREVIEW_SCORE_FORMULA =
  "invalid radius/multiplier/extent -> 100000; current-object lane -> -1; otherwise ((priority+1)*previewDistance)/((field0x70+4)*(rangeTerm+1)), rangeTerm=sourceRadius*multiplier*runtimeExtent";
const DIAGNOSTIC_CROSS_LANE_PRIORITY_SOURCE =
  "diagnostic fallback: exact FUN_00a41850 score requires runtime camera/object manager state and recovered lane insertion order";
const TILE_SOURCE_LIGHT_PROXY_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:453567-453602 creates fx_flame01 at sourcelight1/sourcelight2 tile source-light nodes";
const TILE_MAIN_LIGHT_STATIC_COLOR_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:453281 loads lightcolor.2da for tile runtime; 453323-453528 resolves RGB channels for Tile_MainLight1/Tile_MainLight2 through FUN_00af3980; no FUN_00a546cc fx/AuroraLight carrier is created for main lights in this path";
const TILE_SOURCE_LIGHT_RADIUS_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:453567-453602 creates fx_flame01 at sourcelight1/sourcelight2 tile source-light nodes; nwn_base.key fx_flame01.mdl AuroraLight01 radius 0x58 = 7, shadowradius 0x60 = 15, verticaldisplacement 0x64 = 2; C:/Projects/New Folder/export/decompiled_all.c:866543-866563 proves linear max(0,1-distance/radius) active-light falloff";
const PLACEABLE_TWO_DA_LIGHT_RADIUS_SOURCE =
  "nwmain.exe CNWCArea::AddPlaceableObjectLight uses fx_placeable01/AuroraLight01; nwn_base.key fx_placeable01.mdl controller radius 0x58 = 10, shadowradius 0x60 = 15, verticaldisplacement 0x64 = 3; C:/Projects/New Folder/export/decompiled_all.c:866543-866563 proves linear max(0,1-distance/radius) active-light falloff";
const PLACEABLE_TWO_DA_SHADOW_SIZE_SOURCE =
  "nwmain.exe 0x1408708c0..0x140870b0a CNWPlaceable::LoadLight reads placeables.2da ShadowSize and maps 0->Fx_Shadow_S, 2->Fx_Shadow_L, otherwise Fx_Shadow_M; extracted nwn_base.key Fx_Shadow_* binary MDL emitters provide size/alpha/projection metadata";
const PLACEABLE_LIGHTSTATE_DEFAULT_SOURCE =
  "C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwserver.exe .pdata function 0x1404484d0..0x14044a2ec contains LightState xref at 0x140448ed0 and mov [rbx+0x368],1 at 0x140448eb5 before the optional LightState read";
const PLACEABLE_ILLUMINATION_TOGGLE_SOURCE =
  "C:/Projects/New Folder/item-retail-extract/nss/nwscript.nss:8750-8765 exposes SetPlaceableIllumination/GetPlaceableIllumination and requires RecomputeStaticLighting";
const AREA_SHADOW_FIELD_NAMES = ["ShadowOpacity", "SunShadows", "MoonShadows"] as const;

const PLACEABLE_LIGHT_TOKEN_PATTERNS: Array<[string, RegExp]> = [
  ["light", /(?:^|[^a-z0-9])light(?:$|[^a-z0-9]|shaft|blob|beam|source)/iu],
  ["lamp", /lamp/iu],
  ["torch", /torch/iu],
  ["lantern", /lantern/iu],
  ["candle", /candle|cndl/iu],
  ["brazier", /brazier/iu],
  ["sconce", /sconce/iu],
  ["fire", /fire|flame|campfr|campfire/iu],
  ["magic", /magic/iu],
  ["source-of-light", /(?:^|[^a-z0-9])sol(?:$|[^a-z0-9])/iu]
];

export function buildAreaLightingEvidenceReport(
  areas: readonly AreaRecord[],
  catalogLightSources: readonly AreaCatalogLightSourceInput[] = [],
  options: AreaLightingEvidenceReportOptions = {}
): AreaLightingEvidenceReport {
  const tileLights = areas.flatMap((area) => collectTileLightingEvidence(area));
  const areaGlobalLighting = areas.flatMap((area) => collectAreaGlobalLightingEvidence(area));
  const placeableNameCandidates = areas.flatMap((area) =>
    collectPlaceableLightingCandidateEvidence(area)
  );
  const catalogEvidence = catalogLightSources.map(mapCatalogLightSourceEvidence);
  const processedMdlLightSources = [...(options.processedMdlLightSources ?? [])];
  const rendererLightBudget = buildRendererLightBudgetDiagnostic({
    tileLights,
    placeableNameCandidates,
    catalogLightSources: catalogEvidence,
    processedMdlLightSources
  });
  const shadowDiagnostic = buildShadowDiagnostic({
    areaGlobalLighting,
    catalogLightSources: catalogEvidence,
    processedMdlLightSources,
    rendererLightBudget
  });
  const auditCoverage = buildAreaLightingAuditCoverage({
    tileLights,
    areaGlobalLighting,
    catalogLightSources: catalogEvidence,
    processedMdlLightSources,
    rendererLightBudget,
    shadowDiagnostic
  });
  const auditGaps = buildAreaLightingAuditGaps(auditCoverage);
  const remainingRetailBlockers = buildRemainingRetailBlockers();
  return {
    summary: {
      areasScanned: areas.length,
      tileLightTiles: tileLights.length,
      tileLightReferences: tileLights.reduce(
        (sum, tile) => sum + countActiveTileLightReferences(tile),
        0
      ),
      tileLightAreas: new Set(tileLights.map((tile) => tile.areaId)).size,
      areaGlobalLightingAreas: areaGlobalLighting.length,
      areaGlobalLightingFields: areaGlobalLighting.reduce(
        (sum, areaLighting) => sum + areaLighting.fields.length,
        0
      ),
      areaShadowOpacityAreas: areaGlobalLighting.filter((areaLighting) =>
        areaLighting.fields.some((field) => field.field === "ShadowOpacity")
      ).length,
      placeableNameCandidates: placeableNameCandidates.length,
      placeableNameCandidateAreas: new Set(
        placeableNameCandidates.map((candidate) => candidate.areaId)
      ).size,
      catalogLightSourceTemplates: catalogEvidence.length,
      catalogLightColorTemplates: catalogEvidence.filter((entry) =>
        entry.evidence.includes("placeables.2da.LightColor")
      ).length,
      catalogLightStateTemplates: catalogEvidence.filter((entry) =>
        entry.evidence.includes("utp.LightState")
      ).length,
      processedMdlLightTemplatesScanned: options.processedMdlLightTemplatesScanned ?? 0,
      processedMdlLightSourceTemplates: processedMdlLightSources.length,
      processedMdlLightNodes: processedMdlLightSources.reduce(
        (sum, source) => sum + source.nodes.length,
        0
      ),
      processedMdlLightScanLimit: options.processedMdlLightScanLimit ?? 0,
      auroraActiveLightSlotCap: AURORA_ACTIVE_LIGHT_SLOT_CAP,
      rendererCandidateLights: rendererLightBudget.candidateLights,
      rendererAcceptedLights: rendererLightBudget.acceptedLights,
      rendererDroppedLights: rendererLightBudget.droppedLights,
      shadowDiagnosticEntries: shadowDiagnostic.shadowRelevantEntries,
      shadowMdlLightNodes: shadowDiagnostic.mdlShadowLightNodes,
      shadowCatalogShadowSizeTemplates: shadowDiagnostic.catalogShadowSizeTemplates,
      auditCoverageEntries: auditCoverage.length,
      auditCoverageSourceBacked: countAuditCoverageByStatus(auditCoverage, "source-backed"),
      auditCoveragePreviewOnly: countAuditCoverageByStatus(auditCoverage, "preview-only"),
      auditCoverageBlocked: countAuditCoverageByStatus(auditCoverage, "blocked"),
      auditCoverageNotObserved: countAuditCoverageByStatus(auditCoverage, "not-observed"),
      auditGaps: auditGaps.length,
      remainingRetailBlockers: remainingRetailBlockers.length
    },
    tileLights,
    areaGlobalLighting,
    placeableNameCandidates,
    catalogLightSources: catalogEvidence,
    processedMdlLightSources,
    rendererLightBudget,
    shadowDiagnostic,
    auditCoverage,
    auditGaps,
    remainingRetailBlockers
  };
}

type AreaTileLightingReferenceKey = "mainLight1" | "mainLight2" | "sourceLight1" | "sourceLight2";
type AreaTileLightingColorKey =
  | "mainLight1Color"
  | "mainLight2Color"
  | "sourceLight1Color"
  | "sourceLight2Color";

interface AreaRendererLightBudgetCandidateDraft
  extends Omit<AreaRendererLightBudgetCandidateEvidence, "rank" | "accepted" | "dropReason"> {}

interface RendererLightBudgetInput {
  tileLights: readonly AreaTileLightingEvidence[];
  placeableNameCandidates: readonly AreaPlaceableLightingCandidateEvidence[];
  catalogLightSources: readonly AreaCatalogLightSourceEvidence[];
  processedMdlLightSources: readonly AreaProcessedMdlLightSourceEvidence[];
}

interface ShadowDiagnosticInput {
  areaGlobalLighting: readonly AreaGlobalLightingEvidence[];
  catalogLightSources: readonly AreaCatalogLightSourceEvidence[];
  processedMdlLightSources: readonly AreaProcessedMdlLightSourceEvidence[];
  rendererLightBudget: AreaRendererLightBudgetDiagnostic;
}

interface AreaLightingAuditCoverageInput extends ShadowDiagnosticInput {
  tileLights: readonly AreaTileLightingEvidence[];
  shadowDiagnostic: AreaShadowDiagnostic;
}

const TILE_LIGHT_REFERENCE_CHANNELS: Array<{
  key: AreaTileLightingReferenceKey;
  colorKey: AreaTileLightingColorKey;
  priority: number;
}> = [
  { key: "mainLight1", colorKey: "mainLight1Color", priority: 220 },
  { key: "mainLight2", colorKey: "mainLight2Color", priority: 220 },
  { key: "sourceLight1", colorKey: "sourceLight1Color", priority: 210 },
  { key: "sourceLight2", colorKey: "sourceLight2Color", priority: 210 }
];

function buildRendererLightBudgetDiagnostic(
  input: RendererLightBudgetInput
): AreaRendererLightBudgetDiagnostic {
  const candidates = [
    ...collectProcessedMdlLightBudgetCandidates(input.processedMdlLightSources),
    ...collectTileLightBudgetCandidates(input.tileLights),
    ...collectCatalogLightBudgetCandidates(input.catalogLightSources),
    ...collectPlaceableNameBudgetCandidates(input.placeableNameCandidates)
  ].sort(compareRendererLightBudgetCandidates);
  const sampledCandidates = candidates.slice(0, RENDERER_LIGHT_BUDGET_SAMPLE_SIZE).map((candidate, index) =>
    finalizeRendererLightBudgetCandidate(candidate, index + 1)
  );

  return {
    activeLightSlotCap: AURORA_ACTIVE_LIGHT_SLOT_CAP,
    candidateLights: candidates.length,
    acceptedLights: Math.min(candidates.length, AURORA_ACTIVE_LIGHT_SLOT_CAP),
    droppedLights: Math.max(0, candidates.length - AURORA_ACTIVE_LIGHT_SLOT_CAP),
    sampledCandidateLights: sampledCandidates.length,
    omittedCandidateLights: Math.max(0, candidates.length - sampledCandidates.length),
    priorityStrategy: RENDERER_LIGHT_BUDGET_PRIORITY_STRATEGY,
    priorityStrategyProofStatus:
      "source-backed-mdl-lightmanager-score-diagnostic-cross-lane-fallback",
    retailMdlLightScoreSource: RETAIL_MDL_LIGHT_SCORE_SOURCE,
    retailMdlLightSortSource: RETAIL_MDL_LIGHT_SORT_SOURCE,
    retailActiveLightSortScoreSource: RETAIL_ACTIVE_LIGHT_SORT_SCORE_SOURCE,
    retailActiveLightSortScoreFormula: RETAIL_ACTIVE_LIGHT_SORT_SCORE_FORMULA,
    retailActiveLightSortDirection: RETAIL_ACTIVE_LIGHT_SORT_DIRECTION,
    retailActiveLightSortScoreProofStatus: RETAIL_ACTIVE_LIGHT_SORT_SCORE_PROOF_STATUS,
    retailActiveLightUploadSource: RETAIL_ACTIVE_LIGHT_UPLOAD_SOURCE,
    retailOrderingStatus: "blocked-no-recovered-retail-cross-lane-active-light-ordering",
    candidates: sampledCandidates
  };
}

function collectProcessedMdlLightBudgetCandidates(
  sources: readonly AreaProcessedMdlLightSourceEvidence[]
): AreaRendererLightBudgetCandidateDraft[] {
  return sources.flatMap((source) =>
    source.nodes.map((node, nodeIndex) => {
      const lightPriority = readFiniteNumber(node.lightPriority);
      const previewScore = resolveProcessedMdlLightPreviewScore(node, lightPriority);
      return {
        candidateId: buildProcessedMdlLightBudgetCandidateId(source, node, nodeIndex),
        source: "processed-mdl-light-node",
        label: `${source.name}:${node.nodeName}`,
        priority: 300,
        templateId: source.templateId,
        resref: source.resref,
        nodeName: node.nodeName,
        retailMdlScoreSource: RETAIL_MDL_LIGHT_SCORE_SOURCE,
        retailMdlScoreProofStatus: RETAIL_MDL_LIGHT_SCORE_PROOF_STATUS,
        retailMdlPreviewScore: previewScore.score,
        retailMdlPreviewScorePriority: previewScore.priority,
        retailMdlPreviewScorePreviewDistance: previewScore.distance,
        retailMdlPreviewScoreRangeTerm: previewScore.rangeTerm,
        retailMdlPreviewScoreFormula: RETAIL_MDL_LIGHT_PREVIEW_SCORE_FORMULA,
        retailMdlPreviewScoreSource: RETAIL_ACTIVE_LIGHT_SORT_SCORE_SOURCE,
        retailMdlPreviewScoreProofStatus: RETAIL_MDL_LIGHT_PREVIEW_SCORE_PROOF_STATUS,
        retailMdlPreviewScoreSortDirection: RETAIL_MDL_LIGHT_PREVIEW_SCORE_SORT_DIRECTION,
        retailMdlPreviewScoreFallback: RETAIL_MDL_LIGHT_PREVIEW_SCORE_FALLBACK,
        prioritySource:
          "processed MDL lane uses recovered LightManager preview score for intra-lane order; cross-lane priority remains diagnostic because insertion order is unrecovered",
        ...optionalNumber("lightPriority", lightPriority)
      };
    })
  );
}

function resolveProcessedMdlLightPreviewScore(
  node: AreaProcessedMdlLightNodeEvidence,
  lightPriority: number | undefined
): { score: number; priority: number; distance: number; rangeTerm: number } {
  const priority = Math.trunc(lightPriority ?? 0);
  const radius = readFiniteNumber(node.radius) ?? 1;
  const multiplier = readFiniteNumber(node.multiplier) ?? 1;
  const distance = resolveProcessedMdlLightPreviewDistance(node.position);
  const rangeTerm = radius * multiplier;
  if (radius <= 0 || multiplier <= 0 || rangeTerm <= 0) {
    return { score: 100000, priority, distance, rangeTerm };
  }
  return {
    score: ((priority + 1) * distance) / (4 * (rangeTerm + 1)),
    priority,
    distance,
    rangeTerm
  };
}

function resolveProcessedMdlLightPreviewDistance(
  position: AreaProcessedMdlLightVector3 | undefined
): number {
  const x = readFiniteNumber(position?.x) ?? 0;
  const y = readFiniteNumber(position?.y) ?? 0;
  const z = readFiniteNumber(position?.z) ?? 0;
  return Math.sqrt(x * x + y * y + z * z);
}

function buildProcessedMdlLightBudgetCandidateId(
  source: AreaProcessedMdlLightSourceEvidence,
  node: AreaProcessedMdlLightNodeEvidence,
  nodeIndex: number
): string {
  return [
    "mdl",
    source.templateId,
    node.sourceModelObjectKey,
    node.nodeName,
    String(nodeIndex)
  ].join(":");
}

function collectTileLightBudgetCandidates(
  tileLights: readonly AreaTileLightingEvidence[]
): AreaRendererLightBudgetCandidateDraft[] {
  return tileLights.flatMap((tile) =>
    TILE_LIGHT_REFERENCE_CHANNELS.flatMap(({ key, colorKey, priority }) => {
      const value = tile[key];
      const color = tile[colorKey];
      if (!isActiveTileLightReference(value) || !isTileLightColorActive(color)) {
        return [];
      }
      return [
        {
          candidateId: ["tile", tile.tileInstanceId, key, String(value)].join(":"),
          source: "tile-light-reference" as const,
          label: `${tile.areaName} ${tile.row},${tile.col} ${key}=${value}`,
          priority,
          areaId: tile.areaId,
          areaName: tile.areaName,
          tileInstanceId: tile.tileInstanceId,
          tileChannel: key,
          prioritySource: DIAGNOSTIC_CROSS_LANE_PRIORITY_SOURCE
        }
      ];
    })
  );
}

function collectCatalogLightBudgetCandidates(
  sources: readonly AreaCatalogLightSourceEvidence[]
): AreaRendererLightBudgetCandidateDraft[] {
  return sources.map((source) => ({
    candidateId: ["catalog", source.templateId].join(":"),
    source: "catalog-light-source-template",
    label: source.name,
    priority: 120 + (readFiniteNumber(source.lightState) ?? 0),
    templateId: source.templateId,
    resref: source.resref,
    prioritySource: DIAGNOSTIC_CROSS_LANE_PRIORITY_SOURCE
  }));
}

function collectPlaceableNameBudgetCandidates(
  candidates: readonly AreaPlaceableLightingCandidateEvidence[]
): AreaRendererLightBudgetCandidateDraft[] {
  return candidates.map((candidate) => ({
    candidateId: ["name", candidate.areaId, candidate.objectId].join(":"),
    source: "placeable-name-candidate",
    label: candidate.localizedName ?? candidate.tag ?? candidate.resRef ?? candidate.templateId,
    priority: 80 + candidate.matchedTokens.length,
    areaId: candidate.areaId,
    areaName: candidate.areaName,
    templateId: candidate.templateId,
    prioritySource: DIAGNOSTIC_CROSS_LANE_PRIORITY_SOURCE,
    ...(candidate.resRef ? { resref: candidate.resRef } : {})
  }));
}

function compareRendererLightBudgetCandidates(
  left: AreaRendererLightBudgetCandidateDraft,
  right: AreaRendererLightBudgetCandidateDraft
): number {
  const priorityDelta = right.priority - left.priority;
  if (priorityDelta !== 0) {
    return priorityDelta;
  }
  if (left.source === "processed-mdl-light-node" && right.source === "processed-mdl-light-node") {
    const leftScore = readFiniteNumber(left.retailMdlPreviewScore);
    const rightScore = readFiniteNumber(right.retailMdlPreviewScore);
    if (leftScore !== undefined && rightScore !== undefined) {
      const scoreDelta = leftScore - rightScore;
      if (scoreDelta !== 0) {
        return scoreDelta;
      }
    }
  }
  const labelDelta = left.label.localeCompare(right.label);
  if (labelDelta !== 0) {
    return labelDelta;
  }
  return left.candidateId.localeCompare(right.candidateId);
}

function finalizeRendererLightBudgetCandidate(
  candidate: AreaRendererLightBudgetCandidateDraft,
  rank: number
): AreaRendererLightBudgetCandidateEvidence {
  const accepted = rank <= AURORA_ACTIVE_LIGHT_SLOT_CAP;
  return {
    ...candidate,
    rank,
    accepted,
    ...(accepted ? {} : { dropReason: "aurora-active-light-slot-cap" as const })
  };
}

function buildShadowDiagnostic(input: ShadowDiagnosticInput): AreaShadowDiagnostic {
  const rendererCandidateById = new Map(
    input.rendererLightBudget.candidates.map((candidate) => [candidate.candidateId, candidate])
  );
  const areaShadowEntries = collectAreaShadowDiagnosticEntries(input.areaGlobalLighting);
  const mdlShadowCounts = countProcessedMdlShadowLights(input.processedMdlLightSources);
  const mdlShadowEntries = collectProcessedMdlShadowDiagnosticEntries(
    input.processedMdlLightSources,
    rendererCandidateById
  );
  const catalogShadowEntries = collectCatalogShadowDiagnosticEntries(input.catalogLightSources);
  const entries = [...areaShadowEntries, ...mdlShadowEntries, ...catalogShadowEntries];
  const sampledEntries = entries.slice(0, SHADOW_DIAGNOSTIC_SAMPLE_SIZE);

  return {
    entries: sampledEntries,
    shadowRelevantEntries: entries.length,
    sampledEntries: sampledEntries.length,
    omittedEntries: Math.max(0, entries.length - sampledEntries.length),
    globalShadowFields: areaShadowEntries.length,
    areaShadowOpacityFields: areaShadowEntries.filter((entry) => entry.field === "ShadowOpacity").length,
    areaSunShadowFields: areaShadowEntries.filter((entry) => entry.field === "SunShadows").length,
    areaMoonShadowFields: areaShadowEntries.filter((entry) => entry.field === "MoonShadows").length,
    mdlShadowLightNodes: mdlShadowCounts.shadowTrue,
    mdlExplicitNonShadowLightNodes: mdlShadowCounts.shadowFalse,
    catalogShadowSizeTemplates: catalogShadowEntries.length
  };
}

function collectAreaShadowDiagnosticEntries(
  areaGlobalLighting: readonly AreaGlobalLightingEvidence[]
): AreaShadowDiagnosticEntry[] {
  return areaGlobalLighting.flatMap((areaLighting) =>
    areaLighting.fields.flatMap((field) => {
      if (!isAreaShadowFieldName(field.field)) {
        return [];
      }
      return [
        {
          entryId: ["area-shadow", areaLighting.areaId, field.field].join(":"),
          source: "area-root-shadow-field" as const,
          label: `${areaLighting.areaName}:${field.field}`,
          severity: "info" as const,
          note: "ARE root shadow field preserved from area metadata.",
          areaId: areaLighting.areaId,
          areaName: areaLighting.areaName,
          field: field.field,
          value: field.value
        }
      ];
    })
  );
}

function collectProcessedMdlShadowDiagnosticEntries(
  sources: readonly AreaProcessedMdlLightSourceEvidence[],
  rendererCandidateById: ReadonlyMap<string, AreaRendererLightBudgetCandidateEvidence>
): AreaShadowDiagnosticEntry[] {
  return sources.flatMap((source) =>
    source.nodes.flatMap((node, nodeIndex) => {
      if (node.shadow !== true) {
        return [];
      }
      const candidateId = buildProcessedMdlLightBudgetCandidateId(source, node, nodeIndex);
      const rendererCandidate = rendererCandidateById.get(candidateId);
      return [
        {
          entryId: ["mdl-shadow", source.templateId, node.nodeName, String(nodeIndex)].join(":"),
          source: "processed-mdl-light-node" as const,
          label: `${source.name}:${node.nodeName}`,
          severity: rendererCandidate?.accepted === false ? "warning" as const : "info" as const,
          note: rendererCandidate?.accepted === false
            ? "MDL light requests shadow but falls outside the sampled renderer light budget."
            : "MDL light node requests shadow.",
          templateId: source.templateId,
          resref: source.resref,
          nodeName: node.nodeName,
          shadow: true,
          ...(rendererCandidate ? { rendererRank: rendererCandidate.rank } : {}),
          ...(rendererCandidate ? { rendererAccepted: rendererCandidate.accepted } : {})
        }
      ];
    })
  );
}

function collectCatalogShadowDiagnosticEntries(
  sources: readonly AreaCatalogLightSourceEvidence[]
): AreaShadowDiagnosticEntry[] {
  return sources.flatMap((source) => {
    const shadowSize = readFiniteNumber(source.source2daShadowSize);
    if (shadowSize === undefined) {
      return [];
    }
    return [
      {
        entryId: ["catalog-shadow", source.templateId].join(":"),
        source: "catalog-placeable-shadow-size" as const,
        label: source.name,
        severity: "info" as const,
        note: "placeables.2da ShadowSize is present on this light-source template.",
        templateId: source.templateId,
        resref: source.resref,
        shadowSize
      }
    ];
  });
}

function countProcessedMdlShadowLights(
  sources: readonly AreaProcessedMdlLightSourceEvidence[]
): { shadowTrue: number; shadowFalse: number } {
  return sources.reduce(
    (totals, source) => {
      for (const node of source.nodes) {
        if (node.shadow === true) {
          totals.shadowTrue += 1;
        } else if (node.shadow === false) {
          totals.shadowFalse += 1;
        }
      }
      return totals;
    },
    { shadowTrue: 0, shadowFalse: 0 }
  );
}

function buildAreaLightingAuditCoverage(
  input: AreaLightingAuditCoverageInput
): AreaLightingAuditCoverageEntry[] {
  const tileLightReferences = input.tileLights.reduce(
    (sum, tile) => sum + countActiveTileLightReferences(tile),
    0
  );
  const tileLightRawReferences = input.tileLights.reduce(
    (sum, tile) =>
      sum + countDefined(tile.mainLight1, tile.mainLight2, tile.sourceLight1, tile.sourceLight2),
    0
  );
  const tileLightColorReferences = input.tileLights.reduce(
    (sum, tile) => sum + countDecodedTileLightColors(tile),
    0
  );
  const tileLightRenderableColorReferences = input.tileLights.reduce(
    (sum, tile) => sum + countRenderableTileLightColors(tile),
    0
  );
  const tileSourceLightRenderableReferences = input.tileLights.reduce(
    (sum, tile) => sum + countRenderableTileSourceLightColors(tile),
    0
  );
  const tileMainLightRenderableReferences = input.tileLights.reduce(
    (sum, tile) => sum + countRenderableTileMainLightColors(tile),
    0
  );
  const tileLightBlackColorReferences = Math.max(
    0,
    tileLightColorReferences - tileLightRenderableColorReferences
  );
  const areaGlobalLightingFields = input.areaGlobalLighting.reduce(
    (sum, areaLighting) => sum + areaLighting.fields.length,
    0
  );
  const catalogLightColorTemplates = input.catalogLightSources.filter((entry) =>
    entry.evidence.includes("placeables.2da.LightColor")
  ).length;
  const catalogOffsetOrShadowTemplates = input.catalogLightSources.filter(
    (entry) =>
      readFiniteNumber(entry.source2daLightOffsetX) !== undefined ||
      readFiniteNumber(entry.source2daLightOffsetY) !== undefined ||
      readFiniteNumber(entry.source2daLightOffsetZ) !== undefined ||
      readFiniteNumber(entry.source2daShadowSize) !== undefined
  ).length;
  const processedMdlLightNodes = input.processedMdlLightSources.reduce(
    (sum, source) => sum + source.nodes.length,
    0
  );
  const hasFogFields = input.areaGlobalLighting.some((areaLighting) =>
    areaLighting.fields.some((field) =>
      ["SunFogColor", "MoonFogColor", "FogClipDist", "SunFogAmount", "MoonFogAmount"].includes(
        field.field
      )
    )
  );

  return [
    {
      key: "area-tile-light-color",
      label: "ARE tile light color",
      status:
        tileLightReferences === 0
          ? "not-observed"
          : tileLightColorReferences === tileLightReferences
          ? "source-backed"
          : "blocked",
      evidence:
        tileLightReferences === 0
          ? tileLightRawReferences > 0
            ? `${tileLightRawReferences} raw tile light fields found, but all are 0/BLACK per NWScript TILE_* constants.`
            : "No ARE tile main/source light references found in scanned areas."
          : `${tileLightColorReferences}/${tileLightReferences} non-zero tile light ids carry decoded 2DA RGB metadata (${tileLightRawReferences} raw fields scanned; ${tileLightBlackColorReferences} decoded RGB entries are black and are not renderer candidates).`,
      proof:
        "decompiled_all.c:255400-255409 reads Tile_MainLight*/Tile_SrcLight*; decompiled_all.c:40249-40266 loads lightcolor/tilecolor tables.",
      ...(tileLightReferences > 0 && tileLightColorReferences < tileLightReferences
        ? { blocker: "Some non-zero tile light ids exist but decoded source color metadata is missing." }
        : {})
    },
    {
      key: "area-tile-light-position",
      label: "ARE tile light position",
      status:
        tileLightRenderableColorReferences === 0
          ? "not-observed"
          : tileSourceLightRenderableReferences > 0
          ? "preview-only"
          : "source-backed",
      evidence:
        tileLightRenderableColorReferences > 0
          ? tileSourceLightRenderableReferences > 0
            ? "Runtime anchors source lights at tile center until loaded MDL sourcelight node transforms are available; main lights are static lightcolor.2da tile lanes without point-light positions."
            : "Main tile lights are static lightcolor.2da tile lanes and do not create point-light positions."
          : "No renderable tile light colors found in scanned areas.",
      proof:
        tileSourceLightRenderableReferences > 0
          ? "frontend workspaceTerrainMesh TERRAIN_TILE_LIGHT_POSITION_SOURCE plus syncTerrainTileSourceLightNodePositionsFromLoadedModel."
          : TILE_MAIN_LIGHT_STATIC_COLOR_SOURCE,
      ...(tileSourceLightRenderableReferences > 0
        ? {
            blocker:
              "Unloaded source-light model fallback remains tile-center preview until sourcelight1/sourcelight2 nodes are available from the loaded tile MDL."
          }
        : {})
    },
    {
      key: "area-tile-source-light-proxy",
      label: "ARE tile source-light proxy nodes",
      status: tileSourceLightRenderableReferences > 0 ? "source-backed" : "not-observed",
      evidence:
        tileSourceLightRenderableReferences > 0
          ? `${tileSourceLightRenderableReferences} renderable ARE source-light references can use loaded MDL sourcelight1/sourcelight2 node transforms.`
          : "No renderable ARE sourceLight1/sourceLight2 references found in scanned areas.",
      proof:
        `${TILE_SOURCE_LIGHT_PROXY_SOURCE}; frontend workspaceTerrainMesh syncTerrainTileSourceLightNodePositionsFromLoadedModel.`
    },
    {
      key: "area-tile-light-radius-falloff",
      label: "ARE tile light radius/falloff",
      status:
        tileLightRenderableColorReferences === 0
          ? "not-observed"
          : "source-backed",
      evidence:
        tileLightRenderableColorReferences > 0
          ? `${tileMainLightRenderableReferences} renderable main-light references use recovered static lightcolor.2da tile lane with no point radius/falloff; ${tileSourceLightRenderableReferences} renderable source-light references use recovered fx_flame01/AuroraLight01 radius/falloff.`
          : "No renderable tile light colors found in scanned areas.",
      proof:
        tileSourceLightRenderableReferences > 0
          ? `${TILE_MAIN_LIGHT_STATIC_COLOR_SOURCE}; ${TILE_SOURCE_LIGHT_RADIUS_SOURCE}`
          : TILE_MAIN_LIGHT_STATIC_COLOR_SOURCE
    },
    {
      key: "area-global-lighting-fields",
      label: "ARE global lighting fields",
      status: areaGlobalLightingFields > 0 ? "source-backed" : "not-observed",
      evidence: `${areaGlobalLightingFields} ARE root lighting fields preserved in the area payload.`,
      proof:
        "decompiled_all.c:255200-255224 reads ARE root lighting/fog/shadow fields; decompiled_all.c:255888-255905 writes them back."
    },
    {
      key: "area-global-light-intensity",
      label: "ARE global light intensity",
      status: areaGlobalLightingFields > 0 ? "source-backed" : "not-observed",
      evidence:
        areaGlobalLightingFields > 0
          ? "Runtime maps ARE ambient/diffuse colors to byte0/byte1/byte2 divided by 255 and uses Three intensity 1.0 so no extra preview scalar is introduced."
          : "No ARE root lighting fields found in scanned areas.",
      proof: AREA_GLOBAL_LIGHT_COLOR_SOURCE
    },
    {
      key: "area-fog-range",
      label: "ARE fog range",
      status: hasFogFields ? "source-backed" : "not-observed",
      evidence: hasFogFields
        ? "ARE fog fields map to recovered fog color byte order, fog-start formula 25 - FogAmount*25/15, and FogClipDist fog end."
        : "No ARE fog fields found in scanned area lighting evidence.",
      proof: AREA_FOG_RANGE_SOURCE
    },
    {
      key: "area-shadow-opacity",
      label: "ARE shadow opacity",
      status: input.shadowDiagnostic.areaShadowOpacityFields > 0 ? "source-backed" : "not-observed",
      evidence: `${input.shadowDiagnostic.areaShadowOpacityFields} ShadowOpacity fields preserved.`,
      proof:
        "decompiled_all.c:255224 reads ShadowOpacity with default 0x32 and decompiled_all.c:255904 writes it back."
    },
    {
      key: "area-shadow-volume-implementation",
      label: "Aurora shadow implementation",
      status: input.shadowDiagnostic.shadowRelevantEntries > 0 ? "blocked" : "not-observed",
      evidence:
        input.shadowDiagnostic.shadowRelevantEntries > 0
          ? "Shadow-relevant ARE/MDL/2DA evidence exists and retail shadow-plane/shadow-volume renderer paths are recovered; Aurora Web now exposes textured fast-shadow quads, source-backed caster buffers, an active w-pair extrusion preview, and an active WebGL z-pass/z-fail stencil receiver lane, but retail/toolset pixel parity is not proven."
          : "No shadow-relevant entries found in scanned evidence.",
      proof: `${RETAIL_SHADOW_VOLUME_PROJECTION_SOURCE}; ${RETAIL_SHADOW_VOLUME_LIGHT_PROFILE_SOURCE}.`,
      ...(input.shadowDiagnostic.shadowRelevantEntries > 0
        ? {
            blocker: RETAIL_SHADOW_VOLUME_PROJECTION_BLOCKER
          }
        : {})
    },
    {
      key: "placeable-2da-light-color",
      label: "Placeable 2DA light color",
      status: catalogLightColorTemplates > 0 ? "source-backed" : "not-observed",
      evidence: `${catalogLightColorTemplates} catalog light templates include placeables.2da LightColor.`,
      proof: "placeables.2da LightColor resolved through lightcolor.2da RGB metadata."
    },
    {
      key: "placeable-2da-light-offset-shadow",
      label: "Placeable 2DA offset/shadow",
      status: catalogOffsetOrShadowTemplates > 0 ? "source-backed" : "not-observed",
      evidence: `${catalogOffsetOrShadowTemplates} catalog light templates include LightOffset or ShadowSize metadata.`,
      proof:
        catalogOffsetOrShadowTemplates > 0
          ? PLACEABLE_TWO_DA_SHADOW_SIZE_SOURCE
          : "placeables.2da LightOffsetX/Y/Z and ShadowSize metadata not observed."
    },
    {
      key: "placeable-lightstate-toggle",
      label: "Placeable illumination state",
      status: "source-backed",
      evidence:
        "Missing UTP LightState defaults to ON in the recovered nwserver retail binary placeable template load path; NWScript exposes SetPlaceableIllumination/GetPlaceableIllumination and requires RecomputeStaticLighting for runtime/static-light updates.",
      proof: `${PLACEABLE_LIGHTSTATE_DEFAULT_SOURCE}; ${PLACEABLE_ILLUMINATION_TOGGLE_SOURCE}.`
    },
    {
      key: "placeable-radius-falloff",
      label: "Placeable light radius/falloff",
      status: catalogLightColorTemplates > 0 ? "source-backed" : "not-observed",
      evidence:
        catalogLightColorTemplates > 0
          ? "Catalog light colors exist and retail placeable carrier radius/falloff is recovered from fx_placeable01/AuroraLight01 plus active-light falloff code."
          : "No catalog LightColor templates found in scanned evidence.",
      proof:
        catalogLightColorTemplates > 0
          ? PLACEABLE_TWO_DA_LIGHT_RADIUS_SOURCE
          : "No placeables.2da LightColor templates found in scanned evidence."
    },
    {
      key: "mdl-light-node-radius-color-shadow",
      label: "MDL light node radius/color/shadow",
      status: processedMdlLightNodes > 0 ? "source-backed" : "not-observed",
      evidence: `${processedMdlLightNodes} processed MDL light nodes captured.`,
      proof: `${MDL_LIGHT_NODE_FIELD_PARSER_SOURCE}; ${MDL_LIGHT_NODE_FIELD_PARSER_PROOF_STATUS}.`
    },
    {
      key: "item-property-light-runtime-scheduler",
      label: "ItemPropertyLight runtime scheduler",
      status: "blocked",
      evidence:
        "Retail ApplyLight bridge to VFX_DUR_LIGHT rows, retail KEY/BIF item-light tables, progfx.2da Param3 item-light shadow toggle, object-level looping VFX owner add/remove, CNWSMessage last-update copy/diff, CNWSMessage game-object update serialization, client receive/render/Gob instantiation, and generic MdlNodeLight PartLight creation/Gob-list attach are recovered and ItemPropertyLight parameter/color/radius/shadow-toggle family is represented in previews, but cross-lane insertion and retail shadow-volume projection parity are still not recovered.",
      proof: `${ITEM_PROPERTY_LIGHT_RUNTIME_SCHEDULER_PROOF_SOURCE}; ${LOOPING_VISUAL_EFFECT_MESSAGE_UPDATE_PROOF_SOURCE}; ${LOOPING_VISUAL_EFFECT_NETWORK_UPDATE_PROOF_SOURCE}; ${LOOPING_VISUAL_EFFECT_CLIENT_RECEIVE_RENDER_PROOF_SOURCE}`,
      blocker: ITEM_PROPERTY_LIGHT_RUNTIME_SCHEDULER_BLOCKER
    },
    {
      key: "progfx-type4-runtime-scheduler",
      label: "ProgFX Type 4 runtime scheduler",
      status: "blocked",
      evidence:
        "ProgFX Type 4 owner-phase metadata, Param1..Param7 source-table values, docs-backed Param4 priority/Param5 proximity/Param6 attach-to-scene/vision policy semantics, client receive/render object attach, source-model Gob instantiation, and vanilla absence of non-item cast-shadow rows are preserved for diagnostics, but exact retail owner grouping, proximity distance threshold, scene-light restore timing, vision mutation pixels, and cross-lane scheduling are still not recovered.",
      proof: `${PROGFX_TYPE4_RUNTIME_SCHEDULER_FULL_PROOF_SOURCE}; ${LOOPING_VISUAL_EFFECT_CLIENT_RECEIVE_RENDER_PROOF_SOURCE}`,
      blocker: PROGFX_TYPE4_RUNTIME_SCHEDULER_BLOCKER
    },
    {
      key: "renderer-active-light-budget",
      label: "Renderer active light budget",
      status: "source-backed",
      evidence: `${input.rendererLightBudget.acceptedLights}/${input.rendererLightBudget.candidateLights} candidates accepted before the 128 slot cap.`,
      proof: "decompiled active light slot clamp min(configured, 0x80)."
    },
    {
      key: "renderer-active-light-ordering",
      label: "Renderer active light ordering",
      status: input.rendererLightBudget.candidateLights > 0 ? "blocked" : "not-observed",
      evidence:
        input.rendererLightBudget.candidateLights > 0
          ? `Preview diagnostic orders ${input.rendererLightBudget.candidateLights} candidates with ${input.rendererLightBudget.priorityStrategy}; MDL light-manager score/sort/upload are recovered, but retail cross-lane insertion order is not.`
          : "No renderer light candidates found in scanned evidence.",
      proof:
        `${RETAIL_LIGHT_MANAGER_INTERNAL_INSERTION_SOURCE}; ${RETAIL_LIGHT_MANAGER_FRAME_REBUILD_ORDER_SOURCE}; ${RETAIL_MDL_LIGHT_SCORE_SOURCE}; ${RETAIL_ACTIVE_LIGHT_SORT_SCORE_SOURCE}; ${RETAIL_ACTIVE_LIGHT_UPLOAD_SOURCE}; ${RETAIL_CROSS_LANE_ORDERING_PROOF_SOURCE}.`,
      ...(input.rendererLightBudget.candidateLights > 0
        ? {
            blocker:
              `${RETAIL_LIGHT_MANAGER_CROSS_LANE_CALLSITE_BLOCKER}; keep tile/placeable/MDL/item/VFX ordering diagnostic-only until recovered lane insertion call-sites or a retail oracle prove cross-lane precedence into the light manager.`
          }
        : {})
    }
  ];
}

function countAuditCoverageByStatus(
  entries: readonly AreaLightingAuditCoverageEntry[],
  status: AreaLightingAuditCoverageStatus
): number {
  return entries.filter((entry) => entry.status === status).length;
}

function buildAreaLightingAuditGaps(
  entries: readonly AreaLightingAuditCoverageEntry[]
): AreaLightingAuditGapEntry[] {
  return entries
    .filter(
      (entry): entry is AreaLightingAuditCoverageGapEntry =>
        entry.status === "blocked" ||
        entry.status === "preview-only" ||
        entry.status === "not-observed"
    )
    .map((entry) => ({
      ...entry,
      nextStep: resolveAuditGapNextStep(entry)
    }));
}

function buildRemainingRetailBlockers(): AreaLightingRemainingRetailBlocker[] {
  return [
    {
      key: "retail-shadow-volume-projection-parity",
      label: "Retail shadow-volume projection parity",
      status: "blocked",
      affectedCoverageKeys: [
        "area-shadow-volume-implementation",
        "placeable-2da-light-offset-shadow"
      ],
      evidence:
        "Retail shadow-plane/shadow-volume inputs are source-backed, including ShadowOpacity, radius, shadowradius, verticaldisplacement, shader names, render buckets, caster buffer preparation, and caster draw entrypoint.",
      proof: `${RETAIL_SHADOW_VOLUME_PROJECTION_SOURCE}; ${RETAIL_SHADOW_VOLUME_LIGHT_PROFILE_SOURCE}.`,
      requiredEvidence:
        "Prove the active WebGL stencil front/back z-pass/z-fail receiver lane against retail/toolset shadow output, including projected geometry, opacity, and render-state ordering around FUN_00a878f8 -> FUN_00a78128.",
      oracleCases: [
        {
          caseId: "shadowvol-campfire-pixel-geometry-opacity",
          purpose:
            "Compare the Aurora Web campfire/placeable shadow-volume projection against a retail/toolset capture for projected footprint, opacity, and receiver placement.",
          requiredArtifacts: [
            "retail-or-toolset-shadowvol-campfire.png",
            "aurora-web-shadowvol-campfire.png",
            "shadowvol-campfire-pixel-compare.json"
          ],
          acceptanceGate:
            "The comparison must report matching caster footprint, receiver alignment, and opacity within an explicitly recorded tolerance; otherwise the retail state or projection path remains blocked.",
          currentStatus: "partial-local-proof",
          currentEvidence: [
            "retail-shadowvol-projection-proof.json",
            "retail-shadowsize-shadow-mdl-proof.json",
            "area-lighting-retail-runtime-oracle-pack-proof.json",
            "oracle-module-fixture-no-input-proof.json",
            "area-lighting-local-oracle-inputs-manifest.json",
            "area-lighting-pixel-diff-artifacts.json",
            "retail-or-toolset-shadowvol-campfire.png",
            "aurora-web-catalog-campfire-plc-i06-light-shadow-proof-1280x900-diagnostic-2026-07-07.png",
            "aurora-web-catalog-campfire-plc-i06-light-shadow-proof-1280x900-diagnostic-2026-07-07.frame.json",
            "aurora-web-shadowvol-campfire.png",
            "shadowvol-campfire-pixel-compare.json",
            "shadowvol-campfire-retail-web-diff-normalized.png"
          ],
          blocker:
            "Fresh Aurora Web campfire light/radius/LightState proof exists, and local WebGL stencil/material state is captured, but calibrated same-camera retail/toolset pixel parity for projected footprint and opacity is still blocked."
        },
        {
          caseId: "shadowvol-retail-gl-state-order",
          purpose:
            "Verify blend/depth/stencil state ordering against the retail FUN_00a878f8 -> FUN_00a78128 -> FUN_00a75e3c path.",
          requiredArtifacts: [
            "retail-shadowvol-state-trace.json",
            "aurora-web-shadowvol-state-trace.json",
            "shadowvol-state-order-compare.json"
          ],
          acceptanceGate:
            "Retail and Aurora Web must agree on pass order, face mapping, GL_KEEP/GL_INCR/GL_DECR slots, receiver stencil function, depth write/test, color write, and opacity source.",
          currentStatus: "partial-local-proof",
          currentEvidence: [
            "source-backed-shadowvol-zpass-zfail-stencil-op-sequence-face-op-mapped",
            "retail-shadowvol-state-trace.json",
            "aurora-web-shadowvol-state-trace.json",
            "shadowvol-state-order-compare.json",
            "retail-shadowvol-projection-proof.json",
            "source-backed-shadowvol-local-material-state-captured-retail-op-sequence-pixel-parity-blocked"
          ],
          blocker:
            "Retail/toolset GL-state trace or an equivalent oracle capture is still missing."
        }
      ],
      nextStep:
        "Build a retail/toolset oracle capture comparing projected shadow geometry and opacity; if it diverges, recover the exact remaining stencil/depth/blend state."
    },
    {
      key: "retail-cross-lane-active-light-ordering",
      label: "Retail cross-lane active light ordering",
      status: "blocked",
      affectedCoverageKeys: [
        "renderer-active-light-ordering",
        "item-property-light-runtime-scheduler",
        "progfx-type4-runtime-scheduler"
      ],
      evidence:
        "Active-light score/sort/upload, LightManager internal insertion, and frame-level LightManager rebuild/add/remove/sort dispatch order are recovered, but owner-lane precedence between tile/placeable/MDL/item/ProgFX is still not proven.",
      proof: `${RETAIL_LIGHT_MANAGER_INTERNAL_INSERTION_SOURCE}; ${RETAIL_LIGHT_MANAGER_FRAME_REBUILD_ORDER_SOURCE}; ${RETAIL_ACTIVE_LIGHT_SORT_SCORE_SOURCE}; ${RETAIL_ACTIVE_LIGHT_UPLOAD_SOURCE}; ${RETAIL_CROSS_LANE_ORDERING_PROOF_SOURCE}.`,
      requiredEvidence:
        "Recover or observe the common insertion/merge order between terrain tile, placeables.2da, source MDL, item-property, and ProgFX Type 4 light lanes.",
      oracleCases: [
        {
          caseId: "cross-lane-all-required-lanes-retail-precedence",
          purpose:
            "Observe the same competing terrain tile, placeables.2da, source-MDL, item-property, and ProgFX Type 4 lanes in retail/toolset and prove which lane wins when the active-light budget is saturated.",
          requiredArtifacts: [
            "retail-cross-lane-all-lanes-before-budget.png",
            "retail-cross-lane-all-lanes-after-budget.png",
            "retail-cross-lane-active-slots.json",
            "aurora-web-cross-lane-all-lanes.frame.json",
            "cross-lane-precedence-compare.json"
          ],
          acceptanceGate:
            "The oracle must identify accepted/dropped lanes and ordering under a constrained light budget; Aurora Web may only promote retail ordering if its accepted/dropped lanes match the oracle.",
          currentStatus: "partial-local-proof",
          currentEvidence: [
            "area-lighting-retail-runtime-oracle-pack-proof.json",
            "cross-lane-active-slot-blocker-proof.json",
            "cross-lane-retail-maxlight-roi-diagnostics.json",
            "cross-lane-retail-maxlight-roi-diagnostics-no-progfx.json",
            "cross-lane-retail-maxlight-roi-diagnostics-no-placeable.json",
            "cross-lane-retail-maxlight-roi-diagnostics-no-mdl.json",
            "cross-lane-retail-maxlight-roi-diagnostics-no-tile-main.json",
            "cross-lane-retail-maxlight-roi-diagnostics-no-tile-source.json",
            "retail-cross-lane-max-light-variant-observation.json",
            "retail-cross-lane-no-item-max-light-variant-observation.json",
            "retail-cross-lane-no-progfx-max-light-variant-observation.json",
            "retail-cross-lane-no-placeable-max-light-variant-observation.json",
            "retail-cross-lane-no-mdl-max-light-variant-observation.json",
            "retail-cross-lane-no-tile-main-max-light-variant-observation.json",
            "retail-cross-lane-no-tile-source-max-light-variant-observation.json",
            "retail-cross-lane-openpad-smoke.png",
            "retail-ref-tile-main-light.png",
            "retail-ref-tile-source-light.png",
            "retail-ref-placeable-lightcolor.png",
            "retail-ref-mdl-source-light.png",
            "retail-ref-item-property-light.png",
            "retail-ref-progfx-type4-light.png",
            "retail-cross-lane-default-maxlights-roi-heatmap.png",
            "retail-cross-lane-maxlights-1-roi-heatmap.png",
            "retail-cross-lane-maxlights-2-roi-heatmap.png",
            "retail-cross-lane-maxlights-3-roi-heatmap.png",
            "retail-cross-lane-maxlights-4-roi-heatmap.png",
            "retail-cross-lane-maxlights-5-roi-heatmap.png",
            "retail-cross-lane-maxlights-6-roi-heatmap.png",
            "retail-cross-lane-maxlights-8-roi-heatmap.png",
            "retail-cross-lane-maxlights-32-roi-heatmap.png",
            "retail-cross-lane-maxlights-1-vs-2-before-roi-heatmap.png",
            "retail-cross-lane-maxlights-1-vs-2-after-roi-heatmap.png",
            "retail-cross-lane-maxlights-2-vs-3-before-roi-heatmap.png",
            "retail-cross-lane-maxlights-2-vs-3-after-roi-heatmap.png",
            "retail-cross-lane-maxlights-3-vs-4-before-roi-heatmap.png",
            "retail-cross-lane-maxlights-3-vs-4-after-roi-heatmap.png",
            "retail-cross-lane-maxlights-4-vs-5-before-roi-heatmap.png",
            "retail-cross-lane-maxlights-4-vs-5-after-roi-heatmap.png",
            "retail-cross-lane-maxlights-5-vs-6-before-roi-heatmap.png",
            "retail-cross-lane-maxlights-5-vs-6-after-roi-heatmap.png",
            "retail-cross-lane-maxlights-6-vs-8-before-roi-heatmap.png",
            "retail-cross-lane-maxlights-6-vs-8-after-roi-heatmap.png",
            "retail-cross-lane-maxlights-8-vs-32-before-roi-heatmap.png",
            "retail-cross-lane-maxlights-8-vs-32-after-roi-heatmap.png",
            "retail-cross-lane-no-item-ablation-maxlights-1-before-roi-heatmap.png",
            "retail-cross-lane-no-item-ablation-maxlights-1-after-roi-heatmap.png",
            "retail-cross-lane-no-item-ablation-maxlights-1-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-item-ablation-maxlights-2-before-roi-heatmap.png",
            "retail-cross-lane-no-item-ablation-maxlights-2-after-roi-heatmap.png",
            "retail-cross-lane-no-item-ablation-maxlights-2-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-item-ablation-maxlights-3-before-roi-heatmap.png",
            "retail-cross-lane-no-item-ablation-maxlights-3-after-roi-heatmap.png",
            "retail-cross-lane-no-item-ablation-maxlights-3-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-item-ablation-maxlights-4-before-roi-heatmap.png",
            "retail-cross-lane-no-item-ablation-maxlights-4-after-roi-heatmap.png",
            "retail-cross-lane-no-item-ablation-maxlights-4-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-item-ablation-maxlights-5-before-roi-heatmap.png",
            "retail-cross-lane-no-item-ablation-maxlights-5-after-roi-heatmap.png",
            "retail-cross-lane-no-item-ablation-maxlights-5-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-item-ablation-maxlights-6-before-roi-heatmap.png",
            "retail-cross-lane-no-item-ablation-maxlights-6-after-roi-heatmap.png",
            "retail-cross-lane-no-item-ablation-maxlights-6-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-item-ablation-maxlights-8-before-roi-heatmap.png",
            "retail-cross-lane-no-item-ablation-maxlights-8-after-roi-heatmap.png",
            "retail-cross-lane-no-item-ablation-maxlights-8-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-item-ablation-maxlights-32-before-roi-heatmap.png",
            "retail-cross-lane-no-item-ablation-maxlights-32-after-roi-heatmap.png",
            "retail-cross-lane-no-item-ablation-maxlights-32-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-progfx-ablation-maxlights-1-before-roi-heatmap.png",
            "retail-cross-lane-no-progfx-ablation-maxlights-1-after-roi-heatmap.png",
            "retail-cross-lane-no-progfx-ablation-maxlights-1-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-progfx-ablation-maxlights-2-before-roi-heatmap.png",
            "retail-cross-lane-no-progfx-ablation-maxlights-2-after-roi-heatmap.png",
            "retail-cross-lane-no-progfx-ablation-maxlights-2-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-progfx-ablation-maxlights-3-before-roi-heatmap.png",
            "retail-cross-lane-no-progfx-ablation-maxlights-3-after-roi-heatmap.png",
            "retail-cross-lane-no-progfx-ablation-maxlights-3-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-progfx-ablation-maxlights-4-before-roi-heatmap.png",
            "retail-cross-lane-no-progfx-ablation-maxlights-4-after-roi-heatmap.png",
            "retail-cross-lane-no-progfx-ablation-maxlights-4-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-progfx-ablation-maxlights-5-before-roi-heatmap.png",
            "retail-cross-lane-no-progfx-ablation-maxlights-5-after-roi-heatmap.png",
            "retail-cross-lane-no-progfx-ablation-maxlights-5-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-progfx-ablation-maxlights-6-before-roi-heatmap.png",
            "retail-cross-lane-no-progfx-ablation-maxlights-6-after-roi-heatmap.png",
            "retail-cross-lane-no-progfx-ablation-maxlights-6-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-progfx-ablation-maxlights-8-before-roi-heatmap.png",
            "retail-cross-lane-no-progfx-ablation-maxlights-8-after-roi-heatmap.png",
            "retail-cross-lane-no-progfx-ablation-maxlights-8-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-progfx-ablation-maxlights-32-before-roi-heatmap.png",
            "retail-cross-lane-no-progfx-ablation-maxlights-32-after-roi-heatmap.png",
            "retail-cross-lane-no-progfx-ablation-maxlights-32-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-placeable-ablation-maxlights-1-before-roi-heatmap.png",
            "retail-cross-lane-no-placeable-ablation-maxlights-1-after-roi-heatmap.png",
            "retail-cross-lane-no-placeable-ablation-maxlights-1-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-placeable-ablation-maxlights-2-before-roi-heatmap.png",
            "retail-cross-lane-no-placeable-ablation-maxlights-2-after-roi-heatmap.png",
            "retail-cross-lane-no-placeable-ablation-maxlights-2-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-placeable-ablation-maxlights-3-before-roi-heatmap.png",
            "retail-cross-lane-no-placeable-ablation-maxlights-3-after-roi-heatmap.png",
            "retail-cross-lane-no-placeable-ablation-maxlights-3-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-placeable-ablation-maxlights-4-before-roi-heatmap.png",
            "retail-cross-lane-no-placeable-ablation-maxlights-4-after-roi-heatmap.png",
            "retail-cross-lane-no-placeable-ablation-maxlights-4-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-placeable-ablation-maxlights-5-before-roi-heatmap.png",
            "retail-cross-lane-no-placeable-ablation-maxlights-5-after-roi-heatmap.png",
            "retail-cross-lane-no-placeable-ablation-maxlights-5-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-placeable-ablation-maxlights-6-before-roi-heatmap.png",
            "retail-cross-lane-no-placeable-ablation-maxlights-6-after-roi-heatmap.png",
            "retail-cross-lane-no-placeable-ablation-maxlights-6-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-placeable-ablation-maxlights-8-before-roi-heatmap.png",
            "retail-cross-lane-no-placeable-ablation-maxlights-8-after-roi-heatmap.png",
            "retail-cross-lane-no-placeable-ablation-maxlights-8-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-placeable-ablation-maxlights-32-before-roi-heatmap.png",
            "retail-cross-lane-no-placeable-ablation-maxlights-32-after-roi-heatmap.png",
            "retail-cross-lane-no-placeable-ablation-maxlights-32-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-mdl-ablation-maxlights-1-before-roi-heatmap.png",
            "retail-cross-lane-no-mdl-ablation-maxlights-1-after-roi-heatmap.png",
            "retail-cross-lane-no-mdl-ablation-maxlights-1-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-mdl-ablation-maxlights-2-before-roi-heatmap.png",
            "retail-cross-lane-no-mdl-ablation-maxlights-2-after-roi-heatmap.png",
            "retail-cross-lane-no-mdl-ablation-maxlights-2-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-mdl-ablation-maxlights-3-before-roi-heatmap.png",
            "retail-cross-lane-no-mdl-ablation-maxlights-3-after-roi-heatmap.png",
            "retail-cross-lane-no-mdl-ablation-maxlights-3-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-mdl-ablation-maxlights-4-before-roi-heatmap.png",
            "retail-cross-lane-no-mdl-ablation-maxlights-4-after-roi-heatmap.png",
            "retail-cross-lane-no-mdl-ablation-maxlights-4-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-mdl-ablation-maxlights-5-before-roi-heatmap.png",
            "retail-cross-lane-no-mdl-ablation-maxlights-5-after-roi-heatmap.png",
            "retail-cross-lane-no-mdl-ablation-maxlights-5-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-mdl-ablation-maxlights-6-before-roi-heatmap.png",
            "retail-cross-lane-no-mdl-ablation-maxlights-6-after-roi-heatmap.png",
            "retail-cross-lane-no-mdl-ablation-maxlights-6-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-mdl-ablation-maxlights-8-before-roi-heatmap.png",
            "retail-cross-lane-no-mdl-ablation-maxlights-8-after-roi-heatmap.png",
            "retail-cross-lane-no-mdl-ablation-maxlights-8-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-mdl-ablation-maxlights-32-before-roi-heatmap.png",
            "retail-cross-lane-no-mdl-ablation-maxlights-32-after-roi-heatmap.png",
            "retail-cross-lane-no-mdl-ablation-maxlights-32-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-tile-main-ablation-maxlights-1-before-roi-heatmap.png",
            "retail-cross-lane-no-tile-main-ablation-maxlights-1-after-roi-heatmap.png",
            "retail-cross-lane-no-tile-main-ablation-maxlights-1-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-tile-main-ablation-maxlights-2-before-roi-heatmap.png",
            "retail-cross-lane-no-tile-main-ablation-maxlights-2-after-roi-heatmap.png",
            "retail-cross-lane-no-tile-main-ablation-maxlights-2-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-tile-main-ablation-maxlights-3-before-roi-heatmap.png",
            "retail-cross-lane-no-tile-main-ablation-maxlights-3-after-roi-heatmap.png",
            "retail-cross-lane-no-tile-main-ablation-maxlights-3-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-tile-main-ablation-maxlights-4-before-roi-heatmap.png",
            "retail-cross-lane-no-tile-main-ablation-maxlights-4-after-roi-heatmap.png",
            "retail-cross-lane-no-tile-main-ablation-maxlights-4-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-tile-main-ablation-maxlights-5-before-roi-heatmap.png",
            "retail-cross-lane-no-tile-main-ablation-maxlights-5-after-roi-heatmap.png",
            "retail-cross-lane-no-tile-main-ablation-maxlights-5-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-tile-main-ablation-maxlights-6-before-roi-heatmap.png",
            "retail-cross-lane-no-tile-main-ablation-maxlights-6-after-roi-heatmap.png",
            "retail-cross-lane-no-tile-main-ablation-maxlights-6-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-tile-main-ablation-maxlights-8-before-roi-heatmap.png",
            "retail-cross-lane-no-tile-main-ablation-maxlights-8-after-roi-heatmap.png",
            "retail-cross-lane-no-tile-main-ablation-maxlights-8-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-tile-main-ablation-maxlights-32-before-roi-heatmap.png",
            "retail-cross-lane-no-tile-main-ablation-maxlights-32-after-roi-heatmap.png",
            "retail-cross-lane-no-tile-main-ablation-maxlights-32-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-tile-source-ablation-maxlights-1-before-roi-heatmap.png",
            "retail-cross-lane-no-tile-source-ablation-maxlights-1-after-roi-heatmap.png",
            "retail-cross-lane-no-tile-source-ablation-maxlights-1-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-tile-source-ablation-maxlights-2-before-roi-heatmap.png",
            "retail-cross-lane-no-tile-source-ablation-maxlights-2-after-roi-heatmap.png",
            "retail-cross-lane-no-tile-source-ablation-maxlights-2-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-tile-source-ablation-maxlights-3-before-roi-heatmap.png",
            "retail-cross-lane-no-tile-source-ablation-maxlights-3-after-roi-heatmap.png",
            "retail-cross-lane-no-tile-source-ablation-maxlights-3-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-tile-source-ablation-maxlights-4-before-roi-heatmap.png",
            "retail-cross-lane-no-tile-source-ablation-maxlights-4-after-roi-heatmap.png",
            "retail-cross-lane-no-tile-source-ablation-maxlights-4-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-tile-source-ablation-maxlights-5-before-roi-heatmap.png",
            "retail-cross-lane-no-tile-source-ablation-maxlights-5-after-roi-heatmap.png",
            "retail-cross-lane-no-tile-source-ablation-maxlights-5-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-tile-source-ablation-maxlights-6-before-roi-heatmap.png",
            "retail-cross-lane-no-tile-source-ablation-maxlights-6-after-roi-heatmap.png",
            "retail-cross-lane-no-tile-source-ablation-maxlights-6-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-tile-source-ablation-maxlights-8-before-roi-heatmap.png",
            "retail-cross-lane-no-tile-source-ablation-maxlights-8-after-roi-heatmap.png",
            "retail-cross-lane-no-tile-source-ablation-maxlights-8-own-budget-roi-heatmap.png",
            "retail-cross-lane-no-tile-source-ablation-maxlights-32-before-roi-heatmap.png",
            "retail-cross-lane-no-tile-source-ablation-maxlights-32-after-roi-heatmap.png",
            "retail-cross-lane-no-tile-source-ablation-maxlights-32-own-budget-roi-heatmap.png",
            "cross-lane-all-light-lanes-runtime-probe-2026-07-07.png",
            "cross-lane-all-light-lanes-runtime-probe-2026-07-07.frame.json",
            "aurora-web-cross-lane-all-lanes.frame.json",
            "retail-cross-lane-active-slots.json",
            "cross-lane-precedence-compare.json"
          ],
          blocker:
            "Aurora Web proves local 5/5 lane coverage and records the current all-lane runtime probe, but retail LightManager lane precedence is still not observed."
        },
        {
          caseId: "lightmanager-vtable-receiver-dispatch",
          purpose:
            "Recover the remaining caller/receiver owner data-flow for LightManager AddLight/PrioritizeLights/RemoveLight/UpdateLights so tile/placeable/MDL/item/ProgFX lane creation precedence can be proven from disassembly.",
          requiredArtifacts: [
            "lightmanager-vtable-receiver-xrefs.json",
            "lightmanager-lane-owner-callgraph.json"
          ],
          acceptanceGate:
            "The disassembly evidence must tie tile/placeable/MDL/item/ProgFX lane owners to a common LightManager insertion/merge path, not only helper/query calls.",
          currentStatus: "partial-local-proof",
          currentEvidence: [
            "frameRebuildOrderingEvidence proofStatus=source-backed-lightmanager-frame-rebuild-vtable-dispatch-order-owner-lane-precedence-blocked",
            "directProximityUploadEvidence proofStatus=source-backed-lightmanager-direct-proximity-upload-order",
            "absoluteVtableClusterEvidence proofStatus=retail-binary-backed-lightmanager-core-methods-rdata-vtable-cluster-no-direct-callsite",
            "indirectVtableSlotCallEvidence proofStatus=capstone-free-lightmanager-vtable-slot-indirect-call-candidates-register-dataflow-blocked"
          ],
          blocker:
            "Current source scan sees frame-level LightManager dispatch and direct proximity upload order, and binary scan sees the vtable cluster plus indirect candidates, but owner-lane precedence is still not tied to tile/placeable/MDL/item/ProgFX creators."
        }
      ],
      nextStep:
        "Continue binary/xref audit around LightManager vtable callers or capture a retail scene where competing lane priorities prove cross-lane precedence."
    },
    {
      key: "progfx-type4-priority-proximity-vision-scheduler",
      label: "ProgFX Type 4 priority/proximity/vision scheduler",
      status: "blocked",
      affectedCoverageKeys: ["progfx-type4-runtime-scheduler"],
      evidence:
        "Type 4 Param4 priority, Param5 proximity suppression, Param6 scene attachment, and vision Param1 policy semantics are docs-backed and preserved, but exact retail owner grouping, proximity threshold, scene-light restore timing, and vision mutation pixels are not recovered.",
      proof: PROGFX_TYPE4_RUNTIME_SCHEDULER_FULL_PROOF_SOURCE,
      requiredEvidence:
        "Recover exact owner grouping, priority tie behavior, proximity distance threshold, scene attachment/removal restore timing, and vision mutation pixels from decompilation or retail runtime captures.",
      oracleCases: [
        {
          caseId: "progfx-type4-priority-tie-and-zero-policy",
          purpose:
            "Prove retail priority ordering for Type 4 requests, including lower-value-wins, tie behavior, and the documented priority 0 always-applies rule.",
          requiredArtifacts: [
            "retail-progfx-priority-policy-before.png",
            "retail-progfx-priority-policy-after.png",
            "retail-progfx-priority-policy.json"
          ],
          acceptanceGate:
            "The oracle must report which Type 4 owner wins for each priority/tie case and whether priority 0 bypasses suppression exactly as documented.",
          currentStatus: "partial-local-proof",
          currentEvidence: [
            "area-lighting-retail-runtime-oracle-pack-proof.json",
            "progfx-type4-runtime-oracle-blocker-proof.json",
            "retail-progfx-priority-policy-before.png",
            "retail-progfx-priority-policy-after.png",
            "retail-progfx-priority-policy.json",
            "audit-retail-progfx-type4-table-2026-07-03.json",
            "docs-backed-progfx-type4-param4-priority-lower-value-wins"
          ],
          blocker:
            "Local diagnostics evaluate docs-backed policy, but retail owner grouping and tie behavior are not observed."
        },
        {
          caseId: "progfx-type4-proximity-threshold",
          purpose:
            "Measure the retail distance threshold and candidate selection for Param5 proximity suppression near another light source.",
          requiredArtifacts: [
            "retail-progfx-proximity-distance-sweep.json",
            "retail-progfx-proximity-distance-sweep-contact-sheet.png"
          ],
          acceptanceGate:
            "The sweep must identify the suppression threshold, source lane participating in proximity, and restore behavior when distance changes.",
          currentStatus: "partial-local-proof",
          currentEvidence: [
            "area-lighting-retail-runtime-oracle-pack-proof.json",
            "progfx-type4-runtime-oracle-blocker-proof.json",
            "retail-progfx-proximity-distance-sweep.json",
            "retail-progfx-proximity-distance-sweep-contact-sheet.png",
            "retail-progfx-proximity-distance-sweep-contact-sheet-near.png",
            "retail-progfx-proximity-distance-sweep-contact-sheet-mid.png",
            "retail-progfx-proximity-distance-sweep-contact-sheet-far.png",
            "audit-retail-progfx-type4-table-2026-07-03.json",
            "progfxType4RequestProximitySuppressionCount=1",
            "docs-backed-progfx-type4-param5-proximity-suppression-near-other-light"
          ],
          blocker:
            "Docs say the row suppresses near another light source, but the retail distance threshold and candidate set are unknown."
        },
        {
          caseId: "progfx-type4-attach-to-scene-restore",
          purpose:
            "Prove Param6 attach-to-scene removal and restore timing for scene lights while the Type 4 effect is active.",
          requiredArtifacts: [
            "retail-progfx-attach-scene-before.png",
            "retail-progfx-attach-scene-active.png",
            "retail-progfx-attach-scene-after-remove.png",
            "retail-progfx-attach-scene-restore.json"
          ],
          acceptanceGate:
            "The oracle must show which scene lights are removed while active and exactly when they return after effect removal.",
          currentStatus: "partial-local-proof",
          currentEvidence: [
            "area-lighting-retail-runtime-oracle-pack-proof.json",
            "progfx-type4-runtime-oracle-blocker-proof.json",
            "retail-progfx-attach-scene-before.png",
            "retail-progfx-attach-scene-active.png",
            "retail-progfx-attach-scene-after-remove.png",
            "retail-progfx-attach-scene-restore.json",
            "audit-retail-progfx-type4-table-2026-07-03.json",
            "docs-backed-progfx-type4-param6-attach-to-scene-removes-scene-lights"
          ],
          blocker:
            "Local scheduler diagnostics can count attach requests, but retail suppression/restoration timing is not recovered."
        },
        {
          caseId: "progfx-type4-blind-vision-pixels",
          purpose:
            "Capture retail Blind_Vision/Darkvision vision mutation pixels and compare against Aurora Web diagnostics without promoting a fake PointLight.",
          requiredArtifacts: [
            "retail-progfx-blindvision-before.png",
            "retail-progfx-blindvision-active.png",
            "retail-progfx-blindvision-pixel-compare.json"
          ],
          acceptanceGate:
            "The comparison must prove the visual mutation, affected viewport pixels, and request priority/owner phase for the same visualeffects.2da owner row.",
          currentStatus: "partial-local-proof",
          currentEvidence: [
            "area-lighting-retail-runtime-oracle-pack-proof.json",
            "progfx-type4-runtime-oracle-blocker-proof.json",
            "retail-progfx-blindvision-before.png",
            "retail-progfx-blindvision-active.png",
            "retail-progfx-blindvision-before-active-diff.png",
            "retail-progfx-blindvision-pixel-compare.json",
            "progfx-blindvision-row329-cross-lane-runtime-probe-2026-07-03.png",
            "progfx-blindvision-row329-cross-lane-runtime-probe-2026-07-03.frame.json"
          ],
          blocker:
            "Aurora Web preserves the vision request lane; retail vision mutation pixels are not captured."
        }
      ],
      nextStep:
        "Trace ProgFX Type 4 scheduler after visualeffects/progfx table resolution or capture paired retail cases for priority ties, proximity threshold, attach-to-scene restore, and Blind_Vision pixels."
    }
  ];
}

function resolveAuditGapNextStep(entry: AreaLightingAuditCoverageGapEntry): string {
  if (entry.status === "blocked") {
    return (
      entry.blocker ??
      "Recover the missing Aurora runtime path from decompilation or prove equivalent behavior with a retail/toolset oracle capture."
    );
  }
  if (entry.status === "preview-only") {
    return (
      entry.blocker ??
      "Replace the preview fallback with source-backed Aurora data or keep it explicitly marked as preview-only."
    );
  }
  return `Add a scanned area/resource fixture that exercises ${entry.label}, or mark the lane out of scope with source-backed evidence.`;
}

function isAreaShadowFieldName(
  field: AreaGlobalLightingFieldEvidence["field"]
): field is AreaShadowGlobalFieldName {
  return (AREA_SHADOW_FIELD_NAMES as readonly string[]).includes(field);
}

function mapCatalogLightSourceEvidence(
  input: AreaCatalogLightSourceInput
): AreaCatalogLightSourceEvidence {
  const metadata = input.metadata;
  const evidence = new Set<AreaCatalogLightSourceEvidence["evidence"][number]>([
    "catalog.light_source"
  ]);
  if (readMetadataString(metadata, "source2daLightColorRaw")) {
    evidence.add("placeables.2da.LightColor");
  }
  const lightState = readMetadataNumber(metadata, "lightState");
  if (lightState !== undefined) {
    evidence.add("utp.LightState");
  }

  return {
    templateId: input.templateId,
    resref: input.resref,
    name: input.name,
    category: input.category,
    tags: [...input.tags],
    evidence: [...evidence],
    ...optionalString("source2daLightColorRaw", readMetadataString(metadata, "source2daLightColorRaw")),
    ...optionalNumber("source2daLightColorRow", readMetadataNumber(metadata, "source2daLightColorRow")),
    ...optionalString("source2daLightColorLabel", readMetadataString(metadata, "source2daLightColorLabel")),
    ...optionalString("source2daLightColorSourceKey", readMetadataString(metadata, "source2daLightColorSourceKey")),
    ...optionalNumber("source2daLightRed", readMetadataNumber(metadata, "source2daLightRed")),
    ...optionalNumber("source2daLightGreen", readMetadataNumber(metadata, "source2daLightGreen")),
    ...optionalNumber("source2daLightBlue", readMetadataNumber(metadata, "source2daLightBlue")),
    ...optionalNumber("source2daToolsetRed", readMetadataNumber(metadata, "source2daToolsetRed")),
    ...optionalNumber("source2daToolsetGreen", readMetadataNumber(metadata, "source2daToolsetGreen")),
    ...optionalNumber("source2daToolsetBlue", readMetadataNumber(metadata, "source2daToolsetBlue")),
    ...optionalNumber("source2daLightOffsetX", readMetadataNumber(metadata, "source2daLightOffsetX")),
    ...optionalNumber("source2daLightOffsetY", readMetadataNumber(metadata, "source2daLightOffsetY")),
    ...optionalNumber("source2daLightOffsetZ", readMetadataNumber(metadata, "source2daLightOffsetZ")),
    ...optionalNumber("source2daShadowSize", readMetadataNumber(metadata, "source2daShadowSize")),
    ...optionalBoolean("source2daStatic", readMetadataBoolean(metadata, "source2daStatic")),
    ...optionalNumber("lightState", lightState),
    ...optionalString("modelResRef", readMetadataString(metadata, "modelResRef")),
    ...optionalString("lookupModelResRef", readMetadataString(metadata, "lookupModelResRef"))
  };
}

function collectTileLightingEvidence(area: AreaRecord): AreaTileLightingEvidence[] {
  return (area.tiles ?? [])
    .filter(hasTileLightingEvidence)
    .map((tile) => ({
      areaId: area.areaId,
      areaName: area.name,
      tileInstanceId: tile.tileInstanceId,
      row: tile.row,
      col: tile.col,
      tileIndex: tile.tileIndex,
      ...(tile.tileId !== undefined ? { tileId: tile.tileId } : {}),
      tilesetResRef: tile.tilesetResRef,
      ...(tile.modelResRef ? { modelResRef: tile.modelResRef } : {}),
      ...(tile.mainLight1 !== undefined ? { mainLight1: tile.mainLight1 } : {}),
      ...(tile.mainLight2 !== undefined ? { mainLight2: tile.mainLight2 } : {}),
      ...(tile.sourceLight1 !== undefined ? { sourceLight1: tile.sourceLight1 } : {}),
      ...(tile.sourceLight2 !== undefined ? { sourceLight2: tile.sourceLight2 } : {}),
      ...(tile.mainLight1Color ? { mainLight1Color: tile.mainLight1Color } : {}),
      ...(tile.mainLight2Color ? { mainLight2Color: tile.mainLight2Color } : {}),
      ...(tile.sourceLight1Color ? { sourceLight1Color: tile.sourceLight1Color } : {}),
      ...(tile.sourceLight2Color ? { sourceLight2Color: tile.sourceLight2Color } : {}),
      ...(tile.animLoop1 !== undefined ? { animLoop1: tile.animLoop1 } : {}),
      ...(tile.animLoop2 !== undefined ? { animLoop2: tile.animLoop2 } : {}),
      ...(tile.animLoop3 !== undefined ? { animLoop3: tile.animLoop3 } : {})
    }));
}

function collectAreaGlobalLightingEvidence(area: AreaRecord): AreaGlobalLightingEvidence[] {
  const lighting = area.lighting;
  if (!lighting || lighting.fields.length === 0) {
    return [];
  }
  return [
    {
      areaId: area.areaId,
      areaName: area.name,
      source: lighting.source,
      fields: lighting.fields.map((field) => ({
        field: field.field,
        value: field.value
      }))
    }
  ];
}

function collectPlaceableLightingCandidateEvidence(
  area: AreaRecord
): AreaPlaceableLightingCandidateEvidence[] {
  return area.objects
    .filter((object) => object.kind === "placeable")
    .map((object) => {
      const matchedTokens = matchPlaceableLightTokens(object);
      return { object, matchedTokens };
    })
    .filter((entry) => entry.matchedTokens.length > 0)
    .map(({ object, matchedTokens }) => ({
      areaId: area.areaId,
      areaName: area.name,
      objectId: object.objectId,
      templateId: object.templateId,
      ...(object.resRef ? { resRef: object.resRef } : {}),
      ...(object.tag ? { tag: object.tag } : {}),
      ...(object.localizedName ? { localizedName: object.localizedName } : {}),
      ...(object.description ? { description: object.description } : {}),
      ...(object.appearanceType !== undefined ? { appearanceType: object.appearanceType } : {}),
      ...(object.genericType !== undefined ? { genericType: object.genericType } : {}),
      x: object.x,
      y: object.y,
      z: object.z,
      matchedTokens
    }));
}

function hasTileLightingEvidence(tile: AreaTileInstance): boolean {
  return (
    tile.mainLight1 !== undefined ||
    tile.mainLight2 !== undefined ||
    tile.sourceLight1 !== undefined ||
    tile.sourceLight2 !== undefined ||
    tile.animLoop1 !== undefined ||
    tile.animLoop2 !== undefined ||
    tile.animLoop3 !== undefined
  );
}

function matchPlaceableLightTokens(object: AreaObjectPlacement): string[] {
  const haystack = [
    object.templateId,
    object.resRef ?? "",
    object.tag ?? "",
    object.localizedName ?? "",
    object.description ?? ""
  ].join("|");
  return PLACEABLE_LIGHT_TOKEN_PATTERNS
    .filter(([, pattern]) => pattern.test(haystack))
    .map(([token]) => token);
}

function countDefined(...values: Array<number | undefined>): number {
  return values.filter((value) => value !== undefined).length;
}

function countActiveTileLightReferences(tile: AreaTileLightingEvidence): number {
  return TILE_LIGHT_REFERENCE_CHANNELS.reduce(
    (sum, { key }) => sum + (isActiveTileLightReference(tile[key]) ? 1 : 0),
    0
  );
}

function countDecodedTileLightColors(tile: AreaTileLightingEvidence): number {
  return TILE_LIGHT_REFERENCE_CHANNELS.reduce(
    (sum, { colorKey }) => sum + (isTileLightColorDecoded(tile[colorKey]) ? 1 : 0),
    0
  );
}

function countRenderableTileLightColors(tile: AreaTileLightingEvidence): number {
  return TILE_LIGHT_REFERENCE_CHANNELS.reduce(
    (sum, { colorKey }) => sum + (isTileLightColorActive(tile[colorKey]) ? 1 : 0),
    0
  );
}

function countRenderableTileSourceLightColors(tile: AreaTileLightingEvidence): number {
  return (
    (isActiveTileLightReference(tile.sourceLight1) &&
    isTileLightColorActive(tile.sourceLight1Color)
      ? 1
      : 0) +
    (isActiveTileLightReference(tile.sourceLight2) &&
    isTileLightColorActive(tile.sourceLight2Color)
      ? 1
      : 0)
  );
}

function countRenderableTileMainLightColors(tile: AreaTileLightingEvidence): number {
  return (
    (isActiveTileLightReference(tile.mainLight1) && isTileLightColorActive(tile.mainLight1Color)
      ? 1
      : 0) +
    (isActiveTileLightReference(tile.mainLight2) && isTileLightColorActive(tile.mainLight2Color)
      ? 1
      : 0)
  );
}

function isActiveTileLightReference(value: number | undefined): boolean {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isTileLightColorDecoded(
  color: AreaTileLightingEvidence[AreaTileLightingColorKey] | undefined
): boolean {
  return (
    color !== undefined &&
    [color.red, color.green, color.blue].every(
      (channel) => typeof channel === "number" && Number.isFinite(channel)
    )
  );
}

function isTileLightColorActive(
  color: AreaTileLightingEvidence[AreaTileLightingColorKey] | undefined
): boolean {
  return (
    color !== undefined &&
    [color.red, color.green, color.blue].some(
      (channel) => typeof channel === "number" && Number.isFinite(channel) && channel > 1e-6
    )
  );
}

function readMetadataString(
  metadata: Record<string, CatalogLightingMetadataPrimitive>,
  key: string
): string | undefined {
  const value = metadata[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function readMetadataNumber(
  metadata: Record<string, CatalogLightingMetadataPrimitive>,
  key: string
): number | undefined {
  const value = metadata[key];
  return readFiniteNumber(value);
}

function readMetadataBoolean(
  metadata: Record<string, CatalogLightingMetadataPrimitive>,
  key: string
): boolean | undefined {
  const value = metadata[key];
  return typeof value === "boolean" ? value : undefined;
}

function optionalString<TKey extends string>(
  key: TKey,
  value: string | undefined
): { [K in TKey]?: string } {
  return value === undefined ? {} : { [key]: value } as { [K in TKey]?: string };
}

function optionalNumber<TKey extends string>(
  key: TKey,
  value: number | undefined
): { [K in TKey]?: number } {
  return value === undefined ? {} : { [key]: value } as { [K in TKey]?: number };
}

function optionalBoolean<TKey extends string>(
  key: TKey,
  value: boolean | undefined
): { [K in TKey]?: boolean } {
  return value === undefined ? {} : { [key]: value } as { [K in TKey]?: boolean };
}

function readFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
