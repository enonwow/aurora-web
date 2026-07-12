import { useEffect, useMemo, useRef, useState } from "react";
import type { WorkspaceToolbarState } from "../../layout/roleTopbarPolicy";
import type { AreaScene, SceneObject } from "../../scene/contracts";
import type {
  CreatureApiProcessResult
} from "../contracts";
import type { CreatureViewportRenderPayload } from "../application/creatureRenderPayloadResolver";
import {
  centerCameraForScene,
  createRuntime,
  disposeRuntime,
  resizeRuntime,
  updateRuntimeObjectAnimationPlaybacks
} from "../../layout/adapters/three/workspaceThreeRuntime";
import { rebuildGridLayer } from "../../layout/adapters/three/workspaceGridLayer";
import { rebuildObjectMeshes } from "../../layout/adapters/three/workspaceObjectMeshLayer";
import {
  installAuroraCreatureProofRuntimeHook,
  uninstallAuroraCreatureProofRuntimeHook
} from "../../layout/components/WorkspaceCanvasViewport";

const CREATURE_EQUIPMENT_ANIMATION_PROOF_PATH =
  "/dev/creature-equipment-animation-proof";
const DEFAULT_ANIMATION_NAME = "2hslashl";

interface CreatureEquipmentAnimationProofRequest {
  cacheKey: string;
  sourceResref: string;
  equipmentResref: string;
  equipmentResrefs: string[];
  animationName: string;
  apiBaseUrl: string;
}

interface CreatureEquipmentAnimationProofSnapshot {
  status: "loading" | "ready" | "error";
  error: string | null;
  cacheKey: string;
  resref: string;
  animationName: string;
  canvasNonblank: boolean;
  equipmentModelPartLoadedCount: string;
  equipmentModelPartTotalCount: string;
  equipmentModelPartResRefs: string;
  equipmentModelPartEquipmentResRefs: string;
  equipmentItemGroupTransformStatuses: string;
  creatureAnimationMixerActionNames: string;
  creatureAnimationMixerPlaybackStatuses: string;
  creatureAnimationMixerCompletedActionNames: string;
}

export function isCreatureEquipmentAnimationProofRunnerPath(pathname: string): boolean {
  return pathname === CREATURE_EQUIPMENT_ANIMATION_PROOF_PATH;
}

function parseCreatureEquipmentAnimationProofRequest(
  search = window.location.search
): CreatureEquipmentAnimationProofRequest {
  const params = new URLSearchParams(search);
  const equipmentResrefs = [
    ...splitCreatureEquipmentProofResrefs(params.get("equipmentResrefs")),
    ...splitCreatureEquipmentProofResrefs(params.get("equipmentRefs")),
    ...splitCreatureEquipmentProofResrefs(params.get("equipmentResref")),
    ...splitCreatureEquipmentProofResrefs(params.get("equipment")),
    ...splitCreatureEquipmentProofResrefs(params.get("ammoResref")),
    ...splitCreatureEquipmentProofResrefs(params.get("ammo"))
  ].filter((entry, index, entries) => entries.indexOf(entry) === index);
  return {
    cacheKey: params.get("cacheKey")?.trim() ?? "",
    sourceResref: params.get("sourceResref")?.trim() ?? "",
    equipmentResref: equipmentResrefs[0] ?? "",
    equipmentResrefs,
    animationName: params.get("animation")?.trim() || DEFAULT_ANIMATION_NAME,
    apiBaseUrl: (params.get("apiBaseUrl")?.trim() || "/_aurora/v1").replace(
      /\/+$/u,
      ""
    )
  };
}

function splitCreatureEquipmentProofResrefs(value: string | null): string[] {
  return String(value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function resolveCreatureEquipmentProofSlotMask(resref: string, index: number): number {
  const normalized = resref.trim().toLowerCase();
  if (/wamar/u.test(normalized)) {
    return 0x000800;
  }
  if (/wambu/u.test(normalized)) {
    return 0x001000;
  }
  if (/wambo|wammbo/u.test(normalized)) {
    return 0x002000;
  }
  return index === 0 ? 0x000010 : 0x000010;
}

function isCreatureApiProcessResult(value: unknown): value is CreatureApiProcessResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "cache" in value &&
    "creature" in value
  );
}

function readPersistedAccessToken(): string {
  const raw = window.localStorage.getItem("aurora_web.auth_session.v1");
  if (!raw) {
    throw new Error("Missing auth session in localStorage.");
  }
  const parsed = JSON.parse(raw) as {
    session?: { accessToken?: string };
    accessToken?: string;
  };
  const token = parsed.session?.accessToken ?? parsed.accessToken ?? "";
  if (!token) {
    throw new Error("Auth session has no access token.");
  }
  return token;
}

async function fetchCreatureCachePayload(
  cacheKey: string,
  apiBaseUrl: string,
  accessToken: string
): Promise<CreatureApiProcessResult> {
  const response = await fetch(
    `${apiBaseUrl}/catalog/creatures/cache/${encodeURIComponent(cacheKey)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );
  const payload = (await response.json()) as
    | { data?: CreatureApiProcessResult }
    | CreatureApiProcessResult;
  if (!response.ok) {
    throw new Error(`Creature cache fetch failed: ${response.status}`);
  }
  const result = isCreatureApiProcessResult(payload) ? payload : payload.data;
  if (!result) {
    throw new Error("Creature cache response did not include a process result.");
  }
  return result;
}

async function processCreatureEquipmentPayload(
  request: CreatureEquipmentAnimationProofRequest,
  accessToken: string
): Promise<CreatureApiProcessResult> {
  const equipItemListEntries = request.equipmentResrefs.map((resRef, index) => ({
    resRef,
    slotMask: resolveCreatureEquipmentProofSlotMask(resRef, index),
    dropable: false,
    pickpocketable: false,
    infinite: false
  }));
  const response = await fetch(`${request.apiBaseUrl}/catalog/creatures/process`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      resref: request.sourceResref,
      bypassCache: true,
      includeBenchmarkMetadata: false,
      creatureMetadata: {
        equipItemListCount: equipItemListEntries.length,
        equipItemListEntries: JSON.stringify(equipItemListEntries)
      }
    })
  });
  const payload = (await response.json()) as
    | { data?: CreatureApiProcessResult }
    | CreatureApiProcessResult;
  if (!response.ok) {
    throw new Error(`Creature process failed: ${response.status}`);
  }
  const result = isCreatureApiProcessResult(payload) ? payload : payload.data;
  if (!result) {
    throw new Error("Creature process response did not include a process result.");
  }
  return result;
}

function buildCreatureViewportPayload(
  processResult: CreatureApiProcessResult,
  apiBaseUrl: string
): CreatureViewportRenderPayload {
  const creature = rewriteCreatureAssetUrls(
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

function rewriteCreatureAssetUrls(value: unknown, apiBaseUrl: string): unknown {
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
    return value.map((entry) => rewriteCreatureAssetUrls(entry, apiBaseUrl));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        rewriteCreatureAssetUrls(entry, apiBaseUrl)
      ])
    );
  }
  return value;
}

function createProofCreatureObject(
  creature: CreatureApiProcessResult["creature"],
  animationName: string
): SceneObject {
  const resRef = creature.resref;
  return {
    id: `dev:creature_equipment_animation:${resRef}`,
    kind: "creatures",
    name: creature.name,
    resRef,
    tag: String(creature.metadata?.tag ?? resRef).toUpperCase(),
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
      yaw: 0,
      roll: 0
    },
    creatureProperties: {
      firstName: creature.name,
      lastName: "",
      race: "",
      appearance: String(creature.metadata?.appearanceLabel ?? ""),
      phenotype: "",
      gender: "",
      description: "",
      challengeRating: 0,
      portraitResRef: "",
      conversation: "",
      noInterrupt: false,
      advancedSettings: {
        blueprintResRef: resRef,
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
        animationName
      }
    },
    source: {
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: `dev:creature_equipment_animation:${resRef}`,
      templateId: creature.templateId
    }
  };
}

function createProofScene(object: SceneObject): AreaScene {
  return {
    sceneId: "creature-equipment-animation-proof-scene",
    areaName: "Creature Equipment Animation Proof",
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

function createDebugState(): WorkspaceToolbarState["canvasDebug"] {
  return {
    wireframe: false,
    textures: true,
    grid: true,
    axes: false,
    bounds: false,
    displayShadows: true,
    displayFog: true,
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

function buildSnapshot(input: {
  status: CreatureEquipmentAnimationProofSnapshot["status"];
  error?: string | null;
  request: CreatureEquipmentAnimationProofRequest;
  resref?: string;
  dataset?: DOMStringMap;
  canvasNonblank?: boolean;
}): CreatureEquipmentAnimationProofSnapshot {
  const dataset = input.dataset ?? {};
  return {
    status: input.status,
    error: input.error ?? null,
    cacheKey: input.request.cacheKey,
    resref: input.resref ?? "",
    animationName: input.request.animationName,
    canvasNonblank: input.canvasNonblank ?? false,
    equipmentModelPartLoadedCount:
      dataset.placeableModelCreatureEquipmentModelPartLoadedCount ?? "",
    equipmentModelPartTotalCount:
      dataset.placeableModelCreatureEquipmentModelPartTotalCount ?? "",
    equipmentModelPartResRefs:
      dataset.placeableModelCreatureEquipmentModelPartResRefs ?? "",
    equipmentModelPartEquipmentResRefs:
      dataset.placeableModelCreatureEquipmentModelPartEquipmentResRefs ?? "",
    equipmentItemGroupTransformStatuses:
      dataset.placeableModelCreatureEquipmentModelPartItemGroupTransformStatuses ?? "",
    creatureAnimationMixerActionNames: dataset.creatureAnimationMixerActionNames ?? "",
    creatureAnimationMixerPlaybackStatuses:
      dataset.creatureAnimationMixerPlaybackStatuses ?? "",
    creatureAnimationMixerCompletedActionNames:
      dataset.creatureAnimationMixerCompletedActionNames ?? ""
  };
}

function readCanvasNonblank(canvas: HTMLCanvasElement): boolean {
  try {
    const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    return Boolean(context && canvas.width > 64 && canvas.height > 64);
  } catch {
    return canvas.width > 64 && canvas.height > 64;
  }
}

export function CreatureEquipmentAnimationProofRunner() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const request = useMemo(parseCreatureEquipmentAnimationProofRequest, []);
  const [snapshot, setSnapshot] = useState<CreatureEquipmentAnimationProofSnapshot>(() =>
    buildSnapshot({ status: "loading", request })
  );

  useEffect(() => {
    let cancelled = false;
    let cleanupRuntime: (() => void) | null = null;
    let frameId = 0;

    async function run(): Promise<void> {
      try {
        if (
          !request.cacheKey &&
          (!request.sourceResref || request.equipmentResrefs.length === 0)
        ) {
          throw new Error(
            "Missing cacheKey or sourceResref/equipmentResref query parameters."
          );
        }
        const host = hostRef.current;
        if (!host) {
          throw new Error("Creature equipment proof host was not mounted.");
        }
        const accessToken = readPersistedAccessToken();
        const processResult = request.cacheKey
          ? await fetchCreatureCachePayload(
              request.cacheKey,
              request.apiBaseUrl,
              accessToken
            )
          : await processCreatureEquipmentPayload(request, accessToken);
        const payload = buildCreatureViewportPayload(processResult, request.apiBaseUrl);
        const object = createProofCreatureObject(
          processResult.creature,
          request.animationName
        );
        const scene = createProofScene(object);
        const runtime = createRuntime(host);
        runtime.placeableModelRequestHeader = {
          Authorization: `Bearer ${accessToken}`
        };
        runtime.placeableTextureRequestHeader = {
          Authorization: `Bearer ${accessToken}`
        };
        cleanupRuntime = () => {
          uninstallAuroraCreatureProofRuntimeHook(runtime);
          disposeRuntime(runtime);
        };
        host.style.width = "960px";
        host.style.height = "540px";
        resizeRuntime(runtime);
        rebuildGridLayer(runtime, scene, createViewportFacade(), true);
        runtime.gridLayer.visible = true;
        runtime.tileOverlayLayer.visible = false;
        runtime.axesHelper.visible = true;
        centerCameraForScene(runtime, scene, { objectPreview: true });
        runtime.camera.position.set(2.55, 1.55, 2.3);
        runtime.controls.target.set(1, 0.5, 1);
        runtime.controls.update();
        rebuildObjectMeshes(
          runtime,
          scene.objects,
          [],
          createDebugState(),
          scene.width,
          scene.height,
          1,
          false,
          10,
          [],
          false,
          null,
          { [object.id]: payload }
        );
        installAuroraCreatureProofRuntimeHook(runtime);

        let previousTime = performance.now();
        const render = (now: number) => {
          if (cancelled) {
            return;
          }
          const deltaSeconds = Math.max(0, (now - previousTime) / 1000);
          previousTime = now;
          runtime.controls.update();
          updateRuntimeObjectAnimationPlaybacks(runtime, deltaSeconds);
          runtime.renderer.render(runtime.scene, runtime.camera);
          frameId = requestAnimationFrame(render);
        };
        frameId = requestAnimationFrame(render);

        await new Promise((resolve) => window.setTimeout(resolve, 600));
        if (cancelled) {
          return;
        }
        const canvas = runtime.renderer.domElement;
        setSnapshot(
          buildSnapshot({
            status: "ready",
            request,
            resref: processResult.creature.resref,
            dataset: runtime.container.dataset,
            canvasNonblank: readCanvasNonblank(canvas)
          })
        );
      } catch (error) {
        if (!cancelled) {
          setSnapshot(
            buildSnapshot({
              status: "error",
              error: error instanceof Error ? error.message : String(error),
              request
            })
          );
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      cleanupRuntime?.();
    };
  }, [request]);

  return (
    <main
      data-testid="creature-equipment-animation-proof-runner"
      data-render-status={snapshot.status}
      data-error={snapshot.error ?? ""}
      data-cache-key={snapshot.cacheKey}
      data-resref={snapshot.resref}
      data-animation-name={snapshot.animationName}
      data-canvas-nonblank={String(snapshot.canvasNonblank)}
      data-equipment-model-part-loaded-count={snapshot.equipmentModelPartLoadedCount}
      data-equipment-model-part-total-count={snapshot.equipmentModelPartTotalCount}
      data-equipment-model-part-resrefs={snapshot.equipmentModelPartResRefs}
      data-equipment-model-part-equipment-resrefs={
        snapshot.equipmentModelPartEquipmentResRefs
      }
      data-equipment-item-group-transform-statuses={
        snapshot.equipmentItemGroupTransformStatuses
      }
      data-creature-animation-mixer-action-names={
        snapshot.creatureAnimationMixerActionNames
      }
      data-creature-animation-mixer-playback-statuses={
        snapshot.creatureAnimationMixerPlaybackStatuses
      }
      data-creature-animation-mixer-completed-action-names={
        snapshot.creatureAnimationMixerCompletedActionNames
      }
      style={{
        width: "100vw",
        height: "100vh",
        margin: 0,
        overflow: "hidden",
        background: "#0c1420"
      }}
    >
      <div ref={hostRef} style={{ width: "960px", height: "540px" }} />
      <script
        id="creature-equipment-animation-proof-frame"
        type="application/json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(snapshot) }}
      />
    </main>
  );
}
