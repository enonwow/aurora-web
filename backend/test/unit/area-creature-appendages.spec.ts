import {
  bindEffectiveAppendageTwoDaToCreatureAppendages,
  readAreaCreatureAppendageStorage,
  readAreaCreatureAppendagesStorage,
  readExistingAreaCreatureAppendageMutations,
} from "../../src/modules/areas/domain/area-creature-appendages";

const sha256 = "a".repeat(64);
const descriptor = (resourceName: "wingmodel.2da" | "tailmodel.2da") => ({
  resourceName,
  sourceObjectKey: `runtime-source/vanilla/nwn_base.key/${resourceName}`,
  sourceLayer: "vanilla",
  sha256,
  sizeBytes: 123,
  rowCount: 8,
});

describe("Area retained Creature wings/tail storage", () => {
  it("uses modern DWord precedence while retaining the legacy sibling", () => {
    expect(readAreaCreatureAppendageStorage({
      present: true,
      value: 7,
      modernDword: { present: true, nativeType: "dword", value: 7 },
      legacyByte: { present: true, nativeType: "byte", value: 2 },
    })).toEqual({
      present: true,
      value: 7,
      modernDword: { present: true, nativeType: "dword", value: 7 },
      legacyByte: { present: true, nativeType: "byte", value: 2 },
    });
  });

  it("uses legacy Byte only when the modern field is absent", () => {
    expect(readAreaCreatureAppendageStorage({
      present: true,
      value: 3,
      modernDword: { present: false },
      legacyByte: { present: true, nativeType: "byte", value: 3 },
    })).toEqual({
      present: true,
      value: 3,
      modernDword: { present: false },
      legacyByte: { present: true, nativeType: "byte", value: 3 },
    });
  });

  it.each([
    { present: true, value: 1, modernDword: { present: false }, legacyByte: { present: false } },
    { present: true, value: 2, modernDword: { present: true, nativeType: "dword", value: 1 }, legacyByte: { present: false } },
    { present: true, value: 1, modernDword: { present: true, nativeType: "word", value: 1 }, legacyByte: { present: false } },
    { present: true, value: 1, modernDword: { present: false }, legacyByte: { present: true, nativeType: "byte", value: 256 } },
  ])("rejects malformed compatibility storage %#", (input) => {
    expect(readAreaCreatureAppendageStorage(input)).toBeNull();
  });

  it("binds only an in-range modern DWord to its member-specific effective table", () => {
    const source = readAreaCreatureAppendagesStorage({
      wings: {
        present: true,
        value: 7,
        modernDword: { present: true, nativeType: "dword", value: 7 },
        legacyByte: { present: true, nativeType: "byte", value: 1 },
      },
      tail: {
        present: true,
        value: 2,
        modernDword: { present: false },
        legacyByte: { present: true, nativeType: "byte", value: 2 },
      },
    })!;
    expect(bindEffectiveAppendageTwoDaToCreatureAppendages(source, {
      wings: descriptor("wingmodel.2da"),
      tail: descriptor("tailmodel.2da"),
    })).toEqual({
      wings: {
        present: true,
        value: 7,
        modernDword: {
          present: true,
          nativeType: "dword",
          value: 7,
          table: { ...descriptor("wingmodel.2da"), rowIndex: 7 },
        },
        legacyByte: { present: true, nativeType: "byte", value: 1 },
      },
      tail: {
        present: true,
        value: 2,
        modernDword: { present: false },
        legacyByte: { present: true, nativeType: "byte", value: 2 },
      },
    });
  });

  it("accepts a non-empty strict digest-bound mutation subset", () => {
    expect(readExistingAreaCreatureAppendageMutations({
      wings: { expectedValue: 1, value: 7, tableSha256: sha256, rowCount: 8 },
    })).toEqual({
      wings: { expectedValue: 1, value: 7, tableSha256: sha256, rowCount: 8 },
    });
  });

  it.each([
    {},
    { robe: { expectedValue: 1, value: 2, tableSha256: sha256, rowCount: 8 } },
    { tail: { expectedValue: 1, value: 1, tableSha256: sha256, rowCount: 8 } },
    { tail: { expectedValue: 1, value: 8, tableSha256: sha256, rowCount: 8 } },
    { tail: { expectedValue: 1, value: 2, tableSha256: "A".repeat(64), rowCount: 8 } },
  ])("rejects malformed mutation groups %#", (input) => {
    expect(readExistingAreaCreatureAppendageMutations(input)).toBeNull();
  });
});
