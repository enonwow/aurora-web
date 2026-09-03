import {
  bindEffectiveCreatureStartingPackagesTwoDaToCreatureStartingPackage,
  readAreaCreatureStartingPackageStorage,
  readExistingAreaCreatureStartingPackageMutation,
} from "../../src/modules/areas/domain/area-creature-starting-package";
import { parseEffectiveCreatureStartingPackagesTwoDa } from
  "../../src/modules/catalog/domain/effective-creature-starting-packages-two-da";

describe("Area Creature StartingPackage", () => {
  const table = parseEffectiveCreatureStartingPackagesTwoDa({
    bytes: Buffer.from([
      "2DA V2.0",
      "",
      "Label Name ClassID",
      "0 FighterZero 100 4",
      "1 ClericOne 101 2",
      "2 FighterTwo 102 4",
      "",
    ].join("\n"), "ascii"),
    sourceObjectKey: "runtime-source/module/packages.2da",
    sourceLayer: "module",
    resolveStrRef: (strRef) => `Package ${strRef}`,
  })!;

  it("accepts presence-sensitive exact Byte storage and preserves missing class provenance", () => {
    expect(readAreaCreatureStartingPackageStorage({ present: false })).toEqual({ present: false });
    expect(readAreaCreatureStartingPackageStorage({
      present: true,
      nativeType: "byte",
      value: 0,
    })).toEqual({ present: true, nativeType: "byte", value: 0 });
    expect(readAreaCreatureStartingPackageStorage({
      present: true,
      nativeType: "byte",
      value: 0,
      classIds: [4, 2],
    })).toEqual({ present: true, nativeType: "byte", value: 0, classIds: [4, 2] });
  });

  it("binds only a retained physical row compatible with an exact source class", () => {
    expect(bindEffectiveCreatureStartingPackagesTwoDaToCreatureStartingPackage({
      present: true,
      nativeType: "byte",
      value: 2,
      classIds: [4],
    }, table)).toEqual({
      present: true,
      nativeType: "byte",
      value: 2,
      classIds: [4],
      table: {
        ...table.descriptor,
        rowIndex: 2,
        classId: 4,
      },
    });
    expect(bindEffectiveCreatureStartingPackagesTwoDaToCreatureStartingPackage({
      present: true,
      nativeType: "byte",
      value: 1,
      classIds: [4],
    }, table)).toEqual({ present: true, nativeType: "byte", value: 1, classIds: [4] });
    expect(bindEffectiveCreatureStartingPackagesTwoDaToCreatureStartingPackage({
      present: true,
      nativeType: "byte",
      value: 0,
    }, table)).toEqual({ present: true, nativeType: "byte", value: 0 });
  });

  it.each([
    { present: true, nativeType: "word", value: 2, classIds: [4] },
    { present: true, nativeType: "byte", value: -1, classIds: [4] },
    { present: true, nativeType: "byte", value: 256, classIds: [4] },
    { present: true, nativeType: "byte", value: 2, classIds: [] },
    { present: true, nativeType: "byte", value: 2, classIds: [4, 4] },
    { present: true, nativeType: "byte", value: 2, classIds: [4, -1] },
    { present: true, nativeType: "byte", value: 2, classIds: [4], extra: true },
  ])("rejects malformed storage %#", (value) => {
    expect(readAreaCreatureStartingPackageStorage(value)).toBeNull();
  });

  it("accepts one exact changed digest- and ClassList-bound mutation", () => {
    expect(readExistingAreaCreatureStartingPackageMutation({
      expectedValue: 0,
      value: 2,
      expectedClassIds: [4],
      tableSha256: table.descriptor.sha256,
      rowCount: table.descriptor.rowCount,
    })).toEqual({
      expectedValue: 0,
      value: 2,
      expectedClassIds: [4],
      tableSha256: table.descriptor.sha256,
      rowCount: table.descriptor.rowCount,
    });
  });

  it.each([
    { expectedValue: 2, value: 2, expectedClassIds: [4], tableSha256: "a".repeat(64), rowCount: 3 },
    { expectedValue: 0, value: 2, expectedClassIds: [], tableSha256: "a".repeat(64), rowCount: 3 },
    { expectedValue: 0, value: 2, expectedClassIds: [4, -1], tableSha256: "a".repeat(64), rowCount: 3 },
    { expectedValue: 0, value: 256, expectedClassIds: [4], tableSha256: "a".repeat(64), rowCount: 257 },
    { expectedValue: 0, value: 2, expectedClassIds: [4], tableSha256: "invalid", rowCount: 3 },
    { expectedValue: 0, value: 3, expectedClassIds: [4], tableSha256: "a".repeat(64), rowCount: 3 },
  ])("rejects invalid mutation %#", (value) => {
    expect(readExistingAreaCreatureStartingPackageMutation(value)).toBeNull();
  });
});
