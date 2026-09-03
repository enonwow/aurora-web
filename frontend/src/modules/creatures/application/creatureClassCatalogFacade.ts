import type {
  CreatureApiClassRowsQuery,
  CreatureApiClassRowsResult,
} from "../contracts";
import type { CreatureApiPort } from "../ports/creatureApiPort";

export interface CreatureClassCatalogFacade {
  readonly queries: Readonly<{
    listRows(
      accessToken: string,
      query: CreatureApiClassRowsQuery,
    ): Promise<CreatureApiClassRowsResult>;
  }>;
}

export function createCreatureClassCatalogFacade(
  port: Pick<CreatureApiPort, "listCreatureClassRows">,
): CreatureClassCatalogFacade {
  return Object.freeze({
    queries: Object.freeze({
      listRows: (accessToken: string, query: CreatureApiClassRowsQuery) =>
        port.listCreatureClassRows(accessToken, query),
    }),
  });
}
