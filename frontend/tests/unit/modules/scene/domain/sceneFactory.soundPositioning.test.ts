import { describe, expect, it } from "vitest";
import {
  createNewSceneObject,
  normalizeSceneObjectMetadata
} from "../../../../../src/modules/scene/domain/sceneFactory";
import type { SceneObjectSoundPositioning } from "../../../../../src/modules/scene/contracts";

function normalizeSoundObject(
  soundPositioning: Partial<SceneObjectSoundPositioning>,
  z = 0
) {
  const sound = createNewSceneObject("sounds", 1, 1, 501);
  const normalized = normalizeSceneObjectMetadata({
    ...sound,
    z,
    soundPositioning: soundPositioning as SceneObjectSoundPositioning
  });
  return normalized.soundPositioning;
}

describe("sceneFactory sound positioning normalization parity", () => {
  it("normalizes mode transitions and random-range gating with fixtures", () => {
    const fixtures = [
      {
        name: "random keeps random ranges",
        input: {
          mode: "random",
          elevation: 2,
          maxVolumeDistance: 12,
          cutoffDistance: 9,
          randomRangeWestEast: 3.5,
          randomRangeNorthSouth: 4.5
        },
        expected: {
          mode: "random",
          elevation: 2,
          maxVolumeDistance: 12,
          cutoffDistance: 12,
          randomRangeWestEast: 3.5,
          randomRangeNorthSouth: 4.5
        }
      },
      {
        name: "specific zeroes random ranges",
        input: {
          mode: "specific",
          elevation: 2,
          maxVolumeDistance: 12,
          cutoffDistance: 9,
          randomRangeWestEast: 3.5,
          randomRangeNorthSouth: 4.5
        },
        expected: {
          mode: "specific",
          elevation: 2,
          maxVolumeDistance: 12,
          cutoffDistance: 12,
          randomRangeWestEast: 0,
          randomRangeNorthSouth: 0
        }
      },
      {
        name: "everywhere zeroes random ranges",
        input: {
          mode: "everywhere",
          elevation: 1,
          maxVolumeDistance: 7,
          cutoffDistance: 11,
          randomRangeWestEast: 8,
          randomRangeNorthSouth: 9
        },
        expected: {
          mode: "everywhere",
          elevation: 1,
          maxVolumeDistance: 7,
          cutoffDistance: 11,
          randomRangeWestEast: 0,
          randomRangeNorthSouth: 0
        }
      }
    ] as const;

    fixtures.forEach(({ input, expected }) => {
      const normalized = normalizeSoundObject(input);
      expect(normalized).toEqual(expected);
    });
  });

  it("enforces elevation floor and supports z-based fallback when elevation is non-finite", () => {
    const belowFloor = normalizeSoundObject({
      mode: "specific",
      elevation: -3,
      maxVolumeDistance: 8,
      cutoffDistance: 16,
      randomRangeWestEast: 0,
      randomRangeNorthSouth: 0
    });
    expect(belowFloor?.elevation).toBe(0);

    const usesZFallback = normalizeSoundObject(
      {
        mode: "specific",
        elevation: Number.NaN,
        maxVolumeDistance: 8,
        cutoffDistance: 16,
        randomRangeWestEast: 0,
        randomRangeNorthSouth: 0
      },
      1.75
    );
    expect(usesZFallback?.elevation).toBeCloseTo(1.75, 6);
  });

  it("keeps cutoff distance consistent with max volume and non-negative floors", () => {
    const fixtures = [
      {
        input: {
          mode: "random",
          elevation: 0,
          maxVolumeDistance: -4,
          cutoffDistance: 1,
          randomRangeWestEast: 2,
          randomRangeNorthSouth: 3
        },
        expected: {
          maxVolumeDistance: 0,
          cutoffDistance: 1
        }
      },
      {
        input: {
          mode: "specific",
          elevation: 0,
          maxVolumeDistance: 10,
          cutoffDistance: -1,
          randomRangeWestEast: 99,
          randomRangeNorthSouth: 99
        },
        expected: {
          maxVolumeDistance: 10,
          cutoffDistance: 10
        }
      },
      {
        input: {
          mode: "everywhere",
          elevation: 0,
          maxVolumeDistance: Number.POSITIVE_INFINITY,
          cutoffDistance: Number.POSITIVE_INFINITY,
          randomRangeWestEast: 5,
          randomRangeNorthSouth: 5
        },
        expected: {
          maxVolumeDistance: 8,
          cutoffDistance: 16
        }
      }
    ] as const;

    fixtures.forEach(({ input, expected }) => {
      const normalized = normalizeSoundObject(input);
      expect(normalized?.maxVolumeDistance).toBeCloseTo(expected.maxVolumeDistance, 6);
      expect(normalized?.cutoffDistance).toBeCloseTo(expected.cutoffDistance, 6);
      expect((normalized?.cutoffDistance ?? 0) >= (normalized?.maxVolumeDistance ?? 0)).toBe(true);
    });
  });

  it("falls back to specific mode baseline for invalid mode payloads", () => {
    const normalized = normalizeSoundObject({
      mode: "broken" as SceneObjectSoundPositioning["mode"],
      elevation: 0,
      maxVolumeDistance: 1,
      cutoffDistance: 2,
      randomRangeWestEast: 6,
      randomRangeNorthSouth: 7
    });

    expect(normalized).toEqual({
      mode: "specific",
      elevation: 0,
      maxVolumeDistance: 1,
      cutoffDistance: 2,
      randomRangeWestEast: 0,
      randomRangeNorthSouth: 0
    });
  });

  it("normalizes preserve-only positioning payload with defensive defaults", () => {
    const normalized = normalizeSoundObject({
      mode: "random",
      elevation: 1,
      maxVolumeDistance: 6,
      cutoffDistance: 12,
      randomRangeWestEast: 2,
      randomRangeNorthSouth: 3,
      preserve: {
        timeWindow: "night",
        hourMask: 77,
        intervalMs: 1500,
        intervalVariationMs: "bad",
        volume: 0.4,
        volumeVariation: 0.1,
        pitchVariation: Number.NaN,
        priority: 7,
        flags: {
          looping: true,
          positional: "invalid"
        },
        extra: {
          cue: "forest_a",
          level: 3,
          enabled: true,
          nullable: null,
          nested: { invalid: true }
        }
      } as unknown as NonNullable<SceneObjectSoundPositioning["preserve"]>
    });

    expect(normalized?.preserve).toEqual({
      timeWindow: "night",
      hourMask: "",
      intervalMs: 1500,
      intervalVariationMs: 0,
      volume: 0.4,
      volumeVariation: 0.1,
      pitchVariation: 0,
      priority: 7,
      flags: {
        looping: true
      },
      extra: {
        cue: "forest_a",
        level: 3,
        enabled: true,
        nullable: null
      }
    });
  });

  it("keeps normalized preserve-only payload stable across reopen roundtrip", () => {
    const sound = createNewSceneObject("sounds", 1, 1, 777);
    const first = normalizeSceneObjectMetadata({
      ...sound,
      soundPositioning: {
        mode: "specific",
        elevation: 2,
        maxVolumeDistance: 10,
        cutoffDistance: 15,
        randomRangeWestEast: 9,
        randomRangeNorthSouth: 9,
        preserve: {
          timeWindow: "dusk",
          hourMask: "11110000",
          intervalMs: 1200,
          intervalVariationMs: 200,
          volume: 0.6,
          volumeVariation: 0.05,
          pitchVariation: 0.02,
          priority: 2,
          flags: {
            audibleThroughWalls: false
          },
          extra: {
            source: "fixture"
          }
        }
      }
    });

    const second = normalizeSceneObjectMetadata(first);
    expect(second).toBe(first);
  });
});
