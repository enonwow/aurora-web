import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { evaluateCameraFrameCoverage } from "../../../../src/modules/layout/adapters/three/workspaceThreeRuntime";

function createTopDownCamera(distance: number): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.up.set(0, 0, 1);
  camera.position.set(0, distance, 0);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return camera;
}

const bounds = {
  minX: -2,
  maxX: 2,
  minY: -0.5,
  maxY: 0.5,
  minZ: -2,
  maxZ: 2,
  source: "runtime_terrain_bounds" as const
};

describe("workspaceThreeRuntime camera coverage", () => {
  it("accepts bounds whose eight corners are inside the camera frustum", () => {
    const coverage = evaluateCameraFrameCoverage(createTopDownCamera(8), bounds);

    expect(coverage.status).toBe("pass");
    expect(coverage.clippedCornerCount).toBe(0);
    expect(coverage.minimumNdcMargin).toBeGreaterThan(0);
  });

  it("rejects a camera pose that clips current terrain bounds", () => {
    const coverage = evaluateCameraFrameCoverage(createTopDownCamera(2), bounds);

    expect(coverage.status).toBe("failed");
    expect(coverage.clippedCornerCount).toBeGreaterThan(0);
  });
});
