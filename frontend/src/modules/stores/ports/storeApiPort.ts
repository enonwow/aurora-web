import type {
  StoreApiBlueprintDeleteResult,
  StoreApiBlueprintCreatePayload,
  StoreApiBlueprintCreateResult,
  StoreApiListQuery,
  StoreApiListResult,
  StoreApiPreviewResult
} from "../contracts";

export interface StoreApiPort {
  listStores(accessToken: string, query?: StoreApiListQuery): Promise<StoreApiListResult>;
  getStorePreview(accessToken: string, templateId: string): Promise<StoreApiPreviewResult>;
  createStoreBlueprint(
    accessToken: string,
    payload: StoreApiBlueprintCreatePayload
  ): Promise<StoreApiBlueprintCreateResult>;
  updateStoreBlueprint(
    accessToken: string,
    resRef: string,
    payload: StoreApiBlueprintCreatePayload
  ): Promise<StoreApiBlueprintCreateResult>;
  deleteStoreBlueprint(
    accessToken: string,
    resRef: string
  ): Promise<StoreApiBlueprintDeleteResult>;
}
