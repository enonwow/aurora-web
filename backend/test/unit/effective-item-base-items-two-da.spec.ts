import {
  isExactEffectiveItemBaseItemsTwoDaTable,
  parseEffectiveItemBaseItemsTwoDa,
} from "../../src/modules/catalog/domain/effective-item-base-items-two-da";

describe("effective baseitems.2da", () => {
  const source = [
    "2DA V2.0",
    "",
    "Name label ModelType ItemClass DefaultModel InvSlotWidth InvSlotHeight",
    "0 106 shortsword 2 WSwSs it_bag 1 3",
    "1 **** smallshield 0 AShSw it_bag 2 2",
    "2 200 chainshirt 3 AARM it_bag **** ****",
    "",
  ].join("\n");

  it("binds the digest and preserves numeric ModelType separately from ItemClass", () => {
    const table = parseEffectiveItemBaseItemsTwoDa({
      bytes: Buffer.from(source, "ascii"),
      sourceObjectKey: "modules/current/__aurora/sources/hak/lc_items/baseitems.2da",
      sourceLayer: "hak",
    });
    expect(table).toEqual({
      descriptor: {
        resourceName: "baseitems.2da",
        sourceObjectKey: "modules/current/__aurora/sources/hak/lc_items/baseitems.2da",
        sourceLayer: "hak",
        sha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
        sizeBytes: Buffer.byteLength(source, "ascii"),
        rowCount: 3,
      },
      rows: [
        { rowIndex: 0, nameStrRef: 106, label: "shortsword", modelType: 2, itemClass: "WSwSs", displayName: "shortsword", invSlotWidth: 1, invSlotHeight: 3 },
        { rowIndex: 1, label: "smallshield", modelType: 0, itemClass: "AShSw", displayName: "smallshield", invSlotWidth: 2, invSlotHeight: 2 },
        { rowIndex: 2, nameStrRef: 200, label: "chainshirt", modelType: 3, itemClass: "AARM", displayName: "chainshirt" },
      ],
    });
    expect(isExactEffectiveItemBaseItemsTwoDaTable(table)).toBe(true);
  });

  it.each(["-1", "4", "1.5", "+2", "****"])(
    "rejects invalid ModelType %s",
    (modelType) => {
      expect(parseEffectiveItemBaseItemsTwoDa({
        bytes: Buffer.from(source.replace("2 WSwSs", `${modelType} WSwSs`), "ascii"),
        sourceObjectKey: "x/baseitems.2da",
        sourceLayer: "module",
      })).toBeNull();
    },
  );

  it.each(["0", "11", "-1", "1.5", "+2"])(
    "rejects invalid present inventory slot dimension %s",
    (dimension) => {
      expect(parseEffectiveItemBaseItemsTwoDa({
        bytes: Buffer.from(source.replace("it_bag 1 3", `it_bag ${dimension} 3`), "ascii"),
        sourceObjectKey: "x/baseitems.2da",
        sourceLayer: "module",
      })).toBeNull();
    },
  );

  it("rejects duplicate required columns, invalid provenance, gaps, and non-exact resolved tables", () => {
    expect(parseEffectiveItemBaseItemsTwoDa({
      bytes: Buffer.from(source.replace("ModelType ItemClass", "ModelType ModelType ItemClass"), "ascii"),
      sourceObjectKey: "x/baseitems.2da",
      sourceLayer: "module",
    })).toBeNull();
    expect(parseEffectiveItemBaseItemsTwoDa({
      bytes: Buffer.from(source, "ascii"),
      sourceObjectKey: "",
      sourceLayer: "module",
    })).toBeNull();
    const gap = source.replace("1 **** smallshield", "3 **** smallshield");
    expect(parseEffectiveItemBaseItemsTwoDa({
      bytes: Buffer.from(gap, "ascii"),
      sourceObjectKey: "x/baseitems.2da",
      sourceLayer: "module",
    })).toBeNull();

    const valid = parseEffectiveItemBaseItemsTwoDa({
      bytes: Buffer.from(source, "ascii"),
      sourceObjectKey: "x/baseitems.2da",
      sourceLayer: "module",
    })!;
    expect(isExactEffectiveItemBaseItemsTwoDaTable({ ...valid, extra: true })).toBe(false);
    expect(isExactEffectiveItemBaseItemsTwoDaTable({
      ...valid,
      rows: valid.rows.map((row, index) => index === 0 ? { ...row, modelType: 4 } : row),
    })).toBe(false);
  });
});
