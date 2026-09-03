import {
  cloneAreaItemLocalizedStrings,
  readAreaItemLocalizedStrings,
} from "../../src/modules/areas/domain/area-item-localized-strings";

describe("area-item-localized-strings", () => {
  it("deep-clones the complete exact native triple", () => {
    const source = {
      localizedName: {
        present: true as const,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "U3dvcmQ=" }],
      },
      description: { present: false as const },
      identifiedDescription: {
        present: true as const,
        strRef: 7,
        entries: [{ languageId: 2, textBytesBase64: "" }],
      },
    };

    const clone = cloneAreaItemLocalizedStrings(source);
    expect(clone).toEqual(source);
    expect(clone).not.toBe(source);
    expect(clone.localizedName).not.toBe(source.localizedName);
    expect(clone.localizedName.present && clone.localizedName.entries)
      .not.toBe(source.localizedName.entries);
    expect(clone.description).not.toBe(source.description);
    expect(clone.identifiedDescription).not.toBe(source.identifiedDescription);
  });

  it("strictly validates and detaches the complete presence-sensitive triple", () => {
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

    const parsed = readAreaItemLocalizedStrings(source);
    expect(parsed).toEqual(source);
    expect(parsed).not.toBe(source);
    expect(parsed?.localizedName).not.toBe(source.localizedName);
    expect(parsed?.localizedName.present && parsed.localizedName.entries)
      .not.toBe(source.localizedName.entries);
  });

  it("rejects incomplete, unknown-keyed, and malformed triples", () => {
    const valid = {
      localizedName: { present: true, strRef: 0xffff_ffff, entries: [] },
      description: { present: true, strRef: 0xffff_ffff, entries: [] },
      identifiedDescription: { present: false },
    };

    expect(readAreaItemLocalizedStrings({ ...valid, extra: true })).toBeUndefined();
    expect(readAreaItemLocalizedStrings({
      localizedName: valid.localizedName,
      description: valid.description,
    })).toBeUndefined();
    expect(readAreaItemLocalizedStrings({ ...valid, description: null })).toBeUndefined();
    expect(readAreaItemLocalizedStrings({
      ...valid,
      localizedName: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "not canonical" }],
      },
    })).toBeUndefined();
  });
});
