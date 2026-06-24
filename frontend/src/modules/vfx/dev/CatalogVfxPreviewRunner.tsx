import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { WorkspaceToolbarState } from "../../layout/roleTopbarPolicy";
import type { AreaScene, SceneObject } from "../../scene/contracts";
import { createHttpPlaceableApiPort } from "../../placeables/adapters/httpPlaceableApiPort";
import {
  fetchPlaceableViewportRenderPayload,
  type PlaceableViewportRenderPayload
} from "../../placeables/application/placeableRenderPayloadResolver";
import {
  applyPlaceableAssetRequestHeaders,
  centerCameraForScene,
  createRuntime,
  disposeRuntime,
  resizeRuntime
} from "../../layout/adapters/three/workspaceThreeRuntime";
import { rebuildGridLayer } from "../../layout/adapters/three/workspaceGridLayer";
import { rebuildObjectMeshes } from "../../layout/adapters/three/workspaceObjectMeshLayer";

const CATALOG_VFX_PREVIEW_PATH = "/dev/catalog-vfx-preview";
const DEFAULT_TEMPLATE_ID = "plc_zlc_o45";
const DEFAULT_TIME_SECONDS = 0.32;
const DEFAULT_SEED = 211;
const OBJECT_PIXEL_THRESHOLD = 80;

type RunnerStatus = "loading" | "ready" | "error";

interface PixelSignal {
  objectVisible: boolean;
  objectPixelCount: number;
}

interface LoginEnvelope {
  data?: {
    session?: {
      accessToken?: string;
    };
  };
}

interface RunnerSnapshot {
  status: RunnerStatus;
  error: string | null;
  templateId: string;
  routeTimeSeconds: number;
  seed: number;
  canvasNonblank: boolean;
  objectPixelsWithoutGrid: number;
  renderPackageStatus: string;
  diagnosticCodes: string[];
  modelFileName: string;
  textureUrls: string[];
  sourceMdlPayloadReady: boolean;
  emitterSource: string;
  emitterNode: string;
  emitterType: string;
  emitterTexture: string;
  emitterBlendMode: string;
  emitterRenderMode: string;
  particleCount: number;
  textureStatus: string;
  alphaStart: number | null;
  alphaEnd: number | null;
  sizeStart: number | null;
  sizeEnd: number | null;
  particleSizeVisibilityFloorPreviewMode: string;
  colorStart: number[];
  colorEnd: number[];
  meshCount: number;
  visibleMeshCount: number;
  drawParticles: number;
  renderedVertices: number;
  drawLanes: string[];
  emitterWorldBoundsCenter: number[];
  emitterWorldBoundsSize: number[];
  cameraPosition: number[];
  materialOpacity: number | null;
  materialTransparent: boolean | null;
  materialFallbackApplied: boolean;
}

export function isCatalogVfxPreviewRunnerPath(pathname: string): boolean {
  return pathname === CATALOG_VFX_PREVIEW_PATH;
}

function readNumberQuery(value: string | null, fallback: number): number {
  if (value === null || value.trim().length === 0) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readRouteRequest(): { templateId: string; timeSeconds: number; seed: number } {
  const params = new URLSearchParams(window.location.search);
  const templateId = params.get("templateId")?.trim() || DEFAULT_TEMPLATE_ID;
  return {
    templateId,
    timeSeconds: readNumberQuery(params.get("time"), DEFAULT_TIME_SECONDS),
    seed: readNumberQuery(params.get("seed"), DEFAULT_SEED)
  };
}

async function loginForDevPreview(): Promise<string> {
  const response = await fetch("/_aurora/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "builder.user", password: "builder123" })
  });
  if (!response.ok) {
    throw new Error(`Catalog VFX preview login failed: ${response.status}`);
  }
  const payload = (await response.json()) as LoginEnvelope;
  const token = payload.data?.session?.accessToken;
  if (!token) {
    throw new Error("Catalog VFX preview login returned no access token");
  }
  return token;
}

function createDebugState(): WorkspaceToolbarState["canvasDebug"] {
  return {
    wireframe: false,
    textures: true,
    grid: true,
    axes: false,
    bounds: false,
    hiddenMeshes: false,
    showNonRenderMeshes: false,
    showVtPhysicalAnchor: false,
    statusMap: "off",
    textureCompression: "none",
    gizmoMode: "translate",
    snapGrid: false,
    snapAngle: false,
    snapHeight: false,
    lockedKinds: {
      creatures: false,
      doors: false,
      items: false,
      placeables: false,
      sounds: false
    },
    isolateKind: "none",
    chunkBounds: false,
    objectLabels: false,
    perfHud: false,
    walkmeshOverlay: false,
    collisionOverlay: false,
    controlsHint: false,
    runtimeHud: false
  };
}

function createPreviewObject(templateId: string, payload: PlaceableViewportRenderPayload): SceneObject {
  const sourceRow = payload.placeable.metadata?.source2daRow;
  return {
    id: `catalog-vfx-preview:${templateId}`,
    kind: "placeables",
    name: payload.placeable.name,
    resRef: payload.placeable.resref,
    tag: templateId,
    x: 1,
    y: 1,
    z: 0,
    bearing: 0,
    visualTransform: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      roll: 0,
      yaw: 0
    },
    placeableProperties: {
      plot: false,
      useable: false,
      hasInventory: false
    },
    vfxPayload: {
      version: "scene-object-vfx-preserve/v1",
      profile: "catalog-placeable-vfx-preview",
      emitter: "source-mdl",
      script: "",
      sourceKind: "placeable_preview",
      sourceProfile: "placeables.2da",
      sourceTable: "placeables.2da",
      sourceRowId: typeof sourceRow === "number" ? sourceRow : undefined,
      sourceLabel: payload.placeable.name,
      sourceResRef: payload.placeable.resref,
      previewMode: "aurora_emitter_particle_preview",
      canonicalStatus: "preview_only",
      diagnostics: [],
      flags: {},
      extra: {}
    }
  };
}

function createPreviewScene(object: SceneObject): AreaScene {
  return {
    sceneId: "catalog-vfx-preview-scene",
    areaName: "Catalog VFX Preview",
    width: 2,
    height: 2,
    tiles: [],
    objects: [object],
    updatedAtUnixMs: 0,
    source: "local_draft"
  };
}

function createViewportFacade() {
  return {
    defaultMasterCellsPerTile: 4,
    buildGridSegments(widthTiles: number, heightTiles: number, masterCellsPerTile: number) {
      const segments: Array<{
        kind: "major" | "minor";
        start: readonly [number, number, number];
        end: readonly [number, number, number];
      }> = [];
      const divisions = Math.max(1, masterCellsPerTile);
      for (let x = 0; x <= widthTiles * divisions; x += 1) {
        const worldX = x / divisions;
        segments.push({
          kind: x % divisions === 0 ? "major" : "minor",
          start: [worldX, 0, 0],
          end: [worldX, 0, heightTiles]
        });
      }
      for (let z = 0; z <= heightTiles * divisions; z += 1) {
        const worldZ = z / divisions;
        segments.push({
          kind: z % divisions === 0 ? "major" : "minor",
          start: [0, 0, worldZ],
          end: [widthTiles, 0, worldZ]
        });
      }
      return segments;
    }
  };
}

function readObjectPixelSignal(renderer: THREE.WebGLRenderer, width: number, height: number): PixelSignal {
  const gl = renderer.getContext();
  const pixels = new Uint8Array(width * height * 4);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  const red = pixels[0] ?? 0;
  const green = pixels[1] ?? 0;
  const blue = pixels[2] ?? 0;
  let objectPixelCount = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const delta =
      Math.abs((pixels[index] ?? 0) - red) +
      Math.abs((pixels[index + 1] ?? 0) - green) +
      Math.abs((pixels[index + 2] ?? 0) - blue);
    if (delta > 36) {
      objectPixelCount += 1;
    }
  }
  return {
    objectVisible: objectPixelCount > OBJECT_PIXEL_THRESHOLD,
    objectPixelCount
  };
}

function findPreviewRoot(runtime: ReturnType<typeof createRuntime>, objectId: string): THREE.Object3D | null {
  return runtime.objectMeshById.get(objectId) ?? null;
}

function findEmitterGroup(root: THREE.Object3D | null): THREE.Object3D | null {
  let found: THREE.Object3D | null = null;
  root?.traverse((node) => {
    if (!found && node.userData?.auroraEmitterPackageSource === "source-mdl") {
      found = node;
    }
  });
  return found;
}

function readNumericUserData(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readNumberList(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is number => typeof entry === "number" && Number.isFinite(entry))
    : [];
}

function readStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((entry) => String(entry)).filter((entry) => entry.length > 0)
    : [];
}

function roundNumber(value: number): number {
  return Number(value.toFixed(4));
}

function readVector3(value: THREE.Vector3): number[] {
  return [roundNumber(value.x), roundNumber(value.y), roundNumber(value.z)];
}

function readFirstMaterial(root: THREE.Object3D | null): THREE.Material | null {
  let material: THREE.Material | null = null;
  root?.traverse((node) => {
    if (material || !(node instanceof THREE.Mesh)) {
      return;
    }
    const candidate = Array.isArray(node.material) ? node.material[0] : node.material;
    if (candidate) {
      material = candidate;
    }
  });
  return material;
}

export function frameCameraForEmitter(
  runtime: ReturnType<typeof createRuntime>,
  emitterGroup: THREE.Object3D | null
): void {
  if (!emitterGroup) {
    return;
  }
  const bounds = new THREE.Box3().setFromObject(emitterGroup);
  if (bounds.isEmpty()) {
    return;
  }
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  bounds.getCenter(center);
  bounds.getSize(size);
  const maxDimension = Math.max(size.x, size.y, size.z, 0.35);
  const distance = Math.max(1.2, maxDimension * 2.6);
  runtime.camera.position.set(
    center.x + distance,
    center.y + distance * 0.9,
    center.z + distance
  );
  runtime.controls.target.copy(center);
  runtime.camera.lookAt(center);
  runtime.camera.updateProjectionMatrix();
  runtime.controls.update();
}

function readMeshCounts(root: THREE.Object3D | null): { meshCount: number; visibleMeshCount: number } {
  let meshCount = 0;
  let visibleMeshCount = 0;
  root?.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    meshCount += 1;
    if (node.visible) {
      visibleMeshCount += 1;
    }
  });
  return { meshCount, visibleMeshCount };
}

export function readEmitterDrawMetrics(root: THREE.Object3D | null): {
  drawParticles: number;
  renderedVertices: number;
  drawLanes: string[];
} {
  let drawParticles = 0;
  let renderedVertices = 0;
  const drawLanes = new Set<string>();
  const rootUserData = root?.userData ?? {};
  const addLane = (value: unknown) => {
    if (typeof value === "string" && value.trim().length > 0) {
      drawLanes.add(value.trim());
    }
  };

  addLane(rootUserData.auroraEmitterPackageSource);
  addLane(rootUserData.auroraEmitterType);
  addLane(rootUserData.auroraEmitterBlendMode);
  addLane(rootUserData.auroraEmitterRenderMode);

  root?.traverse((node) => {
    if (!(node instanceof THREE.Mesh) || !node.visible) {
      return;
    }
    drawParticles += 1;
    const positionAttribute = node.geometry.getAttribute("position");
    if (positionAttribute) {
      renderedVertices += positionAttribute.count;
    }
    addLane(node.userData?.auroraEmitterPackageSource);
    addLane(node.userData?.auroraEmitterType);
    addLane(node.userData?.auroraEmitterBlendMode);
    addLane(node.userData?.auroraEmitterRenderMode);
    const material = Array.isArray(node.material) ? node.material[0] : node.material;
    addLane(material?.userData?.auroraEmitterPackageSource);
    addLane(material?.userData?.auroraEmitterType);
    addLane(material?.userData?.auroraEmitterBlendMode);
    addLane(material?.userData?.auroraEmitterRenderMode);
  });

  return {
    drawParticles,
    renderedVertices,
    drawLanes: Array.from(drawLanes)
  };
}

function buildSnapshot(
  status: RunnerStatus,
  request: ReturnType<typeof readRouteRequest>,
  payload: PlaceableViewportRenderPayload | null,
  root: THREE.Object3D | null,
  runtime: ReturnType<typeof createRuntime> | null,
  pixelSignal: PixelSignal,
  error: string | null
): RunnerSnapshot {
  const emitter = payload?.renderPackage?.auroraEmitter?.emitters?.[0] ?? null;
  const emitterGroup = findEmitterGroup(root);
  const userData = emitterGroup?.userData ?? {};
  const diagnostics = payload?.renderPackage?.diagnostics ?? [];
  const meshCounts = readMeshCounts(root);
  const emitterBounds = new THREE.Box3();
  const emitterBoundsCenter = new THREE.Vector3();
  const emitterBoundsSize = new THREE.Vector3();
  if (emitterGroup) {
    emitterBounds.setFromObject(emitterGroup);
    if (!emitterBounds.isEmpty()) {
      emitterBounds.getCenter(emitterBoundsCenter);
      emitterBounds.getSize(emitterBoundsSize);
    }
  }
  const material = readFirstMaterial(emitterGroup);
  const drawMetrics = readEmitterDrawMetrics(emitterGroup);
  return {
    status,
    error,
    templateId: request.templateId,
    routeTimeSeconds: request.timeSeconds,
    seed: request.seed,
    canvasNonblank: pixelSignal.objectVisible,
    objectPixelsWithoutGrid: pixelSignal.objectPixelCount,
    renderPackageStatus: payload?.renderPackage?.status ?? "",
    diagnosticCodes: diagnostics.map((entry) => entry.code),
    modelFileName: emitter?.sourceModelFileName ?? "",
    textureUrls: readStringList(payload?.renderPackage?.textureUrls),
    sourceMdlPayloadReady: diagnostics.some(
      (entry) => entry.code === "VFX_AURORA_MDL_EMITTER_PAYLOAD_READY"
    ),
    emitterSource: payload?.renderPackage?.auroraEmitter?.source ?? "",
    emitterNode: emitter?.nodeName ?? "",
    emitterType: emitter?.emitterType ?? "",
    emitterTexture: emitter?.texture ?? "",
    emitterBlendMode: emitter?.blendMode ?? "",
    emitterRenderMode: emitter?.renderMode ?? "",
    particleCount: readNumericUserData(userData.auroraEmitterParticleCount) ?? 0,
    textureStatus: typeof userData.vfxTextureStatus === "string" ? userData.vfxTextureStatus : "",
    alphaStart: readNumericUserData(userData.auroraEmitterParticleAlphaStart),
    alphaEnd: readNumericUserData(userData.auroraEmitterParticleAlphaEnd),
    sizeStart: readNumericUserData(userData.auroraEmitterParticleSizeStart),
    sizeEnd: readNumericUserData(userData.auroraEmitterParticleSizeEnd),
    particleSizeVisibilityFloorPreviewMode:
      typeof userData.auroraEmitterParticleSizeVisibilityFloorPreviewMode === "string"
        ? userData.auroraEmitterParticleSizeVisibilityFloorPreviewMode
        : "",
    colorStart: readNumberList(userData.auroraEmitterParticleColorStart),
    colorEnd: readNumberList(userData.auroraEmitterParticleColorEnd),
    meshCount: meshCounts.meshCount,
    visibleMeshCount: meshCounts.visibleMeshCount,
    drawParticles: drawMetrics.drawParticles,
    renderedVertices: drawMetrics.renderedVertices,
    drawLanes: drawMetrics.drawLanes,
    emitterWorldBoundsCenter: readVector3(emitterBoundsCenter),
    emitterWorldBoundsSize: readVector3(emitterBoundsSize),
    cameraPosition: runtime ? readVector3(runtime.camera.position) : [],
    materialOpacity: material instanceof THREE.Material ? material.opacity : null,
    materialTransparent: material instanceof THREE.Material ? material.transparent : null,
    materialFallbackApplied: Boolean(material?.userData?.auroraSurfaceEmitterVisibilityFallbackMaterial)
  };
}

export function CatalogVfxPreviewRunner() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [snapshot, setSnapshot] = useState<RunnerSnapshot>(() =>
    buildSnapshot(
      "loading",
      readRouteRequest(),
      null,
      null,
      null,
      { objectVisible: false, objectPixelCount: 0 },
      null
    )
  );
  const request = useMemo(readRouteRequest, []);

  useEffect(() => {
    let cancelled = false;
    let cleanupRuntime: (() => void) | null = null;

    async function run(): Promise<void> {
      try {
        const host = hostRef.current;
        if (!host) {
          throw new Error("Catalog VFX preview host was not mounted");
        }
        const accessToken = await loginForDevPreview();
        const placeableApiPort = createHttpPlaceableApiPort();
        const payload = await fetchPlaceableViewportRenderPayload(
          placeableApiPort,
          accessToken,
          {
            templateId: request.templateId,
            subtypeHint: "vfx",
            bypassCache: true
          }
        );
        if (cancelled) {
          return;
        }

        const runtime = createRuntime(host);
        cleanupRuntime = () => disposeRuntime(runtime);
        applyPlaceableAssetRequestHeaders(runtime, accessToken);
        host.style.width = "960px";
        host.style.height = "540px";
        resizeRuntime(runtime);

        const object = createPreviewObject(request.templateId, payload);
        const scene = createPreviewScene(object);
        const viewportFacade = createViewportFacade();
        rebuildGridLayer(runtime, scene, viewportFacade, true);
        runtime.gridLayer.visible = true;
        runtime.tileOverlayLayer.visible = true;
        runtime.axesHelper.visible = false;
        centerCameraForScene(runtime, scene, { objectPreview: true });
        rebuildObjectMeshes(
          runtime,
          scene.objects,
          [],
          createDebugState(),
          1,
          false,
          10,
          [],
          false,
          { [object.id]: payload }
        );

        const render = () => {
          runtime.controls.update();
          runtime.renderer.render(runtime.scene, runtime.camera);
        };
        render();
        await new Promise((resolve) => window.setTimeout(resolve, 1400));
        if (cancelled) {
          return;
        }
        render();
        for (let index = 0; index < 20; index += 1) {
          const currentRoot = findPreviewRoot(runtime, object.id);
          const currentEmitterGroup = findEmitterGroup(currentRoot);
          if (currentEmitterGroup?.userData.vfxTextureStatus === "applied") {
            break;
          }
          await new Promise((resolve) => window.setTimeout(resolve, 250));
          render();
          if (cancelled) {
            return;
          }
        }
        await new Promise((resolve) => window.setTimeout(resolve, 700));
        if (cancelled) {
          return;
        }
        const finalRoot = findPreviewRoot(runtime, object.id);
        const finalEmitterGroup = findEmitterGroup(finalRoot);
        frameCameraForEmitter(runtime, finalEmitterGroup);
        runtime.gridLayer.visible = false;
        runtime.tileOverlayLayer.visible = false;
        render();
        await new Promise((resolve) => requestAnimationFrame(resolve));

        const root = findPreviewRoot(runtime, object.id);
        const { width, height } = runtime.renderer.domElement;
        const gridVisible = runtime.gridLayer.visible;
        const tileGridVisible = runtime.tileOverlayLayer.visible;
        runtime.gridLayer.visible = false;
        runtime.tileOverlayLayer.visible = false;
        render();
        const pixelSignal = readObjectPixelSignal(runtime.renderer, width, height);
        runtime.gridLayer.visible = gridVisible;
        runtime.tileOverlayLayer.visible = tileGridVisible;
        render();

        if (!cancelled) {
          setSnapshot(buildSnapshot("ready", request, payload, root, runtime, pixelSignal, null));
        }
      } catch (error) {
        if (!cancelled) {
          setSnapshot(
            buildSnapshot(
              "error",
              request,
              null,
              null,
              null,
              { objectVisible: false, objectPixelCount: 0 },
              error instanceof Error ? error.message : String(error)
            )
          );
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
      cleanupRuntime?.();
    };
  }, [request]);

  return (
    <main
      data-testid="catalog-vfx-preview-runner"
      data-template-id={snapshot.templateId}
      data-render-status={snapshot.status}
      data-canvas-nonblank={snapshot.canvasNonblank ? "true" : "false"}
      data-object-pixels={snapshot.objectPixelsWithoutGrid}
      data-render-package-status={snapshot.renderPackageStatus}
      data-source-mdl-payload-ready={snapshot.sourceMdlPayloadReady ? "true" : "false"}
      data-model-file-name={snapshot.modelFileName}
      data-texture-urls={snapshot.textureUrls.join("|")}
      data-diagnostic-codes={snapshot.diagnosticCodes.join("|")}
      data-emitter-source={snapshot.emitterSource}
      data-emitter-node={snapshot.emitterNode}
      data-emitter-type={snapshot.emitterType}
      data-emitter-texture={snapshot.emitterTexture}
      data-emitter-blend-mode={snapshot.emitterBlendMode}
      data-emitter-render-mode={snapshot.emitterRenderMode}
      data-particle-count={snapshot.particleCount}
      data-texture-status={snapshot.textureStatus}
      data-alpha-start={snapshot.alphaStart ?? ""}
      data-alpha-end={snapshot.alphaEnd ?? ""}
      data-size-start={snapshot.sizeStart ?? ""}
      data-size-end={snapshot.sizeEnd ?? ""}
      data-particle-size-visibility-floor-preview-mode={
        snapshot.particleSizeVisibilityFloorPreviewMode
      }
      data-color-start={snapshot.colorStart.join(",")}
      data-color-end={snapshot.colorEnd.join(",")}
      data-mesh-count={snapshot.meshCount}
      data-visible-mesh-count={snapshot.visibleMeshCount}
      data-draw-particles={snapshot.drawParticles}
      data-rendered-vertices={snapshot.renderedVertices}
      data-draw-lanes={snapshot.drawLanes.join("|")}
      data-emitter-world-bounds-center={snapshot.emitterWorldBoundsCenter.join(",")}
      data-emitter-world-bounds-size={snapshot.emitterWorldBoundsSize.join(",")}
      data-camera-position={snapshot.cameraPosition.join(",")}
      data-material-opacity={snapshot.materialOpacity ?? ""}
      data-material-transparent={snapshot.materialTransparent ?? ""}
      data-material-fallback-applied={snapshot.materialFallbackApplied ? "true" : "false"}
      data-error={snapshot.error ?? ""}
      style={{
        margin: 0,
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#07111b"
      }}
    >
      <div ref={hostRef} style={{ width: 960, height: 540 }} />
      <script
        id="catalog-vfx-preview-frame"
        type="application/json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(snapshot) }}
      />
    </main>
  );
}
