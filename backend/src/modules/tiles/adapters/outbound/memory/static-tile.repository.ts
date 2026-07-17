import { Injectable } from "@nestjs/common";
import type { TileRepositoryPort } from "../../../application/ports/tile-repository.port";
import type {
  TileListItem,
  TileListQuery,
  TileListResult,
  TileRecord
} from "../../../domain/tile.types";
import { buildTileProcessCacheKey } from "../../../domain/tile-processing.builders";

interface IndexedTile {
  record: TileRecord;
  listItem: TileListItem;
  processingCacheKey: string;
  searchable: string;
  tilesetLower: string;
  variantLower: string;
  walkmeshLower: string;
  tagsLower: Set<string>;
}

const TILES: TileRecord[] = [
  {
    tileId: "tile_city_street_001",
    resref: "tcn01_city_street",
    name: "City Street (Stone)",
    tileset: "city",
    variant: "street",
    tags: ["urban", "stone", "road"],
    benchmark: true,
    previewImageUrl: "/assets/previews/tiles/city-street.webp",
    textureAtlasId: "atlas_tile_city_v1",
    textureAtlasObjectKey: "modules/current/tiles/atlases/atlas_tile_city_v1.webp",
    textureAtlasContentType: "image/webp",
    textureAtlasSizeBytes: 262144,
    textureAtlasEtag: "atlas-city-v1",
    textureAtlasFingerprint: "static:atlas:tile_city_v1",
    walkmesh: "walkable",
    metrics: {
      triangles: 1240,
      meshes: 18,
      emitters: 0
    },
    updatedAt: "2026-05-24T12:30:00.000Z"
  },
  {
    tileId: "tile_city_gate_002",
    resref: "tcn02_city_gate",
    name: "City Gate Transition",
    tileset: "city",
    variant: "transition",
    tags: ["urban", "gate", "transition"],
    benchmark: true,
    previewImageUrl: "/assets/previews/tiles/city-gate.webp",
    textureAtlasId: "atlas_tile_city_v1",
    textureAtlasObjectKey: "modules/current/tiles/atlases/atlas_tile_city_v1.webp",
    textureAtlasContentType: "image/webp",
    textureAtlasSizeBytes: 262144,
    textureAtlasEtag: "atlas-city-v1",
    textureAtlasFingerprint: "static:atlas:tile_city_v1",
    walkmesh: "walkable",
    metrics: {
      triangles: 1680,
      meshes: 26,
      emitters: 1
    },
    updatedAt: "2026-05-24T12:30:00.000Z"
  },
  {
    tileId: "tile_swamp_water_003",
    resref: "tss01_swamp_water",
    name: "Swamp Water",
    tileset: "swamp",
    variant: "water",
    tags: ["water", "swamp", "outdoor"],
    benchmark: false,
    previewImageUrl: "/assets/previews/tiles/swamp-water.webp",
    textureAtlasId: "atlas_tile_swamp_v1",
    textureAtlasObjectKey: "modules/current/tiles/atlases/atlas_tile_swamp_v1.webp",
    textureAtlasContentType: "image/webp",
    textureAtlasSizeBytes: 233472,
    textureAtlasEtag: "atlas-swamp-v1",
    textureAtlasFingerprint: "static:atlas:tile_swamp_v1",
    walkmesh: "water",
    metrics: {
      triangles: 920,
      meshes: 11,
      emitters: 2
    },
    updatedAt: "2026-05-23T09:10:00.000Z"
  },
  {
    tileId: "tile_dungeon_corner_004",
    resref: "tdn01_corner",
    name: "Dungeon Corner",
    tileset: "dungeon",
    variant: "corner",
    tags: ["interior", "dungeon", "stone"],
    benchmark: false,
    previewImageUrl: "/assets/previews/tiles/dungeon-corner.webp",
    textureAtlasId: "atlas_tile_dungeon_v1",
    textureAtlasObjectKey: "modules/current/tiles/atlases/atlas_tile_dungeon_v1.webp",
    textureAtlasContentType: "image/webp",
    textureAtlasSizeBytes: 229376,
    textureAtlasEtag: "atlas-dungeon-v1",
    textureAtlasFingerprint: "static:atlas:tile_dungeon_v1",
    walkmesh: "walkable",
    metrics: {
      triangles: 1060,
      meshes: 15,
      emitters: 0
    },
    updatedAt: "2026-05-23T09:10:00.000Z"
  },
  {
    tileId: "tile_dungeon_blocked_005",
    resref: "tdn01_blocked",
    name: "Dungeon Rubble Blocked",
    tileset: "dungeon",
    variant: "blocked",
    tags: ["interior", "blocked", "rubble"],
    benchmark: false,
    previewImageUrl: "/assets/previews/tiles/dungeon-blocked.webp",
    textureAtlasId: "atlas_tile_dungeon_v1",
    textureAtlasObjectKey: "modules/current/tiles/atlases/atlas_tile_dungeon_v1.webp",
    textureAtlasContentType: "image/webp",
    textureAtlasSizeBytes: 229376,
    textureAtlasEtag: "atlas-dungeon-v1",
    textureAtlasFingerprint: "static:atlas:tile_dungeon_v1",
    walkmesh: "blocked",
    metrics: {
      triangles: 870,
      meshes: 9,
      emitters: 0
    },
    updatedAt: "2026-05-23T09:10:00.000Z"
  }
];

const INDEXED_TILES: IndexedTile[] = TILES.map((tile) => ({
  record: tile,
  listItem: mapTileToListItem(tile),
  processingCacheKey: buildTileProcessCacheKey(tile),
  searchable: buildTileSearchableText(tile),
  tilesetLower: tile.tileset.toLowerCase(),
  variantLower: tile.variant.toLowerCase(),
  walkmeshLower: tile.walkmesh.toLowerCase(),
  tagsLower: new Set(tile.tags.map((tag) => tag.toLowerCase()))
}));

const TILES_BY_ID = new Map<string, TileRecord>(
  INDEXED_TILES.map((entry) => [entry.record.tileId, entry.record])
);

const TILES_PROCESSING_BY_ID = new Map<string, { cacheKey: string }>(
  INDEXED_TILES.map((entry) => [entry.record.tileId, { cacheKey: entry.processingCacheKey }])
);

@Injectable()
export class StaticTileRepository implements TileRepositoryPort {
  async list(query: TileListQuery): Promise<TileListResult> {
    const normalizedQuery = query.query?.toLowerCase().trim();
    const normalizedTileset = query.tileset?.toLowerCase().trim();
    const normalizedVariant = query.variant?.toLowerCase().trim();
    const normalizedWalkmesh = query.walkmesh?.toLowerCase().trim();
    const normalizedTag = query.tag?.toLowerCase().trim();

    const filtered = INDEXED_TILES.filter((tile) => {
      if (!query.query) {
        return true;
      }
      return tile.searchable.includes(normalizedQuery ?? "");
    })
      .filter((tile) => {
        if (!query.tileset) {
          return true;
        }
        return tile.tilesetLower === normalizedTileset;
      })
      .filter((tile) => {
        if (!query.variant) {
          return true;
        }
        return tile.variantLower === normalizedVariant;
      })
      .filter((tile) => {
        if (!query.walkmesh) {
          return true;
        }
        return tile.walkmeshLower === normalizedWalkmesh;
      })
      .filter((tile) => {
        if (!query.tag) {
          return true;
        }
        return tile.tagsLower.has(normalizedTag ?? "");
      })
      .filter((tile) => {
        if (typeof query.benchmark !== "boolean") {
          return true;
        }
        return tile.record.benchmark === query.benchmark;
      });

    const items = filtered
      .slice(query.offset, query.offset + query.limit)
      .map((tile) => tile.listItem);

    return {
      items,
      total: filtered.length,
      limit: query.limit,
      offset: query.offset
    };
  }

  async findById(tileId: string): Promise<TileRecord | null> {
    return TILES_BY_ID.get(tileId) ?? null;
  }

  getPrecomputedTileProcessing(tileId: string): { cacheKey: string } | null {
    return TILES_PROCESSING_BY_ID.get(tileId) ?? null;
  }
}

function mapTileToListItem(tile: TileRecord): TileListItem {
  return {
    tileId: tile.tileId,
    resref: tile.resref,
    name: tile.name,
    tileset: tile.tileset,
    variant: tile.variant,
    tags: tile.tags,
    benchmark: tile.benchmark,
    previewImageUrl: tile.previewImageUrl,
    walkmesh: tile.walkmesh,
    metrics: tile.metrics,
    updatedAt: tile.updatedAt
  };
}

function buildTileSearchableText(tile: TileRecord): string {
  return [tile.name, tile.tileId, tile.resref, ...tile.tags].join("|").toLowerCase();
}
