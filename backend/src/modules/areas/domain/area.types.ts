export type AreaObjectKind = "placeable" | "creature" | "item";

export interface AreaObjectPlacement {
  objectId: string;
  kind: AreaObjectKind;
  templateId: string;
  x: number;
  y: number;
  z: number;
  bearing: number;
}

export interface AreaObjectCounts {
  placeables: number;
  creatures: number;
  items: number;
  total: number;
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
  };
  soundscape: AreaSoundscape;
  composition: AreaObjectCounts;
  objects: AreaObjectPlacement[];
  updatedAt: string;
  processedAt: string;
}
