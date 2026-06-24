import type {
  AreaApiDetail,
  AreaApiListQuery,
  AreaApiListResult,
  AreaApiLoginResult,
  AreaApiProcessOptions,
  AreaApiProcessResult,
  AreaApiTextureDeliveryMode,
  AreaApiTextureDeliveryResult
} from "../contracts";

export interface AreaApiPort {
  login(username: string, password: string): Promise<AreaApiLoginResult>;
  listAreas(accessToken: string, query?: AreaApiListQuery): Promise<AreaApiListResult>;
  getAreaById(accessToken: string, areaId: string): Promise<AreaApiDetail>;
  processArea(
    accessToken: string,
    areaId: string,
    options?: AreaApiProcessOptions
  ): Promise<AreaApiProcessResult>;
  getAreaTextureAtlasContracts(
    accessToken: string,
    cacheKey: string,
    mode?: AreaApiTextureDeliveryMode
  ): Promise<AreaApiTextureDeliveryResult>;
}
