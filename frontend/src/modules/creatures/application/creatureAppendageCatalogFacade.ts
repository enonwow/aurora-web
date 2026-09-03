import type {
  CreatureApiAppendageRowsQuery,
  CreatureApiAppendageRowsResult,
} from "../contracts";
import type { CreatureApiPort } from "../ports/creatureApiPort";

export interface CreatureAppendageCatalogFacade {
  readonly queries: Readonly<{
    listRows(
      accessToken: string,
      query: CreatureApiAppendageRowsQuery,
    ): Promise<CreatureApiAppendageRowsResult>;
  }>;
}

export function createCreatureAppendageCatalogFacade(
  port: Pick<CreatureApiPort, "listCreatureAppendageRows">,
): CreatureAppendageCatalogFacade {
  return Object.freeze({
    queries: Object.freeze({
      listRows: (accessToken: string, query: CreatureApiAppendageRowsQuery) =>
        port.listCreatureAppendageRows(accessToken, query),
    }),
  });
}
