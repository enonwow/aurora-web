import {
  buildAuroraAoeRuntimeObject,
  buildAuroraVfxPhaseSchedule,
  diagnoseCatalogVfxPreviewSourceBoundary,
  parseAuroraAoeTwoDa,
  parseAuroraDamageHitVisualTwoDa,
  parseAuroraItemPropertyVisualFxTwoDa,
  parseAuroraProgFxTwoDa,
  parseAuroraSpellsTwoDa,
  parseAuroraTwoDaTable,
  parseAuroraVisualEffectsTwoDa,
  summarizeAuroraProgFxType4VisualEffectOwners,
  summarizeAuroraProgFxType4Rows
} from "../../src/modules/vfx/domain/aurora-vfx-source.parser";

const VISUALEFFECTS_HEADER = [
  "Label",
  "Type_FD",
  "OrientWithGround",
  "Imp_HeadCon_Node",
  "Imp_Impact_Node",
  "Imp_Root_S_Node",
  "Imp_Root_M_Node",
  "Imp_Root_L_Node",
  "Imp_Root_H_Node",
  "ProgFX_Impact",
  "SoundImpact",
  "ProgFX_Duration",
  "SoundDuration",
  "ProgFX_Cessation",
  "SoundCessastion",
  "Ces_HeadCon_Node",
  "Ces_Impact_Node",
  "Ces_Root_S_Node",
  "Ces_Root_M_Node",
  "Ces_Root_L_Node",
  "Ces_Root_H_Node",
  "ShakeType",
  "ShakeDelay",
  "ShakeDuration",
  "LowViolence",
  "LowQuality",
  "OrientWithObject"
] as const;

function visualEffectsRow(
  rowId: number,
  overrides: Partial<Record<(typeof VISUALEFFECTS_HEADER)[number], string>>
): string {
  const cells = VISUALEFFECTS_HEADER.map((column) => overrides[column] ?? "****");
  return `${rowId} ${cells.join(" ")}`;
}

function rowWithHeader<TColumn extends string>(
  rowId: number,
  header: readonly TColumn[],
  overrides: Partial<Record<TColumn, string>>
): string {
  const cells = header.map((column) => overrides[column] ?? "****");
  return `${rowId} ${cells.join(" ")}`;
}

describe("aurora-vfx-source parser", () => {
  it("preserves generic 2DA row identity, quoted cells, defaults, and missing cells", () => {
    const table = parseAuroraTwoDaTable(
      [
        "2DA V2.0",
        "",
        "DEFAULT: ****",
        "  Label ModelName",
        '0 "Friendly Fire" fx_fire',
        "7 SparseOnly"
      ].join("\n"),
      { tableName: "fixture.2da", profile: "test" }
    );

    expect(table.version).toBe("2DA V2.0");
    expect(table.defaultTokens).toEqual(["DEFAULT:", "****"]);
    expect(table.header).toEqual(["Label", "ModelName"]);
    expect(table.rows.map((row) => row.rowId)).toEqual([0, 7]);
    expect(table.rows[0].cellsByColumn.Label.value).toBe("Friendly Fire");
    expect(table.rows[0].cellsByColumn.Label.quoted).toBe(true);
    expect(table.rows[1].cellsByColumn.ModelName.missing).toBe(true);
    expect(table.rows[1].cellsByColumn.ModelName.raw).toBe("****");
    expect(table.diagnostics.map((entry) => entry.code)).toContain(
      "VFX_2DA_ROW_MISSING_CELLS_PRESERVED"
    );
  });

  it("models visualeffects.2da rows as preserve-first source facts across F/D/B/P and blank rows", () => {
    const header = [...VISUALEFFECTS_HEADER, "CustomUnknown"] as const;
    const source = [
      "2DA V2.0",
      "",
      header.join(" "),
      rowWithHeader(22, header, {
        Label: "VFX_FNF_FIREBALL",
        Type_FD: "F",
        ProgFX_Impact: "11",
        SoundImpact: "sff_explfire",
        ShakeType: "2",
        ShakeDelay: "0",
        ShakeDuration: "0.3",
        LowViolence: "1000",
        LowQuality: "1001",
        OrientWithGround: "1",
        OrientWithObject: "0",
        CustomUnknown: "preserved"
      }),
      rowWithHeader(355, header, {
        Label: "VFX_DUR_CUTSCENE_INVISIBILITY",
        Type_FD: "D",
        ProgFX_Duration: "148",
        SoundDuration: "sff_loop"
      }),
      rowWithHeader(210, header, {
        Label: "VFX_BEAM_FIRE",
        Type_FD: "B",
        ProgFX_Duration: "601"
      }),
      rowWithHeader(181, header, {
        Label: "VFX_IMP_MIRV",
        Type_FD: "P",
        ProgFX_Impact: "900"
      }),
      rowWithHeader(999, header, {})
    ].join("\n");

    const parsed = parseAuroraVisualEffectsTwoDa(source, {
      profile: "fixture-8193.34",
      sourceLayer: "hak",
      sourceObjectKey: "__aurora/sources/hak/lc_vfx/visualeffects.2da",
      sourceHash: "sha256:visualeffects"
    });

    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.rows.map((row) => row.typeFd)).toEqual(["F", "D", "B", "P", undefined]);
    expect(parsed.rows[0]).toMatchObject({
      sourceTable: "visualeffects.2da",
      sourceHash: "sha256:visualeffects",
      sourceLayer: "hak",
      sourceObjectKey: "__aurora/sources/hak/lc_vfx/visualeffects.2da",
      rowId: 22,
      label: "VFX_FNF_FIREBALL",
      rawCells: {
        CustomUnknown: "preserved",
        SoundImpact: "sff_explfire",
        ProgFX_Impact: "11"
      },
      visualFacts: {
        orientWithGroundRaw: "1",
        orientWithObjectRaw: "0",
        lowViolenceRaw: "1000",
        lowQualityRaw: "1001"
      }
    });
    expect(parsed.rows[0].phases).toEqual([
      expect.objectContaining({
        phase: "impact",
        progFxRowId: 11,
        soundRef: "sff_explfire"
      })
    ]);
    expect(parsed.rows[1].phases).toEqual([
      expect.objectContaining({
        phase: "duration",
        progFxRowId: 148,
        soundRef: "sff_loop"
      })
    ]);
    expect(parsed.rows[2].phases).toEqual([
      expect.objectContaining({
        phase: "duration",
        progFxRowId: 601
      })
    ]);
    expect(parsed.rows[4]).toMatchObject({
      rowId: 999,
      label: "****",
      phases: [],
      clientEvents: []
    });
  });

  it("parses visualeffects.2da phases and column-driven shake client-event sources", () => {
    const source = [
      "2DA V2.0",
      "",
      VISUALEFFECTS_HEADER.join(" "),
      visualEffectsRow(22, {
        Label: "VFX_FNF_FIREBALL",
        Type_FD: "F",
        SoundImpact: "sff_explfire",
        ShakeType: "2",
        ShakeDelay: "0",
        ShakeDuration: "0.3"
      }),
      visualEffectsRow(183, {
        Label: "VFX_FNF_SOUND_BURST",
        Type_FD: "F",
        ProgFX_Duration: "328",
        ProgFX_Cessation: "378",
        SoundImpact: "sff_explsonic",
        ShakeType: "2",
        ShakeDelay: "0",
        ShakeDuration: "2"
      }),
      visualEffectsRow(286, {
        Label: "VFX_FNF_SCREEN_SHAKE",
        Type_FD: "F",
        SoundImpact: "sff_screenshake",
        ShakeType: "2",
        ShakeDuration: "3"
      }),
      visualEffectsRow(287, {
        Label: "VFX_FNF_SCREEN_BUMP",
        Type_FD: "F",
        SoundImpact: "sff_screenbump",
        ShakeType: "1"
      }),
      visualEffectsRow(644, {
        Label: "VFX_IMP_STARBURST_GREEN",
        Type_FD: "F",
        SoundImpact: "sff_screenbump"
      })
    ].join("\n");

    const parsed = parseAuroraVisualEffectsTwoDa(source, "fixture-8193.34");

    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.rows).toHaveLength(5);
    const fireball = parsed.rows.find((row) => row.rowId === 22);
    expect(fireball?.clientEvents[0]).toMatchObject({
      eventKind: "shake_or_bump",
      shakeType: 2,
      shakeKind: "screen_shake",
      delaySeconds: 0,
      durationSeconds: 0.3
    });
    expect(fireball?.phases).toEqual([
      expect.objectContaining({
        phase: "impact",
        soundRef: "sff_explfire"
      })
    ]);

    const soundBurst = parsed.rows.find((row) => row.rowId === 183);
    expect(soundBurst?.phases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          phase: "duration",
          progFxRowId: 328
        }),
        expect.objectContaining({
          phase: "cessation",
          progFxRowId: 378
        })
      ])
    );

    const bump = parsed.rows.find((row) => row.rowId === 287);
    expect(bump?.clientEvents[0]).toMatchObject({
      shakeType: 1,
      shakeKind: "screen_bump"
    });
    expect(bump?.clientEvents[0].durationSeconds).toBeUndefined();

    const starburst = parsed.rows.find((row) => row.rowId === 644);
    expect(starburst?.clientEvents).toHaveLength(0);
    expect(starburst?.diagnostics.map((entry) => entry.code)).toContain(
      "VFX_2DA_SCREENBUMP_SOUND_NOT_SHAKETYPE"
    );
  });

  it("keeps progfx.2da sparse row ids and raw Param1..Param8 cells", () => {
    const source = [
      "2DA V2.0",
      "",
      "Label Type Param1 Param2 Param3 Param4 Param5 Param6 Param7 Param8",
      "11 BeamGlow 1 p0 p1 **** **** **** **** **** ****",
      "148 DurationLoop 4 light 0.25 1.5 **** **** **** **** ****",
      "900 MIRV 10 a b c d e f g h"
    ].join("\n");

    const parsed = parseAuroraProgFxTwoDa(source, "fixture-8193.34");

    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.rows.map((row) => row.rowId)).toEqual([11, 148, 900]);
    expect(parsed.rows[1]).toMatchObject({
      rowId: 148,
      label: "DurationLoop",
      type: 4,
      type4Light: {
        proofStatus: "profile-gated-source-preserved-no-runtime-scheduling",
        animationRaw: "light",
        animation: "light",
        animationParameterStatus:
          "source-backed-progfx-type4-param1-animation-token-preserved",
        animationSpeedRaw: "0.25",
        animationSpeed: 0.25,
        animationSpeedParameterStatus:
          "source-backed-progfx-type4-param2-animation-speed-preserved-runtime-playback-blocked",
        castShadowsRaw: "1.5",
        castShadowParameterStatus:
          "source-backed-progfx-type4-param3-cast-shadows-preserved-item-toggle-known-non-item-vanilla-cast-shadow-absent",
        parameterPreservationProofStatus:
          "source-backed-progfx-type4-param1-param8-raw-preserved",
        parameterSource:
          "retail progfx.2da Type 4 Param1 animation, Param2 speed, Param3 cast shadows, Param4 priority, Param5 proximity suppression, Param6 attach to scene, Param7 model"
      }
    });
    expect(parsed.rows[1]?.diagnostics.map((entry) => entry.code)).toEqual([
      "VFX_PROGFX_TYPE4_REQUEST_CONTEXT_REQUIRED",
      "VFX_PROGFX_TYPE4_NOT_MDL_LIGHT_NODE",
      "VFX_CLIENT_LIGHT_NOT_GENERIC_POINT_LIGHT"
    ]);
    expect(parsed.rows[1].params).toEqual([
      { column: "Param1", raw: "light", value: "light" },
      { column: "Param2", raw: "0.25", value: "0.25" },
      { column: "Param3", raw: "1.5", value: "1.5" },
      { column: "Param4", raw: "****" },
      { column: "Param5", raw: "****" },
      { column: "Param6", raw: "****" },
      { column: "Param7", raw: "****" },
      { column: "Param8", raw: "****" }
    ]);
  });

  it("types ProgFX 7 Param1 model and Param2 animation from the retail beam loader contract", () => {
    const source = [
      "2DA V2.0",
      "",
      "Label Type Param1 Param2 Param3 Param4 Param5 Param6 Param7 Param8",
      "607 BeamFireLash 7 vim_lashfire cast01 **** **** **** **** **** ****"
    ].join("\n");

    const parsed = parseAuroraProgFxTwoDa(source, "fixture-type7-beam");

    expect(parsed.rows[0]).toMatchObject({
      rowId: 607,
      type: 7,
      type7Beam: {
        proofStatus: "retail-client-disassembly-backed-progfx-type7-beam-owner",
        modelRaw: "vim_lashfire",
        modelRef: "vim_lashfire",
        animationRaw: "cast01",
        animation: "cast01",
        parameterSource:
          "CNWCVisualEffectOnObject::LoadBeam Param1 model; ApplyBeam Param2 animation"
      }
    });
  });

  it("types ProgFX 10 parameters from the retail projectile handler contract", () => {
    const source = [
      "2DA V2.0",
      "",
      "Label Type Param1 Param2 Param3 Param4 Param5 Param6 Param7 Param8",
      "900 MIRV 10 vpr_magmisl 340 0 4 log **** **** ****"
    ].join("\n");

    const parsed = parseAuroraProgFxTwoDa(source, "fixture-type10-projectile");

    expect(parsed.rows[0]).toMatchObject({
      rowId: 900,
      type: 10,
      type10Projectile: {
        proofStatus: "retail-client-disassembly-backed-progfx-type10-projectile-owner",
        modelRaw: "vpr_magmisl",
        modelRef: "vpr_magmisl",
        projectileRowRaw: "340",
        projectileRow: 340,
        orientationModeRaw: "0",
        orientationMode: 0,
        pathStyleRaw: "4",
        pathStyle: 4,
        timingProfileRaw: "log",
        timingProfile: "log",
        parameterSource:
          "nwmain.exe 0x14096a9a0: Param1 model, Param2 projectile row, Param3 orientation mode, Param4 path style, Param5 timing profile"
      }
    });
  });

  it("preserves progfx.2da Type 4 light parameters without runtime scheduling", () => {
    const source = [
      "2DA V2.0",
      "",
      "Label Type Param1 Param2 Param3 Param4 Param5 Param6 Param7 Param8",
      "304 LightBlue5m 4 Blue_5m 1 0 20 0 0 fx_light_clr ****",
      "333 LightAreaBlackout 4 Blind_Vision 1 0 13 0 1 fx_light_clr ****"
    ].join("\n");

    const parsed = parseAuroraProgFxTwoDa(source, "fixture-8193.34");

    expect(parsed.rows[0]).toMatchObject({
      rowId: 304,
      label: "LightBlue5m",
      type: 4,
      type4Light: {
        proofStatus: "profile-gated-source-preserved-no-runtime-scheduling",
        animationRaw: "Blue_5m",
        animation: "Blue_5m",
        animationParameterStatus:
          "source-backed-progfx-type4-param1-animation-token-preserved",
        animationKind: "light",
        animationSymbolicColor: "Blue",
        animationTokenRadiusMeters: 5,
        animationTokenRadiusProofStatus: "source-backed-progfx-param1-animation-token-radius",
        sourceMdlNodeName: "AuroraLight01",
        sourceMdlAnimation: "Blue_5m",
        sourceMdlColor: { r: 0.5, g: 0.5, b: 1 },
        sourceMdlRadiusMeters: 13.3,
        sourceMdlRadiusFrames: [0, 13.3],
        sourceMdlColorProofStatus: "source-family-backed-fx_light_clr-mdl-animation-rgb",
        sourceMdlRadiusProofStatus: "source-family-backed-fx_light_clr-mdl-animation-radius",
        animationSemanticSource:
          "progfx.2da Type 4 Param1 names the fx_light_clr.mdl animation; 5m/10m/15m/20m is preserved as a token, while source MDL controller type 88 supplies radius",
        animationSpeedRaw: "1",
        animationSpeed: 1,
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
        modelParameterStatus:
          "source-backed-progfx-type4-param7-model-ref-preserved-client-loader-path-source-backed",
        parameterPreservationProofStatus:
          "source-backed-progfx-type4-param1-param8-raw-preserved"
      }
    });
    expect(parsed.rows[1]?.type4Light).toMatchObject({
      animation: "Blind_Vision",
      animationKind: "vision",
      visionMode: "Blind_Vision",
      visionParameterStatus:
        "docs-backed-progfx-type4-param1-vision-token-param4-priority",
      sourceMdlNodeName: "AuroraLight02",
      sourceMdlAnimation: "Blind_Vision",
      sourceMdlColor: { r: 0.3, g: 0.3, b: 0.3 },
      sourceMdlRadiusMeters: 7,
      sourceMdlRadiusFrames: [0, 7],
      sourceMdlColorProofStatus: "source-family-backed-fx_light_clr-mdl-animation-rgb",
      sourceMdlRadiusProofStatus: "source-family-backed-fx_light_clr-mdl-animation-radius",
      priority: 13,
      attachToScene: true
    });
    expect(parsed.rows[0]?.diagnostics.map((entry) => entry.code)).toEqual([
      "VFX_PROGFX_TYPE4_REQUEST_CONTEXT_REQUIRED",
      "VFX_PROGFX_TYPE4_NOT_MDL_LIGHT_NODE",
      "VFX_CLIENT_LIGHT_NOT_GENERIC_POINT_LIGHT"
    ]);
  });

  it("summarizes ProgFX Type 4 table parameters without promoting runtime scheduler parity", () => {
    const source = [
      "2DA V2.0",
      "",
      "Label Type Param1 Param2 Param3 Param4 Param5 Param6 Param7 Param8",
      "300 LightBlue5m 4 Blue_5m 1 0 20 0 0 fx_light_clr ****",
      "327 LightWhite20m 4 white_20m 1 1 44 0 0 fx_light_clr ****",
      "333 LightAreaBlackout 4 Blind_Vision 1 0 13 0 1 fx_light_clr ****",
      "350 FadeLBlue5m 4 Blue_5m 1 0 20 1 0 fx_light_clr ****",
      "900 Smoke 9 chunk **** **** **** **** **** ****",
      "901 CustomType4 4 CustomAnim 0.5 **** **** **** 1 custom_model ****"
    ].join("\n");

    const parsed = parseAuroraProgFxTwoDa(source, "fixture-type4-summary");
    const summary = summarizeAuroraProgFxType4Rows(parsed.rows);

    expect(summary).toEqual({
      sourceTable: "progfx.2da",
      proofStatus:
        "source-backed-progfx-type4-table-parameter-distribution-runtime-scheduler-blocked",
      rowCount: 6,
      type4RowCount: 5,
      itemLightNormalRowCount: 2,
      itemLightFadeRowCount: 1,
      nonItemType4RowCount: 2,
      animationKindCounts: {
        light: 3,
        vision: 1,
        unknown: 1
      },
      castShadowsBooleanCounts: {
        true: 1,
        false: 3,
        unknown: 1
      },
      proximitySuppressionBooleanCounts: {
        true: 1,
        false: 3,
        unknown: 1
      },
      attachToSceneBooleanCounts: {
        true: 2,
        false: 3,
        unknown: 0
      },
      castShadowsRawCounts: {
        "****": 1,
        "0": 3,
        "1": 1
      },
      priorityRawCounts: {
        "****": 1,
        "13": 1,
        "20": 2,
        "44": 1
      },
      proximitySuppressionRawCounts: {
        "****": 1,
        "0": 3,
        "1": 1
      },
      attachToSceneRawCounts: {
        "0": 3,
        "1": 2
      },
      modelCounts: {
        custom_model: 1,
        fx_light_clr: 4
      },
      lightTokenRadiusCounts: {
        "****": 2,
        "5": 2,
        "20": 1
      },
      sampleRows: expect.arrayContaining([
        expect.objectContaining({
          rowId: 300,
          label: "LightBlue5m",
          animation: "Blue_5m",
          animationKind: "light",
          castShadowsRaw: "0",
          priorityRaw: "20",
          proximitySuppressionRaw: "0",
          attachToSceneRaw: "0",
          modelRef: "fx_light_clr"
        }),
        expect.objectContaining({
          rowId: 333,
          animation: "Blind_Vision",
          animationKind: "vision",
          attachToSceneRaw: "1"
        }),
        expect.objectContaining({
          rowId: 901,
          animation: "CustomAnim",
          attachToSceneRaw: "1",
          modelRef: "custom_model"
        })
      ]),
      nonItemRows: expect.arrayContaining([
        expect.objectContaining({
          rowId: 333,
          animation: "Blind_Vision",
          animationKind: "vision",
          attachToSceneRaw: "1"
        }),
        expect.objectContaining({
          rowId: 901,
          animation: "CustomAnim",
          attachToSceneRaw: "1",
          modelRef: "custom_model"
        })
      ]),
      nonItemCastShadowRows: [],
      proximitySuppressionRows: [
        expect.objectContaining({
          rowId: 350,
          proximitySuppressionRaw: "1"
        })
      ],
      attachToSceneRows: expect.arrayContaining([
        expect.objectContaining({
          rowId: 333,
          attachToSceneRaw: "1"
        }),
        expect.objectContaining({
          rowId: 901,
          attachToSceneRaw: "1"
        })
      ]),
      visionRows: [
        expect.objectContaining({
          rowId: 333,
          animationKind: "vision"
        })
      ],
      remainingBlockedSemantics: [
        "Param3/Param4/Param5/Param6 table distribution is source-backed",
        "retail table/owner-phase audit proves nonItemCastShadowRows=[] and nonItemCastShadowOwnerPhaseCount=0 for vanilla resources",
        "table distribution does not prove runtime scheduler order, vtable dispatch, proximity suppression, scene attachment, vision mutation, or cross-lane insertion behavior"
      ]
    });
  });

  it("maps visualeffects.2da owner phases to ProgFX Type 4 rows without inventing scene lights", () => {
    const visualEffectsSource = [
      "2DA V2.0",
      "",
      VISUALEFFECTS_HEADER.join(" "),
      visualEffectsRow(153, {
        Label: "VFX_DUR_LIGHT_BLUE_5",
        Type_FD: "D",
        ProgFX_Duration: "300",
        ProgFX_Cessation: "350"
      }),
      visualEffectsRow(183, {
        Label: "VFX_FNF_SOUND_BURST",
        Type_FD: "F",
        ProgFX_Duration: "328",
        ProgFX_Cessation: "378"
      }),
      visualEffectsRow(333, {
        Label: "VFX_DUR_BLACKOUT",
        Type_FD: "D",
        ProgFX_Duration: "333"
      }),
      visualEffectsRow(900, {
        Label: "VFX_TEST_NON_TYPE4",
        Type_FD: "D",
        ProgFX_Duration: "901"
      }),
      visualEffectsRow(901, {
        Label: "VFX_TEST_MISSING_PROGFX",
        Type_FD: "D",
        ProgFX_Duration: "999"
      })
    ].join("\n");
    const progFxSource = [
      "2DA V2.0",
      "",
      "Label Type Param1 Param2 Param3 Param4 Param5 Param6 Param7 Param8",
      "300 LightBlue5m 4 Blue_5m 1 0 20 0 0 fx_light_clr ****",
      "328 LightDarkvision 4 Dark_Vision 1 0 49 1 0 fx_light_clr ****",
      "333 LightAreaBlackout 4 Blind_Vision 1 0 13 0 1 fx_light_clr ****",
      "350 FadeLBlue5m 4 Blue_5m 1 0 20 1 0 fx_light_clr ****",
      "378 FadeLDarkvision 4 Dark_Vision 1 0 49 1 0 fx_light_clr ****",
      "901 Smoke 9 chunk **** **** **** **** **** ****"
    ].join("\n");

    const visualEffects = parseAuroraVisualEffectsTwoDa(
      visualEffectsSource,
      "fixture-vfx-progfx-owner-map"
    );
    const progFx = parseAuroraProgFxTwoDa(progFxSource, "fixture-vfx-progfx-owner-map");
    const summary = summarizeAuroraProgFxType4VisualEffectOwners(
      visualEffects.rows,
      progFx.rows
    );

    expect(summary).toEqual({
      sourceTable: "visualeffects.2da",
      linkedProgFxTable: "progfx.2da",
      proofStatus:
        "source-backed-visualeffects-progfx-type4-owner-phase-map-runtime-scheduler-blocked",
      visualEffectRowCount: 5,
      type4OwnerPhaseCount: 5,
      itemLightOwnerPhaseCount: 2,
      nonItemOwnerPhaseCount: 3,
      nonItemVisionOwnerPhaseCount: 3,
      nonItemCastShadowOwnerPhaseCount: 0,
      nonItemAttachToSceneOwnerPhaseCount: 1,
      nonItemProximitySuppressionOwnerPhaseCount: 2,
      missingProgFxReferenceCount: 1,
      nonType4ProgFxReferenceCount: 1,
      ownerPhaseCounts: {
        impact: 0,
        duration: 3,
        cessation: 2
      },
      nonItemOwnerRows: expect.arrayContaining([
        expect.objectContaining({
          visualEffectRowId: 183,
          visualEffectLabel: "VFX_FNF_SOUND_BURST",
          phase: "duration",
          progFxRowId: 328,
          progFxLabel: "LightDarkvision",
          ownerKind: "non-item",
          animation: "Dark_Vision",
          animationKind: "vision",
          priorityRaw: "49",
          proximitySuppressionRaw: "1"
        }),
        expect.objectContaining({
          visualEffectRowId: 333,
          progFxRowId: 333,
          ownerKind: "non-item",
          animation: "Blind_Vision",
          attachToSceneRaw: "1"
        })
      ]),
      itemLightOwnerRows: expect.arrayContaining([
        expect.objectContaining({
          visualEffectRowId: 153,
          phase: "duration",
          progFxRowId: 300,
          ownerKind: "item-light",
          animation: "Blue_5m"
        }),
        expect.objectContaining({
          visualEffectRowId: 153,
          phase: "cessation",
          progFxRowId: 350,
          ownerKind: "item-light",
          animation: "Blue_5m"
        })
      ]),
      remainingBlockedSemantics: [
        "visualeffects.2da owner phase references for ProgFX Type 4 are source-backed",
        "owner phase mapping does not prove client runtime scheduler priority, proximity suppression, scene attachment, vision mutation, or shadow projection behavior",
        "retail cross-lane ordering still requires scheduler data-flow or a retail oracle scene"
      ]
    });
  });

  it("preserves profile-mismatch visualeffects.2da columns as diagnostics instead of runtime fields", () => {
    const header = [
      ...VISUALEFFECTS_HEADER,
      "Dur_Head_Node",
      "DelayDurationFX",
      "ImpactSEF"
    ] as const;
    const source = [
      "2DA V2.0",
      "",
      header.join(" "),
      rowWithHeader(401, header, {
        Label: "VFX_PROFILE_MISMATCH",
        Type_FD: "D",
        Dur_Head_Node: "dur_head",
        DelayDurationFX: "0.25",
        ImpactSEF: "fx_profile.sef"
      })
    ].join("\n");

    const row = parseAuroraVisualEffectsTwoDa(source, "fixture-aurora").rows[0];

    expect(row.profileMismatches).toEqual([
      {
        column: "Dur_Head_Node",
        raw: "dur_head",
        value: "dur_head",
        reason: "duration_node"
      },
      {
        column: "DelayDurationFX",
        raw: "0.25",
        value: "0.25",
        reason: "delay_duration_fx"
      },
      {
        column: "ImpactSEF",
        raw: "fx_profile.sef",
        value: "fx_profile.sef",
        reason: "sef"
      }
    ]);
    expect(row.diagnostics.map((entry) => entry.code)).toEqual(
      expect.arrayContaining(["VFX_SOURCE_PROFILE_MISMATCH_FIELD_PRESERVED"])
    );
    expect(row.rawCells).toMatchObject({
      Dur_Head_Node: "dur_head",
      DelayDurationFX: "0.25",
      ImpactSEF: "fx_profile.sef"
    });
  });

  it("preserves vfx_persistent.2da AOE shape, script, visual, model, and sound facts", () => {
    const header = [
      "LABEL",
      "SHAPE",
      "RADIUS",
      "WIDTH",
      "LENGTH",
      "ONENTER",
      "ONEXIT",
      "HEARTBEAT",
      "VisualFX",
      "DurationVFX",
      "MODEL01",
      "MODEL02",
      "MODEL03",
      "NUMACT01",
      "NUMACT02",
      "NUMACT03",
      "DURATION01",
      "DURATION02",
      "DURATION03",
      "EDGEWGHT01",
      "EDGEWGHT02",
      "EDGEWGHT03",
      "SoundImpact",
      "SoundDuration",
      "SoundCessation",
      "SoundOneShot",
      "SoundOneShotPercentage",
      "MODELMIN01",
      "MODELMIN02",
      "MODELMIN03"
    ] as const;
    const source = [
      "2DA V2.0",
      "",
      header.join(" "),
      rowWithHeader(0, header, {
        LABEL: "VFX_PER_FOGACID",
        SHAPE: "C",
        RADIUS: "5",
        WIDTH: "10",
        LENGTH: "2",
        ONENTER: "nw_aoe_enter",
        ONEXIT: "nw_aoe_exit",
        HEARTBEAT: "nw_aoe_hb",
        VisualFX: "230",
        DurationVFX: "230",
        MODEL01: "vps_fogacid",
        MODEL02: "vps_fogacid2",
        MODEL03: "vps_fogacid3",
        NUMACT01: "5",
        NUMACT02: "10",
        NUMACT03: "5",
        DURATION01: "3400",
        DURATION02: "1100",
        DURATION03: "1900",
        EDGEWGHT01: "0",
        EDGEWGHT02: "0.25",
        EDGEWGHT03: "0.25",
        MODELMIN01: "vps_fogacid_low",
        SoundImpact: "sps_fog",
        SoundDuration: "sps_fog_loop",
        SoundCessation: "sps_fog_end",
        SoundOneShot: "sps_fog_once",
        SoundOneShotPercentage: "0.3"
      })
    ].join("\n");

    const parsed = parseAuroraAoeTwoDa(source, {
      profile: "fixture-8193.34",
      sourceLayer: "hak",
      sourceHash: "sha256:aoe"
    });

    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.rows[0]).toMatchObject({
      sourceTable: "vfx_persistent.2da",
      sourceHash: "sha256:aoe",
      rowId: 0,
      label: "VFX_PER_FOGACID",
      shapeRaw: "C",
      radiusRaw: "5",
      widthRaw: "10",
      lengthRaw: "2",
      visualFxRaw: "230",
      durationVfxRaw: "230",
      eventScripts: {
        onEnterRaw: "nw_aoe_enter",
        onExitRaw: "nw_aoe_exit",
        heartbeatRaw: "nw_aoe_hb"
      },
      modelFootprintRefs: {
        MODEL01: "vps_fogacid",
        MODEL02: "vps_fogacid2",
        MODEL03: "vps_fogacid3",
        MODELMIN01: "vps_fogacid_low"
      },
      modelFootprintSchedule: [
        {
          slot: 1,
          modelRefRaw: "vps_fogacid",
          lowQualityModelRefRaw: "vps_fogacid_low",
          activeCountRaw: "5",
          activeCount: 5,
          durationMillisecondsRaw: "3400",
          durationMilliseconds: 3400,
          edgeWeightRaw: "0",
          edgeWeight: 0
        },
        {
          slot: 2,
          modelRefRaw: "vps_fogacid2",
          activeCount: 10,
          durationMilliseconds: 1100,
          edgeWeight: 0.25
        },
        {
          slot: 3,
          modelRefRaw: "vps_fogacid3",
          activeCount: 5,
          durationMilliseconds: 1900,
          edgeWeight: 0.25
        }
      ],
      soundFootprintRefs: {
        SoundImpact: "sps_fog",
        SoundDuration: "sps_fog_loop",
        SoundCessation: "sps_fog_end",
        SoundOneShot: "sps_fog_once",
        SoundOneShotPercentage: "0.3"
      }
    });
    expect(parsed.rows[0].diagnostics.map((entry) => entry.code)).toContain(
      "VFX_AOE_ROW_NOT_VISUALEFFECTS_ROW"
    );

    const built = buildAuroraAoeRuntimeObject(parsed.rows[0], {
      constructorKind: "EffectAreaOfEffect",
      sourceRowId: 0,
      applicationMode: "static_location",
      durationType: "temporary",
      durationSeconds: 20,
      creatorRef: "caster-1",
      anchorLocation: { x: 1, y: 2, z: 3 },
      lifecycleState: "active"
    });
    expect(built.runtimeObject).toMatchObject({
      version: "aurora-aoe-runtime-object/v1",
      sourceTable: "vfx_persistent.2da",
      sourceRowId: 0,
      tag: "VFX_PER_FOGACID",
      shapeFootprint: {
        shape: "circle",
        radius: 5,
        proofStatus: "selected-profile-source-backed"
      },
      visualFootprint: {
        version: "aurora-aoe-visual-footprint/v1",
        orientWithGround: false,
        groups: [
          {
            slot: 1,
            activeCount: 5,
            durationMilliseconds: 3400,
            edgePercent: 0
          },
          {
            slot: 2,
            activeCount: 10,
            durationMilliseconds: 1100,
            edgePercent: 25
          },
          {
            slot: 3,
            activeCount: 5,
            durationMilliseconds: 1900,
            edgePercent: 25
          }
        ],
        owners: expect.arrayContaining([
          expect.objectContaining({
            ownerId: "aoe:0:slot:1:owner:0",
            initialDelayMilliseconds: 0
          }),
          expect.objectContaining({
            ownerId: "aoe:0:slot:3:owner:4",
            initialDelayMilliseconds: 2100
          })
        ])
      },
      lifecycleState: "active"
    });
    expect(built.runtimeObject?.eventScripts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ event: "on_enter", resourceClass: "script" }),
        expect.objectContaining({ event: "heartbeat", resourceClass: "script" })
      ])
    );
    expect(built.diagnostics.map((entry) => entry.code)).toContain(
      "VFX_AOE_VISUAL_RUNTIME_PRIMARY_AUDIT_APPLIED"
    );
    expect(built.diagnostics.map((entry) => entry.code)).not.toContain(
      "VFX_AOE_MODEL_SPAWN_SCHEMA_EXTERNAL"
    );
  });

  it("refuses an AOE runtime object without EffectAreaOfEffect application context", () => {
    const parsed = parseAuroraAoeTwoDa(
      ["2DA V2.0", "", "LABEL SHAPE RADIUS", "0 VFX_PER_TEST C 5"].join("\n"),
      "fixture-8193.34"
    );

    const built = buildAuroraAoeRuntimeObject(parsed.rows[0], undefined);

    expect(built.runtimeObject).toBeUndefined();
    expect(built.diagnostics.map((entry) => entry.code)).toContain(
      "VFX_AOE_EFFECT_INSTANCE_REQUIRED"
    );
  });

  it("preserves iprp_visualfx.2da ModelSuffix without mapping it to normal VFX rows", () => {
    const source = [
      "2DA V2.0",
      "",
      "Label Name ModelSuffix SubType",
      "0 Acid Acid acid 1",
      "1 Frost Frost frost 2"
    ].join("\n");

    const parsed = parseAuroraItemPropertyVisualFxTwoDa(source, "fixture-8193.34");

    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.rows[0]).toMatchObject({
      sourceTable: "iprp_visualfx.2da",
      rowId: 0,
      label: "Acid",
      nameRaw: "Acid",
      modelSuffixRaw: "acid",
      subtypeProfileRaw: "1",
      profileData: {
        SubType: "1"
      }
    });
    expect(parsed.rows[0].sourceTable).not.toBe("visualeffects.2da");
    expect(parsed.rows[0].diagnostics.map((entry) => entry.code)).toContain(
      "VFX_IPRP_VISUALFX_MODELSUFFIX_NOT_VISUALEFFECTS_ROW"
    );
  });

  it("preserves spells.2da visual, projectile, script, and sound slots as spell-source facts", () => {
    const source = [
      "2DA V2.0",
      "",
      "Label ConjVisual CastVisual ProjModel ProjSound ProjectileType ImpactScript SoundImpact SoundCast ProjSEF",
      "0 MagicMissile vfx_conj vfx_cast prj_mm snd_proj homing nw_s0_magicmissile snd_impact snd_cast prj_magic.sef"
    ].join("\n");

    const parsed = parseAuroraSpellsTwoDa(source, "fixture-8193.34");

    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.rows[0]).toMatchObject({
      sourceTable: "spells.2da",
      rowId: 0,
      label: "MagicMissile",
      visualSlots: {
        ConjVisual: "vfx_conj",
        CastVisual: "vfx_cast"
      },
      projectileSlots: {
        ProjModel: "prj_mm",
        ProjSound: "snd_proj",
        ProjSEF: "prj_magic.sef"
      },
      scriptSlots: {
        ImpactScript: "nw_s0_magicmissile"
      },
      soundSlots: {
        ProjSound: "snd_proj",
        SoundImpact: "snd_impact",
        SoundCast: "snd_cast"
      }
    });
    expect(parsed.rows[0].profileMismatches).toEqual([
      {
        column: "ProjSEF",
        raw: "prj_magic.sef",
        value: "prj_magic.sef",
        reason: "sef"
      }
    ]);
    expect(parsed.rows[0].diagnostics.map((entry) => entry.code)).toEqual(
      expect.arrayContaining([
        "VFX_SPELLS_SOURCE_FACTS_NOT_VISUALEFFECTS_ROW",
        "VFX_SOURCE_PROFILE_MISMATCH_FIELD_PRESERVED"
      ])
    );
  });

  it("preserves damagehitvisual.2da combat visual refs outside generic EffectVisualEffect rows", () => {
    const source = [
      "2DA V2.0",
      "",
      "Label VisualEffectID RangedEffectID",
      "3 Magical 76 ****",
      "8 Fire 280 ****"
    ].join("\n");

    const parsed = parseAuroraDamageHitVisualTwoDa(source, "fixture-8193.34");

    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.rows[0]).toMatchObject({
      sourceTable: "damagehitvisual.2da",
      rowId: 3,
      label: "Magical",
      visualEffectIdRaw: "76",
      rawCells: {
        VisualEffectID: "76",
        RangedEffectID: "****"
      }
    });
    expect(parsed.rows[0].rangedEffectIdRaw).toBeUndefined();
    expect(parsed.rows[0].diagnostics.map((entry) => entry.code)).toContain(
      "VFX_DAMAGEHIT_ROW_NOT_GENERIC_EFFECTVISUALEFFECT"
    );
  });

  it("refuses to schedule phases or shake client events without effect instance context", () => {
    const source = [
      "2DA V2.0",
      "",
      VISUALEFFECTS_HEADER.join(" "),
      visualEffectsRow(286, {
        Label: "VFX_FNF_SCREEN_SHAKE",
        Type_FD: "F",
        SoundImpact: "sff_screenshake",
        ShakeType: "2",
        ShakeDuration: "3"
      })
    ].join("\n");
    const row = parseAuroraVisualEffectsTwoDa(source, "fixture-8193.34").rows[0];

    const sourceOnly = buildAuroraVfxPhaseSchedule(row);

    expect(sourceOnly.status).toBe("source_only");
    expect(sourceOnly.clientEvents).toHaveLength(0);
    expect(sourceOnly.diagnostics.map((entry) => entry.code)).toEqual(
      expect.arrayContaining([
        "VFX_EFFECT_INSTANCE_CONTEXT_REQUIRED",
        "VFX_CLIENT_EVENT_EFFECT_INSTANCE_REQUIRED"
      ])
    );

    const ready = buildAuroraVfxPhaseSchedule(row, {
      constructorKind: "EffectVisualEffect",
      sourceRowId: 286,
      applicationMode: "location",
      durationType: "instant",
      targetRef: "area:module_start"
    });

    expect(ready.status).toBe("ready");
    expect(ready.clientEvents).toHaveLength(1);
    expect(ready.diagnostics.map((entry) => entry.code)).not.toContain(
      "VFX_CLIENT_EVENT_EFFECT_INSTANCE_REQUIRED"
    );
  });

  it("diagnoses catalog VFX preview metadata instead of accepting it as a source row", () => {
    const diagnostics = diagnoseCatalogVfxPreviewSourceBoundary({
      vfxPreset: "torch_smoke_soft",
      placeableSubtype: "vfx",
      rendererPreset: "vfx-emitter"
    });

    expect(diagnostics.map((entry) => entry.code)).toEqual([
      "VFX_CATALOG_VFXPRESET_METADATA_NOT_PHASE_SOURCE",
      "VFX_PLACEABLE_KIND_NOT_EFFECTVISUALEFFECT",
      "VFX_CURRENT_VFX_PRESET_RESOURCE_NODE_PREVIEW_ONLY"
    ]);
  });
});
