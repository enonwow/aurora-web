import { describe, expect, it } from "vitest";
import { createSceneMutationsFacade } from "../../../../../src/modules/scene/application/sceneMutationsFacade";
import { createSeedAreaScene } from "../../../../../src/modules/scene/domain/sceneFactory";

describe("sceneMutationsFacade sound properties api", () => {
  it("returns full aurora-first sound model defaults", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const sound = scene.objects.find((object) => object.kind === "sounds");
    expect(sound).toBeDefined();

    const resolved = facade.getSoundPropertiesById(scene, sound!.id);
    expect(resolved).toEqual({
      name: sound!.tag,
      tag: sound!.tag,
      resRef: sound!.resRef,
      mode: "specific",
      elevation: 0,
      maxVolumeDistance: 1,
      cutoffDistance: 10,
      randomRangeWestEast: 0,
      randomRangeNorthSouth: 0,
      active: true,
      whenToPlay: "always",
      dayNight: "both",
      hoursStart: 0,
      hoursEnd: 23,
      playStyle: "repeat",
      playOrder: "sequential",
      intervalMs: 6000,
      intervalVariationMs: 0,
      volumeVariation: 0,
      pitchVariation: 0
    });
  });

  it("writes normalized full sound model and preserves unrelated preserve payload keys", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const sound = scene.objects.find((object) => object.kind === "sounds");
    expect(sound).toBeDefined();
    const seededScene = {
      ...scene,
      objects: scene.objects.map((object) =>
        object.id === sound!.id
          ? {
              ...object,
              soundPositioning: {
                ...(object.soundPositioning ?? {
                  mode: "specific",
                  elevation: 0,
                  maxVolumeDistance: 8,
                  cutoffDistance: 16,
                  randomRangeWestEast: 0,
                  randomRangeNorthSouth: 0
                }),
                preserve: {
                  timeWindow: "legacy_time",
                  hourMask: "legacy_mask",
                  active: false,
                  intervalMs: 4000,
                  intervalVariationMs: 500,
                  volume: 0.75,
                  volumeVariation: 0.1,
                  pitchVariation: 0.2,
                  priority: 4,
                  flags: {
                    legacyFlag: true
                  },
                  extra: {
                    legacyExtra: "keep-me"
                  }
                }
              }
            }
          : object
      )
    };

    const nextScene = facade.setSoundPropertiesByIds(seededScene, [sound!.id], {
      name: "  Forest Wind  ",
      tag: "  SND_FOREST_WIND_01  ",
      resRef: "  as_amb_forest_wind  ",
      mode: "specific",
      elevation: -3,
      maxVolumeDistance: 10,
      cutoffDistance: 5,
      randomRangeWestEast: 6,
      randomRangeNorthSouth: 7,
      active: true,
      whenToPlay: "hours",
      dayNight: "night",
      hoursStart: -5,
      hoursEnd: 27,
      playStyle: "loop",
      playOrder: "random",
      intervalMs: 3000,
      intervalVariationMs: 9999,
      volumeVariation: 1.8,
      pitchVariation: -0.5
    });

    const changed = nextScene.objects.find((object) => object.id === sound!.id);
    expect(changed).toBeDefined();
    expect(changed?.name).toBe("Forest Wind");
    expect(changed?.tag).toBe("SND_FOREST_WIND_01");
    expect(changed?.resRef).toBe("as_amb_forest_wind");
    expect(changed?.soundPositioning).toEqual({
      mode: "specific",
      elevation: 0,
      maxVolumeDistance: 10,
      cutoffDistance: 10,
      randomRangeWestEast: 0,
      randomRangeNorthSouth: 0,
      preserve: {
        timeWindow: "legacy_time",
        hourMask: "legacy_mask",
        active: true,
        whenToPlay: "hours",
        dayNight: "night",
        hoursStart: 0,
        hoursEnd: 23,
        playStyle: "loop",
        playOrder: "random",
        intervalMs: 3000,
        intervalVariationMs: 3000,
        volume: 0.75,
        volumeVariation: 1,
        pitchVariation: 0,
        priority: 4,
        flags: {
          legacyFlag: true
        },
        extra: {
          legacyExtra: "keep-me"
        }
      }
    });
  });

  it("returns unchanged scene when sound update is no-op after normalization", () => {
    const facade = createSceneMutationsFacade();
    const scene = createSeedAreaScene();
    const sound = scene.objects.find((object) => object.kind === "sounds");
    expect(sound).toBeDefined();
    const seededScene = facade.setSoundPropertiesByIds(scene, [sound!.id], {
      name: sound!.tag,
      tag: sound!.tag,
      resRef: sound!.resRef,
      mode: "specific",
      elevation: 0,
      maxVolumeDistance: 8,
      cutoffDistance: 16,
      randomRangeWestEast: 0,
      randomRangeNorthSouth: 0,
      active: true,
      whenToPlay: "always",
      dayNight: "both",
      hoursStart: 0,
      hoursEnd: 23,
      playStyle: "repeat",
      playOrder: "sequential",
      intervalMs: 6000,
      intervalVariationMs: 0,
      volumeVariation: 0,
      pitchVariation: 0
    });

    const noOp = facade.setSoundPropertiesByIds(seededScene, [sound!.id], {
      name: ` ${sound!.tag} `,
      tag: ` ${sound!.tag} `,
      resRef: ` ${sound!.resRef} `,
      mode: "specific",
      elevation: -2,
      maxVolumeDistance: 8,
      cutoffDistance: 16,
      randomRangeWestEast: 99,
      randomRangeNorthSouth: 99,
      active: true,
      whenToPlay: "always",
      dayNight: "both",
      hoursStart: 0,
      hoursEnd: 23,
      playStyle: "repeat",
      playOrder: "sequential",
      intervalMs: 6000,
      intervalVariationMs: 0,
      volumeVariation: 0,
      pitchVariation: 0
    });

    expect(noOp).toBe(seededScene);
  });
});
