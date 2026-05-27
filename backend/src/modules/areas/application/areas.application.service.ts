import { Inject, Injectable } from "@nestjs/common";
import { executeInFlight } from "../../../common/async/in-flight.helpers";
import {
  buildBlobObjectHttpUrl,
  buildS3ObjectUrl
} from "../../../common/blob/blob-url.helpers";
import { AppException } from "../../../common/http/app-exception";
import { AppConfigService } from "../../../common/config/app-config.service";
import {
  MODULE_BLOB_STORAGE,
  type ModuleBlobObjectPayload,
  type ModuleBlobStoragePort
} from "../../runtime-settings/application/ports/module-blob-storage.port";
import {
  RUNTIME_SETTINGS_REPOSITORY,
  type RuntimeSettingsRepositoryPort
} from "../../runtime-settings/application/ports/runtime-settings-repository.port";
import type { BlobStorageSettings } from "../../runtime-settings/domain/runtime-settings.types";
import {
  AREA_PROCESSING_CACHE,
  type AreaProcessingCachePort
} from "./ports/area-processing-cache.port";
import {
  AREA_REPOSITORY,
  type AreaRepositoryPort
} from "./ports/area-repository.port";
import type {
  AreaDeliveryMode,
  AreaListQuery,
  AreaProcessQuery,
  AreaProcessingResult,
  AreaRecord
} from "../domain/area.types";
import {
  buildAreaProcessCacheKey,
  countAreaObjectsByKind
} from "../domain/area-processing.builders";

export interface AreaProcessingEnvelope {
  cache: {
    key: string;
    hit: boolean;
    storedAt: string;
    hits: number;
  };
  area: AreaProcessingResult;
}

export interface AreaTextureBlobEnvelope {
  cacheKey: string;
  textureAtlas: AreaProcessingResult["textureAtlas"];
  payload: ModuleBlobObjectPayload;
}

export interface AreaTextureDeliveryContract {
  mode: AreaDeliveryMode;
  atlasId: string;
  objectKey: string;
  contentType: string;
  sizeBytes: number;
  etag?: string;
  proxyPath: string;
  proxyUrl: string;
  directUrl?: string;
  s3Url?: string;
}

export interface AreaTextureDeliveryEnvelope {
  cacheKey: string;
  textureAtlas: AreaTextureDeliveryContract;
}

@Injectable()
export class AreasApplicationService {
  private readonly inFlightAreaProcessing = new Map<string, Promise<AreaProcessingEnvelope>>();

  constructor(
    @Inject(AREA_REPOSITORY)
    private readonly repository: AreaRepositoryPort,
    @Inject(AREA_PROCESSING_CACHE)
    private readonly processingCache: AreaProcessingCachePort,
    private readonly appConfig?: AppConfigService,
    @Inject(RUNTIME_SETTINGS_REPOSITORY)
    private readonly runtimeSettingsRepository?: RuntimeSettingsRepositoryPort,
    @Inject(MODULE_BLOB_STORAGE)
    private readonly moduleBlobStorage?: ModuleBlobStoragePort
  ) {}

  listAreas(query: AreaListQuery) {
    return this.repository.list(query);
  }

  async getArea(areaId: string) {
    const area = await this.repository.findById(areaId);
    if (!area) {
      throw new AppException({
        status: 404,
        code: "AREA_NOT_FOUND",
        message: "Area was not found."
      });
    }

    const precomputed = this.repository.getPrecomputedAreaProcessing?.(area.areaId);
    const counts = precomputed?.composition ?? countAreaObjectsByKind(area.objects);
    return {
      areaId: area.areaId,
      name: area.name,
      biome: area.biome,
      width: area.width,
      height: area.height,
      tags: area.tags,
      benchmark: area.benchmark,
      previewImageUrl: area.previewImageUrl,
      textureAtlas: {
        atlasId: area.textureAtlasId,
        cacheKey: `${area.textureAtlasId}:${area.width}x${area.height}`,
        strategy: "blob-cache",
        objectKey: area.textureAtlasObjectKey,
        contentType: area.textureAtlasContentType,
        sizeBytes: area.textureAtlasSizeBytes,
        etag: area.textureAtlasEtag
      },
      soundscape: area.soundscape,
      composition: counts,
      objects: area.objects,
      updatedAt: area.updatedAt
    };
  }

  async getAreaPreview(areaId: string) {
    const area = await this.repository.findById(areaId);
    if (!area) {
      throw new AppException({
        status: 404,
        code: "AREA_NOT_FOUND",
        message: "Area was not found."
      });
    }

    const precomputed = this.repository.getPrecomputedAreaProcessing?.(area.areaId);
    return {
      areaId: area.areaId,
      name: area.name,
      previewImageUrl: area.previewImageUrl,
      benchmark: area.benchmark,
      dimensions: {
        width: area.width,
        height: area.height
      },
      textureAtlasId: area.textureAtlasId,
      soundscape: area.soundscape,
      objectCounts: precomputed?.composition ?? countAreaObjectsByKind(area.objects),
      updatedAt: area.updatedAt
    };
  }

  async processArea(query: AreaProcessQuery) {
    let precomputed = this.repository.getPrecomputedAreaProcessing?.(query.areaId);
    if (!query.bypassCache && precomputed) {
      const cached = await this.processingCache.get(precomputed.cacheKey);
      if (cached) {
        const hydrated = await this.ensureAreaTextureAtlas(precomputed.cacheKey, cached.value);
        return {
          cache: {
            key: precomputed.cacheKey,
            hit: true,
            storedAt: cached.storedAt,
            hits: cached.hits
          },
          area: hydrated
        };
      }
    }

    const area = await this.resolveAreaRecord(query.areaId);
    precomputed = precomputed ?? this.repository.getPrecomputedAreaProcessing?.(area.areaId);
    const cacheKey = precomputed?.cacheKey ?? buildAreaProcessCacheKey(area);

    if (!query.bypassCache && !precomputed) {
      const cached = await this.processingCache.get(cacheKey);
      if (cached) {
        const hydrated = await this.ensureAreaTextureAtlas(cacheKey, cached.value);
        return {
          cache: {
            key: cacheKey,
            hit: true,
            storedAt: cached.storedAt,
            hits: cached.hits
          },
          area: hydrated
        };
      }
    }

    const processMiss = async (): Promise<AreaProcessingEnvelope> => {
      const composition = precomputed?.composition ?? countAreaObjectsByKind(area.objects);
      const textureAtlasCacheKey = `${area.textureAtlasId}:${area.width}x${area.height}`;
      const processed: AreaProcessingResult = {
        areaId: area.areaId,
        name: area.name,
        biome: area.biome,
        width: area.width,
        height: area.height,
        tags: area.tags,
        benchmark: area.benchmark,
        previewImageUrl: area.previewImageUrl,
        textureAtlas: {
          atlasId: area.textureAtlasId,
          cacheKey: textureAtlasCacheKey,
          strategy: "blob-cache",
          objectKey: area.textureAtlasObjectKey,
          contentType: area.textureAtlasContentType,
          sizeBytes: area.textureAtlasSizeBytes,
          etag: area.textureAtlasEtag
        },
        soundscape: area.soundscape,
        composition,
        objects: area.objects,
        updatedAt: area.updatedAt,
        processedAt: new Date().toISOString()
      };

      const stored = await this.processingCache.set(cacheKey, processed);
      return {
        cache: {
          key: cacheKey,
          hit: false,
          storedAt: stored.storedAt,
          hits: stored.hits
        },
        area: processed
      };
    };

    return query.bypassCache
      ? processMiss()
      : executeInFlight(this.inFlightAreaProcessing, cacheKey, processMiss);
  }

  async getProcessedArea(cacheKey: string) {
    const cached = await this.processingCache.get(cacheKey);
    if (!cached) {
      throw new AppException({
        status: 404,
        code: "AREA_CACHE_NOT_FOUND",
        message: "Area cache entry was not found."
      });
    }

    const hydrated = await this.ensureAreaTextureAtlas(cacheKey, cached.value);
    return {
      cache: {
        key: cacheKey,
        hit: true,
        storedAt: cached.storedAt,
        hits: cached.hits
      },
      area: hydrated
    };
  }

  async getProcessedAreaTexture(cacheKey: string): Promise<AreaTextureBlobEnvelope> {
    const cached = await this.processingCache.get(cacheKey);
    if (!cached) {
      throw new AppException({
        status: 404,
        code: "AREA_CACHE_NOT_FOUND",
        message: "Area cache entry was not found."
      });
    }

    const hydrated = await this.ensureAreaTextureAtlas(cacheKey, cached.value);
    if (
      !hydrated.textureAtlas.objectKey ||
      !hydrated.textureAtlas.contentType ||
      !hydrated.textureAtlas.sizeBytes
    ) {
      throw new AppException({
        status: 404,
        code: "AREA_TEXTURE_BLOB_NOT_FOUND",
        message: "Area texture blob metadata is missing in cache entry."
      });
    }

    const payload = await this.readModuleBlobObject(hydrated.textureAtlas.objectKey);
    if (!payload) {
      throw new AppException({
        status: 404,
        code: "AREA_TEXTURE_BLOB_NOT_FOUND",
        message: "Area texture blob object was not found."
      });
    }

    return {
      cacheKey,
      textureAtlas: hydrated.textureAtlas,
      payload
    };
  }

  async getProcessedAreaTextureDelivery(
    cacheKey: string,
    mode: AreaDeliveryMode
  ): Promise<AreaTextureDeliveryEnvelope> {
    const cached = await this.processingCache.get(cacheKey);
    if (!cached) {
      throw new AppException({
        status: 404,
        code: "AREA_CACHE_NOT_FOUND",
        message: "Area cache entry was not found."
      });
    }

    const hydrated = await this.ensureAreaTextureAtlas(cacheKey, cached.value);
    if (
      !hydrated.textureAtlas.objectKey ||
      !hydrated.textureAtlas.contentType ||
      !hydrated.textureAtlas.sizeBytes
    ) {
      throw new AppException({
        status: 404,
        code: "AREA_TEXTURE_BLOB_NOT_FOUND",
        message: "Area texture blob metadata is missing in cache entry."
      });
    }

    const blobSettings = await this.getBlobStorageSettings();
    if (mode === "direct" && !blobSettings) {
      throw new AppException({
        status: 422,
        code: "AREA_DIRECT_DELIVERY_UNAVAILABLE",
        message: "Direct area delivery is unavailable without blob storage settings."
      });
    }

    const proxyPath = buildAreaTextureDeliveryPath(cacheKey);
    return {
      cacheKey,
      textureAtlas: {
        mode,
        atlasId: hydrated.textureAtlas.atlasId,
        objectKey: hydrated.textureAtlas.objectKey,
        contentType: hydrated.textureAtlas.contentType,
        sizeBytes: hydrated.textureAtlas.sizeBytes,
        etag: hydrated.textureAtlas.etag,
        proxyPath,
        proxyUrl: proxyPath,
        directUrl:
          mode === "direct" && blobSettings
            ? buildBlobObjectHttpUrl(blobSettings, hydrated.textureAtlas.objectKey)
            : undefined,
        s3Url: blobSettings
          ? buildS3ObjectUrl(blobSettings.bucket, hydrated.textureAtlas.objectKey)
          : undefined
      }
    };
  }

  private async ensureAreaTextureAtlas(
    cacheKey: string,
    value: AreaProcessingResult
  ): Promise<AreaProcessingResult> {
    if (
      value.textureAtlas.objectKey &&
      value.textureAtlas.contentType &&
      (value.textureAtlas.sizeBytes ?? 0) > 0
    ) {
      return value;
    }

    const area = await this.repository.findById(value.areaId);
    if (!area) {
      return value;
    }

    const refreshed: AreaProcessingResult = {
      ...value,
      textureAtlas: {
        ...value.textureAtlas,
        objectKey: area.textureAtlasObjectKey,
        contentType: area.textureAtlasContentType,
        sizeBytes: area.textureAtlasSizeBytes,
        etag: area.textureAtlasEtag
      }
    };

    await this.processingCache.set(cacheKey, refreshed);
    return refreshed;
  }

  private async readModuleBlobObject(key: string): Promise<ModuleBlobObjectPayload | null> {
    if (!this.runtimeSettingsRepository || !this.moduleBlobStorage) {
      return null;
    }

    if (this.appConfig?.isTest && !this.appConfig.enableBlobAssetLookupInTest) {
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

  private async resolveAreaRecord(areaId: string): Promise<AreaRecord> {
    const area = await this.repository.findById(areaId);
    if (!area) {
      throw new AppException({
        status: 404,
        code: "AREA_NOT_FOUND",
        message: "Area was not found."
      });
    }
    return area;
  }

}

function buildAreaTextureDeliveryPath(cacheKey: string): string {
  const encodedCacheKey = encodeURIComponent(cacheKey);
  return `/api/v1/areas/cache/${encodedCacheKey}/textures`;
}
