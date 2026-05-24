import type {
  PlaceableSubtype,
  TemplateKind,
  TemplateListQuery,
  TemplateListResult,
  TemplateRecord
} from "../../domain/template.types";

export const TEMPLATE_CATALOG_REPOSITORY = Symbol("TEMPLATE_CATALOG_REPOSITORY");

export interface TemplateCatalogRepositoryPort {
  listByKind(kind: TemplateKind, query: TemplateListQuery): Promise<TemplateListResult>;
  findByKindAndId(kind: TemplateKind, templateId: string): Promise<TemplateRecord | null>;
  findByKindAndResref(kind: TemplateKind, resref: string): Promise<TemplateRecord | null>;
  getPrecomputedPlaceableCacheKey?(
    templateId: string,
    subtype: PlaceableSubtype
  ): string | null;
  getPrecomputedTemplateCacheKey?(
    kind: "creature" | "item",
    templateId: string
  ): string | null;
}
