import {
  createAuroraWindManagerState,
  sampleAuroraWind,
  tickAuroraWindManager
} from "../../src/modules/vfx/domain/aurora-vfx-wind-manager";

describe("Aurora VFX wind manager", () => {
  it("combines the grid-scaled global delta with radial point-source wind", () => {
    const state = createAuroraWindManagerState({
      profileId: "test-profile",
      globalWindVector: { x: 2, y: 0, z: 0 },
      noiseGridPrevious16x16: Array(256).fill(1),
      noiseGridCurrent16x16: Array(256).fill(1),
      pointSources: [
        {
          position: { x: 0, y: 0, z: 0 },
          radius: 10,
          durationSeconds: 2,
          intensity: 2
        }
      ]
    });

    const sample = sampleAuroraWind(state, {
      emitterNodeName: "emit_wind",
      particleId: 7,
      position: { x: 5, y: 0, z: 0 },
      deltaSeconds: 0.25
    });

    expect(sample.gridScalar).toBe(1);
    expect(sample.globalContribution).toEqual({ x: 0.5, y: 0, z: 0 });
    expect(sample.pointSourceContribution).toEqual({ x: 1, y: 0, z: 0 });
    expect(sample.finalWindDelta).toEqual({ x: 1.5, y: 0, z: 0 });
  });

  it("advances the two-grid interpolation and expires point sources after their remaining time", () => {
    const initial = createAuroraWindManagerState({
      profileId: "test-profile",
      globalWindVector: { x: 4, y: 0, z: 0 },
      noisePeriodSeconds: 1,
      noiseElapsedSeconds: 0,
      noiseGridPrevious16x16: Array(256).fill(0),
      noiseGridCurrent16x16: Array(256).fill(1),
      noiseSeed: 1234,
      pointSources: [
        {
          position: { x: 0, y: 0, z: 0 },
          radius: 10,
          durationSeconds: 0.2,
          intensity: 1
        }
      ]
    });

    const quarter = tickAuroraWindManager(initial, 0.25);
    const sample = sampleAuroraWind(quarter, {
      emitterNodeName: "emit_wind",
      particleId: 1,
      position: { x: 0, y: 0, z: 0 },
      deltaSeconds: 0.5
    });

    expect(quarter.noiseInterpolationAlpha).toBe(0.25);
    expect(quarter.pointSources).toHaveLength(0);
    expect(sample.globalContribution.x).toBeCloseTo(0.5, 10);

    const wrapped = tickAuroraWindManager(quarter, 1);
    expect(wrapped.noiseElapsedSeconds).toBe(0);
    expect(wrapped.noiseGridPrevious16x16).toEqual(quarter.noiseGridCurrent16x16);
    expect(wrapped.noiseGridCurrent16x16).not.toEqual(quarter.noiseGridCurrent16x16);
  });
});
