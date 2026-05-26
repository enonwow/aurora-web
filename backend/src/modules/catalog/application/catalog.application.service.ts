import { Inject, Injectable } from "@nestjs/common";
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
import type { BlobStorageSettings } from "../../runtime-settings/domain/runtime-settings.types";
import type {
  BenchmarkDurationSummary,
  PlaceableAssetEntry,
  PlaceableAssetManifest,
  PlaceableBenchmarkResult,
  PlaceableBenchmarkRunQuery,
  PlaceableProcessQuery,
  PlaceableSubtype,
  TemplateProcessQuery,
  TemplateProcessingResult,
  TemplateKind,
  TemplateRecord,
  TemplateListQuery
} from "../domain/template.types";
import {
  buildPlaceableProcessCacheKey,
  buildTemplateProcessCacheKey
} from "../domain/cache-key.builders";
import {
  buildCreatureRuntimeProjection,
  buildCreatureValidationIssues,
  buildBenchmarkFingerprint,
  buildModuleSnapshotIndex,
  buildRenderContract,
  buildTemplateRenderContract,
  buildEmptyPlaceableAssetManifest,
  collectPlaceableAssetsFromSnapshot,
  maybeStripBenchmarkMetadata,
  maybeStripTemplateBenchmarkMetadata,
  normalizePrefixForLookup,
  resolvePlaceableClassification,
  summarizeDurations,
  type ModuleSnapshotIndex
} from "./catalog-processing.helpers";

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

const MODULE_HASH_PROBE_TTL_MS = 30_000;
const MODULE_SNAPSHOT_INDEX_FAILURE_TTL_MS = 30_000;
const TEMPLATE_LOOKUP_TTL_MS = 60_000;
const PLACEABLE_MANIFEST_VALIDATION_TTL_MS = 30_000;
const DEFAULT_TEMPLATE_LOOKUP_CACHE_MAX_ENTRIES = 2_500;
const DEFAULT_MANIFEST_VALIDATION_CACHE_MAX_ENTRIES = 5_000;

interface TemplateLookupCacheEntry {
  template: TemplateRecord;
  expiresAtMs: number;
}

interface PlaceableManifestValidationEntry {
  moduleHash?: string;
  expiresAtMs: number;
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
  private moduleHashProbeCache:
    | {
        value: string | undefined;
        fetchedAtMs: number;
      }
    | null = null;
  private moduleHashProbeInFlight: Promise<string | undefined> | null = null;
  private readonly templateByIdCache = new Map<string, TemplateLookupCacheEntry>();
  private readonly templateByResrefCache = new Map<string, TemplateLookupCacheEntry>();
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
    private readonly moduleBlobStorage?: ModuleBlobStoragePort
  ) {
    const configuredBase =
      this.appConfig?.processingCacheL1CatalogMaxEntries ??
      DEFAULT_TEMPLATE_LOOKUP_CACHE_MAX_ENTRIES;
    this.templateLookupCacheMaxEntries = Math.max(500, configuredBase * 2);
    this.manifestValidationCacheMaxEntries = Math.max(1000, configuredBase * 4);
  }

  listPlaceables(query: TemplateListQuery) {
    return this.repository.listByKind("placeable", query);
  }

  listTemplateKind<TKind extends TemplateProcessingKind>(
    kind: TKind,
    query: TemplateListQuery
  ) {
    return this.repository.listByKind(kind, query);
  }

  listCreatures(query: TemplateListQuery) {
    return this.listTemplateKind("creature", query);
  }

  listItems(query: TemplateListQuery) {
    return this.listTemplateKind("item", query);
  }

  async getPlaceablePreview(templateId: string) {
    return this.getPreviewByKind("placeable", templateId);
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

  async processPlaceable(query: PlaceableProcessQuery) {
    const template = await this.resolvePlaceableTemplate(query);
    const classification = resolvePlaceableClassification(
      template.placeableSubtype,
      query.subtypeHint
    );
    const cacheKey =
      this.repository.getPrecomputedPlaceableCacheKey?.(
        template.templateId,
        classification.normalizedSubtype
      ) ??
      buildPlaceableProcessCacheKey(
        template.templateId,
        template.resref,
        classification.normalizedSubtype
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
      const assetManifest = await this.buildPlaceableAssetManifest({
        templateId: template.templateId,
        resref: template.resref,
        subtype: classification.normalizedSubtype,
        metadata: template.metadata
      });

      const processed: PlaceableProcessingResult = {
        templateId: template.templateId,
        resref: template.resref,
        name: template.name,
        category: template.category,
        placeableSubtype: classification.normalizedSubtype,
        render: buildRenderContract(classification.normalizedSubtype),
        benchmarkCandidate: template.benchmarkCandidate ?? false,
        benchmarkBucket: template.benchmarkBucket,
        metadata: template.metadata,
        assetManifest,
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

    const result = query.bypassCache
      ? await processMiss()
      : await this.executeInFlight(
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
        const deliveryPath = buildPlaceableAssetDeliveryPath(cacheKey, asset.assetId);
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
      previewImageUrl: template.previewImageUrl,
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
      : await this.executeInFlight(
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
    const hasManifest = value.assetManifest?.version === "placeable-asset-manifest/v1";
    if (!hasManifest) {
      const manifest = await this.buildPlaceableAssetManifest({
        templateId: value.templateId,
        resref: value.resref,
        subtype: value.placeableSubtype,
        metadata: value.metadata
      });

      const refreshed: PlaceableProcessingResult = {
        ...value,
        assetManifest: manifest
      };
      await this.placeableCache.set<PlaceableProcessingResult>(cacheKey, refreshed);
      this.rememberManifestValidation(cacheKey, manifest.moduleHash);
      return refreshed;
    }

    const manifestModuleHash = value.assetManifest.moduleHash;
    if (this.isManifestValidationFresh(cacheKey, manifestModuleHash)) {
      return value;
    }

    if (this.appConfig?.isTest && !this.appConfig.enableBlobAssetLookupInTest) {
      this.rememberManifestValidation(cacheKey, manifestModuleHash);
      return value;
    }

    const currentModuleHash = await this.getCurrentModuleHash();
    const shouldRefreshManifest =
      typeof currentModuleHash === "string" &&
        currentModuleHash.length > 0 &&
        manifestModuleHash !== currentModuleHash;

    if (!shouldRefreshManifest) {
      this.rememberManifestValidation(cacheKey, manifestModuleHash);
      return value;
    }

    const manifest = await this.buildPlaceableAssetManifest({
      templateId: value.templateId,
      resref: value.resref,
      subtype: value.placeableSubtype,
      metadata: value.metadata
    });

    const refreshed: PlaceableProcessingResult = {
      ...value,
      assetManifest: manifest
    };
    await this.placeableCache.set<PlaceableProcessingResult>(cacheKey, refreshed);
    this.rememberManifestValidation(cacheKey, manifest.moduleHash);
    return refreshed;
  }

  private async buildPlaceableAssetManifest(input: {
    templateId: string;
    resref: string;
    subtype: PlaceableSubtype;
    metadata: Record<string, string | number | boolean>;
  }): Promise<PlaceableAssetManifest> {
    if (this.appConfig?.isTest && !this.appConfig.enableBlobAssetLookupInTest) {
      return buildEmptyPlaceableAssetManifest();
    }

    const index = await this.getModuleSnapshotIndex();
    if (!index) {
      return buildEmptyPlaceableAssetManifest();
    }

    const assets = collectPlaceableAssetsFromSnapshot(index, input);
    return {
      version: "placeable-asset-manifest/v1",
      source: "module-blob-snapshot",
      generatedAt: new Date().toISOString(),
      moduleHash: index.moduleHash,
      assetCount: assets.length,
      candidatesScanned: index.candidatesScanned,
      assets
    };
  }

  private async getModuleSnapshotIndex(): Promise<ModuleSnapshotIndex | null> {
    if (!this.runtimeSettingsRepository || !this.moduleBlobStorage) {
      return null;
    }

    const now = Date.now();
    if (this.moduleSnapshotIndexCache && now - this.moduleSnapshotIndexCache.fetchedAtMs < 30_000) {
      return this.moduleSnapshotIndexCache.index;
    }
    if (
      this.moduleSnapshotIndexFailureCache &&
      this.moduleSnapshotIndexFailureCache.expiresAtMs > now
    ) {
      return null;
    }

    try {
      const settings = await this.runtimeSettingsRepository.get();
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
        fetchedAtMs: now
      };
      this.moduleSnapshotIndexFailureCache = null;
      return index;
    } catch {
      this.moduleSnapshotIndexFailureCache = {
        expiresAtMs: now + MODULE_SNAPSHOT_INDEX_FAILURE_TTL_MS
      };
      return null;
    }
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
        const index = await this.getModuleSnapshotIndex();
        const value = index?.moduleHash;
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

  private executeInFlight<T>(
    inFlight: Map<string, Promise<T>>,
    key: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const existing = inFlight.get(key);
    if (existing) {
      return existing;
    }

    const pending = operation().finally(() => {
      inFlight.delete(key);
    });
    inFlight.set(key, pending);
    return pending;
  }

  private async ensureTemplateProjection(
    kind: TemplateProcessingKind,
    cacheKey: string,
    value: TemplateProcessingResult
  ): Promise<TemplateProcessingResult> {
    if (kind !== "creature") {
      return value;
    }

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

function buildPlaceableAssetDeliveryPath(cacheKey: string, assetId: string): string {
  const encodedCacheKey = encodeURIComponent(cacheKey);
  const encodedAssetId = encodeURIComponent(assetId);
  return `/api/v1/catalog/placeables/cache/${encodedCacheKey}/assets/${encodedAssetId}`;
}

function buildS3ObjectUrl(bucket: string, objectKey: string): string {
  const normalizedObjectKey = objectKey.replace(/^\/+/u, "");
  return `s3://${bucket}/${normalizedObjectKey}`;
}

function normalizeLookupKey(value: string): string {
  return value.trim().toLowerCase();
}
