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
  resolutionPath?:
    | "direct"
    | "nwic-user-row-minus-100"
    | "placeables-user-row-minus-100"
    | "placeables-user-row-minus-100-chain"
    | "placeables-instance-row-minus-100";
}

export interface PlaceableAppearanceModelLookupContext {
  tag?: string;
  templateId?: string;
  resref?: string;
  localizedName?: string;
  description?: string;
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

export interface CreatureAppearanceProfileLookupResult {
  appearanceType: number;
  appearanceLabel?: string;
  appearanceSource2daRow: number;
  appearanceSourceKey?: string;
  modelType?: string;
  raceModel?: string;
  portrait2da?: string;
  envMap?: string;
  defaultPhenotype?: string;
  bloodColor?: string;
  weaponScale?: number;
  sizeCategory?: number;
}

export interface TemplateCatalogRepositoryPort {
  listByKind(kind: TemplateKind, query: TemplateListQuery): Promise<TemplateListResult>;
  findByKindAndId(kind: TemplateKind, templateId: string): Promise<TemplateRecord | null>;
  findByKindAndResref(kind: TemplateKind, resref: string): Promise<TemplateRecord | null>;
  resolvePlaceableAppearanceModel?(
    appearanceType: number,
    context?: PlaceableAppearanceModelLookupContext
  ): Promise<PlaceableAppearanceModelLookupResult | null>;
  resolveDoorAppearanceModel?(input: {
    appearanceType?: number;
    genericType?: number;
    templateId?: string;
    resref?: string;
  }): Promise<DoorAppearanceModelLookupResult | null>;
  resolveCreatureAppearanceProfile?(
    appearanceType: number
  ): Promise<CreatureAppearanceProfileLookupResult | null>;
  getPrecomputedPlaceableCacheKey?(
    templateId: string,
    subtype: PlaceableSubtype
  ): string | null;
  getPrecomputedTemplateCacheKey?(
    kind: Exclude<TemplateKind, "placeable">,
    templateId: string
  ): string | null;
  invalidateSnapshotIndex?(): void;
}
