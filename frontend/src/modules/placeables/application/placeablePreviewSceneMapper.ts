import type { AreaScene, SceneObject } from "../../scene/contracts";
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
