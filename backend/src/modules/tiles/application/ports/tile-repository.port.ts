import type { TileListQuery, TileListResult, TileRecord } from "../../domain/tile.types";

export const TILE_REPOSITORY = Symbol("TILE_REPOSITORY");

export interface TileRepositoryPort {
  list(query: TileListQuery): Promise<TileListResult>;
  findById(tileId: string): Promise<TileRecord | null>;
  getPrecomputedTileProcessing?(tileId: string): { cacheKey: string } | null;
}
