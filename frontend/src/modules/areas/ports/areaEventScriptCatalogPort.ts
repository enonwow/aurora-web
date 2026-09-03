import type {
  AreaEventScriptCatalog,
  AreaEventScriptCatalogQuery,
} from "../domain/areaEventScriptCatalog";

export interface AreaEventScriptCatalogPort {
  list(
    accessToken: string,
    query: AreaEventScriptCatalogQuery,
  ): Promise<AreaEventScriptCatalog>;
}
