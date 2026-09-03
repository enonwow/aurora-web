import type {
  CreatureApiAppearanceRowsQuery,
  CreatureApiAppearanceRowsResult,
} from "../contracts";
import type { CreatureApiPort } from "../ports/creatureApiPort";

export interface CreatureAppearanceCatalogFacade {
  readonly queries: Readonly<{
    listRows(
      accessToken: string,
      query: CreatureApiAppearanceRowsQuery,
    ): Promise<CreatureApiAppearanceRowsResult>;
  }>;
}

export function createCreatureAppearanceCatalogFacade(
  port: Pick<CreatureApiPort, "listCreatureAppearanceRows">,
): CreatureAppearanceCatalogFacade {
  return Object.freeze({
    queries: Object.freeze({
      listRows: (accessToken: string, query: CreatureApiAppearanceRowsQuery) =>
        port.listCreatureAppearanceRows(accessToken, query),
    }),
  });
}
