import * as THREE from "three";
import {
  AURORA_SHADOW_VOLUME_CASTER_THREE_GEOMETRY_HELPER_SOURCE,
  AURORA_SHADOW_VOLUME_CASTER_THREE_GEOMETRY_HELPER_STATUS,
  AURORA_SHADOW_VOLUME_INDICES_PER_CASTER_EDGE,
  AURORA_SHADOW_VOLUME_MAX_CASTER_EDGE_COUNT,
  AURORA_SHADOW_VOLUME_RECORDS_PER_SOURCE_VERTEX
} from "./auroraShadowVolumeGeometry";
import {
  AURORA_LIGHT_MANAGER_PREVIEW_BUDGET_STRATEGY,
  AURORA_LIGHT_MANAGER_PREVIEW_BUDGET_STRATEGY_PROOF_STATUS,
  AURORA_LIGHT_MANAGER_PREVIEW_BUDGET_STRATEGY_SOURCE,
  buildAuroraLightManagerPreviewScoreUserData,
  selectAuroraLightManagerPreviewBudget,
  type AuroraLightManagerPreviewBudgetEntry
} from "./auroraLightManagerPreview";
import {
  AURORA_PROGFX_TYPE4_PRIORITY_EVALUATION_ORDER_SOURCE,
  AURORA_PROGFX_TYPE4_PRIORITY_TIE_POLICY_STATUS,
  AURORA_PROGFX_TYPE4_PRIORITY_ZERO_POLICY_STATUS,
  AURORA_PROGFX_TYPE4_SCHEDULER_BLOCKER,
  AURORA_PROGFX_TYPE4_SCHEDULER_NOT_OBSERVED_STATUS,
  AURORA_PROGFX_TYPE4_SCHEDULER_PROOF_SOURCE,
  AURORA_PROGFX_TYPE4_SCHEDULER_STATUS,
  resolveAuroraProgFxType4SchedulerPolicy
} from "./auroraProgFxType4SchedulerPolicy";

const AURORA_SCENE_LIGHT_PREVIEW_ACTIVE_SLOT_CAP = 128;
const AURORA_SCENE_LIGHT_SAMPLE_LIMIT = 12;
const AURORA_SCENE_NON_POINT_LIGHT_REQUEST_SAMPLE_LIMIT = 12;
const AURORA_SCENE_SHADOW_SAMPLE_LIMIT = 12;

export const AURORA_SCENE_LIGHT_DIAGNOSTIC_PROOF_STATUS =
  "preview-only-scene-point-light-audit-no-retail-cross-lane-ordering";
export const AURORA_SCENE_LIGHT_RETAIL_ORDERING_STATUS =
  "blocked-no-recovered-retail-cross-lane-active-light-ordering";
export const AURORA_SCENE_LIGHT_RETAIL_ORDERING_PROOF_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:865534-865548 recovers FUN_00a4128c internal LightManager insertion into +0x8/+0x20/+0x14 lists; 865714-866424 recovers active-light score/sort/upload and slot cap; 866325-866425 recovers FUN_00a41e50 upload order where special manager lights +0x70/+0x6c use slot 0xffffffff before sorted list slots; source-only lightManagerSourceOrderingEvidence proofStatus=source-backed-lightmanager-frame-rebuild-sort-upload-cross-lane-owner-precedence-blocked reports directInsertionCallHits=[], frameRebuildOrderingEvidence proofStatus=source-backed-lightmanager-frame-rebuild-vtable-dispatch-order-owner-lane-precedence-blocked from 905440-905446 LightManager construction, 913205-913227 rebuild reset, 918249-918258 add dispatch +0x10, 918383-918388 remove dispatch +0x14, and 919879-919960 frame rebuild/sort/sample order, directProximityUploadEvidence proofStatus=source-backed-lightmanager-direct-proximity-upload-order, and retailUploadOrderEvidence proofStatus=source-backed-lightmanager-special-lights-before-sorted-slot-upload; 453567-453602 creates terrain source-light fx_flame01 carriers; retail ApplyLight bridge now recovers item-property lights through VFX_DUR_LIGHT CGameEffect rows; 348244 loads visualeffects.2da without a recovered progfx.2da runtime scheduler; backend/scripts/audit-retail-light-function-disasm.py capstone-free lightManagerRetailXrefs on nwmain.exe reports LightManager targetCount=23/requestedTargetCount=4, directCallXrefCount=23, requestedDirectCallXrefCount=0, directCallTargetSummary helper/query calls only (GetMaxLights=10 calls/8 caller functions, GetEmitterLighting=3/2, GetShadowLights=3/2, SetHeadLightProperties=2/2, plus ctor/dtor/lensflare/nearest/render-ranges single-call helpers), requestedDirectCallTargetSummary=[] for AddLight/PrioritizeLights/RemoveLight/UpdateLights, absoluteAddressRefCount=12, absoluteVtableClusterEvidence proofStatus=retail-binary-backed-lightmanager-core-methods-rdata-vtable-cluster-no-direct-callsite cluster=0x140d85f78..0x140d85fd0 slotCount=12 requestedCoreSlotCount=4 contiguousSlots=true, indirectVtableSlotCallEvidence proofStatus=capstone-free-lightmanager-vtable-slot-indirect-call-candidates-register-dataflow-blocked candidateCount=8626 slotCounts PrioritizeLights=5298/AddLight=617/RemoveLight=2520/UpdateLights=191 sampledCandidateCount=192 sampledCandidatesWithKnownDirectCallContextCount=16 sampledKnownDirectCallTargetSummary GetShadowLights=21/GetEmitterLighting=20/RenderLightRanges=10/Gob::CollectLights=10/GetNearestLights=3/CExoArrayList<PartLight>::Add=3/GetLensFlareLights=1; helper/query direct calls, core-method vtable slots, generic indirect slot-offset candidates, and source-backed frame-level dispatch are visible, but owner-lane precedence between terrain-tile-light, placeables-2da-light, source-mdl-light-node, item-property-light, and progfx-type4-light-request is still not recovered";
export const AURORA_SCENE_LIGHT_RETAIL_ORDERING_PROOF_STATUS =
  "source-backed-cross-lane-ordering-blocked-no-common-insertion-callsite";
export const AURORA_SCENE_LIGHT_MANAGER_INTERNAL_INSERTION_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:865534-865548 FUN_00a4128c inserts a light into the manager all-lights list +0x8, the no-0x70 list +0x20, and the shadow/extra list +0x14 when field +0x40 is set and either +0x70 or +0x6c exists; 865598-865614 removes a light from all internal manager lists";
export const AURORA_SCENE_LIGHT_MANAGER_INTERNAL_INSERTION_PROOF_STATUS =
  "source-backed-lightmanager-internal-insertion-known-cross-lane-source-callsite-blocked";
export const AURORA_SCENE_LIGHT_MANAGER_CROSS_LANE_CALLSITE_BLOCKER =
  "FUN_00a4128c internal insertion, frame-level LightManager +0x108 dispatch order, FUN_00a42f5c direct proximity upload order, and FUN_00a41e50 special-before-sorted slot upload are recovered, and retail LightManager methods are exported; source-only lightManagerSourceOrderingEvidence proofStatus=source-backed-lightmanager-frame-rebuild-sort-upload-cross-lane-owner-precedence-blocked reports directInsertionCallHits=[], frameRebuildOrderingEvidence proofStatus=source-backed-lightmanager-frame-rebuild-vtable-dispatch-order-owner-lane-precedence-blocked, directProximityUploadEvidence proofStatus=source-backed-lightmanager-direct-proximity-upload-order, and retailUploadOrderEvidence proofStatus=source-backed-lightmanager-special-lights-before-sorted-slot-upload, while backend/scripts/audit-retail-light-function-disasm.py capstone-free binary xrefs report LightManager targetCount=23/requestedTargetCount=4 with directCallXrefCount=23, requestedDirectCallXrefCount=0, absoluteAddressRefCount=12, absoluteVtableClusterEvidence proofStatus=retail-binary-backed-lightmanager-core-methods-rdata-vtable-cluster-no-direct-callsite cluster=0x140d85f78..0x140d85fd0 slotCount=12 requestedCoreSlotCount=4 contiguousSlots=true LightManagerNameDistanceBytes=157, and indirectVtableSlotCallEvidence proofStatus=capstone-free-lightmanager-vtable-slot-indirect-call-candidates-register-dataflow-blocked candidateCount=8626 slotCounts PrioritizeLights=5298/AddLight=617/RemoveLight=2520/UpdateLights=191 sampledCandidateCount=192 sampledCandidatesWithKnownDirectCallContextCount=16 sampledKnownDirectCallTargetSummary GetShadowLights=21/GetEmitterLighting=20/RenderLightRanges=10/Gob::CollectLights=10/GetNearestLights=3/CExoArrayList<PartLight>::Add=3/GetLensFlareLights=1; directCallTargetSummary shows helper/query direct calls only (GetMaxLights=10 calls/8 caller functions, GetEmitterLighting=3/2, GetShadowLights=3/2, SetHeadLightProperties=2/2, plus ctor/dtor/lensflare/nearest/render-ranges helpers with one call each), requestedDirectCallTargetSummary=[] for AddLight/PrioritizeLights/RemoveLight/UpdateLights, and indirect slot-offset candidates plus their sampled same-function direct-call context are helper/render/collect inventory without receiver/lane data-flow or owner-lane data-flow, so tile/placeable/MDL/item/ProgFX creation precedence into the same manager is still not proven";
export const AURORA_SCENE_LIGHT_RETAIL_SORT_SCORE_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:865731-865735 FUN_00a41694 compares active-light score field +0x84 with '<'; 865838-865911 FUN_00a41850 writes +0x84 from runtime camera distance, radius, multiplier, owner priority, and unresolved runtime fields before FUN_00a4165c/FUN_00a417bc sort the active/shadow lists";
export const AURORA_SCENE_LIGHT_RETAIL_SORT_SCORE_FORMULA =
  "ascending +0x84 score; invalid radius/multiplier/extent -> 100000; current-object lane -> -1; otherwise ((priority+1)*cameraDistance)/((field_0x70+4)*(rangeTerm+1)) where rangeTerm is 20 for static-owner lights or radius*multiplier*runtimeExtent";
export const AURORA_SCENE_LIGHT_RETAIL_SORT_DIRECTION =
  "ascending-score-field-0x84";
export const AURORA_SCENE_LIGHT_RETAIL_SORT_SCORE_PROOF_STATUS =
  "source-backed-retail-active-light-score-sort-known-cross-lane-insertion-blocked";
export const AURORA_SCENE_LIGHT_RETAIL_ORDERING_COVERAGE_COMPLETE_STATUS =
  "observed-required-tile-placeable-mdl-item-vfx-lanes-ordering-still-blocked";
export const AURORA_SCENE_LIGHT_RETAIL_ORDERING_COVERAGE_INCOMPLETE_STATUS =
  "missing-required-light-lane-observations-ordering-still-blocked";
export const AURORA_SCENE_LIGHT_RETAIL_ORDERING_RUNTIME_PROBE_COMPLETE_STATUS =
  "local-cross-lane-runtime-probe-observed-required-lanes-retail-ordering-still-blocked";
export const AURORA_SCENE_LIGHT_RETAIL_ORDERING_RUNTIME_PROBE_INCOMPLETE_STATUS =
  "local-cross-lane-runtime-probe-missing-required-lanes-retail-ordering-still-blocked";
export const AURORA_SCENE_LIGHT_RETAIL_ORDERING_RUNTIME_PROBE_PROOF_SOURCE =
  "runtime scene diagnostic scans source-backed THREE.PointLight lanes and ProgFX Type 4 scheduler requests, including single-request source-backed PointLight previews when present, reports required lane coverage, and sorts local preview light samples by explicit budgetRank when present, then recovered retail +0x84 score preview when present, then traversal index; this is a local Aurora Web proof lane, not recovered retail insertion order";
export const AURORA_SCENE_LIGHT_RETAIL_ORDERING_RUNTIME_PROBE_BLOCKER =
  "Local runtime probe can prove which tile/placeable/MDL/item/ProgFX lanes are present and how Aurora Web budgeted its preview lights, but retail cross-lane insertion/creation order remains blocked until a common LightManager callsite, receiver-proven vtable dispatch, or retail/toolset oracle scene proves lane precedence";
export const AURORA_SCENE_LIGHT_RETAIL_ORDERING_RUNTIME_PROBE_LOCAL_ORDER_SOURCE =
  "local preview order only: source-backed PointLight samples sorted by budgetRank -> retailScore +0x84 preview -> traversal index; ProgFX Type 4 scheduler samples are listed separately, and single Type 4 light requests may also expose a source-backed PointLight preview without claiming recovered retail scheduler insertion order";
export const AURORA_SCENE_LIGHT_RETAIL_ORDERING_REQUIRED_LANES = [
  "terrain-tile-light",
  "placeables-2da-light",
  "source-mdl-light-node",
  "item-property-light",
  "progfx-type4-light-request"
] as const;
export const AURORA_SCENE_LIGHT_BUDGET_MODE =
  "source-backed-lightmanager-score-mutates-pointlight-visibility-retail-precedence-blocked";
export const AURORA_SCENE_LIGHT_MANAGER_PREVIEW_BUDGET_PLAN_STATUS =
  "source-backed-lightmanager-score-global-budget-active-preview-retail-precedence-blocked";
export const AURORA_SCENE_LIGHT_MANAGER_PREVIEW_BUDGET_PLAN_BLOCKER =
  "Aurora Web applies a global source-backed preview budget from the recovered LightManager +0x84 score sort and 0x80 slot cap by mutating THREE.PointLight visibility, but it still does not claim retail cross-lane owner precedence until retail/toolset ordering evidence exists.";
export const AURORA_SCENE_PROGFX_TYPE4_SCHEDULER_STATUS =
  AURORA_PROGFX_TYPE4_SCHEDULER_STATUS;
export const AURORA_SCENE_PROGFX_TYPE4_SCHEDULER_PROOF_SOURCE =
  AURORA_PROGFX_TYPE4_SCHEDULER_PROOF_SOURCE;
export const AURORA_SCENE_PROGFX_TYPE4_SCHEDULER_BLOCKER =
  AURORA_PROGFX_TYPE4_SCHEDULER_BLOCKER;
export const AURORA_SCENE_PROGFX_TYPE4_SCHEDULER_NOT_OBSERVED_STATUS =
  AURORA_PROGFX_TYPE4_SCHEDULER_NOT_OBSERVED_STATUS;
export const AURORA_SCENE_PROGFX_TYPE4_PRIORITY_TIE_POLICY_STATUS =
  AURORA_PROGFX_TYPE4_PRIORITY_TIE_POLICY_STATUS;
export const AURORA_SCENE_PROGFX_TYPE4_PRIORITY_ZERO_POLICY_STATUS =
  AURORA_PROGFX_TYPE4_PRIORITY_ZERO_POLICY_STATUS;
export const AURORA_SCENE_PROGFX_TYPE4_PRIORITY_EVALUATION_ORDER_SOURCE =
  AURORA_PROGFX_TYPE4_PRIORITY_EVALUATION_ORDER_SOURCE;
export const AURORA_SCENE_LIGHT_OBSERVED_LANES_SOURCE =
  "diagnostic coverage set sorted by lane name; not retail insertion or render order";
export const AURORA_SCENE_LIGHT_BUDGET_CAP_PROOF_STATUS =
  "source-backed-active-light-slot-cap-max-128";
export const AURORA_SCENE_LIGHT_ACTIVE_SLOT_CAP_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:866086-866096 FUN_00a41e30 caps light slots at 0x80 unless runtime max-lights is lower";
export const AURORA_SCENE_SHADOW_DIAGNOSTIC_PROOF_STATUS =
  "source-backed-scene-shadow-audit-preview-proxies-no-retail-projection-parity";
export const AURORA_SCENE_SHADOW_RETAIL_PROJECTION_STATUS =
  "blocked-no-retail-shadow-volume-projection-parity";
export const AURORA_SCENE_SHADOW_RETAIL_PROJECTION_SOURCE =
  "backend/scripts/audit-retail-light-function-disasm.py shadowVolumeProjectionEvidence proofStatus=source-backed-shadowplane-shadowvol-shader-caster-path-stencil-face-op-render-state-slot3-and-local-draw-order-mapped-retail-parity-blocked, casterBufferPreparationEvidence proofStatus=source-backed-shadowvol-caster-buffer-prep-index-vertex-fill, casterBufferGeometryEvidence proofStatus=source-backed-shadowvol-caster-geometry-paired-vertex-index-buffer-fill with perSourceVertexRecords=2, indicesPerCasterEdge=6, maxCasterEdgeClamp=0x2aaa, casterDrawWrapperEvidence proofStatus=source-backed-shadowvol-caster-draw-wrapper-gl-dispatch, stencilOpSequenceEvidence proofStatus=source-backed-shadowvol-zpass-zfail-stencil-op-sequence-face-op-mapped with toolsetFaceOpTableEvidence proofStatus=source-backed-toolset-binary-glstencilopseparate-face-op-table-mapped, renderStateWrapperEvidence proofStatus=source-backed-shadowvol-render-state-slot3-gl-cull-face-stack-bracket-mapped with toolsetCapabilityEvidence proofStatus=source-backed-toolset-binary-render-state-slot3-gl-cull-face-mapped, blendDepthColorMaskWrapperEvidence proofStatus=source-backed-render-state-blend-depth-color-mask-wrappers-mapped, immediateCallerBufferFlushEvidence proofStatus=source-backed-shadowvol-immediate-caller-buffer-flush-no-blend-depth-color-mask-state-wrapper with blendDepthColorMaskCallHits=[], directCallerBufferBuilderEvidence proofStatus=source-backed-shadowvol-direct-caller-buffer-builder-no-blend-depth-color-mask-state-wrapper with blendDepthColorMaskCallHits=[], activeLightRenderEnvelopeEvidence proofStatus=source-backed-shadowvol-active-light-render-envelope-vtable-dispatch-blend-depthfunc-wrapper-exposed-parity-blocked with colorDepthMaskCallHits=[], localDrawStateOrderEvidence proofStatus=source-backed-shadowvol-local-draw-state-order-exposed-outer-blend-depth-color-mask-parity-blocked with localBlendDepthColorMaskCallHits=[], and shaderUniformEvidence proofStatus=source-backed-shadowvol-shader-bind-transform-and-uniform-slot-writes-exposed; frontendRuntimePortStatus=source-backed-shadowplane-shadowvol-shader-caster-path-zpass-zfail-stencil-render-state-slot3-preview-active-retail-face-op-mapped-parity-blocked; C:/Projects/New Folder/export/decompiled_all.c:888069-888414 FUN_00a5fdb4 is the direct caller/buffer builder, computes caster edges, calls FUN_00a878f8(DAT_00d0233c), allocates/maps caster buffers, transforms source vertices, writes paired w=1/w=0 records, fills six indices per caster edge, and has no blend/depth/color-mask raw or facade wrapper hits; 888188-888213 prepares shadow caster count/state, calls FUN_00a878f8(DAT_00d0233c) as a caster-buffer flush/capacity path, and updates light +0x68/+100 before allocating local_30*6 indices; 888245-888256 allocates/maps caster buffers through FUN_00a69868/FUN_00a6a370/FUN_00a6a6a4/FUN_00a6a6dc; 888319-888403 transforms source vertices through FUN_00b2f49c, writes paired vertex records at iVar23 + n*0x20 and iVar23 + 0x10 + n*0x20, fills six indices per caster edge through puVar13, and finalizes through FUN_00a6a798/FUN_00a6a754; 910553-910663 FUN_00a82464 sets DAT_00d0233c=param_1, exposes FUN_00a78724/FUN_00a7819c depthFunc/blendFunc facades around +0x138 and +0x108 vtable dispatch, restores slots 0/1/4/5, clears DAT_00d0233c, and has no color/depth-mask wrapper hit; 910673-910872 FUN_00a82d8c renders shadow-plane alpha with ShadowOpacity factor; 911283-911418 FUN_00a83fec recomputes runtime extents; 913914-914017 FUN_00a878f8 shadowvol path loads vs_shadowvol/fs_shadowvol and renders caster geometry from light radius/shadowradius/verticaldisplacement; 913929 calls FUN_00a7818c(3) before shadow-volume draw, 913986-913987 sets FUN_00a78344(0,0,0,3) and FUN_00a78344(1,0,0,4), 913996 pushes render state through FUN_00a780f0, 913999 transforms the shadow light matrix through FUN_00a785d4, 914001 binds DAT_00d0247c through FUN_00a788b0, 914002 writes uniform slot 0 through FUN_00a78994, 914012 writes uniform slot 1 scalar through FUN_00a78980, 914025 pops through FUN_00a780e8, and 914027 restores slot 3 through FUN_00a7816c(3); 914032-914033 switches to FUN_00a78344(0,0,4,0) and FUN_00a78344(1,0,3,0); 913929-914033 local draw-state order, 888188-888213 immediate caller, 888069-888414 direct caller/buffer-builder, and 910553-910663 active-light render envelope have no color/depth-mask wrapper hit, so indirect inherited render-state parity remains blocked; 896387-896475 FUN_00a6c44c/FUN_00a6c520 pop/push 0x40-byte render-state blocks; 898307-898416 FUN_00a6ef90/FUN_00a6f0bc set/clear _DAT_00d01c0c slot bits and dispatch glEnable/glDisable; 898421-898425 maps FUN_00a6f1ec to glBlendFunc, 898533-898563 maps FUN_00a6f3bc to glColorMask, 898618-898624 maps FUN_00a6f4f8 to glDepthMask, and 898630-898634 maps FUN_00a6f518 to glDepthFunc; 904153-904157 maps facade FUN_00a7819c to FUN_00a6f1ec, 904335-904339 maps facade FUN_00a78384 to FUN_00a6f3bc, 904542-904546 maps facade FUN_00a785bc to FUN_00a6f4f8, and 904686-904690 maps facade FUN_00a78724 to FUN_00a6f518; 904308-904311 FUN_00a78344 wraps FUN_00a6f2b4 before PTR_DAT_00d3dd6c dispatch; 904560-904969 FUN_00a785d4/FUN_00a788b0/FUN_00a78994/FUN_00a78980 wrap transform, shader-bind, vec4 uniform-slot, and scalar uniform-slot writes; 897399-897403 FUN_00a482a8 updates the matrix source, 902170-902176 FUN_00a74fd0 binds the shader program, 900870-900884 FUN_00a7278c writes vec4 uniforms, and 900852-900857 FUN_00a72764 writes scalar uniforms; C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe .data maps 0x00d3dd6c -> 0x00d12d20 glStencilOpSeparate proc pointer, face table 0xcc9a38 slot 0=GL_FRONT/0x404 slot 1=GL_BACK/0x405, and op table 0xcc99d8 slot 0=GL_KEEP/0x1e00 slot 3=GL_INCR/0x1e02 slot 4=GL_DECR/0x1e03; nwtoolset.exe .text jump tables 0xa6efc4/0xa6f0f2 map render-state slot 3 to push 0x0b44 before glEnable/glDisable, i.e. GL_CULL_FACE; 904108-904112 FUN_00a78128 wraps FUN_00a75e3c; 902867-902912 FUN_00a75e3c binds buffers and dispatches through PTR_DAT_00d3dda8 or glDrawArrays";
export const AURORA_SCENE_SHADOW_RETAIL_PROJECTION_SHADER_NAMES = [
  "vs_shadowvol",
  "fs_shadowvol"
] as const;
export const AURORA_SCENE_SHADOW_RETAIL_PROJECTION_LIGHT_PROFILE_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:913930-913955 uses point-light shadow profile when light radius +0x58 <= 1000, chooses shadowradius +0x60 when positive else radius +0x58, and adds verticaldisplacement +0x64 to position z; 913956-913980 uses a directional/distant profile when radius +0x58 > 1000";
export const AURORA_SCENE_SHADOW_RETAIL_PROJECTION_LIGHT_PROFILE_STATUS =
  "source-backed-shadowvol-light-profile-known-active-stencil-preview-retail-parity-blocked";
export const AURORA_SCENE_SHADOW_RETAIL_PROJECTION_GEOMETRY_SOURCE =
  `C:/Projects/New Folder/export/decompiled_all.c:913986-914017 binds vs_shadowvol/fs_shadowvol, walks scene geometry buckets 0xd/0xe/0xb/0xc, draws caster geometry with FUN_00a78128, then clears the per-caster shadow counter; ${AURORA_SHADOW_VOLUME_CASTER_THREE_GEOMETRY_HELPER_SOURCE}; frontend auroraShadowVolumeGeometry helper ports recordsPerSourceVertex=${AURORA_SHADOW_VOLUME_RECORDS_PER_SOURCE_VERTEX}, indicesPerCasterEdge=${AURORA_SHADOW_VOLUME_INDICES_PER_CASTER_EDGE}, maxCasterEdgeClamp=0x${AURORA_SHADOW_VOLUME_MAX_CASTER_EDGE_COUNT.toString(16)}`;
export const AURORA_SCENE_SHADOW_RETAIL_PROJECTION_GEOMETRY_STATUS =
  AURORA_SHADOW_VOLUME_CASTER_THREE_GEOMETRY_HELPER_STATUS;
export const AURORA_SCENE_SHADOW_RETAIL_PROJECTION_RENDER_BUCKETS = [
  "0xd",
  "0xe",
  "0xb",
  "0xc"
] as const;
export const AURORA_SCENE_SHADOW_RETAIL_PROJECTION_PROOF_STATUS =
  "source-backed-shadowplane-shadowvol-shader-caster-path-zpass-zfail-stencil-render-state-slot3-preview-active-retail-face-op-mapped-parity-blocked";
export const AURORA_SCENE_SHADOW_RETAIL_PROJECTION_BLOCKER =
  "Aurora Web now has source-backed helpers for the retail paired-vertex/six-index caster buffer schema, the equivalent Three BufferGeometry with auroraShadowVolumeW, placeable fast-shadow proxies bind a source-quad caster buffer through that helper, an active Three ShaderMaterial w-pair extrusion preview uses the recovered shadowradius/verticaldisplacement profile, a WebGL stencil front/back z-pass/z-fail receiver lane uses the retail-mapped GL_FRONT/GL_BACK plus GL_KEEP/GL_INCR/GL_DECR sequence, render-state wrapper slot 3 is mapped to GL_CULL_FACE through the nwtoolset.exe jump tables, and FUN_00a82464 active-light render envelope evidence narrows inherited state to indirect +0x138/+0x108 vtable dispatch with exposed depthFunc/blendFunc facades but no color/depth-mask wrapper hit; the runtime probe exposes local caster/receiver/pass counts for CDP pixel capture, but pixel/geometry/complete wrapped render-state parity against FUN_00a878f8 -> FUN_00a78128 -> FUN_00a75e3c, indirect vtable inherited state, and retail/toolset shadow-volume output is still not proven";
export const AURORA_SCENE_SHADOW_VOLUME_RUNTIME_PROBE_ACTIVE_STATUS =
  "source-backed-shadowvol-runtime-probe-active-local-renderer-proof-retail-oracle-blocked";
export const AURORA_SCENE_SHADOW_VOLUME_RUNTIME_PROBE_NOT_OBSERVED_STATUS =
  "not-observed-no-active-shadowvol-placeable-fast-shadow-proxies";
export const AURORA_SCENE_SHADOW_VOLUME_RUNTIME_PROBE_PROOF_SOURCE =
  "runtime scene diagnostic scans active placeable fast-shadow proxies for source-backed auroraShadowVolumeW caster geometry, ShaderMaterial w-pair extrusion preview, WebGL stencil front/back z-pass/z-fail receiver lane, retail-mapped GL_FRONT/GL_BACK and GL_KEEP/GL_INCR/GL_DECR op sequence, vs_shadowvol/fs_shadowvol shader metadata, and render bucket metadata before CDP pixel capture";
export const AURORA_SCENE_SHADOW_VOLUME_RUNTIME_PROBE_BLOCKER =
  "Local runtime probe proves Aurora Web is emitting the source-backed shadow-volume/stencil preview lane and can pair it with CDP canvas pixels, but exact retail/toolset pixel geometry, blend/depth/stencil ordering, and opacity parity still require an oracle capture";
export const AURORA_SCENE_SHADOW_VOLUME_RUNTIME_PROBE_LOCAL_PIXEL_STATUS =
  "local-cdp-canvas-pixels-required-not-retail-oracle";
export const AURORA_SCENE_SHADOW_VOLUME_RUNTIME_PROBE_EXPECTED_STENCIL_PASSES = [
  "back:zpass",
  "front:zpass",
  "back:zfail",
  "front:zfail"
] as const;

interface AuroraSceneLightLaneSample {
  readonly lane: string;
  readonly role: string;
  readonly source: string;
  readonly name: string;
  readonly worldPosition: readonly number[];
  readonly itemPropertyVisualEffectRowId: number | null;
  readonly itemPropertyVisualEffectConstant: string;
  readonly itemPropertyVisualEffectLabel: string;
  readonly itemPropertyVisualEffectLabelSource: string;
  readonly itemPropertyProgFxRowId: number | null;
  readonly itemPropertyProgFxLabel: string;
  readonly itemPropertyProgFxFadeRowId: number | null;
  readonly itemPropertyProgFxFadeLabel: string;
  readonly itemPropertyProgFxRowSource: string;
  readonly itemPropertyProgFxAnimation: string;
  readonly color: readonly number[];
  readonly intensity: number;
  readonly intensitySource: string;
  readonly intensityProofStatus: string;
  readonly distance: number;
  readonly distanceSource: string;
  readonly radiusProofStatus: string;
  readonly falloffFormula: string;
  readonly falloffProofStatus: string;
  readonly falloffRendererPatchStatus: string;
  readonly falloffRendererProofStatus: string;
  readonly falloffRendererSource: string;
  readonly sourceModelFileName: string;
  readonly sourceRadius: number | null;
  readonly sourceRadiusUnits: string;
  readonly sourceRadiusWorldScale: number | null;
  readonly sourceRadiusWorldDistance: number | null;
  readonly castShadow: boolean;
  readonly budgetRank: number | null;
  readonly budgetAccepted: boolean | null;
  readonly retailScore: number | null;
  readonly retailScorePriority: number | null;
  readonly retailScorePreviewDistance: number | null;
  readonly retailScoreSourceRadius: number | null;
  readonly retailScoreActiveSelectionRadiusOverride: number | null;
  readonly retailScoreActiveSelectionRadiusLimit: number | null;
  readonly retailScoreActiveSelectionRadiusEnforced: boolean | null;
  readonly retailScoreActiveSelectionRadiusPassed: boolean | null;
  readonly retailScoreActiveSelectionRadiusRule: string;
  readonly retailScoreActiveSelectionRadiusSource: string;
  readonly retailScoreMultiplier: number | null;
  readonly retailScoreField0x70: number | null;
  readonly retailScoreRuntimeExtent: number | null;
  readonly retailScoreRangeTerm: number | null;
  readonly retailScoreFormula: string;
  readonly retailScoreSource: string;
  readonly retailScoreProofStatus: string;
  readonly retailScoreSortDirection: string;
  readonly retailScoreFallback: string;
}

interface AuroraSceneNonPointLightRequestSample {
  readonly lane: string;
  readonly rowId: number | null;
  readonly label: string;
  readonly worldPosition: readonly number[];
  readonly animationRaw: string;
  readonly animation: string;
  readonly animationParameterStatus: string;
  readonly animationKind: string;
  readonly visionMode: string;
  readonly visionParameterStatus: string;
  readonly symbolicColor: string;
  readonly tokenRadiusMeters: number | null;
  readonly tokenRadiusProofStatus: string;
  readonly radiusMeters: number | null;
  readonly radiusProofStatus: string;
  readonly sourceMdlNodeName: string;
  readonly sourceMdlAnimation: string;
  readonly sourceMdlColor: readonly number[];
  readonly sourceMdlRadiusMeters: number | null;
  readonly sourceMdlRadiusFrames: readonly number[];
  readonly sourceMdlRadiusProofStatus: string;
  readonly animationSpeedRaw: string;
  readonly animationSpeedParameterStatus: string;
  readonly castShadowsRaw: string;
  readonly castShadows: boolean | null;
  readonly castShadowParameterStatus: string;
  readonly priorityRaw: string;
  readonly priority: number | null;
  readonly priorityParameterStatus: string;
  readonly proximitySuppressionRaw: string;
  readonly proximitySuppression: boolean | null;
  readonly proximitySuppressionParameterStatus: string;
  readonly attachToSceneRaw: string;
  readonly attachToScene: boolean | null;
  readonly sceneAttachmentParameterStatus: string;
  readonly modelRaw: string;
  readonly modelParameterStatus: string;
  readonly unusedParam8Raw: string;
  readonly parameterSource: string;
  readonly parameterPreservationProofSource: string;
  readonly parameterPreservationProofStatus: string;
  readonly ownerVisualEffectRowId: number | null;
  readonly ownerVisualEffectLabel: string;
  readonly proofStatus: string;
  readonly runtimeSchedulingStatus: string;
  readonly runtimeSchedulingProofSource: string;
  readonly runtimeSchedulingBlocker: string;
  readonly sceneAttachmentPolicyStatus: string;
  readonly proximitySuppressionPolicyStatus: string;
  readonly visionMutationPolicyStatus: string;
  readonly shadowPolicyStatus: string;
  readonly visualPreviewStatus: string;
  readonly notPlaceableTwoDaLight: boolean | null;
  readonly notMdlLightNode: boolean | null;
}

interface AuroraSceneCrossLaneRuntimeProbeSample {
  readonly lane: string;
  readonly kind: string;
  readonly name: string;
  readonly localOrderKey: number | null;
  readonly traversalIndex: number;
  readonly budgetRank: number | null;
  readonly budgetAccepted: boolean | null;
  readonly retailScore: number | null;
  readonly priority: number | null;
  readonly source: string;
  readonly proofStatus: string;
}

interface AuroraSceneCrossLaneRuntimeProbeDiagnostics {
  readonly status: string;
  readonly proofSource: string;
  readonly blocker: string;
  readonly localOrderSource: string;
  readonly requiredLaneCoverageCount: number;
  readonly pointLightSampleCount: number;
  readonly nonPointRequestSampleCount: number;
  readonly budgetAcceptedLanes: readonly string[];
  readonly budgetDroppedLanes: readonly string[];
  readonly budgetUnknownLanes: readonly string[];
  readonly localOrderSamples: readonly string[];
}

interface AuroraSceneLightManagerPreviewBudgetPlanDiagnostics {
  readonly status: string;
  readonly strategy: string;
  readonly proofSource: string;
  readonly proofStatus: string;
  readonly blocker: string;
  readonly acceptedLanes: readonly string[];
  readonly droppedLanes: readonly string[];
  readonly samples: readonly string[];
}

interface AuroraScenePointLightShadowSample {
  readonly lane: string;
  readonly name: string;
  readonly proofStatus: string;
  readonly sourceShadow: boolean | null;
  readonly sourceShadowRadius: number | null;
  readonly animatedShadowRadius: number | null;
  readonly effectiveShadowRadius: number | null;
  readonly shadowProjectionSourceRadius: number | null;
  readonly shadowProjectionRadiusWorldDistance: number | null;
  readonly shadowProjectionRadiusSource: string;
  readonly shadowProjectionRadiusProofStatus: string;
  readonly distance: number;
  readonly rendererMode: string;
  readonly projectionStatus: string;
  readonly projectionSource: string;
  readonly projectionProofStatus: string;
}

interface AuroraSceneItemPropertyLightShadowPolicySample {
  readonly lane: string;
  readonly name: string;
  readonly status: string;
  readonly proofStatus: string;
  readonly source: string;
  readonly runtimeSchedulerProofSource: string;
  readonly runtimeSchedulerBlocker: string;
  readonly shadowPolicySource: string;
  readonly visualEffectRowId: number | null;
  readonly visualEffectConstant: string;
  readonly visualEffectLabel: string;
  readonly visualEffectLabelSource: string;
  readonly progFxRowId: number | null;
  readonly progFxLabel: string;
  readonly progFxFadeRowId: number | null;
  readonly progFxFadeLabel: string;
  readonly progFxRowSource: string;
  readonly progFxAnimation: string;
  readonly brightnessLabel: string;
  readonly colorLabel: string;
  readonly noSelfGlowProofStatus: string;
  readonly castShadow: boolean;
  readonly distance: number;
  readonly equipmentResRef: string;
  readonly equipmentAttachmentTarget: string;
}

interface AuroraSceneDirectionalLightShadowSample {
  readonly lane: string;
  readonly name: string;
  readonly phase: string;
  readonly sourceField: string;
  readonly status: string;
  readonly implementationStatus: string;
  readonly opacity: number | null;
  readonly opacityFactor: number | null;
  readonly color: readonly number[];
  readonly intensity: number;
}

interface AuroraSceneProgFxType4ShadowRequestSample {
  readonly lane: string;
  readonly rowId: number | null;
  readonly label: string;
  readonly animation: string;
  readonly castShadowsRaw: string;
  readonly castShadows: boolean | null;
  readonly castShadowParameterStatus: string;
  readonly parameterPreservationProofStatus: string;
  readonly proofStatus: string;
  readonly runtimeSchedulingStatus: string;
  readonly runtimeSchedulingProofSource: string;
  readonly runtimeSchedulingBlocker: string;
  readonly shadowPolicyStatus: string;
  readonly visualPreviewStatus: string;
}

interface AuroraSceneFastShadowSample {
  readonly objectId: string;
  readonly status: string;
  readonly shadowSize: number | null;
  readonly shadowSizeSource: string;
  readonly shadowSizeProofStatus: string;
  readonly shadowSizeLane: string;
  readonly shadowSizeSelectionProofStatus: string;
  readonly modelFileName: string;
  readonly sourceModelHash: string;
  readonly sourceNodeOffset: number | null;
  readonly emitterNodeName: string;
  readonly emitterType: string;
  readonly texture: string;
  readonly textureBindingStatus: string;
  readonly textureMapBound: boolean | null;
  readonly textureBindingProofStatus: string;
  readonly renderMode: string;
  readonly blendMode: string;
  readonly emitterPosition: readonly number[];
  readonly emitterSize: number | null;
  readonly geometryType: string;
  readonly quadSize: number | null;
  readonly geometryProofStatus: string;
  readonly emitterAlpha: number | null;
  readonly radius: number | null;
  readonly radiusSource: string;
  readonly baseOpacity: number | null;
  readonly opacity: number | null;
  readonly opacitySource: string;
  readonly areaOpacity: number | null;
  readonly areaOpacityFactor: number | null;
  readonly areaOpacityFactorSource: string;
  readonly areaOpacityProofStatus: string;
  readonly opacityProofStatus: string;
  readonly projectionStatus: string;
  readonly projectionSource: string;
  readonly projectionProofStatus: string;
  readonly volumeCasterStatus: string;
  readonly volumeCasterGeometryStatus: string;
  readonly volumeCasterSourceVertexCount: number | null;
  readonly volumeCasterSourceQuadSize: number | null;
  readonly volumeCasterSourceQuadSizeSource: string;
  readonly volumeCasterEdgeCount: number | null;
  readonly volumeCasterVertexRecordCount: number | null;
  readonly volumeCasterIndexCount: number | null;
  readonly volumeCasterRecordsPerSourceVertex: number | null;
  readonly volumeCasterIndicesPerEdge: number | null;
  readonly volumeCasterWAttribute: string;
  readonly volumeCasterProofStatus: string;
  readonly volumeProjectionPreviewStatus: string;
  readonly volumeProjectionPreviewRendererMode: string;
  readonly volumeProjectionPreviewVisible: boolean | null;
  readonly volumeProjectionPreviewWAttribute: string;
  readonly volumeProjectionPreviewLightPosition: readonly number[];
  readonly volumeProjectionPreviewLightPositionSource: string;
  readonly volumeProjectionPreviewExtrusionDistance: number | null;
  readonly volumeProjectionPreviewExtrusionDistanceSource: string;
  readonly volumeProjectionPreviewOpacity: number | null;
  readonly volumeProjectionPreviewSource: string;
  readonly volumeProjectionPreviewProofStatus: string;
  readonly volumeStencilStatus: string;
  readonly volumeStencilRendererMode: string;
  readonly volumeStencilVisible: boolean | null;
  readonly volumeStencilWAttribute: string;
  readonly volumeStencilLightPosition: readonly number[];
  readonly volumeStencilLightPositionSource: string;
  readonly volumeStencilExtrusionDistance: number | null;
  readonly volumeStencilExtrusionDistanceSource: string;
  readonly volumeStencilReceiverSize: number | null;
  readonly volumeStencilReceiverOpacity: number | null;
  readonly volumeStencilReceiverFunc: string;
  readonly volumeStencilPasses: readonly string[];
  readonly volumeStencilPassStateSamples: readonly string[];
  readonly volumeStencilReceiverState: string;
  readonly volumeStencilStateProofStatus: string;
  readonly volumeStencilRetailFaceOpTable: string;
  readonly volumeStencilRetailOpSequence: string;
  readonly volumeStencilRetailOpSequenceSource: string;
  readonly volumeStencilSource: string;
  readonly volumeStencilProofStatus: string;
  readonly volumeRenderShaderNames: readonly string[];
  readonly volumeRenderBuckets: readonly string[];
  readonly volumeRenderBucketPhases: readonly string[];
  readonly volumeRenderBucketPhaseSource: string;
  readonly volumeRenderBucketPhaseProofStatus: string;
  readonly volumeRenderStateCallSequence: readonly string[];
  readonly volumeRenderStateCallSource: string;
  readonly volumeRenderStateCallProofStatus: string;
  readonly volumeRenderStateWrapperSemantics: readonly string[];
  readonly volumeRenderStateWrapperSource: string;
  readonly volumeRenderStateWrapperProofStatus: string;
  readonly volumeBlendDepthColorMaskWrappers: readonly string[];
  readonly volumeBlendDepthColorMaskWrapperSource: string;
  readonly volumeBlendDepthColorMaskWrapperProofStatus: string;
  readonly volumeImmediateCallerBufferFlushSource: string;
  readonly volumeImmediateCallerBufferFlushBlocker: string;
  readonly volumeImmediateCallerBufferFlushProofStatus: string;
  readonly volumeDirectCallerBufferBuilderSource: string;
  readonly volumeDirectCallerBufferBuilderBlocker: string;
  readonly volumeDirectCallerBufferBuilderProofStatus: string;
  readonly volumeActiveLightRenderEnvelopeState: readonly string[];
  readonly volumeActiveLightRenderEnvelopeSource: string;
  readonly volumeActiveLightRenderEnvelopeBlocker: string;
  readonly volumeActiveLightRenderEnvelopeProofStatus: string;
  readonly volumeLocalDrawStateOrder: readonly string[];
  readonly volumeLocalDrawStateOrderSource: string;
  readonly volumeLocalDrawStateOrderBlocker: string;
  readonly volumeLocalDrawStateOrderProofStatus: string;
  readonly volumeShaderUniformSemantics: readonly string[];
  readonly volumeShaderUniformSource: string;
  readonly volumeShaderUniformProofStatus: string;
  readonly volumeRenderPathSource: string;
  readonly volumeDrawWrapperSource: string;
  readonly volumeLightProfileSource: string;
  readonly volumeRenderPathProofStatus: string;
  readonly proofStatus: string;
}

interface AuroraSceneShadowVolumeRuntimeProbeDiagnostics {
  readonly status: string;
  readonly proofSource: string;
  readonly blocker: string;
  readonly localPixelProofStatus: string;
  readonly activeCasterCount: number;
  readonly projectionPreviewCount: number;
  readonly stencilReceiverCount: number;
  readonly stencilVolumePassCount: number;
  readonly expectedStencilPasses: readonly string[];
  readonly observedStencilPasses: readonly string[];
  readonly renderShaderNames: readonly string[];
  readonly renderBuckets: readonly string[];
  readonly samples: readonly string[];
}

export interface AuroraSceneShadowDiagnostics {
  readonly proofStatus: string;
  readonly retailProjectionStatus: string;
  readonly retailProjectionSource: string;
  readonly retailProjectionShaderNames: readonly string[];
  readonly retailProjectionLightProfileSource: string;
  readonly retailProjectionLightProfileStatus: string;
  readonly retailProjectionGeometrySource: string;
  readonly retailProjectionGeometryStatus: string;
  readonly retailProjectionRenderBuckets: readonly string[];
  readonly retailProjectionProofStatus: string;
  readonly retailProjectionBlocker: string;
  readonly retailProjectionRuntimeProbeStatus: string;
  readonly retailProjectionRuntimeProbeProofSource: string;
  readonly retailProjectionRuntimeProbeBlocker: string;
  readonly retailProjectionRuntimeProbeLocalPixelProofStatus: string;
  readonly retailProjectionRuntimeProbeActiveCasterCount: number;
  readonly retailProjectionRuntimeProbeProjectionPreviewCount: number;
  readonly retailProjectionRuntimeProbeStencilReceiverCount: number;
  readonly retailProjectionRuntimeProbeStencilVolumePassCount: number;
  readonly retailProjectionRuntimeProbeExpectedStencilPasses: readonly string[];
  readonly retailProjectionRuntimeProbeObservedStencilPasses: readonly string[];
  readonly retailProjectionRuntimeProbeRenderShaderNames: readonly string[];
  readonly retailProjectionRuntimeProbeRenderBuckets: readonly string[];
  readonly retailProjectionRuntimeProbeSamples: readonly string[];
  readonly pointLightCastShadowCount: number;
  readonly pointLightShadowSamples: readonly string[];
  readonly itemPropertyLightShadowPolicyCount: number;
  readonly itemPropertyLightShadowPolicySamples: readonly string[];
  readonly directionalLightCastShadowCount: number;
  readonly directionalLightShadowSamples: readonly string[];
  readonly progFxType4ShadowRequestCount: number;
  readonly progFxType4ShadowRequestSamples: readonly string[];
  readonly fastShadowProxyCount: number;
  readonly fastShadowDisabledCount: number;
  readonly fastShadowSamples: readonly string[];
  readonly areaShadowStatus: string;
  readonly areaShadowSourceField: string;
  readonly areaShadowStatusSource: string;
  readonly areaShadowOpacity: number | null;
  readonly areaShadowOpacitySource: string;
  readonly areaShadowOpacityFactor: number | null;
  readonly areaShadowOpacityFactorSource: string;
}

export interface AuroraScenePointLightDiagnostics {
  readonly proofStatus: string;
  readonly retailOrderingStatus: string;
  readonly retailOrderingProofSource: string;
  readonly retailOrderingProofStatus: string;
  readonly retailOrderingManagerInternalInsertionSource: string;
  readonly retailOrderingManagerInternalInsertionProofStatus: string;
  readonly retailOrderingManagerCrossLaneCallsiteBlocker: string;
  readonly retailOrderingSortScoreSource: string;
  readonly retailOrderingSortScoreFormula: string;
  readonly retailOrderingSortDirection: string;
  readonly retailOrderingSortScoreProofStatus: string;
  readonly retailOrderingCoverageStatus: string;
  readonly retailOrderingRequiredLanes: readonly string[];
  readonly retailOrderingObservedLanes: readonly string[];
  readonly retailOrderingObservedLanesSource: string;
  readonly retailOrderingMissingLanes: readonly string[];
  readonly retailOrderingRuntimeProbeStatus: string;
  readonly retailOrderingRuntimeProbeProofSource: string;
  readonly retailOrderingRuntimeProbeBlocker: string;
  readonly retailOrderingRuntimeProbeLocalOrderSource: string;
  readonly retailOrderingRuntimeProbeRequiredLaneCoverageCount: number;
  readonly retailOrderingRuntimeProbePointLightSampleCount: number;
  readonly retailOrderingRuntimeProbeNonPointRequestSampleCount: number;
  readonly retailOrderingRuntimeProbeBudgetAcceptedLanes: readonly string[];
  readonly retailOrderingRuntimeProbeBudgetDroppedLanes: readonly string[];
  readonly retailOrderingRuntimeProbeBudgetUnknownLanes: readonly string[];
  readonly retailOrderingRuntimeProbeLocalOrderSamples: readonly string[];
  readonly retailOrderingPreviewBudgetPlanStatus: string;
  readonly retailOrderingPreviewBudgetPlanStrategy: string;
  readonly retailOrderingPreviewBudgetPlanProofSource: string;
  readonly retailOrderingPreviewBudgetPlanProofStatus: string;
  readonly retailOrderingPreviewBudgetPlanBlocker: string;
  readonly retailOrderingPreviewBudgetPlanAcceptedLanes: readonly string[];
  readonly retailOrderingPreviewBudgetPlanDroppedLanes: readonly string[];
  readonly retailOrderingPreviewBudgetPlanSamples: readonly string[];
  readonly budgetMode: string;
  readonly previewBudgetCapSource: string;
  readonly previewBudgetCapProofStatus: string;
  readonly pointLightCount: number;
  readonly sourceBackedPointLightCount: number;
  readonly laneCounts: Readonly<Record<string, number>>;
  readonly lanes: readonly string[];
  readonly previewBudgetCap: number;
  readonly previewBudgetHardCap: number;
  readonly configuredMaxLights: number | null;
  readonly previewBudgetAcceptedCount: number;
  readonly previewBudgetDroppedCount: number;
  readonly samples: readonly string[];
  readonly nonPointLightRequestCount: number;
  readonly nonPointLightRequestLaneCounts: Readonly<Record<string, number>>;
  readonly nonPointLightRequestLanes: readonly string[];
  readonly nonPointLightRequestSamples: readonly string[];
  readonly nonPointLightRequestSchedulerStatus: string;
  readonly nonPointLightRequestSchedulerProofSource: string;
  readonly nonPointLightRequestSchedulerBlocker: string;
  readonly nonPointLightRequestSchedulerPriorityWinner: string;
  readonly nonPointLightRequestSchedulerPriorityEvaluationOrderSource: string;
  readonly nonPointLightRequestSchedulerPriorityEvaluationOrder: readonly string[];
  readonly nonPointLightRequestSchedulerPriorityTiePolicyStatus: string;
  readonly nonPointLightRequestSchedulerPriorityTopTieBlocked: boolean;
  readonly nonPointLightRequestSchedulerPriorityTopTieCandidateCount: number;
  readonly nonPointLightRequestSchedulerPriorityZeroPolicyStatus: string;
  readonly nonPointLightRequestSchedulerPriorityZeroRuntimeCaptureStatus: string;
  readonly nonPointLightRequestSchedulerCanonicalParityStatus: string;
  readonly nonPointLightRequestSchedulerPriorityTieGroupCount: number;
  readonly nonPointLightRequestSchedulerPriorityZeroAlwaysAppliesRequestCount: number;
  readonly nonPointLightRequestSchedulerSceneAttachmentRequestCount: number;
  readonly nonPointLightRequestSchedulerProximitySuppressionCandidateCount: number;
  readonly nonPointLightRequestSchedulerVisionRequestCount: number;
  readonly nonPointLightRequestSchedulerLightRequestCount: number;
  readonly nonPointLightRequestSchedulerWouldSuppressScenePointLights: boolean;
  readonly nonPointLightRequestSchedulerSamples: readonly string[];
  readonly shadow: AuroraSceneShadowDiagnostics;
}

interface AuroraSceneLightDiagnosticsRuntime {
  readonly scene: THREE.Scene;
  readonly container?: {
    readonly dataset?: Record<string, string | undefined>;
  };
}

function roundNumber(value: number): number {
  return Number(value.toFixed(4));
}

function roundVector3(value: THREE.Vector3): readonly number[] {
  return [roundNumber(value.x), roundNumber(value.y), roundNumber(value.z)];
}

function readFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readString(value: unknown): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function readNumberArray(value: unknown): readonly number[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (entry): entry is number => typeof entry === "number" && Number.isFinite(entry)
  );
}

function readStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (entry): entry is string => typeof entry === "string" && entry.trim().length > 0
  );
}

function resolveConfiguredMaxLights(scene: THREE.Scene): number | null {
  const configured =
    readFiniteNumber(scene.userData?.auroraLightConfiguredMaxLights) ??
    readFiniteNumber(scene.userData?.auroraTerrainTileLightConfiguredMaxLights);
  return configured === null ? null : Math.max(0, Math.trunc(configured));
}

function resolvePreviewBudgetCap(scene: THREE.Scene): {
  readonly cap: number;
  readonly configuredMaxLights: number | null;
} {
  const configuredMaxLights = resolveConfiguredMaxLights(scene);
  return {
    cap:
      configuredMaxLights === null
        ? AURORA_SCENE_LIGHT_PREVIEW_ACTIVE_SLOT_CAP
        : Math.min(configuredMaxLights, AURORA_SCENE_LIGHT_PREVIEW_ACTIVE_SLOT_CAP),
    configuredMaxLights
  };
}

function resolvePointLightLane(data: THREE.Object3D["userData"]): string {
  const role =
    readString(data.itemPropertyLightPreviewRole) ||
    readString(data.placeableTwoDaLightPreviewRole) ||
    readString(data.auroraVfxProgFxType4PreviewRole) ||
    readString(data.auroraLightPreviewRole) ||
    readString(data.creatureAuroraLightPreviewRole) ||
    readString(data.auroraTerrainTileLightRendererMode);

  if (role === "progfx-type4-point-light") {
    return "progfx-type4-light-request";
  }
  if (role === "item-property-point-light") {
    return "item-property-light";
  }
  if (role === "placeables-2da-point-light") {
    return "placeables-2da-light";
  }
  if (
    role === "source-mdl-point-light" ||
    role === "source-mdl-ambient-light" ||
    readString(data.auroraLightNodeName) ||
    readString(data.creatureAuroraLightNodeName)
  ) {
    return "source-mdl-light-node";
  }
  if (
    role === "point-light-preview" ||
    readString(data.auroraTerrainTileLightRole) ||
    readString(data.auroraTerrainTileLightChannel)
  ) {
    return "terrain-tile-light";
  }
  return "generic-three-point-light";
}

function resolvePointLightRole(data: THREE.Object3D["userData"]): string {
  return (
    readString(data.itemPropertyLightPreviewRole) ||
    readString(data.placeableTwoDaLightPreviewRole) ||
    readString(data.auroraVfxProgFxType4PreviewRole) ||
    readString(data.auroraLightPreviewRole) ||
    readString(data.creatureAuroraLightPreviewRole) ||
    readString(data.auroraTerrainTileLightRendererMode) ||
    "unknown"
  );
}

function resolvePointLightSource(data: THREE.Object3D["userData"], lane: string): string {
  return (
    readString(data.itemPropertyLightSource) ||
    readString(data.itemPropertyLightRuntimeSource) ||
    readString(data.auroraVfxProgFxType4PointLightPreviewSource) ||
    readString(data.auroraVfxProgFxType4ParameterSource) ||
    readString(data.placeableTwoDaLightColorSource) ||
    readString(data.placeableTwoDaLightColorSourceKey) ||
    readString(data.auroraTerrainTileLightColorSource) ||
    readString(data.auroraTerrainTileLightSourceKey) ||
    readString(data.auroraLightSourceNodeKind) ||
    readString(data.creatureAuroraLightSourceNodeKind) ||
    lane
  );
}

function resolvePointLightName(light: THREE.PointLight, data: THREE.Object3D["userData"]): string {
  return (
    readString(data.itemPropertyLightRelatedVisualEffectLabel) ||
    readString(data.itemPropertyLightRelatedVisualEffectConstant) ||
    readString(data.auroraVfxProgFxType4OwnerVisualEffectLabel) ||
    readString(data.auroraVfxProgFxType4Label) ||
    readString(data.placeableTwoDaLightColorLabel) ||
    readString(data.auroraLightNodeName) ||
    readString(data.creatureAuroraLightNodeName) ||
    readString(data.auroraTerrainTileId) ||
    readString(light.name) ||
    "point-light"
  );
}

function resolveBudgetRank(data: THREE.Object3D["userData"]): number | null {
  return (
    readFiniteNumber(data.auroraSceneLightBudgetRank) ??
    readFiniteNumber(data.itemPropertyLightBudgetRank) ??
    readFiniteNumber(data.auroraLightBudgetRank) ??
    readFiniteNumber(data.creatureAuroraLightBudgetRank) ??
    readFiniteNumber(data.auroraTerrainTileLightBudgetRank)
  );
}

function resolveBudgetAccepted(data: THREE.Object3D["userData"]): boolean | null {
  return (
    readBoolean(data.auroraSceneLightBudgetAccepted) ??
    readBoolean(data.itemPropertyLightBudgetAccepted) ??
    readBoolean(data.auroraLightBudgetAccepted) ??
    readBoolean(data.creatureAuroraLightBudgetAccepted) ??
    readBoolean(data.auroraTerrainTileLightBudgetAccepted)
  );
}

function buildPointLightSample(light: THREE.PointLight): AuroraSceneLightLaneSample {
  const data = light.userData ?? {};
  const lane = resolvePointLightLane(data);
  const worldPosition = new THREE.Vector3();
  light.getWorldPosition(worldPosition);
  return {
    lane,
    role: resolvePointLightRole(data),
    source: resolvePointLightSource(data, lane),
    name: resolvePointLightName(light, data),
    worldPosition: roundVector3(worldPosition),
    itemPropertyVisualEffectRowId: readFiniteNumber(
      data.itemPropertyLightRelatedVisualEffectRowId
    ),
    itemPropertyVisualEffectConstant: readString(
      data.itemPropertyLightRelatedVisualEffectConstant
    ),
    itemPropertyVisualEffectLabel: readString(
      data.itemPropertyLightRelatedVisualEffectLabel
    ),
    itemPropertyVisualEffectLabelSource: readString(
      data.itemPropertyLightRelatedVisualEffectLabelSource
    ),
    itemPropertyProgFxRowId: readFiniteNumber(
      data.itemPropertyLightRelatedProgFxRowId
    ),
    itemPropertyProgFxLabel: readString(data.itemPropertyLightRelatedProgFxLabel),
    itemPropertyProgFxFadeRowId: readFiniteNumber(
      data.itemPropertyLightRelatedProgFxFadeRowId
    ),
    itemPropertyProgFxFadeLabel: readString(
      data.itemPropertyLightRelatedProgFxFadeLabel
    ),
    itemPropertyProgFxRowSource: readString(
      data.itemPropertyLightRelatedProgFxRowSource
    ),
    itemPropertyProgFxAnimation: readString(data.itemPropertyLightRelatedProgFxAnimation),
    color: [roundNumber(light.color.r), roundNumber(light.color.g), roundNumber(light.color.b)],
    intensity: roundNumber(light.intensity),
    intensitySource:
      readString(data.auroraTerrainTileLightIntensitySource) ||
      readString(data.placeableTwoDaLightIntensitySource) ||
      readString(data.auroraVfxProgFxType4PointLightIntensitySource) ||
      readString(data.itemPropertyLightPointLightIntensitySource) ||
      readString(data.itemPropertyLightIntensitySource) ||
      readString(data.auroraLightMultiplierSource) ||
      readString(data.creatureAuroraLightMultiplierSource),
    intensityProofStatus:
      readString(data.auroraTerrainTileLightIntensityProofStatus) ||
      readString(data.placeableTwoDaLightIntensityProofStatus) ||
      readString(data.auroraVfxProgFxType4PointLightIntensityProofStatus) ||
      readString(data.itemPropertyLightPointLightIntensityProofStatus) ||
      readString(data.itemPropertyLightIntensityProofStatus) ||
      readString(data.auroraLightMultiplierProofStatus) ||
      readString(data.creatureAuroraLightMultiplierProofStatus),
    distance: roundNumber(light.distance),
    distanceSource:
      readString(data.auroraTerrainTileLightDistanceSource) ||
      readString(data.placeableTwoDaLightDistanceSource) ||
      readString(data.auroraVfxProgFxType4PointLightPreviewSource) ||
      readString(data.auroraVfxProgFxType4SourceMdlRadiusSource) ||
      readString(data.itemPropertyLightRadiusSource) ||
      readString(data.auroraLightRadiusSource) ||
      readString(data.creatureAuroraLightFalloffSource),
    radiusProofStatus:
      readString(data.auroraTerrainTileLightRadiusProofStatus) ||
      readString(data.placeableTwoDaLightRadiusProofStatus) ||
      readString(data.auroraVfxProgFxType4SourceMdlRadiusProofStatus) ||
      readString(data.auroraVfxProgFxType4RadiusProofStatus) ||
      readString(data.itemPropertyLightRadiusProofStatus) ||
      readString(data.auroraLightRadiusProofStatus) ||
      readString(data.creatureAuroraLightRadiusProofStatus),
    falloffFormula:
      readString(data.auroraTerrainTileLightFalloffFormula) ||
      readString(data.placeableTwoDaLightFalloffFormula) ||
      readString(data.auroraVfxProgFxType4FalloffFormula) ||
      readString(data.itemPropertyLightFalloffFormula) ||
      readString(data.auroraLightFalloffFormula) ||
      readString(data.creatureAuroraLightFalloffFormula),
    falloffProofStatus:
      readString(data.auroraTerrainTileLightFalloffProofStatus) ||
      readString(data.placeableTwoDaLightFalloffProofStatus) ||
      readString(data.auroraVfxProgFxType4FalloffProofStatus) ||
      readString(data.itemPropertyLightFalloffProofStatus) ||
      readString(data.auroraLightFalloffProofStatus) ||
      readString(data.creatureAuroraLightFalloffProofStatus),
    falloffRendererPatchStatus:
      readString(data.auroraTerrainTileLightFalloffRendererPatchStatus) ||
      readString(data.placeableTwoDaLightFalloffRendererPatchStatus) ||
      readString(data.auroraVfxProgFxType4FalloffRendererPatchStatus) ||
      readString(data.itemPropertyLightFalloffRendererPatchStatus) ||
      readString(data.auroraLightFalloffRendererPatchStatus) ||
      readString(data.creatureAuroraLightFalloffRendererPatchStatus),
    falloffRendererProofStatus:
      readString(data.auroraTerrainTileLightFalloffRendererProofStatus) ||
      readString(data.placeableTwoDaLightFalloffRendererProofStatus) ||
      readString(data.auroraVfxProgFxType4FalloffRendererProofStatus) ||
      readString(data.itemPropertyLightFalloffRendererProofStatus) ||
      readString(data.auroraLightFalloffRendererProofStatus) ||
      readString(data.creatureAuroraLightFalloffRendererProofStatus),
    falloffRendererSource:
      readString(data.auroraTerrainTileLightFalloffRendererSource) ||
      readString(data.placeableTwoDaLightFalloffRendererSource) ||
      readString(data.auroraVfxProgFxType4FalloffRendererSource) ||
      readString(data.itemPropertyLightFalloffRendererSource) ||
      readString(data.auroraLightFalloffRendererSource) ||
      readString(data.creatureAuroraLightFalloffRendererSource),
    sourceModelFileName:
      readString(data.auroraTerrainTileLightSourceModelFileName) ||
      readString(data.placeableTwoDaLightSourceModelFileName) ||
      readString(data.auroraVfxProgFxType4ModelRef) ||
      readString(data.auroraLightSourceModelFileName) ||
      readString(data.creatureAuroraLightSourceModelFileName),
    sourceRadius:
      readFiniteNumber(data.auroraTerrainTileLightSourceRadius) ??
      readFiniteNumber(data.placeableTwoDaLightSourceRadius) ??
      readFiniteNumber(data.auroraVfxProgFxType4SourceMdlRadiusMeters) ??
      readFiniteNumber(data.itemPropertyLightSourceMdlRadiusMeters) ??
      readFiniteNumber(data.auroraLightSourceRadius) ??
      readFiniteNumber(data.creatureAuroraLightSourceRadius),
    sourceRadiusUnits:
      readString(data.placeableTwoDaLightSourceRadiusUnits) ||
      readString(data.auroraVfxProgFxType4SourceMdlRadiusUnits) ||
      readString(data.itemPropertyLightSourceMdlRadiusUnits) ||
      readString(data.auroraTerrainTileLightSourceRadiusUnits) ||
      readString(data.auroraLightSourceRadiusUnits) ||
      readString(data.creatureAuroraLightSourceRadiusUnits),
    sourceRadiusWorldScale:
      readFiniteNumber(data.placeableTwoDaLightSourceUnitScale) ??
      (readString(data.auroraVfxProgFxType4PreviewRole) === "progfx-type4-point-light"
        ? 1
        : null) ??
      readFiniteNumber(data.itemPropertyLightMetersToWorldScale) ??
      readFiniteNumber(data.auroraTerrainTileLightSourceUnitScale) ??
      readFiniteNumber(data.auroraLightSourceUnitScale) ??
      readFiniteNumber(data.creatureAuroraLightSourceUnitScale),
    sourceRadiusWorldDistance:
      readFiniteNumber(data.placeableTwoDaLightSourceRadiusWorldDistance) ??
      readFiniteNumber(data.auroraVfxProgFxType4SourceMdlRadiusWorldDistance) ??
      readFiniteNumber(data.itemPropertyLightSourceMdlRadiusWorldDistance) ??
      readFiniteNumber(data.auroraTerrainTileLightSourceRadiusWorldDistance) ??
      readFiniteNumber(data.auroraLightSourceRadiusWorldDistance) ??
      readFiniteNumber(data.creatureAuroraLightSourceRadiusWorldDistance),
    castShadow: light.castShadow,
    budgetRank: resolveBudgetRank(data),
    budgetAccepted: resolveBudgetAccepted(data),
    retailScore:
      readFiniteNumber(data.auroraSceneLightRetailScore) ??
      readFiniteNumber(data.placeableTwoDaLightRetailScore) ??
      readFiniteNumber(data.itemPropertyLightRetailScore) ??
      readFiniteNumber(data.auroraTerrainTileLightRetailScore) ??
      readFiniteNumber(data.auroraVfxProgFxType4RetailScore) ??
      readFiniteNumber(data.auroraLightRetailScore) ??
      readFiniteNumber(data.creatureAuroraLightRetailScore),
    retailScorePriority:
      readFiniteNumber(data.auroraSceneLightRetailScorePriority) ??
      readFiniteNumber(data.placeableTwoDaLightRetailScorePriority) ??
      readFiniteNumber(data.itemPropertyLightRetailScorePriority) ??
      readFiniteNumber(data.auroraTerrainTileLightRetailScorePriority) ??
      readFiniteNumber(data.auroraVfxProgFxType4RetailScorePriority) ??
      readFiniteNumber(data.auroraLightRetailScorePriority) ??
      readFiniteNumber(data.creatureAuroraLightRetailScorePriority),
    retailScorePreviewDistance:
      readFiniteNumber(data.auroraSceneLightRetailScorePreviewDistance) ??
      readFiniteNumber(data.placeableTwoDaLightRetailScorePreviewDistance) ??
      readFiniteNumber(data.itemPropertyLightRetailScorePreviewDistance) ??
      readFiniteNumber(data.auroraTerrainTileLightRetailScorePreviewDistance) ??
      readFiniteNumber(data.auroraVfxProgFxType4RetailScorePreviewDistance) ??
      readFiniteNumber(data.auroraLightRetailScorePreviewDistance) ??
      readFiniteNumber(data.creatureAuroraLightRetailScorePreviewDistance),
    retailScoreSourceRadius:
      readFiniteNumber(data.auroraSceneLightRetailScoreSourceRadius) ??
      readFiniteNumber(data.placeableTwoDaLightRetailScoreSourceRadius) ??
      readFiniteNumber(data.itemPropertyLightRetailScoreSourceRadius) ??
      readFiniteNumber(data.auroraTerrainTileLightRetailScoreSourceRadius) ??
      readFiniteNumber(data.auroraVfxProgFxType4RetailScoreSourceRadius) ??
      readFiniteNumber(data.auroraLightRetailScoreSourceRadius) ??
      readFiniteNumber(data.creatureAuroraLightRetailScoreSourceRadius),
    retailScoreActiveSelectionRadiusOverride:
      readFiniteNumber(data.auroraSceneLightRetailScoreActiveSelectionRadiusOverride) ??
      readFiniteNumber(data.placeableTwoDaLightRetailScoreActiveSelectionRadiusOverride) ??
      readFiniteNumber(data.itemPropertyLightRetailScoreActiveSelectionRadiusOverride) ??
      readFiniteNumber(data.auroraTerrainTileLightRetailScoreActiveSelectionRadiusOverride) ??
      readFiniteNumber(data.auroraVfxProgFxType4RetailScoreActiveSelectionRadiusOverride) ??
      readFiniteNumber(data.auroraLightRetailScoreActiveSelectionRadiusOverride) ??
      readFiniteNumber(data.creatureAuroraLightRetailScoreActiveSelectionRadiusOverride),
    retailScoreActiveSelectionRadiusLimit:
      readFiniteNumber(data.auroraSceneLightRetailScoreActiveSelectionRadiusLimit) ??
      readFiniteNumber(data.placeableTwoDaLightRetailScoreActiveSelectionRadiusLimit) ??
      readFiniteNumber(data.itemPropertyLightRetailScoreActiveSelectionRadiusLimit) ??
      readFiniteNumber(data.auroraTerrainTileLightRetailScoreActiveSelectionRadiusLimit) ??
      readFiniteNumber(data.auroraVfxProgFxType4RetailScoreActiveSelectionRadiusLimit) ??
      readFiniteNumber(data.auroraLightRetailScoreActiveSelectionRadiusLimit) ??
      readFiniteNumber(data.creatureAuroraLightRetailScoreActiveSelectionRadiusLimit),
    retailScoreActiveSelectionRadiusEnforced:
      readBoolean(data.auroraSceneLightRetailScoreActiveSelectionRadiusEnforced) ??
      readBoolean(data.placeableTwoDaLightRetailScoreActiveSelectionRadiusEnforced) ??
      readBoolean(data.itemPropertyLightRetailScoreActiveSelectionRadiusEnforced) ??
      readBoolean(data.auroraTerrainTileLightRetailScoreActiveSelectionRadiusEnforced) ??
      readBoolean(data.auroraVfxProgFxType4RetailScoreActiveSelectionRadiusEnforced) ??
      readBoolean(data.auroraLightRetailScoreActiveSelectionRadiusEnforced) ??
      readBoolean(data.creatureAuroraLightRetailScoreActiveSelectionRadiusEnforced),
    retailScoreActiveSelectionRadiusPassed:
      readBoolean(data.auroraSceneLightRetailScoreActiveSelectionRadiusPassed) ??
      readBoolean(data.placeableTwoDaLightRetailScoreActiveSelectionRadiusPassed) ??
      readBoolean(data.itemPropertyLightRetailScoreActiveSelectionRadiusPassed) ??
      readBoolean(data.auroraTerrainTileLightRetailScoreActiveSelectionRadiusPassed) ??
      readBoolean(data.auroraVfxProgFxType4RetailScoreActiveSelectionRadiusPassed) ??
      readBoolean(data.auroraLightRetailScoreActiveSelectionRadiusPassed) ??
      readBoolean(data.creatureAuroraLightRetailScoreActiveSelectionRadiusPassed),
    retailScoreActiveSelectionRadiusRule:
      readString(data.auroraSceneLightRetailScoreActiveSelectionRadiusRule) ||
      readString(data.placeableTwoDaLightRetailScoreActiveSelectionRadiusRule) ||
      readString(data.itemPropertyLightRetailScoreActiveSelectionRadiusRule) ||
      readString(data.auroraTerrainTileLightRetailScoreActiveSelectionRadiusRule) ||
      readString(data.auroraVfxProgFxType4RetailScoreActiveSelectionRadiusRule) ||
      readString(data.auroraLightRetailScoreActiveSelectionRadiusRule) ||
      readString(data.creatureAuroraLightRetailScoreActiveSelectionRadiusRule),
    retailScoreActiveSelectionRadiusSource:
      readString(data.auroraSceneLightRetailScoreActiveSelectionRadiusSource) ||
      readString(data.placeableTwoDaLightRetailScoreActiveSelectionRadiusSource) ||
      readString(data.itemPropertyLightRetailScoreActiveSelectionRadiusSource) ||
      readString(data.auroraTerrainTileLightRetailScoreActiveSelectionRadiusSource) ||
      readString(data.auroraVfxProgFxType4RetailScoreActiveSelectionRadiusSource) ||
      readString(data.auroraLightRetailScoreActiveSelectionRadiusSource) ||
      readString(data.creatureAuroraLightRetailScoreActiveSelectionRadiusSource),
    retailScoreMultiplier:
      readFiniteNumber(data.auroraSceneLightRetailScoreMultiplier) ??
      readFiniteNumber(data.placeableTwoDaLightRetailScoreMultiplier) ??
      readFiniteNumber(data.itemPropertyLightRetailScoreMultiplier) ??
      readFiniteNumber(data.auroraTerrainTileLightRetailScoreMultiplier) ??
      readFiniteNumber(data.auroraVfxProgFxType4RetailScoreMultiplier) ??
      readFiniteNumber(data.auroraLightRetailScoreMultiplier) ??
      readFiniteNumber(data.creatureAuroraLightRetailScoreMultiplier),
    retailScoreField0x70:
      readFiniteNumber(data.auroraSceneLightRetailScoreField0x70) ??
      readFiniteNumber(data.placeableTwoDaLightRetailScoreField0x70) ??
      readFiniteNumber(data.itemPropertyLightRetailScoreField0x70) ??
      readFiniteNumber(data.auroraTerrainTileLightRetailScoreField0x70) ??
      readFiniteNumber(data.auroraVfxProgFxType4RetailScoreField0x70) ??
      readFiniteNumber(data.auroraLightRetailScoreField0x70) ??
      readFiniteNumber(data.creatureAuroraLightRetailScoreField0x70),
    retailScoreRuntimeExtent:
      readFiniteNumber(data.auroraSceneLightRetailScoreRuntimeExtent) ??
      readFiniteNumber(data.placeableTwoDaLightRetailScoreRuntimeExtent) ??
      readFiniteNumber(data.itemPropertyLightRetailScoreRuntimeExtent) ??
      readFiniteNumber(data.auroraTerrainTileLightRetailScoreRuntimeExtent) ??
      readFiniteNumber(data.auroraVfxProgFxType4RetailScoreRuntimeExtent) ??
      readFiniteNumber(data.auroraLightRetailScoreRuntimeExtent) ??
      readFiniteNumber(data.creatureAuroraLightRetailScoreRuntimeExtent),
    retailScoreRangeTerm:
      readFiniteNumber(data.auroraSceneLightRetailScoreRangeTerm) ??
      readFiniteNumber(data.placeableTwoDaLightRetailScoreRangeTerm) ??
      readFiniteNumber(data.itemPropertyLightRetailScoreRangeTerm) ??
      readFiniteNumber(data.auroraTerrainTileLightRetailScoreRangeTerm) ??
      readFiniteNumber(data.auroraVfxProgFxType4RetailScoreRangeTerm) ??
      readFiniteNumber(data.auroraLightRetailScoreRangeTerm) ??
      readFiniteNumber(data.creatureAuroraLightRetailScoreRangeTerm),
    retailScoreFormula:
      readString(data.auroraSceneLightRetailScoreFormula) ||
      readString(data.placeableTwoDaLightRetailScoreFormula) ||
      readString(data.itemPropertyLightRetailScoreFormula) ||
      readString(data.auroraTerrainTileLightRetailScoreFormula) ||
      readString(data.auroraVfxProgFxType4RetailScoreFormula) ||
      readString(data.auroraLightRetailScoreFormula) ||
      readString(data.creatureAuroraLightRetailScoreFormula),
    retailScoreSource:
      readString(data.auroraSceneLightRetailScoreSource) ||
      readString(data.placeableTwoDaLightRetailScoreSource) ||
      readString(data.itemPropertyLightRetailScoreSource) ||
      readString(data.auroraTerrainTileLightRetailScoreSource) ||
      readString(data.auroraVfxProgFxType4RetailScoreSource) ||
      readString(data.auroraLightRetailScoreSource) ||
      readString(data.creatureAuroraLightRetailScoreSource),
    retailScoreProofStatus:
      readString(data.auroraSceneLightRetailScoreProofStatus) ||
      readString(data.placeableTwoDaLightRetailScoreProofStatus) ||
      readString(data.itemPropertyLightRetailScoreProofStatus) ||
      readString(data.auroraTerrainTileLightRetailScoreProofStatus) ||
      readString(data.auroraVfxProgFxType4RetailScoreProofStatus) ||
      readString(data.auroraLightRetailScoreProofStatus) ||
      readString(data.creatureAuroraLightRetailScoreProofStatus),
    retailScoreSortDirection:
      readString(data.auroraSceneLightRetailScoreSortDirection) ||
      readString(data.placeableTwoDaLightRetailScoreSortDirection) ||
      readString(data.itemPropertyLightRetailScoreSortDirection) ||
      readString(data.auroraTerrainTileLightRetailScoreSortDirection) ||
      readString(data.auroraVfxProgFxType4RetailScoreSortDirection) ||
      readString(data.auroraLightRetailScoreSortDirection) ||
      readString(data.creatureAuroraLightRetailScoreSortDirection),
    retailScoreFallback:
      readString(data.auroraSceneLightRetailScoreFallback) ||
      readString(data.placeableTwoDaLightRetailScoreFallback) ||
      readString(data.itemPropertyLightRetailScoreFallback) ||
      readString(data.auroraTerrainTileLightRetailScoreFallback) ||
      readString(data.auroraVfxProgFxType4RetailScoreFallback) ||
      readString(data.auroraLightRetailScoreFallback) ||
      readString(data.creatureAuroraLightRetailScoreFallback)
  };
}

function formatSampleValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(formatSampleValue).join(",");
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(roundNumber(value));
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return "unknown";
}

function formatPointLightSample(sample: AuroraSceneLightLaneSample): string {
  return [
    `lane=${formatSampleValue(sample.lane)}`,
    `role=${formatSampleValue(sample.role)}`,
    `name=${formatSampleValue(sample.name)}`,
    `source=${formatSampleValue(sample.source)}`,
    `worldPosition=${formatSampleValue(sample.worldPosition)}`,
    `itemVfxRow=${formatSampleValue(sample.itemPropertyVisualEffectRowId)}`,
    `itemVfxConstant=${formatSampleValue(sample.itemPropertyVisualEffectConstant)}`,
    `itemVfxLabel=${formatSampleValue(sample.itemPropertyVisualEffectLabel)}`,
    `itemVfxLabelSource=${formatSampleValue(sample.itemPropertyVisualEffectLabelSource)}`,
    `itemProgFxRow=${formatSampleValue(sample.itemPropertyProgFxRowId)}`,
    `itemProgFxLabel=${formatSampleValue(sample.itemPropertyProgFxLabel)}`,
    `itemProgFxFadeRow=${formatSampleValue(sample.itemPropertyProgFxFadeRowId)}`,
    `itemProgFxFadeLabel=${formatSampleValue(sample.itemPropertyProgFxFadeLabel)}`,
    `itemProgFxRowSource=${formatSampleValue(sample.itemPropertyProgFxRowSource)}`,
    `itemProgFxAnimation=${formatSampleValue(sample.itemPropertyProgFxAnimation)}`,
    `color=${formatSampleValue(sample.color)}`,
    `intensity=${formatSampleValue(sample.intensity)}`,
    `intensitySource=${formatSampleValue(sample.intensitySource)}`,
    `intensityProof=${formatSampleValue(sample.intensityProofStatus)}`,
    `distance=${formatSampleValue(sample.distance)}`,
    `distanceSource=${formatSampleValue(sample.distanceSource)}`,
    `radiusProof=${formatSampleValue(sample.radiusProofStatus)}`,
    `falloff=${formatSampleValue(sample.falloffFormula)}`,
    `falloffProof=${formatSampleValue(sample.falloffProofStatus)}`,
    `falloffRendererPatch=${formatSampleValue(sample.falloffRendererPatchStatus)}`,
    `falloffRendererProof=${formatSampleValue(sample.falloffRendererProofStatus)}`,
    `falloffRendererSource=${formatSampleValue(sample.falloffRendererSource)}`,
    `sourceModel=${formatSampleValue(sample.sourceModelFileName)}`,
    `sourceRadius=${formatSampleValue(sample.sourceRadius)}`,
    `sourceRadiusUnits=${formatSampleValue(sample.sourceRadiusUnits)}`,
    `sourceRadiusWorldScale=${formatSampleValue(sample.sourceRadiusWorldScale)}`,
    `sourceRadiusWorldDistance=${formatSampleValue(sample.sourceRadiusWorldDistance)}`,
    `castShadow=${formatSampleValue(sample.castShadow)}`,
    `budgetRank=${formatSampleValue(sample.budgetRank)}`,
    `budgetAccepted=${formatSampleValue(sample.budgetAccepted)}`,
    `retailScore=${formatSampleValue(sample.retailScore)}`,
    `retailScorePriority=${formatSampleValue(sample.retailScorePriority)}`,
    `retailScorePreviewDistance=${formatSampleValue(sample.retailScorePreviewDistance)}`,
    `retailScoreSourceRadius=${formatSampleValue(sample.retailScoreSourceRadius)}`,
    `retailScoreActiveSelectionRadiusOverride=${formatSampleValue(
      sample.retailScoreActiveSelectionRadiusOverride
    )}`,
    `retailScoreActiveSelectionRadiusLimit=${formatSampleValue(
      sample.retailScoreActiveSelectionRadiusLimit
    )}`,
    `retailScoreActiveSelectionRadiusEnforced=${formatSampleValue(
      sample.retailScoreActiveSelectionRadiusEnforced
    )}`,
    `retailScoreActiveSelectionRadiusPassed=${formatSampleValue(
      sample.retailScoreActiveSelectionRadiusPassed
    )}`,
    `retailScoreActiveSelectionRadiusRule=${formatSampleValue(
      sample.retailScoreActiveSelectionRadiusRule
    )}`,
    `retailScoreActiveSelectionRadiusSource=${formatSampleValue(
      sample.retailScoreActiveSelectionRadiusSource
    )}`,
    `retailScoreMultiplier=${formatSampleValue(sample.retailScoreMultiplier)}`,
    `retailScoreField0x70=${formatSampleValue(sample.retailScoreField0x70)}`,
    `retailScoreRuntimeExtent=${formatSampleValue(sample.retailScoreRuntimeExtent)}`,
    `retailScoreRangeTerm=${formatSampleValue(sample.retailScoreRangeTerm)}`,
    `retailScoreFormula=${formatSampleValue(sample.retailScoreFormula)}`,
    `retailScoreSource=${formatSampleValue(sample.retailScoreSource)}`,
    `retailScoreProof=${formatSampleValue(sample.retailScoreProofStatus)}`,
    `retailScoreSort=${formatSampleValue(sample.retailScoreSortDirection)}`,
    `retailScoreFallback=${formatSampleValue(sample.retailScoreFallback)}`
  ].join(";");
}

function isSourceBackedLane(lane: string): boolean {
  return lane !== "generic-three-point-light";
}

interface AuroraSceneLightManagerRuntimeCandidate {
  readonly light: THREE.PointLight;
  readonly sample: AuroraSceneLightLaneSample;
}

function buildAuroraSceneLightManagerPreviewCandidates(
  scene: THREE.Scene
): AuroraSceneLightManagerRuntimeCandidate[] {
  const candidates: AuroraSceneLightManagerRuntimeCandidate[] = [];
  scene.traverse((node) => {
    if (!(node instanceof THREE.PointLight)) {
      return;
    }
    const sample = buildPointLightSample(node);
    if (!isSourceBackedLane(sample.lane)) {
      return;
    }
    candidates.push({ light: node, sample });
  });
  return candidates;
}

function buildAuroraSceneLightManagerPreviewBudgetEntries(
  scene: THREE.Scene,
  activeSlotCap: number
): AuroraLightManagerPreviewBudgetEntry<AuroraSceneLightManagerRuntimeCandidate>[] {
  return selectAuroraLightManagerPreviewBudget(
    buildAuroraSceneLightManagerPreviewCandidates(scene).map((candidate, sourceIndex) => ({
      key: `${candidate.sample.lane}:${candidate.sample.name}:${sourceIndex}`,
      sourceIndex,
      payload: candidate,
      scoreInput: {
        position: {
          x: candidate.sample.worldPosition[0] ?? 0,
          y: candidate.sample.worldPosition[1] ?? 0,
          z: candidate.sample.worldPosition[2] ?? 0
        },
        sourceRadius:
          candidate.sample.retailScoreSourceRadius ??
          candidate.sample.sourceRadiusWorldDistance ??
          candidate.sample.sourceRadius ??
          candidate.sample.distance,
          multiplier: candidate.sample.retailScoreMultiplier ?? candidate.sample.intensity,
          priority: candidate.sample.retailScorePriority ?? 0,
          field0x70: candidate.sample.retailScoreField0x70,
          runtimeExtent: candidate.sample.retailScoreRuntimeExtent,
          enforceActiveSelectionRadius: false
        }
      })),
    activeSlotCap
  );
}

export function applyAuroraSceneLightManagerPreviewBudget(scene: THREE.Scene): void {
  const budget = resolvePreviewBudgetCap(scene);
  const entries = buildAuroraSceneLightManagerPreviewBudgetEntries(scene, budget.cap);
  entries.forEach((entry) => {
    const light = entry.payload.light;
    const originalVisible =
      typeof light.userData.auroraSceneLightBudgetOriginalVisible === "boolean"
        ? light.userData.auroraSceneLightBudgetOriginalVisible
        : light.visible;
    const nextVisible = entry.accepted ? originalVisible : false;
    light.visible = nextVisible;
    light.userData = {
      ...light.userData,
      ...buildAuroraLightManagerPreviewScoreUserData(
        "auroraSceneLight",
        entry.retailScore
      ),
      auroraSceneLightBudgetManaged: true,
      auroraSceneLightBudgetMode: AURORA_SCENE_LIGHT_BUDGET_MODE,
      auroraSceneLightBudgetRank: entry.rank,
      auroraSceneLightBudgetAccepted: entry.accepted,
      auroraSceneLightBudgetCap: budget.cap,
      auroraSceneLightBudgetHardCap: AURORA_SCENE_LIGHT_PREVIEW_ACTIVE_SLOT_CAP,
      auroraSceneLightConfiguredMaxLights: budget.configuredMaxLights,
      auroraSceneLightBudgetOriginalVisible: originalVisible,
      auroraSceneLightBudgetRenderedVisible: nextVisible,
      auroraSceneLightBudgetDroppedReason: entry.accepted
        ? undefined
        : "active-light-slot-cap"
    };
  });
}

function buildPointLightShadowSample(light: THREE.PointLight): AuroraScenePointLightShadowSample {
  const data = light.userData ?? {};
  const lane = resolvePointLightLane(data);
  return {
    lane,
    name: resolvePointLightName(light, data),
    proofStatus:
      readString(data.auroraLightShadowProofStatus) ||
      readString(data.creatureAuroraLightShadowProofStatus) ||
      "three-pointlight-castshadow-source-unclassified",
    sourceShadow:
      readBoolean(data.auroraLightShadowEnabled) ??
      readBoolean(data.creatureAuroraLightShadowEnabled) ??
      readBoolean(data.auroraLightShadow),
    sourceShadowRadius:
      readFiniteNumber(data.auroraLightSourceShadowRadius) ??
      readFiniteNumber(data.auroraLightShadowRadius) ??
      readFiniteNumber(data.creatureAuroraLightShadowRadius),
    animatedShadowRadius:
      readFiniteNumber(data.auroraLightAnimatedShadowRadius) ??
      readFiniteNumber(data.creatureAuroraLightAnimatedShadowRadius),
    effectiveShadowRadius: readFiniteNumber(light.shadow?.radius),
    shadowProjectionSourceRadius:
      readFiniteNumber(data.auroraLightShadowProjectionSourceRadius) ??
      readFiniteNumber(data.creatureAuroraLightShadowProjectionSourceRadius),
    shadowProjectionRadiusWorldDistance:
      readFiniteNumber(data.auroraLightShadowProjectionRadiusWorldDistance) ??
      readFiniteNumber(data.creatureAuroraLightShadowProjectionRadiusWorldDistance),
    shadowProjectionRadiusSource:
      readString(data.auroraLightShadowProjectionRadiusSource) ||
      readString(data.creatureAuroraLightShadowProjectionRadiusSource),
    shadowProjectionRadiusProofStatus:
      readString(data.auroraLightShadowProjectionRadiusProofStatus) ||
      readString(data.creatureAuroraLightShadowProjectionRadiusProofStatus),
    distance: roundNumber(light.distance),
    rendererMode:
      readString(data.auroraLightShadowRendererMode) ||
      readString(data.creatureAuroraLightShadowRendererMode),
    projectionStatus:
      readString(data.auroraLightShadowProjectionStatus) ||
      readString(data.creatureAuroraLightShadowProjectionStatus),
    projectionSource:
      readString(data.auroraLightShadowProjectionSource) ||
      readString(data.creatureAuroraLightShadowProjectionSource),
    projectionProofStatus:
      readString(data.auroraLightShadowProjectionProofStatus) ||
      readString(data.creatureAuroraLightShadowProjectionProofStatus)
  };
}

function formatPointLightShadowSample(sample: AuroraScenePointLightShadowSample): string {
  return [
    `lane=${formatSampleValue(sample.lane)}`,
    `name=${formatSampleValue(sample.name)}`,
    `proof=${formatSampleValue(sample.proofStatus)}`,
    `sourceShadow=${formatSampleValue(sample.sourceShadow)}`,
    `sourceShadowRadius=${formatSampleValue(sample.sourceShadowRadius)}`,
    `animatedShadowRadius=${formatSampleValue(sample.animatedShadowRadius)}`,
    `effectiveShadowRadius=${formatSampleValue(sample.effectiveShadowRadius)}`,
    `projectionSourceRadius=${formatSampleValue(sample.shadowProjectionSourceRadius)}`,
    `projectionWorldRadius=${formatSampleValue(
      sample.shadowProjectionRadiusWorldDistance
    )}`,
    `projectionRadiusSource=${formatSampleValue(sample.shadowProjectionRadiusSource)}`,
    `projectionRadiusProof=${formatSampleValue(
      sample.shadowProjectionRadiusProofStatus
    )}`,
    `distance=${formatSampleValue(sample.distance)}`,
    `renderer=${formatSampleValue(sample.rendererMode)}`,
    `projectionStatus=${formatSampleValue(sample.projectionStatus)}`,
    `projectionSource=${formatSampleValue(sample.projectionSource)}`,
    `projectionProof=${formatSampleValue(sample.projectionProofStatus)}`
  ].join(";");
}

function isItemPropertyLightPointLight(node: THREE.Object3D): node is THREE.PointLight {
  return (
    node instanceof THREE.PointLight &&
    readString(node.userData?.itemPropertyLightPreviewRole) === "item-property-point-light"
  );
}

function buildItemPropertyLightShadowPolicySample(
  light: THREE.PointLight
): AuroraSceneItemPropertyLightShadowPolicySample {
  const data = light.userData ?? {};
  return {
    lane: "item-property-light",
    name: resolvePointLightName(light, data),
    status:
      readString(data.itemPropertyLightShadowStatus) ||
      (light.castShadow
        ? "enabled-without-progfx-param3-userdata"
        : "disabled-without-progfx-param3-userdata"),
    proofStatus:
      readString(data.itemPropertyLightShadowProofStatus) ||
      "missing-source-backed-progfx-param3-item-light-shadow-userdata",
    source:
      readString(data.creatureEquipmentItemPropertyLightSource) ||
      readString(data.itemPropertyLightSource),
    runtimeSchedulerProofSource: readString(
      data.itemPropertyLightRuntimeSchedulerProofSource
    ),
    runtimeSchedulerBlocker: readString(
      data.itemPropertyLightRuntimeSchedulerBlocker
    ),
    shadowPolicySource: readString(data.itemPropertyLightShadowPolicySource),
    visualEffectRowId: readFiniteNumber(data.itemPropertyLightRelatedVisualEffectRowId),
    visualEffectConstant: readString(data.itemPropertyLightRelatedVisualEffectConstant),
    visualEffectLabel: readString(data.itemPropertyLightRelatedVisualEffectLabel),
    visualEffectLabelSource: readString(
      data.itemPropertyLightRelatedVisualEffectLabelSource
    ),
    progFxRowId: readFiniteNumber(data.itemPropertyLightRelatedProgFxRowId),
    progFxLabel: readString(data.itemPropertyLightRelatedProgFxLabel),
    progFxFadeRowId: readFiniteNumber(data.itemPropertyLightRelatedProgFxFadeRowId),
    progFxFadeLabel: readString(data.itemPropertyLightRelatedProgFxFadeLabel),
    progFxRowSource: readString(data.itemPropertyLightRelatedProgFxRowSource),
    progFxAnimation: readString(data.itemPropertyLightRelatedProgFxAnimation),
    brightnessLabel: readString(data.itemPropertyLightBrightnessLabel),
    colorLabel: readString(data.itemPropertyLightColorLabel),
    noSelfGlowProofStatus: readString(data.itemPropertyLightNoSelfGlowProofStatus),
    castShadow: light.castShadow,
    distance: roundNumber(light.distance),
    equipmentResRef: readString(data.creatureEquipmentItemPropertyLightResRef),
    equipmentAttachmentTarget: readString(
      data.creatureEquipmentItemPropertyLightAttachmentTarget
    )
  };
}

function formatItemPropertyLightShadowPolicySample(
  sample: AuroraSceneItemPropertyLightShadowPolicySample
): string {
  return [
    `lane=${formatSampleValue(sample.lane)}`,
    `name=${formatSampleValue(sample.name)}`,
    `status=${formatSampleValue(sample.status)}`,
    `proof=${formatSampleValue(sample.proofStatus)}`,
    `source=${formatSampleValue(sample.source)}`,
    `runtimeSchedulerSource=${formatSampleValue(
      sample.runtimeSchedulerProofSource
    )}`,
    `runtimeSchedulerBlocker=${formatSampleValue(sample.runtimeSchedulerBlocker)}`,
    `shadowPolicySource=${formatSampleValue(sample.shadowPolicySource)}`,
    `visualEffectRow=${formatSampleValue(sample.visualEffectRowId)}`,
    `visualEffectConstant=${formatSampleValue(sample.visualEffectConstant)}`,
    `visualEffectLabel=${formatSampleValue(sample.visualEffectLabel)}`,
    `visualEffectLabelSource=${formatSampleValue(sample.visualEffectLabelSource)}`,
    `progFxRow=${formatSampleValue(sample.progFxRowId)}`,
    `progFxLabel=${formatSampleValue(sample.progFxLabel)}`,
    `progFxFadeRow=${formatSampleValue(sample.progFxFadeRowId)}`,
    `progFxFadeLabel=${formatSampleValue(sample.progFxFadeLabel)}`,
    `progFxRowSource=${formatSampleValue(sample.progFxRowSource)}`,
    `progFxAnimation=${formatSampleValue(sample.progFxAnimation)}`,
    `brightness=${formatSampleValue(sample.brightnessLabel)}`,
    `color=${formatSampleValue(sample.colorLabel)}`,
    `noSelfGlowProof=${formatSampleValue(sample.noSelfGlowProofStatus)}`,
    `castShadow=${formatSampleValue(sample.castShadow)}`,
    `distance=${formatSampleValue(sample.distance)}`,
    `equipmentResRef=${formatSampleValue(sample.equipmentResRef)}`,
    `attachment=${formatSampleValue(sample.equipmentAttachmentTarget)}`
  ].join(";");
}

function isAuroraAreaDirectionalShadowLight(node: THREE.Object3D): node is THREE.DirectionalLight {
  return (
    node instanceof THREE.DirectionalLight &&
    readString(node.userData?.auroraTerrainAreaGlobalLightRole) === "diffuse"
  );
}

function buildDirectionalShadowSample(
  light: THREE.DirectionalLight
): AuroraSceneDirectionalLightShadowSample {
  const data = light.userData ?? {};
  return {
    lane: "area-global-directional-shadow",
    name: readString(light.name) || "directional-light",
    phase: readString(data.auroraTerrainAreaGlobalLightingPhase),
    sourceField: readString(data.auroraTerrainAreaGlobalShadowSourceField),
    status: readString(data.auroraTerrainAreaGlobalShadowStatus),
    implementationStatus: readString(
      data.auroraTerrainAreaGlobalShadowImplementationStatus
    ),
    opacity: readFiniteNumber(data.auroraTerrainAreaGlobalShadowOpacity),
    opacityFactor: readFiniteNumber(data.auroraTerrainAreaGlobalShadowOpacityFactor),
    color: [roundNumber(light.color.r), roundNumber(light.color.g), roundNumber(light.color.b)],
    intensity: roundNumber(light.intensity)
  };
}

function formatDirectionalShadowSample(
  sample: AuroraSceneDirectionalLightShadowSample
): string {
  return [
    `lane=${formatSampleValue(sample.lane)}`,
    `name=${formatSampleValue(sample.name)}`,
    `phase=${formatSampleValue(sample.phase)}`,
    `sourceField=${formatSampleValue(sample.sourceField)}`,
    `status=${formatSampleValue(sample.status)}`,
    `implementation=${formatSampleValue(sample.implementationStatus)}`,
    `opacity=${formatSampleValue(sample.opacity)}`,
    `areaFactor=${formatSampleValue(sample.opacityFactor)}`,
    `color=${formatSampleValue(sample.color)}`,
    `intensity=${formatSampleValue(sample.intensity)}`
  ].join(";");
}

function isPlaceableFastShadowProxy(node: THREE.Object3D): boolean {
  return (
    readString(node.userData?.placeableTwoDaFastShadowStatus).length > 0 ||
    readString(node.userData?.placeableTwoDaFastShadowProofStatus).length > 0 ||
    node.name === "placeable_2da_light_fast_shadow"
  );
}

function buildFastShadowSample(node: THREE.Object3D): AuroraSceneFastShadowSample {
  const data = node.userData ?? {};
  return {
    objectId: readString(data.objectId),
    status: readString(data.placeableTwoDaFastShadowStatus),
    shadowSize: readFiniteNumber(data.placeableTwoDaShadowSize),
    shadowSizeSource: readString(data.placeableTwoDaShadowSizeSource),
    shadowSizeProofStatus: readString(data.placeableTwoDaShadowSizeProofStatus),
    shadowSizeLane: readString(data.placeableTwoDaShadowSizeLane),
    shadowSizeSelectionProofStatus: readString(
      data.placeableTwoDaShadowSizeSelectionProofStatus
    ),
    modelFileName: readString(data.placeableTwoDaFastShadowModelFileName),
    sourceModelHash: readString(data.placeableTwoDaFastShadowSourceModelHash),
    sourceNodeOffset: readFiniteNumber(data.placeableTwoDaFastShadowSourceNodeOffset),
    emitterNodeName: readString(data.placeableTwoDaFastShadowEmitterNodeName),
    emitterType: readString(data.placeableTwoDaFastShadowEmitterType),
    texture: readString(data.placeableTwoDaFastShadowTexture),
    textureBindingStatus: readString(data.placeableTwoDaFastShadowTextureBindingStatus),
    textureMapBound: readBoolean(data.placeableTwoDaFastShadowTextureMapBound),
    textureBindingProofStatus: readString(
      data.placeableTwoDaFastShadowTextureBindingProofStatus
    ),
    renderMode: readString(data.placeableTwoDaFastShadowRenderMode),
    blendMode: readString(data.placeableTwoDaFastShadowBlendMode),
    emitterPosition: readNumberArray(data.placeableTwoDaFastShadowEmitterPosition),
    emitterSize: readFiniteNumber(data.placeableTwoDaFastShadowEmitterSize),
    geometryType: readString(data.placeableTwoDaFastShadowGeometryType),
    quadSize: readFiniteNumber(data.placeableTwoDaFastShadowQuadSize),
    geometryProofStatus: readString(data.placeableTwoDaFastShadowGeometryProofStatus),
    emitterAlpha: readFiniteNumber(data.placeableTwoDaFastShadowEmitterAlphaStart),
    radius: readFiniteNumber(data.placeableTwoDaFastShadowRadius),
    radiusSource: readString(data.placeableTwoDaFastShadowRadiusSource),
    baseOpacity: readFiniteNumber(data.placeableTwoDaFastShadowBaseOpacity),
    opacity: readFiniteNumber(data.placeableTwoDaFastShadowOpacity),
    opacitySource: readString(data.placeableTwoDaFastShadowOpacitySource),
    areaOpacity: readFiniteNumber(data.placeableTwoDaFastShadowAreaOpacity),
    areaOpacityFactor: readFiniteNumber(data.placeableTwoDaFastShadowAreaOpacityFactor),
    areaOpacityFactorSource: readString(
      data.placeableTwoDaFastShadowAreaOpacityFactorSource
    ),
    areaOpacityProofStatus: readString(
      data.placeableTwoDaFastShadowAreaOpacityProofStatus
    ),
    opacityProofStatus: readString(data.placeableTwoDaFastShadowOpacityProofStatus),
    projectionStatus: readString(data.placeableTwoDaFastShadowProjectionStatus),
    projectionSource: readString(data.placeableTwoDaFastShadowProjectionSource),
    projectionProofStatus: readString(data.placeableTwoDaFastShadowProjectionProofStatus),
    volumeCasterStatus: readString(data.placeableTwoDaFastShadowVolumeCasterStatus),
    volumeCasterGeometryStatus: readString(
      data.placeableTwoDaFastShadowVolumeCasterGeometryStatus
    ),
    volumeCasterSourceVertexCount: readFiniteNumber(
      data.placeableTwoDaFastShadowVolumeCasterSourceVertexCount
    ),
    volumeCasterSourceQuadSize: readFiniteNumber(
      data.placeableTwoDaFastShadowVolumeCasterSourceQuadSize
    ),
    volumeCasterSourceQuadSizeSource: readString(
      data.placeableTwoDaFastShadowVolumeCasterSourceQuadSizeSource
    ),
    volumeCasterEdgeCount: readFiniteNumber(
      data.placeableTwoDaFastShadowVolumeCasterEdgeCount
    ),
    volumeCasterVertexRecordCount: readFiniteNumber(
      data.placeableTwoDaFastShadowVolumeCasterVertexRecordCount
    ),
    volumeCasterIndexCount: readFiniteNumber(
      data.placeableTwoDaFastShadowVolumeCasterIndexCount
    ),
    volumeCasterRecordsPerSourceVertex: readFiniteNumber(
      data.placeableTwoDaFastShadowVolumeCasterRecordsPerSourceVertex
    ),
    volumeCasterIndicesPerEdge: readFiniteNumber(
      data.placeableTwoDaFastShadowVolumeCasterIndicesPerEdge
    ),
    volumeCasterWAttribute: readString(data.placeableTwoDaFastShadowVolumeCasterWAttribute),
    volumeCasterProofStatus: readString(
      data.placeableTwoDaFastShadowVolumeCasterProofStatus
    ),
    volumeProjectionPreviewStatus: readString(
      data.placeableTwoDaFastShadowVolumeProjectionPreviewStatus
    ),
    volumeProjectionPreviewRendererMode: readString(
      data.placeableTwoDaFastShadowVolumeProjectionPreviewRendererMode
    ),
    volumeProjectionPreviewVisible: readBoolean(
      data.placeableTwoDaFastShadowVolumeProjectionPreviewVisible
    ),
    volumeProjectionPreviewWAttribute: readString(
      data.placeableTwoDaFastShadowVolumeProjectionPreviewWAttribute
    ),
    volumeProjectionPreviewLightPosition: readNumberArray(
      data.placeableTwoDaFastShadowVolumeProjectionPreviewLightPosition
    ),
    volumeProjectionPreviewLightPositionSource: readString(
      data.placeableTwoDaFastShadowVolumeProjectionPreviewLightPositionSource
    ),
    volumeProjectionPreviewExtrusionDistance: readFiniteNumber(
      data.placeableTwoDaFastShadowVolumeProjectionPreviewExtrusionDistance
    ),
    volumeProjectionPreviewExtrusionDistanceSource: readString(
      data.placeableTwoDaFastShadowVolumeProjectionPreviewExtrusionDistanceSource
    ),
    volumeProjectionPreviewOpacity: readFiniteNumber(
      data.placeableTwoDaFastShadowVolumeProjectionPreviewOpacity
    ),
    volumeProjectionPreviewSource: readString(
      data.placeableTwoDaFastShadowVolumeProjectionPreviewSource
    ),
    volumeProjectionPreviewProofStatus: readString(
      data.placeableTwoDaFastShadowVolumeProjectionPreviewProofStatus
    ),
    volumeStencilStatus: readString(
      data.placeableTwoDaFastShadowVolumeStencilStatus
    ),
    volumeStencilRendererMode: readString(
      data.placeableTwoDaFastShadowVolumeStencilRendererMode
    ),
    volumeStencilVisible: readBoolean(
      data.placeableTwoDaFastShadowVolumeStencilVisible
    ),
    volumeStencilWAttribute: readString(
      data.placeableTwoDaFastShadowVolumeStencilWAttribute
    ),
    volumeStencilLightPosition: readNumberArray(
      data.placeableTwoDaFastShadowVolumeStencilLightPosition
    ),
    volumeStencilLightPositionSource: readString(
      data.placeableTwoDaFastShadowVolumeStencilLightPositionSource
    ),
    volumeStencilExtrusionDistance: readFiniteNumber(
      data.placeableTwoDaFastShadowVolumeStencilExtrusionDistance
    ),
    volumeStencilExtrusionDistanceSource: readString(
      data.placeableTwoDaFastShadowVolumeStencilExtrusionDistanceSource
    ),
    volumeStencilReceiverSize: readFiniteNumber(
      data.placeableTwoDaFastShadowVolumeStencilReceiverSize
    ),
    volumeStencilReceiverOpacity: readFiniteNumber(
      data.placeableTwoDaFastShadowVolumeStencilReceiverOpacity
    ),
    volumeStencilReceiverFunc: readString(
      data.placeableTwoDaFastShadowVolumeStencilReceiverFunc
    ),
    volumeStencilPasses: readStringArray(
      data.placeableTwoDaFastShadowVolumeStencilVolumePasses
    ),
    volumeStencilPassStateSamples: readStringArray(
      data.placeableTwoDaFastShadowVolumeStencilPassStateSamples
    ),
    volumeStencilReceiverState: readString(
      data.placeableTwoDaFastShadowVolumeStencilReceiverState
    ),
    volumeStencilStateProofStatus: readString(
      data.placeableTwoDaFastShadowVolumeStencilStateProofStatus
    ),
    volumeStencilRetailFaceOpTable: readString(
      data.placeableTwoDaFastShadowVolumeStencilRetailFaceOpTable
    ),
    volumeStencilRetailOpSequence: readString(
      data.placeableTwoDaFastShadowVolumeStencilRetailOpSequence
    ),
    volumeStencilRetailOpSequenceSource: readString(
      data.placeableTwoDaFastShadowVolumeStencilRetailOpSequenceSource
    ),
    volumeStencilSource: readString(
      data.placeableTwoDaFastShadowVolumeStencilSource
    ),
    volumeStencilProofStatus: readString(
      data.placeableTwoDaFastShadowVolumeStencilProofStatus
    ),
    volumeRenderShaderNames: readStringArray(
      data.placeableTwoDaFastShadowVolumeRenderShaderNames
    ),
    volumeRenderBuckets: readStringArray(data.placeableTwoDaFastShadowVolumeRenderBuckets),
    volumeRenderBucketPhases: readStringArray(
      data.placeableTwoDaFastShadowVolumeRenderBucketPhases
    ),
    volumeRenderBucketPhaseSource: readString(
      data.placeableTwoDaFastShadowVolumeRenderBucketPhaseSource
    ),
    volumeRenderBucketPhaseProofStatus: readString(
      data.placeableTwoDaFastShadowVolumeRenderBucketPhaseProofStatus
    ),
    volumeRenderStateCallSequence: readStringArray(
      data.placeableTwoDaFastShadowVolumeRenderStateCallSequence
    ),
    volumeRenderStateCallSource: readString(
      data.placeableTwoDaFastShadowVolumeRenderStateCallSource
    ),
    volumeRenderStateCallProofStatus: readString(
      data.placeableTwoDaFastShadowVolumeRenderStateCallProofStatus
    ),
    volumeRenderStateWrapperSemantics: readStringArray(
      data.placeableTwoDaFastShadowVolumeRenderStateWrapperSemantics
    ),
    volumeRenderStateWrapperSource: readString(
      data.placeableTwoDaFastShadowVolumeRenderStateWrapperSource
    ),
    volumeRenderStateWrapperProofStatus: readString(
      data.placeableTwoDaFastShadowVolumeRenderStateWrapperProofStatus
    ),
    volumeBlendDepthColorMaskWrappers: readStringArray(
      data.placeableTwoDaFastShadowVolumeBlendDepthColorMaskWrappers
    ),
    volumeBlendDepthColorMaskWrapperSource: readString(
      data.placeableTwoDaFastShadowVolumeBlendDepthColorMaskWrapperSource
    ),
    volumeBlendDepthColorMaskWrapperProofStatus: readString(
      data.placeableTwoDaFastShadowVolumeBlendDepthColorMaskWrapperProofStatus
    ),
    volumeImmediateCallerBufferFlushSource: readString(
      data.placeableTwoDaFastShadowVolumeImmediateCallerBufferFlushSource
    ),
    volumeImmediateCallerBufferFlushBlocker: readString(
      data.placeableTwoDaFastShadowVolumeImmediateCallerBufferFlushBlocker
    ),
    volumeImmediateCallerBufferFlushProofStatus: readString(
      data.placeableTwoDaFastShadowVolumeImmediateCallerBufferFlushProofStatus
    ),
    volumeDirectCallerBufferBuilderSource: readString(
      data.placeableTwoDaFastShadowVolumeDirectCallerBufferBuilderSource
    ),
    volumeDirectCallerBufferBuilderBlocker: readString(
      data.placeableTwoDaFastShadowVolumeDirectCallerBufferBuilderBlocker
    ),
    volumeDirectCallerBufferBuilderProofStatus: readString(
      data.placeableTwoDaFastShadowVolumeDirectCallerBufferBuilderProofStatus
    ),
    volumeActiveLightRenderEnvelopeState: readStringArray(
      data.placeableTwoDaFastShadowVolumeActiveLightRenderEnvelopeState
    ),
    volumeActiveLightRenderEnvelopeSource: readString(
      data.placeableTwoDaFastShadowVolumeActiveLightRenderEnvelopeSource
    ),
    volumeActiveLightRenderEnvelopeBlocker: readString(
      data.placeableTwoDaFastShadowVolumeActiveLightRenderEnvelopeBlocker
    ),
    volumeActiveLightRenderEnvelopeProofStatus: readString(
      data.placeableTwoDaFastShadowVolumeActiveLightRenderEnvelopeProofStatus
    ),
    volumeLocalDrawStateOrder: readStringArray(
      data.placeableTwoDaFastShadowVolumeLocalDrawStateOrder
    ),
    volumeLocalDrawStateOrderSource: readString(
      data.placeableTwoDaFastShadowVolumeLocalDrawStateOrderSource
    ),
    volumeLocalDrawStateOrderBlocker: readString(
      data.placeableTwoDaFastShadowVolumeLocalDrawStateOrderBlocker
    ),
    volumeLocalDrawStateOrderProofStatus: readString(
      data.placeableTwoDaFastShadowVolumeLocalDrawStateOrderProofStatus
    ),
    volumeShaderUniformSemantics: readStringArray(
      data.placeableTwoDaFastShadowVolumeShaderUniformSemantics
    ),
    volumeShaderUniformSource: readString(
      data.placeableTwoDaFastShadowVolumeShaderUniformSource
    ),
    volumeShaderUniformProofStatus: readString(
      data.placeableTwoDaFastShadowVolumeShaderUniformProofStatus
    ),
    volumeRenderPathSource: readString(
      data.placeableTwoDaFastShadowVolumeRenderPathSource
    ),
    volumeDrawWrapperSource: readString(
      data.placeableTwoDaFastShadowVolumeDrawWrapperSource
    ),
    volumeLightProfileSource: readString(
      data.placeableTwoDaFastShadowVolumeLightProfileSource
    ),
    volumeRenderPathProofStatus: readString(
      data.placeableTwoDaFastShadowVolumeRenderPathProofStatus
    ),
    proofStatus: readString(data.placeableTwoDaFastShadowProofStatus)
  };
}

function buildFastShadowSampleKey(
  node: THREE.Object3D,
  sample: AuroraSceneFastShadowSample
): string {
  return [
    sample.objectId || node.uuid || node.name || "fast-shadow-proxy",
    sample.status,
    sample.shadowSize
  ]
    .map(formatSampleValue)
    .join("|");
}

function mergeSampleString(current: string, next: string): string {
  return current.length > 0 ? current : next;
}

function mergeSampleNumber(current: number | null, next: number | null): number | null {
  return current === null ? next : current;
}

function mergeFastShadowSample(
  current: AuroraSceneFastShadowSample,
  next: AuroraSceneFastShadowSample
): AuroraSceneFastShadowSample {
  return {
    objectId: mergeSampleString(current.objectId, next.objectId),
    status: mergeSampleString(current.status, next.status),
    shadowSize: mergeSampleNumber(current.shadowSize, next.shadowSize),
    shadowSizeSource: mergeSampleString(current.shadowSizeSource, next.shadowSizeSource),
    shadowSizeProofStatus: mergeSampleString(
      current.shadowSizeProofStatus,
      next.shadowSizeProofStatus
    ),
    shadowSizeLane: mergeSampleString(current.shadowSizeLane, next.shadowSizeLane),
    shadowSizeSelectionProofStatus: mergeSampleString(
      current.shadowSizeSelectionProofStatus,
      next.shadowSizeSelectionProofStatus
    ),
    modelFileName: mergeSampleString(current.modelFileName, next.modelFileName),
    sourceModelHash: mergeSampleString(current.sourceModelHash, next.sourceModelHash),
    sourceNodeOffset: mergeSampleNumber(current.sourceNodeOffset, next.sourceNodeOffset),
    emitterNodeName: mergeSampleString(current.emitterNodeName, next.emitterNodeName),
    emitterType: mergeSampleString(current.emitterType, next.emitterType),
    texture: mergeSampleString(current.texture, next.texture),
    textureBindingStatus: mergeSampleString(
      current.textureBindingStatus,
      next.textureBindingStatus
    ),
    textureMapBound:
      current.textureMapBound === null ? next.textureMapBound : current.textureMapBound,
    textureBindingProofStatus: mergeSampleString(
      current.textureBindingProofStatus,
      next.textureBindingProofStatus
    ),
    renderMode: mergeSampleString(current.renderMode, next.renderMode),
    blendMode: mergeSampleString(current.blendMode, next.blendMode),
    emitterPosition:
      current.emitterPosition.length > 0 ? current.emitterPosition : next.emitterPosition,
    emitterSize: mergeSampleNumber(current.emitterSize, next.emitterSize),
    geometryType: mergeSampleString(current.geometryType, next.geometryType),
    quadSize: mergeSampleNumber(current.quadSize, next.quadSize),
    geometryProofStatus: mergeSampleString(
      current.geometryProofStatus,
      next.geometryProofStatus
    ),
    emitterAlpha: mergeSampleNumber(current.emitterAlpha, next.emitterAlpha),
    radius: mergeSampleNumber(current.radius, next.radius),
    radiusSource: mergeSampleString(current.radiusSource, next.radiusSource),
    baseOpacity: mergeSampleNumber(current.baseOpacity, next.baseOpacity),
    opacity: mergeSampleNumber(current.opacity, next.opacity),
    opacitySource: mergeSampleString(current.opacitySource, next.opacitySource),
    areaOpacity: mergeSampleNumber(current.areaOpacity, next.areaOpacity),
    areaOpacityFactor: mergeSampleNumber(current.areaOpacityFactor, next.areaOpacityFactor),
    areaOpacityFactorSource: mergeSampleString(
      current.areaOpacityFactorSource,
      next.areaOpacityFactorSource
    ),
    areaOpacityProofStatus: mergeSampleString(
      current.areaOpacityProofStatus,
      next.areaOpacityProofStatus
    ),
    opacityProofStatus: mergeSampleString(
      current.opacityProofStatus,
      next.opacityProofStatus
    ),
    projectionStatus: mergeSampleString(
      current.projectionStatus,
      next.projectionStatus
    ),
    projectionSource: mergeSampleString(current.projectionSource, next.projectionSource),
    projectionProofStatus: mergeSampleString(
      current.projectionProofStatus,
      next.projectionProofStatus
    ),
    volumeCasterStatus: mergeSampleString(
      current.volumeCasterStatus,
      next.volumeCasterStatus
    ),
    volumeCasterGeometryStatus: mergeSampleString(
      current.volumeCasterGeometryStatus,
      next.volumeCasterGeometryStatus
    ),
    volumeCasterSourceVertexCount: mergeSampleNumber(
      current.volumeCasterSourceVertexCount,
      next.volumeCasterSourceVertexCount
    ),
    volumeCasterSourceQuadSize: mergeSampleNumber(
      current.volumeCasterSourceQuadSize,
      next.volumeCasterSourceQuadSize
    ),
    volumeCasterSourceQuadSizeSource: mergeSampleString(
      current.volumeCasterSourceQuadSizeSource,
      next.volumeCasterSourceQuadSizeSource
    ),
    volumeCasterEdgeCount: mergeSampleNumber(
      current.volumeCasterEdgeCount,
      next.volumeCasterEdgeCount
    ),
    volumeCasterVertexRecordCount: mergeSampleNumber(
      current.volumeCasterVertexRecordCount,
      next.volumeCasterVertexRecordCount
    ),
    volumeCasterIndexCount: mergeSampleNumber(
      current.volumeCasterIndexCount,
      next.volumeCasterIndexCount
    ),
    volumeCasterRecordsPerSourceVertex: mergeSampleNumber(
      current.volumeCasterRecordsPerSourceVertex,
      next.volumeCasterRecordsPerSourceVertex
    ),
    volumeCasterIndicesPerEdge: mergeSampleNumber(
      current.volumeCasterIndicesPerEdge,
      next.volumeCasterIndicesPerEdge
    ),
    volumeCasterWAttribute: mergeSampleString(
      current.volumeCasterWAttribute,
      next.volumeCasterWAttribute
    ),
    volumeCasterProofStatus: mergeSampleString(
      current.volumeCasterProofStatus,
      next.volumeCasterProofStatus
    ),
    volumeProjectionPreviewStatus: mergeSampleString(
      current.volumeProjectionPreviewStatus,
      next.volumeProjectionPreviewStatus
    ),
    volumeProjectionPreviewRendererMode: mergeSampleString(
      current.volumeProjectionPreviewRendererMode,
      next.volumeProjectionPreviewRendererMode
    ),
    volumeProjectionPreviewVisible:
      current.volumeProjectionPreviewVisible === null
        ? next.volumeProjectionPreviewVisible
        : current.volumeProjectionPreviewVisible,
    volumeProjectionPreviewWAttribute: mergeSampleString(
      current.volumeProjectionPreviewWAttribute,
      next.volumeProjectionPreviewWAttribute
    ),
    volumeProjectionPreviewLightPosition:
      current.volumeProjectionPreviewLightPosition.length > 0
        ? current.volumeProjectionPreviewLightPosition
        : next.volumeProjectionPreviewLightPosition,
    volumeProjectionPreviewLightPositionSource: mergeSampleString(
      current.volumeProjectionPreviewLightPositionSource,
      next.volumeProjectionPreviewLightPositionSource
    ),
    volumeProjectionPreviewExtrusionDistance: mergeSampleNumber(
      current.volumeProjectionPreviewExtrusionDistance,
      next.volumeProjectionPreviewExtrusionDistance
    ),
    volumeProjectionPreviewExtrusionDistanceSource: mergeSampleString(
      current.volumeProjectionPreviewExtrusionDistanceSource,
      next.volumeProjectionPreviewExtrusionDistanceSource
    ),
    volumeProjectionPreviewOpacity: mergeSampleNumber(
      current.volumeProjectionPreviewOpacity,
      next.volumeProjectionPreviewOpacity
    ),
    volumeProjectionPreviewSource: mergeSampleString(
      current.volumeProjectionPreviewSource,
      next.volumeProjectionPreviewSource
    ),
    volumeProjectionPreviewProofStatus: mergeSampleString(
      current.volumeProjectionPreviewProofStatus,
      next.volumeProjectionPreviewProofStatus
    ),
    volumeStencilStatus: mergeSampleString(
      current.volumeStencilStatus,
      next.volumeStencilStatus
    ),
    volumeStencilRendererMode: mergeSampleString(
      current.volumeStencilRendererMode,
      next.volumeStencilRendererMode
    ),
    volumeStencilVisible:
      current.volumeStencilVisible === null
        ? next.volumeStencilVisible
        : current.volumeStencilVisible,
    volumeStencilWAttribute: mergeSampleString(
      current.volumeStencilWAttribute,
      next.volumeStencilWAttribute
    ),
    volumeStencilLightPosition:
      current.volumeStencilLightPosition.length > 0
        ? current.volumeStencilLightPosition
        : next.volumeStencilLightPosition,
    volumeStencilLightPositionSource: mergeSampleString(
      current.volumeStencilLightPositionSource,
      next.volumeStencilLightPositionSource
    ),
    volumeStencilExtrusionDistance: mergeSampleNumber(
      current.volumeStencilExtrusionDistance,
      next.volumeStencilExtrusionDistance
    ),
    volumeStencilExtrusionDistanceSource: mergeSampleString(
      current.volumeStencilExtrusionDistanceSource,
      next.volumeStencilExtrusionDistanceSource
    ),
    volumeStencilReceiverSize: mergeSampleNumber(
      current.volumeStencilReceiverSize,
      next.volumeStencilReceiverSize
    ),
    volumeStencilReceiverOpacity: mergeSampleNumber(
      current.volumeStencilReceiverOpacity,
      next.volumeStencilReceiverOpacity
    ),
    volumeStencilReceiverFunc: mergeSampleString(
      current.volumeStencilReceiverFunc,
      next.volumeStencilReceiverFunc
    ),
    volumeStencilPasses:
      current.volumeStencilPasses.length > 0
        ? current.volumeStencilPasses
        : next.volumeStencilPasses,
    volumeStencilPassStateSamples:
      current.volumeStencilPassStateSamples.length > 0
        ? current.volumeStencilPassStateSamples
        : next.volumeStencilPassStateSamples,
    volumeStencilReceiverState: mergeSampleString(
      current.volumeStencilReceiverState,
      next.volumeStencilReceiverState
    ),
    volumeStencilStateProofStatus: mergeSampleString(
      current.volumeStencilStateProofStatus,
      next.volumeStencilStateProofStatus
    ),
    volumeStencilRetailFaceOpTable: mergeSampleString(
      current.volumeStencilRetailFaceOpTable,
      next.volumeStencilRetailFaceOpTable
    ),
    volumeStencilRetailOpSequence: mergeSampleString(
      current.volumeStencilRetailOpSequence,
      next.volumeStencilRetailOpSequence
    ),
    volumeStencilRetailOpSequenceSource: mergeSampleString(
      current.volumeStencilRetailOpSequenceSource,
      next.volumeStencilRetailOpSequenceSource
    ),
    volumeStencilSource: mergeSampleString(
      current.volumeStencilSource,
      next.volumeStencilSource
    ),
    volumeStencilProofStatus: mergeSampleString(
      current.volumeStencilProofStatus,
      next.volumeStencilProofStatus
    ),
    volumeRenderShaderNames:
      current.volumeRenderShaderNames.length > 0
        ? current.volumeRenderShaderNames
        : next.volumeRenderShaderNames,
    volumeRenderBuckets:
      current.volumeRenderBuckets.length > 0
        ? current.volumeRenderBuckets
        : next.volumeRenderBuckets,
    volumeRenderBucketPhases:
      current.volumeRenderBucketPhases.length > 0
        ? current.volumeRenderBucketPhases
        : next.volumeRenderBucketPhases,
    volumeRenderBucketPhaseSource: mergeSampleString(
      current.volumeRenderBucketPhaseSource,
      next.volumeRenderBucketPhaseSource
    ),
    volumeRenderBucketPhaseProofStatus: mergeSampleString(
      current.volumeRenderBucketPhaseProofStatus,
      next.volumeRenderBucketPhaseProofStatus
    ),
    volumeRenderStateCallSequence:
      current.volumeRenderStateCallSequence.length > 0
        ? current.volumeRenderStateCallSequence
        : next.volumeRenderStateCallSequence,
    volumeRenderStateCallSource: mergeSampleString(
      current.volumeRenderStateCallSource,
      next.volumeRenderStateCallSource
    ),
    volumeRenderStateCallProofStatus: mergeSampleString(
      current.volumeRenderStateCallProofStatus,
      next.volumeRenderStateCallProofStatus
    ),
    volumeRenderStateWrapperSemantics:
      current.volumeRenderStateWrapperSemantics.length > 0
        ? current.volumeRenderStateWrapperSemantics
        : next.volumeRenderStateWrapperSemantics,
    volumeRenderStateWrapperSource: mergeSampleString(
      current.volumeRenderStateWrapperSource,
      next.volumeRenderStateWrapperSource
    ),
    volumeRenderStateWrapperProofStatus: mergeSampleString(
      current.volumeRenderStateWrapperProofStatus,
      next.volumeRenderStateWrapperProofStatus
    ),
    volumeBlendDepthColorMaskWrappers:
      current.volumeBlendDepthColorMaskWrappers.length > 0
        ? current.volumeBlendDepthColorMaskWrappers
        : next.volumeBlendDepthColorMaskWrappers,
    volumeBlendDepthColorMaskWrapperSource: mergeSampleString(
      current.volumeBlendDepthColorMaskWrapperSource,
      next.volumeBlendDepthColorMaskWrapperSource
    ),
    volumeBlendDepthColorMaskWrapperProofStatus: mergeSampleString(
      current.volumeBlendDepthColorMaskWrapperProofStatus,
      next.volumeBlendDepthColorMaskWrapperProofStatus
    ),
    volumeImmediateCallerBufferFlushSource: mergeSampleString(
      current.volumeImmediateCallerBufferFlushSource,
      next.volumeImmediateCallerBufferFlushSource
    ),
    volumeImmediateCallerBufferFlushBlocker: mergeSampleString(
      current.volumeImmediateCallerBufferFlushBlocker,
      next.volumeImmediateCallerBufferFlushBlocker
    ),
    volumeImmediateCallerBufferFlushProofStatus: mergeSampleString(
      current.volumeImmediateCallerBufferFlushProofStatus,
      next.volumeImmediateCallerBufferFlushProofStatus
    ),
    volumeDirectCallerBufferBuilderSource: mergeSampleString(
      current.volumeDirectCallerBufferBuilderSource,
      next.volumeDirectCallerBufferBuilderSource
    ),
    volumeDirectCallerBufferBuilderBlocker: mergeSampleString(
      current.volumeDirectCallerBufferBuilderBlocker,
      next.volumeDirectCallerBufferBuilderBlocker
    ),
    volumeDirectCallerBufferBuilderProofStatus: mergeSampleString(
      current.volumeDirectCallerBufferBuilderProofStatus,
      next.volumeDirectCallerBufferBuilderProofStatus
    ),
    volumeActiveLightRenderEnvelopeState:
      current.volumeActiveLightRenderEnvelopeState.length > 0
        ? current.volumeActiveLightRenderEnvelopeState
        : next.volumeActiveLightRenderEnvelopeState,
    volumeActiveLightRenderEnvelopeSource: mergeSampleString(
      current.volumeActiveLightRenderEnvelopeSource,
      next.volumeActiveLightRenderEnvelopeSource
    ),
    volumeActiveLightRenderEnvelopeBlocker: mergeSampleString(
      current.volumeActiveLightRenderEnvelopeBlocker,
      next.volumeActiveLightRenderEnvelopeBlocker
    ),
    volumeActiveLightRenderEnvelopeProofStatus: mergeSampleString(
      current.volumeActiveLightRenderEnvelopeProofStatus,
      next.volumeActiveLightRenderEnvelopeProofStatus
    ),
    volumeLocalDrawStateOrder:
      current.volumeLocalDrawStateOrder.length > 0
        ? current.volumeLocalDrawStateOrder
        : next.volumeLocalDrawStateOrder,
    volumeLocalDrawStateOrderSource: mergeSampleString(
      current.volumeLocalDrawStateOrderSource,
      next.volumeLocalDrawStateOrderSource
    ),
    volumeLocalDrawStateOrderBlocker: mergeSampleString(
      current.volumeLocalDrawStateOrderBlocker,
      next.volumeLocalDrawStateOrderBlocker
    ),
    volumeLocalDrawStateOrderProofStatus: mergeSampleString(
      current.volumeLocalDrawStateOrderProofStatus,
      next.volumeLocalDrawStateOrderProofStatus
    ),
    volumeShaderUniformSemantics:
      current.volumeShaderUniformSemantics.length > 0
        ? current.volumeShaderUniformSemantics
        : next.volumeShaderUniformSemantics,
    volumeShaderUniformSource: mergeSampleString(
      current.volumeShaderUniformSource,
      next.volumeShaderUniformSource
    ),
    volumeShaderUniformProofStatus: mergeSampleString(
      current.volumeShaderUniformProofStatus,
      next.volumeShaderUniformProofStatus
    ),
    volumeRenderPathSource: mergeSampleString(
      current.volumeRenderPathSource,
      next.volumeRenderPathSource
    ),
    volumeDrawWrapperSource: mergeSampleString(
      current.volumeDrawWrapperSource,
      next.volumeDrawWrapperSource
    ),
    volumeLightProfileSource: mergeSampleString(
      current.volumeLightProfileSource,
      next.volumeLightProfileSource
    ),
    volumeRenderPathProofStatus: mergeSampleString(
      current.volumeRenderPathProofStatus,
      next.volumeRenderPathProofStatus
    ),
    proofStatus: mergeSampleString(current.proofStatus, next.proofStatus)
  };
}

function formatFastShadowSample(sample: AuroraSceneFastShadowSample): string {
  return [
    `object=${formatSampleValue(sample.objectId)}`,
    `status=${formatSampleValue(sample.status)}`,
    `shadowSize=${formatSampleValue(sample.shadowSize)}`,
    `shadowSource=${formatSampleValue(sample.shadowSizeSource)}`,
    `shadowProof=${formatSampleValue(sample.shadowSizeProofStatus)}`,
    `shadowLane=${formatSampleValue(sample.shadowSizeLane)}`,
    `shadowSelectionProof=${formatSampleValue(sample.shadowSizeSelectionProofStatus)}`,
    `model=${formatSampleValue(sample.modelFileName)}`,
    `modelHash=${formatSampleValue(sample.sourceModelHash)}`,
    `sourceNodeOffset=${formatSampleValue(sample.sourceNodeOffset)}`,
    `emitter=${formatSampleValue(sample.emitterNodeName)}`,
    `emitterType=${formatSampleValue(sample.emitterType)}`,
    `texture=${formatSampleValue(sample.texture)}`,
    `textureBinding=${formatSampleValue(sample.textureBindingStatus)}`,
    `textureMapBound=${formatSampleValue(sample.textureMapBound)}`,
    `textureBindingProof=${formatSampleValue(sample.textureBindingProofStatus)}`,
    `renderMode=${formatSampleValue(sample.renderMode)}`,
    `blendMode=${formatSampleValue(sample.blendMode)}`,
    `emitterPosition=${formatSampleValue(sample.emitterPosition)}`,
    `emitterSize=${formatSampleValue(sample.emitterSize)}`,
    `geometry=${formatSampleValue(sample.geometryType)}`,
    `quadSize=${formatSampleValue(sample.quadSize)}`,
    `geometryProof=${formatSampleValue(sample.geometryProofStatus)}`,
    `emitterAlpha=${formatSampleValue(sample.emitterAlpha)}`,
    `radius=${formatSampleValue(sample.radius)}`,
    `radiusSource=${formatSampleValue(sample.radiusSource)}`,
    `baseOpacity=${formatSampleValue(sample.baseOpacity)}`,
    `opacity=${formatSampleValue(sample.opacity)}`,
    `opacitySource=${formatSampleValue(sample.opacitySource)}`,
    `areaOpacity=${formatSampleValue(sample.areaOpacity)}`,
    `areaFactor=${formatSampleValue(sample.areaOpacityFactor)}`,
    `areaFactorSource=${formatSampleValue(sample.areaOpacityFactorSource)}`,
    `areaProof=${formatSampleValue(sample.areaOpacityProofStatus)}`,
    `opacityProof=${formatSampleValue(sample.opacityProofStatus)}`,
    `projectionStatus=${formatSampleValue(sample.projectionStatus)}`,
    `projectionSource=${formatSampleValue(sample.projectionSource)}`,
    `projectionProof=${formatSampleValue(sample.projectionProofStatus)}`,
    `volumeStatus=${formatSampleValue(sample.volumeCasterStatus)}`,
    `volumeGeometry=${formatSampleValue(sample.volumeCasterGeometryStatus)}`,
    `volumeSourceVertices=${formatSampleValue(sample.volumeCasterSourceVertexCount)}`,
    `volumeSourceQuadSize=${formatSampleValue(sample.volumeCasterSourceQuadSize)}`,
    `volumeSourceQuadSizeSource=${formatSampleValue(
      sample.volumeCasterSourceQuadSizeSource
    )}`,
    `volumeEdges=${formatSampleValue(sample.volumeCasterEdgeCount)}`,
    `volumeRecords=${formatSampleValue(sample.volumeCasterVertexRecordCount)}`,
    `volumeIndices=${formatSampleValue(sample.volumeCasterIndexCount)}`,
    `volumeRecordsPerSource=${formatSampleValue(sample.volumeCasterRecordsPerSourceVertex)}`,
    `volumeIndicesPerEdge=${formatSampleValue(sample.volumeCasterIndicesPerEdge)}`,
    `volumeW=${formatSampleValue(sample.volumeCasterWAttribute)}`,
    `volumeProof=${formatSampleValue(sample.volumeCasterProofStatus)}`,
    `volumePreview=${formatSampleValue(sample.volumeProjectionPreviewStatus)}`,
    `volumePreviewRenderer=${formatSampleValue(
      sample.volumeProjectionPreviewRendererMode
    )}`,
    `volumePreviewVisible=${formatSampleValue(sample.volumeProjectionPreviewVisible)}`,
    `volumePreviewW=${formatSampleValue(sample.volumeProjectionPreviewWAttribute)}`,
    `volumePreviewLight=${formatSampleValue(
      sample.volumeProjectionPreviewLightPosition
    )}`,
    `volumePreviewLightSource=${formatSampleValue(
      sample.volumeProjectionPreviewLightPositionSource
    )}`,
    `volumePreviewExtrusion=${formatSampleValue(
      sample.volumeProjectionPreviewExtrusionDistance
    )}`,
    `volumePreviewExtrusionSource=${formatSampleValue(
      sample.volumeProjectionPreviewExtrusionDistanceSource
    )}`,
    `volumePreviewOpacity=${formatSampleValue(sample.volumeProjectionPreviewOpacity)}`,
    `volumePreviewSource=${formatSampleValue(sample.volumeProjectionPreviewSource)}`,
    `volumePreviewProof=${formatSampleValue(
      sample.volumeProjectionPreviewProofStatus
    )}`,
    `volumeStencil=${formatSampleValue(sample.volumeStencilStatus)}`,
    `volumeStencilRenderer=${formatSampleValue(sample.volumeStencilRendererMode)}`,
    `volumeStencilVisible=${formatSampleValue(sample.volumeStencilVisible)}`,
    `volumeStencilW=${formatSampleValue(sample.volumeStencilWAttribute)}`,
    `volumeStencilLight=${formatSampleValue(sample.volumeStencilLightPosition)}`,
    `volumeStencilLightSource=${formatSampleValue(
      sample.volumeStencilLightPositionSource
    )}`,
    `volumeStencilExtrusion=${formatSampleValue(
      sample.volumeStencilExtrusionDistance
    )}`,
    `volumeStencilExtrusionSource=${formatSampleValue(
      sample.volumeStencilExtrusionDistanceSource
    )}`,
    `volumeStencilReceiverSize=${formatSampleValue(sample.volumeStencilReceiverSize)}`,
    `volumeStencilReceiverOpacity=${formatSampleValue(
      sample.volumeStencilReceiverOpacity
    )}`,
    `volumeStencilReceiverFunc=${formatSampleValue(sample.volumeStencilReceiverFunc)}`,
    `volumeStencilPasses=${formatSampleValue(sample.volumeStencilPasses)}`,
    `volumeStencilPassStates=${formatSampleValue(
      sample.volumeStencilPassStateSamples
    )}`,
    `volumeStencilReceiverState=${formatSampleValue(
      sample.volumeStencilReceiverState
    )}`,
    `volumeStencilStateProof=${formatSampleValue(
      sample.volumeStencilStateProofStatus
    )}`,
    `volumeStencilRetailFaceOpTable=${formatSampleValue(
      sample.volumeStencilRetailFaceOpTable
    )}`,
    `volumeStencilRetailOps=${formatSampleValue(sample.volumeStencilRetailOpSequence)}`,
    `volumeStencilRetailOpsSource=${formatSampleValue(
      sample.volumeStencilRetailOpSequenceSource
    )}`,
    `volumeStencilSource=${formatSampleValue(sample.volumeStencilSource)}`,
    `volumeStencilProof=${formatSampleValue(sample.volumeStencilProofStatus)}`,
    `volumeShaders=${formatSampleValue(sample.volumeRenderShaderNames)}`,
    `volumeBuckets=${formatSampleValue(sample.volumeRenderBuckets)}`,
    `volumeBucketPhases=${formatSampleValue(sample.volumeRenderBucketPhases)}`,
    `volumeBucketPhaseSource=${formatSampleValue(
      sample.volumeRenderBucketPhaseSource
    )}`,
    `volumeBucketPhaseProof=${formatSampleValue(
      sample.volumeRenderBucketPhaseProofStatus
    )}`,
    `volumeStateCalls=${formatSampleValue(sample.volumeRenderStateCallSequence)}`,
    `volumeStateCallSource=${formatSampleValue(
      sample.volumeRenderStateCallSource
    )}`,
    `volumeStateCallProof=${formatSampleValue(
      sample.volumeRenderStateCallProofStatus
    )}`,
    `volumeStateWrapper=${formatSampleValue(
      sample.volumeRenderStateWrapperSemantics
    )}`,
    `volumeStateWrapperSource=${formatSampleValue(
      sample.volumeRenderStateWrapperSource
    )}`,
    `volumeStateWrapperProof=${formatSampleValue(
      sample.volumeRenderStateWrapperProofStatus
    )}`,
    `volumeBlendDepthColorMaskWrappers=${formatSampleValue(
      sample.volumeBlendDepthColorMaskWrappers
    )}`,
    `volumeBlendDepthColorMaskWrapperSource=${formatSampleValue(
      sample.volumeBlendDepthColorMaskWrapperSource
    )}`,
    `volumeBlendDepthColorMaskWrapperProof=${formatSampleValue(
      sample.volumeBlendDepthColorMaskWrapperProofStatus
    )}`,
    `volumeImmediateCallerBufferFlushSource=${formatSampleValue(
      sample.volumeImmediateCallerBufferFlushSource
    )}`,
    `volumeImmediateCallerBufferFlushBlocker=${formatSampleValue(
      sample.volumeImmediateCallerBufferFlushBlocker
    )}`,
    `volumeImmediateCallerBufferFlushProof=${formatSampleValue(
      sample.volumeImmediateCallerBufferFlushProofStatus
    )}`,
    `volumeDirectCallerBufferBuilderSource=${formatSampleValue(
      sample.volumeDirectCallerBufferBuilderSource
    )}`,
    `volumeDirectCallerBufferBuilderBlocker=${formatSampleValue(
      sample.volumeDirectCallerBufferBuilderBlocker
    )}`,
    `volumeDirectCallerBufferBuilderProof=${formatSampleValue(
      sample.volumeDirectCallerBufferBuilderProofStatus
    )}`,
    `volumeActiveLightRenderEnvelopeState=${formatSampleValue(
      sample.volumeActiveLightRenderEnvelopeState
    )}`,
    `volumeActiveLightRenderEnvelopeSource=${formatSampleValue(
      sample.volumeActiveLightRenderEnvelopeSource
    )}`,
    `volumeActiveLightRenderEnvelopeBlocker=${formatSampleValue(
      sample.volumeActiveLightRenderEnvelopeBlocker
    )}`,
    `volumeActiveLightRenderEnvelopeProof=${formatSampleValue(
      sample.volumeActiveLightRenderEnvelopeProofStatus
    )}`,
    `volumeLocalDrawStateOrder=${formatSampleValue(
      sample.volumeLocalDrawStateOrder
    )}`,
    `volumeLocalDrawStateOrderSource=${formatSampleValue(
      sample.volumeLocalDrawStateOrderSource
    )}`,
    `volumeLocalDrawStateOrderBlocker=${formatSampleValue(
      sample.volumeLocalDrawStateOrderBlocker
    )}`,
    `volumeLocalDrawStateOrderProof=${formatSampleValue(
      sample.volumeLocalDrawStateOrderProofStatus
    )}`,
    `volumeShaderUniforms=${formatSampleValue(sample.volumeShaderUniformSemantics)}`,
    `volumeShaderUniformSource=${formatSampleValue(sample.volumeShaderUniformSource)}`,
    `volumeShaderUniformProof=${formatSampleValue(
      sample.volumeShaderUniformProofStatus
    )}`,
    `volumePath=${formatSampleValue(sample.volumeRenderPathSource)}`,
    `volumeDrawWrapper=${formatSampleValue(sample.volumeDrawWrapperSource)}`,
    `volumeLightProfile=${formatSampleValue(sample.volumeLightProfileSource)}`,
    `volumePathProof=${formatSampleValue(sample.volumeRenderPathProofStatus)}`,
    `proof=${formatSampleValue(sample.proofStatus)}`
  ].join(";");
}

function hasSourceBackedShadowVolumeCaster(sample: AuroraSceneFastShadowSample): boolean {
  return (
    sample.status === "active" &&
    sample.volumeCasterWAttribute === "auroraShadowVolumeW" &&
    (sample.volumeCasterVertexRecordCount ?? 0) > 0 &&
    (sample.volumeCasterIndexCount ?? 0) > 0
  );
}

function formatShadowVolumeRuntimeProbeSample(
  sample: AuroraSceneFastShadowSample
): string {
  return [
    `object=${formatSampleValue(sample.objectId)}`,
    `status=${formatSampleValue(sample.status)}`,
    `caster=${hasSourceBackedShadowVolumeCaster(sample) ? "active" : "missing"}`,
    `sourceVertices=${formatSampleValue(sample.volumeCasterSourceVertexCount)}`,
    `sourceQuadSize=${formatSampleValue(sample.volumeCasterSourceQuadSize)}`,
    `edges=${formatSampleValue(sample.volumeCasterEdgeCount)}`,
    `records=${formatSampleValue(sample.volumeCasterVertexRecordCount)}`,
    `indices=${formatSampleValue(sample.volumeCasterIndexCount)}`,
    `recordsPerSource=${formatSampleValue(sample.volumeCasterRecordsPerSourceVertex)}`,
    `indicesPerEdge=${formatSampleValue(sample.volumeCasterIndicesPerEdge)}`,
    `w=${formatSampleValue(sample.volumeCasterWAttribute)}`,
    `preview=${formatSampleValue(sample.volumeProjectionPreviewVisible)}`,
    `previewRenderer=${formatSampleValue(sample.volumeProjectionPreviewRendererMode)}`,
    `previewOpacity=${formatSampleValue(sample.volumeProjectionPreviewOpacity)}`,
    `stencil=${formatSampleValue(sample.volumeStencilVisible)}`,
    `stencilRenderer=${formatSampleValue(sample.volumeStencilRendererMode)}`,
    `receiver=${formatSampleValue(sample.volumeStencilReceiverFunc)}`,
    `receiverOpacity=${formatSampleValue(sample.volumeStencilReceiverOpacity)}`,
    `passes=${formatSampleValue(sample.volumeStencilPasses)}`,
    `passStates=${formatSampleValue(sample.volumeStencilPassStateSamples)}`,
    `receiverState=${formatSampleValue(sample.volumeStencilReceiverState)}`,
    `stateProof=${formatSampleValue(sample.volumeStencilStateProofStatus)}`,
    `retailFaceOpTable=${formatSampleValue(sample.volumeStencilRetailFaceOpTable)}`,
    `retailOps=${formatSampleValue(sample.volumeStencilRetailOpSequence)}`,
    `retailOpsSource=${formatSampleValue(sample.volumeStencilRetailOpSequenceSource)}`,
    `shaders=${formatSampleValue(sample.volumeRenderShaderNames)}`,
    `buckets=${formatSampleValue(sample.volumeRenderBuckets)}`,
    `bucketPhases=${formatSampleValue(sample.volumeRenderBucketPhases)}`,
    `bucketPhaseSource=${formatSampleValue(sample.volumeRenderBucketPhaseSource)}`,
    `bucketPhaseProof=${formatSampleValue(
      sample.volumeRenderBucketPhaseProofStatus
    )}`,
    `stateCalls=${formatSampleValue(sample.volumeRenderStateCallSequence)}`,
    `stateCallSource=${formatSampleValue(sample.volumeRenderStateCallSource)}`,
    `stateCallProof=${formatSampleValue(sample.volumeRenderStateCallProofStatus)}`,
    `stateWrapper=${formatSampleValue(sample.volumeRenderStateWrapperSemantics)}`,
    `stateWrapperSource=${formatSampleValue(sample.volumeRenderStateWrapperSource)}`,
    `stateWrapperProof=${formatSampleValue(
      sample.volumeRenderStateWrapperProofStatus
    )}`,
    `blendDepthColorMaskWrappers=${formatSampleValue(
      sample.volumeBlendDepthColorMaskWrappers
    )}`,
    `blendDepthColorMaskWrapperSource=${formatSampleValue(
      sample.volumeBlendDepthColorMaskWrapperSource
    )}`,
    `blendDepthColorMaskWrapperProof=${formatSampleValue(
      sample.volumeBlendDepthColorMaskWrapperProofStatus
    )}`,
    `immediateCallerBufferFlushSource=${formatSampleValue(
      sample.volumeImmediateCallerBufferFlushSource
    )}`,
    `immediateCallerBufferFlushBlocker=${formatSampleValue(
      sample.volumeImmediateCallerBufferFlushBlocker
    )}`,
    `immediateCallerBufferFlushProof=${formatSampleValue(
      sample.volumeImmediateCallerBufferFlushProofStatus
    )}`,
    `directCallerBufferBuilderSource=${formatSampleValue(
      sample.volumeDirectCallerBufferBuilderSource
    )}`,
    `directCallerBufferBuilderBlocker=${formatSampleValue(
      sample.volumeDirectCallerBufferBuilderBlocker
    )}`,
    `directCallerBufferBuilderProof=${formatSampleValue(
      sample.volumeDirectCallerBufferBuilderProofStatus
    )}`,
    `activeLightRenderEnvelopeState=${formatSampleValue(
      sample.volumeActiveLightRenderEnvelopeState
    )}`,
    `activeLightRenderEnvelopeSource=${formatSampleValue(
      sample.volumeActiveLightRenderEnvelopeSource
    )}`,
    `activeLightRenderEnvelopeBlocker=${formatSampleValue(
      sample.volumeActiveLightRenderEnvelopeBlocker
    )}`,
    `activeLightRenderEnvelopeProof=${formatSampleValue(
      sample.volumeActiveLightRenderEnvelopeProofStatus
    )}`,
    `localDrawStateOrder=${formatSampleValue(sample.volumeLocalDrawStateOrder)}`,
    `localDrawStateOrderSource=${formatSampleValue(
      sample.volumeLocalDrawStateOrderSource
    )}`,
    `localDrawStateOrderBlocker=${formatSampleValue(
      sample.volumeLocalDrawStateOrderBlocker
    )}`,
    `localDrawStateOrderProof=${formatSampleValue(
      sample.volumeLocalDrawStateOrderProofStatus
    )}`,
    `shaderUniforms=${formatSampleValue(sample.volumeShaderUniformSemantics)}`,
    `shaderUniformSource=${formatSampleValue(sample.volumeShaderUniformSource)}`,
    `shaderUniformProof=${formatSampleValue(sample.volumeShaderUniformProofStatus)}`,
    `localPixelProof=${AURORA_SCENE_SHADOW_VOLUME_RUNTIME_PROBE_LOCAL_PIXEL_STATUS}`,
    `retailParity=blocked`
  ].join(";");
}

function buildShadowVolumeRuntimeProbeDiagnostics(
  fastShadowSampleValues: readonly AuroraSceneFastShadowSample[]
): AuroraSceneShadowVolumeRuntimeProbeDiagnostics {
  const activeSamples = fastShadowSampleValues.filter(
    (sample) => sample.status === "active"
  );
  const observedStencilPasses = new Set<string>();
  const renderShaderNames = new Set<string>();
  const renderBuckets = new Set<string>();
  let activeCasterCount = 0;
  let projectionPreviewCount = 0;
  let stencilReceiverCount = 0;
  let stencilVolumePassCount = 0;

  activeSamples.forEach((sample) => {
    if (hasSourceBackedShadowVolumeCaster(sample)) {
      activeCasterCount += 1;
    }
    if (
      sample.volumeProjectionPreviewVisible === true &&
      sample.volumeProjectionPreviewWAttribute === "auroraShadowVolumeW"
    ) {
      projectionPreviewCount += 1;
    }
    if (
      sample.volumeStencilVisible === true &&
      sample.volumeStencilReceiverFunc === "NotEqual(0)"
    ) {
      stencilReceiverCount += 1;
    }
    stencilVolumePassCount += sample.volumeStencilPasses.length;
    sample.volumeStencilPasses.forEach((pass) => observedStencilPasses.add(pass));
    sample.volumeRenderShaderNames.forEach((shader) => renderShaderNames.add(shader));
    sample.volumeRenderBuckets.forEach((bucket) => renderBuckets.add(bucket));
  });

  return {
    status:
      activeCasterCount > 0 || stencilReceiverCount > 0 || stencilVolumePassCount > 0
        ? AURORA_SCENE_SHADOW_VOLUME_RUNTIME_PROBE_ACTIVE_STATUS
        : AURORA_SCENE_SHADOW_VOLUME_RUNTIME_PROBE_NOT_OBSERVED_STATUS,
    proofSource: AURORA_SCENE_SHADOW_VOLUME_RUNTIME_PROBE_PROOF_SOURCE,
    blocker: AURORA_SCENE_SHADOW_VOLUME_RUNTIME_PROBE_BLOCKER,
    localPixelProofStatus: AURORA_SCENE_SHADOW_VOLUME_RUNTIME_PROBE_LOCAL_PIXEL_STATUS,
    activeCasterCount,
    projectionPreviewCount,
    stencilReceiverCount,
    stencilVolumePassCount,
    expectedStencilPasses: [
      ...AURORA_SCENE_SHADOW_VOLUME_RUNTIME_PROBE_EXPECTED_STENCIL_PASSES
    ],
    observedStencilPasses: Array.from(observedStencilPasses).sort(),
    renderShaderNames: Array.from(renderShaderNames).sort(),
    renderBuckets: Array.from(renderBuckets).sort(),
    samples: activeSamples
      .slice(0, AURORA_SCENE_SHADOW_SAMPLE_LIMIT)
      .map(formatShadowVolumeRuntimeProbeSample)
  };
}

function resolveRetailOrderingObservedLanes(
  laneCounts: Readonly<Record<string, number>>,
  nonPointLightRequestLaneCounts: Readonly<Record<string, number>>
): string[] {
  return Array.from(
    new Set([...Object.keys(laneCounts), ...Object.keys(nonPointLightRequestLaneCounts)])
  ).sort();
}

function resolveRetailOrderingMissingLanes(observedLanes: readonly string[]): string[] {
  const observed = new Set(observedLanes);
  return AURORA_SCENE_LIGHT_RETAIL_ORDERING_REQUIRED_LANES.filter(
    (lane) => !observed.has(lane)
  );
}

function uniqueSorted(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0))).sort();
}

function resolveCrossLaneRuntimeProbeOrderKey(
  sample: AuroraSceneLightLaneSample,
  traversalIndex: number
): number {
  if (sample.budgetRank !== null) {
    return sample.budgetRank;
  }
  if (sample.retailScore !== null) {
    return 10000 + sample.retailScore;
  }
  return 20000 + traversalIndex;
}

function formatCrossLaneRuntimeProbeSample(
  sample: AuroraSceneCrossLaneRuntimeProbeSample
): string {
  return [
    `lane=${formatSampleValue(sample.lane)}`,
    `kind=${formatSampleValue(sample.kind)}`,
    `name=${formatSampleValue(sample.name)}`,
    `localOrderKey=${formatSampleValue(sample.localOrderKey)}`,
    `traversalIndex=${formatSampleValue(sample.traversalIndex)}`,
    `budgetRank=${formatSampleValue(sample.budgetRank)}`,
    `budgetAccepted=${formatSampleValue(sample.budgetAccepted)}`,
    `retailScore=${formatSampleValue(sample.retailScore)}`,
    `priority=${formatSampleValue(sample.priority)}`,
    `source=${formatSampleValue(sample.source)}`,
    `proof=${formatSampleValue(sample.proofStatus)}`,
    `retailOrdering=blocked`
  ].join(";");
}

function buildCrossLaneRuntimeProbeDiagnostics(
  pointLightSampleRecords: readonly AuroraSceneLightLaneSample[],
  nonPointLightRequestSampleRecords: readonly AuroraSceneNonPointLightRequestSample[],
  retailOrderingObservedLanes: readonly string[],
  retailOrderingMissingLanes: readonly string[]
): AuroraSceneCrossLaneRuntimeProbeDiagnostics {
  const budgetAcceptedLanes: string[] = [];
  const budgetDroppedLanes: string[] = [];
  const budgetUnknownLanes: string[] = [];

  const pointSamples = pointLightSampleRecords
    .filter((sample) => isSourceBackedLane(sample.lane))
    .map((sample, traversalIndex): AuroraSceneCrossLaneRuntimeProbeSample => {
      if (sample.budgetAccepted === true) {
        budgetAcceptedLanes.push(sample.lane);
      } else if (sample.budgetAccepted === false) {
        budgetDroppedLanes.push(sample.lane);
      } else {
        budgetUnknownLanes.push(sample.lane);
      }
      return {
        lane: sample.lane,
        kind: "point-light",
        name: sample.name,
        localOrderKey: resolveCrossLaneRuntimeProbeOrderKey(sample, traversalIndex),
        traversalIndex,
        budgetRank: sample.budgetRank,
        budgetAccepted: sample.budgetAccepted,
        retailScore: sample.retailScore,
        priority: sample.retailScorePriority,
        source: sample.source,
        proofStatus:
          sample.retailScoreProofStatus ||
          sample.radiusProofStatus ||
          sample.falloffProofStatus ||
          AURORA_SCENE_LIGHT_RETAIL_ORDERING_PROOF_STATUS
      };
    })
    .sort((left, right) => {
      const leftKey = left.localOrderKey ?? Number.MAX_SAFE_INTEGER;
      const rightKey = right.localOrderKey ?? Number.MAX_SAFE_INTEGER;
      return leftKey - rightKey || left.traversalIndex - right.traversalIndex;
    });

  const requestSamples = nonPointLightRequestSampleRecords
    .map(
      (sample, traversalIndex): AuroraSceneCrossLaneRuntimeProbeSample => ({
        lane: sample.lane,
        kind: "progfx-type4-request-not-pointlight",
        name: sample.label,
        localOrderKey:
          sample.priority === null ? 30000 + traversalIndex : 25000 + sample.priority,
        traversalIndex,
        budgetRank: null,
        budgetAccepted: null,
        retailScore: null,
        priority: sample.priority,
        source: sample.parameterSource,
        proofStatus: sample.runtimeSchedulingStatus
      })
    )
    .sort((left, right) => {
      const leftKey = left.localOrderKey ?? Number.MAX_SAFE_INTEGER;
      const rightKey = right.localOrderKey ?? Number.MAX_SAFE_INTEGER;
      return leftKey - rightKey || left.traversalIndex - right.traversalIndex;
    });

  const requiredLaneCoverageCount = AURORA_SCENE_LIGHT_RETAIL_ORDERING_REQUIRED_LANES.filter(
    (lane) => retailOrderingObservedLanes.includes(lane)
  ).length;

  return {
    status:
      retailOrderingMissingLanes.length === 0
        ? AURORA_SCENE_LIGHT_RETAIL_ORDERING_RUNTIME_PROBE_COMPLETE_STATUS
        : AURORA_SCENE_LIGHT_RETAIL_ORDERING_RUNTIME_PROBE_INCOMPLETE_STATUS,
    proofSource: AURORA_SCENE_LIGHT_RETAIL_ORDERING_RUNTIME_PROBE_PROOF_SOURCE,
    blocker: AURORA_SCENE_LIGHT_RETAIL_ORDERING_RUNTIME_PROBE_BLOCKER,
    localOrderSource: AURORA_SCENE_LIGHT_RETAIL_ORDERING_RUNTIME_PROBE_LOCAL_ORDER_SOURCE,
    requiredLaneCoverageCount,
    pointLightSampleCount: pointSamples.length,
    nonPointRequestSampleCount: requestSamples.length,
    budgetAcceptedLanes: uniqueSorted(budgetAcceptedLanes),
    budgetDroppedLanes: uniqueSorted(budgetDroppedLanes),
    budgetUnknownLanes: uniqueSorted(budgetUnknownLanes),
    localOrderSamples: [...pointSamples, ...requestSamples]
      .slice(0, AURORA_SCENE_LIGHT_SAMPLE_LIMIT)
      .map(formatCrossLaneRuntimeProbeSample)
  };
}

function formatLightManagerPreviewBudgetPlanSample(
  entry: AuroraLightManagerPreviewBudgetEntry<AuroraSceneLightLaneSample>
): string {
  const sample = entry.payload;
  return [
    `rank=${formatSampleValue(entry.rank)}`,
    `accepted=${formatSampleValue(entry.accepted)}`,
    `lane=${formatSampleValue(sample.lane)}`,
    `name=${formatSampleValue(sample.name)}`,
    `score=${formatSampleValue(entry.retailScore.score)}`,
    `priority=${formatSampleValue(entry.retailScore.priority)}`,
    `previewDistance=${formatSampleValue(entry.retailScore.distance)}`,
    `sourceRadius=${formatSampleValue(entry.retailScore.sourceRadius)}`,
    `activeSelectionRadiusLimit=${formatSampleValue(
      entry.retailScore.activeSelectionRadiusLimit
    )}`,
    `activeSelectionRadiusEnforced=${formatSampleValue(
      entry.retailScore.activeSelectionRadiusEnforced
    )}`,
    `activeSelectionRadiusPassed=${formatSampleValue(
      entry.retailScore.activeSelectionRadiusPassed
    )}`,
    `multiplier=${formatSampleValue(entry.retailScore.multiplier)}`,
    `rangeTerm=${formatSampleValue(entry.retailScore.rangeTerm)}`,
    `source=${formatSampleValue(entry.retailScore.source)}`,
    `proof=${formatSampleValue(entry.retailScore.proofStatus)}`,
    `retailPrecedence=blocked`
  ].join(";");
}

function buildLightManagerPreviewBudgetPlanDiagnostics(
  pointLightSampleRecords: readonly AuroraSceneLightLaneSample[],
  activeSlotCap: number
): AuroraSceneLightManagerPreviewBudgetPlanDiagnostics {
  const budgetEntries = selectAuroraLightManagerPreviewBudget(
    pointLightSampleRecords
      .filter((sample) => isSourceBackedLane(sample.lane))
      .map((sample, sourceIndex) => ({
        key: `${sample.lane}:${sample.name}:${sourceIndex}`,
        sourceIndex,
        payload: sample,
        scoreInput: {
          position: {
            x: sample.worldPosition[0] ?? 0,
            y: sample.worldPosition[1] ?? 0,
            z: sample.worldPosition[2] ?? 0
          },
          sourceRadius:
            sample.retailScoreSourceRadius ??
            sample.sourceRadiusWorldDistance ??
            sample.sourceRadius ??
            sample.distance,
          activeSelectionRadiusOverride:
            sample.retailScoreActiveSelectionRadiusOverride,
          multiplier: sample.retailScoreMultiplier ?? sample.intensity,
          priority: sample.retailScorePriority ?? 0,
          field0x70: sample.retailScoreField0x70,
          runtimeExtent: sample.retailScoreRuntimeExtent,
          enforceActiveSelectionRadius: false
        }
      })),
    activeSlotCap
  );

  return {
    status: AURORA_SCENE_LIGHT_MANAGER_PREVIEW_BUDGET_PLAN_STATUS,
    strategy: AURORA_LIGHT_MANAGER_PREVIEW_BUDGET_STRATEGY,
    proofSource: AURORA_LIGHT_MANAGER_PREVIEW_BUDGET_STRATEGY_SOURCE,
    proofStatus: AURORA_LIGHT_MANAGER_PREVIEW_BUDGET_STRATEGY_PROOF_STATUS,
    blocker: AURORA_SCENE_LIGHT_MANAGER_PREVIEW_BUDGET_PLAN_BLOCKER,
    acceptedLanes: uniqueSorted(
      budgetEntries.filter((entry) => entry.accepted).map((entry) => entry.payload.lane)
    ),
    droppedLanes: uniqueSorted(
      budgetEntries.filter((entry) => !entry.accepted).map((entry) => entry.payload.lane)
    ),
    samples: budgetEntries
      .slice(0, AURORA_SCENE_LIGHT_SAMPLE_LIMIT)
      .map(formatLightManagerPreviewBudgetPlanSample)
  };
}

function resolveAreaShadowDiagnostics(scene: THREE.Scene): Pick<
  AuroraSceneShadowDiagnostics,
  | "areaShadowStatus"
  | "areaShadowSourceField"
  | "areaShadowStatusSource"
  | "areaShadowOpacity"
  | "areaShadowOpacitySource"
  | "areaShadowOpacityFactor"
  | "areaShadowOpacityFactorSource"
> {
  const data = scene.userData ?? {};
  return {
    areaShadowStatus: readString(data.auroraTerrainAreaGlobalShadowStatus),
    areaShadowSourceField: readString(data.auroraTerrainAreaGlobalShadowSourceField),
    areaShadowStatusSource: readString(data.auroraTerrainAreaGlobalShadowStatusSource),
    areaShadowOpacity: readFiniteNumber(data.auroraTerrainAreaGlobalShadowOpacity),
    areaShadowOpacitySource: readString(data.auroraTerrainAreaGlobalShadowOpacitySource),
    areaShadowOpacityFactor: readFiniteNumber(
      data.auroraTerrainAreaGlobalShadowOpacityFactor
    ),
    areaShadowOpacityFactorSource: readString(
      data.auroraTerrainAreaGlobalShadowOpacityFactorSource
    )
  };
}

function resolveProgFxType4Lane(data: THREE.Object3D["userData"]): string | null {
  if (!readString(data.auroraVfxProgFxType4ProofStatus)) {
    return null;
  }
  const animationKind = readString(data.auroraVfxProgFxType4AnimationKind);
  const visionMode = readString(data.auroraVfxProgFxType4VisionMode);
  return animationKind === "vision" || visionMode.length > 0
    ? "progfx-type4-vision-request"
    : "progfx-type4-light-request";
}

function buildProgFxType4RequestSample(
  data: THREE.Object3D["userData"],
  lane: string,
  worldPosition: readonly number[]
): AuroraSceneNonPointLightRequestSample {
  return {
    lane,
    rowId: readFiniteNumber(data.auroraVfxProgFxType4RowId),
    label: readString(data.auroraVfxProgFxType4Label),
    worldPosition,
    animationRaw: readString(data.auroraVfxProgFxType4Param1AnimationRaw),
    animation: readString(data.auroraVfxProgFxType4Animation),
    animationParameterStatus: readString(
      data.auroraVfxProgFxType4Param1AnimationStatus
    ),
    animationKind: readString(data.auroraVfxProgFxType4AnimationKind),
    visionMode: readString(data.auroraVfxProgFxType4VisionMode),
    visionParameterStatus: readString(
      data.auroraVfxProgFxType4VisionParameterStatus
    ),
    symbolicColor: readString(data.auroraVfxProgFxType4SymbolicColor),
    tokenRadiusMeters: readFiniteNumber(data.auroraVfxProgFxType4TokenRadiusMeters),
    tokenRadiusProofStatus: readString(data.auroraVfxProgFxType4TokenRadiusProofStatus),
    radiusMeters: readFiniteNumber(data.auroraVfxProgFxType4RadiusMeters),
    radiusProofStatus: readString(data.auroraVfxProgFxType4RadiusProofStatus),
    sourceMdlNodeName: readString(data.auroraVfxProgFxType4SourceMdlNodeName),
    sourceMdlAnimation: readString(data.auroraVfxProgFxType4SourceMdlAnimation),
    sourceMdlColor: Array.isArray(data.auroraVfxProgFxType4SourceMdlColor)
      ? data.auroraVfxProgFxType4SourceMdlColor
          .map((entry) => readFiniteNumber(entry))
          .filter((entry): entry is number => entry !== null)
      : [],
    sourceMdlRadiusMeters: readFiniteNumber(data.auroraVfxProgFxType4SourceMdlRadiusMeters),
    sourceMdlRadiusFrames: Array.isArray(data.auroraVfxProgFxType4SourceMdlRadiusFrames)
      ? data.auroraVfxProgFxType4SourceMdlRadiusFrames
          .map((entry) => readFiniteNumber(entry))
          .filter((entry): entry is number => entry !== null)
      : [],
    sourceMdlRadiusProofStatus: readString(
      data.auroraVfxProgFxType4SourceMdlRadiusProofStatus
    ),
    animationSpeedRaw: readString(data.auroraVfxProgFxType4Param2AnimationSpeedRaw),
    animationSpeedParameterStatus: readString(
      data.auroraVfxProgFxType4Param2AnimationSpeedStatus
    ),
    castShadowsRaw: readString(data.auroraVfxProgFxType4Param3CastShadowsRaw),
    castShadows: readBoolean(data.auroraVfxProgFxType4CastShadows),
    castShadowParameterStatus: readString(
      data.auroraVfxProgFxType4Param3CastShadowsStatus
    ),
    priorityRaw: readString(data.auroraVfxProgFxType4Param4PriorityRaw),
    priority: readFiniteNumber(data.auroraVfxProgFxType4Priority),
    priorityParameterStatus: readString(
      data.auroraVfxProgFxType4Param4PriorityStatus
    ),
    proximitySuppressionRaw: readString(
      data.auroraVfxProgFxType4Param5ProximitySuppressionRaw
    ),
    proximitySuppression: readBoolean(data.auroraVfxProgFxType4ProximitySuppression),
    proximitySuppressionParameterStatus: readString(
      data.auroraVfxProgFxType4Param5ProximitySuppressionStatus
    ),
    attachToSceneRaw: readString(data.auroraVfxProgFxType4Param6AttachToSceneRaw),
    attachToScene: readBoolean(data.auroraVfxProgFxType4AttachToScene),
    sceneAttachmentParameterStatus: readString(
      data.auroraVfxProgFxType4Param6AttachToSceneStatus
    ),
    modelRaw: readString(data.auroraVfxProgFxType4Param7ModelRaw),
    modelParameterStatus: readString(data.auroraVfxProgFxType4Param7ModelStatus),
    unusedParam8Raw: readString(data.auroraVfxProgFxType4Param8UnusedRaw),
    parameterSource: readString(data.auroraVfxProgFxType4ParameterSource),
    parameterPreservationProofSource: readString(
      data.auroraVfxProgFxType4ParameterPreservationProofSource
    ),
    parameterPreservationProofStatus: readString(
      data.auroraVfxProgFxType4ParameterPreservationProofStatus
    ),
    ownerVisualEffectRowId: readFiniteNumber(
      data.auroraVfxProgFxType4OwnerVisualEffectRowId
    ),
    ownerVisualEffectLabel: readString(data.auroraVfxProgFxType4OwnerVisualEffectLabel),
    proofStatus: readString(data.auroraVfxProgFxType4ProofStatus),
    runtimeSchedulingStatus: readString(
      data.auroraVfxProgFxType4RuntimeSchedulingStatus
    ),
    runtimeSchedulingProofSource: readString(
      data.auroraVfxProgFxType4RuntimeSchedulingProofSource
    ),
    runtimeSchedulingBlocker: readString(
      data.auroraVfxProgFxType4RuntimeSchedulingBlocker
    ),
    sceneAttachmentPolicyStatus: readString(
      data.auroraVfxProgFxType4SceneAttachmentPolicyStatus
    ),
    proximitySuppressionPolicyStatus: readString(
      data.auroraVfxProgFxType4ProximitySuppressionPolicyStatus
    ),
    visionMutationPolicyStatus: readString(
      data.auroraVfxProgFxType4VisionMutationPolicyStatus
    ),
    shadowPolicyStatus: readString(data.auroraVfxProgFxType4ShadowPolicyStatus),
    visualPreviewStatus: readString(data.auroraVfxProgFxType4VisualPreviewStatus),
    notPlaceableTwoDaLight: readBoolean(data.auroraVfxProgFxType4NotPlaceableTwoDaLight),
    notMdlLightNode: readBoolean(data.auroraVfxProgFxType4NotMdlLightNode)
  };
}

function buildProgFxType4RequestKey(sample: AuroraSceneNonPointLightRequestSample): string {
  return [
    sample.lane,
    sample.rowId,
    sample.ownerVisualEffectRowId,
    sample.animation,
    sample.animationKind,
    sample.visionMode
  ]
    .map(formatSampleValue)
    .join("|");
}

function formatNonPointLightRequestSample(
  sample: AuroraSceneNonPointLightRequestSample
): string {
  return [
    `lane=${formatSampleValue(sample.lane)}`,
    `row=${formatSampleValue(sample.rowId)}`,
    `label=${formatSampleValue(sample.label)}`,
    `worldPosition=${formatSampleValue(sample.worldPosition)}`,
    `param1Raw=${formatSampleValue(sample.animationRaw)}`,
    `animation=${formatSampleValue(sample.animation)}`,
    `param1Status=${formatSampleValue(sample.animationParameterStatus)}`,
    `kind=${formatSampleValue(sample.animationKind)}`,
    `vision=${formatSampleValue(sample.visionMode)}`,
    `visionParamStatus=${formatSampleValue(sample.visionParameterStatus)}`,
    `symbolicColor=${formatSampleValue(sample.symbolicColor)}`,
    `tokenRadiusMeters=${formatSampleValue(sample.tokenRadiusMeters)}`,
    `tokenRadiusProof=${formatSampleValue(sample.tokenRadiusProofStatus)}`,
    `radiusMeters=${formatSampleValue(sample.radiusMeters)}`,
    `radiusProof=${formatSampleValue(sample.radiusProofStatus)}`,
    `sourceMdlNode=${formatSampleValue(sample.sourceMdlNodeName)}`,
    `sourceMdlAnimation=${formatSampleValue(sample.sourceMdlAnimation)}`,
    `sourceMdlColor=${formatSampleValue(sample.sourceMdlColor)}`,
    `sourceMdlRadius=${formatSampleValue(sample.sourceMdlRadiusMeters)}`,
    `sourceMdlRadiusFrames=${formatSampleValue(sample.sourceMdlRadiusFrames)}`,
    `sourceMdlRadiusProof=${formatSampleValue(sample.sourceMdlRadiusProofStatus)}`,
    `param2Raw=${formatSampleValue(sample.animationSpeedRaw)}`,
    `param2Status=${formatSampleValue(sample.animationSpeedParameterStatus)}`,
    `param3Raw=${formatSampleValue(sample.castShadowsRaw)}`,
    `castShadows=${formatSampleValue(sample.castShadows)}`,
    `param3Status=${formatSampleValue(sample.castShadowParameterStatus)}`,
    `param4Raw=${formatSampleValue(sample.priorityRaw)}`,
    `priority=${formatSampleValue(sample.priority)}`,
    `param4Status=${formatSampleValue(sample.priorityParameterStatus)}`,
    `param5Raw=${formatSampleValue(sample.proximitySuppressionRaw)}`,
    `proximity=${formatSampleValue(sample.proximitySuppression)}`,
    `param5Status=${formatSampleValue(sample.proximitySuppressionParameterStatus)}`,
    `param6Raw=${formatSampleValue(sample.attachToSceneRaw)}`,
    `attachToScene=${formatSampleValue(sample.attachToScene)}`,
    `param6Status=${formatSampleValue(sample.sceneAttachmentParameterStatus)}`,
    `param7Raw=${formatSampleValue(sample.modelRaw)}`,
    `param7Status=${formatSampleValue(sample.modelParameterStatus)}`,
    `param8Raw=${formatSampleValue(sample.unusedParam8Raw)}`,
    `parameterSource=${formatSampleValue(sample.parameterSource)}`,
    `parameterPreservationSource=${formatSampleValue(
      sample.parameterPreservationProofSource
    )}`,
    `parameterPreservationProof=${formatSampleValue(
      sample.parameterPreservationProofStatus
    )}`,
    `ownerRow=${formatSampleValue(sample.ownerVisualEffectRowId)}`,
    `ownerLabel=${formatSampleValue(sample.ownerVisualEffectLabel)}`,
    `proof=${formatSampleValue(sample.proofStatus)}`,
    `runtimeScheduling=${formatSampleValue(sample.runtimeSchedulingStatus)}`,
    `runtimeSchedulingSource=${formatSampleValue(sample.runtimeSchedulingProofSource)}`,
    `runtimeSchedulingBlocker=${formatSampleValue(sample.runtimeSchedulingBlocker)}`,
    `sceneAttachmentPolicy=${formatSampleValue(sample.sceneAttachmentPolicyStatus)}`,
    `proximityPolicy=${formatSampleValue(sample.proximitySuppressionPolicyStatus)}`,
    `visionMutationPolicy=${formatSampleValue(sample.visionMutationPolicyStatus)}`,
    `shadowPolicy=${formatSampleValue(sample.shadowPolicyStatus)}`,
    `visualPreview=${formatSampleValue(sample.visualPreviewStatus)}`,
    `notPlaceable=${formatSampleValue(sample.notPlaceableTwoDaLight)}`,
    `notMdl=${formatSampleValue(sample.notMdlLightNode)}`
  ].join(";");
}

function buildProgFxType4ShadowRequestSample(
  sample: AuroraSceneNonPointLightRequestSample
): AuroraSceneProgFxType4ShadowRequestSample {
  return {
    lane: sample.lane,
    rowId: sample.rowId,
    label: sample.label,
    animation: sample.animation,
    castShadowsRaw: sample.castShadowsRaw,
    castShadows: sample.castShadows,
    castShadowParameterStatus: sample.castShadowParameterStatus,
    parameterPreservationProofStatus: sample.parameterPreservationProofStatus,
    proofStatus: sample.proofStatus,
    runtimeSchedulingStatus: sample.runtimeSchedulingStatus,
    runtimeSchedulingProofSource: sample.runtimeSchedulingProofSource,
    runtimeSchedulingBlocker: sample.runtimeSchedulingBlocker,
    shadowPolicyStatus: sample.shadowPolicyStatus,
    visualPreviewStatus: sample.visualPreviewStatus
  };
}

function formatProgFxType4ShadowRequestSample(
  sample: AuroraSceneProgFxType4ShadowRequestSample
): string {
  return [
    `lane=${formatSampleValue(sample.lane)}`,
    `row=${formatSampleValue(sample.rowId)}`,
    `label=${formatSampleValue(sample.label)}`,
    `animation=${formatSampleValue(sample.animation)}`,
    `param3Raw=${formatSampleValue(sample.castShadowsRaw)}`,
    `castShadows=${formatSampleValue(sample.castShadows)}`,
    `param3Status=${formatSampleValue(sample.castShadowParameterStatus)}`,
    `parameterPreservationProof=${formatSampleValue(
      sample.parameterPreservationProofStatus
    )}`,
    `proof=${formatSampleValue(sample.proofStatus)}`,
    `runtimeScheduling=${formatSampleValue(sample.runtimeSchedulingStatus)}`,
    `runtimeSchedulingSource=${formatSampleValue(sample.runtimeSchedulingProofSource)}`,
    `runtimeSchedulingBlocker=${formatSampleValue(sample.runtimeSchedulingBlocker)}`,
    `shadowPolicy=${formatSampleValue(sample.shadowPolicyStatus)}`,
    `visualPreview=${formatSampleValue(sample.visualPreviewStatus)}`
  ].join(";");
}

export function resolveAuroraScenePointLightDiagnostics(
  scene: THREE.Scene
): AuroraScenePointLightDiagnostics {
  const budget = resolvePreviewBudgetCap(scene);
  const laneCounts: Record<string, number> = {};
  const nonPointLightRequestLaneCounts: Record<string, number> = {};
  const samples: string[] = [];
  const pointLightSampleRecords: AuroraSceneLightLaneSample[] = [];
  const nonPointLightRequestSamples: string[] = [];
  const nonPointLightRequestSampleRecords: AuroraSceneNonPointLightRequestSample[] = [];
  const nonPointLightRequestKeys = new Set<string>();
  const pointLightShadowSamples: string[] = [];
  const itemPropertyLightShadowPolicySamples: string[] = [];
  const directionalLightShadowSamples: string[] = [];
  const progFxType4ShadowRequestSamples: string[] = [];
  const progFxType4ShadowRequestKeys = new Set<string>();
  const fastShadowSampleByKey = new Map<string, AuroraSceneFastShadowSample>();
  let pointLightCount = 0;
  let sourceBackedPointLightCount = 0;
  let pointLightCastShadowCount = 0;
  let itemPropertyLightShadowPolicyCount = 0;
  let directionalLightCastShadowCount = 0;

  scene.traverse((node) => {
    const progFxType4Lane = resolveProgFxType4Lane(node.userData ?? {});
    if (progFxType4Lane) {
      const progFxWorldPosition = new THREE.Vector3();
      node.getWorldPosition(progFxWorldPosition);
      const sample = buildProgFxType4RequestSample(
        node.userData ?? {},
        progFxType4Lane,
        roundVector3(progFxWorldPosition)
      );
      const key = buildProgFxType4RequestKey(sample);
      if (!nonPointLightRequestKeys.has(key)) {
        nonPointLightRequestKeys.add(key);
        nonPointLightRequestSampleRecords.push(sample);
        nonPointLightRequestLaneCounts[sample.lane] =
          (nonPointLightRequestLaneCounts[sample.lane] ?? 0) + 1;
        if (
          nonPointLightRequestSamples.length <
          AURORA_SCENE_NON_POINT_LIGHT_REQUEST_SAMPLE_LIMIT
        ) {
          nonPointLightRequestSamples.push(formatNonPointLightRequestSample(sample));
        }
        if (sample.castShadows === true) {
          progFxType4ShadowRequestKeys.add(key);
          if (
            progFxType4ShadowRequestSamples.length <
            AURORA_SCENE_SHADOW_SAMPLE_LIMIT
          ) {
            progFxType4ShadowRequestSamples.push(
              formatProgFxType4ShadowRequestSample(
                buildProgFxType4ShadowRequestSample(sample)
              )
            );
          }
        }
      }
    }
    if (node instanceof THREE.PointLight) {
      pointLightCount += 1;
      const sample = buildPointLightSample(node);
      laneCounts[sample.lane] = (laneCounts[sample.lane] ?? 0) + 1;
      if (isSourceBackedLane(sample.lane)) {
        sourceBackedPointLightCount += 1;
        pointLightSampleRecords.push(sample);
      }
      if (samples.length < AURORA_SCENE_LIGHT_SAMPLE_LIMIT) {
        samples.push(formatPointLightSample(sample));
      }
      if (node.castShadow) {
        pointLightCastShadowCount += 1;
        if (pointLightShadowSamples.length < AURORA_SCENE_SHADOW_SAMPLE_LIMIT) {
          pointLightShadowSamples.push(formatPointLightShadowSample(buildPointLightShadowSample(node)));
        }
      }
      if (isItemPropertyLightPointLight(node)) {
        itemPropertyLightShadowPolicyCount += 1;
        if (
          itemPropertyLightShadowPolicySamples.length <
          AURORA_SCENE_SHADOW_SAMPLE_LIMIT
        ) {
          itemPropertyLightShadowPolicySamples.push(
            formatItemPropertyLightShadowPolicySample(
              buildItemPropertyLightShadowPolicySample(node)
            )
          );
        }
      }
    }
    if (isAuroraAreaDirectionalShadowLight(node) && node.castShadow) {
      directionalLightCastShadowCount += 1;
      if (directionalLightShadowSamples.length < AURORA_SCENE_SHADOW_SAMPLE_LIMIT) {
        directionalLightShadowSamples.push(
          formatDirectionalShadowSample(buildDirectionalShadowSample(node))
        );
      }
    }
    if (isPlaceableFastShadowProxy(node)) {
      const sample = buildFastShadowSample(node);
      const key = buildFastShadowSampleKey(node, sample);
      const current = fastShadowSampleByKey.get(key);
      fastShadowSampleByKey.set(
        key,
        current ? mergeFastShadowSample(current, sample) : sample
      );
    }
  });
  const areaShadow = resolveAreaShadowDiagnostics(scene);
  const fastShadowSampleValues = Array.from(fastShadowSampleByKey.values());
  const fastShadowProxyCount = fastShadowSampleValues.filter(
    (sample) => sample.status === "active"
  ).length;
  const fastShadowDisabledCount = fastShadowSampleValues.length - fastShadowProxyCount;
  const fastShadowSamples = fastShadowSampleValues
    .slice(0, AURORA_SCENE_SHADOW_SAMPLE_LIMIT)
    .map(formatFastShadowSample);
  const shadowVolumeRuntimeProbe =
    buildShadowVolumeRuntimeProbeDiagnostics(fastShadowSampleValues);
  const retailOrderingObservedLanes = resolveRetailOrderingObservedLanes(
    laneCounts,
    nonPointLightRequestLaneCounts
  );
  const retailOrderingMissingLanes = resolveRetailOrderingMissingLanes(
    retailOrderingObservedLanes
  );
  const retailOrderingRuntimeProbe = buildCrossLaneRuntimeProbeDiagnostics(
    pointLightSampleRecords,
    nonPointLightRequestSampleRecords,
    retailOrderingObservedLanes,
    retailOrderingMissingLanes
  );
  const retailOrderingPreviewBudgetPlan =
    buildLightManagerPreviewBudgetPlanDiagnostics(pointLightSampleRecords, budget.cap);
  const progFxType4Scheduler = resolveAuroraProgFxType4SchedulerPolicy({
    requests: nonPointLightRequestSampleRecords,
    pointLightCount,
    pointLights: pointLightSampleRecords
  });

  return {
    proofStatus: AURORA_SCENE_LIGHT_DIAGNOSTIC_PROOF_STATUS,
    retailOrderingStatus: AURORA_SCENE_LIGHT_RETAIL_ORDERING_STATUS,
    retailOrderingProofSource: AURORA_SCENE_LIGHT_RETAIL_ORDERING_PROOF_SOURCE,
    retailOrderingProofStatus: AURORA_SCENE_LIGHT_RETAIL_ORDERING_PROOF_STATUS,
    retailOrderingManagerInternalInsertionSource:
      AURORA_SCENE_LIGHT_MANAGER_INTERNAL_INSERTION_SOURCE,
    retailOrderingManagerInternalInsertionProofStatus:
      AURORA_SCENE_LIGHT_MANAGER_INTERNAL_INSERTION_PROOF_STATUS,
    retailOrderingManagerCrossLaneCallsiteBlocker:
      AURORA_SCENE_LIGHT_MANAGER_CROSS_LANE_CALLSITE_BLOCKER,
    retailOrderingSortScoreSource: AURORA_SCENE_LIGHT_RETAIL_SORT_SCORE_SOURCE,
    retailOrderingSortScoreFormula: AURORA_SCENE_LIGHT_RETAIL_SORT_SCORE_FORMULA,
    retailOrderingSortDirection: AURORA_SCENE_LIGHT_RETAIL_SORT_DIRECTION,
    retailOrderingSortScoreProofStatus: AURORA_SCENE_LIGHT_RETAIL_SORT_SCORE_PROOF_STATUS,
    retailOrderingCoverageStatus:
      retailOrderingMissingLanes.length === 0
        ? AURORA_SCENE_LIGHT_RETAIL_ORDERING_COVERAGE_COMPLETE_STATUS
        : AURORA_SCENE_LIGHT_RETAIL_ORDERING_COVERAGE_INCOMPLETE_STATUS,
    retailOrderingRequiredLanes: [...AURORA_SCENE_LIGHT_RETAIL_ORDERING_REQUIRED_LANES],
    retailOrderingObservedLanes,
    retailOrderingObservedLanesSource: AURORA_SCENE_LIGHT_OBSERVED_LANES_SOURCE,
    retailOrderingMissingLanes,
    retailOrderingRuntimeProbeStatus: retailOrderingRuntimeProbe.status,
    retailOrderingRuntimeProbeProofSource: retailOrderingRuntimeProbe.proofSource,
    retailOrderingRuntimeProbeBlocker: retailOrderingRuntimeProbe.blocker,
    retailOrderingRuntimeProbeLocalOrderSource:
      retailOrderingRuntimeProbe.localOrderSource,
    retailOrderingRuntimeProbeRequiredLaneCoverageCount:
      retailOrderingRuntimeProbe.requiredLaneCoverageCount,
    retailOrderingRuntimeProbePointLightSampleCount:
      retailOrderingRuntimeProbe.pointLightSampleCount,
    retailOrderingRuntimeProbeNonPointRequestSampleCount:
      retailOrderingRuntimeProbe.nonPointRequestSampleCount,
    retailOrderingRuntimeProbeBudgetAcceptedLanes:
      retailOrderingRuntimeProbe.budgetAcceptedLanes,
    retailOrderingRuntimeProbeBudgetDroppedLanes:
      retailOrderingRuntimeProbe.budgetDroppedLanes,
    retailOrderingRuntimeProbeBudgetUnknownLanes:
      retailOrderingRuntimeProbe.budgetUnknownLanes,
    retailOrderingRuntimeProbeLocalOrderSamples:
      retailOrderingRuntimeProbe.localOrderSamples,
    retailOrderingPreviewBudgetPlanStatus: retailOrderingPreviewBudgetPlan.status,
    retailOrderingPreviewBudgetPlanStrategy: retailOrderingPreviewBudgetPlan.strategy,
    retailOrderingPreviewBudgetPlanProofSource:
      retailOrderingPreviewBudgetPlan.proofSource,
    retailOrderingPreviewBudgetPlanProofStatus:
      retailOrderingPreviewBudgetPlan.proofStatus,
    retailOrderingPreviewBudgetPlanBlocker: retailOrderingPreviewBudgetPlan.blocker,
    retailOrderingPreviewBudgetPlanAcceptedLanes:
      retailOrderingPreviewBudgetPlan.acceptedLanes,
    retailOrderingPreviewBudgetPlanDroppedLanes:
      retailOrderingPreviewBudgetPlan.droppedLanes,
    retailOrderingPreviewBudgetPlanSamples: retailOrderingPreviewBudgetPlan.samples,
    budgetMode: AURORA_SCENE_LIGHT_BUDGET_MODE,
    previewBudgetCapSource: AURORA_SCENE_LIGHT_ACTIVE_SLOT_CAP_SOURCE,
    previewBudgetCapProofStatus: AURORA_SCENE_LIGHT_BUDGET_CAP_PROOF_STATUS,
    pointLightCount,
    sourceBackedPointLightCount,
    laneCounts,
    lanes: Object.keys(laneCounts).sort(),
    previewBudgetCap: budget.cap,
    previewBudgetHardCap: AURORA_SCENE_LIGHT_PREVIEW_ACTIVE_SLOT_CAP,
    configuredMaxLights: budget.configuredMaxLights,
    previewBudgetAcceptedCount: Math.min(sourceBackedPointLightCount, budget.cap),
    previewBudgetDroppedCount: Math.max(0, sourceBackedPointLightCount - budget.cap),
    samples,
    nonPointLightRequestCount: nonPointLightRequestKeys.size,
    nonPointLightRequestLaneCounts,
    nonPointLightRequestLanes: Object.keys(nonPointLightRequestLaneCounts).sort(),
    nonPointLightRequestSamples,
    nonPointLightRequestSchedulerStatus: progFxType4Scheduler.status,
    nonPointLightRequestSchedulerProofSource: progFxType4Scheduler.proofSource,
    nonPointLightRequestSchedulerBlocker: progFxType4Scheduler.blocker,
    nonPointLightRequestSchedulerPriorityWinner: progFxType4Scheduler.priorityWinner,
    nonPointLightRequestSchedulerPriorityEvaluationOrderSource:
      progFxType4Scheduler.priorityEvaluationOrderSource,
    nonPointLightRequestSchedulerPriorityEvaluationOrder:
      progFxType4Scheduler.priorityEvaluationOrder,
    nonPointLightRequestSchedulerPriorityTiePolicyStatus:
      progFxType4Scheduler.priorityTiePolicyStatus,
    nonPointLightRequestSchedulerPriorityTopTieBlocked:
      progFxType4Scheduler.priorityTopTieBlocked,
    nonPointLightRequestSchedulerPriorityTopTieCandidateCount:
      progFxType4Scheduler.priorityTopTieCandidateCount,
    nonPointLightRequestSchedulerPriorityZeroPolicyStatus:
      progFxType4Scheduler.priorityZeroPolicyStatus,
    nonPointLightRequestSchedulerPriorityZeroRuntimeCaptureStatus:
      progFxType4Scheduler.priorityZeroRuntimeCaptureStatus,
    nonPointLightRequestSchedulerCanonicalParityStatus:
      progFxType4Scheduler.canonicalParityStatus,
    nonPointLightRequestSchedulerPriorityTieGroupCount:
      progFxType4Scheduler.priorityTieGroupCount,
    nonPointLightRequestSchedulerPriorityZeroAlwaysAppliesRequestCount:
      progFxType4Scheduler.priorityZeroAlwaysAppliesRequestCount,
    nonPointLightRequestSchedulerSceneAttachmentRequestCount:
      progFxType4Scheduler.sceneAttachmentRequestCount,
    nonPointLightRequestSchedulerProximitySuppressionCandidateCount:
      progFxType4Scheduler.proximitySuppressionCandidateCount,
    nonPointLightRequestSchedulerVisionRequestCount:
      progFxType4Scheduler.visionRequestCount,
    nonPointLightRequestSchedulerLightRequestCount:
      progFxType4Scheduler.lightRequestCount,
    nonPointLightRequestSchedulerWouldSuppressScenePointLights:
      progFxType4Scheduler.wouldSuppressScenePointLights,
    nonPointLightRequestSchedulerSamples: progFxType4Scheduler.samples,
    shadow: {
      proofStatus: AURORA_SCENE_SHADOW_DIAGNOSTIC_PROOF_STATUS,
      retailProjectionStatus: AURORA_SCENE_SHADOW_RETAIL_PROJECTION_STATUS,
      retailProjectionSource: AURORA_SCENE_SHADOW_RETAIL_PROJECTION_SOURCE,
      retailProjectionShaderNames: [
        ...AURORA_SCENE_SHADOW_RETAIL_PROJECTION_SHADER_NAMES
      ],
      retailProjectionLightProfileSource:
        AURORA_SCENE_SHADOW_RETAIL_PROJECTION_LIGHT_PROFILE_SOURCE,
      retailProjectionLightProfileStatus:
        AURORA_SCENE_SHADOW_RETAIL_PROJECTION_LIGHT_PROFILE_STATUS,
      retailProjectionGeometrySource:
        AURORA_SCENE_SHADOW_RETAIL_PROJECTION_GEOMETRY_SOURCE,
      retailProjectionGeometryStatus:
        AURORA_SCENE_SHADOW_RETAIL_PROJECTION_GEOMETRY_STATUS,
      retailProjectionRenderBuckets: [
        ...AURORA_SCENE_SHADOW_RETAIL_PROJECTION_RENDER_BUCKETS
      ],
      retailProjectionProofStatus:
        AURORA_SCENE_SHADOW_RETAIL_PROJECTION_PROOF_STATUS,
      retailProjectionBlocker: AURORA_SCENE_SHADOW_RETAIL_PROJECTION_BLOCKER,
      retailProjectionRuntimeProbeStatus: shadowVolumeRuntimeProbe.status,
      retailProjectionRuntimeProbeProofSource: shadowVolumeRuntimeProbe.proofSource,
      retailProjectionRuntimeProbeBlocker: shadowVolumeRuntimeProbe.blocker,
      retailProjectionRuntimeProbeLocalPixelProofStatus:
        shadowVolumeRuntimeProbe.localPixelProofStatus,
      retailProjectionRuntimeProbeActiveCasterCount:
        shadowVolumeRuntimeProbe.activeCasterCount,
      retailProjectionRuntimeProbeProjectionPreviewCount:
        shadowVolumeRuntimeProbe.projectionPreviewCount,
      retailProjectionRuntimeProbeStencilReceiverCount:
        shadowVolumeRuntimeProbe.stencilReceiverCount,
      retailProjectionRuntimeProbeStencilVolumePassCount:
        shadowVolumeRuntimeProbe.stencilVolumePassCount,
      retailProjectionRuntimeProbeExpectedStencilPasses:
        shadowVolumeRuntimeProbe.expectedStencilPasses,
      retailProjectionRuntimeProbeObservedStencilPasses:
        shadowVolumeRuntimeProbe.observedStencilPasses,
      retailProjectionRuntimeProbeRenderShaderNames:
        shadowVolumeRuntimeProbe.renderShaderNames,
      retailProjectionRuntimeProbeRenderBuckets: shadowVolumeRuntimeProbe.renderBuckets,
      retailProjectionRuntimeProbeSamples: shadowVolumeRuntimeProbe.samples,
      pointLightCastShadowCount,
      pointLightShadowSamples,
      itemPropertyLightShadowPolicyCount,
      itemPropertyLightShadowPolicySamples,
      directionalLightCastShadowCount,
      directionalLightShadowSamples,
      progFxType4ShadowRequestCount: progFxType4ShadowRequestKeys.size,
      progFxType4ShadowRequestSamples,
      fastShadowProxyCount,
      fastShadowDisabledCount,
      fastShadowSamples,
      ...areaShadow
    }
  };
}

export function writeAuroraScenePointLightDiagnostics(
  runtime: AuroraSceneLightDiagnosticsRuntime
): AuroraScenePointLightDiagnostics {
  applyAuroraSceneLightManagerPreviewBudget(runtime.scene);
  const diagnostics = resolveAuroraScenePointLightDiagnostics(runtime.scene);
  runtime.scene.userData.auroraScenePointLightProofStatus = diagnostics.proofStatus;
  runtime.scene.userData.auroraScenePointLightRetailOrderingStatus =
    diagnostics.retailOrderingStatus;
  runtime.scene.userData.auroraScenePointLightRetailOrderingProofSource =
    diagnostics.retailOrderingProofSource;
  runtime.scene.userData.auroraScenePointLightRetailOrderingProofStatus =
    diagnostics.retailOrderingProofStatus;
  runtime.scene.userData.auroraScenePointLightRetailOrderingManagerInternalInsertionSource =
    diagnostics.retailOrderingManagerInternalInsertionSource;
  runtime.scene.userData.auroraScenePointLightRetailOrderingManagerInternalInsertionProofStatus =
    diagnostics.retailOrderingManagerInternalInsertionProofStatus;
  runtime.scene.userData.auroraScenePointLightRetailOrderingManagerCrossLaneCallsiteBlocker =
    diagnostics.retailOrderingManagerCrossLaneCallsiteBlocker;
  runtime.scene.userData.auroraScenePointLightRetailOrderingSortScoreSource =
    diagnostics.retailOrderingSortScoreSource;
  runtime.scene.userData.auroraScenePointLightRetailOrderingSortScoreFormula =
    diagnostics.retailOrderingSortScoreFormula;
  runtime.scene.userData.auroraScenePointLightRetailOrderingSortDirection =
    diagnostics.retailOrderingSortDirection;
  runtime.scene.userData.auroraScenePointLightRetailOrderingSortScoreProofStatus =
    diagnostics.retailOrderingSortScoreProofStatus;
  runtime.scene.userData.auroraScenePointLightRetailOrderingCoverageStatus =
    diagnostics.retailOrderingCoverageStatus;
  runtime.scene.userData.auroraScenePointLightRetailOrderingRequiredLanes =
    diagnostics.retailOrderingRequiredLanes;
  runtime.scene.userData.auroraScenePointLightRetailOrderingObservedLanes =
    diagnostics.retailOrderingObservedLanes;
  runtime.scene.userData.auroraScenePointLightRetailOrderingObservedLanesSource =
    diagnostics.retailOrderingObservedLanesSource;
  runtime.scene.userData.auroraScenePointLightRetailOrderingMissingLanes =
    diagnostics.retailOrderingMissingLanes;
  runtime.scene.userData.auroraScenePointLightRetailOrderingRuntimeProbeStatus =
    diagnostics.retailOrderingRuntimeProbeStatus;
  runtime.scene.userData.auroraScenePointLightRetailOrderingRuntimeProbeProofSource =
    diagnostics.retailOrderingRuntimeProbeProofSource;
  runtime.scene.userData.auroraScenePointLightRetailOrderingRuntimeProbeBlocker =
    diagnostics.retailOrderingRuntimeProbeBlocker;
  runtime.scene.userData.auroraScenePointLightRetailOrderingRuntimeProbeLocalOrderSource =
    diagnostics.retailOrderingRuntimeProbeLocalOrderSource;
  runtime.scene.userData.auroraScenePointLightRetailOrderingRuntimeProbeRequiredLaneCoverageCount =
    diagnostics.retailOrderingRuntimeProbeRequiredLaneCoverageCount;
  runtime.scene.userData.auroraScenePointLightRetailOrderingRuntimeProbePointLightSampleCount =
    diagnostics.retailOrderingRuntimeProbePointLightSampleCount;
  runtime.scene.userData.auroraScenePointLightRetailOrderingRuntimeProbeNonPointRequestSampleCount =
    diagnostics.retailOrderingRuntimeProbeNonPointRequestSampleCount;
  runtime.scene.userData.auroraScenePointLightRetailOrderingRuntimeProbeBudgetAcceptedLanes =
    diagnostics.retailOrderingRuntimeProbeBudgetAcceptedLanes;
  runtime.scene.userData.auroraScenePointLightRetailOrderingRuntimeProbeBudgetDroppedLanes =
    diagnostics.retailOrderingRuntimeProbeBudgetDroppedLanes;
  runtime.scene.userData.auroraScenePointLightRetailOrderingRuntimeProbeBudgetUnknownLanes =
    diagnostics.retailOrderingRuntimeProbeBudgetUnknownLanes;
  runtime.scene.userData.auroraScenePointLightRetailOrderingRuntimeProbeLocalOrderSamples =
    diagnostics.retailOrderingRuntimeProbeLocalOrderSamples;
  runtime.scene.userData.auroraScenePointLightRetailOrderingPreviewBudgetPlanStatus =
    diagnostics.retailOrderingPreviewBudgetPlanStatus;
  runtime.scene.userData.auroraScenePointLightRetailOrderingPreviewBudgetPlanStrategy =
    diagnostics.retailOrderingPreviewBudgetPlanStrategy;
  runtime.scene.userData.auroraScenePointLightRetailOrderingPreviewBudgetPlanProofSource =
    diagnostics.retailOrderingPreviewBudgetPlanProofSource;
  runtime.scene.userData.auroraScenePointLightRetailOrderingPreviewBudgetPlanProofStatus =
    diagnostics.retailOrderingPreviewBudgetPlanProofStatus;
  runtime.scene.userData.auroraScenePointLightRetailOrderingPreviewBudgetPlanBlocker =
    diagnostics.retailOrderingPreviewBudgetPlanBlocker;
  runtime.scene.userData.auroraScenePointLightRetailOrderingPreviewBudgetPlanAcceptedLanes =
    diagnostics.retailOrderingPreviewBudgetPlanAcceptedLanes;
  runtime.scene.userData.auroraScenePointLightRetailOrderingPreviewBudgetPlanDroppedLanes =
    diagnostics.retailOrderingPreviewBudgetPlanDroppedLanes;
  runtime.scene.userData.auroraScenePointLightRetailOrderingPreviewBudgetPlanSamples =
    diagnostics.retailOrderingPreviewBudgetPlanSamples;
  runtime.scene.userData.auroraScenePointLightBudgetMode = diagnostics.budgetMode;
  runtime.scene.userData.auroraScenePointLightPreviewBudgetCapSource =
    diagnostics.previewBudgetCapSource;
  runtime.scene.userData.auroraScenePointLightPreviewBudgetCapProofStatus =
    diagnostics.previewBudgetCapProofStatus;
  runtime.scene.userData.auroraScenePointLightCount = diagnostics.pointLightCount;
  runtime.scene.userData.auroraSceneSourceBackedPointLightCount =
    diagnostics.sourceBackedPointLightCount;
  runtime.scene.userData.auroraScenePointLightLaneCounts = diagnostics.laneCounts;
  runtime.scene.userData.auroraScenePointLightLanes = diagnostics.lanes;
  runtime.scene.userData.auroraScenePointLightPreviewBudgetCap =
    diagnostics.previewBudgetCap;
  runtime.scene.userData.auroraScenePointLightPreviewBudgetHardCap =
    diagnostics.previewBudgetHardCap;
  runtime.scene.userData.auroraScenePointLightConfiguredMaxLights =
    diagnostics.configuredMaxLights;
  runtime.scene.userData.auroraScenePointLightPreviewBudgetAcceptedCount =
    diagnostics.previewBudgetAcceptedCount;
  runtime.scene.userData.auroraScenePointLightPreviewBudgetDroppedCount =
    diagnostics.previewBudgetDroppedCount;
  runtime.scene.userData.auroraScenePointLightSamples = diagnostics.samples;
  runtime.scene.userData.auroraSceneNonPointLightRequestCount =
    diagnostics.nonPointLightRequestCount;
  runtime.scene.userData.auroraSceneNonPointLightRequestLaneCounts =
    diagnostics.nonPointLightRequestLaneCounts;
  runtime.scene.userData.auroraSceneNonPointLightRequestLanes =
    diagnostics.nonPointLightRequestLanes;
  runtime.scene.userData.auroraSceneNonPointLightRequestSamples =
    diagnostics.nonPointLightRequestSamples;
  runtime.scene.userData.auroraSceneNonPointLightRequestSchedulerStatus =
    diagnostics.nonPointLightRequestSchedulerStatus;
  runtime.scene.userData.auroraSceneNonPointLightRequestSchedulerProofSource =
    diagnostics.nonPointLightRequestSchedulerProofSource;
  runtime.scene.userData.auroraSceneNonPointLightRequestSchedulerBlocker =
    diagnostics.nonPointLightRequestSchedulerBlocker;
  runtime.scene.userData.auroraSceneNonPointLightRequestSchedulerPriorityWinner =
    diagnostics.nonPointLightRequestSchedulerPriorityWinner;
  runtime.scene.userData.auroraSceneNonPointLightRequestSchedulerPriorityEvaluationOrderSource =
    diagnostics.nonPointLightRequestSchedulerPriorityEvaluationOrderSource;
  runtime.scene.userData.auroraSceneNonPointLightRequestSchedulerPriorityEvaluationOrder =
    diagnostics.nonPointLightRequestSchedulerPriorityEvaluationOrder;
  runtime.scene.userData.auroraSceneNonPointLightRequestSchedulerPriorityTiePolicyStatus =
    diagnostics.nonPointLightRequestSchedulerPriorityTiePolicyStatus;
  runtime.scene.userData.auroraSceneNonPointLightRequestSchedulerPriorityTopTieBlocked =
    diagnostics.nonPointLightRequestSchedulerPriorityTopTieBlocked;
  runtime.scene.userData.auroraSceneNonPointLightRequestSchedulerPriorityTopTieCandidateCount =
    diagnostics.nonPointLightRequestSchedulerPriorityTopTieCandidateCount;
  runtime.scene.userData.auroraSceneNonPointLightRequestSchedulerPriorityZeroPolicyStatus =
    diagnostics.nonPointLightRequestSchedulerPriorityZeroPolicyStatus;
  runtime.scene.userData.auroraSceneNonPointLightRequestSchedulerPriorityZeroRuntimeCaptureStatus =
    diagnostics.nonPointLightRequestSchedulerPriorityZeroRuntimeCaptureStatus;
  runtime.scene.userData.auroraSceneNonPointLightRequestSchedulerCanonicalParityStatus =
    diagnostics.nonPointLightRequestSchedulerCanonicalParityStatus;
  runtime.scene.userData.auroraSceneNonPointLightRequestSchedulerPriorityTieGroupCount =
    diagnostics.nonPointLightRequestSchedulerPriorityTieGroupCount;
  runtime.scene.userData.auroraSceneNonPointLightRequestSchedulerPriorityZeroAlwaysAppliesRequestCount =
    diagnostics.nonPointLightRequestSchedulerPriorityZeroAlwaysAppliesRequestCount;
  runtime.scene.userData.auroraSceneNonPointLightRequestSchedulerSceneAttachmentRequestCount =
    diagnostics.nonPointLightRequestSchedulerSceneAttachmentRequestCount;
  runtime.scene.userData.auroraSceneNonPointLightRequestSchedulerProximitySuppressionCandidateCount =
    diagnostics.nonPointLightRequestSchedulerProximitySuppressionCandidateCount;
  runtime.scene.userData.auroraSceneNonPointLightRequestSchedulerVisionRequestCount =
    diagnostics.nonPointLightRequestSchedulerVisionRequestCount;
  runtime.scene.userData.auroraSceneNonPointLightRequestSchedulerLightRequestCount =
    diagnostics.nonPointLightRequestSchedulerLightRequestCount;
  runtime.scene.userData.auroraSceneNonPointLightRequestSchedulerWouldSuppressScenePointLights =
    diagnostics.nonPointLightRequestSchedulerWouldSuppressScenePointLights;
  runtime.scene.userData.auroraSceneNonPointLightRequestSchedulerSamples =
    diagnostics.nonPointLightRequestSchedulerSamples;
  runtime.scene.userData.auroraSceneShadowProofStatus = diagnostics.shadow.proofStatus;
  runtime.scene.userData.auroraSceneShadowRetailProjectionStatus =
    diagnostics.shadow.retailProjectionStatus;
  runtime.scene.userData.auroraSceneShadowRetailProjectionSource =
    diagnostics.shadow.retailProjectionSource;
  runtime.scene.userData.auroraSceneShadowRetailProjectionShaderNames =
    diagnostics.shadow.retailProjectionShaderNames;
  runtime.scene.userData.auroraSceneShadowRetailProjectionLightProfileSource =
    diagnostics.shadow.retailProjectionLightProfileSource;
  runtime.scene.userData.auroraSceneShadowRetailProjectionLightProfileStatus =
    diagnostics.shadow.retailProjectionLightProfileStatus;
  runtime.scene.userData.auroraSceneShadowRetailProjectionGeometrySource =
    diagnostics.shadow.retailProjectionGeometrySource;
  runtime.scene.userData.auroraSceneShadowRetailProjectionGeometryStatus =
    diagnostics.shadow.retailProjectionGeometryStatus;
  runtime.scene.userData.auroraSceneShadowRetailProjectionRenderBuckets =
    diagnostics.shadow.retailProjectionRenderBuckets;
  runtime.scene.userData.auroraSceneShadowRetailProjectionProofStatus =
    diagnostics.shadow.retailProjectionProofStatus;
  runtime.scene.userData.auroraSceneShadowRetailProjectionBlocker =
    diagnostics.shadow.retailProjectionBlocker;
  runtime.scene.userData.auroraSceneShadowRetailProjectionRuntimeProbeStatus =
    diagnostics.shadow.retailProjectionRuntimeProbeStatus;
  runtime.scene.userData.auroraSceneShadowRetailProjectionRuntimeProbeProofSource =
    diagnostics.shadow.retailProjectionRuntimeProbeProofSource;
  runtime.scene.userData.auroraSceneShadowRetailProjectionRuntimeProbeBlocker =
    diagnostics.shadow.retailProjectionRuntimeProbeBlocker;
  runtime.scene.userData.auroraSceneShadowRetailProjectionRuntimeProbeLocalPixelProofStatus =
    diagnostics.shadow.retailProjectionRuntimeProbeLocalPixelProofStatus;
  runtime.scene.userData.auroraSceneShadowRetailProjectionRuntimeProbeActiveCasterCount =
    diagnostics.shadow.retailProjectionRuntimeProbeActiveCasterCount;
  runtime.scene.userData.auroraSceneShadowRetailProjectionRuntimeProbeProjectionPreviewCount =
    diagnostics.shadow.retailProjectionRuntimeProbeProjectionPreviewCount;
  runtime.scene.userData.auroraSceneShadowRetailProjectionRuntimeProbeStencilReceiverCount =
    diagnostics.shadow.retailProjectionRuntimeProbeStencilReceiverCount;
  runtime.scene.userData.auroraSceneShadowRetailProjectionRuntimeProbeStencilVolumePassCount =
    diagnostics.shadow.retailProjectionRuntimeProbeStencilVolumePassCount;
  runtime.scene.userData.auroraSceneShadowRetailProjectionRuntimeProbeExpectedStencilPasses =
    diagnostics.shadow.retailProjectionRuntimeProbeExpectedStencilPasses;
  runtime.scene.userData.auroraSceneShadowRetailProjectionRuntimeProbeObservedStencilPasses =
    diagnostics.shadow.retailProjectionRuntimeProbeObservedStencilPasses;
  runtime.scene.userData.auroraSceneShadowRetailProjectionRuntimeProbeRenderShaderNames =
    diagnostics.shadow.retailProjectionRuntimeProbeRenderShaderNames;
  runtime.scene.userData.auroraSceneShadowRetailProjectionRuntimeProbeRenderBuckets =
    diagnostics.shadow.retailProjectionRuntimeProbeRenderBuckets;
  runtime.scene.userData.auroraSceneShadowRetailProjectionRuntimeProbeSamples =
    diagnostics.shadow.retailProjectionRuntimeProbeSamples;
  runtime.scene.userData.auroraSceneShadowPointLightCastShadowCount =
    diagnostics.shadow.pointLightCastShadowCount;
  runtime.scene.userData.auroraSceneShadowPointLightSamples =
    diagnostics.shadow.pointLightShadowSamples;
  runtime.scene.userData.auroraSceneShadowItemPropertyLightShadowPolicyCount =
    diagnostics.shadow.itemPropertyLightShadowPolicyCount;
  runtime.scene.userData.auroraSceneShadowItemPropertyLightShadowPolicySamples =
    diagnostics.shadow.itemPropertyLightShadowPolicySamples;
  runtime.scene.userData.auroraSceneShadowDirectionalLightCastShadowCount =
    diagnostics.shadow.directionalLightCastShadowCount;
  runtime.scene.userData.auroraSceneShadowDirectionalLightSamples =
    diagnostics.shadow.directionalLightShadowSamples;
  runtime.scene.userData.auroraSceneShadowProgFxType4ShadowRequestCount =
    diagnostics.shadow.progFxType4ShadowRequestCount;
  runtime.scene.userData.auroraSceneShadowProgFxType4ShadowRequestSamples =
    diagnostics.shadow.progFxType4ShadowRequestSamples;
  runtime.scene.userData.auroraSceneShadowFastShadowProxyCount =
    diagnostics.shadow.fastShadowProxyCount;
  runtime.scene.userData.auroraSceneShadowFastShadowDisabledCount =
    diagnostics.shadow.fastShadowDisabledCount;
  runtime.scene.userData.auroraSceneShadowFastShadowSamples =
    diagnostics.shadow.fastShadowSamples;

  const dataset = runtime.container?.dataset;
  if (dataset) {
    dataset.scenePointLightProofStatus = diagnostics.proofStatus;
    dataset.scenePointLightRetailOrderingStatus = diagnostics.retailOrderingStatus;
    dataset.scenePointLightRetailOrderingProofSource =
      diagnostics.retailOrderingProofSource;
    dataset.scenePointLightRetailOrderingProofStatus =
      diagnostics.retailOrderingProofStatus;
    dataset.scenePointLightRetailOrderingManagerInternalInsertionSource =
      diagnostics.retailOrderingManagerInternalInsertionSource;
    dataset.scenePointLightRetailOrderingManagerInternalInsertionProofStatus =
      diagnostics.retailOrderingManagerInternalInsertionProofStatus;
    dataset.scenePointLightRetailOrderingManagerCrossLaneCallsiteBlocker =
      diagnostics.retailOrderingManagerCrossLaneCallsiteBlocker;
    dataset.scenePointLightRetailOrderingSortScoreSource =
      diagnostics.retailOrderingSortScoreSource;
    dataset.scenePointLightRetailOrderingSortScoreFormula =
      diagnostics.retailOrderingSortScoreFormula;
    dataset.scenePointLightRetailOrderingSortDirection =
      diagnostics.retailOrderingSortDirection;
    dataset.scenePointLightRetailOrderingSortScoreProofStatus =
      diagnostics.retailOrderingSortScoreProofStatus;
    dataset.scenePointLightRetailOrderingCoverageStatus =
      diagnostics.retailOrderingCoverageStatus;
    dataset.scenePointLightRetailOrderingRequiredLanes =
      diagnostics.retailOrderingRequiredLanes.join("|");
    dataset.scenePointLightRetailOrderingObservedLanes =
      diagnostics.retailOrderingObservedLanes.join("|");
    dataset.scenePointLightRetailOrderingObservedLanesSource =
      diagnostics.retailOrderingObservedLanesSource;
    dataset.scenePointLightRetailOrderingMissingLanes =
      diagnostics.retailOrderingMissingLanes.join("|");
    dataset.scenePointLightRetailOrderingRuntimeProbeStatus =
      diagnostics.retailOrderingRuntimeProbeStatus;
    dataset.scenePointLightRetailOrderingRuntimeProbeProofSource =
      diagnostics.retailOrderingRuntimeProbeProofSource;
    dataset.scenePointLightRetailOrderingRuntimeProbeBlocker =
      diagnostics.retailOrderingRuntimeProbeBlocker;
    dataset.scenePointLightRetailOrderingRuntimeProbeLocalOrderSource =
      diagnostics.retailOrderingRuntimeProbeLocalOrderSource;
    dataset.scenePointLightRetailOrderingRuntimeProbeRequiredLaneCoverageCount = String(
      diagnostics.retailOrderingRuntimeProbeRequiredLaneCoverageCount
    );
    dataset.scenePointLightRetailOrderingRuntimeProbePointLightSampleCount = String(
      diagnostics.retailOrderingRuntimeProbePointLightSampleCount
    );
    dataset.scenePointLightRetailOrderingRuntimeProbeNonPointRequestSampleCount = String(
      diagnostics.retailOrderingRuntimeProbeNonPointRequestSampleCount
    );
    dataset.scenePointLightRetailOrderingRuntimeProbeBudgetAcceptedLanes =
      diagnostics.retailOrderingRuntimeProbeBudgetAcceptedLanes.join("|");
    dataset.scenePointLightRetailOrderingRuntimeProbeBudgetDroppedLanes =
      diagnostics.retailOrderingRuntimeProbeBudgetDroppedLanes.join("|");
    dataset.scenePointLightRetailOrderingRuntimeProbeBudgetUnknownLanes =
      diagnostics.retailOrderingRuntimeProbeBudgetUnknownLanes.join("|");
    dataset.scenePointLightRetailOrderingRuntimeProbeLocalOrderSamples =
      diagnostics.retailOrderingRuntimeProbeLocalOrderSamples.join("|");
    dataset.scenePointLightRetailOrderingPreviewBudgetPlanStatus =
      diagnostics.retailOrderingPreviewBudgetPlanStatus;
    dataset.scenePointLightRetailOrderingPreviewBudgetPlanStrategy =
      diagnostics.retailOrderingPreviewBudgetPlanStrategy;
    dataset.scenePointLightRetailOrderingPreviewBudgetPlanProofSource =
      diagnostics.retailOrderingPreviewBudgetPlanProofSource;
    dataset.scenePointLightRetailOrderingPreviewBudgetPlanProofStatus =
      diagnostics.retailOrderingPreviewBudgetPlanProofStatus;
    dataset.scenePointLightRetailOrderingPreviewBudgetPlanBlocker =
      diagnostics.retailOrderingPreviewBudgetPlanBlocker;
    dataset.scenePointLightRetailOrderingPreviewBudgetPlanAcceptedLanes =
      diagnostics.retailOrderingPreviewBudgetPlanAcceptedLanes.join("|");
    dataset.scenePointLightRetailOrderingPreviewBudgetPlanDroppedLanes =
      diagnostics.retailOrderingPreviewBudgetPlanDroppedLanes.join("|");
    dataset.scenePointLightRetailOrderingPreviewBudgetPlanSamples =
      diagnostics.retailOrderingPreviewBudgetPlanSamples.join("|");
    dataset.scenePointLightBudgetMode = diagnostics.budgetMode;
    dataset.scenePointLightPreviewBudgetCapSource = diagnostics.previewBudgetCapSource;
    dataset.scenePointLightPreviewBudgetCapProofStatus =
      diagnostics.previewBudgetCapProofStatus;
    dataset.scenePointLightCount = String(diagnostics.pointLightCount);
    dataset.sceneSourceBackedPointLightCount = String(
      diagnostics.sourceBackedPointLightCount
    );
    dataset.scenePointLightLaneCounts = JSON.stringify(diagnostics.laneCounts);
    dataset.scenePointLightLanes = diagnostics.lanes.join("|");
    dataset.scenePointLightPreviewBudgetCap = String(diagnostics.previewBudgetCap);
    dataset.scenePointLightPreviewBudgetHardCap = String(
      diagnostics.previewBudgetHardCap
    );
    dataset.scenePointLightConfiguredMaxLights =
      diagnostics.configuredMaxLights === null
        ? ""
        : String(diagnostics.configuredMaxLights);
    dataset.scenePointLightPreviewBudgetAcceptedCount = String(
      diagnostics.previewBudgetAcceptedCount
    );
    dataset.scenePointLightPreviewBudgetDroppedCount = String(
      diagnostics.previewBudgetDroppedCount
    );
    dataset.scenePointLightSamples = diagnostics.samples.join("|");
    dataset.sceneNonPointLightRequestCount = String(diagnostics.nonPointLightRequestCount);
    dataset.sceneNonPointLightRequestLaneCounts = JSON.stringify(
      diagnostics.nonPointLightRequestLaneCounts
    );
    dataset.sceneNonPointLightRequestLanes =
      diagnostics.nonPointLightRequestLanes.join("|");
    dataset.sceneNonPointLightRequestSamples =
      diagnostics.nonPointLightRequestSamples.join("|");
    dataset.sceneNonPointLightRequestSchedulerStatus =
      diagnostics.nonPointLightRequestSchedulerStatus;
    dataset.sceneNonPointLightRequestSchedulerProofSource =
      diagnostics.nonPointLightRequestSchedulerProofSource;
    dataset.sceneNonPointLightRequestSchedulerBlocker =
      diagnostics.nonPointLightRequestSchedulerBlocker;
    dataset.sceneNonPointLightRequestSchedulerPriorityWinner =
      diagnostics.nonPointLightRequestSchedulerPriorityWinner;
    dataset.sceneNonPointLightRequestSchedulerPriorityEvaluationOrderSource =
      diagnostics.nonPointLightRequestSchedulerPriorityEvaluationOrderSource;
    dataset.sceneNonPointLightRequestSchedulerPriorityEvaluationOrder =
      diagnostics.nonPointLightRequestSchedulerPriorityEvaluationOrder.join("|");
    dataset.sceneNonPointLightRequestSchedulerPriorityTiePolicyStatus =
      diagnostics.nonPointLightRequestSchedulerPriorityTiePolicyStatus;
    dataset.sceneNonPointLightRequestSchedulerPriorityTopTieBlocked = String(
      diagnostics.nonPointLightRequestSchedulerPriorityTopTieBlocked
    );
    dataset.sceneNonPointLightRequestSchedulerPriorityTopTieCandidateCount = String(
      diagnostics.nonPointLightRequestSchedulerPriorityTopTieCandidateCount
    );
    dataset.sceneNonPointLightRequestSchedulerPriorityZeroPolicyStatus =
      diagnostics.nonPointLightRequestSchedulerPriorityZeroPolicyStatus;
    dataset.sceneNonPointLightRequestSchedulerPriorityZeroRuntimeCaptureStatus =
      diagnostics.nonPointLightRequestSchedulerPriorityZeroRuntimeCaptureStatus;
    dataset.sceneNonPointLightRequestSchedulerCanonicalParityStatus =
      diagnostics.nonPointLightRequestSchedulerCanonicalParityStatus;
    dataset.sceneNonPointLightRequestSchedulerPriorityTieGroupCount = String(
      diagnostics.nonPointLightRequestSchedulerPriorityTieGroupCount
    );
    dataset.sceneNonPointLightRequestSchedulerPriorityZeroAlwaysAppliesRequestCount = String(
      diagnostics.nonPointLightRequestSchedulerPriorityZeroAlwaysAppliesRequestCount
    );
    dataset.sceneNonPointLightRequestSchedulerSceneAttachmentRequestCount = String(
      diagnostics.nonPointLightRequestSchedulerSceneAttachmentRequestCount
    );
    dataset.sceneNonPointLightRequestSchedulerProximitySuppressionCandidateCount = String(
      diagnostics.nonPointLightRequestSchedulerProximitySuppressionCandidateCount
    );
    dataset.sceneNonPointLightRequestSchedulerVisionRequestCount = String(
      diagnostics.nonPointLightRequestSchedulerVisionRequestCount
    );
    dataset.sceneNonPointLightRequestSchedulerLightRequestCount = String(
      diagnostics.nonPointLightRequestSchedulerLightRequestCount
    );
    dataset.sceneNonPointLightRequestSchedulerWouldSuppressScenePointLights = String(
      diagnostics.nonPointLightRequestSchedulerWouldSuppressScenePointLights
    );
    dataset.sceneNonPointLightRequestSchedulerSamples =
      diagnostics.nonPointLightRequestSchedulerSamples.join("|");
    dataset.sceneShadowProofStatus = diagnostics.shadow.proofStatus;
    dataset.sceneShadowRetailProjectionStatus = diagnostics.shadow.retailProjectionStatus;
    dataset.sceneShadowRetailProjectionSource =
      diagnostics.shadow.retailProjectionSource;
    dataset.sceneShadowRetailProjectionShaderNames =
      diagnostics.shadow.retailProjectionShaderNames.join("|");
    dataset.sceneShadowRetailProjectionLightProfileSource =
      diagnostics.shadow.retailProjectionLightProfileSource;
    dataset.sceneShadowRetailProjectionLightProfileStatus =
      diagnostics.shadow.retailProjectionLightProfileStatus;
    dataset.sceneShadowRetailProjectionGeometrySource =
      diagnostics.shadow.retailProjectionGeometrySource;
    dataset.sceneShadowRetailProjectionGeometryStatus =
      diagnostics.shadow.retailProjectionGeometryStatus;
    dataset.sceneShadowRetailProjectionRenderBuckets =
      diagnostics.shadow.retailProjectionRenderBuckets.join("|");
    dataset.sceneShadowRetailProjectionProofStatus =
      diagnostics.shadow.retailProjectionProofStatus;
    dataset.sceneShadowRetailProjectionBlocker =
      diagnostics.shadow.retailProjectionBlocker;
    dataset.sceneShadowRetailProjectionRuntimeProbeStatus =
      diagnostics.shadow.retailProjectionRuntimeProbeStatus;
    dataset.sceneShadowRetailProjectionRuntimeProbeProofSource =
      diagnostics.shadow.retailProjectionRuntimeProbeProofSource;
    dataset.sceneShadowRetailProjectionRuntimeProbeBlocker =
      diagnostics.shadow.retailProjectionRuntimeProbeBlocker;
    dataset.sceneShadowRetailProjectionRuntimeProbeLocalPixelProofStatus =
      diagnostics.shadow.retailProjectionRuntimeProbeLocalPixelProofStatus;
    dataset.sceneShadowRetailProjectionRuntimeProbeActiveCasterCount = String(
      diagnostics.shadow.retailProjectionRuntimeProbeActiveCasterCount
    );
    dataset.sceneShadowRetailProjectionRuntimeProbeProjectionPreviewCount = String(
      diagnostics.shadow.retailProjectionRuntimeProbeProjectionPreviewCount
    );
    dataset.sceneShadowRetailProjectionRuntimeProbeStencilReceiverCount = String(
      diagnostics.shadow.retailProjectionRuntimeProbeStencilReceiverCount
    );
    dataset.sceneShadowRetailProjectionRuntimeProbeStencilVolumePassCount = String(
      diagnostics.shadow.retailProjectionRuntimeProbeStencilVolumePassCount
    );
    dataset.sceneShadowRetailProjectionRuntimeProbeExpectedStencilPasses =
      diagnostics.shadow.retailProjectionRuntimeProbeExpectedStencilPasses.join("|");
    dataset.sceneShadowRetailProjectionRuntimeProbeObservedStencilPasses =
      diagnostics.shadow.retailProjectionRuntimeProbeObservedStencilPasses.join("|");
    dataset.sceneShadowRetailProjectionRuntimeProbeRenderShaderNames =
      diagnostics.shadow.retailProjectionRuntimeProbeRenderShaderNames.join("|");
    dataset.sceneShadowRetailProjectionRuntimeProbeRenderBuckets =
      diagnostics.shadow.retailProjectionRuntimeProbeRenderBuckets.join("|");
    dataset.sceneShadowRetailProjectionRuntimeProbeSamples =
      diagnostics.shadow.retailProjectionRuntimeProbeSamples.join("|");
    dataset.sceneShadowPointLightCastShadowCount = String(
      diagnostics.shadow.pointLightCastShadowCount
    );
    dataset.sceneShadowPointLightSamples =
      diagnostics.shadow.pointLightShadowSamples.join("|");
    dataset.sceneShadowItemPropertyLightShadowPolicyCount = String(
      diagnostics.shadow.itemPropertyLightShadowPolicyCount
    );
    dataset.sceneShadowItemPropertyLightShadowPolicySamples =
      diagnostics.shadow.itemPropertyLightShadowPolicySamples.join("|");
    dataset.sceneShadowDirectionalLightCastShadowCount = String(
      diagnostics.shadow.directionalLightCastShadowCount
    );
    dataset.sceneShadowDirectionalLightSamples =
      diagnostics.shadow.directionalLightShadowSamples.join("|");
    dataset.sceneShadowProgFxType4ShadowRequestCount = String(
      diagnostics.shadow.progFxType4ShadowRequestCount
    );
    dataset.sceneShadowProgFxType4ShadowRequestSamples =
      diagnostics.shadow.progFxType4ShadowRequestSamples.join("|");
    dataset.sceneShadowFastShadowProxyCount = String(diagnostics.shadow.fastShadowProxyCount);
    dataset.sceneShadowFastShadowDisabledCount = String(
      diagnostics.shadow.fastShadowDisabledCount
    );
    dataset.sceneShadowFastShadowSamples = diagnostics.shadow.fastShadowSamples.join("|");
    dataset.sceneShadowAreaStatus = diagnostics.shadow.areaShadowStatus;
    dataset.sceneShadowAreaSourceField = diagnostics.shadow.areaShadowSourceField;
    dataset.sceneShadowAreaStatusSource = diagnostics.shadow.areaShadowStatusSource;
    dataset.sceneShadowAreaOpacity =
      diagnostics.shadow.areaShadowOpacity === null
        ? ""
        : String(diagnostics.shadow.areaShadowOpacity);
    dataset.sceneShadowAreaOpacitySource = diagnostics.shadow.areaShadowOpacitySource;
    dataset.sceneShadowAreaOpacityFactor =
      diagnostics.shadow.areaShadowOpacityFactor === null
        ? ""
        : String(diagnostics.shadow.areaShadowOpacityFactor);
    dataset.sceneShadowAreaOpacityFactorSource =
      diagnostics.shadow.areaShadowOpacityFactorSource;
  }

  return diagnostics;
}
