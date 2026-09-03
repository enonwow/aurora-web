import { describe, expect, it } from "vitest";
import { cloneSceneObject } from "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("cloneSceneObject retained ground-Item ItemList", () => {
  it("clones immutable provenance and editable target independently", () => {
    const entry = { sourceIndex: 0, resRef: "nw_it_gold001", x: 1, y: 2 };
    const source = createNewSceneObject("items", 1, 2, 1);
    source.source = {
      type: "aurora_git",
      sourceKind: "item",
      sourceIndex: 0,
      sourceObjectId: "itm:0:inventory",
      itemInventoryItems: [entry],
    };
    source.itemProperties = {
      inventoryItems: [{ ...entry, x: 3, y: 4 }],
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.itemInventoryItems).toEqual(source.source.itemInventoryItems);
    expect(cloned.source?.itemInventoryItems).not.toBe(source.source.itemInventoryItems);
    expect(cloned.source?.itemInventoryItems?.[0]).not.toBe(source.source.itemInventoryItems[0]);
    expect(cloned.itemProperties?.inventoryItems).toEqual(source.itemProperties.inventoryItems);
    expect(cloned.itemProperties?.inventoryItems).not.toBe(source.itemProperties.inventoryItems);
    expect(cloned.itemProperties?.inventoryItems?.[0])
      .not.toBe(source.itemProperties.inventoryItems?.[0]);
  });

  it("detaches wizard reference-form ItemList and Equip_ItemList targets", () => {
    const source = createNewSceneObject("items", 1, 2, 2);
    source.id = "itm_wizard_nested_item_2";
    source.itemProperties = {
      blueprintInventoryItems: [{ resRef: "itm_potion", x: 3, y: 4 }],
      blueprintEquippedItems: [{ resRef: "itm_ring", slotMask: 4 }],
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.itemProperties?.blueprintInventoryItems)
      .toEqual(source.itemProperties.blueprintInventoryItems);
    expect(cloned.itemProperties?.blueprintEquippedItems)
      .toEqual(source.itemProperties.blueprintEquippedItems);
    expect(cloned.itemProperties?.blueprintInventoryItems)
      .not.toBe(source.itemProperties.blueprintInventoryItems);
    expect(cloned.itemProperties?.blueprintEquippedItems)
      .not.toBe(source.itemProperties.blueprintEquippedItems);
  });

  it("detaches a dynamic UTI target from immutable absent ItemList provenance", () => {
    const source = createNewSceneObject("items", 1, 2, 3);
    source.source = {
      type: "aurora_git",
      sourceKind: "item",
      sourceIndex: 0,
      sourceObjectId: "itm:0:dynamic_inventory",
      itemInventoryItems: [],
    };
    source.itemProperties = {
      inventoryItems: [{
        resRef: "nw_cloth022",
        itemTemplateId: "itm_nw_cloth022",
        itemResRef: "nw_cloth022",
        itemSourceProfileId: "effective-catalog-uti-item-copy-v1",
        itemSourceObjectKey: "modules/current/items/nw_cloth022.uti",
        itemSourceSizeBytes: 4096,
        itemSourceFingerprint: "a".repeat(64),
        itemTag: "NW_CLOTH022",
        x: 0,
        y: 0,
      }],
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.itemInventoryItems).toEqual([]);
    expect(cloned.itemProperties?.inventoryItems).toEqual(source.itemProperties.inventoryItems);
    expect(cloned.itemProperties?.inventoryItems).not.toBe(source.itemProperties.inventoryItems);
    expect(cloned.itemProperties?.inventoryItems?.[0])
      .not.toBe(source.itemProperties.inventoryItems?.[0]);
  });
});
