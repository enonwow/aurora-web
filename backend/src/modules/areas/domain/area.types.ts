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
