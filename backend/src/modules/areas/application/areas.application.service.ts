import { Inject, Injectable } from "@nestjs/common";
import { AppException } from "../../../common/http/app-exception";
import {
  AREA_REPOSITORY,
  type AreaRepositoryPort
} from "./ports/area-repository.port";
import type {
  AreaObjectCounts,
  AreaObjectPlacement
} from "../domain/area.types";

@Injectable()
export class AreasApplicationService {
  constructor(
    @Inject(AREA_REPOSITORY)
    private readonly repository: AreaRepositoryPort
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
