import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { materializeDevVfxDiagnosticScene } from "../../../../../src/modules/vfx/dev/VfxFixtureRunner";

describe("VfxFixtureRunner diagnostic scene profiles", () => {
  it("materializes the declared recipe without receiving a fixture identity", () => {
    const scene = new THREE.Scene();

    materializeDevVfxDiagnosticScene(scene, {
      version: "aurora-vfx-diagnostic-scene/v1",
      recipe: "cross-lane-light-probes"
    });

    const group = scene.getObjectByName("cross_lane_runtime_probe_lights");
    expect(group).toBeInstanceOf(THREE.Group);
    expect(group?.children.filter((child) => child instanceof THREE.PointLight)).toHaveLength(4);
  });

  it("does not materialize diagnostic geometry when no profile is declared", () => {
    const scene = new THREE.Scene();

    materializeDevVfxDiagnosticScene(scene, undefined);

    expect(scene.children).toHaveLength(0);
  });
});
