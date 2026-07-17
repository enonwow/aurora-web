import type {
  AreaScene,
  SceneObject,
  SceneObjectEmbeddedItemSummary,
  SceneObjectItemPropertyEntry,
  SceneObjectPlaceableInventoryItemReference
} from "../../scene/contracts";
import { createSeedAreaScene, normalizeSceneObjectMetadata } from "../../scene/domain/sceneFactory";
import { buildVfxPayloadFromPlaceablePreview } from "./placeableVfxPreservePayload";

type PreviewMetadataPrimitive = string | number | boolean;

export interface PlaceablePreviewPayload {
  templateId: string;
  resref: string;
  name: string;
  kind: string;
  placeableSubtype?: string;
  tag?: string;
  x?: PreviewMetadataPrimitive;
  y?: PreviewMetadataPrimitive;
  z?: PreviewMetadataPrimitive;
  bearing?: PreviewMetadataPrimitive;
  metadata?: Record<string, PreviewMetadataPrimitive>;
}

export interface PlaceablePreviewSceneMapperOptions {
  now?: () => number;
  width?: number;
  height?: number;
}

const DEFAULT_PREVIEW_WIDTH = 1;
const DEFAULT_PREVIEW_HEIGHT = 1;
const DEFAULT_OBJECT_X = 0.5;
const DEFAULT_OBJECT_Y = 0.5;
const DEFAULT_OBJECT_Z = 0;
const DEFAULT_BEARING = 0;
const FALLBACK_TEMPLATE_ID = "preview_unknown";
const FALLBACK_NAME = "Placeable";

function normalizeNonEmptyText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function toFiniteNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return fallback;
    }
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function readMetadataBoolean(
  metadata: Record<string, PreviewMetadataPrimitive> | undefined,
  key: string,
  fallback = false
): boolean {
  const value = metadata?.[key];
  return typeof value === "boolean" ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRecordString(entry: Record<string, unknown>, key: string): string | undefined {
  const value = entry[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function readRecordNumber(entry: Record<string, unknown>, key: string): number | undefined {
  const value = entry[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readRecordBoolean(entry: Record<string, unknown>, key: string): boolean | undefined {
  const value = entry[key];
  return typeof value === "boolean" ? value : undefined;
}

function mapEmbeddedItemPropertyEntries(value: unknown): SceneObjectItemPropertyEntry[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const entries = value
    .filter(isRecord)
    .map((entry) => ({
      propertyName: readRecordNumber(entry, "propertyName"),
      subtype: readRecordNumber(entry, "subtype"),
      costTable: readRecordNumber(entry, "costTable"),
      costValue: readRecordNumber(entry, "costValue"),
      param1: readRecordNumber(entry, "param1"),
      param1Value: readRecordNumber(entry, "param1Value"),
      chanceAppear: readRecordNumber(entry, "chanceAppear")
    }))
    .filter((entry) => Object.values(entry).some((entryValue) => entryValue !== undefined));
  return entries.length > 0 ? entries : undefined;
}

function mapEmbeddedItemSummary(entry: Record<string, unknown>): SceneObjectEmbeddedItemSummary | undefined {
  const rawEmbeddedItem = entry.embeddedItem;
  if (!isRecord(rawEmbeddedItem)) {
    return undefined;
  }
  const summary: SceneObjectEmbeddedItemSummary = {
    sourceStructTypeId: readRecordNumber(rawEmbeddedItem, "sourceStructTypeId"),
    templateResRef: readRecordString(rawEmbeddedItem, "templateResRef"),
    tag: readRecordString(rawEmbeddedItem, "tag"),
    localizedName: readRecordString(rawEmbeddedItem, "localizedName"),
    localizedNameStrRef: readRecordNumber(rawEmbeddedItem, "localizedNameStrRef"),
    description: readRecordString(rawEmbeddedItem, "description"),
    descriptionStrRef: readRecordNumber(rawEmbeddedItem, "descriptionStrRef"),
    identifiedDescription: readRecordString(rawEmbeddedItem, "identifiedDescription"),
    identifiedDescriptionStrRef: readRecordNumber(rawEmbeddedItem, "identifiedDescriptionStrRef"),
    comments: readRecordString(rawEmbeddedItem, "comments"),
    paletteId: readRecordNumber(rawEmbeddedItem, "paletteId"),
    plot: readRecordBoolean(rawEmbeddedItem, "plot"),
    baseItem: readRecordNumber(rawEmbeddedItem, "baseItem"),
    modelPart1: readRecordNumber(rawEmbeddedItem, "modelPart1"),
    modelPart2: readRecordNumber(rawEmbeddedItem, "modelPart2"),
    modelPart3: readRecordNumber(rawEmbeddedItem, "modelPart3"),
    cost: readRecordNumber(rawEmbeddedItem, "cost"),
    addCost: readRecordNumber(rawEmbeddedItem, "addCost"),
    costTable: readRecordNumber(rawEmbeddedItem, "costTable"),
    costValue: readRecordNumber(rawEmbeddedItem, "costValue"),
    charges: readRecordNumber(rawEmbeddedItem, "charges"),
    stackSize: readRecordNumber(rawEmbeddedItem, "stackSize"),
    identified: readRecordBoolean(rawEmbeddedItem, "identified"),
    stolen: readRecordBoolean(rawEmbeddedItem, "stolen"),
    cursed: readRecordBoolean(rawEmbeddedItem, "cursed"),
    bodyPartRFoot: readRecordNumber(rawEmbeddedItem, "bodyPartRFoot"),
    bodyPartLFoot: readRecordNumber(rawEmbeddedItem, "bodyPartLFoot"),
    bodyPartRShin: readRecordNumber(rawEmbeddedItem, "bodyPartRShin"),
    bodyPartLShin: readRecordNumber(rawEmbeddedItem, "bodyPartLShin"),
    bodyPartLThigh: readRecordNumber(rawEmbeddedItem, "bodyPartLThigh"),
    bodyPartRThigh: readRecordNumber(rawEmbeddedItem, "bodyPartRThigh"),
    bodyPartPelvis: readRecordNumber(rawEmbeddedItem, "bodyPartPelvis"),
    bodyPartTorso: readRecordNumber(rawEmbeddedItem, "bodyPartTorso"),
    bodyPartBelt: readRecordNumber(rawEmbeddedItem, "bodyPartBelt"),
    bodyPartNeck: readRecordNumber(rawEmbeddedItem, "bodyPartNeck"),
    bodyPartRFArm: readRecordNumber(rawEmbeddedItem, "bodyPartRFArm"),
    bodyPartLFArm: readRecordNumber(rawEmbeddedItem, "bodyPartLFArm"),
    bodyPartRBicep: readRecordNumber(rawEmbeddedItem, "bodyPartRBicep"),
    bodyPartLBicep: readRecordNumber(rawEmbeddedItem, "bodyPartLBicep"),
    bodyPartRShoul: readRecordNumber(rawEmbeddedItem, "bodyPartRShoul"),
    bodyPartLShoul: readRecordNumber(rawEmbeddedItem, "bodyPartLShoul"),
    bodyPartRHand: readRecordNumber(rawEmbeddedItem, "bodyPartRHand"),
    bodyPartLHand: readRecordNumber(rawEmbeddedItem, "bodyPartLHand"),
    bodyPartRobe: readRecordNumber(rawEmbeddedItem, "bodyPartRobe"),
    leather1Color: readRecordNumber(rawEmbeddedItem, "leather1Color"),
    leather2Color: readRecordNumber(rawEmbeddedItem, "leather2Color"),
    cloth1Color: readRecordNumber(rawEmbeddedItem, "cloth1Color"),
    cloth2Color: readRecordNumber(rawEmbeddedItem, "cloth2Color"),
    metal1Color: readRecordNumber(rawEmbeddedItem, "metal1Color"),
    metal2Color: readRecordNumber(rawEmbeddedItem, "metal2Color"),
    itemPropertyListCount: readRecordNumber(rawEmbeddedItem, "itemPropertyListCount"),
    itemPropertyListEntries: mapEmbeddedItemPropertyEntries(
      rawEmbeddedItem.itemPropertyListEntries
    ),
    scripts: readRecordStringMap(rawEmbeddedItem, "scripts"),
    fieldCount: readRecordNumber(rawEmbeddedItem, "fieldCount")
  };
  return Object.values(summary).some((value) => value !== undefined && value !== "")
    ? summary
    : undefined;
}

function readRecordStringMap(
  entry: Record<string, unknown>,
  key: string
): Record<string, string> | undefined {
  const value = entry[key];
  if (!isRecord(value)) {
    return undefined;
  }
  const mapped: Record<string, string> = {};
  Object.entries(value).forEach(([entryKey, entryValue]) => {
    const normalizedKey = entryKey.trim();
    const normalizedValue =
      typeof entryValue === "string" && entryValue.trim().length > 0
        ? entryValue.trim()
        : undefined;
    if (normalizedKey.length > 0 && normalizedValue) {
      mapped[normalizedKey] = normalizedValue;
    }
  });
  return Object.keys(mapped).length > 0 ? mapped : undefined;
}

function readJsonArray(
  metadata: Record<string, PreviewMetadataPrimitive> | undefined,
  key: string
): unknown[] {
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

function mapPlaceableInventoryItems(
  metadata: Record<string, PreviewMetadataPrimitive> | undefined
): SceneObjectPlaceableInventoryItemReference[] {
  return readJsonArray(metadata, "inventoryItemListEntries")
    .filter(isRecord)
    .map((entry) => ({
      resRef: readRecordString(entry, "resRef"),
      randomResRef: readRecordString(entry, "randomResRef"),
      randomList: readRecordString(entry, "randomList"),
      embeddedItem: mapEmbeddedItemSummary(entry),
      itemTemplateId: readRecordString(entry, "itemTemplateId"),
      itemResRef: readRecordString(entry, "itemResref") ?? readRecordString(entry, "itemResRef"),
      itemSourceFingerprint: readRecordString(entry, "itemSourceFingerprint"),
      itemSourceObjectKey: readRecordString(entry, "itemSourceObjectKey"),
      x: readRecordNumber(entry, "x"),
      y: readRecordNumber(entry, "y"),
      dropable: readRecordBoolean(entry, "dropable"),
      pickpocketable: readRecordBoolean(entry, "pickpocketable"),
      infinite: readRecordBoolean(entry, "infinite")
    }))
    .filter((entry) =>
      Object.values(entry).some((value) => value !== undefined && value !== "")
    );
}

function buildPlaceableProperties(
  preview: PlaceablePreviewPayload
): NonNullable<SceneObject["placeableProperties"]> {
  const inventoryItems = mapPlaceableInventoryItems(preview.metadata);
  return {
    plot: readMetadataBoolean(preview.metadata, "plot"),
    useable: readMetadataBoolean(preview.metadata, "useable"),
    hasInventory: readMetadataBoolean(preview.metadata, "hasInventory") || inventoryItems.length > 0,
    ...(inventoryItems.length > 0 ? { inventoryItems } : {})
  };
}

function readCoordinate(metadata: Record<string, PreviewMetadataPrimitive> | undefined): {
  x: number;
  y: number;
  z: number;
  bearing: number;
} {
  const x = toFiniteNumber(metadata?.x, DEFAULT_OBJECT_X);
  const y = toFiniteNumber(metadata?.y, DEFAULT_OBJECT_Y);
  const z = toFiniteNumber(metadata?.z, DEFAULT_OBJECT_Z);
  const bearing = toFiniteNumber(metadata?.bearing ?? metadata?.orientation, DEFAULT_BEARING);
  return { x, y, z, bearing };
}

function normalizePreviewDimension(value: unknown, fallback: number): number {
  const numeric = toFiniteNumber(value, fallback);
  return Math.max(1, Math.round(numeric));
}

function resolvePreviewCoordinates(preview: PlaceablePreviewPayload): {
  x: number;
  y: number;
  z: number;
  bearing: number;
} {
  const metadataPosition = readCoordinate(preview.metadata);
  return {
    x: toFiniteNumber(preview.x, metadataPosition.x),
    y: toFiniteNumber(preview.y, metadataPosition.y),
    z: toFiniteNumber(preview.z, metadataPosition.z),
    bearing: toFiniteNumber(preview.bearing, metadataPosition.bearing)
  };
}

function resolvePreviewIdentity(preview: PlaceablePreviewPayload): {
  templateId: string;
  resref: string;
  name: string;
  tag: string;
} {
  const normalizedTemplateId =
    normalizeNonEmptyText(preview.templateId) ??
    normalizeNonEmptyText(preview.resref) ??
    FALLBACK_TEMPLATE_ID;
  const normalizedResRef = normalizeNonEmptyText(preview.resref) ?? normalizedTemplateId;
  const normalizedName = normalizeNonEmptyText(preview.name) ?? FALLBACK_NAME;
  const normalizedTag = (
    normalizeNonEmptyText(preview.tag) ?? normalizedTemplateId
  ).toUpperCase();
  return {
    templateId: normalizedTemplateId,
    resref: normalizedResRef,
    name: normalizedName,
    tag: normalizedTag
  };
}

function buildPlaceablePreviewObject(preview: PlaceablePreviewPayload): SceneObject {
  const coordinates = resolvePreviewCoordinates(preview);
  const identity = resolvePreviewIdentity(preview);
  const vfxPayload = buildVfxPayloadFromPlaceablePreview(preview);
  const placeableProperties = buildPlaceableProperties(preview);
  return normalizeSceneObjectMetadata({
    id: `preview:${identity.templateId}`,
    kind: "placeables",
    name: identity.name,
    resRef: identity.resref,
    tag: identity.tag,
    isStatic: true,
    x: coordinates.x,
    y: coordinates.y,
    z: coordinates.z,
    bearing: coordinates.bearing,
    placeableProperties,
    visualTransform: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      roll: 0,
      yaw: 0
    },
    ...(vfxPayload ? { vfxPayload } : {})
  });
}

export function buildPlaceablesModePreviewSeed(
  preview: PlaceablePreviewPayload,
  options: PlaceablePreviewSceneMapperOptions = {}
): AreaScene {
  const identity = resolvePreviewIdentity(preview);
  const normalizedWidth = normalizePreviewDimension(options.width, DEFAULT_PREVIEW_WIDTH);
  const normalizedHeight = normalizePreviewDimension(options.height, DEFAULT_PREVIEW_HEIGHT);
  const seed = createSeedAreaScene(normalizedWidth, normalizedHeight);
  const now = options.now ?? (() => Date.now());
  return {
    ...seed,
    sceneId: `preview:${identity.templateId}`,
    areaName: `${identity.name} Preview`,
    width: normalizedWidth,
    height: normalizedHeight,
    tiles: [],
    objects: [],
    updatedAtUnixMs: now(),
    source: "seed"
  };
}

export function mapPlaceablePreviewToScene(
  preview: PlaceablePreviewPayload,
  options: PlaceablePreviewSceneMapperOptions = {}
): AreaScene {
  const seed = buildPlaceablesModePreviewSeed(preview, options);
  const sceneObject = buildPlaceablePreviewObject(preview);
  return {
    ...seed,
    objects: [sceneObject],
    source: "seed"
  };
}
