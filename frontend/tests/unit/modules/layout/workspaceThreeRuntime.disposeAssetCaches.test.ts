import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";

import {
  disposeRuntime,
  type RuntimeState,
} from "../../../../src/modules/layout/adapters/three/workspaceThreeRuntime";

describe("workspace runtime scene-cache disposal", () => {
  it("releases model, normalized-model, texture, pending, and GPU resources when a scene runtime leaves", () => {
    const texture = new THREE.Texture();
    const textureDispose = vi.spyOn(texture, "dispose");
    const modelGeometry = new THREE.BufferGeometry();
    const modelMaterial = new THREE.MeshBasicMaterial();
    const modelGeometryDispose = vi.spyOn(modelGeometry, "dispose");
    const modelMaterialDispose = vi.spyOn(modelMaterial, "dispose");
    const model = new THREE.Object3D();
    model.add(new THREE.Mesh(modelGeometry, modelMaterial));
    const normalizedMaterial = new THREE.MeshBasicMaterial();
    const normalizedMaterialDispose = vi.spyOn(normalizedMaterial, "dispose");
    const normalizedModel = new THREE.Object3D();
    normalizedModel.add(new THREE.Mesh(new THREE.BufferGeometry(), normalizedMaterial));
    const primitiveGeometry = new THREE.BufferGeometry();
    const primitiveGeometryDispose = vi.spyOn(primitiveGeometry, "dispose");
    const rendererElement = document.createElement("canvas");
    document.body.append(rendererElement);
    const rendererDispose = vi.fn();
    const controlsDispose = vi.fn();
    const transformControlsDispose = vi.fn();
    const scene = new THREE.Scene();
    const transformAnchor = new THREE.Object3D();
    const transformHelper = new THREE.Object3D();
    scene.add(transformAnchor, transformHelper);

    const runtime = {
      frameId: null,
      resizeObserver: null,
      objectAnimationMixersById: new Map(),
      auroraTextureCycleRuntimesByObjectId: new Map(),
      objectMeshById: new Map(),
      container: document.createElement("div"),
      tileMesh: null,
      objectLayer: new THREE.Group(),
      objectPrimitiveGeometryCache: new Map([["primitive", primitiveGeometry]]),
      boundsHelpers: [],
      boundsLayer: new THREE.Group(),
      chunkLayer: new THREE.Group(),
      gridLayer: new THREE.Group(),
      tileOverlayLayer: new THREE.Group(),
      gizmoLayer: new THREE.Group(),
      placeableTexturePendingByUrl: new Map([["texture", Promise.resolve(texture)]]),
      placeableTextureCacheByUrl: new Map([["texture", texture]]),
      placeableModelPendingByUrl: new Map([["model", Promise.resolve(model)]]),
      placeableNormalizedModelPendingByKey: new Map([["normalized", Promise.resolve(null)]]),
      placeableNormalizedModelCacheByKey: new Map([["normalized", normalizedModel]]),
      placeableModelCacheByUrl: new Map([["model", model]]),
      transformControls: {
        detach: vi.fn(),
        dispose: transformControlsDispose,
        getHelper: () => transformHelper,
      },
      transformAnchor,
      scene,
      controls: { dispose: controlsDispose },
      auroraRetailBloomPass: null,
      renderer: { dispose: rendererDispose, domElement: rendererElement },
    } as unknown as RuntimeState;

    disposeRuntime(runtime);

    expect(runtime.placeableTexturePendingByUrl.size).toBe(0);
    expect(runtime.placeableTextureCacheByUrl.size).toBe(0);
    expect(runtime.placeableModelPendingByUrl.size).toBe(0);
    expect(runtime.placeableNormalizedModelPendingByKey.size).toBe(0);
    expect(runtime.placeableNormalizedModelCacheByKey.size).toBe(0);
    expect(runtime.placeableModelCacheByUrl.size).toBe(0);
    expect(runtime.objectPrimitiveGeometryCache.size).toBe(0);
    expect(textureDispose).toHaveBeenCalledOnce();
    expect(modelGeometryDispose).toHaveBeenCalledOnce();
    expect(modelMaterialDispose).toHaveBeenCalledOnce();
    expect(normalizedMaterialDispose).toHaveBeenCalledOnce();
    expect(primitiveGeometryDispose).toHaveBeenCalledOnce();
    expect(controlsDispose).toHaveBeenCalledOnce();
    expect(transformControlsDispose).toHaveBeenCalledOnce();
    expect(rendererDispose).toHaveBeenCalledOnce();
    expect(rendererElement.isConnected).toBe(false);
  });
});
