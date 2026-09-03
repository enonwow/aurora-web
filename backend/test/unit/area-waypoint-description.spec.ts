import {
  MAX_AREA_WAYPOINT_DESCRIPTION_ASCII_BYTES,
  buildAreaWaypointDescriptionInlineAsciiStorage,
  readAreaWaypointDescriptionInlineAsciiStorage,
  readExistingAreaWaypointDescriptionMutation,
} from "../../src/modules/areas/domain/area-waypoint-description";

describe("bounded existing Waypoint Description mutation", () => {
  it("freezes the 4096-byte product budget", () => {
    expect(MAX_AREA_WAYPOINT_DESCRIPTION_ASCII_BYTES).toBe(4096);
  });

  it("admits only empty or one non-empty language-0 printable-ASCII inline entry", () => {
    expect(readAreaWaypointDescriptionInlineAsciiStorage({
      present: true,
      strRef: 0xffff_ffff,
      entries: [],
    })).toBe("");
    expect(readAreaWaypointDescriptionInlineAsciiStorage({
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "IFBhdHJvbCByb3V0ZSA=" }],
    })).toBe(" Patrol route ");

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
    ]) {
      expect(readAreaWaypointDescriptionInlineAsciiStorage(rejected)).toBeUndefined();
    }
  });

  it("builds exact storage without trimming, normalization, or TLK synthesis", () => {
    expect(buildAreaWaypointDescriptionInlineAsciiStorage(" Patrol route ")).toEqual({
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "IFBhdHJvbCByb3V0ZSA=" }],
    });
    expect(buildAreaWaypointDescriptionInlineAsciiStorage("Północ")).toBeUndefined();
    expect(buildAreaWaypointDescriptionInlineAsciiStorage("A".repeat(4097)))
      .toBeUndefined();
  });

  it("reads and freezes one exact changed pair", () => {
    const value = readExistingAreaWaypointDescriptionMutation({
      expectedValue: "Patrol route",
      value: " Northern patrol route ",
    });
    expect(value).toEqual({
      expectedValue: "Patrol route",
      value: " Northern patrol route ",
    });
    expect(Object.isFrozen(value)).toBe(true);
  });

  it.each([
    ["missing", undefined],
    ["unknown key", { expectedValue: "A", value: "B", extra: true }],
    ["unchanged", { expectedValue: "A", value: "A" }],
    ["control byte", { expectedValue: "A", value: "A\nB" }],
    ["non-ASCII", { expectedValue: "A", value: "Ł" }],
    ["over budget", { expectedValue: "A", value: "B".repeat(4097) }],
  ])("rejects a %s mutation", (_label, value) => {
    expect(readExistingAreaWaypointDescriptionMutation(value)).toBeNull();
  });
});
