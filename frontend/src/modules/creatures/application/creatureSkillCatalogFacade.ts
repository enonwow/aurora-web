import type {
  CreatureApiSkillRowsQuery,
  CreatureApiSkillRowsResult,
} from "../contracts";
import type { CreatureApiPort } from "../ports/creatureApiPort";

export interface CreatureSkillCatalogFacade {
  readonly queries: Readonly<{
    listRows(
      accessToken: string,
      query: CreatureApiSkillRowsQuery,
    ): Promise<CreatureApiSkillRowsResult>;
  }>;
}

export function createCreatureSkillCatalogFacade(
  port: Pick<CreatureApiPort, "listCreatureSkillRows">,
): CreatureSkillCatalogFacade {
  return Object.freeze({
    queries: Object.freeze({
      listRows: (accessToken: string, query: CreatureApiSkillRowsQuery) =>
        port.listCreatureSkillRows(accessToken, query),
    }),
  });
}
