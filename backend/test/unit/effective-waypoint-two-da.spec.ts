import {
  buildEffectiveWaypointTwoDaDescriptor,
  buildEffectiveWaypointTwoDaRowOptions,
  parseEffectiveWaypointTwoDaRows,
} from "../../src/modules/catalog/domain/effective-waypoint-two-da";

const SOURCE_KEY = "runtime-source/vanilla/nwn_base.key/waypoint.2da";

describe("effective waypoint.2da", () => {
  it("binds the exact physical table and exposes only native selectable rows", () => {
    const bytes = table([
      "0 **** **** ****",
      "1 blue gi_waypoint01 67281",
      "2 red gi_waypoint02 67282",
      "3 green gi_waypoint03 67284",
      "4 yellow gi_waypoint04 67285",
    ]);

    expect(buildEffectiveWaypointTwoDaDescriptor({
      bytes,
      sourceObjectKey: SOURCE_KEY,
      sourceLayer: "vanilla",
    })).toMatchObject({
      resourceName: "waypoint.2da",
      sourceObjectKey: SOURCE_KEY,
      sourceLayer: "vanilla",
      sizeBytes: bytes.length,
      rowCount: 5,
      sha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
    });
    expect(parseEffectiveWaypointTwoDaRows(bytes)).toEqual([
      { rowIndex: 1, label: "blue", modelResRef: "gi_waypoint01", strRef: 67281 },
      { rowIndex: 2, label: "red", modelResRef: "gi_waypoint02", strRef: 67282 },
      { rowIndex: 3, label: "green", modelResRef: "gi_waypoint03", strRef: 67284 },
      { rowIndex: 4, label: "yellow", modelResRef: "gi_waypoint04", strRef: 67285 },
    ]);
  });

  it("localizes display text without changing physical-row identity", () => {
    const rows = parseEffectiveWaypointTwoDaRows(table([
      "0 blue gi_waypoint01 67281",
      "1 red gi_waypoint02 67282",
    ]))!;

    expect(buildEffectiveWaypointTwoDaRowOptions(
      rows,
      (strRef) => strRef === 67281 ? "Blue marker" : undefined,
    )).toEqual([
      {
        rowIndex: 0,
        label: "blue",
        modelResRef: "gi_waypoint01",
        strRef: 67281,
        displayName: "Blue marker",
        displaySource: "strref",
      },
      {
        rowIndex: 1,
        label: "red",
        modelResRef: "gi_waypoint02",
        strRef: 67282,
        displayName: "red",
        displaySource: "label",
      },
    ]);
  });

  it.each([
    ["missing RESREF", Buffer.from("2DA V2.0\n\nLABEL STRREF\n0 blue 67281\n", "ascii")],
    ["too many physical rows", table(Array.from(
      { length: 257 },
      (_, row) => `${row} row${row} gi_waypoint01 ${row}`,
    ))],
    ["parser error", Buffer.from("not a two-da", "ascii")],
  ])("rejects %s", (_label, bytes) => {
    expect(buildEffectiveWaypointTwoDaDescriptor({
      bytes,
      sourceObjectKey: SOURCE_KEY,
      sourceLayer: "vanilla",
    })).toBeNull();
    expect(parseEffectiveWaypointTwoDaRows(bytes)).toBeNull();
  });

  it("skips rows that the native STRREF/model-backed selector cannot admit", () => {
    expect(parseEffectiveWaypointTwoDaRows(table([
      "0 blank **** ****",
      "1 bad_model model-name 1",
      "2 bad_strref gi_waypoint02 text",
      "3 valid GI_WAYPOINT03 3",
    ]))).toEqual([
      { rowIndex: 3, label: "valid", modelResRef: "GI_WAYPOINT03", strRef: 3 },
    ]);
  });
});

function table(rows: readonly string[]): Buffer {
  return Buffer.from(`2DA V2.0\n\nLABEL RESREF STRREF\n${rows.join("\n")}\n`, "ascii");
}
