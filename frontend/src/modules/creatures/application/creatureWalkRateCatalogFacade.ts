import type {
  CreatureApiWalkRateRowsQuery,
  CreatureApiWalkRateRowsResult,
} from "../contracts";
import type { CreatureApiPort } from "../ports/creatureApiPort";

export interface CreatureWalkRateCatalogFacade {
  readonly queries: Readonly<{
    listRows(
      accessToken: string,
      query: CreatureApiWalkRateRowsQuery,
    ): Promise<CreatureApiWalkRateRowsResult>;
  }>;
}

export function createCreatureWalkRateCatalogFacade(
  port: Pick<CreatureApiPort, "listCreatureWalkRateRows">,
): CreatureWalkRateCatalogFacade {
  return Object.freeze({
    queries: Object.freeze({
      listRows: (accessToken: string, query: CreatureApiWalkRateRowsQuery) =>
        port.listCreatureWalkRateRows(accessToken, query),
    }),
  });
}
