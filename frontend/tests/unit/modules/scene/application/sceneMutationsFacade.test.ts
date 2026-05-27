import { describe, expect, it } from "vitest";
import { createSceneMutationsFacade } from "../../../../../src/modules/scene/application/sceneMutationsFacade";
import { createNewSceneObject, createSeedAreaScene } from "../../../../../src/modules/scene/domain/sceneFactory";

function withDynamicPlaceables(scene: ReturnType<typeof createSeedAreaScene>) {
  return {
    ...scene,
    objects: scene.objects.map((object) =>
      object.kind === "placeables"
        ? {
            ...object,
            isStatic: false
          }
        : object
    )
  };
}

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
                scale: 1.4,
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
      scale: 1,
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

  it("updates placeable properties (name/tag/resref/static)", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const target = scene.objects.find((object) => object.kind === "placeables");
    expect(target).toBeDefined();

    const nextScene = facade.setPlaceablePropertiesByIds(scene, [target!.id], {
      name: "Wooden Table",
      tag: "PLC_WOOD_TABLE_01",
      resRef: "plc_table_wood_01",
      isStatic: false
    });

    const changed = nextScene.objects.find((object) => object.id === target!.id);
    expect(changed).toBeDefined();
    expect(changed?.name).toBe("Wooden Table");
    expect(changed?.tag).toBe("PLC_WOOD_TABLE_01");
    expect(changed?.resRef).toBe("plc_table_wood_01");
    expect(changed?.isStatic).toBe(false);
  });

  it("does not apply placeable properties to non-placeable kinds", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const creature = scene.objects.find((object) => object.kind === "creatures");
    expect(creature).toBeDefined();

    const nextScene = facade.setPlaceablePropertiesByIds(scene, [creature!.id], {
      name: "Nope",
      tag: "NOPE",
      resRef: "nope",
      isStatic: true
    });

    expect(nextScene).toBe(scene);
  });

  it("translates movable objects by delta", () => {
    const facade = createSceneMutationsFacade();
    const scene = withDynamicPlaceables(createSeedAreaScene());
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
    const scene = withDynamicPlaceables(createSeedAreaScene());
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

  it("adjusts movable object height via base Z position", () => {
    const facade = createSceneMutationsFacade();
    const scene = withDynamicPlaceables(createSeedAreaScene());
    const movable = scene.objects.find((object) => object.kind === "placeables");
    expect(movable).toBeDefined();

    const nextScene = facade.adjustObjectsHeightByIds(scene, [movable!.id], 0.65);
    const changed = nextScene.objects.find((object) => object.id === movable!.id);

    expect(changed?.z).toBeCloseTo((movable?.z ?? 0) + 0.65);
    expect(changed?.visualTransform.offsetZ).toBeCloseTo(movable?.visualTransform.offsetZ ?? 0);
  });

  it("prevents lowering selected objects below surface while keeping shared delta", () => {
    const facade = createSceneMutationsFacade();
    const scene = withDynamicPlaceables(createSeedAreaScene());
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
            z: 0.2
          };
        }
        if (object.id === second!.id) {
          return {
            ...object,
            z: 1
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

    expect(nextFirst?.z).toBeCloseTo(0);
    expect(nextSecond?.z).toBeCloseTo(0.8);
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

  it("applies generic transform flows for static placeables", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const staticPlaceable = scene.objects.find((object) => object.kind === "placeables");
    expect(staticPlaceable).toBeDefined();

    const translated = facade.translateObjectsByIds(scene, [staticPlaceable!.id], {
      x: 0.2,
      y: -0.1
    });
    const raised = facade.adjustObjectsHeightByIds(scene, [staticPlaceable!.id], 0.4);
    const rotated = facade.rotateObjectsBearingByIds(scene, [staticPlaceable!.id], 0.2);

    const translatedPlaceable = translated.objects.find((object) => object.id === staticPlaceable!.id);
    const raisedPlaceable = raised.objects.find((object) => object.id === staticPlaceable!.id);
    const rotatedPlaceable = rotated.objects.find((object) => object.id === staticPlaceable!.id);

    expect(translated).not.toBe(scene);
    expect(raised).not.toBe(scene);
    expect(rotated).not.toBe(scene);
    expect(translatedPlaceable?.x).toBeCloseTo((staticPlaceable?.x ?? 0) + 0.2);
    expect(translatedPlaceable?.y).toBeCloseTo((staticPlaceable?.y ?? 0) - 0.1);
    expect(raisedPlaceable?.z).toBeCloseTo((staticPlaceable?.z ?? 0) + 0.4);
    expect(rotatedPlaceable?.bearing).toBeCloseTo((staticPlaceable?.bearing ?? 0) + 0.2);
  });

  it("applies generic transform flows when selection mixes static placeable with movable object", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const staticPlaceable = scene.objects.find((object) => object.kind === "placeables");
    const creature = scene.objects.find((object) => object.kind === "creatures");
    expect(staticPlaceable).toBeDefined();
    expect(staticPlaceable?.isStatic ?? true).toBe(true);
    expect(creature).toBeDefined();

    const translated = facade.translateObjectsByIds(
      scene,
      [staticPlaceable!.id, creature!.id],
      { x: 0.2, y: -0.1 }
    );
    const raised = facade.adjustObjectsHeightByIds(
      scene,
      [staticPlaceable!.id, creature!.id],
      0.4
    );
    const rotated = facade.rotateObjectsBearingByIds(
      scene,
      [staticPlaceable!.id, creature!.id],
      0.2
    );

    const translatedPlaceable = translated.objects.find((object) => object.id === staticPlaceable!.id);
    const translatedCreature = translated.objects.find((object) => object.id === creature!.id);
    const raisedPlaceable = raised.objects.find((object) => object.id === staticPlaceable!.id);
    const raisedCreature = raised.objects.find((object) => object.id === creature!.id);
    const rotatedPlaceable = rotated.objects.find((object) => object.id === staticPlaceable!.id);
    const rotatedCreature = rotated.objects.find((object) => object.id === creature!.id);

    expect(translated).not.toBe(scene);
    expect(raised).not.toBe(scene);
    expect(rotated).not.toBe(scene);
    expect(translatedPlaceable?.x).toBeCloseTo((staticPlaceable?.x ?? 0) + 0.2);
    expect(translatedPlaceable?.y).toBeCloseTo((staticPlaceable?.y ?? 0) - 0.1);
    expect(translatedCreature?.x).toBeCloseTo((creature?.x ?? 0) + 0.2);
    expect(translatedCreature?.y).toBeCloseTo((creature?.y ?? 0) - 0.1);
    expect(raisedPlaceable?.z).toBeCloseTo((staticPlaceable?.z ?? 0) + 0.4);
    expect(raisedCreature?.z).toBeCloseTo((creature?.z ?? 0) + 0.4);
    expect(rotatedPlaceable?.bearing).toBeCloseTo((staticPlaceable?.bearing ?? 0) + 0.2);
    expect(rotatedCreature?.bearing).toBeCloseTo((creature?.bearing ?? 0) + 0.2);
  });

  it("rotates non-static placeable bearing around Y axis", () => {
    const facade = createSceneMutationsFacade();
    const scene = withDynamicPlaceables(createSeedAreaScene());
    const dynamicPlaceable = scene.objects.find((object) => object.kind === "placeables");
    expect(dynamicPlaceable).toBeDefined();

    const nextScene = facade.rotateObjectsBearingByIds(scene, [dynamicPlaceable!.id], 0.25);
    const changed = nextScene.objects.find((object) => object.id === dynamicPlaceable!.id);

    expect(changed).toBeDefined();
    expect(changed?.bearing).toBeCloseTo((dynamicPlaceable?.bearing ?? 0) + 0.25);
  });

  it("normalizes bearing after rotation and keeps it within 0..2pi", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const movable = scene.objects.find((object) => object.kind === "creatures");
    expect(movable).toBeDefined();

    const nearFullTurn = (Math.PI * 2) - 0.05;
    const seeded = {
      ...scene,
      objects: scene.objects.map((object) =>
        object.id === movable!.id
          ? {
              ...object,
              bearing: nearFullTurn
            }
          : object
      )
    };

    const nextScene = facade.rotateObjectsBearingByIds(seeded, [movable!.id], 0.1);
    const changed = nextScene.objects.find((object) => object.id === movable!.id);
    expect(changed).toBeDefined();
    expect(changed!.bearing).toBeGreaterThanOrEqual(0);
    expect(changed!.bearing).toBeLessThan(Math.PI * 2);
    expect(changed!.bearing).toBeCloseTo(0.05, 6);
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

  it("blocks visual-transform changes when selection contains doors", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const door = scene.objects.find((object) => object.kind === "doors");
    const placeable = scene.objects.find((object) => object.kind === "placeables");
    expect(door).toBeDefined();
    expect(placeable).toBeDefined();

    const transformed = facade.setObjectsVisualTransformByIds(
      scene,
      [door!.id, placeable!.id],
      {
        scale: 1.1,
        offsetX: 0.2,
        offsetY: 0.1,
        offsetZ: 0.3,
        pitch: 0.05,
        yaw: -0.04,
        roll: 0.02
      }
    );

    expect(transformed).toBe(scene);
  });

  it("applies shared delta for absolute location and bearing on movable multi-selection", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const first = scene.objects.find((object) => object.kind === "placeables");
    const second = scene.objects.find((object) => object.kind === "items");
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    const targetX = 0.7;
    const targetY = 1.1;
    const targetZ = 0.6;
    const targetBearing = 1.2;
    const deltaX = targetX - first!.x;
    const deltaY = targetY - first!.y;
    const deltaZ = targetZ - first!.z;
    const deltaBearing = targetBearing - first!.bearing;

    const nextScene = facade.setObjectsAbsoluteLocationByIds(
      scene,
      [first!.id, second!.id],
      { x: targetX, y: targetY, z: targetZ, bearing: targetBearing }
    );
    const changedFirst = nextScene.objects.find((object) => object.id === first!.id);
    const changedSecond = nextScene.objects.find((object) => object.id === second!.id);
    expect(changedFirst).toBeDefined();
    expect(changedSecond).toBeDefined();
    expect(changedFirst?.x).toBeCloseTo(targetX);
    expect(changedFirst?.y).toBeCloseTo(targetY);
    expect(changedFirst?.bearing).toBeCloseTo(targetBearing);
    expect(changedFirst?.z).toBeCloseTo(targetZ);
    expect(changedSecond?.x).toBeCloseTo((second?.x ?? 0) + deltaX);
    expect(changedSecond?.y).toBeCloseTo((second?.y ?? 0) + deltaY);
    expect(changedSecond?.bearing).toBeCloseTo((second?.bearing ?? 0) + deltaBearing);
    expect(changedSecond?.z).toBeCloseTo((second?.z ?? 0) + deltaZ);
  });

  it("returns same scene reference for no-op absolute-location update", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const target = scene.objects.find((object) => object.kind === "placeables");
    expect(target).toBeDefined();

    const nextScene = facade.setObjectsAbsoluteLocationByIds(scene, [target!.id], {
      x: target!.x,
      y: target!.y,
      z: target!.z,
      bearing: target!.bearing
    });

    expect(nextScene).toBe(scene);
  });

  it("uses deterministic primary target based on objectIds order", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const first = scene.objects.find((object) => object.id === "plc_barrel_01");
    const second = scene.objects.find((object) => object.id === "itm_chest_01");
    expect(first).toBeDefined();
    expect(second).toBeDefined();

    const firstOrdered = facade.setObjectsAbsoluteLocationByIds(
      scene,
      [first!.id, second!.id],
      { x: 1.2, y: 1.3, z: 0.4, bearing: 0.8 }
    );
    const secondOrdered = facade.setObjectsAbsoluteLocationByIds(
      scene,
      [second!.id, first!.id],
      { x: 1.2, y: 1.3, z: 0.4, bearing: 0.8 }
    );

    const firstAsPrimary = firstOrdered.objects.find((object) => object.id === first!.id);
    const secondAsPrimary = secondOrdered.objects.find((object) => object.id === second!.id);
    expect(firstAsPrimary).toBeDefined();
    expect(secondAsPrimary).toBeDefined();
    expect(firstAsPrimary?.x).toBeCloseTo(1.2);
    expect(firstAsPrimary?.y).toBeCloseTo(1.3);
    expect(firstAsPrimary?.z).toBeCloseTo(0.4);
    expect(firstAsPrimary?.bearing).toBeCloseTo(0.8);
    expect(secondAsPrimary?.x).toBeCloseTo(1.2);
    expect(secondAsPrimary?.y).toBeCloseTo(1.3);
    expect(secondAsPrimary?.z).toBeCloseTo(0.4);
    expect(secondAsPrimary?.bearing).toBeCloseTo(0.8);
  });

  it("clamps shared absolute-location delta on X/Y/Z bounds for multi-select edge positions", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const first = scene.objects.find((object) => object.id === "plc_barrel_01");
    const second = scene.objects.find((object) => object.id === "plc_table_02");
    expect(first).toBeDefined();
    expect(second).toBeDefined();

    const stagedScene = {
      ...scene,
      objects: scene.objects.map((object) => {
        if (object.id === first!.id) {
          return {
            ...object,
            x: 0.1,
            y: 1.9,
            z: 0.2
          };
        }
        if (object.id === second!.id) {
          return {
            ...object,
            x: 1.5,
            y: 0.4,
            z: 1.3
          };
        }
        return object;
      })
    };

    const nextScene = facade.setObjectsAbsoluteLocationByIds(
      stagedScene,
      [first!.id, second!.id],
      { x: -5, y: 7, z: -3, bearing: 0 }
    );
    const nextFirst = nextScene.objects.find((object) => object.id === first!.id);
    const nextSecond = nextScene.objects.find((object) => object.id === second!.id);
    expect(nextFirst).toBeDefined();
    expect(nextSecond).toBeDefined();

    const deltaXFirst = (nextFirst?.x ?? 0) - 0.1;
    const deltaXSecond = (nextSecond?.x ?? 0) - 1.5;
    const deltaYFirst = (nextFirst?.y ?? 0) - 1.9;
    const deltaYSecond = (nextSecond?.y ?? 0) - 0.4;
    const deltaZFirst = (nextFirst?.z ?? 0) - 0.2;
    const deltaZSecond = (nextSecond?.z ?? 0) - 1.3;

    expect(deltaXFirst).toBeCloseTo(deltaXSecond, 6);
    expect(deltaYFirst).toBeCloseTo(deltaYSecond, 6);
    expect(deltaZFirst).toBeCloseTo(deltaZSecond, 6);
    expect(nextFirst?.x).toBeCloseTo(0);
    expect(nextFirst?.y).toBeLessThan(scene.height);
    expect(nextFirst?.y).toBeGreaterThan(scene.height - 0.2);
    expect(nextFirst?.z).toBeCloseTo(0);
    expect(nextSecond?.z).toBeCloseTo(1.1);
  });

  it("clamps absolute-location multi-selection movement to shared scene bounds delta", () => {
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

    const nextScene = facade.setObjectsAbsoluteLocationByIds(
      boundedScene,
      [first!.id, second!.id],
      { x: 2.5, y: 2.6, z: 0, bearing: 0 }
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

  it("blocks absolute-location changes when selection contains doors", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const door = scene.objects.find((object) => object.kind === "doors");
    const placeable = scene.objects.find((object) => object.kind === "placeables");
    expect(door).toBeDefined();
    expect(placeable).toBeDefined();

    const nextScene = facade.setObjectsAbsoluteLocationByIds(scene, [door!.id, placeable!.id], {
      x: 1,
      y: 1,
      z: 0.2,
      bearing: 0.4
    });

    expect(nextScene).toBe(scene);
  });

  it("clamps absolute-location Z updates to shared floor delta for multi-selection", () => {
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
            z: 0.2
          };
        }
        if (object.id === second!.id) {
          return {
            ...object,
            z: 1
          };
        }
        return object;
      })
    };

    const nextScene = facade.setObjectsAbsoluteLocationByIds(
      liftedScene,
      [first!.id, second!.id],
      { x: 1.8, y: 1.9, z: -0.5, bearing: 0 }
    );
    const nextFirst = nextScene.objects.find((object) => object.id === first!.id);
    const nextSecond = nextScene.objects.find((object) => object.id === second!.id);
    expect(nextFirst).toBeDefined();
    expect(nextSecond).toBeDefined();
    expect(nextFirst?.z).toBeCloseTo(0);
    expect(nextSecond?.z).toBeCloseTo(0.8);
  });

  it("normalizes absolute-location bearing input to 0..2pi", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const first = scene.objects.find((object) => object.kind === "placeables");
    expect(first).toBeDefined();

    const nextScene = facade.setObjectsAbsoluteLocationByIds(scene, [first!.id], {
      x: 1,
      y: 1,
      z: 0,
      bearing: -0.5
    });
    const changed = nextScene.objects.find((object) => object.id === first!.id);
    expect(changed).toBeDefined();
    expect(changed!.bearing).toBeGreaterThanOrEqual(0);
    expect(changed!.bearing).toBeLessThan(Math.PI * 2);
    expect(changed!.bearing).toBeCloseTo((Math.PI * 2) - 0.5, 6);
  });

  it("applies absolute-location deltas for sound selection and preserves sound positioning payload", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const sound = scene.objects.find((object) => object.id === "snd_amb_01");
    const creature = scene.objects.find((object) => object.id === "crt_devo_01");
    expect(sound).toBeDefined();
    expect(creature).toBeDefined();
    const targetX = 1.1;
    const targetY = 0.8;
    const targetZ = 0.6;
    const targetBearing = 1.4;

    const nextScene = facade.setObjectsAbsoluteLocationByIds(
      scene,
      [sound!.id, creature!.id],
      { x: targetX, y: targetY, z: targetZ, bearing: targetBearing }
    );
    const nextSound = nextScene.objects.find((object) => object.id === sound!.id);
    const nextCreature = nextScene.objects.find((object) => object.id === creature!.id);
    expect(nextSound).toBeDefined();
    expect(nextCreature).toBeDefined();

    const deltaX = targetX - sound!.x;
    const deltaBearing = targetBearing - sound!.bearing;
    expect(nextSound?.x).toBeCloseTo(targetX, 6);
    expect(nextSound?.y).toBeGreaterThanOrEqual(0);
    expect(nextSound?.z).toBeGreaterThanOrEqual(0);
    expect(nextSound?.bearing).toBeCloseTo(targetBearing, 6);
    expect(nextCreature?.x).toBeCloseTo(creature!.x + deltaX, 6);
    const appliedDeltaYForSound = (nextSound?.y ?? 0) - sound!.y;
    const appliedDeltaYForCreature = (nextCreature?.y ?? 0) - creature!.y;
    const appliedDeltaZForSound = (nextSound?.z ?? 0) - sound!.z;
    const appliedDeltaZForCreature = (nextCreature?.z ?? 0) - creature!.z;
    expect(appliedDeltaYForSound).toBeCloseTo(appliedDeltaYForCreature, 6);
    expect(appliedDeltaZForSound).toBeCloseTo(appliedDeltaZForCreature, 6);
    expect(nextCreature?.bearing).toBeCloseTo(creature!.bearing + deltaBearing, 6);
    expect(nextSound?.soundPositioning).toEqual(sound?.soundPositioning);
  });

  it("sets visual transform values and clamps scale/height floor", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const target = scene.objects.find((object) => object.kind === "creatures");
    expect(target).toBeDefined();

    const nextScene = facade.setObjectsVisualTransformByIds(
      scene,
      [target!.id],
      {
        scale: -2,
        offsetX: 0.35,
        offsetY: -0.5,
        offsetZ: -0.8,
        pitch: 0.3,
        yaw: -0.4,
        roll: 0.2
      }
    );
    const changed = nextScene.objects.find((object) => object.id === target!.id);
    expect(changed).toBeDefined();
    expect(changed?.visualTransform.scale).toBeCloseTo(0.01);
    expect(changed?.visualTransform.offsetX).toBeCloseTo(0.35);
    expect(changed?.visualTransform.offsetY).toBeCloseTo(-0.5);
    expect(changed?.visualTransform.offsetZ).toBeCloseTo(0);
    expect(changed?.visualTransform.pitch).toBeCloseTo(0.3);
    expect(changed?.visualTransform.yaw).toBeCloseTo(-0.4);
    expect(changed?.visualTransform.roll).toBeCloseTo(0.2);
  });

  it("returns same scene reference for no-op visual-transform update", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const target = scene.objects.find((object) => object.kind === "creatures");
    expect(target).toBeDefined();

    const nextScene = facade.setObjectsVisualTransformByIds(scene, [target!.id], {
      scale: target!.visualTransform.scale,
      offsetX: target!.visualTransform.offsetX,
      offsetY: target!.visualTransform.offsetY,
      offsetZ: target!.visualTransform.offsetZ,
      pitch: target!.visualTransform.pitch,
      yaw: target!.visualTransform.yaw,
      roll: target!.visualTransform.roll
    });

    expect(nextScene).toBe(scene);
  });

  it("stores visual-transform updates for static placeables", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const target = scene.objects.find((object) => object.kind === "placeables");
    expect(target).toBeDefined();
    expect(target?.isStatic ?? true).toBe(true);

    const nextScene = facade.setObjectsVisualTransformByIds(scene, [target!.id], {
      scale: 1.4,
      offsetX: 0.5,
      offsetY: -0.2,
      offsetZ: 0.7,
      pitch: 0.1,
      yaw: 0.2,
      roll: 0.3
    });

    const changed = nextScene.objects.find((object) => object.id === target!.id);
    expect(changed).toBeDefined();
    expect(changed).not.toBe(target);
    expect(changed?.visualTransform.scale).toBeCloseTo(1.4);
    expect(changed?.visualTransform.offsetX).toBeCloseTo(0.5);
    expect(changed?.visualTransform.offsetY).toBeCloseTo(-0.2);
    expect(changed?.visualTransform.offsetZ).toBeCloseTo(0.7);
    expect(changed?.visualTransform.pitch).toBeCloseTo(0.1);
    expect(changed?.visualTransform.yaw).toBeCloseTo(0.2);
    expect(changed?.visualTransform.roll).toBeCloseTo(0.3);
  });

  it("applies visual-transform updates for non-static placeables", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const target = scene.objects.find((object) => object.kind === "placeables");
    expect(target).toBeDefined();

    const dynamicPlaceableScene = {
      ...scene,
      objects: scene.objects.map((object) =>
        object.id === target!.id
          ? {
              ...object,
              isStatic: false
            }
          : object
      )
    };

    const nextScene = facade.setObjectsVisualTransformByIds(
      dynamicPlaceableScene,
      [target!.id],
      {
        scale: 1.3,
        offsetX: 0.25,
        offsetY: -0.15,
        offsetZ: 0.45,
        pitch: 0.05,
        yaw: 0.1,
        roll: -0.07
      }
    );
    const changed = nextScene.objects.find((object) => object.id === target!.id);
    expect(changed).toBeDefined();
    expect(changed?.visualTransform.scale).toBeCloseTo(1.3);
    expect(changed?.visualTransform.offsetX).toBeCloseTo(0.25);
    expect(changed?.visualTransform.offsetY).toBeCloseTo(-0.15);
    expect(changed?.visualTransform.offsetZ).toBeCloseTo(0.45);
    expect(changed?.visualTransform.pitch).toBeCloseTo(0.05);
    expect(changed?.visualTransform.yaw).toBeCloseTo(0.1);
    expect(changed?.visualTransform.roll).toBeCloseTo(-0.07);
  });

  it("restores object placement from snapshots", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const first = scene.objects.find((object) => object.id === "plc_barrel_01");
    const second = scene.objects.find((object) => object.id === "itm_chest_01");
    expect(first).toBeDefined();
    expect(second).toBeDefined();

    const mutated = facade.setObjectsAbsoluteLocationByIds(
      scene,
      [first!.id, second!.id],
      { x: 0.9, y: 1.2, z: 0.4, bearing: 0.35 }
    );
    const restored = facade.restoreObjectsPlacementBySnapshots(mutated, [first!, second!]);
    const restoredFirst = restored.objects.find((object) => object.id === first!.id);
    const restoredSecond = restored.objects.find((object) => object.id === second!.id);

    expect(restoredFirst?.x).toBeCloseTo(first!.x);
    expect(restoredFirst?.y).toBeCloseTo(first!.y);
    expect(restoredFirst?.bearing).toBeCloseTo(first!.bearing);
    expect(restoredFirst?.z).toBeCloseTo(first!.z);
    expect(restoredSecond?.x).toBeCloseTo(second!.x);
    expect(restoredSecond?.y).toBeCloseTo(second!.y);
    expect(restoredSecond?.bearing).toBeCloseTo(second!.bearing);
    expect(restoredSecond?.z).toBeCloseTo(second!.z);
  });

  it("restores sound placement from snapshot without touching sound metadata", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const sound = scene.objects.find((object) => object.id === "snd_amb_01");
    expect(sound).toBeDefined();

    const moved = facade.setObjectsAbsoluteLocationByIds(scene, [sound!.id], {
      x: 1.4,
      y: 0.4,
      z: 0.5,
      bearing: 1.1
    });
    const restored = facade.restoreObjectsPlacementBySnapshots(moved, [sound!]);
    const restoredSound = restored.objects.find((object) => object.id === sound!.id);

    expect(restoredSound?.x).toBeCloseTo(sound!.x, 6);
    expect(restoredSound?.y).toBeCloseTo(sound!.y, 6);
    expect(restoredSound?.z).toBeCloseTo(sound!.z, 6);
    expect(restoredSound?.bearing).toBeCloseTo(sound!.bearing, 6);
    expect(restoredSound?.soundPositioning).toEqual(sound?.soundPositioning);
  });
});
