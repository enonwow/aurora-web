import {
  bindEffectiveCreaturePortraitsTwoDaToCreaturePortrait,
  readAreaCreaturePortraitStorage,
  readExistingAreaCreaturePortraitMutation,
} from "../../src/modules/areas/domain/area-creature-portrait";
import { parseEffectiveCreaturePortraitsTwoDa } from
  "../../src/modules/catalog/domain/effective-creature-portraits-two-da";

describe("Existing Area Creature PortraitId mutation", () => {
  const table = parseEffectiveCreaturePortraitsTwoDa({
    bytes: Buffer.from([
      "2DA V2.0",
      "",
      "BaseResRef Sex Race Plot",
      "0 hu_m_01 0 6 0",
      "1 el_m_01 0 1 0",
      "2 hu_f_01 1 6 0",
    ].join("\n"), "ascii"),
    sourceObjectKey: "x/portraits.2da",
    sourceLayer: "module",
  })!;

  const validMutation = {
    expectedValue: 0,
    value: 1,
    tableSha256: table.descriptor.sha256,
    rowCount: table.descriptor.rowCount,
    genderExpectedValue: 0,
    raceExpectedValue: 4,
  };

  it("retains exact Word storage and binds only with exact selector context", () => {
    const source = readAreaCreaturePortraitStorage({
      present: true,
      nativeType: "word",
      value: 0,
      selectorContext: { genderValue: 0, raceValue: 4 },
    });
    const bound = bindEffectiveCreaturePortraitsTwoDaToCreaturePortrait(source!, table);
    expect(bound).toEqual({
      ...source,
      table: {
        ...table.descriptor,
        rowIndex: 0,
        baseResRef: "hu_m_01",
      },
    });
    expect(readAreaCreaturePortraitStorage(bound)).toEqual(bound);
  });

  it("keeps canonical PortraitId preserve-only when context or row admission is unavailable", () => {
    const noContext = readAreaCreaturePortraitStorage({
      present: true,
      nativeType: "word",
      value: 0,
    })!;
    expect(bindEffectiveCreaturePortraitsTwoDaToCreaturePortrait(noContext, table))
      .toEqual(noContext);
    const wrongSex = readAreaCreaturePortraitStorage({
      present: true,
      nativeType: "word",
      value: 2,
      selectorContext: { genderValue: 0, raceValue: 6 },
    })!;
    expect(bindEffectiveCreaturePortraitsTwoDaToCreaturePortrait(wrongSex, table))
      .toEqual(wrongSex);
  });

  it("accepts only one exact changed catalog- and context-bound pair", () => {
    expect(readExistingAreaCreaturePortraitMutation(validMutation)).toEqual(validMutation);
    for (const value of [
      { ...validMutation, value: 0 },
      { ...validMutation, value: 3 },
      { ...validMutation, genderExpectedValue: 0x100 },
      { ...validMutation, raceExpectedValue: -1 },
      { ...validMutation, tableSha256: "A".repeat(64) },
      { ...validMutation, extra: true },
    ]) expect(readExistingAreaCreaturePortraitMutation(value)).toBeNull();
  });

  it.each([
    { present: true, nativeType: "dword", value: 0 },
    { present: true, nativeType: "word", value: -1 },
    { present: true, nativeType: "word", value: 0x1_0000 },
    { present: true, nativeType: "word", value: 0, selectorContext: { genderValue: 0 } },
    { present: false, value: 0 },
  ])("rejects malformed exact storage %#", (value) => {
    expect(readAreaCreaturePortraitStorage(value)).toBeNull();
  });
});
