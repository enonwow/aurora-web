import type {
  AreaApiDetail,
  AreaApiListQuery,
  AreaApiListResult,
  AreaApiLoginResult
} from "../contracts";

export interface AreaApiPort {
  login(username: string, password: string): Promise<AreaApiLoginResult>;
  listAreas(accessToken: string, query?: AreaApiListQuery): Promise<AreaApiListResult>;
  getAreaById(accessToken: string, areaId: string): Promise<AreaApiDetail>;
}
