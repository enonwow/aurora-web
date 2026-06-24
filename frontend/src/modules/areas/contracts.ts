export interface AreaApiLoginResult {
  accessToken: string;
}

export interface AreaApiListQuery {
  query?: string;
  biome?: string;
  tag?: string;
  benchmark?: boolean;
  limit?: number;
  offset?: number;
}

export interface AreaApiObjectCounts {
  placeables: number;
  doors: number;
  creatures: number;
  items: number;
  sounds: number;
  total: number;
}

export interface AreaApiTileInstance {
  tileInstanceId: string;
  areaId: string;
  tilesetResRef: string;
  row: number;
  col: number;
  tileIndex: number;
  tileId?: number;
  modelResRef?: string;
  modelSource?: "are-tile-list" | "set-tile-section";
  orientation?: number;
  height?: number;
  source: "are-tile-list";
  fallbackReason?: string;
}

export interface AreaApiTextureAtlas {
  atlasId: string;
  cacheKey: string;
  strategy: "blob-cache";
  objectKey?: string;
  contentType?: string;
  sizeBytes?: number;
  etag?: string;
}

export type AreaApiTextureDeliveryMode = "proxy" | "direct";

export interface AreaApiTextureDeliveryContract {
  mode: AreaApiTextureDeliveryMode;
  atlasId: string;
  objectKey: string;
  contentType: string;
  sizeBytes: number;
  etag?: string;
  proxyPath: string;
  proxyUrl: string;
  directUrl?: string;
  s3Url?: string;
}

export interface AreaApiTextureDeliveryResult {
  cacheKey: string;
  textureAtlas: AreaApiTextureDeliveryContract;
}

export interface AreaApiListItem {
  areaId: string;
  name: string;
  biome: string;
  width: number;
  height: number;
  tags: string[];
  benchmark: boolean;
  previewImageUrl: string;
  textureAtlasId: string;
  objectCounts: AreaApiObjectCounts;
  updatedAt: string;
}

export interface AreaApiListResult {
  items: AreaApiListItem[];
  total: number;
  limit: number;
  offset: number;
}

export type AreaApiObjectKind = "placeable" | "door" | "creature" | "item" | "sound";
export type AreaApiSoundPositioningMode = "everywhere" | "random" | "specific";
export type AreaApiSoundWhenToPlay = "always" | "dayNight" | "hours";
export type AreaApiSoundDayNight = "both" | "day" | "night";
export type AreaApiSoundPlayStyle = "once" | "repeat" | "loop";
export type AreaApiSoundPlayOrder = "sequential" | "random";
export type AreaApiPreservePrimitive = string | number | boolean | null;

export interface AreaApiObjectSoundPositioningPreservePayload {
  timeWindow: string;
  hourMask: string;
  active?: boolean;
  whenToPlay?: AreaApiSoundWhenToPlay;
  dayNight?: AreaApiSoundDayNight;
  hoursStart?: number;
  hoursEnd?: number;
  playStyle?: AreaApiSoundPlayStyle;
  playOrder?: AreaApiSoundPlayOrder;
  intervalMs: number;
  intervalVariationMs: number;
  volume: number;
  volumeVariation: number;
  pitchVariation: number;
  priority: number;
  flags: Record<string, boolean>;
  extra: Record<string, AreaApiPreservePrimitive>;
}

export interface AreaApiObjectSoundPositioning {
  mode: AreaApiSoundPositioningMode;
  elevation: number;
  maxVolumeDistance: number;
  cutoffDistance: number;
  randomRangeWestEast: number;
  randomRangeNorthSouth: number;
  preserve?: AreaApiObjectSoundPositioningPreservePayload;
}

export interface AreaApiObjectDoorTransition {
  linkedTarget: string;
  linkedModule: string;
  linkedTag: string;
  linkedWaypoint: string;
  loadScreen: string;
  flags: Record<string, boolean>;
  extra?: Record<string, AreaApiPreservePrimitive>;
}

export interface AreaApiObjectPlacement {
  objectId: string;
  kind: AreaApiObjectKind;
  templateId: string;
  resRef?: string;
  appearanceType?: number;
  genericType?: number;
  x: number;
  y: number;
  z: number;
  bearing: number;
  soundPositioning?: AreaApiObjectSoundPositioning;
  doorTransition?: AreaApiObjectDoorTransition;
}

export interface AreaApiDetail {
  areaId: string;
  name: string;
  biome: string;
  width: number;
  height: number;
  tags: string[];
  benchmark: boolean;
  previewImageUrl: string;
  textureAtlas: AreaApiTextureAtlas;
  tileSet?: string;
  tiles?: AreaApiTileInstance[];
  composition: AreaApiObjectCounts;
  updatedAt: string;
  objects: AreaApiObjectPlacement[];
}

export interface AreaApiProcessedArea extends AreaApiDetail {
  processedAt: string;
}

export interface AreaApiProcessOptions {
  bypassCache?: boolean;
}

export interface AreaApiProcessingCache {
  key: string;
  hit: boolean;
  storedAt: string;
  hits: number;
}

export interface AreaApiProcessResult {
  cache: AreaApiProcessingCache;
  area: AreaApiProcessedArea;
}
