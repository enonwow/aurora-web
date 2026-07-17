import type {
  AreaApiBinaryExportResult,
  AreaApiDetail,
  AreaApiLightingEvidenceReport,
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
  getAreaLightingEvidence(accessToken: string): Promise<AreaApiLightingEvidenceReport>;
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
  exportAreaItemsGit(accessToken: string, areaId: string): Promise<AreaApiBinaryExportResult>;
  exportAreaGit(accessToken: string, areaId: string): Promise<AreaApiBinaryExportResult>;
  exportAreaAre(accessToken: string, areaId: string): Promise<AreaApiBinaryExportResult>;
}
