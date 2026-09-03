import { createHash } from "node:crypto";

import {
  parseEffectiveCreatureWalkRatesTwoDa,
} from "../../src/modules/catalog/domain/effective-creature-walk-rates-two-da";

describe("effective Creature creaturespeed.2da catalog", () => {
  const sourceObjectKey = "modules/current/__aurora/sources/hak/lc_2da/creaturespeed.2da";
  const bytes = Buffer.from([
    "2DA V2.0",
    "",
    "Label Name 2DAName WALKRATE RUNRATE",
    "0 PC_Movement **** PLAYER 2.00 4.00",
    "1 Immobile 2319 NOMOVE 0.00 0.00",
    "2 Very_Slow 2320 VSLOW 0.75 1.50",
    "3 Slow 2321 SLOW 1.25 2.50",
    "4 Normal 2322 NORM 1.75 3.50",
    "5 Fast 2323 FAST 2.25 4.50",
    "6 Very_Fast 2324 VFAST 2.75 5.50",
    "7 Default 6614 DEFAULT 0.00 0.00",
    "8 DM_Fast 6893 DFAST 5.50 11.00",
  ].join("\n"), "utf-8");

  it("admits the complete native positional selector and preserves physical row identity", () => {
    expect(parseEffectiveCreatureWalkRatesTwoDa({
      bytes,
      sourceObjectKey,
      sourceLayer: "hak",
      resolveStrRef: (strRef) => ({
        2319: "Immobile",
        2320: "Very Slow",
        2321: "Slow",
        2322: "Normal",
        2323: "Fast",
        2324: "Very Fast",
        6614: "Default",
        6893: "DM Fast",
      })[strRef],
    })).toEqual({
      descriptor: {
        resourceName: "creaturespeed.2da",
        sourceObjectKey,
        sourceLayer: "hak",
        sha256: createHash("sha256").update(bytes).digest("hex"),
        sizeBytes: bytes.length,
        rowCount: 9,
      },
      rows: [
        { rowIndex: 1, displayName: "Immobile", displaySource: "strref", nameStrRef: 2319, twoDaName: "NOMOVE" },
        { rowIndex: 2, displayName: "Very Slow", displaySource: "strref", nameStrRef: 2320, twoDaName: "VSLOW" },
        { rowIndex: 3, displayName: "Slow", displaySource: "strref", nameStrRef: 2321, twoDaName: "SLOW" },
        { rowIndex: 4, displayName: "Normal", displaySource: "strref", nameStrRef: 2322, twoDaName: "NORM" },
        { rowIndex: 5, displayName: "Fast", displaySource: "strref", nameStrRef: 2323, twoDaName: "FAST" },
        { rowIndex: 6, displayName: "Very Fast", displaySource: "strref", nameStrRef: 2324, twoDaName: "VFAST" },
        { rowIndex: 7, displayName: "Default", displaySource: "strref", nameStrRef: 6614, twoDaName: "DEFAULT" },
        { rowIndex: 8, displayName: "DM Fast", displaySource: "strref", nameStrRef: 6893, twoDaName: "DFAST" },
      ],
    });
  });

  it("uses a bounded StringRef fallback without changing row identity", () => {
    expect(parseEffectiveCreatureWalkRatesTwoDa({
      bytes,
      sourceObjectKey,
      sourceLayer: "module",
      resolveStrRef: () => undefined,
    })?.rows[0]).toEqual({
      rowIndex: 1,
      displayName: "StringRef 2319",
      displaySource: "strref_id",
      nameStrRef: 2319,
      twoDaName: "NOMOVE",
    });
  });

  it.each([
    ["selectable row zero", [
      "2DA V2.0", "Name 2DAName", "0 99 PLAYER", "1 100 NOMOVE",
    ]],
    ["missing intermediate Name", [
      "2DA V2.0", "Name 2DAName", "0 **** PLAYER", "1 100 NOMOVE", "2 **** VSLOW", "3 102 SLOW",
    ]],
    ["missing intermediate 2DAName", [
      "2DA V2.0", "Name 2DAName", "0 **** PLAYER", "1 100 NOMOVE", "2 101 ****",
    ]],
    ["non-positive Name", [
      "2DA V2.0", "Name 2DAName", "0 **** PLAYER", "1 0 NOMOVE",
    ]],
  ])("fails closed when the Toolset positional invariant has %s", (_label, lines) => {
    expect(parseEffectiveCreatureWalkRatesTwoDa({
      bytes: Buffer.from(lines.join("\n"), "utf-8"),
      sourceObjectKey,
      sourceLayer: "module",
      resolveStrRef: () => "x",
    })).toBeNull();
  });

  it.each([
    { bytes: Buffer.alloc(0), sourceObjectKey, sourceLayer: "hak", resolveStrRef: () => "x" },
    { bytes, sourceObjectKey: "", sourceLayer: "hak", resolveStrRef: () => "x" },
    { bytes, sourceObjectKey, sourceLayer: "fixture", resolveStrRef: () => "x" },
    { bytes: Buffer.from("2DA V2.0\nName\n0 ****\n1 1", "utf-8"), sourceObjectKey, sourceLayer: "hak", resolveStrRef: () => "x" },
    { bytes: Buffer.from("2DA V2.0\nName NAME 2DAName\n0 **** **** PLAYER", "utf-8"), sourceObjectKey, sourceLayer: "hak", resolveStrRef: () => "x" },
  ])("rejects malformed source/table input %#", (input) => {
    expect(parseEffectiveCreatureWalkRatesTwoDa(input)).toBeNull();
  });
});
