import type {
  CreatureApiPhenotypeRowsQuery,
  CreatureApiPhenotypeRowsResult,
} from "../contracts";
import type { CreatureApiPort } from "../ports/creatureApiPort";

export interface CreaturePhenotypeCatalogFacade {
  readonly queries: Readonly<{
    listRows(
      accessToken: string,
      query: CreatureApiPhenotypeRowsQuery,
    ): Promise<CreatureApiPhenotypeRowsResult>;
  }>;
}

export function createCreaturePhenotypeCatalogFacade(
  port: Pick<CreatureApiPort, "listCreaturePhenotypeRows">,
): CreaturePhenotypeCatalogFacade {
  return Object.freeze({
    queries: Object.freeze({
      listRows: (accessToken: string, query: CreatureApiPhenotypeRowsQuery) =>
        port.listCreaturePhenotypeRows(accessToken, query),
    }),
  });
}
