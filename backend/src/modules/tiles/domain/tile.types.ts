export type TileWalkmeshKind = "walkable" | "blocked" | "water";
export type TileDeliveryMode = "proxy" | "direct";

export interface TileMetrics {
  triangles: number;
  meshes: number;
  emitters: number;
}

export interface TileRecord {
  tileId: string;
  resref: string;
  name: string;
  tileset: string;
  variant: string;
  tags: string[];
  benchmark: boolean;
  previewImageUrl: string;
  textureAtlasId: string;
  textureAtlasObjectKey: string;
  textureAtlasContentType: string;
  textureAtlasSizeBytes: number;
  textureAtlasEtag?: string;
  textureAtlasFingerprint: string;
  walkmesh: TileWalkmeshKind;
  metrics: TileMetrics;
  updatedAt: string;
}

export interface TileListItem {
  tileId: string;
  resref: string;
  name: string;
  tileset: string;
  variant: string;
  tags: string[];
  benchmark: boolean;
  previewImageUrl: string;
  walkmesh: TileWalkmeshKind;
  metrics: TileMetrics;
  updatedAt: string;
}

export interface TileListQuery {
  query?: string;
  tileset?: string;
  variant?: string;
  walkmesh?: TileWalkmeshKind;
  tag?: string;
  benchmark?: boolean;
  limit: number;
  offset: number;
}

export interface TileListResult {
  items: TileListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface TileProcessQuery {
  tileId: string;
  bypassCache: boolean;
}

export interface TileProcessingResult {
  tileId: string;
  resref: string;
  name: string;
  tileset: string;
  variant: string;
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
  walkmesh: TileWalkmeshKind;
  metrics: TileMetrics;
  render: {
    backendType: "tile";
    frontendType: "tile";
    rendererPreset: "tile-standard" | "tile-water";
  };
  updatedAt: string;
  processedAt: string;
}

export interface TileBenchmarkRunQuery {
  tileIds?: string[];
  iterations: number;
  warmupIterations: number;
  bypassCache: boolean;
}

export interface BenchmarkDurationSummary {
  minMs: number;
  maxMs: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
}

export interface TileBenchmarkResult {
  datasetFingerprint: string;
  config: {
    iterations: number;
    warmupIterations: number;
    bypassCache: boolean;
    candidates: number;
  };
  timing: {
    startedAt: string;
    finishedAt: string;
  };
  metrics: {
    overall: BenchmarkDurationSummary;
    perCandidate: Array<{
      tileId: string;
      resref: string;
      metrics: BenchmarkDurationSummary;
    }>;
  };
}
