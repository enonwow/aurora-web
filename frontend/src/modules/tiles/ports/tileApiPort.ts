import type {
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
  getTileTextureAtlasContracts(
    accessToken: string,
    cacheKey: string,
    mode?: TileApiTextureDeliveryMode
  ): Promise<TileApiTextureDeliveryResult>;
}
