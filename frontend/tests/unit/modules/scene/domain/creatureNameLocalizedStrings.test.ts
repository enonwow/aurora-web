import { describe, expect, it } from "vitest";
import {
  MAX_CREATURE_FIRST_NAME_ASCII_BYTES,
  MAX_CREATURE_LAST_NAME_ASCII_BYTES,
  MAX_CREATURE_DESCRIPTION_ASCII_BYTES,
  cloneEditableCreatureLocalizedStringEntries,
  cloneCreatureNameLocalizedStrings,
  isCreatureNameInlineAsciiText,
  readEditableCreatureLocalizedStringStorage,
  readCreatureNameInlineAsciiStorage,
  readCreatureNameLocalizedStrings,
} from "../../../../../src/modules/scene/domain/creatureNameLocalizedStrings";

describe("Creature FirstName/LastName/Description exact storage provenance", () => {
  it("validates and detaches complete presence-sensitive storage", () => {
    const source = {
      firstName: {
        present: true as const,
        strRef: 0xffff_ffff,
        entries: [
          { languageId: 0, textBytesBase64: "R3VhcmQ=" },
          { languageId: 0, textBytesBase64: "" },
        ],
      },
      lastName: { present: false as const },
      description: {
        present: true as const,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "RGVzY3JpcHRpb24=" }],
      },
    };

    const parsed = readCreatureNameLocalizedStrings(source);
    expect(parsed).toEqual(source);
    expect(parsed).not.toBe(source);
    expect(parsed?.firstName).not.toBe(source.firstName);
    expect(parsed?.firstName.present && parsed.firstName.entries).not.toBe(source.firstName.entries);

    const clone = parsed && cloneCreatureNameLocalizedStrings(parsed);
    expect(clone).toEqual(source);
    expect(clone).not.toBe(parsed);
    expect(clone?.firstName).not.toBe(parsed?.firstName);
    expect(clone?.description).not.toBe(parsed?.description);
  });

  it("admits only the bounded empty-or-one-entry inline profile", () => {
    expect(MAX_CREATURE_FIRST_NAME_ASCII_BYTES).toBe(256);
    expect(MAX_CREATURE_LAST_NAME_ASCII_BYTES).toBe(256);
    expect(MAX_CREATURE_DESCRIPTION_ASCII_BYTES).toBe(4096);
    expect(readCreatureNameInlineAsciiStorage({
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "IEd1YXJkIA==" }],
    }, MAX_CREATURE_FIRST_NAME_ASCII_BYTES)).toBe(" Guard ");
    expect(readCreatureNameInlineAsciiStorage({
      present: true,
      strRef: 0xffff_ffff,
      entries: [],
    }, MAX_CREATURE_LAST_NAME_ASCII_BYTES)).toBe("");
    expect(readCreatureNameInlineAsciiStorage({
      present: true,
      strRef: 1,
      entries: [],
    }, 256)).toBeUndefined();
    expect(readCreatureNameInlineAsciiStorage({
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "" }],
    }, 256)).toBeUndefined();
    expect(isCreatureNameInlineAsciiText(" Captain ", 256)).toBe(true);
    expect(isCreatureNameInlineAsciiText("Żółć", 256)).toBe(false);
  });

  it("decodes a complete ordered inline-ASCII list without discarding source identifiers", () => {
    const storage = readEditableCreatureLocalizedStringStorage({
      present: true,
      strRef: 0xffff_ffff,
      entries: [
        { languageId: 42, textBytesBase64: "TGVnYWN5" },
        { languageId: 0, textBytesBase64: "R3VhcmQ=" },
        { languageId: 10, textBytesBase64: "U3RyYXpuaWs=" },
      ],
    }, MAX_CREATURE_FIRST_NAME_ASCII_BYTES);

    expect(storage).toEqual({
      value: "Guard",
      profile: "multi_entry_inline_ascii",
      entries: [
        { languageId: 42, text: "Legacy" },
        { languageId: 0, text: "Guard" },
        { languageId: 10, text: "Straznik" },
      ],
    });
    expect(cloneEditableCreatureLocalizedStringEntries(storage!.entries)).not.toBe(storage!.entries);
  });

  it("rejects malformed, unknown-keyed, and over-budget provenance as a complete pair", () => {
    const valid = {
      firstName: { present: true, strRef: 0xffff_ffff, entries: [] },
      lastName: { present: true, strRef: 0xffff_ffff, entries: [] },
    };
    expect(readCreatureNameLocalizedStrings({ ...valid, extra: true })).toBeUndefined();
    expect(readCreatureNameLocalizedStrings({ ...valid, lastName: null })).toBeUndefined();
    expect(readCreatureNameLocalizedStrings({
      ...valid,
      firstName: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [{
          languageId: 0,
          textBytesBase64: Buffer.alloc(16_385).toString("base64"),
        }],
      },
    })).toBeUndefined();
  });
});
