import {
  filterEffectiveCreaturePortraitRows,
  isExactEffectiveCreaturePortraitsTwoDaTable,
  parseEffectiveCreaturePortraitsTwoDa,
} from "../../src/modules/catalog/domain/effective-creature-portraits-two-da";

describe("effective Creature portraits.2da", () => {
  const source = [
    "2DA V2.0",
    "",
    "BaseResRef Sex Race Plot LowGore",
    "0 hu_m_01 0 6 0 0",
    "1 el_f_01 1 1 0 0",
    "2 hu_m_plot 0 6 1 0",
    "3 po_placeable 4 **** **** 0",
    "4 el_m_01 0 1 0 0",
    "5 **** 0 6 0 0",
    "6 npc_other 4 7 0 0",
    "",
  ].join("\n");

  it("retains only exact non-plot Creature rows with physical row identity", () => {
    const result = parseEffectiveCreaturePortraitsTwoDa({
      bytes: Buffer.from(source, "ascii"),
      sourceObjectKey: "runtime-source/vanilla/nwn_base.key/portraits.2da",
      sourceLayer: "vanilla",
    });
    expect(result).toEqual({
      descriptor: {
        resourceName: "portraits.2da",
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/portraits.2da",
        sourceLayer: "vanilla",
        sha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
        sizeBytes: Buffer.byteLength(source, "ascii"),
        rowCount: 7,
      },
      rows: [
        { rowIndex: 0, baseResRef: "hu_m_01", sex: 0, race: 6, plot: 0 },
        { rowIndex: 1, baseResRef: "el_f_01", sex: 1, race: 1, plot: 0 },
        { rowIndex: 4, baseResRef: "el_m_01", sex: 0, race: 1, plot: 0 },
        { rowIndex: 6, baseResRef: "npc_other", sex: 4, race: 7, plot: 0 },
      ],
    });
    expect(isExactEffectiveCreaturePortraitsTwoDaTable(result)).toBe(true);
  });

  it("implements the Toolset Gender/Race selector rule including Race 4", () => {
    const rows = parseEffectiveCreaturePortraitsTwoDa({
      bytes: Buffer.from(source, "ascii"),
      sourceObjectKey: "x/portraits.2da",
      sourceLayer: "module",
    })!.rows;
    expect(filterEffectiveCreaturePortraitRows(rows, 0, 6).map((row) => row.rowIndex))
      .toEqual([0]);
    expect(filterEffectiveCreaturePortraitRows(rows, 1, 1).map((row) => row.rowIndex))
      .toEqual([1]);
    expect(filterEffectiveCreaturePortraitRows(rows, 0, 4).map((row) => row.rowIndex))
      .toEqual([0, 4]);
    expect(filterEffectiveCreaturePortraitRows(rows, 0, 7).map((row) => row.rowIndex))
      .toEqual([6]);
    expect(filterEffectiveCreaturePortraitRows(rows, 2, 6)).toEqual([]);
  });

  it.each([
    ["missing Sex", source.replace(" Sex", " Gender")],
    ["missing Race", source.replace(" Race", " Species")],
    ["missing Plot", source.replace(" Plot", " Story")],
    ["duplicate BaseResRef", source.replace(
      "BaseResRef Sex",
      "BaseResRef BaseResRef Sex",
    )],
    ["invalid BaseResRef", source.replace("hu_m_01", "hu-m-01")],
  ])("rejects %s", (_label, value) => {
    expect(parseEffectiveCreaturePortraitsTwoDa({
      bytes: Buffer.from(value, "ascii"),
      sourceObjectKey: "x/portraits.2da",
      sourceLayer: "hak",
    })).toBeNull();
  });

  it("rejects extra keys and inconsistent sparse rows at the boundary", () => {
    const value = parseEffectiveCreaturePortraitsTwoDa({
      bytes: Buffer.from(source, "ascii"),
      sourceObjectKey: "x/portraits.2da",
      sourceLayer: "module",
    })!;
    expect(isExactEffectiveCreaturePortraitsTwoDaTable(value)).toBe(true);
    expect(isExactEffectiveCreaturePortraitsTwoDaTable({ ...value, extra: true })).toBe(false);
    expect(isExactEffectiveCreaturePortraitsTwoDaTable({
      ...value,
      rows: value.rows.map((row, index) => index === 0 ? { ...row, plot: 1 } : row),
    })).toBe(false);
    expect(isExactEffectiveCreaturePortraitsTwoDaTable({
      ...value,
      rows: value.rows.map((row, index) => index === 1 ? { ...row, rowIndex: 0 } : row),
    })).toBe(false);
  });
});
