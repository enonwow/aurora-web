import { describe, expect, it } from "vitest";
import { createSceneCanvasFacade } from "../../../../../src/modules/scene/application/sceneCanvasFacade";
import { createSceneFacadeBundle } from "../../../../../src/modules/scene/application/sceneFacadeBundle";
import { createSceneViewportPort } from "../../../../../src/modules/scene/application/sceneViewportPort";
import type { AreaScene } from "../../../../../src/modules/scene/contracts";
import { createSeedAreaScene } from "../../../../../src/modules/scene/domain/sceneFactory";
import type { SceneDraftPort } from "../../../../../src/modules/scene/ports/sceneDraftPort";

function createMemoryDraftPort(initialScene: AreaScene | null = null): SceneDraftPort {
  const byUserId = new Map<string, AreaScene>();
  if (initialScene) {
    byUserId.set("u_builder_001", initialScene);
  }

  return {
    loadByUserId: (userId) => byUserId.get(userId) ?? null,
    saveByUserId: (userId, scene) => {
      byUserId.set(userId, scene);
    }
  };
}

describe("sceneCanvasFacade static placeable movement policy integration", () => {
  it("persists moved static placeable when movement is applied via high-level viewport port", () => {
    const initialScene = createSeedAreaScene();
    const staticPlaceable = initialScene.objects.find((object) => object.kind === "placeables");
    expect(staticPlaceable).toBeDefined();
    expect(staticPlaceable?.isStatic ?? true).toBe(true);

    const draftPort = createMemoryDraftPort(initialScene);
    const bundle = createSceneFacadeBundle({ draftPort, now: () => 1700000000000 });
    const viewportPort = createSceneViewportPort(bundle);
    const canvasFacade = createSceneCanvasFacade({ draftPort, now: () => 1700000000000 });

    const movedAttemptScene = viewportPort.translateObjectsByIds(
      initialScene,
      [staticPlaceable!.id],
      { x: 0.5, y: 0.25 }
    );
    const movedPlaceable = movedAttemptScene.objects.find((object) => object.id === staticPlaceable!.id);
    expect(movedAttemptScene).not.toBe(initialScene);
    expect(movedPlaceable?.x).toBeCloseTo((staticPlaceable?.x ?? 0) + 0.5);
    expect(movedPlaceable?.y).toBeCloseTo((staticPlaceable?.y ?? 0) + 0.25);

    canvasFacade.saveLocalDraft("u_builder_001", movedAttemptScene);
    const reloaded = canvasFacade.createInitialHistory("u_builder_001").present;
    const reloadedPlaceable = reloaded.objects.find((object) => object.id === staticPlaceable!.id);

    expect(reloadedPlaceable).toBeDefined();
    expect(reloadedPlaceable?.x).toBeCloseTo(movedPlaceable?.x ?? 0);
    expect(reloadedPlaceable?.y).toBeCloseTo(movedPlaceable?.y ?? 0);
  });

  it("persists moved mixed selection when static placeable is included in generic transforms", () => {
    const initialScene = createSeedAreaScene();
    const staticPlaceable = initialScene.objects.find((object) => object.kind === "placeables");
    const creature = initialScene.objects.find((object) => object.kind === "creatures");
    expect(staticPlaceable).toBeDefined();
    expect(staticPlaceable?.isStatic ?? true).toBe(true);
    expect(creature).toBeDefined();

    const draftPort = createMemoryDraftPort(initialScene);
    const bundle = createSceneFacadeBundle({ draftPort, now: () => 1700000000000 });
    const viewportPort = createSceneViewportPort(bundle);
    const canvasFacade = createSceneCanvasFacade({ draftPort, now: () => 1700000000000 });
    const objectIds = [staticPlaceable!.id, creature!.id];

    const translatedAttemptScene = viewportPort.translateObjectsByIds(initialScene, objectIds, {
      x: 0.5,
      y: 0.25
    });
    const raisedAttemptScene = viewportPort.adjustObjectsHeightByIds(initialScene, objectIds, 0.4);
    const rotatedAttemptScene = viewportPort.rotateObjectsBearingByIds(initialScene, objectIds, 0.2);
    const translatedPlaceable = translatedAttemptScene.objects.find(
      (object) => object.id === staticPlaceable!.id
    );
    const translatedCreature = translatedAttemptScene.objects.find((object) => object.id === creature!.id);
    const raisedPlaceable = raisedAttemptScene.objects.find((object) => object.id === staticPlaceable!.id);
    const raisedCreature = raisedAttemptScene.objects.find((object) => object.id === creature!.id);
    const rotatedPlaceable = rotatedAttemptScene.objects.find((object) => object.id === staticPlaceable!.id);
    const rotatedCreature = rotatedAttemptScene.objects.find((object) => object.id === creature!.id);
    expect(translatedAttemptScene).not.toBe(initialScene);
    expect(raisedAttemptScene).not.toBe(initialScene);
    expect(rotatedAttemptScene).not.toBe(initialScene);
    expect(translatedPlaceable?.x).toBeCloseTo((staticPlaceable?.x ?? 0) + 0.5);
    expect(translatedPlaceable?.y).toBeCloseTo((staticPlaceable?.y ?? 0) + 0.25);
    expect(translatedCreature?.x).toBeCloseTo((creature?.x ?? 0) + 0.5);
    expect(translatedCreature?.y).toBeCloseTo((creature?.y ?? 0) + 0.25);
    expect(raisedPlaceable?.z).toBeCloseTo((staticPlaceable?.z ?? 0) + 0.4);
    expect(raisedCreature?.z).toBeCloseTo((creature?.z ?? 0) + 0.4);
    expect(rotatedPlaceable?.bearing).toBeCloseTo((staticPlaceable?.bearing ?? 0) + 0.2);
    expect(rotatedCreature?.bearing).toBeCloseTo((creature?.bearing ?? 0) + 0.2);

    canvasFacade.saveLocalDraft("u_builder_001", rotatedAttemptScene);
    const reloaded = canvasFacade.createInitialHistory("u_builder_001").present;
    const reloadedPlaceable = reloaded.objects.find((object) => object.id === staticPlaceable!.id);
    const reloadedCreature = reloaded.objects.find((object) => object.id === creature!.id);

    expect(reloadedPlaceable).toBeDefined();
    expect(reloadedCreature).toBeDefined();
    expect(reloadedPlaceable?.x).toBeCloseTo(rotatedPlaceable?.x ?? 0);
    expect(reloadedPlaceable?.y).toBeCloseTo(rotatedPlaceable?.y ?? 0);
    expect(reloadedPlaceable?.z).toBeCloseTo(rotatedPlaceable?.z ?? 0);
    expect(reloadedPlaceable?.bearing).toBeCloseTo(rotatedPlaceable?.bearing ?? 0);
    expect(reloadedCreature?.x).toBeCloseTo(rotatedCreature?.x ?? 0);
    expect(reloadedCreature?.y).toBeCloseTo(rotatedCreature?.y ?? 0);
    expect(reloadedCreature?.z).toBeCloseTo(rotatedCreature?.z ?? 0);
    expect(reloadedCreature?.bearing).toBeCloseTo(rotatedCreature?.bearing ?? 0);
  });

  it("persists moved non-static placeable through canvas save/load after viewport-port move", () => {
    const initialScene = createSeedAreaScene();
    const sourcePlaceable = initialScene.objects.find((object) => object.kind === "placeables");
    expect(sourcePlaceable).toBeDefined();

    const draftPort = createMemoryDraftPort(initialScene);
    const bundle = createSceneFacadeBundle({ draftPort, now: () => 1700000000000 });
    const viewportPort = createSceneViewportPort(bundle);
    const canvasFacade = createSceneCanvasFacade({ draftPort, now: () => 1700000000000 });
    const objectId = sourcePlaceable!.id;

    const dynamicScene = viewportPort.setPlaceablePropertiesByIds(initialScene, [objectId], {
      name: sourcePlaceable!.name ?? sourcePlaceable!.tag,
      tag: sourcePlaceable!.tag,
      resRef: sourcePlaceable!.resRef,
      isStatic: false
    });
    const dynamicPlaceable = dynamicScene.objects.find((object) => object.id === objectId);
    expect(dynamicPlaceable?.isStatic).toBe(false);

    const movedScene = viewportPort.translateObjectsByIds(dynamicScene, [objectId], {
      x: 0.45,
      y: -0.2
    });
    const movedPlaceable = movedScene.objects.find((object) => object.id === objectId);
    expect(movedScene).not.toBe(dynamicScene);
    expect(movedPlaceable?.x).toBeCloseTo((dynamicPlaceable?.x ?? 0) + 0.45);
    expect(movedPlaceable?.y).toBeCloseTo((dynamicPlaceable?.y ?? 0) - 0.2);

    canvasFacade.saveLocalDraft("u_builder_001", movedScene);
    const reloaded = canvasFacade.createInitialHistory("u_builder_001").present;
    const reloadedPlaceable = reloaded.objects.find((object) => object.id === objectId);

    expect(reloadedPlaceable).toBeDefined();
    expect(reloadedPlaceable?.x).toBeCloseTo(movedPlaceable?.x ?? 0);
    expect(reloadedPlaceable?.y).toBeCloseTo(movedPlaceable?.y ?? 0);
    expect(reloadedPlaceable?.isStatic).toBe(false);
  });
});
