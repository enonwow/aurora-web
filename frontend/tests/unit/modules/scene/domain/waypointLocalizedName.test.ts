import { describe, expect, it } from "vitest";

import {
  MAX_WAYPOINT_LOCALIZED_NAME_ASCII_BYTES,
  canEditExistingWaypointLocalizedName,
  isWaypointLocalizedNameInlineAsciiText,
  readExistingWaypointLocalizedNameSourceValue,
  readWaypointLocalizedNameInlineAsciiStorage,
  readWaypointLocalizedNameStorage,
} from "../../../../../src/modules/scene/domain/waypointLocalizedName";

const exactSource = {
  type: "aurora_git" as const,
  sourceKind: "waypoint" as const,
  sourceIndex: 0,
  waypointLocalizedNameStorage: {
    present: true as const,
    strRef: 0xffff_ffff,
    entries: [{ languageId: 0, textBytesBase64: "UGF0cm9sIFBvaW50" }],
  },
};

describe("retained Waypoint LocalizedName domain", () => {
  it("freezes the 256-byte exact printable-ASCII profile", () => {
    expect(MAX_WAYPOINT_LOCALIZED_NAME_ASCII_BYTES).toBe(256);
    expect(isWaypointLocalizedNameInlineAsciiText(" Patrol Point ")).toBe(true);
    expect(isWaypointLocalizedNameInlineAsciiText("Północ")).toBe(false);
    expect(isWaypointLocalizedNameInlineAsciiText("A".repeat(257))).toBe(false);
  });

  it("reads complete storage and admits only one inline language-0 value", () => {
    expect(readWaypointLocalizedNameStorage(
      exactSource.waypointLocalizedNameStorage,
    )).toEqual(exactSource.waypointLocalizedNameStorage);
    expect(readWaypointLocalizedNameInlineAsciiStorage(
      exactSource.waypointLocalizedNameStorage,
    )).toBe("Patrol Point");
    expect(readWaypointLocalizedNameInlineAsciiStorage({
      present: true,
      strRef: 14817,
      entries: [],
    })).toBeUndefined();
  });

  it("requires exact Waypoint family, ordinal, and admitted provenance", () => {
    expect(canEditExistingWaypointLocalizedName(exactSource)).toBe(true);
    expect(readExistingWaypointLocalizedNameSourceValue(exactSource)).toBe("Patrol Point");
    expect(canEditExistingWaypointLocalizedName({
      ...exactSource,
      sourceKind: "trigger",
    })).toBe(false);
    expect(canEditExistingWaypointLocalizedName({
      ...exactSource,
      waypointLocalizedNameStorage: {
        present: true,
        strRef: 14817,
        entries: [],
      },
    })).toBe(false);
  });
});
