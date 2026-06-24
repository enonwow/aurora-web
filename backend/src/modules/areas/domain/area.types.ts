export type AreaObjectKind = "placeable" | "door" | "creature" | "item" | "sound";
export type AreaDeliveryMode = "proxy" | "direct";
export type AreaSoundPositioningMode = "everywhere" | "random" | "specific";
export type AreaSoundWhenToPlay = "always" | "dayNight" | "hours";
export type AreaSoundDayNight = "both" | "day" | "night";
export type AreaSoundPlayStyle = "once" | "repeat" | "loop";
export type AreaSoundPlayOrder = "sequential" | "random";
export type AreaPreservePrimitive = string | number | boolean | null;

export interface AreaObjectSoundPositioningPreservePayload {
  timeWindow: string;
  hourMask: string;
  active?: boolean;
  whenToPlay?: AreaSoundWhenToPlay;
  dayNight?: AreaSoundDayNight;
  hoursStart?: number;
  hoursEnd?: number;
  playStyle?: AreaSoundPlayStyle;
  playOrder?: AreaSoundPlayOrder;
  intervalMs: number;
  intervalVariationMs: number;
  volume: number;
  volumeVariation: number;
  pitchVariation: number;
  priority: number;
  flags: Record<string, boolean>;
  extra: Record<string, AreaPreservePrimitive>;
}

export interface AreaObjectSoundPositioning {
  mode: AreaSoundPositioningMode;
  elevation: number;
  maxVolumeDistance: number;
  cutoffDistance: number;
  randomRangeWestEast: number;
  randomRangeNorthSouth: number;
  preserve?: AreaObjectSoundPositioningPreservePayload;
}

export interface AreaObjectDoorTransition {
  linkedTarget: string;
  linkedModule: string;
  linkedTag: string;
  linkedWaypoint: string;
  loadScreen: string;
  flags: Record<string, boolean>;
  extra: Record<string, AreaPreservePrimitive>;
}

export interface AreaObjectPlacement {
  objectId: string;
  kind: AreaObjectKind;
  templateId: string;
  resRef?: string;
  appearanceType?: number;
  genericType?: number;
  x: number;
  y: number;
  z: number;
  bearing: number;
  soundPositioning?: AreaObjectSoundPositioning;
  doorTransition?: AreaObjectDoorTransition;
}

export interface AreaObjectCounts {
  placeables: number;
  doors: number;
  creatures: number;
  items: number;
  sounds: number;
  total: number;
}

export interface AreaTileInstance {
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

export interface AreaSoundBindingKeys {
  areaKey: "GI_sound_area";
  randomKey: "GI_sound_rndm";
  positionalKey: "GI_sound_pos";
}

export interface AreaSoundReference {
  soundId: string;
  resref: string;
  category: "ambient" | "music" | "effect";
  playbackMode: "looping" | "continuous" | "random" | "interval";
  ambientOnly: boolean;
}

export interface AreaSoundscape {
  bindingKeys: AreaSoundBindingKeys;
  area: AreaSoundReference[];
  random: AreaSoundReference[];
  positional: AreaSoundReference[];
}

export interface AreaRecord {
  areaId: string;
  name: string;
  biome: string;
  width: number;
  height: number;
  tags: string[];
  benchmark: boolean;
  previewImageUrl: string;
  textureAtlasId: string;
  textureAtlasObjectKey: string;
  textureAtlasContentType: string;
  textureAtlasSizeBytes: number;
  textureAtlasEtag?: string;
  textureAtlasFingerprint: string;
  tileSet?: string;
  tiles?: AreaTileInstance[];
  objects: AreaObjectPlacement[];
  soundscape: AreaSoundscape;
  updatedAt: string;
}

export interface AreaListItem {
  areaId: string;
  name: string;
  biome: string;
  width: number;
  height: number;
  tags: string[];
  benchmark: boolean;
  previewImageUrl: string;
  textureAtlasId: string;
  objectCounts: AreaObjectCounts;
  updatedAt: string;
}

export interface AreaListQuery {
  query?: string;
  biome?: string;
  tag?: string;
  benchmark?: boolean;
  limit: number;
  offset: number;
}

export interface AreaListResult {
  items: AreaListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface AreaProcessQuery {
  areaId: string;
  bypassCache: boolean;
}

export interface AreaProcessingResult {
  areaId: string;
  name: string;
  biome: string;
  width: number;
  height: number;
  tags: string[];
  benchmark: boolean;
  previewImageUrl: string;
  textureAtlas: {
    atlasId: string;
    cacheKey: string;
    strategy: "blob-cache";
    objectKey?: string;
    contentType?: string;
    sizeBytes?: number;
    etag?: string;
  };
  tileSet?: string;
  tiles?: AreaTileInstance[];
  soundscape: AreaSoundscape;
  composition: AreaObjectCounts;
  objects: AreaObjectPlacement[];
  updatedAt: string;
  processedAt: string;
}
