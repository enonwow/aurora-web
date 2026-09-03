import type {
  CreatureApiFeatRowsQuery,
  CreatureApiFeatRowsResult,
} from "../contracts";
import type { CreatureApiPort } from "../ports/creatureApiPort";

export interface CreatureFeatCatalogFacade {
  readonly queries: Readonly<{
    listRows(
      accessToken: string,
      query: CreatureApiFeatRowsQuery,
    ): Promise<CreatureApiFeatRowsResult>;
  }>;
}

export function createCreatureFeatCatalogFacade(
  port: Pick<CreatureApiPort, "listCreatureFeatRows">,
): CreatureFeatCatalogFacade {
  return Object.freeze({
    queries: Object.freeze({
      listRows: (accessToken: string, query: CreatureApiFeatRowsQuery) =>
        port.listCreatureFeatRows(accessToken, query),
    }),
  });
}
