import type {
  PlaceableApiAppearanceRowsQuery,
  PlaceableApiAppearanceRowsResult,
  PlaceableApiAssetContractsResult,
  PlaceableApiAssetContractsBatchRequestItem,
  PlaceableApiAssetContractsBatchResult,
  PlaceableApiBlueprintCreatePayload,
  PlaceableApiBlueprintCreateResult,
  PlaceableApiBlueprintDeleteResult,
  PlaceableApiListQuery,
  PlaceableApiListResult,
  PlaceableApiProcessBatchResult,
  PlaceableApiProcessPayload,
  PlaceableApiProcessResult,
  PlaceableApiPreviewScene,
  PlaceableApiViewportRenderPayloadBatchResult
} from "../contracts";

export interface PlaceableApiRequestOptions {
  signal?: AbortSignal;
}

export interface PlaceableApiPort {
  listPlaceables(accessToken: string, query?: PlaceableApiListQuery): Promise<PlaceableApiListResult>;
  listPlaceableAppearanceRows?(
    accessToken: string,
    query: PlaceableApiAppearanceRowsQuery
  ): Promise<PlaceableApiAppearanceRowsResult>;
  getPlaceablePreview(accessToken: string, templateId: string): Promise<PlaceableApiPreviewScene>;
  createPlaceableBlueprint?(
    accessToken: string,
    payload: PlaceableApiBlueprintCreatePayload
  ): Promise<PlaceableApiBlueprintCreateResult>;
  updatePlaceableBlueprint?(
    accessToken: string,
    resRef: string,
    payload: PlaceableApiBlueprintCreatePayload
  ): Promise<PlaceableApiBlueprintCreateResult>;
  deletePlaceableBlueprint?(
    accessToken: string,
    resRef: string
  ): Promise<PlaceableApiBlueprintDeleteResult>;
  processPlaceable(
    accessToken: string,
    payload: PlaceableApiProcessPayload,
    options?: PlaceableApiRequestOptions
  ): Promise<PlaceableApiProcessResult>;
  processPlaceables?(
    accessToken: string,
    payloads: PlaceableApiProcessPayload[],
    options?: PlaceableApiRequestOptions
  ): Promise<PlaceableApiProcessBatchResult>;
  getProcessedPlaceable?(
    accessToken: string,
    cacheKey: string,
    options?: PlaceableApiRequestOptions
  ): Promise<PlaceableApiProcessResult>;
  getPlaceableViewportRenderPayloadBatch?(
    accessToken: string,
    payloads: PlaceableApiProcessPayload[],
    options?: PlaceableApiRequestOptions
  ): Promise<PlaceableApiViewportRenderPayloadBatchResult>;
  getPlaceableAssetContracts(
    accessToken: string,
    cacheKey: string,
    assetIds?: string[],
    options?: PlaceableApiRequestOptions
  ): Promise<PlaceableApiAssetContractsResult>;
  getPlaceableAssetContractsBatch?(
    accessToken: string,
    items: PlaceableApiAssetContractsBatchRequestItem[],
    options?: PlaceableApiRequestOptions
  ): Promise<PlaceableApiAssetContractsBatchResult>;
}
