import { createHash } from "node:crypto";

import {
  buildEffectiveCreatureAppendageTwoDaDescriptor,
  buildEffectiveCreatureAppendageTwoDaRowOptions,
  isSupportedEffectiveCreatureAppendageTwoDaInput,
  parseEffectiveCreatureAppendageTwoDaRows,
} from "../../src/modules/catalog/domain/effective-creature-appendage-two-da";

describe("effective Creature wingmodel/tailmodel 2DA catalogs", () => {
  const wingKey = "modules/current/__aurora/sources/hak/lc_2da/wingmodel.2da";
  const bytes = Buffer.from([
    "2DA V2.0",
    "",
    "LABEL MODEL WING_TAIL_SCALE ENVMAP",
    "0 None **** 1.0 ****",
    "7 Angel wng_angel 1.25 defaultmap",
    "21 **** wng_hidden 1.0 ****",
  ].join("\n"), "utf-8");

  it.each([
    ["wingmodel.2da", "hak"],
    ["tailmodel.2da", "module"],
    ["wingmodel.2da", "vanilla"],
  ] as const)("describes the complete effective %s from %s", (resourceName, sourceLayer) => {
    expect(buildEffectiveCreatureAppendageTwoDaDescriptor({
      bytes,
      resourceName,
      sourceObjectKey: wingKey,
      sourceLayer,
    })).toEqual({
      resourceName,
      sourceObjectKey: wingKey,
      sourceLayer,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      sizeBytes: bytes.length,
      rowCount: 3,
    });
  });

  it("preserves physical row ordinals and admits only Toolset-visible LABEL rows", () => {
    expect(parseEffectiveCreatureAppendageTwoDaRows(bytes, "wingmodel.2da")).toEqual([
      { rowIndex: 0, displayName: "None" },
      { rowIndex: 1, displayName: "Angel" },
      { rowIndex: 2 },
    ]);
    expect(buildEffectiveCreatureAppendageTwoDaRowOptions(
      parseEffectiveCreatureAppendageTwoDaRows(bytes, "wingmodel.2da")!,
    )).toEqual([
      { rowIndex: 0, displayName: "None" },
      { rowIndex: 1, displayName: "Angel" },
    ]);
  });

  it("does not treat authored row labels as persisted identity", () => {
    expect(buildEffectiveCreatureAppendageTwoDaRowOptions([
      { rowIndex: 12, displayName: "7" },
      { rowIndex: 13, displayName: "Dragon Wings" },
      { rowIndex: 14, displayName: "" },
      { rowIndex: 15, displayName: "x".repeat(1025) },
      { rowIndex: -1, displayName: "Invalid" },
    ])).toEqual([
      { rowIndex: 12, displayName: "7" },
      { rowIndex: 13, displayName: "Dragon Wings" },
    ]);
  });

  it.each([
    { bytes: Buffer.alloc(0), resourceName: "wingmodel.2da", sourceObjectKey: wingKey, sourceLayer: "hak" },
    { bytes, resourceName: "appearance.2da", sourceObjectKey: wingKey, sourceLayer: "hak" },
    { bytes, resourceName: "wingmodel.2da", sourceObjectKey: "", sourceLayer: "hak" },
    { bytes, resourceName: "tailmodel.2da", sourceObjectKey: wingKey, sourceLayer: "fixture" },
  ])("rejects malformed descriptor input %#", (input) => {
    expect(isSupportedEffectiveCreatureAppendageTwoDaInput(input)).toBe(false);
    expect(buildEffectiveCreatureAppendageTwoDaDescriptor(input)).toBeNull();
  });

  it.each([
    Buffer.from("2DA V2.0\nlabel MODEL\n0 A a", "utf-8"),
    Buffer.from("2DA V2.0\nMODEL\n0 a", "utf-8"),
    Buffer.from("2DA V2.0\nLABEL MODEL\nnot-a-row A a", "utf-8"),
  ])("rejects tables outside the exact Toolset selector schema %#", (candidate) => {
    expect(parseEffectiveCreatureAppendageTwoDaRows(candidate, "tailmodel.2da")).toBeNull();
    expect(buildEffectiveCreatureAppendageTwoDaDescriptor({
      bytes: candidate,
      resourceName: "tailmodel.2da",
      sourceObjectKey: wingKey,
      sourceLayer: "hak",
    })).toBeNull();
  });
});
