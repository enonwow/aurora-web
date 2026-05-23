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
}
