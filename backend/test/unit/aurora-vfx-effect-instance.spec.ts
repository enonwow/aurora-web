import {
  buildAuroraVfxEffectInstanceFromCatalogPreview,
  buildAuroraVfxPhaseSchedule,
  parseAuroraVisualEffectsTwoDa,
  type AuroraVfxEffectInstance
} from "../../src/modules/vfx/domain/aurora-vfx-source.parser";

const VISUALEFFECTS_EFFECT_INSTANCE_HEADER = [
  "Label",
  "Type_FD",
  "Imp_Impact_Node",
  "ProgFX_Impact",
  "SoundImpact",
  "ProgFX_Duration",
  "SoundDuration",
  "ProgFX_Cessation",
  "SoundCessastion",
  "Ces_Impact_Node",
  "ShakeType",
  "ShakeDelay",
  "ShakeDuration"
] as const;

function visualEffectsRow(
  rowId: number,
  overrides: Partial<Record<(typeof VISUALEFFECTS_EFFECT_INSTANCE_HEADER)[number], string>>
): string {
  const cells = VISUALEFFECTS_EFFECT_INSTANCE_HEADER.map(
    (column) => overrides[column] ?? "****"
  );
  return `${rowId} ${cells.join(" ")}`;
}

function parseSingleVisualEffectRow(
  rowId: number,
  overrides: Partial<Record<(typeof VISUALEFFECTS_EFFECT_INSTANCE_HEADER)[number], string>>
) {
  return parseAuroraVisualEffectsTwoDa(
    [
      "2DA V2.0",
      "",
      VISUALEFFECTS_EFFECT_INSTANCE_HEADER.join(" "),
      visualEffectsRow(rowId, overrides)
    ].join("\n"),
    "effect-instance-fixture"
  ).rows[0];
}

describe("aurora-vfx effect instance contract", () => {
  it("schedules an EffectVisualEffect instant fixture only when instance context is present", () => {
    const sourceRow = parseSingleVisualEffectRow(22, {
      Label: "VFX_FNF_FIREBALL",
      Type_FD: "F",
      Imp_Impact_Node: "vfx_fireball",
      ProgFX_Impact: "11",
      SoundImpact: "sff_explfire"
    });
    const effectInstance: AuroraVfxEffectInstance = {
      constructorKind: "EffectVisualEffect",
      sourceRowId: 22,
      applicationMode: "location",
      durationType: "instant",
      missFlag: false,
      eeTransform: {
        scale: 1.25,
        translate: { x: 1, y: 2, z: 0 },
        rotate: { x: 0, y: 0, z: 90 }
      },
      targetRef: "location:module_start",
      creatorRef: "object:caster",
      getEffectObservations: [
        {
          accessor: "GetEffectInteger",
          index: 0,
          valueType: "integer",
          value: 22,
          profile: "ee-observation"
        }
      ]
    };

    const schedule = buildAuroraVfxPhaseSchedule(sourceRow, effectInstance);

    expect(schedule.status).toBe("ready");
    expect(schedule.effectInstance).toEqual(effectInstance);
    expect(schedule.context).toEqual(effectInstance);
    expect(schedule.lanes).toMatchObject({
      modelNodeRefs: {
        impact: {
          Imp_Impact_Node: "vfx_fireball"
        }
      },
      progFxRefs: {
        impact: "11"
      },
      soundRefs: {
        impact: "sff_explfire"
      },
      clientEvents: []
    });
    expect(schedule.phases).toEqual([
      expect.objectContaining({
        phase: "impact",
        progFxRowId: 11,
        soundRef: "sff_explfire"
      })
    ]);
    expect(schedule.diagnostics).toEqual([]);
  });

  it("preserves EffectVisualEffect temporary duration fixture fields", () => {
    const sourceRow = parseSingleVisualEffectRow(355, {
      Label: "VFX_DUR_CUTSCENE_INVISIBILITY",
      Type_FD: "D",
      ProgFX_Duration: "148",
      SoundDuration: "sff_loop"
    });
    const effectInstance: AuroraVfxEffectInstance = {
      constructorKind: "EffectVisualEffect",
      sourceRowId: 355,
      applicationMode: "object",
      durationType: "temporary",
      durationSeconds: 12.5,
      missFlag: false,
      targetRef: "object:target",
      creatorRef: "object:caster"
    };

    const schedule = buildAuroraVfxPhaseSchedule(sourceRow, effectInstance);

    expect(schedule.status).toBe("ready");
    expect(schedule.effectInstance).toMatchObject({
      durationType: "temporary",
      durationSeconds: 12.5,
      applicationMode: "object"
    });
    expect(schedule.lanes.progFxRefs).toEqual({
      duration: "148"
    });
    expect(schedule.lanes.soundRefs).toEqual({
      duration: "sff_loop"
    });
  });

  it("preserves EffectVisualEffect permanent fixture fields", () => {
    const sourceRow = parseSingleVisualEffectRow(356, {
      Label: "VFX_DUR_MIND_AFFECTING_FEAR",
      Type_FD: "D",
      ProgFX_Duration: "328"
    });
    const effectInstance: AuroraVfxEffectInstance = {
      constructorKind: "EffectVisualEffect",
      sourceRowId: 356,
      applicationMode: "object",
      durationType: "permanent",
      targetRef: "object:target",
      creatorRef: "object:caster"
    };

    const schedule = buildAuroraVfxPhaseSchedule(sourceRow, effectInstance);

    expect(schedule.status).toBe("ready");
    expect(schedule.effectInstance).toMatchObject({
      durationType: "permanent",
      creatorRef: "object:caster"
    });
    expect(schedule.effectInstance).not.toHaveProperty("durationSeconds");
    expect(schedule.lanes.progFxRefs).toEqual({
      duration: "328"
    });
  });

  it("schedules EffectBeam only with source, target, and body-node instance context", () => {
    const sourceRow = parseSingleVisualEffectRow(210, {
      Label: "VFX_BEAM_FIRE",
      Type_FD: "B",
      ProgFX_Duration: "601"
    });
    const effectInstance: AuroraVfxEffectInstance = {
      constructorKind: "EffectBeam",
      sourceRowId: 210,
      applicationMode: "object",
      durationType: "temporary",
      durationSeconds: 6,
      missFlag: true,
      effectorRef: "object:beam_source",
      targetRef: "object:beam_target",
      creatorRef: "object:caster",
      bodyNode: "BODY_NODE_CHEST",
      eeTransform: {
        scale: 1,
        translate: { x: 0, y: 0, z: 0 },
        rotate: { x: 0, y: 0, z: 0 }
      }
    };

    const schedule = buildAuroraVfxPhaseSchedule(sourceRow, effectInstance);

    expect(schedule.status).toBe("ready");
    expect(schedule.effectInstance).toMatchObject({
      constructorKind: "EffectBeam",
      effectorRef: "object:beam_source",
      targetRef: "object:beam_target",
      bodyNode: "BODY_NODE_CHEST",
      missFlag: true
    });
    expect(schedule.lanes.progFxRefs).toEqual({
      duration: "601"
    });
    expect(schedule.diagnostics).toEqual([]);
  });

  it("keeps a source row source_only when no effect instance is supplied", () => {
    const sourceRow = parseSingleVisualEffectRow(286, {
      Label: "VFX_FNF_SCREEN_SHAKE",
      Type_FD: "F",
      SoundImpact: "sff_screenshake",
      ShakeType: "2",
      ShakeDelay: "0",
      ShakeDuration: "3"
    });

    const schedule = buildAuroraVfxPhaseSchedule(sourceRow);

    expect(schedule.status).toBe("source_only");
    expect(schedule.effectInstance).toBeUndefined();
    expect(schedule.clientEvents).toEqual([]);
    expect(schedule.lanes.clientEvents).toEqual([]);
    expect(schedule.diagnostics.map((entry) => entry.code)).toEqual(
      expect.arrayContaining([
        "VFX_EFFECT_INSTANCE_CONTEXT_REQUIRED",
        "VFX_CLIENT_EVENT_EFFECT_INSTANCE_REQUIRED"
      ])
    );
  });

  it("keeps a mismatched instance source_only and emits an error diagnostic", () => {
    const sourceRow = parseSingleVisualEffectRow(22, {
      Label: "VFX_FNF_FIREBALL",
      Type_FD: "F",
      SoundImpact: "sff_explfire"
    });

    const schedule = buildAuroraVfxPhaseSchedule(sourceRow, {
      constructorKind: "EffectVisualEffect",
      sourceRowId: 23,
      applicationMode: "location",
      durationType: "instant",
      targetRef: "location:module_start"
    });

    expect(schedule.status).toBe("source_only");
    expect(schedule.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "VFX_EFFECT_INSTANCE_ROW_MISMATCH",
          severity: "error"
        })
      ])
    );
  });

  it("diagnoses incomplete EffectBeam context instead of marking the schedule ready", () => {
    const sourceRow = parseSingleVisualEffectRow(210, {
      Label: "VFX_BEAM_FIRE",
      Type_FD: "B",
      ProgFX_Duration: "601"
    });

    const schedule = buildAuroraVfxPhaseSchedule(sourceRow, {
      constructorKind: "EffectBeam",
      sourceRowId: 210,
      applicationMode: "object",
      durationType: "temporary",
      targetRef: "object:beam_target"
    });

    expect(schedule.status).toBe("source_only");
    expect(schedule.diagnostics.map((entry) => entry.code)).toEqual(
      expect.arrayContaining([
        "VFX_EFFECTBEAM_EFFECTOR_REQUIRED",
        "VFX_EFFECTBEAM_BODY_NODE_REQUIRED"
      ])
    );
  });

  it("does not build an effect instance from catalog/placeable VFX preview metadata", () => {
    const result = buildAuroraVfxEffectInstanceFromCatalogPreview({
      vfxPreset: "torch_smoke_soft",
      placeableSubtype: "vfx",
      rendererPreset: "vfx-emitter"
    });

    expect(result.effectInstance).toBeUndefined();
    expect(result.diagnostics.map((entry) => entry.code)).toEqual([
      "VFX_CATALOG_VFXPRESET_METADATA_NOT_PHASE_SOURCE",
      "VFX_PLACEABLE_KIND_NOT_EFFECTVISUALEFFECT",
      "VFX_CURRENT_VFX_PRESET_RESOURCE_NODE_PREVIEW_ONLY",
      "VFX_CATALOG_PREVIEW_NOT_EFFECT_INSTANCE"
    ]);
  });
});
