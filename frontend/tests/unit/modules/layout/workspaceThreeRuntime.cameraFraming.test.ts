import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import {
  applyOrbitPointerBindings,
  applyTopDownOracleCameraLock,
  centerCameraForRuntimeObjectPreview,
  centerCameraForScene,
  resolveSceneFrameMaxDistance,
  setTopDownOracleCameraForScene
} from "../../../../src/modules/layout/adapters/three/workspaceThreeRuntime";
import type { AreaScene, SceneObject } from "../../../../src/modules/scene/contracts";

function createRuntimeStub() {
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);
  const controlsUpQuaternion = new THREE.Quaternion().setFromUnitVectors(
    camera.up,
    new THREE.Vector3(0, 1, 0)
  );
  const runtime = {
    camera,
    container: document.createElement("div"),
    controls: {
      object: camera,
      _quat: controlsUpQuaternion,
      _quatInverse: controlsUpQuaternion.clone().invert(),
      minDistance: 0,
      maxDistance: 0,
      enablePan: false,
      enableRotate: true,
      screenSpacePanning: false,
      mouseButtons: {
        LEFT: null,
        MIDDLE: null,
        RIGHT: null
      },
      target: new THREE.Vector3(),
      update: vi.fn()
    },
    objectMeshById: new Map<string, THREE.Object3D>()
  } as unknown as Parameters<typeof centerCameraForScene>[0];
  applyOrbitPointerBindings(runtime.controls, { ctrlPanEnabled: false });
  return runtime;
}

function readControlsCameraUpQuaternion(runtime: ReturnType<typeof createRuntimeStub>): THREE.Quaternion {
  return (runtime.controls as unknown as { _quat: THREE.Quaternion })._quat;
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
    expect(normalRuntime.controls.mouseButtons.MIDDLE).toBe(THREE.MOUSE.ROTATE);
    expect(vfxRuntime.controls.mouseButtons.MIDDLE).toBe(THREE.MOUSE.ROTATE);
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

    runtime.camera.fov = 5;
    centerCameraForScene(runtime, scene);

    expect(runtime.container.dataset.areaCameraFrameSize).toBe("16.000x16.000");
    expect(runtime.container.dataset.areaCameraFrameMode).toBe("perspective_orbit");
    expect(runtime.container.dataset.areaCameraFrameFov).toBe("55.000");
    expect(runtime.container.dataset.areaCameraFrameTarget).toBe("8.000,0.090,8.000");
    expect(runtime.container.dataset.areaCameraFrameSource).toBe(
      "aurora_tile_list_and_git_objects"
    );
    expect(runtime.controls.target.x).toBe(8);
    expect(runtime.controls.target.z).toBe(8);
    expect(runtime.camera.position.x).toBeGreaterThan(runtime.controls.target.x);
    expect(runtime.camera.position.z).toBeGreaterThan(runtime.controls.target.z);
    expect(runtime.camera.position.y).toBeGreaterThan(runtime.controls.target.y);
    expect(runtime.camera.fov).toBeCloseTo(55);
    expect(runtime.camera.up.toArray()).toEqual([0, 1, 0]);
    expect(readControlsCameraUpQuaternion(runtime).angleTo(new THREE.Quaternion())).toBeCloseTo(0);
    expect(runtime.controls.mouseButtons.MIDDLE).toBe(THREE.MOUSE.ROTATE);
    applyOrbitPointerBindings(runtime.controls, { ctrlPanEnabled: true });
    expect(runtime.controls.mouseButtons.MIDDLE).toBe(THREE.MOUSE.ROTATE);
    expect(runtime.controls.mouseButtons.RIGHT).toBe(THREE.MOUSE.PAN);
    applyOrbitPointerBindings(runtime.controls, { ctrlPanEnabled: false });
    expect(runtime.controls.mouseButtons.MIDDLE).toBe(THREE.MOUSE.ROTATE);
  });

  it("keeps the OrbitControls camera-up cache shared between Area and object preview", () => {
    const runtime = createRuntimeStub();
    centerCameraForScene(runtime, {
      sceneId: "_ikea",
      areaName: "_IKEA",
      width: 16,
      height: 16,
      tileSource: {
        type: "aurora_tile_list",
        tilesetResRef: "tcn01",
        tileCount: 1
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
        }
      ],
      objects: [],
      updatedAtUnixMs: 0,
      source: "aurora_area"
    });

    expect(runtime.camera.up.toArray()).toEqual([0, 1, 0]);
    expect(readControlsCameraUpQuaternion(runtime).angleTo(new THREE.Quaternion())).toBeCloseTo(0);

    centerCameraForScene(runtime, createScene(createObject()), { objectPreview: true });

    expect(runtime.camera.up.toArray()).toEqual([0, 1, 0]);
    expect(readControlsCameraUpQuaternion(runtime).angleTo(new THREE.Quaternion())).toBeCloseTo(0);
  });

  it("keeps Aurora area zoom-out range usable after lateral camera movement", () => {
    const runtime = createRuntimeStub();
    const scene: AreaScene = {
      sceneId: "_ikea",
      areaName: "_IKEA",
      width: 16,
      height: 16,
      tileSource: {
        type: "aurora_tile_list",
        tilesetResRef: "tcn01",
        tileCount: 1
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
      objects: [],
      updatedAtUnixMs: 0,
      source: "aurora_area"
    };

    centerCameraForScene(runtime, scene);
    runtime.camera.position.x += 160;
    runtime.camera.position.z += 160;

    expect(runtime.controls.maxDistance).toBeGreaterThan(
      runtime.camera.position.distanceTo(runtime.controls.target)
    );
  });

  it("uses a wider max-distance budget for Aurora area views only", () => {
    expect(
      resolveSceneFrameMaxDistance(16, 9.92, {
        objectPreview: false,
        vfxObjectPreview: false,
        auroraAreaFrame: true
      })
    ).toBe(512);
    expect(
      resolveSceneFrameMaxDistance(16, 9.92, {
        objectPreview: false,
        vfxObjectPreview: false,
        auroraAreaFrame: false
      })
    ).toBe(128);
  });

  it("locks oracle captures to a true top-down camera pose", () => {
    const runtime = createRuntimeStub();
    const scene: AreaScene = {
      sceneId: "enon_bakery",
      areaName: "enon_bakery",
      width: 4,
      height: 4,
      tileSource: {
        type: "aurora_tile_list",
        tilesetResRef: "tcm01",
        tileCount: 2
      },
      tiles: [
        {
          id: "enon_bakery:r0:c0",
          row: 0,
          col: 0,
          terrain: "wood",
          orientation: 0,
          rotateTexture: false,
          plot: false,
          source: "aurora_tile_list"
        },
        {
          id: "enon_bakery:r3:c3",
          row: 3,
          col: 3,
          terrain: "wood",
          orientation: 0,
          rotateTexture: false,
          plot: false,
          source: "aurora_tile_list"
        }
      ],
      objects: [],
      updatedAtUnixMs: 0,
      source: "aurora_area"
    };

    setTopDownOracleCameraForScene(runtime, scene);

    expect(runtime.container.dataset.areaCameraFrameMode).toBe("top_down_oracle");
    expect(runtime.container.dataset.areaCameraFrameFov).toBe("5.000");
    expect(runtime.container.dataset.areaCameraFrameDistance).toBe("44.800");
    expect(runtime.camera.up.toArray()).toEqual([0, 0, 1]);
    expect(runtime.camera.fov).toBeCloseTo(5);
    expect(runtime.camera.position.y - runtime.controls.target.y).toBeCloseTo(44.8, 3);
    const direction = new THREE.Vector3();
    runtime.camera.getWorldDirection(direction);
    expect(direction.x).toBeCloseTo(0, 3);
    expect(direction.y).toBeLessThan(-0.999);
    expect(direction.z).toBeCloseTo(0, 3);

    runtime.camera.fov = 55;
    runtime.camera.position.x += 2.5;
    runtime.camera.position.z += 1.5;
    expect(applyTopDownOracleCameraLock(runtime)).toBe(true);
    runtime.camera.getWorldDirection(direction);

    expect(runtime.camera.fov).toBeCloseTo(5);
    expect(direction.x).toBeCloseTo(0, 3);
    expect(direction.y).toBeLessThan(-0.999);
    expect(direction.z).toBeCloseTo(0, 3);
    expect(runtime.camera.position.x).toBeCloseTo(runtime.controls.target.x);
    expect(runtime.camera.position.z).toBeCloseTo(runtime.controls.target.z);
    expect(runtime.camera.position.y - runtime.controls.target.y).toBeCloseTo(44.8, 3);
  });

  it("supports focused top-down oracle captures for placeable close-ups", () => {
    const runtime = createRuntimeStub();
    const scene: AreaScene = {
      sceneId: "enon_bakery",
      areaName: "enon_bakery",
      width: 4,
      height: 4,
      tileSource: {
        type: "aurora_tile_list",
        tilesetResRef: "tcm01",
        tileCount: 2
      },
      tiles: [
        {
          id: "enon_bakery:r0:c0",
          row: 0,
          col: 0,
          terrain: "wood",
          orientation: 0,
          rotateTexture: false,
          plot: false,
          source: "aurora_tile_list"
        },
        {
          id: "enon_bakery:r3:c3",
          row: 3,
          col: 3,
          terrain: "wood",
          orientation: 0,
          rotateTexture: false,
          plot: false,
          source: "aurora_tile_list"
        }
      ],
      objects: [],
      updatedAtUnixMs: 0,
      source: "aurora_area"
    };

    setTopDownOracleCameraForScene(runtime, scene, {
      topDownTargetX: 2.55,
      topDownTargetY: 0.18,
      topDownTargetZ: 2.36,
      topDownDistance: 1.8
    });

    expect(runtime.container.dataset.areaCameraFrameMode).toBe("top_down_oracle");
    expect(runtime.container.dataset.areaCameraFrameTarget).toBe("2.550,0.180,2.360");
    expect(runtime.container.dataset.areaCameraFrameDistance).toBe("1.800");
    expect(runtime.controls.target.toArray()).toEqual([2.55, 0.18, 2.36]);
    expect(runtime.camera.position.x).toBeCloseTo(2.55);
    expect(runtime.camera.position.y).toBeCloseTo(1.98);
    expect(runtime.camera.position.z).toBeCloseTo(2.36);
  });

  it("frames object previews from visible runtime mesh bounds after model load", () => {
    const runtime = createRuntimeStub();
    const root = new THREE.Group();
    const visibleMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 2, 1),
      new THREE.MeshBasicMaterial()
    );
    visibleMesh.position.set(-3, 4, 2);
    const hiddenMesh = new THREE.Mesh(
      new THREE.BoxGeometry(30, 30, 30),
      new THREE.MeshBasicMaterial()
    );
    hiddenMesh.visible = false;
    hiddenMesh.position.set(80, 80, 80);
    root.add(visibleMesh, hiddenMesh);
    runtime.objectMeshById.set("preview:creature", root);

    expect(centerCameraForRuntimeObjectPreview(runtime)).toBe(true);

    expect(runtime.container.dataset.areaCameraFrameSource).toBe("runtime_object_bounds");
    expect(runtime.container.dataset.areaCameraFrameRuntimeBounds).toBe(
      "-3.500,3.000,1.500..-2.500,5.000,2.500"
    );
    expect(runtime.controls.target.x).toBeCloseTo(-3);
    expect(runtime.controls.target.y).toBeCloseTo(4);
    expect(runtime.controls.target.z).toBeCloseTo(2);
    expect(runtime.camera.position.y).toBeGreaterThan(runtime.controls.target.y);
    expect(runtime.controls.update).toHaveBeenCalled();
  });

  it("frames object previews from InstancedMesh instance bounds", () => {
    const runtime = createRuntimeStub();
    const root = new THREE.Group();
    const particles = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial(),
      2
    );
    particles.setMatrixAt(0, new THREE.Matrix4().makeTranslation(2, 0, 0));
    particles.setMatrixAt(1, new THREE.Matrix4().makeTranslation(-4, 0, 1));
    particles.instanceMatrix.needsUpdate = true;
    root.add(particles);
    runtime.objectMeshById.set("preview:creature_vfx", root);

    expect(centerCameraForRuntimeObjectPreview(runtime)).toBe(true);

    expect(runtime.container.dataset.areaCameraFrameSource).toBe("runtime_object_bounds");
    expect(runtime.container.dataset.areaCameraFrameRuntimeBounds).toBe(
      "-4.500,-0.500,-0.500..2.500,0.500,1.500"
    );
    expect(runtime.controls.target.x).toBeCloseTo(-1);
    expect(runtime.controls.target.y).toBeCloseTo(0);
    expect(runtime.controls.target.z).toBeCloseTo(0.5);
    expect(runtime.controls.update).toHaveBeenCalled();
  });

  it("expands tiny object preview bounds from normalized model bounds", () => {
    const runtime = createRuntimeStub();
    runtime.container.dataset.placeableModelBounds = "2.000x0.000x3.000";
    const root = new THREE.Group();
    const tinyMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.01, 0.01, 0.01),
      new THREE.MeshBasicMaterial()
    );
    tinyMesh.position.set(0.5, 0, 0.02);
    root.add(tinyMesh);
    runtime.objectMeshById.set("preview:creature_air", root);

    expect(centerCameraForRuntimeObjectPreview(runtime)).toBe(true);

    expect(runtime.container.dataset.areaCameraFrameRuntimeBounds).toBe(
      "-0.500,-0.005,-1.480..1.500,0.005,1.520"
    );
    expect(runtime.container.dataset.areaCameraFrameSize).toBe("2.000x3.000");
    expect(runtime.controls.target.x).toBeCloseTo(0.5);
    expect(runtime.controls.target.z).toBeCloseTo(0.02);
    expect(runtime.controls.update).toHaveBeenCalled();
  });
});
