import { describe, expect, it } from "vitest";

import {
  appendAreaObjectPolygonDraftPoint,
  appendAreaObjectPolygonDraftCreature,
  appendAreaObjectPolygonDraftSpawnPoint,
  buildAreaObjectPolygonDraft,
  materializeAreaObjectPolygonDraft,
  materializeAreaObjectPolygonDraftActive,
  materializeAreaObjectPolygonDraftPlayerOnly,
  materializeAreaObjectPolygonDraftReset,
  materializeAreaObjectPolygonDraftResetTime,
  materializeAreaObjectPolygonDraftSpawnOption,
  materializeAreaObjectPolygonDraftRespawns,
  materializeAreaObjectPolygonDraftCreatureCounts,
  materializeAreaObjectPolygonDraftFaction,
  materializeAreaObjectPolygonDraftDifficulty,
  materializeAreaObjectPolygonDraftLocalizedName,
  materializeAreaObjectPolygonDraftTemplateResRef,
  materializeAreaObjectPolygonDraftEditorComment,
  materializeAreaObjectPolygonDraftVariables,
  materializeAreaObjectPolygonDraftCreatureList,
  materializeAreaObjectPolygonDraftSpawnPoints,
  materializeAreaObjectPolygonDraftScriptResRefs,
  materializeAreaObjectPolygonDraftTriggerScriptResRefs,
  materializeAreaObjectPolygonDraftTriggerTransitionStorage,
  materializeAreaObjectPolygonDraftTag,
  removeAreaObjectPolygonDraftPoint,
  removeAreaObjectPolygonDraftCreature,
  removeAreaObjectPolygonDraftSpawnPoint,
  moveAreaObjectPolygonDraftCreature,
  moveAreaObjectPolygonDraftSpawnPoint,
  replaceAreaObjectPolygonDraftCreature,
  updateAreaObjectPolygonDraftActive,
  updateAreaObjectPolygonDraftPlayerOnly,
  updateAreaObjectPolygonDraftReset,
  updateAreaObjectPolygonDraftResetTime,
  updateAreaObjectPolygonDraftSpawnOption,
  updateAreaObjectPolygonDraftRespawnsFinite,
  updateAreaObjectPolygonDraftRespawnsInfinite,
  updateAreaObjectPolygonDraftMaximumCreatures,
  updateAreaObjectPolygonDraftMinimumCreatures,
  updateAreaObjectPolygonDraftFaction,
  updateAreaObjectPolygonDraftDifficulty,
  updateAreaObjectPolygonDraftLocalizedName,
  updateAreaObjectPolygonDraftTemplateResRef,
  updateAreaObjectPolygonDraftEditorComment,
  updateAreaObjectPolygonDraftVariables,
  updateAreaObjectPolygonDraftCreatureSingleSpawn,
  updateAreaObjectPolygonDraftSpawnPoint,
  updateAreaObjectPolygonDraftScriptResRef,
  updateAreaObjectPolygonDraftTriggerScriptResRef,
  updateAreaObjectPolygonDraftTriggerTransitionStorage,
  updateAreaObjectPolygonDraftTag,
  updateAreaObjectPolygonDraftPoint,
} from "../../../../src/modules/areas/application/areaObjectPolygonAuthoring";
import type {
  SceneObject,
  SceneEncounterDifficultyCatalog,
  ScenePlaceableFactionCatalog,
} from "../../../../src/modules/scene/contracts";

describe("Area object polygon authoring", () => {
  it("builds a native-local editable draft only from exact immutable provenance", () => {
    const object = polygonObject();
    const draft = buildAreaObjectPolygonDraft(object);

    expect(draft).toEqual({
      objectId: object.id,
      objectKind: "triggers",
      tag: "TRIGGER",
      tagControlState: "ACTIVE_NOW",
      templateResRef: "newgeneric",
      templateResRefControlState: "ACTIVE_NOW",
      localizedName: "Gate Trigger",
      localizedNameControlState: "ACTIVE_NOW",
      editorComment: " source gate note ",
      editorCommentControlState: "ACTIVE_NOW",
      triggerScriptResRefs: {
        onDisarm: "trg_disarm",
        onTrapTriggered: "trg_trapped",
        onClick: "",
        onHeartbeat: "trg_heartbeat",
        onEnter: "trg_enter",
        onExit: "trg_exit",
        onUserDefined: "trg_user",
      },
      triggerScriptResRefsControlState: "ACTIVE_NOW",
      triggerTransitionStorage: {
        linkedTo: "east_gate",
        linkedToFlags: 2,
        loadScreenId: 7,
      },
      triggerTransitionStorageControlState: "ACTIVE_NOW",
      points: [
        { x: "0", y: "0", z: "0" },
        { x: "4", y: "0", z: "0" },
        { x: "0", y: "2", z: "0" },
      ],
    });
  });

  it("retains exact Trigger Tag whitespace through ACTIVE_NOW draft materialization", () => {
    const object = polygonObject();
    const initial = buildAreaObjectPolygonDraft(object)!;
    const updated = updateAreaObjectPolygonDraftTag(
      initial,
      object.source,
      "  AREA_EXIT  ",
    );

    expect(updated.tag).toBe("  AREA_EXIT  ");
    expect(materializeAreaObjectPolygonDraftTag(
      updated,
      object.source,
      object.tag,
    )).toBe("  AREA_EXIT  ");
  });

  it("keeps Trigger Tag PRESERVE_ONLY without exact physically-present provenance", () => {
    const object = polygonObject();
    const source = { ...object.source, triggerTag: { present: false as const } };
    const preserveOnly = buildAreaObjectPolygonDraft({ ...object, source })!;

    expect(preserveOnly).toMatchObject({
      tag: "TRIGGER",
      tagControlState: "PRESERVE_ONLY",
    });
    expect(updateAreaObjectPolygonDraftTag(
      preserveOnly,
      source,
      "AREA_EXIT",
    )).toBe(preserveOnly);
    expect(materializeAreaObjectPolygonDraftTag(
      preserveOnly,
      source,
      object.tag,
    )).toBe("TRIGGER");
  });

  it("edits Trigger TemplateResRef only for exact retained native provenance", () => {
    const object = polygonObject();
    const initial = buildAreaObjectPolygonDraft(object)!;
    const updated = updateAreaObjectPolygonDraftTemplateResRef(
      initial,
      object.source,
      "custom_trigger",
    );

    expect(initial).toMatchObject({
      templateResRef: "newgeneric",
      templateResRefControlState: "ACTIVE_NOW",
    });
    expect(updated.templateResRef).toBe("custom_trigger");
    expect(materializeAreaObjectPolygonDraftTemplateResRef(
      updated,
      object.source,
      object.triggerTemplateResRef,
    )).toBe("custom_trigger");

    const preserveSource = {
      ...object.source!,
      triggerTemplateResRef: { present: false as const },
    };
    const preserveOnly = buildAreaObjectPolygonDraft({
      ...object,
      source: preserveSource,
      triggerTemplateResRef: undefined,
    })!;
    expect(preserveOnly.templateResRefControlState).toBe("PRESERVE_ONLY");
    expect(updateAreaObjectPolygonDraftTemplateResRef(
      preserveOnly,
      preserveSource,
      "custom_trigger",
    )).toBe(preserveOnly);
  });

  it("edits Trigger LocalizedName only for exact retained inline ASCII provenance", () => {
    const object = polygonObject();
    const initial = buildAreaObjectPolygonDraft(object)!;
    const updated = updateAreaObjectPolygonDraftLocalizedName(
      initial,
      object.source,
      " Inner Gate Trigger ",
    );

    expect(initial).toMatchObject({
      localizedName: "Gate Trigger",
      localizedNameControlState: "ACTIVE_NOW",
    });
    expect(updated.localizedName).toBe(" Inner Gate Trigger ");
    expect(materializeAreaObjectPolygonDraftLocalizedName(
      updated,
      object.source,
      object.triggerLocalizedName,
    )).toBe(" Inner Gate Trigger ");

    const preserveSource = {
      ...object.source!,
      triggerLocalizedNameStorage: {
        present: true as const,
        strRef: 14759,
        entries: [],
      },
    };
    const preserveOnly = buildAreaObjectPolygonDraft({
      ...object,
      source: preserveSource,
      triggerLocalizedName: undefined,
    })!;
    expect(preserveOnly.localizedNameControlState).toBe("PRESERVE_ONLY");
    expect(updateAreaObjectPolygonDraftLocalizedName(
      preserveOnly,
      preserveSource,
      "Invented",
    )).toBe(preserveOnly);
  });

  it("edits Trigger Comment only from exact retained paired-GIC provenance", () => {
    const object = polygonObject();
    const initial = buildAreaObjectPolygonDraft(object)!;
    const updated = updateAreaObjectPolygonDraftEditorComment(
      initial,
      object.source,
      "  updated gate note  ",
    );

    expect(initial).toMatchObject({
      editorComment: " source gate note ",
      editorCommentControlState: "ACTIVE_NOW",
    });
    expect(updated.editorComment).toBe("  updated gate note  ");
    expect(materializeAreaObjectPolygonDraftEditorComment(
      updated,
      object.source,
      object.triggerEditorComment,
    )).toBe("  updated gate note  ");
    expect(updateAreaObjectPolygonDraftEditorComment(
      updated,
      object.source,
      "bad\0note",
    )).toBe(updated);
  });

  it("retains exact Encounter Tag whitespace through ACTIVE_NOW draft materialization", () => {
    const trigger = polygonObject();
    const object: SceneObject = {
      ...trigger,
      id: "encounter-0",
      kind: "encounters",
      resRef: "x2_gnoll001",
      tag: "X2_GNOLL001",
      source: {
        ...trigger.source!,
        sourceKind: "encounter",
        sourceObjectId: "encounter:0",
        triggerTag: undefined,
        encounterTag: { present: true, value: "X2_GNOLL001" },
      },
    };
    const initial = buildAreaObjectPolygonDraft(object)!;
    const updated = updateAreaObjectPolygonDraftTag(
      initial,
      object.source,
      "  GNOLL_AMBUSH  ",
    );

    expect(initial).toMatchObject({
      objectKind: "encounters",
      tag: "X2_GNOLL001",
      tagControlState: "ACTIVE_NOW",
    });
    expect(updated.tag).toBe("  GNOLL_AMBUSH  ");
    expect(materializeAreaObjectPolygonDraftTag(
      updated,
      object.source,
      object.tag,
    )).toBe("  GNOLL_AMBUSH  ");
  });

  it("reduces and materializes exact Encounter Active BYTE through ACTIVE_NOW", () => {
    const object = encounterPolygonObject();
    const initial = buildAreaObjectPolygonDraft(object)!;
    const updated = updateAreaObjectPolygonDraftActive(initial, object.source, false);

    expect(initial).toMatchObject({
      objectKind: "encounters",
      active: true,
      activeControlState: "ACTIVE_NOW",
    });
    expect(updated.active).toBe(false);
    expect(materializeAreaObjectPolygonDraftActive(
      updated,
      object.source,
      object.encounterActive,
    )).toEqual({ activeByte: 0 });
  });

  it("keeps Encounter Active PRESERVE_ONLY without exact source storage", () => {
    const object = encounterPolygonObject();
    const source = { ...object.source!, encounterActiveStorage: undefined };
    const preserveOnly = buildAreaObjectPolygonDraft({ ...object, source })!;

    expect(preserveOnly).toMatchObject({
      active: true,
      activeControlState: "PRESERVE_ONLY",
    });
    expect(updateAreaObjectPolygonDraftActive(
      preserveOnly,
      source,
      false,
    )).toBe(preserveOnly);
    expect(materializeAreaObjectPolygonDraftActive(
      preserveOnly,
      source,
      object.encounterActive,
    )).toEqual({ activeByte: 1 });
  });

  it("reduces and materializes exact Encounter PlayerOnly BYTE through ACTIVE_NOW", () => {
    const object = encounterPolygonObject();
    const initial = buildAreaObjectPolygonDraft(object)!;
    const updated = updateAreaObjectPolygonDraftPlayerOnly(
      initial,
      object.source,
      false,
    );

    expect(initial).toMatchObject({
      objectKind: "encounters",
      playerOnly: true,
      playerOnlyControlState: "ACTIVE_NOW",
    });
    expect(updated.playerOnly).toBe(false);
    expect(materializeAreaObjectPolygonDraftPlayerOnly(
      updated,
      object.source,
      object.encounterPlayerOnly,
    )).toEqual({ playerOnlyByte: 0 });
  });

  it("keeps Encounter PlayerOnly PRESERVE_ONLY without exact source storage", () => {
    const object = encounterPolygonObject();
    const source = { ...object.source!, encounterPlayerOnlyStorage: undefined };
    const preserveOnly = buildAreaObjectPolygonDraft({ ...object, source })!;

    expect(preserveOnly).toMatchObject({
      playerOnly: true,
      playerOnlyControlState: "PRESERVE_ONLY",
    });
    expect(updateAreaObjectPolygonDraftPlayerOnly(
      preserveOnly,
      source,
      false,
    )).toBe(preserveOnly);
    expect(materializeAreaObjectPolygonDraftPlayerOnly(
      preserveOnly,
      source,
      object.encounterPlayerOnly,
    )).toEqual({ playerOnlyByte: 1 });
  });

  it("reduces and materializes exact Encounter Reset BYTE through ACTIVE_NOW", () => {
    const object = encounterPolygonObject();
    const initial = buildAreaObjectPolygonDraft(object)!;
    const updated = updateAreaObjectPolygonDraftReset(initial, object.source, false);

    expect(initial).toMatchObject({
      objectKind: "encounters",
      reset: true,
      resetControlState: "ACTIVE_NOW",
    });
    expect(updated.reset).toBe(false);
    expect(materializeAreaObjectPolygonDraftReset(
      updated,
      object.source,
      object.encounterReset,
    )).toEqual({ resetByte: 0 });
  });

  it("keeps Encounter Reset PRESERVE_ONLY without exact source storage", () => {
    const object = encounterPolygonObject();
    const source = { ...object.source!, encounterResetStorage: undefined };
    const preserveOnly = buildAreaObjectPolygonDraft({ ...object, source })!;

    expect(preserveOnly).toMatchObject({
      reset: true,
      resetControlState: "PRESERVE_ONLY",
    });
    expect(updateAreaObjectPolygonDraftReset(preserveOnly, source, false))
      .toBe(preserveOnly);
    expect(materializeAreaObjectPolygonDraftReset(
      preserveOnly,
      source,
      object.encounterReset,
    )).toEqual({ resetByte: 1 });
  });

  it("edits bounded Encounter ResetTime only while Reset is enabled", () => {
    const object = encounterPolygonObject();
    const initial = buildAreaObjectPolygonDraft(object)!;
    const updated = updateAreaObjectPolygonDraftResetTime(
      initial,
      object.source,
      90,
    );

    expect(initial).toMatchObject({
      objectKind: "encounters",
      reset: true,
      resetTime: 60,
      resetTimeControlState: "ACTIVE_NOW",
    });
    expect(updated.resetTime).toBe(90);
    expect(materializeAreaObjectPolygonDraftResetTime(
      updated,
      object.source,
      object.encounterResetTime,
    )).toEqual({ resetTime: 90 });

    const resetDisabled = { ...updated, reset: false };
    expect(updateAreaObjectPolygonDraftResetTime(
      resetDisabled,
      object.source,
      120,
    )).toBe(resetDisabled);
    expect(materializeAreaObjectPolygonDraftResetTime(
      resetDisabled,
      object.source,
      object.encounterResetTime,
    )).toEqual({ resetTime: 90 });
  });

  it("keeps Encounter ResetTime PRESERVE_ONLY without exact source storage", () => {
    const object = encounterPolygonObject();
    const source = { ...object.source!, encounterResetTimeStorage: undefined };
    const preserveOnly = buildAreaObjectPolygonDraft({ ...object, source })!;

    expect(preserveOnly).toMatchObject({
      resetTime: 60,
      resetTimeControlState: "PRESERVE_ONLY",
    });
    expect(updateAreaObjectPolygonDraftResetTime(preserveOnly, source, 90))
      .toBe(preserveOnly);
    expect(materializeAreaObjectPolygonDraftResetTime(
      preserveOnly,
      source,
      object.encounterResetTime,
    )).toEqual({ resetTime: 60 });
  });

  it("switches exact Encounter SpawnOption and disables Reset controls without erasing values", () => {
    const object = encounterPolygonObject();
    const initial = buildAreaObjectPolygonDraft(object)!;
    const singleShot = updateAreaObjectPolygonDraftSpawnOption(
      initial,
      object.source,
      1,
    );

    expect(initial).toMatchObject({
      spawnOption: 0,
      spawnOptionControlState: "ACTIVE_NOW",
      reset: true,
      resetTime: 60,
    });
    expect(singleShot).toMatchObject({
      spawnOption: 1,
      reset: true,
      resetTime: 60,
      respawns: 4,
      respawnsInfinite: false,
      resetControlState: "PRESERVE_ONLY",
      resetTimeControlState: "PRESERVE_ONLY",
      respawnsInfiniteControlState: "PRESERVE_ONLY",
      respawnsControlState: "PRESERVE_ONLY",
    });
    expect(updateAreaObjectPolygonDraftReset(singleShot, object.source, false))
      .toBe(singleShot);
    expect(updateAreaObjectPolygonDraftResetTime(singleShot, object.source, 90))
      .toBe(singleShot);
    expect(materializeAreaObjectPolygonDraftSpawnOption(
      singleShot,
      object.source,
      object.encounterSpawnOption,
    )).toEqual({ spawnOption: 1 });
    expect(materializeAreaObjectPolygonDraftReset(
      singleShot,
      object.source,
      object.encounterReset,
    )).toEqual({ resetByte: 1 });
    expect(materializeAreaObjectPolygonDraftResetTime(
      singleShot,
      object.source,
      object.encounterResetTime,
    )).toEqual({ resetTime: 60 });

    const continuous = updateAreaObjectPolygonDraftSpawnOption(
      singleShot,
      object.source,
      0,
    );
    expect(continuous).toMatchObject({
      spawnOption: 0,
      resetControlState: "ACTIVE_NOW",
      resetTimeControlState: "ACTIVE_NOW",
      respawnsInfiniteControlState: "ACTIVE_NOW",
      respawnsControlState: "ACTIVE_NOW",
    });
  });

  it("edits finite and Infinite Respawns without erasing the finite draft", () => {
    const object = encounterPolygonObject();
    const initial = buildAreaObjectPolygonDraft(object)!;
    expect(initial).toMatchObject({
      respawns: 4,
      respawnsInfinite: false,
      respawnsInfiniteControlState: "ACTIVE_NOW",
      respawnsControlState: "ACTIVE_NOW",
    });

    const finite = updateAreaObjectPolygonDraftRespawnsFinite(
      initial,
      object.source,
      9,
    );
    expect(finite.respawns).toBe(9);
    const infinite = updateAreaObjectPolygonDraftRespawnsInfinite(
      finite,
      object.source,
      true,
    );
    expect(infinite).toMatchObject({
      respawns: 9,
      respawnsInfinite: true,
      respawnsInfiniteControlState: "ACTIVE_NOW",
      respawnsControlState: "PRESERVE_ONLY",
    });
    expect(updateAreaObjectPolygonDraftRespawnsFinite(
      infinite,
      object.source,
      12,
    )).toBe(infinite);
    expect(materializeAreaObjectPolygonDraftRespawns(
      infinite,
      object.source,
      object.encounterRespawns,
    )).toEqual({ respawns: -1 });

    const finiteAgain = updateAreaObjectPolygonDraftRespawnsInfinite(
      infinite,
      object.source,
      false,
    );
    expect(finiteAgain).toMatchObject({
      respawns: 9,
      respawnsInfinite: false,
      respawnsControlState: "ACTIVE_NOW",
    });
    expect(materializeAreaObjectPolygonDraftRespawns(
      finiteAgain,
      object.source,
      object.encounterRespawns,
    )).toEqual({ respawns: 9 });
  });

  it("edits Maximum and Minimum Creatures as one invariant-preserving pair", () => {
    const object = encounterPolygonObject();
    const initial = buildAreaObjectPolygonDraft(object)!;
    expect(initial).toMatchObject({
      creatureCounts: { maxCreatures: 4, recCreatures: 2 },
      creatureCountsControlState: "ACTIVE_NOW",
    });

    const loweredMaximum = updateAreaObjectPolygonDraftMaximumCreatures(
      initial,
      object.source,
      1,
    );
    expect(loweredMaximum.creatureCounts).toEqual({
      maxCreatures: 1,
      recCreatures: 1,
    });

    const raisedMinimum = updateAreaObjectPolygonDraftMinimumCreatures(
      initial,
      object.source,
      6,
    );
    expect(raisedMinimum.creatureCounts).toEqual({
      maxCreatures: 6,
      recCreatures: 6,
    });
    expect(updateAreaObjectPolygonDraftMaximumCreatures(
      raisedMinimum,
      object.source,
      9,
    )).toBe(raisedMinimum);
    expect(materializeAreaObjectPolygonDraftCreatureCounts(
      raisedMinimum,
      object.source,
      object.encounterCreatureCounts,
    )).toEqual({ maxCreatures: 6, recCreatures: 6 });
  });

  it("keeps malformed Encounter creature-count provenance preserve-only", () => {
    const object = encounterPolygonObject();
    const source = { ...object.source!, encounterCreatureCountsStorage: undefined };
    const preserveOnly = buildAreaObjectPolygonDraft({ ...object, source })!;

    expect(preserveOnly.creatureCountsControlState).toBe("PRESERVE_ONLY");
    expect(updateAreaObjectPolygonDraftMaximumCreatures(
      preserveOnly,
      source,
      3,
    )).toBe(preserveOnly);
    expect(materializeAreaObjectPolygonDraftCreatureCounts(
      preserveOnly,
      source,
      object.encounterCreatureCounts,
    )).toEqual({ maxCreatures: 4, recCreatures: 2 });
  });

  it("edits and materializes the complete retained Encounter script tuple", () => {
    const object = encounterPolygonObject();
    const initial = buildAreaObjectPolygonDraft(object)!;
    expect(initial).toMatchObject({
      scriptResRefs: {
        onEntered: "enc_enter",
        onExit: "enc_exit",
        onExhausted: "",
        onHeartbeat: "enc_heartbeat",
        onUserDefined: "enc_user",
      },
      scriptResRefsControlState: "ACTIVE_NOW",
    });
    const updated = updateAreaObjectPolygonDraftScriptResRef(
      initial,
      object.source,
      "onEntered",
      "new_enter",
    );
    expect(updated.scriptResRefs?.onEntered).toBe("new_enter");
    expect(updateAreaObjectPolygonDraftScriptResRef(
      updated,
      object.source,
      "onExit",
      "Bad-Script",
    )).toBe(updated);
    expect(materializeAreaObjectPolygonDraftScriptResRefs(
      updated,
      object.source,
      object.encounterScriptResRefs,
    )).toEqual({
      ...object.encounterScriptResRefs,
      onEntered: "new_enter",
    });
  });

  it("edits and materializes the complete retained Trigger script tuple", () => {
    const object = polygonObject();
    const initial = buildAreaObjectPolygonDraft(object)!;
    expect(initial).toMatchObject({
      triggerScriptResRefs: {
        onDisarm: "trg_disarm",
        onTrapTriggered: "trg_trapped",
        onClick: "",
        onHeartbeat: "trg_heartbeat",
        onEnter: "trg_enter",
        onExit: "trg_exit",
        onUserDefined: "trg_user",
      },
      triggerScriptResRefsControlState: "ACTIVE_NOW",
    });
    const updated = updateAreaObjectPolygonDraftTriggerScriptResRef(
      initial,
      object.source,
      "onClick",
      "trg_click",
    );
    expect(updated.triggerScriptResRefs?.onClick).toBe("trg_click");
    expect(updateAreaObjectPolygonDraftTriggerScriptResRef(
      updated,
      object.source,
      "onExit",
      "Bad-Script",
    )).toBe(updated);
    expect(materializeAreaObjectPolygonDraftTriggerScriptResRefs(
      updated,
      object.source,
      object.triggerScriptResRefs,
    )).toEqual({
      ...object.triggerScriptResRefs,
      onClick: "trg_click",
    });
  });

  it("edits and materializes exact retained Trigger transition storage", () => {
    const object = polygonObject();
    const initial = buildAreaObjectPolygonDraft(object)!;
    expect(initial).toMatchObject({
      triggerTransitionStorage: {
        linkedTo: "east_gate",
        linkedToFlags: 2,
        loadScreenId: 7,
      },
      triggerTransitionStorageControlState: "ACTIVE_NOW",
    });
    const target = {
      linkedTo: "crypt_exit",
      linkedToFlags: 4,
      loadScreenId: 321,
    };
    const updated = updateAreaObjectPolygonDraftTriggerTransitionStorage(
      initial,
      object.source,
      target,
    );
    expect(updated.triggerTransitionStorage).toEqual(target);
    expect(updated.triggerTransitionStorage).not.toBe(target);
    expect(updateAreaObjectPolygonDraftTriggerTransitionStorage(
      updated,
      object.source,
      { ...target, linkedToFlags: 256 },
    )).toBe(updated);
    expect(materializeAreaObjectPolygonDraftTriggerTransitionStorage(
      updated,
      object.source,
      object.triggerTransitionStorage,
    )).toEqual(target);
  });

  it("edits Encounter Faction only through the exact digest-bound physical catalog", () => {
    const object = encounterPolygonObject();
    const catalog = encounterFactionCatalog();
    const initial = buildAreaObjectPolygonDraft(object, catalog)!;
    const updated = updateAreaObjectPolygonDraftFaction(
      initial,
      object.source,
      catalog,
      4,
    );

    expect(initial).toMatchObject({
      factionId: 1,
      factionControlState: "ACTIVE_NOW",
    });
    expect(updated.factionId).toBe(4);
    expect(materializeAreaObjectPolygonDraftFaction(
      updated,
      object.source,
      object.encounterFactionId,
      catalog,
    )).toBe(4);
    expect(updateAreaObjectPolygonDraftFaction(
      updated,
      object.source,
      catalog,
      0,
    )).toBe(updated);
  });

  it("keeps Encounter Faction PRESERVE_ONLY for a stale catalog digest", () => {
    const object = encounterPolygonObject();
    const catalog = encounterFactionCatalog();
    const staleCatalog = {
      ...catalog,
      descriptor: { ...catalog.descriptor, sha256: "e".repeat(64) },
    };
    const preserveOnly = buildAreaObjectPolygonDraft(object, staleCatalog)!;

    expect(preserveOnly).toMatchObject({
      factionId: 1,
      factionControlState: "PRESERVE_ONLY",
    });
    expect(updateAreaObjectPolygonDraftFaction(
      preserveOnly,
      object.source,
      staleCatalog,
      4,
    )).toBe(preserveOnly);
    expect(materializeAreaObjectPolygonDraftFaction(
      preserveOnly,
      object.source,
      object.encounterFactionId,
      staleCatalog,
    )).toBe(1);
  });

  it("edits Encounter Difficulty only through the exact catalog-bound physical row", () => {
    const object = encounterPolygonObject();
    const catalog = encounterDifficultyCatalog();
    const initial = buildAreaObjectPolygonDraft(
      object,
      encounterFactionCatalog(),
      catalog,
    )!;
    const updated = updateAreaObjectPolygonDraftDifficulty(
      initial,
      object.source,
      catalog,
      4,
    );

    expect(initial).toMatchObject({
      difficulty: { difficulty: 1, difficultyIndex: 2 },
      difficultyControlState: "ACTIVE_NOW",
    });
    expect(updated.difficulty).toEqual({ difficulty: 3, difficultyIndex: 4 });
    expect(materializeAreaObjectPolygonDraftDifficulty(
      updated,
      object.source,
      object.encounterDifficulty,
      catalog,
    )).toEqual({ difficulty: 3, difficultyIndex: 4 });
    expect(updateAreaObjectPolygonDraftDifficulty(
      updated,
      object.source,
      catalog,
      5,
    )).toBe(updated);
  });

  it("edits Encounter LocalizedName only for exact retained inline ASCII provenance", () => {
    const object = encounterPolygonObject();
    const initial = buildAreaObjectPolygonDraft(object)!;
    const updated = updateAreaObjectPolygonDraftLocalizedName(
      initial,
      object.source,
      " Night Ambush ",
    );

    expect(initial).toMatchObject({
      localizedName: "Gnoll Ambush",
      localizedNameControlState: "ACTIVE_NOW",
    });
    expect(updated.localizedName).toBe(" Night Ambush ");
    expect(materializeAreaObjectPolygonDraftLocalizedName(
      updated,
      object.source,
      object.encounterLocalizedName,
    )).toBe(" Night Ambush ");

    const preserveSource = {
      ...object.source!,
      encounterLocalizedNameStorage: {
        present: true as const,
        strRef: 91345,
        entries: [],
      },
    };
    const preserveOnly = buildAreaObjectPolygonDraft({
      ...object,
      source: preserveSource,
      encounterLocalizedName: undefined,
    })!;
    expect(preserveOnly.localizedNameControlState).toBe("PRESERVE_ONLY");
    expect(updateAreaObjectPolygonDraftLocalizedName(
      preserveOnly,
      preserveSource,
      "Invented",
    )).toBe(preserveOnly);
  });

  it("edits Encounter TemplateResRef only for exact retained native provenance", () => {
    const object = encounterPolygonObject();
    const initial = buildAreaObjectPolygonDraft(object)!;
    const updated = updateAreaObjectPolygonDraftTemplateResRef(
      initial,
      object.source,
      "custom_encounter",
    );

    expect(initial).toMatchObject({
      templateResRef: "x2_gnoll001",
      templateResRefControlState: "ACTIVE_NOW",
    });
    expect(updated.templateResRef).toBe("custom_encounter");
    expect(materializeAreaObjectPolygonDraftTemplateResRef(
      updated,
      object.source,
      object.encounterTemplateResRef,
    )).toBe("custom_encounter");

    const preserveSource = {
      ...object.source!,
      encounterTemplateResRef: { present: false as const },
    };
    const preserveOnly = buildAreaObjectPolygonDraft({
      ...object,
      source: preserveSource,
      encounterTemplateResRef: undefined,
    })!;
    expect(preserveOnly.templateResRefControlState).toBe("PRESERVE_ONLY");
    expect(updateAreaObjectPolygonDraftTemplateResRef(
      preserveOnly,
      preserveSource,
      "custom_encounter",
    )).toBe(preserveOnly);
  });

  it("edits Encounter Comment only from exact retained paired-GIC provenance", () => {
    const object = encounterPolygonObject();
    const initial = buildAreaObjectPolygonDraft(object)!;
    const updated = updateAreaObjectPolygonDraftEditorComment(
      initial,
      object.source,
      "  updated note  ",
    );

    expect(initial).toMatchObject({
      editorComment: " source note ",
      editorCommentControlState: "ACTIVE_NOW",
    });
    expect(updated.editorComment).toBe("  updated note  ");
    expect(materializeAreaObjectPolygonDraftEditorComment(
      updated,
      object.source,
      object.encounterProperties?.comments,
    )).toBe("  updated note  ");
    expect(updateAreaObjectPolygonDraftEditorComment(
      updated,
      object.source,
      "bad\0note",
    )).toBe(updated);
  });

  it("edits and materializes the exact ordered Encounter VarTable", () => {
    const object = encounterPolygonObject();
    const initial = buildAreaObjectPolygonDraft(object)!;
    const target = [
      { name: "note", type: "string" as const, value: " target " },
      { name: "counter", type: "int" as const, value: 1 },
    ];
    const updated = updateAreaObjectPolygonDraftVariables(
      initial,
      object.source,
      target,
    );

    expect(initial).toMatchObject({
      variablesControlState: "ACTIVE_NOW",
      variables: [
        { name: "counter", type: "int", value: 1 },
        { name: "note", type: "string", value: " source " },
      ],
    });
    expect(updated.variables).toEqual(target);
    expect(materializeAreaObjectPolygonDraftVariables(
      updated,
      object.source,
      object.encounterProperties?.variables,
    )).toEqual(target);
    expect(object.source?.encounterVariables?.expectedEntries[0]?.name).toBe("counter");
  });

  it("toggles only one retained Encounter CreatureList SingleSpawn flag", () => {
    const object = encounterPolygonObject();
    const initial = buildAreaObjectPolygonDraft(object)!;
    const updated = updateAreaObjectPolygonDraftCreatureSingleSpawn(
      initial,
      object.source,
      0,
      true,
    );

    expect(initial).toMatchObject({
      creatureListControlState: "ACTIVE_NOW",
      creatureList: [
        {
          entryKind: "retained",
          sourceIndex: 0,
          appearance: 388,
          challengeRating: 1,
          resRef: "nw_gnoll001",
          singleSpawn: false,
        },
        {
          entryKind: "retained",
          sourceIndex: 1,
          appearance: 389,
          challengeRating: 3,
          resRef: "nw_gnoll002",
          singleSpawn: true,
        },
      ],
    });
    expect(materializeAreaObjectPolygonDraftCreatureList(
      updated,
      object.source,
      object.encounterProperties?.creatureList,
    )).toEqual([
      {
        entryKind: "retained",
        sourceIndex: 0,
        appearance: 388,
        challengeRating: 1,
        resRef: "nw_gnoll001",
        singleSpawn: true,
      },
      {
        entryKind: "retained",
        sourceIndex: 1,
        appearance: 389,
        challengeRating: 3,
        resRef: "nw_gnoll002",
        singleSpawn: true,
      },
    ]);
    expect(object.source?.encounterCreatureList?.expectedEntries[0]?.singleSpawnByte)
      .toBe(0);
  });

  it("adds, replaces, reorders, and removes complete Encounter CreatureList entries", () => {
    const object = encounterPolygonObject();
    const initial = buildAreaObjectPolygonDraft(object)!;
    const wolf = {
      entryKind: "effective_blueprint" as const,
      sourceProfileId: "effective-catalog-utc-encounter-creature-list-v1" as const,
      templateId: "cre_wolf_alpha",
      resRef: "nw_wolf001",
      appearance: 225,
      challengeRating: Math.fround(2.5),
      sourceObjectKey: "module/catalog/creatures/nw_wolf001.utc",
      sourceSizeBytes: 2048,
      sourceSha256: "a".repeat(64),
      singleSpawn: false,
    };
    const appended = appendAreaObjectPolygonDraftCreature(initial, object.source, wolf);
    const moved = moveAreaObjectPolygonDraftCreature(appended, object.source, 2, -1);
    const replacement = { ...wolf, templateId: "cre_wolf_beta", singleSpawn: true };
    const replaced = replaceAreaObjectPolygonDraftCreature(
      moved,
      object.source,
      1,
      replacement,
    );
    const removed = removeAreaObjectPolygonDraftCreature(replaced, object.source, 0);

    expect(removed.creatureList).toEqual([
      replacement,
      expect.objectContaining({
        entryKind: "retained",
        sourceIndex: 1,
        resRef: "nw_gnoll002",
      }),
    ]);
    expect(materializeAreaObjectPolygonDraftCreatureList(
      removed,
      object.source,
      object.encounterProperties?.creatureList,
    )).toEqual(removed.creatureList);
    const oneEntry = removeAreaObjectPolygonDraftCreature(initial, object.source, 1);
    const empty = removeAreaObjectPolygonDraftCreature(oneEntry, object.source, 0);
    expect(materializeAreaObjectPolygonDraftCreatureList(
      empty,
      object.source,
      object.encounterProperties?.creatureList,
    )).toEqual([]);
  });

  it("edits, adds, removes and reorders the complete Encounter SpawnPointList", () => {
    const object = encounterPolygonObject();
    const initial = buildAreaObjectPolygonDraft(object)!;
    const edited = updateAreaObjectPolygonDraftSpawnPoint(
      initial,
      object.source,
      0,
      "orientation",
      1.25,
    );
    const moved = moveAreaObjectPolygonDraftSpawnPoint(
      edited,
      object.source,
      1,
      -1,
    );
    const removed = removeAreaObjectPolygonDraftSpawnPoint(
      moved,
      object.source,
      1,
    );
    const appended = appendAreaObjectPolygonDraftSpawnPoint(
      removed,
      object.source,
      { nativeX: 7.5, nativeY: -8.25, nativeZ: 0.5, orientation: -2.5 },
    );

    expect(initial).toMatchObject({
      spawnPointsControlState: "ACTIVE_NOW",
      spawnPoints: [
        { nativeX: 22.5, nativeY: 45.25, nativeZ: 0, orientation: 1.5 },
        { nativeX: -3.75, nativeY: 9.5, nativeZ: 0.125, orientation: -2.25 },
      ],
    });
    expect(materializeAreaObjectPolygonDraftSpawnPoints(
      appended,
      object.source,
      object.encounterProperties?.spawnPoints,
    )).toEqual([
      { nativeX: -3.75, nativeY: 9.5, nativeZ: 0.125, orientation: -2.25 },
      { nativeX: 7.5, nativeY: -8.25, nativeZ: 0.5, orientation: -2.5 },
    ]);
    expect(object.source?.encounterSpawnPoints?.expectedEntries[0]).toEqual({
      sourceIndex: 0,
      nativeX: 22.5,
      nativeY: 45.25,
      nativeZ: 0,
      orientation: 1.5,
    });
  });

  it("keeps Reset family fail-closed when SpawnOption provenance is unavailable", () => {
    const object = encounterPolygonObject();
    const source = { ...object.source!, encounterSpawnOptionStorage: undefined };
    const preserveOnly = buildAreaObjectPolygonDraft({ ...object, source })!;

    expect(preserveOnly).toMatchObject({
      spawnOption: 0,
      spawnOptionControlState: "PRESERVE_ONLY",
      resetControlState: "PRESERVE_ONLY",
      resetTimeControlState: "PRESERVE_ONLY",
    });
    expect(updateAreaObjectPolygonDraftSpawnOption(preserveOnly, source, 1))
      .toBe(preserveOnly);
    expect(updateAreaObjectPolygonDraftReset(preserveOnly, source, false))
      .toBe(preserveOnly);
    expect(updateAreaObjectPolygonDraftResetTime(preserveOnly, source, 90))
      .toBe(preserveOnly);
  });

  it("prefers the editable target while retaining native values as strings", () => {
    const object = {
      ...polygonObject(),
      polygonGeometry: polygon([[-1, 0, 0], [4, 0, 0], [0, 3, 0.5]]),
    };
    expect(buildAreaObjectPolygonDraft(object)?.points).toEqual([
      { x: "-1", y: "0", z: "0" },
      { x: "4", y: "0", z: "0" },
      { x: "0", y: "3", z: "0.5" },
    ]);
  });

  it("updates, appends, removes and materializes a complete float32 polygon", () => {
    const initial = buildAreaObjectPolygonDraft(polygonObject())!;
    const updated = updateAreaObjectPolygonDraftPoint(initial, 2, "y", "3.25");
    const appended = appendAreaObjectPolygonDraftPoint(updated);
    const moved = updateAreaObjectPolygonDraftPoint(appended, 3, "x", "-1");
    const reduced = removeAreaObjectPolygonDraftPoint(moved, 0);

    expect(materializeAreaObjectPolygonDraft(reduced)).toEqual(polygon([
      [4, 0, 0], [0, 3.25, 0], [-1, 3.25, 0],
    ]));
  });

  it("fails closed for invalid provenance, invalid numbers and degenerate XY area", () => {
    const missingSource = { ...polygonObject(), source: undefined };
    expect(buildAreaObjectPolygonDraft(missingSource)).toBeNull();

    const initial = buildAreaObjectPolygonDraft(polygonObject())!;
    expect(materializeAreaObjectPolygonDraft(
      updateAreaObjectPolygonDraftPoint(initial, 0, "x", "NaN"),
    )).toBeNull();
    const degenerate = {
      ...initial,
      points: [
        { x: "0", y: "0", z: "0" },
        { x: "1", y: "1", z: "0" },
        { x: "2", y: "2", z: "0" },
      ],
    };
    expect(materializeAreaObjectPolygonDraft(degenerate)).toBeNull();
  });

  it("does not remove below the native minimum of three points", () => {
    const initial = buildAreaObjectPolygonDraft(polygonObject())!;
    expect(removeAreaObjectPolygonDraftPoint(initial, 1)).toBe(initial);
  });
});

function polygonObject(): SceneObject {
  return {
    id: "trigger-0",
    kind: "triggers",
    resRef: "newgeneric",
    tag: "TRIGGER",
    triggerTemplateResRef: "newgeneric",
    triggerLocalizedName: "Gate Trigger",
    triggerEditorComment: " source gate note ",
    triggerScriptResRefs: {
      onDisarm: "trg_disarm",
      onTrapTriggered: "trg_trapped",
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
      sourceKind: "trigger",
      sourceIndex: 0,
      sourceObjectId: "trigger:0",
      triggerTag: { present: true, value: "TRIGGER" },
      triggerTemplateResRef: {
        present: true,
        nativeType: "resref",
        value: "newgeneric",
      },
      triggerLocalizedNameStorage: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "R2F0ZSBUcmlnZ2Vy" }],
      },
      triggerEditorComment: " source gate note ",
      triggerScriptResRefsStorage: {
        onDisarm: "trg_disarm",
        onTrapTriggered: "trg_trapped",
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
      polygonGeometry: polygon([[0, 0, 0], [4, 0, 0], [0, 2, 0]]),
    },
  };
}

function encounterPolygonObject(): SceneObject {
  const trigger = polygonObject();
  return {
    ...trigger,
    id: "encounter-0",
    kind: "encounters",
    resRef: "x2_gnoll001",
    tag: "X2_GNOLL001",
    encounterActive: { activeByte: 1 },
    encounterPlayerOnly: { playerOnlyByte: 1 },
    encounterReset: { resetByte: 1 },
    encounterResetTime: { resetTime: 60 },
    encounterSpawnOption: { spawnOption: 0 },
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
    source: {
      ...trigger.source!,
      sourceKind: "encounter",
      sourceObjectId: "encounter:0",
      triggerTag: undefined,
      encounterTag: { present: true, value: "X2_GNOLL001" },
      encounterTemplateResRef: {
        present: true,
        nativeType: "resref",
        value: "x2_gnoll001",
      },
      encounterActiveStorage: { activeByte: 1 },
      encounterPlayerOnlyStorage: { playerOnlyByte: 1 },
      encounterResetStorage: { resetByte: 1 },
      encounterResetTimeStorage: { resetTime: 60 },
      encounterSpawnOptionStorage: { spawnOption: 0 },
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
        present: true,
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
          singleSpawnByte: 0,
        },
        {
          sourceIndex: 1,
          appearance: 389,
          challengeRating: 3,
          resRef: "nw_gnoll002",
          singleSpawnByte: 1,
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
    },
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
    points: points.map(([x, y, z]) => ({ x: Math.fround(x), y: Math.fround(y), z: Math.fround(z) })),
  };
}
