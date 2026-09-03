import {
  buildAuroraAoeVisualFootprintContract,
  sampleAuroraAoeVisualRuntime
} from "../../src/modules/vfx/domain/aurora-vfx-aoe-visual-runtime";

describe("Aurora persistent AOE visual runtime", () => {
  const contract = buildAuroraAoeVisualFootprintContract({
    sourceRowId: 0,
    sourceLabel: "VFX_PER_FOGACID",
    shape: { shape: "circle", radius: 5 },
    orientWithGround: true,
    seed: 211,
    schedule: [
      {
        slot: 1,
        modelRef: "vps_fogacid",
        lowQualityModelRef: "vps_fogacid_l",
        activeCount: 5,
        durationMilliseconds: 3400,
        edgeWeight: 0
      },
      {
        slot: 2,
        modelRef: "vps_fogacid",
        lowQualityModelRef: "vps_fogacid_l",
        activeCount: 10,
        durationMilliseconds: 1100,
        edgeWeight: 0.25
      },
      {
        slot: 3,
        modelRef: "vps_fogacid",
        lowQualityModelRef: "vps_fogacid_l",
        activeCount: 5,
        durationMilliseconds: 1900,
        edgeWeight: 0.25
      }
    ]
  });

  it("builds the exact retail owner counts, edge thresholds, and initial delays", () => {
    expect(contract.version).toBe("aurora-aoe-visual-footprint/v1");
    expect(contract.owners).toHaveLength(20);
    expect(contract.owners.map((owner) => owner.initialDelayMilliseconds)).toEqual([
      0,
      300,
      600,
      900,
      1200,
      300,
      700,
      1100,
      1500,
      1900,
      2300,
      2700,
      3100,
      3500,
      3900,
      700,
      1050,
      1400,
      1750,
      2100
    ]);
    expect(contract.groups.map((group) => ({
      slot: group.slot,
      activeCount: group.activeCount,
      durationMilliseconds: group.durationMilliseconds,
      edgePercent: group.edgePercent
    }))).toEqual([
      { slot: 1, activeCount: 5, durationMilliseconds: 3400, edgePercent: 0 },
      { slot: 2, activeCount: 10, durationMilliseconds: 1100, edgePercent: 25 },
      { slot: 3, activeCount: 5, durationMilliseconds: 1900, edgePercent: 25 }
    ]);
  });

  it("advances one owner through impact, duration, cessation, and respawn", () => {
    const animationDurations = {
      impactMilliseconds: 300,
      cessationMilliseconds: 2000
    };

    expect(
      sampleAuroraAoeVisualRuntime(contract, 0, animationDurations).owners[0]
    ).toMatchObject({
      phase: "impact",
      cycleIndex: 0,
      phaseElapsedMilliseconds: 0
    });
    expect(
      sampleAuroraAoeVisualRuntime(contract, 299, animationDurations).owners[0]
    ).toMatchObject({
      phase: "impact",
      cycleIndex: 0,
      phaseElapsedMilliseconds: 299
    });
    expect(
      sampleAuroraAoeVisualRuntime(contract, 300, animationDurations).owners[0]
    ).toMatchObject({
      phase: "duration",
      cycleIndex: 0,
      phaseElapsedMilliseconds: 0
    });
    expect(
      sampleAuroraAoeVisualRuntime(contract, 3700, animationDurations).owners[0]
    ).toMatchObject({
      phase: "cessation",
      cycleIndex: 0,
      phaseElapsedMilliseconds: 0
    });
    expect(
      sampleAuroraAoeVisualRuntime(contract, 5701, animationDurations).owners[0]
    ).toMatchObject({
      phase: "impact",
      cycleIndex: 1,
      phaseElapsedMilliseconds: 0
    });
  });

  it("keeps every deterministic circular placement inside its source footprint", () => {
    const snapshots = [0, 701, 2201, 5701, 9000].flatMap((elapsed) =>
      sampleAuroraAoeVisualRuntime(contract, elapsed, {
        impactMilliseconds: 300,
        cessationMilliseconds: 2000
      }).owners
    );

    expect(snapshots.some((owner) => owner.placementMode === "edge")).toBe(true);
    expect(snapshots.some((owner) => owner.placementMode === "interior")).toBe(true);
    snapshots.forEach((owner) => {
      if (!owner.position) return;
      expect(Math.hypot(owner.position.x, owner.position.y)).toBeLessThanOrEqual(
        5.000001
      );
      expect(owner.position.z).toBe(0);
    });
  });

  it("plays cessation once on stop and releases without a new impact cycle", () => {
    const beforeRelease = sampleAuroraAoeVisualRuntime(
      contract,
      6999,
      {
        impactMilliseconds: 300,
        cessationMilliseconds: 2000
      },
      { stopAtMilliseconds: 5000 }
    );
    const afterRelease = sampleAuroraAoeVisualRuntime(
      contract,
      8000,
      {
        impactMilliseconds: 300,
        cessationMilliseconds: 2000
      },
      { stopAtMilliseconds: 5000 }
    );

    expect(beforeRelease.stopping).toBe(true);
    expect(new Set(beforeRelease.owners.map((owner) => owner.phase))).toEqual(
      new Set(["cessation"])
    );
    expect(beforeRelease.owners.every((owner) => owner.stopRequested)).toBe(true);
    expect(afterRelease.released).toBe(true);
    expect(new Set(afterRelease.owners.map((owner) => owner.phase))).toEqual(
      new Set(["released"])
    );
  });
});
