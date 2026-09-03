import { createHash } from "node:crypto";

import {
  parseEffectiveCreaturePerceptionRangesTwoDa,
} from "../../src/modules/catalog/domain/effective-creature-perception-ranges-two-da";

describe("effective Creature ranges.2da catalog", () => {
  const sourceObjectKey = "modules/current/__aurora/sources/hak/lc_2da/ranges.2da";
  const bytes = Buffer.from([
    "2DA V2.0",
    "",
    "Label PrimaryRange SecondaryRange Name",
    "0 SpellRngPers 0 **** ****",
    "1 SpellRngTouch 2.25 **** 9999",
    "2 SpellRngShrt 8 **** 9999",
    "3 SpellRngMed 20 **** 9999",
    "4 SpellRngLng 40 **** 9999",
    "5 SpellRngInnate 0 **** 9999",
    "6 SpellRngHstr 30 **** 9999",
    "7 SpellRngGarg 50 **** 9999",
    "8 PercepRngShrt 10 10 6668",
    "9 PercepRngMed 20 20 6669",
    "10 PercepRngLng 35 20 6670",
    "11 PercepRngDefault **** **** 6671",
    "12 CustomIgnored 99 99 7777",
  ].join("\n"), "utf-8");

  it("describes one complete table and admits only native Toolset physical rows 8..11", () => {
    expect(parseEffectiveCreaturePerceptionRangesTwoDa({
      bytes,
      sourceObjectKey,
      sourceLayer: "hak",
      resolveStrRef: (strRef) => ({
        6668: "Short",
        6669: "Medium",
        6670: "Long",
        6671: "Default",
      })[strRef],
    })).toEqual({
      descriptor: {
        resourceName: "ranges.2da",
        sourceObjectKey,
        sourceLayer: "hak",
        sha256: createHash("sha256").update(bytes).digest("hex"),
        sizeBytes: bytes.length,
        rowCount: 13,
      },
      rows: [
        { rowIndex: 8, displayName: "Short", displaySource: "strref", nameStrRef: 6668 },
        { rowIndex: 9, displayName: "Medium", displaySource: "strref", nameStrRef: 6669 },
        { rowIndex: 10, displayName: "Long", displaySource: "strref", nameStrRef: 6670 },
        { rowIndex: 11, displayName: "Default", displaySource: "strref", nameStrRef: 6671 },
      ],
    });
  });

  it.each(["module", "hak", "vanilla"] as const)(
    "preserves exact %s source provenance",
    (sourceLayer) => {
      expect(parseEffectiveCreaturePerceptionRangesTwoDa({
        bytes,
        sourceObjectKey,
        sourceLayer,
        resolveStrRef: () => undefined,
      })?.descriptor.sourceLayer).toBe(sourceLayer);
    },
  );

  it("uses bounded StringRef fallback and omits native rows without a usable Name", () => {
    const malformedRows = Buffer.from([
      "2DA V2.0",
      "Name",
      ...Array.from({ length: 8 }, (_, index) => `${index} ****`),
      "8 6668",
      "9 ****",
      "10 0",
      "11 6671",
    ].join("\n"), "utf-8");
    expect(parseEffectiveCreaturePerceptionRangesTwoDa({
      bytes: malformedRows,
      sourceObjectKey,
      sourceLayer: "module",
      resolveStrRef: () => undefined,
    })?.rows).toEqual([
      { rowIndex: 8, displayName: "StringRef 6668", displaySource: "strref_id", nameStrRef: 6668 },
      { rowIndex: 11, displayName: "StringRef 6671", displaySource: "strref_id", nameStrRef: 6671 },
    ]);
  });

  it.each([
    { bytes: Buffer.alloc(0), sourceObjectKey, sourceLayer: "hak", resolveStrRef: () => "x" },
    { bytes, sourceObjectKey: "", sourceLayer: "hak", resolveStrRef: () => "x" },
    { bytes, sourceObjectKey, sourceLayer: "fixture", resolveStrRef: () => "x" },
    { bytes: Buffer.from("2DA V2.0\nLabel\n0 x", "utf-8"), sourceObjectKey, sourceLayer: "hak", resolveStrRef: () => "x" },
    { bytes: Buffer.from("2DA V2.0\nName NAME\n0 1 2", "utf-8"), sourceObjectKey, sourceLayer: "hak", resolveStrRef: () => "x" },
  ])("rejects malformed source/table input %#", (input) => {
    expect(parseEffectiveCreaturePerceptionRangesTwoDa(input)).toBeNull();
  });
});
