import { describe, expect, it } from "vitest";
import type { AreaScene } from "../../../../../src/modules/scene/contracts";
import {
  createNewDoorHookSceneObject,
  createNewSceneObject,
  createSeedAreaScene,
} from "../../../../../src/modules/scene/domain/sceneFactory";

const TIN01_SHA = "e45bfba6f61442e7618b7477f0967943b6ff74a2c02593da6c031c641b3e6ac4";

function exactDoorHookScene(): AreaScene {
  const scene = createSeedAreaScene(4, 4);
  scene.objects = [];
  scene.auroraAreaEditing = {
    state: {
      schemaVersion: 1,
      areaResRef: "demo_home",
      tilesetResRef: "tin01",
      tilesetFingerprint: TIN01_SHA,
      width: 4,
      height: 4,
      tiles: [{
        id: "aurora_2_3",
        row: 2,
        col: 3,
        tileId: 121,
        orientation: 0,
        height: 0,
      }],
      topology: {
        tokenWidth: 0,
        tokenHeight: 0,
        tokens: [],
        cornerWidth: 0,
        cornerHeight: 0,
        heights: [],
      },
      groupInstances: [],
    },
    definition: {
      schemaVersion: 1,
      tilesetResRef: "tin01",
      fingerprint: TIN01_SHA,
      transitionRules: [],
      groups: [],
      tiles: [{
        tileId: 121,
        orientation: 0,
        terrain: {},
        crossers: {},
        cornerHeights: {},
        doorHooks: [{
          index: 0,
          type: 0,
          x: 0,
          y: 0.76,
          z: 0,
          orientationDegrees: 180,
        }],
      }],
    },
    terrainBrush: "0",
  };
  return scene;
}

describe("exact tin01 door-hook scene construction", () => {
  it("derives the immutable door provenance and transform from the retained hook", () => {
    const created = createNewDoorHookSceneObject(exactDoorHookScene(), 3.9, 2.1, 7);

    expect(created).toMatchObject({
      id: "doo_007",
      kind: "doors",
      name: "Barn 1 Door",
      resRef: "nw_door_ttr_04",
      tag: "Barn1Door",
      isStatic: false,
      x: 3.5,
      y: 2.576,
      z: 0,
      bearing: Math.PI,
      visualTransform: {
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        offsetZ: 0,
        pitch: 0,
        roll: 0,
        yaw: 0,
      },
      source: {
        type: "aurora_blueprint",
        sourceKind: "door",
        sourceProfileId: "nwn-base-key-utd-nw-door-ttr-04-tin01-121-0-v1",
        doorHook: { row: 2, col: 3, hookIndex: 0 },
      },
    });
    expect(Object.isFrozen(created?.source)).toBe(true);
    expect(Object.isFrozen(created?.source?.doorHook)).toBe(true);
  });

  it.each([
    ["missing editor topology", (scene: AreaScene) => { delete scene.auroraAreaEditing; }],
    ["wrong SET fingerprint", (scene: AreaScene) => { scene.auroraAreaEditing!.definition.fingerprint = "0".repeat(64); }],
    ["wrong Area fingerprint", (scene: AreaScene) => { scene.auroraAreaEditing!.state.tilesetFingerprint = "0".repeat(64); }],
    ["wrong SET tileset", (scene: AreaScene) => { scene.auroraAreaEditing!.definition.tilesetResRef = "tin02"; }],
    ["wrong Area tileset", (scene: AreaScene) => { scene.auroraAreaEditing!.state.tilesetResRef = "tin02"; }],
    ["wrong Area width", (scene: AreaScene) => { scene.auroraAreaEditing!.state.width = 5; }],
    ["wrong Area height", (scene: AreaScene) => { scene.auroraAreaEditing!.state.height = 3; }],
    ["wrong retained tile", (scene: AreaScene) => { scene.auroraAreaEditing!.state.tiles[0]!.tileId = 120; }],
    ["rotated retained tile", (scene: AreaScene) => { scene.auroraAreaEditing!.state.tiles[0]!.orientation = 1; }],
    ["wrong tile height", (scene: AreaScene) => { scene.auroraAreaEditing!.state.tiles[0]!.height = 1; }],
    ["missing SET hook", (scene: AreaScene) => { scene.auroraAreaEditing!.definition.tiles[0]!.doorHooks = []; }],
    ["missing SET hook property", (scene: AreaScene) => { delete scene.auroraAreaEditing!.definition.tiles[0]!.doorHooks; }],
    ["wrong SET tile orientation", (scene: AreaScene) => { scene.auroraAreaEditing!.definition.tiles[0]!.orientation = 1; }],
    ["changed SET hook index", (scene: AreaScene) => { scene.auroraAreaEditing!.definition.tiles[0]!.doorHooks![0]!.index = 1; }],
    ["changed SET hook type", (scene: AreaScene) => { scene.auroraAreaEditing!.definition.tiles[0]!.doorHooks![0]!.type = 1; }],
    ["changed SET hook X", (scene: AreaScene) => { scene.auroraAreaEditing!.definition.tiles[0]!.doorHooks![0]!.x = 0.1; }],
    ["changed SET hook Y", (scene: AreaScene) => { scene.auroraAreaEditing!.definition.tiles[0]!.doorHooks![0]!.y = 0.75; }],
    ["changed SET hook Z", (scene: AreaScene) => { scene.auroraAreaEditing!.definition.tiles[0]!.doorHooks![0]!.z = 0.1; }],
    ["changed SET hook orientation", (scene: AreaScene) => { scene.auroraAreaEditing!.definition.tiles[0]!.doorHooks![0]!.orientationDegrees = 179; }],
  ])("fails closed for %s", (_label, mutate) => {
    const scene = exactDoorHookScene();
    mutate(scene);
    expect(createNewDoorHookSceneObject(scene, 3.9, 2.1, 7)).toBeUndefined();
  });

  it.each([
    [Number.NaN, 2.1, 7],
    [3.9, Number.POSITIVE_INFINITY, 7],
    [3.9, 2.1, -1],
    [3.9, 2.1, 1.5],
    [-0.1, 2.1, 7],
    [3.9, -0.1, 7],
    [4, 2.1, 7],
    [3.9, 4, 7],
  ])("rejects invalid input or out-of-bounds point (%s, %s, %s)", (x, y, sequence) => {
    expect(createNewDoorHookSceneObject(exactDoorHookScene(), x, y, sequence)).toBeUndefined();
  });

  it("accepts sequence zero and hooks on row or column zero", () => {
    const rowZero = exactDoorHookScene();
    rowZero.auroraAreaEditing!.state.tiles[0]!.row = 0;
    expect(createNewDoorHookSceneObject(rowZero, 3.9, 0.1, 0)).toMatchObject({ id: "doo_000" });

    const colZero = exactDoorHookScene();
    colZero.auroraAreaEditing!.state.tiles[0]!.col = 0;
    expect(createNewDoorHookSceneObject(colZero, 0.1, 2.1, 1)).toBeDefined();
  });

  it.each([
    [-1, 3, 3.9, -0.1],
    [2, -1, -0.1, 2.1],
    [4, 3, 3.9, 4],
    [2, 4, 4, 2.1],
  ])("rejects an out-of-bounds retained tile (%s, %s)", (row, col, x, y) => {
    const scene = exactDoorHookScene();
    scene.auroraAreaEditing!.state.tiles[0]!.row = row;
    scene.auroraAreaEditing!.state.tiles[0]!.col = col;
    expect(createNewDoorHookSceneObject(scene, x, y, 7)).toBeUndefined();
  });

  it("selects the exact retained tile and SET definition among decoys", () => {
    const scene = exactDoorHookScene();
    scene.auroraAreaEditing!.state.tiles.unshift(
      { ...scene.auroraAreaEditing!.state.tiles[0]!, id: "wrong_col", col: 2, tileId: 120 },
      { ...scene.auroraAreaEditing!.state.tiles[0]!, id: "wrong_row", row: 1, tileId: 120 },
    );
    scene.auroraAreaEditing!.definition.tiles.unshift({
      tileId: 120,
      orientation: 0,
      terrain: {},
      crossers: {},
      cornerHeights: {},
      doorHooks: [],
    });

    expect(createNewDoorHookSceneObject(scene, 3.9, 2.1, 7)).toBeDefined();
  });

  it("rejects a second door on the occupied hook", () => {
    const scene = exactDoorHookScene();
    scene.objects = [createNewDoorHookSceneObject(scene, 3.2, 2.8, 1)!];

    expect(createNewDoorHookSceneObject(scene, 3.9, 2.1, 2)).toBeUndefined();
  });

  it("blocks coordinate-only and provenance-only hook occupancy", () => {
    const coordinateScene = exactDoorHookScene();
    coordinateScene.objects = [createNewSceneObject("doors", 3.5, 2.576, 1)];
    expect(createNewDoorHookSceneObject(coordinateScene, 3.9, 2.1, 2)).toBeUndefined();

    const provenanceScene = exactDoorHookScene();
    const sourceDoor = createNewDoorHookSceneObject(provenanceScene, 3.9, 2.1, 1)!;
    sourceDoor.x = 0;
    sourceDoor.y = 0;
    provenanceScene.objects = [sourceDoor];
    expect(createNewDoorHookSceneObject(provenanceScene, 3.9, 2.1, 2)).toBeUndefined();
  });

  it("does not treat non-doors or partial hook identities as occupied", () => {
    const nonDoorScene = exactDoorHookScene();
    nonDoorScene.objects = [createNewSceneObject("placeables", 3.5, 2.576, 1)];
    expect(createNewDoorHookSceneObject(nonDoorScene, 3.9, 2.1, 2)).toBeDefined();

    for (const patch of [
      { profileId: "other" },
      { row: 1 },
      { col: 2 },
      { hookIndex: 1 },
    ]) {
      const scene = exactDoorHookScene();
      const sourceDoor = createNewDoorHookSceneObject(scene, 3.9, 2.1, 1)!;
      sourceDoor.x = 0;
      sourceDoor.y = 0;
      sourceDoor.source = {
        ...sourceDoor.source!,
        doorHook: { ...sourceDoor.source!.doorHook!, ...patch },
      };
      scene.objects = [sourceDoor];
      expect(createNewDoorHookSceneObject(scene, 3.9, 2.1, 2)).toBeDefined();
    }

    for (const patch of [
      { x: 0 },
      { y: 0 },
      { z: 1 },
      { x: 3.5, y: 0 },
      { x: 0, y: 2.576 },
      { x: 3.5, y: 2.576, z: 1 },
    ]) {
      const scene = exactDoorHookScene();
      const door = createNewSceneObject("doors", 0, 0, 1);
      Object.assign(door, patch);
      scene.objects = [door];
      expect(createNewDoorHookSceneObject(scene, 3.9, 2.1, 2)).toBeDefined();
    }
  });

  it("keeps generic door creation outside the publishable blueprint profile", () => {
    expect(createNewSceneObject("doors", 1.25, 1.75, 8).source).toBeUndefined();
  });
});
