import { describe, expect, it } from "vitest";

import { createSceneMutationsFacade } from "../../../../../src/modules/scene/application/sceneMutationsFacade";
import type {
  AreaScene,
  SceneObject,
  SceneEncounterDifficultyCatalog,
  ScenePlaceableFactionCatalog,
} from "../../../../../src/modules/scene/contracts";

const sourceGeometry = polygon([[0, 0, 0], [4, 0, 0], [0, 2, 0]]);
const targetGeometry = polygon([[-1, 0, 0], [4, 0, 0], [0, 3, 0.5]]);

describe("sceneMutationsFacade polygon geometry", () => {
  it.each(["triggers", "encounters"] as const)(
    "replaces only the editable %s target through immutable source provenance",
    (kind) => {
      const object = polygonObject(kind);
      const scene = polygonScene(object);
      const next = createSceneMutationsFacade().setAreaObjectPolygonGeometryById(
        scene,
        object.id,
        targetGeometry,
      );
      const updated = next.objects[0]!;

      expect(next).not.toBe(scene);
      expect(updated.polygonGeometry).toEqual(targetGeometry);
      expect(updated.polygonGeometry).not.toBe(targetGeometry);
      expect(updated.source?.polygonGeometry).toEqual(sourceGeometry);
      expect(updated.source?.polygonGeometry).toBe(object.source?.polygonGeometry);
    },
  );

  it("returns the same scene for an unchanged target", () => {
    const object = { ...polygonObject("triggers"), polygonGeometry: targetGeometry };
    const scene = polygonScene(object);
    expect(createSceneMutationsFacade().setAreaObjectPolygonGeometryById(
      scene,
      object.id,
      targetGeometry,
    )).toBe(scene);
  });

  it("commits exact Trigger Tag and geometry atomically while preserving provenance", () => {
    const object = polygonObject("triggers");
    const scene = polygonScene(object);
    const next = createSceneMutationsFacade().setAreaObjectPolygonGeometryById(
      scene,
      object.id,
      targetGeometry,
      "  AREA_EXIT  ",
    );

    expect(next.objects[0]).toMatchObject({
      tag: "  AREA_EXIT  ",
      polygonGeometry: targetGeometry,
      source: {
        triggerTag: { present: true, value: "TRIGGER" },
        polygonGeometry: sourceGeometry,
      },
    });
    expect(scene.objects[0]).toBe(object);
  });

  it("changes only exact retained Trigger Tag when geometry is unchanged", () => {
    const object = polygonObject("triggers");
    const scene = polygonScene(object);
    const next = createSceneMutationsFacade().setAreaObjectPolygonGeometryById(
      scene,
      object.id,
      sourceGeometry,
      "AREA_EXIT",
    );

    expect(next).not.toBe(scene);
    expect(next.objects[0]?.tag).toBe("AREA_EXIT");
    expect(next.objects[0]?.polygonGeometry).toEqual(sourceGeometry);
  });

  it("commits Encounter Tag, Active, PlayerOnly, Reset, ResetTime, SpawnOption, Respawns, creature counts and geometry atomically", () => {
    const object = polygonObject("encounters");
    const scene = polygonScene(object);
    const next = createSceneMutationsFacade().setAreaObjectPolygonGeometryById(
      scene,
      object.id,
      targetGeometry,
      "  GNOLL_AMBUSH  ",
      { activeByte: 0 },
      { playerOnlyByte: 0 },
      { resetByte: 0 },
      { resetTime: 90 },
      { spawnOption: 0 },
      { respawns: -1 },
      { maxCreatures: 6, recCreatures: 5 },
    );

    expect(next.objects[0]).toMatchObject({
      tag: "  GNOLL_AMBUSH  ",
      encounterActive: { activeByte: 0 },
      encounterPlayerOnly: { playerOnlyByte: 0 },
      encounterReset: { resetByte: 0 },
      encounterResetTime: { resetTime: 90 },
      encounterSpawnOption: { spawnOption: 0 },
      encounterRespawns: { respawns: -1 },
      encounterCreatureCounts: { maxCreatures: 6, recCreatures: 5 },
      polygonGeometry: targetGeometry,
      source: {
        encounterTag: { present: true, value: "ENCOUNTER" },
        encounterActiveStorage: { activeByte: 1 },
        encounterPlayerOnlyStorage: { playerOnlyByte: 1 },
        encounterResetStorage: { resetByte: 1 },
        encounterResetTimeStorage: { resetTime: 60 },
        encounterSpawnOptionStorage: { spawnOption: 0 },
        encounterRespawnsStorage: { respawns: 4 },
        encounterCreatureCountsStorage: { maxCreatures: 4, recCreatures: 2 },
        polygonGeometry: sourceGeometry,
      },
    });
    expect(scene.objects[0]).toBe(object);
  });

  it("changes only exact retained Encounter PlayerOnly when geometry is unchanged", () => {
    const object = polygonObject("encounters");
    const scene = polygonScene(object);
    const next = createSceneMutationsFacade().setAreaObjectPolygonGeometryById(
      scene,
      object.id,
      sourceGeometry,
      object.tag,
      object.encounterActive,
      { playerOnlyByte: 0 },
    );

    expect(next).not.toBe(scene);
    expect(next.objects[0]?.encounterPlayerOnly).toEqual({ playerOnlyByte: 0 });
    expect(next.objects[0]?.source?.encounterPlayerOnlyStorage)
      .toEqual({ playerOnlyByte: 1 });
  });

  it("changes only exact retained Encounter Reset when geometry is unchanged", () => {
    const object = polygonObject("encounters");
    const scene = polygonScene(object);
    const next = createSceneMutationsFacade().setAreaObjectPolygonGeometryById(
      scene,
      object.id,
      sourceGeometry,
      object.tag,
      object.encounterActive,
      object.encounterPlayerOnly,
      { resetByte: 0 },
    );

    expect(next).not.toBe(scene);
    expect(next.objects[0]?.encounterReset).toEqual({ resetByte: 0 });
    expect(next.objects[0]?.source?.encounterResetStorage).toEqual({ resetByte: 1 });
  });

  it("changes only exact retained Encounter ResetTime when geometry is unchanged", () => {
    const object = polygonObject("encounters");
    const scene = polygonScene(object);
    const next = createSceneMutationsFacade().setAreaObjectPolygonGeometryById(
      scene,
      object.id,
      sourceGeometry,
      object.tag,
      object.encounterActive,
      object.encounterPlayerOnly,
      object.encounterReset,
      { resetTime: 90 },
    );

    expect(next).not.toBe(scene);
    expect(next.objects[0]?.encounterResetTime).toEqual({ resetTime: 90 });
    expect(next.objects[0]?.source?.encounterResetTimeStorage)
      .toEqual({ resetTime: 60 });
  });

  it("changes only exact retained Encounter SpawnOption when geometry is unchanged", () => {
    const object = polygonObject("encounters");
    const scene = polygonScene(object);
    const next = createSceneMutationsFacade().setAreaObjectPolygonGeometryById(
      scene,
      object.id,
      sourceGeometry,
      object.tag,
      object.encounterActive,
      object.encounterPlayerOnly,
      object.encounterReset,
      object.encounterResetTime,
      { spawnOption: 1 },
    );

    expect(next).not.toBe(scene);
    expect(next.objects[0]?.encounterSpawnOption).toEqual({ spawnOption: 1 });
    expect(next.objects[0]?.source?.encounterSpawnOptionStorage)
      .toEqual({ spawnOption: 0 });
    expect(next.objects[0]?.encounterReset).toEqual({ resetByte: 1 });
    expect(next.objects[0]?.encounterResetTime).toEqual({ resetTime: 60 });
  });

  it("changes only exact retained Encounter Respawns when geometry is unchanged", () => {
    const object = polygonObject("encounters");
    const scene = polygonScene(object);
    const next = createSceneMutationsFacade().setAreaObjectPolygonGeometryById(
      scene,
      object.id,
      sourceGeometry,
      object.tag,
      object.encounterActive,
      object.encounterPlayerOnly,
      object.encounterReset,
      object.encounterResetTime,
      object.encounterSpawnOption,
      { respawns: -1 },
    );

    expect(next).not.toBe(scene);
    expect(next.objects[0]?.encounterRespawns).toEqual({ respawns: -1 });
    expect(next.objects[0]?.source?.encounterRespawnsStorage)
      .toEqual({ respawns: 4 });
  });

  it("changes only exact retained Encounter creature counts when geometry is unchanged", () => {
    const object = polygonObject("encounters");
    const scene = polygonScene(object);
    const facade = createSceneMutationsFacade();
    const next = facade.setAreaObjectPolygonGeometryById(
      scene,
      object.id,
      sourceGeometry,
      object.tag,
      object.encounterActive,
      object.encounterPlayerOnly,
      object.encounterReset,
      object.encounterResetTime,
      object.encounterSpawnOption,
      object.encounterRespawns,
      { maxCreatures: 7, recCreatures: 3 },
    );

    expect(next).not.toBe(scene);
    expect(next.objects[0]?.encounterCreatureCounts)
      .toEqual({ maxCreatures: 7, recCreatures: 3 });
    expect(next.objects[0]?.source?.encounterCreatureCountsStorage)
      .toEqual({ maxCreatures: 4, recCreatures: 2 });
    expect(facade.setAreaObjectPolygonGeometryById(
      scene,
      object.id,
      sourceGeometry,
      object.tag,
      object.encounterActive,
      object.encounterPlayerOnly,
      object.encounterReset,
      object.encounterResetTime,
      object.encounterSpawnOption,
      object.encounterRespawns,
      { maxCreatures: 2, recCreatures: 3 },
    )).toBe(scene);
  });

  it("changes only the complete exact retained Encounter event-script tuple", () => {
    const object = polygonObject("encounters");
    const scene = polygonScene(object);
    const target = {
      onEntered: "new_enter",
      onExit: "new_exit",
      onExhausted: "",
      onHeartbeat: "new_heartbeat",
      onUserDefined: "new_user",
    };
    const facade = createSceneMutationsFacade();
    const next = facade.setAreaObjectPolygonGeometryById(
      scene,
      object.id,
      sourceGeometry,
      object.tag,
      object.encounterActive,
      object.encounterPlayerOnly,
      object.encounterReset,
      object.encounterResetTime,
      object.encounterSpawnOption,
      object.encounterRespawns,
      object.encounterCreatureCounts,
      target,
    );
    expect(next.objects[0]?.encounterScriptResRefs).toEqual(target);
    expect(next.objects[0]?.source?.encounterScriptResRefsStorage)
      .toEqual(object.source?.encounterScriptResRefsStorage);
    expect(facade.setAreaObjectPolygonGeometryById(
      scene,
      object.id,
      sourceGeometry,
      object.tag,
      object.encounterActive,
      object.encounterPlayerOnly,
      object.encounterReset,
      object.encounterResetTime,
      object.encounterSpawnOption,
      object.encounterRespawns,
      object.encounterCreatureCounts,
      { ...target, onEntered: "Bad-Script" },
    )).toBe(scene);
  });

  it("changes only an exact catalog-bound Encounter Faction target", () => {
    const object = polygonObject("encounters");
    const scene = polygonScene(object);
    const facade = createSceneMutationsFacade();
    const next = facade.setAreaObjectPolygonGeometryById(
      scene,
      object.id,
      sourceGeometry,
      object.tag,
      object.encounterActive,
      object.encounterPlayerOnly,
      object.encounterReset,
      object.encounterResetTime,
      object.encounterSpawnOption,
      object.encounterRespawns,
      object.encounterCreatureCounts,
      object.encounterScriptResRefs,
      4,
    );

    expect(next).not.toBe(scene);
    expect(next.objects[0]?.encounterFactionId).toBe(4);
    expect(next.objects[0]?.source?.encounterFaction).toEqual({
      expectedValue: 1,
      catalogSha256: "f".repeat(64),
      catalogFactionCount: 5,
    });
    expect(facade.setAreaObjectPolygonGeometryById(
      scene,
      object.id,
      sourceGeometry,
      object.tag,
      object.encounterActive,
      object.encounterPlayerOnly,
      object.encounterReset,
      object.encounterResetTime,
      object.encounterSpawnOption,
      object.encounterRespawns,
      object.encounterCreatureCounts,
      object.encounterScriptResRefs,
      0,
    )).toBe(scene);
    expect(facade.setAreaObjectPolygonGeometryById(
      {
        ...scene,
        placeableFactionCatalog: {
          ...encounterFactionCatalog(),
          descriptor: {
            ...encounterFactionCatalog().descriptor,
            sha256: "e".repeat(64),
          },
        },
      },
      object.id,
      sourceGeometry,
      object.tag,
      object.encounterActive,
      object.encounterPlayerOnly,
      object.encounterReset,
      object.encounterResetTime,
      object.encounterSpawnOption,
      object.encounterRespawns,
      object.encounterCreatureCounts,
      object.encounterScriptResRefs,
      4,
    )).toEqual({
      ...scene,
      placeableFactionCatalog: {
        ...encounterFactionCatalog(),
        descriptor: {
          ...encounterFactionCatalog().descriptor,
          sha256: "e".repeat(64),
        },
      },
    });
  });

  it("changes only one exact catalog-bound Encounter Difficulty pair", () => {
    const object = polygonObject("encounters");
    const scene = polygonScene(object);
    const facade = createSceneMutationsFacade();
    const target = { difficulty: 3, difficultyIndex: 4 };
    const next = facade.setAreaObjectPolygonGeometryById(
      scene,
      object.id,
      sourceGeometry,
      object.tag,
      object.encounterActive,
      object.encounterPlayerOnly,
      object.encounterReset,
      object.encounterResetTime,
      object.encounterSpawnOption,
      object.encounterRespawns,
      object.encounterCreatureCounts,
      object.encounterScriptResRefs,
      object.encounterFactionId,
      target,
    );

    expect(next).not.toBe(scene);
    expect(next.objects[0]?.encounterDifficulty).toEqual(target);
    expect(next.objects[0]?.encounterDifficulty).not.toBe(target);
    expect(next.objects[0]?.source?.encounterDifficulty).toEqual({
      expectedValue: { difficulty: 1, difficultyIndex: 2 },
      catalogSha256: "d".repeat(64),
      catalogRowCount: 5,
    });
    expect(facade.setAreaObjectPolygonGeometryById(
      scene,
      object.id,
      sourceGeometry,
      object.tag,
      object.encounterActive,
      object.encounterPlayerOnly,
      object.encounterReset,
      object.encounterResetTime,
      object.encounterSpawnOption,
      object.encounterRespawns,
      object.encounterCreatureCounts,
      object.encounterScriptResRefs,
      object.encounterFactionId,
      { difficulty: 2, difficultyIndex: 4 },
    )).toBe(scene);
  });

  it("changes only one exact retained inline Encounter LocalizedName", () => {
    const object = polygonObject("encounters");
    const scene = polygonScene(object);
    const next = createSceneMutationsFacade().setAreaObjectPolygonGeometryById(
      scene,
      object.id,
      sourceGeometry,
      object.tag,
      object.encounterActive,
      object.encounterPlayerOnly,
      object.encounterReset,
      object.encounterResetTime,
      object.encounterSpawnOption,
      object.encounterRespawns,
      object.encounterCreatureCounts,
      object.encounterScriptResRefs,
      object.encounterFactionId,
      object.encounterDifficulty,
      "Night Ambush",
    );

    expect(next).not.toBe(scene);
    expect(next.objects[0]?.encounterLocalizedName).toBe("Night Ambush");
    expect(next.objects[0]?.source?.encounterLocalizedNameStorage).toEqual(
      object.source?.encounterLocalizedNameStorage,
    );

    const tlkBacked = {
      ...object,
      encounterLocalizedName: undefined,
      source: {
        ...object.source!,
        encounterLocalizedNameStorage: {
          present: true as const,
          strRef: 91345,
          entries: [],
        },
      },
    };
    expect(createSceneMutationsFacade().setAreaObjectPolygonGeometryById(
      polygonScene(tlkBacked),
      tlkBacked.id,
      sourceGeometry,
      tlkBacked.tag,
      tlkBacked.encounterActive,
      tlkBacked.encounterPlayerOnly,
      tlkBacked.encounterReset,
      tlkBacked.encounterResetTime,
      tlkBacked.encounterSpawnOption,
      tlkBacked.encounterRespawns,
      tlkBacked.encounterCreatureCounts,
      tlkBacked.encounterScriptResRefs,
      tlkBacked.encounterFactionId,
      tlkBacked.encounterDifficulty,
      "Invented",
    )).toEqual(polygonScene(tlkBacked));
  });

  it("changes only one exact retained Encounter TemplateResRef and preserves renderer identity", () => {
    const object = polygonObject("encounters");
    const scene = polygonScene(object);
    const facade = createSceneMutationsFacade();
    const next = facade.setExistingEncounterTemplateResRefById(
      scene,
      object.id,
      "custom_encounter",
    );

    expect(next).not.toBe(scene);
    expect(next.objects[0]?.encounterTemplateResRef).toBe("custom_encounter");
    expect(next.objects[0]?.resRef).toBe("encounter");
    expect(next.objects[0]?.source?.encounterTemplateResRef).toEqual({
      present: true,
      nativeType: "resref",
      value: "x2_gnoll001",
    });
    expect(facade.setExistingEncounterTemplateResRefById(
      scene,
      object.id,
      "CUSTOM_ENCOUNTER",
    )).toBe(scene);
    expect(facade.setExistingEncounterTemplateResRefById(
      polygonScene({
        ...object,
        source: { ...object.source!, encounterTemplateResRef: { present: false } },
      }),
      object.id,
      "custom_encounter",
    ).objects[0]?.encounterTemplateResRef).toBe("x2_gnoll001");
  });

  it("changes only one exact retained Trigger TemplateResRef and preserves renderer identity", () => {
    const object = polygonObject("triggers");
    const scene = polygonScene(object);
    const facade = createSceneMutationsFacade();
    const next = facade.setExistingTriggerTemplateResRefById(
      scene,
      object.id,
      "custom_trigger",
    );

    expect(next).not.toBe(scene);
    expect(next.objects[0]?.triggerTemplateResRef).toBe("custom_trigger");
    expect(next.objects[0]?.resRef).toBe("trigger");
    expect(next.objects[0]?.source?.triggerTemplateResRef).toEqual({
      present: true,
      nativeType: "resref",
      value: "newgeneric",
    });
    expect(facade.setExistingTriggerTemplateResRefById(
      scene,
      object.id,
      "CUSTOM_TRIGGER",
    )).toBe(scene);
    expect(facade.setExistingTriggerTemplateResRefById(
      polygonScene({
        ...object,
        source: { ...object.source!, triggerTemplateResRef: { present: false } },
      }),
      object.id,
      "custom_trigger",
    ).objects[0]?.triggerTemplateResRef).toBe("newgeneric");
  });

  it("changes only one exact retained Trigger LocalizedName and preserves renderer identity", () => {
    const object = polygonObject("triggers");
    const scene = polygonScene(object);
    const facade = createSceneMutationsFacade();
    const next = facade.setExistingTriggerLocalizedNameById(
      scene,
      object.id,
      " Inner Gate Trigger ",
    );

    expect(next).not.toBe(scene);
    expect(next.objects[0]?.triggerLocalizedName).toBe(" Inner Gate Trigger ");
    expect(next.objects[0]?.resRef).toBe("trigger");
    expect(next.objects[0]?.source?.triggerLocalizedNameStorage).toEqual({
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "R2F0ZSBUcmlnZ2Vy" }],
    });
    expect(facade.setExistingTriggerLocalizedNameById(
      scene,
      object.id,
      "Łowcy",
    )).toBe(scene);
    expect(facade.setExistingTriggerLocalizedNameById(
      polygonScene({
        ...object,
        source: {
          ...object.source!,
          triggerLocalizedNameStorage: { present: true, strRef: 14759, entries: [] },
        },
      }),
      object.id,
      "Inner Gate Trigger",
    ).objects[0]?.triggerLocalizedName).toBe("Gate Trigger");
  });

  it("changes only one exact retained paired-GIC Trigger Comment", () => {
    const object = polygonObject("triggers");
    const scene = polygonScene(object);
    const facade = createSceneMutationsFacade();
    const next = facade.setExistingTriggerEditorCommentById(
      scene,
      object.id,
      "  updated gate note  ",
    );

    expect(next).not.toBe(scene);
    expect(next.objects[0]?.triggerEditorComment).toBe("  updated gate note  ");
    expect(next.objects[0]?.source?.triggerEditorComment).toBe(" source gate note ");
    expect(next.objects[0]?.resRef).toBe("trigger");
    expect(facade.setExistingTriggerEditorCommentById(
      scene,
      object.id,
      "bad\0note",
    )).toBe(scene);
    const missingProvenanceScene = polygonScene({
      ...object,
      source: { ...object.source!, triggerEditorComment: undefined },
    });
    expect(facade.setExistingTriggerEditorCommentById(
      missingProvenanceScene,
      object.id,
      "updated",
    )).toBe(missingProvenanceScene);
  });

  it("changes only the complete retained Trigger event-script tuple", () => {
    const object = polygonObject("triggers");
    const scene = polygonScene(object);
    const target = {
      onDisarm: "new_disarm",
      onTrapTriggered: "new_trap",
      onClick: "new_click",
      onHeartbeat: "new_heartbeat",
      onEnter: "new_enter",
      onExit: "new_exit",
      onUserDefined: "new_user",
    };
    const facade = createSceneMutationsFacade();
    const next = facade.setExistingTriggerScriptResRefsById(
      scene,
      object.id,
      target,
    );

    expect(next).not.toBe(scene);
    expect(next.objects[0]?.triggerScriptResRefs).toEqual(target);
    expect(next.objects[0]?.triggerScriptResRefs).not.toBe(target);
    expect(next.objects[0]?.source?.triggerScriptResRefsStorage).toEqual({
      onDisarm: "On_Disarm",
      onTrapTriggered: "trg_trap",
      onClick: "",
      onHeartbeat: "trg_heartbeat",
      onEnter: "trg_enter",
      onExit: "trg_exit",
      onUserDefined: "trg_user",
    });
    expect(facade.setExistingTriggerScriptResRefsById(
      scene,
      object.id,
      { ...target, onClick: "UpperCase" },
    )).toBe(scene);
    const missingProvenanceScene = polygonScene({
      ...object,
      source: { ...object.source!, triggerScriptResRefsStorage: undefined },
    });
    expect(facade.setExistingTriggerScriptResRefsById(
      missingProvenanceScene,
      object.id,
      target,
    )).toBe(missingProvenanceScene);
  });

  it("changes only the exact retained Trigger transition-storage tuple", () => {
    const object = polygonObject("triggers");
    const scene = polygonScene(object);
    const target = {
      linkedTo: "crypt_exit",
      linkedToFlags: 4,
      loadScreenId: 321,
    };
    const facade = createSceneMutationsFacade();
    const next = facade.setExistingTriggerTransitionStorageById(
      scene,
      object.id,
      target,
    );

    expect(next).not.toBe(scene);
    expect(next.objects[0]?.triggerTransitionStorage).toEqual(target);
    expect(next.objects[0]?.triggerTransitionStorage).not.toBe(target);
    expect(next.objects[0]?.source?.triggerTransitionStorage).toEqual({
      linkedTo: "east_gate",
      linkedToFlags: 2,
      loadScreenId: 7,
    });
    expect(facade.setExistingTriggerTransitionStorageById(
      scene,
      object.id,
      { ...target, linkedToFlags: 256 },
    )).toBe(scene);
    const missingProvenanceScene = polygonScene({
      ...object,
      source: { ...object.source!, triggerTransitionStorage: undefined },
    });
    expect(facade.setExistingTriggerTransitionStorageById(
      missingProvenanceScene,
      object.id,
      target,
    )).toBe(missingProvenanceScene);
  });

  it("changes only one exact retained paired-GIC Encounter Comment", () => {
    const object = polygonObject("encounters");
    const scene = polygonScene(object);
    const next = createSceneMutationsFacade().setAreaObjectPolygonGeometryById(
      scene,
      object.id,
      sourceGeometry,
      object.tag,
      object.encounterActive,
      object.encounterPlayerOnly,
      object.encounterReset,
      object.encounterResetTime,
      object.encounterSpawnOption,
      object.encounterRespawns,
      object.encounterCreatureCounts,
      object.encounterScriptResRefs,
      object.encounterFactionId,
      object.encounterDifficulty,
      undefined,
      "  updated note  ",
    );

    expect(next).not.toBe(scene);
    expect(next.objects[0]?.encounterProperties?.comments).toBe("  updated note  ");
    expect(next.objects[0]?.source?.encounterEditorComment).toBe(" source note ");
    expect(createSceneMutationsFacade().setAreaObjectPolygonGeometryById(
      scene,
      object.id,
      sourceGeometry,
      object.tag,
      object.encounterActive,
      object.encounterPlayerOnly,
      object.encounterReset,
      object.encounterResetTime,
      object.encounterSpawnOption,
      object.encounterRespawns,
      object.encounterCreatureCounts,
      object.encounterScriptResRefs,
      object.encounterFactionId,
      object.encounterDifficulty,
      undefined,
      "bad\0note",
    )).toBe(scene);
  });

  it("changes only the exact retained ordered Encounter VarTable target", () => {
    const object = polygonObject("encounters");
    const scene = polygonScene(object);
    const target = [
      { name: "note", type: "string" as const, value: " target " },
      { name: "counter", type: "int" as const, value: 1 },
    ];
    const next = createSceneMutationsFacade().setAreaObjectPolygonGeometryById(
      scene,
      object.id,
      sourceGeometry,
      object.tag,
      object.encounterActive,
      object.encounterPlayerOnly,
      object.encounterReset,
      object.encounterResetTime,
      object.encounterSpawnOption,
      object.encounterRespawns,
      object.encounterCreatureCounts,
      object.encounterScriptResRefs,
      object.encounterFactionId,
      object.encounterDifficulty,
      object.encounterLocalizedName,
      undefined,
      target,
    );

    expect(next).not.toBe(scene);
    expect(next.objects[0]?.encounterProperties?.variables).toEqual(target);
    expect(next.objects[0]?.source?.encounterVariables).toEqual(
      object.source?.encounterVariables,
    );
    expect(object.encounterProperties?.variables).toEqual([
      { name: "counter", type: "int", value: 1 },
      { name: "note", type: "string", value: " source " },
    ]);
  });

  it("changes only retained Encounter CreatureList SingleSpawn flags", () => {
    const object = polygonObject("encounters");
    const scene = polygonScene(object);
    const target = [
      {
        appearance: 388,
        challengeRating: 1,
        resRef: "nw_gnoll001",
        singleSpawn: true,
      },
      {
        appearance: 389,
        challengeRating: 3,
        resRef: "nw_gnoll002",
        singleSpawn: true,
      },
    ];
    const next = createSceneMutationsFacade().setAreaObjectPolygonGeometryById(
      scene,
      object.id,
      sourceGeometry,
      object.tag,
      object.encounterActive,
      object.encounterPlayerOnly,
      object.encounterReset,
      object.encounterResetTime,
      object.encounterSpawnOption,
      object.encounterRespawns,
      object.encounterCreatureCounts,
      object.encounterScriptResRefs,
      object.encounterFactionId,
      object.encounterDifficulty,
      object.encounterLocalizedName,
      undefined,
      undefined,
      target,
    );

    expect(next).not.toBe(scene);
    expect(next.objects[0]?.encounterProperties?.creatureList).toEqual(target);
    expect(next.objects[0]?.source?.encounterCreatureList).toEqual(
      object.source?.encounterCreatureList,
    );
    expect(object.encounterProperties?.creatureList?.[0]?.singleSpawn).toBe(false);
  });

  it("replaces the complete retained Encounter SpawnPointList structurally", () => {
    const object = polygonObject("encounters");
    const scene = polygonScene(object);
    const target = [
      { nativeX: -3.75, nativeY: 9.5, nativeZ: 0.125, orientation: -2.25 },
      { nativeX: 7.5, nativeY: -8.25, nativeZ: 0.5, orientation: 1.25 },
    ];
    const next = createSceneMutationsFacade().setAreaObjectPolygonGeometryById(
      scene,
      object.id,
      sourceGeometry,
      object.tag,
      object.encounterActive,
      object.encounterPlayerOnly,
      object.encounterReset,
      object.encounterResetTime,
      object.encounterSpawnOption,
      object.encounterRespawns,
      object.encounterCreatureCounts,
      object.encounterScriptResRefs,
      object.encounterFactionId,
      object.encounterDifficulty,
      object.encounterLocalizedName,
      undefined,
      undefined,
      undefined,
      target,
    );

    expect(next).not.toBe(scene);
    expect(next.objects[0]?.encounterProperties?.spawnPoints).toEqual(target);
    expect(next.objects[0]?.source?.encounterSpawnPoints).toEqual(
      object.source?.encounterSpawnPoints,
    );
    expect(object.encounterProperties?.spawnPoints?.[0]?.nativeX).toBe(22.5);
  });

  it("rejects Reset-family edits for Single Shot or missing SpawnOption provenance", () => {
    const object = polygonObject("encounters");
    const facade = createSceneMutationsFacade();
    const singleShot = {
      ...object,
      encounterSpawnOption: { spawnOption: 1 as const },
      source: {
        ...object.source!,
        encounterSpawnOptionStorage: { spawnOption: 1 as const },
      },
    };
    const withoutProvenance = {
      ...object,
      source: { ...object.source!, encounterSpawnOptionStorage: undefined },
    };

    expect(facade.setAreaObjectPolygonGeometryById(
      polygonScene(singleShot),
      singleShot.id,
      sourceGeometry,
      singleShot.tag,
      singleShot.encounterActive,
      singleShot.encounterPlayerOnly,
      { resetByte: 0 },
    )).toEqual(polygonScene(singleShot));
    expect(facade.setAreaObjectPolygonGeometryById(
      polygonScene(withoutProvenance),
      withoutProvenance.id,
      sourceGeometry,
      withoutProvenance.tag,
      withoutProvenance.encounterActive,
      withoutProvenance.encounterPlayerOnly,
      { resetByte: 0 },
    )).toEqual(polygonScene(withoutProvenance));
  });

  it("changes only exact retained Encounter Active when geometry is unchanged", () => {
    const object = polygonObject("encounters");
    const scene = polygonScene(object);
    const next = createSceneMutationsFacade().setAreaObjectPolygonGeometryById(
      scene,
      object.id,
      sourceGeometry,
      object.tag,
      { activeByte: 0 },
    );

    expect(next).not.toBe(scene);
    expect(next.objects[0]?.encounterActive).toEqual({ activeByte: 0 });
    expect(next.objects[0]?.source?.encounterActiveStorage).toEqual({ activeByte: 1 });
  });

  it("rejects an Encounter Active mutation outside exact Encounter provenance", () => {
    const trigger = polygonObject("triggers");
    const triggerScene = polygonScene(trigger);
    expect(createSceneMutationsFacade().setAreaObjectPolygonGeometryById(
      triggerScene,
      trigger.id,
      targetGeometry,
      trigger.tag,
      { activeByte: 0 },
    )).toBe(triggerScene);

    const encounter = polygonObject("encounters");
    const malformed = { ...encounter, encounterActive: undefined };
    const malformedScene = polygonScene(malformed);
    expect(createSceneMutationsFacade().setAreaObjectPolygonGeometryById(
      malformedScene,
      malformed.id,
      targetGeometry,
      malformed.tag,
      { activeByte: 0 },
    )).toBe(malformedScene);
  });

  it.each([
    ["missing object", "missing", targetGeometry],
    ["unsupported family", "placeable", targetGeometry],
    ["malformed target", "trigger", { coordinateSpace: "native_local", points: [] }],
    ["target without source geometry", "missing-source", targetGeometry],
  ])("fails closed for %s", (_label, fixture, geometry) => {
    const object = fixture === "placeable"
      ? { ...polygonObject("triggers"), kind: "placeables" as const }
      : fixture === "missing-source"
        ? { ...polygonObject("triggers"), source: { type: "aurora_git" as const, sourceKind: "trigger" as const, sourceIndex: 0 } }
        : polygonObject("triggers");
    const scene = polygonScene(object);
    const objectId = fixture === "missing" ? "missing-object" : object.id;
    expect(createSceneMutationsFacade().setAreaObjectPolygonGeometryById(
      scene,
      objectId,
      geometry as never,
    )).toBe(scene);
  });
});

function polygonObject(kind: "triggers" | "encounters"): SceneObject {
  const sourceKind = kind === "triggers" ? "trigger" : "encounter";
  return {
    id: `${sourceKind}-0`,
    kind,
    resRef: sourceKind,
    tag: sourceKind.toUpperCase(),
    x: 1,
    y: 2,
    z: 0,
    bearing: 0,
    visualTransform: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      yaw: 0,
      roll: 0,
    },
    source: {
      type: "aurora_git",
      sourceKind,
      sourceIndex: 0,
      sourceObjectId: `${sourceKind}:0`,
      ...(kind === "triggers"
        ? {
          triggerTag: { present: true as const, value: "TRIGGER" },
          triggerTemplateResRef: {
            present: true as const,
            nativeType: "resref" as const,
            value: "newgeneric",
          },
          triggerLocalizedNameStorage: {
            present: true as const,
            strRef: 0xffff_ffff,
            entries: [{ languageId: 0, textBytesBase64: "R2F0ZSBUcmlnZ2Vy" }],
          },
          triggerEditorComment: " source gate note ",
          triggerScriptResRefsStorage: {
            onDisarm: "On_Disarm",
            onTrapTriggered: "trg_trap",
            onClick: "",
            onHeartbeat: "trg_heartbeat",
            onEnter: "trg_enter",
            onExit: "trg_exit",
            onUserDefined: "trg_user",
          },
          triggerTransitionStorage: {
            linkedTo: "east_gate",
            linkedToFlags: 2,
            loadScreenId: 7,
          },
        }
        : {
          encounterTag: { present: true as const, value: "ENCOUNTER" },
          encounterTemplateResRef: {
            present: true as const,
            nativeType: "resref" as const,
            value: "x2_gnoll001",
          },
          encounterActiveStorage: { activeByte: 1 as const },
          encounterPlayerOnlyStorage: { playerOnlyByte: 1 as const },
          encounterResetStorage: { resetByte: 1 as const },
          encounterResetTimeStorage: { resetTime: 60 },
          encounterSpawnOptionStorage: { spawnOption: 0 as const },
          encounterRespawnsStorage: { respawns: 4 },
          encounterCreatureCountsStorage: { maxCreatures: 4, recCreatures: 2 },
          encounterScriptResRefsStorage: {
            onEntered: "enc_enter",
            onExit: "enc_exit",
            onExhausted: "",
            onHeartbeat: "enc_heartbeat",
            onUserDefined: "enc_user",
          },
          encounterFaction: {
            expectedValue: 1,
            catalogSha256: "f".repeat(64),
            catalogFactionCount: 5,
          },
          encounterDifficulty: {
            expectedValue: { difficulty: 1, difficultyIndex: 2 },
            catalogSha256: "d".repeat(64),
            catalogRowCount: 5,
          },
          encounterLocalizedNameStorage: {
            present: true as const,
            strRef: 0xffff_ffff,
            entries: [{ languageId: 0, textBytesBase64: "R25vbGwgQW1idXNo" }],
          },
          encounterEditorComment: " source note ",
          encounterVariables: { expectedEntries: [
            { sourceIndex: 0, name: "counter", type: "int", value: 1 },
            { sourceIndex: 1, name: "note", type: "string", value: " source " },
          ] },
          encounterCreatureList: { expectedEntries: [
            {
              sourceIndex: 0,
              appearance: 388,
              challengeRating: 1,
              resRef: "nw_gnoll001",
              singleSpawnByte: 0 as const,
            },
            {
              sourceIndex: 1,
              appearance: 389,
              challengeRating: 3,
              resRef: "nw_gnoll002",
              singleSpawnByte: 1 as const,
            },
          ] },
          encounterSpawnPoints: { expectedEntries: [
            {
              sourceIndex: 0,
              nativeX: 22.5,
              nativeY: 45.25,
              nativeZ: 0,
              orientation: 1.5,
            },
            {
              sourceIndex: 1,
              nativeX: -3.75,
              nativeY: 9.5,
              nativeZ: 0.125,
              orientation: -2.25,
            },
          ] },
        }),
      polygonGeometry: sourceGeometry,
    },
    polygonGeometry: sourceGeometry,
    ...(kind === "triggers"
      ? {
          triggerTemplateResRef: "newgeneric",
          triggerLocalizedName: "Gate Trigger",
          triggerEditorComment: " source gate note ",
          triggerScriptResRefs: {
            onDisarm: "On_Disarm",
            onTrapTriggered: "trg_trap",
            onClick: "",
            onHeartbeat: "trg_heartbeat",
            onEnter: "trg_enter",
            onExit: "trg_exit",
            onUserDefined: "trg_user",
          },
          triggerTransitionStorage: {
            linkedTo: "east_gate",
            linkedToFlags: 2,
            loadScreenId: 7,
          },
        }
      : {}),
    ...(kind === "encounters"
      ? {
          encounterActive: { activeByte: 1 as const },
          encounterPlayerOnly: { playerOnlyByte: 1 as const },
          encounterReset: { resetByte: 1 as const },
          encounterResetTime: { resetTime: 60 },
          encounterSpawnOption: { spawnOption: 0 as const },
          encounterRespawns: { respawns: 4 },
          encounterCreatureCounts: { maxCreatures: 4, recCreatures: 2 },
          encounterScriptResRefs: {
            onEntered: "enc_enter",
            onExit: "enc_exit",
            onExhausted: "",
            onHeartbeat: "enc_heartbeat",
            onUserDefined: "enc_user",
          },
          encounterFactionId: 1,
          encounterDifficulty: { difficulty: 1, difficultyIndex: 2 },
          encounterLocalizedName: "Gnoll Ambush",
          encounterTemplateResRef: "x2_gnoll001",
          encounterProperties: {
            comments: " source note ",
            variables: [
              { name: "counter", type: "int", value: 1 },
              { name: "note", type: "string", value: " source " },
            ],
            creatureList: [
              {
                appearance: 388,
                challengeRating: 1,
                resRef: "nw_gnoll001",
                singleSpawn: false,
              },
              {
                appearance: 389,
                challengeRating: 3,
                resRef: "nw_gnoll002",
                singleSpawn: true,
              },
            ],
            spawnPoints: [
              { nativeX: 22.5, nativeY: 45.25, nativeZ: 0, orientation: 1.5 },
              { nativeX: -3.75, nativeY: 9.5, nativeZ: 0.125, orientation: -2.25 },
            ],
          },
        }
      : {}),
  };
}

function polygonScene(object: SceneObject): AreaScene {
  return {
    sceneId: "polygon-scene",
    areaName: "Polygon Scene",
    width: 4,
    height: 4,
    tiles: [],
    objects: [object],
    updatedAtUnixMs: 1,
    source: "aurora_area",
    placeableFactionCatalog: encounterFactionCatalog(),
    encounterDifficultyCatalog: encounterDifficultyCatalog(),
  };
}

function encounterFactionCatalog(): ScenePlaceableFactionCatalog {
  return {
    descriptor: {
      resourceName: "repute.fac",
      sourceObjectKey: "modules/current/repute.fac",
      sha256: "f".repeat(64),
      sizeBytes: 1889,
      factionCount: 5,
    },
    rows: [
      { factionId: 0, name: "PC", parentFactionId: 0xffffffff, isGlobal: true },
      { factionId: 1, name: "Hostile", parentFactionId: 0xffffffff, isGlobal: true },
      { factionId: 2, name: "Commoner", parentFactionId: 0xffffffff, isGlobal: true },
      { factionId: 3, name: "Merchant", parentFactionId: 0xffffffff, isGlobal: true },
      { factionId: 4, name: "Defender", parentFactionId: 0xffffffff, isGlobal: true },
    ],
  };
}

function encounterDifficultyCatalog(): SceneEncounterDifficultyCatalog {
  const values = [-2, -1, 1, 2, 3] as const;
  return {
    schemaVersion: "area-encounter-difficulty-catalog.v1",
    descriptor: {
      resourceName: "encdifficulty.2da",
      sourceObjectKey: "modules/current/encdifficulty.2da",
      sourceLayer: "module",
      sha256: "d".repeat(64),
      sizeBytes: 256,
      rowCount: values.length,
    },
    rows: values.map((value, rowIndex) => ({
      rowIndex,
      strRef: 1000 + rowIndex,
      value,
      displayName: `Difficulty ${rowIndex}`,
      displaySource: "strref" as const,
    })),
  };
}

function polygon(points: ReadonlyArray<readonly [number, number, number]>) {
  return {
    coordinateSpace: "native_local" as const,
    points: points.map(([x, y, z]) => ({ x, y, z })),
  };
}
