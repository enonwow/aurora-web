import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import {
  applyOrbitPointerBindings,
  applyTopDownOracleCameraLock,
  centerCameraForRuntimeObjectPreview,
  centerCameraForScene,
  createAuroraGltfLoadingManager,
  refitFocusedPerspectiveCameraForVisibleTerrain,
  refitTopDownOracleCameraForVisibleTerrain,
  resolveAuroraGltfTextureDependencyUrl,
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
    scene: new THREE.Scene(),
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

function addTerrainFootprint(
  runtime: ReturnType<typeof createRuntimeStub>,
  width: number,
  height: number
): THREE.Group {
  const footprint = new THREE.Group();
  footprint.name = "terrain-area-extent-footprint";
  const extent = new THREE.Mesh(new THREE.PlaneGeometry(width, height));
  extent.geometry.rotateX(-Math.PI / 2);
  extent.position.set(width / 2, 0, height / 2);
  footprint.add(extent);
  runtime.scene.add(footprint);
  return footprint;
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

describe("Aurora GLTF texture dependency routing", () => {
  it("substitutes protected external texture URIs handled by the authenticated contract pipeline", () => {
    const protectedUrl =
      "http://127.0.0.1:5173/_aurora/v1/settings/runtime/module-cache/textures/194c306c07a595fd0c2c2562?format=mtr&resref=tdm01_bone01";

    expect(resolveAuroraGltfTextureDependencyUrl(protectedUrl)).toMatch(
      /^data:image\/vnd-ms\.dds;base64,/u
    );
    expect(
      resolveAuroraGltfTextureDependencyUrl(
        "/api/v1/settings/runtime/module-cache/textures/194c306c07a595fd0c2c2562"
      )
    ).toMatch(/^data:image\/vnd-ms\.dds;base64,/u);
    expect(resolveAuroraGltfTextureDependencyUrl("/public/model-texture.png")).toBe(
      "/public/model-texture.png"
    );
  });

  it("installs the protected dependency resolver on every GLTF loading manager", () => {
    const onProtectedTextureDependency = vi.fn();
    const manager = createAuroraGltfLoadingManager(onProtectedTextureDependency);
    const protectedUrl =
      "/_aurora/v1/settings/runtime/module-cache/textures/194c306c07a595fd0c2c2562";

    expect(manager.resolveURL(protectedUrl)).toMatch(/^data:image\/vnd-ms\.dds;base64,/u);
    expect(onProtectedTextureDependency).toHaveBeenCalledWith(protectedUrl);
    expect(manager.resolveURL("/public/texture.png")).toBe("/public/texture.png");
  });
});

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
    expect(runtime.camera.position.distanceTo(runtime.controls.target)).toBeCloseTo(
      Number(runtime.container.dataset.areaCameraFrameDistance),
      3
    );
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

  it("keeps compact Aurora tile areas close enough to inspect", () => {
    const runtime = createRuntimeStub();
    const scene: AreaScene = {
      sceneId: "compact_tiles",
      areaName: "Compact tiles",
      width: 2,
      height: 2,
      tileSource: { type: "aurora_tile_list", tilesetResRef: "tni01", tileCount: 4 },
      tiles: [
        { id: "compact_tiles:r0:c0", row: 0, col: 0, terrain: "floor", orientation: 0, rotateTexture: false, plot: false, source: "aurora_tile_list" },
        { id: "compact_tiles:r0:c1", row: 0, col: 1, terrain: "floor", orientation: 0, rotateTexture: false, plot: false, source: "aurora_tile_list" },
        { id: "compact_tiles:r1:c0", row: 1, col: 0, terrain: "floor", orientation: 0, rotateTexture: false, plot: false, source: "aurora_tile_list" },
        { id: "compact_tiles:r1:c1", row: 1, col: 1, terrain: "floor", orientation: 0, rotateTexture: false, plot: false, source: "aurora_tile_list" }
      ],
      objects: [],
      updatedAtUnixMs: 0,
      source: "aurora_area"
    };

    centerCameraForScene(runtime, scene);

    expect(runtime.container.dataset.areaCameraFrameSize).toBe("2.000x2.000");
    expect(runtime.camera.position.distanceTo(runtime.controls.target)).toBeCloseTo(2.6, 3);
  });

  it("refits an Aurora area to loaded tile-model bounds when Fit Area is repeated", () => {
    const runtime = createRuntimeStub();
    addTerrainFootprint(runtime, 2, 2);
    const terrainLayer = new THREE.Group();
    terrainLayer.name = "terrain-backend-tile-models";
    const geometry = new THREE.BoxGeometry(8, 3, 6);
    const material = new THREE.MeshBasicMaterial();
    const model = new THREE.Mesh(geometry, material);
    model.position.set(4, 1.5, 3);
    terrainLayer.add(model);
    runtime.scene.add(terrainLayer);
    const scene: AreaScene = {
      sceneId: "loaded_tiles",
      areaName: "Loaded tiles",
      width: 2,
      height: 2,
      tileSource: { type: "aurora_tile_list", tilesetResRef: "tni01", tileCount: 4 },
      tiles: [
        { id: "loaded_tiles:r0:c0", row: 0, col: 0, terrain: "floor", orientation: 0, rotateTexture: false, plot: false, source: "aurora_tile_list" }
      ],
      objects: [],
      updatedAtUnixMs: 0,
      source: "aurora_area"
    };

    centerCameraForScene(runtime, scene);

    expect(runtime.container.dataset.areaCameraFrameStatus).toBe(
      "fit-selected-area-visible-terrain"
    );
    expect(runtime.container.dataset.areaCameraFrameAllowance).toBe("1.04");
    expect(runtime.container.dataset.areaCameraFrameSize).toBe("8.000x6.000");
    expect(runtime.controls.target.toArray()).toEqual([4, 1.5, 3]);
    expect(runtime.camera.position.distanceTo(runtime.controls.target)).toBeGreaterThan(8);
  });

  it("keeps a compact loaded Aurora tile area close enough for editing", () => {
    const runtime = createRuntimeStub();
    addTerrainFootprint(runtime, 2, 2);
    const terrainLayer = new THREE.Group();
    terrainLayer.name = "terrain-backend-tile-models";
    const geometry = new THREE.BoxGeometry(2, 0.5, 2);
    const material = new THREE.MeshBasicMaterial();
    const compactModel = new THREE.Mesh(geometry, material);
    compactModel.position.set(1, 0.25, 1);
    terrainLayer.add(compactModel);
    runtime.scene.add(terrainLayer);
    const scene: AreaScene = {
      sceneId: "compact_loaded_tiles",
      areaName: "Compact loaded tiles",
      width: 2,
      height: 2,
      tiles: [
        { id: "compact_loaded_tiles:r0:c0", row: 0, col: 0, terrain: "floor", orientation: 0, rotateTexture: false, plot: false, source: "aurora_tile_list" }
      ],
      objects: [],
      updatedAtUnixMs: 0,
      source: "aurora_area"
    };

    centerCameraForScene(runtime, scene);

    expect(runtime.container.dataset.areaCameraFrameStatus).toBe(
      "fit-selected-area-visible-terrain"
    );
    expect(runtime.camera.position.distanceTo(runtime.controls.target)).toBeLessThan(3.4);
    expect(runtime.camera.position.distanceTo(runtime.controls.target)).toBeGreaterThan(3);
  });

  it("reframes loaded terrain after a narrow editor viewport expands to Full View", () => {
    const runtime = createRuntimeStub();
    addTerrainFootprint(runtime, 2, 2);
    const terrainLayer = new THREE.Group();
    terrainLayer.name = "terrain-backend-tile-models";
    terrainLayer.add(new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 2), new THREE.MeshBasicMaterial()));
    runtime.scene.add(terrainLayer);
    const scene: AreaScene = {
      sceneId: "fullscreen_refit_tiles",
      areaName: "Fullscreen refit tiles",
      width: 2,
      height: 2,
      tiles: [
        { id: "fullscreen_refit_tiles:r0:c0", row: 0, col: 0, terrain: "floor", orientation: 0, rotateTexture: false, plot: false, source: "aurora_tile_list" }
      ],
      objects: [],
      updatedAtUnixMs: 0,
      source: "aurora_area"
    };

    runtime.camera.aspect = 0.35;
    runtime.camera.updateProjectionMatrix();
    centerCameraForScene(runtime, scene);
    const narrowDistance = runtime.camera.position.distanceTo(runtime.controls.target);

    runtime.camera.aspect = 1;
    runtime.camera.updateProjectionMatrix();
    expect(refitFocusedPerspectiveCameraForVisibleTerrain(runtime)).toBe(true);

    const fullViewDistance = runtime.camera.position.distanceTo(runtime.controls.target);
    expect(fullViewDistance).toBeLessThan(narrowDistance * 0.5);
    expect(runtime.container.dataset.areaCameraFrameAllowance).toBe("1.04");
  });

  it("keeps every corner of a wide loaded Area inside the Full View frustum", () => {
    const runtime = createRuntimeStub();
    addTerrainFootprint(runtime, 32, 20);
    runtime.camera.aspect = 927 / 915;
    runtime.camera.updateProjectionMatrix();
    const terrainLayer = new THREE.Group();
    terrainLayer.name = "terrain-backend-tile-models";
    const terrainBounds = new THREE.Box3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(32, 0.55, 20)
    );
    const terrain = new THREE.Mesh(
      new THREE.BoxGeometry(32, 0.55, 20),
      new THREE.MeshBasicMaterial()
    );
    terrain.position.set(16, 0.275, 10);
    terrainLayer.add(terrain);
    runtime.scene.add(terrainLayer);
    const scene: AreaScene = {
      sceneId: "wide_fullscreen_tiles",
      areaName: "Wide fullscreen tiles",
      width: 32,
      height: 20,
      tiles: [
        { id: "wide_fullscreen_tiles:r0:c0", row: 0, col: 0, terrain: "floor", orientation: 0, rotateTexture: false, plot: false, source: "aurora_tile_list" }
      ],
      objects: [],
      updatedAtUnixMs: 0,
      source: "aurora_area"
    };

    centerCameraForScene(runtime, scene);
    runtime.camera.updateMatrixWorld(true);

    const projectedCorners = [
      new THREE.Vector3(terrainBounds.min.x, terrainBounds.min.y, terrainBounds.min.z),
      new THREE.Vector3(terrainBounds.min.x, terrainBounds.min.y, terrainBounds.max.z),
      new THREE.Vector3(terrainBounds.min.x, terrainBounds.max.y, terrainBounds.min.z),
      new THREE.Vector3(terrainBounds.min.x, terrainBounds.max.y, terrainBounds.max.z),
      new THREE.Vector3(terrainBounds.max.x, terrainBounds.min.y, terrainBounds.min.z),
      new THREE.Vector3(terrainBounds.max.x, terrainBounds.min.y, terrainBounds.max.z),
      new THREE.Vector3(terrainBounds.max.x, terrainBounds.max.y, terrainBounds.min.z),
      new THREE.Vector3(terrainBounds.max.x, terrainBounds.max.y, terrainBounds.max.z)
    ].map((corner) => corner.project(runtime.camera));

    projectedCorners.forEach((corner) => {
      expect(Math.abs(corner.x)).toBeLessThan(1);
      expect(Math.abs(corner.y)).toBeLessThan(1);
      expect(corner.z).toBeGreaterThan(-1);
      expect(corner.z).toBeLessThan(1);
    });
    expect(runtime.container.dataset.areaCameraFrameSize).toBe("32.000x20.000");
    expect(runtime.container.dataset.areaCameraFrameAllowance).toBe("1.04");
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
    expect(runtime.container.dataset.areaCameraFrameCoverageStatus).toBe("pass");
    expect(runtime.container.dataset.areaCameraFrameClippedCornerCount).toBe("0");
    expect(runtime.container.dataset.areaCameraFrameFov).toBe("5.000");
    expect(runtime.container.dataset.areaCameraFrameDistance).toBe("51.304");
    expect(runtime.camera.up.toArray()).toEqual([0, 0, 1]);
    expect(runtime.camera.fov).toBeCloseTo(5);
    expect(runtime.camera.position.y - runtime.controls.target.y).toBeCloseTo(51.304, 3);
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
    expect(runtime.camera.position.y - runtime.controls.target.y).toBeCloseTo(51.304, 3);
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

  it("refits a top-down oracle camera to loaded terrain that extends above the ARE grid", () => {
    const runtime = createRuntimeStub();
    const scene: AreaScene = {
      sceneId: "tall_terrain",
      areaName: "Tall terrain",
      width: 2,
      height: 2,
      tiles: [],
      objects: [],
      updatedAtUnixMs: 0,
      source: "aurora_area"
    };
    setTopDownOracleCameraForScene(runtime, scene);
    addTerrainFootprint(runtime, 2, 2);
    const terrain = new THREE.Group();
    terrain.name = "terrain-backend-tile-models";
    const tallPit = new THREE.Mesh(new THREE.BoxGeometry(3, 6, 2));
    tallPit.position.set(1.5, -1, 1);
    terrain.add(tallPit);
    runtime.scene.add(terrain);

    expect(refitTopDownOracleCameraForVisibleTerrain(runtime)).toBe(true);
    expect(runtime.container.dataset.areaCameraFrameSource).toBe("runtime_terrain_bounds");
    expect(runtime.container.dataset.areaCameraFrameBoundsPolicy).toBe(
      "footprint_xz_connected_visible_terrain/v1"
    );
    expect(runtime.container.dataset.areaCameraFrameRuntimeBoundsPolicyStatus).toBe(
      "within_footprint_connected_bounds"
    );
    expect(runtime.controls.target.x).toBeCloseTo(1.5);
    expect(runtime.controls.target.z).toBeCloseTo(1);
    // The framing distance must include the terrain's top Y extent; otherwise
    // high cave/pit meshes crop in an apparently broken top-down proof.
    expect(runtime.camera.position.y - runtime.controls.target.y).toBeGreaterThan(35);
  });

  it("refits a focused perspective camera to the complete loaded terrain bounds", () => {
    const runtime = createRuntimeStub();
    addTerrainFootprint(runtime, 4, 4);
    runtime.container.dataset.areaCameraFrameMode = "focused_perspective";
    runtime.container.dataset.areaCameraFrameSource = "areas-runtime-cdp-capture";
    runtime.controls.target.set(2, 0.22, 2);
    runtime.camera.position.set(3.4, 2.7, 3.4);
    runtime.camera.lookAt(runtime.controls.target);
    const terrain = new THREE.Group();
    terrain.name = "terrain-backend-tile-models";
    const tallTerrain = new THREE.Mesh(new THREE.BoxGeometry(6, 10, 4));
    tallTerrain.position.set(2, 3, 2);
    terrain.add(tallTerrain);
    runtime.scene.add(terrain);

    expect(refitFocusedPerspectiveCameraForVisibleTerrain(runtime)).toBe(true);
    expect(runtime.container.dataset.areaCameraFrameStatus).toBe(
      "focused-perspective-visible-terrain"
    );
    expect(runtime.container.dataset.areaCameraFrameSource).toBe(
      "areas-runtime-cdp-capture+visible-terrain-bounds"
    );
    expect(runtime.controls.target.toArray()).toEqual([2, 3, 2]);
    expect(runtime.camera.position.distanceTo(runtime.controls.target)).toBeGreaterThan(14);
    expect(runtime.container.dataset.areaCameraFrameRuntimeBounds).toBe(
      "-1.000,-2.000,0.000..5.000,8.000,4.000"
    );
    expect(refitFocusedPerspectiveCameraForVisibleTerrain(runtime)).toBe(true);
    expect(runtime.container.dataset.areaCameraFrameSource).toBe(
      "areas-runtime-cdp-capture+visible-terrain-bounds"
    );
  });

  it("includes the visible Area footprint when focused terrain occupies only one cell", () => {
    const runtime = createRuntimeStub();
    runtime.container.dataset.areaCameraFrameMode = "focused_perspective";
    runtime.container.dataset.areaCameraFrameSource = "areas-runtime-cdp-capture";
    runtime.controls.target.set(1.5, 0.2, 0.5);
    runtime.camera.position.set(3, 2, 2);
    runtime.camera.lookAt(runtime.controls.target);

    const terrain = new THREE.Group();
    terrain.name = "terrain-backend-tile-models";
    const oneCellModel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.5));
    oneCellModel.position.set(1.5, 0.3, 0.5);
    terrain.add(oneCellModel);
    runtime.scene.add(terrain);

    addTerrainFootprint(runtime, 2, 2);

    expect(refitFocusedPerspectiveCameraForVisibleTerrain(runtime)).toBe(true);
    expect(runtime.controls.target.x).toBeCloseTo(1);
    expect(runtime.controls.target.z).toBeCloseTo(1);
    expect(runtime.container.dataset.areaCameraFrameSize).toBe("2.000x2.000");
  });

  it("keeps a remote source mesh island visible without letting it control a 4x2 proof camera", () => {
    const runtime = createRuntimeStub();
    const scene: AreaScene = {
      sceneId: "lca03_remote_island",
      areaName: "lca03 remote island",
      width: 4,
      height: 2,
      tiles: [],
      objects: [],
      updatedAtUnixMs: 0,
      source: "aurora_area"
    };
    setTopDownOracleCameraForScene(runtime, scene);
    const initialTarget = runtime.controls.target.clone();
    const initialDistance = runtime.camera.position.distanceTo(runtime.controls.target);
    addTerrainFootprint(runtime, 4, 2);

    const terrain = new THREE.Group();
    terrain.name = "terrain-backend-tile-models";
    const areaMesh = new THREE.Mesh(
      new THREE.BoxGeometry(4, 0.5, 2),
      new THREE.MeshBasicMaterial()
    );
    areaMesh.position.set(2, 0.25, 1);
    terrain.add(areaMesh);
    const remoteMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.03, 0.46, 1.13),
      new THREE.MeshBasicMaterial()
    );
    remoteMesh.name = "Geom808";
    remoteMesh.position.set(31.75, -1.75, 15.75);
    terrain.add(remoteMesh);
    runtime.scene.add(terrain);
    const originalParent = remoteMesh.parent;
    const originalPosition = remoteMesh.position.clone();

    expect(refitTopDownOracleCameraForVisibleTerrain(runtime)).toBe(true);
    expect(runtime.controls.target.x).toBeCloseTo(initialTarget.x);
    expect(runtime.controls.target.z).toBeCloseTo(initialTarget.z);
    expect(runtime.camera.position.distanceTo(runtime.controls.target)).toBeCloseTo(
      initialDistance + 0.5
    );
    expect(runtime.camera.position.distanceTo(runtime.controls.target)).toBeLessThan(100);
    expect(remoteMesh.visible).toBe(true);
    expect(remoteMesh.parent).toBe(originalParent);
    expect(remoteMesh.position.toArray()).toEqual(originalPosition.toArray());
    expect(runtime.scene.getObjectByName("Geom808")).toBe(remoteMesh);
    expect(runtime.container.dataset.areaCameraFrameBoundsPolicy).toBe(
      "footprint_xz_connected_visible_terrain/v1"
    );
    expect(runtime.container.dataset.areaCameraFrameRuntimeBoundsPolicyStatus).toBe(
      "runtime_bounds_outlier"
    );
    expect(runtime.container.dataset.areaCameraFrameExcludedMeshCount).toBe("1");
    expect(runtime.container.dataset.areaCameraFrameExcludedMeshSample).toContain("Geom808");
    expect(runtime.container.dataset.areaCameraFrameObservedTerrainBounds).toContain("32.265");
    expect(runtime.container.dataset.areaCameraFrameCoverageStatus).toBe("pass");
  });

  it("includes a complete overhanging mesh when its XZ bounds intersect the Area footprint", () => {
    const runtime = createRuntimeStub();
    const scene: AreaScene = {
      sceneId: "connected_overhang",
      areaName: "Connected overhang",
      width: 2,
      height: 2,
      tiles: [],
      objects: [],
      updatedAtUnixMs: 0,
      source: "aurora_area"
    };
    setTopDownOracleCameraForScene(runtime, scene);
    addTerrainFootprint(runtime, 2, 2);
    const terrain = new THREE.Group();
    terrain.name = "terrain-backend-tile-models";
    const overhang = new THREE.Mesh(
      new THREE.BoxGeometry(2, 6, 1),
      new THREE.MeshBasicMaterial()
    );
    overhang.position.set(0, 1, 1);
    terrain.add(overhang);
    runtime.scene.add(terrain);

    expect(refitTopDownOracleCameraForVisibleTerrain(runtime)).toBe(true);
    expect(runtime.container.dataset.areaCameraFrameRuntimeBoundsPolicyStatus).toBe(
      "within_footprint_connected_bounds"
    );
    expect(runtime.container.dataset.areaCameraFrameExcludedMeshCount).toBe("0");
    expect(runtime.container.dataset.areaCameraFrameSize).toBe("3.000x2.000");
    expect(runtime.container.dataset.areaCameraFrameBoundsDigest).toContain("-1.000:2.000");
    expect(runtime.container.dataset.areaCameraFrameBoundsDigest).toContain("-2.000:4.000");
  });

  it("fails closed instead of refitting from unbound terrain meshes when the Area footprint is missing", () => {
    const runtime = createRuntimeStub();
    runtime.container.dataset.areaCameraFrameMode = "top_down_oracle";
    const terrain = new THREE.Group();
    terrain.name = "terrain-backend-tile-models";
    terrain.add(new THREE.Mesh(new THREE.BoxGeometry(2, 1, 2)));
    runtime.scene.add(terrain);

    expect(refitTopDownOracleCameraForVisibleTerrain(runtime)).toBe(false);
    expect(runtime.container.dataset.areaCameraFrameRuntimeBoundsPolicyStatus).toBe(
      "logical_footprint_missing"
    );
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
