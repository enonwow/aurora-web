import { describe, expect, it } from "vitest";
import { createSceneCanvasFacade } from "../../../../../src/modules/scene/application/sceneCanvasFacade";
import { createSeedAreaScene } from "../../../../../src/modules/scene/domain/sceneFactory";
import type { SceneDraftPort } from "../../../../../src/modules/scene/ports/sceneDraftPort";

describe("sceneCanvasFacade sound properties api", () => {
  it("reads normalized full sound model from scene", () => {
    const draftPort: SceneDraftPort = {
      loadByUserId: () => null,
      saveByUserId: () => undefined
    };
    const facade = createSceneCanvasFacade({ draftPort });
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
});
