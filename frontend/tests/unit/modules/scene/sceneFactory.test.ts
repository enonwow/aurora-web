import { describe, expect, it } from "vitest";
import {
  createNewSceneObject,
  createSeedAreaScene,
  rescaleSceneObjectsToSize
} from "../../../../src/modules/scene/sceneFactory";

describe("sceneFactory", () => {
  it("creates deterministic 2x2 seed area with tiles and objects by default", () => {
    const scene = createSeedAreaScene();

    expect(scene.width).toBe(2);
    expect(scene.height).toBe(2);
    expect(scene.tiles).toHaveLength(2 * 2);
    expect(scene.objects.length).toBeGreaterThan(0);
    expect(scene.source).toBe("seed");
  });

  it("preserves legacy 18x18 object placement when requested explicitly", () => {
    const scene = createSeedAreaScene(18, 18);
    const barrel = scene.objects.find((object) => object.id === "plc_barrel_01");
    const eastDoor = scene.objects.find((object) => object.id === "dr_nw_02");

    expect(scene.width).toBe(18);
    expect(scene.height).toBe(18);
    expect(scene.tiles).toHaveLength(18 * 18);
    expect(barrel?.x).toBeCloseTo(3.2);
    expect(barrel?.y).toBeCloseTo(5.7);
    expect(eastDoor?.x).toBeCloseTo(17.2);
    expect(eastDoor?.y).toBeCloseTo(9.1);
  });

  it("rescales object coordinates proportionally between scene sizes", () => {
    const legacyScene = createSeedAreaScene(18, 18);
    const scaled = rescaleSceneObjectsToSize(legacyScene.objects, 18, 18, 2, 2);
    const barrel = scaled.find((object) => object.id === "plc_barrel_01");
    const eastDoor = scaled.find((object) => object.id === "dr_nw_02");

    expect(barrel?.x).toBeCloseTo((3.2 / 18) * 2, 5);
    expect(barrel?.y).toBeCloseTo((5.7 / 18) * 2, 5);
    expect(eastDoor?.x).toBeCloseTo((17.2 / 18) * 2, 5);
    expect(eastDoor?.y).toBeCloseTo((9.1 / 18) * 2, 5);
  });

  it("creates scene objects with expected defaults", () => {
    const object = createNewSceneObject("placeables", 4.5, 7.5, 21);

    expect(object.id).toBe("pla_021");
    expect(object.resRef).toBe("plc_a01");
    expect(object.visualTransform.offsetX).toBe(0);
    expect(object.x).toBe(4.5);
    expect(object.y).toBe(7.5);
  });
});
