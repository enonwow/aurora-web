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

export interface AreaApiListItem {
  areaId: string;
  name: string;
  biome: string;
  width: number;
  height: number;
  tags: string[];
  benchmark: boolean;
  updatedAt: string;
}

export interface AreaApiListResult {
  items: AreaApiListItem[];
  total: number;
  limit: number;
  offset: number;
}

export type AreaApiObjectKind = "placeable" | "creature" | "item";

export interface AreaApiObjectPlacement {
  objectId: string;
  kind: AreaApiObjectKind;
  templateId: string;
  x: number;
  y: number;
  z: number;
  bearing: number;
}

export interface AreaApiDetail {
  areaId: string;
  name: string;
  biome: string;
  width: number;
  height: number;
  tags: string[];
  benchmark: boolean;
  updatedAt: string;
  objects: AreaApiObjectPlacement[];
}
