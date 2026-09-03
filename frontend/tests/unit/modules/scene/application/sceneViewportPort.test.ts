import { describe, expect, it, vi } from "vitest";
import type { SceneFacadeBundle } from "../../../../../src/modules/scene/application/sceneFacadeBundle";
import { createSceneViewportPort } from "../../../../../src/modules/scene/application/sceneViewportPort";
import { createSceneHistory } from "../../../../../src/modules/scene/domain/sceneHistory";
import { createSeedAreaScene } from "../../../../../src/modules/scene/domain/sceneFactory";

describe("sceneViewportPort", () => {
  it("delegates viewport use-cases to bundled scene facades", () => {
    const seed = createSeedAreaScene();
    const nextScene = {
      ...seed,
      areaName: "Edited Area"
    };
    const history = createSceneHistory(seed);
    const committedHistory = createSceneHistory(nextScene);
    const createdObject = seed.objects[0];
    const orderedSelectionIds = [seed.objects[1].id, seed.objects[0].id];

    const bundle: SceneFacadeBundle = {
      canvas: {
        createInitialHistory: vi.fn(() => history),
        saveLocalDraft: vi.fn()
      },
      history: {
        commit: vi.fn(() => committedHistory),
        undo: vi.fn(() => history),
        redo: vi.fn(() => committedHistory)
      },
      mutations: {
        appendObjects: vi.fn(() => nextScene),
        deleteObjectsByIds: vi.fn(() => nextScene),
        deleteObjectById: vi.fn(() => nextScene),
        setExistingWaypointTagById: vi.fn(() => nextScene),
        setExistingTriggerEditorCommentById: vi.fn(() => nextScene),
        setExistingTriggerScriptResRefsById: vi.fn(() => nextScene),
        setExistingTriggerTransitionStorageById: vi.fn(() => nextScene),
        setAreaObjectPolygonGeometryById: vi.fn(() => nextScene),
        setPlaceablePropertiesByIds: vi.fn(() => nextScene),
        setObjectsAbsoluteLocationByIds: vi.fn(() => nextScene),
        setObjectsVisualTransformByIds: vi.fn(() => nextScene),
        restoreObjectsPlacementBySnapshots: vi.fn(() => nextScene),
        translateObjectsByIds: vi.fn(() => nextScene),
        adjustObjectsHeightByIds: vi.fn(() => nextScene),
        rotateObjectsBearingByIds: vi.fn(() => nextScene),
        updateTileTerrain: vi.fn(() => nextScene),
        applyAuroraAreaTerrainBrush: vi.fn(() => nextScene),
        placeAuroraAreaGroup: vi.fn(() => nextScene),
        removeAuroraAreaGroup: vi.fn(() => nextScene),
        rotateAuroraAreaGroup: vi.fn(() => nextScene),
        changeAuroraAreaGroupHeight: vi.fn(() => nextScene),
        resetObjectTransform: vi.fn(() => nextScene)
      },
      authoring: {
        createObject: vi.fn(() => createdObject),
        resolveCopyAnchor: vi.fn(() => ({ x: 1.1, y: 2.2 })),
        computeCopyTranslation: vi.fn(() => ({ x: 0.5, y: 0.25 })),
        createSeedObjectsSnapshot: vi.fn(() => seed.objects),
        getSceneScale: vi.fn(() => 0.66)
      }
    };

    const port = createSceneViewportPort(bundle);

    const initialHistory = port.createInitialHistory("u_builder_001");
    port.saveLocalDraft("u_builder_001", seed);
    const committed = port.commitHistory(history, nextScene);
    const undone = port.undoHistory(committed);
    const redone = port.redoHistory(undone);
    const appended = port.appendObjects(seed, []);
    const deletedMany = port.deleteObjectsByIds(seed, [seed.objects[0].id]);
    const deletedOne = port.deleteObjectById(seed, seed.objects[0].id);
    const updatedWaypointTag = port.setExistingWaypointTagById(
      seed,
      "waypoint-0",
      "  PATROL_POINT_01  ",
    );
    const updatedTriggerEditorComment = port.setExistingTriggerEditorCommentById(
      seed,
      "trigger-0",
      "  gate note  ",
    );
    const triggerScripts = {
      onDisarm: "trg_disarm",
      onTrapTriggered: "trg_trap",
      onClick: "trg_click",
      onHeartbeat: "trg_heartbeat",
      onEnter: "trg_enter",
      onExit: "trg_exit",
      onUserDefined: "trg_user",
    };
    const updatedTriggerScripts = port.setExistingTriggerScriptResRefsById(
      seed,
      "trigger-0",
      triggerScripts,
    );
    const triggerTransitionStorage = {
      linkedTo: "crypt_exit",
      linkedToFlags: 4,
      loadScreenId: 321,
    };
    const updatedTriggerTransitionStorage =
      port.setExistingTriggerTransitionStorageById(
        seed,
        "trigger-0",
        triggerTransitionStorage,
      );
    const polygonGeometry = {
      coordinateSpace: "native_local" as const,
      points: [{ x: 0, y: 0, z: 0 }, { x: 4, y: 0, z: 0 }, { x: 0, y: 2, z: 0 }],
    };
    const updatedPolygon = port.setAreaObjectPolygonGeometryById(
      seed,
      "trigger-0",
      polygonGeometry,
    );
    const updatedEncounterResetTime = port.setAreaObjectPolygonGeometryById(
      seed,
      "encounter-0",
      polygonGeometry,
      "ENCOUNTER",
      { activeByte: 1 },
      { playerOnlyByte: 0 },
      { resetByte: 0 },
      { resetTime: 90 },
      { spawnOption: 1 },
      { respawns: -1 },
      { maxCreatures: 6, recCreatures: 5 },
      {
        onEntered: "enc_enter",
        onExit: "enc_exit",
        onExhausted: "",
        onHeartbeat: "enc_heartbeat",
        onUserDefined: "enc_user",
      },
      4,
      { difficulty: 3, difficultyIndex: 4 },
    );
    const updatedPlaceableProperties = port.setPlaceablePropertiesByIds(
      seed,
      [seed.objects[0].id],
      {
        name: "Updated Placeable",
        tag: "PLC_UPDATED_01",
        resRef: "plc_updated_01",
        isStatic: false
      }
    );
    const updatedAbsoluteLocation = port.setObjectsAbsoluteLocationByIds(
      seed,
      orderedSelectionIds,
      { x: 1.2, y: 0.6, z: 0.3, bearing: 0.7 }
    );
    const updatedVisualTransform = port.setObjectsVisualTransformByIds(
      seed,
      [seed.objects[0].id],
      {
        scale: 1.1,
        offsetX: 0.25,
        offsetY: -0.1,
        offsetZ: 0.4,
        pitch: 0.12,
        yaw: -0.2,
        roll: 0.3
      }
    );
    const restoredFromSnapshots = port.restoreObjectsPlacementBySnapshots(seed, [seed.objects[0]]);
    const translated = port.translateObjectsByIds(seed, [seed.objects[0].id], { x: 0.5, y: -0.25 });
    const adjustedHeight = port.adjustObjectsHeightByIds(seed, [seed.objects[0].id], 0.4);
    const rotatedBearing = port.rotateObjectsBearingByIds(seed, [seed.objects[0].id], 0.2);
    const retiled = port.updateTileTerrain(seed, seed.tiles[0].id, "wall");
    const terrainBrushed = port.applyAuroraAreaTerrainBrush(seed, seed.tiles[0].id, "water");
    const groupPlaced = port.placeAuroraAreaGroup(seed, seed.tiles[0].id, "group0", 0);
    const groupRemoved = port.removeAuroraAreaGroup(seed, seed.tiles[0].id);
    const groupRotated = port.rotateAuroraAreaGroup(seed, seed.tiles[0].id, 1);
    const groupRaised = port.changeAuroraAreaGroupHeight(seed, seed.tiles[0].id, 1);
    const reset = port.resetObjectTransform(seed, seed.objects[0].id);
    const created = port.createObject("items", 1, 2, 7);
    const anchor = port.resolveCopyAnchor({
      cursorAnchor: { x: 0, y: 0 },
      sourcePoints: [{ x: 1, y: 1 }],
      fallbackOffset: 0.5
    });
    const translation = port.computeCopyTranslation({
      sourcePoints: [{ x: 1, y: 1 }],
      anchor: { x: 2, y: 3 },
      snapGrid: true,
      snapGridStep: 0.25
    });
    const scale = port.getSceneScale(seed.width, seed.height);

    expect(initialHistory).toBe(history);
    expect(committed).toBe(committedHistory);
    expect(undone).toBe(history);
    expect(redone).toBe(committedHistory);
    expect(appended).toBe(nextScene);
    expect(deletedMany).toBe(nextScene);
    expect(deletedOne).toBe(nextScene);
    expect(updatedWaypointTag).toBe(nextScene);
    expect(updatedTriggerEditorComment).toBe(nextScene);
    expect(updatedTriggerScripts).toBe(nextScene);
    expect(updatedTriggerTransitionStorage).toBe(nextScene);
    expect(updatedPolygon).toBe(nextScene);
    expect(updatedEncounterResetTime).toBe(nextScene);
    expect(updatedPlaceableProperties).toBe(nextScene);
    expect(updatedAbsoluteLocation).toBe(nextScene);
    expect(updatedVisualTransform).toBe(nextScene);
    expect(restoredFromSnapshots).toBe(nextScene);
    expect(translated).toBe(nextScene);
    expect(adjustedHeight).toBe(nextScene);
    expect(rotatedBearing).toBe(nextScene);
    expect(retiled).toBe(nextScene);
    expect(terrainBrushed).toBe(nextScene);
    expect(groupPlaced).toBe(nextScene);
    expect(groupRemoved).toBe(nextScene);
    expect(groupRotated).toBe(nextScene);
    expect(groupRaised).toBe(nextScene);
    expect(reset).toBe(nextScene);
    expect(created).toBe(createdObject);
    expect(anchor).toEqual({ x: 1.1, y: 2.2 });
    expect(translation).toEqual({ x: 0.5, y: 0.25 });
    expect(scale).toBe(0.66);

    expect(bundle.canvas.createInitialHistory).toHaveBeenCalledWith("u_builder_001");
    expect(bundle.canvas.saveLocalDraft).toHaveBeenCalledWith("u_builder_001", seed);
    expect(bundle.history.commit).toHaveBeenCalledWith(history, nextScene);
    expect(bundle.history.undo).toHaveBeenCalledWith(committedHistory);
    expect(bundle.history.redo).toHaveBeenCalledWith(history);
    expect(bundle.mutations.appendObjects).toHaveBeenCalledWith(seed, []);
    expect(bundle.mutations.deleteObjectsByIds).toHaveBeenCalledWith(seed, [seed.objects[0].id]);
    expect(bundle.mutations.deleteObjectById).toHaveBeenCalledWith(seed, seed.objects[0].id);
    expect(bundle.mutations.setExistingWaypointTagById).toHaveBeenCalledWith(
      seed,
      "waypoint-0",
      "  PATROL_POINT_01  ",
    );
    expect(bundle.mutations.setExistingTriggerEditorCommentById).toHaveBeenCalledWith(
      seed,
      "trigger-0",
      "  gate note  ",
    );
    expect(bundle.mutations.setExistingTriggerScriptResRefsById).toHaveBeenCalledWith(
      seed,
      "trigger-0",
      triggerScripts,
    );
    expect(bundle.mutations.setExistingTriggerTransitionStorageById).toHaveBeenCalledWith(
      seed,
      "trigger-0",
      triggerTransitionStorage,
    );
    expect(bundle.mutations.setAreaObjectPolygonGeometryById).toHaveBeenCalledWith(
      seed,
      "trigger-0",
      polygonGeometry,
    );
    expect(bundle.mutations.setAreaObjectPolygonGeometryById).toHaveBeenCalledWith(
      seed,
      "encounter-0",
      polygonGeometry,
      "ENCOUNTER",
      { activeByte: 1 },
      { playerOnlyByte: 0 },
      { resetByte: 0 },
      { resetTime: 90 },
      { spawnOption: 1 },
      { respawns: -1 },
      { maxCreatures: 6, recCreatures: 5 },
      {
        onEntered: "enc_enter",
        onExit: "enc_exit",
        onExhausted: "",
        onHeartbeat: "enc_heartbeat",
        onUserDefined: "enc_user",
      },
      4,
      { difficulty: 3, difficultyIndex: 4 },
    );
    expect(bundle.mutations.setPlaceablePropertiesByIds).toHaveBeenCalledWith(
      seed,
      [seed.objects[0].id],
      {
        name: "Updated Placeable",
        tag: "PLC_UPDATED_01",
        resRef: "plc_updated_01",
        isStatic: false
      }
    );
    expect(bundle.mutations.setObjectsAbsoluteLocationByIds).toHaveBeenCalledWith(
      seed,
      orderedSelectionIds,
      { x: 1.2, y: 0.6, z: 0.3, bearing: 0.7 }
    );
    expect(bundle.mutations.setObjectsVisualTransformByIds).toHaveBeenCalledWith(
      seed,
      [seed.objects[0].id],
      {
        scale: 1.1,
        offsetX: 0.25,
        offsetY: -0.1,
        offsetZ: 0.4,
        pitch: 0.12,
        yaw: -0.2,
        roll: 0.3
      }
    );
    expect(bundle.mutations.restoreObjectsPlacementBySnapshots).toHaveBeenCalledWith(seed, [
      seed.objects[0]
    ]);
    expect(bundle.mutations.translateObjectsByIds).toHaveBeenCalledWith(
      seed,
      [seed.objects[0].id],
      { x: 0.5, y: -0.25 }
    );
    expect(bundle.mutations.adjustObjectsHeightByIds).toHaveBeenCalledWith(
      seed,
      [seed.objects[0].id],
      0.4
    );
    expect(bundle.mutations.rotateObjectsBearingByIds).toHaveBeenCalledWith(
      seed,
      [seed.objects[0].id],
      0.2
    );
    expect(bundle.mutations.updateTileTerrain).toHaveBeenCalledWith(seed, seed.tiles[0].id, "wall");
    expect(bundle.mutations.applyAuroraAreaTerrainBrush).toHaveBeenCalledWith(
      seed,
      seed.tiles[0].id,
      "water"
    );
    expect(bundle.mutations.placeAuroraAreaGroup).toHaveBeenCalledWith(
      seed,
      seed.tiles[0].id,
      "group0",
      0
    );
    expect(bundle.mutations.removeAuroraAreaGroup).toHaveBeenCalledWith(seed, seed.tiles[0].id);
    expect(bundle.mutations.rotateAuroraAreaGroup).toHaveBeenCalledWith(seed, seed.tiles[0].id, 1);
    expect(bundle.mutations.changeAuroraAreaGroupHeight).toHaveBeenCalledWith(
      seed,
      seed.tiles[0].id,
      1
    );
    expect(bundle.mutations.resetObjectTransform).toHaveBeenCalledWith(seed, seed.objects[0].id);
    expect(bundle.authoring.createObject).toHaveBeenCalledWith("items", 1, 2, 7);
    expect(bundle.authoring.resolveCopyAnchor).toHaveBeenCalledWith({
      cursorAnchor: { x: 0, y: 0 },
      sourcePoints: [{ x: 1, y: 1 }],
      fallbackOffset: 0.5
    });
    expect(bundle.authoring.computeCopyTranslation).toHaveBeenCalledWith({
      sourcePoints: [{ x: 1, y: 1 }],
      anchor: { x: 2, y: 3 },
      snapGrid: true,
      snapGridStep: 0.25
    });
    expect(bundle.authoring.getSceneScale).toHaveBeenCalledWith(seed.width, seed.height);
  });

  it("preserves no-op scene reference and objectIds order for absolute-location delegation", () => {
    const seed = createSeedAreaScene();
    const orderedSelectionIds = [seed.objects[2].id, seed.objects[0].id, seed.objects[1].id];
    const bundle: SceneFacadeBundle = {
      canvas: {
        createInitialHistory: vi.fn(() => createSceneHistory(seed)),
        saveLocalDraft: vi.fn()
      },
      history: {
        commit: vi.fn((history) => history),
        undo: vi.fn((history) => history),
        redo: vi.fn((history) => history)
      },
      mutations: {
        appendObjects: vi.fn(() => seed),
        deleteObjectsByIds: vi.fn(() => seed),
        deleteObjectById: vi.fn(() => seed),
        setAreaObjectPolygonGeometryById: vi.fn(() => seed),
        setPlaceablePropertiesByIds: vi.fn(() => seed),
        setObjectsAbsoluteLocationByIds: vi.fn(() => seed),
        setObjectsVisualTransformByIds: vi.fn(() => seed),
        restoreObjectsPlacementBySnapshots: vi.fn(() => seed),
        translateObjectsByIds: vi.fn(() => seed),
        adjustObjectsHeightByIds: vi.fn(() => seed),
        rotateObjectsBearingByIds: vi.fn(() => seed),
        updateTileTerrain: vi.fn(() => seed),
        applyAuroraAreaTerrainBrush: vi.fn(() => seed),
        placeAuroraAreaGroup: vi.fn(() => seed),
        removeAuroraAreaGroup: vi.fn(() => seed),
        rotateAuroraAreaGroup: vi.fn(() => seed),
        changeAuroraAreaGroupHeight: vi.fn(() => seed),
        resetObjectTransform: vi.fn(() => seed)
      },
      authoring: {
        createObject: vi.fn(() => seed.objects[0]),
        resolveCopyAnchor: vi.fn(() => null),
        computeCopyTranslation: vi.fn(() => null),
        createSeedObjectsSnapshot: vi.fn(() => seed.objects),
        getSceneScale: vi.fn(() => 1)
      }
    };

    const port = createSceneViewportPort(bundle);
    const nextScene = port.setObjectsAbsoluteLocationByIds(seed, orderedSelectionIds, {
      x: 0.9,
      y: 1.1,
      z: 0.2,
      bearing: 0.3
    });

    expect(nextScene).toBe(seed);
    expect(bundle.mutations.setObjectsAbsoluteLocationByIds).toHaveBeenCalledWith(
      seed,
      orderedSelectionIds,
      { x: 0.9, y: 1.1, z: 0.2, bearing: 0.3 }
    );
  });
});
