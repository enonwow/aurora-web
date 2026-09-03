import { describe, expect, it } from "vitest";

import {
  canEditExistingWaypointMapNote,
  readWaypointMapNoteInlineAsciiValue,
  readWaypointMapNoteStorage,
  readWaypointMapNoteValue,
} from "../../../../../src/modules/scene/domain/waypointMapNote";

const storage = {
  hasMapNoteByte: 0,
  mapNoteStorage: {
    present: true,
    strRef: 0xffff_ffff,
    entries: [{ languageId: 0, textBytesBase64: "IE9sZCBtYXJrZXIg" }],
  },
  mapNoteEnabledByte: 1,
} as const;

describe("Waypoint MapNote domain", () => {
  it("reads one exact binary/localized/binary native vector", () => {
    expect(readWaypointMapNoteStorage(storage)).toEqual(storage);
    expect(readWaypointMapNoteInlineAsciiValue(storage)).toEqual({
      hasMapNote: false,
      mapNoteText: " Old marker ",
      mapNoteEnabled: true,
    });
  });

  it("accepts only complete logical vectors and exact retained provenance", () => {
    expect(readWaypointMapNoteValue({
      hasMapNote: true,
      mapNoteText: " Northern gate ",
      mapNoteEnabled: false,
    })).toEqual({
      hasMapNote: true,
      mapNoteText: " Northern gate ",
      mapNoteEnabled: false,
    });
    expect(readWaypointMapNoteValue({ hasMapNote: true, mapNoteText: "missing" }))
      .toBeUndefined();
    expect(canEditExistingWaypointMapNote({
      type: "aurora_git",
      sourceKind: "waypoint",
      sourceIndex: 0,
      sourceObjectId: "waypoint:0",
      waypointMapNoteStorage: storage,
    })).toBe(true);
  });

  it("fails closed for TLK-backed, malformed, or non-ASCII inputs", () => {
    expect(readWaypointMapNoteInlineAsciiValue({
      ...storage,
      mapNoteStorage: { present: true, strRef: 42, entries: [] },
    })).toBeUndefined();
    expect(readWaypointMapNoteStorage({ ...storage, mapNoteEnabledByte: 2 }))
      .toBeUndefined();
    expect(readWaypointMapNoteValue({
      hasMapNote: true,
      mapNoteText: "Północ",
      mapNoteEnabled: true,
    })).toBeUndefined();
  });
});
