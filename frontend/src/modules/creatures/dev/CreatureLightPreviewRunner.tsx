import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { WorkspaceToolbarState } from "../../layout/roleTopbarPolicy";
import type { AreaScene, SceneObject } from "../../scene/contracts";
import type { CreatureViewportRenderPayload } from "../application/creatureRenderPayloadResolver";
import {
  centerCameraForScene,
  createRuntime,
  disposeRuntime,
  resizeRuntime
} from "../../layout/adapters/three/workspaceThreeRuntime";
import { rebuildGridLayer } from "../../layout/adapters/three/workspaceGridLayer";
import { rebuildObjectMeshes } from "../../layout/adapters/three/workspaceObjectMeshLayer";
import { writeAuroraScenePointLightDiagnostics } from "../../layout/adapters/three/workspaceSceneLightDiagnostics";

const CREATURE_LIGHT_PREVIEW_PATH = "/dev/creature-light-preview";
const OBJECT_PIXEL_THRESHOLD = 80;
const DEFAULT_EQUIPMENT_LIGHT_COUNT = 1;
const MAX_EQUIPMENT_LIGHT_COUNT = 2;
const DEFAULT_EQUIPMENT_LIGHT_BRIGHTNESS_VALUE = 2;
const DEFAULT_EQUIPMENT_LIGHT_COLOR_VALUE = 0;

const EQUIPMENT_LIGHT_BRIGHTNESS_QUERY_VALUES: Record<string, number> = {
  dim: 1,
  low: 2,
  normal: 3,
  bright: 4
};

const EQUIPMENT_LIGHT_COLOR_QUERY_VALUES: Record<string, number> = {
  blue: 0,
  yellow: 1,
  purple: 2,
  red: 3,
  green: 4,
  grey: 4,
  gray: 4,
  orange: 5,
  white: 6
};

type RunnerStatus = "loading" | "ready" | "error";

interface CreatureLightPreviewRouteRequest {
  equipmentLightCount: number;
  equipmentLightBrightnessValue: number;
  equipmentLightColorValue: number;
  maxLightsOverride: number | null;
}

interface PixelSignal {
  objectVisible: boolean;
  objectPixelCount: number;
}

interface CreatureLightPreviewSnapshot {
  status: RunnerStatus;
  error: string | null;
  canvasNonblank: boolean;
  objectPixelsWithoutGrid: number;
  pointLightCount: number;
  equipmentLightCount: number;
  equipmentLightCandidateCount: number | null;
  equipmentLightAcceptedCount: number | null;
  equipmentLightDroppedCount: number | null;
  equipmentLightStatus: string;
  equipmentLightMode: string;
  equipmentLightBrightnessLabels: string[];
  equipmentLightColorLabels: string[];
  equipmentLightAttachmentTargets: string[];
  equipmentLightSource: string;
  equipmentLightProofStatus: string;
  equipmentLightBudgetCap: number | null;
  equipmentLightBudgetHardCap: number | null;
  equipmentLightConfiguredMaxLights: number | null;
  equipmentLightBudgetCapProofStatus: string;
  equipmentLightNotPlaceableLight: boolean;
  equipmentLightNotMdlLightNode: boolean;
  droppedEquipmentLightCount: number;
  firstDroppedEquipmentLightRank: number | null;
  pointLightDistance: number | null;
  pointLightIntensity: number | null;
  pointLightColor: number[];
  pointLightCastShadow: boolean | null;
  itemPropertyLightShadowStatus: string;
  itemPropertyLightShadowProofStatus: string;
  itemPropertyLightNoSelfGlowProofStatus: string;
  itemPropertyLightPreviewMode: string;
  itemPropertyLightBrightnessLabel: string;
  itemPropertyLightBrightnessRadiusMeters: number | null;
  itemPropertyLightColorLabel: string;
  itemPropertyLightColor: number[];
  itemPropertyLightRelatedVisualEffectRowId: number | null;
  itemPropertyLightRelatedVisualEffectConstant: string;
  itemPropertyLightRelatedProgFxAnimation: string;
  itemPropertyLightRelatedProgFxSymbolicColor: string;
  itemPropertyLightRelatedProgFxRadiusMeters: number | null;
  itemPropertyLightFalloffProofStatus: string;
  itemPropertyLightColorProofStatus: string;
  itemPropertyLightRadiusProofStatus: string;
  itemPropertyLightBrightnessRadiusSource: string;
  scenePointLightProofStatus: string;
  scenePointLightRetailOrderingStatus: string;
  scenePointLightBudgetMode: string;
  scenePointLightCount: number;
  sceneSourceBackedPointLightCount: number;
  scenePointLightLanes: string[];
  scenePointLightLaneCounts: Record<string, number>;
  scenePointLightPreviewBudgetCap: number | null;
  scenePointLightPreviewBudgetHardCap: number | null;
  scenePointLightPreviewBudgetCapSource: string;
  scenePointLightPreviewBudgetCapProofStatus: string;
  scenePointLightConfiguredMaxLights: number | null;
  scenePointLightPreviewBudgetAcceptedCount: number;
  scenePointLightPreviewBudgetDroppedCount: number;
  scenePointLightSamples: string[];
  sceneNonPointLightRequestCount: number;
  sceneNonPointLightRequestLanes: string[];
  sceneNonPointLightRequestLaneCounts: Record<string, number>;
  sceneNonPointLightRequestSamples: string[];
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
  sceneShadowFastShadowProxyCount: number;
  sceneShadowFastShadowDisabledCount: number;
  sceneShadowFastShadowSamples: string[];
  sceneShadowAreaStatus: string;
  sceneShadowAreaSourceField: string;
  sceneShadowAreaStatusSource: string;
  sceneShadowAreaOpacity: number | null;
  sceneShadowAreaOpacitySource: string;
  sceneShadowAreaOpacityFactor: number | null;
  sceneShadowAreaOpacityFactorSource: string;
  cameraPosition: number[];
  routeEquipmentLightCount: number;
  routeEquipmentLightBrightnessValue: number;
  routeEquipmentLightColorValue: number;
  maxLightsOverride: number | null;
}

export function isCreatureLightPreviewRunnerPath(pathname: string): boolean {
  return pathname === CREATURE_LIGHT_PREVIEW_PATH;
}

function readOptionalMaxLightsQuery(value: string | null): number | null {
  if (value === null || value.trim().length === 0) {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.trunc(numeric)) : null;
}

function readEquipmentLightCountQuery(value: string | null): number {
  if (value === null || value.trim().length === 0) {
    return DEFAULT_EQUIPMENT_LIGHT_COUNT;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return DEFAULT_EQUIPMENT_LIGHT_COUNT;
  }
  return Math.max(
    DEFAULT_EQUIPMENT_LIGHT_COUNT,
    Math.min(MAX_EQUIPMENT_LIGHT_COUNT, Math.trunc(numeric))
  );
}

function readEquipmentLightMappedQuery(
  value: string | null,
  aliases: Record<string, number>,
  fallback: number,
  min: number,
  max: number
): number {
  if (value === null || value.trim().length === 0) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  const aliased = aliases[normalized];
  if (typeof aliased === "number") {
    return aliased;
  }
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.trunc(numeric)));
}

export function parseCreatureLightPreviewRouteRequest(
  search = window.location.search
): CreatureLightPreviewRouteRequest {
  const params = new URLSearchParams(search);
  return {
    equipmentLightCount: readEquipmentLightCountQuery(params.get("equipmentLights")),
    equipmentLightBrightnessValue: readEquipmentLightMappedQuery(
      params.get("equipmentLightBrightness") ?? params.get("brightness"),
      EQUIPMENT_LIGHT_BRIGHTNESS_QUERY_VALUES,
      DEFAULT_EQUIPMENT_LIGHT_BRIGHTNESS_VALUE,
      1,
      4
    ),
    equipmentLightColorValue: readEquipmentLightMappedQuery(
      params.get("equipmentLightColor") ?? params.get("color"),
      EQUIPMENT_LIGHT_COLOR_QUERY_VALUES,
      DEFAULT_EQUIPMENT_LIGHT_COLOR_VALUE,
      0,
      6
    ),
    maxLightsOverride: readOptionalMaxLightsQuery(params.get("maxLights"))
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

function createPreviewCreatureObject(): SceneObject {
  return {
    id: "dev:creature_item_light",
    kind: "creatures",
    name: "Equipped Light Guard",
    resRef: "cre_light_guard",
    tag: "CRE_LIGHT_GUARD",
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
    source: {
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "dev:creature_item_light",
      templateId: "cre_light_guard"
    }
  };
}

export function createPreviewPayload(
  equipmentLightCount = DEFAULT_EQUIPMENT_LIGHT_COUNT,
  options: {
    firstEquipmentLightBrightnessValue?: number;
    firstEquipmentLightColorValue?: number;
  } = {}
): CreatureViewportRenderPayload {
  const firstEquipmentLightBrightnessValue =
    options.firstEquipmentLightBrightnessValue ?? DEFAULT_EQUIPMENT_LIGHT_BRIGHTNESS_VALUE;
  const firstEquipmentLightColorValue =
    options.firstEquipmentLightColorValue ?? DEFAULT_EQUIPMENT_LIGHT_COLOR_VALUE;
  const equipmentModelCandidates = [
    {
      resref: "nw_wswmls001",
      itemTemplateId: "itm_nw_wswmls001",
      slotMask: 0x10,
      slotLabels: ["right hand"],
      attachmentTargets: ["rhand_g"],
      primaryAttachmentTarget: "rhand_g",
      baseItem: 6,
      itemName: "Longsword",
      itemModelType: "wsw",
      itemProperties: [
        {
          propertyName: 44,
          propertyLabel: "Light",
          costValue: firstEquipmentLightBrightnessValue,
          costTableDefinition: "iprp_lightcost",
          param1Value: firstEquipmentLightColorValue,
          param1Table: "iprp_color",
          propertyDefinitionSource2daRow: 44,
          propertyDefinitionSourceKey:
            "modules/current/__aurora/sources/hak/lc_2da/itempropdef.2da"
        }
      ],
      source: "utc.Equip_ItemList" as const,
      sourceModelStatus: "metadata-only" as const
    }
  ];
  if (equipmentLightCount > 1) {
    equipmentModelCandidates.push({
      resref: "nw_wswss001",
      itemTemplateId: "itm_nw_wswss001",
      slotMask: 0x20,
      slotLabels: ["left hand"],
      attachmentTargets: ["lhand_g"],
      primaryAttachmentTarget: "lhand_g",
      baseItem: 6,
      itemName: "Short Sword",
      itemModelType: "wsw",
      itemProperties: [
        {
          propertyName: 44,
          propertyLabel: "Light",
          costValue: 4,
          costTableDefinition: "iprp_lightcost",
          param1Value: 3,
          param1Table: "iprp_color",
          propertyDefinitionSource2daRow: 44,
          propertyDefinitionSourceKey:
            "modules/current/__aurora/sources/hak/lc_2da/itempropdef.2da"
        }
      ],
      source: "utc.Equip_ItemList" as const,
      sourceModelStatus: "metadata-only" as const
    });
  }
  const renderPackage = {
    status: "missing_derived",
    diagnostics: [],
    rendererPreset: "creature-standard",
    appearanceProfile: {
      appearanceType: 6,
      appearanceLabel: "Human",
      modelType: "P",
      raceModel: "P_HHM",
      sizeCategory: 3,
      sizeCategoryLabel: "Medium"
    },
    sourceModelCandidates: [],
    skeletonModelCandidates: [],
    partModelCandidates: [],
    equipmentModelCandidates,
    bodyParts: {},
    colors: {}
  };
  return {
    templateId: "cre_light_guard",
    cacheKey: "cre_light_guard:itemproperty-light-preview",
    cacheHit: false,
    storedAt: "2026-07-01T00:00:00.000Z",
    hits: 0,
    creature: {
      templateId: "cre_light_guard",
      kind: "creature",
      resref: "cre_light_guard",
      name: "Equipped Light Guard",
      category: "dev",
      benchmarkCandidate: false,
      render: {
        backendType: "creature",
        frontendType: "creature",
        rendererPreset: "creature-standard"
      },
      creatureRenderPackage: renderPackage,
      creatureRuntime: {
        state: {},
        lists: {
          equippedItems: equipmentModelCandidates.map((candidate) => ({
            resRef: candidate.resref,
            itemTemplateId: candidate.itemTemplateId,
            slotMask: candidate.slotMask
          }))
        }
      },
      processedAt: "2026-07-01T00:00:00.000Z"
    } as unknown as CreatureViewportRenderPayload["creature"],
    renderPackage: renderPackage as CreatureViewportRenderPayload["renderPackage"]
  };
}

function createPreviewScene(object: SceneObject): AreaScene {
  return {
    sceneId: "creature-light-preview-scene",
    areaName: "Creature Light Preview",
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

function roundNumber(value: number): number {
  return Number(value.toFixed(4));
}

function readVector3(value: THREE.Vector3): number[] {
  return [roundNumber(value.x), roundNumber(value.y), roundNumber(value.z)];
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((entry) => String(entry)).filter((entry) => entry.length > 0)
    : [];
}

function readNumberArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is number => typeof entry === "number" && Number.isFinite(entry))
    : [];
}

function readOptionalNumberUserData(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readStringUserData(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function buildSnapshot(
  status: RunnerStatus,
  root: THREE.Object3D | null,
  runtime: ReturnType<typeof createRuntime> | null,
  pixelSignal: PixelSignal,
  error: string | null,
  request: CreatureLightPreviewRouteRequest
): CreatureLightPreviewSnapshot {
  const pointLights: THREE.PointLight[] = [];
  const equipmentLightSources: THREE.Object3D[] = [];
  const droppedEquipmentLightSources: THREE.Object3D[] = [];
  root?.traverse((node) => {
    if (node instanceof THREE.PointLight) {
      pointLights.push(node);
    }
    if (
      node.userData?.itemPropertyLightPreviewRole ===
      "creature-equipment-itemproperty-light-source"
    ) {
      equipmentLightSources.push(node);
      if (node.userData?.itemPropertyLightBudgetAccepted === false) {
        droppedEquipmentLightSources.push(node);
      }
    }
  });
  const firstLight = pointLights[0] ?? null;
  const firstLightData = firstLight?.userData ?? {};
  const firstEquipmentLightSourceData = equipmentLightSources[0]?.userData ?? {};
  const firstDroppedEquipmentLightSourceData = droppedEquipmentLightSources[0]?.userData ?? {};
  const firstItemPropertyLightData =
    typeof firstLightData.itemPropertyLightPreviewMode === "string"
      ? firstLightData
      : firstEquipmentLightSourceData;
  const rootData = root?.userData ?? {};
  const scenePointLightDiagnostics = runtime
    ? writeAuroraScenePointLightDiagnostics(runtime)
    : null;
  return {
    status,
    error,
    canvasNonblank: pixelSignal.objectVisible,
    objectPixelsWithoutGrid: pixelSignal.objectPixelCount,
    pointLightCount: pointLights.length,
    equipmentLightCount: equipmentLightSources.length,
    equipmentLightCandidateCount: readOptionalNumberUserData(
      rootData.creatureEquipmentItemPropertyLightCandidateCount
    ),
    equipmentLightAcceptedCount: readOptionalNumberUserData(
      rootData.creatureEquipmentItemPropertyLightAcceptedCount
    ),
    equipmentLightDroppedCount: readOptionalNumberUserData(
      rootData.creatureEquipmentItemPropertyLightDroppedCount
    ),
    equipmentLightStatus:
      typeof rootData.creatureEquipmentItemPropertyLightStatus === "string"
        ? rootData.creatureEquipmentItemPropertyLightStatus
        : "",
    equipmentLightMode:
      typeof rootData.creatureEquipmentItemPropertyLightMode === "string"
        ? rootData.creatureEquipmentItemPropertyLightMode
        : "",
    equipmentLightBrightnessLabels: readStringArray(
      rootData.creatureEquipmentItemPropertyLightBrightnessLabels
    ),
    equipmentLightColorLabels: readStringArray(
      rootData.creatureEquipmentItemPropertyLightColorLabels
    ),
    equipmentLightAttachmentTargets: readStringArray(
      rootData.creatureEquipmentItemPropertyLightAttachmentTargets
    ),
    equipmentLightSource:
      typeof rootData.creatureEquipmentItemPropertyLightSource === "string"
        ? rootData.creatureEquipmentItemPropertyLightSource
        : "",
    equipmentLightProofStatus:
      typeof rootData.creatureEquipmentItemPropertyLightProofStatus === "string"
        ? rootData.creatureEquipmentItemPropertyLightProofStatus
        : "",
    equipmentLightBudgetCap: readOptionalNumberUserData(
      rootData.creatureEquipmentItemPropertyLightBudgetCap
    ),
    equipmentLightBudgetHardCap: readOptionalNumberUserData(
      rootData.creatureEquipmentItemPropertyLightBudgetHardCap
    ),
    equipmentLightConfiguredMaxLights: readOptionalNumberUserData(
      rootData.creatureEquipmentItemPropertyLightConfiguredMaxLights
    ),
    equipmentLightBudgetCapProofStatus:
      typeof rootData.creatureEquipmentItemPropertyLightBudgetCapProofStatus === "string"
        ? rootData.creatureEquipmentItemPropertyLightBudgetCapProofStatus
        : "",
    equipmentLightNotPlaceableLight:
      firstEquipmentLightSourceData.creatureEquipmentItemPropertyLightNotPlaceableLight === true,
    equipmentLightNotMdlLightNode:
      firstEquipmentLightSourceData.creatureEquipmentItemPropertyLightNotMdlLightNode === true,
    droppedEquipmentLightCount: droppedEquipmentLightSources.length,
    firstDroppedEquipmentLightRank: readOptionalNumberUserData(
      firstDroppedEquipmentLightSourceData.itemPropertyLightBudgetRank
    ),
    pointLightDistance: firstLight ? roundNumber(firstLight.distance) : null,
    pointLightIntensity: firstLight ? roundNumber(firstLight.intensity) : null,
    pointLightColor: firstLight
      ? [roundNumber(firstLight.color.r), roundNumber(firstLight.color.g), roundNumber(firstLight.color.b)]
      : [],
    pointLightCastShadow: firstLight ? firstLight.castShadow : null,
    itemPropertyLightShadowStatus: readStringUserData(
      firstItemPropertyLightData.itemPropertyLightShadowStatus
    ),
    itemPropertyLightShadowProofStatus: readStringUserData(
      firstItemPropertyLightData.itemPropertyLightShadowProofStatus
    ),
    itemPropertyLightNoSelfGlowProofStatus: readStringUserData(
      firstItemPropertyLightData.itemPropertyLightNoSelfGlowProofStatus
    ),
    itemPropertyLightPreviewMode: readStringUserData(
      firstItemPropertyLightData.itemPropertyLightPreviewMode
    ),
    itemPropertyLightBrightnessLabel: readStringUserData(
      firstItemPropertyLightData.itemPropertyLightBrightnessLabel
    ),
    itemPropertyLightBrightnessRadiusMeters: readOptionalNumberUserData(
      firstItemPropertyLightData.itemPropertyLightBrightnessRadiusMeters
    ),
    itemPropertyLightColorLabel: readStringUserData(
      firstItemPropertyLightData.itemPropertyLightColorLabel
    ),
    itemPropertyLightColor: readNumberArray(firstItemPropertyLightData.itemPropertyLightColor),
    itemPropertyLightRelatedVisualEffectRowId: readOptionalNumberUserData(
      firstItemPropertyLightData.itemPropertyLightRelatedVisualEffectRowId
    ),
    itemPropertyLightRelatedVisualEffectConstant: readStringUserData(
      firstItemPropertyLightData.itemPropertyLightRelatedVisualEffectConstant
    ),
    itemPropertyLightRelatedProgFxAnimation: readStringUserData(
      firstItemPropertyLightData.itemPropertyLightRelatedProgFxAnimation
    ),
    itemPropertyLightRelatedProgFxSymbolicColor: readStringUserData(
      firstItemPropertyLightData.itemPropertyLightRelatedProgFxSymbolicColor
    ),
    itemPropertyLightRelatedProgFxRadiusMeters: readOptionalNumberUserData(
      firstItemPropertyLightData.itemPropertyLightRelatedProgFxRadiusMeters
    ),
    itemPropertyLightFalloffProofStatus: readStringUserData(
      firstItemPropertyLightData.itemPropertyLightFalloffProofStatus
    ),
    itemPropertyLightColorProofStatus: readStringUserData(
      firstItemPropertyLightData.itemPropertyLightColorProofStatus
    ),
    itemPropertyLightRadiusProofStatus: readStringUserData(
      firstItemPropertyLightData.itemPropertyLightRadiusProofStatus
    ),
    itemPropertyLightBrightnessRadiusSource: readStringUserData(
      firstItemPropertyLightData.itemPropertyLightBrightnessRadiusSource
    ),
    scenePointLightProofStatus: scenePointLightDiagnostics?.proofStatus ?? "",
    scenePointLightRetailOrderingStatus:
      scenePointLightDiagnostics?.retailOrderingStatus ?? "",
    scenePointLightBudgetMode: scenePointLightDiagnostics?.budgetMode ?? "",
    scenePointLightCount: scenePointLightDiagnostics?.pointLightCount ?? 0,
    sceneSourceBackedPointLightCount:
      scenePointLightDiagnostics?.sourceBackedPointLightCount ?? 0,
    scenePointLightLanes: Array.from(scenePointLightDiagnostics?.lanes ?? []),
    scenePointLightLaneCounts: {
      ...(scenePointLightDiagnostics?.laneCounts ?? {})
    },
    scenePointLightPreviewBudgetCap:
      scenePointLightDiagnostics?.previewBudgetCap ?? null,
    scenePointLightPreviewBudgetHardCap:
      scenePointLightDiagnostics?.previewBudgetHardCap ?? null,
    scenePointLightPreviewBudgetCapSource:
      scenePointLightDiagnostics?.previewBudgetCapSource ?? "",
    scenePointLightPreviewBudgetCapProofStatus:
      scenePointLightDiagnostics?.previewBudgetCapProofStatus ?? "",
    scenePointLightConfiguredMaxLights:
      scenePointLightDiagnostics?.configuredMaxLights ?? null,
    scenePointLightPreviewBudgetAcceptedCount:
      scenePointLightDiagnostics?.previewBudgetAcceptedCount ?? 0,
    scenePointLightPreviewBudgetDroppedCount:
      scenePointLightDiagnostics?.previewBudgetDroppedCount ?? 0,
    scenePointLightSamples: Array.from(scenePointLightDiagnostics?.samples ?? []),
    sceneNonPointLightRequestCount:
      scenePointLightDiagnostics?.nonPointLightRequestCount ?? 0,
    sceneNonPointLightRequestLanes: Array.from(
      scenePointLightDiagnostics?.nonPointLightRequestLanes ?? []
    ),
    sceneNonPointLightRequestLaneCounts: {
      ...(scenePointLightDiagnostics?.nonPointLightRequestLaneCounts ?? {})
    },
    sceneNonPointLightRequestSamples: Array.from(
      scenePointLightDiagnostics?.nonPointLightRequestSamples ?? []
    ),
    sceneShadowProofStatus: scenePointLightDiagnostics?.shadow.proofStatus ?? "",
    sceneShadowRetailProjectionStatus:
      scenePointLightDiagnostics?.shadow.retailProjectionStatus ?? "",
    sceneShadowPointLightCastShadowCount:
      scenePointLightDiagnostics?.shadow.pointLightCastShadowCount ?? 0,
    sceneShadowPointLightSamples: Array.from(
      scenePointLightDiagnostics?.shadow.pointLightShadowSamples ?? []
    ),
    sceneShadowItemPropertyLightShadowPolicyCount:
      scenePointLightDiagnostics?.shadow.itemPropertyLightShadowPolicyCount ?? 0,
    sceneShadowItemPropertyLightShadowPolicySamples: Array.from(
      scenePointLightDiagnostics?.shadow.itemPropertyLightShadowPolicySamples ?? []
    ),
    sceneShadowDirectionalLightCastShadowCount:
      scenePointLightDiagnostics?.shadow.directionalLightCastShadowCount ?? 0,
    sceneShadowDirectionalLightSamples: Array.from(
      scenePointLightDiagnostics?.shadow.directionalLightShadowSamples ?? []
    ),
    sceneShadowProgFxType4ShadowRequestCount:
      scenePointLightDiagnostics?.shadow.progFxType4ShadowRequestCount ?? 0,
    sceneShadowProgFxType4ShadowRequestSamples: Array.from(
      scenePointLightDiagnostics?.shadow.progFxType4ShadowRequestSamples ?? []
    ),
    sceneShadowFastShadowProxyCount:
      scenePointLightDiagnostics?.shadow.fastShadowProxyCount ?? 0,
    sceneShadowFastShadowDisabledCount:
      scenePointLightDiagnostics?.shadow.fastShadowDisabledCount ?? 0,
    sceneShadowFastShadowSamples: Array.from(
      scenePointLightDiagnostics?.shadow.fastShadowSamples ?? []
    ),
    sceneShadowAreaStatus: scenePointLightDiagnostics?.shadow.areaShadowStatus ?? "",
    sceneShadowAreaSourceField:
      scenePointLightDiagnostics?.shadow.areaShadowSourceField ?? "",
    sceneShadowAreaStatusSource:
      scenePointLightDiagnostics?.shadow.areaShadowStatusSource ?? "",
    sceneShadowAreaOpacity: scenePointLightDiagnostics?.shadow.areaShadowOpacity ?? null,
    sceneShadowAreaOpacitySource:
      scenePointLightDiagnostics?.shadow.areaShadowOpacitySource ?? "",
    sceneShadowAreaOpacityFactor:
      scenePointLightDiagnostics?.shadow.areaShadowOpacityFactor ?? null,
    sceneShadowAreaOpacityFactorSource:
      scenePointLightDiagnostics?.shadow.areaShadowOpacityFactorSource ?? "",
    cameraPosition: runtime ? readVector3(runtime.camera.position) : [],
    routeEquipmentLightCount: request.equipmentLightCount,
    routeEquipmentLightBrightnessValue: request.equipmentLightBrightnessValue,
    routeEquipmentLightColorValue: request.equipmentLightColorValue,
    maxLightsOverride: request.maxLightsOverride
  };
}

export function CreatureLightPreviewRunner() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [snapshot, setSnapshot] = useState<CreatureLightPreviewSnapshot>(() =>
    buildSnapshot(
      "loading",
      null,
      null,
          { objectVisible: false, objectPixelCount: 0 },
          null,
          {
            equipmentLightCount: DEFAULT_EQUIPMENT_LIGHT_COUNT,
            equipmentLightBrightnessValue: DEFAULT_EQUIPMENT_LIGHT_BRIGHTNESS_VALUE,
            equipmentLightColorValue: DEFAULT_EQUIPMENT_LIGHT_COLOR_VALUE,
            maxLightsOverride: null
          }
        )
  );
  const request = useMemo(parseCreatureLightPreviewRouteRequest, []);
  const payload = useMemo(
    () =>
      createPreviewPayload(request.equipmentLightCount, {
        firstEquipmentLightBrightnessValue: request.equipmentLightBrightnessValue,
        firstEquipmentLightColorValue: request.equipmentLightColorValue
      }),
    [
      request.equipmentLightBrightnessValue,
      request.equipmentLightColorValue,
      request.equipmentLightCount
    ]
  );
  const object = useMemo(createPreviewCreatureObject, []);
  const scene = useMemo(() => createPreviewScene(object), [object]);

  useEffect(() => {
    let cancelled = false;
    let cleanupRuntime: (() => void) | null = null;

    async function run(): Promise<void> {
      try {
        const host = hostRef.current;
        if (!host) {
          throw new Error("Creature light preview host was not mounted");
        }
        const runtime = createRuntime(host);
        cleanupRuntime = () => disposeRuntime(runtime);
        host.style.width = "960px";
        host.style.height = "540px";
        resizeRuntime(runtime);
        rebuildGridLayer(runtime, scene, createViewportFacade(), true);
        runtime.gridLayer.visible = false;
        runtime.tileOverlayLayer.visible = false;
        runtime.axesHelper.visible = false;
        centerCameraForScene(runtime, scene, { objectPreview: true });
        runtime.camera.position.set(2.45, 1.6, 2.25);
        runtime.controls.target.set(1, 0.48, 1);
        runtime.controls.update();
        if (request.maxLightsOverride !== null) {
          runtime.scene.userData.auroraLightConfiguredMaxLights =
            request.maxLightsOverride;
        }
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

        const render = () => {
          runtime.controls.update();
          runtime.renderer.render(runtime.scene, runtime.camera);
        };
        render();
        await new Promise((resolve) => window.setTimeout(resolve, 300));
        render();
        await new Promise((resolve) => requestAnimationFrame(resolve));
        if (cancelled) {
          return;
        }

        const root = runtime.objectMeshById.get(object.id) ?? null;
        const { width, height } = runtime.renderer.domElement;
        const pixelSignal = readObjectPixelSignal(runtime.renderer, width, height);
        setSnapshot(buildSnapshot("ready", root, runtime, pixelSignal, null, request));
      } catch (error) {
        if (!cancelled) {
          setSnapshot(
            buildSnapshot(
              "error",
              null,
              null,
              { objectVisible: false, objectPixelCount: 0 },
              error instanceof Error ? error.message : String(error),
              request
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
  }, [object, payload, request, scene]);

  return (
    <main
      data-testid="creature-light-preview-runner"
      data-render-status={snapshot.status}
      data-canvas-nonblank={snapshot.canvasNonblank ? "true" : "false"}
      data-object-pixels={snapshot.objectPixelsWithoutGrid}
      data-point-light-count={snapshot.pointLightCount}
      data-equipment-light-count={snapshot.equipmentLightCount}
      data-equipment-light-candidate-count={snapshot.equipmentLightCandidateCount ?? ""}
      data-equipment-light-accepted-count={snapshot.equipmentLightAcceptedCount ?? ""}
      data-equipment-light-dropped-count={snapshot.equipmentLightDroppedCount ?? ""}
      data-equipment-light-status={snapshot.equipmentLightStatus}
      data-equipment-light-mode={snapshot.equipmentLightMode}
      data-equipment-light-brightness-labels={snapshot.equipmentLightBrightnessLabels.join("|")}
      data-equipment-light-color-labels={snapshot.equipmentLightColorLabels.join("|")}
      data-equipment-light-attachment-targets={snapshot.equipmentLightAttachmentTargets.join("|")}
      data-equipment-light-source={snapshot.equipmentLightSource}
      data-equipment-light-proof-status={snapshot.equipmentLightProofStatus}
      data-equipment-light-budget-cap={snapshot.equipmentLightBudgetCap ?? ""}
      data-equipment-light-budget-hard-cap={snapshot.equipmentLightBudgetHardCap ?? ""}
      data-equipment-light-configured-max-lights={
        snapshot.equipmentLightConfiguredMaxLights ?? ""
      }
      data-equipment-light-budget-cap-proof-status={
        snapshot.equipmentLightBudgetCapProofStatus
      }
      data-equipment-light-not-placeable-light={
        snapshot.equipmentLightNotPlaceableLight ? "true" : "false"
      }
      data-equipment-light-not-mdl-light-node={
        snapshot.equipmentLightNotMdlLightNode ? "true" : "false"
      }
      data-dropped-equipment-light-count={snapshot.droppedEquipmentLightCount}
      data-first-dropped-equipment-light-rank={snapshot.firstDroppedEquipmentLightRank ?? ""}
      data-point-light-distance={snapshot.pointLightDistance ?? ""}
      data-point-light-intensity={snapshot.pointLightIntensity ?? ""}
      data-point-light-color={snapshot.pointLightColor.join(",")}
      data-point-light-cast-shadow={snapshot.pointLightCastShadow ?? ""}
      data-item-property-light-shadow-status={snapshot.itemPropertyLightShadowStatus}
      data-item-property-light-shadow-proof-status={
        snapshot.itemPropertyLightShadowProofStatus
      }
      data-item-property-light-no-self-glow-proof-status={
        snapshot.itemPropertyLightNoSelfGlowProofStatus
      }
      data-item-property-light-preview-mode={snapshot.itemPropertyLightPreviewMode}
      data-item-property-light-brightness-label={snapshot.itemPropertyLightBrightnessLabel}
      data-item-property-light-brightness-radius-meters={
        snapshot.itemPropertyLightBrightnessRadiusMeters ?? ""
      }
      data-item-property-light-color-label={snapshot.itemPropertyLightColorLabel}
      data-item-property-light-color={snapshot.itemPropertyLightColor.join(",")}
      data-item-property-light-related-visualeffect-row-id={
        snapshot.itemPropertyLightRelatedVisualEffectRowId ?? ""
      }
      data-item-property-light-related-visualeffect-constant={
        snapshot.itemPropertyLightRelatedVisualEffectConstant
      }
      data-item-property-light-related-progfx-animation={
        snapshot.itemPropertyLightRelatedProgFxAnimation
      }
      data-item-property-light-related-progfx-symbolic-color={
        snapshot.itemPropertyLightRelatedProgFxSymbolicColor
      }
      data-item-property-light-related-progfx-radius-meters={
        snapshot.itemPropertyLightRelatedProgFxRadiusMeters ?? ""
      }
      data-item-property-light-falloff-proof-status={
        snapshot.itemPropertyLightFalloffProofStatus
      }
      data-item-property-light-color-proof-status={snapshot.itemPropertyLightColorProofStatus}
      data-item-property-light-radius-proof-status={snapshot.itemPropertyLightRadiusProofStatus}
      data-item-property-light-brightness-radius-source={
        snapshot.itemPropertyLightBrightnessRadiusSource
      }
      data-scene-point-light-proof-status={snapshot.scenePointLightProofStatus}
      data-scene-point-light-retail-ordering-status={
        snapshot.scenePointLightRetailOrderingStatus
      }
      data-scene-point-light-budget-mode={snapshot.scenePointLightBudgetMode}
      data-scene-point-light-count={snapshot.scenePointLightCount}
      data-scene-source-backed-point-light-count={snapshot.sceneSourceBackedPointLightCount}
      data-scene-point-light-lanes={snapshot.scenePointLightLanes.join("|")}
      data-scene-point-light-lane-counts={JSON.stringify(snapshot.scenePointLightLaneCounts)}
      data-scene-point-light-preview-budget-cap={
        snapshot.scenePointLightPreviewBudgetCap ?? ""
      }
      data-scene-point-light-preview-budget-hard-cap={
        snapshot.scenePointLightPreviewBudgetHardCap ?? ""
      }
      data-scene-point-light-preview-budget-cap-source={
        snapshot.scenePointLightPreviewBudgetCapSource
      }
      data-scene-point-light-preview-budget-cap-proof-status={
        snapshot.scenePointLightPreviewBudgetCapProofStatus
      }
      data-scene-point-light-configured-max-lights={
        snapshot.scenePointLightConfiguredMaxLights ?? ""
      }
      data-scene-point-light-preview-budget-accepted-count={
        snapshot.scenePointLightPreviewBudgetAcceptedCount
      }
      data-scene-point-light-preview-budget-dropped-count={
        snapshot.scenePointLightPreviewBudgetDroppedCount
      }
      data-scene-point-light-samples={snapshot.scenePointLightSamples.join("|")}
      data-scene-non-point-light-request-count={snapshot.sceneNonPointLightRequestCount}
      data-scene-non-point-light-request-lanes={
        snapshot.sceneNonPointLightRequestLanes.join("|")
      }
      data-scene-non-point-light-request-lane-counts={JSON.stringify(
        snapshot.sceneNonPointLightRequestLaneCounts
      )}
      data-scene-non-point-light-request-samples={
        snapshot.sceneNonPointLightRequestSamples.join("|")
      }
      data-scene-shadow-proof-status={snapshot.sceneShadowProofStatus}
      data-scene-shadow-retail-projection-status={snapshot.sceneShadowRetailProjectionStatus}
      data-scene-shadow-point-light-cast-shadow-count={
        snapshot.sceneShadowPointLightCastShadowCount
      }
      data-scene-shadow-point-light-samples={snapshot.sceneShadowPointLightSamples.join("|")}
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
      data-scene-shadow-fast-shadow-proxy-count={snapshot.sceneShadowFastShadowProxyCount}
      data-scene-shadow-fast-shadow-disabled-count={
        snapshot.sceneShadowFastShadowDisabledCount
      }
      data-scene-shadow-fast-shadow-samples={snapshot.sceneShadowFastShadowSamples.join("|")}
      data-scene-shadow-area-status={snapshot.sceneShadowAreaStatus}
      data-scene-shadow-area-source-field={snapshot.sceneShadowAreaSourceField}
      data-scene-shadow-area-status-source={snapshot.sceneShadowAreaStatusSource}
      data-scene-shadow-area-opacity={snapshot.sceneShadowAreaOpacity ?? ""}
      data-scene-shadow-area-opacity-source={snapshot.sceneShadowAreaOpacitySource}
      data-scene-shadow-area-opacity-factor={snapshot.sceneShadowAreaOpacityFactor ?? ""}
      data-scene-shadow-area-opacity-factor-source={
        snapshot.sceneShadowAreaOpacityFactorSource
      }
      data-camera-position={snapshot.cameraPosition.join(",")}
      data-route-equipment-light-count={snapshot.routeEquipmentLightCount}
      data-route-equipment-light-brightness-value={
        snapshot.routeEquipmentLightBrightnessValue
      }
      data-route-equipment-light-color-value={snapshot.routeEquipmentLightColorValue}
      data-max-lights-override={snapshot.maxLightsOverride ?? ""}
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
        id="creature-light-preview-frame"
        type="application/json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(snapshot) }}
      />
    </main>
  );
}
