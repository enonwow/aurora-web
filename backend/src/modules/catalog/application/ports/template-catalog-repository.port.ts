import type {
  PlaceableSubtype,
  TemplateKind,
  TemplateListQuery,
  TemplateListResult,
  TemplateRecord
} from "../../domain/template.types";
import type { EffectivePlaceablesTwoDaDescriptor } from "../../domain/effective-placeables-two-da-descriptor";
import type { EffectivePlaceablesTwoDaRowOption } from "../../domain/effective-placeables-two-da-row-catalog";
import type {
  EffectiveWaypointTwoDaDescriptor,
  EffectiveWaypointTwoDaRowOption,
} from "../../domain/effective-waypoint-two-da";
import type { EffectiveCreatureAppearanceTwoDaDescriptor } from "../../domain/effective-creature-appearance-two-da-descriptor";
import type { EffectiveCreatureAppearanceTwoDaRowOption } from "../../domain/effective-creature-appearance-two-da-row-catalog";
import type {
  EffectiveCreatureGenderTwoDaDescriptor,
  EffectiveCreatureGenderTwoDaRowOption,
} from "../../domain/effective-creature-gender-two-da";
import type {
  EffectiveCreatureAppendageTwoDaDescriptor,
  EffectiveCreatureAppendageTwoDaResourceName,
  EffectiveCreatureAppendageTwoDaRowOption,
} from "../../domain/effective-creature-appendage-two-da";
import type {
  EffectiveCreaturePhenotypeTwoDaDescriptor,
  EffectiveCreaturePhenotypeTwoDaRowOption,
} from "../../domain/effective-creature-phenotype-two-da";
import type {
  EffectiveTrapsTwoDaDescriptor,
  EffectiveTrapsTwoDaRowOption,
} from "../../domain/effective-traps-two-da";
import type { EffectiveItemBaseItemsTwoDaTable } from
  "../../domain/effective-item-base-items-two-da";
import type {
  EffectiveBodyBagTwoDaDescriptor,
  EffectiveBodyBagTwoDaRowOption,
} from "../../domain/effective-bodybag-two-da";
import type { EffectivePortraitsTwoDaTable } from "../../domain/effective-portraits-two-da";
import type { EffectiveCreaturePortraitsTwoDaTable } from
  "../../domain/effective-creature-portraits-two-da";
import type { EffectiveCreatureRacialTypesTwoDaTable } from
  "../../domain/effective-creature-racial-types-two-da";
import type { EffectiveCreaturePerceptionRangesTwoDaTable } from
  "../../domain/effective-creature-perception-ranges-two-da";
import type { EffectiveCreatureWalkRatesTwoDaTable } from
  "../../domain/effective-creature-walk-rates-two-da";
import type { EffectiveCreatureSoundSetsTwoDaTable } from
  "../../domain/effective-creature-sound-sets-two-da";
import type { EffectiveCreatureStartingPackagesTwoDaTable } from
  "../../domain/effective-creature-starting-packages-two-da";
import type { EffectiveCreatureClassesTwoDaTable } from
  "../../domain/effective-creature-classes-two-da";
import type { EffectiveCreatureSkillsTwoDaTable } from
  "../../domain/effective-creature-skills-two-da";
import type { EffectiveCreatureFeatsTwoDaTable } from
  "../../domain/effective-creature-feats-two-da";
import type { EffectiveCreatureSpecialAbilitiesTwoDaTable } from
  "../../domain/effective-creature-special-abilities-two-da";
import type { ModuleFactionCatalog } from "../../domain/module-faction-catalog";
import type { EffectiveAreaAudioCatalogBundle } from "../../domain/effective-area-audio-two-da";
import type { EffectiveAreaLoadingScreenCatalog } from "../../domain/effective-area-loading-screen-two-da";
import type { EffectiveAreaVisualEnvironmentCatalogBundle } from "../../domain/effective-area-visual-environment-two-da";
import type { EffectiveAreaEncounterDifficultyCatalog } from
  "../../domain/effective-area-encounter-difficulty-two-da";

export type { EffectivePlaceablesTwoDaDescriptor } from "../../domain/effective-placeables-two-da-descriptor";
export type { EffectiveCreatureAppearanceTwoDaDescriptor } from "../../domain/effective-creature-appearance-two-da-descriptor";
export type { EffectiveCreatureGenderTwoDaDescriptor } from "../../domain/effective-creature-gender-two-da";
export type { EffectiveCreatureAppendageTwoDaDescriptor } from
  "../../domain/effective-creature-appendage-two-da";
export type { EffectiveCreaturePhenotypeTwoDaDescriptor } from
  "../../domain/effective-creature-phenotype-two-da";

export interface EffectivePlaceablesTwoDaRowsQuery {
  query?: string;
  limit: number;
  offset: number;
}

export interface EffectivePlaceablesTwoDaRowsResult {
  descriptor: EffectivePlaceablesTwoDaDescriptor;
  items: EffectivePlaceablesTwoDaRowOption[];
  total: number;
  limit: number;
  offset: number;
}

export interface EffectiveWaypointTwoDaRowsQuery {
  query?: string;
  limit: number;
  offset: number;
}

export interface EffectiveWaypointTwoDaRowsResult {
  descriptor: EffectiveWaypointTwoDaDescriptor;
  items: EffectiveWaypointTwoDaRowOption[];
  total: number;
  limit: number;
  offset: number;
}

export interface EffectiveWaypointTwoDaRowResult {
  descriptor: EffectiveWaypointTwoDaDescriptor;
  row: EffectiveWaypointTwoDaRowOption | null;
}

export interface EffectiveCreatureAppearanceTwoDaRowsQuery {
  query?: string;
  limit: number;
  offset: number;
}

export interface EffectiveCreatureAppearanceTwoDaRowsResult {
  descriptor: EffectiveCreatureAppearanceTwoDaDescriptor;
  items: EffectiveCreatureAppearanceTwoDaRowOption[];
  total: number;
  limit: number;
  offset: number;
}

export interface EffectiveCreatureAppearanceTwoDaRowResult {
  descriptor: EffectiveCreatureAppearanceTwoDaDescriptor;
  row: EffectiveCreatureAppearanceTwoDaRowOption | null;
}

export interface EffectiveCreatureGenderTwoDaRowsQuery {
  query?: string;
  limit: number;
  offset: number;
}

export interface EffectiveCreatureGenderTwoDaRowsResult {
  descriptor: EffectiveCreatureGenderTwoDaDescriptor;
  items: EffectiveCreatureGenderTwoDaRowOption[];
  total: number;
  limit: number;
  offset: number;
}

export interface EffectiveCreatureGenderTwoDaRowResult {
  descriptor: EffectiveCreatureGenderTwoDaDescriptor;
  row: EffectiveCreatureGenderTwoDaRowOption | null;
}

export interface EffectiveCreatureAppendageTwoDaRowsQuery {
  query?: string;
  limit: number;
  offset: number;
}

export interface EffectiveCreatureAppendageTwoDaRowsResult {
  descriptor: EffectiveCreatureAppendageTwoDaDescriptor;
  items: EffectiveCreatureAppendageTwoDaRowOption[];
  total: number;
  limit: number;
  offset: number;
}

export interface EffectiveCreatureAppendageTwoDaRowResult {
  descriptor: EffectiveCreatureAppendageTwoDaDescriptor;
  row: EffectiveCreatureAppendageTwoDaRowOption | null;
}

export interface EffectiveCreaturePhenotypeTwoDaRowsQuery {
  query?: string;
  limit: number;
  offset: number;
}

export interface EffectiveCreaturePhenotypeTwoDaRowsResult {
  descriptor: EffectiveCreaturePhenotypeTwoDaDescriptor;
  items: EffectiveCreaturePhenotypeTwoDaRowOption[];
  total: number;
  limit: number;
  offset: number;
}

export interface EffectiveCreaturePhenotypeTwoDaRowResult {
  descriptor: EffectiveCreaturePhenotypeTwoDaDescriptor;
  row: EffectiveCreaturePhenotypeTwoDaRowOption | null;
}

export interface EffectiveTrapsTwoDaTableResult {
  descriptor: EffectiveTrapsTwoDaDescriptor;
  rows: EffectiveTrapsTwoDaRowOption[];
}

export type EffectiveItemBaseItemsTwoDaTableResult = EffectiveItemBaseItemsTwoDaTable;

export interface EffectiveBodyBagTwoDaTableResult {
  descriptor: EffectiveBodyBagTwoDaDescriptor;
  rows: EffectiveBodyBagTwoDaRowOption[];
}

export type EffectivePortraitsTwoDaTableResult = EffectivePortraitsTwoDaTable;
export type EffectiveCreaturePortraitsTwoDaTableResult = EffectiveCreaturePortraitsTwoDaTable;
export type EffectiveCreatureRacialTypesTwoDaTableResult =
  EffectiveCreatureRacialTypesTwoDaTable;
export type EffectiveCreaturePerceptionRangesTwoDaTableResult =
  EffectiveCreaturePerceptionRangesTwoDaTable;
export type EffectiveCreatureWalkRatesTwoDaTableResult = EffectiveCreatureWalkRatesTwoDaTable;
export type EffectiveCreatureSoundSetsTwoDaTableResult = EffectiveCreatureSoundSetsTwoDaTable;
export type EffectiveCreatureStartingPackagesTwoDaTableResult =
  EffectiveCreatureStartingPackagesTwoDaTable;
export type EffectiveCreatureClassesTwoDaTableResult = EffectiveCreatureClassesTwoDaTable;
export type EffectiveCreatureSkillsTwoDaTableResult = EffectiveCreatureSkillsTwoDaTable;
export type EffectiveCreatureFeatsTwoDaTableResult = EffectiveCreatureFeatsTwoDaTable;
export type EffectiveCreatureSpecialAbilitiesTwoDaTableResult =
  EffectiveCreatureSpecialAbilitiesTwoDaTable;
export type ModuleFactionCatalogResult = ModuleFactionCatalog;
export type EffectiveAreaAudioCatalogBundleResult = EffectiveAreaAudioCatalogBundle;
export type EffectiveAreaLoadingScreenCatalogResult = EffectiveAreaLoadingScreenCatalog;
export type EffectiveAreaVisualEnvironmentCatalogBundleResult = EffectiveAreaVisualEnvironmentCatalogBundle;
export type EffectiveAreaEncounterDifficultyCatalogResult =
  EffectiveAreaEncounterDifficultyCatalog;

export interface EffectiveTemplateBlueprintRequest {
  kind: TemplateKind;
  templateId: string;
  sourceObjectKey: string;
  expectedSha256: string;
}

export interface EffectiveTemplateBlueprintResult {
  kind: TemplateKind;
  templateId: string;
  resref: string;
  sourceObjectKey: string;
  sha256: string;
  bytes: Buffer;
  dependencies?: readonly Readonly<{
    templateResRef: string;
    resourceType: number;
    sha256: string;
    bytes: Buffer;
  }>[];
}

export const TEMPLATE_CATALOG_REPOSITORY = Symbol("TEMPLATE_CATALOG_REPOSITORY");

export interface PlaceableAppearanceModelLookupResult {
  modelResRef: string;
  source2da: "placeables.2da";
  rowId: number;
  source2daLightColorRaw?: string;
  source2daLightColorRow?: number;
  source2daLightColorLabel?: string;
  source2daLightColorSourceKey?: string;
  source2daLightRed?: number;
  source2daLightGreen?: number;
  source2daLightBlue?: number;
  source2daToolsetRed?: number;
  source2daToolsetGreen?: number;
  source2daToolsetBlue?: number;
  source2daLightOffsetX?: number;
  source2daLightOffsetY?: number;
  source2daLightOffsetZ?: number;
  source2daShadowSize?: number;
  source2daStatic?: boolean;
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
  resolveEffectiveTemplateBlueprint?(
    request: EffectiveTemplateBlueprintRequest
  ): Promise<EffectiveTemplateBlueprintResult | null>;
  resolvePlaceableAppearanceModel?(
    appearanceType: number,
    context?: PlaceableAppearanceModelLookupContext
  ): Promise<PlaceableAppearanceModelLookupResult | null>;
  resolveEffectivePlaceablesTwoDaDescriptor?(): Promise<EffectivePlaceablesTwoDaDescriptor | null>;
  listEffectivePlaceablesTwoDaRows?(
    query: EffectivePlaceablesTwoDaRowsQuery
  ): Promise<EffectivePlaceablesTwoDaRowsResult | null>;
  resolveEffectiveWaypointTwoDaDescriptor?(): Promise<EffectiveWaypointTwoDaDescriptor | null>;
  listEffectiveWaypointTwoDaRows?(
    query: EffectiveWaypointTwoDaRowsQuery
  ): Promise<EffectiveWaypointTwoDaRowsResult | null>;
  resolveEffectiveWaypointTwoDaRow?(
    rowIndex: number
  ): Promise<EffectiveWaypointTwoDaRowResult | null>;
  resolveEffectiveCreatureAppearanceTwoDaDescriptor?(): Promise<
    EffectiveCreatureAppearanceTwoDaDescriptor | null
  >;
  listEffectiveCreatureAppearanceTwoDaRows?(
    query: EffectiveCreatureAppearanceTwoDaRowsQuery
  ): Promise<EffectiveCreatureAppearanceTwoDaRowsResult | null>;
  resolveEffectiveCreatureAppearanceTwoDaRow?(
    rowIndex: number
  ): Promise<EffectiveCreatureAppearanceTwoDaRowResult | null>;
  resolveEffectiveCreatureGenderTwoDaDescriptor?(): Promise<
    EffectiveCreatureGenderTwoDaDescriptor | null
  >;
  listEffectiveCreatureGenderTwoDaRows?(
    query: EffectiveCreatureGenderTwoDaRowsQuery
  ): Promise<EffectiveCreatureGenderTwoDaRowsResult | null>;
  resolveEffectiveCreatureGenderTwoDaRow?(
    rowIndex: number
  ): Promise<EffectiveCreatureGenderTwoDaRowResult | null>;
  resolveEffectiveCreatureAppendageTwoDaDescriptor?(
    resourceName: EffectiveCreatureAppendageTwoDaResourceName,
  ): Promise<EffectiveCreatureAppendageTwoDaDescriptor | null>;
  listEffectiveCreatureAppendageTwoDaRows?(
    resourceName: EffectiveCreatureAppendageTwoDaResourceName,
    query: EffectiveCreatureAppendageTwoDaRowsQuery,
  ): Promise<EffectiveCreatureAppendageTwoDaRowsResult | null>;
  resolveEffectiveCreatureAppendageTwoDaRow?(
    resourceName: EffectiveCreatureAppendageTwoDaResourceName,
    rowIndex: number,
  ): Promise<EffectiveCreatureAppendageTwoDaRowResult | null>;
  resolveEffectiveCreaturePhenotypeTwoDaDescriptor?(): Promise<
    EffectiveCreaturePhenotypeTwoDaDescriptor | null
  >;
  listEffectiveCreaturePhenotypeTwoDaRows?(
    query: EffectiveCreaturePhenotypeTwoDaRowsQuery
  ): Promise<EffectiveCreaturePhenotypeTwoDaRowsResult | null>;
  resolveEffectiveCreaturePhenotypeTwoDaRow?(
    rowIndex: number
  ): Promise<EffectiveCreaturePhenotypeTwoDaRowResult | null>;
  resolveEffectiveTrapsTwoDaTable?(): Promise<EffectiveTrapsTwoDaTableResult | null>;
  resolveEffectiveItemBaseItemsTwoDaTable?(): Promise<
    EffectiveItemBaseItemsTwoDaTableResult | null
  >;
  resolveEffectiveBodyBagTwoDaTable?(): Promise<EffectiveBodyBagTwoDaTableResult | null>;
  resolveEffectivePortraitsTwoDaTable?(): Promise<EffectivePortraitsTwoDaTableResult | null>;
  resolveEffectiveCreaturePortraitsTwoDaTable?(): Promise<
    EffectiveCreaturePortraitsTwoDaTableResult | null
  >;
  resolveEffectiveCreatureRacialTypesTwoDaTable?(): Promise<
    EffectiveCreatureRacialTypesTwoDaTableResult | null
  >;
  resolveEffectiveCreaturePerceptionRangesTwoDaTable?(): Promise<
    EffectiveCreaturePerceptionRangesTwoDaTableResult | null
  >;
  resolveEffectiveCreatureWalkRatesTwoDaTable?(): Promise<
    EffectiveCreatureWalkRatesTwoDaTableResult | null
  >;
  resolveEffectiveCreatureSoundSetsTwoDaTable?(): Promise<
    EffectiveCreatureSoundSetsTwoDaTableResult | null
  >;
  resolveEffectiveCreatureStartingPackagesTwoDaTable?(): Promise<
    EffectiveCreatureStartingPackagesTwoDaTableResult | null
  >;
  resolveEffectiveCreatureClassesTwoDaTable?(): Promise<
    EffectiveCreatureClassesTwoDaTableResult | null
  >;
  resolveEffectiveCreatureSkillsTwoDaTable?(): Promise<
    EffectiveCreatureSkillsTwoDaTableResult | null
  >;
  resolveEffectiveCreatureFeatsTwoDaTable?(): Promise<
    EffectiveCreatureFeatsTwoDaTableResult | null
  >;
  resolveEffectiveCreatureSpecialAbilitiesTwoDaTable?(): Promise<
    EffectiveCreatureSpecialAbilitiesTwoDaTableResult | null
  >;
  resolveEffectiveAreaAudioCatalogs?(): Promise<EffectiveAreaAudioCatalogBundleResult | null>;
  resolveEffectiveAreaVisualEnvironmentCatalogs?(): Promise<EffectiveAreaVisualEnvironmentCatalogBundleResult | null>;
  resolveEffectiveAreaLoadingScreenCatalog?(): Promise<EffectiveAreaLoadingScreenCatalogResult | null>;
  resolveEffectiveAreaEncounterDifficultyCatalog?(): Promise<
    EffectiveAreaEncounterDifficultyCatalogResult | null
  >;
  resolveModuleFactionCatalog?(): Promise<ModuleFactionCatalogResult | null>;
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
