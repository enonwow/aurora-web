import { describe, expect, it } from "vitest";
import { createSceneMutationsFacade } from "../../../../../src/modules/scene/application/sceneMutationsFacade";
import { createNewSceneObject, createSeedAreaScene } from "../../../../../src/modules/scene/domain/sceneFactory";

describe("sceneMutationsFacade", () => {
  it("appends objects to scene", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const created = createNewSceneObject("placeables", 0.9, 1.1, 901);

    const nextScene = facade.appendObjects(scene, [created]);

    expect(nextScene.objects).toHaveLength(scene.objects.length + 1);
    expect(nextScene.objects.at(-1)?.id).toBe(created.id);
  });

  it("returns the same scene for empty append request", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();

    const nextScene = facade.appendObjects(scene, []);

    expect(nextScene).toBe(scene);
  });

  it("clamps appended objects to scene bounds and surface floor", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const created = createNewSceneObject("placeables", -5, 20, 902);
    created.visualTransform.offsetZ = -1.4;

    const nextScene = facade.appendObjects(scene, [created]);
    const appended = nextScene.objects.at(-1);

    expect(appended?.x).toBe(0);
    expect(appended?.y).toBeLessThan(scene.height);
    expect(appended?.y).toBeGreaterThan(scene.height - 0.01);
    expect(appended?.visualTransform.offsetZ).toBe(0);
  });

  it("deletes objects by id set", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const deletableIds = scene.objects.slice(0, 2).map((object) => object.id);

    const nextScene = facade.deleteObjectsByIds(scene, deletableIds);

    expect(nextScene.objects).toHaveLength(scene.objects.length - 2);
    expect(nextScene.objects.some((object) => deletableIds.includes(object.id))).toBe(false);
  });

  it("returns same scene when delete ids are not present", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();

    const nextScene = facade.deleteObjectsByIds(scene, ["missing_object"]);

    expect(nextScene).toBe(scene);
  });

  it("updates terrain only on target tile", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const targetTile = scene.tiles[0];

    const nextScene = facade.updateTileTerrain(scene, targetTile.id, "shop");

    const updatedTile = nextScene.tiles.find((tile) => tile.id === targetTile.id);
    expect(updatedTile?.terrain).toBe("shop");
    expect(nextScene.tiles.filter((tile) => tile.id !== targetTile.id)).toEqual(
      scene.tiles.filter((tile) => tile.id !== targetTile.id)
    );
  });

  it("resets object transform and bearing", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const target = scene.objects[0];
    const dirtyScene = {
      ...scene,
      objects: scene.objects.map((object) =>
        object.id === target.id
          ? {
              ...object,
              bearing: 1.4,
              visualTransform: {
                ...object.visualTransform,
                offsetX: 0.2,
                offsetY: -0.3,
                offsetZ: 1.1,
                pitch: 0.4,
                roll: -0.2,
                yaw: 0.7
              }
            }
          : object
      )
    };

    const nextScene = facade.resetObjectTransform(dirtyScene, target.id);
    const resetObject = nextScene.objects.find((object) => object.id === target.id);

    expect(resetObject?.bearing).toBe(0);
    expect(resetObject?.visualTransform).toEqual({
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      roll: 0,
      yaw: 0
    });
  });

  it("returns same scene when reset target is already normalized", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const target = scene.objects[0];

    const nextScene = facade.resetObjectTransform(scene, target.id);

    expect(nextScene).toBe(scene);
  });

  it("translates movable objects by delta", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const movable = scene.objects.find((object) => object.kind === "placeables");
    expect(movable).toBeDefined();
    const other = scene.objects.find((object) => object.id !== movable?.id);
    expect(other).toBeDefined();

    const nextScene = facade.translateObjectsByIds(
      scene,
      [movable!.id],
      { x: 0.25, y: -0.4 }
    );

    const movedObject = nextScene.objects.find((object) => object.id === movable!.id);
    const untouchedObject = nextScene.objects.find((object) => object.id === other!.id);
    expect(movedObject?.x).toBeCloseTo((movable?.x ?? 0) + 0.25);
    expect(movedObject?.y).toBeCloseTo((movable?.y ?? 0) - 0.4);
    expect(untouchedObject).toEqual(other);
  });

  it("blocks translation when selection contains doors", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const door = scene.objects.find((object) => object.kind === "doors");
    const placeable = scene.objects.find((object) => object.kind === "placeables");
    expect(door).toBeDefined();
    expect(placeable).toBeDefined();

    const nextScene = facade.translateObjectsByIds(
      scene,
      [door!.id, placeable!.id],
      { x: 0.3, y: 0.1 }
    );

    expect(nextScene).toBe(scene);
  });

  it("clamps group translation at scene bounds while preserving relative offset", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const first = scene.objects.find((object) => object.id === "plc_barrel_01");
    const second = scene.objects.find((object) => object.id === "plc_table_02");
    expect(first).toBeDefined();
    expect(second).toBeDefined();

    const boundedScene = {
      ...scene,
      objects: scene.objects.map((object) => {
        if (object.id === first!.id) {
          return { ...object, x: 1.8, y: 1.9 };
        }
        if (object.id === second!.id) {
          return { ...object, x: 1.6, y: 0.4 };
        }
        return object;
      })
    };

    const nextScene = facade.translateObjectsByIds(
      boundedScene,
      [first!.id, second!.id],
      { x: 0.8, y: 0.6 }
    );

    const movedFirst = nextScene.objects.find((object) => object.id === first!.id);
    const movedSecond = nextScene.objects.find((object) => object.id === second!.id);
    expect(movedFirst).toBeDefined();
    expect(movedSecond).toBeDefined();

    const deltaXFirst = (movedFirst?.x ?? 0) - 1.8;
    const deltaXSecond = (movedSecond?.x ?? 0) - 1.6;
    const deltaYFirst = (movedFirst?.y ?? 0) - 1.9;
    const deltaYSecond = (movedSecond?.y ?? 0) - 0.4;

    expect(deltaXFirst).toBeCloseTo(deltaXSecond, 6);
    expect(deltaYFirst).toBeCloseTo(deltaYSecond, 6);
    expect(movedFirst?.x).toBeLessThan(scene.width);
    expect(movedFirst?.y).toBeLessThan(scene.height);
  });

  it("adjusts movable object height via visual transform offsetZ", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const movable = scene.objects.find((object) => object.kind === "placeables");
    expect(movable).toBeDefined();

    const nextScene = facade.adjustObjectsHeightByIds(scene, [movable!.id], 0.65);
    const changed = nextScene.objects.find((object) => object.id === movable!.id);

    expect(changed?.visualTransform.offsetZ).toBeCloseTo(
      (movable?.visualTransform.offsetZ ?? 0) + 0.65
    );
  });

  it("prevents lowering selected objects below surface while keeping shared delta", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const first = scene.objects.find((object) => object.id === "plc_barrel_01");
    const second = scene.objects.find((object) => object.id === "plc_table_02");
    expect(first).toBeDefined();
    expect(second).toBeDefined();

    const liftedScene = {
      ...scene,
      objects: scene.objects.map((object) => {
        if (object.id === first!.id) {
          return {
            ...object,
            visualTransform: {
              ...object.visualTransform,
              offsetZ: 0.2
            }
          };
        }
        if (object.id === second!.id) {
          return {
            ...object,
            visualTransform: {
              ...object.visualTransform,
              offsetZ: 1.0
            }
          };
        }
        return object;
      })
    };

    const nextScene = facade.adjustObjectsHeightByIds(
      liftedScene,
      [first!.id, second!.id],
      -0.7
    );
    const nextFirst = nextScene.objects.find((object) => object.id === first!.id);
    const nextSecond = nextScene.objects.find((object) => object.id === second!.id);
    expect(nextFirst).toBeDefined();
    expect(nextSecond).toBeDefined();

    expect(nextFirst?.visualTransform.offsetZ).toBeCloseTo(0);
    expect(nextSecond?.visualTransform.offsetZ).toBeCloseTo(0.8);
  });

  it("rotates movable object bearing around Y axis", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const movable = scene.objects.find((object) => object.kind === "creatures");
    expect(movable).toBeDefined();

    const nextScene = facade.rotateObjectsBearingByIds(scene, [movable!.id], 0.3);
    const changed = nextScene.objects.find((object) => object.id === movable!.id);

    expect(changed?.bearing).toBeCloseTo((movable?.bearing ?? 0) + 0.3);
  });

  it("blocks height and bearing changes when selection contains doors", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const door = scene.objects.find((object) => object.kind === "doors");
    const placeable = scene.objects.find((object) => object.kind === "placeables");
    expect(door).toBeDefined();
    expect(placeable).toBeDefined();

    const heightAdjusted = facade.adjustObjectsHeightByIds(scene, [door!.id, placeable!.id], 0.2);
    const bearingRotated = facade.rotateObjectsBearingByIds(scene, [door!.id, placeable!.id], 0.1);

    expect(heightAdjusted).toBe(scene);
    expect(bearingRotated).toBe(scene);
  });
});
