import {
  AREA_CREATURE_NAME_LOCALIZED_STRING_MUTATION_FIELDS,
  MAX_AREA_CREATURE_FIRST_NAME_ASCII_BYTES,
  MAX_AREA_CREATURE_LAST_NAME_ASCII_BYTES,
  MAX_AREA_CREATURE_DESCRIPTION_ASCII_BYTES,
  areaCreatureLocalizedStringProfileForEntries,
  buildAreaCreatureNameInlineAsciiStorage,
  cloneAreaCreatureLocalizedStringEntries,
  readEditableAreaCreatureLocalizedStringStorage,
  readAreaCreatureNameInlineAsciiStorage,
  readExistingAreaCreatureNameLocalizedStringMutations,
} from "../../src/modules/areas/domain/area-creature-localized-string-mutation";

describe("bounded existing Creature FirstName/LastName/Description localized-string mutation", () => {
  it("freezes the exact native field order and independent product budgets", () => {
    expect(AREA_CREATURE_NAME_LOCALIZED_STRING_MUTATION_FIELDS).toEqual([
      { field: "FirstName", sourceKey: "firstName", targetKey: "firstName", maxBytes: 256 },
      { field: "LastName", sourceKey: "lastName", targetKey: "lastName", maxBytes: 256 },
      { field: "Description", sourceKey: "description", targetKey: "description", maxBytes: 4096 },
    ]);
    expect(MAX_AREA_CREATURE_FIRST_NAME_ASCII_BYTES).toBe(256);
    expect(MAX_AREA_CREATURE_LAST_NAME_ASCII_BYTES).toBe(256);
    expect(MAX_AREA_CREATURE_DESCRIPTION_ASCII_BYTES).toBe(4096);
    expect(Object.isFrozen(AREA_CREATURE_NAME_LOCALIZED_STRING_MUTATION_FIELDS)).toBe(true);
  });

  it("admits only empty or one non-empty language-0 printable-ASCII inline entry", () => {
    expect(readAreaCreatureNameInlineAsciiStorage({
      present: true,
      strRef: 0xffff_ffff,
      entries: [],
    }, 256)).toBe("");
    expect(readAreaCreatureNameInlineAsciiStorage({
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "IEd1YXJkIA==" }],
    }, 256)).toBe(" Guard ");

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
      expect(readAreaCreatureNameInlineAsciiStorage(rejected, 256)).toBeUndefined();
    }
  });

  it("builds exact storage without trimming, normalization, or field synthesis", () => {
    expect(buildAreaCreatureNameInlineAsciiStorage("", 256)).toEqual({
      present: true,
      strRef: 0xffff_ffff,
      entries: [],
    });
    expect(buildAreaCreatureNameInlineAsciiStorage(" Guard ", 256)).toEqual({
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "IEd1YXJkIA==" }],
    });
    expect(buildAreaCreatureNameInlineAsciiStorage("Żółć", 256)).toBeUndefined();
    expect(buildAreaCreatureNameInlineAsciiStorage("A".repeat(257), 256)).toBeUndefined();
  });

  it("admits complete ordered inline-ASCII lists and retains unknown source identifiers", () => {
    const storage = readEditableAreaCreatureLocalizedStringStorage({
      present: true,
      strRef: 0xffff_ffff,
      entries: [
        { languageId: 42, textBytesBase64: "TGVnYWN5" },
        { languageId: 0, textBytesBase64: "R3VhcmQ=" },
        { languageId: 10, textBytesBase64: "U3RyYXpuaWs=" },
      ],
    }, 256);

    expect(storage).toEqual({
      value: "Guard",
      profile: "multi_entry_inline_ascii",
      entries: [
        { languageId: 42, text: "Legacy" },
        { languageId: 0, text: "Guard" },
        { languageId: 10, text: "Straznik" },
      ],
    });
    expect(areaCreatureLocalizedStringProfileForEntries(storage!.entries))
      .toBe("multi_entry_inline_ascii");
    expect(cloneAreaCreatureLocalizedStringEntries(storage!.entries)).not.toBe(storage!.entries);
  });

  it("reads complete ordered entry-list CAS and admits only retained or catalog identifiers", () => {
    expect(readExistingAreaCreatureNameLocalizedStringMutations([{
      field: "FirstName",
      expectedValue: "Guard",
      value: "Captain",
      expectedProfile: "multi_entry_inline_ascii",
      expectedEntries: [
        { languageId: 42, text: "Legacy" },
        { languageId: 0, text: "Guard" },
      ],
      valueEntries: [
        { languageId: 0, text: "Captain" },
        { languageId: 2, text: "Capitaine" },
        { languageId: 42, text: "Legacy 2" },
      ],
    }])).toEqual([{
      field: "FirstName",
      expectedValue: "Guard",
      value: "Captain",
      expectedProfile: "multi_entry_inline_ascii",
      expectedEntries: [
        { languageId: 42, text: "Legacy" },
        { languageId: 0, text: "Guard" },
      ],
      valueEntries: [
        { languageId: 0, text: "Captain" },
        { languageId: 2, text: "Capitaine" },
        { languageId: 42, text: "Legacy 2" },
      ],
    }]);

    for (const valueEntries of [
      [{ languageId: 0, text: "Guard" }, { languageId: 41, text: "Unknown" }],
      [{ languageId: 2, text: "Capitaine" }],
      [{ languageId: 0, text: "Guard" }, { languageId: 2, text: "" }],
      [{ languageId: 0, text: "Guard" }, { languageId: 0, text: "Duplicate" }],
    ]) {
      expect(readExistingAreaCreatureNameLocalizedStringMutations([{
        field: "FirstName",
        expectedValue: "Guard",
        value: valueEntries.find((entry) => entry.languageId === 0)?.text ?? "",
        expectedProfile: "multi_entry_inline_ascii",
        expectedEntries: [
          { languageId: 42, text: "Legacy" },
          { languageId: 0, text: "Guard" },
        ],
        valueEntries,
      }])).toBeNull();
    }
  });

  it("reads and freezes changed pairs only in native FirstName, LastName, Description order", () => {
    const value = readExistingAreaCreatureNameLocalizedStringMutations([
      { field: "FirstName", expectedValue: "Guard", value: " Captain " },
      { field: "LastName", expectedValue: "", value: "Aribeth" },
      { field: "Description", expectedValue: "Old", value: "New description" },
    ]);

    expect(value).toEqual([
      { field: "FirstName", expectedValue: "Guard", value: " Captain " },
      { field: "LastName", expectedValue: "", value: "Aribeth" },
      { field: "Description", expectedValue: "Old", value: "New description" },
    ]);
    expect(Object.isFrozen(value)).toBe(true);
    expect(Object.isFrozen(value?.[0])).toBe(true);
  });

  it.each([
    ["empty", []],
    ["reordered", [
      { field: "LastName", expectedValue: "A", value: "B" },
      { field: "FirstName", expectedValue: "C", value: "D" },
    ]],
    ["duplicate", [
      { field: "FirstName", expectedValue: "A", value: "B" },
      { field: "FirstName", expectedValue: "B", value: "C" },
    ]],
    ["unknown field", [{ field: "Name", expectedValue: "A", value: "B" }]],
    ["unknown key", [{ field: "FirstName", expectedValue: "A", value: "B", extra: true }]],
    ["unchanged", [{ field: "FirstName", expectedValue: "A", value: "A" }]],
    ["control byte", [{ field: "FirstName", expectedValue: "A", value: "A\nB" }]],
    ["non-ASCII", [{ field: "LastName", expectedValue: "A", value: "Ł" }]],
    ["over budget", [{ field: "FirstName", expectedValue: "A", value: "B".repeat(257) }]],
    ["description over budget", [{
      field: "Description", expectedValue: "A", value: "B".repeat(4097),
    }]],
  ])("rejects a %s mutation list", (_label, value) => {
    expect(readExistingAreaCreatureNameLocalizedStringMutations(value)).toBeNull();
  });
});
