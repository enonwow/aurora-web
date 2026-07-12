import * as THREE from "three";

export type AuroraShadowVolumeVec3 = readonly [number, number, number];
export type AuroraShadowVolumeCasterEdge = readonly [number, number];
export type AuroraShadowVolumeStencilFacePass = "front" | "back";
export type AuroraShadowVolumeStencilDepthPass = "zpass" | "zfail";

export interface AuroraShadowVolumeRetailStencilTableEntry {
  readonly slot: number;
  readonly label: string;
  readonly glConstant: string;
}

export interface AuroraShadowVolumeRetailStencilOpSequenceEntry {
  readonly phase: AuroraShadowVolumeStencilDepthPass;
  readonly runtimePass: `${AuroraShadowVolumeStencilFacePass}:${AuroraShadowVolumeStencilDepthPass}`;
  readonly call: string;
  readonly faceSlot: number;
  readonly failSlot: number;
  readonly zFailSlot: number;
  readonly zPassSlot: number;
}

export const AURORA_SHADOW_VOLUME_VERTEX_RECORD_FLOATS = 4 as const;
export const AURORA_SHADOW_VOLUME_RECORDS_PER_SOURCE_VERTEX = 2 as const;
export const AURORA_SHADOW_VOLUME_INDICES_PER_CASTER_EDGE = 6 as const;
export const AURORA_SHADOW_VOLUME_MAX_CASTER_EDGE_COUNT = 0x2aaa as const;
export const AURORA_SHADOW_VOLUME_CASTER_GEOMETRY_HELPER_STATUS =
  "source-backed-shadowvol-caster-buffer-schema-helper-ported-active-renderer-blocked";
export const AURORA_SHADOW_VOLUME_CASTER_THREE_GEOMETRY_HELPER_STATUS =
  "source-backed-shadowvol-caster-buffer-three-geometry-helper-ported-active-renderer-blocked";
export const AURORA_SHADOW_VOLUME_CASTER_THREE_GEOMETRY_ACTIVE_STATUS =
  "source-backed-shadowvol-caster-buffer-three-geometry-helper-ported-active-stencil-lane";
export const AURORA_SHADOW_VOLUME_CASTER_GEOMETRY_HELPER_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:888319-888403 writes paired vertex records with w=1 then w=0 and emits six indices per caster edge, alternating orientation through local_61";
export const AURORA_SHADOW_VOLUME_CASTER_THREE_GEOMETRY_HELPER_SOURCE =
  `${AURORA_SHADOW_VOLUME_CASTER_GEOMETRY_HELPER_SOURCE}; Three helper stores xyz as position and the retail homogeneous w record as auroraShadowVolumeW`;
export const AURORA_SHADOW_VOLUME_RENDER_SHADER_NAMES = [
  "vs_shadowvol",
  "fs_shadowvol"
] as const;
export const AURORA_SHADOW_VOLUME_RENDER_BUCKETS = [
  "0xd",
  "0xe",
  "0xb",
  "0xc"
] as const;
export const AURORA_SHADOW_VOLUME_RENDER_BUCKET_PHASES = [
  "case=local_29_false;condition=current-light-branch-not-active;sequence=0xd:zpass->0xe:zfail",
  "case=local_29_true;condition=param_1+0x34==DAT_00cc4350 and differs from scene +0x108/+0x68;sequence=0xd:zpass->0xb:zpass->0xe:zfail->0xc:zfail"
] as const;
export const AURORA_SHADOW_VOLUME_RENDER_PATH_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:913914-914017 FUN_00a878f8 loads vs_shadowvol/fs_shadowvol, configures shadow-volume state, walks branch-dependent scene render buckets (local_29=false: 0xd -> 0xe; local_29=true: 0xd -> 0xb -> 0xe -> 0xc), draws caster geometry, and clears the per-caster shadow counter";
export const AURORA_SHADOW_VOLUME_RENDER_BUCKET_PHASE_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:913922-913928 computes local_29 from the active light pointer branch; 913986-913988 starts 0xd under z-pass stencil ops; 914021-914043 selects 0xb/0xe/0xc by local_29 and switches to z-fail ops at 914032-914033";
export const AURORA_SHADOW_VOLUME_RENDER_BUCKET_PHASE_PROOF_STATUS =
  "source-backed-shadowvol-branch-aware-bucket-op-ordering-retail-pixel-parity-blocked";
export const AURORA_SHADOW_VOLUME_RENDER_STATE_CALL_SEQUENCE = [
  "pre=FUN_00a7818c(3);role=state-slot-3-disable-or-cache-before-shadow-volume-loop",
  "lazyBegin=FUN_00a780f0();role=first-caster-state-begin-guarded-by-local_69",
  "perCaster=FUN_00a785d4(light-matrix-pointer);role=upload-caster-transform-before-shader",
  "perCaster=FUN_00a788b0(DAT_00d0247c);role=bind-vs_shadowvol-fs_shadowvol-program",
  "perCaster=FUN_00a78994(0);role=upload-shadowvol-uniform-slot-0",
  "perCaster=FUN_00a78980(1,fVar2);role=upload-shadowvol-uniform-slot-1-depth-or-bias-candidate",
  "draw=FUN_00a78128(buffer0x58,buffer0x5c,4,count0x64,buffer0x68);role=draw-wrapper-to-FUN_00a75e3c",
  "lazyEnd=FUN_00a780e8();role=end-first-caster-state-block-when-local_69-set",
  "post=FUN_00a7816c(3);role=state-slot-3-restore-or-enable-after-shadow-volume-loop"
] as const;
export const AURORA_SHADOW_VOLUME_RENDER_STATE_CALL_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:913929 calls FUN_00a7818c(3) before shadow-volume traversal; 913995-914015 lazily enters FUN_00a780f0, uploads caster transform with FUN_00a785d4, binds shader DAT_00d0247c through FUN_00a788b0, uploads slots through FUN_00a78994(0) and FUN_00a78980(1,fVar2), and draws through FUN_00a78128; 914024-914027 calls FUN_00a780e8 then FUN_00a7816c(3) on exit; 904063-904075 wraps FUN_00a780e8/FUN_00a780f0; 904126-904147 wraps FUN_00a7816c/FUN_00a7818c";
export const AURORA_SHADOW_VOLUME_RENDER_STATE_CALL_PROOF_STATUS =
  "source-backed-shadowvol-render-state-wrapper-call-sequence-slot3-gl-cull-face-exposed-wrapped-state-factor-parity-blocked";
export const AURORA_SHADOW_VOLUME_SHADER_UNIFORM_SEMANTICS = [
  "transform=FUN_00a785d4(light-matrix-pointer)->FUN_00a6dda4()->FUN_00a482a8(0xe320d0,param_1);counter=DAT_00e34710",
  "shaderBind=FUN_00a788b0(DAT_00d0247c)->FUN_00a74fd0;nonzeroProgramStored=DAT_00cff754",
  "uniformSlot0=FUN_00a78994(0)->FUN_00a7278c;vec4Words=DAT_00cff71c+slot*0x10",
  "uniformSlot1=FUN_00a78980(1,fVar2)->FUN_00a72764;scalar=DAT_00e346b4+slot*4"
] as const;
export const AURORA_SHADOW_VOLUME_SHADER_UNIFORM_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:913999 calls FUN_00a785d4 with caster matrix pointer, 914001 binds DAT_00d0247c through FUN_00a788b0, 914002 uploads uniform slot 0 through FUN_00a78994(0), and 914012 uploads scalar slot 1 through FUN_00a78980(1,fVar2); 904560-904969 wraps FUN_00a785d4->FUN_00a6dda4, FUN_00a788b0->FUN_00a74fd0, FUN_00a78994->FUN_00a7278c, and FUN_00a78980->FUN_00a72764; 897399-897403 FUN_00a6dda4 copies through FUN_00a482a8(0xe320d0,param_1) and increments DAT_00e34710; 902170-902176 FUN_00a74fd0 stores a nonzero shader program in DAT_00cff754; 900870-900884 FUN_00a7278c copies four words into DAT_00cff71c+slot*0x10; 900852-900857 FUN_00a72764 writes scalar slot data into DAT_00e346b4+slot*4";
export const AURORA_SHADOW_VOLUME_SHADER_UNIFORM_PROOF_STATUS =
  "source-backed-shadowvol-shader-bind-transform-and-uniform-slot-writes-exposed-retail-pixel-parity-blocked";
export const AURORA_SHADOW_VOLUME_RENDER_STATE_WRAPPER_SEMANTICS = [
  "slot3=FUN_00a7818c(3)->FUN_00a6f0bc(3)->glDisable(GL_CULL_FACE/0x0b44);stateBit=_DAT_00d01c0c bit3 cleared",
  "slot3Restore=FUN_00a7816c(3)->FUN_00a6ef90(3)->glEnable(GL_CULL_FACE/0x0b44);stateBit=_DAT_00d01c0c bit3 set",
  "stateStack=FUN_00a780f0()->FUN_00a6c520 pushes or allocates a 0x40-byte render-state block",
  "stateRestore=FUN_00a780e8()->FUN_00a6c44c copies previous 0x40-byte block and pops/restores it",
  "stencilCache=FUN_00a6f2b4 caches front slots DAT_00ccb008..00c and back slots DAT_00ccb014..01c before PTR_DAT_00d3dd6c glStencilOpSeparate dispatch"
] as const;
export const AURORA_SHADOW_VOLUME_RENDER_STATE_WRAPPER_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:898307-898358 FUN_00a6ef90 enables cached render-state slots and slot 3 calls glEnable; 898365-898416 FUN_00a6f0bc disables cached slots and slot 3 calls glDisable; C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe x86 jump tables 0xa6efc4/0xa6f0f2 map case 3 to push 0x0b44 before glEnable/glDisable, i.e. GL_CULL_FACE; C:/Projects/New Folder/export/decompiled_all.c:896387-896475 FUN_00a6c44c/FUN_00a6c520 copy and push/pop 0x40-byte render-state blocks; 898458-898510 FUN_00a6f2b4 cache-checks front/back stencil op slots before dispatching PTR_DAT_00d3dd6c";
export const AURORA_SHADOW_VOLUME_RENDER_STATE_WRAPPER_PROOF_STATUS =
  "source-backed-shadowvol-render-state-slot3-gl-cull-face-stack-and-stencil-cache-exposed-other-state-parity-blocked";
export const AURORA_SHADOW_VOLUME_BLEND_DEPTH_COLOR_MASK_WRAPPERS = [
  "blendFunc=FUN_00a6f1ec()->glBlendFunc",
  "blendFuncFacade=FUN_00a7819c()->FUN_00a6f1ec()->glBlendFunc",
  "colorMask=FUN_00a6f3bc(r,g,b,a)->glColorMask;cache=DAT_00ccb044",
  "colorMaskFacade=FUN_00a78384(r,g,b,a)->FUN_00a6f3bc(r,g,b,a)->glColorMask",
  "depthMask=FUN_00a6f4f8(flag)->glDepthMask;cache=DAT_00ccb04c",
  "depthMaskFacade=FUN_00a785bc(flag)->FUN_00a6f4f8(flag)->glDepthMask",
  "depthFunc=FUN_00a6f518()->glDepthFunc",
  "depthFuncFacade=FUN_00a78724()->FUN_00a6f518()->glDepthFunc"
] as const;
export const AURORA_SHADOW_VOLUME_BLEND_DEPTH_COLOR_MASK_WRAPPER_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:898421-898425 maps FUN_00a6f1ec to glBlendFunc; 898533-898563 maps FUN_00a6f3bc to glColorMask with DAT_00ccb044 cache; 898618-898624 maps FUN_00a6f4f8 to glDepthMask with DAT_00ccb04c cache; 898630-898634 maps FUN_00a6f518 to glDepthFunc; 904153-904157 maps facade FUN_00a7819c to FUN_00a6f1ec; 904335-904339 maps facade FUN_00a78384 to FUN_00a6f3bc; 904542-904546 maps facade FUN_00a785bc to FUN_00a6f4f8; 904686-904690 maps facade FUN_00a78724 to FUN_00a6f518";
export const AURORA_SHADOW_VOLUME_BLEND_DEPTH_COLOR_MASK_WRAPPER_PROOF_STATUS =
  "source-backed-render-state-blend-depth-color-mask-wrappers-mapped-shadowvol-local-caller-not-using";
export const AURORA_SHADOW_VOLUME_IMMEDIATE_CALLER_BUFFER_FLUSH_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:888188-888213 calls FUN_00a878f8(DAT_00d0233c) only when the shadow caster buffer capacity is below local_58, then updates light buffer fields +0x68/+100 and allocates local_30*6 indices";
export const AURORA_SHADOW_VOLUME_IMMEDIATE_CALLER_BUFFER_FLUSH_BLOCKER =
  "FUN_00a878f8 immediate caller window 888188-888213 is source-backed as a caster-buffer flush/capacity path and contains no blend/depth/color-mask wrapper call; broader inherited render-state parity remains unproven";
export const AURORA_SHADOW_VOLUME_IMMEDIATE_CALLER_BUFFER_FLUSH_PROOF_STATUS =
  "source-backed-shadowvol-immediate-caller-buffer-flush-no-blend-depth-color-mask-state-wrapper";
export const AURORA_SHADOW_VOLUME_DIRECT_CALLER_BUFFER_BUILDER_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:888069-888414 FUN_00a5fdb4 is the direct caller/buffer builder for FUN_00a878f8; it computes caster edges, triggers FUN_00a878f8(DAT_00d0233c) at 888209, allocates/maps buffers through FUN_00a69868/FUN_00a6a370/FUN_00a6a6a4/FUN_00a6a6dc, transforms vertices through FUN_00b2f49c, writes paired w=1/w=0 records, fills six indices per edge, and finalizes through FUN_00a6a798/FUN_00a6a754";
export const AURORA_SHADOW_VOLUME_DIRECT_CALLER_BUFFER_BUILDER_BLOCKER =
  "FUN_00a5fdb4 direct caller/buffer-builder window 888069-888414 is source-backed and contains no blend/depth/color-mask raw or facade wrapper call; inherited render-state parity must be proven from a higher scene render path or retail oracle";
export const AURORA_SHADOW_VOLUME_DIRECT_CALLER_BUFFER_BUILDER_PROOF_STATUS =
  "source-backed-shadowvol-direct-caller-buffer-builder-no-blend-depth-color-mask-state-wrapper";
export const AURORA_SHADOW_VOLUME_ACTIVE_LIGHT_RENDER_ENVELOPE_STATE = [
  "activeLightGlobal=DAT_00d0233c=param_1",
  "depthFuncFacade=FUN_00a78724()->FUN_00a6f518()->glDepthFunc",
  "blendFuncFacade=FUN_00a7819c()->FUN_00a6f1ec()->glBlendFunc",
  "vtableDispatch=param_1+0xc+0x138",
  "vtableDispatch=param_1+0xc+0x108",
  "restoreSlots=FUN_00a7816c(0/1/4/5)"
] as const;
export const AURORA_SHADOW_VOLUME_ACTIVE_LIGHT_RENDER_ENVELOPE_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:910553-910663 FUN_00a82464 creates the active-light render envelope: 910600 sets DAT_00d0233c=param_1, 910638-910642 exposes FUN_00a7816c(1), FUN_00a78724, FUN_00a7816c(0), and FUN_00a7819c before vtable +0x138 dispatch, 910643 and 910661 clear DAT_00d0233c, and 910657-910663 runs FUN_00a78a04/FUN_00a7dda0 plus vtable +0x108 dispatch before restoring slots 4/5";
export const AURORA_SHADOW_VOLUME_ACTIVE_LIGHT_RENDER_ENVELOPE_BLOCKER =
  "FUN_00a82464 active-light render envelope is source-backed and shows depthFunc/blendFunc facade calls plus +0x138/+0x108 vtable dispatch, but contains no color/depth-mask wrapper call; exact inherited render state through the indirect scene render target and retail pixels remain blocked";
export const AURORA_SHADOW_VOLUME_ACTIVE_LIGHT_RENDER_ENVELOPE_PROOF_STATUS =
  "source-backed-shadowvol-active-light-render-envelope-vtable-dispatch-blend-depthfunc-wrapper-exposed-parity-blocked";
export const AURORA_SHADOW_VOLUME_LOCAL_DRAW_STATE_ORDER = [
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
] as const;
export const AURORA_SHADOW_VOLUME_LOCAL_DRAW_STATE_ORDER_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:913929 disables render-state slot 3; 913986-913987 sets z-pass front/back stencil ops; 913996 pushes state; 913999 uploads the shadow-light transform; 914001 binds DAT_00d0247c; 914002/914012 upload uniform slots 0/1; 914014 draws through FUN_00a78128; 914025 pops state; 914027 restores slot 3; 914032-914033 switches to z-fail front/back stencil ops; backend audit found localBlendDepthColorMaskCallHits=[] in 913929-914033, immediate caller blendDepthColorMaskCallHits=[] in 888188-888213, direct caller/buffer-builder blendDepthColorMaskCallHits=[] in 888069-888414, and active-light render envelope colorDepthMaskCallHits=[] in 910553-910663";
export const AURORA_SHADOW_VOLUME_LOCAL_DRAW_STATE_ORDER_BLOCKER =
  "FUN_00a878f8 local shadow-volume draw order is source-backed; the immediate caller, full FUN_00a5fdb4 direct caller/buffer-builder, and FUN_00a82464 active-light render envelope have no color/depth-mask wrapper calls beyond exposed blend/depthFunc facades; indirect vtable inherited render-state and retail pixel parity remain blocked";
export const AURORA_SHADOW_VOLUME_LOCAL_DRAW_STATE_ORDER_PROOF_STATUS =
  "source-backed-shadowvol-local-draw-state-order-exposed-outer-blend-depth-color-mask-parity-blocked";
export const AURORA_SHADOW_VOLUME_DRAW_WRAPPER_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:904108-904112 FUN_00a78128 wraps FUN_00a75e3c; 902867-902912 FUN_00a75e3c binds buffers and dispatches through PTR_DAT_00d3dda8 or glDrawArrays";
export const AURORA_SHADOW_VOLUME_LIGHT_PROFILE_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:913930-913955 uses radius +0x58, shadowradius +0x60 when positive, and verticaldisplacement +0x64 for the point-light shadow-volume profile";
export const AURORA_SHADOW_VOLUME_RENDER_PATH_PROOF_STATUS =
  "source-backed-shadowvol-shader-buckets-draw-wrapper-caster-reset-stencil-parity-blocked";
export const AURORA_SHADOW_VOLUME_PROJECTION_PREVIEW_STATUS =
  "source-backed-shadowvol-w-pair-extrusion-preview-active-stencil-parity-blocked";
export const AURORA_SHADOW_VOLUME_PROJECTION_PREVIEW_RENDERER_MODE =
  "three-shadermaterial-aurora-w-pair-extrusion-preview-no-stencil";
export const AURORA_SHADOW_VOLUME_PROJECTION_PREVIEW_SOURCE =
  `${AURORA_SHADOW_VOLUME_CASTER_THREE_GEOMETRY_HELPER_SOURCE}; ${AURORA_SHADOW_VOLUME_LIGHT_PROFILE_SOURCE}; active Three ShaderMaterial preview extrudes auroraShadowVolumeW=0 records away from the local light position while preserving w=1 source records; retail stencil/depth parity remains blocked`;
export const AURORA_SHADOW_VOLUME_PROJECTION_PREVIEW_PROOF_STATUS =
  "source-backed-shadowvol-w-pair-preview-renderer-active-retail-stencil-parity-blocked";
export const AURORA_SHADOW_VOLUME_STENCIL_PASS_STATUS =
  "source-backed-shadowvol-w-pair-stencil-volume-pass-active-retail-pixel-parity-blocked";
export const AURORA_SHADOW_VOLUME_STENCIL_RENDERER_MODE =
  "three-webgl-stencil-front-back-zpass-zfail-shadow-volume-preview";
export const AURORA_SHADOW_VOLUME_STENCIL_RETAIL_OP_SEQUENCE_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:913986-913987 sets FUN_00a78344(0,0,0,3) and FUN_00a78344(1,0,0,4) before bucket 0xd shadow-volume draws; 914032-914033 switches to FUN_00a78344(0,0,4,0) and FUN_00a78344(1,0,3,0) for later buckets; FUN_00a78344 wraps FUN_00a6f2b4, which dispatches through PTR_DAT_00d3dd6c; C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe .data maps 0x00d3dd6c -> 0x00d12d20 glStencilOpSeparate proc pointer, face table 0xcc9a38 slot 0=GL_FRONT/0x404 slot 1=GL_BACK/0x405, and op table 0xcc99d8 slot 0=GL_KEEP/0x1e00 slot 3=GL_INCR/0x1e02 slot 4=GL_DECR/0x1e03";
export const AURORA_SHADOW_VOLUME_STENCIL_RETAIL_FACE_TABLE = [
  { slot: 0, label: "GL_FRONT", glConstant: "0x404" },
  { slot: 1, label: "GL_BACK", glConstant: "0x405" }
] as const satisfies readonly AuroraShadowVolumeRetailStencilTableEntry[];
export const AURORA_SHADOW_VOLUME_STENCIL_RETAIL_OP_TABLE = [
  { slot: 0, label: "GL_KEEP", glConstant: "0x1e00" },
  { slot: 3, label: "GL_INCR", glConstant: "0x1e02" },
  { slot: 4, label: "GL_DECR", glConstant: "0x1e03" }
] as const satisfies readonly AuroraShadowVolumeRetailStencilTableEntry[];
export const AURORA_SHADOW_VOLUME_STENCIL_RETAIL_OP_SEQUENCE = [
  {
    phase: "zpass",
    runtimePass: "front:zpass",
    call: "FUN_00a78344(0,0,0,3)",
    faceSlot: 0,
    failSlot: 0,
    zFailSlot: 0,
    zPassSlot: 3
  },
  {
    phase: "zpass",
    runtimePass: "back:zpass",
    call: "FUN_00a78344(1,0,0,4)",
    faceSlot: 1,
    failSlot: 0,
    zFailSlot: 0,
    zPassSlot: 4
  },
  {
    phase: "zfail",
    runtimePass: "front:zfail",
    call: "FUN_00a78344(0,0,4,0)",
    faceSlot: 0,
    failSlot: 0,
    zFailSlot: 4,
    zPassSlot: 0
  },
  {
    phase: "zfail",
    runtimePass: "back:zfail",
    call: "FUN_00a78344(1,0,3,0)",
    faceSlot: 1,
    failSlot: 0,
    zFailSlot: 3,
    zPassSlot: 0
  }
] as const satisfies readonly AuroraShadowVolumeRetailStencilOpSequenceEntry[];
export const AURORA_SHADOW_VOLUME_STENCIL_SOURCE =
  `${AURORA_SHADOW_VOLUME_CASTER_THREE_GEOMETRY_HELPER_SOURCE}; ${AURORA_SHADOW_VOLUME_LIGHT_PROFILE_SOURCE}; ${AURORA_SHADOW_VOLUME_STENCIL_RETAIL_OP_SEQUENCE_SOURCE}; Three WebGLRenderer requests a stencil buffer, renders recovered w-pair shadow-volume geometry as colorWrite=false front/back z-pass and z-fail stencil meshes, then draws a receiver overlay through a nonzero stencil test; retail shader names/path are tracked but exact retail pixel parity still requires oracle capture`;
export const AURORA_SHADOW_VOLUME_STENCIL_PROOF_STATUS =
  "source-backed-shadowvol-w-pair-stencil-pass-active-retail-face-op-mapped-pixel-parity-blocked";

interface AuroraShadowVolumeProjectionPreviewMaterialOptions {
  readonly color?: THREE.ColorRepresentation;
  readonly opacity?: number;
  readonly lightPosition?: AuroraShadowVolumeVec3;
  readonly extrusionDistance?: number;
}

interface AuroraShadowVolumeStencilMaterialOptions {
  readonly lightPosition?: AuroraShadowVolumeVec3;
  readonly extrusionDistance?: number;
  readonly depthPass?: AuroraShadowVolumeStencilDepthPass;
}

interface AuroraShadowVolumeStencilReceiverMaterialOptions {
  readonly color?: THREE.ColorRepresentation;
  readonly opacity?: number;
}

export interface AuroraShadowVolumeCasterGeometry {
  readonly vertexRecords: Float32Array;
  readonly indices: Uint16Array;
  readonly sourceVertexCount: number;
  readonly casterEdgeCount: number;
  readonly centerNearIndex: number;
  readonly centerFarIndex: number;
  readonly recordsPerSourceVertex: typeof AURORA_SHADOW_VOLUME_RECORDS_PER_SOURCE_VERTEX;
  readonly floatsPerVertexRecord: typeof AURORA_SHADOW_VOLUME_VERTEX_RECORD_FLOATS;
  readonly indicesPerCasterEdge: typeof AURORA_SHADOW_VOLUME_INDICES_PER_CASTER_EDGE;
  readonly maxCasterEdgeCount: typeof AURORA_SHADOW_VOLUME_MAX_CASTER_EDGE_COUNT;
  readonly proofSource: typeof AURORA_SHADOW_VOLUME_CASTER_GEOMETRY_HELPER_SOURCE;
  readonly proofStatus: typeof AURORA_SHADOW_VOLUME_CASTER_GEOMETRY_HELPER_STATUS;
}

export function buildAuroraShadowVolumeCasterGeometry(
  sourceVertices: readonly AuroraShadowVolumeVec3[],
  casterEdges: readonly AuroraShadowVolumeCasterEdge[]
): AuroraShadowVolumeCasterGeometry {
  if ((sourceVertices.length + 1) * AURORA_SHADOW_VOLUME_RECORDS_PER_SOURCE_VERTEX > 0xffff) {
    throw new RangeError("Aurora shadow-volume caster geometry uses 16-bit indices.");
  }

  const recordCount =
    (sourceVertices.length + 1) * AURORA_SHADOW_VOLUME_RECORDS_PER_SOURCE_VERTEX;
  const vertexRecords = new Float32Array(
    recordCount * AURORA_SHADOW_VOLUME_VERTEX_RECORD_FLOATS
  );
  sourceVertices.forEach((vertex, vertexIndex) => {
    writeAuroraShadowVolumeVertexPair(vertexRecords, vertexIndex * 2, vertex);
  });

  const centerNearIndex = sourceVertices.length * 2;
  const centerFarIndex = centerNearIndex + 1;
  writeAuroraShadowVolumeVertexPair(vertexRecords, centerNearIndex, [0, 0, 0]);

  const clampedEdges = casterEdges.slice(0, AURORA_SHADOW_VOLUME_MAX_CASTER_EDGE_COUNT);
  const indices = new Uint16Array(
    clampedEdges.length * AURORA_SHADOW_VOLUME_INDICES_PER_CASTER_EDGE
  );
  let flipped = false;
  clampedEdges.forEach(([startVertex, endVertex], edgeIndex) => {
    validateCasterEdgeEndpoint(startVertex, sourceVertices.length);
    validateCasterEdgeEndpoint(endVertex, sourceVertices.length);
    flipped = !flipped;
    const startNearIndex = startVertex * 2;
    const endNearIndex = endVertex * 2;
    const writeOffset = edgeIndex * AURORA_SHADOW_VOLUME_INDICES_PER_CASTER_EDGE;
    if (flipped) {
      indices.set(
        [
          centerNearIndex,
          startNearIndex,
          endNearIndex,
          startNearIndex + 1,
          endNearIndex + 1,
          centerFarIndex
        ],
        writeOffset
      );
    } else {
      indices.set(
        [
          centerFarIndex,
          endNearIndex + 1,
          startNearIndex + 1,
          endNearIndex,
          startNearIndex,
          centerNearIndex
        ],
        writeOffset
      );
    }
  });

  return {
    vertexRecords,
    indices,
    sourceVertexCount: sourceVertices.length,
    casterEdgeCount: clampedEdges.length,
    centerNearIndex,
    centerFarIndex,
    recordsPerSourceVertex: AURORA_SHADOW_VOLUME_RECORDS_PER_SOURCE_VERTEX,
    floatsPerVertexRecord: AURORA_SHADOW_VOLUME_VERTEX_RECORD_FLOATS,
    indicesPerCasterEdge: AURORA_SHADOW_VOLUME_INDICES_PER_CASTER_EDGE,
    maxCasterEdgeCount: AURORA_SHADOW_VOLUME_MAX_CASTER_EDGE_COUNT,
    proofSource: AURORA_SHADOW_VOLUME_CASTER_GEOMETRY_HELPER_SOURCE,
    proofStatus: AURORA_SHADOW_VOLUME_CASTER_GEOMETRY_HELPER_STATUS
  };
}

export function createAuroraShadowVolumeCasterBufferGeometry(
  sourceVertices: readonly AuroraShadowVolumeVec3[],
  casterEdges: readonly AuroraShadowVolumeCasterEdge[]
): THREE.BufferGeometry {
  const sourceGeometry = buildAuroraShadowVolumeCasterGeometry(
    sourceVertices,
    casterEdges
  );
  const recordCount =
    sourceGeometry.vertexRecords.length / AURORA_SHADOW_VOLUME_VERTEX_RECORD_FLOATS;
  const positions = new Float32Array(recordCount * 3);
  const homogeneousW = new Float32Array(recordCount);
  for (let recordIndex = 0; recordIndex < recordCount; recordIndex += 1) {
    const sourceOffset = recordIndex * AURORA_SHADOW_VOLUME_VERTEX_RECORD_FLOATS;
    const positionOffset = recordIndex * 3;
    positions[positionOffset] = sourceGeometry.vertexRecords[sourceOffset] ?? 0;
    positions[positionOffset + 1] = sourceGeometry.vertexRecords[sourceOffset + 1] ?? 0;
    positions[positionOffset + 2] = sourceGeometry.vertexRecords[sourceOffset + 2] ?? 0;
    homogeneousW[recordIndex] = sourceGeometry.vertexRecords[sourceOffset + 3] ?? 0;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute(
    "auroraShadowVolumeW",
    new THREE.BufferAttribute(homogeneousW, 1)
  );
  geometry.setIndex(new THREE.BufferAttribute(sourceGeometry.indices, 1));
  geometry.userData = {
    auroraShadowVolumeGeometryStatus:
      AURORA_SHADOW_VOLUME_CASTER_THREE_GEOMETRY_HELPER_STATUS,
    auroraShadowVolumeGeometrySource:
      AURORA_SHADOW_VOLUME_CASTER_THREE_GEOMETRY_HELPER_SOURCE,
    auroraShadowVolumeSourceVertexCount: sourceGeometry.sourceVertexCount,
    auroraShadowVolumeCasterEdgeCount: sourceGeometry.casterEdgeCount,
    auroraShadowVolumeRecordsPerSourceVertex: sourceGeometry.recordsPerSourceVertex,
    auroraShadowVolumeFloatsPerVertexRecord: sourceGeometry.floatsPerVertexRecord,
    auroraShadowVolumeIndicesPerCasterEdge: sourceGeometry.indicesPerCasterEdge,
    auroraShadowVolumeMaxCasterEdgeCount: sourceGeometry.maxCasterEdgeCount,
    auroraShadowVolumeCenterNearIndex: sourceGeometry.centerNearIndex,
    auroraShadowVolumeCenterFarIndex: sourceGeometry.centerFarIndex
  };
  return geometry;
}

function resolveAuroraShadowVolumeShaderValues(
  options: AuroraShadowVolumeStencilMaterialOptions
): {
  readonly lightPosition: THREE.Vector3;
  readonly extrusionDistance: number;
  readonly lightPositionTuple: AuroraShadowVolumeVec3;
} {
  const extrusionDistance =
    typeof options.extrusionDistance === "number" &&
    Number.isFinite(options.extrusionDistance)
      ? Math.max(0.001, options.extrusionDistance)
      : 1;
  const [lightX, lightY, lightZ] = options.lightPosition ?? [0, 0, 1];
  return {
    lightPosition: new THREE.Vector3(lightX, lightY, lightZ),
    extrusionDistance,
    lightPositionTuple: [lightX, lightY, lightZ]
  };
}

function formatAuroraShadowVolumeRetailStencilTableEntry(
  entry: AuroraShadowVolumeRetailStencilTableEntry
): string {
  return `slot${entry.slot}=${entry.label}/${entry.glConstant}`;
}

function resolveAuroraShadowVolumeRetailStencilFace(
  slot: number
): AuroraShadowVolumeRetailStencilTableEntry {
  return (
    AURORA_SHADOW_VOLUME_STENCIL_RETAIL_FACE_TABLE.find(
      (entry) => entry.slot === slot
    ) ?? AURORA_SHADOW_VOLUME_STENCIL_RETAIL_FACE_TABLE[0]!
  );
}

function resolveAuroraShadowVolumeRetailStencilOp(
  slot: number
): AuroraShadowVolumeRetailStencilTableEntry {
  return (
    AURORA_SHADOW_VOLUME_STENCIL_RETAIL_OP_TABLE.find(
      (entry) => entry.slot === slot
    ) ?? AURORA_SHADOW_VOLUME_STENCIL_RETAIL_OP_TABLE[0]!
  );
}

function resolveAuroraShadowVolumeRetailStencilOpEntry(
  pass: AuroraShadowVolumeStencilFacePass,
  depthPass: AuroraShadowVolumeStencilDepthPass
): AuroraShadowVolumeRetailStencilOpSequenceEntry {
  const runtimePass = `${pass}:${depthPass}` as const;
  return (
    AURORA_SHADOW_VOLUME_STENCIL_RETAIL_OP_SEQUENCE.find(
      (entry) => entry.runtimePass === runtimePass
    ) ?? AURORA_SHADOW_VOLUME_STENCIL_RETAIL_OP_SEQUENCE[0]!
  );
}

function formatAuroraShadowVolumeRetailStencilOpSlot(slot: number): string {
  const op = resolveAuroraShadowVolumeRetailStencilOp(slot);
  return `${op.label}/${op.glConstant}`;
}

export function formatAuroraShadowVolumeStencilRetailFaceOpTable(): string {
  return [
    `faces=${AURORA_SHADOW_VOLUME_STENCIL_RETAIL_FACE_TABLE.map(
      formatAuroraShadowVolumeRetailStencilTableEntry
    ).join(",")}`,
    `ops=${AURORA_SHADOW_VOLUME_STENCIL_RETAIL_OP_TABLE.map(
      formatAuroraShadowVolumeRetailStencilTableEntry
    ).join(",")}`
  ].join(";");
}

export function formatAuroraShadowVolumeStencilRetailOpSequenceEntry(
  entry: AuroraShadowVolumeRetailStencilOpSequenceEntry
): string {
  const face = resolveAuroraShadowVolumeRetailStencilFace(entry.faceSlot);
  return [
    `phase=${entry.phase}`,
    `pass=${entry.runtimePass}`,
    `call=${entry.call}`,
    `faceSlot=${entry.faceSlot}`,
    `face=${face.label}/${face.glConstant}`,
    `fail=${formatAuroraShadowVolumeRetailStencilOpSlot(entry.failSlot)}`,
    `zfail=${formatAuroraShadowVolumeRetailStencilOpSlot(entry.zFailSlot)}`,
    `zpass=${formatAuroraShadowVolumeRetailStencilOpSlot(entry.zPassSlot)}`
  ].join(",");
}

export function formatAuroraShadowVolumeStencilRetailOpSequence(): string {
  return AURORA_SHADOW_VOLUME_STENCIL_RETAIL_OP_SEQUENCE.map(
    formatAuroraShadowVolumeStencilRetailOpSequenceEntry
  ).join("|");
}

export const AURORA_SHADOW_VOLUME_STENCIL_RETAIL_FACE_OP_TABLE_SUMMARY =
  formatAuroraShadowVolumeStencilRetailFaceOpTable();
export const AURORA_SHADOW_VOLUME_STENCIL_RETAIL_OP_SEQUENCE_SUMMARY =
  formatAuroraShadowVolumeStencilRetailOpSequence();

const AURORA_SHADOW_VOLUME_EXTRUSION_VERTEX_SHADER = `
  attribute float auroraShadowVolumeW;
  uniform vec3 auroraShadowVolumeLightPosition;
  uniform float auroraShadowVolumeExtrusionDistance;
  varying float vAuroraShadowVolumeW;

  void main() {
    vec3 direction = position - auroraShadowVolumeLightPosition;
    float lengthSq = max(dot(direction, direction), 0.000001);
    vec3 extrusionDirection = direction * inversesqrt(lengthSq);
    vec3 farPosition = position + extrusionDirection * auroraShadowVolumeExtrusionDistance;
    vec3 projectedPosition = mix(farPosition, position, auroraShadowVolumeW);
    vAuroraShadowVolumeW = auroraShadowVolumeW;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(projectedPosition, 1.0);
  }
`;

export function createAuroraShadowVolumeProjectionPreviewMaterial(
  options: AuroraShadowVolumeProjectionPreviewMaterialOptions = {}
): THREE.ShaderMaterial {
  const opacity =
    typeof options.opacity === "number" && Number.isFinite(options.opacity)
      ? Math.max(0, Math.min(1, options.opacity))
      : 0.12;
  const { lightPosition, extrusionDistance, lightPositionTuple } =
    resolveAuroraShadowVolumeShaderValues(options);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      auroraShadowVolumeColor: {
        value: new THREE.Color(options.color ?? 0x06080b)
      },
      auroraShadowVolumeOpacity: { value: opacity },
      auroraShadowVolumeLightPosition: { value: lightPosition },
      auroraShadowVolumeExtrusionDistance: { value: extrusionDistance }
    },
    vertexShader: AURORA_SHADOW_VOLUME_EXTRUSION_VERTEX_SHADER,
    fragmentShader: `
      uniform vec3 auroraShadowVolumeColor;
      uniform float auroraShadowVolumeOpacity;
      varying float vAuroraShadowVolumeW;

      void main() {
        float edgeFade = mix(0.55, 1.0, clamp(vAuroraShadowVolumeW, 0.0, 1.0));
        gl_FragColor = vec4(auroraShadowVolumeColor, auroraShadowVolumeOpacity * edgeFade);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide
  });
  material.userData = {
    auroraShadowVolumeProjectionPreviewStatus:
      AURORA_SHADOW_VOLUME_PROJECTION_PREVIEW_STATUS,
    auroraShadowVolumeProjectionPreviewRendererMode:
      AURORA_SHADOW_VOLUME_PROJECTION_PREVIEW_RENDERER_MODE,
    auroraShadowVolumeProjectionPreviewSource:
      AURORA_SHADOW_VOLUME_PROJECTION_PREVIEW_SOURCE,
    auroraShadowVolumeProjectionPreviewProofStatus:
      AURORA_SHADOW_VOLUME_PROJECTION_PREVIEW_PROOF_STATUS,
    auroraShadowVolumeProjectionPreviewWAttribute: "auroraShadowVolumeW",
    auroraShadowVolumeProjectionPreviewLightPosition: [...lightPositionTuple],
    auroraShadowVolumeProjectionPreviewExtrusionDistance: extrusionDistance,
    auroraShadowVolumeProjectionPreviewOpacity: opacity
  };
  return material;
}

export function createAuroraShadowVolumeStencilVolumeMaterial(
  pass: AuroraShadowVolumeStencilFacePass,
  options: AuroraShadowVolumeStencilMaterialOptions = {}
): THREE.ShaderMaterial {
  const { lightPosition, extrusionDistance, lightPositionTuple } =
    resolveAuroraShadowVolumeShaderValues(options);
  const depthPass = options.depthPass ?? "zpass";
  const retailOpEntry = resolveAuroraShadowVolumeRetailStencilOpEntry(pass, depthPass);
  const retailFace = resolveAuroraShadowVolumeRetailStencilFace(
    retailOpEntry.faceSlot
  );
  const isFrontPass = pass === "front";
  const zFailOp =
    depthPass === "zfail"
      ? isFrontPass
        ? THREE.DecrementStencilOp
        : THREE.IncrementStencilOp
      : THREE.KeepStencilOp;
  const zPassOp =
    depthPass === "zpass"
      ? isFrontPass
        ? THREE.IncrementStencilOp
        : THREE.DecrementStencilOp
      : THREE.KeepStencilOp;
  const material = new THREE.ShaderMaterial({
    uniforms: {
      auroraShadowVolumeLightPosition: { value: lightPosition },
      auroraShadowVolumeExtrusionDistance: { value: extrusionDistance }
    },
    vertexShader: AURORA_SHADOW_VOLUME_EXTRUSION_VERTEX_SHADER,
    fragmentShader: `
      void main() {
        gl_FragColor = vec4(0.0);
      }
    `,
    colorWrite: false,
    depthWrite: false,
    depthTest: true,
    side: pass === "back" ? THREE.BackSide : THREE.FrontSide,
    stencilWrite: true,
    stencilRef: 1,
    stencilFunc: THREE.AlwaysStencilFunc,
    stencilFail: THREE.KeepStencilOp,
    stencilZFail: zFailOp,
    stencilZPass: zPassOp
  });
  material.userData = {
    auroraShadowVolumeStencilPassStatus: AURORA_SHADOW_VOLUME_STENCIL_PASS_STATUS,
    auroraShadowVolumeStencilRendererMode: AURORA_SHADOW_VOLUME_STENCIL_RENDERER_MODE,
    auroraShadowVolumeStencilSource: AURORA_SHADOW_VOLUME_STENCIL_SOURCE,
    auroraShadowVolumeStencilProofStatus: AURORA_SHADOW_VOLUME_STENCIL_PROOF_STATUS,
    auroraShadowVolumeStencilFacePass: pass,
    auroraShadowVolumeStencilDepthPass: depthPass,
    auroraShadowVolumeStencilWAttribute: "auroraShadowVolumeW",
    auroraShadowVolumeStencilLightPosition: [...lightPositionTuple],
    auroraShadowVolumeStencilExtrusionDistance: extrusionDistance,
    auroraShadowVolumeStencilFunc: "Always",
    auroraShadowVolumeStencilFail: "Keep",
    auroraShadowVolumeStencilZFail: formatAuroraShadowVolumeStencilOp(zFailOp),
    auroraShadowVolumeStencilZPass: formatAuroraShadowVolumeStencilOp(zPassOp),
    auroraShadowVolumeStencilRetailFaceOpTable:
      AURORA_SHADOW_VOLUME_STENCIL_RETAIL_FACE_OP_TABLE_SUMMARY,
    auroraShadowVolumeStencilRetailOpSequence:
      AURORA_SHADOW_VOLUME_STENCIL_RETAIL_OP_SEQUENCE_SUMMARY,
    auroraShadowVolumeStencilRetailOpSequenceSample:
      formatAuroraShadowVolumeStencilRetailOpSequenceEntry(retailOpEntry),
    auroraShadowVolumeStencilRetailPhase: retailOpEntry.phase,
    auroraShadowVolumeStencilRetailCall: retailOpEntry.call,
    auroraShadowVolumeStencilRetailFaceSlot: retailOpEntry.faceSlot,
    auroraShadowVolumeStencilRetailFace:
      `${retailFace.label}/${retailFace.glConstant}`,
    auroraShadowVolumeStencilRetailFail:
      formatAuroraShadowVolumeRetailStencilOpSlot(retailOpEntry.failSlot),
    auroraShadowVolumeStencilRetailZFail:
      formatAuroraShadowVolumeRetailStencilOpSlot(retailOpEntry.zFailSlot),
    auroraShadowVolumeStencilRetailZPass:
      formatAuroraShadowVolumeRetailStencilOpSlot(retailOpEntry.zPassSlot),
    auroraShadowVolumeStencilRetailOpSequenceSource:
      AURORA_SHADOW_VOLUME_STENCIL_RETAIL_OP_SEQUENCE_SOURCE
  };
  return material;
}

function formatAuroraShadowVolumeStencilOp(op: number): string {
  if (op === THREE.KeepStencilOp) {
    return "Keep";
  }
  if (op === THREE.IncrementStencilOp) {
    return "Increment";
  }
  if (op === THREE.DecrementStencilOp) {
    return "Decrement";
  }
  if (op === THREE.IncrementWrapStencilOp) {
    return "IncrementWrap";
  }
  if (op === THREE.DecrementWrapStencilOp) {
    return "DecrementWrap";
  }
  return "Unknown";
}

export function createAuroraShadowVolumeStencilReceiverMaterial(
  options: AuroraShadowVolumeStencilReceiverMaterialOptions = {}
): THREE.MeshBasicMaterial {
  const opacity =
    typeof options.opacity === "number" && Number.isFinite(options.opacity)
      ? Math.max(0, Math.min(1, options.opacity))
      : 0.12;
  const material = new THREE.MeshBasicMaterial({
    color: options.color ?? 0x030405,
    opacity,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
    stencilWrite: true,
    stencilRef: 0,
    stencilFunc: THREE.NotEqualStencilFunc,
    stencilFail: THREE.KeepStencilOp,
    stencilZFail: THREE.KeepStencilOp,
    stencilZPass: THREE.KeepStencilOp
  });
  material.userData = {
    auroraShadowVolumeStencilPassStatus: AURORA_SHADOW_VOLUME_STENCIL_PASS_STATUS,
    auroraShadowVolumeStencilRendererMode: AURORA_SHADOW_VOLUME_STENCIL_RENDERER_MODE,
    auroraShadowVolumeStencilSource: AURORA_SHADOW_VOLUME_STENCIL_SOURCE,
    auroraShadowVolumeStencilProofStatus: AURORA_SHADOW_VOLUME_STENCIL_PROOF_STATUS,
    auroraShadowVolumeStencilReceiverStencilFunc: "NotEqual",
    auroraShadowVolumeStencilReceiverStencilRef: 0,
    auroraShadowVolumeStencilReceiverOpacity: opacity,
    auroraShadowVolumeStencilRetailFaceOpTable:
      AURORA_SHADOW_VOLUME_STENCIL_RETAIL_FACE_OP_TABLE_SUMMARY,
    auroraShadowVolumeStencilRetailOpSequence:
      AURORA_SHADOW_VOLUME_STENCIL_RETAIL_OP_SEQUENCE_SUMMARY,
    auroraShadowVolumeStencilRetailOpSequenceSource:
      AURORA_SHADOW_VOLUME_STENCIL_RETAIL_OP_SEQUENCE_SOURCE
  };
  return material;
}

function writeAuroraShadowVolumeVertexPair(
  vertexRecords: Float32Array,
  nearRecordIndex: number,
  [x, y, z]: AuroraShadowVolumeVec3
): void {
  const nearOffset = nearRecordIndex * AURORA_SHADOW_VOLUME_VERTEX_RECORD_FLOATS;
  vertexRecords.set([x, y, z, 1], nearOffset);
  vertexRecords.set([x, y, z, 0], nearOffset + AURORA_SHADOW_VOLUME_VERTEX_RECORD_FLOATS);
}

function validateCasterEdgeEndpoint(endpoint: number, sourceVertexCount: number): void {
  if (!Number.isInteger(endpoint) || endpoint < 0 || endpoint >= sourceVertexCount) {
    throw new RangeError(`Invalid Aurora shadow-volume caster edge endpoint: ${endpoint}`);
  }
}
