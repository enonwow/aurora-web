import { describe, expect, it } from "vitest";

import {
  canEditExistingWaypointLocalizedName,
  materializeExistingWaypointLocalizedName,
  readExistingWaypointLocalizedName,
  reduceExistingWaypointLocalizedName,
} from "../../../../../src/modules/layout/application/waypointLocalizedNameProvenance";
import type { SceneObjectSourceMetadata } from
  "../../../../../src/modules/scene/contracts";

function exactSource(): SceneObjectSourceMetadata {
  return {
    type: "aurora_git",
    sourceKind: "waypoint",
    sourceIndex: 0,
    waypointLocalizedNameStorage: {
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "UGF0cm9sIFBvaW50" }],
    },
  };
}

describe("existing Waypoint LocalizedName provenance", () => {
  it("admits only exact retained inline ASCII storage", () => {
    expect(readExistingWaypointLocalizedName(exactSource())).toBe("Patrol Point");
    expect(canEditExistingWaypointLocalizedName(exactSource())).toBe(true);
    expect(canEditExistingWaypointLocalizedName({
      ...exactSource(),
      waypointLocalizedNameStorage: {
        present: true,
        strRef: 14817,
        entries: [],
      },
    })).toBe(false);
  });

  it("reduces and materializes verbatim ASCII without changing unsupported state", () => {
    expect(reduceExistingWaypointLocalizedName(
      exactSource(),
      "Patrol Point",
      " North Patrol Point ",
    )).toBe(" North Patrol Point ");
    expect(reduceExistingWaypointLocalizedName(
      exactSource(),
      "Patrol Point",
      "Północ",
    )).toBe("Patrol Point");
    expect(materializeExistingWaypointLocalizedName(
      exactSource(),
      "Patrol Point",
      "North Patrol Point",
    )).toBe("North Patrol Point");
    expect(materializeExistingWaypointLocalizedName(
      { ...exactSource(), sourceKind: "trigger" },
      "Patrol Point",
      "North Patrol Point",
    )).toBe("Patrol Point");
  });
});
