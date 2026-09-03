import {
  buildAuroraProgFxType10ProjectileTrajectory,
  resolveAuroraProgFxType10ProjectileTrajectory,
  resolveAuroraProgFxType10ProjectileOwnerTransform
} from "../../src/modules/vfx/domain/aurora-vfx-progfx-type10-projectile";

describe("Aurora ProgFX Type 10 projectile", () => {
  it("uses the deterministic retail log-distance timing and one path-4 owner", () => {
    const trajectory = buildAuroraProgFxType10ProjectileTrajectory(
      {
        modelRef: "vpr_magmisl",
        projectileRow: 340,
        orientationMode: 0,
        pathStyle: 4,
        timingProfile: "log"
      },
      {
        sourceRef: "source",
        sourcePosition: { x: 0, y: 0, z: 0 },
        targetRef: "target",
        targetPosition: { x: 3, y: 0, z: 0 },
        provenance: "test-fixture"
      }
    );

    expect(trajectory).toMatchObject({
      version: "aurora-progfx-type10-projectile-trajectory/v2",
      proofStatus: "retail-client-disassembly-backed-type10-path4-log-distance",
      modelRef: "vpr_magmisl",
      projectileRow: 340,
      orientationMode: 0,
      pathStyle: 4,
      timingProfile: "log",
      sourceRef: "source",
      targetRef: "target",
      distanceMeters: 3,
      durationMilliseconds: 625,
      durationSeconds: 0.625
    });
    expect(trajectory?.speedMetersPerSecond).toBeCloseTo(4.795836925506592, 7);
    expect(resolveAuroraProgFxType10ProjectileOwnerTransform(trajectory, 0)).toMatchObject({
      position: [0, 0, 0],
      progress: 0
    });
    expect(resolveAuroraProgFxType10ProjectileOwnerTransform(trajectory, 0.3125)).toMatchObject({
      position: [1.5, 0, 0],
      progress: 0.5
    });
    expect(resolveAuroraProgFxType10ProjectileOwnerTransform(trajectory, 5)).toMatchObject({
      position: [3, 0, 0],
      progress: 1
    });
  });

  it("does not invent unsupported Type 10 path styles", () => {
    expect(
      buildAuroraProgFxType10ProjectileTrajectory(
        { pathStyle: 5, timingProfile: "log" },
        {
          sourcePosition: { x: 0, y: 0, z: 0 },
          targetPosition: { x: 3, y: 0, z: 0 },
          provenance: "test-fixture"
        }
      )
    ).toBeUndefined();
  });

  it("classifies missing context and unsupported source parameters instead of failing silently", () => {
    expect(
      resolveAuroraProgFxType10ProjectileTrajectory(
        { orientationMode: 0, pathStyle: 4, timingProfile: "log" },
        undefined
      )
    ).toEqual({
      version: "aurora-progfx-type10-projectile-trajectory-resolution/v1",
      status: "blocked",
      code: "VFX_PROGFX_TYPE10_RUNTIME_CONTEXT_REQUIRED",
      message:
        "ProgFX Type10 requires source and target runtime context; the projectile owner remains diagnostic-only."
    });

    expect(
      resolveAuroraProgFxType10ProjectileTrajectory(
        { orientationMode: 0, pathStyle: 5, timingProfile: "log" },
        {
          sourcePosition: { x: 0, y: 0, z: 0 },
          targetPosition: { x: 3, y: 0, z: 0 },
          provenance: "test-fixture"
        }
      )
    ).toEqual({
      version: "aurora-progfx-type10-projectile-trajectory-resolution/v1",
      status: "blocked",
      code: "VFX_PROGFX_TYPE10_PATH_STYLE_UNSUPPORTED",
      message:
        "ProgFX Type10 path style 5 is not source-backed by the current path-4 runtime."
    });

    expect(
      resolveAuroraProgFxType10ProjectileTrajectory(
        { orientationMode: 0, pathStyle: 4, timingProfile: "linear" },
        {
          sourcePosition: { x: 0, y: 0, z: 0 },
          targetPosition: { x: 3, y: 0, z: 0 },
          provenance: "test-fixture"
        }
      )
    ).toEqual({
      version: "aurora-progfx-type10-projectile-trajectory-resolution/v1",
      status: "blocked",
      code: "VFX_PROGFX_TYPE10_TIMING_PROFILE_UNSUPPORTED",
      message:
        "ProgFX Type10 timing profile \"linear\" is not source-backed by the current log-distance runtime."
    });

    expect(
      resolveAuroraProgFxType10ProjectileTrajectory(
        { orientationMode: 0, timingProfile: "log" },
        {
          sourcePosition: { x: 0, y: 0, z: 0 },
          targetPosition: { x: 3, y: 0, z: 0 },
          provenance: "test-fixture"
        }
      )
    ).toEqual({
      version: "aurora-progfx-type10-projectile-trajectory-resolution/v1",
      status: "blocked",
      code: "VFX_PROGFX_TYPE10_PATH_STYLE_UNSUPPORTED",
      message:
        "ProgFX Type10 path style <missing> is not source-backed by the current path-4 runtime."
    });
  });

  it("preserves the recovered retail orientation-mode zero default and blocks unimplemented modes", () => {
    const defaultOrientation = resolveAuroraProgFxType10ProjectileTrajectory(
        { pathStyle: 4, timingProfile: "log" },
        {
          sourcePosition: { x: 0, y: 0, z: 0 },
          targetPosition: { x: 3, y: 0, z: 0 },
          provenance: "test-fixture"
        }
      );
    expect(defaultOrientation).toMatchObject({
      status: "ready",
      trajectory: { orientationMode: 0 }
    });
    if (defaultOrientation.status === "ready") {
      expect(defaultOrientation.trajectory).not.toHaveProperty("projectileRow");
    }

    expect(
      resolveAuroraProgFxType10ProjectileTrajectory(
        { orientationMode: 1, pathStyle: 4, timingProfile: "log" },
        {
          sourcePosition: { x: 0, y: 0, z: 0 },
          targetPosition: { x: 3, y: 0, z: 0 },
          provenance: "test-fixture"
        }
      )
    ).toEqual({
      version: "aurora-progfx-type10-projectile-trajectory-resolution/v1",
      status: "blocked",
      code: "VFX_PROGFX_TYPE10_ORIENTATION_MODE_UNPROVEN",
      message:
        "ProgFX Type10 orientation mode 1 requires an unimplemented retail direction-to-orientation contract."
    });
  });

  it("rejects non-finite positions and the unproven short-distance timing region", () => {
    expect(
      resolveAuroraProgFxType10ProjectileTrajectory(
        { orientationMode: 0, pathStyle: 4, timingProfile: "log" },
        {
          sourcePosition: { x: Number.NaN, y: 0, z: 0 },
          targetPosition: { x: 3, y: 0, z: 0 },
          provenance: "test-fixture"
        }
      )
    ).toEqual({
      version: "aurora-progfx-type10-projectile-trajectory-resolution/v1",
      status: "blocked",
      code: "VFX_PROGFX_TYPE10_POSITION_NON_FINITE",
      message: "ProgFX Type10 source and target positions must contain only finite coordinates."
    });

    expect(
      resolveAuroraProgFxType10ProjectileTrajectory(
        { orientationMode: 0, pathStyle: 4, timingProfile: "log" },
        {
          sourcePosition: { x: 0, y: 0, z: 0 },
          targetPosition: { x: 0.5, y: 0, z: 0 },
          provenance: "test-fixture"
        }
      )
    ).toEqual({
      version: "aurora-progfx-type10-projectile-trajectory-resolution/v1",
      status: "blocked",
      code: "VFX_PROGFX_TYPE10_DISTANCE_TIMING_UNPROVEN",
      message:
        "ProgFX Type10 log-distance speed is non-positive in an unproven short-distance timing region."
    });

    expect(
      resolveAuroraProgFxType10ProjectileTrajectory(
        { orientationMode: 0, pathStyle: 4, timingProfile: "log" },
        {
          sourcePosition: { x: 0, y: 0, z: 0 },
          targetPosition: { x: Math.exp(-0.5), y: 0, z: 0 },
          provenance: "test-fixture"
        }
      )
    ).toMatchObject({
      status: "blocked",
      code: "VFX_PROGFX_TYPE10_DISTANCE_TIMING_UNPROVEN",
      message:
        "ProgFX Type10 log-distance speed is non-positive in an unproven short-distance timing region."
    });

    expect(
      resolveAuroraProgFxType10ProjectileTrajectory(
        { orientationMode: 0, pathStyle: 4, timingProfile: "log" },
        {
          sourcePosition: { x: 0, y: 0, z: 0 },
          targetPosition: { x: 0, y: 0, z: 0 },
          provenance: "test-fixture"
        }
      )
    ).toMatchObject({
      status: "blocked",
      code: "VFX_PROGFX_TYPE10_DISTANCE_TIMING_UNPROVEN",
      message: "ProgFX Type10 distance must be positive and finite before log timing."
    });

    expect(
      resolveAuroraProgFxType10ProjectileTrajectory(
        { orientationMode: 0, pathStyle: 4, timingProfile: "log" },
        {
          sourcePosition: { x: -3e38, y: 0, z: 0 },
          targetPosition: { x: 3e38, y: 0, z: 0 },
          provenance: "test-fixture"
        }
      )
    ).toMatchObject({
      status: "blocked",
      code: "VFX_PROGFX_TYPE10_DISTANCE_TIMING_UNPROVEN",
      message: "ProgFX Type10 distance must be positive and finite before log timing."
    });
  });

  it("measures all three axes relative to a non-zero source origin", () => {
    const resolution = resolveAuroraProgFxType10ProjectileTrajectory(
      { orientationMode: 0, pathStyle: 4, timingProfile: "log" },
      {
        sourcePosition: { x: 1, y: 2, z: 3 },
        targetPosition: { x: 4, y: 6, z: 15 },
        provenance: "test-fixture"
      }
    );

    expect(resolution).toMatchObject({
      status: "ready",
      trajectory: {
        distanceMeters: 13,
        sourcePosition: { x: 1, y: 2, z: 3 },
        targetPosition: { x: 4, y: 6, z: 15 }
      }
    });
  });

  it("truncates the retail float32 result to integer milliseconds", () => {
    const trajectory = buildAuroraProgFxType10ProjectileTrajectory(
      { pathStyle: 4, timingProfile: "log" },
      {
        sourcePosition: { x: 0, y: 0, z: 0 },
        targetPosition: { x: 1, y: 0, z: 0 },
        provenance: "test-fixture"
      }
    );

    expect(trajectory).toMatchObject({
      speedMetersPerSecond: 1.5,
      durationMilliseconds: 666,
      durationSeconds: 0.666
    });
  });
});
