import {
  MAX_AREA_TRIGGER_LOCALIZED_NAME_ASCII_BYTES,
  buildAreaTriggerLocalizedNameInlineAsciiStorage,
  readAreaTriggerLocalizedNameInlineAsciiStorage,
  readExistingAreaTriggerLocalizedNameMutation,
} from "../../src/modules/areas/domain/area-trigger-localized-name";

describe("bounded existing Trigger LocalizedName mutation", () => {
  it("freezes the 256-byte product budget", () => {
    expect(MAX_AREA_TRIGGER_LOCALIZED_NAME_ASCII_BYTES).toBe(256);
  });

  it("admits only empty or one non-empty language-0 printable-ASCII inline entry", () => {
    expect(readAreaTriggerLocalizedNameInlineAsciiStorage({
      present: true,
      strRef: 0xffff_ffff,
      entries: [],
    })).toBe("");
    expect(readAreaTriggerLocalizedNameInlineAsciiStorage({
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "IEdhdGUgVHJpZ2dlciA=" }],
    })).toBe(" Gate Trigger ");

    for (const rejected of [
      { present: false },
      { present: true, strRef: 14759, entries: [] },
      { present: true, strRef: 0xffff_ffff, entries: [{ languageId: 1, textBytesBase64: "QQ==" }] },
      { present: true, strRef: 0xffff_ffff, entries: [{ languageId: 0, textBytesBase64: "" }] },
      { present: true, strRef: 0xffff_ffff, entries: [{ languageId: 0, textBytesBase64: "Cg==" }] },
      { present: true, strRef: 0xffff_ffff, entries: [
        { languageId: 0, textBytesBase64: "QQ==" },
        { languageId: 0, textBytesBase64: "Qg==" },
      ] },
    ]) {
      expect(readAreaTriggerLocalizedNameInlineAsciiStorage(rejected)).toBeUndefined();
    }
  });

  it("builds exact storage without trimming, normalization, or TLK synthesis", () => {
    expect(buildAreaTriggerLocalizedNameInlineAsciiStorage("")).toEqual({
      present: true,
      strRef: 0xffff_ffff,
      entries: [],
    });
    expect(buildAreaTriggerLocalizedNameInlineAsciiStorage(" Gate Trigger ")).toEqual({
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "IEdhdGUgVHJpZ2dlciA=" }],
    });
    expect(buildAreaTriggerLocalizedNameInlineAsciiStorage("Żółć")).toBeUndefined();
    expect(buildAreaTriggerLocalizedNameInlineAsciiStorage("A".repeat(257))).toBeUndefined();
  });

  it("reads and freezes one exact changed pair", () => {
    const value = readExistingAreaTriggerLocalizedNameMutation({
      expectedValue: "Gate Trigger",
      value: " Inner Gate Trigger ",
    });
    expect(value).toEqual({
      expectedValue: "Gate Trigger",
      value: " Inner Gate Trigger ",
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
    expect(readExistingAreaTriggerLocalizedNameMutation(value)).toBeNull();
  });
});
