import type {
  PlaceableApiAssetContractsResult,
  PlaceableApiAssetContractsBatchRequestItem,
  PlaceableApiAssetContractsBatchResult,
  PlaceableApiListQuery,
  PlaceableApiListResult,
  PlaceableApiProcessBatchResult,
  PlaceableApiProcessPayload,
  PlaceableApiProcessResult,
  PlaceableApiPreviewScene
} from "../contracts";

export interface PlaceableApiPort {
  listPlaceables(accessToken: string, query?: PlaceableApiListQuery): Promise<PlaceableApiListResult>;
  getPlaceablePreview(accessToken: string, templateId: string): Promise<PlaceableApiPreviewScene>;
  processPlaceable(
    accessToken: string,
    payload: PlaceableApiProcessPayload
  ): Promise<PlaceableApiProcessResult>;
  processPlaceables?(
    accessToken: string,
    payloads: PlaceableApiProcessPayload[]
  ): Promise<PlaceableApiProcessBatchResult>;
  getPlaceableAssetContracts(
    accessToken: string,
    cacheKey: string,
    assetIds?: string[]
  ): Promise<PlaceableApiAssetContractsResult>;
  getPlaceableAssetContractsBatch?(
    accessToken: string,
    items: PlaceableApiAssetContractsBatchRequestItem[]
  ): Promise<PlaceableApiAssetContractsBatchResult>;
}
