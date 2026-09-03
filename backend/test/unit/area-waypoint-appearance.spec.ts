import {
  bindEffectiveWaypointTwoDaToAppearance,
  parseAreaWaypointAppearanceMutation,
  parseAreaWaypointAppearanceProvenance,
} from "../../src/modules/areas/domain/area-waypoint-appearance";

const SHA = "a".repeat(64);

describe("retained Waypoint Appearance", () => {
  it("binds one exact stored Byte only when its physical row is selectable", () => {
    const descriptor = {
      resourceName: "waypoint.2da" as const,
      sourceObjectKey: "runtime-source/vanilla/nwn_base.key/waypoint.2da",
      sourceLayer: "vanilla" as const,
      sha256: SHA,
      sizeBytes: 272,
      rowCount: 5,
    };
    const rows = [{
      rowIndex: 1,
      modelResRef: "gi_waypoint01",
      strRef: 67281,
      label: "blue",
      displayName: "Blue marker",
      displaySource: "strref" as const,
    }];

    expect(bindEffectiveWaypointTwoDaToAppearance(
      { present: true, nativeType: "byte", value: 1 },
      descriptor,
      rows,
    )).toEqual(provenance({}));
    expect(bindEffectiveWaypointTwoDaToAppearance(
      { present: true, nativeType: "byte", value: 2 },
      descriptor,
      rows,
    )).toBeUndefined();
  });

  it("admits exact Byte provenance bound to a selectable physical row", () => {
    expect(parseAreaWaypointAppearanceProvenance({
      present: true,
      nativeType: "byte",
      value: 1,
      table: {
        resourceName: "waypoint.2da",
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/waypoint.2da",
        sourceLayer: "vanilla",
        sha256: SHA,
        sizeBytes: 272,
        rowCount: 5,
        rowIndex: 1,
      },
    })).toEqual({
      present: true,
      nativeType: "byte",
      value: 1,
      table: {
        resourceName: "waypoint.2da",
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/waypoint.2da",
        sourceLayer: "vanilla",
        sha256: SHA,
        sizeBytes: 272,
        rowCount: 5,
        rowIndex: 1,
      },
    });
  });

  it("admits one changed digest-bound byte mutation", () => {
    expect(parseAreaWaypointAppearanceMutation({
      expectedValue: 1,
      value: 4,
      tableSha256: SHA,
      rowCount: 5,
    })).toEqual({
      expectedValue: 1,
      value: 4,
      tableSha256: SHA,
      rowCount: 5,
    });
  });

  it.each([
    ["absent", { present: false, nativeType: "absent", value: 1 }],
    ["wrong native type", { present: true, nativeType: "word", value: 1 }],
    ["row mismatch", provenance({ value: 2 })],
    ["out of byte range", provenance({ value: 256, rowIndex: 256, rowCount: 257 })],
    ["wrong resource", provenance({ resourceName: "appearance.2da" })],
  ])("rejects %s provenance", (_label, value) => {
    expect(parseAreaWaypointAppearanceProvenance(value)).toBeNull();
  });

  it.each([
    ["unchanged", { expectedValue: 1, value: 1, tableSha256: SHA, rowCount: 5 }],
    ["target missing", { expectedValue: 1, tableSha256: SHA, rowCount: 5 }],
    ["target outside table", { expectedValue: 1, value: 5, tableSha256: SHA, rowCount: 5 }],
    ["table outside Byte domain", { expectedValue: 1, value: 2, tableSha256: SHA, rowCount: 257 }],
    ["unknown key", { expectedValue: 1, value: 2, tableSha256: SHA, rowCount: 5, label: "blue" }],
  ])("rejects %s mutation", (_label, value) => {
    expect(parseAreaWaypointAppearanceMutation(value)).toBeNull();
  });
});

function provenance(overrides: Readonly<Record<string, unknown>>) {
  return {
    present: true,
    nativeType: "byte",
    value: 1,
    table: {
      resourceName: "waypoint.2da",
      sourceObjectKey: "runtime-source/vanilla/nwn_base.key/waypoint.2da",
      sourceLayer: "vanilla",
      sha256: SHA,
      sizeBytes: 272,
      rowCount: 5,
      rowIndex: 1,
    },
    ...("resourceName" in overrides
      ? { table: { resourceName: overrides.resourceName } }
      : "rowIndex" in overrides || "rowCount" in overrides
        ? { table: {
            resourceName: "waypoint.2da",
            sourceObjectKey: "runtime-source/vanilla/nwn_base.key/waypoint.2da",
            sourceLayer: "vanilla",
            sha256: SHA,
            sizeBytes: 272,
            rowCount: overrides.rowCount ?? 5,
            rowIndex: overrides.rowIndex ?? 1,
          } }
        : {}),
    ...(overrides.value !== undefined ? { value: overrides.value } : {}),
  };
}
