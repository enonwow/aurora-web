import {
  isExactEffectiveCreatureSoundSetsTwoDaTable,
  localizeEffectiveCreatureSoundSetsTwoDa,
  parseEffectiveCreatureSoundSetsTwoDa,
} from "../../src/modules/catalog/domain/effective-creature-sound-sets-two-da";

describe("effective Creature soundset.2da", () => {
  const source = [
    "2DA V2.0",
    "",
    "LABEL RESREF STRREF GENDER TYPE",
    "0 Aasimar c_aasimar 8291 0 4",
    "1 Custom custom_vo **** 1 4",
    "2 **** c_no_label **** 0 4",
    "3 Broken **** 9000 0 4",
    "4 MissingTlk c_missing 9999 0 4",
    "",
  ].join("\n");

  it("retains admitted sparse physical rows including row zero", () => {
    const result = parseEffectiveCreatureSoundSetsTwoDa({
      bytes: Buffer.from(source, "ascii"),
      sourceObjectKey: "runtime-source/vanilla/nwn_base.key/soundset.2da",
      sourceLayer: "vanilla",
      resolveStrRef: (strRef) => strRef === 8291 ? "Aasimar Voice" : undefined,
    });

    expect(result).toEqual({
      descriptor: {
        resourceName: "soundset.2da",
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/soundset.2da",
        sourceLayer: "vanilla",
        sha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
        sizeBytes: Buffer.byteLength(source, "ascii"),
        rowCount: 5,
      },
      rows: [
        {
          rowIndex: 0,
          displayName: "Aasimar Voice",
          displaySource: "strref",
          nameStrRef: 8291,
          resRef: "c_aasimar",
        },
        {
          rowIndex: 1,
          displayName: "Custom",
          displaySource: "label",
          nameStrRef: null,
          resRef: "custom_vo",
        },
        {
          rowIndex: 4,
          displayName: "StringRef 9999",
          displaySource: "strref_id",
          nameStrRef: 9999,
          resRef: "c_missing",
        },
      ],
    });
    expect(isExactEffectiveCreatureSoundSetsTwoDaTable(result)).toBe(true);
  });

  it("relocalizes positive StringRefs without replacing label fallbacks", () => {
    const table = parseEffectiveCreatureSoundSetsTwoDa({
      bytes: Buffer.from(source, "ascii"),
      sourceObjectKey: "x/soundset.2da",
      sourceLayer: "module",
      resolveStrRef: () => undefined,
    })!;

    expect(localizeEffectiveCreatureSoundSetsTwoDa(
      table,
      (strRef) => strRef === 9999 ? "Localized Missing" : undefined,
    ).rows).toEqual([
      expect.objectContaining({ rowIndex: 0, displayName: "StringRef 8291", displaySource: "strref_id" }),
      expect.objectContaining({ rowIndex: 1, displayName: "Custom", displaySource: "label" }),
      expect.objectContaining({ rowIndex: 4, displayName: "Localized Missing", displaySource: "strref" }),
    ]);
  });

  it.each([
    ["wrong version", source.replace("2DA V2.0", "2DA V1.0")],
    ["missing LABEL", source.replace("LABEL ", "TITLE ")],
    ["missing RESREF", source.replace("RESREF ", "RESOURCE ")],
    ["missing STRREF", source.replace("STRREF ", "NAME ")],
    ["missing GENDER", source.replace("GENDER ", "SEX ")],
    ["missing TYPE", source.replace("TYPE", "KIND")],
    ["duplicate RESREF", source.replace("LABEL RESREF", "RESREF RESREF")],
  ])("rejects %s", (_label, value) => {
    expect(parseEffectiveCreatureSoundSetsTwoDa({
      bytes: Buffer.from(value, "ascii"),
      sourceObjectKey: "x/soundset.2da",
      sourceLayer: "hak",
      resolveStrRef: () => undefined,
    })).toBeNull();
  });

  it("rejects malformed exact table objects", () => {
    const value = parseEffectiveCreatureSoundSetsTwoDa({
      bytes: Buffer.from(source, "ascii"),
      sourceObjectKey: "x/soundset.2da",
      sourceLayer: "module",
      resolveStrRef: () => undefined,
    })!;
    expect(isExactEffectiveCreatureSoundSetsTwoDaTable({ ...value, extra: true })).toBe(false);
    expect(isExactEffectiveCreatureSoundSetsTwoDaTable({
      ...value,
      rows: value.rows.map((row, index) => index === 1 ? { ...row, rowIndex: 0 } : row),
    })).toBe(false);
    expect(isExactEffectiveCreatureSoundSetsTwoDaTable({
      ...value,
      rows: value.rows.map((row, index) => index === 0 ? { ...row, resRef: "bad-ref" } : row),
    })).toBe(false);
  });
});
