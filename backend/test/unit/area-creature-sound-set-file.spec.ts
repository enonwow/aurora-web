import {
  bindEffectiveCreatureSoundSetsTwoDaToCreatureSoundSetFile,
  readAreaCreatureSoundSetFileStorage,
  readExistingAreaCreatureSoundSetFileMutation,
} from "../../src/modules/areas/domain/area-creature-sound-set-file";
import { parseEffectiveCreatureSoundSetsTwoDa } from
  "../../src/modules/catalog/domain/effective-creature-sound-sets-two-da";

describe("Area Creature SoundSetFile", () => {
  const table = parseEffectiveCreatureSoundSetsTwoDa({
    bytes: Buffer.from([
      "2DA V2.0",
      "",
      "LABEL RESREF STRREF GENDER TYPE",
      "0 Zero zero_vo 100 0 4",
      "1 **** **** **** 0 4",
      "2 Two two_vo 102 0 4",
      "",
    ].join("\n"), "ascii"),
    sourceObjectKey: "runtime-source/module/soundset.2da",
    sourceLayer: "module",
    resolveStrRef: (strRef) => `Voice ${strRef}`,
  })!;

  it("accepts presence-sensitive exact Word storage including row zero", () => {
    expect(readAreaCreatureSoundSetFileStorage({ present: false })).toEqual({ present: false });
    expect(readAreaCreatureSoundSetFileStorage({
      present: true,
      nativeType: "word",
      value: 0,
    })).toEqual({ present: true, nativeType: "word", value: 0 });
  });

  it("binds only an admitted physical row", () => {
    expect(bindEffectiveCreatureSoundSetsTwoDaToCreatureSoundSetFile({
      present: true,
      nativeType: "word",
      value: 2,
    }, table)).toEqual({
      present: true,
      nativeType: "word",
      value: 2,
      table: {
        ...table.descriptor,
        rowIndex: 2,
        resRef: "two_vo",
      },
    });
    expect(bindEffectiveCreatureSoundSetsTwoDaToCreatureSoundSetFile({
      present: true,
      nativeType: "word",
      value: 1,
    }, table)).toEqual({ present: true, nativeType: "word", value: 1 });
  });

  it.each([
    { present: true, nativeType: "byte", value: 2 },
    { present: true, nativeType: "word", value: -1 },
    { present: true, nativeType: "word", value: 65_536 },
    { present: true, nativeType: "word", value: 2, extra: true },
  ])("rejects malformed storage %#", (value) => {
    expect(readAreaCreatureSoundSetFileStorage(value)).toBeNull();
  });

  it("accepts one exact changed digest-bound mutation", () => {
    expect(readExistingAreaCreatureSoundSetFileMutation({
      expectedValue: 0,
      value: 2,
      tableSha256: table.descriptor.sha256,
      rowCount: table.descriptor.rowCount,
    })).toEqual({
      expectedValue: 0,
      value: 2,
      tableSha256: table.descriptor.sha256,
      rowCount: table.descriptor.rowCount,
    });
  });

  it.each([
    { expectedValue: 2, value: 2, tableSha256: "a".repeat(64), rowCount: 3 },
    { expectedValue: -1, value: 2, tableSha256: "a".repeat(64), rowCount: 3 },
    { expectedValue: 0, value: 65_536, tableSha256: "a".repeat(64), rowCount: 70_000 },
    { expectedValue: 0, value: 2, tableSha256: "invalid", rowCount: 3 },
    { expectedValue: 0, value: 3, tableSha256: "a".repeat(64), rowCount: 3 },
  ])("rejects invalid mutation %#", (value) => {
    expect(readExistingAreaCreatureSoundSetFileMutation(value)).toBeNull();
  });
});
