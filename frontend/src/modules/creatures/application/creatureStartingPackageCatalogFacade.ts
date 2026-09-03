import type {
  CreatureApiStartingPackageRowsQuery,
  CreatureApiStartingPackageRowsResult,
} from "../contracts";
import type { CreatureApiPort } from "../ports/creatureApiPort";

export interface CreatureStartingPackageCatalogFacade {
  readonly queries: Readonly<{
    listRows(
      accessToken: string,
      query: CreatureApiStartingPackageRowsQuery,
    ): Promise<CreatureApiStartingPackageRowsResult>;
  }>;
}

export function createCreatureStartingPackageCatalogFacade(
  port: Pick<CreatureApiPort, "listCreatureStartingPackageRows">,
): CreatureStartingPackageCatalogFacade {
  return Object.freeze({
    queries: Object.freeze({
      listRows: (accessToken: string, query: CreatureApiStartingPackageRowsQuery) =>
        port.listCreatureStartingPackageRows(accessToken, query),
    }),
  });
}
