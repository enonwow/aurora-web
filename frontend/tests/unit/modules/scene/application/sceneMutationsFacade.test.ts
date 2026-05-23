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
});
