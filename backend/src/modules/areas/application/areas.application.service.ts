import { Inject, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
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
  AreaObjectCounts,
  AreaObjectPlacement,
  AreaProcessQuery,
  AreaProcessingResult
} from "../domain/area.types";

@Injectable()
export class AreasApplicationService {
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

    const counts = countObjectsByKind(area.objects);
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
      objectCounts: countObjectsByKind(area.objects),
      updatedAt: area.updatedAt
    };
  }

  async processArea(query: AreaProcessQuery) {
    const area = await this.getArea(query.areaId);
    const cacheKey = buildAreaCacheKey(area);

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

    const processed: AreaProcessingResult = {
      areaId: area.areaId,
      name: area.name,
      biome: area.biome,
      width: area.width,
      height: area.height,
      tags: [...area.tags],
      benchmark: area.benchmark,
      previewImageUrl: area.previewImageUrl,
      textureAtlas: {
        atlasId: area.textureAtlas.atlasId,
        cacheKey: area.textureAtlas.cacheKey,
        strategy: "blob-cache"
      },
      composition: {
        ...area.composition
      },
      objects: area.objects.map((object) => ({ ...object })),
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
}

function countObjectsByKind(objects: AreaObjectPlacement[]): AreaObjectCounts {
  const counts = {
    placeables: 0,
    creatures: 0,
    items: 0,
    total: 0
  };

  for (const object of objects) {
    counts.total += 1;
    if (object.kind === "placeable") {
      counts.placeables += 1;
      continue;
    }
    if (object.kind === "creature") {
      counts.creatures += 1;
      continue;
    }
    counts.items += 1;
  }

  return counts;
}

function buildAreaCacheKey(area: {
  areaId: string;
  width: number;
  height: number;
  updatedAt: string;
  textureAtlas: { atlasId: string };
  objects: Array<{ objectId: string; templateId: string; x: number; y: number; z: number; bearing: number }>;
}) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        type: "area-process/v1",
        areaId: area.areaId,
        width: area.width,
        height: area.height,
        updatedAt: area.updatedAt,
        textureAtlasId: area.textureAtlas.atlasId,
        objects: area.objects.map((object) => ({
          objectId: object.objectId,
          templateId: object.templateId,
          x: object.x,
          y: object.y,
          z: object.z,
          bearing: object.bearing
        }))
      })
    )
    .digest("hex");
}
