import type {
  PlaceableSubtype,
  TemplateKind,
  TemplateListQuery,
  TemplateListResult,
  TemplateRecord
} from "../../domain/template.types";

export const TEMPLATE_CATALOG_REPOSITORY = Symbol("TEMPLATE_CATALOG_REPOSITORY");

export interface PlaceableAppearanceModelLookupResult {
  modelResRef: string;
  source2da: "placeables.2da";
  rowId: number;
  requestedRowId?: number;
  sourceKey?: string;
  resolutionPath?: "direct" | "nwic-user-row-minus-100";
}

export interface DoorAppearanceModelLookupResult {
  modelResRef?: string;
  appearanceType?: number;
  genericType?: number;
  doortypesSourceKey?: string;
  doortypesRowId?: number;
  doortypesLabel?: string;
  doortypesModelResRef?: string;
  genericdoorsSourceKey?: string;
  genericdoorsRowId?: number;
  genericdoorsLabel?: string;
  genericdoorsModelResRef?: string;
  doortypesAvailable: boolean;
  genericdoorsAvailable: boolean;
}

export interface TemplateCatalogRepositoryPort {
  listByKind(kind: TemplateKind, query: TemplateListQuery): Promise<TemplateListResult>;
  findByKindAndId(kind: TemplateKind, templateId: string): Promise<TemplateRecord | null>;
  findByKindAndResref(kind: TemplateKind, resref: string): Promise<TemplateRecord | null>;
  resolvePlaceableAppearanceModel?(
    appearanceType: number
  ): Promise<PlaceableAppearanceModelLookupResult | null>;
  resolveDoorAppearanceModel?(input: {
    appearanceType?: number;
    genericType?: number;
  }): Promise<DoorAppearanceModelLookupResult | null>;
  getPrecomputedPlaceableCacheKey?(
    templateId: string,
    subtype: PlaceableSubtype
  ): string | null;
  getPrecomputedTemplateCacheKey?(
    kind: "creature" | "item",
    templateId: string
  ): string | null;
}
