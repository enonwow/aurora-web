import { describe, expect, it } from "vitest";
import {
  MAX_ITEM_DESCRIPTION_ASCII_BYTES,
  MAX_ITEM_IDENTIFIED_DESCRIPTION_ASCII_BYTES,
  MAX_ITEM_LOCALIZED_NAME_ASCII_BYTES,
  cloneEditableItemLocalizedStringEntries,
  cloneItemLocalizedStrings,
  readEditableItemLocalizedStringStorage,
  isItemLocalizedStringInlineAsciiText,
  readItemLocalizedStringInlineAsciiStorage,
  readItemLocalizedStrings,
} from "../../../../../src/modules/scene/domain/itemLocalizedStrings";

describe("Item localized-string exact storage provenance", () => {
  it("validates and detaches the complete presence-sensitive triple", () => {
    const source = {
      localizedName: {
        present: true as const,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "U3dvcmQ=" }],
      },
      description: { present: false as const },
      identifiedDescription: {
        present: true as const,
        strRef: 0xffff_ffff,
        entries: [],
      },
    };

    const parsed = readItemLocalizedStrings(source);
    expect(parsed).toEqual(source);
    expect(parsed).not.toBe(source);
    expect(parsed?.localizedName).not.toBe(source.localizedName);
    expect(parsed?.localizedName.present && parsed.localizedName.entries)
      .not.toBe(source.localizedName.entries);

    const clone = parsed && cloneItemLocalizedStrings(parsed);
    expect(clone).toEqual(source);
    expect(clone).not.toBe(parsed);
    expect(clone?.identifiedDescription).not.toBe(parsed?.identifiedDescription);
  });

  it("admits the audited empty-or-one-entry inline ASCII profile and budgets", () => {
    expect(MAX_ITEM_LOCALIZED_NAME_ASCII_BYTES).toBe(256);
    expect(MAX_ITEM_DESCRIPTION_ASCII_BYTES).toBe(4_096);
    expect(MAX_ITEM_IDENTIFIED_DESCRIPTION_ASCII_BYTES).toBe(4_096);
    expect(readItemLocalizedStringInlineAsciiStorage({
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "IFN3b3JkIA==" }],
    }, MAX_ITEM_LOCALIZED_NAME_ASCII_BYTES)).toBe(" Sword ");
    expect(readItemLocalizedStringInlineAsciiStorage({
      present: true,
      strRef: 0xffff_ffff,
      entries: [],
    }, MAX_ITEM_DESCRIPTION_ASCII_BYTES)).toBe("");
    expect(readItemLocalizedStringInlineAsciiStorage({
      present: true,
      strRef: 7,
      entries: [],
    }, MAX_ITEM_IDENTIFIED_DESCRIPTION_ASCII_BYTES)).toBeUndefined();
    expect(isItemLocalizedStringInlineAsciiText(" exact target ", 256)).toBe(true);
    expect(isItemLocalizedStringInlineAsciiText("Żółć", 256)).toBe(false);
  });

  it("decodes a complete ordered inline-ASCII list without discarding source identifiers", () => {
    const storage = readEditableItemLocalizedStringStorage({
      present: true,
      strRef: 0xffff_ffff,
      entries: [
        { languageId: 42, textBytesBase64: "TGVnYWN5" },
        { languageId: 0, textBytesBase64: "U3dvcmQ=" },
        { languageId: 10, textBytesBase64: "TWllY3o=" },
      ],
    }, MAX_ITEM_LOCALIZED_NAME_ASCII_BYTES);

    expect(storage).toEqual({
      value: "Sword",
      profile: "multi_entry_inline_ascii",
      entries: [
        { languageId: 42, text: "Legacy" },
        { languageId: 0, text: "Sword" },
        { languageId: 10, text: "Miecz" },
      ],
    });
    expect(cloneEditableItemLocalizedStringEntries(storage!.entries)).not.toBe(storage!.entries);
  });

  it("rejects malformed or incomplete triples without inventing provenance", () => {
    const valid = {
      localizedName: { present: true, strRef: 0xffff_ffff, entries: [] },
      description: { present: true, strRef: 0xffff_ffff, entries: [] },
      identifiedDescription: { present: false },
    };
    expect(readItemLocalizedStrings({ ...valid, extra: true })).toBeUndefined();
    expect(readItemLocalizedStrings({
      localizedName: valid.localizedName,
      description: valid.description,
    })).toBeUndefined();
    expect(readItemLocalizedStrings({ ...valid, description: null })).toBeUndefined();
  });
});
