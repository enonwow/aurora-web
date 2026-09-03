import type {
  CreatureApiGenderRowsQuery,
  CreatureApiGenderRowsResult,
} from "../contracts";
import type { CreatureApiPort } from "../ports/creatureApiPort";

export interface CreatureGenderCatalogFacade {
  readonly queries: Readonly<{
    listRows(
      accessToken: string,
      query: CreatureApiGenderRowsQuery,
    ): Promise<CreatureApiGenderRowsResult>;
  }>;
}

export function createCreatureGenderCatalogFacade(
  port: Pick<CreatureApiPort, "listCreatureGenderRows">,
): CreatureGenderCatalogFacade {
  return Object.freeze({
    queries: Object.freeze({
      listRows: (accessToken: string, query: CreatureApiGenderRowsQuery) =>
        port.listCreatureGenderRows(accessToken, query),
    }),
  });
}
