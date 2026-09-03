import { createHash } from "node:crypto";
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
import type { BlobStorageSettings } from "../../../../runtime-settings/domain/runtime-settings.types";
import {
  BLANK_CELL,
  parseAuroraTwoDaTable,
  type AuroraTwoDaRow
} from "../../../../../common/aurora/two-da/aurora-two-da-table";
import { resolveHostLocalMountedPath } from "../../../../../common/host/host-local-paths";
import type {
  AuroraAreaVfxCollisionContract,
  AuroraAreaVfxCollisionResource
} from "../../../../../common/aurora/vfx/aurora-area-vfx-collision.types";
import type { AuroraWorldTimerContract } from "../../../../../common/aurora/material/aurora-worldtimer.types";
import { parseAuroraAsciiWokWalkmesh } from "../../../../vfx/domain/aurora-wok-walkmesh";
import {
  parseAuroraMdlVfxSource,
  type AuroraMdlLightNode,
  type AuroraMdlModelGraphNode
} from "../../../../vfx/domain/aurora-mdl-vfx-source.parser";
import type { AreaRepositoryPort } from "../../../application/ports/area-repository.port";
import {
  TEMPLATE_CATALOG_REPOSITORY,
  type EffectivePlaceablesTwoDaDescriptor,
  type EffectiveWaypointTwoDaRowsResult,
  type EffectiveCreatureAppearanceTwoDaDescriptor,
  type EffectiveCreatureGenderTwoDaDescriptor,
  type EffectiveCreatureAppendageTwoDaDescriptor,
  type EffectiveCreaturePhenotypeTwoDaDescriptor,
  type EffectiveTrapsTwoDaTableResult,
  type EffectiveItemBaseItemsTwoDaTableResult,
  type EffectiveBodyBagTwoDaTableResult,
  type EffectivePortraitsTwoDaTableResult,
  type EffectiveCreaturePortraitsTwoDaTableResult,
  type EffectiveCreatureRacialTypesTwoDaTableResult,
  type EffectiveCreaturePerceptionRangesTwoDaTableResult,
  type EffectiveCreatureWalkRatesTwoDaTableResult,
  type EffectiveCreatureSoundSetsTwoDaTableResult,
  type EffectiveCreatureStartingPackagesTwoDaTableResult,
  type EffectiveCreatureClassesTwoDaTableResult,
  type EffectiveCreatureSkillsTwoDaTableResult,
  type EffectiveCreatureFeatsTwoDaTableResult,
  type EffectiveCreatureSpecialAbilitiesTwoDaTableResult,
  type EffectiveAreaAudioCatalogBundleResult,
  type EffectiveAreaVisualEnvironmentCatalogBundleResult,
  type EffectiveAreaLoadingScreenCatalogResult,
  type EffectiveAreaEncounterDifficultyCatalogResult,
  type ModuleFactionCatalogResult,
  type TemplateCatalogRepositoryPort,
} from "../../../../catalog/application/ports/template-catalog-repository.port";
import { buildAreaProcessCacheKey, countAreaObjectsByKind } from "../../../domain/area-processing.builders";
import { enumerateAreaObjectSources } from "../../../domain/area-object-source-identity";
import { bindEffectivePlaceablesTwoDaToBasicIdentity } from "../../../domain/area-placeable-basic-identity-table";
import { bindEffectiveWaypointTwoDaToAppearance } from
  "../../../domain/area-waypoint-appearance";
import { bindEffectiveAppearanceTwoDaToCreatureAppearance } from "../../../domain/area-creature-appearance";
import { bindEffectiveGenderTwoDaToCreatureGender } from "../../../domain/area-creature-gender";
import { bindEffectiveAppendageTwoDaToCreatureAppendages } from
  "../../../domain/area-creature-appendages";
import { bindEffectiveRangesTwoDaToCreaturePerceptionRange } from
  "../../../domain/area-creature-perception-range";
import { bindEffectiveCreatureWalkRatesTwoDaToCreatureWalkRate } from
  "../../../domain/area-creature-walk-rate";
import { bindEffectiveCreatureSoundSetsTwoDaToCreatureSoundSetFile } from
  "../../../domain/area-creature-sound-set-file";
import { bindEffectiveCreatureStartingPackagesTwoDaToCreatureStartingPackage } from
  "../../../domain/area-creature-starting-package";
import { bindEffectiveCreatureSkillsTwoDaToCreatureSkillList } from
  "../../../domain/area-creature-skill-list";
import { bindEffectiveCreatureFeatsTwoDaToCreatureFeatList } from
  "../../../domain/area-creature-feat-list";
import { bindEffectiveCreatureSpecialAbilitiesTwoDaToList } from
  "../../../domain/area-creature-special-ability-list";
import { bindEffectiveCreatureClassesTwoDaToCreatureClassIdentity } from
  "../../../domain/area-creature-class-identity";
import { bindEffectivePhenotypeTwoDaToCreaturePhenotype } from
  "../../../domain/area-creature-phenotype";
import { bindEffectiveCreaturePortraitsTwoDaToCreaturePortrait } from
  "../../../domain/area-creature-portrait";
import { bindEffectiveCreatureRacialTypesTwoDaToHitPointState } from
  "../../../domain/area-creature-hit-points";
import { cloneAreaPlaceableLocalizedStrings } from "../../../domain/area-placeable-localized-strings";
import { cloneAreaCreatureNameLocalizedStrings } from "../../../domain/area-creature-localized-strings";
import { cloneAreaItemInstanceStateStorage } from "../../../domain/area-item-instance-state";
import { cloneAreaItemLocalizedStrings } from "../../../domain/area-item-localized-strings";
import { cloneAreaWaypointMapNoteStorage } from "../../../domain/area-waypoint-map-note";
import { cloneAreaLocalizedStringStorage } from "../../../domain/area-localized-string-storage";
import { cloneAreaItemPropertyListProvenance } from "../../../domain/area-item-property-list";
import {
  bindEffectiveBaseItemsTwoDaToItemBaseAppearance,
  type AreaItemBaseAppearanceValue,
} from "../../../domain/area-item-base-appearance";
import {
  bindEffectiveBaseItemsTwoDaToStoreRestrictions,
  cloneAreaStoreRestrictionsProvenance,
} from "../../../domain/area-store-restrictions";
import {
  bindEffectiveBaseItemsTwoDaToStoreInventory,
  cloneAreaStoreInventoryProvenance,
} from "../../../domain/area-store-inventory";
import type {
  AreaListItem,
  AreaListQuery,
  AreaListResult,
  AreaObjectCounts,
  AreaRecord,
  AreaTileNativeLightNode,
  AreaTileSourceLightNode,
  AreaTileInstance
} from "../../../domain/area.types";
import {
  type ParsedAreaMetadataBlueprint,
  type ParsedAreaObjectBlueprint,
  type ParsedAreaPlacementBlueprint,
  parseAreaMetadataFromAreGff,
  parseAreaObjectsFromGitGicGff,
  parseAreaObjectsFromGitGff
} from "./aurora-gff-area-parser";
import { parseAuroraWorldTimerFromModuleIfo } from "./aurora-gff-module-worldtimer";
import {
  moduleIfoAreaMembershipCount,
  readModuleIfoStartLocation,
} from "./aurora-gff-module-ifo-area-writer";
import type { AreaModuleStartLocation } from "../../../domain/area-module-start-location";
import { StaticAreaRepository } from "../memory/static-area.repository";
import { SystemMaintenanceApplicationService } from "../../../../system-maintenance/application/system-maintenance.application.service";
import {
  COMMITTED_MODULE_SNAPSHOT_READER,
  type CapturedCommittedModuleSnapshot,
  type CommittedModuleSnapshotReaderPort,
} from "../../../../module-snapshots/application/ports/committed-module-snapshot-reader.port";

interface IndexedArea {
  candidate: AreaCandidate;
  hydratedRecord?: AreaRecord;
  listItem: AreaListItem;
  composition: AreaObjectCounts;
  searchable: string;
  biomeLower: string;
  tagsLower: Set<string>;
}

interface SnapshotIndex {
  fetchedAtMs: number;
  byId: Map<string, IndexedArea>;
  processingById: Map<string, { cacheKey: string; composition: AreaObjectCounts }>;
  items: IndexedArea[];
  materialization: {
    benchmarkIds: Set<string>;
    tileLightColorLookups: TileLightColorLookups;
    tileModelLightNodeLookup: ReadonlyMap<string, TileModelLightNodes>;
    areaWokLookup: ReadonlyMap<string, AuroraAreaVfxCollisionResource>;
    auroraWorldTimer?: AuroraWorldTimerContract;
    moduleStartLocation?: AreaModuleStartLocation;
    moduleStartLocationTargets?: readonly string[];
    moduleIfoSha256?: string;
  };
}

interface AreaCandidate {
  resref: string;
  areSourceKey: string;
  areSourceSize: number;
  areSourceEtag?: string;
  areSourceSha256?: string;
  areUpdatedAt: string;
  gitSourceKey?: string;
  gitSourceSize?: number;
  gitSourceEtag?: string;
  gitSourceSha256?: string;
  gitUpdatedAt?: string;
  gicSourceKey?: string;
  gicSourceSize?: number;
  gicSourceEtag?: string;
  gicSourceSha256?: string;
  gicUpdatedAt?: string;
  gicCandidates: ModuleBlobObjectSummary[];
  parsedArea?: ParsedAreaMetadataBlueprint;
  parsedObjects?: ParsedAreaObjectBlueprint;
  parsedTileset?: ParsedTilesetBlueprint;
  sourceFingerprint: string;
}

interface ParsedTileColorTwoDaRow {
  rowId: number;
  red?: number;
  green?: number;
  blue?: number;
  sourceAnimationName?: string;
  sourceModelFileName?: string;
  sourceModelHash?: string;
  sourceMultiplier?: number;
  sourceMultiplierSource?: string;
  sourceProofStatus?: string;
}

interface LoadedTileColorTwoDaSource {
  key: string;
  sourceSize: number;
  updatedAt: string;
  sourceEtag?: string;
  rows: ParsedTileColorTwoDaRow[];
}

interface TileColorLookupEntry extends ParsedTileColorTwoDaRow {
  sourceKey: string;
}

type TileColorTwoDaLookup = Map<number, TileColorLookupEntry>;

interface TileLightColorLookups {
  mainLight: TileColorTwoDaLookup;
  sourceLight: TileColorTwoDaLookup;
}

interface TileModelLightNodes {
  mainLight1?: AreaTileNativeLightNode;
  mainLight2?: AreaTileNativeLightNode;
  sourceLight1: AreaTileSourceLightNode;
  sourceLight2: AreaTileSourceLightNode;
}

type TileModelLightNodeLookup = Map<string, TileModelLightNodes>;

interface ParsedTilesetTileBlueprint {
  tileId: number;
  modelResRef?: string;
  imageMap2D?: string;
  orientation?: number;
  pathNode?: string;
  visibilityNode?: string;
  visibilityOrientation?: number;
  doorVisibilityNode?: string;
  doorVisibilityOrientation?: number;
  edges?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  cornerHeights?: {
    topLeft?: string;
    topRight?: string;
    bottomLeft?: string;
    bottomRight?: string;
  };
}

interface ParsedTilesetBlueprint {
  sourceKey: string;
  sourceSize: number;
  updatedAt: string;
  sourceEtag?: string;
  tilesById: Map<number, ParsedTilesetTileBlueprint>;
}

type ParsedTilesetLookup = Map<string, ParsedTilesetBlueprint[]>;

type AreaWokResourceLookup = Map<string, AuroraAreaVfxCollisionResource>;

const DEFAULT_SOUND_BINDING_KEYS = {
  areaKey: "GI_sound_area" as const,
  randomKey: "GI_sound_rndm" as const,
  positionalKey: "GI_sound_pos" as const
};
const AURORA_GIT_UNITS_PER_TILE = 10;
const SNAPSHOT_INDEX_CACHE_TTL_MS = 10 * 60_000;
const VANILLA_KEY_FILE_CANDIDATES = ["nwn_base.key", "nwn_retail.key"] as const;

@Injectable()
export class ModuleSnapshotAreaRepository
  implements AreaRepositoryPort, OnModuleDestroy
{
  private readonly logger = new Logger(ModuleSnapshotAreaRepository.name);
  private readonly fallback = new StaticAreaRepository();
  private snapshotIndex: SnapshotIndex | null = null;
  private snapshotIndexRefreshInFlight: Promise<SnapshotIndex | null> | null = null;
  private readonly areaCatalogHydrationLoads = new Map<string, Promise<AreaRecord>>();
  private areaWokSourceSyncInFlight: Promise<void> | null = null;
  private capturedSnapshot: CapturedCommittedModuleSnapshot | null = null;
  private readonly unsubscribeMaintenance: (() => void) | null;

  constructor(
    @Inject(RUNTIME_SETTINGS_REPOSITORY)
    private readonly runtimeSettingsRepository: RuntimeSettingsRepositoryPort,
    @Inject(MODULE_BLOB_STORAGE)
    private readonly moduleBlobStorage: ModuleBlobStoragePort,
    private readonly runtimeSettingsApplicationService: RuntimeSettingsApplicationService,
    @Optional()
    maintenance?: SystemMaintenanceApplicationService,
    @Optional() @Inject(COMMITTED_MODULE_SNAPSHOT_READER)
    private readonly committedSnapshotReader?: CommittedModuleSnapshotReaderPort,
    @Optional() @Inject(TEMPLATE_CATALOG_REPOSITORY)
    private readonly templateCatalogRepository?: TemplateCatalogRepositoryPort,
  ) {
    this.unsubscribeMaintenance =
      maintenance?.onStateChanged((record) => {
        if (record.state === "idle") {
          this.snapshotIndex = null;
          this.snapshotIndexRefreshInFlight = null;
          this.areaCatalogHydrationLoads.clear();
          this.areaWokSourceSyncInFlight = null;
          this.capturedSnapshot = null;
        }
      }) ?? null;
  }

  onModuleDestroy(): void {
    this.unsubscribeMaintenance?.();
  }

  invalidateSnapshotIndex(): void {
    this.snapshotIndex = null;
    this.snapshotIndexRefreshInFlight = null;
    this.areaCatalogHydrationLoads.clear();
    this.capturedSnapshot = null;
  }

  private async resolveEffectivePlaceablesTwoDaDescriptor(): Promise<EffectivePlaceablesTwoDaDescriptor | null> {
    try {
      return await this.templateCatalogRepository?.resolveEffectivePlaceablesTwoDaDescriptor?.() ?? null;
    } catch (error) {
      this.logger.warn(
        `Omitting effective placeables.2da provenance because catalog resolution failed: ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }

  private async resolveEffectiveWaypointTwoDaRows(): Promise<EffectiveWaypointTwoDaRowsResult | null> {
    try {
      return await this.templateCatalogRepository?.listEffectiveWaypointTwoDaRows?.({
        limit: 256,
        offset: 0,
      }) ?? null;
    } catch (error) {
      this.logger.warn(
        `Omitting effective waypoint.2da provenance because catalog resolution failed: ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }

  private async resolveEffectiveCreatureAppearanceTwoDaDescriptor(): Promise<
    EffectiveCreatureAppearanceTwoDaDescriptor | null
  > {
    try {
      return await this.templateCatalogRepository
        ?.resolveEffectiveCreatureAppearanceTwoDaDescriptor?.() ?? null;
    } catch (error) {
      this.logger.warn(
        `Omitting effective appearance.2da provenance because catalog resolution failed: ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }

  private async resolveEffectiveCreatureGenderTwoDaDescriptor(): Promise<
    EffectiveCreatureGenderTwoDaDescriptor | null
  > {
    try {
      return await this.templateCatalogRepository
        ?.resolveEffectiveCreatureGenderTwoDaDescriptor?.() ?? null;
    } catch (error) {
      this.logger.warn(
        `Omitting effective gender.2da provenance because catalog resolution failed: ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }

  private async resolveEffectiveCreatureAppendageTwoDaDescriptor(
    resourceName: "wingmodel.2da" | "tailmodel.2da",
  ): Promise<EffectiveCreatureAppendageTwoDaDescriptor | null> {
    try {
      return await this.templateCatalogRepository
        ?.resolveEffectiveCreatureAppendageTwoDaDescriptor?.(resourceName) ?? null;
    } catch (error) {
      this.logger.warn(
        `Omitting effective ${resourceName} provenance because catalog resolution failed: ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }

  private async resolveEffectiveCreaturePerceptionRangesTwoDaTable(): Promise<
    EffectiveCreaturePerceptionRangesTwoDaTableResult | null
  > {
    try {
      return await this.templateCatalogRepository
        ?.resolveEffectiveCreaturePerceptionRangesTwoDaTable?.() ?? null;
    } catch (error) {
      this.logger.warn(
        `Omitting effective ranges.2da provenance because catalog resolution failed: ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }

  private async resolveEffectiveCreatureWalkRatesTwoDaTable(): Promise<
    EffectiveCreatureWalkRatesTwoDaTableResult | null
  > {
    try {
      return await this.templateCatalogRepository
        ?.resolveEffectiveCreatureWalkRatesTwoDaTable?.() ?? null;
    } catch (error) {
      this.logger.warn(
        `Omitting effective creaturespeed.2da provenance because catalog resolution failed: ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }

  private async resolveEffectiveCreatureSoundSetsTwoDaTable(): Promise<
    EffectiveCreatureSoundSetsTwoDaTableResult | null
  > {
    try {
      return await this.templateCatalogRepository
        ?.resolveEffectiveCreatureSoundSetsTwoDaTable?.() ?? null;
    } catch (error) {
      this.logger.warn(
        `Omitting effective soundset.2da provenance because catalog resolution failed: ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }

  private async resolveEffectiveCreatureStartingPackagesTwoDaTable(): Promise<
    EffectiveCreatureStartingPackagesTwoDaTableResult | null
  > {
    try {
      return await this.templateCatalogRepository
        ?.resolveEffectiveCreatureStartingPackagesTwoDaTable?.() ?? null;
    } catch (error) {
      this.logger.warn(
        `Omitting effective packages.2da provenance because catalog resolution failed: ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }

  private async resolveEffectiveCreatureClassesTwoDaTable(): Promise<
    EffectiveCreatureClassesTwoDaTableResult | null
  > {
    try {
      return await this.templateCatalogRepository
        ?.resolveEffectiveCreatureClassesTwoDaTable?.() ?? null;
    } catch (error) {
      this.logger.warn(
        `Omitting effective classes.2da provenance because catalog resolution failed: ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }

  private async resolveEffectiveCreatureSkillsTwoDaTable(): Promise<
    EffectiveCreatureSkillsTwoDaTableResult | null
  > {
    try {
      return await this.templateCatalogRepository
        ?.resolveEffectiveCreatureSkillsTwoDaTable?.() ?? null;
    } catch (error) {
      this.logger.warn(
        `Omitting effective skills.2da provenance because catalog resolution failed: ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }

  private async resolveEffectiveCreatureFeatsTwoDaTable(): Promise<
    EffectiveCreatureFeatsTwoDaTableResult | null
  > {
    try {
      return await this.templateCatalogRepository
        ?.resolveEffectiveCreatureFeatsTwoDaTable?.() ?? null;
    } catch (error) {
      this.logger.warn(
        `Omitting effective feat.2da provenance because catalog resolution failed: ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }

  private async resolveEffectiveCreatureSpecialAbilitiesTwoDaTable(): Promise<
    EffectiveCreatureSpecialAbilitiesTwoDaTableResult | null
  > {
    try {
      return await this.templateCatalogRepository
        ?.resolveEffectiveCreatureSpecialAbilitiesTwoDaTable?.() ?? null;
    } catch (error) {
      this.logger.warn(
        `Omitting effective spells.2da provenance because catalog resolution failed: ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }

  private async resolveEffectiveCreaturePhenotypeTwoDaDescriptor(): Promise<
    EffectiveCreaturePhenotypeTwoDaDescriptor | null
  > {
    try {
      return await this.templateCatalogRepository
        ?.resolveEffectiveCreaturePhenotypeTwoDaDescriptor?.() ?? null;
    } catch (error) {
      this.logger.warn(
        `Omitting effective phenotype.2da provenance because catalog resolution failed: ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }

  private async resolveEffectiveTrapsTwoDaTable(): Promise<EffectiveTrapsTwoDaTableResult | null> {
    try {
      return await this.templateCatalogRepository?.resolveEffectiveTrapsTwoDaTable?.() ?? null;
    } catch (error) {
      this.logger.warn(
        `Omitting effective traps.2da provenance because catalog resolution failed: ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }

  private async resolveEffectiveItemBaseItemsTwoDaTable(): Promise<
    EffectiveItemBaseItemsTwoDaTableResult | null
  > {
    try {
      return await this.templateCatalogRepository
        ?.resolveEffectiveItemBaseItemsTwoDaTable?.() ?? null;
    } catch (error) {
      this.logger.warn(
        `Omitting effective baseitems.2da provenance because catalog resolution failed: ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }

  private async resolveEffectiveBodyBagTwoDaTable(): Promise<EffectiveBodyBagTwoDaTableResult | null> {
    try {
      return await this.templateCatalogRepository?.resolveEffectiveBodyBagTwoDaTable?.() ?? null;
    } catch (error) {
      this.logger.warn(
        `Omitting effective bodybag.2da provenance because catalog resolution failed: ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }

  private async resolveEffectivePortraitsTwoDaTable(): Promise<EffectivePortraitsTwoDaTableResult | null> {
    try {
      return await this.templateCatalogRepository?.resolveEffectivePortraitsTwoDaTable?.() ?? null;
    } catch (error) {
      this.logger.warn(
        `Omitting effective portraits.2da provenance because catalog resolution failed: ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }

  private async resolveEffectiveCreaturePortraitsTwoDaTable(): Promise<
    EffectiveCreaturePortraitsTwoDaTableResult | null
  > {
    try {
      return await this.templateCatalogRepository
        ?.resolveEffectiveCreaturePortraitsTwoDaTable?.() ?? null;
    } catch (error) {
      this.logger.warn(
        `Omitting effective Creature portraits.2da provenance because catalog resolution failed: ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }

  private async resolveEffectiveCreatureRacialTypesTwoDaTable(): Promise<
    EffectiveCreatureRacialTypesTwoDaTableResult | null
  > {
    try {
      return await this.templateCatalogRepository
        ?.resolveEffectiveCreatureRacialTypesTwoDaTable?.() ?? null;
    } catch (error) {
      this.logger.warn(
        `Omitting effective Creature racialtypes.2da provenance because catalog resolution failed: ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }

  private async resolveEffectiveAreaAudioCatalogs(): Promise<EffectiveAreaAudioCatalogBundleResult | null> {
    try {
      return await this.templateCatalogRepository?.resolveEffectiveAreaAudioCatalogs?.() ?? null;
    } catch (error) {
      this.logger.warn(
        `Omitting effective Area audio 2DA provenance because catalog resolution failed: ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }

  private async resolveEffectiveAreaVisualEnvironmentCatalogs(): Promise<EffectiveAreaVisualEnvironmentCatalogBundleResult | null> {
    try {
      return await this.templateCatalogRepository
        ?.resolveEffectiveAreaVisualEnvironmentCatalogs?.() ?? null;
    } catch (error) {
      this.logger.warn(
        `Omitting effective Area visual-environment 2DA provenance because catalog resolution failed: ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }

  private async resolveEffectiveAreaLoadingScreenCatalog(): Promise<EffectiveAreaLoadingScreenCatalogResult | null> {
    try {
      return await this.templateCatalogRepository?.resolveEffectiveAreaLoadingScreenCatalog?.() ?? null;
    } catch (error) {
      this.logger.warn(
        `Omitting effective loadscreens.2da provenance because catalog resolution failed: ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }

  private async resolveEffectiveAreaEncounterDifficultyCatalog(): Promise<
    EffectiveAreaEncounterDifficultyCatalogResult | null
  > {
    try {
      return await this.templateCatalogRepository
        ?.resolveEffectiveAreaEncounterDifficultyCatalog?.() ?? null;
    } catch (error) {
      this.logger.warn(
        `Omitting effective encdifficulty.2da provenance because catalog resolution failed: ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }

  private async resolveModuleFactionCatalog(): Promise<ModuleFactionCatalogResult | null> {
    try {
      return await this.templateCatalogRepository?.resolveModuleFactionCatalog?.() ?? null;
    } catch (error) {
      this.logger.warn(
        `Omitting module repute.fac provenance because catalog resolution failed: ${formatSnapshotIndexError(error)}`,
      );
      return null;
    }
  }

  async list(query: AreaListQuery): Promise<AreaListResult> {
    const index = await this.getSnapshotIndex();
    if (!index) {
      return this.fallback.list(query);
    }

    const normalizedQuery = query.query?.toLowerCase().trim();
    const normalizedBiome = query.biome?.toLowerCase().trim();
    const normalizedTag = query.tag?.toLowerCase().trim();

    const filtered = index.items
      .filter((area) => {
        if (!query.query) {
          return true;
        }
        return area.searchable.includes(normalizedQuery ?? "");
      })
      .filter((area) => {
        if (!query.biome) {
          return true;
        }
        return area.biomeLower === normalizedBiome;
      })
      .filter((area) => {
        if (!query.tag) {
          return true;
        }
        return area.tagsLower.has(normalizedTag ?? "");
      })
      .filter((area) => {
        if (typeof query.benchmark !== "boolean") {
          return true;
        }
        return area.listItem.benchmark === query.benchmark;
      });

    const items = filtered
      .slice(query.offset, query.offset + query.limit)
      .map((area) => area.listItem);
    return {
      items,
      total: filtered.length,
      limit: query.limit,
      offset: query.offset
    };
  }

  async findById(areaId: string): Promise<AreaRecord | null> {
    const index = await this.getSnapshotIndex();
    if (!index) {
      return this.fallback.findById(areaId);
    }
    const indexed = index.byId.get(areaId);
    if (!indexed) {
      return null;
    }
    if (indexed.hydratedRecord) {
      return indexed.hydratedRecord;
    }
    const inFlight = this.areaCatalogHydrationLoads.get(areaId);
    if (inFlight) {
      return inFlight;
    }
    const hydration = this.hydrateAreaEditorCatalogs(index, indexed).finally(() => {
      this.areaCatalogHydrationLoads.delete(areaId);
    });
    this.areaCatalogHydrationLoads.set(areaId, hydration);
    return hydration;
  }

  async findLightweightById(areaId: string): Promise<AreaRecord | null> {
    const index = await this.getSnapshotIndex();
    if (!index) {
      return this.fallback.findById(areaId);
    }
    const indexed = index.byId.get(areaId);
    return indexed ? this.materializeLightweightAreaRecord(index, indexed) : null;
  }

  getPrecomputedAreaProcessing(
    areaId: string
  ): { cacheKey: string; composition: AreaObjectCounts } | null {
    if (!this.snapshotIndex) {
      return this.fallback.getPrecomputedAreaProcessing?.(areaId) ?? null;
    }
    return this.snapshotIndex.processingById.get(areaId) ?? null;
  }

  private async getSnapshotIndex(): Promise<SnapshotIndex | null> {
    const now = Date.now();
    if (this.snapshotIndex && now - this.snapshotIndex.fetchedAtMs < SNAPSHOT_INDEX_CACHE_TTL_MS) {
      return this.snapshotIndex;
    }

    if (this.snapshotIndex) {
      this.refreshSnapshotIndexInBackground();
      return this.snapshotIndex;
    }

    if (!this.snapshotIndexRefreshInFlight) {
      this.snapshotIndexRefreshInFlight = this.rebuildSnapshotIndex().finally(() => {
        this.snapshotIndexRefreshInFlight = null;
      });
    }
    return this.snapshotIndexRefreshInFlight;
  }

  private refreshSnapshotIndexInBackground(): void {
    if (this.snapshotIndexRefreshInFlight) {
      return;
    }
    const previousIndex = this.snapshotIndex;
    this.snapshotIndexRefreshInFlight = this.rebuildSnapshotIndex()
      .catch((error) => {
        this.logger.warn(
          `Area snapshot index refresh failed; keeping stale index. ${formatErrorForLog(error)}`
        );
        return previousIndex;
      })
      .finally(() => {
        this.snapshotIndexRefreshInFlight = null;
      });
  }

  private async rebuildSnapshotIndex(): Promise<SnapshotIndex | null> {
    const now = Date.now();
    const settings = await this.runtimeSettingsRepository.get();
    let snapshot = await this.listAllModuleSnapshotObjects(settings.blobStorage);
    let candidates = buildAreaCandidatesFromSnapshot(snapshot.objects);
    if (candidates.length === 0) {
      const syncResult = await this.runtimeSettingsApplicationService.syncModuleAreaSourceFiles(
        "areas-module-source-auto-sync"
      );
      if (syncResult.uploadedFiles > 0) {
        snapshot = await this.listAllModuleSnapshotObjects(settings.blobStorage);
        candidates = buildAreaCandidatesFromSnapshot(snapshot.objects);
      }
    }
    const tileLightColorLookups = await this.buildTileLightColorLookupsFromSnapshot(
      settings.blobStorage,
      snapshot.objects
    );
    let tilesetLookup = await this.buildTilesetLookupFromSnapshot(settings.blobStorage, snapshot.objects);
    await this.enrichAreaCandidatesFromSnapshot(settings.blobStorage, candidates, tilesetLookup);
    const missingTilesetSetResRefs = collectMissingTilesetSetResRefs(candidates, tilesetLookup);
    if (missingTilesetSetResRefs.length > 0) {
      const syncResult =
        await this.runtimeSettingsApplicationService.syncVanillaTilesetSetSources(
          "areas-tileset-set-auto-sync"
        );
      if (syncResult.uploadedFiles > 0) {
        snapshot = await this.listAllModuleSnapshotObjects(settings.blobStorage);
        tilesetLookup = await this.buildTilesetLookupFromSnapshot(
          settings.blobStorage,
          snapshot.objects
        );
        refreshCandidateTilesetsFromLookup(candidates, tilesetLookup);
      }
    }

    const tileModelResRefs = collectAreaCandidateTileModelResRefs(candidates);
    const [areaWokLookup, tileModelLightNodeLookup] = await Promise.all([
      this.buildAreaWokLookupFromSnapshot(
        settings.blobStorage,
        snapshot.objects,
        tileModelResRefs,
        settings.sources.tile.hakPriorityList
      ),
      this.buildTileModelLightNodeLookupFromSnapshot(
        settings.blobStorage,
        snapshot.objects,
        tileModelResRefs,
        settings.sources.tile.hakPriorityList
      )
    ]);
    const missingAreaWokResRefs = tileModelResRefs.filter(
      (modelResRef) => !areaWokLookup.has(modelResRef)
    );
    this.refreshMissingAreaWokSourcesInBackground(missingAreaWokResRefs);

    if (candidates.length === 0) {
      this.logger.warn(
        "No area files detected in module snapshot (expected: *.are). Falling back to static repository."
      );
      this.snapshotIndex = null;
      return null;
    }

    const auroraWorldTimer = await this.buildAuroraWorldTimerFromSnapshot(
      settings.blobStorage,
      snapshot.objects
    );
    const moduleStartLocation = await this.buildModuleStartLocationFromSnapshot(
      settings.blobStorage,
      snapshot.objects,
      candidates.map((candidate) => candidate.resref),
    );
    const benchmarkIds = pickBenchmarkIds(candidates);
    const indexed = candidates
      .map((candidate) => buildIndexedArea(candidate, benchmarkIds))
      .sort((left, right) => left.listItem.areaId.localeCompare(right.listItem.areaId));

    this.snapshotIndex = {
      fetchedAtMs: now,
      items: indexed,
      byId: new Map(indexed.map((entry) => [entry.listItem.areaId, entry])),
      processingById: new Map(),
      materialization: {
        benchmarkIds,
        tileLightColorLookups,
        tileModelLightNodeLookup,
        areaWokLookup,
        ...(auroraWorldTimer ? { auroraWorldTimer } : {}),
        ...(moduleStartLocation
          ? {
              moduleStartLocation: moduleStartLocation.value,
              moduleStartLocationTargets: moduleStartLocation.targets,
              moduleIfoSha256: moduleStartLocation.ifoSha256,
            }
          : {}),
      },
    };

    return this.snapshotIndex;
  }

  private materializeLightweightAreaRecord(
    index: SnapshotIndex,
    indexed: IndexedArea,
  ): AreaRecord {
    const context = index.materialization;
    return mapCandidateToAreaRecord(
      indexed.candidate,
      context.benchmarkIds,
      context.tileLightColorLookups,
      context.tileModelLightNodeLookup,
      context.areaWokLookup,
      context.auroraWorldTimer,
      context.moduleStartLocation,
      context.moduleStartLocationTargets,
      context.moduleIfoSha256,
      null,
    );
  }

  private async hydrateAreaEditorCatalogs(
    index: SnapshotIndex,
    indexed: IndexedArea,
  ): Promise<AreaRecord> {
    const [
      effectivePlaceablesTwoDaDescriptor,
      effectiveWaypointTwoDaRows,
      effectiveCreatureAppearanceTwoDaDescriptor,
      effectiveCreatureGenderTwoDaDescriptor,
      effectiveCreatureWingModelTwoDaDescriptor,
      effectiveCreatureTailModelTwoDaDescriptor,
      effectiveCreaturePerceptionRangesTwoDaTable,
      effectiveCreatureWalkRatesTwoDaTable,
      effectiveCreatureSoundSetsTwoDaTable,
      effectiveCreatureStartingPackagesTwoDaTable,
      effectiveCreatureClassesTwoDaTable,
      effectiveCreatureSkillsTwoDaTable,
      effectiveCreatureFeatsTwoDaTable,
      effectiveCreatureSpecialAbilitiesTwoDaTable,
      effectiveCreaturePhenotypeTwoDaDescriptor,
      effectiveItemBaseItemsTwoDaTable,
      effectiveTrapsTwoDaTable,
      effectiveBodyBagTwoDaTable,
      effectivePortraitsTwoDaTable,
      effectiveCreaturePortraitsTwoDaTable,
      effectiveCreatureRacialTypesTwoDaTable,
      effectiveAreaAudioCatalogs,
      effectiveAreaVisualEnvironmentCatalogs,
      effectiveAreaLoadingScreenCatalog,
      effectiveAreaEncounterDifficultyCatalog,
      moduleFactionCatalog,
    ] = await Promise.all([
      this.resolveEffectivePlaceablesTwoDaDescriptor(),
      this.resolveEffectiveWaypointTwoDaRows(),
      this.resolveEffectiveCreatureAppearanceTwoDaDescriptor(),
      this.resolveEffectiveCreatureGenderTwoDaDescriptor(),
      this.resolveEffectiveCreatureAppendageTwoDaDescriptor("wingmodel.2da"),
      this.resolveEffectiveCreatureAppendageTwoDaDescriptor("tailmodel.2da"),
      this.resolveEffectiveCreaturePerceptionRangesTwoDaTable(),
      this.resolveEffectiveCreatureWalkRatesTwoDaTable(),
      this.resolveEffectiveCreatureSoundSetsTwoDaTable(),
      this.resolveEffectiveCreatureStartingPackagesTwoDaTable(),
      this.resolveEffectiveCreatureClassesTwoDaTable(),
      this.resolveEffectiveCreatureSkillsTwoDaTable(),
      this.resolveEffectiveCreatureFeatsTwoDaTable(),
      this.resolveEffectiveCreatureSpecialAbilitiesTwoDaTable(),
      this.resolveEffectiveCreaturePhenotypeTwoDaDescriptor(),
      this.resolveEffectiveItemBaseItemsTwoDaTable(),
      this.resolveEffectiveTrapsTwoDaTable(),
      this.resolveEffectiveBodyBagTwoDaTable(),
      this.resolveEffectivePortraitsTwoDaTable(),
      this.resolveEffectiveCreaturePortraitsTwoDaTable(),
      this.resolveEffectiveCreatureRacialTypesTwoDaTable(),
      this.resolveEffectiveAreaAudioCatalogs(),
      this.resolveEffectiveAreaVisualEnvironmentCatalogs(),
      this.resolveEffectiveAreaLoadingScreenCatalog(),
      this.resolveEffectiveAreaEncounterDifficultyCatalog(),
      this.resolveModuleFactionCatalog(),
    ]);
    const context = index.materialization;
    const record = mapCandidateToAreaRecord(
      indexed.candidate,
      context.benchmarkIds,
      context.tileLightColorLookups,
      context.tileModelLightNodeLookup,
      context.areaWokLookup,
      context.auroraWorldTimer,
      context.moduleStartLocation,
      context.moduleStartLocationTargets,
      context.moduleIfoSha256,
      effectivePlaceablesTwoDaDescriptor,
      effectiveWaypointTwoDaRows,
      effectiveCreatureAppearanceTwoDaDescriptor,
      effectiveCreatureGenderTwoDaDescriptor,
      effectiveCreatureWingModelTwoDaDescriptor,
      effectiveCreatureTailModelTwoDaDescriptor,
      effectiveCreaturePerceptionRangesTwoDaTable,
      effectiveCreatureWalkRatesTwoDaTable,
      effectiveCreatureSoundSetsTwoDaTable,
      effectiveCreatureStartingPackagesTwoDaTable,
      effectiveCreatureClassesTwoDaTable,
      effectiveCreatureSkillsTwoDaTable,
      effectiveCreatureFeatsTwoDaTable,
      effectiveCreatureSpecialAbilitiesTwoDaTable,
      effectiveCreaturePhenotypeTwoDaDescriptor,
      effectiveItemBaseItemsTwoDaTable,
      effectiveTrapsTwoDaTable,
      effectiveBodyBagTwoDaTable,
      effectivePortraitsTwoDaTable,
      effectiveCreaturePortraitsTwoDaTable,
      effectiveCreatureRacialTypesTwoDaTable,
      effectiveAreaAudioCatalogs,
      effectiveAreaVisualEnvironmentCatalogs,
      effectiveAreaLoadingScreenCatalog,
      effectiveAreaEncounterDifficultyCatalog,
      moduleFactionCatalog,
    );
    indexed.hydratedRecord = record;
    indexed.composition = countAreaObjectsByKind(record.objects);
    const processingCacheKey = buildAreaProcessCacheKey(record);
    index.processingById.set(record.areaId, {
      cacheKey: processingCacheKey,
      composition: indexed.composition,
    });
    return record;
  }

  /**
   * WOK files enrich the optional static collision used by Area VFX.  They are
   * not required to list, create, or edit an Aurora Area: tile rendering has
   * its own on-demand source sync.  In particular, a CEP/HAK profile can
   * contain thousands of models, so waiting for this bulk sync here made the
   * Area workspace appear unavailable on a cold start.
   */
  private refreshMissingAreaWokSourcesInBackground(missingModelResRefs: readonly string[]): void {
    if (missingModelResRefs.length === 0 || this.areaWokSourceSyncInFlight) {
      return;
    }

    this.areaWokSourceSyncInFlight = this.runtimeSettingsApplicationService
      .syncVanillaTileModelSources("areas-vfx-wok-background-sync", [...missingModelResRefs])
      .then((result) => {
        if (result.uploadedFiles > 0) {
          // The next read rebuilds the optional collision lookup from the
          // newly uploaded source files.  The already returned Area record
          // remains valid for editing and tile placement.
          this.snapshotIndex = null;
        }
      })
      .catch((error) => {
        this.logger.warn(
          `Background Area WOK source sync failed; Area editing remains available. ${formatErrorForLog(error)}`
        );
      })
      .finally(() => {
        this.areaWokSourceSyncInFlight = null;
      });
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
        ? await captured.listModuleSnapshot({
            limit: 50_000,
            continuationToken,
          })
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

  private async readSnapshotObject(settings: BlobStorageSettings, key: string) {
    if (this.committedSnapshotReader) {
      this.capturedSnapshot ??= await this.committedSnapshotReader.capture();
      return this.capturedSnapshot.getModuleObject(key);
    }
    return this.moduleBlobStorage.getModuleObject(settings, key);
  }

  private async enrichAreaCandidatesFromSnapshot(
    settings: BlobStorageSettings,
    candidates: AreaCandidate[],
    tilesetLookup: ReadonlyMap<string, readonly ParsedTilesetBlueprint[]>
  ): Promise<void> {
    await mapWithConcurrency(candidates, 6, async (candidate) => {
      try {
        const arePayload = await this.readSnapshotObject(settings, candidate.areSourceKey);
        if (arePayload) {
          candidate.areSourceSize = arePayload.size;
          candidate.areSourceEtag = arePayload.etag ?? candidate.areSourceEtag;
          candidate.areUpdatedAt = arePayload.lastModified ?? candidate.areUpdatedAt;
          candidate.areSourceSha256 = buildContentHash(arePayload.bytes);
          candidate.parsedArea = parseAreaMetadataFromAreGff(arePayload.bytes) ?? undefined;
        }
      } catch {
        // Keep heuristics if binary payload is unavailable.
      }

      if (candidate.gitSourceKey) {
        let gitBytes: Buffer | undefined;
        try {
          const gitPayload = await this.readSnapshotObject(
            settings,
            candidate.gitSourceKey
          );
          if (gitPayload) {
            candidate.gitSourceSize = gitPayload.size;
            candidate.gitSourceEtag = gitPayload.etag ?? candidate.gitSourceEtag;
            candidate.gitUpdatedAt = gitPayload.lastModified ?? candidate.gitUpdatedAt;
            candidate.gitSourceSha256 = buildContentHash(gitPayload.bytes);
            gitBytes = gitPayload.bytes;
            candidate.parsedObjects = parseAreaObjectsFromGitGff(gitPayload.bytes) ?? undefined;
          }
        } catch {
          // Keep heuristics if binary payload is unavailable.
        }
        if (candidate.gicSourceKey) {
          try {
            const gicPayload = await this.readSnapshotObject(settings, candidate.gicSourceKey);
            if (gicPayload) {
              candidate.gicSourceSize = gicPayload.size;
              candidate.gicSourceEtag = gicPayload.etag ?? candidate.gicSourceEtag;
              candidate.gicUpdatedAt = gicPayload.lastModified ?? candidate.gicUpdatedAt;
              candidate.gicSourceSha256 = buildContentHash(gicPayload.bytes);
              if (gitBytes) {
                candidate.parsedObjects =
                  parseAreaObjectsFromGitGicGff(gitBytes, gicPayload.bytes) ??
                  candidate.parsedObjects;
              }
            }
          } catch {
            // GIC-only editor metadata is omitted when the exact companion cannot be read or paired.
          }
        }
      }

      const tileSet = normalizeResref(candidate.parsedArea?.tileSet ?? "");
      if (tileSet) {
        candidate.parsedTileset = selectTilesetForAreaTiles(
          tilesetLookup.get(tileSet),
          candidate.parsedArea?.tiles ?? []
        );
      }

      candidate.sourceFingerprint = buildSourceFingerprint(candidate);
    });
  }

  private async buildTilesetLookupFromSnapshot(
    settings: BlobStorageSettings,
    objects: ModuleBlobObjectSummary[]
  ): Promise<ParsedTilesetLookup> {
    const setObjects = collectTilesetSetObjects(objects);
    const lookup: ParsedTilesetLookup = new Map();
    await mapWithConcurrency(setObjects, 4, async (object) => {
      const resref = normalizeResref(extractBasename(extractFileName(object.key)));
      if (!resref) {
        return;
      }
      try {
        const payload = await this.readSnapshotObject(settings, object.key);
        if (!payload) {
          return;
        }
        const parsedTiles = parseAuroraSetTiles(payload.bytes);
        const current = lookup.get(resref) ?? [];
        current.push({
          sourceKey: object.key,
          sourceSize: object.size,
          updatedAt: object.lastModified ?? payload.lastModified ?? new Date(0).toISOString(),
          sourceEtag: object.etag ?? payload.etag,
          tilesById: parsedTiles
        });
        lookup.set(resref, current);
      } catch {
        // Missing or unreadable SET payload keeps tile instances traceable to ARE only.
      }
    });
    return lookup;
  }

  private async buildAreaWokLookupFromSnapshot(
    settings: BlobStorageSettings,
    objects: ModuleBlobObjectSummary[],
    modelResRefs: readonly string[],
    hakPriorityList: readonly string[]
  ): Promise<AreaWokResourceLookup> {
    const requested = new Set(modelResRefs.map(normalizeResref).filter(Boolean));
    const candidatesByResRef = new Map<string, ModuleBlobObjectSummary[]>();
    for (const object of objects) {
      const fileName = extractFileName(object.key).trim().toLowerCase();
      if (!fileName.endsWith(".wok")) {
        continue;
      }
      const modelResRef = normalizeResref(extractBasename(fileName));
      if (!requested.has(modelResRef)) {
        continue;
      }
      const candidates = candidatesByResRef.get(modelResRef) ?? [];
      candidates.push(object);
      candidatesByResRef.set(modelResRef, candidates);
    }

    const lookup: AreaWokResourceLookup = new Map();
    await mapWithConcurrency([...requested], 6, async (modelResRef) => {
      const candidates = [...(candidatesByResRef.get(modelResRef) ?? [])].sort((left, right) =>
        compareAreaWokSourcePriority(left.key, right.key, hakPriorityList)
      );
      for (const candidate of candidates) {
        try {
          const payload = await this.readSnapshotObject(settings, candidate.key);
          if (!payload) {
            continue;
          }
          const walkmesh = parseAuroraAsciiWokWalkmesh(payload.bytes);
          if (!hasUsableAreaWokGeometry(walkmesh)) {
            continue;
          }
          const sourceHash = buildContentHash(payload.bytes);
          lookup.set(modelResRef, {
            resourceId: `wok:${modelResRef}:${sourceHash.slice(0, 16)}`,
            modelResRef,
            sourceObjectKey: candidate.key,
            sourceLayer: resolveAreaWokSourceLayer(candidate.key),
            sourceHash,
            walkmesh
          });
          break;
        } catch {
          // A lower-precedence source may still provide a valid ASCII WOK.
        }
      }
    });
    return lookup;
  }

  private async buildTileModelLightNodeLookupFromSnapshot(
    settings: BlobStorageSettings,
    objects: ModuleBlobObjectSummary[],
    modelResRefs: readonly string[],
    hakPriorityList: readonly string[]
  ): Promise<TileModelLightNodeLookup> {
    const requested = new Set(modelResRefs.map(normalizeResref).filter(Boolean));
    const candidatesByResRef = new Map<string, ModuleBlobObjectSummary[]>();
    for (const object of objects) {
      const fileName = extractFileName(object.key).trim().toLowerCase();
      if (!fileName.endsWith(".mdl")) {
        continue;
      }
      const modelResRef = normalizeResref(extractBasename(fileName));
      if (!requested.has(modelResRef)) {
        continue;
      }
      const candidates = candidatesByResRef.get(modelResRef) ?? [];
      candidates.push(object);
      candidatesByResRef.set(modelResRef, candidates);
    }

    const lookup: TileModelLightNodeLookup = new Map();
    await mapWithConcurrency([...requested], 6, async (modelResRef) => {
      const candidates = [...(candidatesByResRef.get(modelResRef) ?? [])].sort(
        (left, right) =>
          compareAreaTileModelSourcePriority(left.key, right.key, hakPriorityList)
      );
      for (const candidate of candidates) {
        try {
          const payload = await this.readSnapshotObject(settings, candidate.key);
          if (!payload) {
            continue;
          }
          const sourceModelHash = buildContentHash(payload.bytes);
          const parsed = parseAuroraMdlVfxSource(payload.bytes, {
            sourceModelObjectKey: candidate.key,
            sourceModelFileName: `${modelResRef}.mdl`,
            sourceModelHash
          });
          lookup.set(modelResRef, {
            ...optionalNativeMainLightNode(
              "mainLight1",
              parsed.lights,
              modelResRef,
              candidate.key,
              sourceModelHash
            ),
            ...optionalNativeMainLightNode(
              "mainLight2",
              parsed.lights,
              modelResRef,
              candidate.key,
              sourceModelHash
            ),
            sourceLight1: resolveAreaTileSourceLightNode(
              1,
              parsed.modelGraph.nodes,
              modelResRef,
              candidate.key,
              sourceModelHash
            ),
            sourceLight2: resolveAreaTileSourceLightNode(
              2,
              parsed.modelGraph.nodes,
              modelResRef,
              candidate.key,
              sourceModelHash
            )
          });
          break;
        } catch {
          // Try the next lower-precedence source only when this source is unreadable.
        }
      }
    });
    return lookup;
  }

  private async buildAuroraWorldTimerFromSnapshot(
    settings: BlobStorageSettings,
    objects: readonly ModuleBlobObjectSummary[]
  ): Promise<AuroraWorldTimerContract | undefined> {
    const candidates = objects
      .filter((object) => {
        const normalizedKey = object.key.replace(/\\/gu, "/").toLowerCase();
        return (
          (normalizedKey === "module.ifo" || normalizedKey.endsWith("/module.ifo")) &&
          !normalizedKey.includes("/__aurora/sources/")
        );
      })
      .sort((left, right) => left.key.length - right.key.length || left.key.localeCompare(right.key));

    for (const candidate of candidates) {
      try {
        const payload = await this.readSnapshotObject(settings, candidate.key);
        if (!payload) {
          continue;
        }
        const contract = parseAuroraWorldTimerFromModuleIfo(payload.bytes, candidate.key);
        if (contract) {
          return contract;
        }
      } catch {
        // A later canonical module.ifo candidate may still be readable.
      }
    }
    return undefined;
  }

  private async buildModuleStartLocationFromSnapshot(
    settings: BlobStorageSettings,
    objects: readonly ModuleBlobObjectSummary[],
    areaSourceResRefs: readonly string[],
  ): Promise<Readonly<{
    value: AreaModuleStartLocation;
    targets: readonly string[];
    ifoSha256: string;
  }> | undefined> {
    const candidates = objects
      .filter((object) => {
        const normalizedKey = object.key.replace(/\\/gu, "/").toLowerCase();
        return (normalizedKey === "module.ifo" || normalizedKey.endsWith("/module.ifo"))
          && !normalizedKey.includes("/__aurora/sources/");
      })
      .sort((left, right) => left.key.length - right.key.length || left.key.localeCompare(right.key));
    for (const candidate of candidates) {
      try {
        const payload = await this.readSnapshotObject(settings, candidate.key);
        if (!payload) continue;
        const value = readModuleIfoStartLocation(payload.bytes);
        if (!value) continue;
        const targets = [...new Set(areaSourceResRefs)]
          .filter((areaResRef) => moduleIfoAreaMembershipCount(payload.bytes, areaResRef) === 1)
          .sort((left, right) => left.localeCompare(right));
        if (targets.length === 0 || targets.length > 4096) continue;
        return Object.freeze({
          value,
          targets: Object.freeze(targets),
          ifoSha256: createHash("sha256").update(payload.bytes).digest("hex"),
        });
      } catch {
        // A later canonical module.ifo candidate may still be readable.
      }
    }
    return undefined;
  }

  private async buildTileLightColorLookupsFromSnapshot(
    settings: BlobStorageSettings,
    objects: ModuleBlobObjectSummary[]
  ): Promise<TileLightColorLookups> {
    const [mainLight, sourceLight] = await Promise.all([
      this.buildTileLightColorLookupFromSnapshot(settings, objects, "lightcolor.2da", "lightcolor"),
      this.buildTileSourceLightColorLookupFromSnapshot(settings, objects)
    ]);
    return { mainLight, sourceLight };
  }

  private async buildTileLightColorLookupFromSnapshot(
    settings: BlobStorageSettings,
    objects: ModuleBlobObjectSummary[],
    tableFileName: "lightcolor.2da" | "tilecolor.2da",
    resourceResref: "lightcolor" | "tilecolor"
  ): Promise<TileColorTwoDaLookup> {
    const sources: LoadedTileColorTwoDaSource[] = [];
    const keys = collectTwoDaKeys(objects, tableFileName);

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
      const rows = parseTileColorTwoDaRows(payload.bytes, {
        tableFileName,
        sourceKey: key,
        sourceEtag: object?.etag ?? payload.etag
      });
      if (rows.length === 0) {
        continue;
      }
      sources.push({
        key,
        sourceSize: object?.size ?? payload.size,
        updatedAt: object?.lastModified ?? payload.lastModified ?? new Date(0).toISOString(),
        sourceEtag: object?.etag ?? payload.etag,
        rows
      });
    }

    return buildTileColorTwoDaLookup([
      ...sources,
      ...(await this.loadRuntimeSourceTileColorTwoDaSources(tableFileName, resourceResref))
    ]);
  }

  private async loadRuntimeSourceTileColorTwoDaSources(
    tableFileName: "lightcolor.2da" | "tilecolor.2da",
    resourceResref: "lightcolor" | "tilecolor"
  ): Promise<LoadedTileColorTwoDaSource[]> {
    if (
      !this.runtimeSettingsApplicationService ||
      typeof this.runtimeSettingsApplicationService.getRuntimeSettings !== "function"
    ) {
      return [];
    }
    const settings = await this.runtimeSettingsApplicationService.getRuntimeSettings();
    if (!settings.sources.tile.includeVanilla) {
      return [];
    }

    const vanillaSource = await readRuntimeTileColorTwoDaSourceFromVanilla(
      settings.paths.vanillaDataPath,
      tableFileName,
      resourceResref,
      this.logger
    );
    if (!vanillaSource) {
      return [];
    }

    this.logger.log(
      `Loaded ${tableFileName} area tile light lookup directly from runtime sources (rows=${vanillaSource.rows.length}).`
    );
    return [vanillaSource];
  }

  private async buildTileSourceLightColorLookupFromSnapshot(
    settings: BlobStorageSettings,
    objects: ModuleBlobObjectSummary[]
  ): Promise<TileColorTwoDaLookup> {
    const sources: LoadedTileColorTwoDaSource[] = [];
    const keys = collectTwoDaKeys(objects, "fx_flame01.mdl");
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
      const rows = parseTileSourceLightModelRows(payload.bytes, key);
      if (rows.length === 0) {
        continue;
      }
      sources.push({
        key,
        sourceSize: object?.size ?? payload.size,
        updatedAt: object?.lastModified ?? payload.lastModified ?? new Date(0).toISOString(),
        sourceEtag: object?.etag ?? payload.etag,
        rows
      });
    }

    return buildTileColorTwoDaLookup([
      ...sources,
      ...(await this.loadRuntimeTileSourceLightModelSources())
    ]);
  }

  private async loadRuntimeTileSourceLightModelSources(): Promise<LoadedTileColorTwoDaSource[]> {
    if (
      !this.runtimeSettingsApplicationService ||
      typeof this.runtimeSettingsApplicationService.getRuntimeSettings !== "function"
    ) {
      return [];
    }
    const settings = await this.runtimeSettingsApplicationService.getRuntimeSettings();
    if (!settings.sources.tile.includeVanilla) {
      return [];
    }
    const vanillaSource = await readRuntimeTileSourceLightModelFromVanilla(
      settings.paths.vanillaDataPath,
      this.logger
    );
    if (!vanillaSource) {
      return [];
    }
    this.logger.log(
      `Loaded fx_flame01.mdl tile source-light animation lookup directly from runtime sources (rows=${vanillaSource.rows.length}).`
    );
    return [vanillaSource];
  }
}

function collectMissingTilesetSetResRefs(
  candidates: AreaCandidate[],
  tilesetLookup: ReadonlyMap<string, readonly ParsedTilesetBlueprint[]>
): string[] {
  const missing = new Set<string>();
  for (const candidate of candidates) {
    const tileSet = normalizeResref(candidate.parsedArea?.tileSet ?? "");
    if (!tileSet || candidate.parsedArea?.tiles.length === 0 || tilesetLookup.has(tileSet)) {
      continue;
    }
    missing.add(tileSet);
  }
  return [...missing].sort((left, right) => left.localeCompare(right));
}

function refreshCandidateTilesetsFromLookup(
  candidates: AreaCandidate[],
  tilesetLookup: ReadonlyMap<string, readonly ParsedTilesetBlueprint[]>
): void {
  for (const candidate of candidates) {
    const tileSet = normalizeResref(candidate.parsedArea?.tileSet ?? "");
    const parsedTileset = tileSet
      ? selectTilesetForAreaTiles(tilesetLookup.get(tileSet), candidate.parsedArea?.tiles ?? [])
      : undefined;
    if (parsedTileset) {
      candidate.parsedTileset = parsedTileset;
    } else {
      delete candidate.parsedTileset;
    }
    candidate.sourceFingerprint = buildSourceFingerprint(candidate);
  }
}

function selectTilesetForAreaTiles(
  candidates: readonly ParsedTilesetBlueprint[] | undefined,
  areaTiles: readonly ParsedAreaMetadataBlueprint["tiles"][number][]
): ParsedTilesetBlueprint | undefined {
  if (!candidates || candidates.length === 0) {
    return undefined;
  }
  if (candidates.length === 1 || areaTiles.length === 0) {
    return candidates[0];
  }

  let selected = candidates[0];
  let selectedCoverage = scoreTilesetAreaCoverage(selected, areaTiles);

  for (const candidate of candidates.slice(1)) {
    const coverage = scoreTilesetAreaCoverage(candidate, areaTiles);
    if (
      coverage.modelHits > selectedCoverage.modelHits ||
      (coverage.modelHits === selectedCoverage.modelHits &&
        coverage.tileHits > selectedCoverage.tileHits)
    ) {
      selected = candidate;
      selectedCoverage = coverage;
    }
  }

  return selected;
}

function scoreTilesetAreaCoverage(
  tileset: ParsedTilesetBlueprint,
  areaTiles: readonly ParsedAreaMetadataBlueprint["tiles"][number][]
): { tileHits: number; modelHits: number } {
  let tileHits = 0;
  let modelHits = 0;
  for (const tile of areaTiles) {
    if (tile.tileId === undefined) {
      continue;
    }
    const entry = tileset.tilesById.get(tile.tileId);
    if (!entry) {
      continue;
    }
    tileHits += 1;
    if (entry.modelResRef) {
      modelHits += 1;
    }
  }
  return { tileHits, modelHits };
}

function buildAreaCandidatesFromSnapshot(objects: ModuleBlobObjectSummary[]): AreaCandidate[] {
  const byResref = new Map<string, AreaCandidate>();

  for (const object of objects) {
    const fileName = extractFileName(object.key);
    const extension = extractExtension(fileName);
    if (extension !== "are" && extension !== "git" && extension !== "gic") {
      continue;
    }

    const resref = normalizeResref(extractBasename(fileName));
    if (resref.length < 2) {
      continue;
    }

    const current = byResref.get(resref) ?? createEmptyAreaCandidate(resref);
    if (extension === "are") {
      updateAreaSource(current, object);
    } else if (extension === "git") {
      updateGitSource(current, object);
    } else {
      current.gicCandidates.push(object);
    }
    current.sourceFingerprint = buildSourceFingerprint(current);
    byResref.set(resref, current);
  }

  const candidates = [...byResref.values()].filter((candidate) => candidate.areSourceKey.length > 0);
  candidates.forEach(resolveExactGicCompanion);
  return candidates;
}

function createEmptyAreaCandidate(resref: string): AreaCandidate {
  return {
    resref,
    areSourceKey: "",
    areSourceSize: 0,
    areUpdatedAt: new Date().toISOString(),
    gicCandidates: [],
    sourceFingerprint: ""
  };
}

function resolveExactGicCompanion(candidate: AreaCandidate): void {
  if (!candidate.gitSourceKey) return;
  const extensionIndex = candidate.gitSourceKey.lastIndexOf(".");
  if (extensionIndex < 0) return;
  const exactKey = `${candidate.gitSourceKey.slice(0, extensionIndex)}.gic`;
  const matches = candidate.gicCandidates.filter((entry) => entry.key === exactKey);
  if (matches.length !== 1) return;
  const [object] = matches;
  candidate.gicSourceKey = object.key;
  candidate.gicSourceSize = object.size;
  candidate.gicSourceEtag = object.etag;
  candidate.gicUpdatedAt = object.lastModified ?? candidate.gitUpdatedAt ?? candidate.areUpdatedAt;
}

function updateAreaSource(candidate: AreaCandidate, object: ModuleBlobObjectSummary): void {
  if (!candidate.areSourceKey) {
    candidate.areSourceKey = object.key;
    candidate.areSourceSize = object.size;
    candidate.areSourceEtag = object.etag;
    candidate.areUpdatedAt = object.lastModified ?? candidate.areUpdatedAt;
    return;
  }

  const candidateUpdatedAt = object.lastModified ?? candidate.areUpdatedAt;
  if (object.size > candidate.areSourceSize) {
    candidate.areSourceKey = object.key;
    candidate.areSourceSize = object.size;
    candidate.areSourceEtag = object.etag;
    candidate.areUpdatedAt = candidateUpdatedAt;
    return;
  }
  if (object.size === candidate.areSourceSize && candidateUpdatedAt > candidate.areUpdatedAt) {
    candidate.areSourceKey = object.key;
    candidate.areSourceEtag = object.etag;
    candidate.areUpdatedAt = candidateUpdatedAt;
  }
}

function updateGitSource(candidate: AreaCandidate, object: ModuleBlobObjectSummary): void {
  if (!candidate.gitSourceKey) {
    candidate.gitSourceKey = object.key;
    candidate.gitSourceSize = object.size;
    candidate.gitSourceEtag = object.etag;
    candidate.gitUpdatedAt = object.lastModified ?? candidate.areUpdatedAt;
    return;
  }

  const currentSize = candidate.gitSourceSize ?? 0;
  const currentUpdated = candidate.gitUpdatedAt ?? candidate.areUpdatedAt;
  const nextUpdated = object.lastModified ?? currentUpdated;

  if (object.size > currentSize) {
    candidate.gitSourceKey = object.key;
    candidate.gitSourceSize = object.size;
    candidate.gitSourceEtag = object.etag;
    candidate.gitUpdatedAt = nextUpdated;
    return;
  }
  if (object.size === currentSize && nextUpdated > currentUpdated) {
    candidate.gitSourceKey = object.key;
    candidate.gitSourceEtag = object.etag;
    candidate.gitUpdatedAt = nextUpdated;
  }
}

function mapCandidateToAreaRecord(
  candidate: AreaCandidate,
  benchmarkIds: Set<string>,
  tileLightColorLookups: TileLightColorLookups,
  tileModelLightNodeLookup: ReadonlyMap<string, TileModelLightNodes>,
  areaWokLookup: ReadonlyMap<string, AuroraAreaVfxCollisionResource>,
  auroraWorldTimer?: AuroraWorldTimerContract,
  moduleStartLocation?: AreaModuleStartLocation,
  moduleStartLocationTargets?: readonly string[],
  moduleIfoSha256?: string,
  effectivePlaceablesTwoDaDescriptor?: EffectivePlaceablesTwoDaDescriptor | null,
  effectiveWaypointTwoDaRows?: EffectiveWaypointTwoDaRowsResult | null,
  effectiveCreatureAppearanceTwoDaDescriptor?: EffectiveCreatureAppearanceTwoDaDescriptor | null,
  effectiveCreatureGenderTwoDaDescriptor?: EffectiveCreatureGenderTwoDaDescriptor | null,
  effectiveCreatureWingModelTwoDaDescriptor?: EffectiveCreatureAppendageTwoDaDescriptor | null,
  effectiveCreatureTailModelTwoDaDescriptor?: EffectiveCreatureAppendageTwoDaDescriptor | null,
  effectiveCreaturePerceptionRangesTwoDaTable?:
    EffectiveCreaturePerceptionRangesTwoDaTableResult | null,
  effectiveCreatureWalkRatesTwoDaTable?: EffectiveCreatureWalkRatesTwoDaTableResult | null,
  effectiveCreatureSoundSetsTwoDaTable?: EffectiveCreatureSoundSetsTwoDaTableResult | null,
  effectiveCreatureStartingPackagesTwoDaTable?:
    EffectiveCreatureStartingPackagesTwoDaTableResult | null,
  effectiveCreatureClassesTwoDaTable?: EffectiveCreatureClassesTwoDaTableResult | null,
  effectiveCreatureSkillsTwoDaTable?: EffectiveCreatureSkillsTwoDaTableResult | null,
  effectiveCreatureFeatsTwoDaTable?: EffectiveCreatureFeatsTwoDaTableResult | null,
  effectiveCreatureSpecialAbilitiesTwoDaTable?:
    EffectiveCreatureSpecialAbilitiesTwoDaTableResult | null,
  effectiveCreaturePhenotypeTwoDaDescriptor?: EffectiveCreaturePhenotypeTwoDaDescriptor | null,
  effectiveItemBaseItemsTwoDaTable?: EffectiveItemBaseItemsTwoDaTableResult | null,
  effectiveTrapsTwoDaTable?: EffectiveTrapsTwoDaTableResult | null,
  effectiveBodyBagTwoDaTable?: EffectiveBodyBagTwoDaTableResult | null,
  effectivePortraitsTwoDaTable?: EffectivePortraitsTwoDaTableResult | null,
  effectiveCreaturePortraitsTwoDaTable?: EffectiveCreaturePortraitsTwoDaTableResult | null,
  effectiveCreatureRacialTypesTwoDaTable?: EffectiveCreatureRacialTypesTwoDaTableResult | null,
  effectiveAreaAudioCatalogs?: EffectiveAreaAudioCatalogBundleResult | null,
  effectiveAreaVisualEnvironmentCatalogs?: EffectiveAreaVisualEnvironmentCatalogBundleResult | null,
  effectiveAreaLoadingScreenCatalog?: EffectiveAreaLoadingScreenCatalogResult | null,
  effectiveAreaEncounterDifficultyCatalog?:
    EffectiveAreaEncounterDifficultyCatalogResult | null,
  moduleFactionCatalog?: ModuleFactionCatalogResult | null,
): AreaRecord {
  const biome = inferBiome(candidate);
  const dimensions = resolveDimensions(candidate);
  const areaId = `area_${candidate.resref}`.slice(0, 80);
  const tileSet = normalizeResref(candidate.parsedArea?.tileSet ?? "");
  const tiles = buildAreaTiles(
    candidate,
    areaId,
    dimensions,
    tileSet,
    tileLightColorLookups,
    tileModelLightNodeLookup
  );
  const auroraVfxCollision = buildAreaAuroraVfxCollision(tiles, areaWokLookup);
  const objects = buildAreaObjects(
    candidate,
    effectivePlaceablesTwoDaDescriptor,
    effectiveWaypointTwoDaRows,
    effectiveCreatureAppearanceTwoDaDescriptor,
    effectiveCreatureGenderTwoDaDescriptor,
    effectiveCreatureWingModelTwoDaDescriptor,
    effectiveCreatureTailModelTwoDaDescriptor,
    effectiveCreaturePerceptionRangesTwoDaTable,
    effectiveCreatureWalkRatesTwoDaTable,
    effectiveCreatureSoundSetsTwoDaTable,
    effectiveCreatureStartingPackagesTwoDaTable,
    effectiveCreatureClassesTwoDaTable,
    effectiveCreatureSkillsTwoDaTable,
    effectiveCreatureFeatsTwoDaTable,
    effectiveCreatureSpecialAbilitiesTwoDaTable,
    effectiveCreaturePhenotypeTwoDaDescriptor,
    effectiveItemBaseItemsTwoDaTable,
    effectiveCreaturePortraitsTwoDaTable,
    effectiveCreatureRacialTypesTwoDaTable,
  );
  const updatedAt = chooseUpdatedAt(candidate);

  return {
    areaId,
    name: resolveAreaName(candidate),
    biome,
    width: dimensions.width,
    height: dimensions.height,
    tags: buildTags(candidate, biome),
    ...(candidate.parsedArea?.comments !== undefined
      ? { comments: candidate.parsedArea.comments }
      : {}),
    ...(candidate.parsedArea?.eventScripts !== undefined
      ? { eventScripts: { ...candidate.parsedArea.eventScripts } }
      : {}),
    ...(candidate.parsedArea?.basicIdentity !== undefined
      ? {
          basicIdentity: {
            ...candidate.parsedArea.basicIdentity,
            ...(candidate.parsedArea.basicIdentity.nameEntries
              ? {
                  nameEntries: candidate.parsedArea.basicIdentity.nameEntries.map(
                    (entry) => ({ ...entry }),
                  ),
                }
              : {}),
          },
        }
      : {}),
    ...(candidate.parsedArea?.advancedFlags !== undefined
      ? {
          advancedFlags: {
            ...candidate.parsedArea.advancedFlags,
            ...(candidate.parsedArea.advancedFlags.terrainType
              ? { terrainType: { ...candidate.parsedArea.advancedFlags.terrainType } }
              : {}),
          },
        }
      : {}),
    ...(candidate.parsedArea?.visualEnvironment !== undefined
      ? {
          visualEnvironment: {
            ...candidate.parsedArea.visualEnvironment,
            sun: { ...candidate.parsedArea.visualEnvironment.sun },
            moon: { ...candidate.parsedArea.visualEnvironment.moon },
          },
        }
      : {}),
    ...(candidate.parsedArea?.visualEnvironmentScalarControls !== undefined
      ? {
          visualEnvironmentScalarControls: {
            ...candidate.parsedArea.visualEnvironmentScalarControls,
          },
        }
      : {}),
    ...(candidate.parsedArea?.visualEnvironmentCatalogSelection !== undefined
      ? {
          visualEnvironmentCatalogSelection: {
            ...candidate.parsedArea.visualEnvironmentCatalogSelection,
          },
        }
      : {}),
    ...(candidate.parsedObjects?.audioEnvironment !== undefined
      ? { audioEnvironment: { ...candidate.parsedObjects.audioEnvironment } }
      : {}),
    ...(candidate.parsedObjects?.variables !== undefined
      ? {
          variables: {
            expectedEntries: candidate.parsedObjects.variables.expectedEntries.map(
              (entry) => ({ ...entry }),
            ),
          },
        }
      : {}),
    ...(effectiveAreaAudioCatalogs
      ? {
          audioEnvironmentCatalogs: {
            schemaVersion: effectiveAreaAudioCatalogs.schemaVersion,
            ambientSound: cloneAreaAudioCatalog(effectiveAreaAudioCatalogs.ambientSound),
            ambientMusic: cloneAreaAudioCatalog(effectiveAreaAudioCatalogs.ambientMusic),
            environmentalAudio: cloneAreaAudioCatalog(
              effectiveAreaAudioCatalogs.environmentalAudio,
            ),
          },
        }
      : {}),
    ...(effectiveAreaVisualEnvironmentCatalogs
      ? {
          visualEnvironmentCatalogs: cloneAreaVisualEnvironmentCatalogs(
            effectiveAreaVisualEnvironmentCatalogs,
          ),
        }
      : {}),
    ...(effectiveAreaLoadingScreenCatalog
      ? { loadingScreenCatalog: cloneAreaLoadingScreenCatalog(effectiveAreaLoadingScreenCatalog) }
      : {}),
    ...(effectiveAreaEncounterDifficultyCatalog
      ? {
          encounterDifficultyCatalog: {
            schemaVersion: effectiveAreaEncounterDifficultyCatalog.schemaVersion,
            descriptor: { ...effectiveAreaEncounterDifficultyCatalog.descriptor },
            rows: effectiveAreaEncounterDifficultyCatalog.rows.map((row) => ({ ...row })),
          },
        }
      : {}),
    benchmark: benchmarkIds.has(candidate.resref),
    previewImageUrl: `/assets/previews/areas/${candidate.resref}.webp`,
    textureAtlasId: buildTextureAtlasId(candidate, biome),
    textureAtlasObjectKey: candidate.areSourceKey,
    textureAtlasContentType: "application/octet-stream",
    textureAtlasSizeBytes: candidate.areSourceSize,
    textureAtlasEtag: candidate.areSourceEtag,
    textureAtlasFingerprint: buildAtlasFingerprint(candidate),
    ...(tileSet ? { tileSet } : {}),
    tiles,
    ...(auroraVfxCollision ? { auroraVfxCollision } : {}),
    ...(auroraWorldTimer ? { auroraWorldTimer } : {}),
    ...(moduleStartLocation ? { moduleStartLocation: { ...moduleStartLocation } } : {}),
    ...(moduleStartLocationTargets
      ? { moduleStartLocationTargets: [...moduleStartLocationTargets] }
      : {}),
    ...mapParsedAreaGlobalLighting(candidate.parsedArea?.globalLighting),
    ...(effectiveTrapsTwoDaTable
      ? {
          placeableTrapTypeCatalog: {
            descriptor: { ...effectiveTrapsTwoDaTable.descriptor },
            rows: effectiveTrapsTwoDaTable.rows.map((row) => ({ ...row })),
          },
        }
      : {}),
    ...(effectiveBodyBagTwoDaTable
      ? {
          placeableBodyBagCatalog: {
            descriptor: { ...effectiveBodyBagTwoDaTable.descriptor },
            rows: effectiveBodyBagTwoDaTable.rows.map((row) => ({ ...row })),
          },
        }
      : {}),
    ...(effectivePortraitsTwoDaTable
      ? {
          placeablePortraitCatalog: {
            descriptor: { ...effectivePortraitsTwoDaTable.descriptor },
            rows: effectivePortraitsTwoDaTable.rows.map((row) => ({ ...row })),
          },
        }
      : {}),
    ...(effectiveCreaturePortraitsTwoDaTable
      ? {
          creaturePortraitCatalog: {
            descriptor: { ...effectiveCreaturePortraitsTwoDaTable.descriptor },
            rows: effectiveCreaturePortraitsTwoDaTable.rows.map((row) => ({ ...row })),
          },
        }
      : {}),
    ...(effectiveItemBaseItemsTwoDaTable
      ? {
          itemBaseItemCatalog: {
            descriptor: { ...effectiveItemBaseItemsTwoDaTable.descriptor },
            rows: effectiveItemBaseItemsTwoDaTable.rows.map((row) => ({ ...row })),
          },
        }
      : {}),
    ...(moduleFactionCatalog
      ? {
          placeableFactionCatalog: {
            descriptor: { ...moduleFactionCatalog.descriptor },
            rows: moduleFactionCatalog.rows.map((row) => ({ ...row })),
          },
        }
      : {}),
    objects,
    soundscape: buildAreaSoundscape(),
    ...(candidate.areSourceSha256
      ? {
          sourceResources: {
            areSha256: candidate.areSourceSha256,
            ...(candidate.gitSourceSha256 ? { gitSha256: candidate.gitSourceSha256 } : {}),
            ...(candidate.gicSourceSha256 ? { gicSha256: candidate.gicSourceSha256 } : {}),
            ...(moduleIfoSha256 ? { ifoSha256: moduleIfoSha256 } : {}),
          }
        }
      : {}),
    updatedAt
  };
}

function cloneAreaAudioCatalog(
  catalog: EffectiveAreaAudioCatalogBundleResult["ambientSound"],
) {
  return {
    descriptor: { ...catalog.descriptor },
    rows: catalog.rows.map((row) => ({ ...row })),
  };
}

function cloneAreaLoadingScreenCatalog(
  catalog: EffectiveAreaLoadingScreenCatalogResult,
): EffectiveAreaLoadingScreenCatalogResult {
  return {
    schemaVersion: catalog.schemaVersion,
    descriptor: { ...catalog.descriptor },
    rows: catalog.rows.map((row) => ({
      ...row,
      ...(row.imageAsset ? { imageAsset: { ...row.imageAsset } } : {}),
    })),
  };
}

function cloneAreaVisualEnvironmentCatalogs(
  catalogs: EffectiveAreaVisualEnvironmentCatalogBundleResult,
): EffectiveAreaVisualEnvironmentCatalogBundleResult {
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

function mapParsedAreaGlobalLighting(
  globalLighting: ParsedAreaMetadataBlueprint["globalLighting"] | undefined
): Pick<AreaRecord, "lighting"> {
  if (!globalLighting || globalLighting.fields.length === 0) {
    return {};
  }
  return {
    lighting: {
      source: "are-root-fields",
      fields: globalLighting.fields.map((field) => ({
        field: field.field,
        value: field.value
      }))
    }
  };
}

function pickBenchmarkIds(records: AreaCandidate[]): Set<string> {
  const scored = records
    .slice()
    .sort((left, right) => scoreCandidate(right) - scoreCandidate(left));
  const count = scored.length === 0 ? 0 : Math.min(10, Math.max(1, Math.ceil(scored.length * 0.2)));
  return new Set(scored.slice(0, count).map((entry) => entry.resref));
}

function scoreCandidate(candidate: AreaCandidate): number {
  const objectCount =
    (candidate.parsedObjects?.placeables.length ?? 0) +
    (candidate.parsedObjects?.doors.length ?? 0) +
    (candidate.parsedObjects?.creatures.length ?? 0) +
    (candidate.parsedObjects?.encounters.length ?? 0) +
    (candidate.parsedObjects?.items.length ?? 0) +
    (candidate.parsedObjects?.sounds.length ?? 0) +
    (candidate.parsedObjects?.stores.length ?? 0) +
    (candidate.parsedObjects?.triggers.length ?? 0) +
    (candidate.parsedObjects?.waypoints.length ?? 0);
  return candidate.areSourceSize +
    (candidate.gitSourceSize ?? 0) +
    (candidate.gicSourceSize ?? 0) +
    objectCount * 1024;
}

function inferBiome(candidate: AreaCandidate): string {
  const normalized = [
    candidate.resref,
    candidate.areSourceKey,
    candidate.gitSourceKey ?? "",
    candidate.parsedArea?.tileSet ?? ""
  ]
    .join("|")
    .toLowerCase();

  if (/(city|urban|market)/u.test(normalized)) {
    return "urban";
  }
  if (/(dungeon|crypt|cave)/u.test(normalized)) {
    return "dungeon";
  }
  if (/(swamp|marsh)/u.test(normalized)) {
    return "swamp";
  }
  if (/(forest|wood)/u.test(normalized)) {
    return "forest";
  }
  if (/(desert|sand)/u.test(normalized)) {
    return "desert";
  }
  return "generic";
}

function resolveDimensions(candidate: AreaCandidate): { width: number; height: number } {
  const parsedWidth = candidate.parsedArea?.width;
  const parsedHeight = candidate.parsedArea?.height;

  if (isPositiveInt(parsedWidth) && isPositiveInt(parsedHeight)) {
    return {
      width: clamp(parsedWidth, 1, 256),
      height: clamp(parsedHeight, 1, 256)
    };
  }

  const tileCount = candidate.parsedArea?.tileCount;
  if (isPositiveInt(tileCount)) {
    const base = clamp(Math.round(Math.sqrt(tileCount)), 8, 64);
    return {
      width: base,
      height: clamp(Math.ceil(tileCount / base), 8, 64)
    };
  }

  return estimateDimensions(candidate.areSourceSize);
}

function resolveAreaName(candidate: AreaCandidate): string {
  const parsedName = candidate.parsedArea?.name;
  if (parsedName && parsedName.trim().length > 0) {
    return parsedName.trim();
  }
  return humanizeName(candidate.resref);
}

function buildTextureAtlasId(candidate: AreaCandidate, biome: string): string {
  const tileSet = normalizeResref(candidate.parsedArea?.tileSet ?? "");
  if (tileSet.length > 0) {
    return `atlas_${tileSet}_v1`.slice(0, 80);
  }
  return `atlas_${biome}_v1`;
}

function buildAreaObjects(
  candidate: AreaCandidate,
  effectivePlaceablesTwoDaDescriptor?: EffectivePlaceablesTwoDaDescriptor | null,
  effectiveWaypointTwoDaRows?: EffectiveWaypointTwoDaRowsResult | null,
  effectiveCreatureAppearanceTwoDaDescriptor?: EffectiveCreatureAppearanceTwoDaDescriptor | null,
  effectiveCreatureGenderTwoDaDescriptor?: EffectiveCreatureGenderTwoDaDescriptor | null,
  effectiveCreatureWingModelTwoDaDescriptor?: EffectiveCreatureAppendageTwoDaDescriptor | null,
  effectiveCreatureTailModelTwoDaDescriptor?: EffectiveCreatureAppendageTwoDaDescriptor | null,
  effectiveCreaturePerceptionRangesTwoDaTable?:
    EffectiveCreaturePerceptionRangesTwoDaTableResult | null,
  effectiveCreatureWalkRatesTwoDaTable?: EffectiveCreatureWalkRatesTwoDaTableResult | null,
  effectiveCreatureSoundSetsTwoDaTable?: EffectiveCreatureSoundSetsTwoDaTableResult | null,
  effectiveCreatureStartingPackagesTwoDaTable?:
    EffectiveCreatureStartingPackagesTwoDaTableResult | null,
  effectiveCreatureClassesTwoDaTable?: EffectiveCreatureClassesTwoDaTableResult | null,
  effectiveCreatureSkillsTwoDaTable?: EffectiveCreatureSkillsTwoDaTableResult | null,
  effectiveCreatureFeatsTwoDaTable?: EffectiveCreatureFeatsTwoDaTableResult | null,
  effectiveCreatureSpecialAbilitiesTwoDaTable?:
    EffectiveCreatureSpecialAbilitiesTwoDaTableResult | null,
  effectiveCreaturePhenotypeTwoDaDescriptor?: EffectiveCreaturePhenotypeTwoDaDescriptor | null,
  effectiveItemBaseItemsTwoDaTable?: EffectiveItemBaseItemsTwoDaTableResult | null,
  effectiveCreaturePortraitsTwoDaTable?: EffectiveCreaturePortraitsTwoDaTableResult | null,
  effectiveCreatureRacialTypesTwoDaTable?: EffectiveCreatureRacialTypesTwoDaTableResult | null,
): AreaRecord["objects"] {
  const placements = candidate.parsedObjects;
  if (!placements) {
    return [];
  }

  const sourceObjectIds = new Map(
    enumerateAreaObjectSources(placements).map((entry) => [
      `${entry.kind}:${entry.sourceIndex}`,
      entry.sourceObjectId,
    ]),
  );
  const objects: AreaRecord["objects"] = [];

  appendPlacements(
    objects,
    sourceObjectIds,
    placements.placeables,
    "placeable",
    undefined,
    effectivePlaceablesTwoDaDescriptor,
  );
  appendPlacements(objects, sourceObjectIds, placements.doors, "door");
  appendPlacements(
    objects,
    sourceObjectIds,
    placements.creatures,
    "creature",
    undefined,
    undefined,
    undefined,
    effectiveCreatureAppearanceTwoDaDescriptor,
    effectiveCreatureGenderTwoDaDescriptor,
    effectiveCreatureWingModelTwoDaDescriptor,
    effectiveCreatureTailModelTwoDaDescriptor,
    effectiveCreaturePerceptionRangesTwoDaTable,
    effectiveCreatureWalkRatesTwoDaTable,
    effectiveCreatureSoundSetsTwoDaTable,
    effectiveCreatureStartingPackagesTwoDaTable,
    effectiveCreatureClassesTwoDaTable,
    effectiveCreatureSkillsTwoDaTable,
    effectiveCreatureFeatsTwoDaTable,
    effectiveCreatureSpecialAbilitiesTwoDaTable,
    effectiveCreaturePhenotypeTwoDaDescriptor,
    effectiveCreaturePortraitsTwoDaTable,
    effectiveCreatureRacialTypesTwoDaTable,
  );
  appendPlacements(objects, sourceObjectIds, placements.encounters, "encounter");
  appendPlacements(
    objects,
    sourceObjectIds,
    placements.items,
    "item",
    effectiveItemBaseItemsTwoDaTable,
  );
  appendPlacements(objects, sourceObjectIds, placements.sounds, "sound");
  appendPlacements(
    objects,
    sourceObjectIds,
    placements.stores,
    "store",
    effectiveItemBaseItemsTwoDaTable,
  );
  appendPlacements(objects, sourceObjectIds, placements.triggers, "trigger");
  appendPlacements(
    objects,
    sourceObjectIds,
    placements.waypoints,
    "waypoint",
    undefined,
    undefined,
    effectiveWaypointTwoDaRows,
  );

  return objects;
}

function buildAreaTiles(
  candidate: AreaCandidate,
  areaId: string,
  dimensions: { width: number; height: number },
  tileSet: string,
  tileLightColorLookups: TileLightColorLookups,
  tileModelLightNodeLookup: ReadonlyMap<string, TileModelLightNodes>
): AreaTileInstance[] {
  const parsedTiles = candidate.parsedArea?.tiles ?? [];
  if (!tileSet || parsedTiles.length === 0) {
    return [];
  }

  return parsedTiles.map((tile) => {
    const row = isPositiveInt(tile.row + 1) ? tile.row : Math.floor(tile.index / dimensions.width);
    const col = isPositiveInt(tile.col + 1) ? tile.col : tile.index % dimensions.width;
    const modelFromAre = tile.modelResRef ? normalizeResref(tile.modelResRef) : undefined;
    const tilesetTile =
      tile.tileId === undefined
        ? undefined
        : candidate.parsedTileset?.tilesById.get(tile.tileId);
    const modelFromSet = normalizeResref(tilesetTile?.modelResRef ?? "");
    const modelResRef = modelFromAre || modelFromSet || undefined;
    const modelSource = modelFromAre ? "are-tile-list" : modelFromSet ? "set-tile-section" : undefined;
    const modelLightNodes = modelResRef
      ? tileModelLightNodeLookup.get(modelResRef)
      : undefined;
    return {
      tileInstanceId: `${areaId}:tile:${tile.index}`,
      areaId,
      tilesetResRef: tileSet,
      row,
      col,
      tileIndex: tile.index,
      ...(tile.tileId !== undefined ? { tileId: tile.tileId } : {}),
      ...(modelResRef ? { modelResRef } : {}),
      ...(modelSource ? { modelSource } : {}),
      ...(tilesetTile?.imageMap2D ? { imageMap2D: tilesetTile.imageMap2D } : {}),
      ...(tile.orientation !== undefined ? { orientation: tile.orientation } : {}),
      ...(tilesetTile?.orientation !== undefined
        ? { tilesetOrientation: tilesetTile.orientation }
        : {}),
      ...(tile.mainLight1 !== undefined ? { mainLight1: tile.mainLight1 } : {}),
      ...(tile.mainLight2 !== undefined ? { mainLight2: tile.mainLight2 } : {}),
      ...(tile.sourceLight1 !== undefined ? { sourceLight1: tile.sourceLight1 } : {}),
      ...(tile.sourceLight2 !== undefined ? { sourceLight2: tile.sourceLight2 } : {}),
      ...optionalTileColor(
        "mainLight1Color",
        tile.mainLight1,
        tileLightColorLookups.mainLight,
        modelLightNodes?.mainLight1
      ),
      ...optionalTileColor(
        "mainLight2Color",
        tile.mainLight2,
        tileLightColorLookups.mainLight,
        modelLightNodes?.mainLight2
      ),
      ...optionalTileColor(
        "sourceLight1Color",
        tile.sourceLight1,
        tileLightColorLookups.sourceLight,
        undefined,
        modelLightNodes?.sourceLight1
      ),
      ...optionalTileColor(
        "sourceLight2Color",
        tile.sourceLight2,
        tileLightColorLookups.sourceLight,
        undefined,
        modelLightNodes?.sourceLight2
      ),
      ...(tile.animLoop1 !== undefined ? { animLoop1: tile.animLoop1 } : {}),
      ...(tile.animLoop2 !== undefined ? { animLoop2: tile.animLoop2 } : {}),
      ...(tile.animLoop3 !== undefined ? { animLoop3: tile.animLoop3 } : {}),
      ...(tilesetTile?.pathNode ? { pathNode: tilesetTile.pathNode } : {}),
      ...(tilesetTile?.visibilityNode ? { visibilityNode: tilesetTile.visibilityNode } : {}),
      ...(tilesetTile?.visibilityOrientation !== undefined
        ? { visibilityOrientation: tilesetTile.visibilityOrientation }
        : {}),
      ...(tilesetTile?.doorVisibilityNode
        ? { doorVisibilityNode: tilesetTile.doorVisibilityNode }
        : {}),
      ...(tilesetTile?.doorVisibilityOrientation !== undefined
        ? { doorVisibilityOrientation: tilesetTile.doorVisibilityOrientation }
        : {}),
      ...(tilesetTile?.edges ? { edges: tilesetTile.edges } : {}),
      ...(tilesetTile?.cornerHeights ? { cornerHeights: tilesetTile.cornerHeights } : {}),
      ...(tile.height !== undefined ? { height: tile.height } : {}),
      source: "are-tile-list",
      ...(!modelResRef ? { fallbackReason: "tile-model-reference-missing" } : {})
    };
  });
}

function collectAreaCandidateTileModelResRefs(candidates: readonly AreaCandidate[]): string[] {
  const modelResRefs = new Set<string>();
  for (const candidate of candidates) {
    for (const tile of candidate.parsedArea?.tiles ?? []) {
      const modelFromAre = normalizeResref(tile.modelResRef ?? "");
      const modelFromSet =
        tile.tileId === undefined
          ? ""
          : normalizeResref(candidate.parsedTileset?.tilesById.get(tile.tileId)?.modelResRef ?? "");
      const modelResRef = modelFromAre || modelFromSet;
      if (modelResRef) {
        modelResRefs.add(modelResRef);
      }
    }
  }
  return [...modelResRefs].sort((left, right) => left.localeCompare(right));
}

function buildAreaAuroraVfxCollision(
  tiles: readonly AreaTileInstance[],
  areaWokLookup: ReadonlyMap<string, AuroraAreaVfxCollisionResource>
): AuroraAreaVfxCollisionContract | undefined {
  if (tiles.length === 0) {
    return undefined;
  }

  const resourcesById = new Map<string, AuroraAreaVfxCollisionResource>();
  const instances: AuroraAreaVfxCollisionContract["instances"] = [];
  const diagnostics: AuroraAreaVfxCollisionContract["diagnostics"] = [];
  for (const tile of tiles) {
    const modelResRef = normalizeResref(tile.modelResRef ?? "");
    if (!modelResRef) {
      diagnostics.push({
        code: "VFX_AREA_WOK_TILE_MODEL_RESREF_MISSING",
        severity: "warn",
        message: "ARE tile has no resolved model resref, so its static WOK instance is unavailable.",
        tileInstanceId: tile.tileInstanceId
      });
      continue;
    }
    const resource = areaWokLookup.get(modelResRef);
    if (!resource) {
      diagnostics.push({
        code: "VFX_AREA_WOK_RESOURCE_MISSING",
        severity: "warn",
        message: `No usable source-precedence ASCII WOK was found for tile model ${modelResRef}.`,
        modelResRef,
        tileInstanceId: tile.tileInstanceId
      });
      continue;
    }
    resourcesById.set(resource.resourceId, resource);
    instances.push({
      instanceId: tile.tileInstanceId,
      resourceId: resource.resourceId,
      translation: {
        x: (tile.col + 0.5) * AURORA_GIT_UNITS_PER_TILE,
        y: (tile.row + 0.5) * AURORA_GIT_UNITS_PER_TILE,
        z: (tile.height ?? 0) * AURORA_GIT_UNITS_PER_TILE
      },
      orientationQuarterTurns: normalizeQuarterTurns(tile.orientation ?? 0)
    });
  }

  const resources = [...resourcesById.values()].sort((left, right) =>
    left.resourceId.localeCompare(right.resourceId)
  );
  instances.sort((left, right) => left.instanceId.localeCompare(right.instanceId));
  const status =
    instances.length === 0
      ? "unavailable"
      : diagnostics.length > 0
        ? "partial"
        : "ready";
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        version: "aurora-area-vfx-collision/v1",
        resources: resources.map((resource) => [
          resource.resourceId,
          resource.modelResRef,
          resource.sourceObjectKey,
          resource.sourceHash
        ]),
        instances
      })
    )
    .digest("hex");
  return {
    version: "aurora-area-vfx-collision/v1",
    coordinateSpace: "aurora-area-z-up",
    unitsPerTile: AURORA_GIT_UNITS_PER_TILE,
    status,
    fingerprint,
    resources,
    instances,
    diagnostics
  };
}

function hasUsableAreaWokGeometry(
  walkmesh: ReturnType<typeof parseAuroraAsciiWokWalkmesh>
): boolean {
  return walkmesh.nodes.some((node) => node.vertices.length >= 3 && node.faces.length > 0);
}

function compareAreaWokSourcePriority(
  leftKey: string,
  rightKey: string,
  hakPriorityList: readonly string[]
): number {
  const rankDelta =
    resolveAreaWokSourcePriority(leftKey, hakPriorityList) -
    resolveAreaWokSourcePriority(rightKey, hakPriorityList);
  if (rankDelta !== 0) {
    return rankDelta;
  }
  return leftKey.localeCompare(rightKey);
}

function compareAreaTileModelSourcePriority(
  leftKey: string,
  rightKey: string,
  hakPriorityList: readonly string[]
): number {
  const rankDelta =
    resolveAreaWokSourcePriority(leftKey, hakPriorityList) -
    resolveAreaWokSourcePriority(rightKey, hakPriorityList);
  if (rankDelta !== 0) {
    return rankDelta;
  }
  return leftKey.localeCompare(rightKey);
}

function optionalNativeMainLightNode<TKey extends "mainLight1" | "mainLight2">(
  key: TKey,
  lights: readonly AuroraMdlLightNode[],
  modelResRef: string,
  sourceModelObjectKey: string,
  sourceModelHash: string
): { [K in TKey]?: AreaTileNativeLightNode } {
  const slot = key === "mainLight1" ? "ml1" : "ml2";
  const normalizedModelName = normalizeTileLightNodeName(modelResRef);
  const light = lights.find((candidate) => {
    const normalizedNodeName = normalizeTileLightNodeName(candidate.nodeName);
    return (
      normalizedNodeName === `${normalizedModelName}${slot}` ||
      normalizedNodeName.endsWith(slot)
    );
  });
  const position = light?.transform?.position;
  if (
    !light ||
    !position ||
    position.length !== 3 ||
    position.some((value) => !Number.isFinite(value)) ||
    typeof light.radius !== "number" ||
    !Number.isFinite(light.radius) ||
    light.radius <= 0
  ) {
    return {};
  }
  const multiplier =
    typeof light.multiplier === "number" && Number.isFinite(light.multiplier)
      ? light.multiplier
      : 1;
  return {
    [key]: {
      status: "main-native-node-resolved",
      name: light.nodeName,
      position: [...position] as [number, number, number],
      coordinateSpace: "model-local-aurora-z-up",
      radius: light.radius,
      multiplier,
      ...optionalNumberProperty("lightPriority", light.lightPriority),
      ...(typeof light.ambientOnly === "boolean"
        ? { ambientOnly: light.ambientOnly }
        : {}),
      ...(typeof light.dynamicType === "number" && Number.isFinite(light.dynamicType)
        ? { dynamicType: light.dynamicType }
        : {}),
      ...(typeof light.affectDynamic === "boolean"
        ? { affectDynamic: light.affectDynamic }
        : {}),
      ...(typeof light.shadow === "boolean" ? { shadow: light.shadow } : {}),
      sourceModelFileName: `${modelResRef}.mdl`,
      sourceModelObjectKey,
      sourceModelHash,
      proofStatus: "source-backed-tile-mdl-native-main-light"
    }
  } as { [K in TKey]?: AreaTileNativeLightNode };
}

function resolveAreaTileSourceLightNode(
  slotIndex: 1 | 2,
  nodes: readonly AuroraMdlModelGraphNode[],
  modelResRef: string,
  sourceModelObjectKey: string,
  sourceModelHash: string
): AreaTileSourceLightNode {
  const sourceNodes = nodes.filter((node) => {
    const normalized = normalizeTileLightNodeName(node.nodeName);
    return (
      node.nodeKind === "transform" &&
      node.sourceNodeKind.toLowerCase() === "dummy" &&
      /sl[12]$/u.test(normalized)
    );
  });
  const slot = `sl${slotIndex}`;
  const normalizedModelName = normalizeTileLightNodeName(modelResRef);
  const sourceNode = sourceNodes.find((node) => {
    const normalized = normalizeTileLightNodeName(node.nodeName);
    return normalized === `${normalizedModelName}${slot}` || normalized.endsWith(slot);
  });
  const position = sourceNode?.transform?.position;
  const common = {
    slotIndex,
    sourceNodeCount: sourceNodes.length,
    sourceModelFileName: `${modelResRef}.mdl`,
    sourceModelObjectKey,
    sourceModelHash,
    proofStatus: "source-backed-tile-mdl-source-light-slot-count" as const
  };
  if (
    sourceNode &&
    position &&
    position.length === 3 &&
    position.every((value) => Number.isFinite(value))
  ) {
    return {
      status: "source-node-resolved",
      ...common,
      name: sourceNode.nodeName,
      position: [...position] as [number, number, number],
      coordinateSpace: "model-local-aurora-z-up"
    };
  }
  return {
    status: "source-node-absent-by-aurora-slot-count",
    ...common
  };
}

function normalizeTileLightNodeName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/gu, "");
}

function resolveAreaWokSourcePriority(
  objectKey: string,
  hakPriorityList: readonly string[]
): number {
  const normalized = objectKey.replace(/\\/gu, "/").toLowerCase();
  const hakMarker = "/__aurora/sources/hak/";
  const hakIndex = normalized.indexOf(hakMarker);
  if (hakIndex >= 0) {
    const hakName = normalized.slice(hakIndex + hakMarker.length).split("/", 1)[0] ?? "";
    const normalizedHakName = normalizeHakPriorityName(hakName);
    const hakRank = hakPriorityList
      .map(normalizeHakPriorityName)
      .indexOf(normalizedHakName);
    return 100 + (hakRank >= 0 ? hakRank : hakPriorityList.length + 100);
  }
  if (normalized.includes("/__aurora/sources/vanilla/")) {
    return 10_000;
  }
  if (normalized.includes("/__aurora/sources/")) {
    return 20_000;
  }
  return 0;
}

function normalizeHakPriorityName(value: string): string {
  return extractBasename(value.trim().toLowerCase()).replace(/\.hak$/u, "");
}

function resolveAreaWokSourceLayer(
  objectKey: string
): AuroraAreaVfxCollisionResource["sourceLayer"] {
  const normalized = objectKey.replace(/\\/gu, "/").toLowerCase();
  if (normalized.includes("/__aurora/sources/hak/")) {
    return "hak";
  }
  if (normalized.includes("/__aurora/sources/vanilla/")) {
    return "vanilla";
  }
  return "module";
}

function normalizeQuarterTurns(value: number): number {
  const integer = Math.trunc(Number.isFinite(value) ? value : 0);
  return ((integer % 4) + 4) % 4;
}

function optionalTileColor<TKey extends string>(
  key: TKey,
  rowId: number | undefined,
  lookup: TileColorTwoDaLookup,
  nativeNode?: AreaTileNativeLightNode,
  sourceNode?: AreaTileSourceLightNode
): { [K in TKey]?: AreaTileInstance["mainLight1Color"] } {
  if (rowId === undefined || rowId <= 0) {
    return {};
  }
  const color = lookup.get(rowId);
  if (!color) {
    return {};
  }
  return {
    [key]: {
      rowId: color.rowId,
      ...optionalNumberProperty("red", color.red),
      ...optionalNumberProperty("green", color.green),
      ...optionalNumberProperty("blue", color.blue),
      sourceKey: color.sourceKey,
      ...(color.sourceAnimationName
        ? { sourceAnimationName: color.sourceAnimationName }
        : {}),
      ...(color.sourceModelFileName
        ? { sourceModelFileName: color.sourceModelFileName }
        : {}),
      ...(color.sourceModelHash ? { sourceModelHash: color.sourceModelHash } : {}),
      ...optionalNumberProperty("sourceMultiplier", color.sourceMultiplier),
      ...(color.sourceMultiplierSource
        ? { sourceMultiplierSource: color.sourceMultiplierSource }
        : {}),
      ...(color.sourceProofStatus ? { sourceProofStatus: color.sourceProofStatus } : {}),
      ...(sourceNode
        ? {
            sourceNode:
              sourceNode.status === "source-node-resolved"
                ? {
                    ...sourceNode,
                    position: [...sourceNode.position] as [number, number, number]
                  }
                : { ...sourceNode }
          }
        : {}),
      ...(nativeNode
        ? {
            nativeNode: {
              ...nativeNode,
              position: [...nativeNode.position] as [number, number, number]
            }
          }
        : {})
    }
  } as { [K in TKey]?: AreaTileInstance["mainLight1Color"] };
}

function collectTilesetSetObjects(objects: ModuleBlobObjectSummary[]): ModuleBlobObjectSummary[] {
  return objects
    .filter((object) => extractExtension(extractFileName(object.key)) === "set")
    .sort((left, right) => {
      const leftPriority = resolveTilesetSetSourcePriority(left.key);
      const rightPriority = resolveTilesetSetSourcePriority(right.key);
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }
      const leftDepth = left.key.split(/[\\/]+/u).length;
      const rightDepth = right.key.split(/[\\/]+/u).length;
      if (leftDepth !== rightDepth) {
        return leftDepth - rightDepth;
      }
      return left.key.localeCompare(right.key);
    });
}

function resolveTilesetSetSourcePriority(objectKey: string): number {
  const normalized = objectKey.replace(/\\/gu, "/").toLowerCase();
  if (normalized.includes("/__aurora/sources/hak/")) {
    return 1;
  }
  if (normalized.includes("/__aurora/sources/vanilla/")) {
    return 2;
  }
  if (normalized.includes("/__aurora/sources/")) {
    return 3;
  }
  return 0;
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

    const depthDelta = left.split(/[\\/]+/u).length - right.split(/[\\/]+/u).length;
    if (depthDelta !== 0) {
      return depthDelta;
    }

    return left.localeCompare(right);
  });

  return keys;
}

function resolveTwoDaSourcePriority(objectKey: string): number {
  const normalized = objectKey.replace(/\\/gu, "/").toLowerCase();
  if (!normalized.includes("/__aurora/sources/hak/") && !normalized.includes("/__aurora/sources/vanilla/")) {
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

function parseTileColorTwoDaRows(
  bytes: Buffer,
  source: { tableFileName: "lightcolor.2da" | "tilecolor.2da"; sourceKey: string; sourceEtag?: string }
): ParsedTileColorTwoDaRow[] {
  const table = parseAuroraTwoDaTable(bytes, {
    tableName: source.tableFileName,
    profile: "aurora-area-tile-light",
    sourceObjectKey: source.sourceKey,
    sourceLayer: resolveTwoDaSourceLayer(source.sourceKey),
    sourceHash: source.sourceEtag
  });
  const rows: ParsedTileColorTwoDaRow[] = [];
  for (const row of table.rows) {
    const red = parseTwoDaNumberToken(readTwoDaCell(row, ["red"]));
    const green = parseTwoDaNumberToken(readTwoDaCell(row, ["green"]));
    const blue = parseTwoDaNumberToken(readTwoDaCell(row, ["blue"]));
    if (red === undefined && green === undefined && blue === undefined) {
      continue;
    }
    rows.push({
      rowId: row.rowId,
      ...optionalNumberProperty("red", red),
      ...optionalNumberProperty("green", green),
      ...optionalNumberProperty("blue", blue)
    });
  }
  return rows;
}

function parseTileSourceLightModelRows(
  bytes: Buffer,
  sourceKey: string
): ParsedTileColorTwoDaRow[] {
  const sourceModelHash = buildContentHash(bytes);
  let parsed: ReturnType<typeof parseAuroraMdlVfxSource>;
  try {
    parsed = parseAuroraMdlVfxSource(bytes, {
      sourceModelObjectKey: sourceKey,
      sourceModelFileName: "fx_flame01.mdl",
      sourceModelHash
    });
  } catch {
    return [];
  }
  const light = parsed.lights.find(
    (candidate) => candidate.nodeName.trim().toLowerCase() === "auroralight01"
  );
  if (!light) {
    return [];
  }

  const rows: ParsedTileColorTwoDaRow[] = [];
  for (const animation of light.animations ?? []) {
    const animationName = animation.animationName.trim();
    if (!/^\d+$/u.test(animationName)) {
      continue;
    }
    const rowId = Number(animationName);
    if (!Number.isInteger(rowId) || rowId <= 0 || rowId > 0xff) {
      continue;
    }
    const color = animation.colorTimeline?.[0]?.value ?? light.color;
    if (
      !color ||
      color.length < 3 ||
      color.some((component) => !Number.isFinite(component))
    ) {
      continue;
    }
    const animationMultiplier = animation.multiplierTimeline?.[0]?.value;
    const sourceMultiplier =
      typeof animationMultiplier === "number" && Number.isFinite(animationMultiplier)
        ? animationMultiplier
        : typeof light.multiplier === "number" && Number.isFinite(light.multiplier)
          ? light.multiplier
          : 1;
    const sourceMultiplierSource =
      typeof animationMultiplier === "number" && Number.isFinite(animationMultiplier)
        ? "fx_flame01.mdl selected AuroraLight01 animation multiplier timeline"
        : typeof light.multiplier === "number" && Number.isFinite(light.multiplier)
          ? "fx_flame01.mdl AuroraLight01 base multiplier controller"
          : "nwmain.exe PartLight::PartLight 0x140087ea2 default multiplier 1.0";
    rows.push({
      rowId,
      red: color[0],
      green: color[1],
      blue: color[2],
      sourceAnimationName: animationName,
      sourceModelFileName: "fx_flame01.mdl",
      sourceModelHash,
      sourceMultiplier,
      sourceMultiplierSource,
      sourceProofStatus:
        "source-backed-fx_flame01-animation-color-partlight-multiplier"
    });
  }
  return rows;
}

function buildTileColorTwoDaLookup(
  sources: LoadedTileColorTwoDaSource[]
): TileColorTwoDaLookup {
  const lookup: TileColorTwoDaLookup = new Map();
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

async function readRuntimeTileColorTwoDaSourceFromVanilla(
  vanillaRoot: string,
  tableFileName: "lightcolor.2da" | "tilecolor.2da",
  resourceResref: "lightcolor" | "tilecolor",
  logger: Logger
): Promise<LoadedTileColorTwoDaSource | null> {
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
      const bytes = await reader.read(resourceResref, NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA);
      if (!bytes) {
        continue;
      }
      const sourceKey = `runtime-source/vanilla/${keyFileName}/${tableFileName}`;
      const sourceEtag = buildContentHash(bytes);
      const rows = parseTileColorTwoDaRows(bytes, {
        tableFileName,
        sourceKey,
        sourceEtag
      });
      if (rows.length === 0) {
        continue;
      }
      return {
        key: sourceKey,
        sourceSize: bytes.length,
        updatedAt: new Date(0).toISOString(),
        sourceEtag,
        rows
      };
    } catch (error) {
      logger.warn(
        `Skipping runtime vanilla ${tableFileName} source because read failed (${keyPath}): ${formatSnapshotIndexError(error)}`
      );
    }
  }
  return null;
}

async function readRuntimeTileSourceLightModelFromVanilla(
  vanillaRoot: string,
  logger: Logger
): Promise<LoadedTileColorTwoDaSource | null> {
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
      const bytes = await reader.read("fx_flame01", NWN_KEY_BIF_RESOURCE_TYPES.MDL);
      if (!bytes) {
        continue;
      }
      const sourceKey = `runtime-source/vanilla/${keyFileName}/fx_flame01.mdl`;
      const sourceEtag = buildContentHash(bytes);
      const rows = parseTileSourceLightModelRows(bytes, sourceKey);
      if (rows.length === 0) {
        continue;
      }
      return {
        key: sourceKey,
        sourceSize: bytes.length,
        updatedAt: new Date(0).toISOString(),
        sourceEtag,
        rows
      };
    } catch (error) {
      logger.warn(
        `Skipping runtime vanilla fx_flame01.mdl source because read failed (${keyPath}): ${formatSnapshotIndexError(error)}`
      );
    }
  }
  return null;
}

function buildContentHash(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function resolveRuntimeFileSystemPath(pathValue: string): string {
  const hostLocalPath = resolveHostLocalMountedPath(pathValue);
  return hostLocalPath ?? (isAbsolute(pathValue) ? pathValue : resolve(process.cwd(), pathValue));
}

function formatSnapshotIndexError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
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

function parseTwoDaNumberToken(value: string | undefined): number | undefined {
  const normalized = value?.trim();
  if (!normalized || normalized === BLANK_CELL) {
    return undefined;
  }
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeTwoDaColumnName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/gu, "");
}

function optionalNumberProperty<TKey extends string>(
  key: TKey,
  value: number | undefined
): { [K in TKey]?: number } {
  return value === undefined ? {} : { [key]: value } as { [K in TKey]?: number };
}

function parseAuroraSetTiles(bytes: Buffer): Map<number, ParsedTilesetTileBlueprint> {
  const tiles = new Map<number, ParsedTilesetTileBlueprint>();
  const lines = bytes.toString("utf-8").replace(/^\uFEFF/u, "").split(/\r?\n/gu);
  let currentTileId: number | null = null;

  for (const rawLine of lines) {
    const line = stripIniComment(rawLine).trim();
    if (!line) {
      continue;
    }

    const section = line.match(/^\[\s*([^\]]+)\s*\]$/u);
    if (section) {
      const tileSection = section[1].match(/^tile\s*(\d+)$/iu);
      if (!tileSection) {
        currentTileId = null;
        continue;
      }
      const tileId = Number.parseInt(tileSection[1], 10);
      currentTileId = Number.isInteger(tileId) && tileId >= 0 ? tileId : null;
      if (currentTileId !== null && !tiles.has(currentTileId)) {
        tiles.set(currentTileId, { tileId: currentTileId });
      }
      continue;
    }

    if (currentTileId === null) {
      continue;
    }

    const assignment = line.match(/^([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/u);
    if (!assignment) {
      continue;
    }
    const key = assignment[1].trim().toLowerCase();
    const current = tiles.get(currentTileId) ?? { tileId: currentTileId };
    const rawValue = assignment[2].replace(/^"|"$/gu, "").trim();
    if (key === "model" || key === "modelname" || key === "modelresref") {
      const modelResRef = normalizeResref(rawValue);
      if (modelResRef) {
        tiles.set(currentTileId, {
          ...current,
          modelResRef
        });
      }
      continue;
    }
    if (key === "imagemap2d" || key === "imagemap" || key === "map2d") {
      const imageMap2D = normalizeResref(rawValue);
      if (imageMap2D) {
        tiles.set(currentTileId, {
          ...current,
          imageMap2D
        });
      }
      continue;
    }
    if (key === "orientation") {
      const orientation = parseTilesetOrientation(rawValue);
      if (orientation !== undefined) {
        tiles.set(currentTileId, {
          ...current,
          orientation
        });
      }
      continue;
    }
    if (key === "pathnode") {
      const pathNode = normalizeTilesetToken(rawValue);
      if (pathNode) {
        tiles.set(currentTileId, {
          ...current,
          pathNode
        });
      }
      continue;
    }
    if (key === "visibilitynode") {
      const visibilityNode = normalizeTilesetToken(rawValue);
      if (visibilityNode) {
        tiles.set(currentTileId, {
          ...current,
          visibilityNode
        });
      }
      continue;
    }
    if (key === "visibilityorientation") {
      const visibilityOrientation = parseTilesetOrientation(rawValue);
      if (visibilityOrientation !== undefined) {
        tiles.set(currentTileId, {
          ...current,
          visibilityOrientation
        });
      }
      continue;
    }
    if (key === "doorvisibilitynode") {
      const doorVisibilityNode = normalizeTilesetToken(rawValue);
      if (doorVisibilityNode) {
        tiles.set(currentTileId, {
          ...current,
          doorVisibilityNode
        });
      }
      continue;
    }
    if (key === "doorvisibilityorientation") {
      const doorVisibilityOrientation = parseTilesetOrientation(rawValue);
      if (doorVisibilityOrientation !== undefined) {
        tiles.set(currentTileId, {
          ...current,
          doorVisibilityOrientation
        });
      }
      continue;
    }
    if (key === "top" || key === "right" || key === "bottom" || key === "left") {
      const edge = normalizeTilesetToken(rawValue);
      if (edge) {
        tiles.set(currentTileId, {
          ...current,
          edges: {
            ...current.edges,
            [key]: edge
          }
        });
      }
      continue;
    }
    if (
      key === "topleftheight" ||
      key === "toprightheight" ||
      key === "bottomleftheight" ||
      key === "bottomrightheight"
    ) {
      const cornerHeight = normalizeTilesetToken(rawValue);
      const cornerKey = key.replace(/height$/u, "") as
        | "topleft"
        | "topright"
        | "bottomleft"
        | "bottomright";
      const mappedCornerKey =
        cornerKey === "topleft"
          ? "topLeft"
          : cornerKey === "topright"
            ? "topRight"
            : cornerKey === "bottomleft"
              ? "bottomLeft"
              : "bottomRight";
      if (cornerHeight) {
        tiles.set(currentTileId, {
          ...current,
          cornerHeights: {
            ...current.cornerHeights,
            [mappedCornerKey]: cornerHeight
          }
        });
      }
    }
  }

  return tiles;
}

function parseTilesetOrientation(value: string): number | undefined {
  const degrees = Number.parseFloat(value);
  if (!Number.isFinite(degrees)) {
    return undefined;
  }
  return ((((Math.round(degrees / 90) % 4) + 4) % 4) as 0 | 1 | 2 | 3);
}

function normalizeTilesetToken(value: string): string | undefined {
  const normalized = value.trim().replace(/^"|"$/gu, "").toLowerCase();
  return normalized.length > 0 ? normalized : undefined;
}

function stripIniComment(line: string): string {
  const semicolonIndex = line.indexOf(";");
  const slashIndex = line.indexOf("//");
  const candidates = [semicolonIndex, slashIndex].filter((index) => index >= 0);
  if (candidates.length === 0) {
    return line;
  }
  return line.slice(0, Math.min(...candidates));
}

function cloneAreaItemBaseAppearanceValue(
  value: AreaItemBaseAppearanceValue,
): AreaItemBaseAppearanceValue {
  if (value.modelType === 0) {
    return { ...value, appearance: { ...value.appearance } };
  }
  if (value.modelType === 1) {
    return {
      ...value,
      appearance: {
        modelPart1: value.appearance.modelPart1,
        materialColors: { ...value.appearance.materialColors },
      },
    };
  }
  if (value.modelType === 2) {
    return { ...value, appearance: { ...value.appearance } };
  }
  return {
    ...value,
    appearance: {
      armorParts: { ...value.appearance.armorParts },
      materialColors: { ...value.appearance.materialColors },
    },
  };
}

function appendPlacements(
  output: AreaRecord["objects"],
  sourceObjectIds: ReadonlyMap<string, string>,
  placements: ParsedAreaPlacementBlueprint[],
  kind: AreaRecord["objects"][number]["kind"],
  effectiveItemBaseItemsTwoDaTable?: EffectiveItemBaseItemsTwoDaTableResult | null,
  effectivePlaceablesTwoDaDescriptor?: EffectivePlaceablesTwoDaDescriptor | null,
  effectiveWaypointTwoDaRows?: EffectiveWaypointTwoDaRowsResult | null,
  effectiveCreatureAppearanceTwoDaDescriptor?: EffectiveCreatureAppearanceTwoDaDescriptor | null,
  effectiveCreatureGenderTwoDaDescriptor?: EffectiveCreatureGenderTwoDaDescriptor | null,
  effectiveCreatureWingModelTwoDaDescriptor?: EffectiveCreatureAppendageTwoDaDescriptor | null,
  effectiveCreatureTailModelTwoDaDescriptor?: EffectiveCreatureAppendageTwoDaDescriptor | null,
  effectiveCreaturePerceptionRangesTwoDaTable?:
    EffectiveCreaturePerceptionRangesTwoDaTableResult | null,
  effectiveCreatureWalkRatesTwoDaTable?: EffectiveCreatureWalkRatesTwoDaTableResult | null,
  effectiveCreatureSoundSetsTwoDaTable?: EffectiveCreatureSoundSetsTwoDaTableResult | null,
  effectiveCreatureStartingPackagesTwoDaTable?:
    EffectiveCreatureStartingPackagesTwoDaTableResult | null,
  effectiveCreatureClassesTwoDaTable?: EffectiveCreatureClassesTwoDaTableResult | null,
  effectiveCreatureSkillsTwoDaTable?: EffectiveCreatureSkillsTwoDaTableResult | null,
  effectiveCreatureFeatsTwoDaTable?: EffectiveCreatureFeatsTwoDaTableResult | null,
  effectiveCreatureSpecialAbilitiesTwoDaTable?:
    EffectiveCreatureSpecialAbilitiesTwoDaTableResult | null,
  effectiveCreaturePhenotypeTwoDaDescriptor?: EffectiveCreaturePhenotypeTwoDaDescriptor | null,
  effectiveCreaturePortraitsTwoDaTable?: EffectiveCreaturePortraitsTwoDaTableResult | null,
  effectiveCreatureRacialTypesTwoDaTable?: EffectiveCreatureRacialTypesTwoDaTableResult | null,
): void {
  const prefix =
    kind === "creature"
      ? "cre"
      : kind === "encounter"
        ? "enc"
      : kind === "item"
        ? "itm"
        : kind === "door"
          ? "dr"
          : kind === "sound"
            ? "snd"
            : kind === "store"
              ? "sto"
              : kind === "trigger"
                ? "trg"
                : kind === "waypoint"
                  ? "wpt"
                  : "plc";

  placements.forEach((placement, index) => {
    const templateResRef = normalizeResref(placement.templateResRef ?? "");
    const templateId = templateResRef
      ? buildAreaObjectTemplateId(kind, prefix, templateResRef)
      : `${prefix}_unknown_${String(index + 1).padStart(3, "0")}`;

    const objectId = sourceObjectIds.get(`${kind}:${index}`);
    if (!objectId) {
      throw new Error(`Area object source identity is missing for ${kind}:${index}.`);
    }

    const placeableBasicIdentity = placement.placeableBasicIdentity
      ? bindEffectivePlaceablesTwoDaToBasicIdentity(
          placement.placeableBasicIdentity,
          effectivePlaceablesTwoDaDescriptor,
        )
      : undefined;
    const creatureAppearance = placement.creatureAppearance
      ? bindEffectiveAppearanceTwoDaToCreatureAppearance(
          placement.creatureAppearance,
          effectiveCreatureAppearanceTwoDaDescriptor,
        )
      : undefined;
    const waypointAppearance = placement.waypointAppearance && effectiveWaypointTwoDaRows
      ? bindEffectiveWaypointTwoDaToAppearance(
          placement.waypointAppearance,
          effectiveWaypointTwoDaRows.descriptor,
          effectiveWaypointTwoDaRows.items,
        )
      : undefined;
    const creatureGender = placement.creatureGender
      ? bindEffectiveGenderTwoDaToCreatureGender(
          placement.creatureGender,
          effectiveCreatureGenderTwoDaDescriptor,
        )
      : undefined;
    const creatureAppendages = placement.creatureAppendages
      ? bindEffectiveAppendageTwoDaToCreatureAppendages(
          placement.creatureAppendages,
          {
            wings: effectiveCreatureWingModelTwoDaDescriptor,
            tail: effectiveCreatureTailModelTwoDaDescriptor,
          },
        )
      : undefined;
    const creaturePerceptionRange = placement.creaturePerceptionRange
      ? bindEffectiveRangesTwoDaToCreaturePerceptionRange(
          placement.creaturePerceptionRange,
          effectiveCreaturePerceptionRangesTwoDaTable,
        )
      : undefined;
    const creatureWalkRate = placement.creatureWalkRate
      ? bindEffectiveCreatureWalkRatesTwoDaToCreatureWalkRate(
          placement.creatureWalkRate,
          effectiveCreatureWalkRatesTwoDaTable,
        )
      : undefined;
    const creatureSoundSetFile = placement.creatureSoundSetFile
      ? bindEffectiveCreatureSoundSetsTwoDaToCreatureSoundSetFile(
          placement.creatureSoundSetFile,
          effectiveCreatureSoundSetsTwoDaTable,
        )
      : undefined;
    const creatureStartingPackage = placement.creatureStartingPackage
      ? bindEffectiveCreatureStartingPackagesTwoDaToCreatureStartingPackage(
          placement.creatureStartingPackage,
          effectiveCreatureStartingPackagesTwoDaTable,
        )
      : undefined;
    const creatureSkillList = placement.creatureSkillList
      ? bindEffectiveCreatureSkillsTwoDaToCreatureSkillList(
          placement.creatureSkillList,
          effectiveCreatureSkillsTwoDaTable,
        )
      : undefined;
    const creatureFeatList = placement.creatureFeatList
      ? bindEffectiveCreatureFeatsTwoDaToCreatureFeatList(
          placement.creatureFeatList,
          effectiveCreatureFeatsTwoDaTable,
        )
      : undefined;
    const creatureSpecialAbilityList = placement.creatureSpecialAbilityList
      ? bindEffectiveCreatureSpecialAbilitiesTwoDaToList(
          placement.creatureSpecialAbilityList,
          effectiveCreatureSpecialAbilitiesTwoDaTable,
        )
      : undefined;
    const creatureClassIdentityState = placement.creatureClassIdentityState
      ? bindEffectiveCreatureClassesTwoDaToCreatureClassIdentity(
          placement.creatureClassIdentityState,
          effectiveCreatureClassesTwoDaTable,
        )
      : undefined;
    const creaturePhenotype = placement.creaturePhenotype
      ? bindEffectivePhenotypeTwoDaToCreaturePhenotype(
          placement.creaturePhenotype,
          effectiveCreaturePhenotypeTwoDaDescriptor,
        )
      : undefined;
    const creaturePortrait = placement.creaturePortrait
      ? bindEffectiveCreaturePortraitsTwoDaToCreaturePortrait(
          placement.creaturePortrait,
          effectiveCreaturePortraitsTwoDaTable,
        )
      : undefined;
    const creatureHitPointState = placement.creatureHitPointState
      ? bindEffectiveCreatureRacialTypesTwoDaToHitPointState(
          placement.creatureHitPointState,
          effectiveCreatureRacialTypesTwoDaTable,
        )
      : undefined;
    const itemBaseAppearance = placement.itemBaseAppearanceRaw &&
      effectiveItemBaseItemsTwoDaTable
      ? bindEffectiveBaseItemsTwoDaToItemBaseAppearance(
          placement.itemBaseAppearanceRaw,
          effectiveItemBaseItemsTwoDaTable,
        )
      : undefined;
    const storeRestrictions = placement.storeRestrictionsRaw &&
      effectiveItemBaseItemsTwoDaTable
      ? bindEffectiveBaseItemsTwoDaToStoreRestrictions(
          placement.storeRestrictionsRaw,
          effectiveItemBaseItemsTwoDaTable,
        )
      : undefined;
    const storeInventory = placement.storeInventoryRaw &&
      effectiveItemBaseItemsTwoDaTable
      ? bindEffectiveBaseItemsTwoDaToStoreInventory(
          placement.storeInventoryRaw,
          effectiveItemBaseItemsTwoDaTable,
        )
      : undefined;

    output.push({
      objectId,
      sourceIndex: index,
      kind,
      templateId,
      ...(templateResRef ? { resRef: templateResRef } : {}),
      ...(placement.tag ? { tag: placement.tag } : {}),
      ...(placement.localizedName ? { localizedName: placement.localizedName } : {}),
      ...(placement.description ? { description: placement.description } : {}),
      ...(placement.appearanceType !== undefined
        ? { appearanceType: Math.trunc(placement.appearanceType) }
        : {}),
      ...(placement.genericType !== undefined
        ? { genericType: Math.trunc(placement.genericType) }
        : {}),
      ...(placement.isStatic !== undefined ? { isStatic: placement.isStatic } : {}),
      ...(placeableBasicIdentity
        ? {
            placeableBasicIdentity: {
              tag: { ...placeableBasicIdentity.tag },
              appearance: { ...placeableBasicIdentity.appearance },
            },
          }
        : {}),
      ...(placement.placeableTrapType
        ? { placeableTrapType: { ...placement.placeableTrapType } }
        : {}),
      ...(placement.placeableBodyBag
        ? { placeableBodyBag: { ...placement.placeableBodyBag } }
        : {}),
      ...(placement.placeablePortraitId
        ? { placeablePortraitId: { ...placement.placeablePortraitId } }
        : {}),
      ...(placement.placeableFaction
        ? { placeableFaction: { ...placement.placeableFaction } }
        : {}),
      ...(placement.placeableVariables
        ? {
            placeableVariables: {
              expectedEntries: placement.placeableVariables.expectedEntries.map((entry) => ({
                ...entry,
              })),
            },
          }
        : {}),
      ...(placement.placeableTemplateResRef
        ? { placeableTemplateResRef: placement.placeableTemplateResRef }
        : {}),
      ...(placement.placeableLocalizedStrings
        ? {
            placeableLocalizedStrings: cloneAreaPlaceableLocalizedStrings(
              placement.placeableLocalizedStrings,
            ),
          }
        : {}),
      ...(placement.placeableMetadata
        ? { placeableMetadata: { ...placement.placeableMetadata } }
        : {}),
      ...(placement.creatureTag
        ? { creatureTag: { ...placement.creatureTag } }
        : {}),
      ...(placement.creatureConversation
        ? { creatureConversation: { ...placement.creatureConversation } }
        : {}),
      ...(placement.creatureInterruptable
        ? { creatureInterruptable: { ...placement.creatureInterruptable } }
        : {}),
      ...(placement.creatureAdvancedFlags
        ? {
            creatureAdvancedFlags: {
              disarmable: { ...placement.creatureAdvancedFlags.disarmable },
              plot: { ...placement.creatureAdvancedFlags.plot },
              immortal: { ...placement.creatureAdvancedFlags.immortal },
              lootable: { ...placement.creatureAdvancedFlags.lootable },
              noPermanentDeath: { ...placement.creatureAdvancedFlags.noPermanentDeath },
            },
          }
        : {}),
      ...(placement.creatureBodyBag
        ? { creatureBodyBag: { ...placement.creatureBodyBag } }
        : {}),
      ...(placement.creatureDecayTime
        ? { creatureDecayTime: { ...placement.creatureDecayTime } }
        : {}),
      ...(creatureAppearance
        ? {
            creatureAppearance: {
              ...creatureAppearance,
              ...(creatureAppearance.present && creatureAppearance.table
                ? { table: { ...creatureAppearance.table } }
                : {}),
            },
          }
        : {}),
      ...(creatureGender
        ? {
            creatureGender: {
              ...creatureGender,
              ...(creatureGender.present && creatureGender.table
                ? { table: { ...creatureGender.table } }
                : {}),
            },
          }
        : {}),
      ...(creaturePerceptionRange
        ? {
            creaturePerceptionRange: {
              ...creaturePerceptionRange,
              ...(creaturePerceptionRange.present && creaturePerceptionRange.table
                ? { table: { ...creaturePerceptionRange.table } }
                : {}),
            },
          }
        : {}),
      ...(creatureWalkRate
        ? {
            creatureWalkRate: {
              ...creatureWalkRate,
              ...(creatureWalkRate.present && creatureWalkRate.table
                ? { table: { ...creatureWalkRate.table } }
                : {}),
            },
          }
        : {}),
      ...(creatureSoundSetFile
        ? {
            creatureSoundSetFile: {
              ...creatureSoundSetFile,
              ...(creatureSoundSetFile.present && creatureSoundSetFile.table
                ? { table: { ...creatureSoundSetFile.table } }
                : {}),
            },
          }
        : {}),
      ...(creatureStartingPackage
        ? {
            creatureStartingPackage: {
              ...creatureStartingPackage,
              ...(creatureStartingPackage.present
                ? {
                    ...(creatureStartingPackage.classIds
                      ? { classIds: [...creatureStartingPackage.classIds] }
                      : {}),
                    ...(creatureStartingPackage.table
                      ? { table: { ...creatureStartingPackage.table } }
                      : {}),
                  }
                : {}),
            },
          }
        : {}),
      ...(creatureSkillList
        ? {
            creatureSkillList: creatureSkillList.present
              ? {
                  ...creatureSkillList,
                  ranks: [...creatureSkillList.ranks],
                  opaqueSiblingFieldCounts: [
                    ...creatureSkillList.opaqueSiblingFieldCounts,
                  ],
                  ...(creatureSkillList.table
                    ? { table: { ...creatureSkillList.table } }
                    : {}),
                }
              : { ...creatureSkillList },
          }
        : {}),
      ...(creatureFeatList
        ? {
            creatureFeatList: creatureFeatList.present
              ? {
                  ...creatureFeatList,
                  featIds: [...creatureFeatList.featIds],
                  opaqueSiblingFieldCounts: [
                    ...creatureFeatList.opaqueSiblingFieldCounts,
                  ],
                  ...(creatureFeatList.table
                    ? { table: { ...creatureFeatList.table } }
                    : {}),
                }
              : { ...creatureFeatList },
          }
        : {}),
      ...(creatureSpecialAbilityList
        ? {
            creatureSpecialAbilityList: creatureSpecialAbilityList.present
              ? {
                  ...creatureSpecialAbilityList,
                  entries: creatureSpecialAbilityList.entries.map((entry) => ({ ...entry })),
                  ...(creatureSpecialAbilityList.table
                    ? { table: { ...creatureSpecialAbilityList.table } }
                    : {}),
                }
              : { ...creatureSpecialAbilityList },
          }
        : {}),
      ...(placement.creatureVariables
        ? {
            creatureVariables: {
              expectedEntries: placement.creatureVariables.expectedEntries.map((entry) => ({
                ...entry,
              })),
            },
          }
        : {}),
      ...(placement.creatureClassLevelState
        ? {
            creatureClassLevelState: placement.creatureClassLevelState.present
              ? {
                  ...placement.creatureClassLevelState,
                  entries: placement.creatureClassLevelState.entries.map((entry) => ({
                    ...entry,
                  })),
                }
              : { ...placement.creatureClassLevelState },
          }
        : {}),
      ...(creatureClassIdentityState
        ? {
            creatureClassIdentityState: creatureClassIdentityState.present
              ? {
                  ...creatureClassIdentityState,
                  entries: creatureClassIdentityState.entries.map((entry) => ({ ...entry })),
                  ...(creatureClassIdentityState.classesTable
                    ? { classesTable: { ...creatureClassIdentityState.classesTable } }
                    : {}),
                }
              : { ...creatureClassIdentityState },
          }
        : {}),
      ...(creaturePhenotype
        ? {
            creaturePhenotype: {
              ...creaturePhenotype,
              ...(creaturePhenotype.present && creaturePhenotype.table
                ? { table: { ...creaturePhenotype.table } }
                : {}),
            },
          }
        : {}),
      ...(creaturePortrait
        ? {
            creaturePortrait: {
              ...creaturePortrait,
              ...(creaturePortrait.present && creaturePortrait.selectorContext
                ? { selectorContext: { ...creaturePortrait.selectorContext } }
                : {}),
              ...(creaturePortrait.present && creaturePortrait.table
                ? { table: { ...creaturePortrait.table } }
                : {}),
            },
          }
        : {}),
      ...(placement.creatureChallengeRating
        ? { creatureChallengeRating: { ...placement.creatureChallengeRating } }
        : {}),
      ...(placement.creatureAbilityScores
        ? {
            creatureAbilityScores: {
              strength: { ...placement.creatureAbilityScores.strength },
              dexterity: { ...placement.creatureAbilityScores.dexterity },
              constitution: { ...placement.creatureAbilityScores.constitution },
              intelligence: { ...placement.creatureAbilityScores.intelligence },
              wisdom: { ...placement.creatureAbilityScores.wisdom },
              charisma: { ...placement.creatureAbilityScores.charisma },
            },
          }
        : {}),
      ...(placement.creatureAppearanceColors
        ? {
            creatureAppearanceColors: {
              skin: { ...placement.creatureAppearanceColors.skin },
              hair: { ...placement.creatureAppearanceColors.hair },
              tattoo1: { ...placement.creatureAppearanceColors.tattoo1 },
              tattoo2: { ...placement.creatureAppearanceColors.tattoo2 },
            },
          }
        : {}),
      ...(placement.creatureBodyParts
        ? {
            creatureBodyParts: Object.fromEntries(
              Object.entries(placement.creatureBodyParts).map(([key, storage]) => [
                key,
                storage.present
                  ? {
                      ...storage,
                      legacyByte: { ...storage.legacyByte },
                      wideWord: { ...storage.wideWord },
                    }
                  : { ...storage },
              ]),
            ) as typeof placement.creatureBodyParts,
          }
        : {}),
      ...(creatureAppendages
        ? {
            creatureAppendages: Object.fromEntries(
              Object.entries(creatureAppendages).map(([key, storage]) => [
                key,
                storage.present
                  ? {
                      ...storage,
                      modernDword: storage.modernDword.present && storage.modernDword.table
                        ? {
                            ...storage.modernDword,
                            table: { ...storage.modernDword.table },
                          }
                        : { ...storage.modernDword },
                      legacyByte: { ...storage.legacyByte },
                    }
                  : { ...storage },
              ]),
            ) as typeof creatureAppendages,
          }
        : {}),
      ...(creatureHitPointState
        ? {
            creatureHitPointState: creatureHitPointState.present
              ? {
                  ...creatureHitPointState,
                  hitPoints: { ...creatureHitPointState.hitPoints },
                  currentHitPoints: { ...creatureHitPointState.currentHitPoints },
                  maxHitPoints: { ...creatureHitPointState.maxHitPoints },
                  constitution: { ...creatureHitPointState.constitution },
                  race: { ...creatureHitPointState.race },
                  classLevels: [...creatureHitPointState.classLevels],
                  ...(creatureHitPointState.racialTypes
                    ? { racialTypes: { ...creatureHitPointState.racialTypes } }
                    : {}),
                }
              : { present: false },
          }
        : {}),
      ...(placement.creatureNaturalArmorClass
        ? { creatureNaturalArmorClass: { ...placement.creatureNaturalArmorClass } }
        : {}),
      ...(placement.creatureSavingThrowBonuses
        ? {
            creatureSavingThrowBonuses: {
              fortitude: { ...placement.creatureSavingThrowBonuses.fortitude },
              reflex: { ...placement.creatureSavingThrowBonuses.reflex },
              will: { ...placement.creatureSavingThrowBonuses.will },
            },
          }
        : {}),
      ...(placement.creatureAlignment
        ? {
            creatureAlignment: {
              goodEvil: { ...placement.creatureAlignment.goodEvil },
              lawfulChaotic: { ...placement.creatureAlignment.lawfulChaotic },
            },
          }
        : {}),
      ...(placement.creatureFaction
        ? { creatureFaction: { ...placement.creatureFaction } }
        : {}),
      ...(placement.creatureTemplateResRef
        ? { creatureTemplateResRef: { ...placement.creatureTemplateResRef } }
        : {}),
      ...(placement.creatureSpecialIdentityStrings
        ? {
            creatureSpecialIdentityStrings: {
              subrace: { ...placement.creatureSpecialIdentityStrings.subrace },
              deity: { ...placement.creatureSpecialIdentityStrings.deity },
            },
          }
        : {}),
      ...(placement.creatureScriptResRefs
        ? {
            creatureScriptResRefs: {
              onHeartbeat: { ...placement.creatureScriptResRefs.onHeartbeat },
              onPerception: { ...placement.creatureScriptResRefs.onPerception },
              onSpellCastAt: { ...placement.creatureScriptResRefs.onSpellCastAt },
              onPhysicalAttacked: { ...placement.creatureScriptResRefs.onPhysicalAttacked },
              onDamaged: { ...placement.creatureScriptResRefs.onDamaged },
              onDisturbed: { ...placement.creatureScriptResRefs.onDisturbed },
              onCombatRoundEnd: { ...placement.creatureScriptResRefs.onCombatRoundEnd },
              onConversation: { ...placement.creatureScriptResRefs.onConversation },
              onSpawn: { ...placement.creatureScriptResRefs.onSpawn },
              onRested: { ...placement.creatureScriptResRefs.onRested },
              onDeath: { ...placement.creatureScriptResRefs.onDeath },
              onUserDefined: { ...placement.creatureScriptResRefs.onUserDefined },
              onBlocked: { ...placement.creatureScriptResRefs.onBlocked },
            },
          }
        : {}),
      ...(placement.creatureLocalizedStrings
        ? {
            creatureLocalizedStrings: cloneAreaCreatureNameLocalizedStrings(
              placement.creatureLocalizedStrings,
            ),
          }
        : {}),
      ...(placement.creatureMetadata
        ? { creatureMetadata: { ...placement.creatureMetadata } }
        : {}),
      ...(placement.itemTag ? { itemTag: { ...placement.itemTag } } : {}),
      ...(placement.triggerTag ? { triggerTag: { ...placement.triggerTag } } : {}),
      ...(placement.triggerTemplateResRef
        ? { triggerTemplateResRef: { ...placement.triggerTemplateResRef } }
        : {}),
      ...(placement.triggerLocalizedName
        ? {
            triggerLocalizedName: cloneAreaLocalizedStringStorage(
              placement.triggerLocalizedName,
            ),
          }
        : {}),
      ...(placement.triggerScriptResRefs
        ? { triggerScriptResRefs: { ...placement.triggerScriptResRefs } }
        : {}),
      ...(placement.triggerTransitionStorage
        ? { triggerTransitionStorage: { ...placement.triggerTransitionStorage } }
        : {}),
      ...(placement.triggerMetadata
        ? { triggerMetadata: { ...placement.triggerMetadata } }
        : {}),
      ...(placement.encounterTag ? { encounterTag: { ...placement.encounterTag } } : {}),
      ...(placement.encounterTemplateResRef
        ? { encounterTemplateResRef: { ...placement.encounterTemplateResRef } }
        : {}),
      ...(placement.waypointTag ? { waypointTag: { ...placement.waypointTag } } : {}),
      ...(placement.waypointTemplateResRef
        ? { waypointTemplateResRef: { ...placement.waypointTemplateResRef } }
        : {}),
      ...(placement.waypointLocalizedName
        ? {
            waypointLocalizedName: cloneAreaLocalizedStringStorage(
              placement.waypointLocalizedName,
            ),
          }
        : {}),
      ...(placement.waypointDescription
        ? {
            waypointDescription: cloneAreaLocalizedStringStorage(
              placement.waypointDescription,
            ),
          }
        : {}),
      ...(placement.waypointMapNote
        ? { waypointMapNote: cloneAreaWaypointMapNoteStorage(placement.waypointMapNote) }
        : {}),
      ...(waypointAppearance
        ? { waypointAppearance: { ...waypointAppearance, table: { ...waypointAppearance.table } } }
        : {}),
      ...(placement.waypointVariables
        ? {
            waypointVariables: {
              expectedEntries: placement.waypointVariables.expectedEntries.map((entry) => ({
                ...entry,
              })),
            },
          }
        : {}),
      ...(placement.waypointMetadata
        ? { waypointMetadata: { ...placement.waypointMetadata } }
        : {}),
      ...(placement.encounterActive
        ? { encounterActive: { ...placement.encounterActive } }
        : {}),
      ...(placement.encounterPlayerOnly
        ? { encounterPlayerOnly: { ...placement.encounterPlayerOnly } }
        : {}),
      ...(placement.encounterReset
        ? { encounterReset: { ...placement.encounterReset } }
        : {}),
      ...(placement.encounterResetTime
        ? { encounterResetTime: { ...placement.encounterResetTime } }
        : {}),
      ...(placement.encounterSpawnOption
        ? { encounterSpawnOption: { ...placement.encounterSpawnOption } }
        : {}),
      ...(placement.encounterRespawns
        ? { encounterRespawns: { ...placement.encounterRespawns } }
        : {}),
      ...(placement.encounterCreatureCounts
        ? { encounterCreatureCounts: { ...placement.encounterCreatureCounts } }
        : {}),
      ...(placement.encounterScriptResRefs
        ? { encounterScriptResRefs: { ...placement.encounterScriptResRefs } }
        : {}),
      ...(placement.encounterFaction
        ? { encounterFaction: { ...placement.encounterFaction } }
        : {}),
      ...(placement.encounterDifficulty
        ? {
            encounterDifficulty: {
              difficulty: { ...placement.encounterDifficulty.difficulty },
              difficultyIndex: { ...placement.encounterDifficulty.difficultyIndex },
            },
          }
        : {}),
      ...(placement.encounterLocalizedName
        ? {
            encounterLocalizedName: cloneAreaLocalizedStringStorage(
              placement.encounterLocalizedName,
            ),
          }
        : {}),
      ...(placement.encounterVariables
        ? {
            encounterVariables: {
              expectedEntries: placement.encounterVariables.expectedEntries.map((entry) => ({
                ...entry,
              })),
            },
          }
        : {}),
      ...(placement.encounterCreatureList
        ? {
            encounterCreatureList: {
              expectedEntries: placement.encounterCreatureList.expectedEntries.map(
                (entry) => ({ ...entry }),
              ),
            },
          }
        : {}),
      ...(placement.encounterSpawnPoints
        ? {
            encounterSpawnPoints: {
              expectedEntries: placement.encounterSpawnPoints.expectedEntries.map(
                (entry) => ({ ...entry }),
              ),
            },
          }
        : {}),
      ...(placement.encounterMetadata
        ? { encounterMetadata: { ...placement.encounterMetadata } }
        : {}),
      ...(placement.itemTemplateResRef
        ? { itemTemplateResRef: { ...placement.itemTemplateResRef } }
        : {}),
      ...(placement.itemInstanceState
        ? { itemInstanceState: cloneAreaItemInstanceStateStorage(placement.itemInstanceState) }
        : {}),
      ...(placement.itemLocalizedStrings
        ? { itemLocalizedStrings: cloneAreaItemLocalizedStrings(placement.itemLocalizedStrings) }
        : {}),
      ...(placement.itemVariables
        ? {
            itemVariables: {
              expectedEntries: placement.itemVariables.expectedEntries.map((entry) => ({
                ...entry,
              })),
            },
          }
        : {}),
      ...(placement.itemPropertyList
        ? {
            itemPropertyList: cloneAreaItemPropertyListProvenance(
              placement.itemPropertyList,
            ),
          }
        : {}),
      ...(itemBaseAppearance
        ? {
            itemBaseAppearance: {
              expectedValue: cloneAreaItemBaseAppearanceValue(
                itemBaseAppearance.expectedValue,
              ),
              tableSha256: itemBaseAppearance.tableSha256,
              tableRowCount: itemBaseAppearance.tableRowCount,
            },
          }
        : {}),
      ...(placement.itemInventoryItems
        ? {
            itemInventoryItems: placement.itemInventoryItems.map((entry) => ({
              ...entry,
            })),
          }
        : {}),
      ...(placement.itemVisualTransform
        ? {
            itemVisualTransform: placement.itemVisualTransform.present
              ? {
                  present: true as const,
                  value: { ...placement.itemVisualTransform.value },
                }
              : { present: false as const },
          }
        : {}),
      ...(placement.itemMetadata ? { itemMetadata: { ...placement.itemMetadata } } : {}),
      ...(placement.storeMetadata || storeRestrictions || storeInventory
        ? {
            storeMetadata: {
              ...placement.storeMetadata,
              ...(placement.storeMetadata?.commerce
                ? { commerce: { ...placement.storeMetadata.commerce } }
                : {}),
              ...(placement.storeMetadata?.scriptResRefs
                ? { scriptResRefs: { ...placement.storeMetadata.scriptResRefs } }
                : {}),
              ...(placement.storeMetadata?.variables
                ? {
                    variables: {
                      expectedEntries: placement.storeMetadata.variables.expectedEntries.map(
                        (entry) => ({ ...entry }),
                      ),
                    },
                  }
                : {}),
              ...(storeRestrictions
                ? { restrictions: cloneAreaStoreRestrictionsProvenance(storeRestrictions) }
                : {}),
              ...(storeInventory
                ? { inventory: cloneAreaStoreInventoryProvenance(storeInventory) }
                : {}),
            },
          }
        : {}),
      x: clampCoordinate(toAreaSceneTileCoordinate(placement.x)),
      y: clampCoordinate(toAreaSceneTileCoordinate(placement.y)),
      z: clampCoordinate(toAreaSceneTileCoordinate(placement.z)),
      bearing: clampBearing(placement.bearing),
      ...(placement.visualTransform
        ? {
            visualTransform: {
              scale: clampVisualScale(
                (placement.visualTransform.scaleX +
                  placement.visualTransform.scaleY +
                  placement.visualTransform.scaleZ) /
                  3
              ),
              scaleX: clampVisualScale(placement.visualTransform.scaleX),
              scaleY: clampVisualScale(placement.visualTransform.scaleY),
              scaleZ: clampVisualScale(placement.visualTransform.scaleZ),
              offsetX: clampCoordinate(
                toAreaSceneTileCoordinate(placement.visualTransform.translateX)
              ),
              offsetY: clampCoordinate(
                toAreaSceneTileCoordinate(placement.visualTransform.translateY)
              ),
              offsetZ: clampCoordinate(
                toAreaSceneTileCoordinate(placement.visualTransform.translateZ)
              ),
              pitch: clampRadians(degreesToRadians(placement.visualTransform.rotateX)),
              yaw: clampRadians(degreesToRadians(placement.visualTransform.rotateZ)),
              roll: clampRadians(degreesToRadians(placement.visualTransform.rotateY))
            }
          }
        : {}),
      ...(placement.soundPositioning
        ? {
            soundPositioning: {
              ...placement.soundPositioning,
              elevation: clampCoordinate(
                toAreaSceneTileCoordinate(placement.soundPositioning.elevation)
              ),
              maxVolumeDistance: clampCoordinate(
                toAreaSceneTileCoordinate(placement.soundPositioning.maxVolumeDistance)
              ),
              cutoffDistance: clampCoordinate(
                toAreaSceneTileCoordinate(placement.soundPositioning.cutoffDistance)
              ),
              randomRangeWestEast: clampCoordinate(
                toAreaSceneTileCoordinate(placement.soundPositioning.randomRangeWestEast)
              ),
              randomRangeNorthSouth: clampCoordinate(
                toAreaSceneTileCoordinate(placement.soundPositioning.randomRangeNorthSouth)
              )
            }
          }
        : {}),
      ...(placement.soundIntervalVariation
        ? { soundIntervalVariation: { ...placement.soundIntervalVariation } }
        : {}),
      ...(placement.soundVolume ? { soundVolume: { ...placement.soundVolume } } : {}),
      ...(placement.soundActive ? { soundActive: { ...placement.soundActive } } : {}),
      ...(placement.soundPlayOrder ? { soundPlayOrder: { ...placement.soundPlayOrder } } : {}),
      ...(placement.soundPlayStyle ? { soundPlayStyle: { ...placement.soundPlayStyle } } : {}),
      ...(placement.soundPlayback
        ? {
            soundPlayback: {
              ...placement.soundPlayback,
              sounds: [...placement.soundPlayback.sounds],
            },
          }
        : {}),
      ...(placement.soundProfile
        ? {
            soundProfile: {
              ...placement.soundProfile,
              sounds: [...placement.soundProfile.sounds],
            },
          }
        : {}),
      ...(placement.soundSchedule ? { soundSchedule: { ...placement.soundSchedule } } : {}),
      ...(placement.doorTransition
        ? {
            doorTransition: {
              linkedTarget: placement.doorTransition.linkedTarget,
              linkedModule: placement.doorTransition.linkedModule,
              linkedTag: placement.doorTransition.linkedTag,
              linkedWaypoint: placement.doorTransition.linkedWaypoint,
              loadScreen: placement.doorTransition.loadScreen,
              flags: { ...placement.doorTransition.flags },
              extra: { ...placement.doorTransition.extra },
              ...(placement.doorTransition.storage
                ? { storage: { ...placement.doorTransition.storage } }
                : {})
            }
          }
        : {}),
      ...((kind === "trigger" || kind === "encounter") && placement.polygonGeometry
        ? {
            polygonGeometry: {
              coordinateSpace: placement.polygonGeometry.coordinateSpace,
              points: placement.polygonGeometry.points.map((point) => ({ ...point })),
            },
          }
        : {}),
    });
  });
}

function buildAreaObjectTemplateId(
  kind: AreaRecord["objects"][number]["kind"],
  prefix: string,
  templateResRef: string
): string {
  if (
    kind === "door" ||
    kind === "sound" ||
    kind === "store" ||
    kind === "trigger" ||
    kind === "waypoint"
  ) {
    return templateResRef.slice(0, 80);
  }
  const prefixedPattern = new RegExp(`^${prefix}_`, "iu");
  return (prefixedPattern.test(templateResRef)
    ? templateResRef
    : `${prefix}_${templateResRef}`).slice(0, 80);
}

function chooseUpdatedAt(candidate: AreaCandidate): string {
  const git = candidate.gitUpdatedAt ?? "";
  const gic = candidate.gicUpdatedAt ?? "";
  return [candidate.areUpdatedAt, git, gic].sort().at(-1) ?? candidate.areUpdatedAt;
}

function buildTags(candidate: AreaCandidate, biome: string): string[] {
  const tags = new Set<string>();
  tags.add("area");
  tags.add(biome);

  for (const token of candidate.resref.split(/[_-]+/u)) {
    if (token.length >= 3 && token.length <= 24) {
      tags.add(token);
    }
  }

  const parsedTag = normalizeResref(candidate.parsedArea?.tag ?? "");
  if (parsedTag.length > 0) {
    for (const token of parsedTag.split(/[_-]+/u)) {
      if (token.length >= 3 && token.length <= 24) {
        tags.add(token);
      }
    }
  }

  const tileSet = normalizeResref(candidate.parsedArea?.tileSet ?? "");
  if (tileSet.length > 0) {
    tags.add(tileSet);
  }

  const objectCount =
    (candidate.parsedObjects?.placeables.length ?? 0) +
    (candidate.parsedObjects?.doors.length ?? 0) +
    (candidate.parsedObjects?.creatures.length ?? 0) +
    (candidate.parsedObjects?.encounters.length ?? 0) +
    (candidate.parsedObjects?.items.length ?? 0) +
    (candidate.parsedObjects?.sounds.length ?? 0) +
    (candidate.parsedObjects?.stores.length ?? 0) +
    (candidate.parsedObjects?.triggers.length ?? 0) +
    (candidate.parsedObjects?.waypoints.length ?? 0);
  if (objectCount > 0) {
    tags.add("git");
    tags.add("objects");
  }

  return [...tags].slice(0, 16);
}

function buildAreaSoundscape(): AreaRecord["soundscape"] {
  // The GIT stores numeric row ids, not sound resrefs. Until the effective
  // ambientmusic.2da / ambientsound.2da lineage is available, exposing a
  // guessed filename would silently bind the wrong Aurora resource.
  return {
    bindingKeys: DEFAULT_SOUND_BINDING_KEYS,
    area: [],
    random: [],
    positional: []
  };
}

function buildIndexedArea(candidate: AreaCandidate, benchmarkIds: Set<string>): IndexedArea {
  const biome = inferBiome(candidate);
  const dimensions = resolveDimensions(candidate);
  const areaId = `area_${candidate.resref}`.slice(0, 80);
  const name = resolveAreaName(candidate);
  const tags = buildTags(candidate, biome);
  const composition = countAreaCandidateObjects(candidate);
  const listItem: AreaListItem = {
    areaId,
    name,
    biome,
    width: dimensions.width,
    height: dimensions.height,
    tags,
    benchmark: benchmarkIds.has(candidate.resref),
    previewImageUrl: `/assets/previews/areas/${candidate.resref}.webp`,
    textureAtlasId: buildTextureAtlasId(candidate, biome),
    objectCounts: composition,
    updatedAt: chooseUpdatedAt(candidate),
  };
  return {
    candidate,
    listItem,
    composition,
    searchable: [name, areaId, ...tags].join("|").toLowerCase(),
    biomeLower: biome.toLowerCase(),
    tagsLower: new Set(tags.map((tag) => tag.toLowerCase())),
  };
}

function countAreaCandidateObjects(candidate: AreaCandidate): AreaObjectCounts {
  const placements = candidate.parsedObjects;
  const counts = {
    placeables: placements?.placeables.length ?? 0,
    doors: placements?.doors.length ?? 0,
    creatures: placements?.creatures.length ?? 0,
    encounters: placements?.encounters.length ?? 0,
    items: placements?.items.length ?? 0,
    sounds: placements?.sounds.length ?? 0,
    stores: placements?.stores.length ?? 0,
    triggers: placements?.triggers.length ?? 0,
    waypoints: placements?.waypoints.length ?? 0,
  };
  return {
    ...counts,
    total: Object.values(counts).reduce((sum, count) => sum + count, 0),
  };
}

function buildAtlasFingerprint(candidate: AreaCandidate): string {
  return createHash("sha256")
    .update(
      [
        candidate.resref,
        candidate.areSourceKey,
        String(candidate.areSourceSize),
        candidate.areSourceEtag ?? "",
        candidate.areUpdatedAt,
        candidate.gitSourceKey ?? "",
        String(candidate.gitSourceSize ?? 0),
        candidate.gitSourceEtag ?? "",
        candidate.gitUpdatedAt ?? "",
        candidate.gicSourceKey ?? "",
        String(candidate.gicSourceSize ?? 0),
        candidate.gicSourceEtag ?? "",
        candidate.gicUpdatedAt ?? "",
        candidate.parsedArea?.dependencyFingerprint ?? "",
        candidate.parsedObjects?.dependencyFingerprint ?? ""
      ].join("|")
    )
    .digest("hex");
}

function buildSourceFingerprint(candidate: AreaCandidate): string {
  return createHash("sha256")
    .update(
      [
        candidate.resref,
        candidate.areSourceKey,
        String(candidate.areSourceSize),
        candidate.areSourceEtag ?? "",
        candidate.areUpdatedAt,
        candidate.gitSourceKey ?? "",
        String(candidate.gitSourceSize ?? 0),
        candidate.gitSourceEtag ?? "",
        candidate.gitUpdatedAt ?? "",
        candidate.gicSourceKey ?? "",
        String(candidate.gicSourceSize ?? 0),
        candidate.gicSourceEtag ?? "",
        candidate.gicUpdatedAt ?? "",
        candidate.parsedArea?.sourceFileType ?? "",
        candidate.parsedArea?.sourceFileVersion ?? "",
        String(candidate.parsedArea?.sourceStructTypeId ?? -1),
        candidate.parsedArea?.dependencyFingerprint ?? "",
        candidate.parsedObjects?.sourceFileType ?? "",
        candidate.parsedObjects?.sourceFileVersion ?? "",
        String(candidate.parsedObjects?.sourceStructTypeId ?? -1),
        candidate.parsedObjects?.dependencyFingerprint ?? "",
        stringifyTilesetFingerprint(candidate.parsedTileset)
      ].join("|")
    )
    .digest("hex");
}

function stringifyTilesetFingerprint(tileset: ParsedTilesetBlueprint | undefined): string {
  if (!tileset) {
    return "";
  }
  const tileModels = [...tileset.tilesById.values()]
    .sort((left, right) => left.tileId - right.tileId)
    .map((tile) =>
      [
        tile.tileId,
        tile.modelResRef ?? "",
        tile.orientation ?? "",
        tile.pathNode ?? "",
        tile.visibilityNode ?? "",
        tile.visibilityOrientation ?? "",
        tile.doorVisibilityNode ?? "",
        tile.doorVisibilityOrientation ?? "",
        JSON.stringify(tile.cornerHeights ?? {}),
        JSON.stringify(tile.edges ?? {})
      ].join(":")
    )
    .join(",");
  return [
    tileset.sourceKey,
    String(tileset.sourceSize),
    tileset.sourceEtag ?? "",
    tileset.updatedAt,
    tileModels
  ].join(":");
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

function humanizeName(resref: string): string {
  return resref
    .split(/[_-]+/u)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function isPositiveInt(value: number | undefined): value is number {
  return Number.isInteger(value) && (value ?? 0) > 0;
}

function clampCoordinate(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Number(value.toFixed(4));
}

function clampVisualScale(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }
  return Number(value.toFixed(4));
}

function degreesToRadians(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return (value * Math.PI) / 180;
}

function clampRadians(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Number(value.toFixed(6));
}

function toAreaSceneTileCoordinate(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return value / AURORA_GIT_UNITS_PER_TILE;
}

function clampBearing(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const normalized = ((value % 360) + 360) % 360;
  return Number(normalized.toFixed(4));
}

function estimateDimensions(size: number): { width: number; height: number } {
  const base = clamp(Math.round(Math.sqrt(Math.max(size, 256)) / 8), 8, 64);
  const width = base % 2 === 0 ? base : base + 1;
  const height = clamp(width, 8, 64);
  return {
    width,
    height
  };
}

function normalizePrefixForLookup(value: string): string {
  const trimmed = value.trim().replace(/^\/+/u, "").replace(/\/+$/u, "");
  if (!trimmed) {
    return "";
  }
  return `${trimmed}/`;
}

function formatErrorForLog(error: unknown): string {
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

export const __moduleSnapshotAreaRepositoryInternals = {
  buildAreaCandidatesFromSnapshot,
  pickBenchmarkIds,
  inferBiome,
  resolveDimensions,
  buildTags,
  extractFileName,
  extractExtension,
  extractBasename,
  normalizeResref,
  humanizeName,
  clamp,
  isPositiveInt,
  clampCoordinate,
  clampBearing,
  estimateDimensions,
  normalizePrefixForLookup,
  mapWithConcurrency,
  collectTilesetSetObjects,
  parseAuroraSetTiles,
  buildAreaAuroraVfxCollision,
  resolveAreaWokSourcePriority
} as const;
