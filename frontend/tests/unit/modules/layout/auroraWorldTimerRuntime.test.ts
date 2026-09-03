import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { advanceAuroraWorldTimerRuntime } from "../../../../src/modules/layout/adapters/three/auroraWorldTimerRuntime";
import type { AuroraWorldTimerContract } from "../../../../src/modules/scene/contracts";

function buildContract(
  overrides: Partial<AuroraWorldTimerContract> = {}
): AuroraWorldTimerContract {
  return {
    version: "aurora-worldtimer/v1",
    status: "ready",
    source: "module-ifo",
    sourceObjectKey: "modules/current/module.ifo",
    sourceHash: "a".repeat(64),
    fingerprint: "b".repeat(64),
    minutesPerHour: 2,
    startHour: 6,
    startTimeOfDayMs: 720_000,
    dayLengthMs: 2_880_000,
    tickUnit: "milliseconds",
    advanceMode: "scene-animation-delta",
    ...overrides
  };
}

describe("Aurora world timer scene runtime", () => {
  it("seeds from module.ifo and advances in native milliseconds", () => {
    const scene = new THREE.Scene();
    const contract = buildContract();

    expect(advanceAuroraWorldTimerRuntime(scene, contract, 0)).toBe(720_000);
    expect(advanceAuroraWorldTimerRuntime(scene, contract, 1.25)).toBe(721_250);
    expect(scene.userData.auroraWorldtimerTimeOfDay).toBe(721_250);
    expect(scene.userData.auroraWorldtimerRuntimeStatus).toBe(
      "source-backed-module-ifo-cworldtimer-millisecond-replay"
    );
  });

  it("wraps at the CWorldTimer day period and resets for a new contract", () => {
    const scene = new THREE.Scene();
    const first = buildContract({
      startTimeOfDayMs: 2_879_500,
      fingerprint: "c".repeat(64)
    });
    expect(advanceAuroraWorldTimerRuntime(scene, first, 1)).toBe(500);

    const second = buildContract({
      startTimeOfDayMs: 120_000,
      fingerprint: "d".repeat(64)
    });
    expect(advanceAuroraWorldTimerRuntime(scene, second, 0)).toBe(120_000);
  });

  it("removes the uniform input when no source contract exists", () => {
    const scene = new THREE.Scene();
    advanceAuroraWorldTimerRuntime(scene, buildContract(), 0);

    expect(advanceAuroraWorldTimerRuntime(scene, null, 1)).toBeNull();
    expect(scene.userData.auroraWorldtimerTimeOfDay).toBeUndefined();
    expect(scene.userData.auroraWorldtimerRuntimeStatus).toBe(
      "unavailable-no-module-ifo-contract"
    );
  });
});
