import type { PlaceableViewportRenderPayload } from "../../placeables/application/placeableRenderPayloadResolver";
import {
  resolveBackendDeliveryOriginFromConfig,
  resolvePlaceableModelResolution as resolvePlaceableModelResolutionForOrigin,
  resolvePlaceableTextureDeliveryUrl as resolvePlaceableTextureDeliveryUrlForOrigin,
  resolvePlaceableTextureDeliveryUrlsByReference as resolvePlaceableTextureDeliveryUrlsByReferenceForOrigin,
  resolvePlaceableVfxChunkModelDeliveryUrlsByAssetId as resolvePlaceableVfxChunkModelDeliveryUrlsByAssetIdForOrigin,
  type PlaceableRenderModelResolution
} from "../../placeables/application/placeableRenderAssetResolver";
import type { PlaceableApiProcessPayload } from "../../placeables/contracts";
import { resolveWorkspaceBackendApiBaseUrl } from "../../shared/workspaceBackendApiBaseUrl";
import type { SceneObject, SceneObjectKind } from "../contracts";

export const SHARED_PLACEABLES_RENDERER_PATH = "shared-placeables-renderer";
const AREA_INSTANCE_RENDER_ROW_CACHE_KEY_PREFIX = "area-instance-render-row";

export interface PlaceableRenderPayloadLookup {
  cacheKey: string;
  processPayload: PlaceableApiProcessPayload;
  indexKeys: string[];
  publishTemplateAliases: boolean;
}

export interface PlaceableRenderContractState {
  textureDeliveryUrl: string | null;
  hasModelContract: boolean;
  hasTextureContract: boolean;
  hasMetadataContract: boolean;
  renderableWithoutModel: boolean;
  modelUrl: string | null;
  modelCacheKey: string | null;
  modelStatus: string | null;
  modelFallbackReason: string | null;
  fallbackToPrimitive: boolean;
}

export const AREA_PLACEABLE_PLACEHOLDER_REASONS = [
  "none",
  "still-loading",
  "missing-payload",
  "payload-missing-model-url",
  "asset-contract-blocked",
  "model-load-failed",
  "not-applicable"
] as const;

export type AreaPlaceablePlaceholderReason =
  (typeof AREA_PLACEABLE_PLACEHOLDER_REASONS)[number];

const AREA_PREVIEW_ONLY_VFX_DIAGNOSTICS = new Set([
  "VFX_AURORA_MDL_EMITTER_PREVIEW_NON_CANONICAL",
  "VFX_PROJECT_RENDER_PACKAGE_NOT_RUNTIME_PARITY"
]);

function resolveBackendDeliveryOrigin(): string {
  return resolveBackendDeliveryOriginFromConfig(resolveWorkspaceBackendApiBaseUrl());
}

function dedupeNonEmptyText(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach((value) => {
    const normalized = value?.trim();
    if (!normalized) {
      return;
    }
    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    result.push(normalized);
  });
  return result;
}

export function buildPlaceableTemplateIdFromResRef(resRef: string): string {
  return `plc_${resRef.trim()}`.slice(0, 80);
}

function normalizeRenderPayloadCacheKeyPart(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9:_-]+/g, "_");
  return normalized.slice(0, 96);
}

function buildAreaInstanceRenderPayloadCacheKey(input: {
  objectKind: SceneObjectKind;
  appearanceType: number | undefined;
  genericType: number | undefined;
  tag: string | undefined;
  localizedName: string | undefined;
  description: string | undefined;
}): string {
  const normalizedKind = normalizeRenderPayloadCacheKeyPart(input.objectKind);
  const appearance =
    typeof input.appearanceType === "number" && Number.isFinite(input.appearanceType)
      ? String(input.appearanceType)
      : "none";
  const generic =
    typeof input.genericType === "number" && Number.isFinite(input.genericType)
      ? String(input.genericType)
      : "none";
  const tag = input.tag ? normalizeRenderPayloadCacheKeyPart(input.tag) : "none";
  const label = normalizeRenderPayloadCacheKeyPart(
    [input.localizedName, input.description].filter(Boolean).join(" ")
  ) || "none";
  return `${AREA_INSTANCE_RENDER_ROW_CACHE_KEY_PREFIX}:${normalizedKind}:appearance:${appearance}:generic:${generic}:tag:${tag}:label:${label}`;
}

function isInstanceScopedObjectId(objectId: string): boolean {
  return objectId.includes(":");
}

function isAuroraGitVfxLikePlaceable(object: SceneObject): boolean {
  if (object.source?.type !== "aurora_git" || object.kind !== "placeables") {
    return false;
  }
  const combinedIdentity = [
    object.resRef,
    object.tag,
    object.source.templateId
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
  return /\bvfx|tm_pl_/u.test(combinedIdentity);
}

export function isSharedPlaceablesRendererObjectKind(kind: SceneObjectKind): boolean {
  return kind === "placeables" || kind === "doors";
}

export function isSharedPlaceablesRendererSceneObject(object: SceneObject): boolean {
  return isSharedPlaceablesRendererObjectKind(object.kind);
}

export function isAreaSharedPlaceablesRendererSceneObject(object: SceneObject): boolean {
  return object.source?.type === "aurora_git" && isSharedPlaceablesRendererSceneObject(object);
}

export function resolvePlaceableRenderPayloadLookup(
  object: SceneObject
): PlaceableRenderPayloadLookup {
  const objectId = object.id.trim();
  const resRef = object.resRef.trim();
  const sourceTemplateId =
    object.source?.type === "aurora_git" ? object.source.templateId?.trim() : undefined;
  const subtypeHint =
    object.kind === "doors"
      ? "door"
      : object.source?.type === "aurora_git" && object.kind === "placeables" && !isAuroraGitVfxLikePlaceable(object)
        ? "generic"
        : undefined;
  const sourceAppearanceType = object.source?.appearanceType;
  const sourceGenericType = object.source?.genericType;
  const sourceTag =
    object.source?.type === "aurora_git" && object.tag.trim().length > 0
      ? object.tag.trim()
      : undefined;
  const sourceLocalizedName =
    object.source?.type === "aurora_git" && object.source.localizedName?.trim()
      ? object.source.localizedName.trim()
      : undefined;
  const sourceDescription =
    object.source?.type === "aurora_git" && object.source.description?.trim()
      ? object.source.description.trim()
      : undefined;
  const hasAreaInstanceRenderOverride =
    object.source?.type === "aurora_git" &&
    (typeof sourceAppearanceType === "number" || typeof sourceGenericType === "number");
  const sourceInstanceIndexKey = object.source?.type === "aurora_git" ? objectId : null;
  const objectIdCanBeTemplateId =
    objectId.length > 0 && !isInstanceScopedObjectId(objectId) && !objectId.startsWith("preview:");
  const resRefTemplateId = resRef.length > 0 ? buildPlaceableTemplateIdFromResRef(resRef) : null;
  const sourceTemplateAlias =
    sourceTemplateId && sourceTemplateId.length > 0
      ? buildPlaceableTemplateIdFromResRef(sourceTemplateId)
      : null;
  const primaryTemplateId = objectIdCanBeTemplateId
    ? objectId
    : resRef.length > 0
      ? resRef
      : sourceTemplateId && sourceTemplateId.length > 0
        ? sourceTemplateId
        : null;
  const areaInstanceRenderPayloadCacheKey = hasAreaInstanceRenderOverride
    ? buildAreaInstanceRenderPayloadCacheKey({
        objectKind: object.kind,
        appearanceType: sourceAppearanceType,
        genericType: sourceGenericType,
        tag: sourceTag,
        localizedName: sourceLocalizedName,
        description: sourceDescription
      })
    : null;
  const instanceFields: Pick<
    PlaceableApiProcessPayload,
    "appearanceType" | "genericType" | "tag" | "localizedName" | "description"
  > = {
    ...(sourceTag ? { tag: sourceTag } : {}),
    ...(sourceLocalizedName ? { localizedName: sourceLocalizedName } : {}),
    ...(sourceDescription ? { description: sourceDescription } : {}),
    ...(typeof sourceAppearanceType === "number" && Number.isFinite(sourceAppearanceType)
      ? { appearanceType: sourceAppearanceType }
      : {}),
    ...(typeof sourceGenericType === "number" && Number.isFinite(sourceGenericType)
      ? { genericType: sourceGenericType }
      : {})
  };
  const fallbackTemplateId =
    resRef.length > 0
      ? resRef
      : sourceTemplateId && sourceTemplateId.length > 0
        ? sourceTemplateId
        : objectId;
  const processPayload: PlaceableApiProcessPayload = objectIdCanBeTemplateId
    ? {
        templateId: objectId,
        ...(resRef.length > 0
          ? { resref: resRef }
          : sourceTemplateId && sourceTemplateId.length > 0
            ? { resref: sourceTemplateId }
            : {}),
        ...(subtypeHint ? { subtypeHint } : {}),
        ...instanceFields
      }
    : {
        templateId: fallbackTemplateId,
        ...(resRef.length > 0
          ? { resref: resRef }
          : sourceTemplateId && sourceTemplateId.length > 0
            ? { resref: sourceTemplateId }
            : {}),
        ...(subtypeHint ? { subtypeHint } : {}),
        ...instanceFields
      };
  const indexKeys = hasAreaInstanceRenderOverride
    ? dedupeNonEmptyText([
        areaInstanceRenderPayloadCacheKey,
        sourceInstanceIndexKey
      ])
    : dedupeNonEmptyText([
        primaryTemplateId,
        objectIdCanBeTemplateId ? objectId : sourceInstanceIndexKey,
        resRef,
        sourceTemplateId,
        resRefTemplateId,
        sourceTemplateAlias
      ]);
  return {
    cacheKey: indexKeys[0] ?? objectId,
    processPayload,
    indexKeys: indexKeys.length > 0 ? indexKeys : [objectId],
    publishTemplateAliases: !hasAreaInstanceRenderOverride
  };
}

export function resolvePlaceableRenderPayloadFromLookup(
  payloadByTemplateId: Record<string, PlaceableViewportRenderPayload>,
  lookup: PlaceableRenderPayloadLookup
): PlaceableViewportRenderPayload | null {
  for (const key of lookup.indexKeys) {
    const payload = payloadByTemplateId[key];
    if (payload) {
      return payload;
    }
  }
  return null;
}

export function resolvePublishedPlaceableRenderPayloadKeys(
  lookup: PlaceableRenderPayloadLookup,
  payload: PlaceableViewportRenderPayload
): string[] {
  return dedupeNonEmptyText([
    ...lookup.indexKeys,
    ...(lookup.publishTemplateAliases
      ? [
          payload.templateId,
          payload.placeable.resref,
          buildPlaceableTemplateIdFromResRef(payload.placeable.resref)
        ]
      : [])
  ]);
}

export function resolvePlaceableTextureDeliveryUrl(
  payload: PlaceableViewportRenderPayload
): string | null {
  return resolvePlaceableTextureDeliveryUrlForOrigin(payload, resolveBackendDeliveryOrigin());
}

export function resolvePlaceableTextureDeliveryUrlsByReference(
  payload: PlaceableViewportRenderPayload
): Map<string, string> {
  return resolvePlaceableTextureDeliveryUrlsByReferenceForOrigin(
    payload,
    resolveBackendDeliveryOrigin()
  );
}

export function resolvePlaceableVfxChunkModelDeliveryUrlsByAssetId(
  payload: PlaceableViewportRenderPayload
): Map<string, string> {
  return resolvePlaceableVfxChunkModelDeliveryUrlsByAssetIdForOrigin(
    payload,
    resolveBackendDeliveryOrigin()
  );
}

export function resolvePlaceableModelResolution(
  payload: PlaceableViewportRenderPayload
): PlaceableRenderModelResolution {
  return resolvePlaceableModelResolutionForOrigin(payload, resolveBackendDeliveryOrigin());
}

function hasRenderableAuroraVfxPayload(payload: PlaceableViewportRenderPayload): boolean {
  const emitters = payload.renderPackage?.auroraEmitter?.emitters;
  const hasEmitter =
    Array.isArray(emitters) &&
    emitters.some((emitter) =>
      Boolean(
        emitter.renderMode ||
          emitter.emitterType ||
          emitter.texture ||
          emitter.chunkName ||
          emitter.simulation ||
          emitter.animations?.length
      )
    );
  if (hasEmitter) {
    return true;
  }

  const lights = payload.renderPackage?.auroraLight?.lights;
  return (
    Array.isArray(lights) &&
    lights.some((light) =>
      Boolean(
        light.nodeName ||
          light.radius ||
          light.multiplier ||
          light.color ||
          light.animations?.length
      )
    )
  );
}

export function isAreaPreviewOnlyAuroraVfxPayload(
  payload: PlaceableViewportRenderPayload | null | undefined
): boolean {
  if (!payload) {
    return false;
  }
  if (!payload.placeable.render.isVfx && payload.placeable.render.frontendType !== "vfx") {
    return false;
  }
  return (
    payload.renderPackage?.diagnostics?.some((diagnostic) =>
      AREA_PREVIEW_ONLY_VFX_DIAGNOSTICS.has(diagnostic.code)
    ) ?? false
  );
}

export function resolvePlaceableRenderContractState(
  payload: PlaceableViewportRenderPayload
): PlaceableRenderContractState {
  const placeableModelResolution = resolvePlaceableModelResolution(payload);
  const renderableWithoutModel = hasRenderableAuroraVfxPayload(payload);

  const roleByAssetId = new Map<string, string>(
    payload.placeable.assetManifest.assets.map((asset) => [asset.assetId, asset.role])
  );
  const textureDeliveryUrl = resolvePlaceableTextureDeliveryUrl(payload);
  let hasModelContract = false;
  let hasTextureContract = textureDeliveryUrl !== null;
  let hasMetadataContract = false;

  payload.assetContracts.assets.forEach((assetContract) => {
    const role = roleByAssetId.get(assetContract.assetId);
    if (!role) {
      return;
    }
    if (role === "texture") {
      hasTextureContract = true;
      return;
    }
    if (role === "model" || role === "vfx") {
      hasModelContract = true;
      return;
    }
    if (role === "metadata") {
      hasMetadataContract = true;
    }
  });

  return {
    textureDeliveryUrl,
    hasModelContract,
    hasTextureContract,
    hasMetadataContract,
    renderableWithoutModel,
    modelUrl: placeableModelResolution.modelUrl,
    modelCacheKey: placeableModelResolution.modelCacheKey,
    modelStatus: placeableModelResolution.status,
    modelFallbackReason: placeableModelResolution.fallbackReason,
    // Static models need a model URL; Aurora VFX can render from emitter/light payloads.
    fallbackToPrimitive:
      placeableModelResolution.modelUrl === null && !renderableWithoutModel
  };
}

export function resolveAreaPlaceablePlaceholderReason(input: {
  sharedRendererTarget?: boolean;
  payload: PlaceableViewportRenderPayload | null | undefined;
  renderState?: PlaceableRenderContractState | null;
  isPending?: boolean;
  modelLoadFailed?: boolean;
}): AreaPlaceablePlaceholderReason {
  if (input.sharedRendererTarget === false) {
    return "not-applicable";
  }
  if (input.modelLoadFailed) {
    return "model-load-failed";
  }
  if (input.isPending) {
    return "still-loading";
  }
  if (!input.payload) {
    return "missing-payload";
  }
  const renderState = input.renderState ?? resolvePlaceableRenderContractState(input.payload);
  if (renderState.renderableWithoutModel && !renderState.fallbackToPrimitive) {
    return "none";
  }
  if (isSourceModelNoGeometryPayload(input.payload)) {
    return "not-applicable";
  }
  if (isAreaPreviewOnlyAuroraVfxPayload(input.payload)) {
    return "not-applicable";
  }
  if (renderState.modelUrl && !renderState.fallbackToPrimitive) {
    return "none";
  }
  if (!renderState.hasModelContract) {
    return "asset-contract-blocked";
  }
  return "payload-missing-model-url";
}

function isSourceModelNoGeometryPayload(payload: PlaceableViewportRenderPayload): boolean {
  return payload.renderPackage?.diagnostics?.some(
    (diagnostic) =>
      diagnostic.code === "PLACEABLE_RENDER_SOURCE_MODEL_NO_GEOMETRY" ||
      diagnostic.code === "PLACEABLE_RENDER_AREA_INSTANCE_HELPER_NO_GEOMETRY"
  ) === true;
}
