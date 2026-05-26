import { Injectable } from "@nestjs/common";
import type { AreaRepositoryPort } from "../../../application/ports/area-repository.port";
import type {
  AreaListItem,
  AreaListQuery,
  AreaListResult,
  AreaObjectCounts,
  AreaRecord
} from "../../../domain/area.types";
import {
  buildAreaProcessCacheKey,
  countAreaObjectsByKind
} from "../../../domain/area-processing.builders";

interface IndexedArea {
  record: AreaRecord;
  listItem: AreaListItem;
  composition: AreaObjectCounts;
  processingCacheKey: string;
  searchable: string;
  biomeLower: string;
  tagsLower: Set<string>;
}

const DEFAULT_SOUND_BINDING_KEYS = {
  areaKey: "GI_sound_area" as const,
  randomKey: "GI_sound_rndm" as const,
  positionalKey: "GI_sound_pos" as const
};

const AREAS: AreaRecord[] = [
  {
    areaId: "area_market_district_001",
    name: "Market District - Day",
    biome: "urban",
    width: 24,
    height: 24,
    tags: ["benchmark", "city", "traders"],
    benchmark: true,
    previewImageUrl: "/assets/previews/areas/market-district-day.webp",
    textureAtlasId: "atlas_urban_day_v1",
    soundscape: buildAreaSoundscape("urban"),
    objects: [
      {
        objectId: "obj_plc_001",
        kind: "placeable",
        templateId: "plc_market_stall_001",
        x: 4.2,
        y: 8.1,
        z: 0,
        bearing: 90
      },
      {
        objectId: "obj_plc_002",
        kind: "placeable",
        templateId: "plc_city_gate_001",
        x: 1.2,
        y: 11.4,
        z: 0,
        bearing: 180
      },
      {
        objectId: "obj_plc_003",
        kind: "placeable",
        templateId: "plc_torch_smoke_vfx_001",
        x: 5.8,
        y: 7.5,
        z: 1.8,
        bearing: 0
      },
      {
        objectId: "obj_cre_001",
        kind: "creature",
        templateId: "cre_guard_human_001",
        x: 6.3,
        y: 10.9,
        z: 0,
        bearing: 45
      },
      {
        objectId: "obj_itm_001",
        kind: "item",
        templateId: "itm_health_potion_001",
        x: 4.7,
        y: 8.5,
        z: 0,
        bearing: 0
      }
    ],
    updatedAt: "2026-05-22T12:30:00.000Z"
  },
  {
    areaId: "area_forest_crossing_001",
    name: "Forest Crossing",
    biome: "forest",
    width: 28,
    height: 20,
    tags: ["outdoor", "encounter", "wolves"],
    benchmark: false,
    previewImageUrl: "/assets/previews/areas/forest-crossing.webp",
    textureAtlasId: "atlas_forest_mixed_v1",
    soundscape: buildAreaSoundscape("forest"),
    objects: [
      {
        objectId: "obj_plc_101",
        kind: "placeable",
        templateId: "plc_crate_stack_001",
        x: 12.4,
        y: 4.2,
        z: 0,
        bearing: 10
      },
      {
        objectId: "obj_cre_101",
        kind: "creature",
        templateId: "cre_wolf_001",
        x: 15.8,
        y: 9.9,
        z: 0,
        bearing: 220
      },
      {
        objectId: "obj_itm_101",
        kind: "item",
        templateId: "itm_scroll_fireball_001",
        x: 13.1,
        y: 6.3,
        z: 0,
        bearing: 0
      }
    ],
    updatedAt: "2026-05-20T08:12:00.000Z"
  },
  {
    areaId: "area_dungeon_entry_001",
    name: "Dungeon Entry Hall",
    biome: "dungeon",
    width: 18,
    height: 18,
    tags: ["benchmark", "interior", "combat"],
    benchmark: true,
    previewImageUrl: "/assets/previews/areas/dungeon-entry-hall.webp",
    textureAtlasId: "atlas_dungeon_stone_v1",
    soundscape: buildAreaSoundscape("dungeon"),
    objects: [
      {
        objectId: "obj_plc_201",
        kind: "placeable",
        templateId: "plc_city_gate_001",
        x: 2.5,
        y: 8.7,
        z: 0,
        bearing: 270
      },
      {
        objectId: "obj_plc_202",
        kind: "placeable",
        templateId: "plc_torch_smoke_vfx_001",
        x: 2.1,
        y: 7.8,
        z: 1.4,
        bearing: 0
      },
      {
        objectId: "obj_cre_201",
        kind: "creature",
        templateId: "cre_guard_human_001",
        x: 8.8,
        y: 11.5,
        z: 0,
        bearing: 90
      }
    ],
    updatedAt: "2026-05-21T17:40:00.000Z"
  }
];

const INDEXED_AREAS: IndexedArea[] = AREAS.map((area) => {
  const composition = countAreaObjectsByKind(area.objects);
  return {
    composition,
    processingCacheKey: buildAreaProcessCacheKey(area),
    record: area,
    listItem: mapAreaToListItem(area, composition),
    searchable: buildAreaSearchableText(area),
    biomeLower: area.biome.toLowerCase(),
    tagsLower: new Set(area.tags.map((tag) => tag.toLowerCase()))
  };
});

const AREAS_BY_ID = new Map<string, AreaRecord>(
  INDEXED_AREAS.map((entry) => [entry.record.areaId, entry.record])
);
const AREAS_PROCESSING_BY_ID = new Map<
  string,
  { cacheKey: string; composition: AreaObjectCounts }
>(
  INDEXED_AREAS.map((entry) => [
    entry.record.areaId,
    {
      cacheKey: entry.processingCacheKey,
      composition: entry.composition
    }
  ])
);

@Injectable()
export class StaticAreaRepository implements AreaRepositoryPort {
  async list(query: AreaListQuery): Promise<AreaListResult> {
    const normalizedQuery = query.query?.toLowerCase().trim();
    const normalizedBiome = query.biome?.toLowerCase().trim();
    const normalizedTag = query.tag?.toLowerCase().trim();

    const filtered = INDEXED_AREAS.filter((area) => {
      if (!query.query) {
        return true;
      }
      return area.searchable.includes(normalizedQuery ?? "");
    })
      .filter((area) => {
        if (!query.biome) {
          return true;
        }
        return area.biomeLower === normalizedBiome;
      })
      .filter((area) => {
        if (!query.tag) {
          return true;
        }
        return area.tagsLower.has(normalizedTag ?? "");
      })
      .filter((area) => {
        if (typeof query.benchmark !== "boolean") {
          return true;
        }
        return area.record.benchmark === query.benchmark;
      });

    const items = filtered
      .slice(query.offset, query.offset + query.limit)
      .map((area) => area.listItem);

    return {
      items,
      total: filtered.length,
      limit: query.limit,
      offset: query.offset
    };
  }

  async findById(areaId: string): Promise<AreaRecord | null> {
    return AREAS_BY_ID.get(areaId) ?? null;
  }

  getPrecomputedAreaProcessing(areaId: string): {
    cacheKey: string;
    composition: AreaObjectCounts;
  } | null {
    return AREAS_PROCESSING_BY_ID.get(areaId) ?? null;
  }
}

function mapAreaToListItem(area: AreaRecord, composition: AreaObjectCounts): AreaListItem {
  return {
    areaId: area.areaId,
    name: area.name,
    biome: area.biome,
    width: area.width,
    height: area.height,
    tags: area.tags,
    benchmark: area.benchmark,
    previewImageUrl: area.previewImageUrl,
    textureAtlasId: area.textureAtlasId,
    objectCounts: composition,
    updatedAt: area.updatedAt
  };
}

function buildAreaSearchableText(area: AreaRecord): string {
  return [area.name, area.areaId, ...area.tags].join("|").toLowerCase();
}

function buildAreaSoundscape(biome: string): AreaRecord["soundscape"] {
  const normalized = biome.toLowerCase();

  if (normalized === "urban") {
    return {
      bindingKeys: DEFAULT_SOUND_BINDING_KEYS,
      area: [
        {
          soundId: "sound_ambient_city_market_001",
          resref: "amb_city_market_day",
          category: "ambient",
          playbackMode: "interval",
          ambientOnly: true
        }
      ],
      random: [
        {
          soundId: "sound_effect_door_creak_005",
          resref: "sfx_door_creak_long",
          category: "effect",
          playbackMode: "random",
          ambientOnly: false
        }
      ],
      positional: [
        {
          soundId: "sound_effect_forge_loop_003",
          resref: "sfx_forge_loop_heavy",
          category: "effect",
          playbackMode: "looping",
          ambientOnly: false
        }
      ]
    };
  }

  if (normalized === "dungeon") {
    return {
      bindingKeys: DEFAULT_SOUND_BINDING_KEYS,
      area: [
        {
          soundId: "sound_ambient_swamp_night_004",
          resref: "amb_swamp_night",
          category: "ambient",
          playbackMode: "interval",
          ambientOnly: true
        }
      ],
      random: [
        {
          soundId: "sound_effect_door_creak_005",
          resref: "sfx_door_creak_long",
          category: "effect",
          playbackMode: "random",
          ambientOnly: false
        }
      ],
      positional: [
        {
          soundId: "sound_effect_forge_loop_003",
          resref: "sfx_forge_loop_heavy",
          category: "effect",
          playbackMode: "looping",
          ambientOnly: false
        }
      ]
    };
  }

  return {
    bindingKeys: DEFAULT_SOUND_BINDING_KEYS,
    area: [
      {
        soundId: "sound_ambient_swamp_night_004",
        resref: "amb_swamp_night",
        category: "ambient",
        playbackMode: "interval",
        ambientOnly: true
      }
    ],
    random: [
      {
        soundId: "sound_effect_door_creak_005",
        resref: "sfx_door_creak_long",
        category: "effect",
        playbackMode: "random",
        ambientOnly: false
      }
    ],
    positional: []
  };
}
