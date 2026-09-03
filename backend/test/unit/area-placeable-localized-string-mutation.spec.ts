import {
  AREA_PLACEABLE_LOCALIZED_STRING_MUTATION_FIELDS,
  MAX_AREA_PLACEABLE_DESCRIPTION_ASCII_BYTES,
  MAX_AREA_PLACEABLE_LOC_NAME_ASCII_BYTES,
  buildAreaPlaceableInlineAsciiStorage,
  readAreaPlaceableInlineAsciiStorage,
  readExistingAreaPlaceableLocalizedStringMutations,
} from "../../src/modules/areas/domain/area-placeable-localized-string-mutation";

describe("bounded existing Placeable localized-string mutation", () => {
  it("freezes the exact native field order and product byte budgets", () => {
    expect(AREA_PLACEABLE_LOCALIZED_STRING_MUTATION_FIELDS).toEqual([
      { field: "LocName", sourceKey: "locName", targetKey: "localizedName", maxBytes: 256 },
      { field: "Description", sourceKey: "description", targetKey: "description", maxBytes: 4096 },
    ]);
    expect(MAX_AREA_PLACEABLE_LOC_NAME_ASCII_BYTES).toBe(256);
    expect(MAX_AREA_PLACEABLE_DESCRIPTION_ASCII_BYTES).toBe(4096);
    expect(Object.isFrozen(AREA_PLACEABLE_LOCALIZED_STRING_MUTATION_FIELDS)).toBe(true);
  });

  it.each([
    [{ present: true, strRef: 0xffff_ffff, entries: [] }, 256, ""],
    [{
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "Q2hlc3Q=" }],
    }, 256, "Chest"],
    [{
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: Buffer.from("~".repeat(256), "ascii").toString("base64") }],
    }, 256, "~".repeat(256)],
  ])("admits exact inline language-0 printable ASCII storage", (storage, maxBytes, expected) => {
    expect(readAreaPlaceableInlineAsciiStorage(storage, maxBytes)).toBe(expected);
  });

  it.each([
    ["absent", { present: false }],
    ["null", null],
    ["array", []],
    ["primitive", 7],
    ["function-shaped storage impostor", Object.assign(() => undefined, {
      present: true,
      strRef: 0xffff_ffff,
      entries: [],
    })],
    ["missing storage member", { present: true, strRef: 0xffff_ffff }],
    ["false exact discriminator", {
      present: false,
      strRef: 0xffff_ffff,
      entries: [],
    }],
    ["TLK backed", { present: true, strRef: 1, entries: [] }],
    ["extra storage key", { present: true, strRef: 0xffff_ffff, entries: [], extra: true }],
    ["multiple entries", {
      present: true,
      strRef: 0xffff_ffff,
      entries: [
        { languageId: 0, textBytesBase64: "QQ==" },
        { languageId: 0, textBytesBase64: "Qg==" },
      ],
    }],
    ["nonzero identifier", {
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 1, textBytesBase64: "QQ==" }],
    }],
    ["null entry", {
      present: true,
      strRef: 0xffff_ffff,
      entries: [null],
    }],
    ["array entry", {
      present: true,
      strRef: 0xffff_ffff,
      entries: [[]],
    }],
    ["entry missing text", {
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0 }],
    }],
    ["entry extra key", {
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "QQ==", extra: true }],
    }],
    ["non-string base64 impostor", {
      present: true,
      strRef: 0xffff_ffff,
      entries: [{
        languageId: 0,
        textBytesBase64: { length: 4, toString: (): string => "QQ==" },
      }],
    }],
    ["null base64", {
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: null }],
    }],
    ["explicit empty entry", {
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "" }],
    }],
    ["control byte", {
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "Cg==" }],
    }],
    ["DEL", {
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "fw==" }],
    }],
    ["non-ASCII", {
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "xIU=" }],
    }],
    ["non-canonical base64", {
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "QR==" }],
    }],
    ["unanchored base64 prefix", {
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "QQ==junk" }],
    }],
    ["unanchored base64 suffix", {
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "junkQQ==" }],
    }],
    ["invalid base64 quartet", {
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "Q" }],
    }],
    ["over budget", {
      present: true,
      strRef: 0xffff_ffff,
      entries: [{
        languageId: 0,
        textBytesBase64: Buffer.from("A".repeat(257), "ascii").toString("base64"),
      }],
    }],
  ])("rejects %s storage", (_label, storage) => {
    expect(readAreaPlaceableInlineAsciiStorage(storage, 256)).toBeUndefined();
  });

  it("builds the exact native empty-or-one-entry storage without normalizing text", () => {
    expect(buildAreaPlaceableInlineAsciiStorage("", 256)).toEqual({
      present: true,
      strRef: 0xffff_ffff,
      entries: [],
    });
    expect(buildAreaPlaceableInlineAsciiStorage(" Chest ", 256)).toEqual({
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "IENoZXN0IA==" }],
    });
    expect(buildAreaPlaceableInlineAsciiStorage("A".repeat(257), 256)).toBeUndefined();
    expect(buildAreaPlaceableInlineAsciiStorage("Zażółć", 256)).toBeUndefined();
    expect(buildAreaPlaceableInlineAsciiStorage(7, 256)).toBeUndefined();
    expect(buildAreaPlaceableInlineAsciiStorage({ length: 1, toString: (): string => "A" }, 1))
      .toBeUndefined();
    expect(buildAreaPlaceableInlineAsciiStorage("", Number.NaN)).toBeUndefined();
    expect(buildAreaPlaceableInlineAsciiStorage("", 1.5)).toBeUndefined();
    expect(buildAreaPlaceableInlineAsciiStorage("", -1)).toBeUndefined();
    expect(buildAreaPlaceableInlineAsciiStorage("", 0)).toEqual({
      present: true,
      strRef: 0xffff_ffff,
      entries: [],
    });
    expect(buildAreaPlaceableInlineAsciiStorage("A", 0)).toBeUndefined();
    expect(readAreaPlaceableInlineAsciiStorage({
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "IH4=" }],
    }, 2)).toBe(" ~");
  });

  it("reads and freezes exact changed pairs in native order", () => {
    const value = readExistingAreaPlaceableLocalizedStringMutations([
      { field: "LocName", expectedValue: "Chest", value: " Chest " },
      { field: "Description", expectedValue: "Storage", value: "Storage room" },
    ]);
    expect(value).toEqual([
      { field: "LocName", expectedValue: "Chest", value: " Chest " },
      { field: "Description", expectedValue: "Storage", value: "Storage room" },
    ]);
    expect(Object.isFrozen(value)).toBe(true);
    expect(Object.isFrozen(value?.[0])).toBe(true);
  });

  it.each([
    ["non-array", {}],
    ["empty", []],
    ["over-count", [
      { field: "LocName", expectedValue: "A", value: "B" },
      { field: "Description", expectedValue: "A", value: "B" },
      { field: "Description", expectedValue: "B", value: "C" },
    ]],
    ["wrong order", [
      { field: "Description", expectedValue: "A", value: "B" },
      { field: "LocName", expectedValue: "A", value: "B" },
    ]],
    ["duplicate", [
      { field: "LocName", expectedValue: "A", value: "B" },
      { field: "LocName", expectedValue: "B", value: "C" },
    ]],
    ["unknown field", [{ field: "LocalizedName", expectedValue: "A", value: "B" }]],
    ["unknown key", [{ field: "LocName", expectedValue: "A", value: "B", extra: true }]],
    ["missing expected", [{ field: "LocName", value: "B" }]],
    ["missing target", [{ field: "LocName", expectedValue: "A" }]],
    ["unchanged", [{ field: "LocName", expectedValue: "A", value: "A" }]],
    ["control target", [{ field: "Description", expectedValue: "A", value: "A\nB" }]],
    ["non-ASCII target", [{ field: "LocName", expectedValue: "A", value: "Ą" }]],
    ["name over budget", [{ field: "LocName", expectedValue: "A", value: "B".repeat(257) }]],
    ["description over budget", [{ field: "Description", expectedValue: "A", value: "B".repeat(4097) }]],
  ])("rejects a %s mutation list", (_label, value) => {
    expect(readExistingAreaPlaceableLocalizedStringMutations(value)).toBeNull();
  });
});
