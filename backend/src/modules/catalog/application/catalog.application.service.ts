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
  TemplateListQuery
} from "../domain/template.types";
import {
  buildPlaceableProcessCacheKey,
  buildTemplateProcessCacheKey
} from "../domain/cache-key.builders";
import {
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
  ) {}

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
        const hydrated = await this.ensurePlaceableManifest(cached.value);
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

    const hydrated = await this.ensurePlaceableManifest(cached.value);

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

    const hydrated = await this.ensurePlaceableManifest(cached.value);
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
      const byId = await this.repository.findByKindAndId("placeable", query.templateId);
      if (byId) {
        return byId;
      }
    }

    if (query.resref) {
      const byResref = await this.repository.findByKindAndResref("placeable", query.resref);
      if (byResref) {
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
        return {
          cache: {
            key: cacheKey,
            hit: true,
            storedAt: cached.storedAt,
            hits: cached.hits
          },
          value: maybeStripTemplateBenchmarkMetadata(
            cached.value,
            query.includeBenchmarkMetadata
          )
        };
      }
    }

    const processMiss = async (): Promise<TemplateProcessingEnvelope> => {
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

    return {
      cache: {
        key: cacheKey,
        hit: true,
        storedAt: cached.storedAt,
        hits: cached.hits
      },
      value: cached.value
    };
  }

  private async resolveTemplateByKind(kind: TemplateProcessingKind, query: TemplateProcessQuery) {
    if (query.templateId) {
      const byId = await this.repository.findByKindAndId(kind, query.templateId);
      if (byId) {
        return byId;
      }
    }

    if (query.resref) {
      const byResref = await this.repository.findByKindAndResref(kind, query.resref);
      if (byResref) {
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
    value: PlaceableProcessingResult
  ): Promise<PlaceableProcessingResult> {
    if (value.assetManifest?.version === "placeable-asset-manifest/v1") {
      return value;
    }

    const manifest = await this.buildPlaceableAssetManifest({
      templateId: value.templateId,
      resref: value.resref,
      subtype: value.placeableSubtype,
      metadata: value.metadata
    });

    return {
      ...value,
      assetManifest: manifest
    };
  }

  private async buildPlaceableAssetManifest(input: {
    templateId: string;
    resref: string;
    subtype: PlaceableSubtype;
    metadata: Record<string, string | number | boolean>;
  }): Promise<PlaceableAssetManifest> {
    if (this.appConfig?.isTest) {
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

    const settings = await this.runtimeSettingsRepository.get();
    const snapshot = await this.listAllModuleSnapshotObjects(settings.blobStorage);
    const cacheKey = [
      settings.blobStorage.bucket,
      snapshot.prefix,
      snapshot.moduleHash ?? "unknown",
      String(snapshot.objects.length)
    ].join("|");

    if (this.moduleSnapshotIndexCache?.key === cacheKey) {
      return this.moduleSnapshotIndexCache.index;
    }

    const index = buildModuleSnapshotIndex(snapshot);
    this.moduleSnapshotIndexCache = {
      key: cacheKey,
      index,
      fetchedAtMs: now
    };
    return index;
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
      if (inFlight.get(key) === pending) {
        inFlight.delete(key);
      }
    });
    inFlight.set(key, pending);
    return pending;
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
