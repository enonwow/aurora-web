import { cloneAreaPlaceableLocalizedStrings } from "../../src/modules/areas/domain/area-placeable-localized-strings";

describe("area-placeable-localized-strings", () => {
  it("deep-clones present entries and preserves absent storage", () => {
    const source = {
      locName: {
        present: true as const,
        strRef: 0xffff_ffff,
        entries: [
          { languageId: 0, textBytesBase64: "Q2hlc3Q=" },
          { languageId: 0, textBytesBase64: "" },
        ],
      },
      description: { present: false as const },
    };

    const clone = cloneAreaPlaceableLocalizedStrings(source);
    expect(clone).toEqual(source);
    expect(clone).not.toBe(source);
    expect(clone.locName).not.toBe(source.locName);
    expect(clone.locName.present && clone.locName.entries).not.toBe(source.locName.entries);
    expect(clone.locName.present && clone.locName.entries[0]).not.toBe(source.locName.entries[0]);
    expect(clone.description).not.toBe(source.description);
  });
});
