import {
  buildAuroraVfxPhaseSchedule,
  diagnoseCatalogVfxPreviewSourceBoundary,
  parseAuroraAoeTwoDa,
  parseAuroraDamageHitVisualTwoDa,
  parseAuroraItemPropertyVisualFxTwoDa,
  parseAuroraProgFxTwoDa,
  parseAuroraSpellsTwoDa,
  parseAuroraTwoDaTable,
  parseAuroraVisualEffectsTwoDa
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
      type: 4
    });
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
