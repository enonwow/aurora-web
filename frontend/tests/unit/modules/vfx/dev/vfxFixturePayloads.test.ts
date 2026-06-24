import { describe, expect, it } from "vitest";
import {
  createDevAuroraVfxPayload,
  DEV_VFX_DEFAULT_FIXTURE_ID,
  DEV_VFX_ORACLE,
  DEV_VFX_TEXTURE_REFERENCE
} from "../../../../../src/modules/vfx/dev/vfxFixturePayloads";

describe("dev VFX fixture payloads", () => {
  it("builds a deterministic row-68 render-contract fixture without promoting retail parity", () => {
    const fixture = createDevAuroraVfxPayload({
      fixtureId: DEV_VFX_DEFAULT_FIXTURE_ID,
      timeSeconds: 0.5,
      seed: 1
    });

    expect(fixture.fixtureId).toBe(DEV_VFX_DEFAULT_FIXTURE_ID);
    expect(fixture.oracle).toBe(DEV_VFX_ORACLE);
    expect(fixture.canonicalParityPromoted).toBe(false);
    expect(fixture.textureReference).toBe(DEV_VFX_TEXTURE_REFERENCE);
    expect(fixture.payload.canonicalStatus).toBe("canonical");
    expect(fixture.payload.backendCanonical).toBe(true);
    expect(fixture.payload.provenance.sourceRowId).toBe(68);
    expect(fixture.payload.provenance.sourceLabel).toBe("VFX_IMP_HEALING_M");
    expect(fixture.payload.diagnostics.payload.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "VFX_DEV_VISUAL_RUNNER_NOT_PARITY_PROOF",
        "VFX_RETAIL_CAPTURE_REFERENCE_REQUIRED"
      ])
    );

    const renderContract = fixture.payload.contracts.renderContract;
    expect(renderContract).toEqual(
      expect.objectContaining({
        version: "aurora-vfx-runtime-render-contract/v1",
        drawLane: "textured_quad",
        drawParticleCount: 2,
        drawVertexCount: 12
      })
    );
  });

  it("falls back to the admitted row-68 local fixture for unknown fixture ids", () => {
    expect(createDevAuroraVfxPayload({ fixtureId: "unknown" }).fixtureId).toBe(
      DEV_VFX_DEFAULT_FIXTURE_ID
    );
  });

  it("builds the cot_fx01 fountain atlas diagnostic fixture as local-only evidence", () => {
    const fixture = createDevAuroraVfxPayload({
      fixtureId: "vfx-retail-fountain-atlas-cot-fx01",
      timeSeconds: 1.2,
      seed: 19
    });

    expect(fixture.fixtureId).toBe("vfx-retail-fountain-atlas-cot-fx01");
    expect(fixture.canonicalParityPromoted).toBe(false);
    expect(fixture.payload.contracts.sourceRows.sourceAuthority).toBe(
      "localUntrackedMdlCandidate"
    );
    expect(fixture.payload.contracts.effectInstance.constructorKind).toBe("MDL_EMITTER");
    expect(fixture.payload.contracts.effectInstance.applicationMode).toBe("source_only");
    expect(fixture.payload.contracts.renderContract.drawParticleCount).toBe(6);
    expect(fixture.payload.contracts.renderContract.drawVertexCount).toBe(36);
    expect(fixture.payload.contracts.renderContract.fountainAtlas).toEqual(
      expect.objectContaining({
        emitterType: "Fountain",
        textureRef: "fx_canonical_fire",
        xgrid: 4,
        ygrid: 4,
        fps: 12,
        frameStart: 0,
        frameEnd: 15,
        randomFrameStart: true,
        retailPlaybackResolved: false
      })
    );
    const drawRecords = fixture.payload.contracts.renderContract.drawRecords;
    expect(drawRecords).toHaveLength(6);
    expect(new Set(drawRecords.map((record) => record.atlasUv.frameIndex)).size).toBeGreaterThan(2);
    expect(
      drawRecords.every(
        (record) =>
          record.atlasProvenance.emitterType === "Fountain" &&
          record.atlasProvenance.textureRef === "fx_canonical_fire" &&
          record.atlasProvenance.atlasGrid?.x === 4 &&
          record.atlasProvenance.atlasGrid?.y === 4 &&
          record.atlasProvenance.atlasFrameStart === 0 &&
          record.atlasProvenance.atlasFrameEnd === 15 &&
          record.atlasProvenance.atlasFps === 12 &&
          record.atlasProvenance.randomFrameStart === true &&
          record.atlasProvenance.materialLevelFrameOffsetAllowed === false
      )
    ).toBe(true);
    expect(fixture.payload.contracts.runtimeState.retailCapture).toBe(false);
  });

  it("builds the scripted EffectBeam row-210 diagnostic with source target context", () => {
    const fixture = createDevAuroraVfxPayload({
      fixtureId: "vfx-retail-scripted-effectbeam-row-210-body-chest",
      timeSeconds: 0.8,
      seed: 71
    });

    expect(fixture.fixtureId).toBe("vfx-retail-scripted-effectbeam-row-210-body-chest");
    expect(fixture.canonicalParityPromoted).toBe(false);
    expect(fixture.payload.contracts.sourceRows).toEqual(
      expect.objectContaining({
        tableName: "visualeffects.2da",
        rowId: 210,
        label: "VFX_BEAM_FIRE",
        sourceAuthority: "selectedSource2da"
      })
    );
    expect(fixture.payload.contracts.effectInstance).toEqual(
      expect.objectContaining({
        constructorKind: "EffectBeam",
        applicationMode: "object",
        durationType: "temporary",
        durationSeconds: 3,
        targetRef: "retail-beam-target",
        effectorRef: "retail-beam-source",
        bodyNode: "BODY_NODE_CHEST"
      })
    );
    expect(fixture.payload.contracts.renderContract).toEqual(
      expect.objectContaining({
        drawLane: "textured_quad",
        activeParticleCount: 5,
        drawParticleCount: 5,
        drawVertexCount: 30,
        beamContext: expect.objectContaining({
          constructorKind: "EffectBeam",
          applicationMode: "object",
          durationType: "temporary",
          durationSeconds: 3,
          targetRef: "retail-beam-target",
          effectorRef: "retail-beam-source",
          bodyNode: "BODY_NODE_CHEST",
          retailBeamVolumeResolved: false
        })
      })
    );
    const drawRecords = fixture.payload.contracts.renderContract.drawRecords;
    expect(drawRecords).toHaveLength(5);
    expect(drawRecords[0]?.position.x).toBeLessThan(-0.55);
    expect(drawRecords[4]?.position.x).toBeGreaterThan(0.55);
    expect(drawRecords.every((record, index) => index === 0 || record.position.x > drawRecords[index - 1]!.position.x)).toBe(
      true
    );
    expect(drawRecords.map((record) => record.atlasProvenance.bodyNode)).toEqual([
      "BODY_NODE_CHEST",
      "BODY_NODE_CHEST",
      "BODY_NODE_CHEST",
      "BODY_NODE_CHEST",
      "BODY_NODE_CHEST"
    ]);
    expect(fixture.payload.diagnostics.renderContract.map((diagnostic) => diagnostic.code)).toContain(
      "VFX_DEV_EFFECTBEAM_CONTEXT_DIAGNOSTIC_ONLY"
    );
    expect(fixture.payload.diagnostics.payload.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "VFX_EFFECTBEAM_RETAIL_CONTEXT_REQUIRED",
        "VFX_DEV_VISUAL_RUNNER_NOT_PARITY_PROOF",
        "VFX_RETAIL_CAPTURE_REFERENCE_REQUIRED"
      ])
    );
  });

  it("builds the progfx Type 9 chunk-particle diagnostic without fake quad draws", () => {
    const fixture = createDevAuroraVfxPayload({
      fixtureId: "vfx-retail-chunk-particles-progfx-type9",
      timeSeconds: 0.6,
      seed: 23
    });

    expect(fixture.fixtureId).toBe("vfx-retail-chunk-particles-progfx-type9");
    expect(fixture.canonicalParityPromoted).toBe(false);
    expect(fixture.payload.contracts.sourceRows).toEqual(
      expect.objectContaining({
        tableName: "progfx.2da",
        rowId: 9009,
        sourceAuthority: "selectedSource2da-type-distribution"
      })
    );
    expect(fixture.payload.contracts.effectInstance).toEqual(
      expect.objectContaining({
        constructorKind: "MDL_EMITTER",
        applicationMode: "source_only",
        rawInvocation: "Chunk emitter/progFX Type 9 retail fixture required"
      })
    );
    expect(fixture.payload.contracts.dependencyGraph.edges).toEqual([
      expect.objectContaining({
        edgeType: "chunk_model",
        requestedResourceClass: "chunk_model",
        requestedRef: "progfx_type9_chunk_model_pending",
        selectedCandidate: null
      })
    ]);
    expect(fixture.payload.contracts.runtimeState.activeParticleCount).toBe(2);
    expect(fixture.payload.contracts.renderContract).toEqual(
      expect.objectContaining({
        drawLane: "chunk_model",
        activeParticleCount: 2,
        drawParticleCount: 0,
        verticesPerDrawParticle: 0,
        drawVertexCount: 0,
        drawRecords: []
      })
    );
    expect(fixture.payload.contracts.renderContract.chunkLane).toEqual(
      expect.objectContaining({
        lane: "chunk_model",
        chunkName: "progfx_type9_chunk_model_pending",
        canonicalResourceResolved: false
      })
    );
    expect(
      fixture.payload.diagnostics.dependencyGraph.map((diagnostic) => diagnostic.code)
    ).toContain("VFX_CHUNK_MODEL_RESOURCE_CLASS_REQUIRED");
    expect(fixture.payload.diagnostics.payload.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "VFX_DEV_VISUAL_RUNNER_NOT_PARITY_PROOF",
        "VFX_RETAIL_CAPTURE_REFERENCE_REQUIRED"
      ])
    );
  });

  it("builds the linked-chain diagnostic on the linked textured lane", () => {
    const fixture = createDevAuroraVfxPayload({
      fixtureId: "vfx-retail-linked-chain",
      timeSeconds: 0.85,
      seed: 31
    });

    expect(fixture.fixtureId).toBe("vfx-retail-linked-chain");
    expect(fixture.canonicalParityPromoted).toBe(false);
    expect(fixture.payload.contracts.sourceRows.sourceAuthority).toBe(
      "requiredFixtureFamily-local-diagnostic"
    );
    expect(fixture.payload.contracts.renderContract).toEqual(
      expect.objectContaining({
        drawLane: "linked_textured_quad",
        activeParticleCount: 5,
        drawParticleCount: 5,
        verticesPerDrawParticle: 6,
        drawVertexCount: 30
      })
    );
    expect(
      fixture.payload.contracts.renderContract.drawRecords.map((record) => record.lane)
    ).toEqual([
      "linked_textured_quad",
      "linked_textured_quad",
      "linked_textured_quad",
      "linked_textured_quad",
      "linked_textured_quad"
    ]);
    expect(fixture.payload.contracts.renderContract.renderMode).toEqual(
      expect.objectContaining({
        enum: "linked_billboard",
        rawToken: "Linked"
      })
    );
    expect(fixture.payload.diagnostics.renderContract.map((diagnostic) => diagnostic.code)).toContain(
      "VFX_DEV_LINKED_CHAIN_DIAGNOSTIC_ONLY"
    );
    expect(fixture.payload.diagnostics.payload.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "VFX_LINKED_CHAIN_RETAIL_SEGMENT_BUFFER_REQUIRED",
        "VFX_DEV_VISUAL_RUNNER_NOT_PARITY_PROOF",
        "VFX_RETAIL_CAPTURE_REFERENCE_REQUIRED"
      ])
    );
  });

  it("builds the p2p gravity diagnostic as a source-target arc without retail promotion", () => {
    const fixture = createDevAuroraVfxPayload({
      fixtureId: "vfx-retail-p2p-gravity-reference-node",
      timeSeconds: 0.7,
      seed: 41
    });

    expect(fixture.fixtureId).toBe("vfx-retail-p2p-gravity-reference-node");
    expect(fixture.canonicalParityPromoted).toBe(false);
    expect(fixture.payload.contracts.sourceRows.sourceAuthority).toBe(
      "requiredFixtureFamily-local-diagnostic"
    );
    expect(fixture.payload.contracts.effectInstance.rawInvocation).toContain(
      "P2P gravity with target/reference-node context"
    );
    expect(fixture.payload.contracts.renderContract).toEqual(
      expect.objectContaining({
        drawLane: "textured_quad",
        activeParticleCount: 7,
        drawParticleCount: 7,
        drawVertexCount: 42
      })
    );
    const drawRecords = fixture.payload.contracts.renderContract.drawRecords;
    expect(drawRecords).toHaveLength(7);
    expect(drawRecords[0]?.position.x).toBeLessThan(-0.45);
    expect(drawRecords[6]?.position.x).toBeGreaterThan(0.45);
    expect(drawRecords[3]?.position.y).toBeGreaterThan(drawRecords[0]!.position.y);
    expect(drawRecords[3]?.position.y).toBeGreaterThan(drawRecords[6]!.position.y);
    expect(fixture.payload.diagnostics.renderContract.map((diagnostic) => diagnostic.code)).toContain(
      "VFX_DEV_P2P_GRAVITY_DIAGNOSTIC_ONLY"
    );
    expect(fixture.payload.diagnostics.payload.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "VFX_P2P_GRAVITY_REFERENCE_NODE_REQUIRED",
        "VFX_DEV_VISUAL_RUNNER_NOT_PARITY_PROOF",
        "VFX_RETAIL_CAPTURE_REFERENCE_REQUIRED"
      ])
    );
  });

  it("builds the punch-through mode2/lighten diagnostic without retail promotion", () => {
    const fixture = createDevAuroraVfxPayload({
      fixtureId: "vfx-retail-punch-through-mode2-lighten",
      timeSeconds: 0.45,
      seed: 53
    });

    expect(fixture.fixtureId).toBe("vfx-retail-punch-through-mode2-lighten");
    expect(fixture.canonicalParityPromoted).toBe(false);
    expect(fixture.payload.contracts.sourceRows.sourceAuthority).toBe(
      "requiredFixtureFamily-local-diagnostic"
    );
    expect(fixture.payload.contracts.renderContract).toEqual(
      expect.objectContaining({
        drawLane: "textured_quad",
        activeParticleCount: 4,
        drawParticleCount: 4,
        drawVertexCount: 24,
        blendMode: {
          enum: "lighten",
          rawToken: "Mode2_Lighten",
          modeNumber: 2
        },
        renderState: {
          depthWriteLane: "non_punch_transparent_depth_write_off",
          transparentLane: "non_punch_transparent_lane"
        }
      })
    );
    const drawRecords = fixture.payload.contracts.renderContract.drawRecords;
    expect(drawRecords).toHaveLength(4);
    expect(drawRecords.every((record) => record.blendMode.enum === "lighten")).toBe(true);
    expect(drawRecords[0]?.position.x).toBeLessThan(drawRecords[3]!.position.x);
    expect(fixture.payload.diagnostics.renderContract.map((diagnostic) => diagnostic.code)).toContain(
      "VFX_DEV_MODE2_LIGHTEN_DIAGNOSTIC_ONLY"
    );
    expect(fixture.payload.diagnostics.payload.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "VFX_PUNCH_THROUGH_RETAIL_BLEND_DEPTH_REQUIRED",
        "VFX_DEV_VISUAL_RUNNER_NOT_PARITY_PROOF",
        "VFX_RETAIL_CAPTURE_REFERENCE_REQUIRED"
      ])
    );
  });

  it("builds the PLT known layer color diagnostic without retail promotion", () => {
    const fixture = createDevAuroraVfxPayload({
      fixtureId: "vfx-retail-plt-known-layer-colors",
      timeSeconds: 0.55,
      seed: 61
    });

    expect(fixture.fixtureId).toBe("vfx-retail-plt-known-layer-colors");
    expect(fixture.canonicalParityPromoted).toBe(false);
    expect(fixture.payload.contracts.sourceRows.sourceAuthority).toBe(
      "requiredFixtureFamily-local-diagnostic"
    );
    expect(fixture.payload.contracts.effectInstance.rawInvocation).toContain(
      "PLT visual with known layer colors"
    );
    expect(fixture.payload.contracts.renderContract).toEqual(
      expect.objectContaining({
        drawLane: "textured_quad",
        activeParticleCount: 4,
        drawParticleCount: 4,
        drawVertexCount: 24
      })
    );
    const drawRecords = fixture.payload.contracts.renderContract.drawRecords;
    expect(drawRecords).toHaveLength(4);
    expect(drawRecords.map((record) => record.atlasProvenance.pltLayer)).toEqual([
      "skin",
      "hair",
      "cloth1",
      "cloth2"
    ]);
    expect(drawRecords.map((record) => record.color)).toEqual([
      { r: 1, g: 0.66, b: 0.42 },
      { r: 0.62, g: 0.32, b: 0.08 },
      { r: 0.12, g: 0.48, b: 1 },
      { r: 0.82, g: 0.12, b: 0.9 }
    ]);
    expect(fixture.payload.diagnostics.renderContract.map((diagnostic) => diagnostic.code)).toContain(
      "VFX_DEV_PLT_LAYER_COLORS_DIAGNOSTIC_ONLY"
    );
    expect(fixture.payload.diagnostics.payload.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "VFX_PLT_RETAIL_LAYER_PALETTE_REQUIRED",
        "VFX_DEV_VISUAL_RUNNER_NOT_PARITY_PROOF",
        "VFX_RETAIL_CAPTURE_REFERENCE_REQUIRED"
      ])
    );
  });
});
