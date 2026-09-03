import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";

import {
  ensurePlaceableModel,
  ensurePlaceableTexture,
  PLACEABLE_ASSET_CACHE_MISS_EVENT,
  type PlaceableAssetCacheMissEventDetail,
  type PlaceableModelRuntimeCache,
  type PlaceableTextureRuntimeCache
} from "../../../../src/modules/placeables/adapters/three/placeableThreeAssetLoader";
import {
  isPlaceableCacheNotFoundEnvelope,
  resolvePlaceableAssetDeliveryCacheKey
} from "../../../../src/modules/placeables/domain/placeableCacheMiss";

const CACHE_MISS_PAYLOAD = {
  error: {
    code: "PLACEABLE_CACHE_NOT_FOUND",
    message: "cache was reset"
  }
};

const createCacheMissResponse = (status = 404) => ({
  ok: false,
  status,
  arrayBuffer: async () => new ArrayBuffer(0),
  clone: () => ({
    ok: false,
    status,
    arrayBuffer: async () => new ArrayBuffer(0),
    json: async () => CACHE_MISS_PAYLOAD
  })
});

const createAssetNotFoundResponse = () => ({
  ...createCacheMissResponse(),
  clone: () => ({
    ...createCacheMissResponse(),
    json: async () => ({ error: { code: "PLACEABLE_ASSET_NOT_FOUND" } })
  })
});

describe("placeable asset cache-miss recovery signal", () => {
  it("extracts only an exact placeable binary delivery cache key", () => {
    expect(resolvePlaceableAssetDeliveryCacheKey(
      "http://127.0.0.1:3000/api/v1/catalog/placeables/cache/cache%5Fone/assets/model.glb?x=1"
    )).toBe("cache_one");
    expect(resolvePlaceableAssetDeliveryCacheKey(
      "/api/v1/catalog/placeables/cache/cache_one/assets/contracts"
    )).toBe("cache_one");
    expect(resolvePlaceableAssetDeliveryCacheKey(
      "/api/v1/catalog/placeables/cache/cache_one"
    )).toBeNull();
    expect(resolvePlaceableAssetDeliveryCacheKey(
      "/api/v1/catalog/items/cache/cache_one/assets/model.glb"
    )).toBeNull();
    expect(resolvePlaceableAssetDeliveryCacheKey(
      "/api/v1/catalog/placeables/cache/cache%2Fescape/assets/model.glb"
    )).toBeNull();
    expect(resolvePlaceableAssetDeliveryCacheKey(
      "/api/v1/catalog/placeables/cache/cache_one/assets/model.glb/extra"
    )).toBeNull();
  });

  it("recognizes only an exact own-property cache-miss envelope", () => {
    const inheritedError = Object.create({
      error: { code: "PLACEABLE_CACHE_NOT_FOUND" }
    }) as object;

    expect(isPlaceableCacheNotFoundEnvelope(CACHE_MISS_PAYLOAD)).toBe(true);
    expect(isPlaceableCacheNotFoundEnvelope(null)).toBe(false);
    expect(isPlaceableCacheNotFoundEnvelope("PLACEABLE_CACHE_NOT_FOUND")).toBe(false);
    expect(isPlaceableCacheNotFoundEnvelope([])).toBe(false);
    expect(isPlaceableCacheNotFoundEnvelope({})).toBe(false);
    expect(isPlaceableCacheNotFoundEnvelope(inheritedError)).toBe(false);
    expect(isPlaceableCacheNotFoundEnvelope({ error: null })).toBe(false);
    expect(isPlaceableCacheNotFoundEnvelope({ error: "PLACEABLE_CACHE_NOT_FOUND" })).toBe(false);
    expect(isPlaceableCacheNotFoundEnvelope({ error: {} })).toBe(false);
    expect(isPlaceableCacheNotFoundEnvelope({
      error: { code: "PLACEABLE_ASSET_NOT_FOUND" }
    })).toBe(false);
  });

  it("stops model same-URL retries and emits one exact cache-miss event", async () => {
    const container = document.createElement("div");
    const events: PlaceableAssetCacheMissEventDetail[] = [];
    container.addEventListener(PLACEABLE_ASSET_CACHE_MISS_EVENT, (event) => {
      events.push((event as CustomEvent<PlaceableAssetCacheMissEventDetail>).detail);
    });
    const modelFetch = vi.fn(async () => createCacheMissResponse());
    const modelLoader = {
      load: vi.fn(),
      parse: vi.fn()
    };
    const runtime: PlaceableModelRuntimeCache = {
      placeableModelLoader: modelLoader,
      placeableModelFetch: modelFetch,
      placeableModelCacheByUrl: new Map<string, THREE.Object3D>(),
      placeableModelPendingByUrl: new Map<string, Promise<THREE.Object3D | null>>(),
      placeableNormalizedModelCacheByKey: new Map<string, THREE.Object3D>(),
      placeableNormalizedModelPendingByKey: new Map<string, Promise<THREE.Object3D | null>>(),
      container
    };
    const url = "/api/v1/catalog/placeables/cache/cache_model/assets/model.glb";

    await expect(ensurePlaceableModel(runtime, url)).resolves.toBeNull();
    await expect(ensurePlaceableModel(runtime, url)).resolves.toBeNull();

    expect(modelFetch).toHaveBeenCalledTimes(2);
    expect(modelFetch).toHaveBeenCalledWith(url, expect.any(Object));
    expect(modelLoader.load).not.toHaveBeenCalled();
    expect(modelLoader.parse).not.toHaveBeenCalled();
    expect(events).toEqual([
      {
        cacheKey: "cache_model",
        url,
        status: 404,
        assetKind: "model",
        code: "PLACEABLE_CACHE_NOT_FOUND"
      }
    ]);
  });

  it("stops texture decode and loader retries after the exact cache-miss response", async () => {
    const container = document.createElement("div");
    const events: PlaceableAssetCacheMissEventDetail[] = [];
    container.addEventListener(PLACEABLE_ASSET_CACHE_MISS_EVENT, (event) => {
      events.push((event as CustomEvent<PlaceableAssetCacheMissEventDetail>).detail);
    });
    const textureFetch = vi.fn(async () => createCacheMissResponse());
    const loader = { load: vi.fn() };
    const runtime: PlaceableTextureRuntimeCache = {
      placeableTextureLoader: loader,
      placeableDdsTextureLoader: loader,
      placeableTgaTextureLoader: loader,
      placeableTextureFetch: textureFetch,
      placeableTextureCacheByUrl: new Map<string, THREE.Texture>(),
      placeableTexturePendingByUrl: new Map<string, Promise<THREE.Texture | null>>(),
      container
    };
    const url = "/api/v1/catalog/placeables/cache/cache_texture/assets/texture.dds";

    await expect(ensurePlaceableTexture(runtime, url)).resolves.toBeNull();

    expect(textureFetch).toHaveBeenCalledTimes(1);
    expect(loader.load).not.toHaveBeenCalled();
    expect(events).toEqual([
      {
        cacheKey: "cache_texture",
        url,
        status: 404,
        assetKind: "texture",
        code: "PLACEABLE_CACHE_NOT_FOUND"
      }
    ]);
  });

  it("retains the bounded decode retry before fallback for an ordinary texture miss", async () => {
    const loadedTexture = new THREE.Texture();
    const textureFetch = vi.fn(async () => createAssetNotFoundResponse());
    const loader = {
      load: vi.fn((
        _url: string,
        onLoad: (texture: THREE.Texture) => void
      ) => onLoad(loadedTexture))
    };
    const runtime: PlaceableTextureRuntimeCache = {
      placeableTextureLoader: loader,
      placeableDdsTextureLoader: loader,
      placeableTgaTextureLoader: loader,
      placeableTextureFetch: textureFetch,
      placeableTextureCacheByUrl: new Map<string, THREE.Texture>(),
      placeableTexturePendingByUrl: new Map<string, Promise<THREE.Texture | null>>(),
      container: document.createElement("div")
    };

    await expect(
      ensurePlaceableTexture(
        runtime,
        "/api/v1/catalog/placeables/cache/cache_texture/assets/texture.tga"
      )
    ).resolves.toBe(loadedTexture);

    expect(textureFetch).toHaveBeenCalledTimes(2);
    expect(loader.load).toHaveBeenCalledTimes(1);
  });

  it("does not classify an asset-not-found 404 as a cache reset", async () => {
    const container = document.createElement("div");
    const eventListener = vi.fn();
    container.addEventListener(PLACEABLE_ASSET_CACHE_MISS_EVENT, eventListener);
    const modelFetch = vi.fn(async () => createAssetNotFoundResponse());
    const runtime: PlaceableModelRuntimeCache = {
      placeableModelLoader: { load: vi.fn(), parse: vi.fn() },
      placeableModelFetch: modelFetch,
      placeableModelCacheByUrl: new Map<string, THREE.Object3D>(),
      placeableModelPendingByUrl: new Map<string, Promise<THREE.Object3D | null>>(),
      placeableNormalizedModelCacheByKey: new Map<string, THREE.Object3D>(),
      placeableNormalizedModelPendingByKey: new Map<string, Promise<THREE.Object3D | null>>(),
      container
    };

    await expect(
      ensurePlaceableModel(
        runtime,
        "/api/v1/catalog/placeables/cache/cache_model/assets/missing.glb"
      )
    ).resolves.toBeNull();

    expect(modelFetch).toHaveBeenCalledTimes(3);
    expect(eventListener).not.toHaveBeenCalled();
  });

  it("does not classify the exact envelope under a non-404 status", async () => {
    const container = document.createElement("div");
    const eventListener = vi.fn();
    container.addEventListener(PLACEABLE_ASSET_CACHE_MISS_EVENT, eventListener);
    const modelFetch = vi.fn(async () => createCacheMissResponse(500));
    const runtime: PlaceableModelRuntimeCache = {
      placeableModelLoader: { load: vi.fn(), parse: vi.fn() },
      placeableModelFetch: modelFetch,
      placeableModelCacheByUrl: new Map<string, THREE.Object3D>(),
      placeableModelPendingByUrl: new Map<string, Promise<THREE.Object3D | null>>(),
      placeableNormalizedModelCacheByKey: new Map<string, THREE.Object3D>(),
      placeableNormalizedModelPendingByKey: new Map<string, Promise<THREE.Object3D | null>>(),
      container
    };

    await expect(
      ensurePlaceableModel(
        runtime,
        "/api/v1/catalog/placeables/cache/cache_model/assets/error.glb"
      )
    ).resolves.toBeNull();

    expect(modelFetch).toHaveBeenCalledTimes(3);
    expect(eventListener).not.toHaveBeenCalled();
  });

  it("fails closed when a 404 response has a malformed JSON envelope", async () => {
    const container = document.createElement("div");
    const eventListener = vi.fn();
    container.addEventListener(PLACEABLE_ASSET_CACHE_MISS_EVENT, eventListener);
    const modelFetch = vi.fn(async () => ({
      ...createCacheMissResponse(),
      clone: () => ({
        ...createCacheMissResponse(),
        json: async () => {
          throw new SyntaxError("malformed JSON");
        }
      })
    }));
    const runtime: PlaceableModelRuntimeCache = {
      placeableModelLoader: { load: vi.fn(), parse: vi.fn() },
      placeableModelFetch: modelFetch,
      placeableModelCacheByUrl: new Map<string, THREE.Object3D>(),
      placeableModelPendingByUrl: new Map<string, Promise<THREE.Object3D | null>>(),
      placeableNormalizedModelCacheByKey: new Map<string, THREE.Object3D>(),
      placeableNormalizedModelPendingByKey: new Map<string, Promise<THREE.Object3D | null>>(),
      container
    };

    await expect(
      ensurePlaceableModel(
        runtime,
        "/api/v1/catalog/placeables/cache/cache_model/assets/malformed.glb"
      )
    ).resolves.toBeNull();

    expect(modelFetch).toHaveBeenCalledTimes(3);
    expect(eventListener).not.toHaveBeenCalled();
  });

  it("does not emit for an exact envelope outside a cache delivery URL", async () => {
    const container = document.createElement("div");
    const eventListener = vi.fn();
    container.addEventListener(PLACEABLE_ASSET_CACHE_MISS_EVENT, eventListener);
    const modelFetch = vi.fn(async () => createCacheMissResponse());
    const runtime: PlaceableModelRuntimeCache = {
      placeableModelLoader: { load: vi.fn(), parse: vi.fn() },
      placeableModelFetch: modelFetch,
      placeableModelCacheByUrl: new Map<string, THREE.Object3D>(),
      placeableModelPendingByUrl: new Map<string, Promise<THREE.Object3D | null>>(),
      placeableNormalizedModelCacheByKey: new Map<string, THREE.Object3D>(),
      placeableNormalizedModelPendingByKey: new Map<string, Promise<THREE.Object3D | null>>(),
      container
    };

    await expect(ensurePlaceableModel(runtime, "/unscoped/model.glb")).resolves.toBeNull();

    expect(modelFetch).toHaveBeenCalledTimes(3);
    expect(eventListener).not.toHaveBeenCalled();
  });

  it("records an exact miss safely when the runtime has no event container", async () => {
    const modelFetch = vi.fn(async () => createCacheMissResponse());
    const runtime: PlaceableModelRuntimeCache = {
      placeableModelLoader: { load: vi.fn(), parse: vi.fn() },
      placeableModelFetch: modelFetch,
      placeableModelCacheByUrl: new Map<string, THREE.Object3D>(),
      placeableModelPendingByUrl: new Map<string, Promise<THREE.Object3D | null>>(),
      placeableNormalizedModelCacheByKey: new Map<string, THREE.Object3D>(),
      placeableNormalizedModelPendingByKey: new Map<string, Promise<THREE.Object3D | null>>()
    };

    await expect(
      ensurePlaceableModel(
        runtime,
        "/api/v1/catalog/placeables/cache/cache_model/assets/model.glb"
      )
    ).resolves.toBeNull();
    expect(modelFetch).toHaveBeenCalledTimes(1);
  });

  it("does not fall through from an authorized object-URL fetch after an exact miss", async () => {
    const createObjectUrlDescriptor = Object.getOwnPropertyDescriptor(URL, "createObjectURL");
    const revokeObjectUrlDescriptor = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL");
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:placeable-texture")
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn()
    });
    try {
      const container = document.createElement("div");
      const eventListener = vi.fn();
      container.addEventListener(PLACEABLE_ASSET_CACHE_MISS_EVENT, eventListener);
      const textureFetch = vi.fn(async () => createCacheMissResponse());
      const loader = { load: vi.fn() };
      const runtime: PlaceableTextureRuntimeCache = {
        placeableTextureLoader: loader,
        placeableDdsTextureLoader: loader,
        placeableTgaTextureLoader: loader,
        placeableTextureFetch: textureFetch,
        placeableTextureRequestHeader: { Authorization: "Bearer token" },
        placeableTextureCacheByUrl: new Map<string, THREE.Texture>(),
        placeableTexturePendingByUrl: new Map<string, Promise<THREE.Texture | null>>(),
        container
      };
      const url = "/api/v1/catalog/placeables/cache/cache_texture/assets/texture.png";

      await expect(ensurePlaceableTexture(runtime, url)).resolves.toBeNull();

      expect(textureFetch).toHaveBeenCalledTimes(1);
      expect(loader.load).not.toHaveBeenCalled();
      expect(eventListener).toHaveBeenCalledTimes(1);
    } finally {
      if (createObjectUrlDescriptor) {
        Object.defineProperty(URL, "createObjectURL", createObjectUrlDescriptor);
      } else {
        Reflect.deleteProperty(URL, "createObjectURL");
      }
      if (revokeObjectUrlDescriptor) {
        Object.defineProperty(URL, "revokeObjectURL", revokeObjectUrlDescriptor);
      } else {
        Reflect.deleteProperty(URL, "revokeObjectURL");
      }
    }
  });

  it("falls through to the loader after an authorized non-cache texture miss", async () => {
    const createObjectUrlDescriptor = Object.getOwnPropertyDescriptor(URL, "createObjectURL");
    const revokeObjectUrlDescriptor = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL");
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:placeable-texture")
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn()
    });
    try {
      const loadedTexture = new THREE.Texture();
      const textureFetch = vi.fn(async () => createAssetNotFoundResponse());
      const loader = {
        load: vi.fn((
          _url: string,
          onLoad: (texture: THREE.Texture) => void
        ) => onLoad(loadedTexture))
      };
      const runtime: PlaceableTextureRuntimeCache = {
        placeableTextureLoader: loader,
        placeableDdsTextureLoader: loader,
        placeableTgaTextureLoader: loader,
        placeableTextureFetch: textureFetch,
        placeableTextureRequestHeader: { Authorization: "Bearer token" },
        placeableTextureCacheByUrl: new Map<string, THREE.Texture>(),
        placeableTexturePendingByUrl: new Map<string, Promise<THREE.Texture | null>>(),
        container: document.createElement("div")
      };

      await expect(
        ensurePlaceableTexture(
          runtime,
          "/api/v1/catalog/placeables/cache/cache_texture/assets/texture.png"
        )
      ).resolves.toBe(loadedTexture);

      expect(textureFetch).toHaveBeenCalledTimes(1);
      expect(loader.load).toHaveBeenCalledTimes(1);
    } finally {
      if (createObjectUrlDescriptor) {
        Object.defineProperty(URL, "createObjectURL", createObjectUrlDescriptor);
      } else {
        Reflect.deleteProperty(URL, "createObjectURL");
      }
      if (revokeObjectUrlDescriptor) {
        Object.defineProperty(URL, "revokeObjectURL", revokeObjectUrlDescriptor);
      } else {
        Reflect.deleteProperty(URL, "revokeObjectURL");
      }
    }
  });

  it("continues through the ordinary texture loader when no cache miss was recorded", async () => {
    const loadedTexture = new THREE.Texture();
    const loader = {
      load: vi.fn((
        _url: string,
        onLoad: (texture: THREE.Texture) => void
      ) => onLoad(loadedTexture))
    };
    const runtime: PlaceableTextureRuntimeCache = {
      placeableTextureLoader: loader,
      placeableDdsTextureLoader: loader,
      placeableTgaTextureLoader: loader,
      placeableTextureFetch: vi.fn(),
      placeableTextureCacheByUrl: new Map<string, THREE.Texture>(),
      placeableTexturePendingByUrl: new Map<string, Promise<THREE.Texture | null>>(),
      container: document.createElement("div")
    };

    await expect(
      ensurePlaceableTexture(
        runtime,
        "/api/v1/catalog/placeables/cache/cache_texture/assets/texture.dds"
      )
    ).resolves.toBe(loadedTexture);
    expect(loader.load).toHaveBeenCalledTimes(1);
  });
});
