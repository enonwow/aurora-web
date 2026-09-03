import {
  cloneAreaCreatureNameLocalizedStrings,
  readAreaCreatureNameLocalizedStrings,
} from "../../src/modules/areas/domain/area-creature-localized-strings";

describe("area-creature-localized-strings", () => {
  it("deep-clones exact FirstName/LastName/Description storage without collapsing presence or entries", () => {
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

    const clone = cloneAreaCreatureNameLocalizedStrings(source);

    expect(clone).toEqual(source);
    expect(clone).not.toBe(source);
    expect(clone.firstName).not.toBe(source.firstName);
    expect(clone.firstName.present && clone.firstName.entries).not.toBe(source.firstName.entries);
    expect(clone.firstName.present && clone.firstName.entries[0]).not.toBe(source.firstName.entries[0]);
    expect(clone.lastName).not.toBe(source.lastName);
    expect(clone.description).not.toBe(source.description);
  });

  it("validates and detaches complete bounded provenance while retaining unsupported native shapes", () => {
    const source = {
      firstName: { present: true, strRef: 12_416, entries: [] },
      lastName: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [
          { languageId: 1, textBytesBase64: "gP8=" },
          { languageId: 1, textBytesBase64: "" },
        ],
      },
      description: { present: true, strRef: 9_999, entries: [] },
    };
    const parsed = readAreaCreatureNameLocalizedStrings(source);

    expect(parsed).toEqual(source);
    expect(parsed).not.toBe(source);
    expect(parsed?.lastName).not.toBe(source.lastName);
    expect(parsed?.lastName.present && parsed.lastName.entries).not.toBe(source.lastName.entries);
    expect(parsed?.description).not.toBe(source.description);
  });

  it.each([
    ["pair extra key", {
      firstName: { present: false },
      lastName: { present: false },
      extra: true,
    }],
    ["malformed absent storage", {
      firstName: { present: false, entries: [] },
      lastName: { present: false },
    }],
    ["noncanonical base64", {
      firstName: { present: true, strRef: 0xffff_ffff, entries: [
        { languageId: 0, textBytesBase64: "QR==" },
      ] },
      lastName: { present: false },
    }],
    ["over-count", {
      firstName: { present: true, strRef: 0xffff_ffff, entries: Array.from(
        { length: 65 },
        () => ({ languageId: 0, textBytesBase64: "" }),
      ) },
      lastName: { present: false },
    }],
    ["over-entry budget", {
      firstName: { present: true, strRef: 0xffff_ffff, entries: [{
        languageId: 0,
        textBytesBase64: Buffer.alloc(16_385).toString("base64"),
      }] },
      lastName: { present: false },
    }],
  ])("rejects %s", (_label, value) => {
    expect(readAreaCreatureNameLocalizedStrings(value)).toBeUndefined();
  });
});
