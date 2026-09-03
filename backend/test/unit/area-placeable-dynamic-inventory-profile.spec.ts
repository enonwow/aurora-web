import {
  AREA_PLACEABLE_DYNAMIC_INVENTORY_PROFILES,
  resolveAreaPlaceableDynamicInventoryProfile,
} from "../../src/modules/areas/domain/area-placeable-dynamic-inventory-profile";

describe("dynamic Area Placeable inventory dependency profiles", () => {
  it.each(AREA_PLACEABLE_DYNAMIC_INVENTORY_PROFILES)(
    "admits the exact ordered $templateResRef retail ItemList manifest",
    (profile) => {
      const resolved = resolveAreaPlaceableDynamicInventoryProfile(
        profile.templateResRef,
        profile.entries,
      );

      expect(resolved).toBe(profile);
      expect(Object.isFrozen(resolved)).toBe(true);
      expect(resolved?.entries.every((entry, index) => entry.sourceIndex === index)).toBe(true);
    },
  );

  it.each([
    ["unknown template", "plc_unknown", [{ sourceIndex: 0, inventoryRes: "nw_it_msmlmisc12", x: 0, y: 0 }]],
    ["missing entry", "x0_treepine2", [{ sourceIndex: 0, inventoryRes: "nw_it_msmlmisc12", x: 0, y: 0 }]],
    ["reordered identity", "x0_treepine2", [
      { sourceIndex: 0, inventoryRes: "nw_it_msmlmisc11", x: 0, y: 0 },
      { sourceIndex: 1, inventoryRes: "nw_it_msmlmisc12", x: 1, y: 0 },
    ]],
    ["wrong ordinal", "plc_fenbush", [{ sourceIndex: 1, inventoryRes: "nw_it_msmlmisc12", x: 0, y: 0 }]],
    ["wrong coordinates", "plc_pilestones", [{ sourceIndex: 0, inventoryRes: "nw_it_msmlmisc11", x: 1, y: 0 }]],
  ] as const)("rejects %s", (_label, templateResRef, entries) => {
    expect(resolveAreaPlaceableDynamicInventoryProfile(templateResRef, entries)).toBeUndefined();
  });
});
