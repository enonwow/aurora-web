import { describe, expect, it } from "vitest";
import {
  ITEM_BLUEPRINT_EQUIPMENT_SLOT_MASKS,
  readItemBlueprintReferenceLists,
} from "../../../../src/modules/scene/domain/itemBlueprintInventory";

describe("itemBlueprintInventory", () => {
  it("admits exact ordered reference-form ItemList and Equip_ItemList entries", () => {
    expect(readItemBlueprintReferenceLists(
      [
        { resRef: "itm_potion", x: 3, y: 4 },
        { resRef: "itm_scroll", x: 5, y: 6 },
      ],
      [
        { resRef: "itm_helmet", slotMask: 1 },
        { resRef: "itm_ring", slotMask: 4 },
      ],
      "nested_bag",
    )).toEqual({
      inventory: [
        { resRef: "itm_potion", x: 3, y: 4 },
        { resRef: "itm_scroll", x: 5, y: 6 },
      ],
      equipment: [
        { resRef: "itm_helmet", slotMask: 1 },
        { resRef: "itm_ring", slotMask: 4 },
      ],
    });
    expect(ITEM_BLUEPRINT_EQUIPMENT_SLOT_MASKS).toEqual([
      1, 2, 4, 8, 16, 32, 64, 128, 256,
      512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072,
    ]);
  });

  it("fails closed for normalization, alias, ordering, slot, self, and budget violations", () => {
    expect(readItemBlueprintReferenceLists(
      [{ resRef: "ITM_UPPER", x: 0, y: 0 }],
      [],
      "nested_bag",
    )).toBeNull();
    expect(readItemBlueprintReferenceLists(
      [{ resRef: "itm_potion", x: 0, y: 0, sourceIndex: 0 }],
      [],
      "nested_bag",
    )).toBeNull();
    expect(readItemBlueprintReferenceLists(
      [],
      [
        { resRef: "itm_ring", slotMask: 4 },
        { resRef: "itm_helmet", slotMask: 1 },
      ],
      "nested_bag",
    )).toBeNull();
    expect(readItemBlueprintReferenceLists(
      [],
      [{ resRef: "itm_ring", slotMask: 3 }],
      "nested_bag",
    )).toBeNull();
    expect(readItemBlueprintReferenceLists(
      [{ resRef: "nested_bag", x: 0, y: 0 }],
      [],
      "nested_bag",
    )).toBeNull();
    expect(readItemBlueprintReferenceLists(
      Array.from({ length: 1024 }, () => ({ resRef: "itm_potion", x: 0, y: 0 })),
      [{ resRef: "itm_ring", slotMask: 1 }],
      "nested_bag",
    )).toBeNull();
  });
});
