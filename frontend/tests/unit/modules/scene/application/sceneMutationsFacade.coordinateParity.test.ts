import { describe, expect, it } from "vitest";
import { createSceneMutationsFacade } from "../../../../../src/modules/scene/application/sceneMutationsFacade";
import { createSeedAreaScene } from "../../../../../src/modules/scene/domain/sceneFactory";

function requireObjectId(scene: ReturnType<typeof createSeedAreaScene>, kind: string): string {
  const matched = scene.objects.find((object) => object.kind === kind);
  expect(matched).toBeDefined();
  return matched!.id;
}

describe("sceneMutationsFacade coordinate parity", () => {
  it("keeps absolute-location XY/Z units consistent for shared multi-select deltas", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const primaryId = requireObjectId(scene, "creatures");
    const secondaryId = requireObjectId(scene, "items");
    const primaryBefore = scene.objects.find((object) => object.id === primaryId)!;
    const secondaryBefore = scene.objects.find((object) => object.id === secondaryId)!;
    const input = { x: 1.2, y: 1.3, z: 0.4, bearing: 0.8 };

    const nextScene = facade.setObjectsAbsoluteLocationByIds(
      scene,
      [primaryId, secondaryId],
      input
    );
    const primaryAfter = nextScene.objects.find((object) => object.id === primaryId)!;
    const secondaryAfter = nextScene.objects.find((object) => object.id === secondaryId)!;
    const deltaX = input.x - primaryBefore.x;
    const deltaY = input.y - primaryBefore.y;
    const deltaZ = input.z - primaryBefore.z;
    const deltaBearing = input.bearing - primaryBefore.bearing;

    expect(primaryAfter.x).toBeCloseTo(input.x, 6);
    expect(primaryAfter.y).toBeCloseTo(input.y, 6);
    expect(primaryAfter.z).toBeCloseTo(input.z, 6);
    expect(primaryAfter.bearing).toBeCloseTo(input.bearing, 6);
    expect(secondaryAfter.x).toBeCloseTo(secondaryBefore.x + deltaX, 6);
    expect(secondaryAfter.y).toBeCloseTo(secondaryBefore.y + deltaY, 6);
    expect(secondaryAfter.z).toBeCloseTo(secondaryBefore.z + deltaZ, 6);
    expect(secondaryAfter.bearing).toBeCloseTo(secondaryBefore.bearing + deltaBearing, 6);
  });

  it("normalizes absolute-location bearing inputs with fixture cases", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const targetId = requireObjectId(scene, "creatures");
    const maxCoordinate = scene.width - 1e-4;
    const fullTurn = Math.PI * 2;

    const fixtures = [
      {
        input: { x: -5, y: 99, z: -2, bearing: -Math.PI / 2 },
        expected: { x: 0, y: maxCoordinate, z: -2, bearing: fullTurn - (Math.PI / 2) }
      },
      {
        input: { x: maxCoordinate, y: 0, z: 1.25, bearing: fullTurn },
        expected: { x: maxCoordinate, y: 0, z: 1.25, bearing: 0 }
      },
      {
        input: { x: 0.5, y: 0.5, z: 0.75, bearing: Math.PI * 5 },
        expected: { x: 0.5, y: 0.5, z: 0.75, bearing: Math.PI }
      }
    ];

    fixtures.forEach(({ input, expected }) => {
      const nextScene = facade.setObjectsAbsoluteLocationByIds(scene, [targetId], input);
      const changed = nextScene.objects.find((object) => object.id === targetId)!;
      expect(changed.x).toBeCloseTo(expected.x, 6);
      expect(changed.y).toBeCloseTo(expected.y, 6);
      expect(changed.z).toBeCloseTo(expected.z, 6);
      expect(changed.bearing).toBeCloseTo(expected.bearing, 6);
      expect(changed.bearing).toBeGreaterThanOrEqual(0);
      expect(changed.bearing).toBeLessThan(fullTurn);
    });
  });

  it("clamps lower XY edges while preserving Aurora's signed Z delta", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const firstId = "crt_devo_01";
    const secondId = "itm_chest_01";
    const stagedScene = {
      ...scene,
      objects: scene.objects.map((object) => {
        if (object.id === firstId) {
          return { ...object, x: 0.3, y: 0.2, z: 0.1 };
        }
        if (object.id === secondId) {
          return { ...object, x: 1.7, y: 0.6, z: 1.4 };
        }
        return object;
      })
    };

    const nextScene = facade.setObjectsAbsoluteLocationByIds(
      stagedScene,
      [firstId, secondId],
      { x: -5, y: -7, z: -2, bearing: -Math.PI * 2 }
    );
    const firstAfter = nextScene.objects.find((object) => object.id === firstId)!;
    const secondAfter = nextScene.objects.find((object) => object.id === secondId)!;
    const deltaXFirst = firstAfter.x - 0.3;
    const deltaXSecond = secondAfter.x - 1.7;
    const deltaYFirst = firstAfter.y - 0.2;
    const deltaYSecond = secondAfter.y - 0.6;
    const deltaZFirst = firstAfter.z - 0.1;
    const deltaZSecond = secondAfter.z - 1.4;

    expect(deltaXFirst).toBeCloseTo(deltaXSecond, 6);
    expect(deltaYFirst).toBeCloseTo(deltaYSecond, 6);
    expect(deltaZFirst).toBeCloseTo(deltaZSecond, 6);
    expect(firstAfter.x).toBeCloseTo(0, 6);
    expect(firstAfter.y).toBeCloseTo(0, 6);
    expect(firstAfter.z).toBeCloseTo(-2, 6);
    expect(firstAfter.bearing).toBeCloseTo(0, 6);
    expect(secondAfter.bearing).toBeGreaterThanOrEqual(0);
    expect(secondAfter.bearing).toBeLessThan(Math.PI * 2);
  });

  it("keeps full-turn rotate deltas as no-op for scene/object state", () => {
    const facade = createSceneMutationsFacade();
    const baseScene = createSeedAreaScene();
    const targetId = requireObjectId(baseScene, "creatures");
    const seeded = {
      ...baseScene,
      objects: baseScene.objects.map((object) =>
        object.id === targetId ? { ...object, bearing: 0.42 } : object
      )
    };

    const nextScene = facade.rotateObjectsBearingByIds(seeded, [targetId], Math.PI * 2);
    const targetAfter = nextScene.objects.find((object) => object.id === targetId)!;

    expect(targetAfter.bearing).toBeCloseTo(0.42, 6);
    expect(targetAfter.bearing).toBeGreaterThanOrEqual(0);
    expect(targetAfter.bearing).toBeLessThan(Math.PI * 2);
  });

  it("applies fixture-driven XY bounds and preserves signed Z deltas", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const firstId = "crt_devo_01";
    const secondId = "itm_chest_01";
    const stagedScene = {
      ...scene,
      objects: scene.objects.map((object) => {
        if (object.id === firstId) {
          return { ...object, x: 1.8, y: 1.9, z: 0.2 };
        }
        if (object.id === secondId) {
          return { ...object, x: 1.6, y: 0.4, z: 1.0 };
        }
        return object;
      })
    };
    const maxCoordinate = scene.width - 1e-4;

    const movedScene = facade.translateObjectsByIds(
      stagedScene,
      [firstId, secondId],
      { x: 0.8, y: 0.6 }
    );
    const movedFirst = movedScene.objects.find((object) => object.id === firstId)!;
    const movedSecond = movedScene.objects.find((object) => object.id === secondId)!;
    const deltaXFirst = movedFirst.x - 1.8;
    const deltaXSecond = movedSecond.x - 1.6;
    const deltaYFirst = movedFirst.y - 1.9;
    const deltaYSecond = movedSecond.y - 0.4;

    expect(deltaXFirst).toBeCloseTo(deltaXSecond, 6);
    expect(deltaYFirst).toBeCloseTo(deltaYSecond, 6);
    expect(movedFirst.x).toBeGreaterThanOrEqual(0);
    expect(movedFirst.x).toBeLessThanOrEqual(maxCoordinate);
    expect(movedFirst.y).toBeGreaterThanOrEqual(0);
    expect(movedFirst.y).toBeLessThanOrEqual(maxCoordinate);

    const zFixtures = [
      { deltaZ: -0.7, expectedFirstZ: -0.5, expectedSecondZ: 0.3 },
      { deltaZ: 0.3, expectedFirstZ: 0.5, expectedSecondZ: 1.3 }
    ];

    zFixtures.forEach(({ deltaZ, expectedFirstZ, expectedSecondZ }) => {
      const zScene = facade.adjustObjectsHeightByIds(
        stagedScene,
        [firstId, secondId],
        deltaZ
      );
      const first = zScene.objects.find((object) => object.id === firstId)!;
      const second = zScene.objects.find((object) => object.id === secondId)!;
      expect(first.z).toBeCloseTo(expectedFirstZ, 6);
      expect(second.z).toBeCloseTo(expectedSecondZ, 6);
    });
  });
});
