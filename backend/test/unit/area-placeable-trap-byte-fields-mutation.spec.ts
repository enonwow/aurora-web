import {
  AREA_PLACEABLE_TRAP_BYTE_FIELD_MAPPINGS,
  findAreaPlaceableTrapByteFieldMapping,
  isAreaPlaceableTrapByteMutationValue,
} from "../../src/modules/areas/domain/area-placeable-trap-byte-fields";

describe("Placeable trap Byte mutation survivor killers", () => {
  it("freezes the exact six-field native order and mapping", () => {
    expect(AREA_PLACEABLE_TRAP_BYTE_FIELD_MAPPINGS).toEqual([
      { field: "TrapFlag", slot: "isTrapped", metadataKey: "trapFlag", valueKind: "flag" },
      { field: "TrapDetectable", slot: "detectable", metadataKey: "trapDetectable", valueKind: "flag" },
      { field: "TrapDisarmable", slot: "disarmable", metadataKey: "trapDisarmable", valueKind: "flag" },
      { field: "TrapOneShot", slot: "oneShot", metadataKey: "trapOneShot", valueKind: "flag" },
      { field: "TrapDetectDC", slot: "detectionDc", metadataKey: "detectDc", valueKind: "byte" },
      { field: "DisarmDC", slot: "disarmDc", metadataKey: "disarmDc", valueKind: "byte" },
    ]);
    expect(Object.isFrozen(AREA_PLACEABLE_TRAP_BYTE_FIELD_MAPPINGS)).toBe(true);
    for (const mapping of AREA_PLACEABLE_TRAP_BYTE_FIELD_MAPPINGS) {
      expect(Object.isFrozen(mapping)).toBe(true);
      expect(findAreaPlaceableTrapByteFieldMapping(mapping.field)).toBe(mapping);
    }
    expect(findAreaPlaceableTrapByteFieldMapping("TrapType")).toBeUndefined();
  });

  it.each(["TrapFlag", "TrapDetectable", "TrapDisarmable", "TrapOneShot"] as const)(
    "accepts only 0 and 1 for %s",
    (field) => {
      const mapping = findAreaPlaceableTrapByteFieldMapping(field)!;
      expect(isAreaPlaceableTrapByteMutationValue(mapping, 0)).toBe(true);
      expect(isAreaPlaceableTrapByteMutationValue(mapping, 1)).toBe(true);
      for (const value of [-1, 2, 0.5, "1", null]) {
        expect(isAreaPlaceableTrapByteMutationValue(mapping, value)).toBe(false);
      }
    },
  );

  it.each(["TrapDetectDC", "DisarmDC"] as const)(
    "accepts the complete Byte boundary for %s",
    (field) => {
      const mapping = findAreaPlaceableTrapByteFieldMapping(field)!;
      expect(isAreaPlaceableTrapByteMutationValue(mapping, 0)).toBe(true);
      expect(isAreaPlaceableTrapByteMutationValue(mapping, 255)).toBe(true);
      for (const value of [-1, 256, 0.5, "1", null]) {
        expect(isAreaPlaceableTrapByteMutationValue(mapping, value)).toBe(false);
      }
    },
  );
});
