import { Injectable } from "@nestjs/common";
import type {
  TemplateCatalogRepositoryPort
} from "../../../application/ports/template-catalog-repository.port";
import type {
  PlaceableSubtype,
  TemplateKind,
  TemplateListQuery,
  TemplateListResult,
  TemplateRecord
} from "../../../domain/template.types";
import {
  buildPlaceableProcessCacheKey,
  buildTemplateProcessCacheKey
} from "../../../domain/cache-key.builders";

interface IndexedTemplate {
  record: TemplateRecord;
  searchable: string;
  categoryLower: string;
  tagsLower: Set<string>;
}

const TEMPLATES: TemplateRecord[] = [
  {
    templateId: "plc_market_stall_001",
    kind: "placeable",
    placeableSubtype: "generic",
    resref: "plc_mkt_stall",
    name: "Market Stall",
    category: "urban",
    tags: ["market", "wood", "structure"],
    previewImageUrl: "/assets/previews/placeables/market-stall.webp",
    metadata: {
      modelResref: "plc_mkt_stall",
      texturePrefix: "plc_mkt_stall",
      footprint: "3x2",
      collision: true
    }
  },
  {
    templateId: "plc_crate_stack_001",
    kind: "placeable",
    placeableSubtype: "container",
    resref: "plc_crate_stack",
    name: "Crate Stack",
    category: "props",
    tags: ["storage", "wood", "small-prop"],
    previewImageUrl: "/assets/previews/placeables/crate-stack.webp",
    metadata: {
      modelResref: "plc_crate_stack",
      texturePrefix: "plc_crate_stack",
      footprint: "1x1",
      collision: true
    }
  },
  {
    templateId: "plc_city_gate_001",
    kind: "placeable",
    placeableSubtype: "door",
    resref: "plc_city_gate",
    name: "City Gate Door",
    category: "urban",
    tags: ["door", "gate", "interactive"],
    previewImageUrl: "/assets/previews/placeables/city-gate-door.webp",
    metadata: {
      modelResref: "plc_city_gate",
      texturePrefix: "plc_city_gate",
      footprint: "2x1",
      collision: true,
      openState: "closed"
    }
  },
  {
    templateId: "plc_torch_smoke_vfx_001",
    kind: "placeable",
    placeableSubtype: "vfx",
    resref: "plc_torch_smoke_vfx",
    name: "Torch Smoke VFX Anchor",
    category: "effects",
    tags: ["vfx", "smoke", "anchor"],
    previewImageUrl: "/assets/previews/placeables/torch-smoke-vfx.webp",
    metadata: {
      modelResref: "plc_torch_smoke_vfx",
      texturePrefix: "plc_torch_smoke_vfx",
      footprint: "1x1",
      collision: false,
      vfxPreset: "torch_smoke_soft"
    }
  },
  {
    templateId: "plc_bench_c_wingsmeph_001",
    kind: "placeable",
    placeableSubtype: "generic",
    benchmarkCandidate: true,
    benchmarkBucket: "placeable_heavy_no_vfx",
    resref: "c_wingsmeph",
    name: "Wings Mephit (Benchmark)",
    category: "benchmark",
    tags: ["benchmark", "heavy", "no-vfx"],
    previewImageUrl: "/assets/previews/placeables/c-wingsmeph.webp",
    metadata: {
      modelResref: "c_wingsmeph",
      texturePrefix: "c_wingsmeph",
      triangles: 659,
      meshes: 16,
      emitters: 0,
      source: "scene.json"
    }
  },
  {
    templateId: "plc_bench_ad_top_lion_1_001",
    kind: "placeable",
    placeableSubtype: "vfx",
    benchmarkCandidate: true,
    benchmarkBucket: "placeable_heavy_vfx",
    resref: "ad_top_lion_1",
    name: "Top Lion VFX Anchor (Benchmark)",
    category: "benchmark",
    tags: ["benchmark", "heavy", "vfx"],
    previewImageUrl: "/assets/previews/placeables/ad-top-lion-1.webp",
    metadata: {
      modelResref: "ad_top_lion_1",
      texturePrefix: "ad_top_lion_1",
      triangles: 798,
      meshes: 28,
      emitters: 1,
      source: "scene.json"
    }
  },
  {
    templateId: "plc_bench_plc_x02_001",
    kind: "placeable",
    placeableSubtype: "vfx",
    benchmarkCandidate: true,
    benchmarkBucket: "placeable_vfx_plc_alt",
    resref: "plc_x02",
    name: "PLC X02 VFX Alternative (Benchmark)",
    category: "benchmark",
    tags: ["benchmark", "vfx", "plc"],
    previewImageUrl: "/assets/previews/placeables/plc-x02.webp",
    metadata: {
      modelResref: "plc_x02",
      texturePrefix: "plc_x02",
      triangles: 112,
      meshes: 5,
      emitters: 3,
      source: "scene.json"
    }
  },
  {
    templateId: "plc_bench_tn_sdoor_14_001",
    kind: "placeable",
    placeableSubtype: "door",
    benchmarkCandidate: true,
    benchmarkBucket: "door_heavy_instance",
    resref: "tn_sdoor_14",
    name: "Swamp Door 14 (Benchmark)",
    category: "benchmark",
    tags: ["benchmark", "door", "heavy-instance"],
    previewImageUrl: "/assets/previews/placeables/tn-sdoor-14.webp",
    metadata: {
      modelResref: "tn_sdoor_14",
      texturePrefix: "tn_sdoor_14",
      triangles: 250,
      meshes: 10,
      emitters: 0,
      areaResref: "wnd_slms_swamp__with_placeables",
      doorIndex: 12
    }
  },
  {
    templateId: "plc_bench_tn_gdoor_05_001",
    kind: "placeable",
    placeableSubtype: "door",
    benchmarkCandidate: true,
    benchmarkBucket: "door_heavy_single_mesh",
    resref: "tn_gdoor_05",
    name: "Gate Door 05 (Benchmark)",
    category: "benchmark",
    tags: ["benchmark", "door", "single-mesh"],
    previewImageUrl: "/assets/previews/placeables/tn-gdoor-05.webp",
    metadata: {
      modelResref: "tn_gdoor_05",
      texturePrefix: "tn_gdoor_05",
      triangles: 190,
      meshes: 6,
      emitters: 0,
      maxSingleMeshTriangles: 102,
      areaResref: "wnd_slms_swamp__with_placeables",
      doorIndex: 8
    }
  },
  {
    templateId: "cre_guard_human_001",
    kind: "creature",
    resref: "cre_guard_human",
    name: "City Guard",
    category: "humanoid",
    tags: ["guard", "human", "melee"],
    previewImageUrl: "/assets/previews/creatures/city-guard.webp",
    metadata: {
      challengeRating: 2,
      faction: "city_watch"
    }
  },
  {
    templateId: "cre_wolf_001",
    kind: "creature",
    resref: "cre_wolf",
    name: "Forest Wolf",
    category: "beast",
    tags: ["animal", "forest", "pack"],
    previewImageUrl: "/assets/previews/creatures/forest-wolf.webp",
    metadata: {
      challengeRating: 1,
      faction: "wildlife"
    }
  },
  {
    templateId: "itm_health_potion_001",
    kind: "item",
    resref: "itm_potion_health",
    name: "Potion of Healing",
    category: "consumable",
    tags: ["potion", "healing", "utility"],
    previewImageUrl: "/assets/previews/items/health-potion.webp",
    metadata: {
      rarity: "common",
      stackable: true
    }
  },
  {
    templateId: "itm_scroll_fireball_001",
    kind: "item",
    resref: "itm_scroll_fireball",
    name: "Fireball Scroll",
    category: "scroll",
    tags: ["magic", "offense", "scroll"],
    previewImageUrl: "/assets/previews/items/fireball-scroll.webp",
    metadata: {
      rarity: "uncommon",
      stackable: true
    }
  }
];

const EMPTY_INDEXED_TEMPLATES: IndexedTemplate[] = [];
const TEMPLATES_BY_KIND = new Map<TemplateKind, IndexedTemplate[]>();
const TEMPLATES_BY_KIND_AND_ID = new Map<string, TemplateRecord>();
const TEMPLATES_BY_KIND_AND_RESREF = new Map<string, TemplateRecord>();
const PLACEABLE_CACHE_KEYS_BY_TEMPLATE_AND_SUBTYPE = new Map<string, string>();
const TEMPLATE_CACHE_KEYS_BY_KIND_AND_TEMPLATE = new Map<string, string>();
const PLACEABLE_SUBTYPES: PlaceableSubtype[] = [
  "generic",
  "door",
  "vfx",
  "container",
  "light_source",
  "trigger_proxy"
];

for (const template of TEMPLATES) {
  const indexed: IndexedTemplate = {
    record: template,
    searchable: buildTemplateSearchableText(template),
    categoryLower: template.category.toLowerCase(),
    tagsLower: new Set(template.tags.map((tag) => tag.toLowerCase()))
  };

  const byKind = TEMPLATES_BY_KIND.get(template.kind);
  if (byKind) {
    byKind.push(indexed);
  } else {
    TEMPLATES_BY_KIND.set(template.kind, [indexed]);
  }

  TEMPLATES_BY_KIND_AND_ID.set(buildTemplateIdIndexKey(template.kind, template.templateId), template);
  TEMPLATES_BY_KIND_AND_RESREF.set(
    buildTemplateResrefIndexKey(template.kind, template.resref),
    template
  );

  if (template.kind === "placeable") {
    for (const subtype of PLACEABLE_SUBTYPES) {
      const cacheKey = buildPlaceableProcessCacheKey(template.templateId, template.resref, subtype);
      PLACEABLE_CACHE_KEYS_BY_TEMPLATE_AND_SUBTYPE.set(
        buildPlaceableCacheIndexKey(template.templateId, subtype),
        cacheKey
      );
    }
    continue;
  }

  const cacheKey = buildTemplateProcessCacheKey(
    template.kind,
    template.templateId,
    template.resref
  );
  TEMPLATE_CACHE_KEYS_BY_KIND_AND_TEMPLATE.set(
    buildTemplateCacheIndexKey(template.kind, template.templateId),
    cacheKey
  );
}

@Injectable()
export class StaticTemplateCatalogRepository implements TemplateCatalogRepositoryPort {
  async listByKind(kind: TemplateKind, query: TemplateListQuery): Promise<TemplateListResult> {
    const indexedTemplates = TEMPLATES_BY_KIND.get(kind) ?? EMPTY_INDEXED_TEMPLATES;
    const normalizedQuery = query.query?.toLowerCase().trim();
    const normalizedCategory = query.category?.toLowerCase().trim();
    const normalizedTag = query.tag?.toLowerCase().trim();

    const filtered = indexedTemplates
      .filter((item) => {
        if (!query.query) {
          return true;
        }
        return item.searchable.includes(normalizedQuery ?? "");
      })
      .filter((item) => {
        if (!query.category) {
          return true;
        }
        return item.categoryLower === normalizedCategory;
      })
      .filter((item) => {
        if (!query.tag) {
          return true;
        }
        return item.tagsLower.has(normalizedTag ?? "");
      })
      .filter((item) => {
        if (kind !== "placeable" || !query.subtype) {
          return true;
        }
        return item.record.placeableSubtype === query.subtype;
      })
      .filter((item) => {
        if (kind !== "placeable" || typeof query.benchmark !== "boolean") {
          return true;
        }
        return Boolean(item.record.benchmarkCandidate) === query.benchmark;
      });

    const items = filtered
      .slice(query.offset, query.offset + query.limit)
      .map((item) => item.record);
    return {
      items,
      total: filtered.length,
      limit: query.limit,
      offset: query.offset
    };
  }

  async findByKindAndId(kind: TemplateKind, templateId: string): Promise<TemplateRecord | null> {
    return TEMPLATES_BY_KIND_AND_ID.get(buildTemplateIdIndexKey(kind, templateId)) ?? null;
  }

  async findByKindAndResref(kind: TemplateKind, resref: string): Promise<TemplateRecord | null> {
    return TEMPLATES_BY_KIND_AND_RESREF.get(buildTemplateResrefIndexKey(kind, resref)) ?? null;
  }

  getPrecomputedPlaceableCacheKey(templateId: string, subtype: PlaceableSubtype): string | null {
    return (
      PLACEABLE_CACHE_KEYS_BY_TEMPLATE_AND_SUBTYPE.get(
        buildPlaceableCacheIndexKey(templateId, subtype)
      ) ?? null
    );
  }

  getPrecomputedTemplateCacheKey(kind: "creature" | "item", templateId: string): string | null {
    return (
      TEMPLATE_CACHE_KEYS_BY_KIND_AND_TEMPLATE.get(
        buildTemplateCacheIndexKey(kind, templateId)
      ) ?? null
    );
  }
}

function buildTemplateSearchableText(template: TemplateRecord): string {
  return [template.name, template.templateId, template.resref, ...template.tags]
    .join("|")
    .toLowerCase();
}

function buildTemplateIdIndexKey(kind: TemplateKind, templateId: string): string {
  return `${kind}:${templateId}`;
}

function buildTemplateResrefIndexKey(kind: TemplateKind, resref: string): string {
  return `${kind}:${resref.trim().toLowerCase()}`;
}

function buildPlaceableCacheIndexKey(templateId: string, subtype: PlaceableSubtype): string {
  return `${templateId}:${subtype}`;
}

function buildTemplateCacheIndexKey(kind: "creature" | "item", templateId: string): string {
  return `${kind}:${templateId}`;
}
