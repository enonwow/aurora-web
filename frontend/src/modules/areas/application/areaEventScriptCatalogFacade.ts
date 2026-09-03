import type {
  AreaEventScriptCatalog,
  AreaEventScriptCatalogQuery,
} from "../domain/areaEventScriptCatalog";
import type { AreaEventScriptCatalogPort } from "../ports/areaEventScriptCatalogPort";

export type AreaEventScriptCatalogQueryResult =
  | Readonly<{ ok: true; value: AreaEventScriptCatalog }>
  | Readonly<{
      ok: false;
      error: Readonly<{
        code: "PORT_FAILURE";
        message: string;
        retryable: true;
      }>;
    }>;

export interface AreaEventScriptCatalogFacade {
  load(
    accessToken: string,
    query: AreaEventScriptCatalogQuery,
  ): Promise<AreaEventScriptCatalogQueryResult>;
}

export function createAreaEventScriptCatalogFacade(
  port: AreaEventScriptCatalogPort,
): AreaEventScriptCatalogFacade {
  return Object.freeze({
    async load(
      accessToken: string,
      query: AreaEventScriptCatalogQuery,
    ): Promise<AreaEventScriptCatalogQueryResult> {
      try {
        return Object.freeze({ ok: true, value: await port.list(accessToken, query) });
      } catch {
        return Object.freeze({
          ok: false,
          error: Object.freeze({
            code: "PORT_FAILURE",
            message: "The Area event-script catalog could not be loaded.",
            retryable: true,
          }),
        });
      }
    },
  });
}
