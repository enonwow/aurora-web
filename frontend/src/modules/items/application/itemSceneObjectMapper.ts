import type {
  SceneObject,
  SceneObjectItemArmorPartModelCandidate,
  SceneObjectItemArmorPreviewContext,
  SceneObjectItemArmorParts,
  SceneObjectItemMaterialColors,
  SceneObjectItemModelAssetCandidate,
  SceneObjectItemModelPartCandidate,
  SceneObjectItemPropertyEntry,
  SceneObjectItemVariableTargetEntry
} from "../../scene/contracts";
import { createNewSceneObject } from "../../scene/domain/sceneFactory";
import { readDynamicAreaItemConstructionDefaults } from
  "../../scene/domain/areaItemDynamicConstructionProfile";
import { readItemVariableTargetEntries } from "../../scene/domain/itemVariableTable";
import { readItemBlueprintReferenceLists } from
  "../../scene/domain/itemBlueprintInventory";
import type {
  ItemApiBaseItemEntry,
  ItemApiAssetManifestAsset,
  ItemApiListItem,
  ItemApiMetadataPrimitive,
  ItemApiProcessResult
} from "../contracts";

const ITEM_TEMPLATE_X = 0.5;
const ITEM_TEMPLATE_Y = 0.5;

type ItemMetadata = Record<string, ItemApiMetadataPrimitive>;

const UNKNOWN_STORE_PANEL_ORDER = Number.MAX_SAFE_INTEGER;
const ITEM_ARMOR_PREVIEW_MODEL_PREFIX_PATTERN = /^p[fm][a-z][0-9]_$/u;

function sanitizeIdentifier(value: string, fallback: string): string {
  const normalized = value
    .trim()
    .replace(/[^a-zA-Z0-9_]+/gu, "_")
    .replace(/^_+|_+$/gu, "");
  return normalized.length > 0 ? normalized : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(metadata: ItemMetadata | undefined, key: string): string | undefined {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function readNumber(metadata: ItemMetadata | undefined, key: string): number | undefined {
  const value = metadata?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readBoolean(metadata: ItemMetadata | undefined, key: string): boolean | undefined {
  const value = metadata?.[key];
  return typeof value === "boolean" ? value : undefined;
}

function readRecordNumber(entry: Record<string, unknown>, key: string): number | undefined {
  const value = entry[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readRecordString(entry: Record<string, unknown>, key: string): string | undefined {
  const value = entry[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function normalizeItemArmorPreviewModelPrefix(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  return ITEM_ARMOR_PREVIEW_MODEL_PREFIX_PATTERN.test(normalized) ? normalized : undefined;
}

function readJsonArray(metadata: ItemMetadata | undefined, key: string): unknown[] {
  const value = metadata?.[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapItemPropertyEntries(
  metadata: ItemMetadata | undefined
): SceneObjectItemPropertyEntry[] {
  return readJsonArray(metadata, "itemPropertyListEntries")
    .filter(isRecord)
    .map((entry) => ({
      propertyName: readRecordNumber(entry, "propertyName"),
      propertyLabel: readRecordString(entry, "propertyLabel"),
      subtype: readRecordNumber(entry, "subtype"),
      costTable: readRecordNumber(entry, "costTable"),
      costValue: readRecordNumber(entry, "costValue"),
      param1: readRecordNumber(entry, "param1"),
      param1Value: readRecordNumber(entry, "param1Value"),
      chanceAppear: readRecordNumber(entry, "chanceAppear"),
      propertyDefinitionSource2daRow: readRecordNumber(entry, "propertyDefinitionSource2daRow"),
      propertyDefinitionSourceKey: readRecordString(entry, "propertyDefinitionSourceKey"),
      subTypeTable: readRecordString(entry, "subTypeTable"),
      costTableDefinition: readRecordString(entry, "costTableDefinition"),
      param1Table: readRecordString(entry, "param1Table"),
      nameStrRef: readRecordNumber(entry, "nameStrRef"),
      gameStrRef: readRecordNumber(entry, "gameStrRef"),
      descriptionStrRef: readRecordNumber(entry, "descriptionStrRef")
    }))
    .filter((entry) => Object.values(entry).some((value) => value !== undefined));
}

function mapItemVariableEntries(
  metadata: ItemMetadata | undefined
): SceneObjectItemVariableTargetEntry[] {
  const entries = readItemVariableTargetEntries(readJsonArray(metadata, "variableListEntries"));
  return entries ? entries.map((entry) => ({ ...entry })) : [];
}

function mapScriptSlots(metadata: ItemMetadata | undefined): Record<string, string> | undefined {
  if (!metadata) {
    return undefined;
  }
  const scripts = Object.entries(metadata).reduce<Record<string, string>>(
    (accumulator, [key, value]) => {
      if (!key.startsWith("script.") || typeof value !== "string" || value.trim().length === 0) {
        return accumulator;
      }
      accumulator[key.slice("script.".length)] = value;
      return accumulator;
    },
    {}
  );
  return Object.keys(scripts).length > 0 ? scripts : undefined;
}

function compactNumberArray(values: Array<number | undefined>): number[] {
  return values.filter((value): value is number => typeof value === "number");
}

function compactStringArray(values: Array<string | undefined>): string[] {
  return values.filter((value): value is string => typeof value === "string" && value.length > 0);
}

function deduplicateStrings(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const normalized = value.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    : [];
}

function readDelimitedStringArray(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  const seen = new Set<string>();
  return value
    .split(/[|,;\n\r\t ]+/u)
    .map((entry) => entry.trim())
    .filter((entry) => {
      if (!entry || seen.has(entry)) {
        return false;
      }
      seen.add(entry);
      return true;
    });
}

function readNumberArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is number => typeof entry === "number" && Number.isFinite(entry))
    : [];
}

function readRuntimeVisual(processResult: ItemApiProcessResult): Record<string, unknown> | null {
  const runtime = processResult.item.itemRuntime;
  if (!isRecord(runtime)) {
    return null;
  }
  const visual = runtime.visual;
  return isRecord(visual) ? visual : null;
}

function readRuntimePricing(processResult: ItemApiProcessResult): Record<string, unknown> | null {
  const runtime = processResult.item.itemRuntime;
  if (!isRecord(runtime)) {
    return null;
  }
  const pricing = runtime.pricing;
  return isRecord(pricing) ? pricing : null;
}

function readRuntimeString(visual: Record<string, unknown> | null, key: string): string | undefined {
  const value = visual?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function readRuntimeNumber(visual: Record<string, unknown> | null, key: string): number | undefined {
  const value = visual?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function extractAssetBasename(value: string): string {
  const fileName = value.replace(/\\/gu, "/").split("/").pop() ?? value;
  const withoutQuery = fileName.split(/[?#]/u, 1)[0] ?? fileName;
  const extensionIndex = withoutQuery.lastIndexOf(".");
  return (extensionIndex >= 0 ? withoutQuery.slice(0, extensionIndex) : withoutQuery)
    .trim()
    .toLowerCase();
}

function resolveItemModelAssetMap(
  assets: ItemApiAssetManifestAsset[] | undefined
): Map<string, ItemApiAssetManifestAsset> {
  const byBasename = new Map<string, ItemApiAssetManifestAsset>();
  (assets ?? [])
    .filter((asset) => {
      const extension = asset.extension.trim().toLowerCase();
      return asset.role === "model" && (extension === "glb" || extension === "gltf");
    })
    .forEach((asset) => {
      const basename = extractAssetBasename(asset.fileName);
      if (!basename || byBasename.has(basename)) {
        return;
      }
      byBasename.set(basename, asset);
    });
  return byBasename;
}

function buildItemModelAssetDeliveryUrl(
  cacheKey: string,
  asset: ItemApiAssetManifestAsset
): string {
  const extension =
    asset.extension.trim().length > 0
      ? asset.extension.trim().toLowerCase()
      : asset.fileName.split(".").pop()?.trim().toLowerCase() ?? "";
  const assetIdWithExtension = extension ? `${asset.assetId}.${extension}` : asset.assetId;
  return `/api/v1/catalog/placeables/cache/${encodeURIComponent(cacheKey)}/assets/${encodeURIComponent(assetIdWithExtension)}`;
}

function buildItemArmorPartFallbackModelResRef(candidate: Record<string, unknown>): string | null {
  const modelPrefix =
    typeof candidate.modelPrefix === "string" ? candidate.modelPrefix.trim().toLowerCase() : "";
  const partModelName =
    typeof candidate.partModelName === "string"
      ? candidate.partModelName.trim().toLowerCase()
      : "";
  const partId =
    typeof candidate.partId === "number" && Number.isFinite(candidate.partId)
      ? candidate.partId
      : undefined;
  if (
    !normalizeItemArmorPreviewModelPrefix(modelPrefix) ||
    !partModelName ||
    partId === undefined ||
    partId <= 1
  ) {
    return null;
  }
  return `${modelPrefix}${partModelName}001`;
}

function mapProcessedItemModelPartCandidates(
  processResult: ItemApiProcessResult
): SceneObjectItemModelPartCandidate[] {
  const visual = readRuntimeVisual(processResult);
  const metadata = processResult.item.metadata;
  const modelPartResRefs = readStringArray(visual?.modelPartResRefs);
  const resRefs =
    modelPartResRefs.length > 0
      ? modelPartResRefs
      : compactStringArray([
          readString(metadata, "modelPartResRef1"),
          readString(metadata, "modelPartResRef2"),
          readString(metadata, "modelPartResRef3")
        ]);
  const roles = readStringArray(visual?.modelPartResRefRoles);
  const partIds =
    readNumberArray(visual?.modelParts).length > 0
      ? readNumberArray(visual?.modelParts)
      : compactNumberArray([
          readNumber(metadata, "modelPart1"),
          readNumber(metadata, "modelPart2"),
          readNumber(metadata, "modelPart3")
        ]);
  const assetsByBasename = resolveItemModelAssetMap(processResult.item.assetManifest?.assets);

  return resRefs.map((resRef, index) => {
    const fallbackResRefs = buildItemModelPartSiblingFallbackResRefs({
      resRefs,
      roles,
      partIds,
      index
    });
    const fallbackResRefWithAsset = fallbackResRefs.find((fallbackResRef) =>
      assetsByBasename.has(fallbackResRef)
    );
    const resolvedResRef = fallbackResRefWithAsset ?? resRef;
    const asset =
      assetsByBasename.get(resRef.trim().toLowerCase()) ??
      (fallbackResRefWithAsset ? assetsByBasename.get(fallbackResRefWithAsset) : undefined);
    const extension = asset?.extension.trim().toLowerCase();
    const deliveryUrl = asset ? buildItemModelAssetDeliveryUrl(processResult.cache.key, asset) : undefined;
    return {
      resRef: resolvedResRef,
      ...(roles[index] ? { role: roles[index] } : {}),
      ...(partIds[index] !== undefined ? { partId: partIds[index] } : {}),
      ...(asset?.assetId ? { assetId: asset.assetId } : {}),
      ...(deliveryUrl && extension === "glb" ? { glbUrl: deliveryUrl } : {}),
      ...(deliveryUrl && extension === "gltf" ? { modelUrl: deliveryUrl } : {})
    };
  });
}

function mapProcessedItemArmorPartModelCandidates(
  processResult: ItemApiProcessResult
): SceneObjectItemArmorPartModelCandidate[] {
  const visual = readRuntimeVisual(processResult);
  const rawCandidates = Array.isArray(visual?.armorPartModelCandidates)
    ? visual.armorPartModelCandidates.filter(isRecord)
    : [];
  if (rawCandidates.length === 0) {
    return [];
  }
  const assetsByBasename = resolveItemModelAssetMap(processResult.item.assetManifest?.assets);

  return rawCandidates
    .map((candidate): SceneObjectItemArmorPartModelCandidate | null => {
      const slot =
        typeof candidate.slot === "string" && candidate.slot.trim().length > 0
          ? candidate.slot
          : undefined;
      const partId =
        typeof candidate.partId === "number" && Number.isFinite(candidate.partId)
          ? candidate.partId
          : undefined;
      const modelResRef =
        typeof candidate.modelResRef === "string" &&
        candidate.modelResRef.trim().length > 0
          ? candidate.modelResRef
          : undefined;
      if (!slot || partId === undefined || !modelResRef) {
        return null;
      }
      const fallbackModelResRef = buildItemArmorPartFallbackModelResRef(candidate);
      const asset =
        assetsByBasename.get(modelResRef.trim().toLowerCase()) ??
        (fallbackModelResRef ? assetsByBasename.get(fallbackModelResRef) : undefined);
      const resolvedModelResRef =
        asset && fallbackModelResRef && extractAssetBasename(asset.fileName) === fallbackModelResRef
          ? fallbackModelResRef
          : modelResRef;
      const extension = asset?.extension.trim().toLowerCase();
      const deliveryUrl = asset
        ? buildItemModelAssetDeliveryUrl(processResult.cache.key, asset)
        : undefined;
      return {
        slot,
        partId,
        modelResRef: resolvedModelResRef,
        ...(typeof candidate.partModelName === "string" &&
        candidate.partModelName.trim().length > 0
          ? { partModelName: candidate.partModelName }
          : {}),
        ...(typeof candidate.nodeName === "string" && candidate.nodeName.trim().length > 0
          ? { nodeName: candidate.nodeName }
          : {}),
        ...(typeof candidate.modelPrefix === "string" &&
        candidate.modelPrefix.trim().length > 0
          ? { modelPrefix: candidate.modelPrefix }
          : {}),
        ...(asset?.assetId ? { assetId: asset.assetId } : {}),
        ...(deliveryUrl && extension === "glb" ? { glbUrl: deliveryUrl } : {}),
        ...(deliveryUrl && extension === "gltf" ? { modelUrl: deliveryUrl } : {})
      };
    })
    .filter((entry): entry is SceneObjectItemArmorPartModelCandidate => Boolean(entry));
}

function mapProcessedItemModelAssetCandidates(
  processResult: ItemApiProcessResult
): SceneObjectItemModelAssetCandidate[] {
  return (processResult.item.assetManifest?.assets ?? [])
    .map((asset): SceneObjectItemModelAssetCandidate | null => {
      const reference = extractAssetBasename(asset.fileName || asset.objectKey);
      if (!reference || !asset.assetId) {
        return null;
      }
      return {
        assetId: asset.assetId,
        role: asset.role,
        fileName: asset.fileName,
        objectKey: asset.objectKey,
        extension: asset.extension.trim().toLowerCase(),
        reference,
        assetUrl: buildItemModelAssetDeliveryUrl(processResult.cache.key, asset),
        sizeBytes: asset.sizeBytes
      };
    })
    .filter((entry): entry is SceneObjectItemModelAssetCandidate => Boolean(entry));
}

function mapMetadataItemModelAssetCandidates(
  metadata: ItemMetadata | undefined
): SceneObjectItemModelAssetCandidate[] {
  return readJsonArray(metadata, "modelAssetCandidates")
    .filter(isRecord)
    .map((entry): SceneObjectItemModelAssetCandidate | null => {
      const assetId = readRecordString(entry, "assetId");
      const role = readRecordString(entry, "role");
      const fileName = readRecordString(entry, "fileName");
      const objectKey = readRecordString(entry, "objectKey");
      const extension = readRecordString(entry, "extension")?.trim().toLowerCase();
      const reference = readRecordString(entry, "reference");
      const assetUrl = readRecordString(entry, "assetUrl");
      if (!assetId || !role || !fileName || !objectKey || !extension || !reference || !assetUrl) {
        return null;
      }
      return {
        assetId,
        role,
        fileName,
        objectKey,
        extension,
        reference,
        assetUrl,
        ...(readRecordNumber(entry, "sizeBytes") !== undefined
          ? { sizeBytes: readRecordNumber(entry, "sizeBytes") }
          : {})
      };
    })
    .filter((entry): entry is SceneObjectItemModelAssetCandidate => Boolean(entry));
}

function buildItemModelPartSiblingFallbackResRefs(input: {
  resRefs: string[];
  roles: string[];
  partIds: number[];
  index: number;
}): string[] {
  const { resRefs, roles, partIds, index } = input;
  if (resRefs.length <= 1 || partIds.length <= 1) {
    return [];
  }
  const normalized = resRefs[index]?.trim().toLowerCase() ?? "";
  const role = roles[index]?.trim().toLowerCase();
  const originalPartId = partIds[index];
  const separatorIndex = normalized.lastIndexOf("_");
  if (
    !normalized ||
    !role ||
    !["blade", "middle", "top"].includes(role) ||
    !Number.isInteger(originalPartId) ||
    separatorIndex <= 0
  ) {
    return [];
  }
  const prefix = normalized.slice(0, separatorIndex + 1);
  const suffix = normalized.slice(separatorIndex + 1);
  if (!/^\d{3}$/u.test(suffix)) {
    return [];
  }
  return deduplicateStrings(
    partIds
      .filter((partId, siblingIndex) => {
        return (
          siblingIndex !== index &&
          Number.isInteger(partId) &&
          partId > 0 &&
          partId !== originalPartId
        );
      })
      .map((partId) => `${prefix}${Math.trunc(partId).toString().padStart(3, "0")}`)
  );
}

function buildArmorParts(metadata: ItemMetadata | undefined): SceneObjectItemArmorParts | undefined {
  const armorParts: SceneObjectItemArmorParts = {
    rFoot: readNumber(metadata, "bodyPartRFoot"),
    lFoot: readNumber(metadata, "bodyPartLFoot"),
    rShin: readNumber(metadata, "bodyPartRShin"),
    lShin: readNumber(metadata, "bodyPartLShin"),
    lThigh: readNumber(metadata, "bodyPartLThigh"),
    rThigh: readNumber(metadata, "bodyPartRThigh"),
    pelvis: readNumber(metadata, "bodyPartPelvis"),
    torso: readNumber(metadata, "bodyPartTorso"),
    belt: readNumber(metadata, "bodyPartBelt"),
    neck: readNumber(metadata, "bodyPartNeck"),
    rFArm: readNumber(metadata, "bodyPartRFArm"),
    lFArm: readNumber(metadata, "bodyPartLFArm"),
    rBicep: readNumber(metadata, "bodyPartRBicep"),
    lBicep: readNumber(metadata, "bodyPartLBicep"),
    rShoul: readNumber(metadata, "bodyPartRShoul"),
    lShoul: readNumber(metadata, "bodyPartLShoul"),
    rHand: readNumber(metadata, "bodyPartRHand"),
    lHand: readNumber(metadata, "bodyPartLHand"),
    robe: readNumber(metadata, "bodyPartRobe")
  };
  return Object.values(armorParts).some((value) => value !== undefined) ? armorParts : undefined;
}

function buildArmorPartCostModifiers(
  metadata: ItemMetadata | undefined
): SceneObjectItemArmorParts | undefined {
  const costModifiers: SceneObjectItemArmorParts = {
    rFoot: readNumber(metadata, "armorPartCostModifierRFoot"),
    lFoot: readNumber(metadata, "armorPartCostModifierLFoot"),
    rShin: readNumber(metadata, "armorPartCostModifierRShin"),
    lShin: readNumber(metadata, "armorPartCostModifierLShin"),
    lThigh: readNumber(metadata, "armorPartCostModifierLThigh"),
    rThigh: readNumber(metadata, "armorPartCostModifierRThigh"),
    pelvis: readNumber(metadata, "armorPartCostModifierPelvis"),
    torso: readNumber(metadata, "armorPartCostModifierTorso"),
    belt: readNumber(metadata, "armorPartCostModifierBelt"),
    neck: readNumber(metadata, "armorPartCostModifierNeck"),
    rFArm: readNumber(metadata, "armorPartCostModifierRFArm"),
    lFArm: readNumber(metadata, "armorPartCostModifierLFArm"),
    rBicep: readNumber(metadata, "armorPartCostModifierRBicep"),
    lBicep: readNumber(metadata, "armorPartCostModifierLBicep"),
    rShoul: readNumber(metadata, "armorPartCostModifierRShoul"),
    lShoul: readNumber(metadata, "armorPartCostModifierLShoul"),
    rHand: readNumber(metadata, "armorPartCostModifierRHand"),
    lHand: readNumber(metadata, "armorPartCostModifierLHand"),
    robe: readNumber(metadata, "armorPartCostModifierRobe")
  };
  return Object.values(costModifiers).some((value) => value !== undefined)
    ? costModifiers
    : undefined;
}

function readRuntimeArmorParts(
  visual: Record<string, unknown> | null
): SceneObjectItemArmorParts | undefined {
  const rawArmorParts = visual?.armorParts;
  if (!isRecord(rawArmorParts)) {
    return undefined;
  }
  const armorParts: SceneObjectItemArmorParts = {
    rFoot: readRecordNumber(rawArmorParts, "rFoot"),
    lFoot: readRecordNumber(rawArmorParts, "lFoot"),
    rShin: readRecordNumber(rawArmorParts, "rShin"),
    lShin: readRecordNumber(rawArmorParts, "lShin"),
    lThigh: readRecordNumber(rawArmorParts, "lThigh"),
    rThigh: readRecordNumber(rawArmorParts, "rThigh"),
    pelvis: readRecordNumber(rawArmorParts, "pelvis"),
    torso: readRecordNumber(rawArmorParts, "torso"),
    belt: readRecordNumber(rawArmorParts, "belt"),
    neck: readRecordNumber(rawArmorParts, "neck"),
    rFArm: readRecordNumber(rawArmorParts, "rFArm"),
    lFArm: readRecordNumber(rawArmorParts, "lFArm"),
    rBicep: readRecordNumber(rawArmorParts, "rBicep"),
    lBicep: readRecordNumber(rawArmorParts, "lBicep"),
    rShoul: readRecordNumber(rawArmorParts, "rShoul"),
    lShoul: readRecordNumber(rawArmorParts, "lShoul"),
    rHand: readRecordNumber(rawArmorParts, "rHand"),
    lHand: readRecordNumber(rawArmorParts, "lHand"),
    robe: readRecordNumber(rawArmorParts, "robe")
  };
  return Object.values(armorParts).some((value) => value !== undefined) ? armorParts : undefined;
}

function readRuntimeArmorPartCostModifiers(
  pricing: Record<string, unknown> | null
): SceneObjectItemArmorParts | undefined {
  const rawCostModifiers = pricing?.armorPartCostModifiers;
  if (!isRecord(rawCostModifiers)) {
    return undefined;
  }
  const costModifiers: SceneObjectItemArmorParts = {
    rFoot: readRecordNumber(rawCostModifiers, "rFoot"),
    lFoot: readRecordNumber(rawCostModifiers, "lFoot"),
    rShin: readRecordNumber(rawCostModifiers, "rShin"),
    lShin: readRecordNumber(rawCostModifiers, "lShin"),
    lThigh: readRecordNumber(rawCostModifiers, "lThigh"),
    rThigh: readRecordNumber(rawCostModifiers, "rThigh"),
    pelvis: readRecordNumber(rawCostModifiers, "pelvis"),
    torso: readRecordNumber(rawCostModifiers, "torso"),
    belt: readRecordNumber(rawCostModifiers, "belt"),
    neck: readRecordNumber(rawCostModifiers, "neck"),
    rFArm: readRecordNumber(rawCostModifiers, "rFArm"),
    lFArm: readRecordNumber(rawCostModifiers, "lFArm"),
    rBicep: readRecordNumber(rawCostModifiers, "rBicep"),
    lBicep: readRecordNumber(rawCostModifiers, "lBicep"),
    rShoul: readRecordNumber(rawCostModifiers, "rShoul"),
    lShoul: readRecordNumber(rawCostModifiers, "lShoul"),
    rHand: readRecordNumber(rawCostModifiers, "rHand"),
    lHand: readRecordNumber(rawCostModifiers, "lHand"),
    robe: readRecordNumber(rawCostModifiers, "robe")
  };
  return Object.values(costModifiers).some((value) => value !== undefined)
    ? costModifiers
    : undefined;
}

function readRuntimeMaterialColors(
  visual: Record<string, unknown> | null
): SceneObjectItemMaterialColors | undefined {
  const rawMaterialColors = visual?.materialColors;
  if (!isRecord(rawMaterialColors)) {
    return undefined;
  }
  const materialColors: SceneObjectItemMaterialColors = {
    leather1: readRecordNumber(rawMaterialColors, "leather1"),
    leather2: readRecordNumber(rawMaterialColors, "leather2"),
    cloth1: readRecordNumber(rawMaterialColors, "cloth1"),
    cloth2: readRecordNumber(rawMaterialColors, "cloth2"),
    metal1: readRecordNumber(rawMaterialColors, "metal1"),
    metal2: readRecordNumber(rawMaterialColors, "metal2")
  };
  return Object.values(materialColors).some((value) => value !== undefined)
    ? materialColors
    : undefined;
}

function readRuntimeArmorPreviewContext(
  visual: Record<string, unknown> | null
): SceneObjectItemArmorPreviewContext | undefined {
  const rawContext = visual?.armorPreviewContext;
  if (!isRecord(rawContext)) {
    return undefined;
  }
  const modelPrefix = normalizeItemArmorPreviewModelPrefix(
    readRecordString(rawContext, "modelPrefix")
  );
  if (!modelPrefix) {
    return undefined;
  }
  return {
    modelPrefix,
    sourceKey: readRecordString(rawContext, "sourceKey"),
    label: readRecordString(rawContext, "label"),
    gender: readRecordNumber(rawContext, "gender"),
    phenotype: readRecordNumber(rawContext, "phenotype"),
    raceModel: readRecordString(rawContext, "raceModel")
  };
}

function buildArmorPreviewContext(
  metadata: ItemMetadata | undefined
): SceneObjectItemArmorPreviewContext | undefined {
  const modelPrefix = normalizeItemArmorPreviewModelPrefix(
    readString(metadata, "itemArmorPreviewModelPrefix")
  );
  if (!modelPrefix) {
    return undefined;
  }
  return {
    modelPrefix,
    label: readString(metadata, "itemArmorPreviewContextLabel"),
    gender: readNumber(metadata, "itemArmorPreviewGender"),
    phenotype: readNumber(metadata, "itemArmorPreviewPhenotype"),
    raceModel: readString(metadata, "itemArmorPreviewRaceModel")
  };
}

function buildMaterialColors(
  metadata: ItemMetadata | undefined
): SceneObjectItemMaterialColors | undefined {
  const materialColors: SceneObjectItemMaterialColors = {
    leather1: readNumber(metadata, "leather1Color"),
    leather2: readNumber(metadata, "leather2Color"),
    cloth1: readNumber(metadata, "cloth1Color"),
    cloth2: readNumber(metadata, "cloth2Color"),
    metal1: readNumber(metadata, "metal1Color"),
    metal2: readNumber(metadata, "metal2Color")
  };
  return Object.values(materialColors).some((value) => value !== undefined)
    ? materialColors
    : undefined;
}

export function mapItemApiListItemToSceneObject(
  item: ItemApiListItem,
  sequence = 1
): SceneObject {
  const metadata = item.metadata;
  const constructionDefaults = readDynamicAreaItemConstructionDefaults(item);
  const object = createNewSceneObject("items", ITEM_TEMPLATE_X, ITEM_TEMPLATE_Y, sequence);
  const normalizedTemplateId = sanitizeIdentifier(item.templateId, `item_${sequence}`);
  const templateResRef = constructionDefaults?.resRef ??
    readString(metadata, "templateResRef") ?? item.resref;
  const localizedName = readString(metadata, "localizedName") ?? readString(metadata, "displayName");
  const tag = constructionDefaults?.tag ?? readString(metadata, "tag") ?? item.resref;
  const modelParts = compactNumberArray([
    readNumber(metadata, "modelPart1"),
    readNumber(metadata, "modelPart2"),
    readNumber(metadata, "modelPart3")
  ]);
  const modelPartResRefs = compactStringArray([
    readString(metadata, "modelPartResRef1"),
    readString(metadata, "modelPartResRef2"),
    readString(metadata, "modelPartResRef3")
  ]);
  const modelPartResRefRoles = compactStringArray([
    readString(metadata, "modelPartResRefRole1"),
    readString(metadata, "modelPartResRefRole2"),
    readString(metadata, "modelPartResRefRole3")
  ]);
  const propertyList = mapItemPropertyEntries(metadata);
  const variables = mapItemVariableEntries(metadata);
  const blueprintReferenceLists = readItemBlueprintReferenceLists(
    readJsonArray(metadata, "inventoryItemListEntries"),
    readJsonArray(metadata, "equipItemListEntries"),
    templateResRef,
  );
  const armorParts = buildArmorParts(metadata);
  const armorPartCostModifiers = buildArmorPartCostModifiers(metadata);
  const cloakHiddenSlots = readDelimitedStringArray(readString(metadata, "cloakHiddenSlots"));
  const armorRobeHiddenSlots = readDelimitedStringArray(
    readString(metadata, "armorRobeHiddenSlots")
  );
  const armorPreviewContext = buildArmorPreviewContext(metadata);
  const materialColors = buildMaterialColors(metadata);
  const scripts = mapScriptSlots(metadata);
  const modelAssetCandidates = mapMetadataItemModelAssetCandidates(metadata);

  return {
    ...object,
    id: `itm_template_${normalizedTemplateId}`,
    name: localizedName ?? item.name,
    resRef: templateResRef,
    tag: constructionDefaults ? tag : tag.toUpperCase(),
    previewImageUrl: item.previewImageUrl.trim() || undefined,
    isStatic: false,
    source: constructionDefaults?.source ?? {
      type: "aurora_git",
      sourceObjectId: item.templateId,
      sourceKind: "item",
      templateId: item.templateId,
      sourceEtag: readString(metadata, "sourceEtag"),
      sourceFileType: readString(metadata, "sourceFileType"),
      sourceFileVersion: readString(metadata, "sourceFileVersion"),
      sourceStructTypeId: readNumber(metadata, "sourceStructTypeId"),
      localizedName,
      description: readString(metadata, "description")
    },
    itemProperties: {
      localizedName,
      localizedNameStrRef: readNumber(metadata, "localizedNameStrRef"),
      description: readString(metadata, "description"),
      descriptionStrRef: readNumber(metadata, "descriptionStrRef"),
      identifiedDescription: readString(metadata, "identifiedDescription"),
      identifiedDescriptionStrRef: readNumber(metadata, "identifiedDescriptionStrRef"),
      comments: readString(metadata, "comments"),
      paletteId: readNumber(metadata, "paletteId"),
      baseItem: readNumber(metadata, "baseItem"),
      baseItemLabel: readString(metadata, "baseItem2daLabel"),
      baseItemSourceKey: readString(metadata, "baseItem2daSourceKey"),
      baseItemItemClass: readString(metadata, "baseItem2daItemClass"),
      baseItemModelType: readString(metadata, "baseItemModelType"),
      baseItemDefaultModel: readString(metadata, "baseItemDefaultModel"),
      baseItemDefaultIcon: readString(metadata, "baseItemDefaultIcon"),
      baseItemInvSlotWidth: readNumber(metadata, "baseItemInvSlotWidth"),
      baseItemInvSlotHeight: readNumber(metadata, "baseItemInvSlotHeight"),
      baseItemCanRotateIcon: readNumber(metadata, "baseItemCanRotateIcon"),
      baseItemEquipableSlots: readString(metadata, "baseItemEquipableSlots"),
      baseItemBaseCost: readNumber(metadata, "baseItemBaseCost"),
      baseItemStacking: readNumber(metadata, "baseItemStacking"),
      baseItemItemMultiplier: readNumber(metadata, "baseItemItemMultiplier"),
      baseItemMaxProps: readNumber(metadata, "baseItemMaxProps"),
      baseItemMinProps: readNumber(metadata, "baseItemMinProps"),
      baseItemPropColumn: readString(metadata, "baseItemPropColumn"),
      baseItemStorePanel: readNumber(metadata, "baseItemStorePanel"),
      baseItemStorePanelSort: readNumber(metadata, "baseItemStorePanelSort"),
      baseItemChargesStarting: readNumber(metadata, "baseItemChargesStarting"),
      baseItemIlrStackSize: readNumber(metadata, "baseItemIlrStackSize"),
      baseItemWeaponMatType: readNumber(metadata, "baseItemWeaponMatType"),
      baseItemAmmunitionType: readNumber(metadata, "baseItemAmmunitionType"),
      baseItemArcaneSpellFailure: readNumber(metadata, "baseItemArcaneSpellFailure"),
      modelPart1: readNumber(metadata, "modelPart1"),
      modelPart2: readNumber(metadata, "modelPart2"),
      modelPart3: readNumber(metadata, "modelPart3"),
      ...(modelParts.length > 0 ? { modelParts } : {}),
      ...(modelPartResRefs.length > 0 ? { modelPartResRefs } : {}),
      ...(modelPartResRefRoles.length > 0 ? { modelPartResRefRoles } : {}),
      cloakModelRow: readNumber(metadata, "cloakModelRow"),
      cloakModel: readNumber(metadata, "cloakModel"),
      cloakTexture: readNumber(metadata, "cloakTexture"),
      cloakIcon: readNumber(metadata, "cloakIcon"),
      cloakModelResRef: readString(metadata, "cloakModelResRef"),
      cloakTextureResRef: readString(metadata, "cloakTextureResRef"),
      cloakIconResRef: readString(metadata, "cloakIconResRef"),
      cloakSourceKey: readString(metadata, "cloakSourceKey"),
      ...(armorPreviewContext ? { armorPreviewContext } : {}),
      ...(cloakHiddenSlots.length > 0 ? { cloakHiddenSlots } : {}),
      ...(armorRobeHiddenSlots.length > 0 ? { armorRobeHiddenSlots } : {}),
      ...(armorPartCostModifiers ? { armorPartCostModifiers } : {}),
      armorPartCostModifierTotal: readNumber(metadata, "armorPartCostModifierTotal"),
      armorPartCostModifierResolvedCount: readNumber(
        metadata,
        "armorPartCostModifierResolvedCount"
      ),
      armorPartCostModifierUnresolvedCount: readNumber(
        metadata,
        "armorPartCostModifierUnresolvedCount"
      ),
      cost: readNumber(metadata, "cost"),
      addCost: readNumber(metadata, "addCost"),
      costTable: readNumber(metadata, "costTable"),
      costValue: readNumber(metadata, "costValue"),
      charges: readNumber(metadata, "charges"),
      stackSize: readNumber(metadata, "stackSize"),
      identified: readBoolean(metadata, "identified"),
      stolen: readBoolean(metadata, "stolen"),
      plot: readBoolean(metadata, "plot"),
      cursed: readBoolean(metadata, "cursed"),
      ...(armorParts ? { armorParts } : {}),
      ...(materialColors ? { materialColors } : {}),
      ...(propertyList.length > 0 ? { propertyList } : {}),
      ...(variables.length > 0 ? { variables } : {}),
      ...(blueprintReferenceLists && blueprintReferenceLists.inventory.length > 0
        ? { blueprintInventoryItems: blueprintReferenceLists.inventory }
        : {}),
      ...(blueprintReferenceLists && blueprintReferenceLists.equipment.length > 0
        ? { blueprintEquippedItems: blueprintReferenceLists.equipment }
        : {}),
      ...(modelAssetCandidates.length > 0 ? { modelAssetCandidates } : {}),
      ...(scripts ? { scripts } : {})
    }
  };
}

export function mapItemApiBaseItemToSceneObject(
  baseItem: ItemApiBaseItemEntry,
  sequence = 1
): SceneObject {
  const object = createNewSceneObject("items", ITEM_TEMPLATE_X, ITEM_TEMPLATE_Y, sequence);
  const baseLabel = baseItem.label ?? `Base ${baseItem.baseItem}`;
  const normalizedLabel = sanitizeIdentifier(baseLabel, `baseitem_${baseItem.baseItem}`).slice(
    0,
    16
  );
  const templateId = `baseitem_${baseItem.baseItem}`;

  return {
    ...object,
    id: `itm_baseitem_${baseItem.baseItem}`,
    name: baseLabel,
    resRef: normalizedLabel,
    tag: `BASEITEM_${baseItem.baseItem}`,
    isStatic: false,
    source: {
      type: "aurora_git",
      sourceObjectId: `baseitems.2da:${baseItem.baseItem}`,
      sourceKind: "item",
      templateId,
      sourceFileType: "2DA",
      sourceFileVersion: "V2.0",
      localizedName: baseLabel,
      description: `baseitems.2da row ${baseItem.baseItem}`
    },
    itemProperties: {
      localizedName: baseLabel,
      baseItem: baseItem.baseItem,
      baseItemLabel: baseLabel,
      baseItemSourceKey: baseItem.sourceKey,
      baseItemItemClass: baseItem.itemClass,
      baseItemModelType: baseItem.modelType,
      baseItemDefaultModel: baseItem.defaultModel,
      baseItemDefaultIcon: baseItem.defaultIcon,
      baseItemInvSlotWidth: baseItem.invSlotWidth,
      baseItemInvSlotHeight: baseItem.invSlotHeight,
      baseItemCanRotateIcon: baseItem.canRotateIcon,
      baseItemEquipableSlots: baseItem.equipableSlots,
      baseItemBaseCost: baseItem.baseCost,
      baseItemStacking: baseItem.stacking,
      baseItemItemMultiplier: baseItem.itemMultiplier,
      baseItemMaxProps: baseItem.maxProps,
      baseItemMinProps: baseItem.minProps,
      baseItemPropColumn: baseItem.propColumn,
      baseItemStorePanel: baseItem.storePanel,
      baseItemStorePanelSort: baseItem.storePanelSort,
      baseItemChargesStarting: baseItem.chargesStarting,
      baseItemIlrStackSize: baseItem.ilrStackSize,
      baseItemWeaponMatType: baseItem.weaponMatType,
      baseItemAmmunitionType: baseItem.ammunitionType,
      baseItemArcaneSpellFailure: baseItem.arcaneSpellFailure,
      baseItemReqFeats: baseItem.reqFeats ? [...baseItem.reqFeats] : undefined
    }
  };
}

export function compareItemSceneObjectsByAuroraStorePanel(
  left: SceneObject,
  right: SceneObject
): number {
  const leftPanel = left.itemProperties?.baseItemStorePanel ?? UNKNOWN_STORE_PANEL_ORDER;
  const rightPanel = right.itemProperties?.baseItemStorePanel ?? UNKNOWN_STORE_PANEL_ORDER;
  if (leftPanel !== rightPanel) {
    return leftPanel - rightPanel;
  }

  const leftSort = left.itemProperties?.baseItemStorePanelSort ?? UNKNOWN_STORE_PANEL_ORDER;
  const rightSort = right.itemProperties?.baseItemStorePanelSort ?? UNKNOWN_STORE_PANEL_ORDER;
  if (leftSort !== rightSort) {
    return leftSort - rightSort;
  }

  const nameDelta = (left.name ?? "").localeCompare(right.name ?? "", undefined, {
    sensitivity: "base",
    numeric: true
  });
  if (nameDelta !== 0) {
    return nameDelta;
  }
  return (left.resRef ?? "").localeCompare(right.resRef ?? "", undefined, {
    sensitivity: "base",
    numeric: true
  });
}

export function applyItemApiProcessResultToSceneObject(
  object: SceneObject,
  processResult: ItemApiProcessResult
): SceneObject {
  const visual = readRuntimeVisual(processResult);
  const pricing = readRuntimePricing(processResult);
  const metadata = processResult.item.metadata;
  const runtimeResRefs = readStringArray(visual?.modelPartResRefs);
  const runtimeRoles = readStringArray(visual?.modelPartResRefRoles);
  const runtimeParts = readNumberArray(visual?.modelParts);
  const runtimeCloakHiddenSlots = readStringArray(visual?.cloakHiddenSlots);
  const runtimeArmorRobeHiddenSlots = readStringArray(visual?.armorRobeHiddenSlots);
  const modelPartCandidates = mapProcessedItemModelPartCandidates(processResult);
  const armorPartModelCandidates =
    mapProcessedItemArmorPartModelCandidates(processResult);
  const modelAssetCandidates = mapProcessedItemModelAssetCandidates(processResult);
  const armorParts =
    readRuntimeArmorParts(visual) ?? buildArmorParts(metadata) ?? object.itemProperties?.armorParts;
  const armorPreviewContext =
    readRuntimeArmorPreviewContext(visual) ??
    buildArmorPreviewContext(metadata) ??
    object.itemProperties?.armorPreviewContext;
  const armorPartCostModifiers =
    readRuntimeArmorPartCostModifiers(pricing) ??
    buildArmorPartCostModifiers(metadata) ??
    object.itemProperties?.armorPartCostModifiers;
  const materialColors =
    readRuntimeMaterialColors(visual) ??
    buildMaterialColors(metadata) ??
    object.itemProperties?.materialColors;
  const modelPartResRefs =
    runtimeResRefs.length > 0 ? runtimeResRefs : object.itemProperties?.modelPartResRefs;
  const modelPartResRefRoles =
    runtimeRoles.length > 0 ? runtimeRoles : object.itemProperties?.modelPartResRefRoles;
  const modelParts =
    runtimeParts.length > 0 ? runtimeParts : object.itemProperties?.modelParts;

  return {
    ...object,
    name: processResult.item.name.trim().length > 0 ? processResult.item.name : object.name,
    resRef: processResult.item.resref.trim().length > 0 ? processResult.item.resref : object.resRef,
    itemProperties: {
      ...object.itemProperties,
      baseItemModelType:
        readRuntimeString(visual, "baseItemModelType") ??
        readString(metadata, "baseItemModelType") ??
        object.itemProperties?.baseItemModelType,
      baseItemDefaultModel:
        readRuntimeString(visual, "baseItemDefaultModel") ??
        readString(metadata, "baseItemDefaultModel") ??
        object.itemProperties?.baseItemDefaultModel,
      baseItemSourceKey:
        readRuntimeString(visual, "baseItemModelSourceKey") ??
        readString(metadata, "baseItem2daSourceKey") ??
        object.itemProperties?.baseItemSourceKey,
      modelPart1:
        readRuntimeNumber(visual, "modelPart1") ??
        readNumber(metadata, "modelPart1") ??
        object.itemProperties?.modelPart1,
      modelPart2:
        readRuntimeNumber(visual, "modelPart2") ??
        readNumber(metadata, "modelPart2") ??
        object.itemProperties?.modelPart2,
      modelPart3:
        readRuntimeNumber(visual, "modelPart3") ??
        readNumber(metadata, "modelPart3") ??
        object.itemProperties?.modelPart3,
      ...(modelParts && modelParts.length > 0 ? { modelParts } : {}),
      ...(modelPartResRefs && modelPartResRefs.length > 0 ? { modelPartResRefs } : {}),
      ...(modelPartResRefRoles && modelPartResRefRoles.length > 0
        ? { modelPartResRefRoles }
        : {}),
      cloakModelRow:
        readRuntimeNumber(visual, "cloakModelRow") ??
        readNumber(metadata, "cloakModelRow"),
      cloakModel:
        readRuntimeNumber(visual, "cloakModel") ??
        readNumber(metadata, "cloakModel"),
      cloakTexture:
        readRuntimeNumber(visual, "cloakTexture") ??
        readNumber(metadata, "cloakTexture"),
      cloakIcon:
        readRuntimeNumber(visual, "cloakIcon") ??
        readNumber(metadata, "cloakIcon"),
      cloakModelResRef:
        readRuntimeString(visual, "cloakModelResRef") ??
        readString(metadata, "cloakModelResRef"),
      cloakTextureResRef:
        readRuntimeString(visual, "cloakTextureResRef") ??
        readString(metadata, "cloakTextureResRef"),
      cloakIconResRef:
        readRuntimeString(visual, "cloakIconResRef") ??
        readString(metadata, "cloakIconResRef"),
      cloakSourceKey:
        readRuntimeString(visual, "cloakSourceKey") ??
        readString(metadata, "cloakSourceKey"),
      cloakHiddenSlots:
        runtimeCloakHiddenSlots.length > 0
          ? runtimeCloakHiddenSlots
          : undefined,
      armorRobeHiddenSlots:
        runtimeArmorRobeHiddenSlots.length > 0 ? runtimeArmorRobeHiddenSlots : undefined,
      ...(armorPreviewContext ? { armorPreviewContext } : {}),
      ...(modelPartCandidates.length > 0 ? { modelPartCandidates } : {}),
      ...(armorPartModelCandidates.length > 0 ? { armorPartModelCandidates } : {}),
      ...(armorParts ? { armorParts } : {}),
      ...(armorPartCostModifiers ? { armorPartCostModifiers } : {}),
      armorPartCostModifierTotal:
        readRuntimeNumber(pricing, "armorPartCostModifierTotal") ??
        readNumber(metadata, "armorPartCostModifierTotal") ??
        object.itemProperties?.armorPartCostModifierTotal,
      armorPartCostModifierResolvedCount:
        readRuntimeNumber(pricing, "armorPartCostModifierResolvedCount") ??
        readNumber(metadata, "armorPartCostModifierResolvedCount") ??
        object.itemProperties?.armorPartCostModifierResolvedCount,
      armorPartCostModifierUnresolvedCount:
        readRuntimeNumber(pricing, "armorPartCostModifierUnresolvedCount") ??
        readNumber(metadata, "armorPartCostModifierUnresolvedCount") ??
        object.itemProperties?.armorPartCostModifierUnresolvedCount,
      ...(materialColors ? { materialColors } : {}),
      ...(modelAssetCandidates.length > 0 ? { modelAssetCandidates } : {})
    }
  };
}
