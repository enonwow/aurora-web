import { Injectable } from "@nestjs/common";
import type {
  TemplateCatalogRepositoryPort
} from "../../../application/ports/template-catalog-repository.port";
import type {
  TemplateKind,
  TemplateListQuery,
  TemplateListResult,
  TemplateRecord
} from "../../../domain/template.types";

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

@Injectable()
export class StaticTemplateCatalogRepository implements TemplateCatalogRepositoryPort {
  async listByKind(kind: TemplateKind, query: TemplateListQuery): Promise<TemplateListResult> {
    const filtered = TEMPLATES.filter((item) => item.kind === kind)
      .filter((item) => {
        if (!query.query) {
          return true;
        }
        const value = query.query.toLowerCase();
        return (
          item.name.toLowerCase().includes(value) ||
          item.resref.toLowerCase().includes(value) ||
          item.tags.some((tag) => tag.toLowerCase().includes(value))
        );
      })
      .filter((item) => {
        if (!query.category) {
          return true;
        }
        return item.category.toLowerCase() === query.category.toLowerCase();
      })
      .filter((item) => {
        if (!query.tag) {
          return true;
        }
        return item.tags.some((tag) => tag.toLowerCase() === query.tag!.toLowerCase());
      })
      .filter((item) => {
        if (kind !== "placeable" || !query.subtype) {
          return true;
        }
        return item.placeableSubtype === query.subtype;
      })
      .filter((item) => {
        if (kind !== "placeable" || typeof query.benchmark !== "boolean") {
          return true;
        }
        return Boolean(item.benchmarkCandidate) === query.benchmark;
      });

    const items = filtered.slice(query.offset, query.offset + query.limit);
    return {
      items,
      total: filtered.length,
      limit: query.limit,
      offset: query.offset
    };
  }

  async findByKindAndId(kind: TemplateKind, templateId: string): Promise<TemplateRecord | null> {
    return (
      TEMPLATES.find((item) => item.kind === kind && item.templateId === templateId) ??
      null
    );
  }

  async findByKindAndResref(kind: TemplateKind, resref: string): Promise<TemplateRecord | null> {
    const normalized = resref.trim().toLowerCase();
    return (
      TEMPLATES.find(
        (item) => item.kind === kind && item.resref.trim().toLowerCase() === normalized
      ) ?? null
    );
  }
}
