import { describe, expect, it } from "vitest";

import { readPlaceableBasicIdentity } from "../../../../../src/modules/scene/domain/placeableBasicIdentity";

describe("Placeable basic identity storage provenance", () => {
  const table = {
    resourceName: "placeables.2da",
    sourceObjectKey: "source",
    sourceLayer: "hak",
    sha256: "a".repeat(64),
    sizeBytes: 1,
    rowCount: 2,
    rowIndex: 1
  };

  it("admits exact present, absent, canonical DWord, and legacy Byte states", () => {
    expect(readPlaceableBasicIdentity({
      tag: { present: true, value: "" },
      appearance: { present: true, nativeType: "dword", value: 0xffff_ffff }
    })).toEqual({
      tag: { present: true, value: "" },
      appearance: { present: true, nativeType: "dword", value: 0xffff_ffff }
    });
    expect(readPlaceableBasicIdentity({
      tag: { present: false },
      appearance: { present: false }
    })).toEqual({
      tag: { present: false },
      appearance: { present: false }
    });
    expect(readPlaceableBasicIdentity({
      tag: { present: true, value: "legacy" },
      appearance: { present: true, nativeType: "byte", value: 255 }
    })).toEqual({
      tag: { present: true, value: "legacy" },
      appearance: { present: true, nativeType: "byte", value: 255 }
    });
    expect(readPlaceableBasicIdentity({
      tag: { present: true, value: "zero" },
      appearance: { present: true, nativeType: "dword", value: 0 }
    })?.appearance).toEqual({ present: true, nativeType: "dword", value: 0 });
    expect(readPlaceableBasicIdentity({
      tag: { present: true, value: "zero" },
      appearance: { present: true, nativeType: "byte", value: 0 }
    })?.appearance).toEqual({ present: true, nativeType: "byte", value: 0 });
  });

  it("admits an exact effective placeables.2da descriptor only for its canonical DWord row", () => {
    const value = {
      tag: { present: true, value: "WaterTrough" },
      appearance: {
        present: true,
        nativeType: "dword",
        value: 104,
        table: {
          resourceName: "placeables.2da",
          sourceObjectKey: "modules/current/__aurora/sources/hak/lc_2da/placeables.2da",
          sourceLayer: "hak",
          sha256: "a".repeat(64),
          sizeBytes: 8192,
          rowCount: 16500,
          rowIndex: 104
        }
      }
    };

    expect(readPlaceableBasicIdentity(value)).toEqual(value);
  });

  it.each([
    {
      value: 0,
      table: {
        ...table,
        sourceObjectKey: "x",
        sourceLayer: "module",
        sizeBytes: 1,
        rowCount: 1,
        rowIndex: 0
      }
    },
    {
      value: 999_999,
      table: {
        ...table,
        sourceObjectKey: "x".repeat(2048),
        sourceLayer: "vanilla",
        sizeBytes: 64 * 1024 * 1024,
        rowCount: 1_000_000,
        rowIndex: 999_999
      }
    }
  ])("admits exact descriptor boundaries %#", ({ value, table: exactTable }) => {
    expect(readPlaceableBasicIdentity({
      tag: { present: false },
      appearance: { present: true, nativeType: "dword", value, table: exactTable }
    })?.appearance).toEqual({
      present: true,
      nativeType: "dword",
      value,
      table: exactTable
    });
  });

  it.each([
    null,
    [],
    {},
    { tag: { present: false }, appearance: { present: false }, extra: true },
    { tag: null, appearance: { present: false } },
    { tag: { present: "false" }, appearance: { present: false } },
    { tag: { present: 0 }, appearance: { present: false } },
    { tag: { present: false, value: "" }, appearance: { present: false } },
    { tag: { present: true }, appearance: { present: false } },
    { tag: { present: true, value: 7 }, appearance: { present: false } },
    { tag: { present: false }, appearance: null },
    { tag: { present: false }, appearance: { present: "false" } },
    { tag: { present: false }, appearance: { present: 0 } },
    { tag: { present: false }, appearance: { present: false, value: 0 } },
    { tag: { present: false }, appearance: { present: true, nativeType: "dword" } },
    { tag: { present: false }, appearance: { present: true, nativeType: "dword", value: 7, extra: true } },
    { tag: { present: false }, appearance: { present: true, nativeType: "dword", value: "7" } },
    { tag: { present: false }, appearance: { present: true, nativeType: "word", value: 7 } },
    { tag: { present: false }, appearance: { present: true, nativeType: "dword", value: -1 } },
    { tag: { present: false }, appearance: { present: true, nativeType: "dword", value: 1.5 } },
    { tag: { present: false }, appearance: { present: true, nativeType: "dword", value: 0x1_0000_0000 } },
    { tag: { present: false }, appearance: { present: true, nativeType: "byte", value: -1 } },
    { tag: { present: false }, appearance: { present: true, nativeType: "byte", value: 1.5 } },
    { tag: { present: false }, appearance: { present: true, nativeType: "byte", value: 256 } },
    { tag: { present: false }, appearance: { present: true, nativeType: "byte", value: 1, table } },
    { tag: { present: false }, appearance: { present: true, nativeType: "dword", value: 1, table: null } },
    { tag: { present: false }, appearance: { present: true, nativeType: "dword", value: 1, table: { ...table, extra: true } } },
    { tag: { present: false }, appearance: { present: true, nativeType: "dword", value: 1, table: { ...table, resourceName: "appearance.2da" } } },
    { tag: { present: false }, appearance: { present: true, nativeType: "dword", value: 1, table: { ...table, sourceObjectKey: "" } } },
    { tag: { present: false }, appearance: { present: true, nativeType: "dword", value: 1, table: { ...table, sourceObjectKey: 7 } } },
    { tag: { present: false }, appearance: { present: true, nativeType: "dword", value: 1, table: { ...table, sourceObjectKey: "x".repeat(2049) } } },
    { tag: { present: false }, appearance: { present: true, nativeType: "dword", value: 1, table: { ...table, sourceLayer: "external_fixture" } } },
    { tag: { present: false }, appearance: { present: true, nativeType: "dword", value: 1, table: { ...table, sha256: "A".repeat(64) } } },
    { tag: { present: false }, appearance: { present: true, nativeType: "dword", value: 1, table: { ...table, sha256: 7 } } },
    { tag: { present: false }, appearance: { present: true, nativeType: "dword", value: 1, table: { ...table, sha256: { toString: () => "a".repeat(64) } } } },
    { tag: { present: false }, appearance: { present: true, nativeType: "dword", value: 1, table: { ...table, sha256: `x${"a".repeat(64)}` } } },
    { tag: { present: false }, appearance: { present: true, nativeType: "dword", value: 1, table: { ...table, sha256: `${"a".repeat(64)}x` } } },
    { tag: { present: false }, appearance: { present: true, nativeType: "dword", value: 1, table: { ...table, sizeBytes: 0 } } },
    { tag: { present: false }, appearance: { present: true, nativeType: "dword", value: 1, table: { ...table, sizeBytes: 64 * 1024 * 1024 + 1 } } },
    { tag: { present: false }, appearance: { present: true, nativeType: "dword", value: 1, table: { ...table, rowCount: 0 } } },
    { tag: { present: false }, appearance: { present: true, nativeType: "dword", value: 1, table: { ...table, rowCount: 1 } } },
    { tag: { present: false }, appearance: { present: true, nativeType: "dword", value: 1, table: { ...table, rowCount: 1_000_001 } } },
    { tag: { present: false }, appearance: { present: true, nativeType: "dword", value: 1, table: { ...table, rowIndex: 0 } } }
  ])("rejects malformed or non-exact provenance %#", (value) => {
    expect(readPlaceableBasicIdentity(value)).toBeUndefined();
  });
});
