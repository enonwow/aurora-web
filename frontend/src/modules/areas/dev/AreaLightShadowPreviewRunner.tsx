import { useEffect, useMemo, useRef, useState } from "react";
import { HttpAreaApiPort } from "../adapters/httpAreaApiPort";
import { mapBackendAreaToScene } from "../application/areaSceneMapper";
import {
  applyPlaceableAssetRequestHeaders,
  centerCameraForRuntimeObjectPreview,
  centerCameraForScene,
  createRuntime,
  disposeRuntime,
  resizeRuntime
} from "../../layout/adapters/three/workspaceThreeRuntime";
import { rebuildTerrainMesh } from "../../layout/adapters/three/workspaceTerrainMesh";
import {
  rebuildObjectMeshes,
  writePlaceableTwoDaLightRenderDiagnostics
} from "../../layout/adapters/three/workspaceObjectMeshLayer";
import { writeAuroraScenePointLightDiagnostics } from "../../layout/adapters/three/workspaceSceneLightDiagnostics";
import { HttpTileApiPort } from "../../tiles/adapters/httpTileApiPort";
import { HttpPlaceableApiPort } from "../../placeables/adapters/httpPlaceableApiPort";
import {
  fetchPlaceableViewportRenderPayloadBatch,
  type PlaceableViewportRenderPayload
} from "../../placeables/application/placeableRenderPayloadResolver";
import { resolvePlaceableRenderPayloadLookup } from "../../layout/application/workspacePlaceableRenderContracts";
import {
  LEGACY_SEED_SCENE_HEIGHT_TILES,
  LEGACY_SEED_SCENE_WIDTH_TILES,
  normalizeSceneObjectMetadata
} from "../../scene/domain/sceneFactory";
import type { AreaScene, SceneObject } from "../../scene/contracts";
import {
  resolveAreaTileProcessContractReadiness,
  type AreaTileProcessContractReadiness
} from "../../tiles/application/areaTileProcessContractReadiness";

const AREA_LIGHT_SHADOW_PREVIEW_PATH = "/dev/area-light-shadow-preview";
const DEFAULT_AREA_ID = "area__winds_study";
const DEFAULT_API_BASE_URL = "http://127.0.0.1:3000/api/v1";
const DEFAULT_USERNAME = "builder.user";
const DEFAULT_PASSWORD = "builder123";
const DEFAULT_CANVAS_WIDTH = 960;
const DEFAULT_CANVAS_HEIGHT = 540;
const CAMPFIRE_PROOF_OBJECT_ID = "aurora-web-proof:plc_plc_i06";
const CAMPFIRE_PROOF_TEMPLATE_ID = "plc_plc_i06";
const CAMPFIRE_PROOF_RES_REF = "plc_i06";
const CAMPFIRE_PROOF_RETAIL_RES_REF = "plc_campfr";
const DEFAULT_AREA_SOUND_UNITS_PER_TILE = 10;

type RunnerStatus = "loading" | "ready" | "error" | "skipped-test";

interface AreaLightShadowPreviewRequest {
  areaId: string;
  apiBaseUrl: string;
  username: string;
  password: string;
  displayFog: boolean;
  useAreaLighting: boolean;
  tileProcess: boolean;
  renderObjects: boolean;
  includeAreaObjects: boolean;
  injectCampfire: boolean;
  fullViewport: boolean;
  canvasWidth: number;
  canvasHeight: number;
  campfireX: number | null;
  campfireY: number | null;
  campfireZ: number | null;
}

interface AreaLightShadowPreviewSnapshot {
  status: RunnerStatus;
  error: string;
  areaId: string;
  areaName: string;
  apiBaseUrl: string;
  displayFog: boolean;
  useAreaLighting: boolean;
  tileProcess: boolean;
  renderObjects: boolean;
  includeAreaObjects: boolean;
  injectCampfire: boolean;
  fullViewport: boolean;
  canvasWidth: number;
  canvasHeight: number;
  tileProcessStatus: string;
  tileProcessReadyCount: number;
  tileProcessBlockedCount: number;
  tileProcessBlockers: string;
  tileProcessError: string;
  cacheHit: boolean | null;
  tileCount: number;
  objectCount: number;
  renderObjectCount: number;
  injectedCampfireObjectId: string;
  injectedCampfireTemplateId: string;
  injectedCampfireResRef: string;
  injectedCampfireRetailResRef: string;
  injectedCampfirePosition: number[];
  placeableRenderPayloadStatus: string;
  placeableRenderPayloadCount: number;
  placeableRenderPayloadError: string;
  placeableTwoDaLightStatus: string;
  placeableTwoDaLightSourceCount: number;
  placeableTwoDaLightPointLightCount: number;
  placeableTwoDaLightHaloCount: number;
  placeableTwoDaLightCoreCount: number;
  placeableTwoDaLightReceiverCount: number;
  placeableTwoDaLightFastShadowCount: number;
  placeableTwoDaLightDisabledCount: number;
  placeableTwoDaLightDisabledByLightStateCount: number;
  placeableTwoDaLightDisabledByUseAreaLightingCount: number;
  placeableTwoDaLightSamples: string[];
  placeableModelStatus: string;
  placeableModelMeshCount: number;
  placeableModelUrl: string;
  areaGlobalLightingStatus: string;
  areaGlobalLightingPhase: string;
  areaGlobalLightingFields: string;
  areaGlobalShadowOpacity: string;
  areaGlobalShadowOpacityFactor: string;
  areaGlobalShadowStatus: string;
  areaGlobalShadowSourceField: string;
  sceneShadowProofStatus: string;
  sceneShadowRetailProjectionStatus: string;
  sceneShadowPointLightCastShadowCount: number;
  sceneShadowPointLightSamples: string[];
  sceneShadowItemPropertyLightShadowPolicyCount: number;
  sceneShadowItemPropertyLightShadowPolicySamples: string[];
  sceneShadowDirectionalLightCastShadowCount: number;
  sceneShadowDirectionalLightSamples: string[];
  sceneShadowProgFxType4ShadowRequestCount: number;
  sceneShadowProgFxType4ShadowRequestSamples: string[];
  sceneShadowAreaStatus: string;
  sceneShadowAreaSourceField: string;
  sceneShadowAreaOpacity: string;
  sceneShadowAreaOpacityFactor: string;
  terrainRuntimeStatus: string;
  terrainAreaId: string;
  terrainTileModelLoadedCount: number;
  terrainTileModelVisibleMeshCount: number;
  terrainTileModelMaterialMapCount: number;
  terrainTileModelVisibleMeshSample: string;
  terrainTileShadowReceiverMeshCount: number;
  terrainTileShadowReceiverStatus: string;
  terrainTileShadowReceiverSource: string;
  terrainTileShadowReceiverSample: string;
  cameraPosition: number[];
}

export function isAreaLightShadowPreviewRunnerPath(pathname: string): boolean {
  return pathname === AREA_LIGHT_SHADOW_PREVIEW_PATH;
}

function readBooleanQuery(value: string | null, fallback: boolean): boolean {
  if (value === null || value.trim().length === 0) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return fallback;
}

function readPositiveIntegerQuery(value: string | null, fallback: number): number {
  if (value === null || value.trim().length === 0) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(1, Math.floor(parsed));
}

function readFiniteNumberQuery(value: string | null): number | null {
  if (value === null || value.trim().length === 0) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseAreaLightShadowPreviewRequest(): AreaLightShadowPreviewRequest {
  const params = new URLSearchParams(window.location.search);
  const injectCampfire = readBooleanQuery(params.get("injectCampfire"), false);
  return {
    areaId: params.get("areaId")?.trim() || DEFAULT_AREA_ID,
    apiBaseUrl: params.get("apiBaseUrl")?.trim() || DEFAULT_API_BASE_URL,
    username: params.get("username")?.trim() || DEFAULT_USERNAME,
    password: params.get("password")?.trim() || DEFAULT_PASSWORD,
    displayFog: readBooleanQuery(params.get("displayFog"), false),
    useAreaLighting: readBooleanQuery(params.get("useAreaLighting"), true),
    tileProcess: readBooleanQuery(params.get("tileProcess"), true),
    renderObjects: readBooleanQuery(params.get("renderObjects"), injectCampfire),
    includeAreaObjects: readBooleanQuery(params.get("includeAreaObjects"), !injectCampfire),
    injectCampfire,
    fullViewport: readBooleanQuery(params.get("fullViewport"), false),
    canvasWidth: readPositiveIntegerQuery(params.get("canvasWidth"), DEFAULT_CANVAS_WIDTH),
    canvasHeight: readPositiveIntegerQuery(params.get("canvasHeight"), DEFAULT_CANVAS_HEIGHT),
    campfireX: readFiniteNumberQuery(params.get("campfireX")),
    campfireY: readFiniteNumberQuery(params.get("campfireY")),
    campfireZ: readFiniteNumberQuery(params.get("campfireZ"))
  };
}

function createEmptySnapshot(
  status: RunnerStatus,
  request: AreaLightShadowPreviewRequest,
  error = ""
): AreaLightShadowPreviewSnapshot {
  return {
    status,
    error,
    areaId: request.areaId,
    areaName: "",
    apiBaseUrl: request.apiBaseUrl,
    displayFog: request.displayFog,
    useAreaLighting: request.useAreaLighting,
    tileProcess: request.tileProcess,
    renderObjects: request.renderObjects,
    includeAreaObjects: request.includeAreaObjects,
    injectCampfire: request.injectCampfire,
    fullViewport: request.fullViewport,
    canvasWidth: request.canvasWidth,
    canvasHeight: request.canvasHeight,
    tileProcessStatus: "",
    tileProcessReadyCount: 0,
    tileProcessBlockedCount: 0,
    tileProcessBlockers: "",
    tileProcessError: "",
    cacheHit: null,
    tileCount: 0,
    objectCount: 0,
    renderObjectCount: 0,
    injectedCampfireObjectId: "",
    injectedCampfireTemplateId: "",
    injectedCampfireResRef: "",
    injectedCampfireRetailResRef: "",
    injectedCampfirePosition: [],
    placeableRenderPayloadStatus: "",
    placeableRenderPayloadCount: 0,
    placeableRenderPayloadError: "",
    placeableTwoDaLightStatus: "",
    placeableTwoDaLightSourceCount: 0,
    placeableTwoDaLightPointLightCount: 0,
    placeableTwoDaLightHaloCount: 0,
    placeableTwoDaLightCoreCount: 0,
    placeableTwoDaLightReceiverCount: 0,
    placeableTwoDaLightFastShadowCount: 0,
    placeableTwoDaLightDisabledCount: 0,
    placeableTwoDaLightDisabledByLightStateCount: 0,
    placeableTwoDaLightDisabledByUseAreaLightingCount: 0,
    placeableTwoDaLightSamples: [],
    placeableModelStatus: "",
    placeableModelMeshCount: 0,
    placeableModelUrl: "",
    areaGlobalLightingStatus: "",
    areaGlobalLightingPhase: "",
    areaGlobalLightingFields: "",
    areaGlobalShadowOpacity: "",
    areaGlobalShadowOpacityFactor: "",
    areaGlobalShadowStatus: "",
    areaGlobalShadowSourceField: "",
    sceneShadowProofStatus: "",
    sceneShadowRetailProjectionStatus: "",
    sceneShadowPointLightCastShadowCount: 0,
    sceneShadowPointLightSamples: [],
    sceneShadowItemPropertyLightShadowPolicyCount: 0,
    sceneShadowItemPropertyLightShadowPolicySamples: [],
    sceneShadowDirectionalLightCastShadowCount: 0,
    sceneShadowDirectionalLightSamples: [],
    sceneShadowProgFxType4ShadowRequestCount: 0,
    sceneShadowProgFxType4ShadowRequestSamples: [],
    sceneShadowAreaStatus: "",
    sceneShadowAreaSourceField: "",
    sceneShadowAreaOpacity: "",
    sceneShadowAreaOpacityFactor: "",
    terrainRuntimeStatus: "",
    terrainAreaId: "",
    terrainTileModelLoadedCount: 0,
    terrainTileModelVisibleMeshCount: 0,
    terrainTileModelMaterialMapCount: 0,
    terrainTileModelVisibleMeshSample: "",
    terrainTileShadowReceiverMeshCount: 0,
    terrainTileShadowReceiverStatus: "",
    terrainTileShadowReceiverSource: "",
    terrainTileShadowReceiverSample: "",
    cameraPosition: []
  };
}

function createAreaLightShadowDebugState(
    request: Pick<AreaLightShadowPreviewRequest, "displayFog" | "useAreaLighting">
): Parameters<typeof rebuildTerrainMesh>[3] {
  return {
    textureCompression: "uastc",
    hiddenMeshes: false,
    ceilingMeshes: false,
    wireframe: false,
    textures: true,
    displayFog: request.displayFog,
    useAreaLighting: request.useAreaLighting,
    walkmeshOverlay: false
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolveSceneScale(width: number, height: number): number {
  return clamp(
    Math.min(width / LEGACY_SEED_SCENE_WIDTH_TILES, height / LEGACY_SEED_SCENE_HEIGHT_TILES),
    0.08,
    1
  );
}

function createCampfireProofObject(
  scene: AreaScene,
  request: AreaLightShadowPreviewRequest
): SceneObject {
  const x = request.campfireX ?? Math.max(0.5, scene.width / 2);
  const y = request.campfireY ?? Math.max(0.5, scene.height / 2);
  const z = request.campfireZ ?? 0;
  return normalizeSceneObjectMetadata({
    id: CAMPFIRE_PROOF_OBJECT_ID,
    kind: "placeables",
    name: "Fire: Campfire 1",
    resRef: CAMPFIRE_PROOF_RES_REF,
    tag: "ALS_CAMPFIRE",
    isStatic: true,
    x,
    y,
    z,
    bearing: 0,
    source: {
      type: "aurora_git",
      areaId: scene.sceneId,
      sourceObjectId: CAMPFIRE_PROOF_OBJECT_ID,
      sourceKind: "placeable",
      templateId: CAMPFIRE_PROOF_TEMPLATE_ID,
      sourceModelResRef: "plc_i06.mdl",
      localizedName: "Fire: Campfire 1",
      description: `retail oracle resref ${CAMPFIRE_PROOF_RETAIL_RES_REF}; Aurora Web template ${CAMPFIRE_PROOF_TEMPLATE_ID}`
    },
    visualTransform: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      roll: 0,
      yaw: 0
    }
  });
}

function resolveRenderObjectsForPreview(
  scene: AreaScene,
  request: AreaLightShadowPreviewRequest
): SceneObject[] {
  if (!request.renderObjects) {
    return [];
  }
  const objects = request.includeAreaObjects ? [...scene.objects] : [];
  if (!request.injectCampfire) {
    return objects;
  }
  const withoutPreviousCampfire = objects.filter(
    (object) => object.id !== CAMPFIRE_PROOF_OBJECT_ID
  );
  withoutPreviousCampfire.push(createCampfireProofObject(scene, request));
  return withoutPreviousCampfire;
}

function isPlaceablePayloadObject(object: SceneObject): boolean {
  return object.kind === "placeables" || object.kind === "doors";
}

async function resolvePlaceablePayloadsForPreview(
  request: AreaLightShadowPreviewRequest,
  accessToken: string,
  objects: SceneObject[]
): Promise<{
  readonly payloadByObjectId: Record<string, PlaceableViewportRenderPayload>;
  readonly status: string;
  readonly error: string;
}> {
  const entries = objects.filter(isPlaceablePayloadObject).map((object) => ({
    key: object.id,
    lookup: resolvePlaceableRenderPayloadLookup(object).processPayload
  }));
  if (entries.length === 0) {
    return { payloadByObjectId: {}, status: "not-requested", error: "" };
  }
  try {
    const placeableApiPort = new HttpPlaceableApiPort(fetch.bind(window), request.apiBaseUrl);
    const results = await fetchPlaceableViewportRenderPayloadBatch(
      placeableApiPort,
      accessToken,
      entries,
      {
        preferBackendViewportBatch: true,
        allowPartialProcessBatchResults: true,
        backendViewportBatchTimeoutMs: 15000,
        processBatchTimeoutMs: 15000,
        assetContractBatchTimeoutMs: 15000,
        assetContractSingleTimeoutMs: 12000
      }
    );
    return {
      payloadByObjectId: Object.fromEntries(results.map((result) => [result.key, result.payload])),
      status: results.length === entries.length ? "ready" : "partial",
      error: results.length === entries.length ? "" : `resolved ${results.length}/${entries.length}`
    };
  } catch (error) {
    return {
      payloadByObjectId: {},
      status: "error",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function resolveTileProcessReadinessForPreview(
  request: AreaLightShadowPreviewRequest,
  accessToken: string,
  area: Parameters<typeof resolveAreaTileProcessContractReadiness>[2]
): Promise<{
  readonly readiness: AreaTileProcessContractReadiness | null;
  readonly error: string;
}> {
  if (!request.tileProcess) {
    return { readiness: null, error: "" };
  }
  try {
    const tileApiPort = new HttpTileApiPort(fetch.bind(window), request.apiBaseUrl);
    return {
      readiness: await resolveAreaTileProcessContractReadiness(
        tileApiPort,
        accessToken,
        area,
        { bypassCache: false }
      ),
      error: ""
    };
  } catch (error) {
    return {
      readiness: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function splitDatasetList(value: string | undefined): string[] {
  return value && value.length > 0 ? value.split("|").filter(Boolean) : [];
}

function roundNumber(value: number): number {
  return Number(value.toFixed(4));
}

async function waitForTerrainRuntimeSettlement(
  runtime: ReturnType<typeof createRuntime>,
  render: () => void,
  timeoutMs = 8000
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (
    runtime.container.dataset.areaTerrainTileModelRuntimeStatus === "loading" &&
    Date.now() < deadline
  ) {
    render();
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }
  render();
}

async function waitForObjectRuntimeSettlement(
  runtime: ReturnType<typeof createRuntime>,
  render: () => void,
  timeoutMs = 12000
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = runtime.container.dataset.placeableModelStatus;
    if (status !== "loading" && runtime.placeableModelPendingByUrl.size === 0) {
      break;
    }
    render();
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }
  render();
}

export function AreaLightShadowPreviewRunner() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const request = useMemo(parseAreaLightShadowPreviewRequest, []);
  const [snapshot, setSnapshot] = useState<AreaLightShadowPreviewSnapshot>(() =>
    createEmptySnapshot(import.meta.env.MODE === "test" ? "skipped-test" : "loading", request)
  );

  useEffect(() => {
    if (import.meta.env.MODE === "test") {
      return undefined;
    }
    let cancelled = false;
    let cleanupRuntime: (() => void) | null = null;

    async function run(): Promise<void> {
      try {
        const host = hostRef.current;
        if (!host) {
          throw new Error("Area light shadow preview host was not mounted.");
        }

        const areaApiPort = new HttpAreaApiPort(fetch.bind(window), request.apiBaseUrl);
        const login = await areaApiPort.login(request.username, request.password);
        const processed = await areaApiPort.processArea(login.accessToken, request.areaId, {
          bypassCache: false
        });
        const tileProcessReadiness = await resolveTileProcessReadinessForPreview(
          request,
          login.accessToken,
          processed.area
        );
        if (cancelled) {
          return;
        }

        const scene = mapBackendAreaToScene(processed.area);
        const renderObjects = resolveRenderObjectsForPreview(scene, request);
        const placeablePayloadResult = request.renderObjects
          ? await resolvePlaceablePayloadsForPreview(
              request,
              login.accessToken,
              renderObjects
            )
          : { payloadByObjectId: {}, status: "not-requested", error: "" };
        if (cancelled) {
          return;
        }
        const runtime = createRuntime(host);
        cleanupRuntime = () => disposeRuntime(runtime);
        applyPlaceableAssetRequestHeaders(runtime, login.accessToken);
        host.style.width = `${request.canvasWidth}px`;
        host.style.height = `${request.canvasHeight}px`;
        resizeRuntime(runtime);
        centerCameraForScene(runtime, scene);
        const debugState = createAreaLightShadowDebugState(request);
        rebuildTerrainMesh(
          runtime,
          scene,
          null,
          debugState,
          tileProcessReadiness.readiness
        );
        if (request.renderObjects) {
          rebuildObjectMeshes(
            runtime,
            renderObjects,
            request.injectCampfire ? [CAMPFIRE_PROOF_OBJECT_ID] : [],
            debugState,
            scene.width,
            scene.height,
            resolveSceneScale(scene.width, scene.height),
            true,
            DEFAULT_AREA_SOUND_UNITS_PER_TILE,
            [],
            false,
            placeablePayloadResult.payloadByObjectId,
            null
          );
        }

        const render = () => {
          runtime.controls.update();
          runtime.renderer.render(runtime.scene, runtime.camera);
        };
        await waitForTerrainRuntimeSettlement(runtime, render);
        if (request.renderObjects) {
          await waitForObjectRuntimeSettlement(runtime, render);
          if (request.injectCampfire) {
            centerCameraForRuntimeObjectPreview(runtime);
            render();
          }
        }
        const placeableLightDiagnostics = writePlaceableTwoDaLightRenderDiagnostics(runtime);
        const diagnostics = writeAuroraScenePointLightDiagnostics(runtime);

        if (cancelled) {
          return;
        }

        const dataset = runtime.container.dataset;
        const injectedCampfire = renderObjects.find(
          (object) => object.id === CAMPFIRE_PROOF_OBJECT_ID
        );
        setSnapshot({
          status: "ready",
          error: "",
          areaId: processed.area.areaId,
          areaName: processed.area.name,
          apiBaseUrl: request.apiBaseUrl,
          displayFog: request.displayFog,
          useAreaLighting: request.useAreaLighting,
          tileProcess: request.tileProcess,
          renderObjects: request.renderObjects,
          includeAreaObjects: request.includeAreaObjects,
          injectCampfire: request.injectCampfire,
          fullViewport: request.fullViewport,
          canvasWidth: request.canvasWidth,
          canvasHeight: request.canvasHeight,
          tileProcessStatus: tileProcessReadiness.readiness?.status ?? "",
          tileProcessReadyCount: tileProcessReadiness.readiness?.readyCandidateCount ?? 0,
          tileProcessBlockedCount:
            tileProcessReadiness.readiness?.blockedCandidateCount ?? 0,
          tileProcessBlockers: tileProcessReadiness.readiness?.blockerSummary ?? "",
          tileProcessError: tileProcessReadiness.error,
          cacheHit: processed.cache.hit,
          tileCount: scene.tiles.length,
          objectCount: scene.objects.length,
          renderObjectCount: renderObjects.length,
          injectedCampfireObjectId: injectedCampfire?.id ?? "",
          injectedCampfireTemplateId: injectedCampfire?.source?.templateId ?? "",
          injectedCampfireResRef: injectedCampfire?.resRef ?? "",
          injectedCampfireRetailResRef: injectedCampfire
            ? CAMPFIRE_PROOF_RETAIL_RES_REF
            : "",
          injectedCampfirePosition: injectedCampfire
            ? [
                roundNumber(injectedCampfire.x),
                roundNumber(injectedCampfire.y),
                roundNumber(injectedCampfire.z)
              ]
            : [],
          placeableRenderPayloadStatus: placeablePayloadResult.status,
          placeableRenderPayloadCount: Object.keys(
            placeablePayloadResult.payloadByObjectId
          ).length,
          placeableRenderPayloadError: placeablePayloadResult.error,
          placeableTwoDaLightStatus: placeableLightDiagnostics.status,
          placeableTwoDaLightSourceCount: placeableLightDiagnostics.sourceGroups,
          placeableTwoDaLightPointLightCount: placeableLightDiagnostics.pointLights,
          placeableTwoDaLightHaloCount: placeableLightDiagnostics.halos,
          placeableTwoDaLightCoreCount: placeableLightDiagnostics.cores,
          placeableTwoDaLightReceiverCount: placeableLightDiagnostics.receivers,
          placeableTwoDaLightFastShadowCount: placeableLightDiagnostics.fastShadows,
          placeableTwoDaLightDisabledCount:
            placeableLightDiagnostics.disabledByLightState +
            placeableLightDiagnostics.disabledByUseAreaLighting,
          placeableTwoDaLightDisabledByLightStateCount:
            placeableLightDiagnostics.disabledByLightState,
          placeableTwoDaLightDisabledByUseAreaLightingCount:
            placeableLightDiagnostics.disabledByUseAreaLighting,
          placeableTwoDaLightSamples: [...placeableLightDiagnostics.samples],
          placeableModelStatus: dataset.placeableModelStatus ?? "",
          placeableModelMeshCount: Number(dataset.placeableModelMeshCount ?? 0),
          placeableModelUrl: dataset.placeableModelUrl ?? "",
          areaGlobalLightingStatus: dataset.areaTerrainAreaGlobalLightingStatus ?? "",
          areaGlobalLightingPhase: dataset.areaTerrainAreaGlobalLightingPhase ?? "",
          areaGlobalLightingFields: dataset.areaTerrainAreaGlobalLightingFields ?? "",
          areaGlobalShadowOpacity: dataset.areaTerrainAreaGlobalShadowOpacity ?? "",
          areaGlobalShadowOpacityFactor:
            dataset.areaTerrainAreaGlobalShadowOpacityFactor ?? "",
          areaGlobalShadowStatus: dataset.areaTerrainAreaGlobalShadowStatus ?? "",
          areaGlobalShadowSourceField:
            dataset.areaTerrainAreaGlobalShadowSourceField ?? "",
          sceneShadowProofStatus: diagnostics.shadow.proofStatus,
          sceneShadowRetailProjectionStatus: diagnostics.shadow.retailProjectionStatus,
          sceneShadowPointLightCastShadowCount:
            diagnostics.shadow.pointLightCastShadowCount,
          sceneShadowPointLightSamples: [...diagnostics.shadow.pointLightShadowSamples],
          sceneShadowItemPropertyLightShadowPolicyCount:
            diagnostics.shadow.itemPropertyLightShadowPolicyCount,
          sceneShadowItemPropertyLightShadowPolicySamples: [
            ...diagnostics.shadow.itemPropertyLightShadowPolicySamples
          ],
          sceneShadowDirectionalLightCastShadowCount:
            diagnostics.shadow.directionalLightCastShadowCount,
          sceneShadowDirectionalLightSamples: [
            ...diagnostics.shadow.directionalLightShadowSamples
          ],
          sceneShadowProgFxType4ShadowRequestCount:
            diagnostics.shadow.progFxType4ShadowRequestCount,
          sceneShadowProgFxType4ShadowRequestSamples: [
            ...diagnostics.shadow.progFxType4ShadowRequestSamples
          ],
          sceneShadowAreaStatus: diagnostics.shadow.areaShadowStatus,
          sceneShadowAreaSourceField: diagnostics.shadow.areaShadowSourceField,
          sceneShadowAreaOpacity:
            diagnostics.shadow.areaShadowOpacity === null
              ? ""
              : String(diagnostics.shadow.areaShadowOpacity),
          sceneShadowAreaOpacityFactor:
            diagnostics.shadow.areaShadowOpacityFactor === null
              ? ""
              : String(diagnostics.shadow.areaShadowOpacityFactor),
          terrainRuntimeStatus: dataset.areaTerrainTileModelRuntimeStatus ?? "",
          terrainAreaId: dataset.areaTerrainAreaId ?? "",
          terrainTileModelLoadedCount: Number(
            dataset.areaTerrainTileModelLoadedCount ?? 0
          ),
          terrainTileModelVisibleMeshCount: Number(
            dataset.areaTerrainTileModelVisibleMeshCount ?? 0
          ),
          terrainTileModelMaterialMapCount: Number(
            dataset.areaTerrainTileModelMaterialMapCount ?? 0
          ),
          terrainTileModelVisibleMeshSample:
            dataset.areaTerrainTileModelVisibleMeshSample ?? "",
          terrainTileShadowReceiverMeshCount: Number(
            dataset.areaTerrainTileShadowReceiverMeshCount ?? 0
          ),
          terrainTileShadowReceiverStatus:
            dataset.areaTerrainTileShadowReceiverStatus ?? "",
          terrainTileShadowReceiverSource:
            dataset.areaTerrainTileShadowReceiverSource ?? "",
          terrainTileShadowReceiverSample:
            dataset.areaTerrainTileShadowReceiverSample ?? "",
          cameraPosition: [
            roundNumber(runtime.camera.position.x),
            roundNumber(runtime.camera.position.y),
            roundNumber(runtime.camera.position.z)
          ]
        });
      } catch (error) {
        if (!cancelled) {
          setSnapshot(
            createEmptySnapshot(
              "error",
              request,
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
      data-testid="area-light-shadow-preview-runner"
      data-render-status={snapshot.status}
      data-area-id={snapshot.areaId}
      data-area-name={snapshot.areaName}
      data-api-base-url={snapshot.apiBaseUrl}
      data-cache-hit={snapshot.cacheHit === null ? "" : String(snapshot.cacheHit)}
      data-tile-count={snapshot.tileCount}
      data-object-count={snapshot.objectCount}
      data-render-object-count={snapshot.renderObjectCount}
      data-display-fog={String(snapshot.displayFog)}
      data-use-area-lighting={String(snapshot.useAreaLighting)}
      data-tile-process={String(snapshot.tileProcess)}
      data-render-objects={String(snapshot.renderObjects)}
      data-include-area-objects={String(snapshot.includeAreaObjects)}
      data-inject-campfire={String(snapshot.injectCampfire)}
      data-full-viewport={String(snapshot.fullViewport)}
      data-canvas-width={snapshot.canvasWidth}
      data-canvas-height={snapshot.canvasHeight}
      data-tile-process-status={snapshot.tileProcessStatus}
      data-tile-process-ready-count={snapshot.tileProcessReadyCount}
      data-tile-process-blocked-count={snapshot.tileProcessBlockedCount}
      data-tile-process-blockers={snapshot.tileProcessBlockers}
      data-tile-process-error={snapshot.tileProcessError}
      data-injected-campfire-object-id={snapshot.injectedCampfireObjectId}
      data-injected-campfire-template-id={snapshot.injectedCampfireTemplateId}
      data-injected-campfire-res-ref={snapshot.injectedCampfireResRef}
      data-injected-campfire-retail-res-ref={snapshot.injectedCampfireRetailResRef}
      data-injected-campfire-position={snapshot.injectedCampfirePosition.join(",")}
      data-placeable-render-payload-status={snapshot.placeableRenderPayloadStatus}
      data-placeable-render-payload-count={snapshot.placeableRenderPayloadCount}
      data-placeable-render-payload-error={snapshot.placeableRenderPayloadError}
      data-placeable-two-da-light-status={snapshot.placeableTwoDaLightStatus}
      data-placeable-two-da-light-source-count={snapshot.placeableTwoDaLightSourceCount}
      data-placeable-two-da-light-point-light-count={
        snapshot.placeableTwoDaLightPointLightCount
      }
      data-placeable-two-da-light-halo-count={snapshot.placeableTwoDaLightHaloCount}
      data-placeable-two-da-light-core-count={snapshot.placeableTwoDaLightCoreCount}
      data-placeable-two-da-light-receiver-count={snapshot.placeableTwoDaLightReceiverCount}
      data-placeable-two-da-light-fast-shadow-count={
        snapshot.placeableTwoDaLightFastShadowCount
      }
      data-placeable-two-da-light-disabled-count={snapshot.placeableTwoDaLightDisabledCount}
      data-placeable-two-da-light-disabled-by-light-state-count={
        snapshot.placeableTwoDaLightDisabledByLightStateCount
      }
      data-placeable-two-da-light-disabled-by-use-area-lighting-count={
        snapshot.placeableTwoDaLightDisabledByUseAreaLightingCount
      }
      data-placeable-two-da-light-samples={snapshot.placeableTwoDaLightSamples.join("|")}
      data-placeable-model-status={snapshot.placeableModelStatus}
      data-placeable-model-mesh-count={snapshot.placeableModelMeshCount}
      data-placeable-model-url={snapshot.placeableModelUrl}
      data-area-global-lighting-status={snapshot.areaGlobalLightingStatus}
      data-area-global-lighting-phase={snapshot.areaGlobalLightingPhase}
      data-area-global-lighting-fields={snapshot.areaGlobalLightingFields}
      data-area-global-shadow-opacity={snapshot.areaGlobalShadowOpacity}
      data-area-global-shadow-opacity-factor={snapshot.areaGlobalShadowOpacityFactor}
      data-area-global-shadow-status={snapshot.areaGlobalShadowStatus}
      data-area-global-shadow-source-field={snapshot.areaGlobalShadowSourceField}
      data-scene-shadow-proof-status={snapshot.sceneShadowProofStatus}
      data-scene-shadow-retail-projection-status={
        snapshot.sceneShadowRetailProjectionStatus
      }
      data-scene-shadow-point-light-cast-shadow-count={
        snapshot.sceneShadowPointLightCastShadowCount
      }
      data-scene-shadow-point-light-samples={
        snapshot.sceneShadowPointLightSamples.join("|")
      }
      data-scene-shadow-item-property-light-shadow-policy-count={
        snapshot.sceneShadowItemPropertyLightShadowPolicyCount
      }
      data-scene-shadow-item-property-light-shadow-policy-samples={
        snapshot.sceneShadowItemPropertyLightShadowPolicySamples.join("|")
      }
      data-scene-shadow-directional-light-cast-shadow-count={
        snapshot.sceneShadowDirectionalLightCastShadowCount
      }
      data-scene-shadow-directional-light-samples={
        snapshot.sceneShadowDirectionalLightSamples.join("|")
      }
      data-scene-shadow-progfx-type4-shadow-request-count={
        snapshot.sceneShadowProgFxType4ShadowRequestCount
      }
      data-scene-shadow-progfx-type4-shadow-request-samples={
        snapshot.sceneShadowProgFxType4ShadowRequestSamples.join("|")
      }
      data-scene-shadow-area-status={snapshot.sceneShadowAreaStatus}
      data-scene-shadow-area-source-field={snapshot.sceneShadowAreaSourceField}
      data-scene-shadow-area-opacity={snapshot.sceneShadowAreaOpacity}
      data-scene-shadow-area-opacity-factor={snapshot.sceneShadowAreaOpacityFactor}
      data-terrain-runtime-status={snapshot.terrainRuntimeStatus}
      data-terrain-area-id={snapshot.terrainAreaId}
      data-terrain-tile-model-loaded-count={snapshot.terrainTileModelLoadedCount}
      data-terrain-tile-model-visible-mesh-count={
        snapshot.terrainTileModelVisibleMeshCount
      }
      data-terrain-tile-model-material-map-count={
        snapshot.terrainTileModelMaterialMapCount
      }
      data-terrain-tile-model-visible-mesh-sample={
        snapshot.terrainTileModelVisibleMeshSample
      }
      data-terrain-tile-shadow-receiver-mesh-count={
        snapshot.terrainTileShadowReceiverMeshCount
      }
      data-terrain-tile-shadow-receiver-status={
        snapshot.terrainTileShadowReceiverStatus
      }
      data-terrain-tile-shadow-receiver-source={
        snapshot.terrainTileShadowReceiverSource
      }
      data-terrain-tile-shadow-receiver-sample={
        snapshot.terrainTileShadowReceiverSample
      }
      data-camera-position={snapshot.cameraPosition.join(",")}
      data-error={snapshot.error}
      style={{
        margin: 0,
        minHeight: snapshot.fullViewport ? `${snapshot.canvasHeight}px` : "100vh",
        width: snapshot.fullViewport ? `${snapshot.canvasWidth}px` : "auto",
        display: "grid",
        placeItems: snapshot.fullViewport ? "stretch" : "center",
        background: "#07111b",
        overflow: "hidden"
      }}
    >
      <div
        ref={hostRef}
        aria-label="area light shadow render canvas"
        style={{ width: snapshot.canvasWidth, height: snapshot.canvasHeight }}
      />
      <script
        id="area-light-shadow-preview-frame"
        type="application/json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            ...snapshot,
            sceneShadowPointLightSamples: splitDatasetList(
              snapshot.sceneShadowPointLightSamples.join("|")
            ),
            sceneShadowItemPropertyLightShadowPolicySamples: splitDatasetList(
              snapshot.sceneShadowItemPropertyLightShadowPolicySamples.join("|")
            ),
            sceneShadowDirectionalLightSamples: splitDatasetList(
              snapshot.sceneShadowDirectionalLightSamples.join("|")
            ),
            sceneShadowProgFxType4ShadowRequestSamples: splitDatasetList(
              snapshot.sceneShadowProgFxType4ShadowRequestSamples.join("|")
            ),
            placeableTwoDaLightSamples: splitDatasetList(
              snapshot.placeableTwoDaLightSamples.join("|")
            )
          })
        }}
      />
    </main>
  );
}
