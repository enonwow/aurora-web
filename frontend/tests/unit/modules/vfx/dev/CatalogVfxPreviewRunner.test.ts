import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import {
  frameCameraForEmitter,
  readEmitterDrawMetrics
} from "../../../../../src/modules/vfx/dev/CatalogVfxPreviewRunner";

describe("CatalogVfxPreviewRunner", () => {
  it("frames the source-mdl emitter instead of leaving Magic Mouth tiny in the scene grid", () => {
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);
    camera.position.set(24, 22, 24);
    const target = new THREE.Vector3();
    const runtime = {
      camera,
      controls: {
        target,
        update: vi.fn()
      }
    } as unknown as Parameters<typeof frameCameraForEmitter>[0];
    const emitterGroup = new THREE.Group();
    emitterGroup.userData.auroraEmitterPackageSource = "source-mdl";
    const material = new THREE.MeshBasicMaterial();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.34), material);
    mesh.position.set(1.02, 0.04, 1);
    emitterGroup.add(mesh);

    frameCameraForEmitter(runtime, emitterGroup);

    expect(runtime.controls.update).toHaveBeenCalled();
    expect(target.x).toBeCloseTo(1.02, 2);
    expect(target.y).toBeCloseTo(0.04, 2);
    expect(target.z).toBeCloseTo(1, 2);
    expect(camera.position.distanceTo(target)).toBeLessThan(4);
    expect(camera.position.distanceTo(new THREE.Vector3(24, 22, 24))).toBeGreaterThan(20);
  });

  it("exposes visible emitter draw mesh and vertex metrics for visual evidence packets", () => {
    const emitterGroup = new THREE.Group();
    emitterGroup.userData.auroraEmitterPackageSource = "source-mdl";
    emitterGroup.userData.auroraEmitterType = "Fountain";
    emitterGroup.userData.auroraEmitterBlendMode = "Lighten";
    emitterGroup.userData.auroraEmitterRenderMode = "Normal";

    const visibleGeometry = new THREE.BufferGeometry();
    visibleGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [
          -1, -1, 0,
          1, -1, 0,
          1, 1, 0,
          -1, -1, 0,
          1, 1, 0,
          -1, 1, 0
        ],
        3
      )
    );
    const visibleMesh = new THREE.Mesh(visibleGeometry, new THREE.MeshBasicMaterial());
    emitterGroup.add(visibleMesh);

    const hiddenGeometry = new THREE.BoxGeometry(1, 1, 1);
    const hiddenMesh = new THREE.Mesh(hiddenGeometry, new THREE.MeshBasicMaterial());
    hiddenMesh.visible = false;
    emitterGroup.add(hiddenMesh);

    const metrics = readEmitterDrawMetrics(emitterGroup);

    expect(metrics.drawParticles).toBe(1);
    expect(metrics.renderedVertices).toBe(6);
    expect(metrics.drawLanes).toEqual(["source-mdl", "Fountain", "Lighten", "Normal"]);
  });
});
