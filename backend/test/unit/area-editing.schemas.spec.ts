import { parseAreaEditingExportDraft } from "../../src/modules/areas/adapters/inbound/http/area-editing.schemas";

function draft(height: number) {
  return {
    areaResRef: "height_test",
    name: "Height Test",
    width: 2,
    height: 2,
    tilesetResRef: "heightset",
    tilesetFingerprint: "a".repeat(64),
    tiles: [
      { row: 0, col: 0, tileId: 0, orientation: 0, height },
      { row: 0, col: 1, tileId: 0, orientation: 0, height: 0 },
      { row: 1, col: 0, tileId: 0, orientation: 0, height: 0 },
      { row: 1, col: 1, tileId: 0, orientation: 0, height: 0 }
    ]
  };
}

describe("Area editing export schema", () => {
  it("accepts Aurora tile heights 0..32 and rejects values outside the recovered range", () => {
    expect(parseAreaEditingExportDraft(draft(0)).tiles[0]?.height).toBe(0);
    expect(parseAreaEditingExportDraft(draft(32)).tiles[0]?.height).toBe(32);
    expect(() => parseAreaEditingExportDraft(draft(-1))).toThrow();
    expect(() => parseAreaEditingExportDraft(draft(33))).toThrow();
    expect(() => parseAreaEditingExportDraft(draft(1.5))).toThrow();
  });
});
