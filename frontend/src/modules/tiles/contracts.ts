export type TileApiTextureDeliveryMode = "proxy" | "direct";

export interface TileApiTextureAtlas {
  atlasId: string;
  cacheKey: string;
  strategy: "blob-cache";
  objectKey?: string;
  contentType?: string;
  sizeBytes?: number;
  etag?: string;
}

export interface TileApiRenderContract {
  backendType: "tile";
  frontendType: "tile";
  rendererPreset: "tile-standard" | "tile-water";
}

export type TileApiSourceAssetRole =
  | "mdl_source"
  | "set_metadata"
  | "walkmesh_source"
  | "itp_metadata"
  | "texture_atlas_fallback"
  | "derived_model_asset"
  | "unknown_source";

export type TileApiSourceAssetOrigin = "module-snapshot" | "static-fallback";

export interface TileApiSourceAssetContract {
  objectKey: string;
  extension: string;
  role: TileApiSourceAssetRole;
  origin: TileApiSourceAssetOrigin;
  sizeBytes?: number;
  etag?: string;
}

export interface TileApiRenderAssetContract {
  sourceAssetStatus: "ready" | "blocked";
  mdlSourceStatus: "ready" | "blocked";
  mdlSourceObjectKey?: string;
  mdlSourceContentSha256?: string;
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
  modelDeliveryStatus: "ready" | "blocked_tile_model_glb_missing";
  modelAsset?: {
    objectKey: string;
    extension: "glb" | "gltf";
    contentType: "model/gltf-binary" | "model/gltf+json";
    sizeBytes: number;
    etag?: string;
    contentSha256?: string;
    deliveryPath: string;
    deliveryUrl: string;
  };
  materialTextureAssets?: Array<{
    reference: string;
    textureId: string;
    resref: string;
    objectKey: string;
    extension: string;
    contentType: string;
    sizeBytes: number;
    contentSha256?: string;
    source: "module" | "hak" | "vanilla";
    sourcePath: string;
    deliveryPath: string;
    deliveryUrl: string;
    s3Url: string;
  }>;
  expectedDerivedModelObjectKey?: string;
  blockers: string[];
}

export interface TileApiProcessedTile {
  tileId: string;
  resref: string;
  name: string;
  tileset: string;
  variant: string;
  textureAtlas: TileApiTextureAtlas;
  sourceAsset?: TileApiSourceAssetContract;
  render: TileApiRenderContract;
  renderAssetContract?: TileApiRenderAssetContract;
  processedAt: string;
}

export interface TileApiProcessingCache {
  key: string;
  hit: boolean;
  storedAt: string;
  hits: number;
}

export interface TileApiProcessOptions {
  bypassCache?: boolean;
}

export interface TileApiProcessResult {
  cache: TileApiProcessingCache;
  tile: TileApiProcessedTile;
}

export interface TileApiProcessBatchRequestItem {
  tileId: string;
  bypassCache?: boolean;
}

export interface TileApiProcessBatchReadyItem {
  tileId: string;
  status: "ready";
  result: TileApiProcessResult;
}

export interface TileApiProcessBatchBlockedItem {
  tileId: string;
  status: "blocked";
  error: {
    code: string | null;
    message: string;
  };
}

export type TileApiProcessBatchItem =
  | TileApiProcessBatchReadyItem
  | TileApiProcessBatchBlockedItem;

export interface TileApiProcessBatchResult {
  items: TileApiProcessBatchItem[];
}

export interface TileApiTextureDeliveryContract {
  mode: TileApiTextureDeliveryMode;
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

export interface TileApiTextureDeliveryResult {
  cacheKey: string;
  textureAtlas: TileApiTextureDeliveryContract;
}
