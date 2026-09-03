import {
  MAX_AREA_WAYPOINT_MAP_NOTE_ASCII_BYTES,
  buildAreaWaypointMapNoteInlineAsciiStorage,
  readAreaWaypointMapNoteInlineAsciiValue,
  readExistingAreaWaypointMapNoteMutation,
} from "../../src/modules/areas/domain/area-waypoint-map-note";

describe("bounded existing Waypoint map-note vector", () => {
  it("round-trips the exact binary flags and inline localized text", () => {
    expect(MAX_AREA_WAYPOINT_MAP_NOTE_ASCII_BYTES).toBe(4096);
    const storage = buildAreaWaypointMapNoteInlineAsciiStorage({
      hasMapNote: true,
      mapNoteText: " Old tower ",
      mapNoteEnabled: false,
    });
    expect(storage).toEqual({
      hasMapNoteByte: 1,
      mapNoteStorage: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "IE9sZCB0b3dlciA=" }],
      },
      mapNoteEnabledByte: 0,
    });
    expect(readAreaWaypointMapNoteInlineAsciiValue(storage)).toEqual({
      hasMapNote: true,
      mapNoteText: " Old tower ",
      mapNoteEnabled: false,
    });
  });

  it("admits one changed complete vector and freezes both values", () => {
    const mutation = readExistingAreaWaypointMapNoteMutation({
      expectedValue: {
        hasMapNote: false,
        mapNoteText: "",
        mapNoteEnabled: true,
      },
      value: {
        hasMapNote: true,
        mapNoteText: "Northern gate",
        mapNoteEnabled: true,
      },
    });
    expect(mutation).toEqual({
      expectedValue: { hasMapNote: false, mapNoteText: "", mapNoteEnabled: true },
      value: { hasMapNote: true, mapNoteText: "Northern gate", mapNoteEnabled: true },
    });
    expect(Object.isFrozen(mutation)).toBe(true);
    expect(Object.isFrozen(mutation?.expectedValue)).toBe(true);
    expect(Object.isFrozen(mutation?.value)).toBe(true);
  });

  it.each([
    ["partial", { expectedValue: { hasMapNote: false, mapNoteText: "" }, value: {} }],
    ["non-binary source", {
      expectedValue: { hasMapNote: 0, mapNoteText: "", mapNoteEnabled: true },
      value: { hasMapNote: true, mapNoteText: "A", mapNoteEnabled: true },
    }],
    ["unchanged", {
      expectedValue: { hasMapNote: false, mapNoteText: "", mapNoteEnabled: true },
      value: { hasMapNote: false, mapNoteText: "", mapNoteEnabled: true },
    }],
    ["non-ASCII", {
      expectedValue: { hasMapNote: false, mapNoteText: "", mapNoteEnabled: true },
      value: { hasMapNote: true, mapNoteText: "Północ", mapNoteEnabled: true },
    }],
    ["over budget", {
      expectedValue: { hasMapNote: false, mapNoteText: "", mapNoteEnabled: true },
      value: { hasMapNote: true, mapNoteText: "A".repeat(4097), mapNoteEnabled: true },
    }],
    ["unknown key", {
      expectedValue: { hasMapNote: false, mapNoteText: "", mapNoteEnabled: true },
      value: { hasMapNote: true, mapNoteText: "A", mapNoteEnabled: true },
      extra: true,
    }],
  ])("rejects a %s mutation", (_label, value) => {
    expect(readExistingAreaWaypointMapNoteMutation(value)).toBeNull();
  });
});
