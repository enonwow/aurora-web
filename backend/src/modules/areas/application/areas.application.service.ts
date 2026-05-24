import { Inject, Injectable } from "@nestjs/common";
import { AppException } from "../../../common/http/app-exception";
import {
  AREA_PROCESSING_CACHE,
  type AreaProcessingCachePort
} from "./ports/area-processing-cache.port";
import {
  AREA_REPOSITORY,
  type AreaRepositoryPort
} from "./ports/area-repository.port";
import type {
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

@Injectable()
export class AreasApplicationService {
  private readonly inFlightAreaProcessing = new Map<string, Promise<AreaProcessingEnvelope>>();

  constructor(
    @Inject(AREA_REPOSITORY)
    private readonly repository: AreaRepositoryPort,
    @Inject(AREA_PROCESSING_CACHE)
    private readonly processingCache: AreaProcessingCachePort
  ) {}

  listAreas(query: {
    query?: string;
    biome?: string;
    tag?: string;
    benchmark?: boolean;
    limit: number;
    offset: number;
  }) {
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
        strategy: "blob-cache"
      },
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
      objectCounts: precomputed?.composition ?? countAreaObjectsByKind(area.objects),
      updatedAt: area.updatedAt
    };
  }

  async processArea(query: AreaProcessQuery) {
    const area = await this.resolveAreaRecord(query.areaId);
    const precomputed = this.repository.getPrecomputedAreaProcessing?.(area.areaId);
    const cacheKey = precomputed?.cacheKey ?? buildAreaProcessCacheKey(area);

    if (!query.bypassCache) {
      const cached = await this.processingCache.get(cacheKey);
      if (cached) {
        return {
          cache: {
            key: cacheKey,
            hit: true,
            storedAt: cached.storedAt,
            hits: cached.hits
          },
          area: cached.value
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
          strategy: "blob-cache"
        },
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
      : this.executeInFlight(this.inFlightAreaProcessing, cacheKey, processMiss);
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

    return {
      cache: {
        key: cacheKey,
        hit: true,
        storedAt: cached.storedAt,
        hits: cached.hits
      },
      area: cached.value
    };
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
}
