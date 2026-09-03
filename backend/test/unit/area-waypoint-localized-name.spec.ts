import {
  MAX_AREA_WAYPOINT_LOCALIZED_NAME_ASCII_BYTES,
  buildAreaWaypointLocalizedNameInlineAsciiStorage,
  readAreaWaypointLocalizedNameInlineAsciiStorage,
  readExistingAreaWaypointLocalizedNameMutation,
} from "../../src/modules/areas/domain/area-waypoint-localized-name";

describe("bounded existing Waypoint LocalizedName mutation", () => {
  it("freezes the 256-byte product budget", () => {
    expect(MAX_AREA_WAYPOINT_LOCALIZED_NAME_ASCII_BYTES).toBe(256);
  });

  it("admits only empty or one non-empty language-0 printable-ASCII inline entry", () => {
    expect(readAreaWaypointLocalizedNameInlineAsciiStorage({
      present: true,
      strRef: 0xffff_ffff,
      entries: [],
    })).toBe("");
    expect(readAreaWaypointLocalizedNameInlineAsciiStorage({
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "IFBhdHJvbCBQb2ludCA=" }],
    })).toBe(" Patrol Point ");

    for (const rejected of [
      { present: false },
      { present: true, strRef: 14817, entries: [] },
      { present: true, strRef: 0xffff_ffff, entries: [
        { languageId: 1, textBytesBase64: "QQ==" },
      ] },
      { present: true, strRef: 0xffff_ffff, entries: [
        { languageId: 0, textBytesBase64: "" },
      ] },
      { present: true, strRef: 0xffff_ffff, entries: [
        { languageId: 0, textBytesBase64: "Cg==" },
      ] },
      { present: true, strRef: 0xffff_ffff, entries: [
        { languageId: 0, textBytesBase64: "QQ==" },
        { languageId: 0, textBytesBase64: "Qg==" },
      ] },
    ]) {
      expect(readAreaWaypointLocalizedNameInlineAsciiStorage(rejected)).toBeUndefined();
    }
  });

  it("builds exact storage without trimming, normalization, or TLK synthesis", () => {
    expect(buildAreaWaypointLocalizedNameInlineAsciiStorage("")).toEqual({
      present: true,
      strRef: 0xffff_ffff,
      entries: [],
    });
    expect(buildAreaWaypointLocalizedNameInlineAsciiStorage(" Patrol Point ")).toEqual({
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "IFBhdHJvbCBQb2ludCA=" }],
    });
    expect(buildAreaWaypointLocalizedNameInlineAsciiStorage("Północ")).toBeUndefined();
    expect(buildAreaWaypointLocalizedNameInlineAsciiStorage("A".repeat(257))).toBeUndefined();
  });

  it("reads and freezes one exact changed pair", () => {
    const value = readExistingAreaWaypointLocalizedNameMutation({
      expectedValue: "Patrol Point",
      value: " North Patrol Point ",
    });
    expect(value).toEqual({
      expectedValue: "Patrol Point",
      value: " North Patrol Point ",
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
    expect(readExistingAreaWaypointLocalizedNameMutation(value)).toBeNull();
  });
});
