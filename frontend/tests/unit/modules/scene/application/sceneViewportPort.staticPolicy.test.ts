import { describe, expect, it } from "vitest";
import { createSceneFacadeBundle } from "../../../../../src/modules/scene/application/sceneFacadeBundle";
import { createSceneViewportPort } from "../../../../../src/modules/scene/application/sceneViewportPort";
import type { AreaScene } from "../../../../../src/modules/scene/contracts";
import { createSeedAreaScene } from "../../../../../src/modules/scene/domain/sceneFactory";
import type { SceneDraftPort } from "../../../../../src/modules/scene/ports/sceneDraftPort";

function createMemoryDraftPort(initialScene: AreaScene | null = null): SceneDraftPort {
  let stored = initialScene;
  return {
    loadByUserId: () => stored,
    saveByUserId: (_userId, scene) => {
      stored = scene;
    }
  };
}

describe("sceneViewportPort static placeable movement policy", () => {
  it("blocks generic movement APIs for static placeables through viewport port", () => {
    const seed = createSeedAreaScene();
    const staticPlaceable = seed.objects.find((object) => object.kind === "placeables");
    expect(staticPlaceable).toBeDefined();
    expect(staticPlaceable?.isStatic ?? true).toBe(true);

    const bundle = createSceneFacadeBundle({
      draftPort: createMemoryDraftPort(seed)
    });
    const port = createSceneViewportPort(bundle);
    const objectIds = [staticPlaceable!.id];

    const translated = port.translateObjectsByIds(seed, objectIds, { x: 0.35, y: -0.2 });
    const heightAdjusted = port.adjustObjectsHeightByIds(seed, objectIds, 0.6);
    const bearingRotated = port.rotateObjectsBearingByIds(seed, objectIds, 0.4);

    expect(translated).toBe(seed);
    expect(heightAdjusted).toBe(seed);
    expect(bearingRotated).toBe(seed);
  });

  it("blocks generic movement APIs for mixed static+movable selection through viewport port", () => {
    const seed = createSeedAreaScene();
    const staticPlaceable = seed.objects.find((object) => object.kind === "placeables");
    const creature = seed.objects.find((object) => object.kind === "creatures");
    expect(staticPlaceable).toBeDefined();
    expect(staticPlaceable?.isStatic ?? true).toBe(true);
    expect(creature).toBeDefined();

    const bundle = createSceneFacadeBundle({
      draftPort: createMemoryDraftPort(seed)
    });
    const port = createSceneViewportPort(bundle);
    const objectIds = [staticPlaceable!.id, creature!.id];

    const translated = port.translateObjectsByIds(seed, objectIds, { x: 0.35, y: -0.2 });
    const heightAdjusted = port.adjustObjectsHeightByIds(seed, objectIds, 0.6);
    const bearingRotated = port.rotateObjectsBearingByIds(seed, objectIds, 0.4);

    expect(translated).toBe(seed);
    expect(heightAdjusted).toBe(seed);
    expect(bearingRotated).toBe(seed);
  });

  it("still allows generic movement APIs for non-static placeables through viewport port", () => {
    const seed = createSeedAreaScene();
    const staticPlaceable = seed.objects.find((object) => object.kind === "placeables");
    expect(staticPlaceable).toBeDefined();

    const bundle = createSceneFacadeBundle({
      draftPort: createMemoryDraftPort(seed)
    });
    const port = createSceneViewportPort(bundle);
    const objectIds = [staticPlaceable!.id];

    const dynamicScene = port.setPlaceablePropertiesByIds(seed, objectIds, {
      name: staticPlaceable!.name ?? staticPlaceable!.tag,
      tag: staticPlaceable!.tag,
      resRef: staticPlaceable!.resRef,
      isStatic: false
    });
    const dynamicPlaceable = dynamicScene.objects.find((object) => object.id === staticPlaceable!.id);
    expect(dynamicPlaceable?.isStatic).toBe(false);

    const translated = port.translateObjectsByIds(dynamicScene, objectIds, { x: 0.4, y: -0.15 });
    const translatedObject = translated.objects.find((object) => object.id === staticPlaceable!.id);
    expect(translated).not.toBe(dynamicScene);
    expect(translatedObject?.x).toBeCloseTo((dynamicPlaceable?.x ?? 0) + 0.4);
    expect(translatedObject?.y).toBeCloseTo((dynamicPlaceable?.y ?? 0) - 0.15);

    const heightAdjusted = port.adjustObjectsHeightByIds(dynamicScene, objectIds, 0.5);
    const heightAdjustedObject = heightAdjusted.objects.find(
      (object) => object.id === staticPlaceable!.id
    );
    expect(heightAdjusted).not.toBe(dynamicScene);
    expect(heightAdjustedObject?.z).toBeCloseTo((dynamicPlaceable?.z ?? 0) + 0.5);

    const bearingRotated = port.rotateObjectsBearingByIds(dynamicScene, objectIds, 0.25);
    const bearingRotatedObject = bearingRotated.objects.find(
      (object) => object.id === staticPlaceable!.id
    );
    expect(bearingRotated).not.toBe(dynamicScene);
    expect(bearingRotatedObject?.bearing).toBeCloseTo((dynamicPlaceable?.bearing ?? 0) + 0.25);
  });
});
