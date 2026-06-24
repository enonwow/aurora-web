import type { AuroraMdlEmitterNode } from "../../src/modules/vfx/domain/aurora-mdl-vfx-source.parser";
import {
  buildAuroraVfxRuntimeRenderContract,
  compareAuroraVfxRenderOrder
} from "../../src/modules/vfx/domain/aurora-vfx-render-contract";
import {
  createAuroraEmitterRuntimeState,
  tickAuroraEmitterRuntime,
  type AuroraEmitterRuntimeFamily,
  type AuroraEmitterRuntimeState
} from "../../src/modules/vfx/domain/aurora-vfx-runtime-state";

describe("aurora VFX render contract", () => {
  it("maps active particle count to draw count and non-indexed six-vertex draw provenance", () => {
    const emitter = fountainEmitter({ birthrate: 3 });
    const contract = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(emitter, 3),
      sourceEmitter: emitter
    });

    expect(contract.activeParticleCount).toBe(3);
    expect(contract.drawParticleCount).toBe(3);
    expect(contract.verticesPerDrawParticle).toBe(6);
    expect(contract.drawVertexCount).toBe(18);
    expect(contract.texturedQuadTopology).toMatchObject({
      verticesPerParticle: 6,
      canonicalForChunkLane: false,
      drawRoute: {
        route: "non_indexed_draw_arrays",
        indexed: false,
        drawModeArgument: 3,
        enumTableCaptured: false
      }
    });
    expect(contract.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "VFX_PARTICLE_DRAW_NON_INDEXED_ARRAYS_REQUIRED",
        "VFX_PARTICLE_DRAW_MODE_ARG3_ENUM_TABLE_CAPTURE_REQUIRED",
        "VFX_PARTICLE_DRAW_TRIANGLE_INFERENCE_NOT_ENUM_PROOF"
      ])
    );
  });

  it("carries runtime particle rotation radians into draw records", () => {
    const emitter = fountainEmitter({ birthrate: 1 });
    const contract = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(emitter, 1, { rotations: [1.25] }),
      sourceEmitter: emitter
    });

    expect(contract.drawRecords[0]?.rotationRadians).toBe(1.25);
  });

  it("uses full texture UVs for a single-cell atlas", () => {
    const emitter = fountainEmitter({
      atlas: { effectiveXGrid: 1, effectiveYGrid: 1, frameStart: 0, frameEnd: 0 }
    });
    const contract = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(emitter, 1),
      sourceEmitter: emitter
    });

    expect(contract.drawRecords[0]?.atlasUv).toMatchObject({
      mapping: "single_cell_full_texture",
      u0: 0,
      v0: 0,
      u1: 1,
      v1: 1,
      column: 0,
      row: 0,
      frameIndex: 0
    });
  });

  it("maps atlas frames row-major with top-down V rows", () => {
    const emitter = fountainEmitter({
      atlas: { effectiveXGrid: 4, effectiveYGrid: 4, frameStart: 0, frameEnd: 15 }
    });
    const contract = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(emitter, 1, { frames: [5] }),
      sourceEmitter: emitter
    });

    expect(contract.drawRecords[0]?.atlasUv).toMatchObject({
      mapping: "row_major_top_down_v",
      column: 1,
      row: 1,
      u0: 0.25,
      u1: 0.5,
      v0: 0.5,
      v1: 0.75,
      frameIndex: 5
    });
  });

  it("preserves per-particle frame state and random 1 reset provenance", () => {
    const emitter = fountainEmitter({
      birthrate: 2,
      atlas: {
        effectiveXGrid: 2,
        effectiveYGrid: 2,
        fps: 8,
        frameStart: 0,
        frameEnd: 3,
        random: true
      }
    });
    const contract = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(emitter, 2, { frames: [0, 3] }),
      sourceEmitter: emitter
    });

    expect(contract.drawRecords.map((record) => record.atlasUv.frameIndex)).toEqual([0, 3]);
    expect(contract.drawRecords[0]?.atlasProvenance).toMatchObject({
      randomResetPath: "source_random_1_particle_reset",
      materialLevelFrameOffsetAllowed: false
    });
    expect(contract.drawRecords[1]?.atlasProvenance.checkpointSeconds).toBeGreaterThan(0);
    expect(contract.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "VFX_POC_ATLAS_AGE_FLOOR_PREVIEW_ONLY"
    );
  });

  it("diagnoses descending or out-of-bounds frame ranges without sorting them", () => {
    const emitter = fountainEmitter({
      atlas: { effectiveXGrid: 2, effectiveYGrid: 2, frameStart: 5, frameEnd: 1 }
    });
    const contract = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(emitter, 1, { frames: [5] }),
      sourceEmitter: emitter
    });

    expect(contract.drawRecords[0]?.atlasProvenance).toMatchObject({
      frameStart: 5,
      frameEnd: 1
    });
    expect(contract.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "VFX_ATLAS_FRAME_RANGE_NOT_SORTED",
        "VFX_ATLAS_FRAME_RANGE_OUT_OF_BOUNDS"
      ])
    );
  });

  it("keeps Punch-Through and non-punch render-state lanes separate", () => {
    const normalEmitter = fountainEmitter({ blendMode: "Normal" });
    const punchEmitter = fountainEmitter({ blendMode: "Punch-Through" });
    const normal = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(normalEmitter, 1),
      sourceEmitter: normalEmitter
    });
    const punch = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(punchEmitter, 1),
      sourceEmitter: punchEmitter
    });

    expect(normal.renderState).toMatchObject({
      depthWriteLane: "non_punch_transparent_depth_write_off",
      transparentLane: "non_punch_transparent_lane",
      shaderVariantLane: "non_punch_particle_shader_variant"
    });
    expect(punch.renderState).toMatchObject({
      depthWriteLane: "punch_through_depth_write_enabled",
      transparentLane: "punch_through_cutout_lane",
      shaderVariantLane: "punch_through_particle_shader_variant"
    });
    expect(punch.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "VFX_PUNCH_THROUGH_DEPTHWRITE_LANE_REQUIRED"
    );
  });

  it("preserves raw blend mode 2 token and keeps exact GL factors diagnostic", () => {
    const emitter = fountainEmitter({ blendMode: "Lighten" });
    const contract = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(emitter, 1),
      sourceEmitter: emitter
    });

    expect(contract.blendMode).toMatchObject({
      enum: "mode_2",
      rawToken: "Lighten",
      modeNumber: 2,
      exactGlBlendFactors: "diagnostic_pending"
    });
    expect(contract.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "VFX_PARTICLE_BLEND_MODE_2_RAW_PRESERVED",
        "VFX_BLEND_FUNC_FACTORS_CAPTURE_REQUIRED"
      ])
    );
  });

  it("keeps source transparency false as an opaque non-punch depth-write lane", () => {
    const opaqueEmitter = fountainEmitter({ blendMode: "Normal", transparency: false });
    const punchEmitter = fountainEmitter({
      blendMode: "Punch-Through",
      transparency: false
    });
    const opaque = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(opaqueEmitter, 1),
      sourceEmitter: opaqueEmitter
    });
    const punch = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(punchEmitter, 1),
      sourceEmitter: punchEmitter
    });

    expect(opaque.renderState).toMatchObject({
      depthWriteLane: "source_transparency_false_depth_write_enabled",
      transparentLane: "source_transparency_false_opaque_lane",
      sourceTransparencyLane: "source_transparency_false_opaque_depth_write_lane"
    });
    expect(opaque.drawRecords[0]?.renderState).toMatchObject({
      depthWriteLane: "source_transparency_false_depth_write_enabled",
      transparentLane: "source_transparency_false_opaque_lane"
    });
    expect(opaque.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "VFX_SOURCE_TRANSPARENCY_FALSE_OPAQUE_DEPTHWRITE_REQUIRED"
    );
    expect(punch.renderState).toMatchObject({
      depthWriteLane: "punch_through_depth_write_enabled",
      transparentLane: "punch_through_cutout_lane",
      sourceTransparencyLane: "source_transparency_true_or_missing_blend_lane"
    });
  });

  it("tracks linked-particle draw count as active minus one", () => {
    const emitter = fountainEmitter({ renderMode: "Linked" });
    const contract = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(emitter, 3),
      sourceEmitter: emitter
    });

    expect(contract.renderMode.enum).toBe("linked");
    expect(contract.drawLane).toBe("linked_textured_quad");
    expect(contract.activeParticleCount).toBe(3);
    expect(contract.drawParticleCount).toBe(2);
    expect(contract.drawVertexCount).toBe(12);
    expect(contract.drawRecords[0]).toMatchObject({
      lane: "linked_textured_quad",
      particleId: 1,
      linkedNextParticleId: 2
    });
  });

  it("compares overlapping emitters by preserved renderorder without deriving direction from blend", () => {
    const lowEmitter = fountainEmitter({ nodeName: "emit_low", renderOrder: -10, blendMode: "Normal" });
    const highEmitter = fountainEmitter({ nodeName: "emit_high", renderOrder: 5, blendMode: "Lighten" });
    const low = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(lowEmitter, 1),
      sourceEmitter: lowEmitter
    });
    const high = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(highEmitter, 1),
      sourceEmitter: highEmitter
    });
    const comparison = compareAuroraVfxRenderOrder(low, high);

    expect(low.renderOrder).toMatchObject({ value: -10, source: "mdl-emitter-renderorder" });
    expect(high.renderOrder).toMatchObject({ value: 5, source: "mdl-emitter-renderorder" });
    expect(comparison).toMatchObject({
      valueRelation: "left_lower",
      drawDirection: "diagnostic_pending"
    });
    expect(comparison.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "VFX_RENDERORDER_ADAPTER_DIRECTION_PROVENANCE_REQUIRED"
    );
  });

  it("keeps two-sided texture as a cull lane instead of rewriting blend", () => {
    const emitter = fountainEmitter({ twoSidedTexture: true, blendMode: "Normal" });
    const contract = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(emitter, 1),
      sourceEmitter: emitter
    });

    expect(contract.renderState).toMatchObject({
      twoSidedTextureLane: "two_sided_texture_cull_disabled",
      blendMode: {
        enum: "normal"
      }
    });
    expect(contract.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "VFX_TWOSIDEDTEX_STATE3_CULL_LANE_REQUIRED"
    );
  });

  it("keeps twosided material branch separate from twosidedtex cull state", () => {
    const materialEmitter = fountainEmitter({
      twoSidedMaterial: true,
      twoSidedTexture: false
    });
    const textureEmitter = fountainEmitter({
      twoSidedTexture: true
    });
    const volumetricMaterialEmitter = fountainEmitter({
      twoSidedMaterial: true,
      volumetric: true
    });
    const material = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(materialEmitter, 1),
      sourceEmitter: materialEmitter
    });
    const texture = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(textureEmitter, 1),
      sourceEmitter: textureEmitter
    });
    const volumetricMaterial = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(volumetricMaterialEmitter, 1),
      sourceEmitter: volumetricMaterialEmitter
    });

    expect(material.renderState).toMatchObject({
      twoSidedTextureLane: "default_cull_lane",
      twoSidedMaterialLane: {
        twoSidedMaterial: true,
        volumetric: false,
        renderWrapperArgument: 1,
        lane: "two_sided_material_non_volumetric_runtime_arg1"
      }
    });
    expect(material.drawRecords[0]?.renderState.twoSidedMaterialLane).toMatchObject({
      renderWrapperArgument: 1,
      lane: "two_sided_material_non_volumetric_runtime_arg1"
    });
    expect(material.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "VFX_TWOSIDED_MATERIAL_RUNTIME_ARG1_REQUIRED"
    );
    expect(texture.renderState).toMatchObject({
      twoSidedTextureLane: "two_sided_texture_cull_disabled",
      twoSidedMaterialLane: {
        twoSidedMaterial: false,
        renderWrapperArgument: 0,
        lane: "default_material_sidedness_runtime_arg0"
      }
    });
    expect(volumetricMaterial.renderState.twoSidedMaterialLane).toMatchObject({
      twoSidedMaterial: true,
      volumetric: true,
      renderWrapperArgument: 0,
      lane: "two_sided_material_volumetric_runtime_arg0"
    });
    expect(volumetricMaterial.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "VFX_TWOSIDED_MATERIAL_VOLUMETRIC_ARG0_REQUIRED"
    );
  });

  it("keeps sample_framebuffer and volumetric on Aurora framebuffer runtime lanes", () => {
    const mode2Emitter = fountainEmitter({ sampleFramebuffer: 2, volumetric: true });
    const mode1Emitter = fountainEmitter({ sampleFramebuffer: 1 });
    const volumetricEmitter = fountainEmitter({ sampleFramebuffer: 0, volumetric: true });
    const mode2 = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(mode2Emitter, 1),
      sourceEmitter: mode2Emitter
    });
    const mode1 = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(mode1Emitter, 1),
      sourceEmitter: mode1Emitter
    });
    const volumetric = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(volumetricEmitter, 1),
      sourceEmitter: volumetricEmitter
    });

    expect(mode2.renderState.framebufferLane).toMatchObject({
      sampleFramebuffer: 2,
      volumetric: true,
      runtimeLane: 6,
      lane: "sample_framebuffer_mode_2_runtime_lane_6",
      exactGlState: "diagnostic_pending"
    });
    expect(mode2.drawRecords[0]?.renderState.framebufferLane).toMatchObject({
      runtimeLane: 6,
      lane: "sample_framebuffer_mode_2_runtime_lane_6"
    });
    expect(mode1.renderState.framebufferLane).toMatchObject({
      sampleFramebuffer: 1,
      volumetric: false,
      runtimeLane: 5,
      lane: "sample_framebuffer_mode_1_runtime_lane_5"
    });
    expect(volumetric.renderState.framebufferLane).toMatchObject({
      sampleFramebuffer: 0,
      volumetric: true,
      runtimeLane: 5,
      lane: "volumetric_runtime_lane_5"
    });
    expect(mode2.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "VFX_SAMPLE_FRAMEBUFFER_MODE2_RUNTIME_LANE_6_REQUIRED",
        "VFX_SAMPLE_FRAMEBUFFER_RENDER_LANE_CAPTURE_REQUIRED"
      ])
    );
    expect(mode1.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "VFX_SAMPLE_FRAMEBUFFER_MODE1_RUNTIME_LANE_5_REQUIRED"
    );
    expect(volumetric.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "VFX_VOLUMETRIC_RUNTIME_LANE_5_REQUIRED"
    );
  });

  it("does not collapse chunk particles into the textured quad lane", () => {
    const emitter = fountainEmitter({
      nodeName: "emit_chunk",
      chunkName: "fx_chunk01",
      texture: "fx_texture_raw"
    });
    const contract = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(emitter, 2, { family: "Chunk" }),
      sourceEmitter: emitter,
      collapseChunkToTextureLane: true
    });

    expect(contract.drawLane).toBe("chunk_model");
    expect(contract.activeParticleCount).toBe(2);
    expect(contract.drawParticleCount).toBe(0);
    expect(contract.verticesPerDrawParticle).toBe(0);
    expect(contract.drawVertexCount).toBe(0);
    expect(contract.drawRecords).toEqual([]);
    expect(contract.chunkLane).toMatchObject({
      lane: "chunk_model",
      chunkName: "fx_chunk01",
      texturedQuadCanonical: false,
      collapseAttempted: true
    });
    expect(contract.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "VFX_CHUNK_MODEL_RESOURCE_CLASS_REQUIRED",
        "VFX_TEXTURE_FIELD_LANE_COLLAPSED"
      ])
    );
  });

  it("preserves ticked Chunk runtime placeholders in the chunk-model render lane", () => {
    const emitter = chunkEmitter({
      nodeName: "emit_chunk_runtime",
      chunkName: "progfx_type9_chunk_model_pending",
      texture: "fx_texture_raw"
    });
    const runtimeState = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitter, { family: "Chunk" }),
      0.25
    );
    const contract = buildAuroraVfxRuntimeRenderContract({
      runtimeState,
      sourceEmitter: emitter,
      collapseChunkToTextureLane: true
    });

    expect(runtimeState.activeParticleIds).toHaveLength(2);
    expect(contract).toMatchObject({
      drawLane: "chunk_model",
      activeParticleCount: 2,
      drawParticleCount: 0,
      verticesPerDrawParticle: 0,
      drawVertexCount: 0,
      chunkLane: {
        lane: "chunk_model",
        chunkName: "progfx_type9_chunk_model_pending",
        activeParticleCount: 2,
        texturedQuadCanonical: false,
        collapseAttempted: true
      }
    });
    expect(contract.drawRecords).toEqual([]);
    expect(contract.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "VFX_CHUNK_MODEL_LANE_PRESERVED",
        "VFX_CHUNK_LOCAL_PLACEHOLDER_DIAGNOSTIC",
        "VFX_CHUNK_RETAIL_RESOURCE_CAPTURE_REQUIRED",
        "VFX_CHUNK_MODEL_RESOURCE_CLASS_REQUIRED",
        "VFX_TEXTURE_FIELD_LANE_COLLAPSED"
      ])
    );
  });

  it("stays renderer-agnostic and does not depend on Three.js, GLB, screenshots, or frontend code", () => {
    const emitter = fountainEmitter();
    const contract = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(emitter, 1),
      sourceEmitter: emitter
    });

    expect(contract.rendererAgnostic).toBe(true);
    expect(contract.frontendRendererImplemented).toBe(false);
    expect(contract.adapterBoundaries).toMatchObject({
      threeMaterialSettingsAreSourceTruth: false,
      spriteMaterialIsCanonical: false,
      shaderMaterialIsCanonical: false,
      glbPreviewIsCanonical: false,
      materialLevelAtlasFrameOffsetAllowed: false
    });
  });
});

function fountainEmitter(
  overrides: {
    nodeName?: string;
    birthrate?: number;
    lifeExp?: number;
    renderMode?: string;
    blendMode?: string;
    renderOrder?: number;
    transparency?: boolean;
    twoSidedMaterial?: boolean;
    twoSidedTexture?: boolean;
    sampleFramebuffer?: number;
    volumetric?: boolean;
    texture?: string;
    chunkName?: string;
    atlas?: {
      effectiveXGrid: number;
      effectiveYGrid: number;
      fps?: number;
      frameStart?: number;
      frameEnd?: number;
      random?: boolean;
    };
  } = {}
): AuroraMdlEmitterNode {
  const atlas = overrides.atlas ?? {
    effectiveXGrid: 2,
    effectiveYGrid: 2,
    fps: 4,
    frameStart: 0,
    frameEnd: 3
  };
  return {
    nodeKind: "emitter",
    nodeName: overrides.nodeName ?? "emit_fountain",
    sourceFormat: "aurora-mdl-ascii",
    sourceModelObjectKey: "modules/current/models/fountain.mdl",
    provenance: {
      sourceFormat: "aurora-mdl-ascii",
      sourceModelObjectKey: "modules/current/models/fountain.mdl"
    },
    emitterType: "Fountain",
    emitterTypeRaw: "Fountain",
    ...(overrides.texture ? { texture: overrides.texture } : {}),
    ...(overrides.chunkName ? { chunkName: overrides.chunkName } : {}),
    renderMode: overrides.renderMode ?? "Billboard_to_World_Z",
    renderModeRaw: overrides.renderMode ?? "Billboard_to_World_Z",
    blendMode: overrides.blendMode ?? "Normal",
    blendModeRaw: overrides.blendMode ?? "Normal",
    atlas,
    simulation: {
      birthrate: overrides.birthrate ?? 1,
      lifeExp: overrides.lifeExp ?? 10,
      velocity: 0,
      randvel: 0,
      spread: 0,
      grav: 0,
      colorStart: [1, 1, 1],
      colorMid: [1, 1, 1],
      colorEnd: [1, 1, 1],
      alphaStart: 1,
      alphaMid: 1,
      alphaEnd: 1,
      sizeStart: 1,
      sizeMid: 1,
      sizeEnd: 1
    },
    sourceState: {
      ...(overrides.renderOrder !== undefined ? { renderOrder: overrides.renderOrder } : {}),
      ...(overrides.transparency !== undefined
        ? { transparency: overrides.transparency }
        : {}),
      ...(overrides.twoSidedMaterial !== undefined
        ? { twoSidedMaterial: overrides.twoSidedMaterial }
        : {}),
      ...(overrides.twoSidedTexture !== undefined
        ? { twoSidedTexture: overrides.twoSidedTexture }
        : {}),
      ...(overrides.sampleFramebuffer !== undefined
        ? { sampleFramebuffer: overrides.sampleFramebuffer }
        : {}),
      ...(overrides.volumetric !== undefined ? { volumetric: overrides.volumetric } : {})
    },
    directRows: [],
    keyRows: [],
    bezierKeyRows: [],
    colorTimelines: {}
  };
}

function chunkEmitter(overrides: Parameters<typeof fountainEmitter>[0] = {}): AuroraMdlEmitterNode {
  return {
    ...fountainEmitter(overrides),
    emitterType: "Chunk",
    emitterTypeRaw: "Chunk"
  };
}

function runtimeStateWithParticles(
  emitter: AuroraMdlEmitterNode,
  count: number,
  options: {
    frames?: number[];
    rotations?: number[];
    family?: AuroraEmitterRuntimeFamily;
  } = {}
): AuroraEmitterRuntimeState {
  const state = createAuroraEmitterRuntimeState(emitter, {
    family: options.family
  });
  const activeParticleIds = Array.from({ length: count }, (_, index) => index + 1);
  return {
    ...state,
    nextParticleId: count + 1,
    activeParticleIds,
    particles: activeParticleIds.map((particleId, index) => ({
      particleId,
      slotIndex: index,
      list: "active",
      ageSeconds: index * 0.125,
      lifetimeSeconds: 10,
      rotationRadians: options.rotations?.[index] ?? 0,
      position: { x: index, y: index + 1, z: index + 2 },
      velocity: { x: 0, y: 0, z: 0 },
      acceleration: { x: 0, y: 0, z: 0 },
      color: { r: 1, g: 1, b: 1 },
      alpha: 1,
      size: { x: 1, y: 1 },
      atlas: {
        frameIndex: options.frames?.[index] ?? emitter.atlas?.frameStart ?? 0,
        checkpointSeconds: index * 0.125,
        ...(emitter.atlas?.fps ? { secondsPerFrame: 1 / emitter.atlas.fps } : {}),
        ...(emitter.atlas?.frameStart !== undefined ? { frameStart: emitter.atlas.frameStart } : {}),
        ...(emitter.atlas?.frameEnd !== undefined ? { frameEnd: emitter.atlas.frameEnd } : {})
      },
      resetReason: "spawned"
    }))
  };
}
