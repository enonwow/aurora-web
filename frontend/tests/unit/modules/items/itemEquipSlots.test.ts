import { describe, expect, it } from "vitest";
import {
  AURORA_ITEM_EQUIPMENT_SLOT_OPTIONS,
  formatItemEquipmentSlotMask,
  formatItemEquipSlotMask,
  parseItemEquipSlotMask
} from "../../../../src/modules/items/application/itemEquipSlots";

describe("itemEquipSlots", () => {
  it("decodes Aurora equip slot hex masks into named slots", () => {
    const parsed = parseItemEquipSlotMask("0x1C030");

    expect(parsed?.value).toBe(0x1c030);
    expect(parsed?.slots.map((slot) => slot.key)).toEqual([
      "rightHand",
      "leftHand",
      "creatureRight",
      "creatureLeft",
      "creatureBite"
    ]);
    expect(formatItemEquipSlotMask("0x1C030")).toBe(
      "0x1C030: Right Hand, Left Hand, Creature Right Weapon, Creature Left Weapon, Creature Bite"
    );
  });

  it("ignores blank, placeholder, and zero masks", () => {
    expect(parseItemEquipSlotMask(undefined)).toBeNull();
    expect(parseItemEquipSlotMask("****")).toBeNull();
    expect(parseItemEquipSlotMask("0x0")).toBeNull();
  });

  it("preserves unknown bits for audit visibility", () => {
    expect(formatItemEquipSlotMask("0x40010")).toBe(
      "0x40010: Right Hand, Unknown 0x40000"
    );
  });

  it("exposes Equip_ItemList slot-mask options in Aurora order", () => {
    expect(AURORA_ITEM_EQUIPMENT_SLOT_OPTIONS[4]).toMatchObject({
      index: 4,
      value: 0x10,
      key: "rightHand",
      selectLabel: "Right Hand (0x10)"
    });
    expect(AURORA_ITEM_EQUIPMENT_SLOT_OPTIONS[17]).toMatchObject({
      index: 17,
      value: 0x20000,
      key: "creatureSkin",
      selectLabel: "Creature Skin (0x20000)"
    });
    expect(formatItemEquipmentSlotMask(0x20)).toBe("0x20: Left Hand");
  });
});
