import { parseAreaEditingExportDraft } from "../../src/modules/areas/adapters/inbound/http/area-editing.schemas";

function baseDraft() {
  return {
    areaResRef: "visual_scalar",
    name: "Visual Scalar",
    width: 2,
    height: 2,
    tilesetResRef: "tin01",
    tilesetFingerprint: "a".repeat(64),
    tiles: [
      { row: 0, col: 0, tileId: 0, orientation: 0, height: 0 },
      { row: 0, col: 1, tileId: 0, orientation: 0, height: 0 },
      { row: 1, col: 0, tileId: 0, orientation: 0, height: 0 },
      { row: 1, col: 1, tileId: 0, orientation: 0, height: 0 },
    ],
  };
}

describe("Area visual-environment scalar-controls HTTP schema", () => {
  it("accepts one exact changed complete CAS pair", () => {
    const mutation = {
      expectedValue: { fogClipDistance: 45, windPower: 0 },
      value: { fogClipDistance: 120, windPower: 2 },
    };
    expect(parseAreaEditingExportDraft({
      ...baseDraft(),
      visualEnvironmentScalarControls: mutation,
    }).visualEnvironmentScalarControls).toEqual(mutation);
  });

  it.each<[string, unknown]>([
    ["unchanged tuple", {
      expectedValue: { fogClipDistance: 45, windPower: 0 },
      value: { fogClipDistance: 45, windPower: 0 },
    }],
    ["missing member", {
      expectedValue: { fogClipDistance: 45, windPower: 0 },
      value: { fogClipDistance: 120 },
    }],
    ["unknown member", {
      expectedValue: { fogClipDistance: 45, windPower: 0 },
      value: { fogClipDistance: 120, windPower: 2, skyBox: 0 },
    }],
    ["fractional fog distance", {
      expectedValue: { fogClipDistance: 45, windPower: 0 },
      value: { fogClipDistance: 120.5, windPower: 2 },
    }],
    ["wind outside trackbar", {
      expectedValue: { fogClipDistance: 45, windPower: 0 },
      value: { fogClipDistance: 120, windPower: 3 },
    }],
  ])("rejects %s", (_label, mutation) => {
    expect(() => parseAreaEditingExportDraft({
      ...baseDraft(),
      visualEnvironmentScalarControls: mutation,
    })).toThrow();
  });
});
