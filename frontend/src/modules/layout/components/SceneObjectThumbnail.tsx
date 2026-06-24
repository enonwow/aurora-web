import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { DDSLoader } from "three/examples/jsm/loaders/DDSLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { TGALoader } from "three/examples/jsm/loaders/TGALoader.js";
import {
  applyPlaceableTexturesToModel,
  ensureNormalizedPlaceableModel,
  ensurePlaceableTexturesByReference,
  PLACEABLE_PREVIEW_MODEL_TARGET_MAX_AXIS_FACTOR,
  type PlaceableModelRuntimeCache,
  type PlaceableTextureRuntimeCache
} from "../../placeables/adapters/three/placeableThreeAssetLoader";
import type { PlaceableViewportRenderPayload } from "../../placeables/application/placeableRenderPayloadResolver";
import {
  applyPlaceableAssetRequestHeaders,
  type PlaceableAssetRequestHeaderRuntime
} from "../adapters/three/workspaceThreeRuntime";
import type { SceneObject, SceneObjectKind } from "../contracts";
import {
  resolvePlaceableModelResolution,
  resolvePlaceableTextureDeliveryUrlsByReference
} from "../application/workspacePlaceableRenderContracts";

interface SceneObjectThumbnailProps {
  object: SceneObject;
  fallbackLabel: string;
  renderPayload?: PlaceableViewportRenderPayload | null;
  placeableAssetAccessToken?: string | null;
  onRenderPayloadNeeded?: (object: SceneObject) => void;
}

type ThumbnailRuntime = PlaceableModelRuntimeCache & PlaceableTextureRuntimeCache;
type ThumbnailMaterial = THREE.Material & {
  color?: THREE.Color;
  emissive?: THREE.Color;
  emissiveIntensity?: number;
};

const KIND_BADGE: Record<SceneObjectKind, string> = {
  placeables: "PLC",
  creatures: "CRT",
  doors: "DOR",
  items: "ITM",
  sounds: "SND"
};

const KIND_COLORS: Record<SceneObjectKind, string> = {
  placeables: "#5f9cff",
  creatures: "#ff8e78",
  doors: "#ffc980",
  items: "#91e8a5",
  sounds: "#bba0ff"
};

let sharedThumbnailRuntime: ThumbnailRuntime | null = null;

function encodeSvg(value: string): string {
  return value
    .replace(/"/g, "'")
    .replace(/%/g, "%25")
    .replace(/#/g, "%23")
    .replace(/{/g, "%7B")
    .replace(/}/g, "%7D")
    .replace(/</g, "%3C")
    .replace(/>/g, "%3E")
    .replace(/\s+/g, " ");
}

function createFallbackPreviewDataUrl(kind: SceneObjectKind, label: string): string {
  const tint = KIND_COLORS[kind];
  const badge = KIND_BADGE[kind];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
      <rect x="1" y="1" width="46" height="46" rx="8" fill="#0b1728" stroke="#34557d" stroke-width="2" />
      <rect x="4" y="4" width="40" height="18" rx="5" fill="${tint}" fill-opacity="0.35" />
      <text x="24" y="17" text-anchor="middle" font-family="Segoe UI" font-size="9" fill="#f0f6ff" font-weight="700">${badge}</text>
      <text x="24" y="34" text-anchor="middle" font-family="Segoe UI" font-size="8" fill="#c8d9ee">${label}</text>
    </svg>
  `;
  return `data:image/svg+xml,${encodeSvg(svg)}`;
}

function shouldUseProvidedPreviewImageUrl(url: string | undefined): url is string {
  const normalizedUrl = url?.trim() ?? "";
  if (normalizedUrl.length < 1) {
    return false;
  }
  return (
    !normalizedUrl.startsWith("/api/v1/catalog/placeables/") &&
    !normalizedUrl.startsWith("/assets/previews/")
  );
}

function isPlaceableThumbnailCandidate(object: SceneObject): boolean {
  return object.kind === "placeables" || object.kind === "doors";
}

function canRenderWebGlThumbnail(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof document !== "undefined" &&
    typeof window.WebGLRenderingContext !== "undefined"
  );
}

function getThumbnailRuntime(): ThumbnailRuntime {
  if (sharedThumbnailRuntime) {
    return sharedThumbnailRuntime;
  }

  sharedThumbnailRuntime = {
    placeableModelLoader: new GLTFLoader(),
    placeableModelCacheByUrl: new Map(),
    placeableModelPendingByUrl: new Map(),
    placeableNormalizedModelCacheByKey: new Map(),
    placeableNormalizedModelPendingByKey: new Map(),
    placeableModelLoadConcurrencyLimit: 2,
    placeableModelLoadStartsPerFrameLimit: 1,
    placeableTextureLoader: new THREE.TextureLoader(),
    placeableDdsTextureLoader: new DDSLoader(),
    placeableTgaTextureLoader: new TGALoader(),
    placeableTextureFetch:
      typeof window !== "undefined" ? window.fetch.bind(window) : undefined,
    placeableTextureRequestHeader: {},
    placeableTextureCacheByUrl: new Map(),
    placeableTexturePendingByUrl: new Map(),
    container: {
      dataset: {},
      dispatchEvent: () => false
    }
  };
  return sharedThumbnailRuntime;
}

function disposeRenderedClone(root: THREE.Object3D): void {
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    node.geometry?.dispose();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      material.dispose();
    });
  });
}

function frameModelForThumbnail(model: THREE.Object3D): void {
  const bounds = new THREE.Box3().setFromObject(model);
  const center = bounds.getCenter(new THREE.Vector3());
  model.position.sub(center);
  model.rotation.y = -Math.PI / 5;
  model.rotation.x = -Math.PI / 18;
}

function boostThumbnailMaterialVisibility(model: THREE.Object3D): void {
  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      const previewMaterial = material as ThumbnailMaterial;
      previewMaterial.side = THREE.DoubleSide;
      previewMaterial.color?.lerp(new THREE.Color(0xffffff), 0.2);
      previewMaterial.emissive?.lerp(new THREE.Color(0xffffff), 0.28);
      if (typeof previewMaterial.emissiveIntensity === "number") {
        previewMaterial.emissiveIntensity = Math.max(previewMaterial.emissiveIntensity, 0.4);
      }
      previewMaterial.needsUpdate = true;
    });
  });
}

export function SceneObjectThumbnail({
  object,
  fallbackLabel,
  renderPayload,
  placeableAssetAccessToken,
  onRenderPayloadNeeded
}: SceneObjectThumbnailProps) {
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<"fallback" | "loading" | "rendered">("fallback");
  const generatedFallbackPreviewImageUrl = useMemo(
    () => createFallbackPreviewDataUrl(object.kind, fallbackLabel),
    [fallbackLabel, object.kind]
  );
  const initialPreviewImageUrl = useMemo(
    () =>
      shouldUseProvidedPreviewImageUrl(object.previewImageUrl)
        ? object.previewImageUrl
        : generatedFallbackPreviewImageUrl,
    [generatedFallbackPreviewImageUrl, object.previewImageUrl]
  );
  const [previewImageUrl, setPreviewImageUrl] = useState(initialPreviewImageUrl);

  useEffect(() => {
    setPreviewImageUrl(initialPreviewImageUrl);
  }, [initialPreviewImageUrl]);

  useEffect(() => {
    if (!isPlaceableThumbnailCandidate(object) || renderPayload || !onRenderPayloadNeeded) {
      return;
    }
    if (object.source?.type === "aurora_git") {
      return;
    }
    const element = rootRef.current;
    if (!element || typeof window === "undefined") {
      return;
    }
    if (typeof IntersectionObserver === "undefined") {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onRenderPayloadNeeded(object);
          observer.disconnect();
        }
      },
      { rootMargin: "180px" }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [object, onRenderPayloadNeeded, renderPayload]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !renderPayload || !isPlaceableThumbnailCandidate(object)) {
      setStatus("fallback");
      return;
    }
    if (!canRenderWebGlThumbnail()) {
      setStatus("fallback");
      return;
    }

    const modelResolution = resolvePlaceableModelResolution(renderPayload);
    const modelUrl = modelResolution.modelUrl;
    if (!modelUrl) {
      setStatus("fallback");
      return;
    }

    let cancelled = false;
    let renderer: THREE.WebGLRenderer | null = null;
    let renderedModel: THREE.Object3D | null = null;
    setStatus("loading");

    void (async () => {
      const runtime = getThumbnailRuntime();
      applyPlaceableAssetRequestHeaders(
        runtime as unknown as PlaceableAssetRequestHeaderRuntime,
        placeableAssetAccessToken
      );
      const model = await ensureNormalizedPlaceableModel(
        runtime,
        modelUrl,
        0.5,
        {
          cacheKey: modelResolution.modelCacheKey,
          targetMaxAxisFactor: PLACEABLE_PREVIEW_MODEL_TARGET_MAX_AXIS_FACTOR,
          cloneMaterials: true
        }
      );
      if (!model || cancelled) {
        setStatus("fallback");
        return;
      }
      renderedModel = model;

      const textureUrlsByReference = resolvePlaceableTextureDeliveryUrlsByReference(renderPayload);
      if (textureUrlsByReference.size > 0) {
        const texturesByReference = await ensurePlaceableTexturesByReference(
          runtime,
          textureUrlsByReference
        );
        if (!cancelled && texturesByReference.size > 0) {
          applyPlaceableTexturesToModel(model, texturesByReference);
        }
      }

      if (cancelled) {
        return;
      }

      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: false
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(48, 48, false);
      renderer.setClearColor(0xdbe5ef, 1);

      const scene = new THREE.Scene();
      scene.add(new THREE.AmbientLight(0xffffff, 1.7));
      const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
      keyLight.position.set(2.4, 3, 3.2);
      scene.add(keyLight);
      const fillLight = new THREE.DirectionalLight(0xdde9ff, 1.2);
      fillLight.position.set(-2, 1.4, -2.4);
      scene.add(fillLight);
      frameModelForThumbnail(model);
      boostThumbnailMaterialVisibility(model);
      scene.add(model);

      const camera = new THREE.OrthographicCamera(-1.25, 1.25, 1.25, -1.25, 0.01, 20);
      camera.position.set(2.1, 1.6, 2.4);
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      setStatus("rendered");
    })().catch(() => {
      if (!cancelled) {
        setStatus("fallback");
      }
    });

    return () => {
      cancelled = true;
      renderer?.dispose();
      if (renderedModel) {
        disposeRenderedClone(renderedModel);
      }
    };
  }, [object, placeableAssetAccessToken, renderPayload]);

  return (
    <span
      ref={rootRef}
      className={`scene-object-thumbnail scene-object-thumbnail-${status}`}
    >
      <img
        src={previewImageUrl}
        width={48}
        height={48}
        loading="lazy"
        alt={`${object.tag} 2D preview`}
        onError={() => {
          if (previewImageUrl !== generatedFallbackPreviewImageUrl) {
            setPreviewImageUrl(generatedFallbackPreviewImageUrl);
          }
        }}
      />
      <canvas
        ref={canvasRef}
        width={48}
        height={48}
        aria-label={`${object.tag} rendered preview`}
      />
    </span>
  );
}
