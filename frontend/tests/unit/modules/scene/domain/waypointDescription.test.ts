import { describe, expect, it } from "vitest";

import {
  MAX_WAYPOINT_DESCRIPTION_ASCII_BYTES,
  canEditExistingWaypointDescription,
  isWaypointDescriptionInlineAsciiText,
  readExistingWaypointDescriptionSourceValue,
  readWaypointDescriptionInlineAsciiStorage,
  readWaypointDescriptionStorage,
} from "../../../../../src/modules/scene/domain/waypointDescription";

const exactSource = {
  type: "aurora_git" as const,
  sourceKind: "waypoint" as const,
  sourceIndex: 0,
  waypointDescriptionStorage: {
    present: true as const,
    strRef: 0xffff_ffff,
    entries: [{ languageId: 0, textBytesBase64: "UGF0cm9sIHJvdXRl" }],
  },
};

describe("retained Waypoint Description domain", () => {
  it("freezes the 4096-byte exact printable-ASCII profile", () => {
    expect(MAX_WAYPOINT_DESCRIPTION_ASCII_BYTES).toBe(4096);
    expect(isWaypointDescriptionInlineAsciiText(" Northern patrol route ")).toBe(true);
    expect(isWaypointDescriptionInlineAsciiText("Północ")).toBe(false);
    expect(isWaypointDescriptionInlineAsciiText("A".repeat(4097))).toBe(false);
  });

  it("reads complete storage and admits only one inline language-0 value", () => {
    expect(readWaypointDescriptionStorage(
      exactSource.waypointDescriptionStorage,
    )).toEqual(exactSource.waypointDescriptionStorage);
    expect(readWaypointDescriptionInlineAsciiStorage(
      exactSource.waypointDescriptionStorage,
    )).toBe("Patrol route");
    expect(readWaypointDescriptionInlineAsciiStorage({
      present: true,
      strRef: 14817,
      entries: [],
    })).toBeUndefined();
  });

  it("requires exact Waypoint family, ordinal, and admitted provenance", () => {
    expect(canEditExistingWaypointDescription(exactSource)).toBe(true);
    expect(readExistingWaypointDescriptionSourceValue(exactSource)).toBe("Patrol route");
    expect(canEditExistingWaypointDescription({
      ...exactSource,
      sourceKind: "trigger",
    })).toBe(false);
    expect(canEditExistingWaypointDescription({
      ...exactSource,
      waypointDescriptionStorage: {
        present: true,
        strRef: 14817,
        entries: [],
      },
    })).toBe(false);
  });
});
