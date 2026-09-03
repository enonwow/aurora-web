import { createHash } from "node:crypto";
import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { Inject, Injectable, Logger, OnModuleDestroy, Optional } from "@nestjs/common";
import type {
  ModuleBlobObjectSummary,
  ModuleBlobSnapshotSummary,
  ModuleBlobStoragePort
} from "../../../../runtime-settings/application/ports/module-blob-storage.port";
import { MODULE_BLOB_STORAGE } from "../../../../runtime-settings/application/ports/module-blob-storage.port";
import type { RuntimeSettingsRepositoryPort } from "../../../../runtime-settings/application/ports/runtime-settings-repository.port";
import { RUNTIME_SETTINGS_REPOSITORY } from "../../../../runtime-settings/application/ports/runtime-settings-repository.port";
import { RuntimeSettingsApplicationService } from "../../../../runtime-settings/application/runtime-settings.application.service";
import {
  NwnKeyBifResourceReader,
  NWN_KEY_BIF_RESOURCE_TYPES
} from "../../../../runtime-settings/application/nwn-key-bif-resource-reader";
import type {
  BlobStorageSettings,
  RuntimeSettingsRecord,
  RuntimePathSettings
} from "../../../../runtime-settings/domain/runtime-settings.types";
import { readNwnErfResource } from "../../../../runtime-settings/adapters/outbound/nwn/nwn-erf-packed-module-extractor.service";
import {
  BLANK_CELL,
  parseAuroraTwoDaTable,
  type AuroraTwoDaRow
} from "../../../../../common/aurora/two-da/aurora-two-da-table";
import { executeInFlight } from "../../../../../common/async/in-flight.helpers";
import {
  COMMITTED_MODULE_SNAPSHOT_READER,
  type CapturedCommittedModuleSnapshot,
  type CommittedModuleSnapshotReaderPort,
} from "../../../../module-snapshots/application/ports/committed-module-snapshot-reader.port";
import { resolveHostLocalMountedPath } from "../../../../../common/host/host-local-paths";
import type {
  CreatureAppearanceProfileLookupResult,
  DoorAppearanceModelLookupResult,
  PlaceableAppearanceModelLookupContext,
  PlaceableAppearanceModelLookupResult,
  TemplateCatalogRepositoryPort,
  EffectiveTemplateBlueprintRequest,
  EffectiveTemplateBlueprintResult,
} from "../../../application/ports/template-catalog-repository.port";
import {
  buildPlaceableProcessCacheKey,
  buildTemplateProcessCacheKey
} from "../../../domain/cache-key.builders";
import type {
  PlaceableSubtype,
  TemplateKind,
  TemplateListQuery,
  TemplateListResult,
  TemplateRecord
} from "../../../domain/template.types";
import {
  buildEffectivePlaceablesTwoDaDescriptor,
  type EffectivePlaceablesTwoDaDescriptor,
} from "../../../domain/effective-placeables-two-da-descriptor";
import {
  buildEffectivePlaceablesTwoDaRowOptions,
  parseEffectivePlaceablesTwoDaRows,
  shouldAdmitEffectivePlaceablesTwoDaSource,
  type EffectivePlaceablesTwoDaRowOption,
  type EffectivePlaceablesTwoDaSourceRow,
} from "../../../domain/effective-placeables-two-da-row-catalog";
import {
  buildEffectiveWaypointTwoDaDescriptor,
  buildEffectiveWaypointTwoDaRowOptions,
  parseEffectiveWaypointTwoDaRows,
  type EffectiveWaypointTwoDaDescriptor,
  type EffectiveWaypointTwoDaRowOption,
  type EffectiveWaypointTwoDaSourceRow,
} from "../../../domain/effective-waypoint-two-da";
import {
  buildEffectiveCreatureAppearanceTwoDaDescriptor,
  type EffectiveCreatureAppearanceTwoDaDescriptor,
  type EffectiveCreatureAppearanceTwoDaSourceLayer,
} from "../../../domain/effective-creature-appearance-two-da-descriptor";
import {
  buildEffectiveCreatureAppearanceTwoDaRowOptions,
  parseEffectiveCreatureAppearanceTwoDaRows,
  shouldAdmitEffectiveCreatureAppearanceTwoDaSource,
  type EffectiveCreatureAppearanceTwoDaRowOption,
  type EffectiveCreatureAppearanceTwoDaSourceRow,
} from "../../../domain/effective-creature-appearance-two-da-row-catalog";
import {
  buildEffectiveCreatureGenderTwoDaDescriptor,
  buildEffectiveCreatureGenderTwoDaRowOptions,
  parseEffectiveCreatureGenderTwoDaRows,
  type EffectiveCreatureGenderTwoDaDescriptor,
  type EffectiveCreatureGenderTwoDaRowOption,
  type EffectiveCreatureGenderTwoDaSourceLayer,
  type EffectiveCreatureGenderTwoDaSourceRow,
} from "../../../domain/effective-creature-gender-two-da";
import {
  buildEffectiveCreatureAppendageTwoDaDescriptor,
  buildEffectiveCreatureAppendageTwoDaRowOptions,
  parseEffectiveCreatureAppendageTwoDaRows,
  type EffectiveCreatureAppendageTwoDaDescriptor,
  type EffectiveCreatureAppendageTwoDaResourceName,
  type EffectiveCreatureAppendageTwoDaRowOption,
  type EffectiveCreatureAppendageTwoDaSourceLayer,
  type EffectiveCreatureAppendageTwoDaSourceRow,
} from "../../../domain/effective-creature-appendage-two-da";
import {
  buildEffectiveCreaturePhenotypeTwoDaDescriptor,
  buildEffectiveCreaturePhenotypeTwoDaRowOptions,
  parseEffectiveCreaturePhenotypeTwoDaRows,
  type EffectiveCreaturePhenotypeTwoDaDescriptor,
  type EffectiveCreaturePhenotypeTwoDaRowOption,
  type EffectiveCreaturePhenotypeTwoDaSourceLayer,
  type EffectiveCreaturePhenotypeTwoDaSourceRow,
} from "../../../domain/effective-creature-phenotype-two-da";
import {
  buildEffectiveTrapsTwoDaRowOptions,
  parseEffectiveTrapsTwoDa,
  type EffectiveTrapsTwoDaDescriptor,
  type EffectiveTrapsTwoDaRowOption,
  type EffectiveTrapsTwoDaTable,
} from "../../../domain/effective-traps-two-da";
import {
  parseEffectiveItemBaseItemsTwoDa,
  type EffectiveItemBaseItemRow,
  type EffectiveItemBaseItemsTwoDaDescriptor,
  type EffectiveItemBaseItemsTwoDaTable,
} from "../../../domain/effective-item-base-items-two-da";
import {
  buildEffectiveBodyBagTwoDaRowOptions,
  parseEffectiveBodyBagTwoDa,
  type EffectiveBodyBagTwoDaDescriptor,
  type EffectiveBodyBagTwoDaRowOption,
  type EffectiveBodyBagTwoDaTable,
} from "../../../domain/effective-bodybag-two-da";
import {
  parseEffectivePortraitsTwoDa,
  type EffectivePortraitsTwoDaDescriptor,
  type EffectivePortraitsTwoDaRow,
  type EffectivePortraitsTwoDaTable,
} from "../../../domain/effective-portraits-two-da";
import {
  parseEffectiveCreaturePortraitsTwoDa,
  type EffectiveCreaturePortraitsTwoDaDescriptor,
  type EffectiveCreaturePortraitsTwoDaRow,
  type EffectiveCreaturePortraitsTwoDaTable,
} from "../../../domain/effective-creature-portraits-two-da";
import {
  parseEffectiveCreatureRacialTypesTwoDa,
  type EffectiveCreatureRacialTypesTwoDaTable,
} from "../../../domain/effective-creature-racial-types-two-da";
import {
  localizeEffectiveCreaturePerceptionRangesTwoDa,
  parseEffectiveCreaturePerceptionRangesTwoDa,
  type EffectiveCreaturePerceptionRangesTwoDaTable,
} from "../../../domain/effective-creature-perception-ranges-two-da";
import {
  localizeEffectiveCreatureWalkRatesTwoDa,
  parseEffectiveCreatureWalkRatesTwoDa,
  type EffectiveCreatureWalkRatesTwoDaTable,
} from "../../../domain/effective-creature-walk-rates-two-da";
import {
  localizeEffectiveCreatureSoundSetsTwoDa,
  parseEffectiveCreatureSoundSetsTwoDa,
  type EffectiveCreatureSoundSetsTwoDaTable,
} from "../../../domain/effective-creature-sound-sets-two-da";
import {
  localizeEffectiveCreatureStartingPackagesTwoDa,
  parseEffectiveCreatureStartingPackagesTwoDa,
  type EffectiveCreatureStartingPackagesTwoDaTable,
} from "../../../domain/effective-creature-starting-packages-two-da";
import {
  localizeEffectiveCreatureClassesTwoDa,
  parseEffectiveCreatureClassesTwoDa,
  type EffectiveCreatureClassesTwoDaTable,
} from "../../../domain/effective-creature-classes-two-da";
import {
  localizeEffectiveCreatureSkillsTwoDa,
  parseEffectiveCreatureSkillsTwoDa,
  type EffectiveCreatureSkillsTwoDaTable,
} from "../../../domain/effective-creature-skills-two-da";
import {
  localizeEffectiveCreatureFeatsTwoDa,
  parseEffectiveCreatureFeatsTwoDa,
  type EffectiveCreatureFeatsTwoDaTable,
} from "../../../domain/effective-creature-feats-two-da";
import {
  localizeEffectiveCreatureSpecialAbilitiesTwoDa,
  parseEffectiveCreatureSpecialAbilitiesTwoDa,
  type EffectiveCreatureSpecialAbilitiesTwoDaTable,
} from "../../../domain/effective-creature-special-abilities-two-da";
import {
  AREA_AUDIO_ENVIRONMENT_CATALOGS_SCHEMA_VERSION,
  buildEffectiveAreaAudioCatalog,
  isExactEffectiveAreaAudioCatalogBundle,
  parseEffectiveAreaAudioTwoDa,
  type EffectiveAreaAudioCatalogBundle,
  type EffectiveAreaAudioTwoDaResourceName,
  type EffectiveAreaAudioTwoDaTable,
} from "../../../domain/effective-area-audio-two-da";
import {
  AREA_LOADING_SCREEN_CATALOG_SCHEMA_VERSION,
  AREA_LOADING_SCREEN_DEFAULT_STRREF,
  MAX_EFFECTIVE_AREA_LOADING_SCREEN_IMAGE_BYTES,
  MAX_EFFECTIVE_AREA_LOADING_SCREEN_IMAGES,
  MAX_EFFECTIVE_AREA_LOADING_SCREEN_TOTAL_IMAGE_BYTES,
  buildEffectiveAreaLoadingScreenCatalog,
  isExactEffectiveAreaLoadingScreenCatalog,
  parseEffectiveAreaLoadingScreenTwoDa,
  type EffectiveAreaLoadingScreenCatalog,
  type EffectiveAreaLoadingScreenImageAsset,
  type EffectiveAreaLoadingScreenTwoDaTable,
} from "../../../domain/effective-area-loading-screen-two-da";
import {
  AREA_VISUAL_ENVIRONMENT_CATALOGS_SCHEMA_VERSION,
  buildEffectiveAreaLightingSchemeCatalog,
  buildEffectiveAreaSkyBoxCatalog,
  isExactEffectiveAreaVisualEnvironmentCatalogBundle,
  parseEffectiveAreaEnvironmentTwoDa,
  parseEffectiveAreaSkyBoxesTwoDa,
  type EffectiveAreaEnvironmentTwoDaTable,
  type EffectiveAreaSkyBoxesTwoDaTable,
  type EffectiveAreaVisualEnvironmentCatalogBundle,
  type EffectiveAreaVisualResourceName,
} from "../../../domain/effective-area-visual-environment-two-da";
import {
  buildEffectiveAreaEncounterDifficultyCatalog,
  isExactEffectiveAreaEncounterDifficultyCatalog,
  parseEffectiveAreaEncounterDifficultyTwoDa,
  type EffectiveAreaEncounterDifficultyCatalog,
  type EffectiveAreaEncounterDifficultyTwoDaTable,
} from "../../../domain/effective-area-encounter-difficulty-two-da";
import type { ModuleFactionCatalog } from "../../../domain/module-faction-catalog";
import { parseModuleFactionCatalog } from "./aurora-gff-faction-catalog";
import {
  type ParsedItemPropertyListEntry,
  type ParsedTemplateBlueprint,
  parseRawGffDocument,
  parseTemplateBlueprintFromGff,
} from "./aurora-gff-template-parser";
import type { SupportedGffField } from "./aurora-gff-uti-writer";
import { SystemMaintenanceApplicationService } from "../../../../system-maintenance/application/system-maintenance.application.service";

const MAX_EFFECTIVE_TEMPLATE_BLUEPRINT_BYTES = 1024 * 1024;
const MAX_EFFECTIVE_PLACEABLE_INVENTORY_DEPENDENCIES = 2;
const MAX_EFFECTIVE_ITEM_NESTED_DEPTH = 8;
const MAX_EFFECTIVE_ITEM_REFERENCE_OCCURRENCES = 1024;
const MAX_EFFECTIVE_ITEM_UNIQUE_DEPENDENCIES = 256;
const MAX_EFFECTIVE_ITEM_DEPENDENCY_BYTES = 16 * 1024 * 1024;
const EFFECTIVE_ITEM_EQUIPMENT_SLOT_MASKS = new Set<number>([
  0x1, 0x2, 0x4, 0x8, 0x10, 0x20, 0x40, 0x80, 0x100,
  0x200, 0x400, 0x800, 0x1000, 0x2000, 0x4000, 0x8000,
  0x10000, 0x20000,
]);

function parseCanonicalEffectiveItemReferences(
  bytes: Buffer,
  expectedTemplateResRef: string,
): readonly string[] | null {
  const document = parseRawGffDocument(bytes);
  if (!document || document.fileType !== "UTI " || document.fileVersion !== "V3.2" ||
    document.rootStructTypeId !== 0xffffffff) {
    return null;
  }
  const templates = document.fields.filter((field) => field.label === "TemplateResRef");
  if (templates.length !== 1 || templates[0]?.type !== "resref" ||
    templates[0].value !== expectedTemplateResRef) {
    return null;
  }
  const references: string[] = [];
  const itemLists = document.fields.filter((field) => field.label === "ItemList");
  if (itemLists.length > 1 || (itemLists.length === 1 && itemLists[0]?.type !== "list")) {
    return null;
  }
  const itemList = itemLists[0] as Extract<SupportedGffField, { type: "list" }> | undefined;
  if (itemList) {
    for (let sourceIndex = 0; sourceIndex < itemList.value.length; sourceIndex += 1) {
      const entry = itemList.value[sourceIndex];
      if (!entry || entry.typeId !== sourceIndex || entry.fields.length !== 3) return null;
      const [inventoryRes, reposX, reposY] = entry.fields;
      if (inventoryRes?.label !== "InventoryRes" || inventoryRes.type !== "resref" ||
        !/^[a-z0-9_]{1,16}$/u.test(inventoryRes.value) ||
        reposX?.label !== "Repos_PosX" || reposX.type !== "word" ||
        reposY?.label !== "Repos_Posy" || reposY.type !== "word") {
        return null;
      }
      references.push(inventoryRes.value);
    }
  }
  const equipLists = document.fields.filter((field) => field.label === "Equip_ItemList");
  if (equipLists.length > 1 || (equipLists.length === 1 && equipLists[0]?.type !== "list")) {
    return null;
  }
  const equipList = equipLists[0] as Extract<SupportedGffField, { type: "list" }> | undefined;
  if (equipList) {
    let previousMask = 0;
    for (const entry of equipList.value) {
      if (!EFFECTIVE_ITEM_EQUIPMENT_SLOT_MASKS.has(entry.typeId) ||
        entry.typeId <= previousMask || entry.fields.length !== 1) {
        return null;
      }
      previousMask = entry.typeId;
      const equippedRes = entry.fields[0];
      if (equippedRes?.label !== "EquippedRes" || equippedRes.type !== "resref" ||
        !/^[a-z0-9_]{1,16}$/u.test(equippedRes.value)) {
        return null;
      }
      references.push(equippedRes.value);
    }
  }
  return Object.freeze(references);
}

function parseCanonicalEffectiveStoreReferences(
  bytes: Buffer,
  expectedTemplateResRef: string,
): readonly string[] | null {
  const document = parseRawGffDocument(bytes);
  if (!document || document.fileType !== "UTM " || document.fileVersion !== "V3.2" ||
    document.rootStructTypeId !== 0xffffffff) {
    return null;
  }
  const resRefs = document.fields.filter((field) => field.label === "ResRef");
  const storeLists = document.fields.filter((field) => field.label === "StoreList");
  if (resRefs.length !== 1 || resRefs[0]?.type !== "resref" ||
    resRefs[0].value !== expectedTemplateResRef ||
    storeLists.length !== 1 || storeLists[0]?.type !== "list") {
    return null;
  }
  const storeList = storeLists[0];
  const expectedBucketTypes = [0, 4, 2, 3, 1] as const;
  if (storeList.value.length !== expectedBucketTypes.length) return null;

  const references: string[] = [];
  for (let bucketIndex = 0; bucketIndex < expectedBucketTypes.length; bucketIndex += 1) {
    const bucket = storeList.value[bucketIndex];
    if (!bucket || bucket.typeId !== expectedBucketTypes[bucketIndex] ||
      bucket.fields.length > 1) return null;
    if (bucket.fields.length === 0) continue;
    const itemList = bucket.fields[0];
    if (itemList?.label !== "ItemList" || itemList.type !== "list") return null;
    for (let sourceIndex = 0; sourceIndex < itemList.value.length; sourceIndex += 1) {
      const entry = itemList.value[sourceIndex];
      if (!entry || entry.typeId !== sourceIndex ||
        (entry.fields.length !== 3 && entry.fields.length !== 4)) return null;
      const byLabel = new Map(entry.fields.map((field) => [field.label, field] as const));
      if (byLabel.size !== entry.fields.length) return null;
      const inventoryRes = byLabel.get("InventoryRes");
      const reposX = byLabel.get("Repos_PosX");
      const reposY = byLabel.get("Repos_Posy");
      const infinite = byLabel.get("Infinite");
      if (inventoryRes?.type !== "resref" ||
        !/^[a-z0-9_]{1,16}$/u.test(inventoryRes.value) ||
        reposX?.type !== "word" || reposY?.type !== "word" ||
        (infinite !== undefined && (infinite.type !== "byte" || infinite.value !== 1)) ||
        [...byLabel.keys()].some((label) =>
          label !== "InventoryRes" && label !== "Repos_PosX" &&
          label !== "Repos_Posy" && label !== "Infinite")) {
        return null;
      }
      references.push(inventoryRes.value);
    }
  }
  return Object.freeze(references);
}

interface IndexedTemplate {
  record: TemplateRecord;
  searchable: string;
  categoryLower: string;
  tagsLower: Set<string>;
}

interface SnapshotIndex {
  fetchedAtMs: number;
  cacheKey: string;
  byKind: Map<TemplateKind, IndexedTemplate[]>;
  byKindAndId: Map<string, TemplateRecord>;
  byKindAndResref: Map<string, TemplateRecord>;
  placeableProcessingByIdAndSubtype: Map<string, string>;
  templateProcessingByKindAndId: Map<string, string>;
  placeableAppearanceModelByRowId: Map<number, PlaceableAppearanceModelLookupEntry>;
  effectivePlaceablesTwoDaDescriptor: EffectivePlaceablesTwoDaDescriptor | null;
  effectivePlaceablesTwoDaRows: EffectivePlaceablesTwoDaRowOption[];
  effectiveWaypointTwoDaDescriptor: EffectiveWaypointTwoDaDescriptor | null;
  effectiveWaypointTwoDaRows: EffectiveWaypointTwoDaRowOption[];
  effectiveCreatureAppearanceTwoDaDescriptor: EffectiveCreatureAppearanceTwoDaDescriptor | null;
  effectiveCreatureAppearanceTwoDaRows: EffectiveCreatureAppearanceTwoDaRowOption[];
  effectiveCreatureGenderTwoDaDescriptor: EffectiveCreatureGenderTwoDaDescriptor | null;
  effectiveCreatureGenderTwoDaRows: EffectiveCreatureGenderTwoDaRowOption[];
  effectiveCreatureWingModelTwoDaDescriptor: EffectiveCreatureAppendageTwoDaDescriptor | null;
  effectiveCreatureWingModelTwoDaRows: EffectiveCreatureAppendageTwoDaRowOption[];
  effectiveCreatureTailModelTwoDaDescriptor: EffectiveCreatureAppendageTwoDaDescriptor | null;
  effectiveCreatureTailModelTwoDaRows: EffectiveCreatureAppendageTwoDaRowOption[];
  effectiveCreaturePhenotypeTwoDaDescriptor: EffectiveCreaturePhenotypeTwoDaDescriptor | null;
  effectiveCreaturePhenotypeTwoDaRows: EffectiveCreaturePhenotypeTwoDaRowOption[];
  effectiveTrapsTwoDaDescriptor: EffectiveTrapsTwoDaDescriptor | null;
  effectiveTrapsTwoDaRows: EffectiveTrapsTwoDaRowOption[];
  effectiveItemBaseItemsTwoDaDescriptor: EffectiveItemBaseItemsTwoDaDescriptor | null;
  effectiveItemBaseItemsTwoDaRows: EffectiveItemBaseItemRow[];
  effectiveBodyBagTwoDaDescriptor: EffectiveBodyBagTwoDaDescriptor | null;
  effectiveBodyBagTwoDaRows: EffectiveBodyBagTwoDaRowOption[];
  effectivePortraitsTwoDaDescriptor: EffectivePortraitsTwoDaDescriptor | null;
  effectivePortraitsTwoDaRows: EffectivePortraitsTwoDaRow[];
  effectiveCreaturePortraitsTwoDaDescriptor: EffectiveCreaturePortraitsTwoDaDescriptor | null;
  effectiveCreaturePortraitsTwoDaRows: EffectiveCreaturePortraitsTwoDaRow[];
  effectiveCreatureRacialTypesTwoDa: EffectiveCreatureRacialTypesTwoDaTable | null;
  effectiveCreaturePerceptionRangesTwoDa: EffectiveCreaturePerceptionRangesTwoDaTable | null;
  effectiveCreatureWalkRatesTwoDa: EffectiveCreatureWalkRatesTwoDaTable | null;
  effectiveCreatureSoundSetsTwoDa: EffectiveCreatureSoundSetsTwoDaTable | null;
  effectiveCreatureStartingPackagesTwoDa: EffectiveCreatureStartingPackagesTwoDaTable | null;
  effectiveCreatureClassesTwoDa: EffectiveCreatureClassesTwoDaTable | null;
  effectiveCreatureSkillsTwoDa: EffectiveCreatureSkillsTwoDaTable | null;
  effectiveCreatureFeatsTwoDa: EffectiveCreatureFeatsTwoDaTable | null;
  effectiveCreatureSpecialAbilitiesTwoDa:
    EffectiveCreatureSpecialAbilitiesTwoDaTable | null;
  effectiveAreaAudioCatalogs: EffectiveAreaAudioCatalogBundle | null;
  effectiveAreaVisualEnvironmentCatalogs: EffectiveAreaVisualEnvironmentCatalogBundle | null;
  effectiveAreaLoadingScreenCatalog: EffectiveAreaLoadingScreenCatalog | null;
  effectiveAreaEncounterDifficultyCatalog: EffectiveAreaEncounterDifficultyCatalog | null;
  moduleFactionCatalog: ModuleFactionCatalog | null;
  creatureAppearanceProfileByRowId: Map<number, CreatureAppearanceLabelLookupEntry>;
  creatureWalkRateByAppearanceId: Map<number, CreatureWalkRateLookupEntry>;
  doorTwoDaLookup: DoorTwoDaLookup;
}

interface TemplateCandidate {
  kind: TemplateKind;
  resref: string;
  extension: string;
  sourceKey: string;
  sourceSize: number;
  updatedAt: string;
  sourceEtag?: string;
  sourceFingerprint: string;
  sourceSha256?: string;
  parsedBlueprint?: ParsedTemplateBlueprint;
  placeables2daRow?: PlaceablesTwoDaRow;
}

interface EffectiveAreaAudioSourceTables {
  ambientSound: EffectiveAreaAudioTwoDaTable;
  ambientMusic: EffectiveAreaAudioTwoDaTable;
  environmentalAudio: EffectiveAreaAudioTwoDaTable;
}

interface EffectiveAreaVisualEnvironmentSourceTables {
  lightingSchemes: EffectiveAreaEnvironmentTwoDaTable;
  skyBoxes: EffectiveAreaSkyBoxesTwoDaTable;
}

interface EffectiveAreaLoadingScreenSources {
  table: EffectiveAreaLoadingScreenTwoDaTable;
  imagesByResRef: ReadonlyMap<string, EffectiveAreaLoadingScreenImageAsset>;
}

interface RuntimeVanillaKeyReader {
  readonly keyFileName: string;
  readonly reader: NwnKeyBifResourceReader;
}

interface ParsedCreatureAppearanceTwoDaRow {
  rowId: number;
  label?: string;
  moveRateName?: string;
  modelType?: string;
  raceModel?: string;
  portrait2da?: string;
  envMap?: string;
  defaultPhenotype?: string;
  bloodColor?: string;
  weaponScale?: number;
  sizeCategory?: number;
}

interface ParsedCreatureSpeedTwoDaRow {
  rowId: number;
  twoDaName?: string;
}

interface LoadedCreatureAppearanceTwoDaSource {
  key: string;
  sourceSize: number;
  updatedAt: string;
  sourceEtag?: string;
  rows: ParsedCreatureAppearanceTwoDaRow[];
  descriptor: EffectiveCreatureAppearanceTwoDaDescriptor;
  appearanceRows: EffectiveCreatureAppearanceTwoDaSourceRow[];
}

interface LoadedEffectiveCreatureGenderTwoDaSource {
  key: string;
  descriptor: EffectiveCreatureGenderTwoDaDescriptor;
  rows: EffectiveCreatureGenderTwoDaSourceRow[];
}

interface LoadedEffectiveCreatureAppendageTwoDaSource {
  key: string;
  descriptor: EffectiveCreatureAppendageTwoDaDescriptor;
  rows: EffectiveCreatureAppendageTwoDaSourceRow[];
}

interface LoadedEffectiveCreaturePhenotypeTwoDaSource {
  key: string;
  descriptor: EffectiveCreaturePhenotypeTwoDaDescriptor;
  rows: EffectiveCreaturePhenotypeTwoDaSourceRow[];
}

interface LoadedCreatureSpeedTwoDaSource {
  key: string;
  sourceSize: number;
  updatedAt: string;
  sourceEtag?: string;
  rows: ParsedCreatureSpeedTwoDaRow[];
}

interface ParsedCreatureClassTwoDaRow {
  rowId: number;
  label?: string;
  nameStrRef?: number;
}

interface LoadedCreatureClassTwoDaSource {
  key: string;
  sourceSize: number;
  updatedAt: string;
  sourceEtag?: string;
  rows: ParsedCreatureClassTwoDaRow[];
}

interface ParsedCreatureRaceTwoDaRow {
  rowId: number;
  label?: string;
  appearanceId?: number;
}

interface LoadedCreatureRaceTwoDaSource {
  key: string;
  sourceSize: number;
  updatedAt: string;
  sourceEtag?: string;
  rows: ParsedCreatureRaceTwoDaRow[];
}

interface ParsedCreatureGenderTwoDaRow {
  rowId: number;
  label?: string;
}

interface LoadedCreatureGenderTwoDaSource {
  key: string;
  sourceSize: number;
  updatedAt: string;
  sourceEtag?: string;
  rows: ParsedCreatureGenderTwoDaRow[];
}

interface ParsedCreaturePhenotypeTwoDaRow {
  rowId: number;
  label?: string;
}

interface ParsedCreaturePartTwoDaRow {
  rowId: number;
  modelName?: string;
  nodeName?: string;
}

type CreatureAccessoryModelSource = "wingmodel.2da.MODEL" | "tailmodel.2da.MODEL";

interface ParsedCreatureAccessoryModelTwoDaRow {
  rowId: number;
  modelResRef?: string;
  label?: string;
}

interface LoadedCreaturePhenotypeTwoDaSource {
  key: string;
  sourceSize: number;
  updatedAt: string;
  sourceEtag?: string;
  rows: ParsedCreaturePhenotypeTwoDaRow[];
}

interface LoadedCreaturePartTwoDaSource {
  key: string;
  sourceSize: number;
  updatedAt: string;
  sourceEtag?: string;
  rows: ParsedCreaturePartTwoDaRow[];
}

interface LoadedCreatureAccessoryModelTwoDaSource {
  key: string;
  sourceSize: number;
  updatedAt: string;
  sourceEtag?: string;
  source: CreatureAccessoryModelSource;
  rows: ParsedCreatureAccessoryModelTwoDaRow[];
}

interface ParsedCreatureSizeTwoDaRow {
  rowId: number;
  label?: string;
}

interface LoadedCreatureSizeTwoDaSource {
  key: string;
  sourceSize: number;
  updatedAt: string;
  sourceEtag?: string;
  rows: ParsedCreatureSizeTwoDaRow[];
}

interface ParsedCreaturePortraitTwoDaRow {
  rowId: number;
  baseResRef?: string;
}

interface LoadedCreaturePortraitTwoDaSource {
  key: string;
  sourceSize: number;
  updatedAt: string;
  sourceEtag?: string;
  rows: ParsedCreaturePortraitTwoDaRow[];
}

interface ParsedCreatureSoundSetTwoDaRow {
  rowId: number;
  label?: string;
  resRef?: string;
}

interface LoadedCreatureSoundSetTwoDaSource {
  key: string;
  sourceSize: number;
  updatedAt: string;
  sourceEtag?: string;
  rows: ParsedCreatureSoundSetTwoDaRow[];
}

interface ParsedCreatureSkillTwoDaRow {
  rowId: number;
  label?: string;
}

interface LoadedCreatureSkillTwoDaSource {
  key: string;
  sourceSize: number;
  updatedAt: string;
  sourceEtag?: string;
  rows: ParsedCreatureSkillTwoDaRow[];
}

interface ParsedCreatureFeatTwoDaRow {
  rowId: number;
  label?: string;
}

interface LoadedCreatureFeatTwoDaSource {
  key: string;
  sourceSize: number;
  updatedAt: string;
  sourceEtag?: string;
  rows: ParsedCreatureFeatTwoDaRow[];
}

interface ParsedCreatureSpellTwoDaRow {
  rowId: number;
  label?: string;
}

interface LoadedCreatureSpellTwoDaSource {
  key: string;
  sourceSize: number;
  updatedAt: string;
  sourceEtag?: string;
  rows: ParsedCreatureSpellTwoDaRow[];
}

interface ParsedItemBaseItemTwoDaRow {
  rowId: number;
  label?: string;
  itemClass?: string;
  modelType?: string;
  defaultModel?: string;
  defaultIcon?: string;
  invSlotWidth?: number;
  invSlotHeight?: number;
  canRotateIcon?: number;
  equipableSlots?: string;
  baseCost?: number;
  stacking?: number;
  itemMultiplier?: number;
  maxProps?: number;
  minProps?: number;
  propColumn?: string;
  storePanel?: number;
  storePanelSort?: number;
  chargesStarting?: number;
  ilrStackSize?: number;
  weaponWield?: number;
  weaponType?: number;
  weaponSize?: number;
  rangedWeapon?: number;
  rotateOnGround?: number;
  weaponMatType?: number;
  ammunitionType?: number;
  arcaneSpellFailure?: number;
}

interface LoadedItemBaseItemTwoDaSource {
  key: string;
  sourceSize: number;
  updatedAt: string;
  sourceEtag?: string;
  rows: ParsedItemBaseItemTwoDaRow[];
}

interface ParsedItemPropertyDefinitionTwoDaRow {
  rowId: number;
  label?: string;
  nameStrRef?: number;
  subTypeTable?: string;
  costTableDefinition?: string;
  param1Table?: string;
  gameStrRef?: number;
  descriptionStrRef?: number;
}

interface LoadedItemPropertyDefinitionTwoDaSource {
  key: string;
  sourceSize: number;
  updatedAt: string;
  sourceEtag?: string;
  rows: ParsedItemPropertyDefinitionTwoDaRow[];
}

interface CreatureWalkRateLookupEntry {
  walkRate: number;
  appearanceRowId: number;
  moveRateName: string;
  speedRowId: number;
  appearanceSourceKey: string;
  speedSourceKey: string;
}

interface CreatureAppearanceLabelLookupEntry {
  appearanceLabel?: string;
  appearanceRowId: number;
  appearanceSourceKey: string;
  modelType?: string;
  raceModel?: string;
  portrait2da?: string;
  envMap?: string;
  defaultPhenotype?: string;
  bloodColor?: string;
  weaponScale?: number;
  sizeCategory?: number;
}

interface CreatureClassLabelLookupEntry {
  classLabel: string;
  classRowId: number;
  classSourceKey: string;
}

interface CreatureRaceLabelLookupEntry {
  raceLabel: string;
  raceRowId: number;
  raceSourceKey: string;
  raceAppearanceId?: number;
}

interface CreatureGenderLabelLookupEntry {
  genderLabel: string;
  genderRowId: number;
  genderSourceKey: string;
}

interface CreatureSizeLabelLookupEntry {
  sizeLabel: string;
  sizeRowId: number;
  sizeSourceKey: string;
}

interface CreaturePhenotypeLabelLookupEntry {
  phenotypeLabel: string;
  phenotypeRowId: number;
  phenotypeSourceKey: string;
}

interface CreaturePartModelLookupEntry {
  partRowId: number;
  modelName: string;
  nodeName?: string;
  partSourceKey: string;
}

interface CreatureAccessoryModelLookupEntry {
  partRowId: number;
  modelResRef: string;
  label?: string;
  source: CreatureAccessoryModelSource;
  sourceKey: string;
}

interface CreaturePartModelCandidateMetadata {
  slot: CreaturePartModelSlot;
  partId: number;
  partModelName: string;
  nodeName?: string;
  modelPrefix?: string;
  modelResRef?: string;
  modelResRefPattern?: "aurora-player-body-part";
  modelResRefPatternFormat?: string;
  source:
    | "capart.2da.MDLNAME"
    | "utc.Appearance_Head"
    | "wingmodel.2da.MODEL"
    | "tailmodel.2da.MODEL";
  source2daRow?: number;
  sourceKey: string;
}

interface CreaturePortraitLookupEntry {
  portraitResRef: string;
  portraitRowId: number;
  portraitSourceKey: string;
}

interface CreatureSoundSetLookupEntry {
  soundSetLabel?: string;
  soundSetResRef?: string;
  soundSetRowId: number;
  soundSetSourceKey: string;
}

interface CreatureSkillLabelLookupEntry {
  skillLabel: string;
  skillRowId: number;
  skillSourceKey: string;
}

interface CreatureFeatLabelLookupEntry {
  featLabel: string;
  featRowId: number;
  featSourceKey: string;
}

interface CreatureSpellLabelLookupEntry {
  spellLabel: string;
  spellRowId: number;
  spellSourceKey: string;
}

interface TemplateTalkTableResolvedString {
  text: string;
  strRef: number;
  sourceKind: "base" | "custom";
  sourcePath: string;
}

interface TemplateTalkTableLookup {
  resolve(strRef: number | undefined): TemplateTalkTableResolvedString | undefined;
}

interface ItemTemplateReferenceLookupEntry {
  templateId: string;
  resref: string;
  sourceFingerprint: string;
  sourceObjectKey: string;
  metadata: Record<string, string | number | boolean>;
}

interface ItemBaseItemLookupEntry {
  baseItemRowId: number;
  label?: string;
  itemClass?: string;
  modelType?: string;
  defaultModel?: string;
  defaultIcon?: string;
  invSlotWidth?: number;
  invSlotHeight?: number;
  canRotateIcon?: number;
  equipableSlots?: string;
  baseCost?: number;
  stacking?: number;
  itemMultiplier?: number;
  maxProps?: number;
  minProps?: number;
  propColumn?: string;
  storePanel?: number;
  storePanelSort?: number;
  chargesStarting?: number;
  ilrStackSize?: number;
  weaponWield?: number;
  weaponType?: number;
  weaponSize?: number;
  rangedWeapon?: number;
  rotateOnGround?: number;
  weaponMatType?: number;
  ammunitionType?: number;
  arcaneSpellFailure?: number;
  sourceKey: string;
  sourceFingerprint: string;
}

interface ItemPropertyDefinitionLookupEntry {
  propertyName: number;
  label?: string;
  nameStrRef?: number;
  subTypeTable?: string;
  costTableDefinition?: string;
  param1Table?: string;
  gameStrRef?: number;
  descriptionStrRef?: number;
  sourceKey: string;
  sourceFingerprint: string;
}

export interface ParsedPlaceablesTwoDaRow {
  rowId: number;
  physicalRowIndex?: number;
  label?: string;
  modelResRef: string;
  lightColorRaw?: string;
  lightColorRowId?: number;
  lightColorLabel?: string;
  lightColorRed?: number;
  lightColorGreen?: number;
  lightColorBlue?: number;
  lightColorToolsetRed?: number;
  lightColorToolsetGreen?: number;
  lightColorToolsetBlue?: number;
  lightColorSourceKey?: string;
  lightOffsetX?: number;
  lightOffsetY?: number;
  lightOffsetZ?: number;
  shadowSize?: number;
  isStatic?: boolean;
}

interface PlaceablesTwoDaRow extends ParsedPlaceablesTwoDaRow {
  sourceKey: string;
  sourceSize: number;
  updatedAt: string;
  sourceEtag?: string;
  sourceFingerprint: string;
}

interface LoadedPlaceablesTwoDaSource {
  key: string;
  sourceSize: number;
  updatedAt: string;
  sourceEtag?: string;
  rows: ParsedPlaceablesTwoDaRow[];
  descriptor: EffectivePlaceablesTwoDaDescriptor | null;
  appearanceRows: EffectivePlaceablesTwoDaSourceRow[];
}

interface LoadedWaypointTwoDaSource {
  key: string;
  descriptor: EffectiveWaypointTwoDaDescriptor;
  rows: EffectiveWaypointTwoDaSourceRow[];
}

interface ParsedLightColorTwoDaRow {
  rowId: number;
  label?: string;
  red?: number;
  green?: number;
  blue?: number;
  toolsetRed?: number;
  toolsetGreen?: number;
  toolsetBlue?: number;
}

interface LoadedLightColorTwoDaSource {
  key: string;
  sourceSize: number;
  updatedAt: string;
  sourceEtag?: string;
  rows: ParsedLightColorTwoDaRow[];
}

interface LightColorTwoDaLookupEntry extends ParsedLightColorTwoDaRow {
  sourceKey: string;
}

interface PlaceableAppearanceModelLookupEntry {
  modelResRef: string;
  label?: string;
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
  sourceRowId?: number;
  requestedRowId?: number;
  sourceKey?: string;
  resolutionPath:
    | "direct"
    | "nwic-user-row-minus-100"
    | "placeables-user-row-minus-100"
    | "placeables-user-row-minus-100-chain"
    | "placeables-instance-row-minus-100";
}

type DoorTwoDaTableName = "doortypes.2da" | "genericdoors.2da";

interface ParsedDoorTwoDaRow {
  rowId: number;
  label?: string;
  modelResRef?: string;
  sourceTable: DoorTwoDaTableName;
}

interface DoorTwoDaRow extends ParsedDoorTwoDaRow {
  sourceKey: string;
  sourceSize: number;
  updatedAt: string;
  sourceEtag?: string;
  sourceFingerprint: string;
}

interface DoorTwoDaLookup {
  doortypesByRowId: Map<number, DoorTwoDaRow>;
  genericdoorsByRowId: Map<number, DoorTwoDaRow>;
  doortypesSourceKey?: string;
  genericdoorsSourceKey?: string;
}

interface DoorTwoDaLookupHints {
  appearanceId?: number;
  genericType?: number;
  doortypesSourceKey?: string;
  doortypesRowId?: number;
  doortypesLabel?: string;
  doortypesModelResRef?: string;
  genericdoorsSourceKey?: string;
  genericdoorsRowId?: number;
  genericdoorsLabel?: string;
  genericdoorsModelResRef?: string;
  modelResRef?: string;
  doortypesAvailable: boolean;
  genericdoorsAvailable: boolean;
}

const CANDIDATE_EXTENSIONS = new Set(["utp", "utd", "utc", "uti", "ute", "utm", "utw"]);
const LOCAL_ITEM_RETAIL_UTM_DIR =
  "C:\\Projects\\New Folder\\item-retail-extract\\utm";
interface LocalRetailStoreTemplateSource {
  resref: string;
  fileName: string;
  fullPath: string;
  bytes: Buffer;
}

let localRetailStoreTemplateSourcesCache: Promise<LocalRetailStoreTemplateSource[]> | null = null;
const DOOR_PATTERN = /(?:door|gdoor|sdoor|gate|portal|portcullis)/u;
const VFX_PATTERN =
  /(?:^|[^a-z0-9])(?:vfx|vvx|fx|emit|emitter|particle|fog|smoke|bubbles)(?=$|[^a-z0-9])/u;
const LIGHT_PATTERN =
  /(?:^|[^a-z0-9])(?:light(?:$|[^a-z0-9]|shaft|blob|beam|house)|lamp|torch|lantern|candle|brazier|sconce|fireplace|campfire|latarnia)/u;
const TRIGGER_PATTERN = /(trigger|trig|trap)/u;
const CONTAINER_PATTERN =
  /(container|chest|crate|barrel|box|drawer|coffin|sarcophagus|sack|skrzyn|beczk|szkatu)/u;
const REMAINS_PATTERN = /(corpse|corps|bodybag|body_bag|body bag|carcass|remains|bones|skeleton|zw.?oki)/u;
const PLACEABLES_TWO_DA_NWIC_USER_ROW_OFFSET = 100;
const PLACEABLES_TWO_DA_USER_ROW_ALIAS_MAX_HOPS = 8;
const PLACEABLE_INSTANCE_ALIAS_STOP_TOKENS = new Set([
  "a",
  "an",
  "and",
  "area",
  "aurora",
  "for",
  "git",
  "instance",
  "nwn",
  "nwn2",
  "of",
  "plc",
  "q",
  "the",
  "witcher",
  "with"
]);
const PLACEABLE_INSTANCE_ALIAS_TOKEN_EQUIVALENTS = new Map<string, readonly string[]>([
  ["beczka", ["barrel"]],
  ["dywan", ["rug", "carpet"]],
  ["garnek", ["pot", "jar", "bowl"]],
  ["garnki", ["pot", "jar", "bowl"]],
  ["miska", ["bowl", "jar", "pot"]],
  ["miseczka", ["bowl", "jar", "pot"]],
  ["plama", ["stain", "splotch", "decal"]],
  ["rusztowanie", ["scaffold"]],
  ["skrzynka", ["box", "crate"]],
  ["skrzynki", ["box", "crate"]],
  ["sloj", ["jar", "pot", "bowl"]],
  ["sloik", ["jar", "pot", "bowl"]],
  ["drewniany", ["wood", "wooden"]],
  ["drewniana", ["wood", "wooden"]],
  ["drewniane", ["wood", "wooden"]]
]);
const SNAPSHOT_TEMPLATE_CATALOG_INDEX_TTL_MS = 5 * 60_000;
const DOOR_TWO_DA_TABLE_NAMES: DoorTwoDaTableName[] = ["doortypes.2da", "genericdoors.2da"];
const VANILLA_KEY_FILE_CANDIDATES = ["nwn_base.key", "nwn_retail.key"] as const;
const LOCAL_ITEM_RETAIL_BASEITEMS_2DA_PATH =
  "C:\\Projects\\New Folder\\item-retail-extract\\2da\\baseitems.2da";
const LOCAL_ITEM_RETAIL_ITEMPROPDEF_2DA_PATH =
  "C:\\Projects\\New Folder\\item-retail-extract\\2da\\itempropdef.2da";
const NWN_UTD_RESOURCE_TYPE = 2042;

function hasDoorTwoDaLookupSources(lookup: DoorTwoDaLookup): boolean {
  return lookup.doortypesByRowId.size > 0 || lookup.genericdoorsByRowId.size > 0;
}

function resolveGenericDoorRowByTemplateReference(
  lookup: DoorTwoDaLookup,
  references: Array<string | undefined>
): DoorTwoDaRow | undefined {
  const candidateKeys = new Set(
    references
      .flatMap(buildGenericDoorReferenceKeys)
      .filter((value) => value.length > 0)
  );
  if (candidateKeys.size === 0) {
    return undefined;
  }

  for (const row of lookup.genericdoorsByRowId.values()) {
    const rowKeys = new Set([
      ...buildGenericDoorReferenceKeys(row.label),
      ...buildGenericDoorReferenceKeys(row.modelResRef)
    ]);
    if ([...candidateKeys].some((key) => rowKeys.has(key))) {
      return row;
    }
  }
  return undefined;
}

function buildGenericDoorReferenceKeys(value: string | undefined): string[] {
  const normalized = normalizeLookupRef(value);
  if (!normalized) {
    return [];
  }
  const withoutTemplatePrefixes = normalized
    .replace(/^plc_/u, "")
    .replace(/^nw_door_/u, "")
    .replace(/^door_/u, "")
    .replace(/^nw_/u, "");
  return [...new Set([
    normalized,
    withoutTemplatePrefixes,
    withoutTemplatePrefixes.replace(/^generic_/u, "")
  ])].filter((key) => key.length > 0);
}

@Injectable()
export class ModuleSnapshotTemplateCatalogRepository
  implements TemplateCatalogRepositoryPort, OnModuleDestroy
{
  private readonly logger = new Logger(ModuleSnapshotTemplateCatalogRepository.name);
  private snapshotIndex: SnapshotIndex | null = null;
  private readonly inFlightSnapshotIndex = new Map<string, Promise<SnapshotIndex | null>>();
  private readonly runtimeDoorTemplateGenericTypeByResref = new Map<string, Promise<number | null>>();
  private readonly creatureTemplateSourceSyncAttemptKeys = new Set<string>();
  private readonly itemTemplateSourceSyncAttemptKeys = new Set<string>();
  private readonly unsubscribeMaintenance: (() => void) | null;
  private capturedSnapshot: CapturedCommittedModuleSnapshot | null = null;

  constructor(
    @Inject(RUNTIME_SETTINGS_REPOSITORY)
    private readonly runtimeSettingsRepository: RuntimeSettingsRepositoryPort,
    @Inject(MODULE_BLOB_STORAGE)
    private readonly moduleBlobStorage: ModuleBlobStoragePort,
    private readonly runtimeSettingsApplicationService?: RuntimeSettingsApplicationService,
    @Optional()
    maintenance?: SystemMaintenanceApplicationService,
    @Optional() @Inject(COMMITTED_MODULE_SNAPSHOT_READER)
    private readonly committedSnapshotReader?: CommittedModuleSnapshotReaderPort,
  ) {
    this.unsubscribeMaintenance =
      maintenance?.onStateChanged((record) => {
        if (record.state === "idle") {
          this.invalidateSnapshotIndex();
          this.runtimeDoorTemplateGenericTypeByResref.clear();
          this.creatureTemplateSourceSyncAttemptKeys.clear();
          this.itemTemplateSourceSyncAttemptKeys.clear();
        }
      }) ?? null;
  }

  onModuleDestroy(): void {
    this.unsubscribeMaintenance?.();
  }

  async listByKind(kind: TemplateKind, query: TemplateListQuery): Promise<TemplateListResult> {
    const index = await this.getSnapshotIndex();
    if (!index) {
      return {
        items: [],
        total: 0,
        limit: query.limit,
        offset: query.offset
      };
    }

    const normalizedQuery = query.query?.toLowerCase().trim();
    const normalizedCategory = query.category?.toLowerCase().trim();
    const normalizedTag = query.tag?.toLowerCase().trim();
    const filtered = deduplicateIndexedTemplatesById(
      (index.byKind.get(kind) ?? [])
      .filter((item) => {
        if (!query.query) {
          return true;
        }
        return item.searchable.includes(normalizedQuery ?? "");
      })
      .filter((item) => {
        if (!query.category) {
          return true;
        }
        return item.categoryLower === normalizedCategory;
      })
      .filter((item) => {
        if (!query.tag) {
          return true;
        }
        return item.tagsLower.has(normalizedTag ?? "");
      })
      .filter((item) => {
        if (kind !== "placeable" || !query.subtype) {
          return true;
        }
        return item.record.placeableSubtype === query.subtype;
      })
      .filter((item) => {
        if (kind !== "placeable" || typeof query.benchmark !== "boolean") {
          return true;
        }
        return Boolean(item.record.benchmarkCandidate) === query.benchmark;
      })
    );

    const items = filtered
      .slice(query.offset, query.offset + query.limit)
      .map((item) => item.record);

    return {
      items,
      total: filtered.length,
      limit: query.limit,
      offset: query.offset
    };
  }

  async findByKindAndId(kind: TemplateKind, templateId: string): Promise<TemplateRecord | null> {
    const index = await this.getSnapshotIndex();
    if (!index) {
      return null;
    }
    return index.byKindAndId.get(buildTemplateIdIndexKey(kind, templateId)) ?? null;
  }

  async findByKindAndResref(kind: TemplateKind, resref: string): Promise<TemplateRecord | null> {
    const index = await this.getSnapshotIndex();
    if (!index) {
      return null;
    }
    return index.byKindAndResref.get(buildTemplateResrefIndexKey(kind, resref)) ?? null;
  }

  async resolveEffectiveTemplateBlueprint(
    request: EffectiveTemplateBlueprintRequest
  ): Promise<EffectiveTemplateBlueprintResult | null> {
    if (
      (request.kind !== "placeable" && request.kind !== "item" &&
        request.kind !== "store" && request.kind !== "encounter" &&
        request.kind !== "waypoint") ||
      typeof request.templateId !== "string" || request.templateId.length < 1 ||
      typeof request.sourceObjectKey !== "string" || request.sourceObjectKey.length < 1 ||
      request.sourceObjectKey.length > 2048 || request.sourceObjectKey.includes("\0") ||
      typeof request.expectedSha256 !== "string" ||
      !/^[a-f0-9]{64}$/u.test(request.expectedSha256)
    ) {
      return null;
    }
    const index = await this.getSnapshotIndex();
    if (!index) return null;
    const record = index.byKindAndId.get(
      buildTemplateIdIndexKey(request.kind, request.templateId)
    );
    if (!record) return null;
    const expectedExtension = request.kind === "placeable"
      ? "utp"
      : request.kind === "store"
        ? "utm"
        : request.kind === "encounter"
          ? "ute"
          : request.kind === "waypoint"
            ? "utw"
        : "uti";
    const expectedFileType = request.kind === "placeable"
      ? "UTP "
      : request.kind === "store"
        ? "UTM "
        : request.kind === "encounter"
          ? "UTE "
          : request.kind === "waypoint"
            ? "UTW "
        : "UTI ";
    if (
      record.metadata.sourceObjectKey !== request.sourceObjectKey ||
      record.metadata.sourceSha256 !== request.expectedSha256 ||
      record.metadata.sourceExtension !== expectedExtension ||
      record.metadata.sourceFileType !== expectedFileType ||
      record.metadata.sourceFileVersion !== "V3.2" ||
      record.metadata.sourceStructTypeId !== 0xffffffff ||
      !Number.isSafeInteger(record.metadata.sourceSizeBytes) ||
      Number(record.metadata.sourceSizeBytes) < 1 ||
      Number(record.metadata.sourceSizeBytes) > MAX_EFFECTIVE_TEMPLATE_BLUEPRINT_BYTES
    ) {
      return null;
    }
    let payload;
    let settings: RuntimeSettingsRecord;
    try {
      settings = await this.runtimeSettingsRepository.get();
      payload = await this.readSnapshotObject(settings.blobStorage, request.sourceObjectKey);
    } catch {
      return null;
    }
    if (!payload || payload.size !== payload.bytes.length ||
      payload.bytes.length !== record.metadata.sourceSizeBytes ||
      payload.bytes.length > MAX_EFFECTIVE_TEMPLATE_BLUEPRINT_BYTES) {
      return null;
    }
    const sha256 = buildContentHash(payload.bytes);
    if (sha256 !== request.expectedSha256) return null;
    let dependencies;
    if (request.kind === "placeable") {
      dependencies = await this.resolveEffectivePlaceableInventoryDependencies(
        index,
        settings.blobStorage,
        record.resref,
        payload.bytes,
      );
    } else if (request.kind === "store") {
      const references = parseCanonicalEffectiveStoreReferences(payload.bytes, record.resref);
      dependencies = references === null
        ? null
        : await this.resolveEffectiveItemInventoryDependencies(
          index,
          settings.blobStorage,
          record.resref,
          payload.bytes,
          references,
        );
    } else if (request.kind === "item") {
      dependencies = await this.resolveEffectiveItemInventoryDependencies(
        index,
        settings.blobStorage,
        record.resref,
        payload.bytes,
      );
    } else {
      dependencies = Object.freeze([]);
    }
    if (dependencies === null) return null;
    return Object.freeze({
      kind: record.kind,
      templateId: record.templateId,
      resref: record.resref,
      sourceObjectKey: request.sourceObjectKey,
      sha256,
      bytes: Buffer.from(payload.bytes),
      ...(dependencies.length > 0 ? { dependencies } : {}),
    });
  }

  private async resolveEffectivePlaceableInventoryDependencies(
    index: SnapshotIndex,
    storage: BlobStorageSettings,
    templateResRef: string,
    blueprintBytes: Buffer,
  ): Promise<readonly Readonly<{
    templateResRef: string;
    resourceType: number;
    sha256: string;
    bytes: Buffer;
  }>[] | null> {
    const document = parseRawGffDocument(blueprintBytes);
    if (!document || document.fileType !== "UTP " || document.fileVersion !== "V3.2" ||
      document.rootStructTypeId !== 0xffffffff) {
      return null;
    }
    const templateFields = document.fields.filter((field) => field.label === "TemplateResRef");
    if (templateFields.length !== 1 || templateFields[0]?.type !== "resref" ||
      templateFields[0].value !== templateResRef) {
      return null;
    }
    const itemLists = document.fields.filter((field) => field.label === "ItemList");
    if (itemLists.length > 1 || (itemLists.length === 1 && itemLists[0]?.type !== "list")) {
      return null;
    }
    const itemList = itemLists[0] as Extract<SupportedGffField, { type: "list" }> | undefined;
    if (!itemList || itemList.value.length === 0) return Object.freeze([]);
    if (itemList.value.length > MAX_EFFECTIVE_PLACEABLE_INVENTORY_DEPENDENCIES) return null;

    const dependencies: Array<Readonly<{
      templateResRef: string;
      resourceType: number;
      sha256: string;
      bytes: Buffer;
    }>> = [];
    for (let sourceIndex = 0; sourceIndex < itemList.value.length; sourceIndex += 1) {
      const entry = itemList.value[sourceIndex];
      if (!entry || entry.typeId !== sourceIndex || entry.fields.length !== 3) return null;
      const [inventoryRes, reposX, reposY] = entry.fields;
      if (inventoryRes?.label !== "InventoryRes" || inventoryRes.type !== "resref" ||
        !/^[a-z0-9_]{1,16}$/u.test(inventoryRes.value) ||
        reposX?.label !== "Repos_PosX" || reposX.type !== "word" ||
        reposY?.label !== "Repos_Posy" || reposY.type !== "word") {
        return null;
      }
      const dependencyRecord = index.byKindAndResref.get(
        buildTemplateResrefIndexKey("item", inventoryRes.value),
      );
      const metadata = dependencyRecord?.metadata;
      if (!dependencyRecord || dependencyRecord.resref !== inventoryRes.value ||
        metadata?.sourceExtension !== "uti" || metadata.sourceFileType !== "UTI " ||
        metadata.sourceFileVersion !== "V3.2" || metadata.sourceStructTypeId !== 0xffffffff ||
        typeof metadata.sourceObjectKey !== "string" || metadata.sourceObjectKey.length < 1 ||
        metadata.sourceObjectKey.length > 2048 || metadata.sourceObjectKey.includes("\0") ||
        typeof metadata.sourceSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(metadata.sourceSha256)) {
        return null;
      }
      let payload;
      try {
        payload = await this.readSnapshotObject(storage, metadata.sourceObjectKey);
      } catch {
        return null;
      }
      if (!payload || payload.size !== payload.bytes.length || payload.bytes.length < 1 ||
        payload.bytes.length > MAX_EFFECTIVE_TEMPLATE_BLUEPRINT_BYTES) {
        return null;
      }
      const dependencySha256 = buildContentHash(payload.bytes);
      if (dependencySha256 !== metadata.sourceSha256) return null;
      const dependencyDocument = parseRawGffDocument(payload.bytes);
      const dependencyTemplates = dependencyDocument?.fields.filter(
        (field) => field.label === "TemplateResRef",
      ) ?? [];
      if (!dependencyDocument || dependencyDocument.fileType !== "UTI " ||
        dependencyDocument.fileVersion !== "V3.2" ||
        dependencyDocument.rootStructTypeId !== 0xffffffff ||
        dependencyTemplates.length !== 1 || dependencyTemplates[0]?.type !== "resref" ||
        dependencyTemplates[0].value !== inventoryRes.value) {
        return null;
      }
      dependencies.push(Object.freeze({
        templateResRef: inventoryRes.value,
        resourceType: NWN_KEY_BIF_RESOURCE_TYPES.UTI,
        sha256: dependencySha256,
        bytes: Buffer.from(payload.bytes),
      }));
    }
    return Object.freeze(dependencies);
  }

  private async resolveEffectiveItemInventoryDependencies(
    index: SnapshotIndex,
    storage: BlobStorageSettings,
    rootTemplateResRef: string,
    rootBytes: Buffer,
    rootReferences?: readonly string[],
  ): Promise<readonly Readonly<{
    templateResRef: string;
    resourceType: number;
    sha256: string;
    bytes: Buffer;
  }>[] | null> {
    type Dependency = Readonly<{
      templateResRef: string;
      resourceType: number;
      sha256: string;
      bytes: Buffer;
    }>;
    const dependencies: Dependency[] = [];
    const byResRef = new Map<string, Dependency>();
    const visiting = new Set<string>(rootReferences ? [] : [rootTemplateResRef]);
    let referenceOccurrences = 0;
    let dependencyBytes = 0;

    const walk = async (
      templateResRef: string,
      bytes: Buffer,
      depth: number,
      preparsedReferences?: readonly string[],
    ): Promise<boolean> => {
      if (depth > MAX_EFFECTIVE_ITEM_NESTED_DEPTH) return false;
      const references = preparsedReferences ??
        parseCanonicalEffectiveItemReferences(bytes, templateResRef);
      if (!references) return false;
      for (const reference of references) {
        referenceOccurrences += 1;
        if (referenceOccurrences > MAX_EFFECTIVE_ITEM_REFERENCE_OCCURRENCES ||
          visiting.has(reference)) {
          return false;
        }
        let dependency = byResRef.get(reference);
        if (!dependency) {
          if (byResRef.size >= MAX_EFFECTIVE_ITEM_UNIQUE_DEPENDENCIES) return false;
          const dependencyRecord = index.byKindAndResref.get(
            buildTemplateResrefIndexKey("item", reference),
          );
          const metadata = dependencyRecord?.metadata;
          if (!dependencyRecord || dependencyRecord.resref !== reference ||
            metadata?.sourceExtension !== "uti" || metadata.sourceFileType !== "UTI " ||
            metadata.sourceFileVersion !== "V3.2" ||
            metadata.sourceStructTypeId !== 0xffffffff ||
            typeof metadata.sourceObjectKey !== "string" || metadata.sourceObjectKey.length < 1 ||
            metadata.sourceObjectKey.length > 2048 || metadata.sourceObjectKey.includes("\0") ||
            typeof metadata.sourceSha256 !== "string" ||
            !/^[a-f0-9]{64}$/u.test(metadata.sourceSha256) ||
            !Number.isSafeInteger(metadata.sourceSizeBytes) ||
            Number(metadata.sourceSizeBytes) < 1 ||
            Number(metadata.sourceSizeBytes) > MAX_EFFECTIVE_TEMPLATE_BLUEPRINT_BYTES) {
            return false;
          }
          let payload;
          try {
            payload = await this.readSnapshotObject(storage, metadata.sourceObjectKey);
          } catch {
            return false;
          }
          if (!payload || payload.size !== payload.bytes.length ||
            payload.bytes.length !== Number(metadata.sourceSizeBytes) ||
            payload.bytes.length > MAX_EFFECTIVE_TEMPLATE_BLUEPRINT_BYTES) {
            return false;
          }
          const sha256 = buildContentHash(payload.bytes);
          if (sha256 !== metadata.sourceSha256 ||
            !parseCanonicalEffectiveItemReferences(payload.bytes, reference)) {
            return false;
          }
          dependencyBytes += payload.bytes.length;
          if (dependencyBytes > MAX_EFFECTIVE_ITEM_DEPENDENCY_BYTES) return false;
          dependency = Object.freeze({
            templateResRef: reference,
            resourceType: NWN_KEY_BIF_RESOURCE_TYPES.UTI,
            sha256,
            bytes: Buffer.from(payload.bytes),
          });
          byResRef.set(reference, dependency);
          dependencies.push(dependency);
        }
        visiting.add(reference);
        const admitted = await walk(reference, dependency.bytes, depth + 1);
        visiting.delete(reference);
        if (!admitted) return false;
      }
      return true;
    };

    return await walk(rootTemplateResRef, rootBytes, 0, rootReferences)
      ? Object.freeze(dependencies)
      : null;
  }

  async resolvePlaceableAppearanceModel(
    appearanceType: number,
    context?: PlaceableAppearanceModelLookupContext
  ): Promise<PlaceableAppearanceModelLookupResult | null> {
    if (!Number.isInteger(appearanceType) || appearanceType < 0) {
      return null;
    }
    const index = await this.getSnapshotIndex();
    const lookup = index?.placeableAppearanceModelByRowId.get(appearanceType);
    if (!lookup) {
      return null;
    }
    const resolvedLookup =
      resolvePlaceableInstanceMinus100Lookup(
        Math.trunc(appearanceType),
        lookup,
        index?.placeableAppearanceModelByRowId,
        context
      ) ?? lookup;
    return {
      modelResRef: resolvedLookup.modelResRef,
      source2da: "placeables.2da",
      rowId: resolvedLookup.rowId,
      ...(resolvedLookup.source2daLightColorRaw !== undefined
        ? { source2daLightColorRaw: resolvedLookup.source2daLightColorRaw }
        : {}),
      ...(resolvedLookup.source2daLightColorRow !== undefined
        ? { source2daLightColorRow: resolvedLookup.source2daLightColorRow }
        : {}),
      ...(resolvedLookup.source2daLightColorLabel !== undefined
        ? { source2daLightColorLabel: resolvedLookup.source2daLightColorLabel }
        : {}),
      ...(resolvedLookup.source2daLightColorSourceKey !== undefined
        ? { source2daLightColorSourceKey: resolvedLookup.source2daLightColorSourceKey }
        : {}),
      ...(resolvedLookup.source2daLightRed !== undefined
        ? { source2daLightRed: resolvedLookup.source2daLightRed }
        : {}),
      ...(resolvedLookup.source2daLightGreen !== undefined
        ? { source2daLightGreen: resolvedLookup.source2daLightGreen }
        : {}),
      ...(resolvedLookup.source2daLightBlue !== undefined
        ? { source2daLightBlue: resolvedLookup.source2daLightBlue }
        : {}),
      ...(resolvedLookup.source2daToolsetRed !== undefined
        ? { source2daToolsetRed: resolvedLookup.source2daToolsetRed }
        : {}),
      ...(resolvedLookup.source2daToolsetGreen !== undefined
        ? { source2daToolsetGreen: resolvedLookup.source2daToolsetGreen }
        : {}),
      ...(resolvedLookup.source2daToolsetBlue !== undefined
        ? { source2daToolsetBlue: resolvedLookup.source2daToolsetBlue }
        : {}),
      ...(resolvedLookup.source2daLightOffsetX !== undefined
        ? { source2daLightOffsetX: resolvedLookup.source2daLightOffsetX }
        : {}),
      ...(resolvedLookup.source2daLightOffsetY !== undefined
        ? { source2daLightOffsetY: resolvedLookup.source2daLightOffsetY }
        : {}),
      ...(resolvedLookup.source2daLightOffsetZ !== undefined
        ? { source2daLightOffsetZ: resolvedLookup.source2daLightOffsetZ }
        : {}),
      ...(resolvedLookup.source2daShadowSize !== undefined
        ? { source2daShadowSize: resolvedLookup.source2daShadowSize }
        : {}),
      ...(resolvedLookup.source2daStatic !== undefined
        ? { source2daStatic: resolvedLookup.source2daStatic }
        : {}),
      ...(resolvedLookup.requestedRowId !== undefined ? { requestedRowId: resolvedLookup.requestedRowId } : {}),
      ...(resolvedLookup.resolutionPath !== "direct" ? { resolutionPath: resolvedLookup.resolutionPath } : {}),
      ...(resolvedLookup.resolutionPath !== "direct" && resolvedLookup.sourceKey ? { sourceKey: resolvedLookup.sourceKey } : {})
    };
  }

  async resolveEffectivePlaceablesTwoDaDescriptor(): Promise<EffectivePlaceablesTwoDaDescriptor | null> {
    const descriptor = (await this.getSnapshotIndex())?.effectivePlaceablesTwoDaDescriptor;
    return descriptor ? { ...descriptor } : null;
  }

  async listEffectivePlaceablesTwoDaRows(input: {
    query?: string;
    limit: number;
    offset: number;
  }) {
    const index = await this.getSnapshotIndex();
    const descriptor = index?.effectivePlaceablesTwoDaDescriptor;
    if (!index || !descriptor) {
      return null;
    }
    const query = input.query?.toLowerCase() ?? "";
    const filtered = index.effectivePlaceablesTwoDaRows.filter((row) =>
      [row.displayName, row.label, String(row.rowIndex), row.strRef?.toString()]
        .some((value) => value?.toLowerCase().includes(query) === true)
    );
    return {
      descriptor: { ...descriptor },
      items: filtered.slice(input.offset, input.offset + input.limit).map((row) => ({ ...row })),
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async resolveEffectiveWaypointTwoDaDescriptor(): Promise<EffectiveWaypointTwoDaDescriptor | null> {
    const descriptor = (await this.getSnapshotIndex())?.effectiveWaypointTwoDaDescriptor;
    return descriptor ? { ...descriptor } : null;
  }

  async listEffectiveWaypointTwoDaRows(input: {
    query?: string;
    limit: number;
    offset: number;
  }) {
    const index = await this.getSnapshotIndex();
    const descriptor = index?.effectiveWaypointTwoDaDescriptor;
    if (!index || !descriptor) return null;
    const query = input.query?.toLowerCase() ?? "";
    const filtered = index.effectiveWaypointTwoDaRows.filter((row) =>
      [row.displayName, row.label, row.modelResRef, String(row.rowIndex), String(row.strRef)]
        .some((value) => value?.toLowerCase().includes(query) === true)
    );
    return {
      descriptor: { ...descriptor },
      items: filtered.slice(input.offset, input.offset + input.limit).map((row) => ({ ...row })),
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async resolveEffectiveWaypointTwoDaRow(rowIndex: number) {
    const index = await this.getSnapshotIndex();
    const descriptor = index?.effectiveWaypointTwoDaDescriptor;
    if (!index || !descriptor) return null;
    const row = index.effectiveWaypointTwoDaRows.find((candidate) =>
      candidate.rowIndex === rowIndex
    );
    return {
      descriptor: { ...descriptor },
      row: row ? { ...row } : null,
    };
  }

  async resolveEffectiveCreatureAppearanceTwoDaDescriptor(): Promise<
    EffectiveCreatureAppearanceTwoDaDescriptor | null
  > {
    const descriptor = (await this.getSnapshotIndex())
      ?.effectiveCreatureAppearanceTwoDaDescriptor;
    return descriptor ? { ...descriptor } : null;
  }

  async listEffectiveCreatureAppearanceTwoDaRows(input: {
    query?: string;
    limit: number;
    offset: number;
  }) {
    const index = await this.getSnapshotIndex();
    const descriptor = index?.effectiveCreatureAppearanceTwoDaDescriptor;
    if (!index || !descriptor) {
      return null;
    }
    const query = input.query?.toLowerCase() ?? "";
    const filtered = index.effectiveCreatureAppearanceTwoDaRows.filter((row) =>
      [row.displayName, row.label, String(row.rowIndex), row.strRef?.toString()]
        .some((value) => value?.toLowerCase().includes(query) === true)
    );
    return {
      descriptor: { ...descriptor },
      items: filtered.slice(input.offset, input.offset + input.limit).map((row) => ({ ...row })),
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async resolveEffectiveCreatureAppearanceTwoDaRow(rowIndex: number) {
    const index = await this.getSnapshotIndex();
    const descriptor = index?.effectiveCreatureAppearanceTwoDaDescriptor;
    if (!index || !descriptor) return null;
    const row = index.effectiveCreatureAppearanceTwoDaRows.find(
      (candidate) => candidate.rowIndex === rowIndex,
    );
    return {
      descriptor: { ...descriptor },
      row: row ? { ...row } : null,
    };
  }

  async resolveEffectiveCreatureGenderTwoDaDescriptor(): Promise<
    EffectiveCreatureGenderTwoDaDescriptor | null
  > {
    const descriptor = (await this.getSnapshotIndex())
      ?.effectiveCreatureGenderTwoDaDescriptor;
    return descriptor ? { ...descriptor } : null;
  }

  async listEffectiveCreatureGenderTwoDaRows(input: {
    query?: string;
    limit: number;
    offset: number;
  }) {
    const index = await this.getSnapshotIndex();
    const descriptor = index?.effectiveCreatureGenderTwoDaDescriptor;
    if (!index || !descriptor) return null;
    const query = input.query?.toLowerCase() ?? "";
    const filtered = index.effectiveCreatureGenderTwoDaRows.filter((row) =>
      [
        row.displayName,
        row.genderToken,
        row.constant,
        String(row.rowIndex),
        String(row.nameStrRef),
      ].some((value) => value?.toLowerCase().includes(query) === true)
    );
    return {
      descriptor: { ...descriptor },
      items: filtered.slice(input.offset, input.offset + input.limit).map((row) => ({ ...row })),
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async resolveEffectiveCreatureGenderTwoDaRow(rowIndex: number) {
    const index = await this.getSnapshotIndex();
    const descriptor = index?.effectiveCreatureGenderTwoDaDescriptor;
    if (!index || !descriptor) return null;
    const row = index.effectiveCreatureGenderTwoDaRows.find(
      (candidate) => candidate.rowIndex === rowIndex,
    );
    return {
      descriptor: { ...descriptor },
      row: row ? { ...row } : null,
    };
  }

  async resolveEffectiveCreatureAppendageTwoDaDescriptor(
    resourceName: EffectiveCreatureAppendageTwoDaResourceName,
  ): Promise<EffectiveCreatureAppendageTwoDaDescriptor | null> {
    const index = await this.getSnapshotIndex();
    const descriptor = resourceName === "wingmodel.2da"
      ? index?.effectiveCreatureWingModelTwoDaDescriptor
      : index?.effectiveCreatureTailModelTwoDaDescriptor;
    return descriptor ? { ...descriptor } : null;
  }

  async listEffectiveCreatureAppendageTwoDaRows(
    resourceName: EffectiveCreatureAppendageTwoDaResourceName,
    input: { query?: string; limit: number; offset: number },
  ) {
    const index = await this.getSnapshotIndex();
    const descriptor = resourceName === "wingmodel.2da"
      ? index?.effectiveCreatureWingModelTwoDaDescriptor
      : index?.effectiveCreatureTailModelTwoDaDescriptor;
    const rows = resourceName === "wingmodel.2da"
      ? index?.effectiveCreatureWingModelTwoDaRows
      : index?.effectiveCreatureTailModelTwoDaRows;
    if (!descriptor || !rows) return null;
    const query = input.query?.toLowerCase() ?? "";
    const filtered = rows.filter((row) =>
      row.displayName.toLowerCase().includes(query) || String(row.rowIndex).includes(query)
    );
    return {
      descriptor: { ...descriptor },
      items: filtered.slice(input.offset, input.offset + input.limit).map((row) => ({ ...row })),
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async resolveEffectiveCreatureAppendageTwoDaRow(
    resourceName: EffectiveCreatureAppendageTwoDaResourceName,
    rowIndex: number,
  ) {
    const index = await this.getSnapshotIndex();
    const descriptor = resourceName === "wingmodel.2da"
      ? index?.effectiveCreatureWingModelTwoDaDescriptor
      : index?.effectiveCreatureTailModelTwoDaDescriptor;
    const rows = resourceName === "wingmodel.2da"
      ? index?.effectiveCreatureWingModelTwoDaRows
      : index?.effectiveCreatureTailModelTwoDaRows;
    if (!descriptor || !rows) return null;
    const row = rows.find((candidate) => candidate.rowIndex === rowIndex);
    return { descriptor: { ...descriptor }, row: row ? { ...row } : null };
  }

  async resolveEffectiveCreaturePhenotypeTwoDaDescriptor(): Promise<
    EffectiveCreaturePhenotypeTwoDaDescriptor | null
  > {
    const descriptor = (await this.getSnapshotIndex())
      ?.effectiveCreaturePhenotypeTwoDaDescriptor;
    return descriptor ? { ...descriptor } : null;
  }

  async listEffectiveCreaturePhenotypeTwoDaRows(input: {
    query?: string;
    limit: number;
    offset: number;
  }) {
    const index = await this.getSnapshotIndex();
    const descriptor = index?.effectiveCreaturePhenotypeTwoDaDescriptor;
    if (!index || !descriptor) return null;
    const query = input.query?.toLowerCase() ?? "";
    const filtered = index.effectiveCreaturePhenotypeTwoDaRows.filter((row) =>
      [row.displayName, row.label, String(row.rowIndex), String(row.nameStrRef)]
        .some((value) => value?.toLowerCase().includes(query) === true)
    );
    return {
      descriptor: { ...descriptor },
      items: filtered.slice(input.offset, input.offset + input.limit).map((row) => ({ ...row })),
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async resolveEffectiveCreaturePhenotypeTwoDaRow(rowIndex: number) {
    const index = await this.getSnapshotIndex();
    const descriptor = index?.effectiveCreaturePhenotypeTwoDaDescriptor;
    if (!index || !descriptor) return null;
    const row = index.effectiveCreaturePhenotypeTwoDaRows.find(
      (candidate) => candidate.rowIndex === rowIndex,
    );
    return {
      descriptor: { ...descriptor },
      row: row ? { ...row } : null,
    };
  }

  async resolveEffectiveItemBaseItemsTwoDaTable() {
    const index = await this.getSnapshotIndex();
    if (!index?.effectiveItemBaseItemsTwoDaDescriptor) return null;
    return {
      descriptor: { ...index.effectiveItemBaseItemsTwoDaDescriptor },
      rows: index.effectiveItemBaseItemsTwoDaRows.map((row) => ({ ...row })),
    };
  }

  async resolveEffectiveTrapsTwoDaTable() {
    const index = await this.getSnapshotIndex();
    if (!index?.effectiveTrapsTwoDaDescriptor) {
      return null;
    }
    return {
      descriptor: { ...index.effectiveTrapsTwoDaDescriptor },
      rows: index.effectiveTrapsTwoDaRows.map((row) => ({ ...row })),
    };
  }

  async resolveEffectiveBodyBagTwoDaTable() {
    const index = await this.getSnapshotIndex();
    if (!index?.effectiveBodyBagTwoDaDescriptor) return null;
    return {
      descriptor: { ...index.effectiveBodyBagTwoDaDescriptor },
      rows: index.effectiveBodyBagTwoDaRows.map((row) => ({ ...row })),
    };
  }

  async resolveEffectivePortraitsTwoDaTable() {
    const index = await this.getSnapshotIndex();
    if (!index?.effectivePortraitsTwoDaDescriptor) return null;
    return {
      descriptor: { ...index.effectivePortraitsTwoDaDescriptor },
      rows: index.effectivePortraitsTwoDaRows.map((row) => ({ ...row })),
    };
  }

  async resolveEffectiveCreaturePortraitsTwoDaTable() {
    const index = await this.getSnapshotIndex();
    if (!index?.effectiveCreaturePortraitsTwoDaDescriptor) return null;
    return {
      descriptor: { ...index.effectiveCreaturePortraitsTwoDaDescriptor },
      rows: index.effectiveCreaturePortraitsTwoDaRows.map((row) => ({ ...row })),
    };
  }

  async resolveEffectiveCreatureRacialTypesTwoDaTable() {
    const table = (await this.getSnapshotIndex())?.effectiveCreatureRacialTypesTwoDa;
    if (!table) return null;
    return {
      descriptor: { ...table.descriptor },
      rows: table.rows.map((row) => ({ ...row })),
    };
  }

  async resolveEffectiveCreaturePerceptionRangesTwoDaTable() {
    const table = (await this.getSnapshotIndex())?.effectiveCreaturePerceptionRangesTwoDa;
    if (!table) return null;
    return {
      descriptor: { ...table.descriptor },
      rows: table.rows.map((row) => ({ ...row })),
    };
  }

  async resolveEffectiveCreatureWalkRatesTwoDaTable() {
    const table = (await this.getSnapshotIndex())?.effectiveCreatureWalkRatesTwoDa;
    if (!table) return null;
    return {
      descriptor: { ...table.descriptor },
      rows: table.rows.map((row) => ({ ...row })),
    };
  }

  async resolveEffectiveCreatureSoundSetsTwoDaTable() {
    const table = (await this.getSnapshotIndex())?.effectiveCreatureSoundSetsTwoDa;
    if (!table) return null;
    return {
      descriptor: { ...table.descriptor },
      rows: table.rows.map((row) => ({ ...row })),
    };
  }

  async resolveEffectiveCreatureStartingPackagesTwoDaTable() {
    const table = (await this.getSnapshotIndex())?.effectiveCreatureStartingPackagesTwoDa;
    if (!table) return null;
    return {
      descriptor: { ...table.descriptor },
      rows: table.rows.map((row) => ({ ...row })),
    };
  }

  async resolveEffectiveCreatureClassesTwoDaTable() {
    const table = (await this.getSnapshotIndex())?.effectiveCreatureClassesTwoDa;
    if (!table) return null;
    return {
      descriptor: { ...table.descriptor },
      rows: table.rows.map((row) => ({ ...row })),
    };
  }

  async resolveEffectiveCreatureSkillsTwoDaTable() {
    const table = (await this.getSnapshotIndex())?.effectiveCreatureSkillsTwoDa;
    if (!table) return null;
    return {
      descriptor: { ...table.descriptor },
      rows: table.rows.map((row) => ({ ...row })),
    };
  }

  async resolveEffectiveCreatureFeatsTwoDaTable() {
    const table = (await this.getSnapshotIndex())?.effectiveCreatureFeatsTwoDa;
    if (!table) return null;
    return {
      descriptor: { ...table.descriptor },
      rows: table.rows.map((row) => ({ ...row })),
    };
  }

  async resolveEffectiveCreatureSpecialAbilitiesTwoDaTable() {
    const table = (await this.getSnapshotIndex())?.effectiveCreatureSpecialAbilitiesTwoDa;
    if (!table) return null;
    return {
      descriptor: { ...table.descriptor },
      rows: table.rows.map((row) => ({ ...row })),
    };
  }

  async resolveEffectiveAreaAudioCatalogs() {
    const catalogs = (await this.getSnapshotIndex())?.effectiveAreaAudioCatalogs;
    if (!catalogs) return null;
    const cloneCatalog = (catalog: EffectiveAreaAudioCatalogBundle["ambientSound"]) => ({
      descriptor: { ...catalog.descriptor },
      rows: catalog.rows.map((row) => ({ ...row })),
    });
    return {
      schemaVersion: catalogs.schemaVersion,
      ambientSound: cloneCatalog(catalogs.ambientSound),
      ambientMusic: cloneCatalog(catalogs.ambientMusic),
      environmentalAudio: cloneCatalog(catalogs.environmentalAudio),
    };
  }

  async resolveEffectiveAreaVisualEnvironmentCatalogs() {
    const catalogs = (await this.getSnapshotIndex())?.effectiveAreaVisualEnvironmentCatalogs;
    if (!catalogs) return null;
    return {
      schemaVersion: catalogs.schemaVersion,
      lightingSchemes: {
        descriptor: { ...catalogs.lightingSchemes.descriptor },
        rows: catalogs.lightingSchemes.rows.map((row) => ({
          ...row,
          visualEnvironment: {
            ...row.visualEnvironment,
            sun: { ...row.visualEnvironment.sun },
            moon: { ...row.visualEnvironment.moon },
          },
          visualEnvironmentScalarControls: {
            ...row.visualEnvironmentScalarControls,
          },
        })),
      },
      skyBoxes: {
        descriptor: { ...catalogs.skyBoxes.descriptor },
        rows: catalogs.skyBoxes.rows.map((row) => ({ ...row })),
      },
    };
  }

  async resolveEffectiveAreaLoadingScreenCatalog() {
    const catalog = (await this.getSnapshotIndex())?.effectiveAreaLoadingScreenCatalog;
    if (!catalog) return null;
    return {
      schemaVersion: catalog.schemaVersion,
      descriptor: { ...catalog.descriptor },
      rows: catalog.rows.map((row) => ({
        ...row,
        ...(row.imageAsset ? { imageAsset: { ...row.imageAsset } } : {}),
      })),
    };
  }

  async resolveEffectiveAreaEncounterDifficultyCatalog() {
    const catalog = (await this.getSnapshotIndex())?.effectiveAreaEncounterDifficultyCatalog;
    if (!catalog) return null;
    return {
      schemaVersion: catalog.schemaVersion,
      descriptor: { ...catalog.descriptor },
      rows: catalog.rows.map((row) => ({ ...row })),
    };
  }

  async resolveModuleFactionCatalog() {
    const catalog = (await this.getSnapshotIndex())?.moduleFactionCatalog;
    if (!catalog) return null;
    return {
      descriptor: { ...catalog.descriptor },
      rows: catalog.rows.map((row) => ({ ...row })),
    };
  }

  async resolveDoorAppearanceModel(input: {
    appearanceType?: number;
    genericType?: number;
    templateId?: string;
    resref?: string;
  }): Promise<DoorAppearanceModelLookupResult | null> {
    const index = await this.getSnapshotIndex();
    if (!index) {
      return null;
    }
    const lookup = index.doorTwoDaLookup;
    const appearanceType =
      Number.isInteger(input.appearanceType ?? Number.NaN) && input.appearanceType !== undefined
        ? input.appearanceType
        : undefined;
    const genericType =
      Number.isInteger(input.genericType ?? Number.NaN) && input.genericType !== undefined
        ? input.genericType
        : undefined;
    const templateGenericType =
      genericType === undefined
        ? await this.resolveRuntimeDoorTemplateGenericType(input)
        : undefined;
    const resolvedGenericType = genericType ?? templateGenericType ?? undefined;
    const doortypesRow =
      appearanceType !== undefined ? lookup.doortypesByRowId.get(appearanceType) : undefined;
    const genericdoorsRow =
      (resolvedGenericType !== undefined
        ? lookup.genericdoorsByRowId.get(resolvedGenericType)
        : undefined) ??
      resolveGenericDoorRowByTemplateReference(lookup, [input.resref, input.templateId]);
    const hasLookupInput = appearanceType !== undefined || genericType !== undefined;
    if (!hasLookupInput && lookup.doortypesByRowId.size === 0 && lookup.genericdoorsByRowId.size === 0) {
      return null;
    }

    return {
      appearanceType,
      genericType: resolvedGenericType ?? genericdoorsRow?.rowId,
      doortypesSourceKey: doortypesRow?.sourceKey ?? lookup.doortypesSourceKey,
      doortypesRowId: doortypesRow?.rowId,
      doortypesLabel: doortypesRow?.label,
      doortypesModelResRef: doortypesRow?.modelResRef,
      genericdoorsSourceKey: genericdoorsRow?.sourceKey ?? lookup.genericdoorsSourceKey,
      genericdoorsRowId: genericdoorsRow?.rowId,
      genericdoorsLabel: genericdoorsRow?.label,
      genericdoorsModelResRef: genericdoorsRow?.modelResRef,
      modelResRef: doortypesRow?.modelResRef ?? genericdoorsRow?.modelResRef,
      doortypesAvailable: lookup.doortypesByRowId.size > 0,
      genericdoorsAvailable: lookup.genericdoorsByRowId.size > 0
    };
  }

  async resolveCreatureAppearanceProfile(
    appearanceType: number
  ): Promise<CreatureAppearanceProfileLookupResult | null> {
    if (!Number.isInteger(appearanceType) || appearanceType < 0) {
      return null;
    }
    const index = await this.getSnapshotIndex();
    const lookup = index?.creatureAppearanceProfileByRowId.get(Math.trunc(appearanceType));
    if (!lookup) {
      return null;
    }
    return {
      appearanceType: Math.trunc(appearanceType),
      appearanceLabel: lookup.appearanceLabel,
      appearanceSource2daRow: lookup.appearanceRowId,
      appearanceSourceKey: lookup.appearanceSourceKey,
      modelType: lookup.modelType,
      raceModel: lookup.raceModel,
      portrait2da: lookup.portrait2da,
      envMap: lookup.envMap,
      defaultPhenotype: lookup.defaultPhenotype,
      bloodColor: lookup.bloodColor,
      weaponScale: lookup.weaponScale,
      sizeCategory: lookup.sizeCategory
    };
  }

  private async resolveRuntimeDoorTemplateGenericType(input: {
    templateId?: string;
    resref?: string;
  }): Promise<number | null> {
    const candidates = dedupeDoorTemplateResRefs([
      input.resref,
      input.templateId,
      input.templateId?.replace(/^plc_/iu, "")
    ]);
    for (const candidate of candidates) {
      let pending = this.runtimeDoorTemplateGenericTypeByResref.get(candidate);
      if (!pending) {
        pending = this.readRuntimeDoorTemplateGenericType(candidate);
        this.runtimeDoorTemplateGenericTypeByResref.set(candidate, pending);
      }
      const genericType = await pending;
      if (genericType !== null) {
        return genericType;
      }
    }
    return null;
  }

  private async readRuntimeDoorTemplateGenericType(resref: string): Promise<number | null> {
    const runtimeSettingsApplicationService = this.runtimeSettingsApplicationService;
    if (!runtimeSettingsApplicationService) {
      return null;
    }

    const settings = await runtimeSettingsApplicationService.getRuntimeSettings();
    const source = settings.sources.placeable;
    const resolvedHakSettings = source.includeHaks
      ? await runtimeSettingsApplicationService.getResolvedHakSettings()
      : null;

    if (source.includeHaks && resolvedHakSettings) {
      const fromHak = await readRuntimeDoorTemplateGenericTypeFromHakPaths(
        resolvedHakSettings.placeable.hakPaths,
        resref,
        this.logger
      );
      if (fromHak !== null) {
        return fromHak;
      }
    }

    if (source.includeVanilla) {
      return readRuntimeDoorTemplateGenericTypeFromVanilla(
        settings.paths.vanillaDataPath,
        resref,
        this.logger
      );
    }

    return null;
  }

  getPrecomputedPlaceableCacheKey(templateId: string, subtype: PlaceableSubtype): string | null {
    if (!this.snapshotIndex) {
      return null;
    }
    return (
      this.snapshotIndex.placeableProcessingByIdAndSubtype.get(
        buildPlaceableProcessingIndexKey(templateId, subtype)
      ) ?? null
    );
  }

  getPrecomputedTemplateCacheKey(
    kind: Exclude<TemplateKind, "placeable">,
    templateId: string
  ): string | null {
    if (!this.snapshotIndex) {
      return null;
    }
    return (
      this.snapshotIndex.templateProcessingByKindAndId.get(
        buildTemplateProcessingIndexKey(kind, templateId)
      ) ?? null
    );
  }

  invalidateSnapshotIndex(): void {
    this.snapshotIndex = null;
    this.inFlightSnapshotIndex.clear();
    this.capturedSnapshot = null;
  }

  private async getSnapshotIndex(): Promise<SnapshotIndex | null> {
    const now = Date.now();
    if (
      this.snapshotIndex &&
      now - this.snapshotIndex.fetchedAtMs < SNAPSHOT_TEMPLATE_CATALOG_INDEX_TTL_MS
    ) {
      return this.snapshotIndex;
    }

    const settings = await this.runtimeSettingsRepository.get();
    const inFlightKey = [
      settings.blobStorage.bucket,
      normalizePrefixForLookup(settings.blobStorage.modulePrefix)
    ].join("|");

    const refreshedIndex = executeInFlight(this.inFlightSnapshotIndex, inFlightKey, async () => {
      const refreshNow = Date.now();
      const indexStartedAtMs = Date.now();
      let stageStartedAtMs = indexStartedAtMs;
      const logIndexStage = (
        stage: string,
        details: Record<string, string | number | boolean | null | undefined> = {}
      ) => {
        this.logger.log(
          JSON.stringify({
            event: "templateSnapshotIndexStep",
            stage,
            elapsedMs: Math.round(Date.now() - stageStartedAtMs),
            totalElapsedMs: Math.round(Date.now() - indexStartedAtMs),
            ...details
          })
        );
        stageStartedAtMs = Date.now();
      };
      if (
        this.snapshotIndex &&
        refreshNow - this.snapshotIndex.fetchedAtMs < SNAPSHOT_TEMPLATE_CATALOG_INDEX_TTL_MS
      ) {
        return this.snapshotIndex;
      }

      let snapshot = await this.listAllModuleSnapshotObjects(settings.blobStorage);
      logIndexStage("listAllModuleSnapshotObjects", {
        objectCount: snapshot.objects.length,
        moduleHash: snapshot.moduleHash
      });
      snapshot = await this.syncLocalRetailStoreTemplatesForCatalog(
        settings.blobStorage,
        snapshot,
        logIndexStage
      );
      let lightColorTwoDaSources = await this.loadLightColorTwoDaSources(
        settings.blobStorage,
        snapshot.objects
      );
      logIndexStage("loadLightColorTwoDaSources", {
        sourceCount: lightColorTwoDaSources.length
      });
      if (lightColorTwoDaSources.length === 0 && this.runtimeSettingsApplicationService) {
        lightColorTwoDaSources = await this.loadRuntimeSourceLightColorTwoDaSources();
        logIndexStage("loadRuntimeSourceLightColorTwoDaSources", {
          sourceCount: lightColorTwoDaSources.length,
          rowCount: lightColorTwoDaSources.reduce((sum, source) => sum + source.rows.length, 0)
        });
      }
      const placeablesTwoDaSources = await this.loadPlaceablesTwoDaSources(
        settings,
        snapshot.objects,
        lightColorTwoDaSources
      );
      logIndexStage("loadPlaceablesTwoDaSources", {
        sourceCount: placeablesTwoDaSources.length,
        rowCount: placeablesTwoDaSources.reduce((sum, source) => sum + source.rows.length, 0)
      });
      const effectiveWaypointTwoDaSource = await this.loadEffectiveWaypointTwoDa(
        settings,
        snapshot.objects,
      );
      logIndexStage("loadEffectiveWaypointTwoDa", {
        rowCount: effectiveWaypointTwoDaSource?.rows.length ?? 0,
      });
      const effectiveItemBaseItemsTwoDa = await this.loadEffectiveItemBaseItemsTwoDa(
        settings,
        snapshot.objects,
      );
      logIndexStage("loadEffectiveItemBaseItemsTwoDa", {
        rowCount: effectiveItemBaseItemsTwoDa?.rows.length ?? 0,
      });
      const effectiveTrapsTwoDa = await this.loadEffectiveTrapsTwoDa(
        settings,
        snapshot.objects,
      );
      logIndexStage("loadEffectiveTrapsTwoDa", {
        rowCount: effectiveTrapsTwoDa?.rows.length ?? 0,
      });
      const effectiveBodyBagTwoDa = await this.loadEffectiveBodyBagTwoDa(
        settings,
        snapshot.objects,
      );
      logIndexStage("loadEffectiveBodyBagTwoDa", {
        rowCount: effectiveBodyBagTwoDa?.rows.length ?? 0,
      });
      const effectivePortraitsTwoDa = await this.loadEffectivePortraitsTwoDa(
        settings,
        snapshot.objects,
      );
      logIndexStage("loadEffectivePortraitsTwoDa", {
        rowCount: effectivePortraitsTwoDa?.rows.length ?? 0,
      });
      const effectiveCreaturePortraitsTwoDa = await this.loadEffectiveCreaturePortraitsTwoDa(
        settings,
        snapshot.objects,
      );
      logIndexStage("loadEffectiveCreaturePortraitsTwoDa", {
        rowCount: effectiveCreaturePortraitsTwoDa?.rows.length ?? 0,
      });
      let effectiveCreatureRacialTypesTwoDa =
        await this.loadEffectiveCreatureRacialTypesTwoDa(settings, snapshot.objects);
      logIndexStage("loadEffectiveCreatureRacialTypesTwoDa", {
        rowCount: effectiveCreatureRacialTypesTwoDa?.descriptor.rowCount ?? 0,
      });
      if (effectiveCreatureRacialTypesTwoDa === undefined &&
        this.runtimeSettingsApplicationService) {
        effectiveCreatureRacialTypesTwoDa =
          await this.loadRuntimeEffectiveCreatureRacialTypesTwoDa();
        logIndexStage("loadRuntimeEffectiveCreatureRacialTypesTwoDa", {
          rowCount: effectiveCreatureRacialTypesTwoDa?.descriptor.rowCount ?? 0,
        });
      }
      let effectiveCreaturePerceptionRangesTwoDa =
        await this.loadEffectiveCreaturePerceptionRangesTwoDa(settings, snapshot.objects);
      logIndexStage("loadEffectiveCreaturePerceptionRangesTwoDa", {
        rowCount: effectiveCreaturePerceptionRangesTwoDa?.descriptor.rowCount ?? 0,
      });
      if (effectiveCreaturePerceptionRangesTwoDa === undefined &&
        this.runtimeSettingsApplicationService) {
        effectiveCreaturePerceptionRangesTwoDa =
          await this.loadRuntimeEffectiveCreaturePerceptionRangesTwoDa();
        logIndexStage("loadRuntimeEffectiveCreaturePerceptionRangesTwoDa", {
          rowCount: effectiveCreaturePerceptionRangesTwoDa?.descriptor.rowCount ?? 0,
        });
      }
      let effectiveCreatureWalkRatesTwoDa =
        await this.loadEffectiveCreatureWalkRatesTwoDa(settings, snapshot.objects);
      logIndexStage("loadEffectiveCreatureWalkRatesTwoDa", {
        rowCount: effectiveCreatureWalkRatesTwoDa?.descriptor.rowCount ?? 0,
      });
      if (effectiveCreatureWalkRatesTwoDa === undefined &&
        this.runtimeSettingsApplicationService) {
        effectiveCreatureWalkRatesTwoDa =
          await this.loadRuntimeEffectiveCreatureWalkRatesTwoDa();
        logIndexStage("loadRuntimeEffectiveCreatureWalkRatesTwoDa", {
          rowCount: effectiveCreatureWalkRatesTwoDa?.descriptor.rowCount ?? 0,
        });
      }
      let effectiveCreatureSoundSetsTwoDa =
        await this.loadEffectiveCreatureSoundSetsTwoDa(settings, snapshot.objects);
      logIndexStage("loadEffectiveCreatureSoundSetsTwoDa", {
        rowCount: effectiveCreatureSoundSetsTwoDa?.descriptor.rowCount ?? 0,
      });
      if (effectiveCreatureSoundSetsTwoDa === undefined &&
        this.runtimeSettingsApplicationService) {
        effectiveCreatureSoundSetsTwoDa =
          await this.loadRuntimeEffectiveCreatureSoundSetsTwoDa();
        logIndexStage("loadRuntimeEffectiveCreatureSoundSetsTwoDa", {
          rowCount: effectiveCreatureSoundSetsTwoDa?.descriptor.rowCount ?? 0,
        });
      }
      let effectiveCreatureStartingPackagesTwoDa =
        await this.loadEffectiveCreatureStartingPackagesTwoDa(settings, snapshot.objects);
      logIndexStage("loadEffectiveCreatureStartingPackagesTwoDa", {
        rowCount: effectiveCreatureStartingPackagesTwoDa?.descriptor.rowCount ?? 0,
      });
      if (effectiveCreatureStartingPackagesTwoDa === undefined &&
        this.runtimeSettingsApplicationService) {
        effectiveCreatureStartingPackagesTwoDa =
          await this.loadRuntimeEffectiveCreatureStartingPackagesTwoDa();
        logIndexStage("loadRuntimeEffectiveCreatureStartingPackagesTwoDa", {
          rowCount: effectiveCreatureStartingPackagesTwoDa?.descriptor.rowCount ?? 0,
        });
      }
      let effectiveCreatureClassesTwoDa =
        await this.loadEffectiveCreatureClassesTwoDa(settings, snapshot.objects);
      logIndexStage("loadEffectiveCreatureClassesTwoDa", {
        rowCount: effectiveCreatureClassesTwoDa?.descriptor.rowCount ?? 0,
      });
      if (effectiveCreatureClassesTwoDa === undefined &&
        this.runtimeSettingsApplicationService) {
        effectiveCreatureClassesTwoDa = await this.loadRuntimeEffectiveCreatureClassesTwoDa();
        logIndexStage("loadRuntimeEffectiveCreatureClassesTwoDa", {
          rowCount: effectiveCreatureClassesTwoDa?.descriptor.rowCount ?? 0,
        });
      }
      let effectiveCreatureSkillsTwoDa =
        await this.loadEffectiveCreatureSkillsTwoDa(settings, snapshot.objects);
      logIndexStage("loadEffectiveCreatureSkillsTwoDa", {
        rowCount: effectiveCreatureSkillsTwoDa?.descriptor.rowCount ?? 0,
      });
      if (effectiveCreatureSkillsTwoDa === undefined && this.runtimeSettingsApplicationService) {
        effectiveCreatureSkillsTwoDa = await this.loadRuntimeEffectiveCreatureSkillsTwoDa();
        logIndexStage("loadRuntimeEffectiveCreatureSkillsTwoDa", {
          rowCount: effectiveCreatureSkillsTwoDa?.descriptor.rowCount ?? 0,
        });
      }
      let effectiveCreatureFeatsTwoDa =
        await this.loadEffectiveCreatureFeatsTwoDa(settings, snapshot.objects);
      logIndexStage("loadEffectiveCreatureFeatsTwoDa", {
        rowCount: effectiveCreatureFeatsTwoDa?.descriptor.rowCount ?? 0,
      });
      if (effectiveCreatureFeatsTwoDa === undefined && this.runtimeSettingsApplicationService) {
        effectiveCreatureFeatsTwoDa = await this.loadRuntimeEffectiveCreatureFeatsTwoDa();
        logIndexStage("loadRuntimeEffectiveCreatureFeatsTwoDa", {
          rowCount: effectiveCreatureFeatsTwoDa?.descriptor.rowCount ?? 0,
        });
      }
      let effectiveCreatureSpecialAbilitiesTwoDa =
        await this.loadEffectiveCreatureSpecialAbilitiesTwoDa(settings, snapshot.objects);
      logIndexStage("loadEffectiveCreatureSpecialAbilitiesTwoDa", {
        rowCount: effectiveCreatureSpecialAbilitiesTwoDa?.descriptor.rowCount ?? 0,
      });
      if (effectiveCreatureSpecialAbilitiesTwoDa === undefined &&
        this.runtimeSettingsApplicationService) {
        effectiveCreatureSpecialAbilitiesTwoDa =
          await this.loadRuntimeEffectiveCreatureSpecialAbilitiesTwoDa();
        logIndexStage("loadRuntimeEffectiveCreatureSpecialAbilitiesTwoDa", {
          rowCount: effectiveCreatureSpecialAbilitiesTwoDa?.descriptor.rowCount ?? 0,
        });
      }
      const effectiveAreaAudioTables = await this.loadEffectiveAreaAudioTables(
        settings,
        snapshot.objects,
      );
      logIndexStage("loadEffectiveAreaAudioTables", {
        ambientSoundRows: effectiveAreaAudioTables?.ambientSound.rows.length ?? 0,
        ambientMusicRows: effectiveAreaAudioTables?.ambientMusic.rows.length ?? 0,
        environmentalAudioRows:
          effectiveAreaAudioTables?.environmentalAudio.rows.length ?? 0,
      });
      const effectiveAreaVisualEnvironmentTables =
        await this.loadEffectiveAreaVisualEnvironmentTables(settings, snapshot.objects);
      logIndexStage("loadEffectiveAreaVisualEnvironmentTables", {
        lightingSchemeRows:
          effectiveAreaVisualEnvironmentTables?.lightingSchemes.rows.length ?? 0,
        skyBoxRows: effectiveAreaVisualEnvironmentTables?.skyBoxes.rows.length ?? 0,
      });
      const effectiveAreaEncounterDifficultyTable =
        await this.loadEffectiveAreaEncounterDifficultyTable(settings, snapshot.objects);
      logIndexStage("loadEffectiveAreaEncounterDifficultyTable", {
        rowCount: effectiveAreaEncounterDifficultyTable?.rows.length ?? 0,
      });
      const effectiveAreaLoadingScreenSources =
        await this.loadEffectiveAreaLoadingScreenSources(settings, snapshot.objects);
      logIndexStage("loadEffectiveAreaLoadingScreenSources", {
        rowCount: effectiveAreaLoadingScreenSources?.table.rows.length ?? 0,
        selectableImageCount:
          effectiveAreaLoadingScreenSources?.imagesByResRef.size ?? 0,
      });
      const moduleFactionCatalog = await this.loadModuleFactionCatalog(
        settings,
        snapshot.objects,
      );
      logIndexStage("loadModuleFactionCatalog", {
        rowCount: moduleFactionCatalog?.rows.length ?? 0,
      });
      let creatureAppearanceTwoDaSources = await this.loadCreatureAppearanceTwoDaSources(
        settings,
        snapshot.objects
      );
      logIndexStage("loadCreatureAppearanceTwoDaSources", {
        sourceCount: creatureAppearanceTwoDaSources.length,
        rowCount: creatureAppearanceTwoDaSources.reduce((sum, source) => sum + source.rows.length, 0)
      });
      if (
        creatureAppearanceTwoDaSources.length === 0 &&
        this.runtimeSettingsApplicationService
      ) {
        creatureAppearanceTwoDaSources =
          await this.loadRuntimeSourceCreatureAppearanceTwoDaSources();
        logIndexStage("loadRuntimeSourceCreatureAppearanceTwoDaSources", {
          sourceCount: creatureAppearanceTwoDaSources.length,
          rowCount: creatureAppearanceTwoDaSources.reduce((sum, source) => sum + source.rows.length, 0)
        });
      }
      let effectiveCreatureGenderTwoDaSource =
        await this.loadEffectiveCreatureGenderTwoDaSource(settings, snapshot.objects);
      logIndexStage("loadEffectiveCreatureGenderTwoDaSource", {
        rowCount: effectiveCreatureGenderTwoDaSource?.descriptor.rowCount ?? 0,
      });
      if (!effectiveCreatureGenderTwoDaSource && this.runtimeSettingsApplicationService) {
        effectiveCreatureGenderTwoDaSource =
          await this.loadRuntimeEffectiveCreatureGenderTwoDaSource();
        logIndexStage("loadRuntimeEffectiveCreatureGenderTwoDaSource", {
          rowCount: effectiveCreatureGenderTwoDaSource?.descriptor.rowCount ?? 0,
        });
      }
      let effectiveCreatureWingModelTwoDaSource =
        await this.loadEffectiveCreatureAppendageTwoDaSource(
          settings,
          snapshot.objects,
          "wingmodel.2da",
        );
      if (!effectiveCreatureWingModelTwoDaSource && this.runtimeSettingsApplicationService) {
        effectiveCreatureWingModelTwoDaSource =
          await this.loadRuntimeEffectiveCreatureAppendageTwoDaSource("wingmodel.2da");
      }
      logIndexStage("loadEffectiveCreatureWingModelTwoDaSource", {
        rowCount: effectiveCreatureWingModelTwoDaSource?.descriptor.rowCount ?? 0,
      });
      let effectiveCreatureTailModelTwoDaSource =
        await this.loadEffectiveCreatureAppendageTwoDaSource(
          settings,
          snapshot.objects,
          "tailmodel.2da",
        );
      if (!effectiveCreatureTailModelTwoDaSource && this.runtimeSettingsApplicationService) {
        effectiveCreatureTailModelTwoDaSource =
          await this.loadRuntimeEffectiveCreatureAppendageTwoDaSource("tailmodel.2da");
      }
      logIndexStage("loadEffectiveCreatureTailModelTwoDaSource", {
        rowCount: effectiveCreatureTailModelTwoDaSource?.descriptor.rowCount ?? 0,
      });
      let effectiveCreaturePhenotypeTwoDaSource =
        await this.loadEffectiveCreaturePhenotypeTwoDaSource(settings, snapshot.objects);
      logIndexStage("loadEffectiveCreaturePhenotypeTwoDaSource", {
        rowCount: effectiveCreaturePhenotypeTwoDaSource?.descriptor.rowCount ?? 0,
      });
      if (!effectiveCreaturePhenotypeTwoDaSource && this.runtimeSettingsApplicationService) {
        effectiveCreaturePhenotypeTwoDaSource =
          await this.loadRuntimeEffectiveCreaturePhenotypeTwoDaSource();
        logIndexStage("loadRuntimeEffectiveCreaturePhenotypeTwoDaSource", {
          rowCount: effectiveCreaturePhenotypeTwoDaSource?.descriptor.rowCount ?? 0,
        });
      }
      const creatureSpeedTwoDaSources = await this.loadCreatureSpeedTwoDaSources(
        settings.blobStorage,
        snapshot.objects
      );
      logIndexStage("loadCreatureSpeedTwoDaSources", {
        sourceCount: creatureSpeedTwoDaSources.length
      });
      const creatureClassTwoDaSources = await this.loadCreatureClassTwoDaSources(
        settings.blobStorage,
        snapshot.objects
      );
      logIndexStage("loadCreatureClassTwoDaSources", {
        sourceCount: creatureClassTwoDaSources.length
      });
      const creatureRaceTwoDaSources = await this.loadCreatureRaceTwoDaSources(
        settings.blobStorage,
        snapshot.objects
      );
      logIndexStage("loadCreatureRaceTwoDaSources", {
        sourceCount: creatureRaceTwoDaSources.length
      });
      const creatureGenderTwoDaSources = await this.loadCreatureGenderTwoDaSources(
        settings.blobStorage,
        snapshot.objects
      );
      logIndexStage("loadCreatureGenderTwoDaSources", {
        sourceCount: creatureGenderTwoDaSources.length
      });
      const creaturePhenotypeTwoDaSources = await this.loadCreaturePhenotypeTwoDaSources(
        settings.blobStorage,
        snapshot.objects
      );
      logIndexStage("loadCreaturePhenotypeTwoDaSources", {
        sourceCount: creaturePhenotypeTwoDaSources.length
      });
      let creaturePartTwoDaSources = await this.loadCreaturePartTwoDaSources(
        settings.blobStorage,
        snapshot.objects
      );
      logIndexStage("loadCreaturePartTwoDaSources", {
        sourceCount: creaturePartTwoDaSources.length
      });
      if (creaturePartTwoDaSources.length === 0 && this.runtimeSettingsApplicationService) {
        creaturePartTwoDaSources = await this.loadRuntimeSourceCreaturePartTwoDaSources();
        logIndexStage("loadRuntimeSourceCreaturePartTwoDaSources", {
          sourceCount: creaturePartTwoDaSources.length
        });
      }
      let creatureWingModelTwoDaSources = await this.loadCreatureAccessoryModelTwoDaSources(
        settings.blobStorage,
        snapshot.objects,
        "wingmodel.2da",
        "wingmodel.2da.MODEL"
      );
      logIndexStage("loadCreatureWingModelTwoDaSources", {
        sourceCount: creatureWingModelTwoDaSources.length
      });
      if (creatureWingModelTwoDaSources.length === 0 && this.runtimeSettingsApplicationService) {
        creatureWingModelTwoDaSources =
          await this.loadRuntimeSourceCreatureAccessoryModelTwoDaSources(
            "wingmodel.2da",
            "wingmodel.2da.MODEL"
          );
        logIndexStage("loadRuntimeSourceCreatureWingModelTwoDaSources", {
          sourceCount: creatureWingModelTwoDaSources.length
        });
      }
      let creatureTailModelTwoDaSources = await this.loadCreatureAccessoryModelTwoDaSources(
        settings.blobStorage,
        snapshot.objects,
        "tailmodel.2da",
        "tailmodel.2da.MODEL"
      );
      logIndexStage("loadCreatureTailModelTwoDaSources", {
        sourceCount: creatureTailModelTwoDaSources.length
      });
      if (creatureTailModelTwoDaSources.length === 0 && this.runtimeSettingsApplicationService) {
        creatureTailModelTwoDaSources =
          await this.loadRuntimeSourceCreatureAccessoryModelTwoDaSources(
            "tailmodel.2da",
            "tailmodel.2da.MODEL"
          );
        logIndexStage("loadRuntimeSourceCreatureTailModelTwoDaSources", {
          sourceCount: creatureTailModelTwoDaSources.length
        });
      }
      const creatureSizeTwoDaSources = await this.loadCreatureSizeTwoDaSources(
        settings.blobStorage,
        snapshot.objects
      );
      logIndexStage("loadCreatureSizeTwoDaSources", {
        sourceCount: creatureSizeTwoDaSources.length
      });
      const creaturePortraitTwoDaSources = await this.loadCreaturePortraitTwoDaSources(
        settings.blobStorage,
        snapshot.objects
      );
      logIndexStage("loadCreaturePortraitTwoDaSources", {
        sourceCount: creaturePortraitTwoDaSources.length
      });
      const creatureSoundSetTwoDaSources = await this.loadCreatureSoundSetTwoDaSources(
        settings.blobStorage,
        snapshot.objects
      );
      logIndexStage("loadCreatureSoundSetTwoDaSources", {
        sourceCount: creatureSoundSetTwoDaSources.length
      });
      const creatureSkillTwoDaSources = await this.loadCreatureSkillTwoDaSources(
        settings.blobStorage,
        snapshot.objects
      );
      logIndexStage("loadCreatureSkillTwoDaSources", {
        sourceCount: creatureSkillTwoDaSources.length
      });
      const creatureFeatTwoDaSources = await this.loadCreatureFeatTwoDaSources(
        settings.blobStorage,
        snapshot.objects
      );
      logIndexStage("loadCreatureFeatTwoDaSources", {
        sourceCount: creatureFeatTwoDaSources.length
      });
      const creatureSpellTwoDaSources = await this.loadCreatureSpellTwoDaSources(
        settings.blobStorage,
        snapshot.objects
      );
      logIndexStage("loadCreatureSpellTwoDaSources", {
        sourceCount: creatureSpellTwoDaSources.length
      });
      const itemBaseItemTwoDaSources = await this.loadItemBaseItemTwoDaSources(
        settings.blobStorage,
        snapshot.objects
      );
      logIndexStage("loadItemBaseItemTwoDaSources", {
        sourceCount: itemBaseItemTwoDaSources.length
      });
      const itemPropertyDefinitionTwoDaSources =
        await this.loadItemPropertyDefinitionTwoDaSources(settings.blobStorage, snapshot.objects);
      logIndexStage("loadItemPropertyDefinitionTwoDaSources", {
        sourceCount: itemPropertyDefinitionTwoDaSources.length
      });
      let candidates = await this.buildTemplateCandidatesFromSnapshot(
        settings.blobStorage,
        snapshot.objects,
        placeablesTwoDaSources
      );
      logIndexStage("buildTemplateCandidatesFromSnapshot", {
        candidateCount: candidates.length
      });
      const creatureTemplateSourceSyncAttemptKey =
        buildCreatureTemplateSourceSyncAttemptKey(settings, snapshot.objects);
      if (
        this.runtimeSettingsApplicationService &&
        creatureTemplateSourceSyncAttemptKey &&
        !this.creatureTemplateSourceSyncAttemptKeys.has(creatureTemplateSourceSyncAttemptKey)
      ) {
        const syncResult =
          await this.runtimeSettingsApplicationService.syncCreatureTemplateSources(
            "catalog-creature-template-auto-sync"
          );
        this.creatureTemplateSourceSyncAttemptKeys.add(creatureTemplateSourceSyncAttemptKey);
        logIndexStage("syncCreatureTemplateSourcesForCatalog", {
          uploadedFiles: syncResult.uploadedFiles,
          discoveredHakTemplates: syncResult.discoveredHakTemplates,
          discoveredVanillaTemplates: syncResult.discoveredVanillaTemplates
        });
        if (syncResult.uploadedFiles > 0) {
          snapshot = await this.listAllModuleSnapshotObjects(settings.blobStorage);
          logIndexStage("listAllModuleSnapshotObjectsAfterCreatureTemplateSync", {
            objectCount: snapshot.objects.length,
            moduleHash: snapshot.moduleHash
          });
          candidates = await this.buildTemplateCandidatesFromSnapshot(
            settings.blobStorage,
            snapshot.objects,
            placeablesTwoDaSources
          );
          logIndexStage("rebuildTemplateCandidatesAfterCreatureTemplateSync", {
            candidateCount: candidates.length
          });
        }
      }
      const itemTemplateSourceSyncAttemptKey =
        buildItemTemplateSourceSyncAttemptKey(settings, snapshot.objects);
      if (
        this.runtimeSettingsApplicationService &&
        itemTemplateSourceSyncAttemptKey &&
        !this.itemTemplateSourceSyncAttemptKeys.has(itemTemplateSourceSyncAttemptKey)
      ) {
        const syncResult =
          await this.runtimeSettingsApplicationService.syncItemTemplateSources(
            "catalog-item-template-auto-sync"
          );
        this.itemTemplateSourceSyncAttemptKeys.add(itemTemplateSourceSyncAttemptKey);
        logIndexStage("syncItemTemplateSourcesForCatalog", {
          uploadedFiles: syncResult.uploadedFiles,
          discoveredHakTemplates: syncResult.discoveredHakTemplates,
          discoveredVanillaTemplates: syncResult.discoveredVanillaTemplates
        });
        if (syncResult.uploadedFiles > 0) {
          snapshot = await this.listAllModuleSnapshotObjects(settings.blobStorage);
          logIndexStage("listAllModuleSnapshotObjectsAfterItemTemplateSync", {
            objectCount: snapshot.objects.length,
            moduleHash: snapshot.moduleHash
          });
          candidates = await this.buildTemplateCandidatesFromSnapshot(
            settings.blobStorage,
            snapshot.objects,
            placeablesTwoDaSources
          );
          logIndexStage("rebuildTemplateCandidatesAfterItemTemplateSync", {
            candidateCount: candidates.length
          });
        }
      }
      const templateTalkTableLookup = await buildTemplateTalkTableLookup(
        settings.paths,
        candidates,
        [
          ...collectCreatureClassTalkTableStrRefs(creatureClassTwoDaSources),
          ...collectEffectiveCreatureAppearanceTwoDaStrRefs(creatureAppearanceTwoDaSources),
          ...(effectiveCreatureGenderTwoDaSource?.rows.flatMap((row) =>
            row.nameStrRef === undefined ? [] : [row.nameStrRef]
          ) ?? []),
          ...(effectiveCreaturePhenotypeTwoDaSource?.rows.flatMap((row) =>
            row.nameStrRef === undefined ? [] : [row.nameStrRef]
          ) ?? []),
          ...(effectiveCreaturePerceptionRangesTwoDa?.rows.map((row) => row.nameStrRef) ?? []),
          ...(effectiveCreatureWalkRatesTwoDa?.rows.map((row) => row.nameStrRef) ?? []),
          ...(effectiveCreatureSoundSetsTwoDa?.rows.flatMap((row) =>
            row.nameStrRef === null ? [] : [row.nameStrRef]
          ) ?? []),
          ...(effectiveCreatureStartingPackagesTwoDa?.rows.flatMap((row) =>
            row.nameStrRef === null ? [] : [row.nameStrRef]
          ) ?? []),
          ...(effectiveCreatureSkillsTwoDa?.rows.map((row) => row.nameStrRef) ?? []),
          ...(effectiveCreatureFeatsTwoDa?.rows.map((row) => row.featNameStrRef) ?? []),
          ...(effectiveCreatureSpecialAbilitiesTwoDa?.rows.flatMap((row) => [
            row.nameStrRef,
            ...(row.spellDescStrRef === undefined ? [] : [row.spellDescStrRef]),
          ]) ?? []),
          ...collectEffectivePlaceablesTwoDaStrRefs(placeablesTwoDaSources),
          ...(effectiveWaypointTwoDaSource?.rows.map((row) => row.strRef) ?? []),
          ...(effectiveTrapsTwoDa?.rows.flatMap((row) =>
            row.trapNameStrRef === undefined ? [] : [row.trapNameStrRef]
          ) ?? []),
          ...(effectiveBodyBagTwoDa?.rows.map((row) => row.nameStrRef) ?? []),
          ...(effectiveAreaAudioTables
            ? [
                ...effectiveAreaAudioTables.ambientSound.rows,
                ...effectiveAreaAudioTables.ambientMusic.rows,
                ...effectiveAreaAudioTables.environmentalAudio.rows,
              ].flatMap((row) =>
                row.descriptionStrRef === undefined ? [] : [row.descriptionStrRef]
              )
            : []),
          ...(effectiveAreaVisualEnvironmentTables
            ? [
                ...effectiveAreaVisualEnvironmentTables.lightingSchemes.rows.flatMap((row) =>
                  row.strRef === undefined ? [] : [row.strRef]
                ),
                ...effectiveAreaVisualEnvironmentTables.skyBoxes.rows.flatMap((row) =>
                  row.stringRef === undefined ? [] : [row.stringRef]
                ),
              ]
            : []),
          ...(effectiveAreaLoadingScreenSources
            ? [
                AREA_LOADING_SCREEN_DEFAULT_STRREF,
                ...effectiveAreaLoadingScreenSources.table.rows.flatMap((row) =>
                  row.strRef === undefined ? [] : [row.strRef]
                ),
              ]
            : []),
        ],
        this.logger
      );
      logIndexStage("buildTemplateTalkTableLookup", {
        candidateCount: candidates.length
      });
      const placeableAppearanceModelLookup =
        this.buildPlaceableAppearanceModelLookup(placeablesTwoDaSources);
      const effectivePlaceablesTwoDaRows = buildEffectivePlaceablesTwoDaRowOptions(
        placeablesTwoDaSources[0]?.appearanceRows ?? [],
        (strRef) => templateTalkTableLookup.resolve(strRef)?.text,
      );
      const effectiveWaypointTwoDaRows = buildEffectiveWaypointTwoDaRowOptions(
        effectiveWaypointTwoDaSource?.rows ?? [],
        (strRef) => templateTalkTableLookup.resolve(strRef)?.text,
      );
      const effectiveCreatureAppearanceTwoDaRows =
        buildEffectiveCreatureAppearanceTwoDaRowOptions(
          creatureAppearanceTwoDaSources[0]?.appearanceRows ?? [],
          (strRef) => templateTalkTableLookup.resolve(strRef)?.text,
        );
      const effectiveCreatureGenderTwoDaRows =
        buildEffectiveCreatureGenderTwoDaRowOptions(
          effectiveCreatureGenderTwoDaSource?.rows ?? [],
          (strRef) => templateTalkTableLookup.resolve(strRef)?.text,
        );
      const effectiveCreatureWingModelTwoDaRows =
        buildEffectiveCreatureAppendageTwoDaRowOptions(
          effectiveCreatureWingModelTwoDaSource?.rows ?? [],
        );
      const effectiveCreatureTailModelTwoDaRows =
        buildEffectiveCreatureAppendageTwoDaRowOptions(
          effectiveCreatureTailModelTwoDaSource?.rows ?? [],
        );
      const effectiveCreaturePhenotypeTwoDaRows =
        buildEffectiveCreaturePhenotypeTwoDaRowOptions(
          effectiveCreaturePhenotypeTwoDaSource?.rows ?? [],
          (strRef) => templateTalkTableLookup.resolve(strRef)?.text,
        );
      effectiveCreaturePerceptionRangesTwoDa = effectiveCreaturePerceptionRangesTwoDa
        ? localizeEffectiveCreaturePerceptionRangesTwoDa(
            effectiveCreaturePerceptionRangesTwoDa,
            (strRef) => templateTalkTableLookup.resolve(strRef)?.text,
          )
        : effectiveCreaturePerceptionRangesTwoDa;
      effectiveCreatureWalkRatesTwoDa = effectiveCreatureWalkRatesTwoDa
        ? localizeEffectiveCreatureWalkRatesTwoDa(
            effectiveCreatureWalkRatesTwoDa,
            (strRef) => templateTalkTableLookup.resolve(strRef)?.text,
          )
        : effectiveCreatureWalkRatesTwoDa;
      effectiveCreatureSoundSetsTwoDa = effectiveCreatureSoundSetsTwoDa
        ? localizeEffectiveCreatureSoundSetsTwoDa(
            effectiveCreatureSoundSetsTwoDa,
            (strRef) => templateTalkTableLookup.resolve(strRef)?.text,
          )
        : effectiveCreatureSoundSetsTwoDa;
      effectiveCreatureStartingPackagesTwoDa = effectiveCreatureStartingPackagesTwoDa
        ? localizeEffectiveCreatureStartingPackagesTwoDa(
            effectiveCreatureStartingPackagesTwoDa,
            (strRef) => templateTalkTableLookup.resolve(strRef)?.text,
          )
        : effectiveCreatureStartingPackagesTwoDa;
      effectiveCreatureClassesTwoDa = effectiveCreatureClassesTwoDa
        ? localizeEffectiveCreatureClassesTwoDa(
            effectiveCreatureClassesTwoDa,
            (strRef) => templateTalkTableLookup.resolve(strRef)?.text,
          )
        : effectiveCreatureClassesTwoDa;
      effectiveCreatureSkillsTwoDa = effectiveCreatureSkillsTwoDa
        ? localizeEffectiveCreatureSkillsTwoDa(
            effectiveCreatureSkillsTwoDa,
            (strRef) => templateTalkTableLookup.resolve(strRef)?.text,
          )
        : effectiveCreatureSkillsTwoDa;
      effectiveCreatureFeatsTwoDa = effectiveCreatureFeatsTwoDa
        ? localizeEffectiveCreatureFeatsTwoDa(
            effectiveCreatureFeatsTwoDa,
            (strRef) => templateTalkTableLookup.resolve(strRef)?.text,
          )
        : effectiveCreatureFeatsTwoDa;
      effectiveCreatureSpecialAbilitiesTwoDa = effectiveCreatureSpecialAbilitiesTwoDa
        ? localizeEffectiveCreatureSpecialAbilitiesTwoDa(
            effectiveCreatureSpecialAbilitiesTwoDa,
            (strRef) => templateTalkTableLookup.resolve(strRef)?.text,
          )
        : effectiveCreatureSpecialAbilitiesTwoDa;
      const effectiveTrapsTwoDaRows = buildEffectiveTrapsTwoDaRowOptions(
        effectiveTrapsTwoDa?.rows ?? [],
        (strRef) => templateTalkTableLookup.resolve(strRef)?.text,
      );
      const effectiveBodyBagTwoDaRows = buildEffectiveBodyBagTwoDaRowOptions(
        effectiveBodyBagTwoDa?.rows ?? [],
        (strRef) => templateTalkTableLookup.resolve(strRef)?.text,
      );
      const effectiveAreaAudioCatalogCandidate: EffectiveAreaAudioCatalogBundle | null =
        effectiveAreaAudioTables
          ? Object.freeze({
              schemaVersion: AREA_AUDIO_ENVIRONMENT_CATALOGS_SCHEMA_VERSION,
              ambientSound: buildEffectiveAreaAudioCatalog(
                effectiveAreaAudioTables.ambientSound,
                (strRef) => templateTalkTableLookup.resolve(strRef)?.text,
              ),
              ambientMusic: buildEffectiveAreaAudioCatalog(
                effectiveAreaAudioTables.ambientMusic,
                (strRef) => templateTalkTableLookup.resolve(strRef)?.text,
              ),
              environmentalAudio: buildEffectiveAreaAudioCatalog(
                effectiveAreaAudioTables.environmentalAudio,
                (strRef) => templateTalkTableLookup.resolve(strRef)?.text,
              ),
            })
          : null;
      const effectiveAreaAudioCatalogs = effectiveAreaAudioCatalogCandidate &&
        isExactEffectiveAreaAudioCatalogBundle(effectiveAreaAudioCatalogCandidate)
          ? effectiveAreaAudioCatalogCandidate
          : null;
      const effectiveAreaVisualEnvironmentCatalogCandidate:
        EffectiveAreaVisualEnvironmentCatalogBundle | null =
        effectiveAreaVisualEnvironmentTables
          ? Object.freeze({
              schemaVersion: AREA_VISUAL_ENVIRONMENT_CATALOGS_SCHEMA_VERSION,
              lightingSchemes: buildEffectiveAreaLightingSchemeCatalog(
                effectiveAreaVisualEnvironmentTables.lightingSchemes,
                (strRef) => templateTalkTableLookup.resolve(strRef)?.text,
              ),
              skyBoxes: buildEffectiveAreaSkyBoxCatalog(
                effectiveAreaVisualEnvironmentTables.skyBoxes,
                (strRef) => templateTalkTableLookup.resolve(strRef)?.text,
              ),
            })
          : null;
      const effectiveAreaVisualEnvironmentCatalogs =
        effectiveAreaVisualEnvironmentCatalogCandidate &&
        isExactEffectiveAreaVisualEnvironmentCatalogBundle(
          effectiveAreaVisualEnvironmentCatalogCandidate,
        )
          ? effectiveAreaVisualEnvironmentCatalogCandidate
          : null;
      const effectiveAreaEncounterDifficultyCatalogCandidate =
        effectiveAreaEncounterDifficultyTable
          ? buildEffectiveAreaEncounterDifficultyCatalog(
              effectiveAreaEncounterDifficultyTable,
              (strRef) => templateTalkTableLookup.resolve(strRef)?.text,
            )
          : null;
      const effectiveAreaEncounterDifficultyCatalog =
        effectiveAreaEncounterDifficultyCatalogCandidate &&
        isExactEffectiveAreaEncounterDifficultyCatalog(
          effectiveAreaEncounterDifficultyCatalogCandidate,
        )
          ? effectiveAreaEncounterDifficultyCatalogCandidate
          : null;
      const effectiveAreaLoadingScreenCatalogCandidate =
        effectiveAreaLoadingScreenSources
          ? buildEffectiveAreaLoadingScreenCatalog(
              effectiveAreaLoadingScreenSources.table,
              (strRef) => templateTalkTableLookup.resolve(strRef)?.text,
              (imageResRef) =>
                effectiveAreaLoadingScreenSources.imagesByResRef.get(
                  imageResRef.toLowerCase(),
                ),
            )
          : null;
      const effectiveAreaLoadingScreenCatalog =
        effectiveAreaLoadingScreenCatalogCandidate &&
        isExactEffectiveAreaLoadingScreenCatalog(effectiveAreaLoadingScreenCatalogCandidate)
          ? effectiveAreaLoadingScreenCatalogCandidate
          : null;
      const creatureWalkRateLookup = this.buildCreatureWalkRateLookup(
        creatureAppearanceTwoDaSources,
        creatureSpeedTwoDaSources
      );
      const creatureAppearanceLabelLookup =
        this.buildCreatureAppearanceLabelLookup(creatureAppearanceTwoDaSources);
      const creatureClassLabelLookup = this.buildCreatureClassLabelLookup(
        creatureClassTwoDaSources,
        templateTalkTableLookup
      );
      const creatureRaceLabelLookup =
        this.buildCreatureRaceLabelLookup(creatureRaceTwoDaSources);
      const creatureGenderLabelLookup =
        this.buildCreatureGenderLabelLookup(creatureGenderTwoDaSources);
      const creaturePhenotypeLabelLookup =
        this.buildCreaturePhenotypeLabelLookup(creaturePhenotypeTwoDaSources);
      const creaturePartModelLookup =
        this.buildCreaturePartModelLookup(creaturePartTwoDaSources);
      const creatureWingModelLookup =
        this.buildCreatureAccessoryModelLookup(creatureWingModelTwoDaSources);
      const creatureTailModelLookup =
        this.buildCreatureAccessoryModelLookup(creatureTailModelTwoDaSources);
      const creatureSizeLabelLookup =
        this.buildCreatureSizeLabelLookup(creatureSizeTwoDaSources);
      const creaturePortraitLookup =
        this.buildCreaturePortraitLookup(creaturePortraitTwoDaSources);
      const creatureSoundSetLookup =
        this.buildCreatureSoundSetLookup(creatureSoundSetTwoDaSources);
      const creatureSkillLabelLookup =
        this.buildCreatureSkillLabelLookup(creatureSkillTwoDaSources);
      const creatureFeatLabelLookup =
        this.buildCreatureFeatLabelLookup(creatureFeatTwoDaSources);
      const creatureSpellLabelLookup =
        this.buildCreatureSpellLabelLookup(creatureSpellTwoDaSources);
      const itemBaseItemLookup = this.buildItemBaseItemLookup(itemBaseItemTwoDaSources);
      const itemPropertyDefinitionLookup = this.buildItemPropertyDefinitionLookup(
        itemPropertyDefinitionTwoDaSources
      );
      logIndexStage("buildLookups", {
        placeableAppearanceCount: placeableAppearanceModelLookup.size,
        creatureWalkRateCount: creatureWalkRateLookup.size,
        itemBaseItemCount: itemBaseItemLookup.size,
        itemPropertyDefinitionCount: itemPropertyDefinitionLookup.size
      });
      let doorTwoDaLookup = await this.buildDoorTwoDaLookup(
        settings.blobStorage,
        snapshot.objects
      );
      logIndexStage("buildDoorTwoDaLookup", {
        hasSources: hasDoorTwoDaLookupSources(doorTwoDaLookup)
      });
      if (!hasDoorTwoDaLookupSources(doorTwoDaLookup) && this.runtimeSettingsApplicationService) {
        const syncResult = await this.runtimeSettingsApplicationService.syncPlaceableModelSources(
          "catalog-door-2da-auto-sync",
          { appearanceTypes: [], modelResRefs: [] }
        );
        logIndexStage("syncPlaceableModelSourcesForDoorLookup", {
          uploadedFiles: syncResult.uploadedFiles
        });
        if (syncResult.uploadedFiles > 0) {
          snapshot = await this.listAllModuleSnapshotObjects(settings.blobStorage);
          doorTwoDaLookup = await this.buildDoorTwoDaLookup(
            settings.blobStorage,
            snapshot.objects
          );
          logIndexStage("rebuildDoorTwoDaLookupAfterSync", {
            objectCount: snapshot.objects.length,
            hasSources: hasDoorTwoDaLookupSources(doorTwoDaLookup)
          });
        }
      }
      if (!hasDoorTwoDaLookupSources(doorTwoDaLookup)) {
        doorTwoDaLookup = this.runtimeSettingsApplicationService
          ? await this.buildRuntimeSourceDoorTwoDaLookup()
          : doorTwoDaLookup;
        logIndexStage("buildRuntimeSourceDoorTwoDaLookup", {
          hasSources: hasDoorTwoDaLookupSources(doorTwoDaLookup)
        });
      }

    if (candidates.length === 0) {
      this.logger.warn(
        "No template files detected in module snapshot (expected: utp/utd/utc/uti/ute/utm/utw). Returning empty catalog for this snapshot."
      );
      const emptyFingerprint = createHash("sha256").update("").digest("hex");
      const emptyCacheKey = [
        settings.blobStorage.bucket,
        snapshot.prefix,
        snapshot.moduleHash ?? "unknown",
        String(snapshot.objects.length),
        "0",
        emptyFingerprint
      ].join("|");
      this.snapshotIndex = {
        fetchedAtMs: refreshNow,
        cacheKey: emptyCacheKey,
        byKind: new Map(),
        byKindAndId: new Map(),
        byKindAndResref: new Map(),
        placeableProcessingByIdAndSubtype: new Map(),
        templateProcessingByKindAndId: new Map(),
        placeableAppearanceModelByRowId: placeableAppearanceModelLookup,
        effectivePlaceablesTwoDaDescriptor: placeablesTwoDaSources[0]?.descriptor ?? null,
        effectivePlaceablesTwoDaRows,
        effectiveWaypointTwoDaDescriptor: effectiveWaypointTwoDaSource?.descriptor ?? null,
        effectiveWaypointTwoDaRows,
        effectiveCreatureAppearanceTwoDaDescriptor:
          creatureAppearanceTwoDaSources[0]?.descriptor ?? null,
        effectiveCreatureAppearanceTwoDaRows,
        effectiveCreatureGenderTwoDaDescriptor:
          effectiveCreatureGenderTwoDaSource?.descriptor ?? null,
        effectiveCreatureGenderTwoDaRows,
        effectiveCreatureWingModelTwoDaDescriptor:
          effectiveCreatureWingModelTwoDaSource?.descriptor ?? null,
        effectiveCreatureWingModelTwoDaRows,
        effectiveCreatureTailModelTwoDaDescriptor:
          effectiveCreatureTailModelTwoDaSource?.descriptor ?? null,
        effectiveCreatureTailModelTwoDaRows,
        effectiveCreaturePhenotypeTwoDaDescriptor:
          effectiveCreaturePhenotypeTwoDaSource?.descriptor ?? null,
        effectiveCreaturePhenotypeTwoDaRows,
        effectiveItemBaseItemsTwoDaDescriptor:
          effectiveItemBaseItemsTwoDa?.descriptor ?? null,
        effectiveItemBaseItemsTwoDaRows:
          effectiveItemBaseItemsTwoDa?.rows.map((row) => ({ ...row })) ?? [],
        effectiveTrapsTwoDaDescriptor: effectiveTrapsTwoDa?.descriptor ?? null,
        effectiveTrapsTwoDaRows,
        effectiveBodyBagTwoDaDescriptor: effectiveBodyBagTwoDa?.descriptor ?? null,
        effectiveBodyBagTwoDaRows,
        effectivePortraitsTwoDaDescriptor: effectivePortraitsTwoDa?.descriptor ?? null,
        effectivePortraitsTwoDaRows: effectivePortraitsTwoDa?.rows.map((row) => ({ ...row })) ?? [],
        effectiveCreaturePortraitsTwoDaDescriptor:
          effectiveCreaturePortraitsTwoDa?.descriptor ?? null,
        effectiveCreaturePortraitsTwoDaRows:
          effectiveCreaturePortraitsTwoDa?.rows.map((row) => ({ ...row })) ?? [],
        effectiveCreatureRacialTypesTwoDa: effectiveCreatureRacialTypesTwoDa ?? null,
        effectiveCreaturePerceptionRangesTwoDa:
          effectiveCreaturePerceptionRangesTwoDa ?? null,
        effectiveCreatureWalkRatesTwoDa: effectiveCreatureWalkRatesTwoDa ?? null,
        effectiveCreatureSoundSetsTwoDa: effectiveCreatureSoundSetsTwoDa ?? null,
        effectiveCreatureStartingPackagesTwoDa:
          effectiveCreatureStartingPackagesTwoDa ?? null,
        effectiveCreatureClassesTwoDa: effectiveCreatureClassesTwoDa ?? null,
        effectiveCreatureSkillsTwoDa: effectiveCreatureSkillsTwoDa ?? null,
        effectiveCreatureFeatsTwoDa: effectiveCreatureFeatsTwoDa ?? null,
        effectiveCreatureSpecialAbilitiesTwoDa:
          effectiveCreatureSpecialAbilitiesTwoDa ?? null,
        effectiveAreaAudioCatalogs,
        effectiveAreaVisualEnvironmentCatalogs,
        effectiveAreaLoadingScreenCatalog,
        effectiveAreaEncounterDifficultyCatalog,
        moduleFactionCatalog,
        creatureAppearanceProfileByRowId: creatureAppearanceLabelLookup,
        creatureWalkRateByAppearanceId: creatureWalkRateLookup,
        doorTwoDaLookup
      };
      return this.snapshotIndex;
    }

    const placeableBenchmarkIds = pickBenchmarkTemplateIds(candidates, "placeable");
    const creatureBenchmarkIds = pickBenchmarkTemplateIds(candidates, "creature");
    const itemBenchmarkIds = pickBenchmarkTemplateIds(candidates, "item");
    const encounterBenchmarkIds = pickBenchmarkTemplateIds(candidates, "encounter");
    const storeBenchmarkIds = pickBenchmarkTemplateIds(candidates, "store");
    const waypointBenchmarkIds = pickBenchmarkTemplateIds(candidates, "waypoint");
    const itemTemplateReferenceLookup = buildItemTemplateReferenceLookup(
      candidates,
      templateTalkTableLookup,
      itemBaseItemLookup,
      itemPropertyDefinitionLookup
    );

    const mapped = candidates
      .map((candidate) => ({
        candidate,
        record: mapCandidateToTemplateRecord(
          candidate,
          {
            placeable: placeableBenchmarkIds,
            creature: creatureBenchmarkIds,
            item: itemBenchmarkIds,
            encounter: encounterBenchmarkIds,
            store: storeBenchmarkIds,
            waypoint: waypointBenchmarkIds
          },
          placeableAppearanceModelLookup,
          creatureWalkRateLookup,
          creatureAppearanceLabelLookup,
          creatureClassLabelLookup,
          creatureRaceLabelLookup,
          creatureGenderLabelLookup,
          creaturePhenotypeLabelLookup,
          creaturePartModelLookup,
          creatureWingModelLookup,
          creatureTailModelLookup,
          creatureSizeLabelLookup,
          creaturePortraitLookup,
          creatureSoundSetLookup,
          creatureSkillLabelLookup,
          creatureFeatLabelLookup,
          creatureSpellLabelLookup,
          templateTalkTableLookup,
          itemTemplateReferenceLookup,
          itemBaseItemLookup,
          itemPropertyDefinitionLookup,
          doorTwoDaLookup
        )
      }))
      .sort((left, right) => left.record.templateId.localeCompare(right.record.templateId));

    const byKind = new Map<TemplateKind, IndexedTemplate[]>();
    const byKindAndId = new Map<string, TemplateRecord>();
    const byKindAndResref = new Map<string, TemplateRecord>();
    const placeableProcessingByIdAndSubtype = new Map<string, string>();
    const templateProcessingByKindAndId = new Map<string, string>();

    for (const { candidate, record } of mapped) {
      const indexed: IndexedTemplate = {
        record,
        searchable: buildTemplateSearchableText(record),
        categoryLower: record.category.toLowerCase(),
        tagsLower: new Set(record.tags.map((tag) => tag.toLowerCase()))
      };
      const bucket = byKind.get(record.kind);
      if (bucket) {
        bucket.push(indexed);
      } else {
        byKind.set(record.kind, [indexed]);
      }

      byKindAndId.set(buildTemplateIdIndexKey(record.kind, record.templateId), record);
      byKindAndResref.set(buildTemplateResrefIndexKey(record.kind, record.resref), record);

      if (record.kind === "placeable") {
        const subtypes: PlaceableSubtype[] = [
          "generic",
          "door",
          "vfx",
          "container",
          "light_source",
          "trigger_proxy"
        ];
        for (const subtype of subtypes) {
          placeableProcessingByIdAndSubtype.set(
            buildPlaceableProcessingIndexKey(record.templateId, subtype),
            buildPlaceableProcessCacheKey(
              record.templateId,
              record.resref,
              subtype,
              candidate.sourceFingerprint
            )
          );
        }
      } else {
        const templateSourceFingerprint = buildTemplateProcessingSourceFingerprint(
          record,
          candidate,
          itemTemplateReferenceLookup
        );
        templateProcessingByKindAndId.set(
          buildTemplateProcessingIndexKey(record.kind, record.templateId),
          buildTemplateProcessCacheKey(
            record.kind,
            record.templateId,
            record.resref,
            templateSourceFingerprint
          )
        );
      }
    }

    const candidateFingerprint = createHash("sha256")
      .update(
        mapped
          .map(({ record, candidate }) => `${record.kind}:${record.resref}:${candidate.sourceFingerprint}`)
          .join("\n")
      )
      .digest("hex");

    const cacheKey = [
      settings.blobStorage.bucket,
      snapshot.prefix,
      snapshot.moduleHash ?? "unknown",
      String(snapshot.objects.length),
      String(mapped.length),
      candidateFingerprint
    ].join("|");

    this.snapshotIndex = {
      fetchedAtMs: refreshNow,
      cacheKey,
      byKind,
      byKindAndId,
      byKindAndResref,
      placeableProcessingByIdAndSubtype,
      templateProcessingByKindAndId,
      placeableAppearanceModelByRowId: placeableAppearanceModelLookup,
      effectivePlaceablesTwoDaDescriptor: placeablesTwoDaSources[0]?.descriptor ?? null,
      effectivePlaceablesTwoDaRows,
      effectiveWaypointTwoDaDescriptor: effectiveWaypointTwoDaSource?.descriptor ?? null,
      effectiveWaypointTwoDaRows,
      effectiveCreatureAppearanceTwoDaDescriptor:
        creatureAppearanceTwoDaSources[0]?.descriptor ?? null,
      effectiveCreatureAppearanceTwoDaRows,
      effectiveCreatureGenderTwoDaDescriptor:
        effectiveCreatureGenderTwoDaSource?.descriptor ?? null,
      effectiveCreatureGenderTwoDaRows,
      effectiveCreatureWingModelTwoDaDescriptor:
        effectiveCreatureWingModelTwoDaSource?.descriptor ?? null,
      effectiveCreatureWingModelTwoDaRows,
      effectiveCreatureTailModelTwoDaDescriptor:
        effectiveCreatureTailModelTwoDaSource?.descriptor ?? null,
      effectiveCreatureTailModelTwoDaRows,
      effectiveCreaturePhenotypeTwoDaDescriptor:
        effectiveCreaturePhenotypeTwoDaSource?.descriptor ?? null,
      effectiveCreaturePhenotypeTwoDaRows,
      effectiveItemBaseItemsTwoDaDescriptor:
        effectiveItemBaseItemsTwoDa?.descriptor ?? null,
      effectiveItemBaseItemsTwoDaRows:
        effectiveItemBaseItemsTwoDa?.rows.map((row) => ({ ...row })) ?? [],
      effectiveTrapsTwoDaDescriptor: effectiveTrapsTwoDa?.descriptor ?? null,
      effectiveTrapsTwoDaRows,
      effectiveBodyBagTwoDaDescriptor: effectiveBodyBagTwoDa?.descriptor ?? null,
      effectiveBodyBagTwoDaRows,
      effectivePortraitsTwoDaDescriptor: effectivePortraitsTwoDa?.descriptor ?? null,
      effectivePortraitsTwoDaRows: effectivePortraitsTwoDa?.rows.map((row) => ({ ...row })) ?? [],
      effectiveCreaturePortraitsTwoDaDescriptor:
        effectiveCreaturePortraitsTwoDa?.descriptor ?? null,
      effectiveCreaturePortraitsTwoDaRows:
        effectiveCreaturePortraitsTwoDa?.rows.map((row) => ({ ...row })) ?? [],
      effectiveCreatureRacialTypesTwoDa: effectiveCreatureRacialTypesTwoDa ?? null,
      effectiveCreaturePerceptionRangesTwoDa:
        effectiveCreaturePerceptionRangesTwoDa ?? null,
      effectiveCreatureWalkRatesTwoDa: effectiveCreatureWalkRatesTwoDa ?? null,
      effectiveCreatureSoundSetsTwoDa: effectiveCreatureSoundSetsTwoDa ?? null,
      effectiveCreatureStartingPackagesTwoDa:
        effectiveCreatureStartingPackagesTwoDa ?? null,
      effectiveCreatureClassesTwoDa: effectiveCreatureClassesTwoDa ?? null,
      effectiveCreatureSkillsTwoDa: effectiveCreatureSkillsTwoDa ?? null,
      effectiveCreatureFeatsTwoDa: effectiveCreatureFeatsTwoDa ?? null,
      effectiveCreatureSpecialAbilitiesTwoDa:
        effectiveCreatureSpecialAbilitiesTwoDa ?? null,
      effectiveAreaAudioCatalogs,
      effectiveAreaVisualEnvironmentCatalogs,
      effectiveAreaLoadingScreenCatalog,
      effectiveAreaEncounterDifficultyCatalog,
      moduleFactionCatalog,
      creatureAppearanceProfileByRowId: creatureAppearanceLabelLookup,
      creatureWalkRateByAppearanceId: creatureWalkRateLookup,
      doorTwoDaLookup
    };
    logIndexStage("complete", {
      candidateCount: mapped.length,
      kindCount: byKind.size,
      placeableAppearanceCount: placeableAppearanceModelLookup.size
    });

      return this.snapshotIndex;
    });

    if (this.snapshotIndex) {
      const staleIndex = this.snapshotIndex;
      void refreshedIndex.catch((error: unknown) => {
        this.logger.warn(
          `Template snapshot index background refresh failed; keeping stale index: ${formatSnapshotIndexError(error)}`
        );
      });
      return staleIndex;
    }

    return refreshedIndex;
  }

  private async listAllModuleSnapshotObjects(
    settings: BlobStorageSettings
  ): Promise<ModuleBlobSnapshotSummary> {
    const captured = this.committedSnapshotReader
      ? await this.committedSnapshotReader.capture()
      : null;
    if (captured) {
      this.capturedSnapshot = captured;
    }
    const objects: ModuleBlobObjectSummary[] = [];
    let continuationToken: string | undefined;
    let moduleHash: string | undefined;
    let prefix = normalizePrefixForLookup(settings.modulePrefix);

    do {
      const page = captured
        ? await captured.listModuleSnapshot({ limit: 50_000, continuationToken })
        : await this.moduleBlobStorage.listModuleSnapshot(settings, {
            limit: 50_000,
            continuationToken
          });
      moduleHash = moduleHash ?? page.moduleHash;
      prefix = page.prefix;
      objects.push(...page.objects);
      continuationToken = page.continuationToken;
      if (!page.truncated || !continuationToken) {
        break;
      }
    } while (true);

    const totalBytes = objects.reduce((sum, object) => sum + object.size, 0);
    return {
      bucket: settings.bucket,
      prefix,
      moduleHash,
      totalFiles: objects.length,
      totalBytes,
      objects,
      truncated: false
    };
  }

  private async syncLocalRetailStoreTemplatesForCatalog(
    settings: BlobStorageSettings,
    snapshot: ModuleBlobSnapshotSummary,
    logIndexStage: (
      stage: string,
      details?: Record<string, string | number | boolean | null | undefined>
    ) => void
  ): Promise<ModuleBlobSnapshotSummary> {
    if (!this.moduleBlobStorage.putModuleObject) {
      return snapshot;
    }

    const localSources = await listLocalRetailStoreTemplateSources();
    if (localSources.length === 0) {
      return snapshot;
    }

    const existingStoreResrefs = new Set(
      snapshot.objects
        .filter((object) => extractExtension(extractFileName(object.key)) === "utm")
        .map((object) => normalizeResref(extractBasename(extractFileName(object.key))))
        .filter((resref) => resref.length > 0)
    );
    const missingSources = localSources.filter(
      (source) => !existingStoreResrefs.has(source.resref)
    );
    if (missingSources.length === 0) {
      return snapshot;
    }

    let uploadedFiles = 0;
    let uploadedBytes = 0;
    for (const source of missingSources) {
      await this.moduleBlobStorage.putModuleObject(settings, {
        fileName: `${source.resref}.utm`,
        resourceType: NWN_KEY_BIF_RESOURCE_TYPES.UTM,
        bytes: source.bytes
      });
      uploadedFiles += 1;
      uploadedBytes += source.bytes.length;
    }

    logIndexStage("syncLocalRetailStoreTemplatesForCatalog", {
      discoveredStoreTemplates: localSources.length,
      uploadedFiles,
      uploadedBytes
    });

    const refreshedSnapshot = await this.listAllModuleSnapshotObjects(settings);
    logIndexStage("listAllModuleSnapshotObjectsAfterRetailStoreSync", {
      objectCount: refreshedSnapshot.objects.length,
      moduleHash: refreshedSnapshot.moduleHash
    });
    return refreshedSnapshot;
  }

  private async buildTemplateCandidatesFromSnapshot(
    settings: BlobStorageSettings,
    objects: ModuleBlobObjectSummary[],
    placeablesTwoDaSources: LoadedPlaceablesTwoDaSource[]
  ): Promise<TemplateCandidate[]> {
    const byKey = new Map<string, TemplateCandidate>();

    for (const object of objects) {
      const fileName = extractFileName(object.key);
      const extension = extractExtension(fileName);
      if (!CANDIDATE_EXTENSIONS.has(extension)) {
        continue;
      }

      const resref = normalizeResref(extractBasename(fileName));
      if (resref.length < 2) {
        continue;
      }

      const kind = classifyTemplateKind(extension);
      const key = `${kind}:${resref}`;
      const candidate: TemplateCandidate = {
        kind,
        resref,
        extension,
        sourceKey: object.key,
        sourceSize: object.size,
        updatedAt: object.lastModified ?? new Date().toISOString(),
        sourceEtag: object.etag,
        sourceFingerprint: buildSourceFingerprint([
          "raw",
          kind,
          resref,
          object.key,
          String(object.size),
          object.lastModified ?? "",
          object.etag ?? ""
        ])
      };

      const current = byKey.get(key);
      if (!current) {
        byKey.set(key, candidate);
        continue;
      }

      const priorityDelta =
        resolveTemplateSourcePriority(candidate.sourceKey) -
        resolveTemplateSourcePriority(current.sourceKey);
      if (priorityDelta < 0) {
        byKey.set(key, candidate);
        continue;
      }
      if (priorityDelta > 0) {
        continue;
      }

      if (candidate.sourceSize > current.sourceSize) {
        byKey.set(key, candidate);
        continue;
      }
      if (candidate.sourceSize === current.sourceSize && candidate.updatedAt > current.updatedAt) {
        byKey.set(key, candidate);
      }
    }

    const candidates = [...byKey.values()];
    await mapWithConcurrency(candidates, 8, async (candidate) => {
      try {
        const payload = await this.readSnapshotObject(settings, candidate.sourceKey);
        if (!payload) {
          return;
        }

        const parsedBlueprint = parseTemplateBlueprintFromGff(payload.bytes);
        if (parsedBlueprint) {
          candidate.parsedBlueprint = parsedBlueprint;
        }

        const dependencyFingerprint = parsedBlueprint?.dependencyFingerprint ?? "none";
        candidate.sourceEtag = payload.etag ?? candidate.sourceEtag;
        candidate.sourceSha256 = buildContentHash(payload.bytes);
        candidate.sourceFingerprint = buildSourceFingerprint([
          "blob",
          candidate.kind,
          candidate.resref,
          candidate.sourceKey,
          String(payload.size),
          payload.lastModified ?? candidate.updatedAt,
          payload.etag ?? candidate.sourceEtag ?? "",
          parsedBlueprint?.sourceFileType ?? "",
          parsedBlueprint?.sourceFileVersion ?? "",
          String(parsedBlueprint?.sourceStructTypeId ?? -1),
          parsedBlueprint?.templateResRef ?? "",
          parsedBlueprint?.modelResRef ?? "",
          String(parsedBlueprint?.genericType ?? -1),
          dependencyFingerprint
        ]);
      } catch {
        // Keep candidate heuristics path if object payload is unavailable.
      }
    });

    const placeables2daRows = this.buildPlaceableCandidatesFromTwoDa(placeablesTwoDaSources);
    for (const row of placeables2daRows) {
      const key = `placeable:${row.modelResRef}`;
      if (byKey.has(key)) {
        continue;
      }

      const candidate: TemplateCandidate = {
        kind: "placeable",
        resref: row.modelResRef,
        extension: "2da",
        sourceKey: `${row.sourceKey}#row=${row.rowId}`,
        sourceSize: row.sourceSize,
        updatedAt: row.updatedAt,
        sourceEtag: row.sourceEtag,
        sourceFingerprint: row.sourceFingerprint,
        placeables2daRow: row
      };
      byKey.set(key, candidate);
      candidates.push(candidate);
    }

    return candidates;
  }

  private async loadEffectiveItemBaseItemsTwoDa(
    settings: RuntimeSettingsRecord,
    objects: ModuleBlobObjectSummary[],
  ): Promise<EffectiveItemBaseItemsTwoDaTable | null> {
    const resolvedHakSettings = this.runtimeSettingsApplicationService
      ? await this.runtimeSettingsApplicationService.getResolvedHakSettings()
      : null;
    const keys = collectItemEffectiveTwoDaKeys(
      objects,
      settings,
      "baseitems.2da",
      resolvedHakSettings?.item?.hakPriorityList,
    );
    const key = keys[0];
    if (key) {
      let payload;
      try {
        payload = await this.readSnapshotObject(settings.blobStorage, key);
      } catch {
        return null;
      }
      if (!payload) return null;
      const sourceLayer = resolveTwoDaSourceLayer(key);
      if (sourceLayer !== "module" && sourceLayer !== "hak" && sourceLayer !== "vanilla") {
        return null;
      }
      return parseEffectiveItemBaseItemsTwoDa({
        bytes: payload.bytes,
        sourceObjectKey: key,
        sourceLayer,
      });
    }
    return this.loadRuntimeSourceEffectiveItemBaseItemsTwoDa();
  }

  private async loadRuntimeSourceEffectiveItemBaseItemsTwoDa(): Promise<
    EffectiveItemBaseItemsTwoDaTable | null
  > {
    const service = this.runtimeSettingsApplicationService;
    if (!service) return null;
    const settings = await service.getRuntimeSettings();
    if (!settings.sources.item?.includeVanilla) return null;
    return readRuntimeEffectiveItemBaseItemsTwoDaFromVanilla(
      settings.paths.vanillaDataPath,
      this.logger,
    );
  }

  private async loadEffectiveTrapsTwoDa(
    settings: RuntimeSettingsRecord,
    objects: ModuleBlobObjectSummary[],
  ): Promise<EffectiveTrapsTwoDaTable | null> {
    const resolvedHakSettings = this.runtimeSettingsApplicationService
      ? await this.runtimeSettingsApplicationService.getResolvedHakSettings()
      : null;
    const keys = collectPlaceableEffectiveTwoDaKeys(
      objects,
      settings,
      "traps.2da",
      resolvedHakSettings?.placeable.hakPriorityList,
    );
    for (const key of keys) {
      let payload;
      try {
        payload = await this.readSnapshotObject(settings.blobStorage, key);
      } catch {
        continue;
      }
      if (!payload) {
        continue;
      }
      const parsed = parseEffectiveTrapsTwoDa({
        bytes: payload.bytes,
        sourceObjectKey: key,
        sourceLayer: resolveTwoDaSourceLayer(key),
      });
      if (parsed) {
        return parsed;
      }
    }
    return this.loadRuntimeSourceEffectiveTrapsTwoDa();
  }

  private async loadRuntimeSourceEffectiveTrapsTwoDa(): Promise<EffectiveTrapsTwoDaTable | null> {
    const runtimeSettingsApplicationService = this.runtimeSettingsApplicationService;
    if (!runtimeSettingsApplicationService) {
      return null;
    }
    const settings = await runtimeSettingsApplicationService.getRuntimeSettings();
    if (!settings.sources.placeable.includeVanilla) {
      return null;
    }
    return readRuntimeEffectiveTrapsTwoDaFromVanilla(
      settings.paths.vanillaDataPath,
      this.logger,
    );
  }

  private async loadEffectiveBodyBagTwoDa(
    settings: RuntimeSettingsRecord,
    objects: ModuleBlobObjectSummary[],
  ): Promise<EffectiveBodyBagTwoDaTable | null> {
    const resolvedHakSettings = this.runtimeSettingsApplicationService
      ? await this.runtimeSettingsApplicationService.getResolvedHakSettings()
      : null;
    const keys = collectPlaceableEffectiveTwoDaKeys(
      objects,
      settings,
      "bodybag.2da",
      resolvedHakSettings?.placeable.hakPriorityList,
    );
    const key = keys[0];
    if (key) {
      let payload;
      try {
        payload = await this.readSnapshotObject(settings.blobStorage, key);
      } catch {
        return null;
      }
      if (!payload) return null;
      return parseEffectiveBodyBagTwoDa({
        bytes: payload.bytes,
        sourceObjectKey: key,
        sourceLayer: resolveTwoDaSourceLayer(key),
      });
    }
    return this.loadRuntimeSourceEffectiveBodyBagTwoDa();
  }

  private async loadRuntimeSourceEffectiveBodyBagTwoDa(): Promise<EffectiveBodyBagTwoDaTable | null> {
    const runtimeSettingsApplicationService = this.runtimeSettingsApplicationService;
    if (!runtimeSettingsApplicationService) return null;
    const settings = await runtimeSettingsApplicationService.getRuntimeSettings();
    if (!settings.sources.placeable.includeVanilla) return null;
    return readRuntimeEffectiveBodyBagTwoDaFromVanilla(
      settings.paths.vanillaDataPath,
      this.logger,
    );
  }

  private async loadEffectivePortraitsTwoDa(
    settings: RuntimeSettingsRecord,
    objects: ModuleBlobObjectSummary[],
  ): Promise<EffectivePortraitsTwoDaTable | null> {
    const resolvedHakSettings = this.runtimeSettingsApplicationService
      ? await this.runtimeSettingsApplicationService.getResolvedHakSettings()
      : null;
    const keys = collectPlaceableEffectiveTwoDaKeys(
      objects,
      settings,
      "portraits.2da",
      resolvedHakSettings?.placeable.hakPriorityList,
    );
    const key = keys[0];
    if (!key) return null;
    let payload;
    try {
      payload = await this.readSnapshotObject(settings.blobStorage, key);
    } catch {
      return null;
    }
    if (!payload) return null;
    return parseEffectivePortraitsTwoDa({
      bytes: payload.bytes,
      sourceObjectKey: key,
      sourceLayer: resolveTwoDaSourceLayer(key),
    });
  }

  private async loadEffectiveCreaturePortraitsTwoDa(
    settings: RuntimeSettingsRecord,
    objects: ModuleBlobObjectSummary[],
  ): Promise<EffectiveCreaturePortraitsTwoDaTable | null> {
    const resolvedHakSettings = this.runtimeSettingsApplicationService
      ? await this.runtimeSettingsApplicationService.getResolvedHakSettings()
      : null;
    const keys = collectPlaceableEffectiveTwoDaKeys(
      objects,
      settings,
      "portraits.2da",
      resolvedHakSettings?.placeable.hakPriorityList,
    );
    const key = keys[0];
    if (!key) return null;
    let payload;
    try {
      payload = await this.readSnapshotObject(settings.blobStorage, key);
    } catch {
      return null;
    }
    if (!payload) return null;
    return parseEffectiveCreaturePortraitsTwoDa({
      bytes: payload.bytes,
      sourceObjectKey: key,
      sourceLayer: resolveTwoDaSourceLayer(key),
    });
  }

  private async loadEffectiveCreatureRacialTypesTwoDa(
    settings: RuntimeSettingsRecord,
    objects: ModuleBlobObjectSummary[],
  ): Promise<EffectiveCreatureRacialTypesTwoDaTable | null | undefined> {
    const resolvedHakSettings = this.runtimeSettingsApplicationService
      ? await this.runtimeSettingsApplicationService.getResolvedHakSettings()
      : null;
    const keys = collectCreatureEffectiveTwoDaKeys(
      objects,
      settings,
      "racialtypes.2da",
      resolvedHakSettings?.creature.hakPriorityList,
    );
    const key = keys[0];
    if (!key) return undefined;
    try {
      const payload = await this.readSnapshotObject(settings.blobStorage, key);
      if (!payload) return null;
      const sourceLayer = resolveEffectiveCreatureRacialTypesSourceLayer(key);
      return sourceLayer
        ? parseEffectiveCreatureRacialTypesTwoDa({
            bytes: payload.bytes,
            sourceObjectKey: key,
            sourceLayer,
          })
        : null;
    } catch {
      return null;
    }
  }

  private async loadRuntimeEffectiveCreatureRacialTypesTwoDa(): Promise<
    EffectiveCreatureRacialTypesTwoDaTable | null
  > {
    const service = this.runtimeSettingsApplicationService;
    if (!service) return null;
    const settings = await service.getRuntimeSettings();
    const source = settings.sources.creature ?? settings.sources.placeable;
    if (source.includeHaks) {
      const resolvedHakSettings = await service.getResolvedHakSettings();
      const hakTable = await readRuntimeEffectiveCreatureRacialTypesTwoDaFromHakPaths(
        resolvedHakSettings.creature.hakPaths,
        this.logger,
      );
      if (hakTable !== undefined) return hakTable;
    }
    return source.includeVanilla
      ? readRuntimeEffectiveCreatureRacialTypesTwoDaFromVanilla(
          settings.paths.vanillaDataPath,
          this.logger,
        )
      : null;
  }

  private async loadEffectiveCreaturePerceptionRangesTwoDa(
    settings: RuntimeSettingsRecord,
    objects: ModuleBlobObjectSummary[],
  ): Promise<EffectiveCreaturePerceptionRangesTwoDaTable | null | undefined> {
    const resolvedHakSettings = this.runtimeSettingsApplicationService
      ? await this.runtimeSettingsApplicationService.getResolvedHakSettings()
      : null;
    const keys = collectCreatureEffectiveTwoDaKeys(
      objects,
      settings,
      "ranges.2da",
      resolvedHakSettings?.creature.hakPriorityList,
    );
    const key = keys[0];
    if (!key) return undefined;
    try {
      const payload = await this.readSnapshotObject(settings.blobStorage, key);
      if (!payload) return null;
      const sourceLayer = resolveEffectiveCreaturePerceptionRangesSourceLayer(key);
      return sourceLayer
        ? parseEffectiveCreaturePerceptionRangesTwoDa({
            bytes: payload.bytes,
            sourceObjectKey: key,
            sourceLayer,
            resolveStrRef: () => undefined,
          })
        : null;
    } catch {
      return null;
    }
  }

  private async loadRuntimeEffectiveCreaturePerceptionRangesTwoDa(): Promise<
    EffectiveCreaturePerceptionRangesTwoDaTable | null
  > {
    const service = this.runtimeSettingsApplicationService;
    if (!service) return null;
    const settings = await service.getRuntimeSettings();
    const source = settings.sources.creature ?? settings.sources.placeable;
    if (source.includeHaks) {
      const resolvedHakSettings = await service.getResolvedHakSettings();
      const hakTable = await readRuntimeEffectiveCreaturePerceptionRangesTwoDaFromHakPaths(
        resolvedHakSettings.creature.hakPaths,
        this.logger,
      );
      if (hakTable !== undefined) return hakTable;
    }
    return source.includeVanilla
      ? readRuntimeEffectiveCreaturePerceptionRangesTwoDaFromVanilla(
          settings.paths.vanillaDataPath,
          this.logger,
        )
      : null;
  }

  private async loadEffectiveCreatureWalkRatesTwoDa(
    settings: RuntimeSettingsRecord,
    objects: ModuleBlobObjectSummary[],
  ): Promise<EffectiveCreatureWalkRatesTwoDaTable | null | undefined> {
    const resolvedHakSettings = this.runtimeSettingsApplicationService
      ? await this.runtimeSettingsApplicationService.getResolvedHakSettings()
      : null;
    const keys = collectCreatureEffectiveTwoDaKeys(
      objects,
      settings,
      "creaturespeed.2da",
      resolvedHakSettings?.creature.hakPriorityList,
    );
    const key = keys[0];
    if (!key) return undefined;
    try {
      const payload = await this.readSnapshotObject(settings.blobStorage, key);
      if (!payload) return null;
      const sourceLayer = resolveEffectiveCreatureWalkRatesSourceLayer(key);
      return sourceLayer
        ? parseEffectiveCreatureWalkRatesTwoDa({
            bytes: payload.bytes,
            sourceObjectKey: key,
            sourceLayer,
            resolveStrRef: () => undefined,
          })
        : null;
    } catch {
      return null;
    }
  }

  private async loadRuntimeEffectiveCreatureWalkRatesTwoDa(): Promise<
    EffectiveCreatureWalkRatesTwoDaTable | null
  > {
    const service = this.runtimeSettingsApplicationService;
    if (!service) return null;
    const settings = await service.getRuntimeSettings();
    const source = settings.sources.creature ?? settings.sources.placeable;
    if (source.includeHaks) {
      const resolvedHakSettings = await service.getResolvedHakSettings();
      const hakTable = await readRuntimeEffectiveCreatureWalkRatesTwoDaFromHakPaths(
        resolvedHakSettings.creature.hakPaths,
        this.logger,
      );
      if (hakTable !== undefined) return hakTable;
    }
    return source.includeVanilla
      ? readRuntimeEffectiveCreatureWalkRatesTwoDaFromVanilla(
          settings.paths.vanillaDataPath,
          this.logger,
        )
      : null;
  }

  private async loadEffectiveCreatureSoundSetsTwoDa(
    settings: RuntimeSettingsRecord,
    objects: ModuleBlobObjectSummary[],
  ): Promise<EffectiveCreatureSoundSetsTwoDaTable | null | undefined> {
    const resolvedHakSettings = this.runtimeSettingsApplicationService
      ? await this.runtimeSettingsApplicationService.getResolvedHakSettings()
      : null;
    const keys = collectCreatureEffectiveTwoDaKeys(
      objects,
      settings,
      "soundset.2da",
      resolvedHakSettings?.creature.hakPriorityList,
    );
    const key = keys[0];
    if (!key) return undefined;
    try {
      const payload = await this.readSnapshotObject(settings.blobStorage, key);
      if (!payload) return null;
      const sourceLayer = resolveEffectiveCreatureSoundSetsSourceLayer(key);
      return sourceLayer
        ? parseEffectiveCreatureSoundSetsTwoDa({
            bytes: payload.bytes,
            sourceObjectKey: key,
            sourceLayer,
            resolveStrRef: () => undefined,
          })
        : null;
    } catch {
      return null;
    }
  }

  private async loadRuntimeEffectiveCreatureSoundSetsTwoDa(): Promise<
    EffectiveCreatureSoundSetsTwoDaTable | null
  > {
    const service = this.runtimeSettingsApplicationService;
    if (!service) return null;
    const settings = await service.getRuntimeSettings();
    const source = settings.sources.creature ?? settings.sources.placeable;
    if (source.includeHaks) {
      const resolvedHakSettings = await service.getResolvedHakSettings();
      const hakTable = await readRuntimeEffectiveCreatureSoundSetsTwoDaFromHakPaths(
        resolvedHakSettings.creature.hakPaths,
        this.logger,
      );
      if (hakTable !== undefined) return hakTable;
    }
    return source.includeVanilla
      ? readRuntimeEffectiveCreatureSoundSetsTwoDaFromVanilla(
          settings.paths.vanillaDataPath,
          this.logger,
        )
      : null;
  }

  private async loadEffectiveCreatureStartingPackagesTwoDa(
    settings: RuntimeSettingsRecord,
    objects: ModuleBlobObjectSummary[],
  ): Promise<EffectiveCreatureStartingPackagesTwoDaTable | null | undefined> {
    const resolvedHakSettings = this.runtimeSettingsApplicationService
      ? await this.runtimeSettingsApplicationService.getResolvedHakSettings()
      : null;
    const keys = collectCreatureEffectiveTwoDaKeys(
      objects,
      settings,
      "packages.2da",
      resolvedHakSettings?.creature.hakPriorityList,
    );
    const key = keys[0];
    if (!key) return undefined;
    try {
      const payload = await this.readSnapshotObject(settings.blobStorage, key);
      if (!payload) return null;
      const sourceLayer = resolveEffectiveCreatureStartingPackagesSourceLayer(key);
      return sourceLayer
        ? parseEffectiveCreatureStartingPackagesTwoDa({
            bytes: payload.bytes,
            sourceObjectKey: key,
            sourceLayer,
            resolveStrRef: () => undefined,
          })
        : null;
    } catch {
      return null;
    }
  }

  private async loadRuntimeEffectiveCreatureStartingPackagesTwoDa(): Promise<
    EffectiveCreatureStartingPackagesTwoDaTable | null
  > {
    const service = this.runtimeSettingsApplicationService;
    if (!service) return null;
    const settings = await service.getRuntimeSettings();
    const source = settings.sources.creature ?? settings.sources.placeable;
    if (source.includeHaks) {
      const resolvedHakSettings = await service.getResolvedHakSettings();
      const hakTable = await readRuntimeEffectiveCreatureStartingPackagesTwoDaFromHakPaths(
        resolvedHakSettings.creature.hakPaths,
        this.logger,
      );
      if (hakTable !== undefined) return hakTable;
    }
    return source.includeVanilla
      ? readRuntimeEffectiveCreatureStartingPackagesTwoDaFromVanilla(
          settings.paths.vanillaDataPath,
          this.logger,
        )
      : null;
  }

  private async loadEffectiveCreatureClassesTwoDa(
    settings: RuntimeSettingsRecord,
    objects: ModuleBlobObjectSummary[],
  ): Promise<EffectiveCreatureClassesTwoDaTable | null | undefined> {
    const resolvedHakSettings = this.runtimeSettingsApplicationService
      ? await this.runtimeSettingsApplicationService.getResolvedHakSettings()
      : null;
    const keys = collectCreatureEffectiveTwoDaKeys(
      objects,
      settings,
      "classes.2da",
      resolvedHakSettings?.creature.hakPriorityList,
    );
    const key = keys[0];
    if (!key) return undefined;
    try {
      const payload = await this.readSnapshotObject(settings.blobStorage, key);
      if (!payload) return null;
      const sourceLayer = resolveEffectiveCreatureClassesSourceLayer(key);
      return sourceLayer
        ? parseEffectiveCreatureClassesTwoDa({
            bytes: payload.bytes,
            sourceObjectKey: key,
            sourceLayer,
            resolveStrRef: () => undefined,
          })
        : null;
    } catch {
      return null;
    }
  }

  private async loadRuntimeEffectiveCreatureClassesTwoDa(): Promise<
    EffectiveCreatureClassesTwoDaTable | null
  > {
    const service = this.runtimeSettingsApplicationService;
    if (!service) return null;
    const settings = await service.getRuntimeSettings();
    const source = settings.sources.creature ?? settings.sources.placeable;
    if (source.includeHaks) {
      const resolvedHakSettings = await service.getResolvedHakSettings();
      const hakTable = await readRuntimeEffectiveCreatureClassesTwoDaFromHakPaths(
        resolvedHakSettings.creature.hakPaths,
        this.logger,
      );
      if (hakTable !== undefined) return hakTable;
    }
    return source.includeVanilla
      ? readRuntimeEffectiveCreatureClassesTwoDaFromVanilla(
          settings.paths.vanillaDataPath,
          this.logger,
        )
      : null;
  }

  private async loadEffectiveCreatureSkillsTwoDa(
    settings: RuntimeSettingsRecord,
    objects: ModuleBlobObjectSummary[],
  ): Promise<EffectiveCreatureSkillsTwoDaTable | null | undefined> {
    const resolvedHakSettings = this.runtimeSettingsApplicationService
      ? await this.runtimeSettingsApplicationService.getResolvedHakSettings()
      : null;
    const keys = collectCreatureEffectiveTwoDaKeys(
      objects,
      settings,
      "skills.2da",
      resolvedHakSettings?.creature.hakPriorityList,
    );
    const key = keys[0];
    if (!key) return undefined;
    try {
      const payload = await this.readSnapshotObject(settings.blobStorage, key);
      if (!payload) return null;
      const sourceLayer = resolveEffectiveCreatureSkillsSourceLayer(key);
      return sourceLayer
        ? parseEffectiveCreatureSkillsTwoDa({
            bytes: payload.bytes,
            sourceObjectKey: key,
            sourceLayer,
            resolveStrRef: () => undefined,
          })
        : null;
    } catch {
      return null;
    }
  }

  private async loadRuntimeEffectiveCreatureSkillsTwoDa(): Promise<
    EffectiveCreatureSkillsTwoDaTable | null
  > {
    const service = this.runtimeSettingsApplicationService;
    if (!service) return null;
    const settings = await service.getRuntimeSettings();
    const source = settings.sources.creature ?? settings.sources.placeable;
    if (source.includeHaks) {
      const resolvedHakSettings = await service.getResolvedHakSettings();
      const hakTable = await readRuntimeEffectiveCreatureSkillsTwoDaFromHakPaths(
        resolvedHakSettings.creature.hakPaths,
        this.logger,
      );
      if (hakTable !== undefined) return hakTable;
    }
    return source.includeVanilla
      ? readRuntimeEffectiveCreatureSkillsTwoDaFromVanilla(
          settings.paths.vanillaDataPath,
          this.logger,
        )
      : null;
  }

  private async loadEffectiveCreatureFeatsTwoDa(
    settings: RuntimeSettingsRecord,
    objects: ModuleBlobObjectSummary[],
  ): Promise<EffectiveCreatureFeatsTwoDaTable | null | undefined> {
    const resolvedHakSettings = this.runtimeSettingsApplicationService
      ? await this.runtimeSettingsApplicationService.getResolvedHakSettings()
      : null;
    const keys = collectCreatureEffectiveTwoDaKeys(
      objects,
      settings,
      "feat.2da",
      resolvedHakSettings?.creature.hakPriorityList,
    );
    const key = keys[0];
    if (!key) return undefined;
    try {
      const payload = await this.readSnapshotObject(settings.blobStorage, key);
      if (!payload) return null;
      const sourceLayer = resolveEffectiveCreatureFeatsSourceLayer(key);
      return sourceLayer
        ? parseEffectiveCreatureFeatsTwoDa({
            bytes: payload.bytes,
            sourceObjectKey: key,
            sourceLayer,
            resolveStrRef: () => undefined,
          })
        : null;
    } catch {
      return null;
    }
  }

  private async loadRuntimeEffectiveCreatureFeatsTwoDa(): Promise<
    EffectiveCreatureFeatsTwoDaTable | null
  > {
    const service = this.runtimeSettingsApplicationService;
    if (!service) return null;
    const settings = await service.getRuntimeSettings();
    const source = settings.sources.creature ?? settings.sources.placeable;
    if (source.includeHaks) {
      const resolvedHakSettings = await service.getResolvedHakSettings();
      const hakTable = await readRuntimeEffectiveCreatureFeatsTwoDaFromHakPaths(
        resolvedHakSettings.creature.hakPaths,
        this.logger,
      );
      if (hakTable !== undefined) return hakTable;
    }
    return source.includeVanilla
      ? readRuntimeEffectiveCreatureFeatsTwoDaFromVanilla(
          settings.paths.vanillaDataPath,
          this.logger,
        )
      : null;
  }

  private async loadEffectiveCreatureSpecialAbilitiesTwoDa(
    settings: RuntimeSettingsRecord,
    objects: ModuleBlobObjectSummary[],
  ): Promise<EffectiveCreatureSpecialAbilitiesTwoDaTable | null | undefined> {
    const resolvedHakSettings = this.runtimeSettingsApplicationService
      ? await this.runtimeSettingsApplicationService.getResolvedHakSettings()
      : null;
    const keys = collectCreatureEffectiveTwoDaKeys(
      objects,
      settings,
      "spells.2da",
      resolvedHakSettings?.creature.hakPriorityList,
    );
    const key = keys[0];
    if (!key) return undefined;
    try {
      const payload = await this.readSnapshotObject(settings.blobStorage, key);
      if (!payload) return null;
      const sourceLayer = resolveEffectiveCreatureSpecialAbilitiesSourceLayer(key);
      return sourceLayer
        ? parseEffectiveCreatureSpecialAbilitiesTwoDa({
            bytes: payload.bytes,
            sourceObjectKey: key,
            sourceLayer,
            resolveStrRef: () => undefined,
          })
        : null;
    } catch {
      return null;
    }
  }

  private async loadRuntimeEffectiveCreatureSpecialAbilitiesTwoDa(): Promise<
    EffectiveCreatureSpecialAbilitiesTwoDaTable | null
  > {
    const service = this.runtimeSettingsApplicationService;
    if (!service) return null;
    const settings = await service.getRuntimeSettings();
    const source = settings.sources.creature ?? settings.sources.placeable;
    if (source.includeHaks) {
      const resolvedHakSettings = await service.getResolvedHakSettings();
      const hakTable = await readRuntimeEffectiveCreatureSpecialAbilitiesTwoDaFromHakPaths(
        resolvedHakSettings.creature.hakPaths,
        this.logger,
      );
      if (hakTable !== undefined) return hakTable;
    }
    return source.includeVanilla
      ? readRuntimeEffectiveCreatureSpecialAbilitiesTwoDaFromVanilla(
          settings.paths.vanillaDataPath,
          this.logger,
        )
      : null;
  }

  private async loadEffectiveAreaAudioTables(
    settings: RuntimeSettingsRecord,
    objects: ModuleBlobObjectSummary[],
  ): Promise<EffectiveAreaAudioSourceTables | null> {
    const resolvedHakSettings = this.runtimeSettingsApplicationService
      ? await this.runtimeSettingsApplicationService.getResolvedHakSettings()
      : null;
    const load = (resourceName: EffectiveAreaAudioTwoDaResourceName) =>
      this.loadEffectiveAreaAudioTable(
        settings,
        objects,
        resourceName,
        resolvedHakSettings?.area.hakPriorityList,
      );
    const ambientSound = await load("ambientsound.2da");
    if (!ambientSound) return null;
    const ambientMusic = await load("ambientmusic.2da");
    if (!ambientMusic) return null;
    const environmentalAudio = await load("soundeax.2da");
    if (!environmentalAudio) return null;
    return Object.freeze({ ambientSound, ambientMusic, environmentalAudio });
  }

  private async loadEffectiveAreaAudioTable(
    settings: RuntimeSettingsRecord,
    objects: ModuleBlobObjectSummary[],
    resourceName: EffectiveAreaAudioTwoDaResourceName,
    resolvedHakPriorityList?: readonly string[],
  ): Promise<EffectiveAreaAudioTwoDaTable | null> {
    const keys = collectAreaEffectiveTwoDaKeys(
      objects,
      settings,
      resourceName,
      resolvedHakPriorityList,
    );
    const key = keys[0];
    if (key) {
      try {
        const payload = await this.readSnapshotObject(settings.blobStorage, key);
        return payload
          ? parseEffectiveAreaAudioTwoDa({
              resourceName,
              bytes: payload.bytes,
              sourceObjectKey: key,
              sourceLayer: resolveTwoDaSourceLayer(key) as "module" | "hak" | "vanilla",
            })
          : null;
      } catch {
        return null;
      }
    }
    if (!settings.sources.area.includeVanilla) return null;
    return readRuntimeEffectiveAreaAudioTwoDaFromVanilla(
      settings.paths.vanillaDataPath,
      resourceName,
      this.logger,
    );
  }

  private async loadEffectiveAreaVisualEnvironmentTables(
    settings: RuntimeSettingsRecord,
    objects: ModuleBlobObjectSummary[],
  ): Promise<EffectiveAreaVisualEnvironmentSourceTables | null> {
    const resolvedHakSettings = this.runtimeSettingsApplicationService
      ? await this.runtimeSettingsApplicationService.getResolvedHakSettings()
      : null;
    const resolvedHakPriorityList = resolvedHakSettings?.area.hakPriorityList;
    const lightingSchemes = await this.loadEffectiveAreaVisualEnvironmentTable(
      settings,
      objects,
      "environment.2da",
      resolvedHakPriorityList,
    );
    if (!lightingSchemes || lightingSchemes.descriptor.resourceName !== "environment.2da") {
      return null;
    }
    const skyBoxes = await this.loadEffectiveAreaVisualEnvironmentTable(
      settings,
      objects,
      "skyboxes.2da",
      resolvedHakPriorityList,
    );
    if (!skyBoxes || skyBoxes.descriptor.resourceName !== "skyboxes.2da") return null;
    return Object.freeze({ lightingSchemes, skyBoxes });
  }

  private async loadEffectiveAreaVisualEnvironmentTable(
    settings: RuntimeSettingsRecord,
    objects: ModuleBlobObjectSummary[],
    resourceName: "environment.2da",
    resolvedHakPriorityList?: readonly string[],
  ): Promise<EffectiveAreaEnvironmentTwoDaTable | null>;
  private async loadEffectiveAreaVisualEnvironmentTable(
    settings: RuntimeSettingsRecord,
    objects: ModuleBlobObjectSummary[],
    resourceName: "skyboxes.2da",
    resolvedHakPriorityList?: readonly string[],
  ): Promise<EffectiveAreaSkyBoxesTwoDaTable | null>;
  private async loadEffectiveAreaVisualEnvironmentTable(
    settings: RuntimeSettingsRecord,
    objects: ModuleBlobObjectSummary[],
    resourceName: EffectiveAreaVisualResourceName,
    resolvedHakPriorityList?: readonly string[],
  ): Promise<EffectiveAreaEnvironmentTwoDaTable | EffectiveAreaSkyBoxesTwoDaTable | null> {
    const key = collectAreaEffectiveTwoDaKeys(
      objects,
      settings,
      resourceName,
      resolvedHakPriorityList,
    )[0];
    if (key) {
      try {
        const payload = await this.readSnapshotObject(settings.blobStorage, key);
        if (!payload) return null;
        const input = {
          bytes: payload.bytes,
          sourceObjectKey: key,
          sourceLayer: resolveTwoDaSourceLayer(key) as "module" | "hak" | "vanilla",
        };
        return resourceName === "environment.2da"
          ? parseEffectiveAreaEnvironmentTwoDa(input)
          : parseEffectiveAreaSkyBoxesTwoDa(input);
      } catch {
        return null;
      }
    }
    if (!settings.sources.area.includeVanilla) return null;
    return resourceName === "environment.2da"
      ? readRuntimeEffectiveAreaVisualEnvironmentTwoDaFromVanilla(
          settings.paths.vanillaDataPath,
          "environment.2da",
          this.logger,
        )
      : readRuntimeEffectiveAreaVisualEnvironmentTwoDaFromVanilla(
          settings.paths.vanillaDataPath,
          "skyboxes.2da",
          this.logger,
        );
  }

  private async loadEffectiveAreaEncounterDifficultyTable(
    settings: RuntimeSettingsRecord,
    objects: ModuleBlobObjectSummary[],
  ): Promise<EffectiveAreaEncounterDifficultyTwoDaTable | null> {
    const resolvedHakSettings = this.runtimeSettingsApplicationService
      ? await this.runtimeSettingsApplicationService.getResolvedHakSettings()
      : null;
    const key = collectAreaEffectiveTwoDaKeys(
      objects,
      settings,
      "encdifficulty.2da",
      resolvedHakSettings?.area.hakPriorityList,
    )[0];
    if (key) {
      try {
        const payload = await this.readSnapshotObject(settings.blobStorage, key);
        if (!payload) return null;
        const sourceLayer = resolveTwoDaSourceLayer(key);
        if (sourceLayer !== "module" && sourceLayer !== "hak" &&
            sourceLayer !== "vanilla") return null;
        return parseEffectiveAreaEncounterDifficultyTwoDa({
          bytes: payload.bytes,
          sourceObjectKey: key,
          sourceLayer,
        });
      } catch {
        return null;
      }
    }
    if (!settings.sources.area.includeVanilla) return null;
    return readRuntimeEffectiveAreaEncounterDifficultyTwoDaFromVanilla(
      settings.paths.vanillaDataPath,
      this.logger,
    );
  }

  private async loadEffectiveAreaLoadingScreenSources(
    settings: RuntimeSettingsRecord,
    objects: ModuleBlobObjectSummary[],
  ): Promise<EffectiveAreaLoadingScreenSources | null> {
    const resolvedHakSettings = this.runtimeSettingsApplicationService
      ? await this.runtimeSettingsApplicationService.getResolvedHakSettings()
      : null;
    const resolvedHakPriorityList = resolvedHakSettings?.area.hakPriorityList;
    const tableKeys = collectAreaEffectiveTwoDaKeys(
      objects,
      settings,
      "loadscreens.2da",
      resolvedHakPriorityList,
    ).filter((key) => resolveAreaLoadingScreenSourceLayer(key) !== null);
    const tableKey = tableKeys[0];
    let table: EffectiveAreaLoadingScreenTwoDaTable | null = null;
    if (tableKey) {
      let payload;
      try {
        payload = await this.readSnapshotObject(settings.blobStorage, tableKey);
      } catch {
        return null;
      }
      if (!payload) return null;
      const sourceLayer = resolveAreaLoadingScreenSourceLayer(tableKey);
      if (!sourceLayer) return null;
      table = parseEffectiveAreaLoadingScreenTwoDa({
        bytes: payload.bytes,
        sourceObjectKey: tableKey,
        sourceLayer,
      });
    } else if (settings.sources.area.includeVanilla && this.runtimeSettingsApplicationService) {
      table = await readRuntimeEffectiveAreaLoadingScreenTwoDaFromVanilla(
        settings.paths.vanillaDataPath,
        this.logger,
      );
    }
    if (!table) return null;

    const imageResRefs = [...new Set(table.rows.flatMap((row) =>
      row.imageResRef ? [row.imageResRef.toLowerCase()] : []
    ))];
    if (imageResRefs.length > MAX_EFFECTIVE_AREA_LOADING_SCREEN_IMAGES) return null;
    const normalizedHakOrder = buildAreaTwoDaHakOrder(settings, resolvedHakPriorityList);
    let vanillaReaders: readonly RuntimeVanillaKeyReader[] | null = null;
    let totalImageBytes = 0;
    const imagesByResRef = new Map<string, EffectiveAreaLoadingScreenImageAsset>();

    for (const imageResRef of imageResRefs) {
      const resourceName = `${imageResRef}.tga`;
      const keys = collectAreaEffectiveResourceKeys(
        objects,
        resourceName,
        normalizedHakOrder,
      ).filter((candidate) => resolveAreaLoadingScreenSourceLayer(candidate) !== null);
      const key = keys[0];
      let bytes: Buffer | null = null;
      let streamedDescriptor: Readonly<{ sizeBytes: number; sha256: string }> | null = null;
      let sourceObjectKey: string | null = null;
      let sourceLayer: "module" | "hak" | "vanilla" | null = null;
      if (key) {
        try {
          const payload = await this.readSnapshotObject(settings.blobStorage, key);
          if (payload) {
            bytes = payload.bytes;
            sourceObjectKey = key;
            sourceLayer = resolveAreaLoadingScreenSourceLayer(key);
          }
        } catch {
          // The strongest effective identity remains selected but unavailable.
          continue;
        }
      } else if (settings.sources.area.includeVanilla && this.runtimeSettingsApplicationService) {
        vanillaReaders ??= await openRuntimeVanillaKeyReaders(
          settings.paths.vanillaDataPath,
        );
        for (const source of vanillaReaders) {
          if (!source.reader.has(imageResRef, NWN_KEY_BIF_RESOURCE_TYPES.TGA)) continue;
          try {
            streamedDescriptor = await source.reader.describe(
              imageResRef,
              NWN_KEY_BIF_RESOURCE_TYPES.TGA,
            );
          } catch {
            streamedDescriptor = null;
          }
          sourceObjectKey =
            `runtime-source/vanilla/${source.keyFileName}/${resourceName}`;
          sourceLayer = "vanilla";
          break;
        }
      }
      const sizeBytes = bytes?.length ?? streamedDescriptor?.sizeBytes;
      const sha256 = bytes
        ? createHash("sha256").update(bytes).digest("hex")
        : streamedDescriptor?.sha256;
      if (!sizeBytes || !sha256 || !sourceObjectKey || !sourceLayer) continue;
      if (sizeBytes > MAX_EFFECTIVE_AREA_LOADING_SCREEN_IMAGE_BYTES) {
        return null;
      }
      totalImageBytes += sizeBytes;
      if (totalImageBytes > MAX_EFFECTIVE_AREA_LOADING_SCREEN_TOTAL_IMAGE_BYTES) return null;
      imagesByResRef.set(imageResRef, Object.freeze({
        resourceName,
        sourceObjectKey,
        sourceLayer,
        sha256,
        sizeBytes,
      }));
    }

    return Object.freeze({ table, imagesByResRef });
  }

  private async loadModuleFactionCatalog(
    settings: RuntimeSettingsRecord,
    objects: ModuleBlobObjectSummary[],
  ): Promise<ModuleFactionCatalog | null> {
    const keys = objects
      .map((object) => object.key)
      .filter((key) => {
        const normalized = key.replace(/\\/gu, "/").toLowerCase();
        return extractFileName(normalized) === "repute.fac" &&
          !normalized.includes("/__aurora/sources/");
      })
      .sort((left, right) => {
        const depthDelta = left.replace(/\\/gu, "/").split("/").length -
          right.replace(/\\/gu, "/").split("/").length;
        return depthDelta !== 0 ? depthDelta : left.localeCompare(right);
      });
    const key = keys[0];
    if (!key) return null;
    let payload;
    try {
      payload = await this.readSnapshotObject(settings.blobStorage, key);
    } catch {
      return null;
    }
    return payload ? parseModuleFactionCatalog({ bytes: payload.bytes, sourceObjectKey: key }) : null;
  }

  private async loadPlaceablesTwoDaSources(
    settings: RuntimeSettingsRecord,
    objects: ModuleBlobObjectSummary[],
    lightColorTwoDaSources: LoadedLightColorTwoDaSource[] = []
  ): Promise<LoadedPlaceablesTwoDaSource[]> {
    const sources: LoadedPlaceablesTwoDaSource[] = [];
    const lightColorLookup = buildLightColorTwoDaLookup(lightColorTwoDaSources);
    const resolvedHakSettings = this.runtimeSettingsApplicationService
      ? await this.runtimeSettingsApplicationService.getResolvedHakSettings()
      : null;
    const placeables2daKeys = collectPlaceables2daKeys(
      objects,
      settings,
      resolvedHakSettings?.placeable.hakPriorityList
    );
    if (placeables2daKeys.length === 0) {
      return this.loadRuntimeSourcePlaceablesTwoDaSources(lightColorTwoDaSources);
    }

    const objectsByKey = new Map(objects.map((object) => [object.key, object]));
    for (const key of placeables2daKeys) {
      let payload;
      try {
        payload = await this.readSnapshotObject(settings.blobStorage, key);
      } catch {
        continue;
      }
      if (!payload) {
        continue;
      }

      const object = objectsByKey.get(key);
      const parsedRows = enrichPlaceablesTwoDaRowsWithLightColors(
        parsePlaceablesTwoDaRows(payload.bytes),
        lightColorLookup
      );
      const descriptor = buildEffectivePlaceablesTwoDaDescriptor({
        bytes: payload.bytes,
        sourceObjectKey: key,
        sourceLayer: resolveTwoDaSourceLayer(key),
      });
      if (!shouldAdmitEffectivePlaceablesTwoDaSource(parsedRows.length, descriptor)) {
        continue;
      }
      const appearanceRows = descriptor
        ? parseEffectivePlaceablesTwoDaRows(payload.bytes) ?? []
        : [];
      sources.push({
        key,
        sourceSize: object?.size ?? payload.size,
        updatedAt: object?.lastModified ?? payload.lastModified ?? new Date(0).toISOString(),
        sourceEtag: object?.etag ?? payload.etag,
        rows: parsedRows,
        descriptor,
        appearanceRows,
      });
      // Aurora resolves 2DA resources by (ResRef, resource type): once the
      // strongest parseable placeables.2da wins, weaker HAK/base tables are
      // not row-merged into that resource.
      break;
    }

    if (sources.length === 0) {
      return this.loadRuntimeSourcePlaceablesTwoDaSources(lightColorTwoDaSources);
    }

    return sources;
  }

  private async loadEffectiveWaypointTwoDa(
    settings: RuntimeSettingsRecord,
    objects: ModuleBlobObjectSummary[],
  ): Promise<LoadedWaypointTwoDaSource | null> {
    const resolvedHakSettings = this.runtimeSettingsApplicationService
      ? await this.runtimeSettingsApplicationService.getResolvedHakSettings()
      : null;
    const keys = collectAreaEffectiveTwoDaKeys(
      objects,
      settings,
      "waypoint.2da",
      resolvedHakSettings?.area.hakPriorityList,
    );
    for (const key of keys) {
      try {
        const payload = await this.readSnapshotObject(settings.blobStorage, key);
        if (!payload) continue;
        const sourceLayer = resolveTwoDaSourceLayer(key);
        if (sourceLayer !== "module" && sourceLayer !== "hak" &&
            sourceLayer !== "vanilla") continue;
        const descriptor = buildEffectiveWaypointTwoDaDescriptor({
          bytes: payload.bytes,
          sourceObjectKey: key,
          sourceLayer,
        });
        const rows = parseEffectiveWaypointTwoDaRows(payload.bytes);
        if (descriptor && rows && rows.length > 0) {
          return Object.freeze({ key, descriptor, rows });
        }
      } catch {
        // Preserve Aurora resource precedence while looking for the strongest
        // source that satisfies the audited selector contract.
      }
    }
    if (!settings.sources.area.includeVanilla) return null;
    return readRuntimeEffectiveWaypointTwoDaFromVanilla(
      settings.paths.vanillaDataPath,
      this.logger,
    );
  }

  private async loadLightColorTwoDaSources(
    settings: BlobStorageSettings,
    objects: ModuleBlobObjectSummary[]
  ): Promise<LoadedLightColorTwoDaSource[]> {
    const sources: LoadedLightColorTwoDaSource[] = [];
    const lightColorKeys = collectTwoDaKeys(objects, "lightcolor.2da");
    if (lightColorKeys.length === 0) {
      return sources;
    }

    const objectsByKey = new Map(objects.map((object) => [object.key, object]));
    for (const key of lightColorKeys) {
      let payload;
      try {
        payload = await this.readSnapshotObject(settings, key);
      } catch {
        continue;
      }
      if (!payload) {
        continue;
      }

      const object = objectsByKey.get(key);
      const parsedRows = parseLightColorTwoDaRows(payload.bytes, {
        sourceKey: key,
        sourceEtag: object?.etag ?? payload.etag
      });
      if (parsedRows.length === 0) {
        continue;
      }
      sources.push({
        key,
        sourceSize: object?.size ?? payload.size,
        updatedAt: object?.lastModified ?? payload.lastModified ?? new Date(0).toISOString(),
        sourceEtag: object?.etag ?? payload.etag,
        rows: parsedRows
      });
    }

    return sources;
  }

  private async loadRuntimeSourceLightColorTwoDaSources(): Promise<LoadedLightColorTwoDaSource[]> {
    const runtimeSettingsApplicationService = this.runtimeSettingsApplicationService;
    if (!runtimeSettingsApplicationService) {
      return [];
    }

    const settings = await runtimeSettingsApplicationService.getRuntimeSettings();
    const source = settings.sources.placeable;
    if (!source.includeVanilla) {
      return [];
    }

    const vanillaSource = await readRuntimeLightColorTwoDaSourceFromVanilla(
      settings.paths.vanillaDataPath,
      this.logger
    );
    if (!vanillaSource) {
      return [];
    }

    this.logger.log(
      `Loaded lightcolor.2da placeable light lookup directly from runtime sources (rows=${vanillaSource.rows.length}).`
    );
    return [vanillaSource];
  }

  private async loadRuntimeSourcePlaceablesTwoDaSources(
    lightColorTwoDaSources: LoadedLightColorTwoDaSource[] = []
  ): Promise<LoadedPlaceablesTwoDaSource[]> {
    const runtimeSettingsApplicationService = this.runtimeSettingsApplicationService;
    if (!runtimeSettingsApplicationService) {
      return [];
    }

    const settings = await runtimeSettingsApplicationService.getRuntimeSettings();
    const source = settings.sources.placeable;
    if (!source.includeVanilla) {
      return [];
    }

    const vanillaSource = await readRuntimePlaceablesTwoDaSourceFromVanilla(
      settings.paths.vanillaDataPath,
      buildLightColorTwoDaLookup(lightColorTwoDaSources),
      this.logger
    );
    if (!vanillaSource) {
      return [];
    }

    this.logger.log(
      `Loaded placeables.2da lookup directly from runtime sources (rows=${vanillaSource.rows.length}).`
    );
    return [vanillaSource];
  }

  private buildPlaceableCandidatesFromTwoDa(
    sources: LoadedPlaceablesTwoDaSource[]
  ): PlaceablesTwoDaRow[] {
    const rows: PlaceablesTwoDaRow[] = [];
    const seenModelResrefs = new Set<string>();

    for (const source of sources) {
      for (const row of source.rows) {
        if (seenModelResrefs.has(row.modelResRef)) {
          continue;
        }
        seenModelResrefs.add(row.modelResRef);
        rows.push({
          ...row,
          sourceKey: source.key,
          sourceSize: source.sourceSize,
          updatedAt: source.updatedAt,
          sourceEtag: source.sourceEtag,
          sourceFingerprint: buildSourceFingerprint([
            "2da",
            "placeable",
            row.modelResRef,
            source.key,
            String(row.rowId),
            row.label ?? "",
            row.lightColorRaw ?? "",
            row.lightColorLabel ?? "",
            String(row.lightColorRed ?? ""),
            String(row.lightColorGreen ?? ""),
            String(row.lightColorBlue ?? ""),
            row.lightColorSourceKey ?? "",
            source.sourceEtag ?? ""
          ])
        });
      }
    }

    return rows;
  }

  private buildPlaceableAppearanceModelLookup(
    sources: LoadedPlaceablesTwoDaSource[]
  ): Map<number, PlaceableAppearanceModelLookupEntry> {
    const lookup = new Map<number, PlaceableAppearanceModelLookupEntry>();
    for (const source of sources) {
      const sourceRowById = new Map(source.rows.map((row) => [row.rowId, row]));
      for (const row of source.rows) {
        const modelResRef = normalizeRenderablePlaceableModelRef(row.modelResRef);
        if (!modelResRef) {
          continue;
        }
        const directEntry: PlaceableAppearanceModelLookupEntry = {
          modelResRef,
          ...(row.label ? { label: row.label } : {}),
          rowId: row.rowId,
          ...(row.lightColorRaw !== undefined
            ? { source2daLightColorRaw: row.lightColorRaw }
            : {}),
          ...(row.lightColorRowId !== undefined
            ? { source2daLightColorRow: row.lightColorRowId }
            : {}),
          ...(row.lightColorLabel !== undefined
            ? { source2daLightColorLabel: row.lightColorLabel }
            : {}),
          ...(row.lightColorSourceKey !== undefined
            ? { source2daLightColorSourceKey: row.lightColorSourceKey }
            : {}),
          ...(row.lightColorRed !== undefined ? { source2daLightRed: row.lightColorRed } : {}),
          ...(row.lightColorGreen !== undefined
            ? { source2daLightGreen: row.lightColorGreen }
            : {}),
          ...(row.lightColorBlue !== undefined
            ? { source2daLightBlue: row.lightColorBlue }
            : {}),
          ...(row.lightColorToolsetRed !== undefined
            ? { source2daToolsetRed: row.lightColorToolsetRed }
            : {}),
          ...(row.lightColorToolsetGreen !== undefined
            ? { source2daToolsetGreen: row.lightColorToolsetGreen }
            : {}),
          ...(row.lightColorToolsetBlue !== undefined
            ? { source2daToolsetBlue: row.lightColorToolsetBlue }
            : {}),
          ...(row.lightOffsetX !== undefined
            ? { source2daLightOffsetX: row.lightOffsetX }
            : {}),
          ...(row.lightOffsetY !== undefined
            ? { source2daLightOffsetY: row.lightOffsetY }
            : {}),
          ...(row.lightOffsetZ !== undefined
            ? { source2daLightOffsetZ: row.lightOffsetZ }
            : {}),
          ...(row.shadowSize !== undefined ? { source2daShadowSize: row.shadowSize } : {}),
          ...(row.isStatic !== undefined ? { source2daStatic: row.isStatic } : {}),
          sourceKey: source.key,
          resolutionPath: "direct"
        };
        // `collectPlaceables2daKeys` orders the effective source stack from
        // strongest to weakest (module, configured HAKs, then vanilla).  A
        // partial module table must not hide a row that exists only in a HAK,
        // while a stronger row must keep winning when several layers define
        // the same appearance id.
        if (!lookup.has(row.rowId)) {
          lookup.set(row.rowId, directEntry);
        }
        const existingPhysicalEntry =
          row.physicalRowIndex !== undefined ? lookup.get(row.physicalRowIndex) : undefined;
        if (
          row.physicalRowIndex !== undefined &&
          row.physicalRowIndex !== row.rowId &&
          existingPhysicalEntry?.resolutionPath !== "direct"
        ) {
          lookup.set(row.physicalRowIndex, {
            ...directEntry,
            rowId: row.physicalRowIndex,
            sourceRowId: row.rowId
          });
        }

        let aliasRowId = row.rowId + PLACEABLES_TWO_DA_NWIC_USER_ROW_OFFSET;
        for (let hop = 1; hop <= PLACEABLES_TWO_DA_USER_ROW_ALIAS_MAX_HOPS; hop += 1) {
          const aliasRow = sourceRowById.get(aliasRowId);
          if (!isPlaceablesTwoDaMinus100Alias(row, aliasRow)) {
            break;
          }
          const existingAliasEntry = lookup.get(aliasRowId);
          if (existingAliasEntry?.resolutionPath !== "direct") {
            lookup.set(aliasRowId, {
              ...directEntry,
              rowId: row.rowId,
              requestedRowId: aliasRowId,
              sourceKey: source.key,
              resolutionPath: isNwicPlaceablesTwoDaUserRowAlias(row, aliasRow) && hop === 1
                ? "nwic-user-row-minus-100"
                : hop === 1
                  ? "placeables-user-row-minus-100"
                  : "placeables-user-row-minus-100-chain"
            });
          }
          if (!aliasRow) {
            break;
          }
          aliasRowId += PLACEABLES_TWO_DA_NWIC_USER_ROW_OFFSET;
        }
      }
    }

    return lookup;
  }

  private async loadCreatureAppearanceTwoDaSources(
    settings: RuntimeSettingsRecord,
    objects: ModuleBlobObjectSummary[]
  ): Promise<LoadedCreatureAppearanceTwoDaSource[]> {
    const sources: LoadedCreatureAppearanceTwoDaSource[] = [];
    const resolvedHakSettings = this.runtimeSettingsApplicationService
      ? await this.runtimeSettingsApplicationService.getResolvedHakSettings()
      : null;
    const keys = collectCreatureAppearance2daKeys(
      objects,
      settings,
      resolvedHakSettings?.creature.hakPriorityList,
    );
    if (keys.length === 0) {
      return sources;
    }

    const objectsByKey = new Map(objects.map((object) => [object.key, object]));
    for (const key of keys) {
      let payload;
      try {
        payload = await this.readSnapshotObject(settings.blobStorage, key);
      } catch {
        continue;
      }
      if (!payload) {
        continue;
      }

      const object = objectsByKey.get(key);
      const descriptor = buildEffectiveCreatureAppearanceTwoDaDescriptor({
        bytes: payload.bytes,
        sourceObjectKey: key,
        sourceLayer: resolveTwoDaSourceLayer(key),
      });
      if (!shouldAdmitEffectiveCreatureAppearanceTwoDaSource(descriptor)) {
        continue;
      }
      const appearanceRows = parseEffectiveCreatureAppearanceTwoDaRows(payload.bytes);
      if (!appearanceRows) {
        continue;
      }
      sources.push({
        key,
        sourceSize: object?.size ?? payload.size,
        updatedAt: object?.lastModified ?? payload.lastModified ?? new Date(0).toISOString(),
        sourceEtag: object?.etag ?? payload.etag,
        rows: parseCreatureAppearanceTwoDaRows(payload.bytes, {
          sourceKey: key,
          sourceEtag: object?.etag ?? payload.etag
        }),
        descriptor,
        appearanceRows,
      });
      // Aurora selects one complete resource by (ResRef, type). Never merge
      // rows from weaker HAK/base appearance.2da resources.
      break;
    }

    return sources;
  }

  private async loadRuntimeSourceCreatureAppearanceTwoDaSources(): Promise<
    LoadedCreatureAppearanceTwoDaSource[]
  > {
    const runtimeSettingsApplicationService = this.runtimeSettingsApplicationService;
    if (!runtimeSettingsApplicationService) {
      return [];
    }

    const settings = await runtimeSettingsApplicationService.getRuntimeSettings();
    const source = settings.sources.creature ?? settings.sources.placeable;
    const sources: LoadedCreatureAppearanceTwoDaSource[] = [];

    if (source.includeHaks) {
      const resolvedHakSettings =
        await runtimeSettingsApplicationService.getResolvedHakSettings();
      this.logger.log(
        `Loading creature appearance.2da from runtime HAKs (count=${resolvedHakSettings.creature.hakPaths.length}, first=${resolvedHakSettings.creature.hakPaths[0] ?? "none"}).`
      );
      const hakSource = await readRuntimeCreatureAppearanceTwoDaSourceFromHakPaths(
        resolvedHakSettings.creature.hakPaths,
        this.logger
      );
      if (hakSource) {
        sources.push(hakSource);
      }
    }

    if (sources.length === 0 && source.includeVanilla) {
      const vanillaSource = await readRuntimeCreatureAppearanceTwoDaSourceFromVanilla(
        settings.paths.vanillaDataPath,
        this.logger
      );
      if (vanillaSource) {
        sources.push(vanillaSource);
      }
    }

    if (sources.length > 0) {
      this.logger.log(
        `Loaded creature appearance.2da render lookup directly from runtime sources (rows=${sources.reduce(
          (sum, candidate) => sum + candidate.rows.length,
          0
        )}, sources=${sources.map((candidate) => `${candidate.key}:${candidate.rows.length}`).join(",")}).`
      );
    }

    return sources;
  }

  private async loadEffectiveCreatureGenderTwoDaSource(
    settings: RuntimeSettingsRecord,
    objects: ModuleBlobObjectSummary[],
  ): Promise<LoadedEffectiveCreatureGenderTwoDaSource | null> {
    const resolvedHakSettings = this.runtimeSettingsApplicationService
      ? await this.runtimeSettingsApplicationService.getResolvedHakSettings()
      : null;
    const keys = collectCreatureEffectiveTwoDaKeys(
      objects,
      settings,
      "gender.2da",
      resolvedHakSettings?.creature.hakPriorityList,
    );
    const key = keys[0];
    if (!key) return null;
    let payload;
    try {
      payload = await this.readSnapshotObject(settings.blobStorage, key);
    } catch {
      return null;
    }
    if (!payload) return null;
    const sourceLayer = resolveEffectiveCreatureGenderSourceLayer(key);
    if (!sourceLayer) return null;
    return buildEffectiveCreatureGenderTwoDaSource(
      payload.bytes,
      key,
      sourceLayer,
    );
  }

  private async loadRuntimeEffectiveCreatureGenderTwoDaSource(): Promise<
    LoadedEffectiveCreatureGenderTwoDaSource | null
  > {
    const runtimeSettingsApplicationService = this.runtimeSettingsApplicationService;
    if (!runtimeSettingsApplicationService) return null;
    const settings = await runtimeSettingsApplicationService.getRuntimeSettings();
    const source = settings.sources.creature ?? settings.sources.placeable;
    if (source.includeHaks) {
      const resolvedHakSettings =
        await runtimeSettingsApplicationService.getResolvedHakSettings();
      const hakSource = await readRuntimeEffectiveCreatureGenderTwoDaSourceFromHakPaths(
        resolvedHakSettings.creature.hakPaths,
        this.logger,
      );
      if (hakSource !== undefined) return hakSource;
    }
    return source.includeVanilla
      ? readRuntimeEffectiveCreatureGenderTwoDaSourceFromVanilla(
          settings.paths.vanillaDataPath,
          this.logger,
        )
      : null;
  }

  private async loadEffectiveCreatureAppendageTwoDaSource(
    settings: RuntimeSettingsRecord,
    objects: ModuleBlobObjectSummary[],
    resourceName: EffectiveCreatureAppendageTwoDaResourceName,
  ): Promise<LoadedEffectiveCreatureAppendageTwoDaSource | null> {
    const resolvedHakSettings = this.runtimeSettingsApplicationService
      ? await this.runtimeSettingsApplicationService.getResolvedHakSettings()
      : null;
    const key = collectCreatureEffectiveTwoDaKeys(
      objects,
      settings,
      resourceName,
      resolvedHakSettings?.creature.hakPriorityList,
    )[0];
    if (!key) return null;
    let payload;
    try {
      payload = await this.readSnapshotObject(settings.blobStorage, key);
    } catch {
      return null;
    }
    if (!payload) return null;
    const sourceLayer = resolveEffectiveCreatureAppendageSourceLayer(key);
    return sourceLayer
      ? buildEffectiveCreatureAppendageTwoDaSource(
          payload.bytes,
          resourceName,
          key,
          sourceLayer,
        )
      : null;
  }

  private async loadRuntimeEffectiveCreatureAppendageTwoDaSource(
    resourceName: EffectiveCreatureAppendageTwoDaResourceName,
  ): Promise<LoadedEffectiveCreatureAppendageTwoDaSource | null> {
    const runtimeSettingsApplicationService = this.runtimeSettingsApplicationService;
    if (!runtimeSettingsApplicationService) return null;
    const settings = await runtimeSettingsApplicationService.getRuntimeSettings();
    const source = settings.sources.creature ?? settings.sources.placeable;
    if (source.includeHaks) {
      const resolvedHakSettings =
        await runtimeSettingsApplicationService.getResolvedHakSettings();
      const hakSource = await readRuntimeEffectiveCreatureAppendageTwoDaSourceFromHakPaths(
        resolvedHakSettings.creature.hakPaths,
        resourceName,
        this.logger,
      );
      if (hakSource !== undefined) return hakSource;
    }
    return source.includeVanilla
      ? readRuntimeEffectiveCreatureAppendageTwoDaSourceFromVanilla(
          settings.paths.vanillaDataPath,
          resourceName,
          this.logger,
        )
      : null;
  }

  private async loadEffectiveCreaturePhenotypeTwoDaSource(
    settings: RuntimeSettingsRecord,
    objects: ModuleBlobObjectSummary[],
  ): Promise<LoadedEffectiveCreaturePhenotypeTwoDaSource | null> {
    const resolvedHakSettings = this.runtimeSettingsApplicationService
      ? await this.runtimeSettingsApplicationService.getResolvedHakSettings()
      : null;
    const keys = collectCreatureEffectiveTwoDaKeys(
      objects,
      settings,
      "phenotype.2da",
      resolvedHakSettings?.creature.hakPriorityList,
    );
    const key = keys[0];
    if (!key) return null;
    let payload;
    try {
      payload = await this.readSnapshotObject(settings.blobStorage, key);
    } catch {
      return null;
    }
    if (!payload) return null;
    const sourceLayer = resolveEffectiveCreaturePhenotypeSourceLayer(key);
    if (!sourceLayer) return null;
    return buildEffectiveCreaturePhenotypeTwoDaSource(payload.bytes, key, sourceLayer);
  }

  private async loadRuntimeEffectiveCreaturePhenotypeTwoDaSource(): Promise<
    LoadedEffectiveCreaturePhenotypeTwoDaSource | null
  > {
    const runtimeSettingsApplicationService = this.runtimeSettingsApplicationService;
    if (!runtimeSettingsApplicationService) return null;
    const settings = await runtimeSettingsApplicationService.getRuntimeSettings();
    const source = settings.sources.creature ?? settings.sources.placeable;
    if (source.includeHaks) {
      const resolvedHakSettings =
        await runtimeSettingsApplicationService.getResolvedHakSettings();
      const hakSource = await readRuntimeEffectiveCreaturePhenotypeTwoDaSourceFromHakPaths(
        resolvedHakSettings.creature.hakPaths,
        this.logger,
      );
      if (hakSource !== undefined) return hakSource;
    }
    return source.includeVanilla
      ? readRuntimeEffectiveCreaturePhenotypeTwoDaSourceFromVanilla(
          settings.paths.vanillaDataPath,
          this.logger,
        )
      : null;
  }

  private async loadRuntimeSourceCreaturePartTwoDaSources(): Promise<
    LoadedCreaturePartTwoDaSource[]
  > {
    const runtimeSettingsApplicationService = this.runtimeSettingsApplicationService;
    if (!runtimeSettingsApplicationService) {
      return [];
    }

    const settings = await runtimeSettingsApplicationService.getRuntimeSettings();
    const source = settings.sources.creature ?? settings.sources.placeable;
    const sources: LoadedCreaturePartTwoDaSource[] = [];

    if (source.includeHaks) {
      const resolvedHakSettings =
        await runtimeSettingsApplicationService.getResolvedHakSettings();
      const hakSource = await readRuntimeCreaturePartTwoDaSourceFromHakPaths(
        resolvedHakSettings.creature.hakPaths,
        this.logger
      );
      if (hakSource) {
        sources.push(hakSource);
      }
    }

    if (sources.length === 0 && source.includeVanilla) {
      const vanillaSource = await readRuntimeCreaturePartTwoDaSourceFromVanilla(
        settings.paths.vanillaDataPath,
        this.logger
      );
      if (vanillaSource) {
        sources.push(vanillaSource);
      }
    }

    if (sources.length > 0) {
      this.logger.log(
        `Loaded creature capart.2da render lookup directly from runtime sources (rows=${sources.reduce(
          (sum, candidate) => sum + candidate.rows.length,
          0
        )}).`
      );
    }

    return sources;
  }

  private async loadRuntimeSourceCreatureAccessoryModelTwoDaSources(
    tableFileName: "wingmodel.2da" | "tailmodel.2da",
    sourceKind: CreatureAccessoryModelSource
  ): Promise<LoadedCreatureAccessoryModelTwoDaSource[]> {
    const runtimeSettingsApplicationService = this.runtimeSettingsApplicationService;
    if (!runtimeSettingsApplicationService) {
      return [];
    }

    const settings = await runtimeSettingsApplicationService.getRuntimeSettings();
    const source = settings.sources.creature ?? settings.sources.placeable;
    const sources: LoadedCreatureAccessoryModelTwoDaSource[] = [];

    if (source.includeHaks) {
      const resolvedHakSettings =
        await runtimeSettingsApplicationService.getResolvedHakSettings();
      const hakSource = await readRuntimeCreatureAccessoryModelTwoDaSourceFromHakPaths(
        resolvedHakSettings.creature.hakPaths,
        tableFileName,
        sourceKind,
        this.logger
      );
      if (hakSource) {
        sources.push(hakSource);
      }
    }

    if (sources.length === 0 && source.includeVanilla) {
      const vanillaSource = await readRuntimeCreatureAccessoryModelTwoDaSourceFromVanilla(
        settings.paths.vanillaDataPath,
        tableFileName,
        sourceKind,
        this.logger
      );
      if (vanillaSource) {
        sources.push(vanillaSource);
      }
    }

    if (sources.length > 0) {
      this.logger.log(
        `Loaded creature ${tableFileName} render lookup directly from runtime sources (rows=${sources.reduce(
          (sum, candidate) => sum + candidate.rows.length,
          0
        )}).`
      );
    }

    return sources;
  }

  private async loadCreatureSpeedTwoDaSources(
    settings: BlobStorageSettings,
    objects: ModuleBlobObjectSummary[]
  ): Promise<LoadedCreatureSpeedTwoDaSource[]> {
    const sources: LoadedCreatureSpeedTwoDaSource[] = [];
    const keys = collectTwoDaKeys(objects, "creaturespeed.2da");
    if (keys.length === 0) {
      return sources;
    }

    const objectsByKey = new Map(objects.map((object) => [object.key, object]));
    for (const key of keys) {
      let payload;
      try {
        payload = await this.readSnapshotObject(settings, key);
      } catch {
        continue;
      }
      if (!payload) {
        continue;
      }

      const object = objectsByKey.get(key);
      sources.push({
        key,
        sourceSize: object?.size ?? payload.size,
        updatedAt: object?.lastModified ?? payload.lastModified ?? new Date(0).toISOString(),
        sourceEtag: object?.etag ?? payload.etag,
        rows: parseCreatureSpeedTwoDaRows(payload.bytes, {
          sourceKey: key,
          sourceEtag: object?.etag ?? payload.etag
        })
      });
    }

    return sources;
  }

  private async loadCreatureClassTwoDaSources(
    settings: BlobStorageSettings,
    objects: ModuleBlobObjectSummary[]
  ): Promise<LoadedCreatureClassTwoDaSource[]> {
    const sources: LoadedCreatureClassTwoDaSource[] = [];
    const keys = collectTwoDaKeys(objects, "classes.2da");
    if (keys.length === 0) {
      return sources;
    }

    const objectsByKey = new Map(objects.map((object) => [object.key, object]));
    for (const key of keys) {
      let payload;
      try {
        payload = await this.readSnapshotObject(settings, key);
      } catch {
        continue;
      }
      if (!payload) {
        continue;
      }

      const object = objectsByKey.get(key);
      sources.push({
        key,
        sourceSize: object?.size ?? payload.size,
        updatedAt: object?.lastModified ?? payload.lastModified ?? new Date(0).toISOString(),
        sourceEtag: object?.etag ?? payload.etag,
        rows: parseCreatureClassTwoDaRows(payload.bytes, {
          sourceKey: key,
          sourceEtag: object?.etag ?? payload.etag
        })
      });
    }

    return sources;
  }

  private async loadCreatureRaceTwoDaSources(
    settings: BlobStorageSettings,
    objects: ModuleBlobObjectSummary[]
  ): Promise<LoadedCreatureRaceTwoDaSource[]> {
    const sources: LoadedCreatureRaceTwoDaSource[] = [];
    const keys = collectTwoDaKeys(objects, "racialtypes.2da");
    if (keys.length === 0) {
      return sources;
    }

    const objectsByKey = new Map(objects.map((object) => [object.key, object]));
    for (const key of keys) {
      let payload;
      try {
        payload = await this.readSnapshotObject(settings, key);
      } catch {
        continue;
      }
      if (!payload) {
        continue;
      }

      const object = objectsByKey.get(key);
      sources.push({
        key,
        sourceSize: object?.size ?? payload.size,
        updatedAt: object?.lastModified ?? payload.lastModified ?? new Date(0).toISOString(),
        sourceEtag: object?.etag ?? payload.etag,
        rows: parseCreatureRaceTwoDaRows(payload.bytes, {
          sourceKey: key,
          sourceEtag: object?.etag ?? payload.etag
        })
      });
    }

    return sources;
  }

  private async loadCreatureGenderTwoDaSources(
    settings: BlobStorageSettings,
    objects: ModuleBlobObjectSummary[]
  ): Promise<LoadedCreatureGenderTwoDaSource[]> {
    const sources: LoadedCreatureGenderTwoDaSource[] = [];
    const keys = collectTwoDaKeys(objects, "gender.2da");
    if (keys.length === 0) {
      return sources;
    }

    const objectsByKey = new Map(objects.map((object) => [object.key, object]));
    for (const key of keys) {
      let payload;
      try {
        payload = await this.readSnapshotObject(settings, key);
      } catch {
        continue;
      }
      if (!payload) {
        continue;
      }

      const object = objectsByKey.get(key);
      sources.push({
        key,
        sourceSize: object?.size ?? payload.size,
        updatedAt: object?.lastModified ?? payload.lastModified ?? new Date(0).toISOString(),
        sourceEtag: object?.etag ?? payload.etag,
        rows: parseCreatureGenderTwoDaRows(payload.bytes, {
          sourceKey: key,
          sourceEtag: object?.etag ?? payload.etag
        })
      });
    }

    return sources;
  }

  private async loadCreaturePhenotypeTwoDaSources(
    settings: BlobStorageSettings,
    objects: ModuleBlobObjectSummary[]
  ): Promise<LoadedCreaturePhenotypeTwoDaSource[]> {
    const sources: LoadedCreaturePhenotypeTwoDaSource[] = [];
    const keys = collectTwoDaKeys(objects, "phenotype.2da");
    if (keys.length === 0) {
      return sources;
    }

    const objectsByKey = new Map(objects.map((object) => [object.key, object]));
    for (const key of keys) {
      let payload;
      try {
        payload = await this.readSnapshotObject(settings, key);
      } catch {
        continue;
      }
      if (!payload) {
        continue;
      }

      const object = objectsByKey.get(key);
      sources.push({
        key,
        sourceSize: object?.size ?? payload.size,
        updatedAt: object?.lastModified ?? payload.lastModified ?? new Date(0).toISOString(),
        sourceEtag: object?.etag ?? payload.etag,
        rows: parseCreaturePhenotypeTwoDaRows(payload.bytes, {
          sourceKey: key,
          sourceEtag: object?.etag ?? payload.etag
        })
      });
    }

    return sources;
  }

  private async loadCreaturePartTwoDaSources(
    settings: BlobStorageSettings,
    objects: ModuleBlobObjectSummary[]
  ): Promise<LoadedCreaturePartTwoDaSource[]> {
    const sources: LoadedCreaturePartTwoDaSource[] = [];
    const keys = collectTwoDaKeys(objects, "capart.2da");
    if (keys.length === 0) {
      return sources;
    }

    const objectsByKey = new Map(objects.map((object) => [object.key, object]));
    for (const key of keys) {
      let payload;
      try {
        payload = await this.readSnapshotObject(settings, key);
      } catch {
        continue;
      }
      if (!payload) {
        continue;
      }

      const object = objectsByKey.get(key);
      sources.push({
        key,
        sourceSize: object?.size ?? payload.size,
        updatedAt: object?.lastModified ?? payload.lastModified ?? new Date(0).toISOString(),
        sourceEtag: object?.etag ?? payload.etag,
        rows: parseCreaturePartTwoDaRows(payload.bytes, {
          sourceKey: key,
          sourceEtag: object?.etag ?? payload.etag
        })
      });
    }

    return sources;
  }

  private async loadCreatureAccessoryModelTwoDaSources(
    settings: BlobStorageSettings,
    objects: ModuleBlobObjectSummary[],
    tableFileName: "wingmodel.2da" | "tailmodel.2da",
    source: CreatureAccessoryModelSource
  ): Promise<LoadedCreatureAccessoryModelTwoDaSource[]> {
    const sources: LoadedCreatureAccessoryModelTwoDaSource[] = [];
    const keys = collectTwoDaKeys(objects, tableFileName);
    if (keys.length === 0) {
      return sources;
    }

    const objectsByKey = new Map(objects.map((object) => [object.key, object]));
    for (const key of keys) {
      let payload;
      try {
        payload = await this.readSnapshotObject(settings, key);
      } catch {
        continue;
      }
      if (!payload) {
        continue;
      }

      const object = objectsByKey.get(key);
      sources.push({
        key,
        sourceSize: object?.size ?? payload.size,
        updatedAt: object?.lastModified ?? payload.lastModified ?? new Date(0).toISOString(),
        sourceEtag: object?.etag ?? payload.etag,
        source,
        rows: parseCreatureAccessoryModelTwoDaRows(payload.bytes, tableFileName, {
          sourceKey: key,
          sourceEtag: object?.etag ?? payload.etag
        })
      });
    }

    return sources;
  }

  private async loadCreatureSizeTwoDaSources(
    settings: BlobStorageSettings,
    objects: ModuleBlobObjectSummary[]
  ): Promise<LoadedCreatureSizeTwoDaSource[]> {
    const sources: LoadedCreatureSizeTwoDaSource[] = [];
    const keys = collectTwoDaKeys(objects, "creaturesize.2da");
    if (keys.length === 0) {
      return sources;
    }

    const objectsByKey = new Map(objects.map((object) => [object.key, object]));
    for (const key of keys) {
      let payload;
      try {
        payload = await this.readSnapshotObject(settings, key);
      } catch {
        continue;
      }
      if (!payload) {
        continue;
      }

      const object = objectsByKey.get(key);
      sources.push({
        key,
        sourceSize: object?.size ?? payload.size,
        updatedAt: object?.lastModified ?? payload.lastModified ?? new Date(0).toISOString(),
        sourceEtag: object?.etag ?? payload.etag,
        rows: parseCreatureSizeTwoDaRows(payload.bytes, {
          sourceKey: key,
          sourceEtag: object?.etag ?? payload.etag
        })
      });
    }

    return sources;
  }

  private async loadCreaturePortraitTwoDaSources(
    settings: BlobStorageSettings,
    objects: ModuleBlobObjectSummary[]
  ): Promise<LoadedCreaturePortraitTwoDaSource[]> {
    const sources: LoadedCreaturePortraitTwoDaSource[] = [];
    const keys = collectTwoDaKeys(objects, "portraits.2da");
    if (keys.length === 0) {
      return sources;
    }

    const objectsByKey = new Map(objects.map((object) => [object.key, object]));
    for (const key of keys) {
      let payload;
      try {
        payload = await this.readSnapshotObject(settings, key);
      } catch {
        continue;
      }
      if (!payload) {
        continue;
      }

      const object = objectsByKey.get(key);
      sources.push({
        key,
        sourceSize: object?.size ?? payload.size,
        updatedAt: object?.lastModified ?? payload.lastModified ?? new Date(0).toISOString(),
        sourceEtag: object?.etag ?? payload.etag,
        rows: parseCreaturePortraitTwoDaRows(payload.bytes, {
          sourceKey: key,
          sourceEtag: object?.etag ?? payload.etag
        })
      });
    }

    return sources;
  }

  private async loadCreatureSoundSetTwoDaSources(
    settings: BlobStorageSettings,
    objects: ModuleBlobObjectSummary[]
  ): Promise<LoadedCreatureSoundSetTwoDaSource[]> {
    const sources: LoadedCreatureSoundSetTwoDaSource[] = [];
    const keys = collectTwoDaKeys(objects, "soundset.2da");
    if (keys.length === 0) {
      return sources;
    }

    const objectsByKey = new Map(objects.map((object) => [object.key, object]));
    for (const key of keys) {
      let payload;
      try {
        payload = await this.readSnapshotObject(settings, key);
      } catch {
        continue;
      }
      if (!payload) {
        continue;
      }

      const object = objectsByKey.get(key);
      sources.push({
        key,
        sourceSize: object?.size ?? payload.size,
        updatedAt: object?.lastModified ?? payload.lastModified ?? new Date(0).toISOString(),
        sourceEtag: object?.etag ?? payload.etag,
        rows: parseCreatureSoundSetTwoDaRows(payload.bytes, {
          sourceKey: key,
          sourceEtag: object?.etag ?? payload.etag
        })
      });
    }

    return sources;
  }

  private async loadCreatureSkillTwoDaSources(
    settings: BlobStorageSettings,
    objects: ModuleBlobObjectSummary[]
  ): Promise<LoadedCreatureSkillTwoDaSource[]> {
    const sources: LoadedCreatureSkillTwoDaSource[] = [];
    const keys = collectTwoDaKeys(objects, "skills.2da");
    if (keys.length === 0) {
      return sources;
    }

    const objectsByKey = new Map(objects.map((object) => [object.key, object]));
    for (const key of keys) {
      let payload;
      try {
        payload = await this.readSnapshotObject(settings, key);
      } catch {
        continue;
      }
      if (!payload) {
        continue;
      }

      const object = objectsByKey.get(key);
      sources.push({
        key,
        sourceSize: object?.size ?? payload.size,
        updatedAt: object?.lastModified ?? payload.lastModified ?? new Date(0).toISOString(),
        sourceEtag: object?.etag ?? payload.etag,
        rows: parseCreatureSkillTwoDaRows(payload.bytes, {
          sourceKey: key,
          sourceEtag: object?.etag ?? payload.etag
        })
      });
    }

    return sources;
  }

  private async loadCreatureFeatTwoDaSources(
    settings: BlobStorageSettings,
    objects: ModuleBlobObjectSummary[]
  ): Promise<LoadedCreatureFeatTwoDaSource[]> {
    const sources: LoadedCreatureFeatTwoDaSource[] = [];
    const keys = collectTwoDaKeys(objects, "feat.2da");
    if (keys.length === 0) {
      return sources;
    }

    const objectsByKey = new Map(objects.map((object) => [object.key, object]));
    for (const key of keys) {
      let payload;
      try {
        payload = await this.readSnapshotObject(settings, key);
      } catch {
        continue;
      }
      if (!payload) {
        continue;
      }

      const object = objectsByKey.get(key);
      sources.push({
        key,
        sourceSize: object?.size ?? payload.size,
        updatedAt: object?.lastModified ?? payload.lastModified ?? new Date(0).toISOString(),
        sourceEtag: object?.etag ?? payload.etag,
        rows: parseCreatureFeatTwoDaRows(payload.bytes, {
          sourceKey: key,
          sourceEtag: object?.etag ?? payload.etag
        })
      });
    }

    return sources;
  }

  private async loadCreatureSpellTwoDaSources(
    settings: BlobStorageSettings,
    objects: ModuleBlobObjectSummary[]
  ): Promise<LoadedCreatureSpellTwoDaSource[]> {
    const sources: LoadedCreatureSpellTwoDaSource[] = [];
    const keys = collectTwoDaKeys(objects, "spells.2da");
    if (keys.length === 0) {
      return sources;
    }

    const objectsByKey = new Map(objects.map((object) => [object.key, object]));
    for (const key of keys) {
      let payload;
      try {
        payload = await this.readSnapshotObject(settings, key);
      } catch {
        continue;
      }
      if (!payload) {
        continue;
      }

      const object = objectsByKey.get(key);
      sources.push({
        key,
        sourceSize: object?.size ?? payload.size,
        updatedAt: object?.lastModified ?? payload.lastModified ?? new Date(0).toISOString(),
        sourceEtag: object?.etag ?? payload.etag,
        rows: parseCreatureSpellTwoDaRows(payload.bytes, {
          sourceKey: key,
          sourceEtag: object?.etag ?? payload.etag
        })
      });
    }

    return sources;
  }

  private async loadItemBaseItemTwoDaSources(
    settings: BlobStorageSettings,
    objects: ModuleBlobObjectSummary[]
  ): Promise<LoadedItemBaseItemTwoDaSource[]> {
    const sources: LoadedItemBaseItemTwoDaSource[] = [];
    const keys = collectTwoDaKeys(objects, "baseitems.2da");

    const objectsByKey = new Map(objects.map((object) => [object.key, object]));
    for (const key of keys) {
      let payload;
      try {
        payload = await this.readSnapshotObject(settings, key);
      } catch {
        continue;
      }
      if (!payload) {
        continue;
      }

      const object = objectsByKey.get(key);
      sources.push({
        key,
        sourceSize: object?.size ?? payload.size,
        updatedAt: object?.lastModified ?? payload.lastModified ?? new Date(0).toISOString(),
        sourceEtag: object?.etag ?? payload.etag,
        rows: parseItemBaseItemTwoDaRows(payload.bytes, {
          sourceKey: key,
          sourceEtag: object?.etag ?? payload.etag
        })
      });
    }

    const hasLocalFallback = sources.some(
      (source) => source.key === LOCAL_ITEM_RETAIL_BASEITEMS_2DA_PATH
    );
    if (!hasLocalFallback) {
      try {
        const bytes = await readFile(LOCAL_ITEM_RETAIL_BASEITEMS_2DA_PATH);
        sources.push({
          key: LOCAL_ITEM_RETAIL_BASEITEMS_2DA_PATH,
          sourceSize: bytes.length,
          updatedAt: new Date(0).toISOString(),
          rows: parseItemBaseItemTwoDaRows(bytes, {
            sourceKey: LOCAL_ITEM_RETAIL_BASEITEMS_2DA_PATH
          })
        });
      } catch {
        // Local retail extract is a development fallback; module snapshot sources remain authoritative.
      }
    }

    return sources;
  }

  private async loadItemPropertyDefinitionTwoDaSources(
    settings: BlobStorageSettings,
    objects: ModuleBlobObjectSummary[]
  ): Promise<LoadedItemPropertyDefinitionTwoDaSource[]> {
    const sources: LoadedItemPropertyDefinitionTwoDaSource[] = [];
    const keys = collectTwoDaKeys(objects, "itempropdef.2da");

    const objectsByKey = new Map(objects.map((object) => [object.key, object]));
    for (const key of keys) {
      let payload;
      try {
        payload = await this.readSnapshotObject(settings, key);
      } catch {
        continue;
      }
      if (!payload) {
        continue;
      }

      const object = objectsByKey.get(key);
      sources.push({
        key,
        sourceSize: object?.size ?? payload.size,
        updatedAt: object?.lastModified ?? payload.lastModified ?? new Date(0).toISOString(),
        sourceEtag: object?.etag ?? payload.etag,
        rows: parseItemPropertyDefinitionTwoDaRows(payload.bytes, {
          sourceKey: key,
          sourceEtag: object?.etag ?? payload.etag
        })
      });
    }

    const hasLocalFallback = sources.some(
      (source) => source.key === LOCAL_ITEM_RETAIL_ITEMPROPDEF_2DA_PATH
    );
    if (!hasLocalFallback) {
      try {
        const bytes = await readFile(LOCAL_ITEM_RETAIL_ITEMPROPDEF_2DA_PATH);
        sources.push({
          key: LOCAL_ITEM_RETAIL_ITEMPROPDEF_2DA_PATH,
          sourceSize: bytes.length,
          updatedAt: new Date(0).toISOString(),
          rows: parseItemPropertyDefinitionTwoDaRows(bytes, {
            sourceKey: LOCAL_ITEM_RETAIL_ITEMPROPDEF_2DA_PATH
          })
        });
      } catch {
        // Local retail extract is a development fallback; module snapshot sources remain authoritative.
      }
    }

    return sources;
  }

  private buildCreatureWalkRateLookup(
    appearanceSources: LoadedCreatureAppearanceTwoDaSource[],
    speedSources: LoadedCreatureSpeedTwoDaSource[]
  ): Map<number, CreatureWalkRateLookupEntry> {
    const speedByName = new Map<
      string,
      { row: ParsedCreatureSpeedTwoDaRow; source: LoadedCreatureSpeedTwoDaSource }
    >();
    for (const source of speedSources) {
      for (const row of source.rows) {
        const key = normalizeTwoDaLookupName(row.twoDaName);
        if (!key || speedByName.has(key)) {
          continue;
        }
        speedByName.set(key, { row, source });
      }
    }

    const lookup = new Map<number, CreatureWalkRateLookupEntry>();
    for (const source of appearanceSources) {
      for (const row of source.rows) {
        if (lookup.has(row.rowId)) {
          continue;
        }
        const key = normalizeTwoDaLookupName(row.moveRateName);
        if (!key) {
          continue;
        }
        const speedMatch = speedByName.get(key);
        if (!speedMatch) {
          continue;
        }
        lookup.set(row.rowId, {
          walkRate: speedMatch.row.rowId,
          appearanceRowId: row.rowId,
          moveRateName: row.moveRateName ?? "",
          speedRowId: speedMatch.row.rowId,
          appearanceSourceKey: source.key,
          speedSourceKey: speedMatch.source.key
        });
      }
    }

    return lookup;
  }

  private buildCreatureAppearanceLabelLookup(
    appearanceSources: LoadedCreatureAppearanceTwoDaSource[]
  ): Map<number, CreatureAppearanceLabelLookupEntry> {
    const lookup = new Map<number, CreatureAppearanceLabelLookupEntry>();
    for (const source of appearanceSources) {
      for (const row of source.rows) {
        if (lookup.has(row.rowId) || !hasCreatureAppearanceLookupPayload(row)) {
          continue;
        }
        lookup.set(row.rowId, {
          appearanceLabel: row.label,
          appearanceRowId: row.rowId,
          appearanceSourceKey: source.key,
          modelType: row.modelType,
          raceModel: row.raceModel,
          portrait2da: row.portrait2da,
          envMap: row.envMap,
          defaultPhenotype: row.defaultPhenotype,
          bloodColor: row.bloodColor,
          weaponScale: row.weaponScale,
          sizeCategory: row.sizeCategory
        });
      }
    }
    return lookup;
  }

  private buildCreatureClassLabelLookup(
    classSources: LoadedCreatureClassTwoDaSource[],
    talkTableLookup: TemplateTalkTableLookup
  ): Map<number, CreatureClassLabelLookupEntry> {
    const lookup = new Map<number, CreatureClassLabelLookupEntry>();
    for (const source of classSources) {
      for (const row of source.rows) {
        const classLabel =
          normalizeTwoDaLookupName(talkTableLookup.resolve(row.nameStrRef)?.text) ?? row.label;
        if (lookup.has(row.rowId) || !classLabel) {
          continue;
        }
        lookup.set(row.rowId, {
          classLabel,
          classRowId: row.rowId,
          classSourceKey: source.key
        });
      }
    }
    return lookup;
  }

  private buildCreatureRaceLabelLookup(
    raceSources: LoadedCreatureRaceTwoDaSource[]
  ): Map<number, CreatureRaceLabelLookupEntry> {
    const lookup = new Map<number, CreatureRaceLabelLookupEntry>();
    for (const source of raceSources) {
      for (const row of source.rows) {
        if (lookup.has(row.rowId) || (!row.label && row.appearanceId === undefined)) {
          continue;
        }
        lookup.set(row.rowId, {
          raceLabel: row.label ?? `Race ${row.rowId}`,
          raceRowId: row.rowId,
          raceSourceKey: source.key,
          ...(row.appearanceId !== undefined ? { raceAppearanceId: row.appearanceId } : {})
        });
      }
    }
    return lookup;
  }

  private buildCreatureGenderLabelLookup(
    genderSources: LoadedCreatureGenderTwoDaSource[]
  ): Map<number, CreatureGenderLabelLookupEntry> {
    const lookup = new Map<number, CreatureGenderLabelLookupEntry>();
    for (const source of genderSources) {
      for (const row of source.rows) {
        if (lookup.has(row.rowId) || !row.label) {
          continue;
        }
        lookup.set(row.rowId, {
          genderLabel: row.label,
          genderRowId: row.rowId,
          genderSourceKey: source.key
        });
      }
    }
    return lookup;
  }

  private buildCreaturePhenotypeLabelLookup(
    phenotypeSources: LoadedCreaturePhenotypeTwoDaSource[]
  ): Map<number, CreaturePhenotypeLabelLookupEntry> {
    const lookup = new Map<number, CreaturePhenotypeLabelLookupEntry>();
    for (const source of phenotypeSources) {
      for (const row of source.rows) {
        if (lookup.has(row.rowId) || !row.label) {
          continue;
        }
        lookup.set(row.rowId, {
          phenotypeLabel: row.label,
          phenotypeRowId: row.rowId,
          phenotypeSourceKey: source.key
        });
      }
    }
    return lookup;
  }

  private buildCreaturePartModelLookup(
    partSources: LoadedCreaturePartTwoDaSource[]
  ): Map<number, CreaturePartModelLookupEntry> {
    const lookup = new Map<number, CreaturePartModelLookupEntry>();
    for (const source of partSources) {
      for (const row of source.rows) {
        if (lookup.has(row.rowId) || !row.modelName) {
          continue;
        }
        lookup.set(row.rowId, {
          partRowId: row.rowId,
          modelName: row.modelName,
          ...(row.nodeName ? { nodeName: row.nodeName } : {}),
          partSourceKey: source.key
        });
      }
    }
    return lookup;
  }

  private buildCreatureAccessoryModelLookup(
    accessorySources: LoadedCreatureAccessoryModelTwoDaSource[]
  ): Map<number, CreatureAccessoryModelLookupEntry> {
    const lookup = new Map<number, CreatureAccessoryModelLookupEntry>();
    for (const source of accessorySources) {
      for (const row of source.rows) {
        if (lookup.has(row.rowId) || !row.modelResRef) {
          continue;
        }
        lookup.set(row.rowId, {
          partRowId: row.rowId,
          modelResRef: row.modelResRef,
          ...(row.label ? { label: row.label } : {}),
          source: source.source,
          sourceKey: source.key
        });
      }
    }
    return lookup;
  }

  private buildCreatureSizeLabelLookup(
    sizeSources: LoadedCreatureSizeTwoDaSource[]
  ): Map<number, CreatureSizeLabelLookupEntry> {
    const lookup = new Map<number, CreatureSizeLabelLookupEntry>();
    for (const source of sizeSources) {
      for (const row of source.rows) {
        if (lookup.has(row.rowId) || !row.label) {
          continue;
        }
        lookup.set(row.rowId, {
          sizeLabel: row.label,
          sizeRowId: row.rowId,
          sizeSourceKey: source.key
        });
      }
    }
    return lookup;
  }

  private buildCreaturePortraitLookup(
    portraitSources: LoadedCreaturePortraitTwoDaSource[]
  ): Map<number, CreaturePortraitLookupEntry> {
    const lookup = new Map<number, CreaturePortraitLookupEntry>();
    for (const source of portraitSources) {
      for (const row of source.rows) {
        if (lookup.has(row.rowId) || !row.baseResRef) {
          continue;
        }
        lookup.set(row.rowId, {
          portraitResRef: row.baseResRef,
          portraitRowId: row.rowId,
          portraitSourceKey: source.key
        });
      }
    }
    return lookup;
  }

  private buildCreatureSoundSetLookup(
    soundSetSources: LoadedCreatureSoundSetTwoDaSource[]
  ): Map<number, CreatureSoundSetLookupEntry> {
    const lookup = new Map<number, CreatureSoundSetLookupEntry>();
    for (const source of soundSetSources) {
      for (const row of source.rows) {
        if (lookup.has(row.rowId) || (!row.label && !row.resRef)) {
          continue;
        }
        lookup.set(row.rowId, {
          soundSetLabel: row.label,
          soundSetResRef: row.resRef,
          soundSetRowId: row.rowId,
          soundSetSourceKey: source.key
        });
      }
    }
    return lookup;
  }

  private buildCreatureSkillLabelLookup(
    skillSources: LoadedCreatureSkillTwoDaSource[]
  ): Map<number, CreatureSkillLabelLookupEntry> {
    const lookup = new Map<number, CreatureSkillLabelLookupEntry>();
    for (const source of skillSources) {
      for (const row of source.rows) {
        if (lookup.has(row.rowId) || !row.label) {
          continue;
        }
        lookup.set(row.rowId, {
          skillLabel: row.label,
          skillRowId: row.rowId,
          skillSourceKey: source.key
        });
      }
    }
    return lookup;
  }

  private buildCreatureFeatLabelLookup(
    featSources: LoadedCreatureFeatTwoDaSource[]
  ): Map<number, CreatureFeatLabelLookupEntry> {
    const lookup = new Map<number, CreatureFeatLabelLookupEntry>();
    for (const source of featSources) {
      for (const row of source.rows) {
        if (lookup.has(row.rowId) || !row.label) {
          continue;
        }
        lookup.set(row.rowId, {
          featLabel: row.label,
          featRowId: row.rowId,
          featSourceKey: source.key
        });
      }
    }
    return lookup;
  }

  private buildCreatureSpellLabelLookup(
    spellSources: LoadedCreatureSpellTwoDaSource[]
  ): Map<number, CreatureSpellLabelLookupEntry> {
    const lookup = new Map<number, CreatureSpellLabelLookupEntry>();
    for (const source of spellSources) {
      for (const row of source.rows) {
        if (lookup.has(row.rowId) || !row.label) {
          continue;
        }
        lookup.set(row.rowId, {
          spellLabel: row.label,
          spellRowId: row.rowId,
          spellSourceKey: source.key
        });
      }
    }
    return lookup;
  }

  private buildItemBaseItemLookup(
    baseItemSources: LoadedItemBaseItemTwoDaSource[]
  ): Map<number, ItemBaseItemLookupEntry> {
    const lookup = new Map<number, ItemBaseItemLookupEntry>();
    for (const source of baseItemSources) {
      for (const row of source.rows) {
        if (lookup.has(row.rowId) || !hasItemBaseItemTwoDaData(row)) {
          continue;
        }
        lookup.set(row.rowId, {
          baseItemRowId: row.rowId,
          ...(row.label ? { label: row.label } : {}),
          ...(row.itemClass ? { itemClass: row.itemClass } : {}),
          ...(row.modelType ? { modelType: row.modelType } : {}),
          ...(row.defaultModel ? { defaultModel: row.defaultModel } : {}),
          ...(row.defaultIcon ? { defaultIcon: row.defaultIcon } : {}),
          ...(row.invSlotWidth !== undefined ? { invSlotWidth: row.invSlotWidth } : {}),
          ...(row.invSlotHeight !== undefined ? { invSlotHeight: row.invSlotHeight } : {}),
          ...(row.canRotateIcon !== undefined ? { canRotateIcon: row.canRotateIcon } : {}),
          ...(row.equipableSlots ? { equipableSlots: row.equipableSlots } : {}),
          ...(row.baseCost !== undefined ? { baseCost: row.baseCost } : {}),
          ...(row.stacking !== undefined ? { stacking: row.stacking } : {}),
          ...(row.itemMultiplier !== undefined ? { itemMultiplier: row.itemMultiplier } : {}),
          ...(row.maxProps !== undefined ? { maxProps: row.maxProps } : {}),
          ...(row.minProps !== undefined ? { minProps: row.minProps } : {}),
          ...(row.propColumn ? { propColumn: row.propColumn } : {}),
          ...(row.storePanel !== undefined ? { storePanel: row.storePanel } : {}),
          ...(row.storePanelSort !== undefined ? { storePanelSort: row.storePanelSort } : {}),
          ...(row.chargesStarting !== undefined ? { chargesStarting: row.chargesStarting } : {}),
          ...(row.ilrStackSize !== undefined ? { ilrStackSize: row.ilrStackSize } : {}),
          ...(row.weaponWield !== undefined ? { weaponWield: row.weaponWield } : {}),
          ...(row.weaponType !== undefined ? { weaponType: row.weaponType } : {}),
          ...(row.weaponSize !== undefined ? { weaponSize: row.weaponSize } : {}),
          ...(row.rangedWeapon !== undefined ? { rangedWeapon: row.rangedWeapon } : {}),
          ...(row.rotateOnGround !== undefined ? { rotateOnGround: row.rotateOnGround } : {}),
          ...(row.weaponMatType !== undefined ? { weaponMatType: row.weaponMatType } : {}),
          ...(row.ammunitionType !== undefined ? { ammunitionType: row.ammunitionType } : {}),
          ...(row.arcaneSpellFailure !== undefined
            ? { arcaneSpellFailure: row.arcaneSpellFailure }
            : {}),
          sourceKey: source.key,
          sourceFingerprint: buildSourceFingerprint([
            "baseitems.2da",
            source.key,
            source.sourceEtag ?? "",
            String(row.rowId),
            row.label ?? "",
            row.itemClass ?? "",
            row.modelType ?? "",
            row.defaultModel ?? "",
            row.defaultIcon ?? "",
            String(row.invSlotWidth ?? ""),
            String(row.invSlotHeight ?? ""),
            String(row.canRotateIcon ?? ""),
            row.equipableSlots ?? "",
            String(row.baseCost ?? ""),
            String(row.stacking ?? ""),
            String(row.itemMultiplier ?? ""),
            String(row.maxProps ?? ""),
            String(row.minProps ?? ""),
            row.propColumn ?? "",
            String(row.storePanel ?? ""),
            String(row.storePanelSort ?? ""),
            String(row.chargesStarting ?? ""),
            String(row.ilrStackSize ?? ""),
            String(row.weaponWield ?? ""),
            String(row.weaponType ?? ""),
            String(row.weaponSize ?? ""),
            String(row.rangedWeapon ?? ""),
            String(row.rotateOnGround ?? ""),
            String(row.weaponMatType ?? ""),
            String(row.ammunitionType ?? ""),
            String(row.arcaneSpellFailure ?? "")
          ])
        });
      }
    }
    return lookup;
  }

  private buildItemPropertyDefinitionLookup(
    propertyDefinitionSources: LoadedItemPropertyDefinitionTwoDaSource[]
  ): Map<number, ItemPropertyDefinitionLookupEntry> {
    const lookup = new Map<number, ItemPropertyDefinitionLookupEntry>();
    for (const source of propertyDefinitionSources) {
      for (const row of source.rows) {
        if (lookup.has(row.rowId) || !hasItemPropertyDefinitionTwoDaData(row)) {
          continue;
        }
        lookup.set(row.rowId, {
          propertyName: row.rowId,
          ...(row.label ? { label: row.label } : {}),
          ...(row.nameStrRef !== undefined ? { nameStrRef: row.nameStrRef } : {}),
          ...(row.subTypeTable ? { subTypeTable: row.subTypeTable } : {}),
          ...(row.costTableDefinition ? { costTableDefinition: row.costTableDefinition } : {}),
          ...(row.param1Table ? { param1Table: row.param1Table } : {}),
          ...(row.gameStrRef !== undefined ? { gameStrRef: row.gameStrRef } : {}),
          ...(row.descriptionStrRef !== undefined
            ? { descriptionStrRef: row.descriptionStrRef }
            : {}),
          sourceKey: source.key,
          sourceFingerprint: buildSourceFingerprint([
            "itempropdef.2da",
            source.key,
            source.sourceEtag ?? "",
            String(row.rowId),
            row.label ?? "",
            String(row.nameStrRef ?? ""),
            row.subTypeTable ?? "",
            row.costTableDefinition ?? "",
            row.param1Table ?? "",
            String(row.gameStrRef ?? ""),
            String(row.descriptionStrRef ?? "")
          ])
        });
      }
    }
    return lookup;
  }

  private async buildDoorTwoDaLookup(
    settings: BlobStorageSettings,
    objects: ModuleBlobObjectSummary[]
  ): Promise<DoorTwoDaLookup> {
    const doortypesRows = await this.buildDoorTwoDaRows(settings, objects, "doortypes.2da");
    const genericdoorsRows = await this.buildDoorTwoDaRows(settings, objects, "genericdoors.2da");

    return {
      doortypesByRowId: indexDoorTwoDaRowsById(doortypesRows),
      genericdoorsByRowId: indexDoorTwoDaRowsById(genericdoorsRows),
      doortypesSourceKey: doortypesRows[0]?.sourceKey,
      genericdoorsSourceKey: genericdoorsRows[0]?.sourceKey
    };
  }

  private async readSnapshotObject(settings: BlobStorageSettings, key: string) {
    if (this.committedSnapshotReader) {
      this.capturedSnapshot ??= await this.committedSnapshotReader.capture();
      return this.capturedSnapshot.getModuleObject(key);
    }
    return this.moduleBlobStorage.getModuleObject(settings, key);
  }

  private async buildDoorTwoDaRows(
    settings: BlobStorageSettings,
    objects: ModuleBlobObjectSummary[],
    tableName: DoorTwoDaTableName
  ): Promise<DoorTwoDaRow[]> {
    const rows: DoorTwoDaRow[] = [];
    const seenRowIds = new Set<number>();
    const keys = collectTwoDaKeys(objects, tableName);
    if (keys.length === 0) {
      return rows;
    }

    const objectsByKey = new Map(objects.map((object) => [object.key, object]));
    for (const key of keys) {
      let payload;
      try {
        payload = await this.readSnapshotObject(settings, key);
      } catch {
        continue;
      }
      if (!payload) {
        continue;
      }

      const object = objectsByKey.get(key);
      const parsedRows = parseDoorTwoDaRows(payload.bytes, tableName, {
        sourceKey: key,
        sourceEtag: object?.etag ?? payload.etag
      });
      for (const row of parsedRows) {
        if (seenRowIds.has(row.rowId)) {
          continue;
        }
        seenRowIds.add(row.rowId);
        rows.push({
          ...row,
          sourceKey: key,
          sourceSize: object?.size ?? payload.size,
          updatedAt:
            object?.lastModified ?? payload.lastModified ?? new Date(0).toISOString(),
          sourceEtag: object?.etag ?? payload.etag,
          sourceFingerprint: buildSourceFingerprint([
            "2da",
            "door",
            tableName,
            key,
            String(row.rowId),
            row.label ?? "",
            row.modelResRef ?? "",
            object?.etag ?? payload.etag ?? ""
          ])
        });
      }
    }

    return rows;
  }

  private async buildRuntimeSourceDoorTwoDaLookup(): Promise<DoorTwoDaLookup> {
    const runtimeSettingsApplicationService = this.runtimeSettingsApplicationService;
    if (!runtimeSettingsApplicationService) {
      return {
        doortypesByRowId: new Map(),
        genericdoorsByRowId: new Map()
      };
    }

    const settings = await runtimeSettingsApplicationService.getRuntimeSettings();
    const resolvedHakSettings =
      await runtimeSettingsApplicationService.getResolvedHakSettings();
    const source = settings.sources.placeable;
    const doortypesRows: DoorTwoDaRow[] = [];
    const genericdoorsRows: DoorTwoDaRow[] = [];

    for (const tableName of DOOR_TWO_DA_TABLE_NAMES) {
      const rows = tableName === "doortypes.2da" ? doortypesRows : genericdoorsRows;
      if (source.includeHaks) {
        rows.push(
          ...(await readRuntimeDoorTwoDaRowsFromHakPaths(
            resolvedHakSettings.placeable.hakPaths,
            tableName,
            this.logger
          ))
        );
      }
      if (rows.length === 0 && source.includeVanilla) {
        rows.push(
          ...(await readRuntimeDoorTwoDaRowsFromVanilla(
            settings.paths.vanillaDataPath,
            tableName,
            this.logger
          ))
        );
      }
    }

    if (doortypesRows.length > 0 || genericdoorsRows.length > 0) {
      this.logger.log(
        `Loaded door 2DA render lookup directly from runtime sources (doortypes=${doortypesRows.length}, genericdoors=${genericdoorsRows.length}).`
      );
    }

    return {
      doortypesByRowId: indexDoorTwoDaRowsById(doortypesRows),
      genericdoorsByRowId: indexDoorTwoDaRowsById(genericdoorsRows),
      doortypesSourceKey: doortypesRows[0]?.sourceKey,
      genericdoorsSourceKey: genericdoorsRows[0]?.sourceKey
    };
  }
}

async function readRuntimeDoorTwoDaRowsFromHakPaths(
  hakPaths: string[],
  tableName: DoorTwoDaTableName,
  logger: Logger
): Promise<DoorTwoDaRow[]> {
  const resref = extractBasename(tableName);
  for (const hakPath of deduplicateRuntimeSourcePaths(hakPaths)) {
    try {
      const bytes = await readNwnErfResource(
        hakPath,
        resref,
        NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA
      );
      if (!bytes) {
        continue;
      }
      const sourceKey = buildRuntimeHakDoorTwoDaSourceKey(hakPath, tableName);
      return buildDoorTwoDaRowsFromRuntimeSource(bytes, tableName, sourceKey);
    } catch (error) {
      logger.warn(
        `Skipping runtime HAK door 2DA source because extraction failed (${hakPath}, ${tableName}): ${formatSnapshotIndexError(error)}`
      );
    }
  }
  return [];
}

async function readRuntimeCreatureAppearanceTwoDaSourceFromHakPaths(
  hakPaths: string[],
  logger: Logger
): Promise<LoadedCreatureAppearanceTwoDaSource | null> {
  for (const hakPath of deduplicateRuntimeSourcePaths(hakPaths)) {
    try {
      const bytes = await readNwnErfResource(
        hakPath,
        "appearance",
        NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA
      );
      if (!bytes) {
        continue;
      }
      const sourceKey = buildRuntimeHakCreatureTwoDaSourceKey(hakPath, "appearance.2da");
      const source = buildCreatureAppearanceTwoDaSourceFromRuntimeSource(
        bytes,
        sourceKey,
        "hak",
      );
      if (source) {
        return source;
      }
    } catch (error) {
      logger.warn(
        `Skipping runtime HAK creature appearance.2da source because extraction failed (${hakPath}): ${formatSnapshotIndexError(error)}`
      );
    }
  }
  return null;
}

async function readRuntimeEffectiveCreatureGenderTwoDaSourceFromHakPaths(
  hakPaths: string[],
  logger: Logger,
): Promise<LoadedEffectiveCreatureGenderTwoDaSource | null | undefined> {
  for (const hakPath of deduplicateRuntimeSourcePaths(hakPaths)) {
    try {
      const bytes = await readNwnErfResource(
        hakPath,
        "gender",
        NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA,
      );
      if (!bytes) continue;
      const sourceKey = buildRuntimeHakCreatureTwoDaSourceKey(hakPath, "gender.2da");
      // A stronger present but malformed resource blocks weaker fallback.
      return buildEffectiveCreatureGenderTwoDaSource(bytes, sourceKey, "hak");
    } catch (error) {
      logger.warn(
        `Effective creature gender.2da HAK lookup failed closed (${hakPath}): ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }
  return undefined;
}

async function readRuntimeEffectiveCreatureAppendageTwoDaSourceFromHakPaths(
  hakPaths: string[],
  resourceName: EffectiveCreatureAppendageTwoDaResourceName,
  logger: Logger,
): Promise<LoadedEffectiveCreatureAppendageTwoDaSource | null | undefined> {
  const resref = extractBasename(resourceName);
  for (const hakPath of deduplicateRuntimeSourcePaths(hakPaths)) {
    try {
      const bytes = await readNwnErfResource(
        hakPath,
        resref,
        NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA,
      );
      if (!bytes) continue;
      const sourceKey = buildRuntimeHakCreatureTwoDaSourceKey(hakPath, resourceName);
      // A stronger present but malformed resource blocks weaker fallback.
      return buildEffectiveCreatureAppendageTwoDaSource(
        bytes,
        resourceName,
        sourceKey,
        "hak",
      );
    } catch (error) {
      logger.warn(
        `Effective creature ${resourceName} HAK lookup failed closed (${hakPath}): ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }
  return undefined;
}

async function readRuntimeEffectiveCreatureRacialTypesTwoDaFromHakPaths(
  hakPaths: string[],
  logger: Logger,
): Promise<EffectiveCreatureRacialTypesTwoDaTable | null | undefined> {
  for (const hakPath of deduplicateRuntimeSourcePaths(hakPaths)) {
    try {
      const bytes = await readNwnErfResource(
        hakPath,
        "racialtypes",
        NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA,
      );
      if (!bytes) continue;
      const sourceObjectKey = buildRuntimeHakCreatureTwoDaSourceKey(
        hakPath,
        "racialtypes.2da",
      );
      // A stronger present but malformed resource blocks weaker fallback.
      return parseEffectiveCreatureRacialTypesTwoDa({
        bytes,
        sourceObjectKey,
        sourceLayer: "hak",
      });
    } catch (error) {
      logger.warn(
        `Effective Creature racialtypes.2da HAK lookup failed closed (${hakPath}): ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }
  return undefined;
}

async function readRuntimeEffectiveCreaturePerceptionRangesTwoDaFromHakPaths(
  hakPaths: string[],
  logger: Logger,
): Promise<EffectiveCreaturePerceptionRangesTwoDaTable | null | undefined> {
  for (const hakPath of deduplicateRuntimeSourcePaths(hakPaths)) {
    try {
      const bytes = await readNwnErfResource(
        hakPath,
        "ranges",
        NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA,
      );
      if (!bytes) continue;
      const sourceObjectKey = buildRuntimeHakCreatureTwoDaSourceKey(hakPath, "ranges.2da");
      // A stronger present but malformed resource blocks weaker fallback.
      return parseEffectiveCreaturePerceptionRangesTwoDa({
        bytes,
        sourceObjectKey,
        sourceLayer: "hak",
        resolveStrRef: () => undefined,
      });
    } catch (error) {
      logger.warn(
        `Effective Creature ranges.2da HAK lookup failed closed (${hakPath}): ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }
  return undefined;
}

async function readRuntimeEffectiveCreatureWalkRatesTwoDaFromHakPaths(
  hakPaths: string[],
  logger: Logger,
): Promise<EffectiveCreatureWalkRatesTwoDaTable | null | undefined> {
  for (const hakPath of deduplicateRuntimeSourcePaths(hakPaths)) {
    try {
      const bytes = await readNwnErfResource(
        hakPath,
        "creaturespeed",
        NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA,
      );
      if (!bytes) continue;
      const sourceObjectKey = buildRuntimeHakCreatureTwoDaSourceKey(
        hakPath,
        "creaturespeed.2da",
      );
      // A stronger present but malformed resource blocks weaker fallback.
      return parseEffectiveCreatureWalkRatesTwoDa({
        bytes,
        sourceObjectKey,
        sourceLayer: "hak",
        resolveStrRef: () => undefined,
      });
    } catch (error) {
      logger.warn(
        `Effective Creature creaturespeed.2da HAK lookup failed closed (${hakPath}): ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }
  return undefined;
}

async function readRuntimeEffectiveCreatureSoundSetsTwoDaFromHakPaths(
  hakPaths: string[],
  logger: Logger,
): Promise<EffectiveCreatureSoundSetsTwoDaTable | null | undefined> {
  for (const hakPath of deduplicateRuntimeSourcePaths(hakPaths)) {
    try {
      const bytes = await readNwnErfResource(
        hakPath,
        "soundset",
        NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA,
      );
      if (!bytes) continue;
      const sourceObjectKey = buildRuntimeHakCreatureTwoDaSourceKey(
        hakPath,
        "soundset.2da",
      );
      // A stronger present but malformed resource blocks weaker fallback.
      return parseEffectiveCreatureSoundSetsTwoDa({
        bytes,
        sourceObjectKey,
        sourceLayer: "hak",
        resolveStrRef: () => undefined,
      });
    } catch (error) {
      logger.warn(
        `Effective Creature soundset.2da HAK lookup failed closed (${hakPath}): ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }
  return undefined;
}

async function readRuntimeEffectiveCreatureStartingPackagesTwoDaFromHakPaths(
  hakPaths: string[],
  logger: Logger,
): Promise<EffectiveCreatureStartingPackagesTwoDaTable | null | undefined> {
  for (const hakPath of deduplicateRuntimeSourcePaths(hakPaths)) {
    try {
      const bytes = await readNwnErfResource(
        hakPath,
        "packages",
        NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA,
      );
      if (!bytes) continue;
      const sourceObjectKey = buildRuntimeHakCreatureTwoDaSourceKey(
        hakPath,
        "packages.2da",
      );
      // A stronger present but malformed resource blocks weaker fallback.
      return parseEffectiveCreatureStartingPackagesTwoDa({
        bytes,
        sourceObjectKey,
        sourceLayer: "hak",
        resolveStrRef: () => undefined,
      });
    } catch (error) {
      logger.warn(
        `Effective Creature packages.2da HAK lookup failed closed (${hakPath}): ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }
  return undefined;
}

async function readRuntimeEffectiveCreatureClassesTwoDaFromHakPaths(
  hakPaths: string[],
  logger: Logger,
): Promise<EffectiveCreatureClassesTwoDaTable | null | undefined> {
  for (const hakPath of deduplicateRuntimeSourcePaths(hakPaths)) {
    try {
      const bytes = await readNwnErfResource(
        hakPath,
        "classes",
        NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA,
      );
      if (!bytes) continue;
      const sourceObjectKey = buildRuntimeHakCreatureTwoDaSourceKey(
        hakPath,
        "classes.2da",
      );
      return parseEffectiveCreatureClassesTwoDa({
        bytes,
        sourceObjectKey,
        sourceLayer: "hak",
        resolveStrRef: () => undefined,
      });
    } catch (error) {
      logger.warn(
        `Effective Creature classes.2da HAK lookup failed closed (${hakPath}): ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }
  return undefined;
}

async function readRuntimeEffectiveCreatureSkillsTwoDaFromHakPaths(
  hakPaths: string[],
  logger: Logger,
): Promise<EffectiveCreatureSkillsTwoDaTable | null | undefined> {
  for (const hakPath of deduplicateRuntimeSourcePaths(hakPaths)) {
    try {
      const bytes = await readNwnErfResource(
        hakPath,
        "skills",
        NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA,
      );
      if (!bytes) continue;
      const sourceObjectKey = buildRuntimeHakCreatureTwoDaSourceKey(
        hakPath,
        "skills.2da",
      );
      // A stronger present but malformed resource blocks weaker fallback.
      return parseEffectiveCreatureSkillsTwoDa({
        bytes,
        sourceObjectKey,
        sourceLayer: "hak",
        resolveStrRef: () => undefined,
      });
    } catch (error) {
      logger.warn(
        `Effective Creature skills.2da HAK lookup failed closed (${hakPath}): ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }
  return undefined;
}

async function readRuntimeEffectiveCreatureFeatsTwoDaFromHakPaths(
  hakPaths: string[],
  logger: Logger,
): Promise<EffectiveCreatureFeatsTwoDaTable | null | undefined> {
  for (const hakPath of deduplicateRuntimeSourcePaths(hakPaths)) {
    try {
      const bytes = await readNwnErfResource(
        hakPath,
        "feat",
        NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA,
      );
      if (!bytes) continue;
      const sourceObjectKey = buildRuntimeHakCreatureTwoDaSourceKey(
        hakPath,
        "feat.2da",
      );
      // A stronger present but malformed resource blocks weaker fallback.
      return parseEffectiveCreatureFeatsTwoDa({
        bytes,
        sourceObjectKey,
        sourceLayer: "hak",
        resolveStrRef: () => undefined,
      });
    } catch (error) {
      logger.warn(
        `Effective Creature feat.2da HAK lookup failed closed (${hakPath}): ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }
  return undefined;
}

async function readRuntimeEffectiveCreatureSpecialAbilitiesTwoDaFromHakPaths(
  hakPaths: string[],
  logger: Logger,
): Promise<EffectiveCreatureSpecialAbilitiesTwoDaTable | null | undefined> {
  for (const hakPath of deduplicateRuntimeSourcePaths(hakPaths)) {
    try {
      const bytes = await readNwnErfResource(
        hakPath,
        "spells",
        NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA,
      );
      if (!bytes) continue;
      const sourceObjectKey = buildRuntimeHakCreatureTwoDaSourceKey(
        hakPath,
        "spells.2da",
      );
      // A stronger present but malformed resource blocks weaker fallback.
      return parseEffectiveCreatureSpecialAbilitiesTwoDa({
        bytes,
        sourceObjectKey,
        sourceLayer: "hak",
        resolveStrRef: () => undefined,
      });
    } catch (error) {
      logger.warn(
        `Effective Creature spells.2da HAK lookup failed closed (${hakPath}): ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }
  return undefined;
}

async function readRuntimeEffectiveCreaturePhenotypeTwoDaSourceFromHakPaths(
  hakPaths: string[],
  logger: Logger,
): Promise<LoadedEffectiveCreaturePhenotypeTwoDaSource | null | undefined> {
  for (const hakPath of deduplicateRuntimeSourcePaths(hakPaths)) {
    try {
      const bytes = await readNwnErfResource(
        hakPath,
        "phenotype",
        NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA,
      );
      if (!bytes) continue;
      const sourceKey = buildRuntimeHakCreatureTwoDaSourceKey(hakPath, "phenotype.2da");
      // A stronger present but malformed resource blocks weaker fallback.
      return buildEffectiveCreaturePhenotypeTwoDaSource(bytes, sourceKey, "hak");
    } catch (error) {
      logger.warn(
        `Effective creature phenotype.2da HAK lookup failed closed (${hakPath}): ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }
  return undefined;
}

async function readRuntimeCreaturePartTwoDaSourceFromHakPaths(
  hakPaths: string[],
  logger: Logger
): Promise<LoadedCreaturePartTwoDaSource | null> {
  for (const hakPath of deduplicateRuntimeSourcePaths(hakPaths)) {
    try {
      const bytes = await readNwnErfResource(
        hakPath,
        "capart",
        NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA
      );
      if (!bytes) {
        continue;
      }
      const sourceKey = buildRuntimeHakCreatureTwoDaSourceKey(hakPath, "capart.2da");
      const source = buildCreaturePartTwoDaSourceFromRuntimeSource(bytes, sourceKey);
      if (source.rows.length > 0) {
        return source;
      }
    } catch (error) {
      logger.warn(
        `Skipping runtime HAK creature capart.2da source because extraction failed (${hakPath}): ${formatSnapshotIndexError(error)}`
      );
    }
  }
  return null;
}

async function readRuntimeCreatureAccessoryModelTwoDaSourceFromHakPaths(
  hakPaths: string[],
  tableFileName: "wingmodel.2da" | "tailmodel.2da",
  sourceKind: CreatureAccessoryModelSource,
  logger: Logger
): Promise<LoadedCreatureAccessoryModelTwoDaSource | null> {
  const resref = extractBasename(tableFileName);
  for (const hakPath of deduplicateRuntimeSourcePaths(hakPaths)) {
    try {
      const bytes = await readNwnErfResource(
        hakPath,
        resref,
        NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA
      );
      if (!bytes) {
        continue;
      }
      const sourceKey = buildRuntimeHakCreatureTwoDaSourceKey(hakPath, tableFileName);
      const source = buildCreatureAccessoryModelTwoDaSourceFromRuntimeSource(
        bytes,
        tableFileName,
        sourceKind,
        sourceKey
      );
      if (source.rows.length > 0) {
        return source;
      }
    } catch (error) {
      logger.warn(
        `Skipping runtime HAK creature ${tableFileName} source because extraction failed (${hakPath}): ${formatSnapshotIndexError(error)}`
      );
    }
  }
  return null;
}

async function readRuntimeDoorTemplateGenericTypeFromHakPaths(
  hakPaths: string[],
  resref: string,
  logger: Logger
): Promise<number | null> {
  for (const hakPath of deduplicateRuntimeSourcePaths(hakPaths)) {
    try {
      const bytes = await readNwnErfResource(hakPath, resref, NWN_UTD_RESOURCE_TYPE);
      const genericType = readDoorTemplateGenericType(bytes);
      if (genericType !== null) {
        return genericType;
      }
    } catch (error) {
      logger.warn(
        `Skipping runtime HAK door UTD source because extraction failed (${hakPath}, ${resref}.utd): ${formatSnapshotIndexError(error)}`
      );
    }
  }
  return null;
}

async function readRuntimeDoorTwoDaRowsFromVanilla(
  vanillaRoot: string,
  tableName: DoorTwoDaTableName,
  logger: Logger
): Promise<DoorTwoDaRow[]> {
  const resref = extractBasename(tableName);
  for (const keyFileName of VANILLA_KEY_FILE_CANDIDATES) {
    const keyPath = resolve(vanillaRoot, keyFileName);
    let reader: NwnKeyBifResourceReader;
    try {
      reader = await NwnKeyBifResourceReader.open(keyPath, vanillaRoot);
    } catch {
      continue;
    }

    try {
      const bytes = await reader.read(resref, NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA);
      if (!bytes) {
        continue;
      }
      const sourceKey = `runtime-source/vanilla/${keyFileName}/${tableName}`;
      return buildDoorTwoDaRowsFromRuntimeSource(bytes, tableName, sourceKey);
    } catch (error) {
      logger.warn(
        `Skipping runtime vanilla door 2DA source because read failed (${keyPath}, ${tableName}): ${formatSnapshotIndexError(error)}`
      );
    }
  }
  return [];
}

async function readRuntimeLightColorTwoDaSourceFromVanilla(
  vanillaRoot: string,
  logger: Logger
): Promise<LoadedLightColorTwoDaSource | null> {
  const resolvedVanillaRoot = resolveRuntimeFileSystemPath(vanillaRoot);
  for (const keyFileName of VANILLA_KEY_FILE_CANDIDATES) {
    const keyPath = resolve(resolvedVanillaRoot, keyFileName);
    let reader: NwnKeyBifResourceReader;
    try {
      reader = await NwnKeyBifResourceReader.open(keyPath, resolvedVanillaRoot);
    } catch {
      continue;
    }

    try {
      const bytes = await reader.read("lightcolor", NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA);
      if (!bytes) {
        continue;
      }
      const sourceKey = `runtime-source/vanilla/${keyFileName}/lightcolor.2da`;
      const parsedRows = parseLightColorTwoDaRows(bytes, {
        sourceKey,
        sourceEtag: buildContentHash(bytes)
      });
      if (parsedRows.length === 0) {
        continue;
      }
      return {
        key: sourceKey,
        sourceSize: bytes.length,
        updatedAt: new Date(0).toISOString(),
        sourceEtag: buildContentHash(bytes),
        rows: parsedRows,
      };
    } catch (error) {
      logger.warn(
        `Skipping runtime vanilla lightcolor.2da source because read failed (${keyPath}): ${formatSnapshotIndexError(error)}`
      );
    }
  }
  return null;
}

async function readRuntimePlaceablesTwoDaSourceFromVanilla(
  vanillaRoot: string,
  lightColorLookup: ReadonlyMap<number, LightColorTwoDaLookupEntry>,
  logger: Logger
): Promise<LoadedPlaceablesTwoDaSource | null> {
  const resolvedVanillaRoot = resolveRuntimeFileSystemPath(vanillaRoot);
  for (const keyFileName of VANILLA_KEY_FILE_CANDIDATES) {
    const keyPath = resolve(resolvedVanillaRoot, keyFileName);
    let reader: NwnKeyBifResourceReader;
    try {
      reader = await NwnKeyBifResourceReader.open(keyPath, resolvedVanillaRoot);
    } catch {
      continue;
    }

    try {
      const bytes = await reader.read("placeables", NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA);
      if (!bytes) {
        continue;
      }
      const sourceKey = `runtime-source/vanilla/${keyFileName}/placeables.2da`;
      const parsedRows = enrichPlaceablesTwoDaRowsWithLightColors(
        parsePlaceablesTwoDaRows(bytes),
        lightColorLookup
      );
      const descriptor = buildEffectivePlaceablesTwoDaDescriptor({
        bytes,
        sourceObjectKey: sourceKey,
        sourceLayer: "vanilla",
      });
      if (!shouldAdmitEffectivePlaceablesTwoDaSource(parsedRows.length, descriptor)) {
        continue;
      }
      return {
        key: sourceKey,
        sourceSize: bytes.length,
        updatedAt: new Date(0).toISOString(),
        sourceEtag: buildContentHash(bytes),
        rows: parsedRows,
        descriptor,
        appearanceRows: descriptor ? parseEffectivePlaceablesTwoDaRows(bytes) ?? [] : [],
      };
    } catch (error) {
      logger.warn(
        `Skipping runtime vanilla placeables.2da source because read failed (${keyPath}): ${formatSnapshotIndexError(error)}`
      );
    }
  }
  return null;
}

async function readRuntimeEffectiveWaypointTwoDaFromVanilla(
  vanillaRoot: string,
  logger: Logger,
): Promise<LoadedWaypointTwoDaSource | null> {
  const resolvedVanillaRoot = resolveRuntimeFileSystemPath(vanillaRoot);
  for (const keyFileName of VANILLA_KEY_FILE_CANDIDATES) {
    const keyPath = resolve(resolvedVanillaRoot, keyFileName);
    let reader: NwnKeyBifResourceReader;
    try {
      reader = await NwnKeyBifResourceReader.open(keyPath, resolvedVanillaRoot);
    } catch {
      continue;
    }
    try {
      const bytes = await reader.read("waypoint", NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA);
      if (!bytes) continue;
      const key = `runtime-source/vanilla/${keyFileName}/waypoint.2da`;
      const descriptor = buildEffectiveWaypointTwoDaDescriptor({
        bytes,
        sourceObjectKey: key,
        sourceLayer: "vanilla",
      });
      const rows = parseEffectiveWaypointTwoDaRows(bytes);
      if (descriptor && rows && rows.length > 0) {
        return Object.freeze({ key, descriptor, rows });
      }
    } catch (error) {
      logger.warn(
        `Skipping runtime vanilla waypoint.2da source because read failed (${keyPath}): ${formatSnapshotIndexError(error)}`
      );
    }
  }
  return null;
}

async function readRuntimeEffectiveItemBaseItemsTwoDaFromVanilla(
  vanillaRoot: string,
  logger: Logger,
): Promise<EffectiveItemBaseItemsTwoDaTable | null> {
  const resolvedVanillaRoot = resolveRuntimeFileSystemPath(vanillaRoot);
  for (const keyFileName of VANILLA_KEY_FILE_CANDIDATES) {
    const keyPath = resolve(resolvedVanillaRoot, keyFileName);
    let reader: NwnKeyBifResourceReader;
    try {
      reader = await NwnKeyBifResourceReader.open(keyPath, resolvedVanillaRoot);
    } catch {
      continue;
    }
    try {
      const bytes = await reader.read("baseitems", NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA);
      if (!bytes) continue;
      const parsed = parseEffectiveItemBaseItemsTwoDa({
        bytes,
        sourceObjectKey: `runtime-source/vanilla/${keyFileName}/baseitems.2da`,
        sourceLayer: "vanilla",
      });
      if (parsed) return parsed;
    } catch (error) {
      logger.warn(
        `Skipping runtime vanilla baseitems.2da source because read failed (${keyPath}): ${formatSnapshotIndexError(error)}`,
      );
    }
  }
  return null;
}

async function readRuntimeEffectiveTrapsTwoDaFromVanilla(
  vanillaRoot: string,
  logger: Logger,
): Promise<EffectiveTrapsTwoDaTable | null> {
  const resolvedVanillaRoot = resolveRuntimeFileSystemPath(vanillaRoot);
  for (const keyFileName of VANILLA_KEY_FILE_CANDIDATES) {
    const keyPath = resolve(resolvedVanillaRoot, keyFileName);
    let reader: NwnKeyBifResourceReader;
    try {
      reader = await NwnKeyBifResourceReader.open(keyPath, resolvedVanillaRoot);
    } catch {
      continue;
    }
    try {
      const bytes = await reader.read("traps", NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA);
      if (!bytes) {
        continue;
      }
      const sourceObjectKey = `runtime-source/vanilla/${keyFileName}/traps.2da`;
      const parsed = parseEffectiveTrapsTwoDa({
        bytes,
        sourceObjectKey,
        sourceLayer: "vanilla",
      });
      if (parsed) {
        return parsed;
      }
    } catch (error) {
      logger.warn(
        `Skipping runtime vanilla traps.2da source because read failed (${keyPath}): ${formatSnapshotIndexError(error)}`,
      );
    }
  }
  return null;
}

async function readRuntimeEffectiveBodyBagTwoDaFromVanilla(
  vanillaRoot: string,
  logger: Logger,
): Promise<EffectiveBodyBagTwoDaTable | null> {
  const resolvedVanillaRoot = resolveRuntimeFileSystemPath(vanillaRoot);
  for (const keyFileName of VANILLA_KEY_FILE_CANDIDATES) {
    const keyPath = resolve(resolvedVanillaRoot, keyFileName);
    let reader: NwnKeyBifResourceReader;
    try {
      reader = await NwnKeyBifResourceReader.open(keyPath, resolvedVanillaRoot);
    } catch {
      continue;
    }
    try {
      const bytes = await reader.read("bodybag", NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA);
      if (!bytes) continue;
      const sourceObjectKey = `runtime-source/vanilla/${keyFileName}/bodybag.2da`;
      const parsed = parseEffectiveBodyBagTwoDa({
        bytes,
        sourceObjectKey,
        sourceLayer: "vanilla",
      });
      if (parsed) return parsed;
    } catch (error) {
      logger.warn(
        `Skipping runtime vanilla bodybag.2da source because read failed (${keyPath}): ${formatSnapshotIndexError(error)}`,
      );
    }
  }
  return null;
}

async function readRuntimeEffectiveAreaAudioTwoDaFromVanilla(
  vanillaRoot: string,
  resourceName: EffectiveAreaAudioTwoDaResourceName,
  logger: Logger,
): Promise<EffectiveAreaAudioTwoDaTable | null> {
  const resolvedVanillaRoot = resolveRuntimeFileSystemPath(vanillaRoot);
  const resref = resourceName.slice(0, -".2da".length);
  for (const keyFileName of VANILLA_KEY_FILE_CANDIDATES) {
    const keyPath = resolve(resolvedVanillaRoot, keyFileName);
    let reader: NwnKeyBifResourceReader;
    try {
      reader = await NwnKeyBifResourceReader.open(keyPath, resolvedVanillaRoot);
    } catch {
      continue;
    }
    try {
      const bytes = await reader.read(resref, NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA);
      if (!bytes) continue;
      return parseEffectiveAreaAudioTwoDa({
        resourceName,
        bytes,
        sourceObjectKey: `runtime-source/vanilla/${keyFileName}/${resourceName}`,
        sourceLayer: "vanilla",
      });
    } catch (error) {
      logger.warn(
        `Skipping runtime vanilla ${resourceName} source because read failed (${keyPath}): ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }
  return null;
}

async function readRuntimeEffectiveAreaVisualEnvironmentTwoDaFromVanilla(
  vanillaRoot: string,
  resourceName: "environment.2da",
  logger: Logger,
): Promise<EffectiveAreaEnvironmentTwoDaTable | null>;
async function readRuntimeEffectiveAreaVisualEnvironmentTwoDaFromVanilla(
  vanillaRoot: string,
  resourceName: "skyboxes.2da",
  logger: Logger,
): Promise<EffectiveAreaSkyBoxesTwoDaTable | null>;
async function readRuntimeEffectiveAreaVisualEnvironmentTwoDaFromVanilla(
  vanillaRoot: string,
  resourceName: EffectiveAreaVisualResourceName,
  logger: Logger,
): Promise<EffectiveAreaEnvironmentTwoDaTable | EffectiveAreaSkyBoxesTwoDaTable | null> {
  const resolvedVanillaRoot = resolveRuntimeFileSystemPath(vanillaRoot);
  const resref = resourceName.slice(0, -".2da".length);
  for (const source of await openRuntimeVanillaKeyReaders(resolvedVanillaRoot)) {
    try {
      const bytes = await source.reader.read(resref, NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA);
      if (!bytes) continue;
      const input = {
        bytes,
        sourceObjectKey: `runtime-source/vanilla/${source.keyFileName}/${resourceName}`,
        sourceLayer: "vanilla" as const,
      };
      return resourceName === "environment.2da"
        ? parseEffectiveAreaEnvironmentTwoDa(input)
        : parseEffectiveAreaSkyBoxesTwoDa(input);
    } catch (error) {
      logger.warn(
        `Omitting runtime vanilla ${resourceName} because effective resource read failed: ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }
  return null;
}

async function readRuntimeEffectiveAreaEncounterDifficultyTwoDaFromVanilla(
  vanillaRoot: string,
  logger: Logger,
): Promise<EffectiveAreaEncounterDifficultyTwoDaTable | null> {
  const resolvedVanillaRoot = resolveRuntimeFileSystemPath(vanillaRoot);
  for (const source of await openRuntimeVanillaKeyReaders(resolvedVanillaRoot)) {
    try {
      const bytes = await source.reader.read(
        "encdifficulty",
        NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA,
      );
      if (!bytes) continue;
      return parseEffectiveAreaEncounterDifficultyTwoDa({
        bytes,
        sourceObjectKey:
          `runtime-source/vanilla/${source.keyFileName}/encdifficulty.2da`,
        sourceLayer: "vanilla",
      });
    } catch (error) {
      logger.warn(
        `Omitting runtime vanilla encdifficulty.2da because effective resource read failed: ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }
  return null;
}

async function readRuntimeEffectiveAreaLoadingScreenTwoDaFromVanilla(
  vanillaRoot: string,
  logger: Logger,
): Promise<EffectiveAreaLoadingScreenTwoDaTable | null> {
  const resolvedVanillaRoot = resolveRuntimeFileSystemPath(vanillaRoot);
  for (const source of await openRuntimeVanillaKeyReaders(resolvedVanillaRoot)) {
    try {
      const bytes = await source.reader.read(
        "loadscreens",
        NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA,
      );
      if (!bytes) continue;
      return parseEffectiveAreaLoadingScreenTwoDa({
        bytes,
        sourceObjectKey:
          `runtime-source/vanilla/${source.keyFileName}/loadscreens.2da`,
        sourceLayer: "vanilla",
      });
    } catch (error) {
      logger.warn(
        `Omitting runtime vanilla loadscreens.2da because effective resource read failed: ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }
  return null;
}

async function openRuntimeVanillaKeyReaders(
  vanillaRoot: string,
): Promise<readonly RuntimeVanillaKeyReader[]> {
  const resolvedVanillaRoot = resolveRuntimeFileSystemPath(vanillaRoot);
  const sources: RuntimeVanillaKeyReader[] = [];
  for (const keyFileName of VANILLA_KEY_FILE_CANDIDATES) {
    try {
      sources.push(Object.freeze({
        keyFileName,
        reader: await NwnKeyBifResourceReader.open(
          resolve(resolvedVanillaRoot, keyFileName),
          resolvedVanillaRoot,
        ),
      }));
    } catch {
      continue;
    }
  }
  return Object.freeze(sources);
}

async function readRuntimeCreatureAppearanceTwoDaSourceFromVanilla(
  vanillaRoot: string,
  logger: Logger
): Promise<LoadedCreatureAppearanceTwoDaSource | null> {
  for (const keyFileName of VANILLA_KEY_FILE_CANDIDATES) {
    const keyPath = resolve(vanillaRoot, keyFileName);
    let reader: NwnKeyBifResourceReader;
    try {
      reader = await NwnKeyBifResourceReader.open(keyPath, vanillaRoot);
    } catch {
      continue;
    }

    try {
      const bytes = await reader.read("appearance", NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA);
      if (!bytes) {
        continue;
      }
      const sourceKey = `runtime-source/vanilla/${keyFileName}/appearance.2da`;
      const source = buildCreatureAppearanceTwoDaSourceFromRuntimeSource(
        bytes,
        sourceKey,
        "vanilla",
      );
      if (source) {
        return source;
      }
    } catch (error) {
      logger.warn(
        `Skipping runtime vanilla creature appearance.2da source because read failed (${keyPath}): ${formatSnapshotIndexError(error)}`
      );
    }
  }
  return null;
}

async function readRuntimeEffectiveCreatureGenderTwoDaSourceFromVanilla(
  vanillaRoot: string,
  logger: Logger,
): Promise<LoadedEffectiveCreatureGenderTwoDaSource | null> {
  for (const keyFileName of VANILLA_KEY_FILE_CANDIDATES) {
    const keyPath = resolve(vanillaRoot, keyFileName);
    let reader: NwnKeyBifResourceReader;
    try {
      reader = await NwnKeyBifResourceReader.open(keyPath, vanillaRoot);
    } catch {
      continue;
    }
    try {
      const bytes = await reader.read("gender", NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA);
      if (!bytes) continue;
      const sourceKey = `runtime-source/vanilla/${keyFileName}/gender.2da`;
      // A present malformed first-hit resource blocks weaker KEY fallback.
      return buildEffectiveCreatureGenderTwoDaSource(bytes, sourceKey, "vanilla");
    } catch (error) {
      logger.warn(
        `Effective creature gender.2da vanilla lookup failed closed (${keyPath}): ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }
  return null;
}

async function readRuntimeEffectiveCreatureAppendageTwoDaSourceFromVanilla(
  vanillaRoot: string,
  resourceName: EffectiveCreatureAppendageTwoDaResourceName,
  logger: Logger,
): Promise<LoadedEffectiveCreatureAppendageTwoDaSource | null> {
  const resref = extractBasename(resourceName);
  for (const keyFileName of VANILLA_KEY_FILE_CANDIDATES) {
    const keyPath = resolve(vanillaRoot, keyFileName);
    let reader: NwnKeyBifResourceReader;
    try {
      reader = await NwnKeyBifResourceReader.open(keyPath, vanillaRoot);
    } catch {
      continue;
    }
    try {
      const bytes = await reader.read(resref, NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA);
      if (!bytes) continue;
      const sourceKey = `runtime-source/vanilla/${keyFileName}/${resourceName}`;
      // A present malformed first-hit resource blocks weaker KEY fallback.
      return buildEffectiveCreatureAppendageTwoDaSource(
        bytes,
        resourceName,
        sourceKey,
        "vanilla",
      );
    } catch (error) {
      logger.warn(
        `Effective creature ${resourceName} vanilla lookup failed closed (${keyPath}): ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }
  return null;
}

async function readRuntimeEffectiveCreatureRacialTypesTwoDaFromVanilla(
  vanillaRoot: string,
  logger: Logger,
): Promise<EffectiveCreatureRacialTypesTwoDaTable | null> {
  for (const keyFileName of VANILLA_KEY_FILE_CANDIDATES) {
    const keyPath = resolve(vanillaRoot, keyFileName);
    let reader: NwnKeyBifResourceReader;
    try {
      reader = await NwnKeyBifResourceReader.open(keyPath, vanillaRoot);
    } catch {
      continue;
    }
    try {
      const bytes = await reader.read("racialtypes", NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA);
      if (!bytes) continue;
      const sourceObjectKey = `runtime-source/vanilla/${keyFileName}/racialtypes.2da`;
      // A present malformed first-hit resource blocks weaker KEY fallback.
      return parseEffectiveCreatureRacialTypesTwoDa({
        bytes,
        sourceObjectKey,
        sourceLayer: "vanilla",
      });
    } catch (error) {
      logger.warn(
        `Effective Creature racialtypes.2da vanilla lookup failed closed (${keyPath}): ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }
  return null;
}

async function readRuntimeEffectiveCreaturePerceptionRangesTwoDaFromVanilla(
  vanillaRoot: string,
  logger: Logger,
): Promise<EffectiveCreaturePerceptionRangesTwoDaTable | null> {
  for (const keyFileName of VANILLA_KEY_FILE_CANDIDATES) {
    const keyPath = resolve(vanillaRoot, keyFileName);
    let reader: NwnKeyBifResourceReader;
    try {
      reader = await NwnKeyBifResourceReader.open(keyPath, vanillaRoot);
    } catch {
      continue;
    }
    try {
      const bytes = await reader.read("ranges", NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA);
      if (!bytes) continue;
      const sourceObjectKey = `runtime-source/vanilla/${keyFileName}/ranges.2da`;
      // A present malformed first-hit resource blocks weaker KEY fallback.
      return parseEffectiveCreaturePerceptionRangesTwoDa({
        bytes,
        sourceObjectKey,
        sourceLayer: "vanilla",
        resolveStrRef: () => undefined,
      });
    } catch (error) {
      logger.warn(
        `Effective Creature ranges.2da vanilla lookup failed closed (${keyPath}): ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }
  return null;
}

async function readRuntimeEffectiveCreatureWalkRatesTwoDaFromVanilla(
  vanillaRoot: string,
  logger: Logger,
): Promise<EffectiveCreatureWalkRatesTwoDaTable | null> {
  for (const keyFileName of VANILLA_KEY_FILE_CANDIDATES) {
    const keyPath = resolve(vanillaRoot, keyFileName);
    let reader: NwnKeyBifResourceReader;
    try {
      reader = await NwnKeyBifResourceReader.open(keyPath, vanillaRoot);
    } catch {
      continue;
    }
    try {
      const bytes = await reader.read("creaturespeed", NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA);
      if (!bytes) continue;
      const sourceObjectKey = `runtime-source/vanilla/${keyFileName}/creaturespeed.2da`;
      // A present malformed first-hit resource blocks weaker KEY fallback.
      return parseEffectiveCreatureWalkRatesTwoDa({
        bytes,
        sourceObjectKey,
        sourceLayer: "vanilla",
        resolveStrRef: () => undefined,
      });
    } catch (error) {
      logger.warn(
        `Effective Creature creaturespeed.2da vanilla lookup failed closed (${keyPath}): ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }
  return null;
}

async function readRuntimeEffectiveCreatureSoundSetsTwoDaFromVanilla(
  vanillaRoot: string,
  logger: Logger,
): Promise<EffectiveCreatureSoundSetsTwoDaTable | null> {
  for (const keyFileName of VANILLA_KEY_FILE_CANDIDATES) {
    const keyPath = resolve(vanillaRoot, keyFileName);
    let reader: NwnKeyBifResourceReader;
    try {
      reader = await NwnKeyBifResourceReader.open(keyPath, vanillaRoot);
    } catch {
      continue;
    }
    try {
      const bytes = await reader.read("soundset", NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA);
      if (!bytes) continue;
      const sourceObjectKey = `runtime-source/vanilla/${keyFileName}/soundset.2da`;
      // A present malformed first-hit resource blocks weaker KEY fallback.
      return parseEffectiveCreatureSoundSetsTwoDa({
        bytes,
        sourceObjectKey,
        sourceLayer: "vanilla",
        resolveStrRef: () => undefined,
      });
    } catch (error) {
      logger.warn(
        `Effective Creature soundset.2da vanilla lookup failed closed (${keyPath}): ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }
  return null;
}

async function readRuntimeEffectiveCreatureStartingPackagesTwoDaFromVanilla(
  vanillaRoot: string,
  logger: Logger,
): Promise<EffectiveCreatureStartingPackagesTwoDaTable | null> {
  for (const keyFileName of VANILLA_KEY_FILE_CANDIDATES) {
    const keyPath = resolve(vanillaRoot, keyFileName);
    let reader: NwnKeyBifResourceReader;
    try {
      reader = await NwnKeyBifResourceReader.open(keyPath, vanillaRoot);
    } catch {
      continue;
    }
    try {
      const bytes = await reader.read("packages", NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA);
      if (!bytes) continue;
      const sourceObjectKey = `runtime-source/vanilla/${keyFileName}/packages.2da`;
      // A present malformed first-hit resource blocks weaker KEY fallback.
      return parseEffectiveCreatureStartingPackagesTwoDa({
        bytes,
        sourceObjectKey,
        sourceLayer: "vanilla",
        resolveStrRef: () => undefined,
      });
    } catch (error) {
      logger.warn(
        `Effective Creature packages.2da vanilla lookup failed closed (${keyPath}): ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }
  return null;
}

async function readRuntimeEffectiveCreatureClassesTwoDaFromVanilla(
  vanillaRoot: string,
  logger: Logger,
): Promise<EffectiveCreatureClassesTwoDaTable | null> {
  for (const keyFileName of VANILLA_KEY_FILE_CANDIDATES) {
    const keyPath = resolve(vanillaRoot, keyFileName);
    let reader: NwnKeyBifResourceReader;
    try {
      reader = await NwnKeyBifResourceReader.open(keyPath, vanillaRoot);
    } catch {
      continue;
    }
    try {
      const bytes = await reader.read("classes", NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA);
      if (!bytes) continue;
      const sourceObjectKey = `runtime-source/vanilla/${keyFileName}/classes.2da`;
      return parseEffectiveCreatureClassesTwoDa({
        bytes,
        sourceObjectKey,
        sourceLayer: "vanilla",
        resolveStrRef: () => undefined,
      });
    } catch (error) {
      logger.warn(
        `Effective Creature classes.2da vanilla lookup failed closed (${keyPath}): ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }
  return null;
}

async function readRuntimeEffectiveCreatureSkillsTwoDaFromVanilla(
  vanillaRoot: string,
  logger: Logger,
): Promise<EffectiveCreatureSkillsTwoDaTable | null> {
  for (const keyFileName of VANILLA_KEY_FILE_CANDIDATES) {
    const keyPath = resolve(vanillaRoot, keyFileName);
    let reader: NwnKeyBifResourceReader;
    try {
      reader = await NwnKeyBifResourceReader.open(keyPath, vanillaRoot);
    } catch {
      continue;
    }
    try {
      const bytes = await reader.read("skills", NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA);
      if (!bytes) continue;
      const sourceObjectKey = `runtime-source/vanilla/${keyFileName}/skills.2da`;
      // A present malformed first-hit resource blocks weaker KEY fallback.
      return parseEffectiveCreatureSkillsTwoDa({
        bytes,
        sourceObjectKey,
        sourceLayer: "vanilla",
        resolveStrRef: () => undefined,
      });
    } catch (error) {
      logger.warn(
        `Effective Creature skills.2da vanilla lookup failed closed (${keyPath}): ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }
  return null;
}

async function readRuntimeEffectiveCreatureFeatsTwoDaFromVanilla(
  vanillaRoot: string,
  logger: Logger,
): Promise<EffectiveCreatureFeatsTwoDaTable | null> {
  for (const keyFileName of VANILLA_KEY_FILE_CANDIDATES) {
    const keyPath = resolve(vanillaRoot, keyFileName);
    let reader: NwnKeyBifResourceReader;
    try {
      reader = await NwnKeyBifResourceReader.open(keyPath, vanillaRoot);
    } catch {
      continue;
    }
    try {
      const bytes = await reader.read("feat", NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA);
      if (!bytes) continue;
      const sourceObjectKey = `runtime-source/vanilla/${keyFileName}/feat.2da`;
      // A present malformed first-hit resource blocks weaker KEY fallback.
      return parseEffectiveCreatureFeatsTwoDa({
        bytes,
        sourceObjectKey,
        sourceLayer: "vanilla",
        resolveStrRef: () => undefined,
      });
    } catch (error) {
      logger.warn(
        `Effective Creature feat.2da vanilla lookup failed closed (${keyPath}): ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }
  return null;
}

async function readRuntimeEffectiveCreatureSpecialAbilitiesTwoDaFromVanilla(
  vanillaRoot: string,
  logger: Logger,
): Promise<EffectiveCreatureSpecialAbilitiesTwoDaTable | null> {
  for (const keyFileName of VANILLA_KEY_FILE_CANDIDATES) {
    const keyPath = resolve(vanillaRoot, keyFileName);
    let reader: NwnKeyBifResourceReader;
    try {
      reader = await NwnKeyBifResourceReader.open(keyPath, vanillaRoot);
    } catch {
      continue;
    }
    try {
      const bytes = await reader.read("spells", NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA);
      if (!bytes) continue;
      const sourceObjectKey = `runtime-source/vanilla/${keyFileName}/spells.2da`;
      // A present malformed first-hit resource blocks weaker KEY fallback.
      return parseEffectiveCreatureSpecialAbilitiesTwoDa({
        bytes,
        sourceObjectKey,
        sourceLayer: "vanilla",
        resolveStrRef: () => undefined,
      });
    } catch (error) {
      logger.warn(
        `Effective Creature spells.2da vanilla lookup failed closed (${keyPath}): ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }
  return null;
}

async function readRuntimeEffectiveCreaturePhenotypeTwoDaSourceFromVanilla(
  vanillaRoot: string,
  logger: Logger,
): Promise<LoadedEffectiveCreaturePhenotypeTwoDaSource | null> {
  for (const keyFileName of VANILLA_KEY_FILE_CANDIDATES) {
    const keyPath = resolve(vanillaRoot, keyFileName);
    let reader: NwnKeyBifResourceReader;
    try {
      reader = await NwnKeyBifResourceReader.open(keyPath, vanillaRoot);
    } catch {
      continue;
    }
    try {
      const bytes = await reader.read("phenotype", NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA);
      if (!bytes) continue;
      const sourceKey = `runtime-source/vanilla/${keyFileName}/phenotype.2da`;
      // A present malformed first-hit resource blocks weaker KEY fallback.
      return buildEffectiveCreaturePhenotypeTwoDaSource(bytes, sourceKey, "vanilla");
    } catch (error) {
      logger.warn(
        `Effective creature phenotype.2da vanilla lookup failed closed (${keyPath}): ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }
  return null;
}

async function readRuntimeCreaturePartTwoDaSourceFromVanilla(
  vanillaRoot: string,
  logger: Logger
): Promise<LoadedCreaturePartTwoDaSource | null> {
  for (const keyFileName of VANILLA_KEY_FILE_CANDIDATES) {
    const keyPath = resolve(vanillaRoot, keyFileName);
    let reader: NwnKeyBifResourceReader;
    try {
      reader = await NwnKeyBifResourceReader.open(keyPath, vanillaRoot);
    } catch {
      continue;
    }

    try {
      const bytes = await reader.read("capart", NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA);
      if (!bytes) {
        continue;
      }
      const sourceKey = `runtime-source/vanilla/${keyFileName}/capart.2da`;
      const source = buildCreaturePartTwoDaSourceFromRuntimeSource(bytes, sourceKey);
      if (source.rows.length > 0) {
        return source;
      }
    } catch (error) {
      logger.warn(
        `Skipping runtime vanilla creature capart.2da source because read failed (${keyPath}): ${formatSnapshotIndexError(error)}`
      );
    }
  }
  return null;
}

async function readRuntimeCreatureAccessoryModelTwoDaSourceFromVanilla(
  vanillaRoot: string,
  tableFileName: "wingmodel.2da" | "tailmodel.2da",
  sourceKind: CreatureAccessoryModelSource,
  logger: Logger
): Promise<LoadedCreatureAccessoryModelTwoDaSource | null> {
  const resref = extractBasename(tableFileName);
  for (const keyFileName of VANILLA_KEY_FILE_CANDIDATES) {
    const keyPath = resolve(vanillaRoot, keyFileName);
    let reader: NwnKeyBifResourceReader;
    try {
      reader = await NwnKeyBifResourceReader.open(keyPath, vanillaRoot);
    } catch {
      continue;
    }

    try {
      const bytes = await reader.read(resref, NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA);
      if (!bytes) {
        continue;
      }
      const sourceKey = `runtime-source/vanilla/${keyFileName}/${tableFileName}`;
      const source = buildCreatureAccessoryModelTwoDaSourceFromRuntimeSource(
        bytes,
        tableFileName,
        sourceKind,
        sourceKey
      );
      if (source.rows.length > 0) {
        return source;
      }
    } catch (error) {
      logger.warn(
        `Skipping runtime vanilla creature ${tableFileName} source because read failed (${keyPath}): ${formatSnapshotIndexError(error)}`
      );
    }
  }
  return null;
}

async function readRuntimeDoorTemplateGenericTypeFromVanilla(
  vanillaRoot: string,
  resref: string,
  logger: Logger
): Promise<number | null> {
  for (const keyFileName of VANILLA_KEY_FILE_CANDIDATES) {
    const keyPath = resolve(vanillaRoot, keyFileName);
    let reader: NwnKeyBifResourceReader;
    try {
      reader = await NwnKeyBifResourceReader.open(keyPath, vanillaRoot);
    } catch {
      continue;
    }

    try {
      const bytes = await reader.read(resref, NWN_UTD_RESOURCE_TYPE);
      const genericType = readDoorTemplateGenericType(bytes);
      if (genericType !== null) {
        return genericType;
      }
    } catch (error) {
      logger.warn(
        `Skipping runtime vanilla door UTD source because read failed (${keyPath}, ${resref}.utd): ${formatSnapshotIndexError(error)}`
      );
    }
  }
  return null;
}

function buildCreatureAppearanceTwoDaSourceFromRuntimeSource(
  bytes: Buffer,
  sourceKey: string,
  sourceLayer: EffectiveCreatureAppearanceTwoDaSourceLayer,
): LoadedCreatureAppearanceTwoDaSource | null {
  const descriptor = buildEffectiveCreatureAppearanceTwoDaDescriptor({
    bytes,
    sourceObjectKey: sourceKey,
    sourceLayer,
  });
  if (!descriptor) {
    return null;
  }
  const appearanceRows = parseEffectiveCreatureAppearanceTwoDaRows(bytes);
  if (!appearanceRows) {
    return null;
  }
  return {
    key: sourceKey,
    sourceSize: bytes.length,
    updatedAt: new Date(0).toISOString(),
    rows: parseCreatureAppearanceTwoDaRows(bytes, { sourceKey }),
    descriptor,
    appearanceRows,
  };
}

function buildEffectiveCreatureGenderTwoDaSource(
  bytes: Buffer,
  sourceKey: string,
  sourceLayer: EffectiveCreatureGenderTwoDaSourceLayer,
): LoadedEffectiveCreatureGenderTwoDaSource | null {
  const descriptor = buildEffectiveCreatureGenderTwoDaDescriptor({
    bytes,
    sourceObjectKey: sourceKey,
    sourceLayer,
  });
  if (!descriptor) return null;
  const rows = parseEffectiveCreatureGenderTwoDaRows(bytes);
  return rows ? { key: sourceKey, descriptor, rows } : null;
}

function buildEffectiveCreatureAppendageTwoDaSource(
  bytes: Buffer,
  resourceName: EffectiveCreatureAppendageTwoDaResourceName,
  sourceKey: string,
  sourceLayer: EffectiveCreatureAppendageTwoDaSourceLayer,
): LoadedEffectiveCreatureAppendageTwoDaSource | null {
  const descriptor = buildEffectiveCreatureAppendageTwoDaDescriptor({
    bytes,
    resourceName,
    sourceObjectKey: sourceKey,
    sourceLayer,
  });
  if (!descriptor) return null;
  const rows = parseEffectiveCreatureAppendageTwoDaRows(bytes, resourceName);
  return rows ? { key: sourceKey, descriptor, rows } : null;
}

function buildEffectiveCreaturePhenotypeTwoDaSource(
  bytes: Buffer,
  sourceKey: string,
  sourceLayer: EffectiveCreaturePhenotypeTwoDaSourceLayer,
): LoadedEffectiveCreaturePhenotypeTwoDaSource | null {
  const descriptor = buildEffectiveCreaturePhenotypeTwoDaDescriptor({
    bytes,
    sourceObjectKey: sourceKey,
    sourceLayer,
  });
  if (!descriptor) return null;
  const rows = parseEffectiveCreaturePhenotypeTwoDaRows(bytes);
  return rows ? { key: sourceKey, descriptor, rows } : null;
}

function buildCreaturePartTwoDaSourceFromRuntimeSource(
  bytes: Buffer,
  sourceKey: string
): LoadedCreaturePartTwoDaSource {
  return {
    key: sourceKey,
    sourceSize: bytes.length,
    updatedAt: new Date(0).toISOString(),
    rows: parseCreaturePartTwoDaRows(bytes, { sourceKey })
  };
}

function buildCreatureAccessoryModelTwoDaSourceFromRuntimeSource(
  bytes: Buffer,
  tableFileName: "wingmodel.2da" | "tailmodel.2da",
  source: CreatureAccessoryModelSource,
  sourceKey: string
): LoadedCreatureAccessoryModelTwoDaSource {
  return {
    key: sourceKey,
    sourceSize: bytes.length,
    updatedAt: new Date(0).toISOString(),
    source,
    rows: parseCreatureAccessoryModelTwoDaRows(bytes, tableFileName, { sourceKey })
  };
}

function readDoorTemplateGenericType(bytes: Buffer | null): number | null {
  if (!bytes) {
    return null;
  }
  const parsed = parseTemplateBlueprintFromGff(bytes);
  const genericType = parsed?.genericType;
  return Number.isInteger(genericType ?? Number.NaN) && genericType !== undefined
    ? Math.trunc(genericType)
    : null;
}

function buildDoorTwoDaRowsFromRuntimeSource(
  bytes: Buffer,
  tableName: DoorTwoDaTableName,
  sourceKey: string
): DoorTwoDaRow[] {
  const parsedRows = parseDoorTwoDaRows(bytes, tableName, { sourceKey });
  const updatedAt = new Date(0).toISOString();
  return parsedRows.map((row) => ({
    ...row,
    sourceKey,
    sourceSize: bytes.length,
    updatedAt,
    sourceFingerprint: buildSourceFingerprint([
      "2da",
      "door",
      "runtime-source",
      tableName,
      sourceKey,
      String(row.rowId),
      row.label ?? "",
      row.modelResRef ?? ""
    ])
  }));
}

function buildRuntimeHakDoorTwoDaSourceKey(
  hakPath: string,
  tableName: DoorTwoDaTableName
): string {
  const fileName = extractFileName(hakPath);
  const hakName = extractBasename(fileName);
  return `runtime-source/hak/${sanitizeRuntimeSourceSegment(hakName)}/${tableName}`;
}

function buildRuntimeHakCreatureTwoDaSourceKey(hakPath: string, tableName: string): string {
  const fileName = extractFileName(hakPath);
  const hakName = extractBasename(fileName);
  return `runtime-source/hak/${sanitizeRuntimeSourceSegment(hakName)}/${tableName}`;
}

function listLocalRetailStoreTemplateSources(): Promise<LocalRetailStoreTemplateSource[]> {
  localRetailStoreTemplateSourcesCache ??= readLocalRetailStoreTemplateSources();
  return localRetailStoreTemplateSourcesCache;
}

async function readLocalRetailStoreTemplateSources(): Promise<LocalRetailStoreTemplateSource[]> {
  let entries: Array<Dirent<string>>;
  try {
    entries = await readdir(LOCAL_ITEM_RETAIL_UTM_DIR, { withFileTypes: true });
  } catch {
    return [];
  }

  const files = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".utm"))
    .map((entry) => {
      const fileName = entry.name;
      const resref = normalizeResref(extractBasename(fileName));
      const fullPath = `${LOCAL_ITEM_RETAIL_UTM_DIR}\\${fileName}`;
      return { fileName, resref, fullPath };
    })
    .filter((entry) => entry.resref.length > 0)
    .sort((left, right) => left.resref.localeCompare(right.resref));

  const loaded = await Promise.all(
    files.map(async (file): Promise<LocalRetailStoreTemplateSource | null> => {
      try {
        const bytes = await readFile(file.fullPath);
        return {
          ...file,
          bytes
        };
      } catch {
        return null;
      }
    })
  );

  return loaded.filter(
    (source): source is LocalRetailStoreTemplateSource => Boolean(source)
  );
}

function sanitizeRuntimeSourceSegment(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/gu, "_");
  return normalized || "unknown";
}

function deduplicateRuntimeSourcePaths(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(normalized);
  }
  return output;
}

function dedupeDoorTemplateResRefs(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const normalized = normalizeLookupRef(value);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    output.push(normalized);
  }
  return output;
}

function mapCandidateToTemplateRecord(
  candidate: TemplateCandidate,
  benchmarkIds: Record<TemplateKind, Set<string>>,
  placeableAppearanceModelLookup: ReadonlyMap<number, PlaceableAppearanceModelLookupEntry>,
  creatureWalkRateLookup: ReadonlyMap<number, CreatureWalkRateLookupEntry>,
  creatureAppearanceLabelLookup: ReadonlyMap<number, CreatureAppearanceLabelLookupEntry>,
  creatureClassLabelLookup: ReadonlyMap<number, CreatureClassLabelLookupEntry>,
  creatureRaceLabelLookup: ReadonlyMap<number, CreatureRaceLabelLookupEntry>,
  creatureGenderLabelLookup: ReadonlyMap<number, CreatureGenderLabelLookupEntry>,
  creaturePhenotypeLabelLookup: ReadonlyMap<number, CreaturePhenotypeLabelLookupEntry>,
  creaturePartModelLookup: ReadonlyMap<number, CreaturePartModelLookupEntry>,
  creatureWingModelLookup: ReadonlyMap<number, CreatureAccessoryModelLookupEntry>,
  creatureTailModelLookup: ReadonlyMap<number, CreatureAccessoryModelLookupEntry>,
  creatureSizeLabelLookup: ReadonlyMap<number, CreatureSizeLabelLookupEntry>,
  creaturePortraitLookup: ReadonlyMap<number, CreaturePortraitLookupEntry>,
  creatureSoundSetLookup: ReadonlyMap<number, CreatureSoundSetLookupEntry>,
  creatureSkillLabelLookup: ReadonlyMap<number, CreatureSkillLabelLookupEntry>,
  creatureFeatLabelLookup: ReadonlyMap<number, CreatureFeatLabelLookupEntry>,
  creatureSpellLabelLookup: ReadonlyMap<number, CreatureSpellLabelLookupEntry>,
  templateTalkTableLookup: TemplateTalkTableLookup,
  itemTemplateReferenceLookup: ReadonlyMap<string, ItemTemplateReferenceLookupEntry>,
  itemBaseItemLookup: ReadonlyMap<number, ItemBaseItemLookupEntry>,
  itemPropertyDefinitionLookup: ReadonlyMap<number, ItemPropertyDefinitionLookupEntry>,
  doorTwoDaLookup: DoorTwoDaLookup
): TemplateRecord {
  candidate = resolveCandidateTalkTableFields(candidate, templateTalkTableLookup);
  const resolvedResref = resolveCandidateResref(candidate);
  const placeableSubtype =
    candidate.kind === "placeable" ? inferPlaceableSubtype(candidate) : undefined;

  const metadata: Record<string, string | number | boolean> = {
    sourceObjectKey: candidate.sourceKey,
    sourceSizeBytes: candidate.sourceSize,
    sourceExtension: candidate.extension,
    sourceFingerprint: candidate.sourceFingerprint
  };
  addOptionalMetadata(metadata, "sourceSha256", candidate.sourceSha256);
  const inventoryItemListEntries = enrichCreatureItemReferenceEntries(
    candidate.parsedBlueprint?.inventoryItemListEntries,
    itemTemplateReferenceLookup,
    itemBaseItemLookup
  );
  const equipItemListEntries = enrichCreatureItemReferenceEntries(
    candidate.parsedBlueprint?.equipItemListEntries,
    itemTemplateReferenceLookup,
    itemBaseItemLookup
  );
  const classListEntries = enrichCreatureClassEntries(
    candidate.parsedBlueprint?.classListEntries,
    creatureClassLabelLookup,
    creatureSpellLabelLookup
  );
  const skillListEntries = enrichCreatureSkillEntries(
    candidate.parsedBlueprint?.skillListEntries,
    creatureSkillLabelLookup
  );
  const featListEntries = enrichCreatureFeatEntries(
    candidate.parsedBlueprint?.featListEntries,
    creatureFeatLabelLookup
  );
  const specAbilityListEntries = enrichCreatureSpellReferenceEntries(
    candidate.parsedBlueprint?.specAbilityListEntries,
    creatureSpellLabelLookup
  );
  const isCreatureCandidate = candidate.kind === "creature";
  const appearanceLabelLookup = isCreatureCandidate
    ? buildCreatureAppearanceLabelLookupHints(candidate, creatureAppearanceLabelLookup)
    : undefined;
  const raceLabelLookup = isCreatureCandidate
    ? buildCreatureRaceLabelLookupHints(candidate, creatureRaceLabelLookup)
    : undefined;
  const genderLabelLookup = isCreatureCandidate
    ? buildCreatureGenderLabelLookupHints(candidate, creatureGenderLabelLookup)
    : undefined;
  const phenotypeLabelLookup = isCreatureCandidate
    ? buildCreaturePhenotypeLabelLookupHints(candidate, creaturePhenotypeLabelLookup)
    : undefined;
  const partModelCandidates = isCreatureCandidate
    ? buildCreaturePartModelCandidateHints(
        candidate,
        creaturePartModelLookup,
        creatureWingModelLookup,
        creatureTailModelLookup,
        appearanceLabelLookup,
        genderLabelLookup,
        phenotypeLabelLookup
      )
    : [];
  const sizeLabelLookup = isCreatureCandidate
    ? buildCreatureSizeLabelLookupHints(appearanceLabelLookup, creatureSizeLabelLookup)
    : undefined;
  const portraitLookup = isCreatureCandidate
    ? buildCreaturePortraitLookupHints(candidate, creaturePortraitLookup)
    : undefined;
  const soundSetLookup = isCreatureCandidate
    ? buildCreatureSoundSetLookupHints(candidate, creatureSoundSetLookup)
    : undefined;
  const baseItemLookup = buildItemBaseItemLookupHints(candidate, itemBaseItemLookup);
  const itemPropertyListEntries = enrichItemPropertyListEntries(
    candidate.parsedBlueprint?.itemPropertyListEntries,
    itemPropertyDefinitionLookup
  );

  addOptionalMetadata(metadata, "sourceEtag", candidate.sourceEtag);
  addOptionalMetadata(metadata, "sourceFileType", candidate.parsedBlueprint?.sourceFileType);
  addOptionalMetadata(metadata, "sourceFileVersion", candidate.parsedBlueprint?.sourceFileVersion);
  addOptionalMetadata(
    metadata,
    "sourceStructTypeId",
    candidate.parsedBlueprint?.sourceStructTypeId
  );
  addOptionalMetadata(metadata, "templateResRef", candidate.parsedBlueprint?.templateResRef);
  addOptionalMetadata(metadata, "firstName", candidate.parsedBlueprint?.firstName);
  addOptionalMetadata(metadata, "firstNameStrRef", candidate.parsedBlueprint?.firstNameStrRef);
  addOptionalMetadata(metadata, "lastName", candidate.parsedBlueprint?.lastName);
  addOptionalMetadata(metadata, "lastNameStrRef", candidate.parsedBlueprint?.lastNameStrRef);
  addOptionalMetadata(metadata, "localizedName", candidate.parsedBlueprint?.localizedName);
  addOptionalMetadata(
    metadata,
    "localizedNameStrRef",
    candidate.parsedBlueprint?.localizedNameStrRef
  );
  addOptionalMetadata(metadata, "displayName", candidate.parsedBlueprint?.displayName);
  addOptionalMetadata(metadata, "description", candidate.parsedBlueprint?.description);
  addOptionalMetadata(metadata, "descriptionStrRef", candidate.parsedBlueprint?.descriptionStrRef);
  addOptionalMetadata(
    metadata,
    "identifiedDescription",
    candidate.parsedBlueprint?.identifiedDescription
  );
  addOptionalMetadata(
    metadata,
    "identifiedDescriptionStrRef",
    candidate.parsedBlueprint?.identifiedDescriptionStrRef
  );
  addOptionalMetadata(metadata, "comments", candidate.parsedBlueprint?.comments);
  addOptionalMetadata(metadata, "paletteId", candidate.parsedBlueprint?.paletteId);
  addOptionalMetadata(metadata, "tag", candidate.parsedBlueprint?.tag);
  addOptionalMetadata(metadata, "conversation", candidate.parsedBlueprint?.conversation);
  addOptionalMetadata(metadata, "keyName", candidate.parsedBlueprint?.keyName);
  addOptionalMetadata(metadata, "plot", candidate.parsedBlueprint?.plot);
  addOptionalMetadata(metadata, "active", candidate.parsedBlueprint?.active);
  addOptionalMetadata(metadata, "difficulty", candidate.parsedBlueprint?.difficulty);
  addOptionalMetadata(
    metadata,
    "difficultyIndex",
    candidate.parsedBlueprint?.difficultyIndex
  );
  addOptionalMetadata(metadata, "playerOnly", candidate.parsedBlueprint?.playerOnly);
  addOptionalMetadata(metadata, "reset", candidate.parsedBlueprint?.reset);
  addOptionalMetadata(metadata, "resetTime", candidate.parsedBlueprint?.resetTime);
  addOptionalMetadata(metadata, "respawns", candidate.parsedBlueprint?.respawns);
  addOptionalMetadata(metadata, "spawnOption", candidate.parsedBlueprint?.spawnOption);
  addOptionalMetadata(metadata, "maxCreatures", candidate.parsedBlueprint?.maxCreatures);
  addOptionalMetadata(metadata, "recCreatures", candidate.parsedBlueprint?.recCreatures);
  addOptionalMetadata(metadata, "baseItem", candidate.parsedBlueprint?.baseItem);
  addItemBaseItemLookupMetadata(metadata, baseItemLookup);
  addOptionalMetadata(metadata, "modelPart1", candidate.parsedBlueprint?.modelPart1);
  addOptionalMetadata(metadata, "modelPart2", candidate.parsedBlueprint?.modelPart2);
  addOptionalMetadata(metadata, "modelPart3", candidate.parsedBlueprint?.modelPart3);
  addOptionalMetadata(metadata, "cost", candidate.parsedBlueprint?.cost);
  addOptionalMetadata(metadata, "addCost", candidate.parsedBlueprint?.addCost);
  addOptionalMetadata(metadata, "costTable", candidate.parsedBlueprint?.costTable);
  addOptionalMetadata(metadata, "costValue", candidate.parsedBlueprint?.costValue);
  addOptionalMetadata(metadata, "charges", candidate.parsedBlueprint?.charges);
  addOptionalMetadata(metadata, "stackSize", candidate.parsedBlueprint?.stackSize);
  addOptionalMetadata(metadata, "identified", candidate.parsedBlueprint?.identified);
  addOptionalMetadata(metadata, "stolen", candidate.parsedBlueprint?.stolen);
  addOptionalMetadata(metadata, "cursed", candidate.parsedBlueprint?.cursed);
  addOptionalMetadata(metadata, "modelResRef", candidate.parsedBlueprint?.modelResRef);
  addOptionalMetadata(
    metadata,
    "dependencyFingerprint",
    candidate.parsedBlueprint?.dependencyFingerprint
  );
  addOptionalMetadata(
    metadata,
    "dependencyCount",
    candidate.parsedBlueprint?.dependencyRefs.length
  );
  addOptionalMetadata(metadata, "sourceKind", candidate.placeables2daRow ? "2da" : undefined);
  addOptionalMetadata(metadata, "source2da", candidate.placeables2daRow ? "placeables.2da" : undefined);
  addOptionalMetadata(metadata, "source2daRow", candidate.placeables2daRow?.rowId);
  addOptionalMetadata(metadata, "source2daLabel", candidate.placeables2daRow?.label);
  addOptionalMetadata(
    metadata,
    "source2daLightColorRaw",
    candidate.placeables2daRow?.lightColorRaw
  );
  addOptionalMetadata(
    metadata,
    "source2daLightColorRow",
    candidate.placeables2daRow?.lightColorRowId
  );
  addOptionalMetadata(
    metadata,
    "source2daLightColorLabel",
    candidate.placeables2daRow?.lightColorLabel
  );
  addOptionalMetadata(
    metadata,
    "source2daLightColorSourceKey",
    candidate.placeables2daRow?.lightColorSourceKey
  );
  addOptionalMetadata(metadata, "source2daLightRed", candidate.placeables2daRow?.lightColorRed);
  addOptionalMetadata(
    metadata,
    "source2daLightGreen",
    candidate.placeables2daRow?.lightColorGreen
  );
  addOptionalMetadata(metadata, "source2daLightBlue", candidate.placeables2daRow?.lightColorBlue);
  addOptionalMetadata(
    metadata,
    "source2daToolsetRed",
    candidate.placeables2daRow?.lightColorToolsetRed
  );
  addOptionalMetadata(
    metadata,
    "source2daToolsetGreen",
    candidate.placeables2daRow?.lightColorToolsetGreen
  );
  addOptionalMetadata(
    metadata,
    "source2daToolsetBlue",
    candidate.placeables2daRow?.lightColorToolsetBlue
  );
  addOptionalMetadata(
    metadata,
    "source2daLightOffsetX",
    candidate.placeables2daRow?.lightOffsetX
  );
  addOptionalMetadata(
    metadata,
    "source2daLightOffsetY",
    candidate.placeables2daRow?.lightOffsetY
  );
  addOptionalMetadata(
    metadata,
    "source2daLightOffsetZ",
    candidate.placeables2daRow?.lightOffsetZ
  );
  addOptionalMetadata(metadata, "source2daShadowSize", candidate.placeables2daRow?.shadowSize);
  addOptionalMetadata(metadata, "source2daStatic", candidate.placeables2daRow?.isStatic);
  if (isReservedPlaceablesTwoDaPlaceholder(candidate)) {
    addOptionalMetadata(metadata, "nonRenderablePlaceholder", true);
    addOptionalMetadata(metadata, "placeholderKind", "reserved_placeables_2da_row");
    addOptionalMetadata(metadata, "renderAuditEligibility", "non_renderable_placeholder");
    addOptionalMetadata(metadata, "renderAuditExcludeReason", "reserved_placeables_2da_model");
    addOptionalMetadata(metadata, "reservedModelResRef", candidate.placeables2daRow?.modelResRef);
  }
  if (candidate.kind === "placeable") {
    const lookupHints = buildPlaceableLookupHints(
      candidate,
      resolvedResref,
      placeableAppearanceModelLookup
    );
    addOptionalMetadata(metadata, "lookupTemplateResRef", lookupHints.templateResRef);
    addOptionalMetadata(metadata, "lookupModelResRef", lookupHints.modelResRef);
    addOptionalMetadata(metadata, "lookupModelSource2daRow", lookupHints.modelSource2daRow);
    addOptionalMetadata(
      metadata,
      "lookupRequestedAppearanceType",
      lookupHints.requestedAppearanceType
    );
    addOptionalMetadata(metadata, "lookupResolutionPath", lookupHints.resolutionPath);
    addOptionalMetadata(metadata, "lookupDependencyRefs", lookupHints.dependencyRefs);
    addOptionalMetadata(metadata, "lookupDependencyCount", lookupHints.dependencyCount);
  }
  if (candidate.kind === "placeable" && placeableSubtype === "door") {
    const doorLookupHints = buildDoorTwoDaLookupHints(candidate, doorTwoDaLookup);
    addOptionalMetadata(
      metadata,
      "doorLookupPath",
      "templateAppearanceGenericType>doortypes2da>genericdoors2da>modelAsset"
    );
    addOptionalMetadata(metadata, "doorLookupAppearanceId", doorLookupHints.appearanceId);
    addOptionalMetadata(metadata, "doorLookupGenericType", doorLookupHints.genericType);
    addOptionalMetadata(metadata, "doortypes2daAvailable", doorLookupHints.doortypesAvailable);
    addOptionalMetadata(metadata, "genericdoors2daAvailable", doorLookupHints.genericdoorsAvailable);
    addOptionalMetadata(
      metadata,
      "doortypes2daSource",
      doorLookupHints.doortypesSourceKey ? "doortypes.2da" : undefined
    );
    addOptionalMetadata(metadata, "doortypes2daSourceKey", doorLookupHints.doortypesSourceKey);
    addOptionalMetadata(metadata, "doortypes2daRow", doorLookupHints.doortypesRowId);
    addOptionalMetadata(metadata, "doortypes2daLabel", doorLookupHints.doortypesLabel);
    addOptionalMetadata(metadata, "doortypes2daModelResRef", doorLookupHints.doortypesModelResRef);
    addOptionalMetadata(
      metadata,
      "genericdoors2daSource",
      doorLookupHints.genericdoorsSourceKey ? "genericdoors.2da" : undefined
    );
    addOptionalMetadata(metadata, "genericdoors2daSourceKey", doorLookupHints.genericdoorsSourceKey);
    addOptionalMetadata(metadata, "genericdoors2daRow", doorLookupHints.genericdoorsRowId);
    addOptionalMetadata(metadata, "genericdoors2daLabel", doorLookupHints.genericdoorsLabel);
    addOptionalMetadata(
      metadata,
      "genericdoors2daModelResRef",
      doorLookupHints.genericdoorsModelResRef
    );
    addOptionalMetadata(metadata, "doorLookupModelResRef", doorLookupHints.modelResRef);
  }
  if (candidate.kind === "creature") {
    const walkRateLookup = buildCreatureWalkRateLookupHints(candidate, creatureWalkRateLookup);
    addOptionalMetadata(
      metadata,
      "walkRateLookupPath",
      walkRateLookup
        ? "templateAppearanceType>appearance2da.MOVERATE>creaturespeed2da.2DAName"
        : undefined
    );
    addOptionalMetadata(metadata, "walkRateEffective", walkRateLookup?.walkRate);
    addOptionalMetadata(metadata, "walkRateSource2daRow", walkRateLookup?.appearanceRowId);
    addOptionalMetadata(metadata, "walkRateSource2daName", walkRateLookup?.moveRateName);
    addOptionalMetadata(metadata, "walkRateSpeed2daRow", walkRateLookup?.speedRowId);
    addOptionalMetadata(
      metadata,
      "walkRateAppearance2daSourceKey",
      walkRateLookup?.appearanceSourceKey
    );
    addOptionalMetadata(
      metadata,
      "walkRateSpeed2daSourceKey",
      walkRateLookup?.speedSourceKey
    );
  }
  addOptionalMetadata(
    metadata,
    "appearanceId",
    candidate.parsedBlueprint?.appearanceId ?? candidate.placeables2daRow?.rowId
  );
  addOptionalMetadata(metadata, "appearanceLabel", appearanceLabelLookup?.appearanceLabel);
  addOptionalMetadata(
    metadata,
    "appearanceLabelSource2daRow",
    appearanceLabelLookup?.appearanceRowId
  );
  addOptionalMetadata(
    metadata,
    "appearanceLabelSourceKey",
    appearanceLabelLookup?.appearanceSourceKey
  );
  addOptionalMetadata(metadata, "appearanceModelType", appearanceLabelLookup?.modelType);
  addOptionalMetadata(metadata, "appearanceRaceModel", appearanceLabelLookup?.raceModel);
  addOptionalMetadata(metadata, "appearancePortrait2da", appearanceLabelLookup?.portrait2da);
  addOptionalMetadata(metadata, "appearanceEnvMap", appearanceLabelLookup?.envMap);
  addOptionalMetadata(
    metadata,
    "appearanceDefaultPhenotype",
    appearanceLabelLookup?.defaultPhenotype
  );
  addOptionalMetadata(metadata, "appearanceBloodColor", appearanceLabelLookup?.bloodColor);
  addOptionalMetadata(metadata, "appearanceWeaponScale", appearanceLabelLookup?.weaponScale);
  addOptionalMetadata(metadata, "appearanceSizeCategory", appearanceLabelLookup?.sizeCategory);
  addOptionalMetadata(metadata, "appearanceSizeCategoryLabel", sizeLabelLookup?.sizeLabel);
  addOptionalMetadata(
    metadata,
    "appearanceSizeCategorySource2daRow",
    sizeLabelLookup?.sizeRowId
  );
  addOptionalMetadata(
    metadata,
    "appearanceSizeCategorySourceKey",
    sizeLabelLookup?.sizeSourceKey
  );
  addOptionalMetadata(metadata, "genericType", candidate.parsedBlueprint?.genericType);
  addOptionalMetadata(metadata, "animationState", candidate.parsedBlueprint?.animationState);
  addOptionalMetadata(metadata, "hasInventory", candidate.parsedBlueprint?.hasInventory);
  addOptionalMetadata(metadata, "bodyBag", candidate.parsedBlueprint?.bodyBag);
  addOptionalMetadata(metadata, "isPc", candidate.parsedBlueprint?.isPc);
  addOptionalMetadata(metadata, "isImmortal", candidate.parsedBlueprint?.isImmortal);
  addOptionalMetadata(metadata, "lootable", candidate.parsedBlueprint?.lootable);
  addOptionalMetadata(metadata, "noPermDeath", candidate.parsedBlueprint?.noPermDeath);
  addOptionalMetadata(metadata, "useable", candidate.parsedBlueprint?.useable);
  addOptionalMetadata(metadata, "isStatic", candidate.parsedBlueprint?.isStatic);
  addOptionalMetadata(metadata, "autoRemoveKey", candidate.parsedBlueprint?.autoRemoveKey);
  addOptionalMetadata(metadata, "decayTime", candidate.parsedBlueprint?.decayTime);
  addOptionalMetadata(
    metadata,
    "startingPackage",
    candidate.parsedBlueprint?.startingPackage
  );
  addOptionalMetadata(metadata, "closeLockDc", candidate.parsedBlueprint?.closeLockDc);
  addOptionalMetadata(metadata, "openLockDc", candidate.parsedBlueprint?.openLockDc);
  addOptionalMetadata(metadata, "interruptable", candidate.parsedBlueprint?.interruptable);
  addOptionalMetadata(metadata, "invulnerable", candidate.parsedBlueprint?.invulnerable);
  addOptionalMetadata(metadata, "keyRequired", candidate.parsedBlueprint?.keyRequired);
  addOptionalMetadata(metadata, "lockable", candidate.parsedBlueprint?.lockable);
  addOptionalMetadata(metadata, "locked", candidate.parsedBlueprint?.locked);
  addOptionalMetadata(metadata, "trapDetectable", candidate.parsedBlueprint?.trapDetectable);
  addOptionalMetadata(metadata, "trapDetectDc", candidate.parsedBlueprint?.trapDetectDc);
  addOptionalMetadata(metadata, "trapDisarmable", candidate.parsedBlueprint?.trapDisarmable);
  addOptionalMetadata(metadata, "disarmDc", candidate.parsedBlueprint?.disarmDc);
  addOptionalMetadata(metadata, "trapFlag", candidate.parsedBlueprint?.trapFlag);
  addOptionalMetadata(metadata, "trapOneShot", candidate.parsedBlueprint?.trapOneShot);
  addOptionalMetadata(metadata, "trapType", candidate.parsedBlueprint?.trapType);
  addOptionalMetadata(metadata, "hardness", candidate.parsedBlueprint?.hardness);
  addOptionalMetadata(metadata, "lightState", candidate.parsedBlueprint?.lightState);
  addOptionalMetadata(metadata, "gender", candidate.parsedBlueprint?.gender);
  addOptionalMetadata(metadata, "genderLabel", genderLabelLookup?.genderLabel);
  addOptionalMetadata(metadata, "genderLabelSource2daRow", genderLabelLookup?.genderRowId);
  addOptionalMetadata(metadata, "genderLabelSourceKey", genderLabelLookup?.genderSourceKey);
  addOptionalMetadata(metadata, "race", candidate.parsedBlueprint?.race);
  addOptionalMetadata(metadata, "raceLabel", raceLabelLookup?.raceLabel);
  addOptionalMetadata(metadata, "raceLabelSource2daRow", raceLabelLookup?.raceRowId);
  addOptionalMetadata(metadata, "raceLabelSourceKey", raceLabelLookup?.raceSourceKey);
  addOptionalMetadata(metadata, "raceAppearanceId", raceLabelLookup?.raceAppearanceId);
  addOptionalMetadata(metadata, "subrace", candidate.parsedBlueprint?.subrace);
  addOptionalMetadata(metadata, "subraceStrRef", candidate.parsedBlueprint?.subraceStrRef);
  addOptionalMetadata(metadata, "deity", candidate.parsedBlueprint?.deity);
  addOptionalMetadata(metadata, "deityStrRef", candidate.parsedBlueprint?.deityStrRef);
  addOptionalMetadata(metadata, "phenotype", candidate.parsedBlueprint?.phenotype);
  addOptionalMetadata(metadata, "phenotypeLabel", phenotypeLabelLookup?.phenotypeLabel);
  addOptionalMetadata(
    metadata,
    "phenotypeLabelSource2daRow",
    phenotypeLabelLookup?.phenotypeRowId
  );
  addOptionalMetadata(
    metadata,
    "phenotypeLabelSourceKey",
    phenotypeLabelLookup?.phenotypeSourceKey
  );
  addOptionalMetadata(metadata, "portraitId", candidate.parsedBlueprint?.portraitId);
  addOptionalMetadata(
    metadata,
    "portraitIdEffective",
    candidate.parsedBlueprint?.portraitId ?? portraitLookup?.portraitRowId
  );
  addOptionalMetadata(metadata, "portraitResRef", candidate.parsedBlueprint?.portraitResRef);
  addOptionalMetadata(metadata, "portraitResolvedResRef", portraitLookup?.portraitResRef);
  addOptionalMetadata(metadata, "portraitResolvedSource2daRow", portraitLookup?.portraitRowId);
  addOptionalMetadata(metadata, "portraitResolvedSourceKey", portraitLookup?.portraitSourceKey);
  addOptionalMetadata(metadata, "soundSetFile", candidate.parsedBlueprint?.soundSetFile);
  addOptionalMetadata(metadata, "soundSetLabel", soundSetLookup?.soundSetLabel);
  addOptionalMetadata(metadata, "soundSetResRef", soundSetLookup?.soundSetResRef);
  addOptionalMetadata(metadata, "soundSetSource2daRow", soundSetLookup?.soundSetRowId);
  addOptionalMetadata(metadata, "soundSetSourceKey", soundSetLookup?.soundSetSourceKey);
  addOptionalMetadata(metadata, "appearanceHead", candidate.parsedBlueprint?.appearanceHead);
  addOptionalMetadata(metadata, "bodyPartRFoot", candidate.parsedBlueprint?.bodyPartRFoot);
  addOptionalMetadata(metadata, "bodyPartLFoot", candidate.parsedBlueprint?.bodyPartLFoot);
  addOptionalMetadata(metadata, "bodyPartRShin", candidate.parsedBlueprint?.bodyPartRShin);
  addOptionalMetadata(metadata, "bodyPartLShin", candidate.parsedBlueprint?.bodyPartLShin);
  addOptionalMetadata(metadata, "bodyPartLThigh", candidate.parsedBlueprint?.bodyPartLThigh);
  addOptionalMetadata(metadata, "bodyPartRThigh", candidate.parsedBlueprint?.bodyPartRThigh);
  addOptionalMetadata(metadata, "bodyPartPelvis", candidate.parsedBlueprint?.bodyPartPelvis);
  addOptionalMetadata(metadata, "bodyPartTorso", candidate.parsedBlueprint?.bodyPartTorso);
  addOptionalMetadata(metadata, "bodyPartBelt", candidate.parsedBlueprint?.bodyPartBelt);
  addOptionalMetadata(metadata, "bodyPartNeck", candidate.parsedBlueprint?.bodyPartNeck);
  addOptionalMetadata(metadata, "bodyPartRFArm", candidate.parsedBlueprint?.bodyPartRFArm);
  addOptionalMetadata(metadata, "bodyPartLFArm", candidate.parsedBlueprint?.bodyPartLFArm);
  addOptionalMetadata(metadata, "bodyPartRBicep", candidate.parsedBlueprint?.bodyPartRBicep);
  addOptionalMetadata(metadata, "bodyPartLBicep", candidate.parsedBlueprint?.bodyPartLBicep);
  addOptionalMetadata(metadata, "bodyPartRShoul", candidate.parsedBlueprint?.bodyPartRShoul);
  addOptionalMetadata(metadata, "bodyPartLShoul", candidate.parsedBlueprint?.bodyPartLShoul);
  addOptionalMetadata(metadata, "bodyPartRHand", candidate.parsedBlueprint?.bodyPartRHand);
  addOptionalMetadata(metadata, "bodyPartLHand", candidate.parsedBlueprint?.bodyPartLHand);
  addOptionalMetadata(metadata, "bodyPartRobe", candidate.parsedBlueprint?.bodyPartRobe);
  addOptionalMetadata(
    metadata,
    "partModelCandidates",
    partModelCandidates.length > 0 ? JSON.stringify(partModelCandidates) : undefined
  );
  addOptionalMetadata(metadata, "colorSkin", candidate.parsedBlueprint?.colorSkin);
  addOptionalMetadata(metadata, "colorHair", candidate.parsedBlueprint?.colorHair);
  addOptionalMetadata(metadata, "colorTattoo1", candidate.parsedBlueprint?.colorTattoo1);
  addOptionalMetadata(metadata, "colorTattoo2", candidate.parsedBlueprint?.colorTattoo2);
  addOptionalMetadata(metadata, "leather1Color", candidate.parsedBlueprint?.leather1Color);
  addOptionalMetadata(metadata, "leather2Color", candidate.parsedBlueprint?.leather2Color);
  addOptionalMetadata(metadata, "cloth1Color", candidate.parsedBlueprint?.cloth1Color);
  addOptionalMetadata(metadata, "cloth2Color", candidate.parsedBlueprint?.cloth2Color);
  addOptionalMetadata(metadata, "metal1Color", candidate.parsedBlueprint?.metal1Color);
  addOptionalMetadata(metadata, "metal2Color", candidate.parsedBlueprint?.metal2Color);
  addOptionalMetadata(metadata, "wingsNew", candidate.parsedBlueprint?.wingsNew);
  addOptionalMetadata(metadata, "tailNew", candidate.parsedBlueprint?.tailNew);
  addOptionalMetadata(metadata, "walkRate", candidate.parsedBlueprint?.walkRate);
  addOptionalMetadata(metadata, "factionId", candidate.parsedBlueprint?.factionId);
  addOptionalMetadata(
    metadata,
    "challengeRating",
    candidate.parsedBlueprint?.challengeRating
  );
  addOptionalMetadata(metadata, "crAdjust", candidate.parsedBlueprint?.crAdjust);
  addOptionalMetadata(
    metadata,
    "perceptionRange",
    candidate.parsedBlueprint?.perceptionRange
  );
  addOptionalMetadata(metadata, "disarmable", candidate.parsedBlueprint?.disarmable);
  addOptionalMetadata(metadata, "naturalAc", candidate.parsedBlueprint?.naturalAc);
  addOptionalMetadata(metadata, "hitPoints", candidate.parsedBlueprint?.hitPoints);
  addOptionalMetadata(
    metadata,
    "currentHitPoints",
    candidate.parsedBlueprint?.currentHitPoints
  );
  addOptionalMetadata(metadata, "maxHitPoints", candidate.parsedBlueprint?.maxHitPoints);
  addOptionalMetadata(metadata, "reflexBonus", candidate.parsedBlueprint?.reflexBonus);
  addOptionalMetadata(metadata, "willBonus", candidate.parsedBlueprint?.willBonus);
  addOptionalMetadata(
    metadata,
    "fortitudeBonus",
    candidate.parsedBlueprint?.fortitudeBonus
  );
  addOptionalMetadata(metadata, "strength", candidate.parsedBlueprint?.strength);
  addOptionalMetadata(metadata, "dexterity", candidate.parsedBlueprint?.dexterity);
  addOptionalMetadata(metadata, "constitution", candidate.parsedBlueprint?.constitution);
  addOptionalMetadata(metadata, "intelligence", candidate.parsedBlueprint?.intelligence);
  addOptionalMetadata(metadata, "wisdom", candidate.parsedBlueprint?.wisdom);
  addOptionalMetadata(metadata, "charisma", candidate.parsedBlueprint?.charisma);
  addOptionalMetadata(metadata, "strengthAdjust", candidate.parsedBlueprint?.strengthAdjust);
  addOptionalMetadata(metadata, "dexterityAdjust", candidate.parsedBlueprint?.dexterityAdjust);
  addOptionalMetadata(
    metadata,
    "constitutionAdjust",
    candidate.parsedBlueprint?.constitutionAdjust
  );
  addOptionalMetadata(
    metadata,
    "intelligenceAdjust",
    candidate.parsedBlueprint?.intelligenceAdjust
  );
  addOptionalMetadata(metadata, "wisdomAdjust", candidate.parsedBlueprint?.wisdomAdjust);
  addOptionalMetadata(metadata, "charismaAdjust", candidate.parsedBlueprint?.charismaAdjust);
  addOptionalMetadata(metadata, "goodEvil", candidate.parsedBlueprint?.goodEvil);
  addOptionalMetadata(
    metadata,
    "lawfulChaotic",
    candidate.parsedBlueprint?.lawfulChaotic
  );
  addOptionalMetadata(metadata, "markUp", candidate.parsedBlueprint?.markUp);
  addOptionalMetadata(metadata, "markDown", candidate.parsedBlueprint?.markDown);
  addOptionalMetadata(metadata, "blackMarket", candidate.parsedBlueprint?.blackMarket);
  addOptionalMetadata(metadata, "bmMarkDown", candidate.parsedBlueprint?.bmMarkDown);
  addOptionalMetadata(metadata, "onOpenStore", candidate.parsedBlueprint?.onOpenStore);
  addOptionalMetadata(metadata, "storeId", candidate.parsedBlueprint?.storeId);
  addOptionalMetadata(metadata, "storeListCount", candidate.parsedBlueprint?.storeListCount);
  addOptionalMetadata(
    metadata,
    "storeItemListTotal",
    candidate.parsedBlueprint?.storeItemListTotal
  );
  addOptionalMetadata(
    metadata,
    "willNotBuyCount",
    candidate.parsedBlueprint?.willNotBuyCount
  );
  addOptionalMetadata(
    metadata,
    "willOnlyBuyCount",
    candidate.parsedBlueprint?.willOnlyBuyCount
  );
  addOptionalMetadata(metadata, "classListCount", candidate.parsedBlueprint?.classListCount);
  addOptionalMetadata(metadata, "skillListCount", candidate.parsedBlueprint?.skillListCount);
  addOptionalMetadata(metadata, "featListCount", candidate.parsedBlueprint?.featListCount);
  addOptionalMetadata(
    metadata,
    "templateListCount",
    candidate.parsedBlueprint?.templateListCount
  );
  addOptionalMetadata(
    metadata,
    "specAbilityListCount",
    candidate.parsedBlueprint?.specAbilityListCount
  );
  addOptionalMetadata(
    metadata,
    "inventoryItemListCount",
    candidate.parsedBlueprint?.inventoryItemListCount
  );
  addOptionalMetadata(
    metadata,
    "equipItemListCount",
    candidate.parsedBlueprint?.equipItemListCount
  );
  addOptionalMetadata(
    metadata,
    "itemPropertyListCount",
    candidate.parsedBlueprint?.itemPropertyListCount
  );
  addOptionalMetadata(
    metadata,
    "encounterCreatureListCount",
    candidate.parsedBlueprint?.encounterCreatureListCount
  );
  addOptionalJsonMetadata(metadata, "classListEntries", classListEntries);
  addOptionalJsonMetadata(metadata, "featListEntries", featListEntries);
  addOptionalJsonMetadata(
    metadata,
    "templateListEntries",
    candidate.parsedBlueprint?.templateListEntries
  );
  addOptionalJsonMetadata(
    metadata,
    "specAbilityListEntries",
    specAbilityListEntries
  );
  addOptionalJsonMetadata(
    metadata,
    "inventoryItemListEntries",
    inventoryItemListEntries
  );
  addOptionalJsonMetadata(
    metadata,
    "equipItemListEntries",
    equipItemListEntries
  );
  addOptionalJsonMetadata(
    metadata,
    "itemPropertyListEntries",
    itemPropertyListEntries
  );
  addOptionalJsonMetadata(
    metadata,
    "storeListEntries",
    candidate.parsedBlueprint?.storeListEntries
  );
  addOptionalJsonMetadata(
    metadata,
    "willNotBuyBaseItems",
    candidate.parsedBlueprint?.willNotBuyBaseItems
  );
  addOptionalJsonMetadata(
    metadata,
    "willOnlyBuyBaseItems",
    candidate.parsedBlueprint?.willOnlyBuyBaseItems
  );
  addOptionalJsonMetadata(
    metadata,
    "encounterCreatureListEntries",
    candidate.parsedBlueprint?.encounterCreatureListEntries
  );
  addOptionalJsonMetadata(metadata, "skillListEntries", skillListEntries);
  addOptionalJsonMetadata(
    metadata,
    "variableListEntries",
    candidate.parsedBlueprint?.variableListEntries
  );
  if (candidate.parsedBlueprint) {
    addOptionalMetadata(
      metadata,
      "scriptCount",
      Object.keys(candidate.parsedBlueprint.scripts).length
    );
  }

  for (const [label, scriptResref] of Object.entries(candidate.parsedBlueprint?.scripts ?? {})) {
    addOptionalMetadata(metadata, `script.${label}`, scriptResref);
  }

  return {
    templateId: buildTemplateId(candidate.kind, resolvedResref),
    kind: candidate.kind,
    placeableSubtype,
    benchmarkCandidate: benchmarkIds[candidate.kind].has(candidate.resref),
    benchmarkBucket: benchmarkIds[candidate.kind].has(candidate.resref)
      ? buildBenchmarkBucket(candidate.kind, placeableSubtype)
      : undefined,
    resref: resolvedResref,
    name: resolveTemplateName(candidate, resolvedResref),
    category: inferCategory(candidate, placeableSubtype),
    tags: buildTags(candidate, placeableSubtype),
    previewImageUrl: `/assets/previews/${candidate.kind}s/${resolvedResref}.webp`,
    metadata
  };
}

function resolveCandidateResref(candidate: TemplateCandidate): string {
  const parsedResref = candidate.parsedBlueprint?.templateResRef;
  if (!parsedResref || parsedResref.trim().length === 0) {
    return candidate.resref;
  }
  return normalizeResref(parsedResref);
}

function buildPlaceableLookupHints(
  candidate: TemplateCandidate,
  fallbackTemplateResref: string,
  placeableAppearanceModelLookup: ReadonlyMap<number, PlaceableAppearanceModelLookupEntry>
): {
  templateResRef?: string;
  modelResRef?: string;
  modelSource2daRow?: number;
  requestedAppearanceType?: number;
  resolutionPath?: string;
  dependencyRefs?: string;
  dependencyCount?: number;
} {
  const templateResRef = normalizeLookupRef(
    candidate.parsedBlueprint?.templateResRef ?? fallbackTemplateResref
  );
  const directModelResRef =
    normalizeLookupRef(candidate.parsedBlueprint?.modelResRef) ??
    normalizeLookupRef(candidate.placeables2daRow?.modelResRef);
  const appearanceId = candidate.parsedBlueprint?.appearanceId ?? candidate.placeables2daRow?.rowId;
  const lookupModelResRef =
    !directModelResRef && Number.isInteger(appearanceId ?? Number.NaN) && appearanceId !== undefined
      ? placeableAppearanceModelLookup.get(appearanceId)
      : undefined;
  const modelResRef = directModelResRef ?? lookupModelResRef?.modelResRef;
  const dependencyRefs = dedupeNormalizedLookupRefs([
    ...(candidate.parsedBlueprint?.dependencyRefs ?? []),
    candidate.parsedBlueprint?.templateResRef ?? fallbackTemplateResref,
    modelResRef
  ]);

  return {
    templateResRef,
    modelResRef,
    modelSource2daRow: lookupModelResRef?.rowId,
    requestedAppearanceType: lookupModelResRef?.requestedRowId,
    resolutionPath: lookupModelResRef?.resolutionPath,
    dependencyRefs: dependencyRefs.length > 0 ? dependencyRefs.join("|") : undefined,
    dependencyCount: dependencyRefs.length > 0 ? dependencyRefs.length : undefined
  };
}

function buildDoorTwoDaLookupHints(
  candidate: TemplateCandidate,
  lookup: DoorTwoDaLookup
): DoorTwoDaLookupHints {
  const appearanceId = candidate.parsedBlueprint?.appearanceId;
  const genericType = candidate.parsedBlueprint?.genericType;
  const doortypesRow =
    Number.isInteger(appearanceId ?? Number.NaN) && appearanceId !== undefined
      ? lookup.doortypesByRowId.get(appearanceId)
      : undefined;
  const genericdoorsRow =
    Number.isInteger(genericType ?? Number.NaN) && genericType !== undefined
      ? lookup.genericdoorsByRowId.get(genericType)
      : undefined;

  return {
    appearanceId,
    genericType,
    doortypesSourceKey: doortypesRow?.sourceKey ?? lookup.doortypesSourceKey,
    doortypesRowId: doortypesRow?.rowId,
    doortypesLabel: doortypesRow?.label,
    doortypesModelResRef: doortypesRow?.modelResRef,
    genericdoorsSourceKey: genericdoorsRow?.sourceKey ?? lookup.genericdoorsSourceKey,
    genericdoorsRowId: genericdoorsRow?.rowId,
    genericdoorsLabel: genericdoorsRow?.label,
    genericdoorsModelResRef: genericdoorsRow?.modelResRef,
    modelResRef: doortypesRow?.modelResRef ?? genericdoorsRow?.modelResRef,
    doortypesAvailable: lookup.doortypesByRowId.size > 0,
    genericdoorsAvailable: lookup.genericdoorsByRowId.size > 0
  };
}

function buildCreatureWalkRateLookupHints(
  candidate: TemplateCandidate,
  lookup: ReadonlyMap<number, CreatureWalkRateLookupEntry>
): CreatureWalkRateLookupEntry | undefined {
  const explicitWalkRate = candidate.parsedBlueprint?.walkRate;
  if (Number.isInteger(explicitWalkRate ?? Number.NaN)) {
    return undefined;
  }
  const appearanceId = candidate.parsedBlueprint?.appearanceId;
  if (!Number.isInteger(appearanceId ?? Number.NaN)) {
    return undefined;
  }
  return lookup.get(Math.trunc(appearanceId ?? -1));
}

function buildCreatureAppearanceLabelLookupHints(
  candidate: TemplateCandidate,
  lookup: ReadonlyMap<number, CreatureAppearanceLabelLookupEntry>
): CreatureAppearanceLabelLookupEntry | undefined {
  const appearanceId = candidate.parsedBlueprint?.appearanceId;
  if (!Number.isInteger(appearanceId ?? Number.NaN)) {
    return undefined;
  }
  return lookup.get(Math.trunc(appearanceId ?? -1));
}

function buildCreatureRaceLabelLookupHints(
  candidate: TemplateCandidate,
  lookup: ReadonlyMap<number, CreatureRaceLabelLookupEntry>
): CreatureRaceLabelLookupEntry | undefined {
  const race = candidate.parsedBlueprint?.race;
  if (!Number.isInteger(race ?? Number.NaN)) {
    return undefined;
  }
  return lookup.get(Math.trunc(race ?? -1));
}

function buildCreatureGenderLabelLookupHints(
  candidate: TemplateCandidate,
  lookup: ReadonlyMap<number, CreatureGenderLabelLookupEntry>
): CreatureGenderLabelLookupEntry | undefined {
  const gender = candidate.parsedBlueprint?.gender;
  if (!Number.isInteger(gender ?? Number.NaN)) {
    return undefined;
  }
  return lookup.get(Math.trunc(gender ?? -1));
}

function buildCreaturePhenotypeLabelLookupHints(
  candidate: TemplateCandidate,
  lookup: ReadonlyMap<number, CreaturePhenotypeLabelLookupEntry>
): CreaturePhenotypeLabelLookupEntry | undefined {
  const phenotype = candidate.parsedBlueprint?.phenotype;
  if (!Number.isInteger(phenotype ?? Number.NaN)) {
    return undefined;
  }
  return lookup.get(Math.trunc(phenotype ?? -1));
}

const CREATURE_BODY_PART_SLOT_DEFINITIONS = [
  { slot: "rFoot", blueprintKey: "bodyPartRFoot", capartRowId: 0 },
  { slot: "lFoot", blueprintKey: "bodyPartLFoot", capartRowId: 1 },
  { slot: "rShin", blueprintKey: "bodyPartRShin", capartRowId: 2 },
  { slot: "lShin", blueprintKey: "bodyPartLShin", capartRowId: 3 },
  { slot: "lThigh", blueprintKey: "bodyPartLThigh", capartRowId: 4 },
  { slot: "rThigh", blueprintKey: "bodyPartRThigh", capartRowId: 5 },
  { slot: "pelvis", blueprintKey: "bodyPartPelvis", capartRowId: 6 },
  { slot: "torso", blueprintKey: "bodyPartTorso", capartRowId: 7 },
  { slot: "belt", blueprintKey: "bodyPartBelt", capartRowId: 8 },
  { slot: "neck", blueprintKey: "bodyPartNeck", capartRowId: 9 },
  { slot: "rFArm", blueprintKey: "bodyPartRFArm", capartRowId: 10 },
  { slot: "lFArm", blueprintKey: "bodyPartLFArm", capartRowId: 11 },
  { slot: "rBicep", blueprintKey: "bodyPartRBicep", capartRowId: 12 },
  { slot: "lBicep", blueprintKey: "bodyPartLBicep", capartRowId: 13 },
  { slot: "rShoul", blueprintKey: "bodyPartRShoul", capartRowId: 14 },
  { slot: "lShoul", blueprintKey: "bodyPartLShoul", capartRowId: 15 },
  { slot: "rHand", blueprintKey: "bodyPartRHand", capartRowId: 16 },
  { slot: "lHand", blueprintKey: "bodyPartLHand", capartRowId: 17 },
  { slot: "robe", blueprintKey: "bodyPartRobe", capartRowId: 18 }
] as const;
const CREATURE_PLAYER_BODY_PART_MODEL_RESREF_FORMAT = "p%c%c%s_%s_%03d";
const CREATURE_DEFAULT_PLAYER_BODY_PART_ID = 1;
const CREATURE_OPTIONAL_PLAYER_BODY_PART_SLOTS = new Set<CreatureBodyPartSlot>(["robe"]);

type CreatureBodyPartSlot = (typeof CREATURE_BODY_PART_SLOT_DEFINITIONS)[number]["slot"];
type CreaturePartModelSlot = CreatureBodyPartSlot | "head" | "wings" | "tail";

function buildCreaturePartModelCandidateHints(
  candidate: TemplateCandidate,
  lookup: ReadonlyMap<number, CreaturePartModelLookupEntry>,
  wingModelLookup: ReadonlyMap<number, CreatureAccessoryModelLookupEntry>,
  tailModelLookup: ReadonlyMap<number, CreatureAccessoryModelLookupEntry>,
  appearanceLookup: CreatureAppearanceLabelLookupEntry | undefined,
  genderLookup: CreatureGenderLabelLookupEntry | undefined,
  phenotypeLookup: CreaturePhenotypeLabelLookupEntry | undefined
): CreaturePartModelCandidateMetadata[] {
  if (!candidate.parsedBlueprint) {
    return [];
  }

  const modelPrefix = buildCreaturePlayerBodyPartModelPrefix(
    candidate,
    appearanceLookup,
    genderLookup,
    phenotypeLookup
  );
  const entries: CreaturePartModelCandidateMetadata[] = [];
  const headCandidate = buildCreatureHeadModelCandidateHint(candidate, modelPrefix);
  if (headCandidate) {
    entries.push(headCandidate);
  }

  if (lookup.size > 0) {
    for (const definition of CREATURE_BODY_PART_SLOT_DEFINITIONS) {
      const partId = resolveCreatureBodyPartModelPartId(
        candidate.parsedBlueprint[definition.blueprintKey],
        definition.slot,
        modelPrefix,
        appearanceLookup
      );
      if (partId === undefined) {
        continue;
      }
      const partLookup = lookup.get(definition.capartRowId);
      if (!partLookup) {
        continue;
      }
      const modelResRef = modelPrefix
        ? `${modelPrefix}${partLookup.modelName}${String(partId).padStart(3, "0")}`.toLowerCase()
        : undefined;
      entries.push({
        slot: definition.slot,
        partId,
        partModelName: partLookup.modelName,
        ...(partLookup.nodeName ? { nodeName: partLookup.nodeName } : {}),
        ...(modelPrefix ? { modelPrefix } : {}),
        ...(modelResRef
          ? {
              modelResRef,
              modelResRefPattern: "aurora-player-body-part" as const,
              modelResRefPatternFormat: CREATURE_PLAYER_BODY_PART_MODEL_RESREF_FORMAT
            }
          : {}),
        source: "capart.2da.MDLNAME",
        source2daRow: partLookup.partRowId,
        sourceKey: partLookup.partSourceKey
      });
    }
  }

  const wingCandidate = buildCreatureAccessoryModelCandidateHint(
    "wings",
    candidate.parsedBlueprint.wingsNew,
    wingModelLookup
  );
  if (wingCandidate) {
    entries.push(wingCandidate);
  }
  const tailCandidate = buildCreatureAccessoryModelCandidateHint(
    "tail",
    candidate.parsedBlueprint.tailNew,
    tailModelLookup
  );
  if (tailCandidate) {
    entries.push(tailCandidate);
  }

  return entries;
}

function resolveCreatureBodyPartModelPartId(
  rawPartId: number | undefined,
  slot: CreatureBodyPartSlot,
  modelPrefix: string | undefined,
  appearanceLookup: CreatureAppearanceLabelLookupEntry | undefined
): number | undefined {
  if (Number.isInteger(rawPartId ?? Number.NaN) && rawPartId !== undefined) {
    const explicitPartId = Math.trunc(rawPartId);
    return explicitPartId > 0 ? explicitPartId : undefined;
  }
  if (
    !modelPrefix ||
    appearanceLookup?.modelType?.trim().toUpperCase() !== "P" ||
    CREATURE_OPTIONAL_PLAYER_BODY_PART_SLOTS.has(slot)
  ) {
    return undefined;
  }
  return CREATURE_DEFAULT_PLAYER_BODY_PART_ID;
}

function buildCreatureHeadModelCandidateHint(
  candidate: TemplateCandidate,
  modelPrefix: string | undefined
): CreaturePartModelCandidateMetadata | undefined {
  const headId = candidate.parsedBlueprint?.appearanceHead;
  if (
    !modelPrefix ||
    !Number.isInteger(headId ?? Number.NaN) ||
    headId === undefined ||
    headId < 0
  ) {
    return undefined;
  }

  const partId = Math.trunc(headId);
  return {
    slot: "head",
    partId,
    partModelName: "head",
    modelPrefix,
    modelResRef: `${modelPrefix}head${String(partId).padStart(3, "0")}`.toLowerCase(),
    modelResRefPattern: "aurora-player-body-part",
    modelResRefPatternFormat: CREATURE_PLAYER_BODY_PART_MODEL_RESREF_FORMAT,
    source: "utc.Appearance_Head",
    sourceKey: candidate.sourceKey
  };
}

function buildCreatureAccessoryModelCandidateHint(
  slot: "wings" | "tail",
  partId: number | undefined,
  lookup: ReadonlyMap<number, CreatureAccessoryModelLookupEntry>
): CreaturePartModelCandidateMetadata | undefined {
  if (!Number.isInteger(partId ?? Number.NaN) || partId === undefined || partId <= 0) {
    return undefined;
  }
  const accessoryLookup = lookup.get(Math.trunc(partId));
  if (!accessoryLookup) {
    return undefined;
  }

  return {
    slot,
    partId: Math.trunc(partId),
    partModelName: accessoryLookup.label ?? slot,
    modelResRef: accessoryLookup.modelResRef,
    source: accessoryLookup.source,
    source2daRow: accessoryLookup.partRowId,
    sourceKey: accessoryLookup.sourceKey
  };
}

function buildCreaturePlayerBodyPartModelPrefix(
  candidate: TemplateCandidate,
  appearanceLookup: CreatureAppearanceLabelLookupEntry | undefined,
  genderLookup: CreatureGenderLabelLookupEntry | undefined,
  phenotypeLookup: CreaturePhenotypeLabelLookupEntry | undefined
): string | undefined {
  const raceToken = normalizeCreatureBodyPartRaceToken(appearanceLookup?.raceModel);
  if (!raceToken) {
    return undefined;
  }
  const genderToken = normalizeCreatureBodyPartGenderToken(
    genderLookup?.genderLabel,
    candidate.parsedBlueprint?.gender
  );
  const phenotypeToken = normalizeCreatureBodyPartPhenotypeToken(
    candidate.parsedBlueprint?.phenotype,
    appearanceLookup?.defaultPhenotype,
    phenotypeLookup?.phenotypeRowId
  );
  return `p${genderToken}${raceToken}${phenotypeToken}_`.toLowerCase();
}

function normalizeCreatureBodyPartRaceToken(value: string | undefined): string | undefined {
  const normalized = normalizeLookupRef(value);
  if (!normalized) {
    return undefined;
  }
  const compact = normalized.replace(/[^a-z0-9]+/giu, "");
  if (compact.length === 1) {
    return compact.toLowerCase();
  }
  const knownRaceTokens = new Map([
    ["human", "h"],
    ["elf", "e"],
    ["dwarf", "d"],
    ["gnome", "g"],
    ["halfling", "l"],
    ["halforc", "o"],
    ["halfelf", "h"]
  ]);
  return knownRaceTokens.get(compact.toLowerCase());
}

function normalizeCreatureBodyPartGenderToken(
  label: string | undefined,
  gender: number | undefined
): string {
  const normalized = normalizeLookupRef(label);
  if (normalized?.toLowerCase().startsWith("f")) {
    return "f";
  }
  if (normalized?.toLowerCase().startsWith("m")) {
    return "m";
  }
  return gender === 1 ? "f" : "m";
}

function normalizeCreatureBodyPartPhenotypeToken(
  phenotype: number | undefined,
  defaultPhenotype: string | undefined,
  phenotypeRowId: number | undefined
): number {
  if (Number.isInteger(phenotype ?? Number.NaN) && phenotype !== undefined) {
    return Math.max(0, Math.trunc(phenotype));
  }
  const parsedDefault = parseTwoDaIntegerToken(defaultPhenotype);
  if (parsedDefault !== undefined) {
    return Math.max(0, parsedDefault);
  }
  if (Number.isInteger(phenotypeRowId ?? Number.NaN) && phenotypeRowId !== undefined) {
    return Math.max(0, Math.trunc(phenotypeRowId));
  }
  return 0;
}

function buildCreatureSizeLabelLookupHints(
  appearanceLookup: CreatureAppearanceLabelLookupEntry | undefined,
  lookup: ReadonlyMap<number, CreatureSizeLabelLookupEntry>
): CreatureSizeLabelLookupEntry | undefined {
  const sizeCategory = appearanceLookup?.sizeCategory;
  if (!Number.isInteger(sizeCategory ?? Number.NaN)) {
    return undefined;
  }
  return lookup.get(Math.trunc(sizeCategory ?? -1));
}

function buildCreaturePortraitLookupHints(
  candidate: TemplateCandidate,
  lookup: ReadonlyMap<number, CreaturePortraitLookupEntry>
): CreaturePortraitLookupEntry | undefined {
  const portraitId = candidate.parsedBlueprint?.portraitId;
  if (Number.isInteger(portraitId ?? Number.NaN)) {
    return lookup.get(Math.trunc(portraitId ?? -1));
  }

  const portraitResRef = normalizeLookupRef(candidate.parsedBlueprint?.portraitResRef);
  if (!portraitResRef) {
    return undefined;
  }
  for (const entry of lookup.values()) {
    if (normalizeLookupRef(entry.portraitResRef) === portraitResRef) {
      return entry;
    }
  }
  return undefined;
}

function buildCreatureSoundSetLookupHints(
  candidate: TemplateCandidate,
  lookup: ReadonlyMap<number, CreatureSoundSetLookupEntry>
): CreatureSoundSetLookupEntry | undefined {
  const soundSetFile = candidate.parsedBlueprint?.soundSetFile;
  if (!Number.isInteger(soundSetFile ?? Number.NaN)) {
    return undefined;
  }
  return lookup.get(Math.trunc(soundSetFile ?? -1));
}

function buildItemTemplateReferenceLookup(
  candidates: TemplateCandidate[],
  templateTalkTableLookup: TemplateTalkTableLookup,
  itemBaseItemLookup: ReadonlyMap<number, ItemBaseItemLookupEntry>,
  itemPropertyDefinitionLookup: ReadonlyMap<number, ItemPropertyDefinitionLookupEntry>
): Map<string, ItemTemplateReferenceLookupEntry> {
  const lookup = new Map<string, ItemTemplateReferenceLookupEntry>();
  for (const rawCandidate of candidates) {
    if (rawCandidate.kind !== "item") {
      continue;
    }
    const candidate = resolveCandidateTalkTableFields(rawCandidate, templateTalkTableLookup);
    const resref = resolveCandidateResref(candidate);
    const baseItemLookup = buildItemBaseItemLookupHints(candidate, itemBaseItemLookup);
    const entry: ItemTemplateReferenceLookupEntry = {
      templateId: buildTemplateId("item", resref),
      resref,
      sourceFingerprint: buildItemTemplateReferenceSourceFingerprint(
        candidate,
        baseItemLookup,
        itemPropertyDefinitionLookup
      ),
      sourceObjectKey: candidate.sourceKey,
      metadata: buildItemTemplateReferenceMetadata(
        candidate,
        baseItemLookup,
        itemPropertyDefinitionLookup
      )
    };
    for (const key of dedupeNormalizedLookupRefs([
      candidate.resref,
      candidate.parsedBlueprint?.templateResRef,
      resref
    ])) {
      if (!lookup.has(key)) {
        lookup.set(key, entry);
      }
    }
  }
  return lookup;
}

function buildItemTemplateReferenceMetadata(
  candidate: TemplateCandidate,
  baseItemLookup: ItemBaseItemLookupEntry | undefined,
  itemPropertyDefinitionLookup: ReadonlyMap<number, ItemPropertyDefinitionLookupEntry>
): Record<string, string | number | boolean> {
  const metadata: Record<string, string | number | boolean> = {
    sourceObjectKey: candidate.sourceKey,
    sourceSizeBytes: candidate.sourceSize,
    sourceExtension: candidate.extension,
    sourceFingerprint: candidate.sourceFingerprint
  };
  const blueprint = candidate.parsedBlueprint;
  addOptionalMetadata(metadata, "sourceEtag", candidate.sourceEtag);
  addOptionalMetadata(metadata, "sourceFileType", blueprint?.sourceFileType);
  addOptionalMetadata(metadata, "sourceFileVersion", blueprint?.sourceFileVersion);
  addOptionalMetadata(metadata, "sourceStructTypeId", blueprint?.sourceStructTypeId);
  addOptionalMetadata(metadata, "templateResRef", blueprint?.templateResRef);
  addOptionalMetadata(metadata, "localizedName", blueprint?.localizedName);
  addOptionalMetadata(metadata, "localizedNameStrRef", blueprint?.localizedNameStrRef);
  addOptionalMetadata(metadata, "displayName", blueprint?.displayName);
  addOptionalMetadata(metadata, "description", blueprint?.description);
  addOptionalMetadata(metadata, "descriptionStrRef", blueprint?.descriptionStrRef);
  addOptionalMetadata(metadata, "identifiedDescription", blueprint?.identifiedDescription);
  addOptionalMetadata(
    metadata,
    "identifiedDescriptionStrRef",
    blueprint?.identifiedDescriptionStrRef
  );
  addOptionalMetadata(metadata, "comments", blueprint?.comments);
  addOptionalMetadata(metadata, "paletteId", blueprint?.paletteId);
  addOptionalMetadata(metadata, "tag", blueprint?.tag);
  addOptionalMetadata(metadata, "plot", blueprint?.plot);
  addOptionalMetadata(metadata, "baseItem", blueprint?.baseItem);
  addItemBaseItemLookupMetadata(metadata, baseItemLookup);
  addOptionalMetadata(metadata, "modelPart1", blueprint?.modelPart1);
  addOptionalMetadata(metadata, "modelPart2", blueprint?.modelPart2);
  addOptionalMetadata(metadata, "modelPart3", blueprint?.modelPart3);
  addOptionalMetadata(metadata, "cost", blueprint?.cost);
  addOptionalMetadata(metadata, "addCost", blueprint?.addCost);
  addOptionalMetadata(metadata, "costTable", blueprint?.costTable);
  addOptionalMetadata(metadata, "costValue", blueprint?.costValue);
  addOptionalMetadata(metadata, "charges", blueprint?.charges);
  addOptionalMetadata(metadata, "stackSize", blueprint?.stackSize);
  addOptionalMetadata(metadata, "identified", blueprint?.identified);
  addOptionalMetadata(metadata, "stolen", blueprint?.stolen);
  addOptionalMetadata(metadata, "cursed", blueprint?.cursed);
  addOptionalMetadata(metadata, "bodyPartRFoot", blueprint?.bodyPartRFoot);
  addOptionalMetadata(metadata, "bodyPartLFoot", blueprint?.bodyPartLFoot);
  addOptionalMetadata(metadata, "bodyPartRShin", blueprint?.bodyPartRShin);
  addOptionalMetadata(metadata, "bodyPartLShin", blueprint?.bodyPartLShin);
  addOptionalMetadata(metadata, "bodyPartLThigh", blueprint?.bodyPartLThigh);
  addOptionalMetadata(metadata, "bodyPartRThigh", blueprint?.bodyPartRThigh);
  addOptionalMetadata(metadata, "bodyPartPelvis", blueprint?.bodyPartPelvis);
  addOptionalMetadata(metadata, "bodyPartTorso", blueprint?.bodyPartTorso);
  addOptionalMetadata(metadata, "bodyPartBelt", blueprint?.bodyPartBelt);
  addOptionalMetadata(metadata, "bodyPartNeck", blueprint?.bodyPartNeck);
  addOptionalMetadata(metadata, "bodyPartRFArm", blueprint?.bodyPartRFArm);
  addOptionalMetadata(metadata, "bodyPartLFArm", blueprint?.bodyPartLFArm);
  addOptionalMetadata(metadata, "bodyPartRBicep", blueprint?.bodyPartRBicep);
  addOptionalMetadata(metadata, "bodyPartLBicep", blueprint?.bodyPartLBicep);
  addOptionalMetadata(metadata, "bodyPartRShoul", blueprint?.bodyPartRShoul);
  addOptionalMetadata(metadata, "bodyPartLShoul", blueprint?.bodyPartLShoul);
  addOptionalMetadata(metadata, "bodyPartRHand", blueprint?.bodyPartRHand);
  addOptionalMetadata(metadata, "bodyPartLHand", blueprint?.bodyPartLHand);
  addOptionalMetadata(metadata, "bodyPartRobe", blueprint?.bodyPartRobe);
  addOptionalMetadata(metadata, "leather1Color", blueprint?.leather1Color);
  addOptionalMetadata(metadata, "leather2Color", blueprint?.leather2Color);
  addOptionalMetadata(metadata, "cloth1Color", blueprint?.cloth1Color);
  addOptionalMetadata(metadata, "cloth2Color", blueprint?.cloth2Color);
  addOptionalMetadata(metadata, "metal1Color", blueprint?.metal1Color);
  addOptionalMetadata(metadata, "metal2Color", blueprint?.metal2Color);
  addOptionalMetadata(metadata, "itemPropertyListCount", blueprint?.itemPropertyListCount);
  addOptionalJsonMetadata(
    metadata,
    "itemPropertyListEntries",
    enrichItemPropertyListEntries(
      blueprint?.itemPropertyListEntries,
      itemPropertyDefinitionLookup
    )
  );
  for (const [label, scriptResref] of Object.entries(blueprint?.scripts ?? {})) {
    addOptionalMetadata(metadata, `script.${label}`, scriptResref);
  }
  return metadata;
}

function addItemBaseItemLookupMetadata(
  metadata: Record<string, string | number | boolean>,
  baseItemLookup: ItemBaseItemLookupEntry | undefined
): void {
  addOptionalMetadata(metadata, "baseItem2daRow", baseItemLookup?.baseItemRowId);
  addOptionalMetadata(metadata, "baseItem2daLabel", baseItemLookup?.label);
  addOptionalMetadata(metadata, "baseItem2daSourceKey", baseItemLookup?.sourceKey);
  addOptionalMetadata(metadata, "baseItem2daItemClass", baseItemLookup?.itemClass);
  addOptionalMetadata(metadata, "baseItemModelType", baseItemLookup?.modelType);
  addOptionalMetadata(metadata, "baseItemDefaultModel", baseItemLookup?.defaultModel);
  addOptionalMetadata(metadata, "baseItemDefaultIcon", baseItemLookup?.defaultIcon);
  addOptionalMetadata(metadata, "baseItemInvSlotWidth", baseItemLookup?.invSlotWidth);
  addOptionalMetadata(metadata, "baseItemInvSlotHeight", baseItemLookup?.invSlotHeight);
  addOptionalMetadata(metadata, "baseItemCanRotateIcon", baseItemLookup?.canRotateIcon);
  addOptionalMetadata(metadata, "baseItemEquipableSlots", baseItemLookup?.equipableSlots);
  addOptionalMetadata(metadata, "baseItemBaseCost", baseItemLookup?.baseCost);
  addOptionalMetadata(metadata, "baseItemStacking", baseItemLookup?.stacking);
  addOptionalMetadata(metadata, "baseItemItemMultiplier", baseItemLookup?.itemMultiplier);
  addOptionalMetadata(metadata, "baseItemMaxProps", baseItemLookup?.maxProps);
  addOptionalMetadata(metadata, "baseItemMinProps", baseItemLookup?.minProps);
  addOptionalMetadata(metadata, "baseItemPropColumn", baseItemLookup?.propColumn);
  addOptionalMetadata(metadata, "baseItemStorePanel", baseItemLookup?.storePanel);
  addOptionalMetadata(metadata, "baseItemStorePanelSort", baseItemLookup?.storePanelSort);
  addOptionalMetadata(metadata, "baseItemChargesStarting", baseItemLookup?.chargesStarting);
  addOptionalMetadata(metadata, "baseItemIlrStackSize", baseItemLookup?.ilrStackSize);
  addOptionalMetadata(metadata, "baseItemWeaponWield", baseItemLookup?.weaponWield);
  addOptionalMetadata(metadata, "baseItemWeaponType", baseItemLookup?.weaponType);
  addOptionalMetadata(metadata, "baseItemWeaponSize", baseItemLookup?.weaponSize);
  addOptionalMetadata(metadata, "baseItemRangedWeapon", baseItemLookup?.rangedWeapon);
  addOptionalMetadata(metadata, "baseItemRotateOnGround", baseItemLookup?.rotateOnGround);
  addOptionalMetadata(metadata, "baseItemWeaponMatType", baseItemLookup?.weaponMatType);
  addOptionalMetadata(metadata, "baseItemAmmunitionType", baseItemLookup?.ammunitionType);
  addOptionalMetadata(
    metadata,
    "baseItemArcaneSpellFailure",
    baseItemLookup?.arcaneSpellFailure
  );
}

function buildItemBaseItemLookupHints(
  candidate: TemplateCandidate,
  lookup: ReadonlyMap<number, ItemBaseItemLookupEntry>
): ItemBaseItemLookupEntry | undefined {
  const baseItem = candidate.parsedBlueprint?.baseItem;
  if (!Number.isInteger(baseItem ?? Number.NaN)) {
    return undefined;
  }
  return lookup.get(Math.trunc(baseItem ?? -1));
}

function buildItemTemplateReferenceSourceFingerprint(
  candidate: TemplateCandidate,
  baseItemLookup: ItemBaseItemLookupEntry | undefined,
  itemPropertyDefinitionLookup: ReadonlyMap<number, ItemPropertyDefinitionLookupEntry>
): string {
  const propertyDefinitionFingerprints = collectItemPropertyDefinitionFingerprints(
    candidate.parsedBlueprint?.itemPropertyListEntries,
    itemPropertyDefinitionLookup
  );
  if (!baseItemLookup && propertyDefinitionFingerprints.length === 0) {
    return candidate.sourceFingerprint;
  }
  return buildSourceFingerprint([
    "item-reference",
    candidate.sourceFingerprint,
    baseItemLookup?.sourceFingerprint ?? "",
    ...propertyDefinitionFingerprints
  ]);
}

function enrichItemPropertyListEntries(
  entries: ParsedItemPropertyListEntry[] | undefined,
  itemPropertyDefinitionLookup: ReadonlyMap<number, ItemPropertyDefinitionLookupEntry>
): Array<
  ParsedItemPropertyListEntry & {
    propertyLabel?: string;
    propertyDefinitionSource2daRow?: number;
    propertyDefinitionSourceKey?: string;
    subTypeTable?: string;
    costTableDefinition?: string;
    param1Table?: string;
    nameStrRef?: number;
    gameStrRef?: number;
    descriptionStrRef?: number;
  }
> | undefined {
  if (!entries || entries.length === 0) {
    return undefined;
  }
  return entries.map((entry) => {
    if (!Number.isInteger(entry.propertyName ?? Number.NaN)) {
      return entry;
    }
    const definition = itemPropertyDefinitionLookup.get(Math.trunc(entry.propertyName ?? -1));
    if (!definition) {
      return entry;
    }
    return {
      ...entry,
      ...(definition.label ? { propertyLabel: definition.label } : {}),
      propertyDefinitionSource2daRow: definition.propertyName,
      propertyDefinitionSourceKey: definition.sourceKey,
      ...(definition.subTypeTable ? { subTypeTable: definition.subTypeTable } : {}),
      ...(definition.costTableDefinition
        ? { costTableDefinition: definition.costTableDefinition }
        : {}),
      ...(definition.param1Table ? { param1Table: definition.param1Table } : {}),
      ...(definition.nameStrRef !== undefined ? { nameStrRef: definition.nameStrRef } : {}),
      ...(definition.gameStrRef !== undefined ? { gameStrRef: definition.gameStrRef } : {}),
      ...(definition.descriptionStrRef !== undefined
        ? { descriptionStrRef: definition.descriptionStrRef }
        : {})
    };
  });
}

function collectItemPropertyDefinitionFingerprints(
  entries: ParsedItemPropertyListEntry[] | undefined,
  itemPropertyDefinitionLookup: ReadonlyMap<number, ItemPropertyDefinitionLookupEntry>
): string[] {
  if (!entries || entries.length === 0) {
    return [];
  }
  const fingerprints: string[] = [];
  const seen = new Set<number>();
  for (const entry of entries) {
    if (!Number.isInteger(entry.propertyName ?? Number.NaN)) {
      continue;
    }
    const propertyName = Math.trunc(entry.propertyName ?? -1);
    if (seen.has(propertyName)) {
      continue;
    }
    seen.add(propertyName);
    const definition = itemPropertyDefinitionLookup.get(propertyName);
    if (definition) {
      fingerprints.push(definition.sourceFingerprint);
    }
  }
  return fingerprints;
}

function enrichCreatureItemReferenceEntries<T extends { resRef?: string }>(
  entries: T[] | undefined,
  itemTemplateReferenceLookup: ReadonlyMap<string, ItemTemplateReferenceLookupEntry>,
  itemBaseItemLookup: ReadonlyMap<number, ItemBaseItemLookupEntry>
):
  | Array<
      T & {
        itemTemplateId?: string;
        itemResref?: string;
        itemSourceFingerprint?: string;
        itemSourceObjectKey?: string;
        itemBaseItem?: number;
        itemBaseItemEquipableSlots?: string;
        itemTemplateMetadata?: Record<string, string | number | boolean>;
      }
    >
  | undefined {
  if (!entries) {
    return undefined;
  }
  return entries.map((entry) => {
    const itemReference = resolveItemTemplateReference(entry.resRef, itemTemplateReferenceLookup);
    if (!itemReference) {
      return entry;
    }
    const itemBaseItem =
      typeof itemReference.metadata.baseItem === "number" &&
      Number.isFinite(itemReference.metadata.baseItem)
        ? Math.trunc(itemReference.metadata.baseItem)
        : undefined;
    const baseItemLookup =
      itemBaseItem !== undefined ? itemBaseItemLookup.get(itemBaseItem) : undefined;
    const itemBaseItemEquipableSlots =
      typeof itemReference.metadata.baseItemEquipableSlots === "string" &&
      itemReference.metadata.baseItemEquipableSlots.trim().length > 0
        ? itemReference.metadata.baseItemEquipableSlots.trim()
        : typeof baseItemLookup?.equipableSlots === "string" &&
            baseItemLookup.equipableSlots.trim().length > 0
          ? baseItemLookup.equipableSlots.trim()
        : undefined;
    return {
      ...entry,
      itemTemplateId: itemReference.templateId,
      itemResref: itemReference.resref,
      itemSourceFingerprint: itemReference.sourceFingerprint,
      itemSourceObjectKey: itemReference.sourceObjectKey,
      ...(itemBaseItem !== undefined ? { itemBaseItem } : {}),
      ...(itemBaseItemEquipableSlots ? { itemBaseItemEquipableSlots } : {}),
      itemTemplateMetadata: itemReference.metadata
    };
  });
}

function enrichCreatureClassEntries<
  T extends {
    classId?: number;
    knownSpells?: Array<{ spellId?: number }>;
    memorizedSpells?: Array<{ spellId?: number }>;
  }
>(
  entries: T[] | undefined,
  creatureClassLabelLookup: ReadonlyMap<number, CreatureClassLabelLookupEntry>,
  creatureSpellLabelLookup: ReadonlyMap<number, CreatureSpellLabelLookupEntry>
):
  | Array<
      T & {
        classLabel?: string;
        classLabelSource2daRow?: number;
        classLabelSourceKey?: string;
      }
    >
  | undefined {
  if (!entries) {
    return undefined;
  }
  return entries.map((entry) => {
    const classLabel = Number.isInteger(entry.classId ?? Number.NaN)
      ? creatureClassLabelLookup.get(Math.trunc(entry.classId ?? -1))
      : undefined;
    const knownSpells = enrichCreatureSpellReferenceEntries(
      entry.knownSpells,
      creatureSpellLabelLookup
    );
    const memorizedSpells = enrichCreatureSpellReferenceEntries(
      entry.memorizedSpells,
      creatureSpellLabelLookup
    );
    return {
      ...entry,
      ...(classLabel
        ? {
            classLabel: classLabel.classLabel,
            classLabelSource2daRow: classLabel.classRowId,
            classLabelSourceKey: classLabel.classSourceKey
          }
        : {}),
      ...(knownSpells ? { knownSpells } : {}),
      ...(memorizedSpells ? { memorizedSpells } : {})
    };
  });
}

function enrichCreatureSpellReferenceEntries<T extends { spellId?: number }>(
  entries: T[] | undefined,
  creatureSpellLabelLookup: ReadonlyMap<number, CreatureSpellLabelLookupEntry>
):
  | Array<
      T & {
        spellLabel?: string;
        spellLabelSource2daRow?: number;
        spellLabelSourceKey?: string;
      }
    >
  | undefined {
  if (!entries) {
    return undefined;
  }
  return entries.map((entry) => {
    if (!Number.isInteger(entry.spellId ?? Number.NaN)) {
      return entry;
    }
    const spellLabel = creatureSpellLabelLookup.get(Math.trunc(entry.spellId ?? -1));
    if (!spellLabel) {
      return entry;
    }
    return {
      ...entry,
      spellLabel: spellLabel.spellLabel,
      spellLabelSource2daRow: spellLabel.spellRowId,
      spellLabelSourceKey: spellLabel.spellSourceKey
    };
  });
}

function enrichCreatureSkillEntries<T extends { rank?: number }>(
  entries: T[] | undefined,
  creatureSkillLabelLookup: ReadonlyMap<number, CreatureSkillLabelLookupEntry>
):
  | Array<
      T & {
        skillId: number;
        skillLabel?: string;
        skillLabelSource2daRow?: number;
        skillLabelSourceKey?: string;
      }
    >
  | undefined {
  if (!entries) {
    return undefined;
  }
  return entries.map((entry, index) => {
    const skillLabel = creatureSkillLabelLookup.get(index);
    return {
      ...entry,
      skillId: index,
      ...(skillLabel
        ? {
            skillLabel: skillLabel.skillLabel,
            skillLabelSource2daRow: skillLabel.skillRowId,
            skillLabelSourceKey: skillLabel.skillSourceKey
          }
        : {})
    };
  });
}

function enrichCreatureFeatEntries<T extends { featId?: number }>(
  entries: T[] | undefined,
  creatureFeatLabelLookup: ReadonlyMap<number, CreatureFeatLabelLookupEntry>
):
  | Array<
      T & {
        featLabel?: string;
        featLabelSource2daRow?: number;
        featLabelSourceKey?: string;
      }
    >
  | undefined {
  if (!entries) {
    return undefined;
  }
  return entries.map((entry) => {
    if (!Number.isInteger(entry.featId ?? Number.NaN)) {
      return entry;
    }
    const featLabel = creatureFeatLabelLookup.get(Math.trunc(entry.featId ?? -1));
    if (!featLabel) {
      return entry;
    }
    return {
      ...entry,
      featLabel: featLabel.featLabel,
      featLabelSource2daRow: featLabel.featRowId,
      featLabelSourceKey: featLabel.featSourceKey
    };
  });
}

function buildTemplateProcessingSourceFingerprint(
  record: TemplateRecord,
  candidate: TemplateCandidate,
  itemTemplateReferenceLookup: ReadonlyMap<string, ItemTemplateReferenceLookupEntry>
): string {
  if (record.kind !== "creature") {
    return candidate.sourceFingerprint;
  }
  const itemReferences = collectCreatureItemTemplateReferences(
    candidate,
    itemTemplateReferenceLookup
  );
  return buildSourceFingerprint([
    "creature",
    candidate.sourceFingerprint,
    buildTemplateRecordMetadataFingerprint(record.metadata),
    ...itemReferences.map((entry) =>
      [entry.templateId, entry.resref, entry.sourceFingerprint].join(":")
    )
  ]);
}

function buildTemplateRecordMetadataFingerprint(
  metadata: TemplateRecord["metadata"]
): string {
  return buildSourceFingerprint([
    "template-record-metadata",
    ...Object.keys(metadata)
      .sort((left, right) => left.localeCompare(right))
      .map((key) => `${key}=${String(metadata[key])}`)
  ]);
}

function collectCreatureItemTemplateReferences(
  candidate: TemplateCandidate,
  itemTemplateReferenceLookup: ReadonlyMap<string, ItemTemplateReferenceLookupEntry>
): ItemTemplateReferenceLookupEntry[] {
  if (candidate.kind !== "creature") {
    return [];
  }
  const entries = [
    ...(candidate.parsedBlueprint?.inventoryItemListEntries ?? []),
    ...(candidate.parsedBlueprint?.equipItemListEntries ?? [])
  ];
  const byTemplateId = new Map<string, ItemTemplateReferenceLookupEntry>();
  for (const entry of entries) {
    const itemReference = resolveItemTemplateReference(
      entry.resRef,
      itemTemplateReferenceLookup
    );
    if (itemReference && !byTemplateId.has(itemReference.templateId)) {
      byTemplateId.set(itemReference.templateId, itemReference);
    }
  }
  return [...byTemplateId.values()].sort((left, right) =>
    left.templateId.localeCompare(right.templateId)
  );
}

function resolveItemTemplateReference(
  resRef: string | undefined,
  itemTemplateReferenceLookup: ReadonlyMap<string, ItemTemplateReferenceLookupEntry>
): ItemTemplateReferenceLookupEntry | undefined {
  const normalized = normalizeLookupRef(resRef);
  if (!normalized) {
    return undefined;
  }
  return itemTemplateReferenceLookup.get(normalized);
}

const EMPTY_TEMPLATE_TALK_TABLE_LOOKUP: TemplateTalkTableLookup = {
  resolve: () => undefined
};

const CUSTOM_TLK_STRREF_BASE = 0x01000000;
const TLK_HEADER_SIZE = 20;
const TLK_ENTRY_SIZE = 40;

function collectEffectivePlaceablesTwoDaStrRefs(
  sources: readonly LoadedPlaceablesTwoDaSource[],
): number[] {
  return sources.flatMap((source) =>
    source.appearanceRows.flatMap((row) => row.strRef === undefined ? [] : [row.strRef])
  );
}

async function buildTemplateTalkTableLookup(
  paths: RuntimePathSettings,
  candidates: TemplateCandidate[],
  additionalStrRefs: number[],
  logger: Logger
): Promise<TemplateTalkTableLookup> {
  const strRefs = collectTemplateTalkTableStrRefs(candidates, additionalStrRefs);
  if (strRefs.length === 0) {
    return EMPTY_TEMPLATE_TALK_TABLE_LOOKUP;
  }

  const baseRequests = strRefs
    .filter((strRef) => strRef < CUSTOM_TLK_STRREF_BASE)
    .map((strRef) => ({ strRef, index: strRef }));
  const customRequests = strRefs
    .filter((strRef) => strRef >= CUSTOM_TLK_STRREF_BASE)
    .map((strRef) => ({ strRef, index: strRef - CUSTOM_TLK_STRREF_BASE }));

  const [baseStrings, customStrings] = await Promise.all([
    readTalkTableStrings(paths.tlkBasePath, baseRequests, "base", logger),
    readTalkTableStrings(paths.tlkCustomPath, customRequests, "custom", logger)
  ]);

  if (baseStrings.size === 0 && customStrings.size === 0) {
    return EMPTY_TEMPLATE_TALK_TABLE_LOOKUP;
  }

  return {
    resolve: (strRef) => {
      if (!isValidTalkTableStrRef(strRef)) {
        return undefined;
      }
      if (strRef >= CUSTOM_TLK_STRREF_BASE) {
        return customStrings.get(strRef);
      }
      return baseStrings.get(strRef);
    }
  };
}

function collectTemplateTalkTableStrRefs(
  candidates: TemplateCandidate[],
  additionalStrRefs: number[] = []
): number[] {
  const refs = new Set<number>();
  for (const strRef of additionalStrRefs) {
    if (isValidTalkTableStrRef(strRef)) {
      refs.add(strRef);
    }
  }
  for (const candidate of candidates) {
    const blueprint = candidate.parsedBlueprint;
    if (!blueprint) {
      continue;
    }
    for (const strRef of [
      blueprint.firstNameStrRef,
      blueprint.lastNameStrRef,
      blueprint.localizedNameStrRef,
      blueprint.descriptionStrRef,
      blueprint.identifiedDescriptionStrRef,
      blueprint.subraceStrRef,
      blueprint.deityStrRef
    ]) {
      if (isValidTalkTableStrRef(strRef)) {
        refs.add(strRef);
      }
    }
  }
  return [...refs].sort((left, right) => left - right);
}

function collectCreatureClassTalkTableStrRefs(
  sources: LoadedCreatureClassTwoDaSource[]
): number[] {
  const refs = new Set<number>();
  for (const source of sources) {
    for (const row of source.rows) {
      if (isValidTalkTableStrRef(row.nameStrRef)) {
        refs.add(row.nameStrRef);
      }
    }
  }
  return [...refs].sort((left, right) => left - right);
}

function collectEffectiveCreatureAppearanceTwoDaStrRefs(
  sources: readonly LoadedCreatureAppearanceTwoDaSource[],
): number[] {
  const refs = new Set<number>();
  for (const source of sources) {
    for (const row of source.appearanceRows) {
      if (isValidTalkTableStrRef(row.strRef)) {
        refs.add(row.strRef);
      }
    }
  }
  return [...refs].sort((left, right) => left - right);
}

async function readTalkTableStrings(
  filePath: string | undefined,
  requests: Array<{ strRef: number; index: number }>,
  sourceKind: "base" | "custom",
  logger: Logger
): Promise<Map<number, TemplateTalkTableResolvedString>> {
  const resolved = new Map<number, TemplateTalkTableResolvedString>();
  const normalizedPath = filePath?.trim();
  if (!normalizedPath || requests.length === 0) {
    return resolved;
  }

  let bytes: Buffer;
  try {
    bytes = await readFile(normalizedPath);
  } catch (error) {
    logger.warn(`Unable to read ${sourceKind} TLK at ${normalizedPath}: ${String(error)}`);
    return resolved;
  }

  if (!isRangeWithinBuffer(bytes, 0, TLK_HEADER_SIZE)) {
    logger.warn(`Unable to read ${sourceKind} TLK at ${normalizedPath}: header is truncated.`);
    return resolved;
  }

  const signature = bytes.subarray(0, 8).toString("ascii");
  if (signature !== "TLK V3.0") {
    logger.warn(`Unable to read ${sourceKind} TLK at ${normalizedPath}: unsupported signature.`);
    return resolved;
  }

  const stringCount = bytes.readUInt32LE(12);
  const stringDataOffset = bytes.readUInt32LE(16);
  for (const request of requests) {
    if (request.index < 0 || request.index >= stringCount) {
      continue;
    }
    const entryOffset = TLK_HEADER_SIZE + request.index * TLK_ENTRY_SIZE;
    if (!isRangeWithinBuffer(bytes, entryOffset, TLK_ENTRY_SIZE)) {
      continue;
    }
    const textOffset = bytes.readUInt32LE(entryOffset + 28);
    const textSize = bytes.readUInt32LE(entryOffset + 32);
    const textStart = stringDataOffset + textOffset;
    if (!isRangeWithinBuffer(bytes, textStart, textSize)) {
      continue;
    }
    const text = sanitizeTalkTableText(bytes.subarray(textStart, textStart + textSize));
    if (!text) {
      continue;
    }
    resolved.set(request.strRef, {
      text,
      strRef: request.strRef,
      sourceKind,
      sourcePath: normalizedPath
    });
  }

  return resolved;
}

function resolveCandidateTalkTableFields(
  candidate: TemplateCandidate,
  lookup: TemplateTalkTableLookup
): TemplateCandidate {
  const blueprint = candidate.parsedBlueprint;
  if (!blueprint) {
    return candidate;
  }

  const firstName = resolveTalkTableText(blueprint.firstName, blueprint.firstNameStrRef, lookup);
  const lastName = resolveTalkTableText(blueprint.lastName, blueprint.lastNameStrRef, lookup);
  const localizedName = resolveTalkTableText(
    blueprint.localizedName,
    blueprint.localizedNameStrRef,
    lookup
  );
  const description = resolveTalkTableText(
    blueprint.description,
    blueprint.descriptionStrRef,
    lookup
  );
  const identifiedDescription = resolveTalkTableText(
    blueprint.identifiedDescription,
    blueprint.identifiedDescriptionStrRef,
    lookup
  );
  const subrace = resolveTalkTableText(blueprint.subrace, blueprint.subraceStrRef, lookup);
  const deity = resolveTalkTableText(blueprint.deity, blueprint.deityStrRef, lookup);
  const displayName =
    localizedName ?? buildResolvedCreatureDisplayName(firstName, lastName) ?? blueprint.displayName;

  if (
    firstName === blueprint.firstName &&
    lastName === blueprint.lastName &&
    localizedName === blueprint.localizedName &&
    displayName === blueprint.displayName &&
    description === blueprint.description &&
    identifiedDescription === blueprint.identifiedDescription &&
    subrace === blueprint.subrace &&
    deity === blueprint.deity
  ) {
    return candidate;
  }

  return {
    ...candidate,
    parsedBlueprint: {
      ...blueprint,
      firstName,
      lastName,
      localizedName,
      displayName,
      description,
      identifiedDescription,
      subrace,
      deity
    }
  };
}

function resolveTalkTableText(
  currentValue: string | undefined,
  strRef: number | undefined,
  lookup: TemplateTalkTableLookup
): string | undefined {
  if (currentValue && currentValue.trim().length > 0) {
    return currentValue;
  }
  return lookup.resolve(strRef)?.text;
}

function buildResolvedCreatureDisplayName(
  firstName?: string,
  lastName?: string
): string | undefined {
  const combined = [firstName, lastName]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ")
    .trim();
  return combined.length > 0 ? combined : undefined;
}

function isValidTalkTableStrRef(value: number | undefined): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value !== 0xffffffff
  );
}

function isRangeWithinBuffer(bytes: Buffer, offset: number, length: number): boolean {
  return offset >= 0 && length >= 0 && offset + length <= bytes.length;
}

function sanitizeTalkTableText(bytes: Buffer): string | undefined {
  const text = bytes.toString("latin1").replace(/\0/gu, "").trim();
  return text.length > 0 ? text : undefined;
}

function resolveTemplateName(candidate: TemplateCandidate, fallbackResref: string): string {
  const fromBlueprint = candidate.parsedBlueprint?.displayName;
  if (fromBlueprint && fromBlueprint.trim().length > 0) {
    return fromBlueprint.trim();
  }
  const fromTwoDa = candidate.placeables2daRow?.label;
  if (fromTwoDa && fromTwoDa.trim().length > 0) {
    return fromTwoDa.trim();
  }
  return humanizeName(fallbackResref);
}

function pickBenchmarkTemplateIds(
  candidates: TemplateCandidate[],
  kind: TemplateKind
): Set<string> {
  const filtered = candidates
    .filter((candidate) => candidate.kind === kind)
    .sort((left, right) => right.sourceSize - left.sourceSize);
  const count =
    filtered.length === 0 ? 0 : Math.min(10, Math.max(1, Math.ceil(filtered.length * 0.2)));
  return new Set(filtered.slice(0, count).map((candidate) => candidate.resref));
}

function classifyTemplateKind(extension: string): TemplateKind {
  if (extension === "utc") {
    return "creature";
  }
  if (extension === "uti") {
    return "item";
  }
  if (extension === "ute") {
    return "encounter";
  }
  if (extension === "utm") {
    return "store";
  }
  if (extension === "utw") {
    return "waypoint";
  }
  return "placeable";
}

function buildCreatureTemplateSourceSyncAttemptKey(
  settings: RuntimeSettingsRecord,
  objects: ModuleBlobObjectSummary[]
): string | null {
  const source = settings.sources.creature;
  if (!source || (!source.includeHaks && !source.includeVanilla)) {
    return null;
  }

  const missingLayers: string[] = [];
  if (
    source.includeVanilla &&
    !objects.some((object) => isSourceBackedCreatureTemplateKey(object.key, "vanilla"))
  ) {
    missingLayers.push("vanilla");
  }
  if (
    source.includeHaks &&
    !objects.some((object) => isSourceBackedCreatureTemplateKey(object.key, "hak"))
  ) {
    missingLayers.push("hak");
  }

  if (missingLayers.length === 0) {
    return null;
  }

  return [
    settings.revision,
    settings.blobStorage.bucket,
    normalizePrefixForLookup(settings.blobStorage.modulePrefix),
    source.hakProfileId,
    source.hakPriorityList.join(","),
    missingLayers.join(",")
  ].join("|");
}

function buildItemTemplateSourceSyncAttemptKey(
  settings: RuntimeSettingsRecord,
  objects: ModuleBlobObjectSummary[]
): string | null {
  const source = settings.sources.item;
  if (!source || (!source.includeHaks && !source.includeVanilla)) {
    return null;
  }

  const missingLayers: string[] = [];
  if (
    source.includeVanilla &&
    !objects.some((object) => isSourceBackedItemTemplateKey(object.key, "vanilla"))
  ) {
    missingLayers.push("vanilla");
  }
  if (
    source.includeHaks &&
    !objects.some((object) => isSourceBackedItemTemplateKey(object.key, "hak"))
  ) {
    missingLayers.push("hak");
  }

  if (missingLayers.length === 0) {
    return null;
  }

  return [
    settings.revision,
    settings.blobStorage.bucket,
    normalizePrefixForLookup(settings.blobStorage.modulePrefix),
    source.hakProfileId,
    source.hakPriorityList.join(","),
    missingLayers.join(",")
  ].join("|");
}

function isSourceBackedCreatureTemplateKey(
  key: string,
  sourceLayer: "hak" | "vanilla"
): boolean {
  const normalized = key.replace(/\\/gu, "/").toLowerCase();
  return normalized.includes(`/__aurora/sources/${sourceLayer}/`) && normalized.endsWith(".utc");
}

function isSourceBackedItemTemplateKey(
  key: string,
  sourceLayer: "hak" | "vanilla"
): boolean {
  const normalized = key.replace(/\\/gu, "/").toLowerCase();
  return normalized.includes(`/__aurora/sources/${sourceLayer}/`) && normalized.endsWith(".uti");
}

function inferPlaceableSubtype(candidate: TemplateCandidate): PlaceableSubtype {
  if (candidate.extension === "utd") {
    return "door";
  }

  const blueprint = candidate.parsedBlueprint;
  const searchable = [
    candidate.resref,
    extractFileName(candidate.sourceKey),
    candidate.placeables2daRow?.label,
    blueprint?.tag,
    blueprint?.templateResRef,
    blueprint?.modelResRef,
    blueprint?.displayName,
    blueprint?.localizedName,
    blueprint?.description,
    ...(blueprint?.dependencyRefs ?? [])
  ]
    .filter((value): value is string => Boolean(value && value.length > 0))
    .join("|")
    .toLowerCase();

  if (DOOR_PATTERN.test(searchable)) {
    return "door";
  }
  if ((blueprint?.vfxEvidence.length ?? 0) > 0 || VFX_PATTERN.test(searchable)) {
    return "vfx";
  }
  if (blueprint?.bodyBag || REMAINS_PATTERN.test(searchable)) {
    return "generic";
  }
  if (blueprint?.hasInventory || CONTAINER_PATTERN.test(searchable)) {
    return "container";
  }
  if (
    candidate.placeables2daRow?.lightColorRaw ||
    (blueprint?.lightState ?? 0) > 0 ||
    LIGHT_PATTERN.test(searchable)
  ) {
    return "light_source";
  }
  if (isTriggerProxyBlueprint(blueprint) || TRIGGER_PATTERN.test(searchable)) {
    return "trigger_proxy";
  }
  return "generic";
}

function isReservedPlaceablesTwoDaPlaceholder(candidate: TemplateCandidate): boolean {
  if (candidate.kind !== "placeable" || !candidate.placeables2daRow) {
    return false;
  }
  const modelResRef = candidate.placeables2daRow.modelResRef.trim().toLowerCase();
  return isNonRenderablePlaceablesTwoDaModelResRef(modelResRef);
}

function isTriggerProxyBlueprint(blueprint?: ParsedTemplateBlueprint): boolean {
  if (!blueprint) {
    return false;
  }
  const labels = Object.keys(blueprint.scripts);
  return labels.some((label) => TRIGGER_PATTERN.test(label));
}

function inferCategory(
  candidate: TemplateCandidate,
  placeableSubtype: PlaceableSubtype | undefined
): string {
  if (candidate.kind === "placeable") {
    if (placeableSubtype === "door") {
      return "door";
    }
    if (placeableSubtype === "vfx") {
      return "effects";
    }
  }

  const normalized = candidate.sourceKey.toLowerCase();
  if (candidate.kind === "creature") {
    if (normalized.includes("undead")) {
      return "undead";
    }
    if (normalized.includes("beast") || normalized.includes("animal")) {
      return "beast";
    }
    return "creature";
  }
  if (candidate.kind === "item") {
    if (normalized.includes("weapon")) {
      return "weapon";
    }
    if (normalized.includes("armor")) {
      return "armor";
    }
    return "item";
  }
  if (candidate.kind === "encounter") {
    return "encounter";
  }
  if (candidate.kind === "waypoint") {
    return "waypoint";
  }

  if (normalized.includes("urban") || normalized.includes("city")) {
    return "urban";
  }
  if (normalized.includes("dungeon")) {
    return "dungeon";
  }
  if (normalized.includes("forest")) {
    return "forest";
  }
  return "placeable";
}

function buildTags(
  candidate: TemplateCandidate,
  subtype: PlaceableSubtype | undefined
): string[] {
  const tags = new Set<string>();
  tags.add(candidate.kind);
  tags.add(candidate.extension);
  if (subtype) {
    tags.add(subtype);
  }

  for (const segment of candidate.sourceKey.replace(/\\/gu, "/").toLowerCase().split("/")) {
    if (segment.length >= 3 && segment.length <= 24 && /^[a-z0-9_-]+$/u.test(segment)) {
      tags.add(segment);
    }
  }

  for (const token of candidate.resref.split(/[_-]+/u)) {
    if (token.length >= 3 && token.length <= 24) {
      tags.add(token);
    }
  }

  for (const token of (candidate.parsedBlueprint?.dependencyRefs ?? []).flatMap((value) =>
    value.toLowerCase().split(/[_-]+/u)
  )) {
    if (token.length >= 3 && token.length <= 24 && /^[a-z0-9]+$/u.test(token)) {
      tags.add(token);
    }
  }

  return [...tags].slice(0, 16);
}

function buildBenchmarkBucket(
  kind: TemplateKind,
  subtype: PlaceableSubtype | undefined
): string {
  if (kind === "placeable") {
    if (subtype === "door") {
      return "door_heavy_candidate";
    }
    if (subtype === "vfx") {
      return "placeable_vfx_candidate";
    }
    return "placeable_heavy_candidate";
  }
  return `${kind}_heavy_candidate`;
}

function buildTemplateId(kind: TemplateKind, resref: string): string {
  if (kind === "placeable") {
    return `plc_${resref}`.slice(0, 80);
  }
  if (kind === "creature") {
    return `cre_${resref}`.slice(0, 80);
  }
  if (kind === "encounter") {
    return `enc_${resref}`.slice(0, 80);
  }
  if (kind === "waypoint") {
    return `wpt_${resref}`.slice(0, 80);
  }
  return `itm_${resref}`.slice(0, 80);
}

function buildTemplateSearchableText(template: TemplateRecord): string {
  return [template.name, template.templateId, template.resref, ...template.tags]
    .join("|")
    .toLowerCase();
}

function deduplicateIndexedTemplatesById(items: IndexedTemplate[]): IndexedTemplate[] {
  const byTemplateId = new Map<string, IndexedTemplate>();
  for (const item of items) {
    const key = buildTemplateIdIndexKey(item.record.kind, item.record.templateId);
    if (byTemplateId.has(key)) {
      byTemplateId.delete(key);
    }
    byTemplateId.set(key, item);
  }
  return [...byTemplateId.values()];
}

function buildTemplateIdIndexKey(kind: TemplateKind, templateId: string): string {
  return `${kind}:${templateId}`;
}

function buildTemplateResrefIndexKey(kind: TemplateKind, resref: string): string {
  return `${kind}:${resref.trim().toLowerCase()}`;
}

function buildPlaceableProcessingIndexKey(templateId: string, subtype: PlaceableSubtype): string {
  return `${templateId}:${subtype}`;
}

function buildTemplateProcessingIndexKey(
  kind: Exclude<TemplateKind, "placeable">,
  templateId: string
): string {
  return `${kind}:${templateId}`;
}

function extractFileName(key: string): string {
  const normalized = key.replace(/\\/gu, "/");
  const segments = normalized.split("/");
  return segments[segments.length - 1] ?? normalized;
}

function extractExtension(fileName: string): string {
  const normalized = fileName.trim().toLowerCase();
  const index = normalized.lastIndexOf(".");
  if (index <= 0) {
    return "";
  }
  return normalized.slice(index + 1);
}

function extractBasename(fileName: string): string {
  const normalized = fileName.trim().toLowerCase();
  const index = normalized.lastIndexOf(".");
  if (index <= 0) {
    return normalized;
  }
  return normalized.slice(0, index);
}

function normalizeResref(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]+/gu, "_").slice(0, 64);
}

function normalizeLookupRef(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = normalizeResref(value);
  if (!normalized || !/[a-z0-9]/u.test(normalized)) {
    return undefined;
  }
  return normalized;
}

function normalizeItemBaseModelType(value: string | undefined): string | undefined {
  const normalized = normalizeLookupRef(value);
  if (!normalized || /^\d+$/u.test(normalized)) {
    return undefined;
  }
  return normalized;
}

function normalizeRenderablePlaceableModelRef(value: string | undefined): string | undefined {
  const normalized = normalizeLookupRef(value);
  if (!normalized || isNonRenderablePlaceablesTwoDaModelResRef(normalized)) {
    return undefined;
  }
  return normalized;
}

function isNonRenderablePlaceablesTwoDaModelResRef(value: string): boolean {
  const normalized = normalizeResref(value);
  return normalized === "user" || normalized === "reserved" || normalized.endsWith("_reserved");
}

function isNwicPlaceablesTwoDaUserRowAlias(
  sourceRow: ParsedPlaceablesTwoDaRow,
  requestedRow: ParsedPlaceablesTwoDaRow | undefined
): boolean {
  if (!requestedRow) {
    return false;
  }
  const requestedModel = normalizeResref(requestedRow.modelResRef);
  if (requestedModel !== "user") {
    return false;
  }

  const sourceModel = normalizeRenderablePlaceableModelRef(sourceRow.modelResRef);
  if (!sourceModel?.startsWith("nwp_")) {
    return false;
  }

  return /^nwic:/iu.test(sourceRow.label?.trim() ?? "");
}

function isPlaceablesTwoDaMinus100Alias(
  sourceRow: ParsedPlaceablesTwoDaRow,
  requestedRow: ParsedPlaceablesTwoDaRow | undefined
): boolean {
  if (!sourceRow.label?.trim()) {
    return false;
  }
  if (!normalizeRenderablePlaceableModelRef(sourceRow.modelResRef)) {
    return false;
  }
  return !requestedRow || !normalizeRenderablePlaceableModelRef(requestedRow.modelResRef);
}

function resolvePlaceableInstanceMinus100Lookup(
  appearanceType: number,
  directLookup: PlaceableAppearanceModelLookupEntry,
  lookupByRowId: ReadonlyMap<number, PlaceableAppearanceModelLookupEntry> | undefined,
  context: PlaceableAppearanceModelLookupContext | undefined
): PlaceableAppearanceModelLookupEntry | null {
  if (directLookup.resolutionPath !== "direct" || !lookupByRowId || !context) {
    return null;
  }
  if (directLookup.sourceRowId !== undefined) {
    return null;
  }

  const sourceLookup = lookupByRowId.get(appearanceType - PLACEABLES_TWO_DA_NWIC_USER_ROW_OFFSET);
  if (!sourceLookup || sourceLookup.resolutionPath !== "direct") {
    return null;
  }
  if (!sourceLookup.label || sourceLookup.modelResRef === directLookup.modelResRef) {
    return null;
  }

  const sourceScore = scorePlaceablesTwoDaLabelAgainstInstanceContext(
    sourceLookup.label,
    context
  );
  const directScore = scorePlaceablesTwoDaLabelAgainstInstanceContext(
    directLookup.label,
    context
  );
  if (sourceScore < 1 || sourceScore <= directScore) {
    return null;
  }
  if (sourceScore < 2 && directScore > 0) {
    return null;
  }

  return {
    modelResRef: sourceLookup.modelResRef,
    ...(sourceLookup.label ? { label: sourceLookup.label } : {}),
    rowId: sourceLookup.rowId,
    requestedRowId: appearanceType,
    sourceKey: sourceLookup.sourceKey,
    resolutionPath: "placeables-instance-row-minus-100"
  };
}

function scorePlaceablesTwoDaLabelAgainstInstanceContext(
  label: string | undefined,
  context: PlaceableAppearanceModelLookupContext
): number {
  if (!label) {
    return 0;
  }

  const contextTokens = tokenizePlaceableInstanceAliasText(
    [
      context.localizedName,
      context.description,
      context.tag,
      context.templateId,
      context.resref
    ]
      .filter(Boolean)
      .join(" ")
  );
  if (contextTokens.size === 0) {
    return 0;
  }

  let textScore = 0;
  let numericScore = 0;
  for (const token of tokenizePlaceableInstanceAliasText(label)) {
    if (isWeakPlaceableInstanceAliasToken(token)) {
      continue;
    }
    if (contextTokens.has(token)) {
      if (/^\d+$/u.test(token)) {
        numericScore += 2;
      } else {
        textScore += 1;
      }
      continue;
    }
    if (
      token.length >= 4 &&
      [...contextTokens].some(
        (contextToken) => contextToken.includes(token) || token.includes(contextToken)
      )
    ) {
      textScore += 1;
    }
  }
  return textScore > 0 ? textScore + numericScore : 0;
}

function tokenizePlaceableInstanceAliasText(value: string): Set<string> {
  const spaced = value
    .replace(/([a-z0-9])([A-Z])/gu, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/gu, "$1 $2")
    .toLowerCase();
  const tokens = spaced.match(/[a-z0-9]+/gu) ?? [];
  return new Set(
    tokens
      .filter((token) => token.length > 1 || /^\d+$/u.test(token))
      .flatMap((token) => [token, ...(PLACEABLE_INSTANCE_ALIAS_TOKEN_EQUIVALENTS.get(token) ?? [])])
  );
}

function isWeakPlaceableInstanceAliasToken(token: string): boolean {
  return PLACEABLE_INSTANCE_ALIAS_STOP_TOKENS.has(token);
}

function dedupeNormalizedLookupRefs(values: readonly (string | undefined)[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const normalized = normalizeLookupRef(value);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    output.push(normalized);
  }

  return output;
}

function collectPlaceables2daKeys(
  objects: ModuleBlobObjectSummary[],
  settings: RuntimeSettingsRecord,
  resolvedHakPriorityList?: readonly string[]
): string[] {
  return collectPlaceableEffectiveTwoDaKeys(
    objects,
    settings,
    "placeables.2da",
    resolvedHakPriorityList,
  );
}

function collectCreatureAppearance2daKeys(
  objects: ModuleBlobObjectSummary[],
  settings: RuntimeSettingsRecord,
  resolvedHakPriorityList?: readonly string[],
): string[] {
  return collectCreatureEffectiveTwoDaKeys(
    objects,
    settings,
    "appearance.2da",
    resolvedHakPriorityList,
  );
}

function collectCreatureEffectiveTwoDaKeys(
  objects: ModuleBlobObjectSummary[],
  settings: RuntimeSettingsRecord,
  tableFileName: string,
  resolvedHakPriorityList?: readonly string[],
): string[] {
  const normalizedHakOrder = buildCreatureTwoDaHakOrder(settings, resolvedHakPriorityList);
  const normalizedTableFileName = tableFileName.trim().toLowerCase();
  return objects
    .map((object) => object.key)
    .filter((key) => extractFileName(key).trim().toLowerCase() === normalizedTableFileName)
    .sort((left, right) => {
      const sourceDelta = resolvePlaceablesTwoDaSourcePriority(left, normalizedHakOrder) -
        resolvePlaceablesTwoDaSourcePriority(right, normalizedHakOrder);
      if (sourceDelta !== 0) return sourceDelta;
      const depthDelta = left.split("/").length - right.split("/").length;
      return depthDelta !== 0 ? depthDelta : left.localeCompare(right);
    });
}

function collectItemEffectiveTwoDaKeys(
  objects: ModuleBlobObjectSummary[],
  settings: RuntimeSettingsRecord,
  tableFileName: string,
  resolvedHakPriorityList?: readonly string[],
): string[] {
  const normalizedHakOrder = buildItemTwoDaHakOrder(settings, resolvedHakPriorityList);
  const normalizedTableFileName = tableFileName.trim().toLowerCase();
  return objects
    .map((object) => object.key)
    .filter((key) => extractFileName(key).trim().toLowerCase() === normalizedTableFileName)
    .sort((left, right) => {
      const sourceDelta = resolvePlaceablesTwoDaSourcePriority(left, normalizedHakOrder) -
        resolvePlaceablesTwoDaSourcePriority(right, normalizedHakOrder);
      if (sourceDelta !== 0) return sourceDelta;
      const depthDelta = left.split("/").length - right.split("/").length;
      return depthDelta !== 0 ? depthDelta : left.localeCompare(right);
    });
}

function collectPlaceableEffectiveTwoDaKeys(
  objects: ModuleBlobObjectSummary[],
  settings: RuntimeSettingsRecord,
  tableFileName: string,
  resolvedHakPriorityList?: readonly string[],
): string[] {
  const normalizedHakOrder = buildPlaceableTwoDaHakOrder(settings, resolvedHakPriorityList);
  const normalizedTableFileName = tableFileName.trim().toLowerCase();
  const keys = objects
    .map((object) => object.key)
    .filter((key) => extractFileName(key).trim().toLowerCase() === normalizedTableFileName);

  keys.sort((left, right) => {
    const sourceDelta =
      resolvePlaceablesTwoDaSourcePriority(left, normalizedHakOrder) -
      resolvePlaceablesTwoDaSourcePriority(right, normalizedHakOrder);
    if (sourceDelta !== 0) {
      return sourceDelta;
    }

    const depthDelta = left.split("/").length - right.split("/").length;
    if (depthDelta !== 0) {
      return depthDelta;
    }

    return left.localeCompare(right);
  });

  return keys;
}

function collectAreaEffectiveTwoDaKeys(
  objects: ModuleBlobObjectSummary[],
  settings: RuntimeSettingsRecord,
  tableFileName:
    | EffectiveAreaAudioTwoDaResourceName
    | EffectiveAreaVisualResourceName
    | "encdifficulty.2da"
    | "loadscreens.2da"
    | "waypoint.2da",
  resolvedHakPriorityList?: readonly string[],
): string[] {
  const normalizedHakOrder = buildAreaTwoDaHakOrder(settings, resolvedHakPriorityList);
  const normalizedTableFileName = tableFileName.toLowerCase();
  return objects
    .map((object) => object.key)
    .filter((key) => extractFileName(key).trim().toLowerCase() === normalizedTableFileName)
    .sort((left, right) => {
      const sourceDelta = resolvePlaceablesTwoDaSourcePriority(left, normalizedHakOrder) -
        resolvePlaceablesTwoDaSourcePriority(right, normalizedHakOrder);
      if (sourceDelta !== 0) return sourceDelta;
      const depthDelta = left.split("/").length - right.split("/").length;
      return depthDelta !== 0 ? depthDelta : left.localeCompare(right);
    });
}

function collectAreaEffectiveResourceKeys(
  objects: ModuleBlobObjectSummary[],
  resourceFileName: string,
  normalizedHakOrder: ReadonlyMap<string, number>,
): string[] {
  const normalizedResourceFileName = resourceFileName.trim().toLowerCase();
  return objects
    .map((object) => object.key)
    .filter((key) =>
      extractFileName(key).trim().toLowerCase() === normalizedResourceFileName
    )
    .sort((left, right) => {
      const sourceDelta = resolvePlaceablesTwoDaSourcePriority(
        left,
        normalizedHakOrder,
      ) - resolvePlaceablesTwoDaSourcePriority(right, normalizedHakOrder);
      if (sourceDelta !== 0) return sourceDelta;
      const depthDelta = left.split("/").length - right.split("/").length;
      return depthDelta !== 0 ? depthDelta : left.localeCompare(right);
    });
}

function collectTwoDaKeys(objects: ModuleBlobObjectSummary[], tableFileName: string): string[] {
  const normalizedTableFileName = tableFileName.trim().toLowerCase();
  const keys = objects
    .map((object) => object.key)
    .filter((key) => extractFileName(key).trim().toLowerCase() === normalizedTableFileName);

  keys.sort((left, right) => {
    const sourceDelta = resolveTwoDaSourcePriority(left) - resolveTwoDaSourcePriority(right);
    if (sourceDelta !== 0) {
      return sourceDelta;
    }

    const depthDelta = left.split("/").length - right.split("/").length;
    if (depthDelta !== 0) {
      return depthDelta;
    }

    return left.localeCompare(right);
  });

  return keys;
}

function buildPlaceableTwoDaHakOrder(
  settings: RuntimeSettingsRecord,
  resolvedHakPriorityList?: readonly string[]
): Map<string, number> {
  const placeableSource = settings.sources.placeable;
  const configuredHaks =
    resolvedHakPriorityList && resolvedHakPriorityList.length > 0
      ? resolvedHakPriorityList
      : placeableSource.hakPriorityList.length > 0
      ? placeableSource.hakPriorityList
      : settings.hakProfiles[placeableSource.hakProfileId] ?? [];
  const normalizedHaks = configuredHaks
    .map((entry) => normalizeHakSourceName(entry))
    .filter((entry) => entry.length > 0);
  return new Map(normalizedHaks.map((entry, index) => [entry, index]));
}

function buildCreatureTwoDaHakOrder(
  settings: RuntimeSettingsRecord,
  resolvedHakPriorityList?: readonly string[],
): Map<string, number> {
  const creatureSource = settings.sources.creature ?? settings.sources.placeable;
  const configuredHaks = resolvedHakPriorityList && resolvedHakPriorityList.length > 0
    ? resolvedHakPriorityList
    : creatureSource.hakPriorityList.length > 0
      ? creatureSource.hakPriorityList
      : settings.hakProfiles[creatureSource.hakProfileId] ?? [];
  const normalizedHaks = configuredHaks
    .map((entry) => normalizeHakSourceName(entry))
    .filter((entry) => entry.length > 0);
  return new Map(normalizedHaks.map((entry, index) => [entry, index]));
}

function buildItemTwoDaHakOrder(
  settings: RuntimeSettingsRecord,
  resolvedHakPriorityList?: readonly string[],
): Map<string, number> {
  const itemSource = settings.sources.item;
  const configuredHaks = resolvedHakPriorityList && resolvedHakPriorityList.length > 0
    ? resolvedHakPriorityList
    : itemSource?.hakPriorityList.length
      ? itemSource.hakPriorityList
      : itemSource
        ? settings.hakProfiles[itemSource.hakProfileId] ?? []
        : [];
  const normalizedHaks = configuredHaks
    .map((entry) => normalizeHakSourceName(entry))
    .filter((entry) => entry.length > 0);
  return new Map(normalizedHaks.map((entry, index) => [entry, index]));
}

function buildAreaTwoDaHakOrder(
  settings: RuntimeSettingsRecord,
  resolvedHakPriorityList?: readonly string[],
): Map<string, number> {
  const areaSource = settings.sources.area;
  const configuredHaks = resolvedHakPriorityList && resolvedHakPriorityList.length > 0
    ? resolvedHakPriorityList
    : areaSource.hakPriorityList.length > 0
      ? areaSource.hakPriorityList
      : settings.hakProfiles[areaSource.hakProfileId] ?? [];
  const normalizedHaks = configuredHaks
    .map((entry) => normalizeHakSourceName(entry))
    .filter((entry) => entry.length > 0);
  return new Map(normalizedHaks.map((entry, index) => [entry, index]));
}

function resolvePlaceablesTwoDaSourcePriority(
  objectKey: string,
  normalizedHakOrder: ReadonlyMap<string, number>
): number {
  const normalized = objectKey.replace(/\\/gu, "/").toLowerCase();
  if (!normalized.includes("/__aurora/sources/hak/") && !normalized.includes("/__aurora/sources/vanilla/")) {
    return 0;
  }
  const hakSourceName = extractHakSourceName(objectKey);
  if (hakSourceName) {
    const configuredIndex = normalizedHakOrder.get(hakSourceName);
    if (configuredIndex !== undefined) {
      return 100 + configuredIndex;
    }
    return 100 + normalizedHakOrder.size + 1_000;
  }
  if (normalized.includes("/__aurora/sources/")) {
    return 50_000;
  }
  return 100_000;
}

function resolveTwoDaSourcePriority(objectKey: string): number {
  const normalized = objectKey.replace(/\\/gu, "/").toLowerCase();
  if (normalized.includes("/__aurora/sources/vanilla/")) {
    return 0;
  }
  if (normalized.includes("/__aurora/sources/hak/")) {
    return 1;
  }
  if (normalized.includes("/__aurora/sources/")) {
    return 2;
  }
  return 3;
}

function resolveTemplateSourcePriority(objectKey: string): number {
  const normalized = objectKey.replace(/\\/gu, "/").toLowerCase();
  if (!normalized.includes("/__aurora/sources/")) {
    return 0;
  }
  if (normalized.includes("/__aurora/sources/hak/")) {
    return 1;
  }
  if (normalized.includes("/__aurora/sources/vanilla/")) {
    return 2;
  }
  return 3;
}

function extractHakSourceName(objectKey: string): string | null {
  const normalized = objectKey.replace(/\\/gu, "/").toLowerCase();
  const match = /\/__aurora\/sources\/hak\/([^/]+)\//u.exec(normalized);
  return match?.[1] ? normalizeHakSourceName(match[1]) : null;
}

function normalizeHakSourceName(value: string): string {
  const baseName = value.replace(/\\/gu, "/").split("/").pop()?.trim().toLowerCase() ?? "";
  return baseName.endsWith(".hak") ? baseName.slice(0, -4) : baseName;
}

function resolveTwoDaSourceLayer(objectKey: string): string {
  const normalized = objectKey.replace(/\\/gu, "/").toLowerCase();
  if (normalized.includes("/__aurora/sources/hak/")) {
    return "hak";
  }
  if (normalized.includes("/__aurora/sources/vanilla/")) {
    return "vanilla";
  }
  if (normalized.includes("/__aurora/sources/")) {
    return "external_fixture";
  }
  return "module";
}

function resolveEffectiveCreatureGenderSourceLayer(
  objectKey: string,
): EffectiveCreatureGenderTwoDaSourceLayer | null {
  const layer = resolveTwoDaSourceLayer(objectKey);
  return layer === "module" || layer === "hak" || layer === "vanilla"
    ? layer
    : null;
}

function resolveEffectiveCreatureAppendageSourceLayer(
  objectKey: string,
): EffectiveCreatureAppendageTwoDaSourceLayer | null {
  const layer = resolveTwoDaSourceLayer(objectKey);
  return layer === "module" || layer === "hak" || layer === "vanilla"
    ? layer
    : null;
}

function resolveEffectiveCreatureRacialTypesSourceLayer(
  objectKey: string,
): "module" | "hak" | "vanilla" | null {
  const layer = resolveTwoDaSourceLayer(objectKey);
  return layer === "module" || layer === "hak" || layer === "vanilla"
    ? layer
    : null;
}

function resolveEffectiveCreaturePerceptionRangesSourceLayer(
  objectKey: string,
): "module" | "hak" | "vanilla" | null {
  const layer = resolveTwoDaSourceLayer(objectKey);
  return layer === "module" || layer === "hak" || layer === "vanilla"
    ? layer
    : null;
}

function resolveEffectiveCreatureWalkRatesSourceLayer(
  objectKey: string,
): "module" | "hak" | "vanilla" | null {
  const layer = resolveTwoDaSourceLayer(objectKey);
  return layer === "module" || layer === "hak" || layer === "vanilla" ? layer : null;
}

function resolveEffectiveCreatureSoundSetsSourceLayer(
  objectKey: string,
): "module" | "hak" | "vanilla" | null {
  const layer = resolveTwoDaSourceLayer(objectKey);
  return layer === "module" || layer === "hak" || layer === "vanilla" ? layer : null;
}

function resolveEffectiveCreatureStartingPackagesSourceLayer(
  objectKey: string,
): "module" | "hak" | "vanilla" | null {
  const layer = resolveTwoDaSourceLayer(objectKey);
  return layer === "module" || layer === "hak" || layer === "vanilla" ? layer : null;
}

function resolveEffectiveCreatureClassesSourceLayer(
  objectKey: string,
): "module" | "hak" | "vanilla" | null {
  const layer = resolveTwoDaSourceLayer(objectKey);
  return layer === "module" || layer === "hak" || layer === "vanilla" ? layer : null;
}

function resolveEffectiveCreatureSkillsSourceLayer(
  objectKey: string,
): "module" | "hak" | "vanilla" | null {
  const layer = resolveTwoDaSourceLayer(objectKey);
  return layer === "module" || layer === "hak" || layer === "vanilla" ? layer : null;
}

function resolveEffectiveCreatureFeatsSourceLayer(
  objectKey: string,
): "module" | "hak" | "vanilla" | null {
  const layer = resolveTwoDaSourceLayer(objectKey);
  return layer === "module" || layer === "hak" || layer === "vanilla" ? layer : null;
}

function resolveEffectiveCreatureSpecialAbilitiesSourceLayer(
  objectKey: string,
): "module" | "hak" | "vanilla" | null {
  const layer = resolveTwoDaSourceLayer(objectKey);
  return layer === "module" || layer === "hak" || layer === "vanilla" ? layer : null;
}

function resolveEffectiveCreaturePhenotypeSourceLayer(
  objectKey: string,
): EffectiveCreaturePhenotypeTwoDaSourceLayer | null {
  const layer = resolveTwoDaSourceLayer(objectKey);
  return layer === "module" || layer === "hak" || layer === "vanilla"
    ? layer
    : null;
}

function resolveAreaLoadingScreenSourceLayer(
  objectKey: string,
): "module" | "hak" | "vanilla" | null {
  const layer = resolveTwoDaSourceLayer(objectKey);
  return layer === "module" || layer === "hak" || layer === "vanilla"
    ? layer
    : null;
}

function indexDoorTwoDaRowsById(rows: DoorTwoDaRow[]): Map<number, DoorTwoDaRow> {
  const lookup = new Map<number, DoorTwoDaRow>();
  for (const row of rows) {
    if (!lookup.has(row.rowId)) {
      lookup.set(row.rowId, row);
    }
  }
  return lookup;
}

function parseCreatureAppearanceTwoDaRows(
  bytes: Buffer,
  source: { sourceKey: string; sourceEtag?: string }
): ParsedCreatureAppearanceTwoDaRow[] {
  const table = parseAuroraTwoDaTable(bytes, {
    tableName: "appearance.2da",
    profile: "aurora-creature",
    sourceObjectKey: source.sourceKey,
    sourceLayer: resolveTwoDaSourceLayer(source.sourceKey),
    sourceHash: source.sourceEtag
  });
  const rows: ParsedCreatureAppearanceTwoDaRow[] = [];
  for (const row of table.rows) {
    const label = normalizeTwoDaLookupName(readTwoDaCell(row, ["label", "name"]));
    const moveRateName = normalizeTwoDaLookupName(readTwoDaCell(row, ["moverate"]));
    const modelType = normalizeTwoDaLookupName(readTwoDaCell(row, ["modeltype"]));
    const raceModel = normalizeTwoDaLookupName(readTwoDaCell(row, ["race"]));
    const portrait2da = normalizeTwoDaLookupName(readTwoDaCell(row, ["portrait"]));
    const envMap = normalizeTwoDaLookupName(readTwoDaCell(row, ["envmap"]));
    const defaultPhenotype = normalizeTwoDaLookupName(
      readTwoDaCell(row, ["defaultphenotype", "defaultphenotypeid", "defaultpheno"])
    );
    const bloodColor = normalizeTwoDaLookupName(
      readTwoDaCell(row, ["bloodcolr", "bloodcolor", "blood"])
    );
    const weaponScale = parseTwoDaNumberToken(
      readTwoDaCell(row, ["weaponscale", "weapon_scale"])
    );
    const sizeCategory = parseTwoDaIntegerToken(
      readTwoDaCell(row, ["sizecategory", "creaturesize"])
    );
    if (
      !label &&
      !moveRateName &&
      !modelType &&
      !raceModel &&
      !portrait2da &&
      !envMap &&
      !defaultPhenotype &&
      !bloodColor &&
      weaponScale === undefined &&
      sizeCategory === undefined
    ) {
      continue;
    }
    rows.push({
      // CExo2DA row lookup is positional. The left-hand row label is not the
      // Creature Appearance_Type identifier.
      rowId: row.physicalRowIndex,
      ...(label ? { label } : {}),
      ...(moveRateName ? { moveRateName } : {}),
      ...(modelType ? { modelType } : {}),
      ...(raceModel ? { raceModel } : {}),
      ...(portrait2da ? { portrait2da } : {}),
      ...(envMap ? { envMap } : {}),
      ...(defaultPhenotype ? { defaultPhenotype } : {}),
      ...(bloodColor ? { bloodColor } : {}),
      ...(weaponScale !== undefined ? { weaponScale } : {}),
      ...(sizeCategory !== undefined ? { sizeCategory } : {})
    });
  }
  return rows;
}

function hasCreatureAppearanceLookupPayload(row: ParsedCreatureAppearanceTwoDaRow): boolean {
  return Boolean(
    row.label ||
      row.modelType ||
      row.raceModel ||
      row.portrait2da ||
      row.envMap ||
      row.defaultPhenotype ||
      row.bloodColor ||
      row.sizeCategory !== undefined
  );
}

function parseCreatureSpeedTwoDaRows(
  bytes: Buffer,
  source: { sourceKey: string; sourceEtag?: string }
): ParsedCreatureSpeedTwoDaRow[] {
  const table = parseAuroraTwoDaTable(bytes, {
    tableName: "creaturespeed.2da",
    profile: "aurora-creature",
    sourceObjectKey: source.sourceKey,
    sourceLayer: resolveTwoDaSourceLayer(source.sourceKey),
    sourceHash: source.sourceEtag
  });
  const rows: ParsedCreatureSpeedTwoDaRow[] = [];
  for (const row of table.rows) {
    const twoDaName = normalizeTwoDaLookupName(readTwoDaCell(row, ["2daname"]));
    if (!twoDaName) {
      continue;
    }
    rows.push({
      rowId: row.rowId,
      twoDaName
    });
  }
  return rows;
}

function parseCreatureClassTwoDaRows(
  bytes: Buffer,
  source: { sourceKey: string; sourceEtag?: string }
): ParsedCreatureClassTwoDaRow[] {
  const table = parseAuroraTwoDaTable(bytes, {
    tableName: "classes.2da",
    profile: "aurora-creature",
    sourceObjectKey: source.sourceKey,
    sourceLayer: resolveTwoDaSourceLayer(source.sourceKey),
    sourceHash: source.sourceEtag
  });
  const rows: ParsedCreatureClassTwoDaRow[] = [];
  for (const row of table.rows) {
    const nameCell = readTwoDaCell(row, ["name"]);
    const nameStrRef = parseTalkTableStrRefToken(nameCell);
    const label =
      normalizeTwoDaLookupName(readTwoDaCell(row, ["label"])) ??
      (nameStrRef === undefined ? normalizeTwoDaLookupName(nameCell) : undefined) ??
      normalizeTwoDaLookupName(readTwoDaCell(row, ["lower", "plural"]));
    rows.push({
      rowId: row.rowId,
      ...(label ? { label } : {}),
      ...(nameStrRef !== undefined ? { nameStrRef } : {})
    });
  }
  return rows;
}

function parseCreatureRaceTwoDaRows(
  bytes: Buffer,
  source: { sourceKey: string; sourceEtag?: string }
): ParsedCreatureRaceTwoDaRow[] {
  const table = parseAuroraTwoDaTable(bytes, {
    tableName: "racialtypes.2da",
    profile: "aurora-creature",
    sourceObjectKey: source.sourceKey,
    sourceLayer: resolveTwoDaSourceLayer(source.sourceKey),
    sourceHash: source.sourceEtag
  });
  const rows: ParsedCreatureRaceTwoDaRow[] = [];
  for (const row of table.rows) {
    const label = normalizeTwoDaLookupName(
      readTwoDaCell(row, ["label", "name", "convername", "plural"])
    );
    const appearanceId = parseTwoDaIntegerToken(readTwoDaCell(row, ["appearance"]));
    rows.push({
      rowId: row.rowId,
      ...(label ? { label } : {}),
      ...(appearanceId !== undefined ? { appearanceId } : {})
    });
  }
  return rows;
}

function parseCreatureGenderTwoDaRows(
  bytes: Buffer,
  source: { sourceKey: string; sourceEtag?: string }
): ParsedCreatureGenderTwoDaRow[] {
  const table = parseAuroraTwoDaTable(bytes, {
    tableName: "gender.2da",
    profile: "aurora-creature",
    sourceObjectKey: source.sourceKey,
    sourceLayer: resolveTwoDaSourceLayer(source.sourceKey),
    sourceHash: source.sourceEtag
  });
  const rows: ParsedCreatureGenderTwoDaRow[] = [];
  for (const row of table.rows) {
    const label = normalizeTwoDaLookupName(readTwoDaCell(row, ["label", "name"]));
    if (!label) {
      continue;
    }
    rows.push({
      rowId: row.rowId,
      label
    });
  }
  return rows;
}

function parseCreaturePhenotypeTwoDaRows(
  bytes: Buffer,
  source: { sourceKey: string; sourceEtag?: string }
): ParsedCreaturePhenotypeTwoDaRow[] {
  const table = parseAuroraTwoDaTable(bytes, {
    tableName: "phenotype.2da",
    profile: "aurora-creature",
    sourceObjectKey: source.sourceKey,
    sourceLayer: resolveTwoDaSourceLayer(source.sourceKey),
    sourceHash: source.sourceEtag
  });
  const rows: ParsedCreaturePhenotypeTwoDaRow[] = [];
  for (const row of table.rows) {
    const label = normalizeTwoDaLookupName(
      readTwoDaCell(row, ["label", "name", "description"])
    );
    rows.push({
      rowId: row.rowId,
      ...(label ? { label } : {})
    });
  }
  return rows;
}

function parseCreaturePartTwoDaRows(
  bytes: Buffer,
  source: { sourceKey: string; sourceEtag?: string }
): ParsedCreaturePartTwoDaRow[] {
  const table = parseAuroraTwoDaTable(bytes, {
    tableName: "capart.2da",
    profile: "aurora-creature",
    sourceObjectKey: source.sourceKey,
    sourceLayer: resolveTwoDaSourceLayer(source.sourceKey),
    sourceHash: source.sourceEtag
  });
  const rows: ParsedCreaturePartTwoDaRow[] = [];
  for (const row of table.rows) {
    const modelName = normalizeTwoDaLookupName(
      readTwoDaCell(row, ["mdlname", "modelname", "model", "resref"])
    );
    const nodeName = normalizeTwoDaLookupName(
      readTwoDaCell(row, ["nodename", "node", "bodypart", "partnode"])
    );
    if (!modelName && !nodeName) {
      continue;
    }
    rows.push({
      rowId: row.rowId,
      ...(modelName ? { modelName } : {}),
      ...(nodeName ? { nodeName } : {})
    });
  }
  return rows;
}

function parseCreatureAccessoryModelTwoDaRows(
  bytes: Buffer,
  tableName: "wingmodel.2da" | "tailmodel.2da",
  source: { sourceKey: string; sourceEtag?: string }
): ParsedCreatureAccessoryModelTwoDaRow[] {
  const table = parseAuroraTwoDaTable(bytes, {
    tableName,
    profile: "aurora-creature",
    sourceObjectKey: source.sourceKey,
    sourceLayer: resolveTwoDaSourceLayer(source.sourceKey),
    sourceHash: source.sourceEtag
  });
  const rows: ParsedCreatureAccessoryModelTwoDaRow[] = [];
  for (const row of table.rows) {
    const modelResRef = normalizeLookupRef(
      readTwoDaCell(row, [
        "model",
        "modelname",
        "modelresref",
        "resref",
        "mdl",
        "mdb",
        "wingmodel",
        "tailmodel"
      ])
    );
    const label = normalizeTwoDaLookupName(
      readTwoDaCell(row, ["label", "name", "description"])
    );
    if (!modelResRef && !label) {
      continue;
    }
    rows.push({
      rowId: row.rowId,
      ...(modelResRef ? { modelResRef } : {}),
      ...(label ? { label } : {})
    });
  }
  return rows;
}

function parseCreatureSizeTwoDaRows(
  bytes: Buffer,
  source: { sourceKey: string; sourceEtag?: string }
): ParsedCreatureSizeTwoDaRow[] {
  const table = parseAuroraTwoDaTable(bytes, {
    tableName: "creaturesize.2da",
    profile: "aurora-creature",
    sourceObjectKey: source.sourceKey,
    sourceLayer: resolveTwoDaSourceLayer(source.sourceKey),
    sourceHash: source.sourceEtag
  });
  const rows: ParsedCreatureSizeTwoDaRow[] = [];
  for (const row of table.rows) {
    const label = normalizeTwoDaLookupName(
      readTwoDaCell(row, ["label", "name", "description", "constant"])
    );
    if (!label) {
      continue;
    }
    rows.push({
      rowId: row.rowId,
      label
    });
  }
  return rows;
}

function parseCreaturePortraitTwoDaRows(
  bytes: Buffer,
  source: { sourceKey: string; sourceEtag?: string }
): ParsedCreaturePortraitTwoDaRow[] {
  const table = parseAuroraTwoDaTable(bytes, {
    tableName: "portraits.2da",
    profile: "aurora-creature",
    sourceObjectKey: source.sourceKey,
    sourceLayer: resolveTwoDaSourceLayer(source.sourceKey),
    sourceHash: source.sourceEtag
  });
  const rows: ParsedCreaturePortraitTwoDaRow[] = [];
  for (const row of table.rows) {
    const baseResRef = normalizeLookupRef(
      readTwoDaCell(row, ["baseresref", "base_resref", "resref", "portrait"])
    );
    rows.push({
      rowId: row.rowId,
      ...(baseResRef ? { baseResRef } : {})
    });
  }
  return rows;
}

function parseCreatureSoundSetTwoDaRows(
  bytes: Buffer,
  source: { sourceKey: string; sourceEtag?: string }
): ParsedCreatureSoundSetTwoDaRow[] {
  const table = parseAuroraTwoDaTable(bytes, {
    tableName: "soundset.2da",
    profile: "aurora-creature",
    sourceObjectKey: source.sourceKey,
    sourceLayer: resolveTwoDaSourceLayer(source.sourceKey),
    sourceHash: source.sourceEtag
  });
  const rows: ParsedCreatureSoundSetTwoDaRow[] = [];
  for (const row of table.rows) {
    const label = normalizeTwoDaLookupName(readTwoDaCell(row, ["label", "name"]));
    const resRef = normalizeLookupRef(
      readTwoDaCell(row, ["resref", "soundresref", "soundset", "basesoundset"])
    );
    rows.push({
      rowId: row.rowId,
      ...(label ? { label } : {}),
      ...(resRef ? { resRef } : {})
    });
  }
  return rows;
}

function parseCreatureSkillTwoDaRows(
  bytes: Buffer,
  source: { sourceKey: string; sourceEtag?: string }
): ParsedCreatureSkillTwoDaRow[] {
  const table = parseAuroraTwoDaTable(bytes, {
    tableName: "skills.2da",
    profile: "aurora-creature",
    sourceObjectKey: source.sourceKey,
    sourceLayer: resolveTwoDaSourceLayer(source.sourceKey),
    sourceHash: source.sourceEtag
  });
  const rows: ParsedCreatureSkillTwoDaRow[] = [];
  for (const row of table.rows) {
    const label = normalizeTwoDaLookupName(
      readTwoDaCell(row, ["label", "name", "description"])
    );
    rows.push({
      rowId: row.rowId,
      ...(label ? { label } : {})
    });
  }
  return rows;
}

function parseCreatureFeatTwoDaRows(
  bytes: Buffer,
  source: { sourceKey: string; sourceEtag?: string }
): ParsedCreatureFeatTwoDaRow[] {
  const table = parseAuroraTwoDaTable(bytes, {
    tableName: "feat.2da",
    profile: "aurora-creature",
    sourceObjectKey: source.sourceKey,
    sourceLayer: resolveTwoDaSourceLayer(source.sourceKey),
    sourceHash: source.sourceEtag
  });
  const rows: ParsedCreatureFeatTwoDaRow[] = [];
  for (const row of table.rows) {
    const label = normalizeTwoDaLookupName(
      readTwoDaCell(row, ["label", "name", "description"])
    );
    rows.push({
      rowId: row.rowId,
      ...(label ? { label } : {})
    });
  }
  return rows;
}

function parseCreatureSpellTwoDaRows(
  bytes: Buffer,
  source: { sourceKey: string; sourceEtag?: string }
): ParsedCreatureSpellTwoDaRow[] {
  const table = parseAuroraTwoDaTable(bytes, {
    tableName: "spells.2da",
    profile: "aurora-creature",
    sourceObjectKey: source.sourceKey,
    sourceLayer: resolveTwoDaSourceLayer(source.sourceKey),
    sourceHash: source.sourceEtag
  });
  const rows: ParsedCreatureSpellTwoDaRow[] = [];
  for (const row of table.rows) {
    const label = normalizeTwoDaLookupName(
      readTwoDaCell(row, ["label", "name", "spellname"])
    );
    rows.push({
      rowId: row.rowId,
      ...(label ? { label } : {})
    });
  }
  return rows;
}

function parseItemBaseItemTwoDaRows(
  bytes: Buffer,
  source: { sourceKey: string; sourceEtag?: string }
): ParsedItemBaseItemTwoDaRow[] {
  const table = parseAuroraTwoDaTable(bytes, {
    tableName: "baseitems.2da",
    profile: "aurora-creature",
    sourceObjectKey: source.sourceKey,
    sourceLayer: resolveTwoDaSourceLayer(source.sourceKey),
    sourceHash: source.sourceEtag
  });
  const rows: ParsedItemBaseItemTwoDaRow[] = [];
  for (const row of table.rows) {
    const label = normalizeTwoDaLookupName(
      readTwoDaCell(row, ["label", "name", "description"])
    );
    const itemClass = normalizeItemBaseModelType(
      readTwoDaCell(row, ["itemclass", "item_class", "itemmodeltype", "item_model_type"])
    );
    const modelType =
      itemClass ??
      normalizeItemBaseModelType(
        readTwoDaCell(row, [
          "modelprefix",
          "model_prefix",
          "model",
          "mdltype",
          "modeltype",
          "model_type"
        ])
      );
    const defaultModel = normalizeLookupRef(
      readTwoDaCell(row, ["defaultmodel", "default_model", "defaultmdl", "defaultresref"])
    );
    const defaultIcon = normalizeLookupRef(
      readTwoDaCell(row, ["defaulticon", "default_icon", "icon"])
    );
    const parsedRow: ParsedItemBaseItemTwoDaRow = {
      rowId: row.rowId,
      ...(label ? { label } : {}),
      ...(itemClass ? { itemClass } : {}),
      ...(modelType ? { modelType } : {}),
      ...(defaultModel ? { defaultModel } : {}),
      ...(defaultIcon ? { defaultIcon } : {}),
      ...readOptionalTwoDaIntegerField(row, "invSlotWidth", ["invslotwidth", "inventorywidth"]),
      ...readOptionalTwoDaIntegerField(row, "invSlotHeight", ["invslotheight", "inventoryheight"]),
      ...readOptionalTwoDaIntegerField(row, "canRotateIcon", ["canrotateicon", "rotateicon"]),
      ...readOptionalTwoDaStringField(row, "equipableSlots", [
        "equipableslots",
        "equipslots",
        "equipmask"
      ]),
      ...readOptionalTwoDaIntegerField(row, "baseCost", ["basecost", "cost"]),
      ...readOptionalTwoDaIntegerField(row, "stacking", ["stacking", "stackable"]),
      ...readOptionalTwoDaNumberField(row, "itemMultiplier", ["itemmultiplier", "multiplier"]),
      ...readOptionalTwoDaIntegerField(row, "maxProps", ["maxprops", "maxproperties"]),
      ...readOptionalTwoDaIntegerField(row, "minProps", ["minprops", "minproperties"]),
      ...readOptionalTwoDaStringField(row, "propColumn", ["propcolumn", "propertycolumn"]),
      ...readOptionalTwoDaIntegerField(row, "storePanel", ["storepanel"]),
      ...readOptionalTwoDaIntegerField(row, "storePanelSort", ["storepanelsort"]),
      ...readOptionalTwoDaIntegerField(row, "chargesStarting", [
        "chargesstarting",
        "startingcharges"
      ]),
      ...readOptionalTwoDaIntegerField(row, "ilrStackSize", ["ilrstacksize"]),
      ...readOptionalTwoDaIntegerField(row, "weaponWield", ["weaponwield"]),
      ...readOptionalTwoDaIntegerField(row, "weaponType", ["weapontype"]),
      ...readOptionalTwoDaIntegerField(row, "weaponSize", ["weaponsize"]),
      ...readOptionalTwoDaIntegerField(row, "rangedWeapon", ["rangedweapon"]),
      ...readOptionalTwoDaIntegerField(row, "rotateOnGround", ["rotateonground"]),
      ...readOptionalTwoDaIntegerField(row, "weaponMatType", ["weaponmattype"]),
      ...readOptionalTwoDaIntegerField(row, "ammunitionType", ["ammunitiontype", "ammotype"]),
      ...readOptionalTwoDaIntegerField(row, "arcaneSpellFailure", [
        "arcanespellfailure",
        "spellfailure"
      ])
    };
    if (!hasItemBaseItemTwoDaData(parsedRow)) {
      continue;
    }
    rows.push(parsedRow);
  }
  return rows;
}

function parseItemPropertyDefinitionTwoDaRows(
  bytes: Buffer,
  source: { sourceKey: string; sourceEtag?: string }
): ParsedItemPropertyDefinitionTwoDaRow[] {
  const table = parseAuroraTwoDaTable(bytes, {
    tableName: "itempropdef.2da",
    profile: "aurora-item",
    sourceObjectKey: source.sourceKey,
    sourceLayer: resolveTwoDaSourceLayer(source.sourceKey),
    sourceHash: source.sourceEtag
  });
  const rows: ParsedItemPropertyDefinitionTwoDaRow[] = [];
  for (const row of table.rows) {
    const parsedRow: ParsedItemPropertyDefinitionTwoDaRow = {
      rowId: row.rowId,
      ...readOptionalTwoDaStringField(row, "label", ["label"]),
      ...readOptionalTwoDaIntegerField(row, "nameStrRef", ["name", "namestrref"]),
      ...readOptionalTwoDaLookupField(row, "subTypeTable", [
        "subtyperesref",
        "subtypetable",
        "subtype"
      ]),
      ...readOptionalTwoDaLookupField(row, "costTableDefinition", [
        "costtableresref",
        "costtable",
        "costtable2da"
      ]),
      ...readOptionalTwoDaLookupField(row, "param1Table", [
        "param1resref",
        "param1table",
        "param1"
      ]),
      ...readOptionalTwoDaIntegerField(row, "gameStrRef", ["gamestrref"]),
      ...readOptionalTwoDaIntegerField(row, "descriptionStrRef", [
        "description",
        "descriptionstrref",
        "descstrref"
      ])
    };
    if (!hasItemPropertyDefinitionTwoDaData(parsedRow)) {
      continue;
    }
    rows.push(parsedRow);
  }
  return rows;
}

function hasItemBaseItemTwoDaData(row: ParsedItemBaseItemTwoDaRow): boolean {
  return Object.entries(row).some(([key, value]) => key !== "rowId" && value !== undefined);
}

function hasItemPropertyDefinitionTwoDaData(
  row: ParsedItemPropertyDefinitionTwoDaRow
): boolean {
  return Object.entries(row).some(([key, value]) => key !== "rowId" && value !== undefined);
}

function parseDoorTwoDaRows(
  bytes: Buffer,
  tableName: DoorTwoDaTableName,
  source: { sourceKey: string; sourceEtag?: string }
): ParsedDoorTwoDaRow[] {
  const table = parseAuroraTwoDaTable(bytes, {
    tableName,
    profile: "aurora-areas",
    sourceObjectKey: source.sourceKey,
    sourceLayer: resolveTwoDaSourceLayer(source.sourceKey),
    sourceHash: source.sourceEtag
  });
  const rows: ParsedDoorTwoDaRow[] = [];
  for (const row of table.rows) {
    const label = readTwoDaCell(row, ["label", "name"]);
    const modelResRef = normalizeLookupRef(
      readTwoDaCell(row, [
        "modelname",
        "modelresref",
        "model",
        "resref",
        "mdl",
        "mdb",
        "mdbresref"
      ])
    );
    rows.push({
      rowId: row.rowId,
      ...(label ? { label } : {}),
      ...(modelResRef ? { modelResRef } : {}),
      sourceTable: tableName
    });
  }
  return rows;
}

function readOptionalTwoDaStringField<K extends string>(
  row: AuroraTwoDaRow,
  key: K,
  columnAliases: string[]
): Partial<Record<K, string>> {
  const value = normalizeTwoDaLookupName(readTwoDaCell(row, columnAliases));
  return value ? ({ [key]: value } as Partial<Record<K, string>>) : {};
}

function readOptionalTwoDaLookupField<K extends string>(
  row: AuroraTwoDaRow,
  key: K,
  columnAliases: string[]
): Partial<Record<K, string>> {
  const value = normalizeLookupRef(readTwoDaCell(row, columnAliases));
  return value ? ({ [key]: value } as Partial<Record<K, string>>) : {};
}

function readOptionalTwoDaIntegerField<K extends string>(
  row: AuroraTwoDaRow,
  key: K,
  columnAliases: string[]
): Partial<Record<K, number>> {
  const value = parseTwoDaIntegerToken(readTwoDaCell(row, columnAliases));
  return value !== undefined ? ({ [key]: value } as Partial<Record<K, number>>) : {};
}

function readOptionalTwoDaNumberField<K extends string>(
  row: AuroraTwoDaRow,
  key: K,
  columnAliases: string[]
): Partial<Record<K, number>> {
  const value = parseTwoDaNumberToken(readTwoDaCell(row, columnAliases));
  return value !== undefined ? ({ [key]: value } as Partial<Record<K, number>>) : {};
}

function readTwoDaCell(row: AuroraTwoDaRow, columnAliases: string[]): string | undefined {
  const normalizedAliases = new Set(columnAliases.map(normalizeTwoDaColumnName));
  for (const cell of row.cells) {
    if (!normalizedAliases.has(normalizeTwoDaColumnName(cell.column))) {
      continue;
    }
    const value = cell.value.trim();
    if (!value || value === BLANK_CELL || cell.blank || cell.missing) {
      return undefined;
    }
    return value;
  }
  return undefined;
}

function parseTalkTableStrRefToken(value: string | undefined): number | undefined {
  const normalized = value?.trim();
  if (!normalized || normalized === BLANK_CELL) {
    return undefined;
  }
  const parsed = Number(normalized);
  return isValidTalkTableStrRef(parsed) ? parsed : undefined;
}

function parseTwoDaIntegerToken(value: string | undefined): number | undefined {
  const normalized = value?.trim();
  if (!normalized || normalized === BLANK_CELL) {
    return undefined;
  }
  const parsed = Number(normalized);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function parseTwoDaNumberToken(value: string | undefined): number | undefined {
  const normalized = value?.trim();
  if (!normalized || normalized === BLANK_CELL) {
    return undefined;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseTwoDaBooleanToken(value: string | undefined): boolean | undefined {
  const parsed = parseTwoDaIntegerToken(value);
  if (parsed === 0) {
    return false;
  }
  if (parsed === 1) {
    return true;
  }
  return undefined;
}

function normalizeTwoDaLookupName(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  if (!normalized || normalized === BLANK_CELL) {
    return undefined;
  }
  return normalized;
}

function normalizeTwoDaColumnName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/gu, "");
}

function parseLightColorTwoDaRows(
  bytes: Buffer,
  source: { sourceKey: string; sourceEtag?: string }
): ParsedLightColorTwoDaRow[] {
  const table = parseAuroraTwoDaTable(bytes, {
    tableName: "lightcolor.2da",
    profile: "aurora-placeable-light",
    sourceObjectKey: source.sourceKey,
    sourceLayer: resolveTwoDaSourceLayer(source.sourceKey),
    sourceHash: source.sourceEtag
  });
  const rows: ParsedLightColorTwoDaRow[] = [];
  for (const row of table.rows) {
    const red = parseTwoDaNumberToken(readTwoDaCell(row, ["red"]));
    const green = parseTwoDaNumberToken(readTwoDaCell(row, ["green"]));
    const blue = parseTwoDaNumberToken(readTwoDaCell(row, ["blue"]));
    const label = normalizeTwoDaLookupName(readTwoDaCell(row, ["label", "name"]));
    const toolsetRed = parseTwoDaNumberToken(readTwoDaCell(row, ["toolsetred"]));
    const toolsetGreen = parseTwoDaNumberToken(readTwoDaCell(row, ["toolsetgreen"]));
    const toolsetBlue = parseTwoDaNumberToken(readTwoDaCell(row, ["toolsetblue"]));
    if (
      !label &&
      red === undefined &&
      green === undefined &&
      blue === undefined &&
      toolsetRed === undefined &&
      toolsetGreen === undefined &&
      toolsetBlue === undefined
    ) {
      continue;
    }
    rows.push({
      rowId: row.rowId,
      ...(label ? { label } : {}),
      ...optionalNumberProperty("red", red),
      ...optionalNumberProperty("green", green),
      ...optionalNumberProperty("blue", blue),
      ...optionalNumberProperty("toolsetRed", toolsetRed),
      ...optionalNumberProperty("toolsetGreen", toolsetGreen),
      ...optionalNumberProperty("toolsetBlue", toolsetBlue)
    });
  }
  return rows;
}

function buildLightColorTwoDaLookup(
  sources: LoadedLightColorTwoDaSource[]
): Map<number, LightColorTwoDaLookupEntry> {
  const lookup = new Map<number, LightColorTwoDaLookupEntry>();
  for (const source of sources) {
    for (const row of source.rows) {
      if (lookup.has(row.rowId)) {
        continue;
      }
      lookup.set(row.rowId, {
        ...row,
        sourceKey: source.key
      });
    }
  }
  return lookup;
}

function enrichPlaceablesTwoDaRowsWithLightColors(
  rows: ParsedPlaceablesTwoDaRow[],
  lightColorLookup: ReadonlyMap<number, LightColorTwoDaLookupEntry>
): ParsedPlaceablesTwoDaRow[] {
  if (lightColorLookup.size === 0) {
    return rows;
  }
  return rows.map((row) => {
    if (row.lightColorRowId === undefined) {
      return row;
    }
    const lightColor = lightColorLookup.get(row.lightColorRowId);
    if (!lightColor) {
      return row;
    }
    return {
      ...row,
      ...(lightColor.label ? { lightColorLabel: lightColor.label } : {}),
      ...optionalNumberProperty("lightColorRed", lightColor.red),
      ...optionalNumberProperty("lightColorGreen", lightColor.green),
      ...optionalNumberProperty("lightColorBlue", lightColor.blue),
      ...optionalNumberProperty("lightColorToolsetRed", lightColor.toolsetRed),
      ...optionalNumberProperty("lightColorToolsetGreen", lightColor.toolsetGreen),
      ...optionalNumberProperty("lightColorToolsetBlue", lightColor.toolsetBlue),
      lightColorSourceKey: lightColor.sourceKey
    };
  });
}

export function parsePlaceablesTwoDaRows(bytes: Buffer): ParsedPlaceablesTwoDaRow[] {
  const rows: ParsedPlaceablesTwoDaRow[] = [];
  const content = bytes.toString("utf-8").replace(/^\uFEFF/u, "");
  const lines = content.split(/\r?\n/gu);
  const significantLines = lines
    .map((line) => stripTwoDaComment(line))
    .map((line) => ({ raw: line, text: line.trim() }))
    .filter((line) => line.text.length > 0);
  if (significantLines.length === 0) {
    return rows;
  }

  if (!/^2da\b/iu.test(significantLines[0].text)) {
    return rows;
  }

  let headerLineIndex = -1;
  let modelColumnIndex = -1;
  let labelColumnIndex = -1;
  let strRefColumnIndex = -1;
  let headerTokens: string[] = [];
  for (let index = 1; index < significantLines.length; index += 1) {
    const tokens = tokenizeTwoDaLine(significantLines[index].text);
    if (tokens.length === 0) {
      continue;
    }

    const foundModelColumnIndex = tokens.findIndex(
      (token) => token.trim().toLowerCase() === "modelname"
    );
    if (foundModelColumnIndex >= 0) {
      headerLineIndex = index;
      modelColumnIndex = foundModelColumnIndex;
      labelColumnIndex = tokens.findIndex((token) => token.trim().toLowerCase() === "label");
      strRefColumnIndex = tokens.findIndex((token) => token.trim().toLowerCase() === "strref");
      headerTokens = tokens;
      break;
    }
  }

  if (headerLineIndex < 0 || modelColumnIndex < 0) {
    return rows;
  }

  for (let index = headerLineIndex + 1; index < significantLines.length; index += 1) {
    const line = significantLines[index];
    const tokens = tokenizeTwoDaLine(line.text);
    if (tokens.length < 2) {
      continue;
    }

    const rowId = Number.parseInt(tokens[0], 10);
    if (!Number.isInteger(rowId) || rowId < 0) {
      continue;
    }

    const rowValues = tokens.slice(1);
    const resolvedRow = resolvePlaceablesTwoDaRowValues({
      rowValues,
      headerTokens,
      labelColumnIndex,
      modelColumnIndex,
      strRefColumnIndex
    });
    const rawModelResRef = resolvedRow.modelResRef;
    const normalizedModelResRef = normalizeLookupRef(rawModelResRef);
    if (!normalizedModelResRef) {
      continue;
    }

    const rawLabel = resolvedRow.label;
    const label = rawLabel && rawLabel !== "****" ? rawLabel.trim() : undefined;
    const lightColorRaw = normalizeTwoDaLookupName(
      readResolvedPlaceablesTwoDaCell(resolvedRow, ["lightcolor"])
    );
    rows.push({
      rowId,
      physicalRowIndex: index - headerLineIndex - 1,
      ...(label ? { label } : {}),
      modelResRef: normalizedModelResRef,
      ...(lightColorRaw ? { lightColorRaw } : {}),
      ...optionalNumberProperty(
        "lightColorRowId",
        parseTwoDaIntegerToken(lightColorRaw)
      ),
      ...optionalNumberProperty(
        "lightOffsetX",
        parseTwoDaNumberToken(readResolvedPlaceablesTwoDaCell(resolvedRow, ["lightoffsetx"]))
      ),
      ...optionalNumberProperty(
        "lightOffsetY",
        parseTwoDaNumberToken(readResolvedPlaceablesTwoDaCell(resolvedRow, ["lightoffsety"]))
      ),
      ...optionalNumberProperty(
        "lightOffsetZ",
        parseTwoDaNumberToken(readResolvedPlaceablesTwoDaCell(resolvedRow, ["lightoffsetz"]))
      ),
      ...optionalNumberProperty(
        "shadowSize",
        parseTwoDaIntegerToken(readResolvedPlaceablesTwoDaCell(resolvedRow, ["shadowsize"]))
      ),
      ...optionalBooleanProperty(
        "isStatic",
        parseTwoDaBooleanToken(readResolvedPlaceablesTwoDaCell(resolvedRow, ["static"]))
      )
    });
  }

  return rows;
}

function optionalNumberProperty<TKey extends string>(
  key: TKey,
  value: number | undefined
): { [K in TKey]?: number } {
  return value === undefined ? {} : { [key]: value } as { [K in TKey]?: number };
}

function optionalBooleanProperty<TKey extends string>(
  key: TKey,
  value: boolean | undefined
): { [K in TKey]?: boolean } {
  return value === undefined ? {} : { [key]: value } as { [K in TKey]?: boolean };
}

function tokenizeTwoDaLine(line: string): string[] {
  const rawTokens = line.match(/"[^"]*"|[^\s]+/gu) ?? [];
  return rawTokens.map((token) => {
    const trimmed = token.trim();
    if (trimmed.startsWith("\"") && trimmed.endsWith("\"") && trimmed.length >= 2) {
      return trimmed.slice(1, -1);
    }
    return trimmed;
  });
}

function resolvePlaceablesTwoDaRowValues(input: {
  rowValues: string[];
  headerTokens: string[];
  labelColumnIndex: number;
  modelColumnIndex: number;
  strRefColumnIndex: number;
}): { label?: string; modelResRef?: string; columnValues: Record<string, string | undefined> } {
  const directLabel =
    input.labelColumnIndex >= 0 ? input.rowValues[input.labelColumnIndex] : undefined;
  const directModelResRef = input.rowValues[input.modelColumnIndex];
  if (input.rowValues.length <= input.headerTokens.length) {
    return {
      label: directLabel,
      modelResRef: directModelResRef,
      columnValues: buildResolvedPlaceablesTwoDaColumnValues(input, {
        label: directLabel,
        tokenShift: 0
      })
    };
  }

  const strRefTokenIndex = findPlaceablesStrRefTokenIndex(input);
  if (strRefTokenIndex >= 0) {
    const label =
      input.labelColumnIndex >= 0
        ? input.rowValues.slice(input.labelColumnIndex, strRefTokenIndex).join(" ").trim()
        : directLabel;
    const tokenShift = strRefTokenIndex - input.strRefColumnIndex;
    return {
      label,
      modelResRef: input.rowValues[strRefTokenIndex + 1],
      columnValues: buildResolvedPlaceablesTwoDaColumnValues(input, {
        label,
        tokenShift
      })
    };
  }

  if (input.labelColumnIndex >= 0 && input.modelColumnIndex > input.labelColumnIndex) {
    const nonLabelColumnCount = Math.max(0, input.headerTokens.length - 1);
    const labelTokenCount = Math.max(1, input.rowValues.length - nonLabelColumnCount);
    const modelTokenIndex = input.modelColumnIndex + labelTokenCount - 1;
    const label = input.rowValues
      .slice(input.labelColumnIndex, input.labelColumnIndex + labelTokenCount)
      .join(" ")
      .trim();
    return {
      label,
      modelResRef: input.rowValues[modelTokenIndex],
      columnValues: buildResolvedPlaceablesTwoDaColumnValues(input, {
        label,
        tokenShift: labelTokenCount - 1
      })
    };
  }

  return {
    label: directLabel,
    modelResRef: directModelResRef,
    columnValues: buildResolvedPlaceablesTwoDaColumnValues(input, {
      label: directLabel,
      tokenShift: 0
    })
  };
}

function buildResolvedPlaceablesTwoDaColumnValues(
  input: {
    rowValues: string[];
    headerTokens: string[];
    labelColumnIndex: number;
  },
  options: { label?: string; tokenShift: number }
): Record<string, string | undefined> {
  const values: Record<string, string | undefined> = {};
  input.headerTokens.forEach((header, headerIndex) => {
    const key = normalizeTwoDaColumnName(header);
    if (headerIndex === input.labelColumnIndex) {
      values[key] = options.label;
      return;
    }
    const valueIndex =
      input.labelColumnIndex >= 0 && headerIndex > input.labelColumnIndex
        ? headerIndex + options.tokenShift
        : headerIndex;
    values[key] = input.rowValues[valueIndex];
  });
  return values;
}

function readResolvedPlaceablesTwoDaCell(
  row: { columnValues: Record<string, string | undefined> },
  columnAliases: string[]
): string | undefined {
  for (const alias of columnAliases) {
    const value = row.columnValues[normalizeTwoDaColumnName(alias)]?.trim();
    if (value && value !== BLANK_CELL) {
      return value;
    }
  }
  return undefined;
}

function findPlaceablesStrRefTokenIndex(input: {
  rowValues: string[];
  labelColumnIndex: number;
  modelColumnIndex: number;
  strRefColumnIndex: number;
}): number {
  if (
    input.strRefColumnIndex < 0 ||
    input.strRefColumnIndex >= input.modelColumnIndex ||
    input.labelColumnIndex < 0
  ) {
    return -1;
  }

  for (
    let index = input.labelColumnIndex + 1;
    index < input.rowValues.length - 1;
    index += 1
  ) {
    const value = input.rowValues[index];
    const nextValue = input.rowValues[index + 1];
    const strRefLike = value === "****" || /^\d+$/u.test(value);
    if (strRefLike && normalizeLookupRef(nextValue)) {
      return index;
    }
  }
  return -1;
}

function stripTwoDaComment(line: string): string {
  const commentStart = line.indexOf("//");
  if (commentStart < 0) {
    return line;
  }
  return line.slice(0, commentStart);
}

function humanizeName(resref: string): string {
  return resref
    .split(/[_-]+/u)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizePrefixForLookup(value: string): string {
  const trimmed = value.trim().replace(/^\/+/u, "").replace(/\/+$/u, "");
  if (!trimmed) {
    return "";
  }
  return `${trimmed}/`;
}

function buildSourceFingerprint(parts: readonly string[]): string {
  return createHash("sha256").update(parts.join("|"), "utf-8").digest("hex");
}

function buildContentHash(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function resolveRuntimeFileSystemPath(pathValue: string): string {
  const hostLocalPath = resolveHostLocalMountedPath(pathValue);
  return hostLocalPath ?? (isAbsolute(pathValue) ? pathValue : resolve(process.cwd(), pathValue));
}

function addOptionalMetadata(
  metadata: Record<string, string | number | boolean>,
  key: string,
  value: string | number | boolean | undefined
): void {
  if (value === undefined) {
    return;
  }
  metadata[key] = value;
}

function addOptionalJsonMetadata(
  metadata: Record<string, string | number | boolean>,
  key: string,
  value: unknown[] | undefined
): void {
  if (!value || value.length === 0) {
    return;
  }
  metadata[key] = JSON.stringify(value);
}

function formatSnapshotIndexError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

async function mapWithConcurrency<T>(
  values: T[],
  concurrency: number,
  mapper: (value: T, index: number) => Promise<void>
): Promise<void> {
  if (values.length === 0) {
    return;
  }

  let cursor = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, values.length)) }, () =>
    (async () => {
      while (true) {
        const index = cursor;
        cursor += 1;
        if (index >= values.length) {
          return;
        }
        await mapper(values[index], index);
      }
    })()
  );

  await Promise.all(workers);
}
