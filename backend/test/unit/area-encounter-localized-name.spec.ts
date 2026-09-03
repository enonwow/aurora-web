import {
  MAX_AREA_ENCOUNTER_LOCALIZED_NAME_ASCII_BYTES,
  buildAreaEncounterLocalizedNameInlineAsciiStorage,
  readAreaEncounterLocalizedNameInlineAsciiStorage,
  readExistingAreaEncounterLocalizedNameMutation,
} from "../../src/modules/areas/domain/area-encounter-localized-name";

describe("bounded existing Encounter LocalizedName mutation", () => {
  it("freezes the 256-byte product budget", () => {
    expect(MAX_AREA_ENCOUNTER_LOCALIZED_NAME_ASCII_BYTES).toBe(256);
  });

  it("admits only empty or one non-empty language-0 printable-ASCII inline entry", () => {
    expect(readAreaEncounterLocalizedNameInlineAsciiStorage({
      present: true,
      strRef: 0xffff_ffff,
      entries: [],
    })).toBe("");
    expect(readAreaEncounterLocalizedNameInlineAsciiStorage({
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "IEdub2xsIEFtYnVzaCA=" }],
    })).toBe(" Gnoll Ambush ");

    for (const rejected of [
      { present: false },
      { present: true, strRef: 91345, entries: [] },
      { present: true, strRef: 0xffff_ffff, entries: [{ languageId: 1, textBytesBase64: "QQ==" }] },
      { present: true, strRef: 0xffff_ffff, entries: [{ languageId: 0, textBytesBase64: "" }] },
      { present: true, strRef: 0xffff_ffff, entries: [{ languageId: 0, textBytesBase64: "Cg==" }] },
      { present: true, strRef: 0xffff_ffff, entries: [
        { languageId: 0, textBytesBase64: "QQ==" },
        { languageId: 0, textBytesBase64: "Qg==" },
      ] },
    ]) {
      expect(readAreaEncounterLocalizedNameInlineAsciiStorage(rejected)).toBeUndefined();
    }
  });

  it("builds exact storage without trimming, normalization, or TLK synthesis", () => {
    expect(buildAreaEncounterLocalizedNameInlineAsciiStorage("")).toEqual({
      present: true,
      strRef: 0xffff_ffff,
      entries: [],
    });
    expect(buildAreaEncounterLocalizedNameInlineAsciiStorage(" Gnoll Ambush ")).toEqual({
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "IEdub2xsIEFtYnVzaCA=" }],
    });
    expect(buildAreaEncounterLocalizedNameInlineAsciiStorage("Żółć")).toBeUndefined();
    expect(buildAreaEncounterLocalizedNameInlineAsciiStorage("A".repeat(257))).toBeUndefined();
  });

  it("reads and freezes one exact changed pair", () => {
    const value = readExistingAreaEncounterLocalizedNameMutation({
      expectedValue: "Gnoll Ambush",
      value: " Night Ambush ",
    });
    expect(value).toEqual({
      expectedValue: "Gnoll Ambush",
      value: " Night Ambush ",
    });
    expect(Object.isFrozen(value)).toBe(true);
  });

  it.each([
    ["missing", undefined],
    ["unknown key", { expectedValue: "A", value: "B", extra: true }],
    ["unchanged", { expectedValue: "A", value: "A" }],
    ["control byte", { expectedValue: "A", value: "A\nB" }],
    ["non-ASCII", { expectedValue: "A", value: "Ł" }],
    ["over budget", { expectedValue: "A", value: "B".repeat(257) }],
  ])("rejects a %s mutation", (_label, value) => {
    expect(readExistingAreaEncounterLocalizedNameMutation(value)).toBeNull();
  });
});
