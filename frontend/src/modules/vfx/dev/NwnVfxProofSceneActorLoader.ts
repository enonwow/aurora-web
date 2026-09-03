import * as THREE from "three";
import type { WorkspaceToolbarState } from "../../layout/roleTopbarPolicy";
import type { SceneObject } from "../../scene/contracts";
import type {
  CreatureApiProcessPayload,
  CreatureApiProcessResult
} from "../../creatures/contracts";
import type { CreatureViewportRenderPayload } from "../../creatures/application/creatureRenderPayloadResolver";
import {
  createRuntime,
  disposeRuntime,
  sampleRuntimeObjectAnimationAtTime,
  type RuntimeState
} from "../../layout/adapters/three/workspaceThreeRuntime";
import { rebuildObjectMeshes } from "../../layout/adapters/three/workspaceObjectMeshLayer";
import {
  readVfxRuntimeAssetSettlement,
  recordVfxRuntimeAssetSettlement,
  registerVfxRuntimeExpectedAssets
} from "../application/vfxRuntimeObservability";

const DEFAULT_API_BASE_URL = "/_aurora/v1";
const ACTOR_LOAD_TIMEOUT_MS = 120_000;

export interface NwnVfxProofSceneActor {
  role?: string;
  instanceId?: string;
  templateResRef?: string;
  processResRef?: string;
  renderMode?: "direct" | "part-based";
  creatureMetadata?: CreatureApiProcessPayload["creatureMetadata"];
  creatureAppearanceOverride?: CreatureApiProcessPayload["creatureAppearanceOverride"];
  appearanceId?: number;
  appearanceLabel?: string;
  sourceModel?: string;
  sourceModelSource?: string;
  sourceModelObjectKeyIncludes?: string;
  supermodel?: string;
  animationName?: string;
  expectedPartModelResRefs?: string[];
  expectedEquipmentResRefs?: string[];
  expectedMaterialColors?: {
    leather1?: number;
    leather2?: number;
    cloth1?: number;
    cloth2?: number;
    metal1?: number;
    metal2?: number;
  };
  sourceBicSha256?: string;
  normalizedPosition?: [number, number, number];
  bearingRadians?: number;
  sourceForwardAuroraXY?: [number, number];
  sourceForwardSource?: string;
  sourceBoundsHeight?: number;
  sourceHakListCount?: number;
  sourceHakListSha256?: string;
}

export interface NwnVfxLoadedProofSceneActor {
  root: THREE.Object3D;
  runtime: RuntimeState;
  sourceBounds: {
    width: number;
    height: number;
    depth: number;
  };
  sampleAt(timeSeconds: number): void;
  dispose(): void;
}

interface CreatureProcessEnvelope {
  data?: CreatureApiProcessResult;
}

interface AuthLoginEnvelope {
  data?: {
    session?: {
      accessToken?: string;
    };
  };
}

export function resolveNwnVfxProofSceneActorPosition(
  actor: NwnVfxProofSceneActor
): [number, number, number] {
  const [x, y, z] = actor.normalizedPosition ?? [0, 0, 0];
  return [x, z, y];
}

export function resolveNwnVfxProofSceneActorRotationY(
  actor: NwnVfxProofSceneActor
): number {
  const [forwardX, forwardY] = actor.sourceForwardAuroraXY ?? [
    Number.NaN,
    Number.NaN
  ];
  const length = Math.hypot(forwardX, forwardY);
  if (!Number.isFinite(length) || length <= 1e-8) {
    throw new Error("VFX proof-scene target actor source forward vector is missing.");
  }
  return Math.atan2(forwardX / length, forwardY / length);
}

export function buildNwnVfxProofSceneActorProcessPayload(
  actor: NwnVfxProofSceneActor
): CreatureApiProcessPayload {
  const resref = actor.processResRef?.trim() || actor.templateResRef?.trim();
  if (!resref) {
    throw new Error("VFX proof-scene actor process resref is missing.");
  }
  return {
    resref,
    bypassCache: true,
    includeBenchmarkMetadata: false,
    creatureMetadata:
      actor.creatureMetadata ?? {
        appearanceId: actor.appearanceId ?? 0,
        appearanceType: actor.appearanceId ?? 0,
        gender: 0,
        race: 6,
        phenotype: 0
      },
    ...(actor.creatureAppearanceOverride
      ? { creatureAppearanceOverride: actor.creatureAppearanceOverride }
      : {})
  };
}

export function createNwnVfxProofSceneActorRuntimeHost(
  host: HTMLDivElement,
  instanceId: string
): HTMLDivElement {
  const runtimeHost = document.createElement("div");
  runtimeHost.dataset.vfxProofActorInstanceId = instanceId;
  host.append(runtimeHost);
  return runtimeHost;
}

export function resolveNwnVfxProofSceneActorRendererContract(): {
  renderAreaGeometry: false;
  creatureModelPresentationMode: "source-model-units";
} {
  return {
    renderAreaGeometry: false,
    creatureModelPresentationMode: "source-model-units"
  };
}

export function validateNwnVfxProofSceneActorRenderPackage(
  actor: NwnVfxProofSceneActor,
  creature: CreatureApiProcessResult["creature"]
): void {
  const renderPackage = creature.creatureRenderPackage;
  const appearance = renderPackage?.appearanceProfile;
  const renderMode = actor.renderMode ?? "direct";
  const directModel = renderPackage?.sourceModelCandidates?.find(
    (entry) => entry.role === "appearance-race-model"
  );
  const skeletonModel = renderPackage?.skeletonModelCandidates?.find(
    (entry) => entry.resref.toLowerCase() === actor.sourceModel?.toLowerCase()
  );
  const sourceModels = renderPackage?.sourceMdlInspection?.models ?? [];
  const sourceModel = sourceModels.find(
    (entry) =>
      entry.sourceModelFileName?.toLowerCase() ===
      `${actor.sourceModel?.toLowerCase()}.mdl`
  );
  const requiredSupermodel = actor.supermodel?.trim().toLowerCase();
  const supermodel = sourceModels.find(
    (entry) =>
      entry.sourceModelFileName?.toLowerCase() ===
      `${requiredSupermodel}.mdl`
  );
  const animationName = actor.animationName?.trim().toLowerCase();
  const availableAnimationNames = new Set(
    (supermodel?.animations ?? []).map((entry) => entry.name?.toLowerCase())
  );
  const partModelResRefs = new Set(
    (renderPackage?.partModelCandidates ?? []).map((entry) =>
      entry.modelResRef?.toLowerCase()
    )
  );
  const equipmentResRefs = new Set(
    (renderPackage?.equipmentModelCandidates ?? []).map((entry) =>
      entry.resref.toLowerCase()
    )
  );
  const expectedMaterialColors = actor.expectedMaterialColors;
  const equippedPartCandidates = (renderPackage?.partModelCandidates ?? []).filter(
    (entry) => entry.sourceKey.startsWith("creature-equipment-armor-part:")
  );
  const materialColorsMatch = expectedMaterialColors
    ? equippedPartCandidates.length > 0 &&
      equippedPartCandidates.every((entry) =>
        Object.entries(expectedMaterialColors).every(
          ([key, value]) =>
            entry.materialColors?.[
              key as keyof NonNullable<typeof entry.materialColors>
            ] === value
        )
      )
    : true;
  const sourceModelObjectKeyIncludes =
    actor.sourceModelObjectKeyIncludes?.trim().toLowerCase() ||
    (renderMode === "direct" ? "hak/cep3_core0/c_yinnkeep.mdl" : "");
  const failures = [
    ...(renderPackage?.status === "ready" ? [] : ["render-package-not-ready"]),
    ...(appearance?.appearanceType === actor.appearanceId
      ? []
      : ["appearance-id-mismatch"]),
    ...(renderMode !== "direct" ||
    appearance?.raceModel?.toLowerCase() === actor.sourceModel?.toLowerCase()
      ? []
      : ["source-model-mismatch"]),
    ...(appearance?.appearanceSourceKey
        ?.toLowerCase()
        .includes("hak/lc_2da/appearance.2da")
      ? []
      : ["appearance-source-precedence-mismatch"]),
    ...((renderMode === "direct" ? directModel : skeletonModel)?.supermodelResRef?.toLowerCase() ===
    requiredSupermodel
      ? []
      : ["supermodel-mismatch"]),
    ...(!sourceModelObjectKeyIncludes ||
    sourceModel?.sourceModelObjectKey
        ?.toLowerCase()
        .includes(sourceModelObjectKeyIncludes)
      ? []
      : ["source-model-precedence-mismatch"]),
    ...(sourceModel?.supermodel?.toLowerCase() === requiredSupermodel
      ? []
      : ["source-model-supermodel-mismatch"]),
    ...(animationName && availableAnimationNames.has(animationName)
      ? []
      : ["animation-missing"]),
    ...((actor.expectedPartModelResRefs ?? []).every((resref) =>
      partModelResRefs.has(resref.toLowerCase())
    )
      ? []
      : ["part-model-set-mismatch"]),
    ...((actor.expectedEquipmentResRefs ?? []).every((resref) =>
      equipmentResRefs.has(resref.toLowerCase())
    )
      ? []
      : ["equipment-set-mismatch"]),
    ...(materialColorsMatch ? [] : ["material-colors-mismatch"])
  ];
  if (failures.length > 0) {
    throw new Error(`VFX proof-scene actor validation failed: ${failures.join(",")}`);
  }
}

export async function loadNwnVfxProofSceneActor(input: {
  actor: NwnVfxProofSceneActor;
  host: HTMLDivElement;
  observabilityRuntime: object;
  apiBaseUrl?: string;
}): Promise<NwnVfxLoadedProofSceneActor> {
  const apiBaseUrl = (input.apiBaseUrl ?? DEFAULT_API_BASE_URL).replace(/\/+$/u, "");
  const actor = input.actor;
  const processResRef = actor.processResRef?.trim() || actor.templateResRef?.trim();
  const instanceId = actor.instanceId?.trim();
  if (!processResRef || !instanceId) {
    throw new Error("VFX proof-scene actor identity is incomplete.");
  }

  const accessToken = await loginForProofActor(apiBaseUrl, input.observabilityRuntime);
  const processResult = await processProofActor(
    apiBaseUrl,
    accessToken,
    actor,
    input.observabilityRuntime
  );
  validateNwnVfxProofSceneActorRenderPackage(actor, processResult.creature);
  const payload = buildCreatureViewportPayload(processResult, apiBaseUrl);
  const object = createProofActorObject(actor, processResult.creature);
  const runtimeHost = createNwnVfxProofSceneActorRuntimeHost(input.host, instanceId);
  const runtime = createRuntime(runtimeHost);
  runtime.placeableModelRequestHeader = {
    Authorization: `Bearer ${accessToken}`
  };
  runtime.placeableTextureRequestHeader = {
    Authorization: `Bearer ${accessToken}`
  };
  const rendererContract = resolveNwnVfxProofSceneActorRendererContract();
  rebuildObjectMeshes(
    runtime,
    [object],
    [],
    createActorDebugState(),
    1,
    1,
    1,
    rendererContract.renderAreaGeometry,
    10,
    [],
    false,
    null,
    { [object.id]: payload },
    null,
    {
      creatureModelPresentationMode:
        rendererContract.creatureModelPresentationMode
    }
  );

  await waitForActorRuntime(runtime, object.id);
  sampleRuntimeObjectAnimationAtTime(runtime, 0);
  const root = runtime.objectMeshById.get(object.id);
  if (!root) {
    disposeRuntime(runtime);
    throw new Error("VFX proof-scene target actor root was not produced.");
  }

  root.rotation.set(0, resolveNwnVfxProofSceneActorRotationY(actor), 0);
  const sourceBounds = applyProofActorSourceScaleAndPlacement(root, actor);
  runtime.objectLayer.remove(root);
  root.name = `nwn-vfx-proof-scene-actor:${processResRef}`;
  root.userData = {
    ...root.userData,
    auroraVfxProofSceneActor: true,
    auroraVfxProofSceneActorRole: actor.role ?? "",
    auroraVfxProofSceneActorInstanceId: instanceId,
    auroraVfxProofSceneActorTemplateResRef: actor.templateResRef ?? "",
    auroraVfxProofSceneActorProcessResRef: processResRef,
    auroraVfxProofSceneActorRenderMode: actor.renderMode ?? "direct",
    auroraVfxProofSceneActorRendererSpace: "source-model-units",
    auroraVfxProofSceneActorBoundsScaleMode:
      actor.sourceBoundsHeight !== undefined
        ? "immutable-source-bounds-height"
        : "source-model-units",
    auroraVfxProofSceneActorSourceBicSha256: actor.sourceBicSha256 ?? "",
    auroraVfxProofSceneActorAppearanceId: actor.appearanceId ?? null,
    auroraVfxProofSceneActorSourceModel: actor.sourceModel ?? "",
    auroraVfxProofSceneActorSupermodel: actor.supermodel ?? "",
    auroraVfxProofSceneActorAnimationName: actor.animationName ?? "",
    auroraVfxProofSceneActorSourceBearingRadians: actor.bearingRadians ?? 0,
    auroraVfxProofSceneActorSourceForwardAuroraXY:
      actor.sourceForwardAuroraXY ?? null,
    auroraVfxProofSceneActorSourceForwardSource:
      actor.sourceForwardSource ?? "",
    auroraVfxProofSceneActorRenderYawRadians:
      resolveNwnVfxProofSceneActorRotationY(actor),
    auroraVfxProofSceneActorBearingMapping:
      "atan2(sourceForwardX,sourceForwardY): Aurora XY forward -> Three +Z model front",
    auroraVfxProofSceneActorSourceBounds: sourceBounds,
    auroraVfxProofSceneActorStatus:
      actor.renderMode === "part-based"
        ? "source-backed-bic-part-models-equipment-supermodel-pause1-playing"
        : "source-backed-direct-model-supermodel-pause1-playing"
  };
  mergeActorRuntimeAssetSettlement(runtime, input.observabilityRuntime);

  let disposed = false;
  return {
    root,
    runtime,
    sourceBounds,
    sampleAt(timeSeconds: number) {
      if (!disposed) {
        sampleRuntimeObjectAnimationAtTime(runtime, Math.max(0, timeSeconds));
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      disposeObjectResources(root);
      disposeRuntime(runtime);
      runtimeHost.remove();
    }
  };
}

async function loginForProofActor(
  apiBaseUrl: string,
  observabilityRuntime: object
): Promise<string> {
  const key = `${apiBaseUrl}/auth/login#vfx-proof-actor`;
  registerVfxRuntimeExpectedAssets(observabilityRuntime, [
    { key, kind: "unknown", reference: "vfx-proof-actor-login" }
  ]);
  const startedAtMs = Date.now();
  recordVfxRuntimeAssetSettlement(observabilityRuntime, key, {
    stage: "requested",
    startedAtMs
  });
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "builder.user", password: "builder123" })
  });
  const body = (await response.json()) as AuthLoginEnvelope;
  const accessToken = body.data?.session?.accessToken?.trim();
  if (!response.ok || !accessToken) {
    recordVfxRuntimeAssetSettlement(observabilityRuntime, key, {
      stage: "failed",
      completedAtMs: Date.now(),
      httpStatus: response.status,
      error: `VFX proof-scene actor login failed: HTTP ${response.status}`
    });
    throw new Error(`VFX proof-scene actor login failed: HTTP ${response.status}`);
  }
  recordVfxRuntimeAssetSettlement(observabilityRuntime, key, {
    stage: "bound",
    completedAtMs: Date.now(),
    httpStatus: response.status
  });
  return accessToken;
}

async function processProofActor(
  apiBaseUrl: string,
  accessToken: string,
  actor: NwnVfxProofSceneActor,
  observabilityRuntime: object
): Promise<CreatureApiProcessResult> {
  const key = `${apiBaseUrl}/catalog/creatures/process#${actor.instanceId}`;
  registerVfxRuntimeExpectedAssets(observabilityRuntime, [
    {
      key,
      kind: "unknown",
      reference: actor.processResRef ?? actor.templateResRef
    }
  ]);
  const startedAtMs = Date.now();
  recordVfxRuntimeAssetSettlement(observabilityRuntime, key, {
    stage: "requested",
    startedAtMs
  });
  const response = await fetch(`${apiBaseUrl}/catalog/creatures/process`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(buildNwnVfxProofSceneActorProcessPayload(actor))
  });
  const body = (await response.json()) as CreatureProcessEnvelope | CreatureApiProcessResult;
  const result = "creature" in body ? body : body.data;
  if (!response.ok || !result) {
    recordVfxRuntimeAssetSettlement(observabilityRuntime, key, {
      stage: "failed",
      completedAtMs: Date.now(),
      httpStatus: response.status,
      error: `VFX proof-scene target actor process failed: HTTP ${response.status}`
    });
    throw new Error(`VFX proof-scene target actor process failed: HTTP ${response.status}`);
  }
  recordVfxRuntimeAssetSettlement(observabilityRuntime, key, {
    stage: "bound",
    completedAtMs: Date.now(),
    httpStatus: response.status
  });
  return result;
}

function buildCreatureViewportPayload(
  processResult: CreatureApiProcessResult,
  apiBaseUrl: string
): CreatureViewportRenderPayload {
  const creature = rewriteAssetUrls(
    processResult.creature,
    apiBaseUrl
  ) as CreatureApiProcessResult["creature"];
  return {
    templateId: creature.templateId,
    cacheKey: processResult.cache.key,
    cacheHit: processResult.cache.hit,
    storedAt: processResult.cache.storedAt,
    hits: processResult.cache.hits,
    creature,
    renderPackage: creature.creatureRenderPackage
  };
}

function rewriteAssetUrls(value: unknown, apiBaseUrl: string): unknown {
  if (typeof value === "string") {
    if (value.startsWith("/api/v1/")) {
      return `${apiBaseUrl}${value.slice("/api/v1".length)}`;
    }
    if (value.startsWith("/_aurora/v1/")) {
      return `${apiBaseUrl}${value.slice("/_aurora/v1".length)}`;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => rewriteAssetUrls(entry, apiBaseUrl));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        rewriteAssetUrls(entry, apiBaseUrl)
      ])
    );
  }
  return value;
}

function createProofActorObject(
  actor: NwnVfxProofSceneActor,
  creature: CreatureApiProcessResult["creature"]
): SceneObject {
  const [x, y] = actor.normalizedPosition ?? [0, 0, 0];
  return {
    id: actor.instanceId ?? `proof:${creature.resref}`,
    kind: "creatures",
    name: creature.name,
    resRef: creature.resref,
    tag: String(creature.metadata?.tag ?? creature.resref).toUpperCase(),
    x,
    y,
    z: 0,
    bearing: actor.bearingRadians ?? 0,
    visualTransform: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      yaw: 0,
      roll: 0
    },
    creatureProperties: {
      firstName: creature.name,
      lastName: "",
      race: "",
      appearance: actor.appearanceLabel ?? "",
      phenotype: "",
      gender: "",
      description: "",
      challengeRating: 0,
      portraitResRef: "",
      conversation: "",
      noInterrupt: false,
      advancedSettings: {
        blueprintResRef: creature.resref,
        disarmable: true,
        plot: false,
        leavesLootableCorpse: false,
        noPermanentDeath: false,
        immortal: false,
        treasureModel: "",
        corpseDecayTimeSeconds: 0,
        faction: "",
        subrace: "",
        deity: "",
        challengeRatingAdjustment: 0,
        soundSet: "",
        perceptionRange: "",
        animationName: actor.animationName ?? ""
      }
    },
    source: {
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: actor.instanceId,
      templateId: creature.templateId
    }
  };
}

function createActorDebugState(): WorkspaceToolbarState["canvasDebug"] {
  return {
    wireframe: false,
    textures: true,
    grid: false,
    axes: false,
    bounds: false,
    displayShadows: false,
    displayFog: false,
    useAreaLighting: true,
    ceilingMeshes: true,
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
      encounters: false,
      items: false,
      placeables: false,
      sounds: false,
      stores: false,
      triggers: false,
      waypoints: false
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

async function waitForActorRuntime(runtime: RuntimeState, objectId: string): Promise<void> {
  const startedAt = performance.now();
  while (performance.now() - startedAt < ACTOR_LOAD_TIMEOUT_MS) {
    const root = runtime.objectMeshById.get(objectId);
    if (
      root &&
      isNwnVfxProofSceneActorRuntimeSettled(runtime.container.dataset)
    ) {
      return;
    }
    await new Promise<void>((resolve) => window.setTimeout(resolve, 20));
  }
  throw new Error(
    `VFX proof-scene target actor settlement timeout: ${JSON.stringify({
      status: runtime.container.dataset.placeableModelStatus ?? "",
      loadPhase: runtime.container.dataset.placeableModelLoadPhase ?? "",
      loadCompleted:
        runtime.container.dataset.placeableModelLoadCompleted ?? "",
      loadTotal: runtime.container.dataset.placeableModelLoadTotal ?? "",
      textureStatus: runtime.container.dataset.placeableModelTextureStatus ?? "",
      playbackStatus:
        runtime.container.dataset.creatureAnimationRuntimePlaybackStatuses ?? ""
    })}`
  );
}

export function isNwnVfxProofSceneActorRuntimeSettled(
  dataset: Partial<
    Pick<
      DOMStringMap,
      | "placeableModelStatus"
      | "placeableModelLoadPhase"
      | "placeableModelLoadCompleted"
      | "placeableModelLoadTotal"
      | "placeableModelTextureStatus"
      | "creatureAnimationRuntimePlaybackStatuses"
    >
  >
): boolean {
  const completed = Number(dataset.placeableModelLoadCompleted);
  const total = Number(dataset.placeableModelLoadTotal);
  const directLoadComplete = dataset.placeableModelLoadPhase === "complete";
  const modularLoadComplete =
    dataset.placeableModelLoadPhase === "creature-part-models" &&
    dataset.placeableModelStatus === "loaded" &&
    Number.isFinite(completed) &&
    Number.isFinite(total) &&
    total > 0 &&
    completed === total;
  const textureApplied = dataset.placeableModelTextureStatus === "applied";
  const mixerPlaying =
    dataset.creatureAnimationRuntimePlaybackStatuses
      ?.split(",")
      .includes("playing") === true;
  return (directLoadComplete || modularLoadComplete) && textureApplied && mixerPlaying;
}

function applyProofActorSourceScaleAndPlacement(
  root: THREE.Object3D,
  actor: NwnVfxProofSceneActor
): { width: number; height: number; depth: number } {
  root.updateWorldMatrix(true, true);
  const initialBounds = new THREE.Box3().setFromObject(root);
  const initialSize = initialBounds.getSize(new THREE.Vector3());
  const sourceBoundsHeight = actor.sourceBoundsHeight ?? initialSize.y;
  if (initialSize.y <= 0 || sourceBoundsHeight <= 0) {
    throw new Error("VFX proof-scene target actor bounds are empty.");
  }
  root.scale.multiplyScalar(sourceBoundsHeight / initialSize.y);
  const [x, y, z] = resolveNwnVfxProofSceneActorPosition(actor);
  root.position.set(x, y, z);
  root.updateWorldMatrix(true, true);
  const scaledBounds = new THREE.Box3().setFromObject(root);
  root.position.y += y - scaledBounds.min.y;
  root.updateWorldMatrix(true, true);
  const finalSize = new THREE.Box3()
    .setFromObject(root)
    .getSize(new THREE.Vector3());
  return {
    width: finalSize.x,
    height: finalSize.y,
    depth: finalSize.z
  };
}

function mergeActorRuntimeAssetSettlement(
  actorRuntime: RuntimeState,
  observabilityRuntime: object
): void {
  readVfxRuntimeAssetSettlement(actorRuntime).forEach((entry) => {
    registerVfxRuntimeExpectedAssets(observabilityRuntime, [
      {
        key: entry.key,
        kind: entry.kind,
        ...(entry.reference ? { reference: entry.reference } : {})
      }
    ]);
    if (entry.stage === "expected") {
      return;
    }
    recordVfxRuntimeAssetSettlement(observabilityRuntime, entry.key, {
      stage: entry.stage,
      ...(entry.startedAtMs === null ? {} : { startedAtMs: entry.startedAtMs }),
      ...(entry.completedAtMs === null
        ? {}
        : { completedAtMs: entry.completedAtMs }),
      ...(entry.httpStatus === null ? {} : { httpStatus: entry.httpStatus }),
      retryCount: entry.retryCount,
      error: entry.error
    });
  });
}

function disposeObjectResources(root: THREE.Object3D): void {
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    node.geometry.dispose();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      Object.values(material).forEach((value) => {
        if (value instanceof THREE.Texture) {
          value.dispose();
        }
      });
      material.dispose();
    });
  });
}
