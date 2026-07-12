import type {
  TileApiProcessBatchRequestItem,
  TileApiProcessBatchResult,
  TileApiProcessOptions,
  TileApiProcessResult,
  TileApiTextureDeliveryMode,
  TileApiTextureDeliveryResult
} from "../contracts";

export interface TileApiPort {
  processTile(
    accessToken: string,
    tileId: string,
    options?: TileApiProcessOptions
  ): Promise<TileApiProcessResult>;
  processTiles?(
    accessToken: string,
    items: TileApiProcessBatchRequestItem[]
  ): Promise<TileApiProcessBatchResult>;
  getTileTextureAtlasContracts(
    accessToken: string,
    cacheKey: string,
    mode?: TileApiTextureDeliveryMode
  ): Promise<TileApiTextureDeliveryResult>;
}
