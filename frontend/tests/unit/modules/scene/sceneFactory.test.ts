import { describe, expect, it } from "vitest";
import { createNewSceneObject, createSeedAreaScene } from "../../../../src/modules/scene/sceneFactory";

describe("sceneFactory", () => {
  it("creates deterministic seed area with tiles and objects", () => {
    const scene = createSeedAreaScene();

    expect(scene.width).toBe(18);
    expect(scene.height).toBe(18);
    expect(scene.tiles).toHaveLength(18 * 18);
    expect(scene.objects.length).toBeGreaterThan(0);
    expect(scene.source).toBe("seed");
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
