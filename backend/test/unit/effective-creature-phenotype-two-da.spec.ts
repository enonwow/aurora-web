import { createHash } from "node:crypto";

import {
  buildEffectiveCreaturePhenotypeTwoDaDescriptor,
  buildEffectiveCreaturePhenotypeTwoDaRowOptions,
  isSupportedEffectiveCreaturePhenotypeTwoDaInput,
  parseEffectiveCreaturePhenotypeTwoDaRows,
} from "../../src/modules/catalog/domain/effective-creature-phenotype-two-da";

describe("effective creature phenotype.2da catalog", () => {
  const sourceObjectKey = "modules/current/__aurora/sources/vanilla/phenotype.2da";
  const bytes = Buffer.from([
    "2DA V2.0",
    "",
    "Label Name DefaultPhenoType",
    "0 Normal 2223 0",
    "1 Skinny **** 0",
    "2 Large 2225 0",
    "3 Normal_M 111015 0",
    "4 **** **** 0",
    "5 Large_M 111016 2",
  ].join("\n"), "utf-8");

  it("describes one complete effective table and preserves physical rows", () => {
    expect(buildEffectiveCreaturePhenotypeTwoDaDescriptor({
      bytes,
      sourceObjectKey,
      sourceLayer: "vanilla",
    })).toEqual({
      resourceName: "phenotype.2da",
      sourceObjectKey,
      sourceLayer: "vanilla",
      sha256: createHash("sha256").update(bytes).digest("hex"),
      sizeBytes: bytes.length,
      rowCount: 6,
    });
    expect(parseEffectiveCreaturePhenotypeTwoDaRows(bytes)).toEqual([
      { rowIndex: 0, nameStrRef: 2223, label: "Normal" },
      { rowIndex: 1, label: "Skinny" },
      { rowIndex: 2, nameStrRef: 2225, label: "Large" },
      { rowIndex: 3, nameStrRef: 111015, label: "Normal_M" },
      { rowIndex: 4 },
      { rowIndex: 5, nameStrRef: 111016, label: "Large_M" },
    ]);
  });

  it.each(["module", "hak", "vanilla"] as const)(
    "admits exact %s source provenance",
    (sourceLayer) => {
      expect(buildEffectiveCreaturePhenotypeTwoDaDescriptor({
        bytes,
        sourceObjectKey,
        sourceLayer,
      })?.sourceLayer).toBe(sourceLayer);
    },
  );

  it("admits only numeric NAME rows that round-trip through the native byte cache", () => {
    const rows = parseEffectiveCreaturePhenotypeTwoDaRows(bytes)!;
    expect(buildEffectiveCreaturePhenotypeTwoDaRowOptions(rows, (strRef) => ({
      2223: "Normal",
      2225: "Large",
      111015: "Normal (mounted)",
      111016: "Large (mounted)",
    })[strRef])).toEqual([
      { rowIndex: 0, displayName: "Normal", displaySource: "strref", nameStrRef: 2223, label: "Normal" },
      { rowIndex: 2, displayName: "Large", displaySource: "strref", nameStrRef: 2225, label: "Large" },
      { rowIndex: 3, displayName: "Normal (mounted)", displaySource: "strref", nameStrRef: 111015, label: "Normal_M" },
      { rowIndex: 5, displayName: "Large (mounted)", displaySource: "strref", nameStrRef: 111016, label: "Large_M" },
    ]);
  });

  it("uses bounded StringRef fallback without LABEL admission or the normalized row 1", () => {
    expect(buildEffectiveCreaturePhenotypeTwoDaRowOptions([
      { rowIndex: 0, nameStrRef: 2223, label: "Normal" },
      { rowIndex: 1, nameStrRef: 2224, label: "Skinny" },
      { rowIndex: 2, nameStrRef: 0, label: "Large" },
      { rowIndex: 0xff, nameStrRef: 2225 },
      { rowIndex: 0x100, nameStrRef: 2226 },
    ], () => undefined)).toEqual([
      { rowIndex: 0, displayName: "StringRef 2223", displaySource: "strref_id", nameStrRef: 2223, label: "Normal" },
      { rowIndex: 0xff, displayName: "StringRef 2225", displaySource: "strref_id", nameStrRef: 2225 },
    ]);
  });

  it.each([
    { bytes: Buffer.alloc(0), sourceObjectKey, sourceLayer: "vanilla" },
    { bytes, sourceObjectKey: "", sourceLayer: "vanilla" },
    { bytes, sourceObjectKey, sourceLayer: "fixture" },
  ])("rejects malformed descriptor input %#", (input) => {
    expect(isSupportedEffectiveCreaturePhenotypeTwoDaInput(input)).toBe(false);
    expect(buildEffectiveCreaturePhenotypeTwoDaDescriptor(input)).toBeNull();
  });

  it.each([
    Buffer.from("2DA V2.0\nNAME Name\n0 2223 2224", "utf-8"),
    Buffer.from("2DA V2.0\nLabel\n0 Normal", "utf-8"),
    Buffer.from("2DA V2.0\nName\nnot-a-row 2223", "utf-8"),
  ])("rejects tables outside the exact schema %#", (candidate) => {
    expect(parseEffectiveCreaturePhenotypeTwoDaRows(candidate)).toBeNull();
    expect(buildEffectiveCreaturePhenotypeTwoDaDescriptor({
      bytes: candidate,
      sourceObjectKey,
      sourceLayer: "vanilla",
    })).toBeNull();
  });
});
