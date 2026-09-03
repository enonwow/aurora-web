import type {
  AreaObjectCounts,
  AreaListQuery,
  AreaListResult,
  AreaRecord
} from "../../domain/area.types";

export const AREA_REPOSITORY = Symbol("AREA_REPOSITORY");

export interface AreaRepositoryPort {
  list(query: AreaListQuery): Promise<AreaListResult>;
  findById(areaId: string): Promise<AreaRecord | null>;
  /**
   * Returns the already indexed Area without editor-only catalog hydration.
   * List previews, thumbnails, and topology identity must not force the full
   * template catalog into memory for every visible Area.
   */
  findLightweightById?(areaId: string): Promise<AreaRecord | null>;
  getPrecomputedAreaProcessing?(
    areaId: string
  ): { cacheKey: string; composition: AreaObjectCounts } | null;
}
