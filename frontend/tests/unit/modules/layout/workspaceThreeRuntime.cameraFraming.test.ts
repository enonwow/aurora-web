import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { centerCameraForScene } from "../../../../src/modules/layout/adapters/three/workspaceThreeRuntime";
import type { AreaScene, SceneObject } from "../../../../src/modules/scene/contracts";

function createRuntimeStub() {
  return {
    camera: new THREE.PerspectiveCamera(55, 1, 0.1, 1000),
    container: document.createElement("div"),
    controls: {
      minDistance: 0,
      maxDistance: 0,
      target: new THREE.Vector3(),
      update: vi.fn()
    }
  } as unknown as Parameters<typeof centerCameraForScene>[0];
}

function createObject(overrides: Partial<SceneObject> = {}): SceneObject {
  return {
    id: "preview:plc_test",
    kind: "placeables",
    name: "Preview",
    resRef: "test",
    tag: "TEST",
    x: 0.5,
    y: 0.5,
    z: 0,
    bearing: 0,
    isStatic: true,
    visualTransform: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      yaw: 0,
      roll: 0
    },
    ...overrides
  };
}

function createScene(object: SceneObject): AreaScene {
  return {
    sceneId: "preview",
    areaName: "Preview",
    width: 1,
    height: 1,
    tiles: [],
    objects: [object],
    updatedAtUnixMs: 0,
    source: "seed"
  };
}

describe("centerCameraForScene", () => {
  it("frames VFX object previews wider than ordinary placeable previews", () => {
    const normalRuntime = createRuntimeStub();
    const vfxRuntime = createRuntimeStub();

    centerCameraForScene(normalRuntime, createScene(createObject()), { objectPreview: true });
    centerCameraForScene(
      vfxRuntime,
      createScene(
        createObject({
          vfxPayload: {
            profile: "placeable_vfx",
            emitter: "phod_fx_pntgrm2",
            script: "",
            sourceKind: "placeable_preview",
            sourceProfile: "placeable",
            sourceTable: "placeables.2da",
            sourceLabel: "VFX: Pentagram Small*",
            sourceResRef: "phod_fx_pntgrm2",
            previewMode: "aurora_emitter_particle_preview",
            canonicalStatus: "preview_only",
            diagnostics: [],
            flags: { isPlaceableVfx: true },
            extra: {}
          }
        })
      ),
      { objectPreview: true }
    );

    expect(vfxRuntime.controls.target.y).toBeGreaterThan(normalRuntime.controls.target.y);
    expect(vfxRuntime.camera.position.distanceTo(vfxRuntime.controls.target)).toBeGreaterThan(
      normalRuntime.camera.position.distanceTo(normalRuntime.controls.target)
    );
    expect(vfxRuntime.controls.minDistance).toBeGreaterThan(normalRuntime.controls.minDistance);
    expect(vfxRuntime.controls.maxDistance).toBeGreaterThan(normalRuntime.controls.maxDistance);
    expect(vfxRuntime.controls.update).toHaveBeenCalledOnce();
  });

  it("frames Aurora area scenes from declared tile extent instead of distant object placeholders", () => {
    const runtime = createRuntimeStub();
    const scene: AreaScene = {
      sceneId: "_ikea",
      areaName: "_IKEA",
      width: 16,
      height: 16,
      tileSource: {
        type: "aurora_tile_list",
        tilesetResRef: "tcn01",
        tileCount: 2
      },
      tiles: [
        {
          id: "_ikea:r0:c0",
          row: 0,
          col: 0,
          terrain: "corridor",
          orientation: 0,
          rotateTexture: false,
          plot: false,
          source: "aurora_tile_list"
        },
        {
          id: "_ikea:r15:c15",
          row: 15,
          col: 15,
          terrain: "corridor",
          orientation: 0,
          rotateTexture: false,
          plot: false,
          source: "aurora_tile_list"
        }
      ],
      objects: [
        createObject({
          id: "_ikea:plc_far_placeholder",
          x: 380,
          y: 420,
          z: 0
        })
      ],
      updatedAtUnixMs: 0,
      source: "aurora_area"
    };

    centerCameraForScene(runtime, scene);

    expect(runtime.container.dataset.areaCameraFrameSize).toBe("16.000x16.000");
    expect(runtime.container.dataset.areaCameraFrameMode).toBe("aurora_area_top_down");
    expect(runtime.container.dataset.areaCameraFrameTarget).toBe("8.000,0.090,8.000");
    expect(runtime.container.dataset.areaCameraFrameSource).toBe(
      "aurora_tile_list_and_git_objects"
    );
    expect(runtime.controls.target.x).toBe(8);
    expect(runtime.controls.target.z).toBe(8);
    expect(runtime.camera.position.x).toBeCloseTo(8);
    expect(runtime.camera.position.z).toBeCloseTo(8.001);
    expect(runtime.camera.position.y).toBeGreaterThan(runtime.controls.target.y);
  });
});
