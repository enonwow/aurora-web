import {
  AREA_ITEM_LOCALIZED_STRING_MUTATION_FIELDS,
  MAX_AREA_ITEM_DESCRIPTION_ASCII_BYTES,
  MAX_AREA_ITEM_IDENTIFIED_DESCRIPTION_ASCII_BYTES,
  MAX_AREA_ITEM_LOCALIZED_NAME_ASCII_BYTES,
  buildAreaItemInlineAsciiStorage,
  readAreaItemInlineAsciiStorage,
  readExistingAreaItemLocalizedStringMutations,
} from "../../src/modules/areas/domain/area-item-localized-string-mutation";

describe("bounded existing ground-Item localized-string mutation", () => {
  it("freezes exact native writer order and independent product budgets", () => {
    expect(AREA_ITEM_LOCALIZED_STRING_MUTATION_FIELDS).toEqual([
      { field: "LocalizedName", sourceKey: "localizedName", targetKey: "localizedName", maxBytes: 256 },
      { field: "Description", sourceKey: "description", targetKey: "description", maxBytes: 4096 },
      {
        field: "DescIdentified",
        sourceKey: "identifiedDescription",
        targetKey: "identifiedDescription",
        maxBytes: 4096,
      },
    ]);
    expect(MAX_AREA_ITEM_LOCALIZED_NAME_ASCII_BYTES).toBe(256);
    expect(MAX_AREA_ITEM_DESCRIPTION_ASCII_BYTES).toBe(4096);
    expect(MAX_AREA_ITEM_IDENTIFIED_DESCRIPTION_ASCII_BYTES).toBe(4096);
    expect(Object.isFrozen(AREA_ITEM_LOCALIZED_STRING_MUTATION_FIELDS)).toBe(true);
  });

  it("admits only empty or one non-empty language-0 printable-ASCII inline entry", () => {
    expect(readAreaItemInlineAsciiStorage({
      present: true,
      strRef: 0xffff_ffff,
      entries: [],
    }, 256)).toBe("");
    expect(readAreaItemInlineAsciiStorage({
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "IFN3b3JkIA==" }],
    }, 256)).toBe(" Sword ");

    for (const rejected of [
      { present: false },
      { present: true, strRef: 7, entries: [] },
      { present: true, strRef: 0xffff_ffff, entries: [{ languageId: 1, textBytesBase64: "QQ==" }] },
      { present: true, strRef: 0xffff_ffff, entries: [{ languageId: 0, textBytesBase64: "" }] },
      { present: true, strRef: 0xffff_ffff, entries: [{ languageId: 0, textBytesBase64: "Cg==" }] },
      { present: true, strRef: 0xffff_ffff, entries: [{ languageId: 0, textBytesBase64: "xIU=" }] },
      { present: true, strRef: 0xffff_ffff, entries: [
        { languageId: 0, textBytesBase64: "QQ==" },
        { languageId: 0, textBytesBase64: "Qg==" },
      ] },
    ]) {
      expect(readAreaItemInlineAsciiStorage(rejected, 256)).toBeUndefined();
    }
  });

  it("builds exact storage without trimming, normalization, or field synthesis", () => {
    expect(buildAreaItemInlineAsciiStorage("", 256)).toEqual({
      present: true,
      strRef: 0xffff_ffff,
      entries: [],
    });
    expect(buildAreaItemInlineAsciiStorage(" Sword ", 256)).toEqual({
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "IFN3b3JkIA==" }],
    });
    expect(buildAreaItemInlineAsciiStorage("Żółć", 256)).toBeUndefined();
    expect(buildAreaItemInlineAsciiStorage("A".repeat(257), 256)).toBeUndefined();
  });

  it("reads and freezes changed pairs only in native writer order", () => {
    const value = readExistingAreaItemLocalizedStringMutations([
      { field: "LocalizedName", expectedValue: "Sword", value: " Sword 2 " },
      { field: "Description", expectedValue: "", value: "Unknown blade" },
      { field: "DescIdentified", expectedValue: "Old", value: "Known blade" },
    ]);

    expect(value).toEqual([
      { field: "LocalizedName", expectedValue: "Sword", value: " Sword 2 " },
      { field: "Description", expectedValue: "", value: "Unknown blade" },
      { field: "DescIdentified", expectedValue: "Old", value: "Known blade" },
    ]);
    expect(Object.isFrozen(value)).toBe(true);
    expect(Object.isFrozen(value?.[0])).toBe(true);
  });

  it.each([
    ["empty", []],
    ["reordered", [
      { field: "Description", expectedValue: "A", value: "B" },
      { field: "LocalizedName", expectedValue: "C", value: "D" },
    ]],
    ["duplicate", [
      { field: "LocalizedName", expectedValue: "A", value: "B" },
      { field: "LocalizedName", expectedValue: "B", value: "C" },
    ]],
    ["unknown field", [{ field: "LocName", expectedValue: "A", value: "B" }]],
    ["unknown key", [{ field: "LocalizedName", expectedValue: "A", value: "B", extra: true }]],
    ["unchanged", [{ field: "LocalizedName", expectedValue: "A", value: "A" }]],
    ["control byte", [{ field: "Description", expectedValue: "A", value: "A\nB" }]],
    ["non-ASCII", [{ field: "DescIdentified", expectedValue: "A", value: "Ł" }]],
    ["name over budget", [{ field: "LocalizedName", expectedValue: "A", value: "B".repeat(257) }]],
    ["description over budget", [{ field: "Description", expectedValue: "A", value: "B".repeat(4097) }]],
    ["identified description over budget", [{
      field: "DescIdentified",
      expectedValue: "A",
      value: "B".repeat(4097),
    }]],
  ])("rejects a %s mutation list", (_label, value) => {
    expect(readExistingAreaItemLocalizedStringMutations(value)).toBeNull();
  });
});
