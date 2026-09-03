import { describe, expect, it } from "vitest";
import { cloneSceneObject } from "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("workspace SceneObject Sound Play Style clone", () => {
  it("detaches current and immutable source tuples independently", () => {
    const storage = {
      loopingByte: 0 as const, continuousByte: 1 as const, priorityByte: 20 as const,
      positionalByte: 1 as const, soundsCount: 2, intervalDword: 25_000,
      intervalVariationDword: 5_000,
    };
    const source = {
      ...createNewSceneObject("sounds", 1, 2, 3),
      soundPlayStyle: storage,
      soundPlayback: {
        sounds: ["wind_a", "wind_b"],
        loopingByte: 0 as const, continuousByte: 1 as const, priorityByte: 20 as const,
        positionalByte: 1 as const, intervalDword: 25_000,
        intervalVariationDword: 5_000,
      },
      soundProfile: {
        sounds: ["wind_a", "wind_b"],
        loopingByte: 0 as const, continuousByte: 1 as const, priorityByte: 20 as const,
        positionalByte: 1 as const, randomPositionByte: 0 as const,
        elevationFloat32: 0, maxDistanceFloat32: 14, minDistanceFloat32: 2,
        randomRangeXFloat32: 0, randomRangeYFloat32: 0,
        intervalDword: 25_000, intervalVariationDword: 5_000,
      },
      source: {
        type: "aurora_git" as const,
        areaId: "area_crypt01",
        sourceObjectId: "obj_sound_0",
        sourceIndex: 0,
        sourceKind: "sound" as const,
        soundPlayStyleStorage: storage,
        soundPlaybackStorage: {
          sounds: ["wind_a", "wind_b"],
          loopingByte: 0 as const, continuousByte: 1 as const, priorityByte: 20 as const,
          positionalByte: 1 as const, intervalDword: 25_000,
          intervalVariationDword: 5_000,
        },
        soundProfileStorage: {
          sounds: ["wind_a", "wind_b"],
          loopingByte: 0 as const, continuousByte: 1 as const, priorityByte: 20 as const,
          positionalByte: 1 as const, randomPositionByte: 0 as const,
          elevationFloat32: 0, maxDistanceFloat32: 14, minDistanceFloat32: 2,
          randomRangeXFloat32: 0, randomRangeYFloat32: 0,
          intervalDword: 25_000, intervalVariationDword: 5_000,
        },
      },
    };
    const cloned = cloneSceneObject(source);
    expect(cloned.soundPlayStyle).toEqual(storage);
    expect(cloned.source?.soundPlayStyleStorage).toEqual(storage);
    expect(cloned.soundPlayStyle).not.toBe(source.soundPlayStyle);
    expect(cloned.source).not.toBe(source.source);
    expect(cloned.source?.soundPlayStyleStorage).not.toBe(
      source.source.soundPlayStyleStorage,
    );
    expect(cloned.source?.soundPlayStyleStorage).not.toBe(cloned.soundPlayStyle);
    expect(cloned.soundPlayback).toEqual(source.soundPlayback);
    expect(cloned.soundPlayback?.sounds).not.toBe(source.soundPlayback.sounds);
    expect(cloned.source?.soundPlaybackStorage?.sounds).not.toBe(
      source.source.soundPlaybackStorage.sounds,
    );
    expect(cloned.source?.soundPlaybackStorage?.sounds).not.toBe(
      cloned.soundPlayback?.sounds,
    );
    expect(cloned.soundProfile).toEqual(source.soundProfile);
    expect(cloned.soundProfile?.sounds).not.toBe(source.soundProfile.sounds);
    expect(cloned.source?.soundProfileStorage?.sounds).not.toBe(
      source.source.soundProfileStorage.sounds,
    );
    expect(cloned.source?.soundProfileStorage?.sounds).not.toBe(
      cloned.soundProfile?.sounds,
    );
  });
});
