import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  AURORA_SHADOW_VOLUME_ACTIVE_LIGHT_RENDER_ENVELOPE_BLOCKER,
  AURORA_SHADOW_VOLUME_ACTIVE_LIGHT_RENDER_ENVELOPE_PROOF_STATUS,
  AURORA_SHADOW_VOLUME_ACTIVE_LIGHT_RENDER_ENVELOPE_SOURCE,
  AURORA_SHADOW_VOLUME_ACTIVE_LIGHT_RENDER_ENVELOPE_STATE,
  AURORA_SHADOW_VOLUME_BLEND_DEPTH_COLOR_MASK_WRAPPERS,
  AURORA_SHADOW_VOLUME_BLEND_DEPTH_COLOR_MASK_WRAPPER_PROOF_STATUS,
  AURORA_SHADOW_VOLUME_BLEND_DEPTH_COLOR_MASK_WRAPPER_SOURCE,
  AURORA_SHADOW_VOLUME_CASTER_GEOMETRY_HELPER_STATUS,
  AURORA_SHADOW_VOLUME_CASTER_THREE_GEOMETRY_HELPER_STATUS,
  AURORA_SHADOW_VOLUME_DIRECT_CALLER_BUFFER_BUILDER_BLOCKER,
  AURORA_SHADOW_VOLUME_DIRECT_CALLER_BUFFER_BUILDER_PROOF_STATUS,
  AURORA_SHADOW_VOLUME_DIRECT_CALLER_BUFFER_BUILDER_SOURCE,
  AURORA_SHADOW_VOLUME_DRAW_WRAPPER_SOURCE,
  AURORA_SHADOW_VOLUME_IMMEDIATE_CALLER_BUFFER_FLUSH_BLOCKER,
  AURORA_SHADOW_VOLUME_IMMEDIATE_CALLER_BUFFER_FLUSH_PROOF_STATUS,
  AURORA_SHADOW_VOLUME_IMMEDIATE_CALLER_BUFFER_FLUSH_SOURCE,
  AURORA_SHADOW_VOLUME_INDICES_PER_CASTER_EDGE,
  AURORA_SHADOW_VOLUME_LOCAL_DRAW_STATE_ORDER,
  AURORA_SHADOW_VOLUME_LOCAL_DRAW_STATE_ORDER_BLOCKER,
  AURORA_SHADOW_VOLUME_LOCAL_DRAW_STATE_ORDER_PROOF_STATUS,
  AURORA_SHADOW_VOLUME_LOCAL_DRAW_STATE_ORDER_SOURCE,
  AURORA_SHADOW_VOLUME_MAX_CASTER_EDGE_COUNT,
  AURORA_SHADOW_VOLUME_PROJECTION_PREVIEW_PROOF_STATUS,
  AURORA_SHADOW_VOLUME_PROJECTION_PREVIEW_RENDERER_MODE,
  AURORA_SHADOW_VOLUME_PROJECTION_PREVIEW_STATUS,
  AURORA_SHADOW_VOLUME_RENDER_BUCKET_PHASE_PROOF_STATUS,
  AURORA_SHADOW_VOLUME_RENDER_BUCKET_PHASE_SOURCE,
  AURORA_SHADOW_VOLUME_RENDER_BUCKET_PHASES,
  AURORA_SHADOW_VOLUME_RENDER_BUCKETS,
  AURORA_SHADOW_VOLUME_RENDER_PATH_PROOF_STATUS,
  AURORA_SHADOW_VOLUME_RENDER_PATH_SOURCE,
  AURORA_SHADOW_VOLUME_RENDER_SHADER_NAMES,
  AURORA_SHADOW_VOLUME_RENDER_STATE_CALL_PROOF_STATUS,
  AURORA_SHADOW_VOLUME_RENDER_STATE_CALL_SEQUENCE,
  AURORA_SHADOW_VOLUME_RENDER_STATE_CALL_SOURCE,
  AURORA_SHADOW_VOLUME_RENDER_STATE_WRAPPER_PROOF_STATUS,
  AURORA_SHADOW_VOLUME_RENDER_STATE_WRAPPER_SEMANTICS,
  AURORA_SHADOW_VOLUME_RENDER_STATE_WRAPPER_SOURCE,
  AURORA_SHADOW_VOLUME_SHADER_UNIFORM_PROOF_STATUS,
  AURORA_SHADOW_VOLUME_SHADER_UNIFORM_SEMANTICS,
  AURORA_SHADOW_VOLUME_SHADER_UNIFORM_SOURCE,
  AURORA_SHADOW_VOLUME_STENCIL_PASS_STATUS,
  AURORA_SHADOW_VOLUME_STENCIL_PROOF_STATUS,
  AURORA_SHADOW_VOLUME_STENCIL_RETAIL_FACE_OP_TABLE_SUMMARY,
  AURORA_SHADOW_VOLUME_STENCIL_RETAIL_OP_SEQUENCE_SUMMARY,
  AURORA_SHADOW_VOLUME_STENCIL_RENDERER_MODE,
  buildAuroraShadowVolumeCasterGeometry,
  createAuroraShadowVolumeCasterBufferGeometry,
  createAuroraShadowVolumeProjectionPreviewMaterial,
  createAuroraShadowVolumeStencilReceiverMaterial,
  createAuroraShadowVolumeStencilVolumeMaterial
} from "../../../../src/modules/layout/adapters/three/auroraShadowVolumeGeometry";

describe("auroraShadowVolumeGeometry", () => {
  it("builds the recovered paired-vertex and six-index caster edge buffer schema", () => {
    const geometry = buildAuroraShadowVolumeCasterGeometry(
      [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9]
      ],
      [
        [0, 1],
        [1, 2]
      ]
    );

    expect(geometry.proofStatus).toBe(AURORA_SHADOW_VOLUME_CASTER_GEOMETRY_HELPER_STATUS);
    expect(geometry.sourceVertexCount).toBe(3);
    expect(geometry.casterEdgeCount).toBe(2);
    expect(geometry.centerNearIndex).toBe(6);
    expect(geometry.centerFarIndex).toBe(7);
    expect(geometry.recordsPerSourceVertex).toBe(2);
    expect(geometry.floatsPerVertexRecord).toBe(4);
    expect(geometry.indicesPerCasterEdge).toBe(AURORA_SHADOW_VOLUME_INDICES_PER_CASTER_EDGE);
    expect(Array.from(geometry.vertexRecords)).toEqual([
      1, 2, 3, 1,
      1, 2, 3, 0,
      4, 5, 6, 1,
      4, 5, 6, 0,
      7, 8, 9, 1,
      7, 8, 9, 0,
      0, 0, 0, 1,
      0, 0, 0, 0
    ]);
    expect(Array.from(geometry.indices)).toEqual([
      6, 0, 2, 1, 3, 7,
      7, 5, 3, 4, 2, 6
    ]);
    expect(geometry.proofSource).toContain("decompiled_all.c:888319-888403");
  });

  it("clamps caster edges to the recovered 0x2aaa retail limit", () => {
    const edges = Array.from(
      { length: AURORA_SHADOW_VOLUME_MAX_CASTER_EDGE_COUNT + 1 },
      () => [0, 1] as const
    );
    const geometry = buildAuroraShadowVolumeCasterGeometry(
      [
        [0, 0, 0],
        [1, 0, 0]
      ],
      edges
    );

    expect(geometry.casterEdgeCount).toBe(AURORA_SHADOW_VOLUME_MAX_CASTER_EDGE_COUNT);
    expect(geometry.indices).toHaveLength(
      AURORA_SHADOW_VOLUME_MAX_CASTER_EDGE_COUNT *
        AURORA_SHADOW_VOLUME_INDICES_PER_CASTER_EDGE
    );
  });

  it("rejects caster edges outside the source vertex table", () => {
    expect(() =>
      buildAuroraShadowVolumeCasterGeometry(
        [[0, 0, 0]],
        [[0, 1]]
      )
    ).toThrow(RangeError);
  });

  it("converts the recovered caster schema into Three BufferGeometry without dropping homogeneous w", () => {
    const geometry = createAuroraShadowVolumeCasterBufferGeometry(
      [
        [1, 2, 3],
        [4, 5, 6]
      ],
      [[0, 1]]
    );

    expect(geometry.userData.auroraShadowVolumeGeometryStatus).toBe(
      AURORA_SHADOW_VOLUME_CASTER_THREE_GEOMETRY_HELPER_STATUS
    );
    expect(geometry.userData.auroraShadowVolumeSourceVertexCount).toBe(2);
    expect(geometry.userData.auroraShadowVolumeCasterEdgeCount).toBe(1);
    expect(Array.from(geometry.getAttribute("position").array)).toEqual([
      1, 2, 3,
      1, 2, 3,
      4, 5, 6,
      4, 5, 6,
      0, 0, 0,
      0, 0, 0
    ]);
    expect(Array.from(geometry.getAttribute("auroraShadowVolumeW").array)).toEqual([
      1, 0, 1, 0, 1, 0
    ]);
    expect(Array.from(geometry.getIndex()?.array ?? [])).toEqual([
      4, 0, 2, 1, 3, 5
    ]);
    expect(geometry.userData.auroraShadowVolumeGeometrySource).toContain(
      "auroraShadowVolumeW"
    );
  });

  it("exposes the recovered shadowvol shader, bucket, and draw-wrapper path", () => {
    expect(AURORA_SHADOW_VOLUME_RENDER_SHADER_NAMES).toEqual([
      "vs_shadowvol",
      "fs_shadowvol"
    ]);
    expect(AURORA_SHADOW_VOLUME_RENDER_BUCKETS).toEqual(["0xd", "0xe", "0xb", "0xc"]);
    expect(AURORA_SHADOW_VOLUME_RENDER_PATH_SOURCE).toContain("FUN_00a878f8");
    expect(AURORA_SHADOW_VOLUME_RENDER_PATH_SOURCE).toContain(
      "local_29=true: 0xd -> 0xb -> 0xe -> 0xc"
    );
    expect(AURORA_SHADOW_VOLUME_RENDER_BUCKET_PHASES).toEqual([
      "case=local_29_false;condition=current-light-branch-not-active;sequence=0xd:zpass->0xe:zfail",
      "case=local_29_true;condition=param_1+0x34==DAT_00cc4350 and differs from scene +0x108/+0x68;sequence=0xd:zpass->0xb:zpass->0xe:zfail->0xc:zfail"
    ]);
    expect(AURORA_SHADOW_VOLUME_RENDER_BUCKET_PHASE_SOURCE).toContain(
      "913922-913928"
    );
    expect(AURORA_SHADOW_VOLUME_RENDER_BUCKET_PHASE_SOURCE).toContain(
      "switches to z-fail ops at 914032-914033"
    );
    expect(AURORA_SHADOW_VOLUME_RENDER_BUCKET_PHASE_PROOF_STATUS).toBe(
      "source-backed-shadowvol-branch-aware-bucket-op-ordering-retail-pixel-parity-blocked"
    );
    expect(AURORA_SHADOW_VOLUME_RENDER_STATE_CALL_SEQUENCE).toEqual([
      "pre=FUN_00a7818c(3);role=state-slot-3-disable-or-cache-before-shadow-volume-loop",
      "lazyBegin=FUN_00a780f0();role=first-caster-state-begin-guarded-by-local_69",
      "perCaster=FUN_00a785d4(light-matrix-pointer);role=upload-caster-transform-before-shader",
      "perCaster=FUN_00a788b0(DAT_00d0247c);role=bind-vs_shadowvol-fs_shadowvol-program",
      "perCaster=FUN_00a78994(0);role=upload-shadowvol-uniform-slot-0",
      "perCaster=FUN_00a78980(1,fVar2);role=upload-shadowvol-uniform-slot-1-depth-or-bias-candidate",
      "draw=FUN_00a78128(buffer0x58,buffer0x5c,4,count0x64,buffer0x68);role=draw-wrapper-to-FUN_00a75e3c",
      "lazyEnd=FUN_00a780e8();role=end-first-caster-state-block-when-local_69-set",
      "post=FUN_00a7816c(3);role=state-slot-3-restore-or-enable-after-shadow-volume-loop"
    ]);
    expect(AURORA_SHADOW_VOLUME_RENDER_STATE_CALL_SOURCE).toContain(
      "913995-914015"
    );
    expect(AURORA_SHADOW_VOLUME_RENDER_STATE_CALL_SOURCE).toContain(
      "904063-904075"
    );
    expect(AURORA_SHADOW_VOLUME_RENDER_STATE_CALL_PROOF_STATUS).toBe(
      "source-backed-shadowvol-render-state-wrapper-call-sequence-slot3-gl-cull-face-exposed-wrapped-state-factor-parity-blocked"
    );
    expect(AURORA_SHADOW_VOLUME_SHADER_UNIFORM_SEMANTICS).toEqual([
      "transform=FUN_00a785d4(light-matrix-pointer)->FUN_00a6dda4()->FUN_00a482a8(0xe320d0,param_1);counter=DAT_00e34710",
      "shaderBind=FUN_00a788b0(DAT_00d0247c)->FUN_00a74fd0;nonzeroProgramStored=DAT_00cff754",
      "uniformSlot0=FUN_00a78994(0)->FUN_00a7278c;vec4Words=DAT_00cff71c+slot*0x10",
      "uniformSlot1=FUN_00a78980(1,fVar2)->FUN_00a72764;scalar=DAT_00e346b4+slot*4"
    ]);
    expect(AURORA_SHADOW_VOLUME_SHADER_UNIFORM_SOURCE).toContain(
      "913999 calls FUN_00a785d4"
    );
    expect(AURORA_SHADOW_VOLUME_SHADER_UNIFORM_SOURCE).toContain(
      "900852-900857 FUN_00a72764 writes scalar slot data"
    );
    expect(AURORA_SHADOW_VOLUME_SHADER_UNIFORM_PROOF_STATUS).toBe(
      "source-backed-shadowvol-shader-bind-transform-and-uniform-slot-writes-exposed-retail-pixel-parity-blocked"
    );
    expect(AURORA_SHADOW_VOLUME_RENDER_STATE_WRAPPER_SEMANTICS).toEqual([
      "slot3=FUN_00a7818c(3)->FUN_00a6f0bc(3)->glDisable(GL_CULL_FACE/0x0b44);stateBit=_DAT_00d01c0c bit3 cleared",
      "slot3Restore=FUN_00a7816c(3)->FUN_00a6ef90(3)->glEnable(GL_CULL_FACE/0x0b44);stateBit=_DAT_00d01c0c bit3 set",
      "stateStack=FUN_00a780f0()->FUN_00a6c520 pushes or allocates a 0x40-byte render-state block",
      "stateRestore=FUN_00a780e8()->FUN_00a6c44c copies previous 0x40-byte block and pops/restores it",
      "stencilCache=FUN_00a6f2b4 caches front slots DAT_00ccb008..00c and back slots DAT_00ccb014..01c before PTR_DAT_00d3dd6c glStencilOpSeparate dispatch"
    ]);
    expect(AURORA_SHADOW_VOLUME_RENDER_STATE_WRAPPER_SOURCE).toContain(
      "898307-898358"
    );
    expect(AURORA_SHADOW_VOLUME_RENDER_STATE_WRAPPER_SOURCE).toContain(
      "896387-896475"
    );
    expect(AURORA_SHADOW_VOLUME_RENDER_STATE_WRAPPER_SOURCE).toContain(
      "0xa6efc4/0xa6f0f2 map case 3 to push 0x0b44"
    );
    expect(AURORA_SHADOW_VOLUME_RENDER_STATE_WRAPPER_PROOF_STATUS).toBe(
      "source-backed-shadowvol-render-state-slot3-gl-cull-face-stack-and-stencil-cache-exposed-other-state-parity-blocked"
    );
    expect(AURORA_SHADOW_VOLUME_LOCAL_DRAW_STATE_ORDER).toEqual([
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
    ]);
    expect(AURORA_SHADOW_VOLUME_LOCAL_DRAW_STATE_ORDER_SOURCE).toContain(
      "localBlendDepthColorMaskCallHits=[]"
    );
    expect(AURORA_SHADOW_VOLUME_LOCAL_DRAW_STATE_ORDER_SOURCE).toContain(
      "immediate caller blendDepthColorMaskCallHits=[]"
    );
    expect(AURORA_SHADOW_VOLUME_LOCAL_DRAW_STATE_ORDER_SOURCE).toContain(
      "direct caller/buffer-builder blendDepthColorMaskCallHits=[]"
    );
    expect(AURORA_SHADOW_VOLUME_LOCAL_DRAW_STATE_ORDER_SOURCE).toContain(
      "active-light render envelope colorDepthMaskCallHits=[]"
    );
    expect(AURORA_SHADOW_VOLUME_LOCAL_DRAW_STATE_ORDER_SOURCE).toContain(
      "914014 draws through FUN_00a78128"
    );
    expect(AURORA_SHADOW_VOLUME_LOCAL_DRAW_STATE_ORDER_BLOCKER).toContain(
      "FUN_00a82464 active-light render envelope have no color/depth-mask wrapper calls"
    );
    expect(AURORA_SHADOW_VOLUME_BLEND_DEPTH_COLOR_MASK_WRAPPERS).toEqual([
      "blendFunc=FUN_00a6f1ec()->glBlendFunc",
      "blendFuncFacade=FUN_00a7819c()->FUN_00a6f1ec()->glBlendFunc",
      "colorMask=FUN_00a6f3bc(r,g,b,a)->glColorMask;cache=DAT_00ccb044",
      "colorMaskFacade=FUN_00a78384(r,g,b,a)->FUN_00a6f3bc(r,g,b,a)->glColorMask",
      "depthMask=FUN_00a6f4f8(flag)->glDepthMask;cache=DAT_00ccb04c",
      "depthMaskFacade=FUN_00a785bc(flag)->FUN_00a6f4f8(flag)->glDepthMask",
      "depthFunc=FUN_00a6f518()->glDepthFunc",
      "depthFuncFacade=FUN_00a78724()->FUN_00a6f518()->glDepthFunc"
    ]);
    expect(AURORA_SHADOW_VOLUME_BLEND_DEPTH_COLOR_MASK_WRAPPER_SOURCE).toContain(
      "898421-898425 maps FUN_00a6f1ec to glBlendFunc"
    );
    expect(AURORA_SHADOW_VOLUME_BLEND_DEPTH_COLOR_MASK_WRAPPER_SOURCE).toContain(
      "898618-898624 maps FUN_00a6f4f8 to glDepthMask"
    );
    expect(AURORA_SHADOW_VOLUME_BLEND_DEPTH_COLOR_MASK_WRAPPER_SOURCE).toContain(
      "904335-904339 maps facade FUN_00a78384 to FUN_00a6f3bc"
    );
    expect(AURORA_SHADOW_VOLUME_BLEND_DEPTH_COLOR_MASK_WRAPPER_PROOF_STATUS).toBe(
      "source-backed-render-state-blend-depth-color-mask-wrappers-mapped-shadowvol-local-caller-not-using"
    );
    expect(AURORA_SHADOW_VOLUME_IMMEDIATE_CALLER_BUFFER_FLUSH_SOURCE).toContain(
      "888188-888213 calls FUN_00a878f8(DAT_00d0233c)"
    );
    expect(AURORA_SHADOW_VOLUME_IMMEDIATE_CALLER_BUFFER_FLUSH_BLOCKER).toContain(
      "contains no blend/depth/color-mask wrapper call"
    );
    expect(AURORA_SHADOW_VOLUME_IMMEDIATE_CALLER_BUFFER_FLUSH_PROOF_STATUS).toBe(
      "source-backed-shadowvol-immediate-caller-buffer-flush-no-blend-depth-color-mask-state-wrapper"
    );
    expect(AURORA_SHADOW_VOLUME_DIRECT_CALLER_BUFFER_BUILDER_SOURCE).toContain(
      "888069-888414 FUN_00a5fdb4 is the direct caller/buffer builder"
    );
    expect(AURORA_SHADOW_VOLUME_DIRECT_CALLER_BUFFER_BUILDER_BLOCKER).toContain(
      "contains no blend/depth/color-mask raw or facade wrapper call"
    );
    expect(AURORA_SHADOW_VOLUME_DIRECT_CALLER_BUFFER_BUILDER_PROOF_STATUS).toBe(
      "source-backed-shadowvol-direct-caller-buffer-builder-no-blend-depth-color-mask-state-wrapper"
    );
    expect(AURORA_SHADOW_VOLUME_ACTIVE_LIGHT_RENDER_ENVELOPE_STATE).toContain(
      "activeLightGlobal=DAT_00d0233c=param_1"
    );
    expect(AURORA_SHADOW_VOLUME_ACTIVE_LIGHT_RENDER_ENVELOPE_STATE).toContain(
      "vtableDispatch=param_1+0xc+0x108"
    );
    expect(AURORA_SHADOW_VOLUME_ACTIVE_LIGHT_RENDER_ENVELOPE_SOURCE).toContain(
      "910553-910663 FUN_00a82464 creates the active-light render envelope"
    );
    expect(AURORA_SHADOW_VOLUME_ACTIVE_LIGHT_RENDER_ENVELOPE_BLOCKER).toContain(
      "contains no color/depth-mask wrapper call"
    );
    expect(AURORA_SHADOW_VOLUME_ACTIVE_LIGHT_RENDER_ENVELOPE_PROOF_STATUS).toBe(
      "source-backed-shadowvol-active-light-render-envelope-vtable-dispatch-blend-depthfunc-wrapper-exposed-parity-blocked"
    );
    expect(AURORA_SHADOW_VOLUME_LOCAL_DRAW_STATE_ORDER_PROOF_STATUS).toBe(
      "source-backed-shadowvol-local-draw-state-order-exposed-outer-blend-depth-color-mask-parity-blocked"
    );
    expect(AURORA_SHADOW_VOLUME_DRAW_WRAPPER_SOURCE).toContain(
      "FUN_00a78128 wraps FUN_00a75e3c"
    );
    expect(AURORA_SHADOW_VOLUME_RENDER_PATH_PROOF_STATUS).toBe(
      "source-backed-shadowvol-shader-buckets-draw-wrapper-caster-reset-stencil-parity-blocked"
    );
  });

  it("creates an active w-pair extrusion projection preview material", () => {
    const material = createAuroraShadowVolumeProjectionPreviewMaterial({
      lightPosition: [0, 0, 0.3],
      extrusionDistance: 1.5,
      opacity: 0.08
    });

    expect(material.userData.auroraShadowVolumeProjectionPreviewStatus).toBe(
      AURORA_SHADOW_VOLUME_PROJECTION_PREVIEW_STATUS
    );
    expect(material.userData.auroraShadowVolumeProjectionPreviewRendererMode).toBe(
      AURORA_SHADOW_VOLUME_PROJECTION_PREVIEW_RENDERER_MODE
    );
    expect(material.userData.auroraShadowVolumeProjectionPreviewProofStatus).toBe(
      AURORA_SHADOW_VOLUME_PROJECTION_PREVIEW_PROOF_STATUS
    );
    expect(material.vertexShader).toContain("attribute float auroraShadowVolumeW");
    expect(material.vertexShader).toContain(
      "mix(farPosition, position, auroraShadowVolumeW)"
    );
    expect(material.uniforms.auroraShadowVolumeLightPosition.value.toArray()).toEqual([
      0,
      0,
      0.3
    ]);
    expect(material.uniforms.auroraShadowVolumeExtrusionDistance.value).toBe(1.5);
    expect(material.uniforms.auroraShadowVolumeOpacity.value).toBe(0.08);
  });

  it("creates active front/back stencil materials and a nonzero receiver overlay", () => {
    const back = createAuroraShadowVolumeStencilVolumeMaterial("back", {
      lightPosition: [0, 0, 0.3],
      extrusionDistance: 1.5
    });
    const front = createAuroraShadowVolumeStencilVolumeMaterial("front", {
      lightPosition: [0, 0, 0.3],
      extrusionDistance: 1.5
    });
    const zFailBack = createAuroraShadowVolumeStencilVolumeMaterial("back", {
      lightPosition: [0, 0, 0.3],
      extrusionDistance: 1.5,
      depthPass: "zfail"
    });
    const zFailFront = createAuroraShadowVolumeStencilVolumeMaterial("front", {
      lightPosition: [0, 0, 0.3],
      extrusionDistance: 1.5,
      depthPass: "zfail"
    });
    const receiver = createAuroraShadowVolumeStencilReceiverMaterial({
      opacity: 0.09
    });

    expect(back.userData.auroraShadowVolumeStencilPassStatus).toBe(
      AURORA_SHADOW_VOLUME_STENCIL_PASS_STATUS
    );
    expect(back.userData.auroraShadowVolumeStencilRendererMode).toBe(
      AURORA_SHADOW_VOLUME_STENCIL_RENDERER_MODE
    );
    expect(back.userData.auroraShadowVolumeStencilProofStatus).toBe(
      AURORA_SHADOW_VOLUME_STENCIL_PROOF_STATUS
    );
    expect(back.colorWrite).toBe(false);
    expect(back.stencilWrite).toBe(true);
    expect(back.side).toBe(THREE.BackSide);
    expect(back.userData.auroraShadowVolumeStencilDepthPass).toBe("zpass");
    expect(back.stencilZPass).toBe(THREE.DecrementStencilOp);
    expect(back.userData.auroraShadowVolumeStencilZPass).toBe("Decrement");
    expect(back.stencilZFail).toBe(THREE.KeepStencilOp);
    expect(back.userData.auroraShadowVolumeStencilRetailFaceOpTable).toBe(
      AURORA_SHADOW_VOLUME_STENCIL_RETAIL_FACE_OP_TABLE_SUMMARY
    );
    expect(back.userData.auroraShadowVolumeStencilRetailOpSequence).toBe(
      AURORA_SHADOW_VOLUME_STENCIL_RETAIL_OP_SEQUENCE_SUMMARY
    );
    expect(back.userData.auroraShadowVolumeStencilRetailOpSequenceSample).toContain(
      "pass=back:zpass"
    );
    expect(back.userData.auroraShadowVolumeStencilRetailOpSequenceSample).toContain(
      "face=GL_BACK/0x405"
    );
    expect(back.userData.auroraShadowVolumeStencilRetailOpSequenceSample).toContain(
      "zpass=GL_DECR/0x1e03"
    );
    expect(front.side).toBe(THREE.FrontSide);
    expect(front.userData.auroraShadowVolumeStencilDepthPass).toBe("zpass");
    expect(front.stencilZPass).toBe(THREE.IncrementStencilOp);
    expect(front.userData.auroraShadowVolumeStencilZPass).toBe("Increment");
    expect(front.stencilZFail).toBe(THREE.KeepStencilOp);
    expect(front.userData.auroraShadowVolumeStencilRetailOpSequenceSample).toContain(
      "pass=front:zpass"
    );
    expect(front.userData.auroraShadowVolumeStencilRetailOpSequenceSample).toContain(
      "face=GL_FRONT/0x404"
    );
    expect(front.userData.auroraShadowVolumeStencilRetailOpSequenceSample).toContain(
      "zpass=GL_INCR/0x1e02"
    );
    expect(zFailBack.side).toBe(THREE.BackSide);
    expect(zFailBack.userData.auroraShadowVolumeStencilDepthPass).toBe("zfail");
    expect(zFailBack.stencilZPass).toBe(THREE.KeepStencilOp);
    expect(zFailBack.stencilZFail).toBe(THREE.IncrementStencilOp);
    expect(zFailBack.userData.auroraShadowVolumeStencilZFail).toBe("Increment");
    expect(zFailBack.userData.auroraShadowVolumeStencilRetailOpSequenceSample).toContain(
      "pass=back:zfail"
    );
    expect(zFailBack.userData.auroraShadowVolumeStencilRetailOpSequenceSample).toContain(
      "zfail=GL_INCR/0x1e02"
    );
    expect(zFailFront.side).toBe(THREE.FrontSide);
    expect(zFailFront.userData.auroraShadowVolumeStencilDepthPass).toBe("zfail");
    expect(zFailFront.stencilZPass).toBe(THREE.KeepStencilOp);
    expect(zFailFront.stencilZFail).toBe(THREE.DecrementStencilOp);
    expect(zFailFront.userData.auroraShadowVolumeStencilZFail).toBe("Decrement");
    expect(
      zFailFront.userData.auroraShadowVolumeStencilRetailOpSequenceSample
    ).toContain("pass=front:zfail");
    expect(
      zFailFront.userData.auroraShadowVolumeStencilRetailOpSequenceSample
    ).toContain("zfail=GL_DECR/0x1e03");
    expect(zFailFront.userData.auroraShadowVolumeStencilRetailOpSequenceSource).toContain(
      "FUN_00a78344(0,0,0,3)"
    );
    expect(zFailFront.userData.auroraShadowVolumeStencilRetailOpSequenceSource).toContain(
      "slot 0=GL_FRONT"
    );
    expect(zFailFront.userData.auroraShadowVolumeStencilRetailOpSequenceSource).toContain(
      "slot 4=GL_DECR"
    );
    expect(receiver.stencilWrite).toBe(true);
    expect(receiver.stencilFunc).toBe(THREE.NotEqualStencilFunc);
    expect(receiver.stencilRef).toBe(0);
    expect(receiver.stencilZPass).toBe(THREE.KeepStencilOp);
    expect(receiver.opacity).toBe(0.09);
    expect(receiver.userData.auroraShadowVolumeStencilRetailFaceOpTable).toBe(
      AURORA_SHADOW_VOLUME_STENCIL_RETAIL_FACE_OP_TABLE_SUMMARY
    );
    expect(receiver.userData.auroraShadowVolumeStencilRetailOpSequence).toContain(
      "call=FUN_00a78344(1,0,3,0),faceSlot=1,face=GL_BACK/0x405"
    );
    expect(receiver.userData.auroraShadowVolumeStencilProofStatus).toBe(
      AURORA_SHADOW_VOLUME_STENCIL_PROOF_STATUS
    );
  });
});
