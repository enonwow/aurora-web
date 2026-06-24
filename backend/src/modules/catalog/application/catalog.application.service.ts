import { Inject, Injectable, Optional } from "@nestjs/common";
import { stat } from "node:fs/promises";
import { basename, isAbsolute, resolve } from "node:path";
import { executeInFlight } from "../../../common/async/in-flight.helpers";
import { buildS3ObjectUrl } from "../../../common/blob/blob-url.helpers";
import { AppException } from "../../../common/http/app-exception";
import { AppConfigService } from "../../../common/config/app-config.service";
import {
  PLACEABLE_PROCESSING_CACHE,
  type PlaceableProcessingCachePort,
  type PlaceableProcessingResult
} from "./ports/placeable-processing-cache.port";
import {
  TEMPLATE_CATALOG_REPOSITORY,
  type TemplateCatalogRepositoryPort
} from "./ports/template-catalog-repository.port";
import {
  MODULE_BLOB_STORAGE,
  type ModuleBlobObjectSummary,
  type ModuleBlobObjectPayload,
  type ModuleBlobSnapshotSummary,
  type ModuleBlobStoragePort
} from "../../runtime-settings/application/ports/module-blob-storage.port";
import {
  RUNTIME_SETTINGS_REPOSITORY,
  type RuntimeSettingsRepositoryPort
} from "../../runtime-settings/application/ports/runtime-settings-repository.port";
import type {
  BlobStorageSettings,
  RuntimeSettingsRecord
} from "../../runtime-settings/domain/runtime-settings.types";
import type {
  BenchmarkDurationSummary,
  PlaceableAssetEntry,
  PlaceableAssetManifest,
  PlaceableAssetRole,
  PlaceableBenchmarkResult,
  PlaceableBenchmarkRunQuery,
  PlaceableProcessQuery,
  PlaceableRenderPackage,
  PlaceableRenderPackageAuroraEmitterSource,
  PlaceableRenderPackageAuroraLightSource,
  PlaceableSubtype,
  TemplateProcessQuery,
  TemplateProcessingResult,
  TemplateKind,
  TemplateRecord,
  TemplateListQuery,
  TemplateListResult
} from "../domain/template.types";
import {
  buildPlaceableProcessCacheKey,
  buildTemplateProcessCacheKey
} from "../domain/cache-key.builders";
import {
  buildPlaceableThumbnailPayload,
  withPlaceablePreviewImageUrl
} from "../domain/template-thumbnail";
import {
  buildPlaceableRuntimeProjection,
  buildPlaceableValidationIssues,
  buildPlaceableRenderPackage as buildRenderPackageFromManifest,
  buildCreatureRuntimeProjection,
  buildCreatureValidationIssues,
  buildItemRuntimeProjection,
  buildItemValidationIssues,
  buildBenchmarkFingerprint,
  buildAssetId,
  buildModuleSnapshotIndex,
  buildRenderContract,
  buildTemplateRenderContract,
  buildEmptyPlaceableAssetManifest,
  collectPlaceableAssetsFromSnapshot,
  compareAssetSourcePriority,
  extractBasename,
  extractExtension,
  extractFileName,
  inferContentTypeForExtension,
  maybeStripBenchmarkMetadata,
  maybeStripTemplateBenchmarkMetadata,
  normalizePrefixForLookup,
  resolvePlaceableClassification,
  summarizeDurations,
  type ModuleSnapshotIndex,
  type PlaceableAssetSourcePriority
} from "./catalog-processing.helpers";
import {
  DERIVED_ASSET_GENERATOR,
  type DerivedAssetGeneratorPort
} from "../../runtime-settings/application/ports/derived-asset-generator.port";
import {
  readModuleIfOHakList,
  resolveHakSettingsByAsset
} from "../../runtime-settings/application/runtime-settings.application.service";
import {
  NWN_KEY_BIF_RESOURCE_TYPES,
  NwnKeyBifResourceReader
} from "../../runtime-settings/application/nwn-key-bif-resource-reader";
import { readNwnErfResource } from "../../runtime-settings/adapters/outbound/nwn/nwn-erf-packed-module-extractor.service";
import {
  parseAuroraMdlVfxSource,
  type AuroraMdlVfxParseOptions
} from "../../vfx/domain/aurora-mdl-vfx-source.parser";

export interface ProcessingCacheDescriptor {
  key: string;
  hit: boolean;
  storedAt: string;
  hits: number;
}

export interface PlaceableProcessingEnvelope {
  cache: ProcessingCacheDescriptor;
  placeable: PlaceableProcessingResult;
}

export interface TemplateProcessingEnvelope {
  cache: ProcessingCacheDescriptor;
  value: TemplateProcessingResult;
}

export type TemplateProcessingKind = "creature" | "item";

export type TemplateProcessingResultByKind<TKind extends TemplateProcessingKind> =
  TKind extends "creature"
    ? { cache: ProcessingCacheDescriptor; creature: TemplateProcessingResult }
    : { cache: ProcessingCacheDescriptor; item: TemplateProcessingResult };

interface OnDemandResourceCandidate {
  extension: string;
  resourceType: number;
  vanillaDirectory: string;
}

interface OnDemandPlaceableSourceResource extends OnDemandResourceCandidate {
  resref: string;
  fileName: string;
  bytes: Buffer;
}

const ON_DEMAND_MODEL_RESOURCE_CANDIDATES: OnDemandResourceCandidate[] = [
  {
    extension: "mdl",
    resourceType: NWN_KEY_BIF_RESOURCE_TYPES.MDL,
    vanillaDirectory: "models"
  }
];

const ON_DEMAND_TEXTURE_RESOURCE_CANDIDATES: OnDemandResourceCandidate[] = [
  {
    extension: "bmp",
    resourceType: NWN_KEY_BIF_RESOURCE_TYPES.BMP,
    vanillaDirectory: "textures"
  },
  {
    extension: "dds",
    resourceType: NWN_KEY_BIF_RESOURCE_TYPES.DDS,
    vanillaDirectory: "textures"
  },
  {
    extension: "tga",
    resourceType: NWN_KEY_BIF_RESOURCE_TYPES.TGA,
    vanillaDirectory: "textures"
  },
  {
    extension: "plt",
    resourceType: NWN_KEY_BIF_RESOURCE_TYPES.PLT,
    vanillaDirectory: "textures"
  }
];

const ON_DEMAND_MATERIAL_RESOURCE_CANDIDATES: OnDemandResourceCandidate[] = [
  {
    extension: "mtr",
    resourceType: NWN_KEY_BIF_RESOURCE_TYPES.MTR,
    vanillaDirectory: "materials"
  },
  {
    extension: "txi",
    resourceType: NWN_KEY_BIF_RESOURCE_TYPES.TXI,
    vanillaDirectory: "textures"
  }
];

const VANILLA_KEY_FILE_CANDIDATES = ["nwn_base.key", "nwn_retail.key"] as const;

export interface PlaceableAssetBlobEnvelope {
  cacheKey: string;
  asset: PlaceableAssetEntry;
  moduleHash?: string;
  payload: ModuleBlobObjectPayload;
}

export interface PlaceableAssetDeliveryContract {
  assetId: string;
  objectKey: string;
  contentType: string;
  sizeBytes: number;
  deliveryPath: string;
  deliveryUrl: string;
  s3Url?: string;
}

export interface PlaceableAssetDeliveryEnvelope {
  cacheKey: string;
  moduleHash?: string;
  assets: PlaceableAssetDeliveryContract[];
}

export interface PlaceableAssetDeliveryBatchQuery {
  cacheKey: string;
  assetIds?: string[];
}

export interface PlaceableAssetDeliveryBatchEnvelope {
  items: PlaceableAssetDeliveryEnvelope[];
}

const MODULE_HASH_PROBE_TTL_MS = 30_000;
const MODULE_SNAPSHOT_INDEX_TTL_MS = 5 * 60_000;
const MODULE_SNAPSHOT_INDEX_FAILURE_TTL_MS = 30_000;
const TEMPLATE_LOOKUP_TTL_MS = 60_000;
const TEMPLATE_LIST_CACHE_TTL_MS = 60_000;
const PLACEABLE_MANIFEST_VALIDATION_TTL_MS = 30_000;
const DEFAULT_TEMPLATE_LOOKUP_CACHE_MAX_ENTRIES = 2_500;
const DEFAULT_MANIFEST_VALIDATION_CACHE_MAX_ENTRIES = 5_000;
const DEFAULT_TEMPLATE_LIST_CACHE_MAX_ENTRIES = 256;
const GLB_MAGIC = 0x46546c67;
const GLB_JSON_CHUNK_TYPE = 0x4e4f534a;

interface TemplateLookupCacheEntry {
  template: TemplateRecord;
  expiresAtMs: number;
}

interface TemplateListCacheEntry {
  result: TemplateListResult;
  expiresAtMs: number;
}

interface PlaceableManifestValidationEntry {
  moduleHash?: string;
  expiresAtMs: number;
}

interface DerivedPlaceableModelGenerationResult {
  derivedAssets: PlaceableAssetEntry[];
  noRenderableGeometry: boolean;
}

interface PlaceableProcessingOptions {
  allowOnDemandDerivedModelGeneration?: boolean;
  allowExpensiveSourceReferenceScans?: boolean;
  allowOnDemandTextureLookup?: boolean;
}

@Injectable()
export class CatalogApplicationService {
  private readonly inFlightPlaceableProcessing = new Map<
    string,
    Promise<PlaceableProcessingEnvelope>
  >();

  private readonly inFlightTemplateProcessing = new Map<
    string,
    Promise<TemplateProcessingEnvelope>
  >();
  private readonly inFlightDerivedPlaceableModelAssets = new Map<
    string,
    Promise<DerivedPlaceableModelGenerationResult>
  >();

  private moduleSnapshotIndexCache:
    | {
        key: string;
        index: ModuleSnapshotIndex;
        fetchedAtMs: number;
      }
    | null = null;
  private moduleSnapshotIndexFailureCache:
    | {
        expiresAtMs: number;
      }
    | null = null;
  private readonly inFlightModuleSnapshotIndex = new Map<
    string,
    Promise<ModuleSnapshotIndex | null>
  >();
  private moduleHashProbeCache:
    | {
        value: string | undefined;
        fetchedAtMs: number;
      }
    | null = null;
  private moduleHashProbeInFlight: Promise<string | undefined> | null = null;
  private readonly templateByIdCache = new Map<string, TemplateLookupCacheEntry>();
  private readonly templateByResrefCache = new Map<string, TemplateLookupCacheEntry>();
  private readonly templateListCache = new Map<string, TemplateListCacheEntry>();
  private readonly templateListInFlight = new Map<string, Promise<TemplateListResult>>();
  private readonly placeableManifestValidationCache = new Map<
    string,
    PlaceableManifestValidationEntry
  >();
  private readonly templateLookupCacheMaxEntries: number;
  private readonly manifestValidationCacheMaxEntries: number;

  constructor(
    @Inject(TEMPLATE_CATALOG_REPOSITORY)
    private readonly repository: TemplateCatalogRepositoryPort,
    @Inject(PLACEABLE_PROCESSING_CACHE)
    private readonly placeableCache: PlaceableProcessingCachePort,
    private readonly appConfig?: AppConfigService,
    @Inject(RUNTIME_SETTINGS_REPOSITORY)
    private readonly runtimeSettingsRepository?: RuntimeSettingsRepositoryPort,
    @Inject(MODULE_BLOB_STORAGE)
    private readonly moduleBlobStorage?: ModuleBlobStoragePort,
    @Optional()
    @Inject(DERIVED_ASSET_GENERATOR)
    private readonly derivedAssetGenerator?: DerivedAssetGeneratorPort
  ) {
    const configuredBase =
      this.appConfig?.processingCacheL1CatalogMaxEntries ??
      DEFAULT_TEMPLATE_LOOKUP_CACHE_MAX_ENTRIES;
    this.templateLookupCacheMaxEntries = Math.max(500, configuredBase * 2);
    this.manifestValidationCacheMaxEntries = Math.max(1000, configuredBase * 4);
  }

  listPlaceables(query: TemplateListQuery) {
    return this.listTemplatesByKind("placeable", query);
  }

  listTemplateKind<TKind extends TemplateProcessingKind>(
    kind: TKind,
    query: TemplateListQuery
  ) {
    return this.listTemplatesByKind(kind, query);
  }

  listCreatures(query: TemplateListQuery) {
    return this.listTemplateKind("creature", query);
  }

  listItems(query: TemplateListQuery) {
    return this.listTemplateKind("item", query);
  }

  private listTemplatesByKind(
    kind: TemplateKind,
    query: TemplateListQuery
  ): Promise<TemplateListResult> {
    const cacheKey = buildTemplateListCacheKey(kind, query);
    const now = Date.now();
    const cached = this.templateListCache.get(cacheKey);
    if (cached && cached.expiresAtMs > now) {
      this.templateListCache.delete(cacheKey);
      this.templateListCache.set(cacheKey, cached);
      return Promise.resolve(cached.result);
    }
    if (cached) {
      this.templateListCache.delete(cacheKey);
    }

    const inFlight = this.templateListInFlight.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }

    const request = this.repository
      .listByKind(kind, query)
      .then((result) => this.withTemplateListPreviewImageUrls(kind, result))
      .then((result) => {
        this.templateListCache.set(cacheKey, {
          result,
          expiresAtMs: Date.now() + TEMPLATE_LIST_CACHE_TTL_MS
        });
        this.pruneOverflow(this.templateListCache, DEFAULT_TEMPLATE_LIST_CACHE_MAX_ENTRIES);
        return result;
      })
      .finally(() => {
        this.templateListInFlight.delete(cacheKey);
      });
    this.templateListInFlight.set(cacheKey, request);
    return request;
  }

  async getPlaceablePreview(templateId: string) {
    return this.getPreviewByKind("placeable", templateId);
  }

  async getPlaceableThumbnail(templateId: string) {
    const template = await this.repository.findByKindAndId("placeable", templateId);
    if (!template) {
      throw new AppException({
        status: 404,
        code: "TEMPLATE_NOT_FOUND",
        message: "placeable template was not found."
      });
    }

    return buildPlaceableThumbnailPayload(template);
  }

  async getTemplateKindPreview<TKind extends TemplateProcessingKind>(
    kind: TKind,
    templateId: string
  ) {
    return this.getPreviewByKind(kind, templateId);
  }

  async getCreaturePreview(templateId: string) {
    return this.getTemplateKindPreview("creature", templateId);
  }

  async getItemPreview(templateId: string) {
    return this.getTemplateKindPreview("item", templateId);
  }

  async processPlaceable(
    query: PlaceableProcessQuery,
    options: PlaceableProcessingOptions = {}
  ) {
    const template = await this.resolvePlaceableTemplate(query);
    const templateSubtypeForClassification =
      isAreaInstanceRenderQuery(query) && query.subtypeHint === "generic"
        ? "generic"
        : template.placeableSubtype;
    const classification = resolvePlaceableClassification(
      templateSubtypeForClassification,
      query.subtypeHint
    );
    const instanceRenderMetadata = await this.resolveAreaInstancePlaceableRenderMetadata(
      query,
      classification.normalizedSubtype,
      template
    );
    const metadata = {
      ...template.metadata,
      ...instanceRenderMetadata.metadata
    };
    const instanceFingerprint = buildAreaInstanceRenderFingerprint(query);
    const cacheKey =
      (instanceFingerprint
        ? null
        : this.repository.getPrecomputedPlaceableCacheKey?.(
            template.templateId,
            classification.normalizedSubtype
          )) ??
      buildPlaceableProcessCacheKey(
        template.templateId,
        template.resref,
        classification.normalizedSubtype,
        instanceFingerprint ?? "stable"
      );

    if (!query.bypassCache) {
      const cached = await this.placeableCache.get<PlaceableProcessingResult>(cacheKey);
      if (cached) {
        const hydrated = await this.ensurePlaceableManifest(cacheKey, cached.value);
        return {
          cache: {
            key: cacheKey,
            hit: true,
            storedAt: cached.storedAt,
            hits: cached.hits
          },
          placeable: maybeStripBenchmarkMetadata(hydrated, query.includeBenchmarkMetadata)
        };
      }
    }

    const processMiss = async (): Promise<PlaceableProcessingEnvelope> => {
      const placeableRuntime = buildPlaceableRuntimeProjection(metadata);
      const placeableValidationIssues = buildPlaceableValidationIssues(placeableRuntime);
      const areaInstanceMissingModel = isAreaInstanceMissingRenderableModel(metadata);
      const assetManifest = areaInstanceMissingModel
        ? buildEmptyPlaceableAssetManifest()
        : await this.buildPlaceableAssetManifest({
            templateId: template.templateId,
            resref: template.resref,
            subtype: classification.normalizedSubtype,
            metadata,
            processingOptions: options
          });
      const renderPackage = areaInstanceMissingModel
        ? buildAreaInstanceMissingModelRenderPackage(metadata)
        : await this.buildPlaceableRenderPackageForCacheEntry(
            cacheKey,
            assetManifest,
            classification.normalizedSubtype
          );

      const processed: PlaceableProcessingResult = {
        templateId: template.templateId,
        resref: template.resref,
        name: template.name,
        category: template.category,
        placeableSubtype: classification.normalizedSubtype,
        render: buildRenderContract(classification.normalizedSubtype),
        benchmarkCandidate: template.benchmarkCandidate ?? false,
        benchmarkBucket: template.benchmarkBucket,
        metadata,
        placeableRuntime,
        placeableValidationIssues,
        assetManifest,
        renderPackage,
        classification,
        processedAt: new Date().toISOString()
      };

      const stored = await this.placeableCache.set<PlaceableProcessingResult>(cacheKey, processed);
      this.rememberManifestValidation(cacheKey, processed.assetManifest.moduleHash);
      return {
        cache: {
          key: cacheKey,
          hit: false,
          storedAt: stored.storedAt,
          hits: stored.hits
        },
        placeable: processed
      };
    };

    const result = await executeInFlight(
      this.inFlightPlaceableProcessing,
      cacheKey,
      processMiss
    );

    return {
      cache: result.cache,
      placeable: maybeStripBenchmarkMetadata(
        result.placeable,
        query.includeBenchmarkMetadata
      )
    };
  }

  async processPlaceablesBatch(queries: PlaceableProcessQuery[]) {
    const results: Awaited<ReturnType<CatalogApplicationService["processPlaceable"]>>[] = [];
    const groupsByKey = new Map<
      string,
      {
        query: PlaceableProcessQuery;
        indexes: number[];
      }
    >();

    queries.forEach((query, index) => {
      const key = buildPlaceableBatchRenderFactsKey(query);
      const existing = groupsByKey.get(key);
      if (existing) {
        existing.indexes.push(index);
        return;
      }
      groupsByKey.set(key, {
        query,
        indexes: [index]
      });
    });

    const groups = [...groupsByKey.values()];
    let cursor = 0;
    const workerCount = Math.min(24, groups.length);

    const runWorker = async () => {
      while (cursor < groups.length) {
        const index = cursor;
        cursor += 1;
        const group = groups[index];
        if (!group) {
          continue;
        }
        const shouldGenerateAreaInstanceModel = isAreaInstanceRenderQuery(group.query);
        const result = await this.processPlaceable(group.query, {
          allowOnDemandDerivedModelGeneration: shouldGenerateAreaInstanceModel,
          allowExpensiveSourceReferenceScans: false,
          allowOnDemandTextureLookup: true
        });
        for (const queryIndex of group.indexes) {
          results[queryIndex] = result;
        }
      }
    };

    await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
    return { items: results };
  }

  private async resolveAreaInstancePlaceableRenderMetadata(
    query: PlaceableProcessQuery,
    subtype: PlaceableSubtype,
    template: TemplateRecord
  ): Promise<{ metadata: Record<string, string | number | boolean> }> {
    const appearanceType =
      Number.isInteger(query.appearanceType ?? Number.NaN) && query.appearanceType !== undefined
        ? query.appearanceType
        : undefined;
    const genericType =
      Number.isInteger(query.genericType ?? Number.NaN) && query.genericType !== undefined
        ? query.genericType
        : undefined;
    if (appearanceType === undefined && genericType === undefined) {
      return { metadata: {} };
    }

    const baseMetadata: Record<string, string | number | boolean> = {
      areaInstanceRenderSource: "git",
      areaInstanceModelLookupStatus: "blocked",
      ...(appearanceType !== undefined ? { appearanceId: appearanceType, areaInstanceAppearanceType: appearanceType } : {}),
      ...(genericType !== undefined ? { genericType, areaInstanceGenericType: genericType } : {})
    };

    if (subtype === "door") {
      const lookup = await this.repository.resolveDoorAppearanceModel?.({
        appearanceType,
        genericType
      });
      if (!lookup) {
        return { metadata: baseMetadata };
      }
      return {
        metadata: {
          ...baseMetadata,
          areaInstanceModelLookupStatus: lookup.modelResRef ? "ready" : "blocked",
          doorLookupPath: "git-instance-appearance-generic-type>doortypes2da>genericdoors2da>modelAsset",
          doortypes2daAvailable: lookup.doortypesAvailable,
          genericdoors2daAvailable: lookup.genericdoorsAvailable,
          ...(lookup.doortypesSourceKey ? { doortypes2daSource: "doortypes.2da", doortypes2daSourceKey: lookup.doortypesSourceKey } : {}),
          ...(lookup.doortypesRowId !== undefined ? { doortypes2daRow: lookup.doortypesRowId } : {}),
          ...(lookup.doortypesLabel ? { doortypes2daLabel: lookup.doortypesLabel } : {}),
          ...(lookup.doortypesModelResRef ? { doortypes2daModelResRef: lookup.doortypesModelResRef } : {}),
          ...(lookup.genericdoorsSourceKey ? { genericdoors2daSource: "genericdoors.2da", genericdoors2daSourceKey: lookup.genericdoorsSourceKey } : {}),
          ...(lookup.genericdoorsRowId !== undefined ? { genericdoors2daRow: lookup.genericdoorsRowId } : {}),
          ...(lookup.genericdoorsLabel ? { genericdoors2daLabel: lookup.genericdoorsLabel } : {}),
          ...(lookup.genericdoorsModelResRef ? { genericdoors2daModelResRef: lookup.genericdoorsModelResRef } : {}),
          ...(lookup.modelResRef
            ? {
                modelResRef: lookup.modelResRef,
                lookupModelResRef: lookup.modelResRef,
                doorLookupModelResRef: lookup.modelResRef,
                lookupDependencyRefs: dedupeText([template.resref, lookup.modelResRef]).join("|"),
                lookupDependencyCount: dedupeText([template.resref, lookup.modelResRef]).length
              }
            : {})
        }
      };
    }

    if (appearanceType === undefined) {
      return { metadata: baseMetadata };
    }
    const lookup = await this.repository.resolvePlaceableAppearanceModel?.(appearanceType);
    if (!lookup) {
      return { metadata: baseMetadata };
    }
    const dependencyRefs = dedupeText([template.resref, lookup.modelResRef]);
    return {
      metadata: {
        ...baseMetadata,
        areaInstanceModelLookupStatus: "ready",
        sourceKind: "2da",
        source2da: lookup.source2da,
        source2daRow: lookup.rowId,
        ...(lookup.sourceKey ? { source2daSourceKey: lookup.sourceKey } : {}),
        ...(lookup.requestedRowId !== undefined ? { lookupRequestedAppearanceType: lookup.requestedRowId } : {}),
        ...(lookup.resolutionPath ? { lookupResolutionPath: lookup.resolutionPath } : {}),
        modelResRef: lookup.modelResRef,
        lookupModelResRef: lookup.modelResRef,
        lookupTemplateResRef: template.resref,
        lookupDependencyRefs: dependencyRefs.join("|"),
        lookupDependencyCount: dependencyRefs.length
      }
    };
  }

  async getProcessedPlaceable(cacheKey: string) {
    const cached = await this.placeableCache.get<PlaceableProcessingResult>(cacheKey);
    if (!cached) {
      throw new AppException({
        status: 404,
        code: "PLACEABLE_CACHE_NOT_FOUND",
        message: "Placeable cache entry was not found."
      });
    }

    const hydrated = await this.ensurePlaceableManifest(cacheKey, cached.value);

    return {
      cache: {
        key: cacheKey,
        hit: true,
        storedAt: cached.storedAt,
        hits: cached.hits
      },
      placeable: hydrated
    };
  }

  async getProcessedPlaceableAsset(
    cacheKey: string,
    assetId: string
  ): Promise<PlaceableAssetBlobEnvelope> {
    const cached = await this.placeableCache.get<PlaceableProcessingResult>(cacheKey);
    if (!cached) {
      throw new AppException({
        status: 404,
        code: "PLACEABLE_CACHE_NOT_FOUND",
        message: "Placeable cache entry was not found."
      });
    }

    const hydrated = await this.ensurePlaceableManifest(cacheKey, cached.value);
    const normalizedAssetId = assetId.trim().toLowerCase();
    const asset = hydrated.assetManifest.assets.find(
      (entry) => entry.assetId.toLowerCase() === normalizedAssetId
    );
    if (!asset) {
      throw new AppException({
        status: 404,
        code: "PLACEABLE_ASSET_NOT_FOUND",
        message: "Placeable asset was not found in cached manifest."
      });
    }

    const payload = await this.readModuleBlobObject(asset.objectKey);
    if (!payload) {
      throw new AppException({
        status: 404,
        code: "PLACEABLE_ASSET_BLOB_NOT_FOUND",
        message: "Placeable asset blob object was not found."
      });
    }

    return {
      cacheKey,
      asset,
      moduleHash: hydrated.assetManifest.moduleHash,
      payload
    };
  }

  async getProcessedPlaceableAssetDelivery(
    cacheKey: string,
    assetIds?: string[]
  ): Promise<PlaceableAssetDeliveryEnvelope> {
    const cached = await this.placeableCache.get<PlaceableProcessingResult>(cacheKey);
    if (!cached) {
      throw new AppException({
        status: 404,
        code: "PLACEABLE_CACHE_NOT_FOUND",
        message: "Placeable cache entry was not found."
      });
    }

    const hydrated = await this.ensurePlaceableManifest(cacheKey, cached.value);
    const selectedAssets = this.selectAssetsForDelivery(
      hydrated.assetManifest.assets,
      assetIds
    );
    const blobSettings = await this.getBlobStorageSettings();

    return {
      cacheKey,
      moduleHash: hydrated.assetManifest.moduleHash,
      assets: selectedAssets.map((asset) => {
        const deliveryPath = buildPlaceableAssetDeliveryPath(cacheKey, asset);
        return {
          assetId: asset.assetId,
          objectKey: asset.objectKey,
          contentType: asset.contentType,
          sizeBytes: asset.sizeBytes,
          deliveryPath,
          deliveryUrl: deliveryPath,
          s3Url: blobSettings ? buildS3ObjectUrl(blobSettings.bucket, asset.objectKey) : undefined
        };
      })
    };
  }

  async getProcessedPlaceableAssetDeliveryBatch(
    queries: PlaceableAssetDeliveryBatchQuery[]
  ): Promise<PlaceableAssetDeliveryBatchEnvelope> {
    const results: PlaceableAssetDeliveryEnvelope[] = [];
    let cursor = 0;
    const workerCount = Math.min(8, queries.length);

    const runWorker = async () => {
      while (cursor < queries.length) {
        const index = cursor;
        cursor += 1;
        const query = queries[index];
        if (!query) {
          continue;
        }
        results[index] = await this.getProcessedPlaceableAssetDelivery(
          query.cacheKey,
          query.assetIds
        );
      }
    };

    await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
    return { items: results };
  }

  async processCreature(query: TemplateProcessQuery) {
    return this.processTemplateKind("creature", query);
  }

  async getProcessedCreature(cacheKey: string) {
    return this.getProcessedTemplateKind("creature", cacheKey);
  }

  async processItem(query: TemplateProcessQuery) {
    return this.processTemplateKind("item", query);
  }

  async getProcessedItem(cacheKey: string) {
    return this.getProcessedTemplateKind("item", cacheKey);
  }

  async processTemplateKind<TKind extends TemplateProcessingKind>(
    kind: TKind,
    query: TemplateProcessQuery
  ): Promise<TemplateProcessingResultByKind<TKind>> {
    const data = await this.processTemplateByKind(kind, query);
    return this.mapTemplateResultByKind(kind, data);
  }

  async getProcessedTemplateKind<TKind extends TemplateProcessingKind>(
    kind: TKind,
    cacheKey: string
  ): Promise<TemplateProcessingResultByKind<TKind>> {
    const data = await this.getProcessedTemplateByKind(kind, cacheKey);
    return this.mapTemplateResultByKind(kind, data);
  }

  async benchmarkPlaceables(
    query: PlaceableBenchmarkRunQuery
  ): Promise<PlaceableBenchmarkResult> {
    const candidates = await this.resolveBenchmarkCandidates(query.templateIds);
    const perCandidate: Array<{
      templateId: string;
      resref: string;
      placeableSubtype: PlaceableSubtype;
      metrics: BenchmarkDurationSummary;
    }> = [];
    const allDurations: number[] = [];
    const startedAt = new Date().toISOString();

    for (const candidate of candidates) {
      for (let warmup = 0; warmup < query.warmupIterations; warmup += 1) {
        await this.processPlaceable({
          templateId: candidate.templateId,
          subtypeHint: candidate.placeableSubtype,
          bypassCache: true,
          includeBenchmarkMetadata: true
        });
      }

      const durations: number[] = [];
      for (let iteration = 0; iteration < query.iterations; iteration += 1) {
        const started = process.hrtime.bigint();
        await this.processPlaceable({
          templateId: candidate.templateId,
          subtypeHint: candidate.placeableSubtype,
          bypassCache: query.bypassCache,
          includeBenchmarkMetadata: true
        });
        const ended = process.hrtime.bigint();
        const elapsedMs = Number(ended - started) / 1_000_000;
        durations.push(elapsedMs);
        allDurations.push(elapsedMs);
      }

      const candidateSubtype = candidate.placeableSubtype ?? "generic";
      perCandidate.push({
        templateId: candidate.templateId,
        resref: candidate.resref,
        placeableSubtype: candidateSubtype,
        metrics: summarizeDurations(durations)
      });
    }

    const finishedAt = new Date().toISOString();
    return {
      datasetFingerprint: buildBenchmarkFingerprint(candidates, query),
      config: {
        iterations: query.iterations,
        warmupIterations: query.warmupIterations,
        bypassCache: query.bypassCache,
        candidates: candidates.length
      },
      timing: {
        startedAt,
        finishedAt
      },
      metrics: {
        overall: summarizeDurations(allDurations),
        perCandidate
      }
    };
  }

  private withTemplateListPreviewImageUrls(
    kind: TemplateKind,
    result: TemplateListResult
  ): TemplateListResult {
    if (kind !== "placeable") {
      return result;
    }

    return {
      ...result,
      items: result.items.map(withPlaceablePreviewImageUrl)
    };
  }

  private async getPreviewByKind(kind: TemplateKind, templateId: string) {
    const template = await this.repository.findByKindAndId(kind, templateId);
    if (!template) {
      throw new AppException({
        status: 404,
        code: "TEMPLATE_NOT_FOUND",
        message: `${kind} template was not found.`
      });
    }

    return {
      templateId: template.templateId,
      kind: template.kind,
      placeableSubtype: template.placeableSubtype,
      benchmarkCandidate: template.benchmarkCandidate ?? false,
      benchmarkBucket: template.benchmarkBucket,
      resref: template.resref,
      name: template.name,
      category: template.category,
      previewImageUrl:
        template.kind === "placeable"
          ? withPlaceablePreviewImageUrl(template).previewImageUrl
          : template.previewImageUrl,
      metadata: template.metadata
    };
  }

  private async resolvePlaceableTemplate(query: PlaceableProcessQuery) {
    if (query.templateId) {
      const cachedById = this.getTemplateLookupById("placeable", query.templateId);
      if (cachedById) {
        return cachedById;
      }

      const byId = await this.repository.findByKindAndId("placeable", query.templateId);
      if (byId) {
        this.cacheTemplateLookup(byId);
        return byId;
      }
    }

    if (query.resref) {
      const cachedByResref = this.getTemplateLookupByResref("placeable", query.resref);
      if (cachedByResref) {
        return cachedByResref;
      }

      const byResref = await this.repository.findByKindAndResref("placeable", query.resref);
      if (byResref) {
        this.cacheTemplateLookup(byResref);
        return byResref;
      }
    }

    const areaInstanceTemplate = buildAreaInstancePlaceableTemplate(query);
    if (areaInstanceTemplate) {
      this.cacheTemplateLookup(areaInstanceTemplate);
      return areaInstanceTemplate;
    }

    throw new AppException({
      status: 404,
      code: "TEMPLATE_NOT_FOUND",
      message: "placeable template was not found."
    });
  }

  private async resolveBenchmarkCandidates(templateIds?: string[]) {
    if (templateIds && templateIds.length > 0) {
      const resolved = await Promise.all(
        templateIds.map((templateId) =>
          this.repository.findByKindAndId("placeable", templateId)
        )
      );
      const candidates = resolved.filter((value): value is NonNullable<typeof value> =>
        Boolean(value)
      );
      if (candidates.length !== templateIds.length) {
        throw new AppException({
          status: 422,
          code: "VALIDATION_FAILED",
          message:
            "Benchmark payload references unknown placeable template ids."
        });
      }
      return candidates;
    }

    const benchmarkList = await this.repository.listByKind("placeable", {
      benchmark: true,
      limit: 200,
      offset: 0
    });

    if (benchmarkList.items.length === 0) {
      throw new AppException({
        status: 422,
        code: "VALIDATION_FAILED",
        message: "No benchmark placeables are configured."
      });
    }

    return benchmarkList.items;
  }

  private async processTemplateByKind(
    kind: TemplateProcessingKind,
    query: TemplateProcessQuery
  ): Promise<TemplateProcessingEnvelope> {
    const template = await this.resolveTemplateByKind(kind, query);
    const cacheKey =
      this.repository.getPrecomputedTemplateCacheKey?.(kind, template.templateId) ??
      buildTemplateProcessCacheKey(kind, template.templateId, template.resref);

    if (!query.bypassCache) {
      const cached = await this.placeableCache.get<TemplateProcessingResult>(cacheKey);
      if (cached) {
        const hydrated = await this.ensureTemplateProjection(kind, cacheKey, cached.value);
        return {
          cache: {
            key: cacheKey,
            hit: true,
            storedAt: cached.storedAt,
            hits: cached.hits
          },
          value: maybeStripTemplateBenchmarkMetadata(
            hydrated,
            query.includeBenchmarkMetadata
          )
        };
      }
    }

    const processMiss = async (): Promise<TemplateProcessingEnvelope> => {
      const creatureRuntime =
        kind === "creature" ? buildCreatureRuntimeProjection(template.metadata) : undefined;
      const creatureValidationIssues =
        kind === "creature" && creatureRuntime
          ? buildCreatureValidationIssues(creatureRuntime)
          : undefined;
      const itemRuntime =
        kind === "item" ? buildItemRuntimeProjection(template.metadata) : undefined;
      const itemValidationIssues =
        kind === "item" && itemRuntime
          ? buildItemValidationIssues(itemRuntime)
          : undefined;

      const processed: TemplateProcessingResult = {
        templateId: template.templateId,
        kind,
        resref: template.resref,
        name: template.name,
        category: template.category,
        benchmarkCandidate: template.benchmarkCandidate ?? false,
        benchmarkBucket: template.benchmarkBucket,
        metadata: template.metadata,
        render: buildTemplateRenderContract(kind),
        creatureRuntime,
        creatureValidationIssues,
        itemRuntime,
        itemValidationIssues,
        processedAt: new Date().toISOString()
      };

      const stored = await this.placeableCache.set<TemplateProcessingResult>(
        cacheKey,
        processed
      );
      return {
        cache: {
          key: cacheKey,
          hit: false,
          storedAt: stored.storedAt,
          hits: stored.hits
        },
        value: processed
      };
    };

    const result = query.bypassCache
      ? await processMiss()
      : await executeInFlight(
          this.inFlightTemplateProcessing,
          cacheKey,
          processMiss
        );

    return {
      cache: result.cache,
      value: maybeStripTemplateBenchmarkMetadata(
        result.value,
        query.includeBenchmarkMetadata
      )
    };
  }

  private async getProcessedTemplateByKind(
    kind: TemplateProcessingKind,
    cacheKey: string
  ) {
    const cached = await this.placeableCache.get<TemplateProcessingResult>(cacheKey);
    if (!cached) {
      throw new AppException({
        status: 404,
        code: `${kind.toUpperCase()}_CACHE_NOT_FOUND`,
        message: `${kind} cache entry was not found.`
      });
    }

    const hydrated = await this.ensureTemplateProjection(kind, cacheKey, cached.value);

    return {
      cache: {
        key: cacheKey,
        hit: true,
        storedAt: cached.storedAt,
        hits: cached.hits
      },
      value: hydrated
    };
  }

  private async resolveTemplateByKind(kind: TemplateProcessingKind, query: TemplateProcessQuery) {
    if (query.templateId) {
      const cachedById = this.getTemplateLookupById(kind, query.templateId);
      if (cachedById) {
        return cachedById;
      }

      const byId = await this.repository.findByKindAndId(kind, query.templateId);
      if (byId) {
        this.cacheTemplateLookup(byId);
        return byId;
      }
    }

    if (query.resref) {
      const cachedByResref = this.getTemplateLookupByResref(kind, query.resref);
      if (cachedByResref) {
        return cachedByResref;
      }

      const byResref = await this.repository.findByKindAndResref(kind, query.resref);
      if (byResref) {
        this.cacheTemplateLookup(byResref);
        return byResref;
      }
    }

    throw new AppException({
      status: 404,
      code: "TEMPLATE_NOT_FOUND",
      message: `${kind} template was not found.`
    });
  }

  private async ensurePlaceableManifest(
    cacheKey: string,
    value: PlaceableProcessingResult
  ): Promise<PlaceableProcessingResult> {
    const withProjection = await this.ensurePlaceableProjection(cacheKey, value);
    const hasManifest = withProjection.assetManifest?.version === "placeable-asset-manifest/v1";
    if (!hasManifest) {
      const manifest = await this.buildPlaceableAssetManifest({
        templateId: withProjection.templateId,
        resref: withProjection.resref,
        subtype: withProjection.placeableSubtype,
        metadata: withProjection.metadata
      });

      const refreshed: PlaceableProcessingResult = {
        ...withProjection,
        assetManifest: manifest,
        renderPackage: await this.buildPlaceableRenderPackageForCacheEntry(
          cacheKey,
          manifest,
          withProjection.placeableSubtype
        )
      };
      await this.placeableCache.set<PlaceableProcessingResult>(cacheKey, refreshed);
      this.rememberManifestValidation(cacheKey, manifest.moduleHash);
      return refreshed;
    }

    const manifestModuleHash = withProjection.assetManifest.moduleHash;
    if (this.isManifestValidationFresh(cacheKey, manifestModuleHash)) {
      return this.ensureRenderPackageDeliveryPaths(cacheKey, withProjection);
    }

    if (this.appConfig?.isTest && !this.appConfig.enableBlobAssetLookupInTest) {
      this.rememberManifestValidation(cacheKey, manifestModuleHash);
      return this.ensureRenderPackageDeliveryPaths(cacheKey, withProjection);
    }

    const hasEmptyPlaceholderManifest =
      Boolean(this.runtimeSettingsRepository && this.moduleBlobStorage) &&
      !manifestModuleHash &&
      withProjection.assetManifest.assetCount === 0 &&
      withProjection.assetManifest.candidatesScanned === 0 &&
      withProjection.assetManifest.assets.length === 0;
    if (hasEmptyPlaceholderManifest) {
      const manifest = await this.buildPlaceableAssetManifest({
        templateId: withProjection.templateId,
        resref: withProjection.resref,
        subtype: withProjection.placeableSubtype,
        metadata: withProjection.metadata
      });

      const refreshed: PlaceableProcessingResult = {
        ...withProjection,
        assetManifest: manifest,
        renderPackage: await this.buildPlaceableRenderPackageForCacheEntry(
          cacheKey,
          manifest,
          withProjection.placeableSubtype
        )
      };
      await this.placeableCache.set<PlaceableProcessingResult>(cacheKey, refreshed);
      this.rememberManifestValidation(cacheKey, manifest.moduleHash);
      return refreshed;
    }

    const shouldRefreshForLegacyModelRoleRecovery =
      this.shouldRefreshManifestForLegacyModelRoleRecovery(withProjection);
    if (shouldRefreshForLegacyModelRoleRecovery) {
      const manifest = await this.buildPlaceableAssetManifest({
        templateId: withProjection.templateId,
        resref: withProjection.resref,
        subtype: withProjection.placeableSubtype,
        metadata: withProjection.metadata
      });

      const refreshed: PlaceableProcessingResult = {
        ...withProjection,
        assetManifest: manifest,
        renderPackage: await this.buildPlaceableRenderPackageForCacheEntry(
          cacheKey,
          manifest,
          withProjection.placeableSubtype
        )
      };
      await this.placeableCache.set<PlaceableProcessingResult>(cacheKey, refreshed);
      this.rememberManifestValidation(cacheKey, manifest.moduleHash);
      return refreshed;
    }

    const shouldRefreshForVfxChunkModelRecovery =
      this.shouldRefreshManifestForVfxChunkModelRecovery(withProjection);
    if (shouldRefreshForVfxChunkModelRecovery) {
      const manifest = await this.buildPlaceableAssetManifest({
        templateId: withProjection.templateId,
        resref: withProjection.resref,
        subtype: withProjection.placeableSubtype,
        metadata: withProjection.metadata
      });

      const refreshed: PlaceableProcessingResult = {
        ...withProjection,
        assetManifest: manifest,
        renderPackage: await this.buildPlaceableRenderPackageForCacheEntry(
          cacheKey,
          manifest,
          withProjection.placeableSubtype
        )
      };
      await this.placeableCache.set<PlaceableProcessingResult>(cacheKey, refreshed);
      this.rememberManifestValidation(cacheKey, manifest.moduleHash);
      return refreshed;
    }

    const shouldRefreshForTextureRecovery =
      await this.shouldRefreshManifestForTextureRecovery(withProjection);
    if (shouldRefreshForTextureRecovery) {
      const manifest = await this.buildPlaceableAssetManifest({
        templateId: withProjection.templateId,
        resref: withProjection.resref,
        subtype: withProjection.placeableSubtype,
        metadata: withProjection.metadata
      });

      const refreshed: PlaceableProcessingResult = {
        ...withProjection,
        assetManifest: manifest,
        renderPackage: await this.buildPlaceableRenderPackageForCacheEntry(
          cacheKey,
          manifest,
          withProjection.placeableSubtype
        )
      };
      await this.placeableCache.set<PlaceableProcessingResult>(cacheKey, refreshed);
      this.rememberManifestValidation(cacheKey, manifest.moduleHash);
      return refreshed;
    }

    const currentModuleHash = await this.getCurrentModuleHash();
    const shouldRefreshManifest =
      typeof currentModuleHash === "string" &&
        currentModuleHash.length > 0 &&
        manifestModuleHash !== currentModuleHash;

    if (!shouldRefreshManifest) {
      this.rememberManifestValidation(cacheKey, manifestModuleHash);
      return this.ensureRenderPackageDeliveryPaths(cacheKey, withProjection);
    }

    const manifest = await this.buildPlaceableAssetManifest({
      templateId: withProjection.templateId,
      resref: withProjection.resref,
      subtype: withProjection.placeableSubtype,
      metadata: withProjection.metadata
    });

    const refreshed: PlaceableProcessingResult = {
      ...withProjection,
      assetManifest: manifest,
      renderPackage: await this.buildPlaceableRenderPackageForCacheEntry(
        cacheKey,
        manifest,
        withProjection.placeableSubtype
      )
    };
    await this.placeableCache.set<PlaceableProcessingResult>(cacheKey, refreshed);
    this.rememberManifestValidation(cacheKey, manifest.moduleHash);
    return refreshed;
  }

  private shouldRefreshManifestForLegacyModelRoleRecovery(
    value: PlaceableProcessingResult
  ): boolean {
    const assets = value.assetManifest?.assets ?? [];
    const hasLegacySourceModel = assets.some(
      (asset) => asset.role === "unknown" && isAuroraSourceModelAssetEntry(asset)
    );
    if (!hasLegacySourceModel) {
      return false;
    }

    const renderPackage = value.renderPackage;
    return (
      !renderPackage ||
      renderPackage.status === "unsupported" ||
      (renderPackage.assetRefs.modelAssetIds?.length ?? 0) === 0
    );
  }

  private shouldRefreshManifestForVfxChunkModelRecovery(
    value: PlaceableProcessingResult
  ): boolean {
    if (value.placeableSubtype !== "vfx") {
      return false;
    }
    const emitters = value.renderPackage?.auroraEmitter?.emitters ?? [];
    const hasChunkName = emitters.some((emitter) =>
      Boolean(normalizeAuroraModelResourceReference(emitter.chunkName))
    );
    if (!hasChunkName) {
      return false;
    }
    const hasResolvedChunkModel = emitters.some(
      (emitter) =>
        typeof emitter.chunkModelAssetId === "string" &&
        emitter.chunkModelAssetId.trim().length > 0
    );
    if (hasResolvedChunkModel) {
      return false;
    }
    return (value.renderPackage?.diagnostics ?? []).some(
      (diagnostic) =>
        diagnostic.code === "VFX_CHUNK_MODEL_MISSING" ||
        diagnostic.code === "VFX_CHUNK_MODEL_DERIVED_MISSING" ||
        diagnostic.code === "VFX_CHUNK_MODEL_RESOLVER_REQUIRED"
    );
  }

  private async shouldRefreshManifestForTextureRecovery(
    value: PlaceableProcessingResult
  ): Promise<boolean> {
    const renderStatus = value.renderPackage?.status;
    if (renderStatus !== "ready" && renderStatus !== "missing_derived") {
      return false;
    }

    const assets = value.assetManifest?.assets ?? [];
    const hasTextureAsset = assets.some((asset) => asset.role === "texture");
    if (hasTextureAsset) {
      return false;
    }

    const referencedTextures = deduplicateOrdered([
      ...(await this.collectTextureReferencesFromDerivedModels(assets)),
      ...(await this.collectTextureReferencesFromSourceModels(assets))
    ]);
    return referencedTextures.length > 0;
  }

  private async ensurePlaceableProjection(
    cacheKey: string,
    value: PlaceableProcessingResult
  ): Promise<PlaceableProcessingResult> {
    if (
      value.placeableRuntime &&
      value.placeableValidationIssues &&
      value.renderPackage
    ) {
      return this.ensureRenderPackageDeliveryPaths(cacheKey, value);
    }

    const placeableRuntime = value.placeableRuntime ?? buildPlaceableRuntimeProjection(value.metadata);
    const placeableValidationIssues =
      value.placeableValidationIssues ?? buildPlaceableValidationIssues(placeableRuntime);
    const assetManifest = value.assetManifest ?? buildEmptyPlaceableAssetManifest();
    const renderPackage = await this.buildPlaceableRenderPackageForCacheEntry(
      cacheKey,
      assetManifest,
      value.placeableSubtype
    );

    const refreshed: PlaceableProcessingResult = {
      ...value,
      assetManifest,
      placeableRuntime,
      placeableValidationIssues,
      renderPackage
    };
    return refreshed;
  }

  private async buildPlaceableRenderPackageForCacheEntry(
    cacheKey: string,
    assetManifest: PlaceableAssetManifest,
    subtype?: PlaceableSubtype
  ): Promise<PlaceableRenderPackage> {
    const renderPackage = this.decorateVfxRenderPackageDiagnostics(
      buildRenderPackageFromManifest(assetManifest),
      subtype
    );
    const deliveryPackage = this.decorateRenderPackageWithDeliveryPaths(
      cacheKey,
      assetManifest,
      renderPackage
    );
    const materialRenderPackage = await this.decorateRenderPackageWithAuroraMaterial(
      assetManifest,
      deliveryPackage,
      subtype
    );
    const emitterRenderPackage = await this.decorateRenderPackageWithAuroraEmitter(
      assetManifest,
      materialRenderPackage,
      subtype
    );
    return this.decorateRenderPackageWithAuroraLight(
      assetManifest,
      emitterRenderPackage,
      subtype
    );
  }

  private decorateVfxRenderPackageDiagnostics(
    renderPackage: PlaceableRenderPackage,
    subtype?: PlaceableSubtype
  ): PlaceableRenderPackage {
    if (subtype !== "vfx") {
      return renderPackage;
    }

    const diagnostics = [...renderPackage.diagnostics];
    const addDiagnostic = (diagnostic: PlaceableRenderPackage["diagnostics"][number]) => {
      if (diagnostics.some((entry) => entry.code === diagnostic.code)) {
        return;
      }
      diagnostics.push(diagnostic);
    };

    addDiagnostic({
      code: "VFX_PLACEABLE_KIND_NOT_EFFECTVISUALEFFECT",
      severity: "warn",
      message:
        "Placeable VFX is catalog/source-list data; it is not an EffectVisualEffect instance."
    });

    if ((renderPackage.assetRefs.derivedModelAssetIds?.length ?? 0) > 0) {
      addDiagnostic({
        code: "VFX_PROJECT_RENDER_PACKAGE_NOT_RUNTIME_PARITY",
        severity: "warn",
        message:
          "Derived model delivery is preview provenance only; Aurora VFX phase scheduling is not mapped yet."
      });
    }

    return {
      ...renderPackage,
      diagnostics
    };
  }

  private async ensureRenderPackageDeliveryPaths(
    cacheKey: string,
    value: PlaceableProcessingResult
  ): Promise<PlaceableProcessingResult> {
    if (!value.renderPackage) {
      return value;
    }

    const deliveryPackage = this.decorateRenderPackageWithDeliveryPaths(
      cacheKey,
      value.assetManifest,
      this.decorateVfxRenderPackageDiagnostics(value.renderPackage, value.placeableSubtype)
    );
    const materialRenderPackage = await this.decorateRenderPackageWithAuroraMaterial(
      value.assetManifest,
      deliveryPackage,
      value.placeableSubtype
    );
    const emitterRenderPackage = await this.decorateRenderPackageWithAuroraEmitter(
      value.assetManifest,
      materialRenderPackage,
      value.placeableSubtype
    );
    const renderPackage = await this.decorateRenderPackageWithAuroraLight(
      value.assetManifest,
      emitterRenderPackage,
      value.placeableSubtype
    );
    return {
      ...value,
      renderPackage
    };
  }

  private async decorateRenderPackageWithAuroraMaterial(
    assetManifest: PlaceableAssetManifest,
    renderPackage: PlaceableRenderPackage,
    subtype?: PlaceableSubtype
  ): Promise<PlaceableRenderPackage> {
    if (subtype !== "vfx" || renderPackage.auroraMaterial) {
      return renderPackage;
    }

    const auroraMaterial = await this.collectAuroraMaterialPayloadFromMaterialAssets(
      assetManifest.assets
    );
    if (!auroraMaterial) {
      return renderPackage;
    }

    return {
      ...renderPackage,
      diagnostics: mergeRenderPackageDiagnostics(renderPackage.diagnostics, [
        {
          code: "VFX_AURORA_MTR_MATERIAL_STATE_PRESERVED",
          severity: "warn",
          message:
            "Aurora MTR blending/decal source state was parsed and attached for diagnostics; runtime shader parity remains non-canonical."
        }
      ]),
      auroraMaterial
    };
  }

  private async collectAuroraMaterialPayloadFromMaterialAssets(
    assets: PlaceableAssetEntry[]
  ): Promise<PlaceableRenderPackage["auroraMaterial"] | undefined> {
    const materialAssets = assets.filter((asset) => asset.role === "material");
    if (materialAssets.length === 0) {
      return undefined;
    }

    const materials: NonNullable<PlaceableRenderPackage["auroraMaterial"]>["materials"] =
      [];
    const diagnostics: PlaceableRenderPackage["diagnostics"] = [];
    for (const asset of materialAssets) {
      let payload: ModuleBlobObjectPayload | null = null;
      try {
        payload = await this.readModuleBlobObject(asset.objectKey);
      } catch {
        payload = null;
      }
      if (!payload || payload.bytes.length === 0) {
        diagnostics.push({
          code: "VFX_AURORA_MTR_SOURCE_UNREADABLE",
          severity: "warn",
          message: `Material ${asset.fileName} could not be read for Aurora MTR state parsing.`
        });
        continue;
      }

      const state = collectAuroraMaterialState(payload.bytes);
      if (!state) {
        continue;
      }
      materials.push({
        source: "aurora-mtr",
        materialAssetId: asset.assetId,
        materialFileName: asset.fileName,
        materialObjectKey: asset.objectKey,
        state
      });
    }

    if (materials.length === 0) {
      return undefined;
    }

    return {
      source: "mtr",
      materials,
      diagnostics
    };
  }

  private async decorateRenderPackageWithAuroraEmitter(
    assetManifest: PlaceableAssetManifest,
    renderPackage: PlaceableRenderPackage,
    subtype?: PlaceableSubtype
  ): Promise<PlaceableRenderPackage> {
    if (subtype !== "vfx") {
      return renderPackage;
    }

    if (renderPackage.auroraEmitter) {
      const chunkBindingResult = bindAuroraEmitterChunkModelAssets(
        assetManifest,
        renderPackage.auroraEmitter
      );

      return promoteAuroraEmitterRenderPackage({
        ...renderPackage,
        assetRefs: {
          ...renderPackage.assetRefs,
          ...(chunkBindingResult.chunkModelAssetIds.length > 0
            ? {
                chunkModelAssetIds: chunkBindingResult.chunkModelAssetIds
              }
            : {})
        },
        diagnostics: mergeRenderPackageDiagnostics(renderPackage.diagnostics, [
          {
            code: "VFX_AURORA_MDL_EMITTER_PAYLOAD_READY",
            severity: "warn",
            message:
              "Source MDL emitter nodes were parsed and attached to the render package."
          },
          {
            code: "VFX_AURORA_MDL_EMITTER_PREVIEW_NON_CANONICAL",
            severity: "warn",
            message:
              "Source MDL emitter payload is preview-only; canonical VFX runtime still requires source rows and effect-instance context."
          },
          ...chunkBindingResult.diagnostics
        ]),
        auroraEmitter: chunkBindingResult.auroraEmitter
      });
    }

    const auroraEmitter = await this.collectAuroraEmitterPayloadFromSourceModels(
      assetManifest.assets
    );
    if (!auroraEmitter) {
      return renderPackage.auroraEmitter ? renderPackage : {
        ...renderPackage,
        diagnostics: mergeRenderPackageDiagnostics(renderPackage.diagnostics, [
          {
            code: "VFX_AURORA_MDL_EMITTER_PAYLOAD_MISSING",
            severity: "warn",
            message:
              "No source MDL emitter node could be parsed for this VFX placeable."
          }
        ])
      };
    }

    const chunkBindingResult = bindAuroraEmitterChunkModelAssets(
      assetManifest,
      auroraEmitter
    );

    return promoteAuroraEmitterRenderPackage({
      ...renderPackage,
      assetRefs: {
        ...renderPackage.assetRefs,
        ...(chunkBindingResult.chunkModelAssetIds.length > 0
          ? {
              chunkModelAssetIds: chunkBindingResult.chunkModelAssetIds
            }
          : {})
      },
      diagnostics: mergeRenderPackageDiagnostics(renderPackage.diagnostics, [
        {
          code: "VFX_AURORA_MDL_EMITTER_PAYLOAD_READY",
          severity: "warn",
          message:
            "Source MDL emitter nodes were parsed and attached to the render package."
        },
        {
          code: "VFX_AURORA_MDL_EMITTER_PREVIEW_NON_CANONICAL",
          severity: "warn",
          message:
            "Source MDL emitter payload is preview-only; canonical VFX runtime still requires source rows and effect-instance context."
        },
        ...chunkBindingResult.diagnostics
      ]),
      auroraEmitter: chunkBindingResult.auroraEmitter
    });
  }

  private async collectAuroraEmitterPayloadFromSourceModels(
    assets: PlaceableAssetEntry[]
  ): Promise<PlaceableRenderPackage["auroraEmitter"] | undefined> {
    const sourceModelAssets = selectAuroraEmitterSourceModelAssets(
      assets.filter(isAuroraSourceModelAssetEntry)
    );
    if (sourceModelAssets.length === 0) {
      return undefined;
    }

    const emitters: NonNullable<PlaceableRenderPackage["auroraEmitter"]>["emitters"] = [];
    const diagnostics: PlaceableRenderPackage["diagnostics"] = [];

    for (const asset of sourceModelAssets) {
      let payload: ModuleBlobObjectPayload | null = null;
      try {
        payload = await this.readModuleBlobObject(asset.objectKey);
      } catch {
        payload = null;
      }
      if (!payload || payload.bytes.length === 0) {
        diagnostics.push({
          code: "VFX_AURORA_MDL_SOURCE_UNREADABLE",
          severity: "warn",
          message: `Source model ${asset.fileName} could not be read for emitter parsing.`
        });
        continue;
      }

      const parsed = collectAuroraSourceModelEmitters(payload.bytes, {
        sourceModelObjectKey: asset.objectKey,
        sourceModelFileName: asset.fileName,
        sourceModelHash: asset.etag
      });
      for (const emitter of parsed.emitters) {
        emitters.push({
          source: parsed.source,
          sourceModelAssetId: asset.assetId,
          sourceModelFileName: asset.fileName,
          sourceModelObjectKey: asset.objectKey,
          nodeName: emitter.nodeName,
          texture: emitter.texture,
          chunkName: emitter.chunkName,
          emitterType: emitter.emitterType,
          renderMode: emitter.renderMode,
          blendMode: emitter.blendMode,
          atlas: emitter.atlas,
          simulation: emitter.simulation,
          transform: emitter.transform,
          referenceNodes: emitter.referenceNodes,
          events: emitter.events,
          animations: emitter.animations,
          sourceState: emitter.sourceState
        });
      }
    }

    if (emitters.length === 0) {
      return undefined;
    }

    return {
      source: "source-mdl",
      emitters,
      diagnostics
    };
  }

  private async decorateRenderPackageWithAuroraLight(
    assetManifest: PlaceableAssetManifest,
    renderPackage: PlaceableRenderPackage,
    subtype?: PlaceableSubtype
  ): Promise<PlaceableRenderPackage> {
    if (subtype !== "vfx") {
      return renderPackage;
    }
    if (renderPackage.auroraLight) {
      return promoteAuroraLightRenderPackage(renderPackage);
    }
    const hasEmitterPayload =
      renderPackage.auroraEmitter?.emitters.some((emitter) =>
        Boolean(
          emitter.renderMode ||
            emitter.emitterType ||
            emitter.texture ||
            emitter.chunkName ||
            emitter.simulation
        )
      ) === true;
    if (hasEmitterPayload) {
      return renderPackage;
    }

    const auroraLight = await this.collectAuroraLightPayloadFromSourceModels(
      assetManifest.assets
    );
    if (!auroraLight) {
      return renderPackage;
    }

    return promoteAuroraLightRenderPackage({
      ...renderPackage,
      diagnostics: mergeRenderPackageDiagnostics(renderPackage.diagnostics, [
        {
          code: "VFX_AURORA_MDL_LIGHT_PAYLOAD_READY",
          severity: "warn",
          message:
            "Source MDL light nodes were parsed and attached to the render package."
        },
        {
          code: "VFX_AURORA_MDL_LIGHT_PREVIEW_NON_CANONICAL",
          severity: "warn",
          message:
            "Source MDL light-node payload is preview-only; canonical VFX runtime still requires source rows and effect-instance context."
        }
      ]),
      auroraLight
    });
  }

  private async collectAuroraLightPayloadFromSourceModels(
    assets: PlaceableAssetEntry[]
  ): Promise<PlaceableRenderPackage["auroraLight"] | undefined> {
    const sourceModelAssets = selectAuroraEmitterSourceModelAssets(
      assets.filter(isAuroraSourceModelAssetEntry)
    );
    if (sourceModelAssets.length === 0) {
      return undefined;
    }

    const lights: NonNullable<PlaceableRenderPackage["auroraLight"]>["lights"] = [];
    const diagnostics: PlaceableRenderPackage["diagnostics"] = [];

    for (const asset of sourceModelAssets) {
      let payload: ModuleBlobObjectPayload | null = null;
      try {
        payload = await this.readModuleBlobObject(asset.objectKey);
      } catch {
        payload = null;
      }
      if (!payload || payload.bytes.length === 0) {
        diagnostics.push({
          code: "VFX_AURORA_MDL_SOURCE_UNREADABLE",
          severity: "warn",
          message: `Source model ${asset.fileName} could not be read for light-node parsing.`
        });
        continue;
      }

      const parsed = collectAuroraSourceModelLights(payload.bytes, {
        sourceModelObjectKey: asset.objectKey,
        sourceModelFileName: asset.fileName,
        sourceModelHash: asset.etag
      });
      for (const light of parsed.lights) {
        lights.push({
          source: parsed.source,
          sourceModelAssetId: asset.assetId,
          sourceModelFileName: asset.fileName,
          sourceModelObjectKey: asset.objectKey,
          nodeName: light.nodeName,
          ...(light.parentNodeName ? { parentNodeName: light.parentNodeName } : {}),
          ...(light.transform ? { transform: light.transform } : {}),
          ...(light.radius !== undefined ? { radius: light.radius } : {}),
          ...(light.multiplier !== undefined ? { multiplier: light.multiplier } : {}),
          ...(light.color ? { color: light.color } : {}),
          ...(light.ambientOnly !== undefined ? { ambientOnly: light.ambientOnly } : {}),
          ...(light.dynamicType !== undefined ? { dynamicType: light.dynamicType } : {}),
          ...(light.affectDynamic !== undefined ? { affectDynamic: light.affectDynamic } : {}),
          ...(light.shadow !== undefined ? { shadow: light.shadow } : {}),
          ...(light.lightPriority !== undefined ? { lightPriority: light.lightPriority } : {}),
          ...(light.lensFlares !== undefined ? { lensFlares: light.lensFlares } : {}),
          ...(light.fadingLight !== undefined ? { fadingLight: light.fadingLight } : {}),
          ...(light.animations && light.animations.length > 0
            ? { animations: light.animations }
            : {})
        });
      }
    }

    if (lights.length === 0) {
      return undefined;
    }

    return {
      source: "source-mdl",
      lights,
      diagnostics
    };
  }

  private decorateRenderPackageWithDeliveryPaths(
    cacheKey: string,
    assetManifest: PlaceableAssetManifest,
    renderPackage: PlaceableRenderPackage
  ): PlaceableRenderPackage {
    const assetById = new Map(assetManifest.assets.map((asset) => [asset.assetId, asset]));
    let glbUrl = renderPackage.glbUrl;
    let modelUrl = renderPackage.modelUrl;

    if (renderPackage.status === "ready") {
      const derivedModelAssets = (renderPackage.assetRefs.derivedModelAssetIds ?? [])
        .map((assetId) => assetById.get(assetId))
        .filter((asset): asset is PlaceableAssetEntry => Boolean(asset));
      const derivedModelAsset =
        derivedModelAssets.find((asset) => asset.extension.toLowerCase() === "glb") ??
        derivedModelAssets.find((asset) => asset.extension.toLowerCase() === "gltf");
      if (derivedModelAsset) {
        const extension = derivedModelAsset.extension.toLowerCase();
        const deliveryPath = buildPlaceableAssetDeliveryPath(cacheKey, derivedModelAsset);
        if (extension === "glb") {
          glbUrl = deliveryPath;
        } else if (extension === "gltf") {
          modelUrl = deliveryPath;
        }
      }
    }

    const textureUrls = renderPackage.assetRefs.textureAssetIds
      ?.map((assetId) => {
        const asset = assetById.get(assetId);
        return asset ? buildPlaceableAssetDeliveryPath(cacheKey, asset) : null;
      })
      .filter((deliveryPath): deliveryPath is string => Boolean(deliveryPath));

    return {
      ...renderPackage,
      glbUrl,
      modelUrl,
      textureUrls: textureUrls && textureUrls.length > 0 ? textureUrls : undefined
    };
  }

  private async buildPlaceableAssetManifest(input: {
    templateId: string;
    resref: string;
    subtype: PlaceableSubtype;
    metadata: Record<string, string | number | boolean>;
    processingOptions?: PlaceableProcessingOptions;
  }): Promise<PlaceableAssetManifest> {
    if (this.appConfig?.isTest && !this.appConfig.enableBlobAssetLookupInTest) {
      return buildEmptyPlaceableAssetManifest();
    }

    const index = await this.getModuleSnapshotIndex();
    if (!index) {
      return buildEmptyPlaceableAssetManifest();
    }

    const sourcePriority = await this.getPlaceableAssetSourcePriority();
    const lookupInput = {
      ...input,
      ...(sourcePriority ? { sourcePriority } : {})
    };
    const collectedAssets = collectPlaceableAssetsFromSnapshot(index, lookupInput);
    const initialAssets =
      input.subtype === "vfx"
        ? collectedAssets.filter((asset) => !isDerivedModelAssetEntry(asset))
        : collectedAssets;
    const assetsWithOnDemandModels =
      await this.ensureOnDemandPlaceableSourceModelAssets(input, initialAssets);
    const assetsWithDerived =
      input.subtype === "vfx"
        ? assetsWithOnDemandModels
        : await this.ensureDerivedPlaceableModelAssets(
            input,
            assetsWithOnDemandModels,
            input.processingOptions
          );
    const derivedTextureReferences =
      await this.collectTextureReferencesFromDerivedModels(assetsWithDerived);
    const sourceModelChunkReferences =
      input.processingOptions?.allowExpensiveSourceReferenceScans === false
        ? []
        : await this.collectChunkModelReferencesFromSourceModels(assetsWithDerived);
    const assetsWithChunkModels =
      sourceModelChunkReferences.length > 0
        ? dedupePlaceableAssets([
            ...collectPlaceableAssetsFromSnapshot(index, {
              ...lookupInput,
              metadata: {
                ...input.metadata,
                chunkModelReferences: sourceModelChunkReferences.join("|")
              }
            }).filter(isAuroraSourceModelAssetEntry),
            ...assetsWithDerived
          ])
        : assetsWithDerived;
    const assetsWithOnDemandChunkModels =
      await this.ensureOnDemandPlaceableChunkModelAssets(
        sourceModelChunkReferences,
        assetsWithChunkModels
      );
    const assetsWithDerivedChunkModels =
      await this.ensureDerivedPlaceableChunkModelAssets(
        sourceModelChunkReferences,
        assetsWithOnDemandChunkModels
      );
    const derivedChunkTextureReferences =
      assetsWithDerivedChunkModels === assetsWithDerived
        ? derivedTextureReferences
        : await this.collectTextureReferencesFromDerivedModels(assetsWithDerivedChunkModels);
    const shouldScanSourceModelTextureReferences =
      input.processingOptions?.allowExpensiveSourceReferenceScans !== false ||
      (derivedTextureReferences.length === 0 &&
        derivedChunkTextureReferences.length === 0);
    const sourceModelTextureReferences = shouldScanSourceModelTextureReferences
      ? await this.collectTextureReferencesFromSourceModels(assetsWithDerivedChunkModels)
      : [];
    const initialTextureReferences = deduplicateOrdered([
      ...derivedTextureReferences,
      ...derivedChunkTextureReferences,
      ...sourceModelTextureReferences
    ]);
    const assetsWithReferencedMaterials =
      initialTextureReferences.length > 0
        ? dedupePlaceableAssets([
            ...collectPlaceableAssetsFromSnapshot(index, {
              ...lookupInput,
              metadata: {
                ...input.metadata,
                modelTextureReferences: initialTextureReferences.join("|")
              }
            }),
            ...assetsWithDerivedChunkModels
          ])
        : assetsWithDerivedChunkModels;
    const assetsWithOnDemandMaterials =
      input.processingOptions?.allowOnDemandTextureLookup === false
        ? assetsWithReferencedMaterials
        : await this.ensureOnDemandPlaceableMaterialAssets(
            initialTextureReferences,
            assetsWithReferencedMaterials
          );
    const materialTextureReferences =
      await this.collectTextureReferencesFromMaterialAssets(assetsWithOnDemandMaterials);
    const combinedTextureReferences = deduplicateOrdered([
      ...initialTextureReferences,
      ...materialTextureReferences
    ]);
    const materialBasenames = new Set(
      assetsWithOnDemandMaterials
        .filter((asset) => asset.role === "material" && asset.extension === "mtr")
        .map((asset) => extractBasename(asset.fileName))
    );
    const textureReferences = combinedTextureReferences.filter(
      (reference) => !materialBasenames.has(reference)
    );
    const assetsWithSnapshotTextures =
      textureReferences.length > 0
        ? dedupePlaceableAssets([
            ...collectPlaceableAssetsFromSnapshot(index, {
              ...lookupInput,
              metadata: {
                ...input.metadata,
                modelTextureReferences: textureReferences.join("|")
              }
            }),
            ...assetsWithOnDemandMaterials
          ])
        : assetsWithOnDemandMaterials;
    const assetsWithOnDemandTextures =
      input.processingOptions?.allowOnDemandTextureLookup === false
        ? assetsWithSnapshotTextures
        : await this.ensureOnDemandPlaceableTextureAssets(
            textureReferences,
            assetsWithSnapshotTextures
          );
    let uniqueAssets = dedupePlaceableAssets(assetsWithOnDemandTextures);

    // Safety net: if no texture assets were produced, force one more pass using
    // material references discovered from the finalized asset set.
    if (!uniqueAssets.some((asset) => asset.role === "texture")) {
      const fallbackTextureReferences =
        await this.collectTextureReferencesFromMaterialAssets(uniqueAssets);
      if (fallbackTextureReferences.length > 0) {
        if (input.processingOptions?.allowOnDemandTextureLookup !== false) {
          const withFallbackOnDemandTextures =
            await this.ensureOnDemandPlaceableTextureAssets(
              fallbackTextureReferences,
              uniqueAssets
            );
          uniqueAssets = dedupePlaceableAssets(withFallbackOnDemandTextures);
        }
      }
    }
    if (input.subtype === "vfx") {
      const chunkModelBasenames = new Set(sourceModelChunkReferences.map(extractBasename));
      uniqueAssets = uniqueAssets.filter(
        (asset) =>
          !isDerivedModelAssetEntry(asset) || chunkModelBasenames.has(extractBasename(asset.fileName))
      );
    }

    return {
      version: "placeable-asset-manifest/v1",
      source: "module-blob-snapshot",
      generatedAt: new Date().toISOString(),
      moduleHash: index.moduleHash,
      assetCount: uniqueAssets.length,
      candidatesScanned: index.candidatesScanned,
      assets: uniqueAssets
    };
  }

  private async ensureDerivedPlaceableModelAssets(
    input: {
      templateId: string;
      resref: string;
      metadata: Record<string, string | number | boolean>;
    },
    assets: PlaceableAssetEntry[],
    options: PlaceableProcessingOptions = {}
  ): Promise<PlaceableAssetEntry[]> {
    if (
      !this.derivedAssetGenerator ||
      !this.moduleBlobStorage?.putModuleObject ||
      assets.some(isDerivedModelAssetEntry)
    ) {
      return assets;
    }

    const sourceModelAssets = selectSourceModelAssetsForDerived(input, assets);
    if (sourceModelAssets.length === 0) {
      return assets;
    }

    if (options.allowOnDemandDerivedModelGeneration === false) {
      return assets;
    }

    const settings = await this.runtimeSettingsRepository?.get();
    if (!settings) {
      return assets;
    }

    const sourceFiles: Array<{ asset: PlaceableAssetEntry; bytes: Buffer }> = [];
    for (const asset of sourceModelAssets) {
      const payload = await this.readModuleBlobObject(asset.objectKey);
      if (!payload || payload.bytes.length === 0) {
        continue;
      }
      sourceFiles.push({ asset, bytes: payload.bytes });
    }

    if (sourceFiles.length === 0) {
      return assets;
    }

    const generationKey = buildPlaceableDerivedGenerationKey(sourceFiles);
    const generation = await executeInFlight(
      this.inFlightDerivedPlaceableModelAssets,
      generationKey,
      async (): Promise<DerivedPlaceableModelGenerationResult> => {
        const generated = await this.derivedAssetGenerator!.generateDerivedAssets({
          settingsRevision: settings.revision,
          modulePrefix: settings.blobStorage.modulePrefix,
          sourceFiles: sourceFiles.map(({ asset, bytes }) => ({
            fileName: asset.objectKey,
            resourceType: 0,
            bytes
          }))
        });

        if (generated.files.length === 0) {
          return {
            derivedAssets: [],
            noRenderableGeometry: isNoRenderableGeometryDerivedFailure(
              generated.summary.failureReasons
            )
          };
        }

        const derivedAssets: PlaceableAssetEntry[] = [];
        for (const file of generated.files) {
          const stored = await this.moduleBlobStorage!.putModuleObject!(
            settings.blobStorage,
            file
          );
          const fileName = extractFileName(stored.key);
          const extension = extractExtension(fileName);
          derivedAssets.push({
            assetId: buildAssetId(stored.key, stored.etag, stored.size),
            role: "model",
            fileName,
            objectKey: stored.key,
            extension,
            sizeBytes: stored.size,
            contentType: inferContentTypeForExtension(extension),
            etag: stored.etag
          });
        }

        return {
          derivedAssets,
          noRenderableGeometry: false
        };
      }
    );

    if (generation.derivedAssets.length === 0) {
      if (generation.noRenderableGeometry) {
        const noGeometryAssetIds = new Set(sourceModelAssets.map((asset) => asset.assetId));
        return assets.map((asset) =>
          noGeometryAssetIds.has(asset.assetId) ? { ...asset, role: "unknown" } : asset
        );
      }
      return assets;
    }

    return dedupePlaceableAssets([...assets, ...generation.derivedAssets]);
  }

  private async ensureOnDemandPlaceableSourceModelAssets(
    input: {
      templateId: string;
      resref: string;
      metadata: Record<string, string | number | boolean>;
    },
    assets: PlaceableAssetEntry[]
  ): Promise<PlaceableAssetEntry[]> {
    if (
      !this.runtimeSettingsRepository ||
      !this.moduleBlobStorage?.putModuleObject ||
      assets.some(isDerivedModelAssetEntry) ||
      selectSourceModelAssetsForDerived(input, assets).length > 0
    ) {
      return assets;
    }

    const settings = await this.runtimeSettingsRepository.get();
    const candidates = buildPlaceableModelResRefCandidates(input);
    for (const resref of candidates) {
      const found = await resolvePlaceableSourceResource(
        settings,
        resref,
        ON_DEMAND_MODEL_RESOURCE_CANDIDATES
      );
      if (!found) {
        continue;
      }

      const stored = await this.storeOnDemandPlaceableAsset(settings, found);
      return stored ? dedupePlaceableAssets([...assets, stored]) : assets;
    }

    return assets;
  }

  private async ensureOnDemandPlaceableTextureAssets(
    textureReferences: string[],
    assets: PlaceableAssetEntry[]
  ): Promise<PlaceableAssetEntry[]> {
    if (
      textureReferences.length === 0 ||
      !this.runtimeSettingsRepository ||
      !this.moduleBlobStorage?.putModuleObject
    ) {
      return assets;
    }

    const existingTextureRefs = new Set(
      assets
        .filter((asset) => asset.role === "texture")
        .map((asset) => extractBasename(asset.fileName))
    );
    const missingTextureRefs = textureReferences
      .map(extractBasename)
      .filter((value) => value && !existingTextureRefs.has(value));
    if (missingTextureRefs.length === 0) {
      return assets;
    }

    const settings = await this.runtimeSettingsRepository.get();
    const onDemandAssets: PlaceableAssetEntry[] = [];
    for (const resref of deduplicateOrdered(missingTextureRefs)) {
      const found = await resolvePlaceableSourceResource(
        settings,
        resref,
        ON_DEMAND_TEXTURE_RESOURCE_CANDIDATES
      );
      if (!found) {
        continue;
      }

      const stored = await this.storeOnDemandPlaceableAsset(settings, found);
      if (stored) {
        onDemandAssets.push(stored);
      }
    }

    return onDemandAssets.length > 0
      ? dedupePlaceableAssets([...assets, ...onDemandAssets])
      : assets;
  }

  private async ensureOnDemandPlaceableMaterialAssets(
    materialReferences: string[],
    assets: PlaceableAssetEntry[]
  ): Promise<PlaceableAssetEntry[]> {
    if (
      materialReferences.length === 0 ||
      !this.runtimeSettingsRepository ||
      !this.moduleBlobStorage?.putModuleObject
    ) {
      return assets;
    }

    const existingMaterialRefs = new Set(
      assets
        .filter((asset) => asset.role === "material")
        .map((asset) => extractBasename(asset.fileName))
    );
    const missingMaterialRefs = materialReferences
      .map(extractBasename)
      .filter((value) => value && !existingMaterialRefs.has(value));
    if (missingMaterialRefs.length === 0) {
      return assets;
    }

    const settings = await this.runtimeSettingsRepository.get();
    const onDemandAssets: PlaceableAssetEntry[] = [];
    for (const resref of deduplicateOrdered(missingMaterialRefs)) {
      const found = await resolvePlaceableSourceResource(
        settings,
        resref,
        ON_DEMAND_MATERIAL_RESOURCE_CANDIDATES
      );
      if (!found) {
        continue;
      }

      const stored = await this.storeOnDemandPlaceableAsset(settings, found);
      if (stored) {
        onDemandAssets.push(stored);
      }
    }

    return onDemandAssets.length > 0
      ? dedupePlaceableAssets([...assets, ...onDemandAssets])
      : assets;
  }

  private async ensureOnDemandPlaceableChunkModelAssets(
    chunkModelReferences: string[],
    assets: PlaceableAssetEntry[]
  ): Promise<PlaceableAssetEntry[]> {
    if (
      chunkModelReferences.length === 0 ||
      !this.runtimeSettingsRepository ||
      !this.moduleBlobStorage?.putModuleObject
    ) {
      return assets;
    }

    const existingModelRefs = new Set(
      assets
        .filter(isAuroraSourceModelAssetEntry)
        .map((asset) => extractBasename(asset.fileName))
    );
    const missingModelRefs = chunkModelReferences
      .map(extractBasename)
      .filter((value) => value && !existingModelRefs.has(value));
    if (missingModelRefs.length === 0) {
      return assets;
    }

    const settings = await this.runtimeSettingsRepository.get();
    const onDemandAssets: PlaceableAssetEntry[] = [];
    for (const resref of deduplicateOrdered(missingModelRefs)) {
      const found = await resolvePlaceableSourceResource(
        settings,
        resref,
        ON_DEMAND_MODEL_RESOURCE_CANDIDATES
      );
      if (!found) {
        continue;
      }

      const stored = await this.storeOnDemandPlaceableAsset(settings, found);
      if (stored) {
        onDemandAssets.push(stored);
      }
    }

    return onDemandAssets.length > 0
      ? dedupePlaceableAssets([...assets, ...onDemandAssets])
      : assets;
  }

  private async ensureDerivedPlaceableChunkModelAssets(
    chunkModelReferences: string[],
    assets: PlaceableAssetEntry[]
  ): Promise<PlaceableAssetEntry[]> {
    if (
      chunkModelReferences.length === 0 ||
      !this.derivedAssetGenerator ||
      !this.moduleBlobStorage?.putModuleObject
    ) {
      return assets;
    }

    const chunkModelRefSet = new Set(
      chunkModelReferences
        .map(extractBasename)
        .filter((value) => value.length > 0)
    );
    if (chunkModelRefSet.size === 0) {
      return assets;
    }

    const existingDerivedRefs = new Set(
      assets
        .filter(isDerivedModelAssetEntry)
        .map((asset) => extractBasename(asset.fileName))
        .filter((value) => value.length > 0)
    );
    const sourceModelAssets = assets.filter((asset) => {
      if (!isAuroraSourceModelAssetEntry(asset)) {
        return false;
      }
      const basename = extractBasename(asset.fileName);
      return chunkModelRefSet.has(basename) && !existingDerivedRefs.has(basename);
    });
    if (sourceModelAssets.length === 0) {
      return assets;
    }

    const settings = await this.runtimeSettingsRepository?.get();
    if (!settings) {
      return assets;
    }

    const sourceFiles: Array<{ asset: PlaceableAssetEntry; bytes: Buffer }> = [];
    for (const asset of sourceModelAssets) {
      const payload = await this.readModuleBlobObject(asset.objectKey);
      if (!payload || payload.bytes.length === 0) {
        continue;
      }
      sourceFiles.push({ asset, bytes: payload.bytes });
    }
    if (sourceFiles.length === 0) {
      return assets;
    }

    const generated = await this.derivedAssetGenerator.generateDerivedAssets({
      settingsRevision: settings.revision,
      modulePrefix: settings.blobStorage.modulePrefix,
      sourceFiles: sourceFiles.map(({ asset, bytes }) => ({
        fileName: asset.objectKey,
        resourceType: 0,
        bytes
      }))
    });
    if (generated.files.length === 0) {
      return assets;
    }

    const derivedAssets: PlaceableAssetEntry[] = [];
    for (const file of generated.files) {
      const stored = await this.moduleBlobStorage.putModuleObject(settings.blobStorage, file);
      const fileName = extractFileName(stored.key);
      const extension = extractExtension(fileName);
      derivedAssets.push({
        assetId: buildAssetId(stored.key, stored.etag, stored.size),
        role: "model",
        fileName,
        objectKey: stored.key,
        extension,
        sizeBytes: stored.size,
        contentType: inferContentTypeForExtension(extension),
        etag: stored.etag
      });
    }

    return derivedAssets.length > 0
      ? dedupePlaceableAssets([...assets, ...derivedAssets])
      : assets;
  }

  private async storeOnDemandPlaceableAsset(
    settings: RuntimeSettingsRecord,
    resource: OnDemandPlaceableSourceResource
  ): Promise<PlaceableAssetEntry | null> {
    if (!this.moduleBlobStorage?.putModuleObject) {
      return null;
    }

    const stored = await this.moduleBlobStorage.putModuleObject(settings.blobStorage, {
      fileName: resource.fileName,
      resourceType: resource.resourceType,
      bytes: resource.bytes
    });
    const fileName = extractFileName(stored.key);
    const extension = extractExtension(fileName);
    return {
      assetId: buildAssetId(stored.key, stored.etag, stored.size),
      role: inferOnDemandAssetRole(extension),
      fileName,
      objectKey: stored.key,
      extension,
      sizeBytes: stored.size,
      contentType: inferContentTypeForExtension(extension),
      etag: stored.etag
    };
  }

  private async collectTextureReferencesFromDerivedModels(
    assets: PlaceableAssetEntry[]
  ): Promise<string[]> {
    const references = new Set<string>();
    const materialBasenames = new Set(
      assets
        .filter((asset) => asset.role === "material" && asset.extension === "mtr")
        .map((asset) => extractBasename(asset.fileName))
        .filter((value) => value.length > 0)
    );
    const derivedModelAssets = assets.filter(isDerivedModelAssetEntry);

    for (const asset of derivedModelAssets) {
      const payload = await this.readModuleBlobObject(asset.objectKey);
      if (!payload) {
        continue;
      }

      const parsed = parseDerivedModelJsonPayload(asset, payload.bytes);
      if (!parsed) {
        continue;
      }

      collectAuroraTextureReferences(parsed).forEach((reference) => {
        references.add(reference);
      });
    }

    const materialTextureReferences = await this.collectTextureReferencesFromMaterialAssets(
      assets
    );
    if (materialTextureReferences.length > 0) {
      for (const reference of [...references]) {
        if (materialBasenames.has(reference)) {
          references.delete(reference);
        }
      }
      materialTextureReferences.forEach((reference) => references.add(reference));
    }

    return [...references].sort((left, right) => left.localeCompare(right));
  }

  private async collectTextureReferencesFromSourceModels(
    assets: PlaceableAssetEntry[]
  ): Promise<string[]> {
    const references = new Set<string>();
    const sourceModelAssets = assets.filter(isAuroraSourceModelAssetEntry);
    for (const asset of sourceModelAssets) {
      const payload = await this.readModuleBlobObject(asset.objectKey);
      if (!payload) {
        continue;
      }
      collectAuroraSourceModelTextureReferences(payload.bytes).forEach((reference) => {
        references.add(reference);
      });
    }
    return [...references].sort((left, right) => left.localeCompare(right));
  }

  private async collectChunkModelReferencesFromSourceModels(
    assets: PlaceableAssetEntry[]
  ): Promise<string[]> {
    const references = new Set<string>();
    const sourceModelAssets = assets.filter(isAuroraSourceModelAssetEntry);
    for (const asset of sourceModelAssets) {
      const payload = await this.readModuleBlobObject(asset.objectKey);
      if (!payload) {
        continue;
      }
      collectAuroraSourceModelEmitters(payload.bytes).emitters.forEach((emitter) => {
        const chunkName = normalizeAuroraModelResourceReference(emitter.chunkName);
        if (chunkName) {
          references.add(chunkName);
        }
      });
    }
    return [...references].sort((left, right) => left.localeCompare(right));
  }

  private async collectTextureReferencesFromMaterialAssets(
    assets: PlaceableAssetEntry[]
  ): Promise<string[]> {
    const references = new Set<string>();
    const materialAssets = assets.filter((asset) => asset.role === "material");
    for (const asset of materialAssets) {
      const payload = await this.readModuleBlobObject(asset.objectKey);
      if (!payload) {
        continue;
      }
      collectAuroraMaterialTextureReferences(payload.bytes).forEach((reference) =>
        references.add(reference)
      );
    }
    return [...references].sort((left, right) => left.localeCompare(right));
  }

  private async getPlaceableAssetSourcePriority(): Promise<PlaceableAssetSourcePriority | null> {
    if (!this.runtimeSettingsRepository) {
      return null;
    }

    const settings = await this.runtimeSettingsRepository.get();
    const moduleIfoHakList = await readModuleIfOHakList(settings.paths.moduleDecompiledPath);
    return buildPlaceableAssetSourcePriority(settings, moduleIfoHakList);
  }

  private async getModuleSnapshotIndex(): Promise<ModuleSnapshotIndex | null> {
    if (!this.runtimeSettingsRepository || !this.moduleBlobStorage) {
      return null;
    }

    const now = Date.now();
    if (
      this.moduleSnapshotIndexCache &&
      now - this.moduleSnapshotIndexCache.fetchedAtMs < MODULE_SNAPSHOT_INDEX_TTL_MS
    ) {
      return this.moduleSnapshotIndexCache.index;
    }
    if (
      this.moduleSnapshotIndexFailureCache &&
      this.moduleSnapshotIndexFailureCache.expiresAtMs > now
    ) {
      return null;
    }

    const settings = await this.runtimeSettingsRepository.get();
    const inFlightKey = [
      settings.blobStorage.bucket,
      normalizePrefixForLookup(settings.blobStorage.modulePrefix)
    ].join("|");

    return executeInFlight(this.inFlightModuleSnapshotIndex, inFlightKey, async () => {
      const refreshNow = Date.now();
      if (
        this.moduleSnapshotIndexCache &&
        refreshNow - this.moduleSnapshotIndexCache.fetchedAtMs < MODULE_SNAPSHOT_INDEX_TTL_MS
      ) {
        return this.moduleSnapshotIndexCache.index;
      }
      if (
        this.moduleSnapshotIndexFailureCache &&
        this.moduleSnapshotIndexFailureCache.expiresAtMs > refreshNow
      ) {
        return null;
      }

      try {
        const snapshot = await this.listAllModuleSnapshotObjects(settings.blobStorage);
        const cacheKey = [
          settings.blobStorage.bucket,
          snapshot.prefix,
          snapshot.moduleHash ?? "unknown",
          String(snapshot.objects.length)
        ].join("|");

        if (this.moduleSnapshotIndexCache?.key === cacheKey) {
          this.moduleSnapshotIndexFailureCache = null;
          return this.moduleSnapshotIndexCache.index;
        }

        const index = buildModuleSnapshotIndex(snapshot);
        this.moduleSnapshotIndexCache = {
          key: cacheKey,
          index,
          fetchedAtMs: refreshNow
        };
        this.moduleSnapshotIndexFailureCache = null;
        return index;
      } catch {
        this.moduleSnapshotIndexFailureCache = {
          expiresAtMs: refreshNow + MODULE_SNAPSHOT_INDEX_FAILURE_TTL_MS
        };
        return null;
      }
    });
  }

  private async getCurrentModuleHash(): Promise<string | undefined> {
    if (this.appConfig?.isTest && !this.appConfig.enableBlobAssetLookupInTest) {
      return undefined;
    }

    const now = Date.now();
    if (
      this.moduleHashProbeCache &&
      now - this.moduleHashProbeCache.fetchedAtMs < MODULE_HASH_PROBE_TTL_MS
    ) {
      return this.moduleHashProbeCache.value;
    }

    if (this.moduleHashProbeInFlight) {
      return this.moduleHashProbeInFlight;
    }

    this.moduleHashProbeInFlight = (async () => {
      try {
        const value = await this.probeCurrentModuleHash();
        this.moduleHashProbeCache = {
          value,
          fetchedAtMs: Date.now()
        };
        return value;
      } catch {
        this.moduleHashProbeCache = {
          value: undefined,
          fetchedAtMs: Date.now()
        };
        return undefined;
      } finally {
        this.moduleHashProbeInFlight = null;
      }
    })();

    return this.moduleHashProbeInFlight;
  }

  private async probeCurrentModuleHash(): Promise<string | undefined> {
    if (!this.runtimeSettingsRepository || !this.moduleBlobStorage) {
      return undefined;
    }

    const settings = await this.runtimeSettingsRepository.get();
    const snapshot = await this.moduleBlobStorage.listModuleSnapshot(settings.blobStorage, {
      limit: 1
    });
    return snapshot.moduleHash;
  }

  private getTemplateLookupById(
    kind: TemplateKind,
    templateId: string
  ): TemplateRecord | null {
    return this.getTemplateLookup(this.templateByIdCache, `${kind}|${templateId}`);
  }

  private getTemplateLookupByResref(
    kind: TemplateKind,
    resref: string
  ): TemplateRecord | null {
    return this.getTemplateLookup(this.templateByResrefCache, `${kind}|${resref}`);
  }

  private getTemplateLookup(
    store: Map<string, TemplateLookupCacheEntry>,
    key: string
  ): TemplateRecord | null {
    const normalizedKey = normalizeLookupKey(key);
    this.pruneExpiredTimedEntries(store);
    const entry = store.get(normalizedKey);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (entry.expiresAtMs <= now) {
      store.delete(normalizedKey);
      return null;
    }

    store.delete(normalizedKey);
    store.set(normalizedKey, {
      template: entry.template,
      expiresAtMs: now + TEMPLATE_LOOKUP_TTL_MS
    });

    return entry.template;
  }

  private cacheTemplateLookup(template: TemplateRecord): void {
    const expiresAtMs = Date.now() + TEMPLATE_LOOKUP_TTL_MS;
    this.upsertTimedEntry(this.templateByIdCache,
      normalizeLookupKey(`${template.kind}|${template.templateId}`),
      { template, expiresAtMs }
    );
    this.upsertTimedEntry(this.templateByResrefCache,
      normalizeLookupKey(`${template.kind}|${template.resref}`),
      { template, expiresAtMs }
    );
    this.pruneOverflow(this.templateByIdCache, this.templateLookupCacheMaxEntries);
    this.pruneOverflow(this.templateByResrefCache, this.templateLookupCacheMaxEntries);
  }

  private isManifestValidationFresh(cacheKey: string, moduleHash?: string): boolean {
    const normalizedCacheKey = normalizeLookupKey(cacheKey);
    this.pruneExpiredTimedEntries(this.placeableManifestValidationCache);
    const entry = this.placeableManifestValidationCache.get(normalizedCacheKey);
    if (!entry) {
      return false;
    }

    const now = Date.now();
    if (entry.expiresAtMs <= now) {
      this.placeableManifestValidationCache.delete(normalizedCacheKey);
      return false;
    }

    if ((entry.moduleHash ?? "") !== (moduleHash ?? "")) {
      this.placeableManifestValidationCache.delete(normalizedCacheKey);
      return false;
    }

    this.upsertTimedEntry(this.placeableManifestValidationCache, normalizedCacheKey, {
      moduleHash: entry.moduleHash,
      expiresAtMs: now + PLACEABLE_MANIFEST_VALIDATION_TTL_MS
    });
    return true;
  }

  private rememberManifestValidation(cacheKey: string, moduleHash?: string): void {
    const normalizedCacheKey = normalizeLookupKey(cacheKey);
    this.upsertTimedEntry(this.placeableManifestValidationCache, normalizedCacheKey, {
      moduleHash,
      expiresAtMs: Date.now() + PLACEABLE_MANIFEST_VALIDATION_TTL_MS
    });
    this.pruneOverflow(
      this.placeableManifestValidationCache,
      this.manifestValidationCacheMaxEntries
    );
  }

  private upsertTimedEntry<TValue>(
    store: Map<string, TValue>,
    key: string,
    value: TValue
  ): void {
    store.delete(key);
    store.set(key, value);
  }

  private pruneOverflow<TValue>(store: Map<string, TValue>, maxEntries: number): void {
    while (store.size > maxEntries) {
      const oldestKey = store.keys().next().value;
      if (!oldestKey) {
        return;
      }
      store.delete(oldestKey);
    }
  }

  private pruneExpiredTimedEntries<TValue extends { expiresAtMs: number }>(
    store: Map<string, TValue>
  ): void {
    if (store.size === 0) {
      return;
    }

    const now = Date.now();
    for (const [key, value] of store) {
      if (value.expiresAtMs <= now) {
        store.delete(key);
      }
    }
  }

  private async listAllModuleSnapshotObjects(
    settings: BlobStorageSettings
  ): Promise<ModuleBlobSnapshotSummary> {
    if (!this.moduleBlobStorage) {
      return {
        bucket: settings.bucket,
        prefix: settings.modulePrefix,
        moduleHash: undefined,
        totalFiles: 0,
        totalBytes: 0,
        objects: [],
        truncated: false
      };
    }

    const objects: ModuleBlobObjectSummary[] = [];
    let continuationToken: string | undefined;
    let moduleHash: string | undefined;
    let prefix = normalizePrefixForLookup(settings.modulePrefix);

    do {
      const page = await this.moduleBlobStorage.listModuleSnapshot(settings, {
        limit: 1000,
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

  private async readModuleBlobObject(key: string): Promise<ModuleBlobObjectPayload | null> {
    if (!this.runtimeSettingsRepository || !this.moduleBlobStorage) {
      return null;
    }

    const settings = await this.runtimeSettingsRepository.get();
    return this.moduleBlobStorage.getModuleObject(settings.blobStorage, key);
  }

  private async getBlobStorageSettings(): Promise<BlobStorageSettings | null> {
    if (!this.runtimeSettingsRepository) {
      return null;
    }

    const settings = await this.runtimeSettingsRepository.get();
    return settings.blobStorage;
  }

  private selectAssetsForDelivery(
    assets: PlaceableAssetEntry[],
    assetIds?: string[]
  ): PlaceableAssetEntry[] {
    if (!assetIds || assetIds.length === 0) {
      return assets;
    }

    const byId = new Map<string, PlaceableAssetEntry>();
    for (const asset of assets) {
      byId.set(asset.assetId.toLowerCase(), asset);
    }

    return assetIds.map((assetId) => {
      const found = byId.get(assetId.trim().toLowerCase());
      if (found) {
        return found;
      }

      throw new AppException({
        status: 404,
        code: "PLACEABLE_ASSET_NOT_FOUND",
        message: "Placeable asset was not found in cached manifest."
      });
    });
  }

  private async ensureTemplateProjection(
    kind: TemplateProcessingKind,
    cacheKey: string,
    value: TemplateProcessingResult
  ): Promise<TemplateProcessingResult> {
    if (kind === "creature") {
      if (value.creatureRuntime && value.creatureValidationIssues) {
        return value;
      }

      const creatureRuntime = buildCreatureRuntimeProjection(value.metadata);
      const creatureValidationIssues = buildCreatureValidationIssues(creatureRuntime);
      const refreshed: TemplateProcessingResult = {
        ...value,
        creatureRuntime,
        creatureValidationIssues
      };

      await this.placeableCache.set<TemplateProcessingResult>(cacheKey, refreshed);
      return refreshed;
    }

    if (value.itemRuntime && value.itemValidationIssues) {
      return value;
    }

    const itemRuntime = buildItemRuntimeProjection(value.metadata);
    const itemValidationIssues = buildItemValidationIssues(itemRuntime);
    const refreshed: TemplateProcessingResult = {
      ...value,
      itemRuntime,
      itemValidationIssues
    };

    await this.placeableCache.set<TemplateProcessingResult>(cacheKey, refreshed);
    return refreshed;
  }

  private mapTemplateResultByKind<TKind extends TemplateProcessingKind>(
    kind: TKind,
    data: TemplateProcessingEnvelope
  ): TemplateProcessingResultByKind<TKind> {
    if (kind === "creature") {
      return {
        cache: data.cache,
        creature: data.value
      } as TemplateProcessingResultByKind<TKind>;
    }

    return {
      cache: data.cache,
      item: data.value
    } as TemplateProcessingResultByKind<TKind>;
  }
}

async function resolvePlaceableSourceResource(
  settings: RuntimeSettingsRecord,
  resref: string,
  candidates: OnDemandResourceCandidate[]
): Promise<OnDemandPlaceableSourceResource | null> {
  const hakResource = await resolvePlaceableHakResource(settings, resref, candidates);
  if (hakResource) {
    return hakResource;
  }

  return resolvePlaceableVanillaResource(settings, resref, candidates);
}

async function resolvePlaceableHakResource(
  settings: RuntimeSettingsRecord,
  resref: string,
  candidates: OnDemandResourceCandidate[]
): Promise<OnDemandPlaceableSourceResource | null> {
  if (!settings.sources.placeable.includeHaks) {
    return null;
  }

  const moduleIfoHakList = await readModuleIfOHakList(settings.paths.moduleDecompiledPath);
  const hakPaths = resolveHakSettingsByAsset(
    settings,
    moduleIfoHakList
  ).placeable.hakPaths;
  for (const hakPath of hakPaths) {
    const resolvedHakPath = resolveFileSystemPath(hakPath);
    if (!(await existsAsFile(resolvedHakPath))) {
      continue;
    }

    for (const candidate of candidates) {
      let bytes: Buffer | null = null;
      try {
        bytes = await readNwnErfResource(
          resolvedHakPath,
          resref,
          candidate.resourceType
        );
      } catch {
        bytes = null;
      }
      if (!bytes) {
        continue;
      }

      const hakName = normalizeHakNameForBlobSource(resolvedHakPath);
      return {
        ...candidate,
        resref,
        fileName: normalizePlaceableSourceFileName(
          `__aurora/sources/hak/${hakName}/${resref}.${candidate.extension}`
        ),
        bytes
      };
    }
  }

  return null;
}

async function resolvePlaceableVanillaResource(
  settings: RuntimeSettingsRecord,
  resref: string,
  candidates: OnDemandResourceCandidate[]
): Promise<OnDemandPlaceableSourceResource | null> {
  if (!settings.sources.placeable.includeVanilla) {
    return null;
  }

  const vanillaRoot = resolveFileSystemPath(settings.paths.vanillaDataPath.trim());
  const keyPath = await resolveFirstExistingVanillaKeyFile(vanillaRoot);
  if (!keyPath) {
    return null;
  }

  let reader: NwnKeyBifResourceReader;
  try {
    reader = await NwnKeyBifResourceReader.open(keyPath, vanillaRoot);
  } catch {
    return null;
  }

  for (const candidate of candidates) {
    const bytes = await reader.read(resref, candidate.resourceType);
    if (!bytes) {
      continue;
    }

    return {
      ...candidate,
      resref,
      fileName: normalizePlaceableSourceFileName(
        `__aurora/sources/vanilla/${candidate.vanillaDirectory}/${resref}.${candidate.extension}`
      ),
      bytes
    };
  }

  return null;
}

function buildPlaceableModelResRefCandidates(input: {
  templateId: string;
  resref: string;
  metadata: Record<string, string | number | boolean>;
}): string[] {
  const rawCandidates = [
    asMetadataString(input.metadata.lookupModelResRef),
    asMetadataString(input.metadata.modelResRef),
    input.templateId,
    stripPlaceableTemplatePrefix(input.templateId),
    input.resref,
    stripPlaceableTemplatePrefix(input.resref)
  ];
  return deduplicateOrdered(
    rawCandidates
      .map((value) => (value ? extractBasename(value) : ""))
      .filter(Boolean)
  );
}

function isNoRenderableGeometryDerivedFailure(
  failureReasons: string[] | undefined
): boolean {
  return (
    Array.isArray(failureReasons) &&
    failureReasons.length > 0 &&
    failureReasons.every((reason) =>
      /contains no renderable (?:mesh|trimesh) geometry/iu.test(reason)
    )
  );
}

function asMetadataString(value: string | number | boolean | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function stripPlaceableTemplatePrefix(value: string): string {
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith("plc_") ? normalized.slice(4) : normalized;
}

function inferOnDemandAssetRole(extension: string): PlaceableAssetRole {
  const normalized = extension.trim().toLowerCase();
  if (normalized === "mdl" || normalized === "mdb") {
    return "model";
  }
  if (normalized === "bmp" || normalized === "dds" || normalized === "tga" || normalized === "plt") {
    return "texture";
  }
  if (normalized === "mtr" || normalized === "txi") {
    return "material";
  }
  return "unknown";
}

async function resolveFirstExistingVanillaKeyFile(
  vanillaRoot: string
): Promise<string | null> {
  if (!vanillaRoot) {
    return null;
  }
  for (const fileName of VANILLA_KEY_FILE_CANDIDATES) {
    const candidate = resolveFileSystemPath(resolve(vanillaRoot, fileName));
    if (await existsAsFile(candidate)) {
      return candidate;
    }
  }
  return null;
}

function resolveFileSystemPath(pathValue: string): string {
  return isAbsolute(pathValue) ? pathValue : resolve(process.cwd(), pathValue);
}

async function existsAsFile(pathValue: string): Promise<boolean> {
  try {
    const metadata = await stat(pathValue);
    return metadata.isFile();
  } catch {
    return false;
  }
}

function normalizePlaceableSourceFileName(value: string): string {
  return value.replace(/\\/gu, "/").replace(/\/+/gu, "/");
}

function dedupePlaceableAssets(assets: PlaceableAssetEntry[]): PlaceableAssetEntry[] {
  const byObjectKey = new Map<string, PlaceableAssetEntry>();
  for (const asset of assets) {
    byObjectKey.set(asset.objectKey, asset);
  }
  return [...byObjectKey.values()];
}

function buildPlaceableDerivedGenerationKey(
  sourceFiles: Array<{ asset: PlaceableAssetEntry; bytes: Buffer }>
): string {
  return [
    "placeable-derived-generation/v1",
    ...sourceFiles
      .map(({ asset, bytes }) =>
        [
          normalizeLookupKey(asset.objectKey),
          normalizeLookupKey(asset.assetId),
          normalizeLookupKey(asset.etag ?? ""),
          String(asset.sizeBytes),
          String(bytes.length)
        ].join("#")
      )
      .sort()
  ].join("|");
}

function bindAuroraEmitterChunkModelAssets(
  assetManifest: PlaceableAssetManifest,
  auroraEmitter: NonNullable<PlaceableRenderPackage["auroraEmitter"]>
): {
  auroraEmitter: NonNullable<PlaceableRenderPackage["auroraEmitter"]>;
  chunkModelAssetIds: string[];
  diagnostics: PlaceableRenderPackage["diagnostics"];
} {
  const chunkModelAssetIds: string[] = [];
  const diagnostics: PlaceableRenderPackage["diagnostics"] = [];
  const sourceModelAssetsByBasename = new Map<string, PlaceableAssetEntry[]>();
  const derivedModelAssetsByBasename = new Map<string, PlaceableAssetEntry[]>();

  assetManifest.assets.filter(isAuroraSourceModelAssetEntry).forEach((asset) => {
    const basename = extractBasename(asset.fileName);
    if (!basename) {
      return;
    }
    const bucket = sourceModelAssetsByBasename.get(basename) ?? [];
    bucket.push(asset);
    sourceModelAssetsByBasename.set(basename, bucket);
  });
  assetManifest.assets.filter(isDerivedModelAssetEntry).forEach((asset) => {
    const basename = extractBasename(asset.fileName);
    if (!basename) {
      return;
    }
    const bucket = derivedModelAssetsByBasename.get(basename) ?? [];
    bucket.push(asset);
    bucket.sort(compareDerivedChunkModelAssetPriority);
    derivedModelAssetsByBasename.set(basename, bucket);
  });

  const emitters = auroraEmitter.emitters.map((emitter) => {
    const chunkName = normalizeAuroraModelResourceReference(emitter.chunkName);
    if (!chunkName) {
      return emitter;
    }

    if (typeof emitter.texture === "string" && emitter.texture.trim().length > 0) {
      diagnostics.push({
        code: "VFX_CHUNKNAME_OVERRIDES_TEXTURE",
        severity: "warn",
        message:
          "Emitter has both texture and chunkName; Aurora chunkName selects the model-particle lane while texture remains preserved."
      });
    }

    const chunkModelAsset = derivedModelAssetsByBasename.get(chunkName)?.[0];
    if (!chunkModelAsset) {
      const sourceModelAsset = sourceModelAssetsByBasename.get(chunkName)?.[0];
      if (sourceModelAsset) {
        diagnostics.push({
          code: "VFX_CHUNK_MODEL_DERIVED_MISSING",
          severity: "warn",
          message: `Chunk model '${chunkName}' was found as ${sourceModelAsset.fileName}, but no derived GLB/GLTF asset is available for browser rendering.`
        });
        return emitter;
      }
      diagnostics.push({
        code: "VFX_CHUNK_MODEL_MISSING",
        severity: "warn",
        message: `Chunk model '${chunkName}' was referenced by an emitter but was not found as an MDL/MDB or derived GLB/GLTF asset.`
      });
      return emitter;
    }

    if (!chunkModelAssetIds.includes(chunkModelAsset.assetId)) {
      chunkModelAssetIds.push(chunkModelAsset.assetId);
    }
    diagnostics.push({
      code: "VFX_CHUNK_MODEL_RESOURCE_READY",
      severity: "warn",
      message:
        "Emitter chunkName was resolved to a renderable derived model asset for the chunk-particle lane."
    });

    return {
      ...emitter,
      chunkModelAssetId: chunkModelAsset.assetId,
      chunkModelFileName: chunkModelAsset.fileName,
      chunkModelObjectKey: chunkModelAsset.objectKey
    };
  });

  return {
    auroraEmitter: {
      ...auroraEmitter,
      emitters
    },
    chunkModelAssetIds,
    diagnostics
  };
}

function compareDerivedChunkModelAssetPriority(
  left: PlaceableAssetEntry,
  right: PlaceableAssetEntry
): number {
  const leftExtension = left.extension.trim().toLowerCase();
  const rightExtension = right.extension.trim().toLowerCase();
  const extensionDelta =
    (leftExtension === "glb" ? 0 : leftExtension === "gltf" ? 1 : 2) -
    (rightExtension === "glb" ? 0 : rightExtension === "gltf" ? 1 : 2);
  if (extensionDelta !== 0) {
    return extensionDelta;
  }
  return left.fileName.localeCompare(right.fileName);
}

function selectSourceModelAssetsForDerived(
  input: {
    resref: string;
    metadata: Record<string, string | number | boolean>;
  },
  assets: PlaceableAssetEntry[]
): PlaceableAssetEntry[] {
  const lookupModelResRef =
    typeof input.metadata.lookupModelResRef === "string"
      ? extractBasename(input.metadata.lookupModelResRef)
      : undefined;
  const fallbackResRef = extractBasename(input.resref);
  const modelAssets = assets.filter((asset) => {
    const extension = asset.extension.trim().toLowerCase();
    return asset.role === "model" && (extension === "mdl" || extension === "mdb");
  });

  const preferred = modelAssets.filter((asset) => {
    const basename = extractBasename(asset.fileName);
    return basename === lookupModelResRef || basename === fallbackResRef;
  });

  return preferred.length > 0 ? preferred : modelAssets.slice(0, 1);
}

function selectAuroraEmitterSourceModelAssets(
  assets: PlaceableAssetEntry[]
): PlaceableAssetEntry[] {
  const byBasename = new Map<
    string,
    Array<{ asset: PlaceableAssetEntry; originalIndex: number }>
  >();

  assets.forEach((asset, originalIndex) => {
    const basename = extractBasename(asset.fileName);
    const key = basename || `${asset.objectKey}#${originalIndex}`;
    const bucket = byBasename.get(key) ?? [];
    bucket.push({ asset, originalIndex });
    byBasename.set(key, bucket);
  });

  return Array.from(byBasename.values()).map((bucket) => {
    bucket.sort((left, right) => {
      const sourceDelta = compareAssetSourcePriority(left.asset, right.asset);
      if (sourceDelta !== 0) {
        return sourceDelta;
      }
      return left.originalIndex - right.originalIndex;
    });
    return bucket[0]!.asset;
  });
}

function isDerivedModelAssetEntry(asset: PlaceableAssetEntry): boolean {
  const extension = asset.extension.trim().toLowerCase();
  return extension === "glb" || extension === "gltf";
}

function isAuroraSourceModelAssetEntry(asset: PlaceableAssetEntry): boolean {
  const extension = asset.extension.trim().toLowerCase();
  return extension === "mdl" || extension === "mdb";
}

function parseDerivedModelJsonPayload(
  asset: PlaceableAssetEntry,
  bytes: Buffer
): unknown | null {
  const extension = asset.extension.trim().toLowerCase();
  if (extension === "glb") {
    return parseGlbJson(bytes);
  }
  if (extension === "gltf") {
    return parseGltfJson(bytes);
  }
  return null;
}

function parseGlbJson(bytes: Buffer): unknown | null {
  if (bytes.length < 20 || bytes.readUInt32LE(0) !== GLB_MAGIC) {
    return null;
  }

  const jsonLength = bytes.readUInt32LE(12);
  const jsonType = bytes.readUInt32LE(16);
  const jsonStart = 20;
  const jsonEnd = jsonStart + jsonLength;
  if (jsonType !== GLB_JSON_CHUNK_TYPE || jsonLength <= 0 || jsonEnd > bytes.length) {
    return null;
  }

  try {
    const jsonText = bytes
      .subarray(jsonStart, jsonEnd)
      .toString("utf-8")
      .replace(/\0+$/u, "")
      .trimEnd();
    return JSON.parse(jsonText) as unknown;
  } catch {
    return null;
  }
}

function parseGltfJson(bytes: Buffer): unknown | null {
  try {
    return JSON.parse(bytes.toString("utf-8")) as unknown;
  } catch {
    return null;
  }
}

function collectAuroraTextureReferences(modelJson: unknown): string[] {
  const references = new Set<string>();
  collectAuroraTextureReferencesFromObject(modelJson, references);

  const root = asRecord(modelJson);
  collectGltfImageTextureReferences(root, references);
  const materials = root ? root["materials"] : undefined;
  if (Array.isArray(materials)) {
    materials.forEach((material) =>
      collectAuroraTextureReferencesFromObject(material, references)
    );
  }
  const meshes = root ? root["meshes"] : undefined;
  if (Array.isArray(meshes)) {
    meshes.forEach((mesh) => {
      const meshRecord = asRecord(mesh);
      const primitives = meshRecord ? meshRecord["primitives"] : undefined;
      if (!Array.isArray(primitives)) {
        return;
      }
      primitives.forEach((primitive) =>
        collectAuroraTextureReferencesFromObject(primitive, references)
      );
    });
  }

  return [...references].sort((left, right) => left.localeCompare(right));
}

function collectGltfImageTextureReferences(
  root: Record<string, unknown> | null,
  target: Set<string>
): void {
  const images = root ? root["images"] : undefined;
  if (!Array.isArray(images)) {
    return;
  }

  for (const image of images) {
    const imageRecord = asRecord(image);
    const uriReference = normalizeGltfImageTextureReference(imageRecord?.["uri"]);
    if (uriReference) {
      target.add(uriReference);
    }
    const nameReference = normalizeGltfImageTextureReference(imageRecord?.["name"]);
    if (nameReference) {
      target.add(nameReference);
    }
  }
}

function normalizeGltfImageTextureReference(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || /^(data|blob):/iu.test(trimmed)) {
    return null;
  }
  return normalizeModelTextureReference(trimmed);
}

function collectAuroraTextureReferencesFromObject(
  value: unknown,
  target: Set<string>
): void {
  const record = asRecord(value);
  const extras = asRecord(record?.["extras"]);
  const aurora = asRecord(extras?.["aurora"]);
  const singleReference = normalizeModelTextureReference(aurora?.["textureReference"]);
  if (singleReference) {
    target.add(singleReference);
  }
  const rawReferences = aurora?.["textureReferences"];
  if (!Array.isArray(rawReferences)) {
    return;
  }

  for (const rawReference of rawReferences) {
    const reference = normalizeModelTextureReference(rawReference);
    if (reference) {
      target.add(reference);
    }
  }
}

function collectAuroraMaterialTextureReferences(bytes: Buffer): string[] {
  const references = new Set<string>();
  const source = bytes.toString("utf-8");
  const lines = source.split(/\r?\n/u);
  lines.forEach((line) => {
    const withoutComments = line
      .replace(/\/\/.*$/u, "")
      .replace(/;.*$/u, "")
      .trim();
    if (!withoutComments) {
      return;
    }
    const tokens = withoutComments.split(/\s+/u);
    if (tokens.length < 2) {
      return;
    }
    const key = tokens[0].toLowerCase();
    if (!isAuroraMaterialTextureKey(key)) {
      return;
    }
    const reference = normalizeModelTextureReference(tokens[1]);
    if (reference) {
      references.add(reference);
    }
  });
  return [...references].sort((left, right) => left.localeCompare(right));
}

function collectAuroraMaterialState(
  bytes: Buffer
): NonNullable<PlaceableRenderPackage["auroraMaterial"]>["materials"][number]["state"] | null {
  const state: NonNullable<
    PlaceableRenderPackage["auroraMaterial"]
  >["materials"][number]["state"] = {};
  const source = bytes.toString("utf-8");
  const lines = source.split(/\r?\n/u);
  for (const line of lines) {
    const withoutComments = line
      .replace(/\/\/.*$/u, "")
      .replace(/;.*$/u, "")
      .trim();
    if (!withoutComments) {
      continue;
    }
    const tokens = withoutComments.split(/\s+/u);
    if (tokens.length < 2) {
      continue;
    }
    const key = tokens[0]?.toLowerCase();
    const rawValue = tokens.slice(1).join(" ");
    if (key === "blending") {
      const blending = readAuroraMaterialBlendingValue(rawValue);
      if (!blending) {
        continue;
      }
      state.blending = blending;
      if (blending === "additive") {
        state.auroraBlendField48 = 0;
        state.auroraBlendField4c = 2;
      } else {
        state.auroraBlendField48 = 2;
        state.auroraBlendField4c = 3;
      }
      continue;
    }
    if (key === "decal") {
      const decal = readAuroraBooleanValue(rawValue);
      if (decal !== undefined) {
        state.decal = decal;
      }
    }
  }

  return hasAuroraMaterialState(state) ? state : null;
}

function readAuroraMaterialBlendingValue(
  value: string
): NonNullable<
  NonNullable<PlaceableRenderPackage["auroraMaterial"]>["materials"][number]["state"]["blending"]
> | null {
  const normalized = value.trim().split(/\s+/u)[0]?.toLowerCase();
  if (normalized === "additive" || normalized === "punchthrough") {
    return normalized;
  }
  return null;
}

function hasAuroraMaterialState(
  state: NonNullable<PlaceableRenderPackage["auroraMaterial"]>["materials"][number]["state"]
): boolean {
  return (
    state.blending !== undefined ||
    state.auroraBlendField48 !== undefined ||
    state.auroraBlendField4c !== undefined ||
    state.decal !== undefined
  );
}

const AURORA_MODEL_TEXTURE_REFERENCE_KEYS = new Set([
  "bitmap",
  "texture",
  "texture0",
  "texture1",
  "texture2",
  "texture3",
  "basetexture",
  "diffusemap",
  "bumpmaptexture",
  "bumpyshinytexture",
  "envmaptexture",
  "bumpreplacementtexture",
  "normalmap",
  "specularmap",
  "roughnessmap"
]);

interface ParsedAuroraMdlEmitterNumberKeyframe {
  time: number;
  value: number;
}

interface ParsedAuroraMdlEmitterColorKeyframe {
  time: number;
  value: [number, number, number];
}

interface ParsedAuroraMdlEmitterVector3Keyframe {
  time: number;
  value: [number, number, number];
}

interface ParsedAuroraMdlEmitterOrientationKeyframe {
  time: number;
  value: {
    axis: [number, number, number];
    angleRadians: number;
  };
}

interface ParsedAuroraMdlEmitterAnimationEvent {
  time: number;
  type: string;
  animationName?: string;
}

const AURORA_EMITTER_SIMULATION_TIMELINE_KEYS = [
  "xSize",
  "ySize",
  "birthrate",
  "lifeExp",
  "mass",
  "velocity",
  "randvel",
  "spread",
  "particleRot",
  "bounceCoefficient",
  "blastRadius",
  "blastLength",
  "blurLength",
  "detonate",
  "fps",
  "frameStart",
  "frameEnd",
  "lightningScale",
  "lightningDelay",
  "lightningRadius",
  "p2pBezier2",
  "p2pBezier3",
  "combineTime",
  "grav",
  "drag",
  "threshold",
  "sizeStart",
  "sizeMid",
  "sizeEnd",
  "sizeStartY",
  "sizeMidY",
  "sizeEndY",
  "percentStart",
  "percentMid",
  "percentEnd",
  "alphaStart",
  "alphaMid",
  "alphaEnd"
] as const;

type ParsedAuroraMdlEmitterSimulationTimelineKey =
  (typeof AURORA_EMITTER_SIMULATION_TIMELINE_KEYS)[number];

type ParsedAuroraMdlEmitterSimulationTimeline = Partial<
  Record<ParsedAuroraMdlEmitterSimulationTimelineKey, ParsedAuroraMdlEmitterNumberKeyframe[]>
>;

type ParsedAuroraMdlEmitterColorTimelineKey = "colorStart" | "colorMid" | "colorEnd";

type ParsedAuroraMdlEmitterColorTimeline = Partial<
  Record<ParsedAuroraMdlEmitterColorTimelineKey, ParsedAuroraMdlEmitterColorKeyframe[]>
>;

const AURORA_EMITTER_SIMULATION_NON_NEGATIVE_TIMELINE_KEYS = new Set<
  ParsedAuroraMdlEmitterSimulationTimelineKey
>([
  "xSize",
  "ySize",
  "birthrate",
  "lifeExp",
  "randvel",
  "spread",
  "blastRadius",
  "blastLength",
  "blurLength",
  "detonate",
  "fps",
  "frameStart",
  "frameEnd",
  "lightningScale",
  "lightningDelay",
  "lightningRadius",
  "p2pBezier2",
  "p2pBezier3",
  "combineTime",
  "threshold",
  "sizeStart",
  "sizeMid",
  "sizeEnd",
  "sizeStartY",
  "sizeMidY",
  "sizeEndY",
  "percentStart",
  "percentMid",
  "percentEnd",
  "alphaStart",
  "alphaMid",
  "alphaEnd"
]);

const AURORA_EMITTER_SIMULATION_TIMELINE_KEY_SET = new Set<
  ParsedAuroraMdlEmitterSimulationTimelineKey
>(AURORA_EMITTER_SIMULATION_TIMELINE_KEYS);

function isAuroraEmitterSimulationTimelineKey(
  key: string | undefined
): key is ParsedAuroraMdlEmitterSimulationTimelineKey {
  return Boolean(key) && AURORA_EMITTER_SIMULATION_TIMELINE_KEY_SET.has(
    key as ParsedAuroraMdlEmitterSimulationTimelineKey
  );
}

interface ParsedAuroraMdlEmitter {
  nodeName: string;
  texture?: string;
  chunkName?: string;
  emitterType?: string;
  renderMode?: string;
  blendMode?: string;
  atlas?: {
    xGridRaw?: number;
    yGridRaw?: number;
    effectiveXGrid: number;
    effectiveYGrid: number;
    fps?: number;
    frameStart?: number;
    frameEnd?: number;
    random?: boolean;
  };
  simulation?: {
    xSize?: number;
    ySize?: number;
    spawnType?: number;
    birthrate?: number;
    lifeExp?: number;
    mass?: number;
    velocity?: number;
    randvel?: number;
    spread?: number;
    particleRot?: number;
    bounce?: boolean;
    bounceCoefficient?: number;
    blastRadius?: number;
    blastLength?: number;
    blurLength?: number;
    detonate?: number;
    fps?: number;
    frameStart?: number;
    frameEnd?: number;
    lightningScale?: number;
    lightningDelay?: number;
    lightningRadius?: number;
    deadspace?: number;
    p2p?: boolean;
    p2pType?: string;
    p2pBezier2?: number;
    p2pBezier3?: number;
    p2pSource?: number;
    p2pTarget?: number;
    combineTime?: number;
    grav?: number;
    drag?: number;
    threshold?: number;
    inherit?: boolean;
    inheritVel?: boolean;
    inheritLocal?: boolean;
    inheritPart?: boolean;
    affectedByWind?: boolean;
    sizeStart?: number;
    sizeMid?: number;
    sizeEnd?: number;
    sizeStartY?: number;
    sizeMidY?: number;
    sizeEndY?: number;
    alphaStart?: number;
    alphaMid?: number;
    alphaEnd?: number;
    colorStart?: [number, number, number];
    colorMid?: [number, number, number];
    colorEnd?: [number, number, number];
    percentStart?: number;
    percentMid?: number;
    percentEnd?: number;
    timeline?: ParsedAuroraMdlEmitterSimulationTimeline;
    colorTimeline?: ParsedAuroraMdlEmitterColorTimeline;
  };
  transform?: {
    position?: [number, number, number];
    positionTimeline?: ParsedAuroraMdlEmitterVector3Keyframe[];
    orientation?: {
      axis: [number, number, number];
      angleRadians: number;
    };
    orientationTimeline?: ParsedAuroraMdlEmitterOrientationKeyframe[];
    scale?: number;
    scaleTimeline?: ParsedAuroraMdlEmitterNumberKeyframe[];
  };
  referenceNodes?: ParsedAuroraMdlReferenceNode[];
  events?: ParsedAuroraMdlEmitterAnimationEvent[];
  animations?: ParsedAuroraMdlEmitterAnimation[];
  sourceState?: {
    renderOrder?: number;
    renderHintRaw?: string;
    renderHintMode?: 0 | 1 | 2 | 3;
    customShaderVS?: string;
    customShaderFS?: string;
    customShaderGS?: string;
    transparency?: boolean;
    twoSidedMaterial?: boolean;
    twoSidedTexture?: boolean;
    sampleFramebuffer?: number;
    volumetric?: boolean;
    loop?: boolean;
    isTinted?: boolean;
    splat?: boolean;
    rotateTexture?: boolean;
  };
}

interface ParsedAuroraMdlEmitterAnimation {
  animationName: string;
  lengthSeconds?: number;
  transitionSeconds?: number;
  simulation?: ParsedAuroraMdlEmitter["simulation"];
  transform?: ParsedAuroraMdlEmitter["transform"];
}

interface ParsedAuroraMdlReferenceNode {
  nodeName: string;
  parentNodeName?: string;
  transform?: {
    position?: [number, number, number];
    positionTimeline?: ParsedAuroraMdlEmitterVector3Keyframe[];
    orientation?: {
      axis: [number, number, number];
      angleRadians: number;
    };
    orientationTimeline?: ParsedAuroraMdlEmitterOrientationKeyframe[];
    scale?: number;
    scaleTimeline?: ParsedAuroraMdlEmitterNumberKeyframe[];
  };
}

interface ParsedAuroraMdlEmitters {
  source: PlaceableRenderPackageAuroraEmitterSource;
  emitters: ParsedAuroraMdlEmitter[];
}

interface ParsedAuroraMdlLightNumberKeyframe {
  time: number;
  value: number;
}

interface ParsedAuroraMdlLightColorKeyframe {
  time: number;
  value: [number, number, number];
}

interface ParsedAuroraMdlLightVector3Keyframe {
  time: number;
  value: [number, number, number];
}

interface ParsedAuroraMdlLightAnimation {
  animationName: string;
  lengthSeconds?: number;
  transitionSeconds?: number;
  positionTimeline?: ParsedAuroraMdlLightVector3Keyframe[];
  colorTimeline?: ParsedAuroraMdlLightColorKeyframe[];
  radiusTimeline?: ParsedAuroraMdlLightNumberKeyframe[];
}

interface ParsedAuroraMdlLight {
  nodeName: string;
  parentNodeName?: string;
  transform?: ParsedAuroraMdlReferenceNode["transform"];
  radius?: number;
  multiplier?: number;
  color?: [number, number, number];
  ambientOnly?: boolean;
  dynamicType?: number;
  affectDynamic?: boolean;
  shadow?: boolean;
  lightPriority?: number;
  lensFlares?: boolean;
  fadingLight?: boolean;
  animations?: ParsedAuroraMdlLightAnimation[];
}

interface ParsedAuroraMdlLights {
  source: PlaceableRenderPackageAuroraLightSource;
  lights: ParsedAuroraMdlLight[];
}

const AURORA_BINARY_MODEL_BASE = 12;
const AURORA_BINARY_MODEL_ANIMATIONS_OFFSET = 120;
const AURORA_BINARY_NODE_HEADER_SIZE = 0x70;
const AURORA_BINARY_NODE_NAME_OFFSET = 32;
const AURORA_BINARY_NODE_CHILDREN_OFFSET = 72;
const AURORA_BINARY_NODE_CONTROLLER_KEYS_OFFSET = 84;
const AURORA_BINARY_NODE_CONTROLLER_DATA_OFFSET = 96;
const AURORA_BINARY_NODE_FLAGS_OFFSET = 108;
const AURORA_BINARY_NODE_FLAG_EMITTER = 0x0004;
const AURORA_BINARY_NODE_FLAG_MESH = 0x0020;
const AURORA_BINARY_CONTROLLER_RECORD_SIZE = 12;
const AURORA_BINARY_CONTROLLER_POSITION = 8;
const AURORA_BINARY_CONTROLLER_ORIENTATION = 20;
const AURORA_BINARY_CONTROLLER_EMITTER_ALPHA_END = 80;
const AURORA_BINARY_CONTROLLER_EMITTER_ALPHA_START = 84;
const AURORA_BINARY_CONTROLLER_EMITTER_BIRTHRATE = 88;
const AURORA_BINARY_CONTROLLER_EMITTER_BOUNCE_COEFFICIENT = 92;
const AURORA_BINARY_CONTROLLER_EMITTER_COLOR_END = 96;
const AURORA_BINARY_CONTROLLER_EMITTER_COLOR_START = 108;
const AURORA_BINARY_CONTROLLER_EMITTER_COMBINE_TIME = 120;
const AURORA_BINARY_CONTROLLER_EMITTER_DRAG = 124;
const AURORA_BINARY_CONTROLLER_EMITTER_FPS = 128;
const AURORA_BINARY_CONTROLLER_EMITTER_FRAME_END = 132;
const AURORA_BINARY_CONTROLLER_EMITTER_FRAME_START = 136;
const AURORA_BINARY_CONTROLLER_EMITTER_GRAV = 140;
const AURORA_BINARY_CONTROLLER_EMITTER_LIFE_EXP = 144;
const AURORA_BINARY_CONTROLLER_EMITTER_MASS = 148;
const AURORA_BINARY_CONTROLLER_EMITTER_P2P_BEZIER2 = 152;
const AURORA_BINARY_CONTROLLER_EMITTER_P2P_BEZIER3 = 156;
const AURORA_BINARY_CONTROLLER_EMITTER_PARTICLE_ROT = 160;
const AURORA_BINARY_CONTROLLER_EMITTER_RAND_VEL = 164;
const AURORA_BINARY_CONTROLLER_EMITTER_SIZE_START = 168;
const AURORA_BINARY_CONTROLLER_EMITTER_SIZE_END = 172;
const AURORA_BINARY_CONTROLLER_EMITTER_SIZE_START_Y = 176;
const AURORA_BINARY_CONTROLLER_EMITTER_SIZE_END_Y = 180;
const AURORA_BINARY_CONTROLLER_EMITTER_SPREAD = 184;
const AURORA_BINARY_CONTROLLER_EMITTER_THRESHOLD = 188;
const AURORA_BINARY_CONTROLLER_EMITTER_VELOCITY = 192;
const AURORA_BINARY_CONTROLLER_EMITTER_SIZE_X = 196;
const AURORA_BINARY_CONTROLLER_EMITTER_SIZE_Y = 200;
const AURORA_BINARY_CONTROLLER_EMITTER_BLUR_LENGTH = 204;
const AURORA_BINARY_CONTROLLER_EMITTER_DETONATE = 228;
const AURORA_BINARY_CONTROLLER_EMITTER_ALPHA_MID = 468;
const AURORA_BINARY_CONTROLLER_EMITTER_COLOR_MID = 472;
const AURORA_BINARY_CONTROLLER_EMITTER_PERCENT_START = 484;
const AURORA_BINARY_CONTROLLER_EMITTER_PERCENT_MID = 485;
const AURORA_BINARY_CONTROLLER_EMITTER_PERCENT_END = 486;
const AURORA_BINARY_CONTROLLER_EMITTER_SIZE_MID = 488;
const AURORA_BINARY_CONTROLLER_EMITTER_SIZE_MID_Y = 492;
const AURORA_BINARY_MESH_TEXTURES_OFFSET = 232;
const AURORA_BINARY_EMITTER_DEAD_SPACE_OFFSET = 0x70;
const AURORA_BINARY_EMITTER_XGRID_OFFSET = 0x7c;
const AURORA_BINARY_EMITTER_YGRID_OFFSET = 0x80;
const AURORA_BINARY_EMITTER_SPAWN_TYPE_OFFSET = 0x84;
const AURORA_BINARY_EMITTER_TYPE_OFFSET = 0x88;
const AURORA_BINARY_EMITTER_RENDER_MODE_OFFSET = 0xa8;
const AURORA_BINARY_EMITTER_BLEND_MODE_OFFSET = 0xc8;
const AURORA_BINARY_EMITTER_TEXTURE_OFFSET = 232;
const AURORA_BINARY_EMITTER_CHUNK_NAME_OFFSET = 0x128;
const AURORA_BINARY_EMITTER_CHUNK_NAME_LENGTH = 0x10;
const AURORA_BINARY_EMITTER_TWO_SIDED_TEX_OFFSET = 0x138;
const AURORA_BINARY_EMITTER_LOOP_OFFSET = 0x13c;
const AURORA_BINARY_EMITTER_RENDER_ORDER_OFFSET = 0x140;
const AURORA_BINARY_EMITTER_FLAGS_OFFSET = 0x144;
const AURORA_BINARY_EMITTER_FLAG_P2P = 0x1;
const AURORA_BINARY_EMITTER_FLAG_P2P_BEZIER = 0x2;
const AURORA_BINARY_EMITTER_FLAG_AFFECTED_BY_WIND = 0x4;
const AURORA_BINARY_EMITTER_FLAG_IS_TINTED = 0x8;
const AURORA_BINARY_EMITTER_FLAG_BOUNCE = 0x10;
const AURORA_BINARY_EMITTER_FLAG_RANDOM_ATLAS_FRAME = 0x20;
const AURORA_BINARY_EMITTER_FLAG_INHERIT = 0x40;
const AURORA_BINARY_EMITTER_FLAG_INHERIT_VEL = 0x80;
const AURORA_BINARY_EMITTER_FLAG_INHERIT_LOCAL = 0x100;
const AURORA_BINARY_EMITTER_FLAG_SPLAT = 0x200;
const AURORA_BINARY_EMITTER_FLAG_INHERIT_PART = 0x400;
const AURORA_BINARY_ANIMATION_NAME_OFFSET = 8;
const AURORA_BINARY_ANIMATION_NAME_LENGTH = 64;
const AURORA_BINARY_ANIMATION_ROOT_NODE_OFFSET = 72;

function collectAuroraSourceModelTextureReferences(bytes: Buffer): string[] {
  if (isLikelyAuroraBinaryModel(bytes)) {
    const binaryReferences = collectAuroraBinaryModelTextureReferences(bytes);
    if (binaryReferences.length > 0) {
      return binaryReferences;
    }
  }

  const references = new Set<string>();
  const source = bytes.toString("latin1");
  const tokens = source
    .split(/[\u0000-\u0020,;:"'`()[\]{}<>]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  for (let index = 0; index < tokens.length; index += 1) {
    const key = tokens[index]?.toLowerCase();
    if (!key || !AURORA_MODEL_TEXTURE_REFERENCE_KEYS.has(key)) {
      continue;
    }
    const candidate = tokens[index + 1];
    const normalized = normalizeModelTextureReference(candidate);
    if (normalized) {
      references.add(normalized);
    }
  }

  return [...references].sort((left, right) => left.localeCompare(right));
}

function collectAuroraSourceModelEmitters(
  bytes: Buffer,
  options: AuroraMdlVfxParseOptions = {}
): ParsedAuroraMdlEmitters {
  const parsed = parseAuroraMdlVfxSource(bytes, options);
  return {
    source: parsed.source,
    emitters: parsed.emitters
  };
}

function collectAuroraSourceModelLights(
  bytes: Buffer,
  options: AuroraMdlVfxParseOptions = {}
): ParsedAuroraMdlLights {
  const parsed = parseAuroraMdlVfxSource(bytes, options);
  return {
    source: parsed.source,
    lights: parsed.lights
  };
}

function isLikelyAuroraBinaryModel(bytes: Buffer): boolean {
  return bytes.length >= AURORA_BINARY_MODEL_BASE && bytes.readUInt32LE(0) === 0;
}

function collectAuroraBinaryModelTextureReferences(bytes: Buffer): string[] {
  const references = new Set<string>();
  const rootNodeOffset = readAuroraBinaryUInt32(bytes, AURORA_BINARY_MODEL_BASE + 72);
  if (rootNodeOffset === null) {
    return [];
  }

  const visitedOffsets = new Set<number>();
  const walkNode = (nodeOffset: number, depth: number): void => {
    if (depth > 256 || visitedOffsets.has(nodeOffset)) {
      return;
    }
    visitedOffsets.add(nodeOffset);

    const absOffset = AURORA_BINARY_MODEL_BASE + nodeOffset;
    if (absOffset < AURORA_BINARY_MODEL_BASE) {
      return;
    }
    if (absOffset + AURORA_BINARY_NODE_HEADER_SIZE > bytes.length) {
      return;
    }

    const flags = readAuroraBinaryUInt32(bytes, absOffset + AURORA_BINARY_NODE_FLAGS_OFFSET);
    if (flags === null) {
      return;
    }

    if ((flags & AURORA_BINARY_NODE_FLAG_MESH) !== 0) {
      for (let index = 0; index < 3; index += 1) {
        const textureToken = readAuroraBinaryCString(
          bytes,
          absOffset + AURORA_BINARY_MESH_TEXTURES_OFFSET + index * 64,
          64
        );
        const normalized = normalizeModelTextureReference(textureToken);
        if (normalized) {
          references.add(normalized);
        }
      }
    }

    if ((flags & AURORA_BINARY_NODE_FLAG_EMITTER) !== 0) {
      const textureToken = readAuroraBinaryCString(
        bytes,
        absOffset + AURORA_BINARY_EMITTER_TEXTURE_OFFSET,
        64
      );
      const normalized = normalizeModelTextureReference(textureToken);
      if (normalized) {
        references.add(normalized);
      }
    }

    const childrenOffset = readAuroraBinaryUInt32(
      bytes,
      absOffset + AURORA_BINARY_NODE_CHILDREN_OFFSET
    );
    const childrenCount = readAuroraBinaryUInt32(
      bytes,
      absOffset + AURORA_BINARY_NODE_CHILDREN_OFFSET + 4
    );
    if (childrenOffset === null || childrenCount === null || childrenCount === 0) {
      return;
    }

    for (let index = 0; index < childrenCount; index += 1) {
      const childPosition =
        AURORA_BINARY_MODEL_BASE + childrenOffset + index * 4;
      const childOffset = readAuroraBinaryUInt32(bytes, childPosition);
      if (childOffset === null || childOffset === nodeOffset) {
        continue;
      }
      walkNode(childOffset, depth + 1);
    }
  };

  walkNode(rootNodeOffset, 0);
  return [...references].sort((left, right) => left.localeCompare(right));
}

function collectAuroraBinaryModelEmitters(bytes: Buffer): ParsedAuroraMdlEmitter[] {
  const rootNodeOffset = readAuroraBinaryUInt32(bytes, AURORA_BINARY_MODEL_BASE + 72);
  if (rootNodeOffset === null) {
    return [];
  }

  const emitters = collectAuroraBinaryEmitterNodesFromRoot(bytes, rootNodeOffset);
  return attachAuroraBinaryAnimationEmittersToBaseEmitters(
    emitters,
    collectAuroraBinaryModelAnimationEmitters(bytes)
  );
}

function collectAuroraBinaryEmitterNodesFromRoot(
  bytes: Buffer,
  rootNodeOffset: number,
  options: {
    implicitTimelineDurationSeconds?: number;
  } = {}
): ParsedAuroraMdlEmitter[] {
  const emitters: ParsedAuroraMdlEmitter[] = [];
  const visitedOffsets = new Set<number>();
  const walkNode = (nodeOffset: number, depth: number): void => {
    if (depth > 256 || visitedOffsets.has(nodeOffset)) {
      return;
    }
    visitedOffsets.add(nodeOffset);

    const absOffset = AURORA_BINARY_MODEL_BASE + nodeOffset;
    if (absOffset < AURORA_BINARY_MODEL_BASE) {
      return;
    }
    if (absOffset + AURORA_BINARY_NODE_HEADER_SIZE > bytes.length) {
      return;
    }

    const flags = readAuroraBinaryUInt32(bytes, absOffset + AURORA_BINARY_NODE_FLAGS_OFFSET);
    if (flags === null) {
      return;
    }

    if ((flags & AURORA_BINARY_NODE_FLAG_EMITTER) !== 0) {
      const texture = normalizeModelTextureReference(
        readAuroraBinaryCString(
          bytes,
          absOffset + AURORA_BINARY_EMITTER_TEXTURE_OFFSET,
          64
        )
      );
      const chunkName = normalizeAuroraModelResourceReference(
        readAuroraBinaryCString(
          bytes,
          absOffset + AURORA_BINARY_EMITTER_CHUNK_NAME_OFFSET,
          AURORA_BINARY_EMITTER_CHUNK_NAME_LENGTH
        )
      );
      const emitter: ParsedAuroraMdlEmitter = {
        nodeName:
          normalizeAuroraEmitterValue(
            readAuroraBinaryCString(
              bytes,
              absOffset + AURORA_BINARY_NODE_NAME_OFFSET,
              32
            )
          ) ?? `emitter_${emitters.length + 1}`
      };
      const emitterType = normalizeAuroraEmitterValue(
        readAuroraBinaryCString(bytes, absOffset + AURORA_BINARY_EMITTER_TYPE_OFFSET, 64)
      );
      const renderMode = normalizeAuroraEmitterValue(
        readAuroraBinaryCString(bytes, absOffset + AURORA_BINARY_EMITTER_RENDER_MODE_OFFSET, 64)
      );
      const blendMode = normalizeAuroraEmitterValue(
        readAuroraBinaryCString(bytes, absOffset + AURORA_BINARY_EMITTER_BLEND_MODE_OFFSET, 64)
      );
      if (texture) {
        emitter.texture = texture;
      }
      if (chunkName) {
        emitter.chunkName = chunkName;
      }
      if (emitterType) {
        emitter.emitterType = emitterType;
      }
      if (renderMode) {
        emitter.renderMode = renderMode;
      }
      if (blendMode) {
        emitter.blendMode = blendMode;
      }
      const atlas = readAuroraBinaryEmitterAtlas(bytes, absOffset);
      if (atlas) {
        emitter.atlas = atlas;
      }
      const simulation = readAuroraBinaryEmitterSimulation(bytes, absOffset, {
        implicitTimelineDurationSeconds: options.implicitTimelineDurationSeconds
      });
      if (simulation) {
        emitter.simulation = simulation;
      }
      const emitterFlags =
        readAuroraBinaryUInt32(bytes, absOffset + AURORA_BINARY_EMITTER_FLAGS_OFFSET) ?? 0;
      const sourceState = buildAuroraEmitterSourceState({
        twoSidedTexture:
          (readAuroraBinaryUInt32(
            bytes,
            absOffset + AURORA_BINARY_EMITTER_TWO_SIDED_TEX_OFFSET
          ) ?? 0) !== 0,
        loop:
          (readAuroraBinaryUInt32(bytes, absOffset + AURORA_BINARY_EMITTER_LOOP_OFFSET) ?? 0) !==
          0,
        renderOrder: readAuroraBinaryInt16(
          bytes,
          absOffset + AURORA_BINARY_EMITTER_RENDER_ORDER_OFFSET
        ) ?? undefined,
        isTinted: (emitterFlags & AURORA_BINARY_EMITTER_FLAG_IS_TINTED) !== 0,
        splat: (emitterFlags & AURORA_BINARY_EMITTER_FLAG_SPLAT) !== 0
      });
      if (sourceState) {
        emitter.sourceState = sourceState;
      }
      const transform = readAuroraBinaryEmitterTransform(bytes, absOffset);
      if (transform) {
        emitter.transform = transform;
      }
      const referenceNodes = readAuroraBinaryEmitterReferenceNodes(bytes, absOffset, emitter.nodeName);
      if (referenceNodes.length > 0) {
        emitter.referenceNodes = referenceNodes;
      }
      emitters.push(emitter);
    }

    const childrenOffset = readAuroraBinaryUInt32(
      bytes,
      absOffset + AURORA_BINARY_NODE_CHILDREN_OFFSET
    );
    const childrenCount = readAuroraBinaryUInt32(
      bytes,
      absOffset + AURORA_BINARY_NODE_CHILDREN_OFFSET + 4
    );
    if (childrenOffset === null || childrenCount === null || childrenCount === 0) {
      return;
    }

    for (let index = 0; index < childrenCount; index += 1) {
      const childPosition =
        AURORA_BINARY_MODEL_BASE + childrenOffset + index * 4;
      const childOffset = readAuroraBinaryUInt32(bytes, childPosition);
      if (childOffset === null || childOffset === nodeOffset) {
        continue;
      }
      walkNode(childOffset, depth + 1);
    }
  };

  walkNode(rootNodeOffset, 0);
  return emitters;
}

interface AuroraBinaryModelAnimationEmitterTrack {
  nodeName: string;
  animation: ParsedAuroraMdlEmitterAnimation;
}

function collectAuroraBinaryModelAnimationEmitters(
  bytes: Buffer
): AuroraBinaryModelAnimationEmitterTrack[] {
  const animations = readAuroraBinaryArrayHeader(
    bytes,
    AURORA_BINARY_MODEL_BASE + AURORA_BINARY_MODEL_ANIMATIONS_OFFSET
  );
  if (!animations || animations.count < 1) {
    return [];
  }

  const emitterAnimations: AuroraBinaryModelAnimationEmitterTrack[] = [];
  for (let index = 0; index < animations.count; index += 1) {
    const animationOffsetPosition =
      AURORA_BINARY_MODEL_BASE + animations.offset + index * 4;
    const animationOffset = readAuroraBinaryUInt32(bytes, animationOffsetPosition);
    if (animationOffset === null) {
      continue;
    }
    const animationAbsOffset = AURORA_BINARY_MODEL_BASE + animationOffset;
    if (
      animationAbsOffset < AURORA_BINARY_MODEL_BASE ||
      animationAbsOffset + AURORA_BINARY_ANIMATION_ROOT_NODE_OFFSET + 4 > bytes.length
    ) {
      continue;
    }

    const animationName = normalizeAuroraEmitterValue(
      readAuroraBinaryCString(
        bytes,
        animationAbsOffset + AURORA_BINARY_ANIMATION_NAME_OFFSET,
        AURORA_BINARY_ANIMATION_NAME_LENGTH
      )
    );
    if (!animationName) {
      continue;
    }
    const lengthSeconds = sanitizeAuroraEmitterNonNegativeNumber(
      readAuroraBinaryFloat32(bytes, animationAbsOffset)
    );
    const transitionSeconds = sanitizeAuroraEmitterNonNegativeNumber(
      readAuroraBinaryFloat32(bytes, animationAbsOffset + 4)
    );
    const rootNodeOffset = readAuroraBinaryUInt32(
      bytes,
      animationAbsOffset + AURORA_BINARY_ANIMATION_ROOT_NODE_OFFSET
    );
    if (rootNodeOffset === null) {
      continue;
    }

    const animationEmitters = collectAuroraBinaryEmitterNodesFromRoot(bytes, rootNodeOffset, {
      implicitTimelineDurationSeconds: lengthSeconds
    });
    animationEmitters.forEach((emitter) => {
      const animation = buildAuroraBinaryEmitterAnimationTrack({
        animationName,
        lengthSeconds,
        transitionSeconds,
        emitter
      });
      if (animation) {
        emitterAnimations.push({
          nodeName: emitter.nodeName,
          animation
        });
      }
    });
  }
  return emitterAnimations;
}

function buildAuroraBinaryEmitterAnimationTrack(input: {
  animationName: string;
  lengthSeconds?: number;
  transitionSeconds?: number;
  emitter: ParsedAuroraMdlEmitter;
}): ParsedAuroraMdlEmitterAnimation | undefined {
  const animationName = sanitizeAuroraEmitterString(input.animationName);
  if (!animationName || (!input.emitter.simulation && !input.emitter.transform)) {
    return undefined;
  }

  const lengthSeconds = sanitizeAuroraEmitterNonNegativeNumber(input.lengthSeconds);
  const transitionSeconds = sanitizeAuroraEmitterNonNegativeNumber(input.transitionSeconds);
  return {
    animationName,
    ...(lengthSeconds !== undefined ? { lengthSeconds } : {}),
    ...(transitionSeconds !== undefined ? { transitionSeconds } : {}),
    ...(input.emitter.simulation ? { simulation: input.emitter.simulation } : {}),
    ...(input.emitter.transform ? { transform: input.emitter.transform } : {})
  };
}

function attachAuroraBinaryAnimationEmittersToBaseEmitters(
  emitters: ParsedAuroraMdlEmitter[],
  animationEmitters: AuroraBinaryModelAnimationEmitterTrack[]
): ParsedAuroraMdlEmitter[] {
  if (emitters.length === 0 || animationEmitters.length === 0) {
    return emitters;
  }

  const emittersByName = new Map(
    emitters
      .map((emitter): [string, ParsedAuroraMdlEmitter] | null => {
        const key = normalizeAuroraNodeLookupName(emitter.nodeName);
        return key ? [key, emitter] : null;
      })
      .filter((entry): entry is [string, ParsedAuroraMdlEmitter] => Boolean(entry))
  );

  animationEmitters.forEach((animationEmitter) => {
    const key = normalizeAuroraNodeLookupName(animationEmitter.nodeName);
    const targetEmitter = key ? emittersByName.get(key) : undefined;
    if (!targetEmitter) {
      return;
    }
    targetEmitter.animations = [
      ...(targetEmitter.animations ?? []),
      animationEmitter.animation
    ];
  });

  return emitters;
}

function collectAuroraAsciiModelEmitters(bytes: Buffer): ParsedAuroraMdlEmitter[] {
  const emitters: ParsedAuroraMdlEmitter[] = [];
  const referenceNodes: ParsedAuroraMdlReferenceNode[] = [];
  const animationEvents: ParsedAuroraMdlEmitterAnimationEvent[] = [];
  const lines = bytes.toString("latin1").split(/\r?\n/u);
  const nodeStack: Array<
    | { kind: "emitter"; emitter: ParsedAuroraMdlEmitter }
    | { kind: "reference"; reference: ParsedAuroraMdlReferenceNode }
    | { kind: "other" }
  > = [];
  let currentAnimationName: string | undefined;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex] ?? "";
    const withoutComments = line
      .replace(/\/\/.*$/u, "")
      .replace(/;.*$/u, "")
      .trim();
    if (!withoutComments) {
      continue;
    }

    const tokens = withoutComments.split(/\s+/u);
    const key = tokens[0]?.toLowerCase();
    if (!key) {
      continue;
    }

    if (key === "newanim") {
      currentAnimationName = normalizeAuroraEmitterValue(tokens[1] ?? "");
      continue;
    }

    if (key === "doneanim") {
      currentAnimationName = undefined;
      continue;
    }

    if (key === "event") {
      const eventTime = readAuroraNumberValue(tokens[1] ?? "");
      const eventType = normalizeAuroraEmitterValue(tokens.slice(2).join(" "));
      const event = buildAuroraEmitterAnimationEvent({
        time: eventTime,
        type: eventType,
        animationName: currentAnimationName
      });
      if (event) {
        animationEvents.push(event);
      }
      continue;
    }

    if (key === "node" && tokens[1]?.toLowerCase() === "emitter") {
      nodeStack.push({
        kind: "emitter",
        emitter: {
          nodeName: normalizeAuroraEmitterValue(tokens.slice(2).join(" ")) ??
            `emitter_${emitters.length + 1}`
        }
      });
      continue;
    }

    if (key === "node" && tokens[1]?.toLowerCase() === "reference") {
      nodeStack.push({
        kind: "reference",
        reference: {
          nodeName: normalizeAuroraEmitterValue(tokens.slice(2).join(" ")) ??
            `reference_${referenceNodes.length + 1}`,
          parentNodeName: resolveNearestOpenAuroraAsciiEmitterName(nodeStack)
        }
      });
      continue;
    }

    if (key === "node") {
      nodeStack.push({ kind: "other" });
      continue;
    }

    if (key === "endnode" || (key === "end" && tokens[1]?.toLowerCase() === "node")) {
      const currentNode = nodeStack.pop();
      if (currentNode?.kind === "emitter") {
        emitters.push(currentNode.emitter);
      } else if (currentNode?.kind === "reference") {
        const referenceNode = buildAuroraEmitterReferenceNode(currentNode.reference);
        if (referenceNode) {
          referenceNodes.push(referenceNode);
        }
      }
      continue;
    }

    const currentNode = nodeStack[nodeStack.length - 1];
    if (!currentNode) {
      continue;
    }

    const rawValue = tokens.slice(1).join(" ");
    if (!rawValue) {
      continue;
    }

    if (currentNode.kind === "reference") {
      if (key === "parent") {
        const parentNodeName = normalizeAuroraEmitterValue(rawValue);
        if (parentNodeName) {
          currentNode.reference.parentNodeName = parentNodeName;
        }
        continue;
      }

      if (key === "position") {
        setAuroraReferenceTransformDraftValue(
          currentNode.reference,
          "position",
          readAuroraVector3Value(rawValue)
        );
        continue;
      }

      if (key === "orientation") {
        setAuroraReferenceTransformDraftValue(
          currentNode.reference,
          "orientation",
          readAuroraOrientationValue(rawValue)
        );
      }
      continue;
    }

    if (currentNode.kind !== "emitter") {
      continue;
    }

    const current = currentNode.emitter;

    const colorTimelineKey = toAuroraEmitterSimulationColorTimelineKey(key);
    if (colorTimelineKey) {
      const timelineParse = readAuroraAsciiColorTimeline(lines, lineIndex, rawValue);
      if (timelineParse.frames.length > 0) {
        setAuroraEmitterSimulationDraftValue(
          current,
          colorTimelineKey,
          timelineParse.frames[0]?.value
        );
        setAuroraEmitterSimulationColorTimelineDraftValue(
          current,
          colorTimelineKey,
          timelineParse.frames
        );
        lineIndex = timelineParse.endLineIndex;
      }
      continue;
    }

    const simulationTimelineKey = toAuroraEmitterSimulationTimelineKey(key);
    if (simulationTimelineKey) {
      const timelineParse = readAuroraAsciiNumberTimeline(lines, lineIndex, rawValue);
      if (timelineParse.frames.length > 0) {
        setAuroraEmitterSimulationDraftValue(
          current,
          simulationTimelineKey,
          timelineParse.frames[0]?.value
        );
        setAuroraEmitterSimulationTimelineDraftValue(
          current,
          simulationTimelineKey,
          timelineParse.frames
        );
        lineIndex = timelineParse.endLineIndex;
      }
      continue;
    }

    if (key === "texture" || key === "bitmap") {
      const texture = normalizeModelTextureReference(rawValue);
      if (texture) {
        current.texture = texture;
      }
      continue;
    }

    if (key === "chunkname" || key === "chunk_name") {
      const chunkName = normalizeAuroraModelResourceReference(rawValue);
      if (chunkName) {
        current.chunkName = chunkName;
      }
      continue;
    }

    if (key === "position") {
      setAuroraEmitterTransformDraftValue(
        current,
        "position",
        readAuroraVector3Value(rawValue)
      );
      continue;
    }

    if (key === "orientation") {
      setAuroraEmitterTransformDraftValue(
        current,
        "orientation",
        readAuroraOrientationValue(rawValue)
      );
      continue;
    }

    if (key === "render" || key === "rendermode" || key === "render_mode") {
      const renderMode = normalizeAuroraEmitterValue(rawValue);
      if (renderMode) {
        current.renderMode = renderMode;
      }
      continue;
    }

    if (key === "blend" || key === "blendmode" || key === "blend_mode") {
      const blendMode = normalizeAuroraEmitterValue(rawValue);
      if (blendMode) {
        current.blendMode = blendMode;
      }
      continue;
    }

    if (
      key === "type" ||
      key === "emittertype" ||
      key === "emitter_type" ||
      key === "update"
    ) {
      const emitterType = normalizeAuroraEmitterValue(rawValue);
      if (emitterType) {
        current.emitterType = emitterType;
      }
      continue;
    }

    if (key === "xgrid" || key === "x_grid") {
      setAuroraEmitterAtlasDraftValue(current, "xGridRaw", readAuroraIntegerValue(rawValue));
      continue;
    }

    if (key === "ygrid" || key === "y_grid") {
      setAuroraEmitterAtlasDraftValue(current, "yGridRaw", readAuroraIntegerValue(rawValue));
      continue;
    }

    if (key === "fps") {
      setAuroraEmitterAtlasDraftValue(current, "fps", readAuroraNumberValue(rawValue));
      continue;
    }

    if (key === "framestart" || key === "frame_start") {
      setAuroraEmitterAtlasDraftValue(current, "frameStart", readAuroraIntegerValue(rawValue));
      continue;
    }

    if (key === "frameend" || key === "frame_end") {
      setAuroraEmitterAtlasDraftValue(current, "frameEnd", readAuroraIntegerValue(rawValue));
      continue;
    }

    if (key === "random") {
      setAuroraEmitterAtlasDraftValue(current, "random", readAuroraBooleanValue(rawValue));
      continue;
    }

    if (key === "renderorder" || key === "render_order") {
      setAuroraEmitterSourceStateDraftValue(
        current,
        "renderOrder",
        readAuroraIntegerValue(rawValue)
      );
      continue;
    }

    if (key === "renderhint" || key === "render_hint") {
      const renderHintRaw = normalizeAuroraEmitterValue(rawValue);
      setAuroraEmitterSourceStateDraftValue(current, "renderHintRaw", renderHintRaw);
      if (renderHintRaw) {
        setAuroraEmitterSourceStateDraftValue(
          current,
          "renderHintMode",
          resolveAuroraRenderHintMode(renderHintRaw)
        );
      }
      continue;
    }

    if (key === "customshadervs" || key === "custom_shader_vs") {
      setAuroraEmitterSourceStateDraftValue(
        current,
        "customShaderVS",
        normalizeAuroraEmitterValue(rawValue)
      );
      continue;
    }

    if (key === "customshaderfs" || key === "custom_shader_fs") {
      setAuroraEmitterSourceStateDraftValue(
        current,
        "customShaderFS",
        normalizeAuroraEmitterValue(rawValue)
      );
      continue;
    }

    if (key === "customshadergs" || key === "custom_shader_gs") {
      setAuroraEmitterSourceStateDraftValue(
        current,
        "customShaderGS",
        normalizeAuroraEmitterValue(rawValue)
      );
      continue;
    }

    if (key === "transparency") {
      setAuroraEmitterSourceStateDraftValue(
        current,
        "transparency",
        readAuroraBooleanValue(rawValue)
      );
      continue;
    }

    if (key === "twosided") {
      setAuroraEmitterSourceStateDraftValue(
        current,
        "twoSidedMaterial",
        readAuroraBooleanValue(rawValue)
      );
      continue;
    }

    if (key === "twosidedtex" || key === "two_sided_tex") {
      setAuroraEmitterSourceStateDraftValue(
        current,
        "twoSidedTexture",
        readAuroraBooleanValue(rawValue)
      );
      continue;
    }

    if (key === "sample_framebuffer") {
      setAuroraEmitterSourceStateDraftValue(
        current,
        "sampleFramebuffer",
        readAuroraSampleFramebufferValue(rawValue)
      );
      continue;
    }

    if (key === "volumetric") {
      setAuroraEmitterSourceStateDraftValue(
        current,
        "volumetric",
        readAuroraBooleanValue(rawValue)
      );
      continue;
    }

    if (key === "loop") {
      setAuroraEmitterSourceStateDraftValue(current, "loop", readAuroraBooleanValue(rawValue));
      continue;
    }

    if (key === "m_istinted" || key === "istinted" || key === "is_tinted") {
      setAuroraEmitterSourceStateDraftValue(
        current,
        "isTinted",
        readAuroraBooleanValue(rawValue)
      );
      continue;
    }

    if (key === "splat") {
      setAuroraEmitterSourceStateDraftValue(current, "splat", readAuroraBooleanValue(rawValue));
      continue;
    }

    if (key === "rotatetexture" || key === "rotate_texture") {
      setAuroraEmitterSourceStateDraftValue(
        current,
        "rotateTexture",
        readAuroraBooleanValue(rawValue)
      );
      continue;
    }

    const simulationBooleanKey = toAuroraEmitterSimulationBooleanKey(key);
    if (simulationBooleanKey) {
      setAuroraEmitterSimulationDraftValue(
        current,
        simulationBooleanKey,
        readAuroraBooleanValue(rawValue)
      );
      continue;
    }

    const simulationStringKey = toAuroraEmitterSimulationStringKey(key);
    if (simulationStringKey) {
      setAuroraEmitterSimulationDraftValue(
        current,
        simulationStringKey,
        normalizeAuroraEmitterValue(rawValue)
      );
      continue;
    }

    const simulationKey = toAuroraEmitterSimulationNumberKey(key);
    if (simulationKey) {
      setAuroraEmitterSimulationDraftValue(
        current,
        simulationKey,
        readAuroraNumberValue(rawValue)
      );
      continue;
    }

    const simulationColorKey = toAuroraEmitterSimulationColorKey(key);
    if (simulationColorKey) {
      setAuroraEmitterSimulationDraftValue(
        current,
        simulationColorKey,
        readAuroraVector3Value(rawValue)
      );
    }
  }

  while (nodeStack.length > 0) {
    const currentNode = nodeStack.pop();
    if (currentNode?.kind === "emitter") {
      emitters.push(currentNode.emitter);
    } else if (currentNode?.kind === "reference") {
      const referenceNode = buildAuroraEmitterReferenceNode(currentNode.reference);
      if (referenceNode) {
        referenceNodes.push(referenceNode);
      }
    }
  }

  return attachAuroraAnimationEventsToEmitters(
    attachAuroraReferenceNodesToEmitters(emitters, referenceNodes),
    animationEvents
  );
}

function collectAuroraAsciiModelLights(bytes: Buffer): ParsedAuroraMdlLight[] {
  type LightNodeDraft = ParsedAuroraMdlLight & {
    animationName?: string;
    lengthSeconds?: number;
    transitionSeconds?: number;
    positionTimeline?: ParsedAuroraMdlLightVector3Keyframe[];
    colorTimeline?: ParsedAuroraMdlLightColorKeyframe[];
    radiusTimeline?: ParsedAuroraMdlLightNumberKeyframe[];
  };

  const lights: ParsedAuroraMdlLight[] = [];
  const animationTracks: Array<{ nodeName: string; animation: ParsedAuroraMdlLightAnimation }> = [];
  const lines = bytes.toString("latin1").split(/\r?\n/u);
  const nodeStack: Array<{ kind: "light"; light: LightNodeDraft } | { kind: "other" }> = [];
  let currentAnimation:
    | {
        animationName: string;
        lengthSeconds?: number;
        transitionSeconds?: number;
      }
    | undefined;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const withoutComments = stripAuroraAsciiLineComments(lines[lineIndex] ?? "");
    if (!withoutComments) {
      continue;
    }

    const tokens = withoutComments.split(/\s+/u);
    const key = tokens[0]?.toLowerCase();
    if (!key) {
      continue;
    }

    if (key === "newanim") {
      const animationName = normalizeAuroraEmitterValue(tokens[1] ?? "");
      currentAnimation = animationName ? { animationName } : undefined;
      continue;
    }

    if (key === "doneanim") {
      currentAnimation = undefined;
      continue;
    }

    if (currentAnimation && key === "length") {
      const lengthSeconds = sanitizeAuroraEmitterNonNegativeNumber(
        readAuroraNumberValue(tokens.slice(1).join(" "))
      );
      if (lengthSeconds !== undefined) {
        currentAnimation.lengthSeconds = lengthSeconds;
      }
      continue;
    }

    if (currentAnimation && key === "transtime") {
      const transitionSeconds = sanitizeAuroraEmitterNonNegativeNumber(
        readAuroraNumberValue(tokens.slice(1).join(" "))
      );
      if (transitionSeconds !== undefined) {
        currentAnimation.transitionSeconds = transitionSeconds;
      }
      continue;
    }

    if (key === "node" && tokens[1]?.toLowerCase() === "light") {
      nodeStack.push({
        kind: "light",
        light: {
          nodeName:
            normalizeAuroraEmitterValue(tokens.slice(2).join(" ")) ??
            `light_${lights.length + animationTracks.length + 1}`,
          ...(currentAnimation?.animationName
            ? { animationName: currentAnimation.animationName }
            : {}),
          ...(currentAnimation?.lengthSeconds !== undefined
            ? { lengthSeconds: currentAnimation.lengthSeconds }
            : {}),
          ...(currentAnimation?.transitionSeconds !== undefined
            ? { transitionSeconds: currentAnimation.transitionSeconds }
            : {})
        }
      });
      continue;
    }

    if (key === "node") {
      nodeStack.push({ kind: "other" });
      continue;
    }

    if (key === "endnode" || (key === "end" && tokens[1]?.toLowerCase() === "node")) {
      const currentNode = nodeStack.pop();
      if (currentNode?.kind === "light") {
        const animation = buildAuroraLightAnimationTrack(currentNode.light);
        if (animation && currentNode.light.animationName) {
          animationTracks.push({
            nodeName: currentNode.light.nodeName,
            animation
          });
        } else {
          lights.push(buildAuroraLightNode(currentNode.light));
        }
      }
      continue;
    }

    const currentNode = nodeStack[nodeStack.length - 1];
    if (currentNode?.kind !== "light") {
      continue;
    }

    const rawValue = tokens.slice(1).join(" ");
    const current = currentNode.light;

    if (key === "parent") {
      const parentNodeName = normalizeAuroraEmitterValue(rawValue);
      if (parentNodeName) {
        current.parentNodeName = parentNodeName;
      }
      continue;
    }

    if (key === "position") {
      setAuroraLightTransformDraftValue(current, "position", readAuroraVector3Value(rawValue));
      continue;
    }

    if (key === "orientation") {
      setAuroraLightTransformDraftValue(
        current,
        "orientation",
        readAuroraOrientationValue(rawValue)
      );
      continue;
    }

    if (key === "positionkey") {
      const timelineParse = readAuroraAsciiVector3KeyframesUntilEndList(
        lines,
        lineIndex,
        rawValue
      );
      if (timelineParse.frames.length > 0) {
        current.positionTimeline = timelineParse.frames;
        lineIndex = timelineParse.endLineIndex;
      }
      continue;
    }

    if (key === "colorkey") {
      const timelineParse = readAuroraAsciiColorKeyframesUntilEndList(
        lines,
        lineIndex,
        rawValue
      );
      if (timelineParse.frames.length > 0) {
        current.colorTimeline = timelineParse.frames;
        current.color = timelineParse.frames[0]?.value ?? current.color;
        lineIndex = timelineParse.endLineIndex;
      }
      continue;
    }

    if (key === "radiuskey") {
      const timelineParse = readAuroraAsciiNumberKeyframesUntilEndList(
        lines,
        lineIndex,
        rawValue
      );
      if (timelineParse.frames.length > 0) {
        current.radiusTimeline = timelineParse.frames;
        current.radius = timelineParse.frames[0]?.value ?? current.radius;
        lineIndex = timelineParse.endLineIndex;
      }
      continue;
    }

    if (key === "radius") {
      const radius = sanitizeAuroraEmitterNonNegativeNumber(readAuroraNumberValue(rawValue));
      if (radius !== undefined) {
        current.radius = radius;
      }
      continue;
    }

    if (key === "multiplier") {
      const multiplier = sanitizeAuroraEmitterNonNegativeNumber(readAuroraNumberValue(rawValue));
      if (multiplier !== undefined) {
        current.multiplier = multiplier;
      }
      continue;
    }

    if (key === "color") {
      const color = sanitizeAuroraEmitterColor(readAuroraVector3Value(rawValue));
      if (color) {
        current.color = color;
      }
      continue;
    }

    if (key === "ambientonly") {
      const ambientOnly = sanitizeAuroraEmitterBoolean(readAuroraBooleanValue(rawValue));
      if (ambientOnly !== undefined) {
        current.ambientOnly = ambientOnly;
      }
      continue;
    }

    if (key === "ndynamictype" || key === "dynamictype") {
      const dynamicType = sanitizeAuroraEmitterNonNegativeInteger(
        readAuroraIntegerValue(rawValue)
      );
      if (dynamicType !== undefined) {
        current.dynamicType = dynamicType;
      }
      continue;
    }

    if (key === "affectdynamic") {
      const affectDynamic = sanitizeAuroraEmitterBoolean(readAuroraBooleanValue(rawValue));
      if (affectDynamic !== undefined) {
        current.affectDynamic = affectDynamic;
      }
      continue;
    }

    if (key === "shadow") {
      const shadow = sanitizeAuroraEmitterBoolean(readAuroraBooleanValue(rawValue));
      if (shadow !== undefined) {
        current.shadow = shadow;
      }
      continue;
    }

    if (key === "lightpriority") {
      const lightPriority = sanitizeAuroraEmitterNonNegativeInteger(
        readAuroraIntegerValue(rawValue)
      );
      if (lightPriority !== undefined) {
        current.lightPriority = lightPriority;
      }
      continue;
    }

    if (key === "lensflares") {
      const lensFlares = sanitizeAuroraEmitterBoolean(readAuroraBooleanValue(rawValue));
      if (lensFlares !== undefined) {
        current.lensFlares = lensFlares;
      }
      continue;
    }

    if (key === "fadinglight") {
      const fadingLight = sanitizeAuroraEmitterBoolean(readAuroraBooleanValue(rawValue));
      if (fadingLight !== undefined) {
        current.fadingLight = fadingLight;
      }
    }
  }

  while (nodeStack.length > 0) {
    const currentNode = nodeStack.pop();
    if (currentNode?.kind !== "light") {
      continue;
    }
    const animation = buildAuroraLightAnimationTrack(currentNode.light);
    if (animation && currentNode.light.animationName) {
      animationTracks.push({
        nodeName: currentNode.light.nodeName,
        animation
      });
    } else {
      lights.push(buildAuroraLightNode(currentNode.light));
    }
  }

  return attachAuroraLightAnimationsToLights(lights, animationTracks);
}

function buildAuroraLightNode(light: ParsedAuroraMdlLight): ParsedAuroraMdlLight {
  return {
    nodeName: light.nodeName,
    ...(light.parentNodeName ? { parentNodeName: light.parentNodeName } : {}),
    ...(light.transform ? { transform: light.transform } : {}),
    ...(light.radius !== undefined ? { radius: light.radius } : {}),
    ...(light.multiplier !== undefined ? { multiplier: light.multiplier } : {}),
    ...(light.color ? { color: light.color } : {}),
    ...(light.ambientOnly !== undefined ? { ambientOnly: light.ambientOnly } : {}),
    ...(light.dynamicType !== undefined ? { dynamicType: light.dynamicType } : {}),
    ...(light.affectDynamic !== undefined ? { affectDynamic: light.affectDynamic } : {}),
    ...(light.shadow !== undefined ? { shadow: light.shadow } : {}),
    ...(light.lightPriority !== undefined ? { lightPriority: light.lightPriority } : {}),
    ...(light.lensFlares !== undefined ? { lensFlares: light.lensFlares } : {}),
    ...(light.fadingLight !== undefined ? { fadingLight: light.fadingLight } : {}),
    ...(light.animations && light.animations.length > 0 ? { animations: light.animations } : {})
  };
}

function buildAuroraLightAnimationTrack(input: {
  animationName?: string;
  lengthSeconds?: number;
  transitionSeconds?: number;
  positionTimeline?: ParsedAuroraMdlLightVector3Keyframe[];
  colorTimeline?: ParsedAuroraMdlLightColorKeyframe[];
  radiusTimeline?: ParsedAuroraMdlLightNumberKeyframe[];
}): ParsedAuroraMdlLightAnimation | undefined {
  const animationName = sanitizeAuroraEmitterString(input.animationName);
  if (
    !animationName ||
    (!input.positionTimeline && !input.colorTimeline && !input.radiusTimeline)
  ) {
    return undefined;
  }
  const lengthSeconds = sanitizeAuroraEmitterNonNegativeNumber(input.lengthSeconds);
  const transitionSeconds = sanitizeAuroraEmitterNonNegativeNumber(input.transitionSeconds);
  return {
    animationName,
    ...(lengthSeconds !== undefined ? { lengthSeconds } : {}),
    ...(transitionSeconds !== undefined ? { transitionSeconds } : {}),
    ...(input.positionTimeline ? { positionTimeline: input.positionTimeline } : {}),
    ...(input.colorTimeline ? { colorTimeline: input.colorTimeline } : {}),
    ...(input.radiusTimeline ? { radiusTimeline: input.radiusTimeline } : {})
  };
}

function attachAuroraLightAnimationsToLights(
  lights: ParsedAuroraMdlLight[],
  animationTracks: Array<{ nodeName: string; animation: ParsedAuroraMdlLightAnimation }>
): ParsedAuroraMdlLight[] {
  if (animationTracks.length === 0) {
    return lights;
  }
  const lightsByName = new Map(
    lights
      .map((light): [string, ParsedAuroraMdlLight] | null => {
        const key = normalizeAuroraNodeLookupName(light.nodeName);
        return key ? [key, light] : null;
      })
      .filter((entry): entry is [string, ParsedAuroraMdlLight] => Boolean(entry))
  );

  animationTracks.forEach((track) => {
    const key = normalizeAuroraNodeLookupName(track.nodeName);
    const targetLight = key ? lightsByName.get(key) : undefined;
    if (!targetLight) {
      return;
    }
    targetLight.animations = [
      ...(targetLight.animations ?? []),
      track.animation
    ];
  });

  return lights;
}

function resolveNearestOpenAuroraAsciiEmitterName(
  nodeStack: Array<
    | { kind: "emitter"; emitter: ParsedAuroraMdlEmitter }
    | { kind: "reference"; reference: ParsedAuroraMdlReferenceNode }
    | { kind: "other" }
  >
): string | undefined {
  for (let index = nodeStack.length - 1; index >= 0; index -= 1) {
    const node = nodeStack[index];
    if (node?.kind === "emitter") {
      return node.emitter.nodeName;
    }
  }
  return undefined;
}

function attachAuroraReferenceNodesToEmitters(
  emitters: ParsedAuroraMdlEmitter[],
  referenceNodes: ParsedAuroraMdlReferenceNode[]
): ParsedAuroraMdlEmitter[] {
  if (referenceNodes.length === 0 || emitters.length === 0) {
    return emitters;
  }
  const emittersByName = new Map(
    emitters
      .map((emitter): [string, ParsedAuroraMdlEmitter] | null => {
        const key = normalizeAuroraNodeLookupName(emitter.nodeName);
        return key ? [key, emitter] : null;
      })
      .filter((entry): entry is [string, ParsedAuroraMdlEmitter] => Boolean(entry))
  );

  referenceNodes.forEach((referenceNode) => {
    const parentKey = normalizeAuroraNodeLookupName(referenceNode.parentNodeName);
    const targetEmitter =
      (parentKey ? emittersByName.get(parentKey) : undefined) ??
      (emitters.length === 1 ? emitters[0] : undefined);
    if (!targetEmitter) {
      return;
    }
    targetEmitter.referenceNodes = [
      ...(targetEmitter.referenceNodes ?? []),
      referenceNode
    ];
  });

  return emitters;
}

function attachAuroraAnimationEventsToEmitters(
  emitters: ParsedAuroraMdlEmitter[],
  events: ParsedAuroraMdlEmitterAnimationEvent[]
): ParsedAuroraMdlEmitter[] {
  if (events.length === 0 || emitters.length === 0) {
    return emitters;
  }
  emitters.forEach((emitter) => {
    const mergedEvents = sanitizeAuroraEmitterAnimationEvents([
      ...(emitter.events ?? []),
      ...events
    ]);
    if (mergedEvents) {
      emitter.events = mergedEvents;
    }
  });
  return emitters;
}

function buildAuroraEmitterAnimationEvent(input: {
  time?: number;
  type?: string;
  animationName?: string;
}): ParsedAuroraMdlEmitterAnimationEvent | undefined {
  const time = sanitizeAuroraEmitterNonNegativeNumber(input.time);
  const type = sanitizeAuroraEmitterString(input.type);
  const animationName = sanitizeAuroraEmitterString(input.animationName);
  if (time === undefined || !type) {
    return undefined;
  }
  return {
    time,
    type,
    ...(animationName ? { animationName } : {})
  };
}

function sanitizeAuroraEmitterAnimationEvents(
  value: unknown
): ParsedAuroraMdlEmitterAnimationEvent[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const events = value
    .map((entry): ParsedAuroraMdlEmitterAnimationEvent | undefined => {
      if (typeof entry !== "object" || entry === null) {
        return undefined;
      }
      const candidate = entry as { time?: unknown; type?: unknown; animationName?: unknown };
      return buildAuroraEmitterAnimationEvent({
        time: typeof candidate.time === "number" ? candidate.time : undefined,
        type: typeof candidate.type === "string" ? candidate.type : undefined,
        animationName:
          typeof candidate.animationName === "string" ? candidate.animationName : undefined
      });
    })
    .filter((event): event is ParsedAuroraMdlEmitterAnimationEvent => Boolean(event))
    .sort((left, right) => left.time - right.time);
  return events.length > 0 ? events : undefined;
}

function stripAuroraAsciiLineComments(line: string): string {
  return line
    .replace(/\/\/.*$/u, "")
    .replace(/;.*$/u, "")
    .trim();
}

function readAuroraNumberList(value: string): number[] {
  return value
    .trim()
    .split(/[\s,]+/u)
    .map((part) => Number.parseFloat(part))
    .filter((part) => Number.isFinite(part));
}

function readAuroraAsciiNumberTimeline(
  lines: string[],
  keyLineIndex: number,
  rawValue: string
): { frames: ParsedAuroraMdlEmitterNumberKeyframe[]; endLineIndex: number } {
  const headerValues = readAuroraNumberList(rawValue);
  const declaredFrameCount = Math.max(0, Math.trunc(headerValues[0] ?? 0));
  const frames: ParsedAuroraMdlEmitterNumberKeyframe[] = [];

  const appendFrameValues = (values: number[]): void => {
    if (values.length < 2) {
      return;
    }
    frames.push({
      time: values[0]!,
      value: values[1]!
    });
  };

  for (let index = 1; index + 1 < headerValues.length; index += 2) {
    appendFrameValues([headerValues[index]!, headerValues[index + 1]!]);
  }

  let lineIndex = keyLineIndex;
  while (
    frames.length < declaredFrameCount &&
    lineIndex + 1 < lines.length
  ) {
    lineIndex += 1;
    const candidate = stripAuroraAsciiLineComments(lines[lineIndex] ?? "");
    if (!candidate) {
      continue;
    }
    const values = readAuroraNumberList(candidate);
    if (values.length < 2) {
      lineIndex -= 1;
      break;
    }
    appendFrameValues(values);
  }

  return {
    frames,
    endLineIndex: lineIndex
  };
}

function readAuroraAsciiColorTimeline(
  lines: string[],
  keyLineIndex: number,
  rawValue: string
): { frames: ParsedAuroraMdlEmitterColorKeyframe[]; endLineIndex: number } {
  const headerValues = readAuroraNumberList(rawValue);
  const declaredFrameCount = Math.max(0, Math.trunc(headerValues[0] ?? 0));
  const frames: ParsedAuroraMdlEmitterColorKeyframe[] = [];

  const appendFrameValues = (values: number[]): void => {
    if (values.length < 4) {
      return;
    }
    frames.push({
      time: values[0]!,
      value: [values[1]!, values[2]!, values[3]!]
    });
  };

  for (let index = 1; index + 3 < headerValues.length; index += 4) {
    appendFrameValues([
      headerValues[index]!,
      headerValues[index + 1]!,
      headerValues[index + 2]!,
      headerValues[index + 3]!
    ]);
  }

  let lineIndex = keyLineIndex;
  while (
    frames.length < declaredFrameCount &&
    lineIndex + 1 < lines.length
  ) {
    lineIndex += 1;
    const candidate = stripAuroraAsciiLineComments(lines[lineIndex] ?? "");
    if (!candidate) {
      continue;
    }
    const values = readAuroraNumberList(candidate);
    if (values.length < 4) {
      lineIndex -= 1;
      break;
    }
    appendFrameValues(values);
  }

  return {
    frames,
    endLineIndex: lineIndex
  };
}

function readAuroraAsciiKeyframeRowsUntilEndList(
  lines: string[],
  keyLineIndex: number,
  rawValue: string,
  columnCount: number
): { rows: number[][]; endLineIndex: number } {
  const headerValues = readAuroraNumberList(rawValue);
  const declaredFrameCount =
    headerValues.length > 0 && headerValues.length % columnCount !== 0
      ? Math.max(0, Math.trunc(headerValues[0] ?? 0))
      : undefined;
  const startIndex = declaredFrameCount === undefined ? 0 : 1;
  const rows: number[][] = [];
  const appendChunks = (values: number[], start = 0): void => {
    for (let index = start; index + columnCount - 1 < values.length; index += columnCount) {
      rows.push(values.slice(index, index + columnCount));
    }
  };

  appendChunks(headerValues, startIndex);

  let lineIndex = keyLineIndex;
  while (
    lineIndex + 1 < lines.length &&
    (declaredFrameCount === undefined || rows.length < declaredFrameCount)
  ) {
    lineIndex += 1;
    const candidate = stripAuroraAsciiLineComments(lines[lineIndex] ?? "");
    if (!candidate) {
      continue;
    }
    if (/^endlist\b/iu.test(candidate)) {
      break;
    }
    const values = readAuroraNumberList(candidate);
    if (values.length < columnCount) {
      lineIndex -= 1;
      break;
    }
    appendChunks(values);
  }

  return {
    rows,
    endLineIndex: lineIndex
  };
}

function readAuroraAsciiNumberKeyframesUntilEndList(
  lines: string[],
  keyLineIndex: number,
  rawValue: string
): { frames: ParsedAuroraMdlLightNumberKeyframe[]; endLineIndex: number } {
  const parsed = readAuroraAsciiKeyframeRowsUntilEndList(lines, keyLineIndex, rawValue, 2);
  const frames = parsed.rows
    .map((row): ParsedAuroraMdlLightNumberKeyframe | null => {
      const time = sanitizeAuroraEmitterNonNegativeNumber(row[0]);
      const value = sanitizeAuroraEmitterFiniteNumber(row[1]);
      return time !== undefined && value !== undefined ? { time, value } : null;
    })
    .filter((frame): frame is ParsedAuroraMdlLightNumberKeyframe => frame !== null);
  return {
    frames,
    endLineIndex: parsed.endLineIndex
  };
}

function readAuroraAsciiColorKeyframesUntilEndList(
  lines: string[],
  keyLineIndex: number,
  rawValue: string
): { frames: ParsedAuroraMdlLightColorKeyframe[]; endLineIndex: number } {
  const parsed = readAuroraAsciiKeyframeRowsUntilEndList(lines, keyLineIndex, rawValue, 4);
  const frames = parsed.rows
    .map((row): ParsedAuroraMdlLightColorKeyframe | null => {
      const time = sanitizeAuroraEmitterNonNegativeNumber(row[0]);
      const color = sanitizeAuroraEmitterColor([row[1], row[2], row[3]]);
      return time !== undefined && color ? { time, value: color } : null;
    })
    .filter((frame): frame is ParsedAuroraMdlLightColorKeyframe => frame !== null);
  return {
    frames,
    endLineIndex: parsed.endLineIndex
  };
}

function readAuroraAsciiVector3KeyframesUntilEndList(
  lines: string[],
  keyLineIndex: number,
  rawValue: string
): { frames: ParsedAuroraMdlLightVector3Keyframe[]; endLineIndex: number } {
  const parsed = readAuroraAsciiKeyframeRowsUntilEndList(lines, keyLineIndex, rawValue, 4);
  const frames = parsed.rows
    .map((row): ParsedAuroraMdlLightVector3Keyframe | null => {
      const time = sanitizeAuroraEmitterNonNegativeNumber(row[0]);
      const vector = sanitizeAuroraEmitterColor([row[1], row[2], row[3]]);
      return time !== undefined && vector ? { time, value: vector } : null;
    })
    .filter((frame): frame is ParsedAuroraMdlLightVector3Keyframe => frame !== null);
  return {
    frames,
    endLineIndex: parsed.endLineIndex
  };
}

function toAuroraEmitterSimulationNumberKey(
  key: string
):
  | "birthrate"
  | "xSize"
  | "ySize"
  | "spawnType"
  | "lifeExp"
  | "mass"
  | "velocity"
  | "randvel"
  | "spread"
  | "particleRot"
  | "bounceCoefficient"
  | "blastRadius"
  | "blastLength"
  | "blurLength"
  | "detonate"
  | "fps"
  | "frameStart"
  | "frameEnd"
  | "lightningScale"
  | "lightningDelay"
  | "lightningRadius"
  | "deadspace"
  | "p2pBezier2"
  | "p2pBezier3"
  | "p2pSource"
  | "p2pTarget"
  | "combineTime"
  | "grav"
  | "drag"
  | "threshold"
  | "sizeStart"
  | "sizeMid"
  | "sizeEnd"
  | "sizeStartY"
  | "sizeMidY"
  | "sizeEndY"
  | "percentStart"
  | "percentMid"
  | "percentEnd"
  | "alphaStart"
  | "alphaMid"
  | "alphaEnd"
  | undefined {
  switch (key) {
    case "xsize":
    case "x_size":
      return "xSize";
    case "ysize":
    case "y_size":
      return "ySize";
    case "spawntype":
    case "spawn_type":
      return "spawnType";
    case "birthrate":
      return "birthrate";
    case "lifeexp":
    case "life_exp":
      return "lifeExp";
    case "mass":
      return "mass";
    case "velocity":
      return "velocity";
    case "randvel":
    case "rand_vel":
      return "randvel";
    case "spread":
      return "spread";
    case "particlerot":
    case "particle_rot":
      return "particleRot";
    case "bounceco":
    case "bounce_co":
      return "bounceCoefficient";
    case "blastradius":
    case "blast_radius":
      return "blastRadius";
    case "blastlength":
    case "blast_length":
      return "blastLength";
    case "blurlength":
    case "blur_length":
      return "blurLength";
    case "detonate":
      return "detonate";
    case "fps":
      return "fps";
    case "framestart":
    case "frame_start":
      return "frameStart";
    case "frameend":
    case "frame_end":
      return "frameEnd";
    case "lightningscale":
    case "lightning_scale":
      return "lightningScale";
    case "lightningdelay":
    case "lightning_delay":
      return "lightningDelay";
    case "lightningradius":
    case "lightning_radius":
      return "lightningRadius";
    case "deadspace":
    case "dead_space":
      return "deadspace";
    case "p2pbezier2":
    case "p2p_bezier2":
      return "p2pBezier2";
    case "p2pbezier3":
    case "p2p_bezier3":
      return "p2pBezier3";
    case "src":
    case "p2psrc":
    case "p2p_src":
      return "p2pSource";
    case "target":
    case "p2ptarget":
    case "p2p_target":
      return "p2pTarget";
    case "combinetime":
    case "combine_time":
      return "combineTime";
    case "grav":
      return "grav";
    case "drag":
      return "drag";
    case "threshold":
      return "threshold";
    case "sizestart":
    case "size_start":
      return "sizeStart";
    case "sizemid":
    case "size_mid":
      return "sizeMid";
    case "sizeend":
    case "size_end":
      return "sizeEnd";
    case "sizestart_y":
    case "size_start_y":
      return "sizeStartY";
    case "sizemid_y":
    case "size_mid_y":
      return "sizeMidY";
    case "sizeend_y":
    case "size_end_y":
      return "sizeEndY";
    case "percentstart":
    case "percent_start":
      return "percentStart";
    case "percentmid":
    case "percent_mid":
      return "percentMid";
    case "percentend":
    case "percent_end":
      return "percentEnd";
    case "alphastart":
    case "alpha_start":
      return "alphaStart";
    case "alphamid":
    case "alpha_mid":
      return "alphaMid";
    case "alphaend":
    case "alpha_end":
      return "alphaEnd";
    default:
      return undefined;
  }
}

function toAuroraEmitterSimulationTimelineKey(
  key: string
): ParsedAuroraMdlEmitterSimulationTimelineKey | undefined {
  const normalized = key.trim().toLowerCase().replace(/[\s-]+/gu, "_");
  const withoutSuffix = normalized.endsWith("bezierkey")
    ? normalized.slice(0, -"bezierkey".length)
    : normalized.endsWith("key")
      ? normalized.slice(0, -"key".length)
      : undefined;
  if (!withoutSuffix) {
    return undefined;
  }
  const simulationKey = toAuroraEmitterSimulationNumberKey(withoutSuffix);
  return isAuroraEmitterSimulationTimelineKey(simulationKey)
    ? simulationKey
    : undefined;
}

function toAuroraEmitterSimulationColorTimelineKey(
  key: string
): ParsedAuroraMdlEmitterColorTimelineKey | undefined {
  const normalized = key.trim().toLowerCase().replace(/[\s-]+/gu, "_");
  const withoutSuffix = normalized.endsWith("bezierkey")
    ? normalized.slice(0, -"bezierkey".length)
    : normalized.endsWith("key")
      ? normalized.slice(0, -"key".length)
      : undefined;
  if (!withoutSuffix) {
    return undefined;
  }
  return toAuroraEmitterSimulationColorKey(withoutSuffix);
}

function toAuroraEmitterSimulationBooleanKey(
  key: string
):
  | "bounce"
  | "p2p"
  | "inherit"
  | "inheritVel"
  | "inheritLocal"
  | "inheritPart"
  | "affectedByWind"
  | undefined {
  switch (key) {
    case "bounce":
      return "bounce";
    case "p2p":
      return "p2p";
    case "inherit":
      return "inherit";
    case "inheritvel":
    case "inherit_vel":
      return "inheritVel";
    case "inheritlocal":
    case "inherit_local":
      return "inheritLocal";
    case "inheritpart":
    case "inherit_part":
      return "inheritPart";
    case "affectedbywind":
    case "affected_by_wind":
      return "affectedByWind";
    default:
      return undefined;
  }
}

function toAuroraEmitterSimulationStringKey(key: string): "p2pType" | undefined {
  switch (key) {
    case "p2psel":
    case "p2p_sel":
      return "p2pType";
    default:
      return undefined;
  }
}

function toAuroraEmitterSimulationColorKey(
  key: string
): "colorStart" | "colorMid" | "colorEnd" | undefined {
  switch (key) {
    case "colorstart":
    case "color_start":
      return "colorStart";
    case "colormid":
    case "color_mid":
      return "colorMid";
    case "colorend":
    case "color_end":
      return "colorEnd";
    default:
      return undefined;
  }
}

function setAuroraEmitterSimulationDraftValue(
  emitter: ParsedAuroraMdlEmitter,
  key: keyof NonNullable<ParsedAuroraMdlEmitter["simulation"]>,
  value: number | boolean | string | [number, number, number] | undefined
): void {
  if (value === undefined) {
    return;
  }
  const simulation = buildAuroraEmitterSimulation({
    ...emitter.simulation,
    [key]: value
  });
  if (simulation) {
    emitter.simulation = simulation;
  }
}

function setAuroraEmitterSimulationTimelineDraftValue(
  emitter: ParsedAuroraMdlEmitter,
  key: ParsedAuroraMdlEmitterSimulationTimelineKey,
  frames: ParsedAuroraMdlEmitterNumberKeyframe[]
): void {
  const simulation = buildAuroraEmitterSimulation({
    ...emitter.simulation,
    timeline: {
      ...emitter.simulation?.timeline,
      [key]: frames
    }
  });
  if (simulation) {
    emitter.simulation = simulation;
  }
}

function setAuroraEmitterSimulationColorTimelineDraftValue(
  emitter: ParsedAuroraMdlEmitter,
  key: ParsedAuroraMdlEmitterColorTimelineKey,
  frames: ParsedAuroraMdlEmitterColorKeyframe[]
): void {
  const simulation = buildAuroraEmitterSimulation({
    ...emitter.simulation,
    colorTimeline: {
      ...emitter.simulation?.colorTimeline,
      [key]: frames
    }
  });
  if (simulation) {
    emitter.simulation = simulation;
  }
}

function buildAuroraEmitterSimulation(
  input: NonNullable<ParsedAuroraMdlEmitter["simulation"]>
): ParsedAuroraMdlEmitter["simulation"] {
  const xSize = sanitizeAuroraEmitterNonNegativeNumber(input.xSize);
  const ySize = sanitizeAuroraEmitterNonNegativeNumber(input.ySize);
  const spawnType = sanitizeAuroraEmitterNonNegativeInteger(input.spawnType);
  const birthrate = sanitizeAuroraEmitterNonNegativeNumber(input.birthrate);
  const lifeExp = sanitizeAuroraEmitterNonNegativeNumber(input.lifeExp);
  const mass = sanitizeAuroraEmitterFiniteNumber(input.mass);
  const velocity = sanitizeAuroraEmitterFiniteNumber(input.velocity);
  const randvel = sanitizeAuroraEmitterNonNegativeNumber(input.randvel);
  const spread = sanitizeAuroraEmitterNonNegativeNumber(input.spread);
  const particleRot = sanitizeAuroraEmitterFiniteNumber(input.particleRot);
  const bounce = sanitizeAuroraEmitterBoolean(input.bounce);
  const bounceCoefficient = sanitizeAuroraEmitterFiniteNumber(input.bounceCoefficient);
  const blastRadius = sanitizeAuroraEmitterNonNegativeNumber(input.blastRadius);
  const blastLength = sanitizeAuroraEmitterNonNegativeNumber(input.blastLength);
  const blurLength = sanitizeAuroraEmitterNonNegativeNumber(input.blurLength);
  const detonate = sanitizeAuroraEmitterNonNegativeNumber(input.detonate);
  const fps = sanitizeAuroraEmitterNonNegativeNumber(input.fps);
  const frameStart = sanitizeAuroraEmitterNonNegativeNumber(input.frameStart);
  const frameEnd = sanitizeAuroraEmitterNonNegativeNumber(input.frameEnd);
  const lightningScale = sanitizeAuroraEmitterNonNegativeNumber(input.lightningScale);
  const lightningDelay = sanitizeAuroraEmitterNonNegativeNumber(input.lightningDelay);
  const lightningRadius = sanitizeAuroraEmitterNonNegativeNumber(input.lightningRadius);
  const deadspace = sanitizeAuroraEmitterFiniteNumber(input.deadspace);
  const p2p = sanitizeAuroraEmitterBoolean(input.p2p);
  const p2pType = sanitizeAuroraEmitterString(input.p2pType);
  const p2pBezier2 = sanitizeAuroraEmitterNonNegativeNumber(input.p2pBezier2);
  const p2pBezier3 = sanitizeAuroraEmitterNonNegativeNumber(input.p2pBezier3);
  const p2pSource = sanitizeAuroraEmitterNonNegativeNumber(input.p2pSource);
  const p2pTarget = sanitizeAuroraEmitterNonNegativeNumber(input.p2pTarget);
  const combineTime = sanitizeAuroraEmitterNonNegativeNumber(input.combineTime);
  const grav = sanitizeAuroraEmitterFiniteNumber(input.grav);
  const drag = sanitizeAuroraEmitterFiniteNumber(input.drag);
  const threshold = sanitizeAuroraEmitterNonNegativeNumber(input.threshold);
  const inherit = sanitizeAuroraEmitterBoolean(input.inherit);
  const inheritVel = sanitizeAuroraEmitterBoolean(input.inheritVel);
  const inheritLocal = sanitizeAuroraEmitterBoolean(input.inheritLocal);
  const inheritPart = sanitizeAuroraEmitterBoolean(input.inheritPart);
  const affectedByWind = sanitizeAuroraEmitterBoolean(input.affectedByWind);
  const sizeStart = sanitizeAuroraEmitterNonNegativeNumber(input.sizeStart);
  const sizeMid = sanitizeAuroraEmitterNonNegativeNumber(input.sizeMid);
  const sizeEnd = sanitizeAuroraEmitterNonNegativeNumber(input.sizeEnd);
  const sizeStartY = sanitizeAuroraEmitterNonNegativeNumber(input.sizeStartY);
  const sizeMidY = sanitizeAuroraEmitterNonNegativeNumber(input.sizeMidY);
  const sizeEndY = sanitizeAuroraEmitterNonNegativeNumber(input.sizeEndY);
  const alphaStart = sanitizeAuroraEmitterNonNegativeNumber(input.alphaStart);
  const alphaMid = sanitizeAuroraEmitterNonNegativeNumber(input.alphaMid);
  const alphaEnd = sanitizeAuroraEmitterNonNegativeNumber(input.alphaEnd);
  const colorStart = sanitizeAuroraEmitterColor(input.colorStart);
  const colorMid = sanitizeAuroraEmitterColor(input.colorMid);
  const colorEnd = sanitizeAuroraEmitterColor(input.colorEnd);
  const percentStart = sanitizeAuroraEmitterNonNegativeNumber(input.percentStart);
  const percentMid = sanitizeAuroraEmitterNonNegativeNumber(input.percentMid);
  const percentEnd = sanitizeAuroraEmitterNonNegativeNumber(input.percentEnd);
  const timeline = sanitizeAuroraEmitterSimulationTimeline(input.timeline);
  const colorTimeline = sanitizeAuroraEmitterColorTimeline(input.colorTimeline);
  if (
    xSize === undefined &&
    ySize === undefined &&
    spawnType === undefined &&
    birthrate === undefined &&
    lifeExp === undefined &&
    mass === undefined &&
    velocity === undefined &&
    randvel === undefined &&
    spread === undefined &&
    particleRot === undefined &&
    bounce === undefined &&
    bounceCoefficient === undefined &&
    blastRadius === undefined &&
    blastLength === undefined &&
    blurLength === undefined &&
    detonate === undefined &&
    fps === undefined &&
    frameStart === undefined &&
    frameEnd === undefined &&
    lightningScale === undefined &&
    lightningDelay === undefined &&
    lightningRadius === undefined &&
    deadspace === undefined &&
    p2p === undefined &&
    p2pType === undefined &&
    p2pBezier2 === undefined &&
    p2pBezier3 === undefined &&
    p2pSource === undefined &&
    p2pTarget === undefined &&
    combineTime === undefined &&
    grav === undefined &&
    drag === undefined &&
    threshold === undefined &&
    inherit === undefined &&
    inheritVel === undefined &&
    inheritLocal === undefined &&
    inheritPart === undefined &&
    affectedByWind === undefined &&
    sizeStart === undefined &&
    sizeMid === undefined &&
    sizeEnd === undefined &&
    sizeStartY === undefined &&
    sizeMidY === undefined &&
    sizeEndY === undefined &&
    alphaStart === undefined &&
    alphaMid === undefined &&
    alphaEnd === undefined &&
    colorStart === undefined &&
    colorMid === undefined &&
    colorEnd === undefined &&
    percentStart === undefined &&
    percentMid === undefined &&
    percentEnd === undefined &&
    timeline === undefined &&
    colorTimeline === undefined
  ) {
    return undefined;
  }

  return {
    ...(xSize !== undefined ? { xSize } : {}),
    ...(ySize !== undefined ? { ySize } : {}),
    ...(spawnType !== undefined ? { spawnType } : {}),
    ...(birthrate !== undefined ? { birthrate } : {}),
    ...(lifeExp !== undefined ? { lifeExp } : {}),
    ...(mass !== undefined ? { mass } : {}),
    ...(velocity !== undefined ? { velocity } : {}),
    ...(randvel !== undefined ? { randvel } : {}),
    ...(spread !== undefined ? { spread } : {}),
    ...(particleRot !== undefined ? { particleRot } : {}),
    ...(bounce !== undefined ? { bounce } : {}),
    ...(bounceCoefficient !== undefined ? { bounceCoefficient } : {}),
    ...(blastRadius !== undefined ? { blastRadius } : {}),
    ...(blastLength !== undefined ? { blastLength } : {}),
    ...(blurLength !== undefined ? { blurLength } : {}),
    ...(detonate !== undefined ? { detonate } : {}),
    ...(fps !== undefined ? { fps } : {}),
    ...(frameStart !== undefined ? { frameStart } : {}),
    ...(frameEnd !== undefined ? { frameEnd } : {}),
    ...(lightningScale !== undefined ? { lightningScale } : {}),
    ...(lightningDelay !== undefined ? { lightningDelay } : {}),
    ...(lightningRadius !== undefined ? { lightningRadius } : {}),
    ...(deadspace !== undefined ? { deadspace } : {}),
    ...(p2p !== undefined ? { p2p } : {}),
    ...(p2pType !== undefined ? { p2pType } : {}),
    ...(p2pBezier2 !== undefined ? { p2pBezier2 } : {}),
    ...(p2pBezier3 !== undefined ? { p2pBezier3 } : {}),
    ...(p2pSource !== undefined ? { p2pSource } : {}),
    ...(p2pTarget !== undefined ? { p2pTarget } : {}),
    ...(combineTime !== undefined ? { combineTime } : {}),
    ...(grav !== undefined ? { grav } : {}),
    ...(drag !== undefined ? { drag } : {}),
    ...(threshold !== undefined ? { threshold } : {}),
    ...(inherit !== undefined ? { inherit } : {}),
    ...(inheritVel !== undefined ? { inheritVel } : {}),
    ...(inheritLocal !== undefined ? { inheritLocal } : {}),
    ...(inheritPart !== undefined ? { inheritPart } : {}),
    ...(affectedByWind !== undefined ? { affectedByWind } : {}),
    ...(sizeStart !== undefined ? { sizeStart } : {}),
    ...(sizeMid !== undefined ? { sizeMid } : {}),
    ...(sizeEnd !== undefined ? { sizeEnd } : {}),
    ...(sizeStartY !== undefined ? { sizeStartY } : {}),
    ...(sizeMidY !== undefined ? { sizeMidY } : {}),
    ...(sizeEndY !== undefined ? { sizeEndY } : {}),
    ...(alphaStart !== undefined ? { alphaStart } : {}),
    ...(alphaMid !== undefined ? { alphaMid } : {}),
    ...(alphaEnd !== undefined ? { alphaEnd } : {}),
    ...(colorStart !== undefined ? { colorStart } : {}),
    ...(colorMid !== undefined ? { colorMid } : {}),
    ...(colorEnd !== undefined ? { colorEnd } : {}),
    ...(percentStart !== undefined ? { percentStart } : {}),
    ...(percentMid !== undefined ? { percentMid } : {}),
    ...(percentEnd !== undefined ? { percentEnd } : {}),
    ...(timeline !== undefined ? { timeline } : {}),
    ...(colorTimeline !== undefined ? { colorTimeline } : {})
  };
}

function sanitizeAuroraEmitterFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function sanitizeAuroraEmitterNonNegativeNumber(value: unknown): number | undefined {
  const finite = sanitizeAuroraEmitterFiniteNumber(value);
  return finite !== undefined && finite >= 0 ? finite : undefined;
}

function sanitizeAuroraEmitterNonNegativeInteger(value: unknown): number | undefined {
  const nonNegative = sanitizeAuroraEmitterNonNegativeNumber(value);
  return nonNegative !== undefined ? Math.trunc(nonNegative) : undefined;
}

function sanitizeAuroraEmitterBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function sanitizeAuroraEmitterString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function sanitizeAuroraEmitterColor(
  value: unknown
): [number, number, number] | undefined {
  if (!Array.isArray(value) || value.length !== 3) {
    return undefined;
  }
  const [red, green, blue] = value;
  if (
    typeof red !== "number" ||
    typeof green !== "number" ||
    typeof blue !== "number" ||
    !Number.isFinite(red) ||
    !Number.isFinite(green) ||
    !Number.isFinite(blue)
  ) {
    return undefined;
  }
  return [red, green, blue];
}

function sanitizeAuroraEmitterNumberKeyframes(
  value: unknown,
  options: { nonNegativeValue?: boolean } = {}
): ParsedAuroraMdlEmitterNumberKeyframe[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const frames = value
    .map((entry): ParsedAuroraMdlEmitterNumberKeyframe | null => {
      if (typeof entry !== "object" || entry === null) {
        return null;
      }
      const candidate = entry as { time?: unknown; value?: unknown };
      if (
        typeof candidate.time !== "number" ||
        typeof candidate.value !== "number" ||
        !Number.isFinite(candidate.time) ||
        !Number.isFinite(candidate.value) ||
        candidate.time < 0 ||
        (options.nonNegativeValue === true && candidate.value < 0)
      ) {
        return null;
      }
      return {
        time: candidate.time,
        value: candidate.value
      };
    })
    .filter((frame): frame is ParsedAuroraMdlEmitterNumberKeyframe => frame !== null)
    .sort((left, right) => left.time - right.time);

  const uniqueFrames: ParsedAuroraMdlEmitterNumberKeyframe[] = [];
  frames.forEach((frame) => {
    const previous = uniqueFrames[uniqueFrames.length - 1];
    if (previous && previous.time === frame.time) {
      previous.value = frame.value;
      return;
    }
    uniqueFrames.push({ ...frame });
  });

  return uniqueFrames.length > 1 ? uniqueFrames : undefined;
}

function sanitizeAuroraEmitterSimulationTimeline(
  value: unknown
): ParsedAuroraMdlEmitterSimulationTimeline | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const source = value as Partial<Record<keyof ParsedAuroraMdlEmitterSimulationTimeline, unknown>>;
  const timeline: ParsedAuroraMdlEmitterSimulationTimeline = {};
  AURORA_EMITTER_SIMULATION_TIMELINE_KEYS.forEach((key) => {
    const frames = sanitizeAuroraEmitterNumberKeyframes(source[key], {
      nonNegativeValue: AURORA_EMITTER_SIMULATION_NON_NEGATIVE_TIMELINE_KEYS.has(key)
    });
    if (frames) {
      timeline[key] = frames;
    }
  });
  return Object.keys(timeline).length > 0 ? timeline : undefined;
}

function sanitizeAuroraEmitterColorKeyframes(
  value: unknown
): ParsedAuroraMdlEmitterColorKeyframe[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const frames = value
    .map((entry): ParsedAuroraMdlEmitterColorKeyframe | null => {
      if (typeof entry !== "object" || entry === null) {
        return null;
      }
      const candidate = entry as { time?: unknown; value?: unknown };
      const color = sanitizeAuroraEmitterColor(candidate.value);
      if (
        typeof candidate.time !== "number" ||
        !Number.isFinite(candidate.time) ||
        candidate.time < 0 ||
        !color
      ) {
        return null;
      }
      return {
        time: candidate.time,
        value: color
      };
    })
    .filter((frame): frame is ParsedAuroraMdlEmitterColorKeyframe => frame !== null)
    .sort((left, right) => left.time - right.time);

  const uniqueFrames: ParsedAuroraMdlEmitterColorKeyframe[] = [];
  frames.forEach((frame) => {
    const previous = uniqueFrames[uniqueFrames.length - 1];
    if (previous && previous.time === frame.time) {
      previous.value = frame.value;
      return;
    }
    uniqueFrames.push({ time: frame.time, value: [...frame.value] });
  });

  return uniqueFrames.length > 1 ? uniqueFrames : undefined;
}

function sanitizeAuroraEmitterColorTimeline(
  value: unknown
): ParsedAuroraMdlEmitterColorTimeline | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const source = value as Partial<Record<ParsedAuroraMdlEmitterColorTimelineKey, unknown>>;
  const timeline: ParsedAuroraMdlEmitterColorTimeline = {};
  (["colorStart", "colorMid", "colorEnd"] as const).forEach((key) => {
    const frames = sanitizeAuroraEmitterColorKeyframes(source[key]);
    if (frames) {
      timeline[key] = frames;
    }
  });
  return Object.keys(timeline).length > 0 ? timeline : undefined;
}

function setAuroraEmitterSourceStateDraftValue(
  emitter: ParsedAuroraMdlEmitter,
  key: keyof NonNullable<ParsedAuroraMdlEmitter["sourceState"]>,
  value: number | boolean | string | undefined
): void {
  if (value === undefined) {
    return;
  }
  const sourceState = buildAuroraEmitterSourceState({
    ...emitter.sourceState,
    [key]: value
  });
  if (sourceState) {
    emitter.sourceState = sourceState;
  }
}

function buildAuroraEmitterSourceState(
  input: NonNullable<ParsedAuroraMdlEmitter["sourceState"]>
): ParsedAuroraMdlEmitter["sourceState"] {
  const renderOrder =
    typeof input.renderOrder === "number" && Number.isFinite(input.renderOrder)
      ? Math.trunc(input.renderOrder)
      : undefined;
  const renderHintRaw =
    typeof input.renderHintRaw === "string" && input.renderHintRaw.trim()
      ? input.renderHintRaw.trim()
      : undefined;
  const renderHintMode =
    typeof input.renderHintMode === "number" && Number.isFinite(input.renderHintMode)
      ? sanitizeAuroraRenderHintMode(input.renderHintMode)
      : renderHintRaw
        ? resolveAuroraRenderHintMode(renderHintRaw)
        : undefined;
  const customShaderVS = sanitizeAuroraEmitterString(input.customShaderVS);
  const customShaderFS = sanitizeAuroraEmitterString(input.customShaderFS);
  const customShaderGS = sanitizeAuroraEmitterString(input.customShaderGS);
  const transparency = typeof input.transparency === "boolean" ? input.transparency : undefined;
  const twoSidedMaterial =
    typeof input.twoSidedMaterial === "boolean" ? input.twoSidedMaterial : undefined;
  const twoSidedTexture =
    typeof input.twoSidedTexture === "boolean" ? input.twoSidedTexture : undefined;
  const sampleFramebuffer = sanitizeAuroraSampleFramebufferValue(input.sampleFramebuffer);
  const volumetric = typeof input.volumetric === "boolean" ? input.volumetric : undefined;
  const loop = typeof input.loop === "boolean" ? input.loop : undefined;
  const isTinted = typeof input.isTinted === "boolean" ? input.isTinted : undefined;
  const splat = typeof input.splat === "boolean" ? input.splat : undefined;
  const rotateTexture =
    typeof input.rotateTexture === "boolean" ? input.rotateTexture : undefined;
  if (
    renderOrder === undefined &&
    renderHintRaw === undefined &&
    renderHintMode === undefined &&
    customShaderVS === undefined &&
    customShaderFS === undefined &&
    customShaderGS === undefined &&
    transparency === undefined &&
    twoSidedMaterial === undefined &&
    twoSidedTexture === undefined &&
    sampleFramebuffer === undefined &&
    volumetric === undefined &&
    loop === undefined &&
    isTinted === undefined &&
    splat === undefined &&
    rotateTexture === undefined
  ) {
    return undefined;
  }

  return {
    ...(renderOrder !== undefined ? { renderOrder } : {}),
    ...(renderHintRaw !== undefined ? { renderHintRaw } : {}),
    ...(renderHintMode !== undefined ? { renderHintMode } : {}),
    ...(customShaderVS !== undefined ? { customShaderVS } : {}),
    ...(customShaderFS !== undefined ? { customShaderFS } : {}),
    ...(customShaderGS !== undefined ? { customShaderGS } : {}),
    ...(transparency !== undefined ? { transparency } : {}),
    ...(twoSidedMaterial !== undefined ? { twoSidedMaterial } : {}),
    ...(twoSidedTexture !== undefined ? { twoSidedTexture } : {}),
    ...(sampleFramebuffer !== undefined ? { sampleFramebuffer } : {}),
    ...(volumetric !== undefined ? { volumetric } : {}),
    ...(loop !== undefined ? { loop } : {}),
    ...(isTinted !== undefined ? { isTinted } : {}),
    ...(splat !== undefined ? { splat } : {}),
    ...(rotateTexture !== undefined ? { rotateTexture } : {})
  };
}

function resolveAuroraRenderHintMode(rawToken: string): 0 | 1 | 2 | 3 {
  const token = rawToken.trim().toLowerCase();
  if (token === "normalandspecmapped") {
    return 2;
  }
  if (token === "normaltangents") {
    return 3;
  }
  return 0;
}

function sanitizeAuroraRenderHintMode(value: number): 0 | 1 | 2 | 3 {
  const mode = Math.trunc(value);
  return mode === 1 || mode === 2 || mode === 3 ? mode : 0;
}

function setAuroraEmitterTransformDraftValue(
  emitter: ParsedAuroraMdlEmitter,
  key: keyof NonNullable<ParsedAuroraMdlEmitter["transform"]>,
  value:
    | [number, number, number]
    | { axis: [number, number, number]; angleRadians: number }
    | undefined
): void {
  if (value === undefined) {
    return;
  }
  const transform = buildAuroraEmitterTransform({
    ...emitter.transform,
    [key]: value
  });
  if (transform) {
    emitter.transform = transform;
  }
}

function setAuroraLightTransformDraftValue(
  light: ParsedAuroraMdlLight,
  key: keyof NonNullable<ParsedAuroraMdlLight["transform"]>,
  value:
    | [number, number, number]
    | { axis: [number, number, number]; angleRadians: number }
    | undefined
): void {
  if (value === undefined) {
    return;
  }
  const transform = buildAuroraEmitterTransform({
    ...light.transform,
    [key]: value
  });
  if (transform) {
    light.transform = transform;
  }
}

function setAuroraReferenceTransformDraftValue(
  referenceNode: ParsedAuroraMdlReferenceNode,
  key: keyof NonNullable<ParsedAuroraMdlReferenceNode["transform"]>,
  value:
    | [number, number, number]
    | { axis: [number, number, number]; angleRadians: number }
    | undefined
): void {
  if (value === undefined) {
    return;
  }
  const transform = buildAuroraEmitterTransform({
    ...referenceNode.transform,
    [key]: value
  });
  if (transform) {
    referenceNode.transform = transform;
  }
}

function buildAuroraEmitterTransform(
  input: NonNullable<ParsedAuroraMdlEmitter["transform"]>
): ParsedAuroraMdlEmitter["transform"] {
  const position = sanitizeAuroraEmitterVector3(input.position);
  const orientation = sanitizeAuroraEmitterOrientation(input.orientation);
  if (position === undefined && orientation === undefined) {
    return undefined;
  }

  return {
    ...(position !== undefined ? { position } : {}),
    ...(orientation !== undefined ? { orientation } : {})
  };
}

function buildAuroraEmitterReferenceNode(
  input: ParsedAuroraMdlReferenceNode
): ParsedAuroraMdlReferenceNode | undefined {
  const nodeName = normalizeAuroraEmitterValue(input.nodeName);
  if (!nodeName) {
    return undefined;
  }
  const parentNodeName = normalizeAuroraEmitterValue(input.parentNodeName);
  const transform = input.transform ? buildAuroraEmitterTransform(input.transform) : undefined;
  return {
    nodeName,
    ...(parentNodeName ? { parentNodeName } : {}),
    ...(transform ? { transform } : {})
  };
}

function sanitizeAuroraEmitterVector3(value: unknown): [number, number, number] | undefined {
  if (!Array.isArray(value) || value.length !== 3) {
    return undefined;
  }
  const [x, y, z] = value;
  if (
    typeof x !== "number" ||
    typeof y !== "number" ||
    typeof z !== "number" ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(z)
  ) {
    return undefined;
  }
  return [x, y, z];
}

function sanitizeAuroraEmitterOrientation(value: unknown):
  | {
      axis: [number, number, number];
      angleRadians: number;
    }
  | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  const candidate = value as {
    axis?: unknown;
    angleRadians?: unknown;
  };
  const axis = sanitizeAuroraEmitterVector3(candidate.axis);
  const angleRadians = candidate.angleRadians;
  if (!axis || typeof angleRadians !== "number" || !Number.isFinite(angleRadians)) {
    return undefined;
  }
  const axisLengthSq = axis[0] * axis[0] + axis[1] * axis[1] + axis[2] * axis[2];
  if (axisLengthSq <= 1e-12) {
    return undefined;
  }
  return {
    axis,
    angleRadians
  };
}

function setAuroraEmitterAtlasDraftValue(
  emitter: ParsedAuroraMdlEmitter,
  key: "xGridRaw" | "yGridRaw" | "fps" | "frameStart" | "frameEnd" | "random",
  value: number | boolean | undefined
): void {
  if (value === undefined) {
    return;
  }
  const atlas = buildAuroraEmitterAtlas({
    ...emitter.atlas,
    [key]: value
  });
  if (atlas) {
    emitter.atlas = atlas;
  }
}

function buildAuroraEmitterAtlas(input: {
  xGridRaw?: number;
  yGridRaw?: number;
  fps?: number;
  frameStart?: number;
  frameEnd?: number;
  random?: boolean;
}): ParsedAuroraMdlEmitter["atlas"] {
  const xGridRaw = sanitizeAuroraAtlasInteger(input.xGridRaw);
  const yGridRaw = sanitizeAuroraAtlasInteger(input.yGridRaw);
  const fps = sanitizeAuroraAtlasNumber(input.fps);
  const frameStart = sanitizeAuroraAtlasInteger(input.frameStart);
  const frameEnd = sanitizeAuroraAtlasInteger(input.frameEnd);
  const random = typeof input.random === "boolean" ? input.random : undefined;
  if (
    xGridRaw === undefined &&
    yGridRaw === undefined &&
    fps === undefined &&
    frameStart === undefined &&
    frameEnd === undefined &&
    random === undefined
  ) {
    return undefined;
  }

  return {
    ...(xGridRaw !== undefined ? { xGridRaw } : {}),
    ...(yGridRaw !== undefined ? { yGridRaw } : {}),
    effectiveXGrid: xGridRaw && xGridRaw > 0 ? xGridRaw : 1,
    effectiveYGrid: yGridRaw && yGridRaw > 0 ? yGridRaw : 1,
    ...(fps !== undefined ? { fps } : {}),
    ...(frameStart !== undefined ? { frameStart } : {}),
    ...(frameEnd !== undefined ? { frameEnd } : {}),
    ...(random !== undefined ? { random } : {})
  };
}

function sanitizeAuroraAtlasInteger(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return Math.max(0, Math.trunc(value));
}

function sanitizeAuroraAtlasNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return value >= 0 ? value : undefined;
}

function readAuroraIntegerValue(value: string): number | undefined {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readAuroraNumberValue(value: string): number | undefined {
  const parsed = Number.parseFloat(value.trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readAuroraVector3Value(value: string): [number, number, number] | undefined {
  const values = value
    .trim()
    .split(/[\s,]+/u)
    .map((part) => Number.parseFloat(part))
    .filter((part) => Number.isFinite(part));
  if (values.length < 3) {
    return undefined;
  }
  return [values[0]!, values[1]!, values[2]!];
}

function readAuroraOrientationValue(value: string):
  | {
      axis: [number, number, number];
      angleRadians: number;
    }
  | undefined {
  const values = value
    .trim()
    .split(/[\s,]+/u)
    .map((part) => Number.parseFloat(part))
    .filter((part) => Number.isFinite(part));
  if (values.length < 4) {
    return undefined;
  }
  return {
    axis: [values[0]!, values[1]!, values[2]!],
    angleRadians: values[3]!
  };
}

function readAuroraBooleanValue(value: string): boolean | undefined {
  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "no") {
    return false;
  }
  return undefined;
}

function readAuroraSampleFramebufferValue(value: string): number | undefined {
  const integerValue = readAuroraIntegerValue(value);
  if (integerValue !== undefined) {
    return integerValue;
  }
  const booleanValue = readAuroraBooleanValue(value);
  return booleanValue === undefined ? undefined : booleanValue ? 1 : 0;
}

function sanitizeAuroraSampleFramebufferValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  if (typeof value === "string") {
    return readAuroraSampleFramebufferValue(value);
  }
  return undefined;
}

interface AuroraBinaryArrayHeader {
  offset: number;
  count: number;
}

interface AuroraBinaryControllerValue {
  type: number;
  rows: number;
  columns: number;
  values: number[];
  keyframes: number[][];
}

function resolveAuroraBinaryControllerScalarValue(
  controller: AuroraBinaryControllerValue
): number | undefined {
  if (controller.rows > 1 && controller.columns >= 2) {
    return controller.keyframes[0]?.[1];
  }
  return controller.values[0];
}

function buildAuroraBinaryControllerNumberTimeline(
  controller: AuroraBinaryControllerValue,
  options: { nonNegativeValue?: boolean; implicitDurationSeconds?: number } = {}
): ParsedAuroraMdlEmitterNumberKeyframe[] | undefined {
  if (controller.rows >= 2 && controller.columns >= 2) {
    return sanitizeAuroraEmitterNumberKeyframes(
      controller.keyframes.map((row) => ({
        time: row[0],
        value: row[1]
      })),
      options
    );
  }

  const duration = sanitizeAuroraEmitterNonNegativeNumber(options.implicitDurationSeconds);
  if (controller.rows < 2 || controller.columns !== 1 || duration === undefined) {
    return undefined;
  }

  return sanitizeAuroraEmitterNumberKeyframes(
    controller.keyframes.map((row, index) => ({
      time: controller.rows === 1 ? 0 : (duration * index) / (controller.rows - 1),
      value: row[0]
    })),
    options
  );
}

function buildAuroraBinaryControllerColorTimeline(
  controller: AuroraBinaryControllerValue
): ParsedAuroraMdlEmitterColorKeyframe[] | undefined {
  if (controller.rows < 2 || controller.columns < 4) {
    return undefined;
  }

  return sanitizeAuroraEmitterColorKeyframes(
    controller.keyframes
      .filter((row) => row.length >= 4)
      .map((row) => ({
        time: row[0]!,
        value: [row[1]!, row[2]!, row[3]!]
      }))
  );
}

function resolveAuroraBinaryControllerColorValue(
  controller: AuroraBinaryControllerValue
): [number, number, number] | undefined {
  const row = controller.keyframes[0] ?? controller.values;
  if (!row) {
    return undefined;
  }
  const offset = controller.rows > 1 && controller.columns >= 4 ? 1 : 0;
  if (row.length < offset + 3) {
    return undefined;
  }
  return sanitizeAuroraEmitterColor([
    row[offset]!,
    row[offset + 1]!,
    row[offset + 2]!
  ]);
}

function resolveAuroraBinaryEmitterSimulationTimelineKey(
  controllerType: number
): ParsedAuroraMdlEmitterSimulationTimelineKey | undefined {
  switch (controllerType) {
    case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_X:
      return "xSize";
    case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_Y:
      return "ySize";
    case AURORA_BINARY_CONTROLLER_EMITTER_BIRTHRATE:
      return "birthrate";
    case AURORA_BINARY_CONTROLLER_EMITTER_LIFE_EXP:
      return "lifeExp";
    case AURORA_BINARY_CONTROLLER_EMITTER_MASS:
      return "mass";
    case AURORA_BINARY_CONTROLLER_EMITTER_VELOCITY:
      return "velocity";
    case AURORA_BINARY_CONTROLLER_EMITTER_RAND_VEL:
      return "randvel";
    case AURORA_BINARY_CONTROLLER_EMITTER_SPREAD:
      return "spread";
    case AURORA_BINARY_CONTROLLER_EMITTER_PARTICLE_ROT:
      return "particleRot";
    case AURORA_BINARY_CONTROLLER_EMITTER_BOUNCE_COEFFICIENT:
      return "bounceCoefficient";
    case AURORA_BINARY_CONTROLLER_EMITTER_BLUR_LENGTH:
      return "blurLength";
    case AURORA_BINARY_CONTROLLER_EMITTER_DETONATE:
      return "detonate";
    case AURORA_BINARY_CONTROLLER_EMITTER_P2P_BEZIER2:
      return "p2pBezier2";
    case AURORA_BINARY_CONTROLLER_EMITTER_P2P_BEZIER3:
      return "p2pBezier3";
    case AURORA_BINARY_CONTROLLER_EMITTER_COMBINE_TIME:
      return "combineTime";
    case AURORA_BINARY_CONTROLLER_EMITTER_GRAV:
      return "grav";
    case AURORA_BINARY_CONTROLLER_EMITTER_DRAG:
      return "drag";
    case AURORA_BINARY_CONTROLLER_EMITTER_THRESHOLD:
      return "threshold";
    case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_START:
      return "sizeStart";
    case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_MID:
      return "sizeMid";
    case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_END:
      return "sizeEnd";
    case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_START_Y:
      return "sizeStartY";
    case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_MID_Y:
      return "sizeMidY";
    case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_END_Y:
      return "sizeEndY";
    case AURORA_BINARY_CONTROLLER_EMITTER_PERCENT_START:
      return "percentStart";
    case AURORA_BINARY_CONTROLLER_EMITTER_PERCENT_MID:
      return "percentMid";
    case AURORA_BINARY_CONTROLLER_EMITTER_PERCENT_END:
      return "percentEnd";
    case AURORA_BINARY_CONTROLLER_EMITTER_ALPHA_START:
      return "alphaStart";
    case AURORA_BINARY_CONTROLLER_EMITTER_ALPHA_MID:
      return "alphaMid";
    case AURORA_BINARY_CONTROLLER_EMITTER_ALPHA_END:
      return "alphaEnd";
    default:
      return undefined;
  }
}

function readAuroraBinaryEmitterAtlas(
  bytes: Buffer,
  nodeAbsOffset: number
): ParsedAuroraMdlEmitter["atlas"] {
  const flags = readAuroraBinaryUInt32(bytes, nodeAbsOffset + AURORA_BINARY_EMITTER_FLAGS_OFFSET) ?? 0;
  const atlasDraft: Parameters<typeof buildAuroraEmitterAtlas>[0] = {
    xGridRaw:
      readAuroraBinaryUInt32(bytes, nodeAbsOffset + AURORA_BINARY_EMITTER_XGRID_OFFSET) ??
      undefined,
    yGridRaw:
      readAuroraBinaryUInt32(bytes, nodeAbsOffset + AURORA_BINARY_EMITTER_YGRID_OFFSET) ??
      undefined,
    random: (flags & AURORA_BINARY_EMITTER_FLAG_RANDOM_ATLAS_FRAME) !== 0
  };

  collectAuroraBinaryControllerValues(bytes, nodeAbsOffset).forEach((controller) => {
    const value = controller.values[0];
    if (value === undefined) {
      return;
    }
    switch (controller.type) {
      case AURORA_BINARY_CONTROLLER_EMITTER_FPS:
        atlasDraft.fps = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_FRAME_START:
        atlasDraft.frameStart = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_FRAME_END:
        atlasDraft.frameEnd = value;
        break;
      default:
        break;
    }
  });

  return buildAuroraEmitterAtlas(atlasDraft);
}

function readAuroraBinaryEmitterSimulation(
  bytes: Buffer,
  nodeAbsOffset: number,
  options: {
    implicitTimelineDurationSeconds?: number;
  } = {}
): ParsedAuroraMdlEmitter["simulation"] {
  const flags = readAuroraBinaryUInt32(bytes, nodeAbsOffset + AURORA_BINARY_EMITTER_FLAGS_OFFSET) ?? 0;
  const simulationDraft: NonNullable<ParsedAuroraMdlEmitter["simulation"]> = {
    spawnType:
      readAuroraBinaryUInt32(bytes, nodeAbsOffset + AURORA_BINARY_EMITTER_SPAWN_TYPE_OFFSET) ??
      undefined,
    deadspace:
      readAuroraBinaryFloat32(bytes, nodeAbsOffset + AURORA_BINARY_EMITTER_DEAD_SPACE_OFFSET) ??
      undefined,
    ...((flags & AURORA_BINARY_EMITTER_FLAG_BOUNCE) !== 0 ? { bounce: true } : {}),
    ...((flags & AURORA_BINARY_EMITTER_FLAG_P2P) !== 0
      ? {
          p2p: true,
          p2pType:
            (flags & AURORA_BINARY_EMITTER_FLAG_P2P_BEZIER) !== 0 ? "bezier" : "gravity"
        }
      : {}),
    ...((flags & AURORA_BINARY_EMITTER_FLAG_INHERIT) !== 0 ? { inherit: true } : {}),
    ...((flags & AURORA_BINARY_EMITTER_FLAG_INHERIT_VEL) !== 0 ? { inheritVel: true } : {}),
    ...((flags & AURORA_BINARY_EMITTER_FLAG_INHERIT_LOCAL) !== 0 ? { inheritLocal: true } : {}),
    ...((flags & AURORA_BINARY_EMITTER_FLAG_INHERIT_PART) !== 0 ? { inheritPart: true } : {}),
    affectedByWind: (flags & AURORA_BINARY_EMITTER_FLAG_AFFECTED_BY_WIND) !== 0
  };

  collectAuroraBinaryControllerValues(bytes, nodeAbsOffset).forEach((controller) => {
    const value = resolveAuroraBinaryControllerScalarValue(controller);
    switch (controller.type) {
      case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_X:
        simulationDraft.xSize = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_Y:
        simulationDraft.ySize = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_BIRTHRATE:
        simulationDraft.birthrate = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_LIFE_EXP:
        simulationDraft.lifeExp = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_MASS:
        simulationDraft.mass = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_VELOCITY:
        simulationDraft.velocity = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_RAND_VEL:
        simulationDraft.randvel = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_SPREAD:
        simulationDraft.spread = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_PARTICLE_ROT:
        simulationDraft.particleRot = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_BOUNCE_COEFFICIENT:
        simulationDraft.bounceCoefficient = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_BLUR_LENGTH:
        simulationDraft.blurLength = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_DETONATE:
        simulationDraft.detonate = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_P2P_BEZIER2:
        simulationDraft.p2pBezier2 = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_P2P_BEZIER3:
        simulationDraft.p2pBezier3 = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_COMBINE_TIME:
        simulationDraft.combineTime = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_GRAV:
        simulationDraft.grav = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_DRAG:
        simulationDraft.drag = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_THRESHOLD:
        simulationDraft.threshold = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_START:
        simulationDraft.sizeStart = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_MID:
        simulationDraft.sizeMid = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_END:
        simulationDraft.sizeEnd = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_START_Y:
        simulationDraft.sizeStartY = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_MID_Y:
        simulationDraft.sizeMidY = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_SIZE_END_Y:
        simulationDraft.sizeEndY = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_PERCENT_START:
        simulationDraft.percentStart = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_PERCENT_MID:
        simulationDraft.percentMid = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_PERCENT_END:
        simulationDraft.percentEnd = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_ALPHA_START:
        simulationDraft.alphaStart = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_ALPHA_MID:
        simulationDraft.alphaMid = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_ALPHA_END:
        simulationDraft.alphaEnd = value;
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_COLOR_START:
        {
          const color = resolveAuroraBinaryControllerColorValue(controller);
          if (color) {
            simulationDraft.colorStart = color;
          }
        }
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_COLOR_MID:
        {
          const color = resolveAuroraBinaryControllerColorValue(controller);
          if (color) {
            simulationDraft.colorMid = color;
          }
        }
        break;
      case AURORA_BINARY_CONTROLLER_EMITTER_COLOR_END:
        {
          const color = resolveAuroraBinaryControllerColorValue(controller);
          if (color) {
            simulationDraft.colorEnd = color;
          }
        }
        break;
      default:
        break;
    }
    const timelineKey = resolveAuroraBinaryEmitterSimulationTimelineKey(controller.type);
    if (timelineKey) {
      const timeline = buildAuroraBinaryControllerNumberTimeline(controller, {
        nonNegativeValue: AURORA_EMITTER_SIMULATION_NON_NEGATIVE_TIMELINE_KEYS.has(timelineKey),
        implicitDurationSeconds: options.implicitTimelineDurationSeconds
      });
      if (timeline) {
        simulationDraft.timeline = {
          ...simulationDraft.timeline,
          [timelineKey]: timeline
        };
      }
    }
    if (
      controller.type === AURORA_BINARY_CONTROLLER_EMITTER_COLOR_START ||
      controller.type === AURORA_BINARY_CONTROLLER_EMITTER_COLOR_MID ||
      controller.type === AURORA_BINARY_CONTROLLER_EMITTER_COLOR_END
    ) {
      const colorTimeline = buildAuroraBinaryControllerColorTimeline(controller);
      if (colorTimeline) {
        simulationDraft.colorTimeline = {
          ...simulationDraft.colorTimeline,
          [controller.type === AURORA_BINARY_CONTROLLER_EMITTER_COLOR_START
            ? "colorStart"
            : controller.type === AURORA_BINARY_CONTROLLER_EMITTER_COLOR_MID
              ? "colorMid"
              : "colorEnd"]: colorTimeline
        };
      }
    }
  });

  return buildAuroraEmitterSimulation(simulationDraft);
}

function readAuroraBinaryEmitterTransform(
  bytes: Buffer,
  nodeAbsOffset: number
): ParsedAuroraMdlEmitter["transform"] {
  const transformDraft: NonNullable<ParsedAuroraMdlEmitter["transform"]> = {};
  collectAuroraBinaryControllerValues(bytes, nodeAbsOffset).forEach((controller) => {
    if (controller.type === AURORA_BINARY_CONTROLLER_POSITION && controller.values.length >= 3) {
      transformDraft.position = [
        controller.values[0]!,
        controller.values[1]!,
        controller.values[2]!
      ];
      return;
    }

    if (
      controller.type === AURORA_BINARY_CONTROLLER_ORIENTATION &&
      controller.values.length >= 4
    ) {
      const orientation = buildAuroraQuaternionOrientation([
        controller.values[0]!,
        controller.values[1]!,
        controller.values[2]!,
        controller.values[3]!
      ]);
      if (orientation) {
        transformDraft.orientation = orientation;
      }
    }
  });

  return buildAuroraEmitterTransform(transformDraft);
}

function readAuroraBinaryEmitterReferenceNodes(
  bytes: Buffer,
  emitterNodeAbsOffset: number,
  emitterNodeName: string
): ParsedAuroraMdlReferenceNode[] {
  const childrenOffset = readAuroraBinaryUInt32(
    bytes,
    emitterNodeAbsOffset + AURORA_BINARY_NODE_CHILDREN_OFFSET
  );
  const childrenCount = readAuroraBinaryUInt32(
    bytes,
    emitterNodeAbsOffset + AURORA_BINARY_NODE_CHILDREN_OFFSET + 4
  );
  if (childrenOffset === null || childrenCount === null || childrenCount === 0) {
    return [];
  }

  const references: ParsedAuroraMdlReferenceNode[] = [];
  for (let index = 0; index < childrenCount; index += 1) {
    const childPosition = AURORA_BINARY_MODEL_BASE + childrenOffset + index * 4;
    const childOffset = readAuroraBinaryUInt32(bytes, childPosition);
    if (childOffset === null) {
      continue;
    }
    const childAbsOffset = AURORA_BINARY_MODEL_BASE + childOffset;
    if (
      childAbsOffset < AURORA_BINARY_MODEL_BASE ||
      childAbsOffset + AURORA_BINARY_NODE_HEADER_SIZE > bytes.length
    ) {
      continue;
    }
    const flags = readAuroraBinaryUInt32(bytes, childAbsOffset + AURORA_BINARY_NODE_FLAGS_OFFSET);
    if (
      flags === null ||
      (flags & (AURORA_BINARY_NODE_FLAG_EMITTER | AURORA_BINARY_NODE_FLAG_MESH)) !== 0
    ) {
      continue;
    }
    const nodeName =
      normalizeAuroraEmitterValue(
        readAuroraBinaryCString(
          bytes,
          childAbsOffset + AURORA_BINARY_NODE_NAME_OFFSET,
          32
        )
      ) ?? `reference_${references.length + 1}`;
    const transform = readAuroraBinaryEmitterTransform(bytes, childAbsOffset);
    const referenceNode = buildAuroraEmitterReferenceNode({
      nodeName,
      parentNodeName: emitterNodeName,
      transform
    });
    if (referenceNode) {
      references.push(referenceNode);
    }
  }
  return references;
}

function collectAuroraBinaryControllerValues(
  bytes: Buffer,
  nodeAbsOffset: number
): AuroraBinaryControllerValue[] {
  const controllerKeys = readAuroraBinaryArrayHeader(
    bytes,
    nodeAbsOffset + AURORA_BINARY_NODE_CONTROLLER_KEYS_OFFSET
  );
  const controllerData = readAuroraBinaryArrayHeader(
    bytes,
    nodeAbsOffset + AURORA_BINARY_NODE_CONTROLLER_DATA_OFFSET
  );
  if (!controllerKeys || !controllerData || controllerKeys.count < 1 || controllerData.count < 1) {
    return [];
  }

  const controllers: AuroraBinaryControllerValue[] = [];
  const dataBase = AURORA_BINARY_MODEL_BASE + controllerData.offset;

  for (let index = 0; index < controllerKeys.count; index += 1) {
    const keyOffset =
      AURORA_BINARY_MODEL_BASE +
      controllerKeys.offset +
      index * AURORA_BINARY_CONTROLLER_RECORD_SIZE;
    if (keyOffset + AURORA_BINARY_CONTROLLER_RECORD_SIZE > bytes.length) {
      break;
    }

    const type = readAuroraBinaryUInt32(bytes, keyOffset);
    const rows = readAuroraBinaryUInt16(bytes, keyOffset + 4);
    const dataStart = readAuroraBinaryUInt16(bytes, keyOffset + 8);
    const columns = readAuroraBinaryUInt8(bytes, keyOffset + 10);
    if (
      type === null ||
      rows === null ||
      dataStart === null ||
      columns === null ||
      rows < 1 ||
      columns <= 0
    ) {
      continue;
    }

    const controllerValueCount = rows * columns;
    const valueOffset = dataBase + dataStart * 4;
    if (
      dataStart + controllerValueCount > controllerData.count ||
      valueOffset < AURORA_BINARY_MODEL_BASE ||
      valueOffset + controllerValueCount * 4 > bytes.length
    ) {
      continue;
    }

    const keyframes: number[][] = [];
    for (let row = 0; row < rows; row += 1) {
      const values: number[] = [];
      for (let column = 0; column < columns; column += 1) {
        const value = readAuroraBinaryFloat32(
          bytes,
          valueOffset + (row * columns + column) * 4
        );
        if (value === null) {
          values.length = 0;
          break;
        }
        values.push(value);
      }
      if (values.length !== columns) {
        keyframes.length = 0;
        break;
      }
      keyframes.push(values);
    }
    const values = keyframes[0] ?? [];
    if (keyframes.length === rows && values.length === columns) {
      controllers.push({ type, rows, columns, values, keyframes });
    }
  }

  return controllers;
}

function readAuroraBinaryVector3(
  bytes: Buffer,
  offset: number
): [number, number, number] | undefined {
  const x = readAuroraBinaryFloat32(bytes, offset);
  const y = readAuroraBinaryFloat32(bytes, offset + 4);
  const z = readAuroraBinaryFloat32(bytes, offset + 8);
  if (x === null || y === null || z === null) {
    return undefined;
  }
  return [x, y, z];
}

function readAuroraBinaryQuaternionOrientation(
  bytes: Buffer,
  offset: number
): NonNullable<ParsedAuroraMdlEmitter["transform"]>["orientation"] | undefined {
  const x = readAuroraBinaryFloat32(bytes, offset);
  const y = readAuroraBinaryFloat32(bytes, offset + 4);
  const z = readAuroraBinaryFloat32(bytes, offset + 8);
  const w = readAuroraBinaryFloat32(bytes, offset + 12);
  if (x === null || y === null || z === null || w === null) {
    return undefined;
  }

  return buildAuroraQuaternionOrientation([x, y, z, w]);
}

function buildAuroraQuaternionOrientation(
  value: [number, number, number, number]
): NonNullable<ParsedAuroraMdlEmitter["transform"]>["orientation"] | undefined {
  const [x, y, z, w] = value;
  const length = Math.hypot(x, y, z, w);
  if (length <= 1e-12) {
    return undefined;
  }

  const qx = x / length;
  const qy = y / length;
  const qz = z / length;
  const qw = w / length;
  const vectorLength = Math.hypot(qx, qy, qz);
  if (vectorLength <= 1e-12) {
    return undefined;
  }

  return {
    axis: [qx / vectorLength, qy / vectorLength, qz / vectorLength],
    angleRadians: 2 * Math.atan2(vectorLength, qw)
  };
}

function readAuroraBinaryArrayHeader(
  bytes: Buffer,
  offset: number
): AuroraBinaryArrayHeader | null {
  const arrayOffset = readAuroraBinaryUInt32(bytes, offset);
  const count = readAuroraBinaryUInt32(bytes, offset + 4);
  if (arrayOffset === null || count === null) {
    return null;
  }
  return {
    offset: arrayOffset,
    count
  };
}

function readAuroraBinaryUInt32(bytes: Buffer, offset: number): number | null {
  if (offset < 0 || offset + 4 > bytes.length) {
    return null;
  }
  return bytes.readUInt32LE(offset);
}

function readAuroraBinaryUInt16(bytes: Buffer, offset: number): number | null {
  if (offset < 0 || offset + 2 > bytes.length) {
    return null;
  }
  return bytes.readUInt16LE(offset);
}

function readAuroraBinaryUInt8(bytes: Buffer, offset: number): number | null {
  if (offset < 0 || offset + 1 > bytes.length) {
    return null;
  }
  return bytes.readUInt8(offset);
}

function readAuroraBinaryInt16(bytes: Buffer, offset: number): number | null {
  if (offset < 0 || offset + 2 > bytes.length) {
    return null;
  }
  return bytes.readInt16LE(offset);
}

function readAuroraBinaryFloat32(bytes: Buffer, offset: number): number | null {
  if (offset < 0 || offset + 4 > bytes.length) {
    return null;
  }
  const value = bytes.readFloatLE(offset);
  return Number.isFinite(value) ? value : null;
}

function readAuroraBinaryCString(bytes: Buffer, offset: number, length: number): string {
  if (offset < 0 || length <= 0 || offset >= bytes.length) {
    return "";
  }
  const end = Math.min(bytes.length, offset + length);
  const slice = bytes.subarray(offset, end);
  const nullIndex = slice.indexOf(0);
  const used = nullIndex >= 0 ? slice.subarray(0, nullIndex) : slice;
  return used.toString("ascii").trim();
}

function normalizeAuroraEmitterValue(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim().replace(/^['"]+|['"]+$/gu, "");
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeAuroraNodeLookupName(value: unknown): string | undefined {
  const normalized = normalizeAuroraEmitterValue(value);
  return normalized ? normalized.toLowerCase() : undefined;
}

function isAuroraMaterialTextureKey(key: string): boolean {
  if (key.startsWith("texture")) {
    return true;
  }
  return (
    key === "basetexture" ||
    key === "diffusemap" ||
    key === "bumpmaptexture" ||
    key === "bumpyshinytexture" ||
    key === "envmaptexture" ||
    key === "bumpreplacementtexture" ||
    key === "normalmap" ||
    key === "specularmap" ||
    key === "roughnessmap"
  );
}

function normalizeModelTextureReference(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim().replace(/^['"]+|['"]+$/gu, "");
  if (!trimmed || /^(null|none)$/iu.test(trimmed)) {
    return null;
  }

  const basename = extractBasename(extractFileName(trimmed));
  if (!/[a-z0-9]/u.test(basename)) {
    return null;
  }

  return basename;
}

function normalizeAuroraModelResourceReference(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim().replace(/^['"]+|['"]+$/gu, "");
  if (!trimmed || /^(null|none)$/iu.test(trimmed)) {
    return null;
  }

  const basename = extractBasename(extractFileName(trimmed));
  if (!/[a-z0-9]/u.test(basename)) {
    return null;
  }

  return basename;
}

function mergeRenderPackageDiagnostics(
  baseDiagnostics: PlaceableRenderPackage["diagnostics"],
  diagnosticsToAdd: PlaceableRenderPackage["diagnostics"]
): PlaceableRenderPackage["diagnostics"] {
  const merged = [...baseDiagnostics];
  for (const diagnostic of diagnosticsToAdd) {
    if (merged.some((entry) => entry.code === diagnostic.code)) {
      continue;
    }
    merged.push(diagnostic);
  }
  return merged;
}

function promoteAuroraEmitterRenderPackage(
  renderPackage: PlaceableRenderPackage
): PlaceableRenderPackage {
  const hasEmitterPayload = (renderPackage.auroraEmitter?.emitters.length ?? 0) > 0;
  const hasDerivedModelAsset = (renderPackage.assetRefs.derivedModelAssetIds?.length ?? 0) > 0;
  const hasRenderableVfxAsset =
    (renderPackage.assetRefs.textureAssetIds?.length ?? 0) > 0 ||
    (renderPackage.assetRefs.chunkModelAssetIds?.length ?? 0) > 0;
  if (!hasEmitterPayload || !hasRenderableVfxAsset) {
    return renderPackage;
  }

  return {
    ...renderPackage,
    status: "ready",
    diagnostics: mergeRenderPackageDiagnostics(
      renderPackage.diagnostics.filter(
        (diagnostic) =>
          diagnostic.code !== "PLACEABLE_RENDER_DERIVED_MISSING" &&
          (hasDerivedModelAsset ||
            diagnostic.code !== "VFX_PROJECT_RENDER_PACKAGE_NOT_RUNTIME_PARITY")
      ),
      [
        {
          code: "PLACEABLE_RENDER_READY",
          severity: "warn",
          message:
            "Aurora source MDL emitter payload and render assets are available for VFX preview."
        },
        {
          code: "VFX_AURORA_MDL_EMITTER_PREVIEW_NON_CANONICAL",
          severity: "warn",
          message:
            "Source MDL emitter payload is preview-only; canonical VFX runtime still requires source rows and effect-instance context."
        }
      ]
    )
  };
}

function promoteAuroraLightRenderPackage(
  renderPackage: PlaceableRenderPackage
): PlaceableRenderPackage {
  const hasLightPayload = (renderPackage.auroraLight?.lights.length ?? 0) > 0;
  if (!hasLightPayload) {
    return renderPackage;
  }

  return {
    ...renderPackage,
    status: "ready",
    diagnostics: mergeRenderPackageDiagnostics(
      renderPackage.diagnostics.filter(
        (diagnostic) =>
          diagnostic.code !== "PLACEABLE_RENDER_DERIVED_MISSING" &&
          diagnostic.code !== "VFX_AURORA_MDL_EMITTER_PAYLOAD_MISSING" &&
          diagnostic.code !== "VFX_PROJECT_RENDER_PACKAGE_NOT_RUNTIME_PARITY"
      ),
      [
        {
          code: "PLACEABLE_RENDER_READY",
          severity: "warn",
          message:
            "Aurora source MDL light nodes are available for VFX light-node preview."
        },
        {
          code: "VFX_AURORA_MDL_LIGHT_PREVIEW_NON_CANONICAL",
          severity: "warn",
          message:
            "Source MDL light-node payload is preview-only; canonical VFX runtime still requires source rows and effect-instance context."
        }
      ]
    )
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function buildPlaceableAssetSourcePriority(
  settings: RuntimeSettingsRecord,
  moduleIfoHakList: string[] = []
): PlaceableAssetSourcePriority {
  const sourceHakEntries = resolveHakSettingsByAsset(
    settings,
    moduleIfoHakList
  ).placeable.hakPriorityList;
  const hakNames = deduplicateOrdered(
    sourceHakEntries.map(normalizeHakNameForBlobSource).filter(Boolean)
  );
  return { hakNames };
}

function normalizeHakNameForBlobSource(value: string): string {
  const basename = extractBasename(extractFileName(value));
  return sanitizeBlobSourceSegment(basename);
}

function sanitizeBlobSourceSegment(value: string): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9._-]/gu, "_");
  return normalized || "source";
}

function deduplicateOrdered(values: string[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    ordered.push(normalized);
  }
  return ordered;
}

function dedupeText(values: Array<string | undefined>): string[] {
  return deduplicateOrdered(values.filter((value): value is string => Boolean(value)));
}

function isAreaInstanceRenderQuery(query: PlaceableProcessQuery): boolean {
  return (
    (Number.isInteger(query.appearanceType ?? Number.NaN) && query.appearanceType !== undefined) ||
    (Number.isInteger(query.genericType ?? Number.NaN) && query.genericType !== undefined)
  );
}

function normalizeAreaInstanceTemplateText(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

function buildAreaInstanceTemplateId(rawTemplateId: string | null, rawResRef: string): string {
  if (rawTemplateId?.startsWith("plc_")) {
    return rawTemplateId.slice(0, 80);
  }
  if (rawResRef.startsWith("plc_")) {
    return rawResRef.slice(0, 80);
  }
  return `plc_${rawResRef}`.slice(0, 80);
}

function buildAreaInstancePlaceableTemplate(query: PlaceableProcessQuery): TemplateRecord | null {
  if (!isAreaInstanceRenderQuery(query)) {
    return null;
  }

  const queryTemplateId = normalizeAreaInstanceTemplateText(query.templateId);
  const queryResRef = normalizeAreaInstanceTemplateText(query.resref);
  const fallbackResRef = `area_instance_${query.appearanceType ?? "none"}_${query.genericType ?? "none"}`;
  const resref = queryResRef ?? queryTemplateId ?? fallbackResRef;
  const templateId = buildAreaInstanceTemplateId(queryTemplateId, resref);
  const appearanceType =
    Number.isInteger(query.appearanceType ?? Number.NaN) && query.appearanceType !== undefined
      ? Math.trunc(query.appearanceType)
      : undefined;
  const genericType =
    Number.isInteger(query.genericType ?? Number.NaN) && query.genericType !== undefined
      ? Math.trunc(query.genericType)
      : undefined;

  return {
    templateId,
    kind: "placeable",
    placeableSubtype: query.subtypeHint === "door" ? "door" : "generic",
    benchmarkCandidate: false,
    benchmarkBucket: "area-git-instance",
    resref,
    name: templateId,
    category: "Area GIT Placeables",
    tags: dedupeText([
      "area-git-instance",
      "aurora-git",
      appearanceType !== undefined ? `appearance-${appearanceType}` : undefined,
      genericType !== undefined ? `generic-${genericType}` : undefined,
      queryTemplateId ?? undefined,
      queryResRef ?? undefined
    ]),
    previewImageUrl: `/assets/previews/placeables/${templateId}.webp`,
    metadata: {
      areaInstanceTemplateSource: "git",
      areaInstanceTemplateSynthesized: true,
      templateResRef: resref,
      resref,
      ...(queryTemplateId ? { requestedTemplateId: queryTemplateId } : {}),
      ...(queryResRef ? { requestedResRef: queryResRef } : {}),
      ...(appearanceType !== undefined ? { appearanceId: appearanceType } : {}),
      ...(genericType !== undefined ? { genericType } : {})
    }
  };
}

function buildAreaInstanceRenderFingerprint(query: PlaceableProcessQuery): string | null {
  const parts: string[] = [];
  if (query.appearanceType !== undefined) {
    parts.push(`appearance:${Math.trunc(query.appearanceType)}`);
  }
  if (query.genericType !== undefined) {
    parts.push(`generic:${Math.trunc(query.genericType)}`);
  }
  if (parts.length === 0) {
    return null;
  }
  if (query.subtypeHint) {
    parts.push(`subtype:${query.subtypeHint}`);
  }
  return `area-instance|${parts.join("|")}`;
}

function isAreaInstanceMissingRenderableModel(
  metadata: Record<string, string | number | boolean>
): boolean {
  if (metadata.areaInstanceRenderSource !== "git") {
    return false;
  }
  if (metadata.areaInstanceModelLookupStatus !== "blocked") {
    return false;
  }
  return (
    !normalizeAuroraModelResourceReference(metadata.modelResRef) &&
    !normalizeAuroraModelResourceReference(metadata.lookupModelResRef)
  );
}

function buildAreaInstanceMissingModelRenderPackage(
  metadata: Record<string, string | number | boolean>
): PlaceableRenderPackage {
  const appearanceType =
    typeof metadata.areaInstanceAppearanceType === "number"
      ? metadata.areaInstanceAppearanceType
      : typeof metadata.appearanceId === "number"
        ? metadata.appearanceId
        : null;
  const genericType =
    typeof metadata.areaInstanceGenericType === "number"
      ? metadata.areaInstanceGenericType
      : typeof metadata.genericType === "number"
        ? metadata.genericType
        : null;
  const sourceHint =
    appearanceType !== null
      ? `appearanceType ${appearanceType}`
      : genericType !== null
        ? `genericType ${genericType}`
        : "GIT instance";

  return {
    status: "unsupported",
    diagnostics: [
      {
        code: "PLACEABLE_RENDER_AREA_INSTANCE_MODEL_UNRESOLVED",
        severity: "warn",
        message: `${sourceHint} did not resolve to a renderable Aurora model resource.`
      }
    ],
    assetRefs: {}
  };
}

function buildPlaceableAssetDeliveryPath(
  cacheKey: string,
  asset: Pick<PlaceableAssetEntry, "assetId" | "extension" | "fileName">
): string {
  const encodedCacheKey = encodeURIComponent(cacheKey);
  const extension = normalizeDeliveryExtension(asset.extension || asset.fileName);
  const assetIdWithExtension = extension ? `${asset.assetId}.${extension}` : asset.assetId;
  const encodedAssetId = encodeURIComponent(assetIdWithExtension);
  return `/api/v1/catalog/placeables/cache/${encodedCacheKey}/assets/${encodedAssetId}`;
}

function normalizeDeliveryExtension(value: string): string {
  const normalized = value.trim().toLowerCase();
  const extension = normalized.includes(".")
    ? normalized.slice(normalized.lastIndexOf(".") + 1)
    : normalized;
  if (!/^[a-z0-9]{1,12}$/u.test(extension)) {
    return "";
  }
  return extension;
}

function buildPlaceableBatchRenderFactsKey(query: PlaceableProcessQuery): string {
  const appearanceType =
    Number.isInteger(query.appearanceType ?? Number.NaN) && query.appearanceType !== undefined
      ? String(Math.trunc(query.appearanceType))
      : "";
  const genericType =
    Number.isInteger(query.genericType ?? Number.NaN) && query.genericType !== undefined
      ? String(Math.trunc(query.genericType))
      : "";

  return [
    "placeable-process-batch/v1",
    normalizeLookupKey(query.templateId ?? ""),
    normalizeLookupKey(query.resref ?? ""),
    normalizeLookupKey(query.subtypeHint ?? ""),
    appearanceType,
    genericType,
    query.bypassCache === true ? "bypass" : "cache",
    query.includeBenchmarkMetadata === false ? "benchmark-stripped" : "benchmark-included"
  ].join("|");
}

function buildTemplateListCacheKey(kind: TemplateKind, query: TemplateListQuery): string {
  return [
    kind,
    normalizeLookupKey(query.query ?? ""),
    normalizeLookupKey(query.category ?? ""),
    normalizeLookupKey(query.tag ?? ""),
    normalizeLookupKey(query.subtype ?? ""),
    typeof query.benchmark === "boolean" ? String(query.benchmark) : "",
    String(query.limit),
    String(query.offset)
  ].join("|");
}

function normalizeLookupKey(value: string): string {
  return value.trim().toLowerCase();
}
