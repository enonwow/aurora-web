import { describe, expect, it } from "vitest";
import {
  isPlaceableInlineAsciiText,
  MAX_PLACEABLE_DESCRIPTION_ASCII_BYTES,
  MAX_PLACEABLE_LOC_NAME_ASCII_BYTES,
  readPlaceableInlineAsciiStorage,
  readPlaceableLocalizedStrings,
} from "../../../../../src/modules/scene/domain/placeableLocalizedStrings";

function exactValue() {
  return {
    locName: {
      present: true,
      strRef: 0xffff_ffff,
      entries: [
        { languageId: 0, textBytesBase64: "Q2hlc3Q=" },
        { languageId: 0, textBytesBase64: "" },
      ],
    },
    description: {
      present: true,
      strRef: 0,
      entries: [{ languageId: 0xffff_ffff, textBytesBase64: "gP8=" }],
    },
  };
}

describe("placeable localized-string storage provenance", () => {
  it("decodes only the admitted inline-English ASCII LocName and Description profile", () => {
    expect(readPlaceableInlineAsciiStorage({
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "Q2hlc3Q=" }],
    }, MAX_PLACEABLE_LOC_NAME_ASCII_BYTES)).toBe("Chest");
    expect(readPlaceableInlineAsciiStorage({
      present: true,
      strRef: 0xffff_ffff,
      entries: [],
    }, MAX_PLACEABLE_DESCRIPTION_ASCII_BYTES)).toBe("");
    expect(isPlaceableInlineAsciiText(" Chest 2 ", MAX_PLACEABLE_LOC_NAME_ASCII_BYTES)).toBe(true);
    expect(isPlaceableInlineAsciiText("", MAX_PLACEABLE_DESCRIPTION_ASCII_BYTES)).toBe(true);
  });

  it.each([
    ["absent", { present: false }],
    ["TLK-backed", { present: true, strRef: 1, entries: [] }],
    ["two entries", {
      present: true,
      strRef: 0xffff_ffff,
      entries: [
        { languageId: 0, textBytesBase64: "QQ==" },
        { languageId: 0, textBytesBase64: "Qg==" },
      ],
    }],
    ["non-English language id", {
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 2, textBytesBase64: "QQ==" }],
    }],
    ["explicit empty entry", {
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "" }],
    }],
    ["non-ASCII byte", {
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "gA==" }],
    }],
  ])("rejects %s storage from the editable profile", (_label, storage) => {
    expect(readPlaceableInlineAsciiStorage(
      storage,
      MAX_PLACEABLE_DESCRIPTION_ASCII_BYTES,
    )).toBeUndefined();
  });

  it("enforces exact printable ASCII and independent byte budgets", () => {
    expect(isPlaceableInlineAsciiText(1, MAX_PLACEABLE_DESCRIPTION_ASCII_BYTES)).toBe(false);
    expect(isPlaceableInlineAsciiText({ length: 1, toString: () => "A" }, 1)).toBe(false);
    expect(isPlaceableInlineAsciiText("", Number.NaN)).toBe(false);
    expect(isPlaceableInlineAsciiText("", 1.5)).toBe(false);
    expect(isPlaceableInlineAsciiText("", -1)).toBe(false);
    expect(isPlaceableInlineAsciiText("", 0)).toBe(true);
    expect(isPlaceableInlineAsciiText("x", 0)).toBe(false);
    expect(isPlaceableInlineAsciiText("\n", MAX_PLACEABLE_DESCRIPTION_ASCII_BYTES)).toBe(false);
    expect(isPlaceableInlineAsciiText("Żółć", MAX_PLACEABLE_DESCRIPTION_ASCII_BYTES)).toBe(false);
    expect(isPlaceableInlineAsciiText("x".repeat(257), MAX_PLACEABLE_LOC_NAME_ASCII_BYTES)).toBe(false);
    expect(isPlaceableInlineAsciiText("x".repeat(4097), MAX_PLACEABLE_DESCRIPTION_ASCII_BYTES)).toBe(false);
    expect(isPlaceableInlineAsciiText("x".repeat(256), MAX_PLACEABLE_LOC_NAME_ASCII_BYTES)).toBe(true);
    expect(isPlaceableInlineAsciiText("x".repeat(4096), MAX_PLACEABLE_DESCRIPTION_ASCII_BYTES)).toBe(true);

    const storage = (bytes: Uint8Array) => ({
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: Buffer.from(bytes).toString("base64") }],
    });
    expect(readPlaceableInlineAsciiStorage(storage(Uint8Array.of(0x20, 0x7e)), 2)).toBe(" ~");
    expect(readPlaceableInlineAsciiStorage(storage(Uint8Array.of(0x1f)), 1)).toBeUndefined();
    expect(readPlaceableInlineAsciiStorage(storage(Uint8Array.of(0x7f)), 1)).toBeUndefined();
    expect(readPlaceableInlineAsciiStorage(storage(new Uint8Array(256).fill(0x41)), 256))
      .toBe("A".repeat(256));
    expect(readPlaceableInlineAsciiStorage(storage(new Uint8Array(257).fill(0x41)), 256))
      .toBeUndefined();
    expect(readPlaceableInlineAsciiStorage(storage(Uint8Array.of(0x41)), 0)).toBeUndefined();
    expect(readPlaceableInlineAsciiStorage(storage(Uint8Array.of(0x41)), -1)).toBeUndefined();
    expect(readPlaceableInlineAsciiStorage(storage(Uint8Array.of(0x41)), 1.5)).toBeUndefined();
    expect(readPlaceableInlineAsciiStorage({
      present: true,
      strRef: 0xffff_ffff,
      entries: [],
    }, 0)).toBe("");
    expect(readPlaceableInlineAsciiStorage({
      present: true,
      strRef: 0xffff_ffff,
      entries: [],
    }, -1)).toBeUndefined();
  });

  it("accepts exact raw bytes, unsigned identifiers, duplicates, order, and empty entries", () => {
    const source = exactValue();
    const parsed = readPlaceableLocalizedStrings(source);

    expect(parsed).toEqual(source);
    expect(parsed).not.toBe(source);
    expect(parsed?.locName).not.toBe(source.locName);
    expect(parsed?.locName.present && parsed.locName.entries).not.toBe(source.locName.entries);
    expect(parsed?.locName.present && parsed.locName.entries[0]).not.toBe(source.locName.entries[0]);

    const unpadded = exactValue();
    unpadded.description.entries[0].textBytesBase64 = "AABA";
    expect(readPlaceableLocalizedStrings(unpadded)?.description).toEqual(unpadded.description);
  });

  it("rejects a non-string base64 impostor even when coercion resembles canonical base64", () => {
    const candidate = exactValue();
    candidate.description.entries[0].textBytesBase64 = {
      length: 4,
      endsWith: () => false,
      toString: () => "AAAA",
    } as unknown as string;

    expect(readPlaceableLocalizedStrings(candidate)).toBeUndefined();
  });

  it("preserves exact absent versus present-empty storage", () => {
    expect(readPlaceableLocalizedStrings({
      locName: { present: false },
      description: { present: true, strRef: 0xffff_ffff, entries: [] },
    })).toEqual({
      locName: { present: false },
      description: { present: true, strRef: 0xffff_ffff, entries: [] },
    });
  });

  it("accepts all canonical padding forms and exact entry/count/aggregate boundaries", () => {
    const entries = Array.from({ length: 64 }, (_, languageId) => ({
      languageId,
      textBytesBase64: languageId < 4
        ? Buffer.alloc(16_384, languageId).toString("base64")
        : "",
    }));
    const parsed = readPlaceableLocalizedStrings({
      locName: {
        present: true,
        strRef: 0,
        entries,
      },
      description: {
        present: true,
        strRef: 1,
        entries: [
          { languageId: 0, textBytesBase64: "AA==" },
          { languageId: 1, textBytesBase64: "AAA=" },
          { languageId: 2, textBytesBase64: "AAAA" },
        ],
      },
    });

    expect(parsed?.locName.present && parsed.locName.entries).toHaveLength(64);
    expect(parsed?.description.present && parsed.description.entries.map(
      (entry) => entry.textBytesBase64,
    )).toEqual(["AA==", "AAA=", "AAAA"]);
  });

  it("rejects unknown keys and malformed discriminated members fail-closed", () => {
    const mutations: Array<(candidate: any) => void> = [
      (candidate) => { candidate.extra = true; },
      (candidate) => { delete candidate.description; },
      (candidate) => { candidate.locName.extra = true; },
      (candidate) => { candidate.locName.present = false; },
      (candidate) => { candidate.description = null; },
      (candidate) => { candidate.description.present = "true"; },
      (candidate) => { candidate.description.strRef = -1; },
      (candidate) => { candidate.description.strRef = 0x1_0000_0000; },
      (candidate) => { candidate.description.strRef = 1.5; },
      (candidate) => { candidate.description.entries = {}; },
      (candidate) => { candidate.description.entries[0].extra = true; },
      (candidate) => { candidate.description.entries[0].languageId = -1; },
      (candidate) => { candidate.description.entries[0].languageId = 0x1_0000_0000; },
      (candidate) => { candidate.description.entries[0].languageId = 1.5; },
      (candidate) => { candidate.description.entries[0].textBytesBase64 = 1; },
      (candidate) => { candidate.description.entries[0].textBytesBase64 = "A"; },
      (candidate) => { candidate.description.entries[0].textBytesBase64 = "===="; },
      (candidate) => { candidate.description.entries[0].textBytesBase64 = "Q2hlc3Q"; },
      (candidate) => { candidate.description.entries[0].textBytesBase64 = "@AAA"; },
      (candidate) => { candidate.description.entries[0].textBytesBase64 = "AAA@"; },
      (candidate) => { candidate.description.entries[0].textBytesBase64 = "AA==AAAA"; },
      (candidate) => { candidate.description.entries[0].textBytesBase64 = "AB=="; },
      (candidate) => { candidate.description.entries[0].textBytesBase64 = "AAB="; },
      (candidate) => { candidate.description.entries[0].textBytesBase64 = "AA==\n"; },
      (candidate) => { candidate.description.entries = Array.from({ length: 65 }, () => ({ languageId: 0, textBytesBase64: "" })); },
      (candidate) => { candidate.description.entries[0].textBytesBase64 = Buffer.alloc(16_385).toString("base64"); },
      (candidate) => {
        candidate.description.entries = [
          ...Array.from({ length: 4 }, () => ({
            languageId: 0,
            textBytesBase64: Buffer.alloc(16_384).toString("base64"),
          })),
          { languageId: 0, textBytesBase64: "AA==" },
        ];
      },
    ];

    for (const mutate of mutations) {
      const candidate = structuredClone(exactValue());
      mutate(candidate);
      expect(readPlaceableLocalizedStrings(candidate)).toBeUndefined();
    }
  });
});
