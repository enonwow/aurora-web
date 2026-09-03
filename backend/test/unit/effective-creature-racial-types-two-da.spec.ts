import { createHash } from "node:crypto";

import {
  isExactEffectiveCreatureRacialTypesTwoDaTable,
  parseEffectiveCreatureRacialTypesTwoDa,
} from "../../src/modules/catalog/domain/effective-creature-racial-types-two-da";

describe("effective Creature racialtypes.2da", () => {
  const source = [
    "2DA V2.0",
    "",
    "Name ConAdjust Appearance",
    "0 100 0 6",
    "1 101 -2 3",
    "2 102 **** 5",
    "3 103 +4 1",
    "",
  ].join("\n");

  it("retains exact signed ConAdjust values under physical Race-row identity", () => {
    const bytes = Buffer.from(source, "ascii");
    const result = parseEffectiveCreatureRacialTypesTwoDa({
      bytes,
      sourceObjectKey: "runtime-source/vanilla/nwn_base.key/racialtypes.2da",
      sourceLayer: "vanilla",
    });
    expect(result).toEqual({
      descriptor: {
        resourceName: "racialtypes.2da",
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/racialtypes.2da",
        sourceLayer: "vanilla",
        sha256: createHash("sha256").update(bytes).digest("hex"),
        sizeBytes: bytes.length,
        rowCount: 4,
      },
      rows: [
        { rowIndex: 0, constitutionAdjust: 0 },
        { rowIndex: 1, constitutionAdjust: -2 },
        { rowIndex: 3, constitutionAdjust: 4 },
      ],
    });
    expect(isExactEffectiveCreatureRacialTypesTwoDaTable(result)).toBe(true);
  });

  it.each(["module", "hak", "vanilla"] as const)(
    "admits exact %s source provenance",
    (sourceLayer) => {
      expect(parseEffectiveCreatureRacialTypesTwoDa({
        bytes: Buffer.from(source, "ascii"),
        sourceObjectKey: `x/${sourceLayer}/racialtypes.2da`,
        sourceLayer,
      })?.descriptor.sourceLayer).toBe(sourceLayer);
    },
  );

  it.each([
    ["missing exact column", source.replace("ConAdjust", "CONADJUST")],
    ["duplicate exact column", source.replace("ConAdjust", "ConAdjust ConAdjust")],
    ["invalid row id", source.replace("1 101 -2 3", "race 101 -2 3")],
  ])("rejects a malformed stronger table: %s", (_label, candidate) => {
    expect(parseEffectiveCreatureRacialTypesTwoDa({
      bytes: Buffer.from(candidate, "ascii"),
      sourceObjectKey: "x/racialtypes.2da",
      sourceLayer: "hak",
    })).toBeNull();
  });

  it("keeps a complete table while excluding non-integer or out-of-int32 rows", () => {
    const candidate = source
      .replace("0 100 0 6", "0 100 1.5 6")
      .replace("1 101 -2 3", "1 101 2147483648 3");
    expect(parseEffectiveCreatureRacialTypesTwoDa({
      bytes: Buffer.from(candidate, "ascii"),
      sourceObjectKey: "x/racialtypes.2da",
      sourceLayer: "module",
    })?.rows).toEqual([{ rowIndex: 3, constitutionAdjust: 4 }]);
  });

  it("rejects extended or internally inconsistent transport values", () => {
    const value = parseEffectiveCreatureRacialTypesTwoDa({
      bytes: Buffer.from(source, "ascii"),
      sourceObjectKey: "x/racialtypes.2da",
      sourceLayer: "module",
    })!;
    expect(isExactEffectiveCreatureRacialTypesTwoDaTable({ ...value, extra: true }))
      .toBe(false);
    expect(isExactEffectiveCreatureRacialTypesTwoDaTable({
      ...value,
      rows: [{ rowIndex: 4, constitutionAdjust: 0 }],
    })).toBe(false);
    expect(isExactEffectiveCreatureRacialTypesTwoDaTable({
      ...value,
      rows: [{ rowIndex: 0, constitutionAdjust: 2.5 }],
    })).toBe(false);
  });
});
