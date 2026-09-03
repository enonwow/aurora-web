import type {
  CreatureApiSpecialAbilityRowsQuery,
  CreatureApiSpecialAbilityRowsResult,
} from "../contracts";
import type { CreatureApiPort } from "../ports/creatureApiPort";

export interface CreatureSpecialAbilityCatalogFacade {
  readonly queries: Readonly<{
    listRows(
      accessToken: string,
      query: CreatureApiSpecialAbilityRowsQuery,
    ): Promise<CreatureApiSpecialAbilityRowsResult>;
  }>;
}

export function createCreatureSpecialAbilityCatalogFacade(
  port: Pick<CreatureApiPort, "listCreatureSpecialAbilityRows">,
): CreatureSpecialAbilityCatalogFacade {
  return Object.freeze({
    queries: Object.freeze({
      listRows: (accessToken: string, query: CreatureApiSpecialAbilityRowsQuery) =>
        port.listCreatureSpecialAbilityRows(accessToken, query),
    }),
  });
}
