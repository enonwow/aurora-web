import type { CreatureViewportRenderPayload } from "./creatureRenderPayloadResolver";
import {
  resolveBackendDeliveryOriginFromConfig,
  resolvePlaceableAssetDeliveryUrl,
  resolveUnsupportedModelCandidateReason
} from "../../placeables/application/placeableRenderAssetResolver";
import { normalizePlaceableTextureReference } from "../../placeables/application/placeableTextureReferences";

export interface CreatureRenderModelResolution {
  modelUrl: string | null;
  modelCacheKey: string | null;
  status: string | null;
  fallbackReason: string | null;
  ready: boolean;
  assetId?: string;
  supermodelResRef?: string;
  supermodelModelUrl?: string;
  supermodelModelCacheKey?: string;
  supermodelAssetId?: string;
  supermodelChainModelUrls?: string[];
  supermodelChainModelCacheKeys?: string[];
  supermodelChainResRefs?: string[];
  supermodelChainAssetIds?: string[];
}

export interface CreatureRenderPartModelResolution {
  slot: string;
  partId: number;
  modelUrl: string;
  modelCacheKey: string;
  modelPrefix?: string;
  modelResRef?: string;
  nodeName?: string;
  materialColors?: Record<string, number | undefined>;
}

export interface CreatureRenderEquipmentModelPartResolution {
  equipmentResref: string;
  equipmentIndex: number;
  partResref: string;
  partIndex: number;
  modelUrl: string;
  modelCacheKey: string;
  attachmentTarget: string;
  slotLabels: string[];
  itemModelType?: string;
  baseItem?: number;
  baseItemEquipableSlots?: string;
  weaponWield?: number;
  weaponType?: number;
  weaponSize?: number;
  rangedWeapon?: number;
  rotateOnGround?: number;
  ammunitionType?: number;
  role?: string;
  partId?: number;
  assetId?: string;
  supermodelResRef?: string;
  supermodelModelUrl?: string;
  supermodelModelCacheKey?: string;
  supermodelAssetId?: string;
  supermodelChainModelUrls?: string[];
  supermodelChainModelCacheKeys?: string[];
  supermodelChainResRefs?: string[];
  supermodelChainAssetIds?: string[];
}

export interface CreatureRenderEquipmentModelPartResolutionOptions {
  includeAmmunitionVisual?: boolean;
}

export interface CreatureRenderSkeletonModelResolution {
  resref: string;
  modelUrl: string;
  modelCacheKey: string;
  assetId?: string;
  supermodelResRef?: string;
  supermodelModelUrl?: string;
  supermodelModelCacheKey?: string;
  supermodelAssetId?: string;
  supermodelChainModelUrls?: string[];
  supermodelChainModelCacheKeys?: string[];
  supermodelChainResRefs?: string[];
  supermodelChainAssetIds?: string[];
}

function resolveBackendDeliveryOrigin(): string {
  const configuredBaseUrl = import.meta.env.VITE_BACKEND_API_BASE_URL as string | undefined;
  return resolveBackendDeliveryOriginFromConfig(configuredBaseUrl);
}

function normalizeText(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

const CREATURE_AMMUNITION_SLOT_LABELS = new Set(["arrows", "bullets", "bolts"]);
const CREATURE_AMMUNITION_MODEL_TYPES = new Set(["wamar", "wambo", "wambu"]);
const CREATURE_SPECIAL_MODEL_TYPES_WITHOUT_EQUIPMENT_OVERLAYS = new Set(["s"]);
const CREATURE_HANDHELD_BOW_MODEL_TYPES = new Set([
  "wbwln",
  "wbwsh"
]);
const CREATURE_HANDHELD_CROSSBOW_MODEL_TYPES = new Set([
  "wbwxh",
  "wbwxl"
]);
const CREATURE_RUNTIME_AMMUNITION_PART_RESREFS = new Map([
  ["wamar", "wamar_m_011"],
  ["wambo", "wambo_011"],
  ["wambu", "wambu_011"]
]);
const CREATURE_RUNTIME_AMMUNITION_MODEL_TYPES_BY_AMMUNITION_TYPE = new Map([
  [1, "wamar"],
  [2, "wambo"],
  [3, "wambu"]
]);

type CreatureEquipmentModelPartCandidateList = NonNullable<
  NonNullable<
    CreatureViewportRenderPayload["renderPackage"]
  >["equipmentModelCandidates"][number]["itemModelPartCandidates"]
>;

function normalizeCreatureEquipmentToken(value: string | null | undefined): string {
  return normalizeText(value)?.toLowerCase() ?? "";
}

function isCreatureAmmunitionEquipmentCandidate(
  candidate: NonNullable<
    CreatureViewportRenderPayload["renderPackage"]
  >["equipmentModelCandidates"][number]
): boolean {
  const modelType = normalizeCreatureEquipmentToken(candidate.itemModelType);
  return (
    CREATURE_AMMUNITION_MODEL_TYPES.has(modelType) ||
    candidate.slotLabels.some((label) =>
      CREATURE_AMMUNITION_SLOT_LABELS.has(normalizeCreatureEquipmentToken(label))
    )
  );
}

function shouldSuppressCreatureEquipmentOverlaysForAppearance(
  payload: CreatureViewportRenderPayload
): boolean {
  const modelType = normalizeCreatureEquipmentToken(
    payload.renderPackage?.appearanceProfile?.modelType
  );
  return CREATURE_SPECIAL_MODEL_TYPES_WITHOUT_EQUIPMENT_OVERLAYS.has(modelType);
}

function isCreatureHandheldBowEquipmentCandidate(
  candidate: NonNullable<
    CreatureViewportRenderPayload["renderPackage"]
  >["equipmentModelCandidates"][number]
): boolean {
  if (candidate.weaponWield === 5) {
    return true;
  }
  return CREATURE_HANDHELD_BOW_MODEL_TYPES.has(
    normalizeCreatureEquipmentToken(candidate.itemModelType)
  );
}

function isCreatureHandheldCrossbowEquipmentCandidate(
  candidate: NonNullable<
    CreatureViewportRenderPayload["renderPackage"]
  >["equipmentModelCandidates"][number]
): boolean {
  if (candidate.weaponWield === 6) {
    return true;
  }
  return CREATURE_HANDHELD_CROSSBOW_MODEL_TYPES.has(
    normalizeCreatureEquipmentToken(candidate.itemModelType)
  );
}

function resolveCreatureEquipmentRenderAttachmentTarget(
  candidate: NonNullable<
    CreatureViewportRenderPayload["renderPackage"]
  >["equipmentModelCandidates"][number],
  fallbackTarget: string
): string {
  const normalizedFallbackTarget = normalizeCreatureEquipmentToken(fallbackTarget);
  if (
    isCreatureHandheldBowEquipmentCandidate(candidate) &&
    (normalizedFallbackTarget === "rhand_g" || normalizedFallbackTarget === "rhand")
  ) {
    return "lhand_g";
  }
  if (
    isCreatureHandheldCrossbowEquipmentCandidate(candidate) &&
    (normalizedFallbackTarget === "lhand_g" || normalizedFallbackTarget === "lhand")
  ) {
    return "rhand_g";
  }
  if (normalizedFallbackTarget === "rhand") {
    return "rhand_g";
  }
  if (normalizedFallbackTarget === "lhand") {
    return "lhand_g";
  }
  return fallbackTarget;
}

function selectCreatureAmmunitionVisualPartCandidates(
  candidates: NonNullable<
    CreatureViewportRenderPayload["renderPackage"]
  >["equipmentModelCandidates"][number]["itemModelPartCandidates"]
): CreatureEquipmentModelPartCandidateList {
  const safeCandidates = candidates ?? [];
  const middleCandidates = safeCandidates.filter((candidate) => {
    const role = normalizeCreatureEquipmentToken(candidate.role);
    const resref = normalizeCreatureEquipmentToken(candidate.resref);
    return role === "middle" || /_m_\d+$/u.test(resref);
  });
  if (middleCandidates.length > 0) {
    return middleCandidates;
  }
  return safeCandidates.slice(0, 1);
}

function resolveCreatureRuntimeAmmunitionPartResref(
  candidate: NonNullable<
    CreatureViewportRenderPayload["renderPackage"]
  >["equipmentModelCandidates"][number]
): string | null {
  const explicitPartResref = normalizeText(
    selectCreatureAmmunitionVisualPartCandidates(
      candidate.itemModelPartCandidates ?? []
    )[0]?.resref
  );
  if (explicitPartResref) {
    return explicitPartResref;
  }
  const explicitResref = normalizeText(candidate.itemModelPartResRefs?.[0]);
  if (explicitResref) {
    return explicitResref;
  }
  const modelType = normalizeCreatureEquipmentToken(candidate.itemModelType);
  return CREATURE_RUNTIME_AMMUNITION_PART_RESREFS.get(modelType) ?? null;
}

function resolveCreatureRuntimeAmmunitionModelTypeFromLauncher(
  candidate: NonNullable<
    CreatureViewportRenderPayload["renderPackage"]
  >["equipmentModelCandidates"][number]
): string | null {
  if (typeof candidate.ammunitionType === "number") {
    return (
      CREATURE_RUNTIME_AMMUNITION_MODEL_TYPES_BY_AMMUNITION_TYPE.get(
        candidate.ammunitionType
      ) ?? null
    );
  }
  if (isCreatureHandheldBowEquipmentCandidate(candidate)) {
    return "wamar";
  }
  if (isCreatureHandheldCrossbowEquipmentCandidate(candidate)) {
    return "wambo";
  }
  return null;
}

function createCreatureRuntimeAmmunitionFallbackResolution(
  payload: CreatureViewportRenderPayload,
  equipmentCandidate: NonNullable<
    CreatureViewportRenderPayload["renderPackage"]
  >["equipmentModelCandidates"][number],
  equipmentIndex: number
): CreatureRenderEquipmentModelPartResolution | null {
  const modelType = resolveCreatureRuntimeAmmunitionModelTypeFromLauncher(equipmentCandidate);
  if (!modelType) {
    return null;
  }
  const partResref = CREATURE_RUNTIME_AMMUNITION_PART_RESREFS.get(modelType);
  if (!partResref) {
    return null;
  }
  const attachmentTarget = "rhand_g";
  return {
    equipmentResref: `${equipmentCandidate.resref}:runtime-${modelType}`,
    equipmentIndex,
    partResref,
    partIndex: 0,
    modelUrl: `runtime://aurora-ammunition/${partResref}`,
    modelCacheKey: `creature:${payload.cacheKey}:equipment:${equipmentCandidate.resref}:runtime-${partResref}`,
    attachmentTarget,
    slotLabels:
      modelType === "wamar"
        ? ["arrows"]
        : modelType === "wambo"
          ? ["bolts"]
          : ["bullets"],
    itemModelType: modelType,
    ...(typeof equipmentCandidate.baseItem === "number"
      ? { baseItem: equipmentCandidate.baseItem }
      : {}),
    ...(typeof equipmentCandidate.ammunitionType === "number"
      ? { ammunitionType: equipmentCandidate.ammunitionType }
      : {}),
    role: "runtime-ammunition",
    partId: 11,
    assetId: "runtime-ammunition-proxy"
  };
}

function resolveAssetExtension(fileName: string | null | undefined): string {
  const normalized = normalizeText(fileName)?.split(/[?#]/u)[0] ?? "";
  const extensionIndex = normalized.lastIndexOf(".");
  if (extensionIndex < 0) {
    return "";
  }
  const extension = normalized.slice(extensionIndex).toLowerCase();
  return /^\.[a-z0-9]+$/u.test(extension) ? extension : "";
}

function resolveCreatureTextureBindingDeliveryUrl(
  payload: CreatureViewportRenderPayload,
  binding: NonNullable<
    NonNullable<CreatureViewportRenderPayload["renderPackage"]>["textureBindings"]
  >[number],
  deliveryOrigin: string
): string | null {
  const assetId = normalizeText(binding.assetId);
  if (assetId) {
    const extension =
      resolveAssetExtension(binding.fileName) || resolveAssetExtension(binding.deliveryUrl);
    const deliveryPath = `/api/v1/catalog/placeables/cache/${encodeURIComponent(
      payload.cacheKey
    )}/assets/${encodeURIComponent(assetId)}${extension}`;
    return resolvePlaceableAssetDeliveryUrl(deliveryPath, deliveryOrigin);
  }
  const deliveryUrl = normalizeText(binding.deliveryUrl);
  return deliveryUrl ? resolvePlaceableAssetDeliveryUrl(deliveryUrl, deliveryOrigin) : null;
}

function resolveCreatureModelCacheKey(
  payload: CreatureViewportRenderPayload,
  modelCandidate: string,
  assetId?: string
): string {
  const derivedAssetId =
    normalizeText(assetId) ?? payload.renderPackage?.assetRefs?.derivedModelAssetIds?.[0]?.trim();
  if (derivedAssetId) {
    return `creature:${payload.cacheKey}:derived:${derivedAssetId}`;
  }
  return `creature:${payload.cacheKey}:model:${modelCandidate}`;
}

function resolveCreatureDirectSourceModelCandidate(
  payload: CreatureViewportRenderPayload
):
  | NonNullable<CreatureViewportRenderPayload["renderPackage"]>["sourceModelCandidates"][number]
  | null {
  const candidates = payload.renderPackage?.sourceModelCandidates ?? [];
  return (
    candidates.find((candidate) => {
      const modelCandidate = normalizeText(candidate.glbUrl) ?? normalizeText(candidate.modelUrl);
      return Boolean(modelCandidate && !resolveUnsupportedModelCandidateReason(modelCandidate));
    }) ??
    candidates.find((candidate) => candidate.confidence === "direct-model") ??
    null
  );
}

function resolveCreatureDerivedModelSiblingUrl(
  payload: CreatureViewportRenderPayload,
  modelResRef: string,
  deliveryOrigin: string
): string | null {
  const candidateUrls = [
    ...(payload.renderPackage?.skeletonModelCandidates ?? []).flatMap((candidate) => [
      candidate.glbUrl,
      candidate.modelUrl
    ]),
    payload.renderPackage?.glbUrl,
    payload.renderPackage?.modelUrl
  ];
  for (const candidateUrl of candidateUrls) {
    const normalizedUrl = normalizeText(candidateUrl);
    if (!normalizedUrl) {
      continue;
    }
    try {
      const resolvedUrl = new URL(
        resolvePlaceableAssetDeliveryUrl(normalizedUrl, deliveryOrigin)
      );
      if (!/\/__aurora\/derived\/models\/[^/]+\.glb$/iu.test(resolvedUrl.pathname)) {
        continue;
      }
      const pathSegments = resolvedUrl.pathname.split("/");
      pathSegments[pathSegments.length - 1] = `${modelResRef}.glb`;
      resolvedUrl.pathname = pathSegments.join("/");
      resolvedUrl.search = "";
      resolvedUrl.hash = "";
      return resolvedUrl.toString();
    } catch {
      // Try the next known delivery URL.
    }
  }
  return null;
}

function resolveHeadFallbackModelResRef(modelResRef: string | undefined): string | null {
  const normalizedResRef = normalizeText(modelResRef)?.toLowerCase();
  const match = normalizedResRef?.match(/^(p[a-z][a-z])\d+_head\d+$/iu);
  if (!match) {
    return null;
  }
  return `${match[1]}0_head001`;
}

function resolveCreatureHeadFallbackPartModelResolutions(
  payload: CreatureViewportRenderPayload,
  deliveryOrigin: string
): CreatureRenderPartModelResolution[] {
  const candidates = payload.renderPackage?.partModelCandidates ?? [];
  return candidates.flatMap((candidate): CreatureRenderPartModelResolution[] => {
    const slot = normalizeText(candidate.slot)?.toLowerCase();
    const modelCandidate = normalizeText(candidate.glbUrl) ?? normalizeText(candidate.modelUrl);
    if (slot !== "head" || modelCandidate) {
      return [];
    }
    const fallbackResRef = resolveHeadFallbackModelResRef(candidate.modelResRef);
    if (!fallbackResRef) {
      return [];
    }
    const fallbackUrl = resolveCreatureDerivedModelSiblingUrl(
      payload,
      fallbackResRef,
      deliveryOrigin
    );
    if (!fallbackUrl || resolveUnsupportedModelCandidateReason(fallbackUrl)) {
      return [];
    }
    return [
      {
        slot: candidate.slot,
        partId: 1,
        modelUrl: fallbackUrl,
        modelCacheKey: `creature:${payload.cacheKey}:part-fallback:${candidate.slot}:${fallbackResRef}`,
        modelResRef: fallbackResRef,
        ...(candidate.nodeName ? { nodeName: candidate.nodeName } : {})
      }
    ];
  });
}

function normalizeCreaturePartSlotKey(value: string | undefined): string {
  return normalizeText(value)?.toLowerCase() ?? "";
}

function isDefaultHeadFallbackResolution(entry: CreatureRenderPartModelResolution): boolean {
  return (
    normalizeCreaturePartSlotKey(entry.slot) === "head" &&
    /_head001$/iu.test(entry.modelResRef ?? "")
  );
}

function dedupeCreaturePartModelResolutions(
  resolutions: CreatureRenderPartModelResolution[]
): CreatureRenderPartModelResolution[] {
  const bySlot = new Map<string, CreatureRenderPartModelResolution>();
  resolutions.forEach((entry) => {
    const slotKey = normalizeCreaturePartSlotKey(entry.slot);
    if (!slotKey) {
      return;
    }
    const existing = bySlot.get(slotKey);
    if (!existing) {
      bySlot.set(slotKey, entry);
      return;
    }
    if (isDefaultHeadFallbackResolution(existing) && !isDefaultHeadFallbackResolution(entry)) {
      bySlot.set(slotKey, entry);
    }
  });
  return Array.from(bySlot.values());
}

export function resolveCreatureModelResolution(
  payload: CreatureViewportRenderPayload,
  deliveryOrigin = resolveBackendDeliveryOrigin()
): CreatureRenderModelResolution {
  const renderPackage = payload.renderPackage;
  if (!renderPackage) {
    return {
      modelUrl: null,
      modelCacheKey: null,
      status: null,
      fallbackReason: null,
      ready: false
    };
  }

  const status = normalizeText(renderPackage.status) ?? "";
  const sourceModelCandidate = resolveCreatureDirectSourceModelCandidate(payload);
  const modelCandidate =
    normalizeText(sourceModelCandidate?.glbUrl) ??
    normalizeText(sourceModelCandidate?.modelUrl) ??
    normalizeText(renderPackage.glbUrl) ?? normalizeText(renderPackage.modelUrl);

  if (status.toLowerCase() !== "ready" && !modelCandidate) {
    return {
      modelUrl: null,
      modelCacheKey: null,
      status,
      fallbackReason: `renderPackage.status is "${status}"`,
      ready: false
    };
  }

  if (!modelCandidate) {
    return {
      modelUrl: null,
      modelCacheKey: null,
      status,
      fallbackReason: "renderPackage has no model URL",
      ready: false
    };
  }

  const fallbackFromExtension = resolveUnsupportedModelCandidateReason(modelCandidate);
  if (fallbackFromExtension) {
    return {
      modelUrl: null,
      modelCacheKey: null,
      status,
      fallbackReason: fallbackFromExtension,
      ready: false
    };
  }

  const supermodelCandidate =
    normalizeText(sourceModelCandidate?.supermodelGlbUrl) ??
    normalizeText(sourceModelCandidate?.supermodelModelUrl);
  const supermodelAssetKey =
    normalizeText(sourceModelCandidate?.supermodelAssetId) ??
    normalizeText(sourceModelCandidate?.supermodelResRef) ??
    "supermodel";
  const supportedSupermodelCandidate =
    supermodelCandidate && !resolveUnsupportedModelCandidateReason(supermodelCandidate)
      ? supermodelCandidate
      : null;
  const supermodelChainCandidates = [
    ...(sourceModelCandidate?.supermodelChainGlbUrls ?? []),
    ...(sourceModelCandidate?.supermodelChainModelUrls ?? [])
  ]
    .map(normalizeText)
    .filter((candidate): candidate is string => Boolean(candidate))
    .filter((candidate) => !resolveUnsupportedModelCandidateReason(candidate));
  const supermodelChainModelUrls = supermodelChainCandidates.map((candidate) =>
    resolvePlaceableAssetDeliveryUrl(candidate, deliveryOrigin)
  );
  const supermodelChainAssetKeys =
    sourceModelCandidate?.supermodelChainAssetIds?.length === supermodelChainCandidates.length
      ? sourceModelCandidate.supermodelChainAssetIds
      : sourceModelCandidate?.supermodelChainResRefs?.length === supermodelChainCandidates.length
        ? sourceModelCandidate.supermodelChainResRefs
        : supermodelChainCandidates;

  return {
    modelUrl: resolvePlaceableAssetDeliveryUrl(modelCandidate, deliveryOrigin),
    modelCacheKey: resolveCreatureModelCacheKey(
      payload,
      modelCandidate,
      sourceModelCandidate?.assetId
    ),
    status,
    fallbackReason: null,
    ready: true,
    ...(sourceModelCandidate?.assetId ? { assetId: sourceModelCandidate.assetId } : {}),
    ...(sourceModelCandidate?.supermodelResRef
      ? { supermodelResRef: sourceModelCandidate.supermodelResRef }
      : {}),
    ...(supportedSupermodelCandidate
      ? {
          supermodelModelUrl: resolvePlaceableAssetDeliveryUrl(
            supportedSupermodelCandidate,
            deliveryOrigin
          ),
          supermodelModelCacheKey: `creature:${payload.cacheKey}:supermodel:${supermodelAssetKey}`
        }
      : {}),
    ...(sourceModelCandidate?.supermodelAssetId
      ? { supermodelAssetId: sourceModelCandidate.supermodelAssetId }
      : {}),
    ...(supermodelChainModelUrls.length > 0
      ? {
          supermodelChainModelUrls,
          supermodelChainModelCacheKeys: supermodelChainAssetKeys.map(
            (assetKey) => `creature:${payload.cacheKey}:supermodel-chain:${assetKey}`
          )
        }
      : {}),
    ...(sourceModelCandidate?.supermodelChainResRefs
      ? { supermodelChainResRefs: sourceModelCandidate.supermodelChainResRefs }
      : {}),
    ...(sourceModelCandidate?.supermodelChainAssetIds
      ? { supermodelChainAssetIds: sourceModelCandidate.supermodelChainAssetIds }
      : {})
  };
}

export function resolveCreaturePartModelResolutions(
  payload: CreatureViewportRenderPayload,
  deliveryOrigin = resolveBackendDeliveryOrigin()
): CreatureRenderPartModelResolution[] {
  const resolvedPartModels = (payload.renderPackage?.partModelCandidates ?? [])
    .map((candidate): CreatureRenderPartModelResolution | null => {
      const modelCandidate = normalizeText(candidate.glbUrl) ?? normalizeText(candidate.modelUrl);
      if (!modelCandidate || resolveUnsupportedModelCandidateReason(modelCandidate)) {
        return null;
      }
      const modelResRef = normalizeText(candidate.modelResRef) ?? undefined;
      const modelPrefix = normalizeText(candidate.modelPrefix) ?? undefined;
      const assetKey =
        normalizeText(candidate.assetId) ??
        modelResRef ??
        normalizeText(candidate.partModelName) ??
        `${candidate.slot}:${candidate.partId}`;
      return {
        slot: candidate.slot,
        partId: candidate.partId,
        modelUrl: resolvePlaceableAssetDeliveryUrl(modelCandidate, deliveryOrigin),
        modelCacheKey: `creature:${payload.cacheKey}:part:${candidate.slot}:${assetKey}`,
        ...(modelPrefix ? { modelPrefix } : {}),
        ...(modelResRef ? { modelResRef } : {}),
        ...(candidate.nodeName ? { nodeName: candidate.nodeName } : {}),
        ...(candidate.materialColors ? { materialColors: candidate.materialColors } : {})
      };
    })
    .filter((entry): entry is CreatureRenderPartModelResolution => Boolean(entry));
  const fallbackPartModels = resolveCreatureHeadFallbackPartModelResolutions(
    payload,
    deliveryOrigin
  );
  return dedupeCreaturePartModelResolutions([...resolvedPartModels, ...fallbackPartModels]);
}

export function resolveCreatureEquipmentModelPartResolutions(
  payload: CreatureViewportRenderPayload,
  deliveryOrigin = resolveBackendDeliveryOrigin(),
  options: CreatureRenderEquipmentModelPartResolutionOptions = {}
): CreatureRenderEquipmentModelPartResolution[] {
  if (shouldSuppressCreatureEquipmentOverlaysForAppearance(payload)) {
    return [];
  }
  const equipmentModelCandidates = payload.renderPackage?.equipmentModelCandidates ?? [];
  const hasExplicitAmmunitionCandidate = equipmentModelCandidates.some(
    isCreatureAmmunitionEquipmentCandidate
  );
  const resolvedEquipmentModelParts = equipmentModelCandidates.flatMap(
    (equipmentCandidate, equipmentIndex) => {
      const isAmmunitionCandidate = isCreatureAmmunitionEquipmentCandidate(
        equipmentCandidate
      );
      if (isAmmunitionCandidate && !options.includeAmmunitionVisual) {
        return [];
      }
      const attachmentTarget =
        normalizeText(equipmentCandidate.primaryAttachmentTarget) ??
        equipmentCandidate.attachmentTargets.find((target) => normalizeText(target)) ??
        "rootdummy";
      const renderAttachmentTarget = isAmmunitionCandidate
        ? "rhand_g"
        : resolveCreatureEquipmentRenderAttachmentTarget(
            equipmentCandidate,
            attachmentTarget
          );
      const partCandidates = isAmmunitionCandidate
        ? selectCreatureAmmunitionVisualPartCandidates(
            equipmentCandidate.itemModelPartCandidates ?? []
          )
        : equipmentCandidate.itemModelPartCandidates ?? [];
      const resolvedPartCandidates =
        isAmmunitionCandidate && partCandidates.length === 0
          ? [
              {
                resref: resolveCreatureRuntimeAmmunitionPartResref(equipmentCandidate) ?? "",
                role: "runtime-ammunition",
                partId: 11,
                assetId: "runtime-ammunition-proxy"
              }
            ]
          : partCandidates;
      return (resolvedPartCandidates ?? [])
        .map((partCandidate, partIndex): CreatureRenderEquipmentModelPartResolution | null => {
          const modelCandidate =
            normalizeText(partCandidate.glbUrl) ?? normalizeText(partCandidate.modelUrl);
          const partResref = normalizeText(partCandidate.resref);
          const isRuntimeAmmunitionProxy =
            isAmmunitionCandidate && partResref && !modelCandidate;
          if (
            !isRuntimeAmmunitionProxy &&
            (!modelCandidate || resolveUnsupportedModelCandidateReason(modelCandidate))
          ) {
            return null;
          }
          if (!partResref) {
            return null;
          }
          const assetKey =
            normalizeText(partCandidate.assetId) ??
            partResref ??
            `${equipmentCandidate.resref}:${partIndex}`;
          const modelUrl = isRuntimeAmmunitionProxy
            ? `runtime://aurora-ammunition/${partResref}`
            : resolvePlaceableAssetDeliveryUrl(modelCandidate ?? "", deliveryOrigin);
          const supermodelCandidate =
            normalizeText(partCandidate.supermodelGlbUrl) ??
            normalizeText(partCandidate.supermodelModelUrl);
          const supportedSupermodelCandidate =
            supermodelCandidate && !resolveUnsupportedModelCandidateReason(supermodelCandidate)
              ? supermodelCandidate
              : null;
          const supermodelAssetKey =
            normalizeText(partCandidate.supermodelAssetId) ??
            normalizeText(partCandidate.supermodelResRef) ??
            "equipment-supermodel";
          const supermodelChainCandidates = [
            ...(partCandidate.supermodelChainGlbUrls ?? []),
            ...(partCandidate.supermodelChainModelUrls ?? [])
          ]
            .map(normalizeText)
            .filter((entry): entry is string => Boolean(entry))
            .filter((entry) => !resolveUnsupportedModelCandidateReason(entry));
          const supermodelChainModelUrls = supermodelChainCandidates.map((entry) =>
            resolvePlaceableAssetDeliveryUrl(entry, deliveryOrigin)
          );
          const supermodelChainAssetKeys =
            partCandidate.supermodelChainAssetIds?.length === supermodelChainCandidates.length
              ? partCandidate.supermodelChainAssetIds
              : partCandidate.supermodelChainResRefs?.length === supermodelChainCandidates.length
                ? partCandidate.supermodelChainResRefs
                : supermodelChainCandidates;
          return {
            equipmentResref: equipmentCandidate.resref,
            equipmentIndex,
            partResref,
            partIndex,
            modelUrl,
            modelCacheKey: `creature:${payload.cacheKey}:equipment:${equipmentCandidate.resref}:${assetKey}`,
            attachmentTarget: renderAttachmentTarget,
            slotLabels: equipmentCandidate.slotLabels,
            ...(equipmentCandidate.itemModelType
              ? { itemModelType: equipmentCandidate.itemModelType }
              : {}),
            ...(typeof equipmentCandidate.baseItem === "number"
              ? { baseItem: equipmentCandidate.baseItem }
              : {}),
            ...(equipmentCandidate.baseItemEquipableSlots
              ? { baseItemEquipableSlots: equipmentCandidate.baseItemEquipableSlots }
              : {}),
            ...(typeof equipmentCandidate.weaponWield === "number"
              ? { weaponWield: equipmentCandidate.weaponWield }
              : {}),
            ...(typeof equipmentCandidate.weaponType === "number"
              ? { weaponType: equipmentCandidate.weaponType }
              : {}),
            ...(typeof equipmentCandidate.weaponSize === "number"
              ? { weaponSize: equipmentCandidate.weaponSize }
              : {}),
            ...(typeof equipmentCandidate.rangedWeapon === "number"
              ? { rangedWeapon: equipmentCandidate.rangedWeapon }
              : {}),
            ...(typeof equipmentCandidate.rotateOnGround === "number"
              ? { rotateOnGround: equipmentCandidate.rotateOnGround }
              : {}),
            ...(typeof equipmentCandidate.ammunitionType === "number"
              ? { ammunitionType: equipmentCandidate.ammunitionType }
              : {}),
            ...(partCandidate.role ? { role: partCandidate.role } : {}),
            ...(typeof partCandidate.partId === "number" ? { partId: partCandidate.partId } : {}),
            ...(partCandidate.assetId ? { assetId: partCandidate.assetId } : {}),
            ...(partCandidate.supermodelResRef
              ? { supermodelResRef: partCandidate.supermodelResRef }
              : {}),
            ...(supportedSupermodelCandidate
              ? {
                  supermodelModelUrl: resolvePlaceableAssetDeliveryUrl(
                    supportedSupermodelCandidate,
                    deliveryOrigin
                  ),
                  supermodelModelCacheKey: `creature:${payload.cacheKey}:equipment-supermodel:${equipmentCandidate.resref}:${supermodelAssetKey}`
                }
              : {}),
            ...(partCandidate.supermodelAssetId
              ? { supermodelAssetId: partCandidate.supermodelAssetId }
              : {}),
            ...(supermodelChainModelUrls.length > 0
              ? {
                  supermodelChainModelUrls,
                  supermodelChainModelCacheKeys: supermodelChainAssetKeys.map(
                    (assetKey) =>
                      `creature:${payload.cacheKey}:equipment-supermodel-chain:${equipmentCandidate.resref}:${assetKey}`
                  )
                }
              : {}),
            ...(partCandidate.supermodelChainResRefs
              ? { supermodelChainResRefs: partCandidate.supermodelChainResRefs }
              : {}),
            ...(partCandidate.supermodelChainAssetIds
              ? { supermodelChainAssetIds: partCandidate.supermodelChainAssetIds }
              : {})
          };
        })
        .filter((entry): entry is CreatureRenderEquipmentModelPartResolution => Boolean(entry));
    }
  );
  if (!options.includeAmmunitionVisual || hasExplicitAmmunitionCandidate) {
    return resolvedEquipmentModelParts;
  }
  const runtimeAmmunitionFallbacks = equipmentModelCandidates
    .map((equipmentCandidate, equipmentIndex) =>
      createCreatureRuntimeAmmunitionFallbackResolution(
        payload,
        equipmentCandidate,
        equipmentIndex
      )
    )
    .filter(
      (entry): entry is CreatureRenderEquipmentModelPartResolution => Boolean(entry)
    );
  return [...resolvedEquipmentModelParts, ...runtimeAmmunitionFallbacks];
}

export function resolveCreatureSkeletonModelResolution(
  payload: CreatureViewportRenderPayload,
  deliveryOrigin = resolveBackendDeliveryOrigin()
): CreatureRenderSkeletonModelResolution | null {
  const candidate = (payload.renderPackage?.skeletonModelCandidates ?? []).find(
    (entry) => {
      const modelCandidate = normalizeText(entry.glbUrl) ?? normalizeText(entry.modelUrl);
      return Boolean(modelCandidate && !resolveUnsupportedModelCandidateReason(modelCandidate));
    }
  );
  if (!candidate) {
    return null;
  }

  const modelCandidate = normalizeText(candidate.glbUrl) ?? normalizeText(candidate.modelUrl);
  if (!modelCandidate) {
    return null;
  }
  const assetKey = normalizeText(candidate.assetId) ?? normalizeText(candidate.resref) ?? "base";
  const supermodelCandidate =
    normalizeText(candidate.supermodelGlbUrl) ?? normalizeText(candidate.supermodelModelUrl);
  const supermodelAssetKey =
    normalizeText(candidate.supermodelAssetId) ??
    normalizeText(candidate.supermodelResRef) ??
    "supermodel";
  const hasSupportedSupermodel =
    supermodelCandidate && !resolveUnsupportedModelCandidateReason(supermodelCandidate);
  const supermodelChainCandidates = [
    ...(candidate.supermodelChainGlbUrls ?? []),
    ...(candidate.supermodelChainModelUrls ?? [])
  ]
    .map(normalizeText)
    .filter((entry): entry is string => Boolean(entry))
    .filter((entry) => !resolveUnsupportedModelCandidateReason(entry));
  const supermodelChainModelUrls = supermodelChainCandidates.map((entry) =>
    resolvePlaceableAssetDeliveryUrl(entry, deliveryOrigin)
  );
  const supermodelChainAssetKeys =
    candidate.supermodelChainAssetIds?.length === supermodelChainCandidates.length
      ? candidate.supermodelChainAssetIds
      : candidate.supermodelChainResRefs?.length === supermodelChainCandidates.length
        ? candidate.supermodelChainResRefs
        : supermodelChainCandidates;
  return {
    resref: candidate.resref,
    modelUrl: resolvePlaceableAssetDeliveryUrl(modelCandidate, deliveryOrigin),
    modelCacheKey: `creature:${payload.cacheKey}:skeleton:${assetKey}`,
    ...(candidate.assetId ? { assetId: candidate.assetId } : {}),
    ...(candidate.supermodelResRef ? { supermodelResRef: candidate.supermodelResRef } : {}),
    ...(hasSupportedSupermodel
      ? {
          supermodelModelUrl: resolvePlaceableAssetDeliveryUrl(
            supermodelCandidate,
            deliveryOrigin
          ),
          supermodelModelCacheKey: `creature:${payload.cacheKey}:supermodel:${supermodelAssetKey}`
        }
      : {}),
    ...(candidate.supermodelAssetId ? { supermodelAssetId: candidate.supermodelAssetId } : {}),
    ...(supermodelChainModelUrls.length > 0
      ? {
          supermodelChainModelUrls,
          supermodelChainModelCacheKeys: supermodelChainAssetKeys.map(
            (assetKey) => `creature:${payload.cacheKey}:skeleton-supermodel-chain:${assetKey}`
          )
        }
      : {}),
    ...(candidate.supermodelChainResRefs
      ? { supermodelChainResRefs: candidate.supermodelChainResRefs }
      : {}),
    ...(candidate.supermodelChainAssetIds
      ? { supermodelChainAssetIds: candidate.supermodelChainAssetIds }
      : {})
  };
}

export function resolveCreatureTextureDeliveryUrlsByReference(
  payload: CreatureViewportRenderPayload,
  deliveryOrigin = resolveBackendDeliveryOrigin()
): Map<string, string> {
  const urlsByReference = new Map<string, string>();
  const textureBindings = payload.renderPackage?.textureBindings;
  if (Array.isArray(textureBindings)) {
    textureBindings.forEach((binding) => {
      const reference = normalizePlaceableTextureReference(binding.reference || binding.fileName);
      const deliveryUrl = resolveCreatureTextureBindingDeliveryUrl(
        payload,
        binding,
        deliveryOrigin
      );
      if (!reference || !deliveryUrl || urlsByReference.has(reference)) {
        return;
      }
      urlsByReference.set(reference, deliveryUrl);
    });
  }

  const packageTextureUrls = payload.renderPackage?.textureUrls;
  if (!Array.isArray(packageTextureUrls)) {
    return urlsByReference;
  }

  packageTextureUrls.forEach((textureUrl) => {
    const normalizedTextureUrl = textureUrl.trim();
    if (normalizedTextureUrl.length === 0) {
      return;
    }
    const reference = normalizePlaceableTextureReference(normalizedTextureUrl);
    if (!reference || urlsByReference.has(reference)) {
      return;
    }
    urlsByReference.set(
      reference,
      resolvePlaceableAssetDeliveryUrl(normalizedTextureUrl, deliveryOrigin)
    );
  });

  return urlsByReference;
}
