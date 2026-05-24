import { describe, expect, it } from "vitest";
import {
  createNewSceneObject,
  createSeedAreaScene,
  rescaleSceneObjectsToSize
} from "../../../../src/modules/scene/domain/sceneFactory";

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

  it("preserves existing sound/placeable metadata values while rescaling", () => {
    const scene = createSeedAreaScene(18, 18);
    const customized = scene.objects.map((object) => {
      if (object.id === "plc_barrel_01") {
        return {
          ...object,
          placeableProperties: {
            plot: true,
            useable: true,
            hasInventory: true
          }
        };
      }
      if (object.id === "snd_amb_01") {
        return {
          ...object,
          soundPositioning: {
            mode: "random" as const,
            elevation: 1.25,
            maxVolumeDistance: 12,
            cutoffDistance: 21,
            randomRangeWestEast: 3,
            randomRangeNorthSouth: 4
          }
        };
      }
      return object;
    });

    const scaled = rescaleSceneObjectsToSize(customized, 18, 18, 2, 2);
    const placeable = scaled.find((object) => object.id === "plc_barrel_01");
    const sound = scaled.find((object) => object.id === "snd_amb_01");

    expect(placeable?.placeableProperties).toEqual({
      plot: true,
      useable: true,
      hasInventory: true
    });
    expect(sound?.soundPositioning).toEqual({
      mode: "random",
      elevation: 1.25,
      maxVolumeDistance: 12,
      cutoffDistance: 21,
      randomRangeWestEast: 3,
      randomRangeNorthSouth: 4
    });
  });

  it("normalizes invalid metadata payloads to safe clamped values while rescaling", () => {
    const scene = createSeedAreaScene();
    const corrupted = scene.objects.map((object) => {
      if (object.id === "plc_barrel_01") {
        return {
          ...object,
          placeableProperties: {
            plot: "yes",
            useable: null,
            hasInventory: 1
          } as unknown as typeof object.placeableProperties
        };
      }
      if (object.id === "snd_amb_01") {
        return {
          ...object,
          visualTransform: {
            ...object.visualTransform,
            offsetZ: -5
          },
          soundPositioning: {
            mode: "broken",
            elevation: -3,
            maxVolumeDistance: Number.POSITIVE_INFINITY,
            cutoffDistance: -1,
            randomRangeWestEast: 7,
            randomRangeNorthSouth: 8
          } as unknown as NonNullable<typeof object.soundPositioning>
        };
      }
      return object;
    });

    const normalized = rescaleSceneObjectsToSize(corrupted, 2, 2, 2, 2);
    const placeable = normalized.find((object) => object.id === "plc_barrel_01");
    const sound = normalized.find((object) => object.id === "snd_amb_01");

    expect(placeable?.placeableProperties).toEqual({
      plot: false,
      useable: false,
      hasInventory: false
    });
    expect(sound?.soundPositioning).toEqual({
      mode: "specific",
      elevation: 0,
      maxVolumeDistance: 8,
      cutoffDistance: 8,
      randomRangeWestEast: 0,
      randomRangeNorthSouth: 0
    });
  });

  it("clamps sound ranges and enforces cutoff >= max volume for non-random modes", () => {
    const scene = createSeedAreaScene();
    const mutated = scene.objects.map((object) => {
      if (object.id !== "snd_amb_01") {
        return object;
      }
      return {
        ...object,
        soundPositioning: {
          mode: "everywhere",
          elevation: 2,
          maxVolumeDistance: 14,
          cutoffDistance: 9,
          randomRangeWestEast: 3,
          randomRangeNorthSouth: 4
        }
      };
    });

    const normalized = rescaleSceneObjectsToSize(mutated, 2, 2, 2, 2);
    const sound = normalized.find((object) => object.id === "snd_amb_01");

    expect(sound?.soundPositioning).toEqual({
      mode: "everywhere",
      elevation: 2,
      maxVolumeDistance: 14,
      cutoffDistance: 14,
      randomRangeWestEast: 0,
      randomRangeNorthSouth: 0
    });
  });

  it("creates scene objects with expected defaults", () => {
    const object = createNewSceneObject("placeables", 4.5, 7.5, 21);

    expect(object.id).toBe("pla_021");
    expect(object.resRef).toBe("plc_a01");
    expect(object.visualTransform.offsetX).toBe(0);
    expect(object.placeableProperties).toEqual({
      plot: false,
      useable: false,
      hasInventory: false
    });
    expect(object.soundPositioning).toBeUndefined();
    expect(object.x).toBe(4.5);
    expect(object.y).toBe(7.5);
  });

  it("assigns sound positioning baseline to sound objects", () => {
    const sound = createNewSceneObject("sounds", 1.2, 0.8, 3);

    expect(sound.id).toBe("sou_003");
    expect(sound.soundPositioning).toEqual({
      mode: "specific",
      elevation: 0,
      maxVolumeDistance: 8,
      cutoffDistance: 16,
      randomRangeWestEast: 0,
      randomRangeNorthSouth: 0
    });
    expect(sound.placeableProperties).toBeUndefined();
  });

  it("keeps placeable and sound baselines in seed snapshot", () => {
    const scene = createSeedAreaScene();
    const placeable = scene.objects.find((object) => object.id === "plc_barrel_01");
    const sound = scene.objects.find((object) => object.id === "snd_amb_01");

    expect(placeable?.placeableProperties).toEqual({
      plot: false,
      useable: false,
      hasInventory: false
    });
    expect(sound?.soundPositioning).toEqual({
      mode: "specific",
      elevation: 0,
      maxVolumeDistance: 8,
      cutoffDistance: 16,
      randomRangeWestEast: 0,
      randomRangeNorthSouth: 0
    });
  });
});
