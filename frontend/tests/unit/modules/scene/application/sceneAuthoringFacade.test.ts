import { describe, expect, it } from "vitest";
import { createSceneAuthoringFacade } from "../../../../../src/modules/scene/application/sceneAuthoringFacade";

describe("sceneAuthoringFacade", () => {
  it("creates scene objects with deterministic ids and defaults", () => {
    const facade = createSceneAuthoringFacade();

    const created = facade.createObject("placeables", 1.25, 1.75, 42);

    expect(created.id).toBe("pla_042");
    expect(created.kind).toBe("placeables");
    expect(created.x).toBe(1.25);
    expect(created.y).toBe(1.75);
  });

  it("resolves copy anchor and translation through facade", () => {
    const facade = createSceneAuthoringFacade();
    const anchor = facade.resolveCopyAnchor({
      cursorAnchor: null,
      sourcePoints: [
        { x: 1, y: 1 },
        { x: 3, y: 5 }
      ],
      fallbackOffset: 0.5
    });
    const translation = anchor
      ? facade.computeCopyTranslation({
          sourcePoints: [
            { x: 1, y: 1 },
            { x: 3, y: 5 }
          ],
          anchor,
          snapGrid: true,
          snapGridStep: 0.5
        })
      : null;

    expect(anchor).toEqual({ x: 2.5, y: 3.5 });
    expect(translation).toEqual({ x: 0.5, y: 0.5 });
  });

  it("prefers explicit cursor anchor and returns null translation for empty source", () => {
    const facade = createSceneAuthoringFacade();
    const anchor = facade.resolveCopyAnchor({
      cursorAnchor: { x: 9.25, y: 4.75 },
      sourcePoints: [],
      fallbackOffset: 0.5
    });

    const translation = facade.computeCopyTranslation({
      sourcePoints: [],
      anchor: anchor ?? { x: 0, y: 0 },
      snapGrid: false,
      snapGridStep: 1
    });

    expect(anchor).toEqual({ x: 9.25, y: 4.75 });
    expect(translation).toBeNull();
  });

  it("returns seed objects snapshot for initial UI state", () => {
    const facade = createSceneAuthoringFacade();

    const objects = facade.createSeedObjectsSnapshot();

    expect(objects.length).toBeGreaterThan(0);
    expect(objects[0]).toHaveProperty("id");
    expect(objects[0]).toHaveProperty("kind");
  });

  it("computes legacy-relative scene scale in safe clamp bounds", () => {
    const facade = createSceneAuthoringFacade();

    expect(facade.getSceneScale(18, 18)).toBe(1);
    expect(facade.getSceneScale(2, 2)).toBeCloseTo(2 / 18, 6);
    expect(facade.getSceneScale(2, 30)).toBeCloseTo(2 / 18, 6);
    expect(facade.getSceneScale(30, 2)).toBeCloseTo(2 / 18, 6);
    expect(facade.getSceneScale(0.1, 0.1)).toBe(0.08);
    expect(facade.getSceneScale(250, 250)).toBe(1);
  });
});
