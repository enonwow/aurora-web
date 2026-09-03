import type {
  CreatureApiPerceptionRangeRowsQuery,
  CreatureApiPerceptionRangeRowsResult,
} from "../contracts";
import type { CreatureApiPort } from "../ports/creatureApiPort";

export interface CreaturePerceptionRangeCatalogFacade {
  readonly queries: Readonly<{
    listRows(
      accessToken: string,
      query: CreatureApiPerceptionRangeRowsQuery,
    ): Promise<CreatureApiPerceptionRangeRowsResult>;
  }>;
}

export function createCreaturePerceptionRangeCatalogFacade(
  port: Pick<CreatureApiPort, "listCreaturePerceptionRangeRows">,
): CreaturePerceptionRangeCatalogFacade {
  return Object.freeze({
    queries: Object.freeze({
      listRows: (accessToken: string, query: CreatureApiPerceptionRangeRowsQuery) =>
        port.listCreaturePerceptionRangeRows(accessToken, query),
    }),
  });
}
