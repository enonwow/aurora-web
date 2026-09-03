import type {
  CreatureApiSoundSetRowsQuery,
  CreatureApiSoundSetRowsResult,
} from "../contracts";
import type { CreatureApiPort } from "../ports/creatureApiPort";

export interface CreatureSoundSetCatalogFacade {
  readonly queries: Readonly<{
    listRows(
      accessToken: string,
      query: CreatureApiSoundSetRowsQuery,
    ): Promise<CreatureApiSoundSetRowsResult>;
  }>;
}

export function createCreatureSoundSetCatalogFacade(
  port: Pick<CreatureApiPort, "listCreatureSoundSetRows">,
): CreatureSoundSetCatalogFacade {
  return Object.freeze({
    queries: Object.freeze({
      listRows: (accessToken: string, query: CreatureApiSoundSetRowsQuery) =>
        port.listCreatureSoundSetRows(accessToken, query),
    }),
  });
}
