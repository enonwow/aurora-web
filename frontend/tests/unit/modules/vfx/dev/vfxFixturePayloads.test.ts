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

  it("builds the progfx Type 4 light-lane diagnostic without mixing it with placeable or MDL lights", () => {
    const fixture = createDevAuroraVfxPayload({
      fixtureId: "vfx-retail-progfx-type4-blue-5m-light",
      timeSeconds: 0.5,
      seed: 37
    });

    expect(fixture.fixtureId).toBe("vfx-retail-progfx-type4-blue-5m-light");
    expect(fixture.canonicalParityPromoted).toBe(false);
    expect(fixture.payload.contracts.sourceRows).toEqual(
      expect.objectContaining({
        tableName: "progfx.2da",
        rowId: 304,
        label: "LightBlue5m",
        sourceAuthority: "selectedSource2da-progfx-type4-light"
      })
    );
    expect(fixture.payload.contracts.renderContract.progFxType4Light).toEqual(
      expect.objectContaining({
        rowId: 304,
        animation: "Blue_5m",
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
        animationRaw: "Blue_5m",
        animationParameterStatus:
          "source-backed-progfx-type4-param1-animation-token-preserved",
        animationSpeedRaw: "1",
        animationSpeed: 1,
        animationSpeedParameterStatus:
          "source-backed-progfx-type4-param2-animation-speed-preserved-runtime-playback-blocked",
        castShadowsRaw: "0",
        castShadows: false,
        castShadowParameterStatus:
          "source-backed-progfx-type4-param3-cast-shadows-preserved-item-toggle-known-non-item-vanilla-cast-shadow-absent",
        priorityRaw: "20",
        priority: 20,
        priorityParameterStatus:
          "docs-backed-progfx-type4-param4-priority-lower-value-wins",
        proximitySuppressionRaw: "0",
        proximitySuppression: false,
        proximitySuppressionParameterStatus:
          "docs-backed-progfx-type4-param5-proximity-suppression-near-other-light",
        attachToSceneRaw: "0",
        attachToScene: false,
        sceneAttachmentParameterStatus:
          "docs-backed-progfx-type4-param6-attach-to-scene-removes-scene-lights",
        modelRaw: "fx_light_clr",
        modelRef: "fx_light_clr",
        parameterPreservationProofStatus:
          "source-backed-progfx-type4-param1-param8-raw-preserved",
        notPlaceableTwoDaLight: true,
        notMdlLightNode: true,
        runtimeSchedulingStatus: "blocked-owner-phase-effect-instance-required",
        sceneAttachmentPolicyStatus:
          "docs-backed-progfx-type4-param6-attach-to-scene-removes-scene-lights-retail-dataflow-blocked",
        proximitySuppressionPolicyStatus:
          "docs-backed-progfx-type4-param5-proximity-suppression-near-other-light-retail-distance-blocked",
        visionMutationPolicyStatus:
          "docs-backed-progfx-type4-param4-param1-vision-priority-token-retail-mutation-blocked",
        shadowPolicyStatus:
          "source-backed-progfx-type4-param3-item-light-shadow-toggle-retail-shadow-volume-projection-blocked"
      })
    );
    expect(
      fixture.payload.contracts.renderContract.progFxType4Light
        ?.runtimeSchedulingProofSource
    ).toContain("decompiled_all.c:348244 loads visualeffects.2da");
    expect(
      fixture.payload.contracts.renderContract.progFxType4Light
        ?.runtimeSchedulingProofSource
    ).toContain(
      "audit-retail-progfx-type4-table.ts over retail nwn_base.key reports progfx rowCount=1301, type4RowCount=68"
    );
    expect(
      fixture.payload.contracts.renderContract.progFxType4Light
        ?.runtimeSchedulingProofSource
    ).toContain(
      "itemLightNormalRowCount=28, itemLightFadeRowCount=28, nonItemType4RowCount=12"
    );
    expect(
      fixture.payload.contracts.renderContract.progFxType4Light
        ?.runtimeSchedulingProofSource
    ).toContain("Param3 castShadows true=42 false=26");
    expect(
      fixture.payload.contracts.renderContract.progFxType4Light
        ?.runtimeSchedulingProofSource
    ).toContain("nonItemCastShadowRows=[]");
    expect(
      fixture.payload.contracts.renderContract.progFxType4Light
        ?.runtimeSchedulingProofSource
    ).toContain("proximityRows=[328,329,330,332,378,379,380,382]");
    expect(
      fixture.payload.contracts.renderContract.progFxType4Light
        ?.runtimeSchedulingProofSource
    ).toContain("attachRows=[333,383]");
    expect(
      fixture.payload.contracts.renderContract.progFxType4Light
        ?.runtimeSchedulingProofSource
    ).toContain("type4OwnerPhaseCount=77, itemLightOwnerPhaseCount=56, nonItemOwnerPhaseCount=21");
    expect(
      fixture.payload.contracts.renderContract.progFxType4Light
        ?.runtimeSchedulingProofSource
    ).toContain("nonItemCastShadowOwnerPhaseCount=0");
    expect(
      fixture.payload.contracts.renderContract.progFxType4Light
        ?.runtimeSchedulingProofSource
    ).toContain(
      "nonItemOwnerLabels=[VFX_DUR_BLACKOUT,VFX_DUR_DARKVISION,VFX_FNF_SOUND_BURST,VFX_FNF_STRIKE_HOLY,VFX_DUR_BLINDVISION,VFX_DUR_LOWLIGHTVISION,VFX_DUR_ULTRAVISION,VFX_DUR_BLIND,VFX_FNF_SOUND_BURST_SILENT,VFX_FNF_TELEPORT_IN,VFX_FNF_TELEPORT_OUT]"
    );
    expect(
      fixture.payload.contracts.renderContract.progFxType4Light
        ?.runtimeSchedulingProofSource
    ).toContain(
      "capstoneFreeCallTargetEvidence proofStatus=capstone-free-binary-relative-call-target-scan-ran"
    );
    expect(
      fixture.payload.contracts.renderContract.progFxType4Light
        ?.runtimeSchedulingProofSource
    ).toContain("clientVisualEffectDirectCallXrefCount=1502");
    expect(
      fixture.payload.contracts.renderContract.progFxType4Light
        ?.runtimeSchedulingProofSource
    ).toContain(
      "clientVisualEffectObservedTargetFamilies=[message-readers,visual-transform-reader,looping-vfx-list-attach,progfx-source-loader,vfx-2da-row-loader,fx-light-loader-region,aurora-object-gob-construction,runtime-state-scene-helpers]"
    );
    expect(
      fixture.payload.contracts.renderContract.progFxType4Light
        ?.runtimeSchedulingProofSource
    ).toContain(
      "clientVisualEffectReceiveRenderEvidence proofStatus=source-backed-capstone-free-cnwcmessage-client-vfx-callgraph-vtable-loader-path-scheduler-dataflow-blocked"
    );
    expect(
      fixture.payload.contracts.renderContract.progFxType4Light
        ?.runtimeSchedulingProofSource
    ).toContain(
      "clientVisualEffectSchedulerDataFlowProofStatus=blocked-capstone-free-callgraph-proves-vfx-loader-object-attach-not-progfx-param-scheduler-dataflow"
    );
    expect(
      fixture.payload.contracts.renderContract.progFxType4Light
        ?.runtimeSchedulingProofSource
    ).toContain(
      "legacyDirectCallScanSchedulerStatus=blocked-direct-call-targets-show-vfx-loader-object-attach-not-progfx-param-scheduler-dataflow"
    );
    expect(
      fixture.payload.contracts.renderContract.progFxType4Light?.runtimeSchedulingBlocker
    ).toContain("Param4/Param5/Param6/vision policy semantics are docs-backed");
    expect(fixture.payload.contracts.dependencyGraph.edges).toEqual([
      expect.objectContaining({
        edgeType: "progfx_row",
        requestedResourceClass: "progfx_row",
        requestedRef: "304"
      }),
      expect.objectContaining({
        edgeType: "texture",
        requestedResourceClass: "texture"
      })
    ]);
    const drawRecords = fixture.payload.contracts.renderContract.drawRecords;
    expect(drawRecords).toHaveLength(3);
    expect(drawRecords.every((record) => record.color.b > record.color.r)).toBe(true);
    expect(drawRecords.map((record) => record.atlasProvenance.progFxType4Animation)).toEqual([
      "Blue_5m",
      "Blue_5m",
      "Blue_5m"
    ]);
    expect(fixture.payload.diagnostics.renderContract.map((diagnostic) => diagnostic.code)).toContain(
      "VFX_DEV_PROGFX_TYPE4_LIGHT_DIAGNOSTIC_ONLY"
    );
    expect(fixture.payload.diagnostics.payload.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "VFX_PROGFX_TYPE4_RETAIL_RUNTIME_REQUIRED",
        "VFX_DEV_VISUAL_RUNNER_NOT_PARITY_PROOF",
        "VFX_RETAIL_CAPTURE_REFERENCE_REQUIRED"
      ])
    );
  });

  it("builds the progfx Type 4 owner-phase diagnostic without creating a scene light", () => {
    const fixture = createDevAuroraVfxPayload({
      fixtureId: "vfx-retail-progfx-type4-blue-5m-owner-phase",
      timeSeconds: 0.5,
      seed: 37
    });

    expect(fixture.fixtureId).toBe("vfx-retail-progfx-type4-blue-5m-owner-phase");
    expect(fixture.canonicalParityPromoted).toBe(false);
    expect(fixture.payload.contracts.sourceRows).toEqual(
      expect.objectContaining({
        tableName: "visualeffects.2da",
        rowId: 153,
        label: "VFX_DUR_LIGHT_BLUE_5",
        sourceAuthority: "selectedSource2da-visualeffects-progfx-type4-owner-phase"
      })
    );
    expect(fixture.payload.contracts.renderContract.progFxType4Light).toEqual(
      expect.objectContaining({
        rowId: 304,
        label: "LightBlue5m",
        animation: "Blue_5m",
        symbolicColor: "Blue",
        tokenRadiusMeters: 5,
        radiusMeters: 13.3,
        sourceMdlRadiusMeters: 13.3,
        sourceMdlColor: { r: 0.5, g: 0.5, b: 1 },
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
      })
    );
    expect(fixture.payload.diagnostics.renderContract.map((diagnostic) => diagnostic.code)).toContain(
      "VFX_PROGFX_TYPE4_RENDER_CONTRACT_NO_POINTLIGHT"
    );
  });

  it("builds the progfx Type 4 vision owner-phase diagnostic without inventing a light radius", () => {
    const fixture = createDevAuroraVfxPayload({
      fixtureId: "vfx-retail-progfx-type4-blind-vision-owner-phase",
      timeSeconds: 0.5,
      seed: 37
    });

    expect(fixture.fixtureId).toBe("vfx-retail-progfx-type4-blind-vision-owner-phase");
    expect(fixture.canonicalParityPromoted).toBe(false);
    expect(fixture.payload.contracts.sourceRows).toEqual(
      expect.objectContaining({
        tableName: "visualeffects.2da",
        rowId: 242,
        label: "VFX_DUR_BLINDVISION",
        sourceAuthority: "selectedSource2da-visualeffects-progfx-type4-owner-phase"
      })
    );
    const progFxType4Light = fixture.payload.contracts.renderContract.progFxType4Light;
    expect(progFxType4Light).toEqual(
      expect.objectContaining({
        rowId: 329,
        label: "LightBlindvision",
        animation: "Blind_Vision",
        animationKind: "vision",
        visionMode: "Blind_Vision",
        modelRef: "fx_light_clr",
        sourceMdlNodeName: "AuroraLight02",
        sourceMdlAnimation: "Blind_Vision",
        sourceMdlColor: { r: 0.3, g: 0.3, b: 0.3 },
        sourceMdlRadiusMeters: 7,
        sourceMdlRadiusFrames: [0, 7],
        sourceMdlColorProofStatus: "source-family-backed-fx_light_clr-mdl-animation-rgb",
        sourceMdlRadiusProofStatus: "source-family-backed-fx_light_clr-mdl-animation-radius",
        proofStatus:
          "source-backed-progfx-type4-owner-phase-effect-instance-runtime-retail-unverified",
        runtimeSchedulingStatus:
          "source-backed-owner-phase-effect-instance-ready-retail-runtime-unverified",
        priorityRaw: "53",
        priority: 53,
        proximitySuppressionRaw: "1",
        proximitySuppression: true,
        attachToSceneRaw: "0",
        attachToScene: false,
        visualPreviewStatus: "backend-render-contract-source-record-no-scene-light",
        ownerVisualEffectRowId: 242,
        ownerVisualEffectLabel: "VFX_DUR_BLINDVISION",
        ownerPhase: "duration",
        ownerProgFxRef: "329",
        ownerEffectConstructorKind: "EffectVisualEffect",
        ownerDurationType: "temporary"
      })
    );
    expect(progFxType4Light).not.toHaveProperty("symbolicColor");
    expect(progFxType4Light).not.toHaveProperty("radiusMeters");
    expect(progFxType4Light).not.toHaveProperty("radiusProofStatus");
    expect(
      fixture.payload.contracts.renderContract.drawRecords.map(
        (record) => record.atlasProvenance.progFxType4Animation
      )
    ).toEqual(["Blind_Vision", "Blind_Vision", "Blind_Vision"]);
    expect(fixture.payload.diagnostics.renderContract.map((diagnostic) => diagnostic.code)).toContain(
      "VFX_PROGFX_TYPE4_RENDER_CONTRACT_NO_POINTLIGHT"
    );
  });

  it("builds a source-backed progfx Type 4 multi-request policy diagnostic", () => {
    const fixture = createDevAuroraVfxPayload({
      fixtureId: "vfx-retail-progfx-type4-multi-request-policy",
      timeSeconds: 0.5,
      seed: 37
    });

    expect(fixture.fixtureId).toBe("vfx-retail-progfx-type4-multi-request-policy");
    expect(fixture.canonicalParityPromoted).toBe(false);
    expect(fixture.payload.contracts.sourceRows).toEqual(
      expect.objectContaining({
        tableName: "visualeffects.2da",
        rowId: 5,
        sourceAuthority: "retail-key-bif-visualeffects-progfx-type4-multi-request-policy"
      })
    );
    expect(fixture.payload.contracts.renderContract.progFxType4Light).toEqual(
      expect.objectContaining({
        rowId: 333,
        label: "LightAreaBlackout",
        animation: "Blind_Vision",
        priority: 13,
        proximitySuppression: false,
        attachToScene: true,
        ownerVisualEffectRowId: 5,
        ownerVisualEffectLabel: "VFX_DUR_BLACKOUT",
        ownerProgFxRef: "333"
      })
    );
    expect(fixture.payload.contracts.renderContract.progFxType4Requests).toEqual([
      expect.objectContaining({
        rowId: 333,
        label: "LightAreaBlackout",
        animationKind: "vision",
        priority: 13,
        attachToScene: true
      }),
      expect.objectContaining({
        rowId: 304,
        label: "LightBlue5m",
        animationKind: "light",
        priority: 20,
        attachToScene: false
      }),
      expect.objectContaining({
        rowId: 308,
        label: "LightYellow5m",
        animationKind: "light",
        priority: 20,
        attachToScene: false
      }),
      expect.objectContaining({
        rowId: 328,
        label: "LightDarkvision",
        animationKind: "vision",
        priority: 51,
        proximitySuppression: true,
        sourceMdlRadiusMeters: 15
      })
    ]);
    expect(
      fixture.payload.contracts.dependencyGraph.edges.map((edge) => edge.requestedRef)
    ).toEqual(["333", "304", "308", "328", "fx_canonical_fire"]);
    expect(
      fixture.payload.contracts.renderContract.drawRecords.map(
        (record) => record.atlasProvenance.progFxType4Animation
      )
    ).toEqual(["Blind_Vision", "Blind_Vision", "Blind_Vision", "Blind_Vision"]);
    expect(fixture.payload.diagnostics.renderContract.map((diagnostic) => diagnostic.code)).toContain(
      "VFX_PROGFX_TYPE4_MULTI_REQUEST_RENDER_CONTRACT_NO_POINTLIGHT"
    );
  });

  it("builds the cross-lane all-light-lanes policy diagnostic without retail ordering promotion", () => {
    const fixture = createDevAuroraVfxPayload({
      fixtureId: "vfx-retail-cross-lane-all-light-lanes-policy",
      timeSeconds: 0.5,
      seed: 37
    });

    expect(fixture.fixtureId).toBe("vfx-retail-cross-lane-all-light-lanes-policy");
    expect(fixture.canonicalParityPromoted).toBe(false);
    expect(fixture.payload.contracts.sourceRows).toEqual(
      expect.objectContaining({
        tableName: "progfx.2da",
        rowId: 304,
        sourceAuthority: "retail-key-bif-progfx-type4-cross-lane-coverage"
      })
    );
    expect(fixture.payload.contracts.renderContract).toEqual(
      expect.objectContaining({
        drawParticleCount: 4,
        activeParticleCount: 4,
        drawVertexCount: 24
      })
    );
    expect(fixture.payload.contracts.renderContract.progFxType4Light).toEqual(
      expect.objectContaining({
        rowId: 304,
        label: "LightBlue5m",
        animation: "Blue_5m",
        priority: 20,
        proximitySuppression: false,
        attachToScene: false,
        proofStatus:
          "source-backed-progfx-type4-cross-lane-runtime-coverage-request-not-pointlight",
        runtimeSchedulingStatus:
          "docs-backed-progfx-type4-policy-diagnostic-cross-lane-retail-ordering-blocked",
        visualPreviewStatus:
          "local-cross-lane-coverage-fixture-no-retail-lightmanager-insertion-proof"
      })
    );
    expect(
      fixture.payload.diagnostics.payload.map((diagnostic) => diagnostic.code)
    ).toContain("VFX_CROSS_LANE_LIGHT_RUNTIME_COVERAGE_ONLY");
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
