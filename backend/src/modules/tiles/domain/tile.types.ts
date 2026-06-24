export type TileWalkmeshKind = "walkable" | "blocked" | "water";
export type TileDeliveryMode = "proxy" | "direct";
export type TileSourceAssetRole =
  | "mdl_source"
  | "set_metadata"
  | "walkmesh_source"
  | "itp_metadata"
  | "texture_atlas_fallback"
  | "derived_model_asset"
  | "unknown_source";

export type TileSourceAssetOrigin = "module-snapshot" | "static-fallback";

export interface TileSourceAssetContract {
  objectKey: string;
  extension: string;
  role: TileSourceAssetRole;
  origin: TileSourceAssetOrigin;
  sizeBytes?: number;
  etag?: string;
}

export interface TileMaterialTextureAssetContract {
  reference: string;
  textureId: string;
  resref: string;
  objectKey: string;
  extension: string;
  contentType: string;
  sizeBytes: number;
  source: "module" | "hak" | "vanilla";
  sourcePath: string;
  deliveryPath: string;
  deliveryUrl: string;
  s3Url: string;
}

export interface TileRenderAssetContract {
  sourceAssetStatus: "ready" | "blocked";
  mdlSourceStatus: "ready" | "blocked";
  mdlSourceObjectKey?: string;
  glbGeometryStatus: "ready" | "blocked_tile_process_contract_missing_glb_geometry";
  textureDeliveryStatus:
    | "texture_material_contract_ready"
    | "texture_source_blob_metadata_present"
    | "blocked_tile_texture_blob_metadata_missing"
    | "blocked_tile_texture_contract_derived_model_only";
  materialBindingStatus:
    | "ready"
    | "blocked_tile_process_contract_missing_material_bindings"
    | "blocked_tile_material_binding_derived_model_only";
  rendererHandoffStatus: "ready" | "blocked_tile_model_geometry_loader_missing";
  modelDeliveryStatus:
    | "ready"
    | "blocked_tile_model_glb_missing";
  modelAsset?: {
    objectKey: string;
    extension: "glb" | "gltf";
    contentType: "model/gltf-binary" | "model/gltf+json";
    sizeBytes: number;
    etag?: string;
    deliveryPath: string;
    deliveryUrl: string;
  };
  materialTextureAssets?: TileMaterialTextureAssetContract[];
  expectedDerivedModelObjectKey?: string;
  blockers: string[];
}

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
  sourceAssetObjectKey?: string;
  sourceAssetExtension?: string;
  sourceAssetSizeBytes?: number;
  sourceAssetEtag?: string;
  sourceAssetOrigin?: TileSourceAssetOrigin;
  renderModelObjectKey?: string;
  renderModelExtension?: "glb" | "gltf";
  renderModelSizeBytes?: number;
  renderModelEtag?: string;
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
  sourceAsset?: TileSourceAssetContract;
  renderAssetContract?: TileRenderAssetContract;
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
