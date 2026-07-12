import { describe, expect, it } from "vitest";
import { pruneCustomItemTemplatesBackedByCatalog } from "../../../../src/modules/layout/components/WorkspaceLayout";
import type { SceneObject } from "../../../../src/modules/layout/contracts";
import type { ItemApiListItem } from "../../../../src/modules/items/contracts";

function buildCustomItem(resRef: string): SceneObject {
  return {
    id: `itm_wizard_${resRef}_001`,
    kind: "items",
    name: resRef,
    resRef,
    tag: resRef.toUpperCase(),
    source: {
      type: "aurora_git",
      sourceKind: "item",
      sourceObjectId: `item_${resRef}`,
      templateId: `item_${resRef}`
    },
    x: 0,
    y: 0,
    z: 0,
    bearing: 0,
    visualTransform: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      roll: 0,
      yaw: 0
    }
  };
}

function buildCatalogItem(
  resref: string,
  metadata: ItemApiListItem["metadata"] = {}
): ItemApiListItem {
  return {
    templateId: `item_${resref}`,
    resref,
    name: resref,
    category: "items",
    tags: [],
    previewImageUrl: "",
    metadata
  };
}

describe("WorkspaceLayout custom item pruning", () => {
  it("removes stale local custom items when the backend catalog already has the same ResRef", () => {
    const staleCustom = buildCustomItem("custom_hide_armo");
    const stillLocal = buildCustomItem("custom_new_sword");

    expect(
      pruneCustomItemTemplatesBackedByCatalog([staleCustom, stillLocal], [
        buildCatalogItem("custom_hide_armo")
      ])
    ).toEqual([stillLocal]);
  });

  it("uses metadata TemplateResRef when a backend item template id differs from its UTI ResRef", () => {
    const staleCustom = buildCustomItem("custom_meta_resref");

    expect(
      pruneCustomItemTemplatesBackedByCatalog([staleCustom], [
        buildCatalogItem("item_generated_123", { templateResRef: "CUSTOM_META_RESREF" })
      ])
    ).toEqual([]);
  });
});
