import type { EncounterApiListQuery, EncounterApiListResult } from "../contracts";

export interface EncounterApiPort {
  listEncounters(
    accessToken: string,
    query?: EncounterApiListQuery
  ): Promise<EncounterApiListResult>;
}
