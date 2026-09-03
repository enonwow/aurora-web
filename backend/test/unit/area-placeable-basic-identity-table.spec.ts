import {
  bindEffectivePlaceablesTwoDaToBasicIdentity,
} from "../../src/modules/areas/domain/area-placeable-basic-identity-table";

describe("Area Placeable basic identity table binding", () => {
  const identity = {
    tag: { present: true as const, value: "WaterTrough" },
    appearance: { present: true as const, nativeType: "dword" as const, value: 104 },
  };
  const descriptor = {
    resourceName: "placeables.2da" as const,
    sourceObjectKey: "modules/current/__aurora/sources/hak/lc_2da/placeables.2da",
    sourceLayer: "hak" as const,
    sha256: "a".repeat(64),
    sizeBytes: 8192,
    rowCount: 16500,
  };

  it("binds a canonical DWord to the same physical row without mutating source provenance", () => {
    const result = bindEffectivePlaceablesTwoDaToBasicIdentity(identity, descriptor);

    expect(result).toEqual({
      ...identity,
      appearance: {
        ...identity.appearance,
        table: { ...descriptor, rowIndex: 104 },
      },
    });
    expect(result).not.toBe(identity);
    expect(result.appearance).not.toBe(identity.appearance);
  });

  it.each([
    {
      identity: { ...identity, appearance: { present: true as const, nativeType: "dword" as const, value: 0 } },
      descriptor: {
        ...descriptor,
        sourceObjectKey: "x",
        sourceLayer: "module" as const,
        sizeBytes: 1,
        rowCount: 1,
      },
    },
    {
      identity: { ...identity, appearance: { present: true as const, nativeType: "dword" as const, value: 999_999 } },
      descriptor: {
        ...descriptor,
        sourceObjectKey: "x".repeat(2048),
        sourceLayer: "vanilla" as const,
        sizeBytes: 64 * 1024 * 1024,
        rowCount: 1_000_000,
      },
    },
  ])("binds exact descriptor boundaries %#", ({ identity: candidate, descriptor: exactTable }) => {
    expect(bindEffectivePlaceablesTwoDaToBasicIdentity(candidate, exactTable))
      .toHaveProperty("appearance.table.rowIndex", candidate.appearance.value);
  });

  it.each([
    [{ ...identity, appearance: { present: false as const } }, descriptor],
    [{ ...identity, appearance: { present: true as const, nativeType: "byte" as const, value: 104 } }, descriptor],
    [{ ...identity, appearance: { present: true as const, nativeType: "dword" as const, value: -1 } }, descriptor],
    [{ ...identity, appearance: { present: true as const, nativeType: "dword" as const, value: 1.5 } }, descriptor],
    [{ ...identity, appearance: { present: true as const, nativeType: "dword" as const, value: 0x1_0000_0000 } }, descriptor],
    [identity, { ...descriptor, rowCount: 104 }],
    [identity, { ...descriptor, resourceName: "appearance.2da" }],
    [identity, null],
    [identity, []],
    [identity, Object.assign([], descriptor)],
    [identity, "descriptor"],
    [identity, { ...descriptor, sourceObjectKey: "" }],
    [identity, { ...descriptor, sourceObjectKey: 7 }],
    [identity, { ...descriptor, sourceObjectKey: "x".repeat(2049) }],
    [identity, { ...descriptor, sourceLayer: "external_fixture" }],
    [identity, { ...descriptor, sha256: "A".repeat(64) }],
    [identity, { ...descriptor, sha256: 7 }],
    [identity, { ...descriptor, sha256: { toString: () => "a".repeat(64) } }],
    [identity, { ...descriptor, sha256: `x${"a".repeat(64)}` }],
    [identity, { ...descriptor, sha256: `${"a".repeat(64)}x` }],
    [identity, { ...descriptor, sizeBytes: 0 }],
    [identity, { ...descriptor, sizeBytes: "1" }],
    [identity, { ...descriptor, sizeBytes: 64 * 1024 * 1024 + 1 }],
    [identity, { ...descriptor, rowCount: 0 }],
    [identity, { ...descriptor, rowCount: "16500" }],
    [identity, { ...descriptor, rowCount: 1_000_001 }],
    [identity, { ...descriptor, extra: true }],
  ])("preserves storage provenance without a table for unsupported input %#", (candidate, table) => {
    expect(bindEffectivePlaceablesTwoDaToBasicIdentity(candidate, table)).toEqual(candidate);
  });
});
