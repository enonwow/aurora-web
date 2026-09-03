import type { AuroraMdlEmitterNode } from "../../src/modules/vfx/domain/aurora-mdl-vfx-source.parser";
import type { AuroraVfxDependencyGraph } from "../../src/modules/vfx/domain/aurora-vfx-dependency-graph";
import {
  buildAuroraVfxRuntimeRenderContract,
  compareAuroraVfxRenderOrder
} from "../../src/modules/vfx/domain/aurora-vfx-render-contract";
import {
  buildAuroraVfxPhaseSchedule,
  parseAuroraProgFxTwoDa,
  parseAuroraVisualEffectsTwoDa
} from "../../src/modules/vfx/domain/aurora-vfx-source.parser";
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
        enumTableCaptured: true,
        glPrimitiveMode: "GL_TRIANGLES",
        glPrimitiveModeEnum: 0x0004,
        triangleListInferenceProof: "confirmed_draw_wrapper_table_index_3_gl_triangles"
      }
    });
    expect(contract.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "VFX_PARTICLE_DRAW_NON_INDEXED_ARRAYS_REQUIRED",
        "VFX_PARTICLE_DRAW_GL_TRIANGLES_CONFIRMED"
      ])
    );
  });

  it("carries runtime particle rotation radians into draw records", () => {
    const emitter = fountainEmitter({ birthrate: 1 });
    const runtimeState = runtimeStateWithParticles(emitter, 1, { rotations: [1.25] });
    runtimeState.particles[0]!.ageSeconds = 0.375;
    runtimeState.particles[0]!.lifetimeSeconds = 1.25;
    const contract = buildAuroraVfxRuntimeRenderContract({
      runtimeState,
      sourceEmitter: emitter
    });

    expect(contract.drawRecords[0]).toMatchObject({
      rotationRadians: 1.25,
      ageSeconds: 0.375,
      lifetimeSeconds: 1.25
    });
  });

  it("carries the source-derived particle orientation into aligned-to-particle draw records", () => {
    const emitter = fountainEmitter({ renderMode: "Aligned_to_Particle_Dir" });
    const runtimeState = runtimeStateWithParticles(emitter, 1);
    runtimeState.particles[0]!.particleOrientation = {
      axis: [0, 1, 0],
      angleRadians: Math.PI / 2
    };
    const contract = buildAuroraVfxRuntimeRenderContract({ runtimeState, sourceEmitter: emitter });

    expect(contract.drawRecords[0]?.particleOrientation).toEqual({
      axis: [0, 1, 0],
      angleRadians: Math.PI / 2
    });
  });

  it("classifies the source Normal render token as Aurora mode zero", () => {
    const emitter = fountainEmitter({ renderMode: "Normal" });
    const contract = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(emitter, 1),
      sourceEmitter: emitter
    });

    expect(contract.renderMode).toEqual({
      enum: "normal",
      rawToken: "Normal",
      source: "mdl-emitter-render-token"
    });
  });

  it("carries the evaluated emitter orientation into Local-Z draw records", () => {
    const emitter = fountainEmitter({ renderMode: "Billboard_to_Local_Z" });
    emitter.transform = {
      orientation: { axis: [0, 1, 0], angleRadians: Math.PI / 2 }
    };
    const contract = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(emitter, 1),
      sourceEmitter: emitter
    });

    expect(contract.drawRecords[0]?.emitterOrientation).toEqual({
      axis: [0, 1, 0],
      angleRadians: Math.PI / 2
    });
  });

  it("carries airborne and landed Chunk orientation state into the chunk render lane", () => {
    const emitter = fountainEmitter({
      nodeName: "emit_chunk_axis",
      chunkName: "fx_chunk01"
    });
    const runtimeState = runtimeStateWithParticles(emitter, 1, { family: "Chunk" });
    runtimeState.particles[0]!.rotationAxis = { x: 0, y: 0, z: 1 };
    runtimeState.particles[0]!.particleOrientation = {
      axis: [-1, 0, 0],
      angleRadians: Math.PI / 2
    };
    runtimeState.particles[0]!.landed = true;
    runtimeState.particles[0]!.contactNormal = { x: 0, y: 1, z: 0 };
    const contract = buildAuroraVfxRuntimeRenderContract({
      runtimeState,
      sourceEmitter: emitter
    });

    expect(contract.chunkLane?.particleInstances[0]).toMatchObject({
      rotationAxis: { x: 0, y: 0, z: 1 },
      particleOrientation: {
        axis: [-1, 0, 0],
        angleRadians: Math.PI / 2
      },
      landed: true,
      contactNormal: { x: 0, y: 1, z: 0 }
    });
  });

  it("carries landed splat contact state into canonical draw records", () => {
    const emitter = fountainEmitter({ birthrate: 1 });
    emitter.sourceState = { ...emitter.sourceState, splat: true };
    const runtimeState = runtimeStateWithParticles(emitter, 1);
    runtimeState.particles[0]!.landed = true;
    runtimeState.particles[0]!.contactNormal = { x: 0, y: 0, z: 1 };
    const contract = buildAuroraVfxRuntimeRenderContract({
      runtimeState,
      sourceEmitter: emitter
    });

    expect(contract.drawRecords[0]).toMatchObject({
      landed: true,
      splat: true,
      contactNormal: { x: 0, y: 0, z: 1 }
    });
  });

  it("keeps Aurora inheritVel state separate in particle draw records", () => {
    const emitter = fountainEmitter({ birthrate: 1 });
    emitter.simulation = { ...emitter.simulation, inheritPart: true };
    const runtimeState = runtimeStateWithParticles(emitter, 1);
    runtimeState.particles[0]!.inheritedVelocityMagnitude = 4;
    runtimeState.particles[0]!.inheritedVelocityDirection = { x: 1, y: 0, z: 0 };
    runtimeState.particles[0]!.direction = { x: 0, y: 1, z: 0 };
    const contract = buildAuroraVfxRuntimeRenderContract({
      runtimeState,
      sourceEmitter: emitter
    });

    expect(contract.drawRecords[0]).toMatchObject({
      velocity: { x: 0, y: 0, z: 0 },
      direction: { x: 0, y: 1, z: 0 },
      inheritedVelocityMagnitude: 4,
      inheritedVelocityDirection: { x: 1, y: 0, z: 0 },
      inheritPart: true
    });
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
    expect(contract.drawRecords[0]?.atlasUv).toMatchObject({
      frameIndex: 5,
      rawFrameIndex: 5,
      column: 1,
      row: 2,
      u0: 0.5,
      u1: 1,
      v0: -0.5,
      v1: 0
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
      blendMode: {
        exactGlBlendFactors: {
          status: "confirmed",
          sourceFactor: "GL_SRC_ALPHA",
          destinationFactor: "GL_ONE_MINUS_SRC_ALPHA",
          blendTableIndices: [0, 1]
        }
      },
      depthWriteLane: "non_punch_transparent_depth_write_off",
      transparentLane: "non_punch_transparent_lane",
      shaderVariantLane: "non_punch_particle_shader_variant"
    });
    expect(punch.renderState).toMatchObject({
      blendMode: {
        exactGlBlendFactors: {
          status: "not_invoked_punch_through_lane"
        }
      },
      depthWriteLane: "punch_through_depth_write_enabled",
      transparentLane: "punch_through_cutout_lane",
      shaderVariantLane: "punch_through_particle_shader_variant",
      alphaDiscardLane: "punch_through_runtime_uniform_0_2",
      alphaDiscardValue: 0.2,
      alphaDiscardValueSource: "nwtoolset-1.5.0.5-disassembly"
    });
    expect(punch.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "VFX_PUNCH_THROUGH_DEPTHWRITE_LANE_REQUIRED"
    );
    expect(punch.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "VFX_PUNCH_THROUGH_RUNTIME_ALPHA_DISCARD_CONFIRMED"
    );
  });

  it("preserves raw blend mode 2 token with recovered exact GL factors", () => {
    const emitter = fountainEmitter({ blendMode: "Lighten" });
    const contract = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(emitter, 1),
      sourceEmitter: emitter
    });

    expect(contract.blendMode).toMatchObject({
      enum: "mode_2",
      rawToken: "Lighten",
      modeNumber: 2,
      exactGlBlendFactors: {
        status: "confirmed",
        sourceFactor: "GL_SRC_ALPHA",
        sourceFactorGlEnum: 0x0302,
        destinationFactor: "GL_ONE",
        destinationFactorGlEnum: 0x0001,
        blendTableIndices: [0, 2],
        source: "nwtoolset-1.5.0.5-disassembly"
      }
    });
    expect(contract.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "VFX_PARTICLE_BLEND_MODE_2_RAW_PRESERVED",
        "VFX_BLEND_FUNC_FACTORS_CONFIRMED_NWTOOLSET_DISASSEMBLY"
      ])
    );
    expect(contract.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain(
      "VFX_BLEND_FUNC_FACTORS_CAPTURE_REQUIRED"
    );
  });

  it("keeps source transparency false as an opaque non-punch depth-write lane", () => {
    const opaqueEmitter = fountainEmitter({ blendMode: "Normal" });
    const punchEmitter = fountainEmitter({ blendMode: "Punch-Through" });
    const opaque = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(opaqueEmitter, 1),
      sourceEmitter: opaqueEmitter,
      materialState: { source: "aurora-mtr", transparency: false }
    });
    const punch = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(punchEmitter, 1),
      sourceEmitter: punchEmitter,
      materialState: { source: "aurora-mtr", transparency: false }
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
    const runtimeState = runtimeStateWithParticles(emitter, 3);
    runtimeState.activeParticleIds = [3, 1, 2];
    runtimeState.particles.reverse();
    const contract = buildAuroraVfxRuntimeRenderContract({
      runtimeState,
      sourceEmitter: emitter
    });

    expect(contract.renderMode.enum).toBe("linked");
    expect(contract.drawLane).toBe("linked_textured_quad");
    expect(contract.activeParticleCount).toBe(3);
    expect(contract.drawParticleCount).toBe(2);
    expect(contract.drawVertexCount).toBe(12);
    expect(contract.drawRecords[0]).toMatchObject({
      lane: "linked_textured_quad",
      particleId: 3,
      position: { x: 2, y: 3, z: 4 },
      linkedNextParticleId: 1,
      linkedNextPosition: { x: 0, y: 1, z: 2 }
    });
    expect(contract.drawRecords[1]).toMatchObject({
      particleId: 1,
      linkedNextParticleId: 2,
      linkedNextPosition: { x: 1, y: 2, z: 3 }
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
      drawDirection: "lower_renderorder_first_when_primary_keys_tie",
      comparisonScope: "depth_and_referenced_object_keys_tie"
    });
    expect(comparison.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "VFX_RENDERORDER_CONTEXTUAL_TIE_BREAK_CONFIRMED"
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
    const materialEmitter = fountainEmitter({ twoSidedTexture: false });
    const textureEmitter = fountainEmitter({
      twoSidedTexture: true
    });
    const volumetricMaterialEmitter = fountainEmitter();
    const material = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(materialEmitter, 1),
      sourceEmitter: materialEmitter,
      materialState: { source: "aurora-mtr", twoSided: true }
    });
    const texture = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(textureEmitter, 1),
      sourceEmitter: textureEmitter
    });
    const volumetricMaterial = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(volumetricMaterialEmitter, 1),
      sourceEmitter: volumetricMaterialEmitter,
      materialState: { source: "aurora-mtr", twoSided: true, volumetric: true }
    });

    expect(material.renderState).toMatchObject({
      twoSidedTextureLane: "default_cull_lane",
      twoSidedMaterialLane: {
        twoSidedMaterial: true,
        volumetric: false,
        renderWrapperArgument: 1,
        lane: "two_sided_material_non_volumetric_runtime_arg1",
        exactGlState: {
          state3CullFace: "disabled",
          retainedCullFaceMode: "GL_BACK",
          frontFaceWinding: "not_modified_by_render_wrapper",
          particleEmitterOverride: "twosidedtex_live_read_after_render_wrapper",
          queueExitRestore: "state3_enabled_gl_back",
          source: "nwtoolset-1.5.0.5-scene-queue-cull-disassembly"
        }
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
      lane: "two_sided_material_volumetric_runtime_arg0",
      exactGlState: {
        state3CullFace: "enabled",
        retainedCullFaceMode: "GL_BACK",
        frontFaceWinding: "not_modified_by_render_wrapper"
      }
    });
    expect(volumetricMaterial.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "VFX_TWOSIDED_MATERIAL_VOLUMETRIC_ARG0_REQUIRED"
    );
  });

  it("keeps sample_framebuffer and volumetric on Aurora framebuffer runtime lanes", () => {
    const mode2Emitter = fountainEmitter();
    const mode1Emitter = fountainEmitter();
    const volumetricEmitter = fountainEmitter();
    const mode2 = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(mode2Emitter, 1),
      sourceEmitter: mode2Emitter,
      materialState: { source: "aurora-mtr", sampleFramebuffer: 2, volumetric: true }
    });
    const mode1 = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(mode1Emitter, 1),
      sourceEmitter: mode1Emitter,
      materialState: { source: "aurora-mtr", sampleFramebuffer: 1 }
    });
    const volumetric = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(volumetricEmitter, 1),
      sourceEmitter: volumetricEmitter,
      materialState: { source: "aurora-mtr", sampleFramebuffer: 0, volumetric: true }
    });

    expect(mode2.renderState.framebufferLane).toMatchObject({
      sampleFramebuffer: 2,
      volumetric: true,
      runtimeLane: 6,
      lane: "sample_framebuffer_mode_2_runtime_lane_6",
      exactGlState: "confirmed_active_framebuffer_copy_and_texture_units_11_12",
      captureScope: "mainscene_only",
      captureSource: "active_framebuffer_slot",
      captureDestinationSlot: 6,
      attachmentBindingMask: 3,
      colorTextureUnit: 11,
      depthTextureUnit: 12
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
        "VFX_SAMPLE_FRAMEBUFFER_RENDER_PASS_CONFIRMED"
      ])
    );
    expect(mode1.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "VFX_SAMPLE_FRAMEBUFFER_MODE1_RUNTIME_LANE_5_REQUIRED"
    );
    expect(volumetric.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "VFX_VOLUMETRIC_RUNTIME_LANE_5_REQUIRED"
    );
  });

  it("does not promote material-only fields from node emitter into canonical render state", () => {
    const emitter = fountainEmitter({
      transparency: false,
      twoSidedMaterial: true,
      sampleFramebuffer: 2,
      volumetric: true
    });
    const contract = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(emitter, 1),
      sourceEmitter: emitter
    });

    expect(contract.renderState).toMatchObject({
      depthWriteLane: "non_punch_transparent_depth_write_off",
      twoSidedMaterialLane: {
        twoSidedMaterial: false,
        lane: "default_material_sidedness_runtime_arg0"
      },
      framebufferLane: {
        runtimeLane: null,
        lane: "default_framebuffer_runtime_lane"
      }
    });
    expect(contract.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "VFX_MTR_FIELDS_ON_EMITTER_SOURCE_IGNORED"
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
      texturedQuadCanonical: false,
      collapseAttempted: true
    });
    expect(contract.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "VFX_CHUNK_MODEL_RESOURCE_CLASS_REQUIRED",
        "VFX_CHUNK_MODEL_IMPACT_ANIMATION_START_CONFIRMED",
        "VFX_TEXTURE_FIELD_LANE_COLLAPSED"
      ])
    );
  });

  it("preserves resolved chunk-model dependency candidates on the chunk lane", () => {
    const emitter = fountainEmitter({
      nodeName: "emit_chunk_resolved",
      chunkName: "fx_chunk01",
      texture: "fx_texture_raw"
    });
    const dependencyGraph = createChunkDependencyGraph("fx_chunk01", {
      candidateId: "candidate:fx_chunk01.glb",
      sourceLayer: "hak",
      resourceKey: "fx_chunk01.glb",
      sourcePath: "hak/models/fx_chunk01.glb",
      hakName: "vfx_assets.hak",
      resourceHash: "chunk-glb-hash",
      precedenceRank: 2
    });
    const contract = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(emitter, 2, { family: "Chunk" }),
      sourceEmitter: emitter,
      dependencyGraph,
      collapseChunkToTextureLane: true
    });

    expect(contract.drawLane).toBe("chunk_model");
    expect(contract.drawParticleCount).toBe(0);
    expect(contract.drawVertexCount).toBe(0);
    expect(contract.drawRecords).toEqual([]);
    expect(contract.chunkLane).toMatchObject({
      lane: "chunk_model",
      chunkName: "fx_chunk01",
      activeParticleCount: 2,
      particleInstances: [
        { particleId: 1, position: { x: 0, y: 1, z: 2 } },
        { particleId: 2, position: { x: 1, y: 2, z: 3 } }
      ],
      texturedQuadCanonical: false,
      collapseAttempted: true,
      resourceResolveStatus: "resolved",
      resolvedResource: {
        requestedRef: "fx_chunk01",
        resourceKey: "fx_chunk01.glb",
        sourceLayer: "hak",
        sourcePath: "hak/models/fx_chunk01.glb",
        hakName: "vfx_assets.hak",
        resourceHash: "chunk-glb-hash",
        candidateId: "candidate:fx_chunk01.glb",
        precedenceRank: 2,
        resolutionSource: "dependency-graph-selected-candidate"
      }
    });
    expect(contract.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "VFX_CHUNK_MODEL_RESOURCE_CLASS_REQUIRED",
        "VFX_TEXTURE_FIELD_LANE_COLLAPSED",
        "VFX_CHUNK_MODEL_RESOURCE_RESOLVED"
      ])
    );
  });

  it("does not route a textured emitter through a sibling chunk dependency", () => {
    const emitter = fountainEmitter({
      nodeName: "emit_textured_sibling",
      texture: "fxpa_smoke01"
    });
    const dependencyGraph = createChunkDependencyGraph("fx_chunk01", {
      candidateId: "candidate:fx_chunk01.glb",
      sourceLayer: "hak",
      resourceKey: "fx_chunk01.glb",
      sourcePath: "hak/models/fx_chunk01.glb",
      resourceHash: "chunk-glb-hash",
      precedenceRank: 2
    });
    const contract = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(emitter, 2, { family: "Fountain" }),
      sourceEmitter: emitter,
      dependencyGraph
    });

    expect(contract.drawLane).toBe("textured_quad");
    expect(contract.drawParticleCount).toBe(2);
    expect(contract.chunkLane).toBeUndefined();
  });

  it("preserves the chunk-model lane without synthesizing standalone Chunk particles", () => {
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

    expect(runtimeState.activeParticleIds).toHaveLength(0);
    expect(contract).toMatchObject({
      drawLane: "chunk_model",
      activeParticleCount: 0,
      drawParticleCount: 0,
      verticesPerDrawParticle: 0,
      drawVertexCount: 0,
      chunkLane: {
        lane: "chunk_model",
        chunkName: "progfx_type9_chunk_model_pending",
        activeParticleCount: 0,
        texturedQuadCanonical: false,
        collapseAttempted: true
      }
    });
    expect(contract.drawRecords).toEqual([]);
    expect(contract.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "VFX_CHUNK_NAME_IS_RENDER_LANE_NOT_UPDATE_FAMILY",
        "VFX_CHUNK_UPDATE_FAMILY_REQUIRED",
        "VFX_CHUNK_MODEL_RESOURCE_CLASS_REQUIRED",
        "VFX_TEXTURE_FIELD_LANE_COLLAPSED"
      ])
    );
  });

  it("preserves ProgFX Type 4 light owner-phase evidence without creating a generic light", () => {
    const visualEffect = parseAuroraVisualEffectsTwoDa(
      [
        "2DA V2.0",
        "",
        "Label Type_FD ProgFX_Duration",
        "153 VFX_DUR_LIGHT_BLUE_5 D 304"
      ].join("\n"),
      "progfx-type4-owner-fixture"
    ).rows[0]!;
    const phaseSchedule = buildAuroraVfxPhaseSchedule(visualEffect, {
      constructorKind: "EffectVisualEffect",
      sourceRowId: 153,
      applicationMode: "object",
      durationType: "temporary",
      durationSeconds: 6,
      targetRef: "object:target"
    });
    const progFxRows = parseAuroraProgFxTwoDa(
      [
        "2DA V2.0",
        "",
        "Label Type Param1 Param2 Param3 Param4 Param5 Param6 Param7 Param8",
        "304 LightBlue5m 4 Blue_5m 1 0 20 0 0 fx_light_clr ****"
      ].join("\n"),
      "progfx-type4-owner-fixture"
    ).rows;
    const emitter = fountainEmitter({ birthrate: 1 });
    const contract = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(emitter, 1),
      sourceEmitter: emitter,
      phaseSchedule,
      progFxRows
    });

    expect(phaseSchedule.status).toBe("ready");
    expect(contract.progFxType4Light).toMatchObject({
      rowId: 304,
      label: "LightBlue5m",
      animationRaw: "Blue_5m",
      animation: "Blue_5m",
      animationParameterStatus:
        "source-backed-progfx-type4-param1-animation-token-preserved",
      animationKind: "light",
      symbolicColor: "Blue",
      tokenRadiusMeters: 5,
      tokenRadiusProofStatus: "source-backed-progfx-param1-animation-token-radius",
      radiusMeters: 13.3,
      radiusProofStatus: "source-family-backed-fx_light_clr-mdl-animation-radius",
      sourceMdlNodeName: "AuroraLight01",
      sourceMdlAnimation: "Blue_5m",
      sourceMdlColor: { r: 0.5, g: 0.5, b: 1 },
      sourceMdlRadiusMeters: 13.3,
      sourceMdlRadiusFrames: [0, 13.3],
      sourceMdlColorProofStatus: "source-family-backed-fx_light_clr-mdl-animation-rgb",
      sourceMdlRadiusProofStatus: "source-family-backed-fx_light_clr-mdl-animation-radius",
      castShadowsRaw: "0",
      castShadowParameterStatus:
        "source-backed-progfx-type4-param3-cast-shadows-preserved-item-toggle-known-non-item-vanilla-cast-shadow-absent",
      priorityRaw: "20",
      priority: 20,
      priorityParameterStatus:
        "docs-backed-progfx-type4-param4-priority-lower-value-wins",
      proximitySuppressionRaw: "0",
      proximitySuppressionParameterStatus:
        "docs-backed-progfx-type4-param5-proximity-suppression-near-other-light",
      attachToSceneRaw: "0",
      sceneAttachmentParameterStatus:
        "docs-backed-progfx-type4-param6-attach-to-scene-removes-scene-lights",
      modelRaw: "fx_light_clr",
      modelRef: "fx_light_clr",
      parameterPreservationProofStatus:
        "source-backed-progfx-type4-param1-param8-raw-preserved",
      proofStatus:
        "source-backed-progfx-type4-owner-phase-effect-instance-runtime-retail-unverified",
      runtimeSchedulingStatus:
        "source-backed-owner-phase-effect-instance-ready-retail-runtime-unverified",
      sceneAttachmentPolicyStatus:
        "docs-backed-progfx-type4-param6-attach-to-scene-removes-scene-lights-retail-dataflow-blocked",
      proximitySuppressionPolicyStatus:
        "docs-backed-progfx-type4-param5-proximity-suppression-near-other-light-retail-distance-blocked",
      visionMutationPolicyStatus:
        "docs-backed-progfx-type4-param4-param1-vision-priority-token-retail-mutation-blocked",
      shadowPolicyStatus:
        "source-backed-progfx-type4-param3-item-light-shadow-toggle-retail-shadow-volume-projection-blocked",
      visualPreviewStatus: "backend-render-contract-source-record-no-scene-light",
      notPlaceableTwoDaLight: true,
      notMdlLightNode: true,
      ownerVisualEffectRowId: 153,
      ownerVisualEffectLabel: "VFX_DUR_LIGHT_BLUE_5",
      ownerPhase: "duration",
      ownerProgFxRef: "304",
      ownerEffectConstructorKind: "EffectVisualEffect",
      ownerDurationType: "temporary",
      color: { r: 0.5, g: 0.5, b: 1 }
    });
    expect(contract.progFxType4Light?.runtimeSchedulingProofSource).toContain(
      "decompiled_all.c:348244 loads visualeffects.2da"
    );
    expect(contract.progFxType4Light?.runtimeSchedulingProofSource).toContain(
      "audit-retail-progfx-type4-table.ts over retail nwn_base.key reports progfx rowCount=1301, type4RowCount=68"
    );
    expect(contract.progFxType4Light?.runtimeSchedulingProofSource).toContain(
      "itemLightNormalRowCount=28, itemLightFadeRowCount=28, nonItemType4RowCount=12"
    );
    expect(contract.progFxType4Light?.runtimeSchedulingProofSource).toContain(
      "Param3 castShadows true=42 false=26"
    );
    expect(contract.progFxType4Light?.runtimeSchedulingProofSource).toContain(
      "nonItemCastShadowRows=[]"
    );
    expect(contract.progFxType4Light?.runtimeSchedulingProofSource).toContain(
      "attachRows=[333,383]"
    );
    expect(contract.progFxType4Light?.runtimeSchedulingProofSource).toContain(
      "type4OwnerPhaseCount=77, itemLightOwnerPhaseCount=56, nonItemOwnerPhaseCount=21"
    );
    expect(contract.progFxType4Light?.runtimeSchedulingProofSource).toContain(
      "nonItemCastShadowOwnerPhaseCount=0"
    );
    expect(contract.progFxType4Light?.runtimeSchedulingProofSource).toContain(
      "nonItemOwnerLabels=[VFX_DUR_BLACKOUT,VFX_DUR_DARKVISION,VFX_FNF_SOUND_BURST,VFX_FNF_STRIKE_HOLY,VFX_DUR_BLINDVISION,VFX_DUR_LOWLIGHTVISION,VFX_DUR_ULTRAVISION,VFX_DUR_BLIND,VFX_FNF_SOUND_BURST_SILENT,VFX_FNF_TELEPORT_IN,VFX_FNF_TELEPORT_OUT]"
    );
    expect(contract.progFxType4Light?.runtimeSchedulingProofSource).toContain(
      "clientObjectVisualEffectLifecycle proofStatus=source-backed-client-object-add-remove-refresh-looping-vfx-path"
    );
    expect(contract.progFxType4Light?.runtimeSchedulingProofSource).toContain(
      "visualEffectSourceModelLoaders proofStatus=source-backed-client-vfx-loadvisualeffect-newcaurobject-model-loader-path"
    );
    expect(contract.progFxType4Light?.runtimeSchedulingProofSource).toContain(
      "capstoneFreeCallTargetEvidence proofStatus=capstone-free-binary-relative-call-target-scan-ran"
    );
    expect(contract.progFxType4Light?.runtimeSchedulingProofSource).toContain(
      "clientVisualEffectDirectCallXrefCount=1502"
    );
    expect(contract.progFxType4Light?.runtimeSchedulingProofSource).toContain(
      "clientVisualEffectObservedTargetFamilies=[message-readers,visual-transform-reader,looping-vfx-list-attach,progfx-source-loader,vfx-2da-row-loader,fx-light-loader-region,aurora-object-gob-construction,runtime-state-scene-helpers]"
    );
    expect(contract.progFxType4Light?.runtimeSchedulingProofSource).toContain(
      "clientVisualEffectReceiveRenderEvidence proofStatus=source-backed-capstone-free-cnwcmessage-client-vfx-callgraph-vtable-loader-path-scheduler-dataflow-blocked"
    );
    expect(contract.progFxType4Light?.runtimeSchedulingProofSource).toContain(
      "clientKnownFunctionCallgraph proofStatus=source-backed-capstone-free-client-vfx-message-owner-loader-callgraph"
    );
    expect(contract.progFxType4Light?.runtimeSchedulingProofSource).toContain(
      "clientVisualEffectSchedulerDataFlowProofStatus=blocked-capstone-free-callgraph-proves-vfx-loader-object-attach-not-progfx-param-scheduler-dataflow"
    );
    expect(contract.progFxType4Light?.runtimeSchedulingProofSource).toContain(
      "legacyDirectCallScanSchedulerStatus=blocked-direct-call-targets-show-vfx-loader-object-attach-not-progfx-param-scheduler-dataflow"
    );
    expect(contract.progFxType4Light?.runtimeSchedulingProofSource).toContain(
      "top direct target groups ReadBYTE=416"
    );
    expect(contract.progFxType4Light?.runtimeSchedulingProofSource).toContain(
      "progfxType4SourceSchedulerEvidence proofStatus=source-backed-visualeffects-loader-progfx-type4-scheduler-not-in-source-only-decompilation"
    );
    expect(contract.progFxType4Light?.runtimeSchedulingProofSource).toContain(
      "runtimeSchedulerStringHitCount=0"
    );
    expect(contract.progFxType4Light?.runtimeSchedulingBlocker).toContain(
      "source-only decompiled_all.c still has no progfx.2da/fx_light_clr/Blind_Vision scheduler string hit"
    );
    expect(contract.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "VFX_PROGFX_TYPE4_OWNER_PHASE_EFFECT_INSTANCE_READY",
        "VFX_PROGFX_TYPE4_RENDER_CONTRACT_NO_POINTLIGHT",
        "VFX_PROGFX_TYPE4_RETAIL_SCHEDULING_REQUIRED",
        "VFX_PROGFX_TYPE4_PARAMETERS_PRESERVED",
        "VFX_PROGFX_TYPE4_PARAM3_CAST_SHADOWS_PRESERVED",
        "VFX_PROGFX_TYPE4_PARAM4_PRIORITY_PRESERVED",
        "VFX_PROGFX_TYPE4_PARAM5_PROXIMITY_PRESERVED",
        "VFX_PROGFX_TYPE4_PARAM6_ATTACH_TO_SCENE_PRESERVED",
        "VFX_PROGFX_TYPE4_RUNTIME_SCHEDULING_PROOF_SOURCE",
        "VFX_PROGFX_TYPE4_RUNTIME_POLICY_BLOCKED"
      ])
    );
  });

  it("preserves ProgFX Type 4 vision owner-phase evidence without creating a generic light", () => {
    const visualEffect = parseAuroraVisualEffectsTwoDa(
      [
        "2DA V2.0",
        "",
        "Label Type_FD ProgFX_Duration",
        "242 VFX_DUR_BLINDVISION D 305"
      ].join("\n"),
      "progfx-type4-vision-owner-fixture"
    ).rows[0]!;
    const phaseSchedule = buildAuroraVfxPhaseSchedule(visualEffect, {
      constructorKind: "EffectVisualEffect",
      sourceRowId: 242,
      applicationMode: "object",
      durationType: "temporary",
      durationSeconds: 6,
      targetRef: "object:target"
    });
    const progFxRows = parseAuroraProgFxTwoDa(
      [
        "2DA V2.0",
        "",
        "Label Type Param1 Param2 Param3 Param4 Param5 Param6 Param7 Param8",
        "305 BlindVision 4 Blind_Vision 1 0 13 0 1 fx_light_clr ****"
      ].join("\n"),
      "progfx-type4-vision-owner-fixture"
    ).rows;
    const emitter = fountainEmitter({ birthrate: 1 });
    const contract = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(emitter, 1),
      sourceEmitter: emitter,
      phaseSchedule,
      progFxRows
    });

    expect(phaseSchedule.status).toBe("ready");
    expect(contract.progFxType4Light).toMatchObject({
      rowId: 305,
      label: "BlindVision",
      animationRaw: "Blind_Vision",
      animation: "Blind_Vision",
      animationKind: "vision",
      visionMode: "Blind_Vision",
      visionParameterStatus:
        "docs-backed-progfx-type4-param1-vision-token-param4-priority",
      symbolicColor: "",
      tokenRadiusMeters: null,
      tokenRadiusProofStatus: "",
      radiusMeters: null,
      radiusProofStatus: "",
      priority: 13,
      priorityRaw: "13",
      attachToScene: true,
      attachToSceneRaw: "1",
      sourceMdlNodeName: "AuroraLight02",
      sourceMdlAnimation: "Blind_Vision",
      sourceMdlColor: { r: 0.3, g: 0.3, b: 0.3 },
      sourceMdlRadiusMeters: 7,
      sourceMdlRadiusFrames: [0, 7],
      sourceMdlColorProofStatus: "source-family-backed-fx_light_clr-mdl-animation-rgb",
      sourceMdlRadiusProofStatus: "source-family-backed-fx_light_clr-mdl-animation-radius",
      modelRef: "fx_light_clr",
      proofStatus:
        "source-backed-progfx-type4-owner-phase-effect-instance-runtime-retail-unverified",
      runtimeSchedulingStatus:
        "source-backed-owner-phase-effect-instance-ready-retail-runtime-unverified",
      sceneAttachmentPolicyStatus:
        "docs-backed-progfx-type4-param6-attach-to-scene-removes-scene-lights-retail-dataflow-blocked",
      proximitySuppressionPolicyStatus:
        "docs-backed-progfx-type4-param5-proximity-suppression-near-other-light-retail-distance-blocked",
      visionMutationPolicyStatus:
        "docs-backed-progfx-type4-param4-param1-vision-priority-token-retail-mutation-blocked",
      shadowPolicyStatus: "source-backed-progfx-type4-non-item-cast-shadow-absent-vanilla-rows",
      visualPreviewStatus: "backend-render-contract-source-record-no-scene-light",
      notPlaceableTwoDaLight: true,
      notMdlLightNode: true,
      ownerVisualEffectRowId: 242,
      ownerVisualEffectLabel: "VFX_DUR_BLINDVISION",
      ownerPhase: "duration",
      ownerProgFxRef: "305",
      ownerEffectConstructorKind: "EffectVisualEffect",
      ownerDurationType: "temporary",
      color: { r: 0, g: 0, b: 0 }
    });
    expect(contract.progFxType4Light?.runtimeSchedulingProofSource).toContain(
      "decompiled_all.c:348244 loads visualeffects.2da"
    );
    expect(contract.progFxType4Light?.runtimeSchedulingProofSource).toContain(
      "animationKindCounts light=56 vision=10 unknown=2"
    );
    expect(contract.progFxType4Light?.runtimeSchedulingProofSource).toContain(
      "Param5 proximity true=8 false=60"
    );
    expect(contract.progFxType4Light?.runtimeSchedulingProofSource).toContain(
      "visionRows=[328,329,330,331,333,378,379,380,381,383]"
    );
    expect(contract.progFxType4Light?.runtimeSchedulingProofSource).toContain(
      "fx-light-loader-region 0x14096c610"
    );
    expect(contract.progFxType4Light?.runtimeSchedulingBlocker).toContain(
      "proximity distance threshold, scene-light restore timing, and pixel/runtime vision mutation parity"
    );
    expect(contract.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "VFX_PROGFX_TYPE4_OWNER_PHASE_EFFECT_INSTANCE_READY",
        "VFX_PROGFX_TYPE4_RENDER_CONTRACT_NO_POINTLIGHT",
        "VFX_PROGFX_TYPE4_RETAIL_SCHEDULING_REQUIRED",
        "VFX_PROGFX_TYPE4_RUNTIME_SCHEDULING_PROOF_SOURCE",
        "VFX_PROGFX_TYPE4_PARAM1_VISION_TOKEN_PRESERVED",
        "VFX_PROGFX_TYPE4_RUNTIME_POLICY_BLOCKED"
      ])
    );
  });

  it("keeps ProgFX Type 4 blocked when the EffectVisualEffect owner phase is absent", () => {
    const progFxRows = parseAuroraProgFxTwoDa(
      [
        "2DA V2.0",
        "",
        "Label Type Param1 Param2 Param3 Param4 Param5 Param6 Param7 Param8",
        "304 LightBlue5m 4 Blue_5m 1 0 20 0 0 fx_light_clr ****"
      ].join("\n"),
      "progfx-type4-source-only-fixture"
    ).rows;
    const emitter = fountainEmitter({ birthrate: 1 });
    const contract = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(emitter, 1),
      sourceEmitter: emitter,
      progFxRows
    });

    expect(contract.progFxType4Light).toBeUndefined();
    expect(contract.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain(
      "VFX_PROGFX_TYPE4_OWNER_PHASE_EFFECT_INSTANCE_READY"
    );
  });

  it("keeps a selected PLT particle texture non-canonical without target palette context", () => {
    const emitter = fountainEmitter({ nodeName: "emit_plt", texture: "robe_fx" });
    emitter.textureRaw = "robe_fx.plt";
    const contract = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(emitter, 1),
      sourceEmitter: emitter,
      dependencyGraph: createPltDependencyGraph()
    });

    expect(contract.pltRenderContext).toMatchObject({
      status: "missing_target_context",
      requestedTextureRef: "robe_fx",
      selectedResourceKey: "textures/robe_fx.plt",
      shaderLane: {
        vertexShader: "vs_pltgen",
        fragmentShader: "fs_pltgen",
        schemeUniformPattern: "PLTscheme[%d]",
        schemeUniformCount: 15
      }
    });
    expect(contract.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "VFX_PLT_TARGET_CONTEXT_REQUIRED"
    );
  });

  it("preserves target palette rows and the EE PLT generation profile", () => {
    const visualEffect = parseAuroraVisualEffectsTwoDa(
      ["2DA V2.0", "", "Label Type_FD Imp_Impact_Node", "901 VFX_PLT_TARGET F fx_plt"].join(
        "\n"
      ),
      "plt-target-context-fixture"
    ).rows[0]!;
    const phaseSchedule = buildAuroraVfxPhaseSchedule(visualEffect, {
      constructorKind: "EffectVisualEffect",
      sourceRowId: 901,
      applicationMode: "object",
      durationType: "instant",
      targetRef: "creature:target",
      targetPltContext: {
        paletteRowsByLayer: { "0": 12, "3": 77 },
        profile: "nwn-ee-8193.15+",
        provenance: "effect-target-object-layer-colors"
      }
    });
    const emitter = fountainEmitter({ nodeName: "emit_plt", texture: "robe_fx" });
    const contract = buildAuroraVfxRuntimeRenderContract({
      runtimeState: runtimeStateWithParticles(emitter, 1),
      sourceEmitter: emitter,
      dependencyGraph: createPltDependencyGraph(),
      phaseSchedule
    });

    expect(contract.pltRenderContext).toEqual({
      status: "ready",
      requestedTextureRef: "robe_fx",
      selectedResourceKey: "textures/robe_fx.plt",
      targetRef: "creature:target",
      paletteRowsByLayer: { "0": 12, "3": 77 },
      profile: "nwn-ee-8193.15+",
      provenance: "effect-target-object-layer-colors",
      shaderLane: {
        vertexShader: "vs_pltgen",
        fragmentShader: "fs_pltgen",
        schemeUniformPattern: "PLTscheme[%d]",
        schemeUniformCount: 15
      },
      proofStatus: "source-backed-contract-retail-visual-unverified"
    });
    expect(contract.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "VFX_PLT_TARGET_CONTEXT_PRESERVED"
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

function createChunkDependencyGraph(
  requestedRef: string,
  selectedCandidate: NonNullable<AuroraVfxDependencyGraph["edges"][number]["selectedCandidate"]>
): AuroraVfxDependencyGraph {
  return {
    version: "aurora-vfx-dependency-graph/v1",
    edges: [
      {
        edgeId: "chunk-edge:fx_chunk01",
        edgeType: "chunk_model",
        ownerPath: "mdl:fountain.mdl/emitter:emit_chunk_resolved/chunkName",
        requestedResourceClass: "chunk_model",
        requestedRef,
        selectedCandidate,
        lowerPrecedenceCandidates: [],
        resolveStatus: "resolved",
        diagnostics: [],
        cacheKeyParts: {
          version: "aurora-vfx-dependency-edge/v1",
          edgeType: "chunk_model",
          ownerPath: "mdl:fountain.mdl/emitter:emit_chunk_resolved/chunkName",
          requestedResourceClass: "chunk_model",
          requestedRef,
          selectedResourceKey: selectedCandidate.resourceKey,
          selectedResourceHash: selectedCandidate.resourceHash
        },
        preloadIntent: "runtime_required"
      }
    ],
    diagnostics: [],
    cacheKeyParts: {
      version: "aurora-vfx-dependency-graph/v1",
      edgeKeys: ["chunk-edge:fx_chunk01"]
    }
  };
}

function createPltDependencyGraph(): AuroraVfxDependencyGraph {
  return {
    version: "aurora-vfx-dependency-graph/v1",
    edges: [
      {
        edgeId: "texture-edge:robe_fx",
        edgeType: "texture",
        ownerPath: "mdl:fx_plt.mdl/emitter:emit_plt/texture",
        requestedResourceClass: "texture",
        requestedRef: "robe_fx",
        selectedCandidate: {
          candidateId: "vanilla:robe_fx.plt",
          sourceLayer: "vanilla",
          resourceKey: "textures/robe_fx.plt",
          resourceHash: "sha256:robe-plt"
        },
        lowerPrecedenceCandidates: [],
        resolveStatus: "resolved",
        diagnostics: [],
        cacheKeyParts: {
          version: "aurora-vfx-dependency-edge/v1",
          edgeType: "texture",
          ownerPath: "mdl:fx_plt.mdl/emitter:emit_plt/texture",
          requestedResourceClass: "texture",
          requestedRef: "robe_fx",
          selectedResourceKey: "textures/robe_fx.plt",
          selectedResourceHash: "sha256:robe-plt"
        },
        preloadIntent: "runtime_required"
      }
    ],
    diagnostics: [],
    cacheKeyParts: {
      version: "aurora-vfx-dependency-graph/v1",
      edgeKeys: ["texture-edge:robe_fx"]
    }
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
      landed: false,
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
